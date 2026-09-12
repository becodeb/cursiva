// The backpack registry (`docs/12` §3, §5; `docs/13` §8 defers WHICH object
// each sector grants to paso D). The shape ships now so the HUD has one call
// site that survives paso D unchanged; the contents are paso D's decision —
// shipping a registry with nothing in it is not a stub standing in for
// content, it is the true state of the world on paso A: no sector has
// granted anything yet, because no sector but the estanque is even open.
import type { ArtImage } from '../detective/assets'
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

/** Deliberately EMPTY. */
export const BACKPACK_ITEMS: readonly BackpackItem[] = []

export function earnedItems(records: Records): readonly BackpackItem[] {
  return BACKPACK_ITEMS.filter((item) => item.earnedWhen.every((id) => isFiled(records, id)))
}
