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
