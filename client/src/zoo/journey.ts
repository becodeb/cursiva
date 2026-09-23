// The map's own sense of "where next" (`docs/18_DIAGNOSTICO_Y_REDISENO_
// PEDAGOGICO.md` D4/D5/D28; adventure-flow-and-map-guidance T4). A SEPARATE
// order from `zoo/sectors.ts`'s per-sector `adventureIds` (which only
// decides play order WITHIN one sector, via `nextAdventure`): a sector can
// hold several stops of this story (the estanque holds three — the duck,
// the fish, and the dolphin), and the guide only moves on to a sector's
// LATER stop once every stop ahead of it, sector by sector, is done.
//
// This is the fix for a real, observed defect (`odd/tasks/adventure-flow-
// and-map-guidance.md`, "2026-09-23"): the estanque opens second, right
// after the entrance, and `zoo/sectors.ts`'s `recentlyDiscovered` — built for
// the fog-fade animation, not for narration — falls back to "the first OPEN
// sector with any unfinished adventure, in REGISTRY order" whenever nothing
// is untouched. Once the child had done the entrance and the duck but left
// the pond's fish/dolphin blocks for later (as the story intends — they
// come after the forest), that fallback kept re-electing the pond forever:
// finishing the sheep still showed "¡Encontramos al pato!" because the pond
// still had unfinished work of ITS OWN, in registry position 3 of 7, ahead
// of montañas. `nextJourneyStep` below answers a different question — not
// "which open sector has unfinished work", but "where does the STORY go
// next" — and a sector already visited for one stop simply waits its turn
// for the next one.
import { adventureFor } from './adventures'
import { isFiled, isOpen, sectorOf, type Records, type ZooSector } from './sectors'

/**
 * One stop per `ADVENTURES` row's own first level, in the order the map
 * guides a child through them — `peces` through `hedgehog`, `f2-guirnalda`
 * (the `fish` row's own first level, `zoo/adventures.ts`) included among
 * them since `promised-animals` P2. Before P2, this list carried one
 * further exception: a stop for `f2-guirnalda` PLUS the estanque's medusa
 * block, the one stop in the whole registry with no `ADVENTURES` row of its
 * own. That exception is gone from shipped data now that `fish` claims it —
 * see `stepLevelIds`'s own header for the generic "no-row block" mechanism
 * it used to exercise, kept for a hypothetical future one.
 * `journey.test.ts`'s own guard test derives this exact set FROM
 * `ADVENTURES` and `SECTORS` independently, so this literal cannot silently
 * drift from the registry it describes.
 *
 * Sector membership is deliberately NOT annotated here: `zoo/sectors.ts`'s
 * own `sectorOf` already answers "which sector owns this level id" from the
 * SAME `adventureIds` arrays this list's own guard test reads, so repeating
 * it here would be a second place to keep in sync for no benefit.
 */
export const JOURNEY: readonly string[] = [
  'glass1',
  'sand1',
  'glass3',
  'sand3',
  'duck-trail1',
  'sheep-hill1',
  'llama-peak1',
  'night1',
  'hedgehog1',
  'snake1',
  'bee1',
  'f2-guirnalda',
  'dolphin1',
]

/**
 * The full id set one `JOURNEY` stop represents, for the "still has an
 * unfiled level" test below: an `ADVENTURES` row's own `levelIds` when one
 * claims the stop, or — for a stop no row claims — the contiguous run of
 * EQUALLY unclaimed ids starting at it inside its own sector's
 * `adventureIds`, stopping at the next id an `ADVENTURES` row DOES claim.
 * Derived rather than a second hardcoded id list, so a future no-row block
 * needs no change here to be understood correctly.
 *
 * `f2-guirnalda` used to be the one live example of that second branch —
 * the estanque's medusa block, claimed by no row — until `promised-animals`
 * P2 gave it the `fish` row. No shipped `JOURNEY` stop exercises the no-row
 * branch any more (every stop's `adventureFor` now resolves), so this
 * function's own fallback path is, for today's data, unreachable — kept
 * generic rather than deleted, the same call `screen/GameScreen.ts`'s
 * `nextInSectorBlock` makes for the identical reason, in case a future
 * sector-owned block ships with no `ADVENTURES` row of its own again.
 */
function stepLevelIds(entryLevel: string): readonly string[] {
  const claimed = adventureFor(entryLevel)
  if (claimed) return claimed.levelIds
  const sector = sectorOf(entryLevel)
  const ids = sector?.adventureIds ?? [entryLevel]
  const start = ids.indexOf(entryLevel)
  if (start < 0) return [entryLevel]
  const block = [ids[start]]
  for (let i = start + 1; i < ids.length && !adventureFor(ids[i]); i++) block.push(ids[i])
  return block
}

export interface JourneyStep {
  /** The level `resolveEnterAction` (`screen/GameScreen.tsx`) expects when
   *  this stop's sector is entered — always some adventure's or block's own
   *  first level. */
  entryLevel: string
  sector: ZooSector
}

/**
 * The child's next destination, in `JOURNEY` order: the first stop whose
 * sector is open and whose own levels are not all filed yet — or `null`
 * once every stop still ahead is either locked behind a sector that has not
 * opened, or already finished. Pure over `records`, the same shape
 * `recentlyDiscovered` (`zoo/sectors.ts`) uses — but ordered by the STORY
 * rather than by registry position, which is the fix this module exists
 * for (see the file header).
 */
export function nextJourneyStep(records: Records): JourneyStep | null {
  for (const entryLevel of JOURNEY) {
    const sector = sectorOf(entryLevel)
    if (!sector || !isOpen(sector, records)) continue
    if (stepLevelIds(entryLevel).some((id) => !isFiled(records, id))) {
      return { entryLevel, sector }
    }
  }
  return null
}
