// The in-trail adventure progress bar (adventure-flow-and-map-guidance T6,
// docs/18 §4.3-§4.4). This REPLACES the old PISTAS rail's ROLE inside
// LevelPlay — `PistasRail.tsx` itself is left UNTOUCHED: it still renders the
// hen's own four-clue case summary on the deduction screen (`Deduction.tsx`),
// a genuinely different, pre-existing feature this change does not reach
// (`Deduction.tsx` builds its `PistasSlot[]` from `clueKindsOf(kase)`, which
// has no `zoo/adventures.ts` row behind it at all). This component answers a
// narrower, different question: "how far along THIS animal's adventure am I,
// on the level itself, right now?"
//
// docs/18 §4.4's own words: a clue is "algo que el animal dejó al pasar" —
// something the animal left behind, collected at the end of each tramo — and
// the bar shows what has been found plus, at the end, the silhouette of the
// animal being searched for. No visible word, no lamp (D19: "PISTAS" reads as
// an abstract word and the light bulb means "idea", neither says WHO or WHY
// the child is tracing at all).
//
// It lives centred in the `.cv-head` row now, not in its own row above the
// sheet — the same move `LevelPlay.tsx` already made for the enclosure sign
// (T5), for the same measured reason (T3/T5's own lesson): an extra row in
// the flex column costs `.cv-sheet` real height, ~84px measured for the sign
// alone. `LevelPlay.tsx`'s `LAYOUT_CSS` still owns the CSS class names this
// component reuses VERBATIM from the old rail (`pistas-bar`, `pistas-slot-
// shell`, `pistas-slot`, `pistas-flight` and its three keyframes) — reusing
// them, rather than inventing new ones, is what "keeps the existing flight
// animation" means: the animation is a property of the CSS class, not of the
// old component, so this component's markup inherits it for free by
// targeting the same class names. `pistas-bar` staying the root class is
// also what keeps the caption licence (`detective/captionAudit.ts`'s
// `CAPTION_CONTAINERS`) satisfied with no change to that registry.
import { useRef } from 'react'
import { CLUE_ART, ZOO_ANIMAL_ART, ZOO_STAR_ART, type ZooAnimalId } from './assets'
import { CLUE_DRAINED } from './palette'
import type { AdventureProgress, AdventureProgressSlot } from '../zoo/progress'

/** Matches `Pillar`'s own star glyph colour (`LevelPlay.tsx`) — the same
 *  "earned" gold everywhere else in this app already draws a star with,
 *  rather than inventing a second gold. */
const STAR_COLOR = '#eab308'

/** Rendered height of a slot's socket, and of the drained/earned mark inside
 *  it — the DEFAULT for an unconstrained (rare, >820px-tall) viewport.
 *  `LevelPlay.tsx`'s `LAYOUT_CSS` overrides both under its existing
 *  `max-height` queries, the same division of labour the enclosure sign
 *  (T5) and the old rail both already used: JS supplies an intrinsic
 *  default, CSS supplies the responsive number that actually ships. */
const SLOT_SIZE = 40
const MARK_HEIGHT = 18

/** Rendered height of the animal end-cap at the same default breakpoint. A
 *  little taller than a slot on purpose — the encounter is the bar's own
 *  payoff, not one more collectible among equals. */
const ANIMAL_HEIGHT = 46

/** Spanish names for the seven animals a real `ADVENTURES` row can name
 *  (`zoo/adventures.ts`) — voseo-neutral, third person, matching the
 *  register the registry's own `intro`/`closing` lines already use. Partial
 *  on purpose: `ZooAnimalId` also carries the deduction screen's own
 *  `gallina`/`vaca`/`gato`, which no adventure with a multi-level row ever
 *  names, so `adventureProgress` can never actually hand this a key outside
 *  the seven below — the `?? 'el animal'` fallback exists only so a future
 *  animal added to a row here does not lose its accessible name entirely
 *  before someone adds it here too. */
const ANIMAL_NAME: Readonly<Partial<Record<ZooAnimalId, string>>> = {
  pato: 'el pato',
  oveja: 'las ovejas',
  llama: 'la llama',
  vibora: 'las víboras',
  abeja: 'la abeja',
  delfin: 'los delfines',
  erizo: 'el erizo',
}

/** "Camino hacia el pato: 1 de 4" — one accessible name for the WHOLE bar
 *  (see the root's own `role="img"` below for why this is one name and not
 *  four). Counts FILED slots, not the current position: "1 de 4" answers
 *  "how many have I found", the same number the visible sockets show. An
 *  animal-less adventure (night) drops the "hacia X" clause rather than
 *  guessing a name that does not exist. */
export function accessibleTrailName(progress: AdventureProgress): string {
  const filedCount = progress.slots.filter((slot) => slot.filed).length
  const total = progress.slots.length
  const toward = progress.animal ? ` hacia ${ANIMAL_NAME[progress.animal] ?? 'el animal'}` : ''
  return `Camino${toward}: ${filedCount} de ${total}`
}

/**
 * One level's own slot. A level WITH a clue shows its drained/earned clue
 * art, exactly the old rail's own socket contract; a level with NO clue yet
 * (docs/18 §4.4: "mientras no haya arte, la barra usa una estrella") shows
 * the star ONLY once filed — an unfiled clue-less slot is an EMPTY socket,
 * never a dim placeholder star claiming a reward not yet earned.
 *
 * `justFiled` — not `slot.filed` alone — gates the flight affordance: see
 * `TrailProgressBar`'s own header for why a slot already filed when this bar
 * first mounted must never replay it.
 */
function Slot({ slot, justFiled }: { slot: AdventureProgressSlot; justFiled: boolean }) {
  const cluePair = slot.clue ? CLUE_ART[slot.clue] : undefined
  const art = cluePair ? (slot.filed ? cluePair.art.earned : cluePair.art.drained) : slot.filed ? ZOO_STAR_ART : undefined
  const color = cluePair ? (slot.filed ? cluePair.earned : CLUE_DRAINED) : slot.filed ? STAR_COLOR : CLUE_DRAINED
  const markWidth = art ? (MARK_HEIGHT * art.w) / art.h : 0
  const accessibleSlotName = slot.clue
    ? slot.filed
      ? 'Pista guardada'
      : 'Pista pendiente'
    : slot.filed
      ? 'Tramo conseguido'
      : 'Tramo pendiente'
  return (
    <span
      className={`pistas-slot-shell${slot.filed ? ' pistas-slot-shell-filed' : ''}${slot.current ? ' pistas-slot-shell-current' : ''}`}
      data-filed={slot.filed ? 'true' : 'false'}
      data-current={slot.current ? 'true' : 'false'}
    >
      {justFiled && art && (
        <img
          className="pistas-flight"
          src={art.href}
          width={markWidth}
          height={MARK_HEIGHT}
          alt=""
          aria-hidden="true"
        />
      )}
      <svg
        className="pistas-slot"
        viewBox="0 0 24 24"
        width={SLOT_SIZE}
        height={SLOT_SIZE}
        role="img"
        aria-label={accessibleSlotName}
        focusable="false"
      >
        <rect
          x={1}
          y={1}
          width={22}
          height={22}
          rx={5}
          fill={slot.filed ? 'rgba(255,255,255,0.88)' : 'rgba(255,255,255,0.48)'}
          stroke={color}
          strokeWidth={slot.filed ? 2.6 : 1.5}
        />
        {art && (
          <image
            href={art.href}
            x={12 - markWidth / 2}
            y={12 - MARK_HEIGHT / 2}
            width={markWidth}
            height={MARK_HEIGHT}
            preserveAspectRatio="xMidYMid meet"
          />
        )}
      </svg>
    </span>
  )
}

/**
 * The animal being searched for, at the end of the bar — the encounter this
 * whole trail is walking toward (docs/18 §4.3, "Encuentro"). Absent for an
 * animal-less adventure (night): there is no icon fallback here, by design
 * (see `AdventureProgress.animal`'s own doc in `zoo/progress.ts`).
 *
 * A dark silhouette until `rescued`, then in colour — `filter: brightness(0)`
 * plus a reduced opacity on a plain `<img>`, never an SVG `url(#…)` filter
 * (`TraceCanvas.tsx`'s header ban: a referenced def hydrates blank on a real
 * device this repo has scarred comments about; a CSS `filter` on an HTML
 * `<img>` resolves entirely client-side with no `<defs>` to hydrate).
 */
function AnimalEndCap({ progress }: { progress: AdventureProgress }) {
  if (!progress.animal) return null
  const art = ZOO_ANIMAL_ART[progress.animal]
  const width = (ANIMAL_HEIGHT * art.w) / art.h
  return (
    <span className={`pistas-animal${progress.rescued ? ' pistas-animal-rescued' : ''}`}>
      <img src={art.href} width={width} height={ANIMAL_HEIGHT} alt="" aria-hidden="true" />
    </span>
  )
}

export interface TrailProgressBarProps {
  progress: AdventureProgress
}

/**
 * `role="img"` on the ROOT, one `aria-label` for the whole bar, rather than
 * `role="group"` exposing all four-to-eight slots' own individual names —
 * the same choice this app already makes at smaller scale (`Slot`'s own
 * `<svg role="img">` collapses one socket to one name instead of narrating
 * its rect/image separately). A pre-reader is the one audience `docs/18`
 * writes this whole redesign for; one short spoken sentence ("Camino hacia
 * el pato: 1 de 4") serves that audience better than an assistive-tech user
 * being read four-to-eight separate slot names in a row.
 */
export default function TrailProgressBar({ progress }: TrailProgressBarProps) {
  // Baseline captured ONCE at mount: which slots were ALREADY filed the
  // first time this bar appeared. Only a slot that transitions false -> true
  // AFTER that baseline should ever fly (`Slot`'s `justFiled`) — otherwise
  // resuming an adventure mid-way would replay the "flying home" animation
  // for every already-earned clue at once, because a freshly MOUNTED DOM
  // node with a running CSS animation plays it immediately regardless of
  // whether it is new because of a real event or merely because the SCREEN
  // is (this file's own restatement of T3/T5's mount-triggers-animation
  // lesson, applied to `pistas-flight` instead of `cv-next-ready`). This is
  // never stale across a level change: `GameScreen` keys `LevelPlay` — and
  // therefore this whole subtree — on the level id, so a genuinely new
  // level (a fresh adventure position) always remounts this bar and
  // recaptures a fresh baseline. Only the CURRENT slot can ever actually
  // transition during one mount's lifetime (every other slot's own record
  // is untouched while a DIFFERENT level is being played), so this
  // mechanism ends up scoping the flight to the current slot by
  // construction, without needing to hardcode that rule here.
  const initiallyFiledRef = useRef(progress.slots.map((slot) => slot.filed))
  return (
    <div className="pistas-bar" role="img" aria-label={accessibleTrailName(progress)}>
      <div className="pistas-slots">
        {progress.slots.map((slot, i) => (
          <Slot key={slot.levelId} slot={slot} justFiled={slot.filed && !initiallyFiledRef.current[i]} />
        ))}
      </div>
      <AnimalEndCap progress={progress} />
    </div>
  )
}
