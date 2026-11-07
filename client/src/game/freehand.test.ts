import { describe, expect, it } from 'vitest'
import { buildLevelTarget } from '../levels/buildLevel'
import { getLevel } from '../levels/catalog'
import { cleanLine, reportAt, wobblyFiveYearOldLine, zigzagLine } from '../testing/childStrokes'
import { evaluateLevel } from './evaluateLevel'
import { alignFreehand } from './freehand'

const moved = <P extends { x: number; y: number }>(line: readonly P[], dx: number, dy: number, scale = 1): P[] =>
  line.map((p) => ({ ...p, x: p.x * scale + dx, y: p.y * scale + dy }))

describe('alignFreehand', () => {
  const model = [{ x: 100, y: 300 }, { x: 200, y: 420 }]

  it('brings a stroke written elsewhere onto the model', () => {
    const [aligned] = alignFreehand([[{ x: 500, y: 100 }, { x: 600, y: 220 }]], model)
    expect(aligned[0]).toMatchObject({ x: 100, y: 300 })
    expect(aligned[1]).toMatchObject({ x: 200, y: 420 })
  })

  it('keeps a stroke in proportion: its wobble is its own', () => {
    const [aligned] = alignFreehand([[{ x: 0, y: 0 }, { x: 40, y: 10 }, { x: 80, y: 0 }]], [
      { x: 0, y: 0 },
      { x: 160, y: 40 },
    ])
    expect(aligned[2].x - aligned[0].x).toBeCloseTo(128, 0) // capped at 1.6, not 2
    expect(aligned[1].y - aligned[0].y).toBeCloseTo(16, 0) // same scale both ways
  })

  it('does not blow a dot up into a letter', () => {
    const [aligned] = alignFreehand([[{ x: 10, y: 10 }, { x: 14, y: 14 }]], model)
    expect(aligned[1].x - aligned[0].x).toBeCloseTo(4 * 1.6, 5)
  })

  it('has nothing to do on an empty attempt', () => {
    expect(alignFreehand([], model)).toEqual([])
  })
})

describe('the steps written from a model or from memory', () => {
  for (const id of ['o-copia', 'o-memoria', 'm-memoria', 'l-memoria', 'e-copia', 'a-memoria']) {
    const target = buildLevelTarget(getLevel(id))
    it(`${id}: a good letter written to one side passes`, () => {
      const line = wobblyFiveYearOldLine(target.polyline)
      expect(evaluateLevel([reportAt(moved(line, 70, -24), [16.7])], target, 'touch').approved).toBe(true)
      expect(evaluateLevel([reportAt(moved(line, -120, 10), [16.7])], target, 'touch').approved).toBe(true)
    })
    it(`${id}: a good letter written a little big passes`, () => {
      const line = cleanLine(target.polyline)
      expect(evaluateLevel([reportAt(moved(line, -60, -60, 1.2), [16.7])], target, 'touch').approved).toBe(true)
    })
    it(`${id}: a zigzag still does not, nor the letter made backwards`, () => {
      expect(evaluateLevel([reportAt(zigzagLine(target.polyline), [16.7])], target, 'touch').approved).toBe(false)
      const backwards = [...cleanLine(target.polyline)].reverse().map((p, i) => ({ ...p, ms: i * 18 }))
      expect(evaluateLevel([reportAt(backwards, [16.7])], target, 'touch').approved).toBe(false)
    })
  }
})
