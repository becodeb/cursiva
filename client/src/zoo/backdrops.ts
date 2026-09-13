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
  /** The source rows a corridor in this adventure's sector can reach,
   *  authored from the widest channel through `viewBoxToImage`, and
   *  asserted to cover every adventure level the backdrop owns. */
  corridorRows: { top: number; bottom: number }
  /** The channel's paint. ABSENT = `SHEET_PAPER` — what keeps the lagoon
   *  backdrop byte-identical to before this change. Forced dark rather than
   *  chosen for the two mountain backdrops (design.md §2.1): there is no
   *  admissible LIGHT channel against either mountain background, so a
   *  per-backdrop `channel` field is the only remaining move. */
  channel?: string
}

/** Mountain stone. Not a taste call — design.md §2.1's window is `[95,
 *  133]` and this sits at its low end so §2.2's sampling cannot close it.
 *  Luma 100, chroma 9 (≈4% saturation, hue 213°): dark enough to clear both
 *  mountain backdrops and the child's own `INK_COLOR`/`ART_OUTLINE` by the
 *  `docs/09:158` law, muted enough to sit inside the guide's palette. */
export const CHANNEL_STONE = '#606569'

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
