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
import { CLUE_ART, type AnimalId } from '../detective/assets'
import { auditCaptions } from '../detective/captionAudit'
import { clueKindsOf, DETECTIVE_CASES } from '../detective/cases'
import Deduction, {
  DEDUCTION_CSS,
  DeductionView,
  initialDeductionState,
  lineupWidthClass,
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

  it("shows the case's OWN clue kinds as marker-style chips (T21 follow-up: no PISTAS word, no lightbulb — docs/18 D19)", () => {
    const html = renderToString(
      <DeductionView kase={kase} state={initialDeductionState()} onPick={noop} onExit={noop} />,
    )
    const chips = html.match(/class(Name)?="cv-deduction-chip"/g) ?? []
    expect(chips.length).toBe(clueKindsOf(kase).length)
    for (const kind of clueKindsOf(kase)) {
      expect(html).toContain(CLUE_ART[kind].art.earned.href)
      expect(html).not.toContain(CLUE_ART[kind].art.drained.href)
    }
    expect(textOf(html)).not.toContain('PISTAS')
    expect(html).not.toContain('<aside')
  })

  it("a dismissed distractor drains and drops; its discriminating clue shows in Pulpito's OWN bubble instead of a second icon", () => {
    const distractor = Object.keys(kase.ruledOutBy)[0] as AnimalId
    const clueKind = kase.ruledOutBy[distractor]!
    const state: DeductionState = { dismissed: [distractor], closed: false }
    const html = renderToString(<DeductionView kase={kase} state={state} onPick={noop} onExit={noop} />)
    expect(html).toContain('opacity:0.25')
    expect(html).toContain('translateY(24px)')
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

describe('the lineup grows into the sheet (defect fix: three small animals in a large empty page)', () => {
  /** The declaration body of a rule, e.g. the text between the braces of
   * `.cv-captioned > svg { … }`. Returns every match, because the responsive
   * rules are deliberately restated inside media queries.
   *
   * [T21] Anchored to the START OF A SELECTOR (only whitespace, or nothing,
   * since the previous rule's `{`/`}`/`;` or a `,` in a selector list, or
   * the very start of the string), not merely to the selector text itself:
   * `.cv-deduction-bubble .cv-caption { … }` (the deduction screen's OWN
   * Pulpito bubble, T21) legitimately contains the bare `.cv-caption { … }`
   * text as a SUBSTRING once its own leading `.cv-deduction-bubble ` scope
   * is stripped by an un-anchored search — anchoring here is what tells "a
   * second, differently-scoped rule" apart from "the bare selector matched
   * twice", while still matching an INDENTED restatement inside a
   * `@media` block (the anchor allows the whitespace between the block's
   * own `{` and the indented selector), and one preceded by its own doc
   * comment closing (most declarations in this file carry one). */
  const bodies = (selector: string): string[] => {
    const escaped = selector.replace(/[.*+?^$()|[\]\\]/g, '\\$&')
    return [
      ...DEDUCTION_CSS.matchAll(
        new RegExp(`(?<=(?:^|[{};,]|\\*/)\\s*)${escaped}\\s*\\{([^}]*)\\}`, 'g'),
      ),
    ].map((m) => m[1])
  }

  it('names the option count in the markup, because CSS cannot count children', () => {
    expect(lineupWidthClass(3)).toBe('cv-lineup-figures cv-lineup-figures-3')
    expect(lineupWidthClass(4)).toBe('cv-lineup-figures cv-lineup-figures-4')
    // The shared class is always present, so the unsuffixed rule keeps
    // carrying the conservative cap for a count nobody wrote a rule for.
    expect(lineupWidthClass(7)).toContain('cv-lineup-figures ')
  })

  for (const [name, kase] of CASES) {
    it(`the ${name} lineup renders its own width class, so the cap matches the count`, () => {
      const html = renderToString(
        <DeductionView kase={kase} state={initialDeductionState()} onPick={noop} onExit={noop} />,
      )
      expect(html).toContain(lineupWidthClass(kase.options.length))
    })
  }

  it('sizes the picture from the viewport, never from one hardcoded px value', () => {
    // The defect: a fixed 180px animal in a 1280x900 page left ~350px of
    // empty paper above the lineup and ~300px below it.
    const svg = bodies('.cv-captioned > svg')
    expect(svg.length).toBe(1)
    expect(svg[0]).toContain('var(--cv-animal)')
    expect(svg[0], 'the aspect ratio must follow the height, not be pinned').toContain(
      'width: auto',
    )
    expect(svg[0]).not.toMatch(/height:\s*\d+px/)
  })

  it('drives that size through the SAME viewport-height breakpoints LevelPlay already uses', () => {
    // `.pistas-word` in LevelPlay's LAYOUT_CSS steps at exactly these two.
    expect(DEDUCTION_CSS).toContain('@media (max-height: 820px)')
    expect(DEDUCTION_CSS).toContain('@media (max-height: 520px)')
    // Every declaration of the property answers BOTH axes: a px vertical
    // budget, and a 100vw term so a row of animals cannot outgrow its sheet.
    const declarations = [...DEDUCTION_CSS.matchAll(/--cv-animal:\s*([^;]+);/g)].map((m) => m[1])
    // [T21 follow-up] Three tiers now (default, 820px, 520px), not four: the
    // 420px landscape-phone tier merged into 520px's own smaller numbers once
    // .cv-deduction-content's bottom padding (reserved for Pulpito's own
    // corner stage) already shrank the DEFAULT tier well below what the old
    // four-tier ladder needed.
    expect(declarations.length).toBeGreaterThanOrEqual(3)
    for (const value of declarations) {
      expect(value, `"${value}" must cap on height`).toMatch(/min\(\s*\d+px/)
      expect(value, `"${value}" must cap on width`).toContain('100vw')
    }
  })

  it('gives a three-option lineup a wider cap than the conservative default', () => {
    // Four animals in a row run out of sheet much sooner than three, and the
    // divisor is the sum of their aspect ratios — so the two caps cannot be
    // the same expression. Compared declaration by declaration, in source
    // order, which is breakpoint order.
    const declared = (selector: string): string[] =>
      bodies(selector)
        .map((body) => /--cv-animal:\s*([^;]+);/.exec(body)?.[1])
        .filter((v): v is string => v !== undefined)
    const three = declared('.cv-lineup-figures-3')
    const fallback = declared('.cv-lineup-figures')
    expect(three.length).toBe(fallback.length)
    expect(three.length).toBeGreaterThanOrEqual(3)
    for (const [i, value] of three.entries()) {
      expect(value, `breakpoint ${i} must not reuse the four-up cap`).not.toBe(fallback[i])
      // The three-up row subtracts less chrome and divides by a smaller sum
      // of aspect ratios, which is the whole reason the class exists.
      const divisor = (expr: string): number => Number(/\/\s*([\d.]+)\)/.exec(expr)?.[1])
      expect(divisor(value)).toBeLessThan(divisor(fallback[i]!))
    }
  })

  it('derives the caption from the same property, so a word can never outgrow its picture', () => {
    // Sized independently, the caption became the widest thing in the slot on
    // a narrow sheet ("GALLINA" under a 110px hen) and wrapped a row that the
    // pictures still fitted in.
    const caption = bodies('.cv-caption')
    expect(caption.length).toBe(1)
    expect(caption[0]).toContain('var(--cv-animal)')
    // ...and it is still the uppercase-by-paint rule, not literal capitals.
    expect(caption[0]).toContain('text-transform: uppercase')
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
    const lineup = html.slice(html.indexOf('cv-lineup-figures'))
    expect(lineup).not.toContain('boxShadow')
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
