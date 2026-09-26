// The spine fold's contract (`radial-spines` spec). Pure, no DOM — every
// test calls the exported functions directly from node, the same
// convention `waypoints.test.ts` follows.
import { describe, expect, it } from 'vitest'
import type { Point } from '../letters/types'
import { getLevel } from './catalog'
import {
  DEMO_SPINES,
  EMPTY_SPINES,
  SPINE_MARK_R,
  acceptedSpineStrokeIndices,
  debugSpineStrokes,
  debugSpines,
  nextSpineIndex,
  seedSpines,
  spineAim,
  spineAnchors,
  spineBody,
  spineDemoPaths,
  spineMarks,
  spineOrigin,
  spineRings,
  spineScore,
  spineSettle,
  spineSpikePaths,
  type SpineAnchor,
  type SpineConfig,
} from './spines'

function makeConfig(over: Partial<SpineConfig> = {}): SpineConfig {
  return {
    pose: 'curled',
    body: { centre: { x: 500, y: 500 }, height: 300 },
    arc: { from: 0, to: 360 },
    count: 8,
    rules: { baseRadius: 30, tolDeg: 30, straightness: 0.85, lenMin: 80, lenMax: 160 },
    ...over,
  }
}

/** A straight two-point stroke from `anchor`, outward along its own normal
 *  by `len` — passes measures 2 (angle 0), 3 (straightness 1), 5 (strictly
 *  increasing distance from the centroid along the anchor's own ray never
 *  crosses the silhouette). Only measure 4 (the length band) and measure 1
 *  (base proximity) depend on the caller. */
function idealStroke(anchor: SpineAnchor, len: number): Point[] {
  return [
    { x: anchor.x, y: anchor.y },
    { x: anchor.x + anchor.nx * len, y: anchor.y + anchor.ny * len },
  ]
}

function midLen(cfg: SpineConfig): number {
  return (cfg.rules.lenMin + cfg.rules.lenMax) / 2
}

describe('spineAnchors — determinism, shape, spacing (radial-spines spec)', () => {
  it('is deterministic — calling twice on the same config is deep-equal', () => {
    const cfg = makeConfig()
    expect(spineAnchors(cfg)).toEqual(spineAnchors(cfg))
  })

  it('produces exactly cfg.count anchors, evenly spaced across cfg.arc', () => {
    const cfg = makeConfig({ count: 6, arc: { from: 0, to: 180 } })
    const anchors = spineAnchors(cfg)
    expect(anchors).toHaveLength(6)
    for (let i = 1; i < anchors.length; i++) {
      expect(anchors[i].deg - anchors[i - 1].deg).toBeCloseTo(180 / 6, 6)
    }
    // Midpoint sampling: the first anchor sits half a step past `arc.from`,
    // the last sits half a step before `arc.to` — never on the endpoints.
    expect(anchors[0].deg).toBeCloseTo(180 / 6 / 2, 6)
  })

  it('anchor-spacing invariant shape: 2·baseRadius ≤ min neighbour chord, and baseRadius ≥ TolTouch (26)', () => {
    const cfg = makeConfig({ count: 8, rules: { ...makeConfig().rules, baseRadius: 26 } })
    const anchors = spineAnchors(cfg)
    let minChord = Infinity
    for (let i = 1; i < anchors.length; i++) {
      const d = Math.hypot(anchors[i].x - anchors[i - 1].x, anchors[i].y - anchors[i - 1].y)
      if (d < minChord) minChord = d
    }
    expect(cfg.rules.baseRadius).toBeGreaterThanOrEqual(26)
    expect(2 * cfg.rules.baseRadius).toBeLessThanOrEqual(minChord)
  })
})

describe('spineOrigin', () => {
  it('equals the first anchor A_0, derived rather than authored', () => {
    const cfg = makeConfig()
    expect(spineOrigin(cfg)).toEqual({ x: spineAnchors(cfg)[0].x, y: spineAnchors(cfg)[0].y })
  })
})

describe('spineBody', () => {
  it("places the grip point (the measured centroid) at cfg.body.centre", () => {
    const cfg = makeConfig()
    const { box } = spineBody(cfg)
    const [gx, gy] = [0.5002, 0.5029] // HEDGEHOG_SILHOUETTE.curled.centroid
    expect(box.x + gx * box.width).toBeCloseTo(cfg.body.centre.x, 3)
    expect(box.y + gy * box.height).toBeCloseTo(cfg.body.centre.y, 3)
  })
})

describe('measure 1 — base proximity, nearest-unfilled, deterministic greedy assignment', () => {
  it('assigns a stroke whose base is within baseRadius of exactly one unfilled anchor', () => {
    const cfg = makeConfig()
    const anchors = spineAnchors(cfg)
    const stroke = idealStroke(anchors[2], midLen(cfg))
    const settled = spineSettle(EMPTY_SPINES, [stroke], cfg)
    expect(settled.filled.has(2)).toBe(true)
    expect(settled.filled.size).toBe(1)
  })

  it('fills nothing when the base lies outside every anchor radius', () => {
    const cfg = makeConfig()
    const far: Point[] = [{ x: -5000, y: -5000 }, { x: -5000 + 120, y: -5000 }]
    const settled = spineSettle(EMPTY_SPINES, [far], cfg)
    expect(settled).toBe(EMPTY_SPINES) // no-op reference: nothing latched
  })

  it('selects the nearer of two unfilled anchors within radius', () => {
    const cfg = makeConfig({ rules: { ...makeConfig().rules, baseRadius: 500 } })
    const anchors = spineAnchors(cfg)
    // Base exactly at anchor 3 — distance 0 there, positive to every other
    // anchor, so anchor 3 is unambiguously nearer.
    const stroke = idealStroke(anchors[3], midLen(cfg))
    const settled = spineSettle(EMPTY_SPINES, [stroke], cfg)
    expect(settled.filled.has(3)).toBe(true)
    expect(settled.filled.size).toBe(1)
  })

  it('never reassigns an already-filled anchor — the unfilled one is picked instead', () => {
    const cfg = makeConfig()
    const anchors = spineAnchors(cfg)
    const prev = { filled: new Set([1]), aiming: null }
    // A stroke whose direction/length match anchor 1's own normal (so it
    // would fill anchor 1 if reassignment were allowed) but whose base is
    // placed exactly at anchor 1 — since anchor 1 is filled, it must fall
    // through to no fill at all when it is the ONLY anchor within radius.
    const stroke = idealStroke(anchors[1], midLen(cfg))
    const settled = spineSettle(prev, [stroke], cfg)
    expect(settled).toBe(prev) // no unfilled anchor within radius — no-op
  })

  it('picks the unfilled anchor when both a filled and an unfilled one are within radius', () => {
    const cfg = makeConfig({ rules: { ...makeConfig().rules, baseRadius: 500 } })
    const anchors = spineAnchors(cfg)
    const prev = { filled: new Set([1]), aiming: null }
    // Base at anchor 2 (unfilled, distance 0) — nearer than anchor 1
    // (filled) regardless, but this proves the filled one is never chosen
    // even under a huge radius that reaches every anchor.
    const stroke = idealStroke(anchors[2], midLen(cfg))
    const settled = spineSettle(prev, [stroke], cfg)
    expect(settled.filled.has(2)).toBe(true)
    expect(settled.filled.has(1)).toBe(true) // still filled, untouched
  })
})

describe('measure 1 — off-centre start tolerance and reverse strokes (T3, 2026-09-25 tablet playtest)', () => {
  it('regression: a stroke starting ~25 units off the real hedgehog1 start dot is accepted (was rejected before T3)', () => {
    // The user's own report: "a well-drawn spine is rejected when it does
    // not start exactly on the small start dot" — 20-30 viewBox units off.
    // This runs against the REAL shipped hedgehog1 config, not a fixture,
    // so it fails again the instant catalog.ts's baseRadius regresses.
    const cfg = getLevel('hedgehog1').spines!
    const anchors = spineAnchors(cfg)
    const anchor = anchors[0]
    const offsetStart: Point = { x: anchor.x + anchor.ny * 25, y: anchor.y - anchor.nx * 25 } // tangential, 25 units off
    const len = (cfg.rules.lenMin + cfg.rules.lenMax) / 2
    const stroke: Point[] = [
      offsetStart,
      { x: offsetStart.x + anchor.nx * len, y: offsetStart.y + anchor.ny * len },
    ]
    const settled = spineSettle(EMPTY_SPINES, [stroke], cfg)
    expect(settled.filled.has(0)).toBe(true)
  })

  it('still rejects a stroke that starts well outside baseRadius — the tolerance is generous, not unlimited', () => {
    const cfg = makeConfig()
    const anchors = spineAnchors(cfg)
    const anchor = anchors[0]
    const farStart: Point = { x: anchor.x + anchor.ny * (cfg.rules.baseRadius + 40), y: anchor.y - anchor.nx * (cfg.rules.baseRadius + 40) }
    const stroke = [farStart, { x: farStart.x + anchor.nx * midLen(cfg), y: farStart.y + anchor.ny * midLen(cfg) }]
    const settled = spineSettle(EMPTY_SPINES, [stroke], cfg)
    expect(settled).toBe(EMPTY_SPINES)
  })

  it('accepts a spine drawn tip→base (reversed) exactly as it would base→tip', () => {
    const cfg = makeConfig()
    const anchors = spineAnchors(cfg)
    const forward = idealStroke(anchors[3], midLen(cfg))
    const reversed = [forward[1], forward[0]] // same two points, opposite order
    const settled = spineSettle(EMPTY_SPINES, [reversed], cfg)
    expect(settled.filled.has(3)).toBe(true)
  })

  it('tries forward first: when the FIRST point matches an unfilled anchor, that one wins even if the last point is also in range of another', () => {
    const cfg = makeConfig({ rules: { ...makeConfig().rules, baseRadius: 500 } })
    const anchors = spineAnchors(cfg)
    const stroke = idealStroke(anchors[2], midLen(cfg)) // base at anchor 2, tip far from anchor 2 but within the huge radius of others
    const settled = spineSettle(EMPTY_SPINES, [stroke], cfg)
    expect(settled.filled.has(2)).toBe(true)
    expect(settled.filled.size).toBe(1)
  })

  it('a reversed stroke still respects every other measure (direction, once reoriented)', () => {
    const cfg = makeConfig()
    const anchors = spineAnchors(cfg)
    const a = anchors[5]
    const len = midLen(cfg)
    // Reversed AND tangential (measure 2 must still fail): base end near the
    // anchor, tip end rotated 90° off the outward normal.
    const tangent = { x: -a.ny, y: a.nx }
    const tip = { x: a.x + tangent.x * len, y: a.y + tangent.y * len }
    const reversedTangential = [tip, { x: a.x, y: a.y }]
    const settled = spineSettle(EMPTY_SPINES, [reversedTangential], cfg)
    expect(settled).toBe(EMPTY_SPINES)
  })
})

describe('spineAim — reverse-stroke fallback (T3)', () => {
  it('aims at the anchor near the LAST point when the first point matches nothing', () => {
    const cfg = makeConfig()
    const anchors = spineAnchors(cfg)
    const points = [
      { x: anchors[2].x + anchors[2].nx * midLen(cfg), y: anchors[2].y + anchors[2].ny * midLen(cfg) },
      { x: anchors[2].x, y: anchors[2].y },
    ]
    const state = spineAim(EMPTY_SPINES, points, true, cfg)
    expect(state.aiming).toBe(2)
  })
})

describe('measure 2 — outward direction within tolDeg', () => {
  it('fills when the stroke direction is within tolDeg of the outward normal', () => {
    const cfg = makeConfig()
    const anchors = spineAnchors(cfg)
    const settled = spineSettle(EMPTY_SPINES, [idealStroke(anchors[0], midLen(cfg))], cfg)
    expect(settled.filled.has(0)).toBe(true)
  })

  it('fails on direction alone when aimed tangentially, beyond tolDeg', () => {
    const cfg = makeConfig()
    const anchors = spineAnchors(cfg)
    const a = anchors[0]
    // Tangential direction (rotate the outward normal 90°) — the near-
    // circular curled pose keeps this stroke outside the silhouette (a
    // straight line from a boundary point along its own tangent only moves
    // further from the centroid), so measures 1, 3, 4 and 5 all still pass.
    const tangent = { x: -a.ny, y: a.nx }
    const len = midLen(cfg)
    const stroke: Point[] = [{ x: a.x, y: a.y }, { x: a.x + tangent.x * len, y: a.y + tangent.y * len }]
    // Sanity: straightness is 1 (two points) and chord is exactly `len`.
    const chord = Math.hypot(stroke[1].x - stroke[0].x, stroke[1].y - stroke[0].y)
    expect(chord).toBeCloseTo(len, 3)
    const settled = spineSettle(EMPTY_SPINES, [stroke], cfg)
    expect(settled).toBe(EMPTY_SPINES)
  })
})

describe('measure 3 — straightness (chord-to-arclength ratio)', () => {
  it('fills a straight stroke at or above the straightness floor', () => {
    const cfg = makeConfig()
    const anchors = spineAnchors(cfg)
    const settled = spineSettle(EMPTY_SPINES, [idealStroke(anchors[4], midLen(cfg))], cfg)
    expect(settled.filled.has(4)).toBe(true)
  })

  it('fails on straightness alone when the stroke wobbles enough, chord and direction unchanged', () => {
    const cfg = makeConfig()
    const anchors = spineAnchors(cfg)
    const a = anchors[4]
    const len = midLen(cfg)
    const tangent = { x: -a.ny, y: a.nx }
    const end = { x: a.x + a.nx * len, y: a.y + a.ny * len }
    // A wobble perpendicular to the chord, roughly midway — same endpoints
    // (same chord, same direction, same length), longer arclength.
    const mid = {
      x: a.x + a.nx * (len / 2) + tangent.x * (len * 0.75),
      y: a.y + a.ny * (len / 2) + tangent.y * (len * 0.75),
    }
    const stroke: Point[] = [{ x: a.x, y: a.y }, mid, end]
    const chord = Math.hypot(end.x - a.x, end.y - a.y)
    const arc =
      Math.hypot(mid.x - a.x, mid.y - a.y) + Math.hypot(end.x - mid.x, end.y - mid.y)
    expect(chord / arc).toBeLessThan(cfg.rules.straightness)
    const settled = spineSettle(EMPTY_SPINES, [stroke], cfg)
    expect(settled).toBe(EMPTY_SPINES)
  })
})

describe('measure 4 — chord length inside the authored band', () => {
  it('fills when the chord falls inside [lenMin, lenMax]', () => {
    const cfg = makeConfig()
    const anchors = spineAnchors(cfg)
    const settled = spineSettle(EMPTY_SPINES, [idealStroke(anchors[5], cfg.rules.lenMin + 5)], cfg)
    expect(settled.filled.has(5)).toBe(true)
  })

  it('fails on length alone when the chord is too short', () => {
    const cfg = makeConfig()
    const anchors = spineAnchors(cfg)
    const settled = spineSettle(EMPTY_SPINES, [idealStroke(anchors[5], cfg.rules.lenMin - 20)], cfg)
    expect(settled).toBe(EMPTY_SPINES)
  })

  it('fails on length alone when the chord is too long', () => {
    const cfg = makeConfig()
    const anchors = spineAnchors(cfg)
    const settled = spineSettle(EMPTY_SPINES, [idealStroke(anchors[5], cfg.rules.lenMax + 40)], cfg)
    expect(settled).toBe(EMPTY_SPINES)
  })
})

describe('measure 5 — no sample crosses the body interior', () => {
  it('fills a stroke that stays outside the body the whole way', () => {
    const cfg = makeConfig()
    const anchors = spineAnchors(cfg)
    const settled = spineSettle(EMPTY_SPINES, [idealStroke(anchors[6], midLen(cfg))], cfg)
    expect(settled.filled.has(6)).toBe(true)
  })

  it('fails on the crossing rule when the path dips back inside the silhouette beyond its own anchor tolerance', () => {
    const cfg = makeConfig()
    const anchors = spineAnchors(cfg)
    const a = anchors[7]
    const { centre } = cfg.body
    // A detour that swings close to the centroid, well beyond baseRadius
    // from the anchor, before returning to an outward endpoint whose chord
    // and direction from the base are otherwise admissible.
    const end = { x: a.x + a.nx * midLen(cfg), y: a.y + a.ny * midLen(cfg) }
    const near = { x: centre.x + a.nx * 5, y: centre.y + a.ny * 5 } // almost at the centroid
    const stroke: Point[] = [{ x: a.x, y: a.y }, near, end]
    expect(Math.hypot(near.x - a.x, near.y - a.y)).toBeGreaterThan(cfg.rules.baseRadius)
    const settled = spineSettle(EMPTY_SPINES, [stroke], cfg)
    expect(settled).toBe(EMPTY_SPINES)
  })
})

describe('all five measures must hold jointly — no partial credit', () => {
  it('four of five passing still fills nothing (length band violated alone)', () => {
    const cfg = makeConfig()
    const anchors = spineAnchors(cfg)
    // Direction 0°, straightness 1, no crossing — only length is wrong.
    const settled = spineSettle(EMPTY_SPINES, [idealStroke(anchors[0], cfg.rules.lenMax + 100)], cfg)
    expect(settled).toBe(EMPTY_SPINES)
  })

  it('all five passing fills the anchor', () => {
    const cfg = makeConfig()
    const anchors = spineAnchors(cfg)
    const settled = spineSettle(EMPTY_SPINES, [idealStroke(anchors[0], midLen(cfg))], cfg)
    expect(settled.filled.has(0)).toBe(true)
  })
})

describe('spineScore — recomputes purely from the complete settled stroke list', () => {
  it('equals round(100 · filled / anchors.length)', () => {
    const cfg = makeConfig({ count: 8 })
    const anchors = spineAnchors(cfg)
    const strokes = [idealStroke(anchors[0], midLen(cfg)), idealStroke(anchors[1], midLen(cfg))]
    expect(spineScore(strokes, cfg)).toBe(Math.round((100 * 2) / 8))
  })

  it('reproduces the live fold\'s own final filled set for the same attempt', () => {
    const cfg = makeConfig()
    const anchors = spineAnchors(cfg)
    const strokes = [idealStroke(anchors[0], midLen(cfg)), idealStroke(anchors[2], midLen(cfg))]
    const settled = spineSettle(EMPTY_SPINES, strokes, cfg)
    expect(spineScore(strokes, cfg)).toBe(Math.round((100 * settled.filled.size) / anchors.length))
  })

  it('is unaffected by what a live mid-drawing buffer might have suggested', () => {
    const cfg = makeConfig()
    const anchors = spineAnchors(cfg)
    const strokes = [idealStroke(anchors[0], midLen(cfg))]
    // Two calls, independent of any live state, must agree.
    expect(spineScore(strokes, cfg)).toBe(spineScore(strokes, cfg))
  })

  it('a rejected stroke does not lower the score below what filled anchors already earned', () => {
    const cfg = makeConfig({ count: 10 })
    const anchors = spineAnchors(cfg)
    const goodStrokes = [
      idealStroke(anchors[0], midLen(cfg)),
      idealStroke(anchors[1], midLen(cfg)),
      idealStroke(anchors[2], midLen(cfg)),
    ]
    const before = spineScore(goodStrokes, cfg)
    const rejected: Point[] = [{ x: -9999, y: -9999 }, { x: -9999 + 10, y: -9999 }]
    const after = spineScore([...goodStrokes, rejected], cfg)
    expect(after).toBe(before)
  })
})

describe('acceptedSpineStrokeIndices (T13, tablet playtest #2: "a line that isn\'t a spine could disappear")', () => {
  it('reports the index of every stroke that actually filled an anchor, in order', () => {
    const cfg = makeConfig({ count: 8 })
    const anchors = spineAnchors(cfg)
    const strokes = [idealStroke(anchors[0], midLen(cfg)), idealStroke(anchors[2], midLen(cfg))]
    expect(acceptedSpineStrokeIndices(strokes, cfg)).toEqual(new Set([0, 1]))
  })

  it('excludes a rejected stroke\'s own index, without disturbing the strokes around it', () => {
    const cfg = makeConfig({ count: 8 })
    const anchors = spineAnchors(cfg)
    const rejected: Point[] = [{ x: -9999, y: -9999 }, { x: -9999 + 10, y: -9999 }]
    const strokes = [idealStroke(anchors[0], midLen(cfg)), rejected, idealStroke(anchors[1], midLen(cfg))]
    expect(acceptedSpineStrokeIndices(strokes, cfg)).toEqual(new Set([0, 2]))
  })

  it('the accepted COUNT always agrees with spineScore\'s own filled.size (same measures, same result)', () => {
    const cfg = makeConfig({ count: 8 })
    const anchors = spineAnchors(cfg)
    const rejected: Point[] = [{ x: -9999, y: -9999 }, { x: -9999 + 10, y: -9999 }]
    const strokes = [
      idealStroke(anchors[0], midLen(cfg)),
      rejected,
      idealStroke(anchors[1], midLen(cfg)),
      idealStroke(anchors[3], midLen(cfg)),
    ]
    const settled = spineSettle(EMPTY_SPINES, strokes, cfg)
    expect(acceptedSpineStrokeIndices(strokes, cfg).size).toBe(settled.filled.size)
  })

  it('empty strokes and an empty list are both handled with an empty result', () => {
    const cfg = makeConfig()
    expect(acceptedSpineStrokeIndices([], cfg)).toEqual(new Set())
    expect(acceptedSpineStrokeIndices([[]], cfg)).toEqual(new Set())
  })
})

describe('monotonicity — appending a stroke never shrinks filled', () => {
  it('a growing stroke list only ever grows the settled set', () => {
    const cfg = makeConfig({ count: 8 })
    const anchors = spineAnchors(cfg)
    let state = EMPTY_SPINES
    let prevSize = 0
    for (let i = 0; i < anchors.length; i++) {
      state = spineSettle(state, [idealStroke(anchors[i], midLen(cfg))], cfg)
      expect(state.filled.size).toBeGreaterThanOrEqual(prevSize)
      prevSize = state.filled.size
    }
    expect(prevSize).toBe(anchors.length)
  })
})

describe('a filled anchor never unfills within an attempt', () => {
  it('stays filled after later strokes are drawn, including ones that fill nothing', () => {
    const cfg = makeConfig()
    const anchors = spineAnchors(cfg)
    let state = spineSettle(EMPTY_SPINES, [idealStroke(anchors[0], midLen(cfg))], cfg)
    expect(state.filled.has(0)).toBe(true)
    const rejected: Point[] = [{ x: -9999, y: -9999 }, { x: -9999 + 10, y: -9999 }]
    state = spineSettle(state, [rejected], cfg)
    expect(state.filled.has(0)).toBe(true)
  })

  it('restart clears every latch — EMPTY_SPINES has none filled', () => {
    expect(EMPTY_SPINES.filled.size).toBe(0)
  })
})

describe('a stroke that fills no anchor is not punished', () => {
  it('leaves the settled state unchanged (no-op reference), never a reset', () => {
    const cfg = makeConfig()
    const prev = spineSettle(EMPTY_SPINES, [idealStroke(spineAnchors(cfg)[0], midLen(cfg))], cfg)
    const rejected: Point[] = [{ x: -9999, y: -9999 }, { x: -9999 + 10, y: -9999 }]
    const next = spineSettle(prev, [rejected], cfg)
    expect(next).toBe(prev)
  })
})

describe('spineAim — live fold, aiming only, never scoreable', () => {
  it('returns the SAME reference when nothing latches (not drawing, or unchanged aim)', () => {
    const cfg = makeConfig()
    expect(spineAim(EMPTY_SPINES, [], false, cfg)).toBe(EMPTY_SPINES)
    const anchors = spineAnchors(cfg)
    const state = spineAim(EMPTY_SPINES, [{ x: anchors[0].x, y: anchors[0].y }], true, cfg)
    expect(state.aiming).toBe(0)
    // Same anchor targeted again — no change, same reference.
    expect(spineAim(state, [{ x: anchors[0].x, y: anchors[0].y }], true, cfg)).toBe(state)
  })

  it('never writes filled — aiming is render-only', () => {
    const cfg = makeConfig()
    const anchors = spineAnchors(cfg)
    const state = spineAim(EMPTY_SPINES, [{ x: anchors[0].x, y: anchors[0].y }], true, cfg)
    expect(state.filled.size).toBe(0)
  })

  it('clears aiming on lift', () => {
    const cfg = makeConfig()
    const anchors = spineAnchors(cfg)
    const aiming = spineAim(EMPTY_SPINES, [{ x: anchors[0].x, y: anchors[0].y }], true, cfg)
    const lifted = spineAim(aiming, [], false, cfg)
    expect(lifted.aiming).toBeNull()
  })
})

describe('spineMarks — render projection', () => {
  it("centre equals A_i + SPINE_MARK_R·n̂_i, for both mark states", () => {
    const cfg = makeConfig()
    const anchors = spineAnchors(cfg)
    const state = spineSettle(EMPTY_SPINES, [idealStroke(anchors[0], midLen(cfg))], cfg)
    const marks = spineMarks(cfg, state)
    expect(marks).toHaveLength(anchors.length)
    marks.forEach((m, i) => {
      expect(m.x).toBeCloseTo(anchors[i].x + SPINE_MARK_R * anchors[i].nx, 6)
      expect(m.y).toBeCloseTo(anchors[i].y + SPINE_MARK_R * anchors[i].ny, 6)
      expect(m.filled).toBe(i === 0)
    })
  })

  it('marks exactly the lowest-index unfilled anchor as next, mutually exclusive with filled (T3)', () => {
    const cfg = makeConfig()
    const state = spineSettle(EMPTY_SPINES, [idealStroke(spineAnchors(cfg)[0], midLen(cfg))], cfg)
    const marks = spineMarks(cfg, state)
    marks.forEach((m, i) => {
      expect(m.next).toBe(i === 1) // 0 is filled, 1 is the next lowest unfilled
      expect(m.filled && m.next).toBe(false)
    })
  })

  it('no mark is next once every anchor is filled', () => {
    const cfg = makeConfig({ count: 3 })
    const anchors = spineAnchors(cfg)
    const state = spineSettle(
      EMPTY_SPINES,
      anchors.map((a) => idealStroke(a, midLen(cfg))),
      cfg,
    )
    expect(spineMarks(cfg, state).every((m) => !m.next)).toBe(true)
  })
})

describe('nextSpineIndex — the "draw here next" hint (T3)', () => {
  it('returns 0 on EMPTY_SPINES — anchor order is generator order', () => {
    const cfg = makeConfig()
    expect(nextSpineIndex(cfg, EMPTY_SPINES)).toBe(0)
  })

  it('returns the lowest unfilled index, not the most recently filled', () => {
    const state = { filled: new Set([0, 2]), aiming: null }
    expect(nextSpineIndex(makeConfig(), state)).toBe(1)
  })

  it('returns null once every anchor is filled', () => {
    const cfg = makeConfig({ count: 2 })
    const state = { filled: new Set([0, 1]), aiming: null }
    expect(nextSpineIndex(cfg, state)).toBeNull()
  })
})

describe('spineRings — one debug ring per anchor at baseRadius', () => {
  it('emits one ring per anchor, all at baseRadius', () => {
    const cfg = makeConfig()
    const rings = spineRings(cfg)
    expect(rings).toHaveLength(cfg.count)
    for (const ring of rings) expect(ring.radius).toBe(cfg.rules.baseRadius)
  })
})

describe('debugSpines / seedSpines — the ungated screenshot-seeding flag', () => {
  it('seeds exactly the first k anchors (by generator order) filled, the rest unfilled', () => {
    const cfg = makeConfig({ count: 8 })
    const state = debugSpines(cfg, 3)
    for (let i = 0; i < 8; i++) expect(state.filled.has(i)).toBe(i < 3)
    expect(state.aiming).toBeNull()
  })

  it('clamps k to [0, anchors.length]', () => {
    const cfg = makeConfig({ count: 5 })
    expect(debugSpines(cfg, -3).filled.size).toBe(0)
    expect(debugSpines(cfg, 999).filled.size).toBe(5)
  })

  it('seedSpines falls back to EMPTY_SPINES when debugCount is null', () => {
    const cfg = makeConfig()
    expect(seedSpines(cfg, null)).toBe(EMPTY_SPINES)
  })

  it('seedSpines applies debugSpines when debugCount is a number', () => {
    const cfg = makeConfig({ count: 6 })
    expect(seedSpines(cfg, 2)).toEqual(debugSpines(cfg, 2))
  })
})

describe('spineDemoPaths — the demo repair\'s own source (design.md §2 D3)', () => {
  it('emits exactly k anchor→tip segments, in generator order', () => {
    const cfg = makeConfig({ count: 6 })
    const paths = spineDemoPaths(cfg, DEMO_SPINES)
    expect(paths).toHaveLength(DEMO_SPINES)
    for (const d of paths) {
      expect(d.startsWith('M ')).toBe(true)
      expect(d).toContain('L ')
    }
  })

  it('clamps k to the anchor count', () => {
    const cfg = makeConfig({ count: 4 })
    expect(spineDemoPaths(cfg, 999)).toHaveLength(4)
    expect(spineDemoPaths(cfg, 0)).toHaveLength(0)
  })
})

describe('debugSpineStrokes — the ink `?debug=espinas:<k>` paints (drift guard)', () => {
  it('emits k two-point strokes, each starting at its own anchor', () => {
    const cfg = makeConfig({ count: 6 })
    const anchors = spineAnchors(cfg)
    const strokes = debugSpineStrokes(cfg, 4)
    expect(strokes).toHaveLength(4)
    strokes.forEach((stroke, i) => {
      expect(stroke).toHaveLength(2)
      expect(stroke[0]).toEqual({ x: anchors[i].x, y: anchors[i].y })
    })
  })

  it('puts the tip at the length band midpoint along the anchor normal', () => {
    const cfg = makeConfig({ count: 5 })
    const anchors = spineAnchors(cfg)
    const len = (cfg.rules.lenMin + cfg.rules.lenMax) / 2
    const [base, tip] = debugSpineStrokes(cfg, 1)[0]
    expect(Math.hypot(tip.x - base.x, tip.y - base.y)).toBeCloseTo(len, 6)
    expect(tip.x).toBeCloseTo(anchors[0].x + anchors[0].nx * len, 9)
    expect(tip.y).toBeCloseTo(anchors[0].y + anchors[0].ny * len, 9)
  })

  it('clamps k the SAME way debugSpines fills — one number, never two stories', () => {
    const cfg = makeConfig({ count: 4 })
    expect(debugSpineStrokes(cfg, 999)).toHaveLength(4)
    expect(debugSpineStrokes(cfg, 0)).toHaveLength(0)
    expect(debugSpineStrokes(cfg, -3)).toHaveLength(0)
    for (let k = 0; k <= 4; k++) {
      expect(debugSpineStrokes(cfg, k), `k=${k}`).toHaveLength(debugSpines(cfg, k).filled.size)
    }
  })

  // The whole point of factoring the anchor→tip computation: two functions
  // independently deciding where a tip sits is how a still frame ends up
  // contradicting the demonstration the child was just shown.
  it('agrees with spineDemoPaths on every tip, for every k', () => {
    for (const cfg of [makeConfig({ count: 6 }), makeConfig({ pose: 'profile', count: 5 })]) {
      for (let k = 0; k <= 7; k++) {
        const fromStrokes = debugSpineStrokes(cfg, k).map(
          ([base, tip]) => `M ${base.x} ${base.y} L ${tip.x} ${tip.y}`,
        )
        expect(fromStrokes, `k=${k}`).toEqual(spineDemoPaths(cfg, k))
      }
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────
// T19 (`odd/tasks/prewriting-stage-completion.md`, third tablet playtest:
// "it's still really hard: it never accepts it even though I started really
// close"): the MEASURED real blocker, and the fix.
//
// Measure 1 already admits a start point anywhere within `baseRadius` of an
// anchor — not ON it. But measure 2 used to compare the drawn chord against
// the ANCHOR's own idealised outward ray (`anchor.nx/ny`, the direction from
// the centroid straight through the anchor's EXACT position). Direction is
// translation-invariant, so that comparison is blind to WHERE the child
// actually started — it only ever measures the fixed angle between the
// drawn vector and the anchor's own ray, which is large exactly when a
// child starts off the anchor and then does the natural thing: pull straight
// away from the body from THEIR OWN fingertip (a vector that matches the
// LOCAL radial ray through their own start point, not the anchor's). The fix
// (`passesRemainingMeasures`, `spines.ts`) compares against that local ray
// instead. The next block proves the OLD comparison would reject a stroke
// the NEW one accepts, then the realistic-stroke block proves the family is
// passable by a genuinely wobbly child hand.
// ─────────────────────────────────────────────────────────────────────────
describe('measure 2 fix — direction compared to the LOCAL start ray, not the anchor\'s own idealised ray (T19)', () => {
  it('accepts a stroke that starts off-anchor (within baseRadius) and pulls exactly radially from its OWN start point', () => {
    // A smaller body (shorter anchor radius) makes a fixed tangential
    // offset worth a BIGGER angle (`atan(offset / r)`) — the same real
    // effect `catalog.ts`'s own T19 comment describes on `hedgehog4`, where
    // `baseRadius` is a sizeable fraction of the anchor's own radius.
    const cfg = makeConfig({ body: { centre: { x: 500, y: 500 }, height: 200 }, rules: { ...makeConfig().rules, baseRadius: 40, tolDeg: 20 } })
    const anchors = spineAnchors(cfg)
    const anchor = anchors[0]
    const { centre } = cfg.body
    // Start 39 of the 40 available baseRadius units off the anchor, TANGENT
    // to the anchor's own ray (the worst-case direction for the old
    // comparison: it maximises the angle between the anchor's ray and the
    // local ray through this start point, for a fixed offset magnitude).
    const start: Point = { x: anchor.x + anchor.ny * 39, y: anchor.y - anchor.nx * 39 }
    const localAngle = Math.atan2(start.y - centre.y, start.x - centre.x)
    const len = midLen(cfg)
    const end: Point = { x: start.x + Math.cos(localAngle) * len, y: start.y + Math.sin(localAngle) * len }
    const stroke = [start, end]

    // Sanity: this stroke is aimed EXACTLY along its own local radial ray —
    // a perfectly drawn "pull away from the body" from wherever the finger
    // actually is — so the fix must accept it outright.
    const settled = spineSettle(EMPTY_SPINES, [stroke], cfg)
    expect(settled.filled.has(0)).toBe(true)

    // And the regression it fixes: the SAME stroke, judged against the
    // anchor's own idealised ray (the pre-T19 comparison), would have been
    // rejected — this is what "it never accepts it even though I started
    // really close" measured out to.
    const dx = end.x - start.x
    const dy = end.y - start.y
    const oldAngle =
      (Math.acos(
        Math.max(
          -1,
          Math.min(1, (dx * anchor.nx + dy * anchor.ny) / (Math.hypot(dx, dy) * Math.hypot(anchor.nx, anchor.ny))),
        ),
      ) *
        180) /
      Math.PI
    expect(oldAngle).toBeGreaterThan(cfg.rules.tolDeg)
  })

  it('an on-anchor stroke (offset 0) is unaffected — the fix reduces to the old comparison exactly', () => {
    const cfg = makeConfig()
    const anchors = spineAnchors(cfg)
    const settled = spineSettle(EMPTY_SPINES, [idealStroke(anchors[3], midLen(cfg))], cfg)
    expect(settled.filled.has(3)).toBe(true)
  })
})

/** A small deterministic PRNG (mulberry32) — realistic-noise fixtures stay
 *  reproducible without hand-authoring dozens of literal points, and without
 *  `Math.random()` making a CI run flaky on the one seed that happens to
 *  wobble too far. */
function mulberry32(seed: number): () => number {
  let a = seed
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * A REALISTIC six-year-old's stroke toward `anchor`: starts up to
 * `startOffsetFrac · baseRadius` away from the anchor (a finger's width off,
 * never exactly on it), pulls roughly along the LOCAL radial ray through
 * that actual start point (the natural "away from the body" motion, not a
 * compass bearing toward the anchor's own idealised angle) with a small
 * `angleErrorDeg` aiming error, and wobbles a little along the way — a
 * gentle bow plus per-point jitter, both a small fraction of the stroke's
 * own length, so it is never the two-point mathematically-straight line
 * `idealStroke` draws. Deterministic per `seed`.
 */
function noisyChildStroke(
  cfg: SpineConfig,
  anchor: SpineAnchor,
  len: number,
  opts: { seed: number; startOffsetFrac: number; angleErrorDeg: number },
): Point[] {
  const rnd = mulberry32(opts.seed)
  const { centre } = cfg.body
  const offAngle = rnd() * Math.PI * 2
  const offMag = cfg.rules.baseRadius * opts.startOffsetFrac * (0.4 + 0.6 * rnd())
  const start: Point = { x: anchor.x + Math.cos(offAngle) * offMag, y: anchor.y + Math.sin(offAngle) * offMag }
  const localAngle = Math.atan2(start.y - centre.y, start.x - centre.x)
  const errRad = ((opts.angleErrorDeg * (rnd() * 2 - 1)) * Math.PI) / 180
  const drawAngle = localAngle + errRad
  const dirX = Math.cos(drawAngle)
  const dirY = Math.sin(drawAngle)
  const end: Point = { x: start.x + dirX * len, y: start.y + dirY * len }
  const perpX = -dirY
  const perpY = dirX
  const steps = 10
  const points: Point[] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const base = { x: start.x + (end.x - start.x) * t, y: start.y + (end.y - start.y) * t }
    const bow = Math.sin(t * Math.PI) * len * 0.03 // a slight curve, ~3% of length at the midpoint
    const jitter = (rnd() - 0.5) * len * 0.02 // a small per-point tremor, ~2% of length
    const wobble = bow + jitter
    points.push({ x: base.x + perpX * wobble, y: base.y + perpY * wobble })
  }
  return points
}

// T19 item 2 of the task ("measure why 'it never accepts it' still happens…
// and fix the real blocker"): the acceptance test the task itself asks for —
// realistic, noisy, off-centre child strokes against the REAL shipped
// catalog, not a synthetic fixture. If these regress, a six-year-old is
// locked out of the family again.
// T19 (third tablet playtest, bug (b): "with one spine left, a mere tap
// completes the level"). Root cause: every hedgehog level authored
// `minAccuracy` BELOW 100 (70/80/90) — `hedgehog1` at 70% (4 anchors) was
// already `≥ 70` at 3/4 = 75%, so with the LAST spine still undrawn, ANY
// release (a bare pointerup that barely moved, scored exactly like any
// other stroke) reported `approved` from the anchors already filled. The
// fix is authored data (`catalog.ts`'s `minAccuracy: 100` on every hedgehog
// level), proven airtight here against the pure scoring function directly —
// not merely "the shipped counts happen to work today".
describe('minAccuracy:100 makes "one spine left" unreachable — the T19 fade/completion bug (b)', () => {
  it('count − 1 filled anchors alone never reaches 100%, for every realistic anchor count', () => {
    for (let count = 2; count <= 20; count++) {
      expect(Math.round((100 * (count - 1)) / count), `count=${count}`).toBeLessThan(100)
    }
  })

  it('on the REAL shipped hedgehog2, filling every anchor but the last (with genuine strokes) still fails to approve — the last spine must actually be drawn', () => {
    const level = getLevel('hedgehog2')
    const cfg = level.spines!
    const anchors = spineAnchors(cfg)
    const len = (cfg.rules.lenMin + cfg.rules.lenMax) / 2
    const strokes = anchors.slice(0, -1).map((a) => idealStroke(a, len))
    const scoreBeforeLast = spineScore(strokes, cfg)
    expect(scoreBeforeLast).toBeLessThan(level.rules.minAccuracy)

    // The scenario the user hit: a trivial, barely-moved release near the
    // last remaining anchor (not a real, complete spine) must NOT push the
    // level over its own minAccuracy.
    const lastAnchor = anchors[anchors.length - 1]
    const barelyMoved: Point[] = [
      { x: lastAnchor.x, y: lastAnchor.y },
      { x: lastAnchor.x + 0.5, y: lastAnchor.y },
    ]
    const scoreAfterTap = spineScore([...strokes, barelyMoved], cfg)
    expect(scoreAfterTap).toBeLessThan(level.rules.minAccuracy)

    // Only a REAL last spine reaches minAccuracy.
    const realLast = idealStroke(lastAnchor, len)
    const scoreAfterRealSpine = spineScore([...strokes, realLast], cfg)
    expect(scoreAfterRealSpine).toBeGreaterThanOrEqual(level.rules.minAccuracy)
  })
})

describe('acceptance — realistic noisy child strokes pass on the REAL shipped hedgehog family (T19)', () => {
  const HEDGEHOG_IDS = ['hedgehog1', 'hedgehog2', 'hedgehog3', 'hedgehog4'] as const

  it('a jittery, slightly curved, finger-width-off-centre stroke fills its anchor on every level', () => {
    for (const id of HEDGEHOG_IDS) {
      const cfg = getLevel(id).spines!
      const anchors = spineAnchors(cfg)
      const len = (cfg.rules.lenMin + cfg.rules.lenMax) / 2
      // A handful of different anchors/seeds per level, not just anchor 0 —
      // a real child does not only ever start the family's very first spine.
      for (const [i, seed] of [
        [0, 1],
        [1, 2],
        [Math.floor(anchors.length / 2), 3],
      ] as const) {
        const stroke = noisyChildStroke(cfg, anchors[i], len, {
          seed,
          startOffsetFrac: 0.8, // up to 80% of the tolerance circle off-centre
          angleErrorDeg: 10, // a real but modest hand-aim error
        })
        const settled = spineSettle(EMPTY_SPINES, [stroke], cfg)
        expect(settled.filled.has(i), `${id} anchor ${i} seed ${seed}`).toBe(true)
      }
    }
  })

  it('a whole noisy attempt (one stroke per anchor) clears every level at its own minAccuracy (100)', () => {
    for (const id of HEDGEHOG_IDS) {
      const level = getLevel(id)
      const cfg = level.spines!
      const anchors = spineAnchors(cfg)
      const len = (cfg.rules.lenMin + cfg.rules.lenMax) / 2
      const strokes = anchors.map((a, i) =>
        noisyChildStroke(cfg, a, len, { seed: 100 + i, startOffsetFrac: 0.75, angleErrorDeg: 9 }),
      )
      expect(spineScore(strokes, cfg), id).toBeGreaterThanOrEqual(level.rules.minAccuracy)
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────
// T19 (`odd/tasks/prewriting-stage-completion.md`, third tablet playtest,
// bug (a): "sometimes… the stroke stays drawn until I start a new stroke;
// it doesn't go away by itself"). Root cause, MEASURED against the real fold
// (not re-guessed): `screen/LevelPlay.tsx`'s `onRelease` used to decide
// whether to fade the JUST-RELEASED stroke from `spineSettle`'s own
// aggregate `grew` flag — "did ANY anchor fill THIS call", across every
// stroke in the snapshot, not "did THIS release's own new stroke fill one".
// `spineSettle` folds anchors GREEDILY in stroke order against a `filled`
// set that only grows ACROSS releases; a rejected stroke drawn near one
// anchor stays in the (never-pruned) stroke list forever and is RE-WALKED
// on every later release. Once that anchor fills (via a different, later
// stroke), the OLD rejected stroke's own `nearestUnfilledAnchor` query can
// resolve to a DIFFERENT still-open anchor it happens to also be near — and
// if it passes measures against THAT one, it retroactively fills it on a
// LATER release than the one it was drawn in. `grew` then reads `true` on a
// release whose OWN new stroke never filled anything, so the old `!grew`
// check silently skipped scheduling its fade.
//
// The fix (`screen/LevelPlay.tsx`'s `onRelease`) asks the SAME canonical,
// order-independent walk `shownStrokes`/`spineScore` already trust —
// `acceptedSpineStrokeIndices`, folded fresh from empty — whether THIS
// release's own stroke index earned an anchor, which can never disagree
// with what ends up shown as permanent ink. This block proves the
// divergence exists in the fold itself (the thing the fix routes around),
// pure and reproducible with no React/DOM involved.
describe('grew vs acceptedSpineStrokeIndices can diverge — the T19 fade-skip root cause', () => {
  it('a later release can retroactively fill an anchor via an EARLIER, already-rejected stroke, without the just-released stroke itself filling anything', () => {
    const cfg = makeConfig({ count: 3, rules: { ...makeConfig().rules, baseRadius: 500 } })
    const anchors = spineAnchors(cfg)
    const len = midLen(cfg)
    // `sOld`: base exactly on anchor 0 (measure 1 matches anchor 0 uniquely
    // while it is unfilled), but aimed along anchor 1's own outward normal —
    // wrong direction for anchor 0, so it is rejected on ITS OWN release.
    const sOld: Point[] = [
      { x: anchors[0].x, y: anchors[0].y },
      { x: anchors[0].x + anchors[1].nx * len, y: anchors[0].y + anchors[1].ny * len },
    ]
    // `sMid`: a clean, correctly-aimed spine for anchor 0.
    const sMid = idealStroke(anchors[0], len)
    // `sNew`: a genuinely unrelated, rejected stroke — nowhere near any
    // anchor. This is the stroke actually released on the THIRD call.
    const sNew: Point[] = [{ x: -9999, y: -9999 }, { x: -9989, y: -9999 }]

    let state = EMPTY_SPINES
    state = spineSettle(state, [sOld], cfg)
    expect(state.filled.size, 'release 1: sOld alone, rejected').toBe(0)

    const beforeThird = spineSettle(state, [sOld, sMid], cfg)
    expect([...beforeThird.filled], 'release 2: sMid fills anchor 0').toEqual([0])

    const afterThird = spineSettle(beforeThird, [sOld, sMid, sNew], cfg)
    const grew = afterThird !== beforeThird

    // The fold DID change on release 3 — but NOT because `sNew` (the
    // just-released stroke) filled anything: `sOld`, re-walked now that
    // anchor 0 is taken, retroactively matched a DIFFERENT open anchor.
    expect(grew, 'the aggregate flag reads true on release 3').toBe(true)
    expect(afterThird.filled.size, 'the fold now has MORE than one filled anchor').toBeGreaterThan(1)

    // The canonical, order-independent walk disagrees on COUNT — and, most
    // importantly, on whether `sNew` (index 2, the just-released stroke)
    // itself is the accepted one. It never is.
    const accepted = acceptedSpineStrokeIndices([sOld, sMid, sNew], cfg)
    expect(accepted.has(2), 'sNew, the just-released stroke, is not among the accepted').toBe(false)
    expect(accepted.size).toBeLessThan(afterThird.filled.size)

    // This is the exact mismatch the T19 fix routes around: `!grew` was
    // `false` here (so the OLD code would skip fading `sNew`), while the
    // canonical check correctly says `sNew` was never accepted and must fade.
  })
})

describe('spineSpikePaths — the settled spine\'s own clean shape (T19, "the stroke becomes a spine")', () => {
  it('emits one path per FILLED anchor, none for unfilled ones', () => {
    const cfg = makeConfig({ count: 6 })
    const state = { filled: new Set([1, 4]), aiming: null }
    expect(spineSpikePaths(cfg, state)).toHaveLength(2)
    expect(spineSpikePaths(cfg, EMPTY_SPINES)).toHaveLength(0)
  })

  it('walks anchors in generator order regardless of the fill order — index 1 before index 4 in the output', () => {
    const cfg = makeConfig({ count: 6 })
    // Filled 4 "before" 1 in wall-clock terms (a child can draw out of
    // order) — the OUTPUT still lists anchor 1's spike ahead of anchor 4's.
    const state = { filled: new Set([4, 1]), aiming: null }
    const anchors = spineAnchors(cfg)
    const len = midLen(cfg)
    const paths = spineSpikePaths(cfg, state)
    expect(paths).toHaveLength(2)
    // Only the tip coordinate is unique enough per anchor to identify which
    // spike is which, so compare that rather than the whole `d` string.
    expect(paths[0]).toContain(`${anchors[1].x + anchors[1].nx * len}`)
    expect(paths[1]).toContain(`${anchors[4].x + anchors[4].nx * len}`)
  })

  it('the spike is a wide-base, thin-tip triangle: the base edge is far shorter than the two flank edges', () => {
    const cfg = makeConfig({ count: 4 })
    const anchors = spineAnchors(cfg)
    const state = { filled: new Set([0]), aiming: null }
    const [d] = spineSpikePaths(cfg, state)
    // Parse the four M/L points out of the `d` string (left, tip, right, left).
    const nums = d.match(/-?[0-9.]+/g)!.map(Number)
    const [lx, ly, tx, ty, rx, ry] = nums
    const baseEdge = Math.hypot(rx - lx, ry - ly)
    const flankLen = Math.hypot(tx - lx, ty - ly)
    expect(baseEdge).toBeGreaterThan(0)
    expect(baseEdge).toBeLessThan(flankLen) // a LONG triangle: base narrower than its own flanks
    // The tip sits on the anchor's own outward ray, at the length band's
    // own midpoint — the exact convention `spineSegments`/the demo use.
    const a = anchors[0]
    const len = midLen(cfg)
    expect(tx).toBeCloseTo(a.x + a.nx * len, 6)
    expect(ty).toBeCloseTo(a.y + a.ny * len, 6)
  })

  it('emits only M/L commands, never Z, C, or a mask/pattern/clipPath reference', () => {
    const cfg = makeConfig({ count: 3 })
    const [d] = spineSpikePaths(cfg, { filled: new Set([0]), aiming: null })
    expect(d.startsWith('M ')).toBe(true)
    expect(d).not.toContain('Z')
    expect(d).not.toContain('C ')
    expect(d).not.toContain('url(#')
  })

  it('is deterministic — the same cfg/state always yields byte-identical paths', () => {
    const cfg = makeConfig({ count: 5 })
    const state = { filled: new Set([0, 2, 3]), aiming: null }
    expect(spineSpikePaths(cfg, state)).toEqual(spineSpikePaths(cfg, state))
  })
})

describe('every export runs with no DOM — no jsdom, no testing-library, no component render', () => {
  it('spineTick-equivalents (spineAim, spineSettle), spineScore, debugSpines, seedSpines all execute in plain node', () => {
    const cfg = makeConfig()
    expect(() => spineAnchors(cfg)).not.toThrow()
    expect(() => spineOrigin(cfg)).not.toThrow()
    expect(() => spineBody(cfg)).not.toThrow()
    expect(() => spineAim(EMPTY_SPINES, [], false, cfg)).not.toThrow()
    expect(() => spineSettle(EMPTY_SPINES, [], cfg)).not.toThrow()
    expect(() => spineScore([], cfg)).not.toThrow()
    expect(() => spineMarks(cfg, EMPTY_SPINES)).not.toThrow()
    expect(() => spineRings(cfg)).not.toThrow()
    expect(() => spineDemoPaths(cfg, 2)).not.toThrow()
    expect(() => debugSpineStrokes(cfg, 2)).not.toThrow()
    expect(() => debugSpines(cfg, 2)).not.toThrow()
    expect(() => seedSpines(cfg, null)).not.toThrow()
  })
})
