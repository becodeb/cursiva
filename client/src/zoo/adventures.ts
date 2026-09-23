// The adventure registry (`docs/13_AVENTURAS_POR_ANIMAL.md` §2, §5;
// duck-undulations-and-sector-backdrop design.md §3.3-§5). One row per
// animal: which levels belong to it, in play order, which sector it lives
// in, and the two lines the Pulpito says about it — before it starts and
// once its animal is standing in the zoo. Rows C-H each add ONE entry here
// and change no code (`docs/13` §4 decision 2, "la unidad es la aventura").
//
// Pure, no React — the same convention `zoo/sectors.ts` and `zoo/stars.ts`
// already follow, so every decision here is testable with no DOM.
import type { ArtImage, ZooAnimalId } from '../detective/assets'
import {
  CARRIER_LENS_ART,
  CART_ART,
  OCTOPUS_ART,
  SECTOR_ADVENTURE_ART,
  SIGN_ART,
  ZOO_ANIMAL_ART,
  ZOO_OCTOPUS_PRINT_ART,
  ZOO_SPEECH_BUBBLE_ART,
} from '../detective/assets'
import {
  animalPlacements,
  isFiled,
  PLAZA_CENTRE,
  type Records,
  type Rect,
  type SectorId,
  type ZooSector,
} from './sectors'

/** One id per adventure — the key `zoo/backdrops.ts`'s registry now uses,
 *  and what lets `montañas` carry two adventures where every earlier sector
 *  carried at most one. `peces`/`tortugas`/`monos`/`sendero`/`night` are the
 *  entrance's four enclosures (add-caretaker-prologue design.md D7, §3,
 *  replacing the old two-row `glass`/`sand` split) and the night sector
 *  (design.md §5, §6.1) — none of the five recovers an animal, which is
 *  what `AdventureSubject` below exists to represent. */
export type AdventureId =
  | 'duck'
  | 'sheep'
  | 'llama'
  | 'peces'
  | 'tortugas'
  | 'monos'
  | 'sendero'
  | 'night'
  | 'snake'
  | 'bee'
  | 'dolphin'
  | 'hedgehog'
  // The prologue's promise, kept (P2, `odd/tasks/promised-animals.md`):
  // the four garland levels the medusa's own goal art used to sit on
  // (`f2-guirnalda`..`f2-agua4`, `estanque`) get a real rescue adventure
  // instead of running with no `ADVENTURES` row at all.
  | 'fish'
  // The turtles' and monkeys' own rows (P3/P4, `odd/tasks/promised-
  // animals.md`) — the arena's and the bosque's own SECOND adventure each,
  // named in the plural to match `peces`/`tortugas`/`monos` above, but
  // distinct ids on purpose (this file's own header: those three are the
  // entrance's cleaning enclosures, which recover no animal at all).
  | 'turtles'
  | 'monkeys'

/** One beat of an adventure's closing SCREEN (add-caretaker-prologue
 *  design.md D3). `figure` overrides the standing octopus for THIS beat
 *  only — absent means `ZOO_OCTOPUS_BACKPACK_ART`, which is every beat but
 *  the magnifier swap. No `signLabel` field: `AdventureClosing` renders
 *  exactly one `CaptionedArt` per beat, and its caption is always `line`
 *  (the docs/16 §9 sentence) — the sign's uppercase word lives IN the
 *  artwork `art` points at (`SIGN_ART.fish`/`.turtles`/`.monkeys`), drawn
 *  there by `scripts/art/make_placeholders.py`, never as a second label. */
export interface ClosingBeat {
  line: string
  art: ArtImage
  figure?: ArtImage
}

interface AdventureBase {
  id: AdventureId
  /** In play order. `levelIds[0]` is where the narrative entry shows
   *  (`introLevel`). */
  levelIds: readonly string[]
  sector: SectorId
  /** The Pulpito's line on the entry screen, before the adventure starts. */
  intro: string
  /** His line on the map once this adventure's animal is standing in the
   *  zoo (`zoo-map` spec, "Octopus Phrase Reads as a Closing"). */
  closing: string
  /** The once-per-adventure closing SCREEN (`docs/13` §5 item 6; design.md
   *  §6.2), now an ORDERED, non-empty beat list (add-caretaker-prologue
   *  design.md D3) rendered in sequence by `AdventureClosing`. Distinct
   *  from `closing` above, which is the map bubble's own FALLBACK label
   *  (`mapBubble`, below) and stays exactly what it is: a caption cannot
   *  carry a transformation. Every shipped row carries one as of
   *  adventure-flow-and-map-guidance T8 (docs/18 §4.7 item 1: "recovering an
   *  animal has to be seen") — an animal row's own beat repeats `closing`
   *  verbatim with the animal's art, and `night`'s repeats its own `closing`
   *  with the linterna's flashlight art; the field stays optional only
   *  because a future adventure-less fixture (this file's own tests build
   *  a few) is still free to omit it. A non-empty TUPLE, not
   *  `ClosingBeat[]`: an empty array is truthy, and `closingLevel`'s
   *  `if (!adventure.closingBeat)` guard needs the empty case
   *  unrepresentable to stay byte-unchanged. */
  closingBeat?: readonly [ClosingBeat, ...ClosingBeat[]]
}

/** An adventure recovers an animal, or it carries a picture of its own.
 *  Exactly one, enforced by the union rather than by a test: the entrance
 *  and the night sector recover NO animal (the erizo is paso H's), and
 *  `mapBubble` keys a sector's closing line on an animal standing in the
 *  zoo, so an animal-less adventure has to say what picture travels with
 *  its two lines. `npm run build` is what catches a row with neither, the
 *  same mechanism `FogPatch.rot: 0` uses (design.md §6.1). */
type AdventureSubject =
  | { animal: ZooAnimalId; icon?: undefined }
  | { animal?: undefined; icon: ArtImage }

export type Adventure = AdventureBase & AdventureSubject

/** Total by construction — the union above is what makes the `else` branch
 *  reachable only when `icon` is present (design.md §6.1). */
export function adventureIcon(a: Adventure): ArtImage {
  return a.animal ? ZOO_ANIMAL_ART[a.animal] : a.icon
}

export const ADVENTURES: readonly Adventure[] = [
  {
    id: 'duck',
    levelIds: ['duck-trail1', 'duck-trail2', 'duck-trail3', 'duck-trail4'],
    sector: 'estanque',
    animal: 'pato',
    intro: 'El pato se fue por la laguna. ¿Lo seguimos?',
    closing: '¡Encontramos al pato! Ya está en su laguna.',
    // The rescue closing (adventure-flow-and-map-guidance T8, docs/18 §4.7
    // item 1): ONE beat, `closing`'s own line verbatim (approved copy) with
    // the animal's own art — the moment "recovering an animal" finally gets
    // to be SEEN, rather than only ever surfacing in the map bubble (D27).
    // No `figure` override: the standing octopus (`ZOO_OCTOPUS_BACKPACK_ART`,
    // `AdventureClosing`'s own default) is the caretaker simply presenting
    // what was found, the same figure every map screenshot already shows
    // him as — nothing in the registry's three octopus assets reads as "the
    // Pulpito celebrating" better than that. The magnifier figure
    // (`OCTOPUS_ART`, sendero's own beat 2) is reserved for "starting to
    // search", the opposite moment.
    closingBeat: [{ line: '¡Encontramos al pato! Ya está en su laguna.', art: ZOO_ANIMAL_ART.pato }],
  },
  {
    id: 'sheep',
    levelIds: ['sheep-hill1', 'sheep-hill2', 'sheep-hill3', 'sheep-hill4'],
    sector: 'montanas',
    animal: 'oveja',
    intro: 'Las ovejas se escaparon por la ladera. ¿Las juntamos?',
    closing: '¡Juntamos las ovejas! Ya están en su ladera.',
    // Rescue closing (T8) — the duck row's own reasoning, restated: one
    // beat, `closing` verbatim, the animal's own art, default figure.
    closingBeat: [{ line: '¡Juntamos las ovejas! Ya están en su ladera.', art: ZOO_ANIMAL_ART.oveja }],
  },
  {
    id: 'llama',
    levelIds: ['llama-peak1', 'llama-peak2', 'llama-peak3', 'llama-peak4'],
    sector: 'montanas',
    animal: 'llama',
    intro: 'Las llamas están en los picos. ¿Subimos a buscarlas?',
    closing: '¡Encontramos a la llama! Ya está en la cumbre.',
    // Rescue closing (T8) — the duck row's own reasoning, restated.
    closingBeat: [{ line: '¡Encontramos a la llama! Ya está en la cumbre.', art: ZOO_ANIMAL_ART.llama }],
  },
  // The entrance's four enclosures (add-caretaker-prologue design.md D7,
  // §3; docs/16 §9's script, verbatim). Four rows in place of the two
  // `glass`/`sand` rows this change replaces. Narrowed from two levels to
  // ONE per enclosure by adventure-flow-and-map-guidance T1 ("levels that
  // must be done twice" — the same erase gesture on the same picture,
  // played back to back): each row below keeps only the EASIER of its
  // original pair (`glass1`/`sand1`/`glass3`/`sand3`); the harder twin
  // (`glass2`/`sand2`/`glass4`/`sand4`) is never deleted from the catalog —
  // level ids are persisted keys — but belongs to no adventure and no
  // sector any more, reachable only through the dev `?nivel=` deep link.
  // None recovers an animal — `icon` carries the picture that travels with
  // their two lines, the same convention the old rows used. The FLAT play
  // order these four rows are met in is decided by `zoo/sectors.ts`'s
  // `entrada.adventureIds` (design.md D7), not by this array's order.
  {
    id: 'peces',
    levelIds: ['glass1'],
    sector: 'entrada',
    // The intro names the SURFACE, never the missing animal: showing
    // `SIGN_ART.fish` here would announce PECES before the child cleans the
    // glass, and the discovery of the absence is the whole point of the
    // prologue (`docs/16` §1). The sign is the CLOSING's art, earned by the
    // cleaning, not spent on the way in. Same reasoning on the other three.
    icon: SECTOR_ADVENTURE_ART.chest,
    intro: 'El vidrio de la pecera está todo empañado. ¿Lo limpiamos?',
    closing: 'El vidrio quedó limpito.',
    closingBeat: [
      {
        line: '¡Las algas, el cofre, las piedras… pero no hay ni un pez!',
        art: SIGN_ART.fish,
      },
    ],
  },
  {
    id: 'tortugas',
    levelIds: ['sand1'],
    sector: 'entrada',
    icon: SECTOR_ADVENTURE_ART.stone,
    intro: 'La arena tapó todo el recinto. Barrámosla.',
    closing: 'La arena quedó reluciente.',
    closingBeat: [
      {
        line: 'Las piedras, el tronco… ¿y las tortugas dónde están?',
        art: SIGN_ART.turtles,
      },
    ],
  },
  {
    id: 'monos',
    levelIds: ['glass3'],
    sector: 'entrada',
    icon: SECTOR_ADVENTURE_ART.leaf,
    intro: 'Cayeron un montón de hojas. ¿Las sacamos?',
    closing: 'El aviario quedó limpito.',
    closingBeat: [
      {
        line: 'Las sogas, las frutas… acá tampoco hay nadie.',
        art: SIGN_ART.monkeys,
      },
    ],
  },
  {
    id: 'sendero',
    levelIds: ['sand3'],
    sector: 'entrada',
    // The caretaker's own cart, not the footprints: the footprints are what
    // the child is about to FIND at the end of this enclosure, and putting
    // them on the way in gives away the one surprise the prologue exists to
    // deliver (`docs/16` §2, beat 4). The cart says "there is cleaning to
    // do", which is all the intro should say.
    icon: CART_ART,
    intro: 'El sendero quedó lleno de barro.',
    closing: 'El sendero quedó reluciente.',
    // Two beats (design.md D4): the footprints appear, then the caretaker
    // becomes the detective in place — a transformation of WHO is standing
    // there, not a second sentence. Beat 1's line is the game's
    // pre-existing (and, before this change, only) `closingBeat` line,
    // carried forward character-for-character from the old `sand` row.
    closingBeat: [
      {
        line: '¡Mirá! ¿Y esto? ¡Son huellas!',
        art: ZOO_OCTOPUS_PRINT_ART,
      },
      {
        line: '¡Se fueron todos los animales! Agarrá la lupa: los vamos a buscar.',
        art: CARRIER_LENS_ART,
        figure: OCTOPUS_ART,
      },
    ],
  },
  {
    id: 'night',
    levelIds: ['night1', 'night2', 'night3', 'night4'],
    sector: 'nocturna',
    icon: SECTOR_ADVENTURE_ART.flashlight,
    intro: 'De noche hay cosas escondidas. ¿Las buscamos con la luz?',
    closing: 'Encontramos todo en la oscuridad.',
    // Rescue-shaped closing, animal-less (adventure-flow-and-map-guidance
    // T8, docs/18 §4.7 item 1): ONE beat, `closing`'s own line verbatim,
    // with the SAME flashlight art `zoo/backpack.ts`'s `linterna` item and
    // this row's own `icon` already use — the linterna is what "finding
    // everything in the dark" actually means here, so it is also what the
    // closing shows. [Superseding history: an earlier design (design.md
    // §6.2) tried assigning `night` a `closingBeat` and was reverted
    // because the then-current `main-screen` spec named `night` BY NAME
    // among the adventures that must exit ordinarily — see
    // `apply-progress.md`'s Phase 6 section. T8 (docs/18 §4.7) explicitly
    // asks for this row to carry a closing after all; that spec's scoping
    // is now superseded by this change, not contradicted by an oversight.]
    // Animal-less, so `resolveAfterAdventure` (`screen/GameScreen.tsx`)
    // still chains this closing's own fall-off straight into `hedgehog`'s
    // narrative entry (T2 amendment) — `advanceClosing('night4', 0, …)`
    // is asserted against that exact chain in `GameScreen.test.tsx`.
    closingBeat: [{ line: 'Encontramos todo en la oscuridad.', art: SECTOR_ADVENTURE_ART.flashlight }],
  },
  {
    id: 'snake',
    levelIds: ['snake1', 'snake2', 'snake3', 'snake4'],
    sector: 'arena',
    animal: 'vibora',
    intro: 'Las víboras se enredaron en la arena. ¿Las ordenamos y las llevamos a su lugar?',
    closing: '¡Las víboras están en su arena!',
    // Rescue closing (T8) — the duck row's own reasoning, restated: one
    // beat, `closing` verbatim, the animal's own art, default figure. Before
    // T8, an animal's rescue was told ONLY by the map bubble
    // (`mapBubble`'s `a.animal !== undefined` selector, still true today for
    // the FALLBACK case) — which is exactly D27/D28's complaint (`docs/18`
    // §4.7): recovering an animal had no on-screen MOMENT, only a line that
    // sometimes appeared on a screen the child was not necessarily looking
    // at right then.
    closingBeat: [{ line: '¡Las víboras están en su arena!', art: ZOO_ANIMAL_ART.vibora }],
  },
  {
    id: 'turtles',
    levelIds: ['turtle1', 'turtle2', 'turtle3', 'turtle4'],
    sector: 'arena',
    animal: 'tortuga',
    intro: 'Las tortugas se escaparon del recinto y se fueron a dar vueltas por la arena. ¿Seguimos sus vueltas?',
    closing: '¡Encontramos a las tortugas! Ya volvieron a su recinto.',
    // Rescue closing (T8) — the snake row's own reasoning, restated: one
    // beat, `closing` verbatim, the animal's own art, default figure.
    //
    // Placed HERE, right after `snake`, matching the arena's own real play
    // order (`zoo/sectors.ts`'s `arena.adventureIds`: snake, then turtles)
    // — the same readability-only convention `fish`'s own comment explains
    // for `estanque`, with the identical consequence: `mapBubble`'s
    // `.filter(...).at(-1)` cannot actually see this row's position, since
    // the turtle's own placement lives in `entrada` (`zoo/sectors.ts`'s
    // `entrada.animals`), not `arena` — the whole "each rescued animal goes
    // back to ITS OWN enclosure" rule, restated a second time.
    closingBeat: [{ line: '¡Encontramos a las tortugas! Ya volvieron a su recinto.', art: ZOO_ANIMAL_ART.tortuga }],
  },
  {
    id: 'bee',
    levelIds: ['bee1', 'bee2', 'bee3', 'bee4'],
    sector: 'bosque',
    animal: 'abeja',
    intro: 'La abeja se perdió entre las flores. ¿La ayudamos a volver al panal?',
    closing: '¡La abeja volvió a su panal!',
    // Rescue closing (T8) — the snake row's own reasoning, restated.
    closingBeat: [{ line: '¡La abeja volvió a su panal!', art: ZOO_ANIMAL_ART.abeja }],
  },
  {
    id: 'monkeys',
    levelIds: ['monkey1', 'monkey2', 'monkey3', 'monkey4'],
    sector: 'bosque',
    animal: 'mono',
    intro: 'Los monos se escaparon de sus sogas y se fueron colgados de las lianas del bosque. ¿Seguimos sus vueltas?',
    closing: '¡Encontramos a los monos! Ya volvieron a sus sogas.',
    // Rescue closing (T8) — the bee row's own reasoning, restated. Placed
    // right after `bee`, matching the bosque's own real play order — see
    // the `turtles` row's own comment above for why `mapBubble`'s registry
    // position is unaffected either way (the monkey's own placement lives
    // in `entrada`, not `bosque`).
    closingBeat: [{ line: '¡Encontramos a los monos! Ya volvieron a sus sogas.', art: ZOO_ANIMAL_ART.mono }],
  },
  {
    id: 'fish',
    levelIds: ['f2-guirnalda', 'f2-agua2', 'f2-agua3', 'f2-agua4'],
    sector: 'estanque',
    animal: 'pez',
    intro: 'Los peces se escaparon de la pecera y se escondieron en la laguna. ¡Dejaron burbujas! ¿Las seguimos?',
    closing: '¡Encontramos a los peces! Ya volvieron a su pecera.',
    // Rescue closing (T8) — the duck row's own reasoning, restated: one
    // beat, `closing` verbatim, the animal's own art, default figure.
    //
    // Placed HERE, between `duck` and `dolphin`, matching the sector's own
    // REAL play order (duck → fish's own four garland levels → dolphin,
    // `zoo/sectors.ts`'s `estanque.adventureIds`) for readability, even
    // though `mapBubble`'s own `.filter(...).at(-1)` (above) cannot
    // actually see this row move: its filter requires BOTH `a.sector ===
    // sector.id` AND the animal to already be STANDING in that same
    // sector (`animalPlacements(sector, records)`), and the fish's own
    // placement lives in `entrada` (`zoo/sectors.ts`'s `entrada.animals`
    // row), not `estanque` — the whole point of "each rescued animal goes
    // back to ITS OWN enclosure at the entrance" (`docs/18` §4.5). So
    // `fish` can never contend with `duck`/`dolphin` for `estanque`'s own
    // fallback bubble line, at ANY registry position, and it can equally
    // never win `entrada`'s (its `sector` field there is `'estanque'`, not
    // `'entrada'`) — a real, accepted gap: once rescued, the fish has no
    // sector whose non-spotlight fallback bubble will ever announce it.
    // That is not this row's OWN closing screen's problem — `AdventureClosing`
    // already shows this exact line once, the instant `f2-agua4` is filed
    // (T8, docs/18 §4.7 item 1) — only the SECOND, lower-priority surface
    // `mapBubble` offers once the journey itself is exhausted.
    closingBeat: [{ line: '¡Encontramos a los peces! Ya volvieron a su pecera.', art: ZOO_ANIMAL_ART.pez }],
  },
  {
    id: 'dolphin',
    levelIds: ['dolphin1', 'dolphin2', 'dolphin3', 'dolphin4'],
    sector: 'estanque',
    animal: 'delfin',
    intro: 'Los delfines saltan en fila. ¿Pasamos entre ellos sin tocarlos?',
    closing: '¡Pasamos entre los delfines! Ya están tranquilos en el estanque.',
    // Rescue closing (T8) — the snake/bee rows' own reasoning, restated.
    // Appended at the END of the registry, matching every prior row (C-H
    // each added one entry here) — and `mapBubble`'s `.at(-1)` (its
    // FALLBACK branch only, `isSpotlightTarget` false — see that function's
    // own header) still needs `dolphin` only to come AFTER `duck` in array
    // order for filing `dolphin4` to surface its own line over the duck's,
    // which appending trivially satisfies.
    closingBeat: [{ line: '¡Pasamos entre los delfines! Ya están tranquilos en el estanque.', art: ZOO_ANIMAL_ART.delfin }],
  },
  {
    id: 'hedgehog',
    levelIds: ['hedgehog1', 'hedgehog2', 'hedgehog3', 'hedgehog4'],
    sector: 'nocturna',
    animal: 'erizo',
    intro: 'Al erizo le faltan las espinas. ¿Se las dibujamos?',
    closing: '¡El erizo tiene todas sus espinas!',
    // Rescue closing (T8) — the snake/bee/dolphin rows' own reasoning,
    // restated. Appended at the END of the registry (amendment 9's rule for
    // `ADVENTURES` — only relative order matters here, unlike `catalog.ts`'s
    // real ascending-phase ordering constraint, design.md §2 D6).
    closingBeat: [{ line: '¡El erizo tiene todas sus espinas!', art: ZOO_ANIMAL_ART.erizo }],
  },
]

/** The adventure a level belongs to, or `undefined` for a level no
 *  adventure has claimed yet — today everything but the four duck ids. */
export function adventureFor(levelId: string): Adventure | undefined {
  return ADVENTURES.find((a) => a.levelIds.includes(levelId))
}

/** True only for `levelIds[0]` of SOME adventure — the narrative entry
 *  belongs to the ADVENTURE, not to each challenge (`docs/13` §5 item 1). A
 *  level that belongs to no adventure, or that belongs to one but is not
 *  its first level, resolves `undefined`. */
export function introLevel(levelId: string): Adventure | undefined {
  const adventure = adventureFor(levelId)
  return adventure && adventure.levelIds[0] === levelId ? adventure : undefined
}

/** The adventure whose LAST `levelIds` entry this is, if it carries a
 *  closing beat — the mirror of `introLevel` (design.md §6.3), and pure for
 *  the same reason. `undefined` for every level that is not an adventure's
 *  own last level — every SHIPPED row carries a `closingBeat` as of T8
 *  (see that field's own header), so the only way to resolve `undefined`
 *  today is via a level belonging to no adventure at all, or to one but not
 *  its own last level; the guard on `adventure.closingBeat` itself stays
 *  general, for a hand-built fixture with none (`GameScreen.test.tsx`,
 *  `AdventureClosing.test.tsx`). */
export function closingLevel(levelId: string): Adventure | undefined {
  const adventure = adventureFor(levelId)
  if (!adventure || !adventure.closingBeat) return undefined
  return adventure.levelIds[adventure.levelIds.length - 1] === levelId ? adventure : undefined
}

/**
 * The story's own ending condition (`promised-animals` task B, `docs/18` §4
 * "cumplir la promesa del prólogo" — the same directive the `fish`/`turtles`/
 * `monkeys` rows above exist to satisfy): true once every adventure's every
 * level is filed. Derived by walking `ADVENTURES` itself, never a second
 * hardcoded id list — the same registry-driven guarantee `adventureFor` and
 * `mapBubble` already rely on, so a future row (a `docs/13` letter G) needs
 * no matching edit here to keep the finale correct.
 *
 * Deliberately over EVERY row, not only the animal-recovering ones: "every
 * animal is back" is the child-facing framing (`screen/ZooMap.tsx`'s own
 * finale line), but the entrance's four cleanup enclosures
 * (`peces`/`tortugas`/`monos`/`sendero`) and `night` are still open loops
 * until they are filed too — the finale is "nothing is left to do in the
 * whole zoo", which the prologue's cleanup is as much a part of as any
 * rescue.
 *
 * `nextJourneyStep` (`zoo/journey.ts`) returning `null` is a WEAKER
 * condition than this one — it can also go `null` while a later `JOURNEY`
 * stop's sector has simply never opened, which is not the same claim as
 * "filed". Today's registry happens to make the two coincide (`JOURNEY`
 * covers every `ADVENTURES` row's own entry level, `journey.test.ts`'s own
 * guard test proves it), but `screen/ZooMap.tsx`'s finale checks THIS
 * function explicitly rather than leaning on that coincidence, so a future
 * change to either registry cannot silently make the ending fire early.
 */
export function everyAdventureFiled(records: Records): boolean {
  return ADVENTURES.every((a) => a.levelIds.every((id) => isFiled(records, id)))
}

/** What the Pulpito says about the sector the huellas point at, and the
 *  picture that goes with it — the word never travels alone (`docs/12`
 *  §3). The constant onward-pointing line the map already shipped; also
 *  what an animal's own rescue used to CLOSE into (`docs/13` §5 item 6)
 *  before T8 gave every rescue its own closing screen — see `mapBubble`'s
 *  own header for why that branch is now the FALLBACK, not the default. */
const ONWARD = {
  art: ZOO_OCTOPUS_PRINT_ART,
  label: '¡Mirá! Las huellas van hacia allá. ¿Vamos?',
} as const

/**
 * `isSpotlightTarget` true and `sector` non-null means the map's own
 * spotlight (`nextJourneyStep`, `screen/ZooMap.tsx`) is pointing at
 * `sector` right now, and `false` is the FALLBACK the map falls back to
 * once the journey is done. Adventure-flow-and-map-guidance T8 (docs/18
 * §4.7 item 1, D27/D28) moves each rescue's own moment onto its adventure's
 * `closingBeat` — the closing screen the child sees the instant they finish
 * that adventure — so the ONGOING map bubble no longer needs to (or should)
 * repeat an old rescue: doing so was T4's own found defect (`docs/18`
 * "2026-09-23" progress note), where finishing the bee still announced the
 * duck, found long ago, because the spotlight had moved on to the estanque
 * for an unrelated reason (its medusa block) and the bubble's own
 * most-recently-recovered lookup does not know how long ago "recently" was.
 * While there is still a journey stop ahead, the bubble ALWAYS reads
 * onward — never a rescue, however recent. Only once the journey itself is
 * exhausted (`isSpotlightTarget` false, the no-more-stops fallback,
 * `screen/ZooMap.tsx`'s own `discovered` source) does this keep its
 * pre-T8 behaviour of surfacing the sector's own most-recently-recovered
 * animal — a real, still-reachable state (every sector fully filed) that
 * predates any closing screen and has no ongoing journey stop left to talk
 * about instead.
 */
export function mapBubble(
  sector: ZooSector,
  records: Records,
  isSpotlightTarget = false,
): { art: ArtImage; label: string } {
  if (isSpotlightTarget) return ONWARD
  // `.filter(...).at(-1)`, not `.find(...)`: a sector with more than one
  // adventure (`montañas`: sheep, then llama) must surface the MOST
  // RECENTLY recovered one, in registry order — `.find` always returns the
  // FIRST match, which would keep saying the sheep's closing line forever
  // once the sheep are home and never surface the llama's (`zoo-map` spec,
  // "Octopus Phrase Reads as a Closing Once the Sector's Animal Is
  // Recovered"). `a.animal !== undefined &&` excludes the entrance's and the
  // night sector's animal-less adventures from ever resolving this branch
  // (design.md §6.1, `zoo-map` spec "Animal-less Adventures Are Excluded
  // From the Animal-Keyed Closing Phrase") — filing `sand4`/`night4` never
  // changes `entrada`'s/`nocturna`'s bubble.
  const recovered = ADVENTURES.filter(
    (a): a is Adventure & { animal: ZooAnimalId } =>
      a.animal !== undefined &&
      a.sector === sector.id &&
      animalPlacements(sector, records).some((p) => p.art === ZOO_ANIMAL_ART[a.animal!]),
  ).at(-1)
  return recovered ? { art: ZOO_ANIMAL_ART[recovered.animal], label: recovered.closing } : ONWARD
}

/**
 * Where the map bubble sits (`screen/ZooMap.tsx`), one of four fixed
 * quadrants around the Pulpito's own `PLAZA_CENTRE` — the same corners a
 * tooltip picks from. `docs/18` D4: the bubble used to have exactly ONE
 * placement (above-left of the Pulpito), which is why it read as clipped at
 * 844×390 and why it could sit on top of the very sector it was pointing at.
 */
export type BubbleAnchor = 'above-left' | 'above-right' | 'below-left' | 'below-right'

export interface BubbleBox extends Rect {
  anchor: BubbleAnchor
}

/** ≈24% of the 1000-unit stage width — smaller than the single fixed
 *  placement's old 27% (`screen/ZooMap.tsx`'s pre-T4 `ZOO_CSS`), which
 *  leaves the four anchors below room to move without ever spilling off a
 *  1000×600 stage (`bubblePlacement`'s own `insideStage` check, proven for
 *  every sector hit in `adventures.test.ts`). Height follows the source
 *  file's own aspect ratio, the same convention `Footprint`/`placeArt`
 *  already use — never a second, independently-guessed number. */
const BUBBLE_WIDTH = 240
const BUBBLE_HEIGHT = (BUBBLE_WIDTH * ZOO_SPEECH_BUBBLE_ART.h) / ZOO_SPEECH_BUBBLE_ART.w

/** How far the box's own near corner sits from `PLAZA_CENTRE` — small
 *  enough that the mirrored/flipped tail (design.md's own ~10%/~91%-of-file
 *  position) still reads as touching the Pulpito, large enough that the box
 *  never overlaps his own standing art (150-unit tall, `ZooMap.tsx`). */
const BUBBLE_GAP = 20

const BUBBLE_ANCHORS: readonly BubbleAnchor[] = ['above-left', 'above-right', 'below-left', 'below-right']

function bubbleBoxFor(anchor: BubbleAnchor): Rect {
  const left = PLAZA_CENTRE.x - BUBBLE_GAP - BUBBLE_WIDTH
  const right = PLAZA_CENTRE.x + BUBBLE_GAP
  const above = PLAZA_CENTRE.y - BUBBLE_GAP - BUBBLE_HEIGHT
  const below = PLAZA_CENTRE.y + BUBBLE_GAP
  const onLeft = anchor === 'above-left' || anchor === 'below-left'
  const onTop = anchor === 'above-left' || anchor === 'above-right'
  return { x: onLeft ? left : right, y: onTop ? above : below, w: BUBBLE_WIDTH, h: BUBBLE_HEIGHT }
}

function overlapArea(a: Rect, b: Rect): number {
  const ox = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x))
  const oy = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y))
  return ox * oy
}

function insideStage(box: Rect): boolean {
  return box.x >= 0 && box.y >= 0 && box.x + box.w <= 1000 && box.y + box.h <= 600
}

/**
 * The bubble's own box and chosen anchor, so it never sits on top of
 * `targetHit` (the spotlight's own destination, `screen/ZooMap.tsx`) and
 * stays fully on-screen at every measured viewport (`docs/18` D4, D7). The
 * four anchors (`BUBBLE_ANCHORS`, in that order) are tried in turn; the
 * first that both fits the stage and does not intersect `targetHit` wins.
 * If all four intersect it (a target hit large or central enough to reach
 * every quadrant), the one with the SMALLEST overlap area wins instead of
 * leaving the choice undefined — a corner still has to be picked, and the
 * least-bad one reads better than an arbitrary fixed default. Pure: no
 * randomness, no DOM, so `adventures.test.ts` asserts it directly against
 * every sector's own hit rect.
 */
export function bubblePlacement(targetHit: Rect): BubbleBox {
  const candidates = BUBBLE_ANCHORS.map((anchor) => ({ anchor, box: bubbleBoxFor(anchor) }))
  const clear = candidates.find((c) => insideStage(c.box) && overlapArea(c.box, targetHit) === 0)
  const chosen =
    clear ??
    candidates.reduce((min, c) => (overlapArea(c.box, targetHit) < overlapArea(min.box, targetHit) ? c : min))
  return { ...chosen.box, anchor: chosen.anchor }
}

/**
 * The bubble's own placement for the finale (`everyAdventureFiled` above):
 * once every animal is back there is no spotlight `targetHit` left to keep
 * clear of (`screen/ZooMap.tsx`'s `spotlightSector` is `null` in exactly
 * this state), so `bubblePlacement` has nothing to avoid — which is also the
 * literal answer to "place it where it covers least": nothing on the stage
 * is left for it to compete with for space.
 *
 * Rather than hand-picking one of the four anchors, this feeds
 * `bubblePlacement` a ZERO-AREA rect centred on `PLAZA_CENTRE`: `overlapArea`
 * against a `w: 0, h: 0` target is exactly zero by construction for every
 * candidate (an empty rectangle intersects nothing), so its `clear` branch
 * picks the FIRST anchor in `BUBBLE_ANCHORS` order that still fits the
 * stage — `'above-left'`, the same single position this bubble shipped with
 * before the four-anchor system existed at all (`bubblePlacement`'s own
 * header). Reusing the real function, rather than hardcoding that anchor
 * name here, keeps this placement automatically correct if `BUBBLE_ANCHORS`
 * or the stage geometry ever change.
 */
export function finaleBubblePlacement(): BubbleBox {
  return bubblePlacement({ x: PLAZA_CENTRE.x, y: PLAZA_CENTRE.y, w: 0, h: 0 })
}
