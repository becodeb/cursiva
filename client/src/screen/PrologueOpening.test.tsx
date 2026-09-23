// PrologueOpening SSR tests (`prologue-opening` spec, design.md D1/D2/D8).
// Node environment, no DOM: `renderToString` on the HTML string, the same
// convention `AdventureIntro.test.tsx`/`AdventureClosing.test.tsx` use.
//
// Rendering at each `from` value stands in for "tap to advance": design.md
// D1's own rationale for keeping `from` on the props is that `{ onDone }`
// alone leaves this harness with no way to reach plate 2 or 3 at all (it
// cannot observe a re-render after `renderToString`, the same constraint
// `AdventureIntro.test.tsx`'s header records for `onStart`). The actual STEP
// logic (`advancePlate`, `0→1→2→null`) is exhaustively covered by
// `zoo/prologue.test.ts` already — this file proves the RENDER at each
// position, never the click-driven transition between them, which this
// harness has no way to simulate (no DOM, no test-renderer).
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import PrologueOpening, { prologueRoute } from './PrologueOpening'
import { auditCaptions } from '../detective/captionAudit'
import { PROLOGUE_PLATES } from '../zoo/prologue'

describe('PrologueOpening (prologue-opening spec "Three Plates Carry the docs/16 §4 Lines Verbatim, in Order")', () => {
  it('renders each of the three lines, verbatim, at its own from index', () => {
    for (let i = 0; i < PROLOGUE_PLATES.length; i++) {
      const html = renderToString(<PrologueOpening from={i} onDone={() => {}} />)
      expect(html.split(PROLOGUE_PLATES[i].line).length - 1, `plate ${i}`).toBe(1)
    }
  })

  it('every plate passes the caption audit: zero uncaptioned words, zero imageless containers', () => {
    for (let i = 0; i < PROLOGUE_PLATES.length; i++) {
      const html = renderToString(<PrologueOpening from={i} onDone={() => {}} />)
      const audit = auditCaptions(html)
      expect(audit.uncaptioned, `plate ${i}`).toEqual([])
      expect(audit.imagelessContainers, `plate ${i}`).toEqual([])
    }
  })

  it('introduces no url(#) reference on any plate', () => {
    for (let i = 0; i < PROLOGUE_PLATES.length; i++) {
      const html = renderToString(<PrologueOpening from={i} onDone={() => {}} />)
      expect(html, `plate ${i}`).not.toContain('url(#')
    }
  })

  it('an out-of-range from clamps into a representable plate rather than crashing', () => {
    expect(() => renderToString(<PrologueOpening from={99} onDone={() => {}} />)).not.toThrow()
    expect(() => renderToString(<PrologueOpening from={-5} onDone={() => {}} />)).not.toThrow()
    const html = renderToString(<PrologueOpening from={99} onDone={() => {}} />)
    expect(html.split(PROLOGUE_PLATES[PROLOGUE_PLATES.length - 1].line).length - 1).toBe(1)
  })
})

describe('PrologueOpening skip control (prologue-opening spec "A Skip Control Is Visible on Every Plate")', () => {
  it('renders a skip button as a SIBLING of the stage button, never nested inside it, on every plate', () => {
    for (let i = 0; i < PROLOGUE_PLATES.length; i++) {
      const html = renderToString(<PrologueOpening from={i} onDone={() => {}} />)
      expect(html, `plate ${i}`).toContain('class="cv-prologue-skip"')
      // Structural sibling proof: the stage `<button>` must CLOSE before the
      // skip `<button>` opens — a nested button would leave the skip button's
      // opening tag before the stage's closing tag (design.md D1/D8: a
      // descendant button is invalid HTML and would swallow the tap meant
      // for the stage underneath it).
      const stageOpen = html.indexOf('class="cv-prologue-stage"')
      const stageClose = html.indexOf('</button>', stageOpen)
      const skipOpen = html.indexOf('class="cv-prologue-skip"')
      expect(stageOpen, `plate ${i}`).toBeGreaterThanOrEqual(0)
      expect(stageClose, `plate ${i}`).toBeGreaterThan(stageOpen)
      expect(skipOpen, `plate ${i}`).toBeGreaterThan(stageClose)
    }
  })

  it('the skip control carries the "Ir al mapa" caption, image-backed', () => {
    const html = renderToString(<PrologueOpening from={0} onDone={() => {}} />)
    expect(html).toContain('Ir al mapa')
  })
})

// Voice narration (docs/18 D1, "Todo se escucha"; T7). `renderToString`
// never runs `useEffect`, so the actual `speak()` call `useNarration` makes
// is not observable here (the same limitation this file's own header
// records for `advancePlate`'s click-driven transition) — these tests only
// prove the STRUCTURE: a `SpeakButton` exists on every plate, named for a
// screen reader, and is a sibling of the stage button rather than nested
// inside it (the same invalid-HTML hazard the skip control's own test
// above already guards against).
describe('PrologueOpening voice narration (adventure-flow-and-map-guidance T7)', () => {
  it('renders a SpeakButton, aria-label="Escuchar", on every plate', () => {
    for (let i = 0; i < PROLOGUE_PLATES.length; i++) {
      const html = renderToString(<PrologueOpening from={i} onDone={() => {}} />)
      expect(html, `plate ${i}`).toContain('aria-label="Escuchar"')
    }
  })

  it('the SpeakButton is a SIBLING of the stage button, never nested inside it', () => {
    const html = renderToString(<PrologueOpening from={0} onDone={() => {}} />)
    const stageOpen = html.indexOf('class="cv-prologue-stage"')
    const stageClose = html.indexOf('</button>', stageOpen)
    const speakOpen = html.indexOf('aria-label="Escuchar"')
    expect(stageOpen).toBeGreaterThanOrEqual(0)
    expect(stageClose).toBeGreaterThan(stageOpen)
    expect(speakOpen).toBeGreaterThan(stageClose)
  })
})

describe('prologueRoute (prologue-opening spec "The Opening Is Reachable On Demand Through a Dev-Gated Route")', () => {
  it('?nivel=apertura resolves to from:0, only when dev is true', () => {
    expect(prologueRoute('?nivel=apertura', true)).toEqual({ at: 'prologue', from: 0 })
    expect(prologueRoute('?nivel=apertura', false)).toBeNull()
  })

  it('?nivel=apertura:<n> resolves to from:n, only when dev is true', () => {
    expect(prologueRoute('?nivel=apertura:2', true)).toEqual({ at: 'prologue', from: 2 })
    expect(prologueRoute('?nivel=apertura:2', false)).toBeNull()
  })

  it('a malformed suffix, or an unrelated ?nivel=, resolves to null rather than crashing', () => {
    expect(prologueRoute('?nivel=apertura:abc', true)).toBeNull()
    expect(prologueRoute('?nivel=apertura:-1', true)).toBeNull()
    expect(prologueRoute('?nivel=mapa', true)).toBeNull()
    expect(prologueRoute('', true)).toBeNull()
  })
})
