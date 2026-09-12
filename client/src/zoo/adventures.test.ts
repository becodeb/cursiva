// Adventure registry tests (duck-undulations-and-sector-backdrop specs:
// main-screen "resolveEnterAction...", zoo-map "Octopus Phrase Reads as a
// Closing..."). Node environment, no DOM — every function under test is
// pure over plain data.
import { describe, expect, it } from 'vitest'
import { EMPTY_RECORD, type LevelRecord } from '../game/types'
import { ANIMAL_ART, ZOO_OCTOPUS_PRINT_ART } from '../detective/assets'
import { SECTORS, type Records } from './sectors'
import { ADVENTURES, adventureFor, introLevel, mapBubble } from './adventures'

function filed(...ids: readonly string[]): Records {
  const out: Record<string, LevelRecord> = {}
  for (const id of ids) out[id] = { ...EMPTY_RECORD, approvals: 1 }
  return out
}

const estanque = SECTORS.find((s) => s.id === 'estanque')!

describe('ADVENTURES', () => {
  it('declares exactly one row today: the duck, in the estanque', () => {
    expect(ADVENTURES).toHaveLength(1)
    expect(ADVENTURES[0].levelIds).toEqual([
      'duck-trail1',
      'duck-trail2',
      'duck-trail3',
      'duck-trail4',
    ])
    expect(ADVENTURES[0].sector).toBe('estanque')
    expect(ADVENTURES[0].animal).toBe('pato')
  })
})

describe('adventureFor', () => {
  it('resolves every duck id to the same row', () => {
    for (const id of ['duck-trail1', 'duck-trail2', 'duck-trail3', 'duck-trail4']) {
      expect(adventureFor(id)).toBe(ADVENTURES[0])
    }
  })

  it('resolves undefined for a level that belongs to no adventure', () => {
    expect(adventureFor('trail1')).toBeUndefined()
    expect(adventureFor('f2-agua2')).toBeUndefined()
    expect(adventureFor('not-a-real-id')).toBeUndefined()
  })
})

describe('introLevel', () => {
  it('resolves the adventure only for its first level', () => {
    expect(introLevel('duck-trail1')).toBe(ADVENTURES[0])
  })

  it('resolves undefined for every other duck level and every non-adventure level', () => {
    for (const id of ['duck-trail2', 'duck-trail3', 'duck-trail4', 'trail1', 'f2-agua2']) {
      expect(introLevel(id)).toBeUndefined()
    }
  })
})

describe('mapBubble', () => {
  it('reads as the onward phrase when no records are filed', () => {
    expect(mapBubble(estanque, {})).toEqual({
      art: ZOO_OCTOPUS_PRINT_ART,
      label: '¡Mirá! Las huellas van hacia allá. ¿Vamos?',
    })
  })

  it('closes with the duck art and line once duck-trail4 is filed', () => {
    expect(mapBubble(estanque, filed('duck-trail4'))).toEqual({
      art: ANIMAL_ART.pato,
      label: '¡Encontramos al pato! Ya está en su laguna.',
    })
  })

  it('stays onward for a sector with no adventure row', () => {
    const bosque = SECTORS.find((s) => s.id === 'bosque')!
    expect(mapBubble(bosque, filed('duck-trail4'))).toEqual({
      art: ZOO_OCTOPUS_PRINT_ART,
      label: '¡Mirá! Las huellas van hacia allá. ¿Vamos?',
    })
  })
})
