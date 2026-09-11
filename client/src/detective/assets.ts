// Typed raster-asset registry (`detective-mode` design unit 3, spec:
// detective-mode "Colour Asset Registry"; design.md "Decision: assets behind
// a typed registry with origin-centred art").
//
// WHY THIS IS RASTER AND NOT SVG. `docs/09_GUIA_DE_ESTILO_VISUAL.md` section 3
// asked for vector art, and the placeholders this file used to hold were `d`
// path strings for exactly that reason. What the author actually delivered is
// multi-colour PNGs with soft shading and specular highlights — the droplet's
// and the lamp's glass both read as glass because of a gradient-ish highlight
// that a two-tone silhouette destroys. This host has no potrace, no Pillow and
// no ImageMagick (see `scripts/art/build_art.py`'s header), and no available
// tool could vectorise those images without throwing away the thing that makes
// them work. So the art ships as raster, and section 3 is amended rather than
// faked.
//
// `<image href="...">` is the one mechanism that survives this repo's `url(#)`
// ban (scarred at `client/src/canvas/TraceCanvas.tsx:63-84`): it needs no
// `<defs>`, no `<pattern>`, no `<clipPath>` and no id to resolve against the
// document base URL. The precedent is `client/src/modes/StarFeedback.tsx:13-22`
// — a root-absolute path into `public/`, never through Vite's asset pipeline.
//
// The files come from `scripts/art/build_art.py`, which derives everything in
// `client/public/art/` from `art-source/` and emits `manifest.json` beside it.
// The `w`/`h` below are COPIED from that manifest rather than read at runtime:
// this module renders under `renderToString` in the node test env and in the
// browser alike, and neither should have to fetch JSON to know how big a
// footprint is. `artManifest.test.ts` is the guard that the copy has not
// drifted from the pipeline.
import { POND, KERNEL, PRINT, PLUME } from './palette'

/** One art per trail theme. Each trail owns exactly one kind, and — per the
 * palette — exactly one earned colour. */
export type ClueKind = 'droplet' | 'corn' | 'footprint' | 'feather'

/** One art per deduction-screen animal choice (design unit 7). */
export type AnimalId = 'gallina' | 'pato' | 'vaca' | 'gato'

/** A derived raster from `client/public/art/`, with its intrinsic pixel size
 * so a caller can hold aspect while scaling to a target height.
 *
 * `href` is root-absolute (`/art/…`) because nothing in this repo goes through
 * Vite's asset pipeline; `w`/`h` are the shipped file's real pixel dimensions,
 * mirrored from `manifest.json`. A caller that wants a mark `size` units tall
 * computes its width as `size * w / h` — the registry never guesses a render
 * size, because the same picture is 28 units on the sheet and 64px in the
 * lineup. */
export interface ArtImage {
  href: string
  w: number
  h: number
}

export interface ClueArt {
  /** The trail's registered earned COLOUR. Still a token even though the mark
   * now renders as raster: the rail's socket and every palette rule reason
   * about the colour, not the picture. It is also what `build_art.py`
   * recolours the earned raster TO, so the token and the pixels agree by
   * construction rather than by eye. */
  earned: string
  /** The two states of the mark. `drained` is the shared `CLUE_DRAINED` grey
   * silhouette, `earned` the same silhouette in the trail's own colour —
   * derived from one source so the pair can never drift. */
  art: { earned: ArtImage; drained: ArtImage }
}

export const CLUE_ART: Readonly<Record<ClueKind, ClueArt>> = {
  droplet: {
    earned: POND,
    art: {
      earned: { href: '/art/clue-droplet-earned.png', w: 195, h: 256 },
      drained: { href: '/art/clue-droplet-drained.png', w: 195, h: 256 },
    },
  },
  corn: {
    earned: KERNEL,
    art: {
      earned: { href: '/art/clue-corn-earned.png', w: 195, h: 256 },
      drained: { href: '/art/clue-corn-drained.png', w: 195, h: 256 },
    },
  },
  footprint: {
    earned: PRINT,
    art: {
      earned: { href: '/art/clue-footprint-earned.png', w: 220, h: 256 },
      drained: { href: '/art/clue-footprint-drained.png', w: 217, h: 256 },
    },
  },
  feather: {
    earned: PLUME,
    art: {
      earned: { href: '/art/clue-feather-earned.png', w: 103, h: 256 },
      drained: { href: '/art/clue-feather-drained.png', w: 102, h: 256 },
    },
  },
}

/**
 * The lineup. `gallina` is the culprit: water, corn, three-toed prints and
 * feathers all point at her, so she carries no `ruledOutBy`.
 *
 * Each distractor is ruled out by exactly ONE clue, so every clue the child
 * collected does real work in the deduction:
 *
 * - `pato` by the FOOTPRINT — webbed, not three splayed toes.
 * - `vaca` by the FEATHER — no feathers.
 * - `gato` by the CORN — a cat does not eat it.
 *
 * The droplet rules out nobody, on purpose: every animal drinks. A child
 * learning to reason should meet a clue that establishes presence without
 * narrowing the field, otherwise "there was a clue" and "it was decisive"
 * collapse into the same idea.
 *
 * These four keep their AUTHORED colours — they are the one place the guide's
 * "colour is the reward" rule is not in force, because the animals ARE the
 * answer (`build_art.py`'s `SINGLES` table records the same reasoning).
 */
export const ANIMAL_ART: Readonly<
  Record<AnimalId, { art: ArtImage; ruledOutBy: ClueKind | null }>
> = {
  gallina: {
    art: { href: '/art/animal-gallina.png', w: 370, h: 448 },
    ruledOutBy: null,
  },
  pato: {
    art: { href: '/art/animal-pato.png', w: 368, h: 448 },
    ruledOutBy: 'footprint',
  },
  vaca: {
    art: { href: '/art/animal-vaca.png', w: 448, h: 405 },
    ruledOutBy: 'feather',
  },
  gato: {
    art: { href: '/art/animal-gato.png', w: 448, h: 414 },
    ruledOutBy: 'corn',
  },
}

/** The animal the four clues actually identify. */
export const CULPRIT: AnimalId = 'gallina'

/** The magnifying glass that rides the child's fingertip on a detective trail
 * (`TraceCanvas`'s `carrierArt` override).
 *
 * Authored standalone, and padded by `build_art.py`'s `CENTRED` step so the
 * image's centre is the LENS rather than the bounding box. That padding is why
 * this is taller than it looks on screen: a caller scales by `h`, and roughly
 * the outer quarter of the canvas is deliberate transparent margin balancing
 * the handle. Size the carrier by what the lens should measure, not by what
 * the file measures. */
export const CARRIER_LENS_ART: ArtImage = {
  href: '/art/carrier-lens.png',
  w: 361,
  h: 384,
}

/** The octopus holding the glass — the child's own presence in the world.
 * Stands at the route's first point while the glass travels with the finger
 * (`LevelPlay`'s `startArt`). */
export const OCTOPUS_ART: ArtImage = {
  href: '/art/carrier-octopus.png',
  w: 384,
  h: 353,
}

/** The single light source (design.md "Colour — the reward system"), used both
 * in the rail and standing at the end of the route.
 *
 * BOTH states derive from the LIT drawing — `on` recoloured to `palette.ts`'s
 * `LAMP`, `off` to `CLUE_DRAINED` — which is why they share a size. The unlit
 * source was a bare silhouette with no contour, and a flat grey recolour of it
 * measured as very nearly invisible against the corridor's earth. Same
 * silhouette both ways also makes the swap read as this lamp LIGHTING UP
 * rather than as one shape being replaced by another. */
export const LAMP_ART: { on: ArtImage; off: ArtImage } = {
  on: { href: '/art/lamp-on.png', w: 181, h: 192 },
  off: { href: '/art/lamp-off.png', w: 181, h: 192 },
}

/** Ground scatter marks, biggest first. Cut out of one authored tile field by
 * `build_art.py`'s `SCATTERS` step: the engine cannot TILE a texture, because
 * tiling needs `<pattern>` + `fill="url(#id)"` and confining one to the
 * corridor needs `<clipPath>` — both sit under this repo's `url(#)` ban. So
 * the ground is scattered as individual `<image>` marks the same way clue
 * marks already are. Consumed by a later slice; exported here so the registry
 * stays the single place art enters the app. */
export const GROUND_GRASS: readonly ArtImage[] = [
  { href: '/art/ground-grass-1.png', w: 84, h: 125 },
  { href: '/art/ground-grass-2.png', w: 124, h: 105 },
  { href: '/art/ground-grass-3.png', w: 77, h: 125 },
  { href: '/art/ground-grass-4.png', w: 126, h: 87 },
  { href: '/art/ground-grass-5.png', w: 126, h: 104 },
  { href: '/art/ground-grass-6.png', w: 124, h: 79 },
  { href: '/art/ground-grass-7.png', w: 126, h: 79 },
  { href: '/art/ground-grass-8.png', w: 78, h: 126 },
  { href: '/art/ground-grass-9.png', w: 126, h: 69 },
  { href: '/art/ground-grass-10.png', w: 121, h: 110 },
  { href: '/art/ground-grass-11.png', w: 87, h: 127 },
  { href: '/art/ground-grass-12.png', w: 126, h: 109 },
]

export const GROUND_MUD: readonly ArtImage[] = [
  { href: '/art/ground-mud-1.png', w: 126, h: 98 },
  { href: '/art/ground-mud-2.png', w: 127, h: 107 },
  { href: '/art/ground-mud-3.png', w: 126, h: 112 },
  { href: '/art/ground-mud-4.png', w: 117, h: 98 },
  { href: '/art/ground-mud-5.png', w: 121, h: 78 },
  { href: '/art/ground-mud-6.png', w: 68, h: 64 },
  { href: '/art/ground-mud-7.png', w: 60, h: 59 },
  { href: '/art/ground-mud-8.png', w: 62, h: 56 },
]
