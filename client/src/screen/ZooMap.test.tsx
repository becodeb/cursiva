// ZooMap SSR tests (zoo-map spec: "Image-to-ViewBox Transform and
// Background", "Layer Order", "HUD Captioning", "Sector Debug Overlay",
// "Fog Fade Motion", "No url(#…) References"). Node environment, no DOM —
// `renderToString` plus string assertions, the same convention
// `HomeScreen.test.tsx`/`CaptionedArt.test.tsx` already use.
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import ZooMap, { fogClassFor, spotlightHolePath } from './ZooMap'
import { auditCaptions } from '../detective/captionAudit'
import { EMPTY_RECORD, type LevelRecord } from '../game/types'
import { hitCentre, SECTORS, type Records } from '../zoo/sectors'

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
    // Scoped to the background rect itself (design.md §7's letterbox-fill
    // decision) rather than a blanket ban on white anywhere on the screen:
    // the spotlight's own play badge (T4, `docs/18` D5) is legitimately
    // white (its ring stroke and triangle), the same way the HUD's own
    // white lettering elsewhere was already never in scope for this claim.
    const backgroundRect = html.match(/<rect x="0" y="0" width="1000" height="600" fill="[^"]*"/)?.[0]
    expect(backgroundRect).toContain('fill="#76B56A"')
    expect(backgroundRect).not.toContain('fill="#fff')
    expect(backgroundRect).not.toContain('fill="white"')
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

  // [Superseded by T8, docs/18 §4.7 item 1] Before T8, this exact fixture
  // (duck-trail4 filed without 1-3, e.g. by the dev seed) surfaced the
  // duck's own rescue LINE on the map bubble via `mapBubble`'s
  // most-recently-recovered-animal lookup, because `recentlyDiscovered`
  // landed back on the estanque (duck-trail1..3 still unfiled). T8 moves
  // every rescue onto its own closing screen and makes the ongoing bubble
  // say ONWARD whenever a journey step exists — and one does here (the
  // duck's own trail is not finished) — so the bubble no longer echoes the
  // rescue at all, regardless of which sector it is about.
  it('reads onward, never the duck rescue line, while duck-trail4 is filed but the duck row is not yet finished', () => {
    const entrada = SECTORS.find((s) => s.id === 'entrada')!
    const records: Records = {
      ...filed(...entrada.adventureIds, 'duck-trail4'),
      'sheep-hill1': { ...EMPTY_RECORD, attempts: 1 },
    }
    const html = render(records)
    expect(html).not.toContain('¡Encontramos al pato! Ya está en su laguna.')
    expect(html).toContain('¡Mirá! Las huellas van hacia allá. ¿Vamos?')
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

  // The documented defect (adventure-flow-and-map-guidance T4,
  // `odd/tasks/adventure-flow-and-map-guidance.md` "2026-09-23"): once the
  // sheep is done, the pre-T4 bubble (fed `recentlyDiscovered`) kept saying
  // "¡Encontramos al pato!" because the estanque still had unfinished work
  // of its own (the medusa/dolphin blocks), ahead of montañas in registry
  // order. T4 fixed WHICH SECTOR the bubble talks about (the spotlight
  // target); T8 (docs/18 §4.7 item 1) goes further and stops the ongoing
  // bubble from repeating ANY rescue at all while a journey step remains —
  // the sheep's own rescue is now told once, by its own closing screen, the
  // instant sheep-hill4 is filed, so the map bubble reads onward toward the
  // llama instead of re-announcing the sheep every time the child looks at
  // the map afterward.
  it('after the sheep is done, the bubble reads onward toward the llama — it repeats neither the duck nor the sheep rescue', () => {
    const entrada = SECTORS.find((s) => s.id === 'entrada')!
    const records: Records = filed(
      ...entrada.adventureIds,
      'duck-trail1',
      'duck-trail2',
      'duck-trail3',
      'duck-trail4',
      'sheep-hill1',
      'sheep-hill2',
      'sheep-hill3',
      'sheep-hill4',
    )
    const html = render(records)
    expect(html).not.toContain('¡Encontramos al pato!')
    expect(html).not.toContain('¡Juntamos las ovejas!')
    expect(html).toContain('¡Mirá! Las huellas van hacia allá. ¿Vamos?')
  })

  // The orchestrator's own literal repro (T8 brief): after the bee, the
  // spotlight sits back on the estanque for its medusa block — a sector
  // holding the duck's own long-finished rescue — and the pre-T8 bubble
  // announced that old rescue again ("stale news"). `isSpotlightTarget`
  // makes the bubble onward-only whenever a journey step remains, so the
  // estanque's own medusa/dolphin work still ahead never resurrects the
  // duck's rescue line.
  it('after the bee is done, the bubble reads onward for the estanque — not the long-ago duck rescue', () => {
    const entrada = SECTORS.find((s) => s.id === 'entrada')!
    const montanas = SECTORS.find((s) => s.id === 'montanas')!
    const nocturna = SECTORS.find((s) => s.id === 'nocturna')!
    const arena = SECTORS.find((s) => s.id === 'arena')!
    const bosque = SECTORS.find((s) => s.id === 'bosque')!
    const records: Records = filed(
      ...entrada.adventureIds,
      'duck-trail1',
      'duck-trail2',
      'duck-trail3',
      'duck-trail4',
      ...montanas.adventureIds,
      ...nocturna.adventureIds,
      ...arena.adventureIds,
      ...bosque.adventureIds,
    )
    const html = render(records)
    expect(html).not.toContain('¡Encontramos al pato!')
    expect(html).toContain('¡Mirá! Las huellas van hacia allá. ¿Vamos?')
  })
})

describe('ZooMap bubble interactivity (T4: dismissible, re-openable)', () => {
  it('the bubble is a dismiss button, and the Pulpito is a keyboard-accessible re-open control', () => {
    const html = render()
    expect(html).toContain('aria-label="Cerrar el mensaje del Pulpito"')
    expect(html).toContain('aria-label="Pulpito: escuchar de nuevo"')
    // The octopus control carries its own role/tabIndex, the same pattern
    // the sector hits use — asserted narrowly against ITS OWN class so this
    // cannot pass merely because a sector control happens to exist too.
    const octopusControlAt = html.indexOf('class="cv-zoo-octopus-control"')
    expect(octopusControlAt).toBeGreaterThan(-1)
    const octopusTag = html.slice(html.lastIndexOf('<g', octopusControlAt), octopusControlAt + 200)
    expect(octopusTag).toContain('role="button"')
    expect(octopusTag).toContain('tabindex="0"')
  })
})

describe('spotlightHolePath (T4, D5)', () => {
  const hit = { x: 100, y: 50, w: 200, h: 120 }

  it('starts with the outer 1000x600 rect and follows with an ellipse hole centred on the hit', () => {
    const d = spotlightHolePath(hit)
    expect(d.startsWith('M 0 0 H 1000 V 600 H 0 Z')).toBe(true)
    // Two arcs draw the closed ellipse (design: "one path, two A commands").
    expect(d.match(/A /g)).toHaveLength(2)
    const { x: cx, y: cy } = hitCentre(hit)
    expect(d).toContain(`${cx - (hit.w / 2 + 30)} ${cy}`)
  })

  it('the hole grows with a wider pad, and shrinks with a narrower one', () => {
    const wide = spotlightHolePath(hit, 60)
    const narrow = spotlightHolePath(hit, 5)
    const { x: cx } = hitCentre(hit)
    // The ellipse's own leftmost x (`cx - rx`) moves further from the
    // centre as the pad grows.
    expect(wide).toContain(`${cx - (hit.w / 2 + 60)}`)
    expect(narrow).toContain(`${cx - (hit.w / 2 + 5)}`)
  })
})

describe('ZooMap spotlight (T4, D5: exactly one place highlighted)', () => {
  it('on a fresh install, the entrance alone carries the spotlight and the next-sector hook', () => {
    const html = render()
    expect(html).toContain('data-spotlight="true"')
    expect(html).toContain('data-next-sector="true"')
    const marked = [...html.matchAll(/data-sector-control="([^"]+)"[^>]*data-next-sector="true"/g)]
    // `data-next-sector` sits right after `data-sector-control` in source
    // order (`ZooMap.tsx`), so this also pins WHICH sector carries it.
    expect(marked).toHaveLength(1)
    expect(marked[0][1]).toBe('entrada')
  })

  // The same fixture and claim as the bubble regression above, checked at
  // the QA-hook level: the spotlight — not just the bubble's words — must
  // move on to montañas rather than lingering on the estanque.
  it('after the sheep is done, the spotlight (and its next-sector hook) moves to montañas', () => {
    const entrada = SECTORS.find((s) => s.id === 'entrada')!
    const records: Records = filed(
      ...entrada.adventureIds,
      'duck-trail1',
      'duck-trail2',
      'duck-trail3',
      'duck-trail4',
      'sheep-hill1',
      'sheep-hill2',
      'sheep-hill3',
      'sheep-hill4',
    )
    const html = render(records)
    const marked = [...html.matchAll(/data-sector-control="([^"]+)"[^>]*data-next-sector="true"/g)]
    expect(marked).toHaveLength(1)
    expect(marked[0][1]).toBe('montanas')
  })

  it('once every sector the ladder reaches is fully filed, there is nothing left to spotlight', () => {
    const entrada = SECTORS.find((s) => s.id === 'entrada')!
    const estanque = SECTORS.find((s) => s.id === 'estanque')!
    const montanas = SECTORS.find((s) => s.id === 'montanas')!
    const nocturna = SECTORS.find((s) => s.id === 'nocturna')!
    const arena = SECTORS.find((s) => s.id === 'arena')!
    const bosque = SECTORS.find((s) => s.id === 'bosque')!
    const html = render(
      filed(
        ...entrada.adventureIds,
        ...estanque.adventureIds,
        ...montanas.adventureIds,
        ...nocturna.adventureIds,
        ...arena.adventureIds,
        ...bosque.adventureIds,
      ),
    )
    expect(html).not.toContain('data-spotlight')
    expect(html).not.toContain('data-next-sector')
  })
})

describe('ZooMap accessibility (finish-mvp-roadmap U5)', () => {
  it('replaces the miniaturized map with rotate guidance on narrow portrait screens', () => {
    const html = render()
    expect(html).toContain('@media (max-width: 559px) and (orientation: portrait)')
    expect(html).toContain('.cv-zoo-stage { display: none; }')
    expect(html).toContain('class="cv-zoo-portrait-guidance"')
    expect(html).toContain('role="status"')
    expect(html).toContain('aria-label="Girá el dispositivo.')
  })

  it('exposes open sectors as named keyboard-focusable controls with status', () => {
    const html = render(filed('sand4'))
    expect(html).toContain('role="button"')
    expect(html).toContain('tabindex="0"')
    expect(html).toContain('aria-label="Entrar a Estanque')
    expect(html).toContain('aria-describedby="cv-zoo-status"')
    expect(html).toContain('id="cv-zoo-status"')
  })

  it('keeps closed and scenery sectors out of the tab order', () => {
    const html = render()
    const focusableSectors = [...html.matchAll(/data-sector-control="([^"]+)"/g)].map((m) => m[1])
    expect(focusableSectors).toEqual(['entrada'])
    expect(focusableSectors).not.toContain('sendero')
  })
})
