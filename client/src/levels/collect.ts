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
 * A level's own `LevelConfig.collect` field (`levels/types.ts`): item
 * positions along the route, in ascending order, plus the ONE picture every
 * item on this level draws (`docs/19` §3.4: one kind of item per level, "una
 * oveja por pico").
 *
 * `items: 'peaks'` derives positions from {@link collectItemsFromPeaks} — the
 * sheep-hill/llama-peak convention this task ships. An explicit ascending
 * array of arc-length FRACTIONS (0..1 of the route's length) is the escape
 * hatch for a future adventure whose collectibles are not at peaks (a duck's
 * gliding stops along a flat wave, say) — `resolveCollectItems` below turns
 * either shape into the same `CollectItem[]` the engine scores against, so
 * `LevelPlay`/`collectTick` never need to know which one a level chose.
 */
export interface CollectConfig {
  readonly items: readonly number[] | 'peaks'
  readonly art: ArtImage
  readonly size: number
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
  if (polyline.length < 2 || length <= 0) return []
  return config.items.map((fraction) => {
    const arc = fraction * length
    const point = pointAtArcLength(polyline as Point[], arc)
    return { x: point.x, y: point.y, arc }
  })
}
