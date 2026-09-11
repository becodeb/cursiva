// One-time copy-forward progress migration for the phase-1 retheme
// (design.md "Migration / Rollout", level-engine spec "Level Progress
// Copy-Forward Migration"). `isUnlocked` is POSITIONAL
// (`LevelProgressStore.ts:123-129`: `LEVELS.findIndex`, then
// `LEVELS[index - 1]`), so replacing six phase-1 levels with four trails
// shifts every later level's position: without this migration, a child who
// had already passed `f1-travesia` would find trails 2-4 LOCKED on the next
// visit. That is decision D3 in proposal.md, the no-demotion rule, and it is
// why Phase 11 (removing the six configs) is hard-gated on this file landing
// first.
//
// Copy-forward only: the six removed ids' own records are NEVER deleted or
// mutated here, so the rollback plan (proposal.md "Rollback Plan") stays
// real — swapping `LEGACY_PHASE_1` back into `LEVELS` restores each child's
// exact prior state, migrated or not. `f1-ondas` and `f1-espiral` have no
// successor and are left as readable orphans, exactly like any other unknown
// id the store already tolerates without throwing
// (`LevelProgressStore.ts:75-77,93`).
import { EMPTY_RECORD, DETECTIVE_TRAIL_IDS } from './types'
import type { LevelRecord } from './types'

/**
 * Removed phase-1 level id → its replacement trail id, in unlock-chain
 * order (design.md "Migration / Rollout"). `f1-ondas` and `f1-espiral` are
 * omitted on purpose: they have no successor to seed.
 *
 * The four destination ids come from `DETECTIVE_TRAIL_IDS`
 * (`game/types.ts`) — the single source `screen/GameScreen.tsx` forward-
 * declared in S4 for exactly this reason — so S6 only ever has to change one
 * place if the real catalog trail ids end up different.
 */
export const PHASE_1_FORWARD: ReadonlyArray<readonly [string, string]> = [
  ['f1-travesia', DETECTIVE_TRAIL_IDS[0]],
  ['f1-pelotas', DETECTIVE_TRAIL_IDS[1]],
  ['f1-paseo', DETECTIVE_TRAIL_IDS[2]],
  ['f1-pasillo', DETECTIVE_TRAIL_IDS[3]],
]

/**
 * Depth-preserving copy-forward of a removed level's record onto a brand new
 * trail id. Only ever called (see `migratePhase1` below) when the trail has
 * NO record yet, so "the newer record" the design's merge rule speaks of is
 * `EMPTY_RECORD` — fresh, untouched:
 *
 * - `bestAccuracy`, `bestFluency`, `approvals`, `streakPass`, `widthFactor`:
 *   field-wise MAX against `EMPTY_RECORD`. Every one of these reads as "more
 *   forgiving when higher" (design.md: "wider is more forgiving, so max
 *   never punishes") — including `widthFactor`: `EMPTY_RECORD.widthFactor`
 *   is 1 (nominal), so a source record NARROWED by three clean passes
 *   (`widthFactor < 1`, `adaptiveTolerance.ts`) eases back to nominal on the
 *   new trail instead of starting a level the child has never even seen
 *   already harder than default.
 * - `attempts`: summed against `EMPTY_RECORD.attempts` (0) — i.e. exactly
 *   the source's own count. No double-count risk: this only ever runs once
 *   per pair (the caller's guard, not this function, enforces that).
 * - `streakFail`: kept from the "newer" record — the fresh trail's own (0),
 *   not carried over from the source. A consecutive-failure streak is
 *   scoped to one corridor's shape; carrying a stale streak from a REMOVED,
 *   differently-shaped level onto a brand-new trail would trigger an
 *   unearned widening on the very next miss, which is not what "no
 *   demotion" is asking for — it protects unlocks and mastery, not an old
 *   streak counter.
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
 * The migration itself. PURE: never mutates `records`, never touches a
 * removed id's own entry, and returns ONLY the entries that changed — the
 * caller (`GameScreen`'s store initialiser) writes just those back via
 * `LevelProgressStore.save`.
 *
 * Idempotent by construction, not by a stored flag: the guard below only
 * migrates a pair whose destination id has NO record yet (spec: "its
 * replacement trail id has no record yet"). Once a destination exists —
 * migrated by an earlier call, or genuinely played after the catalog swap —
 * the pair is skipped forever, so re-running performs no second write and
 * the source record is never touched, matching the spec's "MUST NOT run
 * more than once for the same removed→replacement pair". This is also what
 * makes calling it from a `useState` lazy initialiser under StrictMode's
 * dev-only double-invoke harmless.
 */
export function migratePhase1(
  records: Readonly<Record<string, LevelRecord>>,
): Record<string, LevelRecord> {
  const changed: Record<string, LevelRecord> = {}
  for (const [oldId, newId] of PHASE_1_FORWARD) {
    const source = records[oldId]
    if (!source) continue // nothing recorded on the removed id: nothing to carry forward
    if (records[newId]) continue // destination already has a record — never re-migrate
    changed[newId] = seedFrom(source)
  }
  return changed
}
