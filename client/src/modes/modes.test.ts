// U6 focused tests: mode logic is PURE where it matters — guided rail state
// (guidedTrace), single-release evaluation (freeTrace), and the approval tone
// (tone.ts via an injected fake AudioContext). Component DOM behavior (demo
// timing, input gating, exactly-once feedback, retry clearing) runs in the
// browser runtime harness (headless Chromium + CDP).
//
// The scoring target is now a dense AREA cloud, so tolerance assertions use a
// synthetic horizontal-line letter whose area is an exact band — the real
// Kalam glyph adds a sanity check at the end.
import { describe, expect, it, vi } from 'vitest'
import { guidedFollowState } from './guidedTrace'
import { evaluateTrace } from './freeTrace'
import { playApprovalTone } from './tone'
import { referenceFlattenPath } from '../canvas/testUtils'
import { letraA } from '../letters/letra_a'
import type { LetterConfig, Point } from '../letters/types'

// Synthetic horizontal-line letter: area = band y∈[282,318] (half-width 18,
// ≈36px stroke), x∈[100,900]. The cloud is dense (step 1) so the nearest cloud
// point to any resampled trace point is essentially at the same x, making the
// vertical offset the distance (tolerance math ~exact).
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

const synth = syntheticLetter()
const synthCloud = synth.pathDefinition.ideal

/** Horizontal trace at vertical offset `dy` from the band center (300). */
function traceAt(dy: number): Point[] {
  const pts: Point[] = []
  for (let x = 100; x <= 900; x += 5) pts.push({ x, y: 300 + dy })
  return pts
}

describe('guidedFollowState (guided rail, T5.1)', () => {
  it('completes the rail when the stroke follows the ideal area in order', () => {
    const s = guidedFollowState(traceAt(0), synth.pathDefinition.checkpoints, synthCloud)
    expect(s.complete).toBe(true)
    expect(s.activated).toEqual([1, 2, 3])
    expect(s.wrongDirection).toBe(false)
    expect(s.offPath).toBe(false)
  })

  it('shows the rescue when the head leaves the ideal area', () => {
    const s = guidedFollowState([{ x: 10, y: 10 }], synth.pathDefinition.checkpoints, synthCloud)
    expect(s.offPath).toBe(true)
    expect(s.complete).toBe(false)
  })

  it('flags a wrong-direction stroke and never completes it', () => {
    const s = guidedFollowState([...traceAt(0)].reverse(), synth.pathDefinition.checkpoints, synthCloud)
    expect(s.wrongDirection).toBe(true)
    expect(s.complete).toBe(false)
  })

  it('stays incomplete on a partial stroke while activating in order', () => {
    const s = guidedFollowState(traceAt(0).slice(0, 60), synth.pathDefinition.checkpoints, synthCloud)
    expect(s.activated[0]).toBe(1)
    expect(s.complete).toBe(false)
  })
})

describe('evaluateTrace (single-release evaluation, T5.2)', () => {
  it('approves a perfect on-area trace with a 100 score', () => {
    const r = evaluateTrace(traceAt(0), synth, 'touch')
    expect(r.approved).toBe(true)
    expect(r.score).toBe(100)
    expect(r.orderPassed).toBe(true)
    expect(r.isContinuous).toBe(true)
  })

  it('approves natural deviation on touch but rejects the same trace on pen (tolerance)', () => {
    // 8px outside the area: touch (Tol 26) → ≈80.8 ≥ 70 (approved);
    // pen (Tol 16) → ≈68.75 < 70 (rejected). Resampling places the user points
    // off the exact cloud grid, so the score is ~exact (±0.5).
    const rTouch = evaluateTrace(traceAt(26), synth, 'touch')
    const rPen = evaluateTrace(traceAt(26), synth, 'mouse')
    expect(rTouch.score).toBeCloseTo(80.8, 0)
    expect(rTouch.approved).toBe(true)
    expect(rPen.score).toBeCloseTo(68.75, 0)
    expect(rPen.approved).toBe(false)
  })

  it('never approves a wrong-direction stroke (spec "Wrong direction not rewarded")', () => {
    const r = evaluateTrace([...traceAt(0)].reverse(), synth, 'touch')
    expect(r.wrongDirection).toBe(true)
    expect(r.approved).toBe(false)
  })

  it('rejects an early lift (continuity broken) and empty input', () => {
    const early = evaluateTrace(traceAt(0).slice(0, 24), synth, 'touch')
    expect(early.isContinuous).toBe(false)
    expect(early.approved).toBe(false)
    const empty = evaluateTrace([{ x: 10, y: 10 }], synth, 'touch')
    expect(empty.score).toBe(0)
    expect(empty.approved).toBe(false)
  })
})

describe('area-cloud scoring against the real Kalam `a`', () => {
  it('a ductus-following trace scores ~100 against the real area cloud', () => {
    const r = evaluateTrace(referenceFlattenPath(letraA.pathDefinition.d), letraA, 'touch')
    expect(r.score).toBeCloseTo(100, 0)
  })
})

describe('playApprovalTone (T5.3)', () => {
  it('plays a soft C5 envelope through an injected AudioContext', () => {
    const osc = {
      type: '',
      frequency: { setValueAtTime: vi.fn() },
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    }
    const gain = {
      gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
      connect: vi.fn(),
    }
    const destination = {}
    const ctx = {
      currentTime: 0,
      destination,
      resume: vi.fn(() => Promise.resolve()),
      createOscillator: vi.fn(() => osc),
      createGain: vi.fn(() => gain),
    }
    playApprovalTone(ctx as unknown as AudioContext)
    expect(ctx.createOscillator).toHaveBeenCalledTimes(1)
    expect(osc.type).toBe('sine')
    expect(osc.frequency.setValueAtTime).toHaveBeenCalledWith(523.25, 0)
    expect(osc.connect).toHaveBeenCalledWith(gain)
    expect(gain.connect).toHaveBeenCalledWith(destination)
    expect(osc.start).toHaveBeenCalledWith(0)
    expect(osc.stop).toHaveBeenCalledWith(0.62)
    expect(ctx.resume).toHaveBeenCalled()
  })

  it('is a safe no-op without audio (null ctx, throwing ctx)', () => {
    expect(() => playApprovalTone(null)).not.toThrow()
    const broken = { createOscillator: () => { throw new Error('no audio device') } }
    expect(() => playApprovalTone(broken as unknown as AudioContext)).not.toThrow()
  })
})
