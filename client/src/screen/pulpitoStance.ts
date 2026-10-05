// The Pulpito's stance on a narrative stage screen (prewriting-stage-
// completion T18, `docs/19_PROPUESTA_HISTORIA_Y_MECANICAS.md` §4.1). Pure,
// DOM-free placement math — the same convention `bubblePlacement.ts` and
// `zoo/adventures.ts` already follow — kept OUT of `zoo/adventures.ts`
// itself (which only carries the declarative `PulpitoStance` DATA a line
// authors) so the geometry can change without touching the story registry,
// and out of the two screen components so the same math is exercised by one
// shared, directly-tested module rather than copy-pasted twice.
//
// The rule this file encodes (`docs/19` §4.1):
//   2. "En una esquina de abajo" — always a BOTTOM corner, never centred.
//   3. "Del lado contrario a lo que nombra, mirando hacia eso" — he stands
//      to one side, and his speech bubble (which is what actually "points",
//      since the art has no separate pointing pose) opens TOWARD the
//      centre of the screen, never further into the corner it would run
//      off. That is `stanceBubbleSide`, below: the side of his own body the
//      bubble's tail sits BESIDE (`bubblePlacement.ts`'s own `side` option)
//      is always the side facing inward — a bubble anchored to his outer
//      side would immediately hit the screen edge and have nowhere to grow.
//
// This resolves prewriting-stage-completion's own open checklist item "the
// bubble should be a bit further to the right (in the current centred
// layouts)": a centred layout is exactly what this task removes. For the
// sensible DEFAULT corner (`DEFAULT_PULPITO_STANCE`, 'left'), the bubble
// opens rightward from his left-corner body — already further right than a
// centred box's tail-side bias ever put it.
import type { PulpitoCorner, PulpitoStance } from '../zoo/adventures'
import { OCTOPUS_ART, PULPITO_POSE_ART, ZOO_OCTOPUS_BACKPACK_ART } from '../detective/assets'
import type { Box } from './bubblePlacement'

/** No per-line author bothered to declare a stance (every adventure row
 *  that predates T18) — the 'left' corner, chosen so the bubble's default
 *  'right'-side opening (`stanceBubbleSide`) reads left-to-right into the
 *  screen's own centre, the natural reading direction for Rioplatense
 *  Spanish. */
export const DEFAULT_PULPITO_STANCE: PulpitoStance = { corner: 'left' }

/** The stage's own bounded size — restated from `AdventureIntro.tsx`'s
 *  pre-T18 `INTRO_CSS` header (its own derivation of the 84dvh landscape
 *  clamp): `min(100%, ${STAGE_MAX_PX}px, ${STAGE_MAX_VH_FRAC * 100}dvh)`.
 *  T18 keeps this SAME bounded size — only the stage's own POSITION on the
 *  screen changes, from centred to a bottom corner (`docs/19` §4.1 rule 2)
 *  — rather than shrinking it further: a smaller stage would need a
 *  correspondingly smaller minimum font size to keep the same text fitting,
 *  and this size is already what `bubbleFit.test.ts`'s own registry sweep
 *  is proven against. Exported so `AdventureIntro.tsx`/`AdventureClosing.tsx`
 *  interpolate the exact same numbers into their CSS that the test assumes,
 *  and a future change to either cannot silently drift from the other. */
export const STAGE_MAX_PX = 620
export const STAGE_MAX_VH_FRAC = 0.84

/** Distance from the viewport's own bottom and side edges to the stage,
 *  percent of the viewport — the old centred layout's own `padding: 4%`. */
export const STAGE_MARGIN_PCT = 4

/** Distance from the STAGE's own side edge (whichever `corner` names) to
 *  the octopus, percent of the stage — the old centred layout implied no
 *  such margin (it centred instead), so this is a fresh choice: small
 *  enough that he still reads as "in the corner", large enough that his
 *  art does not touch the stage's own edge. */
export const OCTOPUS_CORNER_INSET = 4

/** The octopus's own size for a CORNER stance, percent of the stage width
 *  — slightly smaller than the OLD centred layout's `44%`
 *  (`bubblePlacement.ts`'s own `octopusBoxBySize`). A corner stance needs
 *  MORE vertical clearance above his head for the bubble than a centred one
 *  did: `bubbleFit.test.ts`'s own registry sweep is what set this exact
 *  number — smaller than 44 raises the octopus's own top edge, which is
 *  what actually bounds how tall (and by the bubble art's fixed aspect
 *  ratio, how wide) the bubble can grow before it is clipped by the
 *  stage's own top edge; `40` is the smallest reduction the sweep needed
 *  to keep every real intro/closing line comfortably above the readable
 *  floor at the smallest required viewport (844×390). A secondary benefit,
 *  not the reason this number was chosen: a smaller octopus also leaves
 *  more of the backdrop visible around him (`docs/19` §4.1 rule 1). This is
 *  sized BY WIDTH, for `ZOO_OCTOPUS_BACKPACK_ART` (near-square) — see
 *  `PROLOGUE_OCTOPUS_SIZE_PCT` below for the caretaker's own, different,
 *  height-based sibling. */
export const OCTOPUS_CORNER_SIZE_PCT = 40

/** `screen/PrologueOpening.tsx`'s own corner octopus size (T36,
 *  `odd/tasks/prewriting-stage-completion.md`) — a SIBLING of
 *  `OCTOPUS_CORNER_SIZE_PCT` above, not a shared constant, for the same
 *  reason `octopusBoxAtCorner` takes a `sizeBy` option at all: the caretaker
 *  (`ZOO_CARETAKER_ART`, 235×320) is a taller, narrower figure than
 *  `ZOO_OCTOPUS_BACKPACK_ART` (442×448, near square), so it is sized BY
 *  HEIGHT (`octopusBoxBySize`'s own pre-T36 header explained the same
 *  choice for the centred layout this replaces) rather than by width.
 *  Proven, not guessed, by `bubbleFit.test.ts`'s own dedicated
 *  `PrologueOpening.tsx` sweep block — the same "found empirically, then
 *  checked" convention `OCTOPUS_CORNER_SIZE_PCT`'s own header describes. */
export const PROLOGUE_OCTOPUS_SIZE_PCT = 40

/** [T49, `docs/23` D7] The Pulpito's pose drawings (`PULPITO_POSE_ART`) are
 *  portrait and wear a hat, so they are sized BY HEIGHT on a stage, at a
 *  height a little above the backpack octopus's own (40% wide = 40.5% tall)
 *  so his body reads about as big under the hat. Proven by
 *  `bubbleFit.test.ts`'s registry sweep, like `OCTOPUS_CORNER_SIZE_PCT`. */
export const STAGE_POSE_HEIGHT_PCT = 44

/** How a stage screen sizes the octopus picture it shows: a pose by height
 *  (`STAGE_POSE_HEIGHT_PCT`), any other figure (the backpack octopus, a
 *  beat's own `figure`) by width (`OCTOPUS_CORNER_SIZE_PCT`), as before. */
export function stageOctopusSizing(art: { readonly href: string }): Pick<OctopusCornerOptions, 'sizeBy' | 'size'> {
  const isPose = Object.values(PULPITO_POSE_ART).some((pose) => pose.href === art.href)
  return isPose ? { sizeBy: 'height', size: STAGE_POSE_HEIGHT_PCT } : { sizeBy: 'width', size: OCTOPUS_CORNER_SIZE_PCT }
}

/** [T49] The entry screen points at the scene (`docs/19` §4.1: he stands
 *  away from what he names and points at it). The drawing points to the
 *  RIGHT; in the right corner it is mirrored so he points at the centre. */
export const INTRO_OCTOPUS_ART = PULPITO_POSE_ART.points

/** [T49] A rescue closing: "el Pulpito festeja" (`docs/19` §1 step 5). */
export const RESCUE_OCTOPUS_ART = PULPITO_POSE_ART.cheers

/** The stage's own bounded width/height, in real CSS pixels, for a given
 *  viewport — the pure arithmetic behind `min(100%, ${STAGE_MAX_PX}px,
 *  ${STAGE_MAX_VH_FRAC * 100}dvh)`, so `bubbleFit.test.ts` can compute real
 *  pixel font sizes for the required viewports without a browser. */
export function stageSizePx(viewportWidth: number, viewportHeight: number): number {
  return Math.min(viewportWidth, STAGE_MAX_PX, STAGE_MAX_VH_FRAC * viewportHeight)
}

/** [T51] Where the speech bubble's tail tip lands on a stage figure, as a
 *  fraction of the figure's own UNMIRRORED box (x of its width, y of its
 *  height), for the LEFT corner (bubble opening to his right); the right
 *  corner mirrors x. Measured on the shipped PNGs (per row the rightmost
 *  opaque pixel, per column the topmost): each anchor sits in free space
 *  just beside the head, with nothing of the figure above or to the right
 *  of it, where the tail rises toward the bubble.
 *  - points (279x337): head and hat end at x 0.62 down to y 0.35, the
 *    pointing tentacle starts at y 0.40 -> beside his cheek, (0.70, 0.33).
 *  - cheers (258x332): both raised tentacles reach y 0.11 at x 0.85-0.9 and
 *    the hat brim ends at x 0.70 (top 0.13) -> just over the brim's right
 *    end, (0.72, 0.06), clear of the raised tentacle.
 *  - thinks (228x346, the deduction): head right edge x 0.80 at y 0.30-0.35,
 *    columns 0.85-0.90 start at y 0.51 -> (0.86, 0.30), where he looks.
 *  - backpack (442x448): the head's right edge is x 0.78 at y 0.25-0.30,
 *    columns 0.80-0.95 start at y 0.33 or lower -> (0.80, 0.20).
 *  - carrier, with the lens (326x384, a closing beat's figure): head right
 *    edge x 0.88 at y 0.30, columns 0.90-0.95 start at y 0.45 -> (0.93, 0.32).
 *  Before T51 the tip landed 2% above the box's top edge at 78% of its
 *  width, which on the T49 poses is above the hat's crown: lower anchors
 *  point at the head and also let the bubble grow (its height is bounded
 *  by how far the tip sits below the stage's top). */
export const STAGE_SPEECH_ANCHORS: ReadonlyMap<string, { readonly x: number; readonly y: number }> = new Map([
  [PULPITO_POSE_ART.points.href, { x: 0.7, y: 0.33 }],
  [PULPITO_POSE_ART.cheers.href, { x: 0.72, y: 0.06 }],
  [PULPITO_POSE_ART.thinks.href, { x: 0.86, y: 0.3 }],
  [ZOO_OCTOPUS_BACKPACK_ART.href, { x: 0.8, y: 0.2 }],
  [OCTOPUS_ART.href, { x: 0.93, y: 0.32 }],
])

/** The tail-tip target for `art` standing in `box` at `corner`, or
 *  `undefined` for a figure with no measured anchor (the bubble then aims
 *  `gap` above the box, `bubblePlacement.ts`'s default). */
export function stageSpeechTarget(
  art: { readonly href: string },
  box: Box,
  corner: PulpitoCorner,
): { readonly x: number; readonly y: number } | undefined {
  const anchor = STAGE_SPEECH_ANCHORS.get(art.href)
  if (!anchor) return undefined
  const fx = corner === 'left' ? anchor.x : 1 - anchor.x
  return { x: box.x + box.w * fx, y: box.y + box.h * anchor.y }
}

/** [T51] The frame an entry or closing screen places its bubble in, in the
 *  stage's own percent units. The stage square sits at the screen's LEFT
 *  edge (`.cv-intro-frame`/`.cv-closing-frame` set no left), so on any
 *  screen wider than the stage the room to its right is free: the frame
 *  reaches the screen's right edge instead of the square's, which lets the
 *  bubble of a left-corner Pulpito grow until the stage's TOP bounds it.
 *  Without a viewport (SSR) it is the plain 100x100 square, as before. */
export function stageBubbleFrame(viewport: { readonly width: number; readonly height: number } | undefined): {
  readonly w: number
  readonly h: number
} {
  if (!viewport) return { w: 100, h: 100 }
  const stage = stageSizePx(viewport.width, viewport.height)
  return { w: stage > 0 ? Math.max(100, (viewport.width / stage) * 100) : 100, h: 100 }
}

/** `stance ?? DEFAULT_PULPITO_STANCE` — a named function instead of the
 *  bare `??` at every call site, so a future third corner (there is none
 *  today; `docs/19` never asks for a top corner) has exactly one place to
 *  widen the fallback. */
export function resolvePulpitoStance(stance: PulpitoStance | undefined): PulpitoStance {
  return stance ?? DEFAULT_PULPITO_STANCE
}

export interface OctopusCornerOptions {
  readonly corner: PulpitoCorner
  /** Which CSS dimension the octopus is sized by — see
   *  `bubblePlacement.ts`'s own `OctopusBoxOptions.sizeBy` comment. */
  readonly sizeBy: 'width' | 'height'
  /** The sized dimension, as a percent of the (square) frame. */
  readonly size: number
  /** Distance from the frame's own bottom edge, as a percent of the frame. */
  readonly bottom: number
  /** Distance from the frame's own left OR right edge (whichever `corner`
   *  names), as a percent of the frame. */
  readonly inset: number
}

/**
 * The octopus's own rendered box for a CORNER stance, in percent of the
 * square frame — `bubblePlacement.ts`'s `octopusBoxBySize` restated for a
 * corner instead of a horizontally-centred `left: 50%`. Kept as a sibling
 * function rather than a `corner?` option on `octopusBoxBySize` itself:
 * that function's own centred formula (`x = 50 - w / 2`) is a special case
 * this one does not reduce to (a "centre corner" is not a corner), and
 * `PrologueOpening.tsx` — unchanged by this task, `docs/19` §4.2 — still
 * needs the centred one exactly as it is.
 */
export function octopusBoxAtCorner(art: { readonly w: number; readonly h: number }, opts: OctopusCornerOptions): Box {
  const artAspect = art.h / art.w
  const w = opts.sizeBy === 'width' ? opts.size : opts.size / artAspect
  const h = opts.sizeBy === 'width' ? opts.size * artAspect : opts.size
  const x = opts.corner === 'left' ? opts.inset : 100 - opts.inset - w
  return { x, y: 100 - opts.bottom - h, w, h }
}

/**
 * Which side of the octopus's own head the speech bubble opens toward —
 * always the side facing the screen's centre, per this file's own header.
 * Matches `bubblePlacement.ts`'s `PlaceSpeechBubbleOptions.side`.
 */
export function stanceBubbleSide(corner: PulpitoCorner): 'left' | 'right' {
  return corner === 'left' ? 'right' : 'left'
}
