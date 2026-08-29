// Main screen (main-screen spec, T6.2): thin book-style home — the letter
// picker lists every registered letter with its stored percentage (from the
// injected ProgressStore) and APPENDS the pressed letter to the current word;
// the keyboard builds words too (`a–z` append registered word-eligible letters,
// Backspace pops, "Borrar" clears); the flow remounts keyed by the word
// (`word.join('')`) keeping its mode (guided → free) across appends, and the
// canvas/label render only while the word is non-empty. Progress refreshes
// after each approval and persists ONLY for single-letter words (multi-letter
// words never write progress). The Bloom flowers when every `ola` family
// letter reaches 100.
import { useEffect, useMemo, useState } from 'react'
import GuidedTrace from '../modes/guidedTrace'
import FreeTrace from '../modes/freeTrace'
import Bloom from './Bloom'
import { LETTER_REGISTRY } from '../letters/registry'
import { buildWord } from '../letters/combinations'
import { isWordEligible } from '../letters/svgLetter'
import type { EvaluationResult } from '../letters/types'
import type { ProgressStore } from '../progress/ProgressStore'

export interface MainScreenProps {
  store: ProgressStore
  /** Empty-word start (placeholder state) — test seam; defaults to the first
   * registered letter so the app opens straight into a demo flow. */
  initialWord?: string[]
}

/**
 * Pure keyboard-word reducer (node-testable): `a–z` appends the letter when it
 * is registered AND word-eligible; `Backspace` pops the last letter (a no-op
 * on an empty word); every other key — uppercase, modifiers, space, unknown —
 * returns null (ignored). The keydown handler owns event-only concerns:
 * preventDefault for Backspace, modifier/space/focused-input guards.
 */
export function nextWord(word: string[], key: string): string[] | null {
  if (key === 'Backspace') return word.length > 0 ? word.slice(0, -1) : word
  if (!/^[a-z]$/.test(key)) return null
  const cfg = LETTER_REGISTRY[key]
  if (!cfg || !isWordEligible(cfg)) return null
  return [...word, key]
}

export default function MainScreen({ store, initialWord }: MainScreenProps) {
  const letters = useMemo(() => Object.entries(LETTER_REGISTRY), [])
  const [word, setWord] = useState<string[]>(() =>
    initialWord ?? (letters[0] ? [letters[0][0]] : []),
  )
  const wordKey = word.join('')
  const [mode, setMode] = useState<'guided' | 'free'>('guided')
  const [showCheckpoints, setShowCheckpoints] = useState(false)
  const [progress, setProgress] = useState<Record<string, number>>(() =>
    Object.fromEntries(letters.map(([key]) => [key, store.getProgress(key)])),
  )

  // The current flow config is the WORD built from the picked letters.
  const letter = word.length > 0 ? buildWord(word) : null
  // Bloom derives from stored progress on load AND re-derives on every change.
  const bloomed = letters
    .filter(([, cfg]) => cfg.family === 'ola')
    .every(([key]) => (progress[key] ?? 0) >= 100)

  const append = (key: string): void => {
    setWord((w) => {
      const next = nextWord(w, key)
      return next === null ? w : next
    })
  }

  // Window keydown (main-screen "Keyboard Word Building"): focused
  // input/textarea exempt; Ctrl/Alt/Meta/Shift (uppercase included) and the
  // space bar ignored; Backspace pops + preventDefault; a–z append.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent): void => {
      const el = document.activeElement
      if (
        el &&
        (el.tagName === 'INPUT' ||
          el.tagName === 'TEXTAREA' ||
          (el as HTMLElement).isContentEditable)
      ) {
        return
      }
      if (e.ctrlKey || e.altKey || e.metaKey || e.shiftKey) return
      if (e.key === ' ') return
      if (e.key === 'Backspace') {
        e.preventDefault()
        setWord((w) => {
          const next = nextWord(w, e.key)
          return next === null ? w : next
        })
        return
      }
      setWord((w) => {
        const next = nextWord(w, e.key)
        return next === null ? w : next
      })
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const onEvaluate = (r: EvaluationResult): void => {
    if (!r.approved) return // only approval persists progress (design)
    if (word.length !== 1) return // multi-letter words never write progress
    const key = word[0]
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
            onClick={() => append(key)}
            aria-label={`Letra ${cfg.character}: ${progress[key]}%`}
            style={{
              padding: '8px 20px',
              borderRadius: 999,
              border: '1px solid #cbd5e1',
              background: '#fff',
              fontWeight: 700,
              fontSize: 20,
              cursor: 'pointer',
            }}
          >
            {cfg.character} · {progress[key]}%
          </button>
        ))}
      </nav>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginBottom: 14 }}>
        <button
          type="button"
          onClick={() => setShowCheckpoints((v) => !v)}
          aria-pressed={showCheckpoints}
          style={{
            padding: '6px 16px',
            borderRadius: 999,
            border: showCheckpoints ? '2px solid #0284c7' : '1px solid #cbd5e1',
            background: showCheckpoints ? '#e0f2fe' : '#fff',
            fontWeight: 600,
            fontSize: 15,
            cursor: 'pointer',
          }}
        >
          Mostrar puntos del trazo
        </button>
        <button
          type="button"
          onClick={() => setWord([])}
          style={{
            padding: '6px 16px',
            borderRadius: 999,
            border: '1px solid #fca5a5',
            background: '#fff',
            fontWeight: 600,
            fontSize: 15,
            cursor: 'pointer',
          }}
        >
          Borrar
        </button>
      </div>
      {letter ? (
        <>
          {mode === 'guided' ? (
            <GuidedTrace
              key={wordKey}
              letter={letter}
              onComplete={() => setMode('free')}
              showCheckpoints={showCheckpoints}
            />
          ) : (
            <FreeTrace
              key={wordKey}
              letter={letter}
              onEvaluate={onEvaluate}
              showCheckpoints={showCheckpoints}
            />
          )}
          <p style={{ textAlign: 'center', marginTop: 12, opacity: 0.75 }}>
            palabra: {wordKey} · modo: {mode}
          </p>
        </>
      ) : (
        <p style={{ textAlign: 'center', marginTop: 24, opacity: 0.75 }}>
          Elegí una letra o escribí con el teclado para empezar
        </p>
      )}
    </main>
  )
}