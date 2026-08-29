// Ink rendering (trace-canvas "Ink Rendering", T3.3): CENTERLINE polyline.
// The captured `Point[]` is emitted as an open `M…L…` stroke — RENDER-ONLY,
// never mutated (spec "Rendering is display-only…").
//
// Why a centerline stroke instead of the previous perfect-freehand polygon:
// a thick filled polygon self-intersects where the stroke doubles back on
// itself, and the fill rule leaves visible "unfill" holes at those crossings.
// A stroke (fill="none") has no interior to fill, so a doubled-back trace
// stays solid with no holes. See ink.test.ts for the centerline contract.
import type { Point } from '../letters/types'

export interface InkOptions {
  /** Stroke diameter in viewBox units (default 12). */
  size?: number
  /** Taper toward the ends (0 = none, 1 = full). */
  thinning?: number
  /** Outline smoothing (0–1) and streamline (point reduction) strength (0–1). */
  smoothing?: number
  streamline?: number
}

/** A centerline vertex, as carried straight from the captured points. */
export type InkPoint = [number, number]

/**
 * Return the captured points as a centerline polyline (render-only). The
 * points are copied out as `[x, y]` tuples but NEVER mutated: downstream
 * evaluation (e.g. release scoring) reuses the untouched `Point[]`. `options`
 * is accepted for signature compatibility but the centerline render ignores it.
 */
export function traceInk(points: readonly Point[], _options: InkOptions = {}): InkPoint[] {
  return points.map((p) => [p.x, p.y] as InkPoint)
}

const round2 = (n: number): number => Math.round(n * 100) / 100

/** SVG `d` for a centerline polyline: `M` first vertex, `L` the rest. NO `Z` —
 * an open stroke cannot self-intersect-fill, so doubled-back ink stays solid. */
export function inkPath(polyline: readonly InkPoint[]): string {
  if (polyline.length === 0) return ''
  return polyline.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${round2(x)} ${round2(y)}`).join(' ')
}
