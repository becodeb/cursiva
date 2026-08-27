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
    // Spec scenario: lifts after activating order 2 (cresta_ola) — the final
    // checkpoint (550,400) is never reached.
    const earlyLift = [
      { x: 350, y: 420 }, // order 1: inicio_enganche
      { x: 480, y: 200 }, // order 2: cresta_ola (co-located with order 4)
    ]
    expect(checkContinuity(earlyLift, letraA.pathDefinition.checkpoints)).toBe(false)
  })

  it('marks isContinuous=false when the stroke stops short inside the oval', () => {
    // Reaches retorno_curva (order 3) but lifts before cierre/gancho.
    const short = [
      { x: 350, y: 420 },
      { x: 480, y: 200 },
      { x: 330, y: 300 },
    ]
    expect(checkContinuity(short, letraA.pathDefinition.checkpoints)).toBe(false)
  })

  it('is continuous when the stroke passes THROUGH the final zone, even if it then leaves it', () => {
    // Order is not judged here: reaching the final checkpoint before the lift
    // is what continuity means (approval ANDs order + continuity + score).
    const through = [
      { x: 550, y: 400 }, // order 6: gancho_salida
      { x: 480, y: 420 },
    ]
    expect(checkContinuity(through, letraA.pathDefinition.checkpoints)).toBe(true)
  })

  it('returns false on degenerate input', () => {
    expect(checkContinuity([], letraA.pathDefinition.checkpoints)).toBe(false)
    expect(checkContinuity([{ x: 350, y: 420 }], [])).toBe(false)
  })
})