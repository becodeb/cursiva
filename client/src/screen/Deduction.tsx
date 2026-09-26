// Deduction screen (`detective-mode` design unit 7, spec: detective-mode
// "Deduction Screen", level-engine "Deduction View Reachable from
// nextView"). Reached once every trail's clue is filed; reuses the SAME
// `.cv-play`/`.cv-head` shell shape `LevelPlay.tsx` renders.
//
// `LevelPlay.tsx` is out of this slice's edit scope (do-not-touch list), so
// its `LAYOUT_CSS` is imported here for the shell.
//
// [T21 follow-up, orchestrator screenshot review 2026-09-26] This screen no
// longer follows the pre-docs/19 "no card, no border, no border-radius, no
// shadow" rule (design.md "Layout") — see `DEDUCTION_CSS`'s own header for
// the full reasoning. It also no longer mounts `PistasRail` (the "PISTAS"
// word plus a lightbulb mean nothing to a non-reader, `docs/18` D19) —
// collected clues show as marker-style chips instead (`ClueChip`, below).
//
// [D6 amended by `case-registry-and-captions`] Each animal's name is still
// VISIBLE, drawn beneath its picture by `CaptionedArt`
// (`detective/captionAudit.ts`'s licensed `cv-captioned` container) — never
// a bare word, always beside the image that gives it meaning. The back
// control stays icon-only, because an icon is still not a caption.
// No `url(#...)` reference, no `<mask>`/`<filter>`/`<clipPath>`/gradient
// referenced by id (`TraceCanvas.tsx:70-84`).
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
  type ClueKind,
} from '../detective/assets'
import { clueKindsOf, type DetectiveCase } from '../detective/cases'
import CaptionedArt from '../detective/CaptionedArt'
import { BackIcon } from '../detective/icons'
import { LAYOUT_CSS } from './LevelPlay'
import { SHEET_PAPER } from '../canvas/TraceCanvas'
import { backdropFor } from '../zoo/backdrops'
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
  octopusBoxAtCorner,
  OCTOPUS_CORNER_INSET,
  OCTOPUS_CORNER_SIZE_PCT,
  STAGE_MARGIN_PCT,
  STAGE_MAX_PX,
  STAGE_MAX_VH_FRAC,
  stanceBubbleSide,
} from './pulpitoStance'
import { bubbleContentCssVars } from './bubbleCssVars'

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

/**
 * One collected clue, shown as a marker-style CHIP (`odd/tasks/prewriting-
 * stage-completion.md` T21 follow-up: "no PISTAS word, no lightbulb" —
 * `docs/18` D19 already established that a word and a lightbulb mean
 * nothing to a non-reader). A paper-fill, thick-outline circle in the same
 * visual language `voice/SpeakButton.tsx`/`voice/VoiceToggle.tsx`/
 * `screen/ZooMap.tsx`'s HUD pills already use (`docs/09` §1: no shading, no
 * gradient, no shadow) — never `PistasRail`'s own labelled rail, which this
 * screen no longer mounts. Every kind `clueKindsOf(kase)` names is already
 * EARNED by the time this screen shows (the case's own pistas levels are
 * done), so there is no drained state to represent here. */
function ClueChip({ kind }: { kind: ClueKind }) {
  return (
    <span className="cv-deduction-chip">
      <svg viewBox="-18 -18 36 36" width={32} height={32} aria-hidden="true" focusable="false">
        <Art art={CLUE_ART[kind].art.earned} size={32} />
      </svg>
    </span>
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
export const DEDUCTION_OPENING_LINE = '¿Quién dejó todo esto?'

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

/** One animal in the lineup. A dismissed distractor drains (opacity) and
 * drops (a plain transform, never a filter/mask — `TraceCanvas.tsx:70-84`)
 * rather than disappearing outright, so the case file keeps showing every
 * deduction made so far. The discriminating clue is emphasised in
 * Pulpito's OWN bubble instead of a second icon here (T21 follow-up,
 * orchestrator screenshot review 2026-09-26: a small clue mark floating
 * under the caption, disconnected from any sentence, read as a stray
 * fragment — `deductionHint` already shows the SAME clue art beside the
 * SAME reason, in one place a child's eye is already drawn to). */
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
    </div>
  )
}

/**
 * Only the rules this screen adds. The full-viewport shell (`.cv-play`,
 * `.cv-head`) is imported from `LevelPlay`'s `LAYOUT_CSS` rather than
 * copied.
 *
 * [T21 follow-up, orchestrator screenshot review 2026-09-26] The FIRST
 * shipped version of this screen ("no card, no border, no border-radius, no
 * shadow" — the pre-docs/19 design.md "Layout" rule, deliberately dropped
 * here) read as a leftover from the old app: a flat cream background, a
 * bare grey back button, a rail labelled PISTAS with a lightbulb (`docs/18`
 * D19 already established that word and that icon mean nothing to a
 * non-reader), and Pulpito reduced to a small icon beside a plain text line.
 * This rebuild matches T7's full-screen marker chrome and T18's Pulpito-
 * over-the-scene treatment instead: a real backdrop, marker-style cards and
 * chips (paper fill, thick dark outline, no shadow — `docs/09` §1, the same
 * identity `voice/SpeakButton.tsx`/`voice/VoiceToggle.tsx`/
 * `screen/ZooMap.tsx`'s HUD pills already carry), and Pulpito standing in a
 * corner with his own speech bubble — the SAME `screen/pulpitoStance.ts`/
 * `screen/bubbleFit.ts`/`screen/bubblePlacement.ts` engine
 * `AdventureIntro.tsx`/`AdventureClosing.tsx` already use — the SAME stage
 * SIZE too (`STAGE_MAX_PX`/`STAGE_MAX_VH_FRAC`/`OCTOPUS_CORNER_SIZE_PCT`,
 * never shrunk: a first pass tuned the frame smaller to "make room", which
 * only produced a bubble too small for its own real lines — the fix is the
 * LAYOUT, not a smaller bubble.
 */
export const DEDUCTION_CSS = `
.cv-deduction-backdrop { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; display: block; }
${BUBBLE_POP_CSS}
/* [T21 follow-up, orchestrator screenshot review] The card row is anchored
 * to the TOP, small, never vertically centred: Pulpito's own corner stage
 * (below) is the SAME size AdventureIntro.tsx uses and needs the lower
 * majority of the sheet for his bubble — the two bands share the sheet by
 * occupying DIFFERENT halves of it, never by shrinking either one. */
.cv-deduction-content { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: flex-start; gap: 14px; padding: 64px 24px 0; }
/* [T21 follow-up round 2, orchestrator screenshot review] The T18 bubble,
 * at its own real (un-shrunk) size, reaches almost the FULL height of
 * Pulpito's own corner frame — exactly like AdventureIntro.tsx/
 * AdventureClosing.tsx, which have nothing else sharing the screen with it.
 * A vertical split (cards above, bubble below) cannot clear that on its
 * own, so the cards are pushed clear of the FRAME'S OWN WIDTH instead — the
 * same min(100%, STAGE_MAX_PX, STAGE_MAX_VH_FRAC*100dvh) expression the
 * frame itself uses, so the two can never drift apart. Only the CARD row
 * moves; the chip row above stays centred (it renders well above where the
 * bubble starts, confirmed by a screenshot). */
.cv-deduction-cards { align-self: stretch; display: flex; justify-content: flex-end; padding-left: min(100%, ${STAGE_MAX_PX}px, ${STAGE_MAX_VH_FRAC * 100}dvh); }
@keyframes cv-chips-down { 0% { opacity: 0; transform: translateY(-28px); } 100% { opacity: 1; transform: translateY(0); } }
/* The clues "come down" into view on entry (docs/19 §2.1) — a one-shot pop
 * on mount, not a replayable transition (this screen mounts once per visit,
 * the same convention BubblePop.ts's own pop-in already follows). */
.cv-deduction-chips { display: flex; flex-direction: row; flex-wrap: wrap; align-items: center; justify-content: center; gap: 12px; animation: cv-chips-down 0.5s ease; }
.cv-deduction-chip { display: flex; align-items: center; justify-content: center; width: 52px; height: 52px; border-radius: 16px; background: ${SHEET_PAPER}; border: 3px solid #1a1a1a; }
.cv-lineup-figures { display: flex; flex-direction: row; align-items: flex-end; justify-content: center; gap: 20px; flex-wrap: wrap; }
.cv-lineup-slot { display: flex; flex-direction: column; align-items: center; }
/* Marker-style CARD (docs/09 §1): paper fill, thick dark outline, no
 * shadow — the silhouette still carries the meaning, the card is only the
 * BIG touch target around it (the shipped 64px tap floor, LevelPlay.tsx's
 * own .cv-btn/.cv-btn-back share the same floor). */
.animal-btn {
  min-height: 64px;
  min-width: 64px;
  padding: 16px 14px 10px;
  border: 3px solid #1a1a1a;
  border-radius: 24px;
  background: ${SHEET_PAPER};
  cursor: pointer;
  transition: opacity 0.3s ease, transform 0.3s ease;
}
.animal-btn[disabled] { cursor: default; }
/* The word sits UNDER the picture (D6 amendment), never beside it — the
 * cv-captioned span itself declares no layout (CaptionedArt.tsx is a bare
 * span, reused by every future caller), so each screen that mounts it owns
 * the stacking. No font-family here: .cv-caption inherits Nunito from the
 * document root. */
.cv-captioned { display: inline-flex; flex-direction: column; align-items: center; }
/* [orchestrator ruling, 2026-09-12] The directive's own vocabulary is
 * UPPERCASE throughout. The DOM text above (ANIMAL_LABEL) stays normal
 * Spanish case ("Pato") on purpose: an accessible name is computed from an
 * element's TEXT CONTENT, and several screen readers spell a genuinely
 * all-caps short word letter by letter instead of speaking it. text-
 * transform: uppercase gets the same visible glyphs with none of that. */
.cv-caption { font-size: max(16px, calc(var(--cv-animal) * 0.12)); font-weight: 700; color: #1e293b; text-transform: uppercase; letter-spacing: 0.02em; }
/* Sized the way this app already sizes its chrome: viewport-HEIGHT
 * breakpoints, ONE custom property carrying the picture/word/gap sizes
 * together so a caption can never outgrow its own picture. The width term's
 * subtracted px now accounts for Pulpito's OWN frame width too
 * (.cv-deduction-cards' own padding-left), not only the sheet's side
 * padding and the figures' gaps — the cards live in whatever is left AFTER
 * the frame, never the full viewport width. */
.cv-lineup-figures { --cv-animal: min(140px, calc((100vw - 700px) / 3.9)); }
.cv-lineup-figures-3 { --cv-animal: min(140px, calc((100vw - 660px) / 3.05)); }
.cv-captioned > svg { width: auto; height: var(--cv-animal); }
.cv-captioned { gap: calc(var(--cv-animal) * 0.03); }
.cv-lineup-slot { gap: calc(var(--cv-animal) * 0.03); }
@media (max-height: 820px) {
  .cv-lineup-figures { --cv-animal: min(120px, calc((100vw - 700px) / 3.9)); gap: 14px; }
  .cv-lineup-figures-3 { --cv-animal: min(120px, calc((100vw - 660px) / 3.05)); }
}
@media (max-height: 520px) {
  /* Pulpito's own frame shrinks with viewport HEIGHT too (STAGE_MAX_VH_FRAC),
   * so a short landscape phone leaves much MORE width free on the right —
   * the subtracted px drops to match, or the cards would shrink far more
   * than the frame actually requires at this tier. */
  .cv-deduction-content { padding: 48px 16px 0; gap: 8px; }
  .cv-lineup-figures { --cv-animal: min(90px, calc((100vw - 400px) / 3.9)); gap: 8px; }
  .cv-lineup-figures-3 { --cv-animal: min(96px, calc((100vw - 370px) / 3.05)); }
  .animal-btn { padding: 10px 8px 6px; border-radius: 18px; }
  .cv-deduction-chip { width: 40px; height: 40px; border-radius: 12px; }
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
  .cv-reveal-pop, .cv-lineup-slot-shake, .cv-deduction-chips { animation: none; }
}
/* Pulpito's own corner stage — the EXACT same size AdventureIntro.tsx's own
 * .cv-intro-frame uses (STAGE_MAX_PX/STAGE_MAX_VH_FRAC), never shrunk;
 * octopusBoxAtCorner/placeAndFitBubble (screen/pulpitoStance.ts,
 * screen/bubbleFit.ts) are the SAME functions AdventureIntro.tsx calls, not
 * a reimplementation. The card row above (.cv-deduction-content) stays out
 * of its way by being anchored to the TOP and shrunk instead — see that
 * rule's own header. */
.cv-deduction-frame { position: absolute; left: 0; bottom: ${STAGE_MARGIN_PCT}%; width: min(100%, ${STAGE_MAX_PX}px, ${STAGE_MAX_VH_FRAC * 100}dvh); aspect-ratio: 1 / 1; container-type: inline-size; pointer-events: none; }
.cv-deduction-octopus { position: absolute; bottom: 2%; width: ${OCTOPUS_CORNER_SIZE_PCT}%; height: auto; }
.cv-deduction-octopus img { display: block; width: 100%; height: auto; }
.cv-deduction-bubble { position: absolute; container-type: inline-size; }
.cv-deduction-bubble .cv-bubble-pop > img { display: block; width: 100%; height: auto; }
.cv-deduction-bubble--mirror-x .cv-bubble-pop > img { transform: scaleX(-1); }
.cv-deduction-bubble .cv-captioned { position: absolute; left: var(--cv-content-left); top: var(--cv-content-top); width: var(--cv-content-width); }
.cv-deduction-bubble .cv-captioned > svg { float: left; width: var(--cv-image-w); height: var(--cv-image-h); margin-right: var(--cv-gap); margin-bottom: 1cqw; }
.cv-deduction-bubble .cv-captioned--stack > svg { float: none; display: block; margin: 0 auto var(--cv-gap) auto; }
/* Overrides THIS file's own .cv-caption (uppercase, sized off --cv-animal)
 * inside the bubble — a spoken sentence is not the animal-name vocabulary
 * that rule exists for; higher selector specificity (two classes) wins
 * regardless of source order. */
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
  // [T21 follow-up, docs/19 §4.1 "siempre sobre la escena del nivel"] The
  // scene the child just walked, never a flat colour — the SAME backdrop
  // registry AdventureIntro.tsx/AdventureClosing.tsx already read, keyed off
  // the case's own first pistas trail (every trail of one case shares one
  // adventure, and therefore one backdrop).
  const backdrop = backdropFor(kase.trailIds[0])
  // [T21] Pulpito's own line for the current state (`deductionHint`, above):
  // the opening question, a wrong pick's own gentle reason, or the
  // culprit's name once solved.
  const hint = deductionHint(kase, state)
  const octopusBox = octopusBoxAtCorner(ZOO_CARETAKER_ART, {
    corner: 'left',
    sizeBy: 'width',
    size: OCTOPUS_CORNER_SIZE_PCT,
    bottom: 2,
    inset: OCTOPUS_CORNER_INSET,
  })
  const { placement, content } = placeAndFitBubble({
    frame: { w: 100, h: 100 },
    headBox: octopusBox,
    tail: ZOO_SPEECH_BUBBLE_TAIL,
    side: stanceBubbleSide('left'),
    text: hint.text,
    art: hint.art,
  })
  return (
    <main className="cv-play">
      <style>{LAYOUT_CSS + DEDUCTION_CSS}</style>
      {backdrop && <img className="cv-deduction-backdrop" src={backdrop.art.href} alt="" />}
      <header className="cv-head">
        <button type="button" onClick={onExit} className="cv-btn cv-btn-back" aria-label="Volver">
          <BackIcon />
        </button>
      </header>
      <div className="cv-deduction-content">
        <div className="cv-deduction-chips">
          {clueKindsOf(kase).map((kind) => (
            <ClueChip key={kind} kind={kind} />
          ))}
        </div>
        <div className="cv-deduction-cards">
          <div className={lineupWidthClass(kase.options.length)}>
            {kase.options.map((id) => (
              <Animal key={id} id={id} kase={kase} state={state} onPick={onPick} />
            ))}
          </div>
        </div>
      </div>
      <div className="cv-deduction-frame">
        <span className="cv-deduction-octopus" style={{ left: `${octopusBox.x}%` }}>
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
          {/* Keyed on the line (T8 item 2's own convention, AdventureIntro.
              tsx): a new hint pops in fresh every time it actually changes. */}
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
