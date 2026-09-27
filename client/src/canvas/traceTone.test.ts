// Live audio channels. The behavioural contract is best-effort and lazy: no
// AudioContext is touched until the child is actually inside the corridor, the
// gain is RAMPED (a stepped gain clicks), and every failure path is silent.
import { describe, expect, it, vi } from 'vitest'
import { createTraceTone } from './traceTone'

interface FakeParam {
  value: number
  setValueAtTime: ReturnType<typeof vi.fn>
  exponentialRampToValueAtTime: ReturnType<typeof vi.fn>
  cancelScheduledValues: ReturnType<typeof vi.fn>
}

function fakeParam(): FakeParam {
  return {
    value: 0.0001,
    setValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
    cancelScheduledValues: vi.fn(),
  }
}

function fakeAudio() {
  const gain = { gain: fakeParam(), connect: vi.fn(), disconnect: vi.fn() }
  const osc = {
    type: '',
    frequency: fakeParam(),
    connect: vi.fn(),
    disconnect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  }
  const ctx = {
    currentTime: 0,
    destination: {},
    resume: vi.fn(() => Promise.resolve()),
    createOscillator: vi.fn(() => osc),
    createGain: vi.fn(() => gain),
  }
  return { ctx: ctx as unknown as AudioContext, osc, gain, raw: ctx }
}

describe('createTraceTone (sustained corridor tone)', () => {
  it('touches no audio node until the finger is first INSIDE the corridor', () => {
    const { ctx, raw } = fakeAudio()
    createTraceTone(ctx)
    expect(raw.createOscillator).not.toHaveBeenCalled()
  })

  it('starts one oscillator on the first activation and reuses it after that', () => {
    const { ctx, raw, osc } = fakeAudio()
    const tone = createTraceTone(ctx)
    tone.setActive(true)
    tone.setActive(false)
    tone.setActive(true)
    expect(raw.createOscillator).toHaveBeenCalledTimes(1)
    expect(osc.start).toHaveBeenCalledTimes(1)
  })

  it('RAMPS the gain rather than stepping it — a stepped gain clicks', () => {
    const { ctx, gain } = fakeAudio()
    const tone = createTraceTone(ctx)
    tone.setActive(true)
    expect(gain.gain.exponentialRampToValueAtTime).toHaveBeenCalled()
    const [target, when] = gain.gain.exponentialRampToValueAtTime.mock.calls.at(-1)!
    expect(target).toBeGreaterThan(0.0001)
    expect(when).toBeGreaterThan(0) // a ramp, not an instant set
  })

  it('fades DOWN toward silence when the finger leaves the corridor', () => {
    const { ctx, gain } = fakeAudio()
    const tone = createTraceTone(ctx)
    tone.setActive(true)
    const up = gain.gain.exponentialRampToValueAtTime.mock.calls.at(-1)![0]
    tone.setActive(false)
    const down = gain.gain.exponentialRampToValueAtTime.mock.calls.at(-1)![0]
    expect(down).toBeLessThan(up)
  })

  it('ignores a repeated activation: one state change, one ramp', () => {
    const { ctx, gain } = fakeAudio()
    const tone = createTraceTone(ctx)
    tone.setActive(true)
    tone.setActive(true)
    tone.setActive(true)
    expect(gain.gain.exponentialRampToValueAtTime).toHaveBeenCalledTimes(1)
  })

  it('resumes the context on activation (autoplay policy)', () => {
    const { ctx, raw } = fakeAudio()
    createTraceTone(ctx).setActive(true)
    expect(raw.resume).toHaveBeenCalled()
  })

  it('stops and disconnects on dispose, and goes inert afterwards', () => {
    const { ctx, osc, gain, raw } = fakeAudio()
    const tone = createTraceTone(ctx)
    tone.setActive(true)
    tone.dispose()
    expect(osc.stop).toHaveBeenCalled()
    expect(osc.disconnect).toHaveBeenCalled()
    expect(gain.disconnect).toHaveBeenCalled()
    tone.setActive(true) // must not resurrect the tone after the screen is gone
    expect(raw.createOscillator).toHaveBeenCalledTimes(1)
  })

  it('is a silent no-op on a device with no Web Audio', () => {
    const tone = createTraceTone(null)
    expect(() => {
      tone.setActive(true)
      tone.setActive(false)
      tone.dispose()
    }).not.toThrow()
  })

  it('swallows a throwing AudioContext instead of breaking the level', () => {
    const broken = {
      currentTime: 0,
      destination: {},
      createOscillator: () => {
        throw new Error('no device')
      },
      createGain: () => {
        throw new Error('no device')
      },
    } as unknown as AudioContext
    const tone = createTraceTone(broken)
    expect(() => tone.setActive(true)).not.toThrow()
  })
})
