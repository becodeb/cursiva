// Progressive guide withdrawal (docs/03 §3, "Retiro progresivo de la guía").
// The doc's four bands, both boundaries of each, and the one override that
// outranks all of them.
//
// Records are FAKED here on purpose: the bands are a pure function of persisted
// mastery, so grinding a real level up to 90 accuracy through the evaluator
// would test the evaluator, not the withdrawal.
import { describe, expect, it } from 'vitest'
import {
  GUIDE_DOTTED_FROM,
  GUIDE_MINIMAL_FROM,
  GUIDE_NONE_FROM,
  guideLevelFor,
  standingHintFor,
} from './LevelPlay'
import { EMPTY_RECORD, type LevelRecord } from '../game/types'
import { getLevel } from '../levels/catalog'
import type { LevelConfig } from '../levels/types'

function recordAt(bestAccuracy: number): LevelRecord {
  return { ...EMPTY_RECORD, bestAccuracy, attempts: 3, approvals: 1 }
}

/** A guided level, independent of whatever the catalogue currently holds. */
const GUIDED = { showGuide: true } as LevelConfig
const UNGUIDED = { showGuide: false } as LevelConfig

describe('guideLevelFor — the four bands of docs/03 §3', () => {
  it('dominio 0–40 ▸ full guide + demonstration + visible checkpoints', () => {
    expect(guideLevelFor(recordAt(0), GUIDED)).toBe('full')
    expect(guideLevelFor(recordAt(39), GUIDED)).toBe('full')
  })

  it('dominio 40–70 ▸ dotted guide, no demonstration', () => {
    expect(guideLevelFor(recordAt(40), GUIDED)).toBe('dotted')
    expect(guideLevelFor(recordAt(55), GUIDED)).toBe('dotted')
    expect(guideLevelFor(recordAt(69), GUIDED)).toBe('dotted')
  })

  it('dominio 70–90 ▸ start point and direction arrow only', () => {
    expect(guideLevelFor(recordAt(70), GUIDED)).toBe('minimal')
    expect(guideLevelFor(recordAt(80), GUIDED)).toBe('minimal')
    expect(guideLevelFor(recordAt(89), GUIDED)).toBe('minimal')
  })

  it('dominio 90+ ▸ only the ruled lines (traced from memory)', () => {
    expect(guideLevelFor(recordAt(90), GUIDED)).toBe('none')
    expect(guideLevelFor(recordAt(100), GUIDED)).toBe('none')
  })
})

describe('guideLevelFor — boundaries', () => {
  // The doc writes the bands with en-dashes and repeats 40/70/90 in two rows
  // each, so it does not disambiguate. Resolved lower-inclusive: reaching a
  // threshold EARNS the lighter guide.
  it.each([
    [GUIDE_DOTTED_FROM, 'dotted'],
    [GUIDE_MINIMAL_FROM, 'minimal'],
    [GUIDE_NONE_FROM, 'none'],
  ])('exactly %i earns the lighter band (%s)', (at, expected) => {
    expect(guideLevelFor(recordAt(at), GUIDED)).toBe(expected)
  })

  it.each([
    [GUIDE_DOTTED_FROM - 1, 'full'],
    [GUIDE_MINIMAL_FROM - 1, 'dotted'],
    [GUIDE_NONE_FROM - 1, 'minimal'],
  ])('one point below (%i) keeps the heavier band (%s)', (at, expected) => {
    expect(guideLevelFor(recordAt(at), GUIDED)).toBe(expected)
  })

  it('never goes backwards as mastery grows', () => {
    const order = ['full', 'dotted', 'minimal', 'none']
    let previous = 0
    for (let a = 0; a <= 100; a++) {
      const rank = order.indexOf(guideLevelFor(recordAt(a), GUIDED))
      expect(rank).toBeGreaterThanOrEqual(previous)
      previous = rank
    }
  })
})

describe('guideLevelFor — showGuide === false outranks mastery', () => {
  it.each([0, 39, 40, 69, 70, 89, 90, 100])(
    'a memory-test level shows nothing at accuracy %i',
    (accuracy) => {
      expect(guideLevelFor(recordAt(accuracy), UNGUIDED)).toBe('none')
    },
  )

  it('keeps `f5-mama` a real motor-memory exam for a beginner', () => {
    // A child who has never touched it would otherwise land in the FULL band.
    expect(guideLevelFor(EMPTY_RECORD, getLevel('f5-mama'))).toBe('none')
  })
})

describe('guideLevelFor — mastery is bestAccuracy, not approvals', () => {
  it('ignores an approval count that never reaches the doc thresholds', () => {
    // `approvals` is a small counter (2 unlocks the next level); mapping it onto
    // 40/70/90 would either withdraw instantly or never withdraw at all.
    const many = { ...EMPTY_RECORD, bestAccuracy: 10, approvals: 99, streakPass: 99 }
    expect(guideLevelFor(many, GUIDED)).toBe('full')
  })

  it('withdraws on accuracy alone, even with no approval yet', () => {
    const accurate = { ...EMPTY_RECORD, bestAccuracy: 95, approvals: 0 }
    expect(guideLevelFor(accurate, GUIDED)).toBe('none')
  })
})

describe('standingHintFor — the line must describe what is ON SCREEN', () => {
  const path = { kind: 'path', surface: 'ruled' } as const
  const blank = { kind: 'path', surface: 'blank' } as const
  const free = { kind: 'free', surface: 'blank' } as const

  it('never promises a green dot on a level that has no route', () => {
    // `f1-libre` shipped a blank sheet telling the child to start from a dot
    // that was not there. It cannot be obeyed and it cannot be questioned.
    const hint = standingHintFor(free, 'none', false)
    expect(hint).not.toContain('verde')
    expect(hint).not.toContain('meta')
    expect(hint).toBe('Empezá donde quieras')
  })

  it('never promises a green dot once every mark is withdrawn', () => {
    // Same bug, second instance: `f5-mama` draws only the ruled lines.
    const hint = standingHintFor(path, 'none', false)
    expect(hint).not.toContain('verde')
    expect(hint).toBe('Guiate por los renglones')
  })

  it('does not name the ruled lines on a level that has none', () => {
    // A phase-1 maze at 90+ mastery: no marks AND no pauta.
    const hint = standingHintFor(blank, 'none', false)
    expect(hint).not.toContain('renglones')
    expect(hint).toBe('Acordate del camino')
  })

  it('names BOTH ends wherever both are drawn', () => {
    for (const band of ['full', 'dotted', 'minimal'] as const) {
      expect(standingHintFor(path, band, false)).toBe('Del punto verde hasta la meta')
    }
  })

  it('the demonstration outranks everything, including a free level', () => {
    for (const level of [path, blank, free]) {
      expect(standingHintFor(level, 'full', true)).toBe('Mirá cómo se hace')
    }
  })

  it('stays short enough to read on the smallest chrome (nowrap at <=520px tall)', () => {
    for (const level of [path, blank, free]) {
      for (const band of ['full', 'dotted', 'minimal', 'none'] as const) {
        expect(standingHintFor(level, band, false).length).toBeLessThanOrEqual(32)
      }
    }
  })
})
