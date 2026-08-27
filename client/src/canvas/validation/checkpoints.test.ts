import { describe, expect, it } from 'vitest'
import { letraA } from '../../letters/letra_a'
import { samplePath } from '../resample'
import { checkCheckpointOrder } from './checkpoints'

const { checkpoints } = letraA.pathDefinition

describe('checkCheckpointOrder (strict order 1→N over resampled points)', () => {
  it('activates all six `a` checkpoints in order on a counterclockwise trace', () => {
    // The ideal ductus IS the counterclockwise `a`: every checkpoint center
    // lies on the path and the arc resample preserves traversal order. The
    // co-located apex pair (orders 2/4, 480,200) must resolve by ENTRY order:
    // first visit activates 2, the re-entry activates 4.
    const stroke = samplePath(letraA.pathDefinition.d)
    const result = checkCheckpointOrder(stroke, checkpoints)
    expect(result.orderPassed).toBe(true)
    expect(result.wrongDirection).toBe(false)
    expect(result.activated).toEqual([1, 2, 3, 4, 5, 6])
  })

  it('passes a deterministic ascending traversal through the checkpoint centers', () => {
    const centers = [
      { x: 350, y: 420 },
      { x: 480, y: 200 },
      { x: 330, y: 300 },
      { x: 480, y: 200 },
      { x: 480, y: 420 },
      { x: 550, y: 400 },
    ]
    const result = checkCheckpointOrder(centers, checkpoints)
    expect(result.orderPassed).toBe(true)
    expect(result.wrongDirection).toBe(false)
    expect(result.activated).toEqual([1, 2, 3, 4, 5, 6])
  })

  it('fails a clockwise `a` and flags wrong direction (criterion 1, mechanical)', () => {
    // Reverse traversal of the centers = clockwise around the oval: the
    // stroke first contacts the gancho (order 6) while order 1 is still due.
    const reversed = [
      { x: 550, y: 400 },
      { x: 480, y: 420 },
      { x: 480, y: 200 },
      { x: 330, y: 300 },
      { x: 480, y: 200 },
      { x: 350, y: 420 },
    ]
    const result = checkCheckpointOrder(reversed, checkpoints)
    expect(result.orderPassed).toBe(false)
    expect(result.wrongDirection).toBe(true)
  })

  it('fails when cresta_ola is skipped (never entered)', () => {
    // inicio → retorno direct: the apex zone (orders 2/4) is never touched.
    const skipped = [
      { x: 350, y: 420 },
      { x: 330, y: 300 },
      { x: 480, y: 420 },
      { x: 550, y: 400 },
    ]
    const result = checkCheckpointOrder(skipped, checkpoints)
    expect(result.orderPassed).toBe(false)
    expect(result.activated).toEqual([1])
    // retorno_curva (order 3) contacted before cresta_ola (order 2) — the
    // stroke jumped ahead, so the rescue guidance flags direction (docs/02).
    expect(result.wrongDirection).toBe(true)
  })

  it('fails a partial stroke that lifts after checkpoint 2 without a direction fault', () => {
    const partial = [
      { x: 350, y: 420 },
      { x: 480, y: 200 },
    ]
    const result = checkCheckpointOrder(partial, checkpoints)
    expect(result.orderPassed).toBe(false)
    expect(result.wrongDirection).toBe(false)
    expect(result.activated).toEqual([1, 2])
  })

  it('fails out-of-order activation even when every checkpoint is eventually contacted', () => {
    // Starts at the apex (orders 2/4 first), then completes the ductus: all
    // six activate, but the first contact was out of order → order fails.
    const outOfOrder = [
      { x: 480, y: 200 },
      { x: 350, y: 420 },
      { x: 480, y: 200 },
      { x: 330, y: 300 },
      { x: 480, y: 200 },
      { x: 480, y: 420 },
      { x: 550, y: 400 },
    ]
    const result = checkCheckpointOrder(outOfOrder, checkpoints)
    expect(result.orderPassed).toBe(false)
    expect(result.wrongDirection).toBe(true)
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