// DetectiveNotebook SSR tests (`odd/tasks/prewriting-stage-completion.md`
// T23). Node environment, no DOM — `renderToString` plus string assertions,
// the same convention every other screen test in this repo uses.
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import DetectiveNotebook from './DetectiveNotebook'
import { auditCaptions } from '../detective/captionAudit'
import { ANIMAL_SILHOUETTE_ART, ZOO_ANIMAL_ART } from '../detective/assets'
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
  it('renders a dialog with a close button that carries no visible caption of its own', () => {
    const html = render()
    expect(html).toContain('role="dialog"')
    expect(html).toContain('aria-label="Libreta del detective"')
    expect(html).toContain('aria-label="Cerrar la libreta"')
    expect(html).toContain('class="cv-notebook-close"')
  })

  it('shows every real zoo animal as a missing silhouette on a fresh install', () => {
    const html = render()
    expect(html).toContain(`href="${ANIMAL_SILHOUETTE_ART.pato.href}"`)
    expect(html).not.toContain(`href="${ZOO_ANIMAL_ART.pato.href}"`)
    // The "?" caption for a missing animal.
    expect(html).toContain('class="cv-caption">?</span>')
  })

  it('shows a rescued animal in colour with its own spot caption, disables no other rescued button', () => {
    const html = render(filed('duck-trail4'))
    expect(html).toContain(`href="${ZOO_ANIMAL_ART.pato.href}"`)
    expect(html).toContain('class="cv-caption">en su laguna</span>')
  })

  it('disables the button for a missing animal, and not for a rescued one', () => {
    const html = render(filed('duck-trail4'))
    // The pato cell's own button has no `disabled` attribute; every other
    // animal's cell does. Rather than parse button boundaries by hand, this
    // counts: nine animals remain missing out of ten real zoo animals.
    const disabledCount = (html.match(/<button[^>]*disabled/g) ?? []).length
    expect(disabledCount).toBe(9)
  })

  it('dims a not-yet-earned tool and shows a genuinely earned one at full strength', () => {
    const htmlNone = render({})
    expect(htmlNone).toContain('cv-notebook-tool-pending')
    expect(htmlNone).not.toContain('class="cv-notebook-tool"')

    const htmlSheep = render(filed('sheep-hill4'))
    expect(htmlSheep).toContain('class="cv-notebook-tool"')
  })

  it('keeps auditCaptions green: zero uncaptioned words, zero imageless containers', () => {
    const html = render(filed('duck-trail4', 'sheep-hill4'))
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
