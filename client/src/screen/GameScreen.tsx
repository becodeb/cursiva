// Game shell (docs/08 §4 "Progresión de la sesión"): map → level → map. It owns
// the single LevelProgressStore, applies the adaptive-tolerance record update on
// every attempt, and routes to the next level on approval. All navigation goes
// through the pure `nextView` reducer so the flow is node-testable without a DOM
// (same pattern as MainScreen's `nextWord`/`flowWord`).
import { useState, type ReactNode } from 'react'
import LevelMap from './LevelMap'
import LevelPlay from './LevelPlay'
import Deduction from './Deduction'
import { LEVELS, getLevel, nextLevelId } from '../levels/catalog'
import { applyAttempt } from '../game/adaptiveTolerance'
import { EMPTY_RECORD } from '../game/types'
import type { LevelAttempt, LevelRecord } from '../game/types'
import { openProgressStore } from '../game/openProgressStore'
import { DETECTIVE_CASES, caseOf, caseSolvedId } from '../detective/cases'
import { isDevMode } from '../canvas/devMode'

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
  | { view: 'deduce'; caseId: string }

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
 * What a finished level's "next" control resolves to. `nextView` itself must
 * stay catalog-independent (its own comment above), so this is where the
 * catalog knowledge (`nextLevelId`) AND the clue-earned knowledge
 * (`allEarned`) actually meet — design.md's own words: "the *decision* lives
 * in `GameScreen.onNext`". Exported and pure for the same reason
 * `shouldFileClue` is exported from `LevelPlay.tsx`: the real `onNext`
 * closure runs inside a `useState` setter, and this repo's node harness
 * cannot observe a re-render after `renderToString`, so the decision itself
 * must be testable on its own (level-engine spec "Deduction View Reachable
 * from nextView").
 *
 * [case-registry-and-captions, Phase 6] Made PER-CASE: `finishedLevelId` no
 * longer has to be the hen's last trail — it resolves to `deduce` when it is
 * the LAST trail of WHICHEVER case owns it (`caseOf`), and that case's own
 * trails are all earned. A level `caseOf` cannot place (an ordinary,
 * non-detective level) always resolves to `next`.
 */
export function resolveNextAction(
  finishedLevelId: string,
  records: Readonly<Record<string, LevelRecord>>,
): GameAction {
  const kase = caseOf(finishedLevelId)
  const isLastTrailOfCase =
    !!kase && finishedLevelId === kase.trailIds[kase.trailIds.length - 1]
  return isLastTrailOfCase && allEarned(kase.trailIds, records)
    ? { type: 'deduce', caseId: kase.id }
    : { type: 'next', levelId: nextLevelId(finishedLevelId) }
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
    // The office is the default landing (design.md §8) — `{view:'map'}` here
    // is only GameScreen's OWN defensive fallback for a bare mount, never the
    // production route (App.tsx always resolves `initialView` itself first).
    return initialView(search, isDevMode()) ?? { view: 'map', finished: false }
  })
  // Records live in storage, not in React state: bumping the version is what
  // re-renders this shell so both children re-read them after a write.
  const [version, setVersion] = useState(0)

  const dispatch = (action: GameAction): void => setState((s) => nextView(s, action))

  if (state.view === 'play') {
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
        onNext={() => dispatch(resolveNextAction(state.levelId, store.all()))}
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
