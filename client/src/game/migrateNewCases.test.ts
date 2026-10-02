// migrateNewCases — T45's copy-forward for the sheep's and the turtles' new
// pistas levels. Node-only, no DOM. Same shape as
// `migrateDuckOneCluePerLevel.test.ts`.
import { describe, expect, it } from 'vitest'
import { EMPTY_RECORD } from './types'
import type { LevelRecord } from './types'
import { NEW_CASE_SPLITS, migrateNewCases } from './migrateNewCases'
import { ADVENTURES, isRescued } from '../zoo/adventures'
import { DETECTIVE_CASES, caseSolvedId } from '../detective/cases'
import { resolveNextAction } from '../screen/GameScreen'

function makeRecord(over: Partial<LevelRecord> = {}): LevelRecord {
  return { ...EMPTY_RECORD, ...over }
}

const filed = (...ids: string[]): Record<string, LevelRecord> =>
  Object.fromEntries(ids.map((id) => [id, makeRecord({ approvals: 1, attempts: 2, bestAccuracy: 70 })]))

describe('migrateNewCases — ids', () => {
  it('names each new pistas level, the old first level it plays before, and its case', () => {
    for (const { sourceId, newLevelId, solvedId } of NEW_CASE_SPLITS) {
      const row = ADVENTURES.find((a) => a.levelIds.includes(newLevelId))!
      expect(row.levelIds.slice(0, 2)).toEqual([newLevelId, sourceId])
      expect(row.deduction?.after).toBe(newLevelId)
      const kase = DETECTIVE_CASES.find((k) => k.trailIds.includes(newLevelId))!
      expect(solvedId).toBe(caseSolvedId(kase.id))
    }
  })
})

describe('migrateNewCases — a child who already rescued the sheep and the turtles', () => {
  const before = filed(
    'sheep-hill1', 'sheep-hill2', 'sheep-hill3', 'sheep-hill4',
    'turtle1', 'turtle2', 'turtle3', 'turtle4',
  )

  it('keeps both rescued once the new levels join their adventures', () => {
    expect(isRescued(before, 'oveja')).toBe(false)
    expect(isRescued(before, 'tortuga')).toBe(false)
    const after = { ...before, ...migrateNewCases(before) }
    expect(isRescued(after, 'oveja')).toBe(true)
    expect(isRescued(after, 'tortuga')).toBe(true)
  })

  it('seeds the new level from the old first one, without its failure streak, and solves the case', () => {
    const changed = migrateNewCases({ ...before, 'sheep-hill1': makeRecord({ approvals: 2, attempts: 5, streakFail: 3, bestAccuracy: 81 }) })
    expect(changed['sheep-lana']).toMatchObject({ approvals: 2, attempts: 5, streakFail: 0, bestAccuracy: 81 })
    expect(changed['sheep-deduce']).toEqual({ ...EMPTY_RECORD, approvals: 1 })
    expect(changed['turtles-deduce']).toEqual({ ...EMPTY_RECORD, approvals: 1 })
  })

  it('never touches an existing record, and a second run writes nothing', () => {
    const first = migrateNewCases(before)
    for (const id of Object.keys(before)) expect(first[id]).toBeUndefined()
    expect(migrateNewCases({ ...before, ...first })).toEqual({})
  })
})

describe('migrateNewCases — a child halfway through the sheep', () => {
  it('resumes where they were, never back at the new level or the deduction', () => {
    const before = filed('sheep-hill1')
    const after = { ...before, ...migrateNewCases(before) }
    expect(Object.keys(migrateNewCases(before)).sort()).toEqual(['sheep-deduce', 'sheep-lana'])
    // Replaying the new level later routes straight on, the case is solved.
    expect(resolveNextAction('sheep-lana', after)).toEqual({ type: 'next', levelId: 'sheep-hill1' })
  })
})

describe('migrateNewCases — no write', () => {
  it('for a child who never reached either adventure', () => {
    expect(migrateNewCases({})).toEqual({})
    expect(migrateNewCases(filed('duck-trail1', 'snake4'))).toEqual({})
  })

  it('when the old first level was tried but never filed', () => {
    expect(migrateNewCases({ 'turtle1': makeRecord({ attempts: 4 }) })).toEqual({})
  })

  it('for the case whose new level or solved record already exists', () => {
    expect(migrateNewCases({ ...filed('sheep-hill1'), 'sheep-lana': makeRecord({ attempts: 1 }) })).toEqual({})
    expect(migrateNewCases({ ...filed('turtle1'), 'turtles-deduce': makeRecord({ approvals: 1 }) })).toEqual({})
  })
})

describe('a new child meets the new cases in order', () => {
  it('sheep-lana detours into the sheep deduction, then on to the hills', () => {
    expect(resolveNextAction('sheep-lana', filed('sheep-lana'))).toEqual({
      type: 'deduce',
      caseId: 'sheep',
      afterLevelId: 'sheep-hill1',
    })
    expect(resolveNextAction('turtle-huellas', filed('turtle-huellas'))).toEqual({
      type: 'deduce',
      caseId: 'turtles',
      afterLevelId: 'turtle1',
    })
  })
})
