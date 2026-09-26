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
import type { BubbleContentFit } from './bubbleFit'
import type { BubblePlacement } from './bubblePlacement'

export interface BubbleContentFracs {
  readonly contentLeftFrac: number
  readonly contentTopFrac: number
  readonly contentWidthFrac: number
  readonly gapFrac: number
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
  const vars: Record<string, string> = {
    '--cv-content-left': `${fracs.contentLeftFrac * 100}cqw`,
    '--cv-content-top': `${fracs.contentTopFrac * 100}cqw`,
    '--cv-content-width': `${fracs.contentWidthFrac * 100}cqw`,
    '--cv-gap': `${fracs.gapFrac * 100}cqw`,
    '--cv-image-w': toCqw(content.imageWidth),
    '--cv-image-h': toCqw(content.imageHeight),
    '--cv-caption-font': toCqw(content.fontSize),
  }
  return vars as CSSProperties
}
