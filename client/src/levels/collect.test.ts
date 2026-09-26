// Collect-along-the-path contract (`docs/19` §2.2/§3.4; T17). Pure, no DOM —
// hand-built polylines pin arc-length placement and the monotone fold, the
// same convention `detective/clues.test.ts` uses for its sibling module. The
// invariant suite at the bottom walks the REAL sheep/llama catalog rows.
import { describe, expect, it } from 'vitest'
import {
  collectedCount,
  collectItemsFromPeaks,
  collectTick,
  emptyCollectState,
  isCollectComplete,
  resolveCollectItems,
  type CollectItem,
} from './collect'
import { LEVELS } from './catalog'
import { buildLevelTarget } from './buildLevel'
import { routeApexes } from './vertexArt'

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
    const items = collectItemsFromPeaks(polyline, length)
    expect(items).toHaveLength(3) // 2 peaks + 1 end
    expect(items[0].x).toBe(100)
    expect(items[1].x).toBe(300)
    // The final item sits exactly at the route's own end point and arc.
    expect(items[2]).toEqual({ x: 400, y: 480, arc: length })
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
    const items = collectItemsFromPeaks(polyline, length)
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
    const items = collectItemsFromPeaks(polyline, length)
    // Peak + final item.
    expect(items).toHaveLength(2)
    expect(items[0].arc).toBeCloseTo(Math.hypot(30, 40), 6)
    expect(items[1].arc).toBeCloseTo(length, 6)
  })

  it('returns empty for a degenerate route (too short or a single point)', () => {
    expect(collectItemsFromPeaks([{ x: 0, y: 0 }], 0)).toEqual([])
    expect(collectItemsFromPeaks(LINE, 0)).toEqual([])
    expect(collectItemsFromPeaks(LINE, LENGTH)).toEqual([{ x: 100, y: 0, arc: 100 }]) // no peaks, only the end
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
    )
    expect(viaConfig).toEqual(collectItemsFromPeaks(polyline, length))
  })

  it('an explicit ascending fraction array places items by arc-length fraction', () => {
    const items = resolveCollectItems(
      { items: [0.1, 0.5, 1], art: { href: 'x', w: 1, h: 1 }, size: 1 },
      LINE,
      LENGTH,
    )
    expect(items).toEqual([
      { x: 10, y: 0, arc: 10 },
      { x: 50, y: 0, arc: 50 },
      { x: 100, y: 0, arc: 100 },
    ])
  })

  it('an explicit array on a degenerate route returns empty', () => {
    expect(resolveCollectItems({ items: [0.5], art: { href: 'x', w: 1, h: 1 }, size: 1 }, [{ x: 0, y: 0 }], 0)).toEqual(
      [],
    )
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
      const items = collectItemsFromPeaks(target.polyline, target.length)
      expect(items, id).toHaveLength(HEIGHTS_PEAK_COUNT[id] + 1)
      // Matches the SAME apexes vertexArt already stands the animal on.
      const apexes = routeApexes(target.polyline)
      expect(apexes, id).toHaveLength(HEIGHTS_PEAK_COUNT[id])
      // The last collect item is the route's own final point.
      const last = target.polyline[target.polyline.length - 1]
      expect(items[items.length - 1].x, id).toBeCloseTo(last.x, 6)
      expect(items[items.length - 1].y, id).toBeCloseTo(last.y, 6)
      expect(items[items.length - 1].arc, id).toBeCloseTo(target.length, 6)
    }
  })

  it('completing the whole route (maxArc reaching the length) collects every item', () => {
    for (const id of IDS) {
      const level = LEVELS.find((l) => l.id === id)!
      const target = buildLevelTarget(level)
      const items = collectItemsFromPeaks(target.polyline, target.length)
      const state = collectTick(emptyCollectState(items.length), target.length, items)
      expect(isCollectComplete(state), id).toBe(true)
      expect(collectedCount(state), id).toBe(items.length)
    }
  })
})
