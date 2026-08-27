import { describe, expect, it } from 'vitest'
import { letraA } from '../../letters/letra_a'
import { letraC } from '../../letters/letra_c'
import { samplePath } from '../resample'
import { checkContinuity } from './continuity'

describe('checkContinuity (lift before the final checkpoint)', () => {
  it('is continuous when the full `a` stroke reaches gancho_salida (order 6)', () => {
    const stroke = samplePath(letraA.pathDefinition.d)
    expect(checkContinuity(stroke, letraA.pathDefinition.checkpoints)).toBe(true)
  })

  it('is continuous when the full `c` stroke reaches salida_gancho (order 5)', () => {
    const stroke = samplePath(letraC.pathDefinition.d)
    expect(checkContinuity(stroke, letraC.pathDefinition.checkpoints)).toBe(true)
  })

  it('marks isContinuous=false when the pen lifts right after checkpoint 2 of `a`', () => {
    // Lifts after subida_ola (order 2) — the final checkpoint cierre_ovalo
    // (467.8,413.2, co-located with entry) is never reached.
    const earlyLift = [
      { x: 406.2, y: 357.9 }, // order 2: subida_ola
      { x: 538.6, y: 186.8 }, // order 3: cresta_ola
      { x: 593.8, y: 245 }, // order 4: gancho_salida
      { x: 562.7, y: 413.2 }, // order 5: bajada_pie
    ]
    expect(checkContinuity(earlyLift, letraA.pathDefinition.checkpoints)).toBe(false)
  })

  it('marks isContinuous=false when the stroke stops short of the final zone', () => {
    // Reaches cresta_ola (order 3) but lifts before cierre/bajada.
    const short = [
      { x: 406.2, y: 357.9 },
      { x: 538.6, y: 186.8 },
    ]
    expect(checkContinuity(short, letraA.pathDefinition.checkpoints)).toBe(false)
  })

  it('is continuous when the stroke passes THROUGH the final zone, even if it then leaves it', () => {
    // Order is not judged here: reaching the final checkpoint before the lift
    // is what continuity means (approval ANDs order + continuity + score). The
    // final zone is cierre_ovalo (467.8,413.2).
    const through = [
      { x: 467.8, y: 413.2 }, // order 6: cierre_ovalo (the final zone)
      { x: 562.7, y: 413.2 },
    ]
    expect(checkContinuity(through, letraA.pathDefinition.checkpoints)).toBe(true)
  })

  it('returns false on degenerate input', () => {
    expect(checkContinuity([], letraA.pathDefinition.checkpoints)).toBe(false)
    expect(checkContinuity([{ x: 350, y: 420 }], [])).toBe(false)
  })
})