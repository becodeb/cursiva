// TrailProgressBar SSR tests (adventure-flow-and-map-guidance T6). Node
// environment, no DOM — the same convention `PistasRail.test.tsx` (the
// component this one replaces the ROLE of inside LevelPlay, without
// touching that file or its own tests) already follows.
//
// Full rendering coverage (slot art selection, current highlight, the
// animal end-cap's dark/coloured states, the star fallback) lives in
// `screen/LevelPlay.test.tsx`'s "LevelPlay adventure progress bar" describe
// block — this bar is never mounted anywhere else, so that is also the only
// place its `progress` prop is ever built from a REAL adventure. This file
// covers the one thing that block does not: `accessibleTrailName` across
// every animal `zoo/adventures.ts` actually ships, as a pure function.
import { describe, expect, it } from 'vitest'
import type { AdventureProgress } from '../zoo/progress'
import { accessibleTrailName } from './TrailProgressBar'

function progressFixture(over: Partial<AdventureProgress>): AdventureProgress {
  return {
    adventureId: 'duck',
    animal: 'pato',
    rescued: false,
    slots: [
      { levelId: 'duck-trail1', clue: 'webfoot', filed: true, current: false },
      { levelId: 'duck-trail2', clue: 'breadcrumb', filed: false, current: true },
      { levelId: 'duck-trail3', clue: 'bubble', filed: false, current: false },
      { levelId: 'duck-trail4', clue: 'feather', filed: false, current: false },
    ],
    ...over,
  }
}

describe('accessibleTrailName', () => {
  it('names every real adventure animal in Rioplatense Spanish, counting filed slots against the total', () => {
    const cases: ReadonlyArray<readonly [AdventureProgress['animal'], string]> = [
      ['pato', 'el pato'],
      ['oveja', 'las ovejas'],
      ['llama', 'la llama'],
      ['vibora', 'las víboras'],
      ['abeja', 'la abeja'],
      ['delfin', 'los delfines'],
      ['erizo', 'el erizo'],
      // The fish row (`promised-animals` P2) — `tortuga`/`mono` are not
      // added here: no `ADVENTURES` row names them yet (P3/P4), so they
      // are not "real adventure animals" by this test's own stated scope,
      // even though `TrailProgressBar.tsx`'s `ANIMAL_NAME` map already
      // carries their Spanish names ahead of that (see its own comment).
      ['pez', 'los peces'],
    ]
    for (const [animal, spanish] of cases) {
      const progress = progressFixture({ animal })
      expect(accessibleTrailName(progress), animal).toBe(`Camino hacia ${spanish}: 1 de 4`)
    }
  })

  it('drops the "hacia X" clause for an animal-less adventure (night)', () => {
    const progress = progressFixture({ animal: undefined })
    expect(accessibleTrailName(progress)).toBe('Camino: 1 de 4')
  })

  it('counts every filed slot, not the current position', () => {
    const noneFiled = progressFixture({
      slots: [
        { levelId: 'duck-trail1', clue: 'webfoot', filed: false, current: true },
        { levelId: 'duck-trail2', clue: 'breadcrumb', filed: false, current: false },
        { levelId: 'duck-trail3', clue: 'bubble', filed: false, current: false },
        { levelId: 'duck-trail4', clue: 'feather', filed: false, current: false },
      ],
    })
    expect(accessibleTrailName(noneFiled)).toBe('Camino hacia el pato: 0 de 4')

    const allFiled = progressFixture({
      rescued: true,
      slots: progressFixture({}).slots.map((slot) => ({ ...slot, filed: true, current: false })),
    })
    expect(accessibleTrailName(allFiled)).toBe('Camino hacia el pato: 4 de 4')
  })
})
