// Main screen (main-screen spec, T6.2): thin book-style home — the letter
// picker lists every registry letter with its stored percentage (from the
// injected ProgressStore), a selection launches that letter's guided → free
// flow, and the Bloom flowers when every `ola` family letter reaches 100.
// Progress refreshes after each approval; the store's monotonic best-of keeps
// mastery stable once reached (lower scores never regress the display).
import { useMemo, useState } from 'react'
import GuidedTrace from '../modes/guidedTrace'
import FreeTrace from '../modes/freeTrace'
import Bloom from './Bloom'
import { LETTER_REGISTRY } from '../letters/registry'
import type { EvaluationResult } from '../letters/types'
import type { ProgressStore } from '../progress/ProgressStore'

export interface MainScreenProps {
  store: ProgressStore
}

export default function MainScreen({ store }: MainScreenProps) {
  const letters = useMemo(() => Object.entries(LETTER_REGISTRY), [])
  const [selected, setSelected] = useState<string>(letters[0][0])
  const [mode, setMode] = useState<'guided' | 'free'>('guided')
  const [progress, setProgress] = useState<Record<string, number>>(() =>
    Object.fromEntries(letters.map(([key]) => [key, store.getProgress(key)])),
  )

  const letter = LETTER_REGISTRY[selected]
  // Bloom derives from stored progress on load AND re-derives on every change.
  const bloomed = letters
    .filter(([, cfg]) => cfg.family === 'ola')
    .every(([key]) => (progress[key] ?? 0) >= 100)

  const start = (key: string): void => {
    setSelected(key)
    setMode('guided') // selection relaunches the guided → free flow
  }

  const onEvaluate = (key: string, r: EvaluationResult): void => {
    if (!r.approved) return // only approval persists progress (design)
    store.setProgress(key, r.score)
    setProgress((prev) => ({ ...prev, [key]: store.getProgress(key) }))
  }

  return (
    <main style={{ maxWidth: 860, margin: '0 auto', padding: '24px 16px' }}>
      <h1>cursiva</h1>
      <Bloom bloomed={bloomed} />
      <nav aria-label="Letras" style={{ display: 'flex', gap: 12, justifyContent: 'center', margin: '10px 0 16px' }}>
        {letters.map(([key, cfg]) => (
          <button
            key={key}
            type="button"
            onClick={() => start(key)}
            aria-pressed={selected === key}
            aria-label={`Letra ${cfg.character}: ${progress[key]}%`}
            style={{
              padding: '8px 20px',
              borderRadius: 999,
              border: selected === key ? '2px solid #0284c7' : '1px solid #cbd5e1',
              background: selected === key ? '#e0f2fe' : '#fff',
              fontWeight: 700,
              fontSize: 20,
              cursor: 'pointer',
            }}
          >
            {cfg.character} · {progress[key]}%
          </button>
        ))}
      </nav>
      {mode === 'guided' ? (
        <GuidedTrace key={selected} letter={letter} onComplete={() => setMode('free')} />
      ) : (
        <FreeTrace key={selected} letter={letter} onEvaluate={(r) => onEvaluate(selected, r)} />
      )}
      <p style={{ textAlign: 'center', marginTop: 12, opacity: 0.75 }}>
        letra: {letter.character} · modo: {mode}
      </p>
    </main>
  )
}