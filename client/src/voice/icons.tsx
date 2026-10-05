// The speaker button's face, shared by `SpeakButton` (always the "on" form
// — tapping it speaks, it is never itself muted) and `VoiceToggle` (either
// form, following the persisted setting). Since T50 it is the author's own
// hand-drawn button art, a plain `<img>` (`detective/icons.tsx`'s
// `ButtonArt`): no `<defs>`, no `<mask>`, no `url(...)` of any kind.
//
// The picture is aria-hidden on purpose, same reasoning `detective/icons.tsx`
// states for its own icons: it carries no accessible name of its own
// because the BUTTON wrapping it always does (`aria-label="Escuchar"` /
// "Silenciar la voz" / "Activar la voz").

import { ButtonArt } from '../detective/icons'
import { UI_BUTTON_ART } from '../detective/assets'

export interface SpeakerIconProps {
  /** `true` shows the muted face (the speaker with a small X); default is
   *  the speaker with two sound waves. `SpeakButton` never passes this —
   *  it always means "tap to hear", regardless of the persisted mute flag
   *  (a muted app still lets a single button speak once). */
  muted?: boolean
}

/** The speaker button's face. T50 (`docs/23` D36, §7.7): the author's own
 *  hand-drawn round buttons (`UI_BUTTON_ART.sound`/`.soundOff`) instead of
 *  the code-drawn glyph; the wrapping button keeps its `aria-label`. */
export function SpeakerIcon({ muted = false }: SpeakerIconProps) {
  return <ButtonArt art={muted ? UI_BUTTON_ART.soundOff : UI_BUTTON_ART.sound} />
}
