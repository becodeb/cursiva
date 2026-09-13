// AdventureIntro SSR tests (main-screen spec: "Narrative Entry Screen
// Content"). Node environment, no DOM: `renderToString` on the HTML string,
// the same convention every other detective-mode/zoo-map screen test uses.
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import AdventureIntro from './AdventureIntro'
import { auditCaptions } from '../detective/captionAudit'
import { ZOO_ANIMAL_ART, ZOO_OCTOPUS_BACKPACK_ART, ZOO_SPEECH_BUBBLE_ART } from '../detective/assets'
import { ADVENTURES } from '../zoo/adventures'

const adventure = ADVENTURES[0] // the duck

describe('AdventureIntro (main-screen spec "Narrative Entry Screen Content")', () => {
  it('renders the three registered hrefs: backpack octopus, speech bubble, duck', () => {
    const html = renderToString(<AdventureIntro adventure={adventure} onStart={() => {}} />)
    expect(html).toContain(`src="${ZOO_OCTOPUS_BACKPACK_ART.href}"`)
    expect(html).toContain(`src="${ZOO_SPEECH_BUBBLE_ART.href}"`)
    expect(html).toContain(`href="${ZOO_ANIMAL_ART[adventure.animal].href}"`)
  })

  it('renders the intro line exactly once', () => {
    const html = renderToString(<AdventureIntro adventure={adventure} onStart={() => {}} />)
    const occurrences = html.split(adventure.intro).length - 1
    expect(occurrences).toBe(1)
  })

  it('keeps auditCaptions green: zero uncaptioned words, zero imageless containers', () => {
    const html = renderToString(<AdventureIntro adventure={adventure} onStart={() => {}} />)
    const audit = auditCaptions(html)
    expect(audit.uncaptioned).toEqual([])
    expect(audit.imagelessContainers).toEqual([])
  })

  it('introduces no url(#) reference', () => {
    const html = renderToString(<AdventureIntro adventure={adventure} onStart={() => {}} />)
    expect(html).not.toContain('url(#')
  })

  it('renders one tappable button, with no aria-label overriding the caption', () => {
    // renderToString never fires DOM events, so `onStart` itself cannot be
    // exercised here (the same limitation LevelPlay.test.tsx's own header
    // records for onFrame/onRelease) — this asserts the STRUCTURE that
    // wires the tap: one `<button type="button">` wrapping everything, and
    // no `aria-label` shadowing the caption that already names it.
    const html = renderToString(<AdventureIntro adventure={adventure} onStart={() => {}} />)
    expect(html).toContain('<button')
    expect(html).toContain('type="button"')
    expect(html).toContain('class="cv-intro-stage"')
    const buttonOpenTag = html.slice(html.indexOf('<button'), html.indexOf('>', html.indexOf('<button')) + 1)
    expect(buttonOpenTag).not.toContain('aria-label')
  })

  it('the audit assertion can go red: a hand-built row with the phrase outside cv-captioned', () => {
    // Same proof captionAudit.test.tsx's own suite uses: a licensed
    // container that never earns its image is what the audit is FOR.
    const brokenHtml = `<span class="cv-captioned"><span class="cv-caption">${adventure.intro}</span></span>`
    const audit = auditCaptions(brokenHtml)
    expect(audit.uncaptioned).toEqual([adventure.intro])
    expect(audit.imagelessContainers).toEqual(['cv-captioned'])
  })
})

describe("AdventureIntro — row C's sheep and llama entries render their own animal and line (main-screen spec)", () => {
  const sheep = ADVENTURES[1]
  const llama = ADVENTURES[2]

  it("the sheep adventure's entry shows ZOO_ANIMAL_ART.oveja's href and its own intro text", () => {
    const html = renderToString(<AdventureIntro adventure={sheep} onStart={() => {}} />)
    expect(html).toContain(`href="${ZOO_ANIMAL_ART.oveja.href}"`)
    expect(html.split(sheep.intro).length - 1).toBe(1)
  })

  it("the llama adventure's entry shows ZOO_ANIMAL_ART.llama's href and its own intro text", () => {
    const html = renderToString(<AdventureIntro adventure={llama} onStart={() => {}} />)
    expect(html).toContain(`href="${ZOO_ANIMAL_ART.llama.href}"`)
    expect(html.split(llama.intro).length - 1).toBe(1)
  })

  it('keeps auditCaptions clean for both new entries', () => {
    for (const a of [sheep, llama]) {
      const html = renderToString(<AdventureIntro adventure={a} onStart={() => {}} />)
      const audit = auditCaptions(html)
      expect(audit.uncaptioned, a.id).toEqual([])
      expect(audit.imagelessContainers, a.id).toEqual([])
    }
  })
})
