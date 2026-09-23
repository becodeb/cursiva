// Defect fix (finding N8, "a touch during the demo starts the trace"): a
// child who pressed the sheet while the demonstration line was still
// drawing itself used to get no ink and no response — TraceCanvas was
// `enabled={false}` for the whole `demo` phase, and `useTraceInput` refuses
// a `pointerdown` outright while `enabled` is false, so the touch vanished
// with no visible reaction. The fix keeps the canvas enabled through the
// demo and lets the touch's own stroke-start (`onStart`) end the demo, via
// this pure decision. See `endDemoOnStrokeStart`'s own doc comment in
// `LevelPlay.tsx` for the full mechanism (why the same gesture is not lost).
import { describe, expect, it } from 'vitest'
import { endDemoOnStrokeStart, type LevelPhase } from './LevelPlay'

describe('endDemoOnStrokeStart (N8: a touch during the demo starts the trace)', () => {
  it('ends the demo the instant a stroke starts during it', () => {
    expect(endDemoOnStrokeStart('demo')).toBe('ready')
  })

  it('leaves an already-traceable level alone (nothing to end)', () => {
    expect(endDemoOnStrokeStart('ready')).toBe('ready')
  })

  it('leaves a just-resolved attempt alone — a stroke starting mid-result is an ordinary retry, not this fix', () => {
    expect(endDemoOnStrokeStart('result')).toBe('result')
  })

  it('is total over every LevelPhase (exhaustive, so a future phase cannot fall through unnoticed)', () => {
    const phases: LevelPhase[] = ['demo', 'ready', 'result']
    for (const phase of phases) {
      expect(() => endDemoOnStrokeStart(phase)).not.toThrow()
    }
  })
})
