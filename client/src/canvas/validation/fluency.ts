// Fluency pillar (docs/02 section 5.3) — the metric that does not exist in the
// base trace engine, and the reason this app can tell WRITING from DRAWING:
//
//   levantamientos = cantidad de trazos usados − trazos permitidos por el nivel
//   regularidad    = 1 − coeficiente de variación de la velocidad entre muestras
//   Fluidez        = clamp(100 · regularidad − 25 · levantamientos, 0, 100)
//
// "Un trazo con precisión 95 y fluidez 30 es un chico DIBUJANDO la letra a
// tirones. Sin esta métrica, la app lo aprobaría y estaría reforzando el
// problema que vino a resolver."
//
// Pure and DOM-free: it reads only the captured point list, so it runs under
// vitest in node like every other pillar.
import type { TracePoint } from '../useTraceInput'

export interface FluencyResult {
  /** 0-100 (integer): was it one continuous, evenly-paced movement? */
  fluency: number
  /** Pen lifts BEYOND what the level allows. 0 when the level allows lifts. */
  extraLifts: number
}

/** A stroke shorter than this contributes no usable speed samples. */
const MIN_STROKE_POINTS = 3
/** Cost in fluency points of each pen lift beyond the level's allowance. */
const LIFT_COST = 25

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v))
}

/**
 * Score the fluency of an attempt.
 *
 * `strokes` are the captured strokes in temporal order; `allowedStrokes` is how
 * many the level permits (1 for a `mustBeContinuous` level, otherwise however
 * many were used, which makes `extraLifts` 0 by construction).
 *
 * Speed of sample `i` is `distance(p[i−1], p[i]) / max(1, t[i] − t[i−1])`.
 * `TracePoint.t` is the capture timestamp in ms; when the browser or a test
 * omits it, `dt` falls back to 1 and the metric degrades gracefully into
 * SPACING regularity — still a meaningful signal, because a 60fps capture
 * samples at a near-constant rate, so even spacing means even speed.
 *
 * Zero-length steps (a finger resting between events) carry no speed
 * information and are ignored rather than counted as a stop, which would
 * punish a child for the browser's event rate.
 */
export function fluencyScore(
  strokes: ReadonlyArray<ReadonlyArray<TracePoint>>,
  allowedStrokes: number,
): FluencyResult {
  const extraLifts = Math.max(0, strokes.length - allowedStrokes)

  // Concatenate every USABLE stroke: a 1-2 point stroke (a tap, a stray dot)
  // has no movement to measure and contributes nothing.
  const samples: TracePoint[] = []
  for (const stroke of strokes) {
    if (stroke.length < MIN_STROKE_POINTS) continue
    for (const p of stroke) samples.push(p)
  }
  if (samples.length < MIN_STROKE_POINTS) return { fluency: 0, extraLifts }

  const speeds: number[] = []
  for (let i = 1; i < samples.length; i++) {
    const prev = samples[i - 1]
    const curr = samples[i]
    const distance = Math.hypot(curr.x - prev.x, curr.y - prev.y)
    if (distance === 0) continue // resting finger: no speed information
    const dt =
      typeof curr.t === 'number' && typeof prev.t === 'number' ? Math.max(1, curr.t - prev.t) : 1
    speeds.push(distance / dt)
  }
  if (speeds.length < 2) return { fluency: 0, extraLifts }

  const mean = speeds.reduce((a, b) => a + b, 0) / speeds.length
  if (mean <= 0) return { fluency: 0, extraLifts }
  const variance = speeds.reduce((acc, s) => acc + (s - mean) ** 2, 0) / speeds.length
  const coefficientOfVariation = Math.sqrt(variance) / mean

  // CV is unbounded above (one violent jerk among slow samples can exceed 1),
  // so regularity is clamped rather than allowed to go negative and swamp the
  // lift term.
  const regularity = clamp(1 - coefficientOfVariation, 0, 1)
  const fluency = clamp(100 * regularity - LIFT_COST * extraLifts, 0, 100)
  return { fluency: Math.round(fluency), extraLifts }
}
