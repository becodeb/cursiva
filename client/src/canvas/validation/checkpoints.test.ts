import { describe, expect, it } from 'vitest'
import { letraA } from '../../letters/letra_a'
import { samplePath } from '../resample'
import { checkCheckpointOrder } from './checkpoints'

const { checkpoints } = letraA.pathDefinition
// NEW checkpoint coords (Kalam-derived, order 1→6):
//   entry 467.8,413.2 · subida 406.2,357.9 · cresta 538.6,186.8 ·
//   gancho 593.8,245 · bajada 562.7,413.2 · cierre 467.8,413.2 (co-located with entry)
const entry = { x: 467.8, y: 413.2 }
const subida = { x: 406.2, y: 357.9 }
const cresta = { x: 538.6, y: 186.8 }
const gancho = { x: 593.8, y: 245 }
const bajada = { x: 562.7, y: 413.2 }
const cierre = { x: 467.8, y: 413.2 }

describe('checkCheckpointOrder (strict order 1→N over resampled points)', () => {
  it('activates all six `a` checkpoints in natural drawing order', () => {
    const stroke = [entry, subida, cresta, gancho, bajada, cierre]
    const result = checkCheckpointOrder(stroke, checkpoints)
    expect(result.orderPassed).toBe(true)
    expect(result.wrongDirection).toBe(false)
    expect(result.activated).toEqual([1, 2, 3, 4, 5, 6])
  })

  it('passes a deterministic ascending traversal through the checkpoint centers', () => {
    const centers = [entry, subida, cresta, gancho, bajada, cierre]
    const result = checkCheckpointOrder(centers, checkpoints)
    expect(result.orderPassed).toBe(true)
    expect(result.wrongDirection).toBe(false)
    expect(result.activated).toEqual([1, 2, 3, 4, 5, 6])
  })

  it('fails a clockwise `a` and flags wrong direction (criterion 1, mechanical)', () => {
    // Reverse traversal: the stroke first contacts the cierre/gancho zone while
    // order 1 is still due.
    const reversed = [cierre, bajada, gancho, cresta, subida, entry]
    const result = checkCheckpointOrder(reversed, checkpoints)
    expect(result.orderPassed).toBe(false)
    expect(result.wrongDirection).toBe(true)
  })

  it('fails when cresta_ola is skipped (never entered)', () => {
    // entry → subida direct: the cresta zone (order 3) is never touched.
    const skipped = [entry, subida, gancho, bajada, cierre]
    const result = checkCheckpointOrder(skipped, checkpoints)
    expect(result.orderPassed).toBe(false)
    expect(result.wrongDirection).toBe(true)
  })

  it('fails a partial stroke that lifts after checkpoint 2 without a direction fault', () => {
    const partial = [entry, subida]
    const result = checkCheckpointOrder(partial, checkpoints)
    expect(result.orderPassed).toBe(false)
    expect(result.wrongDirection).toBe(false)
    expect(result.activated).toEqual([1, 2])
  })

  it('fails out-of-order activation even when every checkpoint is eventually contacted', () => {
    // Starts at the cresta (order 3) while order 1 is still due → direction fault.
    const outOfOrder = [cresta, entry, subida, gancho, bajada, cierre]
    const result = checkCheckpointOrder(outOfOrder, checkpoints)
    expect(result.orderPassed).toBe(false)
    expect(result.wrongDirection).toBe(true)
  })

  it('co-located entry/cierre pair resolves by ENTRY order across a full loop', () => {
    // A full loop starts at entry (activates 1), returns to the same point at the
    // end (re-entry activates 6) — the order-gated apex behavior.
    const loop = [entry, subida, cresta, gancho, bajada, cierre]
    const result = checkCheckpointOrder(loop, checkpoints)
    expect(result.orderPassed).toBe(true)
    expect(result.activated).toEqual([1, 2, 3, 4, 5, 6])
  })

  it('the real `a` ductus spans every checkpoint (coverage)', () => {
    const ductus = samplePath(letraA.pathDefinition.d)
    for (const cp of checkpoints) {
      const min = Math.min(...ductus.map((p) => Math.hypot(p.x - cp.x, p.y - cp.y)))
      expect(min).toBeLessThanOrEqual(cp.radius)
    }
  })

  it('passing through an already-activated zone again is benign (entry semantics)', () => {
    // El niño repasa una zona ya activada antes de seguir: no debe romper el orden.
    const stroke = [entry, subida, entry, cresta, gancho, entry, bajada, cierre]
    const result = checkCheckpointOrder(stroke, checkpoints)
    expect(result.orderPassed).toBe(true)
    expect(result.wrongDirection).toBe(false)
    expect(result.activated).toEqual([1, 2, 3, 4, 5, 6])
  })

  it('degrades safely on empty input and empty checkpoints', () => {
    expect(checkCheckpointOrder([], checkpoints)).toEqual({
      orderPassed: false,
      wrongDirection: false,
      activated: [],
    })
    expect(checkCheckpointOrder([{ x: 300, y: 300 }], [])).toEqual({
      orderPassed: false,
      wrongDirection: false,
      activated: [],
    })
  })
})
