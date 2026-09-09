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
