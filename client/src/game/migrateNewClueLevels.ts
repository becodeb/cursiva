// One-time copy-forward progress migration for T44's new clue levels
// (`docs/21` N2-N4, `odd/tasks/prewriting-stage-completion.md` T44). Three
// pistas levels join existing cases right before their deduction:
// `night-rastro` (night), `f2-buceo` (fish) and `monkey-lianas` (monkeys).
// The zoo routes through `isFiled` (`zoo/sectors.ts`), so without this a
// child who had already solved one of these cases would find its adventure
// half-open again: the resume (`nextAdventure`) would send them back to the
// new level, and `isRescued` (every level of the row filed) would turn false
// for the fish and the monkeys, taking them off the map.
//
// Guard: the case's own deduction is solved (`caseSolvedId`, `-deduce`)
// AND its old last pistas level is filed. A child who filed the old clues
// but has not solved the case yet is NOT seeded: the new level now stands
// between them and the deduction, which is where it belongs, and nothing
// they earned is lost by playing it.
//
// Same shape as `migrateDuckOneCluePerLevel.ts`: a declarative table, the
// same per-field merge policy (`seedFrom`), and a pure function returning
// only changed entries. Copy-forward only: never mutates or deletes an
// existing record, and a destination that already has a record is left
// alone, so it is idempotent.
import { EMPTY_RECORD } from './types'
import type { LevelRecord } from './types'

/** Each new level, the case it belongs to and the old last pistas level it
 *  is seeded from. Sources and destinations never overlap. */
export const NEW_CLUE_LEVEL_SEEDS: readonly { readonly id: string; readonly caseId: string; readonly sourceId: string }[] = [
  { id: 'night-rastro', caseId: 'night', sourceId: 'night3' },
  { id: 'f2-buceo', caseId: 'fish', sourceId: 'f2-agua2' },
  { id: 'monkey-lianas', caseId: 'monkeys', sourceId: 'monkey2' },
]

/** `migrateNivel3.ts`'s own `seedFrom`: field-wise MAX on every forgiving
 *  field, `attempts` summed against zero, `streakFail` never carried. */
function seedFrom(source: LevelRecord): LevelRecord {
  return {
    bestAccuracy: Math.max(source.bestAccuracy, EMPTY_RECORD.bestAccuracy),
    bestFluency: Math.max(source.bestFluency, EMPTY_RECORD.bestFluency),
    attempts: source.attempts + EMPTY_RECORD.attempts,
    approvals: Math.max(source.approvals, EMPTY_RECORD.approvals),
    streakFail: EMPTY_RECORD.streakFail,
    streakPass: Math.max(source.streakPass, EMPTY_RECORD.streakPass),
    widthFactor: Math.max(source.widthFactor, EMPTY_RECORD.widthFactor),
  }
}

/** PURE: never mutates `records`, returns ONLY the entries it adds. The
 *  `-deduce` id is spelled here rather than imported from
 *  `detective/cases.ts` (`caseSolvedId`), which pulls in the whole catalog;
 *  `migrateNewClueLevels.test.ts` holds the two equal. */
export function migrateNewClueLevels(records: Readonly<Record<string, LevelRecord>>): Record<string, LevelRecord> {
  const changed: Record<string, LevelRecord> = {}
  for (const { id, caseId, sourceId } of NEW_CLUE_LEVEL_SEEDS) {
    if (records[id]) continue
    const source = records[sourceId]
    const solved = records[`${caseId}-deduce`]
    if (!source || source.approvals < 1 || !solved || solved.approvals < 1) continue
    changed[id] = seedFrom(source)
  }
  return changed
}
