// Adventure registry tests (duck-undulations-and-sector-backdrop specs:
// main-screen "resolveEnterAction...", zoo-map "Octopus Phrase Reads as a
// Closing..."; this change's zoo-map delta: "Adventure Backdrop Registry
// Re-Keyed to the Adventure", "Octopus Phrase Reads as a Closing Once the
// Sector's Animal Is Recovered"). Node environment, no DOM — every function
// under test is pure over plain data.
import { describe, expect, it } from 'vitest'
import { getLevel } from '../levels/catalog'
import { EMPTY_RECORD, type LevelRecord } from '../game/types'
import {
  CART_ART,
  SECTOR_ADVENTURE_ART,
  SIGN_ART,
  ZOO_ANIMAL_ART,
  ZOO_OCTOPUS_PRINT_ART,
} from '../detective/assets'
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
  // Renamed from ten rows to twelve (add-caretaker-prologue design.md D7):
  // the old two-row `glass`/`sand` split regroups into four entrance
  // enclosures — `peces`, `tortugas`, `monos`, `sendero` — each carrying TWO
  // of the same eight level ids, never renumbered (`zoo-map` delta
  // "Adventure Identifiers Regroup the Entrance Into Four Enclosures").
  it("declares twelve rows: duck/sheep/llama, the entrance's four enclosures (peces/tortugas/monos/sendero), the night sector, the arena's snake, the forest's bee, the pond's dolphin, and the night sector's second adventure — the hedgehog (design.md §5, §6.1; free-trail-waypoints design.md §9; this change's §8; radial-spines design.md §8.2; add-caretaker-prologue design.md D7)", () => {
    expect(ADVENTURES).toHaveLength(12)
    expect(ADVENTURES.map((a) => a.id)).toEqual([
      'duck',
      'sheep',
      'llama',
      'peces',
      'tortugas',
      'monos',
      'sendero',
      'night',
      'snake',
      'bee',
      'dolphin',
      'hedgehog',
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

  // `docs/16` §9 is a TABLE OF EXACT SENTENCES, and the `zoo-map` delta's
  // "Four Entrance Rows Carry the docs/16 §9 Script Verbatim" requirement
  // pins it character for character. Without this, the script is prose in a
  // document that the code merely resembles: a typo, a dropped ellipsis or a
  // helpfully "improved" line would ship silently. The ellipses below are
  // single U+2026 characters, not three dots — that is exactly the kind of
  // drift this guard exists to catch.
  it('the four entrance rows carry the docs/16 §9 script verbatim, sign art included', () => {
    const peces = ADVENTURES.find((a) => a.id === 'peces')!
    const tortugas = ADVENTURES.find((a) => a.id === 'tortugas')!
    const monos = ADVENTURES.find((a) => a.id === 'monos')!
    const sendero = ADVENTURES.find((a) => a.id === 'sendero')!

    expect(peces.intro).toBe('El vidrio de la pecera está todo empañado. ¿Lo limpiamos?')
    expect(tortugas.intro).toBe('La arena tapó todo el recinto. Barrámosla.')
    expect(monos.intro).toBe('Cayeron un montón de hojas. ¿Las sacamos?')
    expect(sendero.intro).toBe('El sendero quedó lleno de barro.')

    expect(peces.closingBeat![0].line).toBe('¡Las algas, el cofre, las piedras… pero no hay ni un pez!')
    expect(tortugas.closingBeat![0].line).toBe('Las piedras, el tronco… ¿y las tortugas dónde están?')
    expect(monos.closingBeat![0].line).toBe('Las sogas, las frutas… acá tampoco hay nadie.')
    expect(sendero.closingBeat![0].line).toBe('¡Mirá! ¿Y esto? ¡Son huellas!')

    // The uppercase word (PECES/TORTUGAS/MONOS) lives IN the sign artwork,
    // not in a second DOM label — `AdventureClosing` renders exactly one
    // `CaptionedArt`, and its caption is the sentence above. So the testable
    // invariant for the sign is WHICH ART the beat points at.
    expect(peces.closingBeat![0].art).toBe(SIGN_ART.fish)
    expect(tortugas.closingBeat![0].art).toBe(SIGN_ART.turtles)
    expect(monos.closingBeat![0].art).toBe(SIGN_ART.monkeys)
  })

  it('the four entrance rows and the night row declare no animal, each an icon of its own, in the entrance/night sectors', () => {
    const peces = ADVENTURES.find((a) => a.id === 'peces')!
    const tortugas = ADVENTURES.find((a) => a.id === 'tortugas')!
    const monos = ADVENTURES.find((a) => a.id === 'monos')!
    const sendero = ADVENTURES.find((a) => a.id === 'sendero')!
    const night = ADVENTURES.find((a) => a.id === 'night')!

    // Narrowed to one level per enclosure by adventure-flow-and-map-guidance
    // T1 ("levels that must be done twice") — each row below used to carry
    // two ids (the same erase gesture on the same picture); the harder twin
    // of each pair (`glass2`/`sand2`/`glass4`/`sand4`) is dropped from every
    // row, never from the catalog (see the dedicated describe block below).
    expect(peces.levelIds).toEqual(['glass1'])
    expect(peces.sector).toBe('entrada')
    expect(peces.animal).toBeUndefined()
    expect(peces.icon).toBe(SECTOR_ADVENTURE_ART.chest)

    expect(tortugas.levelIds).toEqual(['sand1'])
    expect(tortugas.sector).toBe('entrada')
    expect(tortugas.animal).toBeUndefined()
    expect(tortugas.icon).toBe(SECTOR_ADVENTURE_ART.stone)

    expect(monos.levelIds).toEqual(['glass3'])
    expect(monos.sector).toBe('entrada')
    expect(monos.animal).toBeUndefined()
    expect(monos.icon).toBe(SECTOR_ADVENTURE_ART.leaf)

    expect(sendero.levelIds).toEqual(['sand3'])
    expect(sendero.sector).toBe('entrada')
    expect(sendero.animal).toBeUndefined()
    expect(sendero.icon).toBe(CART_ART)

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

// [adventure-flow-and-map-guidance T1, "levels that must be done twice"]
// Narrowed from eight ids (two per enclosure, asserted per-family so the
// interleaving in `zoo/sectors.ts`'s `entrada.adventureIds` was never
// mistaken for a flat-order bug) down to four (one per enclosure — the
// EASIER of each original pair). The dropped twins never appear in any row
// any more, so the union below is now simply the four kept ids, already in
// narrative order.
describe("the four entrance rows' levelIds union (T1)", () => {
  const ENTRANCE_IDS = ['peces', 'tortugas', 'monos', 'sendero']
  const union = ADVENTURES.filter((a) => ENTRANCE_IDS.includes(a.id)).flatMap((a) => a.levelIds)

  it('the union is exactly the four kept ids, in narrative order — none of the four dropped ids (glass2, sand2, glass4, sand4) appears in any row', () => {
    expect(union).toEqual(['glass1', 'sand1', 'glass3', 'sand3'])
  })
})

describe('the four dropped enclosure ids (T1)', () => {
  // `glass2`/`sand2`/`glass4`/`sand4` are never deleted or renamed from the
  // catalog — level ids are persisted keys — only removed from every
  // `ADVENTURES` row and every sector's `adventureIds`. Still resolvable
  // through `getLevel` (the dev `?nivel=` deep link), but an orphan as far
  // as the adventure/sector registries are concerned.
  it('still resolve through getLevel, and belong to no adventure', () => {
    for (const id of ['glass2', 'sand2', 'glass4', 'sand4']) {
      expect(getLevel(id).id, id).toBe(id)
      expect(adventureFor(id), id).toBeUndefined()
    }
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
    expect(introLevel('glass1')?.id).toBe('peces')
    expect(introLevel('sand1')?.id).toBe('tortugas')
    expect(introLevel('night1')?.id).toBe('night')
  })

  // [add-caretaker-prologue, zoo-map delta "Adventure Identifiers Regroup
  // the Entrance Into Four Enclosures", scenario "introLevel resolves
  // glass3 and sand3 as new adventure starts"] Regrouping the entrance's
  // eight levels two-per-enclosure means `glass3`/`sand3` are now each an
  // adventure's OWN first level (`monos`/`sendero` respectively) — unlike
  // before this change, when both were `undefined` under the old four-level
  // `glass`/`sand` rows.
  it('resolves glass3/sand3 as new adventure starts (monos, sendero) — unlike before the regrouping', () => {
    expect(introLevel('glass3')?.id).toBe('monos')
    expect(introLevel('sand3')?.id).toBe('sendero')
  })

  it('resolves undefined for night2/night3/night4 — after night\'s own first level', () => {
    for (const id of ['night2', 'night3', 'night4']) expect(introLevel(id)).toBeUndefined()
  })

  // (Previously: `glass2`/`sand2`/`glass4`/`sand4` were each the SECOND
  // level of a two-level enclosure, so `introLevel` resolved `undefined` for
  // being past the adventure's own first. Adventure-flow-and-map-guidance T1
  // dropped them from every row entirely — the reason is now "belongs to no
  // adventure at all," not merely "not first," though the resolved value is
  // the same `undefined` either way.)
  it('resolves undefined for the four dropped enclosure ids — they belong to no adventure at all after T1', () => {
    for (const id of ['glass2', 'sand2', 'glass4', 'sand4']) expect(introLevel(id), id).toBeUndefined()
  })
})

describe('adventureIcon (design.md §6.1)', () => {
  it('returns the registered animal art for an animal-bearing row', () => {
    expect(adventureIcon(ADVENTURES[0])).toBe(ZOO_ANIMAL_ART.pato)
    expect(adventureIcon(ADVENTURES[1])).toBe(ZOO_ANIMAL_ART.oveja)
    expect(adventureIcon(ADVENTURES[2])).toBe(ZOO_ANIMAL_ART.llama)
  })

  // The four entrance rows deliberately do NOT carry their own sign or the
  // footprints as their intro icon. An intro that shows `SIGN_ART.fish`
  // announces PECES before the child has cleaned anything, and one that
  // shows the footprints gives away beat 4's surprise — and the prologue
  // exists so the child DISCOVERS the absence rather than being told
  // (`docs/16` §1, §2). Each icon names something already in the scene, or
  // the caretaker's own cart; the sign is spent on the CLOSING, where it is
  // the reveal. This assertion is what keeps that from drifting back.
  it('returns the row\'s own icon for an animal-less row', () => {
    const peces = ADVENTURES.find((a) => a.id === 'peces')!
    const tortugas = ADVENTURES.find((a) => a.id === 'tortugas')!
    const monos = ADVENTURES.find((a) => a.id === 'monos')!
    const sendero = ADVENTURES.find((a) => a.id === 'sendero')!
    const night = ADVENTURES.find((a) => a.id === 'night')!
    expect(adventureIcon(peces)).toBe(SECTOR_ADVENTURE_ART.chest)
    expect(adventureIcon(tortugas)).toBe(SECTOR_ADVENTURE_ART.stone)
    expect(adventureIcon(monos)).toBe(SECTOR_ADVENTURE_ART.leaf)
    expect(adventureIcon(sendero)).toBe(CART_ART)
    expect(adventureIcon(night)).toBe(SECTOR_ADVENTURE_ART.flashlight)
  })
})

describe('closingLevel (design.md §6.3, D3, corrected against main-screen spec — see apply-progress.md)', () => {
  // (Previously: each entrance enclosure carried TWO levels, and its second
  // one — `glass2`/`sand2`/`glass4`/`sand4` — was the row's own last level,
  // the one that resolved to its closing beat; `glass1`/`sand1`/`glass3`/
  // `sand3` were each the FIRST of a pair and resolved `undefined`.
  // Adventure-flow-and-map-guidance T1 narrows every enclosure to its
  // easier level alone, so that single id is now BOTH first and last: the
  // closing-eligible ids invert to `glass1`/`sand1`/`glass3`/`sand3`, and
  // their old, harder twins belong to no adventure at all any more — see
  // the dedicated dropped-ids describe block in `adventures.test.ts`.)
  it("resolves each entrance enclosure's own single level (its own first AND last) to its own adventure", () => {
    expect(closingLevel('glass1')?.id).toBe('peces')
    expect(closingLevel('sand1')?.id).toBe('tortugas')
    expect(closingLevel('glass3')?.id).toBe('monos')
    expect(closingLevel('sand3')?.id).toBe('sendero')
  })

  it('resolves undefined for the four dropped enclosure ids — they belong to no adventure at all after T1', () => {
    for (const id of ['glass2', 'sand2', 'glass4', 'sand4']) expect(closingLevel(id), id).toBeUndefined()
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
    // `glass3`/`sand3` are deliberately EXCLUDED from this list — T1's
    // narrowing makes each its own enclosure's only (and therefore last)
    // level, asserted above, not a mid-adventure one.
    for (const id of ['night1', 'night2', 'night3']) {
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

describe('the hedgehog adventure (radial-spines, design.md §8.2)', () => {
  const hedgehog = ADVENTURES.find((a) => a.id === 'hedgehog')!

  it('declares animal:"erizo" and no closingBeat', () => {
    expect(hedgehog.animal).toBe('erizo')
    expect(hedgehog.closingBeat).toBeUndefined()
  })

  it('carries the four hedgehog levels, in order, in the nocturna sector', () => {
    expect(hedgehog.levelIds).toEqual(['hedgehog1', 'hedgehog2', 'hedgehog3', 'hedgehog4'])
    expect(hedgehog.sector).toBe('nocturna')
  })

  it('closes with the HEDGEHOG\'s own line, not night\'s, once hedgehog4 is filed', () => {
    const nocturna = SECTORS.find((s) => s.id === 'nocturna')!
    expect(mapBubble(nocturna, filed('hedgehog4'))).toEqual({
      art: ZOO_ANIMAL_ART.erizo,
      label: '¡El erizo tiene todas sus espinas!',
    })
  })
})
