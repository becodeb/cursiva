// Small drawing helpers shared by the cast, so a body stays a few lines of numbers.
import { ell, fmt, polyline, smoothClosed, tangentAt, type Vec } from '../geometry'
import type { ClusterShape } from '../rig'

/** A soft closed shape through these points: most bodies are one of these. */
export const blob = (...points: readonly Vec[]): string => smoothClosed(points)

/** A cloud: round lobes around an ellipse, plus its filling. Stacked as one
 *  cluster, so the whole cloud casts a single paper shadow. */
export function cloud(cx: number, cy: number, rx: number, ry: number, lobes: number, r: number, c: string, part?: string, phase = 0): ClusterShape[] {
  const shapes: ClusterShape[] = [{ d: ell(cx, cy, rx, ry), c, part }]
  for (let i = 0; i < lobes; i++) {
    const a = phase + (i / lobes) * Math.PI * 2
    const big = i % 2 === 0 ? 1 : 0.86
    shapes.push({ d: ell(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry, r * big, r * big), c, part })
  }
  return shapes
}

/** A width that eases between `[s, w]` stops: how a tube gets a melon or a neck. */
export function widthProfile(stops: readonly (readonly [number, number])[]): (s: number) => number {
  return (s) => {
    for (let i = 1; i < stops.length; i++) {
      if (s <= stops[i][0]) {
        const u = (s - stops[i - 1][0]) / (stops[i][0] - stops[i - 1][0])
        const e = u * u * (3 - 2 * u)
        return stops[i - 1][1] + (stops[i][1] - stops[i - 1][1]) * e
      }
    }
    return stops[stops.length - 1][1]
  }
}

/** A point `off` units to the belly or back side of a spine, for fins and faces. */
export function beside(pts: readonly Vec[], i: number, off: number): Vec {
  const th = tangentAt(pts, i)
  return [pts[i][0] + Math.sin(th) * off, pts[i][1] - Math.cos(th) * off]
}

/** One band along a spine, between two offsets: a belly, or a stripe down a side. */
export function sideBand(pts: readonly Vec[], from: number, to: number, outer: (s: number) => number, inner: (s: number) => number): string {
  const out: Vec[] = []
  const back: Vec[] = []
  for (let i = from; i <= to; i++) {
    const s = i / (pts.length - 1)
    out.push(beside(pts, i, outer(s)))
    back.push(beside(pts, i, inner(s)))
  }
  return polyline([...out, ...back.reverse()], true)
}

/** One quadratic stroke: creases, gills, curls of wool. */
export const line = (x1: number, y1: number, cx: number, cy: number, x2: number, y2: number): string =>
  `M${fmt(x1)} ${fmt(y1)}Q${fmt(cx)} ${fmt(cy)} ${fmt(x2)} ${fmt(y2)}`


/** A limb as one soft tube: a shoulder, a hand, and how far the elbow sags to one side. */
export function limbPoints(from: Vec, to: Vec, sag: number, n = 12): Vec[] {
  const mx = (from[0] + to[0]) / 2
  const my = (from[1] + to[1]) / 2
  const len = Math.hypot(to[0] - from[0], to[1] - from[1]) || 1
  const cx = mx + (-(to[1] - from[1]) / len) * sag
  const cy = my + ((to[0] - from[0]) / len) * sag
  const pts: Vec[] = []
  for (let i = 0; i <= n; i++) {
    const t = i / n
    const u = 1 - t
    pts.push([u * u * from[0] + 2 * u * t * cx + t * t * to[0], u * u * from[1] + 2 * u * t * cy + t * t * to[1]])
  }
  return pts
}

export const mix = (a: Vec, b: Vec, t: number): Vec => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]
