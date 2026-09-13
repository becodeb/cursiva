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
  GLASS_GRIME,
  NIGHT_VEIL,
  SAND_DRIFT,
  SAND_HOLLOW,
  TORCH_CHALK,
  backdropFor,
} from './backdrops'

/** The channel paint's shipped defaults, mirrored as literals rather than
 * imported — the same convention `palette.test.ts` follows: pulling the
 * component in would drag React into a pure data test. */
const SHEET_PAPER = '#fdfcf7'
const CORRIDOR_EARTH = '#d9c3ae'
/** `TraceCanvas.tsx`'s default ink, mirrored for the same reason. */
const INK_COLOR = '#1e293b'
/** `TraceCanvas.tsx`'s off-path dim (private there), mirrored for the same
 * reason — this is exactly the colour A1's defect rendered on every
 * routeless level before the fix (`LevelPlay.tsx`'s `isOffPath`). */
const OFF_PATH_INK = '#94a3b8'

const MIN_BACKDROP_CONTRAST = 55 // docs/09:158

/** The three reveal-grid rows, now wired straight into `ADVENTURE_BACKDROP`
 * (`AdventureId` widened by task 5.1) — no more `PENDING_ENTRANCE_BACKDROP`
 * indirection; see `apply-progress.md`'s Phase 5 section for the closed
 * forward reference. */
const REVEAL_BACKDROPS = {
  glass: ADVENTURE_BACKDROP.glass!,
  sand: ADVENTURE_BACKDROP.sand!,
  night: ADVENTURE_BACKDROP.night!,
}
/** The three pre-existing corridor-channel rows, kept split from the reveal
 * rows above so the "no admissible light paint" falsifiability below stays
 * meaningful for each group on its own terms. */
const CHANNEL_BACKDROPS = {
  duck: ADVENTURE_BACKDROP.duck!,
  sheep: ADVENTURE_BACKDROP.sheep!,
  llama: ADVENTURE_BACKDROP.llama!,
}
/** The one art-corridor row: its channel is the HOLLOW the snake lies in,
 * not a painted band (design.md §2.3) — kept in its own group so the
 * registry-completeness guard below can prove every row belongs to
 * EXACTLY one of the three groups. */
const ART_CORRIDOR_BACKDROPS = {
  snake: ADVENTURE_BACKDROP.snake!,
}

describe('Reveal veil luma law (docs/09:158, design.md §2.5)', () => {
  it('separates the reveal veil paint from the lightest thing it covers, for all seven backdrops', () => {
    for (const [id, b] of [
      ...Object.entries(CHANNEL_BACKDROPS),
      ...Object.entries(REVEAL_BACKDROPS),
      ...Object.entries(ART_CORRIDOR_BACKDROPS),
    ]) {
      expect(
        Math.abs(luma(b.tile ?? b.channel ?? SHEET_PAPER) - luma(b.brightest)),
        id,
      ).toBeGreaterThanOrEqual(MIN_BACKDROP_CONTRAST)
    }
  })

  it('the union of the three groups equals every registered backdrop (registry-completeness guard)', () => {
    const grouped = new Set([
      ...Object.keys(CHANNEL_BACKDROPS),
      ...Object.keys(REVEAL_BACKDROPS),
      ...Object.keys(ART_CORRIDOR_BACKDROPS),
    ])
    expect([...grouped].sort()).toEqual(Object.keys(ADVENTURE_BACKDROP).sort())
  })

  it('a hypothetical ungrouped row fails the completeness guard (sensitivity proof)', () => {
    const grouped = new Set([
      ...Object.keys(CHANNEL_BACKDROPS),
      ...Object.keys(REVEAL_BACKDROPS),
      ...Object.keys(ART_CORRIDOR_BACKDROPS),
    ])
    const registryKeysWithHypothetical = [...Object.keys(ADVENTURE_BACKDROP), 'hypothetical']
    expect([...grouped].sort()).not.toEqual(registryKeysWithHypothetical.sort())
  })

  it("clears the child's own ink against the veil, for the three reveal-grid rows", () => {
    for (const [id, b] of Object.entries(REVEAL_BACKDROPS)) {
      expect(Math.abs(luma(b.tile!) - luma(b.ink ?? INK_COLOR)), id).toBeGreaterThanOrEqual(
        MIN_BACKDROP_CONTRAST,
      )
    }
  })

  it("the night backdrop's brightest clears NIGHT_VEIL by the law's floor, not merely reads low (amendment A3)", () => {
    expect(luma(REVEAL_BACKDROPS.night.brightest)).toBeGreaterThanOrEqual(
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
      Math.abs(luma(SHEET_PAPER) - luma(REVEAL_BACKDROPS.glass.brightest)),
    ).toBeLessThan(MIN_BACKDROP_CONTRAST)
  })

  it('goes red for SHEET_PAPER against the sand — no admissible light paint (design.md §2.2, §2.3)', () => {
    expect(
      Math.abs(luma(SHEET_PAPER) - luma(REVEAL_BACKDROPS.sand.brightest)),
    ).toBeLessThan(MIN_BACKDROP_CONTRAST)
  })

  it("goes red for INK_COLOR against NIGHT_VEIL — the slate line does not clear the veil (design.md §2.4)", () => {
    expect(Math.abs(luma(INK_COLOR) - luma(NIGHT_VEIL))).toBeLessThan(MIN_BACKDROP_CONTRAST)
  })

  // [A1, design.md §0/§2.1] The numeric documentation of why `LevelPlay.tsx`'s
  // `isOffPath` guard matters: `OFF_PATH_INK` is what `glass1..4`/`sand1..4`
  // have actually been rendering (not the DECLARED `ink ?? INK_COLOR` the two
  // tests above check) every time `offPath` incorrectly latched true on a
  // routeless level. Both fail the law — short by 3.1 and 2.8 — which is the
  // measured proof the defect is real, not only a naming gap. `night`'s own
  // `TORCH_CHALK_DIM` already clears the law either way (asserted above,
  // "clears the child's own ink against the veil"), so no row is needed there.
  it("goes red for OFF_PATH_INK against GLASS_GRIME — A1's defect, short by 3.1", () => {
    expect(Math.abs(luma(OFF_PATH_INK) - luma(GLASS_GRIME))).toBeLessThan(MIN_BACKDROP_CONTRAST)
  })

  it("goes red for OFF_PATH_INK against SAND_DRIFT — the same defect, short by 2.8", () => {
    expect(Math.abs(luma(OFF_PATH_INK) - luma(SAND_DRIFT))).toBeLessThan(MIN_BACKDROP_CONTRAST)
  })
})

describe('Corridor art luma law — the snake row (design.md §2.1, §2.2)', () => {
  const snake = ADVENTURE_BACKDROP.snake!
  const art = snake.corridorArt!

  it('L1-L4: all four pairwise gaps clear 55', () => {
    // L1: the art's darkest (author's spots) vs the ink.
    expect(Math.abs(luma(art.darkest) - luma(snake.ink!))).toBeGreaterThanOrEqual(MIN_BACKDROP_CONTRAST)
    // L2: the art's brightest sampled body vs the ink.
    expect(Math.abs(luma(art.brightest) - luma(snake.ink!))).toBeGreaterThanOrEqual(MIN_BACKDROP_CONTRAST)
    // L3: the art's darkest vs the sand's brightest.
    expect(Math.abs(luma(art.darkest) - luma(snake.brightest))).toBeGreaterThanOrEqual(
      MIN_BACKDROP_CONTRAST,
    )
    // L4: the art's brightest body vs the sand's brightest.
    expect(Math.abs(luma(art.brightest) - luma(snake.brightest))).toBeGreaterThanOrEqual(
      MIN_BACKDROP_CONTRAST,
    )
  })

  it('R1: a dark ink (INK_COLOR) against the art\'s darkest goes red — a dark ink is undrawable on a snake', () => {
    expect(Math.abs(luma(INK_COLOR) - luma(art.darkest))).toBeLessThan(MIN_BACKDROP_CONTRAST)
  })

  // R2 is the SAME shipped, UNTOUCHED assertion above ("goes red for
  // SHEET_PAPER against the sand") — reused, not re-authored: it already
  // proves no paper channel is admissible on sand, which is exactly why
  // this row's channel is `SAND_HOLLOW` rather than a default.

  it("R3: TORCH_CHALK against the art's headWhite goes red — the traceable span must end behind the head", () => {
    expect(Math.abs(luma(TORCH_CHALK) - luma(art.headWhite))).toBeLessThan(MIN_BACKDROP_CONTRAST)
  })

  it('R4: TORCH_CHALK against SHEET_PAPER goes red — the chalk line is admissible ONLY because there is no paper channel under it', () => {
    expect(Math.abs(luma(TORCH_CHALK) - luma(SHEET_PAPER))).toBeLessThan(MIN_BACKDROP_CONTRAST)
  })

  it('the snake row declares SAND_HOLLOW as its channel, not absent', () => {
    expect(snake.channel).toBe(SAND_HOLLOW)
  })

  it('clears the channel-vs-backdrop luma law with no exemption', () => {
    expect(Math.abs(luma(SAND_HOLLOW) - luma(snake.brightest))).toBeGreaterThanOrEqual(
      MIN_BACKDROP_CONTRAST,
    )
  })
})

describe('ADVENTURE_BACKDROP luma law (docs/09:158)', () => {
  it('separates the corridor paint from the lightest thing it is painted over, for the three mountain/lagoon backdrops', () => {
    for (const [id, b] of Object.entries(CHANNEL_BACKDROPS)) {
      expect(
        Math.abs(luma(b.channel ?? SHEET_PAPER) - luma(b.brightest)),
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

  // zoo-map spec: "Entrance and Night Backdrops Resolve Through the
  // Adventure-Keyed Registry" — the backdrops resolve for the first time
  // here, now that `adventureFor` (`zoo/adventures.ts`, task 5.1) knows
  // `glass`/`sand`/`night`.
  it('resolves the glass adventure to the aquarium backdrop', () => {
    for (const id of ['glass1', 'glass2', 'glass3', 'glass4']) {
      expect(backdropFor(id), id).toBe(ADVENTURE_BACKDROP.glass)
    }
  })

  it('resolves the sand adventure to the sand backdrop', () => {
    for (const id of ['sand1', 'sand2', 'sand3', 'sand4']) {
      expect(backdropFor(id), id).toBe(ADVENTURE_BACKDROP.sand)
    }
  })

  it('resolves the night adventure to the night backdrop', () => {
    for (const id of ['night1', 'night2', 'night3', 'night4']) {
      expect(backdropFor(id), id).toBe(ADVENTURE_BACKDROP.night)
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
