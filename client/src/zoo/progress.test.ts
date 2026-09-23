// adventureProgress (adventure-flow-and-map-guidance T6). Pure, no DOM — the
// same convention `sectors.test.ts`/`stars.test.ts` already follow.
import { describe, expect, it } from 'vitest'
import { EMPTY_RECORD, type LevelRecord } from '../game/types'
import type { Records } from './sectors'
import { adventureProgress } from './progress'

function recordsFor(filedIds: readonly string[]): Records {
  const out: Record<string, LevelRecord> = {}
  for (const id of filedIds) out[id] = { ...EMPTY_RECORD, attempts: 1, approvals: 1 }
  return out
}

describe('adventureProgress', () => {
  // The medusa's four garland levels used to belong to no `ADVENTURES` row
  // at all, so this used to assert `null` here. `promised-animals` P2
  // (`odd/tasks/promised-animals.md`) gives them the `fish` row, so they
  // now report a real bar like every other multi-level adventure — see the
  // dedicated `fish` describe block below for the full shape.
  it('reports a mid-adventure fish trail: filed levels, the current one flagged, bubble clues in play order', () => {
    const progress = adventureProgress('f2-agua2', recordsFor(['f2-guirnalda']))
    expect(progress).toEqual({
      adventureId: 'fish',
      animal: 'pez',
      rescued: false,
      slots: [
        { levelId: 'f2-guirnalda', clue: 'bubble', filed: true, current: false },
        { levelId: 'f2-agua2', clue: 'bubble', filed: false, current: true },
        { levelId: 'f2-agua3', clue: 'bubble', filed: false, current: false },
        { levelId: 'f2-agua4', clue: 'bubble', filed: false, current: false },
      ],
    })
  })

  it('reports the fish adventure rescued once f2-agua4 is filed', () => {
    const allFour = recordsFor(['f2-guirnalda', 'f2-agua2', 'f2-agua3', 'f2-agua4'])
    const progress = adventureProgress('f2-agua4', allFour)
    expect(progress?.rescued).toBe(true)
    expect(progress?.slots.every((s) => s.filed)).toBe(true)
  })

  it('resolves null for the entrance (a single-level row): a "1 of 1" bar says nothing new', () => {
    expect(adventureProgress('glass1', {})).toBeNull()
    expect(adventureProgress('sand1', {})).toBeNull()
    expect(adventureProgress('glass3', {})).toBeNull()
    expect(adventureProgress('sand3', {})).toBeNull()
  })

  it('reports a mid-adventure duck trail: filed levels, the current one flagged, clues in play order', () => {
    const progress = adventureProgress('duck-trail2', recordsFor(['duck-trail1']))
    expect(progress).toEqual({
      adventureId: 'duck',
      animal: 'pato',
      rescued: false,
      slots: [
        { levelId: 'duck-trail1', clue: 'webfoot', filed: true, current: false },
        { levelId: 'duck-trail2', clue: 'breadcrumb', filed: false, current: true },
        { levelId: 'duck-trail3', clue: 'bubble', filed: false, current: false },
        { levelId: 'duck-trail4', clue: 'feather', filed: false, current: false },
      ],
    })
  })

  it('leaves clue undefined for an adventure with no clue art yet (sheep): the caller draws a star instead', () => {
    const progress = adventureProgress('sheep-hill1', {})
    expect(progress?.animal).toBe('oveja')
    for (const slot of progress!.slots) {
      expect(slot.clue, slot.levelId).toBeUndefined()
    }
  })

  it('reports rescued once every level of the adventure is filed', () => {
    const allFour = recordsFor(['duck-trail1', 'duck-trail2', 'duck-trail3', 'duck-trail4'])
    const progress = adventureProgress('duck-trail4', allFour)
    expect(progress?.rescued).toBe(true)
    expect(progress?.slots.every((s) => s.filed)).toBe(true)
    expect(progress?.slots.find((s) => s.current)?.levelId).toBe('duck-trail4')
  })

  it('is not rescued while any level of the adventure is still unfiled', () => {
    const progress = adventureProgress('duck-trail4', recordsFor(['duck-trail1', 'duck-trail2', 'duck-trail3']))
    expect(progress?.rescued).toBe(false)
  })

  it('leaves animal undefined for an animal-less multi-level adventure (night)', () => {
    const progress = adventureProgress('night2', {})
    expect(progress?.adventureId).toBe('night')
    expect(progress?.animal).toBeUndefined()
    expect(progress?.slots).toHaveLength(4)
  })

  it('flags exactly the one level actually being played as current', () => {
    const progress = adventureProgress('sheep-hill3', {})
    expect(progress?.slots.map((s) => s.current)).toEqual([false, false, true, false])
  })

  // The turtles' and monkeys' own rows (`promised-animals` P3/P4) — neither
  // carries a `clue` (the finish chain shows a star on 1-3, the animal on
  // 4), the same "no clue art yet" shape sheep's own row above already
  // covers.
  it('reports a mid-adventure turtle trail with no clue art (star fallback), animal tortuga', () => {
    const progress = adventureProgress('turtle2', recordsFor(['turtle1']))
    expect(progress).toEqual({
      adventureId: 'turtles',
      animal: 'tortuga',
      rescued: false,
      slots: [
        { levelId: 'turtle1', clue: undefined, filed: true, current: false },
        { levelId: 'turtle2', clue: undefined, filed: false, current: true },
        { levelId: 'turtle3', clue: undefined, filed: false, current: false },
        { levelId: 'turtle4', clue: undefined, filed: false, current: false },
      ],
    })
  })

  it('reports the monkeys adventure rescued once monkey4 is filed, animal mono', () => {
    const allFour = recordsFor(['monkey1', 'monkey2', 'monkey3', 'monkey4'])
    const progress = adventureProgress('monkey4', allFour)
    expect(progress?.adventureId).toBe('monkeys')
    expect(progress?.animal).toBe('mono')
    expect(progress?.rescued).toBe(true)
  })
})
