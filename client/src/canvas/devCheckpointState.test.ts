import { describe, expect, it } from 'vitest'
import { devCheckpointState } from './devCheckpointState'
import type { LetterConfig, Point } from '../letters/types'

// Synthetic horizontal-line letter (mirrors modes.test.ts): area = band
// y in [282,318] (half-width 18, ~36px stroke), x in [100,900]. The cloud is
// dense (step 1) so the nearest cloud point to any resampled trace point is at
// the same x, making the vertical offset the distance (tolerance math ~exact).
function syntheticLetter(): LetterConfig {
  const ideal: Array<[number, number]> = []
  for (let x = 100; x <= 900; x += 1) {
    for (let y = 282; y <= 318; y += 1) ideal.push([x, y])
  }
  return {
    id: 'synthetic',
    character: 's',
    family: 'ola',
    baselineZone: 'media',
    theme: { backgroundColor: '#fff', watermarkAssetSvg: '' },
    pathDefinition: {
      d: 'M100 300 L900 300',
      ideal,
      strokeWidth: 14,
      checkpoints: [
        { order: 1, x: 200, y: 300, radius: 40, name: 's' },
        { order: 2, x: 500, y: 300, radius: 40, name: 'm' },
        { order: 3, x: 800, y: 300, radius: 40, name: 'e' },
      ],
    },
    animationTimeline: [],
  }
}

/** Horizontal trace at vertical offset `dy` from the band center (300). */
function traceAt(dy: number): Point[] {
  const pts: Point[] = []
  for (let x = 100; x <= 900; x += 5) pts.push({ x, y: 300 + dy })
  return pts
}

const synth = syntheticLetter()
const cps = synth.pathDefinition.checkpoints
const cloud = synth.pathDefinition.ideal

describe('devCheckpointState', () => {
  it('lights checkpoints in order, scores 100, and completes an on-order trace', () => {
    const s = devCheckpointState(traceAt(0), cps, cloud)
    expect(s.activated).toEqual([1, 2, 3])
    expect(s.wrongDirection).toBe(false)
    expect(s.score).toBe(100)
    expect(s.complete).toBe(true)
  })

  it('flags a wrong-direction (reversed) trace and never completes it', () => {
    const s = devCheckpointState([...traceAt(0)].reverse(), cps, cloud)
    expect(s.wrongDirection).toBe(true)
    expect(s.complete).toBe(false)
  })

  it('scores a trace far outside the area as low', () => {
    const s = devCheckpointState(traceAt(200), cps, cloud)
    expect(s.score).toBeLessThan(50)
  })

  it('scores 0 for an empty stroke', () => {
    const s = devCheckpointState([], cps, cloud)
    expect(s.score).toBe(0)
    expect(s.activated).toEqual([])
    expect(s.complete).toBe(false)
  })
})
