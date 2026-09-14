// The waypoint fold's coincidence proof, stage 1: against a FIXTURE config
// (`free-trail-waypoints` spec: "The Rendered Flower and Hive Coincide With
// the Coordinate waypointScore Measures, in Both States"; design.md §7.1).
// Stage 2, against the REAL catalog, is `WaypointLayer.test.tsx`'s own later
// extension once `bee1..4` exist (task 6.4).
//
// Paso E cost a family: 1,553 green tests while the snake's drawn art sat at
// one coordinate and its scored route sat at another, because nothing
// rendered the real `<image>` and compared it to the path. This is the
// analogous insurance here: parse every emitted `<image>` OUT OF THE HTML
// STRING — never the internal box objects — and feed the recovered
// coordinates back into the real scorer.
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { WaypointLayer } from './WaypointLayer'
import type { ArtBox } from './placeArt'
import {
  EMPTY_WAYPOINTS,
  debugWaypoints,
  waypointArt,
  waypointScore,
  type WaypointConfig,
} from '../levels/waypoints'
import type { ArtImage } from '../detective/assets'

const DORMANT: ArtImage = { href: '/art/sector-flower-dormant.png', w: 256, h: 245 }
const LIT: ArtImage = { href: '/art/sector-flower.png', w: 256, h: 245 }
const HIVE: ArtImage = { href: '/art/sector-honeycomb.png', w: 181, h: 256 }

const CFG: WaypointConfig = {
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

const SHEET_BOUNDS: ArtBox = { x: 0, y: 0, width: 1000, height: 600 }

/** Parse every `<image x y width height href>` out of the HTML STRING —
 *  never the internal box objects (the exact gap paso E's own
 *  `catalog.test.ts` coincidence proof left). */
function parseImages(html: string): Array<{ x: number; y: number; width: number; height: number; href: string }> {
  const tags = html.match(/<image[^>]*>/g) ?? []
  return tags.map((tag) => {
    const num = (attr: string): number => {
      const m = tag.match(new RegExp(`${attr}="(-?[0-9.]+)"`))
      if (!m) throw new Error(`${attr} not found in ${tag}`)
      return Number(m[1])
    }
    const hrefMatch = tag.match(/href="([^"]+)"/)
    if (!hrefMatch) throw new Error(`href not found in ${tag}`)
    return { x: num('x'), y: num('y'), width: num('width'), height: num('height'), href: hrefMatch[1] }
  })
}

function centreOf(img: { x: number; y: number; width: number; height: number }): { x: number; y: number } {
  return { x: img.x + img.width / 2, y: img.y + img.height / 2 }
}

describe('WaypointLayer — the coincidence proof (stage 1, fixture config)', () => {
  it('a dormant flower and the hive render their <image> centre at the authored coordinate', () => {
    const html = renderToString(
      <WaypointLayer waypoints={{ art: waypointArt(CFG, EMPTY_WAYPOINTS) }} sheetBounds={SHEET_BOUNDS} />,
    )
    const images = parseImages(html)
    expect(images).toHaveLength(4)
    for (let i = 0; i < CFG.stops.length; i++) {
      const centre = centreOf(images[i])
      expect(centre.x).toBeCloseTo(CFG.stops[i].x, 1)
      expect(centre.y).toBeCloseTo(CFG.stops[i].y, 1)
      expect(images[i].href).toBe(DORMANT.href)
    }
    const hiveCentre = centreOf(images[3])
    expect(hiveCentre.x).toBeCloseTo(CFG.goal.x, 1)
    expect(hiveCentre.y).toBeCloseTo(CFG.goal.y, 1)
    expect(images[3].href).toBe(HIVE.href)
  })

  it('a lit flower renders its <image> centre at the SAME authored coordinate — the swap must not move the art', () => {
    const litState = { lit: new Set([0, 1, 2]), home: true, seen: 0 }
    const html = renderToString(
      <WaypointLayer waypoints={{ art: waypointArt(CFG, litState) }} sheetBounds={SHEET_BOUNDS} />,
    )
    const images = parseImages(html)
    for (let i = 0; i < CFG.stops.length; i++) {
      const centre = centreOf(images[i])
      expect(centre.x).toBeCloseTo(CFG.stops[i].x, 1)
      expect(centre.y).toBeCloseTo(CFG.stops[i].y, 1)
      expect(images[i].href).toBe(LIT.href)
    }
  })

  it('both states emit identical boxes and different hrefs across the swap', () => {
    const dormantHtml = renderToString(
      <WaypointLayer waypoints={{ art: waypointArt(CFG, EMPTY_WAYPOINTS) }} sheetBounds={SHEET_BOUNDS} />,
    )
    const litState = { lit: new Set([0, 1, 2]), home: true, seen: 0 }
    const litHtml = renderToString(
      <WaypointLayer waypoints={{ art: waypointArt(CFG, litState) }} sheetBounds={SHEET_BOUNDS} />,
    )
    const dormantImages = parseImages(dormantHtml)
    const litImages = parseImages(litHtml)
    for (let i = 0; i < CFG.stops.length; i++) {
      expect(litImages[i].x).toBeCloseTo(dormantImages[i].x, 1)
      expect(litImages[i].y).toBeCloseTo(dormantImages[i].y, 1)
      expect(litImages[i].width).toBeCloseTo(dormantImages[i].width, 1)
      expect(litImages[i].height).toBeCloseTo(dormantImages[i].height, 1)
      expect(litImages[i].href).not.toBe(dormantImages[i].href)
    }
    // The hive's own art never swaps.
    expect(litImages[3].href).toBe(dormantImages[3].href)
  })

  it('HEADLINE: a stroke built from the PARSED coordinates scores 100 through the real scorer', () => {
    const html = renderToString(
      <WaypointLayer waypoints={{ art: waypointArt(CFG, EMPTY_WAYPOINTS) }} sheetBounds={SHEET_BOUNDS} />,
    )
    const images = parseImages(html)
    const parsedTrail = [CFG.start, ...images.map(centreOf)]
    expect(waypointScore([parsedTrail], CFG)).toBe(100)
  })

  it('FALSIFIABILITY: the same trail translated by radius + 1 in +x scores below 100', () => {
    const html = renderToString(
      <WaypointLayer waypoints={{ art: waypointArt(CFG, EMPTY_WAYPOINTS) }} sheetBounds={SHEET_BOUNDS} />,
    )
    const images = parseImages(html)
    const parsedTrail = [CFG.start, ...images.map(centreOf)]
    // Shift the WHOLE trail far enough in +x that no segment between two
    // shifted points can pass within any waypoint's radius of its ORIGINAL
    // coordinate. A shift only as large as one radius is not enough — the
    // undulating fixture's own segments can sweep back near a neighbouring
    // target — so this clears the widest margin: every original x is
    // <= 750 and the widest radius is 88 (750 + 88 = 838), so +600 puts
    // every shifted x at >= 850.
    const shifted = parsedTrail.map((p) => ({ x: p.x + 600, y: p.y }))
    expect(waypointScore([shifted], CFG)).toBeLessThan(100)
  })

  it('the ?debug=estela seed reads through the same coincidence: k lit flowers parse at their authored coordinates', () => {
    const seeded = debugWaypoints(CFG, 2)
    const html = renderToString(
      <WaypointLayer waypoints={{ art: waypointArt(CFG, seeded) }} sheetBounds={SHEET_BOUNDS} />,
    )
    const images = parseImages(html)
    expect(images[0].href).toBe(LIT.href)
    expect(images[1].href).toBe(LIT.href)
    expect(images[2].href).toBe(DORMANT.href)
  })

  it('introduces no url(#) reference', () => {
    const html = renderToString(
      <WaypointLayer waypoints={{ art: waypointArt(CFG, EMPTY_WAYPOINTS) }} sheetBounds={SHEET_BOUNDS} />,
    )
    expect(html).not.toContain('url(#')
    expect(html).not.toContain('<mask')
    expect(html).not.toContain('<pattern')
    expect(html).not.toContain('<clipPath')
    expect(html).not.toContain('<defs')
  })

  it('renders one debug ring per waypoint, in the SAME order as the art, when rings are supplied', () => {
    const html = renderToString(
      <WaypointLayer
        waypoints={{
          art: waypointArt(CFG, EMPTY_WAYPOINTS),
          rings: [...CFG.stops, CFG.goal],
          ringStroke: '#f2efe6',
        }}
        sheetBounds={SHEET_BOUNDS}
      />,
    )
    expect((html.match(/<circle/g) ?? []).length).toBe(4)
    for (const stop of CFG.stops) {
      expect(html).toContain(`cx="${stop.x}"`)
      expect(html).toContain(`cy="${stop.y}"`)
    }
  })

  it('renders no rings at all when rings is absent — every frame a child ever sees', () => {
    const html = renderToString(
      <WaypointLayer waypoints={{ art: waypointArt(CFG, EMPTY_WAYPOINTS) }} sheetBounds={SHEET_BOUNDS} />,
    )
    expect(html).not.toContain('<circle')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// STAGE 2 (task 6.4): the same coincidence proof, re-pointed at the REAL
// catalog — `bee1..4`'s authored `waypoints`, not a fixture. Paso E's own
// lesson: the fixture proof alone would have missed a level authored with
// the WRONG literal (a copy-paste error in `catalog.ts`), because the
// fixture's own numbers can never disagree with themselves.
// ─────────────────────────────────────────────────────────────────────────────
describe('WaypointLayer × the real catalog — the coincidence proof, stage 2 (bee1..4)', () => {
  const BEE_IDS = ['bee1', 'bee2', 'bee3', 'bee4'] as const

  it.each(BEE_IDS)('%s: every rendered <image> centre equals the authored coordinate, in both states', async (id) => {
    const { getLevel } = await import('../levels/catalog')
    const cfg = getLevel(id).waypoints!

    const dormantHtml = renderToString(
      <WaypointLayer waypoints={{ art: waypointArt(cfg, EMPTY_WAYPOINTS) }} sheetBounds={SHEET_BOUNDS} />,
    )
    const dormantImages = parseImages(dormantHtml)
    expect(dormantImages).toHaveLength(cfg.stops.length + 1)
    for (let i = 0; i < cfg.stops.length; i++) {
      const centre = centreOf(dormantImages[i])
      expect(centre.x, `${id} stop ${i}`).toBeCloseTo(cfg.stops[i].x, 1)
      expect(centre.y, `${id} stop ${i}`).toBeCloseTo(cfg.stops[i].y, 1)
    }
    const hiveCentre = centreOf(dormantImages[cfg.stops.length])
    expect(hiveCentre.x, `${id} hive`).toBeCloseTo(cfg.goal.x, 1)
    expect(hiveCentre.y, `${id} hive`).toBeCloseTo(cfg.goal.y, 1)

    // The lit state: identical boxes, different hrefs (stops only — the
    // hive's own art never swaps).
    const litState = { lit: new Set(cfg.stops.map((_, i) => i)), home: true, seen: 0 }
    const litHtml = renderToString(
      <WaypointLayer waypoints={{ art: waypointArt(cfg, litState) }} sheetBounds={SHEET_BOUNDS} />,
    )
    const litImages = parseImages(litHtml)
    for (let i = 0; i < cfg.stops.length; i++) {
      expect(litImages[i].x, `${id} stop ${i}`).toBeCloseTo(dormantImages[i].x, 1)
      expect(litImages[i].y, `${id} stop ${i}`).toBeCloseTo(dormantImages[i].y, 1)
      expect(litImages[i].width, `${id} stop ${i}`).toBeCloseTo(dormantImages[i].width, 1)
      expect(litImages[i].height, `${id} stop ${i}`).toBeCloseTo(dormantImages[i].height, 1)
      expect(litImages[i].href, `${id} stop ${i}`).not.toBe(dormantImages[i].href)
    }
    expect(litImages[cfg.stops.length].href).toBe(dormantImages[cfg.stops.length].href)
  })

  it.each(BEE_IDS)(
    '%s: HEADLINE — a stroke built from the PARSED coordinates scores 100, and a far-shifted copy scores below 100',
    async (id) => {
      const { getLevel } = await import('../levels/catalog')
      const cfg = getLevel(id).waypoints!
      const html = renderToString(
        <WaypointLayer waypoints={{ art: waypointArt(cfg, EMPTY_WAYPOINTS) }} sheetBounds={SHEET_BOUNDS} />,
      )
      const images = parseImages(html)
      const parsedTrail = [cfg.start, ...images.map(centreOf)]
      expect(waypointScore([parsedTrail], cfg), id).toBe(100)

      // FALSIFIABILITY: a fixed, large +x shift clears every real level's
      // own coordinates and radii regardless of its individual geometry —
      // stage 1's own gotcha (a shift only as large as one radius is not
      // always enough on an undulating shape).
      const shifted = parsedTrail.map((p) => ({ x: p.x + 5000, y: p.y }))
      expect(waypointScore([shifted], cfg), id).toBeLessThan(100)
    },
  )
})
