// Regression: a child reported phase-1 mazes rendering as a blank sheet with
// only two markers on it. The cause was not rendering — it was withdrawal.
// One accurate run set `bestAccuracy` (a MONOTONIC maximum) above 70, the band
// dropped to 'minimal', and the corridor — which in phases 1-2 IS the exercise,
// not scaffolding — was permanently removed.
import { describe, expect, it } from 'vitest'
import { guideLevelFor } from './LevelPlay'
import { LEVELS } from '../levels/catalog'
import { EMPTY_RECORD } from '../game/types'
import type { LevelRecord } from '../game/types'

const mastered: LevelRecord = { ...EMPTY_RECORD, bestAccuracy: 95, approvals: 4 }

describe('guide withdrawal is gated by phase', () => {
  it('never withdraws anything in phases 1-2, however well the child scores', () => {
    // `f1-libre` is excluded by `showGuide: false` — the free scribble has no
    // route and so nothing to guide. That is not withdrawal, it is absence.
    for (const level of LEVELS.filter((l) => l.phase <= 2 && l.showGuide)) {
      expect(guideLevelFor(mastered, level), level.id).toBe('full')
    }
  })

  it('still withdraws from phase 3 up, where the guide is real scaffolding', () => {
    const letter = LEVELS.find((l) => l.phase === 3 && l.showGuide)
    expect(letter).toBeDefined()
    expect(guideLevelFor(mastered, letter!)).toBe('none')
    expect(guideLevelFor(EMPTY_RECORD, letter!)).toBe('full')
  })

  it('keeps the memory-exam level withdrawn regardless of phase gating', () => {
    const exam = LEVELS.find((l) => !l.showGuide)
    expect(exam).toBeDefined()
    expect(guideLevelFor(EMPTY_RECORD, exam!)).toBe('none')
  })
})
