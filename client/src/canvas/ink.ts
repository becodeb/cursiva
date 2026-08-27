// Ink rendering (trace-canvas "Ink Rendering", T3.3): perfect-freehand
// `getStroke` is the ONLY ink source. RENDER-ONLY contract: the captured
// `Point[]` is never mutated (spec "Rendering is display-only…").
import { getStroke } from 'perfect-freehand'
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

/** A stroke outline vertex, as produced by perfect-freehand. */
export type InkPoint = [number, number]

/**
 * Compute the stroke polygon outlining the captured centerline. The output
 * is a ribbon whose two sides meet at the caps; `inkPath` closes it with
 * `Z` so the fill renders as one closed polygon (spec scenario).
 *
 * `streamline` defaults to 0 (perfect-freehand's default is 0.5): the
 * streamliner low-pass-filters the centerline away from sharp peaks, which
 * would betray the finger on a letter-tracing surface; `smoothing` still
 * polishes. Rendering is display-only — the captured points are never
 * mutated, so U6's release evaluation reuses the untouched `Point[]`.
 */
export function traceInk(points: readonly Point[], options: InkOptions = {}): InkPoint[] {
  // perfect-freehand declares a mutable input type; the cast is safe — the
  // render-only contract holds (neither this module nor perfect-freehand
  // mutates the captured points).
  return getStroke(points as unknown as Parameters<typeof getStroke>[0], {
    size: options.size ?? 12,
    thinning: options.thinning ?? 0.6,
    smoothing: options.smoothing ?? 0.5,
    streamline: options.streamline ?? 0,
    simulatePressure: true,
  }) as InkPoint[]
}

const round2 = (n: number): number => Math.round(n * 100) / 100

/** SVG `d` for a stroke polygon: `M` first vertex, `L` the rest, `Z` close. */
export function inkPath(polygon: readonly InkPoint[]): string {
  if (polygon.length === 0) return ''
  return polygon.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${round2(x)} ${round2(y)}`).join(' ') + ' Z'
}