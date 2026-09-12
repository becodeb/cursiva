// PistasRail SSR tests (`detective-mode` design unit 5, spec: level-engine
// "PISTAS Rail Chrome"). Node environment, no DOM: every assertion runs on
// the `renderToString` HTML string, following the pattern
// `canvas/TraceCanvas.test.tsx` already uses for this repo.
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import TraceCanvas from '../canvas/TraceCanvas'
import { CLUE_ART, LAMP_ART } from './assets'
import { auditCaptions } from './captionAudit'
import { CLUE_DRAINED } from './palette'
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

describe('PistasRail copy (level-engine spec "PISTAS Rail Chrome"; captioned-art invariant)', () => {
  it('carries no copy beyond the literal word PISTAS (spec scenario "Rail carries no copy beyond PISTAS"), captioned by its own image', () => {
    const html = renderToString(<PistasRail slots={[filedSlot, drainedSlot]} lampOn />)
    expect(textOf(html)).toBe('PISTAS')
    // The licence is CHECKED, not granted by the `pistas-bar` class name
    // alone (`captionAudit.ts`) — this only passes because the bar always
    // also renders the lamp's `<image href>`.
    const audit = auditCaptions(html)
    expect(audit.captioned).toContain('PISTAS')
    expect(audit.uncaptioned).toEqual([])
    expect(audit.imagelessContainers).toEqual([])
  })

  it('carries no copy beyond PISTAS even with no slots and the lamp off, still captioned', () => {
    const html = renderToString(<PistasRail slots={[]} lampOn={false} />)
    expect(textOf(html)).toBe('PISTAS')
    const audit = auditCaptions(html)
    expect(audit.captioned).toContain('PISTAS')
    expect(audit.uncaptioned).toEqual([])
    expect(audit.imagelessContainers).toEqual([])
  })
})

describe('PistasRail typeset word (supersedes D6)', () => {
  // D6 said the word must be drawn, never typeset, and the reason it gave was
  // that no font subsystem existed here. One now does: `client/index.html`
  // declares Nunito and sets it on the document root, so every screen inherits
  // it. The drawn word cost real quality for that constraint -- `M`/`L`
  // segments cannot describe a round S, so it came out a stepped zig-zag, and
  // a uniform 8-unit monoline is the opposite of the style guide's "formas
  // gordas y generosas". With the constraint gone, the cost has nothing left
  // to buy. These tests pin the replacement rather than the removal.

  it('renders the word as real text, not as six aria-hidden polylines', () => {
    const html = renderToString(<PistasRail slots={[]} lampOn={false} />)
    expect(html).toContain('class="pistas-word">PISTAS<')
    // The old drawn glyphs are gone: no 60x100 em boxes, no monoline paths.
    expect(html).not.toContain('viewBox="0 0 60 100"')
    expect(html).not.toContain('stroke-width="8"')
  })

  it('names the rail exactly once, so a screen reader does not say it twice', () => {
    const html = renderToString(<PistasRail slots={[filedSlot]} lampOn />)
    // While the word was six `aria-hidden` drawings it needed an sr-only span
    // to carry the accessible name. Real text carries its own, and leaving the
    // span in would read "PISTAS PISTAS".
    expect((html.match(/PISTAS/g) ?? []).length).toBe(1)
    const audit = auditCaptions(html)
    expect(audit.captioned).toContain('PISTAS')
    expect(audit.uncaptioned).toEqual([])
    expect(audit.imagelessContainers).toEqual([])
  })

  it('sets no font-family of its own, so the document root stays the one source', () => {
    const html = renderToString(<PistasRail slots={[]} lampOn={false} />)
    // The family is inherited, never re-declared per component. A local
    // override here is how a rail silently drifts off the app's typeface.
    expect(html).not.toMatch(/font-family|fontFamily|@font-face/i)
    // Still no SVG `<text>`: the word is HTML, which is what lets it inherit
    // and what keeps it out of the canvas's viewBox scaling.
    expect(html).not.toContain('<text')
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

  it('lights the lamp with the lit art when on', () => {
    const html = renderToString(<PistasRail slots={[]} lampOn />)
    expect(html).toContain(`href="${LAMP_ART.on.href}"`)
    expect(html).not.toContain(LAMP_ART.off.href)
  })

  it('leaves the lamp drained when off', () => {
    const html = renderToString(<PistasRail slots={[]} lampOn={false} />)
    expect(html).toContain(`href="${LAMP_ART.off.href}"`)
    expect(html).not.toContain(LAMP_ART.on.href)
    // The drained grey still reaches the bar through the four empty sockets,
    // which is what makes an unlit rail read as waiting rather than broken.
    expect(html).toContain(CLUE_DRAINED)
  })

  it('does not reflow the bar when the lamp lights up', () => {
    // The lit file is wider than the drained one (its rays), so a box sized
    // per-state would visibly shove the PISTAS word sideways the moment a
    // trail is finished. Both states render in the SAME box.
    const box = (html: string) => html.slice(html.indexOf('<svg'), html.indexOf('</svg>'))
    const on = box(renderToString(<PistasRail slots={[]} lampOn />))
    const off = box(renderToString(<PistasRail slots={[]} lampOn={false} />))
    const size = (svg: string) => svg.match(/width="([\d.]+)" height="([\d.]+)"/)?.slice(1)
    expect(size(on)).toEqual(size(off))
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
    // Sockets, not marks: an unfiled PADDING slot renders an empty socket
    // with no art in it, so counting art would undercount the chrome.
    const slotCount = (html: string) => (html.match(/<rect[^>]*rx="5"/g) ?? []).length
    expect(slotCount(zero)).toBe(4)
    expect(slotCount(one)).toBe(4)
    expect(slotCount(four)).toBe(4)
  })

  it('a filed slot shows the trail\'s EARNED clue art inside its registered-colour socket', () => {
    const html = renderToString(<PistasRail slots={[filedSlot]} lampOn={false} />)
    // The socket still carries the colour token — that half of the contract
    // is unchanged and `palette.test.ts` reasons about it.
    expect(html).toContain('stroke="#3f6f8f"')
    // What is new: the slot shows the real droplet the child collected,
    // rather than an abstract diamond that "read as a detached diamond
    // rather than a slot that fills".
    expect(html).toContain(`href="${CLUE_ART.droplet.art.earned.href}"`)
    expect(html).not.toContain(CLUE_ART.droplet.art.drained.href)
  })

  it('a drained slot shows the SAME clue art in its drained state, in a grey socket', () => {
    const html = renderToString(<PistasRail slots={[drainedSlot]} lampOn={false} />)
    expect(html).toContain('fill="none"')
    expect(html).toContain(`stroke="${CLUE_DRAINED}"`)
    // `drainedSlot` is the CORN trail, so this also pins that a slot shows
    // its own trail's art rather than a shared generic placeholder.
    expect(html).toContain(`href="${CLUE_ART.corn.art.drained.href}"`)
    expect(html).not.toContain(CLUE_ART.corn.art.earned.href)
  })

  it('renders a PADDING slot as an empty socket, never a phantom clue', () => {
    // A slot the caller knows nothing about must not show a grey clue: that
    // would claim a trail exists and is merely unfinished.
    const html = renderToString(<PistasRail slots={[filedSlot]} lampOn={false} />)
    const marks = (html.match(/<image/g) ?? []).length
    // One lamp + exactly one clue mark for the one known slot.
    expect(marks).toBe(2)
  })

  it('holds each clue file\'s aspect ratio inside the socket', () => {
    const html = renderToString(
      <PistasRail slots={[{ kind: 'feather', filed: true }]} lampOn={false} />,
    )
    const art = CLUE_ART.feather.art.earned
    expect(html).toContain(`width="${(16 * art.w) / art.h}"`)
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
