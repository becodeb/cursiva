// Live DEV overlay state for the checkpoint overlay: which checkpoints have been
// activated in strict order, whether a wrong-direction contact occurred, an
// approximate distance-based score against the ideal cloud, and whether the
// trace is complete. Reuses the existing validation primitives — no new scoring
// or ordering logic is introduced here.
import type { LetterCheckpoint, Point, PointerType } from '../letters/types'
import { checkCheckpointOrder } from './validation/checkpoints'
import { resample } from './resample'
import { penScore, touchScore } from './validation/score'

export interface DevCheckpointState {
  /** Checkpoint orders activated in strict order so far. */
  activated: number[]
  /** A wrong-direction (out-of-order) contact was detected. */
  wrongDirection: boolean
  /** 0..100, geometric distance score against the ideal cloud. */
  score: number
  /** All checkpoints activated in correct order (the rail is complete). */
  complete: boolean
}

/**
 * Compute the live dev state from the current stroke. Order/completeness come
 * from `checkCheckpointOrder`; the score resamples the stroke and scores it
 * against the dense ideal cloud with the design-fixed tolerance for the pointer
 * type (touch wider). An empty stroke scores 0.
 */
export function devCheckpointState(
  points: Point[],
  checkpoints: LetterCheckpoint[],
  ideal: ReadonlyArray<readonly [number, number]>,
  pointerType: PointerType = 'mouse',
): DevCheckpointState {
  const order = checkCheckpointOrder(points, checkpoints)
  const resampled = resample(points)
  const score = resampled.length === 0
    ? 0
    : pointerType === 'touch'
      ? touchScore(resampled, ideal)
      : penScore(resampled, ideal)
  return {
    activated: order.activated,
    wrongDirection: order.wrongDirection,
    score,
    complete: order.orderPassed,
  }
}
