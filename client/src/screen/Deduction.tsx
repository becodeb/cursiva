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
  CLUE_ART,
  PLACEHOLDER_ZOO_ANIMALS,
  silhouetteArtFor,
  ZOO_ANIMAL_ART,
  ZOO_CARETAKER_ART,
  ZOO_SPEECH_BUBBLE_ART,
  type ArtImage,
  type ZooAnimalId,
} from '../detective/assets'
import { clueKindsOf, type DetectiveCase } from '../detective/cases'
import CaptionedArt from '../detective/CaptionedArt'
import { BackIcon, PawPrintIcon } from '../detective/icons'
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
import { octopusBoxAtCorner, OCTOPUS_CORNER_INSET, STAGE_MARGIN_PCT, stanceBubbleSide } from './pulpitoStance'
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
 * Pulpito's own corner stage tuning for THIS screen (T21 follow-up round 3,
 * orchestrator: "Pulpito smaller on this screen — he's the narrator here,
 * not the star: about 22-26% of the viewport height"). Exported so
 * `bubbleFit.test.ts`'s own dedicated deduction sweep can build the EXACT
 * same `octopusBoxAtCorner` box this screen renders with — a second,
 * independently-guessed copy is exactly the kind of thing that quietly
 * drifts from what actually ships (this task's own review history: the
 * generic T18-sized sweep it used before this round validated a DIFFERENT
 * geometry than the one this screen actually renders).
 *
 * The frame itself is a SQUARE `DEDUCTION_STAGE_DVH` of the viewport's own
 * height (never the T18 stage's `STAGE_MAX_PX`/`STAGE_MAX_VH_FRAC`, which
 * assumes nothing else shares the screen with Pulpito) — big enough, as a
 * FRACTION of that square, to leave real room for the bubble beside a
 * `sizeBy: 'height'` octopus at `DEDUCTION_OCTOPUS_SIZE_PCT`, so
 * `DEDUCTION_OCTOPUS_SIZE_PCT% * DEDUCTION_STAGE_DVH%` of the viewport
 * height is the octopus's own real rendered height: 50% of 48dvh = 24dvh,
 * dead centre of the requested 22-26% band.
 */
export const DEDUCTION_STAGE_DVH = 48
export const DEDUCTION_OCTOPUS_SIZE_PCT = 50
/** A floor under the frame's own size, in real px — without it, a SHORT
 *  landscape phone (844×390, this app's own tightest required tier) scales
 *  `DEDUCTION_STAGE_DVH` down to a frame too small for its own font floor
 *  (measured: a 187px frame put the opening line at ~7.6px, well under the
 *  11px readability floor `bubbleFit.test.ts`'s own sweep already enforces
 *  for every other screen). Proven against exactly that viewport by this
 *  screen's own dedicated sweep in `bubbleFit.test.ts`. */
export const DEDUCTION_STAGE_MIN_PX = 280

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
 * screen no longer mounts. Every picture this row shows is already EARNED by
 * the time this screen shows (the case's own pistas levels are done), so
 * there is no drained state to represent here.
 *
 * Takes the picture directly rather than a `ClueKind` (T25,
 * `odd/tasks/prewriting-stage-completion.md`): the night case's own chips
 * (`DetectiveCase.clueArt`) are naturalistic props with no honest
 * `ClueKind`/`CLUE_ART` colour token, and the render call below already
 * resolves either source to one `ArtImage` list before this component ever
 * sees it. */
function ClueChip({ art }: { art: ArtImage }) {
  return (
    <span className="cv-deduction-chip">
      <svg viewBox="-18 -18 36 36" width={32} height={32} aria-hidden="true" focusable="false">
        <Art art={art} size={32} />
      </svg>
    </span>
  )
}

/** Accessible names AND now the visible caption text (D6 amendment). Kept in
 * normal Spanish case ("Pato", not "PATO") on purpose — see `.cv-caption`'s
 * `text-transform: uppercase` below for why the directive's ALL-CAPS
 * vocabulary (`PECES`/`TORTUGAS`/`PATO`) is applied as a paint rule instead
 * of stored as a literal uppercase string. Widened from `AnimalId` to the
 * full `ZooAnimalId` (T25, `docs/19` §3.2): the night case's lineup can show
 * erizo, oveja or llama alongside the original barnyard quartet. Populated
 * for every `ZooAnimalId` rather than left `Partial` (`TrailProgressBar.tsx`'s
 * own `ANIMAL_NAME` is Partial for a narrative SENTENCE fragment, but this is
 * a caption under a picture the child is looking straight at — never worth
 * a silent gap) — cheap and future-proofs the fish/monkey cases `docs/19`
 * §2.3 still has to build. */
const ANIMAL_LABEL: Readonly<Record<ZooAnimalId, string>> = {
  gallina: 'Gallina',
  pato: 'Pato',
  vaca: 'Vaca',
  gato: 'Gato',
  oveja: 'Oveja',
  llama: 'Llama',
  vibora: 'Víbora',
  abeja: 'Abeja',
  delfin: 'Delfín',
  erizo: 'Erizo',
  pez: 'Pez',
  tortuga: 'Tortuga',
  mono: 'Mono',
}

/**
 * Pulpito's opening question, before any pick (`odd/tasks/prewriting-stage-
 * completion.md` T21, `docs/19` §1: "el Pulpito pregunta: ¿Quién dejó todo
 * esto?").
 */
export const DEDUCTION_OPENING_LINE = '¿Quién dejó todo esto?'

/** Pulpito's short line once the case is closed, one per possible culprit —
 * every case in the registry names a real `ZooAnimalId` (widened from
 * `AnimalId`, T25), so this stays total. */
export const DEDUCTION_SOLVED_LINE: Readonly<Record<ZooAnimalId, string>> = {
  pato: '¡Era el pato!',
  gallina: '¡Era la gallina!',
  vaca: '¡Era la vaca!',
  gato: '¡Era el gato!',
  oveja: '¡Eran las ovejas!',
  llama: '¡Era la llama!',
  vibora: '¡Eran las víboras!',
  abeja: '¡Era la abeja!',
  delfin: '¡Eran los delfines!',
  erizo: '¡Era el erizo!',
  pez: '¡Eran los peces!',
  tortuga: '¡Eran las tortugas!',
  mono: '¡Eran los monos!',
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
 *
 * [T21 follow-up, orchestrator screenshot review 2026-09-26: "the bubble is
 * so small it overlaps... most likely because the large feather image
 * inside the bubble pushes the text down"] Returns TEXT ONLY now — no
 * `art` field. The chip row already shows every collected clue and the
 * fading card already shows which animal was ruled out, so a THIRD picture
 * inside the bubble was pure duplication, and for a tall/narrow clue image
 * (the feather) it was also the actual overflow: a real browser rendered
 * the caption lower than `bubbleFit.ts`'s own FLOAT/STACK model predicted
 * once that image's own real CSS float interacted with word-wrap in a way
 * the model's character-count heuristic did not reproduce exactly. Dropping
 * the image removes the whole float/wrap interaction this screen's bubble
 * ever needed to get right — `bubbleFit.ts`'s own `fitBubbleContent`/
 * `placeAndFitBubble` now take an OPTIONAL `art`, degenerating cleanly to
 * plain wrapped text (that module's own header has the exact reasoning).
 */
export function deductionHint(kase: DetectiveCase, state: DeductionState): string {
  if (state.closed) return DEDUCTION_SOLVED_LINE[kase.culprit]
  const last = state.dismissed[state.dismissed.length - 1]
  if (last !== undefined) {
    const text = kase.hint[last]
    if (text) return text
  }
  return DEDUCTION_OPENING_LINE
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
  dismissed: readonly ZooAnimalId[]
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
  animal: ZooAnimalId,
  culprit: ZooAnimalId,
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
export function solvesCase(state: DeductionState, animal: ZooAnimalId, culprit: ZooAnimalId): boolean {
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
  id: ZooAnimalId
  kase: DetectiveCase
  state: DeductionState
  onPick: (animal: ZooAnimalId) => void
}) {
  const dismissed = state.dismissed.includes(id)
  // [T21; widened T25] `docs/19` §7 slice 3: every option stands as a
  // SILHOUETTE (`ANIMAL_SILHOUETTE_ART`/`silhouetteArtFor`, a real derived
  // PNG — `assets.ts`'s own header — never a runtime CSS/SVG filter) until
  // the culprit is actually picked; only then does IT ALONE swap to its
  // full-colour picture ("the silhouette fills with colour and the duck
  // peeks out"). A dismissed distractor never reveals — it was RULED OUT,
  // not identified. `ZOO_ANIMAL_ART`, not `ANIMAL_ART`: it resolves every
  // `ZooAnimalId` (erizo/oveja/llama included, T25) and — for the original
  // four — is the exact SAME object `ANIMAL_ART` was (`assets.ts`'s own
  // "preserves referential identity" guarantee), so this is a behaviour-
  // preserving generalisation, not a different picture.
  const revealed = state.closed && id === kase.culprit
  // [T27, `docs/19` §3 monos row] A placeholder animal's own derived
  // silhouette is a featureless block (`PLACEHOLDER_ZOO_ANIMALS`'s own
  // header) — `silhouetteArtFor` would either throw (`mono` has no entry
  // in `ANIMAL_SILHOUETTE_ART` at all) or, worse, succeed and render that
  // broken picture. Before the reveal, a placeholder animal draws
  // `PawPrintIcon` instead — `screen/DetectiveNotebook.tsx`'s own "missing
  // page" treatment, restated for the lineup. Once REVEALED (the culprit,
  // case closed) it still shows its real `ZOO_ANIMAL_ART` — there is
  // nothing else to show for an animal actually caught, same as the
  // notebook's own rescued-but-placeholder page.
  const placeholder = !revealed && PLACEHOLDER_ZOO_ANIMALS.has(id)
  const art = revealed ? ZOO_ANIMAL_ART[id] : placeholder ? undefined : silhouetteArtFor(id)
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
        {art ? (
          <CaptionedArt
            art={art}
            label={ANIMAL_LABEL[id]}
            size={ANIMAL_SIZE}
            className={revealed ? 'cv-reveal-pop' : undefined}
          />
        ) : (
          <span className="cv-captioned">
            {/* `.cv-captioned > svg` (this file's own CSS, below) sizes
                ANY svg here via `--cv-animal`, the same responsive rule
                `CaptionedArt`'s own svg already rides — no extra class
                needed for this one to match its siblings' size. */}
            <PawPrintIcon />
            <span className="cv-caption">{ANIMAL_LABEL[id]}</span>
          </span>
        )}
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
/* [T21 follow-up round 3, orchestrator screenshot review] Pulpito is the
 * NARRATOR on this screen, not the star the way he is on AdventureIntro.tsx/
 * AdventureClosing.tsx (nothing else shares THEIR screen with him) — his own
 * stage is now a small, FIXED-size square (.cv-deduction-frame, below:
 * ~22-26% of the viewport's own height), never the full T18 stage size. That
 * frees the whole TOP of the sheet for the chip row and the card row, with
 * Pulpito's small stage confined to the bottom-left corner underneath them —
 * confirmed by real measured DOM rects, not merely by eye (this task's own
 * QA script). The card row needs no rightward push any more either: nothing
 * of Pulpito's now reaches high enough to compete with it. */
.cv-deduction-content { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: flex-start; gap: 14px; padding: 64px 24px 0; }
.cv-deduction-cards { align-self: stretch; display: flex; justify-content: center; }
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
 * together so a caption can never outgrow its own picture. Pulpito's own
 * stage is small and confined to the bottom-left now, so the width term
 * only needs to account for the sheet's own side padding and the figures'
 * gaps again — a single centred row, not pushed clear of anything. */
.cv-lineup-figures { --cv-animal: min(160px, calc((100vw - 200px) / 3.9)); }
.cv-lineup-figures-3 { --cv-animal: min(160px, calc((100vw - 160px) / 3.05)); }
.cv-captioned > svg { width: auto; height: var(--cv-animal); }
.cv-captioned { gap: calc(var(--cv-animal) * 0.03); }
.cv-lineup-slot { gap: calc(var(--cv-animal) * 0.03); }
@media (max-height: 820px) {
  .cv-lineup-figures { --cv-animal: min(130px, calc((100vw - 200px) / 3.9)); gap: 14px; }
  .cv-lineup-figures-3 { --cv-animal: min(130px, calc((100vw - 160px) / 3.05)); }
}
@media (max-height: 520px) {
  .cv-deduction-content { padding: 48px 16px 0; gap: 8px; }
  .cv-lineup-figures { --cv-animal: min(84px, calc((100vw - 160px) / 3.9)); gap: 8px; }
  .cv-lineup-figures-3 { --cv-animal: min(90px, calc((100vw - 140px) / 3.05)); }
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
/* [T21 follow-up round 3] Pulpito's own corner stage — a small FIXED square
 * (~24dvh, comfortably inside the 22-26% of the viewport's own HEIGHT the
 * orchestrator asked for), never the full T18 stage size: he narrates here,
 * he is not the star. octopusBoxAtCorner/placeAndFitBubble
 * (screen/pulpitoStance.ts, screen/bubbleFit.ts) are still the SAME
 * functions AdventureIntro.tsx calls, not a reimplementation — only the
 * frame's own size and the octopus's sizeBy ('height', matching a portrait
 * figure the same way PrologueOpening.tsx's own caretaker already is) are
 * tuned for sharing the sheet with a card row above. pointer-events: none
 * on the frame: it must never block a tap on a card behind it. */
.cv-deduction-frame { position: absolute; left: 0; bottom: ${STAGE_MARGIN_PCT}%; width: min(100%, max(${DEDUCTION_STAGE_MIN_PX}px, ${DEDUCTION_STAGE_DVH}dvh)); aspect-ratio: 1 / 1; container-type: inline-size; pointer-events: none; }
.cv-deduction-octopus { position: absolute; bottom: 2%; height: ${DEDUCTION_OCTOPUS_SIZE_PCT}%; width: auto; }
.cv-deduction-octopus img { display: block; width: auto; height: 100%; }
.cv-deduction-bubble { position: absolute; container-type: inline-size; }
.cv-deduction-bubble .cv-bubble-pop > img { display: block; width: 100%; height: auto; }
.cv-deduction-bubble--mirror-x .cv-bubble-pop > img { transform: scaleX(-1); }
/* [T21 follow-up round 3, orchestrator screenshot review: "the hint renders
 * BELOW the bubble's oval... most likely because the large feather image
 * inside the bubble pushes the text down"] TEXT ONLY now — no image
 * anywhere in the content box, so there is no float/wrap interaction left
 * for a real browser to render differently than bubbleFit.ts's own model
 * predicts (deductionHint's own header has the full reasoning). The
 * content box is the SAME measured-safe rectangle CONTENT_LEFT_FRAC/
 * CONTENT_TOP_FRAC/CONTENT_WIDTH_FRAC/CONTENT_HEIGHT_FRAC describe — this
 * screen's own QA script measures the caption's real getBoundingClientRect
 * against exactly that box, in the browser, not by eye. */
.cv-deduction-bubble-text { position: absolute; left: var(--cv-content-left); top: var(--cv-content-top); width: var(--cv-content-width); font-size: var(--cv-caption-font); line-height: ${LINE_HEIGHT}; font-weight: 700; color: #1e293b; text-align: left; }
`

export interface DeductionViewProps {
  kase: DetectiveCase
  state: DeductionState
  onPick: (animal: ZooAnimalId) => void
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
  // culprit's name once solved. Text only (see DEDUCTION_CSS's own header
  // on why) — `placeAndFitBubble` is called with no `art` at all.
  const hintText = deductionHint(kase, state)
  // [T21 follow-up round 3] `sizeBy: 'height'` — the SAME convention
  // `PrologueOpening.tsx`'s own portrait caretaker figure already uses
  // (`bubblePlacement.ts`'s own `OctopusBoxOptions` doc), since
  // `ZOO_CARETAKER_ART` (235×320) is taller than it is wide.
  // `DEDUCTION_OCTOPUS_SIZE_PCT` of `DEDUCTION_STAGE_DVH` (both exported,
  // above) is what actually lands the octopus at 22-26% of the VIEWPORT's
  // own height — an earlier attempt sized the octopus to 95% of a frame
  // that was ITSELF already shrunk to the octopus's own target size, which
  // left next to no frame width for the bubble at all (measured: a 37px-
  // wide bubble on a 1024px screen).
  const octopusBox = octopusBoxAtCorner(ZOO_CARETAKER_ART, {
    corner: 'left',
    sizeBy: 'height',
    size: DEDUCTION_OCTOPUS_SIZE_PCT,
    bottom: 2,
    inset: OCTOPUS_CORNER_INSET,
  })
  const { placement, content } = placeAndFitBubble({
    frame: { w: 100, h: 100 },
    headBox: octopusBox,
    tail: ZOO_SPEECH_BUBBLE_TAIL,
    side: stanceBubbleSide('left'),
    text: hintText,
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
          {/* [T25] The night case supplies its own chip pictures directly
              (`clueArt`, naturalistic props with no honest `ClueKind`
              colour token) — every other case still derives one `ClueKind`
              per pistas level (`clueKindsOf`'s default path), unchanged. */}
          {(kase.clueArt ?? clueKindsOf(kase).map((kind) => CLUE_ART[kind].art.earned)).map(
            (art, i) => (
              <ClueChip key={i} art={art} />
            ),
          )}
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
            key={hintText}
            className="cv-bubble-pop"
            style={{ transformOrigin: `${placement.tailOriginX}% ${placement.tailOriginY}%` }}
          >
            <img src={ZOO_SPEECH_BUBBLE_ART.href} alt="" />
            {/* [T21 follow-up round 3] Text only — no CaptionedArt, no
                image. Licensed by detective/captionAudit.ts's
                CAPTION_CONTAINERS carrying 'cv-deduction-frame' now: the
                octopus's OWN <img>, a sibling within that same frame, is
                the picture this spoken line stands beside — never a second,
                redundant clue/animal picture crammed into the bubble
                itself (the orchestrator's own instruction: "prefer none"). */}
            <p className="cv-deduction-bubble-text">{hintText}</p>
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
