// The sector backdrop registry (duck-undulations-and-sector-backdrop
// design.md §3.3). One entry per sector that has a drawn backdrop under its
// corridor — today only the lagoon. Pure, no React, keyed through the
// ADVENTURE rather than the sector (see `backdropFor`'s own header): a
// level opts in only once its own adventure has actually been recut for the
// backdrop, which is what keeps the medusa's four levels on their scattered
// ground (`docs/13` §4 marks the medusa "Hecha — Nada").
import type { ArtImage } from '../detective/assets'
import { SECTOR_BACKGROUND_ART } from '../detective/assets'
import { adventureFor } from './adventures'
import type { SectorId } from './sectors'

export interface SectorBackdrop {
  art: ArtImage
  /** The still colour of the band the drawing leaves quiet, hand-copied
   *  from the manifest. Fills the rect UNDER the art and the letterbox
   *  bars. */
  quiet: string
  /** The LIGHTEST colour anywhere the corridor is painted over, sampled at
   *  build time across `corridorRows`. `docs/09:158`'s luma law is asserted
   *  against THIS, never against `quiet` — the quiet colour alone would
   *  flatter it. Measured directly against the shipped PNG (design.md's
   *  "Measured facts" appendix): the brightest pixel under the corridor IS
   *  the water itself, so `brightest` equals `quiet` for this backdrop. */
  brightest: string
  /** The source rows a corridor in this sector can reach, authored from the
   *  widest channel through `viewBoxToImage`, and asserted to cover every
   *  adventure level the sector owns. */
  corridorRows: { top: number; bottom: number }
}

export const SECTOR_BACKDROP: Partial<Record<SectorId, SectorBackdrop>> = {
  estanque: {
    art: SECTOR_BACKGROUND_ART.lagoon,
    quiet: '#b4c5d0',
    brightest: '#b4c5d0',
    corridorRows: { top: 135, bottom: 889 },
  },
}

/** The backdrop a LEVEL is drawn on: its adventure's sector's backdrop, or
 *  `undefined`.
 *
 *  Keyed through `adventureFor`, not through the sector directly —
 *  `estanque.adventureIds` (`zoo/sectors.ts`) holds EIGHT ids, the duck's
 *  four AND the medusa's four, so keying on the sector alone would give the
 *  four medusa levels the lagoon backdrop and strip their ground, breaking
 *  this change's own out-of-scope guarantee. Routing through `ADVENTURES`
 *  means a level opts in only when its own adventure has been recut for
 *  the backdrop (design.md §3.3). */
export function backdropFor(levelId: string): SectorBackdrop | undefined {
  const adventure = adventureFor(levelId)
  return adventure ? SECTOR_BACKDROP[adventure.sector] : undefined
}
