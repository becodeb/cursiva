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
import { useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent, RefObject } from 'react'
import type { Point } from '../letters/types'

type TracePointsRef = RefObject<TracePoint[]>

/** Captured centerline point; `pressure` is carried through when the browser provides it. */
export type TracePoint = Point & { pressure?: number }

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
  /** True between `pointerdown` and `pointerup`/`pointercancel`. */
  isDrawing: boolean
}

export interface UseTraceInputOptions {
  /** False ignores ALL pointer input (demo phase of guided mode). */
  enabled?: boolean
}

export function useTraceInput(svgRef: RefObject<SVGSVGElement | null>, options: UseTraceInputOptions = {}): TraceInput {
  const pointsRef = useRef<TracePoint[]>([])
  const activePointerId = useRef<number | null>(null)
  const moved = useRef(false)
  const [isDrawing, setIsDrawing] = useState(false)

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
    pointsRef.current = [p]
    setIsDrawing(true)
  }

  const moveStroke = (e: ReactPointerEvent<SVGSVGElement>): void => {
    if (e.pointerId !== activePointerId.current) return // non-active pointer ignored
    const svg = svgRef.current
    if (!svg) return
    const p = screenToViewBox(svg, e.clientX, e.clientY)
    if (p) {
      pointsRef.current.push(p)
      moved.current = true
    }
  }

  const endStroke = (e: ReactPointerEvent<SVGSVGElement>): void => {
    if (e.pointerId !== activePointerId.current) return
    const svg = svgRef.current
    if (svg?.hasPointerCapture(e.pointerId)) svg.releasePointerCapture(e.pointerId)
    activePointerId.current = null
    // Tap (no movement): nothing to evaluate — clear so no ink remains.
    // Moved stroke: STAYS captured so its ink survives release.
    if (!moved.current) pointsRef.current = []
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
    isDrawing,
  }
}