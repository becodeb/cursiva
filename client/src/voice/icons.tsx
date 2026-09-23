// A code-drawn speaker glyph, shared by `SpeakButton` (always the "on" form
// — tapping it speaks, it is never itself muted) and `VoiceToggle` (either
// form, following the persisted setting). Same drawing convention
// `detective/icons.tsx` already established for this app's other ink
// controls: one or more plain `<path>` elements, no `<defs>`, no `<mask>`,
// no `<clipPath>`, no `<pattern>`, no filter, no referenced `href`/`url(...)`
// of any kind — every shape is authored coordinates, nothing hydrates from
// a definition that could fail to resolve on a real device
// (`canvas/TraceCanvas.tsx`'s own header is the scar this repeats).
//
// The glyph is aria-hidden on purpose, same reasoning `detective/icons.tsx`
// states for its own icons: it carries no accessible name of its own
// because the BUTTON wrapping it always does (`aria-label="Escuchar"` /
// "Silenciar la voz" / "Activar la voz").

/** Matches `detective/icons.tsx`'s own `ICON_INK` value (`'#1e293b'`, not
 *  exported there) — the same ink colour every drawn control and the
 *  child's own trace already use, restated here rather than imported so
 *  `voice/` never has to depend on `detective/` for one hex string. */
const ICON_INK = '#1e293b'

export interface SpeakerIconProps {
  /** `true` draws the crossed-out ("muted") form; default is the speaker
   *  with two sound-wave arcs ("on"). `SpeakButton` never passes this —
   *  it always means "tap to hear", regardless of the persisted mute flag
   *  (a muted app still lets a single button speak once). */
  muted?: boolean
}

/** A speaker glyph: a small box widening into a cone (the body, identical in
 *  both states) plus either two rightward sound-wave arcs (unmuted) or a
 *  crossing "X" in the same footprint (muted) — the same paired-glyph
 *  convention icon sets like Feather use for "volume"/"volume-x", drawn by
 *  hand here rather than imported (no new dependency). */
export function SpeakerIcon({ muted = false }: SpeakerIconProps) {
  return (
    <svg viewBox="0 0 40 40" width={22} height={22} aria-hidden="true" focusable="false">
      <path d="M8,14 L14,14 L22,6 L22,34 L14,26 L8,26 Z" fill={ICON_INK} stroke="none" />
      {muted ? (
        <>
          <path d="M26,13 L34,27" stroke={ICON_INK} strokeWidth={4} strokeLinecap="round" />
          <path d="M34,13 L26,27" stroke={ICON_INK} strokeWidth={4} strokeLinecap="round" />
        </>
      ) : (
        <>
          {/* Two quadratic Béziers, not arcs (unlike `detective/icons.tsx`'s
           * `RetryIcon`): each one's control point sits further right than
           * both its endpoints, which is what guarantees the curve bulges
           * AWAY from the speaker body — an arc's sweep-flag is easy to get
           * backwards by hand with no renderer to check against, and a
           * mirrored (leftward-bulging) wave would read as pointing INTO
           * the speaker rather than away from it. */}
          <path d="M25,16 Q29,20 25,24" fill="none" stroke={ICON_INK} strokeWidth={3} strokeLinecap="round" />
          <path d="M29,11 Q36,20 29,29" fill="none" stroke={ICON_INK} strokeWidth={3} strokeLinecap="round" />
        </>
      )}
    </svg>
  )
}
