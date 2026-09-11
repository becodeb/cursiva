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
// No text anywhere in this screen but the rail's own hidden `PISTAS` label
// (Orchestrator Correction C1: "sin texto"). Animal names live ONLY in each
// button's `aria-label` — an accessible name, not visible text (the S3
// lesson recorded in `LevelPlay.tsx`'s icon controls applies here too).
// No `url(#...)` reference, no `<mask>`/`<filter>`/`<clipPath>`/gradient
// referenced by id (`TraceCanvas.tsx:70-84`), no card, no border, no
// `border-radius`, no shadow (design.md "Layout": "no cards, no borders, no
// border-radius, no shadow").
import { useState, type CSSProperties } from 'react'
import {
  ANIMAL_ART,
  CLUE_ART,
  CULPRIT,
  type AnimalId,
  type ArtImage,
  type ClueKind,
} from '../detective/assets'
import PistasRail, { type PistasSlot } from '../detective/PistasRail'
import { BackIcon } from '../detective/icons'
import { LAYOUT_CSS } from './LevelPlay'

/** Matches the shipped ink `TraceCanvas.tsx:89` (`INK_COLOR '#1e293b'`, not
 * exported) — the same hand that draws the trail's own trace, the `PISTAS`
 * word and the icon controls. Re-declared here rather than imported, same
 * convention `palette.ts`/`PistasRail.tsx`/`icons.tsx` already use. */
const INK = '#1e293b'

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

/** Fixed lineup order — the same insertion order `assets.ts`'s `ANIMAL_ART`
 * uses, kept explicit here so the rendered order never depends on object-key
 * iteration order. */
const ANIMAL_ORDER: readonly AnimalId[] = ['gallina', 'pato', 'vaca', 'gato']

/** Accessible names only — never rendered as visible text (see module
 * comment). Spanish, matching the app's existing `aria-label` copy
 * (`LevelPlay.tsx`'s `aria-label="Acciones"`, its icon-control labels). */
const ANIMAL_LABEL: Readonly<Record<AnimalId, string>> = {
  gallina: 'Gallina',
  pato: 'Pato',
  vaca: 'Vaca',
  gato: 'Gato',
}

/** All four clue kinds, always rendered `filed: true` — reaching this screen
 * at all already requires every trail's clue to be filed (spec: "All four
 * clues collected reaches the deduction screen"), so there is no partial
 * state to represent, unlike `LevelPlay`'s single-trail slot (which only
 * ever knows its OWN trail while a run is in progress). */
const ALL_CLUE_KINDS: readonly ClueKind[] = ['droplet', 'corn', 'footprint', 'feather']
const FILED_SLOTS: readonly PistasSlot[] = ALL_CLUE_KINDS.map((kind) => ({ kind, filed: true }))

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
  /** The hen has been picked (spec scenario "Correct pick closes the case"). */
  closed: boolean
}

export function initialDeductionState(): DeductionState {
  return { dismissed: [], closed: false }
}

/**
 * D4 in full: picking the hen closes the case. Picking any other animal
 * costs nothing — no score, no lockout, no scolding — and dismisses that
 * animal so the case file reads as a real deduction narrowing down. Picking
 * an already-dismissed animal again, or picking anything once the case is
 * already closed, is an inert no-op (returns the SAME reference), which is
 * what makes "the child MUST be able to pick again immediately" trivially
 * true: there is no intermediate blocked state to wait out.
 */
export function pickAnimal(state: DeductionState, animal: AnimalId): DeductionState {
  if (state.closed) return state
  if (animal === CULPRIT) return { ...state, closed: true }
  if (state.dismissed.includes(animal)) return state
  return { ...state, dismissed: [...state.dismissed, animal] }
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
 * (design.md principle 1/2). */
function Animal({
  id,
  state,
  onPick,
}: {
  id: AnimalId
  state: DeductionState
  onPick: (animal: AnimalId) => void
}) {
  const dismissed = state.dismissed.includes(id)
  const ruledOutBy = ANIMAL_ART[id].ruledOutBy
  const style: CSSProperties = dismissed ? { opacity: 0.25, transform: 'translateY(24px)' } : {}
  return (
    <div className="cv-lineup-slot">
      <button
        type="button"
        className="animal-btn"
        style={style}
        aria-label={ANIMAL_LABEL[id]}
        disabled={state.closed}
        onClick={() => onPick(id)}
      >
        <svg viewBox="-20 -20 40 40" width={64} height={64} aria-hidden="true" focusable="false">
          <Art art={ANIMAL_ART[id].art} size={36} />
        </svg>
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
.cv-lineup { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.cv-lineup-figures { display: flex; flex-direction: row; align-items: flex-end; justify-content: center; gap: 40px; flex-wrap: wrap; }
.cv-lineup-slot { display: flex; flex-direction: column; align-items: center; gap: 4px; }
/* The shipped 64px tap floor (LevelPlay.tsx:140), reused by name and by
 * value — every animal choice is a real button, never smaller than a
 * child's tap target. */
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
.cv-lineup-ground { flex: 0 0 auto; max-width: 640px; margin-top: 8px; }
.pistas-rail { flex: 0 0 96px; display: flex; flex-direction: column; align-items: center; gap: 6px; }
.pistas-lamp-row { flex: 0 0 auto; }
.pistas-body { display: flex; flex-direction: row; gap: 6px; align-items: flex-start; }
/* The word is a single typeset run now, so it has nothing left to stack. */
.pistas-slots { display: flex; flex-direction: column; gap: 8px; padding-top: 4px; }
@media (max-height: 520px) {
  .cv-sheet { flex-direction: column; gap: 4px; }
  .pistas-rail { flex: 0 0 auto; flex-direction: row; gap: 10px; }
  .pistas-body { flex-direction: row; align-items: center; }

  .pistas-slots { flex-direction: row; padding-top: 0; gap: 6px; }
}
`

export interface DeductionViewProps {
  state: DeductionState
  onPick: (animal: AnimalId) => void
  onBack: () => void
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
export function DeductionView({ state, onPick, onBack }: DeductionViewProps) {
  return (
    <main className="cv-play">
      <style>{LAYOUT_CSS + DEDUCTION_CSS}</style>
      <header className="cv-head">
        <button type="button" onClick={onBack} className="cv-btn-back" aria-label="Volver">
          <BackIcon />
        </button>
      </header>
      <div className="cv-sheet">
        <div className="cv-lineup">
          <div className="cv-lineup-figures">
            {ANIMAL_ORDER.map((id) => (
              <Animal key={id} id={id} state={state} onPick={onPick} />
            ))}
          </div>
          <GroundLine />
        </div>
        <PistasRail slots={FILED_SLOTS} lampOn />
      </div>
    </main>
  )
}

export interface DeductionProps {
  onBack: () => void
}

export default function Deduction({ onBack }: DeductionProps) {
  const [state, setState] = useState<DeductionState>(initialDeductionState)
  return (
    <DeductionView
      state={state}
      onPick={(animal) => setState((s) => pickAnimal(s, animal))}
      onBack={onBack}
    />
  )
}
