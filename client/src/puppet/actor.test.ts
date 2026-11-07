import { describe, expect, it } from 'vitest'
import { actFor, actorNeedsTicks, ACT_SECONDS, createActor, holdAct, isBlinking, lookFromPointer, poseOf, stepActor } from './actor'

const DT = 1 / 30
const run = (actor: ReturnType<typeof createActor>, seconds: number, calm: boolean): void => {
  for (let i = 0; i < Math.round(seconds / DT); i++) stepActor(actor, DT, calm)
}

describe('a live puppet', () => {
  it('breathes and blinks by itself, and always wants frames', () => {
    const actor = createActor(7)
    let blinks = 0
    const breaths = new Set<number>()
    for (let i = 0; i < 300; i++) {
      stepActor(actor, DT, false)
      if (isBlinking(actor)) blinks++
      breaths.add(Math.round(poseOf(actor, false).breath * 10))
    }
    expect(blinks).toBeGreaterThan(0)
    expect(breaths.size).toBeGreaterThan(5)
    expect(actorNeedsTicks(actor, false)).toBe(true)
  })

  it('eases into an act and back out when its time is up', () => {
    const actor = createActor(7)
    actFor(actor, 'cheer')
    stepActor(actor, DT, false)
    expect(actor.acts.cheer).toBeGreaterThan(0)
    expect(actor.acts.cheer).toBeLessThan(1)
    run(actor, 1, false)
    expect(actor.acts.cheer).toBeGreaterThan(0.9)
    run(actor, ACT_SECONDS.cheer + 1, false)
    expect(actor.acts.cheer).toBeLessThan(0.01)
  })
})

describe('a calm puppet (a trace screen, or reduced motion)', () => {
  it('does not move on its own and asks for no frames at all', () => {
    const actor = createActor(7)
    run(actor, 20, true)
    const pose = poseOf(actor, true)
    expect(pose.t).toBe(0)
    expect(pose.breath).toBe(0)
    expect(pose.hop).toBe(0)
    expect(isBlinking(actor)).toBe(false)
    expect(actorNeedsTicks(actor, true)).toBe(false)
  })

  it('still reacts to an act, at once, and the act still ends', () => {
    const actor = createActor(7)
    actFor(actor, 'sad', 1)
    expect(actorNeedsTicks(actor, true)).toBe(true)
    stepActor(actor, DT, true)
    expect(actor.acts.sad).toBe(1)
    expect(poseOf(actor, true).smile).toBeLessThan(0)
    run(actor, 1.1, true)
    expect(actor.acts.sad).toBe(0)
    expect(actorNeedsTicks(actor, true)).toBe(false)
  })

  it('holds until released', () => {
    const actor = createActor(7)
    holdAct(actor, 'sleep', true)
    run(actor, 60, true)
    expect(actor.acts.sleep).toBe(1)
    expect(actorNeedsTicks(actor, true)).toBe(true)
    holdAct(actor, 'sleep', false)
    stepActor(actor, DT, true)
    expect(actor.acts.sleep).toBe(0)
  })

  it('starts already in a held act, so a still render shows it', () => {
    expect(createActor(7, 'cheer').acts.cheer).toBe(1)
  })
})

describe('lookFromPointer', () => {
  it('aims a far finger with a unit vector', () => {
    const [x, y] = lookFromPointer({ x: 0, y: 0 }, { x: 300, y: 400 }, 100)
    expect(x).toBeCloseTo(0.6, 6)
    expect(y).toBeCloseTo(0.8, 6)
  })

  it('makes a near finger a small glance, and a finger on top no glance', () => {
    const [x, y] = lookFromPointer({ x: 0, y: 0 }, { x: 10, y: 0 }, 100)
    expect(x).toBeCloseTo(0.1, 6)
    expect(y).toBe(0)
    expect(lookFromPointer({ x: 5, y: 5 }, { x: 5, y: 5 }, 100)).toEqual([0, 0])
  })
})

describe('a still puppet reacts with easing; only reduced motion snaps', () => {
  it('a scare on a still puppet rises over several frames instead of jumping', () => {
    const actor = createActor(7)
    actFor(actor, 'scare', 1)
    stepActor(actor, 1 / 30, true, false)
    expect(actor.acts.scare).toBeGreaterThan(0.1)
    expect(actor.acts.scare).toBeLessThan(0.5)
    for (let i = 0; i < 12; i++) stepActor(actor, 1 / 30, true, false)
    expect(actor.acts.scare).toBeGreaterThan(0.9)
  })

  it('and falls the same way when the act ends', () => {
    const actor = createActor(7)
    actFor(actor, 'scare', 0.1)
    for (let i = 0; i < 12; i++) stepActor(actor, 1 / 30, true, false)
    const peak = actor.acts.scare
    for (let i = 0; i < 3; i++) stepActor(actor, 1 / 30, true, false)
    expect(actor.acts.scare).toBeGreaterThan(0)
    expect(actor.acts.scare).toBeLessThan(peak)
  })

  it('reduced motion jumps', () => {
    const actor = createActor(7)
    actFor(actor, 'scare', 1)
    stepActor(actor, 1 / 30, true)
    expect(actor.acts.scare).toBe(1)
  })
})
