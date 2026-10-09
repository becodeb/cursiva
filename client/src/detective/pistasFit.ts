// Shared sizing for the `.pistas-bar`/`.pistas-slots` HUD pill both
// `CollectBar.tsx` and `TrailProgressBar.tsx` render into (review batch 1,
// V3: `docs/25_REVISION_PSICOPEDAGOGICA.md` §5.4 — "Barra de dolphin4 con
// ~16 casilleros, cortada en los dos bordes en vertical").
//
// Before this fix the bar's own square size came ONLY from
// `LevelPlay.tsx`'s `LAYOUT_CSS` `@media (max-height: …)` breakpoints — a
// fixed 40/34/26px per slot regardless of HOW MANY slots there were. That
// works for the usual 4-to-8 slot adventure trail, but `dolphin4`'s own
// `collect: { items: 'extrema' }` (7 wave cycles) fills 15 sockets, and at
// a PORTRAIT viewport (768x1024) the viewport's HEIGHT is tall enough that
// no `max-height` breakpoint ever fires, so the bar kept its biggest,
// 40px squares — 15 of them, plus 14 gaps and the bar's own padding/
// border, add up to ~706px wide inside a 768px-wide screen: technically
// inside the viewport, but with only ~30px to spare on each side, so the
// pill's own big rounded end-caps visually crowd the screen edges (the
// review's own "cortada en los dos bordes").
//
// The fix: the square size is no longer JUST this breakpoint's own fixed
// max — it is also capped by how many squares have to share the viewport's
// own width, computed with `vw` (a real viewport-relative CSS unit,
// available with no DOM measurement, the same reason `bubbleFit.ts` uses
// `cqw`): `fitPistasSlots`'s pure formula below mirrors EXACTLY the
// `clamp(...)`/`calc(...)` rule `LevelPlay.tsx`'s `LAYOUT_CSS` writes,
// so this suite can prove the arithmetic directly, without a browser. A
// SMALL slot count (4, the common case) never reaches this cap at all —
// `raw` comes out well above `maxSlot`, `Math.min` picks `maxSlot`, and the
// bar renders at its usual, unchanged size.
import type { CSSProperties } from 'react'

/** The bar's own chrome, in px — the part of its WIDTH the squares do not
 *  own: `.pistas-bar`'s horizontal `padding: 5px 12px` (24px) plus its
 *  `border: 3px solid` (6px, one on each side). Mirrors `LAYOUT_CSS`'s own
 *  `.pistas-bar` rule; stays a named constant here rather than copied
 *  inline so the CSS and this formula can never drift apart silently. */
export const PISTAS_BAR_CHROME_PX = 30

/** How much of the viewport's own width the bar may ever fill — comfortably
 *  under 100% so its rounded end-caps always keep a visible margin from the
 *  screen edges, the exact thing the review's own V3 flagged missing. */
export const PISTAS_BUDGET_VW_FRAC = 0.88

/** The smallest a slot is ever allowed to shrink to, however many items a
 *  level collects — the bar is a passive, `pointer-events: none` HUD
 *  readout, never a touch target, so this floor only has to stay visible,
 *  not finger-sized. */
export const PISTAS_MIN_SLOT = 16

export interface PistasFit {
  /** The chosen square size, in CSS px. */
  readonly slotSize: number
  /** The bar's own resulting total width at that square size, in CSS px —
   *  exported mainly so a test can assert it never exceeds the viewport's
   *  own budget. */
  readonly totalWidth: number
}

/**
 * The slot (square) size `count` items settle on inside a `viewportWidth`px
 * viewport, given this breakpoint's own `maxSlot`/`gap` (`LAYOUT_CSS`'s own
 * `--pistas-max-slot`/`--pistas-gap`, one pair per `max-height` tier) — the
 * largest size that both respects `maxSlot` (never grows past what that
 * breakpoint already shows for the common, few-items case) AND keeps the
 * whole bar's own `totalWidth` inside `PISTAS_BUDGET_VW_FRAC` of the
 * viewport (never clipped/crowded at the screen edges for a many-items
 * level). A `count` of zero never renders a bar at all (`CollectBar.tsx`'s
 * own early return), so `slotSize` for it is simply `maxSlot` and
 * `totalWidth` is `0` — there is nothing to measure.
 */
export function fitPistasSlots(
  count: number,
  viewportWidth: number,
  maxSlot: number,
  gap: number,
  minSlot: number = PISTAS_MIN_SLOT,
): PistasFit {
  if (count <= 0) return { slotSize: maxSlot, totalWidth: 0 }
  const budget = viewportWidth * PISTAS_BUDGET_VW_FRAC - PISTAS_BAR_CHROME_PX
  const raw = (budget - (count - 1) * gap) / count
  const slotSize = Math.min(maxSlot, Math.max(minSlot, raw))
  const totalWidth = count * slotSize + (count - 1) * gap + PISTAS_BAR_CHROME_PX
  return { slotSize, totalWidth }
}

/** The ONE custom property either bar's root `.pistas-bar` element carries:
 *  how many slots it holds, so `LAYOUT_CSS`'s own `calc()` can divide the
 *  viewport's own budget by it. Cast through `Record<string, string>` for
 *  the same reason `bubbleCssVars.ts`'s own `vars` cast exists —
 *  `CSSProperties` has no typed slot for an arbitrary custom property
 *  name. `Math.max(count, 1)` keeps the CSS `calc()` division safe even for
 *  a bar with zero slots (never actually rendered, `CollectBar.tsx`'s own
 *  early return — this is just defensive, not reachable in practice). */
export function pistasCountStyle(count: number): CSSProperties {
  const vars: Record<string, string> = { '--pistas-count': String(Math.max(count, 1)) }
  return vars as CSSProperties
}
