// Speech-bubble CONTENT fit (prewriting-stage-completion T18, the author's
// own checklist from the last test): "some texts overflow the bubble's
// sides" and "images inside the bubble are sometimes very big". Pure,
// DOM-free — the same convention `bubblePlacement.ts` follows, and for the
// same reason: this repo's test harness is `renderToString` in node, with
// no layout engine to measure real text against (`docs/…`'s own "no DOM
// libs" rule, restated by this task's own brief). A real glyph-width
// measurement is unavailable here, so `AVG_CHAR_WIDTH_FRACTION` below is a
// deliberately GENEROUS heuristic (wider than Nunito Bold's true average
// advance width) — the goal is "never overflow", and over-estimating a
// word's width can only make this shrink text/grow the bubble MORE than a
// real measurement would ask for, never less.
//
// Layout model (matches `AdventureIntro.tsx`'s/`AdventureClosing.tsx`'s own
// CSS box, restated here as fractions of the BUBBLE's own rendered size —
// itself a `BubblePlacement` in percent of the square frame,
// `bubblePlacement.ts`'s own unit convention, so every number in this file
// is directly comparable to a `BubblePlacement.width`/`.height`). The image
// FLOATS at the top of the content box (real CSS `float: left` in the
// component, `AdventureIntro.tsx`'s own `INTRO_CSS` comment on
// `.cv-captioned`) rather than sitting in a fixed side-by-side row: the
// caption text wraps NARROW alongside the image, then drops to the FULL
// content width once it passes the image's own bottom edge — exactly what
// a browser already does for free with a floated element, and precisely
// the layout that let the longest intro sentences in this game's registry
// (peces/tortugas/monos/monkeys, ~100+ characters) reach a comfortably
// readable font at the smallest required viewport: an early version of
// this file kept the image and caption in one fixed-width flex ROW for the
// text's WHOLE height, which — for a wide-but-short image beside a
// hundred-character sentence — left so little usable width that even the
// minimum font size still overflowed (`bubbleFit.test.ts`'s own commit
// history/this task's report has the measured numbers).
//
//   +-------------------------------------------+  <- bubble box (the PNG's
//   |                                            |     own bounding box)
//   |   +------------------------------------+   |  <- CONTENT box:
//   |   | [img]  caption text starts here    |   |     inset from the
//   |   | [img]  wraps NARROW beside the img  |   |     bubble by
//   |   | caption text continues FULL WIDTH   |   |     CONTENT_*_FRAC
//   |   | once past the image's own height    |   |
//   |   +------------------------------------+   |
//   |                                            |
//   +---------------------------[tail]-----------+
//
// The image is capped at `IMAGE_MAX_WIDTH_FRAC` of the BUBBLE's own width
// (the checklist's own number, "≤ 35%"), not of the narrower content box —
// authored as a fraction of the whole bubble because that is the unit the
// checklist itself names.
import type { ArtImage } from '../detective/assets'
import { placeSpeechBubble, type BubblePlacement, type PlaceSpeechBubbleOptions } from './bubblePlacement'

/** Inset of the content box from the bubble's own edges, percent of the
 *  bubble — widened from the pre-T18 `.cv-captioned` CSS (`left: 10%;
 *  right: 10%; top: 16%; height: 58%`) after `bubbleFit.test.ts`'s own
 *  sweep of every real registry line found the old 58%-tall box too short
 *  for the longest intro sentences (peces/tortugas/monos, ~100 characters)
 *  to reach even the minimum font size without overflowing — the bubble's
 *  oval body has more usable height above and below that old narrow band
 *  than the pre-T18 CSS assumed, so this claims more of it rather than
 *  shrinking text further. */
export const CONTENT_LEFT_FRAC = 0.1
export const CONTENT_TOP_FRAC = 0.14
export const CONTENT_WIDTH_FRAC = 0.8
export const CONTENT_HEIGHT_FRAC = 0.66

/** The checklist's own cap: an inline image never exceeds 35% of the
 *  bubble's own width. */
export const IMAGE_MAX_WIDTH_FRAC = 0.35
/** Additional cap so a very TALL image (portrait art) cannot blow past the
 *  content box's own height either — leaves a small margin under the exact
 *  content height so the image never touches the caption's own line box. */
export const IMAGE_MAX_HEIGHT_FRAC = 0.92

/** Gap between the image and the caption, percent of the bubble's width —
 *  matches the pre-T18 CSS's `gap: 4cqw` (of the frame; restated here as a
 *  fraction of the bubble, which is itself a large majority of the frame in
 *  every real case, so the visual gap stays essentially the same size). */
export const GAP_FRAC = 0.04

/** Font size bounds, percent of the bubble's own width. `MAX` reproduces
 *  the pre-T18 fixed `5.6cqw` (of the FRAME) for the common case: a
 *  default-width bubble is ~78% of the frame, and `0.072 * 78 ≈ 5.6`. `MIN`
 *  is the floor this task's own brief asks for ("shrink the font within a
 *  minimum readable size") — chosen, and then PROVEN by
 *  `bubbleFit.test.ts`'s own fixture sweep, to still fit every real
 *  intro/closing line in this game's registry at the required viewports. */
export const MAX_FONT_FRAC = 0.072
export const MIN_FONT_FRAC = 0.05

export const LINE_HEIGHT = 1.14

/** A generous average glyph advance width, as a fraction of the font size
 *  — see this file's own header on why wider-than-real is the safe
 *  direction. Nunito Bold's true average is closer to 0.5; treating the
 *  inter-word space as costing the same as a character is an additional
 *  safety margin on top of that. */
const AVG_CHAR_WIDTH_FRACTION = 0.54

/**
 * How many lines `text` wraps into at `fontSize`, inside a plain
 * (non-floating) box of `maxWidth` — a greedy word-wrap simulation, the
 * same algorithm a real text layout engine runs, just measuring each word
 * by its character COUNT instead of its real glyph widths. A single word
 * wider than `maxWidth` still occupies only one line (this model cannot
 * break mid-word, the one case where it can UNDER-count — Spanish sentence
 * words are short enough in this game's registry that `bubbleFit.test.ts`
 * checks this never actually triggers). Exported for direct testing and for
 * any future caller with no floated image (`fitBubbleContent`, below, uses
 * `wrapFloatingBlock` instead, which calls this once per row).
 */
export function wrapLineCount(text: string, fontSize: number, maxWidth: number): number {
  const charWidth = fontSize * AVG_CHAR_WIDTH_FRACTION
  const words = text.split(' ').filter((w) => w.length > 0)
  if (words.length === 0) return 1
  let lines = 1
  let lineWidth = 0
  for (const word of words) {
    const wordWidth = word.length * charWidth
    const candidate = lineWidth === 0 ? wordWidth : lineWidth + charWidth + wordWidth
    if (candidate > maxWidth && lineWidth > 0) {
      lines += 1
      lineWidth = wordWidth
    } else {
      lineWidth = candidate
    }
  }
  return lines
}

export interface FloatingBlockFit {
  readonly lineCount: number
  readonly blockHeight: number
}

/**
 * `wrapLineCount`'s own greedy fill, generalised for a FLOATED image at the
 * top of the box (this file's own header diagram): each line's available
 * width is `narrowWidth` while the block's running height is still under
 * `floatHeight` (beside the image), and `wideWidth` afterward (below it) —
 * matches real CSS `float: left` word-wrap exactly, just measuring by
 * character count instead of real glyph widths (`wrapLineCount`'s own
 * caveat applies here too). `floatHeight <= 0` (no image at all) is the
 * degenerate case where every line already uses `wideWidth`.
 */
export function wrapFloatingBlock(
  text: string,
  fontSize: number,
  narrowWidth: number,
  wideWidth: number,
  floatHeight: number,
  lineHeight: number,
): FloatingBlockFit {
  const charWidth = fontSize * AVG_CHAR_WIDTH_FRACTION
  const words = text.split(' ').filter((w) => w.length > 0)
  if (words.length === 0) return { lineCount: 1, blockHeight: fontSize * lineHeight }

  let lineCount = 0
  let blockHeight = 0
  let i = 0
  while (i < words.length) {
    const available = blockHeight < floatHeight ? narrowWidth : wideWidth
    let lineWidth = 0
    while (i < words.length) {
      const wordWidth = words[i].length * charWidth
      const candidate = lineWidth === 0 ? wordWidth : lineWidth + charWidth + wordWidth
      if (candidate > available && lineWidth > 0) break
      lineWidth = candidate
      i++
    }
    lineCount += 1
    blockHeight += fontSize * lineHeight
  }
  return { lineCount, blockHeight }
}

export interface BubbleContentFit {
  /** Chosen font size, percent of the bubble's own width — the largest
   *  value in `[MIN_FONT_FRAC, MAX_FONT_FRAC] * bubbleWidth` whose wrapped
   *  block still fits the content box's height, or `MIN_FONT_FRAC *
   *  bubbleWidth` when even that overflows (see `fits`, below). */
  readonly fontSize: number
  readonly lineHeight: number
  readonly lineCount: number
  readonly imageWidth: number
  readonly imageHeight: number
  readonly captionWidth: number
  readonly captionHeight: number
  /** `false` only when the text still overflows the content box's height
   *  at the MINIMUM font size — the caller's signal to ask for a WIDER
   *  bubble (`placeAndFitBubble`, below) rather than shrink further past
   *  the readable floor. */
  readonly fits: boolean
}

/**
 * Fits `text` and `art` inside a bubble of `bubbleWidth`×`bubbleHeight`
 * (same percent-of-frame units as `BubblePlacement`). The image is sized
 * first (independent of the text — its cap is a fixed fraction of the
 * bubble, never negotiated away) and floats at the top of the content box;
 * the caption wraps narrow beside it and full-width below it
 * (`wrapFloatingBlock`), and the font shrinks only as far as `MIN_FONT_FRAC`
 * before this reports `fits: false`. `captionWidth` in the result is the
 * NARROW (beside-the-image) width, for a caller that wants one representative
 * number — the component itself renders the caption at the full content
 * width via a real CSS float, and the browser reflows automatically.
 */
export function fitBubbleContent(text: string, art: ArtImage, bubbleWidth: number, bubbleHeight: number): BubbleContentFit {
  const contentWidth = bubbleWidth * CONTENT_WIDTH_FRAC
  const contentHeight = bubbleHeight * CONTENT_HEIGHT_FRAC

  const artAspect = art.h / art.w
  const imageMaxWidth = bubbleWidth * IMAGE_MAX_WIDTH_FRAC
  const imageMaxHeight = contentHeight * IMAGE_MAX_HEIGHT_FRAC
  const imageWidth = Math.max(0, Math.min(imageMaxWidth, artAspect > 0 ? imageMaxHeight / artAspect : imageMaxWidth))
  const imageHeight = imageWidth * artAspect

  const gap = bubbleWidth * GAP_FRAC
  const narrowWidth = Math.max(0, contentWidth - imageWidth - gap)

  const maxFont = bubbleWidth * MAX_FONT_FRAC
  const minFont = bubbleWidth * MIN_FONT_FRAC

  const STEPS = 32
  let fontSize = maxFont
  let block = wrapFloatingBlock(text, fontSize, narrowWidth, contentWidth, imageHeight, LINE_HEIGHT)
  for (let i = 0; i < STEPS && block.blockHeight > contentHeight && fontSize > minFont; i++) {
    fontSize = Math.max(minFont, maxFont - ((maxFont - minFont) * (i + 1)) / STEPS)
    block = wrapFloatingBlock(text, fontSize, narrowWidth, contentWidth, imageHeight, LINE_HEIGHT)
  }

  const EPS = 1e-6
  return {
    fontSize,
    lineHeight: LINE_HEIGHT,
    lineCount: block.lineCount,
    imageWidth,
    imageHeight,
    captionWidth: narrowWidth,
    captionHeight: contentHeight,
    fits: block.blockHeight <= contentHeight + EPS,
  }
}

export interface PlaceAndFitBubbleOptions extends PlaceSpeechBubbleOptions {
  readonly text: string
  readonly art: ArtImage
}

export interface PlacedBubbleContent {
  readonly placement: BubblePlacement
  readonly content: BubbleContentFit
}

/** How far below its own `MAX_FONT_FRAC` a placement's chosen font is
 *  allowed to sit before `placeAndFitBubble` bothers trying a wider bubble
 *  — below this, the text has shrunk enough that more room is worth a
 *  visibly wider bubble; above it, a short line is already at (or very
 *  near) its natural size and widening would only inflate the bubble for
 *  no legibility gain. */
const GROWTH_TRIGGER_FRACTION = 0.85

/**
 * `placeSpeechBubble` plus `fitBubbleContent`, reconciled: places the
 * bubble at its usual `preferredWidth` first. A short line (the common
 * case) already reaches `MAX_FONT_FRAC` there and this returns it
 * unchanged — widening would only inflate the bubble with no legibility
 * gain. When the text needed real shrinking (`GROWTH_TRIGGER_FRACTION`) or
 * still does not fit at all, this retries at the WIDEST bubble the
 * frame/`headBox` geometry allows (`maxWidthFor`'s own bound inside
 * `placeSpeechBubble`, reached by requesting `frame.w - 2 * margin` as the
 * preferred width — both the extra width AND the extra height it carries,
 * since the bubble's own aspect ratio is fixed, help) and keeps whichever
 * attempt yields the LARGER font, so growing can only ever help, never
 * shrink a line further than the narrower placement already would have.
 * `bubbleFit.test.ts` sweeps every real registry line, at every required
 * viewport, and asserts the chosen result always reports `fits: true`.
 */
export function placeAndFitBubble(opts: PlaceAndFitBubbleOptions): PlacedBubbleContent {
  const { text, art, ...placementOpts } = opts
  const base = placeSpeechBubble(placementOpts)
  const baseContent = fitBubbleContent(text, art, base.width, base.height)
  const baseMaxFont = base.width * MAX_FONT_FRAC
  const needsGrowth = !baseContent.fits || baseContent.fontSize < baseMaxFont * GROWTH_TRIGGER_FRACTION
  if (!needsGrowth) return { placement: base, content: baseContent }

  const margin = placementOpts.margin ?? 3
  const grown = placeSpeechBubble({ ...placementOpts, preferredWidth: placementOpts.frame.w - 2 * margin })
  const grownContent = fitBubbleContent(text, art, grown.width, grown.height)
  if (grownContent.fontSize > baseContent.fontSize) {
    return { placement: grown, content: grownContent }
  }
  return { placement: base, content: baseContent }
}
