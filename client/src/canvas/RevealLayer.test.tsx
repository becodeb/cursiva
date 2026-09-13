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
    const reveal: TraceReveal = { fill: '#64726b', tiles }
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
      fill: '#64726b',
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
