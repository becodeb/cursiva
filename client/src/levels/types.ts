// Level model (docs/08_MOTOR_DE_NIVELES.md). One engine drives all five
// pedagogical phases: a maze path, a pre-cursive pattern, a single letter and
// a whole word are the same thing to the engine — a target path, a corridor
// width and a set of rules.
import type { LetterCheckpoint } from '../letters/types'

export type Phase = 1 | 2 | 3 | 4 | 5

/**
 * What the child is doing on the surface.
 * `free`  — no target at all: open scribbling to warm up the whole arm.
 * `path`  — follow a target route (every other level).
 */
export type LevelKind = 'free' | 'path'

/**
 * The paper under the trace.
 * `blank` — an empty sheet. Phases 1-2 train visuomotor control and rhythm;
 *           the writing rules mean NOTHING there and are pure visual noise
 *           against docs/01 principle 1 (controlled cognitive load).
 * `ruled` — the three-zone pauta. Only from phase 3, where zone is the lesson.
 */
export type Surface = 'blank' | 'ruled'

export interface LevelRules {
  /** true = one single stroke; lifting the finger fails the fluency pillar. */
  mustBeContinuous: boolean
  /** true = checkpoints must activate strictly 1..N (stroke direction matters). */
  enforceOrder: boolean
  /** minimum fluency (0-100) required to pass. 0 disables the pillar. */
  minFluency: number
  /** minimum accuracy (0-100) required to pass. */
  minAccuracy: number
}

/**
 * A hazard that travels across the route and must be TIMED, not outrun.
 * This is the clearest inhibition task phase 1 can offer: approach, stop,
 * wait for the gap, go. A corner only asks the child to turn; a moving ball
 * asks them to hold still on purpose, which is the harder and more useful skill.
 */
export interface Obstacle {
  /** Where it sits on the route, 0..1 by arc length. */
  at: number
  /** Peak-to-peak travel, perpendicular to the route, in viewBox units. */
  travel: number
  /** Milliseconds for one full out-and-back cycle. */
  periodMs: number
  /** Cycle offset 0..1, so two hazards are never in step. */
  phase: number
  /** Contact radius. */
  radius: number
}

/** Corridor width multiplier along the route — "el sendero se estrecha". */
export interface Taper {
  /** multiplier at the start of the path. */
  from: number
  /** multiplier at the end. */
  to: number
}

/** Live feedback while the finger moves (docs/01 principle 2). */
export interface LevelFeedback {
  /** Soft sustained tone while inside the corridor; silence when outside. */
  tone: boolean
  /** navigator.vibrate pulse on leaving the corridor. Best-effort. */
  haptics: boolean
  /** Rhythm cue in beats per minute; 0 = off. Phase 2 only. */
  metronomeBpm: number
  /** Magnetize the ink toward the ideal route (docs/03 section 6, "riel asistido"). */
  rail: boolean
}

/** Authored level content. Everything jugable is data; the engine never changes. */
export interface LevelConfig {
  id: string
  phase: Phase
  title: string
  /** `free` levels have no target path and are scored on coverage, not accuracy. */
  kind: LevelKind
  /** Blank sheet for phases 1-2; ruled pauta from phase 3. */
  surface: Surface
  /** Render the corridor as walls knocked out of a solid field (a real maze). */
  maze: boolean
  /** Optional narrowing along the route. Absent = constant width. */
  taper?: Taper
  /** Timed hazards crossing the route. Empty/absent = none. */
  obstacles?: Obstacle[]
  /**
   * Touching a wall or a hazard sends the child back to the start of the route.
   *
   * This is a RULE, not a punishment: no score penalty, no red mark, no sound
   * of failure — the run simply begins again. It is what makes precision matter
   * moment to moment instead of only at the end, and it keeps faith with
   * docs/01 principle 2, which forbids scolding, not consequences.
   */
  resetOnContact: boolean
  /**
   * Draw a character riding the fingertip. The task stops being "trace a line"
   * and becomes "carry someone across without bumping the walls", which is the
   * same motor demand wrapped in an intention a six-year-old already has.
   */
  carrier: boolean
  feedback: LevelFeedback
  /** Spoken-style instruction, imperative and short. */
  hint: string
  /** Target path(s). Multiple entries = pen-lift segments (letter dots/bars). */
  paths: string[]
  /** Nominal corridor width in viewBox units. */
  corridorWidth: number
  rules: LevelRules
  /** false = no visible guide; the child traces from motor memory (phase 5). */
  showGuide: boolean
  /** Characters composing the level; empty for phases 1-2. */
  letters: string[]
  /** Animated demonstration before the attempt. */
  demo?: boolean
}

/** Runtime target derived from a LevelConfig at load time. */
export interface LevelTarget {
  config: LevelConfig
  /**
   * The config paths after horizontal centring in the 1000-wide viewBox. Every
   * other derived field comes from THESE, so the screen must render them too —
   * rendering `config.paths` instead would draw a corridor the engine does not
   * score against.
   */
  paths: string[]
  /**
   * Width of the normalized viewBox for this level: 1000, or wider when the
   * level's own path needs more paper (docs/02 section 3). The HEIGHT is always
   * 600 — the ruled zones never move.
   */
  viewBoxWidth: number
  /** Effective corridor width after adaptive tolerance. */
  corridorWidth: number
  /** Dense point band around the path — the accuracy scoring cloud. */
  ideal: ReadonlyArray<readonly [number, number]>
  /** Ordered activation zones along the path. */
  checkpoints: LetterCheckpoint[]
  /** Polyline of the main path, for the start marker and direction arrow. */
  polyline: Array<{ x: number; y: number }>
  /** Total arc length of the main path. */
  length: number
}
