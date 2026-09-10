// Clue placement and collection reducer (`detective-mode` design unit 2,
// spec: detective-mode "Clue Collection State Machine"). Pure and DOM-free —
// no React, no storage, no import from TraceCanvas — following the same
// pattern as `canvas/resetOnContact.ts`'s `contactTick` and
// `screen/GameScreen.tsx`'s `nextView`: the screen owns the clock and the
// pointer sample, this module owns the decision.
import { indexAtDistance, tangentAngleAt } from '../screen/directionArrow'
import { pointAtArcLength } from '../letters/svgLetter'
import type { Point } from '../letters/types'
import type { ClueKind } from './assets'

/**
 * Arc-length span (in sheet units) used for the finite-difference tangent at
 * each mark, mirroring `screen/directionArrow.ts`'s `TANGENT_SPAN_UNITS` (not
 * exported there, so this is the same value re-declared, not re-imported).
 */
const TANGENT_SPAN_UNITS = 25

/** How far, in sheet units, an alternating footprint mark sits off the
 * centreline (see `clueMarks`'s footprint branch below). Small relative to
 * every trail's corridor half-width (35-45 in the catalog), so a footprint
 * never reads as off the route even on the narrowest trail. */
const FOOTPRINT_OFFSET = 10

/**
 * One clue mark's fixed placement along a trail: where it sits, which way it
 * faces, and which clue art it draws — so registry art (`detective/assets.ts`)
 * can be positioned with `translate(x,y) rotate(angle)` and no offset
 * arithmetic, the same convention `screen/directionArrow.ts`'s
 * `DirectionArrow` already uses.
 *
 * `kind` was omitted in the S1 slice that first shipped this type, because
 * `ClueKind` lives in `detective/assets.ts` (design unit 3), which had not
 * been created yet. It exists now, so `kind` is populated here.
 */
export interface ClueMark {
  x: number
  y: number
  angle: number
  kind: ClueKind
}

/**
 * A trail's clue-mark collection state: `lit[i]` is whether mark `i` has been
 * earned. Deliberately just booleans — no tween, delay or easing field, ever
 * (spec scenario "No motion while the pointer is down"; D5, `docs/05:14`):
 * the shape of the type is itself the guarantee, not a rule enforced
 * elsewhere.
 */
export interface ClueState {
  readonly lit: readonly boolean[]
}

/** All `count` marks `drained` — the state a trail's run starts in. */
export function emptyClueState(count: number): ClueState {
  return { lit: Array.from({ length: Math.max(0, count) }, () => false) }
}

/**
 * Place `count` clue marks evenly BY ARC LENGTH along `polyline` (total
 * length `length`), at fractions `(i + 1) / (count + 1)` — strictly INTERIOR,
 * so five marks land at 1/6 through 5/6 and none at an endpoint. `count <= 1`
 * places at most one mark, at the midpoint.
 *
 * This differs on purpose from `generateCheckpoints`' `i / (count - 1)`
 * convention in `letters/svgLetter.ts`. A checkpoint is an invisible scoring
 * zone and wants the endpoints; a clue mark is drawn and collected, and at the
 * endpoints it is both invisible — the start marker and the goal marker cover
 * it — and pointless, since one is earned on touch-down and the other is
 * redundant with finishing the trail.
 *
 * Position comes from {@link pointAtArcLength} (`letters/svgLetter.ts`); the
 * facing angle reuses the exact tangent helpers `screen/directionArrow.ts`'s
 * `directionArrowOf` is built from (`indexAtDistance` + `tangentAngleAt`) —
 * `directionArrowOf` itself is not callable here because it takes a full
 * `LevelTarget`, not a bare polyline, so this composes its two underlying
 * pure functions directly instead of reimplementing the tangent math.
 *
 * `kind` is one value shared by every mark this call produces — a trail owns
 * exactly one clue kind (design.md "Colour Asset Registry") — so it is a
 * so a caller that has not yet been updated to pass its trail's real kind
 * (e.g. the S1-era 11 tests in `clues.test.ts`, none of which assert
 * `.kind`) still compiles and still gets a fully-typed `ClueMark`, rather
 * than a compile error or a missing field. The real per-trail kind is wired
 * by the catalog (design unit 9, a later slice), which is expected to call
 * this with its own trail's kind explicitly.
 */
/**
 * Marks-per-trail derived from arc length rather than an authored fixed
 * count (defect fix: "far more clue marks; the trail must look walked-on" —
 * a fixed count read sparse on a long trail and crowded on a short one; the
 * user's reference is a trail densely covered in marks, "como si fuesen las
 * huellas de un animal caminando", not five widely-spaced pickups).
 *
 * {@link clueMarks} places `count` marks at `(i + 1) / (count + 1)` of the
 * arc, so consecutive marks — and the two virtual gaps out to each endpoint —
 * sit exactly `length / (count + 1)` apart. Solving that for the count which
 * makes THAT gap equal `spacing` gives `length / spacing - 1`, rounded to the
 * nearest whole mark.
 *
 * Floored at 1: a trail shorter than one spacing unit still gets a single
 * mark (the same floor `clueMarks` itself already applies via its own
 * `count <= 0` guard), never zero for a level that authored a `clue` at all.
 */
export function clueCountFor(length: number, spacing: number): number {
  if (length <= 0 || spacing <= 0) return 0
  return Math.max(1, Math.round(length / spacing) - 1)
}

export function clueMarks(
  polyline: ReadonlyArray<{ x: number; y: number }>,
  length: number,
  count: number,
  kind: ClueKind,
): readonly ClueMark[] {
  if (count <= 0 || polyline.length < 2 || length <= 0) return []
  const marks: ClueMark[] = []
  // Marks sit in the INTERIOR of the trail: `(i + 1) / (count + 1)`, so five
  // marks land at 1/6 .. 5/6 of the arc and none at an endpoint.
  //
  // Spacing them `i / (count - 1)` instead puts one at arc 0 and one at the
  // full length, which fails twice over. Visually both vanish: the start
  // marker and the glass cover one, the goal marker covers the other, so a
  // trail configured for five clues shows three. And mechanically the first is
  // earned for free the instant the child touches the start, while the last is
  // redundant with finishing the trail at all. A clue has to be collected
  // ALONG the route or it is not a reward for following it.
  const denom = count + 1
  for (let i = 0; i < count; i++) {
    const arc = ((i + 1) / denom) * length
    const point = pointAtArcLength(polyline as Point[], arc)
    const index = indexAtDistance(polyline, arc)
    const angle = tangentAngleAt(polyline, index, TANGENT_SPAN_UNITS)
    let x = point.x
    let y = point.y
    // Footprints alternate left/right off the centreline (defect fix: "the
    // footprint kind should alternate left/right down the trail... that is
    // what makes a track read as walking"). Cheap — it reuses the SAME
    // tangent angle already computed for the mark's facing direction,
    // rotated 90° for the normal, so no extra geometry lookup is needed.
    // Every other clue kind stays exactly on the centreline, unchanged.
    if (kind === 'footprint') {
      const rad = (angle * Math.PI) / 180
      // SVG convention (y grows down, `rotate(deg)` turns clockwise — same
      // as `directionArrow.ts`'s `tangentAngleAt`): rotating the tangent
      // `(cos, sin)` by +90° gives the LEFT-hand normal `(-sin, cos)`.
      const nx = -Math.sin(rad)
      const ny = Math.cos(rad)
      const side = i % 2 === 0 ? 1 : -1
      x += nx * FOOTPRINT_OFFSET * side
      y += ny * FOOTPRINT_OFFSET * side
    }
    marks.push({ x, y, angle, kind })
  }
  return marks
}

/**
 * Fold one position sample into a trail's clue state (rides the existing
 * 10 Hz `onFrame` sample in `LevelPlay`, design unit 6 — a later slice; this
 * module adds no second scan of its own).
 *
 * A mark transitions `drained → earned` the moment `head` lands within
 * `radius` of it — a single, discrete flip, never re-evaluated once earned
 * (spec scenario "Mark flips exactly once as the glass passes"): the
 * MONOTONE guarantee is `lit[i]` can only go `false → true`, never back.
 *
 * When nothing changes — every already-earned mark stays earned and no
 * `drained` mark is within radius — the exact SAME `state` reference is
 * returned, not merely an equal one: that is what makes "re-passing an
 * earned mark is inert" cheap to assert (spec scenario "Re-passing an
 * earned mark is inert") and cheap for a caller to skip re-rendering on.
 */
export function clueTick(
  state: ClueState,
  head: { x: number; y: number },
  marks: readonly ClueMark[],
  radius: number,
): ClueState {
  let changed = false
  const radiusSq = radius * radius
  const lit = state.lit.map((wasLit, i) => {
    if (wasLit) return true
    const mark = marks[i]
    if (!mark) return wasLit
    const dx = head.x - mark.x
    const dy = head.y - mark.y
    if (dx * dx + dy * dy > radiusSq) return wasLit
    changed = true
    return true
  })
  return changed ? { lit } : state
}
