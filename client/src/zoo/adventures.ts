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
  SECTOR_ADVENTURE_ART,
  ZOO_ANIMAL_ART,
  ZOO_OCTOPUS_PRINT_ART,
} from '../detective/assets'
import { animalPlacements, type Records, type SectorId, type ZooSector } from './sectors'

/** One id per adventure — the key `zoo/backdrops.ts`'s registry now uses,
 *  and what lets `montañas` carry two adventures where every earlier sector
 *  carried at most one. `glass`/`sand`/`night` are the entrance and the
 *  night sector (design.md §5, §6.1) — none of the three recovers an
 *  animal, which is what `AdventureSubject` below exists to represent. */
export type AdventureId =
  | 'duck'
  | 'sheep'
  | 'llama'
  | 'glass'
  | 'sand'
  | 'night'
  | 'snake'
  | 'bee'
  | 'dolphin'
  | 'hedgehog'

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
   *  §6.2). Distinct from `closing` above, which is the map bubble's
   *  one-line label and stays exactly what it is: a caption cannot carry a
   *  transformation. ABSENT = no closing screen, which is every shipped row
   *  that predates this change — finishing the duck, sheep or llama
   *  adventure behaves byte-for-byte as it does today. */
  closingBeat?: { line: string; art: ArtImage }
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
  },
  {
    id: 'sheep',
    levelIds: ['sheep-hill1', 'sheep-hill2', 'sheep-hill3', 'sheep-hill4'],
    sector: 'montanas',
    animal: 'oveja',
    intro: 'Las ovejas se escaparon por la ladera. ¿Las juntamos?',
    closing: '¡Juntamos las ovejas! Ya están en su ladera.',
  },
  {
    id: 'llama',
    levelIds: ['llama-peak1', 'llama-peak2', 'llama-peak3', 'llama-peak4'],
    sector: 'montanas',
    animal: 'llama',
    intro: 'Las llamas están en los picos. ¿Subimos a buscarlas?',
    closing: '¡Encontramos a la llama! Ya está en la cumbre.',
  },
  // The entrance's two adventures (design.md §5.2, §6.1). Neither recovers
  // an animal — `icon` carries the picture that travels with their two
  // lines instead.
  {
    id: 'glass',
    levelIds: ['glass1', 'glass2', 'glass3', 'glass4'],
    sector: 'entrada',
    icon: CARRIER_LENS_ART,
    intro: 'El vidrio de la pecera está todo sucio. ¿Lo limpiamos?',
    closing: 'El vidrio quedó limpito.',
    // No closingBeat — the entrance's story closes at sand4, not here
    // (design.md §6.2, proposal question 2's assumption, adopted).
  },
  {
    id: 'sand',
    levelIds: ['sand1', 'sand2', 'sand3', 'sand4'],
    sector: 'entrada',
    // "Las huellas siguen por la arena" — the map's own onward symbol reads
    // on sand (design.md §6.1).
    icon: ZOO_OCTOPUS_PRINT_ART,
    intro: 'Ahora barremos la arena de la entrada. ¿Vamos?',
    closing: 'La entrada quedó reluciente.',
    closingBeat: {
      line: '¡Se fueron todos los animales! Agarrá la lupa: los vamos a buscar.',
      art: CARRIER_LENS_ART,
    },
  },
  {
    id: 'night',
    levelIds: ['night1', 'night2', 'night3', 'night4'],
    sector: 'nocturna',
    icon: SECTOR_ADVENTURE_ART.flashlight,
    intro: 'De noche hay cosas escondidas. ¿Las buscamos con la luz?',
    closing: 'Encontramos todo en la oscuridad.',
    // No `closingBeat` — [corrected] design.md §6.2's own literal assigns
    // one here, but that directly contradicts the RATIFIED `main-screen`
    // spec delta's "close GameView Variant and resolveCloseAction"
    // requirement, which explicitly scopes the close screen to "the
    // entrance's sand adventure, ending on sand4" and lists `night` BY
    // NAME among the adventures that must resolve to the ordinary exit
    // outcome instead — confirmed by `resolveCloseAction`'s own generic,
    // unconditional implementation (design.md §6.3: any `closingBeat`
    // triggers it) and by tasks.md's own task 6.5 scenario list
    // (`resolveCloseAction('night4', …)` MUST return `null`). Both the
    // spec and the task list agree against design.md's data table here;
    // see `apply-progress.md`'s Phase 6 section for the full finding. The
    // linterna is still granted on `night4` through `zoo/backpack.ts`'s
    // `earnedWhen`, entirely independent of any closing screen.
  },
  {
    id: 'snake',
    levelIds: ['snake1', 'snake2', 'snake3', 'snake4'],
    sector: 'arena',
    animal: 'vibora',
    intro: 'Las víboras se enredaron en la arena. ¿Las ordenamos y las llevamos a su lugar?',
    closing: '¡Las víboras están en su arena!',
    // No `closingBeat` — `mapBubble`'s own selector filters on
    // `a.animal !== undefined`, so ANY adventure that recovers an animal
    // already carries `docs/13` §5 item 6 through the shipped map bubble
    // the moment its animal is placed (design.md §7.2): the víbora stands
    // in the arena and the Pulpito's line closes it, exactly as the duck,
    // the sheep and the llama do — none of which carries a `closingBeat`
    // either. The once-per-story closing screen stays reserved for the
    // entrance's sand adventure, which recovers no animal.
  },
  {
    id: 'bee',
    levelIds: ['bee1', 'bee2', 'bee3', 'bee4'],
    sector: 'bosque',
    animal: 'abeja',
    intro: 'La abeja se perdió entre las flores. ¿La ayudamos a volver al panal?',
    closing: '¡La abeja volvió a su panal!',
    // No `closingBeat` — the snake row's own reasoning, restated: any
    // adventure that recovers an animal already carries `docs/13` §5 item 6
    // through the shipped map bubble the moment its animal is placed. The
    // once-per-story closing screen stays reserved for the entrance's sand
    // adventure, which recovers no animal.
  },
  {
    id: 'dolphin',
    levelIds: ['dolphin1', 'dolphin2', 'dolphin3', 'dolphin4'],
    sector: 'estanque',
    animal: 'delfin',
    intro: 'Los delfines saltan en fila. ¿Pasamos entre ellos sin tocarlos?',
    closing: '¡Pasamos entre los delfines! Ya están tranquilos en el estanque.',
    // No `closingBeat` — the snake/bee rows' own reasoning, restated:
    // `mapBubble`'s filter is `a.animal !== undefined`, so an
    // animal-recovering adventure already carries `docs/13` §5 item 6
    // through the shipped map bubble the moment its animal is placed. The
    // once-per-story closing screen stays reserved for the entrance's sand
    // adventure, which recovers no animal. Appended at the END of the
    // registry, matching every prior row (C-H each added one entry here) —
    // and `mapBubble`'s `.at(-1)` needs `dolphin` only to come AFTER `duck`
    // in array order for filing `dolphin4` to surface its own closing line
    // over the duck's, which appending trivially satisfies.
  },
  {
    id: 'hedgehog',
    levelIds: ['hedgehog1', 'hedgehog2', 'hedgehog3', 'hedgehog4'],
    sector: 'nocturna',
    animal: 'erizo',
    intro: 'Al erizo le faltan las espinas. ¿Se las dibujamos?',
    closing: '¡El erizo tiene todas sus espinas!',
    // No `closingBeat` — the snake/bee/dolphin rows' own reasoning,
    // restated: `mapBubble`'s filter is `a.animal !== undefined`, so an
    // animal-recovering adventure already carries `docs/13` §5 item 6
    // through the shipped map bubble the moment its animal is placed. The
    // once-per-story closing screen stays reserved for the entrance's sand
    // adventure, which recovers no animal. Appended at the END of the
    // registry (amendment 9's rule for `ADVENTURES` — only relative order
    // matters here, unlike `catalog.ts`'s real ascending-phase ordering
    // constraint, design.md §2 D6).
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
 *  own last level, and for an adventure with no `closingBeat` at all
 *  (today `duck`/`sheep`/`llama`/`glass`, every shipped row). */
export function closingLevel(levelId: string): Adventure | undefined {
  const adventure = adventureFor(levelId)
  if (!adventure || !adventure.closingBeat) return undefined
  return adventure.levelIds[adventure.levelIds.length - 1] === levelId ? adventure : undefined
}

/** What the Pulpito says about the sector the huellas point at, and the
 *  picture that goes with it — the word never travels alone (`docs/12`
 *  §3). Before the sector's own adventure is done, the constant
 *  onward-pointing line the map already shipped; once the adventure's
 *  animal is standing in the zoo, the line CLOSES it instead
 *  (`docs/13` §5 item 6) and the picture becomes the recovered animal. */
const ONWARD = {
  art: ZOO_OCTOPUS_PRINT_ART,
  label: '¡Mirá! Las huellas van hacia allá. ¿Vamos?',
} as const

export function mapBubble(
  sector: ZooSector,
  records: Records,
): { art: ArtImage; label: string } {
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
