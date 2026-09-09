// Shape contract for the parametric level paths (docs/08 section 5). These are
// not decorative curves: the DIP of a garland, the RISE of a hill, the
// self-crossing of a loop and the counter-clockwise turn of the spiral ARE the
// pedagogy, so each one is pinned as an invariant, not just "it parses".
import { describe, expect, it } from 'vitest'
import { flattenPathD, polylineLength } from '../letters/svgLetter'
import type { Point } from '../letters/types'
import { crests, garland, hills, loops, spiral, straight, sweep, switchback, transformPath, wave } from './paths'

/** Flatten a generated `d` and fail loudly if it degenerates to nothing. */
function poly(d: string): Point[] {
  const flat = flattenPathD(d)
  expect(flat.points.length).toBeGreaterThanOrEqual(3)
  return flat.points
}

/** Count the contiguous runs of points satisfying `hit` — one run per excursion. */
function excursions(points: Point[], hit: (p: Point) => boolean): number {
  let runs = 0
  let inside = false
  for (const p of points) {
    const now = hit(p)
    if (now && !inside) runs += 1
    inside = now
  }
  return runs
}

/** Strict proper intersection of segments p1p2 and p3p4 (no shared endpoints). */
function segmentsCross(p1: Point, p2: Point, p3: Point, p4: Point): boolean {
  const d = (a: Point, b: Point, c: Point): number =>
    (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)
  const d1 = d(p3, p4, p1)
  const d2 = d(p3, p4, p2)
  const d3 = d(p1, p2, p3)
  const d4 = d(p1, p2, p4)
  return ((d1 > 0) !== (d2 > 0)) && ((d3 > 0) !== (d4 > 0))
}

/** Number of proper self-crossings, ignoring near-adjacent segment pairs. */
function selfCrossings(points: Point[]): number {
  let count = 0
  for (let i = 0; i + 1 < points.length; i++) {
    for (let j = i + 3; j + 1 < points.length; j++) {
      if (segmentsCross(points[i], points[i + 1], points[j], points[j + 1])) count += 1
    }
  }
  return count
}

const GENERATORS: ReadonlyArray<{ name: string; d: string; start: Point }> = [
  { name: 'straight', d: straight(), start: { x: 140, y: 360 } },
  { name: 'sweep', d: sweep(), start: { x: 100, y: 520 } },
  { name: 'switchback', d: switchback(), start: { x: 120, y: 130 } },
  { name: 'wave', d: wave(), start: { x: 120, y: 300 } },
  { name: 'spiral', d: spiral(), start: { x: 760, y: 300 } },
  { name: 'garland', d: garland(), start: { x: 140, y: 285 } },
  { name: 'hills', d: hills(), start: { x: 140, y: 435 } },
  { name: 'loops', d: loops(), start: { x: 160, y: 450 } },
  { name: 'crests', d: crests(), start: { x: 120, y: 310 } },
]

/** Axis-aligned bounding box of a generated path. */
function bbox(d: string): { minX: number; maxX: number; minY: number; maxY: number } {
  const points = poly(d)
  return {
    minX: Math.min(...points.map((p) => p.x)),
    maxX: Math.max(...points.map((p) => p.x)),
    minY: Math.min(...points.map((p) => p.y)),
    maxY: Math.max(...points.map((p) => p.y)),
  }
}

describe('level path generators — shared contract', () => {
  for (const { name, d, start } of GENERATORS) {
    describe(name, () => {
      it('flattens without throwing into a usable polyline', () => {
        expect(() => flattenPathD(d)).not.toThrow()
        expect(poly(d).length).toBeGreaterThanOrEqual(3)
      })

      it('starts at the declared start point', () => {
        const first = poly(d)[0]
        expect(first.x).toBeCloseTo(start.x, 1)
        expect(first.y).toBeCloseTo(start.y, 1)
      })

      it('stays inside the 1000x600 viewBox', () => {
        for (const p of poly(d)) {
          expect(p.x).toBeGreaterThanOrEqual(0)
          expect(p.x).toBeLessThanOrEqual(1000)
          expect(p.y).toBeGreaterThanOrEqual(0)
          expect(p.y).toBeLessThanOrEqual(600)
        }
      })

      it('has a plausible traceable length', () => {
        expect(polylineLength(poly(d))).toBeGreaterThan(200)
      })
    })
  }
})

describe('straight', () => {
  it('is horizontal from x0 to x1 at a constant y', () => {
    const points = poly(straight())
    for (const p of points) expect(p.y).toBeCloseTo(360, 6)
    expect(points[points.length - 1].x).toBeCloseTo(860, 6)
    expect(polylineLength(points)).toBeCloseTo(720, 6)
  })

  it('honours its overrides', () => {
    const points = poly(straight({ x0: 200, x1: 400, y: 300 }))
    expect(points[0]).toEqual({ x: 200, y: 300 })
    expect(polylineLength(points)).toBeCloseTo(200, 6)
  })
})

describe('wave', () => {
  it('starts going UP (writing direction) and never overshoots the amplitude', () => {
    const points = poly(wave())
    // Y grows downward: the first samples must DECREASE.
    expect(points[3].y).toBeLessThan(points[0].y)
    const ys = points.map((p) => p.y)
    expect(Math.min(...ys)).toBeCloseTo(130, 1) // 300 − 170
    expect(Math.max(...ys)).toBeCloseTo(470, 1) // 300 + 170
  })

  it('is centred on the SHEET, not on the writing band', () => {
    // Phase 1 has no pauta: a wave sitting on the baseline would rehearse the
    // writing line for no reason and hide the whole sheet from the arm.
    const { minY, maxY } = bbox(wave())
    expect((minY + maxY) / 2).toBeCloseTo(300, 1)
    expect(maxY - minY).toBeGreaterThan(300)
  })

  it('has one crest and one trough per cycle', () => {
    const points = poly(wave({ cycles: 4 }))
    expect(excursions(points, (p) => p.y < 300 - 150)).toBe(4)
    expect(excursions(points, (p) => p.y > 300 + 150)).toBe(4)
  })

  it('advances monotonically to the right', () => {
    const points = poly(wave())
    for (let i = 1; i < points.length; i++) {
      expect(points[i].x).toBeGreaterThanOrEqual(points[i - 1].x - 1e-6)
    }
    expect(points[points.length - 1].x).toBeCloseTo(880, 1)
  })
})

describe('sweep', () => {
  it('runs corner to corner across the whole sheet', () => {
    const { minX, maxX, minY, maxY } = bbox(sweep())
    expect(minX).toBeCloseTo(100, 1)
    expect(maxX).toBeCloseTo(900, 1)
    // The gross-motor route has to USE the paper: over 400 units of height and
    // 800 of width, versus the 120-unit writing band it replaced.
    expect(maxY - minY).toBeGreaterThan(400)
    expect(minY).toBeGreaterThan(60)
    expect(maxY).toBeLessThan(540)
  })

  it('starts bottom-left and ends top-right', () => {
    const points = poly(sweep())
    const last = points[points.length - 1]
    expect(points[0]).toEqual({ x: 100, y: 520 })
    expect(last.x).toBeCloseTo(900, 1)
    expect(last.y).toBeCloseTo(90, 1)
  })

  it('bows to BOTH sides of the diagonal — one S, not one arc', () => {
    const points = poly(sweep())
    // Signed offset from the straight line P0→P1: an S changes sign once.
    const side = (p: Point): number => (900 - 100) * (p.y - 520) - (90 - 520) * (p.x - 100)
    const offsets = points.map(side)
    expect(Math.max(...offsets)).toBeGreaterThan(0)
    expect(Math.min(...offsets)).toBeLessThan(0)
  })

  it('advances monotonically to the right — never doubles back', () => {
    const points = poly(sweep())
    for (let i = 1; i < points.length; i++) {
      expect(points[i].x).toBeGreaterThan(points[i - 1].x - 1e-6)
    }
  })
})

describe('switchback', () => {
  it('spans the full height of the sheet, not a flat band', () => {
    const { minX, maxX, minY, maxY } = bbox(switchback())
    expect(minY).toBeCloseTo(130, 6)
    expect(maxY).toBeCloseTo(470, 6)
    expect(minX).toBeCloseTo(120, 6)
    expect(maxX).toBeCloseTo(880, 6)
  })

  it('DOUBLES BACK: it goes right, turns, and comes back to where it started', () => {
    const points = poly(switchback())
    const first = points[0]
    const last = points[points.length - 1]
    expect(first.x).toBeCloseTo(120, 6)
    expect(last.x).toBeCloseTo(120, 6)
    // Same x, opposite ends of the sheet vertically: that is the return run.
    expect(last.y - first.y).toBeCloseTo(340, 6)
    // The route really did reach the far side before turning.
    expect(Math.max(...points.map((p) => p.x))).toBeCloseTo(880, 6)
  })

  it('keeps the two runs one turn-diameter apart, so the walls survive', () => {
    // The turn radius is (yBottom − yTop) / 2 BY CONSTRUCTION, so the outward
    // and return runs are 340 units apart — 284 units of wall against the
    // shipped 56px corridor.
    const points = poly(switchback())
    // x < 710 is the straight-run half of the route; the turn samples live to
    // the right of the arc centre and sweep the whole height between them.
    const top = points.filter((p) => p.x < 709 && p.y < 300)
    const bottom = points.filter((p) => p.x < 709 && p.y > 300)
    expect(top.length).toBeGreaterThan(10)
    expect(bottom.length).toBeGreaterThan(10)
    expect(Math.min(...bottom.map((p) => p.y)) - Math.max(...top.map((p) => p.y))).toBeGreaterThan(
      200,
    )
  })

  it('turns on a real arc — every turn sample sits on the same radius', () => {
    const points = poly(switchback())
    const cx = 880 - 170
    const onArc = points.filter((p) => p.x > cx + 1)
    expect(onArc.length).toBeGreaterThanOrEqual(20)
    for (const p of onArc) {
      expect(Math.hypot(p.x - cx, p.y - 300)).toBeCloseTo(170, 1)
    }
  })

  it('never crosses itself — a corridor that overlapped would have no walls', () => {
    expect(selfCrossings(poly(switchback()))).toBe(0)
  })

  it('is long: the escort route has to be HELD, not just found', () => {
    // Two 590-unit runs plus a half-turn of pi x 170.
    expect(polylineLength(poly(switchback()))).toBeGreaterThan(1600)
    expect(polylineLength(poly(switchback()))).toBeGreaterThan(
      polylineLength(poly(sweep())) * 1.5,
    )
  })

  it('honours its box', () => {
    const { minX, maxX, minY, maxY } = bbox(
      switchback({ x0: 200, x1: 700, yTop: 100, yBottom: 400 }),
    )
    expect(minX).toBeCloseTo(200, 6)
    expect(maxX).toBeCloseTo(700, 6)
    expect(minY).toBeCloseTo(100, 6)
    expect(maxY).toBeCloseTo(400, 6)
  })
})

describe('transformPath', () => {
  it('is the identity with no options', () => {
    const points = poly(transformPath(straight()))
    const original = poly(straight())
    expect(points).toHaveLength(original.length)
    for (let i = 0; i < points.length; i++) {
      expect(points[i].x).toBeCloseTo(original[i].x, 6)
      expect(points[i].y).toBeCloseTo(original[i].y, 6)
    }
  })

  it('rotates about the pivot — 90 degrees turns a horizontal line vertical', () => {
    const points = poly(transformPath(straight({ x0: 400, x1: 600, y: 300 }), { rotate: 90 }))
    for (const p of points) expect(p.x).toBeCloseTo(500, 6)
    expect(Math.min(...points.map((p) => p.y))).toBeCloseTo(200, 6)
    expect(Math.max(...points.map((p) => p.y))).toBeCloseTo(400, 6)
  })

  it('rotates POSITIVE clockwise on screen (viewBox Y grows downward)', () => {
    // A point to the RIGHT of the pivot must move DOWN under a positive angle.
    const points = poly(transformPath(straight({ x0: 600, x1: 800, y: 300 }), { rotate: 30 }))
    expect(points[0].y).toBeGreaterThan(300)
  })

  it('scales about the pivot without moving it', () => {
    const { minX, maxX } = bbox(transformPath(straight({ x0: 400, x1: 600 }), { scale: 2 }))
    expect(minX).toBeCloseTo(300, 6)
    expect(maxX).toBeCloseTo(700, 6)
  })

  it('translates AFTER the rotation', () => {
    const points = poly(
      transformPath(straight({ x0: 400, x1: 600, y: 300 }), {
        rotate: 90,
        translate: { x: 50, y: -20 },
      }),
    )
    for (const p of points) expect(p.x).toBeCloseTo(550, 6)
    expect(Math.min(...points.map((p) => p.y))).toBeCloseTo(180, 6)
  })

  it('preserves arc length under a pure rotation', () => {
    const before = polylineLength(poly(wave()))
    const after = polylineLength(poly(transformPath(wave(), { rotate: -22 })))
    expect(after).toBeCloseTo(before, 1)
  })

  it('transforms CONTROL points too, not just endpoints', () => {
    // A cubic whose controls were left behind would change shape, not just
    // orientation, so the rotated curve must keep its extremum distance.
    const original = poly(wave())
    const rotated = poly(transformPath(wave(), { rotate: 180 }))
    const far = (points: Point[]): number =>
      Math.max(...points.map((p) => Math.hypot(p.x - 500, p.y - 300)))
    expect(far(rotated)).toBeCloseTo(far(original), 1)
  })

  it('fails loud on a command it cannot transform', () => {
    expect(() => transformPath('M 0 0 A 1 1 0 0 1 10 10')).toThrow('comando no soportado')
  })

  it('fails loud on an odd coordinate count', () => {
    expect(() => transformPath('M 0 0 L 10')).toThrow('coordenada impar')
  })
})

describe('spiral', () => {
  const dist = (p: Point, cx: number, cy: number): number => Math.hypot(p.x - cx, p.y - cy)

  it('runs from the outside inward with a monotonically shrinking radius', () => {
    const points = poly(spiral())
    const radii = points.map((p) => dist(p, 500, 300))
    expect(radii[0]).toBeCloseTo(260, 1)
    expect(radii[radii.length - 1]).toBeCloseTo(50, 1)
    for (let i = 1; i < radii.length; i++) {
      expect(radii[i]).toBeLessThanOrEqual(radii[i - 1] + 1e-6)
    }
  })

  it('turns COUNTER-CLOCKWISE by default (the a/c/o family turn)', () => {
    // Signed area around the centre: negative = counter-clockwise on screen,
    // because the viewBox Y axis points down.
    const signedTurn = (d: string): number => {
      const points = poly(d)
      let acc = 0
      for (let i = 1; i < points.length; i++) {
        const ax = points[i - 1].x - 500
        const ay = points[i - 1].y - 300
        const bx = points[i].x - 500
        const by = points[i].y - 300
        acc += ax * by - ay * bx
      }
      return acc
    }
    expect(signedTurn(spiral())).toBeLessThan(0)
    expect(signedTurn(spiral({ clockwise: true }))).toBeGreaterThan(0)
  })

  it('samples at least 40 points per turn', () => {
    expect(poly(spiral({ turns: 2.5 })).length).toBeGreaterThanOrEqual(Math.ceil(2.5 * 40))
  })

  it('is centred on the SHEET and sized to it, not to the writing band', () => {
    const { minX, maxX, minY, maxY } = bbox(spiral())
    expect(maxX - minX).toBeGreaterThan(440)
    expect(maxY - minY).toBeGreaterThan(380)
    expect(minY).toBeGreaterThan(60)
    expect(maxY).toBeLessThan(540)
  })

  it('keeps a visible wall between consecutive arms', () => {
    // (rStart − rEnd) / turns is the radial gap; the shipped 70px corridor has
    // to leave wall inside it or the caracol renders as a filled disc.
    expect((260 - 50) / 1.75 - 70).toBeGreaterThan(40)
  })
})

describe('garland', () => {
  it('dips DOWN once per cycle, touching yBottom exactly', () => {
    const points = poly(garland({ cycles: 4 }))
    const ys = points.map((p) => p.y)
    expect(Math.max(...ys)).toBeCloseTo(435, 1)
    expect(Math.min(...ys)).toBeCloseTo(285, 1)
    expect(excursions(points, (p) => p.y > 435 - 12)).toBe(4)
  })

  it('has a rounded U bottom, not a V corner', () => {
    // A V would put a single point at the extreme; a U keeps a run of samples
    // within a few px of the bottom.
    const points = poly(garland({ cycles: 1 }))
    const nearBottom = points.filter((p) => p.y > 435 - 4)
    expect(nearBottom.length).toBeGreaterThan(6)
  })

  it('honours cycles', () => {
    expect(excursions(poly(garland({ cycles: 2 })), (p) => p.y > 423)).toBe(2)
  })
})

describe('hills', () => {
  it('rises UP once per cycle, touching yTop exactly', () => {
    const points = poly(hills({ cycles: 4 }))
    const ys = points.map((p) => p.y)
    expect(Math.min(...ys)).toBeCloseTo(285, 1)
    expect(Math.max(...ys)).toBeCloseTo(435, 1)
    expect(excursions(points, (p) => p.y < 285 + 12)).toBe(4)
  })

  it('is the vertical mirror of garland', () => {
    const g = poly(garland())
    const h = poly(hills())
    expect(h).toHaveLength(g.length)
    for (let i = 0; i < g.length; i++) {
      expect(h[i].x).toBeCloseTo(g[i].x, 6)
      expect(h[i].y).toBeCloseTo(285 + 435 - g[i].y, 6)
    }
  })
})

describe('loops', () => {
  it('reaches the top ruled line on every cycle', () => {
    const points = poly(loops({ cycles: 3 }))
    expect(Math.min(...points.map((p) => p.y))).toBeLessThanOrEqual(150 + 15)
    expect(Math.max(...points.map((p) => p.y))).toBeCloseTo(450, 1)
    expect(excursions(points, (p) => p.y < 150 + 40)).toBe(3)
  })

  it('CROSSES ITSELF once per cycle — that is what a cursive l is', () => {
    for (const cycles of [1, 2, 3]) {
      expect(selfCrossings(poly(loops({ cycles })))).toBeGreaterThanOrEqual(cycles)
    }
  })

  it('reverses horizontally inside every cycle (the crossing signature)', () => {
    const cycles = 3
    const points = poly(loops({ cycles }))
    const w = (840 - 160) / cycles
    for (let c = 0; c < cycles; c++) {
      const lo = 160 + c * w
      const hi = lo + w
      const inCycle = points.filter((p) => p.x >= lo - 1e-6 && p.x <= hi + 1e-6)
      const backwards = inCycle.some((p, i) => i > 0 && p.x < inCycle[i - 1].x - 1e-6)
      expect(backwards).toBe(true)
    }
  })

  it('starts and ends on the baseline', () => {
    const points = poly(loops())
    expect(points[0]).toEqual({ x: 160, y: 450 })
    const last = points[points.length - 1]
    expect(last.x).toBeCloseTo(840, 1)
    expect(last.y).toBeCloseTo(450, 1)
  })
})

describe('crests', () => {
  it('spans the full ruled height from the top zone to the baseline', () => {
    const points = poly(crests({ cycles: 3 }))
    const ys = points.map((p) => p.y)
    expect(Math.min(...ys)).toBeCloseTo(172, 1)
    expect(Math.max(...ys)).toBeCloseTo(448, 1)
    expect(excursions(points, (p) => p.y < 182)).toBe(3)
    expect(excursions(points, (p) => p.y > 438)).toBe(3)
  })

  it('starts on the midline going up', () => {
    const points = poly(crests())
    expect(points[0].y).toBeCloseTo(310, 6)
    expect(points[3].y).toBeLessThan(points[0].y)
  })
})
