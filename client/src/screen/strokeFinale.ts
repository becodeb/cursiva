// The closing finale as data: what the child's own line becomes, per family, and
// where everything is at any moment. Pure, like `zoo/rescueFlight.ts`'s geometry,
// so `StrokeFinale.tsx` only writes attributes and every moment can be tested
// without a DOM. The line is scaled uniformly and never reshaped: the wobble the
// child drew is the wobble the duck rides.
import { clamp, fmt, lerp, tubePath, type Vec } from '../puppet/geometry'
import type { AdventureFinale, FinaleKind } from '../zoo/adventures'
import type { TracedLine } from '../zoo/tracedLine'

export const FINALE_STAGE = { w: 1000, h: 625 } as const
/** Past any viewport, so a big shape never shows its edge. */
const OFF_STAGE = 3000
const DRAW_END = 1.1
const MOVE_END = 3.7
const FINALE_SECONDS = 4.4
/** How long a finale that shows the still composition stays up by itself. */
export const STILL_SECONDS = 2.6
const POP_SECONDS = 0.35

export interface FinaleFill {
  readonly d: string
  readonly colour: string
  /** How far it rises into place; 0 fades in instead. */
  readonly rise: number
  readonly from: number
  readonly to: number
}

export type FinalePropKind = 'flower' | 'bubble' | 'leaf' | 'drop' | 'scute'

export interface FinaleProp {
  readonly kind: FinalePropKind
  readonly x: number
  readonly y: number
  readonly size: number
  /** When it appears, seconds. */
  readonly at: number
  /** Seconds until it is gone; absent stays. */
  readonly life?: number
  /** How far it drifts up over its life. */
  readonly rise?: number
}

export interface FinaleStrip {
  readonly colour: string
  readonly width: number
  /** The paper margin around it, which keeps it readable on any backdrop. */
  readonly edge: number
}

/** Where the art sits relative to the point it travels on, and how it leans. */
export interface FinaleCarriage {
  readonly size: number
  /** Fraction of the art's height below the point (0: feet on it; 1: hangs under). */
  readonly anchor: number
  /** Fraction of the art's width left of the point. Absent is its middle. */
  readonly pivotX?: number
  /** How much of the line's slope the body follows. */
  readonly lean: number
  readonly motion: 'float' | 'walk' | 'swing' | 'fly' | 'none'
  readonly front: boolean
}

export interface FinaleScene {
  readonly kind: FinaleKind
  readonly seconds: number
  /** One path per stroke, revealed in order; the last is the leading edge. */
  readonly strokes: readonly string[]
  readonly strokeLengths: readonly number[]
  readonly strip: FinaleStrip
  /** Extra paper the line hangs from, revealed with it. */
  readonly hangs: readonly string[]
  readonly fills: readonly FinaleFill[]
  readonly props: readonly FinaleProp[]
  readonly track: readonly Vec[]
  readonly carriage: FinaleCarriage
  readonly draw: readonly [number, number]
  readonly move: readonly [number, number]
  /** The reveal follows the animal instead of leading it (the bee's route). */
  readonly trail: boolean
  /** The way the art looks when it is not flipped. */
  readonly faces: 'left' | 'right'
  /** `slither`: the body IS the line, so no separate art travels. */
  readonly snake?: { readonly track: readonly Vec[]; readonly lineLength: number }
}

export interface FinalePropFrame {
  readonly shown: number
  readonly x: number
  readonly y: number
  readonly opacity: number
}

export interface FinaleFrame {
  readonly strokes: readonly number[]
  readonly fills: readonly number[]
  readonly props: readonly FinalePropFrame[]
  readonly animal: { readonly x: number; readonly y: number; readonly rotate: number; readonly flip: boolean; readonly lift: number }
  readonly snake?: { readonly d: string; readonly stripe: string; readonly head: Vec; readonly angle: number }
  /** The line has done its work: the Pulpito cheers. */
  readonly cheering: boolean
}

const ease = (t: number): number => t * t * (3 - 2 * t)

function pathOf(points: readonly Vec[], closed = false): string {
  return `M${points.map((p) => `${fmt(p[0])} ${fmt(p[1])}`).join('L')}${closed ? 'Z' : ''}`
}

/** Seen from the point it travels: cumulative arc length of a polyline. */
function arcLengths(points: readonly Vec[]): number[] {
  const out = [0]
  for (let i = 1; i < points.length; i++) {
    out.push(out[i - 1] + Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]))
  }
  return out
}

export function pointAtArc(points: readonly Vec[], arcs: readonly number[], s: number): Vec {
  if (s <= 0) return points[0]
  const total = arcs[arcs.length - 1]
  if (s >= total) return points[points.length - 1]
  let lo = 0
  let hi = arcs.length - 1
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1
    if (arcs[mid] <= s) lo = mid
    else hi = mid
  }
  const span = arcs[hi] - arcs[lo]
  const t = span === 0 ? 0 : (s - arcs[lo]) / span
  return [lerp(points[lo][0], points[hi][0], t), lerp(points[lo][1], points[hi][1], t)]
}

/** The line, uniformly scaled and centred in a box. Never stretched: stretching
 *  it would draw someone else's line. */
export function fitStrokes(
  strokes: readonly (readonly Vec[])[],
  size: { w: number; h: number },
  box: { x: number; y: number; w: number; h: number },
): Vec[][] {
  const scale = Math.min(box.w / Math.max(size.w, 1e-3), box.h / Math.max(size.h, 1e-3))
  const dx = box.x + (box.w - size.w * scale) / 2
  const dy = box.y + (box.h - size.h * scale) / 2
  return strokes.map((s) => s.map((p): Vec => [dx + p[0] * scale, dy + p[1] * scale]))
}

function boundsOf(points: readonly Vec[]): { x: number; y: number; w: number; h: number } {
  const xs = points.map((p) => p[0])
  const ys = points.map((p) => p[1])
  const x = Math.min(...xs)
  const y = Math.min(...ys)
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y }
}

/** The first place the line closes on itself: the oval inside a run of ovals, or
 *  the whole line when it never closes. */
export function firstLoop(points: readonly Vec[]): Vec[] {
  const { w, h } = boundsOf(points)
  const span = Math.max(w, h)
  const near = span * 0.07
  const arcs = arcLengths(points)
  const minArc = span * 0.4
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 2; j < points.length; j++) {
      if (arcs[j] - arcs[i] < minArc) continue
      if (Math.hypot(points[j][0] - points[i][0], points[j][1] - points[i][1]) <= near) return points.slice(i, j + 1)
    }
  }
  return points.slice()
}

/** The ground under a line: the line as its top edge, carried off both sides. */
function groundUnder(track: readonly Vec[], dx = 0, dy = 0): string {
  const first = track[0]
  const last = track[track.length - 1]
  const [left, right] = first[0] <= last[0] ? [first, last] : [last, first]
  const ordered = first[0] <= last[0] ? track : [...track].reverse()
  const top = ordered.map((p): Vec => [p[0] + dx, p[1] + dy])
  return pathOf(
    [
      [-OFF_STAGE, left[1] + dy],
      ...top,
      [OFF_STAGE, right[1] + dy],
      [OFF_STAGE, OFF_STAGE],
      [-OFF_STAGE, OFF_STAGE],
    ],
    true,
  )
}

/** A prop roughly every `every` units of the track, timed to when the animal
 *  reaches that spot. */
function alongTrack(
  track: readonly Vec[],
  every: number,
  timeAt: (fraction: number) => number,
  make: (p: Vec, at: number, i: number) => FinaleProp,
): FinaleProp[] {
  const arcs = arcLengths(track)
  const total = arcs[arcs.length - 1]
  const count = Math.max(2, Math.floor(total / every))
  return Array.from({ length: count }, (_, i) => {
    const fraction = (i + 0.5) / count
    return make(pointAtArc(track, arcs, total * fraction), timeAt(fraction), i)
  })
}

const moveTime = (fraction: number): number => lerp(DRAW_END, MOVE_END, fraction)

interface Composed {
  strokes: Vec[][]
  strip: FinaleStrip
  hangs?: string[]
  fills?: FinaleFill[]
  props?: FinaleProp[]
  track?: Vec[]
  carriage: FinaleCarriage
  draw?: [number, number]
  move?: [number, number]
  trail?: boolean
  snake?: { track: Vec[]; lineLength: number }
  closed?: boolean
}

const WIDE_BOX = { x: 70, y: 200, w: 860, h: 250 }

type Composer = (line: TracedLine, joined: readonly Vec[], finale: AdventureFinale, artAspect: number) => Composed

function joinedFit(line: TracedLine, joined: readonly Vec[], box: { x: number; y: number; w: number; h: number }): Vec[] {
  return fitStrokes([joined], { w: line.w, h: line.h }, box)[0]
}

const COMPOSERS: Readonly<Record<FinaleKind, Composer>> = {
  // The waves become the water's own surface, and the duck rides them.
  water: (line, joined, finale) => {
    const track = joinedFit(line, joined, WIDE_BOX)
    const [top, middle, deep] = finale.tint ?? ['#8dd3de', '#64b5c9', '#4797b0']
    return {
      strokes: [track],
      strip: { colour: '#f4fbfa', width: 13, edge: 0 },
      // Each layer repeats the child's line further down, so the whole water is
      // visibly made of it. Nearest last: a deeper sheet lies over the one above.
      fills: [
        { d: groundUnder(track), colour: top, rise: 420, from: 0.5, to: 1.2 },
        { d: groundUnder(track, 26, 72), colour: middle, rise: 420, from: 0.62, to: 1.32 },
        { d: groundUnder(track, -18, 150), colour: deep, rise: 420, from: 0.74, to: 1.44 },
      ],
      carriage: { size: 165, anchor: 0.12, lean: 0.4, motion: 'float', front: true },
    }
  },
  // Follows the traced waves exactly: over the surface and back under it.
  leap: (line, joined, finale) => {
    const track = joinedFit(line, joined, { x: 70, y: 150, w: 860, h: 300 })
    const surface = boundsOf(track).y + boundsOf(track).h * 0.62
    const [top, deep] = finale.tint ?? ['#6fc0d6', '#4c9fbb']
    const arcs = arcLengths(track)
    const total = arcs[arcs.length - 1]
    const props: FinaleProp[] = []
    track.forEach((p, i) => {
      if (i === 0 || (track[i - 1][1] - surface) * (p[1] - surface) > 0) return
      const at = moveTime(ease(arcs[i] / total))
      for (const [dx, size] of [[-22, 9], [0, 13], [24, 8]] as const) {
        props.push({ kind: 'drop', x: p[0] + dx, y: surface, size, at, life: 0.7, rise: 46 })
      }
    })
    return {
      strokes: [track],
      strip: { colour: '#e8f7f8', width: 10, edge: 4 },
      fills: [
        { d: pathOf([[-OFF_STAGE, surface + 26], [OFF_STAGE, surface + 26], [OFF_STAGE, OFF_STAGE], [-OFF_STAGE, OFF_STAGE]], true), colour: deep, rise: 260, from: 0.4, to: 1.1 },
        { d: pathOf([[-OFF_STAGE, surface + 60], [OFF_STAGE, surface + 60], [OFF_STAGE, OFF_STAGE], [-OFF_STAGE, OFF_STAGE]], true), colour: top, rise: 260, from: 0.5, to: 1.2 },
      ],
      props,
      carriage: { size: 140, anchor: 0.5, lean: 1, motion: 'none', front: true },
    }
  },
  // The peaks become the hill it walks over.
  hills: (line, joined, finale) => {
    const track = joinedFit(line, joined, { x: 90, y: 190, w: 820, h: 260 })
    const [near, far] = finale.tint ?? ['#9ccb78', '#7dae5c']
    return {
      strokes: [track],
      strip: { colour: '#fbf6e4', width: 10, edge: 0 },
      fills: [
        { d: groundUnder(track, 70, -30), colour: far, rise: 380, from: 0.5, to: 1.2 },
        { d: groundUnder(track), colour: near, rise: 380, from: 0.7, to: 1.4 },
      ],
      carriage: { size: 150, anchor: 0.06, lean: 0.4, motion: 'walk', front: true },
    }
  },
  // The oval closes over its back and is its shell: head and legs stick out of it.
  shell: (_line, joined, finale, artAspect) => {
    const loop = firstLoop(joined)
    const raw = boundsOf(loop)
    // A tall oval lies down, whole: turned, never stretched. A shell is wider than tall.
    const turned = raw.h > raw.w ? loop.map((p): Vec => [p[1], -p[0]]) : loop
    const size = boundsOf(turned)
    const local = turned.map((p): Vec => [p[0] - size.x, p[1] - size.y])
    const track = fitStrokes([local], { w: size.w, h: size.h }, { x: 330, y: 190, w: 320, h: 225 })[0]
    const fit = boundsOf(track)
    const [plate, strip] = finale.tint ?? ['#a9c777', '#4f7f4a']
    const centre: Vec = [fit.x + fit.w / 2, fit.y + fit.h / 2]
    const props = track
      .filter((_, i) => i % Math.max(1, Math.floor(track.length / 8)) === 0)
      .map((p, i): FinaleProp => ({
        kind: 'scute',
        x: lerp(p[0], centre[0], 0.42),
        y: lerp(p[1], centre[1], 0.42),
        size: 23,
        at: 2.6 + i * 0.05,
      }))
    // The art's own back spans about this share of its width: it ends up under the line.
    const artWidth = fit.w / 0.58
    return {
      strokes: [[...track, track[0]]],
      strip: { colour: strip, width: 18, edge: 5 },
      fills: [{ d: pathOf(track, true), colour: plate, rise: 0, from: 2.2, to: 2.7 }],
      props,
      track: [centre, centre],
      carriage: { size: artWidth / artAspect, anchor: 0.6, pivotX: 0.42, lean: 0, motion: 'none', front: false },
      draw: [0.2, 2.4],
      move: [2.7, 4.2],
    }
  },
  // The loops become lianas, hung from the top of the stage.
  lianas: (line, joined, finale) => {
    const track = joinedFit(line, joined, { x: 70, y: 110, w: 860, h: 230 })
    const [vine] = finale.tint ?? ['#4f8a43']
    const tops = track.filter((p, i) => i > 0 && i < track.length - 1 && p[1] < track[i - 1][1] && p[1] <= track[i + 1][1])
    const spaced = tops.filter((p, i) => i === 0 || Math.abs(p[0] - tops[i - 1][0]) > 90)
    return {
      strokes: [track],
      strip: { colour: vine, width: 15, edge: 4 },
      hangs: (spaced.length > 0 ? spaced : [track[0]]).map((p) => pathOf([[p[0], -OFF_STAGE], p])),
      props: alongTrack(track, 110, (f) => lerp(0.1, DRAW_END, f), (p, at): FinaleProp => ({ kind: 'leaf', x: p[0], y: p[1], size: 22, at })),
      // Held by its raised hand, which the art carries at its top left.
      carriage: { size: 165, anchor: 0.98, pivotX: 0.13, lean: 0, motion: 'swing', front: true },
    }
  },
  // The line wakes up: it is the snake's body, and it leaves.
  slither: (line, joined) => {
    const track = joinedFit(line, joined, { x: 60, y: 170, w: 820, h: 300 })
    const arcs = arcLengths(track)
    const lineLength = arcs[arcs.length - 1]
    const end = track[track.length - 1]
    const heading = end[0] >= track[0][0] ? 1 : -1
    const exit: Vec[] = Array.from({ length: 16 }, (_, i): Vec => [
      end[0] + heading * (i + 1) * Math.max(60, lineLength / 12),
      end[1] + Math.sin((i + 1) * 0.9) * 26,
    ])
    return {
      strokes: [],
      strip: { colour: '#7fb24a', width: 0, edge: 0 },
      track: [end, end],
      carriage: { size: 0, anchor: 0, lean: 0, motion: 'none', front: true },
      snake: { track: [...track, ...exit], lineLength },
      draw: [0, DRAW_END],
      move: [DRAW_END + 0.2, 4.2],
    }
  },
  // Flies the child's own route, and flowers open as it passes.
  route: (line, joined) => {
    const track = joinedFit(line, joined, { x: 90, y: 120, w: 820, h: 360 })
    const props = alongTrack(track, 150, (f) => lerp(0.3, MOVE_END, f), (p, at, i): FinaleProp => ({
      kind: 'flower',
      x: p[0],
      y: p[1] + (i % 2 === 0 ? 46 : -46),
      size: 15,
      at,
    }))
    return {
      strokes: [track],
      strip: { colour: '#fff4c9', width: 8, edge: 3 },
      props,
      carriage: { size: 115, anchor: 0.55, lean: 0.2, motion: 'fly', front: true },
      draw: [0.3, MOVE_END],
      move: [0.3, MOVE_END],
      trail: true,
    }
  },
  // Swims the garlands, and bubbles rise along them.
  bubbles: (line, joined) => {
    const track = joinedFit(line, joined, { x: 80, y: 190, w: 840, h: 270 })
    return {
      strokes: [track],
      strip: { colour: '#c7edf2', width: 13, edge: 4 },
      props: alongTrack(track, 62, moveTime, (p, at, i): FinaleProp => ({
        kind: 'bubble',
        x: p[0] + (i % 2 === 0 ? -8 : 10),
        y: p[1] - 14,
        size: 9 + (i % 3) * 5,
        at,
        life: 1.5,
        rise: 110,
      })),
      carriage: { size: 150, anchor: 0.5, lean: 0.6, motion: 'none', front: true },
    }
  },
  // Each stroke, where it was drawn, is one of its spines.
  spines: (line) => {
    const box = { x: 250, y: 70, w: 500, h: 470 }
    const strokes = fitStrokes(line.strokes, { w: line.w, h: line.h }, box)
    const fit = boundsOf(strokes.flat())
    const centre: Vec = [fit.x + fit.w / 2, fit.y + fit.h / 2]
    return {
      strokes,
      strip: { colour: '#6b4a2e', width: 11, edge: 3 },
      track: [centre, centre],
      carriage: { size: Math.min(fit.h, fit.w) * 0.74, anchor: 0.5, lean: 0, motion: 'none', front: false },
      draw: [0.3, 3.2],
      move: [3.3, 4.2],
    }
  },
}

/** A scene for this line, or `null` when the line has nothing to draw with: the
 *  closing then simply runs without a finale. */
export function composeFinale(finale: AdventureFinale, line: TracedLine, artAspect = 1): FinaleScene | null {
  const joined = line.strokes.flat() as Vec[]
  if (joined.length < 2) return null
  const composed = COMPOSERS[finale.kind](line, joined, finale, artAspect)
  const track = composed.track ?? composed.strokes[0]
  if (!track || track.length < 2) return null
  return {
    kind: finale.kind,
    seconds: FINALE_SECONDS,
    strokes: composed.strokes.map((s) => pathOf(s)),
    strokeLengths: composed.strokes.map((s) => {
      const arcs = arcLengths(s)
      return arcs[arcs.length - 1]
    }),
    strip: composed.strip,
    hangs: composed.hangs ?? [],
    fills: composed.fills ?? [],
    props: composed.props ?? [],
    track,
    carriage: composed.carriage,
    draw: composed.draw ?? [0, DRAW_END],
    move: composed.move ?? [DRAW_END, MOVE_END],
    trail: composed.trail ?? false,
    faces: finale.faces ?? 'right',
    snake: composed.snake,
  }
}

const arcCache = new WeakMap<readonly Vec[], number[]>()
function cachedArcs(points: readonly Vec[]): number[] {
  let arcs = arcCache.get(points)
  if (!arcs) {
    arcs = arcLengths(points)
    arcCache.set(points, arcs)
  }
  return arcs
}

const SLOPE_WINDOW = 26

function animalFrame(scene: FinaleScene, s: number): FinaleFrame['animal'] {
  const { track, carriage } = scene
  const arcs = cachedArcs(track)
  const total = arcs[arcs.length - 1]
  const at = total * s
  const p = pointAtArc(track, arcs, at)
  const a = pointAtArc(track, arcs, at - SLOPE_WINDOW)
  const b = pointAtArc(track, arcs, at + SLOPE_WINDOW)
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const goingLeft = dx < -1e-3
  const flip = goingLeft !== (scene.faces === 'left')
  // The line's own slope, whichever way along it the animal is going.
  const slope = (Math.atan2(goingLeft ? -dy : dy, Math.abs(dx) + 1e-6) * 180) / Math.PI
  const phase = s * total
  let rotate = slope * carriage.lean
  let lift = 0
  if (carriage.motion === 'float') lift = Math.sin(phase / 38) * 4
  if (carriage.motion === 'walk') lift = Math.abs(Math.sin(phase / 24)) * 9
  if (carriage.motion === 'fly') lift = Math.sin(phase / 18) * 9
  if (carriage.motion === 'swing') rotate = Math.sin(phase / 62) * 24
  return { x: p[0], y: p[1], rotate, flip, lift }
}

function snakeFrame(scene: FinaleScene, t: number, still: boolean): FinaleFrame['snake'] {
  const snake = scene.snake
  if (!snake) return undefined
  const arcs = cachedArcs(snake.track)
  const total = arcs[arcs.length - 1]
  const { lineLength } = snake
  const drawn = ease(clamp(t / scene.draw[1], 0, 1))
  const left = clamp((t - scene.move[0]) / (scene.move[1] - scene.move[0]), 0, 1)
  const head = still ? lineLength : drawn * lineLength + left * left * (total - lineLength)
  const tail = Math.max(0, head - lineLength)
  // Asleep it is exactly the child's line; only awake does it start to ripple.
  const ripple = still ? 0 : Math.min(1, left * 6) * 9
  const SAMPLES = 56
  const spine: Vec[] = []
  for (let i = 0; i <= SAMPLES; i++) {
    const u = i / SAMPLES
    const s = lerp(tail, head, u)
    const p = pointAtArc(snake.track, arcs, s)
    const q = pointAtArc(snake.track, arcs, s + 6)
    const angle = Math.atan2(q[1] - p[1], q[0] - p[0])
    const wave = Math.sin(u * 9 - t * 8) * ripple * Math.sin(u * Math.PI)
    spine.push([p[0] - Math.sin(angle) * wave, p[1] + Math.cos(angle) * wave])
  }
  const last = spine[spine.length - 1]
  const before = spine[spine.length - 3] ?? spine[0]
  const alive = head - tail >= 1
  const width = (u: number): number => 5 + Math.sin(Math.min(u * 1.25, 1) * (Math.PI / 2)) * 13
  const d = alive ? tubePath(spine, width) : ''
  const stripe = alive ? tubePath(spine, (u) => width(u) * 0.34) : ''
  return { d, stripe, head: last, angle: (Math.atan2(last[1] - before[1], last[0] - before[0]) * 180) / Math.PI }
}

/** Everything's position at `t` seconds. `still` is the finished composition,
 *  with nothing in flight: reduced motion, and the state a skip lands on. */
export function finaleFrame(scene: FinaleScene, t: number, still = false): FinaleFrame {
  const moment = still ? scene.seconds : clamp(t, 0, scene.seconds)
  const drawn = clamp((moment - scene.draw[0]) / (scene.draw[1] - scene.draw[0]), 0, 1)
  const moved = clamp((moment - scene.move[0]) / (scene.move[1] - scene.move[0]), 0, 1)
  const totalLength = scene.strokeLengths.reduce((a, b) => a + b, 0) || 1
  let reached = (scene.trail ? ease(drawn) : drawn) * totalLength
  const strokes = scene.strokeLengths.map((length) => {
    // Finished means finished: no rounding error may leave a dash of it hidden.
    if (drawn >= 1) return 1
    const part = length === 0 ? 1 : clamp(reached / length, 0, 1)
    reached = Math.max(0, reached - length)
    return part
  })
  const fills = scene.fills.map((fill) => ease(clamp((moment - fill.from) / (fill.to - fill.from), 0, 1)))
  const props = scene.props.map((prop): FinalePropFrame => {
    const since = moment - prop.at
    if (still) return { shown: 1, x: prop.x, y: prop.y - (prop.rise ?? 0) * 0.4, opacity: 1 }
    if (since <= 0) return { shown: 0, x: prop.x, y: prop.y, opacity: 0 }
    const pop = clamp(since / POP_SECONDS, 0, 1)
    // A small overshoot: a flower opens, it does not fade in.
    const shown = pop < 1 ? ease(pop) * (1 + Math.sin(pop * Math.PI) * 0.25) : 1
    if (prop.life === undefined) return { shown, x: prop.x, y: prop.y, opacity: 1 }
    const lived = clamp(since / prop.life, 0, 1)
    return { shown, x: prop.x, y: prop.y - (prop.rise ?? 0) * lived, opacity: lived > 0.7 ? (1 - lived) / 0.3 : 1 }
  })
  return {
    strokes,
    fills,
    props,
    animal: animalFrame(scene, ease(moved)),
    snake: snakeFrame(scene, moment, still),
    cheering: still || moment >= scene.move[1] - 0.5,
  }
}
