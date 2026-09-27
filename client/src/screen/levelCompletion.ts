// What one stroke release decides for a level whose "done" is COUNTED in
// parts — the hedgehog's spines, the snakes' colour, the collect items —
// rather than scored from the stroke list alone. Pure, DOM-free: this is
// the decision `LevelPlay.tsx`'s `onRelease` makes, pulled out so a node
// test can replay a whole attempt through it (`levelCompletion.test.ts`).
import type { LevelAttempt } from '../game/types'
import { settleSpineRelease, spinesComplete, type SpineConfig, type SpineState } from '../levels/spines'
import type { SnakeColourState } from './snakeColour'

export interface ReleaseInput {
  /** `evaluateLevel` on this release's own snapshot. */
  readonly evaluated: LevelAttempt
  /** Every stroke the canvas still holds, the one just released LAST. */
  readonly snapshot: ReadonlyArray<ReadonlyArray<{ x: number; y: number }>>
  /** A collect level: whether its last item is already collected. */
  readonly collectComplete?: boolean
  /** A hedgehog level: the spine latch before this release. */
  readonly spines?: { readonly prev: SpineState; readonly cfg: SpineConfig }
  /** A snake level: the colour latch as of this release. */
  readonly snakes?: SnakeColourState
}

export interface ReleaseOutcome {
  readonly attempt: LevelAttempt
  /** The spine latch after this release (hedgehog levels only). */
  readonly spineState?: SpineState
  /** Whether the stroke just released became a spine. */
  readonly spineAccepted?: boolean
}

/** Every snake piece traced end to end — the snake level's own "done". */
export function snakesComplete(state: SnakeColourState): boolean {
  return state.pieces.length > 0 && state.pieces.every((p) => p.done)
}

/**
 * The attempt a parts-counted level reports: `evaluateLevel`'s pillar
 * numbers stay as measured, but approval is the parts being done, and a
 * not-yet-done attempt names no failed pillar beyond what it measured.
 */
export function withPartsApproval(evaluated: LevelAttempt, done: boolean): LevelAttempt {
  return { ...evaluated, approved: done, failedPillar: done ? null : (evaluated.failedPillar ?? 'accuracy') }
}

/**
 * T39 (`odd/tasks/prewriting-stage-completion.md`). ROOT CAUSE of both
 * "every part is done and the level never ends" reports: approval for the
 * hedgehog and the snakes came from `evaluateLevel` re-scoring the canvas's
 * stroke buffer, while what the child SEES done is a separate latch that
 * survives the buffer being emptied mid-attempt (the spine latch, T30; the
 * snake colour latch, T20). The buffer IS emptied mid-attempt: on every
 * snake level by `onStart`'s clear-on-failed-retry (each piece's own
 * release is unapproved until the last, so only the LAST snake's stroke was
 * ever scored — against all three routes), and on the hedgehog by the
 * level's mount effect re-running `resetSurface` whenever an adaptive widen
 * rebuilt `target` (every third unapproved release — and every spine but the
 * last is unapproved). So the latch reached "all done" and the score never
 * could. Approval now comes from the latch the child sees — the same move
 * T17/T29 already made for collect levels — and the spine latch folds only
 * the stroke just released (`settleSpineRelease`), never a re-walk.
 */
export function releaseOutcome(input: ReleaseInput): ReleaseOutcome {
  const { evaluated, snapshot } = input
  if (input.spines) {
    const { prev, cfg } = input.spines
    const last = snapshot[snapshot.length - 1] ?? []
    const { state, accepted } = settleSpineRelease(prev, last, cfg)
    const done = spinesComplete(state, cfg)
    // The accuracy pillar for a hedgehog IS the filled fraction
    // (`spineScore`'s own definition), read from the latch instead of a
    // fresh walk of a buffer that may no longer hold every spine.
    const accuracy = Math.round((100 * state.filled.size) / cfg.count)
    return { attempt: withPartsApproval({ ...evaluated, accuracy }, done), spineState: state, spineAccepted: accepted }
  }
  if (input.snakes) return { attempt: withPartsApproval(evaluated, snakesComplete(input.snakes)) }
  if (input.collectComplete !== undefined) {
    return { attempt: { ...evaluated, approved: input.collectComplete, failedPillar: null } }
  }
  return { attempt: evaluated }
}
