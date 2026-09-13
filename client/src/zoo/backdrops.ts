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

/** The dark itself. Luma 22 — `nightfall`'s derived `brightest` (design.md
 *  §3.2) must clear this by 55 (a FLOOR, not a cap: amendment A3), and it
 *  measures 96 — a 19-luma margin over the floor. */
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

export const ADVENTURE_BACKDROP: Partial<Record<AdventureId, AdventureBackdrop>> = {
  duck: {
    art: SECTOR_BACKGROUND_ART.lagoon,
    quiet: '#b4c5d0',
    brightest: '#b4c5d0',
    corridorRows: { top: 135, bottom: 889 },
    // No `channel` — the lagoon keeps `SHEET_PAPER`, byte-identical to
    // before this change.
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
}

/**
 * The entrance's and the night sector's three backdrop rows — authored and
 * ready, but kept OUT of `ADVENTURE_BACKDROP` for now, on purpose.
 *
 * **Discovered cross-phase dependency, not a silent deviation.** `design.md`
 * §2.5 places these three rows directly inside `ADVENTURE_BACKDROP`, keyed
 * `'glass' | 'sand' | 'night'`. But `ADVENTURE_BACKDROP` is typed
 * `Partial<Record<AdventureId, AdventureBackdrop>>`, and `AdventureId`
 * (`zoo/adventures.ts`) is only widened to include those three keys by
 * task 5.1 — Phase 5, explicitly out of scope for this apply run. Adding an
 * object-literal key `tsc` cannot see in `AdventureId` fails `npm run build`
 * ("Object literal may only specify known properties") the moment this file
 * is compiled on its own, which contradicts this Phase's own seam contract
 * (`tasks.md`'s Review Workload Forecast: "npm run build green" per phase,
 * and the D1 slice's rollback boundary, which assumes these three rows can
 * exist standalone). See `apply-progress.md` for the full note.
 *
 * All the values below are final and already hand-copied from the rebuilt
 * `manifest.json` (task 1.2) — `quiet`/`brightest` for `glass`/`sand` are
 * the source values unchanged (`emit_opaque_canvas` passes `fondo
 * pecera.png`/`fondo arena.png` through with no resize, no recolour); the
 * `night` row's are `nightfall`'s derived output (design.md §3.2). Phase 5
 * wires these three objects into `ADVENTURE_BACKDROP` in one line once
 * `AdventureId` is widened — no further "hand-copying" is left to do.
 */
export const PENDING_ENTRANCE_BACKDROP: Readonly<Record<'glass' | 'sand' | 'night', AdventureBackdrop>> = {
  glass: {
    art: SECTOR_BACKGROUND_ART.aquarium,
    quiet: '#9bb6c5',
    brightest: '#c7d9e0',
    corridorRows: { top: 51, bottom: 973 },
    tile: GLASS_GRIME,
  },
  sand: {
    art: SECTOR_BACKGROUND_ART.sand,
    quiet: '#d6cbba',
    brightest: '#dad0c0',
    corridorRows: { top: 51, bottom: 973 },
    tile: SAND_DRIFT,
  },
  night: {
    art: SECTOR_BACKGROUND_ART.night,
    quiet: '#394459',
    brightest: '#526084',
    corridorRows: { top: 51, bottom: 973 },
    tile: NIGHT_VEIL,
    ink: TORCH_CHALK,
    inkDim: TORCH_CHALK_DIM,
  },
}

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
