// A finished word, on the page where it now lives: the child's own stroke writes
// itself again, the animal they rescued reacts, and it goes into the notebook. The
// reward of the letter stage is this line, not a star (`docs/25` 4.5).
import { useEffect, useMemo, useRef, useState } from 'react'
import { OCTOPUS_EMPTY_HANDED_ART, ZOO_ANIMAL_ART } from '../detective/assets'
import type { LevelConfig } from '../levels/types'
import { ArtImg } from '../puppet/ArtFigure'
import { useNarration } from '../voice/useNarration'
import { prefersReducedMotion } from '../canvas/Tentacle'
import { loadWritings, type Writing } from '../zoo/notebookWriting'
import { smoothStrokePath } from '../zoo/tracedLine'
import NotebookPaper, { NotebookFrame, NotebookRule } from './NotebookPaper'

const KEEPSAKE_CSS = `
.cv-keepsake { position: relative; height: 100dvh; width: 100vw; overflow: hidden; }
.cv-keepsake-stage { position: absolute; inset: 0; width: 100%; height: 100%; padding: 0; border: none; background: none; cursor: pointer; display: block; }
.cv-keepsake-stage > svg { position: absolute; left: 4%; right: 4%; top: 2%; width: 92%; height: 66%; display: block; }
.cv-keepsake-animal { position: absolute; right: 6%; bottom: 3%; height: 34dvh; aspect-ratio: 1 / 1; pointer-events: none; }
.cv-keepsake-octopus { position: absolute; left: 6%; bottom: 3%; height: 34dvh; aspect-ratio: 1 / 1; pointer-events: none; }
.cv-keepsake-animal > *, .cv-keepsake-octopus > * { display: block; width: 100%; height: 100%; }
.cv-keepsake-ink { stroke-dasharray: 1 1; stroke-dashoffset: 1; animation: cv-keepsake-write 2.6s ease-in-out 0.3s forwards; }
@keyframes cv-keepsake-write { to { stroke-dashoffset: 0; } }
@media (prefers-reduced-motion: reduce) { .cv-keepsake-ink { animation: none; stroke-dashoffset: 0; } }
`

const HOLD_MS = 5200
const CALM_HOLD_MS = 3600

export function keepsakeLine(word: string): string {
  return `¡Escribiste ${word}! Lo guardo en la libreta.`
}

/** The end of a sitting says it is one: the map keeps the next letter for later. */
export function sittingEndLine(named: string): string {
  return `¡Ya sabés escribir ${named}! La guardo en la libreta. Seguimos cuando quieras.`
}

export function strokePath(stroke: Writing['strokes'][number]): string {
  return smoothStrokePath(stroke)
}

/** A window around the writing, the rule's lines kept in it. */
export function writingViewBox(writing: Writing, margin = 40): string {
  const points = writing.strokes.flat()
  const xs = points.map((p) => p[0])
  const ys = points.map((p) => p[1])
  const left = Math.min(...xs) - margin
  const width = Math.max(...xs) - Math.min(...xs) + margin * 2
  const top = Math.min(Math.min(...ys), 300) - margin
  const bottom = Math.max(Math.max(...ys), 420) + margin
  return `${left.toFixed(0)} ${top.toFixed(0)} ${width.toFixed(0)} ${(bottom - top).toFixed(0)}`
}

export interface NotebookKeepsakeProps {
  level: LevelConfig
  onDone: () => void
  /** Tests pin it: there is no `localStorage` under `renderToString`. */
  writing?: Writing | null
}

export default function NotebookKeepsake({ level, onDone, writing }: NotebookKeepsakeProps) {
  const word = level.notebook?.text ?? ''
  const [shown] = useState(() => writing ?? loadWritings()[word] ?? null)
  const [calm] = useState(prefersReducedMotion)
  const sittingEnd = level.notebook?.sittingEnd
  useNarration(sittingEnd ? sittingEndLine(sittingEnd.named) : keepsakeLine(word))
  const doneRef = useRef(onDone)
  doneRef.current = onDone
  useEffect(() => {
    const done = window.setTimeout(() => doneRef.current(), calm ? CALM_HOLD_MS : HOLD_MS)
    return () => window.clearTimeout(done)
  }, [calm])
  const viewBox = useMemo(() => (shown ? writingViewBox(shown) : '0 240 1000 240'), [shown])
  return (
    <main className="cv-keepsake" data-cv-keepsake={word}>
      <style>{KEEPSAKE_CSS}</style>
      <NotebookPaper />
      <button type="button" className="cv-keepsake-stage" aria-label="Seguir" onClick={() => doneRef.current()}>
        <svg viewBox={viewBox} preserveAspectRatio="xMidYMid meet" aria-hidden="true">
          <NotebookRule />
          {shown?.strokes.map((stroke, i) => (
            <path
              key={i}
              className="cv-keepsake-ink"
              d={strokePath(stroke)}
              pathLength={1}
              fill="none"
              stroke="#2a3442"
              strokeWidth={11}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
        </svg>
        <NotebookFrame />
        <span className="cv-keepsake-octopus">
          <ArtImg art={OCTOPUS_EMPTY_HANDED_ART} still={calm} entrance={{ act: 'cheer', seconds: 3 }} />
        </span>
        <span className="cv-keepsake-animal">
          <ArtImg art={sittingEnd?.animal ?? level.notebook?.animal ?? ZOO_ANIMAL_ART.tortuga} still={calm} holding="cheer" />
        </span>
      </button>
    </main>
  )
}
