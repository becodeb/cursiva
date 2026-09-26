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
import type { CSSProperties, ReactNode } from 'react'
import { SHEET_PAPER } from '../canvas/TraceCanvas'

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

/** Closes an overlay (`screen/DetectiveNotebook.tsx`, T23,
 *  `odd/tasks/prewriting-stage-completion.md`): a plain X, two crossed
 *  strokes — the same wordless-glyph convention every other icon in this
 *  file follows (aria-hidden, named by the button that wraps it). */
export function CloseIcon() {
  return (
    <IconSvg>
      <path
        d="M11,11 L29,29 M29,11 L11,29"
        fill="none"
        stroke={ICON_INK}
        strokeWidth={ICON_STROKE_WIDTH}
        strokeLinecap="round"
      />
    </IconSvg>
  )
}

/** The notebook's own title mark (`screen/DetectiveNotebook.tsx` T23
 *  follow-up, orchestrator screenshot review: "a title drawn as the
 *  Pulpito's lupa + a notebook icon — no reading needed"): a spiral-bound
 *  pad, drawn the same ink-outline way every other icon here is. No fixed
 *  `width`/`height` (unlike `IconSvg`'s other glyphs) — this one is sized by
 *  its caller's own CSS, next to the lupa picture at the top of the page,
 *  never at this file's fixed 26px control-icon size. */
export function NotebookPadIcon() {
  return (
    <svg viewBox="0 0 40 40" aria-hidden="true" focusable="false">
      <rect x="8" y="4" width="25" height="32" rx="3" fill="none" stroke={ICON_INK} strokeWidth={3} />
      <circle cx="8" cy="10" r="1.6" fill={ICON_INK} />
      <circle cx="8" cy="17" r="1.6" fill={ICON_INK} />
      <circle cx="8" cy="24" r="1.6" fill={ICON_INK} />
      <circle cx="8" cy="31" r="1.6" fill={ICON_INK} />
      <line x1="14" y1="13" x2="28" y2="13" stroke={ICON_INK} strokeWidth={2} strokeLinecap="round" />
      <line x1="14" y1="20" x2="28" y2="20" stroke={ICON_INK} strokeWidth={2} strokeLinecap="round" />
      <line x1="14" y1="27" x2="24" y2="27" stroke={ICON_INK} strokeWidth={2} strokeLinecap="round" />
    </svg>
  )
}

/** Stands in for a missing animal whose OWN colour art is a placeholder
 *  (`detective/assets.ts`'s `PLACEHOLDER_ZOO_ANIMALS` — today only `mono`,
 *  `docs/20_PEDIDOS_DE_ARTE_TANDA_3.md` B10): the derived silhouette of a
 *  flat sign block is a featureless black square, which read as broken art
 *  rather than "an animal not yet found" (orchestrator screenshot review).
 *  A paw print, drawn the same ink-outline way every other icon here is —
 *  never a photo, never new art. `data-cv-picture="true"` is what lets this
 *  count as the notebook card's own picture for `captionAudit.ts`'s
 *  invariant: that module only recognises an `<img>`/`<image href>` by
 *  default, because every other picture in this app is raster; this is the
 *  first drawn-in-code picture standing ALONE as a card's own image (not a
 *  control glyph beside an already-captioned picture, `icons.tsx`'s own
 *  header case), so the audit needs one explicit, narrow opt-in rather than
 *  treating every aria-hidden decorative glyph in the app as captioned art
 *  by accident. */
export function PawPrintIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      aria-hidden="true"
      focusable="false"
      data-cv-picture="true"
      className={className}
    >
      <PawGlyph />
    </svg>
  )
}

/** The four shapes `PawPrintIcon` draws, factored out so
 *  {@link PlaceholderAnimalBadge} (below) can frame the SAME glyph inside its
 *  own circle rather than a second, hand-copied set of coordinates that could
 *  drift from this one. */
function PawGlyph() {
  return (
    <>
      <ellipse cx="50" cy="64" rx="24" ry="20" fill="none" stroke={ICON_INK} strokeWidth="6" />
      <circle cx="24" cy="34" r="11" fill="none" stroke={ICON_INK} strokeWidth="6" />
      <circle cx="50" cy="21" r="11" fill="none" stroke={ICON_INK} strokeWidth="6" />
      <circle cx="76" cy="34" r="11" fill="none" stroke={ICON_INK} strokeWidth="6" />
    </>
  )
}

/**
 * [T27 follow-up, orchestrator screenshot review 2026-09-27] The SAME
 * placeholder-animal stand-in as {@link PawPrintIcon}, framed for a spot that
 * carries no card of its own behind it — the level canvas (a collect item
 * standing on the corridor), the closing's big rescue animal, and the map's
 * own rescue-flight overlay. `Deduction.tsx`'s lineup and
 * `DetectiveNotebook.tsx`'s grid already sit their picture on a paper CARD
 * (`.animal-btn`/`.cv-notebook-card`), so the bare `PawPrintIcon` reads fine
 * there without a second circle drawn around it; everywhere else, a
 * left-over `<image>` box would draw is either a floating ink mark with
 * nothing to read it against, or (worse) `PLACEHOLDER_ZOO_ANIMALS`'s own
 * ACTUAL colour art — a featureless grey sign block, exactly the "meaningless
 * box" defect this whole family exists to avoid. This is that ONE drawn
 * picture, reused at every such spot (`detective/assets.ts`'s
 * `isPlaceholderArt` is the ONE decision of WHEN to reach for it).
 *
 * `x`/`y`/`width`/`height` are the SVG root's own positioning attributes —
 * present only for a caller nesting this inside another `<svg>` (a level's
 * own `TraceCanvas`, which owns one coordinate system and cannot place an
 * HTML-positioned child inside it); a caller in ordinary HTML flow
 * (`AdventureClosing.tsx`, `ZooMap.tsx`) instead sizes this exactly like an
 * `<img>` would be, through `className`/`style`, and leaves these four unset.
 */
export function PlaceholderAnimalBadge({
  className,
  style,
  x,
  y,
  width,
  height,
}: {
  className?: string
  style?: CSSProperties
  x?: number
  y?: number
  width?: number
  height?: number
}) {
  return (
    <svg
      viewBox="0 0 100 100"
      aria-hidden="true"
      focusable="false"
      data-cv-picture="true"
      className={className}
      style={style}
      x={x}
      y={y}
      width={width}
      height={height}
    >
      {/* Marker-style card, restated as a circle (`docs/09` §1: paper fill,
          thick dark outline, no shadow) — the same visual language
          `.animal-btn`/`.cv-notebook-card`/`.cv-deduction-chip` already
          carry, so a badge with no HTML card around it still reads as one
          of this app's own marker pictures instead of a bare ink doodle. */}
      <circle cx="50" cy="50" r="46" fill={SHEET_PAPER} stroke={ICON_INK} strokeWidth="6" />
      <PawGlyph />
    </svg>
  )
}
