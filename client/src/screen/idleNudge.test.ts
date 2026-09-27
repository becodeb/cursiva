import { describe, expect, it } from 'vitest'
import {
  DEFAULT_IDLE_NUDGE_CONFIG,
  idleNudgeCueIndex,
  idleNudgePhase,
  shouldSpeakIdleHint,
  type IdleNudgeConfig,
} from './idleNudge'

const CFG: IdleNudgeConfig = { idleMs: 1000, cueMs: 400, hintCooldownMs: 3000 }

describe('idleNudgePhase', () => {
  it('is idle before the threshold, including at 0', () => {
    expect(idleNudgePhase(0, CFG)).toBe('idle')
    expect(idleNudgePhase(999, CFG)).toBe('idle')
  })

  it('flips to nudge the instant the threshold is reached (inclusive)', () => {
    expect(idleNudgePhase(1000, CFG)).toBe('nudge')
    expect(idleNudgePhase(1001, CFG)).toBe('nudge')
    expect(idleNudgePhase(1399, CFG)).toBe('nudge')
  })

  it('returns to idle once cueMs has elapsed, until the next period', () => {
    expect(idleNudgePhase(1400, CFG)).toBe('idle')
    expect(idleNudgePhase(2000, CFG)).toBe('idle')
  })

  it('repeats forever, one cue every idleMs + cueMs', () => {
    // period = idleMs + cueMs = 1400. Nudge windows: [1000,1400), [2400,2800), [3800,4200)…
    expect(idleNudgePhase(2400, CFG)).toBe('nudge')
    expect(idleNudgePhase(2799, CFG)).toBe('nudge')
    expect(idleNudgePhase(2800, CFG)).toBe('idle')
    expect(idleNudgePhase(3800, CFG)).toBe('nudge') // third occurrence
  })

  it('clamps a negative elapsed to idle rather than throwing or going negative', () => {
    expect(idleNudgePhase(-50, CFG)).toBe('idle')
  })

  it('uses the documented ~6s/~2.2s defaults when no config is given', () => {
    expect(idleNudgePhase(5999)).toBe('idle')
    expect(idleNudgePhase(6001)).toBe('nudge')
    expect(idleNudgePhase(6000 + 2200 + 1)).toBe('idle')
  })
})

describe('idleNudgeCueIndex', () => {
  it('is -1 for the whole first idle stretch', () => {
    expect(idleNudgeCueIndex(0, CFG)).toBe(-1)
    expect(idleNudgeCueIndex(999, CFG)).toBe(-1)
  })

  it('becomes 0 exactly at the threshold and stays 0 through that whole occurrence', () => {
    expect(idleNudgeCueIndex(1000, CFG)).toBe(0)
    expect(idleNudgeCueIndex(1200, CFG)).toBe(0) // mid-cue
    expect(idleNudgeCueIndex(1399, CFG)).toBe(0) // still mid-cue
    expect(idleNudgeCueIndex(1400, CFG)).toBe(0) // idle gap after the cue, same occurrence
    expect(idleNudgeCueIndex(2399, CFG)).toBe(0) // right up to the next boundary
  })

  it('increases by exactly one every idleMs + cueMs', () => {
    expect(idleNudgeCueIndex(2400, CFG)).toBe(1)
    expect(idleNudgeCueIndex(3800, CFG)).toBe(2)
    expect(idleNudgeCueIndex(10_000, CFG)).toBe(Math.floor((10_000 - 1000) / 1400))
  })

  it('never decreases as elapsed time grows (monotone)', () => {
    let prev = idleNudgeCueIndex(0, CFG)
    for (let t = 0; t <= 20_000; t += 137) {
      const next = idleNudgeCueIndex(t, CFG)
      expect(next).toBeGreaterThanOrEqual(prev)
      prev = next
    }
  })
})

describe('shouldSpeakIdleHint', () => {
  it('refuses inside the cooldown window', () => {
    expect(shouldSpeakIdleHint(0, CFG)).toBe(false)
    expect(shouldSpeakIdleHint(2999, CFG)).toBe(false)
  })

  it('allows once the cooldown has fully elapsed', () => {
    expect(shouldSpeakIdleHint(3000, CFG)).toBe(true)
    expect(shouldSpeakIdleHint(999_999, CFG)).toBe(true)
  })

  it('a never-yet-spoken hint (Infinity elapsed) is always allowed', () => {
    expect(shouldSpeakIdleHint(Number.POSITIVE_INFINITY, CFG)).toBe(true)
  })

  it('uses the documented ~20s default', () => {
    expect(shouldSpeakIdleHint(19_999)).toBe(false)
    expect(shouldSpeakIdleHint(20_000)).toBe(true)
  })
})

describe('DEFAULT_IDLE_NUDGE_CONFIG', () => {
  it('matches the task\'s own ~6s idle / ~20s hint cooldown', () => {
    expect(DEFAULT_IDLE_NUDGE_CONFIG.idleMs).toBe(6000)
    expect(DEFAULT_IDLE_NUDGE_CONFIG.hintCooldownMs).toBe(20_000)
  })
})
