// `fitPistasSlots` is a pure re-statement of `LevelPlay.tsx`'s own
// `.pistas-slots svg` clamp()/calc() rule (`pistasFit.ts`'s own header on
// why), so this suite proves the arithmetic a real browser would run,
// without a DOM — the same convention `bubbleFit.test.ts` and
// `bubbleCssVars.test.ts` already follow for this app's other pure-geometry
// modules. Node environment.
import { describe, expect, it } from 'vitest'
import { fitPistasSlots, pistasCountStyle, PISTAS_MIN_SLOT } from './pistasFit'

// The three `LAYOUT_CSS` breakpoint tiers (`LevelPlay.tsx`'s own
// `--pistas-max-slot`/`--pistas-gap` pairs), named here so each test reads
// as "at THIS breakpoint" rather than a bare pair of magic numbers.
const TALL = { maxSlot: 40, gap: 6 } // unconstrained (>820px tall), e.g. 768x1024 portrait
const MID = { maxSlot: 34, gap: 5 } // max-height: 820px, e.g. 1024x768
const SHORT = { maxSlot: 26, gap: 4 } // max-height: 520px, e.g. 844x390

describe('fitPistasSlots', () => {
  it('a small, common count (4) never shrinks below this breakpoint\'s own max — plenty of viewport to share', () => {
    expect(fitPistasSlots(4, 1024, MID.maxSlot, MID.gap).slotSize).toBe(MID.maxSlot)
    expect(fitPistasSlots(4, 768, TALL.maxSlot, TALL.gap).slotSize).toBe(TALL.maxSlot)
  })

  it('dolphin4\'s own 15 collect items, at the exact portrait viewport the review flagged (768x1024): shrinks below the unconstrained max and the whole bar stays well inside the viewport', () => {
    const fit = fitPistasSlots(15, 768, TALL.maxSlot, TALL.gap)
    expect(fit.slotSize).toBeLessThan(TALL.maxSlot)
    expect(fit.slotSize).toBeGreaterThanOrEqual(PISTAS_MIN_SLOT)
    expect(fit.totalWidth).toBeLessThanOrEqual(768 * 0.88 + 0.01)
  })

  it('a mid count (10) at a narrow phone width (375) still fits, never going under the readability floor', () => {
    const fit = fitPistasSlots(10, 375, TALL.maxSlot, TALL.gap)
    expect(fit.totalWidth).toBeLessThanOrEqual(375 * 0.88 + 0.01)
    expect(fit.slotSize).toBeGreaterThanOrEqual(PISTAS_MIN_SLOT)
  })

  it('a large count (16) at a short/narrow viewport (844x390 landscape, the SHORT tier) still respects the budget', () => {
    const fit = fitPistasSlots(16, 844, SHORT.maxSlot, SHORT.gap)
    expect(fit.totalWidth).toBeLessThanOrEqual(844 * 0.88 + 0.01)
    expect(fit.slotSize).toBeLessThanOrEqual(SHORT.maxSlot)
  })

  it('zero items never divides by zero and reports no width at all (CollectBar.tsx never actually renders this case — its own early return)', () => {
    const fit = fitPistasSlots(0, 768, TALL.maxSlot, TALL.gap)
    expect(fit.totalWidth).toBe(0)
    expect(Number.isFinite(fit.slotSize)).toBe(true)
  })

  it('a pathological viewport too narrow for even the floor never goes below PISTAS_MIN_SLOT', () => {
    const fit = fitPistasSlots(16, 200, TALL.maxSlot, TALL.gap)
    expect(fit.slotSize).toBe(PISTAS_MIN_SLOT)
  })
})

describe('pistasCountStyle', () => {
  it('carries the exact item count as the --pistas-count custom property', () => {
    const style = pistasCountStyle(15) as Record<string, string>
    expect(style['--pistas-count']).toBe('15')
  })

  it('floors at 1 for a defensive zero (CollectBar.tsx never actually renders this case)', () => {
    const style = pistasCountStyle(0) as Record<string, string>
    expect(style['--pistas-count']).toBe('1')
  })
})
