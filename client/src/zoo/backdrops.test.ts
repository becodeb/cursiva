// Adventure backdrop registry tests (trace-canvas spec: "Channel Paint
// Follows the Backdrop Luma Law"; zoo-map spec: "Adventure Backdrop Registry
// Re-Keyed to the Adventure"; detective-mode spec: "World Behaviours Gate on
// inDetectiveWorld, Not on the Clue" — the medusa regression guard). Node
// environment, no DOM.
import { describe, expect, it } from 'vitest'
import { luma } from '../detective/palette'
import { viewBoxToImage } from './sectors'
import {
  ADVENTURE_BACKDROP,
  CHANNEL_STONE,
  NIGHT_VEIL,
  PENDING_ENTRANCE_BACKDROP,
  backdropFor,
} from './backdrops'

/** The channel paint's shipped defaults, mirrored as literals rather than
 * imported — the same convention `palette.test.ts` follows: pulling the
 * component in would drag React into a pure data test. */
const SHEET_PAPER = '#fdfcf7'
const CORRIDOR_EARTH = '#d9c3ae'
/** `TraceCanvas.tsx`'s default ink, mirrored for the same reason. */
const INK_COLOR = '#1e293b'

const MIN_BACKDROP_CONTRAST = 55 // docs/09:158

/**
 * Task 1.5 exercises `PENDING_ENTRANCE_BACKDROP` rather than
 * `ADVENTURE_BACKDROP.glass/.sand/.night`: those three rows are not wired
 * into `ADVENTURE_BACKDROP` yet (`backdrops.ts`'s own docblock on
 * `PENDING_ENTRANCE_BACKDROP` — `AdventureId` is only widened in Phase 5,
 * out of scope for this apply run). All six rows this suite reasons about,
 * shipped and pending together:
 */
const ALL_BACKDROPS = { ...ADVENTURE_BACKDROP, ...PENDING_ENTRANCE_BACKDROP }

describe('PENDING_ENTRANCE_BACKDROP luma law (docs/09:158, design.md §2.5)', () => {
  it('separates the reveal veil paint from the lightest thing it covers, for all six backdrops', () => {
    for (const [id, b] of Object.entries(ALL_BACKDROPS)) {
      expect(
        Math.abs(luma(b!.tile ?? b!.channel ?? SHEET_PAPER) - luma(b!.brightest)),
        id,
      ).toBeGreaterThanOrEqual(MIN_BACKDROP_CONTRAST)
    }
  })

  it("clears the child's own ink against the veil, for the three reveal-grid rows", () => {
    for (const [id, b] of Object.entries(PENDING_ENTRANCE_BACKDROP)) {
      expect(Math.abs(luma(b.tile!) - luma(b.ink ?? INK_COLOR)), id).toBeGreaterThanOrEqual(
        MIN_BACKDROP_CONTRAST,
      )
    }
  })

  it("the night backdrop's brightest clears NIGHT_VEIL by the law's floor, not merely reads low (amendment A3)", () => {
    expect(luma(PENDING_ENTRANCE_BACKDROP.night.brightest)).toBeGreaterThanOrEqual(
      luma(NIGHT_VEIL) + MIN_BACKDROP_CONTRAST,
    )
  })

  // Falsifiability (paso C Phase 6's own discipline): these three MUST go
  // RED, encoding design.md §2.2/§2.3's "no admissible light paint" argument
  // as a measured fact rather than an expectation. Confirmed sensitive by
  // construction: each compares a DIFFERENT paint than the one the registry
  // actually declares, so none can accidentally pass alongside the rows
  // above.
  it('goes red for SHEET_PAPER against the aquarium — no admissible light paint (design.md §2.2, §2.3)', () => {
    expect(
      Math.abs(luma(SHEET_PAPER) - luma(PENDING_ENTRANCE_BACKDROP.glass.brightest)),
    ).toBeLessThan(MIN_BACKDROP_CONTRAST)
  })

  it('goes red for SHEET_PAPER against the sand — no admissible light paint (design.md §2.2, §2.3)', () => {
    expect(
      Math.abs(luma(SHEET_PAPER) - luma(PENDING_ENTRANCE_BACKDROP.sand.brightest)),
    ).toBeLessThan(MIN_BACKDROP_CONTRAST)
  })

  it("goes red for INK_COLOR against NIGHT_VEIL — the slate line does not clear the veil (design.md §2.4)", () => {
    expect(Math.abs(luma(INK_COLOR) - luma(NIGHT_VEIL))).toBeLessThan(MIN_BACKDROP_CONTRAST)
  })
})

describe('ADVENTURE_BACKDROP luma law (docs/09:158)', () => {
  it('separates the corridor paint from the lightest thing it is painted over, for all three backdrops', () => {
    for (const [id, b] of Object.entries(ADVENTURE_BACKDROP)) {
      expect(
        Math.abs(luma(b!.channel ?? SHEET_PAPER) - luma(b!.brightest)),
        id,
      ).toBeGreaterThanOrEqual(MIN_BACKDROP_CONTRAST)
    }
  })

  it('goes red for the paint it replaced — which is WHY it replaced it', () => {
    expect(Math.abs(luma(CORRIDOR_EARTH) - luma(ADVENTURE_BACKDROP.duck!.quiet))).toBeLessThan(
      MIN_BACKDROP_CONTRAST,
    )
  })

  it('is byte-identical for the lagoon: no channel field, resolved paint is SHEET_PAPER (regression, task 6.1)', () => {
    expect(ADVENTURE_BACKDROP.duck!.channel).toBeUndefined()
    expect(ADVENTURE_BACKDROP.duck!.channel ?? SHEET_PAPER).toBe(SHEET_PAPER)
  })

  it('clears the luma law against both mountain backdrops with CHANNEL_STONE', () => {
    expect(Math.abs(luma(CHANNEL_STONE) - luma(ADVENTURE_BACKDROP.sheep!.brightest))).toBeGreaterThanOrEqual(
      MIN_BACKDROP_CONTRAST,
    )
    expect(Math.abs(luma(CHANNEL_STONE) - luma(ADVENTURE_BACKDROP.llama!.brightest))).toBeGreaterThanOrEqual(
      MIN_BACKDROP_CONTRAST,
    )
  })

  // Falsifiability, task 6.2's data-level companion: the fifth row proving
  // design.md §2.1's independent "no admissible light channel" claim —
  // `SHEET_PAPER` cannot be the mountain channel either, not just that
  // `CHANNEL_STONE` happens to work.
  it('goes red for SHEET_PAPER against the cordillera — there is no admissible LIGHT channel (design.md §2.1)', () => {
    expect(Math.abs(luma(SHEET_PAPER) - luma(ADVENTURE_BACKDROP.llama!.brightest))).toBeLessThan(
      MIN_BACKDROP_CONTRAST,
    )
  })
})

describe('ADVENTURE_BACKDROP.corridorRows coverage', () => {
  // Measured channel extents (viewBox Y), one per duck level — the widest
  // excursion of `corridorWidth/2` (or taper-adjusted half-width) either
  // side of the route's own minY/maxY.
  const DUCK_CHANNELS: ReadonlyArray<{ id: string; top: number; bottom: number }> = [
    { id: 'duck-trail1', top: 80, bottom: 520 },
    { id: 'duck-trail2', top: 85, bottom: 515 },
    { id: 'duck-trail3', top: 55, bottom: 545 },
    { id: 'duck-trail4', top: 95, bottom: 505 },
  ]

  // heights/corridorWidth/taper from design.md §1.4's table; widest channel
  // extent is `peak y - cw/2` to `base + cw/2 * max(taper.from, 1)`.
  const SHEEP_CHANNELS: ReadonlyArray<{ id: string; top: number; bottom: number }> = [
    { id: 'sheep-hill1', top: 160 - 50, bottom: 480 + 50 },
    { id: 'sheep-hill2', top: 160 - 45, bottom: 480 + 45 },
    { id: 'sheep-hill3', top: 160 - 40, bottom: 480 + 40 },
    { id: 'sheep-hill4', top: 160 - 30, bottom: 480 + 30 },
  ]
  const LLAMA_CHANNELS: ReadonlyArray<{ id: string; top: number; bottom: number }> = [
    { id: 'llama-peak1', top: 120 - 45, bottom: 480 + 45 },
    { id: 'llama-peak2', top: 120 - 40, bottom: 480 + 40 },
    { id: 'llama-peak3', top: 120 - 35, bottom: 480 + 35 },
    { id: 'llama-peak4', top: 120 - 30, bottom: 480 + 30 },
  ]

  it('covers every duck level channel inside the sampled corridor rows', () => {
    const { corridorRows } = ADVENTURE_BACKDROP.duck!
    for (const { id, top, bottom } of DUCK_CHANNELS) {
      const topImg = viewBoxToImage(0, top).y
      const bottomImg = viewBoxToImage(0, bottom).y
      expect(topImg, id).toBeGreaterThanOrEqual(corridorRows.top)
      expect(bottomImg, id).toBeLessThanOrEqual(corridorRows.bottom)
    }
  })

  it('covers every sheep level channel inside the ladera corridor rows', () => {
    const { corridorRows } = ADVENTURE_BACKDROP.sheep!
    for (const { id, top, bottom } of SHEEP_CHANNELS) {
      const topImg = viewBoxToImage(0, top).y
      const bottomImg = viewBoxToImage(0, bottom).y
      expect(topImg, id).toBeGreaterThanOrEqual(corridorRows.top)
      expect(bottomImg, id).toBeLessThanOrEqual(corridorRows.bottom)
    }
  })

  it('covers every llama level channel inside the cordillera corridor rows', () => {
    const { corridorRows } = ADVENTURE_BACKDROP.llama!
    for (const { id, top, bottom } of LLAMA_CHANNELS) {
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
      expect(backdropFor(id), id).toBe(ADVENTURE_BACKDROP.duck)
    }
  })

  it('resolves the sheep adventure to the ladera backdrop with the stone channel', () => {
    const backdrop = backdropFor('sheep-hill2')
    expect(backdrop).toBe(ADVENTURE_BACKDROP.sheep)
    expect(backdrop?.channel).toBe(CHANNEL_STONE)
  })

  it('resolves the llama adventure to the cordillera backdrop with the stone channel', () => {
    const backdrop = backdropFor('llama-peak2')
    expect(backdrop).toBe(ADVENTURE_BACKDROP.llama)
    expect(backdrop?.channel).toBe(CHANNEL_STONE)
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
