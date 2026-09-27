// lupaWipe geometry tests (`odd/tasks/prewriting-stage-completion.md` T31).
// Pure functions/constants, no DOM — the actual markup is exercised through
// `ScreenTransition.test.tsx`.
import { describe, expect, it } from 'vitest'
import {
  LUPA_HANDLE_ANCHOR,
  LUPA_HANDLE_ANGLE_DEG,
  LUPA_RIM_FINAL_DIAMETER_VMAX,
  LUPA_WIPE_CSS,
  LUPA_WIPE_DURATION_MS,
  lupaEdgeAnchorPercent,
  lupaRimOriginStyle,
} from './lupaWipe'

describe('lupaEdgeAnchorPercent — the point on a growing box\'s own edge at a given angle', () => {
  it('0deg (straight right of centre) is the box\'s own right-centre edge', () => {
    const p = lupaEdgeAnchorPercent(0)
    expect(p.leftPct).toBeCloseTo(100, 6)
    expect(p.topPct).toBeCloseTo(50, 6)
  })

  it('90deg (straight down) is the box\'s own bottom-centre edge', () => {
    const p = lupaEdgeAnchorPercent(90)
    expect(p.leftPct).toBeCloseTo(50, 6)
    expect(p.topPct).toBeCloseTo(100, 6)
  })

  it('180deg (straight left) is the box\'s own left-centre edge', () => {
    const p = lupaEdgeAnchorPercent(180)
    expect(p.leftPct).toBeCloseTo(0, 6)
    expect(p.topPct).toBeCloseTo(50, 6)
  })

  it('is independent of box size by construction (a plain fraction of the box, this file\'s own header derivation)', () => {
    // The whole point of expressing the anchor as a PERCENT is that it never
    // needs to be recomputed as the box's own width/height animate — this
    // assertion just re-derives the formula independently (cos/sin), rather
    // than trusting the implementation unchecked.
    for (const angle of [0, 30, 45, 60, 90, 135, 200, 315]) {
      const p = lupaEdgeAnchorPercent(angle)
      const rad = (angle * Math.PI) / 180
      expect(p.leftPct).toBeCloseTo(50 + 50 * Math.cos(rad), 9)
      expect(p.topPct).toBeCloseTo(50 + 50 * Math.sin(rad), 9)
    }
  })
})

describe('LUPA_HANDLE_ANCHOR — the handle sticks out at ~45deg, down-right of the growing lens', () => {
  it('is exactly lupaEdgeAnchorPercent(45deg): ~85.355% on both axes', () => {
    expect(LUPA_HANDLE_ANGLE_DEG).toBe(45)
    expect(LUPA_HANDLE_ANCHOR.leftPct).toBeCloseTo(50 + 50 * Math.SQRT1_2, 9)
    expect(LUPA_HANDLE_ANCHOR.topPct).toBeCloseTo(50 + 50 * Math.SQRT1_2, 9)
    expect(LUPA_HANDLE_ANCHOR.leftPct).toBeGreaterThan(84)
    expect(LUPA_HANDLE_ANCHOR.leftPct).toBeLessThan(87)
  })
})

describe('LUPA_RIM_FINAL_DIAMETER_VMAX — the rim always finishes bigger than the worst-case viewport diagonal', () => {
  it('its own final RADIUS (half the diameter) clears the 1:1-aspect diagonal (141.4vmax, the largest a diagonal can be relative to vmax)', () => {
    const finalRadiusVmax = LUPA_RIM_FINAL_DIAMETER_VMAX / 2
    const worstCaseDiagonalVmax = Math.sqrt(2) * 100 // a square viewport: vmax = vw = vh, diagonal = sqrt(2)*vmax
    expect(finalRadiusVmax).toBeGreaterThan(worstCaseDiagonalVmax)
  })
})

describe('LUPA_WIPE_DURATION_MS — within the task\'s own ≤400ms budget', () => {
  it('is at most 400ms', () => {
    expect(LUPA_WIPE_DURATION_MS).toBeLessThanOrEqual(400)
  })
})

describe('LUPA_WIPE_CSS — no mask/clipPath/pattern/filter/url(#…) of any kind (the repo-wide ban)', () => {
  it('introduces no url(#), <mask, <clipPath, or <pattern', () => {
    expect(LUPA_WIPE_CSS).not.toContain('url(#')
    expect(LUPA_WIPE_CSS).not.toContain('<mask')
    expect(LUPA_WIPE_CSS).not.toContain('<clipPath')
    expect(LUPA_WIPE_CSS).not.toContain('<pattern')
    expect(LUPA_WIPE_CSS).not.toContain('clip-path')
    expect(LUPA_WIPE_CSS).not.toContain('filter:')
  })

  it('carries a reduced-motion override that hides the whole rim', () => {
    expect(LUPA_WIPE_CSS).toContain('@media (prefers-reduced-motion: reduce) { .cv-lupa-rim { display: none; } }')
  })

  it('the rim animation duration matches LUPA_WIPE_DURATION_MS (no drift between the two)', () => {
    expect(LUPA_WIPE_CSS).toContain(`cv-lupa-grow ${LUPA_WIPE_DURATION_MS}ms`)
  })
})

describe('lupaRimOriginStyle', () => {
  it('is undefined for the default (centred) origin — the CSS var() fallback applies, same as ScreenTransition.tsx\'s own originStyle', () => {
    expect(lupaRimOriginStyle(undefined)).toBeUndefined()
  })

  it('carries the same --cv-wipe-x/--cv-wipe-y custom properties an explicit origin gives ScreenTransition.tsx\'s own wrapper', () => {
    const style = lupaRimOriginStyle({ xPct: 12, yPct: 88 })
    expect(style).toEqual({ '--cv-wipe-x': '12%', '--cv-wipe-y': '88%' })
  })
})
