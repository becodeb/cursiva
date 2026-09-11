// Level map (docs/04 §3.2 "Mapa de niveles con fases, estado y progreso").
// One row per pedagogical phase; each level is a large tap target showing its
// state — locked / available / approved. Locked is DIMMED, never scolding: the
// unlock rule is two approvals, because one pass can be luck (docs/08 §4).
import type { CSSProperties } from 'react'
import { LEVELS, PHASE_TITLES, levelsByPhase } from '../levels/catalog'
import { APPROVALS_TO_UNLOCK } from '../game/types'
import type { LevelProgressStore } from '../game/LevelProgressStore'
import type { Phase } from '../levels/types'

export interface LevelMapProps {
  store: LevelProgressStore
  onPlay: (levelId: string) => void
  onReset: () => void
  /** Re-render hook after the test-drive flag flips. */
  onToggleTestMode: () => void
  /** True after the last level was cleared — a short closing line, no fanfare. */
  finished?: boolean
}

const CARD: CSSProperties = {
  minHeight: 64,
  minWidth: 168,
  padding: '10px 18px',
  borderRadius: 16,
  border: '1px solid #cbd5e1',
  background: '#ffffff',
  color: '#1e293b',
  fontSize: 18,
  fontWeight: 600,
  textAlign: 'left',
  cursor: 'pointer',
}

/** Distinct phases present in the catalog, in ascending order. */
function phases(): Phase[] {
  const seen = new Set<Phase>()
  for (const level of LEVELS) seen.add(level.phase)
  return [...seen].sort((a, b) => a - b)
}

export default function LevelMap({ store, onPlay, onReset, onToggleTestMode, finished = false }: LevelMapProps) {
  const confirmReset = (): void => {
    if (window.confirm('¿Borrar todo el progreso y empezar de nuevo?')) onReset()
  }

  // Evaluation affordance (docs/04 section 1): walking to phase 5 legitimately
  // takes eight approvals, which makes the later mechanics untestable. The
  // toggle unlocks the catalog WITHOUT touching progress.
  const testMode = store.isTestMode()
  const toggleTestMode = (): void => {
    store.setTestMode(!testMode)
    onToggleTestMode()
  }

  return (
    <main
      style={{
        maxWidth: 900,
        margin: '0 auto',
        padding: '20px 16px',
        background: '#faf8f5',
        color: '#1e293b',
      }}
    >
      <h1 style={{ fontSize: 28, fontWeight: 700, margin: '0 0 4px' }}>cursiva</h1>
      <p style={{ margin: '0 0 18px', fontSize: 18, color: '#64748b' }}>Elegí un camino</p>
      {finished && (
        <p role="status" style={{ fontSize: 22, fontWeight: 600, margin: '0 0 18px' }}>
          ¡Terminaste todos los niveles!
        </p>
      )}
      {phases().map((phase) => (
        <section key={phase} style={{ marginBottom: 26 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 10px' }}>
            Fase {phase} · {PHASE_TITLES[phase]}
          </h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            {levelsByPhase(phase).map((level) => {
              const record = store.get(level.id)
              const unlocked = store.isUnlocked(level.id)
              const approved = record.approvals >= APPROVALS_TO_UNLOCK
              return (
                <button
                  key={level.id}
                  type="button"
                  disabled={!unlocked}
                  onClick={() => onPlay(level.id)}
                  aria-label={`${level.title}: ${
                    !unlocked ? 'bloqueado' : approved ? 'aprobado' : 'disponible'
                  }`}
                  style={{
                    ...CARD,
                    ...(unlocked
                      ? approved
                        ? { background: '#f1f5f9', borderColor: '#94a3b8' }
                        : null
                      : { opacity: 0.4, cursor: 'default', background: '#f8fafc' }),
                  }}
                >
                  <span style={{ display: 'block' }}>
                    {unlocked && approved ? '\u2713 ' : ''}
                    {level.title}
                  </span>
                  <span style={{ display: 'block', fontSize: 15, fontWeight: 500, color: '#64748b' }}>
                    {!unlocked
                      ? 'bloqueado'
                      : approved
                        ? `aprobado ${record.approvals}/${APPROVALS_TO_UNLOCK} · precisión ${record.bestAccuracy} · fluidez ${record.bestFluency}`
                        : record.approvals > 0
                          ? `disponible · ${record.approvals}/${APPROVALS_TO_UNLOCK}`
                          : 'disponible'}
                  </span>
                </button>
              )
            })}
          </div>
        </section>
      ))}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        <button
          type="button"
          onClick={confirmReset}
          style={{ ...CARD, minHeight: 48, minWidth: 0, fontSize: 16, fontWeight: 500, color: '#64748b' }}
        >
          Reiniciar progreso
        </button>
        <button
          type="button"
          onClick={toggleTestMode}
          aria-pressed={testMode}
          style={{
            ...CARD,
            minHeight: 48,
            minWidth: 0,
            fontSize: 16,
            fontWeight: 500,
            color: testMode ? '#1e293b' : '#64748b',
            background: testMode ? '#e2e8f0' : '#ffffff',
          }}
        >
          {testMode ? '\u2713 Modo prueba: todo abierto' : 'Modo prueba: abrir todo'}
        </button>
      </div>
    </main>
  )
}
