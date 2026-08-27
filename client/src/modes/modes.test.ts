// U6a focused tests: the guided rail state is PURE (guidedTrace) and asserted
// here in node; the component/DOM behavior (demo timing, input gating,
// exactly-once feedback...) runs in the browser runtime harness instead
// (headless Chromium + CDP, as in U5). Free-trace evaluation and the tone
// arrive with work unit 6b in the same file.
import { describe, expect, it } from 'vitest'
import { guidedFollowState } from './guidedTrace'
import { samplePath } from '../canvas/resample'
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