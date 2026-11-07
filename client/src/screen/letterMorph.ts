// The gesture becoming the letter (`docs/25` P1-2: "el niño nunca ve ese gesto
// convertirse en letra"). Two lines, each read evenly along its arc so the morph
// walks them together, and one number between them. Pure, and it knows nothing of
// time or React; `screen/LetterMorph.tsx` runs the clock.
import { evenlyAlongArc } from '../canvas/validation/fluency'
import type { Point } from '../letters/types'

export const MORPH_POINTS = 120

export const MORPH_TIMING = {
  /** The child's own line, alone, long enough to be recognised. */
  holdLineS: 1.2,
  morphS: 2.6,
  /** The letter, long enough to be read as the same thing. */
  holdLetterS: 1.6,
} as const

export const MORPH_TOTAL_S = MORPH_TIMING.holdLineS + MORPH_TIMING.morphS + MORPH_TIMING.holdLetterS

function totalLength(points: readonly Point[]): number {
  let total = 0
  for (let i = 1; i < points.length; i++) total += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y)
  return total
}

/** Exactly `n` points equally spaced along the line, the last one its end. */
export function sampleLine(points: readonly Point[], n: number): Point[] {
  if (points.length === 0) return []
  const length = totalLength(points)
  if (length === 0) return Array.from({ length: n }, () => points[0])
  const even = evenlyAlongArc(points, length / (n - 1))
  const out = even.slice(0, n)
  while (out.length < n) out.push(points[points.length - 1])
  out[n - 1] = points[points.length - 1]
  return out
}

/** The first `fraction` of a line, by arc: one gesture out of a run of them. */
export function partOfLine(points: readonly Point[], fraction: number): Point[] {
  if (fraction >= 1 || points.length < 2) return [...points]
  const wanted = totalLength(points) * Math.max(0, fraction)
  const out: Point[] = [points[0]]
  let walked = 0
  for (let i = 1; i < points.length; i++) {
    const span = Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y)
    if (walked + span >= wanted) {
      const f = span > 0 ? (wanted - walked) / span : 0
      out.push({ x: points[i - 1].x + (points[i].x - points[i - 1].x) * f, y: points[i - 1].y + (points[i].y - points[i - 1].y) * f })
      return out
    }
    walked += span
    out.push(points[i])
  }
  return out
}

interface Box {
  x: number
  y: number
  width: number
  height: number
}

export function boxOf(points: readonly Point[]): Box {
  const xs = points.map((p) => p.x)
  const ys = points.map((p) => p.y)
  const x = Math.min(...xs)
  const y = Math.min(...ys)
  return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y }
}

/** The line in the middle of `box`, kept in proportion: the child's wobble is
 *  theirs, so it is scaled and never straightened. */
export function fitLine(points: readonly Point[], box: Box): Point[] {
  const from = boxOf(points)
  const scale = Math.min(from.width > 0 ? box.width / from.width : 1, from.height > 0 ? box.height / from.height : 1)
  const fromX = from.x + from.width / 2
  const fromY = from.y + from.height / 2
  const toX = box.x + box.width / 2
  const toY = box.y + box.height / 2
  return points.map((p) => ({ x: toX + (p.x - fromX) * scale, y: toY + (p.y - fromY) * scale }))
}

/** Slow out, slow in: the moment of change is the middle, not the edges. */
function ease(t: number): number {
  return t * t * (3 - 2 * t)
}

/** How far along the morph at `seconds`, 0 the line and 1 the letter. */
export function morphAmount(seconds: number): number {
  const t = (seconds - MORPH_TIMING.holdLineS) / MORPH_TIMING.morphS
  return ease(Math.max(0, Math.min(1, t)))
}

/** One frame of the line, as a path. Both lines hold the same point count. */
export function morphPath(from: readonly Point[], to: readonly Point[], amount: number): string {
  let d = ''
  for (let i = 0; i < from.length; i++) {
    const x = from[i].x + (to[i].x - from[i].x) * amount
    const y = from[i].y + (to[i].y - from[i].y) * amount
    d += `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`
  }
  return d
}
