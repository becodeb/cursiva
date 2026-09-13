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

  it('counts approvals on the eight new sheep/llama catalog ids, with no change to stars.ts itself', () => {
    // `REAL_LEVEL_IDS` already contains these via `catalog.ts`'s `LEVELS` —
    // this closes the coverage gap, no production code changes here.
    const records: Records = {
      'sheep-hill1': record(2),
      'sheep-hill4': record(1),
      'llama-peak1': record(2),
      'llama-peak4': record(1),
    }
    expect(totalStars(records)).toBe(6)
  })
})
