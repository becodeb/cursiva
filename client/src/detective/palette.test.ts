// Palette invariant tests (`detective-mode` design unit 3, spec:
// detective-mode "Colour Asset Registry" — "Footprints earn in greyscale
// only", "Trail colour absent before earning"). Pure data assertions, no DOM.
import { describe, expect, it } from 'vitest'
import { BREADCRUMB, BUBBLE, CLUE_DRAINED, KERNEL, LAMP, PLUME, POND, PRINT } from './palette'
import { CLUE_ART } from './assets'
import { DETECTIVE_CASES, clueKindsOf } from './cases'

/** Shipped accents this palette must stay clear of (`TraceCanvas.tsx:149,177,194`). */
const GOAL_COLOR = '#b45309'
const HAZARD_COLOR = '#7e6a9e'
const CARRIER_COLOR = '#5f8a86'

interface Hsl {
  h: number
  s: number
  l: number
}

/** Standard hex -> HSL conversion. `h` is 0 when the colour is achromatic
 * (`s === 0`), i.e. it carries no meaningful hue. */
function hexToHsl(hex: string): Hsl {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const delta = max - min
  const l = (max + min) / 2
  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1))
  let h = 0
  if (delta !== 0) {
    if (max === r) h = 60 * (((g - b) / delta) % 6)
    else if (max === g) h = 60 * ((b - r) / delta + 2)
    else h = 60 * ((r - g) / delta + 4)
    if (h < 0) h += 360
  }
  return { h, s, l }
}

/** Circular hue distance in degrees, 0..180. */
function hueDistance(a: number, b: number): number {
  const diff = Math.abs(a - b) % 360
  return diff > 180 ? 360 - diff : diff
}

/** Warm-clay hue band the art direction exists to avoid (design.md "Art
 * Direction (revised plan)" — the first pass's dropped "warm-clay accent").
 * `GOAL_COLOR` itself sits at hue ~26°, deep inside this band. */
const WARM_CLAY_HUE_MIN = 10
const WARM_CLAY_HUE_MAX = 35
const WARM_CLAY_SATURATION_MIN = 0.3

/** The tightest genuine pair in the palette is `KERNEL` (hue 42.9 deg) against
 * `GOAL_COLOR` (hue 26.0 deg), 16.9 deg apart, so 15 leaves margin without
 * being tuned to admit any single value. `CARRIER_COLOR` is deliberately NOT
 * compared by hue: `PLUME` sits 9.4 deg from it, and the design accepts that
 * because the carrier is drawn in ink via the `carrierArt` override, so
 * `CARRIER_COLOR` never renders in this mode at all. That is a structural
 * guarantee, not a colour-distance one, and it is asserted where it can
 * actually be observed -- see the `carrierArt` suite in `TraceCanvas.test.tsx`,
 * which renders the canvas and requires `#5f8a86` to be absent. Widening this
 * threshold to swallow the 9.4 deg pair would leave an assertion that cannot
 * fail. */
const HUE_COLLISION_DEG = 15

const EARNED = { POND, KERNEL, PRINT, PLUME, BREADCRUMB, BUBBLE } as const

describe('detective palette (design.md "Art Direction (revised plan)")', () => {
  it('keeps the six earned values pairwise distinct', () => {
    const values = Object.values(EARNED)
    expect(new Set(values).size).toBe(values.length)
  })

  it('gives footprints zero chroma (detective-mode spec, "Footprints earn in greyscale only")', () => {
    const { s } = hexToHsl(PRINT)
    expect(s).toBe(0)
  })

  it('places no earned value in the warm-clay band', () => {
    for (const [name, hex] of Object.entries(EARNED)) {
      const { h, s } = hexToHsl(hex)
      const inBand = h >= WARM_CLAY_HUE_MIN && h <= WARM_CLAY_HUE_MAX && s >= WARM_CLAY_SATURATION_MIN
      expect(inBand, `${name} (${hex}) falls in the warm-clay band`).toBe(false)
    }
  })

  it('never equals GOAL_COLOR, HAZARD_COLOR or CARRIER_COLOR', () => {
    for (const [earnedName, earnedHex] of Object.entries(EARNED)) {
      for (const [refName, refHex] of Object.entries({ GOAL_COLOR, HAZARD_COLOR, CARRIER_COLOR })) {
        expect(earnedHex, `${earnedName} literally equals ${refName}`).not.toBe(refHex)
      }
    }
  })

  it('keeps every earned hue clear of GOAL_COLOR and HAZARD_COLOR', () => {
    for (const [earnedName, earnedHex] of Object.entries(EARNED)) {
      const earnedHsl = hexToHsl(earnedHex)
      if (earnedHsl.s === 0) continue // achromatic (PRINT): no hue to compare
      for (const [refName, refHex] of Object.entries({ GOAL_COLOR, HAZARD_COLOR })) {
        const dist = hueDistance(earnedHsl.h, hexToHsl(refHex).h)
        expect(
          dist,
          `${earnedName} (${earnedHex}) approaches ${refName} (${refHex}): ${dist.toFixed(1)}deg apart`,
        ).toBeGreaterThan(HUE_COLLISION_DEG)
      }
    }
  })

  it('holds KERNEL below GOAL_COLOR chroma, which is what keeps the two apart', () => {
    // 16.9deg of hue alone would not separate brass from the shipped ochre.
    // design.md's actual claim is hue AND lower chroma; assert both halves.
    expect(hexToHsl(KERNEL).s).toBeLessThan(hexToHsl(GOAL_COLOR).s)
  })

  it('gives GOAL_COLOR no new use', () => {
    expect(Object.values(EARNED)).not.toContain(GOAL_COLOR)
    expect(CLUE_DRAINED).not.toBe(GOAL_COLOR)
    expect(LAMP).not.toBe(GOAL_COLOR)
  })

  it("keeps a CASE's earned clue colours pairwise distinct, and no clue earns the drained grey", () => {
    for (const art of Object.values(CLUE_ART)) expect(art.earned).not.toBe(CLUE_DRAINED)
    for (const kase of DETECTIVE_CASES) {
      const earned = clueKindsOf(kase).map((k) => CLUE_ART[k].earned)
      expect(new Set(earned).size, `${kase.id}: two clues share an earned colour`).toBe(
        earned.length,
      )
    }
  })
})
