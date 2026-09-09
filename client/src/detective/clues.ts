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
 * length `length`), at fractions `i / (count − 1)` for `i` in `0..count-1` —
 * the same uniform-in-arc-length convention `letters/svgLetter.ts`'s
 * `generateCheckpoints` already uses for a path's activation zones, so a
 * trail's clue marks and its checkpoints are positioned by the identical
 * rule. `count <= 1` places at most one mark, at the start.
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
    marks.push({ x: point.x, y: point.y, angle, kind })
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
