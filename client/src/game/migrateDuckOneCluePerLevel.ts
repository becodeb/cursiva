// One-time copy-forward progress migration for the duck's one-clue-per-level
// split (`odd/tasks/prewriting-stage-completion.md` T40). Two new pistas
// levels, `duck-trail5` and `duck-trail6`, join the duck adventure between
// its old ones. The zoo routes through `isFiled` (`zoo/sectors.ts`), so
// without this migration a child who had already finished the duck's clues
// would find the duck adventure half-open again: the pond's resume
// (`nextAdventure`) would send them back to `duck-trail5`, and `isRescued
// ('pato')` (every level of the row filed) would turn false, taking the duck
// off the map.
//
// Under T29 those children already collected all four clues on
// `duck-trail1`/`duck-trail2`; the new levels only re-home two of them, so
// seeding both from `duck-trail2`'s record is honest, not a gift.
//
// Same three-part shape as `migrateNivel3.ts`: a declarative guard id and
// destination list, the same per-field merge policy (`seedFrom`), and a pure
// function returning only changed entries. Copy-forward only: never mutates
// or deletes an existing record.
import { EMPTY_RECORD } from './types'
import type { LevelRecord } from './types'

/** The last old pistas level: filed means every duck clue was collected. */
export const DUCK_SPLIT_SOURCE_ID = 'duck-trail2'

/** The two new pistas levels. MUST NOT include the source id (see
 *  `NIVEL3_TRAIL_IDS`'s own doc for the trap that would cause). */
export const DUCK_SPLIT_NEW_IDS: readonly string[] = ['duck-trail5', 'duck-trail6']

/** `migrateNivel3.ts`'s own `seedFrom`, for the same reasons: field-wise MAX
 *  on every forgiving field, `attempts` summed against zero, `streakFail`
 *  never carried. */
function seedFrom(source: LevelRecord): LevelRecord {
  return {
    bestAccuracy: Math.max(source.bestAccuracy, EMPTY_RECORD.bestAccuracy),
    bestFluency: Math.max(source.bestFluency, EMPTY_RECORD.bestFluency),
    attempts: source.attempts + EMPTY_RECORD.attempts,
    approvals: Math.max(source.approvals, EMPTY_RECORD.approvals),
    streakFail: EMPTY_RECORD.streakFail,
    streakPass: Math.max(source.streakPass, EMPTY_RECORD.streakPass),
    widthFactor: Math.max(source.widthFactor, EMPTY_RECORD.widthFactor),
    // 1.6: fresh, like streakFail above -- the destination level is a
    // DIFFERENT level from the source, so the source's own attempt-pace
    // timings do not describe it; never carried forward.
    durationsMs: EMPTY_RECORD.durationsMs,
  }
}

/**
 * PURE: never mutates `records`, never touches the source entry, returns
 * ONLY the entries it changed.
 *
 * Guard: `duck-trail2` is FILED (`approvals >= 1`), the zoo's own
 * `isFiled` threshold — the one this migration protects. Idempotent by
 * construction: once either new id has a record, it writes nothing.
 */
export function migrateDuckOneCluePerLevel(
  records: Readonly<Record<string, LevelRecord>>,
): Record<string, LevelRecord> {
  const source = records[DUCK_SPLIT_SOURCE_ID]
  if (!source || source.approvals < 1) return {}
  if (DUCK_SPLIT_NEW_IDS.some((id) => records[id])) return {}
  const changed: Record<string, LevelRecord> = {}
  for (const id of DUCK_SPLIT_NEW_IDS) changed[id] = seedFrom(source)
  return changed
}
