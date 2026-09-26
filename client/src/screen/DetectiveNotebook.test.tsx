// DetectiveNotebook SSR tests (`odd/tasks/prewriting-stage-completion.md`
// T23, follow-up polish pass). Node environment, no DOM — `renderToString`
// plus string assertions, the same convention every other screen test in
// this repo uses.
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import DetectiveNotebook from './DetectiveNotebook'
import { auditCaptions } from '../detective/captionAudit'
import { ANIMAL_SILHOUETTE_ART, CARRIER_LENS_ART, ZOO_ANIMAL_ART } from '../detective/assets'
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

  it('renders the wordless title (the lupa + the notebook pad icon) and a marker-style close button', () => {
    const html = render()
    expect(html).toContain('class="cv-notebook-title"')
    expect(html).toContain(`src="${CARRIER_LENS_ART.href}"`)
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

  it('shows every real zoo animal as a missing silhouette on a fresh install', () => {
    const html = render()
    expect(html).toContain(`src="${ANIMAL_SILHOUETTE_ART.pato!.href}"`)
    expect(html).not.toContain(`src="${ZOO_ANIMAL_ART.pato.href}"`)
    expect(html).toContain('class="cv-caption">?</span>')
  })

  it('draws the monkey as a PawPrintIcon while missing (its own art is still a placeholder block), never the black-square silhouette', () => {
    const html = render()
    expect(html).not.toContain('src="/art/animal-mono-silhouette.png"')
    expect(html).toContain('data-cv-picture="true"')
  })

  it('shows the monkey in colour (the placeholder art, unmasked) once actually rescued — a separate, already-disclosed gap', () => {
    const html = render(filed('monkey4'))
    expect(html).toContain(`src="${ZOO_ANIMAL_ART.mono.href}"`)
    expect(html).not.toContain('data-cv-picture="true"')
  })

  it('shows a rescued animal in colour with its own spot caption', () => {
    const html = render(filed('duck-trail4'))
    expect(html).toContain(`src="${ZOO_ANIMAL_ART.pato.href}"`)
    expect(html).toContain('class="cv-caption">en su laguna</span>')
  })

  it('disables the button for a missing animal, and not for a rescued one', () => {
    const html = render(filed('duck-trail4'))
    // Nine animals remain missing out of the ten real zoo animals.
    const disabledCount = (html.match(/<button[^>]*disabled/g) ?? []).length
    expect(disabledCount).toBe(9)
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
