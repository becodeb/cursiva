// `isSectorDebug` (zoo-map spec "Sector Debug Overlay"). Pure over an
// explicit query string — no `window`, no component context — so it is
// testable directly in this repo's node harness. `isDevMode()` itself reads
// `window` and is exercised only through the screens that already call it;
// it gets no test file of its own here.
import { describe, expect, it } from 'vitest'
import {
  arrangeDebugCount,
  cameraDebugOrigin,
  collectDebugCount,
  isSectorDebug,
  isSpineDebug,
  lightDebugPoint,
  revealDebugFraction,
  seededProgressIds,
  shouldSeedRecoveredDuck,
  spineDebugCount,
  waypointDebugCount,
} from './devMode'

describe('isSectorDebug (zoo-map spec "Sector Debug Overlay")', () => {
  it('is true for ?debug=sectores', () => {
    expect(isSectorDebug('?debug=sectores')).toBe(true)
  })

  it('is false for an unrelated or absent query string', () => {
    expect(isSectorDebug('?dev')).toBe(false)
    expect(isSectorDebug('')).toBe(false)
  })

  it('is false for a same-key different-value query', () => {
    expect(isSectorDebug('?debug=otracosa')).toBe(false)
  })

  it('never throws on a malformed query string', () => {
    expect(() => isSectorDebug('%')).not.toThrow()
    expect(isSectorDebug('%')).toBe(false)
  })
})

describe('shouldSeedRecoveredDuck (duck-undulations-and-sector-backdrop screenshot capture aid)', () => {
  it('is true for ?debug=pato-recuperado', () => {
    expect(shouldSeedRecoveredDuck('?debug=pato-recuperado')).toBe(true)
  })

  it('is false for an unrelated or absent query string', () => {
    expect(shouldSeedRecoveredDuck('?debug=sectores')).toBe(false)
    expect(shouldSeedRecoveredDuck('')).toBe(false)
  })

  it('never throws on a malformed query string', () => {
    expect(() => shouldSeedRecoveredDuck('%')).not.toThrow()
    expect(shouldSeedRecoveredDuck('%')).toBe(false)
  })
})

describe('seededProgressIds (design.md §9; level-engine spec "Comma-Separated Progress Seeding Flag")', () => {
  it('?debug=progreso:sand4,night2 returns exactly the two listed ids', () => {
    expect(seededProgressIds('?debug=progreso:sand4,night2')).toEqual(['sand4', 'night2'])
  })

  it('returns a single id for a bare, comma-free list', () => {
    expect(seededProgressIds('?debug=progreso:sand4')).toEqual(['sand4'])
  })

  it('is empty for an unrelated or absent query string', () => {
    expect(seededProgressIds('?debug=sectores')).toEqual([])
    expect(seededProgressIds('')).toEqual([])
  })

  it('requires no window/component context', () => {
    expect(seededProgressIds('?debug=progreso:glass1')).toEqual(['glass1'])
  })

  it('never throws on a malformed query string, and returns []', () => {
    expect(() => seededProgressIds('%')).not.toThrow()
    expect(seededProgressIds('%')).toEqual([])
    expect(seededProgressIds('?debug=progreso:')).toEqual([])
  })
})

describe('revealDebugFraction (design.md §9; reveal-grid spec "Screenshot Seeding Flags for Render State")', () => {
  it('?debug=revelado:60 returns 0.6', () => {
    expect(revealDebugFraction('?debug=revelado:60')).toBe(0.6)
  })

  it('is null for an unrelated or absent query string', () => {
    expect(revealDebugFraction('?debug=sectores')).toBeNull()
    expect(revealDebugFraction('')).toBeNull()
  })

  it('requires no window/component context', () => {
    expect(revealDebugFraction('?debug=revelado:0')).toBe(0)
  })

  it('never throws on a malformed query string, and returns null', () => {
    expect(() => revealDebugFraction('%')).not.toThrow()
    expect(revealDebugFraction('%')).toBeNull()
    expect(revealDebugFraction('?debug=revelado:noesunnumero')).toBeNull()
  })
})

describe('lightDebugPoint (design.md §9; same reveal-grid spec)', () => {
  it('?debug=linterna:500,300 returns {x:500, y:300}', () => {
    expect(lightDebugPoint('?debug=linterna:500,300')).toEqual({ x: 500, y: 300 })
  })

  it('is null for an unrelated or absent query string', () => {
    expect(lightDebugPoint('?debug=sectores')).toBeNull()
    expect(lightDebugPoint('')).toBeNull()
  })

  it('requires no window/component context', () => {
    expect(lightDebugPoint('?debug=linterna:0,0')).toEqual({ x: 0, y: 0 })
  })

  it('never throws on a malformed query string, and returns null', () => {
    expect(() => lightDebugPoint('%')).not.toThrow()
    expect(lightDebugPoint('%')).toBeNull()
    expect(lightDebugPoint('?debug=linterna:500')).toBeNull()
    expect(lightDebugPoint('?debug=linterna:x,y')).toBeNull()
  })
})

describe('?debug=pato-recuperado / ?debug=sectores stay byte-identical (design.md §9)', () => {
  it('shouldSeedRecoveredDuck is unaffected by the new grammar', () => {
    expect(shouldSeedRecoveredDuck('?debug=pato-recuperado')).toBe(true)
    expect(shouldSeedRecoveredDuck('?debug=progreso:sand4')).toBe(false)
  })

  it('isSectorDebug is unaffected by the new grammar', () => {
    expect(isSectorDebug('?debug=sectores')).toBe(true)
    expect(isSectorDebug('?debug=revelado:60')).toBe(false)
  })
})

describe('isSpineDebug (snake-drag-and-art-corridor design.md §8, mirrors isSectorDebug\'s shape)', () => {
  it('is true for ?debug=espina', () => {
    expect(isSpineDebug('?debug=espina')).toBe(true)
  })

  it('is false for an unrelated or absent query string', () => {
    expect(isSpineDebug('?debug=sectores')).toBe(false)
    expect(isSpineDebug('')).toBe(false)
  })

  it('requires no window/component context', () => {
    expect(isSpineDebug('?debug=espina')).toBe(true)
  })

  it('never throws on a malformed query string', () => {
    expect(() => isSpineDebug('%')).not.toThrow()
    expect(isSpineDebug('%')).toBe(false)
  })
})

describe('arrangeDebugCount (object-arrange spec, "debugArrange Seeds the First K Pieces Home, Ungated")', () => {
  it('?debug=ordenadas:2 returns 2', () => {
    expect(arrangeDebugCount('?debug=ordenadas:2')).toBe(2)
  })

  it('is null for an unrelated or absent query string', () => {
    expect(arrangeDebugCount('?debug=sectores')).toBeNull()
    expect(arrangeDebugCount('')).toBeNull()
  })

  it('requires no window/component context', () => {
    expect(arrangeDebugCount('?debug=ordenadas:0')).toBe(0)
  })

  it('never throws on a malformed query string, and returns null', () => {
    expect(() => arrangeDebugCount('%')).not.toThrow()
    expect(arrangeDebugCount('%')).toBeNull()
    expect(arrangeDebugCount('?debug=ordenadas:noesunnumero')).toBeNull()
  })
})

describe('waypointDebugCount (free-trail-waypoints spec "Screenshot Seeding Flags for the Waypoint Fold", A4: one flag drives all four render facts)', () => {
  it('?debug=estela:2 returns 2', () => {
    expect(waypointDebugCount('?debug=estela:2')).toBe(2)
  })

  it('is null for an unrelated or absent query string', () => {
    expect(waypointDebugCount('?debug=sectores')).toBeNull()
    expect(waypointDebugCount('')).toBeNull()
  })

  it('requires no window/component context', () => {
    expect(waypointDebugCount('?debug=estela:0')).toBe(0)
  })

  it('never throws on a malformed query string, and returns null', () => {
    expect(() => waypointDebugCount('%')).not.toThrow()
    expect(waypointDebugCount('%')).toBeNull()
    expect(waypointDebugCount('?debug=estela:noesunnumero')).toBeNull()
  })
})

describe('the seven shipped parsers stay byte-identical alongside cameraDebugOrigin, spineDebugCount and collectDebugCount', () => {
  it('every shipped parser still resolves exactly as before', () => {
    expect(isSectorDebug('?debug=sectores')).toBe(true)
    expect(shouldSeedRecoveredDuck('?debug=pato-recuperado')).toBe(true)
    expect(seededProgressIds('?debug=progreso:sand4,night2')).toEqual(['sand4', 'night2'])
    expect(revealDebugFraction('?debug=revelado:60')).toBe(0.6)
    expect(lightDebugPoint('?debug=linterna:500,300')).toEqual({ x: 500, y: 300 })
    expect(isSpineDebug('?debug=espina')).toBe(true)
    expect(arrangeDebugCount('?debug=ordenadas:2')).toBe(2)
    expect(waypointDebugCount('?debug=estela:2')).toBe(2)
  })
})

describe('collectDebugCount (T17 follow-up: ?debug=juntado:<k> seeds the render-only "already collected" render test)', () => {
  it('?debug=juntado:1 returns 1', () => {
    expect(collectDebugCount('?debug=juntado:1')).toBe(1)
  })

  it('is null for an unrelated or absent query string', () => {
    expect(collectDebugCount('?debug=sectores')).toBeNull()
    expect(collectDebugCount('')).toBeNull()
  })

  it('requires no window/component context', () => {
    expect(collectDebugCount('?debug=juntado:0')).toBe(0)
  })

  it('never throws on a malformed query string, and returns null', () => {
    expect(() => collectDebugCount('%')).not.toThrow()
    expect(collectDebugCount('%')).toBeNull()
    expect(collectDebugCount('?debug=juntado:noesunnumero')).toBeNull()
  })
})

describe("spineDebugCount (radial-spines spec: 'The Debug Flag Reaches the Screen's Rendered Output...'; design.md §7)", () => {
  it('?debug=espinas:3 returns 3', () => {
    expect(spineDebugCount('?debug=espinas:3')).toBe(3)
  })

  it('is null for an unrelated or absent query string', () => {
    expect(spineDebugCount('?debug=sectores')).toBeNull()
    expect(spineDebugCount('')).toBeNull()
  })

  it('requires no window/component context', () => {
    expect(spineDebugCount('?debug=espinas:0')).toBe(0)
  })

  it('never throws on a malformed query string, and returns null', () => {
    expect(() => spineDebugCount('%')).not.toThrow()
    expect(spineDebugCount('%')).toBeNull()
    expect(spineDebugCount('?debug=espinas:noesunnumero')).toBeNull()
  })

  it("does not collide with the shipped ?debug=espina (exact-value compare, not a prefix match)", () => {
    expect(isSpineDebug('?debug=espina')).toBe(true)
    expect(spineDebugCount('?debug=espina')).toBeNull()
    expect(isSpineDebug('?debug=espinas:3')).toBe(false)
    expect(spineDebugCount('?debug=espinas:3')).toBe(3)
  })
})

describe('cameraDebugOrigin (scrolling-camera spec; design.md §7)', () => {
  it('?debug=camara:280 returns 280', () => {
    expect(cameraDebugOrigin('?debug=camara:280')).toBe(280)
  })

  it('a negative seed is returned as-is — clamping is seedCameraOrigin\'s job, not the parser\'s', () => {
    expect(cameraDebugOrigin('?debug=camara:-50')).toBe(-50)
  })

  it('is null for an unrelated or absent query string', () => {
    expect(cameraDebugOrigin('?debug=sectores')).toBeNull()
    expect(cameraDebugOrigin('')).toBeNull()
  })

  it('requires no window/component context', () => {
    expect(cameraDebugOrigin('?debug=camara:0')).toBe(0)
  })

  it('never throws on a malformed query string, and returns null', () => {
    expect(() => cameraDebugOrigin('%')).not.toThrow()
    expect(cameraDebugOrigin('%')).toBeNull()
    expect(cameraDebugOrigin('?debug=camara:noesunnumero')).toBeNull()
  })
})
