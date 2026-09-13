// The waypoint fold's contract (`free-trail-waypoints` spec: "WaypointConfig
// Shape and the Pure Fold Module", "The Waypoint Latch Is Monotone and
// Visit-Order-Free", "waypointScore Recomputes Purely From the Complete
// Stroke List"). Node environment, no DOM, no component render — every
// export here runs with no jsdom and no testing-library.
import { describe, expect, it } from 'vitest'
import type { ArtImage } from '../detective/assets'
import {
  EMPTY_WAYPOINTS,
  debugCarrier,
  debugTrail,
  debugWaypoints,
  seedWaypoints,
  trailPasses,
  waypointArt,
  waypointRings,
  waypointScore,
  waypointTick,
  type WaypointConfig,
  type WaypointState,
} from './waypoints'

const DORMANT: ArtImage = { href: '/art/sector-flower-dormant.png', w: 256, h: 245 }
const LIT: ArtImage = { href: '/art/sector-flower.png', w: 256, h: 245 }
const HIVE: ArtImage = { href: '/art/sector-honeycomb.png', w: 181, h: 256 }

/** A `bee2`-shaped fixture: three flowers and a hive, matching §4's worked
 *  ladder shape (one rest, three stops, one goal). */
function makeConfig(): WaypointConfig {
  return {
    start: { x: 250, y: 400 },
    stops: [
      { x: 380, y: 280, radius: 84 },
      { x: 520, y: 395, radius: 84 },
      { x: 660, y: 275, radius: 84 },
    ],
    stopArt: { dormant: DORMANT, lit: LIT },
    stopSize: 64,
    goal: { x: 750, y: 390, radius: 88 },
    goalArt: HIVE,
    goalSize: 96,
  }
}

describe('Every export runs with no DOM (spec scenario)', () => {
  it('waypointTick, waypointScore and debugWaypoints all execute in a plain node test', () => {
    const cfg = makeConfig()
    expect(() => waypointTick(EMPTY_WAYPOINTS, [cfg.start], true, cfg)).not.toThrow()
    expect(() => waypointScore([], cfg)).not.toThrow()
    expect(() => debugWaypoints(cfg, 1)).not.toThrow()
  })
})

describe('trailPasses — segment containment, not point containment', () => {
  const w = { x: 500, y: 300, radius: 40 }

  it('a two-point stroke stepping ACROSS a waypoint lights it, even with no sample landing inside it', () => {
    // The samples themselves are 90 units off-target on each side (outside
    // the 40-radius circle), but the SEGMENT between them passes directly
    // through the waypoint's centre — the assertion that fails under
    // sample-only containment.
    const points = [
      { x: 410, y: 300 },
      { x: 590, y: 300 },
    ]
    expect(trailPasses(w, points)).toBe(true)
  })

  it('a point exactly at the radius is inside', () => {
    expect(trailPasses(w, [{ x: w.x + w.radius, y: w.y }])).toBe(true)
  })

  it('a one-point stroke degrades to the point test', () => {
    expect(trailPasses(w, [{ x: w.x, y: w.y }])).toBe(true)
    expect(trailPasses(w, [{ x: w.x + w.radius + 1, y: w.y }])).toBe(false)
  })

  it('an empty stroke passes through nothing', () => {
    expect(trailPasses(w, [])).toBe(false)
  })

  it('a segment that stays well clear of the waypoint does not light it', () => {
    expect(
      trailPasses(w, [
        { x: 0, y: 0 },
        { x: 0, y: 600 },
      ]),
    ).toBe(false)
  })
})

describe('waypointTick — the live fold', () => {
  it('returns the same reference when nothing latches', () => {
    const cfg = makeConfig()
    const next = waypointTick(EMPTY_WAYPOINTS, [{ x: 0, y: 0 }], true, cfg)
    expect(next).toBe(EMPTY_WAYPOINTS)
  })

  it('drawing:false resets seen and joins nothing across a lift', () => {
    const cfg = makeConfig()
    const midStroke: WaypointState = { lit: new Set(), home: false, seen: 5 }
    const next = waypointTick(midStroke, [], false, cfg)
    expect(next.seen).toBe(0)
    expect(next).not.toBe(midStroke)
    // Already at seen:0 — a genuine no-op.
    expect(waypointTick(EMPTY_WAYPOINTS, [], false, cfg)).toBe(EMPTY_WAYPOINTS)
  })

  it('lights a stop the moment the trail passes through it, and latches it', () => {
    const cfg = makeConfig()
    const points = [cfg.start, { x: cfg.stops[0].x, y: cfg.stops[0].y }]
    const next = waypointTick(EMPTY_WAYPOINTS, points, true, cfg)
    expect(next.lit.has(0)).toBe(true)
    expect(next).not.toBe(EMPTY_WAYPOINTS)
    // Latched: a later sample far away does not unlight it.
    const further = waypointTick(next, [...points, { x: 0, y: 0 }], true, cfg)
    expect(further.lit.has(0)).toBe(true)
  })

  it('flowers touched in reverse authored order all light', () => {
    const cfg = makeConfig()
    let state = EMPTY_WAYPOINTS
    const reverseOrder = [cfg.start, ...[...cfg.stops].reverse().map((s) => ({ x: s.x, y: s.y }))]
    state = waypointTick(state, reverseOrder, true, cfg)
    for (let i = 0; i < cfg.stops.length; i++) expect(state.lit.has(i)).toBe(true)
  })

  it('a point outside every radius lights nothing', () => {
    const cfg = makeConfig()
    const next = waypointTick(EMPTY_WAYPOINTS, [{ x: 0, y: 0 }, { x: 0, y: 1 }], true, cfg)
    expect(next).toBe(EMPTY_WAYPOINTS)
  })

  it('a still finger (identical points, still drawing) is a no-op', () => {
    const cfg = makeConfig()
    const seeded: WaypointState = { lit: new Set([0]), home: false, seen: 2 }
    const points = [cfg.start, { x: cfg.start.x + 1, y: cfg.start.y }]
    const next = waypointTick(seeded, points, true, cfg)
    expect(next).toBe(seeded)
  })
})

describe('waypointScore — recomputed purely from the complete stroke list', () => {
  it('scores 0/25/50/75/100 on the bee2-shaped fixture', () => {
    const cfg = makeConfig()
    expect(waypointScore([], cfg)).toBe(0)
    expect(waypointScore([[{ x: cfg.stops[0].x, y: cfg.stops[0].y }]], cfg)).toBe(25)
    expect(
      waypointScore(
        [
          [
            { x: cfg.stops[0].x, y: cfg.stops[0].y },
            { x: cfg.stops[1].x, y: cfg.stops[1].y },
          ],
        ],
        cfg,
      ),
    ).toBe(50)
    expect(
      waypointScore(
        [
          [
            { x: cfg.stops[0].x, y: cfg.stops[0].y },
            { x: cfg.stops[1].x, y: cfg.stops[1].y },
            { x: cfg.stops[2].x, y: cfg.stops[2].y },
          ],
        ],
        cfg,
      ),
    ).toBe(75)
    expect(
      waypointScore(
        [
          [
            { x: cfg.stops[0].x, y: cfg.stops[0].y },
            { x: cfg.stops[1].x, y: cfg.stops[1].y },
            { x: cfg.stops[2].x, y: cfg.stops[2].y },
            { x: cfg.goal.x, y: cfg.goal.y },
          ],
        ],
        cfg,
      ),
    ).toBe(100)
  })

  it('is unordered: a trail visiting the stops backwards scores the same', () => {
    const cfg = makeConfig()
    const forward = [
      cfg.stops.map((s) => ({ x: s.x, y: s.y })).concat([{ x: cfg.goal.x, y: cfg.goal.y }]),
    ]
    const backward = [
      [...cfg.stops].reverse().map((s) => ({ x: s.x, y: s.y })).concat([{ x: cfg.goal.x, y: cfg.goal.y }]),
    ]
    expect(waypointScore(forward, cfg)).toBe(100)
    expect(waypointScore(backward, cfg)).toBe(100)
  })

  it('a lift between two flowers costs nothing — split across two strokes scores the same as one', () => {
    const cfg = makeConfig()
    const oneStroke = [
      [
        { x: cfg.stops[0].x, y: cfg.stops[0].y },
        { x: cfg.stops[1].x, y: cfg.stops[1].y },
      ],
    ]
    const twoStrokes = [
      [{ x: cfg.stops[0].x, y: cfg.stops[0].y }],
      [{ x: cfg.stops[1].x, y: cfg.stops[1].y }],
    ]
    expect(waypointScore(oneStroke, cfg)).toBe(waypointScore(twoStrokes, cfg))
  })

  it('agrees with the terminal waypointTick state for the same strokes', () => {
    const cfg = makeConfig()
    const strokePoints = [
      cfg.start,
      { x: cfg.stops[0].x, y: cfg.stops[0].y },
      { x: cfg.stops[1].x, y: cfg.stops[1].y },
    ]
    const terminal = waypointTick(EMPTY_WAYPOINTS, strokePoints, true, cfg)
    const scoreFromStrokes = waypointScore([strokePoints], cfg)
    const liveReached = terminal.lit.size + (terminal.home ? 1 : 0)
    expect(Math.round((100 * liveReached) / (cfg.stops.length + 1))).toBe(scoreFromStrokes)
  })
})

describe('waypointArt / waypointRings — the goal is always emitted last', () => {
  it('the goal is last in both states, dormant before a latch, lit after', () => {
    const cfg = makeConfig()
    const dormant = waypointArt(cfg, EMPTY_WAYPOINTS)
    expect(dormant).toHaveLength(4)
    expect(dormant[dormant.length - 1].href).toBe(HIVE.href)
    for (let i = 0; i < cfg.stops.length; i++) expect(dormant[i].href).toBe(DORMANT.href)

    const litState: WaypointState = { lit: new Set([0, 1, 2]), home: true, seen: 0 }
    const lit = waypointArt(cfg, litState)
    expect(lit[lit.length - 1].href).toBe(HIVE.href)
    for (let i = 0; i < cfg.stops.length; i++) expect(lit[i].href).toBe(LIT.href)
  })

  it('rings mirror the art order, index for index', () => {
    const cfg = makeConfig()
    const rings = waypointRings(cfg)
    const art = waypointArt(cfg, EMPTY_WAYPOINTS)
    expect(rings).toHaveLength(art.length)
    for (let i = 0; i < rings.length; i++) {
      expect(rings[i].x).toBe(art[i].x)
      expect(rings[i].y).toBe(art[i].y)
    }
  })
})

describe('debugWaypoints / debugTrail / debugCarrier — one k drives all three', () => {
  it('k=0 lights nothing, the bee rests at start', () => {
    const cfg = makeConfig()
    const state = debugWaypoints(cfg, 0)
    expect(state.lit.size).toBe(0)
    expect(state.home).toBe(false)
    expect(debugTrail(cfg, 0)).toEqual([cfg.start])
    expect(debugCarrier(cfg, 0)).toEqual(cfg.start)
  })

  it('k=1..stops.length lights exactly the first k flowers, home false', () => {
    const cfg = makeConfig()
    for (let k = 1; k <= cfg.stops.length; k++) {
      const state = debugWaypoints(cfg, k)
      for (let i = 0; i < cfg.stops.length; i++) expect(state.lit.has(i)).toBe(i < k)
      expect(state.home).toBe(false)
      const trail = debugTrail(cfg, k)
      expect(trail).toHaveLength(k + 1)
      expect(debugCarrier(cfg, k)).toEqual(trail[trail.length - 1])
      expect(debugCarrier(cfg, k)).toEqual({ x: cfg.stops[k - 1].x, y: cfg.stops[k - 1].y })
    }
  })

  it('k=stops.length+1 lights every flower AND reaches the hive', () => {
    const cfg = makeConfig()
    const k = cfg.stops.length + 1
    const state = debugWaypoints(cfg, k)
    expect(state.lit.size).toBe(cfg.stops.length)
    expect(state.home).toBe(true)
    expect(debugCarrier(cfg, k)).toEqual({ x: cfg.goal.x, y: cfg.goal.y })
  })

  it('clamps to [0, stops.length + 1] for out-of-range k', () => {
    const cfg = makeConfig()
    expect(debugWaypoints(cfg, -5)).toEqual(debugWaypoints(cfg, 0))
    expect(debugWaypoints(cfg, 999)).toEqual(debugWaypoints(cfg, cfg.stops.length + 1))
  })
})

describe('seedWaypoints — the one function every reset site must call', () => {
  it('returns EMPTY_WAYPOINTS when no debug count is seeded', () => {
    const cfg = makeConfig()
    expect(seedWaypoints(cfg, null)).toBe(EMPTY_WAYPOINTS)
  })

  it('returns debugWaypoints(cfg, k) when a debug count is present', () => {
    const cfg = makeConfig()
    expect(seedWaypoints(cfg, 2)).toEqual(debugWaypoints(cfg, 2))
  })
})
