// The child's line, cut out of paper and put to use: the moment between finishing
// an adventure and its closing. Runs on the puppets' shared ticker and writes
// attributes through refs, like `puppet/Puppet.tsx`; React renders the first frame
// and never touches the moving parts again. The animal comes through the seam
// (`puppet/ArtFigure.tsx`), so a PNG works today and its puppet takes over the day
// its registry row exists. No `url(#)`, mask or filter (`canvas/TraceCanvas.tsx`).
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ArtImg, ArtInSvg } from '../puppet/ArtFigure'
import type { PuppetHandle } from '../puppet/Puppet'
import { fmt } from '../puppet/geometry'
import { PAPER_SHADOW_FILL, PAPER_SHADOW_TRANSFORM } from '../puppet/rig'
import { puppetTicker } from '../puppet/ticker'
import { backdropFor } from '../zoo/backdrops'
import { ArtBackdrop, SCENE_CSS } from '../puppet/scene/Scene'
import { adventureIcon, type Adventure, type ClosingBeat } from '../zoo/adventures'
import { approvedLineFor, type TracedLine } from '../zoo/tracedLine'
import { SHEET_PAPER } from '../canvas/TraceCanvas'
import { resolvePulpitoStance, RESCUE_OCTOPUS_ART } from './pulpitoStance'
import {
  composeFinale,
  FINALE_STAGE,
  finaleFrame,
  STILL_SECONDS,
  type FinaleFrame,
  type FinaleProp,
  type FinaleScene,
} from './strokeFinale'

const FINALE_CSS = `
.cv-finale { position: relative; height: 100dvh; width: 100vw; overflow: hidden; }
.cv-finale-backdrop { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; display: block; }
.cv-finale-tap { position: absolute; inset: 0; width: 100%; height: 100%; padding: 0; border: none; background: none; cursor: pointer; display: block; }
.cv-finale-scene { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; }
.cv-finale-octopus { position: absolute; bottom: 2%; height: 30dvh; aspect-ratio: 1 / 1; pointer-events: none; }
.cv-finale-octopus > * { display: block; width: 100%; height: 100%; }
`

function propDrawing(kind: FinaleProp['kind']): ReactNode {
  switch (kind) {
    case 'flower':
      return (
        <>
          {[0, 72, 144, 216, 288].map((deg) => (
            <ellipse key={deg} cx={0} cy={-13} rx={9.5} ry={13} fill="#ff93b3" transform={`rotate(${deg})`} />
          ))}
          <circle r={8} fill="#ffd166" />
        </>
      )
    case 'bubble':
      return (
        <>
          <circle r={14} fill="#e9fbff" />
          <circle r={9.5} fill="#bfe8f0" />
          <circle cx={-4} cy={-5} r={3} fill="#ffffff" />
        </>
      )
    case 'leaf':
      return <path d="M-16 0C-8 -13 8 -13 16 0C8 13 -8 13 -16 0Z" fill="#6fae58" />
    case 'drop':
      return <circle r={14} fill="#f1fcfd" />
    case 'scute':
      return <path d="M-13 -7C-8 -14 8 -14 13 -7C16 0 13 9 6 12C0 14 -8 13 -12 8C-16 3 -16 -3 -13 -7Z" fill="#25583c" />
  }
}

function propTransform(prop: FinaleProp, frame: FinaleFrame['props'][number]): string {
  const scale = (prop.size / 14) * frame.shown
  return `translate(${fmt(frame.x)} ${fmt(frame.y)})rotate(${prop.turn ?? 0})scale(${scale.toFixed(3)})`
}

function fillTransform(rise: number, shown: number): string | undefined {
  return rise === 0 ? undefined : `translate(0 ${fmt((1 - shown) * rise)})`
}

function animalTransform(frame: FinaleFrame['animal']): string {
  return `translate(${fmt(frame.x)} ${fmt(frame.y - frame.lift)})rotate(${frame.rotate.toFixed(1)})scale(${frame.flip ? -1 : 1} 1)`
}

function headTransform(snake: NonNullable<FinaleFrame['snake']>): string {
  return `translate(${fmt(snake.head[0])} ${fmt(snake.head[1])})rotate(${snake.angle.toFixed(1)})`
}

/** The fixed `pathLength` is what lets one number reveal a stroke of any length. */
function stripDash(shown: number): { strokeDashoffset: number; opacity: number } {
  return { strokeDashoffset: 1 - shown, opacity: shown > 0 ? 1 : 0 }
}

function setStrip(node: Element, shown: number): void {
  const { strokeDashoffset, opacity } = stripDash(shown)
  node.setAttribute('stroke-dashoffset', strokeDashoffset.toFixed(4))
  node.setAttribute('opacity', String(opacity))
}

export interface FinaleFigure {
  readonly art: { readonly href: string; readonly w: number; readonly h: number }
}

export interface FinaleSceneViewProps extends FinaleFigure {
  scene: FinaleScene
  /** Show the finished composition, still, with no ticking. */
  reducedMotion: boolean
  onFrame?: (frame: FinaleFrame) => void
  onFinished?: () => void
  animalRef?: React.Ref<PuppetHandle>
}

/** The scene itself, separated so a test can render any moment of it. */
export function FinaleSceneView({ scene, art, reducedMotion, onFrame, onFinished, animalRef }: FinaleSceneViewProps) {
  const first = useMemo(() => finaleFrame(scene, 0, reducedMotion), [scene, reducedMotion])
  const rootRef = useRef<SVGSVGElement | null>(null)

  useEffect(() => {
    const root = rootRef.current
    if (!root) return undefined
    if (reducedMotion) {
      onFrame?.(first)
      const done = window.setTimeout(() => onFinished?.(), STILL_SECONDS * 1000)
      return () => window.clearTimeout(done)
    }
    const fills = Array.from(root.querySelectorAll('[data-finale-fill]'))
    const strokes = Array.from(root.querySelectorAll('[data-finale-stroke]'))
    const hangs = Array.from(root.querySelectorAll('[data-finale-hang]'))
    const props = Array.from(root.querySelectorAll('[data-finale-prop]'))
    const animal = root.querySelector('[data-finale-animal]')
    const body = Array.from(root.querySelectorAll('[data-finale-body]'))
    const stripe = root.querySelector('[data-finale-stripe]')
    const head = root.querySelector('[data-finale-head]')
    // Real seconds: a slow tablet shows fewer frames, not a longer finale.
    const began = performance.now()
    let finished = false
    const stop = puppetTicker.subscribe(() => {
      const t = (performance.now() - began) / 1000
      const frame = finaleFrame(scene, t)
      fills.forEach((node, i) => {
        const fill = scene.fills[i]
        const transform = fillTransform(fill.rise, frame.fills[i])
        if (transform) node.setAttribute('transform', transform)
        else node.setAttribute('opacity', frame.fills[i].toFixed(3))
      })
      strokes.forEach((node) => setStrip(node, frame.strokes[Number(node.getAttribute('data-finale-stroke'))]))
      const reveal = frame.strokes[0] ?? 0
      hangs.forEach((node) => setStrip(node, reveal))
      props.forEach((node, i) => {
        const propFrame = frame.props[i]
        node.setAttribute('transform', propTransform(scene.props[i], propFrame))
        node.setAttribute('opacity', propFrame.opacity.toFixed(3))
      })
      animal?.setAttribute('transform', animalTransform(frame.animal))
      if (frame.snake) {
        const snake = frame.snake
        body.forEach((node) => node.setAttribute('d', snake.d))
        stripe?.setAttribute('d', snake.stripe)
        head?.setAttribute('transform', headTransform(snake))
      }
      onFrame?.(frame)
      if (t >= scene.seconds && !finished) {
        finished = true
        onFinished?.()
      }
    })
    return stop
  }, [scene, first, reducedMotion, onFrame, onFinished])

  const figureW = (scene.carriage.size * art.w) / art.h
  const figure =
    scene.kind === 'slither' ? null : (
      <g data-finale-animal="" transform={animalTransform(first.animal)}>
        <ArtInSvg
          art={art}
          box={{
            x: -figureW * (scene.carriage.pivotX ?? 0.5),
            y: -scene.carriage.size * (1 - scene.carriage.anchor),
            width: figureW,
            height: scene.carriage.size,
          }}
          still={reducedMotion}
          puppetRef={animalRef}
        />
      </g>
    )
  const { strip } = scene
  const stripLayers = (d: string, attrs: Record<string, string | number>, shown: number, key: string) => (
    <g key={key}>
      {[
        { stroke: PAPER_SHADOW_FILL, width: strip.width + strip.edge * 2, transform: PAPER_SHADOW_TRANSFORM },
        ...(strip.edge > 0 ? [{ stroke: '#fffdf5', width: strip.width + strip.edge * 2, transform: undefined }] : []),
        { stroke: strip.colour, width: strip.width, transform: undefined },
      ].map((layer, i) => (
        <path
          key={i}
          d={d}
          fill="none"
          stroke={layer.stroke}
          strokeWidth={layer.width}
          strokeLinecap="round"
          strokeLinejoin="round"
          transform={layer.transform}
          pathLength={1}
          strokeDasharray="1 1"
          {...stripDash(shown)}
          {...attrs}
        />
      ))}
    </g>
  )
  return (
    <svg
      ref={rootRef}
      className="cv-finale-scene"
      viewBox={`0 0 ${FINALE_STAGE.w} ${FINALE_STAGE.h}`}
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
      data-finale-kind={scene.kind}
    >
      {/* Art at the back is what the line lands on: it goes under everything. */}
      {!scene.carriage.front && figure}
      {scene.fills.map((fill, i) => (
        <g key={i} data-finale-fill="" transform={fillTransform(fill.rise, first.fills[i])} opacity={fill.rise === 0 ? first.fills[i] : undefined}>
          <path d={fill.d} fill={PAPER_SHADOW_FILL} transform="translate(0 -7)" />
          <path d={fill.d} fill={fill.colour} />
        </g>
      ))}
      {scene.hangs.map((d, i) => stripLayers(d, { 'data-finale-hang': i }, first.strokes[0] ?? 0, `hang-${i}`))}
      {scene.strokes.map((d, i) => stripLayers(d, { 'data-finale-stroke': i }, first.strokes[i], `stroke-${i}`))}
      {scene.props.map((prop, i) => (
        <g key={i} data-finale-prop={prop.kind} transform={propTransform(prop, first.props[i])} opacity={first.props[i].opacity}>
          {propDrawing(prop.kind)}
        </g>
      ))}
      {scene.carriage.front && figure}
      {first.snake && (
        <>
          <path data-finale-body="" d={first.snake.d} fill={PAPER_SHADOW_FILL} transform={PAPER_SHADOW_TRANSFORM} />
          <path data-finale-body="" d={first.snake.d} fill="#7fb24a" />
          <path data-finale-stripe="" d={first.snake.stripe} fill="#d9e36a" />
          <g data-finale-head="" transform={headTransform(first.snake)}>
            <path d="M18 0L38 -3L46 -9M38 -3L47 1" fill="none" stroke="#c9483c" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
            <ellipse cx={6} cy={0} rx={26} ry={19} fill="#6aa23c" />
            <circle cx={12} cy={-8} r={6.5} fill="#ffffff" />
            <circle cx={14} cy={-8} r={3.4} fill="#1a2226" />
          </g>
        </>
      )}
    </svg>
  )
}

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false
}

export interface StrokeFinaleProps {
  adventure: Adventure
  beat: ClosingBeat
  scene: FinaleScene
  onDone: () => void
  /** Tests pin it: there is no `matchMedia` to ask under `renderToString`. */
  reducedMotion?: boolean
}

export default function StrokeFinale({ adventure, beat, scene, onDone, reducedMotion }: StrokeFinaleProps) {
  const [calm] = useState(() => reducedMotion ?? prefersReducedMotion())
  const backdrop = backdropFor(adventure.levelIds[adventure.levelIds.length - 1])
  const corner = resolvePulpitoStance(beat.stance).corner
  const octopusRef = useRef<PuppetHandle | null>(null)
  const animalRef = useRef<PuppetHandle | null>(null)
  const cheered = useRef(false)
  const doneRef = useRef(onDone)
  doneRef.current = onDone

  const onFrame = useMemo(() => {
    const homeX = corner === 'left' ? 90 : FINALE_STAGE.w - 90
    const homeY = FINALE_STAGE.h - 120
    return (frame: FinaleFrame): void => {
      const at = frame.snake ? frame.snake.head : ([frame.animal.x, frame.animal.y] as const)
      const look = (dx: number, reach: number): number => Math.max(-1, Math.min(1, dx / reach))
      octopusRef.current?.lookAt(look(at[0] - homeX, 500), look(at[1] - homeY, 400))
      if (frame.cheering && !cheered.current) {
        cheered.current = true
        octopusRef.current?.act('cheer', 2.4)
        animalRef.current?.act('cheer', 2)
      }
    }
  }, [corner])
  const onFinished = useMemo(() => () => doneRef.current(), [])

  return (
    <main className="cv-finale" style={{ backgroundColor: backdrop?.quiet ?? SHEET_PAPER }}>
      <style>{FINALE_CSS + SCENE_CSS}</style>
      {backdrop && <ArtBackdrop className="cv-finale-backdrop" art={backdrop.art} />}
      <button type="button" className="cv-finale-tap" aria-label="Seguir" onClick={() => doneRef.current()}>
        <FinaleSceneView
          scene={scene}
          art={adventure.finale?.art ?? adventureIcon(adventure)}
          reducedMotion={calm}
          onFrame={onFrame}
          onFinished={onFinished}
          animalRef={animalRef}
        />
        <span className="cv-finale-octopus" style={{ [corner]: '2%' }}>
          <ArtImg art={RESCUE_OCTOPUS_ART} still={false} puppetRef={octopusRef} />
        </span>
      </button>
    </main>
  )
}

/** The scene this adventure's closing opens with, if the child left a line. */
export function finaleSceneFor(adventure: Adventure, line: TracedLine | null): FinaleScene | null {
  if (!adventure.finale || !line) return null
  const art = adventure.finale.art ?? adventureIcon(adventure)
  return composeFinale(adventure.finale, line, art.w / art.h)
}

export interface FinaleGateProps {
  adventure: Adventure
  beat: ClosingBeat
  children: ReactNode
}

/** Plays the finale first when there is a line to replay, and otherwise is
 *  invisible: a skip, a deep link or old progress get today's closing. */
export function FinaleGate({ adventure, beat, children }: FinaleGateProps) {
  const [scene] = useState(() => finaleSceneFor(adventure, approvedLineFor(adventure.id)))
  const [done, setDone] = useState(false)
  if (!scene || done) return <>{children}</>
  return <StrokeFinale adventure={adventure} beat={beat} scene={scene} onDone={() => setDone(true)} />
}
