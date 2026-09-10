// PistasRail SSR tests (`detective-mode` design unit 5, spec: level-engine
// "PISTAS Rail Chrome"). Node environment, no DOM: every assertion runs on
// the `renderToString` HTML string, following the pattern
// `canvas/TraceCanvas.test.tsx` already uses for this repo.
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import TraceCanvas from '../canvas/TraceCanvas'
import PistasRail, { type PistasSlot } from './PistasRail'

/** Strips every tag (and therefore every attribute, so an `aria-hidden` or a
 * `d="M..."` value can never masquerade as text content) and collapses
 * whitespace — a plain text-node extractor for a string that was never a
 * live DOM (no jsdom, no `textContent` available). */
function textOf(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const filedSlot: PistasSlot = { kind: 'droplet', filed: true }
const drainedSlot: PistasSlot = { kind: 'corn', filed: false }

describe('PistasRail placement (level-engine spec "PISTAS Rail Chrome")', () => {
  it('bar renders as a sibling of the canvas, not inside the viewBox (spec scenario "Rail renders beside the canvas, not inside the viewBox")', () => {
    const html = renderToString(
      <div>
        <TraceCanvas />
        <PistasRail slots={[]} lampOn={false} />
      </div>,
    )
    const svgClose = html.indexOf('</svg>')
    const railOpen = html.indexOf('<aside')
    expect(svgClose).toBeGreaterThan(-1)
    expect(railOpen).toBeGreaterThan(-1)
    // The bar markup starts only AFTER the canvas's own `<svg>` has closed —
    // it is a sibling in the chrome, never nested inside the canvas's
    // 1000-unit viewBox content. `LevelPlay` places the actual `<aside>`
    // ABOVE `.cv-sheet` (the horizontal top-bar defect fix), which this
    // component-level test cannot see — the DOM-nesting contract asserted
    // here (never inside the SVG) is unaffected by which side it renders on.
    expect(railOpen).toBeGreaterThan(svgClose)
  })

  it('renders as a single horizontal bar, not the old lamp/word/slots column nesting', () => {
    const html = renderToString(<PistasRail slots={[]} lampOn={false} />)
    // The old layout wrapped word+slots in a shared `.pistas-body` row
    // inside a `.pistas-rail` column; the bar is flat now — lamp, word and
    // slots are three direct siblings inside `.pistas-bar`, and CSS alone
    // (`LevelPlay.tsx`'s `LAYOUT_CSS`) lays them out in a row.
    expect(html).toContain('class="pistas-bar"')
    expect(html).not.toContain('pistas-rail')
    expect(html).not.toContain('pistas-body')
    expect(html).toContain('class="pistas-lamp-row"')
    expect(html).toContain('class="pistas-word"')
    expect(html).toContain('class="pistas-slots"')
  })
})

describe('PistasRail copy (level-engine spec "PISTAS Rail Chrome")', () => {
  it('carries no copy beyond the literal word PISTAS (spec scenario "Rail carries no copy beyond PISTAS")', () => {
    const html = renderToString(<PistasRail slots={[filedSlot, drainedSlot]} lampOn />)
    expect(textOf(html)).toBe('PISTAS')
  })

  it('carries no copy beyond PISTAS even with no slots and the lamp off', () => {
    const html = renderToString(<PistasRail slots={[]} lampOn={false} />)
    expect(textOf(html)).toBe('PISTAS')
  })
})

describe('PistasRail drawn word (D6: no font, no typeset text)', () => {
  it('draws the word as stroked paths, never a font-based text node', () => {
    const html = renderToString(<PistasRail slots={[]} lampOn={false} />)
    expect(html).not.toMatch(/font-family|fontFamily|@font-face/i)
    expect(html).not.toContain('<text')
  })

  it('draws the word BIG (defect fix: it read too small to see at a glance)', () => {
    const html = renderToString(<PistasRail slots={[]} lampOn={false} />)
    // The old rail rendered each glyph at 22×36. The regression this guards
    // against is someone shrinking the bar back down once it is no longer a
    // cramped side column — a glyph under, say, 40px tall is the old "too
    // small to read" bug again.
    const glyphSizes = [...html.matchAll(/<svg viewBox="0 0 60 100" width="(\d+)" height="(\d+)"/g)]
    expect(glyphSizes.length).toBe(6)
    for (const [, , height] of glyphSizes) expect(Number(height)).toBeGreaterThanOrEqual(60)
  })

  it('every drawn glyph is stroke width 8, unfilled, round-capped M/L geometry', () => {
    const html = renderToString(<PistasRail slots={[]} lampOn={false} />)
    // Six glyphs, all sharing the same stroke contract.
    expect((html.match(/stroke-width="8"/g) ?? []).length).toBe(6)
    expect((html.match(/stroke-linecap="round"/g) ?? []).length).toBeGreaterThanOrEqual(6)
    // Every glyph `d` string uses only M/L commands (D6: no curves in the
    // drawn word itself — icons.tsx and the clue registry are not bound by
    // this, but the word is).
    const glyphDs = [...html.matchAll(/<path d="([^"]+)" fill="none" stroke="#1e293b"/g)].map(
      (m) => m[1],
    )
    expect(glyphDs.length).toBe(6)
    for (const d of glyphDs) expect(d).toMatch(/^[ML0-9,.\- ]+$/)
  })
})

describe('PistasRail lamp (design.md "Light is drawn, never blurred")', () => {
  it('renders three concentric stroked rings, never a gradient or a mask', () => {
    const html = renderToString(<PistasRail slots={[]} lampOn />)
    expect(html).not.toContain('url(#')
    expect(html).not.toContain('<radialGradient')
    expect(html).not.toContain('<filter')
    expect(html).not.toContain('<mask')
    expect(html).not.toContain('<clipPath')
  })

  it('lights the lamp gold when on', () => {
    const html = renderToString(<PistasRail slots={[]} lampOn />)
    expect(html).toContain('#f2d377')
  })

  it('leaves the lamp drained grey when off', () => {
    const html = renderToString(<PistasRail slots={[]} lampOn={false} />)
    expect(html).not.toContain('#f2d377')
    expect(html).toContain('#c8cdd2')
  })
})

describe('PistasRail slots', () => {
  it('always renders exactly four slot positions, whatever the caller supplies', () => {
    const zero = renderToString(<PistasRail slots={[]} lampOn={false} />)
    const one = renderToString(<PistasRail slots={[filedSlot]} lampOn={false} />)
    const four = renderToString(
      <PistasRail
        slots={[filedSlot, drainedSlot, filedSlot, drainedSlot]}
        lampOn={false}
      />,
    )
    const slotCount = (html: string) => (html.match(/points="12,2 22,12 12,22 2,12"/g) ?? []).length
    expect(slotCount(zero)).toBe(4)
    expect(slotCount(one)).toBe(4)
    expect(slotCount(four)).toBe(4)
  })

  it('a filed slot renders its trail\'s registered colour, filled', () => {
    const html = renderToString(<PistasRail slots={[filedSlot]} lampOn={false} />)
    expect(html).toContain('fill="#3f6f8f"')
  })

  it('a drained slot renders no fill and the shared drained token', () => {
    const html = renderToString(<PistasRail slots={[drainedSlot]} lampOn={false} />)
    expect(html).toContain('fill="none"')
    expect(html).toContain('stroke="#c8cdd2"')
  })

  it('draws a socket behind each mark, so a slot reads as a container that fills rather than a loose floating diamond', () => {
    const html = renderToString(<PistasRail slots={[filedSlot]} lampOn={false} />)
    // The socket is a rounded rect sharing the mark's own colour — new
    // chrome around the SAME diamond geometry (`points="12,2 22,12 12,22
    // 2,12"`, asserted unchanged just above).
    expect(html).toMatch(/<rect[^>]*rx="5"[^>]*>/)
  })

  it('no url(#) reference anywhere in the whole rail', () => {
    const html = renderToString(<PistasRail slots={[filedSlot, drainedSlot]} lampOn />)
    expect(html).not.toContain('url(#')
  })
})
