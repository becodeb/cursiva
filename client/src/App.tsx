/** App shell. The MVP entry point is the level game (docs/04): map → level →
 * map. The U7 letter workbench stays reachable behind a small text toggle so
 * the letter pipeline can still be exercised by hand while the level engine is
 * being tuned. */
import { useState } from 'react'
import GameScreen from './screen/GameScreen'
import MainScreen from './screen/MainScreen'
import { LocalProgressStore } from './progress/LocalProgressStore'

export default function App() {
  // One store per app: reads localStorage once, monotonic best-of on writes.
  const [store] = useState(() => new LocalProgressStore())
  const [workbench, setWorkbench] = useState(false)
  const toggle = (
    <div style={{ textAlign: 'center', padding: '12px 0 24px' }}>
      <button
        type="button"
        onClick={() => setWorkbench((v) => !v)}
        style={{
          background: 'none',
          border: 'none',
          color: '#94a3b8',
          fontSize: 14,
          textDecoration: 'underline',
          cursor: 'pointer',
        }}
      >
        {workbench ? 'volver al juego' : 'modo letras (viejo)'}
      </button>
    </div>
  )
  if (workbench) {
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
  return <GameScreen footer={toggle} />
}
