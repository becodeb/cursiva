// Game-flow model (docs/03, docs/08). Three independent pillars, never an
// average: a child with high accuracy and low fluency is DRAWING the letter,
// and that is exactly the problem the app exists to detect.
export interface PillarScores {
  /** 0-100: did the stroke stay inside the corridor? (visuomotor control) */
  accuracy: number
  /** did the checkpoints activate in order, without an inverted turn? */
  directionOk: boolean
  /** true when a higher-order checkpoint was hit early (inverted turn). */
  wrongDirection: boolean
  /** 0-100: was it one continuous, evenly-paced movement? (automation) */
  fluency: number
  /** number of pen lifts beyond what the level allows. */
  extraLifts: number
}

export interface LevelAttempt extends PillarScores {
  approved: boolean
  /** which rule blocked approval, for the coaching message. */
  failedPillar: 'accuracy' | 'direction' | 'fluency' | null
}

/** Persisted per-level state. */
export interface LevelRecord {
  bestAccuracy: number
  bestFluency: number
  attempts: number
  /** total approvals ever. 2 approvals unlock the next level. */
  approvals: number
  /** consecutive failures — drives adaptive tolerance. */
  streakFail: number
  /** consecutive approvals. */
  streakPass: number
  /** accumulated corridor multiplier, 1 = nominal, capped [0.7, 2]. */
  widthFactor: number
}

export const EMPTY_RECORD: LevelRecord = {
  bestAccuracy: 0,
  bestFluency: 0,
  attempts: 0,
  approvals: 0,
  streakFail: 0,
  streakPass: 0,
  widthFactor: 1,
}

/** Approvals needed to unlock the next level (one pass can be luck). */
export const APPROVALS_TO_UNLOCK = 2

/**
 * The four detective-mode trail ids, in play order (design.md "Migration /
 * Rollout": `f1-travesia→trail1`, `f1-pelotas→trail2`, `f1-paseo→trail3`,
 * `f1-pasillo→trail4`). Lives here — not in `screen/GameScreen.tsx`, where it
 * was first declared (S4) — because `game/migratePhase1.ts` (S5) needs the
 * exact same list and `game/` cannot import from `screen/` without a cycle
 * (`GameScreen.tsx` imports the migration). `GameScreen.tsx` re-exports this
 * constant so its own existing call sites and tests need no change.
 *
 * Named here rather than derived from `LEVELS.filter(l => l.clue)` because
 * the catalog does not carry these four trail entries yet (Phase 10 / S6,
 * still out of scope for S5) — this list names the ids that slice WILL
 * create, using the same ids `migratePhase1.ts`'s `PHASE_1_FORWARD` migrates
 * progress into, so both S5 and the existing S4 code compile and are fully
 * testable today, and need no edit once the catalog lands the real levels.
 */
export const DETECTIVE_TRAIL_IDS: readonly string[] = ['trail1', 'trail2', 'trail3', 'trail4']

/**
 * The duck case's four trail ids, in play order (design.md §3 "The duck
 * case's four levels"). Lives here rather than in `detective/cases.ts`
 * because `game/migrateDuckCase.ts` needs this exact list before the
 * catalog gains the four `LevelConfig`s (Phase 1 ships before Phase 2 —
 * design.md §6 "D4's accepted cost"), and `game/` cannot import
 * `detective/cases.ts` without dragging the whole catalog-backed case
 * registry in.
 */
export const DUCK_TRAIL_IDS: readonly string[] = [
  'duck-trail1',
  'duck-trail2',
  'duck-trail3',
  'duck-trail4',
]

/**
 * Nivel 3's three new water-trail ids (desafíos 2-4), in play order
 * (design.md §3 "The four levels" / §7 "migrateNivel3.ts"). Lives here rather
 * than in `levels/catalog.ts` for the same reason `DUCK_TRAIL_IDS` does:
 * `game/migrateNivel3.ts` needs this exact list BEFORE the catalog gains the
 * three `LevelConfig`s (S2 ships before S7 — design.md §7, D7).
 *
 * MUST NOT include `'f2-guirnalda'`: that id is the migration's SOURCE
 * (`NIVEL3_PREDECESSOR_ID`), already present in `records` by the migration's
 * own first guard. Putting it in this destination set too would make the
 * migration's second guard ("none of the destinations has a record yet")
 * true on the very first run, and the migration would silently write
 * nothing.
 */
export const NIVEL3_TRAIL_IDS: readonly string[] = ['f2-agua2', 'f2-agua3', 'f2-agua4']

/**
 * The duck case's own `<caseId>-deduce` pseudo-id (level-engine spec "Duck
 * Case Positional-Unlock Migration"; `detective/cases.ts`'s `caseSolvedId`
 * computes the exact same string as `caseSolvedId('duck')`, quoted here
 * literally rather than imported — `game/migrateDuckCase.ts` needs it before
 * the catalog gains the duck's `LevelConfig`s, and `game/` cannot import
 * `detective/cases.ts` without dragging that catalog dependency in, the same
 * reason `DUCK_TRAIL_IDS` lives here instead of in `detective/cases.ts`). */
export const DUCK_CASE_SOLVED_ID = 'duck-deduce'
