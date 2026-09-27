// migrateDuckOneCluePerLevel — T40's copy-forward for the two new duck
// pistas levels. Node-only, no DOM. Same shape as `migrateNivel3.test.ts`.
import { describe, expect, it } from 'vitest'
import { EMPTY_RECORD } from './types'
import type { LevelRecord } from './types'
import {
  DUCK_SPLIT_NEW_IDS,
  DUCK_SPLIT_SOURCE_ID,
  migrateDuckOneCluePerLevel,
} from './migrateDuckOneCluePerLevel'
import { ADVENTURES, isRescued } from '../zoo/adventures'
import { DETECTIVE_CASES } from '../detective/cases'

function makeRecord(over: Partial<LevelRecord> = {}): LevelRecord {
  return { ...EMPTY_RECORD, ...over }
}

describe('migrateDuckOneCluePerLevel — ids', () => {
  it('seeds exactly the duck pistas levels that are new, never the source', () => {
    expect(DUCK_SPLIT_NEW_IDS).not.toContain(DUCK_SPLIT_SOURCE_ID)
    const duckTrails = DETECTIVE_CASES.find((k) => k.id === 'duck')!.trailIds
    expect(duckTrails).toEqual(expect.arrayContaining([...DUCK_SPLIT_NEW_IDS, DUCK_SPLIT_SOURCE_ID]))
  })
})

describe('migrateDuckOneCluePerLevel — a child who finished the old clues', () => {
  const before: Record<string, LevelRecord> = {
    'duck-trail1': makeRecord({ approvals: 1, attempts: 2 }),
    [DUCK_SPLIT_SOURCE_ID]: makeRecord({ approvals: 1, attempts: 3, streakFail: 2, bestAccuracy: 80 }),
    'duck-deduce': makeRecord({ approvals: 1 }),
    'duck-trail3': makeRecord({ approvals: 1 }),
    'duck-trail4': makeRecord({ approvals: 1 }),
  }

  it('files both new levels from the source record, without its failure streak', () => {
    const changed = migrateDuckOneCluePerLevel(before)
    expect(Object.keys(changed).sort()).toEqual([...DUCK_SPLIT_NEW_IDS].sort())
    for (const id of DUCK_SPLIT_NEW_IDS) {
      expect(changed[id].approvals, id).toBe(1)
      expect(changed[id].attempts, id).toBe(3)
      expect(changed[id].bestAccuracy, id).toBe(80)
      expect(changed[id].streakFail, id).toBe(0)
    }
  })

  it('keeps the rescued duck rescued once the new levels join the adventure', () => {
    const duckRow = ADVENTURES.find((a) => a.id === 'duck')!
    for (const id of DUCK_SPLIT_NEW_IDS) expect(duckRow.levelIds).toContain(id)
    expect(isRescued(before, 'pato')).toBe(false)
    expect(isRescued({ ...before, ...migrateDuckOneCluePerLevel(before) }, 'pato')).toBe(true)
  })

  it('never touches an existing record, and a second run writes nothing', () => {
    const first = migrateDuckOneCluePerLevel(before)
    for (const id of Object.keys(before)) expect(first[id]).toBeUndefined()
    expect(migrateDuckOneCluePerLevel({ ...before, ...first })).toEqual({})
  })
})

describe('migrateDuckOneCluePerLevel — no write', () => {
  it('when the source level was never filed', () => {
    expect(migrateDuckOneCluePerLevel({})).toEqual({})
    expect(
      migrateDuckOneCluePerLevel({ [DUCK_SPLIT_SOURCE_ID]: makeRecord({ approvals: 0, attempts: 4 }) }),
    ).toEqual({})
  })

  it('when either new level already has a record', () => {
    expect(
      migrateDuckOneCluePerLevel({
        [DUCK_SPLIT_SOURCE_ID]: makeRecord({ approvals: 1 }),
        [DUCK_SPLIT_NEW_IDS[1]]: makeRecord({ attempts: 1 }),
      }),
    ).toEqual({})
  })
})
