// DetectiveNotebook SSR tests (`odd/tasks/prewriting-stage-completion.md`
// T23, follow-up polish pass). Node environment, no DOM — `renderToString`
// plus string assertions, the same convention every other screen test in
// this repo uses.
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import DetectiveNotebook from './DetectiveNotebook'
import { auditCaptions } from '../detective/captionAudit'
import { CARRIER_LENS_ART, ZOO_ANIMAL_ART } from '../detective/assets'
import { EMPTY_RECORD, type LevelRecord } from '../game/types'
import type { Records } from '../zoo/sectors'

function filed(...ids: readonly string[]): Records {
  const out: Record<string, LevelRecord> = {}
  for (const id of ids) out[id] = { ...EMPTY_RECORD, attempts: 1, approvals: 1 }
  return out
}

const render = (records: Records = {}) =>
  renderToString(<DetectiveNotebook records={records} onClose={() => {}} />)

describe('DetectiveNotebook', () => {
  it('renders a dialog, full-screen (position: fixed, never absolute — no green letterbox bands behind it)', () => {
    const html = render()
    expect(html).toContain('role="dialog"')
    expect(html).toContain('aria-label="Libreta del detective"')
    expect(html).toContain('.cv-notebook { position: fixed; inset: 0;')
  })

  it('renders the wordless title (the lupa + the notebook pad icon) and a paper close button', () => {
    const html = render()
    expect(html).toContain('class="cv-notebook-title"')
    expect(html).toContain(`data-art="${CARRIER_LENS_ART.href}"`)
    expect(html).toContain('aria-label="Cerrar la libreta"')
    expect(html).toContain('class="cv-notebook-close"')
  })

  it('draws the ruled/grid page texture with plain CSS gradients, never an SVG pattern/url(#…)', () => {
    const html = render()
    expect(html).toContain('repeating-linear-gradient')
    expect(html).not.toContain('url(#')
    expect(html).not.toContain('<pattern')
    expect(html).not.toContain('<mask')
    expect(html).not.toContain('<clipPath')
  })

  it('shows every real zoo animal as a bare outline on a fresh install: its shape and no face', () => {
    const body = bodyOf(render())
    expect((body.match(/data-cv-album-found="false"/g) ?? []).length).toBe(10)
    expect(body).not.toContain(`data-art="${ZOO_ANIMAL_ART.pato.href}"`)
    // No PNG, no white of an eye, no shadow: nothing that tells who it is.
    expect(body).not.toContain('src="/art/animal-')
    const pato = body.slice(body.indexOf('data-cv-album="pato"'))
    const card = pato.slice(0, pato.indexOf('</button>')).replace(/--[a-zA-Z0-9]+:[^;"]+;?/g, '')
    expect(card).not.toContain('#ffffff')
  })

  it('shows the live puppet once rescued, and only for the one rescued', () => {
    const body = bodyOf(render(filed('duck-trail4')))
    expect(body).toContain(`data-art="${ZOO_ANIMAL_ART.pato.href}"`)
    expect(body).toContain('data-puppet="pato"')
    expect((body.match(/data-cv-album-found="true"/g) ?? []).length).toBe(1)
    expect(body).not.toContain(`data-art="${ZOO_ANIMAL_ART.mono.href}"`)
  })

  it('has no word on a card, and every card can be tapped and heard', () => {
    const body = bodyOf(render(filed('duck-trail4')))
    expect(body).not.toContain('class="cv-caption"')
    expect(body).not.toMatch(/<button[^>]*disabled/)
  })

  it('puts the letter this child wrote beside its family, a real letter before a line', () => {
    const m = { key: 'm', strokes: [[[10, 10], [40, 50], [80, 20]]] } as const
    const line = { levelId: 'duck-trail4', w: 1, h: 0.3, strokes: [[[0, 0], [1, 0.3]]] } as const
    const withLetter = bodyOf(renderToString(<DetectiveNotebook records={filed('duck-trail4')} onClose={() => {}} writings={[m]} lines={{ duck: line }} />))
    expect(withLetter).toContain('data-cv-album-written="letter"')
    const onlyLine = bodyOf(renderToString(<DetectiveNotebook records={filed('duck-trail4')} onClose={() => {}} writings={[]} lines={{ duck: line }} />))
    expect(onlyLine).toContain('data-cv-album-written="line"')
    const nothing = bodyOf(renderToString(<DetectiveNotebook records={filed('duck-trail4')} onClose={() => {}} writings={[]} lines={{}} />))
    expect(nothing).not.toContain('data-cv-album-written')
  })

  it('never shows a keepsake for an animal not found yet', () => {
    const line = { levelId: 'duck-trail4', w: 1, h: 0.3, strokes: [[[0, 0], [1, 0.3]]] } as const
    const body = bodyOf(renderToString(<DetectiveNotebook records={{}} onClose={() => {}} writings={[]} lines={{ duck: line }} />))
    expect(body).not.toContain('data-cv-album-written')
  })

  it('dims a not-yet-earned tool and shows a genuinely earned one at full strength', () => {
    const htmlNone = render({})
    expect(htmlNone).toContain('cv-notebook-tool-pending')

    const htmlSheep = render(filed('sheep-hill4'))
    // The earned hat's own card carries the base class with no pending
    // modifier — five tool cards total, one of them earned. Matches the
    // exact class ATTRIBUTE string, not a bare substring, so the CSS
    // rule's own selector text (".cv-notebook-tool-pending { ... }") is
    // never miscounted as a sixth match.
    const pendingCount = (htmlSheep.match(/class="cv-notebook-card cv-notebook-tool-pending"/g) ?? []).length
    expect(pendingCount).toBe(4)
  })

  it('lays the animal grid out as 5 columns x 2 rows at landscape, 3 at portrait', () => {
    const html = render()
    // minmax(0, 1fr), never a bare 1fr — see NOTEBOOK_CSS's own header on
    // why a bare 1fr's content-based minimum caused a real grid blowout.
    expect(html).toContain('grid-template-columns: repeat(5, minmax(0, 1fr))')
    expect(html).toContain('grid-template-rows: repeat(2, minmax(0, 1fr))')
    expect(html).toContain('@media (orientation: portrait)')
    expect(html).toContain('grid-template-columns: repeat(3, minmax(0, 1fr))')
  })

  it('keeps auditCaptions green: zero uncaptioned words, zero imageless containers', () => {
    const html = render(filed('duck-trail4', 'sheep-hill4'))
    const audit = auditCaptions(html)
    expect(audit.uncaptioned).toEqual([])
    expect(audit.imagelessContainers).toEqual([])
  })

  it('keeps auditCaptions green on a fresh install too, including the monkey\'s drawn paw print', () => {
    const html = render()
    const audit = auditCaptions(html)
    expect(audit.uncaptioned).toEqual([])
    expect(audit.imagelessContainers).toEqual([])
  })

  it('introduces no url(#) reference', () => {
    const html = render()
    expect(html).not.toContain('url(#')
    expect(html).not.toContain('<mask')
    expect(html).not.toContain('<clipPath')
    expect(html).not.toContain('<pattern')
  })
})

// T31 (`odd/tasks/prewriting-stage-completion.md`, notebook discoverability):
// the first-ever open highlights the animal that just arrived.
/** The BODY markup only (after the `<style>` block closes) — the stylesheet
 *  itself always mentions the bare `.cv-notebook-card--highlight` SELECTOR
 *  (twice: the rule and its reduced-motion override), so a raw whole-HTML
 *  substring check can never tell "no card carries the class" apart from
 *  "some card does" the way it can for every other class in this file. */
function bodyOf(html: string): string {
  const closeStyle = html.indexOf('</style>')
  return closeStyle >= 0 ? html.slice(closeStyle + '</style>'.length) : html
}

describe('DetectiveNotebook highlightId (T31)', () => {
  it('renders no highlighted card at all when highlightId is absent (every existing render stays byte-identical)', () => {
    const html = renderToString(<DetectiveNotebook records={filed('duck-trail4')} onClose={() => {}} />)
    expect(bodyOf(html)).not.toContain('cv-notebook-card--highlight')
  })

  it('renders no highlighted card when highlightId is null (the "already discovered" case)', () => {
    const html = renderToString(
      <DetectiveNotebook records={filed('duck-trail4')} onClose={() => {}} highlightId={null} />,
    )
    expect(bodyOf(html)).not.toContain('cv-notebook-card--highlight')
  })

  it('adds the highlight class to exactly the matching animal\'s own card, and no other', () => {
    const html = renderToString(
      <DetectiveNotebook records={filed('duck-trail4')} onClose={() => {}} highlightId="pato" />,
    )
    const body = bodyOf(html)
    const occurrences = body.split('cv-notebook-card--highlight').length - 1
    expect(occurrences).toBe(1)
    // The highlighted card is pato's own — its aria-label (right after the
    // class attribute, within the same opening tag) names it.
    const highlightIndex = body.indexOf('cv-notebook-card--highlight')
    const labelAfter = body.indexOf('aria-label="pato', highlightIndex)
    const nextButton = body.indexOf('<button', highlightIndex + 1)
    expect(labelAfter).toBeGreaterThanOrEqual(0)
    expect(nextButton === -1 || labelAfter < nextButton).toBe(true)
  })

  it('renders no highlighted card for an animal id that is not currently in the notebook grid (defensive: never throws, never matches nothing on purpose)', () => {
    const html = renderToString(
      <DetectiveNotebook records={filed('duck-trail4')} onClose={() => {}} highlightId={'gato' as never} />,
    )
    expect(bodyOf(html)).not.toContain('cv-notebook-card--highlight')
  })

  it('carries a reduced-motion override, and the animation is not infinite (settles rather than looping forever)', () => {
    const html = renderToString(
      <DetectiveNotebook records={filed('duck-trail4')} onClose={() => {}} highlightId="pato" />,
    )
    expect(html).toContain('.cv-notebook-card--highlight { animation: none;')
    expect(html).not.toContain('cv-notebook-highlight-glow 900ms ease-in-out infinite')
  })
})
