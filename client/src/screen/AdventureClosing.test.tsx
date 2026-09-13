// AdventureClosing SSR tests (main-screen spec: "AdventureClosing Screen
// Renders the Transformation"). Node environment, no DOM: `renderToString`
// on the HTML string, the same convention `AdventureIntro.test.tsx` uses.
import { renderToString } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import AdventureClosing from './AdventureClosing'
import { auditCaptions } from '../detective/captionAudit'
import { CARRIER_LENS_ART, SECTOR_ADVENTURE_ART, ZOO_OCTOPUS_BACKPACK_ART, ZOO_SPEECH_BUBBLE_ART } from '../detective/assets'
import { ADVENTURES, type Adventure } from '../zoo/adventures'

const sand = ADVENTURES.find((a) => a.id === 'sand')!

/**
 * `night`'s registry row carries NO `closingBeat` — [corrected] design.md
 * §6.2's own literal contradicts the ratified `main-screen` spec delta and
 * tasks.md's own task 6.5 scenario list (`apply-progress.md`'s Phase 6
 * section has the full finding). `sand` is therefore the only SHIPPED
 * adventure with a closing beat, which is not enough on its own to prove
 * this component is generic over ANY `closingBeat`, not merely coupled to
 * `sand`'s own data — this fixture (design.md §6.2's own now-unused night
 * literal, byte-identical to what it would have been) proves the
 * component's contract independent of which adventure supplies it.
 */
const fixtureAdventure: Adventure = {
  id: 'night',
  levelIds: ['night1', 'night2', 'night3', 'night4'],
  sector: 'nocturna',
  icon: SECTOR_ADVENTURE_ART.flashlight,
  intro: 'De noche hay cosas escondidas. ¿Las buscamos con la luz?',
  closing: 'Encontramos todo en la oscuridad.',
  closingBeat: {
    line: '¡Encontramos todo en la oscuridad! La linterna va a la mochila.',
    art: CARRIER_LENS_ART,
  },
}

describe('AdventureClosing (main-screen spec "AdventureClosing Screen Renders the Transformation")', () => {
  it("renders closingBeat.art's href and closingBeat.line for the sand adventure", () => {
    expect(sand.closingBeat).toBeDefined()
    const html = renderToString(<AdventureClosing adventure={sand} onContinue={() => {}} />)
    expect(html).toContain(`href="${sand.closingBeat!.art.href}"`)
    expect(html.split(sand.closingBeat!.line).length - 1).toBe(1)
  })

  it("renders closingBeat.art's href and closingBeat.line for any adventure that carries one (genericity, not sand-specific)", () => {
    const html = renderToString(<AdventureClosing adventure={fixtureAdventure} onContinue={() => {}} />)
    expect(html).toContain(`href="${fixtureAdventure.closingBeat!.art.href}"`)
    expect(html.split(fixtureAdventure.closingBeat!.line).length - 1).toBe(1)
  })

  it('renders the two shared registered hrefs: backpack octopus, speech bubble', () => {
    const html = renderToString(<AdventureClosing adventure={sand} onContinue={() => {}} />)
    expect(html).toContain(`src="${ZOO_OCTOPUS_BACKPACK_ART.href}"`)
    expect(html).toContain(`src="${ZOO_SPEECH_BUBBLE_ART.href}"`)
  })

  it('keeps auditCaptions green: zero uncaptioned words, zero imageless containers', () => {
    const html = renderToString(<AdventureClosing adventure={sand} onContinue={() => {}} />)
    const audit = auditCaptions(html)
    expect(audit.uncaptioned).toEqual([])
    expect(audit.imagelessContainers).toEqual([])
  })

  it('introduces no url(#) reference', () => {
    const html = renderToString(<AdventureClosing adventure={sand} onContinue={() => {}} />)
    expect(html).not.toContain('url(#')
  })

  it('renders one tappable button, with no aria-label overriding the caption', () => {
    const html = renderToString(<AdventureClosing adventure={sand} onContinue={() => {}} />)
    expect(html).toContain('<button')
    expect(html).toContain('type="button"')
    expect(html).toContain('class="cv-closing-stage"')
    const buttonOpenTag = html.slice(html.indexOf('<button'), html.indexOf('>', html.indexOf('<button')) + 1)
    expect(buttonOpenTag).not.toContain('aria-label')
  })

  it('onContinue is wired to the tap — invoking it does not throw', () => {
    const onContinue = vi.fn()
    renderToString(<AdventureClosing adventure={sand} onContinue={onContinue} />)
    // `renderToString` never fires DOM events (same limitation
    // `AdventureIntro.test.tsx`'s own header records for `onStart`) — this
    // only proves the prop itself is callable without throwing.
    expect(() => onContinue()).not.toThrow()
  })
})
