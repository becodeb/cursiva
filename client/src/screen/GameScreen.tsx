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
import { closingLevel, introLevel } from '../zoo/adventures'

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
  | { view: 'close'; levelId: string }

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
export type CloseAction = { type: 'close'; levelId: string }
export type NextAction = GameAction | ExitAction | CloseAction

/**
 * Whether a finished level's adventure has a closing BEAT to show
 * (`zoo/adventures.ts`'s `closingLevel`) — pure, and the mirror of
 * `resolveEnterAction` for the exit side of a run. Tried FIRST by
 * `resolveNextAction`, below, so `sand4` resolves to the transformation
 * screen instead of the ordinary sector-exit-to-map outcome every other
 * finished adventure (including `glass`/`night`, this same change's other
 * two reveal-grid adventures) still gets.
 */
export function resolveCloseAction(
  finishedLevelId: string,
  _records: Readonly<Record<string, LevelRecord>>,
): CloseAction | null {
  return closingLevel(finishedLevelId) ? { type: 'close', levelId: finishedLevelId } : null
}

/**
 * What a finished level's "next" control resolves to. `nextView` itself must
 * stay catalog-independent (its own comment above), so this is where the
 * catalog knowledge (`nextLevelId`) AND the zoo's sector knowledge
 * (`sectorOf`) actually meet — design.md §6's own words: "the *decision*
 * lives in `GameScreen.onNext`". Exported and pure for the same reason
 * `shouldFileClue` is exported from `LevelPlay.tsx`: the real `onNext`
 * closure runs inside a `useState` setter, and this repo's node harness
 * cannot observe a re-render after `renderToString`, so the decision itself
 * must be testable on its own (level-engine spec "Deduction View Reachable
 * from nextView").
 *
 * [zoo-map-home] Finishing ANY adventure a zoo sector owns exits to the map
 * — not just the sector's last one, and never to the deduction screen (D2,
 * the auto-route is retired). `docs/12` §3: "Volver de un nivel cae en el
 * mapa." A level no sector has adopted yet (today the hen's `trail1..4` and
 * everything past the estanque's own ids) keeps today's `next` behaviour,
 * byte-for-byte.
 *
 * [reveal-grid-entrance-and-night] `resolveCloseAction` is tried FIRST
 * (design.md §6.3): a closing beat is a MORE SPECIFIC outcome than a plain
 * sector exit, and `sand4` is both — the closing screen must win.
 *
 * `records` is kept in the signature — unused today, hence the leading `_`
 * (`tsconfig`'s `noUnusedParameters` would otherwise fail the build) — for
 * two reasons: the sole call site already passes `store.all()` positionally
 * alongside `finishedLevelId`, and paso D's own unlock rules will need it
 * the moment a sector's `unlockedWhen` stops being a constant function.
 */
export function resolveNextAction(
  finishedLevelId: string,
  records: Readonly<Record<string, LevelRecord>>,
): NextAction {
  const close = resolveCloseAction(finishedLevelId, records)
  if (close) return close
  if (sectorOf(finishedLevelId)) return { type: 'exit' }
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
    // The transformation (`docs/13` §5 item 6, design.md §6.3): shown once
    // per adventure that carries a `closingBeat`, reached only through
    // `onNext` below calling `resolveCloseAction` — never through a
    // `GameAction`. `onContinue` is `onExit` — the child lands on the zoo
    // map, exactly where `resolveNextAction` was sending them anyway
    // (main-screen spec "AdventureClosing Screen Renders the
    // Transformation").
    const adventure = closingLevel(state.levelId)
    if (adventure) {
      return <AdventureClosing adventure={adventure} onContinue={onExit} />
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
        onAttempt={(attempt: LevelAttempt) => {
          store.save(state.levelId, applyAttempt(store.get(state.levelId), attempt))
          setVersion((n) => n + 1)
        }}
        onNext={() => {
          // `resolveNextAction` returns `NextAction` — `GameAction` widened
          // by the two outcomes `nextView` cannot express (design.md §6,
          // §6.3). This is the single point that has to discriminate before
          // dispatching, so `dispatch` never silently becomes the fallback
          // for "leave the shell" or "show the transformation".
          const action = resolveNextAction(state.levelId, store.all())
          if (action.type === 'exit') onExit()
          else if (action.type === 'close') setState({ view: 'close', levelId: action.levelId })
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
