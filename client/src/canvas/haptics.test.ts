// Haptic off-path pulse. The whole module exists for ONE rule — fire on the
// transition into off-path, never while still off-path — because the off-path
// signal is a 10 Hz LEVEL, not an event (docs/02 §7).
import { describe, expect, it, vi } from 'vitest'
import { OFF_PATH_PULSE_MS, pulseOnLeaving, shouldPulse } from './haptics'

describe('shouldPulse (transition edge)', () => {
  it('pulses on the rising edge: inside → outside', () => {
    expect(shouldPulse(false, true)).toBe(true)
  })

  it('does NOT pulse while still outside — that would nag ten times a second', () => {
    expect(shouldPulse(true, true)).toBe(false)
  })

  it('does not pulse on the falling edge: coming back is not an event to buzz', () => {
    expect(shouldPulse(true, false)).toBe(false)
  })

  it('does not pulse while inside', () => {
    expect(shouldPulse(false, false)).toBe(false)
  })

  it('a whole 10 Hz excursion buzzes exactly once', () => {
    // One second inside, one second outside, one second back inside.
    const samples = [
      ...Array<boolean>(10).fill(false),
      ...Array<boolean>(10).fill(true),
      ...Array<boolean>(10).fill(false),
    ]
    let previous = false
    let pulses = 0
    for (const sample of samples) {
      if (shouldPulse(previous, sample)) pulses++
      previous = sample
    }
    expect(pulses).toBe(1)
  })
})

describe('pulseOnLeaving (feature detection)', () => {
  it('vibrates once, with the off-path duration', () => {
    const vibrate = vi.fn(() => true)
    expect(pulseOnLeaving(false, true, { vibrate })).toBe(true)
    expect(vibrate).toHaveBeenCalledExactlyOnceWith(OFF_PATH_PULSE_MS)
  })

  it('does not vibrate when there is no transition', () => {
    const vibrate = vi.fn(() => true)
    expect(pulseOnLeaving(true, true, { vibrate })).toBe(false)
    expect(vibrate).not.toHaveBeenCalled()
  })

  it('is a silent no-op where the API is absent (desktop, iOS Safari, node)', () => {
    expect(pulseOnLeaving(false, true, {})).toBe(false)
    expect(pulseOnLeaving(false, true, null)).toBe(false)
  })

  it('swallows a throwing implementation: haptics never break the capture loop', () => {
    const vibrate = vi.fn(() => {
      throw new Error('no motor')
    })
    expect(() => pulseOnLeaving(false, true, { vibrate })).not.toThrow()
    expect(pulseOnLeaving(false, true, { vibrate })).toBe(false)
  })
})
