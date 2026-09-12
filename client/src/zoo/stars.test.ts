// Star derivation tests (proposal OD1, zoo-map spec "Star Derivation").
import { describe, expect, it } from 'vitest'
import { EMPTY_RECORD, type LevelRecord } from '../game/types'
import { starsFor, totalStars } from './stars'
import type { Records } from './sectors'

function record(approvals: number): LevelRecord {
  return { ...EMPTY_RECORD, approvals }
}

describe('starsFor', () => {
  it.each([
    [0, 0],
    [1, 1],
    [2, 2],
    [5, 2],
  ])('approvals=%i → %i stars (capped at APPROVALS_TO_UNLOCK)', (approvals, expected) => {
    expect(starsFor(record(approvals))).toBe(expected)
  })
})

describe('totalStars', () => {
  it('sums stars only over real catalog level ids', () => {
    const records: Records = {
      'duck-trail1': record(2),
      'duck-trail2': record(1),
      'duck-deduce': record(1), // pseudo-record — must not count
      unknownLevel: record(5), // never a real id — must not count
    }
    expect(totalStars(records)).toBe(3)
  })

  it('is zero for an empty registry', () => {
    expect(totalStars({})).toBe(0)
  })

  it('ignores every pseudo-record regardless of case id', () => {
    const records: Records = { 'hen-deduce': record(2) }
    expect(totalStars(records)).toBe(0)
  })
})
