// The detective's notebook as a place: one cut-paper page on the desk, drawn in
// code. Calm on purpose: letters are written on it, so it holds still and asks for
// nothing (`docs/01` §5). The page colour is `SHEET_PAPER`, so the canvas's base rect
// disappears into it. No `url(#)`, mask or filter (`canvas/TraceCanvas.tsx`).
import { SHEET_PAPER } from '../canvas/TraceCanvas'
import { PAPER_SHADOW_FILL } from '../puppet/rig'

const DESK = '#b98d5e'
const DESK_DARK = '#a57c50'
const RING = '#6f7d8c'
const RING_LIGHT = '#c5ced8'

export const NOTEBOOK_PAPER_CSS = `
.cv-nb-paper, .cv-nb-frame { position: absolute; inset: 0; overflow: hidden; pointer-events: none; }
.cv-nb-paper { background: ${SHEET_PAPER}; }
.cv-nb-frame svg { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
.cv-nb-rings { position: absolute; left: 1.2%; top: 4%; bottom: 4%; width: clamp(16px, 2.6vw, 30px); display: flex; flex-direction: column; justify-content: space-around; }
.cv-nb-ring { height: clamp(9px, 1.6dvh, 13px); border-radius: 999px; background: ${RING}; box-shadow: inset 0 -3px 0 ${RING_LIGHT}; }
`

/** Cut by hand: the corners are not quite square and the edges not quite straight. */
const PAGE = '3.2 2.2L40 1.7L71 2.3L97.4 1.9L97.9 34L97.3 68L97.7 97.8L62 98.3L30 97.7L3 98.2L3.6 62L2.9 30Z'
const FOLD = '97.9,84 97.7,97.8 88,98'

/** The page, under the canvas. */
export default function NotebookPaper() {
  return (
    <div className="cv-nb-paper" aria-hidden="true" data-cv-notebook-paper="">
      <style>{NOTEBOOK_PAPER_CSS}</style>
    </div>
  )
}

/** The desk around the page, over the canvas: the rule runs past the screen's edge,
 *  and this is what makes it stop where the paper stops. An even-odd hole, so no
 *  mask (`canvas/TraceCanvas.tsx`'s ban). Goes after the canvas in the document. */
export function NotebookFrame() {
  return (
    <div className="cv-nb-frame" aria-hidden="true">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none">
        <path d={`M0 0H100V100H0Z M${PAGE}`} fill={PAPER_SHADOW_FILL} fillRule="evenodd" transform="translate(0.5 0.9)" />
        <path d={`M0 0H100V100H0Z M${PAGE}`} fill={DESK} fillRule="evenodd" />
        <polygon points={FOLD} fill={DESK_DARK} opacity={0.45} />
      </svg>
      <div className="cv-nb-rings">
        {Array.from({ length: 8 }, (_, i) => (
          <span key={i} className="cv-nb-ring" />
        ))}
      </div>
    </div>
  )
}

/** The three zones, across whatever the screen shows of the page. In sheet units:
 *  the same lines `canvas/TraceCanvas.tsx` draws, carried past the sheet's edge. */
export function NotebookRule({ tint = true }: { tint?: boolean }) {
  const line = { x1: -3000, x2: 4000 }
  return (
    <g pointerEvents="none" data-cv-notebook-rule="">
      {tint && <rect x={-3000} y={300} width={7000} height={120} fill="#e8f2f7" />}
      <line {...line} y1={180} y2={180} stroke="#a9b6c4" strokeWidth={2} strokeDasharray="10 9" />
      <line {...line} y1={300} y2={300} stroke="#8fb6cf" strokeWidth={2.5} />
      <line {...line} y1={420} y2={420} stroke="#5d7185" strokeWidth={3.5} />
    </g>
  )
}

/** The rule as it first shows up in a scene (`docs/25` 4.2): over a drawing, each
 *  line carries a pale edge so it reads whatever is under it. */
export function PeekingRule() {
  const line = { x1: -3000, x2: 4000 }
  const pair = (y: number, width: number) => (
    <g key={y}>
      <line {...line} y1={y} y2={y} stroke="#fffdf5" strokeWidth={width + 4} opacity={0.85} />
      <line {...line} y1={y} y2={y} stroke="#46596b" strokeWidth={width} />
    </g>
  )
  return (
    <g pointerEvents="none" data-cv-peeking-rule="">
      {pair(300, 2)}
      {pair(420, 3)}
    </g>
  )
}
