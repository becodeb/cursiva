// Palette invariant tests (`detective-mode` design unit 3, spec:
// detective-mode "Colour Asset Registry" — "Footprints earn in greyscale
// only", "Trail colour absent before earning"). Pure data assertions, no DOM.
import { describe, expect, it } from 'vitest'
import { ART_OUTLINE, BREADCRUMB, BUBBLE, CLUE_DRAINED, KERNEL, LAMP, PLUME, POND, PRINT } from './palette'
import { CLUE_ART } from './assets'
import { DETECTIVE_CASES, clueKindsOf } from './cases'

/** Shipped accents this palette must stay clear of (`TraceCanvas.tsx:149,177,194`). */
const GOAL_COLOR = '#b45309'
const HAZARD_COLOR = '#7e6a9e'
const CARRIER_COLOR = '#5f8a86'

/** The two grounds a clue mark is drawn on (`TraceCanvas.tsx:108-109`).
 * Mirrored as literals rather than imported, the same way the three accents
 * above are and the same way `scripts/art/build_art.py` mirrors them: pulling
 * the component in would drag React into a pure data test. */
const CORRIDOR_EARTH = '#d9c3ae'
const GROUND_FIELD = '#c9d7bd'

/** Rec. 601 luma, the same weights `build_art.py`'s `luma()` uses to decide
 * what is contour and what is fill. Lightness, not hue, is what separates a
 * mark from warm-clay earth. */
function luma(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return Math.round((r * 299 + g * 587 + b * 114) / 1000)
}

/** How far an EARNED mark must sit from the ground beneath it.
 *
 * Anchored on the drained grey, not on the current palette: `CLUE_DRAINED` is
 * 5 luma from the earth and 3 from the field, so 40 is an order of magnitude
 * above the state an earned mark has to escape. The tightest shipped value is
 * `BUBBLE` at 46, which clears it by 6 -- a thin margin on purpose, because a
 * mark lighter than that on this ground is a mark the child has to hunt for. */
const MIN_GROUND_CONTRAST = 40

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

  it('keeps ART_OUTLINE achromatic, so an art contour never carries a hue again', () => {
    // This is the rule that would have caught both incidents before they
    // shipped: `#1e293b` (`INK_COLOR`, hue 217° -- the blue every clue mark's
    // outline shipped in) and, before that, the grass tufts' authored
    // `#19241c` (hue 136°, green). Point `ART_OUTLINE` back at either and
    // this goes red.
    const { s } = hexToHsl(ART_OUTLINE)
    expect(s).toBe(0)
  })

  it('separates every earned clue colour from the ground it lies on', () => {
    for (const [name, hex] of Object.entries(EARNED)) {
      for (const [groundName, groundHex] of Object.entries({ CORRIDOR_EARTH, GROUND_FIELD })) {
        const gap = Math.abs(luma(hex) - luma(groundHex))
        expect(
          gap,
          `${name} (${hex}) is only ${gap} luma from ${groundName} (${groundHex}) -- a mark the child has to hunt for`,
        ).toBeGreaterThanOrEqual(MIN_GROUND_CONTRAST)
      }
    }
  })

  it('leaves the DRAINED grey below that floor, which is what makes earning it the reward', () => {
    // The half that keeps the assertion above honest. A rule every colour in
    // the file passes proves nothing; this one names a shipped value that must
    // FAIL it. `CLUE_DRAINED` sits 5 luma from the earth and 3 from the field:
    // an unlit mark is legible only by its ink contour, and lighting it up is
    // precisely the moment it separates from the ground. Raise the floor high
    // enough to swallow the drained grey and the reward stops being a reward.
    for (const groundHex of [CORRIDOR_EARTH, GROUND_FIELD]) {
      expect(Math.abs(luma(CLUE_DRAINED) - luma(groundHex))).toBeLessThan(MIN_GROUND_CONTRAST)
    }
  })

  it('never equals GOAL_COLOR, HAZARD_COLOR or CARRIER_COLOR', () => {
    for (const [earnedName, earnedHex] of Object.entries(EARNED)) {
      for (const [refName, refHex] of Object.entries({ GOAL_COLOR, HAZARD_COLOR, CARRIER_COLOR })) {
        expect(earnedHex, `${earnedName} literally equals ${refName}`).not.toBe(refHex)
      }
    }
  })

  /*
   * GONE, and worth the paragraph rather than a silent deletion: a hue-distance
   * assertion holding every earned value more than 15 deg clear of GOAL_COLOR
   * and HAZARD_COLOR, plus a "warm-clay band" ban anchored on GOAL_COLOR's own
   * ~26 deg hue.
   *
   * Both guarded a pairing that cannot occur. `LevelPlay.tsx` passes
   * `inkOnly={isDetectiveTrail}` and `isDetectiveTrail` is `!!level.clue`, so
   * the only levels that draw a clue mark at all are exactly the levels where
   * `TraceCanvas` silhouettes the goal marker and the hazard in ink
   * (`TraceCanvas.tsx:1077,1084,1239`). An earned clue colour and those two
   * accents never share a screen.
   *
   * That is the SAME structural argument this file already made, five lines up,
   * for excluding CARRIER_COLOR from the hue rule -- applied to the other two
   * for consistency rather than invented here. And like that one, it is proved
   * where it can actually be observed: `TraceCanvas.test.tsx`'s `inkOnly` suite
   * renders the canvas, requires all three shipped marker colours absent, and
   * carries a companion test that renders WITHOUT `inkOnly` so the assertion
   * can fail.
   *
   * What replaced them is not a weaker rule but a different one, aimed at the
   * failure this art can really have. The ground under a clue mark is
   * `CORRIDOR_EARTH`, which is itself warm clay at low chroma, so hue distance
   * was never the instrument that separated a mark from it -- lightness is.
   * `build_art.py:194-201` records the repo already shipping a mark that was
   * "very nearly invisible" against that earth for exactly this reason.
   *
   * The cost, paid knowingly: BREADCRUMB is now inside the old warm-clay band
   * (hue 28.8 deg). Bread is warm and there is no honest way around that. It
   * clears the ground by 83 luma, which is what the mark actually owes.
   */

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
