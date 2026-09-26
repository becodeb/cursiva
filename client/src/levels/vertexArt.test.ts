// `routeApexes` contract (level-engine spec: "Vertex Art Field and Placement
// Selector"). Node environment, no DOM — pure geometry over a polyline.
import { describe, expect, it } from 'vitest'
import { buildLevelTarget } from './buildLevel'
import { getLevel } from './catalog'
import { isCaseTrail, inDetectiveWorld } from './world'
import { routeApexes } from './vertexArt'

describe('routeApexes', () => {
  it("finds sheep-hill3's 3 peaks, each within 3 units of its authored apex", () => {
    const target = buildLevelTarget(getLevel('sheep-hill3'))
    const apexes = routeApexes(target.polyline)
    expect(apexes).toHaveLength(3)
    // Authored heights [320, 170, 320] over base 480 -> peak y's 160/310/160.
    expect(apexes.map((a) => a.y)).toEqual([160, 310, 160])
    const [x0, x1] = [90, 910]
    const w = (x1 - x0) / 3
    const expectedXs = [0.5, 1.5, 2.5].map((k) => x0 + k * w)
    apexes.forEach((a, i) => expect(Math.abs(a.x - expectedXs[i])).toBeLessThanOrEqual(3))
  })

  it("finds llama-peak4's 4 peaks, each within 3 units of its authored apex", () => {
    const target = buildLevelTarget(getLevel('llama-peak4'))
    const apexes = routeApexes(target.polyline)
    expect(apexes).toHaveLength(4)
    for (const a of apexes) expect(a.y).toBe(120)
    const [x0, x1] = [90, 910]
    const w = (x1 - x0) / 4
    const expectedXs = [0.5, 1.5, 2.5, 3.5].map((k) => x0 + k * w)
    apexes.forEach((a, i) => expect(Math.abs(a.x - expectedXs[i])).toBeLessThanOrEqual(3))
  })

  it('returns [] for a flat polyline (no vertical variation)', () => {
    const flat = [
      { x: 0, y: 100 },
      { x: 50, y: 100 },
      { x: 100, y: 100 },
      { x: 150, y: 100 },
    ]
    expect(routeApexes(flat)).toEqual([])
  })

  it('rejects a rise below minRise while keeping a genuinely tall peak', () => {
    const polyline = [
      { x: 0, y: 100 },
      { x: 10, y: 95 }, // rise 5 -- noise, below the default 40
      { x: 20, y: 100 },
      { x: 30, y: 20 }, // rise 80 -- a real peak
      { x: 40, y: 100 },
    ]
    const apexes = routeApexes(polyline)
    expect(apexes).toEqual([{ x: 30, y: 20 }])
  })

  it("carries no case membership — isCaseTrail/inDetectiveWorld are unaffected by vertexArt's presence", () => {
    // T17 follow-up moved sheep-hill1/llama-peak1's own standing art off
    // `vertexArt` entirely (they now author `collect` instead, and the
    // collect-driven layer replaces vertexArt rather than drawing twice —
    // see `levels/catalog.ts`'s own comment on `sheep-hill1`). Dolphin still
    // authors a plain `vertexArt` and is not a case either, so it is what
    // this test's ORIGINAL intent (vertexArt grants no case/world
    // membership) actually needs.
    const withArt = getLevel('dolphin1')
    expect(withArt.vertexArt).toBeDefined()
    expect(isCaseTrail(withArt)).toBe(false)
    expect(inDetectiveWorld(withArt)).toBe(false)
  })
})
