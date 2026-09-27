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
import { CART_ART, ZOO_BACKPACK_ART } from '../detective/assets'

export interface ProloguePlate {
  line: string
  /** Absent = a TEXT-ONLY bubble (`screen/bubbleFit.ts`'s own `art`-absent
   *  case, already shipped for `screen/Deduction.tsx`). The FIRST plate uses
   *  this: docs/18 D3 ("el Pulpito aparece dos veces en la primera lámina —
   *  chiquito adentro del globo y grande abajo") is exactly what putting
   *  `ZOO_CARETAKER_ART` in BOTH the bubble and the big standing figure did —
   *  he is already on screen, full body, the instant this plate mounts, so
   *  the bubble showing his own portrait again was the duplicate, not a
   *  second character worth introducing. */
  art?: ArtImage
}

/** docs/16 §4's three lines, verbatim, in order. A non-empty tuple so
 *  `PROLOGUE_PLATES[0]` always exists — the opening always has a first
 *  plate to show. */
export const PROLOGUE_PLATES: readonly [ProloguePlate, ...ProloguePlate[]] = [
  // T36 (odd/tasks/prewriting-stage-completion.md, docs/18 D3): no `art` —
  // see `ProloguePlate.art`'s own header above. The big caretaker standing
  // in the corner (`screen/PrologueOpening.tsx`) is already the picture for
  // this line.
  { line: '¡Hola! Soy el Pulpito y cuido este zoológico.' },
  { line: 'Todas las mañanas limpio los recintos.', art: CART_ART },
  { line: '¿Me ayudás?', art: ZOO_BACKPACK_ART },
]

/** The next plate index, or `null` when the opening is over — tapping the
 *  last plate (or any index at or past the end) ends the sequence rather
 *  than wrapping or crashing. */
export function advancePlate(index: number): number | null {
  return index + 1 < PROLOGUE_PLATES.length ? index + 1 : null
}
