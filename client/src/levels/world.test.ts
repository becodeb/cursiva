// world.ts (design.md §1, tasks.md 1.3). Four fixtures cover the whole
// truth table, one asserts the widening invariant, and a regression guard
// walks the real catalog: `inDetectiveWorld` must equal `isCaseTrail` for
// every level.
//
// The four Nivel 3 water levels (S7: `f2-guirnalda`, `f2-agua2/3/4`) used
// to be the one example of the widening flag in real, shipped data — they
// stood in the detective world without ever being a case trail. `promised-
// animals` P2 (`odd/tasks/promised-animals.md`) gives them a real `clue`
// (the fish's own bubble trail) and drops their `detectiveWorld: true`
// (now redundant: `isCaseTrail` alone puts them in the world, same as
// every duck trail), so no level anywhere in the catalog uses the flag any
// more — the regression guard below now asserts exactly that empty set,
// and the widening LOGIC itself stays proven by the hand-built fixtures
// above, for whichever level needs it next.
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

  it('regression guard: isCaseTrail implies inDetectiveWorld everywhere, and no shipped level widens the world without a clue any more (promised-animals P2)', () => {
    // `f2-guirnalda`/`f2-agua2/3/4` were the one example of the widening
    // flag in real data (S7) until P2 gave them a real `clue` and dropped
    // the now-redundant flag — see this file's own header. The mechanism
    // itself is not deleted (`isCaseTrail`/`inDetectiveWorld` still branch
    // on `detectiveWorld`, proven by the hand-built fixtures above); it
    // simply has no shipped consumer left, which this asserts directly
    // rather than letting it go silently unexercised.
    const widened = LEVELS.filter((l) => l.detectiveWorld).map((l) => l.id)
    expect(widened).toEqual([])
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

  // The four Nivel 3 levels still belong in the detective world (grass, mud
  // ink, the standing octopus) — just through `isCaseTrail` now, the same
  // path every duck trail already takes, rather than through the widening
  // flag they used to need.
  it('f2-guirnalda/f2-agua2/f2-agua3/f2-agua4 are still in the detective world, now as real case trails (promised-animals P2)', () => {
    for (const id of ['f2-guirnalda', 'f2-agua2', 'f2-agua3', 'f2-agua4']) {
      const level = LEVELS.find((l) => l.id === id)!
      expect(level.detectiveWorld, id).toBeUndefined()
      expect(isCaseTrail(level), id).toBe(true)
      expect(inDetectiveWorld(level), id).toBe(true)
    }
  })
})
