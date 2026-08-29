// DevCheckpointOverlay score gate (trace-canvas "Checkpoint Overlay Gate"):
// the overlay is a pure prop function, so the production toggle behavior is
// pinned with renderToString — score/count text is dev-only.
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { DevCheckpointState } from './devCheckpointState'
import { DevCheckpointOverlay } from './devCheckpointOverlay'
import type { LetterCheckpoint } from '../letters/types'

const cps: LetterCheckpoint[] = [
  { order: 1, x: 100, y: 200, radius: 40 },
  { order: 2, x: 300, y: 200, radius: 40 },
]

function incompleteState(): DevCheckpointState {
  return { activated: [1], wrongDirection: false, score: 42.5, complete: false }
}

function completeState(): DevCheckpointState {
  return { activated: [1, 2], wrongDirection: false, score: 100, complete: true }
}

describe('DevCheckpointOverlay score gate', () => {
  it('renders the score/count line by default (dev behavior unchanged)', () => {
    const html = renderToString(<DevCheckpointOverlay checkpoints={cps} state={incompleteState()} />)
    expect(html).toContain('score')
    expect(html).toContain('checkpoints 1/2')
    expect(html).toContain('score 43%')
  })

  it('omits score/count text when showScore=false (production toggle)', () => {
    const html = renderToString(
      <DevCheckpointOverlay checkpoints={cps} state={incompleteState()} showScore={false} />,
    )
    expect(html).not.toContain('score')
    expect(html).not.toContain('checkpoints')
    expect(html).toContain('<circle') // the checkpoint zones still render
  })

  it('shows the ¡COMPLETO! flash without score in both modes', () => {
    const dev = renderToString(<DevCheckpointOverlay checkpoints={cps} state={completeState()} />)
    const prod = renderToString(
      <DevCheckpointOverlay checkpoints={cps} state={completeState()} showScore={false} />,
    )
    expect(dev).toContain('¡COMPLETO!')
    expect(prod).toContain('¡COMPLETO!')
    expect(dev).not.toContain('score')
    expect(prod).not.toContain('score')
  })
})