import { describe, expect, it } from 'vitest'
import { armRootOf, cueTipAt, demoTipAt, REACH_SECONDS, tentacleOutline, tentacleSpine, type TentacleCue } from './tentacle'
import type { Vec } from './geometry'

const ROOT: Vec = [100, 100]

describe('tentacleSpine', () => {
  it('runs from his body to exactly the tip', () => {
    const spine = tentacleSpine(ROOT, [400, 300])
    expect(spine[0]).toEqual(ROOT)
    expect(spine[spine.length - 1][0]).toBeCloseTo(400, 6)
    expect(spine[spine.length - 1][1]).toBeCloseTo(300, 6)
  })

  it('bows: it is an arm, not a ruler', () => {
    const spine = tentacleSpine(ROOT, [500, 100])
    expect(Math.max(...spine.map((p) => p[1]))).toBeGreaterThan(130)
  })
})

describe('tentacleOutline', () => {
  it('survives a tip on top of its root', () => {
    expect(tentacleOutline(ROOT, ROOT)).not.toContain('NaN')
  })
})

describe('armRootOf', () => {
  const box = { x: 100, y: 100, width: 100, height: 100 }

  it('comes out of the side facing what it reaches for', () => {
    expect(armRootOf(box, { x: 900, y: 0 })[0]).toBeGreaterThan(150)
    expect(armRootOf(box, { x: 0, y: 0 })[0]).toBeLessThan(150)
  })
})

describe('cueTipAt', () => {
  const slide: TentacleCue = { visual: 'hand', from: [200, 200], to: [300, 200] }

  it('reaches out, then slides once and stays', () => {
    expect(cueTipAt(slide, ROOT, 0)).toEqual(ROOT)
    expect(cueTipAt(slide, ROOT, REACH_SECONDS)[0]).toBeCloseTo(200, 5)
    expect(cueTipAt(slide, ROOT, 60)).toEqual([300, 200])
  })

  it('a wipe passes there and back and ends where it began', () => {
    const wipe: TentacleCue = { visual: 'wipe', from: [200, 200], to: [300, 200] }
    const xs = Array.from({ length: 60 }, (_, i) => cueTipAt(wipe, ROOT, REACH_SECONDS + (i / 59) * 2.4)[0])
    expect(Math.max(...xs)).toBeGreaterThan(295)
    expect(xs[xs.length - 1]).toBeCloseTo(200, 3)
  })

  it('a point goes straight to the spot and nods at it, never leaving it sideways', () => {
    const point: TentacleCue = { visual: 'point', from: [90, 460], to: [90, 460] }
    for (let t = REACH_SECONDS; t < 2; t += 0.1) {
      const tip = cueTipAt(point, ROOT, t)
      expect(tip[0]).toBe(90)
      expect(460 - tip[1]).toBeLessThanOrEqual(7)
    }
  })
})

describe('demoTipAt: the tip is the pen', () => {
  const demos = [
    { delay: 0, duration: 1 },
    { delay: 2, duration: 1 },
  ]
  // Stroke i runs horizontally at height 100 * i.
  const sample = (i: number, f: number): Vec => [f * 100, i * 100]

  it('follows each stroke at the stroke own pace', () => {
    expect(demoTipAt(demos, sample, 0.5)).toEqual([50, 0])
    expect(demoTipAt(demos, sample, 2.25)).toEqual([25, 100])
  })

  it('lifts across the gap between strokes', () => {
    const tip = demoTipAt(demos, sample, 1.5)
    expect(tip[0]).toBeCloseTo(50, 5)
    expect(tip[1]).toBeCloseTo(50, 5)
  })

  it('stays at the end once finished, the reduced-motion resting place too', () => {
    expect(demoTipAt(demos, sample, Infinity)).toEqual([100, 100])
  })
})
