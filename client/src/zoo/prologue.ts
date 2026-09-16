// The prologue's opening script (add-caretaker-prologue design.md D1;
// docs/16_PROLOGO_EL_CUIDADOR.md §4). Three chained fixed plates shown
// before the zoo map on a child's first visit, and the pure step function
// that advances between them.
//
// Pure, no React — the same convention `zoo/adventures.ts` and
// `zoo/sectors.ts` already follow, so the script and its stepping are
// testable with no DOM, and `screen/PrologueOpening.tsx` is a thin renderer
// over this data rather than owning it.
import type { ArtImage } from '../detective/assets'
import { CART_ART, ZOO_BACKPACK_ART, ZOO_CARETAKER_ART } from '../detective/assets'

export interface ProloguePlate {
  line: string
  art: ArtImage
}

/** docs/16 §4's three lines, verbatim, in order. A non-empty tuple so
 *  `PROLOGUE_PLATES[0]` always exists — the opening always has a first
 *  plate to show. */
export const PROLOGUE_PLATES: readonly [ProloguePlate, ...ProloguePlate[]] = [
  { line: '¡Hola! Soy el Pulpito y cuido este zoológico.', art: ZOO_CARETAKER_ART },
  { line: 'Todas las mañanas limpio los recintos.', art: CART_ART },
  { line: '¿Me ayudás?', art: ZOO_BACKPACK_ART },
]

/** The next plate index, or `null` when the opening is over — tapping the
 *  last plate (or any index at or past the end) ends the sequence rather
 *  than wrapping or crashing. */
export function advancePlate(index: number): number | null {
  return index + 1 < PROLOGUE_PLATES.length ? index + 1 : null
}
