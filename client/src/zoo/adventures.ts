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
import { animalPlacements, PLAZA_CENTRE, type Records, type Rect, type SectorId, type ZooSector } from './sectors'

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
   *  from `closing` above, which is the map bubble's one-line label and
   *  stays exactly what it is: a caption cannot carry a transformation.
   *  ABSENT = no closing screen — `duck`/`sheep`/`llama`, unchanged by this
   *  field's shape change. A non-empty TUPLE, not `ClosingBeat[]`: an empty
   *  array is truthy, and `closingLevel`'s `if (!adventure.closingBeat)`
   *  guard needs the empty case unrepresentable to stay byte-unchanged. */
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
 *  (today `duck`/`sheep`/`llama`, every shipped row). */
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
