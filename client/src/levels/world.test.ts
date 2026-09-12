// world.ts (design.md §1, tasks.md 1.3). Four fixtures cover the whole
// truth table, one asserts the widening invariant, and a regression guard
// walks the real catalog to prove this slice is behaviour-neutral: with no
// Nivel 3 level shipped yet, `inDetectiveWorld` must equal `isCaseTrail` for
// every level in `LEVELS` today.
import { describe, expect, it } from 'vitest'
import { isCaseTrail, inDetectiveWorld } from './world'
import { LEVELS } from './catalog'
import type { LevelConfig } from './types'

function pick(over: Partial<Pick<LevelConfig, 'clue' | 'detectiveWorld'>>): Pick<
  LevelConfig,
  'clue' | 'detectiveWorld'
> {
  return { clue: undefined, detectiveWorld: undefined, ...over }
}

describe('isCaseTrail / inDetectiveWorld (design.md §1)', () => {
  it('clue-only: a case trail, and therefore also in the world', () => {
    const level = pick({ clue: { kind: 'droplet', spacing: 200 } })
    expect(isCaseTrail(level)).toBe(true)
    expect(inDetectiveWorld(level)).toBe(true)
  })

  it('world-only: in the world, but not a case trail', () => {
    const level = pick({ detectiveWorld: true })
    expect(isCaseTrail(level)).toBe(false)
    expect(inDetectiveWorld(level)).toBe(true)
  })

  it('both: a case trail with the world flag also set stays true on both', () => {
    const level = pick({ clue: { kind: 'droplet', spacing: 200 }, detectiveWorld: true })
    expect(isCaseTrail(level)).toBe(true)
    expect(inDetectiveWorld(level)).toBe(true)
  })

  it('neither: an ordinary level is neither a case trail nor in the world', () => {
    const level = pick({})
    expect(isCaseTrail(level)).toBe(false)
    expect(inDetectiveWorld(level)).toBe(false)
  })

  it('widening invariant: `detectiveWorld: false` on a level with a clue still reports world true', () => {
    // The field can only WIDEN world membership, never narrow it. A case
    // trail can never have its world stripped by this field.
    const level = pick({ clue: { kind: 'droplet', spacing: 200 }, detectiveWorld: false })
    expect(isCaseTrail(level)).toBe(true)
    expect(inDetectiveWorld(level)).toBe(true)
  })

  it('regression guard: every level in LEVELS keeps isCaseTrail implies inDetectiveWorld, and today\'s shipped set is unchanged (S1 behaviour-neutrality proof)', () => {
    // With no Nivel 3 level in the catalog yet, no shipped level sets
    // `detectiveWorld`, so `inDetectiveWorld` must equal `isCaseTrail`
    // exactly, not merely imply it — that equality IS the neutrality proof
    // this slice must uphold.
    for (const level of LEVELS) {
      expect(level.detectiveWorld, `${level.id} must not set detectiveWorld yet (S1 ships alone)`).toBeFalsy()
      expect(
        inDetectiveWorld(level),
        `${level.id}: inDetectiveWorld must equal isCaseTrail while no level widens the world`,
      ).toBe(isCaseTrail(level))
      if (isCaseTrail(level)) {
        expect(inDetectiveWorld(level), `${level.id}: a case trail must always be in the world`).toBe(true)
      }
    }
  })
})
