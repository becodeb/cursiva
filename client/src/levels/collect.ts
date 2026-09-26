// Collect-along-the-path mechanic (`docs/19_PROPUESTA_HISTORIA_Y_MECANICAS.md`
// §2.2, §3.4; `odd/tasks/prewriting-stage-completion.md` T17). Pure and
// DOM-free, the same convention `detective/clues.ts` already follows for the
// exact same shape of problem — this module is deliberately its sibling, not
// a rewrite: a level's items sit ON the route, are earned by ARC PROGRESS
// (never by Euclidean proximity to a drawn point, and never by a second
// spatial index), stay earned once earned, and the route's own monotone
// high-water mark (`screen/corridorTrack.ts`'s `CorridorTrack.maxArc`) is the
// ONLY progress signal both this module and `clueTick` ever read.
//
// WHY THIS IS A SEPARATE MODULE FROM `detective/clues.ts` rather than one
// more field on `ClueMark`/`ClueState`. A clue trail is a case: it files into
// the PISTAS rail, it can route to a deduction, and — load-bearing for this
// difference — `screen/LevelPlay.tsx`'s `restartRun` (a wall-contact reset)
// DELIBERATELY WIPES `ClueState` on every contact reset ("the route itself is
// starting over, so any clue marks lit during the abandoned pass go with
// it"). Collected items must do the OPPOSITE (design.md §2.2 point 3, "lo
// juntado queda juntado, aunque el dedo se salga de la línea"): a level's own
// `CollectState` is never reset by a contact restart, only by starting a
// genuinely NEW attempt at the level (`LevelPlay`'s level-id-keyed mount
// effect). Folding this into `ClueState` would mean either breaking the
// existing "clue trail forgets on contact" contract or teaching `clueTick`'s
// one caller two contradictory reset rules for the same field — a second,
// parallel state is the smaller, safer diff.
import { routeApexes } from './vertexArt'
import { pointAtArcLength } from '../letters/svgLetter'
import type { Point } from '../letters/types'
import type { ArtImage } from '../detective/assets'
import { trailEndArc } from '../detective/clues'

/**
 * One collectible's fixed placement along a route: where it sits (for
 * rendering/flight-origin purposes) and how far along the route it is (the
 * ONLY thing {@link collectTick} reads). Deliberately the same two-field
 * shape as `detective/clues.ts`'s `ClueMark`, minus `angle`/`kind` — a
 * collectible is not rotated to face the route and does not carry a per-mark
 * art kind (`LevelConfig.collect.art` is ONE picture for every item on a
 * level, `docs/19` §3.4's "una oveja por pico").
 */
export interface CollectItem {
  readonly x: number
  readonly y: number
  /** Arc-length position along the route, in sheet units from the start. */
  readonly arc: number
}

/**
 * A level's item-collection state: `collected[i]` is whether item `i` has
 * been earned. Booleans only, exactly `ClueState`'s own shape and for the
 * same reason — no tween/delay/easing field, ever; the shape itself is the
 * guarantee that this module never grows a hidden animation clock.
 */
export interface CollectState {
  readonly collected: readonly boolean[]
}

/** All `count` items un-collected — the state a level's own run starts in
 * (`LevelPlay`'s level-id-keyed mount effect, never `resetSurface` and never
 * `restartRun` — see this module's header). */
export function emptyCollectState(count: number): CollectState {
  return { collected: Array.from({ length: Math.max(0, count) }, () => false) }
}

/**
 * Fold one sample's route progress into a level's collect state — byte-for-
 * byte `detective/clues.ts`'s `clueTick` algorithm, restated for
 * {@link CollectItem}/{@link CollectState}: an already-collected item
 * short-circuits to `true` before its arc is even read (so a contact reset's
 * `maxArc` dropping back to 0 can never un-collect anything the child already
 * earned), and the exact same `state` reference comes back when nothing
 * flips (an idle re-pass, or a sample taken while off-path, costs a no-op
 * `setState` at the call site).
 *
 * Collection order falls out of this for free: `items` are authored in
 * ascending arc order (`collectItemsFromPeaks` guarantees it, walking the
 * route left to right), and `maxArc` only ever grows, so item `i` cannot
 * read `true` before every item `j < i` already does.
 */
export function collectTick(
  state: CollectState,
  maxArc: number,
  items: readonly CollectItem[],
): CollectState {
  let changed = false
  const collected = state.collected.map((was, i) => {
    if (was) return true
    const item = items[i]
    if (!item) return was
    if (maxArc < item.arc) return was
    changed = true
    return true
  })
  return changed ? { collected } : state
}

/** How many of a level's items have been collected so far. */
export function collectedCount(state: CollectState): number {
  return state.collected.reduce((n, c) => n + (c ? 1 : 0), 0)
}

/**
 * The one thing a collect level asks of the child (design.md §2.2 point 4,
 * "el nivel termina cuando se junta el último"): the LAST item — the one
 * standing at the very end of the route — has been collected. Because item
 * arcs are ascending and `collectTick` is monotone by construction, the last
 * item can only ever read `true` once every earlier one already does, so
 * this single check IS "collected them all, in order, having walked the
 * whole route" — never a separate tally against `items.length`.
 *
 * `false` for a level with no items at all (`collect` absent, or a route too
 * short to place even one) — nothing to finish, so nothing is ever "done" by
 * this test, exactly like `reachedTrailEnd` returning `false` for a
 * zero-length route.
 */
export function isCollectComplete(state: CollectState): boolean {
  return state.collected.length > 0 && state.collected[state.collected.length - 1]
}

/**
 * Places one item at each of the route's own APEXES (`levels/vertexArt.ts`'s
 * `routeApexes` — the SAME function, and therefore the exact same points,
 * `LevelConfig.vertexArt`'s `'apexes'` place already stands the sheep/llama
 * pictures on: "don't invent a second spatial index"), plus one FINAL item
 * at the very end of the route (design.md §2.2 point 1, "el último está al
 * final del camino"; §3.4, "una oveja más al final del camino: es la
 * última, y cierra el nivel").
 *
 * Each apex's `arc` is measured by walking the polyline's own cumulative
 * distance up to that point's index — `routeApexes` returns the polyline's
 * OWN element objects by reference (never a copy), so `indexOf` is exact and
 * cheap for the handful of peaks a ridge route ever has. The final item's
 * arc is exactly `length`, matching `polyline[polyline.length - 1]`.
 *
 * `minRise` is forwarded to `routeApexes` unchanged — the same noise floor
 * `vertexArt`'s own peak-finding already uses, so a level that authors both
 * `vertexArt: { place: 'apexes' }` and `collect: { items: 'peaks' }` gets
 * IDENTICAL peak positions from both, by construction.
 *
 * The FINAL item's own arc is `detective/clues.ts`'s `trailEndArc(length,
 * corridorWidth)`, not the literal `length` — reusing that module's own
 * "reaching the end" tolerance rather than inventing a second one. This is
 * NOT a cosmetic choice: a real fingertip essentially never lands on the
 * mathematically exact last polyline vertex, and the coordinate round-trip
 * through screen pixels and back (`getScreenCTM`-style conversion, the same
 * path a real touch event takes) can leave the computed `maxArc` a hair
 * short of `length` even when the finger IS exactly on that pixel — found by
 * measuring a live browser session, not guessed: a dense, slow trace ending
 * exactly at the route's own last vertex still measured `maxArc ≈
 * length - 2.3e-5`, forever short of a literal `length` threshold. Every
 * OTHER item needs no such margin, because the finger naturally keeps
 * advancing past an interior peak, comfortably clearing its arc with room to
 * spare — only the very last point has nothing further along the route for
 * `maxArc` to advance into.
 *
 * `corridorWidth` must be the level's AUTHORED width
 * (`LevelConfig.corridorWidth`), never the adaptive
 * `LevelTarget.corridorWidth` — `trailEndArc`'s own doc comment has the full
 * reasoning (the adaptive width would move the finish line for the exact
 * child the widening exists to help).
 */
export function collectItemsFromPeaks(
  polyline: ReadonlyArray<{ x: number; y: number }>,
  length: number,
  corridorWidth: number,
  minRise = 40,
): readonly CollectItem[] {
  if (polyline.length < 2 || length <= 0) return []
  const apexes = routeApexes(polyline, minRise)
  const items: CollectItem[] = apexes.map((apex) => {
    const index = polyline.indexOf(apex)
    const arc = index > 0 ? arcLengthUpTo(polyline, index) : 0
    return { x: apex.x, y: apex.y, arc }
  })
  const last = polyline[polyline.length - 1]
  items.push({ x: last.x, y: last.y, arc: Math.max(0, trailEndArc(length, corridorWidth)) })
  return items
}

/** Cumulative Euclidean distance along `polyline` from index 0 to `index`
 * (inclusive) — `letters/svgLetter.ts`'s `polylineLength`, restated for a
 * PREFIX of the polyline instead of the whole thing (that function has no
 * "up to here" parameter to reuse). */
function arcLengthUpTo(polyline: ReadonlyArray<{ x: number; y: number }>, index: number): number {
  let arc = 0
  for (let i = 1; i <= index; i++) {
    arc += Math.hypot(polyline[i].x - polyline[i - 1].x, polyline[i].y - polyline[i - 1].y)
  }
  return arc
}

/**
 * One arc-length WINDOW's worth of a smooth route's own local minima in y —
 * a wave's crests (T21, `odd/tasks/prewriting-stage-completion.md`,
 * `docs/19` §2.2/§7 slice 3: "los patitos en las ondas").
 *
 * WHY NOT {@link routeApexes}. That function (`levels/vertexArt.ts`) compares
 * each point only against its own IMMEDIATE NEIGHBOURS and keeps the
 * candidate only if the rise clears `minRise` (40 by default) — right for a
 * RIDGE (`peakRidge`'s own sharp, near-triangular peaks, where the slope
 * stays steep right up to the tip), wrong for a SMOOTH bezier wave
 * (`paths.ts`'s `wave`/`waveVaried`), whose derivative vanishes AT its own
 * crest: measured directly against the duck's own shipped `duck-trail3`/
 * `duck-trail4` routes, two adjacent samples straddling the true crest
 * differed by a fraction of a unit even though the crest's own depth against
 * its neighbouring trough is over a hundred — `routeApexes` finds ZERO
 * apexes on either level, no matter how the family's amplitude is tuned,
 * because the failure is geometric (a flat derivative), not a threshold
 * this or any other `minRise` value could fix without also risking a false
 * positive from sampling noise elsewhere on a truly flat stretch.
 *
 * This compares each candidate against every OTHER point within
 * `windowArc` SHEET UNITS of it (arc length, never a sample COUNT — a
 * cheap, robust proxy for "not merely my two immediate neighbours" that
 * stays correct regardless of how densely `buildLevelTarget` happens to
 * sample the route). `windowArc`'s default (80) only has to clear two
 * unrelated distances: bigger than the near-flat stretch immediately
 * around a real crest (measured well under 40 units on both shipped
 * levels), and smaller than half the arc-length gap between two
 * consecutive crests (measured at ~370-440 units on `duck-trail3` and at a
 * full cycle, ~280 units, on `duck-trail4`) — comfortably true for any
 * undulation family sharing this app's existing amplitude/cycle-width
 * ranges (`docs/13` §2).
 */
export function waveCrestArcs(
  polyline: ReadonlyArray<{ x: number; y: number }>,
  windowArc = 80,
): readonly number[] {
  if (polyline.length < 3) return []
  const arcAt: number[] = [0]
  for (let i = 1; i < polyline.length; i++) {
    arcAt.push(arcAt[i - 1] + Math.hypot(polyline[i].x - polyline[i - 1].x, polyline[i].y - polyline[i - 1].y))
  }
  const crests: number[] = []
  for (let i = 1; i < polyline.length - 1; i++) {
    let lo = i
    while (lo > 0 && arcAt[i] - arcAt[lo - 1] <= windowArc) lo--
    let hi = i
    while (hi < polyline.length - 1 && arcAt[hi + 1] - arcAt[i] <= windowArc) hi++
    let isCrest = true
    // A genuinely flat window (every point in it sharing i's own y — no
    // wave at all, or a straight run) must NOT register as a crest: nothing
    // in it is smaller than `i`, but nothing is a real valley either.
    // `sawHigher` is what tells "the true minimum of a real dip" apart from
    // "an arbitrary point on a flat line", which merely never fails the
    // "nothing here is smaller" half of the same check.
    let sawHigher = false
    for (let j = lo; j <= hi; j++) {
      if (j === i) continue
      if (polyline[j].y < polyline[i].y) {
        isCrest = false
        break
      }
      if (polyline[j].y > polyline[i].y) sawHigher = true
    }
    if (isCrest && sawHigher) crests.push(arcAt[i])
  }
  return crests
}

/**
 * A level's own `LevelConfig.collect` field (`levels/types.ts`): item
 * positions along the route, in ascending order, plus the ONE picture every
 * item on this level draws (`docs/19` §3.4: one kind of item per level, "una
 * oveja por pico").
 *
 * `items: 'peaks'` derives positions from {@link collectItemsFromPeaks} — the
 * sheep-hill/llama-peak convention this task ships, right for a RIDGE.
 * `items: 'crests'` derives positions from {@link waveCrestArcs} instead —
 * the duck family's own smooth wave routes, where `'peaks'` finds nothing
 * (that function's own header has the full measurement). `items: 'loops'`
 * derives positions from {@link collectItemsFromLoops} — the turtles' own
 * `ovals()` routes (T28), one item per closed loop. All three plus one final
 * item at the route's own end (`trailEndArc`'s tolerance, same reasoning
 * `collectItemsFromPeaks` already documents). An explicit ascending array of
 * arc-length FRACTIONS (0..1 of the route's length) stays the escape hatch
 * for a future adventure whose collectibles are none of the three —
 * `resolveCollectItems` below turns any of the four shapes into the same
 * `CollectItem[]` the engine scores against, so `LevelPlay`/`collectTick`
 * never need to know which one a level chose.
 */
export interface CollectConfig {
  readonly items: readonly number[] | 'peaks' | 'crests' | 'loops'
  readonly art: ArtImage
  readonly size: number
}

/** {@link collectItemsFromPeaks}'s own construction, restated for
 * {@link waveCrestArcs}'s arcs instead of {@link routeApexes}'s points —
 * same final-item tolerance, same ascending-by-construction guarantee
 * (`waveCrestArcs` walks the polyline start to end). */
function collectItemsFromWaveCrests(
  polyline: ReadonlyArray<{ x: number; y: number }>,
  length: number,
  corridorWidth: number,
): readonly CollectItem[] {
  if (polyline.length < 2 || length <= 0) return []
  const items: CollectItem[] = waveCrestArcs(polyline).map((arc) => {
    const point = pointAtArcLength(polyline as Point[], arc)
    return { x: point.x, y: point.y, arc }
  })
  const last = polyline[polyline.length - 1]
  items.push({ x: last.x, y: last.y, arc: Math.max(0, trailEndArc(length, corridorWidth)) })
  return items
}

/**
 * Places one item at each internal CLOSURE of a `paths.ts`'s `ovals()` route
 * — the point where a ring's own traversal returns to exactly the (x, y) it
 * started that ring from — plus one FINAL item at the route's own end
 * (`docs/19` §3, the turtles' own recipe B row: "cada vuelta hace asomar una
 * tortuga", each loop makes a turtle peek out; T28,
 * `odd/tasks/prewriting-stage-completion.md`).
 *
 * WHY A CLOSURE MATCH, NOT A GEOMETRIC EXTREMUM. `ovals()`'s own header
 * proves each ring is a closed 360° sweep that begins and ends at the exact
 * same clock-1 point (`clockPoint(cx, 1)`, called once for the ring's `M`
 * and once more for its closing `C`'s own endpoint — the SAME pure function
 * call, so `paths.ts`'s `r2` two-decimal rounding lands on the identical
 * float both times, and `flattenPathD` copies a `C` command's own literal
 * endpoint rather than re-deriving it). `routeApexes`/`waveCrestArcs` (this
 * module's other two derivations) both hunt for a smooth LOCAL EXTREMUM,
 * which an ellipse's own closure point is NOT (its own leftmost point,
 * reached mid-ring, is a real smooth minimum of `x` — a SEPARATE feature a
 * `waveCrestArcs`-style window search would also catch, over-counting by one
 * per ring). A ring's own start/close pair is instead a POINT REVISIT:
 * nothing else on a simple ellipse sweep, or on the short connecting curve
 * between two rings (always moving strictly rightward in `x`), ever returns
 * to a coordinate it already visited. Scanning forward from each still-open
 * reference point for the next later point matching it (bit-for-bit, since
 * both sides of the match come from the same rounded float) finds exactly
 * one match per ring — the ring's own closure — and none inside a connector,
 * with no dependency on `ovals()`'s specific clock-based parametrisation
 * beyond "each ring is a closed loop back to its own start".
 *
 * The LAST ring's own closure is never reported by this internal scan (its
 * match IS the route's final point, with nothing left afterward to search
 * from) — it is folded into the trailing FINAL item instead, `trailEndArc`
 * tolerance and all, the same construction {@link collectItemsFromPeaks} and
 * {@link collectItemsFromWaveCrests} already use and for the identical
 * reason (a live fingertip essentially never lands on the mathematically
 * exact last vertex).
 *
 * A single ring (`turtle1`) reports zero internal closures — nothing to find
 * before the route's own end — so it authors exactly ONE item: the whole
 * point of "one loop, one turtle".
 */
export function collectItemsFromLoops(
  polyline: ReadonlyArray<{ x: number; y: number }>,
  length: number,
  corridorWidth: number,
): readonly CollectItem[] {
  if (polyline.length < 3 || length <= 0) return []
  const arcAt: number[] = [0]
  for (let i = 1; i < polyline.length; i++) {
    arcAt.push(arcAt[i - 1] + Math.hypot(polyline[i].x - polyline[i - 1].x, polyline[i].y - polyline[i - 1].y))
  }
  const closures = loopClosureIndices(polyline, arcAt)
  // Every closure this scan finds IS a ring's own start/end pair, in
  // ascending order — except the very last one, which is the FINAL ring's
  // own closure (the route's last point) and belongs to the trailing item
  // below instead, its own tolerance and all.
  const internal = closures.slice(0, -1)
  const items: CollectItem[] = internal.map((index) => ({
    x: polyline[index].x,
    y: polyline[index].y,
    arc: arcAt[index],
  }))
  const last = polyline[polyline.length - 1]
  items.push({ x: last.x, y: last.y, arc: Math.max(0, trailEndArc(length, corridorWidth)) })
  return items
}

/** A minimum arc-length gap between a candidate reference point and its own
 *  match, well under the shortest ring circumference any authored `ovals()`
 *  level ships (turtle4's own tightest ring is ≈745 units — Ramanujan's
 *  approximation over `rx: 75, ry: 150` — `docs/19` §3) and well over the
 *  sub-unit spacing between adjacent flattened samples — rules out ever
 *  matching a point against its own immediate neighbour instead of a
 *  genuine later revisit. */
const LOOP_CLOSURE_MIN_ARC_GAP = 50
/** How close two points must be, in squared sheet units, to count as the
 *  SAME point — {@link collectItemsFromLoops}'s own header explains why an
 *  exact (bit-level, modulo `r2`'s rounding) match is expected, not merely a
 *  close one; this tolerance only guards against an unrelated flattening
 *  detail landing a hair off `t = 1`. */
const LOOP_CLOSURE_EPSILON_SQ = 1e-4

/**
 * Scans the polyline left to right; for each still-open reference index,
 * finds the EARLIEST later index (at least {@link LOOP_CLOSURE_MIN_ARC_GAP}
 * of arc further along) landing on the same point, records it as a closure,
 * and resumes scanning from just past it — {@link collectItemsFromLoops}'s
 * own header has the full geometric argument for why this finds exactly one
 * match per ring and none inside a connector. A reference point with no
 * later match (every point past the FINAL ring's own start) is simply
 * skipped, one index at a time.
 */
function loopClosureIndices(
  polyline: ReadonlyArray<{ x: number; y: number }>,
  arcAt: readonly number[],
): readonly number[] {
  const closures: number[] = []
  let p = 0
  while (p < polyline.length - 1) {
    let found = -1
    for (let j = p + 1; j < polyline.length; j++) {
      if (arcAt[j] - arcAt[p] < LOOP_CLOSURE_MIN_ARC_GAP) continue
      const dx = polyline[j].x - polyline[p].x
      const dy = polyline[j].y - polyline[p].y
      if (dx * dx + dy * dy <= LOOP_CLOSURE_EPSILON_SQ) {
        found = j
        break
      }
    }
    if (found === -1) {
      p += 1
      continue
    }
    closures.push(found)
    p = found + 1
  }
  return closures
}

/** Turns a level's authored `CollectConfig` into the `CollectItem[]` the
 * engine actually scores against, against this level's OWN built route
 * (`LevelTarget.polyline`/`LevelTarget.length` — the centred, derived
 * route, never `config.paths`, the same rule every other derived field in
 * `levels/buildLevel.ts` already follows). `corridorWidth` is forwarded to
 * `collectItemsFromPeaks` unchanged — see that function's own doc for why
 * the LAST item needs it and no other item does.
 *
 * An explicit fraction array gets NO such margin on its own last entry: it
 * is an escape hatch for a future adventure, not exercised by this task, and
 * whoever authors it can bake in their own margin explicitly (`0.98` instead
 * of `1`) if their route needs one. */
export function resolveCollectItems(
  config: CollectConfig,
  polyline: ReadonlyArray<{ x: number; y: number }>,
  length: number,
  corridorWidth: number,
): readonly CollectItem[] {
  if (config.items === 'peaks') return collectItemsFromPeaks(polyline, length, corridorWidth)
  if (config.items === 'crests') return collectItemsFromWaveCrests(polyline, length, corridorWidth)
  if (config.items === 'loops') return collectItemsFromLoops(polyline, length, corridorWidth)
  if (polyline.length < 2 || length <= 0) return []
  return config.items.map((fraction) => {
    const arc = fraction * length
    const point = pointAtArcLength(polyline as Point[], arc)
    return { x: point.x, y: point.y, arc }
  })
}
