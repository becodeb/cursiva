// Drawing surface (trace-canvas "Viewport and Ruled Lines", T3.5): a fixed
// normalized SVG viewBox `0 0 1000 600` with full-width guides at Y=180 and
// Y=420 (sky 0–180 / grass 180–420 / roots 420–600), pointer capture into
// normalized `Point[]` (useTraceInput), and rAF-driven perfect-freehand ink.
//
// 60fps strategy (design.md): points live in a ref and the ink `<path>` is
// mutated once per frame — no setState per move, no resample during drawing.
// The `Z`-closed ink polygon is the only per-frame cost (sub-ms at capture
// sizes). Evaluation happens at release time in the U6 modes.
//
// U6 modes hooks: the surface is shared by the guided mode (animated `demo`,
// capture `enabled` gating while the demo plays, live `onFrame` rail feed,
// and an overlay `children` slot for the rescue hints). Free mode later adds
// the faint guide + release/start callbacks (work unit 6b).
import { useEffect, useRef, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { inkPath, traceInk } from './ink'
import { useTraceInput, type TracePoint } from './useTraceInput'

const VIEWBOX = '0 0 1000 600'
const SKY_GUIDE_Y = 180
const BASELINE_Y = 420

/** Animated draw demo: framer-motion `pathLength` 0→1, times in seconds. */
export interface DrawDemo {
  d: string
  delay: number
  duration: number
  strokeWidth: number
}

export interface TraceCanvasProps {
  /** Animated draw demo (guided mode) — input is ignored until it ends. */
  demo?: DrawDemo
  /** False ignores pointer input entirely (guided demo phase). */
  enabled?: boolean
  /** Called each frame with the live capture (guided rail tracking). */
  onFrame?: (points: TracePoint[], drawing: boolean) => void
  /** Extra SVG children — rescue hints / feedback overlays. */
  children?: ReactNode
}

export default function TraceCanvas({
  demo,
  enabled = true,
  onFrame,
  children,
}: TraceCanvasProps) {
  const svgRef = useRef<SVGSVGElement | null>(null)
  const inkRef = useRef<SVGPathElement | null>(null)
  const drawingRef = useRef(false)
  const { bind, pointsRef, isDrawing } = useTraceInput(svgRef, { enabled })
  useEffect(() => {
    drawingRef.current = isDrawing // mirror so the frame-loop closure never reads stale state
  }, [isDrawing])

  useEffect(() => {
    const path = inkRef.current
    if (!path) return
    let raf = 0
    let lastD = ''
    const frame = (): void => {
      const points = pointsRef.current
      if (points.length === 0) {
        // Stroke ended or cancelled: clear the ink (spec "pointercancel clears").
        if (lastD !== '') {
          lastD = ''
          path.setAttribute('d', '')
        }
      } else {
        const d = inkPath(traceInk(points))
        if (d !== lastD) {
          lastD = d
          path.setAttribute('d', d)
        }
      }
      onFrame?.(pointsRef.current, drawingRef.current)
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [pointsRef, onFrame])

  return (
    <svg
      ref={svgRef}
      viewBox={VIEWBOX}
      width="100%"
      style={{
        touchAction: 'none', // spec: pointer events must not scroll/zoom the page
        display: 'block',
        cursor: isDrawing ? 'crosshair' : 'default',
        background: '#fdfcf7',
        borderRadius: 12,
      }}
      aria-label="Trace surface: draw the letter between the sky and grass guides"
      {...bind}
    >
      <line x1={0} y1={SKY_GUIDE_Y} x2={1000} y2={SKY_GUIDE_Y} stroke="#94a3b8" strokeWidth={2} strokeDasharray="12 8" />
      <line x1={0} y1={BASELINE_Y} x2={1000} y2={BASELINE_Y} stroke="#64748b" strokeWidth={3} strokeDasharray="18 8" />
      {demo && (
        <motion.path
          d={demo.d}
          fill="none"
          stroke="#0284c7"
          strokeWidth={demo.strokeWidth}
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ delay: demo.delay, duration: demo.duration }}
          pointerEvents="none"
        />
      )}
      <path ref={inkRef} fill="#1e293b" stroke="none" />
      {children}
    </svg>
  )
}
