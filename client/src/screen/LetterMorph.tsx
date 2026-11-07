// The moment before a letter: the line the child already made turns into it, so
// they see they could already do it. Runs on the puppets' shared ticker and writes
// the path through a ref, like `screen/StrokeFinale.tsx`. With reduced motion there
// is no morph: the two stand side by side, which says the same thing in stillness.
import { useEffect, useMemo, useRef, useState } from 'react'
import { LETTER_REGISTRY } from '../letters/registry'
import { flattenPathD } from '../letters/svgLetter'
import { OCTOPUS_EMPTY_HANDED_ART } from '../detective/assets'
import { getLevel } from '../levels/catalog'
import type { LetterMorphConfig, LevelConfig } from '../levels/types'
import { ArtImg } from '../puppet/ArtFigure'
import { puppetTicker } from '../puppet/ticker'
import { useNarration } from '../voice/useNarration'
import { approvedLineFor } from '../zoo/tracedLine'
import type { AdventureId } from '../zoo/adventures'
import { loadWritings } from '../zoo/notebookWriting'
import type { Point } from '../letters/types'
import { prefersReducedMotion } from '../canvas/Tentacle'
import {
  fitLine,
  boxOf,
  MORPH_POINTS,
  MORPH_TOTAL_S,
  morphAmount,
  morphPath,
  partOfLine,
  sampleLine,
} from './letterMorph'
import NotebookPaper, { NotebookFrame, NotebookRule } from './NotebookPaper'

const MORPH_CSS = `
.cv-morph { position: relative; height: 100dvh; width: 100vw; overflow: hidden; }
.cv-morph-stage { position: absolute; inset: 0; width: 100%; height: 100%; padding: 0; border: none; background: none; cursor: pointer; display: block; }
.cv-morph-stage svg { position: absolute; inset: 0; width: 100%; height: 100%; display: block; overflow: visible; }
.cv-morph-octopus { position: absolute; left: 3%; bottom: 2%; height: 34dvh; aspect-ratio: 1 / 1; pointer-events: none; }
.cv-morph-octopus > * { display: block; width: 100%; height: 100%; }
`

const INK_WIDTH = 13
const INK = '#2a3442'

/** The line that turns: the child's on the bridge, or their family's closing line,
 *  or, with no line at all (a deep link, old progress), the family's stroke. */
export function morphSourceLine(morph: LetterMorphConfig): Point[] {
  const written = loadWritings()[morph.bridgeLevelId]
  if (written) return written.strokes.flat().map(([x, y]) => ({ x, y }))
  const saved = approvedLineFor(morph.family as AdventureId)
  if (saved) return saved.strokes.flat().map(([x, y]) => ({ x, y }))
  return flattenPathD(getLevel(morph.bridgeLevelId).paths[0]).points
}

export interface LetterMorphProps {
  level: LevelConfig
  morph: LetterMorphConfig
  onDone: () => void
  /** Tests pin these: there is no `matchMedia` or `localStorage` under `renderToString`. */
  reducedMotion?: boolean
  source?: readonly Point[]
}

export default function LetterMorph({ level, morph, onDone, reducedMotion, source }: LetterMorphProps) {
  const [calm] = useState(() => reducedMotion ?? prefersReducedMotion())
  useNarration(morph.line)
  const view = level.view!
  const { from, to, viewBox, stillFrom } = useMemo(() => {
    const letter = flattenPathD(LETTER_REGISTRY[level.notebook!.text].pathDefinition.d).points
    const letterBox = boxOf(letter)
    const W = Math.max(view.width, 760)
    const centred = letter.map((p) => ({ x: p.x - letterBox.x - letterBox.width / 2 + W / 2, y: p.y }))
    const target = boxOf(centred)
    const raw = partOfLine(source ?? morphSourceLine(morph), morph.fraction)
    const fitted = fitLine(raw, target)
    return {
      from: sampleLine(fitted, MORPH_POINTS),
      to: sampleLine(centred, MORPH_POINTS),
      viewBox: `0 ${view.y} ${W} ${view.height}`,
      // Side by side, for reduced motion: the line on the left, the letter centred right.
      stillFrom: fitLine(raw, { x: target.x - W * 0.27, y: target.y, width: target.width * 0.7, height: target.height }),
    }
  }, [level, morph, source, view])

  const pathRef = useRef<SVGPathElement | null>(null)
  const ruleRef = useRef<SVGGElement | null>(null)
  const doneRef = useRef(onDone)
  doneRef.current = onDone

  useEffect(() => {
    if (calm) {
      const done = window.setTimeout(() => doneRef.current(), MORPH_TOTAL_S * 1000)
      return () => window.clearTimeout(done)
    }
    const began = performance.now()
    let finished = false
    return puppetTicker.subscribe(() => {
      const seconds = (performance.now() - began) / 1000
      const amount = morphAmount(seconds)
      pathRef.current?.setAttribute('d', morphPath(from, to, amount))
      ruleRef.current?.setAttribute('opacity', amount.toFixed(3))
      if (seconds >= MORPH_TOTAL_S && !finished) {
        finished = true
        doneRef.current()
      }
    })
  }, [calm, from, to])

  const stillLetterShift = calm ? view.width * 0.14 : 0
  return (
    <main className="cv-morph" data-cv-morph={level.notebook!.text}>
      <style>{MORPH_CSS}</style>
      <NotebookPaper />
      <button type="button" className="cv-morph-stage" aria-label="Seguir" onClick={() => doneRef.current()}>
        <svg viewBox={viewBox} preserveAspectRatio="xMidYMid meet" aria-hidden="true">
          <g ref={ruleRef} opacity={calm ? 1 : 0}>
            <NotebookRule />
          </g>
          {calm ? (
            <>
              <path d={morphPath(stillFrom, stillFrom, 0)} fill="none" stroke={INK} strokeWidth={INK_WIDTH} strokeLinecap="round" strokeLinejoin="round" />
              <path
                d={morphPath(to, to, 0)}
                transform={`translate(${stillLetterShift} 0)`}
                fill="none"
                stroke={INK}
                strokeWidth={INK_WIDTH}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </>
          ) : (
            <path ref={pathRef} d={morphPath(from, to, 0)} fill="none" stroke={INK} strokeWidth={INK_WIDTH} strokeLinecap="round" strokeLinejoin="round" />
          )}
        </svg>
        <NotebookFrame />
        <span className="cv-morph-octopus">
          <ArtImg art={OCTOPUS_EMPTY_HANDED_ART} still={calm} entrance={{ act: 'cheer', seconds: 3 }} />
        </span>
      </button>
    </main>
  )
}
