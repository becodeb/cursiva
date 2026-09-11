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
import { LevelProgressStore } from '../game/LevelProgressStore'
import { applyAttempt } from '../game/adaptiveTolerance'
import { DETECTIVE_TRAIL_IDS } from '../game/types'
import type { LevelAttempt, LevelRecord } from '../game/types'
import { migratePhase1 } from '../game/migratePhase1'

/** Where the session currently is. `finished` marks the end of the catalog.
 * `deduce` is the detective mode's own view (design.md "Decision: deduction
 * is a third GameView branch") — it has no path, no ink and none of the
 * three pillars, so it is never represented as a catalog level (proposal
 * decision #3). */
export type GameView =
  | { view: 'map'; finished: boolean }
  | { view: 'play'; levelId: string }
  | { view: 'deduce' }

/**
 * Navigation intents. `next` carries the ALREADY-RESOLVED successor id (null =
 * the catalog is done), which keeps the reducer independent of the catalog and
 * therefore testable on its own. `deduce` carries nothing: the deduction view
 * is a single, catalog-independent destination — same reason `next`'s
 * successor is resolved by the caller instead of looked up in here.
 */
export type GameAction =
  | { type: 'play'; levelId: string }
  | { type: 'back' }
  | { type: 'next'; levelId: string | null }
  | { type: 'deduce' }
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
      return { view: 'deduce' }
    case 'back':
    case 'reset':
      return state.view === 'map' && !state.finished ? state : { view: 'map', finished: false }
  }
}

/**
 * Deep link (`?nivel=<id>`) so any level can be opened directly while the
 * mechanics are being evaluated — reaching phase 5 legitimately costs eight
 * approvals, which would make the late levels impossible to review.
 * An unknown id falls back to the map instead of crashing.
 *
 * `?nivel=deduccion` is the one reserved id that is NOT a catalog lookup — it
 * opens the deduction view directly, the same deep-link convenience every
 * other level already has, for the same reviewability reason.
 */
export function initialView(search: string): GameView {
  try {
    const id = new URLSearchParams(search).get('nivel')
    if (id === 'deduccion') return { view: 'deduce' }
    if (id && LEVELS.some((l) => l.id === id)) return { view: 'play', levelId: id }
  } catch {
    // malformed query string: fall through to the map
  }
  return { view: 'map', finished: false }
}

/**
 * The four detective trail ids, in play order. MOVED to `game/types.ts` in
 * S5 (still re-exported here so this file's own existing call sites below,
 * and every S4 test that imports it from this module, need no change):
 * `game/migratePhase1.ts` needs the exact same list and `game/` cannot
 * import from `screen/` without creating a cycle, since `GameScreen.tsx`
 * itself imports the migration. See `game/types.ts` for the full doc
 * comment (design.md "Migration / Rollout").
 */
export { DETECTIVE_TRAIL_IDS }

/** The last detective trail — completing it is the only event that can make
 * the deduction screen reachable (design.md "Decision: deduction is a third
 * GameView branch": "dispatch `deduce` when the finished level is the LAST
 * trail and all four clues are earned"). */
const LAST_DETECTIVE_TRAIL_ID = DETECTIVE_TRAIL_IDS[DETECTIVE_TRAIL_IDS.length - 1]

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
 */
export function resolveNextAction(
  finishedLevelId: string,
  records: Readonly<Record<string, LevelRecord>>,
): GameAction {
  return finishedLevelId === LAST_DETECTIVE_TRAIL_ID && allEarned(DETECTIVE_TRAIL_IDS, records)
    ? { type: 'deduce' }
    : { type: 'next', levelId: nextLevelId(finishedLevelId) }
}

export interface GameScreenProps {
  /** Extra chrome the app shell wants under the MAP only. A level fills the
   * whole viewport and must not grow a page scroller (docs/04 §3.3), so the
   * shell hands its footer down instead of rendering it around this screen. */
  footer?: ReactNode
}

export default function GameScreen({ footer }: GameScreenProps = {}) {
  // One store per app: reads localStorage once (App.tsx pattern). The
  // one-time copy-forward migration (game/migratePhase1.ts, design.md
  // "Migration / Rollout") runs right here, inside the lazy initialiser, so
  // it fires exactly once per store construction — including under
  // StrictMode's double-invoke, which is harmless because the migration is
  // idempotent by construction (a destination id already carrying a record,
  // migrated or genuinely played, is never touched again).
  const [store] = useState(() => {
    const progressStore = new LevelProgressStore()
    const migrated = migratePhase1(progressStore.all())
    for (const [levelId, record] of Object.entries(migrated)) {
      progressStore.save(levelId, record)
    }
    return progressStore
  })
  const [state, setState] = useState<GameView>(() =>
    initialView(typeof window === 'undefined' ? '' : window.location.search),
  )
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
        onBack={() => dispatch({ type: 'back' })}
      />
    )
  }

  if (state.view === 'deduce') {
    return <Deduction onBack={() => dispatch({ type: 'back' })} />
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
