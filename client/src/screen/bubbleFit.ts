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
//
// T18 follow-up (orchestrator, after reviewing `cierre-duck-trail4-
// 1024x768.png`): a word must NEVER break inside itself — this is an app
// for children learning to read, and "¡Encontram / os al pato!" is not an
// acceptable outcome even though it never overflowed the bubble. A SHORT
// line (the duck's own closing line) is never forced to shrink, so it kept
// its large "normal" font — and at that size, a merely 11-character word
// beside a TALL portrait image (the narrow float column) no longer fit,
// and `overflow-wrap: break-word` silently split it to avoid a real
// overflow. The fix has two parts: `fitBubbleContent` now checks the
// LONGEST WORD against whichever column it would land in (`longestWordWidth`,
// measured the same way `wrapLineCount`/`wrapFloatingBlock` measure a whole
// line), and falls back to a STACKED layout (image above, caption at the
// full content width below — no narrow column at all) whenever the floated
// layout cannot fit that word at its own normal, height-determined size.
// `AdventureIntro.tsx`/`AdventureClosing.tsx` no longer set
// `overflow-wrap: break-word` on the caption at all: with the longest word
// checked before a font size is ever chosen, there is nothing left to fall
// back on breaking FOR.
import type { ArtImage } from '../detective/assets'
import { placeSpeechBubble, type BubblePlacement, type PlaceSpeechBubbleOptions } from './bubblePlacement'

/** Inset of the content box from the bubble's own edges, percent of the
 *  bubble. Measured directly against the shipped
 *  `client/public/art/zoo-speech-bubble.png` (488×372, a standalone PNG
 *  decode + per-row opaque-pixel scan, the same convention
 *  `bubblePlacement.ts`'s own header describes for the tail): a rectangle
 *  inset 10% from each SIDE (this file's own `CONTENT_WIDTH_FRAC`) sits
 *  fully inside the drawn oval only for rows between about 16% and 76% of
 *  the bubble's height — above 16% the oval narrows in from the top, and
 *  past 76% it is already narrowing into the tail (which fully separates
 *  at 86%, `bubblePlacement.ts`'s own measurement). `16%`/`58%` (ending at
 *  74%) keeps a small margin inside that measured safe range on both ends.
 *
 *  An earlier version of this file widened this to `14%`/`66%` (ending at
 *  80%) to give the longest intro sentences more room — which DID fit by
 *  this file's own height arithmetic, but 80% reaches past the measured
 *  76% safe bound, so the text's own bottom line rendered OUTSIDE the
 *  drawn bubble in the real browser (`intro-monkeys1-1024x768.png`, an
 *  orchestrator-reported follow-up). The STACK layout (this file's own
 *  header) is what actually solves "a long sentence needs more room" now —
 *  by removing the image's narrow column entirely rather than by claiming
 *  more of the bubble than it can safely draw text in — so this reverts to
 *  the measured-safe values instead of re-widening them. */
export const CONTENT_LEFT_FRAC = 0.1
export const CONTENT_TOP_FRAC = 0.16
export const CONTENT_WIDTH_FRAC = 0.8
export const CONTENT_HEIGHT_FRAC = 0.58

/** The checklist's own cap: an inline image never exceeds 35% of the
 *  bubble's own width. */
export const IMAGE_MAX_WIDTH_FRAC = 0.35
/** Additional cap so a very TALL image (portrait art) cannot blow past the
 *  content box's own height either — leaves a small margin under the exact
 *  content height so the image never touches the caption's own line box.
 *  Only used by the FLOAT layout: there, the image's own height coexists
 *  with the caption's early, narrow-column lines rather than being added on
 *  top of them, so a tall image spending most of the content box's height
 *  still leaves the LATER (full-width) lines their own room. */
export const IMAGE_MAX_HEIGHT_FRAC = 0.92

/** The STACK layout's own, much smaller image height cap (T18 follow-up,
 *  this file's own header): here the image's height and the caption's own
 *  block height are ADDITIVE (image above, text below), so reusing FLOAT's
 *  92% cap on a tall portrait image (this follow-up's own duck-closing
 *  example: `pato`'s art is taller than it is wide) left stacked text
 *  almost no room at all and made `fits` FALSE for a line that used to fit
 *  fine in the float layout. Capping the image at well under half the
 *  content box's height guarantees the stacked caption always keeps the
 *  majority of it, regardless of how tall the source art is. */
export const IMAGE_STACK_MAX_HEIGHT_FRAC = 0.3

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

/** One WORD as `assignFloatingWordColumns`/`assignWordColumns` place it: its
 *  own measured width, and the width of the COLUMN (narrow, beside the
 *  image; wide/full, below it or with no image at all) the wrap actually
 *  put it in — T18 follow-up (this file's own header): the never-break-a-
 *  word contract this app needs, checked PER WORD rather than only for the
 *  text's single longest one, so `bubbleFit.test.ts` can verify it directly
 *  against the exact assignment the real wrap produces, not merely trust
 *  that "longest word fits the narrowest column" implies every other word
 *  does too (true by construction, but this is the independent check). */
export interface WordColumnAssignment {
  readonly word: string
  readonly width: number
  readonly columnWidth: number
}

/**
 * Every word of `text` at `fontSize`, each paired with the column width of
 * whichever line the SAME greedy fill `wrapLineCount` runs actually placed
 * it on — one column width throughout, since there is no floated image.
 */
export function assignWordColumns(text: string, fontSize: number, maxWidth: number): WordColumnAssignment[] {
  const charWidth = fontSize * AVG_CHAR_WIDTH_FRACTION
  const words = text.split(' ').filter((w) => w.length > 0)
  return words.map((word) => ({ word, width: word.length * charWidth, columnWidth: maxWidth }))
}

/**
 * The widest single WORD in `text`, at `fontSize` — measured with the exact
 * same per-character heuristic `wrapLineCount`/`wrapFloatingBlock` use for a
 * whole line (`AVG_CHAR_WIDTH_FRACTION`), so a word this function clears is
 * guaranteed not to be the reason either of those functions would have
 * broken a line early. Empty text has no word to overflow anything, so this
 * returns `0`. Punctuation attached to a word (Spanish's leading `¡`/`¿`)
 * counts as part of it, same as `wrapLineCount`'s own `word.length`.
 */
export function longestWordWidth(text: string, fontSize: number): number {
  const charWidth = fontSize * AVG_CHAR_WIDTH_FRACTION
  const words = text.split(' ').filter((w) => w.length > 0)
  let widest = 0
  for (const word of words) widest = Math.max(widest, word.length * charWidth)
  return widest
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
interface FloatingLayout extends FloatingBlockFit {
  readonly words: WordColumnAssignment[]
}

/**
 * The ONE greedy fill both `wrapFloatingBlock` and `assignFloatingWordColumns`
 * read from — computing the line/block metrics and the per-word column
 * assignment in the SAME pass, so a test reading `.words` is guaranteed to
 * see the exact assignment that produced `.lineCount`/`.blockHeight`,
 * never a second, independently-reconstructed approximation of it (the
 * T18 follow-up's own reason for factoring this out: two parallel
 * re-implementations of one wrap algorithm are exactly the kind of thing
 * that quietly drifts apart). Each line's available width is `narrowWidth`
 * while the block's running height is still under `floatHeight` (beside
 * the image), and `wideWidth` afterward (below it) — matches real CSS
 * `float: left` word-wrap exactly, just measuring by character count
 * instead of real glyph widths. `floatHeight <= 0` (no image at all) is the
 * degenerate case where every line already uses `wideWidth`.
 */
function layoutFloatingWords(
  text: string,
  fontSize: number,
  narrowWidth: number,
  wideWidth: number,
  floatHeight: number,
  lineHeight: number,
): FloatingLayout {
  const charWidth = fontSize * AVG_CHAR_WIDTH_FRACTION
  const words = text.split(' ').filter((w) => w.length > 0)
  if (words.length === 0) return { lineCount: 1, blockHeight: fontSize * lineHeight, words: [] }

  const assignments: WordColumnAssignment[] = []
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
      assignments.push({ word: words[i], width: wordWidth, columnWidth: available })
      lineWidth = candidate
      i++
    }
    lineCount += 1
    blockHeight += fontSize * lineHeight
  }
  return { lineCount, blockHeight, words: assignments }
}

export function wrapFloatingBlock(
  text: string,
  fontSize: number,
  narrowWidth: number,
  wideWidth: number,
  floatHeight: number,
  lineHeight: number,
): FloatingBlockFit {
  const { lineCount, blockHeight } = layoutFloatingWords(text, fontSize, narrowWidth, wideWidth, floatHeight, lineHeight)
  return { lineCount, blockHeight }
}

/**
 * Every word of `text` at `fontSize`, each paired with the column width
 * (`narrowWidth` while beside the image, `wideWidth` once past its own
 * `floatHeight`) the SAME greedy fill `wrapFloatingBlock` runs actually
 * placed it on — the exact assignment `bubbleFit.test.ts`'s never-break-a-
 * word check verifies directly, word by word (this file's own header on
 * the T18 follow-up). `floatHeight <= 0` (no image) degenerates to every
 * word using `wideWidth`, matching `wrapFloatingBlock`'s own contract.
 */
export function assignFloatingWordColumns(
  text: string,
  fontSize: number,
  narrowWidth: number,
  wideWidth: number,
  floatHeight: number,
  lineHeight: number,
): WordColumnAssignment[] {
  return layoutFloatingWords(text, fontSize, narrowWidth, wideWidth, floatHeight, lineHeight).words
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
  /** `'float'` (the image floats at the top of the content box, caption
   *  wraps narrow beside it) or `'stack'` (the image sits above the caption,
   *  which then always wraps at the FULL content width — no narrow column
   *  at all). `fitBubbleContent` picks `'stack'` whenever `'float'` cannot
   *  fit the text's own longest word at its normal, height-determined font
   *  size (`longestWordWidth`, this file's own header on the follow-up that
   *  added this) — never by shrinking the float font further, which would
   *  make a short line's bubble oddly small just to save one long word from
   *  moving to a stacked layout. */
  readonly layout: 'float' | 'stack'
  /** `false` only when the text still overflows the content box's height
   *  at the MINIMUM font size — the caller's signal to ask for a WIDER
   *  bubble (`placeAndFitBubble`, below) rather than shrink further past
   *  the readable floor. */
  readonly fits: boolean
}

const EPS = 1e-6

/** Shrinks `fontSize` from `maxFont` down to `minFont` in `STEPS` even
 *  steps, stopping at the first (largest) size whose `measure` reports a
 *  fitting block — the shared search both the FLOAT and the STACK attempt
 *  below run, over their own different wrap function. */
function searchFontSize(
  maxFont: number,
  minFont: number,
  contentHeight: number,
  measure: (fontSize: number) => number,
): { fontSize: number; blockHeight: number } {
  const STEPS = 32
  let fontSize = maxFont
  let blockHeight = measure(fontSize)
  for (let i = 0; i < STEPS && blockHeight > contentHeight && fontSize > minFont; i++) {
    fontSize = Math.max(minFont, maxFont - ((maxFont - minFont) * (i + 1)) / STEPS)
    blockHeight = measure(fontSize)
  }
  return { fontSize, blockHeight }
}

/**
 * Fits `text` and `art` inside a bubble of `bubbleWidth`×`bubbleHeight`
 * (same percent-of-frame units as `BubblePlacement`). The image is sized
 * first (independent of the text — its cap is a fixed fraction of the
 * bubble, never negotiated away).
 *
 * Two layouts are tried, in order (this file's own header, "T18 follow-up"):
 *
 * 1. FLOAT — the image floats at the top of the content box
 *    (`wrapFloatingBlock`); the font shrinks only as far as `MIN_FONT_FRAC`
 *    to fit the content box's height. This layout wins outright only when,
 *    AT THAT font size, the text's own longest word still fits the NARROW
 *    (beside-the-image) column (`longestWordWidth`) AND the whole wrapped
 *    block still fits the content box's (measured-safe, `CONTENT_HEIGHT_
 *    FRAC`'s own header) height — the common case for most lines in the
 *    registry.
 * 2. STACK — tried whenever EITHER of FLOAT's two checks fails: either the
 *    text's longest word cannot fit the narrow column at FLOAT's normal
 *    size (a SHORT line beside a tall image — the duck-closing case this
 *    follow-up's own header describes), or the wrapped block simply needs
 *    more height than the content box safely has (a very long sentence,
 *    peces/tortugas/monos/monkeys — narrow columns force many short lines).
 *    The image moves above the caption instead of beside it, so the caption
 *    always wraps at the FULL content width and never sees a narrow column
 *    at all — which both frees width (fewer, longer lines) and removes the
 *    one thing FLOAT could fail on. The font search reruns against
 *    `wrapLineCount` at that full width, with the image's own (STACK-sized)
 *    height plus one gap subtracted from the available content height first.
 *
 * `fits` is `false` only when even the winning layout's own checks fail at
 * its minimum font size — a genuine "no admissible layout" case
 * `bubbleFit.test.ts`'s own absurd-input fixture exercises; every real line
 * in this game's registry picks one of the two layouts above and reports
 * `fits: true`.
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

  // 1. FLOAT, at its own normal (height-determined) font size — accepted
  // only when BOTH its longest word fits the narrow column and the whole
  // block still fits the (measured-safe) content height at that size.
  const float = searchFontSize(maxFont, minFont, contentHeight, (fontSize) =>
    wrapFloatingBlock(text, fontSize, narrowWidth, contentWidth, imageHeight, LINE_HEIGHT).blockHeight,
  )
  const floatWordFits = imageHeight <= 0 || longestWordWidth(text, float.fontSize) <= narrowWidth + EPS
  const floatHeightFits = float.blockHeight <= contentHeight + EPS
  if (floatWordFits && floatHeightFits) {
    const block = wrapFloatingBlock(text, float.fontSize, narrowWidth, contentWidth, imageHeight, LINE_HEIGHT)
    return {
      fontSize: float.fontSize,
      lineHeight: LINE_HEIGHT,
      lineCount: block.lineCount,
      imageWidth,
      imageHeight,
      captionWidth: narrowWidth,
      captionHeight: contentHeight,
      layout: 'float',
      fits: true,
    }
  }

  // 2. STACK — the image no longer competes for WIDTH with any line, but its
  // own height and the caption's are now ADDITIVE, so it gets its own,
  // smaller height cap (`IMAGE_STACK_MAX_HEIGHT_FRAC`'s own header) rather
  // than reusing FLOAT's `imageHeight` — a tall portrait image capped only
  // by FLOAT's generous 92% would leave the stacked caption almost no room
  // at all.
  const stackImageMaxHeight = contentHeight * IMAGE_STACK_MAX_HEIGHT_FRAC
  const stackImageWidth = Math.max(0, Math.min(imageMaxWidth, artAspect > 0 ? stackImageMaxHeight / artAspect : imageMaxWidth))
  const stackImageHeight = stackImageWidth * artAspect

  const stackTextHeight = Math.max(0, contentHeight - stackImageHeight - gap)
  const stack = searchFontSize(maxFont, minFont, stackTextHeight, (fontSize) =>
    wrapLineCount(text, fontSize, contentWidth) * fontSize * LINE_HEIGHT,
  )
  const stackLineCount = wrapLineCount(text, stack.fontSize, contentWidth)
  const stackWordFits = longestWordWidth(text, stack.fontSize) <= contentWidth + EPS
  return {
    fontSize: stack.fontSize,
    lineHeight: LINE_HEIGHT,
    lineCount: stackLineCount,
    imageWidth: stackImageWidth,
    imageHeight: stackImageHeight,
    captionWidth: contentWidth,
    captionHeight: contentHeight,
    layout: 'stack',
    fits: stackWordFits && stackImageHeight + gap + stack.blockHeight <= contentHeight + EPS,
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
