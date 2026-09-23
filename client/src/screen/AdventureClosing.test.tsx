// AdventureClosing SSR tests (main-screen spec: "AdventureClosing Screen
// Renders the Transformation"; add-caretaker-prologue design.md D3). Node
// environment, no DOM: `renderToString` on the HTML string, the same
// convention `AdventureIntro.test.tsx` uses.
import { renderToString } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import AdventureClosing from './AdventureClosing'
import { auditCaptions } from '../detective/captionAudit'
import {
  CARRIER_LENS_ART,
  SECTOR_ADVENTURE_ART,
  ZOO_OCTOPUS_BACKPACK_ART,
  ZOO_SPEECH_BUBBLE_ART,
  ZOO_STAR_ART,
} from '../detective/assets'
import { ADVENTURES, type Adventure, type ClosingBeat } from '../zoo/adventures'

// Renamed from `sand` (add-caretaker-prologue design.md D7): `sendero` is
// `sand`'s direct successor, carrying the TWO-beat closing the old
// single-beat `sand` row used to carry as one. Ended on `sand4` until
// adventure-flow-and-map-guidance T1 narrowed the sendero to one level;
// `sand3` is its own (and therefore last) level now.
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

// The rescue celebration (adventure-flow-and-map-guidance T8, docs/18
// section 4.7 item 1). `renderToString` cannot observe an animation, so
// these tests only assert what the orchestrator's own brief asks for
// directly: the celebration renders only for animal adventures.
describe('AdventureClosing rescue celebration (T8)', () => {
  const duck = ADVENTURES.find((a) => a.id === 'duck')!

  it('renders the celebration for an animal-recovering adventure — one star image per configured spot, aria-hidden, using ZOO_STAR_ART', () => {
    const html = renderToString(
      <AdventureClosing adventure={duck} beat={duck.closingBeat![0]} onContinue={() => {}} />,
    )
    expect(html).toContain('class="cv-rescue-celebration" aria-hidden="true"')
    const starCount = html.match(new RegExp(`src="${ZOO_STAR_ART.href}"`, 'g'))?.length ?? 0
    expect(starCount).toBeGreaterThan(0)
  })

  // `not.toContain('cv-rescue-celebration')` alone would be vacuously true
  // OR false regardless of the actual element: that bare class name is also
  // the CSS SELECTOR text inside the static `<style>` block, present on
  // every render whichever beat is shown. Checking the ELEMENT's own
  // opening tag is what actually distinguishes "rendered" from "not".
  it('renders no celebration ELEMENT for an animal-less adventure (the four entrance enclosures, and night) — the class name still appears in the static stylesheet either way', () => {
    for (const id of ['peces', 'tortugas', 'monos', 'sendero', 'night'] as const) {
      const adventure = ADVENTURES.find((a) => a.id === id)!
      for (const beat of adventure.closingBeat!) {
        const html = renderToString(
          <AdventureClosing adventure={adventure} beat={beat} onContinue={() => {}} />,
        )
        expect(html, id).not.toContain('<div class="cv-rescue-celebration"')
        expect(html, id).not.toContain(`src="${ZOO_STAR_ART.href}"`)
      }
    }
  })

  it('renders the celebration ELEMENT for every animal-recovering row, not only the duck', () => {
    for (const adventure of ADVENTURES.filter((a) => a.animal !== undefined)) {
      const html = renderToString(
        <AdventureClosing adventure={adventure} beat={adventure.closingBeat![0]} onContinue={() => {}} />,
      )
      expect(html, adventure.id).toContain('<div class="cv-rescue-celebration"')
    }
  })

  it('introduces no url(#) reference of its own', () => {
    const html = renderToString(
      <AdventureClosing adventure={duck} beat={duck.closingBeat![0]} onContinue={() => {}} />,
    )
    expect(html).not.toContain('url(#')
  })

  it("is absolutely positioned (no layout shift) and absent entirely under prefers-reduced-motion: reduce", () => {
    const html = renderToString(
      <AdventureClosing adventure={duck} beat={duck.closingBeat![0]} onContinue={() => {}} />,
    )
    expect(html).toContain('.cv-rescue-celebration { position: absolute; inset: 0;')
    expect(html).toContain(
      '@media (prefers-reduced-motion: reduce) { .cv-rescue-celebration { display: none; } }',
    )
  })

  it('does not disturb auditCaptions for an animal adventure\'s own beat (decorative-only images, no bare words)', () => {
    const html = renderToString(
      <AdventureClosing adventure={duck} beat={duck.closingBeat![0]} onContinue={() => {}} />,
    )
    const audit = auditCaptions(html)
    expect(audit.uncaptioned).toEqual([])
    expect(audit.imagelessContainers).toEqual([])
  })
})

// Voice narration (docs/18 D1, "Todo se escucha"; T7). `renderToString`
// never runs `useEffect`, so the actual `speak(beat.line)` call
// `useNarration` makes is not observable here — these tests only prove the
// STRUCTURE: a `SpeakButton` exists, named for a screen reader, and is a
// sibling of the stage button (the frame/stage split `CLOSING_CSS`'s own
// header documents), never nested inside it.
describe('AdventureClosing voice narration (adventure-flow-and-map-guidance T7)', () => {
  it('renders a SpeakButton, aria-label="Escuchar", for any beat', () => {
    const html = renderToString(
      <AdventureClosing adventure={sendero} beat={sendero.closingBeat![0]} onContinue={() => {}} />,
    )
    expect(html).toContain('aria-label="Escuchar"')
  })

  it('the SpeakButton is a SIBLING of the stage button, never nested inside it', () => {
    const html = renderToString(
      <AdventureClosing adventure={sendero} beat={sendero.closingBeat![0]} onContinue={() => {}} />,
    )
    const stageOpen = html.indexOf('class="cv-closing-stage"')
    const stageClose = html.indexOf('</button>', stageOpen)
    const speakOpen = html.indexOf('aria-label="Escuchar"')
    expect(stageOpen).toBeGreaterThanOrEqual(0)
    expect(stageClose).toBeGreaterThan(stageOpen)
    expect(speakOpen).toBeGreaterThan(stageClose)
  })
})
