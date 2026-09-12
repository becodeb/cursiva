// Session navigation (docs/08 §4 "Mapa de niveles → Nivel → ¿aprobado?"). The
// reducer is pure and catalog-independent — `next` carries the already-resolved
// successor id — so the whole flow is asserted without a DOM or a store.
import { describe, expect, it } from 'vitest'
import { nextView, type GameView } from './GameScreen'

const map: GameView = { view: 'map', finished: false }
const done: GameView = { view: 'map', finished: true }
const playing = (levelId: string): GameView => ({ view: 'play', levelId })

describe('nextView (session flow reducer)', () => {
  it('opens the picked level from the map', () => {
    expect(nextView(map, { type: 'play', levelId: 'f1-recta' })).toEqual(playing('f1-recta'))
  })

  it('advances to the resolved successor level', () => {
    expect(nextView(playing('f1-recta'), { type: 'next', levelId: 'f1-ondas' })).toEqual(
      playing('f1-ondas'),
    )
  })

  it('a null successor ends the game: back to the map, marked finished', () => {
    expect(nextView(playing('f5-mama'), { type: 'next', levelId: null })).toEqual(done)
  })

  it('reset returns to a plain map, never the finished banner', () => {
    // [case-registry-and-captions, Phase 7] The former UI trigger for this
    // path — LevelPlay's ‹ Volver — no longer dispatches `{type:'back'}`; it
    // calls `GameScreen`'s required `onExit` prop directly, which reaches the
    // office (`App.tsx`'s `goHome`), never the map (design.md §8). `back`
    // stays a reachable GameAction only through `{type:'reset'}`'s shared
    // `case` branch — the map's own "Reiniciar progreso" control — which this
    // test now drives explicitly.
    expect(nextView(playing('f2-bucles'), { type: 'reset' })).toEqual(map)
  })

  it('leaving the finished map clears the closing line', () => {
    expect(nextView(done, { type: 'back' })).toEqual(map)
    expect(nextView(done, { type: 'reset' })).toEqual(map)
  })

  it('a no-op back on the plain map returns the SAME object (React bails out)', () => {
    expect(nextView(map, { type: 'back' })).toBe(map)
    expect(nextView(map, { type: 'reset' })).toBe(map)
  })

  it('reset from a level returns to the map', () => {
    expect(nextView(playing('f3-a'), { type: 'reset' })).toEqual(map)
  })

  it('never mutates the incoming state', () => {
    const state = playing('f1-recta')
    nextView(state, { type: 'next', levelId: 'f1-ondas' })
    expect(state).toEqual(playing('f1-recta'))
  })
})
