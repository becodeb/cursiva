// In-level adventure progress projection (adventure-flow-and-map-guidance T6,
// docs/18 §4.3-§4.4). `zoo/adventures.ts` owns the ADVENTURES registry and
// the MAP-side routing/bubble decisions; this is the narrower, LEVEL-side
// question a trail screen asks: "which adventure is this, how far along it
// am I, and what have I already found?" Pure and DOM-free, the same
// convention `zoo/stars.ts` already follows — a `LevelPlay`-shaped caller
// needs this testable without a DOM, and a `renderToString`-only harness
// cannot observe a live re-render (this repo's own recurring constraint).
//
// WHY A SEPARATE FILE FROM `adventures.ts`. That module is already large
// (registry rows, the map bubble's own animal-keyed closing line, bubble
// placement geometry) and none of it needs level-side progress to answer its
// own questions. This file is the one place that reaches across BOTH
// registries `zoo/adventures.ts` (which adventure, which animal) and
// `levels/catalog.ts` (each level's own authored `clue`, if any) — a
// dependency neither of those files needs for its own concerns.
import { getLevel } from '../levels/catalog'
import type { ClueKind, ZooAnimalId } from '../detective/assets'
import { adventureFor, type AdventureId } from './adventures'
import { isFiled, type Records } from './sectors'

/** One level's own slot in its adventure's progress bar, in play order. */
export interface AdventureProgressSlot {
  levelId: string
  /** The level's own authored clue, when it has one (`levels/types.ts`'s
   *  `LevelConfig.clue`). Absent for a level with no clue art yet — docs/18
   *  §4.4's own admission ("mientras no haya arte, la barra usa una
   *  estrella"): the caller draws a star in that slot instead, never a
   *  placeholder clue it does not have. */
  clue?: ClueKind
  /** At least one approval (`zoo/sectors.ts`'s `isFiled`) — the same rule
   *  every other "has this been earned" decision in the zoo uses. */
  filed: boolean
  /** The level actually being played right now — the ONE slot a caller
   *  highlights, never inferred by the caller from `levelId` equality on
   *  its own, so a hand-built fixture can assert it directly. */
  current: boolean
}

/** A level's in-progress view of its own adventure — `null` when there is
 *  nothing worth showing a bar for at all. */
export interface AdventureProgress {
  adventureId: AdventureId
  /** Absent for an animal-less adventure (the entrance's four enclosures,
   *  the night sector) — `AdventureSubject`'s own union, `zoo/adventures.ts`.
   *  A caller that wants an "encounter" end-cap only draws one when this is
   *  present; there is no icon fallback here; the entrance's own rows are
   *  excluded before this field would ever matter (see `adventureProgress`'s
   *  single-level guard below). */
  animal?: ZooAnimalId
  /** One entry per level of the adventure, in `ADVENTURES`' own play order. */
  slots: readonly AdventureProgressSlot[]
  /** Every slot filed — the adventure's animal (when it has one) now stands
   *  in the zoo, or an animal-less adventure's own last level is done. */
  rescued: boolean
}

/**
 * A level's own adventure progress, or `null` when there is nothing to show:
 * the level belongs to no `ADVENTURES` row at all (the medusa's `f2-*` block,
 * the hen's pre-existing `trail1..4` detective case — neither is an
 * `ADVENTURES` entry), or its row carries a single level (every entrance
 * enclosure, `glass1`/`sand1`/`glass3`/`sand3` after T1) — a "1 of 1" bar
 * would say nothing a child does not already know from having just walked in
 * the door.
 *
 * `records` is read only through `isFiled` (approvals-based, the same rule
 * `zoo/sectors.ts` uses everywhere else) — never through arc-progress or any
 * other run-local signal, which is what makes this safe to recompute from
 * scratch on every call: `GameScreen`'s own `version` bump after `onAttempt`
 * is saved is what feeds this fresh `records` snapshot back down, and a
 * level's OWN slot resolves `filed: true` the instant that save lands.
 */
export function adventureProgress(levelId: string, records: Records): AdventureProgress | null {
  const adventure = adventureFor(levelId)
  if (!adventure || adventure.levelIds.length <= 1) return null
  const slots: AdventureProgressSlot[] = adventure.levelIds.map((id) => ({
    levelId: id,
    clue: getLevel(id).clue?.kind,
    filed: isFiled(records, id),
    current: id === levelId,
  }))
  return {
    adventureId: adventure.id,
    animal: adventure.animal,
    slots,
    rescued: slots.every((slot) => slot.filed),
  }
}
