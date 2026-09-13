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
import { POND, KERNEL, PRINT, PLUME, BREADCRUMB, BUBBLE } from './palette'

/** One art per trail theme. Each theme owns exactly one kind; distinctness of
 * its earned colour is now scoped PER CASE (`palette.test.ts`,
 * `detective/cases.ts`'s `clueKindsOf`), not globally — `webfoot` and
 * `footprint` both render `PRINT`, and that is legal because they never
 * appear in the same case (design.md §4). */
export type ClueKind =
  | 'droplet'
  | 'corn'
  | 'footprint'
  | 'feather'
  | 'webfoot'
  | 'breadcrumb'
  | 'bubble'

/** One art per deduction-screen animal choice (design unit 7). */
export type AnimalId = 'gallina' | 'pato' | 'vaca' | 'gato'

/** Every animal the ZOO can stand — a superset of {@link AnimalId}, which is
 * the deduction screen's exhaustive answer set and is NOT widened here
 * (`docs/13` §4 decision 1: the deduction is paused, not revived). */
export type ZooAnimalId = AnimalId | 'oveja' | 'llama'

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
  /**
   * Where this picture is HELD, as a fraction of its own box — the same shape
   * `canvas/placeArt.ts` (design.md §7) reads and `home/modes.ts` used to
   * duplicate as its own `HomeMode.grip`. Absent means the box's own centre,
   * which is right for a caption or a clue mark but wrong for anything held
   * by one specific point rather than drawn whole. Optional on purpose: only
   * `CARRIER_LENS_ART` declares one today.
   */
  grip?: readonly [number, number]
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
  // Duck case only (design.md §4). `webfoot` reuses `PRINT` on purpose — a
  // print in the earth has no colour of its own, the same material argument
  // `footprint` already makes, and the two never appear in the same case.
  webfoot: {
    earned: PRINT,
    art: {
      earned: { href: '/art/clue-webfoot-earned.png', w: 256, h: 230 },
      drained: { href: '/art/clue-webfoot-drained.png', w: 256, h: 230 },
    },
  },
  breadcrumb: {
    earned: BREADCRUMB,
    art: {
      earned: { href: '/art/clue-breadcrumb-earned.png', w: 256, h: 237 },
      drained: { href: '/art/clue-breadcrumb-drained.png', w: 256, h: 237 },
    },
  },
  bubble: {
    earned: BUBBLE,
    art: {
      earned: { href: '/art/clue-bubble-earned.png', w: 256, h: 255 },
      drained: { href: '/art/clue-bubble-drained.png', w: 256, h: 255 },
    },
  },
}

/**
 * The lineup art. Each animal's own picture only — WHO is ruled out by WHAT
 * is no longer a fact about the animal, it is a fact about the CASE
 * (`case-registry-and-captions` design.md §1, spec: detective-mode "Case
 * Registry Data Shape"). The hen is a cleared distractor in the duck's case
 * and the culprit in her own; a global `ruledOutBy` on this record could not
 * represent both, so it moved to `DetectiveCase.ruledOutBy`
 * (`detective/cases.ts`), and the module-level `CULPRIT` constant that used
 * to name a single animal for the whole app is gone with it — every consumer
 * now reads `DetectiveCase.culprit` for its own case.
 *
 * These four keep their AUTHORED colours — they are the one place the guide's
 * "colour is the reward" rule is not in force, because the animals ARE the
 * answer (`build_art.py`'s `SINGLES` table records the same reasoning).
 */
export const ANIMAL_ART: Readonly<Record<AnimalId, ArtImage>> = {
  gallina: { href: '/art/animal-gallina.png', w: 370, h: 448 },
  pato: { href: '/art/animal-pato.png', w: 368, h: 448 },
  vaca: { href: '/art/animal-vaca.png', w: 448, h: 405 },
  gato: { href: '/art/animal-gato.png', w: 448, h: 414 },
}

/** The magnifying glass that rides the child's fingertip on a detective trail
 * (`TraceCanvas`'s `carrierArt` override).
 *
 * [Corrected, case-registry-and-captions Phase 8] Authored standalone, and
 * `build_art.py`'s `centre_on()` step DOES pad it so the image's centre is
 * the lens rather than the bounding box — but `emit()` then crops every
 * output back to its alpha bounding box, which removes exactly that padding
 * again. The correction is applied and unconditionally undone: the shipped
 * file's lens sits at `grip` below, not at (0.5, 0.5). `canvas/placeArt.ts`
 * is what reads this fact now — the same source of truth `home/modes.ts`'s
 * lamp-lit arm uses, so a trail and the home office can never place the lens
 * differently. */
export const CARRIER_LENS_ART: ArtImage = {
  href: '/art/carrier-lens.png',
  w: 361,
  h: 384,
  // Measured on the shipped file (design.md §7's own worked measurement) —
  // this is a fact about the PICTURE, never about the arm that holds it or
  // the finger that carries it.
  grip: [0.603, 0.391],
}

/** The octopus holding the glass — the child's own presence in the world.
 * Stands at the route's first point while the glass travels with the finger
 * (`LevelPlay`'s `startArt`). */
export const OCTOPUS_ART: ArtImage = {
  href: '/art/carrier-octopus.png',
  w: 384,
  h: 353,
}

/** Full-canvas zoo journey map. Unlike the cutout art, this stays opaque and
 * ships at its authored 1536x1024 resolution so it can fill the scene without
 * a second raster transform. */
export const ZOO_MAP_ART: ArtImage = {
  href: '/art/zoo-map.png',
  w: 1536,
  h: 1024,
}

/** The three fog silhouettes cleared during the zoo journey. */
export const ZOO_FOG_ART: readonly [ArtImage, ArtImage, ArtImage] = [
  { href: '/art/zoo-fog-1.png', w: 495, h: 155 },
  { href: '/art/zoo-fog-2.png', w: 343, h: 479 },
  { href: '/art/zoo-fog-3.png', w: 474, h: 424 },
]

/** Zoo journey character and reward/cue cutouts. */
export const ZOO_OCTOPUS_BACKPACK_ART: ArtImage = {
  href: '/art/zoo-octopus-backpack.png',
  w: 442,
  h: 448,
}

export const ZOO_BACKPACK_ART: ArtImage = {
  href: '/art/zoo-backpack.png',
  w: 238,
  h: 256,
}

export const ZOO_STAR_ART: ArtImage = {
  href: '/art/zoo-star.png',
  w: 255,
  h: 244,
}

export const ZOO_OCTOPUS_PRINT_ART: ArtImage = {
  href: '/art/zoo-octopus-print.png',
  w: 134,
  h: 256,
}

export const ZOO_SPEECH_BUBBLE_ART: ArtImage = {
  href: '/art/zoo-speech-bubble.png',
  w: 488,
  h: 372,
}

/** Full-canvas sectors are scenery rather than sprites: callers preserve their
 * 3:2 intrinsic coordinate system and leave the quiet centre free for a
 * finger-drawn route. */
export const SECTOR_BACKGROUND_ART: Readonly<Record<
  'lagoon' | 'sand' | 'slope' | 'range' | 'forest' | 'aquarium' | 'night',
  ArtImage
>> = {
  lagoon: { href: '/art/sector-lagoon-background.png', w: 1536, h: 1024 },
  sand: { href: '/art/sector-sand-background.png', w: 1536, h: 1024 },
  slope: { href: '/art/sector-slope-background.png', w: 1536, h: 1024 },
  range: { href: '/art/sector-range-background.png', w: 1536, h: 1024 },
  forest: { href: '/art/sector-forest-background.png', w: 1536, h: 1024 },
  aquarium: { href: '/art/sector-aquarium-background.png', w: 1536, h: 1024 },
  // Derived from `fondo bosque.png` by `nightfall()` (design.md §3.2) — a
  // full-canvas opaque scene like every other row here, same 1536x1024.
  night: { href: '/art/sector-night-background.png', w: 1536, h: 1024 },
}

/** Props used by the sector adventures. Each file is a transparent cutout;
 * the snakes intentionally share a body thickness and differ only in length. */
export const SECTOR_ADVENTURE_ART: Readonly<Record<
  | 'snakeSmall'
  | 'snakeMedium'
  | 'snakeLarge'
  | 'llama'
  | 'sheep'
  | 'bee'
  | 'flower'
  | 'honeycomb'
  | 'dolphin'
  | 'snail'
  | 'flashlight',
  ArtImage
>> = {
  snakeSmall: { href: '/art/sector-snake-small.png', w: 480, h: 98 },
  snakeMedium: { href: '/art/sector-snake-medium.png', w: 492, h: 114 },
  snakeLarge: { href: '/art/sector-snake-large.png', w: 500, h: 95 },
  llama: { href: '/art/sector-llama.png', w: 299, h: 448 },
  // Row C (docs/13 §8): the sheep standing on the sheep-hill ridge peaks.
  // `w` is measured off `manifest.json`'s `sector-sheep` entry (`h`, 448, is
  // the pipeline's target height, held fixed by `build_art.py`'s `SINGLES`).
  sheep: { href: '/art/sector-sheep.png', w: 420, h: 448 },
  bee: { href: '/art/sector-bee.png', w: 256, h: 230 },
  flower: { href: '/art/sector-flower.png', w: 256, h: 245 },
  honeycomb: { href: '/art/sector-honeycomb.png', w: 181, h: 256 },
  dolphin: { href: '/art/sector-dolphin.png', w: 448, h: 418 },
  snail: { href: '/art/sector-snail.png', w: 448, h: 321 },
  flashlight: { href: '/art/sector-flashlight.png', w: 256, h: 234 },
}

/** `ZOO_ANIMAL_ART` resolves every {@link ZooAnimalId} — spreading
 * `ANIMAL_ART` preserves referential identity for every existing entry, so
 * `mapBubble`'s art-reference comparisons keep working for the duck. */
export const ZOO_ANIMAL_ART: Readonly<Record<ZooAnimalId, ArtImage>> = {
  ...ANIMAL_ART,
  oveja: SECTOR_ADVENTURE_ART.sheep,
  llama: SECTOR_ADVENTURE_ART.llama,
}

/** Hedgehog drawing activities: the two poses stay separate so the child can
 * draw spikes on a side-on body or recognise the same animal curled up. */
export const HEDGEHOG_ART: Readonly<Record<'profile' | 'curled', ArtImage>> = {
  profile: { href: '/art/hedgehog-profile.png', w: 448, h: 306 },
  curled: { href: '/art/hedgehog-curled.png', w: 412, h: 407 },
}

/** A front-facing Andean wool hat icon for the mountain activity. */
export const ANDEAN_HAT_ART: ArtImage = {
  href: '/art/andean-hat.png',
  w: 216,
  h: 256,
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

/** The home screen's octopus: whole body, eight arms open, holding NOTHING
 * (`docs/10_HOME_LA_OFICINA_DEL_PULPO.md` §6.1).
 *
 * Deliberately a different file from {@link OCTOPUS_ART}, which is the same
 * character already gripping the glass and is what stands at a trail's start.
 * The home needs the empty-handed version for one architectural reason, §5's:
 * every future mode is an OBJECT placed on a free arm, so there is exactly one
 * drawing of the octopus and the objects are composed onto it. The alternative
 * — one octopus drawing per mode combination — does not survive the second
 * mode. */
export const HOME_OCTOPUS_ART: ArtImage = {
  href: '/art/home-octopus.png',
  w: 448,
  h: 399,
}

/** The detective's desk, in front of the octopus (`docs/10` §3). Scenery: it
 * gives the screen a PLACE without competing with the character, which is why
 * it is drawn empty — anything on the desktop would read as a second thing to
 * touch. Wide and low (512x242), so a caller sizes it by WIDTH and lets the
 * legs run off the bottom of the canvas rather than squashing it. */
export const HOME_DESK_ART: ArtImage = {
  href: '/art/home-desk.png',
  w: 512,
  h: 242,
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

/** Stands where a Nivel 3 route ends, in place of the engine's two hollow
 * diamonds and the case lamp (`LevelConfig.goalArt`, design.md §5). Keeps its
 * authored FILL — a living thing in the world, not a clue mark — the same
 * reasoning `ANIMAL_ART` and `OCTOPUS_ART` above record.
 *
 * Its CONTOUR is a different story: the first build shipped a saturated navy
 * outline (chroma ≈118/255) instead of the world's achromatic `ART_OUTLINE`.
 * `scripts/art/build_art.py`'s third pipeline mode, `recontour`, now fixes
 * only the contour pixels and leaves this fill untouched — the emitted PNG
 * measures `#1a1a1a` across 95% of its contour today. `docs/09` §4's fourth
 * exception records the rule and the class of art it applies to; guarded by
 * `client/src/detective/artHierarchy.test.ts`'s `goal-*`/`hazard-*` glob. */
export const GOAL_MEDUSA_ART: ArtImage = {
  href: '/art/goal-medusa.png',
  w: 357,
  h: 384,
}

/** Nivel 3's `f2-agua4` hazard, drawn in place of the plain circle
 * (`LevelConfig.hazardArt` → `TraceHazards.art`, design.md §4). Same
 * authored-fill-kept/contour-fixed treatment as {@link GOAL_MEDUSA_ART} —
 * `recontour` corrected its contour from chroma ≈122/255 to `#1a1a1a`. */
export const HAZARD_STARFISH_ART: ArtImage = {
  href: '/art/hazard-starfish.png',
  w: 320,
  h: 296,
}

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
