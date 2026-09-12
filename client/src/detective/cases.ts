// The case registry (design.md §1 "The case registry", detective-mode spec
// "Case Registry Data Shape"). A `DetectiveCase` derives its clue kinds from
// the catalog rather than restating them — `clueKindsOf` is the one lookup
// every other module (`palette.test.ts`, `caseState.railSlots`, `Deduction`)
// reads through, so the case and the levels it points at can never disagree.
import { getLevel } from '../levels/catalog'
import { DETECTIVE_TRAIL_IDS, DUCK_TRAIL_IDS } from '../game/types'
import type { AnimalId, ClueKind } from './assets'

export interface DetectiveCase {
  id: string
  culprit: AnimalId
  /** Lineup order, explicit so it never depends on key iteration order. */
  options: readonly AnimalId[]
  /** Which clue clears which animal — a fact about THIS case. */
  ruledOutBy: Readonly<Partial<Record<AnimalId, ClueKind>>>
  trailIds: readonly string[]
}

/** Ordered cases, duck first (design.md §1; the user's binding decision 3). */
export const DETECTIVE_CASES: readonly DetectiveCase[] = [
  {
    id: 'duck',
    culprit: 'pato',
    options: ['pato', 'vaca', 'gato'],
    ruledOutBy: { vaca: 'feather', gato: 'bubble' },
    trailIds: DUCK_TRAIL_IDS,
  },
  {
    id: 'hen',
    culprit: 'gallina',
    options: ['gallina', 'pato', 'vaca', 'gato'],
    ruledOutBy: { pato: 'footprint', vaca: 'feather', gato: 'corn' },
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
