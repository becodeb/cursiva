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
// (`TraceCanvas.tsx:149,177,194`); `PRINT` has zero chroma; every earned value
// separates by luma from the two ground tones it lies on, while the drained
// grey deliberately does not; `GOAL_COLOR` gains no new use.
//
// It used to assert a hue distance from `GOAL_COLOR` and `HAZARD_COLOR`, and a
// warm-clay hue band anchored on the same two. Both are gone: `inkOnly`
// silhouettes those two colours on every screen a clue mark can appear on, so
// the pairing they guarded cannot occur. That is the same structural argument
// the test already made for `CARRIER_COLOR`, and it is proved where it can be
// observed, in `TraceCanvas.test.tsx`'s `inkOnly` suite.

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

/** Every unearned clue mark, whatever its trail. One step darker than the
 * shipped wall grey `#e2e8f0` so it reads on paper and on wall alike. */
export const CLUE_DRAINED = '#c8cdd2'

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
