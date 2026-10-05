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
import { CARRIER_LENS_ART, CLUE_ART, type AnimalId } from '../detective/assets'
import { auditCaptions } from '../detective/captionAudit'
import { clueKindsOf, DETECTIVE_CASES, lineupOrder, type DeductionForm } from '../detective/cases'
import Deduction, {
  DEDUCTION_CSS,
  DEDUCTION_INSTRUCTION,
  DEDUCTION_OPENING_LINE,
  DEDUCTION_SOLVED_LINE,
  deductionClueArt,
  deductionQuestion,
  deductionScreenLayout,
  deductionSpokenLine,
  deductionSpokenOpening,
  DeductionView,
  initialDeductionState,
  pickAnimal,
  revealDurationMs,
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

  it("shows the case's OWN clue kinds as big pinned photos on the evidence board (T46; still no PISTAS word, no lightbulb — docs/18 D19)", () => {
    const html = renderToString(
      <DeductionView kase={kase} state={initialDeductionState()} onPick={noop} onExit={noop} />,
    )
    const tiles = html.match(/class(Name)?="cv-evidence-tile"/g) ?? []
    expect(tiles.length).toBe(clueKindsOf(kase).length)
    expect(html).toContain('class="cv-evidence-board"')
    expect(html).toContain(CARRIER_LENS_ART.href)
    for (const kind of clueKindsOf(kase)) {
      expect(html).toContain(CLUE_ART[kind].art.earned.href)
      expect(html).not.toContain(CLUE_ART[kind].art.drained.href)
    }
    expect(textOf(html)).not.toContain('PISTAS')
    expect(html).not.toContain('<aside')
  })

  it("a dismissed distractor drains and steps back inside its own card; no second clue icon beside it", () => {
    const distractor = Object.keys(kase.ruledOutBy)[0] as AnimalId
    const clueKind = kase.ruledOutBy[distractor]!
    const state: DeductionState = { dismissed: [distractor], closed: false }
    const html = renderToString(<DeductionView kase={kase} state={state} onPick={noop} onExit={noop} />)
    expect(html).toContain('opacity:0.3')
    // [T46] A step BACK (scale), never a drop: a translate pushed the card
    // out of its own layout rectangle, onto whatever sat below it.
    expect(html).toContain('transform:scale(0.9)')
    expect(html).not.toContain('translateY(24px)')
    expect(html).not.toContain('url(#')
    // `<filter`, not the bare word "filter" (matching `<mask` below): this
    // screen reuses `LevelPlay.tsx`'s own `LAYOUT_CSS` verbatim for its
    // `.cv-play` shell, which now legitimately carries a plain CSS `filter`
    // PROPERTY (`filter: brightness(0)`, T6's animal silhouette, LevelPlay's
    // own header comment on that rule) — never an SVG `<filter>` PRIMITIVE,
    // which is what this assertion actually exists to ban.
    expect(html).not.toContain('<filter')
    expect(html).not.toContain('<mask')
    // [T21 follow-up] `cv-clue-hint` — a small icon floating under the
    // dismissed animal's own caption, disconnected from any sentence — is
    // gone: the SAME clue art now shows inside Pulpito's own bubble,
    // beside the reason that rules the animal out (deductionHint).
    expect(html).not.toContain('cv-clue-hint')
    // The ruling clue is still on screen: on the evidence board, earned.
    expect(html).toContain(CLUE_ART[clueKind].art.earned.href)
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

// [T27, `odd/tasks/prewriting-stage-completion.md`, `docs/19` §2.3/§3 monos
// row; T49, `docs/23` D4] `mono` was a `PLACEHOLDER_ZOO_ANIMALS` entry that
// drew `PawPrintIcon` before the reveal. With the real monkey drawn, it is an
// ordinary option: its own silhouette, then its colour art once solved.
describe('DeductionView — the mono option (the real monkey since T49)', () => {
  const MONKEYS = DETECTIVE_CASES.find((k) => k.id === 'monkeys')!

  it('renders mono as its own silhouette before the reveal, like every other option', () => {
    const html = renderToString(
      <DeductionView kase={MONKEYS} state={initialDeductionState()} onPick={noop} onExit={noop} />,
    )
    expect(html).toContain('/art/animal-mono-silhouette.png')
    expect(html).not.toContain('/art/animal-mono.png')
    expect(html).not.toContain('class="cv-option-paw"')
  })

  it('still passes the captioned-art audit', () => {
    const html = renderToString(
      <DeductionView kase={MONKEYS} state={initialDeductionState()} onPick={noop} onExit={noop} />,
    )
    const audit = auditCaptions(html)
    expect(audit.captioned.map((w) => w.toLowerCase())).toContain('mono')
    expect(audit.uncaptioned).toEqual([])
    expect(audit.imagelessContainers).toEqual([])
  })

  it('once mono is revealed as the culprit, it shows the real monkey in colour', () => {
    const state: DeductionState = { dismissed: ['erizo', 'abeja'], closed: true }
    const html = renderToString(
      <DeductionView kase={MONKEYS} state={state} onPick={noop} onExit={noop} />,
    )
    expect(html).toContain('/art/animal-mono.png')
  })

  it('erizo and abeja are ordinary silhouettes throughout', () => {
    const html = renderToString(
      <DeductionView kase={MONKEYS} state={initialDeductionState()} onPick={noop} onExit={noop} />,
    )
    // [T49] The erizo's silhouette is the uncurling hedgehog with spines.
    expect(html).toContain('/art/hedgehog-uncurling-silhouette.png')
    expect(html).toContain('/art/sector-bee-silhouette.png')
  })
})

// [T46] The layout is decided in px by `screen/deductionLayout.ts` (tested
// there for every case at every viewport); these tests prove the markup
// actually paints those rectangles, and that the screen tells the child
// what to do.
describe('DeductionView — evidence first, then an obvious choice (T46)', () => {
  const px = (n: number): string => `${n}px`
  /** The markup without its `<style>` block (whose selectors name every
   *  class this screen can ever carry). */
  const markup = (html: string): string => html.replace(/<style>[\s\S]*?<\/style>/g, '')

  it('positions every card, the board and the prompt at the layout rectangles', () => {
    for (const viewport of [
      { w: 1024, h: 768 },
      { w: 768, h: 1024 },
      { w: 844, h: 390 },
    ]) {
      for (const kase of DETECTIVE_CASES) {
        const layout = deductionScreenLayout(kase, viewport)
        const html = renderToString(
          <DeductionView kase={kase} state={initialDeductionState()} onPick={noop} onExit={noop} viewport={viewport} />,
        )
        const label = `${kase.id} at ${viewport.w}x${viewport.h}`
        for (const card of layout.cards) {
          expect(html, label).toContain(`left:${px(card.x)};top:${px(card.y)};width:${px(card.w)};height:${px(card.h)}`)
        }
        const b = layout.board
        expect(html, label).toContain(`left:${px(b.x)};top:${px(b.y)};width:${px(b.w)};height:${px(b.h)}`)
        expect(html, label).toContain(`--cv-caption-font:${layout.captionFont}px`)
      }
    }
  })

  it('every case passes the captioned-art audit, prompt pill included', () => {
    for (const kase of DETECTIVE_CASES) {
      const audit = auditCaptions(
        renderToString(<DeductionView kase={kase} state={initialDeductionState()} onPick={noop} onExit={noop} />),
      )
      expect(audit.uncaptioned, kase.id).toEqual([])
      expect(audit.imagelessContainers, kase.id).toEqual([])
      expect(audit.captioned, kase.id).toContain(DEDUCTION_INSTRUCTION[kase.form].label)
    }
  })

  it('shows every collected clue of every case on the board, the night case its own pictures', () => {
    for (const kase of DETECTIVE_CASES) {
      const html = renderToString(
        <DeductionView kase={kase} state={initialDeductionState()} onPick={noop} onExit={noop} />,
      )
      const art = deductionClueArt(kase)
      expect((html.match(/class="cv-evidence-tile"/g) ?? []).length, kase.id).toBe(art.length)
      for (const a of art) expect(html, kase.id).toContain(a.href)
    }
  })

  it('a comparison draws its "=" badge; no other kind does', () => {
    for (const kase of DETECTIVE_CASES) {
      const html = renderToString(
        <DeductionView kase={kase} state={initialDeductionState()} onPick={noop} onExit={noop} />,
      )
      expect(markup(html).includes('cv-deduction-relation'), kase.id).toBe(kase.form === 'comparison')
    }
  })

  it('the prompt pill names the action per kind, beside a drawn pointing hand', () => {
    const labels: Record<DeductionForm, string> = {
      'new-silhouettes': 'Tocá quién fue',
      'rescued-silhouettes': 'Tocá quién fue',
      signs: 'Tocá su cartel',
      comparison: 'Tocá la que es igual',
    }
    for (const kase of DETECTIVE_CASES) {
      expect(DEDUCTION_INSTRUCTION[kase.form].label).toBe(labels[kase.form])
      const html = renderToString(
        <DeductionView kase={kase} state={initialDeductionState()} onPick={noop} onExit={noop} />,
      )
      expect(html).toMatch(/<p class="cv-deduction-prompt"[^>]*><svg[^>]*data-cv-picture="true"/)
      expect(textOf(html)).toContain(labels[kase.form])
    }
  })

  it('once the case is closed the prompt pill goes, keeping its place', () => {
    const closed = markup(
      renderToString(<DeductionView kase={DUCK} state={{ dismissed: [], closed: true }} onPick={noop} onExit={noop} />),
    )
    expect(closed).toContain('class="cv-deduction-prompt cv-deduction-prompt--done"')
    expect(DEDUCTION_CSS).toMatch(/\.cv-deduction-prompt--done\s*\{\s*visibility:\s*hidden/)
  })

  it('cards are pressable buttons with a lip that squashes, captions one line', () => {
    expect(DEDUCTION_CSS).toMatch(/\.animal-btn\s*\{[^}]*border-bottom-width:\s*9px/)
    expect(DEDUCTION_CSS).toMatch(/\.animal-btn:not\(\[disabled\]\):active\s*\{[^}]*border-bottom-width:\s*4px/)
    expect(DEDUCTION_CSS).toMatch(/\.cv-caption\s*\{[^}]*white-space:\s*nowrap/)
    expect(DEDUCTION_CSS).toMatch(/\.cv-caption\s*\{[^}]*font-size:\s*var\(--cv-caption-font\)/)
  })

  it('while revealing: the arrival animates and the cards ignore taps; settled by default', () => {
    const open = markup(renderToString(<DeductionView kase={DUCK} state={initialDeductionState()} onPick={noop} onExit={noop} />))
    expect(open).toContain('cv-deduction--revealed')
    expect(open).not.toContain('cv-deduction--revealing')
    const revealing = renderToString(
      <DeductionView kase={DUCK} state={initialDeductionState()} onPick={noop} onExit={noop} revealing />,
    )
    expect(revealing).toContain('cv-deduction--revealing')
    expect(DEDUCTION_CSS).toMatch(/\.cv-deduction--revealing \.cv-lineup-slot\s*\{\s*pointer-events:\s*none/)
    expect(DEDUCTION_CSS).toMatch(/\.cv-deduction--revealing \.cv-evidence-tile\s*\{[^}]*animation-delay:\s*var\(--cv-delay\)/)
    // The clues arrive one by one, in order.
    const delays = [...revealing.matchAll(/--cv-delay:([\d.]+)s/g)].map((m) => Number(m[1]))
    const clueDelays = delays.slice(0, deductionClueArt(DUCK).length)
    expect([...clueDelays].sort((a, b) => a - b)).toEqual(clueDelays)
    expect(new Set(clueDelays).size).toBe(clueDelays.length)
  })

  it('the arrival lasts longer with more clues, and stays short', () => {
    expect(revealDurationMs(4, 3)).toBeGreaterThan(revealDurationMs(1, 3))
    expect(revealDurationMs(4, 3)).toBeLessThanOrEqual(3000)
  })

  it('nudging: the open cards pulse and a hand sweeps across the open ones (never parks on the culprit); never on a closed case', () => {
    const nudge = markup(
      renderToString(
        <DeductionView kase={DUCK} state={{ dismissed: ['vaca'], closed: false }} onPick={noop} onExit={noop} nudging />,
      ),
    )
    expect(nudge).toContain('cv-deduction--nudge')
    expect(nudge).toContain('class="cv-deduction-hand"')
    const { cards } = deductionScreenLayout(DUCK, { w: 1024, h: 768 })
    // vaca is ruled out: the sweep runs from the first OPEN card to the last.
    const open = lineupOrder(DUCK)
      .map((id, i) => (id === 'vaca' ? -1 : i))
      .filter((i) => i >= 0)
    const dx = Number(/--cv-hand-dx:(-?[\d.]+)px/.exec(nudge)?.[1])
    expect(dx).toBeCloseTo(cards[open[open.length - 1]].x - cards[open[0]].x)
    expect(DEDUCTION_CSS).toMatch(/\.cv-deduction-hand\s*\{[^}]*cv-hand-sweep/)
    expect(DEDUCTION_CSS).toMatch(/\.cv-deduction--nudge \.cv-lineup-slot:not\(\.cv-lineup-slot--out\) \.animal-btn\s*\{[^}]*cv-card-pulse/)
    const closed = renderToString(
      <DeductionView kase={DUCK} state={{ dismissed: [], closed: true }} onPick={noop} onExit={noop} nudging />,
    )
    expect(closed).not.toContain('class="cv-deduction-hand"')
    const revealing = markup(
      renderToString(<DeductionView kase={DUCK} state={initialDeductionState()} onPick={noop} onExit={noop} nudging revealing />),
    )
    expect(revealing).not.toContain('cv-deduction--nudge')
  })
})

describe('card order and the solved hold (T46 follow-up)', () => {
  it('renders the options in the seeded lineup order, not the registry order (culprit first)', () => {
    for (const kase of DETECTIVE_CASES) {
      const text = textOf(
        renderToString(<DeductionView kase={kase} state={initialDeductionState()} onPick={noop} onExit={noop} />),
      )
      const positions = lineupOrder(kase).map((id) => text.indexOf(id[0].toUpperCase() + id.slice(1)))
      expect(positions.every((p) => p >= 0), kase.id).toBe(true)
      expect([...positions].sort((a, b) => a - b), kase.id).toEqual(positions)
    }
  })

  it('while holding the solved state, a full-screen tap target continues; not otherwise', () => {
    const closed = { dismissed: [], closed: true }
    const holding = renderToString(
      <DeductionView kase={DUCK} state={closed} onPick={noop} onExit={noop} holding onSkipHold={noop} />,
    )
    expect(holding).toContain('class="cv-celebrate-skip" aria-label="Continuar"')
    const settled = renderToString(<DeductionView kase={DUCK} state={closed} onPick={noop} onExit={noop} />)
    expect(settled).not.toContain('class="cv-celebrate-skip"')
  })
})

describe('the narrator reads the question and what to do (T46)', () => {
  it('opens with the question, then the per-kind instruction', () => {
    for (const kase of DETECTIVE_CASES) {
      const line = deductionSpokenOpening(kase)
      expect(line.startsWith(deductionQuestion(kase)), kase.id).toBe(true)
      expect(line.endsWith(DEDUCTION_INSTRUCTION[kase.form].spoken), kase.id).toBe(true)
    }
    expect(deductionQuestion(DUCK)).toBe(DEDUCTION_OPENING_LINE)
    expect(deductionSpokenOpening(DUCK)).toBe('¿Quién dejó todo esto? Mirá las pistas y tocá quién fue.')
  })

  it('every instruction says to look at the clues and to tap', () => {
    for (const { spoken } of Object.values(DEDUCTION_INSTRUCTION)) {
      expect(spoken).toMatch(/^Mirá la/)
      expect(spoken).toContain('tocá')
    }
  })

  it('after a wrong pick it says the reason; once solved, the solved line', () => {
    expect(deductionSpokenLine(DUCK, { dismissed: ['vaca'], closed: false })).toBe(DUCK.hint.vaca)
    expect(deductionSpokenLine(DUCK, { dismissed: ['vaca'], closed: true })).toBe(DEDUCTION_SOLVED_LINE.pato)
  })

  it('the speak button repeats the current spoken line', () => {
    const html = renderToString(<DeductionView kase={DUCK} state={initialDeductionState()} onPick={noop} onExit={noop} />)
    expect(html).toContain('aria-label="Escuchar"')
    expect(html).toContain('cv-deduction-speak')
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

  it('carries no `url(#` reference anywhere (TraceCanvas.tsx:70-84)', () => {
    // This one IS a whole-document claim: no id-referenced SVG may render,
    // because it hydrates blank on real devices.
    const html = renderToString(
      <DeductionView kase={DUCK} state={initialDeductionState()} onPick={noop} onExit={noop} />,
    )
    expect(html).not.toContain('url(#')
  })

  it('gives the lineup marker-style cards (docs/09 §1: paper fill, thick dark outline, no shadow — T21 follow-up)', () => {
    // [T21 follow-up, orchestrator screenshot review] This used to forbid
    // border/border-radius outright (the pre-docs/19 design.md "Layout"
    // rule) — the redesign deliberately gives every silhouette a marker-
    // style CARD, the SAME identity voice/SpeakButton.tsx/
    // voice/VoiceToggle.tsx/screen/ZooMap.tsx's HUD pills already carry.
    // What still never ships, on this screen or any other: a shadow.
    expect(DEDUCTION_CSS).not.toContain('box-shadow')
    expect(DEDUCTION_CSS).toMatch(/\.animal-btn\s*\{[^}]*border:\s*3px solid #1a1a1a/)
    expect(DEDUCTION_CSS).toMatch(/\.animal-btn\s*\{[^}]*border-radius:/)
    expect(DEDUCTION_CSS).toMatch(/\.animal-btn\s*\{[^}]*background:\s*#fdfcf7/)
  })

  it('renders no inline shadow styling on the animal figures (the border/radius now come from the card class, not inline)', () => {
    const html = renderToString(
      <DeductionView kase={DUCK} state={initialDeductionState()} onPick={noop} onExit={noop} />,
    )
    const lineup = html.slice(html.indexOf('cv-lineup-slot'))
    expect(html.indexOf('cv-lineup-slot')).toBeGreaterThan(0)
    expect(lineup).not.toContain('box-shadow')
  })

  it('reuses the shipped 64px tap floor for every animal button', () => {
    const html = renderToString(
      <DeductionView kase={DUCK} state={initialDeductionState()} onPick={noop} onExit={noop} />,
    )
    expect(html).toContain('min-height: 64px')
  })

  it('the back control keeps an accessible name and no visible label', () => {
    const html = renderToString(
      <DeductionView kase={DUCK} state={initialDeductionState()} onPick={noop} onExit={noop} />,
    )
    expect(html).toContain('aria-label="Volver"')
    expect(textOf(html)).not.toContain('Volver')
  })

  // [T21 follow-up] The first shipped version only carried `cv-btn-back`,
  // which LAYOUT_CSS (LevelPlay.tsx) only ever styles TOGETHER with the base
  // `cv-btn` class (`.cv-btn { border-radius: 18px; border: 3px solid
  // #1a1a1a; background: SHEET_PAPER; … }`, `.cv-btn-back { … }` only
  // overrides height/padding) — missing `cv-btn` left the button with no
  // marker styling at all, rendering as a bare default grey button (caught
  // by a screenshot, not by any test before this one).
  it('gives the back button the SAME marker style the level screen uses (cv-btn cv-btn-back together)', () => {
    const html = renderToString(
      <DeductionView kase={DUCK} state={initialDeductionState()} onPick={noop} onExit={noop} />,
    )
    expect(html).toMatch(/class(Name)?="cv-btn cv-btn-back"/)
  })

  it('renders the adventure backdrop full-screen behind everything, never a flat colour (docs/19 §4.1)', () => {
    const html = renderToString(
      <DeductionView kase={DUCK} state={initialDeductionState()} onPick={noop} onExit={noop} />,
    )
    expect(html).toContain('cv-deduction-backdrop')
    expect(html).toMatch(/<img[^>]*class(Name)?="cv-deduction-backdrop"[^>]*src="\/art\/sector-lagoon-background\.png"/)
  })

  it("stands Pulpito in a corner with his own speech bubble, reusing the SAME frame/bubble engine AdventureIntro.tsx uses", () => {
    const html = renderToString(
      <DeductionView kase={DUCK} state={initialDeductionState()} onPick={noop} onExit={noop} />,
    )
    expect(html).toContain('cv-deduction-frame')
    expect(html).toContain('cv-deduction-octopus')
    expect(html).toContain('cv-deduction-bubble')
    expect(html).toContain('cv-bubble-pop')
  })
})

// [T26, `odd/tasks/prewriting-stage-completion.md`, `docs/19` §2.3's THIRD
// form of deducing] The fish case's own lineup is the prólogo's three
// enclosure SIGNS, not animal silhouettes — `DetectiveCase.optionArt`
// overrides `Animal`'s default `silhouetteArtFor` lookup, which has no entry
// for `tortuga`/`mono` at all (they predate this widening) and would throw.
const FISH = DETECTIVE_CASES.find((k) => k.id === 'fish')!

describe('the fish case (T26): optionArt renders enclosure signs, never a silhouette', () => {
  it('an open case renders every option (sign-fish/sign-turtles/sign-monkeys), never ANIMAL_SILHOUETTE_ART hrefs', () => {
    const html = renderToString(
      <DeductionView kase={FISH} state={initialDeductionState()} onPick={noop} onExit={noop} />,
    )
    expect(html).toContain('/art/sign-fish.png')
    expect(html).toContain('/art/sign-turtles.png')
    expect(html).toContain('/art/sign-monkeys.png')
    // Not a `-silhouette.png` asset path anywhere (the CSS itself has a
    // comment mentioning the word "silhouette" in prose, so this checks the
    // actual asset href pattern rather than the raw text).
    expect(html).not.toContain('-silhouette.png')
  })

  it('the correct pick (pez) still reveals the real fish picture, exactly like every other case', () => {
    const html = renderToString(
      <DeductionView
        kase={FISH}
        state={{ dismissed: ['tortuga', 'mono'], closed: true }}
        onPick={noop}
        onExit={noop}
      />,
    )
    expect(html).toContain('/art/animal-pez.png')
    // The two dismissed signs still show as their own sign art, never a
    // silhouette or the wrong animal picture.
    expect(html).toContain('/art/sign-turtles.png')
    expect(html).toContain('/art/sign-monkeys.png')
  })

  it("mounts a full three-option captioned lineup, no uncaptioned or imageless container (same audit every other case passes)", () => {
    const html = renderToString(<Deduction kase={FISH} solved={false} onSolved={noop} onExit={noop} />)
    const matches = html.match(/className="animal-btn"|class="animal-btn"/g) ?? []
    expect(matches.length).toBe(FISH.options.length)
    const audit = auditCaptions(html)
    expect(audit.uncaptioned).toEqual([])
    expect(audit.imagelessContainers).toEqual([])
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
