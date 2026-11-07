// Simulated strokes for scoring tests: what a finger plausibly does along a real
// level, at a chosen device event rate. Deterministic. These stand in for children
// and tablets only as far as a simulation can; `docs/25` 4.1 still asks for both.
import type { TracePoint } from '../canvas/useTraceInput'
import { evenlyAlongArc } from '../canvas/validation/fluency'
import type { Point } from '../letters/types'

/** Gaps between reported events, in ms, repeating. */
export const EVENT_RATES: Readonly<Record<string, readonly number[]>> = {
  '60 Hz': [16.7],
  '120 Hz': [8.3],
  '30 Hz with drops': [33, 33, 66, 33, 100, 33],
  'bursty delivery': [4, 4, 40, 4, 4, 60],
}

function seeded(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

interface Timed extends Point {
  /** ms since the stroke began. */
  readonly ms: number
}

/** The line as a device reporting at `gaps` would deliver it. */
export function reportAt(line: readonly Timed[], gaps: readonly number[]): TracePoint[] {
  const out: TracePoint[] = []
  const end = line[line.length - 1].ms
  let k = 0
  let ms = 0
  for (let i = 0; ms < end; i++) {
    while (k + 2 < line.length && line[k + 1].ms < ms) k++
    const a = line[k]
    const b = line[k + 1]
    const f = b.ms > a.ms ? (ms - a.ms) / (b.ms - a.ms) : 0
    out.push({ x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f, t: ms })
    ms += gaps[i % gaps.length]
  }
  const last = line[line.length - 1]
  out.push({ x: last.x, y: last.y, t: end })
  return out
}

/** Offsets `route` along its normal, at `speed` units per second, with optional rests. */
function walk(
  route: readonly Point[],
  offset: (arc: number) => number,
  speed: (arc: number) => number,
  rests: ReadonlyArray<{ readonly at: number; readonly ms: number }> = [],
): Timed[] {
  const step = 4
  const even = evenlyAlongArc(route, step)
  const out: Timed[] = []
  let ms = 0
  let nextRest = 0
  for (let i = 0; i < even.length; i++) {
    const arc = i * step
    const prev = even[Math.max(0, i - 1)]
    const next = even[Math.min(even.length - 1, i + 1)]
    const dx = next.x - prev.x
    const dy = next.y - prev.y
    const len = Math.hypot(dx, dy) || 1
    const o = offset(arc)
    out.push({ x: even[i].x - (dy / len) * o, y: even[i].y + (dx / len) * o, ms })
    if (nextRest < rests.length && arc >= rests[nextRest].at) {
      ms += rests[nextRest].ms
      out.push({ x: out[out.length - 1].x, y: out[out.length - 1].y, ms })
      nextRest++
    }
    ms += (step / speed(arc)) * 1000
  }
  return out
}

function routeLength(route: readonly Point[]): number {
  return evenlyAlongArc(route, 4).length * 4
}

/** The route at an unhurried, even pace. */
export function cleanLine(route: readonly Point[]): Timed[] {
  return walk(route, () => 0, () => 220)
}

/**
 * A clean stroke from a small hand: slow, drifting up to `drift` units off the
 * line, a fine tremor on top, a pace that wanders, and two rests along the way.
 * Still the right letter, in the right direction, in one go.
 */
export function wobblyFiveYearOldLine(route: readonly Point[], seed = 7, drift = 11): Timed[] {
  const random = seeded(seed)
  const phases = [random() * 6.28, random() * 6.28, random() * 6.28]
  const length = routeLength(route)
  return walk(
    route,
    (arc) =>
      Math.sin(arc / 34 + phases[0]) * drift * 0.7 +
      Math.sin(arc / 15 + phases[1]) * drift * 0.3 +
      Math.sin(arc / 4.5 + phases[2]) * 1.6,
    (arc) => 130 + 55 * Math.sin(arc / 42 + phases[2]),
    [
      { at: length * 0.3, ms: 260 },
      { at: length * 0.7, ms: 340 },
    ],
  )
}

/** `docs/25` P1-1's stroke: follows the route in order, even pace, swinging
 *  `amplitude` units to each side. */
export function zigzagLine(route: readonly Point[], amplitude = 55, wavelength = 60): Timed[] {
  return walk(
    route,
    (arc) => {
      const phase = (arc % wavelength) / wavelength
      return amplitude * (phase < 0.5 ? 4 * phase - 1 : 3 - 4 * phase)
    },
    () => 90,
  )
}
