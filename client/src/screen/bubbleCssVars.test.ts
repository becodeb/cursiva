// Pure CSS-variable formatting (`bubbleCssVars.ts`'s own header). Node
// environment, no DOM — the same convention `bubbleFit.test.ts` uses for
// this same kind of pure geometry.
//
// T34 (`odd/tasks/prewriting-stage-completion.md`): the closing bubble's own
// reported bug — a short line sat at the TOP of the oval with empty space
// below it. `bubbleContentCssVars` now accepts an optional `contentHeightFrac`
// and, when given, nudges `--cv-content-top` DOWN by half the leftover room
// between the content safe box's own height and `content.blockHeight` — this
// suite proves the shift's direction, its magnitude, and that it can only
// ever move the block's bottom edge TOWARD the box's own bottom bound, never
// past it (the box's pre-T34 overflow guarantee, unchanged).
import { describe, expect, it } from 'vitest'
import { bubbleContentCssVars, type BubbleContentFracs } from './bubbleCssVars'
import type { BubbleContentFit } from './bubbleFit'
import type { BubblePlacement } from './bubblePlacement'

const placement: BubblePlacement = {
  left: 10,
  top: 5,
  width: 78,
  height: 78 * (372 / 488),
  mirrored: false,
  tailOriginX: 12,
  tailOriginY: 99,
}

const baseContent: BubbleContentFit = {
  fontSize: 5,
  lineHeight: 1.14,
  lineCount: 1,
  imageWidth: 0,
  imageHeight: 0,
  captionWidth: 60,
  captionHeight: 45,
  blockHeight: 6, // one short line, far under the content box's own budget
  layout: 'float',
  fits: true,
}

const baseFracs: BubbleContentFracs = {
  contentLeftFrac: 0.1,
  contentTopFrac: 0.16,
  contentWidthFrac: 0.8,
  gapFrac: 0.04,
}

const readTop = (vars: Record<string, unknown>) => Number(String(vars['--cv-content-top']).replace('cqw', ''))

/** [T51] `contentTopFrac` is a fraction of the bubble's HEIGHT; in `cqw`
 *  (percent of its WIDTH) that is `frac * height / width * 100`. */
const topCqw = (frac: number) => (frac * placement.height * 100) / placement.width

describe('bubbleContentCssVars — T34 vertical centring', () => {
  it('without contentHeightFrac, --cv-content-top is the frac of the HEIGHT in cqw, unshifted (AdventureIntro.tsx/Deduction.tsx keep the pre-T34 top-pinned behaviour)', () => {
    const vars = bubbleContentCssVars(placement, baseContent, baseFracs) as Record<string, unknown>
    expect(readTop(vars)).toBeCloseTo(topCqw(baseFracs.contentTopFrac), 6)
  })

  it('[T51] the top converts through the bubble aspect: in px it is contentTopFrac of the bubble HEIGHT', () => {
    const vars = bubbleContentCssVars(placement, baseContent, baseFracs) as Record<string, unknown>
    const bubbleWidthPx = 400
    const topPx = (readTop(vars) / 100) * bubbleWidthPx
    expect(topPx).toBeCloseTo(baseFracs.contentTopFrac * bubbleWidthPx * (placement.height / placement.width), 6)
  })

  it('a short block (well under the budget) is nudged DOWN by half the leftover room', () => {
    const contentHeightFrac = 0.58
    const vars = bubbleContentCssVars(placement, baseContent, { ...baseFracs, contentHeightFrac }) as Record<
      string,
      unknown
    >
    const budgetHeight = contentHeightFrac * placement.height
    const leftover = budgetHeight - baseContent.blockHeight
    const expectedTop = topCqw(baseFracs.contentTopFrac) + ((leftover / placement.width) * 100) / 2
    expect(readTop(vars)).toBeCloseTo(expectedTop, 6)
    expect(readTop(vars)).toBeGreaterThan(topCqw(baseFracs.contentTopFrac))
  })

  it('a block that exactly fills the budget is not shifted at all', () => {
    const contentHeightFrac = 0.58
    const fullContent: BubbleContentFit = { ...baseContent, blockHeight: contentHeightFrac * placement.height }
    const vars = bubbleContentCssVars(placement, fullContent, { ...baseFracs, contentHeightFrac }) as Record<
      string,
      unknown
    >
    expect(readTop(vars)).toBeCloseTo(topCqw(baseFracs.contentTopFrac), 6)
  })

  it('a block reported LARGER than the budget (fits: false, at the font floor) is clamped to no shift at all — never pushed further down', () => {
    const contentHeightFrac = 0.58
    const overflowing: BubbleContentFit = {
      ...baseContent,
      blockHeight: contentHeightFrac * placement.height + 5,
      fits: false,
    }
    const vars = bubbleContentCssVars(placement, overflowing, { ...baseFracs, contentHeightFrac }) as Record<
      string,
      unknown
    >
    expect(readTop(vars)).toBeCloseTo(topCqw(baseFracs.contentTopFrac), 6)
  })

  it("the shifted block's own bottom edge never passes the box's own bottom bound (top shift + blockHeight <= budget, in the same unit space)", () => {
    const contentHeightFrac = 0.58
    for (const blockHeight of [2, 10, 20, contentHeightFrac * placement.height]) {
      const content: BubbleContentFit = { ...baseContent, blockHeight }
      const vars = bubbleContentCssVars(placement, content, { ...baseFracs, contentHeightFrac }) as Record<
        string,
        unknown
      >
      const topCqw = readTop(vars)
      const topFrameUnits = (topCqw / 100) * placement.width
      const bottomFrameUnits = topFrameUnits + content.blockHeight
      const boxBottomFrameUnits = baseFracs.contentTopFrac * placement.height + contentHeightFrac * placement.height
      expect(bottomFrameUnits).toBeLessThanOrEqual(boxBottomFrameUnits + 1e-6)
    }
  })
})
