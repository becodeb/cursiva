// Strict checkpoint-order validation (trace-validation "Checkpoint Order
// Validation"): a checkpoint activates when the stroke ENTERS its radius zone
// (outside → inside transition), and activation MUST proceed in strictly
// increasing order 1→N. Contacting a HIGHER-order zone while a lower-order
// checkpoint is still pending is an out-of-order activation → order FAILS and
// the wrong-direction flag is set (docs/02 rescue; docs/04 criterion 1,
// mechanical). Contacting only already-passed zones is benign.
//
// Co-located checkpoints (letra_a: cresta_ola order 2 and cierre_ovalo order 4
// share center+radius at 480,200 — "order-gated" per design.md) are resolved
// by ENTRY order: the first apex visit activates 2, the re-entry activates 4.
// That is why activation tracks entry transitions, not mere containment — a
// stroke lingering inside a zone must not re-trigger it.
import type { LetterCheckpoint, Point } from '../../letters/types'

export interface CheckpointOrderResult {
  orderPassed: boolean
  wrongDirection: boolean
  /** Checkpoint orders activated, in temporal order (strictly increasing). */
  activated: number[]
}

function dist(a: Point, b: Point): number {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return Math.hypot(dx, dy)
}

/** Checkpoints sorted by ascending `order` (seeds are ordered; callers need not be). */
function byOrder(checkpoints: LetterCheckpoint[]): LetterCheckpoint[] {
  return [...checkpoints].sort((a, b) => a.order - b.order)
}

/**
 * Walk the resampled stroke in temporal order, activating each checkpoint the
 * moment the stroke first enters its radius, and only while it is the next
 * expected order. Returns whether ALL checkpoints activated in strict order,
 * whether a wrong-direction contact occurred, and the activation record.
 *
 * Empty/degenerate input never passes — a defensive floor, not an approval
 * (callers skip evaluation when resample is null).
 */
export function checkCheckpointOrder(
  points: Point[],
  checkpoints: LetterCheckpoint[],
): CheckpointOrderResult {
  const sorted = byOrder(checkpoints)
  const activated: number[] = []
  const inside = new Array<boolean>(sorted.length).fill(false)
  let expectedOrder = 1
  let wrongDirection = false

  for (const p of points) {
    const entered: number[] = []
    for (let i = 0; i < sorted.length; i++) {
      const cp = sorted[i]
      const nowInside = dist(p, cp) <= cp.radius
      if (nowInside && !inside[i]) entered.push(cp.order)
      inside[i] = nowInside
    }
    if (entered.length === 0) continue
    if (entered.includes(expectedOrder)) {
      // Expected checkpoint reached — activate it. Simultaneously-entered
      // higher orders are co-located zones (the apex pair), not a direction
      // fault: the same point cannot distinguish them.
      activated.push(expectedOrder)
      expectedOrder += 1
      continue
    }
    if (entered.some((order) => order > expectedOrder)) {
      wrongDirection = true
    }
  }

  return {
    orderPassed: sorted.length > 0 && !wrongDirection && activated.length === sorted.length,
    wrongDirection,
    activated,
  }
}