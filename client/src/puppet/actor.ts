// The motion state of one puppet, stepped by plain numbers: one set of moods
// drives every character. Nothing here touches the DOM or the clock, so a test
// can walk it frame by frame.
import { clamp, seeded } from './geometry'

export type ActName = 'wave' | 'cheer' | 'scare' | 'sad' | 'sleep'

export const ACT_NAMES: readonly ActName[] = ['wave', 'cheer', 'scare', 'sad', 'sleep']

/** What a rig is, rather than what it is doing: the hedgehog's curl, the snake's
 *  length. Numbers, so a change can ease like a mood does. */
export type RigState = Readonly<Record<string, number>>

/** Seconds an act lasts when the caller does not say. */
export const ACT_SECONDS: Readonly<Record<ActName, number>> = { wave: 2.4, cheer: 2.2, scare: 1.3, sad: 2.6, sleep: 3.2 }

/** What a character's drawing reads each frame. */
export interface Pose {
  t: number
  a: Readonly<Record<ActName, number>>
  look: readonly [number, number]
  breath: number
  smile: number
  open: number
  brow: number
  hop: number
  state: RigState
}

export interface Actor {
  /** Animation phase; held at 0 while calm, which is the canonical still pose. */
  t: number
  /** Always advances: an act must end even on a puppet that does not breathe. */
  clock: number
  acts: Record<ActName, number>
  until: Record<ActName, number>
  look: [number, number]
  lookGoal: [number, number]
  state: Record<string, number>
  stateGoal: Record<string, number>
  nextBlink: number
  blinkAt: number | null
  rand: () => number
}

/** Below this an act no longer shows: the puppet has finished moving. */
const SETTLED = 0.002

export function createActor(seed: number, held?: ActName, state?: RigState): Actor {
  const rand = seeded(seed * 31 + 11)
  const acts: Record<ActName, number> = { wave: 0, cheer: 0, scare: 0, sad: 0, sleep: 0 }
  const until: Record<ActName, number> = { wave: 0, cheer: 0, scare: 0, sad: 0, sleep: 0 }
  if (held) {
    acts[held] = 1
    until[held] = Infinity
  }
  return {
    t: 0,
    clock: 0,
    acts,
    until,
    look: [0, 0],
    lookGoal: [0, 0],
    state: { ...state },
    stateGoal: { ...state },
    nextBlink: rand() * 3,
    blinkAt: null,
    rand,
  }
}

export function actFor(actor: Actor, name: ActName, seconds?: number): void {
  actor.until[name] = actor.clock + (seconds ?? ACT_SECONDS[name])
}

export function holdAct(actor: Actor, name: ActName, on: boolean): void {
  actor.until[name] = on ? Infinity : 0
}

/** Eases the rig towards `values`; a calm puppet just arrives. */
export function setActorState(actor: Actor, values: RigState): void {
  Object.assign(actor.stateGoal, values)
}

/** Advances one frame. Calm snaps moods to their goal instead of easing them
 *  and does not breathe, blink or hop, but an act still shows and still ends. */
export function stepActor(actor: Actor, dt: number, calm: boolean): void {
  actor.clock += dt
  if (calm) actor.t = 0
  else actor.t += dt
  const ease = calm ? 1 : 1 - Math.exp(-dt * 9)
  for (const name of ACT_NAMES) {
    const goal = actor.clock < actor.until[name] ? 1 : 0
    actor.acts[name] += (goal - actor.acts[name]) * ease
  }
  const settle = calm ? 1 : 1 - Math.exp(-dt * 5)
  for (const key of Object.keys(actor.stateGoal)) {
    const from = actor.state[key] ?? actor.stateGoal[key]
    actor.state[key] = from + (actor.stateGoal[key] - from) * settle
  }
  if (!calm) {
    actor.nextBlink -= dt
    if (actor.nextBlink < 0) {
      actor.blinkAt = actor.t
      actor.nextBlink = 1.8 + actor.rand() * 3
    }
  } else {
    actor.blinkAt = null
  }
  const follow = calm ? 1 : 1 - Math.exp(-dt * 12)
  actor.look[0] += (actor.lookGoal[0] - actor.look[0]) * follow
  actor.look[1] += (actor.lookGoal[1] - actor.look[1]) * follow
}

/** Whether another frame would change anything. A calm puppet with no act
 *  pending costs nothing: it is simply not on the ticker. */
export function actorNeedsTicks(actor: Actor, calm: boolean): boolean {
  if (!calm) return true
  if (Object.keys(actor.stateGoal).some((key) => Math.abs(actor.stateGoal[key] - (actor.state[key] ?? actor.stateGoal[key])) > SETTLED)) return true
  return ACT_NAMES.some((name) => actor.clock < actor.until[name] || actor.acts[name] > SETTLED)
}

export function isBlinking(actor: Actor): boolean {
  return actor.blinkAt !== null && actor.t - actor.blinkAt < 0.14
}

export function poseOf(actor: Actor, calm: boolean): Pose {
  const a = actor.acts
  return {
    t: actor.t,
    a,
    look: actor.look,
    breath: calm ? 0 : Math.sin(actor.t * 2),
    smile: 1 + a.cheer * 0.25 - a.sad * 1.9 - a.scare * 0.9 - a.sleep * 0.6,
    open: clamp(a.cheer * 0.95 + a.wave * 0.5 + a.scare * 0.55, 0, 1),
    brow: a.sad + a.scare * 0.7,
    hop: Math.abs(Math.sin(actor.t * 7.5)),
    state: actor.state,
  }
}

/** Where the eyes aim for a pointer at `pointer`, seen from `centre`: a unit
 *  direction scaled down inside `reach`, so a nearby finger is a small glance. */
export function lookFromPointer(
  centre: { x: number; y: number },
  pointer: { x: number; y: number },
  reach: number,
): [number, number] {
  const dx = pointer.x - centre.x
  const dy = pointer.y - centre.y
  const distance = Math.hypot(dx, dy)
  if (distance === 0 || reach <= 0) return [0, 0]
  const k = Math.min(1, distance / reach) / distance
  return [dx * k, dy * k]
}
