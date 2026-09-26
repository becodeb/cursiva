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
  /** Which sector's own story this tool belongs to — NOT necessarily the
   *  sector whose level ID sits in `earnedWhen` (T23: `linterna` is granted
   *  by a `montanas` level, `llama-peak4`, precisely because it must be in
   *  the backpack BEFORE `nocturna` — its own sector — ever opens). */
  grantedBy: SectorId
  /** Every one filed ⇒ the item is in the backpack — the same declarative
   *  shape `ZooAnimal.appearsWhen` uses, for the same structural-test
   *  reason: a closure cannot be inspected by a registry↔catalog test. */
  earnedWhen: readonly string[]
  /** OR-widened alternative to `earnedWhen`, checked the same way (every
   *  one filed ⇒ earned) but independently — ABSENT for every item but the
   *  lupa. Exists for a returning child who could have filed a now-dropped
   *  LEGACY id instead of `earnedWhen`'s current one (adventure-flow-and-
   *  map-guidance T1: the entrance's four-enclosure regrouping keeps only
   *  the easier level id of each pair, so `sand4` — the sendero's own old
   *  last level, and what `migrateEntrance.ts` seeds for a pre-entrance
   *  legacy child — must go on earning the lupa even though the new last
   *  level is `sand3`). Never `&&` with `earnedWhen`: either satisfied set
   *  alone is enough. */
  earnedWhenLegacy?: readonly string[]
}

/** Four entries: the Andean hat (row C, `docs/13` §2), the lupa and the
 * linterna (row D, design.md §7.1), and the arena's cart (`snake-drag-and-
 * art-corridor` design.md §7.1). The Pulpito does not WEAR any of them
 * (design.md §4.4) — a worn accessory needs a composited sprite that does
 * not exist.
 *
 * [T23, `odd/tasks/prewriting-stage-completion.md`, `docs/19` §5.1] Tools
 * are handed out BEFORE the adventure that uses them, not as a reward once
 * it is over — the pre-T23 reading below granted the hat and the linterna
 * at the exact moment they stop mattering. `andean-hat.earnedWhen` moved
 * from `['llama-peak4']` to `['sheep-hill4']`: the hat is used in the
 * LLAMA adventure but earned at the end of the SHEEP one — `docs/19` §5.1's
 * own row ("el gorro de pastor (fin de las ovejas, se usa en las
 * llamas)") — and `sheep-hill4` is filed strictly before `llama-peak4` ever
 * can be (both adventures share the `montanas` sector, sheep first in
 * `zoo/sectors.ts`'s own `adventureIds` play order). `linterna.earnedWhen`
 * moved from `['night4']` to `['llama-peak4']` — the exact level that opens
 * `nocturna` (`zoo/sectors.ts`'s own `unlockedWhen`), so the flashlight
 * sits in the backpack the instant the night sector becomes reachable,
 * before `night1` is ever played. `sand3`/`snake4`: each is still its own
 * adventure's last level and stays unchanged (the lupa and the carrito are
 * out of this task's scope — only the hat and the linterna were reported as
 * mistimed). */
export const BACKPACK_ITEMS: readonly BackpackItem[] = [
  {
    id: 'andean-hat',
    art: ANDEAN_HAT_ART,
    grantedBy: 'montanas',
    earnedWhen: ['sheep-hill4'],
  },
  {
    id: 'lupa',
    art: CARRIER_LENS_ART,
    grantedBy: 'entrada',
    earnedWhen: ['sand3'],
    earnedWhenLegacy: ['sand4'],
  },
  {
    id: 'linterna',
    art: SECTOR_ADVENTURE_ART.flashlight,
    grantedBy: 'nocturna',
    earnedWhen: ['llama-peak4'],
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
  // The forest's own reward (`free-trail-waypoints`, design.md §9): a
  // flower kept from the bosque — the hive would be narratively wrong
  // (the bee needs it), and the flower reuses shipped art (`docs/13` §8:
  // "one object per closed sector", every shipped item reuses existing
  // art). Still the author's to override.
  {
    id: 'flor',
    art: SECTOR_ADVENTURE_ART.flower,
    grantedBy: 'bosque',
    earnedWhen: ['bee4'],
  },
]

export function earnedItems(records: Records): readonly BackpackItem[] {
  return BACKPACK_ITEMS.filter(
    (item) =>
      item.earnedWhen.every((id) => isFiled(records, id)) ||
      (item.earnedWhenLegacy?.every((id) => isFiled(records, id)) ?? false),
  )
}
