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
import { playSfx } from '../audio/sfx'
import { speak } from './narrator'
import { SpeakerIcon } from './icons'

/** The app's one tap size (`--cv-tap-size`, `puppet/PaperButton.tsx`): 64 px on a tablet,
 *  smaller paper with a 64 px hit area on a phone. The speaker is the whole face, so the
 *  button draws no chrome of its own. Inline for the reason the header gives. */
const BASE_STYLE: CSSProperties = {
  width: 'var(--cv-tap-size, 64px)',
  height: 'var(--cv-tap-size, 64px)',
  boxSizing: 'border-box',
  border: 'none',
  background: 'transparent',
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
 * play at all (`narrator.ts`'s own `canAutoSpeak` doc comment). (The
 * prologue's very first line, which can mount before any tap at all, has
 * its own start tap since `docs/25` P2-5 — `screen/PrologueOpening.tsx`.)
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
      data-paper-tap=""
      style={BASE_STYLE}
      aria-label="Escuchar"
      onClick={() => {
        playSfx('tap')
        speak(line)
      }}
    >
      <SpeakerIcon />
    </button>
  )
}
