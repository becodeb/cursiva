// What a rescued animal does on the map: the thing it learned, on the line the child
// drew for it. Pure, so a test can walk an animal round its routine, and so the map can
// keep only a few of them moving at any moment on a school tablet.
import type { ZooAnimalId } from '../detective/assets'
import type { TracedLine, TracedPoint } from './tracedLine'

export type LifeKind = 'swim' | 'fly' | 'slither' | 'swing' | 'leap' | 'hop' | 'stroll'

/** `onLine`: the animal goes along the child's own line, when there is one. `looks`: the
 *  way its puppet is drawn facing, -1 for left. `name`: what it says when tapped. */
export const ANIMAL_LIFE: Readonly<Record<ZooAnimalId, { readonly kind: LifeKind; readonly onLine: boolean; readonly looks: 1 | -1; readonly name: string }>> = {
  pato: { kind: 'swim', onLine: true, looks: 1, name: 'El pato' },
  pez: { kind: 'swim', onLine: true, looks: 1, name: 'Los peces' },
  abeja: { kind: 'fly', onLine: true, looks: 1, name: 'La abeja' },
  vibora: { kind: 'slither', onLine: true, looks: -1, name: 'La víbora' },
  delfin: { kind: 'leap', onLine: false, looks: 1, name: 'El delfín' },
  mono: { kind: 'swing', onLine: false, looks: -1, name: 'El mono' },
  oveja: { kind: 'hop', onLine: false, looks: -1, name: 'La oveja' },
  erizo: { kind: 'hop', onLine: false, looks: -1, name: 'El erizo' },
  llama: { kind: 'stroll', onLine: false, looks: 1, name: 'La llama' },
  tortuga: { kind: 'stroll', onLine: false, looks: 1, name: 'La tortuga' },
  // Only ever suspects on a deduction: no sector stands them.
  gallina: { kind: 'hop', onLine: false, looks: -1, name: 'La gallina' },
  vaca: { kind: 'stroll', onLine: false, looks: -1, name: 'La vaca' },
  gato: { kind: 'hop', onLine: false, looks: -1, name: 'El gato' },
}

/** Moving at once, at most: the rest stand still and cost nothing. */
export const MAX_MOVING = 3
/** One routine, seconds. It starts and ends on the animal's own spot. */
export const LIFE_SECONDS = 6
const REST_SECONDS = 1.5
export const CYCLE_SECONDS = LIFE_SECONDS + REST_SECONDS

/** Who moves at `clock`: a few at a time, everyone gets a turn. A pure function of the
 *  clock, so nothing has to remember whose turn it was. */
export function movingAt(clock: number, ids: readonly ZooAnimalId[], max: number = MAX_MOVING): readonly { id: ZooAnimalId; t: number }[] {
  if (ids.length === 0) return []
  const round = Math.floor(clock / CYCLE_SECONDS)
  const t = clock - round * CYCLE_SECONDS
  if (t >= LIFE_SECONDS) return []
  const count = Math.min(max, ids.length)
  const out: { id: ZooAnimalId; t: number }[] = []
  for (let i = 0; i < count; i++) out.push({ id: ids[(round * count + i) % ids.length], t })
  return out
}

export interface Box {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

export interface LifePose {
  readonly x: number
  readonly y: number
  /** The way it travels, 1 to the right; absent stays as drawn. */
  readonly facing?: 1 | -1
  readonly tilt: number
}

export const AT_REST: LifePose = { x: 0, y: 0, tilt: 0 }

const smooth = (t: number): number => t * t * (3 - 2 * t)
const TAU = Math.PI * 2

/** Leaves and comes back gently, so a routine can begin and end from standing. */
const envelope = (u: number): number => smooth(Math.min(1, Math.min(u, 1 - u) / 0.14))

/** The child's line laid out on the map, in stage units: where the keepsake is drawn. */
export function layLine(line: TracedLine, box: Box): TracedPoint[][] {
  const width = Math.max(box.width * 1.15, 70)
  const scale = width / Math.max(line.w, 0.2)
  const cap = 30 / Math.max(line.h, 0.05)
  const k = Math.min(scale, cap)
  const left = box.x + box.width / 2 - (line.w * k) / 2
  const top = box.y + box.height - (line.h * k) / 2 + 4
  return line.strokes.map((stroke) => stroke.map(([x, y]): TracedPoint => [left + x * k, top + y * k]))
}

/** The point `u` of the way along a laid line, every stroke in turn. */
export function pointAlong(strokes: readonly (readonly TracedPoint[])[], u: number): TracedPoint {
  const points = strokes.flat()
  if (points.length === 1) return points[0]
  let total = 0
  for (let i = 1; i < points.length; i++) total += Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1])
  let left = Math.max(0, Math.min(1, u)) * total
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]
    const b = points[i]
    const s = Math.hypot(b[0] - a[0], b[1] - a[1])
    if (s >= left && s > 0) {
      const f = left / s
      return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]
    }
    left -= s
  }
  return points[points.length - 1]
}

/** Along the child's line and back, from its own spot and home again. */
function alongRoute(route: readonly (readonly TracedPoint[])[], box: Box, u: number): LifePose {
  const out = u < 0.5 ? u * 2 : (1 - u) * 2
  const at = pointAlong(route, smooth(out))
  const ahead = pointAlong(route, smooth(Math.min(1, out + 0.02)))
  const feetX = box.x + box.width / 2
  const feetY = box.y + box.height
  const blend = envelope(u)
  const heading = (ahead[0] - at[0]) * (u < 0.5 ? 1 : -1)
  return {
    x: (at[0] - feetX) * blend,
    y: (at[1] - feetY) * blend,
    facing: heading < 0 ? -1 : 1,
    tilt: 0,
  }
}

/** Where the animal stands `t` seconds into its routine. */
export function lifePose(kind: LifeKind, t: number, box: Box, route?: readonly (readonly TracedPoint[])[]): LifePose {
  const u = Math.max(0, Math.min(1, t / LIFE_SECONDS))
  const blend = envelope(u)
  if (route && route.flat().length >= 2) {
    const along = alongRoute(route, box, u)
    return kind === 'fly' ? { ...along, y: along.y - box.height * 0.25 * blend } : along
  }
  const reach = box.width * 0.34
  switch (kind) {
    case 'swim': {
      const x = Math.sin(u * TAU) * reach
      return { x, y: Math.sin(u * TAU * 4) * 2 * blend, facing: Math.cos(u * TAU) < 0 ? -1 : 1, tilt: Math.sin(u * TAU * 4) * 2 * blend }
    }
    case 'fly': {
      const x = Math.sin(u * TAU) * reach * 1.2
      return { x, y: (Math.sin(u * TAU * 2) * box.height * 0.2 - box.height * 0.25) * blend, facing: Math.cos(u * TAU) < 0 ? -1 : 1, tilt: 0 }
    }
    case 'slither':
      return { x: Math.sin(u * TAU) * reach, y: Math.sin(u * TAU * 3) * 3 * blend, facing: Math.cos(u * TAU) < 0 ? -1 : 1, tilt: 0 }
    case 'swing':
      return { x: Math.sin(u * TAU * 2) * box.width * 0.12 * blend, y: Math.abs(Math.cos(u * TAU * 2)) * -5 * blend, tilt: Math.sin(u * TAU * 2) * 16 * blend }
    case 'leap': {
      const arc = Math.abs(Math.sin(u * TAU * 1.5))
      return { x: Math.sin(u * TAU) * reach * 0.5, y: -arc * box.height * 0.42 * blend, facing: Math.cos(u * TAU) < 0 ? -1 : 1, tilt: Math.cos(u * TAU * 1.5) * Math.sign(Math.sin(u * TAU * 1.5)) * -22 * blend }
    }
    case 'hop':
      return { x: 0, y: -Math.abs(Math.sin(u * TAU * 2.5)) * box.height * 0.1 * blend, tilt: 0 }
    case 'stroll':
      return { x: Math.sin(u * TAU) * reach * 0.7, y: 0, facing: Math.cos(u * TAU) < 0 ? -1 : 1, tilt: Math.sin(u * TAU * 8) * 2 * blend }
  }
}

/** A hop of joy, `h` tall, `n` times in `seconds`: an arrival or a tap. */
export function joyHop(t: number, seconds: number, h: number, n = 2): number {
  if (t <= 0 || t >= seconds) return 0
  return -Math.abs(Math.sin((t / seconds) * Math.PI * n)) * h
}
