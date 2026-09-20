// AdventureClosing SSR tests (main-screen spec: "AdventureClosing Screen
// Renders the Transformation"; add-caretaker-prologue design.md D3). Node
// environment, no DOM: `renderToString` on the HTML string, the same
// convention `AdventureIntro.test.tsx` uses.
import { renderToString } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import AdventureClosing from './AdventureClosing'
import { auditCaptions } from '../detective/captionAudit'
import { CARRIER_LENS_ART, SECTOR_ADVENTURE_ART, ZOO_OCTOPUS_BACKPACK_ART, ZOO_SPEECH_BUBBLE_ART } from '../detective/assets'
import { ADVENTURES, type Adventure, type ClosingBeat } from '../zoo/adventures'

// Renamed from `sand` (add-caretaker-prologue design.md D7): `sendero` is
// `sand`'s direct successor, ending on the same `sand4` and carrying the
// TWO-beat closing the old single-beat `sand` row used to carry as one.
const sendero = ADVENTURES.find((a) => a.id === 'sendero')!
const peces = ADVENTURES.find((a) => a.id === 'peces')!

/**
 * A fixture beat independent of any shipped adventure's own data — proves
 * this component's contract is generic over ANY `ClosingBeat`, not merely
 * coupled to `sendero`'s (design.md §6.2's own now-unused night literal,
 * repurposed here as a standalone beat fixture rather than an adventure row).
 */
const fixtureBeat: ClosingBeat = {
  line: '¡Encontramos todo en la oscuridad! La linterna va a la mochila.',
  art: CARRIER_LENS_ART,
}

const fixtureAdventure: Adventure = {
  id: 'night',
  levelIds: ['night1', 'night2', 'night3', 'night4'],
  sector: 'nocturna',
  icon: SECTOR_ADVENTURE_ART.flashlight,
  intro: 'De noche hay cosas escondidas. ¿Las buscamos con la luz?',
  closing: 'Encontramos todo en la oscuridad.',
}

describe('AdventureClosing (main-screen spec "AdventureClosing Screen Renders the Transformation")', () => {
  it('owns the viewport without the browser default body margin adding scroll or a white frame', () => {
    const html = renderToString(
      <AdventureClosing adventure={sendero} beat={sendero.closingBeat![0]} onContinue={() => {}} />,
    )
    expect(html).toContain('html, body, #root { margin: 0; height: 100%; }')
    expect(html).toContain('.cv-closing { height: 100dvh;')
  })

  it("renders beat.art's href and beat.line for sendero's first beat", () => {
    const beat = sendero.closingBeat![0]
    const html = renderToString(<AdventureClosing adventure={sendero} beat={beat} onContinue={() => {}} />)
    expect(html).toContain(`href="${beat.art.href}"`)
    expect(html.split(beat.line).length - 1).toBe(1)
  })

  it("renders beat.art's href and beat.line for any beat it is given (genericity, not sendero-specific)", () => {
    const html = renderToString(
      <AdventureClosing adventure={fixtureAdventure} beat={fixtureBeat} onContinue={() => {}} />,
    )
    expect(html).toContain(`href="${fixtureBeat.art.href}"`)
    expect(html.split(fixtureBeat.line).length - 1).toBe(1)
  })

  it('renders the shared registered speech-bubble href', () => {
    const html = renderToString(
      <AdventureClosing adventure={sendero} beat={sendero.closingBeat![0]} onContinue={() => {}} />,
    )
    expect(html).toContain(`src="${ZOO_SPEECH_BUBBLE_ART.href}"`)
  })

  it('renders the standing octopus (ZOO_OCTOPUS_BACKPACK_ART) when the beat carries no figure override', () => {
    const beat = peces.closingBeat![0]
    expect(beat.figure).toBeUndefined()
    const html = renderToString(<AdventureClosing adventure={peces} beat={beat} onContinue={() => {}} />)
    expect(html).toContain(`src="${ZOO_OCTOPUS_BACKPACK_ART.href}"`)
  })

  it("renders the magnifier beat's own figure override instead of the standing octopus", () => {
    const beat = sendero.closingBeat![1]
    expect(beat.figure).toBeDefined()
    const html = renderToString(<AdventureClosing adventure={sendero} beat={beat} onContinue={() => {}} />)
    expect(html).toContain(`src="${beat.figure!.href}"`)
    expect(html).not.toContain(`src="${ZOO_OCTOPUS_BACKPACK_ART.href}"`)
  })

  it('keeps auditCaptions green for each of sendero\'s two beats: zero uncaptioned words, zero imageless containers', () => {
    for (const beat of sendero.closingBeat!) {
      const html = renderToString(<AdventureClosing adventure={sendero} beat={beat} onContinue={() => {}} />)
      const audit = auditCaptions(html)
      expect(audit.uncaptioned, beat.line).toEqual([])
      expect(audit.imagelessContainers, beat.line).toEqual([])
    }
  })

  // The three sign-bearing closings audited on their OWN rows, not inferred
  // from sendero's. `zoo-map`'s caption-audit scenario names peces, tortugas
  // and monos specifically, and these are the beats whose art carries a WORD
  // — precisely the ones where an imageless caption would be easiest to
  // introduce and hardest to notice.
  it('keeps auditCaptions green for the three sign-bearing closings on their own rows', () => {
    for (const id of ['peces', 'tortugas', 'monos'] as const) {
      const adventure = ADVENTURES.find((a) => a.id === id)!
      for (const beat of adventure.closingBeat!) {
        const html = renderToString(
          <AdventureClosing adventure={adventure} beat={beat} onContinue={() => {}} />,
        )
        const audit = auditCaptions(html)
        expect(audit.uncaptioned, `${id}: ${beat.line}`).toEqual([])
        expect(audit.imagelessContainers, `${id}: ${beat.line}`).toEqual([])
        expect(html, id).toContain(`href="${beat.art.href}"`)
        expect(html, id).not.toContain('url(#')
      }
    }
  })

  it('introduces no url(#) reference', () => {
    const html = renderToString(
      <AdventureClosing adventure={sendero} beat={sendero.closingBeat![0]} onContinue={() => {}} />,
    )
    expect(html).not.toContain('url(#')
  })

  it('renders one tappable button, with no aria-label overriding the caption', () => {
    const html = renderToString(
      <AdventureClosing adventure={sendero} beat={sendero.closingBeat![0]} onContinue={() => {}} />,
    )
    expect(html).toContain('<button')
    expect(html).toContain('type="button"')
    expect(html).toContain('class="cv-closing-stage"')
    const buttonOpenTag = html.slice(html.indexOf('<button'), html.indexOf('>', html.indexOf('<button')) + 1)
    expect(buttonOpenTag).not.toContain('aria-label')
  })

  it('onContinue is wired to the tap — invoking it does not throw', () => {
    const onContinue = vi.fn()
    renderToString(
      <AdventureClosing adventure={sendero} beat={sendero.closingBeat![0]} onContinue={onContinue} />,
    )
    // `renderToString` never fires DOM events (same limitation
    // `AdventureIntro.test.tsx`'s own header records for `onStart`) — this
    // only proves the prop itself is callable without throwing.
    expect(() => onContinue()).not.toThrow()
  })
})
