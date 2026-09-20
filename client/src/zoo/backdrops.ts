// The adventure backdrop registry (duck-undulations-and-sector-backdrop
// design.md §3.3, re-keyed by design.md §2.3 of this change). One entry per
// ADVENTURE that has a drawn backdrop under its corridor. Pure, no React,
// keyed through the ADVENTURE rather than the sector: a level opts in only
// once its own adventure has actually been recut for the backdrop, which is
// what keeps the medusa's four levels on their scattered ground (`docs/13`
// §4 marks the medusa "Hecha — Nada").
//
// Re-keyed from `SectorId` to `AdventureId` (not `SectorId`) because
// `montañas` needs TWO backdrops — the ladera under the sheep, the
// cordillera under the llama — and `Partial<Record<SectorId, …>>` cannot
// hold two values for one key.
import type { ArtImage } from '../detective/assets'
import { SECTOR_BACKGROUND_ART } from '../detective/assets'
import { adventureFor, type AdventureId } from './adventures'

export interface AdventureBackdrop {
  art: ArtImage
  /** The still colour of the band the drawing leaves quiet, hand-copied
   *  from the manifest. Fills the rect UNDER the art and the letterbox
   *  bars. */
  quiet: string
  /** The LIGHTEST colour anywhere the corridor is painted over, sampled at
   *  build time across `corridorRows`. `docs/09:158`'s luma law is asserted
   *  against THIS, never against `quiet` — the quiet colour alone would
   *  flatter it. */
  brightest: string
  /** The source rows a corridor **or a reveal grid** can reach, authored
   *  from the widest channel through `viewBoxToImage`, and asserted to
   *  cover every adventure level the backdrop owns. */
  corridorRows: { top: number; bottom: number }
  /** The channel's paint. ABSENT = `SHEET_PAPER` — what keeps the lagoon
   *  backdrop byte-identical to before this change. Forced dark rather than
   *  chosen for the two mountain backdrops (design.md §2.1): there is no
   *  admissible LIGHT channel against either mountain background, so a
   *  per-backdrop `channel` field is the only remaining move. */
  channel?: string
  /** The reveal veil's paint (`reveal-grid` capability). ABSENT = this
   *  adventure has no reveal grid, which is every row that predates this
   *  change. Forced DARK rather than chosen (design.md §2.2): there is no
   *  admissible light paint over either entrance backdrop, at any tint. */
  tile?: string
  /** The child's own line over `tile`, when the default slate cannot clear
   *  it. ABSENT = `INK_COLOR`, which is every row but the night's. */
  ink?: string
  /** `ink`'s off-path dim, `inkDimColor`'s own convention. ABSENT =
   *  `OFF_PATH_INK`. */
  inkDim?: string
  /** This adventure's corridor SURFACE is DRAWN ART rather than a painted
   *  band (`docs/13` §8 row E). The extremes are over the cutouts' BODIES;
   *  the head's eye white is carried separately because it is the reason
   *  the traced span stops behind the head (design.md §2.2 R3), not a
   *  colour the ink has to clear. ABSENT = this adventure paints its
   *  corridor, which is every row that predates this change. */
  corridorArt?: { brightest: string; darkest: string; headWhite: string }
}

/** Mountain stone. Not a taste call — design.md §2.1's window is `[95,
 *  133]` and this sits at its low end so §2.2's sampling cannot close it.
 *  Luma 100, chroma 9 (≈4% saturation, hue 213°): dark enough to clear both
 *  mountain backdrops and the child's own `INK_COLOR`/`ART_OUTLINE` by the
 *  `docs/09:158` law, muted enough to sit inside the guide's palette. */
export const CHANNEL_STONE = '#606569'

/** Algae-grey on the inside of the aquarium pane (design.md §2.2). Luma 109
 *  — 14 above the ink-legibility floor (95) and, against the measured
 *  `brightest` 212 (design.md §2.3), 103 clear of `docs/09:158`'s 55-luma
 *  law. Wiping it away reveals the bright water underneath; it is dark by
 *  the law's construction, not taste — no light paint clears 212 by 55. */
export const GLASS_GRIME = '#64726b'

/** Wet, wind-piled sand over the entrance's dry path (design.md §2.2). Same
 *  luma 109 as `GLASS_GRIME`, for the same reason: the measured `brightest`
 *  (209) leaves no admissible light paint either (design.md §2.3). */
export const SAND_DRIFT = '#7a6a58'

/** The dark itself. The authored night backdrop's brightest sampled blue
 *  clears this by 55 (a FLOOR, not a cap: amendment A3). */
export const NIGHT_VEIL = '#12161f'

/** The child's own line on the night level. `INK_COLOR`'s slate (luma 40)
 *  clears `NIGHT_VEIL` by only 18 — short of the law by 37 — so the night
 *  backdrop declares its own ink (design.md §2.4). Luma 239 clears the veil
 *  by 217 and the revealed backdrop (96) by 143. */
export const TORCH_CHALK = '#f2efe6'

/** `TORCH_CHALK` with the light down — the night-level analogue of
 *  `LevelPlay.tsx`'s `MUD_INK`/`MUD_INK_DIM` pairing: the same line, blended
 *  toward the backdrop it fades into (`NIGHT_VEIL`) by 40%, rather than
 *  toward an unrelated cold grey. Luma ≈152 — still legible against a
 *  partially-lit tile, which sits between the two terminal states the
 *  55-luma law is asserted on (design.md §2.4's named exception). */
export const TORCH_CHALK_DIM = '#989896'

/** The scooped hollow in the sand each snake lies in (design.md §2.3). Two-
 *  sided window: must clear the sand's `brightest` (209.2) by 55 AND the
 *  darkest snake body (`#67895c`, 121.7) by 55 — `luma ≤ min(154.2, 66.7) =
 *  66.7` — and must not read as the art's own contour (26), a soft floor at
 *  40. Luma 52.5 sits mid-window with 14.2 of headroom, and only the
 *  CEILING can move as the measurement above already landed: pinned low, the
 *  same lever `CHANNEL_STONE`/`GLASS_GRIME` use. */
export const SAND_HOLLOW = '#3b332b'

/** The leaf veil over the monos enclosure (add-caretaker-prologue design.md
 *  D6's worked arithmetic). Luma 113, 92 clear of the base fill's 205 and
 *  73 clear of `INK_COLOR`'s 40 — both well past the 55-luma law, and the
 *  base fill's 252-`SHEET_PAPER` gap of 47 keeps `docs/09:158`'s "no
 *  admissible light paint" falsifiability true for this surface too. */
export const LEAF_LITTER = '#6e7a4a'

/** The mud veil over the sendero (design.md D6's worked arithmetic). Luma
 *  102, 99 clear of the base fill's 201 and 62 clear of `INK_COLOR`'s 40. */
export const PATH_MUD = '#75634c'

export const ADVENTURE_BACKDROP: Partial<Record<AdventureId, AdventureBackdrop>> = {
  duck: {
    art: SECTOR_BACKGROUND_ART.lagoon,
    quiet: '#b4c5d0',
    brightest: '#b4c5d0',
    corridorRows: { top: 135, bottom: 889 },
    // No `channel` — the lagoon keeps `SHEET_PAPER`, byte-identical to
    // before this change.
  },
  // The dolphin adventure — the duck row's own literals, reused rather than
  // re-sampled (design.md §3.1): at the two camera worlds (1560, 2120) the
  // visible source rows are a strict SUBSET of (135, 889), so `brightest`
  // over what actually renders cannot exceed the value measured over this
  // wider band. `backdrops.test.ts` asserts the containment at both widths,
  // so the claim is checked rather than assumed. No new `PASSTHROUGHS` row,
  // no `build_art.py` re-run, no new manifest literal.
  dolphin: {
    art: SECTOR_BACKGROUND_ART.lagoon,
    quiet: '#b4c5d0',
    brightest: '#b4c5d0',
    corridorRows: { top: 135, bottom: 889 },
    // No `channel` — the lagoon keeps `SHEET_PAPER`, exactly as the ducks do.
  },
  sheep: {
    art: SECTOR_BACKGROUND_ART.slope,
    quiet: '#9da396',
    // Measured over the frozen corridor rows (220, 866) — `scripts/art/
    // build_art.py`'s rebuilt manifest, NOT the wider range design.md's
    // draft table guessed from: the ladera's brightest pixel over this
    // exact band is its own quiet modal colour.
    brightest: '#9da396',
    corridorRows: { top: 220, bottom: 866 },
    channel: CHANNEL_STONE,
  },
  llama: {
    art: SECTOR_BACKGROUND_ART.range,
    quiet: '#c8d3d8',
    // Measured over the frozen corridor rows (166, 858).
    brightest: '#f5f5f5',
    corridorRows: { top: 166, bottom: 858 },
    channel: CHANNEL_STONE,
  },
  // The entrance's four enclosures and the night sector's row (design.md
  // §2.5, re-keyed by add-caretaker-prologue design.md D6/§4). `peces`/
  // `tortugas` re-key the old `glass`/`sand` rows with their SAME `tile`
  // and luma literals, unchanged (`zoo-map` delta's own requirement);
  // `monos`/`sendero` are new rows, each satisfying the `trace-canvas`
  // delta's 55-luma law against both `INK_COLOR` and `SHEET_PAPER` (design
  // D6's worked arithmetic) — `quiet`/`brightest` read off the rebuilt
  // `manifest.json` (task 1.10), not hand-guessed.
  peces: {
    art: SECTOR_BACKGROUND_ART.aquarium,
    quiet: '#b5e7f2',
    brightest: '#ffffff',
    corridorRows: { top: 51, bottom: 973 },
    tile: GLASS_GRIME,
  },
  tortugas: {
    art: SECTOR_BACKGROUND_ART.sand,
    quiet: '#d6cbba',
    brightest: '#dad0c0',
    corridorRows: { top: 51, bottom: 973 },
    tile: SAND_DRIFT,
  },
  monos: {
    art: SECTOR_BACKGROUND_ART.monkeys,
    quiet: '#c9d3b8',
    brightest: '#c9d3b8',
    corridorRows: { top: 51, bottom: 973 },
    tile: LEAF_LITTER,
  },
  sendero: {
    art: SECTOR_BACKGROUND_ART.path,
    quiet: '#d5c8b0',
    brightest: '#d5c8b0',
    corridorRows: { top: 51, bottom: 973 },
    tile: PATH_MUD,
  },
  night: {
    art: SECTOR_BACKGROUND_ART.nightZoo,
    quiet: '#1e4175',
    brightest: '#fbf4b6',
    corridorRows: { top: 51, bottom: 973 },
    tile: NIGHT_VEIL,
    ink: TORCH_CHALK,
    inkDim: TORCH_CHALK_DIM,
  },
  // The arena — "en la arena" is the sand itself, so this reuses the
  // entrance's own sand background (no new art commissioned): same file,
  // same measured `quiet`/`brightest`/`corridorRows`, a DIFFERENT adventure
  // row because the corridor here is a drawn cutout, not a painted band
  // (`docs/13` §8 row E). `ink`/`inkDim` reuse the night row's own two
  // fields (design.md §2.1): a dark ink is undrawable over the snakes' own
  // black spots (R1, gap 14), so `TORCH_CHALK` is the only admissible line.
  snake: {
    art: SECTOR_BACKGROUND_ART.sand,
    quiet: '#d6cbba',
    brightest: '#dad0c0',
    corridorRows: { top: 51, bottom: 973 },
    channel: SAND_HOLLOW,
    ink: TORCH_CHALK,
    inkDim: TORCH_CHALK_DIM,
    // The small snake's own measured extremes (task 1.3/1.4): `bodyBrightest`
    // #7b9b6e (luma 140.3, the brightest of the three bodies), `bodyDarkest`
    // #1a1a1a (the author's spots, all three snakes alike), `headWhite`
    // #f5f5f5 (the eye, luma 245 — R3's `TORCH_CHALK` gap of 6).
    corridorArt: { brightest: '#7b9b6e', darkest: '#1a1a1a', headWhite: '#f5f5f5' },
  },
  // The forest — paso F's own row (`free-trail-waypoints`, design.md §3.1).
  // The first backdrop that needs no channel (a bee level draws no corridor
  // at all — `docs/13` §4 decision 3) and no veil (no `reveal` field
  // either): `quiet`/`brightest` are hand-copied from the rebuilt
  // `manifest.json` and are EQUAL — the band is flat over the whole range
  // (`artManifest.test.ts` guards the parity).
  bee: {
    art: SECTOR_BACKGROUND_ART.forest,
    quiet: '#86a678',
    brightest: '#86a678',
    corridorRows: { top: 191, bottom: 926 },
  },
  // The hedgehog adventure keeps the established low-contrast night backdrop;
  // the renewed discovery scene is scoped to night1..4 so this existing ink
  // contract does not change. No `tile` — a spines level draws no reveal veil at all — and no
  // `channel` — it draws no corridor either, the bee row's own precedent.
  // `ink`/`inkDim` reuse the night row's own two fields: the 55-luma law is
  // one law over one backdrop, asserted once (design.md §2 D4, docs/09 §4).
  hedgehog: {
    art: SECTOR_BACKGROUND_ART.night,
    quiet: '#2a3346',
    brightest: '#526083',
    corridorRows: { top: 51, bottom: 973 },
    ink: TORCH_CHALK,
    inkDim: TORCH_CHALK_DIM,
  },
}

/** The bee row alone, kept split from the three groups above by
 *  `backdrops.test.ts`'s law loop: the inherited `tile ?? channel ??
 *  SHEET_PAPER` assertion is VACUOUS for it — a waypoint level passes no
 *  `corridor` prop at all and paints no veil, so there is no channel/tile
 *  claim to make. The group's own real law (W1-W3, design.md §3.4) is
 *  two-sided over `bee.brightest`: the dormant flower must be findable
 *  AND the child's own trail (after A1's repair) must be legible. */
export const WAYPOINT_BACKDROPS = { bee: ADVENTURE_BACKDROP.bee! }

/** The hedgehog row alone, split out for the same reason `WAYPOINT_BACKDROPS`
 *  is: `backdrops.test.ts`'s completeness guard loop would otherwise fall
 *  back to the vacuous `tile ?? channel ?? SHEET_PAPER` check — no paper is
 *  painted on a backdrop level with neither. This group asserts the
 *  SUBSTANTIVE ink law instead (design.md §11.1 item 6): `TORCH_CHALK`
 *  against `quiet`/`brightest`, both anchor mark states, and the
 *  body-crossing undrawability. */
export const SPINE_BACKDROPS = { hedgehog: ADVENTURE_BACKDROP.hedgehog! }

/** The backdrop a LEVEL is drawn on: its adventure's backdrop, or
 *  `undefined`.
 *
 *  Keyed through `adventureFor(levelId).id`, not through the sector —
 *  `estanque.adventureIds` (`zoo/sectors.ts`) holds EIGHT ids, the duck's
 *  four AND the medusa's four, and `montanas.adventureIds` holds the
 *  sheep's four AND the llama's four, each pair needing its OWN backdrop.
 *  Routing through `ADVENTURES` means a level opts in only when its own
 *  adventure has been recut for the backdrop (design.md §2.3). */
export function backdropFor(levelId: string): AdventureBackdrop | undefined {
  const adventure = adventureFor(levelId)
  return adventure ? ADVENTURE_BACKDROP[adventure.id] : undefined
}
