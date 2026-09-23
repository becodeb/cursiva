// The map's own sense of "where next" (`docs/18_DIAGNOSTICO_Y_REDISENO_
// PEDAGOGICO.md` D4/D5/D28; adventure-flow-and-map-guidance T4). A SEPARATE
// order from `zoo/sectors.ts`'s per-sector `adventureIds` (which only
// decides play order WITHIN one sector, via `nextAdventure`): a sector can
// hold several stops of this story (the estanque holds three — the duck,
// the medusa's own block, and the dolphin), and the guide only moves on to a
// sector's LATER stop once every stop ahead of it, sector by sector, is
// done.
//
// This is the fix for a real, observed defect (`odd/tasks/adventure-flow-
// and-map-guidance.md`, "2026-09-23"): the estanque opens second, right
// after the entrance, and `zoo/sectors.ts`'s `recentlyDiscovered` — built for
// the fog-fade animation, not for narration — falls back to "the first OPEN
// sector with any unfinished adventure, in REGISTRY order" whenever nothing
// is untouched. Once the child had done the entrance and the duck but left
// the pond's medusa/dolphin blocks for later (as the story intends — they
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
 * One stop per `ADVENTURES` row's own first level (`peces` through
 * `hedgehog`), in the order the map guides a child through them, PLUS one
 * stop for the estanque's medusa block (`f2-guirnalda`) — the one stop in
 * the whole registry with no `ADVENTURES` row of its own (`zoo/adventures.ts`
 * declares no `f2` row; the four `f2-*` ids live only in `estanque`'s own
 * `adventureIds`). `journey.test.ts`'s own guard test derives this exact set
 * FROM `ADVENTURES` and `SECTORS` independently, so this literal cannot
 * silently drift from the registry it describes.
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
 * claims the stop, or — for a stop like `f2-guirnalda` that no row claims —
 * the contiguous run of EQUALLY unclaimed ids starting at it inside its own
 * sector's `adventureIds`, stopping at the next id an `ADVENTURES` row DOES
 * claim (here, `dolphin1`). Derived rather than a second hardcoded id list,
 * so a future no-row block (should one ever join the registry) needs no
 * change here to be understood correctly.
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
