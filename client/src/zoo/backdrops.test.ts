// Sector backdrop registry tests (trace-canvas spec: "Sector Backdrop Layer
// Beneath the Maze Block", "Channel Paint Follows the Backdrop Luma Law";
// detective-mode spec: "World Behaviours Gate on inDetectiveWorld, Not on
// the Clue" — the medusa regression guard). Node environment, no DOM.
import { describe, expect, it } from 'vitest'
import { luma } from '../detective/palette'
import { viewBoxToImage } from './sectors'
import { SECTOR_BACKDROP, backdropFor } from './backdrops'

/** The lagoon's channel paint and the ground it replaced (`TraceCanvas.tsx`).
 * Mirrored as literals rather than imported, the same convention
 * `palette.test.ts` follows: pulling the component in would drag React into
 * a pure data test. */
const SHEET_PAPER = '#fdfcf7'
const CORRIDOR_EARTH = '#d9c3ae'

const MIN_BACKDROP_CONTRAST = 55 // docs/09:158

describe('SECTOR_BACKDROP luma law (docs/09:158)', () => {
  it('separates the corridor paint from the lightest thing it is painted over', () => {
    for (const [id, b] of Object.entries(SECTOR_BACKDROP)) {
      expect(Math.abs(luma(SHEET_PAPER) - luma(b!.brightest)), id).toBeGreaterThanOrEqual(
        MIN_BACKDROP_CONTRAST,
      )
    }
  })

  it('goes red for the paint it replaced — which is WHY it replaced it', () => {
    expect(Math.abs(luma(CORRIDOR_EARTH) - luma(SECTOR_BACKDROP.estanque!.quiet))).toBeLessThan(
      MIN_BACKDROP_CONTRAST,
    )
  })
})

describe('SECTOR_BACKDROP.corridorRows coverage', () => {
  // Measured channel extents (viewBox Y), one per duck level — the widest
  // excursion of `corridorWidth/2` (or taper-adjusted half-width) either
  // side of the route's own minY/maxY.
  const DUCK_CHANNELS: ReadonlyArray<{ id: string; top: number; bottom: number }> = [
    { id: 'duck-trail1', top: 80, bottom: 520 },
    { id: 'duck-trail2', top: 85, bottom: 515 },
    { id: 'duck-trail3', top: 55, bottom: 545 },
    { id: 'duck-trail4', top: 95, bottom: 505 },
  ]

  it('covers every duck level channel inside the sampled corridor rows', () => {
    const { corridorRows } = SECTOR_BACKDROP.estanque!
    for (const { id, top, bottom } of DUCK_CHANNELS) {
      const topImg = viewBoxToImage(0, top).y
      const bottomImg = viewBoxToImage(0, bottom).y
      expect(topImg, id).toBeGreaterThanOrEqual(corridorRows.top)
      expect(bottomImg, id).toBeLessThanOrEqual(corridorRows.bottom)
    }
  })
})

describe('backdropFor', () => {
  it('is defined for every duck trail', () => {
    for (const id of ['duck-trail1', 'duck-trail2', 'duck-trail3', 'duck-trail4']) {
      expect(backdropFor(id), id).toBe(SECTOR_BACKDROP.estanque)
    }
  })

  it('is undefined for the medusa levels — the regression guard (docs/13 §4, "Hecha — Nada")', () => {
    for (const id of ['f2-guirnalda', 'f2-agua2', 'f2-agua3', 'f2-agua4']) {
      expect(backdropFor(id), id).toBeUndefined()
    }
  })

  it('is undefined for the unrelated water trails (trail1..4)', () => {
    for (const id of ['trail1', 'trail2', 'trail3', 'trail4']) {
      expect(backdropFor(id), id).toBeUndefined()
    }
  })
})
