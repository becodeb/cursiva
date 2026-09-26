// pulpitoStance pure math (prewriting-stage-completion T18, `docs/19` §4.1).
// Node environment, no DOM.
import { describe, expect, it } from 'vitest'
import {
  DEFAULT_PULPITO_STANCE,
  OCTOPUS_CORNER_INSET,
  octopusBoxAtCorner,
  resolvePulpitoStance,
  stageSizePx,
  stanceBubbleSide,
  STAGE_MAX_PX,
  STAGE_MAX_VH_FRAC,
} from './pulpitoStance'

const ART = { w: 442, h: 448 }

describe('resolvePulpitoStance', () => {
  it('falls back to DEFAULT_PULPITO_STANCE when a line declares none', () => {
    expect(resolvePulpitoStance(undefined)).toEqual(DEFAULT_PULPITO_STANCE)
  })

  it('keeps an explicit stance unchanged', () => {
    expect(resolvePulpitoStance({ corner: 'right' })).toEqual({ corner: 'right' })
  })
})

describe('octopusBoxAtCorner', () => {
  it('sits at `inset` from the LEFT edge for a left stance', () => {
    const box = octopusBoxAtCorner(ART, { corner: 'left', sizeBy: 'width', size: 44, bottom: 2, inset: OCTOPUS_CORNER_INSET })
    expect(box.x).toBeCloseTo(OCTOPUS_CORNER_INSET, 6)
    expect(box.w).toBeCloseTo(44, 6)
  })

  it('sits at `inset` from the RIGHT edge for a right stance — mirrors the left case', () => {
    const left = octopusBoxAtCorner(ART, { corner: 'left', sizeBy: 'width', size: 44, bottom: 2, inset: OCTOPUS_CORNER_INSET })
    const right = octopusBoxAtCorner(ART, { corner: 'right', sizeBy: 'width', size: 44, bottom: 2, inset: OCTOPUS_CORNER_INSET })
    expect(right.x).toBeCloseTo(100 - OCTOPUS_CORNER_INSET - right.w, 6)
    // Same width/height/y regardless of corner — only the horizontal anchor flips.
    expect(right.w).toBeCloseTo(left.w, 6)
    expect(right.h).toBeCloseTo(left.h, 6)
    expect(right.y).toBeCloseTo(left.y, 6)
  })

  it('never centres the box — it always touches its own corner, not 50%', () => {
    const box = octopusBoxAtCorner(ART, { corner: 'left', sizeBy: 'width', size: 44, bottom: 2, inset: 4 })
    expect(box.x).not.toBeCloseTo(50 - box.w / 2, 3)
  })

  it('sizes by HEIGHT when asked (a portrait figure, docs/19 does not need this today, but the option must not silently misbehave)', () => {
    const box = octopusBoxAtCorner({ w: 235, h: 320 }, { corner: 'right', sizeBy: 'height', size: 40, bottom: 2, inset: 4 })
    expect(box.h).toBeCloseTo(40, 6)
    expect(box.w).toBeCloseTo((40 * 235) / 320, 6)
  })
})

describe('stanceBubbleSide', () => {
  it('a left corner opens the bubble toward the right (the screen centre)', () => {
    expect(stanceBubbleSide('left')).toBe('right')
  })

  it('a right corner opens the bubble toward the left (the screen centre)', () => {
    expect(stanceBubbleSide('right')).toBe('left')
  })
})

describe('stageSizePx', () => {
  it('is bounded by the viewport width on a very wide/short window', () => {
    expect(stageSizePx(2000, 2000)).toBe(STAGE_MAX_PX)
  })

  it('is bounded by 84dvh on a short landscape window (844x390, a required QA viewport)', () => {
    const px = stageSizePx(844, 390)
    expect(px).toBeCloseTo(STAGE_MAX_VH_FRAC * 390, 6)
    expect(px).toBeLessThan(844)
    expect(px).toBeLessThan(STAGE_MAX_PX)
  })

  it('never exceeds the viewport width itself, even below every other cap', () => {
    expect(stageSizePx(300, 1000)).toBe(300)
  })
})
