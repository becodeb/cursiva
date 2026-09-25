// RevealLayer SSR tests (reveal-grid spec: "Reveal Layer Renders as Plain
// Rects With No Fragment Reference"). Node environment, no DOM.
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { RevealLayer } from './RevealLayer'
import type { TraceReveal } from './TraceCanvas'

const sheetBounds = { x: 0, y: 0, width: 1000, height: 600 }

describe('RevealLayer', () => {
  it('renders exactly N − cleared.size <rect> elements for an erase grid', () => {
    const totalTiles = 10 * 6
    const clearedCount = 12
    const tiles = Array.from({ length: totalTiles - clearedCount }, (_, i) => ({
      x: (i % 10) * 100,
      y: Math.floor(i / 10) * 100,
      w: 100,
      h: 100,
      opacity: 1,
    }))
    const reveal: TraceReveal = { fill: '#7a6a58', tiles }
    const html = renderToString(<RevealLayer reveal={reveal} sheetBounds={sheetBounds} />)
    expect((html.match(/<rect/g) ?? []).length).toBe(totalTiles - clearedCount)
  })

  it('emits exactly five opacity strings and no sixth for a light grid', () => {
    const reveal: TraceReveal = {
      fill: '#12161f',
      tiles: [
        { x: 0, y: 0, w: 50, h: 50, opacity: 0.25 },
        { x: 50, y: 0, w: 50, h: 50, opacity: 0.5 },
        { x: 100, y: 0, w: 50, h: 50, opacity: 0.75 },
        { x: 150, y: 0, w: 50, h: 50, opacity: 1 },
      ],
    }
    const html = renderToString(<RevealLayer reveal={reveal} sheetBounds={sheetBounds} />)
    expect(html).toContain('opacity="0.25"')
    expect(html).toContain('opacity="0.5"')
    expect(html).toContain('opacity="0.75"')
    // opacity 1 is the default covering state — never emitted as an attribute.
    expect(html).not.toContain('opacity="1"')
    expect((html.match(/opacity="/g) ?? []).length).toBe(3)
  })

  it('renders hidden-object images UNDER the tiles', () => {
    const reveal: TraceReveal = {
      fill: '#12161f',
      tiles: [{ x: 0, y: 0, w: 100, h: 100, opacity: 1 }],
      art: [{ href: '/art/sector-chest.png', w: 200, h: 180, size: 96, x: 500, y: 300 }],
    }
    const html = renderToString(<RevealLayer reveal={reveal} sheetBounds={sheetBounds} />)
    const imageIdx = html.indexOf('href="/art/sector-chest.png"')
    const rectIdx = html.indexOf('<rect')
    expect(imageIdx).toBeGreaterThanOrEqual(0)
    expect(rectIdx).toBeGreaterThan(imageIdx)
  })

  it('keeps night hints, torch, discovered art, and completion celebration visible without fragment references', () => {
    const reveal: TraceReveal = {
      fill: '#12161f',
      tiles: [{ x: 0, y: 0, w: 100, h: 100, opacity: 1 }],
      light: { x: 500, y: 300, radius: 170, complete: false },
      art: [
        { href: '/art/sector-stone.png', w: 220, h: 200, size: 72, x: 260, y: 180, revealed: true },
        { href: '/art/sector-leaf.png', w: 180, h: 160, size: 64, x: 740, y: 420, revealed: false },
      ],
    }
    const html = renderToString(<RevealLayer reveal={reveal} sheetBounds={sheetBounds} />)
    // Defect fix (T2 item 2, "a circle/halo already marks where each hidden
    // object is"): `data-night-visible-hint` used to render a permanent
    // marker over EVERY unfound object, on top of the dark veil — removed
    // outright, so an unfound object (`sector-leaf`, `revealed: false`) now
    // carries no rendered position hint at all.
    expect(html).not.toContain('data-night-visible-hint')
    expect(html).toContain('data-night-hint="true"')
    expect(html).toContain('data-night-torch="true"')
    expect(html).toContain('data-night-discovery="true"')
    expect(html).not.toContain('url(#')
    expect(html).not.toContain('<mask')

    const complete = renderToString(
      <RevealLayer
        reveal={{
          ...reveal,
          tiles: [
            { x: 0, y: 0, w: 100, h: 100, opacity: 0 },
            { x: 100, y: 0, w: 100, h: 100, opacity: 0 },
          ],
          light: { x: 0, y: 0, radius: 170, complete: true },
          art: reveal.art?.map((obj) => ({ ...obj, revealed: true })),
        }}
        sheetBounds={sheetBounds}
      />,
    )
    expect(complete).toContain('data-night-celebration="true"')
    expect(complete).toContain('data-night-success-glow="true"')
    expect(complete).toContain('opacity="0"')
    expect((complete.match(/<rect/g) ?? []).length).toBe(2)
    expect((complete.match(/data-fog-tile-id=/g) ?? []).length).toBe(2)
  })

  it('introduces zero forbidden fragment references', () => {
    const reveal: TraceReveal = {
      fill: '#7a6a58',
      tiles: [{ x: 0, y: 0, w: 100, h: 100, opacity: 0.25 }],
      art: [{ href: '/art/sector-stone.png', w: 220, h: 200, size: 72, x: 260, y: 180 }],
    }
    const html = renderToString(<RevealLayer reveal={reveal} sheetBounds={sheetBounds} />)
    expect(html).not.toContain('url(#')
    expect(html).not.toContain('<mask')
    expect(html).not.toContain('<pattern')
    expect(html).not.toContain('<clipPath')
    expect(html).not.toContain('<defs')
  })


  it('renders fogged glass as one continuous direct silhouette with no filters or fragments', () => {
    const reveal: TraceReveal = {
      fill: '#64726b',
      tiles: [
        { x: 0, y: 0, w: 100, h: 100, opacity: 1 },
        { x: 100, y: 0, w: 100, h: 100, opacity: 1 },
      ],
    }
    const html = renderToString(<RevealLayer reveal={reveal} sheetBounds={sheetBounds} />)
    expect((html.match(/data-fog-tile-id=/g) ?? []).length).toBe(2)
    expect(html).toContain('data-fog-pane="glass"')
    expect((html.match(/data-fog-silhouette="glass"/g) ?? []).length).toBe(1)
    expect(html).not.toContain('filter:')
    expect(html).not.toContain('<clipPath')
    expect(html).not.toContain('<filter')
    expect(html).not.toContain('<defs')
    expect(html).not.toContain('url(#')
    expect((html.match(/data-fog-streak="true"/g) ?? []).length).toBeGreaterThan(0)
  })

  it('renders explicit sand as one organic drift while keeping one invisible rect sentinel per remaining tile', () => {
    const reveal: TraceReveal = {
      fill: '#7a6a58',
      visual: 'sand',
      tiles: [
        { x: 0, y: 0, w: 100, h: 100, opacity: 1 },
        { x: 100, y: 0, w: 100, h: 100, opacity: 1 },
        { x: 0, y: 100, w: 100, h: 100, opacity: 1 },
      ],
    }
    const html = renderToString(<RevealLayer reveal={reveal} sheetBounds={sheetBounds} />)

    expect(html).toContain('data-sand-drift="true"')
    expect((html.match(/data-sand-silhouette="true"/g) ?? []).length).toBe(1)
    const sandPath = html.match(/data-sand-silhouette="true" d="([^"]+)"/)?.[1] ?? ''
    expect((sandPath.match(/Q /g) ?? []).length).toBeGreaterThan(12)
    expect(html).not.toContain('data-sand-edge-lobe')
    expect((html.match(/data-fog-tile-id=/g) ?? []).length).toBe(reveal.tiles.length)
    expect((html.match(/<rect/g) ?? []).length).toBe(reveal.tiles.length)
    expect((html.match(/opacity="0"/g) ?? []).length).toBe(reveal.tiles.length)
    expect((html.match(/data-sand-grain="true"/g) ?? []).length).toBeGreaterThan(0)
    expect(html).not.toContain('<mask')
    expect(html).not.toContain('<pattern')
    expect(html).not.toContain('<clipPath')
    expect(html).not.toContain('<defs')
    expect(html).not.toContain('url(#')
  })

  it('does not infer sand polish from the veil colour alone', () => {
    const reveal: TraceReveal = {
      fill: '#7a6a58',
      tiles: [{ x: 0, y: 0, w: 100, h: 100, opacity: 1 }],
    }
    const html = renderToString(<RevealLayer reveal={reveal} sheetBounds={sheetBounds} />)
    expect(html).not.toContain('data-sand-drift="true"')
  })

  // The leaves policy (`monos`/`glass3`/`glass4`), asserted in the same shape
  // as the sand block above. A real leaves level starts fully covered, so the
  // fixture is the whole sheet as a 5x3 grid: the cues scatter pane-wide, and a
  // corner-only fixture would only prove where that scatter happens to fall.
  const leafTiles = Array.from({ length: 15 }, (_, i) => ({
    x: (i % 5) * 200,
    y: Math.floor(i / 5) * 200,
    w: 200,
    h: 200,
    opacity: 1,
  }))

  it('renders explicit leaves as one lobed pile while keeping one invisible rect sentinel per remaining tile', () => {
    const reveal: TraceReveal = { fill: '#6e7a4a', visual: 'leaves', tiles: leafTiles }
    const html = renderToString(<RevealLayer reveal={reveal} sheetBounds={sheetBounds} />)

    expect(html).toContain('data-leaf-litter="true"')
    expect((html.match(/data-leaf-silhouette="true"/g) ?? []).length).toBe(1)

    const leafPath = html.match(/data-leaf-silhouette="true" d="([^"]+)"/)?.[1] ?? ''
    // Cubic lobes, not sand's quadratic erosion: the policies stay distinct.
    expect((leafPath.match(/C /g) ?? []).length).toBeGreaterThanOrEqual(16)
    expect(leafPath).not.toContain('Q ')
    // 16 cell edges, each spent on >= 1 lobe, so no straight run survives.
    expect(leafPath.startsWith('M ')).toBe(true)
    expect(leafPath.endsWith('Z')).toBe(true)
    expect(leafPath).not.toContain('L ')

    // Sparse leaf cues, gated to the still-covered area.
    expect((html.match(/data-leaf-blade="true"/g) ?? []).length).toBeGreaterThan(0)
    expect((html.match(/data-leaf-rake="true"/g) ?? []).length).toBeGreaterThan(0)

    // Sentinels: same count, same identity, all invisible.
    expect((html.match(/<rect/g) ?? []).length).toBe(leafTiles.length)
    expect((html.match(/data-fog-tile-id=/g) ?? []).length).toBe(leafTiles.length)
    expect((html.match(/opacity="0"/g) ?? []).length).toBe(leafTiles.length)

    expect(html).not.toContain('url(#')
    expect(html).not.toContain('<mask')
    expect(html).not.toContain('<pattern')
    expect(html).not.toContain('<clipPath')
    expect(html).not.toContain('<defs')
    expect(html).not.toContain('<filter')
    expect(html).not.toContain('filter:')
  })

  it('keeps the leaves and sand policies disjoint, and neither is inferred from the veil colour', () => {
    const leafFill = '#6e7a4a'
    const bare = renderToString(
      <RevealLayer reveal={{ fill: leafFill, tiles: leafTiles }} sheetBounds={sheetBounds} />,
    )
    expect(bare).not.toContain('data-leaf-litter="true"')
    expect((bare.match(/<rect/g) ?? []).length).toBe(leafTiles.length)

    const asLeaves = renderToString(
      <RevealLayer reveal={{ fill: leafFill, visual: 'leaves', tiles: leafTiles }} sheetBounds={sheetBounds} />,
    )
    expect(asLeaves).not.toContain('data-sand-drift="true"')
    expect(asLeaves).not.toContain('data-fog-pane="glass"')

    const asSand = renderToString(
      <RevealLayer reveal={{ fill: '#7a6a58', visual: 'sand', tiles: leafTiles }} sheetBounds={sheetBounds} />,
    )
    expect(asSand).not.toContain('data-leaf-litter="true"')
    expect(asSand).toContain('data-sand-drift="true"')

    // Glass keys off its own grime fill and must be untouched by the new branch.
    const asGlass = renderToString(
      <RevealLayer reveal={{ fill: '#64726b', tiles: leafTiles }} sheetBounds={sheetBounds} />,
    )
    expect(asGlass).not.toContain('data-leaf-litter="true"')
    expect((asGlass.match(/data-fog-silhouette="glass"/g) ?? []).length).toBe(1)
  })

  it('drops leaf cues that no longer sit over a covered tile, without moving the survivors', () => {
    const full = renderToString(
      <RevealLayer reveal={{ fill: '#6e7a4a', visual: 'leaves', tiles: leafTiles }} sheetBounds={sheetBounds} />,
    )
    const partialTiles = leafTiles.slice(0, 5) // the top row survives
    const partial = renderToString(
      <RevealLayer reveal={{ fill: '#6e7a4a', visual: 'leaves', tiles: partialTiles }} sheetBounds={sheetBounds} />,
    )
    const blades = (html: string) => html.match(/data-leaf-blade="true" d="[^"]+"/g) ?? []
    expect(blades(partial).length).toBeGreaterThan(0)
    expect(blades(partial).length).toBeLessThan(blades(full).length)
    // Same path strings: the scatter is pane-relative, so erasing a cell never
    // re-rolls what is still covered.
    for (const blade of blades(partial)) expect(blades(full)).toContain(blade)
    expect((partial.match(/<rect/g) ?? []).length).toBe(partialTiles.length)
  })

  // Real `glass3`/`glass4` reveal geometry (`catalog.ts`): 15 cols x 9 rows
  // over the same 1000x600 sheet, so a cell edge here is the 66.7 units the
  // island clamp is reasoned about, not the 200 the coarse fixture above uses.
  const CELL_W = 1000 / 15
  const CELL_H = 600 / 9
  const playGrid = (skip: (col: number, row: number) => boolean) => {
    const tiles: { x: number; y: number; w: number; h: number; opacity: number }[] = []
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 15; col++) {
        if (skip(col, row)) continue
        tiles.push({ x: col * CELL_W, y: row * CELL_H, w: CELL_W, h: CELL_H, opacity: 1 })
      }
    }
    return tiles
  }

  /** Every blade's silhouette, recovered from the rendered path. A blade is
   *  `M cx-half cy Q cx cy-belly, …`, so the first control point's rise off the
   *  start point IS the belly and the start point's offset IS the half-length. */
  const blades = (html: string) => {
    const out: { half: number; belly: number; fill: string }[] = []
    const pattern = /<path data-leaf-blade="true" d="M (\S+) (\S+) Q (\S+) (\S+),[^"]*" fill="(#[0-9a-f]{6})"/g
    for (const match of html.matchAll(pattern)) {
      const [, x0, y0, cx, cy, fill] = match
      out.push({ half: Number(cx) - Number(x0), belly: Number(y0) - Number(cy), fill })
    }
    return out
  }

  it('decorrelates blade belly from blade tone, and gives the amber blade the fattest silhouette', () => {
    // Visual-QA defect: `idx % 3` drove BOTH the tone and the belly, so
    // `LEAF_DRY` — the amber blade, the one that actually shows against
    // `LEAF_BASE` — was permanently pinned to the thinnest belly of the three
    // and read as a twig. Belly must now vary WITHIN each tone (the coupling
    // is gone, not merely reassigned) and the amber must be the fattest.
    const html = renderToString(
      <RevealLayer reveal={{ fill: '#6e7a4a', visual: 'leaves', tiles: playGrid(() => false) }} sheetBounds={sheetBounds} />,
    )
    const all = blades(html)
    // A denser pile: 44 blades over a 1000x600 sheet measured as scattered
    // specks at 844x390, not as overlapping litter.
    expect(all.length).toBeGreaterThan(100)

    const byTone = new Map<string, { half: number; belly: number }[]>()
    for (const blade of all) {
      const list = byTone.get(blade.fill) ?? []
      list.push(blade)
      byTone.set(blade.fill, list)
    }
    expect(byTone.size).toBe(3)
    // The coupling itself, asserted on the RATIO rather than on raw belly.
    // Raw belly is too weak a witness: reverting to a length-scaled coupling
    // like `half * (0.34 + tone * 0.11)` still hands each tone as many distinct
    // belly numbers as there are `half` values (seven), so that assertion would
    // sail through the very defect it is here to catch. What a coupling to tone
    // actually pins is belly AGAINST LENGTH — the silhouette a child sees — to
    // a single value per tone. `plump` sweeps 0.22 of that ratio and its
    // irrational stride samples the sweep densely, so a decorrelated build
    // spans roughly 0.22 within every tone while either coupled form spans
    // exactly 0.
    for (const [, list] of byTone) {
      const ratios = list.map((blade) => blade.belly / blade.half)
      expect(new Set(ratios.map((ratio) => Math.round(ratio * 1000))).size).toBeGreaterThan(1)
      expect(Math.max(...ratios) - Math.min(...ratios)).toBeGreaterThan(0.15)
    }

    const dry = byTone.get('#b07a3c') ?? []
    const greens = all.filter((blade) => blade.fill !== '#b07a3c')
    expect(dry.length).toBeGreaterThan(0)
    expect(greens.length).toBeGreaterThan(0)
    // Fatness is belly against length — the silhouette, not the raw number.
    const fatness = (list: { half: number; belly: number }[]) =>
      list.reduce((sum, blade) => sum + blade.belly / blade.half, 0) / list.length
    expect(fatness(dry)).toBeGreaterThan(fatness(greens))
    // And the amber is no longer the thinnest blade on the pane either.
    expect(Math.min(...dry.map((blade) => blade.belly))).toBeGreaterThan(
      Math.min(...greens.map((blade) => blade.belly)),
    )
  })

  /** A subpath's RENDERED outline, not its control net. `M x y` then six
   *  numbers per cubic; a control point can sit far off the curve it steers, so
   *  anything that claims to measure what the child sees has to evaluate the
   *  Bezier. */
  const samplePath = (subpath: string, steps: number) => {
    const nums = (subpath.match(/-?\d+(?:\.\d+)?(?:e-?\d+)?/g) ?? []).map(Number)
    const points: { x: number; y: number }[] = []
    let from = { x: nums[0], y: nums[1] }
    for (let i = 2; i + 5 < nums.length; i += 6) {
      const [c1x, c1y, c2x, c2y, tox, toy] = nums.slice(i, i + 6)
      for (let step = 0; step < steps; step++) {
        const t = step / steps
        const u = 1 - t
        points.push({
          x: u * u * u * from.x + 3 * u * u * t * c1x + 3 * u * t * t * c2x + t * t * t * tox,
          y: u * u * u * from.y + 3 * u * u * t * c1y + 3 * u * t * t * c2y + t * t * t * toy,
        })
      }
      from = { x: tox, y: toy }
    }
    return points
  }

  const shoelaceArea = (loop: readonly { x: number; y: number }[]) => {
    let twice = 0
    for (let idx = 0; idx < loop.length; idx++) {
      const a = loop[idx]
      const b = loop[(idx + 1) % loop.length]
      twice += a.x * b.y - b.x * a.y
    }
    return Math.abs(twice) / 2
  }

  /**
   * What a child is left looking at after sweeping a patch: the RENDERED hole,
   * as an area, plus how far the pile stands into it.
   *
   * `excess` is the fraction by which the rendered hole exceeds the cells that
   * were actually cleared. It is the honest number because the lobe policy's
   * whole claim is directional — the pile may RETREAT (hand back more cleared
   * paper than the grid strictly cleared) and may barely ADVANCE — so a correct
   * build always reports a comfortably positive excess, and a build that bows
   * outward on every lobe reports one close to zero.
   */
  const sweptHole = (
    skip: (col: number, row: number) => boolean,
    hole: { x0: number; x1: number; y0: number; y1: number },
  ) => {
    const html = renderToString(
      <RevealLayer reveal={{ fill: '#6e7a4a', visual: 'leaves', tiles: playGrid(skip) }} sheetBounds={sheetBounds} />,
    )
    const path = html.match(/data-leaf-silhouette="true" d="([^"]+)"/)?.[1] ?? ''
    const subpaths = path.split(/\s(?=M )/)
    expect(subpaths.length).toBe(2)
    // The island is the SHORT subpath; the outer contour walks the whole sheet.
    const island = subpaths.map((sub) => samplePath(sub, 24)).sort((a, b) => a.length - b.length)[0]
    expect(island.length).toBeGreaterThan(48)
    let deepestAdvance = 0
    for (const p of island) {
      const inside = Math.min(p.x - hole.x0, hole.x1 - p.x, p.y - hole.y0, hole.y1 - p.y)
      deepestAdvance = Math.max(deepestAdvance, inside)
    }
    const swept = (hole.x1 - hole.x0) * (hole.y1 - hole.y0)
    return { excess: shoelaceArea(island) / swept - 1, deepestAdvance }
  }

  it('keeps a freshly swept hole legible — the pile hands cleared paper back and never takes it', () => {
    // THE regression guard for this file: "simplifying" the signed lobe depth
    // back to an always-outward bow inflates the pile in every direction, so on
    // an interior hole it advances INTO what the child just swept and visually
    // undoes the sweep.
    //
    // Two earlier shapes of this test went vacuous, and both failures are worth
    // naming because they are easy to write again. It classified raw CONTROL
    // POINTS, which are not what renders — a cubic's control point can sit far
    // off its own curve. And it did so on the coarse 200-unit fixture, where
    // `retreatVertices` pulls every non-border vertex out by `0.12 * 200` = 24
    // units: that carried the control points clear of the hole under the correct
    // code AND under the mutation, so the classifier stopped discriminating and
    // the test passed either way. Both are fixed here — the real 66.7-unit play
    // cell (vertex pull 8), and the SAMPLED CURVE.
    //
    // Measured against `depth = Math.min(LEAF_ADVANCE_DEPTH, Math.abs(raw))`,
    // precisely the rejected always-outward bow: excess falls from 0.216 to
    // 0.035 on one cell and from 0.226 to 0.043 on the patch, so the 0.12 floor
    // sits with roughly 2x headroom on either side of it.
    const oneCell = sweptHole((col, row) => col === 7 && row === 4, {
      x0: 7 * CELL_W,
      x1: 8 * CELL_W,
      y0: 4 * CELL_H,
      y1: 5 * CELL_H,
    })
    const patch = sweptHole((col, row) => col >= 6 && col <= 8 && row >= 3 && row <= 4, {
      x0: 6 * CELL_W,
      x1: 9 * CELL_W,
      y0: 3 * CELL_H,
      y1: 5 * CELL_H,
    })
    // The single cell is the case the child feels most: 66.7 units wide, so an
    // outward bow of the old 24 cap per side would leave barely a third of it.
    expect(oneCell.excess).toBeGreaterThan(0.12)
    // And the multi-cell patch, where long edges spend several lobes each and a
    // per-lobe sign error therefore compounds instead of averaging out.
    expect(patch.excess).toBeGreaterThan(0.12)

    // Separately — and this one does NOT falsify the always-outward bow, since
    // that mutation keeps the same cap: the advance cap itself, re-checked on
    // the rendered curve rather than on the control net the sibling test reads.
    // Raising `LEAF_ADVANCE_DEPTH` or dropping the clamp breaks exactly here.
    expect(oneCell.deepestAdvance).toBeLessThanOrEqual(24)
    expect(patch.deepestAdvance).toBeLessThanOrEqual(24)
  })

  /** Every rendered blade and rake outline, sampled in VIEWBOX space — the
   *  blade's own `rotate` transform applied, because a blade is authored
   *  axis-aligned and then turned, so its unrotated `d` says nothing about
   *  where its ink lands. */
  const leafDecorationPoints = (html: string) => {
    const points: { x: number; y: number }[] = []
    const quad = (
      p0: { x: number; y: number },
      c: { x: number; y: number },
      p2: { x: number; y: number },
      push: (p: { x: number; y: number }) => void,
    ) => {
      for (let step = 0; step <= 32; step++) {
        const t = step / 32
        const u = 1 - t
        push({
          x: u * u * p0.x + 2 * u * t * c.x + t * t * p2.x,
          y: u * u * p0.y + 2 * u * t * c.y + t * t * p2.y,
        })
      }
    }
    for (const match of html.matchAll(/<path data-leaf-blade="true" d="([^"]+)"[^>]*transform="rotate\(([^)]+)\)"/g)) {
      const d = (match[1].match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number)
      const [deg, rx, ry] = (match[2].match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number)
      const rad = (deg * Math.PI) / 180
      const cos = Math.cos(rad)
      const sin = Math.sin(rad)
      const turn = (p: { x: number; y: number }) =>
        points.push({
          x: rx + (p.x - rx) * cos - (p.y - ry) * sin,
          y: ry + (p.x - rx) * sin + (p.y - ry) * cos,
        })
      const tipA = { x: d[0], y: d[1] }
      const tipB = { x: d[4], y: d[5] }
      quad(tipA, { x: d[2], y: d[3] }, tipB, turn)
      quad(tipB, { x: d[6], y: d[7] }, tipA, turn)
    }
    for (const match of html.matchAll(/<path data-leaf-rake="true" d="([^"]+)"/g)) {
      const d = (match[1].match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number)
      quad({ x: d[0], y: d[1] }, { x: d[2], y: d[3] }, { x: d[4], y: d[5] }, (p) => points.push(p))
    }
    return points
  }

  it('paints no blade or rake ink onto paper the child already cleared', () => {
    // The silhouette clamp above bounds the PILE; it says nothing about the
    // decoration drawn on top of it. Gating a blade on `pointInAnyTile` of its
    // anchor tests the CENTRE only, and a blade reaches up to 26.4 units past
    // that (a rake, 50.9) — so leaf ink landed on cleared paper even while the
    // frontier itself stayed off it. Re-run against the anchor-only gate this
    // fixture reports a worst overhang of 16.8 units — independent review
    // measured up to 20.4 on its own block, and visual QA saw the same thing
    // from the other side at roughly 11 device px at 844x390. Tightening the
    // gate to the whole outline costs three blades and no rakes here, which is
    // the intended price: a mark that straddles the frontier is dropped whole
    // rather than clipped, so the pile edge stays ragged instead of sheared.
    const hole = { x0: 6 * CELL_W, x1: 9 * CELL_W, y0: 3 * CELL_H, y1: 5 * CELL_H }
    const html = renderToString(
      <RevealLayer
        reveal={{
          fill: '#6e7a4a',
          visual: 'leaves',
          tiles: playGrid((col, row) => col >= 6 && col <= 8 && row >= 3 && row <= 4),
        }}
        sheetBounds={sheetBounds}
      />,
    )
    const points = leafDecorationPoints(html)
    // The fixture has to actually carry decoration, or "none of it intrudes" is
    // a statement about the empty set.
    expect((html.match(/data-leaf-blade="true"/g) ?? []).length).toBeGreaterThan(80)
    expect((html.match(/data-leaf-rake="true"/g) ?? []).length).toBeGreaterThan(0)
    expect(points.length).toBeGreaterThan(5000)

    let worstOverhang = 0
    for (const p of points) {
      const inside = Math.min(p.x - hole.x0, hole.x1 - p.x, p.y - hole.y0, hole.y1 - p.y)
      worstOverhang = Math.max(worstOverhang, inside)
    }
    expect(worstOverhang).toBeLessThanOrEqual(0)
  })

  it('lets a multi-cell interior island undulate in the safe direction while the pile still may not advance past the tight bound', () => {
    // Visual-QA defect: the ±24 clamp is small against a 66.7 cell, so a
    // multi-cell island edge returned to the straight cell line every lobe and
    // captured as a near-straight run with a 90-degree stair step. Retreating
    // (enlarging the island) only ever reveals more of what the child cleared,
    // so that direction is now given materially more room; ADVANCING into the
    // cleared area is the direction that eats holes and keeps its old bound.
    const hole = { x0: 5 * CELL_W, x1: 9 * CELL_W, y0: 3 * CELL_H, y1: 6 * CELL_H }
    const tiles = playGrid((col, row) => col >= 5 && col <= 8 && row >= 3 && row <= 5)
    const html = renderToString(
      <RevealLayer reveal={{ fill: '#6e7a4a', visual: 'leaves', tiles }} sheetBounds={sheetBounds} />,
    )
    const path = html.match(/data-leaf-silhouette="true" d="([^"]+)"/)?.[1] ?? ''
    const controlsOf = (subpath: string) => {
      const points: { x: number; y: number }[] = []
      for (const segment of subpath.match(/C [^CMZ]+/g) ?? []) {
        const nums = (segment.match(/-?\d+(?:\.\d+)?(?:e-?\d+)?/g) ?? []).map(Number)
        points.push({ x: nums[0], y: nums[1] }, { x: nums[2], y: nums[3] })
      }
      return points
    }
    // Measure the ISLAND's own subpath only: the outer contour keeps the old
    // symmetric clamp and would otherwise dilute both numbers.
    const subpaths = path.split(/\s(?=M )/)
    expect(subpaths.length).toBe(2)
    const islandControls = subpaths
      .map(controlsOf)
      .sort((a, b) => a.length - b.length)[0]
    expect(islandControls.length).toBeGreaterThan(0)

    // Perpendicular offsets only: sample each control point against the hole
    // side it faces, staying a full advance-bound clear of the corners so a
    // tangential offset can never be misread as a deep bow.
    const margin = 24
    let deepestRetreat = 0
    let deepestAdvance = 0
    for (const p of islandControls) {
      const inside = Math.min(p.x - hole.x0, hole.x1 - p.x, p.y - hole.y0, hole.y1 - p.y)
      deepestAdvance = Math.max(deepestAdvance, inside)
      if (p.x > hole.x0 + margin && p.x < hole.x1 - margin) {
        if (p.y < hole.y0) deepestRetreat = Math.max(deepestRetreat, hole.y0 - p.y)
        if (p.y > hole.y1) deepestRetreat = Math.max(deepestRetreat, p.y - hole.y1)
      }
      if (p.y > hole.y0 + margin && p.y < hole.y1 - margin) {
        if (p.x < hole.x0) deepestRetreat = Math.max(deepestRetreat, hole.x0 - p.x)
        if (p.x > hole.x1) deepestRetreat = Math.max(deepestRetreat, p.x - hole.x1)
      }
    }
    // Safe direction: genuinely past the old symmetric bound.
    expect(deepestRetreat).toBeGreaterThan(30)
    // Dangerous direction: unchanged. This is the half that keeps the pile off
    // what the child erased.
    expect(deepestAdvance).toBeLessThanOrEqual(24)
  })

  it('keeps the pile on the paper edge — the retreat licence stops at the sheet border', () => {
    // The other half of the asymmetric clamp. Retreating is free where it
    // uncovers paper the child already cleared, but the sheet's own border
    // bounds paper nobody has touched: a level starts fully covered, so a deep
    // inward bow there would open a bare margin around a pile that is supposed
    // to cover the whole enclosure floor. Widening the safe direction
    // everywhere instead of per edge fails exactly here.
    const html = renderToString(
      <RevealLayer reveal={{ fill: '#6e7a4a', visual: 'leaves', tiles: playGrid(() => false) }} sheetBounds={sheetBounds} />,
    )
    const path = html.match(/data-leaf-silhouette="true" d="([^"]+)"/)?.[1] ?? ''
    const nums = (path.match(/-?\d+(?:\.\d+)?(?:e-?\d+)?/g) ?? []).map(Number)
    expect(nums.length).toBeGreaterThan(0)
    let deepestInward = 0
    let deepestOutward = 0
    for (let i = 0; i + 1 < nums.length; i += 2) {
      const x = nums[i]
      const y = nums[i + 1]
      deepestInward = Math.max(deepestInward, Math.min(x, 1000 - x, y, 600 - y))
      deepestOutward = Math.max(deepestOutward, -x, x - 1000, -y, y - 600)
    }
    expect(deepestInward).toBeLessThanOrEqual(24)
    expect(deepestOutward).toBeLessThanOrEqual(24)
  })

  it('clears the leaf pile entirely once the last tile is erased', () => {
    const html = renderToString(
      <RevealLayer reveal={{ fill: '#6e7a4a', visual: 'leaves', tiles: [] }} sheetBounds={sheetBounds} />,
    )
    expect(html).not.toContain('data-leaf-litter="true"')
    expect(html).not.toContain('data-leaf-blade="true"')
    expect(html).not.toContain('<rect')
  })

  it('keeps fog tile identity and whole-pane condensation stable when an earlier tile clears', () => {
    const survivor = { x: 100, y: 0, w: 100, h: 100, opacity: 1 }
    const before: TraceReveal = {
      fill: '#64726b',
      tiles: [{ x: 0, y: 0, w: 100, h: 100, opacity: 1 }, survivor],
    }
    const after: TraceReveal = { fill: '#64726b', tiles: [survivor] }
    const beforeHtml = renderToString(<RevealLayer reveal={before} sheetBounds={sheetBounds} />)
    const afterHtml = renderToString(<RevealLayer reveal={after} sheetBounds={sheetBounds} />)
    expect(beforeHtml).toContain('data-fog-tile-id="fog-10000-0-10000-10000"')
    expect(afterHtml).toContain('data-fog-tile-id="fog-10000-0-10000-10000"')
    expect((beforeHtml.match(/data-fog-silhouette="glass"/g) ?? []).length).toBe(1)
    expect((afterHtml.match(/data-fog-silhouette="glass"/g) ?? []).length).toBe(1)
    expect(beforeHtml).not.toContain('<clipPath')
    expect(afterHtml).not.toContain('url(#')
  })

  it('renders nothing at all for an empty tile list', () => {
    const reveal: TraceReveal = { fill: '#64726b', tiles: [] }
    const html = renderToString(<RevealLayer reveal={reveal} sheetBounds={sheetBounds} />)
    expect(html).not.toContain('<rect')
    expect(html).not.toContain('<image')
  })

  it('every tile carries shape-rendering="crispEdges" — Phase 7.6 defect: seams between adjacent tiles read as visible hairlines', () => {
    // Found by reading `capturas/d/glass1.png`, `sand2-revelado.png` and
    // `night2-linterna.png`: a 1000-wide sheet over 15 columns puts tile
    // edges at fractional device pixels, so two antialiased edges compositing
    // at a fractional pixel read as a lighter hairline across what should be
    // one continuous surface. `crispEdges` disables that antialiasing.
    const reveal: TraceReveal = {
      fill: '#7a6a58',
      tiles: [
        { x: 0, y: 0, w: 66.67, h: 66.67, opacity: 1 },
        { x: 66.67, y: 0, w: 66.67, h: 66.67, opacity: 0.5 },
      ],
    }
    const html = renderToString(<RevealLayer reveal={reveal} sheetBounds={sheetBounds} />)
    const rectCount = (html.match(/<rect/g) ?? []).length
    const crispCount = (html.match(/shape-rendering="crispEdges"/g) ?? []).length
    expect(rectCount).toBe(2)
    expect(crispCount).toBe(rectCount)
  })
})
