// The case registry's own structural guarantees (design.md §9 "Structural
// tests the registry replaces"; detective-mode spec "Case Registry Data
// Shape"). Pure data assertions, no DOM — iterating `DETECTIVE_CASES` rather
// than hand-picking one case, so a future third case is checked for free.
import { describe, expect, it } from 'vitest'
import { DETECTIVE_CASES, clueKindsOf } from './cases'

describe("every case's culprit is among its own options and is ruled out by nothing", () => {
  for (const kase of DETECTIVE_CASES) {
    it(`${kase.id}: culprit is the only option absent from ruledOutBy`, () => {
      expect(kase.options).toContain(kase.culprit)
      const unruled = kase.options.filter((animal) => !(animal in kase.ruledOutBy))
      expect(unruled).toEqual([kase.culprit])
    })
  }
})

describe('every case rules out every non-culprit option, by pairwise DISTINCT clue kinds', () => {
  for (const kase of DETECTIVE_CASES) {
    it(`${kase.id}: distractors are ruled out by distinct kinds`, () => {
      const distractors = kase.options.filter((animal) => animal !== kase.culprit)
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
