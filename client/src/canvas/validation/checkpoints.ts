// Strict checkpoint-order validation (trace-validation "Checkpoint Order
// Validation"): a checkpoint activates by CONTAINMENT of the expected order —
// the expected checkpoint activates whenever the head is inside its radius
// zone, fresh outside→inside entry or not — and activation MUST proceed in
// strictly increasing order 1→N. Only the expected order ever activates, so
// co-located or overlapping zones stay order-gated (letra_a's cresta_ola /
// cierre_ovalo pair: the later order activates no earlier than when expected
// reaches it). Contacting a HIGHER-order zone while a lower-order checkpoint
// is still pending latches the wrong-direction flag (docs/02 rescue; docs/04
// criterion 1, mechanical); re-passing an already-activated zone is benign.
// A full strict-order pass resets a latched flag — pedagogically intended for
// reentrant letters like `c`, whose head enters a pending zone before its turn
// on the backtrack and then completes the pass (trace-validation "Reentrant c
// backtrack"). A genuine reversal still fails: it can never activate every
// checkpoint in strict order.
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
 * Walk the resampled stroke in temporal order, activating the expected
 * checkpoint the moment the head is inside its radius (containment), and only
 * while it is the next expected order. Returns whether ALL checkpoints
 * activated in strict order, whether a wrong-direction contact occurred, and
 * the activation record.
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
  let maxActivated = 0
  let wrongDirection = false
  const N = sorted.length

  for (const p of points) {
    const entered: number[] = []
    for (let i = 0; i < N; i++) {
      const cp = sorted[i]
      const nowInside = dist(p, cp) <= cp.radius
      if (nowInside && !inside[i]) entered.push(cp.order)
      inside[i] = nowInside
    }
    // Containment activation: the expected checkpoint activates whenever the
    // head sits inside its zone — fresh entry or not. Runs BEFORE the
    // early-continue guard because a reentrant head may already be inside the
    // expected zone with zero fresh entries (letter `c` backtrack model).
    // Simultaneously-contained higher orders are co-located zones (the seam
    // handoff pair), not a direction fault: activation only ever follows the
    // expected order.
    const before = activated.length
    while (expectedOrder <= N && inside[expectedOrder - 1]) {
      activated.push(expectedOrder)
      maxActivated = Math.max(maxActivated, expectedOrder)
      expectedOrder += 1
    }
    if (activated.length > before) continue // early-continue guard
    if (entered.length === 0) continue
    // Re-passing an ALREADY-activated zone is benign (containment semantics):
    // a child may retrace a completed checkpoint before continuing. Only an
    // entry into a still-pending, ahead-of-expected zone counts as a true
    // direction fault.
    const benignReentry = entered.some((order) => order <= maxActivated)
    if (!benignReentry && entered.some((order) => order > expectedOrder)) {
      wrongDirection = true
    }
  }

  // A full strict-order pass clears a latched wrong-direction flag: reentrant
  // letters touch a pending zone before its turn by design, and the reset
  // heals that on completion. Genuine reversals still fail — they never
  // activate every checkpoint in order.
  const fullPass = activated.length === N
  return {
    orderPassed: N > 0 && fullPass,
    wrongDirection: fullPass ? false : wrongDirection,
    activated,
  }
}