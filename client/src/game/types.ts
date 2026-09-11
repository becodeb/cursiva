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
