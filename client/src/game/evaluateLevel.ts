// Attempt evaluation (docs/08 section 3, docs/02 section 5) — the one engine
// every phase shares. A maze path, a pre-cursive garland, a letter and a whole
// word are the same thing here: a target path, a corridor width and a set of
// rules.
//
//   aprobado = precisión ≥ minAccuracy
//            ∧ (¬enforceOrder ∨ (orden correcto ∧ ¬giro invertido))
//            ∧ (¬mustBeContinuous ∨ un solo trazo)
//            ∧ fluidez ≥ minFluency
//
// The three pillars are returned as THREE INDEPENDENT NUMBERS, never an
// average: a child with high accuracy and low fluency is drawing the letter,
// and that is exactly the problem this app exists to detect (docs/02 5.3).
import { resample } from '../canvas/resample'
import { checkCheckpointOrder } from '../canvas/validation/checkpoints'
import { K, TolPen, TolTouch } from '../canvas/validation/constants'
import { fluencyScore } from '../canvas/validation/fluency'
import { score } from '../canvas/validation/score'
import type { TracePoint } from '../canvas/useTraceInput'
import { revealScore } from '../levels/revealGrid'
import type { LevelTarget } from '../levels/types'
import type { LevelAttempt } from './types'

/**
 * Corridor width the DESIGN-FIXED tolerances were calibrated against (the
 * letter pipeline's ±8px band inside a ~80px letter corridor). A level's
 * tolerance scales linearly from here.
 */
const REFERENCE_CORRIDOR = 80

/**
 * Bounds on `corridorWidth / REFERENCE_CORRIDOR` (docs/02 section 5.1).
 *
 * FLOOR — a narrow corridor makes the SHAPE legible (a 40px channel is what
 * lets an `a` still read as an `a`); it must not also make the level
 * impossible. Unclamped, a 40px corridor would score a touch attempt at
 * `26 · 0.5 = 13` viewBox units, i.e. STRICTER than the stylus tolerance, for a
 * six-year-old's fingertip. `docs/01` principle 3 forbids exactly that
 * frustration, and `docs/02` 5.1 already says it outright: the finger of a
 * six-year-old is not a stylus. 0.7 keeps touch at ~18 units, comfortably above
 * `TolPen`.
 *
 * CEILING — the adaptive widening (docs/02 section 6) can reach a 260px
 * corridor; past 2.5 the cloud is so forgiving that any scribble in the
 * neighbourhood scores 100 and the accuracy pillar stops meaning anything.
 */
const MIN_TOLERANCE_SCALE = 0.7
const MAX_TOLERANCE_SCALE = 2.5

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v))
}

/**
 * Accuracy tolerance for a level: the design-fixed pointer tolerance scaled by
 * the corridor, clamped to `[0.7, 2.5]`.
 */
export function toleranceFor(corridorWidth: number, pointerType: string): number {
  const scale = clamp(
    corridorWidth / REFERENCE_CORRIDOR,
    MIN_TOLERANCE_SCALE,
    MAX_TOLERANCE_SCALE,
  )
  return (pointerType === 'touch' ? TolTouch : TolPen) * scale
}

/** Nothing usable was captured: fail every pillar, blame accuracy. */
function emptyAttempt(extraLifts: number): LevelAttempt {
  return {
    accuracy: 0,
    directionOk: false,
    wrongDirection: false,
    fluency: 0,
    extraLifts,
    approved: false,
    failedPillar: 'accuracy',
  }
}

/**
 * Evaluate one attempt against a level target.
 *
 * `strokes` are the captured strokes in temporal order — one entry for a
 * continuous trace, more when the child lifted the finger. `pointerType` comes
 * straight from the pointer event: a six-year-old's finger is not a stylus
 * (docs/02 5.1), so `touch` gets the wider tolerance.
 *
 * Accuracy is scored against the level's corridor, NOT the letter-grade
 * tolerance: a phase-1 maze is 110px wide and a letter is 75px, so scoring both
 * at `TolPen` would make the wide, forgiving levels the HARDEST ones. The
 * tolerance scales with `corridorWidth / 80`, CLAMPED to `[0.7, 2.5]`
 * ({@link toleranceFor}).
 */
export function evaluateLevel(
  strokes: ReadonlyArray<ReadonlyArray<TracePoint>>,
  target: LevelTarget,
  pointerType: string,
): LevelAttempt {
  const { rules } = target.config

  // The pillars read ONE continuous point list; the stroke COUNT is what the
  // fluency pillar reads separately.
  const all: TracePoint[] = []
  for (const stroke of strokes) for (const p of stroke) all.push(p)

  const allowedStrokes = rules.mustBeContinuous ? 1 : strokes.length || 1

  // ── Nivel libre: el pilar de precisión es COBERTURA (o el veló revelado) ───
  // A `free` level has no target path (docs/08 section 5), so "did it stay on
  // the route" has no referent. What the warm-up trains is reach, so accuracy
  // reports how much of the sheet the stroke visited (`levels/coverage.ts`) —
  // or, for a reveal-grid level (`levels/revealGrid.ts`, design.md §4.3), the
  // cleared fraction or the hidden-object latch. `revealScore` delegates to
  // `coverageScore` unchanged when the level carries no `reveal` field, which
  // is what keeps `f1-libre` bit-identical. The direction pillar is satisfied
  // by construction: with no checkpoints there is no wrong way round, and
  // failing a child for it would be inventing an error the level does not
  // have (docs/01 principle 2).
  if (target.config.kind === 'free') {
    const accuracy = revealScore(strokes, target.config, target.viewBoxWidth)
    const { fluency, extraLifts } = fluencyScore(strokes, allowedStrokes)
    const accuracyOk = accuracy >= rules.minAccuracy
    const fluencyOk = fluency >= rules.minFluency
    return {
      accuracy,
      directionOk: true,
      wrongDirection: false,
      fluency,
      extraLifts,
      approved: accuracyOk && fluencyOk,
      failedPillar: accuracyOk ? (fluencyOk ? null : 'fluency') : 'accuracy',
    }
  }

  if (all.length < 2) {
    return emptyAttempt(Math.max(0, strokes.length - allowedStrokes))
  }

  // ── Pilar 1: precisión — ¿se mantuvo dentro del camino? ────────────────────
  const tolerance = toleranceFor(target.corridorWidth, pointerType)
  const accuracy = Math.round(score(resample(all, K), target.ideal, tolerance))

  // ── Pilar 2: sentido — ¿el recorrido fue en el orden correcto? ─────────────
  const order = checkCheckpointOrder(all, target.checkpoints)
  // When the level does not enforce order the pillar cannot block approval, but
  // the real flag is KEPT: an inverted turn still earns its coaching message.
  const directionOk = rules.enforceOrder ? order.orderPassed : true
  const wrongDirection = order.wrongDirection

  // ── Pilar 3: fluidez — ¿fue un movimiento o fueron muchos? ─────────────────
  const { fluency, extraLifts } = fluencyScore(strokes, allowedStrokes)

  const accuracyOk = accuracy >= rules.minAccuracy
  const orderOk = directionOk && !(rules.enforceOrder && wrongDirection)
  const fluencyOk = fluency >= rules.minFluency
  const approved = accuracyOk && orderOk && fluencyOk

  // First failing pillar, in the order the child should fix them: staying on
  // the path comes before going the right way, which comes before rhythm.
  const failedPillar: LevelAttempt['failedPillar'] = approved
    ? null
    : !accuracyOk
      ? 'accuracy'
      : !orderOk
        ? 'direction'
        : 'fluency'

  return {
    accuracy,
    directionOk,
    wrongDirection,
    fluency,
    extraLifts,
    approved,
    failedPillar,
  }
}
