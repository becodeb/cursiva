// Local corridor-wall distance (`detective-mode` defect fix: "the corridor
// walls do nothing"). The live off-path test (`LevelPlay.tsx`'s `onFrame`)
// used to measure the fingertip against the NEAREST point of the whole ideal
// cloud (`neighbourhoodNearest` over `buildIdealGrid`). That is wrong for any
// path that doubles back on itself — a maze wave, a spiral — because stepping
// off one arm of the route can land the fingertip closer to a NEIGHBOURING
// arm than to the local stretch the child is actually walking, so the
// measured distance is not even monotonic in how far outside the corridor the
// finger really is (`trail1`, corridor half-width 45: a trace 180 units off
// the centreline measured 6.6, well inside the wall).
//
// The fix is to measure against the LOCAL stretch of `target.polyline`
// instead of the whole cloud, and to make "local" cheap by tracking the
// child's progress along the route and only searching a window around it —
// a child walks a trail start to end, so a forward-biased local search is
// both correct and cheap. Same pattern as `canvas/resetOnContact.ts`'s
// `contactTick`: pure, DOM-free, the caller (`LevelPlay`) owns the ref that
// carries the track between samples.
import type { Point } from '../letters/types'
import type { RouteSegment } from '../levels/types'

/**
 * How far AHEAD of the tracked position the window still searches, in
 * arc-length units. Generous against a single sample's travel — even at a
 * brisk trace (a few hundred px/s) a ~33ms sample advances well under this —
 * but short of a full loop of `trail2`'s spiral, so the window cannot lock
 * onto the wrong revolution.
 */
export const CORRIDOR_WINDOW_FORWARD = 260

/**
 * How far BEHIND the tracked position the window still searches, so a
 * fingertip that wobbles back half a step is still measured against the SAME
 * local stretch instead of snapping onto whatever else happens to be nearby.
 */
export const CORRIDOR_WINDOW_BACK = 150

/** The child's progress along `target.polyline`, carried between samples. */
export interface CorridorTrack {
  /** Arc-length position along the polyline the local window is centred on. */
  readonly arc: number
  /**
   * The FURTHEST arc position reached this run — `arc`'s running maximum.
   *
   * `arc` alone cannot answer "how far have I got?", and deliberately so: the
   * search window reaches {@link CORRIDOR_WINDOW_BACK} units BEHIND the tracked
   * position precisely so a wobbling fingertip keeps being measured against the
   * same local stretch, which means `arc` slides backwards by up to 150 units
   * whenever it does. That is right for the wall check and useless for progress
   * — a child who jitters in place would watch their progress oscillate.
   *
   * This lives in the track rather than in a sibling ref for one reason: a
   * second ref is a second thing to reset, and the two places a run starts over
   * (`LevelPlay`'s `resetSurface` and `restartRun`) already restore
   * {@link CORRIDOR_TRACK_START}. Hanging progress off the same object makes
   * "progress resets exactly when the run does" true by construction instead of
   * by two call sites remembering to agree.
   *
   * It advances on EVERY sample, including one taken while the fingertip is
   * outside the corridor. That is not a loophole: on a detective trail leaving
   * the corridor restarts the run and wipes this value, and the clue channel is
   * separately gated on being inside (`LevelPlay`'s `shouldTickClue`), so an
   * excursion can neither bank progress nor light a mark.
   */
  readonly maxArc: number
}

/** The track a fresh run starts in: the very beginning of the route, with no
 * progress banked. */
export const CORRIDOR_TRACK_START: CorridorTrack = { arc: 0, maxArc: 0 }

/** One sample's result: the local wall distance, and the advanced track. */
export interface CorridorSample {
  /** Perpendicular distance from (x, y) to the local stretch of the
   * polyline, or `Infinity` when there is no route to measure against. */
  readonly distance: number
  readonly track: CorridorTrack
}

/**
 * Fold one fingertip position into the corridor track: the perpendicular
 * distance to the local stretch of `polyline` around `track.arc`, plus the
 * track advanced to the closest point found (so the NEXT sample's window
 * follows the child rather than staying pinned at the start).
 *
 * `polyline` is walked once per call, computing each segment's arc-length
 * span as it goes — no separate cumulative-length array to keep in sync,
 * and cheap at the catalog's polyline sizes (well under 300 points) at a
 * ~30 Hz sampling rate.
 */
export function corridorTick(
  polyline: readonly Point[],
  length: number,
  track: CorridorTrack,
  x: number,
  y: number,
): CorridorSample {
  if (polyline.length < 2 || length <= 0) return { distance: Infinity, track }
  const advanced = (arc: number): CorridorTrack => ({
    arc,
    maxArc: Math.max(track.maxArc, arc),
  })

  const centre = Math.max(0, Math.min(length, track.arc))
  const lo = Math.max(0, centre - CORRIDOR_WINDOW_BACK)
  const hi = Math.min(length, centre + CORRIDOR_WINDOW_FORWARD)

  let bestDistance = Infinity
  let bestArc = centre
  let acc = 0
  for (let i = 1; i < polyline.length; i++) {
    const a = polyline[i - 1]
    const b = polyline[i]
    const segLen = Math.hypot(b.x - a.x, b.y - a.y)
    const segStart = acc
    acc += segLen
    if (segLen <= 0) continue
    // Segment entirely outside the window: skip it without projecting.
    if (acc < lo || segStart > hi) continue
    const t = Math.max(
      0,
      Math.min(1, ((x - a.x) * (b.x - a.x) + (y - a.y) * (b.y - a.y)) / (segLen * segLen)),
    )
    const px = a.x + (b.x - a.x) * t
    const py = a.y + (b.y - a.y) * t
    const d = Math.hypot(x - px, y - py)
    if (d < bestDistance) {
      bestDistance = d
      bestArc = segStart + t * segLen
    }
  }
  // The window found nothing (a degenerate polyline, or a track past the
  // end): fall back to the un-advanced centre rather than losing the track.
  return { distance: bestDistance, track: advanced(bestDistance === Infinity ? centre : bestArc) }
}

/**
 * Amendment A2 (design.md §4): `buildLevelTarget` derives `polyline`/`length`
 * from `paths[0]` alone, so a level whose `paths` holds more than one route
 * (every snake level) had its live wall-contact feedback computed against
 * the FIRST route only — `LevelPlay.tsx`'s own header already recorded the
 * gap ("A future multi-path level … would need `corridorTick` extended to
 * search every path"). One track per route, carried between samples.
 */
export interface RouteTrack {
  readonly tracks: readonly CorridorTrack[]
}

/** The track a fresh run starts in: `n` routes, none of them visited. */
export function routeTrackStart(n: number): RouteTrack {
  return { tracks: Array.from({ length: n }, () => CORRIDOR_TRACK_START) }
}

/**
 * The nearest of several DISJOINT routes, and the track advanced on that one
 * alone. DELEGATES to {@link corridorTick} once per route — one body, not
 * two — so a single-route call returns `corridorTick`'s own
 * `{distance, track}` unchanged (asserted point for point over the shipped
 * `trail1`/`trail2` fixtures, `corridorTrack.test.ts`). That bit-identity is
 * what keeps every shipped level's wall feedback exactly what it is today.
 *
 * Taking the minimum across routes is correct ONLY because the routes are
 * farther apart than the corridor is wide (`catalog.test.ts`'s C3, asserted
 * for the snake family). Without that separation a fingertip between two
 * arms could be claimed by the wrong route — the same failure the windowed
 * search above already exists to prevent WITHIN a route.
 */
export function multiCorridorTick(
  routes: readonly RouteSegment[],
  track: RouteTrack,
  x: number,
  y: number,
): { distance: number; track: RouteTrack; active: number } {
  let bestDistance = Infinity
  let bestActive = 0
  let bestSample: CorridorSample | undefined
  const samples = routes.map((route, i) =>
    corridorTick(route.polyline, route.length, track.tracks[i] ?? CORRIDOR_TRACK_START, x, y),
  )
  for (let i = 0; i < samples.length; i++) {
    if (samples[i].distance < bestDistance) {
      bestDistance = samples[i].distance
      bestActive = i
      bestSample = samples[i]
    }
  }
  const tracks = track.tracks.map((t, i) => (i === bestActive ? (samples[i]?.track ?? t) : t))
  return { distance: bestSample?.distance ?? Infinity, track: { tracks }, active: bestActive }
}
