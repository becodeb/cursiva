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
import { accessibleTrailName, ANIMAL_MAX_WIDTH, containAnimalSize } from './TrailProgressBar'
import { ZOO_ANIMAL_ART } from './assets'

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
      // The fish, turtles and monkeys rows (`promised-animals` P2-P4) — all
      // three now name a real `ADVENTURES` row.
      ['pez', 'los peces'],
      ['tortuga', 'las tortugas'],
      ['mono', 'los monos'],
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

// T34 (odd/tasks/prewriting-stage-completion.md): the snake silhouette
// (`vibora`, w:492 h:114, aspect ~4.32:1) rendered at ~199px wide with the
// old plain `ANIMAL_HEIGHT * art.w / art.h` math — more than four slots'
// worth of horizontal space for one icon, breaking the bar's rhythm.
// `ANIMAL_HEIGHT` itself is module-private, so this mirrors its real value
// (`TrailProgressBar.tsx`'s own doc comment on it) rather than reaching for
// it — the exact number does not matter to this suite, only that it is the
// SAME one `AnimalEndCap` actually renders at.
describe('containAnimalSize (T34: capping the end-cap silhouette to the bar\'s own rhythm)', () => {
  const ANIMAL_HEIGHT = 46

  it('a normal (narrower-than-cap) animal is unaffected — the old height-only math, unchanged', () => {
    // erizo (w:448 h:306, aspect ~1.46) is the WIDEST shipped animal short of
    // the snake, and already renders comfortably under ANIMAL_MAX_WIDTH.
    const art = ZOO_ANIMAL_ART.erizo
    const { width, height } = containAnimalSize(art, ANIMAL_MAX_WIDTH, ANIMAL_HEIGHT)
    expect(height).toBe(ANIMAL_HEIGHT)
    expect(width).toBeCloseTo((ANIMAL_HEIGHT * art.w) / art.h, 6)
    expect(width).toBeLessThan(ANIMAL_MAX_WIDTH)
  })

  it('the snake is width-bound: capped at ANIMAL_MAX_WIDTH, height shrinks to keep the real aspect ratio', () => {
    const art = ZOO_ANIMAL_ART.vibora
    const uncappedWidth = (ANIMAL_HEIGHT * art.w) / art.h
    expect(uncappedWidth).toBeGreaterThan(ANIMAL_MAX_WIDTH * 2) // the reported bug, restated as a number
    const { width, height } = containAnimalSize(art, ANIMAL_MAX_WIDTH, ANIMAL_HEIGHT)
    expect(width).toBe(ANIMAL_MAX_WIDTH)
    expect(height).toBeLessThan(ANIMAL_HEIGHT)
    expect(width / height).toBeCloseTo(art.w / art.h, 6) // never distorted, only scaled down
  })

  it('never exceeds either cap, for every shipped animal', () => {
    for (const art of Object.values(ZOO_ANIMAL_ART)) {
      const { width, height } = containAnimalSize(art, ANIMAL_MAX_WIDTH, ANIMAL_HEIGHT)
      expect(width).toBeLessThanOrEqual(ANIMAL_MAX_WIDTH + 1e-6)
      expect(height).toBeLessThanOrEqual(ANIMAL_HEIGHT + 1e-6)
    }
  })
})
