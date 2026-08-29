// Mode 2 — free trace (free-trace-mode spec, T5.2): the letter's ideal path
// renders as a FAINT guide; the user's stroke draws as fluid ink only — no
// score, tone, or star before release. On `pointerup` the composite
// evaluation runs EXACTLY once (order + continuity + score, tolerances
// widened for touch pointerType). Approval plays the soft tone (tone.ts) and
// shows the star; anything else shows rescue guidance (never the tone). A new
// stroke clears the previous feedback for an immediate clean retry.
import { useState } from 'react'
import { Approval } from '../canvas/validation/constants'
import { checkCheckpointOrder } from '../canvas/validation/checkpoints'
import { checkContinuity } from '../canvas/validation/continuity'
import { penScore, touchScore } from '../canvas/validation/score'
import { resample } from '../canvas/resample'
import TraceCanvas from '../canvas/TraceCanvas'
import { FeedbackResult } from './StarFeedback'
import { playApprovalTone } from './tone'
import type { EvaluationResult, LetterConfig, Point } from '../letters/types'

/**
 * Single-release evaluation (pure, node-testable): resample to K, then AND the
 * trace-validation verdicts — strict order, continuity, and the geometric
 * score with the DESIGN-FIXED tolerance for the pointer type (touch wider).
 * Exactly-once is the caller's contract: TraceCanvas fires onRelease once.
 */
export function evaluateTrace(points: Point[], letter: LetterConfig, pointerType: string): EvaluationResult {
  const resampled = resample(points)
  if (resampled.length === 0) {
    return { orderPassed: false, isContinuous: false, score: 0, approved: false, wrongDirection: false, activated: [] }
  }
  const cps = letter.pathDefinition.checkpoints
  const order = checkCheckpointOrder(resampled, cps)
  const isContinuous = checkContinuity(resampled, cps)
  const ideal = letter.pathDefinition.ideal
  const score = pointerType === 'touch' ? touchScore(resampled, ideal) : penScore(resampled, ideal)
  const approved = order.orderPassed && isContinuous && score >= Approval
  return {
    orderPassed: order.orderPassed,
    isContinuous,
    score,
    approved,
    wrongDirection: order.wrongDirection,
    activated: order.activated,
  }
}

export default function FreeTrace({
  letter,
  onEvaluate,
  showCheckpoints = false,
}: {
  letter: LetterConfig
  /** Release hook for the main screen: persists approval progress (T6.2). */
  onEvaluate?: (result: EvaluationResult) => void
  /** Production overlay toggle from the main screen (dev mode ignores it). */
  showCheckpoints?: boolean
}) {
  const [result, setResult] = useState<EvaluationResult | null>(null)

  const onRelease = (points: Point[], pointerType: string): void => {
    const r = evaluateTrace(points, letter, pointerType)
    setResult(r) // feedback appears exactly once per release
    if (r.approved) playApprovalTone() // approval tone ONLY on approval
    onEvaluate?.(r)
  }

  return (
    <TraceCanvas
      guide={letter.pathDefinition.d}
      guideD={letter.pathDefinition.guideD}
      onStart={() => setResult(null)} // clean retry: hide previous feedback
      onRelease={onRelease}
      devCheckpoints={letter.pathDefinition.checkpoints}
      devIdeal={letter.pathDefinition.ideal}
      showCheckpoints={showCheckpoints}
    >
      {result && <FeedbackResult result={result} />}
    </TraceCanvas>
  )
}