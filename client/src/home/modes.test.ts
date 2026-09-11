import { describe, expect, it } from 'vitest'
import { EMPTY_RECORD, type LevelRecord } from '../game/types'
import { ARM_ANCHORS, HOME_MODES, modeArt, type HomeMode } from './modes'

describe('ARM_ANCHORS (measured once against the shipped octopus)', () => {
  it('has exactly eight, one per arm — the registry ceiling', () => {
    expect(ARM_ANCHORS.length).toBe(8)
  })

  it('is expressed as fractions of the art box, so a re-crop cannot move an arm', () => {
    for (const [x, y] of ARM_ANCHORS) {
      expect(x).toBeGreaterThan(0)
      expect(x).toBeLessThan(1)
      expect(y).toBeGreaterThan(0)
      expect(y).toBeLessThan(1)
    }
  })

  it('puts every anchor in the lower two thirds — arms, never the head', () => {
    // The head is the top third of the drawing. An anchor up there would hang
    // an object off the octopus's face, which is the one failure mode that is
    // obvious in a screenshot and invisible in a diff.
    for (const [, y] of ARM_ANCHORS) expect(y).toBeGreaterThan(0.33)
  })

  it('keeps the two front arms apart, so two modes there never overlap', () => {
    const [leftX] = ARM_ANCHORS[3]
    const [rightX] = ARM_ANCHORS[4]
    expect(rightX - leftX).toBeGreaterThan(0.25)
  })
})

describe('HOME_MODES (docs/10 §5: a mode is an entry, not code)', () => {
  it('ships exactly the first cut: one mode, the detective case', () => {
    expect(HOME_MODES.map((m) => m.id)).toEqual(['detective'])
  })

  it('never puts two modes on the same arm', () => {
    const arms = HOME_MODES.map((m) => m.arm)
    expect(new Set(arms).size).toBe(arms.length)
  })

  it('holds the glass on a FRONT arm, where the child can reach it', () => {
    const detective = HOME_MODES.find((m) => m.id === 'detective')!
    expect([3, 4]).toContain(detective.arm)
    expect(detective.enter).toBe('trail')
  })

  it('leaves the detective case always open — there is no state that locks it', () => {
    const detective = HOME_MODES.find((m) => m.id === 'detective')!
    expect(detective.unlocked({})).toBe(true)
  })
})

describe('modeArt (what an arm shows)', () => {
  const art = { href: '/art/x.png', w: 10, h: 10 }
  const locked = { href: '/art/x-off.png', w: 10, h: 10 }
  const base: HomeMode = {
    id: 'cuaderno',
    arm: 0,
    art,
    artLocked: locked,
    unlocked: () => false,
    enter: 'letters',
  }
  const records: Readonly<Record<string, LevelRecord>> = { trail1: { ...EMPTY_RECORD } }

  it('shows the object in colour, and touchable, when the mode is open', () => {
    expect(modeArt({ ...base, unlocked: () => true }, records)).toEqual({ art, enabled: true })
  })

  it('shows the drained object, NOT touchable, when the mode is locked', () => {
    expect(modeArt(base, records)).toEqual({ art: locked, enabled: false })
  })

  it('shows nothing at all when a locked mode has no drained art', () => {
    // An empty arm is the honest picture of a mode that does not exist yet —
    // and it is what keeps the pipeline from shipping art no one can reach.
    expect(modeArt({ ...base, artLocked: null }, records)).toBeNull()
  })
})
