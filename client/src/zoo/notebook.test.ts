// Detective's notebook registry tests (`odd/tasks/prewriting-stage-
// completion.md` T23, `docs/19` §5.1). Node environment, no DOM — pure over
// plain data, the same convention `zoo/stars.test.ts`/`zoo/backpack.test.ts`
// already use.
import { describe, expect, it } from 'vitest'
import {
  ANIMAL_SILHOUETTE_ART,
  ZOO_ANIMAL_ART,
  ZOO_ANIMAL_SILHOUETTE_ART,
} from '../detective/assets'
import { EMPTY_RECORD, type LevelRecord } from '../game/types'
import type { Records } from './sectors'
import { isAnimalRescued, notebookEntries, NOTEBOOK_ANIMAL_IDS } from './notebook'

function filed(...ids: readonly string[]): Records {
  const out: Record<string, LevelRecord> = {}
  for (const id of ids) out[id] = { ...EMPTY_RECORD, approvals: 1 }
  return out
}

describe('NOTEBOOK_ANIMAL_IDS', () => {
  it('lists exactly the ten real zoo animals, never the deduction lineup\'s decoys', () => {
    expect([...NOTEBOOK_ANIMAL_IDS].sort()).toEqual(
      ['abeja', 'delfin', 'erizo', 'llama', 'mono', 'oveja', 'pato', 'pez', 'tortuga', 'vibora'].sort(),
    )
    expect(NOTEBOOK_ANIMAL_IDS).not.toContain('gallina')
    expect(NOTEBOOK_ANIMAL_IDS).not.toContain('vaca')
    expect(NOTEBOOK_ANIMAL_IDS).not.toContain('gato')
  })

  it('carries no duplicate id', () => {
    expect(new Set(NOTEBOOK_ANIMAL_IDS).size).toBe(NOTEBOOK_ANIMAL_IDS.length)
  })
})

describe('isAnimalRescued', () => {
  it('is false for every animal with no records at all', () => {
    for (const id of NOTEBOOK_ANIMAL_IDS) expect(isAnimalRescued(id, {})).toBe(false)
  })

  it('is true for pato once duck-trail4 is filed, and false for every other animal', () => {
    const records = filed('duck-trail4')
    expect(isAnimalRescued('pato', records)).toBe(true)
    for (const id of NOTEBOOK_ANIMAL_IDS) {
      if (id === 'pato') continue
      expect(isAnimalRescued(id, records)).toBe(false)
    }
  })

  it('is true for oveja once sheep-hill4 is filed, and true for llama once llama-peak4 is filed independently', () => {
    expect(isAnimalRescued('oveja', filed('sheep-hill4'))).toBe(true)
    expect(isAnimalRescued('llama', filed('sheep-hill4'))).toBe(false)
    expect(isAnimalRescued('llama', filed('llama-peak4'))).toBe(true)
  })

  it('is false for an unknown id', () => {
    expect(isAnimalRescued('nope' as never, filed('duck-trail4'))).toBe(false)
  })
})

describe('notebookEntries', () => {
  it('shows every animal as a missing silhouette on a fresh install, captioned "?"', () => {
    const entries = notebookEntries({})
    expect(entries).toHaveLength(NOTEBOOK_ANIMAL_IDS.length)
    for (const entry of entries) {
      expect(entry.rescued).toBe(false)
      expect(entry.caption).toBe('?')
      expect(entry.line).toBeNull()
      // Never the coloured art while missing — that would give it away.
      expect(entry.art).not.toBe(ZOO_ANIMAL_ART[entry.id])
    }
  })

  it('uses the derived silhouette registry for a missing animal, and reuses ANIMAL_SILHOUETTE_ART.pato by reference for pato', () => {
    const entries = notebookEntries({})
    const pato = entries.find((e) => e.id === 'pato')!
    expect(pato.art).toBe(ANIMAL_SILHOUETTE_ART.pato)
    const oveja = entries.find((e) => e.id === 'oveja')!
    expect(oveja.art).toBe(ZOO_ANIMAL_SILHOUETTE_ART.oveja)
  })

  it('shows a rescued animal in colour, with its own spot caption and a speakable line', () => {
    const entries = notebookEntries(filed('duck-trail4'))
    const pato = entries.find((e) => e.id === 'pato')!
    expect(pato.rescued).toBe(true)
    expect(pato.art).toBe(ZOO_ANIMAL_ART.pato)
    expect(pato.caption).toBe('en su laguna')
    expect(pato.line).toBe('¡Encontramos al pato! Ya está en su laguna.')
    // Every other animal is still missing.
    for (const entry of entries) {
      if (entry.id === 'pato') continue
      expect(entry.rescued).toBe(false)
    }
  })

  it('mixes rescued and missing correctly for a partial progress fixture', () => {
    const records = filed('duck-trail4', 'sheep-hill4', 'snake4')
    const byId = Object.fromEntries(notebookEntries(records).map((e) => [e.id, e]))
    expect(byId.pato.rescued).toBe(true)
    expect(byId.oveja.rescued).toBe(true)
    expect(byId.vibora.rescued).toBe(true)
    expect(byId.llama.rescued).toBe(false)
    expect(byId.erizo.rescued).toBe(false)
    expect(byId.llama.caption).toBe('?')
  })

  it('every non-empty caption is non-empty (CaptionedArt.label is required)', () => {
    const mixed = filed('duck-trail4', 'bee4')
    for (const entry of notebookEntries(mixed)) {
      expect(entry.caption.length).toBeGreaterThan(0)
    }
  })

  // T23 follow-up (orchestrator screenshot review): `placeholderArt` tells
  // `DetectiveNotebook` to draw a paw print instead of a placeholder
  // animal's featureless silhouette. [T49] `mono`, the only placeholder, got
  // its real drawing (`docs/23` D4), so no entry needs it any more.
  describe('placeholderArt', () => {
    it('is false for every missing animal, mono included', () => {
      const entries = notebookEntries({})
      for (const entry of entries) expect(entry.placeholderArt, entry.id).toBe(false)
    })

    it('is false for mono once actually rescued', () => {
      const entries = notebookEntries(filed('monkey4'))
      const mono = entries.find((e) => e.id === 'mono')!
      expect(mono.rescued).toBe(true)
      expect(mono.placeholderArt).toBe(false)
    })
  })
})
