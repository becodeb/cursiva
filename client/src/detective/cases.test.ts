// The case registry's own structural guarantees (design.md §9 "Structural
// tests the registry replaces"; detective-mode spec "Case Registry Data
// Shape"). Pure data assertions, no DOM — iterating `DETECTIVE_CASES` rather
// than hand-picking one case, so a future third case is checked for free.
import { describe, expect, it } from 'vitest'
import { ANIMAL_SILHOUETTE_ART } from './assets'
import {
  DETECTIVE_CASES,
  clueKindsOf,
  nightCaseOptions,
  resolveCase,
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
