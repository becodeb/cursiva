// The case registry (design.md §1 "The case registry", detective-mode spec
// "Case Registry Data Shape"). A `DetectiveCase` derives its clue kinds from
// the catalog rather than restating them — `clueKindsOf` is the one lookup
// every other module (`palette.test.ts`, `caseState.railSlots`, `Deduction`)
// reads through, so the case and the levels it points at can never disagree.
import { getLevel } from '../levels/catalog'
import { DETECTIVE_TRAIL_IDS } from '../game/types'
import type { AnimalId, ClueKind } from './assets'

export interface DetectiveCase {
  id: string
  culprit: AnimalId
  /** Lineup order, explicit so it never depends on key iteration order. */
  options: readonly AnimalId[]
  /** Which clue clears which animal — a fact about THIS case. */
  ruledOutBy: Readonly<Partial<Record<AnimalId, ClueKind>>>
  /**
   * Pulpito's own spoken line for a wrong pick (`odd/tasks/prewriting-stage-
   * completion.md` T21, `docs/19` §5.4: "la silueta da un pasito atrás y el
   * Pulpito dice por qué, con la pista que la descarta" — "El gato no tiene
   * plumas"). One per distractor, keyed the same way `ruledOutBy` is; the
   * culprit carries none, the same shape `ruledOutBy` already follows.
   */
  hint: Readonly<Partial<Record<AnimalId, string>>>
  /**
   * The trails whose OWN clues feed this case's rail and deduction (`getLevel
   * (id).clue`, `clueKindsOf` below) — NOT every level of the adventure that
   * carries the case. T21 (`docs/19` §2.3: "en una aventura A de cuatro
   * niveles: niveles 1–2 pistas... niveles 3–4 juntar") splits the duck's
   * four levels: `duck-trail1`/`duck-trail2` still carry a clue and feed
   * this list; `duck-trail3`/`duck-trail4` were repurposed to
   * `LevelConfig.collect` (the duck FAMILY, gathered after the case is
   * solved) and carry no clue at all, so they are deliberately absent here —
   * `game/types.ts`'s `DUCK_TRAIL_IDS` (all four, used only by
   * `migrateDuckCase.ts`'s POSITIONAL seeding, a different concern) is never
   * the right list for this field again.
   */
  trailIds: readonly string[]
}

/** Ordered cases, duck first (design.md §1; the user's binding decision 3). */
export const DETECTIVE_CASES: readonly DetectiveCase[] = [
  {
    id: 'duck',
    culprit: 'pato',
    options: ['pato', 'vaca', 'gato'],
    // [T21] `feather`/`droplet`, not the pre-T21 `feather`/`bubble`: `bubble`
    // is `docs/19` §3's own clue for the FISH case (burbuja/gota in the same
    // laguna), and reusing it here would let the same picture rule out a
    // different animal in two adjacent cases — confusing for a five-year-old
    // even though nothing here technically forbids it. `droplet` is the
    // duck's own "salió del agua chorreando" beat (`docs/19` §3, the pato
    // row's own flavour line) and a cat is exactly the animal that is never
    // dripping wet, so it reads as a real deduction rather than an arbitrary
    // rule. `webfoot` and `breadcrumb` stay unused by the duck case on
    // purpose — this repo's own invariant (`cases.test.ts`, "webfoot and
    // breadcrumb rule nobody out") already bans either from ever discriminating,
    // and `LevelConfig.clue` carries exactly one kind per level, so only two
    // of the four pato clue arts `docs/19` §3 lists can double as the CASE's
    // own two ruling clues within the two pistas levels the split leaves it
    // (`duck-trail1`/`duck-trail2`, below) — a follow-up could widen `clue`
    // to a mixed per-level array so a level can carry more than one kind at
    // once (`docs/19` §2.2's "mixed as §3 says" allows it), but that touches
    // the rail/case-registry contract for every OTHER case too and is left
    // for whoever picks up the fish/night/monkey cases next.
    ruledOutBy: { vaca: 'feather', gato: 'droplet' },
    hint: {
      vaca: 'La vaca no tiene plumas: no fue ella.',
      gato: 'El gato no vino mojado: no fue él.',
    },
    trailIds: ['duck-trail1', 'duck-trail2'],
  },
  {
    id: 'hen',
    culprit: 'gallina',
    options: ['gallina', 'pato', 'vaca', 'gato'],
    ruledOutBy: { pato: 'footprint', vaca: 'feather', gato: 'corn' },
    hint: {
      pato: 'El pato deja otra huella: la suya es palmeada.',
      vaca: 'La vaca no tiene plumas: no fue ella.',
      gato: 'El gato no come maíz: no fue él.',
    },
    trailIds: DETECTIVE_TRAIL_IDS,
  },
]

/** The case's clue kinds, in play order. Throws on a trail authored without a
 *  clue — the same failure `caseState.railSlots` already raises by name. */
export function clueKindsOf(kase: DetectiveCase): readonly ClueKind[] {
  return kase.trailIds.map((id) => {
    const clue = getLevel(id).clue
    if (!clue) throw new Error(`Rastro sin pista: ${id}`)
    return clue.kind
  })
}

/** The persisted pseudo-id that records "this case was solved" (D2). */
export function caseSolvedId(caseId: string): string {
  return `${caseId}-deduce`
}

export function caseOf(levelId: string): DetectiveCase | undefined {
  return DETECTIVE_CASES.find((k) => k.trailIds.includes(levelId))
}
