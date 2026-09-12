/** App shell. The entry point is the ZOO MAP (`docs/12_MAPA_DEL_ZOOLOGICO.md`):
 * one drawn illustration with registered layers, replacing the home office
 * (`docs/10`) this screen used to open on. Returning from any level still
 * lands here, exactly as it landed on the office before — the map replaces
 * the office as the first thing the child sees and as the shell's own resume
 * destination, not as the game's internal navigation.
 *
 * The U7 letter workbench stays reachable behind a small text toggle, and
 * that toggle lives under the MAP, never on it: the map's own text is the
 * star count and the octopus's phrase, both captioned (`docs/12` §3), and
 * adding a third piece of UI copy there would be an unrelated screen's
 * concern riding along.
 */
import { useState } from 'react'
import GameScreen, { initialView, type GameView } from './screen/GameScreen'
import MainScreen from './screen/MainScreen'
import ZooMap from './screen/ZooMap'
import { LocalProgressStore } from './progress/LocalProgressStore'
import { openProgressStore } from './game/openProgressStore'
import { isDevMode } from './canvas/devMode'
import type { LevelRecord } from './game/types'

/** Which shell is on screen. `game` carries where to open it, which is how
 * the map's own routing decision (`nextAdventure`) reaches the game without
 * the game having to re-derive it. */
type Shell = { at: 'map' } | { at: 'game'; initial?: GameView } | { at: 'workbench' }

/** The map is a resume control, so it needs the persisted records — but only
 * at the moment it is shown. Reading them through a store constructed right
 * here, each time, is deliberate: `LevelProgressStore` caches on construction,
 * so a long-lived second instance would go stale the moment the game wrote
 * anything (`game/openProgressStore.ts`). */
function readRecords(): Readonly<Record<string, LevelRecord>> {
  return openProgressStore().all()
}

/** A `?nivel=` deep link skips the map. The link exists so a level can be
 * opened directly while the mechanics are being reviewed, and routing it
 * through the map would defeat that. `initialView` returns `null` for
 * anything unroutable — including a bare `?nivel=mapa` outside dev mode
 * (design.md §8, "Dev gate on the map route") — so the zoo map, not the
 * internal `LevelMap`, is the fallback whenever nothing was asked for. */
function initialShell(): Shell {
  const search = typeof window === 'undefined' ? '' : window.location.search
  const view = initialView(search, isDevMode())
  return view ? { at: 'game', initial: view } : { at: 'map' }
}

export default function App() {
  // One store per app: reads localStorage once, monotonic best-of on writes.
  // This is the LETTER store (U7 workbench), unrelated to level progress.
  const [store] = useState(() => new LocalProgressStore())
  const [shell, setShell] = useState<Shell>(initialShell)
  const [records, setRecords] = useState(readRecords)
  // A fresh mount per trip into the game, so `initial` is honoured every time
  // rather than only on the first one (it is read in a lazy initialiser).
  const [trip, setTrip] = useState(0)

  // Renamed from `goHome` (zoo-map-home, main-screen spec "Exit Returns to
  // the Zoo Map") — same one function that can reach `{ at: 'map' }`, still
  // what `onExit` receives below.
  const goToMap = () => {
    setRecords(readRecords())
    setShell({ at: 'map' })
  }

  if (shell.at === 'map') {
    return (
      <ZooMap
        records={records}
        onEnter={(levelId: string) => {
          setTrip((n) => n + 1)
          setShell({ at: 'game', initial: { view: 'play', levelId } })
        }}
      />
    )
  }

  const toggle = (
    <div style={{ textAlign: 'center', padding: '12px 0 24px', display: 'flex', gap: 18, justifyContent: 'center' }}>
      <button type="button" onClick={goToMap} style={LINK}>
        el mapa
      </button>
      <button
        type="button"
        onClick={() => setShell((s) => (s.at === 'workbench' ? { at: 'game' } : { at: 'workbench' }))}
        style={LINK}
      >
        {shell.at === 'workbench' ? 'volver al juego' : 'modo letras (viejo)'}
      </button>
    </div>
  )

  if (shell.at === 'workbench') {
    return (
      <>
        <MainScreen store={store} />
        {toggle}
      </>
    )
  }

  // The toggle goes THROUGH the game shell rather than under it: a level is
  // exactly one viewport tall (docs/04 §3.3), so anything appended below it
  // would reintroduce the page scroll the layout exists to remove.
  // `onExit={goToMap}`: leaving any mode (a trail's back control, the
  // deduction's back control) lands on the zoo map, never the internal level
  // map (design.md §8, "onExit, a prop, not a GameAction") — `goToMap` is
  // the only function that can reach `{ at: 'map' }`.
  return <GameScreen key={trip} initial={shell.initial} footer={toggle} onExit={goToMap} />
}

const LINK = {
  background: 'none',
  border: 'none',
  color: '#94a3b8',
  fontSize: 14,
  textDecoration: 'underline',
  cursor: 'pointer',
} as const
