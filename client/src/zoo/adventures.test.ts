// Adventure registry tests (duck-undulations-and-sector-backdrop specs:
// main-screen "resolveEnterAction...", zoo-map "Octopus Phrase Reads as a
// Closing..."; this change's zoo-map delta: "Adventure Backdrop Registry
// Re-Keyed to the Adventure", "Octopus Phrase Reads as a Closing Once the
// Sector's Animal Is Recovered"). Node environment, no DOM — every function
// under test is pure over plain data.
import { describe, expect, it } from 'vitest'
import { EMPTY_RECORD, type LevelRecord } from '../game/types'
import { CARRIER_LENS_ART, SECTOR_ADVENTURE_ART, ZOO_ANIMAL_ART, ZOO_OCTOPUS_PRINT_ART } from '../detective/assets'
import { SECTORS, type Records } from './sectors'
import { ADVENTURES, adventureFor, adventureIcon, closingLevel, introLevel, mapBubble } from './adventures'

function filed(...ids: readonly string[]): Records {
  const out: Record<string, LevelRecord> = {}
  for (const id of ids) out[id] = { ...EMPTY_RECORD, approvals: 1 }
  return out
}

const estanque = SECTORS.find((s) => s.id === 'estanque')!
const montanas = SECTORS.find((s) => s.id === 'montanas')!

describe('ADVENTURES', () => {
  it("declares nine rows: duck/sheep/llama, the entrance's glass/sand, the night sector, the arena's snake, the forest's bee, and the pond's dolphin (design.md §5, §6.1; free-trail-waypoints design.md §9; this change's §8)", () => {
    expect(ADVENTURES).toHaveLength(9)
    expect(ADVENTURES.map((a) => a.id)).toEqual([
      'duck',
      'sheep',
      'llama',
      'glass',
      'sand',
      'night',
      'snake',
      'bee',
      'dolphin',
    ])

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

  it('the glass/sand/night rows declare no animal, each an icon of its own, in the entrance/night sectors', () => {
    const glass = ADVENTURES.find((a) => a.id === 'glass')!
    const sand = ADVENTURES.find((a) => a.id === 'sand')!
    const night = ADVENTURES.find((a) => a.id === 'night')!

    expect(glass.levelIds).toEqual(['glass1', 'glass2', 'glass3', 'glass4'])
    expect(glass.sector).toBe('entrada')
    expect(glass.animal).toBeUndefined()
    expect(glass.icon).toBe(CARRIER_LENS_ART)

    expect(sand.levelIds).toEqual(['sand1', 'sand2', 'sand3', 'sand4'])
    expect(sand.sector).toBe('entrada')
    expect(sand.animal).toBeUndefined()
    expect(sand.icon).toBe(ZOO_OCTOPUS_PRINT_ART)

    expect(night.levelIds).toEqual(['night1', 'night2', 'night3', 'night4'])
    expect(night.sector).toBe('nocturna')
    expect(night.animal).toBeUndefined()
    expect(night.icon).toBe(SECTOR_ADVENTURE_ART.flashlight)
  })

  it("the bee row declares animal:'abeja' and no closingBeat (free-trail-waypoints design.md §9)", () => {
    const bee = ADVENTURES.find((a) => a.id === 'bee')!
    expect(bee.levelIds).toEqual(['bee1', 'bee2', 'bee3', 'bee4'])
    expect(bee.sector).toBe('bosque')
    expect(bee.animal).toBe('abeja')
    expect(bee.closingBeat).toBeUndefined()
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

  it('resolves glass1/sand1/night1 to their own adventure', () => {
    expect(introLevel('glass1')?.id).toBe('glass')
    expect(introLevel('sand1')?.id).toBe('sand')
    expect(introLevel('night1')?.id).toBe('night')
  })

  it('resolves undefined for every glass/sand/night level after each adventure\'s first', () => {
    for (const id of ['glass2', 'glass3', 'glass4']) expect(introLevel(id)).toBeUndefined()
    for (const id of ['sand2', 'sand3', 'sand4']) expect(introLevel(id)).toBeUndefined()
    for (const id of ['night2', 'night3', 'night4']) expect(introLevel(id)).toBeUndefined()
  })
})

describe('adventureIcon (design.md §6.1)', () => {
  it('returns the registered animal art for an animal-bearing row', () => {
    expect(adventureIcon(ADVENTURES[0])).toBe(ZOO_ANIMAL_ART.pato)
    expect(adventureIcon(ADVENTURES[1])).toBe(ZOO_ANIMAL_ART.oveja)
    expect(adventureIcon(ADVENTURES[2])).toBe(ZOO_ANIMAL_ART.llama)
  })

  it('returns the row\'s own icon for an animal-less row', () => {
    const glass = ADVENTURES.find((a) => a.id === 'glass')!
    const sand = ADVENTURES.find((a) => a.id === 'sand')!
    const night = ADVENTURES.find((a) => a.id === 'night')!
    expect(adventureIcon(glass)).toBe(CARRIER_LENS_ART)
    expect(adventureIcon(sand)).toBe(ZOO_OCTOPUS_PRINT_ART)
    expect(adventureIcon(night)).toBe(SECTOR_ADVENTURE_ART.flashlight)
  })
})

describe('closingLevel (design.md §6.3, corrected against main-screen spec — see apply-progress.md)', () => {
  it("resolves sand4 to its own adventure — the entrance's only closing beat", () => {
    expect(closingLevel('sand4')?.id).toBe('sand')
  })

  it('resolves undefined for glass4 — the entrance closes at sand4, not here', () => {
    expect(closingLevel('glass4')).toBeUndefined()
  })

  it('resolves undefined for night4 — main-screen spec names it explicitly among the excluded adventures', () => {
    // design.md §6.2's own literal assigns `night` a `closingBeat`, which
    // contradicts the RATIFIED `main-screen` spec delta ("close GameView
    // Variant and resolveCloseAction" lists `night` BY NAME among the
    // adventures that must resolve to the ordinary exit outcome) and
    // tasks.md's own task 6.5 scenario list. The spec and the task list
    // win; `night`'s registry row carries no `closingBeat` — see
    // `apply-progress.md`'s Phase 6 section.
    expect(closingLevel('night4')).toBeUndefined()
  })

  it('resolves undefined for every pre-existing adventure\'s last level (no closing beat)', () => {
    for (const id of ['duck-trail4', 'sheep-hill4', 'llama-peak4']) {
      expect(closingLevel(id)).toBeUndefined()
    }
  })

  it('resolves undefined for a level that is not an adventure\'s own last level', () => {
    for (const id of ['sand1', 'sand2', 'sand3', 'night1', 'night2', 'night3']) {
      expect(closingLevel(id)).toBeUndefined()
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

  // zoo-map spec "Animal-less Adventures Are Excluded From the Animal-Keyed
  // Closing Phrase": `entrada`/`nocturna` carry no `ZooAnimal` entries at
  // all, so filing their own last level must never resolve the animal-
  // placement branch — the onward phrase stays exactly what it was.
  it('filing sand4 does not change entrada\'s bubble phrase', () => {
    const entrada = SECTORS.find((s) => s.id === 'entrada')!
    expect(mapBubble(entrada, filed('sand4'))).toEqual({
      art: ZOO_OCTOPUS_PRINT_ART,
      label: '¡Mirá! Las huellas van hacia allá. ¿Vamos?',
    })
  })

  it('filing night4 does not change nocturna\'s bubble phrase', () => {
    const nocturna = SECTORS.find((s) => s.id === 'nocturna')!
    expect(mapBubble(nocturna, filed('night4'))).toEqual({
      art: ZOO_OCTOPUS_PRINT_ART,
      label: '¡Mirá! Las huellas van hacia allá. ¿Vamos?',
    })
  })

  it("closes with the DOLPHIN's own line, not the duck's, once dolphin4 (and duck-trail4) are filed (this change's §8)", () => {
    expect(mapBubble(estanque, filed('duck-trail4', 'dolphin4'))).toEqual({
      art: ZOO_ANIMAL_ART.delfin,
      label: '¡Pasamos entre los delfines! Ya están tranquilos en el estanque.',
    })
  })
})

describe('the dolphin adventure (this change, design.md §8)', () => {
  const dolphin = ADVENTURES.find((a) => a.id === 'dolphin')!

  it('declares animal:"delfin" and no closingBeat', () => {
    expect(dolphin.animal).toBe('delfin')
    expect(dolphin.closingBeat).toBeUndefined()
  })

  it('carries the four dolphin levels, in order, in the estanque sector', () => {
    expect(dolphin.levelIds).toEqual(['dolphin1', 'dolphin2', 'dolphin3', 'dolphin4'])
    expect(dolphin.sector).toBe('estanque')
  })
})
