// Who lives where, once they are back: the one place a scene learns the story. A place
// is paper with nobody in it (a scene has no eyes, `puppet/scene/scene.test.tsx`), and its
// animals stand on it through this table, read from the same level records as the map.
// So the aquarium is empty until the fish are home, and nobody has to remember that.
//
// Pure, like the rest of `zoo/`.
import { MONKEY_FAMILY_ART, SECTOR_BACKGROUND_ART, ZOO_ANIMAL_ART, type ArtImage, type ZooAnimalId } from '../detective/assets'
import { isRescued } from './adventures'
import type { Records } from './sectors'

/** One animal standing on a place. Scene units (2000x1000), feet at (`x`, `y`), inside
 *  the central 4:3 so every screen shape shows it whole. */
export interface Resident {
  readonly animal: ZooAnimalId
  readonly art: ArtImage
  readonly x: number
  readonly y: number
  /** Height in scene units. */
  readonly h: number
  /** Faces the other way. */
  readonly flip?: boolean
  /** Bobs off the trace screen: fish in water, a bee in the air. */
  readonly bob?: number
}

const AT = (animal: ZooAnimalId, x: number, y: number, h: number, extra: Partial<Pick<Resident, 'flip' | 'bob' | 'art'>> = {}): Resident => ({
  animal,
  art: ZOO_ANIMAL_ART[animal],
  x,
  y,
  h,
  ...extra,
})

/** Keyed by the registry picture the place stands in for. */
const RESIDENTS: ReadonlyMap<string, readonly Resident[]> = new Map<string, readonly Resident[]>([
  [
    SECTOR_BACKGROUND_ART.aquarium.href,
    [
      AT('pez', 620, 300, 190, { bob: 0 }),
      AT('pez', 1010, 240, 150, { flip: true, bob: 1 }),
      AT('pez', 1380, 360, 210, { flip: true, bob: 2 }),
      AT('pez', 1160, 600, 170, { bob: 1.6 }),
      AT('pez', 760, 610, 140, { flip: true, bob: 0.8 }),
    ],
  ],
  [
    SECTOR_BACKGROUND_ART.sand.href,
    [
      AT('tortuga', 860, 800, 170),
      AT('tortuga', 1310, 868, 150, { flip: true }),
      AT('vibora', 1120, 720, 70),
    ],
  ],
  [
    SECTOR_BACKGROUND_ART.monkeys.href,
    [
      AT('mono', 420, 384, 210, { art: MONKEY_FAMILY_ART[0] }),
      AT('mono', 1204, 276, 190, { art: MONKEY_FAMILY_ART[1] }),
      AT('mono', 1590, 324, 210, { flip: true, art: MONKEY_FAMILY_ART[2] }),
    ],
  ],
  [
    SECTOR_BACKGROUND_ART.lagoon.href,
    [
      AT('pato', 1260, 900, 170, { flip: true }),
      AT('delfin', 1500, 800, 180, { flip: true, bob: 1 }),
    ],
  ],
  [SECTOR_BACKGROUND_ART.slope.href, [AT('oveja', 1160, 880, 180), AT('oveja', 1430, 912, 150, { flip: true }), AT('oveja', 760, 240, 90)]],
  [SECTOR_BACKGROUND_ART.range.href, [AT('llama', 1260, 880, 300, { flip: true })]],
  [SECTOR_BACKGROUND_ART.forest.href, [AT('abeja', 1310, 340, 90, { flip: true, bob: 0.4 })]],
  [SECTOR_BACKGROUND_ART.night.href, [AT('erizo', 1300, 910, 170, { flip: true })]],
])

/** A family stands around its hero; a single animal IS the hero of its own closing, and
 *  a second one behind it would be a twin. */
const ONE_OF_A_KIND: ReadonlySet<ZooAnimalId> = new Set<ZooAnimalId>(['pato', 'llama', 'abeja', 'erizo'])

export interface ResidentsOptions {
  /** The animal whose closing this is: it has just arrived, whatever the records say. */
  readonly arriving?: ZooAnimalId
}

/** Who stands on `place` right now. `[]` for a place nobody lives in, or whose people are
 *  still lost. A lost animal is never here: that is the whole rule. */
export function residentsOf(place: { readonly href: string }, records: Records, { arriving }: ResidentsOptions = {}): readonly Resident[] {
  return (RESIDENTS.get(place.href) ?? []).filter((r) => {
    if (r.animal === arriving) return !ONE_OF_A_KIND.has(r.animal)
    return isRescued(records, r.animal)
  })
}

/** Every place an animal can ever stand on, for a test to walk. */
export function placesOf(animal: ZooAnimalId): readonly string[] {
  return [...RESIDENTS].filter(([, list]) => list.some((r) => r.animal === animal)).map(([href]) => href)
}
