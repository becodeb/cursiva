// The detective's notebook registry (`odd/tasks/prewriting-stage-completion.md`
// T23, `docs/19_PROPUESTA_HISTORIA_Y_MECANICAS.md` §5.1/§5.3): "una figurita
// en la libreta del detective: el animal a color [...]. Los que faltan, en
// silueta con '?'". Pure derivation over `zoo/sectors.ts`'s own registry — no
// React, the same convention `zoo/stars.ts`/`zoo/backpack.ts` already follow,
// so `screen/DetectiveNotebook.tsx` only reads this and draws.
//
// Deliberately does NOT introduce a second list of "every recoverable
// animal": `ZooSector.animals` (`zoo/sectors.ts`) already names every one —
// `gallina`/`vaca`/`gato` (the deduction lineup's own decoys, `AnimalId`) are
// correctly absent here because no sector's `animals` array ever places them
// (they are never "recovered", only ruled out on a deduction screen).
import {
  ZOO_ANIMAL_ART,
  ZOO_ANIMAL_SILHOUETTE_ART,
  type ArtImage,
  type ZooAnimalId,
} from '../detective/assets'
import { isFiled, SECTORS, type Records } from './sectors'

interface AnimalCopy {
  /** Short caption under the coloured picture, once rescued — "el animal a
   *  color [...] su lugar" (§5.1). Deliberately its own short phrase here
   *  rather than parsed out of `zoo/adventures.ts`'s own `closing` sentence
   *  ("¡Encontramos al pato! Ya está en su laguna.") — that sentence is a
   *  celebratory line for the closing SCREEN, not a standalone caption, and
   *  parsing one out of the other would tie this notebook to a sentence
   *  shape it does not own (and, for `erizo`, to the `night`/`hedgehog` rows
   *  this task's own boundary leaves untouched). */
  spot: string
  /** The line `DetectiveNotebook` may speak when a rescued animal's own
   *  cell is tapped (optional, per this task's own brief) — matches the
   *  adventure's own `closing` line in every case that has shipped one, but
   *  is an independent copy for the same reason `spot` is. */
  line: string
}

const ANIMAL_COPY: Readonly<Partial<Record<ZooAnimalId, AnimalCopy>>> = {
  pato: { spot: 'en su laguna', line: '¡Encontramos al pato! Ya está en su laguna.' },
  oveja: { spot: 'en su ladera', line: '¡Juntamos las ovejas! Ya están en su ladera.' },
  llama: { spot: 'en la cumbre', line: '¡Encontramos a la llama! Ya está en la cumbre.' },
  vibora: { spot: 'en la arena', line: '¡Las víboras recuperaron su color!' },
  abeja: { spot: 'en su panal', line: '¡La abeja volvió a su panal!' },
  delfin: {
    spot: 'en el estanque',
    line: '¡Pasamos entre los delfines! Ya están tranquilos en el estanque.',
  },
  erizo: { spot: 'con sus espinas', line: '¡El erizo tiene todas sus espinas!' },
  pez: { spot: 'en su pecera', line: '¡Encontramos a los peces! Ya volvieron a su pecera.' },
  tortuga: { spot: 'en su recinto', line: '¡Encontramos a las tortugas! Ya volvieron a su recinto.' },
  mono: { spot: 'en sus sogas', line: '¡Encontramos a los monos! Ya volvieron a sus sogas.' },
}

/** Every animal any sector can stand, keyed by id, with the level ids that
 *  make it appear (`ZooSector.animals[].appearsWhen`) — built once from
 *  `SECTORS` at module load, the same "derive from the one registry that
 *  already owns this fact" rule `zoo/backpack.ts`'s own `earnedItems`
 *  follows for its own ids. */
const ANIMAL_APPEARANCE: ReadonlyMap<ZooAnimalId, readonly string[]> = new Map(
  SECTORS.flatMap((sector) => sector.animals.map((animal) => [animal.id, animal.appearsWhen] as const)),
)

/** Every animal the notebook shows a page for, in `SECTORS`' own order (the
 *  same order the map itself draws them in) — today: `pez`, `tortuga`,
 *  `mono`, `abeja`, `pato`, `delfin`, `oveja`, `llama`, `vibora`, `erizo`.
 *  `gallina`/`vaca`/`gato` never appear (see this module's own header). */
export const NOTEBOOK_ANIMAL_IDS: readonly ZooAnimalId[] = Array.from(ANIMAL_APPEARANCE.keys())

/** Whether `id` is standing in the zoo right now — the exact same test
 *  `zoo/sectors.ts`'s own `animalPlacements` applies per sector, restated
 *  over the flattened `ANIMAL_APPEARANCE` map so a caller can ask about one
 *  animal without re-walking every sector. */
export function isAnimalRescued(id: ZooAnimalId, records: Records): boolean {
  const appearsWhen = ANIMAL_APPEARANCE.get(id)
  return !!appearsWhen && appearsWhen.length > 0 && appearsWhen.every((levelId) => isFiled(records, levelId))
}

/** The tallest a notebook cell's own picture may render (`CaptionedArt`'s
 *  `size`, a HEIGHT). */
const NOTEBOOK_ART_MAX_HEIGHT = 64
/** The widest a notebook cell's own picture may render — `vibora`'s art
 *  (`sector-snake-medium.png`, 492×114) is a long, low body: at the plain
 *  64px height every other animal uses, its width comes out to ~276px,
 *  which overflowed its own grid cell (found in browser QA, not by any
 *  pure test — the SSR harness never measures rendered pixel width). */
const NOTEBOOK_ART_MAX_WIDTH = 84

/** The HEIGHT `CaptionedArt` should render `art` at inside one notebook
 *  cell — `NOTEBOOK_ART_MAX_HEIGHT`, further reduced for a WIDE image so
 *  its rendered WIDTH never exceeds `NOTEBOOK_ART_MAX_WIDTH` either. Pure
 *  and exported so the cap itself is directly testable without a browser
 *  measuring anything. */
export function notebookArtSize(art: Pick<ArtImage, 'w' | 'h'>): number {
  return Math.min(NOTEBOOK_ART_MAX_HEIGHT, (NOTEBOOK_ART_MAX_WIDTH * art.h) / art.w)
}

export interface NotebookAnimalEntry {
  id: ZooAnimalId
  rescued: boolean
  /** Colour art once rescued; a derived silhouette (`ANIMAL_SILHOUETTE_ART`
   *  via `ZOO_ANIMAL_SILHOUETTE_ART`, `scripts/art/build_art.py`) while
   *  missing — never the coloured art, which would give the animal away. */
  art: ArtImage
  /** The rendered height `DetectiveNotebook` should pass to `CaptionedArt`
   *  for `art` — see `notebookArtSize`'s own header. */
  size: number
  /** The word under the picture — `spot` once rescued, a bare `'?'` while
   *  missing (§5.1: "en silueta con '?'"). Always non-empty:
   *  `CaptionedArt.label` is required at type level. */
  caption: string
  /** The line `DetectiveNotebook` may speak on tap; `null` while missing —
   *  there is nothing to say yet about an animal not yet found. */
  line: string | null
}

export function notebookEntries(records: Records): readonly NotebookAnimalEntry[] {
  return NOTEBOOK_ANIMAL_IDS.map((id) => {
    const rescued = isAnimalRescued(id, records)
    const copy = ANIMAL_COPY[id]
    const art = rescued ? ZOO_ANIMAL_ART[id] : (ZOO_ANIMAL_SILHOUETTE_ART[id] ?? ZOO_ANIMAL_ART[id])
    return {
      id,
      rescued,
      art,
      size: notebookArtSize(art),
      caption: rescued ? (copy?.spot ?? '') : '?',
      line: rescued ? (copy?.line ?? null) : null,
    }
  })
}
