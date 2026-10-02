// migrateNewClueLevels — T44's copy-forward for the three new clue levels
// (`night-rastro`, `f2-buceo`, `monkey-lianas`). Node-only, no DOM. Same
// shape as `migrateDuckOneCluePerLevel.test.ts`.
import { describe, expect, it } from 'vitest'
import { EMPTY_RECORD } from './types'
import type { LevelRecord } from './types'
import { NEW_CLUE_LEVEL_SEEDS, migrateNewClueLevels } from './migrateNewClueLevels'
import { ADVENTURES, isRescued } from '../zoo/adventures'
import { DETECTIVE_CASES, caseSolvedId } from '../detective/cases'

function makeRecord(over: Partial<LevelRecord> = {}): LevelRecord {
  return { ...EMPTY_RECORD, ...over }
}

function filed(ids: readonly string[]): Record<string, LevelRecord> {
  return Object.fromEntries(ids.map((id) => [id, makeRecord({ approvals: 1, attempts: 1 })]))
}

describe('migrateNewClueLevels — ids', () => {
  it("seeds each new level from its case's previous last pistas level, never the reverse", () => {
    for (const { id, caseId, sourceId } of NEW_CLUE_LEVEL_SEEDS) {
      const kase = DETECTIVE_CASES.find((k) => k.id === caseId)!
      expect(kase.trailIds.slice(-2)).toEqual([sourceId, id])
      expect(`${caseId}-deduce`).toBe(caseSolvedId(caseId))
    }
    const ids = NEW_CLUE_LEVEL_SEEDS.map((s) => s.id)
    for (const { sourceId } of NEW_CLUE_LEVEL_SEEDS) expect(ids).not.toContain(sourceId)
  })
})

describe('migrateNewClueLevels — a child who already solved the cases', () => {
  const before: Record<string, LevelRecord> = {
    ...filed(['night1', 'night2', 'night4', 'night-deduce']),
    night3: makeRecord({ approvals: 2, attempts: 4, streakFail: 3, bestAccuracy: 70 }),
    ...filed(['f2-guirnalda', 'f2-agua2', 'fish-deduce', 'f2-agua3', 'f2-agua4']),
    ...filed(['monkey1', 'monkey2', 'monkeys-deduce', 'monkey3', 'monkey4']),
  }

  it('files every new level from its source record, without the failure streak', () => {
    const changed = migrateNewClueLevels(before)
    expect(Object.keys(changed).sort()).toEqual(['f2-buceo', 'monkey-lianas', 'night-rastro'])
    expect(changed['night-rastro']).toMatchObject({ approvals: 2, attempts: 4, bestAccuracy: 70, streakFail: 0 })
  })

  it('keeps the rescued fish and monkeys rescued once the new levels join their adventures', () => {
    for (const [animal, adventureId, newId] of [
      ['pez', 'fish', 'f2-buceo'],
      ['mono', 'monkeys', 'monkey-lianas'],
    ] as const) {
      expect(ADVENTURES.find((a) => a.id === adventureId)!.levelIds).toContain(newId)
      expect(isRescued(before, animal), animal).toBe(false)
      expect(isRescued({ ...before, ...migrateNewClueLevels(before) }, animal), animal).toBe(true)
    }
  })

  it('never touches an existing record, and a second run writes nothing', () => {
    const first = migrateNewClueLevels(before)
    for (const id of Object.keys(before)) expect(first[id]).toBeUndefined()
    expect(migrateNewClueLevels({ ...before, ...first })).toEqual({})
  })
})

describe('migrateNewClueLevels — no write', () => {
  it('leaves a child who has not solved the case to play the new level', () => {
    // The old clues are filed but the deduction is still ahead: the new level
    // now stands between them, which is where it belongs.
    expect(migrateNewClueLevels(filed(['night1', 'night2', 'night3', 'f2-guirnalda', 'f2-agua2', 'monkey1', 'monkey2']))).toEqual({})
  })

  it('writes nothing for an empty store', () => {
    expect(migrateNewClueLevels({})).toEqual({})
  })

  it('seeds only the cases actually solved', () => {
    const changed = migrateNewClueLevels({ ...filed(['f2-agua2', 'fish-deduce', 'monkey2']) })
    expect(Object.keys(changed)).toEqual(['f2-buceo'])
  })
})
