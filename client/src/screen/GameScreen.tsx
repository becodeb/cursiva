// Game shell (docs/08 §4 "Progresión de la sesión"): map → level → map. It owns
// the single LevelProgressStore, applies the adaptive-tolerance record update on
// every attempt, and routes to the next level on approval. All navigation goes
// through the pure `nextView` reducer so the flow is node-testable without a DOM
// (same pattern as MainScreen's `nextWord`/`flowWord`).
import { useState, type ReactNode } from 'react'
import LevelMap from './LevelMap'
import LevelPlay from './LevelPlay'
import { LEVELS, getLevel, nextLevelId } from '../levels/catalog'
import { LevelProgressStore } from '../game/LevelProgressStore'
import { applyAttempt } from '../game/adaptiveTolerance'
import type { LevelAttempt } from '../game/types'

/** Where the session currently is. `finished` marks the end of the catalog. */
export type GameView = { view: 'map'; finished: boolean } | { view: 'play'; levelId: string }

/**
 * Navigation intents. `next` carries the ALREADY-RESOLVED successor id (null =
 * the catalog is done), which keeps the reducer independent of the catalog and
 * therefore testable on its own.
 */
export type GameAction =
  | { type: 'play'; levelId: string }
  | { type: 'back' }
  | { type: 'next'; levelId: string | null }
  | { type: 'reset' }

/**
 * Pure navigation reducer. Finishing the last level returns to the map with
 * `finished` set; every other route to the map clears it, so the closing line
 * shows exactly once and never lingers over a later visit.
 */
export function nextView(state: GameView, action: GameAction): GameView {
  switch (action.type) {
    case 'play':
      return { view: 'play', levelId: action.levelId }
    case 'next':
      return action.levelId === null
        ? { view: 'map', finished: true }
        : { view: 'play', levelId: action.levelId }
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
 */
export function initialView(search: string): GameView {
  try {
    const id = new URLSearchParams(search).get('nivel')
    if (id && LEVELS.some((l) => l.id === id)) return { view: 'play', levelId: id }
  } catch {
    // malformed query string: fall through to the map
  }
  return { view: 'map', finished: false }
}

export interface GameScreenProps {
  /** Extra chrome the app shell wants under the MAP only. A level fills the
   * whole viewport and must not grow a page scroller (docs/04 §3.3), so the
   * shell hands its footer down instead of rendering it around this screen. */
  footer?: ReactNode
}

export default function GameScreen({ footer }: GameScreenProps = {}) {
  // One store per app: reads localStorage once (App.tsx pattern).
  const [store] = useState(() => new LevelProgressStore())
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
        onNext={() => dispatch({ type: 'next', levelId: nextLevelId(state.levelId) })}
        onBack={() => dispatch({ type: 'back' })}
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
