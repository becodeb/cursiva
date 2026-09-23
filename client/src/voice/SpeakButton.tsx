// The "hear it again" control (docs/18 §3 "Todo se escucha" — every
// dialogue/hint gets a repeat button, not only an autoplay a child might
// miss or talk over). adventure-flow-and-map-guidance T7.
//
// Styled INLINE rather than through a call site's own `<style>` block: this
// button is dropped into five different screens (the prologue, the intro,
// the closing, the level hint row), each with its own scoped stylesheet
// (`PROLOGUE_CSS`/`INTRO_CSS`/`CLOSING_CSS`/`LAYOUT_CSS`), and a shared
// "round, at-least-44px, white" identity is exactly the part that must
// render correctly EVEN IF a caller's own stylesheet never mentions it —
// the visual identity is this component's own contract, not something five
// separate authors have to remember to repeat. `className` is for
// POSITION only (each screen places this button somewhere different
// relative to its own bubble/row) — never for re-skinning the button
// itself, which is why the base styles are not overridable through it.
import type { CSSProperties } from 'react'
import { speak } from './narrator'
import { SpeakerIcon } from './icons'

/** 44 CSS px in every dimension — the shipped child tap-target floor this
 *  whole app already uses for a control that is meant to be pressed on
 *  purpose (`screen/LevelPlay.tsx`'s own `.cv-btn`/`.cv-btn-back` share the
 *  same floor at their narrowest breakpoint). The colours match
 *  `screen/ZooMap.tsx`'s HUD pills (`rgba(255, 255, 255, 0.86)` background,
 *  the same drop shadow) so this button reads as the SAME kind of chrome
 *  wherever it lands, never as a fourth, differently-styled control. */
const BASE_STYLE: CSSProperties = {
  width: 44,
  height: 44,
  minWidth: 44,
  minHeight: 44,
  boxSizing: 'border-box',
  borderRadius: '50%',
  border: '1px solid #cbd5e1',
  background: 'rgba(255, 255, 255, 0.92)',
  boxShadow: '0 2px 6px rgba(0, 0, 0, 0.18)',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 0,
  cursor: 'pointer',
}

export interface SpeakButtonProps {
  /** The exact sentence to speak on tap — the same string the caller shows
   *  (or, in the detective world, would have shown) beside it. */
  line: string
  /** Positions this instance within its own screen; never restyles the
   *  button's own round/44px/white identity (see the module header). */
  className?: string
}

/**
 * A round, always-available "hear it again" button (docs/18 D1/T7). Tapping
 * it speaks `line` regardless of the persisted mute setting — muting turns
 * off the automatic narration `useNarration` drives, never this explicit,
 * on-purpose request, and a tap is itself the user gesture that lets speech
 * play at all (`narrator.ts`'s own `canAutoSpeak` doc comment) — this button
 * is therefore also the ONLY way the prologue's very first line is ever
 * heard, since nothing has been tapped yet when it first mounts.
 *
 * `aria-label="Escuchar"` is REQUIRED here, not optional chrome: the glyph
 * inside is `aria-hidden` (`SpeakerIcon`), so without this label the control
 * would have no accessible name at all.
 */
export default function SpeakButton({ line, className }: SpeakButtonProps) {
  return (
    <button
      type="button"
      className={className}
      style={BASE_STYLE}
      aria-label="Escuchar"
      onClick={() => speak(line)}
    >
      <SpeakerIcon />
    </button>
  )
}
