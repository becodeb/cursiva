// migrateNivel3 — level-engine spec "Nivel 3 Positional-Unlock Migration".
// Node-only, no DOM. Same shape as `migrateDuckCase.test.ts`.
import { describe, expect, it } from 'vitest'
import { EMPTY_RECORD, APPROVALS_TO_UNLOCK, NIVEL3_TRAIL_IDS } from './types'
import type { LevelRecord } from './types'
import { migrateNivel3, NIVEL3_PREDECESSOR_ID } from './migrateNivel3'

function makeRecord(over: Partial<LevelRecord> = {}): LevelRecord {
  return { ...EMPTY_RECORD, ...over }
}

describe('migrateNivel3 — named guard: NIVEL3_TRAIL_IDS shape', () => {
  it('is exactly three ids and never includes the predecessor', () => {
    // The trap this change exists to catch: if the source id were included in
    // the destination set, the "no destination has a record yet" guard would
    // be true on the very first run (the source DOES have a record) and the
    // migration would silently write nothing.
    expect(NIVEL3_TRAIL_IDS.length).toBe(3)
    expect(NIVEL3_TRAIL_IDS).not.toContain('f2-guirnalda')
    expect(NIVEL3_TRAIL_IDS).not.toContain(NIVEL3_PREDECESSOR_ID)
  })
})

describe('migrateNivel3 — idempotent re-run', () => {
  it('a second run over the already-migrated store performs no write', () => {
    const before: Record<string, LevelRecord> = {
      [NIVEL3_PREDECESSOR_ID]: makeRecord({ approvals: APPROVALS_TO_UNLOCK, attempts: 4 }),
    }

    const firstRun = migrateNivel3(before)
    expect(Object.keys(firstRun).sort()).toEqual([...NIVEL3_TRAIL_IDS].sort())

    const afterFirstRun: Record<string, LevelRecord> = { ...before, ...firstRun }
    const secondRun = migrateNivel3(afterFirstRun)

    expect(secondRun).toEqual({})
  })
})

describe('migrateNivel3 — no write below the approval threshold', () => {
  it('f2-guirnalda below APPROVALS_TO_UNLOCK yields no changes', () => {
    const before: Record<string, LevelRecord> = {
      [NIVEL3_PREDECESSOR_ID]: makeRecord({ approvals: APPROVALS_TO_UNLOCK - 1, attempts: 3 }),
    }

    expect(migrateNivel3(before)).toEqual({})
  })

  it('no f2-guirnalda record at all yields no changes', () => {
    expect(migrateNivel3({})).toEqual({})
  })
})

describe('migrateNivel3 — no write when any destination has a record', () => {
  it('a single existing destination record blocks the whole seed', () => {
    const before: Record<string, LevelRecord> = {
      [NIVEL3_PREDECESSOR_ID]: makeRecord({ approvals: APPROVALS_TO_UNLOCK, attempts: 5 }),
      [NIVEL3_TRAIL_IDS[1]]: makeRecord({ approvals: 1, attempts: 1 }),
    }

    expect(migrateNivel3(before)).toEqual({})
  })
})

describe('migrateNivel3 — never deletes, never mutates', () => {
  it('the source record is untouched after migration', () => {
    const before: Record<string, LevelRecord> = {
      [NIVEL3_PREDECESSOR_ID]: makeRecord({
        approvals: APPROVALS_TO_UNLOCK,
        attempts: 6,
        bestAccuracy: 88,
        bestFluency: 77,
        streakPass: 2,
        widthFactor: 0.9,
      }),
    }
    const beforeSnapshot = structuredClone(before)

    migrateNivel3(before)

    expect(before).toEqual(beforeSnapshot)
  })

  it('produces no instruction that removes a record — only additive writes to the three new ids', () => {
    const before: Record<string, LevelRecord> = {
      [NIVEL3_PREDECESSOR_ID]: makeRecord({ approvals: APPROVALS_TO_UNLOCK, attempts: 2 }),
      'f2-colinas': makeRecord({ approvals: 1, attempts: 1 }),
    }

    const changed = migrateNivel3(before)

    expect(Object.keys(changed).sort()).toEqual([...NIVEL3_TRAIL_IDS].sort())
    expect(changed['f2-colinas']).toBeUndefined()
  })
})

describe('migrateNivel3 — a captured cursiva.levels.v1 payload keeps f2-colinas unlocked', () => {
  it('seeds all three new ids from f2-guirnalda, demoting nothing, never touching f2-guirnalda itself', () => {
    // A realistic returning-child payload: f2-guirnalda approved (the old
    // predecessor of f2-colinas) and f2-colinas already played some.
    const before: Record<string, LevelRecord> = {
      [NIVEL3_PREDECESSOR_ID]: makeRecord({
        approvals: APPROVALS_TO_UNLOCK,
        attempts: 5,
        bestAccuracy: 95,
        bestFluency: 90,
        streakPass: 2,
        widthFactor: 0.85,
      }),
      'f2-colinas': makeRecord({ approvals: 1, attempts: 3 }),
    }
    const beforeSnapshot = structuredClone(before)

    const changed = migrateNivel3(before)

    // Every new id gets a seeded record, field-wise MAX/summed exactly like
    // migrateDuckCase's seedFrom, and each carries at least APPROVALS_TO_UNLOCK
    // — the fact that keeps f2-colinas's NEW predecessor (the last new id,
    // f2-agua4) reporting as approved once the catalog insertion lands.
    for (const id of NIVEL3_TRAIL_IDS) {
      expect(changed[id]?.approvals).toBe(APPROVALS_TO_UNLOCK)
      expect(changed[id]?.attempts).toBe(5)
      expect(changed[id]?.bestAccuracy).toBe(95)
      expect(changed[id]?.bestFluency).toBe(90)
      // widthFactor is field-wise MAX against EMPTY_RECORD's nominal 1.
      expect(changed[id]?.widthFactor).toBe(1)
      // streakFail is NOT carried — the fresh trail's own (0).
      expect(changed[id]?.streakFail).toBe(0)
    }

    // f2-colinas's own record is untouched — this migration never mutates
    // anything outside the three new ids, and never demotes an existing
    // record.
    expect(changed['f2-colinas']).toBeUndefined()
    expect(before).toEqual(beforeSnapshot)
  })
})
