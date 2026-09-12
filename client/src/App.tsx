/** App shell. The entry point is the HOME (`docs/10_HOME_LA_OFICINA_DEL_PULPO.md`):
 * the octopus in its office, with the magnifying glass as "keep going from
 * where I left off". It used to be the level map, and the map is still where a
 * trail returns to — the home replaces the map as the first thing the child
 * sees, not as the game's navigation.
 *
 * The U7 letter workbench stays reachable behind a small text toggle, and that
 * toggle lives under the MAP, never under the home: the home carries no text at
 * all (`docs/10` §3, §7), and the workbench becomes a real mode with a pencil
 * object once `cuaderno` exists (`docs/10` §5). Same for the link back to the
 * office — dev chrome belongs on the dev-facing screen.
 */
import { useState } from 'react'
import GameScreen, { initialView, type GameView } from './screen/GameScreen'
import HomeScreen from './screen/HomeScreen'
import MainScreen from './screen/MainScreen'
import { LocalProgressStore } from './progress/LocalProgressStore'
import { openProgressStore } from './game/openProgressStore'
import type { CaseStep } from './home/caseState'
import type { LevelRecord } from './game/types'
import type { HomeMode } from './home/modes'

/** Which shell is on screen. `game` carries where to open it, which is how the
 * home's "por donde lo dejé" decision reaches the game without the game having
 * to re-derive it. */
type Shell = { at: 'home' } | { at: 'game'; initial?: GameView } | { at: 'workbench' }

/** The home is a resume control, so it needs the persisted records — but only
 * at the moment it is shown. Reading them through a store constructed right
 * here, each time, is deliberate: `LevelProgressStore` caches on construction,
 * so a long-lived second instance would go stale the moment the game wrote
 * anything (`game/openProgressStore.ts`). */
function readRecords(): Readonly<Record<string, LevelRecord>> {
  return openProgressStore().all()
}

/** A `?nivel=` deep link skips the home. The link exists so a level can be
 * opened directly while the mechanics are being reviewed, and routing it
 * through the office would defeat that. */
function initialShell(): Shell {
  const view = initialView(typeof window === 'undefined' ? '' : window.location.search)
  return view.view === 'map' ? { at: 'home' } : { at: 'game', initial: view }
}

/** Where a mode's resolved step opens the game. [case-registry-and-captions,
 * Phase 6] `CaseStep.deduce` now carries `caseId` — threaded straight
 * through, so the home's active-case decision and the game shell's rendered
 * case can never disagree. */
function viewFor(step: CaseStep): GameView {
  return step.kind === 'deduce'
    ? { view: 'deduce', caseId: step.caseId }
    : { view: 'play', levelId: step.levelId }
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

  const goHome = () => {
    setRecords(readRecords())
    setShell({ at: 'home' })
  }

  if (shell.at === 'home') {
    return (
      <HomeScreen
        records={records}
        onEnter={(mode: HomeMode, step: CaseStep) => {
          setTrip((n) => n + 1)
          setShell(
            mode.enter === 'letters'
              ? { at: 'workbench' }
              : { at: 'game', initial: viewFor(step) },
          )
        }}
      />
    )
  }

  const toggle = (
    <div style={{ textAlign: 'center', padding: '12px 0 24px', display: 'flex', gap: 18, justifyContent: 'center' }}>
      <button type="button" onClick={goHome} style={LINK}>
        la oficina
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
  return <GameScreen key={trip} initial={shell.initial} footer={toggle} />
}

const LINK = {
  background: 'none',
  border: 'none',
  color: '#94a3b8',
  fontSize: 14,
  textDecoration: 'underline',
  cursor: 'pointer',
} as const
