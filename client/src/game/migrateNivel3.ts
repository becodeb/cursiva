// One-time copy-forward progress migration for the Nivel 3 water-trail
// insertion (design.md §7 "client/src/game/migrateNivel3.ts", level-engine
// spec "Nivel 3 Positional-Unlock Migration"). `isUnlocked` is POSITIONAL
// (`LevelProgressStore.ts:123-129`: `LEVELS.findIndex`, then
// `LEVELS[index - 1]`), so inserting the three new water levels after
// `f2-guirnalda` shifts `f2-colinas`'s predecessor from `f2-guirnalda` to
// `f2-agua4`: without this migration, a child who already had
// `f2-guirnalda.approvals >= APPROVALS_TO_UNLOCK` would find `f2-colinas`
// LOCKED on the next visit. That is the no-demotion rule `migratePhase1.ts`
// exists by name to enforce, and it is why this migration must ship BEFORE
// the catalog insertion (Phase 2 before Phase 7, S2 before S7).
//
// Same three-part shape as `migrateDuckCase.ts`: a declarative table (here,
// just the guard id and the three destinations), a per-field merge policy
// (`seedFrom`, identical to `migrateDuckCase.ts`'s for the same reasons), and
// a pure function returning only changed entries. Copy-forward only: never
// mutates or deletes any existing record, including `f2-guirnalda`'s own
// entry, which is what keeps the rollback plan real.
import { EMPTY_RECORD, APPROVALS_TO_UNLOCK, NIVEL3_TRAIL_IDS } from './types'
import type { LevelRecord } from './types'

/**
 * The id whose approvals used to grant `f2-colinas` its positional unlock,
 * and which the three new water levels now sit between (design.md §7).
 */
export const NIVEL3_PREDECESSOR_ID = 'f2-guirnalda'

/**
 * Depth-preserving copy-forward of `f2-guirnalda`'s record onto a brand new
 * water-trail id. Only ever called when the destination has NO record yet, so
 * "the newer record" is `EMPTY_RECORD` — fresh, untouched. Identical policy
 * to `migrateDuckCase.ts`'s `seedFrom`, and for the same reasons: field-wise
 * MAX on every forgiving field, `attempts` summed against zero, `streakFail`
 * deliberately NOT carried (a consecutive-failure streak is scoped to one
 * corridor's shape, not a fact worth punishing a brand-new trail with).
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
 * `f2-guirnalda`'s own entry, and returns ONLY the entries it changed.
 *
 * Guard condition: `f2-guirnalda.approvals >= APPROVALS_TO_UNLOCK` — the
 * exact condition that used to grant `f2-colinas` its unlock, quoted rather
 * than re-decided, so the migration protects precisely the children who need
 * it and nobody else.
 *
 * `NIVEL3_TRAIL_IDS` is the THREE NEW ids and MUST NOT include
 * `f2-guirnalda` (see its own doc comment in `types.ts`): the source id is in
 * `records` by the first guard, so putting it in the destination set would
 * make the second guard true on the very first run and the migration would
 * never write anything.
 *
 * Idempotent by construction, not by a stored flag: the second guard is
 * "none of the three destinations has a record yet", and this function's own
 * writes create those records, so a second run returns `{}` and performs no
 * write. That is what makes calling it from `openProgressStore` — invoked
 * inside a `useState` lazy initialiser, double-invoked under StrictMode —
 * harmless.
 */
export function migrateNivel3(
  records: Readonly<Record<string, LevelRecord>>,
): Record<string, LevelRecord> {
  const source = records[NIVEL3_PREDECESSOR_ID]
  if (!source || source.approvals < APPROVALS_TO_UNLOCK) return {}
  if (NIVEL3_TRAIL_IDS.some((id) => records[id])) return {}
  const changed: Record<string, LevelRecord> = {}
  for (const id of NIVEL3_TRAIL_IDS) changed[id] = seedFrom(source)
  return changed
}
