// Adventure backdrop registry tests (trace-canvas spec: "Channel Paint
// Follows the Backdrop Luma Law"; zoo-map spec: "Adventure Backdrop Registry
// Re-Keyed to the Adventure"; detective-mode spec: "World Behaviours Gate on
// inDetectiveWorld, Not on the Clue" — the medusa regression guard). Node
// environment, no DOM.
import { describe, expect, it } from 'vitest'
import { FLOWER_DORMANT, luma } from '../detective/palette'
import { viewBoxToImage } from './sectors'
import { getLevel } from '../levels/catalog'
import { buildLevelTarget } from '../levels/buildLevel'
import {
  ADVENTURE_BACKDROP,
  CHANNEL_STONE,
  GLASS_GRIME,
  NIGHT_VEIL,
  SAND_DRIFT,
  SAND_HOLLOW,
  SPINE_BACKDROPS,
  TORCH_CHALK,
  WAYPOINT_BACKDROPS,
  backdropFor,
} from './backdrops'

/** `TraceCanvas.tsx`'s night-dim ink (private there), mirrored for the same
 * reason `OFF_PATH_INK` above is. */
const TORCH_CHALK_DIM = '#989896'

/** Chroma, 0-255 — the same simple `max - min` measure
 * `artHierarchy.test.ts`'s `CONTOUR_CHROMA_TOLERANCE` uses. */
function chroma(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return Math.max(r, g, b) - Math.min(r, g, b)
}

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

/** The five reveal-grid rows, wired straight into `ADVENTURE_BACKDROP` — no
 * `PENDING_ENTRANCE_BACKDROP` indirection. Widened from three to five
 * (add-caretaker-prologue design.md D6/D7): the old `glass`/`sand` rows
 * re-key to `peces`/`tortugas` with the SAME literals, and `monos`/`sendero`
 * are new rows, each satisfying the same 55-luma law. */
const REVEAL_BACKDROPS = {
  peces: ADVENTURE_BACKDROP.peces!,
  tortugas: ADVENTURE_BACKDROP.tortugas!,
  monos: ADVENTURE_BACKDROP.monos!,
  sendero: ADVENTURE_BACKDROP.sendero!,
  night: ADVENTURE_BACKDROP.night!,
}
/** The three pre-existing corridor-channel rows, kept split from the reveal
 * rows above so the "no admissible light paint" falsifiability below stays
 * meaningful for each group on its own terms. */
const CHANNEL_BACKDROPS = {
  duck: ADVENTURE_BACKDROP.duck!,
  // The dolphin row shares the duck row's own literals verbatim (design.md
  // §3.1) — same group, same reasoning, no `channel` of its own.
  dolphin: ADVENTURE_BACKDROP.dolphin!,
  sheep: ADVENTURE_BACKDROP.sheep!,
  llama: ADVENTURE_BACKDROP.llama!,
}
/** The one art-corridor row: its channel is the HOLLOW the snake lies in,
 * not a painted band (design.md §2.3) — kept in its own group so the
 * registry-completeness guard below can prove every row belongs to
 * EXACTLY one of the four groups. */
const ART_CORRIDOR_BACKDROPS = {
  snake: ADVENTURE_BACKDROP.snake!,
}

describe('Reveal veil luma law (docs/09:158, design.md §2.5)', () => {
  it('separates the reveal veil paint from the lightest thing it covers, for all ten backdrops', () => {
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

  it('the union of the five groups equals every registered backdrop (registry-completeness guard)', () => {
    const grouped = new Set([
      ...Object.keys(CHANNEL_BACKDROPS),
      ...Object.keys(REVEAL_BACKDROPS),
      ...Object.keys(ART_CORRIDOR_BACKDROPS),
      ...Object.keys(WAYPOINT_BACKDROPS),
      ...Object.keys(SPINE_BACKDROPS),
    ])
    expect([...grouped].sort()).toEqual(Object.keys(ADVENTURE_BACKDROP).sort())
  })

  it('a hypothetical ungrouped row fails the completeness guard (sensitivity proof)', () => {
    const grouped = new Set([
      ...Object.keys(CHANNEL_BACKDROPS),
      ...Object.keys(REVEAL_BACKDROPS),
      ...Object.keys(ART_CORRIDOR_BACKDROPS),
      ...Object.keys(WAYPOINT_BACKDROPS),
      ...Object.keys(SPINE_BACKDROPS),
    ])
    const registryKeysWithHypothetical = [...Object.keys(ADVENTURE_BACKDROP), 'hypothetical']
    expect([...grouped].sort()).not.toEqual(registryKeysWithHypothetical.sort())
  })

  it("clears the child's own ink against the veil, for the five reveal-grid rows", () => {
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
  it('goes red for SHEET_PAPER against the aquarium (peces) — no admissible light paint (design.md §2.2, §2.3)', () => {
    expect(
      Math.abs(luma(SHEET_PAPER) - luma(REVEAL_BACKDROPS.peces.brightest)),
    ).toBeLessThan(MIN_BACKDROP_CONTRAST)
  })

  it('goes red for SHEET_PAPER against the sand (tortugas) — no admissible light paint (design.md §2.2, §2.3)', () => {
    expect(
      Math.abs(luma(SHEET_PAPER) - luma(REVEAL_BACKDROPS.tortugas.brightest)),
    ).toBeLessThan(MIN_BACKDROP_CONTRAST)
  })

  // Added for `monos`/`sendero` (add-caretaker-prologue design.md D6): the
  // same falsifiability pattern as `peces`/`tortugas` above — both new base
  // fills sit close enough to `SHEET_PAPER` (paper gaps 47/51, design.md
  // D6's worked table) that no light paint is admissible either, which is
  // what forces the dark `LEAF_LITTER`/`PATH_MUD` veils rather than leaving
  // them a taste call.
  it('goes red for SHEET_PAPER against monos — no admissible light paint (design.md D6)', () => {
    expect(
      Math.abs(luma(SHEET_PAPER) - luma(REVEAL_BACKDROPS.monos.brightest)),
    ).toBeLessThan(MIN_BACKDROP_CONTRAST)
  })

  it('goes red for SHEET_PAPER against sendero — no admissible light paint (design.md D6)', () => {
    expect(
      Math.abs(luma(SHEET_PAPER) - luma(REVEAL_BACKDROPS.sendero.brightest)),
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

describe('ADVENTURE_BACKDROP.dolphin (design.md §3.1/§3.2, this change)', () => {
  it("the dolphin row's values equal the duck row's, verbatim", () => {
    const dolphin = ADVENTURE_BACKDROP.dolphin!
    const duck = ADVENTURE_BACKDROP.duck!
    expect(dolphin.art).toBe(duck.art)
    expect(dolphin.quiet).toBe(duck.quiet)
    expect(dolphin.brightest).toBe(duck.brightest)
    expect(dolphin.corridorRows).toEqual(duck.corridorRows)
    expect(dolphin.channel).toBeUndefined()
  })

  it("each dolphin level's own channel rows, pushed back through the VIEW width (target.viewWidth, always 1000) — post-verify amendment A4, not the world width — fall inside (135, 889)", () => {
    // Post-verify amendment A4 (`sdd/dolphin-zigzag-scrolling-screen`, R2):
    // direct capture inspection (`capturas/pasoG/dolphin3-control.png` and
    // siblings) showed the ORIGINAL prediction (design.md §3.3) was right —
    // sampling at the world width W=1560/2120 read only open water — so the
    // backdrop `<image>` is now pinned to `viewWidth` (1000, same scale as
    // every other camera level, INCLUDING the duck's own) instead of the
    // world. The two-camera-world sampling this test used to run no longer
    // has a rendering counterpart: the image is never stretched to 1560/2120
    // any more, so there is nothing left to sample at those widths. This is
    // now the exact same per-level channel check `DUCK_CHANNELS` above runs,
    // at the SAME stage width duck uses.
    const { corridorRows } = ADVENTURE_BACKDROP.dolphin!
    for (const id of ['dolphin1', 'dolphin2', 'dolphin3', 'dolphin4']) {
      const level = getLevel(id)
      const target = buildLevelTarget(level)
      // Post-verify amendment A4: the backdrop image spans `viewWidth`, not
      // `viewBoxWidth`, on every dolphin level (camera or not — dolphin1/2
      // already report `viewWidth === viewBoxWidth === 1000`).
      expect(target.viewWidth, id).toBe(1000)
      const A = 160
      const top = 300 - (A + level.corridorWidth / 2)
      const bottom = 300 + (A + level.corridorWidth / 2)
      const topSrc = viewBoxToImage(0, top, target.viewWidth).y
      const bottomSrc = viewBoxToImage(0, bottom, target.viewWidth).y
      expect(topSrc, id).toBeGreaterThanOrEqual(corridorRows.top)
      expect(bottomSrc, id).toBeLessThanOrEqual(corridorRows.bottom)
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// The bee row's own law (`free-trail-waypoints` design.md §3.4). A FOURTH
// group, kept separate from the three above: the inherited `tile ?? channel
// ?? SHEET_PAPER` assertion is VACUOUS for it (a waypoint level passes no
// `corridor` prop and paints no veil), so the group's real law is stated
// here instead, over `bee.brightest` directly.
// ─────────────────────────────────────────────────────────────────────────────
describe('WAYPOINT_BACKDROPS luma law (design.md §3.4)', () => {
  const bee = WAYPOINT_BACKDROPS.bee

  it('W1: the dormant flower separates from the forest band by at least 55 luma — findable', () => {
    const gap = Math.abs(luma(FLOWER_DORMANT) - luma(bee.brightest))
    expect(gap).toBeGreaterThanOrEqual(55)
    expect(gap).toBeCloseTo(59, 0)
  })

  it("W2: the child's own trail (INK_COLOR, after A1's repair) separates from the forest band by at least 55 luma", () => {
    const INK_COLOR = '#1e293b'
    const gap = Math.abs(luma(INK_COLOR) - luma(bee.brightest))
    expect(gap).toBeGreaterThanOrEqual(55)
    expect(gap).toBeCloseTo(111, 0)
  })

  it('W3: the dormant flower is achromatic — chroma <= 12, the tolerance that lets the author pick a near-grey', () => {
    expect(chroma(FLOWER_DORMANT)).toBeLessThanOrEqual(12)
    expect(chroma(FLOWER_DORMANT)).toBe(0)
  })

  // Falsifiability (paso D's discipline): each of these MUST go RED, encoding
  // an ARGUMENT rather than only its conclusion. None can pass alongside
  // W1/W2 above, by construction — each compares a DIFFERENT paint.
  it('F1: the shipped dormant grey (CLUE_DRAINED) is unusable in this sector — without it FLOWER_DORMANT looks like a taste call', () => {
    const CLUE_DRAINED = '#838383'
    expect(Math.abs(luma(CLUE_DRAINED) - luma(bee.brightest))).toBeLessThan(55)
  })

  it("F2: the night's own dim (TORCH_CHALK_DIM) is not reusable here, at any tint", () => {
    expect(Math.abs(luma(TORCH_CHALK_DIM) - luma(bee.brightest))).toBeLessThan(55)
  })

  it("F3: OFF_PATH_INK is A1's defect, as a number — the one row a future reader must not delete", () => {
    const OFF_PATH_INK = '#94a3b8'
    const gap = Math.abs(luma(OFF_PATH_INK) - luma(bee.brightest))
    expect(gap).toBeLessThan(55)
    expect(gap).toBeCloseTo(10, 0)
  })

  it('F4: no earth channel (CORRIDOR_EARTH) is admissible either, so "no channel" is a finding and not an omission', () => {
    const CORRIDOR_EARTH = '#d9c3ae'
    expect(Math.abs(luma(CORRIDOR_EARTH) - luma(bee.brightest))).toBeLessThan(55)
  })

  it('declares no channel, no tile, and no ink/inkDim — the vacuous-inheritance claim', () => {
    expect(bee.channel).toBeUndefined()
    expect(bee.tile).toBeUndefined()
    expect(bee.ink).toBeUndefined()
    expect(bee.inkDim).toBeUndefined()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// SPINE_BACKDROPS: split from CHANNEL/REVEAL/ART_CORRIDOR/WAYPOINT above for
// the same reason WAYPOINT_BACKDROPS is (design.md §11.1 item 6): the
// registry-completeness guard's inherited `tile ?? channel ?? SHEET_PAPER`
// law would be VACUOUS for `hedgehog` — a backdrop level with neither paints
// no veil and draws no corridor, so there is no channel/tile claim to
// falsify. This group asserts the SUBSTANTIVE law instead: the ink itself
// (`radial-spines` design.md §2 D4) against the night band AND against the
// hedgehog body's own brightest opaque pixel — the derived undrawability
// measure 5 encodes.
// ─────────────────────────────────────────────────────────────────────────────
describe('SPINE_BACKDROPS ink law (radial-spines design.md §2 D1(a)/D4, §8.2)', () => {
  const hedgehog = SPINE_BACKDROPS.hedgehog
  // TraceCanvas.tsx's night-dim ink (private there), mirrored for the same
  // reason the file's own `TORCH_CHALK_DIM` above is.
  const dimInk = '#989896'
  // Both hedgehog PNGs' measured brightest opaque pixel (design.md §2 D1(b),
  // §10) — the pale belly/snout, present on both poses. Not a registry
  // field: no code looks it up at runtime, so it is mirrored here as the
  // literal the design measured, the same convention `FLOWER_DORMANT`/
  // `CLUE_DRAINED` above use for values that live only in a test's own
  // argument.
  const BODY_BRIGHTEST = '#d5d5d5' // luma 213 (design.md's measured 213.3, rounded)

  it('the hedgehog row declares no new ink token — TORCH_CHALK/TORCH_CHALK_DIM verbatim from the night row', () => {
    expect(hedgehog.ink).toBe(TORCH_CHALK)
    expect(hedgehog.inkDim).toBe(dimInk)
    expect(hedgehog.ink).toBe(ADVENTURE_BACKDROP.night!.ink)
    expect(hedgehog.inkDim).toBe(ADVENTURE_BACKDROP.night!.inkDim)
  })

  it('keeps the established hedgehog art measurements when night discovery moves to renewed art', () => {
    const night = ADVENTURE_BACKDROP.night!
    expect(hedgehog.art.href).toBe('/art/sector-night-background.png')
    expect(night.art.href).toBe('/art/sector-night-zoo-background.png')
    expect(hedgehog.art).not.toBe(night.art)
    expect(hedgehog.quiet).toBe('#2a3346')
    expect(hedgehog.brightest).toBe('#526083')
    expect(hedgehog.corridorRows).toEqual(night.corridorRows)
  })

  it('TORCH_CHALK (the earned mark, and the child\'s own line) clears the night band by >=55, both quiet and brightest', () => {
    const vsQuiet = Math.abs(luma(TORCH_CHALK) - luma(hedgehog.quiet))
    const vsBrightest = Math.abs(luma(TORCH_CHALK) - luma(hedgehog.brightest))
    expect(vsQuiet).toBeGreaterThanOrEqual(55)
    expect(vsBrightest).toBeGreaterThanOrEqual(55)
    expect(vsQuiet).toBeCloseTo(189, 0)
    expect(vsBrightest).toBeCloseTo(142.7, 0)
  })

  it('the unfilled mark (TORCH_CHALK_DIM) clears the night band too — brightest by only 0.8, recorded as a risk', () => {
    const vsQuiet = Math.abs(luma(dimInk) - luma(hedgehog.quiet))
    const vsBrightest = Math.abs(luma(dimInk) - luma(hedgehog.brightest))
    expect(vsQuiet).toBeGreaterThanOrEqual(55)
    expect(vsBrightest).toBeGreaterThanOrEqual(55)
    expect(vsBrightest).toBeCloseTo(55.8, 0)
  })

  it('goes red for INK_COLOR against the night band — no dark ink is admissible (falsifiability, docs/09 §4)', () => {
    const INK_COLOR = '#1e293b'
    expect(Math.abs(luma(INK_COLOR) - luma(hedgehog.quiet))).toBeLessThan(55)
  })

  it('TORCH_CHALK FAILS the body\'s brightest by 29.3 — chalk over the body is undrawable, which is WHY measure 5 excludes it', () => {
    const gap = Math.abs(luma(TORCH_CHALK) - luma(BODY_BRIGHTEST))
    expect(gap).toBeLessThan(55)
    expect(gap).toBeCloseTo(25.7, 0)
  })

  it('the floor is exact — a hypothetical body brightest of 184.0 or below would clear the law', () => {
    // luma(#b8b8b8) = 184.0 exactly (R=G=B, so luma = the channel value).
    const HYPOTHETICAL_FLOOR = '#b8b8b8'
    expect(Math.abs(luma(TORCH_CHALK) - luma(HYPOTHETICAL_FLOOR))).toBeGreaterThanOrEqual(55)
    // And today's real measured value (213.3) sits ABOVE that floor — the
    // law is still failing, as the test above already confirmed.
    expect(luma(BODY_BRIGHTEST)).toBeGreaterThan(184.0)
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
  // Adventure-Keyed Registry" — the backdrops resolve here now that
  // `adventureFor` (`zoo/adventures.ts`) knows `peces`/`tortugas`/`monos`/
  // `sendero`/`night`. `peces`/`tortugas` re-key the old `glass`/`sand`
  // rows (same literals, only the level ids they cover are now split
  // two-per-enclosure); `monos`/`sendero` are new rows.
  it('resolves the peces adventure (glass1, glass2) to the aquarium backdrop', () => {
    for (const id of ['glass1', 'glass2']) {
      expect(backdropFor(id), id).toBe(ADVENTURE_BACKDROP.peces)
    }
  })

  it('resolves the tortugas adventure (sand1, sand2) to the sand backdrop', () => {
    for (const id of ['sand1', 'sand2']) {
      expect(backdropFor(id), id).toBe(ADVENTURE_BACKDROP.tortugas)
    }
  })

  it('resolves the monos adventure (glass3, glass4) to the new leaf-veil backdrop', () => {
    for (const id of ['glass3', 'glass4']) {
      expect(backdropFor(id), id).toBe(ADVENTURE_BACKDROP.monos)
    }
  })

  it('resolves the sendero adventure (sand3, sand4) to the new mud-veil backdrop', () => {
    for (const id of ['sand3', 'sand4']) {
      expect(backdropFor(id), id).toBe(ADVENTURE_BACKDROP.sendero)
    }
  })

  it('resolves the night adventure to the night backdrop', () => {
    for (const id of ['night1', 'night2', 'night3', 'night4']) {
      expect(backdropFor(id), id).toBe(ADVENTURE_BACKDROP.night)
    }
  })

  it('resolves the bee adventure to the forest backdrop', () => {
    for (const id of ['bee1', 'bee2', 'bee3', 'bee4']) {
      expect(backdropFor(id), id).toBe(ADVENTURE_BACKDROP.bee)
    }
  })

  it('resolves the hedgehog adventure to the hedgehog backdrop (zoo-map spec, "Hedgehog Backdrop Resolves...")', () => {
    for (const id of ['hedgehog1', 'hedgehog2', 'hedgehog3', 'hedgehog4']) {
      expect(backdropFor(id), id).toBe(ADVENTURE_BACKDROP.hedgehog)
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
