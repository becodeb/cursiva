// Seven new colour tokens (`detective-mode` design unit 3, spec: detective-mode
// "Colour Asset Registry"; design.md "Art Direction (revised plan)" §Colour —
// the reward system). The base ink-on-paper palette (paper `#fdfcf7`, wall
// `#e2e8f0`, ink `#1e293b`) is NOT redefined here — it stays imported from
// `TraceCanvas.tsx` wherever a consumer needs it. Adding no new neutral is
// itself the anti-cliché move, except for `ART_OUTLINE` below, which is not a
// UI neutral but a rule for the ART PIPELINE.
//
// Rules `palette.test.ts` asserts: the earned values are pairwise distinct and
// distinct again within each case; none literally equals `GOAL_COLOR
// '#b45309'`, `HAZARD_COLOR '#7e6a9e'` or `CARRIER_COLOR '#5f8a86'`
// (`TraceCanvas.tsx:149,177,194`); `PRINT` and `CLUE_DRAINED` have zero chroma;
// every clue value, earned or drained, separates by luma from the two ground
// tones it lies on; earning a clue is a change of CHROMA; `GOAL_COLOR` gains no
// new use.
//
// That fifth rule used to read "while the drained grey deliberately does not",
// and correcting it is the 2026-09-12 change: making invisibility the defined
// correct state of an unfound clue is what left a five-year-old hunting for the
// faintest thing on the sheet. See `CLUE_DRAINED` below.
//
// It used to assert a hue distance from `GOAL_COLOR` and `HAZARD_COLOR`, and a
// warm-clay hue band anchored on the same two. Both are gone: `inkOnly`
// silhouettes those two colours on every screen a clue mark can appear on, so
// the pairing they guarded cannot occur. That is the same structural argument
// the test already made for `CARRIER_COLOR`, and it is proved where it can be
// observed, in `TraceCanvas.test.tsx`'s `inkOnly` suite.

/** Rec. 601 luma, the same weights `build_art.py`'s `luma()` uses to decide
 * what is contour and what is fill. Lightness, not hue, is what separates a
 * mark from warm-clay earth.
 *
 * It ROUNDS where the pipeline floors, so the two can disagree by one --
 * `BREADCRUMB` is 117 here and 116 there. That is harmless for the ground-
 * contrast thresholds it guards, but it is not harmless for the
 * drained-grey search that picks an exact optimum: run that search against
 * the pipeline's floor and it ties at two values instead of naming one. The
 * search is defined by THIS function, the one every consumer imports. */
export function luma(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return Math.round((r * 299 + g * 587 + b * 114) / 1000)
}

/** The marker line of every drawn-world art asset -- clue marks and ground
 * contours alike, via `scripts/art/build_art.py`'s `INK`. This is deliberately
 * NOT `TraceCanvas.tsx`'s `INK_COLOR` (`#1e293b`, hue 217° -- a slate blue),
 * which is the colour of the child's OWN pencil trace. Conflating the two is
 * exactly what shipped every clue mark's outline in that blue: the pipeline
 * used to point its `INK` straight at `INK_COLOR`'s value, so a colour meant
 * for the child's hand ended up on the drawn world's contours instead.
 *
 * An art contour is achromatic BY RULE: hue 0, asserted in `palette.test.ts`.
 * This is the second time an authored contour has drifted off that rule --
 * the first was the grass tufts' authored `#19241c` (hue 136°, green),
 * documented at `build_art.py`'s `mute()` -- so this token exists to name the
 * rule once instead of re-discovering it a third time.
 *
 * `#1a1a1a` keeps `build_art.py:72`'s own measured luma of ~25 for the
 * authored outlines, so no threshold elsewhere in the pipeline (`INK_LUMA`)
 * needs to move. Mirrored into `build_art.py`'s `INK` constant and guarded
 * against drifting apart in `artManifest.test.ts`. */
export const ART_OUTLINE = '#1a1a1a'

/** Every unearned clue mark, whatever its trail.
 *
 * It was `#c8cdd2` until 2026-09-12, and that value was CORRECT when it was
 * chosen. A clue mark then lay on near-white paper (`SHEET_PAPER` `#fdfcf7`,
 * luma 252); `#c8cdd2` is luma 204, so it cleared its background by 48, and
 * the comment here said it was picked to read "on paper and on wall alike".
 *
 * Then the sheet grew a ground. The corridor a clue is drawn on became
 * `CORRIDOR_EARTH` `#d9c3ae` at luma 199, and nobody revisited this value: the
 * drained mark's contrast against the thing underneath it collapsed from 48 to
 * 5. Measured on the shipped art, a grass tuft cleared its own ground by 79 and
 * rendered up to 1.9x the size of a clue mark, so the child was being asked to
 * hunt for the least visible thing on the screen while the decoration shouted.
 *
 * That is the failure mode worth naming: nothing was mistyped. A value that was
 * right in its original context went silently wrong when the context moved out
 * from under it. `artHierarchy.test.ts` is the guard, and it asserts against the
 * EMITTED PNGs rather than against this constant, because `build_art.py`'s
 * `mute()` is what decides the ground's half of the comparison.
 *
 * Three rules constrain the replacement, and `palette.test.ts` asserts all
 * three:
 *
 *  - ACHROMATIC. Hue is what "earned" means in this project (section 4 of
 *    `docs/09_GUIA_DE_ESTILO_VISUAL.md`: "el color es la recompensa"), so an
 *    unfound clue must not carry one. `#838383` has saturation 0 exactly.
 *  - FINDABLE. Luma 131 clears `CORRIDOR_EARTH` by 68 and `GROUND_FIELD` by
 *    76 -- above the 55 floor, and above every piece of ground decoration.
 *  - STILL UNEARNED. Of every achromatic value that satisfies the other two
 *    rules, 131 is the one that sits FURTHEST from the nearest earned value
 *    (14 luma, from `BREADCRUMB` on one side and `KERNEL` on the other). `palette.test.ts` re-runs that search rather
 *    than trusting this sentence -- the first pick here was `#8a8a8a`, and it
 *    landed 7 luma from `KERNEL`, which the test caught.
 *
 * The consequence, taken knowingly: a drained mark now out-contrasts `BUBBLE`
 * and `KERNEL` in pure luma. That is fine, and `palette.test.ts` explains why
 * at length -- earning is a change of CHROMA, not a change of contrast. It is
 * the guide's own rule; the old palette test had quietly made luma the reward
 * axis instead, and that is what left the drained state unreadable. */
export const CLUE_DRAINED = '#838383'

/** Trail 1 only — water droplets. */
export const POND = '#3f6f8f'

/** Trail 2 only — corn. Hue ~44° against the shipped ochre's ~30° and the
 * warm-clay band's ~10-35°, chroma held below the ochre's. */
export const KERNEL = '#b8912f'

/** Trail 3 only — footprints. True black, not a fashionable tinted
 * near-black: the print must be darker than the child's own ink or it reads
 * as part of the trace, and it must not read as a UI text colour. Achromatic
 * by material, not by exception. */
export const PRINT = '#000000'

/** Trail 4 only — the iridescence a glass reveals in a hen feather. */
export const PLUME = '#2f6b5c'

/** The single light source. Appears in the lamp glyph and its halo and
 * nowhere else. */
export const LAMP = '#f2d377'

/** Duck case only — the breadcrumb trail. The authored crust in
 * `art-source/miga de pan.png` is `#c46720`; this is that crust taken down in
 * lightness until it separates from the corridor earth it lies on.
 *
 * It was `#994138` for one slice, a dark brick chosen to escape a hue rule
 * anchored on `GOAL_COLOR`. Rendered at mark scale it read as a slab of meat,
 * which is a real defect: the deduction asks the child to recognise the clue,
 * so a clue that does not look like what it is has failed at its only job.
 * The rule it was escaping turned out to guard a collision that cannot happen
 * — see `palette.test.ts`. Bread is warm and there is no honest way around
 * that; what a warm mark on warm earth actually owes is CONTRAST, which is
 * what the test asserts now. */
export const BREADCRUMB = '#a9682c'

/** Duck case only — the bubble trail. Sampled from `art-source/burbuja.png`'s
 * cyan body, lifted out of `POND`'s slate (design.md §4). */
export const BUBBLE = '#4fb3d9'

/** The flower before the bee has been to it (`docs/13` §8 row F,
 * `free-trail-waypoints` design.md §3.2).
 *
 * PROVISIONAL, and deliberately so. The law corners a RANGE and art
 * direction picks the value inside it — the third time `docs/09` §4 has done
 * this (paso D's fog and swept sand, paso E's snake ink), and both earlier
 * times the cornered literal was left intact for the author rather than
 * quietly chosen. Same here.
 *
 * The range, measured: the forest's quiet band is luma 151.2, so an
 * achromatic dormant mark sits at luma <= 96.2 or >= 206.2. BOTH branches
 * exist for the first time in this project — every earlier sector's band
 * was light enough that only the dark one survived (`docs/13` §4 decision
 * 6) — and the PALE branch is much the safer: at 210 it clears the child's
 * own `INK_COLOR` (39.8) by 170.2, where the dark branch at 96.2 clears it
 * by only 56.4, one luma above the law's own floor.
 *
 * `#d2d2d2` is luma 210.0, chroma 0: separates 58.8 from the band, 170.2
 * from the ink. `zoo/backdrops.test.ts` asserts the CONSTRAINT — achromatic,
 * >= 55 from the forest's own sampled `brightest`, >= 55 from the ink — and
 * never this literal, so changing it is a one-line edit the suite still
 * polices. Do NOT add this to `palette.test.ts`'s `EARNED`/ground-contrast
 * loops by hand: it separates only 41.7 from `SHEET_PAPER` and would FAIL a
 * general paper-ground check — correctly, because the flower never stands
 * on paper, only on the forest band. */
export const FLOWER_DORMANT = '#d2d2d2'
