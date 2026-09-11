// Pointer capture hook (trace-canvas "Pointer Capture and Normalization",
// T3.4). Screen points map into viewBox space via the INVERSE screen CTM
// (`getScreenCTM().inverse()`); naive clientX/clientY scaling is FORBIDDEN
// (spec). Exactly one active stroke: a second `pointerdown` is ignored
// (multi-pointer deferred); `pointercancel` discards stroke and ink.
//
// 60fps strategy (design.md): points accumulate in a ref — NO setState per
// move; the canvas rAF loop re-inks once per frame. A pointerup without
// movement is a tap — buffer emptied, nothing evaluated; a moved stroke
// persists so its ink survives release (modes own clearing later).
//
// Level engine (docs/08 §3 "Fluidez — levantamientos + regularidad de
// velocidad"): every captured point carries a `t` capture timestamp so the
// fluency pillar can measure pacing, and `multiStroke` lets a level accept
// several strokes (a pen lift is DATA, not a failure — the fluency penalty is
// applied by the evaluator, never by refusing the input).
import { useCallback, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent, RefObject } from 'react'
import type { Point } from '../letters/types'

type TracePointsRef = RefObject<TracePoint[]>
type TraceStrokesRef = RefObject<TracePoint[][]>

/**
 * Captured centerline point; `pressure` is carried through when the browser
 * provides it, and `t` is the `performance.now()` capture timestamp (optional
 * so pure geometry callers and fixtures stay unaffected).
 */
export type TracePoint = Point & { pressure?: number; t?: number }

/**
 * Image of a screen point under an inverted screen CTM (SVG affine
 * row-vector convention: x' = a·x + c·y + e, y' = b·x + d·y + f).
 * Pure so the normalization math is unit-testable without a DOM.
 */
export function canvasPoint(
  x: number,
  y: number,
  a: number,
  b: number,
  c: number,
  d: number,
  e: number,
  f: number,
): Point {
  return { x: a * x + c * y + e, y: b * x + d * y + f }
}

function screenToViewBox(svg: SVGSVGElement, x: number, y: number): Point | null {
  const ctm = svg.getScreenCTM()
  if (!ctm) return null // not in a rendered document
  const inv = ctm.inverse()
  return canvasPoint(x, y, inv.a, inv.b, inv.c, inv.d, inv.e, inv.f)
}

export interface TraceInputBinding {
  onPointerDown: (e: ReactPointerEvent<SVGSVGElement>) => void
  onPointerMove: (e: ReactPointerEvent<SVGSVGElement>) => void
  onPointerUp: (e: ReactPointerEvent<SVGSVGElement>) => void
  onPointerCancel: (e: ReactPointerEvent<SVGSVGElement>) => void
}

export interface TraceInput {
  /** Handlers to spread on the `<svg>` surface. */
  bind: TraceInputBinding
  /** Live capture buffer (renderers read it in their rAF loop); `[]` when no stroke is active. */
  pointsRef: TracePointsRef
  /** Completed strokes (multi-stroke levels); always `[]` when `multiStroke` is off. */
  strokesRef: TraceStrokesRef
  /** Empties BOTH the completed-stroke buffer and the live buffer ("Borrar"). */
  clearStrokes: () => void
  /**
   * Abandon the stroke in progress the way `pointercancel` does, from code:
   * capture is released, both buffers are emptied and `onEnd` does NOT fire.
   *
   * This is what `resetOnContact` needs (docs/01 principle 2). Clearing the
   * buffers alone would leave the pointer ACTIVE, so the very next `pointermove`
   * would start re-inking from wherever the finger already is — on top of the
   * wall it just touched, which would trip the rule again immediately. Dropping
   * the pointer instead means the run genuinely restarts: the child lifts and
   * presses again on the green dot.
   */
  abortStroke: () => void
  /** True between `pointerdown` and `pointerup`/`pointercancel`. */
  isDrawing: boolean
}

export interface UseTraceInputOptions {
  /** False ignores ALL pointer input (demo phase of guided mode). */
  enabled?: boolean
  /** Called when a NEW stroke begins, after the buffer is reset (modes clear feedback). */
  onStart?: () => void
  /**
   * Called exactly once per moved-stroke release. `strokes` is the full
   * completed-stroke list INCLUDING the stroke just released — additive, so
   * existing single-stroke callers keep their two-argument signature.
   */
  onEnd?: (points: TracePoint[], pointerType: string, strokes: TracePoint[][]) => void
  /**
   * True lets the child lift the finger and keep going: each released stroke is
   * pushed onto `strokesRef` and the live buffer is emptied for the next one.
   * Default false keeps the single-stroke behavior bit-identical.
   */
  multiStroke?: boolean
}

export function useTraceInput(svgRef: RefObject<SVGSVGElement | null>, options: UseTraceInputOptions = {}): TraceInput {
  const pointsRef = useRef<TracePoint[]>([])
  const strokesRef = useRef<TracePoint[][]>([])
  const activePointerId = useRef<number | null>(null)
  const moved = useRef(false)
  const [isDrawing, setIsDrawing] = useState(false)

  // Stable across renders (it only touches refs) so callers can depend on it.
  const clearStrokes = useCallback((): void => {
    strokesRef.current = []
    pointsRef.current = []
  }, [])

  // Same teardown as `pointercancel`, but reachable from code. Nulling the
  // active pointer id is the load-bearing part: `moveStroke` and `endStroke`
  // both gate on it, so the finger still on the glass is ignored until it lifts
  // and presses again — and `onEnd` never fires, so an abandoned run is never
  // evaluated as an attempt.
  const abortStroke = useCallback((): void => {
    const svg = svgRef.current
    const id = activePointerId.current
    if (id !== null && svg?.hasPointerCapture(id)) svg.releasePointerCapture(id)
    activePointerId.current = null
    moved.current = false
    pointsRef.current = []
    strokesRef.current = []
    setIsDrawing(false)
  }, [svgRef])

  const startStroke = (e: ReactPointerEvent<SVGSVGElement>): void => {
    // Primary pointer only: a second finger (non-primary) or a stroke
    // already in progress is ignored (spec "Primary Pointer Only").
    if (!e.isPrimary || activePointerId.current !== null) return
    if (options.enabled === false) return
    if (e.pointerType === 'mouse' && e.button !== 0) return // left button only
    const svg = svgRef.current
    if (!svg) return
    const p = screenToViewBox(svg, e.clientX, e.clientY)
    if (!p) return
    svg.setPointerCapture(e.pointerId)
    activePointerId.current = e.pointerId
    moved.current = false
    pointsRef.current = [{ ...p, t: performance.now() }] // docs/08 §3: pacing feeds the fluency pillar
    options.onStart?.() // buffer is fresh — modes clear the previous feedback here
    setIsDrawing(true)
  }

  const moveStroke = (e: ReactPointerEvent<SVGSVGElement>): void => {
    if (e.pointerId !== activePointerId.current) return // non-active pointer ignored
    const svg = svgRef.current
    if (!svg) return
    const p = screenToViewBox(svg, e.clientX, e.clientY)
    if (p) {
      pointsRef.current.push({ ...p, t: performance.now() })
      moved.current = true
    }
  }

  const endStroke = (e: ReactPointerEvent<SVGSVGElement>): void => {
    if (e.pointerId !== activePointerId.current) return
    const svg = svgRef.current
    if (svg?.hasPointerCapture(e.pointerId)) svg.releasePointerCapture(e.pointerId)
    activePointerId.current = null
    // Tap (no movement): nothing to evaluate — clear so no ink remains.
    // Moved stroke: single-stroke mode KEEPS it captured so its ink survives
    // release; multi-stroke mode files it into `strokesRef` and empties the
    // live buffer so the next lift-and-continue stroke starts clean. Either
    // way the evaluation callback fires exactly once per released stroke.
    if (!moved.current) {
      pointsRef.current = []
    } else if (options.multiStroke === true) {
      const released = pointsRef.current
      strokesRef.current = [...strokesRef.current, released]
      pointsRef.current = []
      options.onEnd?.(released, e.pointerType, strokesRef.current)
    } else {
      options.onEnd?.(pointsRef.current, e.pointerType, [pointsRef.current])
    }
    setIsDrawing(false)
  }

  const cancelStroke = (e: ReactPointerEvent<SVGSVGElement>): void => {
    if (e.pointerId !== activePointerId.current) return
    const svg = svgRef.current
    if (svg?.hasPointerCapture(e.pointerId)) svg.releasePointerCapture(e.pointerId)
    activePointerId.current = null
    pointsRef.current = [] // discard the stroke AND its ink (spec scenario)
    setIsDrawing(false)
  }

  return {
    bind: {
      onPointerDown: startStroke,
      onPointerMove: moveStroke,
      onPointerUp: endStroke,
      onPointerCancel: cancelStroke,
    },
    pointsRef,
    strokesRef,
    clearStrokes,
    abortStroke,
    isDrawing,
  }
}