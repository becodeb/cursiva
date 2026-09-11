// Multi-stroke capture (docs/08 §3: a pen lift is DATA for the fluency pillar,
// not a refused input). The hook is driven through an SSR probe that keeps the
// returned handle alive: refs persist per component instance and post-render
// state dispatches are no-ops on the server, so the pointer handlers can be
// invoked directly against the CTM stub — no DOM, no testing library.
import { createElement, useRef } from 'react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { useTraceInput, type TraceInput, type UseTraceInputOptions } from './useTraceInput'
import { fakePointerEvent, fakeSvgSurface } from './testUtils'

/** Mount the hook once and hand back its live handle. */
function mountTraceInput(svg: SVGSVGElement, options: UseTraceInputOptions = {}): TraceInput {
  let captured: TraceInput | null = null
  const Probe = (): null => {
    const ref = useRef<SVGSVGElement | null>(svg)
    captured = useTraceInput(ref, options)
    return null
  }
  renderToString(createElement(Probe))
  if (captured === null) throw new Error('probe did not run the hook')
  return captured
}

/** Press, drag through `points`, release — one complete moved stroke. */
function stroke(input: TraceInput, points: Array<[number, number]>, pointerId = 1): void {
  const [first, ...rest] = points
  input.bind.onPointerDown(fakePointerEvent({ pointerId, clientX: first[0], clientY: first[1] }))
  for (const [x, y] of rest) {
    input.bind.onPointerMove(fakePointerEvent({ pointerId, clientX: x, clientY: y }))
  }
  input.bind.onPointerUp(fakePointerEvent({ pointerId, clientX: points[points.length - 1][0], clientY: points[points.length - 1][1] }))
}

describe('useTraceInput multiStroke buffer', () => {
  it('pushes each released stroke onto strokesRef and empties the live buffer', () => {
    const svg = fakeSvgSurface()
    const input = mountTraceInput(svg.element, { multiStroke: true })

    stroke(input, [
      [10, 10],
      [20, 20],
      [30, 30],
    ])
    expect(input.strokesRef.current).toHaveLength(1)
    expect(input.strokesRef.current[0]).toHaveLength(3)
    expect(input.pointsRef.current).toEqual([]) // ready for the next stroke

    stroke(input, [
      [100, 100],
      [140, 120],
    ])
    expect(input.strokesRef.current).toHaveLength(2)
    expect(input.strokesRef.current[1]).toHaveLength(2)
    expect(input.pointsRef.current).toEqual([])
    // The first stroke is untouched: the buffer accumulates, never replaces.
    expect(input.strokesRef.current[0][0].x).toBe(10)
    expect(input.strokesRef.current[1][0].x).toBe(100)
  })

  it('reports every completed stroke to onEnd, once per release', () => {
    const svg = fakeSvgSurface()
    const seen: number[] = []
    const input = mountTraceInput(svg.element, {
      multiStroke: true,
      onEnd: (_points, _pointerType, strokes) => seen.push(strokes.length),
    })
    stroke(input, [
      [0, 0],
      [10, 0],
    ])
    stroke(input, [
      [0, 50],
      [10, 50],
    ])
    stroke(input, [
      [0, 90],
      [10, 90],
    ])
    expect(seen).toEqual([1, 2, 3])
  })

  it('clearStrokes empties BOTH buffers ("Borrar")', () => {
    const svg = fakeSvgSurface()
    const input = mountTraceInput(svg.element, { multiStroke: true })
    stroke(input, [
      [10, 10],
      [20, 20],
    ])
    // Leave a live stroke open on top of the completed one.
    input.bind.onPointerDown(fakePointerEvent({ pointerId: 2, clientX: 300, clientY: 300 }))
    input.bind.onPointerMove(fakePointerEvent({ pointerId: 2, clientX: 320, clientY: 300 }))
    expect(input.strokesRef.current).toHaveLength(1)
    expect(input.pointsRef.current.length).toBeGreaterThan(0)

    input.clearStrokes()
    expect(input.strokesRef.current).toEqual([])
    expect(input.pointsRef.current).toEqual([])
  })

  it('stamps a capture timestamp on every point (fluency pacing)', () => {
    const svg = fakeSvgSurface()
    const input = mountTraceInput(svg.element, { multiStroke: true })
    stroke(input, [
      [0, 0],
      [10, 0],
      [20, 0],
    ])
    const points = input.strokesRef.current[0]
    expect(points).toHaveLength(3)
    for (const p of points) expect(typeof p.t).toBe('number')
    expect(points[2].t!).toBeGreaterThanOrEqual(points[0].t!)
  })

  it('a tap (no movement) adds nothing to the completed buffer', () => {
    const svg = fakeSvgSurface()
    const input = mountTraceInput(svg.element, { multiStroke: true })
    input.bind.onPointerDown(fakePointerEvent({ clientX: 5, clientY: 5 }))
    input.bind.onPointerUp(fakePointerEvent({ clientX: 5, clientY: 5 }))
    expect(input.strokesRef.current).toEqual([])
    expect(input.pointsRef.current).toEqual([])
  })

  it('single-stroke mode is unchanged: the released stroke stays in the live buffer', () => {
    const svg = fakeSvgSurface()
    const ends: number[] = []
    const input = mountTraceInput(svg.element, {
      onEnd: (points, _pointerType, strokes) => ends.push(points.length * 10 + strokes.length),
    })
    stroke(input, [
      [10, 10],
      [20, 20],
      [30, 30],
    ])
    expect(input.pointsRef.current).toHaveLength(3) // ink survives release
    expect(input.strokesRef.current).toEqual([]) // no completed buffer at all
    expect(ends).toEqual([31]) // 3 points, 1 stroke reported
  })

  it('maps client points through the inverse screen CTM before buffering', () => {
    // viewBox shown at half size, offset (10, 20): client (110, 120) → (200, 200).
    const svg = fakeSvgSurface(0.5, 10, 20)
    const input = mountTraceInput(svg.element, { multiStroke: true })
    stroke(input, [
      [10, 20],
      [110, 120],
    ])
    const points = input.strokesRef.current[0]
    expect(points[0].x).toBeCloseTo(0, 6)
    expect(points[0].y).toBeCloseTo(0, 6)
    expect(points[1].x).toBeCloseTo(200, 6)
    expect(points[1].y).toBeCloseTo(200, 6)
  })
})

describe('useTraceInput abortStroke (resetOnContact, docs/01 principle 2)', () => {
  it('empties both buffers and releases the pointer capture', () => {
    const svg = fakeSvgSurface()
    const input = mountTraceInput(svg.element, { multiStroke: true })

    stroke(input, [
      [10, 10],
      [20, 20],
    ])
    input.bind.onPointerDown(fakePointerEvent({ pointerId: 2, clientX: 30, clientY: 30 }))
    input.bind.onPointerMove(fakePointerEvent({ pointerId: 2, clientX: 40, clientY: 40 }))
    expect(input.strokesRef.current).toHaveLength(1)
    expect(input.pointsRef.current.length).toBeGreaterThan(0)
    expect(svg.captured.has(2)).toBe(true)

    input.abortStroke()

    expect(input.strokesRef.current).toEqual([])
    expect(input.pointsRef.current).toEqual([])
    expect(svg.captured.has(2)).toBe(false)
  })

  it('IGNORES the finger still on the glass, so the run cannot re-ink from the wall', () => {
    // This is the reason abort exists rather than a plain buffer clear: the
    // child's finger has not lifted, and every further move would otherwise
    // start drawing again from on top of the wall it just touched.
    const svg = fakeSvgSurface()
    const input = mountTraceInput(svg.element, { multiStroke: true })

    input.bind.onPointerDown(fakePointerEvent({ pointerId: 3, clientX: 10, clientY: 10 }))
    input.bind.onPointerMove(fakePointerEvent({ pointerId: 3, clientX: 20, clientY: 20 }))
    input.abortStroke()

    input.bind.onPointerMove(fakePointerEvent({ pointerId: 3, clientX: 60, clientY: 60 }))
    input.bind.onPointerMove(fakePointerEvent({ pointerId: 3, clientX: 70, clientY: 70 }))
    expect(input.pointsRef.current).toEqual([])
  })

  it('never fires onEnd: an abandoned run is not an attempt to be scored', () => {
    const svg = fakeSvgSurface()
    let ends = 0
    const input = mountTraceInput(svg.element, {
      multiStroke: true,
      onEnd: () => {
        ends++
      },
    })

    input.bind.onPointerDown(fakePointerEvent({ pointerId: 4, clientX: 10, clientY: 10 }))
    input.bind.onPointerMove(fakePointerEvent({ pointerId: 4, clientX: 20, clientY: 20 }))
    input.abortStroke()
    input.bind.onPointerUp(fakePointerEvent({ pointerId: 4, clientX: 20, clientY: 20 }))

    expect(ends).toBe(0)
  })

  it('a fresh press after an abort captures normally — the child just starts again', () => {
    const svg = fakeSvgSurface()
    const input = mountTraceInput(svg.element, { multiStroke: true })

    input.bind.onPointerDown(fakePointerEvent({ pointerId: 5, clientX: 10, clientY: 10 }))
    input.abortStroke()

    stroke(
      input,
      [
        [100, 100],
        [110, 110],
        [120, 120],
      ],
      6,
    )
    expect(input.strokesRef.current).toHaveLength(1)
  })
})
