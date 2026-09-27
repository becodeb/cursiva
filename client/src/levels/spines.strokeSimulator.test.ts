// T30 (`odd/tasks/prewriting-stage-completion.md`): a real tablet play-test
// after T19 reported "it works worse than before; now it detects it fewer
// times" — a claim about REAL FINGER STROKES, which no fixture in
// `spines.test.ts` reproduces (every fixture there draws a geometrically
// perfect stroke: exact anchor start, exact outward angle, exact mid-band
// length). This file builds a realistic child-stroke SIMULATOR instead of
// re-guessing which of the five measures got stricter, and uses it to:
//
//   1. measure the CURRENT catalog + code's acceptance rate on ~200
//      simulated strokes per hedgehog level,
//   2. measure the SAME simulator against the PRE-T19 catalog + code
//      (`git show 2ce1e92:client/src/levels/{spines,catalog}.ts` — T19's own
//      parent commit), reimplemented locally since that revision no longer
//      exists on disk, to see whether the redesign really regressed
//      acceptance or the child's tablet was already this imprecise before,
//   3. attribute every rejection to the ONE measure that first failed it
//      (`spines.ts`'s own order: 1 start radius, 2 direction, 3 straightness,
//      4 length band, 5 body-crossing), so the fix targets the real
//      bottleneck instead of loosening every knob at once.
//
// Geometry: strokes are generated and scored entirely in VIEWBOX units — the
// same space `spineAnchors`/`remainingMeasureFailure` already work in — but
// every WIDTH the task describes in screen pixels (the ~0-35px start radius,
// the ±4px jitter) is converted through a scale measured live: `?dev&nivel=
// hedgehog1..4` at 1024×768 in the system Chromium (`/usr/bin/chromium
// --disable-gpu`), reading `svg.getScreenCTM()` on the largest-area `<svg>`
// on the page (the game canvas — the page also renders several small icon
// `<svg>`s that a bare `querySelector('svg')` would grab instead). All four
// hedgehog levels measured IDENTICAL: `ctm.a === ctm.d === 0.992` (px per
// viewBox unit) at that viewport — the level's own `fit="contain"` viewBox
// happens to sit almost exactly 1:1 with the 1024-wide screen. `UNITS_PER_PX
// = 1 / 0.992 ≈ 1.008`.
//
// T39 (next tablet play-test: "sometimes I draw it quite well and it still
// says I didn't do the spine right"): a second, harsher simulator
// (`simulateTabletStroke`, below) adds what T30's left out and a real
// tablet does — a SLOW drag (25-70 samples, the pointer stream of a careful
// 0.5-1s pull, not 12-18), the finger landing on the small MARK (which sits
// `SPINE_MARK_R` outside the anchor) as often as on the body edge, a
// touch-down settle and a lift flick of a few px, ±30° aim, 0.5-1.7× length,
// ±5px tremor. Against the pre-T39 code (this same file, 40 trials/anchor)
// it accepted only 27.5% / 29.2% / 63.2% / 59.8% (hedgehog1..4), while
// T30's own simulator still read 94.4% / ≥95% / 90.0% / 92.3%. After:
// 98.8% / 99.4% / 99.8% / 99.8%, and 100% / 100% / 99.5% / 99.5% on T30's.
// Attribution (`judgeSpineStroke`) named three causes, fixed in
// `spines.ts`/`catalog.ts`: straightness measured on the raw sample stream
// (slowness alone dropped it to 47-76%), `lenMax` (a long pull), and the
// profile levels' start zone. Rejection attribution now comes from
// `judgeSpineStroke` itself, not a local copy of the measures.
import { describe, expect, it } from 'vitest'
import type { Point } from '../letters/types'
import { getLevel } from './catalog'
import {
  judgeSpineStroke,
  spineAnchors,
  spineSpikeLength,
  SPINE_MARK_R,
  type SpineAnchor,
  type SpineConfig,
  type SpineRejection,
  type SpineRules,
} from './spines'

// ---------------------------------------------------------------------------
// Scale (measured, see header) and a tiny deterministic RNG so a failing run
// is reproducible without a flake-prone real Math.random() seed hunt.
// ---------------------------------------------------------------------------

const UNITS_PER_PX = 1 / 0.992

function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function uniform(rng: () => number, min: number, max: number): number {
  return min + rng() * (max - min)
}

// ---------------------------------------------------------------------------
// The child-stroke simulator (task's own five parameters, verbatim):
//  - starts within ~0-35px (screen) of the anchor dot,
//  - heads outward at ±25° from the "correct" direction (the anchor's own
//    ray from the body centre — what the mark visually implies, not the
//    T19-fixed LOCAL ray a child cannot see),
//  - draws 0.6-1.6× the spine's own mid-band length,
//  - ±4px per-sample jitter, plus a slight bow (curvature),
//  - sampled like a real ~30Hz pointer stream (12-18 points), not two
//    endpoints — `remainingMeasureFailure`'s measure 3 (straightness) and
//    measure 5 (body-crossing) both read every sample, so a two-point
//    "ideal" fixture cannot exercise either realistically.
// ---------------------------------------------------------------------------

function midLen(rules: SpineRules): number {
  return spineSpikeLength(rules)
}

function simulateChildStroke(anchor: SpineAnchor, cfg: SpineConfig, rng: () => number): Point[] {
  // Start radius: "within ~0-35px of the anchor dot" bounds the ERROR a
  // child's touch-down can have, not a uniform likelihood across it — a
  // six-year-old aiming at a visible mark lands close to it far more often
  // than at the edge of the tolerance. `min(u1, u2)` (the smaller of two
  // independent uniforms) has density `2(1-x)`, triangular and peaking at 0,
  // which is the standard cheap stand-in for "usually close, occasionally
  // off" without inventing a made-up distribution family.
  const startRadiusUnits = 35 * Math.min(rng(), rng()) * UNITS_PER_PX
  const startAngle = uniform(rng, 0, 360) * (Math.PI / 180)
  const start: Point = {
    x: anchor.x + Math.cos(startAngle) * startRadiusUnits,
    y: anchor.y + Math.sin(startAngle) * startRadiusUnits,
  }

  const idealDeg = anchor.deg
  const headingDeg = idealDeg + uniform(rng, -25, 25)
  const headingRad = (headingDeg * Math.PI) / 180
  const hx = Math.cos(headingRad)
  const hy = Math.sin(headingRad)
  // Perpendicular to the heading, for the jitter/bow terms below.
  const px = -hy
  const py = hx

  const length = midLen(cfg.rules) * uniform(rng, 0.6, 1.6)
  const jitterUnits = 4 * UNITS_PER_PX
  // A small, randomly-signed bow — a real drag is never perfectly straight,
  // even from a steady hand — peaking at the stroke's own midpoint.
  const bowUnits = uniform(rng, -0.08, 0.08) * length

  // Hand TREMOR, not sensor noise: a real capacitive touchscreen samples a
  // dragging finger at high resolution with very little per-sample noise —
  // what actually wobbles is the CHILD'S HAND, a low-frequency wander that
  // moves consecutive samples together, never an independent ±4px jump at
  // every point (that would be a jagged zigzag no real pointer stream
  // produces, and would fail straightness on every stroke regardless of the
  // catalog's own tolerance). Modelled as two low-frequency sine components
  // in the perpendicular direction, amplitude-capped at the task's own
  // ±4px, plus a tiny independent per-sample residual (≤1px) for genuine
  // sensor-level noise.
  const trem1Amp = uniform(rng, 0, jitterUnits * 0.7)
  const trem1Freq = uniform(rng, 1, 2.5)
  const trem1Phase = uniform(rng, 0, Math.PI * 2)
  const trem2Amp = jitterUnits - trem1Amp
  const trem2Freq = uniform(rng, 2.5, 4)
  const trem2Phase = uniform(rng, 0, Math.PI * 2)
  const residualUnits = 1 * UNITS_PER_PX

  const n = Math.round(uniform(rng, 12, 18))
  const points: Point[] = []
  for (let i = 0; i <= n; i++) {
    const t = i / n
    const along = length * t
    const bow = bowUnits * Math.sin(Math.PI * t)
    const tremor =
      trem1Amp * Math.sin(2 * Math.PI * trem1Freq * t + trem1Phase) +
      trem2Amp * Math.sin(2 * Math.PI * trem2Freq * t + trem2Phase)
    const residualX = uniform(rng, -residualUnits, residualUnits)
    const residualY = uniform(rng, -residualUnits, residualUnits)
    points.push({
      x: start.x + hx * along + px * (bow + tremor) + residualX,
      y: start.y + hy * along + py * (bow + tremor) + residualY,
    })
  }
  return points
}

// ---------------------------------------------------------------------------
// T39: the tablet simulator — see this file's header for what it adds.
// ---------------------------------------------------------------------------

function simulateTabletStroke(anchor: SpineAnchor, cfg: SpineConfig, rng: () => number): Point[] {
  // Half the time the finger aims at the visible mark (outside the body),
  // half at the body edge (the anchor itself); the landing error is the same
  // "usually close, occasionally off" triangular distribution as above.
  const aimOut = rng() < 0.5 ? SPINE_MARK_R : 0
  const errUnits = 30 * Math.min(rng(), rng()) * UNITS_PER_PX
  const errAngle = uniform(rng, 0, Math.PI * 2)
  const start: Point = {
    x: anchor.x + anchor.nx * aimOut + Math.cos(errAngle) * errUnits,
    y: anchor.y + anchor.ny * aimOut + Math.sin(errAngle) * errUnits,
  }
  const headingRad = ((anchor.deg + uniform(rng, -30, 30)) * Math.PI) / 180
  const hx = Math.cos(headingRad)
  const hy = Math.sin(headingRad)
  const px = -hy
  const py = hx
  const length = midLen(cfg.rules) * uniform(rng, 0.5, 1.7)
  const bow = uniform(rng, -0.1, 0.1) * length
  const tremor = 5 * UNITS_PER_PX
  const a1 = uniform(rng, 0, tremor * 0.7)
  const f1 = uniform(rng, 1, 2.5)
  const p1 = uniform(rng, 0, Math.PI * 2)
  const a2 = tremor - a1
  const f2 = uniform(rng, 2.5, 4)
  const p2 = uniform(rng, 0, Math.PI * 2)
  const settle = 6 * UNITS_PER_PX
  const residual = 1.5 * UNITS_PER_PX

  // Touch-down settle: the finger slides a few px before the pull begins.
  const points: Point[] = []
  const settleAngle = uniform(rng, 0, Math.PI * 2)
  const settleDist = uniform(rng, 0, settle)
  for (let k = 0; k < 3; k++) {
    points.push({
      x: start.x + Math.cos(settleAngle) * settleDist * (k / 3),
      y: start.y + Math.sin(settleAngle) * settleDist * (k / 3),
    })
  }
  const from = points[points.length - 1]
  // The pull itself: slow (25-70 samples), easing in and out, so samples
  // bunch up at both ends exactly where a real finger is slowest.
  const n = Math.round(uniform(rng, 25, 70))
  for (let i = 1; i <= n; i++) {
    const t = i / n
    const e = t * t * (3 - 2 * t)
    const side =
      bow * Math.sin(Math.PI * e) +
      a1 * Math.sin(2 * Math.PI * f1 * e + p1) +
      a2 * Math.sin(2 * Math.PI * f2 * e + p2)
    points.push({
      x: from.x + hx * length * e + px * side + uniform(rng, -residual, residual),
      y: from.y + hy * length * e + py * side + uniform(rng, -residual, residual),
    })
  }
  // Lift flick: the last sample skids a few px in any direction.
  const last = points[points.length - 1]
  const flickAngle = uniform(rng, 0, Math.PI * 2)
  const flick = uniform(rng, 0, settle)
  points.push({ x: last.x + Math.cos(flickAngle) * flick, y: last.y + Math.sin(flickAngle) * flick })
  return points
}

// ---------------------------------------------------------------------------
// The acceptance-rate runner: for every anchor of a level, run
// `trialsPerAnchor` independent simulated strokes through the REAL
// `judgeSpineStroke` (exactly `spineSettle`'s decision, from an empty
// latch) and count how many fill the TARGETED anchor. A stroke that fills
// a NEIGHBOURING anchor instead counts as a miss for this measurement.
// ---------------------------------------------------------------------------

interface LevelReport {
  readonly accepted: number
  readonly total: number
  readonly rate: number
  readonly rejections: Partial<Record<SpineRejection | 'wrong-anchor', number>>
}

type Simulator = (anchor: SpineAnchor, cfg: SpineConfig, rng: () => number) => Point[]

function measureAcceptance(cfg: SpineConfig, trialsPerAnchor: number, seed: number, simulate: Simulator): LevelReport {
  const anchors = spineAnchors(cfg)
  const rng = mulberry32(seed)
  let accepted = 0
  let total = 0
  const rejections: LevelReport['rejections'] = {}
  for (let i = 0; i < anchors.length; i++) {
    for (let t = 0; t < trialsPerAnchor; t++) {
      total++
      const verdict = judgeSpineStroke(simulate(anchors[i], cfg, rng), cfg)
      if (verdict.anchor === i) {
        accepted++
        continue
      }
      const key = verdict.rejection ?? 'wrong-anchor'
      rejections[key] = (rejections[key] ?? 0) + 1
    }
  }
  return { accepted, total, rate: accepted / total, rejections }
}

const HEDGEHOG_IDS = ['hedgehog1', 'hedgehog2', 'hedgehog3', 'hedgehog4'] as const
const TRIALS_PER_ANCHOR = 20 // × 8-11 anchors ≈ 160-220 strokes per level, "~200" (task's own words)
const SEED = 0x1a2b3c4d

describe('hedgehog acceptance under realistic child strokes (T30 simulator; T39 raised the bar from ≥90%/≥80% to ≥95%)', () => {
  for (const id of HEDGEHOG_IDS) {
    it(`${id}: realistic strokes clear the level's own bar`, () => {
      const cfg = getLevel(id).spines!
      const report = measureAcceptance(cfg, TRIALS_PER_ANCHOR, SEED, simulateChildStroke)
      // eslint-disable-next-line no-console
      console.log(
        `[T30 sim] ${id}: ${report.accepted}/${report.total} = ${(report.rate * 100).toFixed(1)}% — rejections: ${JSON.stringify(report.rejections)}`,
      )
      expect(report.rate).toBeGreaterThanOrEqual(0.95)
    })
  }
})

describe('hedgehog acceptance under slow, wobbly tablet strokes (T39 simulator)', () => {
  for (const id of HEDGEHOG_IDS) {
    it(`${id}: an imperfect but honest spine is accepted at least 95% of the time`, () => {
      const cfg = getLevel(id).spines!
      const report = measureAcceptance(cfg, 40, SEED, simulateTabletStroke)
      // eslint-disable-next-line no-console
      console.log(
        `[T39 sim] ${id}: ${report.accepted}/${report.total} = ${(report.rate * 100).toFixed(1)}% — rejections: ${JSON.stringify(report.rejections)}`,
      )
      expect(report.rate).toBeGreaterThanOrEqual(0.95)
    })
  }
})

describe('strokes that are not spines stay rejected on every level (T30, extended in T39)', () => {
  /** Every shape a child might scribble that must NOT grow a spine, built
   *  around one anchor: `m` is the visible mark, `(tx, ty)` the tangent. */
  function badStrokes(anchor: SpineAnchor, cfg: SpineConfig): Record<string, Point[]> {
    const c = cfg.body.centre
    const len = midLen(cfg.rules)
    const m = { x: anchor.x + anchor.nx * SPINE_MARK_R, y: anchor.y + anchor.ny * SPINE_MARK_R }
    const tx = -anchor.ny
    const ty = anchor.nx
    const along = (t: number, side: number): Point => ({
      x: m.x + anchor.nx * len * t + tx * side,
      y: m.y + anchor.ny * len * t + ty * side,
    })
    return {
      // From the mark straight back into the body.
      inward: [m, { x: c.x, y: c.y }],
      // Along the body's outline instead of away from it.
      tangential: [m, { x: m.x + tx * len, y: m.y + ty * len }],
      // Nowhere near any anchor.
      farAway: [
        { x: c.x + 900, y: c.y + 900 },
        { x: c.x + 900 + len, y: c.y + 900 },
      ],
      // Back-and-forth scribble across the mark (±25 units, 30 samples).
      scribble: Array.from({ length: 30 }, (_, i) => along(i / 60, i % 2 ? 25 : -25)),
      // A small loop drawn at the mark.
      loop: Array.from({ length: 40 }, (_, i) => {
        const a = (i / 39) * 2 * Math.PI
        return {
          x: m.x + anchor.nx * 20 * (1 - Math.cos(a)) - tx * 20 * Math.sin(a),
          y: m.y + anchor.ny * 20 * (1 - Math.cos(a)) - ty * 20 * Math.sin(a),
        }
      }),
      // A tiny drag, barely more than a tap.
      tiny: [m, along(8 / len, 0)],
      // Straight across the whole body to the other side.
      acrossBody: [m, { x: 2 * c.x - m.x, y: 2 * c.y - m.y }],
      // Out along the spine and straight back again.
      outAndBack: [
        ...Array.from({ length: 20 }, (_, i) => along(i / 19, 0)),
        ...Array.from({ length: 20 }, (_, i) => along(1 - i / 19, 3)),
      ],
      // A big zigzag (±22 units) outward — a wiggle, not a line.
      bigWiggle: Array.from({ length: 40 }, (_, i) => along(i / 39, 22 * Math.sin((i / 39) * 3 * Math.PI))),
    }
  }

  for (const id of HEDGEHOG_IDS) {
    it(`${id}: inward, tangential, far-away, scribble, loop, tiny, across-body, out-and-back and big-wiggle strokes fill nothing`, () => {
      const cfg = getLevel(id).spines!
      const wronglyAccepted: string[] = []
      spineAnchors(cfg).forEach((anchor, i) => {
        for (const [name, stroke] of Object.entries(badStrokes(anchor, cfg))) {
          if (judgeSpineStroke(stroke, cfg).anchor !== null) wronglyAccepted.push(`${name}@${i}`)
        }
      })
      expect(wronglyAccepted).toEqual([])
    })
  }
})
