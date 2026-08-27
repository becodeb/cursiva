// Mode feedback (free-trace-mode "Approval Feedback", T5.3): an approved trace
// shows the star placeholder (public/assets/themes/star.svg) + a soft label;
// anything else shows rescue guidance INSTEAD of the star. Rendered as SVG so
// the overlay sits inside the canvas above the ink. Guided mode reuses the
// rescue hint text.
import type { EvaluationResult } from '../letters/types'

const CENTER_X = 500
const OVERLAY_Y = 140

/** Star placeholder rendered from the themes assets path. */
export default function StarFeedback({ x = CENTER_X, y = OVERLAY_Y }: { x?: number; y?: number }) {
  return (
    <image
      href="/assets/themes/star.svg"
      x={x - 36}
      y={y - 36}
      width={72}
      height={72}
      aria-label="Estrella de aprobación"
    />
  )
}

/** One-line rescue guidance; `wrong` marks a direction fault. */
export function RescueHint({ wrong, y = OVERLAY_Y }: { wrong: boolean; y?: number }) {
  return (
    <text x={CENTER_X} y={y} textAnchor="middle" fontSize={26} fill={wrong ? '#b91c1c' : '#3b82f6'}>
      {wrong ? 'Seguí el orden del trazo' : 'Repasá sobre la guía'}
    </text>
  )
}

/** Release feedback: star + label on approval, rescue otherwise (never both). */
export function FeedbackResult({ result }: { result: EvaluationResult }) {
  return result.approved ? (
    <g role="status">
      <StarFeedback />
      <text x={CENTER_X} y={205} textAnchor="middle" fontSize={30} fontWeight={700} fill="#b45309">
        ¡Muy bien!
      </text>
    </g>
  ) : (
    <RescueHint wrong={result.wrongDirection} />
  )
}
