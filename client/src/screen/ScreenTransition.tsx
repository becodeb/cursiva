// A short, purely visual transition between screens (prewriting-stage-
// completion T8 item 4: "short transitions between screens (map ↔ intro ↔
// level ↔ closing ↔ map)"; T24, `docs/19_PROPUESTA_HISTORIA_Y_MECANICAS.md`
// §6, replaces the plain fade T8 shipped with the "lupa" — a growing
// circular reveal — for every ORDINARY screen change). Wraps whichever
// screen `App.tsx`/`GameScreen.tsx` is about to render in one plain div,
// keyed by the screen's own identity — `App.tsx`'s `shellTransitionKey` and
// `GameScreen.tsx`'s own `screenTransitionKey`, both pure, directly tested,
// and UNCHANGED by T24: this file only widens what the wrapper does with an
// already-existing key, never how that key is computed, which is exactly
// what keeps `useNarration`'s own mount/unmount-driven speak from ever
// firing twice (this file's own next paragraph).
//
// Switching to a DIFFERENT screen changes the key, which forces React to
// mount a fresh wrapper (and therefore replay the transition); an update
// WITHIN the same screen (a prologue plate advancing, a closing beat
// advancing, a level's own re-render) keeps the SAME key and therefore the
// SAME wrapper — no extra mount, so a screen that did not actually change
// never gets its narration cut or repeated.
//
// `kind='wipe'` (the default): a growing circle, CSS `clip-path: circle()`
// on this plain wrapper `<div>` — NOT the SVG `<mask>`/`url(#…)` mechanism
// `canvas/TraceCanvas.tsx`'s own header bans (`MAZE_WALL`'s "why it is not a
// mask"): that ban is specifically about an INLINE SVG `<mask>` referenced
// by `url(#id)` (a `useId()`-derived id that differs between server and
// client, `url(#…)` resolving against the document base URL, and mask +
// preserveAspectRatio letterboxing's own history of engine bugs — all three
// are properties of the SVG masking/reference MECHANISM, not of "clipping a
// shape" as an idea). `clip-path: circle()` on an ordinary HTML element is a
// different, reference-free CSS property: no `<defs>`, no `id`, nothing
// resolved against a URL, nothing inside an SVG document at all — the exact
// same reasoning `RevealLayer.tsx`'s own flashlight veil already relies on
// for its OWN even-odd path fill instead of a mask. Growing the circle from
// 0% to 150% (using a plain `at <x> <y>` origin, not `url(#…)`) covers the
// whole box regardless of where that origin sits, including a corner.
//
// `kind='none'`: no wrapper animation at all — T24's own rescue flight
// (`zoo/rescueFlight.ts`, `AdventureClosing.tsx`, `ZooMap.tsx`) is the actual
// transition for that one hop (closing → map, an animal-recovering row),
// and a wipe growing OVER a flying animal would clip it mid-flight before
// the circle finishes growing (`App.tsx`'s own map-shell branch is the one
// caller that passes this).
//
// `clip-path` never affects layout or the boxes a mounting child measures:
// `LevelPlay`/`TraceCanvas` and `ZooMap` both read their own layout off the
// DOM on mount, which is exactly why the OLD fade stayed opacity-only
// (never transform) — `clip-path`, like `opacity`, is a paint-time effect
// with zero influence on `getBoundingClientRect()`/`ResizeObserver`
// readings, so it keeps that same safety property.
//
// T31 (`odd/tasks/prewriting-stage-completion.md`): the play-test note
// "funciona pero es feo; parece un círculo blanco que crece, no se nota que
// es una lupa" — the growing `clip-path` circle above is UNCHANGED (it is
// the actual reveal, already within budget); a decorative rim/handle/
// highlight group (`lupaWipe.ts`, its own geometry) is now drawn ON TOP of
// it, as a LATER sibling inside the same wrapper, so it paints over the
// newly-revealed screen's edge as it grows — the exact "positioned over the
// circle's edge as it grows" the task's own brief asks for. Sharing the SAME
// `key`/`style` (the origin custom properties) as the reveal wrapper is what
// keeps the two growing from the same point; `lupaWipe.ts`'s own header
// explains why the two do not need pixel-identical radii to read as one
// magnifying glass. Never rendered for `kind='none'` (T24's rescue flight)
// — the decorative rim would otherwise grow over the flying animal exactly
// like the reveal itself is already excused from doing.
//
// T31 follow-up (`odd/tasks/prewriting-stage-completion.md`, "the abrupt
// night ending"): a play-test found the completion-growth-then-hold
// sequence itself correct (T30's own verification) — the actual cut is ONE
// FRAME LATER, when `GameScreen.tsx` swaps `state` and this file's own
// key-swap remount tears the fully-lit scene down with nothing left to
// bridge FROM: the growing circle above reveals the NEXT screen over
// whatever is behind it, which for a screen that has ALREADY unmounted is
// blank page background, not the outgoing frame.
//
// `ROOT_VIEW_TRANSITION_CSS` fixes this for `level → next-level` and
// `level → closing` (`GameScreen.tsx`'s own `advanceView`) by handing the
// crossing to the browser's native View Transitions API — the SAME
// mechanism `zoo/rescueFlight.ts`/`ZooMap.tsx` already use for the rescue
// flight, proven in this exact environment. `document.startViewTransition`
// captures a REAL PIXEL SNAPSHOT of the outgoing DOM before it unmounts —
// something no amount of clever React state can do once `LevelPlay`'s own
// `key={state.levelId}` remounts it — so there IS an outgoing frame to
// reveal over, unlike the manual `.cv-screen-wipe` path. `::view-transition-
// old(root)` is given `animation: none` so the OUTGOING snapshot simply
// STAYS at full opacity underneath for the whole crossing (never fading, so
// the lit scene is visibly still there right up until the moment the new
// one covers it); `::view-transition-new(root)` grows the SAME lupa-style
// circle (`clip-path`, `0%` to `150%`, centred — VT pseudo-elements are
// ordinary styleable/animatable boxes, replacing the UA stylesheet's own
// default cross-fade entirely) to reveal the incoming screen OVER that
// still-visible old frame. `GameScreen.tsx` passes `kind='none'` to this
// component's own manual wipe whenever native View Transitions are
// available, so the two mechanisms are never both active for the same hop
// — a manual `.cv-screen-wipe`/its decorative rim is the FALLBACK for a
// browser without View Transitions (where there is no outgoing snapshot to
// bridge from either way, so the pre-existing behaviour is the best
// available). Live DOM (this file's own decorative rim/handle/highlight
// included) is hidden behind the View Transition's own snapshot overlay for
// the crossing's whole duration — see this file's own investigation notes —
// so the rim decoration is deliberately NOT attempted here; a plain growing
// circle is what the task's own brief allows ("the lupa wipe... or a short
// cross-fade").
import type { CSSProperties, ReactNode } from 'react'
import { LUPA_WIPE_CSS, lupaRimOriginStyle } from './lupaWipe'

/** How long the native View Transition's own circle grows for — matches
 *  `WIPE_DURATION_MS` below so the two paths feel the same regardless of
 *  which one a given browser takes. */
export const ROOT_VIEW_TRANSITION_DURATION_MS = 300

/**
 * Global — `::view-transition-*` pseudo-elements attach to the DOCUMENT
 * root, never to wherever a `<style>` tag happens to sit in the DOM, so this
 * is safe to render from anywhere exactly once (`GameScreen.tsx` renders it
 * unconditionally, alongside its own `advanceView` — never from THIS
 * component: `kind='none'` already means "no clip-path from me", and this
 * file's own `kind='none'` test asserts exactly that string is absent, so
 * mixing this export into that branch would falsify a test that is still
 * correct about what THIS component itself does). Inert everywhere it is
 * rendered unless a View Transition is actually in flight: the pseudo-
 * elements this file selects only exist for the brief window
 * `document.startViewTransition` itself creates them.
 */
export const ROOT_VIEW_TRANSITION_CSS = `
::view-transition-old(root) {
  animation: none;
}
::view-transition-new(root) {
  animation: cv-root-view-transition-wipe-in ${ROOT_VIEW_TRANSITION_DURATION_MS}ms ease-out both;
}
@keyframes cv-root-view-transition-wipe-in {
  0% { clip-path: circle(0% at 50% 50%); }
  100% { clip-path: circle(150% at 50% 50%); }
}
@media (prefers-reduced-motion: reduce) {
  ::view-transition-group(root) { animation-duration: 0.01ms !important; }
}
`

/** How long the wipe (or the old fade, kept only for this constant's own
 *  external reference — no caller asks for `kind='fade'` any more) takes —
 *  within the task's own "≤ 350ms" budget. */
const WIPE_DURATION_MS = 300

export const SCREEN_TRANSITION_CSS = `
.cv-screen-wipe {
  clip-path: circle(0% at var(--cv-wipe-x, 50%) var(--cv-wipe-y, 50%));
  animation: cv-screen-wipe-in ${WIPE_DURATION_MS}ms ease-out both;
}
@keyframes cv-screen-wipe-in {
  0% { clip-path: circle(0% at var(--cv-wipe-x, 50%) var(--cv-wipe-y, 50%)); }
  100% { clip-path: circle(150% at var(--cv-wipe-x, 50%) var(--cv-wipe-y, 50%)); }
}
@media (prefers-reduced-motion: reduce) { .cv-screen-wipe { animation: none; clip-path: none; } }
${LUPA_WIPE_CSS}
`

export type ScreenTransitionKind = 'wipe' | 'none'

export interface ScreenTransitionProps {
  /** Identifies WHICH screen this is — stable across an in-place update,
   *  different across a real screen change. See this file's own header for
   *  why that distinction is what keeps a narrated line from ever speaking
   *  twice or being cut. */
  screenKey: string
  /** `'wipe'` (default) for every ordinary screen change; `'none'` for the
   *  one hop T24's own rescue flight animates instead (this file's own
   *  header). */
  kind?: ScreenTransitionKind
  /** Where the circle grows FROM, percent of the wrapper's own box — default
   *  centred. `docs/19` §6 also allows "at the Pulpito's lupa"; no caller
   *  threads a real tap position yet (a future enhancement point, not a
   *  T24 requirement), so every current caller uses the centred default. */
  origin?: { xPct: number; yPct: number }
  children: ReactNode
}

export default function ScreenTransition({ screenKey, kind = 'wipe', origin, children }: ScreenTransitionProps) {
  if (kind === 'none') {
    // No animation class, no clip-path — the flight (T24) or a caller's own
    // native View Transition (T31 follow-up, `GameScreen.tsx`'s own
    // `advanceView` — that file renders `ROOT_VIEW_TRANSITION_CSS` itself,
    // once, globally, never from here) is the whole visual event instead.
    // Still keyed, so narration keeps the exact same mount/unmount contract
    // every other kind gives.
    return <div key={screenKey}>{children}</div>
  }
  const originStyle: CSSProperties | undefined = origin
    ? ({ ['--cv-wipe-x' as string]: `${origin.xPct}%`, ['--cv-wipe-y' as string]: `${origin.yPct}%` } as CSSProperties)
    : undefined
  // T31: the lupa's own rim/handle/highlight is a SIBLING of `.cv-screen-
  // wipe`, never its CHILD — `clip-path` on an ancestor clips its entire
  // painted subtree (fixed-position descendants included: it establishes
  // their containing block same as `transform`/`filter` do), so nesting the
  // rim inside the growing-circle wrapper would clip the rim to that SAME
  // circle and hide the very edge it exists to mark. The outer `<div>`
  // below carries the `key` instead (React's own remount-on-key-change
  // applies to a single child position exactly as it does to a list, this
  // file's own header) so the wipe and its decorative rim mount/unmount
  // together as one unit.
  return (
    <div key={screenKey}>
      <div className="cv-screen-wipe" style={originStyle}>
        <style>{SCREEN_TRANSITION_CSS}</style>
        {children}
      </div>
      <div className="cv-lupa-rim" style={lupaRimOriginStyle(origin)} aria-hidden="true">
        <div className="cv-lupa-circle">
          <div className="cv-lupa-highlight" />
          <div className="cv-lupa-handle" />
        </div>
      </div>
    </div>
  )
}
