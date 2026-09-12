// ZooMap SSR tests (zoo-map spec: "Image-to-ViewBox Transform and
// Background", "Layer Order", "HUD Captioning", "Sector Debug Overlay",
// "Fog Fade Motion", "No url(#…) References"). Node environment, no DOM —
// `renderToString` plus string assertions, the same convention
// `HomeScreen.test.tsx`/`CaptionedArt.test.tsx` already use.
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import ZooMap, { fogClassFor } from './ZooMap'
import { auditCaptions } from '../detective/captionAudit'
import { EMPTY_RECORD, type LevelRecord } from '../game/types'
import { SECTORS, type Records } from '../zoo/sectors'

function filed(...ids: readonly string[]): Records {
  const out: Record<string, LevelRecord> = {}
  for (const id of ids) out[id] = { ...EMPTY_RECORD, approvals: 1 }
  return out
}

// No `window` mocking anywhere in this file (this harness is node-env, no
// DOM, no `window` at all) — `debug` is passed as an explicit prop instead,
// the same reason `GameScreen` accepts an `initial` prop rather than making
// every caller fake a `window.location.search`.
const render = (records: Records = {}, debug?: boolean) =>
  renderToString(<ZooMap records={records} onEnter={() => {}} debug={debug} />)

/**
 * React 19's `renderToString` hoists `<link rel="preload" as="image">` hints
 * to the very front of the output for every plain `<img>` it renders (the
 * HUD's backpack/recovered-animal thumbnails) — a real SSR behaviour, not a
 * test artefact, but one that defeats a naive `indexOf` comparison between
 * an href that ALSO appears as an `<img>` elsewhere on the same page and one
 * that only ever appears as an SVG `<image>`. Stripped here the same way
 * every screen's own `visibleText` helper already strips the `<style>`
 * block: neither is part of the logical document order a layer-order
 * assertion cares about.
 */
function withoutPreloadLinks(html: string): string {
  return html.replace(/<link rel="preload"[^>]*\/>/g, '')
}

const estanque = SECTORS.find((s) => s.id === 'estanque')!

describe('ZooMap (zoo-map spec "Image-to-ViewBox Transform and Background")', () => {
  it('renders the map image full-bleed with xMidYMid slice', () => {
    const html = render()
    expect(html).toContain('href="/art/zoo-map.png"')
    expect(html).toContain('preserveAspectRatio="xMidYMid slice"')
  })

  it('the outer background is the measured green, never white', () => {
    const html = render()
    expect(html).toContain('fill="#76B56A"')
    expect(html).not.toContain('fill="#fff')
    expect(html).not.toContain('fill="white"')
  })
})

describe('ZooMap (layer order)', () => {
  it('map precedes fog, which precedes recovered-animal images', () => {
    const html = withoutPreloadLinks(render(filed('duck-trail4')))
    const mapAt = html.indexOf('/art/zoo-map.png')
    const fogAt = html.indexOf('/art/zoo-fog-')
    const animalAt = html.indexOf('/art/animal-pato.png')
    expect(mapAt).toBeGreaterThan(-1)
    expect(fogAt).toBeGreaterThan(mapAt)
    expect(animalAt).toBeGreaterThan(fogAt)
  })

  it('five sectors carry fog, the estanque does not', () => {
    const html = render()
    const sectorsWithFog = new Set(
      [...html.matchAll(/data-fog-sector="([^"]+)"/g)].map((m) => m[1]),
    )
    expect(sectorsWithFog.size).toBe(5)
    expect(sectorsWithFog.has('estanque')).toBe(false)
    // One patch per GRID CELL (design.md §4) — `cols × rows` per sector at a
    // 130-unit target cell, so entrada/montañas/nocturna tile 2×1 and
    // bosque/arena tile 2×2 — PLUS one on each interior junction where four
    // cells meet, which only the 2×2 sectors have: (2 + 4 + 2 + 4 + 2) +
    // (0 + 1 + 0 + 1 + 0) = 16 images from five sectors. The junction
    // patches close the hole the four transparent blob corners leave at a
    // junction; the first capture leaked night sky and two stars through it,
    // which `docs/12` §1 forbids outright — a closed sector says "hay algo
    // ahí" and must not say what. Recorded explicitly: `tasks.md` phrases
    // this scenario as "exactly 5 fog images", which undercounts the
    // construction design.md §4 requires; this asserts the actual, correct
    // rendered behaviour rather than the miscounted phrasing. The per-sector
    // count itself is proven in `sectors.test.ts`; this only pins that the
    // screen draws every patch the registry declares.
    const declared = SECTORS.reduce((n, sector) => n + sector.fog.length, 0)
    expect(declared).toBe(16)
    expect([...html.matchAll(/data-fog-sector="/g)]).toHaveLength(declared)
  })

  it('the duck appears only once duck-trail4 is filed', () => {
    expect(render()).not.toContain('/art/animal-pato.png')
    expect(render(filed('duck-trail4'))).toContain('/art/animal-pato.png')
  })
})

describe('ZooMap (HUD is DOM, outside the svg)', () => {
  it('HUD nodes are siblings of, not children of, the svg', () => {
    const html = render()
    const svgClose = html.indexOf('</svg>')
    // The exact CLASS ATTRIBUTE, not the bare substring — `.cv-zoo-hud { }`
    // also appears inside the scoped `<style>` block, well before `</svg>`.
    const hudAt = html.indexOf('class="cv-zoo-hud"')
    expect(svgClose).toBeGreaterThan(-1)
    expect(hudAt).toBeGreaterThan(svgClose)
  })

  it('auditCaptions reports zero uncaptioned words and zero imageless containers', () => {
    const html = render()
    const audit = auditCaptions(html)
    expect(audit.uncaptioned).toEqual([])
    expect(audit.imagelessContainers).toEqual([])
  })

  it('a hand-built bare word outside any licensed container fails the same assertion (falsifiability)', () => {
    const bare = '<main><div>12</div></main>'
    const audit = auditCaptions(bare)
    expect(audit.uncaptioned).not.toEqual([])
  })

  it('shows the star count next to the star image, captioned', () => {
    const html = render(filed(...estanque.adventureIds))
    expect(html).toContain('/art/zoo-star.png')
    expect(html).toContain('class="cv-caption">')
  })
})

describe('ZooMap (debug overlay, zoo-map spec "Sector Debug Overlay")', () => {
  it('paints nothing red when the flag is off', () => {
    expect(render({}, false)).not.toContain('#ff0000')
  })

  it('paints every hit and animalSpot in translucent red when the flag is on, and adds no caption word', () => {
    const html = render({}, true)
    expect(html).toContain('#ff0000')
    // Six hits (five closed + the estanque) plus the plaza reference rect.
    expect(html.match(/<rect[^>]*fill="#ff0000"/g)?.length).toBe(7)
    // One translucent marker per sector WITH a hit (the six that have one).
    expect(html.match(/<circle[^>]*fill="#ff0000"/g)?.length).toBe(6)
    const audit = auditCaptions(html)
    expect(audit.uncaptioned).toEqual([])
  })
})

describe('ZooMap (fog fade class, zoo-map spec "Fog Fade Motion")', () => {
  // Under the CURRENT registry the estanque never carries fog (it starts
  // open, D4), so this scenario cannot be observed via a full render today
  // — see `fogClassFor`'s own comment. Tested directly against the pure
  // function instead, which is the exact logic the render loop calls.
  it('applies the fade class only to the discovered sector', () => {
    const bosque = SECTORS.find((s) => s.id === 'bosque')!
    expect(fogClassFor('bosque', bosque)).toContain('cv-zoo-fog-lift')
    expect(fogClassFor('arena', bosque)).not.toContain('cv-zoo-fog-lift')
    expect(fogClassFor('bosque', null)).not.toContain('cv-zoo-fog-lift')
  })

  it('the reduced-motion rule disables the animation', () => {
    const html = render()
    expect(html).toContain('prefers-reduced-motion: reduce')
    expect(html).toContain('animation: none')
  })
})

describe('ZooMap (D6: no url(#…) anywhere)', () => {
  it('renders zero url(# occurrences and no defs/mask/clipPath/pattern', () => {
    const html = render(filed(...estanque.adventureIds), true)
    expect(html).not.toContain('url(#')
    expect(html).not.toContain('<defs')
    expect(html).not.toContain('<mask')
    expect(html).not.toContain('<clipPath')
    expect(html).not.toContain('<pattern')
  })
})
