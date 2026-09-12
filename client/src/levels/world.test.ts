// world.ts (design.md §1, tasks.md 1.3). Four fixtures cover the whole
// truth table, one asserts the widening invariant, and a regression guard
// walks the real catalog: `inDetectiveWorld` must equal `isCaseTrail` for
// every level EXCEPT the four Nivel 3 water levels (S7), which widen the
// world without a clue of their own (`f2-guirnalda`, `f2-agua2/3/4`).
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

  it('regression guard: isCaseTrail implies inDetectiveWorld everywhere, and only the four Nivel 3 levels widen the world without a clue', () => {
    // Nivel 3 (S7) is the first slice to widen the world without a clue: the
    // four water levels stand in the drawn world (grass, mud ink, the
    // octopus) but carry no case clue of their own — every OTHER level keeps
    // S1's exact equality (`inDetectiveWorld === isCaseTrail`).
    const widened = LEVELS.filter((l) => l.detectiveWorld).map((l) => l.id)
    expect(widened).toEqual(['f2-guirnalda', 'f2-agua2', 'f2-agua3', 'f2-agua4'])
    for (const level of LEVELS) {
      // The widening is real, not a case trail hiding behind the flag.
      if (level.detectiveWorld) expect(level.clue, level.id).toBeUndefined()
      expect(
        inDetectiveWorld(level),
        `${level.id}: inDetectiveWorld must equal isCaseTrail() || detectiveWorld`,
      ).toBe(isCaseTrail(level) || !!level.detectiveWorld)
      if (isCaseTrail(level)) {
        expect(inDetectiveWorld(level), `${level.id}: a case trail must always be in the world`).toBe(true)
      }
    }
  })
})
