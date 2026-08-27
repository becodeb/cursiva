// U6 focused tests: mode logic is PURE where it matters — guided rail state
// (guidedTrace), single-release evaluation (freeTrace), and the approval tone
// (tone.ts via an injected fake AudioContext). Component DOM behavior (demo
// timing, input gating, exactly-once feedback, retry clearing) runs in the
// browser runtime harness instead (headless Chromium + CDP, as in U5).
import { describe, expect, it, vi } from 'vitest'
import { guidedFollowState } from './guidedTrace'
import { evaluateTrace } from './freeTrace'
import { playApprovalTone } from './tone'
import { samplePath } from '../canvas/resample'
import { referenceFlattenPath } from '../canvas/testUtils'
import { letraA } from '../letters/letra_a'

const a = letraA
const ideal = samplePath(a.pathDefinition.d)

describe('guidedFollowState (guided rail, T5.1)', () => {
  it('completes the rail when the stroke follows the ideal path in order', () => {
    const s = guidedFollowState(ideal, a.pathDefinition.checkpoints, ideal)
    expect(s.complete).toBe(true)
    expect(s.activated).toEqual([1, 2, 3, 4, 5, 6])
    expect(s.wrongDirection).toBe(false)
    expect(s.offPath).toBe(false)
  })

  it('shows the rescue when the head leaves the ideal corridor', () => {
    const s = guidedFollowState([{ x: 10, y: 10 }], a.pathDefinition.checkpoints, ideal)
    expect(s.offPath).toBe(true)
    expect(s.complete).toBe(false)
  })

  it('flags a wrong-direction (clockwise) stroke and never completes it', () => {
    const s = guidedFollowState([...ideal].reverse(), a.pathDefinition.checkpoints, ideal)
    expect(s.wrongDirection).toBe(true)
    expect(s.complete).toBe(false)
  })

  it('stays incomplete on a partial stroke while activating in order', () => {
    const s = guidedFollowState(ideal.slice(0, 16), a.pathDefinition.checkpoints, ideal)
    expect(s.activated[0]).toBe(1)
    expect(s.complete).toBe(false)
  })
})

describe('evaluateTrace (single-release evaluation, T5.2)', () => {
  it('approves a perfect touch trace with a 100 score', () => {
    // A user stroke that follows the ideal path at the same 24-step flatten
    // density resamples to the IDENTICAL point set → score 100 end to end.
    const r = evaluateTrace(referenceFlattenPath(a.pathDefinition.d), a, 'touch')
    expect(r.approved).toBe(true)
    expect(r.score).toBe(100)
    expect(r.orderPassed).toBe(true)
    expect(r.isContinuous).toBe(true)
  })

  it('approves natural deviation on touch but rejects the same trace on pen (tolerance)', () => {
    // ±5px jitter (mean dev 5): touch (Tol 18) → 72.2 ≥ 70; pen (Tol 12) → 58.3 < 70
    const jittered = ideal.map((p, i) => ({ x: p.x, y: p.y + (i % 2 === 0 ? 5 : -5) }))
    const rTouch = evaluateTrace(jittered, a, 'touch')
    const rPen = evaluateTrace(jittered, a, 'mouse')
    expect(rTouch.score).toBeGreaterThanOrEqual(70)
    expect(rTouch.approved).toBe(true)
    expect(rPen.score).toBeLessThan(70)
    expect(rPen.approved).toBe(false)
  })

  it('never approves a wrong-direction stroke (spec "Wrong direction not rewarded")', () => {
    const r = evaluateTrace([...ideal].reverse(), a, 'touch')
    expect(r.wrongDirection).toBe(true)
    expect(r.approved).toBe(false)
  })

  it('rejects an early lift (continuity broken) and empty input', () => {
    const early = evaluateTrace(ideal.slice(0, 24), a, 'touch')
    expect(early.isContinuous).toBe(false)
    expect(early.approved).toBe(false)
    const empty = evaluateTrace([{ x: 10, y: 10 }], a, 'touch')
    expect(empty.score).toBe(0)
    expect(empty.approved).toBe(false)
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