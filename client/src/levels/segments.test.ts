// Segment levels (T45, `docs/21` N5/N6): the judge, the latch, the two path
// generators, and the two shipped levels replayed with child-like strokes.
import { describe, expect, it } from 'vitest'
import {
  emptySegmentState,
  fencePosts,
  furrowSegments,
  judgeSegmentStroke,
  projectOnRoute,
  segmentStandPoint,
  segmentsComplete,
  settleSegmentRelease,
  standingBox,
  type SegmentConfig,
} from './segments'
import { placeArt, STANDING_GRIP } from '../canvas/placeArt'
import { OCTOPUS_ASPECT, OCTOPUS_SIZE } from '../screen/LevelPlay'
import { buildLevelTarget } from './buildLevel'
import { getLevel } from './catalog'
import { segmentClueMarks, segmentClueState } from '../detective/clues'
import { flattenPathD } from '../letters/svgLetter'
import type { Point } from '../letters/types'
import type { RouteSegment } from './types'

const CFG: SegmentConfig = { startReach: 70, stopReach: 55 }

function route(a: Point, b: Point): RouteSegment {
  return { polyline: [a, b], length: Math.hypot(b.x - a.x, b.y - a.y) }
}

/** Evenly sampled straight stroke from `a` to `b`. */
function line(a: Point, b: Point, n = 30): Point[] {
  return Array.from({ length: n + 1 }, (_, i) => ({ x: a.x + ((b.x - a.x) * i) / n, y: a.y + ((b.y - a.y) * i) / n }))
}

/** Deterministic pseudo-random, so a failure replays exactly. */
function rng(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 2 ** 32
  }
}

/**
 * A child's stroke along one segment: lands a little off the start, wobbles
 * across the line, is uneven in speed, and stops somewhere around the stop
 * point (a little short or a little past), never exactly on it.
 */
function childStroke(r: RouteSegment, rand: () => number): Point[] {
  const a = r.polyline[0]
  const b = r.polyline[r.polyline.length - 1]
  const ux = (b.x - a.x) / r.length
  const uy = (b.y - a.y) / r.length
  const nx = -uy
  const ny = ux
  const land = (rand() - 0.5) * 40
  const along0 = (rand() - 0.5) * 30
  const stopAt = r.length + (rand() - 0.5) * 40
  const n = 25 + Math.floor(rand() * 30)
  const out: Point[] = []
  for (let i = 0; i <= n; i++) {
    const t = i / n
    const eased = t * t * (3 - 2 * t)
    const along = along0 + (stopAt - along0) * eased
    const side = land * (1 - t) + Math.sin(t * Math.PI * 3) * 12 + (rand() - 0.5) * 10
    out.push({ x: a.x + ux * along + nx * side, y: a.y + uy * along + ny * side })
  }
  return out
}

describe('projectOnRoute', () => {
  it('measures the distance to the line and how far along it the point sits', () => {
    const r = route({ x: 0, y: 0 }, { x: 100, y: 0 })
    expect(projectOnRoute(r.polyline, { x: 40, y: 7 })).toEqual({ distance: 7, arc: 40 })
    expect(projectOnRoute(r.polyline, { x: 130, y: 0 })).toEqual({ distance: 30, arc: 100 })
  })
})

describe('judgeSegmentStroke', () => {
  const posts = [route({ x: 100, y: 100 }, { x: 100, y: 400 }), route({ x: 300, y: 100 }, { x: 300, y: 400 })]

  it('accepts a stroke from the start dot to the stop, and says which segment', () => {
    expect(judgeSegmentStroke(line({ x: 100, y: 100 }, { x: 100, y: 400 }), posts, 90, CFG)).toBe(0)
    expect(judgeSegmentStroke(line({ x: 305, y: 110 }, { x: 296, y: 395 }), posts, 90, CFG)).toBe(1)
  })

  it('wants the stroke the right way round: from the start dot, not from the stop', () => {
    expect(judgeSegmentStroke(line({ x: 100, y: 400 }, { x: 100, y: 100 }), posts, 90, CFG)).toBe(-1)
  })

  it('wants the stop: running on past it and lifting far away leaves the segment open', () => {
    // Past the end the stroke is outside the corridor anyway; a short run-on
    // that stays mostly inside is caught by the lift point.
    expect(judgeSegmentStroke(line({ x: 100, y: 100 }, { x: 100, y: 470 }), posts, 90, CFG)).toBe(-1)
  })

  it('wants the whole segment: stopping halfway leaves it open', () => {
    expect(judgeSegmentStroke(line({ x: 100, y: 100 }, { x: 100, y: 250 }), posts, 90, CFG)).toBe(-1)
  })

  it('wants the stroke inside the corridor', () => {
    const zigzag = line({ x: 100, y: 100 }, { x: 100, y: 400 }).map((p, i) => ({ ...p, x: p.x + (i % 2 ? 70 : -70) }))
    zigzag[0] = { x: 100, y: 100 }
    zigzag[zigzag.length - 1] = { x: 100, y: 400 }
    expect(judgeSegmentStroke(zigzag, posts, 90, CFG)).toBe(-1)
  })

  it('ignores a stroke that lands nowhere near a start dot, and a dot or a tap', () => {
    expect(judgeSegmentStroke(line({ x: 200, y: 100 }, { x: 200, y: 400 }), posts, 90, CFG)).toBe(-1)
    expect(judgeSegmentStroke([{ x: 100, y: 100 }], posts, 90, CFG)).toBe(-1)
  })

  it('never hands a done segment the stroke again', () => {
    expect(judgeSegmentStroke(line({ x: 100, y: 100 }, { x: 100, y: 400 }), posts, 90, CFG, [true, false])).toBe(-1)
  })
})

describe('settleSegmentRelease', () => {
  const posts = [route({ x: 100, y: 100 }, { x: 100, y: 400 }), route({ x: 300, y: 100 }, { x: 300, y: 400 })]

  it('latches a done segment and keeps it whatever comes next', () => {
    let state = emptySegmentState(2)
    const first = settleSegmentRelease(state, line({ x: 100, y: 100 }, { x: 100, y: 400 }), posts, 90, CFG)
    expect(first.accepted).toBe(0)
    state = first.state
    expect(state.done).toEqual([true, false])
    const scribble = settleSegmentRelease(state, line({ x: 500, y: 50 }, { x: 520, y: 60 }), posts, 90, CFG)
    expect(scribble.accepted).toBe(-1)
    expect(scribble.state).toBe(state)
    expect(segmentsComplete(state)).toBe(false)
    state = settleSegmentRelease(state, line({ x: 300, y: 100 }, { x: 300, y: 400 }), posts, 90, CFG).state
    expect(segmentsComplete(state)).toBe(true)
  })

  it('an empty level is never complete', () => {
    expect(segmentsComplete(emptySegmentState(0))).toBe(false)
  })
})

describe('the generators', () => {
  it('fencePosts: evenly spaced vertical posts, each drawn top to bottom', () => {
    const paths = fencePosts({ x0: 150, x1: 850, top: 130, bottom: 470, count: 5 })
    expect(paths).toHaveLength(5)
    paths.forEach((d, i) => {
      const { points } = flattenPathD(d)
      expect(points.length).toBeGreaterThanOrEqual(3)
      expect(points[0]).toEqual({ x: 150 + i * 175, y: 130 })
      expect(points[points.length - 1]).toEqual({ x: 150 + i * 175, y: 470 })
      for (const p of points) expect(p.x).toBe(150 + i * 175)
    })
  })

  it('furrowSegments: one horizontal line, left to right, cut into equal stretches with a gap', () => {
    const paths = furrowSegments({ x0: 100, x1: 900, y: 300, count: 3, gap: 60 })
    const ends = paths.map((d) => {
      const { points } = flattenPathD(d)
      for (const p of points) expect(p.y).toBe(300)
      return [points[0].x, points[points.length - 1].x]
    })
    expect(ends[0][0]).toBe(100)
    // Coordinates are rounded to a tenth of a unit, like every generator's.
    expect(ends[2][1]).toBeCloseTo(900, 0)
    for (let i = 0; i < 3; i++) expect(Math.abs(ends[i][1] - ends[i][0] - (800 - 120) / 3)).toBeLessThan(0.11)
    for (let i = 1; i < 3; i++) expect(Math.abs(ends[i][0] - ends[i - 1][1] - 60)).toBeLessThan(0.11)
  })
})

describe.each(['sheep-lana', 'turtle-huellas'])('%s — the shipped level', (id) => {
  const level = getLevel(id)
  const target = buildLevelTarget(level)
  const cfg = level.segments!

  it('is a segment level whose every path is its own route', () => {
    expect(cfg).toBeDefined()
    expect(target.routes.length).toBe(level.paths.length)
    expect(target.routes.length).toBeGreaterThan(1)
  })

  it('keeps the stops apart from the next start, so the two marks never sit on each other', () => {
    for (let i = 1; i < target.routes.length; i++) {
      const prevEnd = target.routes[i - 1].polyline.at(-1)!
      const start = target.routes[i].polyline[0]
      expect(Math.hypot(start.x - prevEnd.x, start.y - prevEnd.y), `${id} ${i}`).toBeGreaterThanOrEqual(50)
    }
  })

  it('never lets a stroke landing on one start belong to a neighbour', () => {
    for (let i = 0; i < target.routes.length; i++) {
      for (let j = 0; j < target.routes.length; j++) {
        if (i === j) continue
        const a = target.routes[i].polyline[0]
        const b = target.routes[j].polyline[0]
        expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(cfg.startReach)
      }
    }
  })

  it('is finished by child-like strokes, one per segment, in any order', () => {
    const rand = rng(id.length * 7919)
    let accepted = 0
    let attempts = 0
    for (let trial = 0; trial < 40; trial++) {
      let state = emptySegmentState(target.routes.length)
      const order = target.routes.map((_, i) => i).sort(() => rand() - 0.5)
      for (const i of order) {
        attempts++
        const settled = settleSegmentRelease(state, childStroke(target.routes[i], rand), target.routes, target.corridorWidth, cfg)
        if (settled.accepted === i) accepted++
        state = settled.state
      }
    }
    // A wobbly, uneven, slightly short-or-long stroke still counts nearly
    // every time; what does not count is not stopping, or leaving the line.
    expect(accepted / attempts, `${id}: ${accepted}/${attempts}`).toBeGreaterThanOrEqual(0.95)
  })

  it('rejects a scribble and a stroke that runs straight through every stop', () => {
    const first = target.routes[0].polyline[0]
    const last = target.routes.at(-1)!.polyline.at(-1)!
    const through = line(first, last, 80)
    const state = emptySegmentState(target.routes.length)
    const run = settleSegmentRelease(state, through, target.routes, target.corridorWidth, cfg)
    expect(run.accepted).toBe(-1)
    const scribble = Array.from({ length: 40 }, (_, i) => ({ x: first.x + Math.sin(i) * 60, y: first.y + Math.cos(i * 1.3) * 60 }))
    expect(settleSegmentRelease(state, scribble, target.routes, target.corridorWidth, cfg).accepted).toBe(-1)
  })

  it('puts clue marks on every segment, and lights exactly the marks of the done segments', () => {
    const marks = segmentClueMarks(target.routes, level.clue!.spacing, level.clue!.kind)
    for (let i = 0; i < target.routes.length; i++) {
      expect(marks.filter((m) => m.route === i).length, `${id} segment ${i}`).toBeGreaterThan(0)
    }
    const done = target.routes.map((_, i) => i === 1)
    expect(segmentClueState(marks, done).lit).toEqual(marks.map((m) => m.route === 1))
    expect(segmentClueState(marks, done.map(() => true)).lit.every(Boolean)).toBe(true)
  })
})

describe('the two levels, as docs/21 §4.3 describes them', () => {
  it('sheep-lana: five fence posts, top to bottom, one tuft of wool on each', () => {
    const level = getLevel('sheep-lana')
    const target = buildLevelTarget(level)
    expect(target.routes).toHaveLength(5)
    for (const r of target.routes) {
      const a = r.polyline[0]
      const b = r.polyline.at(-1)!
      expect(a.x).toBeCloseTo(b.x, 5)
      expect(b.y).toBeGreaterThan(a.y)
    }
    const marks = segmentClueMarks(target.routes, level.clue!.spacing, 'wool')
    expect(marks.map((m) => m.route)).toEqual([0, 1, 2, 3, 4])
    // Clear sheet between two posts' corridors.
    const gap = target.routes[1].polyline[0].x - target.routes[0].polyline[0].x - level.corridorWidth
    expect(gap).toBeGreaterThanOrEqual(level.corridorWidth * 0.75)
  })

  it('turtle-huellas: one straight line left to right with three stops, prints on both sides', () => {
    const level = getLevel('turtle-huellas')
    const target = buildLevelTarget(level)
    expect(target.routes).toHaveLength(3)
    const ys = target.routes.flatMap((r) => r.polyline.map((p) => p.y))
    expect(new Set(ys).size).toBe(1)
    for (const r of target.routes) expect(r.polyline.at(-1)!.x).toBeGreaterThan(r.polyline[0].x)
    const marks = segmentClueMarks(target.routes, level.clue!.spacing, 'turtlePrint')
    expect(marks.some((m) => m.y < ys[0])).toBe(true)
    expect(marks.some((m) => m.y > ys[0])).toBe(true)
  })
})

// [T45 follow-up] The octopus never covers a segment's start dot, stop mark,
// clue or corridor; and the furrow's stretches read as separate.
describe('the octopus stands clear of every segment (both shipped levels)', () => {
  // `TraceCanvas`'s own marker radii: start dot 22, stop diamonds 34 (+ a
  // 5-unit stroke), clue marks 28 tall.
  const START_R = 22
  const STOP_R = 34 + 2.5
  const MARK_HALF = 14
  // [T51] The screen's own size and aspect (they were restated here as 96
  // and the pre-T49 art's aspect, so a size change would not be caught).
  const OCTOPUS_H = OCTOPUS_SIZE
  const ASPECT = OCTOPUS_ASPECT
  const hits = (box: { x: number; y: number; width: number; height: number }, p: Point, r: number) => {
    const cx = Math.max(box.x, Math.min(p.x, box.x + box.width))
    const cy = Math.max(box.y, Math.min(p.y, box.y + box.height))
    return Math.hypot(p.x - cx, p.y - cy) < r
  }

  for (const id of ['sheep-lana', 'turtle-huellas']) {
    // The sheet is the same 1000×600 world at 1024x768 and at 768x1024 — the
    // viewport only grows the backdrop AROUND it — so one sheet-space check
    // covers both; the browser captures measure it on screen too.
    for (const viewport of ['1024x768', '768x1024']) {
      it(`${id} @ ${viewport}: his box misses every start, stop, clue and corridor`, () => {
        const level = getLevel(id)
        const target = buildLevelTarget(level)
        const bounds = { x: 0, y: 0, width: target.viewBoxWidth, height: 600 }
        const feet = segmentStandPoint(target.routes, target.corridorWidth, OCTOPUS_H, ASPECT, bounds)
        expect(feet, id).toBeDefined()
        const box = standingBox(feet!, OCTOPUS_H, ASPECT)
        expect(box).toEqual(placeArt({ w: ASPECT, h: 1, grip: STANDING_GRIP }, OCTOPUS_H, feet!))
        expect(box.x).toBeGreaterThanOrEqual(0)
        expect(box.y).toBeGreaterThanOrEqual(0)
        expect(box.x + box.width).toBeLessThanOrEqual(bounds.width)
        expect(box.y + box.height).toBeLessThanOrEqual(600)
        for (const r of target.routes) {
          expect(hits(box, r.polyline[0], START_R), 'start').toBe(false)
          expect(hits(box, r.polyline.at(-1)!, STOP_R), 'stop').toBe(false)
          for (const p of r.polyline) expect(hits(box, p, target.corridorWidth / 2), 'corridor').toBe(false)
        }
        for (const m of segmentClueMarks(target.routes, level.clue!.spacing, level.clue!.kind)) {
          expect(hits(box, m, MARK_HALF), 'clue').toBe(false)
        }
      })
    }
  }

  it('turtle-huellas: 30+ units of sand between stretches, each stop mark wholly before the next start', () => {
    const level = getLevel('turtle-huellas')
    const target = buildLevelTarget(level)
    for (let i = 1; i < target.routes.length; i++) {
      const stop = target.routes[i - 1].polyline.at(-1)!
      const start = target.routes[i].polyline[0]
      expect(start.x - stop.x - level.corridorWidth, `gap ${i}`).toBeGreaterThanOrEqual(30)
      expect(start.x - START_R - (stop.x + STOP_R), `marks ${i}`).toBeGreaterThan(0)
    }
  })

  it('gives up (undefined) rather than overlapping when nothing fits', () => {
    const r = route({ x: 0, y: 300 }, { x: 1000, y: 300 })
    expect(segmentStandPoint([r], 590, OCTOPUS_H, ASPECT, { x: 0, y: 0, width: 1000, height: 600 })).toBeUndefined()
  })
})
