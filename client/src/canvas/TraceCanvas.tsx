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
// U6 modes hooks: the surface is shared by guided (animated `demo`, capture
// `enabled` gating while the demo plays, live `onFrame` rail feed) and free
// (faint `guide`, single-release `onRelease`, `onStart` clean retry, and an
// overlay `children` slot for the star/rescue feedback).
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { inkPath, traceInk } from './ink'
import { useTraceInput, type TracePoint } from './useTraceInput'
import { isDevMode } from './devMode'
import { devCheckpointState, type DevCheckpointState } from './devCheckpointState'
import { DevCheckpointOverlay } from './devCheckpointOverlay'
import type { LetterCheckpoint } from '../letters/types'

const VIEWBOX = '0 0 1000 600'
const SKY_GUIDE_Y = 180
const MIDDLE_GUIDE_Y = 300
const BASELINE_Y = 420

/** Animated draw demo: framer-motion `pathLength` 0→1, times in seconds. */
export interface DrawDemo {
  d: string
  delay: number
  duration: number
  strokeWidth: number
}

export interface TraceCanvasProps {
  /** Faint ideal-path guide line drawn under the ink (free mode). */
  guide?: string
  /** Full glyph contour (incl. counter-holes) for the evenodd FILL layer of
   * the guide (a real cursive 'a'/'c' shape the child can see and follow). */
  guideD?: string
  /** Animated draw demo (guided mode) — input is ignored until it ends. */
  demo?: DrawDemo
  /** False ignores pointer input entirely (guided demo phase). */
  enabled?: boolean
  /** Called when a NEW stroke begins (modes clear the previous feedback). */
  onStart?: () => void
  /** Called each frame with the live capture (guided rail feed). */
  onFrame?: (points: TracePoint[], drawing: boolean) => void
  /** Called exactly once per moved-stroke release (single evaluation). */
  onRelease?: (points: TracePoint[], pointerType: string) => void
  /** Extra SVG children — rescue hints / star feedback overlays. */
  children?: ReactNode
  /** DEV overlay: checkpoints to visualize (lit in activation order). */
  devCheckpoints?: LetterCheckpoint[]
  /** DEV overlay: dense ideal cloud used for the approximate distance score. */
  devIdeal?: ReadonlyArray<readonly [number, number]>
  /** Render the checkpoint overlay outside dev mode too (main-screen toggle).
   * Default false — the dev gate stays unchanged. */
  showCheckpoints?: boolean
}

export default function TraceCanvas({
  guide,
  guideD,
  demo,
  enabled = true,
  onStart,
  onFrame,
  onRelease,
  children,
  devCheckpoints,
  devIdeal,
  showCheckpoints = false,
}: TraceCanvasProps) {
  const svgRef = useRef<SVGSVGElement | null>(null)
  const inkRef = useRef<SVGPathElement | null>(null)
  const drawingRef = useRef(false)
  const { bind, pointsRef, isDrawing } = useTraceInput(svgRef, { enabled, onStart, onEnd: onRelease })
  useEffect(() => {
    drawingRef.current = isDrawing // mirror so the frame-loop closure never reads stale state
  }, [isDrawing])

  // DEV overlay state. Computed live inside the rAF loop but THROTTLED (~10Hz
  // and only when the stroke length changed) so it never competes with the
  // 60fps ink loop for setState. Enabled by dev mode OR the production toggle
  // (trace-canvas "Checkpoint Overlay Gate"), and only with both props set.
  const devOn = (isDevMode() || showCheckpoints) && !!devCheckpoints && !!devIdeal
  const [devState, setDevState] = useState<DevCheckpointState | null>(null)
  const devCPRef = useRef(devCheckpoints)
  const devIdealRef = useRef(devIdeal)
  const devOnRef = useRef(devOn)
  const lastLenRef = useRef(-1)
  const lastTimeRef = useRef(0)
  devCPRef.current = devCheckpoints
  devIdealRef.current = devIdeal
  devOnRef.current = devOn

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
      if (devOnRef.current && devCPRef.current && devIdealRef.current) {
        const now = performance.now()
        if (points.length !== lastLenRef.current || now - lastTimeRef.current >= 100) {
          lastLenRef.current = points.length
          lastTimeRef.current = now
          setDevState(devCheckpointState(points, devCPRef.current, devIdealRef.current))
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
      <line x1={0} y1={MIDDLE_GUIDE_Y} x2={1000} y2={MIDDLE_GUIDE_Y} stroke="#0ea5e9" strokeWidth={2.5} strokeDasharray="14 6" opacity={0.55} />
      <line x1={0} y1={BASELINE_Y} x2={1000} y2={BASELINE_Y} stroke="#64748b" strokeWidth={3} strokeDasharray="18 8" />
      {guideD && (
        <path
          d={guideD}
          fill="#334155"
          fillRule="evenodd"
          opacity={0.06}
          pointerEvents="none" // the guide never intercepts pointer input
        />
      )}
      {guide && (
        <path
          d={guide}
          fill="none"
          stroke="#334155"
          strokeWidth={10}
          opacity={0.15}
          pointerEvents="none" // the guide never intercepts pointer input
        />
      )}
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
      <path
        ref={inkRef}
        fill="none"
        stroke="#1e293b"
        strokeWidth={18}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {children}
      {devOn && devState && devCheckpoints && devIdeal && (
        <DevCheckpointOverlay
          checkpoints={devCheckpoints}
          state={devState}
          showScore={isDevMode()}
        />
      )}
    </svg>
  )
}
