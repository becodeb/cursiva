// Synthesized SFX palette (T35). Node env, no DOM — the same fake-context
// convention `canvas/traceTone.test.ts` already uses for a live audio node.
import { describe, expect, it, vi } from 'vitest'
import {
  collectDef,
  isSfxMuted,
  MASTER_GAIN,
  onRisingEdge,
  playSfx,
  SFX_PALETTE,
  sfxDuration,
  sfxFrequencies,
  sfxPeakGain,
  type SfxName,
} from './sfx'
import { VOICE_SETTINGS_KEY, type StorageLike } from '../voice/narrator'

function fakeAudio() {
  const gain = { gain: { value: 0.0001, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() }, connect: vi.fn() }
  const osc = {
    type: '',
    frequency: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  }
  const ctx = {
    currentTime: 0,
    destination: {},
    resume: vi.fn(() => Promise.resolve()),
    createOscillator: vi.fn(() => ({ ...osc, frequency: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() } })),
    createGain: vi.fn(() => ({
      gain: { value: 0.0001, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
      connect: vi.fn(),
    })),
  }
  return ctx as unknown as AudioContext & {
    createOscillator: ReturnType<typeof vi.fn>
    createGain: ReturnType<typeof vi.fn>
    resume: ReturnType<typeof vi.fn>
  }
}

function memoryStorage(initial: Record<string, string> = {}): StorageLike {
  const store = { ...initial }
  return {
    getItem: (key) => (key in store ? store[key] : null),
    setItem: (key, value) => {
      store[key] = value
    },
  }
}

const ALL_NAMES: readonly SfxName[] = [
  'collect',
  'clean',
  'found',
  'spine',
  'snakeColour',
  'right',
  'wrong',
  'rescue',
  'tap',
  'notebook',
]

describe('SFX_PALETTE (definitions)', () => {
  it('names all ten sounds the task brief asks for', () => {
    expect(Object.keys(SFX_PALETTE).sort()).toEqual([...ALL_NAMES].sort())
  })

  it('keeps every sound at or under the ~400ms budget, except the rescue fanfare', () => {
    for (const name of ALL_NAMES) {
      const duration = sfxDuration(SFX_PALETTE[name])
      if (name === 'rescue') {
        // A 3-5 note fanfare cannot fit under the same budget as a one-shot
        // pop — it is the one deliberate exception (see the module header).
        expect(duration).toBeGreaterThan(0.4)
        expect(duration).toBeLessThan(1.5)
      } else {
        expect(duration).toBeGreaterThan(0)
        expect(duration).toBeLessThanOrEqual(0.4)
      }
    }
  })

  it('never authors a peak above MASTER_GAIN — no clipping, by construction', () => {
    expect(MASTER_GAIN).toBeLessThanOrEqual(0.25)
    for (const name of ALL_NAMES) {
      expect(sfxPeakGain(SFX_PALETTE[name])).toBeLessThanOrEqual(MASTER_GAIN)
      expect(sfxPeakGain(SFX_PALETTE[name])).toBeGreaterThan(0)
    }
  })

  it('keeps every frequency in a pleasant, child-friendly range', () => {
    for (const name of ALL_NAMES) {
      for (const freq of sfxFrequencies(SFX_PALETTE[name])) {
        expect(freq).toBeGreaterThanOrEqual(150)
        expect(freq).toBeLessThanOrEqual(2000)
      }
    }
  })

  it('has at least one note in every sound and starts every note at t >= 0', () => {
    for (const name of ALL_NAMES) {
      const def = SFX_PALETTE[name]
      expect(def.notes.length).toBeGreaterThan(0)
      for (const note of def.notes) expect(note.start).toBeGreaterThanOrEqual(0)
    }
  })
})

describe('collect (rising pitch per item)', () => {
  it('rises with a higher index and holds once capped', () => {
    const freqs = [0, 1, 2, 3, 4, 5, 6, 20].map((i) => sfxFrequencies(collectDef(i))[0])
    for (let i = 1; i < freqs.length; i++) expect(freqs[i]).toBeGreaterThanOrEqual(freqs[i - 1])
    // Past the cap, further items must not keep climbing.
    expect(freqs[6]).toBeCloseTo(freqs[7], 5)
  })

  it('never rises into an unpleasant register even at a very high index', () => {
    for (const freq of sfxFrequencies(collectDef(999))) {
      expect(freq).toBeLessThanOrEqual(2000)
    }
  })

  it('treats a negative or fractional index as the first item', () => {
    expect(sfxFrequencies(collectDef(-3))).toEqual(sfxFrequencies(collectDef(0)))
    expect(sfxFrequencies(collectDef(1.9))).toEqual(sfxFrequencies(collectDef(1)))
  })
})

describe('wrong (no failure sound, docs/01 principle 2)', () => {
  it('never plays a descending interval — every note starts at the SAME instant', () => {
    const notes = SFX_PALETTE.wrong.notes
    expect(notes.length).toBeGreaterThan(0)
    const starts = new Set(notes.map((n) => n.start))
    expect(starts.size).toBe(1) // one instant, no sequence to read as falling
    for (const note of notes) expect(note.sweepTo).toBeUndefined() // no downward glide either
  })

  it('never crosses a descending minor third from any note into another', () => {
    // A minor third is a 5/6 frequency ratio (≈ -3 semitones). With every
    // note starting together (asserted above) there is no FROM/INTO at all,
    // but this also guards a future edit that adds a second, later note.
    const notes = [...SFX_PALETTE.wrong.notes].sort((a, b) => a.start - b.start)
    for (let i = 1; i < notes.length; i++) {
      const ratio = notes[i].freq / notes[i - 1].freq
      const isDescendingMinorThird = ratio < 1 && ratio <= 6 / 5 && ratio >= 5 / 6
      expect(isDescendingMinorThird).toBe(false)
    }
  })

  it('stays low and soft, not a bright alert', () => {
    for (const note of SFX_PALETTE.wrong.notes) {
      expect(note.freq).toBeLessThan(300)
      expect(note.peak * MASTER_GAIN).toBeLessThanOrEqual(MASTER_GAIN * 0.5)
    }
  })
})

describe('isSfxMuted (shared with the narrator)', () => {
  it('is false by default', () => {
    expect(isSfxMuted(memoryStorage())).toBe(false)
  })

  it('reads the SAME persisted flag voice/narrator.ts writes', () => {
    const storage = memoryStorage({ [VOICE_SETTINGS_KEY]: JSON.stringify({ muted: true }) })
    expect(isSfxMuted(storage)).toBe(true)
  })

  it('never throws on a corrupt payload', () => {
    const storage = memoryStorage({ [VOICE_SETTINGS_KEY]: '{not json' })
    expect(() => isSfxMuted(storage)).not.toThrow()
    expect(isSfxMuted(storage)).toBe(false)
  })
})

describe('playSfx (best-effort playback)', () => {
  it('touches no audio node while muted', () => {
    const ctx = fakeAudio()
    const storage = memoryStorage({ [VOICE_SETTINGS_KEY]: JSON.stringify({ muted: true }) })
    playSfx('tap', { ctx, storage })
    expect(ctx.createOscillator).not.toHaveBeenCalled()
  })

  it('schedules one oscillator per note when unmuted', () => {
    const ctx = fakeAudio()
    playSfx('right', { ctx, storage: memoryStorage() })
    expect(ctx.createOscillator).toHaveBeenCalledTimes(SFX_PALETTE.right.notes.length)
  })

  it('resumes the shared context (autoplay policy)', () => {
    const ctx = fakeAudio()
    playSfx('tap', { ctx, storage: memoryStorage() })
    expect(ctx.resume).toHaveBeenCalled()
  })

  it('is a silent no-op on a device with no Web Audio', () => {
    expect(() => playSfx('collect', { ctx: null, storage: memoryStorage() })).not.toThrow()
  })

  it('swallows a throwing context instead of breaking the caller', () => {
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
    expect(() => playSfx('rescue', { ctx: broken, storage: memoryStorage() })).not.toThrow()
  })

  it('passes the running index through to collect for its rising pitch', () => {
    const ctx = fakeAudio()
    const oscillators: { frequency: { setValueAtTime: ReturnType<typeof vi.fn> } }[] = []
    ctx.createOscillator.mockImplementation(() => {
      const osc = {
        type: '',
        frequency: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
        connect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
      }
      oscillators.push(osc)
      return osc
    })
    playSfx('collect', { ctx, index: 0, storage: memoryStorage() })
    playSfx('collect', { ctx, index: 3, storage: memoryStorage() })
    const firstFreq = oscillators[0].frequency.setValueAtTime.mock.calls[0][0] as number
    const laterFreq = oscillators[oscillators.length - 2].frequency.setValueAtTime.mock.calls[0][0] as number
    expect(laterFreq).toBeGreaterThan(firstFreq)
  })
})

describe('onRisingEdge (fire-once-per-transition gate)', () => {
  it('fires exactly once on the false -> true edge, never on repeated true', () => {
    const onRise = vi.fn()
    onRisingEdge(false, false, onRise)
    onRisingEdge(false, true, onRise)
    onRisingEdge(true, true, onRise)
    onRisingEdge(true, true, onRise)
    expect(onRise).toHaveBeenCalledTimes(1)
  })

  it('never fires on a true -> false transition', () => {
    const onRise = vi.fn()
    onRisingEdge(true, false, onRise)
    expect(onRise).not.toHaveBeenCalled()
  })

  it('fires again on a genuinely NEW rising edge after returning to false', () => {
    const onRise = vi.fn()
    onRisingEdge(false, true, onRise)
    onRisingEdge(true, false, onRise)
    onRisingEdge(false, true, onRise)
    expect(onRise).toHaveBeenCalledTimes(2)
  })

  it('models a real per-tick loop: a level tracked frame by frame fires once for its whole run', () => {
    const onRise = vi.fn()
    const frames = [false, false, false, true, true, true, true]
    let prev = false
    for (const done of frames) {
      onRisingEdge(prev, done, onRise)
      prev = done
    }
    expect(onRise).toHaveBeenCalledTimes(1)
  })
})
