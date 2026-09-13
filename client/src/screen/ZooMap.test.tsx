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
  // `attempts: 1` alongside `approvals: 1` — a filed level was necessarily
  // attempted at least once (the real store never files a level with zero
  // attempts). `recentlyDiscovered`'s untouched-sector preference
  // (design.md §7.2) reads `attempts`, not `approvals`, so a fixture that
  // only sets the latter would leave `entrada` reading as "never touched"
  // forever, whatever else gets filed.
  for (const id of ids) out[id] = { ...EMPTY_RECORD, attempts: 1, approvals: 1 }
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

  it('the sectors closed on a fresh install carry fog; entrada, open from the start, does not (row D)', () => {
    // Row D re-shuffles which sector is the open one (design.md §7.1,
    // amendment A4): `entrada` is now `alwaysOpen` (there is nowhere else
    // to start) and the estanque moves OFF `alwaysOpen` onto
    // `isFiled(records, 'sand4')` — so on a FRESH install the closed set is
    // `bosque`/`montanas`/`arena`/`nocturna`/`estanque`, not `entrada`.
    // Computed from the registry itself, rather than a hand-counted
    // literal, so this cannot silently drift from `sectors.ts`'s own data —
    // the per-sector patch count and its junction-patch construction are
    // already proven in `sectors.test.ts`; this only pins that the screen
    // draws every patch the registry declares for the sectors actually
    // closed right now.
    const html = render()
    const sectorsWithFog = new Set(
      [...html.matchAll(/data-fog-sector="([^"]+)"/g)].map((m) => m[1]),
    )
    const closedOnFreshInstall = SECTORS.filter((s) => s.hit && !s.unlockedWhen({}))
    expect([...sectorsWithFog].sort()).toEqual(closedOnFreshInstall.map((s) => s.id).sort())
    expect(sectorsWithFog.has('entrada')).toBe(false)
    expect(sectorsWithFog.has('estanque')).toBe(true)
    const declared = closedOnFreshInstall.reduce((n, sector) => n + sector.fog.length, 0)
    expect([...html.matchAll(/data-fog-sector="/g)]).toHaveLength(declared)
  })

  /* Row C regression, found by reading `capturas/pasoC/`. The fog layer used
   * to filter on `fog.length > 0` alone, which agreed with openness only
   * because every sector was either always-open (the estanque, whose `fog` is
   * `[]` for exactly that reason) or always-closed. Montañas is the first
   * sector with a CONDITIONAL unlock, so the old filter left its cloud
   * painted over a sector whose hit was already live and tappable — the map
   * said "not yet" about something the child had just earned. */
  it("montañas' fog lifts once duck-trail4 is filed, because its unlock is conditional", () => {
    const closed = new Set(
      [...render().matchAll(/data-fog-sector="([^"]+)"/g)].map((m) => m[1]),
    )
    expect(closed.has('montanas')).toBe(true)

    const opened = new Set(
      [...render(filed('duck-trail4')).matchAll(/data-fog-sector="([^"]+)"/g)].map((m) => m[1]),
    )
    expect(opened.has('montanas')).toBe(false)
    // Only montañas moves — every other fogged sector is still closed.
    expect([...opened].sort()).toEqual([...closed].filter((id) => id !== 'montanas').sort())
  })

  it('every fogged sector is exactly a closed one, for both inputs', () => {
    for (const records of [{}, filed('duck-trail4')]) {
      const html = render(records)
      const fogged = new Set(
        [...html.matchAll(/data-fog-sector="([^"]+)"/g)].map((m) => m[1]),
      )
      for (const sector of SECTORS) {
        if (sector.fog.length === 0) continue
        expect(fogged.has(sector.id), `${sector.id} fog vs open`).toBe(
          !sector.unlockedWhen(records),
        )
      }
    }
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

describe('ZooMap bubble (zoo-map spec "Octopus Phrase Reads as a Closing")', () => {
  it('reads the onward phrase and the print art before duck-trail4 is filed', () => {
    const html = render()
    expect(html).toContain('¡Mirá! Las huellas van hacia allá. ¿Vamos?')
    expect(html).toContain('/art/zoo-octopus-print.png')
    expect(html).not.toContain('¡Encontramos al pato!')
  })

  it('closes with the duck art and line once duck-trail4 is filed', () => {
    // Row D FOUND an interaction design.md never names (recorded in
    // apply-progress.md's Phase 5 section): filing `duck-trail4` alone
    // ALSO opens `montañas` (`unlockedWhen: isFiled(records,
    // 'duck-trail4')`), which — being brand new — reads as UNTOUCHED
    // (design.md §7.2) and outranks the estanque's own just-earned closing
    // line the instant the duck is found. That is a real, always-reachable
    // state under normal play, not a contrived one — bare
    // `filed(...entrada.adventureIds, 'duck-trail4')` reproduces it, and it
    // resolves to montañas' ONWARD phrase, not the duck's closing line
    // (`mapBubble`'s OWN contract is unaffected and still correctly
    // asserted in `zoo/adventures.test.ts` — this is purely a
    // `recentlyDiscovered` sector-selection interaction).
    //
    // The duck's closing line is still reachable end to end, the moment
    // montañas itself is no longer untouched — e.g. the child taps into
    // the freshly-opened montañas and tries (not yet finishes) its first
    // level, then returns to the map. That is exactly what this fixture
    // reproduces: `sheep-hill1` attempted, not approved.
    const entrada = SECTORS.find((s) => s.id === 'entrada')!
    const records: Records = {
      ...filed(...entrada.adventureIds, 'duck-trail4'),
      'sheep-hill1': { ...EMPTY_RECORD, attempts: 1 },
    }
    const html = render(records)
    expect(html).toContain('¡Encontramos al pato! Ya está en su laguna.')
    expect(html).not.toContain('¡Mirá! Las huellas van hacia allá. ¿Vamos?')
  })

  it('keeps auditCaptions green before and after the duck is recovered', () => {
    const entrada = SECTORS.find((s) => s.id === 'entrada')!
    const records: Records = {
      ...filed(...entrada.adventureIds, 'duck-trail4'),
      'sheep-hill1': { ...EMPTY_RECORD, attempts: 1 },
    }
    expect(auditCaptions(render()).uncaptioned).toEqual([])
    expect(auditCaptions(render(records)).uncaptioned).toEqual([])
  })
})
