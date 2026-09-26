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
import type { CSSProperties, ReactNode } from 'react'

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
    // No animation class, no clip-path — the flight (or whatever else this
    // hop is doing) is the whole visual event. Still keyed, so narration
    // keeps the exact same mount/unmount contract every other kind gives.
    return <div key={screenKey}>{children}</div>
  }
  const originStyle: CSSProperties | undefined = origin
    ? ({ ['--cv-wipe-x' as string]: `${origin.xPct}%`, ['--cv-wipe-y' as string]: `${origin.yPct}%` } as CSSProperties)
    : undefined
  return (
    <div key={screenKey} className="cv-screen-wipe" style={originStyle}>
      <style>{SCREEN_TRANSITION_CSS}</style>
      {children}
    </div>
  )
}
