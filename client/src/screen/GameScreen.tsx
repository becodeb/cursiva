// Game shell (docs/08 §4 "Progresión de la sesión"): map → level → map. It owns
// the single LevelProgressStore, applies the adaptive-tolerance record update on
// every attempt, and routes to the next level on approval. All navigation goes
// through the pure `nextView` reducer so the flow is node-testable without a DOM
// (same pattern as MainScreen's `nextWord`/`flowWord`).
import { useState, type ReactNode } from 'react'
import LevelMap from './LevelMap'
import LevelPlay from './LevelPlay'
import Deduction from './Deduction'
import AdventureIntro from './AdventureIntro'
import { LEVELS, getLevel, nextLevelId } from '../levels/catalog'
import { applyAttempt } from '../game/adaptiveTolerance'
import { EMPTY_RECORD } from '../game/types'
import type { LevelAttempt, LevelRecord } from '../game/types'
import { openProgressStore } from '../game/openProgressStore'
import { DETECTIVE_CASES, caseSolvedId } from '../detective/cases'
import AdventureClosing from './AdventureClosing'
import { isDevMode } from '../canvas/devMode'
import { sectorOf } from '../zoo/sectors'
import { adventureFor, closingLevel, introLevel } from '../zoo/adventures'
import { adventureProgress } from '../zoo/progress'

/** Where the session currently is. `finished` marks the end of the catalog.
 * `deduce` is the detective mode's own view (design.md "Decision: deduction
 * is a third GameView branch") — it has no path, no ink and none of the
 * three pillars, so it is never represented as a catalog level (proposal
 * decision #3). [case-registry-and-captions, Phase 6] `deduce` now carries
 * WHICH case (design.md §1, spec: detective-mode "Case Routing Across
 * Multiple Cases") — there is more than one in the registry. */
export type GameView =
  | { view: 'map'; finished: boolean }
  | { view: 'play'; levelId: string }
  | { view: 'intro'; levelId: string }
  | { view: 'deduce'; caseId: string }
  | { view: 'close'; levelId: string; beat?: number }

/**
 * Navigation intents. `next` carries the ALREADY-RESOLVED successor id (null =
 * the catalog is done), which keeps the reducer independent of the catalog and
 * therefore testable on its own. `deduce` carries the case id it targets —
 * same reason `next`'s successor is resolved by the caller instead of looked
 * up in here.
 */
export type GameAction =
  | { type: 'play'; levelId: string }
  | { type: 'back' }
  | { type: 'next'; levelId: string | null }
  | { type: 'deduce'; caseId: string }
  | { type: 'reset' }

/**
 * Pure navigation reducer. Finishing the last level returns to the map with
 * `finished` set; every other route to the map clears it, so the closing line
 * shows exactly once and never lingers over a later visit. `deduce` stays
 * catalog-independent on purpose (level-engine spec "Deduction View Reachable
 * from nextView"): the reducer never learns which levels exist, so the WHEN
 * decision lives in `GameScreen.onNext`'s `resolveNextAction` instead
 * (design.md "Decision: deduction is a third GameView branch").
 */
export function nextView(state: GameView, action: GameAction): GameView {
  switch (action.type) {
    case 'play':
      return { view: 'play', levelId: action.levelId }
    case 'next':
      return action.levelId === null
        ? { view: 'map', finished: true }
        : { view: 'play', levelId: action.levelId }
    case 'deduce':
      return { view: 'deduce', caseId: action.caseId }
    case 'back':
    case 'reset':
      return state.view === 'map' && !state.finished ? state : { view: 'map', finished: false }
  }
}

/**
 * Deep link (`?nivel=<id>`) so any level can be opened directly while the
 * mechanics are being evaluated — reaching phase 5 legitimately costs eight
 * approvals, which would make the late levels impossible to review.
 * An unknown id, and no id at all, resolves to `null` — the office
 * (`{ at: 'home' }`) is the default landing, never the map (design.md §8,
 * "Dev gate on the map route").
 *
 * `?nivel=deduccion` opens the FIRST case's deduction view directly, the
 * same deep-link convenience every other level already has.
 * `?nivel=deduccion-<caseId>` opens THAT case's deduction view, if the id is
 * one `DETECTIVE_CASES` actually carries — an unknown case id falls through
 * rather than crashing.
 *
 * [case-registry-and-captions, Phase 7] `?nivel=mapa` is a DEV SURFACE
 * (proposal D3): it is the only way left to reach the level map's own tools
 * (progress reset, test mode), and it only resolves when `dev` is true — so
 * a plain production/preview visit to `?nivel=mapa` still falls through to
 * the office. `dev` is `isDevMode()` at the call sites (`App.initialShell`,
 * `GameScreen`'s own bare-mount fallback below), never hardcoded here, so
 * this function stays a pure decision over its two explicit parameters.
 *
 * [duck-undulations-and-sector-backdrop] `?nivel=intro-<levelId>` is the
 * same kind of DEV SURFACE as `?nivel=mapa`: `?nivel=<levelId>` deliberately
 * bypasses the narrative entry BY DESIGN (the deep link exists to review
 * mechanics), so a screenshot of the entry screen itself needs its own
 * gated route rather than reusing the ordinary one. Dev-gated because it is
 * a navigable surface, the same reasoning `?nivel=mapa` already carries.
 */
export function initialView(search: string, dev = false): GameView | null {
  try {
    const id = new URLSearchParams(search).get('nivel')
    if (id === 'deduccion') return { view: 'deduce', caseId: DETECTIVE_CASES[0].id }
    if (id?.startsWith('deduccion-')) {
      const caseId = id.slice('deduccion-'.length)
      if (DETECTIVE_CASES.some((k) => k.id === caseId)) return { view: 'deduce', caseId }
    }
    if (id === 'mapa' && dev) return { view: 'map', finished: false }
    if (id?.startsWith('intro-') && dev) {
      const levelId = id.slice('intro-'.length)
      if (introLevel(levelId)) return { view: 'intro', levelId }
    }
    // `cierre-<levelId>`, the mirror of `intro-<levelId>` above. The `'close'`
    // view is otherwise reachable only by finishing an adventure's last level,
    // and `scripts/shot.sh`'s single-URL model cannot play through four levels
    // to get there — the same reason `?debug=pato-recuperado` exists. Without
    // this route the closing screen is the one screen in the change no capture
    // can show, and paso C's unticked capture tasks are what blocked its gate.
    //
    // [add-caretaker-prologue] An optional `:<n>` suffix reaches a beat past
    // the first — `sendero`'s two-beat closing is otherwise unreachable by a
    // single-URL capture. The separator is `:`, never `-`: several level ids
    // (`sand4`) already end in a digit, which would make `cierre-sand4-1`
    // ambiguous between "level sand4-1" and "level sand4, beat 1".
    if (id?.startsWith('cierre-') && dev) {
      const rest = id.slice('cierre-'.length)
      const at = rest.indexOf(':')
      const levelId = at < 0 ? rest : rest.slice(0, at)
      if (closingLevel(levelId)) {
        if (at < 0) return { view: 'close', levelId }
        const beat = Number(rest.slice(at + 1))
        if (Number.isInteger(beat) && beat >= 0) return { view: 'close', levelId, beat }
      }
    }
    if (id && LEVELS.some((l) => l.id === id)) return { view: 'play', levelId: id }
  } catch {
    // malformed query string: fall through to the office
  }
  return null
}

/**
 * All of `trailIds`' records carry at least one approval (design.md
 * "Decision: earned clues are derived from progress, not stored" — clue *N*
 * is earned iff `approvals >= 1`). Pure over plain progress values, no store,
 * no catalog — the same node-testable shape `guideLevelFor`/`standingHintFor`
 * (`LevelPlay.tsx`) already use (spec: detective-mode "Deduction Screen",
 * scenario "All four clues collected reaches the deduction screen").
 */
export function allEarned(
  trailIds: readonly string[],
  records: Readonly<Record<string, LevelRecord>>,
): boolean {
  return trailIds.length > 0 && trailIds.every((id) => (records[id]?.approvals ?? 0) >= 1)
}

/**
 * Leaving the game shell entirely (zoo-map design.md §6). Deliberately NOT a
 * `GameAction` member: `nextView` is shell-independent (its own comment
 * above) and `App`'s `Shell` lives one level up (`App.tsx`'s `{ at: 'map' }`)
 * — adding `exit` to `GameAction` would force `nextView`'s switch to grow a
 * case for a state `GameView` cannot represent. Keeping it in a sibling type
 * means `nextView` stays unchanged and the one call site below MUST
 * discriminate before dispatching, which is the whole point: `dispatch` can
 * never be the silent fallback because there is no branch that reaches it
 * without deciding first.
 */
export type ExitAction = { type: 'exit' }
/**
 * Finishing the last level of an adventure that carries a closing BEAT
 * (`docs/13` §5 item 6; design.md §6.3) — the entrance's `sand` adventure,
 * ending on `sand4`, today. Kept OUT of `GameAction` for the same reason
 * `ExitAction` is: `nextView`'s reducer switch must stay ignorant of a
 * state it never needs to represent (main-screen spec "close GameView
 * Variant and resolveCloseAction").
 */
export type CloseAction = { type: 'close'; levelId: string; beat?: number }
/**
 * Continuing straight into another adventure's narrative entry instead of
 * exiting to the map (adventure-flow-and-map-guidance T2 amendment) — what
 * `resolveAfterAdventure`, below, produces once an animal-less adventure's
 * own end meets another adventure's own start (today: peces → tortugas →
 * monos → sendero inside the entrance, night → hedgehog inside the night
 * sector). Kept OUT of `GameAction`, the same reason `ExitAction` and
 * `CloseAction` are: `nextView` must stay ignorant of the adventure/sector
 * knowledge this decision needs, so both call sites below (`AdventureClosing`'s
 * `onContinue`, `LevelPlay`'s `onNext`) discriminate it and call `setState`
 * directly rather than ever reaching `dispatch`. Carries a whole `GameView`,
 * not a bare level id, because the target may be an `intro` or a `play`
 * view — exactly `resolveEnterAction`'s own return shape, since that is
 * what produces it.
 */
export type EnterAction = { type: 'enter'; view: GameView }
export type NextAction = GameAction | ExitAction | CloseAction | EnterAction

/**
 * Whether a finished level's adventure has a closing BEAT to show
 * (`zoo/adventures.ts`'s `closingLevel`) — pure, and the mirror of
 * `resolveEnterAction` for the exit side of a run. Tried FIRST by
 * `resolveNextAction`, below, so a finished adventure's own last level
 * resolves to the transformation screen instead of whatever OTHER outcome
 * (continuing the adventure, chaining to the next one, or a plain map exit)
 * it would otherwise get. As of adventure-flow-and-map-guidance T8 (docs/18
 * §4.7 item 1) that is EVERY `ADVENTURES` row — `glass1`/`sand1`/`glass3`/
 * `sand3` (each its own enclosure's only, and therefore last, level after
 * T1 narrowed every enclosure from two levels to one), `night4`, and every
 * animal-recovering adventure's own last level (`duck-trail4`,
 * `sheep-hill4`, `llama-peak4`, `snake4`, `bee4`, `dolphin4`, `hedgehog4`) —
 * so this now resolves non-null for all of them. `null` only for a level
 * belonging to no adventure at all — today the hen's `trail1..4` and the
 * four entrance ids T1 dropped from every sector (`glass2`/`sand2`/
 * `glass4`/`sand4`).
 */
export function resolveCloseAction(
  finishedLevelId: string,
  _records: Readonly<Record<string, LevelRecord>>,
): CloseAction | null {
  return closingLevel(finishedLevelId) ? { type: 'close', levelId: finishedLevelId } : null
}

/**
 * Advances the closing screen from BEAT `beat` (add-caretaker-prologue
 * design.md D3) — the mirror of `resolveCloseAction` for the "already
 * showing the closing" side. Pure: it re-derives the adventure from
 * `levelId` rather than trusting a caller-held reference, the same
 * never-stale convention `resolveNextAction` uses. `beat + 1` still inside
 * the beat list advances to it. `levelId` carrying no `closingBeat` at all
 * (`closingLevel` itself `undefined`) exits immediately, unconditionally —
 * every SHIPPED `ADVENTURES` row carries one as of T8 (`closingLevel`'s own
 * header), so this degenerate input is reached only by a level belonging to
 * no adventure at all, never by the real UI (the `'close'` view never
 * mounts `AdventureClosing` without a `closingBeat` to show it in the first
 * place).
 *
 * Falling off the end of a REAL, non-empty beat list used to always exit to
 * the map; [T2 amendment] it now defers to `resolveAfterAdventure`, below,
 * so an animal-less closing (peces, tortugas, monos, and — since T8 gave it
 * one — night; sendero's own closing is entrada's last, so it still exits)
 * chains straight into the next adventure's narrative entry instead of
 * dropping the child on the map between rooms. An animal-recovering
 * adventure's own closing (T8) never chains — `resolveAfterAdventure`'s own
 * `animal !== undefined` guard is unconditional — so it falls straight
 * through to `{ type: 'exit' }` here, landing the child on the map where
 * their rescued animal now stands, exactly once its one rescue beat is
 * shown. `records` is on this signature for `resolveAfterAdventure`'s own
 * need: resolving the NEXT adventure's own entry the same way a tap on the
 * map would (`resolveEnterAction`).
 */
export function advanceClosing(
  levelId: string,
  beat: number,
  records: Readonly<Record<string, LevelRecord>>,
): CloseAction | ExitAction | EnterAction {
  const adventure = closingLevel(levelId)
  if (!adventure) return { type: 'exit' }
  if (beat + 1 < adventure.closingBeat!.length) {
    return { type: 'close', levelId, beat: beat + 1 }
  }
  const after = resolveAfterAdventure(levelId, records)
  return after ? { type: 'enter', view: after } : { type: 'exit' }
}

/**
 * The level right after `levelId` in ITS OWN adventure's `levelIds`, or
 * `undefined` when `levelId` belongs to no `ADVENTURES` row at all, or is
 * already that row's own last level (adventure-flow-and-map-guidance T2).
 * Exported and pure, the same reason every other routing decision in this
 * file is: `resolveNextAction` needs it, and it is independently testable
 * in node without a DOM. Strictly positional — `levelIds.indexOf` plus one
 * — so replaying an adventure from a level that is already filed still
 * walks forward in order rather than treating "already seen" as "done with
 * this adventure."
 */
export function nextInAdventure(levelId: string): string | undefined {
  const adventure = adventureFor(levelId)
  if (!adventure) return undefined
  const index = adventure.levelIds.indexOf(levelId)
  if (index < 0 || index >= adventure.levelIds.length - 1) return undefined
  return adventure.levelIds[index + 1]
}

/**
 * The level right after `levelId` in ITS OWN sector's `adventureIds`, but
 * ONLY while the FOLLOWING id belongs to no `ADVENTURES` row either — a
 * contiguous block of levels a sector owns directly, with no adventure row
 * of its own (today the medusa's `f2-guirnalda → f2-agua2 → f2-agua3 →
 * f2-agua4`, inside `estanque`). `undefined` once the block ends: there is
 * no next id at all, or the next id IS another adventure's own first
 * level, which must resolve to THAT adventure (through `resolveEnterAction`,
 * from the map) rather than being walked into silently. Callers are
 * expected to have already confirmed `levelId` itself carries no adventure
 * (`resolveNextAction`, below, only calls this once `adventureFor` already
 * failed) — this only decides where the BLOCK goes next, the mirror half of
 * `nextInAdventure` above.
 */
export function nextInSectorBlock(levelId: string): string | undefined {
  const sector = sectorOf(levelId)
  if (!sector) return undefined
  const index = sector.adventureIds.indexOf(levelId)
  if (index < 0 || index >= sector.adventureIds.length - 1) return undefined
  const next = sector.adventureIds[index + 1]
  return adventureFor(next) ? undefined : next
}

/**
 * What happens once an adventure truly ENDS, beyond the ordinary "exit to
 * the map" outcome every adventure got before this amendment
 * (adventure-flow-and-map-guidance T2: "an adventure that recovers no
 * animal chains into the next adventure of its sector"). Both callers reach
 * this only once they already know `lastLevelId` is its OWN adventure's own
 * last level — `advanceClosing` via `closingLevel` falling off the beat
 * list, `resolveNextAction` via `nextInAdventure` returning `undefined` —
 * the same trust `nextInSectorBlock` places in `resolveNextAction` for its
 * own precondition, so this only re-derives the SECTOR position, never the
 * adventure one. `null` means the ordinary outcome (exit to the map) still
 * applies; a non-null result is a `GameView` to enter, exactly as if the
 * child had tapped the next enclosure on the map themselves.
 *
 * Chaining requires ALL THREE: `lastLevelId`'s own adventure carries no
 * `animal` (`AdventureSubject`'s union, `zoo/adventures.ts`) — an adventure
 * that recovers one always ends on the map, where the animal now stands, so
 * `duck-trail4`/`sheep-hill4`/`llama-peak4`/`snake4`/`bee4`/`dolphin4`/
 * `hedgehog4` never chain; its SECTOR's `adventureIds` (`zoo/sectors.ts`)
 * lists another id right after `lastLevelId` — the last adventure of a
 * sector (`sand3`, entrada's own last entry) has none; and that following
 * id is the FIRST level of ANOTHER `ADVENTURES` row (`introLevel`) — a
 * no-row block's own end (the medusa's `f2-agua4`) never even reaches this
 * function, since `adventureFor` already excludes it above. Today this is
 * the entrance's `peces → tortugas → monos → sendero` chain and the night
 * sector's `night → hedgehog`.
 */
export function resolveAfterAdventure(
  lastLevelId: string,
  records: Readonly<Record<string, LevelRecord>>,
): GameView | null {
  const adventure = adventureFor(lastLevelId)
  if (!adventure || adventure.animal !== undefined) return null
  const sector = sectorOf(lastLevelId)
  if (!sector) return null
  const index = sector.adventureIds.indexOf(lastLevelId)
  if (index < 0 || index >= sector.adventureIds.length - 1) return null
  const next = sector.adventureIds[index + 1]
  return introLevel(next) ? resolveEnterAction(next, records) : null
}

/**
 * What a finished level's "next" control resolves to. `nextView` itself must
 * stay catalog-independent (its own comment above), so this is where the
 * catalog knowledge (`nextLevelId`), the adventure registry (`adventureFor`)
 * and the zoo's sector knowledge (`sectorOf`) actually meet — design.md §6's
 * own words: "the *decision* lives in `GameScreen.onNext`". Exported and
 * pure for the same reason `shouldFileClue` is exported from
 * `LevelPlay.tsx`: the real `onNext` closure runs inside a `useState`
 * setter, and this repo's node harness cannot observe a re-render after
 * `renderToString`, so the decision itself must be testable on its own
 * (level-engine spec "Deduction View Reachable from nextView").
 *
 * [adventure-flow-and-map-guidance T2] Finishing a level that belongs to an
 * `ADVENTURES` row and is NOT that row's own last level continues STRAIGHT
 * to the next id in `levelIds`, in order (`nextInAdventure`, above) — even
 * if the successor is already filed, so replaying an adventure replays it
 * start to finish rather than bouncing back to the map after every level.
 * That `{ type: 'next' }` action reaches `nextView` unchanged, which sends
 * it straight to the `play` view (never through `resolveEnterAction`), so
 * the narrative entry never re-shows mid-adventure — it is reached only
 * from the map (`App.tsx`'s `onEnter`). A level a sector owns directly, with
 * no `ADVENTURES` row of its own (today the medusa's `f2-guirnalda`..
 * `f2-agua4` inside `estanque`), chains the same way through its sector's
 * own `adventureIds`, but only while the next id ALSO belongs to no row —
 * `nextInSectorBlock`, above. The last id of a no-row block always exits to
 * the map, never to the deduction screen (D2, the auto-route retired long
 * before this change). `docs/12` §3: "Volver de un nivel cae en el mapa."
 *
 * The `resolveAfterAdventure` call inside the `adventureFor` branch below is
 * UNREACHABLE for every id `ADVENTURES` ships today (T8, docs/18 §4.7 item
 * 1): `resolveCloseAction` is tried FIRST (below) and now resolves non-null
 * for every row's own last level, so this function returns before ever
 * reaching that call for one. It stays — rather than being deleted — as the
 * one remaining path that still matters for a HAND-BUILT fixture with no
 * `closingBeat` (`GameScreen.test.tsx`'s own fixtures) and for a
 * hypothetical future adventure that ships without one; the actual chaining
 * a real, closing-bearing animal-less adventure needs (peces → tortugas →
 * monos → sendero; night → hedgehog) now happens through `advanceClosing`'s
 * OWN fall-off instead, once its beat list runs out — see that function's
 * header. A level no sector has adopted at all (today the hen's
 * `trail1..4`, and — after T1 — the entrance's four dropped ids
 * `glass2`/`sand2`/`glass4`/`sand4`, dev-reachable only) keeps today's
 * `next` behaviour, byte-for-byte.
 *
 * [reveal-grid-entrance-and-night] `resolveCloseAction` is tried FIRST
 * (design.md §6.3): a closing beat is a MORE SPECIFIC outcome than either
 * continuing within an adventure or a plain sector exit, and every
 * `ADVENTURES` row's own last level is now both (T1, T8) — the closing
 * screen must win.
 *
 * `records` is kept in the signature to hand to `resolveCloseAction` above,
 * and — since the T2 amendment — to `resolveAfterAdventure` too, for the
 * same reason `resolveEnterAction` keeps it: a sector's `unlockedWhen`
 * plays no part in routing a FINISHED level onward, only in which sectors
 * the MAP itself shows as open, and in resolving the CHAINED adventure's
 * own entry the same way a tap on the map would.
 */
export function resolveNextAction(
  finishedLevelId: string,
  records: Readonly<Record<string, LevelRecord>>,
): NextAction {
  const close = resolveCloseAction(finishedLevelId, records)
  if (close) return close
  if (adventureFor(finishedLevelId)) {
    const next = nextInAdventure(finishedLevelId)
    if (next) return { type: 'next', levelId: next }
    const after = resolveAfterAdventure(finishedLevelId, records)
    return after ? { type: 'enter', view: after } : { type: 'exit' }
  }
  if (sectorOf(finishedLevelId)) {
    const next = nextInSectorBlock(finishedLevelId)
    return next ? { type: 'next', levelId: next } : { type: 'exit' }
  }
  return { type: 'next', levelId: nextLevelId(finishedLevelId) }
}

/**
 * Where a tap on the map LANDS (duck-undulations-and-sector-backdrop
 * design.md §4). The mirror of `resolveNextAction`: `nextView` must stay
 * catalog- and sector-independent (its own header, above), so this is where
 * the adventure registry and routing meet. `records` is unused today —
 * hence the leading `_`, `noUnusedParameters` — and is kept for the same
 * two reasons `resolveNextAction` keeps it: the call site already has it,
 * and a later change's unlock rules will need it.
 */
export function resolveEnterAction(
  levelId: string,
  _records: Readonly<Record<string, LevelRecord>>,
): GameView {
  return introLevel(levelId) ? { view: 'intro', levelId } : { view: 'play', levelId }
}

export interface GameScreenProps {
  /** Extra chrome the app shell wants under the MAP only. A level fills the
   * whole viewport and must not grow a page scroller (docs/04 §3.3), so the
   * shell hands its footer down instead of rendering it around this screen. */
  footer?: ReactNode
  /** Where to open. The home (docs/10) resolves "por donde lo dejé" itself and
   * hands the answer down, so the child lands on the trail rather than on the
   * map. Omitted, this falls back to the `?nivel=` deep link and then the
   * office fallback below, which is exactly what every existing caller and
   * test gets. */
  initial?: GameView
  /** [case-registry-and-captions, Phase 7] Where "leaving this mode" goes.
   * Required, like `CaptionedArt`'s `label` (design.md §2) — no caller can
   * silently keep landing on the level map. `App.tsx` passes `goHome`, the
   * only function that can reach `{ at: 'home' }` (design.md §8, "onExit, a
   * prop, not a GameAction"). */
  onExit: () => void
}

export default function GameScreen({ footer, initial, onExit }: GameScreenProps) {
  // One store per game session, loaded and migrated by `openProgressStore`
  // (which is also what the app shell reads the home's records through — see
  // its header for why constructing this twice by hand is a trap). Inside a
  // lazy initialiser, so it runs exactly once per mount, including under
  // StrictMode's double-invoke.
  const [store] = useState(openProgressStore)
  const [state, setState] = useState<GameView>(() => {
    if (initial) return initial
    const search = typeof window === 'undefined' ? '' : window.location.search
    // The zoo map is the default landing (zoo-map design.md §6) —
    // `{view:'map'}` HERE is the internal, dev-gated `LevelMap` (a different
    // screen entirely), and is only ever GameScreen's OWN defensive fallback
    // for a bare mount — never the production route (App.tsx always resolves
    // `initialView` itself first, and its own fallback is the zoo map).
    return initialView(search, isDevMode()) ?? { view: 'map', finished: false }
  })
  // Records live in storage, not in React state: bumping the version is what
  // re-renders this shell so both children re-read them after a write.
  const [version, setVersion] = useState(0)

  const dispatch = (action: GameAction): void => setState((s) => nextView(s, action))

  if (state.view === 'intro') {
    // The narrative entry (docs/13 §5 item 1, design.md §4): shown once per
    // adventure, before its first level, reached only through `App.tsx`'s
    // `onEnter` calling `resolveEnterAction` — never through a `GameAction`.
    // Its exit is an ordinary `play` dispatch, so `nextView` keeps doing the
    // routing and stays byte-unchanged.
    const adventure = introLevel(state.levelId)
    if (adventure) {
      return (
        <AdventureIntro
          adventure={adventure}
          onStart={() => dispatch({ type: 'play', levelId: state.levelId })}
        />
      )
    }
    // Unknown/stale id: fall through to the ordinary play render below,
    // the same never-crash convention `getLevel` already uses elsewhere in
    // this file.
  }

  if (state.view === 'close') {
    // The transformation (`docs/13` §5 item 6, design.md §6.3, D3): shown
    // once per adventure that carries a `closingBeat`, reached only through
    // `onNext` below calling `resolveCloseAction` — never through a
    // `GameAction`. `index` picks ONE beat out of the adventure's ordered
    // list (falling back to the first for an out-of-range/stale index, the
    // same never-crash convention this file uses elsewhere); `onContinue`
    // discriminates `advanceClosing`'s result instead of calling `onExit`
    // directly: a beat past the current one re-renders this same screen
    // with the NEXT beat; falling off the LAST beat either leaves for the
    // map or — for an animal-less adventure whose sector opens straight
    // into another one (adventure-flow-and-map-guidance T2 amendment) —
    // enters that adventure's own narrative entry instead
    // (`resolveAfterAdventure`).
    const adventure = closingLevel(state.levelId)
    if (adventure) {
      const index = state.beat ?? 0
      const beat = adventure.closingBeat![index] ?? adventure.closingBeat![0]
      return (
        <AdventureClosing
          adventure={adventure}
          beat={beat}
          onContinue={() => {
            const action = advanceClosing(state.levelId, index, store.all())
            if (action.type === 'exit') onExit()
            else if (action.type === 'enter') setState(action.view)
            else setState({ view: 'close', levelId: state.levelId, beat: action.beat })
          }}
        />
      )
    }
    // Unknown/stale id: fall through to the ordinary play render below, the
    // same never-crash convention `intro`'s own branch just used above.
  }

  if (state.view === 'play' || state.view === 'intro' || state.view === 'close') {
    const level = getLevel(state.levelId)
    return (
      <LevelPlay
        key={state.levelId}
        level={level}
        record={store.get(state.levelId)}
        // T6 (adventure-flow-and-map-guidance): recomputed from `store.all()`
        // on every render of THIS shell, which is what makes it advance the
        // instant an attempt is saved — `onAttempt` below both persists the
        // attempt and bumps `version`, and `version` is this component's own
        // state, so the bump re-renders this whole function body (a fresh
        // `store.all()` read, a fresh `adventureProgress` call) and hands
        // `LevelPlay` a new prop value through the ordinary render cycle —
        // no separate subscription or local mirror of store state needed.
        progress={adventureProgress(state.levelId, store.all())}
        onAttempt={(attempt: LevelAttempt) => {
          store.save(state.levelId, applyAttempt(store.get(state.levelId), attempt))
          setVersion((n) => n + 1)
        }}
        onNext={() => {
          // `resolveNextAction` returns `NextAction` — `GameAction` widened
          // by the THREE outcomes `nextView` cannot express (design.md §6,
          // §6.3; adventure-flow-and-map-guidance T2 amendment). This is the
          // single point that has to discriminate before dispatching, so
          // `dispatch` never silently becomes the fallback for "leave the
          // shell", "show the transformation" or "enter the next adventure".
          const action = resolveNextAction(state.levelId, store.all())
          if (action.type === 'exit') onExit()
          else if (action.type === 'close') setState({ view: 'close', levelId: action.levelId })
          else if (action.type === 'enter') setState(action.view)
          else dispatch(action)
        }}
        onBack={onExit}
      />
    )
  }

  if (state.view === 'deduce') {
    // [case-registry-and-captions, Phase 6] Full per-case routing (design.md
    // §5): the case is resolved from `state.caseId`, not hardcoded. Falls
    // back to the first case for a malformed/unknown id, the same
    // never-crash convention `getLevel`/`isUnlocked` already use for an
    // unknown level id.
    const kase = DETECTIVE_CASES.find((k) => k.id === state.caseId) ?? DETECTIVE_CASES[0]
    const solvedId = caseSolvedId(kase.id)
    return (
      <Deduction
        kase={kase}
        solved={store.get(solvedId).approvals >= 1}
        onSolved={() => {
          store.save(solvedId, { ...EMPTY_RECORD, approvals: 1 })
          setVersion((n) => n + 1)
        }}
        onExit={onExit}
      />
    )
  }

  return (
    <>
    <LevelMap
      key={version}
      store={store}
      finished={state.finished}
      onPlay={(levelId) => dispatch({ type: 'play', levelId })}
      onReset={() => {
        store.reset()
        setVersion((n) => n + 1)
        dispatch({ type: 'reset' })
      }}
      onToggleTestMode={() => setVersion((n) => n + 1)}
    />
    {footer}
    </>
  )
}
