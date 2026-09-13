// The backpack registry (`docs/12` §3, §5; `docs/13` §8 assigns the
// shepherd's hat to THIS step — "el gorro a la mochila" — and defers which
// object every OTHER sector grants to paso D; that is the part this header
// used to over-state). The shape shipped empty on paso A so the HUD had one
// call site that survives paso D unchanged; row C is the first sector to
// actually grant something.
import { ANDEAN_HAT_ART, CARRIER_LENS_ART, CART_ART, SECTOR_ADVENTURE_ART, type ArtImage } from '../detective/assets'
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

/** Four entries: the Andean hat (row C, `docs/13` §2), the lupa and the
 * linterna (row D, design.md §7.1), and the arena's cart (`snake-drag-and-
 * art-corridor` design.md §7.1). `llama-peak4` rather than all eight
 * sheep/llama ids for the hat — the hat belongs to the LLAMA adventure
 * specifically, and `llama-peak4` is also the sector's own last level, so
 * both readings land on the same id. Same reading for `sand4`/`night4`/
 * `snake4`: each is its own adventure's last level, and the caretaking/
 * searching story earns the tool at the exact moment the adventure closes.
 * The Pulpito does not WEAR any of them (design.md §4.4) — a worn accessory
 * needs a composited sprite that does not exist. */
export const BACKPACK_ITEMS: readonly BackpackItem[] = [
  {
    id: 'andean-hat',
    art: ANDEAN_HAT_ART,
    grantedBy: 'montanas',
    earnedWhen: ['llama-peak4'],
  },
  {
    id: 'lupa',
    art: CARRIER_LENS_ART,
    grantedBy: 'entrada',
    earnedWhen: ['sand4'],
  },
  {
    id: 'linterna',
    art: SECTOR_ADVENTURE_ART.flashlight,
    grantedBy: 'nocturna',
    earnedWhen: ['night4'],
  },
  // The arena's own reward (`snake-drag-and-art-corridor`, design.md §7.1):
  // the row's own verb is "llevarla a un lugar adecuado" — a cart to carry
  // the víboras home in.
  {
    id: 'carrito',
    art: CART_ART,
    grantedBy: 'arena',
    earnedWhen: ['snake4'],
  },
]

export function earnedItems(records: Records): readonly BackpackItem[] {
  return BACKPACK_ITEMS.filter((item) => item.earnedWhen.every((id) => isFiled(records, id)))
}
