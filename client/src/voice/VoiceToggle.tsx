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
import { playSfx } from '../audio/sfx'
import { loadVoiceSettings, saveVoiceSettings } from './narrator'
import { SpeakerIcon } from './icons'

/** Identical footprint to `SpeakButton`: the same paper object in the same family. */
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
    playSfx('tap')
    saveVoiceSettings({ muted: next })
    setMuted(next)
  }

  return (
    <button
      type="button"
      className={className}
      data-paper-tap=""
      style={BASE_STYLE}
      aria-label={muted ? 'Activar la voz' : 'Silenciar la voz'}
      onClick={toggle}
    >
      <SpeakerIcon muted={muted} />
    </button>
  )
}
