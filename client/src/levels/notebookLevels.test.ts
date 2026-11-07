// The bridge to the letters as data (`docs/25` 4.2 to 4.6): every level must be
// playable by the stroke it asks for, and impossible with the stroke it exists to
// discourage. Simulated strokes; real children are still owed.
import { describe, expect, it } from 'vitest'
import { abruptTurnCount } from '../canvas/validation/fluency'
import { evaluateLevel } from '../game/evaluateLevel'
import { EVENT_RATES, reportAt, wobblyFiveYearOldLine, zigzagLine } from '../testing/childStrokes'
import { buildLevelTarget } from './buildLevel'
import { DEGRADED_LEVEL_IDS, LEVELS, getLevel } from './catalog'
import { BRIDGE_LEVELS, CHAPTER_LEVEL_IDS, LETTER_LEVELS, WORDS, WORD_LEVELS, letterLevelIds } from './notebookLevels'

const ALL = [...BRIDGE_LEVELS, ...LETTER_LEVELS, ...WORD_LEVELS]

describe('the notebook levels', () => {
  it('are all in the catalog, and none degraded', () => {
    for (const level of ALL) expect(LEVELS).toContain(level)
    for (const level of ALL) expect(DEGRADED_LEVEL_IDS).not.toContain(level.id)
  })

  it('never ask for more than a short sentence (`docs/25` 4.4)', () => {
    for (const level of ALL) expect(level.hint.length, level.id).toBeLessThanOrEqual(80)
  })

  it('every step of the sequence pins its own band, in order', () => {
    for (const char of 'mnuoale') {
      const bands = letterLevelIds(char).map((id) => getLevel(id).guideBand)
      expect(bands).toEqual(['full', 'dotted', 'minimal', 'none'])
    }
  })

  it('the demonstration opens the first step and the morph comes before it', () => {
    for (const char of 'mnuoale') {
      const first = getLevel(letterLevelIds(char)[0])
      expect(first.demo).toBe(true)
      expect(first.demoSeconds).toBeGreaterThanOrEqual(4)
      expect(first.notebook?.morph?.line).toBeTruthy()
    }
  })

  it('the model stands beside the writing on the copy step, clear of it', () => {
    for (const char of 'mnuoale') {
      const copy = getLevel(`${char}-copia`)
      const target = buildLevelTarget(copy)
      const xs = target.polyline.map((p) => p.x)
      const dx = copy.notebook!.modelDx!
      expect(Math.max(...xs) - dx, char).toBeLessThan(Math.min(...xs) + 40)
      expect(Math.min(...xs) - dx, char).toBeGreaterThanOrEqual(0)
      expect(Math.max(...xs), char).toBeLessThanOrEqual(target.viewBoxWidth)
    }
  })

  it('keeps letters large: x-height stays well over the corridor at the widest sheet', () => {
    for (const level of ALL) {
      const target = buildLevelTarget(level)
      expect(target.viewBoxWidth, level.id).toBeLessThanOrEqual(1100)
      expect(target.corridorWidth, level.id).toBeGreaterThanOrEqual(46)
    }
  })

  it('a word uses only letters already practised by then, in journey order', () => {
    const order = [...CHAPTER_LEVEL_IDS.mn, ...CHAPTER_LEVEL_IDS.u, ...CHAPTER_LEVEL_IDS.oa, ...CHAPTER_LEVEL_IDS.le]
    for (const { id, word } of WORDS) {
      for (const char of word) {
        expect(order.indexOf(`${char}-memoria`), `${word}: ${char}`).toBeGreaterThanOrEqual(0)
        expect(order.indexOf(`${char}-memoria`), `${word}: ${char}`).toBeLessThan(order.indexOf(id))
      }
    }
  })

  it('a word is one joined stroke with no pen lift', () => {
    for (const level of WORD_LEVELS) {
      expect(level.paths, level.id).toHaveLength(1)
      expect(level.rules.mustBeContinuous, level.id).toBe(true)
      expect(level.paths[0].match(/M/g), level.id).toHaveLength(1)
      // Every seam shows as at most a small corner, not a jump: a jump would be a
      // long straight run the letter does not have.
      const target = buildLevelTarget(level)
      for (let i = 1; i < target.polyline.length; i++) {
        const a = target.polyline[i - 1]
        const b = target.polyline[i]
        expect(Math.hypot(a.x - b.x, a.y - b.y), level.id).toBeLessThan(40)
      }
      expect(abruptTurnCount(target.polyline), level.id).toBeGreaterThan(0)
    }
  })

  for (const level of [...LETTER_LEVELS, ...WORD_LEVELS]) {
    const target = buildLevelTarget(level)
    it(`${level.id}: a clean wobbly stroke passes on every event rate, a zigzag on none`, () => {
      for (const gaps of Object.values(EVENT_RATES)) {
        const good = evaluateLevel([reportAt(wobblyFiveYearOldLine(target.polyline), gaps)], target, 'touch')
        expect(good.approved, JSON.stringify(good)).toBe(true)
        const bad = evaluateLevel([reportAt(zigzagLine(target.polyline), gaps)], target, 'touch')
        expect(bad.approved).toBe(false)
      }
    })
  }

  for (const level of BRIDGE_LEVELS) {
    const target = buildLevelTarget(level)
    it(`${level.id}: the family's gesture at letter size, passable by a wobbly stroke`, () => {
      const ys = target.polyline.map((p) => p.y)
      expect(Math.max(...ys)).toBeLessThanOrEqual(430)
      expect(Math.min(...ys)).toBeGreaterThanOrEqual(175)
      expect(level.surface).toBe('ruled')
      expect(level.peekingRule).toBe(true)
      const good = evaluateLevel([reportAt(wobblyFiveYearOldLine(target.polyline), [16.7])], target, 'touch')
      expect(good.approved, JSON.stringify(good)).toBe(true)
    })
  }
})
