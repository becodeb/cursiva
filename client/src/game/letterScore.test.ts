// The letter score against the strokes that matter (`docs/25` P1-1 and 4.1): a
// zigzag in order must stop passing, and a clean stroke from a wobbly small hand
// must keep passing, on every device event rate. Simulated strokes only; real
// tablets and real children are still owed (`docs/25` 4.1).
import { describe, expect, it } from 'vitest'
import { buildLevelTarget, letterZoneRadius } from '../levels/buildLevel'
import { getLevel } from '../levels/catalog'
import { EVENT_RATES, cleanLine, reportAt, wobblyFiveYearOldLine, zigzagLine } from '../testing/childStrokes'
import { evaluateLevel } from './evaluateLevel'

const LETTER_LEVELS = ['f3-l', 'f3-a', 'f3-m', 'f3-o', 'f4-la', 'f5-ala']

describe('the letter score', () => {
  for (const id of LETTER_LEVELS) {
    const target = buildLevelTarget(getLevel(id))
    describe(id, () => {
      it('refuses the zigzag that used to earn two stars, on every event rate', () => {
        for (const gaps of Object.values(EVENT_RATES)) {
          const attempt = evaluateLevel([reportAt(zigzagLine(target.polyline), gaps)], target, 'touch')
          expect(attempt.approved).toBe(false)
          expect(attempt.directionOk).toBe(false)
          expect(attempt.fluency).toBeLessThan(target.config.rules.minFluency)
        }
      })

      it('refuses a zigzag that stays inside the corridor', () => {
        const attempt = evaluateLevel([reportAt(zigzagLine(target.polyline, 18, 44), [16.7])], target, 'touch')
        expect(attempt.approved).toBe(false)
      })

      it('passes a clean stroke on every event rate, with close fluency', () => {
        const scores = Object.values(EVENT_RATES).map((gaps) => {
          const attempt = evaluateLevel([reportAt(cleanLine(target.polyline), gaps)], target, 'touch')
          expect(attempt.approved).toBe(true)
          return attempt.fluency
        })
        expect(Math.max(...scores) - Math.min(...scores)).toBeLessThanOrEqual(12)
      })

      it('passes a clean but wobbly stroke from a small hand', () => {
        for (const seed of [1, 7, 23]) {
          for (const gaps of Object.values(EVENT_RATES)) {
            const attempt = evaluateLevel([reportAt(wobblyFiveYearOldLine(target.polyline, seed), gaps)], target, 'touch')
            expect(attempt).toMatchObject({ approved: true, failedPillar: null })
          }
        }
      })

      it('refuses the route walked backwards', () => {
        const backwards = [...cleanLine(target.polyline)].reverse().map((p, i) => ({ ...p, ms: i * 18 }))
        const attempt = evaluateLevel([reportAt(backwards, [16.7])], target, 'touch')
        expect(attempt.approved).toBe(false)
      })

      it('keeps every order zone smaller than the letter and within reach of the corridor', () => {
        for (const cp of target.checkpoints) {
          expect(cp.radius).toBeLessThan(60)
          expect(cp.radius).toBeGreaterThan(target.corridorWidth / 2)
        }
      })
    })
  }

  it('grows the zones with the adaptive corridor, so widening keeps helping', () => {
    expect(letterZoneRadius(84)).toBeGreaterThan(letterZoneRadius(42))
  })

  it('leaves the zones of a level with no letters where they were', () => {
    const trail = buildLevelTarget(getLevel('duck-trail1'))
    for (const cp of trail.checkpoints) {
      expect(cp.radius).toBeGreaterThanOrEqual(35)
    }
  })
})
