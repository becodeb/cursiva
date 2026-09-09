// Typed placeholder-asset registry (`detective-mode` design unit 3, spec:
// detective-mode "Colour Asset Registry"; design.md "Decision: assets behind
// a typed registry with origin-centred art").
//
// Art is authored as `d` path data in a box CENTRED ON THE ORIGIN, so a
// caller places it with `translate(x,y) rotate(deg) scale(s)` and no offset
// arithmetic. Placeholders live here as `d` strings; replacing them with the
// user's real art is a single-file edit that touches no logic elsewhere.
//
// The `M`/`L`/`C` restriction `levels/paths.ts:172-175` enforces does NOT
// apply to this file's art: registry art never passes through
// `transformPath`, it is positioned by a group transform, so any path
// command is legal here. Placeholder shapes below stick to `M`/`L`/`C` anyway
// purely for consistency with the rest of the repo, not because it is
// required.
import { POND, KERNEL, PRINT, PLUME } from './palette'

/** One art per trail theme. Each trail owns exactly one kind, and — per the
 * palette — exactly one earned colour. */
export type ClueKind = 'droplet' | 'corn' | 'footprint' | 'feather'

/** One art per deduction-screen animal choice (design unit 7, a later slice). */
export type AnimalId = 'gallina' | 'pato' | 'chancho' | 'vaca'

export interface ClueArt {
  d: string
  paint: 'fill' | 'stroke'
  /** The trail's registered earned colour (design.md "Colour Asset Registry").
   * A drained mark never renders this; it renders the shared
   * `palette.ts`'s `CLUE_DRAINED` token instead — that swap is the caller's
   * job (`TraceCanvas.tsx`'s `clues` prop), not this registry's. */
  earned: string
}

/** Placeholder water droplet: a simple teardrop, origin at its centre. */
const DROPLET_D = 'M0,-14 C7,-11 7,4 0,14 C-7,4 -7,-11 0,-14 Z'

/** Placeholder corn kernel: a rounded oval. */
const CORN_D = 'M0,-14 C8,-14 8,14 0,14 C-8,14 -8,-14 0,-14 Z'

/** Placeholder footprint: two overlapping ovals (heel + toes), origin between
 * them. */
const FOOTPRINT_D =
  'M0,-12 C5,-12 6,-4 3,0 C6,4 5,12 0,12 C-5,12 -6,4 -3,0 C-6,-4 -5,-12 0,-12 Z'

/** Placeholder feather: a slim pointed leaf, origin at its centre. */
const FEATHER_D = 'M0,-16 C6,-9 6,9 0,16 C-6,9 -6,-9 0,-16 Z'

export const CLUE_ART: Readonly<Record<ClueKind, ClueArt>> = {
  droplet: { d: DROPLET_D, paint: 'fill', earned: POND },
  corn: { d: CORN_D, paint: 'fill', earned: KERNEL },
  footprint: { d: FOOTPRINT_D, paint: 'fill', earned: PRINT },
  feather: { d: FEATHER_D, paint: 'fill', earned: PLUME },
}

/** Placeholder animal silhouettes for the deduction lineup (design unit 7).
 * `ruledOutBy` names the clue kind whose earned mark eliminates this animal —
 * consumed by the (later) deduction screen, not by anything in this slice. */
export const ANIMAL_ART: Readonly<Record<AnimalId, { d: string; ruledOutBy: ClueKind }>> = {
  gallina: {
    d: 'M0,-18 C10,-18 12,-6 6,0 L10,10 L-10,10 L-6,0 C-12,-6 -10,-18 0,-18 Z',
    ruledOutBy: 'feather',
  },
  pato: {
    d: 'M0,-14 C9,-14 11,-2 5,4 L8,10 L-8,10 L-5,4 C-11,-2 -9,-14 0,-14 Z',
    ruledOutBy: 'droplet',
  },
  chancho: {
    d: 'M0,-12 C10,-12 12,0 8,6 L10,10 L-10,10 L-8,6 C-12,0 -10,-12 0,-12 Z',
    ruledOutBy: 'corn',
  },
  vaca: {
    d: 'M0,-16 C12,-16 14,-2 7,4 L10,10 L-10,10 L-7,4 C-14,-2 -12,-16 0,-16 Z',
    ruledOutBy: 'footprint',
  },
}

/** Placeholder magnifying glass: a lens (stroked circle, via cubic Bézier)
 * plus a handle, origin roughly at the lens edge nearest the handle so the
 * whole shape reads as centred once positioned. Drawn in ink by the caller
 * (`TraceCanvas.tsx`'s `carrierArt` override) — this registry holds only the
 * geometry, never a colour of its own. */
export const GLASS_ART: { d: string } = {
  d: 'M7,-2 C7,2.97 2.97,7 -2,7 C-6.97,7 -11,2.97 -11,-2 C-11,-6.97 -6.97,-11 -2,-11 C2.97,-11 7,-6.97 7,-2 Z M4,4 L14,14',
}
