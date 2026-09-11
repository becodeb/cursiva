// LevelConfig → LevelTarget derivation (docs/08 section 2, "De LevelConfig el
// motor DERIVA en tiempo de carga"). Pure and deterministic: the same config
// and width factor always produce the same target, so a level is data and the
// engine never changes.
//
//   ideal        banda densa de puntos a ±corridorWidth/2 del camino
//   checkpoints  N puntos ordenados por longitud de arco, N = clamp(round(L/90), 6, 12)
//   radius       proporcional al espaciado, acotado a [35, 60]
//
// The ideal band follows `buildLetterConfig`'s banding approach verbatim
// (svgLetter.ts step 8: dense centreline + a perpendicular offset pair per
// sample, rounded to 1 decimal) so the area-cloud scoring semantics are
// IDENTICAL for a maze path and for a letter. Only the half-width differs: a
// letter bands at a fixed ±8px, a level bands at its corridor.
import { resample } from '../canvas/resample'
import {
  flattenPathD,
  generateCheckpoints,
  polylineLength,
  transformPathD,
} from '../letters/svgLetter'
import type { LetterCheckpoint, Point } from '../letters/types'
import type { LevelConfig, LevelTarget, Taper } from './types'

/** Narrowest / widest corridor the engine will ever score against, in viewBox px. */
export const MIN_CORRIDOR = 30
export const MAX_CORRIDOR = 260

/** Centreline samples per path for the ideal cloud (mirrors buildLetterConfig). */
const IDEAL_SAMPLES = 600
/** Centreline samples per path for arc-length checkpoint placement. */
const CHECKPOINT_SAMPLES = 400
/**
 * The band sits `6px` inside the corridor edge so a trace exactly on the wall
 * still reads as inside; never below 4px, or a hair-thin corridor would score
 * like a centreline.
 */
const BAND_INSET = 6
const MIN_BAND = 4

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v))
}

/** Round to 1 decimal — the checkpoint / ideal precision of the letter pipeline. */
function round1(n: number): number {
  return Math.round(n * 10) / 10
}

/**
 * Perpendicular band around a dense centreline: the centre point plus the two
 * points at `±band` along the local normal, estimated from the neighbouring
 * samples (same estimator as `buildLetterConfig`).
 */
function pushBand(
  into: Array<readonly [number, number]>,
  centre: Point[],
  band: number,
  taper?: Taper,
): void {
  const last = Math.max(1, centre.length - 1)
  for (let i = 0; i < centre.length; i++) {
    const prev = centre[Math.max(0, i - 1)]
    const next = centre[Math.min(centre.length - 1, i + 1)]
    const dx = next.x - prev.x
    const dy = next.y - prev.y
    const len = Math.hypot(dx, dy) || 1
    const nx = -dy / len
    const ny = dx / len
    // `centre` is resampled to EQUIDISTANT points, so `i / last` is the
    // ARC-LENGTH position along the route — which is what "the path narrows as
    // you advance" has to mean. Using the sample index on a raw polyline would
    // narrow fastest wherever the flattener happened to be dense.
    const half = taper
      ? Math.max(MIN_BAND, band * (taper.from + (taper.to - taper.from) * (i / last)))
      : band
    const c = centre[i]
    into.push([round1(c.x), round1(c.y)])
    into.push([round1(c.x + nx * half), round1(c.y + ny * half)])
    into.push([round1(c.x - nx * half), round1(c.y - ny * half)])
  }
}

/** Default viewBox width (docs/02 section 3). The HEIGHT is always 600. */
export const MIN_VIEWBOX_WIDTH = 1000
/**
 * Blank paper kept on each side of the level's bounding box. 80 units clears
 * the r=22 start marker with room to spare, so the one instruction a
 * guide-less level gives ("empezá desde el punto verde") is never half cut off
 * by the edge of the sheet.
 */
const VIEWBOX_MARGIN = 80

/**
 * Lay a level out on its sheet: pick the sheet WIDTH, then centre the paths on
 * it.
 *
 * `buildWord` composes letters left to right from the first letter's own
 * origin, so a two- or four-letter level drifts right; `mama` reached x=1326
 * and ran clean off the default sheet. Centring alone is not enough either —
 * `mama` is 988 units wide, so on a 1000-wide sheet it touches both edges and
 * clips the start marker.
 *
 * So the sheet GROWS for a long word: `max(1000, ceil(span + 2·80))`. That is
 * what a real ruled notebook does — a longer word gets more line, not smaller
 * letters. The scaling is exactly what must NOT happen: the ruled-line
 * proportions (docs/02 section 3) are pedagogy — an ascender must reach y=180
 * and rest on y=420 — so the height is fixed, Y is never touched, and the
 * transform is a pure X TRANSLATION. Path coordinates keep their units, so the
 * ideal cloud and every score are unchanged.
 *
 * A level with no flattenable geometry gets the default sheet and its paths
 * untouched: there is no bounding box to centre, and the derivation downstream
 * already degrades safely.
 */
function layOutPaths(paths: string[]): { paths: string[]; viewBoxWidth: number } {
  let minX = Infinity
  let maxX = -Infinity
  for (const d of paths) {
    for (const p of flattenPathD(d).points) {
      if (p.x < minX) minX = p.x
      if (p.x > maxX) maxX = p.x
    }
  }
  if (!Number.isFinite(minX) || !Number.isFinite(maxX)) {
    return { paths, viewBoxWidth: MIN_VIEWBOX_WIDTH }
  }
  const viewBoxWidth = Math.max(
    MIN_VIEWBOX_WIDTH,
    Math.ceil(maxX - minX + 2 * VIEWBOX_MARGIN),
  )
  const tx = viewBoxWidth / 2 - (minX + maxX) / 2
  return { paths: paths.map((d) => transformPathD(d, 1, 1, tx, 0)), viewBoxWidth }
}

/**
 * Derive the runtime target of a level.
 *
 * `widthFactor` is the adaptive-tolerance multiplier (docs/03 section 4): the
 * declared `corridorWidth` is a starting point, not a fixed value, and the
 * effective width is clamped to `[30, 260]` so neither three failures nor three
 * passes can push a level outside a traceable range.
 *
 * The paths are LAID OUT first (see {@link layOutPaths}) and every derived
 * field comes from the centred copy, so what the screen draws and what the
 * engine scores can never disagree.
 *
 * `paths[0]` is the MAIN path — it alone provides `polyline` and `length` (the
 * start marker and direction arrow live on it). Any further entry is a PEN-LIFT
 * segment (a letter's dot or crossbar): it contributes its own checkpoints,
 * numbered AFTER the main ones so the order stays strictly 1..N across the
 * whole level, and its own band to the ideal cloud.
 */
export function buildLevelTarget(config: LevelConfig, widthFactor?: number): LevelTarget {
  const corridorWidth = clamp(
    config.corridorWidth * (widthFactor ?? 1),
    MIN_CORRIDOR,
    MAX_CORRIDOR,
  )
  const band = Math.max(MIN_BAND, corridorWidth / 2 - BAND_INSET)

  // A `free` level (docs/08 section 5) has no target at all: no route to be
  // near, no order to respect, nothing to lay out. It gets an EMPTY target on
  // the default sheet rather than a degenerate one, and `evaluateLevel` scores
  // it on coverage instead of accuracy. Returning early is what keeps every
  // derivation below free of "if there is a path" branches.
  if (config.kind === 'free' || config.paths.length === 0) {
    return {
      config,
      paths: [],
      viewBoxWidth: MIN_VIEWBOX_WIDTH,
      corridorWidth,
      ideal: [],
      checkpoints: [],
      polyline: [],
      length: 0,
    }
  }

  const { paths, viewBoxWidth } = layOutPaths(config.paths)
  const polyline = flattenPathD(paths[0] ?? '').points
  const length = polylineLength(polyline)

  // Main checkpoints, uniform in ARC LENGTH over the resampled centreline.
  const checkpoints: LetterCheckpoint[] =
    polyline.length >= 2 && length > 0
      ? generateCheckpoints(resample(polyline, CHECKPOINT_SAMPLES), length)
      : []

  const ideal: Array<readonly [number, number]> = []
  for (let i = 0; i < paths.length; i++) {
    const points = i === 0 ? polyline : flattenPathD(paths[i]).points
    if (points.length < 2) continue
    const centre = resample(points, IDEAL_SAMPLES)
    if (centre.length === 0) continue
    // The taper describes the LEVEL's route, so it applies to the main path;
    // a pen-lift secondary (a dot, a crossbar) is not a stretch of that route
    // and keeps the nominal width.
    pushBand(ideal, centre, band, i === 0 ? config.taper : undefined)

    // Pen-lift segments continue the SAME numbering: a stroke is still
    // validated as one ordered journey, dot included.
    if (i > 0) {
      const segLength = polylineLength(points)
      if (segLength <= 0) continue
      const segCheckpoints = generateCheckpoints(
        resample(points, CHECKPOINT_SAMPLES),
        segLength,
      )
      for (const cp of segCheckpoints) {
        const order = checkpoints.length + 1
        checkpoints.push({ ...cp, order, name: `paso_${order}` })
      }
    }
  }

  return { config, paths, viewBoxWidth, corridorWidth, ideal, checkpoints, polyline, length }
}
