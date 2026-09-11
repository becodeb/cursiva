import { describe, expect, it } from 'vitest'
import { EMPTY_RECORD, DETECTIVE_TRAIL_IDS, type LevelRecord } from '../game/types'
import { isFiled, lampOn, nextCaseStep, railSlots, type Records } from './caseState'

/** Records where exactly the listed trails have been approved once. */
function filed(...ids: readonly string[]): Records {
  const out: Record<string, LevelRecord> = {}
  for (const id of ids) out[id] = { ...EMPTY_RECORD, approvals: 1 }
  return out
}

describe('nextCaseStep (docs/10 §4: the glass opens the next unfinished trail)', () => {
  it('a child who has never played starts at the first trail', () => {
    expect(nextCaseStep({})).toEqual({ kind: 'trail', levelId: DETECTIVE_TRAIL_IDS[0] })
  })

  it('resumes at the first trail whose clue is not filed, not at the last played one', () => {
    expect(nextCaseStep(filed('trail1', 'trail2'))).toEqual({ kind: 'trail', levelId: 'trail3' })
  })

  it('a GAP is filled before moving on — the case needs all four clues, in any order', () => {
    // trail2 was skipped (test mode, a deep link). The office sends the child
    // back for the missing clue rather than forward past it.
    expect(nextCaseStep(filed('trail1', 'trail3', 'trail4'))).toEqual({
      kind: 'trail',
      levelId: 'trail2',
    })
  })

  it('all four filed opens the deduction', () => {
    expect(nextCaseStep(filed(...DETECTIVE_TRAIL_IDS))).toEqual({ kind: 'deduce' })
  })

  it('an attempt that was never approved is not a filed clue', () => {
    const tried: Records = { trail1: { ...EMPTY_RECORD, attempts: 9, bestAccuracy: 80 } }
    expect(isFiled(tried, 'trail1')).toBe(false)
    expect(nextCaseStep(tried)).toEqual({ kind: 'trail', levelId: 'trail1' })
  })
})

describe('railSlots (the rail carries the REAL case state)', () => {
  it('is one slot per trail, in play order, carrying each trail catalog clue kind', () => {
    expect(railSlots({})).toEqual([
      { kind: 'droplet', filed: false },
      { kind: 'corn', filed: false },
      { kind: 'footprint', filed: false },
      { kind: 'feather', filed: false },
    ])
  })

  it('marks exactly the filed trails, leaving the rest drained', () => {
    expect(railSlots(filed('trail1', 'trail3')).map((s) => s.filed)).toEqual([
      true,
      false,
      true,
      false,
    ])
  })
})

describe('lampOn (the office light means the case is ready to solve)', () => {
  it('stays off while any clue is missing', () => {
    expect(lampOn({})).toBe(false)
    expect(lampOn(filed('trail1', 'trail2', 'trail3'))).toBe(false)
  })

  it('lights only when every clue is filed', () => {
    expect(lampOn(filed(...DETECTIVE_TRAIL_IDS))).toBe(true)
  })

  it('agrees with nextCaseStep: the lamp is lit exactly when the glass opens the deduction', () => {
    const cases: Records[] = [{}, filed('trail1'), filed('trail1', 'trail2', 'trail3', 'trail4')]
    for (const records of cases) {
      expect(lampOn(records)).toBe(nextCaseStep(records).kind === 'deduce')
    }
  })
})
