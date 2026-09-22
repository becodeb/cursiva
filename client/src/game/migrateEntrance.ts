// One-time copy-forward progress migration for the entrance and night sector
// insertion (design.md §8 "client/src/game/migrateEntrance.ts", level-engine
// spec "migrateEntrance Copy-Forward Positional-Unlock Migration"). `isUnlocked`
// is POSITIONAL (`LevelProgressStore.ts:123-129`: `LEVELS.findIndex`, then
// `LEVELS[index - 1]`), so inserting the eight entrance levels ahead of
// `f1-libre` and the four night levels ahead of `f2-guirnalda` shifts BOTH
// ids' predecessor: `f1-libre`'s, from nothing (it was `LEVELS[0]`) to
// `sand4`; `f2-guirnalda`'s, from `llama-peak4` to `night4`. Without this
// migration a returning child would find `f1-libre` and `f2-guirnalda`
// LOCKED on the next visit — the same no-demotion rule every other insertion
// migration in this file exists to enforce.
//
// The REAL stake is NOT the dev-only `LevelMap` display (design.md §8.1,
// ratified amendment A4, retires the proposal's question 4 dilemma): it is
// `estanque.unlockedWhen`, which stops being `alwaysOpen` in this change and
// reads `isFiled(records, 'sand4')` instead (`zoo-map` capability, wired in
// Phase 5; widened to `isFiled(records, 'sand3') || isFiled(records,
// 'sand4')` by adventure-flow-and-map-guidance T1, which narrowed the
// sendero to its own `sand3` level — the OR keeps this exact seed valid).
// Seeding `sand4` is what keeps a returning child's POND open, not
// merely their dev-map display unlocked — losing the pond is a far worse
// regression than a dev-only display, which is why this migration is not
// optional. The zoo map itself never asks `isUnlocked` — it routes through
// `nextAdventure`/`isFiled`, which resolves `glass1` for `entrada` regardless
// of what this migration seeds, so "keep every unlock" and "see the opening"
// are not in tension (design.md §8.1).
//
// Same three-part shape as `migrateDuckCase.ts`/`migrateNivel3.ts`: a
// declarative pair of guard ids, a per-field merge policy (`seedFrom`), and a
// pure function returning only changed entries. Copy-forward only: never
// mutates or deletes any existing record, which is what keeps the rollback
// plan real.
import { EMPTY_RECORD, APPROVALS_TO_UNLOCK } from './types'
import type { LevelRecord } from './types'

/** `f1-libre`'s new positional predecessor (design.md §8.1). */
export const ENTRANCE_UNLOCK_ID = 'sand4'
/** `f2-guirnalda`'s new positional predecessor (design.md §8.1). */
export const NIGHT_UNLOCK_ID = 'night4'

const ENTRANCE_LEVEL_IDS = [
  'glass1',
  'glass2',
  'sand1',
  'sand2',
  'glass3',
  'glass4',
  'sand3',
  ENTRANCE_UNLOCK_ID,
] as const

/**
 * Depth-preserving copy-forward onto a brand new destination id. Unlike
 * `migrateDuckCase.ts`'s/`migrateNivel3.ts`'s `seedFrom`, the SOURCE here can
 * be `undefined`: `f1-libre` used to be `LEVELS[0]` and therefore
 * UNCONDITIONALLY reachable (`LevelProgressStore.ts:127`), so there is no
 * predecessor approval count to quote — the condition being preserved is "the
 * child has been here before" (the store is non-empty), not "the child
 * passed a specific level." A copy-forward of a ZERO approval count would
 * demote exactly the child this migration exists for, so `approvals` carries
 * an `APPROVALS_TO_UNLOCK` FLOOR rather than a plain max against a source
 * that may not exist.
 */
function seedFrom(source: LevelRecord | undefined): LevelRecord {
  return {
    bestAccuracy: Math.max(source?.bestAccuracy ?? 0, EMPTY_RECORD.bestAccuracy),
    bestFluency: Math.max(source?.bestFluency ?? 0, EMPTY_RECORD.bestFluency),
    attempts: (source?.attempts ?? 0) + EMPTY_RECORD.attempts,
    approvals: Math.max(source?.approvals ?? 0, APPROVALS_TO_UNLOCK),
    streakFail: EMPTY_RECORD.streakFail,
    streakPass: Math.max(source?.streakPass ?? 0, EMPTY_RECORD.streakPass),
    widthFactor: Math.max(source?.widthFactor ?? 0, EMPTY_RECORD.widthFactor),
  }
}

/**
 * The migration itself. PURE: never mutates `records`, never touches
 * `f1-libre`'s or `llama-peak4`'s own entries, and returns ONLY the entries
 * it changed.
 *
 * `sand4`'s guard is "the store is non-empty, no entrance level has already
 * been recorded, and `sand4` has no record yet" — a fresh install or a child
 * who has started the new glass/sand entrance has nothing to copy forward,
 * while a pre-entrance legacy payload still keeps the pond. `night4`'s guard
 * quotes the exact condition that used to grant `f2-guirnalda` its unlock
 * (`llama-peak4.approvals >= APPROVALS_TO_UNLOCK`), the same discipline
 * `migrateNivel3.ts` uses rather than re-deciding it.
 *
 * Idempotent by construction, not by a stored flag: each guard's second half
 * is "the destination has no record yet," and this function's own writes
 * create those records, so a second run returns `{}` and performs no write —
 * harmless under a `useState` lazy initialiser double-invoked by StrictMode.
 */
export function migrateEntrance(
  records: Readonly<Record<string, LevelRecord>>,
): Record<string, LevelRecord> {
  const changed: Record<string, LevelRecord> = {}
  const hasEntranceProgress = ENTRANCE_LEVEL_IDS.some((id) => records[id])
  if (
    Object.keys(records).length > 0 &&
    !hasEntranceProgress &&
    !records[ENTRANCE_UNLOCK_ID]
  ) {
    changed[ENTRANCE_UNLOCK_ID] = seedFrom(records['f1-libre'])
  }
  const nightSource = records['llama-peak4']
  if (nightSource && nightSource.approvals >= APPROVALS_TO_UNLOCK && !records[NIGHT_UNLOCK_ID]) {
    changed[NIGHT_UNLOCK_ID] = seedFrom(nightSource)
  }
  return changed
}
