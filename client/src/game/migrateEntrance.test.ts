// migrateEntrance — level-engine spec "migrateEntrance Copy-Forward
// Positional-Unlock Migration". Node-only, no DOM. Same shape as
// `migrateDuckCase.test.ts`/`migrateNivel3.test.ts`.
import { describe, expect, it } from 'vitest'
import { LevelProgressStore } from './LevelProgressStore'
import type { StorageLike } from './LevelProgressStore'
import { EMPTY_RECORD, APPROVALS_TO_UNLOCK } from './types'
import type { LevelRecord } from './types'
import { migrateEntrance, ENTRANCE_UNLOCK_ID, NIGHT_UNLOCK_ID } from './migrateEntrance'
import { nextAdventure, SECTORS } from '../zoo/sectors'

function makeRecord(over: Partial<LevelRecord> = {}): LevelRecord {
  return { ...EMPTY_RECORD, ...over }
}

function fakeStorage(): StorageLike {
  let value: string | null = null
  return {
    getItem: () => value,
    setItem: (_key, v) => {
      value = v
    },
  }
}

describe('migrateEntrance — a fresh install has nothing to migrate', () => {
  it('an empty payload yields no changes', () => {
    expect(migrateEntrance({})).toEqual({})
  })
})

describe('migrateEntrance — idempotent re-run', () => {
  it('a second run over the already-migrated store performs no write', () => {
    const before: Record<string, LevelRecord> = {
      'f1-libre': makeRecord({ approvals: APPROVALS_TO_UNLOCK, attempts: 3 }),
      'llama-peak4': makeRecord({ approvals: APPROVALS_TO_UNLOCK, attempts: 4 }),
    }

    const firstRun = migrateEntrance(before)
    expect(Object.keys(firstRun).sort()).toEqual([ENTRANCE_UNLOCK_ID, NIGHT_UNLOCK_ID].sort())

    const afterFirstRun = { ...before, ...firstRun }
    const secondRun = migrateEntrance(afterFirstRun)

    expect(secondRun).toEqual({})
  })
})

describe('migrateEntrance — sand4 seeds from any non-empty payload, even with no f1-libre record', () => {
  it('seeds sand4 with the APPROVALS_TO_UNLOCK floor when f1-libre was never played', () => {
    // `f1-libre` used to be `LEVELS[0]` and therefore unconditionally
    // reachable — a child can have progress elsewhere (e.g. test-mode) with
    // no `f1-libre` record at all. The condition being preserved is "the
    // child has been here before" (the store is non-empty), not "the child
    // passed f1-libre specifically."
    const before: Record<string, LevelRecord> = {
      'trail1': makeRecord({ approvals: 1, attempts: 2 }),
    }

    const changed = migrateEntrance(before)

    expect(changed[ENTRANCE_UNLOCK_ID]?.approvals).toBe(APPROVALS_TO_UNLOCK)
    expect(changed[ENTRANCE_UNLOCK_ID]?.attempts).toBe(0)
    expect(changed[NIGHT_UNLOCK_ID]).toBeUndefined()
  })

  it('field-wise MAXes/sums against a real f1-libre record when one exists', () => {
    const before: Record<string, LevelRecord> = {
      'f1-libre': makeRecord({
        approvals: 1,
        attempts: 5,
        bestAccuracy: 88,
        bestFluency: 70,
        streakPass: 2,
        widthFactor: 0.8,
      }),
    }

    const changed = migrateEntrance(before)

    // approvals floors at APPROVALS_TO_UNLOCK even though the source's own
    // approvals (1) is lower — the floor this migration exists to enforce.
    expect(changed[ENTRANCE_UNLOCK_ID]?.approvals).toBe(APPROVALS_TO_UNLOCK)
    expect(changed[ENTRANCE_UNLOCK_ID]?.attempts).toBe(5)
    expect(changed[ENTRANCE_UNLOCK_ID]?.bestAccuracy).toBe(88)
    expect(changed[ENTRANCE_UNLOCK_ID]?.bestFluency).toBe(70)
    expect(changed[ENTRANCE_UNLOCK_ID]?.widthFactor).toBe(1)
    expect(changed[ENTRANCE_UNLOCK_ID]?.streakFail).toBe(0)
  })
})

describe('migrateEntrance — night4 seeds only once llama-peak4 clears the threshold', () => {
  it('no llama-peak4 record at all yields no night4 seed', () => {
    const before: Record<string, LevelRecord> = { 'f1-libre': makeRecord({ approvals: 1 }) }
    expect(migrateEntrance(before)[NIGHT_UNLOCK_ID]).toBeUndefined()
  })

  it('llama-peak4 below APPROVALS_TO_UNLOCK yields no night4 seed', () => {
    const before: Record<string, LevelRecord> = {
      'llama-peak4': makeRecord({ approvals: APPROVALS_TO_UNLOCK - 1 }),
    }
    expect(migrateEntrance(before)[NIGHT_UNLOCK_ID]).toBeUndefined()
  })

  it('llama-peak4 at APPROVALS_TO_UNLOCK seeds night4, field-wise MAX/summed', () => {
    const before: Record<string, LevelRecord> = {
      'llama-peak4': makeRecord({
        approvals: APPROVALS_TO_UNLOCK,
        attempts: 6,
        bestAccuracy: 95,
        bestFluency: 90,
      }),
    }
    const changed = migrateEntrance(before)
    expect(changed[NIGHT_UNLOCK_ID]?.approvals).toBe(APPROVALS_TO_UNLOCK)
    expect(changed[NIGHT_UNLOCK_ID]?.attempts).toBe(6)
    expect(changed[NIGHT_UNLOCK_ID]?.bestAccuracy).toBe(95)
    expect(changed[NIGHT_UNLOCK_ID]?.bestFluency).toBe(90)
  })

  it('an existing night4 record blocks the seed even when llama-peak4 qualifies', () => {
    const before: Record<string, LevelRecord> = {
      'llama-peak4': makeRecord({ approvals: APPROVALS_TO_UNLOCK }),
      [NIGHT_UNLOCK_ID]: makeRecord({ approvals: 1 }),
    }
    expect(migrateEntrance(before)[NIGHT_UNLOCK_ID]).toBeUndefined()
  })
})

describe('migrateEntrance — never deletes, never mutates', () => {
  it('the source records are untouched after migration', () => {
    const before: Record<string, LevelRecord> = {
      'f1-libre': makeRecord({ approvals: 2, attempts: 3 }),
      'llama-peak4': makeRecord({ approvals: APPROVALS_TO_UNLOCK, attempts: 4 }),
    }
    const beforeSnapshot = structuredClone(before)

    migrateEntrance(before)

    expect(before).toEqual(beforeSnapshot)
  })

  it('produces no instruction that removes a record — only additive writes to sand4/night4', () => {
    const before: Record<string, LevelRecord> = {
      'f1-libre': makeRecord({ approvals: 2 }),
      'llama-peak4': makeRecord({ approvals: APPROVALS_TO_UNLOCK }),
      'trail1': makeRecord({ approvals: 1 }),
    }
    const changed = migrateEntrance(before)
    expect(Object.keys(changed).sort()).toEqual([ENTRANCE_UNLOCK_ID, NIGHT_UNLOCK_ID].sort())
    expect(changed['trail1']).toBeUndefined()
  })
})

describe('migrateEntrance — protects the real catalog\'s successor chains (design.md §8.1)', () => {
  it('keeps f1-libre unlocked for a mid-campaign payload with no entrance/night ids', () => {
    const storage = fakeStorage()
    const store = new LevelProgressStore(storage)
    // Any non-empty payload — the exact case the proposal's question 4
    // worried about.
    store.save('trail2', makeRecord({ approvals: 1 }))

    const changed = migrateEntrance(store.all())
    for (const [id, r] of Object.entries(changed)) store.save(id, r)

    // f1-libre's new positional predecessor is sand4 (design.md §8.1) —
    // checked against the REAL, post-Phase-4 catalog.
    expect(store.isUnlocked('f1-libre')).toBe(true)
  })

  it("keeps f2-guirnalda unlocked once llama-peak4 already met APPROVALS_TO_UNLOCK", () => {
    const storage = fakeStorage()
    const store = new LevelProgressStore(storage)
    store.save('llama-peak4', makeRecord({ approvals: APPROVALS_TO_UNLOCK }))

    const changed = migrateEntrance(store.all())
    for (const [id, r] of Object.entries(changed)) store.save(id, r)

    // f2-guirnalda's new positional predecessor is night4, and this is "the
    // level that used to follow llama-peak4" the spec scenario names —
    // checked against the REAL, post-Phase-4 catalog.
    expect(store.isUnlocked('f2-guirnalda')).toBe(true)
  })
})

describe('migrateEntrance — protects the pond, the real stake (design.md §8.1)', () => {
  // Phase 5's task 5.4 has now wired `zoo/sectors.ts`'s real `estanque.
  // unlockedWhen` to `isFiled(records, 'sand4')` (no longer `alwaysOpen`) —
  // this closes the forward reference the earlier apply run recorded
  // (`apply-progress.md`'s Phase 4 section) by asserting against the REAL
  // shipped sector row instead of a locally-built stand-in predicate.
  const estanque = SECTORS.find((s) => s.id === 'estanque')!

  it("a returning child who had the estanque still has it — the real stake amendment A4 protects", () => {
    // A4's own framing: without `migrateEntrance`, a returning child with
    // ANY prior progress loses the pond outright the instant this row
    // ships, because `estanque.unlockedWhen` stops ignoring `records`.
    // `sand4`'s migrated seed is what keeps it open.
    const before: Record<string, LevelRecord> = { 'trail3': makeRecord({ approvals: 1 }) }
    expect(estanque.unlockedWhen(before)).toBe(false) // true BEFORE migrating — the regression this exists to prevent
    const changed = migrateEntrance(before)
    const merged = { ...before, ...changed }

    expect(estanque.unlockedWhen(merged)).toBe(true)
  })

  it('a genuinely fresh install (no records at all) is not claimed open by this migration alone', () => {
    // Distinguishes "the migration ran and did nothing" from "the migration
    // opened it": on a fresh install `estanque.unlockedWhen` stays false
    // until sand4 is actually played, migration or not.
    const changed = migrateEntrance({})
    expect(changed).toEqual({})
    expect(estanque.unlockedWhen(changed)).toBe(false)
  })
})

describe('migrateEntrance — a returning child still reaches the entrance opening', () => {
  // Phase 5's task 5.4 has now wired the real `entrada.adventureIds =
  // [glass1..4, sand1..4]` — this closes the second forward reference the
  // earlier apply run recorded, asserting against the REAL shipped sector
  // row rather than a locally-built `ZooSector` stand-in.
  const entrada = SECTORS.find((s) => s.id === 'entrada')!

  it('nextAdventure resolves glass1 regardless of what was seeded', () => {
    const before: Record<string, LevelRecord> = { 'llama-peak4': makeRecord({ approvals: 1 }) }
    const changed = migrateEntrance(before)
    const merged = { ...before, ...changed }

    expect(nextAdventure(entrada, merged)).toBe('glass1')
  })
})
