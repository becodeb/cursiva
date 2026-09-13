// Render contract for the art corridor layer (art-corridor spec, "Art
// Corridor Layer Render Contract — No Fragment Reference").
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ArtCorridorLayer } from './ArtCorridorLayer'
import type { TraceArtCorridor } from './TraceCanvas'

const PIECES: TraceArtCorridor = [
  { href: '/art/sector-snake-small.png', box: { x: 30, y: 60, width: 150, height: 30 } },
  { href: '/art/sector-snake-medium.png', box: { x: 200, y: 220, width: 200, height: 46 }, rotate: 0 },
  { href: '/art/sector-snake-large.png', box: { x: 450, y: 400, width: 180, height: 34 }, rotate: -90 },
]

describe('ArtCorridorLayer', () => {
  it('renders one <image> per piece at the derived box', () => {
    const html = renderToString(<ArtCorridorLayer artCorridor={PIECES} />)
    expect((html.match(/<image/g) ?? []).length).toBe(3)
    expect(html).toContain('/art/sector-snake-small.png')
    expect(html).toContain('/art/sector-snake-medium.png')
    expect(html).toContain('/art/sector-snake-large.png')
    expect(html).toContain('x="30"')
    expect(html).toContain('y="60"')
    expect(html).toContain('width="150"')
    expect(html).toContain('height="30"')
  })

  it('rotation is present only when authored (rotate: 0 or absent emits no transform)', () => {
    const html = renderToString(<ArtCorridorLayer artCorridor={PIECES} />)
    expect(html).toContain('rotate(-90 540 417)') // large piece: cx=450+90, cy=400+17
    // Only one `transform=` attribute (the large piece) among the three images.
    expect((html.match(/transform="rotate/g) ?? []).length).toBe(1)
  })

  it('zero <mask>, <pattern>, <clipPath>, <defs>, or url(#', () => {
    const html = renderToString(<ArtCorridorLayer artCorridor={PIECES} />)
    expect(html).not.toContain('<mask')
    expect(html).not.toContain('<pattern')
    expect(html).not.toContain('<clipPath')
    expect(html).not.toContain('<defs')
    expect(html).not.toContain('url(#')
  })

  it('renders nothing for an empty corridor list', () => {
    const html = renderToString(<ArtCorridorLayer artCorridor={[]} />)
    expect(html).not.toContain('<image')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// The gap a coordinator review found: the coincidence proof in
// `artCorridor.test.ts`/`catalog.test.ts` compares two PATH STRINGS
// (`target.paths[i]` against `placeArtCorridor`'s own `.d` output) and never
// touches the RENDERED `<image>` markup — the `box`/`rotate` fields
// `ArtCorridorLayer` actually draws from. A real screenshot showed the
// scattered (not yet arranged) pieces clipped off the sheet, which no
// existing test caught because nothing renders the REAL SVG output and
// checks it geometrically against the scored path. This block does exactly
// that, end to end: real catalog level → `buildLevelTarget` → real
// `ArtCorridorLayer` markup, parsed back out of the HTML STRING (never the
// internal `placement.box`/`.rotate` fields directly) → an INDEPENDENT
// rotation computed from those parsed numbers → compared against
// `flattenPathD(target.paths[i])`.
describe('ArtCorridorLayer × a real snake level — the rendered markup itself coincides with the scored path', () => {
  it("snake3 (the rotated case): every piece's RENDERED box+transform, parsed back out of the HTML, coincides with target.paths[i]", async () => {
    const { getLevel } = await import('../levels/catalog')
    const { buildLevelTarget } = await import('../levels/buildLevel')
    const { flattenPathD } = await import('../letters/svgLetter')

    const level = getLevel('snake3')
    const target = buildLevelTarget(level)
    const configPieces = level.artCorridor!
    const placements = target.artCorridor!
    expect(placements.length).toBe(3)

    const traceArtCorridor: TraceArtCorridor = configPieces.map((piece, i) => ({
      href: piece.art.href,
      box: placements[i].box,
      rotate: placements[i].rotate,
    }))
    const html = renderToString(<ArtCorridorLayer artCorridor={traceArtCorridor} />)

    // Parse each rendered <image>'s own x/y/width/height/transform straight
    // out of the HTML string — the same bytes a browser would receive, not
    // the React props that produced them.
    const imageTags = html.match(/<image[^>]*>/g) ?? []
    expect(imageTags.length).toBe(3)

    const SPINE_PROBES = 33
    for (let i = 0; i < imageTags.length; i++) {
      const tag = imageTags[i]
      const num = (attr: string): number => {
        const m = tag.match(new RegExp(`${attr}="(-?[0-9.]+)"`))
        if (!m) throw new Error(`${attr} not found in ${tag}`)
        return Number(m[1])
      }
      const x = num('x')
      const y = num('y')
      const width = num('width')
      const height = num('height')
      const rotateMatch = tag.match(/rotate\((-?[0-9.]+) (-?[0-9.]+) (-?[0-9.]+)\)/)
      const rotateDeg = rotateMatch ? Number(rotateMatch[1]) : 0
      const cx = rotateMatch ? Number(rotateMatch[2]) : x + width / 2
      const cy = rotateMatch ? Number(rotateMatch[3]) : y + height / 2

      const spine = (await import('../levels/artCorridor')).DRAWN_SPINE[configPieces[i].spine]
      const rad = (rotateDeg * Math.PI) / 180
      const cos = Math.cos(rad)
      const sin = Math.sin(rad)
      const generated = flattenPathD(target.paths[i]).points

      // The wave is only DRAWN over `[traceFrom, traceTo]` of the box's own
      // width (`placeArtCorridor`'s own `x0`/`localD` domain) — the tapering
      // head/tail tips outside it are art but not modelled centreline, so
      // `generated` (the flattened `d`) has no points to compare against
      // there. Probing the full `[0, 1]` box width against that shorter
      // point array (as an earlier version of this test did) walks the two
      // out of step near the edges and reports a false "off its channel"
      // failure — the actual channel mismatches this test exists to catch
      // (defect 2: a translation/rotation applied about the wrong pivot)
      // look nothing like that: they are gross, not an edge artifact.
      const worstAllowed = height // the wave's own rise is a fraction of height, so a flat
      // probe at `spine.mid` should never miss the true (wavy) centreline by
      // more than one full box height.
      let worst = 0
      for (let p = 0; p < SPINE_PROBES; p++) {
        const f = p / (SPINE_PROBES - 1)
        const traceF = spine.traceFrom + f * (spine.traceTo - spine.traceFrom)
        // The UNROTATED midline point at fraction `traceF` of the RENDERED
        // box's own width, at the fitted spine's own `mid` height fraction —
        // exactly the geometry the `<image>` occupies before its own
        // `transform="rotate(...)"` is applied. (This is a FLAT line, so it
        // only touches the true, wavy centreline at its zero crossings —
        // `worstAllowed` accounts for that, not for a wrong pivot/axis.)
        const localX = x + traceF * width
        const localY = y + spine.mid * height
        const dx = localX - cx
        const dy = localY - cy
        const rx = cx + dx * cos - dy * sin
        const ry = cy + dx * sin + dy * cos
        const a = generated[Math.round(f * (generated.length - 1))]
        const dist = Math.hypot(rx - a.x, ry - a.y)
        if (dist > worst) worst = dist
      }
      expect(worst, `piece ${i}`).toBeLessThan(worstAllowed)
    }
  })
})
