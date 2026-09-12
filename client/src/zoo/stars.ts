// Star derivation (proposal OD1, design.md §2 "OD1"). `docs/12` §1 asks for a
// star count and names it a SUM over existing records with no source of its
// own — `LevelRecord` carries no star field. This derives one, rather than
// inventing new persisted state or a fresh quality threshold: one star per
// approval, capped at `APPROVALS_TO_UNLOCK` (2) per level.
//
// Recorded tension, not hidden (design.md §2): `docs/12` §1 says advance and
// stars "son dos cosas distintas y no se mezclan", and `approvals` ARE
// advance. This rule deliberately conflates them for now, as a placeholder
// paso D is expected to replace once the backpack defines what a star costs.
// It is cheap to undo — one pure function, one call site (`ZooMap`'s HUD),
// writes nothing — which is what makes the conflation acceptable today.
import { APPROVALS_TO_UNLOCK, type LevelRecord } from '../game/types'
import { REAL_LEVEL_IDS, type Records } from './sectors'

export function starsFor(record: LevelRecord): number {
  return Math.min(record.approvals, APPROVALS_TO_UNLOCK)
}

/**
 * Sums `starsFor` only over records whose key is a REAL catalog level id.
 * `LevelProgressStore` keys by arbitrary string and re-serialises unknown ids
 * untouched, which is why a `<caseId>-deduce` pseudo-record (e.g.
 * `duck-deduce`) can sit in a real child's `cursiva.levels.v1` today with
 * `approvals: 1` — without this filter the star count would be inflated by a
 * screen the child never sees.
 */
export function totalStars(records: Records): number {
  let total = 0
  for (const [id, record] of Object.entries(records)) {
    if (REAL_LEVEL_IDS.has(id)) total += starsFor(record)
  }
  return total
}
