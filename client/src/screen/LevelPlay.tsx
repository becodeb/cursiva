// Level play screen (docs/04 §3.3 wireframe, docs/08 §3): one screen runs all
// five phases from data — animated demonstration, visible corridor, live
// off-path dimming, and the THREE SEPARATE pillars at release. Never a single
// grade, never red, never an error sound (docs/03 §7).
//
// Live feedback (docs/01 principle 2, docs/02 §7.2). ONE ~10 Hz off-path sample
// drives every channel: the ink dims, the corridor tone falls silent, the
// device buzzes once on the way out. Adding a second scan per channel would
// spend the frame budget the surface exists to protect, so they all hang off
// `onFrame` and nothing else.
//
// Guide withdrawal (docs/03 §3) is `guideLevelFor` below — the corridor, the
// shape line, the demonstration, the checkpoints and even the start marker are
// all functions of mastery, not one static boolean.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import TraceCanvas, {
  type DrawDemo,
  type TraceCorridor,
  type TraceHazards,
} from '../canvas/TraceCanvas'
import type { TracePoint } from '../canvas/useTraceInput'
import { contactTick, NO_CONTACT, type ResetDebounce } from '../canvas/resetOnContact'
import { buildLevelTarget } from '../levels/buildLevel'
import { hitObstacle, obstacleAt } from '../levels/obstacles'
import { evaluateLevel } from '../game/evaluateLevel'
import { coachMessage } from '../game/adaptiveTolerance'
import { playApprovalTone } from '../modes/tone'
import { createTraceTone, playBeatTick, type TraceTone } from '../canvas/traceTone'
import { pulseOnLeaving } from '../canvas/haptics'
import { railFade, railPull } from '../canvas/rail'
import { directionArrowOf } from './directionArrow'
import { goalMarkerOf } from './goalMarker'
import type { LevelConfig } from '../levels/types'
import type { LevelAttempt, LevelRecord } from '../game/types'

/** Seconds one demonstration sub-path takes, and the gap before the next one. */
const DEMO_DURATION_S = 1.6
const DEMO_STEP_S = 1.7
/** Live off-path sampling period (~10 Hz): the 60fps ink loop owns the frame. */
const OFF_PATH_PERIOD_MS = 100
/** How long the visual metronome stays swollen after a beat. Short enough to
 * read as a pulse, long enough to see at 60 BPM on a slow panel. */
const BEAT_FLASH_MS = 140

/**
 * The restart cue (`LevelConfig.resetOnContact`, docs/01 principle 2).
 *
 * Warm, neutral, and only about what to do NEXT. It does not say what went
 * wrong, because the child already felt it and naming it adds nothing but
 * blame; it is not red, there is no sound of failure, and no score moves. The
 * rule is the consequence — the sentence is just the invitation to go again.
 */
export const RESTART_MESSAGE = 'Volvé a empezar'
/** How long the restart cue stays up before the standing hint returns. */
const RESTART_CUE_MS = 2200

/** Full sheet height; the drawing band is a crop of it (docs/02 §3). */
const SHEET_HEIGHT = 600
/** The ruled pauta itself: ascender ceiling to descender floor. This band is
 * pedagogy and is ALWAYS shown — a letter is read against these lines. */
const PAUTA_TOP = 180
const PAUTA_BOTTOM = 540
/** Breathing room kept outside whatever the band ends up containing, so the
 * ink cap and the r=22 start dot are never clipped against the paper edge. */
const BAND_MARGIN = 40
/** Half the ink stroke (18) plus the start-dot radius (22): how far past a path
 * centreline the drawing can actually reach when the corridor is narrow. */
const INK_REACH = 31

/**
 * The vertical band of the sheet a level actually shows (docs/02 §3). It is the
 * ruled pauta plus a margin, WIDENED when a level's corridor genuinely leaves
 * it — phase 1/2 pattern levels ride above the ascender ceiling (`f2-bucles`
 * reaches y≈105) and below the descender floor (`f1-ondas` reaches y≈544), and
 * a fixed crop would cut their channel off.
 *
 * Cropping the dead margin is what makes the CONTAIN fit pay: it flattens the
 * aspect ratio, so on a height-constrained screen (tablet landscape, touch
 * laptop) the same height buys a much wider — therefore much bigger — sheet.
 * On a width-constrained screen (a phone held upright) the scale still comes
 * from the width and the letters do NOT grow; only empty paper is removed.
 */
function drawingBand(
  ideal: ReadonlyArray<readonly [number, number]>,
  corridorWidth: number,
): { y: number; height: number } {
  // Content bounds start empty on purpose: the pauta gets BAND_MARGIN, the
  // content gets its own corridor/ink reach, and the band is the UNION. Seeding
  // these with the pauta values instead would add the reach to the pauta too
  // and quietly give back most of the crop.
  let minY = Infinity
  let maxY = -Infinity
  for (const p of ideal) {
    if (p[1] < minY) minY = p[1]
    if (p[1] > maxY) maxY = p[1]
  }
  const reach = Math.max(corridorWidth / 2, INK_REACH) + BAND_MARGIN
  const top = Math.max(0, Math.floor(Math.min(PAUTA_TOP - BAND_MARGIN, minY - reach)))
  const bottom = Math.min(SHEET_HEIGHT, Math.ceil(Math.max(PAUTA_BOTTOM + BAND_MARGIN, maxY + reach)))
  return { y: top, height: bottom - top }
}

/**
 * Full-viewport level layout (docs/04 §3.3). The surface sets `touch-action:
 * none` so a trace is never stolen by the page scroller — which means the page
 * must not NEED scrolling, or the buttons under a tall canvas become
 * unreachable. So the level is exactly one viewport tall, the chrome rows are
 * fixed-size flex items, and the canvas is the only growing one. `min-height:0`
 * is load-bearing: without it a flex child refuses to shrink below its content
 * and the column overflows anyway.
 */
const LAYOUT_CSS = `
.cv-play, .cv-play * { box-sizing: border-box; }
html, body, #root { margin: 0; padding: 0; }
.cv-play {
  height: 100vh; /* fallback for engines without dvh */
  height: 100dvh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 16px;
  background: #faf8f5;
}
/* display:contents makes these wrappers invisible to layout, so the tall layout
 * is exactly the flat column it always was. A short viewport turns each one into
 * a single row, which is the only way two sibling rows can be merged without
 * duplicating the markup. */
.cv-top, .cv-foot { display: contents; }
.cv-head { flex: 0 0 auto; display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.cv-title { margin: 0; font-size: 24px; font-weight: 700; color: #1e293b; text-align: right; }
.cv-hint { flex: 0 0 auto; margin: 0; font-size: 28px; line-height: 1.3; color: #1e293b; }
.cv-rotate { flex: 0 0 auto; display: none; margin: 0; font-size: 15px; color: #64748b; }
.cv-sheet { flex: 1 1 auto; min-width: 0; min-height: 0; display: flex; align-items: center; justify-content: center; }
.cv-result { flex: 0 0 auto; min-height: 96px; display: flex; flex-direction: column; justify-content: center; color: #1e293b; }
.cv-pillars { display: flex; flex-wrap: wrap; gap: 28px; justify-content: center; }
.cv-pillar { display: inline-flex; align-items: baseline; gap: 8px; font-size: 24px; font-weight: 600; }
.cv-coach { margin: 8px 0 0; text-align: center; font-size: 22px; }
.cv-actions { flex: 0 0 auto; display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
.cv-btn { min-height: 64px; padding: 0 28px; border-radius: 16px; border: 1px solid #cbd5e1; background: #ffffff; color: #1e293b; font-size: 20px; font-weight: 600; cursor: pointer; }
.cv-btn-back { min-height: 56px; padding: 0 18px; }
.cv-btn-ok { background: #dcfce7; border-color: #86efac; }
.cv-btn-off { opacity: 0.45; cursor: default; }

/* Upright and narrow is genuinely width-limited: say so, do not block it. */
@media (max-width: 559px) and (orientation: portrait) { .cv-rotate { display: block; } }

/* Height-constrained but not tiny — the PRIMARY devices, a tablet in landscape
 * and a touch laptop. Full-size chrome eats ~45% of a 700px viewport, so the
 * rows tighten and the sheet takes what they give back. */
@media (max-height: 820px) {
  .cv-play { gap: 6px; padding: 8px 14px; }
  .cv-title { font-size: 20px; }
  .cv-hint { font-size: 22px; }
  .cv-result { min-height: 64px; }
  .cv-pillar { font-size: 20px; }
  .cv-coach { margin: 4px 0 0; font-size: 18px; }
  .cv-btn { min-height: 52px; padding: 0 22px; font-size: 18px; }
  .cv-btn-back { min-height: 48px; }
}

/* Short viewport: the chrome gives its room back to the canvas. Buttons stop
 * at 44px — this is a child's tap target, not a toolbar. */
@media (max-height: 520px) {
  .cv-play { gap: 4px; padding: 6px 10px; }
  .cv-title { font-size: 16px; }
  .cv-hint { font-size: 16px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .cv-rotate { font-size: 12px; }
  .cv-result { min-height: 34px; flex-direction: row; align-items: center; justify-content: center; gap: 14px; }
  .cv-pillars { flex-wrap: nowrap; gap: 14px; }
  .cv-pillar { font-size: 16px; gap: 5px; }
  .cv-coach { margin: 0; font-size: 15px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .cv-btn { min-height: 44px; padding: 0 16px; font-size: 16px; }
  .cv-btn-back { min-height: 44px; padding: 0 12px; font-size: 16px; }

  /* Two rows become one, twice. Every row reclaimed goes straight into canvas
   * height, and on a 390px-tall landscape phone that is the whole budget. */
  .cv-top, .cv-foot {
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    min-width: 0;
  }
  .cv-top { justify-content: flex-start; }
  .cv-top > .cv-head { flex: 0 0 auto; }
  .cv-title { white-space: nowrap; }
  .cv-hint { flex: 1 1 auto; min-width: 0; }
  .cv-result { flex: 0 1 auto; min-height: 0; min-width: 0; }
  .cv-actions { flex: 0 0 auto; }
}
`

export interface LevelPlayProps {
  level: LevelConfig
  record: LevelRecord
  /** Parent persists — this screen never writes storage. */
  onAttempt: (attempt: LevelAttempt) => void
  onNext: () => void
  onBack: () => void
}

/**
 * Coarse uniform bucket grid over the dense ideal cloud. The live off-path
 * check runs inside the frame loop, so a full O(cloud) scan is not acceptable
 * even at 10 Hz: with a cell side of exactly the corridor width, every point
 * closer than the corridor half-width is guaranteed to live in the 3×3
 * neighbourhood of the query cell, so an empty neighbourhood IS an off-path
 * answer and needs no further search.
 */
interface IdealGrid {
  cell: number
  cols: number
  rows: number
  buckets: Array<Array<readonly [number, number]>>
}

function buildIdealGrid(
  ideal: ReadonlyArray<readonly [number, number]>,
  corridorWidth: number,
  viewBoxWidth: number,
): IdealGrid {
  const cell = Math.max(40, corridorWidth)
  const cols = Math.max(1, Math.ceil(viewBoxWidth / cell))
  const rows = Math.max(1, Math.ceil(600 / cell))
  const buckets: Array<Array<readonly [number, number]>> = Array.from(
    { length: cols * rows },
    () => [],
  )
  for (const p of ideal) {
    const cx = Math.min(cols - 1, Math.max(0, Math.floor(p[0] / cell)))
    const cy = Math.min(rows - 1, Math.max(0, Math.floor(p[1] / cell)))
    buckets[cy * cols + cx].push(p)
  }
  return { cell, cols, rows, buckets }
}

/** Nearest cloud point to `x`,`y` and its distance, or `{ point: null,
 * distance: Infinity }` when the 3×3 neighbourhood is empty — which already
 * proves the point is far enough out (see `IdealGrid`). The POINT is what the
 * assisted rail pulls toward; the DISTANCE alone answers the off-path test. */
function neighbourhoodNearest(
  grid: IdealGrid,
  x: number,
  y: number,
): { point: { x: number; y: number } | null; distance: number } {
  const cx = Math.min(grid.cols - 1, Math.max(0, Math.floor(x / grid.cell)))
  const cy = Math.min(grid.rows - 1, Math.max(0, Math.floor(y / grid.cell)))
  let best = Infinity
  let point: { x: number; y: number } | null = null
  for (let gy = cy - 1; gy <= cy + 1; gy++) {
    if (gy < 0 || gy >= grid.rows) continue
    for (let gx = cx - 1; gx <= cx + 1; gx++) {
      if (gx < 0 || gx >= grid.cols) continue
      for (const p of grid.buckets[gy * grid.cols + gx]) {
        const d = Math.hypot(x - p[0], y - p[1])
        if (d < best) {
          best = d
          point = { x: p[0], y: p[1] }
        }
      }
    }
  }
  return { point, distance: best }
}

/**
 * How much guide a level still shows. docs/03 §3 "Retiro progresivo de la
 * guía": the mechanism that forces the move from conscious control to motor
 * memory.
 *
 *   dominio  0–40   full guide + animated demonstration + visible checkpoints
 *   dominio 40–70   dotted guide, no demonstration
 *   dominio 70–90   start point and direction arrow only
 *   dominio 90+     ruled lines only (traced from memory)
 *
 * WITHDRAWAL APPLIES FROM PHASE 3 ONWARD ONLY. This is the correction to a real
 * defect: the bands were applied to every phase, so one accurate run through a
 * phase-1 maze permanently removed its walls and left a blank sheet with two
 * markers on it. A child reported exactly that and it looked like a rendering
 * bug for a whole round of debugging.
 *
 * The reason is not a tuning number, it is a category error. In phases 3-5 the
 * guide is SCAFFOLDING — the letter's silhouette, drawn so it can be taken away
 * once the movement is remembered. In phases 1-2 the corridor is THE LEVEL: the
 * whole task is "stay inside the channel", and the hazards and reset-on-contact
 * rules are defined against it. Removing it does not raise the difficulty, it
 * deletes the exercise. Nothing there is a memory test, so there is nothing to
 * withdraw.
 *
 * `dominio` is read as `record.bestAccuracy` — the only persisted quantity on
 * the doc's 0-100 scale, and accuracy IS the "did you keep to the shape"
 * measure the guide supports.
 *
 * Boundaries are lower-inclusive: reaching a threshold EARNS the lighter guide.
 *
 * `showGuide === false` still forces `'none'`: `f5-mama` is the motor-memory
 * exam and must stay one whatever the child's accuracy is.
 */
export type GuideLevel = 'full' | 'dotted' | 'minimal' | 'none'

export const GUIDE_DOTTED_FROM = 40
export const GUIDE_MINIMAL_FROM = 70
export const GUIDE_NONE_FROM = 90

/** Below this phase the corridor IS the exercise, so nothing is ever withdrawn. */
export const WITHDRAWAL_FROM_PHASE = 3

export function guideLevelFor(record: LevelRecord, level: LevelConfig): GuideLevel {
  if (!level.showGuide) return 'none'
  if (level.phase < WITHDRAWAL_FROM_PHASE) return 'full'
  const mastery = record.bestAccuracy
  if (mastery >= GUIDE_NONE_FROM) return 'none'
  if (mastery >= GUIDE_MINIMAL_FROM) return 'minimal'
  if (mastery >= GUIDE_DOTTED_FROM) return 'dotted'
  return 'full'
}

/**
 * The standing line under the sheet, before the child has tried anything.
 *
 * It MUST describe what is actually on screen. A fixed "Empezá desde el punto
 * verde" was wrong on two levels at once: `f1-libre` has no route and therefore
 * no green dot, and `f5-mama` withdraws every mark and leaves only the ruled
 * lines. Telling a six-year-old who may not read fluently to start from a dot
 * that is not there is the worst kind of instruction — it cannot be obeyed and
 * it cannot be questioned.
 *
 * So the copy is derived from the same two values that decide what gets drawn:
 * the level's `kind` and the withdrawal band. Anything added to the chrome must
 * be added here too.
 */
export function standingHintFor(
  level: Pick<LevelConfig, 'kind' | 'surface'>,
  guideLevel: GuideLevel,
  demoPlaying: boolean,
): string {
  if (demoPlaying) return 'Mirá cómo se hace'
  // No route at all: there is nothing to start from and nowhere to arrive.
  if (level.kind === 'free') return 'Empezá donde quieras'
  // Every mark withdrawn (docs/03 §3, last band). Name what IS still there.
  if (guideLevel === 'none') {
    return level.surface === 'ruled' ? 'Guiate por los renglones' : 'Acordate del camino'
  }
  // Start dot and goal are both on screen from 'minimal' upward.
  return 'Del punto verde hasta la meta'
}

/** One of the three pillars (docs/03 §7): a star, a name, and a raw value —
 * shown side by side and NEVER averaged into a single grade. */
function Pillar({
  label,
  value,
  filled,
  muted = false,
}: {
  label: string
  value: string
  filled: boolean
  muted?: boolean
}) {
  return (
    // Sizing lives in `.cv-pillar` so a short viewport can shrink the readouts
    // and lay the three of them out on a single row (docs/04 §3.3).
    <span className="cv-pillar" style={{ color: muted ? '#94a3b8' : '#1e293b' }}>
      <span aria-hidden="true" style={{ color: muted ? '#cbd5e1' : filled ? '#eab308' : '#cbd5e1' }}>
        {filled && !muted ? '★' : '☆'}
      </span>
      {label} {value}
    </span>
  )
}

export default function LevelPlay({ level, record, onAttempt, onNext, onBack }: LevelPlayProps) {
  // Building the dense ideal cloud is the expensive part of a level load; it
  // may only re-run when the level or the adaptive width actually changes.
  const target = useMemo(
    () => buildLevelTarget(level, record.widthFactor),
    [level, record.widthFactor],
  )
  const grid = useMemo(
    () => buildIdealGrid(target.ideal, target.corridorWidth, target.viewBoxWidth),
    [target.ideal, target.corridorWidth, target.viewBoxWidth],
  )

  // One demonstration per sub-path, played in sequence (docs/08 §5).
  // `target.paths` throughout, never `level.paths`: the target is the CENTRED
  // copy the engine scores against, so demo, corridor and guide all sit exactly
  // where the ideal cloud is (buildLevel `centreHorizontally`).
  const demos = useMemo<DrawDemo[]>(
    () =>
      target.paths.map((d, idx) => ({
        d,
        delay: idx * DEMO_STEP_S,
        duration: DEMO_DURATION_S,
        strokeWidth: 12,
      })),
    [target.paths],
  )
  const demoMs = target.paths.length * DEMO_STEP_S * 1000 + 300

  // docs/03 §3. Everything the surface shows is a function of this, so it is
  // computed once and read all the way down.
  // Escape hatch for the withdrawal (docs/03 section 3). `bestAccuracy` is a
  // MONOTONIC maximum, so without this a child who scored 72 once could never
  // see the shape again — not even on the day they cannot remember it. Earning
  // the lighter guide must not mean losing the right to ask for help.
  const [guideRequested, setGuideRequested] = useState(false)
  const earnedGuideLevel = guideLevelFor(record, level)
  // A request restores the full guide for THIS visit only; nothing is persisted,
  // so the earned band is exactly where the child left it next time.
  const guideLevel = guideRequested && level.showGuide ? 'full' : earnedGuideLevel
  const showCorridor = guideLevel === 'full' || guideLevel === 'dotted'
  const showShapeLine = guideLevel === 'full'
  const showMarkers = guideLevel !== 'none'
  // The demonstration belongs to the FULL band alone: a child at 40+ has
  // already produced the shape, and replaying it for them is the crutch §3
  // exists to remove.
  const playDemo = !!level.demo && guideLevel === 'full'

  const [phase, setPhase] = useState<'demo' | 'ready' | 'result'>(playDemo ? 'demo' : 'ready')
  const [attempt, setAttempt] = useState<LevelAttempt | null>(null)
  const [strokes, setStrokes] = useState<ReadonlyArray<ReadonlyArray<TracePoint>>>([])
  const [offPath, setOffPath] = useState(false)
  const [clearSignal, setClearSignal] = useState(0)
  const [demoRun, setDemoRun] = useState(0)
  const [resetSignal, setResetSignal] = useState(0)
  const [restarted, setRestarted] = useState(false)
  const offPathRef = useRef(false)
  const lastCheckRef = useRef(0)
  const contactRef = useRef<ResetDebounce>(NO_CONTACT)

  const resetSurface = useCallback((): void => {
    setAttempt(null)
    setStrokes([])
    setOffPath(false)
    offPathRef.current = false
    contactRef.current = NO_CONTACT
    setRestarted(false)
    setClearSignal((n) => n + 1)
  }, [])

  // A new level starts its own flow: demo first when the level asks for one AND
  // the child is still in the full-guide band.
  useEffect(() => {
    setPhase(playDemo ? 'demo' : 'ready')
    resetSurface()
  }, [level.id, playDemo, resetSurface])

  useEffect(() => {
    if (phase !== 'demo') return
    const t = window.setTimeout(() => setPhase('ready'), demoMs)
    return () => window.clearTimeout(t)
  }, [phase, demoMs, demoRun])

  // ---- Live feedback channels (docs/01 principle 2, docs/02 §7.2) ----------
  const feedback = level.feedback
  // A `free` level has no route, so there is no "outside" to be sent back from
  // and nowhere to be sent back TO. The rule needs a path to mean anything.
  const resetOnContact = level.resetOnContact && level.kind === 'path'

  // The sustained corridor tone. Created here but SILENT and device-free until
  // the first `setActive(true)`, which can only happen mid-stroke — that is the
  // user gesture the autoplay policy wants. Disposed on unmount and on every
  // level change, or the oscillator would outlive the screen.
  const toneRef = useRef<TraceTone | null>(null)
  useEffect(() => {
    if (!feedback.tone) return
    const tone = createTraceTone()
    toneRef.current = tone
    return () => {
      tone.dispose()
      toneRef.current = null
    }
  }, [feedback.tone, level.id])

  // A result is on screen: the finger is off the glass, so the light is off.
  useEffect(() => {
    if (phase !== 'ready') toneRef.current?.setActive(false)
  }, [phase])

  // Rhythm cue (docs/01 fase 2: "planificación motora, ritmo"). Runs only while
  // the level is actually traceable — never under the demonstration, never over
  // a result — and is torn down by the effect cleanup on both.
  const [beatOn, setBeatOn] = useState(false)
  const metronomeBpm = feedback.metronomeBpm
  useEffect(() => {
    if (metronomeBpm <= 0 || phase !== 'ready') {
      setBeatOn(false)
      return
    }
    let flash = 0
    const id = window.setInterval(() => {
      playBeatTick() // best-effort; stays silent until the first gesture
      setBeatOn(true)
      window.clearTimeout(flash)
      flash = window.setTimeout(() => setBeatOn(false), BEAT_FLASH_MS)
    }, 60000 / metronomeBpm)
    return () => {
      window.clearInterval(id)
      window.clearTimeout(flash)
      setBeatOn(false)
    }
  }, [metronomeBpm, phase, level.id])

  // Assisted rail (docs/03 §6). Strength decays with attempts at THIS level and
  // with proximity to the route; at zero the transform is dropped entirely so
  // the ink loop pays nothing for it.
  const railStrength = feedback.rail ? railFade(record.attempts) : 0
  const inkWarp = useMemo(() => {
    if (railStrength <= 0) return undefined
    return (p: TracePoint): { x: number; y: number } =>
      railPull(p.x, p.y, neighbourhoodNearest(grid, p.x, p.y), target.corridorWidth, railStrength)
  }, [railStrength, grid, target.corridorWidth])

  // ---- Timed hazards (docs/08, `LevelConfig.obstacles`) --------------------
  // The geometry is the pure `obstacleAt`; the screen only binds it to this
  // level's target and hands it to the surface, which calls it once per hazard
  // per frame off its own clock. The hit test below calls the SAME pure pair
  // with the SAME clock reading, so what hits the child is always what they
  // were looking at.
  const obstacles = useMemo(() => level.obstacles ?? [], [level.obstacles])
  const obstaclesRef = useRef(obstacles)
  obstaclesRef.current = obstacles
  const hazards = useMemo<TraceHazards | undefined>(
    () =>
      obstacles.length > 0
        ? {
            radii: obstacles.map((o) => o.radius),
            at: (index: number, timeMs: number) => obstacleAt(obstacles[index], target, timeMs),
          }
        : undefined,
    [obstacles, target],
  )

  // ---- Restart the run on contact (docs/01 principle 2) --------------------
  /**
   * Touching a wall or a hazard sends the run back to the start: the ink goes
   * (fading, in `TraceCanvas`), the completed strokes go, and the child begins
   * again from the green dot.
   *
   * What deliberately does NOT happen: no attempt is recorded, so `onAttempt`
   * is never called and no score, no star and no stored progress moves. An
   * abandoned run is not a failed one — principle 2 forbids scolding, and a
   * penalty is a scolding with arithmetic. The haptic pulse is the SAME neutral
   * buzz leaving the corridor already gives (`haptics.ts`), not an error tone.
   */
  const restartRun = useCallback((): void => {
    contactRef.current = NO_CONTACT
    offPathRef.current = false
    setOffPath(false)
    setAttempt(null)
    setStrokes([])
    toneRef.current?.setActive(false)
    setResetSignal((n) => n + 1)
    setRestarted(true)
    // `false → true` forces exactly one pulse through the same edge rule the
    // off-path channel uses, so a restart can never turn into a buzzing nag.
    if (feedback.haptics) pulseOnLeaving(false, true)
  }, [feedback.haptics])

  // The cue is a passing line, not a state the child has to dismiss.
  useEffect(() => {
    if (!restarted) return
    const t = window.setTimeout(() => setRestarted(false), RESTART_CUE_MS)
    return () => window.clearTimeout(t)
  }, [restarted, resetSignal])

  // A new stroke means the child has moved on; the cue has done its job.
  const onStart = useCallback((): void => setRestarted(false), [])

  // Live corridor feedback (docs/03 §6 "salirse atenúa el trazo, no lo corta"):
  // throttled to ~10 Hz so it never competes with the 60fps ink loop, and it
  // only ever flips a boolean — the stroke keeps being captured either way.
  // The tone and the haptic pulse ride on THIS ONE SAMPLE; none of them scans
  // the cloud again.
  const onFrame = useCallback(
    (points: TracePoint[], drawing: boolean, timeMs: number) => {
      if (!drawing) {
        toneRef.current?.setActive(false) // finger up: the light goes out
        contactRef.current = NO_CONTACT // a finished stroke owes nothing
        if (offPathRef.current) {
          offPathRef.current = false
          setOffPath(false)
        }
        return
      }
      // The surface's own frame clock, so the hazard hit test below asks about
      // the exact positions the hazards were just DRAWN at.
      const now = timeMs
      if (now - lastCheckRef.current < OFF_PATH_PERIOD_MS) return
      lastCheckRef.current = now
      const head = points[points.length - 1]
      if (!head) return
      const out = neighbourhoodNearest(grid, head.x, head.y).distance > target.corridorWidth / 2
      // "La linterna encendida": the tone sounds while the finger is INSIDE and
      // stops when it drifts. Silence is the whole message — there is no
      // out-of-corridor sound, because that would be the error sound docs/03 §7
      // forbids.
      if (feedback.tone) toneRef.current?.setActive(!out)
      if (out !== offPathRef.current) {
        // Rising edge only: at 10 Hz, pulsing on the LEVEL would buzz ten times
        // a second for as long as the child stayed out (see `haptics.ts`).
        if (feedback.haptics) pulseOnLeaving(offPathRef.current, out)
        offPathRef.current = out
        setOffPath(out)
      }
      // Reset on contact rides THIS SAME sample. The wall answer is the `out`
      // already computed above and the hazard answer is one point-in-circle
      // test per obstacle — no second cloud scan, which is the rule docs/02
      // §7.2 sets for every live channel.
      if (resetOnContact) {
        const hazardHit =
          obstaclesRef.current.length > 0 &&
          hitObstacle(head, obstaclesRef.current, target, now) >= 0
        const next = contactTick(contactRef.current, out || hazardHit)
        contactRef.current = next
        if (next.reset) restartRun()
      }
    },
    [grid, target, feedback.tone, feedback.haptics, resetOnContact, restartRun],
  )

  // Every release re-evaluates the WHOLE stroke set: on a continuous level the
  // second stroke immediately shows its fluency penalty, and on a segmented one
  // the child keeps adding strokes and sees the set re-scored each time.
  const onRelease = useCallback(
    (_points: TracePoint[], pointerType: string, all: TracePoint[][]) => {
      const snapshot = all.map((s) => s.slice())
      setStrokes(snapshot)
      setOffPath(false)
      offPathRef.current = false
      toneRef.current?.setActive(false)
      // RAW points, always. `snapshot` is the captured stroke, never the
      // rail-warped copy the canvas draws — scoring the assist would make
      // accuracy a measurement of the rail instead of the child (see `rail.ts`).
      const result = evaluateLevel(snapshot, target, pointerType)
      setAttempt(result)
      setPhase('result')
      if (result.approved) playApprovalTone() // best-effort, approval only
      onAttempt(result)
    },
    [target, onAttempt],
  )

  const replayDemo = (): void => {
    resetSurface()
    setPhase('demo')
    setDemoRun((n) => n + 1)
  }

  const clearAttempt = (): void => {
    resetSurface()
    setPhase('ready')
  }

  const startMarker = target.polyline[0]
  const directionArrow = useMemo(() => directionArrowOf(target), [target])
  // Where the route ends. A `kind: 'free'` level has no route, so it gets no
  // goal — and no start dot and no arrow either, which is why the standing line
  // below has to be derived rather than fixed.
  const endMarker = useMemo(
    () => (level.kind === 'path' ? goalMarkerOf(target) : undefined),
    [level.kind, target],
  )

  // The corridor object is memoized so `TraceCanvas` can derive the tapered
  // geometry once per level instead of once per render.
  const corridor = useMemo<TraceCorridor | undefined>(
    () =>
      showCorridor
        ? { paths: target.paths, width: target.corridorWidth, taper: level.taper }
        : undefined,
    [showCorridor, target.paths, target.corridorWidth, level.taper],
  )

  // Settled ink of previous strokes, pulled the SAME way the live ink was, so
  // an assisted attempt does not visibly snap back the instant the finger
  // lifts. `strokes` itself stays raw — it is what was scored.
  const shownStrokes = useMemo(
    () => (inkWarp ? strokes.map((stroke) => stroke.map((p) => inkWarp(p))) : strokes),
    [strokes, inkWarp],
  )
  const fluencyEvaluated = level.rules.minFluency > 0
  // Same cost as the ideal grid and the same inputs, so it rides along.
  const band = useMemo(
    () => drawingBand(target.ideal, target.corridorWidth),
    [target.ideal, target.corridorWidth],
  )

  return (
    <main className="cv-play">
      <style>{LAYOUT_CSS}</style>
      <div className="cv-top">
      <header className="cv-head">
        <button type="button" onClick={onBack} className="cv-btn cv-btn-back">
          ‹ Volver
        </button>
        <h1 className="cv-title">
          Fase {level.phase} · {level.title}
        </h1>
      </header>
      <p className="cv-hint">{level.hint}</p>
      </div>
      {/* Upright phones are width-limited and rotating really is the fix, so
       * the screen says it plainly and keeps playing (docs/04 §3.3). */}
      <p className="cv-rotate">Girá el dispositivo para dibujar más grande.</p>
      <div className="cv-sheet">
      <TraceCanvas
        key={`${level.id}-${demoRun}`}
        demo={phase === 'demo' ? demos : undefined}
        enabled={phase !== 'demo'}
        multiStroke
        // Guide withdrawal (docs/03 §3). The corridor survives the full and
        // dotted bands; from `minimal` on there is nothing but the start point
        // and the arrow, and at `none` not even those — which is how phase 5
        // and `f5-mama` become a motor-memory exam (docs/08 §5).
        corridor={corridor}
        // The corridor alone is the TOLERATED ZONE, and from phase 3 on it is
        // wider than the strokes of the glyph itself — a channel with no shape
        // inside it. The crisp centreline on top is the SHAPE TO DRAW, so the
        // child can still see the letter they are being asked to copy. It is
        // the FIRST thing §3 takes away: the dotted band keeps the channel and
        // its dashed centre, but not the solid shape.
        // ...and not in a maze either: the walls are already the shape.
        guide={showShapeLine && !level.maze ? target.paths : undefined}
        // ...but NOT inside a maze. docs/08 makes the crisp-line-over-soft-
        // channel rule a phase-3-and-up rule, because only there is the
        // corridor wider than the glyph. A maze has no shape to recover: the
        // walls already say exactly where the path runs, and a line down the
        // middle of them is one more thing on a screen docs/01 principle 1
        // wants empty.
        showCentreLine={showCorridor && !level.maze}
        // Fases 1-2 draw on blank paper: the pauta means nothing before a
        // letter exists (docs/01 principle 1).
        surface={level.surface}
        // A sendero becomes a real laberinto — walls, not a hint (docs/01 fase 1).
        maze={level.maze}
        inkWarp={inkWarp}
        // docs/03 §3's full band also lists "checkpoints visibles", and that is
        // DELIBERATELY not wired to `DevCheckpointOverlay`. That overlay is a
        // dev instrument: a dozen numbered dashed circles, each as wide as the
        // corridor. On `f3-a` they swallow the letter whole — the exact failure
        // docs/08 names ("el canal no puede tragarse la letra") — and on a fase-1
        // maze they bury the walls. Numerals are also unreadable to the
        // pre-reader this app is for, which is why the hint is an ARROW at all.
        // The ordered-waypoint idea needs its own child-facing rendering before
        // it earns a place on the sheet.
        beatPulse={
          metronomeBpm > 0 && phase === 'ready' && startMarker
            ? { x: startMarker.x, y: startMarker.y, on: beatOn }
            : undefined
        }
        // A long word gets a wider sheet, never smaller letters (docs/02 §3).
        viewBoxWidth={target.viewBoxWidth}
        // Crop the dead margin and fill the flex area in both axes, so the
        // sheet is as large as BOTH limits allow (docs/02 §3, docs/04 §3.3).
        viewBoxY={band.y}
        viewBoxHeight={band.height}
        fit="contain"
        startMarker={showMarkers ? startMarker : undefined}
        // Shown wherever the start dot is shown (docs/03 §3): from phase 3 on,
        // "where the letter ends" is real information, not decoration. At the
        // 'none' band it goes too, or `f5-mama` would stop being a memory test.
        endMarker={showMarkers ? endMarker : undefined}
        directionArrow={showMarkers ? directionArrow : undefined}
        completedStrokes={shownStrokes}
        offPath={offPath}
        clearSignal={clearSignal}
        // Timed hazards (docs/08). Absent on every level that does not author
        // them, so the surface pays nothing for the feature.
        hazards={hazards}
        // The carried character rides the fingertip, and waits on the start of
        // the ROUTE — `target.polyline[0]`, not the start marker, so it is
        // still there on a level that has withdrawn its markers.
        carrier={level.carrier && startMarker ? startMarker : undefined}
        // Any bump restarts the run (docs/01 principle 2).
        resetSignal={resetOnContact ? resetSignal : undefined}
        onStart={onStart}
        onFrame={onFrame}
        onRelease={onRelease}
      />
      </div>
      <div className="cv-foot">
      <section aria-label="Resultado del intento" className="cv-result">
        {attempt ? (
          <>
            <div className="cv-pillars">
              <Pillar
                label="Precisión"
                value={String(attempt.accuracy)}
                filled={attempt.accuracy >= level.rules.minAccuracy}
              />
              <Pillar
                label="Sentido"
                value={attempt.directionOk && !attempt.wrongDirection ? '✓' : '→'}
                filled={attempt.directionOk && !attempt.wrongDirection}
              />
              <Pillar
                label="Fluidez"
                value={fluencyEvaluated ? String(attempt.fluency) : '—'}
                filled={fluencyEvaluated && attempt.fluency >= level.rules.minFluency}
                muted={!fluencyEvaluated}
              />
            </div>
            <p className="cv-coach">{coachMessage(attempt)}</p>
          </>
        ) : (
          // The restart cue takes the standing hint's place for a moment. Same
          // muted slate as every other neutral line on this screen — never red,
          // and never a different, louder kind of text (docs/01 principle 2).
          <p
            className="cv-coach"
            role={restarted ? 'status' : undefined}
            style={{ color: '#64748b' }}
          >
            {restarted ? RESTART_MESSAGE : standingHintFor(level, guideLevel, phase === 'demo')}
          </p>
        )}
      </section>
      <nav aria-label="Acciones" className="cv-actions">
        <button type="button" onClick={clearAttempt} className="cv-btn">
          Borrar
        </button>
        {playDemo && (
          <button type="button" onClick={replayDemo} className="cv-btn">
            Ver de nuevo
          </button>
        )}
        {level.showGuide && earnedGuideLevel !== 'full' && !guideRequested && (
          <button type="button" onClick={() => setGuideRequested(true)} className="cv-btn">
            Ver la guía
          </button>
        )}
        <button
          type="button"
          onClick={onNext}
          disabled={!attempt?.approved}
          className={`cv-btn ${attempt?.approved ? 'cv-btn-ok' : 'cv-btn-off'}`}
        >
          Siguiente
        </button>
      </nav>
      </div>
    </main>
  )
}
