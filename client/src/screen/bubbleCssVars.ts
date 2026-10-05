// Converts `bubbleFit.ts`'s pure geometry into CSS custom properties, in
// `cqw` — a `container-type: inline-size` context's own width-relative
// unit (`AdventureIntro.tsx`'s/`AdventureClosing.tsx`'s `.cv-*-bubble`
// rule). `bubbleFit.ts` computes every content measurement (image size,
// gap, font size) as a plain number in the SAME base unit as
// `BubblePlacement.width` itself (`bubblePlacement.ts`'s own "percent of
// frame" convention) — dividing by that same `placement.width` yields
// exactly "percent of the BUBBLE's own width", which is what `cqw` means
// once the bubble element establishes its own inline-size container. This
// is the one place that division happens, so the two `.tsx` screens that
// call it never have to restate it.
//
// Kept out of `bubbleFit.ts` on purpose: that module is pure geometry, with
// no notion of a CSS property name; this one is pure string formatting, with
// no notion of layout math. Neither needs a DOM to be exercised.
import type { CSSProperties } from 'react'
import type { BubbleContentFit, BubbleRect } from './bubbleFit'
import type { BubblePlacement } from './bubblePlacement'

export interface BubbleContentFracs {
  readonly contentLeftFrac: number
  readonly contentTopFrac: number
  readonly contentWidthFrac: number
  readonly gapFrac: number
  /** T34 (`odd/tasks/prewriting-stage-completion.md`): the content SAFE
   *  BOX's own height, as a fraction of the bubble's HEIGHT (`bubbleFit.ts`'s
   *  `CONTENT_HEIGHT_FRAC`). Optional and additive-only: when given,
   *  `--cv-content-top` is nudged DOWN by half the leftover room between
   *  this budget and `content.blockHeight`, vertically centering a short
   *  block instead of pinning it to the box's top edge (the closing bubble's
   *  own reported bug: a short rescue line sat at the top with empty space
   *  below). Never nudged UP past `contentTopFrac`, and the shift is at most
   *  half the leftover room, so the block's own bottom edge can only move
   *  toward the box's bottom bound, never past it -- `bubbleFit.ts`'s own
   *  overflow guarantee stays exactly as wide as before. Omitted by callers
   *  that never asked for centering (`AdventureIntro.tsx`, `Deduction.tsx`),
   *  which keep the pre-T34 top-pinned behaviour unchanged. */
  readonly contentHeightFrac?: number
}

/** A `CSSProperties`-shaped object carrying only custom properties
 *  (`--cv-*`), meant to be spread into a `.cv-*-bubble` element's own
 *  inline `style` alongside its `left`/`top`/`width`. Cast through
 *  `Record<string, string>` because `CSSProperties` itself has no typed
 *  slot for an arbitrary custom property name — the same escape hatch
 *  every CSS-variable-writing React component needs. */
export function bubbleContentCssVars(
  placement: BubblePlacement,
  content: BubbleContentFit,
  fracs: BubbleContentFracs,
): CSSProperties {
  const toCqw = (value: number): string => `${(value / placement.width) * 100}cqw`
  // [T51] `contentTopFrac` is a fraction of the bubble's HEIGHT, and `cqw`
  // is a percent of its WIDTH: convert through the bubble's own aspect.
  // Until T51 this wrote the raw fraction as cqw, which put every caption
  // `contentTopFrac * (1 - aspect)` of the width LOWER than the fit assumed
  // (about 4% of the bubble's width) — half of why the last line touched
  // the left bubble's lower edge.
  let contentTopCqw = (fracs.contentTopFrac * placement.height * 100) / placement.width
  if (fracs.contentHeightFrac !== undefined) {
    // Both `budgetHeight` and `content.blockHeight` are frame-percent
    // quantities on `placement.height`'s own scale (`bubbleFit.ts`'s own
    // convention); converting the LEFTOVER through the same `/ placement.width`
    // division `toCqw` uses keeps this in the identical unit space every
    // other content measurement here already lives in.
    const budgetHeight = fracs.contentHeightFrac * placement.height
    const leftover = Math.max(0, budgetHeight - content.blockHeight)
    contentTopCqw += ((leftover / placement.width) * 100) / 2
  }
  const vars: Record<string, string> = {
    '--cv-content-left': `${fracs.contentLeftFrac * 100}cqw`,
    '--cv-content-top': `${contentTopCqw}cqw`,
    '--cv-content-width': `${fracs.contentWidthFrac * 100}cqw`,
    '--cv-gap': `${fracs.gapFrac * 100}cqw`,
    '--cv-image-w': toCqw(content.imageWidth),
    '--cv-image-h': toCqw(content.imageHeight),
    '--cv-caption-font': toCqw(content.fontSize),
  }
  return vars as CSSProperties
}

/** [T51] The `BubbleContentFracs` for a content box (`bubbleFit.ts`'s
 *  `BubbleRect`): `centre` passes its height too, which turns on the T34
 *  vertical centring. */
export function bubbleContentFracs(box: BubbleRect, gapFrac: number, centre: boolean): BubbleContentFracs {
  return {
    contentLeftFrac: box.left,
    contentTopFrac: box.top,
    contentWidthFrac: box.width,
    gapFrac,
    ...(centre ? { contentHeightFrac: box.height } : {}),
  }
}
