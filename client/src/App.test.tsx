// firstVisit tests (add-caretaker-prologue design.md D2, `prologue-opening`
// spec "The Already-Seen Gate Is Derived, Never a New Persisted Key"). Pure
// over a plain `Records` value, no store, no DOM — the same node-testable
// shape `zoo/prologue.ts`'s `advancePlate` and `GameScreen.ts`'s
// `resolveNextAction` already use.
import { describe, expect, it } from 'vitest'
import { firstVisit, resolveShell } from './App'
import { EMPTY_RECORD, type LevelRecord } from './game/types'

describe('firstVisit (design.md D2: derived, never a new persisted key)', () => {
  it('an empty Records object resolves to "not seen" (true)', () => {
    expect(firstVisit({})).toBe(true)
  })

  it('any existing level record resolves to "seen" (false)', () => {
    expect(firstVisit({ glass1: { ...EMPTY_RECORD, approvals: 0 } })).toBe(false)
    expect(firstVisit({ 'duck-trail4': { ...EMPTY_RECORD, approvals: 1 } })).toBe(false)
  })
})

// The COMPOSITION, which is a different thing from the three ingredients.
// `initialView`, `prologueRoute` and `firstVisit` were each well tested
// alone, but the ORDER they are tried in is what three `prologue-opening`
// scenarios assert — a deep link beats the opening, the dev route beats the
// already-seen gate, and the gate only decides when nothing was asked for.
// Nothing was red if that order changed, so `resolveShell` was split out of
// `initialShell` to be checkable without reaching for `window`.
describe('resolveShell (prologue-opening spec: the routing order)', () => {
  const fresh: Readonly<Record<string, LevelRecord>> = {}
  const played: Readonly<Record<string, LevelRecord>> = {
    glass1: { ...EMPTY_RECORD, approvals: 1 },
  }

  it('a level deep link skips the opening even on a fresh install', () => {
    // A bare level id lands ON the level; only the `intro-` prefix opens
    // its narrative entry. Both forms must beat the opening on a fresh
    // install, which is the whole point of the deep link.
    expect(resolveShell('?nivel=glass1', true, fresh)).toEqual({
      at: 'game',
      initial: { view: 'play', levelId: 'glass1' },
    })
    expect(resolveShell('?nivel=intro-glass1', true, fresh)).toEqual({
      at: 'game',
      initial: { view: 'intro', levelId: 'glass1' },
    })
  })

  it('the dev route reaches the opening even when it has already been seen', () => {
    expect(resolveShell('?nivel=apertura', true, played)).toEqual({ at: 'prologue', from: 0 })
    expect(resolveShell('?nivel=apertura:2', true, played)).toEqual({ at: 'prologue', from: 2 })
  })

  it('the dev route is inert outside dev mode, and the gate decides instead', () => {
    expect(resolveShell('?nivel=apertura', false, played)).toEqual({ at: 'map' })
    expect(resolveShell('?nivel=apertura', false, fresh)).toEqual({ at: 'prologue' })
  })

  it('with nothing asked for, the derived gate alone decides', () => {
    expect(resolveShell('', true, fresh)).toEqual({ at: 'prologue' })
    expect(resolveShell('', true, played)).toEqual({ at: 'map' })
  })
})
