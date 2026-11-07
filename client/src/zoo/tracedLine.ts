// The child's own approved stroke, kept as a small list of points ("your stroke
// is the drawing"). Simplified and normalized, never smoothed and never pulled
// toward the model path: the wobble is the point, because it is what makes the
// water, the shell or the liana recognisably theirs.
//
// Pure functions plus a little storage, following `zoo/stars.ts` (module-scope
// session memory) and `screen/notebookDiscovery.ts` (a storage-shaped parameter,
// every access in `try`). Nothing here can throw at the screen that called it.
import type { AdventureId } from './adventures'

export type TracedPoint = readonly [number, number]

export interface TracedLine {
  readonly levelId: string
  /** Extent of the drawing once normalized: the longer side is always 1. */
  readonly w: number
  readonly h: number
  /** In drawing order, each point in [0, w] x [0, h]. */
  readonly strokes: readonly (readonly TracedPoint[])[]
}

export interface RawPoint {
  readonly x: number
  readonly y: number
}

export const TRACED_LINES_KEY = 'cursiva.trazos.v1'
/** Across every stroke of one line: what keeps a record near 1.5 kB. */
export const MAX_TRACED_POINTS = 120
/** Far under what a five-year-old's wobble measures on a drawing this size. */
const SIMPLIFY_TOLERANCE = 0.005
const COORD_FACTOR = 1000

function perpendicularDistance(p: TracedPoint, a: TracedPoint, b: TracedPoint): number {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const span = Math.hypot(dx, dy)
  if (span === 0) return Math.hypot(p[0] - a[0], p[1] - a[1])
  return Math.abs(dy * p[0] - dx * p[1] + b[0] * a[1] - b[1] * a[0]) / span
}

/** Ramer-Douglas-Peucker: every point it keeps is one the finger really passed. */
export function simplifyPoints(points: readonly TracedPoint[], tolerance: number): TracedPoint[] {
  if (points.length <= 2) return points.slice()
  const keep = new Array<boolean>(points.length).fill(false)
  keep[0] = true
  keep[points.length - 1] = true
  const stack: [number, number][] = [[0, points.length - 1]]
  while (stack.length > 0) {
    const [from, to] = stack.pop()!
    let worst = -1
    let worstAt = -1
    for (let i = from + 1; i < to; i++) {
      const d = perpendicularDistance(points[i], points[from], points[to])
      if (d > worst) {
        worst = d
        worstAt = i
      }
    }
    if (worst > tolerance) {
      keep[worstAt] = true
      stack.push([from, worstAt], [worstAt, to])
    }
  }
  return points.filter((_, i) => keep[i])
}

const countPoints = (strokes: readonly (readonly TracedPoint[])[]): number =>
  strokes.reduce((sum, s) => sum + s.length, 0)

const round = (v: number): number => Math.round(v * COORD_FACTOR) / COORD_FACTOR

/** The real strokes as a bounded `TracedLine`, or `null` when there is nothing
 *  drawn worth replaying: no stroke, a single dot, a non-finite coordinate. */
export function toTracedLine(levelId: string, raw: readonly (readonly RawPoint[])[]): TracedLine | null {
  const strokes = raw.filter((s) => s.length >= 2)
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const stroke of strokes) {
    for (const p of stroke) {
      if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) return null
      minX = Math.min(minX, p.x)
      minY = Math.min(minY, p.y)
      maxX = Math.max(maxX, p.x)
      maxY = Math.max(maxY, p.y)
    }
  }
  const span = Math.max(maxX - minX, maxY - minY)
  if (!(span > 0)) return null
  const normalized = strokes.map((s) => s.map((p): TracedPoint => [(p.x - minX) / span, (p.y - minY) / span]))
  let tolerance = SIMPLIFY_TOLERANCE
  let simplified = normalized.map((s) => simplifyPoints(s, tolerance))
  while (countPoints(simplified) > MAX_TRACED_POINTS) {
    tolerance *= 1.4
    simplified = normalized.map((s) => simplifyPoints(s, tolerance))
  }
  return {
    levelId,
    w: round((maxX - minX) / span),
    h: round((maxY - minY) / span),
    strokes: simplified.map((s) => s.map((p): TracedPoint => [round(p[0]), round(p[1])])),
  }
}

function toPoint(raw: unknown): TracedPoint | null {
  if (!Array.isArray(raw) || raw.length !== 2) return null
  const [x, y] = raw as unknown[]
  return typeof x === 'number' && typeof y === 'number' && Number.isFinite(x) && Number.isFinite(y) ? [x, y] : null
}

/** One stored entry, whole or not at all: half a child's line is not their line. */
export function parseTracedLine(raw: unknown): TracedLine | null {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null
  const { levelId, w, h, strokes } = raw as Record<string, unknown>
  if (typeof levelId !== 'string' || typeof w !== 'number' || typeof h !== 'number') return null
  if (!Number.isFinite(w) || !Number.isFinite(h) || w < 0 || h < 0 || w > 1 || h > 1) return null
  if (!Array.isArray(strokes) || strokes.length === 0) return null
  const parsed: TracedPoint[][] = []
  for (const stroke of strokes) {
    if (!Array.isArray(stroke) || stroke.length < 2) return null
    const points: TracedPoint[] = []
    for (const item of stroke) {
      const point = toPoint(item)
      if (!point) return null
      points.push(point)
    }
    parsed.push(points)
  }
  if (countPoints(parsed) > MAX_TRACED_POINTS) return null
  return { levelId, w, h, strokes: parsed }
}

export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

function browserStorage(): StorageLike | null {
  try {
    if (typeof window === 'undefined') return null
    return window.localStorage ?? null
  } catch {
    return null
  }
}

/** Every stored line, by adventure: the keepsake the map can show one day. A
 *  corrupt entry is dropped alone, the others survive it. */
export function loadTracedLines(storage: StorageLike | null = browserStorage()): Partial<Record<AdventureId, TracedLine>> {
  const out: Partial<Record<AdventureId, TracedLine>> = {}
  try {
    const raw = storage?.getItem(TRACED_LINES_KEY)
    if (!raw) return out
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return out
    for (const [id, entry] of Object.entries(parsed)) {
      const line = parseTracedLine(entry)
      if (line) out[id as AdventureId] = line
    }
  } catch {
    // Corrupt or unavailable: the same as no record.
  }
  return out
}

export function saveTracedLine(
  adventure: AdventureId,
  line: TracedLine,
  storage: StorageLike | null = browserStorage(),
): void {
  try {
    const all = loadTracedLines(storage)
    all[adventure] = line
    storage?.setItem(TRACED_LINES_KEY, JSON.stringify(all))
  } catch {
    // A full quota loses a keepsake, never a level.
  }
}

/** This session's lines: the closing still has its line in a private tab. */
const sessionLines = new Map<AdventureId, TracedLine>()

/** Call when a level is approved, with its real strokes. */
export function recordApprovedStroke(
  adventure: AdventureId,
  levelId: string,
  strokes: readonly (readonly RawPoint[])[],
  storage: StorageLike | null = browserStorage(),
): void {
  const line = toTracedLine(levelId, strokes)
  if (!line) return
  sessionLines.set(adventure, line)
  saveTracedLine(adventure, line, storage)
}

/** The line a closing replays. `null` (a skip, a deep link, progress older than
 *  this feature) simply means today's closing with no finale. */
export function approvedLineFor(
  adventure: AdventureId,
  storage: StorageLike | null = browserStorage(),
): TracedLine | null {
  return sessionLines.get(adventure) ?? loadTracedLines(storage)[adventure] ?? null
}

/** Tests only: session memory outlives a test the way it outlives a screen. */
export function forgetSessionLines(): void {
  sessionLines.clear()
}
