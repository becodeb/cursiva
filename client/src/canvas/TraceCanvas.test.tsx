// TraceCanvas SSR tests (trace-canvas "Multi-Step Demo Rendering"): the demo
// prop accepts a single DrawDemo or an array; every entry renders as its own
// animated motion.path with its own d/delay/duration — and the single-object
// form preserves the previous one-path behavior. Timeline completion itself is
// mode-side (readyMs in guidedTrace), not asserted here.
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import TraceCanvas, { type DrawDemo } from './TraceCanvas'

function demo(over: Partial<DrawDemo> = {}): DrawDemo {
  return { d: 'M 1 2 L 3 4 L 5 4', delay: 1, duration: 1, strokeWidth: 14, ...over }
}

function demoPathCount(html: string): number {
  return (html.match(/stroke="#0284c7"/g) ?? []).length
}

describe('TraceCanvas demo prop (multi-step demo rendering)', () => {
  it('an array renders one stroke-#0284c7 path per entry, each with its own d', () => {
    const html = renderToString(
      <TraceCanvas demo={[demo(), demo({ d: 'M 9 9 L 8 8', delay: 2, duration: 0.5 })]} />,
    )
    expect(demoPathCount(html)).toBe(2)
    expect(html).toContain('M 1 2 L 3 4 L 5 4')
    expect(html).toContain('M 9 9 L 8 8')
  })

  it('a single DrawDemo object renders exactly one path (previous behavior)', () => {
    const html = renderToString(<TraceCanvas demo={demo()} />)
    expect(demoPathCount(html)).toBe(1)
  })

  it('renders no demo paths when the prop is absent', () => {
    expect(demoPathCount(renderToString(<TraceCanvas />))).toBe(0)
  })
})