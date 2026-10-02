// One-time copy-forward progress migration for the two new cases of T45
// (`odd/tasks/prewriting-stage-completion.md`; `docs/21` N5/N6). The sheep
// and the turtles each gain a pistas level IN FRONT of their old first level
// (`sheep-lana` before `sheep-hill1`, `turtle-huellas` before `turtle1`) and
// a deduction after it. The zoo routes through `isFiled` (`zoo/sectors.ts`),
// so without this migration a child who had already started either
// adventure would be sent back to the new first level, and one who had
// already rescued the sheep or the turtles would lose them from the map
// (`isRescued` wants every level of the row filed).
//
// Same shape as `migrateDuckOneCluePerLevel.ts` (T40): a declarative source
// and destination per case, the same per-field merge (`seedFrom`), a pure
// function returning only changed entries, copy-forward only. The case's
// `<case>-deduce` pseudo-record is seeded too, the way `migrateDuckCase.ts`
// seeds `duck-deduce`: a child already past the old first level never meets
// the new deduction gate, so leaving it unsolved would only ever surface as
// an unsolved case they cannot reach.
import { EMPTY_RECORD } from './types'
import type { LevelRecord } from './types'

export interface NewCaseSplit {
  /** The old first level of the adventure: filed means the child already
   *  started (or finished) it before the new level existed. */
  readonly sourceId: string
  /** The new pistas level, played before `sourceId`. */
  readonly newLevelId: string
  /** `detective/cases.ts`'s `caseSolvedId(caseId)`. */
  readonly solvedId: string
}

export const NEW_CASE_SPLITS: readonly NewCaseSplit[] = [
  { sourceId: 'sheep-hill1', newLevelId: 'sheep-lana', solvedId: 'sheep-deduce' },
  { sourceId: 'turtle1', newLevelId: 'turtle-huellas', solvedId: 'turtles-deduce' },
]

/** `migrateDuckOneCluePerLevel.ts`'s own `seedFrom`, for the same reasons. */
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

/**
 * PURE: never mutates `records`, never touches a source entry, returns ONLY
 * the entries it changed. Per case: guard on the source being FILED
 * (`approvals >= 1`, the zoo's own `isFiled`); idempotent because once the
 * new level or the solved record exists, that case writes nothing.
 */
export function migrateNewCases(records: Readonly<Record<string, LevelRecord>>): Record<string, LevelRecord> {
  const changed: Record<string, LevelRecord> = {}
  for (const { sourceId, newLevelId, solvedId } of NEW_CASE_SPLITS) {
    const source = records[sourceId]
    if (!source || source.approvals < 1) continue
    if (records[newLevelId] || records[solvedId]) continue
    changed[newLevelId] = seedFrom(source)
    changed[solvedId] = { ...EMPTY_RECORD, approvals: 1 }
  }
  return changed
}
