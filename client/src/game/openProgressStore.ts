// One way to open the level store, so nobody opens it a second way.
//
// `LevelProgressStore` reads `localStorage` ONCE, in its constructor, and
// serves every later read from memory. That is the right shape for a screen
// that owns it for a session — and exactly the wrong thing to construct twice,
// because the second instance never sees the first one's writes. It also has
// to be handed the one-time phase-1 copy-forward migration before anyone reads
// it, or a returning child's old progress is invisible.
//
// Both rules are easy to get half-right in two places (the app shell needs
// records to render the home; the game shell needs the store itself), so they
// live here instead.
//
// `migrateDuckCase` (design.md §6) runs the same way, alongside
// `migratePhase1`: order is irrelevant, since the two migrations share no id.
import { LevelProgressStore } from './LevelProgressStore'
import { migratePhase1 } from './migratePhase1'
import { migrateDuckCase } from './migrateDuckCase'

/**
 * A freshly-loaded store, migrated.
 *
 * Both migrations are idempotent by construction — a destination id that
 * already carries a record is never touched again — so calling this on every
 * visit to the home costs one storage read and changes nothing on later
 * calls.
 */
export function openProgressStore(): LevelProgressStore {
  const store = new LevelProgressStore()
  for (const migrated of [migratePhase1(store.all()), migrateDuckCase(store.all())]) {
    for (const [levelId, record] of Object.entries(migrated)) {
      store.save(levelId, record)
    }
  }
  return store
}
