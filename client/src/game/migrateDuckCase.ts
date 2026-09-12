// One-time copy-forward progress migration for the duck case insertion
// (design.md §6 "client/src/game/migrateDuckCase.ts", level-engine spec
// "Duck Case Positional-Unlock Migration"). `isUnlocked` is POSITIONAL
// (`LevelProgressStore.ts:123-129`: `LEVELS.findIndex`, then
// `LEVELS[index - 1]`), so inserting the four duck trails before `trail1`
// shifts `trail1`'s predecessor from `f1-libre` to `duck-trail4`: without
// this migration, a child who already had `f1-libre.approvals >=
// APPROVALS_TO_UNLOCK` would find `trail1..trail4` LOCKED on the next visit.
// That is the no-demotion rule design.md §6 states by name, and it is why
// this migration must ship BEFORE the catalog insertion (Phase 1 before
// Phase 2, S1 before S2).
//
// Same three-part shape as `migratePhase1.ts`: a declarative table (here,
// just the guard id and the four destinations), a per-field merge policy
// (`seedFrom`, identical to `migratePhase1.ts`'s for the same reasons), and
// a pure function returning only changed entries. Copy-forward only: never
// mutates or deletes any existing record, including `f1-libre`'s own entry,
// which is what keeps the rollback plan real.
import { EMPTY_RECORD, APPROVALS_TO_UNLOCK, DUCK_TRAIL_IDS, DUCK_CASE_SOLVED_ID } from './types'
import type { LevelRecord } from './types'

/**
 * The id whose approvals used to grant `trail1` its positional unlock, and
 * which the four duck trails now sit between (design.md §6).
 */
export const DUCK_PREDECESSOR_ID = 'f1-libre'

/**
 * Depth-preserving copy-forward of `f1-libre`'s record onto a brand new duck
 * trail id. Only ever called when the destination has NO record yet, so
 * "the newer record" is `EMPTY_RECORD` — fresh, untouched. Identical policy
 * to `migratePhase1.ts`'s `seedFrom`, and for the same reasons: field-wise
 * MAX on every forgiving field, `attempts` summed against zero,
 * `streakFail` deliberately NOT carried (a consecutive-failure streak is
 * scoped to one corridor's shape, not a fact worth punishing a brand-new
 * trail with).
 */
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
 * The migration itself. PURE: never mutates `records`, never touches
 * `f1-libre`'s own entry, and returns ONLY the entries it changed.
 *
 * Guard condition: `f1-libre.approvals >= APPROVALS_TO_UNLOCK` — the exact
 * condition that used to grant `trail1` its unlock, quoted rather than
 * re-decided, so the migration protects precisely the children who need it
 * and nobody else. Nothing earned before the insertion means there is no
 * unlock to protect, and the child meets the duck case normally — the
 * branch that keeps the migration invisible to every new player.
 *
 * Idempotent by construction, not by a stored flag: the second guard is "none
 * of the four duck trail ids OR `DUCK_CASE_SOLVED_ID` has a record yet", and
 * this function's own writes create those records, so a second run returns
 * `{}` and performs no write. That is what makes calling it from
 * `openProgressStore` — invoked inside a `useState` lazy initialiser,
 * double-invoked under StrictMode — harmless.
 *
 * [level-engine spec "Duck Case Positional-Unlock Migration", corrected
 * 2026-09-12 — see design.md §6 and apply-progress.md for the full
 * reasoning] Seeds `DUCK_CASE_SOLVED_ID` too, not only the four trails. Once
 * routing is per-case (Phase 6, `home/caseState.ts`'s `activeCase`), a case
 * is resolved when its trails are filed AND its deduction is solved. A
 * migrated child's `f1-libre` approvals predate the duck case entirely — they
 * never played it and never will have a real verdict to file — so leaving
 * `duck-deduce` unseeded would route that child straight into the duck
 * DEDUCTION, asking them to solve a case whose trails they never walked. That
 * is strictly worse than the cost this migration already accepts (never
 * meeting the duck case at all, D4): being asked a question with no evidence
 * on file, rather than being skipped past a case that came in after the
 * child had already left phase 1 behind. Seeded as `{ ...EMPTY_RECORD,
 * approvals: 1 }` — the exact literal shape `GameScreen`'s real writer uses
 * (design.md §5, spec "Case-Solved Persistence") — never `seedFrom(source)`:
 * a deduction record carries no accuracy/fluency of its own to copy forward.
 */
export function migrateDuckCase(
  records: Readonly<Record<string, LevelRecord>>,
): Record<string, LevelRecord> {
  const source = records[DUCK_PREDECESSOR_ID]
  if (!source || source.approvals < APPROVALS_TO_UNLOCK) return {}
  if ([...DUCK_TRAIL_IDS, DUCK_CASE_SOLVED_ID].some((id) => records[id])) return {}
  const changed: Record<string, LevelRecord> = {}
  for (const id of DUCK_TRAIL_IDS) changed[id] = seedFrom(source)
  changed[DUCK_CASE_SOLVED_ID] = { ...EMPTY_RECORD, approvals: 1 }
  return changed
}
