// Six new colour tokens (`detective-mode` design unit 3, spec: detective-mode
// "Colour Asset Registry"; design.md "Art Direction (revised plan)" §Colour —
// the reward system). The base ink-on-paper palette (paper `#fdfcf7`, wall
// `#e2e8f0`, ink `#1e293b`) is NOT redefined here — it stays imported from
// `TraceCanvas.tsx` wherever a consumer needs it. Adding no new neutral is
// itself the anti-cliché move.
//
// Rules `palette.test.ts` asserts: the four earned values (`POND`, `KERNEL`,
// `PRINT`, `PLUME`) are pairwise distinct; none equals or approaches
// `GOAL_COLOR '#b45309'`, `HAZARD_COLOR '#7e6a9e'` or `CARRIER_COLOR
// '#5f8a86'` (`TraceCanvas.tsx:149,177,194`); `PRINT` has zero chroma; no
// value falls in the warm-clay band; `GOAL_COLOR` gains no new use.

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
