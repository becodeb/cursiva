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

/**
 * Whether the star total just went UP (prewriting-stage-completion T8 item
 * 3: the map's star counter pops and flashes so a non-reader sees they
 * earned something). `previous === null` means "no earlier total is known
 * yet" — the very first time this session has ever shown a total — and that
 * is deliberately never an increase: there is nothing to compare against, and
 * popping on the very first paint would read as decoration, not reward. A
 * DROP (the dev-only progress reset) is not an increase either.
 */
export function starsIncreased(previous: number | null, current: number): boolean {
  return previous !== null && current > previous
}

/** Session memory of the star total the child was last shown, module-scope
 *  rather than React state: `ZooMap` remounts fresh on every single map
 *  visit (`ZooMap.tsx`'s own header, "arrival/dismiss/reopen") — a `useRef`
 *  would reset to nothing on every one of those and the sparkle above could
 *  never fire. `null` until `recordSeenStars` is called for the first time
 *  this session. */
let lastSeenStars: number | null = null

/** What `recordSeenStars` last recorded, or `null` before the first call —
 *  read by `ZooMap` BEFORE calling `recordSeenStars` on the same render, so
 *  the comparison always sees the OLD value. */
export function seenStars(): number | null {
  return lastSeenStars
}

/** Call once the current total has been read and compared — updates the
 *  session memory `seenStars` returns from then on. Plain module state, so
 *  (like the map bubble's own `window.setTimeout` auto-hide) this is not
 *  observable through `renderToString`; `starsIncreased` above is the
 *  directly-testable half of the decision. */
export function recordSeenStars(total: number): void {
  lastSeenStars = total
}
