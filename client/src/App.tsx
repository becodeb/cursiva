/** App shell. U6a wires the guided mode loop: demo → rail → replay on completion. U6b adds the handoff to free trace; U7 replaces this wiring with MainScreen (picker + progress). */
import { useState } from 'react'
import GuidedTrace from './modes/guidedTrace'
import { getLetterConfig } from './letters/registry'

export default function App() {
  const [letterId, setLetterId] = useState('a')
  const [session, setSession] = useState(0) // remount replays the demo after the rail completes
  const letter = getLetterConfig(letterId)

  return (
    <main style={{ maxWidth: 860, margin: '0 auto', padding: '24px 16px' }}>
      <h1>cursiva</h1>
      <GuidedTrace key={session} letter={letter} onComplete={() => setSession((s) => s + 1)} />
      <p style={{ textAlign: 'center', marginTop: 12, opacity: 0.75 }}>letra: {letter.character}</p>
      <button
        type="button"
        onClick={() => {
          setSession((s) => s + 1)
          setLetterId(letterId === 'a' ? 'c' : 'a')
        }}
      >
        Volver a empezar
      </button>
    </main>
  )
}