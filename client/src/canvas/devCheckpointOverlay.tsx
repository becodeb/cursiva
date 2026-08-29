// DEV checkpoint overlay: renders each checkpoint's tolerance circle, lit
// green when activated in order, with a red border on the next expected
// checkpoint when a wrong-direction contact occurs, plus a live status line.
// Rendered as the LAST child of the TraceCanvas <svg> and marked
// pointer-events:none so it never intercepts input.
//
// `showScore` (default true) keeps the score/count line dev-only: outside dev
// mode only the `¡COMPLETO!` flash renders (trace-canvas "Checkpoint Overlay
// Gate" — score display stays dev-only). The overlay stays a pure prop
// function so it remains renderToString-testable.
import type { LetterCheckpoint } from '../letters/types'
import type { DevCheckpointState } from './devCheckpointState'

export interface DevCheckpointOverlayProps {
  checkpoints: LetterCheckpoint[]
  state: DevCheckpointState
  /** False renders only the ¡COMPLETO! flash, never score/count text. */
  showScore?: boolean
}

export function DevCheckpointOverlay({ checkpoints, state, showScore = true }: DevCheckpointOverlayProps) {
  const expectedNext = state.activated.length + 1
  return (
    <g pointerEvents="none">
      {checkpoints.map((cp) => {
        const isActive = state.activated.includes(cp.order)
        const isNextError = state.wrongDirection && cp.order === expectedNext
        return (
          <g key={cp.order}>
            <circle
              cx={cp.x}
              cy={cp.y}
              r={cp.radius}
              fill={isActive ? 'rgba(22,163,74,0.35)' : 'rgba(2,132,199,0.15)'}
              stroke={isNextError ? '#b91c1c' : isActive ? '#16a34a' : '#0284c7'}
              strokeWidth={isActive ? 3 : 2}
              strokeDasharray={isActive ? undefined : '4 4'}
            />
            <text
              x={cp.x}
              y={cp.y}
              fontSize={18}
              textAnchor="middle"
              dominantBaseline="central"
              fill={isActive ? '#16a34a' : '#0284c7'}
              pointerEvents="none"
            >
              {cp.order}
            </text>
          </g>
        )
      })}
      {state.complete ? (
        <text
          x={920}
          y={40}
          textAnchor="end"
          fontSize={22}
          fill="#16a34a"
          pointerEvents="none"
        >
          ¡COMPLETO!
        </text>
      ) : (
        showScore && (
          <text
            x={920}
            y={40}
            textAnchor="end"
            fontSize={22}
            fill="#0f172a"
            pointerEvents="none"
          >
            {`checkpoints ${state.activated.length}/${checkpoints.length} · score ${Math.round(state.score)}%`}
          </text>
        )
      )}
    </g>
  )
}
