// Ink-drawn control icons for a detective trail (design unit 12,
// Orchestrator Correction C1: "Controls become icon-only and keep the
// shipped 64px tap floor: retry and continue as ink glyphs, drawn the same
// way PISTAS is. Back stays as an affordance, as an icon."). Each icon is a
// stroked or filled ink shape, no text, no `url(#...)`, no font, no
// `@font-face` — consistent with `PistasRail.tsx`'s drawn word.
//
// Unlike `levels/paths.ts`'s generators, these are never fed through
// `transformPath`, so the `M`/`L`-only restriction that applies to level
// route data does not apply here — a curved arrow reads better than a
// polygonal one, so `RetryIcon` uses one arc.
import type { ReactNode } from 'react'

/** The glyphs are aria-hidden on purpose: they carry no accessible name of
 * their own, because the BUTTON that wraps one carries it via aria-label. The
 * screen stays wordless for the child; the control stays named for anyone
 * using a screen reader. Those are not the same requirement.
 */
/** Matches the shipped ink `TraceCanvas.tsx:89` (`INK_COLOR '#1e293b'`, not
 * exported) — the same hand that draws the child's own trace and the
 * `PistasRail` word. */
const ICON_INK = '#1e293b'
const ICON_STROKE_WIDTH = 5

function IconSvg({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 40 40" width={26} height={26} aria-hidden="true" focusable="false">
      {children}
    </svg>
  )
}

/** Replaces "‹ Volver": a plain chevron pointing left. The back affordance
 * itself is unchanged — only its label becomes a glyph (C1). */
export function BackIcon() {
  return (
    <IconSvg>
      <path
        d="M25,8 L13,20 L25,32"
        fill="none"
        stroke={ICON_INK}
        strokeWidth={ICON_STROKE_WIDTH}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </IconSvg>
  )
}

/** Replaces "Borrar": a circular arrow — start the drawing over. The one
 * curved stroke in this file; see the module comment for why that is fine
 * here even though `levels/paths.ts` output must stay `M`/`L` only. */
export function RetryIcon() {
  return (
    <IconSvg>
      <path
        d="M30,20 A10,10 0 1 1 20,10"
        fill="none"
        stroke={ICON_INK}
        strokeWidth={ICON_STROKE_WIDTH}
        strokeLinecap="round"
      />
      <path d="M20,10 L28,10 L24,17 Z" fill={ICON_INK} stroke="none" />
    </IconSvg>
  )
}

/** Replaces "Ver de nuevo": a plain play triangle — watch the route again. */
export function ReplayIcon() {
  return (
    <IconSvg>
      <path d="M14,10 L14,30 L30,20 Z" fill={ICON_INK} stroke="none" />
    </IconSvg>
  )
}

/** Replaces "Siguiente": a plain chevron pointing right. */
export function ContinueIcon() {
  return (
    <IconSvg>
      <path
        d="M15,8 L27,20 L15,32"
        fill="none"
        stroke={ICON_INK}
        strokeWidth={ICON_STROKE_WIDTH}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </IconSvg>
  )
}
