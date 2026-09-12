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
 * mark from warm-clay earth.
 *
 * It ROUNDS where the pipeline floors, so the two can disagree by one --
 * `BREADCRUMB` is 117 here and 116 there. That is harmless for the thresholds
 * below, but it is not harmless for the drained-grey search further down,
 * which picks an exact optimum: run that search against the pipeline's floor
 * and it ties at two values instead of naming one. The search is defined by
 * THIS function, the one the assertion uses. */
function luma(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return Math.round((r * 299 + g * 587 + b * 114) / 1000)
}

/** How far ANY clue mark must sit from the ground beneath it, earned or not.
 *
 * This used to be a floor on the EARNED values only, anchored on the drained
 * grey being far below it -- `CLUE_DRAINED` was `#c8cdd2`, 5 luma from the
 * earth, and the file asserted that it STAYED there, on the reasoning that
 * separating from the ground was the reward. That reasoning is what shipped
 * the defect fixed on 2026-09-12: it made a mark the child cannot see the
 * defined, tested, correct state of an unfound clue. See the block comment on
 * "earning a clue is a change of CHROMA" below for the rule that replaced it.
 *
 * 40 stays as the floor for earned marks -- the tightest shipped value is
 * `BUBBLE` at 46 -- and `MIN_DRAINED_GROUND_CONTRAST` is the separate, higher
 * floor the drained grey now has to clear. */
const MIN_GROUND_CONTRAST = 40

/** How far the DRAINED grey must sit from the ground beneath it.
 *
 * Higher than the earned floor, which looks backwards until you see what each
 * one is for. An earned mark carries a hue and is found by hue; a drained mark
 * is achromatic by rule and luma is the ONLY channel it has. It is also the
 * mark the child is actually hunting for, so it is the one that has to win
 * against the decoration on the same sheet.
 *
 * 55 is the floor; `#838383` clears the corridor earth by 68 and the field by
 * 76. The number that matters is not this one, though -- it is the ORDERING
 * against the ground decoration, which cannot be checked here because
 * `build_art.py`'s `mute()` decides the ground's contrast at build time.
 * `artHierarchy.test.ts` checks that against the emitted PNGs. This floor is
 * the cheap half that fails fast when someone edits the token. */
const MIN_DRAINED_GROUND_CONTRAST = 55

/** How much hue an EARNED clue must actually carry. The tightest shipped
 * values are `POND` and `PLUME` at 0.39, so 0.25 leaves real room -- this
 * forbids "earning" into another grey, not any particular palette. */
const MIN_EARNED_CHROMA = 0.25

/** What an earned value must pay in luma INSTEAD, when it has no hue to pay
 * with. `PRINT` is the only such value and it pays 131. */
const MIN_ACHROMATIC_EARNED_LUMA_STEP = 100

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

  it('keeps the DRAINED grey achromatic, so an unfound clue never carries a hue', () => {
    // Hue is what "earned" MEANS here (guide §4, "el color es la recompensa").
    // A drained mark with any hue at all is a mark that has begun to claim a
    // reward the child has not collected. `#838383` is saturation 0 exactly;
    // the old `#c8cdd2` was 0.08, a faint blue, which is why this rule is
    // named now rather than assumed.
    const { s } = hexToHsl(CLUE_DRAINED)
    expect(s).toBe(0)
  })

  it('keeps the DRAINED grey findable on both grounds', () => {
    // The assertion that would have caught the 2026-09-12 defect at the source
    // file. `CLUE_DRAINED` was `#c8cdd2` (luma 204) against `CORRIDOR_EARTH`
    // (199): a gap of 5. Point the token back at that value, or at anything
    // else chosen for a near-white background, and this goes red immediately.
    for (const [groundName, groundHex] of Object.entries({ CORRIDOR_EARTH, GROUND_FIELD })) {
      const gap = Math.abs(luma(CLUE_DRAINED) - luma(groundHex))
      expect(
        gap,
        `CLUE_DRAINED (${CLUE_DRAINED}) is only ${gap} luma from ${groundName} -- ` +
          'the child cannot find the thing they are being asked to find',
      ).toBeGreaterThanOrEqual(MIN_DRAINED_GROUND_CONTRAST)
    }
  })

  /*
   * WHY THE REWARD IS CHROMA AND NOT CONTRAST, since this file used to say the
   * opposite and the correction is the whole point of the 2026-09-12 change.
   *
   * The rule here was: earned marks clear their ground by 40 luma, the drained
   * grey deliberately does NOT, and that gap IS the reward. It reads well and
   * it was wrong, because it defines the unfound state of a clue as a mark
   * that cannot be seen -- and finding the clue is the only thing the child is
   * asked to do. Measured on the shipped art, a drained mark sat 5 luma from
   * the corridor while a grass tuft sat 79 from the field. The test was
   * content; the screen was not.
   *
   * The guide already had the right answer and this file had drifted off it.
   * Section 4 is "el color es la recompensa" -- COLOUR is the reward. So the
   * axis is chroma: a drained mark is grey and legible, and earning it gives it
   * a hue. `PRINT` is the stated exception, "achromatic by material, not by
   * exception", and it pays for its missing hue in luma instead: black against
   * a 131-luma grey is not a subtle change.
   *
   * The cost, taken knowingly: `CLUE_DRAINED` now out-contrasts `BUBBLE` (46)
   * and `KERNEL` (54) against the corridor earth in pure LUMA. Neither is a
   * legibility problem -- both are saturated against low-chroma warm clay, and
   * hue contrast is what carries them -- but it does mean luma can no longer be
   * read as a reward signal anywhere in this palette, and the assertion below
   * is the one that says so instead.
   */
  it('makes earning a clue a change of CHROMA, or of a great deal of luma', () => {
    const drainedLuma = luma(CLUE_DRAINED)
    for (const [name, hex] of Object.entries(EARNED)) {
      const { s } = hexToHsl(hex)
      const lumaStep = Math.abs(luma(hex) - drainedLuma)
      expect(
        s >= MIN_EARNED_CHROMA || lumaStep >= MIN_ACHROMATIC_EARNED_LUMA_STEP,
        `${name} (${hex}) earns into chroma ${s.toFixed(2)} and only ${lumaStep} luma from ` +
          `CLUE_DRAINED -- a child cannot tell it has been collected`,
      ).toBe(true)
    }
  })

  it('picks the drained grey that sits furthest from every earned value', () => {
    // Not a threshold, a SEARCH -- and it is the assertion that earned its
    // place. The first `CLUE_DRAINED` written for this change was `#8a8a8a`,
    // luma 138, which satisfies every other rule in this file and lands 7 luma
    // from `KERNEL` (145): a drained kernel and an earned one would have
    // differed by hue alone, at identical lightness. This test caught it.
    //
    // A fixed floor could not have. The earned lumas are 0/87/100/117/145/153
    // and the legal window for the grey is narrow, so the best separation ANY
    // legal value achieves is 14 -- a floor set above that is unsatisfiable and
    // a floor set below it silently accepts a lazier pick. Asking for the
    // optimum is the only honest form of the rule, and it stays red until
    // someone either re-picks the grey or moves an earned value.
    //
    // What makes a grey legal, and both halves are load-bearing:
    //   - findable on both grounds, the rule asserted above;
    //   - closer to the ground it lies on than to `PRINT` `#000000`, the value
    //     two trails earn INTO. Without this the search would happily return
    //     luma 43, which separates beautifully and reads as an already-black
    //     footprint sitting on pale earth.
    const earnedLumas = Object.values(EARNED).map(luma)
    const nearestEarned = (l: number) => Math.min(...earnedLumas.map((e) => Math.abs(l - e)))
    const legal = (l: number) =>
      [CORRIDOR_EARTH, GROUND_FIELD].every(
        (g) => Math.abs(l - luma(g)) >= MIN_DRAINED_GROUND_CONTRAST,
      ) && Math.abs(l - luma(CORRIDOR_EARTH)) < Math.abs(l - luma(PRINT))

    const window = Array.from({ length: 256 }, (_, l) => l).filter(legal)
    expect(window.length, 'no achromatic value can satisfy the drained rules at all').toBeGreaterThan(0)
    const best = Math.max(...window.map(nearestEarned))
    const drained = luma(CLUE_DRAINED)

    expect(legal(drained), `CLUE_DRAINED (${CLUE_DRAINED}) is outside the legal window`).toBe(true)
    expect(
      nearestEarned(drained),
      `CLUE_DRAINED (${CLUE_DRAINED}, luma ${drained}) sits ${nearestEarned(drained)} luma from ` +
        `the nearest earned value, but luma ${window.find((l) => nearestEarned(l) === best)} ` +
        `manages ${best}`,
    ).toBe(best)
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
