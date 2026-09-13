// Adventure registry tests (duck-undulations-and-sector-backdrop specs:
// main-screen "resolveEnterAction...", zoo-map "Octopus Phrase Reads as a
// Closing..."; this change's zoo-map delta: "Adventure Backdrop Registry
// Re-Keyed to the Adventure", "Octopus Phrase Reads as a Closing Once the
// Sector's Animal Is Recovered"). Node environment, no DOM — every function
// under test is pure over plain data.
import { describe, expect, it } from 'vitest'
import { EMPTY_RECORD, type LevelRecord } from '../game/types'
import { ZOO_ANIMAL_ART, ZOO_OCTOPUS_PRINT_ART } from '../detective/assets'
import { SECTORS, type Records } from './sectors'
import { ADVENTURES, adventureFor, introLevel, mapBubble } from './adventures'

function filed(...ids: readonly string[]): Records {
  const out: Record<string, LevelRecord> = {}
  for (const id of ids) out[id] = { ...EMPTY_RECORD, approvals: 1 }
  return out
}

const estanque = SECTORS.find((s) => s.id === 'estanque')!
const montanas = SECTORS.find((s) => s.id === 'montanas')!

describe('ADVENTURES', () => {
  it('declares three rows: the duck in the estanque, the sheep and the llama in montañas', () => {
    expect(ADVENTURES).toHaveLength(3)
    expect(ADVENTURES.map((a) => a.id)).toEqual(['duck', 'sheep', 'llama'])

    const duck = ADVENTURES[0]
    expect(duck.levelIds).toEqual(['duck-trail1', 'duck-trail2', 'duck-trail3', 'duck-trail4'])
    expect(duck.sector).toBe('estanque')
    expect(duck.animal).toBe('pato')

    const sheep = ADVENTURES[1]
    expect(sheep.levelIds).toEqual(['sheep-hill1', 'sheep-hill2', 'sheep-hill3', 'sheep-hill4'])
    expect(sheep.sector).toBe('montanas')
    expect(sheep.animal).toBe('oveja')

    const llama = ADVENTURES[2]
    expect(llama.levelIds).toEqual(['llama-peak1', 'llama-peak2', 'llama-peak3', 'llama-peak4'])
    expect(llama.sector).toBe('montanas')
    expect(llama.animal).toBe('llama')
  })
})

describe('adventureFor', () => {
  it('resolves every duck id to the same row', () => {
    for (const id of ['duck-trail1', 'duck-trail2', 'duck-trail3', 'duck-trail4']) {
      expect(adventureFor(id)).toBe(ADVENTURES[0])
    }
  })

  it('resolves every sheep/llama id to its own row', () => {
    for (const id of ['sheep-hill1', 'sheep-hill2', 'sheep-hill3', 'sheep-hill4']) {
      expect(adventureFor(id)?.id).toBe('sheep')
    }
    for (const id of ['llama-peak1', 'llama-peak2', 'llama-peak3', 'llama-peak4']) {
      expect(adventureFor(id)?.id).toBe('llama')
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
    expect(introLevel('sheep-hill1')?.id).toBe('sheep')
    expect(introLevel('llama-peak1')?.id).toBe('llama')
  })

  it('resolves undefined for every other duck level and every non-adventure level', () => {
    for (const id of ['duck-trail2', 'duck-trail3', 'duck-trail4', 'trail1', 'f2-agua2']) {
      expect(introLevel(id)).toBeUndefined()
    }
  })

  it('resolves undefined for every sheep/llama level after each adventure\'s first', () => {
    for (const id of ['sheep-hill2', 'sheep-hill3', 'sheep-hill4']) {
      expect(introLevel(id)).toBeUndefined()
    }
    for (const id of ['llama-peak2', 'llama-peak3', 'llama-peak4']) {
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
      art: ZOO_ANIMAL_ART.pato,
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

  // The defect fix (design.md §4.2): `montañas` carries TWO adventures, so
  // the phrase must track the MOST RECENTLY recovered one, not the first
  // match `ADVENTURES.find` would have kept returning forever.
  it('reads as the onward phrase for montañas while neither adventure is recovered', () => {
    expect(mapBubble(montanas, {})).toEqual({
      art: ZOO_OCTOPUS_PRINT_ART,
      label: '¡Mirá! Las huellas van hacia allá. ¿Vamos?',
    })
  })

  it("closes with the sheep's own line once sheep-hill4 is filed and llama-peak4 is not", () => {
    expect(mapBubble(montanas, filed('sheep-hill4'))).toEqual({
      art: ZOO_ANIMAL_ART.oveja,
      label: '¡Juntamos las ovejas! Ya están en su ladera.',
    })
  })

  it("closes with the LLAMA's own line, not the sheep's, once both are filed", () => {
    expect(mapBubble(montanas, filed('sheep-hill4', 'llama-peak4'))).toEqual({
      art: ZOO_ANIMAL_ART.llama,
      label: '¡Encontramos a la llama! Ya está en la cumbre.',
    })
  })
})
