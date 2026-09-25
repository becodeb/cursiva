// The persisted mute switch (docs/18 §3 "Todo se escucha"; adventure-flow-
// and-map-guidance T7). One instance lives in the zoo map's HUD
// (`screen/ZooMap.tsx`) — muting there mutes every screen's narration, since
// `narrator.ts`'s `speak()` reads the SAME persisted flag no matter which
// screen calls it.
//
// Styled inline for the same reason `SpeakButton.tsx`'s own header states:
// this is dropped into a caller's own stylesheet as chrome with a fixed
// visual identity, not a shape the caller should have to restate.
import { useState, type CSSProperties } from 'react'
import { loadVoiceSettings, saveVoiceSettings } from './narrator'
import { SpeakerIcon } from './icons'

/** Identical footprint to `SpeakButton`'s own `BASE_STYLE` — the two controls
 *  are siblings in the same visual language (the game's marker style: warm
 *  paper fill, thick dark outline, no shadow), never two different chrome
 *  styles competing on the same screen. Restyled alongside `SpeakButton`
 *  (T7 rework #2, `odd/tasks/prewriting-stage-completion.md`) — this one
 *  sits DIRECTLY BESIDE `ZooMap.tsx`'s own star pill, so leaving it on the
 *  old white-pill identity would have recreated the exact "two chrome
 *  families on one screen" mismatch that rework fixed for the star/
 *  backpack/recovered pills. */
const SHEET_PAPER = '#fdfcf7'
const BASE_STYLE: CSSProperties = {
  width: 44,
  height: 44,
  minWidth: 44,
  minHeight: 44,
  boxSizing: 'border-box',
  borderRadius: '50%',
  border: '3px solid #1a1a1a',
  background: SHEET_PAPER,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 0,
  cursor: 'pointer',
}

export interface VoiceToggleProps {
  /** Positions this instance within its own screen (see `SpeakButton`'s own
   *  `className` doc — the same "position only" contract applies here). */
  className?: string
}

/**
 * Mute/unmute the whole narrator, persisted at `cursiva.voice.v1`
 * (`narrator.ts`) so the choice survives a reload and applies to every
 * screen, not only this one session. The initial state is read straight
 * from storage on mount (`useState`'s lazy initializer runs during SSR too,
 * so `renderToString` already shows the real persisted state rather than a
 * hard-coded default) — there is deliberately no subscription to a SECOND
 * mounted `VoiceToggle` changing the same flag, because this app never
 * shows two at once (one instance, in the map's own HUD).
 */
export default function VoiceToggle({ className }: VoiceToggleProps) {
  const [muted, setMuted] = useState(() => loadVoiceSettings().muted)

  const toggle = () => {
    const next = !muted
    saveVoiceSettings({ muted: next })
    setMuted(next)
  }

  return (
    <button
      type="button"
      className={className}
      style={BASE_STYLE}
      aria-label={muted ? 'Activar la voz' : 'Silenciar la voz'}
      onClick={toggle}
    >
      <SpeakerIcon muted={muted} />
    </button>
  )
}
