// Fluency pillar (docs/02 section 5.3) — the reason this app can tell WRITING
// from DRAWING:
//
//   levantamientos = cantidad de trazos usados − trazos permitidos por el nivel
//   regularidad    = lo parejo de la velocidad, medido en ventanas de tiempo
//   giros bruscos  = cambios bruscos de dirección que el modelo no tiene
//   Fluidez        = clamp(100 · regularidad · (1 − giros) − 25 · levantamientos, 0, 100)
//
// "Un trazo con precisión 95 y fluidez 30 es un chico DIBUJANDO la letra a
// tirones. Sin esta métrica, la app lo aprobaría y estaría reforzando el
// problema que vino a resolver."
//
// Two defects this replaces (`docs/25` P1-1): speed was read between consecutive
// events, so the same clean stroke scored 32 on one device and 97 on another; and
// only speed was read, so a zigzag at an even pace scored high. Speed is now read
// in windows far longer than any event gap, and direction is read along the
// stroke's own arc, so neither depends on how often the device reports.
//
// Pure and DOM-free: it reads only the captured point list, so it runs under
// vitest in node like every other pillar. Calibrated on simulated strokes only:
// real tablets and real five-year-olds are still owed (`docs/25` 4.1).
import type { TracePoint } from '../useTraceInput'

export interface FluencyResult {
  /** 0-100 (integer): was it one continuous, evenly-paced movement? */
  fluency: number
  /** Pen lifts BEYOND what the level allows. 0 when the level allows lifts. */
  extraLifts: number
}

export interface FluencyOptions {
  /** Abrupt turns the model path itself has (the cusp of an `a`, the stems of an
   *  `m`): a stroke that follows the shape is never charged for them. */
  expectedTurns?: number
}

interface PlainPoint {
  readonly x: number
  readonly y: number
}

/** A stroke shorter than this contributes no usable speed samples. */
const MIN_STROKE_POINTS = 3
/** Cost in fluency points of each pen lift beyond the level's allowance. */
const LIFT_COST = 25
/** Far longer than any event gap (8-33 ms), short enough to see a real stop. */
const SPEED_WINDOW_MS = 120
/** What a capture with no clock is assumed to have run at. */
const FALLBACK_EVENT_MS = 16
/** Speed variation under this is sampling noise, not the hand. */
const SPEED_NOISE_FLOOR = 0.1
/** Variation (above the floor) that takes regularity to zero. A five-year-old's
 *  stroke runs well under it: slowing into curves is how hands move. */
const SPEED_SPREAD_LIMIT = 1.4
/** Arc spacing that direction is read at: independent of the event rate. */
const TURN_STEP = 5
/** How far back and ahead a heading looks, in steps: wobble inside it averages out. */
const TURN_LEVER_STEPS = 4
/** Sharper than this over the lever is a corner, not a curve. */
const ABRUPT_TURN_DEG = 100
/** Unexplained turns per 100 units a shaky hand may still make at no cost... */
const TURNS_FORGIVEN_PER_100 = 0.12
/** ...and the rate that takes the score to zero: a zigzag runs near 0.9. */
const TURNS_LIMIT_PER_100 = 0.6

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v))
}

function arcLength(points: ReadonlyArray<PlainPoint>): number {
  let total = 0
  for (let i = 1; i < points.length; i++) {
    total += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y)
  }
  return total
}

/** Equally spaced points along the line: the same stroke gives the same list
 *  whatever rate the device reported it at. */
export function evenlyAlongArc(points: ReadonlyArray<PlainPoint>, step: number): PlainPoint[] {
  if (points.length === 0) return []
  const out: PlainPoint[] = [points[0]]
  let carried = 0
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]
    const b = points[i]
    const span = Math.hypot(b.x - a.x, b.y - a.y)
    if (span === 0) continue
    let at = step - carried
    while (at <= span) {
      const f = at / span
      out.push({ x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f })
      at += step
    }
    carried = (carried + span) % step
  }
  return out
}

/** How many sharp corners a line has, each counted once however long it lasts. */
export function abruptTurnCount(points: ReadonlyArray<PlainPoint>): number {
  const even = evenlyAlongArc(points, TURN_STEP)
  const lever = TURN_LEVER_STEPS
  const limit = Math.cos((ABRUPT_TURN_DEG * Math.PI) / 180)
  let turns = 0
  let inTurn = false
  for (let i = lever; i + lever < even.length; i++) {
    const ax = even[i].x - even[i - lever].x
    const ay = even[i].y - even[i - lever].y
    const bx = even[i + lever].x - even[i].x
    const by = even[i + lever].y - even[i].y
    const size = Math.hypot(ax, ay) * Math.hypot(bx, by)
    const sharp = size > 0 && (ax * bx + ay * by) / size < limit
    if (sharp && !inTurn) turns++
    inTurn = sharp
  }
  return turns
}

/** Distance covered per fixed window of time, spread evenly over each event gap.
 *  The first and last windows are the finger landing and leaving: not a pace. */
function windowSpeeds(stroke: ReadonlyArray<TracePoint>): number[] {
  const windows: number[] = []
  let clock = 0
  for (let i = 1; i < stroke.length; i++) {
    const prev = stroke[i - 1]
    const curr = stroke[i]
    const reported =
      typeof curr.t === 'number' && typeof prev.t === 'number' ? Math.max(0, curr.t - prev.t) : FALLBACK_EVENT_MS
    const distance = Math.hypot(curr.x - prev.x, curr.y - prev.y)
    if (reported === 0) {
      const at = Math.floor(clock / SPEED_WINDOW_MS)
      windows[at] = (windows[at] ?? 0) + distance
      continue
    }
    const rate = distance / reported
    let left = reported
    while (left > 0) {
      const at = Math.floor(clock / SPEED_WINDOW_MS)
      const slice = Math.min(left, (at + 1) * SPEED_WINDOW_MS - clock)
      windows[at] = (windows[at] ?? 0) + rate * slice
      clock += slice
      left -= slice
    }
  }
  const whole = Array.from(windows, (w) => w ?? 0)
  // A window the stroke ended partway through says nothing about its pace.
  const finished = clock % SPEED_WINDOW_MS === 0 ? whole : whole.slice(0, -1)
  return finished.length >= 4 ? finished.slice(1, -1) : finished
}

function speedRegularity(strokes: ReadonlyArray<ReadonlyArray<TracePoint>>): number {
  const speeds = strokes.flatMap(windowSpeeds)
  if (speeds.length < 2) return 1
  const mean = speeds.reduce((a, b) => a + b, 0) / speeds.length
  if (mean <= 0) return 0
  const variance = speeds.reduce((acc, s) => acc + (s - mean) ** 2, 0) / speeds.length
  const spread = Math.sqrt(variance) / mean
  return clamp(1 - Math.max(0, spread - SPEED_NOISE_FLOOR) / SPEED_SPREAD_LIMIT, 0, 1)
}

/**
 * Score the fluency of an attempt.
 *
 * `strokes` are the captured strokes in temporal order; `allowedStrokes` is how
 * many the level permits (1 for a `mustBeContinuous` level, otherwise however
 * many were used, which makes `extraLifts` 0 by construction).
 *
 * `TracePoint.t` is the capture timestamp in ms; when the browser or a test omits
 * it, events are assumed evenly spaced in time, which degrades gracefully into
 * SPACING regularity. A resting finger counts as what it is, a pause, but a
 * window of pause costs far less than a stroke made of them.
 */
export function fluencyScore(
  strokes: ReadonlyArray<ReadonlyArray<TracePoint>>,
  allowedStrokes: number,
  options: FluencyOptions = {},
): FluencyResult {
  const extraLifts = Math.max(0, strokes.length - allowedStrokes)

  // A 1-2 point stroke (a tap, a stray dot) has no movement to measure.
  const usable = strokes.filter((stroke) => stroke.length >= MIN_STROKE_POINTS)
  const drawn = usable.reduce((sum, stroke) => sum + arcLength(stroke), 0)
  if (usable.length === 0 || drawn === 0) return { fluency: 0, extraLifts }

  const turns = usable.reduce((sum, stroke) => sum + abruptTurnCount(stroke), 0)
  const unexplained = Math.max(0, turns - (options.expectedTurns ?? 0))
  const rate = (unexplained / drawn) * 100
  const steadiness = clamp(
    1 - (rate - TURNS_FORGIVEN_PER_100) / (TURNS_LIMIT_PER_100 - TURNS_FORGIVEN_PER_100),
    0,
    1,
  )

  const fluency = clamp(100 * speedRegularity(usable) * steadiness - LIFT_COST * extraLifts, 0, 100)
  return { fluency: Math.round(fluency), extraLifts }
}
