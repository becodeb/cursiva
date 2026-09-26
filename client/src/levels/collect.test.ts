// Collect-along-the-path contract (`docs/19` §2.2/§3.4; T17). Pure, no DOM —
// hand-built polylines pin arc-length placement and the monotone fold, the
// same convention `detective/clues.test.ts` uses for its sibling module. The
// invariant suite at the bottom walks the REAL sheep/llama catalog rows.
import { describe, expect, it } from 'vitest'
import {
  collectedCount,
  collectItemsFromLoops,
  collectItemsFromPeaks,
  collectTick,
  emptyCollectState,
  isCollectComplete,
  resolveCollectItems,
  waveCrestArcs,
  type CollectItem,
} from './collect'
import { LEVELS, getLevel } from './catalog'
import { buildLevelTarget } from './buildLevel'
import { routeApexes } from './vertexArt'
import { trailEndArc } from '../detective/clues'

/** A 100-unit horizontal line: arc length equals x. */
const LINE = [
  { x: 0, y: 0 },
  { x: 100, y: 0 },
]
const LENGTH = 100

const ITEMS: readonly CollectItem[] = [
  { x: 10, y: 0, arc: 10 },
  { x: 40, y: 0, arc: 40 },
  { x: 90, y: 0, arc: 90 },
]

describe('emptyCollectState', () => {
  it('starts every item un-collected', () => {
    expect(emptyCollectState(3)).toEqual({ collected: [false, false, false] })
  })

  it('never goes negative for a bad count', () => {
    expect(emptyCollectState(-2)).toEqual({ collected: [] })
  })

  it('handles zero', () => {
    expect(emptyCollectState(0)).toEqual({ collected: [] })
  })
})

describe('collectTick — the monotone fold', () => {
  it('collects nothing before the first item’s arc', () => {
    const state = emptyCollectState(3)
    const next = collectTick(state, 5, ITEMS)
    expect(next).toBe(state) // same reference: no-op
    expect(next.collected).toEqual([false, false, false])
  })

  it('collects items in order as maxArc advances', () => {
    let state = emptyCollectState(3)
    state = collectTick(state, 10, ITEMS)
    expect(state.collected).toEqual([true, false, false])
    state = collectTick(state, 45, ITEMS)
    expect(state.collected).toEqual([true, true, false])
    state = collectTick(state, 90, ITEMS)
    expect(state.collected).toEqual([true, true, true])
  })

  it('a single sample that jumps past every arc collects all of them at once, in order', () => {
    const state = collectTick(emptyCollectState(3), 1000, ITEMS)
    expect(state.collected).toEqual([true, true, true])
  })

  it('is monotone: a LOWER maxArc afterwards (a contact reset dropping maxArc back to 0) never un-collects anything already earned', () => {
    let state = collectTick(emptyCollectState(3), 45, ITEMS)
    expect(state.collected).toEqual([true, true, false])
    // The exact scenario `resetOnContact` produces: maxArc falls back to 0
    // while the run restarts, but the level's own CollectState is never
    // handed a fresh EMPTY_COLLECT — restartRun does not call this at all,
    // so the next real tick still starts from the PREVIOUS `state`.
    state = collectTick(state, 0, ITEMS)
    expect(state.collected).toEqual([true, true, false])
  })

  it('returns the exact same state reference when nothing flips (an idle re-pass over an already-earned item)', () => {
    const state = collectTick(emptyCollectState(3), 50, ITEMS)
    const again = collectTick(state, 50, ITEMS)
    expect(again).toBe(state)
  })

  it('a re-pass past an EARLIER arc after the item is earned stays inert', () => {
    let state = collectTick(emptyCollectState(3), 90, ITEMS) // collects all
    const before = state
    state = collectTick(state, 15, ITEMS) // maxArc dropped, still only 15
    expect(state).toBe(before)
    expect(state.collected).toEqual([true, true, true])
  })

  it('ignores an index with no matching item (state longer than items)', () => {
    const state = collectTick(emptyCollectState(4), 1000, ITEMS)
    expect(state.collected).toEqual([true, true, true, false])
  })
})

describe('collectedCount / isCollectComplete', () => {
  it('counts how many are collected', () => {
    expect(collectedCount({ collected: [true, false, true] })).toBe(2)
    expect(collectedCount({ collected: [] })).toBe(0)
  })

  it('is complete only once the LAST item is collected', () => {
    expect(isCollectComplete({ collected: [true, true, false] })).toBe(false)
    expect(isCollectComplete({ collected: [true, true, true] })).toBe(true)
    expect(isCollectComplete({ collected: [false, false, true] })).toBe(true)
  })

  it('is never complete with no items at all', () => {
    expect(isCollectComplete({ collected: [] })).toBe(false)
  })
})

const CORRIDOR_WIDTH = 100 // sheep-hill1's own authored width

describe('collectItemsFromPeaks', () => {
  it('places one item per apex plus one final item at the very end of the route', () => {
    // Two peaks, like sheep-hill1's own two-hump ridge shape.
    const polyline = [
      { x: 0, y: 480 },
      { x: 100, y: 160 }, // peak 1
      { x: 200, y: 480 },
      { x: 300, y: 160 }, // peak 2
      { x: 400, y: 480 },
    ]
    const length = 4 * Math.hypot(100, 320)
    const items = collectItemsFromPeaks(polyline, length, CORRIDOR_WIDTH)
    expect(items).toHaveLength(3) // 2 peaks + 1 end
    expect(items[0].x).toBe(100)
    expect(items[1].x).toBe(300)
    // The final item sits at the route's own end POINT, but its arc carries
    // the same "reached the end" tolerance `detective/clues.ts`'s
    // `trailEndArc` already established — see `collectItemsFromPeaks`'s own
    // doc for why a literal `length` threshold is the wrong test.
    expect(items[2].x).toBe(400)
    expect(items[2].y).toBe(480)
    expect(items[2].arc).toBe(trailEndArc(length, CORRIDOR_WIDTH))
    expect(items[2].arc).toBeLessThan(length)
  })

  it('arcs are strictly ascending, in polyline order', () => {
    const polyline = [
      { x: 0, y: 480 },
      { x: 100, y: 160 },
      { x: 200, y: 480 },
      { x: 300, y: 120 },
      { x: 400, y: 480 },
    ]
    const length = polyline.reduce(
      (acc, p, i) => (i === 0 ? 0 : acc + Math.hypot(p.x - polyline[i - 1].x, p.y - polyline[i - 1].y)),
      0,
    )
    const items = collectItemsFromPeaks(polyline, length, CORRIDOR_WIDTH)
    for (let i = 1; i < items.length; i++) {
      expect(items[i].arc).toBeGreaterThan(items[i - 1].arc)
    }
  })

  it('a peak’s own arc matches walking the polyline by hand', () => {
    const polyline = [
      { x: 0, y: 0 },
      { x: 30, y: -40 }, // apex (local min y)
      { x: 60, y: 0 },
    ]
    const length = Math.hypot(30, 40) * 2
    const items = collectItemsFromPeaks(polyline, length, CORRIDOR_WIDTH)
    // Peak + final item.
    expect(items).toHaveLength(2)
    expect(items[0].arc).toBeCloseTo(Math.hypot(30, 40), 6)
    expect(items[1].arc).toBeCloseTo(trailEndArc(length, CORRIDOR_WIDTH), 6)
  })

  it("a maxArc that falls a hair short of the literal geometric length — exactly the floating-point round-trip this task measured in a live browser session — still completes the level, because the last item's own arc already carries the tolerance", () => {
    const polyline = [
      { x: 0, y: 480 },
      { x: 100, y: 160 },
      { x: 200, y: 480 },
    ]
    const length = 2 * Math.hypot(100, 320)
    const items = collectItemsFromPeaks(polyline, length, CORRIDOR_WIDTH)
    const nearlyLength = length - 1e-4 // the measured order of magnitude of the round-trip error
    const state = collectTick(emptyCollectState(items.length), nearlyLength, items)
    expect(isCollectComplete(state)).toBe(true)
  })

  it('returns empty for a degenerate route (too short or a single point)', () => {
    expect(collectItemsFromPeaks([{ x: 0, y: 0 }], 0, CORRIDOR_WIDTH)).toEqual([])
    expect(collectItemsFromPeaks(LINE, 0, CORRIDOR_WIDTH)).toEqual([])
    // No peaks, only the end — arc carries the same trailEndArc tolerance.
    expect(collectItemsFromPeaks(LINE, LENGTH, CORRIDOR_WIDTH)).toEqual([
      { x: 100, y: 0, arc: trailEndArc(LENGTH, CORRIDOR_WIDTH) },
    ])
  })

  it('never authors a negative arc on a route shorter than the corridor’s own half-width', () => {
    const items = collectItemsFromPeaks(LINE, 10, 100) // length 10, half-width 50
    expect(items[0].arc).toBe(0)
  })
})

describe('resolveCollectItems', () => {
  it("'peaks' delegates to collectItemsFromPeaks", () => {
    const polyline = [
      { x: 0, y: 480 },
      { x: 100, y: 160 },
      { x: 200, y: 480 },
    ]
    const length = 2 * Math.hypot(100, 320)
    const viaConfig = resolveCollectItems(
      { items: 'peaks', art: { href: 'x', w: 1, h: 1 }, size: 1 },
      polyline,
      length,
      CORRIDOR_WIDTH,
    )
    expect(viaConfig).toEqual(collectItemsFromPeaks(polyline, length, CORRIDOR_WIDTH))
  })

  it('an explicit ascending fraction array places items by arc-length fraction, with no automatic end tolerance', () => {
    const items = resolveCollectItems(
      { items: [0.1, 0.5, 1], art: { href: 'x', w: 1, h: 1 }, size: 1 },
      LINE,
      LENGTH,
      CORRIDOR_WIDTH,
    )
    expect(items).toEqual([
      { x: 10, y: 0, arc: 10 },
      { x: 50, y: 0, arc: 50 },
      { x: 100, y: 0, arc: 100 },
    ])
  })

  it('an explicit array on a degenerate route returns empty', () => {
    expect(
      resolveCollectItems({ items: [0.5], art: { href: 'x', w: 1, h: 1 }, size: 1 }, [{ x: 0, y: 0 }], 0, CORRIDOR_WIDTH),
    ).toEqual([])
  })
})

describe('invariant: the shipped sheep/llama levels', () => {
  const IDS = [
    'sheep-hill1',
    'sheep-hill2',
    'sheep-hill3',
    'sheep-hill4',
    'llama-peak1',
    'llama-peak2',
    'llama-peak3',
    'llama-peak4',
  ]
  const HEIGHTS_PEAK_COUNT: Record<string, number> = {
    'sheep-hill1': 2,
    'sheep-hill2': 3,
    'sheep-hill3': 3,
    'sheep-hill4': 4,
    'llama-peak1': 1,
    'llama-peak2': 2,
    'llama-peak3': 3,
    'llama-peak4': 4,
  }

  it('every sheep-hill/llama-peak level authors collect: { items: "peaks" }', () => {
    for (const id of IDS) {
      const level = LEVELS.find((l) => l.id === id)!
      expect(level.collect, id).toBeDefined()
      expect(level.collect!.items).toBe('peaks')
    }
  })

  it('derives exactly one item per authored peak plus one final item at the end, for every level', () => {
    for (const id of IDS) {
      const level = LEVELS.find((l) => l.id === id)!
      const target = buildLevelTarget(level)
      const items = collectItemsFromPeaks(target.polyline, target.length, level.corridorWidth)
      expect(items, id).toHaveLength(HEIGHTS_PEAK_COUNT[id] + 1)
      // Matches the SAME apexes vertexArt already stands the animal on.
      const apexes = routeApexes(target.polyline)
      expect(apexes, id).toHaveLength(HEIGHTS_PEAK_COUNT[id])
      // The last collect item stands at the route's own final point, and its
      // arc is `trailEndArc` (the same "reached the end" tolerance a
      // detective trail uses), not the literal length.
      const last = target.polyline[target.polyline.length - 1]
      expect(items[items.length - 1].x, id).toBeCloseTo(last.x, 6)
      expect(items[items.length - 1].y, id).toBeCloseTo(last.y, 6)
      expect(items[items.length - 1].arc, id).toBeCloseTo(trailEndArc(target.length, level.corridorWidth), 6)
    }
  })

  it('completing the whole route (maxArc reaching the length) collects every item', () => {
    for (const id of IDS) {
      const level = LEVELS.find((l) => l.id === id)!
      const target = buildLevelTarget(level)
      const items = collectItemsFromPeaks(target.polyline, target.length, level.corridorWidth)
      const state = collectTick(emptyCollectState(items.length), target.length, items)
      expect(isCollectComplete(state), id).toBe(true)
      expect(collectedCount(state), id).toBe(items.length)
    }
  })

  it("also completes with maxArc only reaching trailEndArc (the last item's own arc, not the literal length) — the exact real-world case a live browser session measured", () => {
    for (const id of IDS) {
      const level = LEVELS.find((l) => l.id === id)!
      const target = buildLevelTarget(level)
      const items = collectItemsFromPeaks(target.polyline, target.length, level.corridorWidth)
      const state = collectTick(
        emptyCollectState(items.length),
        trailEndArc(target.length, level.corridorWidth),
        items,
      )
      expect(isCollectComplete(state), id).toBe(true)
    }
  })
})

// waveCrestArcs (T21, `odd/tasks/prewriting-stage-completion.md`, `docs/19`
// §2.2/§7 slice 3: "los patitos en las ondas"). Found by ACTUALLY BUILDING
// the shipped duck-trail3/duck-trail4 routes and looking at the result, not
// guessed: `routeApexes` (the sheep/llama mechanism above) returns an EMPTY
// array for both — a smooth bezier crest's own derivative vanishes at the
// extremum, so two adjacent samples straddling it differ by a fraction of a
// unit, which `routeApexes`'s `minRise` (tuned for a ridge's sharp peaks)
// throws away regardless of how it is tuned.
describe('waveCrestArcs (a smooth wave route own crests, where routeApexes finds none)', () => {
  it('a hand-built symmetric hump: one crest, exactly at its own point (x=50)', () => {
    // y dips to a single minimum at x=50, with a near-flat stretch on both
    // sides (48-52) narrower than the default 80-unit window — the exact
    // shape that defeats an adjacent-sample check. The expected ARC is not
    // 50: the steep 0->20 and 20->40 diagonal legs make arc length noticeably
    // exceed x here, so it is computed the same way `waveCrestArcs` itself
    // does (cumulative Euclidean distance) rather than assumed.
    const polyline = [
      { x: 0, y: 100 },
      { x: 20, y: 60 },
      { x: 40, y: 50.3 },
      { x: 48, y: 50.01 },
      { x: 50, y: 50 },
      { x: 52, y: 50.01 },
      { x: 60, y: 50.3 },
      { x: 80, y: 60 },
      { x: 100, y: 100 },
    ]
    let expectedArc = 0
    for (let i = 1; i <= 4; i++) {
      expectedArc += Math.hypot(polyline[i].x - polyline[i - 1].x, polyline[i].y - polyline[i - 1].y)
    }
    const crests = waveCrestArcs(polyline)
    expect(crests).toHaveLength(1)
    expect(crests[0]).toBeCloseTo(expectedArc, 6)
  })

  it('two humps far enough apart both register, and nothing else does', () => {
    const hump = (cx: number): { x: number; y: number }[] => [
      { x: cx - 10, y: 60 },
      { x: cx - 2, y: 50.05 },
      { x: cx, y: 50 },
      { x: cx + 2, y: 50.05 },
      { x: cx + 10, y: 60 },
    ]
    const polyline = [{ x: 0, y: 100 }, ...hump(50), { x: 130, y: 100 }, ...hump(200), { x: 260, y: 100 }]
    expect(waveCrestArcs(polyline)).toHaveLength(2)
  })

  it('a flat straight line (no wave at all) has no crests', () => {
    expect(waveCrestArcs([{ x: 0, y: 0 }, { x: 50, y: 0 }, { x: 100, y: 0 }])).toEqual([])
  })

  it('too few points to have an interior candidate returns empty, never throws', () => {
    expect(waveCrestArcs([])).toEqual([])
    expect(waveCrestArcs([{ x: 0, y: 0 }])).toEqual([])
    expect(waveCrestArcs([{ x: 0, y: 0 }, { x: 1, y: 1 }])).toEqual([])
  })
})

describe('invariant: the shipped duck-trail3/duck-trail4 collect config (crests, not peaks)', () => {
  const CREST_COUNT: Record<string, number> = { 'duck-trail3': 2, 'duck-trail4': 3 }

  it("authors collect: { items: 'crests' } — routeApexes finds nothing on either shipped route", () => {
    for (const id of Object.keys(CREST_COUNT)) {
      const level = getLevel(id)
      expect(level.collect, id).toBeDefined()
      expect(level.collect!.items, id).toBe('crests')
      const target = buildLevelTarget(level)
      expect(routeApexes(target.polyline), `${id}: routeApexes should find none`).toHaveLength(0)
    }
  })

  it('derives exactly one item per wave crest plus one final item at the end', () => {
    for (const [id, count] of Object.entries(CREST_COUNT)) {
      const level = getLevel(id)
      const target = buildLevelTarget(level)
      const items = resolveCollectItems(level.collect!, target.polyline, target.length, level.corridorWidth)
      expect(items, id).toHaveLength(count + 1)
      const last = target.polyline[target.polyline.length - 1]
      expect(items[items.length - 1].x, id).toBeCloseTo(last.x, 6)
      expect(items[items.length - 1].y, id).toBeCloseTo(last.y, 6)
      expect(items[items.length - 1].arc, id).toBeCloseTo(trailEndArc(target.length, level.corridorWidth), 6)
      // Ascending by construction (collectTick's monotone-order guarantee).
      for (let i = 1; i < items.length; i++) expect(items[i].arc, id).toBeGreaterThan(items[i - 1].arc)
    }
  })

  it('completing the whole route collects every duckling, same invariant the sheep/llama family already proves', () => {
    for (const id of Object.keys(CREST_COUNT)) {
      const level = getLevel(id)
      const target = buildLevelTarget(level)
      const items = resolveCollectItems(level.collect!, target.polyline, target.length, level.corridorWidth)
      const state = collectTick(emptyCollectState(items.length), target.length, items)
      expect(isCollectComplete(state), id).toBe(true)
      expect(collectedCount(state), id).toBe(items.length)
    }
  })
})

// collectItemsFromLoops (T28, `odd/tasks/prewriting-stage-completion.md`;
// `docs/19` §3, the turtles' own recipe B row: "cada vuelta hace asomar una
// tortuga"). A ring's own closure is a POINT REVISIT, not a smooth
// extremum — see the function's own header for why `routeApexes`/
// `waveCrestArcs` are the wrong tool here. These hand-built polylines use
// squares rather than real ellipses (simpler to author exactly), each side
// well over the function's own 50-unit minimum arc gap so the algorithm's
// contract is exercised the same way it will be on the real, much larger
// `ovals()` routes; the invariant suite below proves it against the actual
// shipped turtle1..4 geometry.
describe('collectItemsFromLoops', () => {
  const CORRIDOR = 70 // turtle4's own authored width

  /** A closed square loop starting/ending at `(x0, y0)`, side length `side` —
   *  each corner is a distinct point, so only the LAST point (identical to
   *  the first) is ever revisited, exactly the property a real `ovals()`
   *  ring has. */
  function squareLoop(x0: number, y0: number, side: number): { x: number; y: number }[] {
    return [
      { x: x0, y: y0 },
      { x: x0 + side, y: y0 },
      { x: x0 + side, y: y0 + side },
      { x: x0, y: y0 + side },
      { x: x0, y: y0 },
    ]
  }

  function polylineLength(polyline: readonly { x: number; y: number }[]): number {
    let length = 0
    for (let i = 1; i < polyline.length; i++) {
      length += Math.hypot(polyline[i].x - polyline[i - 1].x, polyline[i].y - polyline[i - 1].y)
    }
    return length
  }

  it('a single loop reports ONE item — the whole point of "one loop, one turtle" — with no internal closure to find', () => {
    const loop = squareLoop(0, 0, 30) // perimeter 120
    const length = polylineLength(loop)
    const items = collectItemsFromLoops(loop, length, CORRIDOR)
    expect(items).toHaveLength(1)
    expect(items[0].x).toBe(0)
    expect(items[0].y).toBe(0)
    expect(items[0].arc).toBe(trailEndArc(length, CORRIDOR))
  })

  it('two loops connected by a straight run report exactly two items: the first loop’s own closure, then the final item', () => {
    const loop1 = squareLoop(0, 0, 30) // perimeter 120, closes at (0,0)
    const connector = [{ x: 70, y: 0 }] // a straight 40-unit run from (0,0)
    const loop2 = squareLoop(70, 0, 30) // perimeter 120, closes at (70,0)
    const polyline = [...loop1, ...connector, ...loop2]
    const length = polylineLength(polyline)
    const items = collectItemsFromLoops(polyline, length, CORRIDOR)
    expect(items).toHaveLength(2)
    // Item 0: loop1's own closure, at (0,0), arc = loop1's own perimeter.
    expect(items[0].x).toBe(0)
    expect(items[0].y).toBe(0)
    expect(items[0].arc).toBeCloseTo(120, 6)
    // Item 1: the trailing final item, at the route's own last point
    // (loop2's own closure), with `trailEndArc`'s tolerance, not the literal
    // length.
    expect(items[1].x).toBe(70)
    expect(items[1].y).toBe(0)
    expect(items[1].arc).toBeCloseTo(trailEndArc(length, CORRIDOR), 6)
    expect(items[1].arc).toBeLessThan(length)
  })

  it('three loops report three items, arcs strictly ascending', () => {
    const loop1 = squareLoop(0, 0, 30)
    const loop2 = squareLoop(70, 0, 30)
    const loop3 = squareLoop(140, 0, 30)
    const polyline = [...loop1, { x: 70, y: 0 }, ...loop2, { x: 140, y: 0 }, ...loop3]
    const length = polylineLength(polyline)
    const items = collectItemsFromLoops(polyline, length, CORRIDOR)
    expect(items).toHaveLength(3)
    for (let i = 1; i < items.length; i++) expect(items[i].arc).toBeGreaterThan(items[i - 1].arc)
  })

  it('never mistakes the connector for a closure: the connector’s own points never repeat', () => {
    const loop1 = squareLoop(0, 0, 30)
    const loop2 = squareLoop(70, 0, 30)
    const polyline = [...loop1, { x: 40, y: 0 }, { x: 55, y: 5 }, { x: 70, y: 0 }, ...loop2]
    const length = polylineLength(polyline)
    const items = collectItemsFromLoops(polyline, length, CORRIDOR)
    // Still exactly 2 loops' worth of items, not 3+ from a spurious match
    // inside the connector's own extra waypoints.
    expect(items).toHaveLength(2)
  })

  it('completing the whole route collects every turtle, same invariant every other derivation proves', () => {
    const loop1 = squareLoop(0, 0, 30)
    const loop2 = squareLoop(70, 0, 30)
    const polyline = [...loop1, { x: 70, y: 0 }, ...loop2]
    const length = polylineLength(polyline)
    const items = collectItemsFromLoops(polyline, length, CORRIDOR)
    const state = collectTick(emptyCollectState(items.length), length, items)
    expect(isCollectComplete(state)).toBe(true)
    expect(collectedCount(state)).toBe(items.length)
  })

  it('returns empty for a degenerate route (too short or a single point)', () => {
    expect(collectItemsFromLoops([{ x: 0, y: 0 }], 0, CORRIDOR)).toEqual([])
    expect(collectItemsFromLoops([{ x: 0, y: 0 }, { x: 1, y: 0 }], 0, CORRIDOR)).toEqual([])
  })

  it("'loops' resolves through resolveCollectItems the same as calling it directly", () => {
    const loop1 = squareLoop(0, 0, 30)
    const loop2 = squareLoop(70, 0, 30)
    const polyline = [...loop1, { x: 70, y: 0 }, ...loop2]
    const length = polylineLength(polyline)
    const viaConfig = resolveCollectItems(
      { items: 'loops', art: { href: 'x', w: 1, h: 1 }, size: 1 },
      polyline,
      length,
      CORRIDOR,
    )
    expect(viaConfig).toEqual(collectItemsFromLoops(polyline, length, CORRIDOR))
  })
})

describe('invariant: the shipped turtle1..4 levels (T28, ovals() loops)', () => {
  const RING_COUNT: Record<string, number> = {
    turtle1: 1,
    turtle2: 2,
    turtle3: 3,
    turtle4: 4,
  }

  it('every turtle level authors collect: { items: "loops" }', () => {
    for (const id of Object.keys(RING_COUNT)) {
      const level = LEVELS.find((l) => l.id === id)!
      expect(level.collect, id).toBeDefined()
      expect(level.collect!.items).toBe('loops')
    }
  })

  it('derives exactly one item per authored ring — one turtle per loop', () => {
    for (const [id, count] of Object.entries(RING_COUNT)) {
      const level = getLevel(id)
      const target = buildLevelTarget(level)
      const items = resolveCollectItems(level.collect!, target.polyline, target.length, level.corridorWidth)
      expect(items, id).toHaveLength(count)
      // Ascending by construction (collectTick's monotone-order guarantee).
      for (let i = 1; i < items.length; i++) expect(items[i].arc, id).toBeGreaterThan(items[i - 1].arc)
      // The last item stands at the route's own final point, `trailEndArc`
      // tolerance and all — the same convention every other derivation uses.
      const last = target.polyline[target.polyline.length - 1]
      expect(items[items.length - 1].x, id).toBeCloseTo(last.x, 6)
      expect(items[items.length - 1].y, id).toBeCloseTo(last.y, 6)
      expect(items[items.length - 1].arc, id).toBeCloseTo(trailEndArc(target.length, level.corridorWidth), 6)
    }
  })

  it('completing the whole route collects every turtle, and the level ends on the LAST loop, not before', () => {
    for (const id of Object.keys(RING_COUNT)) {
      const level = getLevel(id)
      const target = buildLevelTarget(level)
      const items = resolveCollectItems(level.collect!, target.polyline, target.length, level.corridorWidth)
      // One loop short of the end: every item but the last is collected —
      // the level does NOT finish on any loop before the last one.
      if (items.length > 1) {
        const penultimateArc = items[items.length - 2].arc
        const partial = collectTick(emptyCollectState(items.length), penultimateArc, items)
        expect(isCollectComplete(partial), id).toBe(false)
        expect(collectedCount(partial), id).toBe(items.length - 1)
      }
      const state = collectTick(emptyCollectState(items.length), target.length, items)
      expect(isCollectComplete(state), id).toBe(true)
      expect(collectedCount(state), id).toBe(items.length)
    }
  })

  it('also completes with maxArc only reaching trailEndArc, the exact real-world tolerance case', () => {
    for (const id of Object.keys(RING_COUNT)) {
      const level = getLevel(id)
      const target = buildLevelTarget(level)
      const items = resolveCollectItems(level.collect!, target.polyline, target.length, level.corridorWidth)
      const state = collectTick(
        emptyCollectState(items.length),
        trailEndArc(target.length, level.corridorWidth),
        items,
      )
      expect(isCollectComplete(state), id).toBe(true)
    }
  })

  it('the direction and start point are unchanged: every ring still starts at 1 o’clock and sweeps counter-clockwise', () => {
    // Regression guard for the pedagogy T28 must preserve — collect wiring
    // must never touch `ovals()`'s own geometry.
    for (const id of Object.keys(RING_COUNT)) {
      const level = getLevel(id)
      const target = buildLevelTarget(level)
      const p = target.polyline
      const start = p[0]
      // Isolate the FIRST ring's own points: scan forward for the first
      // later point landing back on the start — a real `ovals()` ring
      // closes exactly onto its own start point (the same point-revisit
      // property `collectItemsFromLoops` itself relies on), checked here
      // with an independent, inline scan rather than the module under test.
      let closeIndex = -1
      for (let i = 5; i < p.length; i++) {
        if (Math.abs(p[i].x - start.x) < 1e-6 && Math.abs(p[i].y - start.y) < 1e-6) {
          closeIndex = i
          break
        }
      }
      expect(closeIndex, id).toBeGreaterThan(0)
      const ring = p.slice(0, closeIndex + 1)
      let signedArea = 0
      for (let i = 0; i < ring.length - 1; i++) {
        signedArea += ring[i].x * ring[i + 1].y - ring[i + 1].x * ring[i].y
      }
      // Counter-clockwise on an SVG's y-down screen is a NEGATIVE signed
      // area (the shoelace formula, y-down flips the usual sign convention).
      expect(signedArea, id).toBeLessThan(0)
      // The very first real movement goes up (decreasing y) and left
      // (non-increasing x) from the start point — `ovals()`'s own header:
      // "the very first movement is already the up-and-left sweep".
      const next = p[Math.min(5, p.length - 1)]
      expect(next.y, id).toBeLessThan(start.y)
      expect(next.x, id).toBeLessThanOrEqual(start.x)
    }
  })
})
