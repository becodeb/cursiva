// Control icons for a detective trail (design unit 12, Orchestrator
// Correction C1: "Controls become icon-only and keep the shipped 64px tap
// floor"). The button faces (back, retry, replay, next, close) are the
// author's hand-drawn button art since T50 (`ButtonArt` below); the other
// marks here (the notebook pad, the paw, the pointing hand) are still ink
// shapes drawn in code, no text, no `url(#...)`, no font, no `@font-face` —
// consistent with `PistasRail.tsx`'s drawn word.
import type { CSSProperties } from 'react'
import { SHEET_PAPER } from '../canvas/TraceCanvas'
import { UI_BUTTON_ART, type ArtImage } from './assets'

/** The glyphs are aria-hidden on purpose: they carry no accessible name of
 * their own, because the BUTTON that wraps one carries it via aria-label. The
 * screen stays wordless for the child; the control stays named for anyone
 * using a screen reader. Those are not the same requirement.
 */
/** Matches the shipped ink `TraceCanvas.tsx:89` (`INK_COLOR '#1e293b'`, not
 * exported) — the same hand that draws the child's own trace and the
 * `PistasRail` word. */
const ICON_INK = '#1e293b'

/** T50 (`docs/23` D36, §7.7): the chrome buttons are the author's own
 * hand-drawn round buttons (`UI_BUTTON_ART`, cut from `botones lamina.png`),
 * not code-drawn glyphs any more. Each one is the WHOLE face of its button:
 * the wrapping `<button>` drops its own pill chrome (`.cv-btn-art` in
 * `LevelPlay.tsx`'s `LAYOUT_CSS`, or the button's own style) and keeps its
 * `aria-label` and its tap size. Sized by its button (100% of the box),
 * aria-hidden for the reason this file's header gives, and not draggable so
 * a long press never starts an image drag on a tablet. */
export function ButtonArt({ art }: { art: ArtImage }) {
  return (
    <img
      className="cv-btn-art-img"
      src={art.href}
      width={art.w}
      height={art.h}
      alt=""
      aria-hidden="true"
      draggable={false}
      style={BUTTON_ART_STYLE}
    />
  )
}

const BUTTON_ART_STYLE: CSSProperties = {
  display: 'block',
  width: '100%',
  height: '100%',
  objectFit: 'contain',
  pointerEvents: 'none',
}

/** Back ("‹ Volver"): the round button with the arrow pointing left. */
export function BackIcon() {
  return <ButtonArt art={UI_BUTTON_ART.back} />
}

/** Retry ("Borrar"): the round button with the circular arrow. */
export function RetryIcon() {
  return <ButtonArt art={UI_BUTTON_ART.retry} />
}

/** Watch again ("Ver de nuevo"): the round button with the play triangle. */
export function ReplayIcon() {
  return <ButtonArt art={UI_BUTTON_ART.replay} />
}

/** Next ("Siguiente"): the yellow round button with the fat right arrow —
 *  the one meant to draw the eye first (`docs/23` D36). */
export function ContinueIcon() {
  return <ButtonArt art={UI_BUTTON_ART.next} />
}

/** Closes an overlay (`screen/DetectiveNotebook.tsx`, T23): the round
 *  button with the fat X. */
export function CloseIcon() {
  return <ButtonArt art={UI_BUTTON_ART.close} />
}

/** The notebook's own title mark (`screen/DetectiveNotebook.tsx` T23
 *  follow-up, orchestrator screenshot review: "a title drawn as the
 *  Pulpito's lupa + a notebook icon — no reading needed"): a spiral-bound
 *  pad, drawn the same ink-outline way every other icon here is. No fixed
 *  `width`/`height` (unlike the old fixed-size control glyphs) — this one is sized by
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

/** [T46] The fingertip of {@link PointingHandIcon}, in its own viewBox
 *  units — where a caller lands it to make the hand point AT something. */
export const POINTING_HAND_TIP = { x: 16, y: 80 } as const
/** {@link PointingHandIcon}'s own viewBox size. */
export const POINTING_HAND_VIEWBOX = { w: 64, h: 84 } as const

/**
 * [T46] A hand pointing DOWN — a cuff, a fist with three curled fingers and
 * the index finger straight down — in the same marker style as every other
 * glyph here (paper fill, thick ink outline, plain rounded rects). The
 * deduction screen draws it in its "Tocá quién fue" pill (`picture`: there
 * it is the picture those words stand beside, `captionAudit.ts`'s
 * `data-cv-picture` opt-in) and, bigger, over the first open card as the
 * idle nudge.
 */
export function PointingHandIcon({ height, picture = false }: { height: number; picture?: boolean }) {
  const { w, h } = POINTING_HAND_VIEWBOX
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      width={(height * w) / h}
      height={height}
      aria-hidden="true"
      focusable="false"
      {...(picture ? { 'data-cv-picture': 'true' } : {})}
    >
      <g fill={SHEET_PAPER} stroke={ICON_INK} strokeWidth="4" strokeLinejoin="round">
        <rect x="14" y="2" width="38" height="12" rx="4" />
        <rect x="8" y="10" width="48" height="38" rx="15" />
        <rect x="44" y="26" width="13" height="22" rx="6.5" />
        <rect x="33" y="30" width="13" height="22" rx="6.5" />
        <rect x="22" y="32" width="13" height="20" rx="6.5" />
        <rect x="8" y="34" width="16" height="46" rx="8" />
      </g>
    </svg>
  )
}
