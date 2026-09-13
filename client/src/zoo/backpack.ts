// The backpack registry (`docs/12` §3, §5; `docs/13` §8 assigns the
// shepherd's hat to THIS step — "el gorro a la mochila" — and defers which
// object every OTHER sector grants to paso D; that is the part this header
// used to over-state). The shape shipped empty on paso A so the HUD had one
// call site that survives paso D unchanged; row C is the first sector to
// actually grant something.
import { ANDEAN_HAT_ART, type ArtImage } from '../detective/assets'
import { isFiled, type Records, type SectorId } from './sectors'

export interface BackpackItem {
  id: string
  art: ArtImage
  /** Which sector grants it. */
  grantedBy: SectorId
  /** Every one filed ⇒ the item is in the backpack — the same declarative
   *  shape `ZooAnimal.appearsWhen` uses, for the same structural-test
   *  reason: a closure cannot be inspected by a registry↔catalog test. */
  earnedWhen: readonly string[]
}

/** One entry today: the Andean hat, the llama adventure's own shepherd
 * accessory (`docs/13` §2). `llama-peak4` rather than all eight sheep/llama
 * ids — the hat belongs to the LLAMA adventure specifically, and
 * `llama-peak4` is also the sector's own last level, so both readings land
 * on the same id. The Pulpito does not WEAR it (design.md §4.4) — a worn hat
 * needs a composited sprite that does not exist. */
export const BACKPACK_ITEMS: readonly BackpackItem[] = [
  {
    id: 'andean-hat',
    art: ANDEAN_HAT_ART,
    grantedBy: 'montanas',
    earnedWhen: ['llama-peak4'],
  },
]

export function earnedItems(records: Records): readonly BackpackItem[] {
  return BACKPACK_ITEMS.filter((item) => item.earnedWhen.every((id) => isFiled(records, id)))
}
