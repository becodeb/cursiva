// introChrome tests (`odd/tasks/prewriting-stage-completion.md` T31
// follow-up: "the intro must use the SAME framing as the level"). Node
// environment, no DOM — `levelChromeFacts` is pure; `IntroChromeGhost`
// itself (a component) is exercised through `AdventureIntro.test.tsx`'s own
// existing suite (it renders only client-side, gated on `typeof window`,
// so it never appears in a `renderToString` fixture anyway).
import { describe, expect, it } from 'vitest'
import { levelChromeFacts } from './introChrome'
import { PROLOGUE_ZOO_SIGNS } from './LevelPlay'

describe('levelChromeFacts — the same structural facts LevelPlay.tsx itself decides its chrome height from', () => {
  it('glass1: a zoo sign (peces), no progress bar, no demo', () => {
    const facts = levelChromeFacts('glass1')
    expect(facts.zooSign).toEqual(PROLOGUE_ZOO_SIGNS.glass1)
    expect(facts.hasProgressBar).toBe(false)
    expect(facts.playDemo).toBe(false)
  })

  it('night1: no sign, a progress bar (a 4-level adventure), no demo authored', () => {
    const facts = levelChromeFacts('night1')
    expect(facts.zooSign).toBeUndefined()
    expect(facts.hasProgressBar).toBe(true)
    expect(facts.progress?.adventureId).toBe('night')
    expect(facts.playDemo).toBe(false)
  })

  it('snake1: no sign, a progress bar, and its own authored demo plays', () => {
    const facts = levelChromeFacts('snake1')
    expect(facts.zooSign).toBeUndefined()
    expect(facts.hasProgressBar).toBe(true)
    expect(facts.progress?.adventureId).toBe('snake')
    expect(facts.playDemo).toBe(true)
  })

  it('sendero (sand3): no sign (only sand1/sand2 carry one), single-level adventure so no progress bar either', () => {
    const facts = levelChromeFacts('sand3')
    expect(facts.zooSign).toBeUndefined()
    expect(facts.hasProgressBar).toBe(false)
  })

  it('is independent of records: the progress bar\'s presence never depends on how far the child has gotten', () => {
    // `adventureProgress` only returns null for a single-level adventure —
    // never for "nothing filed yet" — so an always-empty `{}` records
    // object (this function's own implementation) gives the same
    // structural answer a real player's progress would.
    const facts = levelChromeFacts('night1')
    expect(facts.hasProgressBar).toBe(true)
  })
})
