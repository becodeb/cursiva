// Where the route ENDS (docs/03 §7). Pure geometry, no DOM and no React, like
// `directionArrow` beside it: the marks a pre-reader navigates by are exactly
// the kind of thing that must be testable without a browser (docs/02 §1).
//
// Why this exists: every path level said where to START and nothing about where
// to FINISH. A maze with no visible destination is a squiggle — knowing where
// you are heading is what makes the route a planning task instead of a tracing
// task, which is the whole point of fase 1 (docs/01).
import { flattenPathD } from '../letters/svgLetter'
import type { Point } from '../letters/types'
import type { LevelTarget } from '../levels/types'

/**
 * Last point of the level's route, or `undefined` when there is no route at all
 * (a `kind: 'free'` level has no paths, so it gets no goal — see `LevelPlay`).
 *
 * It reads the LAST entry of `target.paths`, not `target.polyline`. The
 * polyline is only ever the MAIN path (`buildLevel`: "`paths[0]` is the MAIN
 * path — it alone provides `polyline`"), so on a multi-segment word the
 * polyline ends where the FIRST segment ends, which is nowhere near where the
 * child stops writing.
 *
 * `target.paths` is used rather than `config.paths` for the same reason the
 * corridor uses it: those are the horizontally-centred copies the engine scores
 * against, so the goal lands on the route actually drawn.
 */
export function goalMarkerOf(target: LevelTarget): Point | undefined {
  for (let i = target.paths.length - 1; i >= 0; i--) {
    const points = flattenPathD(target.paths[i]).points
    const last = points[points.length - 1]
    if (last) return { x: last.x, y: last.y }
  }
  // A single path too short to flatten still has a polyline in some fixtures.
  const fallback = target.polyline[target.polyline.length - 1]
  return fallback ? { x: fallback.x, y: fallback.y } : undefined
}
