/** App shell. U6 wires the mode loop: guided demo → rail → handoff to free trace → feedback. U7 replaces this wiring with MainScreen (picker + progress). */
import { useState } from 'react'
import FreeTrace from './modes/freeTrace'
import GuidedTrace from './modes/guidedTrace'
import { getLetterConfig } from './letters/registry'

export default function App() {
  const [mode, setMode] = useState<'guided' | 'free'>('guided')
  const [letterId, setLetterId] = useState('a')
  const letter = getLetterConfig(letterId)

  return (
    <main style={{ maxWidth: 860, margin: '0 auto', padding: '24px 16px' }}>
      <h1>cursiva</h1>
      {mode === 'guided' ? (
        <GuidedTrace letter={letter} onComplete={() => setMode('free')} />
      ) : (
        <FreeTrace letter={letter} />
      )}
      <p style={{ textAlign: 'center', marginTop: 12, opacity: 0.75 }}>
        letra: {letter.character} · modo: {mode}
      </p>
      <button
        type="button"
        onClick={() => {
          setMode('guided')
          setLetterId(letterId === 'a' ? 'c' : 'a')
        }}
      >
        Volver a empezar
      </button>
    </main>
  )
}