// The case registry's own structural guarantees (design.md §9 "Structural
// tests the registry replaces"; detective-mode spec "Case Registry Data
// Shape"). Pure data assertions, no DOM — iterating `DETECTIVE_CASES` rather
// than hand-picking one case, so a future third case is checked for free.
import { describe, expect, it } from 'vitest'
import { ANIMAL_SILHOUETTE_ART, SIGN_ART } from './assets'
import {
  DETECTIVE_CASES,
  clueKindsOf,
  nightCaseOptions,
  resolveCase,
  resolveMonkeysCase,
  resolveNightDiscards,
} from './cases'

describe("every case's culprit is among its own options and is ruled out by nothing", () => {
  for (const kase of DETECTIVE_CASES) {
    it(`${kase.id}: culprit is the only option absent from ruledOutBy or rescuedDistractors`, () => {
      expect(kase.options).toContain(kase.culprit)
      // [T25] `rescuedDistractors` exempts a distractor ruled out by
      // already being rescued (no clue behind that dismissal) from needing
      // a `ruledOutBy` verdict too — see that field's own header.
      const rescued = new Set(kase.rescuedDistractors ?? [])
      const unruled = kase.options.filter(
        (animal) => !(animal in kase.ruledOutBy) && !rescued.has(animal),
      )
      expect(unruled).toEqual([kase.culprit])
    })
  }
})

describe('every case rules out every non-culprit, non-rescued option, by pairwise DISTINCT clue kinds', () => {
  for (const kase of DETECTIVE_CASES) {
    it(`${kase.id}: distractors are ruled out by distinct kinds`, () => {
      const rescued = new Set(kase.rescuedDistractors ?? [])
      const distractors = kase.options.filter(
        (animal) => animal !== kase.culprit && !rescued.has(animal),
      )
      for (const animal of distractors) {
        expect(kase.ruledOutBy[animal], `${animal} has no verdict in ${kase.id}`).toBeDefined()
      }
      const verdicts = distractors.map((animal) => kase.ruledOutBy[animal])
      expect(new Set(verdicts).size, `${kase.id}: two distractors share a verdict`).toBe(
        verdicts.length,
      )
    })
  }
})

describe('no clue kind rules out more than one animal within a case', () => {
  for (const kase of DETECTIVE_CASES) {
    it(`${kase.id}: ruledOutBy values are pairwise distinct`, () => {
      const values = Object.values(kase.ruledOutBy)
      expect(new Set(values).size).toBe(values.length)
    })
  }
})

describe("every clue kind a case rules out is one its own trails actually carry", () => {
  for (const kase of DETECTIVE_CASES) {
    it(`${kase.id}: ruledOutBy values ⊆ clueKindsOf(kase)`, () => {
      const carried = new Set(clueKindsOf(kase))
      for (const kind of Object.values(kase.ruledOutBy)) {
        expect(carried.has(kind!), `${kind} is not among ${kase.id}'s own clues`).toBe(true)
      }
    })
  }
})

describe('webfoot and breadcrumb rule nobody out', () => {
  it('neither kind appears as a value in any case\'s ruledOutBy', () => {
    for (const kase of DETECTIVE_CASES) {
      const values = Object.values(kase.ruledOutBy)
      expect(values).not.toContain('webfoot')
      expect(values).not.toContain('breadcrumb')
    }
  })
})

// [T25, `odd/tasks/prewriting-stage-completion.md`] The night case's own
// discard slots, computed from progress rather than hardcoded (`docs/19`
// §2.3/§3.2: "¿El pato? No: el pato ya está en su laguna" — but only once
// the child has genuinely met the pato). `isRescued` here is a bare fake
// predicate, never `zoo/adventures.ts`'s real one: `resolveNightDiscards`
// is deliberately zoo-independent (its own header), so it is exercised the
// same way here.
const rescuedOnly = (rescued: readonly string[]) => (animal: string) => rescued.includes(animal)
const nightCase = DETECTIVE_CASES.find((k) => k.id === 'night')!

describe('resolveNightDiscards (docs/19 §2.3/§3.2: progress-computed, never a fixed guess)', () => {
  it('the ordinary path: both pato and oveja rescued picks exactly them, in priority order', () => {
    expect(resolveNightDiscards(rescuedOnly(['pato', 'oveja', 'llama']))).toEqual(['pato', 'oveja'])
  })

  it('skips an unrescued preferred candidate for the next one in priority order', () => {
    expect(resolveNightDiscards(rescuedOnly(['oveja', 'llama']))).toEqual(['oveja', 'llama'])
    expect(resolveNightDiscards(rescuedOnly(['llama']))).toEqual(['llama', 'vaca'])
  })

  it('falls back to vaca/gato — a plausible distractor — when nothing else is rescued yet', () => {
    expect(resolveNightDiscards(rescuedOnly([]))).toEqual(['vaca', 'gato'])
  })

  it('always returns two DISTINCT animals, for every subset of rescued candidates', () => {
    const candidates = ['pato', 'oveja', 'llama']
    // Every subset of the three real candidates (2^3 = 8), including empty.
    for (let mask = 0; mask < 8; mask++) {
      const rescued = candidates.filter((_, i) => (mask & (1 << i)) !== 0)
      const [a, b] = resolveNightDiscards(rescuedOnly(rescued))
      expect(a, `mask ${mask}`).not.toBe(b)
    }
  })
})

// [T26, `odd/tasks/prewriting-stage-completion.md`, `docs/19` §2.3's THIRD
// form of deducing: "los carteles de los recintos vacíos del prólogo"]
const fishCase = DETECTIVE_CASES.find((k) => k.id === 'fish')!

describe('the fish case (T26): the lineup is enclosure SIGNS, not animal silhouettes', () => {
  it('culprit is pez; tortuga/mono are exempted via rescuedDistractors, not ruledOutBy (no clue backs either dismissal)', () => {
    expect(fishCase.culprit).toBe('pez')
    expect(fishCase.options).toEqual(['pez', 'tortuga', 'mono'])
    expect(fishCase.ruledOutBy).toEqual({})
    expect(fishCase.rescuedDistractors).toEqual(['tortuga', 'mono'])
  })

  it('every non-culprit option has a hint, same invariant every other case satisfies', () => {
    for (const animal of fishCase.options) {
      if (animal === fishCase.culprit) continue
      expect(fishCase.hint[animal], animal).toBeDefined()
    }
  })

  it('optionArt overrides every option with its own enclosure sign — never an animal silhouette', () => {
    expect(fishCase.optionArt?.pez).toBe(SIGN_ART.fish)
    expect(fishCase.optionArt?.tortuga).toBe(SIGN_ART.turtles)
    expect(fishCase.optionArt?.mono).toBe(SIGN_ART.monkeys)
  })

  it('trailIds names only the case\'s own two pistas levels, not the collect levels past the deduction', () => {
    expect(fishCase.trailIds).toEqual(['f2-guirnalda', 'f2-agua2'])
  })

  it('clueKindsOf still derives two distinct clue kinds (bubble, droplet) from both pistas trails (optionArt does not touch clueArt)', () => {
    expect(fishCase.clueArt).toBeUndefined()
    expect(clueKindsOf(fishCase)).toEqual(['bubble', 'droplet'])
  })
})

// T29 (`odd/tasks/prewriting-stage-completion.md`, tablet playtest: "I
// wanted about 4 clues, not just 2"). `duck-trail1`/`duck-trail2` now each
// author `clue.extraKind` (`levels/catalog.ts`) alongside their existing
// RULING kind — `clueKindsOf` contributes both per trail, so the case's own
// chip row shows all four while `ruledOutBy` (the actual deduction logic)
// stays exactly as it was.
describe("duck case: four clues from two trails (T29)", () => {
  const duckCase = DETECTIVE_CASES.find((k) => k.id === 'duck')!

  it('clueKindsOf derives all four kinds, in trail then kind/extraKind order', () => {
    expect(clueKindsOf(duckCase)).toEqual(['droplet', 'corn', 'feather', 'webfoot'])
  })

  it('ruledOutBy is untouched: still exactly the two RULING kinds, never the two new bonus ones', () => {
    expect(duckCase.ruledOutBy).toEqual({ vaca: 'feather', gato: 'droplet' })
    expect(Object.values(duckCase.ruledOutBy)).not.toContain('corn')
    expect(Object.values(duckCase.ruledOutBy)).not.toContain('webfoot')
  })
})

describe('nightCaseOptions/resolveCase (the live lineup Deduction.tsx actually renders)', () => {
  it('always leads with the erizo, the culprit, regardless of progress', () => {
    expect(nightCaseOptions(rescuedOnly([]))[0]).toBe('erizo')
    expect(nightCaseOptions(rescuedOnly(['pato', 'oveja', 'llama']))[0]).toBe('erizo')
  })

  it('resolveCase only swaps options for the night case; every other case is untouched', () => {
    const duck = DETECTIVE_CASES.find((k) => k.id === 'duck')!
    expect(resolveCase(duck, rescuedOnly([]))).toBe(duck)
    const resolved = resolveCase(nightCase, rescuedOnly(['pato', 'oveja']))
    expect(resolved.options).toEqual(['erizo', 'pato', 'oveja'])
    // Everything but `options` is untouched — same culprit, hint, clueArt.
    expect(resolved.culprit).toBe(nightCase.culprit)
    expect(resolved.hint).toBe(nightCase.hint)
  })

  it('a fallback-resolved lineup still names only animals the case has a hint for', () => {
    const resolved = resolveCase(nightCase, rescuedOnly([]))
    for (const animal of resolved.options) {
      if (animal === nightCase.culprit) continue
      expect(nightCase.hint[animal], `no hint for a resolved discard: ${animal}`).toBeDefined()
    }
  })

  it('a fallback-resolved lineup still names only animals with a silhouette (Deduction.tsx would throw otherwise)', () => {
    const resolved = resolveCase(nightCase, rescuedOnly([]))
    for (const animal of resolved.options) {
      expect(ANIMAL_SILHOUETTE_ART[animal], `no silhouette for a resolved option: ${animal}`).toBeDefined()
    }
  })
})

// [T27, `odd/tasks/prewriting-stage-completion.md`, `docs/19` §2.3/§3 monos
// row] The `monkeys` case: culprit `mono` (a `PLACEHOLDER_ZOO_ANIMALS`
// entry, so `Deduction.tsx` branches around calling `silhouetteArtFor` for
// it — never checked here the way the night sweep above checks every
// resolved option has a REAL silhouette), two FIXED distractors (erizo,
// abeja — never swapped for a different animal, unlike night's priority
// list), and a progress-resolved FRAMING for each: "ya rescatado" once
// genuinely met, a real clue-based verdict otherwise.
const monkeysCase = DETECTIVE_CASES.find((k) => k.id === 'monkeys')!

describe('the monkeys case (docs/19 §2.3/§3 monos row)', () => {
  it('culprit is mono, options are exactly [mono, erizo, abeja], answer closes the case', () => {
    expect(monkeysCase.culprit).toBe('mono')
    expect(monkeysCase.options).toEqual(['mono', 'erizo', 'abeja'])
  })

  it('the static entry names the ordinary "ya rescatado" hint for both distractors', () => {
    expect(monkeysCase.hint.erizo).toMatch(/ya lo encontramos/)
    expect(monkeysCase.hint.abeja).toMatch(/ya volvió a su panal/)
  })

  it('carries exactly the two stand-in clue kinds monkey1/monkey2 author, pairwise distinct', () => {
    expect(clueKindsOf(monkeysCase)).toEqual(['footprint', 'corn'])
  })
})

describe('resolveMonkeysCase / resolveCase (the live framing Deduction.tsx actually renders)', () => {
  it('options never change with progress — only night ever swaps who appears', () => {
    expect(resolveMonkeysCase(monkeysCase, rescuedOnly([])).options).toEqual(monkeysCase.options)
    expect(resolveMonkeysCase(monkeysCase, rescuedOnly(['erizo', 'abeja'])).options).toEqual(
      monkeysCase.options,
    )
  })

  it('the ordinary path (both already rescued): both distractors are "ya rescatado", no clue verdict needed', () => {
    const resolved = resolveMonkeysCase(monkeysCase, rescuedOnly(['erizo', 'abeja']))
    expect(resolved.rescuedDistractors).toEqual(['erizo', 'abeja'])
    expect(resolved.ruledOutBy).toEqual({})
    expect(resolved.hint.erizo).toBe(monkeysCase.hint.erizo)
    expect(resolved.hint.abeja).toBe(monkeysCase.hint.abeja)
  })

  it('a non-linear session that has rescued neither: both fall back to a real clue-based verdict', () => {
    const resolved = resolveMonkeysCase(monkeysCase, rescuedOnly([]))
    expect(resolved.rescuedDistractors).toEqual([])
    expect(resolved.ruledOutBy).toEqual({ erizo: 'corn', abeja: 'footprint' })
    expect(resolved.hint.erizo).toMatch(/no come bananas/)
    expect(resolved.hint.abeja).toMatch(/no deja huellas/)
  })

  it('mixed progress: only the unrescued one falls back, the other still reads "ya rescatado"', () => {
    const onlyErizo = resolveMonkeysCase(monkeysCase, rescuedOnly(['erizo']))
    expect(onlyErizo.rescuedDistractors).toEqual(['erizo'])
    expect(onlyErizo.ruledOutBy).toEqual({ abeja: 'footprint' })
    expect(onlyErizo.hint.erizo).toBe(monkeysCase.hint.erizo)
    expect(onlyErizo.hint.abeja).toMatch(/no deja huellas/)

    const onlyAbeja = resolveMonkeysCase(monkeysCase, rescuedOnly(['abeja']))
    expect(onlyAbeja.rescuedDistractors).toEqual(['abeja'])
    expect(onlyAbeja.ruledOutBy).toEqual({ erizo: 'corn' })
    expect(onlyAbeja.hint.abeja).toBe(monkeysCase.hint.abeja)
    expect(onlyAbeja.hint.erizo).toMatch(/no come bananas/)
  })

  it('every fallback verdict is one of this case\'s own carried clue kinds (cases.test.ts\'s generic invariant, restated for the resolved branch)', () => {
    const carried = new Set(clueKindsOf(monkeysCase))
    const resolved = resolveMonkeysCase(monkeysCase, rescuedOnly([]))
    for (const kind of Object.values(resolved.ruledOutBy)) {
      expect(carried.has(kind!), `${kind} is not among monkeys' own clues`).toBe(true)
    }
    // Pairwise distinct, the same "no clue kind rules out more than one
    // animal" invariant every static case's own ruledOutBy satisfies.
    const verdicts = Object.values(resolved.ruledOutBy)
    expect(new Set(verdicts).size).toBe(verdicts.length)
  })

  it('resolveCase routes id "monkeys" through resolveMonkeysCase; every other case stays untouched', () => {
    const duck = DETECTIVE_CASES.find((k) => k.id === 'duck')!
    expect(resolveCase(duck, rescuedOnly([]))).toBe(duck)
    const resolved = resolveCase(monkeysCase, rescuedOnly([]))
    expect(resolved).toEqual(resolveMonkeysCase(monkeysCase, rescuedOnly([])))
  })
})
