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
 *  (`bubblePlacement.ts`'s own `octopusBoxBySize`, still `44` for
 *  `PrologueOpening.tsx`, unchanged by this task). A corner stance needs
 *  MORE vertical clearance above his head for the bubble than a centred one
 *  did: `bubbleFit.test.ts`'s own registry sweep is what set this exact
 *  number — smaller than 44 raises the octopus's own top edge, which is
 *  what actually bounds how tall (and by the bubble art's fixed aspect
 *  ratio, how wide) the bubble can grow before it is clipped by the
 *  stage's own top edge; `40` is the smallest reduction the sweep needed
 *  to keep every real intro/closing line comfortably above the readable
 *  floor at the smallest required viewport (844×390). A secondary benefit,
 *  not the reason this number was chosen: a smaller octopus also leaves
 *  more of the backdrop visible around him (`docs/19` §4.1 rule 1). */
export const OCTOPUS_CORNER_SIZE_PCT = 40

/** The stage's own bounded width/height, in real CSS pixels, for a given
 *  viewport — the pure arithmetic behind `min(100%, ${STAGE_MAX_PX}px,
 *  ${STAGE_MAX_VH_FRAC * 100}dvh)`, so `bubbleFit.test.ts` can compute real
 *  pixel font sizes for the required viewports without a browser. */
export function stageSizePx(viewportWidth: number, viewportHeight: number): number {
  return Math.min(viewportWidth, STAGE_MAX_PX, STAGE_MAX_VH_FRAC * viewportHeight)
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
