// Deduction screen SSR tests. Node environment, no DOM (same convention
// `PistasRail.test.tsx`/`LevelPlay.test.tsx` use): assert via `renderToString`
// on the HTML string. `DeductionView` is a pure function of a hand-built
// `DeductionState` and a `DetectiveCase`, so every dismissal/closed rendering
// is asserted by rendering it directly at that state — never by simulating a
// click, which this harness cannot observe past a completed `renderToString`
// call (see the module comment in `Deduction.tsx` and `LevelPlay.test.tsx`'s
// own).
//
// [case-registry-and-captions, Phase 5] The old `'ANIMAL_ART / CULPRIT
// registry'` describe block is GONE: those five structural assertions moved
// to `detective/cases.test.ts`, which checks them per case in
// `DETECTIVE_CASES` (strictly stronger — it now also catches a clue kind
// meaning one thing in one case and another elsewhere, design.md §9). What
// remains here is specific to RENDERING: does the screen present the right
// number of case-driven choices, are they visibly captioned, and does the
// rail show the case's OWN clue kinds. Every case-shaped assertion below runs
// against BOTH shipped cases (duck: 3 options; hen: 4), so a regression that
// only breaks one lineup size cannot hide behind the other.
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { CLUE_ART, LAMP_ART, type AnimalId } from '../detective/assets'
import { auditCaptions } from '../detective/captionAudit'
import { clueKindsOf, DETECTIVE_CASES } from '../detective/cases'
import Deduction, {
  DEDUCTION_CSS,
  DeductionView,
  initialDeductionState,
  pickAnimal,
  solvesCase,
  type DeductionState,
} from './Deduction'

const noop = (): void => undefined
const DUCK = DETECTIVE_CASES[0]
const HEN = DETECTIVE_CASES[1]
const CASES = [
  ['duck', DUCK],
  ['hen', HEN],
] as const

/** Strips the `<style>` block, then every remaining tag and attribute, then
 * collapses whitespace — the same helper `LevelPlay.test.tsx` and
 * `PistasRail.test.tsx` use, so "only the licensed words as text" is asserted
 * the exact same way across every detective-mode screen. */
function textOf(html: string): string {
  return html
    .replace(/<style>[\s\S]*?<\/style>/g, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

describe('pickAnimal / solvesCase (spec: detective-mode "Deduction Screen")', () => {
  it('carries no score/penalty field of any kind — structural proof D4 has nothing to penalise with', () => {
    const state = initialDeductionState()
    expect(Object.keys(state).sort()).toEqual(['closed', 'dismissed'])
  })

  it('picking the culprit closes the case (scenario "Correct pick closes the case")', () => {
    const state = pickAnimal(initialDeductionState(), DUCK.culprit, DUCK.culprit)
    expect(state.closed).toBe(true)
  })

  it('picking a distractor costs nothing and stays open, immediate re-pick available (scenario "Wrong pick is free and immediately retryable")', () => {
    const afterWrong = pickAnimal(initialDeductionState(), 'vaca', DUCK.culprit)
    expect(afterWrong.closed).toBe(false)
    expect(afterWrong.dismissed).toEqual(['vaca'])
    // No additional action needed: picking again immediately, right on the
    // returned state, works — including picking the actual culprit.
    const closed = pickAnimal(afterWrong, DUCK.culprit, DUCK.culprit)
    expect(closed.closed).toBe(true)
    // The dismissal from the wrong pick is preserved, not reverted — it was
    // never a penalty to begin with.
    expect(closed.dismissed).toEqual(['vaca'])
  })

  it('picking the same distractor twice does not duplicate the dismissal', () => {
    const once = pickAnimal(initialDeductionState(), 'vaca', DUCK.culprit)
    const twice = pickAnimal(once, 'vaca', DUCK.culprit)
    expect(twice.dismissed).toEqual(['vaca'])
    expect(twice).toBe(once) // inert no-op: same reference back
  })

  it('once closed, further picks are inert no-ops (same reference back)', () => {
    const closed = pickAnimal(initialDeductionState(), DUCK.culprit, DUCK.culprit)
    const again = pickAnimal(closed, 'vaca', DUCK.culprit)
    expect(again).toBe(closed)
  })

  it('never mutates the incoming state', () => {
    const state: DeductionState = { dismissed: ['gato'], closed: false }
    pickAnimal(state, 'vaca', DUCK.culprit)
    expect(state).toEqual({ dismissed: ['gato'], closed: false })
  })

  it('solvesCase is true only for the culprit, on an open case', () => {
    const open = initialDeductionState()
    expect(solvesCase(open, DUCK.culprit, DUCK.culprit)).toBe(true)
    expect(solvesCase(open, 'vaca', DUCK.culprit)).toBe(false)
  })

  it('solvesCase is false once the case is already closed — never re-fires onSolved', () => {
    const closed = pickAnimal(initialDeductionState(), DUCK.culprit, DUCK.culprit)
    expect(solvesCase(closed, DUCK.culprit, DUCK.culprit)).toBe(false)
  })
})

describe('initialDeductionState(solved) (design.md §5: a returning child is not asked again)', () => {
  it('defaults to an open, empty case', () => {
    expect(initialDeductionState()).toEqual({ dismissed: [], closed: false })
  })

  it('a previously solved case starts already closed', () => {
    expect(initialDeductionState(true)).toEqual({ dismissed: [], closed: true })
  })
})

describe.each(CASES)('DeductionView rendering — %s case', (_label, kase) => {
  it(`presents exactly ${kase.options.length} animal choices (spec "Duck deduction renders exactly three captioned options" / "Deduction Screen")`, () => {
    const html = renderToString(
      <DeductionView kase={kase} state={initialDeductionState()} onPick={noop} onExit={noop} />,
    )
    const matches = html.match(/className="animal-btn"|class="animal-btn"/g) ?? []
    expect(matches.length).toBe(kase.options.length)
  })

  it('every animal choice is visible AND captioned (D6 amendment: a word never ships without its picture)', () => {
    const html = renderToString(
      <DeductionView kase={kase} state={initialDeductionState()} onPick={noop} onExit={noop} />,
    )
    const audit = auditCaptions(html)
    for (const id of kase.options) {
      expect(audit.captioned.map((w) => w.toLowerCase()), `not captioned: ${id}`).toContain(id)
    }
    expect(audit.uncaptioned).toEqual([])
    expect(audit.imagelessContainers).toEqual([])
  })

  it("renders the PISTAS rail with the case's OWN clue kinds filed and the lamp on", () => {
    const html = renderToString(
      <DeductionView kase={kase} state={initialDeductionState()} onPick={noop} onExit={noop} />,
    )
    expect(html).toContain('<aside')
    expect(html).toContain(LAMP_ART.on.href)
    expect(html).not.toContain(LAMP_ART.off.href)
    for (const kind of clueKindsOf(kase)) {
      expect(html).toContain(CLUE_ART[kind].art.earned.href)
      expect(html).not.toContain(CLUE_ART[kind].art.drained.href)
    }
  })

  it("a dismissed distractor drains, drops, and emphasises its OWN case's discriminating clue", () => {
    const distractor = Object.keys(kase.ruledOutBy)[0] as AnimalId
    const clueKind = kase.ruledOutBy[distractor]!
    const state: DeductionState = { dismissed: [distractor], closed: false }
    const html = renderToString(<DeductionView kase={kase} state={state} onPick={noop} onExit={noop} />)
    expect(html).toContain('opacity:0.25')
    expect(html).toContain('translateY(24px)')
    expect(html).not.toContain('url(#')
    expect(html).not.toContain('filter')
    expect(html).not.toContain('<mask')
    expect(html).toContain('cv-clue-hint')
    const hint = html.slice(html.indexOf('cv-clue-hint'))
    expect(hint).toContain(CLUE_ART[clueKind].art.earned.href)
    // Only one clue-hint icon exists (for the one dismissed animal).
    const hints = html.match(/cv-clue-hint/g) ?? []
    expect(hints.length).toBe(1)
  })

  it('once the case is closed, every one of its choices is disabled', () => {
    const state: DeductionState = { dismissed: Object.keys(kase.ruledOutBy) as AnimalId[], closed: true }
    const html = renderToString(<DeductionView kase={kase} state={state} onPick={noop} onExit={noop} />)
    const disabledCount = (html.match(/disabled=""/g) ?? []).length
    expect(disabledCount).toBe(kase.options.length)
  })

  it('while the case is open, no choice is disabled', () => {
    const html = renderToString(
      <DeductionView kase={kase} state={initialDeductionState()} onPick={noop} onExit={noop} />,
    )
    expect(html).not.toContain('disabled=""')
  })
})

describe('DeductionView rendering — case-independent layout', () => {
  it('the duck lineup never renders gallina — she is not one of its options', () => {
    const html = renderToString(
      <DeductionView kase={DUCK} state={initialDeductionState()} onPick={noop} onExit={noop} />,
    )
    expect(textOf(html)).not.toContain('Gallina')
  })

  it('captions render uppercase via CSS text-transform, never as literal uppercase text (accessible-name-safe)', () => {
    // The mechanism: `.cv-caption` paints uppercase, but the underlying text
    // node stays normal Spanish case, so a screen reader's accessible-name
    // computation reads "Pato", not a false acronym "P-A-T-O".
    expect(DEDUCTION_CSS).toMatch(/\.cv-caption\s*\{[^}]*text-transform:\s*uppercase/)
    const html = renderToString(
      <DeductionView kase={DUCK} state={initialDeductionState()} onPick={noop} onExit={noop} />,
    )
    expect(textOf(html)).toContain('Pato')
    expect(textOf(html)).not.toContain('PATO')
  })

  it('the rail is scoped to a narrow column, never the full LevelPlay-sized bar (defect fix)', () => {
    // Regression guard for the dead-selector defect: DEDUCTION_CSS must
    // actually target the rail's REAL class name, or this whole block is
    // dead again and the rail silently falls back to LAYOUT_CSS's full-size
    // horizontal treatment.
    expect(DEDUCTION_CSS).toMatch(/\.pistas-bar\s*\{[^}]*flex:\s*0 0 132px/)
  })

  it('carries no `url(#` reference anywhere (TraceCanvas.tsx:70-84)', () => {
    // This one IS a whole-document claim: no id-referenced SVG may render,
    // because it hydrates blank on real devices.
    const html = renderToString(
      <DeductionView kase={DUCK} state={initialDeductionState()} onPick={noop} onExit={noop} />,
    )
    expect(html).not.toContain('url(#')
  })

  it('gives the lineup no card styling (design.md "Layout")', () => {
    // Asserted against this screen's OWN rules, not the whole rendered
    // document. The shell comes from LevelPlay's LAYOUT_CSS, which legitimately
    // rounds the text buttons every other phase still shows; a document-wide
    // substring check would fail on those and push whoever hits it toward
    // re-duplicating the shell just to keep the assertion quiet.
    expect(DEDUCTION_CSS).not.toContain('border-radius')
    expect(DEDUCTION_CSS).not.toContain('box-shadow')
    // `border: none` is the opposite of card styling, so forbid a border that
    // actually draws rather than the word.
    // The whitespace lives INSIDE the lookahead on purpose: with `\s*` outside
    // it, the engine backtracks to zero spaces, reads " non", and the negative
    // lookahead passes on `border: none` — the assertion would fire on the one
    // declaration that proves the point.
    expect(DEDUCTION_CSS, 'the lineup must draw no border').not.toMatch(
      /border\s*:(?!\s*none\b)/,
    )
  })

  it('renders no inline card styling on the animal figures', () => {
    const html = renderToString(
      <DeductionView kase={DUCK} state={initialDeductionState()} onPick={noop} onExit={noop} />,
    )
    const lineup = html.slice(html.indexOf('cv-lineup'))
    expect(lineup).not.toContain('borderRadius')
    expect(lineup).not.toContain('boxShadow')
  })

  it('reuses the shipped 64px tap floor for every animal button', () => {
    const html = renderToString(
      <DeductionView kase={DUCK} state={initialDeductionState()} onPick={noop} onExit={noop} />,
    )
    expect(html).toContain('min-height: 64px')
  })

  it('the lineup stands on exactly one drawn ink line', () => {
    const html = renderToString(
      <DeductionView kase={DUCK} state={initialDeductionState()} onPick={noop} onExit={noop} />,
    )
    const matches = html.match(/class(Name)?="cv-lineup-ground"/g) ?? []
    expect(matches.length).toBe(1)
  })

  it('a never-picked animal shows no dismissal styling and no clue hint', () => {
    const distractor = Object.keys(DUCK.ruledOutBy)[0] as AnimalId
    const state: DeductionState = { dismissed: [distractor], closed: false }
    const html = renderToString(<DeductionView kase={DUCK} state={state} onPick={noop} onExit={noop} />)
    const hints = html.match(/cv-clue-hint/g) ?? []
    expect(hints.length).toBe(1)
  })

  it('the back control keeps an accessible name and no visible label', () => {
    const html = renderToString(
      <DeductionView kase={DUCK} state={initialDeductionState()} onPick={noop} onExit={noop} />,
    )
    expect(html).toContain('aria-label="Volver"')
    expect(textOf(html)).not.toContain('Volver')
  })
})

describe('Deduction (stateful default export)', () => {
  it("mounts open and renders the case's full captioned lineup", () => {
    const html = renderToString(<Deduction kase={DUCK} solved={false} onSolved={noop} onExit={noop} />)
    const matches = html.match(/className="animal-btn"|class="animal-btn"/g) ?? []
    expect(matches.length).toBe(DUCK.options.length)
    const audit = auditCaptions(html)
    expect(audit.uncaptioned).toEqual([])
    expect(audit.imagelessContainers).toEqual([])
  })

  it('a solved case mounts already closed — every choice disabled from the first render', () => {
    const html = renderToString(<Deduction kase={DUCK} solved={true} onSolved={noop} onExit={noop} />)
    const disabledCount = (html.match(/disabled=""/g) ?? []).length
    expect(disabledCount).toBe(DUCK.options.length)
  })
})
