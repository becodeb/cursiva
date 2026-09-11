// migrateDuckCase — level-engine spec "Duck Case Positional-Unlock
// Migration". Node-only, no DOM. Same shape as `migratePhase1.test.ts`.
import { describe, expect, it } from 'vitest'
import { EMPTY_RECORD, APPROVALS_TO_UNLOCK, DUCK_TRAIL_IDS } from './types'
import type { LevelRecord } from './types'
import { migrateDuckCase, DUCK_PREDECESSOR_ID } from './migrateDuckCase'

function makeRecord(over: Partial<LevelRecord> = {}): LevelRecord {
  return { ...EMPTY_RECORD, ...over }
}

describe('migrateDuckCase — idempotent re-run', () => {
  it('a second run over the already-migrated store performs no write', () => {
    const before: Record<string, LevelRecord> = {
      [DUCK_PREDECESSOR_ID]: makeRecord({ approvals: APPROVALS_TO_UNLOCK, attempts: 4 }),
    }

    const firstRun = migrateDuckCase(before)
    expect(Object.keys(firstRun)).toEqual(DUCK_TRAIL_IDS.slice())

    const afterFirstRun: Record<string, LevelRecord> = { ...before, ...firstRun }
    const secondRun = migrateDuckCase(afterFirstRun)

    expect(secondRun).toEqual({})
  })
})

describe('migrateDuckCase — no write below the approval threshold', () => {
  it('f1-libre below APPROVALS_TO_UNLOCK yields no changes', () => {
    const before: Record<string, LevelRecord> = {
      [DUCK_PREDECESSOR_ID]: makeRecord({ approvals: APPROVALS_TO_UNLOCK - 1, attempts: 3 }),
    }

    expect(migrateDuckCase(before)).toEqual({})
  })

  it('no f1-libre record at all yields no changes', () => {
    expect(migrateDuckCase({})).toEqual({})
  })
})

describe('migrateDuckCase — no write when any duck id has a record', () => {
  it('a single existing duck record blocks the whole seed', () => {
    const before: Record<string, LevelRecord> = {
      [DUCK_PREDECESSOR_ID]: makeRecord({ approvals: APPROVALS_TO_UNLOCK, attempts: 5 }),
      [DUCK_TRAIL_IDS[2]]: makeRecord({ approvals: 1, attempts: 1 }),
    }

    expect(migrateDuckCase(before)).toEqual({})
  })
})

describe('migrateDuckCase — never deletes, never mutates', () => {
  it('the source record is untouched after migration', () => {
    const before: Record<string, LevelRecord> = {
      [DUCK_PREDECESSOR_ID]: makeRecord({
        approvals: APPROVALS_TO_UNLOCK,
        attempts: 6,
        bestAccuracy: 88,
        bestFluency: 77,
        streakPass: 2,
        widthFactor: 0.9,
      }),
    }
    const beforeSnapshot = structuredClone(before)

    migrateDuckCase(before)

    expect(before).toEqual(beforeSnapshot)
  })

  it('produces no instruction that removes a record — only additive writes to the four duck ids', () => {
    const before: Record<string, LevelRecord> = {
      [DUCK_PREDECESSOR_ID]: makeRecord({ approvals: APPROVALS_TO_UNLOCK, attempts: 2 }),
      'trail1': makeRecord({ approvals: 1, attempts: 1 }),
    }

    const changed = migrateDuckCase(before)

    expect(Object.keys(changed).sort()).toEqual(DUCK_TRAIL_IDS.slice().sort())
    expect(changed.trail1).toBeUndefined()
  })
})

describe('migrateDuckCase — a mid-hen-campaign payload keeps every unlock', () => {
  it('seeds all four duck ids from f1-libre without touching the hen trails', () => {
    const before: Record<string, LevelRecord> = {
      [DUCK_PREDECESSOR_ID]: makeRecord({
        approvals: APPROVALS_TO_UNLOCK,
        attempts: 5,
        bestAccuracy: 95,
        bestFluency: 90,
        streakPass: 2,
        widthFactor: 0.85,
      }),
      trail1: makeRecord({ approvals: 2, attempts: 3 }),
      trail2: makeRecord({ approvals: 2, attempts: 4 }),
      trail3: makeRecord({ approvals: 1, attempts: 2 }),
    }
    const beforeSnapshot = structuredClone(before)

    const changed = migrateDuckCase(before)

    // Every duck id gets a seeded record, field-wise MAX/summed exactly like
    // migratePhase1's seedFrom.
    for (const id of DUCK_TRAIL_IDS) {
      expect(changed[id]?.approvals).toBe(APPROVALS_TO_UNLOCK)
      expect(changed[id]?.attempts).toBe(5)
      expect(changed[id]?.bestAccuracy).toBe(95)
      expect(changed[id]?.bestFluency).toBe(90)
      // widthFactor is field-wise MAX against EMPTY_RECORD's nominal 1.
      expect(changed[id]?.widthFactor).toBe(1)
      // streakFail is NOT carried — the fresh trail's own (0).
      expect(changed[id]?.streakFail).toBe(0)
    }

    // The hen's own trail records are untouched — this migration never
    // mutates anything outside the four duck ids.
    expect(changed.trail1).toBeUndefined()
    expect(changed.trail2).toBeUndefined()
    expect(changed.trail3).toBeUndefined()
    expect(before).toEqual(beforeSnapshot)
  })
})
