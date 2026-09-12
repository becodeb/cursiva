// Caption audit tests (design unit 2, spec: detective-mode "Captioned Art
// Invariant"). Hand-built HTML strings for the first three rows —
// deliberately, so the audit itself is provably falsifiable
// (`openspec/changes/detective-mode/verify-report.md` records five
// assertions that shipped unable to fail; this suite is why `auditCaptions`
// does not repeat that mistake). Rows 2 and 3 are load-bearing: they prove
// the licence is CHECKED, not granted — naming a container in
// `CAPTION_CONTAINERS` is not enough to pass; it must itself carry an image.
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ANIMAL_ART } from './assets'
import { auditCaptions, CAPTION_CONTAINERS } from './captionAudit'
import CaptionedArt from './CaptionedArt'

describe('auditCaptions (spec: detective-mode "Captioned Art Invariant")', () => {
  it('a bare heading with no licensed container at all is uncaptioned', () => {
    const audit = auditCaptions('<h1>cursiva</h1>')
    expect(audit).toEqual({ captioned: [], uncaptioned: ['cursiva'], imagelessContainers: [] })
  })

  it('a cv-captioned container with NO image still fails — the licence is checked, not granted', () => {
    const html = '<span class="cv-captioned"><span class="cv-caption">pato</span></span>'
    const audit = auditCaptions(html)
    expect(audit).toEqual({
      captioned: [],
      uncaptioned: ['pato'],
      imagelessContainers: ['cv-captioned'],
    })
  })

  it('a pistas-bar container with NO image still fails — the licence is checked, not granted', () => {
    const html = '<aside class="pistas-bar"><div class="pistas-word">PISTAS</div></aside>'
    const audit = auditCaptions(html)
    expect(audit).toEqual({
      captioned: [],
      uncaptioned: ['PISTAS'],
      imagelessContainers: ['pistas-bar'],
    })
  })

  it('a real CaptionedArt render is fully captioned', () => {
    const html = renderToString(<CaptionedArt art={ANIMAL_ART.pato} label="pato" size={36} />)
    const audit = auditCaptions(html)
    expect(audit).toEqual({ captioned: ['pato'], uncaptioned: [], imagelessContainers: [] })
  })

  it('a container earns the licence the moment it also carries an image (row 2, repaired)', () => {
    // Same shape as the failing row 2, but with the image the licence
    // actually requires — proves the container is not doomed by its class
    // name alone; it is the IMAGE that flips the verdict.
    const html =
      '<span class="cv-captioned"><svg><image href="/art/animal-pato.png" x="0" y="0" width="10" height="10"></image></svg><span class="cv-caption">pato</span></span>'
    const audit = auditCaptions(html)
    expect(audit).toEqual({ captioned: ['pato'], uncaptioned: [], imagelessContainers: [] })
  })

  it('strips <style> blocks before auditing, matching every screen\'s own text-stripping convention', () => {
    const html = '<style>.x{content:"word"}</style><h1>real</h1>'
    const audit = auditCaptions(html)
    expect(audit.uncaptioned).toEqual(['real'])
  })

  it('CAPTION_CONTAINERS names exactly the two shipped licensed containers', () => {
    expect(CAPTION_CONTAINERS).toEqual(['cv-captioned', 'pistas-bar'])
  })

  it('an unrelated class name is not a licensed container, and its container is invisible to imagelessContainers', () => {
    const html = '<div class="cv-lineup-slot"><span>plain</span></div>'
    const audit = auditCaptions(html)
    // Not licensed at all, so there is no licence to fail — this is a
    // regular uncaptioned bare word, the same as row 1, never a false
    // "imageless container" report against a class nobody registered.
    expect(audit).toEqual({ captioned: [], uncaptioned: ['plain'], imagelessContainers: [] })
  })
})
