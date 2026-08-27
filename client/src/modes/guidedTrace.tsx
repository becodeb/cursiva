// Mode 1 — guided demo + rail (guided-trace-mode spec, T5.1): the letter's
// `draw_path` animates via framer-motion `pathLength` 0→1 at the timeline
// delay/duration; pointer input is IGNORED while the demo plays (capture
// disabled). After the full timeline — `max(delay + duration) + 200ms` — the
// mode arms the rail: the live stroke must activate every checkpoint in strict
// order (trace-validation), with a rescue hint when the head leaves the ideal
// corridor or a wrong-direction contact occurs. Completing the rail emits
// `onComplete` so the app hands off to free-trace (Mode 2).
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { checkCheckpointOrder } from '../canvas/validation/checkpoints'
import { samplePath } from '../canvas/resample'
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

function dist(a: Point, b: Point): number {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return Math.hypot(dx, dy)
}

/**
 * Live rail state over the accumulated stroke (called once per frame while
 * drawing): strict-order activation reuses checkCheckpointOrder, and the
 * rescue condition is the head leaving the corridor around the ideal path —
 * corridor radius = widest checkpoint tolerance + 10px slack, so a passable
 * trace never nags and a real drift shows the hint (spec "Leaves the rail").
 */
export function guidedFollowState(
  points: Point[],
  checkpoints: LetterCheckpoint[],
  ideal: Point[],
): GuidedFollow {
  const order = checkCheckpointOrder(points, checkpoints)
  const head = points[points.length - 1]
  let offPath = false
  if (head) {
    const tol = Math.max(...checkpoints.map((c) => c.radius)) + 10
    let best = Infinity
    for (const p of ideal) best = Math.min(best, dist(head, p))
    offPath = best > tol
  }
  return {
    activated: order.activated,
    wrongDirection: order.wrongDirection,
    offPath,
    complete: order.orderPassed,
  }
}

export default function GuidedTrace({ letter, onComplete }: { letter: LetterConfig; onComplete: () => void }) {
  const draw = letter.animationTimeline.find((s) => s.type === 'draw_path')
  const demo: DrawDemo = {
    d: letter.pathDefinition.d,
    delay: (draw?.delay ?? 0) / 1000,
    duration: (draw?.duration ?? 1000) / 1000,
    strokeWidth: letter.pathDefinition.strokeWidth,
  }
  // Ready when the FULL timeline has finished: max(delay+duration) + 200ms.
  const readyMs = Math.max(0, ...letter.animationTimeline.map((s) => (s.delay ?? 0) + s.duration)) + 200
  const [phase, setPhase] = useState<'demo' | 'ready'>('demo')
  const [hint, setHint] = useState<null | 'outside' | 'wrong'>(null)
  const [drawing, setDrawing] = useState(false)
  const completed = useRef(false)
  const ideal = useMemo(() => samplePath(letter.pathDefinition.d), [letter])

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
    <TraceCanvas demo={demo} enabled={phase === 'ready'} onFrame={onFrame}>
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