// The adventure registry (`docs/13_AVENTURAS_POR_ANIMAL.md` §2, §5;
// duck-undulations-and-sector-backdrop design.md §3.3-§5). One row per
// animal: which levels belong to it, in play order, which sector it lives
// in, and the two lines the Pulpito says about it — before it starts and
// once its animal is standing in the zoo. Rows C-H each add ONE entry here
// and change no code (`docs/13` §4 decision 2, "la unidad es la aventura").
//
// Pure, no React — the same convention `zoo/sectors.ts` and `zoo/stars.ts`
// already follow, so every decision here is testable with no DOM.
import type { AnimalId, ArtImage } from '../detective/assets'
import { ANIMAL_ART, ZOO_OCTOPUS_PRINT_ART } from '../detective/assets'
import { animalPlacements, type Records, type SectorId, type ZooSector } from './sectors'

export interface Adventure {
  /** In play order. `levelIds[0]` is where the narrative entry shows
   *  (`introLevel`). */
  levelIds: readonly string[]
  sector: SectorId
  animal: AnimalId
  /** The Pulpito's line on the entry screen, before the adventure starts. */
  intro: string
  /** His line on the map once this adventure's animal is standing in the
   *  zoo (`zoo-map` spec, "Octopus Phrase Reads as a Closing"). */
  closing: string
}

export const ADVENTURES: readonly Adventure[] = [
  {
    levelIds: ['duck-trail1', 'duck-trail2', 'duck-trail3', 'duck-trail4'],
    sector: 'estanque',
    animal: 'pato',
    intro: 'El pato se fue por la laguna. ¿Lo seguimos?',
    closing: '¡Encontramos al pato! Ya está en su laguna.',
  },
]

/** The adventure a level belongs to, or `undefined` for a level no
 *  adventure has claimed yet — today everything but the four duck ids. */
export function adventureFor(levelId: string): Adventure | undefined {
  return ADVENTURES.find((a) => a.levelIds.includes(levelId))
}

/** True only for `levelIds[0]` of SOME adventure — the narrative entry
 *  belongs to the ADVENTURE, not to each challenge (`docs/13` §5 item 1). A
 *  level that belongs to no adventure, or that belongs to one but is not
 *  its first level, resolves `undefined`. */
export function introLevel(levelId: string): Adventure | undefined {
  const adventure = adventureFor(levelId)
  return adventure && adventure.levelIds[0] === levelId ? adventure : undefined
}

/** What the Pulpito says about the sector the huellas point at, and the
 *  picture that goes with it — the word never travels alone (`docs/12`
 *  §3). Before the sector's own adventure is done, the constant
 *  onward-pointing line the map already shipped; once the adventure's
 *  animal is standing in the zoo, the line CLOSES it instead
 *  (`docs/13` §5 item 6) and the picture becomes the recovered animal. */
const ONWARD = {
  art: ZOO_OCTOPUS_PRINT_ART,
  label: '¡Mirá! Las huellas van hacia allá. ¿Vamos?',
} as const

export function mapBubble(
  sector: ZooSector,
  records: Records,
): { art: ArtImage; label: string } {
  const recovered = ADVENTURES.find(
    (a) =>
      a.sector === sector.id &&
      animalPlacements(sector, records).some((p) => p.art === ANIMAL_ART[a.animal]),
  )
  return recovered ? { art: ANIMAL_ART[recovered.animal], label: recovered.closing } : ONWARD
}
