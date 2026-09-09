// Reset-on-contact debounce (`LevelConfig.resetOnContact`, docs/01 principle 2).
// The whole risk of this rule is resetting a child who never actually left the
// corridor, so these tests are mostly about what must NOT trip it.
import { describe, expect, it } from 'vitest'
import { contactTick, NO_CONTACT, RESET_CONTACT_TICKS } from './resetOnContact'

describe('contactTick (debouncing the ~10 Hz contact sample)', () => {
  it('never resets while the fingertip stays inside', () => {
    let state = NO_CONTACT
    for (let i = 0; i < 20; i++) {
      state = contactTick(state, false)
      expect(state.reset).toBe(false)
      expect(state.consecutive).toBe(0)
    }
  })

  it('does NOT reset on a single sample — that is digitiser jitter, not a child', () => {
    const state = contactTick(NO_CONTACT, true)
    expect(state.reset).toBe(false)
    expect(state.consecutive).toBe(1)
  })

  it('resets once contact HOLDS for the configured number of samples', () => {
    let state = NO_CONTACT
    for (let i = 1; i < RESET_CONTACT_TICKS; i++) {
      state = contactTick(state, true)
      expect(state.reset).toBe(false)
    }
    state = contactTick(state, true)
    expect(state.reset).toBe(true)
  })

  it('two ticks is the shipped rule: out, out → restart', () => {
    expect(RESET_CONTACT_TICKS).toBe(2)
    const first = contactTick(NO_CONTACT, true)
    expect(first.reset).toBe(false)
    expect(contactTick(first, true).reset).toBe(true)
  })

  it('one clean sample in between clears the count, so alternating never resets', () => {
    // A finger riding the very edge of the channel samples in-out-in-out. That
    // child is inside the corridor and must not be sent back.
    let state = NO_CONTACT
    for (let i = 0; i < 20; i++) {
      state = contactTick(state, i % 2 === 0)
      expect(state.reset).toBe(false)
    }
  })

  it('is an EDGE, not a level: holding on a wall does not reset ten times a second', () => {
    let state = NO_CONTACT
    let resets = 0
    // Twenty consecutive contact samples — two seconds of a finger parked on
    // the wall — must restart the run once per earned streak, never per sample.
    for (let i = 0; i < 20; i++) {
      state = contactTick(state, true)
      if (state.reset) resets++
    }
    expect(resets).toBe(20 / RESET_CONTACT_TICKS)
  })

  it('re-arms from scratch after a reset', () => {
    const tripped = contactTick(contactTick(NO_CONTACT, true), true)
    expect(tripped.reset).toBe(true)
    expect(tripped.consecutive).toBe(0)
  })

  it('finger up returns the exact NO_CONTACT state, so a new run starts clean', () => {
    expect(contactTick({ consecutive: 1, reset: false }, false)).toEqual(NO_CONTACT)
  })

  it('a ticks override of 1 resets immediately, and 0 cannot mean "never"', () => {
    expect(contactTick(NO_CONTACT, true, 1).reset).toBe(true)
    // Guarded to at least one: a zero threshold would otherwise reset on a
    // sample that reported no contact at all.
    expect(contactTick(NO_CONTACT, true, 0).reset).toBe(true)
    expect(contactTick(NO_CONTACT, false, 0).reset).toBe(false)
  })
})
