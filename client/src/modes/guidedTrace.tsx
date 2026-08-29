// Mode 1 — guided demo + rail (guided-trace-mode spec, T5.1): the letter's
// `draw_path` animates via framer-motion `pathLength` 0→1 at the timeline
// delay/duration; pointer input is IGNORED while the demo plays (capture
// disabled). After the full timeline — `max(delay + duration) + 200ms` — the
// mode arms the rail: the live stroke must activate every checkpoint in strict
// order (trace-validation), with a rescue hint when the head leaves the ideal
// corridor or a wrong-direction contact occurs. Completing the rail emits
// `onComplete` so the app hands off to free-trace (Mode 2).
import { useCallback, useEffect, useRef, useState } from 'react'
import { checkCheckpointOrder } from '../canvas/validation/checkpoints'
import TraceCanvas, { type DrawDemo } from '../canvas/TraceCanvas'
import type { LetterCheckpoint, LetterConfig, Point } from '../letters/types'

/** One-line rescue guidance; `wrong` marks a direction fault. Free mode reuses it. */
export function RescueHint({ wrong, y = 140 }: { wrong: boolean; y?: number }) {
  return (
    <text x={500} y={y} textAnchor="middle" fontSize={26} fill={wrong ? '#b91c1c' : '#3b82f6'}>
      {wrong ? 'Seguí el orden del trazo' : 'Repasá sobre la guía'}
    </text>
  )
}

export interface GuidedFollow {
  /** Checkpoint orders activated so far, in strict temporal order. */
  activated: number[]
  /** A direction fault was detected — wrong-direction rescue hint. */
  wrongDirection: boolean
  /** The stroke head drifted beyond the rail corridor of the ideal path. */
  offPath: boolean
  /** Every checkpoint activated in order — the rail is complete. */
  complete: boolean
}

function distToCloud(head: Point, cloud: ReadonlyArray<readonly [number, number]>): number {
  let best = Infinity
  for (let i = 0; i < cloud.length; i++) {
    const c = cloud[i]
    const d = Math.hypot(head.x - c[0], head.y - c[1])
    if (d < best) best = d
  }
  return best
}

/**
 * Live rail state over the accumulated stroke (called once per frame while
 * drawing): strict-order activation reuses checkCheckpointOrder, and the rescue
 * condition is the head leaving the letter AREA — min distance to the dense
 * ideal cloud exceeds 70px (a child drawing inside the real glyph body is fine;
 * only a clear drift off the letter shows the hint, spec "Leaves the rail").
 */
export function guidedFollowState(
  points: Point[],
  checkpoints: LetterCheckpoint[],
  ideal: ReadonlyArray<readonly [number, number]>,
): GuidedFollow {
  const order = checkCheckpointOrder(points, checkpoints)
  const head = points[points.length - 1]
  const offPath = head ? distToCloud(head, ideal) > 70 : false
  return {
    activated: order.activated,
    wrongDirection: order.wrongDirection,
    offPath,
    complete: order.orderPassed,
  }
}

export default function GuidedTrace({
  letter,
  onComplete,
  showCheckpoints = false,
}: {
  letter: LetterConfig
  onComplete: () => void
  /** Production overlay toggle from the main screen (dev mode ignores it). */
  showCheckpoints?: boolean
}) {
  // EVERY draw_path step plays: one demo entry per segment with the step's
  // own delay/duration and `properties.d` (falling back to the letter path
  // when a step carries none — the single-letter demo stays unchanged).
  const drawSteps = letter.animationTimeline.filter((s) => s.type === 'draw_path')
  const demos: DrawDemo[] =
    drawSteps.length > 0
      ? drawSteps.map((s) => ({
          d: (s.properties?.d as string | undefined) ?? letter.pathDefinition.d,
          delay: (s.delay ?? 0) / 1000,
          duration: s.duration / 1000,
          strokeWidth: letter.pathDefinition.strokeWidth,
        }))
      : [{ d: letter.pathDefinition.d, delay: 0, duration: 1, strokeWidth: letter.pathDefinition.strokeWidth }]
  // Ready when the FULL timeline has finished: max(delay+duration) + 200ms.
  const readyMs = Math.max(0, ...letter.animationTimeline.map((s) => (s.delay ?? 0) + s.duration)) + 200
  const [phase, setPhase] = useState<'demo' | 'ready'>('demo')
  const [hint, setHint] = useState<null | 'outside' | 'wrong'>(null)
  const [drawing, setDrawing] = useState(false)
  const completed = useRef(false)
  const ideal = letter.pathDefinition.ideal

  useEffect(() => {
    const t = window.setTimeout(() => setPhase('ready'), readyMs)
    return () => window.clearTimeout(t)
  }, [readyMs])

  const onFrame = useCallback(
    (points: Point[], isDrawing: boolean) => {
      setDrawing(isDrawing)
      if (!isDrawing) {
        setHint(null)
        return
      }
      if (phase !== 'ready' || completed.current) return
      const s = guidedFollowState(points, letter.pathDefinition.checkpoints, ideal)
      if (s.complete) {
        completed.current = true
        onComplete()
        return
      }
      const next = s.wrongDirection ? 'wrong' : s.offPath ? 'outside' : null
      setHint((prev) => (prev === next ? prev : next))
    },
    [phase, onComplete, letter, ideal],
  )

  return (
    <TraceCanvas
      demo={demos}
      enabled={phase === 'ready'}
      guide={letter.pathDefinition.d}
      guideD={letter.pathDefinition.guideD}
      onFrame={onFrame}
      devCheckpoints={letter.pathDefinition.checkpoints}
      devIdeal={letter.pathDefinition.ideal}
      showCheckpoints={showCheckpoints}
    >
      {phase === 'demo' && (
        <text x={500} y={90} textAnchor="middle" fontSize={26} fill="#334155">
          Observá el trazo
        </text>
      )}
      {phase === 'ready' && hint && <RescueHint wrong={hint === 'wrong'} />}
      {phase === 'ready' && !hint && !drawing && (
        <text x={500} y={90} textAnchor="middle" fontSize={26} fill="#334155">
          Seguí la guía
        </text>
      )}
    </TraceCanvas>
  )
}