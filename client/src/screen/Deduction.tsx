// Deduction screen (`detective-mode` design unit 7, spec: detective-mode
// "Deduction Screen", level-engine "Deduction View Reachable from
// nextView"). Reached once every trail's clue is filed; reuses the SAME
// `.cv-play`/`.cv-head` shell `LevelPlay.tsx` renders (its `LAYOUT_CSS` is
// imported here for the shell).
//
// [T46, `odd/tasks/prewriting-stage-completion.md`: "que sea bien intuitivo
// lo que hay que hacer a la hora de adivinar ... que se presenten
// correctamente las pistas obtenidas, en grande, y se entienda que hay que
// elegir la correcta"] The screen now has two clearly separate parts:
//
//  - the EVIDENCE BOARD: every clue the child collected, as a big pinned
//    photo on a kraft-paper board with Pulpito's lens on its top edge (it
//    replaced the T21 row of 40px chips). The photos arrive one by one; a
//    tap anywhere skips the arrival.
//  - the CHOICE GROUP: a prompt pill with a pointing hand ("Tocá quién
//    fue") over big marker-style cards with a pressable lip. After a few
//    idle seconds the open cards pulse and a hand points at the first one
//    (`screen/idleNudge.ts`'s clock, the same one `LevelPlay` uses), and the
//    narrator repeats the question and the instruction.
//
// A `comparison` case (sheep wool, turtle prints) shows its one sample at
// the SAME size as the candidates, beside them when there is room, with an
// "=" badge between: "this one = which of these?".
//
// Every rectangle is decided by `screen/deductionLayout.ts` (pure, tested
// for every case at every required viewport); this component only paints
// them. Pulpito's corner stage stays the SAME `octopusBoxAtCorner`/
// `placeAndFitBubble` engine every narrative screen uses, and the layout
// keeps the evidence and the cards out of the union of every bubble the case
// can show, so nothing moves when his line changes.
//
// [D6 amended by `case-registry-and-captions`] Each option's name is still
// VISIBLE beneath its picture (`CaptionedArt`); the prompt pill's words sit
// beside a drawn hand (`detective/captionAudit.ts`'s `cv-deduction-prompt`).
// No `url(#...)` reference, no `<mask>`/`<filter>`/`<clipPath>`/gradient
// referenced by id (`TraceCanvas.tsx:70-84`).
//
// [case-registry-and-captions, Phase 5] This screen reads a `DetectiveCase`
// (`kase`) for its options, its culprit and its hints, so the SAME component
// renders every case without a special case anywhere in this file.
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import {
  CARRIER_LENS_ART,
  CLUE_ART,
  PLACEHOLDER_ZOO_ANIMALS,
  silhouetteArtFor,
  ZOO_ANIMAL_ART,
  ZOO_CARETAKER_ART,
  ZOO_SPEECH_BUBBLE_ART,
  type ArtImage,
  type ZooAnimalId,
} from '../detective/assets'
import { playSfx } from '../audio/sfx'
import { clueKindsOf, type DeductionForm, type DetectiveCase } from '../detective/cases'
import CaptionedArt from '../detective/CaptionedArt'
import {
  BackIcon,
  PawPrintIcon,
  PointingHandIcon,
  POINTING_HAND_TIP,
  POINTING_HAND_VIEWBOX,
} from '../detective/icons'
import { LAYOUT_CSS } from './LevelPlay'
import { SHEET_PAPER } from '../canvas/TraceCanvas'
import { backdropFor } from '../zoo/backdrops'
import { BUBBLE_POP_CSS } from './BubblePop'
import { ZOO_SPEECH_BUBBLE_TAIL, type BubblePlacement } from './bubblePlacement'
import {
  CONTENT_LEFT_FRAC,
  CONTENT_TOP_FRAC,
  CONTENT_WIDTH_FRAC,
  GAP_FRAC,
  LINE_HEIGHT,
  placeAndFitBubble,
  type PlacedBubbleContent,
} from './bubbleFit'
import { octopusBoxAtCorner, OCTOPUS_CORNER_INSET, stanceBubbleSide } from './pulpitoStance'
import { bubbleContentCssVars } from './bubbleCssVars'
import {
  DEDUCTION_OCTOPUS_SIZE_PCT,
  deductionFrameRect,
  deductionLayout,
  pulpitoZonePx,
  type DeductionLayout,
  type Rect,
  type Viewport,
} from './deductionLayout'
import { idleNudgeCueIndex, idleNudgePhase, shouldSpeakIdleHint } from './idleNudge'
import { useNarration } from '../voice/useNarration'
import { canAutoSpeak, speak } from '../voice/narrator'
import SpeakButton from '../voice/SpeakButton'

export {
  DEDUCTION_OCTOPUS_SIZE_PCT,
  DEDUCTION_STAGE_DVH,
  DEDUCTION_STAGE_MAX_VW,
  DEDUCTION_STAGE_MIN_PX,
} from './deductionLayout'

/** One registry raster, centred on the origin of an origin-centred viewBox.
 * `size` is the HEIGHT; width follows from the source file's aspect ratio.
 * An `<image>` is the only way raster art gets onto this screen without a
 * `url(#)` reference (module comment above; `assets.ts` header). */
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

/** The height a picture of `art`'s aspect gets inside a `box`x`box` square
 *  (`CaptionedArt`/`Art` take a HEIGHT): a wide sign or cow shrinks, a tall
 *  feather keeps the full height. */
function fittedHeight(art: ArtImage, box: number): number {
  return art.w > art.h ? (box * art.h) / art.w : box
}

/** The case's collected clues, in play order: the night case supplies its
 *  own pictures (`DetectiveCase.clueArt`, T25); every other case shows one
 *  earned `ClueKind` per pistas level. */
export function deductionClueArt(kase: DetectiveCase): readonly ArtImage[] {
  return kase.clueArt ?? clueKindsOf(kase).map((kind) => CLUE_ART[kind].art.earned)
}

/** The board border, px — the tiles are positioned inside its padding box. */
const BOARD_BORDER = 3
/** A clue's art is this fraction of its photo tile; the rest is paper. */
const TILE_ART_FRAC = 0.8
/** Seconds: the board drops in, then each clue every `CLUE_STAGGER`, then
 *  the prompt and the cards. */
const BOARD_IN = 0.3
const CLUE_STAGGER = 0.35
const CLUE_IN = 0.45
const CHOICE_STAGGER = 0.1
const CHOICE_IN = 0.35

/** When the `i`th clue starts arriving, seconds. */
function clueDelay(i: number): number {
  return BOARD_IN + i * CLUE_STAGGER
}

/** When the prompt (`i = 0`) and then each card (`i = 1..`) start arriving. */
function choiceDelay(clueCount: number, i: number): number {
  return clueDelay(clueCount) + 0.1 + i * CHOICE_STAGGER
}

/** The whole arrival, ms: past this the screen is fully settled and taps on
 *  the cards count. Exported for the stateful wrapper and its test. */
export function revealDurationMs(clueCount: number, optionCount: number): number {
  return Math.ceil((choiceDelay(clueCount, optionCount) + CHOICE_IN) * 1000)
}

/** A pinned photo's tilt, degrees — alternating so the board reads as
 *  hand-pinned evidence, small enough to stay inside the board's padding. */
function clueTilt(i: number): number {
  return [-2.5, 2, -1.5, 2.5][i % 4]
}

/** One collected clue, BIG, as a pinned photo on the evidence board. */
function EvidenceTile({ art, rect, origin, index }: { art: ArtImage; rect: Rect; origin: Rect; index: number }) {
  const inner = rect.w * TILE_ART_FRAC
  const half = rect.w / 2
  const style = {
    left: rect.x - origin.x - BOARD_BORDER,
    top: rect.y - origin.y - BOARD_BORDER,
    width: rect.w,
    height: rect.h,
    '--cv-tilt': `${clueTilt(index)}deg`,
    '--cv-delay': `${clueDelay(index)}s`,
  } as CSSProperties
  return (
    <span className="cv-evidence-tile" style={style}>
      <svg viewBox={`${-half} ${-half} ${rect.w} ${rect.h}`} width={rect.w} height={rect.h} aria-hidden="true" focusable="false">
        <Art art={art} size={fittedHeight(art, inner)} />
      </svg>
      <span className="cv-evidence-tape" />
    </span>
  )
}

/** The comparison's "=" — two plain bars, drawn (never a text glyph: a word
 *  or symbol on this screen must ride a picture, `captionAudit.ts`). */
function EqualsGlyph() {
  return (
    <svg viewBox="0 0 40 40" aria-hidden="true" focusable="false">
      <rect x="8" y="11" width="24" height="6" rx="3" fill="#1e293b" />
      <rect x="8" y="23" width="24" height="6" rx="3" fill="#1e293b" />
    </svg>
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
  // [T45] A case may ask its own question ("¿De quién es esta lana?").
  return kase.question ?? DEDUCTION_OPENING_LINE
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


/**
 * [T46] What to DO, per way of deducing (`DeductionForm`): `label` is the
 * prompt pill over the cards (a few words beside a pointing hand), `spoken`
 * is what the narrator adds after the question. Every option of a
 * silhouette case IS an animal ("quién fue"); the fish case's options are
 * enclosure signs ("su cartel"); a comparison's are samples or prints ("la
 * que es igual").
 */
export const DEDUCTION_INSTRUCTION: Readonly<Record<DeductionForm, { label: string; spoken: string }>> = {
  'new-silhouettes': { label: 'Tocá quién fue', spoken: 'Mirá las pistas y tocá quién fue.' },
  'rescued-silhouettes': {
    label: 'Tocá quién fue',
    spoken: 'Mirá las pistas y tocá quién fue. ¡Ojo! A algunos ya los rescatamos.',
  },
  signs: { label: 'Tocá su cartel', spoken: 'Mirá las pistas y tocá el cartel de su recinto.' },
  comparison: { label: 'Tocá la que es igual', spoken: 'Mirá la pista y tocá la que es igual.' },
}

/** Pulpito's opening question for this case (its bubble's first line). */
export function deductionQuestion(kase: DetectiveCase): string {
  return kase.question ?? DEDUCTION_OPENING_LINE
}

/** The narrator's opening: the question, then what to do. Also what the
 *  idle nudge and the speak button repeat. */
export function deductionSpokenOpening(kase: DetectiveCase): string {
  return `${deductionQuestion(kase)} ${DEDUCTION_INSTRUCTION[kase.form].spoken}`
}

/** What the narrator says for the CURRENT state: the opening while nothing
 *  has been picked, otherwise exactly Pulpito's bubble (a wrong pick's
 *  reason, or the solved line). */
export function deductionSpokenLine(kase: DetectiveCase, state: DeductionState): string {
  if (!state.closed && state.dismissed.length === 0) return deductionSpokenOpening(kase)
  return deductionHint(kase, state)
}

/** Every line Pulpito's bubble can show for this case — the layout keeps
 *  the evidence and the cards clear of ALL of them, so nothing moves when
 *  the line changes. */
export function deductionBubbleLines(kase: DetectiveCase): string[] {
  const lines = [deductionQuestion(kase)]
  for (const id of kase.options) {
    const hint = kase.hint[id]
    if (hint) lines.push(hint)
  }
  lines.push(DEDUCTION_SOLVED_LINE[kase.culprit])
  return lines
}

/** Pulpito's octopus box, percent of his square frame. */
const OCTOPUS_BOX = octopusBoxAtCorner(ZOO_CARETAKER_ART, {
  corner: 'left',
  sizeBy: 'height',
  size: DEDUCTION_OCTOPUS_SIZE_PCT,
  bottom: 2,
  inset: OCTOPUS_CORNER_INSET,
})

/** Pulpito's bubble for one line — the SAME engine `AdventureIntro.tsx`
 *  uses, text only. Exported so `bubbleFit.test.ts` sweeps the exact call. */
export function deductionBubble(text: string): PlacedBubbleContent {
  return placeAndFitBubble({
    frame: { w: 100, h: 100 },
    headBox: OCTOPUS_BOX,
    tail: ZOO_SPEECH_BUBBLE_TAIL,
    side: stanceBubbleSide('left'),
    text,
  })
}

/** Everything Pulpito's corner stage can paint for `kase` at `viewport`
 *  (octopus + every bubble line), px. */
export function deductionPulpitoZone(kase: DetectiveCase, viewport: Viewport): Rect {
  const bubbles: BubblePlacement[] = deductionBubbleLines(kase).map((line) => deductionBubble(line).placement)
  return pulpitoZonePx(viewport, OCTOPUS_BOX, bubbles)
}

/** The whole screen's geometry for `kase` at `viewport`. */
export function deductionScreenLayout(kase: DetectiveCase, viewport: Viewport): DeductionLayout {
  return deductionLayout({
    viewport,
    clueCount: deductionClueArt(kase).length,
    optionCount: kase.options.length,
    form: kase.form,
    pulpito: deductionPulpitoZone(kase, viewport),
    promptChars: DEDUCTION_INSTRUCTION[kase.form].label.length,
  })
}

/** One option card. A dismissed distractor drains (opacity) and steps back
 * (a plain scale, never a filter/mask — `TraceCanvas.tsx:70-84`; `docs/19`
 * §5.4 "la silueta da un pasito atrás") rather than disappearing, so the
 * case file keeps showing every deduction made so far; it stays inside its
 * own card rectangle, so it can never cover a neighbour. The reason is
 * Pulpito's line, not a second icon here. */
function Animal({
  id,
  index,
  kase,
  state,
  layout,
  clueCount,
  onPick,
}: {
  id: ZooAnimalId
  index: number
  kase: DetectiveCase
  state: DeductionState
  layout: DeductionLayout
  clueCount: number
  onPick: (animal: ZooAnimalId) => void
}) {
  const dismissed = state.dismissed.includes(id)
  // [T21; widened T25] Every option stands as a SILHOUETTE until the culprit
  // is picked; only then does IT ALONE swap to its full-colour picture. A
  // dismissed distractor never reveals — it was RULED OUT, not identified.
  const revealed = state.closed && id === kase.culprit
  // [T26] `kase.optionArt` overrides the default silhouette (enclosure
  // signs, samples, prints). [T27] Otherwise a placeholder animal (`mono`)
  // draws `PawPrintIcon` before the reveal instead of its featureless block.
  const placeholder = !revealed && !kase.optionArt?.[id] && PLACEHOLDER_ZOO_ANIMALS.has(id)
  const art = revealed
    ? ZOO_ANIMAL_ART[id]
    : (kase.optionArt?.[id] ?? (placeholder ? undefined : silhouetteArtFor(id)))
  // A wrong pick is gentle (`docs/01` principle 2: no red, no failure
  // sound): one soft shake on the card just picked, never replayed for an
  // older dismissal.
  const isLastDismissed = !state.closed && state.dismissed[state.dismissed.length - 1] === id
  const rect = layout.cards[index]
  const slotStyle = {
    left: rect.x,
    top: rect.y,
    width: rect.w,
    height: rect.h,
    '--cv-delay': `${choiceDelay(clueCount, index + 1)}s`,
    '--cv-i': index,
    '--cv-caption-font': `${layout.captionFont}px`,
  } as CSSProperties
  const buttonStyle: CSSProperties | undefined = dismissed ? { opacity: 0.3, transform: 'scale(0.9)' } : undefined
  const classes = ['cv-lineup-slot']
  if (isLastDismissed) classes.push('cv-lineup-slot-shake')
  if (dismissed) classes.push('cv-lineup-slot--out')
  return (
    <div className={classes.join(' ')} style={slotStyle}>
      <button
        type="button"
        className="animal-btn"
        style={buttonStyle}
        disabled={state.closed}
        onClick={() => onPick(id)}
      >
        {art ? (
          <CaptionedArt
            art={art}
            label={ANIMAL_LABEL[id]}
            size={fittedHeight(art, layout.picture)}
            className={revealed ? 'cv-reveal-pop' : undefined}
          />
        ) : (
          <span className="cv-captioned">
            <PawPrintIcon className="cv-option-paw" />
            <span className="cv-caption">{ANIMAL_LABEL[id]}</span>
          </span>
        )}
      </button>
    </div>
  )
}

/**
 * Only the rules this screen adds; the shell (`.cv-play`, `.cv-head`) is
 * `LevelPlay`'s `LAYOUT_CSS`. Every part is absolutely positioned at the
 * px rectangle `deductionLayout` computed (inline styles), so nothing here
 * sizes anything by viewport units any more: the layout function owns that,
 * and its tests prove it.
 *
 * Marker style throughout (`docs/09` §1): paper fill, thick dark outline, no
 * gradient, no shadow. The board is KRAFT paper so the evidence reads as a
 * different thing from the white choice cards. NO BACKTICKS in this block —
 * one inside a comment ends this template literal early.
 */
export const DEDUCTION_CSS = `
.cv-deduction-backdrop { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; display: block; }
${BUBBLE_POP_CSS}
.cv-deduction-speak { position: absolute; top: 6px; right: 12px; z-index: 2; }
/* The evidence board: kraft paper, the lens badge straddling its top edge,
 * one pinned photo per clue. */
.cv-evidence-board { position: absolute; border: ${BOARD_BORDER}px solid #1a1a1a; border-radius: 22px; background: #e2c48f; }
.cv-evidence-badge { position: absolute; border-radius: 50%; border: 3px solid #1a1a1a; background: ${SHEET_PAPER}; display: flex; align-items: center; justify-content: center; }
.cv-evidence-badge img { display: block; height: 72%; width: auto; }
.cv-evidence-tile { position: absolute; border: 3px solid #1a1a1a; border-radius: 10px; background: ${SHEET_PAPER}; transform: rotate(var(--cv-tilt)); }
.cv-evidence-tile > svg { position: absolute; inset: 0; width: 100%; height: 100%; }
/* A strip of tape holding the photo up: flat, translucent paper. */
.cv-evidence-tape { position: absolute; left: 32%; top: -7px; width: 36%; height: 14px; border-radius: 3px; background: rgba(255, 252, 240, 0.75); border: 2px solid rgba(26, 26, 26, 0.35); }
/* The "=" between a comparison's sample and its candidates. */
.cv-deduction-relation { position: absolute; border-radius: 50%; border: 3px solid #1a1a1a; background: ${SHEET_PAPER}; display: flex; align-items: center; justify-content: center; }
.cv-deduction-relation > svg { width: 80%; height: 80%; }
/* The prompt pill: a pointing hand + a few words, centred over the cards. */
.cv-deduction-prompt { position: absolute; margin: 0; display: flex; align-items: center; justify-content: center; gap: 0.35em; border-radius: 999px; border: 3px solid #1a1a1a; background: #ffe58a; color: #1e293b; font-weight: 800; white-space: nowrap; line-height: 1; }
.cv-deduction-prompt > svg { flex: none; }
/* Once the case is closed there is nothing left to tap: the pill goes (its
 * place is kept, so nothing moves). */
.cv-deduction-prompt--done { visibility: hidden; }
.cv-lineup-slot { position: absolute; display: flex; }
/* Marker-style CARD with a thick bottom LIP, so it reads as a button to
 * press; pressing squashes the lip. The card fills its layout rectangle
 * exactly; the picture is fitted into a square well above the caption. */
.animal-btn {
  flex: 1 1 auto;
  display: flex;
  min-height: 64px;
  min-width: 64px;
  padding: ${'var(--cv-card-pad-top) var(--cv-card-pad-x) 4px'};
  border: 3px solid #1a1a1a;
  border-bottom-width: 9px;
  border-radius: 22px;
  background: ${SHEET_PAPER};
  cursor: pointer;
  font: inherit;
  transition: opacity 0.3s ease, transform 0.3s ease, background-color 0.15s ease;
  -webkit-tap-highlight-color: transparent;
}
.animal-btn:not([disabled]):active { transform: translateY(5px); border-bottom-width: 4px; background-color: #fff3c4; }
.animal-btn[disabled] { cursor: default; }
.animal-btn > .cv-captioned { flex: 1 1 auto; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; min-width: 0; }
.animal-btn > .cv-captioned > svg { flex: none; margin: auto 0; }
.animal-btn .cv-option-paw { width: 72%; height: auto; flex: none; margin: auto 0; }
/* The word sits UNDER the picture (D6 amendment). Normal Spanish case in
 * the DOM ("Pato"), uppercase by paint: several screen readers spell a
 * genuinely all-caps short word letter by letter. One line, never broken
 * (the layout sizes the font from the picture). */
.cv-caption { font-size: var(--cv-caption-font); line-height: 1.2; font-weight: 800; color: #1e293b; text-transform: uppercase; letter-spacing: 0.02em; white-space: nowrap; }
/* [T21] The correct pick's own reveal pop. */
@keyframes cv-reveal-pop {
  0% { transform: scale(0.85); }
  60% { transform: scale(1.08); }
  100% { transform: scale(1); }
}
.cv-reveal-pop { animation: cv-reveal-pop 0.5s ease; transform-origin: 50% 50%; }
/* A wrong pick's gentle feedback (docs/01 principle 2: no red, no failure
 * sound): a soft one-shot shake on the SLOT (the button carries its own
 * inline drain-and-step-back transform). */
@keyframes cv-lineup-shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-6px); }
  75% { transform: translateX(6px); }
}
.cv-deduction--revealed .cv-lineup-slot-shake { animation: cv-lineup-shake 0.4s ease; }
/* [T46] The arrival: the board, then each clue, then the prompt and the
 * cards. Only while the screen is revealing; a tap anywhere ends it, and
 * the cards ignore taps until then (a tap on a card that has not appeared
 * yet must not pick it). */
@keyframes cv-board-in { 0% { opacity: 0; transform: translateY(-16px); } 100% { opacity: 1; transform: translateY(0); } }
@keyframes cv-clue-in {
  0% { opacity: 0; transform: translateY(-36px) scale(1.3) rotate(var(--cv-tilt)); }
  70% { opacity: 1; transform: translateY(3px) scale(0.97) rotate(var(--cv-tilt)); }
  100% { opacity: 1; transform: translateY(0) scale(1) rotate(var(--cv-tilt)); }
}
@keyframes cv-choice-in { 0% { opacity: 0; transform: translateY(18px); } 100% { opacity: 1; transform: translateY(0); } }
.cv-deduction--revealing .cv-evidence-board { animation: cv-board-in ${BOARD_IN}s ease both; }
.cv-deduction--revealing .cv-evidence-tile { animation: cv-clue-in ${CLUE_IN}s ease both; animation-delay: var(--cv-delay); }
.cv-deduction--revealing .cv-deduction-prompt,
.cv-deduction--revealing .cv-deduction-relation,
.cv-deduction--revealing .cv-lineup-slot { animation: cv-choice-in ${CHOICE_IN}s ease both; animation-delay: var(--cv-delay); }
.cv-deduction--revealing .cv-lineup-slot { pointer-events: none; }
/* [T46] The idle nudge: the open cards pulse one after another, and a hand
 * sweeps across them and back. */
@keyframes cv-card-pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.06); } }
.cv-deduction--nudge .cv-lineup-slot:not(.cv-lineup-slot--out) .animal-btn { animation: cv-card-pulse 0.9s ease-in-out 2; animation-delay: calc(var(--cv-i) * 0.15s); }
@keyframes cv-hand-sweep { 0%, 100% { transform: translateX(0); } 50% { transform: translateX(var(--cv-hand-dx)); } }
@keyframes cv-hand-bob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-12px); } }
.cv-deduction-hand { position: absolute; pointer-events: none; z-index: 3; animation: cv-hand-sweep 2.2s ease-in-out 1 both; }
.cv-deduction-hand > svg { display: block; animation: cv-hand-bob 0.55s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) {
  .cv-reveal-pop, .cv-lineup-slot-shake, .cv-deduction-hand, .cv-deduction-hand > svg,
  .cv-deduction--revealing .cv-evidence-board, .cv-deduction--revealing .cv-evidence-tile,
  .cv-deduction--revealing .cv-deduction-prompt, .cv-deduction--revealing .cv-deduction-relation,
  .cv-deduction--revealing .cv-lineup-slot,
  .cv-deduction--nudge .cv-lineup-slot .animal-btn { animation: none; }
}
/* Pulpito's corner stage: the SAME octopusBoxAtCorner/placeAndFitBubble
 * pair AdventureIntro.tsx calls, in a square frame whose px size and place
 * come from deductionLayout.ts (deductionFrameRect). pointer-events: none:
 * it must never block a tap. */
.cv-deduction-frame { position: absolute; container-type: inline-size; pointer-events: none; }
.cv-deduction-octopus { position: absolute; bottom: 2%; height: ${DEDUCTION_OCTOPUS_SIZE_PCT}%; width: auto; }
.cv-deduction-octopus img { display: block; width: auto; height: 100%; }
.cv-deduction-bubble { position: absolute; container-type: inline-size; }
.cv-deduction-bubble .cv-bubble-pop > img { display: block; width: 100%; height: auto; }
.cv-deduction-bubble--mirror-x .cv-bubble-pop > img { transform: scaleX(-1); }
/* TEXT ONLY inside the bubble (deductionHint's own header): the content box
 * is the measured-safe rectangle CONTENT_LEFT_FRAC/CONTENT_TOP_FRAC/
 * CONTENT_WIDTH_FRAC describe. */
.cv-deduction-bubble-text { position: absolute; left: var(--cv-content-left); top: var(--cv-content-top); width: var(--cv-content-width); margin: 0; font-size: var(--cv-caption-font); line-height: ${LINE_HEIGHT}; font-weight: 700; color: #1e293b; text-align: left; }
`

export interface DeductionViewProps {
  kase: DetectiveCase
  state: DeductionState
  onPick: (animal: ZooAnimalId) => void
  onExit: () => void
  /** The viewport, CSS px. Defaults to 1024x768 (a node render has none). */
  viewport?: Viewport
  /** [T46] The arrival is still playing: animated parts, cards not yet
   *  tappable. Defaults to `false` (a settled screen). */
  revealing?: boolean
  /** A tap anywhere while `revealing` ends the arrival at once. */
  onSkipReveal?: () => void
  /** [T46] The idle nudge's cue is playing (`idleNudgePhase === 'nudge'`). */
  nudging?: boolean
  /** Any touch on the screen (resets the idle clock). */
  onTouch?: () => void
}

const DEFAULT_VIEWPORT: Viewport = { w: 1024, h: 768 }

function rectStyle(r: Rect): CSSProperties {
  return { left: r.x, top: r.y, width: r.w, height: r.h }
}

/**
 * Pure presentational render of a given {@link DeductionState}. Split out
 * from the stateful default export because this repo's node-only harness
 * cannot observe a re-render after `renderToString`: every dismissal, the
 * closed state, the arrival and the nudge are asserted by rendering THIS
 * component directly with hand-built props, never by simulating a click.
 */
export function DeductionView({
  kase,
  state,
  onPick,
  onExit,
  viewport = DEFAULT_VIEWPORT,
  revealing = false,
  onSkipReveal,
  nudging = false,
  onTouch,
}: DeductionViewProps) {
  // [docs/19 §4.1 "siempre sobre la escena del nivel"] The scene the child
  // just walked, keyed off the case's first pistas trail.
  const backdrop = backdropFor(kase.trailIds[0])
  const hintText = deductionHint(kase, state)
  const layout = deductionScreenLayout(kase, viewport)
  const clueArt = deductionClueArt(kase)
  const instruction = DEDUCTION_INSTRUCTION[kase.form]
  const frame = deductionFrameRect(viewport)
  const { placement, content } = deductionBubble(hintText)
  const m = layout.metrics
  // [T46] The idle hand sweeps across the OPEN cards of the first row and
  // back — never parks on one card: the culprit is always the first option
  // in the registry, so pointing at "the first open card" would give the
  // answer away.
  const openCards = state.closed
    ? []
    : layout.cards.filter((c, i) => !state.dismissed.includes(kase.options[i]) && c.y === layout.cards[0].y)
  const handSize = m.compact ? 64 : 82
  const handFrom = openCards[0]
  const handTo = openCards[openCards.length - 1]
  const classes = ['cv-play', 'cv-deduction', revealing ? 'cv-deduction--revealing' : 'cv-deduction--revealed']
  if (nudging && !revealing) classes.push('cv-deduction--nudge')
  return (
    <main
      className={classes.join(' ')}
      style={
        {
          // Minus the 3px border: the layout's pads are border-inclusive.
          '--cv-card-pad-top': `${m.cardPadTop - 3}px`,
          '--cv-card-pad-x': `${m.cardPadX - 3}px`,
        } as CSSProperties
      }
      onPointerDown={() => {
        onTouch?.()
        if (revealing) onSkipReveal?.()
      }}
    >
      <style>{LAYOUT_CSS + DEDUCTION_CSS}</style>
      {backdrop && <img className="cv-deduction-backdrop" src={backdrop.art.href} alt="" />}
      <header className="cv-head">
        <button
          type="button"
          onClick={() => {
            playSfx('tap')
            onExit()
          }}
          className="cv-btn cv-btn-back"
          aria-label="Volver"
        >
          <BackIcon />
        </button>
      </header>
      <SpeakButton line={deductionSpokenLine(kase, state)} className="cv-deduction-speak" />
      <section className="cv-evidence-board" style={rectStyle(layout.board)} aria-label="Pistas">
        <span
          className="cv-evidence-badge"
          style={{
            left: layout.badge.x - layout.board.x - BOARD_BORDER,
            top: layout.badge.y - layout.board.y - BOARD_BORDER,
            width: layout.badge.w,
            height: layout.badge.h,
          }}
        >
          <img src={CARRIER_LENS_ART.href} alt="" />
        </span>
        {clueArt.map((art, i) => (
          <EvidenceTile key={i} art={art} rect={layout.clues[i]} origin={layout.board} index={i} />
        ))}
      </section>
      {layout.relation && (
        <span
          className="cv-deduction-relation"
          style={{ ...rectStyle(layout.relation), '--cv-delay': `${choiceDelay(clueArt.length, 0)}s` } as CSSProperties}
        >
          <EqualsGlyph />
        </span>
      )}
      <p
        className={`cv-deduction-prompt${state.closed ? ' cv-deduction-prompt--done' : ''}`}
        style={
          {
            ...rectStyle(layout.prompt),
            fontSize: layout.promptFont,
            '--cv-delay': `${choiceDelay(clueArt.length, 0)}s`,
          } as CSSProperties
        }
      >
        <PointingHandIcon height={Math.round(layout.promptFont * 1.5)} picture />
        {instruction.label}
      </p>
      {kase.options.map((id, i) => (
        <Animal
          key={id}
          id={id}
          index={i}
          kase={kase}
          state={state}
          layout={layout}
          clueCount={clueArt.length}
          onPick={onPick}
        />
      ))}
      {nudging && !revealing && handFrom && handTo && (
        <span
          className="cv-deduction-hand"
          style={
            {
              left: handFrom.x + handFrom.w / 2 - (POINTING_HAND_TIP.x * handSize) / POINTING_HAND_VIEWBOX.h,
              top: handFrom.y + handFrom.h * 0.5 - (POINTING_HAND_TIP.y * handSize) / POINTING_HAND_VIEWBOX.h,
              '--cv-hand-dx': `${handTo.x - handFrom.x}px`,
            } as CSSProperties
          }
        >
          <PointingHandIcon height={handSize} />
        </span>
      )}
      <div className="cv-deduction-frame" style={rectStyle(frame)}>
        <span className="cv-deduction-octopus" style={{ left: `${OCTOPUS_BOX.x}%` }}>
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
          {/* Keyed on the line: a new hint pops in fresh every time it
              actually changes. Text only (licensed by captionAudit.ts's
              cv-deduction-frame: the octopus's own <img> is the picture this
              spoken line stands beside). */}
          <span
            key={hintText}
            className="cv-bubble-pop"
            style={{ transformOrigin: `${placement.tailOriginX}% ${placement.tailOriginY}%` }}
          >
            <img src={ZOO_SPEECH_BUBBLE_ART.href} alt="" />
            <p className="cv-deduction-bubble-text">{hintText}</p>
          </span>
        </span>
      </div>
    </main>
  )
}

/** The real viewport, CSS px, kept current on resize/rotation; 1024x768
 *  under `renderToString` (no `window`). */
function useViewport(): Viewport {
  const read = (): Viewport =>
    typeof window === 'undefined' ? DEFAULT_VIEWPORT : { w: window.innerWidth, h: window.innerHeight }
  const [viewport, setViewport] = useState<Viewport>(read)
  useEffect(() => {
    const onResize = () => setViewport(read())
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return viewport
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** How often the idle clock is read, ms (`idleNudge.ts`'s selectors are
 *  pure functions of elapsed time, so the poll rate only sets latency). */
const IDLE_POLL_MS = 250

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
  const viewport = useViewport()
  const [revealing, setRevealing] = useState(() => !solved && !prefersReducedMotion())
  const [nudging, setNudging] = useState(false)
  const lastTouchRef = useRef(0)
  const lastSpokenRef = useRef(0)
  const lastCueRef = useRef(-1)
  const clueCount = deductionClueArt(kase).length

  // [T46] The narrator reads the question and what to do, then each wrong
  // pick's reason, then the solved line.
  useNarration(deductionSpokenLine(kase, state))

  useEffect(() => {
    if (!revealing) return
    const timer = setTimeout(() => setRevealing(false), revealDurationMs(clueCount, kase.options.length))
    return () => clearTimeout(timer)
  }, [revealing, clueCount, kase.options.length])

  // [T46] The idle nudge (`screen/idleNudge.ts`): no touch for ~6 s after
  // the arrival -> the cards pulse and a hand points; the question and the
  // instruction are spoken again at most every ~20 s.
  const idleArmed = !revealing && !state.closed
  useEffect(() => {
    if (!idleArmed) {
      setNudging(false)
      return
    }
    const armedAt = performance.now()
    lastTouchRef.current = armedAt
    lastSpokenRef.current = armedAt
    lastCueRef.current = -1
    const timer = setInterval(() => {
      const now = performance.now()
      const elapsed = now - lastTouchRef.current
      setNudging(idleNudgePhase(elapsed) === 'nudge')
      const cue = idleNudgeCueIndex(elapsed)
      if (cue > lastCueRef.current) {
        lastCueRef.current = cue
        if (cue >= 0 && shouldSpeakIdleHint(now - lastSpokenRef.current) && canAutoSpeak()) {
          lastSpokenRef.current = now
          speak(deductionSpokenOpening(kase))
        }
      }
    }, IDLE_POLL_MS)
    return () => clearInterval(timer)
  }, [idleArmed, kase])

  return (
    <DeductionView
      kase={kase}
      state={state}
      viewport={viewport}
      revealing={revealing}
      onSkipReveal={() => setRevealing(false)}
      nudging={nudging}
      onTouch={() => {
        lastTouchRef.current = performance.now()
        lastCueRef.current = -1
        setNudging(false)
      }}
      onPick={(animal) => {
        // T35: decided BEFORE the state update — the SAME `solvesCase` call
        // `onSolved` already gates on. `wrong` is deliberately NOT a failure
        // sound (`docs/01` principle 2, `audio/sfx.ts`'s own header).
        if (solvesCase(state, animal, kase.culprit)) {
          onSolved()
          playSfx('right')
        } else {
          playSfx('wrong')
        }
        setState((s) => pickAnimal(s, animal, kase.culprit))
      }}
      onExit={onExit}
    />
  )
}
