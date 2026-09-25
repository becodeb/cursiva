// A short, purely visual cross-fade between screens (prewriting-stage-
// completion T8 item 4: "short transitions between screens (map ↔ intro ↔
// level ↔ closing ↔ map)"). Wraps whichever screen `App.tsx`/`GameScreen.tsx`
// is about to render in one plain div, keyed by the screen's own identity —
// `App.tsx`'s `shellTransitionKey` and `GameScreen.tsx`'s own
// `screenTransitionKey`, both pure and directly tested. Switching to a
// DIFFERENT screen changes that key, which forces React to mount a fresh
// wrapper (and therefore replay the fade); an update WITHIN the same screen
// (a prologue plate advancing, a closing beat advancing, a level's own
// re-render) keeps the SAME key and therefore the SAME wrapper — no extra
// mount, so `useNarration`'s own mount/unmount-driven speak never fires
// twice and never gets cut mid-line for a screen that did not actually
// change.
//
// Opacity only, no transform: `LevelPlay`/`TraceCanvas` (wrapped from here,
// never edited directly — see this task's own file boundary) and `ZooMap`
// both read their own layout off the DOM on mount, and a transform mid-
// animation could offset that measurement for the duration of the fade;
// opacity never does. The wrapper itself carries no size or position rule
// beyond the animation, so it is transparent to whatever layout the caller
// already had.
import type { ReactNode } from 'react'

export const SCREEN_TRANSITION_CSS = `
.cv-screen-fade { animation: cv-screen-fade-in 200ms ease-out both; }
@keyframes cv-screen-fade-in {
  0% { opacity: 0; }
  100% { opacity: 1; }
}
@media (prefers-reduced-motion: reduce) { .cv-screen-fade { animation: none; } }
`

export interface ScreenTransitionProps {
  /** Identifies WHICH screen this is — stable across an in-place update,
   *  different across a real screen change. See this file's own header for
   *  why that distinction is what keeps a narrated line from ever speaking
   *  twice or being cut. */
  screenKey: string
  children: ReactNode
}

export default function ScreenTransition({ screenKey, children }: ScreenTransitionProps) {
  return (
    <div key={screenKey} className="cv-screen-fade">
      <style>{SCREEN_TRANSITION_CSS}</style>
      {children}
    </div>
  )
}
