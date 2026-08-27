// useTraceInput normalization (trace-canvas "Correct normalization", T3.4):
// the browser owns `getScreenCTM().inverse()`; the affine application is
// pure and asserted against hand-computed values. Pointer-state behaviors
// (primary-only, cancel discards) run in the browser runtime harness.
import { describe, expect, it } from 'vitest'
import { canvasPoint } from './useTraceInput'

describe('canvasPoint (inverse screen CTM affine map)', () => {
  it('maps through a uniform scale + translation (the common SVG CSS case)', () => {
    // viewBox 1000×600 shown at 500×300 CSS px, offset (10,20):
    //   CTM = scale(0.5) + translate(10,20)  →  inverse = a=2 b=0 c=0 d=2 e=-20 f=-40
    const p = canvasPoint(100, 80, 2, 0, 0, 2, -20, -40)
    expect(p.x).toBeCloseTo(180, 10) // (100 − 10) / 0.5
    expect(p.y).toBeCloseTo(120, 10) // (80 − 20) / 0.5
  })

  it('maps through a non-uniform, rotated inverse CTM', () => {
    // x' = 2x + 1y + 10 ; y' = 0.5x + 3y + 20
    const p = canvasPoint(30, 40, 2, 0.5, 1, 3, 10, 20)
    expect(p.x).toBeCloseTo(110, 10)
    expect(p.y).toBeCloseTo(155, 10)
  })

  it('spec: visible canvas points resolve inside 0..1000 × 0..600', () => {
    // 1000×600 viewBox at 300×180 CSS px (scale 0.3), offset (20,40):
    //   inverse = a=10/3 d=10/3 e=−20/0.3 f=−40/0.3
    const a = 10 / 3
    const e = -20 / 0.3
    const f = -40 / 0.3
    const corner = canvasPoint(20, 40, a, 0, 0, a, e, f) // top-left screen corner
    expect(corner.x).toBeCloseTo(0, 6)
    expect(corner.y).toBeCloseTo(0, 6)
    const center = canvasPoint(170, 130, a, 0, 0, a, e, f)
    expect(center.x).toBeCloseTo(500, 6) // (170−20)/0.3
    expect(center.y).toBeCloseTo(300, 6) // (130−40)/0.3
    expect(center.x).toBeGreaterThanOrEqual(0)
    expect(center.x).toBeLessThanOrEqual(1000)
    expect(center.y).toBeGreaterThanOrEqual(0)
    expect(center.y).toBeLessThanOrEqual(600)
  })
})