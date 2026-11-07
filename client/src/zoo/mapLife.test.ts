import { describe, expect, it } from 'vitest'
import { NOTEBOOK_ANIMAL_IDS } from './notebook'
import { ANIMAL_LIFE, CYCLE_SECONDS, joyHop, layLine, LIFE_SECONDS, lifePose, MAX_MOVING, movingAt, pointAlong } from './mapLife'
import type { TracedLine } from './tracedLine'

const BOX = { x: 400, y: 200, width: 80, height: 70 }
const LINE: TracedLine = { levelId: 'duck-trail4', w: 1, h: 0.3, strokes: [[[0, 0.1], [0.3, 0.3], [0.6, 0], [1, 0.2]]] }

describe('who moves', () => {
  it('never moves more than a few at once, and everyone gets a turn', () => {
    const seen = new Set<string>()
    for (let clock = 0; clock < CYCLE_SECONDS * 20; clock += 0.5) {
      const moving = movingAt(clock, NOTEBOOK_ANIMAL_IDS)
      expect(moving.length).toBeLessThanOrEqual(MAX_MOVING)
      for (const { id } of moving) seen.add(id)
    }
    expect(seen).toEqual(new Set(NOTEBOOK_ANIMAL_IDS))
  })

  it('rests between turns, and an empty map has nobody moving', () => {
    expect(movingAt(LIFE_SECONDS + 0.5, NOTEBOOK_ANIMAL_IDS)).toEqual([])
    expect(movingAt(1, [])).toEqual([])
  })
})

describe('what each one does', () => {
  it('has something to do for every animal in the zoo', () => {
    for (const id of NOTEBOOK_ANIMAL_IDS) expect(ANIMAL_LIFE[id], id).toBeDefined()
  })

  for (const kind of ['swim', 'fly', 'slither', 'swing', 'leap', 'hop', 'stroll'] as const) {
    it(`${kind}: starts and ends on its own spot, so a turn never jumps`, () => {
      for (const t of [0, LIFE_SECONDS]) {
        const pose = lifePose(kind, t, BOX)
        expect(Math.abs(pose.x), `x at ${t}`).toBeLessThan(0.01)
        expect(Math.abs(pose.y), `y at ${t}`).toBeLessThan(0.01)
      }
      const moves = [1, 2, 3, 4, 5].some((t) => {
        const p = lifePose(kind, t, BOX)
        return Math.abs(p.x) + Math.abs(p.y) + Math.abs(p.tilt) > 2
      })
      expect(moves).toBe(true)
    })
  }

  it('goes along the child\'s line when there is one, and home from it', () => {
    const route = layLine(LINE, BOX)
    expect(Math.abs(lifePose('swim', 0, BOX, route).x)).toBeLessThan(0.01)
    expect(Math.abs(lifePose('swim', LIFE_SECONDS, BOX, route).x)).toBeLessThan(0.01)
    const middle = lifePose('swim', LIFE_SECONDS / 2, BOX, route)
    const end = route[0][route[0].length - 1]
    expect(BOX.x + BOX.width / 2 + middle.x).toBeCloseTo(end[0], 3)
    expect(BOX.y + BOX.height + middle.y).toBeCloseTo(end[1], 3)
  })
})

describe('the keepsake line', () => {
  it('keeps the child\'s proportions and stays near the animal', () => {
    const [stroke] = layLine(LINE, BOX)
    const xs = stroke.map((p) => p[0])
    const ys = stroke.map((p) => p[1])
    expect(Math.max(...xs) - Math.min(...xs)).toBeLessThanOrEqual(BOX.width * 1.15 + 0.01)
    expect((Math.max(...ys) - Math.min(...ys)) / (Math.max(...xs) - Math.min(...xs))).toBeCloseTo(0.3, 5)
    expect(Math.abs((Math.max(...xs) + Math.min(...xs)) / 2 - (BOX.x + BOX.width / 2))).toBeLessThan(0.01)
  })

  it('walks a line end to end', () => {
    const strokes = [[[0, 0], [10, 0]], [[10, 10], [20, 10]]] as const
    expect(pointAlong(strokes, 0)).toEqual([0, 0])
    expect(pointAlong(strokes, 1)).toEqual([20, 10])
  })
})

describe('a hop of joy', () => {
  it('goes up and lands', () => {
    expect(joyHop(0, 1, 20)).toBe(0)
    expect(joyHop(1, 1, 20)).toBe(0)
    expect(joyHop(0.25, 1, 20)).toBeCloseTo(-20, 5)
  })
})
