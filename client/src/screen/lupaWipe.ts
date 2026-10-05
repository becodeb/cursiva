// The lupa wipe's own geometry (`odd/tasks/prewriting-stage-completion.md`
// T31, `docs/19_PROPUESTA_HISTORIA_Y_MECANICAS.md` §6). The author's play-
// test note: "funciona pero es feo; no se nota que es una lupa, parece más
// un círculo blanco que crece" — `ScreenTransition.tsx`'s growing `clip-path:
// circle()` reveal (T24) is UNCHANGED (it is the actual screen transition,
// already tested, already within budget); this module is the pure geometry
// behind a DECORATIVE magnifier drawn ON TOP of it, so the same growing
// circle reads as a magnifying glass rather than a plain wipe. (T49: the
// magnifier is the author's drawing now, `TRANSITION_LENS_ART`; the CSS ring,
// rod and glint described below were its first, code-drawn version.)
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
import { TRANSITION_LENS_ART } from '../detective/assets'

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

/**
 * T49 (`docs/23` D35, `docs/23` §7 point 6): the rim, the handle and the
 * glint are no longer CSS shapes (a 14px ink ring, an ink rod at 45deg and a
 * gradient blob) but the author's drawn transition magnifier,
 * `TRANSITION_LENS_ART`. It rides the SAME growing `.cv-lupa-circle` box
 * (same `cv-lupa-grow` keyframe, same View Transition capture), so nothing
 * about timing or the T38 visibility gate changes.
 *
 * The box is the GLASS: its edge is the drawing's measured empty hole, not
 * an estimate. `scripts/art/build_art.py`'s `measure_lens_hole` fits a circle
 * to the marker line on the glass's inner edge of the shipped file and the
 * manifest carries it (`hole`, guarded against `TRANSITION_LENS_ART.hole`
 * by `artManifest.test.ts`). With the box's side `D = 2r` (r in image px),
 * the image is `W / 2r` boxes wide and its top-left sits at
 * `(r - cx, r - cy)` image px from the box's own top-left, all of which are
 * plain percentages of the (square) box, so they scale with it for free.
 */
export function lupaLensPlacement(art: {
  readonly w: number
  readonly h: number
  readonly hole: { readonly cx: number; readonly cy: number; readonly r: number }
}): { leftPct: number; topPct: number; widthPct: number } {
  const r = art.hole.r * art.w
  const cx = art.hole.cx * art.w
  const cy = art.hole.cy * art.h
  const d = 2 * r
  return {
    leftPct: ((r - cx) / d) * 100,
    topPct: ((r - cy) / d) * 100,
    widthPct: (art.w / d) * 100,
  }
}

export const LUPA_LENS_PLACEMENT = lupaLensPlacement(TRANSITION_LENS_ART)

/** The CSS for the decorative magnifier — a sibling of the existing
 *  `.cv-screen-wipe` reveal, drawn on TOP of it (later in document order) so
 *  it reads as the edge of the glass the new screen is being seen THROUGH.
 *  `position: fixed; inset: 0; overflow: hidden` is what naturally clips the
 *  magnifier once it grows past the real viewport — no manual fade-out
 *  needed, the same "grows until nothing of it is left on screen" behaviour
 *  `clip-path`'s own 150% already relies on for the reveal itself.
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
  transform: translate(-50%, -50%);
  animation: cv-lupa-grow ${LUPA_WIPE_DURATION_MS}ms ease-out both;
}
@keyframes cv-lupa-grow {
  0% { width: 0; height: 0; }
  100% { width: ${LUPA_RIM_FINAL_DIAMETER_VMAX}vmax; height: ${LUPA_RIM_FINAL_DIAMETER_VMAX}vmax; }
}
/* The drawn magnifier (TRANSITION_LENS_ART), its empty glass on the box. */
.cv-lupa-lens {
  position: absolute;
  left: ${LUPA_LENS_PLACEMENT.leftPct.toFixed(3)}%;
  top: ${LUPA_LENS_PLACEMENT.topPct.toFixed(3)}%;
  width: ${LUPA_LENS_PLACEMENT.widthPct.toFixed(3)}%;
  height: auto;
  max-width: none;
  display: block;
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

// T31 follow-up (`odd/tasks/prewriting-stage-completion.md`, "the lupa look
// regressed on the View Transitions path"): the coordinator's own report —
// live DOM (this file's own rim/handle/highlight included) is hidden behind
// a native View Transition's snapshot overlay for the whole crossing
// (`screen/ScreenTransition.tsx`'s own investigation), so a browser that
// takes that path (Chrome — the author's own tablet) never saw the rim at
// all, regressing straight back to "a white circle expanding", the exact
// complaint T31 was meant to fix.
//
// Fix (the coordinator's own option (a)): give the rim its OWN
// `view-transition-name` (`LUPA_VT_NAME`) so it becomes a SEPARATE
// `::view-transition-group`, captured and composited independently of
// `root` — drawn ABOVE both the old and new root snapshots by default
// (later `view-transition-name` in paint order), never clipped by root's
// own `clip-path` (a different, unrelated pseudo-element tree).
//
// The captured "new" snapshot is the rim at a FIXED, already-fully-formed
// size (`LUPA_VT_BASE_DIAMETER_PX` — `.cv-lupa-circle--vt` overrides the
// live element's own `cv-lupa-grow` animation with `animation: none` so
// what gets captured is a CLEAR, readable lupa, never a near-zero sliver
// frozen mid-keyframe): capturing at 0 width/height would freeze an EMPTY
// bitmap with nothing to scale up into anything visible. The VT group's own
// `transform: scale()` keyframe then grows that captured image from a small
// fraction up to `calc(${LUPA_RIM_FINAL_DIAMETER_VMAX}vmax / ${LUPA_VT_BASE_DIAMETER_PX}px)`
// (a plain CSS division of two lengths, yielding the unitless scale factor
// that reaches the SAME final on-screen diameter the manual path's own
// `cv-lupa-grow` keyframe targets) — SAME duration/easing as
// `screen/ScreenTransition.tsx`'s own `ROOT_VIEW_TRANSITION_CSS`, so the two
// groups grow in step; not pixel-identical to root's own clip-path radius
// (this file's own header on why that was never the goal). Scaling one
// already-captured bitmap as a whole is what makes the handle and highlight
// track the circle's edge for free — they are baked into the SAME image,
// so their relative geometry never needs a second, independent keyframe.
//
// `::view-transition-old(lupa-rim) { display: none }` is load-bearing: a
// browser that ALSO uses the native path for the PREVIOUS hop into this
// same screen already has its OWN `.cv-lupa-rim--vt` element (from that
// earlier entrance), left by its `both`-fill keyframe at its own FINAL
// (fully grown) state — captured as "old" that would show a giant, already-
// expanded circle instead of a fresh pop-in. Hiding the old snapshot
// entirely makes every crossing start clean regardless of what the
// previous one left behind.
export const LUPA_VT_NAME = 'lupa-rim'

/** The rim's own FIXED captured size for the View Transition path (CSS
 *  px) — large enough to read clearly as a lupa once captured, small
 *  enough that scaling it up to `LUPA_RIM_FINAL_DIAMETER_VMAX` does not
 *  visibly pixelate a flat-coloured, bold-stroked shape over a fast
 *  ≤400ms grow. 300, not larger: the CAPTURED "new" image is whatever is
 *  actually PAINTED on screen, including `.cv-lupa-rim`'s own ancestor
 *  `overflow: hidden` clip — a diameter that does not comfortably fit
 *  inside the SMALLEST required viewport (844x390) would capture a
 *  cropped, lopsided circle instead of a clean one to scale up. */
export const LUPA_VT_BASE_DIAMETER_PX = 300

// T38 (`odd/tasks/prewriting-stage-completion.md`, the author's tablet play-
// test: "hay una lupa en el centro de la pantalla ... se queda siempre"). The
// live `.cv-lupa-rim--vt` element exists only so the browser can CAPTURE it
// for the crossing — it is drawn at its full `LUPA_VT_BASE_DIAMETER_PX` size
// with `animation: none`, and nothing ever hid it once the View Transition's
// pseudo-element tree was torn down, nor on a screen reached WITHOUT a native
// crossing at all (the first screen after the map, which `App.tsx` enters
// through its own manual wipe). Either way the live element itself stayed
// painted: an empty 300px magnifier ring (rim, glint, handle) over the centre.
//
// Fix: the wrapper is `visibility: hidden` by default and is shown ONLY while
// the document has an active View Transition (`:active-view-transition`, set
// from `document.startViewTransition()` until the crossing finishes). That
// window covers the "new" capture (taken after the update callback, while the
// transition is already active) and the whole animation, where
// `::view-transition-new(lupa-rim)` is a LIVE rendering of this element; the
// moment the crossing ends the pseudo tree and the match go away together, so
// the live ring never paints on its own. A screen mounted with no native
// crossing in flight never matches, so it never shows the ring. A browser
// that has `startViewTransition` but not the pseudo-class drops the rule and
// simply loses the decorative rim — never a stuck one.
export const LUPA_VT_ACTIVE_SELECTOR = ':root:active-view-transition .cv-lupa-rim--vt'

export const LUPA_VT_CSS = `
.cv-lupa-rim--vt { visibility: hidden; }
${LUPA_VT_ACTIVE_SELECTOR} { visibility: visible; }
.cv-lupa-rim--vt .cv-lupa-circle {
  view-transition-name: ${LUPA_VT_NAME};
  width: ${LUPA_VT_BASE_DIAMETER_PX}px;
  height: ${LUPA_VT_BASE_DIAMETER_PX}px;
  animation: none;
}
::view-transition-group(${LUPA_VT_NAME}) {
  transform-origin: center;
  animation: cv-lupa-vt-grow ${LUPA_WIPE_DURATION_MS}ms ease-out both;
}
::view-transition-old(${LUPA_VT_NAME}) { display: none; }
@keyframes cv-lupa-vt-grow {
  0% { transform: scale(0.001); }
  100% { transform: scale(calc(${LUPA_RIM_FINAL_DIAMETER_VMAX}vmax / ${LUPA_VT_BASE_DIAMETER_PX}px)); }
}
@media (prefers-reduced-motion: reduce) {
  ::view-transition-group(${LUPA_VT_NAME}) { animation-duration: 0.01ms !important; }
}
`
