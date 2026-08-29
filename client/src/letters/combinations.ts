// Free word building (letter-combinations spec): buildWord(names) composes an
// ORDERED word of registered, word-eligible letters into ONE continuous
// `enlazada` LetterConfig — n=1 passes the registry config through unchanged.
// Each subsequent letter is translated so its placed entry lands EXACTLY at
// `prevEffectiveExit − 20px·u` (u = normalize(prevEffectiveExit − entryNatural),
// with (1,0) fallback); its main segment is cut at the stored mainEndArc
// (arc-walk over the flattened translated `d`) or at `d` end when absent; and
// a cubic-Bézier connector — P0 = previous effective exit, P3 = placed entry,
// tangents from the joining strokes' last/first ~3 polyline points, control
// arms |P3−P0|/3 — bridges every seam sampled into exactly 24 uniform `L`
// steps (skipped when |P3−P0| < 1px).
//
// Effective exit per letter: `x` → its second diagonal end (d end); `t/i/j` →
// their MAIN end (`anchors.exit` — the deferred dot/cross is appended AFTER
// every letter and connector, in word order); any single-subpath letter → d end.
// The stored `d` remains a SINGLE-M polyline, never split by M, so guided /
// free trace and evaluate consume the word unchanged. Error strings in Spanish,
// house style.
import { DEFERRED_SECONDARY_CHARS } from './anchors'
import { LETTER_REGISTRY } from './registry'
import { flattenPathD, isWordEligible, pathFromPoints, transformPathD } from './svgLetter'
import type { AnimationStep, LetterCheckpoint, LetterConfig, Point } from './types'

/** Seam gap in virtual px — the placed entry lands 20px along `u`. */
const SEAM_GAP = 20
/** A cubic-Bézier connector is sampled into exactly this many uniform `L` steps. */
const CONNECTOR_STEPS = 24
/** Perpendicular half-width of the connector ideal band (px), like the pipeline. */
const CONNECTOR_BAND = 8
/** Connectors closer than 1px are exact placements — no bridge segment. */
const CONNECTOR_MIN_ARM = 1

/** Round to 2 decimals — the `d`/anchors precision of pathFromPoints. */
function round2(n: number): number {
  return Math.round(n * 100) / 100
}

/** Round to 1 decimal — the checkpoint/ideal precision of generateCheckpoints. */
function round1(n: number): number {
  return Math.round(n * 10) / 10
}

/** Unit vector of `v`; degenerate vectors fall back to +X (design seam fallback). */
function normalize(v: Point): Point {
  const len = Math.hypot(v.x, v.y)
  if (len < 1e-9) return { x: 1, y: 0 }
  return { x: v.x / len, y: v.y / len }
}

/** Index of the first polyline vertex whose cumulative arc from the start
 * reaches `arc` (walk chords). Returns the last index when `arc` exceeds the
 * polyline — the main then extends to `d` end. */
function cutAtArc(points: Point[], arc: number): number {
  let acc = 0
  for (let i = 1; i < points.length; i++) {
    acc += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y)
    if (acc >= arc - 1e-9) return i
  }
  return points.length - 1
}

/** Index of the polyline vertex nearest `target` (single-subpath cut at the
 * translated exit anchor — the anchor sits on `d` end, so the cut lands there). */
function nearestVertex(points: Point[], target: Point): number {
  let best = 0
  let bestD = Infinity
  for (let i = 0; i < points.length; i++) {
    const d = Math.hypot(points[i].x - target.x, points[i].y - target.y)
    if (d < bestD) {
      bestD = d
      best = i
    }
  }
  return best
}

/** Cumulative arc length from the polyline start to the vertex nearest `p`
 * (checkpoint projection — the dense centerline makes the vertex ≈ foot). */
function projectArc(points: Point[], p: Point): number {
  const idx = nearestVertex(points, p)
  let acc = 0
  for (let i = 1; i <= idx; i++) {
    acc += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y)
  }
  return acc
}

/** Sample the cubic P0→P3 (controls C1, C2) into `steps` uniform points. */
function sampleCubic(p0: Point, c1: Point, c2: Point, p3: Point, steps: number): Point[] {
  const out: Point[] = []
  for (let k = 1; k <= steps; k++) {
    const t = k / steps
    const mt = 1 - t
    out.push({
      x: mt ** 3 * p0.x + 3 * mt * mt * t * c1.x + 3 * mt * t * t * c2.x + t ** 3 * p3.x,
      y: mt ** 3 * p0.y + 3 * mt * mt * t * c1.y + 3 * mt * t * t * c2.y + t ** 3 * p3.y,
    })
  }
  return out
}

/** One concatenation unit of the combined `d`: points plus its demo timing. */
interface Segment {
  points: Point[]
  /** Demo duration in ms: 2600 letter main, 600 secondary, 500 connector. */
  ms: number
}

/** Per-member split results feeding the checkpoint renumbering. */
interface MemberParts {
  cpsMain: LetterCheckpoint[]
  cpsTail: LetterCheckpoint[]
  /** Tail checkpoints that must be numbered LAST (t/i/j), in word order. */
  deferred: boolean
}

/**
 * Build the combined `LetterConfig` for an ordered word:
 *  - `d` = single-`M` polyline: per letter main (cut at mainEndArc / d end),
 *    `x`-style tails immediately after their main, 24-step Bézier connectors
 *    between letters, THEN the deferred `t/i/j` tails in word order.
 *  - checkpoints: member checkpoints split by arc position (≤ mainEndArc →
 *    main), renumbered strictly 1..N in writing order; deferred secondaries
 *    numbered LAST. Names kept.
 *  - ideal: translated member clouds + a ±8px perpendicular band around each
 *    connector sample.
 *  - anchors {first.entry, last effective exit}; family 'enlazada';
 *    theme/strokeWidth/baselineZone from the first member; id 'palabra_'+chars.
 *  - timeline: slide_in (member 0) → one draw_path per segment
 *    (1000/2600/500/600ms cumulative, each `properties: { d }`) → fade_out at
 *    max(delay + duration) + 200.
 *
 * Throws on unknown names and word-ineligible members. n=1 returns the
 * registry config object UNCHANGED (single-letter demo has no properties.d).
 */
export function buildWord(names: string[]): LetterConfig {
  if (names.length === 0) {
    throw new Error('La palabra debe tener al menos 1 letra')
  }
  const members = names.map((name) => {
    const cfg = LETTER_REGISTRY[name]
    if (!cfg) throw new Error(`Letra no configurada: ${name}`)
    if (!isWordEligible(cfg)) {
      throw new Error(`La letra '${name}' no es elegible para formar palabras`)
    }
    return cfg
  })

  const first = members[0]
  if (names.length === 1) return first // n=1 passthrough: registry config unchanged

  const chars = names.join('')
  const segmentOrder: Segment[] = []
  const parts: MemberParts[] = []
  const ideal: Array<readonly [number, number]> = []
  const deferredTails: Point[][] = [] // t/i/j tails, appended LAST in word order
  let prevExit: Point | null = null // previous member's effective exit
  let prevChunk: Point[] | null = null // previous member's IMMEDIATE chunk (main [+ tail])

  for (let i = 0; i < members.length; i++) {
    const cfg = members[i]
    const isDeferred = DEFERRED_SECONDARY_CHARS.has(cfg.character)

    // Placement: u = normalize(prevEffectiveExit − entryNatural); placed entry
    // = round2(prevExit − 20·u). dx/dy are UNROUNDED on purpose: the
    // transformPathD rounding then reproduces the placed entry EXACTLY
    // (R(entry + (target − entry)) === target).
    let dx = 0
    let dy = 0
    let placed: Point | null = null
    if (prevExit) {
      const u = normalize({
        x: prevExit.x - cfg.anchors.entry.x,
        y: prevExit.y - cfg.anchors.entry.y,
      })
      placed = {
        x: round2(prevExit.x - SEAM_GAP * u.x),
        y: round2(prevExit.y - SEAM_GAP * u.y),
      }
      dx = placed.x - cfg.anchors.entry.x
      dy = placed.y - cfg.anchors.entry.y
    }

    // Flatten the TRANSLATED stored `d`, then cut main/tail.
    const flat = flattenPathD(transformPathD(cfg.pathDefinition.d, 1, 1, dx, dy))
    const translatedExit = {
      x: round2(cfg.anchors.exit.x + dx),
      y: round2(cfg.anchors.exit.y + dy),
    }
    const mainArc = cfg.pathDefinition.mainEndArc
    const cut = mainArc !== undefined ? cutAtArc(flat.points, mainArc) : nearestVertex(flat.points, translatedExit)
    const main = flat.points.slice(0, cut + 1)
    const tail = flat.points.slice(cut + 1) // strictly after the main end (no shared dup)

    // Effective exit for the NEXT seam: x → d end; deferred → main end
    // (translated exit anchor); single-subpath → d end (identical values).
    const effectiveExit = isDeferred ? translatedExit : flat.points[flat.points.length - 1]

    // Checkpoints split by arc position on the translated flat.
    const cpsMain: LetterCheckpoint[] = []
    const cpsTail: LetterCheckpoint[] = []
    for (const cp of cfg.pathDefinition.checkpoints) {
      const tcp: LetterCheckpoint = {
        ...cp,
        x: round1(cp.x + dx),
        y: round1(cp.y + dy),
      }
      const arc = projectArc(flat.points, { x: tcp.x, y: tcp.y })
      if (mainArc === undefined || arc <= mainArc) cpsMain.push(tcp)
      else cpsTail.push(tcp)
    }
    parts.push({ cpsMain, cpsTail, deferred: isDeferred })

    // Translate the member's ideal cloud (the full stroke incl. secondaries —
    // the scoring target is the whole letter).
    const memberIdeal: Array<readonly [number, number]> = cfg.pathDefinition.ideal.map(
      ([x, y]) => [round1(x + dx), round1(y + dy)] as const,
    )
    ideal.push(...memberIdeal)

    // Connector from the PREVIOUS member's effective exit to THIS member's
    // placed entry (emitted BEFORE this member's main, so `d` bridges in
    // writing order). Skipped when the placed entry sits on the exit (<1px —
    // exact placement, no bridge). `placed`/`prevChunk` exist from i ≥ 1.
    if (placed && prevChunk && prevExit) {
      const p0 = prevExit
      const gap = Math.hypot(placed.x - p0.x, placed.y - p0.y)
      if (gap >= CONNECTOR_MIN_ARM) {
        const t0 = normalize({
          x: prevChunk[prevChunk.length - 1].x - prevChunk[prevChunk.length - 3].x,
          y: prevChunk[prevChunk.length - 1].y - prevChunk[prevChunk.length - 3].y,
        })
        const t3 = normalize({
          x: main[2].x - main[0].x,
          y: main[2].y - main[0].y,
        })
        const arm = gap / 3
        const c1 = { x: p0.x + arm * t0.x, y: p0.y + arm * t0.y }
        const c2 = { x: placed.x - arm * t3.x, y: placed.y - arm * t3.y }
        const steps = sampleCubic(p0, c1, c2, placed, CONNECTOR_STEPS)
        segmentOrder.push({ points: steps, ms: 500 })

        // Ideal: ±8px perpendicular band around each of the 24 samples.
        for (let s = 0; s < steps.length; s++) {
          const prevPt = s > 0 ? steps[s - 1] : p0
          const nextPt = s < steps.length - 1 ? steps[s + 1] : placed
          const ex = nextPt.x - prevPt.x
          const ey = nextPt.y - prevPt.y
          const len = Math.hypot(ex, ey) || 1
          const nx = -ey / len
          const ny = ex / len
          const c = steps[s]
          ideal.push([round1(c.x + nx * CONNECTOR_BAND), round1(c.y + ny * CONNECTOR_BAND)])
          ideal.push([round1(c.x - nx * CONNECTOR_BAND), round1(c.y - ny * CONNECTOR_BAND)])
        }
      }
    }

    // Immediate segment: main (+ tail unless deferred).
    segmentOrder.push({ points: main, ms: 2600 })
    if (tail.length > 0 && !isDeferred) {
      segmentOrder.push({ points: tail, ms: 600 })
    } else if (tail.length > 0) {
      deferredTails.push(tail)
    }

    prevExit = effectiveExit
    // The previous member's IMMEDIATE chunk = main + immediate tail (x), i.e.
    // everything pushed this iteration before the connector.
    prevChunk = tail.length > 0 && !isDeferred ? [...main, ...tail] : main
  }

  // Deferred secondaries (t/i/j), in word order, AFTER every letter+connector.
  for (const tail of deferredTails) {
    segmentOrder.push({ points: tail, ms: 600 })
  }

  // Single-M concatenation.
  const all: Point[] = []
  for (const seg of segmentOrder) for (const p of seg.points) all.push(p)
  const d = pathFromPoints(all)

  // Checkpoint renumbering: main/immediate 1..N in writing order, deferred LAST.
  const checkpoints: LetterCheckpoint[] = []
  let order = 1
  const emit = (cps: LetterCheckpoint[]): void => {
    for (const cp of cps) checkpoints.push({ ...cp, order: order++ })
  }
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i]
    emit(p.cpsMain)
    if (!p.deferred) emit(p.cpsTail)
  }
  for (let i = 0; i < parts.length; i++) {
    if (parts[i].deferred) emit(parts[i].cpsTail)
  }

  // Timeline: slide_in (member 0) → one draw_path per segment, cumulative
  // delays from 1000 → fade_out at max(delay + duration) + 200.
  const timeline: AnimationStep[] = []
  const slideIn = first.animationTimeline.find((s) => s.type === 'slide_in')
  if (slideIn) {
    timeline.push({ ...slideIn, id: `slide_in_${chars}` })
  }
  let t = 1000
  for (let s = 0; s < segmentOrder.length; s++) {
    const seg = segmentOrder[s]
    timeline.push({
      id: `draw_path_${chars}_${s + 1}`,
      type: 'draw_path',
      target: 'ink_demonstration',
      delay: t,
      duration: seg.ms,
      properties: { d: pathFromPoints(seg.points) },
    })
    t += seg.ms
  }
  timeline.push({
    id: `fade_out_${chars}`,
    type: 'fade_out',
    target: 'thematic_asset',
    delay: t + 200,
    duration: 600,
    properties: { opacity: 0.08 },
  })

  return {
    id: `palabra_${chars}`,
    character: chars,
    family: 'enlazada',
    baselineZone: first.baselineZone,
    anchors: {
      entry: first.anchors.entry,
      exit: prevExit ?? first.anchors.exit,
    },
    theme: first.theme,
    pathDefinition: {
      d,
      ideal,
      strokeWidth: first.pathDefinition.strokeWidth,
      checkpoints,
    },
    animationTimeline: timeline,
  }
}