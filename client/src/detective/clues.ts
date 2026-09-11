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
  /**
   * Where this mark sits ALONG the route, in arc-length units from the start.
   *
   * This is the value {@link clueTick} lights on, and it is why the mark is a
   * point on a ROUTE rather than a point on the sheet. `clueMarks` has always
   * computed it — it is the `(i + 1) / (count + 1)` fraction of `length` that
   * decides `x`/`y` — and used to throw it away, which forced collection to
   * re-derive "am I here?" from Euclidean proximity to `x`/`y`. That is the
   * wrong question: a child who cuts a corner INSIDE the corridor passes the
   * mark's arc position without ever passing within a radius of its point, and
   * the mark stays drained for a run that broke no rule (the user's rule is
   * "as long as I never left the path, by the time I reach the end EVERY clue
   * must have lit, no matter how off-centre my line was").
   *
   * For a `footprint`, `x`/`y` are nudged {@link FOOTPRINT_OFFSET} units off
   * the centreline but `arc` is NOT — it stays the position along the route the
   * footprint belongs to. The offset is decoration; the arc is the mechanic.
   */
  arc: number
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
    // `arc` is the UNOFFSET position along the route (see `ClueMark.arc`): the
    // footprint branch above moved the drawn point sideways, never the mark's
    // place in the walk.
    marks.push({ x, y, angle, kind, arc })
  }
  return marks
}

/**
 * Fold one sample's ROUTE PROGRESS into a trail's clue state (rides the
 * existing `onFrame` sample in `LevelPlay`; this module adds no scan of its
 * own).
 *
 * `maxArc` is the furthest the child has got along the route this run — the
 * monotone high-water mark carried by `screen/corridorTrack.ts`'s
 * `CorridorTrack`, not the raw per-sample `arc`, which slides backwards when
 * the finger wobbles. A mark is earned the moment the walk has REACHED its
 * arc position: `lit[i] = maxArc >= marks[i].arc`.
 *
 * WHY THIS IS NOT PROXIMITY. It used to be `dist² <= radius²` against the
 * mark's drawn point, with `radius = corridorWidth`. That made collection a
 * test of how CENTRED the line was, and the corridor is not a centred-line
 * exercise — it is a don't-leave-it exercise. On a wide trail a child could
 * walk the whole route legally, hugging one wall or cutting the inside of
 * every bend, and arrive with marks still dark; on a route that doubles back,
 * proximity could even light a mark on a neighbouring arm the child was not
 * walking. Arc progress answers the question the mechanic actually asks, and
 * it makes the user's rule true BY CONSTRUCTION rather than by tolerance:
 * reaching the end means `maxArc` passed every interior mark's arc on the way.
 *
 * Monotone by two independent facts, not by a rule this function remembers to
 * follow: `maxArc` only ever grows, and an already-earned mark short-circuits
 * to `true` before its arc is even read. `lit[i]` cannot go `true → false`.
 *
 * When nothing flips, the exact SAME `state` reference is returned, not merely
 * an equal one: that is what makes "re-passing an earned mark is inert" cheap
 * to assert (spec scenario "Re-passing an earned mark is inert") and what lets
 * `LevelPlay`'s `setState` collapse an idle re-pass into a no-op.
 */
export function clueTick(
  state: ClueState,
  maxArc: number,
  marks: readonly ClueMark[],
): ClueState {
  let changed = false
  const lit = state.lit.map((wasLit, i) => {
    if (wasLit) return true
    const mark = marks[i]
    if (!mark) return wasLit
    if (maxArc < mark.arc) return wasLit
    changed = true
    return true
  })
  return changed ? { lit } : state
}

/**
 * The arc position that counts as REACHING THE END of a trail: close enough to
 * the finish that the last stretch is not a second exercise, `corridorWidth/2`
 * being the corridor's own half-width — the same tolerance the wall check uses
 * to decide inside from outside, so "arrived" is measured in the units the
 * level is already built in rather than in a new invented constant.
 *
 * Its relationship with {@link clueMarks} is the whole invariant of this mode
 * and is asserted against the REAL catalog in `clues.test.ts`. Marks sit
 * `length / (count + 1)` apart and the last one sits exactly that far short of
 * the end, so every mark is below this threshold precisely when that spacing
 * exceeds `corridorWidth / 2`. The shipped trails space marks ~60 units apart
 * against half-widths of 35 and 45, so the last mark is always passed before
 * the end is — "reached the end ⇒ every clue lit" holds by construction.
 *
 * WHICH WIDTH TO PASS, and this one matters. `corridorWidth` must be the
 * level's AUTHORED width (`LevelConfig.corridorWidth`), never the adaptive
 * `LevelTarget.corridorWidth`, which `buildLevelTarget` has already multiplied
 * by the child's `widthFactor`. That factor reaches `MAX_WIDTH_FACTOR = 2`
 * (`game/adaptiveTolerance.ts`), and at double width trail1's threshold would
 * move back to `length - 90` while its last mark still sits at `length - 60.6`
 * — so the mark would fall PAST the finish and the trail would complete with a
 * clue still dark. That is the invariant inverted, and inverted for exactly
 * the child the widening exists to help, who would be the only one ever to
 * see it. Where the route FINISHES is a property of the route; how much
 * wobble is forgiven along it is the property `widthFactor` is for.
 */
export function trailEndArc(length: number, corridorWidth: number): number {
  return length - corridorWidth / 2
}

/**
 * Whether a run has REACHED THE END of the trail — the only thing a detective
 * trail asks of the child.
 *
 * Deliberately not a completion test in the `evaluateLevel` sense. It says
 * nothing about accuracy, stroke order or fluency, and it never consults the
 * clue marks' `lit` state. The other half of the user's rule — "the finger did
 * not leave the path" — is not checked here because it cannot fail here: a
 * detective trail is `resetOnContact`, so leaving the corridor restarts the
 * run and takes `maxArc` back to zero with it. A `maxArc` that reached this
 * threshold is, by construction, a run that never left.
 */
export function reachedTrailEnd(maxArc: number, length: number, corridorWidth: number): boolean {
  if (length <= 0) return false
  return maxArc >= trailEndArc(length, corridorWidth)
}
