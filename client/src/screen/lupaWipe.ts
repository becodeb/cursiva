// The lupa wipe's own geometry (`odd/tasks/prewriting-stage-completion.md`
// T31, `docs/19_PROPUESTA_HISTORIA_Y_MECANICAS.md` §6). The author's play-
// test note: "funciona pero es feo; no se nota que es una lupa, parece más
// un círculo blanco que crece" — `ScreenTransition.tsx`'s growing `clip-path:
// circle()` reveal (T24) is UNCHANGED (it is the actual screen transition,
// already tested, already within budget); this module is the pure geometry
// behind a DECORATIVE rim/handle/highlight drawn ON TOP of it, in plain
// HTML/CSS, so the same growing circle reads as a magnifying glass rather
// than a plain wipe.
//
// No `<mask>`/`<clipPath>`/`url(#…)` of any kind (this repo's own ban,
// `canvas/TraceCanvas.tsx:69-86`) — every shape below is a plain `border-
// radius: 50%` div (the rim) or a plain rectangle (the handle), scaled by an
// ordinary CSS width/height keyframe, positioned in PERCENT of the rim's own
// growing box so the handle and the highlight scale together with it for
// free (no per-frame JS, no second keyframe to keep in sync).
//
// Why the rim does not need to track `clip-path`'s own radius formula pixel-
// for-pixel: `circle(R% at x y)` resolves `R%` against
// `sqrt(width^2+height^2)/sqrt(2)` (CSS Shapes' own reference length for a
// percentage shape-radius), so at `R=150%` the true pixel radius is
// `1.5 * sqrt(w^2+h^2)/sqrt(2) ≈ 1.06 * diagonal` — a small margin past the
// viewport's own corner-to-corner distance, guaranteeing full coverage from
// ANY origin including a corner. This module's own rim grows to
// `LUPA_RIM_FINAL_DIAMETER_VMAX` vmax, chosen so its final RADIUS
// (`LUPA_RIM_FINAL_DIAMETER_VMAX / 2`) clears the worst-case diagonal (a 1:1
// viewport, where the diagonal is `sqrt(2) * 100vmax ≈ 141.4vmax` — the
// largest a diagonal can be relative to `vmax = max(vw, vh)`, since any
// aspect ratio away from 1:1 only SHRINKS the diagonal relative to vmax)
// with the same ~6% margin the clip-path's own 150% keeps. Both curves are
// driven by the SAME `ease-out` keyframe timing function over the SAME
// duration, so even though their two formulas differ (percentage-of-
// reference-length vs. literal vmax), they reach "fully covers the
// viewport" at the same instant and track each other closely in between —
// exact synchronisation was never the goal for a ≤400ms decorative flourish;
// reading as ONE lupa growing toward the viewer is.
import type { CSSProperties } from 'react'

/** How long the rim's own grow animation takes (ms) — the SAME duration
 *  `screen/ScreenTransition.tsx`'s own `WIPE_DURATION_MS` uses, so the rim
 *  and the reveal it decorates start and finish together. Kept as its own
 *  named constant (rather than importing `WIPE_DURATION_MS`) so this module
 *  stays independently testable against the task's own "≤ 400ms" cap without
 *  a circular import between the two files. */
export const LUPA_WIPE_DURATION_MS = 300

/** The rim's own final size, in `vmax` (percent of the LARGER viewport
 *  dimension) — see this file's own header for the diagonal-coverage
 *  derivation. `145` is the final RADIUS in vmax (matching `clip-path`'s own
 *  ~1.06x-diagonal margin at the worst-case 1:1 aspect, `141.4vmax`), so the
 *  rim's own diameter is twice that. */
const LUPA_RIM_FINAL_RADIUS_VMAX = 145
export const LUPA_RIM_FINAL_DIAMETER_VMAX = LUPA_RIM_FINAL_RADIUS_VMAX * 2

/** The rim's own stroke thickness, a fixed px value rather than a percentage
 *  of the (huge, by the end) growing box — a marker-style ring reads best at
 *  a constant, legible thickness throughout the whole grow, never
 *  vanishingly thin at the start or absurdly fat once the circle has grown
 *  past the viewport. `#1a1a1a` matches this app's own ubiquitous marker ink
 *  (`screen/AdventureIntro.tsx`'s `.cv-intro-tool` border, `screen/
 *  DetectiveNotebook.tsx`'s `INK`). */
export const LUPA_RIM_BORDER_PX = 14
export const LUPA_RIM_INK = '#1a1a1a'

/**
 * Where the handle attaches to the rim, as a percent of the rim's own
 * (square) box — the point on the circle's edge at exactly
 * `LUPA_HANDLE_ANGLE_DEG` from the box's centre, in BOX-LOCAL percent
 * coordinates (0% = the box's own left/top edge, 100% = its right/bottom
 * edge), so a caller can position the handle with a plain `left`/`top`
 * percentage that scales automatically as the box's own width/height
 * animate — no per-frame recomputation needed.
 *
 * Derivation: a box of side `D` has its centre at `(D/2, D/2)`; the edge
 * point at angle `a` from centre (0deg = straight right, growing clockwise,
 * matching CSS's own `rotate()` convention) sits at
 * `(D/2 + (D/2)*cos(a), D/2 + (D/2)*sin(a))` — as a FRACTION of `D`, that is
 * `(0.5 + 0.5*cos(a), 0.5 + 0.5*sin(a))`, independent of `D` itself, which is
 * exactly what makes a single percent pair correct at every size the box
 * ever grows to.
 */
export function lupaEdgeAnchorPercent(angleDeg: number): { leftPct: number; topPct: number } {
  const rad = (angleDeg * Math.PI) / 180
  return { leftPct: 50 + 50 * Math.cos(rad), topPct: 50 + 50 * Math.sin(rad) }
}

/** The angle the handle sticks out at — "a handle at ~45°" (the task's own
 *  brief), down and to the right of the growing lens, the classic
 *  magnifying-glass silhouette (CSS `rotate()`'s own clockwise-from-right
 *  convention: 45deg is down-right). */
export const LUPA_HANDLE_ANGLE_DEG = 45

/** `lupaEdgeAnchorPercent` at the handle's own angle, precomputed once as a
 *  named export — `screen/ScreenTransition.tsx` positions the handle's own
 *  `left`/`top` from these two numbers directly, and `lupaWipe.test.ts`
 *  asserts the exact value (`50 + 50*cos(45deg) ≈ 85.355%`) rather than
 *  trusting the formula unchecked. */
export const LUPA_HANDLE_ANCHOR = lupaEdgeAnchorPercent(LUPA_HANDLE_ANGLE_DEG)

/** The CSS for the decorative rim/handle/highlight group — a sibling of the
 *  existing `.cv-screen-wipe` reveal, drawn on TOP of it (later in document
 *  order) so it reads as the edge of the glass the new screen is being seen
 *  THROUGH. `position: fixed; inset: 0; overflow: hidden` is what naturally
 *  clips the rim/handle once they grow past the real viewport — no manual
 *  fade-out needed, the same "grows until nothing of it is left on screen"
 *  behaviour `clip-path`'s own 150% already relies on for the reveal itself.
 *  `pointer-events: none` throughout: purely decorative, never blocking the
 *  screen it is drawn over. */
export const LUPA_WIPE_CSS = `
.cv-lupa-rim { position: fixed; inset: 0; overflow: hidden; pointer-events: none; z-index: 5; }
.cv-lupa-circle {
  position: absolute;
  left: var(--cv-wipe-x, 50%);
  top: var(--cv-wipe-y, 50%);
  width: 0;
  height: 0;
  border-radius: 50%;
  border: ${LUPA_RIM_BORDER_PX}px solid ${LUPA_RIM_INK};
  box-sizing: border-box;
  transform: translate(-50%, -50%);
  animation: cv-lupa-grow ${LUPA_WIPE_DURATION_MS}ms ease-out both;
}
@keyframes cv-lupa-grow {
  0% { width: 0; height: 0; }
  100% { width: ${LUPA_RIM_FINAL_DIAMETER_VMAX}vmax; height: ${LUPA_RIM_FINAL_DIAMETER_VMAX}vmax; }
}
/* The lens highlight — a soft glint near the upper-left of the glass, the
   one purely decorative touch that reads as glass rather than a flat ring.
   Percent-of-parent sizing/position: it scales together with the rim's own
   width/height keyframe above with no separate animation of its own. */
.cv-lupa-highlight {
  position: absolute;
  left: 18%;
  top: 16%;
  width: 22%;
  height: 12%;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(255,255,255,0.55), rgba(255,255,255,0));
  transform: rotate(-30deg);
}
/* The handle: a rod attached at the rim's own ${LUPA_HANDLE_ANGLE_DEG}deg
   edge point (LUPA_HANDLE_ANCHOR, computed by lupaEdgeAnchorPercent above),
   rotated to point straight out along that same angle — transform-origin at
   its own left-centre (the attach point) means the rod extends AWAY from
   the rim, never through it. Percent width/height of the SAME growing
   parent, so it scales in lockstep with the rim with no separate keyframe. */
.cv-lupa-handle {
  position: absolute;
  left: ${LUPA_HANDLE_ANCHOR.leftPct}%;
  top: ${LUPA_HANDLE_ANCHOR.topPct}%;
  width: 32%;
  height: 9%;
  transform-origin: 0% 50%;
  transform: rotate(${LUPA_HANDLE_ANGLE_DEG}deg);
  background: ${LUPA_RIM_INK};
  border-radius: 999px;
}
@media (prefers-reduced-motion: reduce) { .cv-lupa-rim { display: none; } }
`

/** The rim's own inline style — only the origin custom properties, when an
 *  explicit `origin` is given (mirrors `ScreenTransition.tsx`'s own
 *  `originStyle`, so the rim and the reveal it decorates always agree on
 *  where they both grow from). `undefined` (no inline style at all) for the
 *  default centred origin, exactly like `ScreenTransition.tsx`'s own
 *  no-origin case — the CSS `var(--cv-wipe-x, 50%)` fallback applies. */
export function lupaRimOriginStyle(origin: { xPct: number; yPct: number } | undefined): CSSProperties | undefined {
  if (!origin) return undefined
  return { ['--cv-wipe-x' as string]: `${origin.xPct}%`, ['--cv-wipe-y' as string]: `${origin.yPct}%` } as CSSProperties
}
