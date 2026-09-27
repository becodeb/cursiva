// The idle nudge's own geometry (`odd/tasks/prewriting-stage-completion.md`
// T33): WHERE the "look here, do this" cue slides, per level kind. Pure, no
// React, no DOM — the same discipline `screen/directionArrow.ts` and
// `levels/waypoints.ts` already hold to, so every rule here is testable with
// plain fixtures.
//
// A level kind decides which of the small pure functions below fires
// (`idleCueForLevel`, the one dispatcher `screen/LevelPlay.tsx` calls):
//
//  - a routed level (paths/spines aside) has a `directionArrow` already
//    computed FOR IT (`screen/directionArrow.ts`'s own `directionArrowOf`) —
//    a point a fixed distance along the route's own tangent. `pathCue` reuses
//    that exact point rather than re-deriving a direction: "slides along the
//    first stretch of the route" IS what `directionArrow` already answers,
//    so a second formula here could only disagree with the arrow the child
//    already sees.
//  - a `waypoints` level (the bee) has no route at all — `waypointsCue`
//    slides from the carrier's own rest point toward the first flower,
//    capped at `CUE_MAX_DISTANCE` so the cue reads as "start moving this
//    way", never a preview of the whole errand.
//  - a `spines` level (the hedgehog) has no route and no waypoints — one
//    spine, the next unfilled one (`levels/spines.ts`'s own `nextSpineIndex`)
//    — `spineCue` slides a short distance OUTWARD along that anchor's own
//    normal, the same direction every drawn spike already points.
//  - a `reveal: { mode: 'erase' }` level (glass/sand/leaves/mud) has no
//    anchor of any kind to point at — `wipeCue` is a short, fixed horizontal
//    pass near the sheet's own centre, reading as "wipe here" independent of
//    level geometry.
//  - a `reveal: { mode: 'light' }` level (the night) is the same "no anchor"
//    case, but drawn as a torch-style diagonal sweep instead of a flat wipe
//    so it reads as light moving, not cloth.
import { spineAnchors, nextSpineIndex, type SpineConfig, type SpineState } from '../levels/spines'
import type { Point } from '../letters/types'

/** How the cue should be DRAWN — `screen/LevelPlay.tsx`/`canvas/TraceCanvas.tsx`
 *  pick the marker/motion from this, never from the level kind directly, so
 *  the two stay in sync by construction. */
export type IdleCueVisual = 'hand' | 'wipe' | 'torch'

/** A single short cue: slide from `from` to `to` (and back), once. */
export interface IdleCueSegment {
  readonly visual: IdleCueVisual
  readonly from: Point
  readonly to: Point
}

/** The sheet's own geometric centre (`levels/revealGrid.ts`'s own `SHEET_HEIGHT`
 *  paired with the routeless-level width convention, `1000 x 600`) — the one
 *  fixed anchor a routeless erase/light level can use when it authors no
 *  point of its own. */
const SHEET_CENTER: Point = { x: 500, y: 300 }

/** Never more than this far from the level's own rest point — a "start
 *  moving this way" nudge, not a spoiler of the whole errand. */
const CUE_MAX_DISTANCE = 90

/** Half the wipe/torch sweep's own span, in viewBox units. */
const SWEEP_HALF_SPAN = 70

/** How far outward from its anchor the hedgehog cue slides — comfortably
 *  short of `SpineRules.lenMax` on every authored hedgehog level, so the cue
 *  reads as "start here, go this way" rather than a full drawn spike. */
const SPINE_CUE_LENGTH = 40

/** `to`, unless it is farther than `maxDistance` from `from` — then the
 *  point AT `maxDistance` along the same ray. `from` returned unchanged when
 *  the two points coincide (nothing to point toward). */
function clampDistance(from: Point, to: Point, maxDistance: number): Point {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const dist = Math.hypot(dx, dy)
  if (dist <= maxDistance || dist === 0) return to
  const t = maxDistance / dist
  return { x: from.x + dx * t, y: from.y + dy * t }
}

/** A routed (or spine-demo-able) level's own cue: the green start dot to the
 *  SAME point `directionArrowOf` already anchors its arrow at. `undefined`
 *  input (a path too short for a direction, or no start dot at all) yields
 *  no cue rather than guessing one. */
export function pathCue(startMarker: Point | undefined, arrowPoint: Point | undefined): IdleCueSegment | null {
  if (!startMarker || !arrowPoint) return null
  return { visual: 'hand', from: startMarker, to: arrowPoint }
}

/** The bee's own cue: rest point toward the first flower, capped short. */
export function waypointsCue(start: Point, firstStop: Point | undefined): IdleCueSegment | null {
  if (!firstStop) return null
  return { visual: 'hand', from: start, to: clampDistance(start, firstStop, CUE_MAX_DISTANCE) }
}

/** A cleaning level's own cue (glass/sand/leaves/mud): a short, flat pass
 *  near the sheet's centre — there is no authored anchor to point toward on
 *  an `erase` reveal, so the cue is deliberately geometry-free. */
export function wipeCue(centre: Point = SHEET_CENTER): IdleCueSegment {
  return {
    visual: 'wipe',
    from: { x: centre.x - SWEEP_HALF_SPAN, y: centre.y },
    to: { x: centre.x + SWEEP_HALF_SPAN, y: centre.y },
  }
}

/** The night's own cue: the same "no anchor" case as `wipeCue`, but a
 *  diagonal sweep so it reads as a torch moving rather than a wipe. This is
 *  DELIBERATELY independent of where any hidden object actually is — that
 *  is item 2's own, much more targeted, `nightHintFor`
 *  (`levels/revealGrid.ts`); conflating the two would leak the night hint's
 *  own progressive reveal into a cue that fires after a mere 6s. */
export function torchSweepCue(centre: Point = SHEET_CENTER): IdleCueSegment {
  return {
    visual: 'torch',
    from: { x: centre.x - SWEEP_HALF_SPAN, y: centre.y - 40 },
    to: { x: centre.x + SWEEP_HALF_SPAN, y: centre.y + 40 },
  }
}

/** The hedgehog's own cue: the next unfilled anchor, sliding outward along
 *  its own normal — `null` once every spine is already filled (nothing left
 *  to nudge toward). */
export function spineCue(cfg: SpineConfig, state: SpineState): IdleCueSegment | null {
  const idx = nextSpineIndex(cfg, state)
  if (idx === null) return null
  const anchor = spineAnchors(cfg)[idx]
  if (!anchor) return null
  return {
    visual: 'hand',
    from: { x: anchor.x, y: anchor.y },
    to: { x: anchor.x + anchor.nx * SPINE_CUE_LENGTH, y: anchor.y + anchor.ny * SPINE_CUE_LENGTH },
  }
}

/** Enough of `LevelConfig` to dispatch on — a structural subset rather than
 *  the full type, so a test can hand in a small fixture instead of building
 *  a whole catalog entry. */
export interface IdleCueLevel {
  readonly spines?: SpineConfig
  readonly waypoints?: { readonly start: Point; readonly stops: readonly Point[] }
  readonly reveal?: { readonly mode: 'erase' | 'light' }
  readonly introCue?: boolean
}

export interface IdleCueContext {
  readonly startMarker?: Point
  readonly directionArrowPoint?: Point
  readonly spineState?: SpineState
}

/**
 * The one dispatcher `screen/LevelPlay.tsx` calls: picks the right cue
 * function for the level's own kind. Checked in the order a level can
 * actually declare these fields (`levels/types.ts`'s own header: `spines`
 * and `waypoints` are both "only legal on `kind: 'free'`" and mutually
 * exclusive with a reveal in every authored level), so at most one branch
 * below is ever reachable for a given `level` — this is dispatch, not a
 * priority fallback.
 */
export function idleCueForLevel(level: IdleCueLevel, ctx: IdleCueContext): IdleCueSegment | null {
  if (level.spines) return spineCue(level.spines, ctx.spineState ?? { filled: new Set(), aiming: null })
  if (level.waypoints) return waypointsCue(level.waypoints.start, level.waypoints.stops[0])
  if (level.reveal?.mode === 'light') return torchSweepCue()
  if (level.reveal?.mode === 'erase') return wipeCue()
  return pathCue(ctx.startMarker, ctx.directionArrowPoint)
}

/**
 * Whether this level gets a ONE-SHOT intro cue instead of the shared route
 * demo (`docs/18` P5 / D24 — `levels/catalog.ts`'s own `bee1`/`night1`
 * `introCue: true`, "amendment A2": a `kind: 'free'` level's `demoPaths` is
 * always empty, so `demoPlays` can never be true for it no matter what
 * `demo` is set to). Reads the level's own `introCue` field rather than
 * checking its id — `levels/catalog.ts` is the one place that decides WHICH
 * levels get it (today, only the first level of each family: `bee2..4`/
 * `night2..4` already assume the mechanic from here on, the same "first
 * time" framing `docs/18` §3 uses for "mostrar antes de pedir").
 */
export function hasIntroCue(level: Pick<IdleCueLevel, 'introCue'>): boolean {
  return !!level.introCue
}

/** How long the one-shot intro cue plays before handing off to the ordinary
 *  idle-nudge clock (T33: "short (≤ 2 s)"). */
export const INTRO_CUE_MS = 1800
