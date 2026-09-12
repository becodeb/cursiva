// Deduction screen SSR tests. Node environment, no DOM (same convention
// `PistasRail.test.tsx`/`LevelPlay.test.tsx` use): assert via `renderToString`
// on the HTML string. `DeductionView` is a pure function of a hand-built
// `DeductionState`, so every dismissal/closed rendering is asserted by
// rendering it directly at that state — never by simulating a click, which
// this harness cannot observe past a completed `renderToString` call (see
// the module comment in `Deduction.tsx` and `LevelPlay.test.tsx`'s own).
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import {
  ANIMAL_ART,
  CLUE_ART,
  CULPRIT,
  LAMP_ART,
  type AnimalId,
  type ClueKind,
} from '../detective/assets'
import { auditCaptions } from '../detective/captionAudit'
import Deduction, {
  DEDUCTION_CSS,
  DeductionView,
  initialDeductionState,
  pickAnimal,
  type DeductionState,
} from './Deduction'

const noop = (): void => undefined

/** Strips the `<style>` block, then every remaining tag and attribute, then
 * collapses whitespace — the same helper `LevelPlay.test.tsx` and
 * `PistasRail.test.tsx` use, so "only PISTAS as text" is asserted the exact
 * same way across every detective-mode screen. */
function textOf(html: string): string {
  return html
    .replace(/<style>[\s\S]*?<\/style>/g, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

describe('ANIMAL_ART / CULPRIT registry (structural properties, not restatements)', () => {
  // These assert the SHAPE of the deduction puzzle, not the literal current
  // values — an edit that made the puzzle unsolvable or ambiguous must fail
  // this suite, per the parent's instruction.
  it('exactly one animal has ruledOutBy: null, and it is CULPRIT', () => {
    const culprits = (Object.keys(ANIMAL_ART) as AnimalId[]).filter(
      (id) => ANIMAL_ART[id].ruledOutBy === null,
    )
    expect(culprits).toEqual([CULPRIT])
  })

  it('the three distractors are ruled out by pairwise DISTINCT clue kinds', () => {
    const distractorKinds = (Object.keys(ANIMAL_ART) as AnimalId[])
      .filter((id) => id !== CULPRIT)
      .map((id) => ANIMAL_ART[id].ruledOutBy)
    expect(distractorKinds).toHaveLength(3)
    for (const kind of distractorKinds) expect(kind).not.toBeNull()
    expect(new Set(distractorKinds).size).toBe(3)
  })

  it('no clue kind rules out more than one animal', () => {
    const counts = new Map<ClueKind, number>()
    for (const id of Object.keys(ANIMAL_ART) as AnimalId[]) {
      const kind = ANIMAL_ART[id].ruledOutBy
      if (kind === null) continue
      counts.set(kind, (counts.get(kind) ?? 0) + 1)
    }
    for (const [, count] of counts) expect(count).toBe(1)
  })
})

describe('pickAnimal / DeductionState (spec: detective-mode "Deduction Screen")', () => {
  it('carries no score/penalty field of any kind — structural proof D4 has nothing to penalise with', () => {
    const state = initialDeductionState()
    expect(Object.keys(state).sort()).toEqual(['closed', 'dismissed'])
  })

  it('picking the hen closes the case (scenario "Correct pick closes the case")', () => {
    const state = pickAnimal(initialDeductionState(), CULPRIT)
    expect(state.closed).toBe(true)
  })

  it('picking a distractor costs nothing and stays open, immediate re-pick available (scenario "Wrong pick is free and immediately retryable")', () => {
    const afterWrong = pickAnimal(initialDeductionState(), 'pato')
    expect(afterWrong.closed).toBe(false)
    expect(afterWrong.dismissed).toEqual(['pato'])
    // No additional action needed: picking again immediately, right on the
    // returned state, works — including picking the actual culprit.
    const closed = pickAnimal(afterWrong, CULPRIT)
    expect(closed.closed).toBe(true)
    // The dismissal from the wrong pick is preserved, not reverted — it was
    // never a penalty to begin with.
    expect(closed.dismissed).toEqual(['pato'])
  })

  it('picking the same distractor twice does not duplicate the dismissal', () => {
    const once = pickAnimal(initialDeductionState(), 'vaca')
    const twice = pickAnimal(once, 'vaca')
    expect(twice.dismissed).toEqual(['vaca'])
    expect(twice).toBe(once) // inert no-op: same reference back
  })

  it('once closed, further picks are inert no-ops (same reference back)', () => {
    const closed = pickAnimal(initialDeductionState(), CULPRIT)
    const again = pickAnimal(closed, 'pato')
    expect(again).toBe(closed)
  })

  it('never mutates the incoming state', () => {
    const state: DeductionState = { dismissed: ['gato'], closed: false }
    pickAnimal(state, 'vaca')
    expect(state).toEqual({ dismissed: ['gato'], closed: false })
  })
})

describe('DeductionView rendering (spec scenario "All four clues collected reaches the deduction screen")', () => {
  it('presents exactly four animal choices', () => {
    const html = renderToString(
      <DeductionView state={initialDeductionState()} onPick={noop} onBack={noop} />,
    )
    const matches = html.match(/className="animal-btn"|class="animal-btn"/g) ?? []
    expect(matches.length).toBe(4)
  })

  it('every animal choice is visible AND captioned (D6 amendment: a word never ships without its picture)', () => {
    const html = renderToString(
      <DeductionView state={initialDeductionState()} onPick={noop} onBack={noop} />,
    )
    const visible = textOf(html)
    for (const name of ['Gallina', 'Pato', 'Vaca', 'Gato']) {
      expect(visible, `missing visible caption: ${name}`).toContain(name)
    }
    const audit = auditCaptions(html)
    for (const name of ['Gallina', 'Pato', 'Vaca', 'Gato']) {
      expect(audit.captioned, `not captioned: ${name}`).toContain(name)
    }
    expect(audit.uncaptioned).toEqual([])
    expect(audit.imagelessContainers).toEqual([])
  })

  it('every visible word on the deduction screen carries its own image (captionAudit invariant)', () => {
    const html = renderToString(
      <DeductionView state={initialDeductionState()} onPick={noop} onBack={noop} />,
    )
    const audit = auditCaptions(html)
    expect(audit.uncaptioned).toEqual([])
    expect(audit.imagelessContainers).toEqual([])
  })

  it('carries no `url(#` reference anywhere (TraceCanvas.tsx:70-84)', () => {
    // This one IS a whole-document claim: no id-referenced SVG may render,
    // because it hydrates blank on real devices.
    const html = renderToString(
      <DeductionView state={initialDeductionState()} onPick={noop} onBack={noop} />,
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
      <DeductionView state={initialDeductionState()} onPick={noop} onBack={noop} />,
    )
    const lineup = html.slice(html.indexOf('cv-lineup'))
    expect(lineup).not.toContain('borderRadius')
    expect(lineup).not.toContain('boxShadow')
  })

  it('reuses the shipped 64px tap floor for every animal button', () => {
    const html = renderToString(
      <DeductionView state={initialDeductionState()} onPick={noop} onBack={noop} />,
    )
    expect(html).toContain('min-height: 64px')
  })

  it('the lineup stands on exactly one drawn ink line', () => {
    const html = renderToString(
      <DeductionView state={initialDeductionState()} onPick={noop} onBack={noop} />,
    )
    const matches = html.match(/class(Name)?="cv-lineup-ground"/g) ?? []
    expect(matches.length).toBe(1)
  })

  it('renders the PISTAS rail with all four slots filed and the lamp on', () => {
    const html = renderToString(
      <DeductionView state={initialDeductionState()} onPick={noop} onBack={noop} />,
    )
    expect(html).toContain('<aside')
    // The lit lamp art must be present — every clue is already filed by the
    // time this screen is reachable at all.
    expect(html).toContain(LAMP_ART.on.href)
    expect(html).not.toContain(LAMP_ART.off.href)
    // ...and all four slots show their EARNED clue, never a drained one.
    for (const kind of ['droplet', 'corn', 'footprint', 'feather'] as const) {
      expect(html).toContain(CLUE_ART[kind].art.earned.href)
      expect(html).not.toContain(CLUE_ART[kind].art.drained.href)
    }
  })

  it('a dismissed distractor drains (reduced opacity) and drops (a transform), never a filter/mask/url()', () => {
    const state: DeductionState = { dismissed: ['pato'], closed: false }
    const html = renderToString(<DeductionView state={state} onPick={noop} onBack={noop} />)
    expect(html).toContain('opacity:0.25')
    expect(html).toContain('translateY(24px)')
    expect(html).not.toContain('url(#')
    expect(html).not.toContain('filter')
    expect(html).not.toContain('<mask')
  })

  it("emphasises the dismissed animal's discriminating clue in the trail's own earned colour", () => {
    const state: DeductionState = { dismissed: ['pato'], closed: false }
    const html = renderToString(<DeductionView state={state} onPick={noop} onBack={noop} />)
    // pato is ruled out by the footprint clue. The hint shows that clue's
    // EARNED art — the same picture the child collected on trail 3, which is
    // what makes the elimination legible without a word of text.
    expect(html).toContain('cv-clue-hint')
    const hint = html.slice(html.indexOf('cv-clue-hint'))
    expect(hint).toContain(CLUE_ART.footprint.art.earned.href)
    // The earned COLOUR token is still PRINT ('#000000' — the greyscale-only
    // clue, palette.ts), and `build_art.py` recolours the earned raster to
    // exactly that value, so the picture and the token cannot disagree.
    expect(CLUE_ART.footprint.earned).toBe('#000000')
  })

  it('a never-picked animal shows no dismissal styling and no clue hint', () => {
    const state: DeductionState = { dismissed: ['pato'], closed: false }
    const html = renderToString(<DeductionView state={state} onPick={noop} onBack={noop} />)
    // Only one clue-hint icon exists (for the one dismissed animal).
    const hints = html.match(/cv-clue-hint/g) ?? []
    expect(hints.length).toBe(1)
  })

  it('once the case is closed, every animal button is disabled', () => {
    const state: DeductionState = { dismissed: ['pato', 'vaca'], closed: true }
    const html = renderToString(<DeductionView state={state} onPick={noop} onBack={noop} />)
    // React SSR renders a `true` boolean attribute as `disabled=""`; the
    // back button never receives the prop, so every occurrence here is one
    // of the four animal buttons.
    const disabledCount = (html.match(/disabled=""/g) ?? []).length
    expect(disabledCount).toBe(4)
  })

  it('while the case is open, no animal button is disabled', () => {
    const html = renderToString(
      <DeductionView state={initialDeductionState()} onPick={noop} onBack={noop} />,
    )
    // `disabled=""` is the SSR rendering of the boolean attribute; the CSS
    // block's own `.animal-btn[disabled]` selector also contains the bare
    // word "disabled", so the attribute form is what actually distinguishes
    // a disabled button from the stylesheet merely knowing how to style one.
    expect(html).not.toContain('disabled=""')
  })

  it('the back control keeps an accessible name and no visible label', () => {
    const html = renderToString(
      <DeductionView state={initialDeductionState()} onPick={noop} onBack={noop} />,
    )
    expect(html).toContain('aria-label="Volver"')
    expect(textOf(html)).not.toContain('Volver')
  })
})

describe('Deduction (stateful default export)', () => {
  it('mounts at the initial state and renders the four captioned choices', () => {
    const html = renderToString(<Deduction onBack={noop} />)
    const matches = html.match(/className="animal-btn"|class="animal-btn"/g) ?? []
    expect(matches.length).toBe(4)
    const audit = auditCaptions(html)
    expect(audit.uncaptioned).toEqual([])
    expect(audit.imagelessContainers).toEqual([])
  })
})
