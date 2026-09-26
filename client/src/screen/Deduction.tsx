// Deduction screen (`detective-mode` design unit 7, spec: detective-mode
// "Deduction Screen", level-engine "Deduction View Reachable from
// nextView"). Reached once every trail's clue is filed; reuses the SAME
// `.cv-play` shell shape `LevelPlay.tsx` renders and the SAME `PistasRail`
// component, so the case file the child spent four trails filling never
// moves (design.md "The case file never moves").
//
// `LevelPlay.tsx` is out of this slice's edit scope (do-not-touch list), so
// its `LAYOUT_CSS` is imported here for the shell. The rules this screen adds
// needs (the flex column shell, the sheet row that holds the lineup and the
// rail, and the rail's own chrome) are duplicated below under the SAME class
// names on purpose — the two screens are never mounted at once (`GameScreen`
// renders exactly one view), so the duplication carries no runtime risk, and
// reusing the names keeps the two screens reading as one shell rather than
// two unrelated layouts.
//
// [D6 amended by `case-registry-and-captions`] Each animal's name is now
// VISIBLE, drawn beneath its picture by `CaptionedArt`
// (`detective/captionAudit.ts`'s licensed `cv-captioned` container) — never
// a bare word, always beside the image that gives it meaning. Only the
// rail's own `PISTAS` label and the animal captions carry text; the back
// control stays icon-only, because an icon is still not a caption.
// No `url(#...)` reference, no `<mask>`/`<filter>`/`<clipPath>`/gradient
// referenced by id (`TraceCanvas.tsx:70-84`), no card, no border, no
// `border-radius`, no shadow (design.md "Layout": "no cards, no borders, no
// border-radius, no shadow").
//
// [case-registry-and-captions, Phase 5] `CULPRIT` and `ANIMAL_ART.ruledOutBy`
// are gone (spec: detective-mode "Case Registry Data Shape") — this screen
// now reads a `DetectiveCase` (`kase`) for its options, its culprit and its
// ruled-out map, so the SAME component renders the duck's three-option
// lineup and the hen's four-option one without a special case anywhere in
// this file.
import { useState, type CSSProperties } from 'react'
import {
  ANIMAL_ART,
  ANIMAL_SILHOUETTE_ART,
  CARRIER_LENS_ART,
  CLUE_ART,
  ZOO_CARETAKER_ART,
  ZOO_SPEECH_BUBBLE_ART,
  type AnimalId,
  type ArtImage,
} from '../detective/assets'
import { clueKindsOf, type DetectiveCase } from '../detective/cases'
import CaptionedArt from '../detective/CaptionedArt'
import PistasRail, { type PistasSlot } from '../detective/PistasRail'
import { BackIcon } from '../detective/icons'
import { LAYOUT_CSS } from './LevelPlay'
import { BUBBLE_POP_CSS } from './BubblePop'
import { ZOO_SPEECH_BUBBLE_TAIL } from './bubblePlacement'
import {
  CONTENT_LEFT_FRAC,
  CONTENT_TOP_FRAC,
  CONTENT_WIDTH_FRAC,
  GAP_FRAC,
  LINE_HEIGHT,
  placeAndFitBubble,
} from './bubbleFit'
import {
  DEFAULT_PULPITO_STANCE,
  OCTOPUS_CORNER_INSET,
  OCTOPUS_CORNER_SIZE_PCT,
  octopusBoxAtCorner,
  stanceBubbleSide,
} from './pulpitoStance'
import { bubbleContentCssVars } from './bubbleCssVars'

/** Matches the shipped ink `TraceCanvas.tsx:89` (`INK_COLOR '#1e293b'`, not
 * exported) — the same hand that draws the trail's own trace, the `PISTAS`
 * word and the icon controls. Re-declared here rather than imported, same
 * convention `palette.ts`/`PistasRail.tsx`/`icons.tsx` already use. */
const INK = '#1e293b'

/**
 * INTRINSIC height of an animal choice, in CSS px: the `width`/`height`
 * attributes `CaptionedArt` puts on its `<svg>`, and therefore the aspect
 * ratio the browser scales by. The RENDERED height is `.cv-captioned > svg`
 * below, which grows and shrinks with the viewport — this number is what it
 * falls back to if that rule never applies, and the ratio it grows along.
 *
 * The animal IS the answer on this screen — with the case registry capping
 * the lineup at three or four options (never more), the picture is the single
 * thing the child is asked to choose between, not decoration beside something
 * else.
 *
 * [orchestrator ruling, 2026-09-12] `docs/09_GUIA_DE_ESTILO_VISUAL.md` §3
 * sizes animals at ~140 units on a trail; this screen has strictly MORE room
 * per animal than a trail does (three or four choices, laid out once, no
 * canvas competing for space), so 36 — the size that shipped in this
 * change's own Phase 4, a regression from the 64px the pre-existing `Art`
 * helper used on `main` — is too small for a five-year-old to tell the
 * animals apart and tap one with confidence. Sized up past the docs'
 * trail-scale baseline rather than merely restored to it.
 */
const ANIMAL_SIZE = 180

/**
 * The lineup's own width class, e.g. `cv-lineup-figures-3`.
 *
 * A three-animal lineup may be drawn MUCH bigger than a four-animal one
 * before the row runs out of sheet, and CSS cannot count children without
 * `:has()` — a selector this repo has no reason to bet a classroom tablet on
 * (`docs/09` §3's `url(#…)` scar is what betting on a feature looks like
 * here). React already knows the count, so it says so in the markup, and the
 * node harness can read it back off the rendered string.
 *
 * The UNSUFFIXED `.cv-lineup-figures` rule carries the four-up cap, so an
 * option count nobody has written a rule for is laid out too small rather
 * than overflowing the sheet.
 */
export function lineupWidthClass(optionCount: number): string {
  return `cv-lineup-figures cv-lineup-figures-${optionCount}`
}

/** One registry raster, centred on the origin of an origin-centred viewBox.
 *
 * Both callers below draw into a box centred on 0,0, so the art has to be
 * placed by its own negative offset rather than by a transform. `size` is the
 * HEIGHT; width follows from the source file's aspect ratio, which is what
 * keeps a 448x405 cow and a 370x448 hen from being stretched to a shared
 * square. An `<image>` is the only way raster art gets onto this screen
 * without a `url(#)` reference (module comment above; `assets.ts` header). */
function Art({ art, size }: { art: ArtImage; size: number }) {
  const width = (size * art.w) / art.h
  return (
    <image
      href={art.href}
      x={-width / 2}
      y={-size / 2}
      width={width}
      height={size}
      preserveAspectRatio="xMidYMid meet"
    />
  )
}

/** Accessible names AND now the visible caption text (D6 amendment). Kept in
 * normal Spanish case ("Pato", not "PATO") on purpose — see `.cv-caption`'s
 * `text-transform: uppercase` below for why the directive's ALL-CAPS
 * vocabulary (`PECES`/`TORTUGAS`/`PATO`) is applied as a paint rule instead
 * of stored as a literal uppercase string. */
const ANIMAL_LABEL: Readonly<Record<AnimalId, string>> = {
  gallina: 'Gallina',
  pato: 'Pato',
  vaca: 'Vaca',
  gato: 'Gato',
}

/**
 * Pulpito's opening question, before any pick (`odd/tasks/prewriting-stage-
 * completion.md` T21, `docs/19` §1: "el Pulpito pregunta: ¿Quién dejó todo
 * esto?"). Shown with {@link CARRIER_LENS_ART} — the same magnifying glass a
 * detective trail's own carrier holds — since there is no clue yet to
 * illustrate the question with.
 */
export const DEDUCTION_OPENING_LINE = '¿Quién habrá dejado todas estas pistas?'

/** Pulpito's short line once the case is closed, one per possible culprit —
 * every case in the registry names a real `AnimalId`, so this stays total. */
export const DEDUCTION_SOLVED_LINE: Readonly<Record<AnimalId, string>> = {
  pato: '¡Era el pato!',
  gallina: '¡Era la gallina!',
  vaca: '¡Era la vaca!',
  gato: '¡Era el gato!',
}

export interface DeductionHint {
  readonly text: string
  readonly art: ArtImage
}

/**
 * Pulpito's own spoken line for the CURRENT state (`docs/19` §5.4: "la
 * silueta da un pasito atrás y el Pulpito dice por qué, con la pista que la
 * descarta" — "El gato no tiene plumas"). Exported and pure, the same reason
 * `pickAnimal`/`solvesCase` are: this screen's node harness cannot observe a
 * live re-render, so every state this can be handed is asserted by calling
 * it directly rather than by simulating a click.
 *
 * Priority, closed beats dismissed beats opening: once the case is closed
 * there is nothing left to hint at, and a stale dismissal from before the
 * close must never resurface over the "¡era X!" line.
 */
export function deductionHint(kase: DetectiveCase, state: DeductionState): DeductionHint {
  if (state.closed) {
    return { text: DEDUCTION_SOLVED_LINE[kase.culprit], art: ANIMAL_ART[kase.culprit] }
  }
  const last = state.dismissed[state.dismissed.length - 1]
  if (last !== undefined) {
    const kind = kase.ruledOutBy[last]
    const text = kase.hint[last]
    if (kind && text) return { text, art: CLUE_ART[kind].art.earned }
  }
  return { text: DEDUCTION_OPENING_LINE, art: CARRIER_LENS_ART }
}

/**
 * The screen's own state: which distractors have been ruled out so far, and
 * whether the case is closed. Deliberately carries NO score/penalty field of
 * any kind — D4 ("A wrong pick costs nothing") is a structural property of
 * this type, not just of the function below: there is nothing here TO
 * penalise.
 */
export interface DeductionState {
  /** Distractors the child has already picked, in pick order. Permanent —
   * ruling an animal out is a deduction, not a mistake to take back. */
  dismissed: readonly AnimalId[]
  /** The culprit has been picked (spec scenario "Correct pick closes the case"). */
  closed: boolean
}

/**
 * `solved` lets a returning child land on the ALREADY-CLOSED lineup instead
 * of being asked to solve a case again (design.md §5). Defaults to an open,
 * empty case for a first visit.
 */
export function initialDeductionState(solved = false): DeductionState {
  return { dismissed: [], closed: solved }
}

/**
 * D4 in full: picking the culprit closes the case. Picking any other animal
 * costs nothing — no score, no lockout, no scolding — and dismisses that
 * animal so the case file reads as a real deduction narrowing down. Picking
 * an already-dismissed animal again, or picking anything once the case is
 * already closed, is an inert no-op (returns the SAME reference), which is
 * what makes "the child MUST be able to pick again immediately" trivially
 * true: there is no intermediate blocked state to wait out.
 *
 * `culprit` is now a parameter (design.md §5) rather than the deleted global
 * `CULPRIT` — the same pick handler serves every case in the registry.
 */
export function pickAnimal(
  state: DeductionState,
  animal: AnimalId,
  culprit: AnimalId,
): DeductionState {
  if (state.closed) return state
  if (animal === culprit) return { ...state, closed: true }
  if (state.dismissed.includes(animal)) return state
  return { ...state, dismissed: [...state.dismissed, animal] }
}

/**
 * Does this pick transition an open case to closed? The exported form of the
 * `animal === culprit` branch inside `pickAnimal` (design.md §5), so the
 * write that follows it — persisting `caseSolvedId(kase.id)` — is observable
 * by a node test: the harness cannot see inside a `setState` updater, so the
 * decision that gates `onSolved()` has to live out here.
 */
export function solvesCase(state: DeductionState, animal: AnimalId, culprit: AnimalId): boolean {
  return !state.closed && animal === culprit
}

/** The lineup stands on one drawn ink line (design.md "Layout") — never a
 * card edge, a `<hr>`, or a CSS border, which is why it is drawn the same
 * way `PistasRail`'s word and `icons.tsx`'s controls are: an `M`/`L` stroked
 * path, no fill. */
function GroundLine() {
  return (
    <svg
      className="cv-lineup-ground"
      viewBox="0 0 400 8"
      width="100%"
      height={8}
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M4,4 L396,4" fill="none" stroke={INK} strokeWidth={4} strokeLinecap="round" />
    </svg>
  )
}

/** One animal in the lineup. A dismissed distractor drains (opacity) and
 * drops (a plain transform, never a filter/mask — `TraceCanvas.tsx:70-84`)
 * rather than disappearing outright, so the case file keeps showing every
 * deduction made so far. The discriminating clue MAY be emphasised next to a
 * dismissed animal (D4); shown here in the trail's own earned colour, the
 * only place in the mode colour is allowed to mean something
 * (design.md principle 1/2).
 *
 * `ruledOutBy` comes from `kase.ruledOutBy[id]` now (design.md §1) — a fact
 * about THIS case, never about the animal globally. */
function Animal({
  id,
  kase,
  state,
  onPick,
}: {
  id: AnimalId
  kase: DetectiveCase
  state: DeductionState
  onPick: (animal: AnimalId) => void
}) {
  const dismissed = state.dismissed.includes(id)
  const ruledOutBy = kase.ruledOutBy[id]
  // [T21] `docs/19` §7 slice 3: every option stands as a SILHOUETTE
  // (`ANIMAL_SILHOUETTE_ART`, a real derived PNG — `assets.ts`'s own header
  // — never a runtime CSS/SVG filter) until the culprit is actually picked;
  // only then does IT ALONE swap to its full-colour picture ("the silhouette
  // fills with colour and the duck peeks out"). A dismissed distractor never
  // reveals — it was RULED OUT, not identified.
  const revealed = state.closed && id === kase.culprit
  const art = revealed ? ANIMAL_ART[id] : ANIMAL_SILHOUETTE_ART[id]
  // A wrong pick is gentle (`docs/01` principle 2: no red, no failure
  // sound): the ONLY animation is this one soft shake, on the animal just
  // picked — never a permanent state, so it plays exactly once per wrong
  // pick and never replays for an OLDER dismissal sitting further back in
  // the list.
  const isLastDismissed = !state.closed && state.dismissed[state.dismissed.length - 1] === id
  const style: CSSProperties = dismissed ? { opacity: 0.25, transform: 'translateY(24px)' } : {}
  return (
    <div className={`cv-lineup-slot${isLastDismissed ? ' cv-lineup-slot-shake' : ''}`}>
      <button
        type="button"
        className="animal-btn"
        style={style}
        disabled={state.closed}
        onClick={() => onPick(id)}
      >
        <CaptionedArt
          art={art}
          label={ANIMAL_LABEL[id]}
          size={ANIMAL_SIZE}
          className={revealed ? 'cv-reveal-pop' : undefined}
        />
      </button>
      {dismissed && ruledOutBy && (
        <svg
          className="cv-clue-hint"
          viewBox="-16 -16 32 32"
          width={20}
          height={20}
          aria-hidden="true"
          focusable="false"
        >
          <Art art={CLUE_ART[ruledOutBy].art.earned} size={26} />
        </svg>
      )}
    </div>
  )
}

/** Only the rules this screen ADDS. The full-viewport shell (`.cv-play`,
 * `.cv-head`, `.cv-btn-back`, `.cv-sheet`) is imported from `LevelPlay`'s
 * `LAYOUT_CSS` rather than copied: two copies of the same shell under the same
 * class names drift, and the case file is supposed to look like the trail the
 * child just left. No `border-radius`, no `box-shadow`, no `border`
 * (design.md "Layout"), and no font declaration anywhere. */
export const DEDUCTION_CSS = `
${BUBBLE_POP_CSS}
.cv-lineup { flex: 1 1 auto; min-width: 0; min-height: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.cv-lineup-figures { display: flex; flex-direction: row; align-items: flex-end; justify-content: center; gap: 28px; flex-wrap: wrap; }
.cv-lineup-slot { display: flex; flex-direction: column; align-items: center; }
/* The shipped 64px tap floor (LevelPlay.tsx:140), reused by name and by
 * value — every animal choice is a real button, never smaller than a
 * child's tap target. The button grows past this floor once the much
 * bigger ANIMAL_SIZE picture is inside it; the floor is a MINIMUM. */
.animal-btn {
  min-height: 64px;
  min-width: 64px;
  padding: 8px;
  border: none;
  background: transparent;
  cursor: pointer;
  transition: opacity 0.3s ease, transform 0.3s ease;
}
.animal-btn[disabled] { cursor: default; }
/* The word sits UNDER the picture (D6 amendment), never beside it — the
 * cv-captioned span itself declares no layout (CaptionedArt.tsx is a bare
 * span, reused by every future caller), so each screen that mounts it owns
 * the stacking. No font-family here: .cv-caption inherits Nunito from the
 * document root, same as .pistas-word (LevelPlay.tsx's LAYOUT_CSS). */
.cv-captioned { display: inline-flex; flex-direction: column; align-items: center; }
/* [orchestrator ruling, 2026-09-12] The directive's own vocabulary is
 * UPPERCASE throughout — the enclosure signs read PECES/TORTUGAS/PATOS and
 * the directive's own deduction example is "PATO". The DOM text above
 * (ANIMAL_LABEL) stays normal Spanish case ("Pato") on purpose: an
 * accessible name is computed from an element's TEXT CONTENT, and several
 * screen readers treat a genuinely all-caps short word as an acronym and
 * spell it letter by letter ("P... A... T... O...") instead of speaking it —
 * a real cost for a five-year-old's audio feedback. text-transform:
 * uppercase gets the same visible glyphs with none of that: only the paint
 * changes, the underlying word — and its pronunciation — stays "Pato". */
.cv-caption { font-size: max(16px, calc(var(--cv-animal) * 0.12)); font-weight: 700; color: #1e293b; text-transform: uppercase; letter-spacing: 0.02em; }
/* [defect fix, orchestrator ruling 2026-09-12] THE LINEUP GROWS INTO THE
 * SHEET. It used to be three 180px animals in a band across the middle of a
 * 1280x900 page, about a fifth of the screen, with ~350px of empty paper above
 * and ~300px below — and the animals are the single thing the child is asked
 * to choose between.
 *
 * Sized the way this app already sizes its chrome: viewport-HEIGHT breakpoints
 * ('LevelPlay.tsx''s LAYOUT_CSS drives '.pistas-word' and the rail marks
 * through exactly the 820 and 520 boundaries reused below). ONE custom
 * property carries the answer, and the picture, the word and the gaps are all
 * derived from it — a caption sized on its own drifts out of proportion with
 * the animal it belongs to, and on a narrow sheet the WORD becomes the widest
 * thing in the slot and wraps the row that the picture still fits in.
 *
 * The px term is the vertical budget. The 'min()' against a width term is the
 * second half of the same question, because a lineup is a ROW: three animals
 * at 320px tall are ~960px wide, so on any sheet narrower than that the width
 * runs out first and the row would wrap into a 2+1 stack that reads as two
 * lineups.
 *
 * That width term, worked: the row gets '100vw' less the page padding, the
 * ~132px PISTAS rail and the gaps/tap-padding between the figures — the
 * subtracted px. The divisor is the sum of the animals' aspect ratios (vaca
 * 448/405 = 1.11, gato 1.08, gallina 0.83, pato 0.82), which is what turns an
 * available WIDTH back into a shared HEIGHT they can all stand at. Four
 * options need a much smaller cap than three, which is what
 * 'lineupWidthClass' exists to say. */
.cv-lineup-figures { --cv-animal: min(420px, calc((100vw - 340px) / 3.9)); }
.cv-lineup-figures-3 { --cv-animal: min(420px, calc((100vw - 270px) / 3.05)); }
.cv-captioned > svg { width: auto; height: var(--cv-animal); }
.cv-captioned { gap: calc(var(--cv-animal) * 0.03); }
.cv-lineup-slot { gap: calc(var(--cv-animal) * 0.03); }
@media (max-height: 820px) {
  .cv-lineup-figures { --cv-animal: min(300px, calc((100vw - 340px) / 3.9)); gap: 22px; }
  .cv-lineup-figures-3 { --cv-animal: min(300px, calc((100vw - 270px) / 3.05)); }
}
/* Short viewport. The rail stops standing BESIDE the lineup and becomes a row
 * UNDER it (the max-height: 520 block further down), so the row gets the whole
 * width back and the px term is what binds from here on. */
@media (max-height: 520px) {
  .cv-lineup-figures { --cv-animal: min(220px, calc((100vw - 300px) / 3.9)); gap: 14px; }
  .cv-lineup-figures-3 { --cv-animal: min(240px, calc((100vw - 260px) / 3.05)); }
  .animal-btn { padding: 4px; }
}
/* A landscape PHONE, where the whole page is shorter than one tall-viewport
 * animal. Nothing restructures here — the row just stops asking for height it
 * would have to steal from the rail below it. */
@media (max-height: 420px) {
  .cv-lineup-figures { --cv-animal: min(150px, calc((100vw - 300px) / 3.9)); }
  .cv-lineup-figures-3 { --cv-animal: min(150px, calc((100vw - 260px) / 3.05)); }
}
/* The ground runs the width of the lineup standing on it. The old 640px cap
 * was narrower than the figures once they grew, which drew a rug under them
 * instead of a floor. */
.cv-lineup-ground { flex: 0 0 auto; align-self: stretch; width: 100%; margin-top: 8px; }
/* [defect fix, orchestrator ruling 2026-09-12] PistasRail.tsx renders
 * className="pistas-bar" (PistasRail.tsx:157) — this block used to say
 * .pistas-rail, a class that has never existed on this screen's markup, so
 * every one of these overrides was dead: the rail fell through to
 * LAYOUT_CSS's .pistas-bar rule instead, the full LevelPlay-sized
 * horizontal top-bar treatment (96px PISTAS text, a wide flex row) meant
 * for a screen with a canvas beside it. On THIS screen the rail is a
 * secondary readout beside the lineup, so it is corrected to the real class
 * name and re-scoped as a narrow vertical column: present, but not
 * dominating the page the way the unconstrained bar did. */
.pistas-bar {
  flex: 0 0 132px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 6px 4px;
  border-bottom: none;
}
.pistas-lamp-row { flex: 0 0 auto; }
.pistas-word { font-size: 18px; }
.pistas-slots { display: flex; flex-direction: column; gap: 10px; padding-top: 4px; }
@media (max-height: 520px) {
  .cv-sheet { flex-direction: column; gap: 4px; }
  .pistas-bar { flex: 0 0 auto; flex-direction: row; gap: 10px; padding: 4px; }
  .pistas-slots { flex-direction: row; padding-top: 0; gap: 6px; }
}
/* [T21] The correct pick's own reveal: the silhouette swaps to its
 * full-colour picture (the swap itself, above, in the markup) and this pop
 * draws the eye to it — never a CSS/SVG filter, a plain keyframe on the
 * SAME captioned span every other animal choice already renders. */
@keyframes cv-reveal-pop {
  0% { transform: scale(0.85); }
  60% { transform: scale(1.08); }
  100% { transform: scale(1); }
}
.cv-reveal-pop { animation: cv-reveal-pop 0.5s ease; transform-origin: 50% 50%; }
/* A wrong pick's own gentle feedback (docs/01 principle 2: no red, no
 * failure sound) — a soft one-shot shake on the slot just dismissed, never a
 * permanent state (Animal's own isLastDismissed, scoped to the LAST
 * dismissal only). Shakes the SLOT wrapper, not the button: the button
 * already carries its own permanent translateY/opacity inline style
 * (the drain-and-drop), and a CSS animation on the SAME element would
 * override that transform for the animation's own duration, producing a
 * visible jump back to y:0 mid-shake. NO BACKTICKS in this block -- one
 * inside a comment ends this template literal early (this file's own
 * DEDUCTION_CSS header). */
@keyframes cv-lineup-shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-6px); }
  75% { transform: translateX(6px); }
}
.cv-lineup-slot-shake { animation: cv-lineup-shake 0.4s ease; }
@media (prefers-reduced-motion: reduce) {
  .cv-reveal-pop, .cv-lineup-slot-shake { animation: none; }
}
/* [T21] Pulpito's own corner stance (screen/pulpitoStance.ts,
 * screen/bubbleFit.ts — the SAME engine AdventureIntro.tsx/
 * AdventureClosing.tsx already use), asking the opening question, hinting
 * at a wrong pick, or naming the culprit once solved (deductionHint
 * above). pointer-events: none on the wrapper: this overlay sits ON TOP of
 * .cv-sheet in source order, and it must never steal a tap meant for the
 * lineup or the back button underneath its own bounding box — the octopus
 * and bubble spans below are the ONLY parts a real deployment ever paints
 * pixels into. */
.cv-deduction-stance { position: absolute; inset: 0; pointer-events: none; }
.cv-deduction-octopus { position: absolute; bottom: 2%; width: ${OCTOPUS_CORNER_SIZE_PCT}%; height: auto; }
.cv-deduction-octopus img { display: block; width: 100%; height: auto; }
.cv-deduction-bubble { position: absolute; container-type: inline-size; }
.cv-deduction-bubble .cv-bubble-pop > img { display: block; width: 100%; height: auto; }
.cv-deduction-bubble--mirror-x .cv-bubble-pop > img { transform: scaleX(-1); }
.cv-deduction-bubble .cv-captioned { position: absolute; left: var(--cv-content-left); top: var(--cv-content-top); width: var(--cv-content-width); }
.cv-deduction-bubble .cv-captioned > svg { float: left; width: var(--cv-image-w); height: var(--cv-image-h); margin-right: var(--cv-gap); margin-bottom: 1cqw; }
.cv-deduction-bubble .cv-captioned--stack > svg { float: none; display: block; margin: 0 auto var(--cv-gap) auto; }
/* Overrides THIS file's own .cv-caption (uppercase, sized off --cv-animal) —
 * a spoken sentence is not the animal-name vocabulary that rule exists for,
 * and higher selector specificity (two classes) wins regardless of source
 * order. */
.cv-deduction-bubble .cv-caption { font-size: var(--cv-caption-font); line-height: ${LINE_HEIGHT}; font-weight: 700; color: #1e293b; text-align: left; text-transform: none; }
`

export interface DeductionViewProps {
  kase: DetectiveCase
  state: DeductionState
  onPick: (animal: AnimalId) => void
  onExit: () => void
}

/**
 * Pure presentational render of a given {@link DeductionState}. Split out
 * from the stateful default export for the same reason `shouldFileClue` is
 * exported separately in `LevelPlay.tsx`: this repo's node-only harness
 * cannot observe a re-render after `renderToString` (a state dispatch past
 * that point is a no-op — no live fiber tree survives), so every dismissal
 * and the closed state are asserted by rendering THIS component directly at
 * a hand-built state, never by simulating a click.
 */
export function DeductionView({ kase, state, onPick, onExit }: DeductionViewProps) {
  const filedSlots: readonly PistasSlot[] = clueKindsOf(kase).map((kind) => ({ kind, filed: true }))
  // [T21] Pulpito's own corner stance, asking the question, hinting at a
  // wrong pick, or naming the culprit — the same `octopusBoxAtCorner`/
  // `placeAndFitBubble` engine `AdventureIntro.tsx` already uses (that
  // file's own header has the full geometry explanation). Always the
  // default LEFT corner: this screen has no per-line stance override the way
  // an adventure's own intro/closing beats do (`zoo/adventures.ts`'s
  // `PulpitoStance`), since the lineup itself is centred, not off to one
  // side the way a level's own route/octopus can be.
  const hint = deductionHint(kase, state)
  const octopusBox = octopusBoxAtCorner(ZOO_CARETAKER_ART, {
    corner: DEFAULT_PULPITO_STANCE.corner,
    sizeBy: 'width',
    size: OCTOPUS_CORNER_SIZE_PCT,
    bottom: 2,
    inset: OCTOPUS_CORNER_INSET,
  })
  const { placement, content } = placeAndFitBubble({
    frame: { w: 100, h: 100 },
    headBox: octopusBox,
    tail: ZOO_SPEECH_BUBBLE_TAIL,
    side: stanceBubbleSide(DEFAULT_PULPITO_STANCE.corner),
    text: hint.text,
    art: hint.art,
  })
  return (
    <main className="cv-play">
      <style>{LAYOUT_CSS + DEDUCTION_CSS}</style>
      <header className="cv-head">
        <button type="button" onClick={onExit} className="cv-btn-back" aria-label="Volver">
          <BackIcon />
        </button>
      </header>
      <div className="cv-sheet">
        <div className="cv-lineup">
          <div className={lineupWidthClass(kase.options.length)}>
            {kase.options.map((id) => (
              <Animal key={id} id={id} kase={kase} state={state} onPick={onPick} />
            ))}
          </div>
          <GroundLine />
        </div>
        <PistasRail slots={filedSlots} lampOn />
      </div>
      <div className="cv-deduction-stance">
        <span
          className="cv-deduction-octopus"
          style={{ [DEFAULT_PULPITO_STANCE.corner]: `${octopusBox.x}%` } as CSSProperties}
        >
          <img src={ZOO_CARETAKER_ART.href} alt="" />
        </span>
        <span
          className={`cv-deduction-bubble${placement.mirrored ? ' cv-deduction-bubble--mirror-x' : ''}`}
          style={{
            left: `${placement.left}%`,
            top: `${placement.top}%`,
            width: `${placement.width}%`,
            ...bubbleContentCssVars(placement, content, {
              contentLeftFrac: CONTENT_LEFT_FRAC,
              contentTopFrac: CONTENT_TOP_FRAC,
              contentWidthFrac: CONTENT_WIDTH_FRAC,
              gapFrac: GAP_FRAC,
            }),
          }}
        >
          {/* Keyed on the line (T8 item 2's own convention, `AdventureIntro.
              tsx`): a new hint pops in fresh every time it actually changes. */}
          <span
            key={hint.text}
            className="cv-bubble-pop"
            style={{ transformOrigin: `${placement.tailOriginX}% ${placement.tailOriginY}%` }}
          >
            <img src={ZOO_SPEECH_BUBBLE_ART.href} alt="" />
            <CaptionedArt
              art={hint.art}
              label={hint.text}
              size={76}
              className={content.layout === 'stack' ? 'cv-captioned--stack' : undefined}
            />
          </span>
        </span>
      </div>
    </main>
  )
}

export interface DeductionProps {
  kase: DetectiveCase
  /** The case's `<caseId>-deduce` pseudo-record already exists (design.md
   * §5): the lineup mounts already closed instead of asking again. */
  solved: boolean
  /** Fired the moment the pick closes the case (`solvesCase`), so the caller
   * can persist `caseSolvedId(kase.id)` through the level-progress store —
   * this component never touches storage itself. */
  onSolved: () => void
  onExit: () => void
}

export default function Deduction({ kase, solved, onSolved, onExit }: DeductionProps) {
  const [state, setState] = useState<DeductionState>(() => initialDeductionState(solved))
  return (
    <DeductionView
      kase={kase}
      state={state}
      onPick={(animal) => {
        if (solvesCase(state, animal, kase.culprit)) onSolved()
        setState((s) => pickAnimal(s, animal, kase.culprit))
      }}
      onExit={onExit}
    />
  )
}
