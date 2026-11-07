// Small drawing helpers shared by the cast, so a body stays a few lines of numbers.
import { ell, fmt, polyline, smoothClosed, tangentAt, type Vec } from '../geometry'
import type { ClusterShape, DynamicPath } from '../rig'

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

/** A tiny "z" pair would need text: sleep is shown by lids and posture only. */
export const line = (x1: number, y1: number, cx: number, cy: number, x2: number, y2: number): string =>
  `M${fmt(x1)} ${fmt(y1)}Q${fmt(cx)} ${fmt(cy)} ${fmt(x2)} ${fmt(y2)}`

export type { DynamicPath }
