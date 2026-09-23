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
 * (`docs/13` §4 decision 1: the deduction is paused, not revived). Widened
 * with `'vibora'` for the arena's own recovered animal
 * (`snake-drag-and-art-corridor` design.md §7.1, proposal decision 7), and
 * `'abeja'` for the forest's own (`free-trail-waypoints` design.md §9;
 * `docs/13` §7 lists `abeja.png` among the ANIMALS, not the UI icons). */
export type ZooAnimalId =
  | AnimalId
  | 'oveja'
  | 'llama'
  | 'vibora'
  | 'abeja'
  | 'delfin'
  | 'erizo'
  // The prologue's promise, kept (`docs/18` §4.5, `odd/tasks/promised-
  // animals.md` P1): `'pez'`/`'tortuga'`/`'mono'` are the three animals the
  // entrance's empty enclosures show a sign for (`SIGN_ART`) but the child
  // never actually finds. All three widen this union in the same slice
  // (P1) even though only the `fish` adventure ships behind it yet (P2) —
  // splitting the art registry across P1/P2/P3/P4 while a SINGLE row
  // (`peces`/`tortugas`/`monos`, `zoo/adventures.ts`) already names the
  // whole trio would leave two of three ZOO animals with a `SIGN_ART` entry
  // and no `ZOO_ANIMAL_ART` counterpart for a whole task longer than
  // necessary — art has no reason to wait for its own adventure row to
  // exist first.
  | 'pez'
  | 'tortuga'
  | 'mono'

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

/** The arena's backpack reward (`docs/13` §8 row E) — a snake carried home
 * in a little cart, `snake4`'s own `earnedWhen` (`zoo/backpack.ts`). Its
 * pipeline row (`carrito.png` → `zoo-cart.png`) shipped in Phase 1 ahead of
 * this registry entry (design.md §7.1's resequencing note); `w`/`h` are
 * copied from the rebuilt `manifest.json`, guarded by
 * `artManifest.test.ts`. */
export const CART_ART: ArtImage = {
  href: '/art/zoo-cart.png',
  w: 216,
  h: 256,
}

/** Full-canvas sectors are scenery rather than sprites: callers preserve their
 * 3:2 intrinsic coordinate system and leave the quiet centre free for a
 * finger-drawn route. */
export const SECTOR_BACKGROUND_ART: Readonly<Record<
  | 'lagoon' | 'sand' | 'slope' | 'range' | 'forest' | 'aquarium' | 'night'
  | 'nightZoo' | 'monkeys' | 'path',
  ArtImage
>> = {
  lagoon: { href: '/art/sector-lagoon-background.png', w: 1536, h: 1024 },
  sand: { href: '/art/sector-sand-background.png', w: 1536, h: 1024 },
  slope: { href: '/art/sector-slope-background.png', w: 1536, h: 1024 },
  range: { href: '/art/sector-range-background.png', w: 1536, h: 1024 },
  forest: { href: '/art/sector-forest-background.png', w: 1536, h: 1024 },
  aquarium: { href: '/art/sector-aquarium-background.png', w: 1536, h: 1024 },
  // Authored from `fondo nocturno.png` — a full-canvas opaque scene like
  // every other row here, same 1536x1024.
  night: { href: '/art/sector-night-background.png', w: 1536, h: 1024 },
  nightZoo: { href: '/art/sector-night-zoo-background.png', w: 1536, h: 1024 },
  // The prologue's third and fourth enclosures (design.md §4). Placeholder
  // sources, same full-canvas opaque contract as every other row here.
  monkeys: { href: '/art/sector-monkeys-background.png', w: 1536, h: 1024 },
  path: { href: '/art/sector-path-background.png', w: 1536, h: 1024 },
}

/** The prologue's caretaker cutout — the Pulpito shown in beat 0, before the
 * zoo map, and the closing beats' standing octopus fallback (design.md D1,
 * D3). `w`/`h` are copied from the rebuilt `manifest.json`, guarded by
 * `artManifest.test.ts`. */
export const ZOO_CARETAKER_ART: ArtImage = {
  href: '/art/zoo-octopus-caretaker.png',
  w: 235,
  h: 320,
}

/** The three wooden zoo signs the prologue's `peces`/`tortugas`/`monos`
 * closings carry (design.md §4, docs/16 §5). The word (`PECES`/`TORTUGAS`/
 * `MONOS`) lives IN the drawing itself, not in a second DOM label —
 * `AdventureClosing` renders exactly one `CaptionedArt` per beat, and its
 * caption is always the beat's `line` (the docs/16 §9 sentence). */
export const SIGN_ART: Readonly<Record<'fish' | 'turtles' | 'monkeys', ArtImage>> = {
  fish: { href: '/art/sign-fish.png', w: 199, h: 256 },
  turtles: { href: '/art/sign-turtles.png', w: 199, h: 256 },
  monkeys: { href: '/art/sign-monkeys.png', w: 197, h: 256 },
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
  | 'flowerDormant'
  | 'honeycomb'
  | 'dolphin'
  | 'snail'
  | 'flashlight'
  | 'chest'
  | 'stone'
  | 'leaf',
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
  // The flower BEFORE the bee has been to it (`free-trail-waypoints`
  // design.md §3.2). Derives from the SAME `flor.png` as `flower` above, so
  // the two states share `w`/`h` exactly — `artManifest.test.ts` guards the
  // parity, a divergence being the `clue-footprint` failure class repeating.
  flowerDormant: { href: '/art/sector-flower-dormant.png', w: 256, h: 245 },
  honeycomb: { href: '/art/sector-honeycomb.png', w: 181, h: 256 },
  dolphin: { href: '/art/sector-dolphin.png', w: 448, h: 418 },
  snail: { href: '/art/sector-snail.png', w: 448, h: 321 },
  flashlight: { href: '/art/sector-flashlight.png', w: 256, h: 234 },
  // The entrance's night findable objects (design.md §3.4). `chest`/`stone`
  // are landscape (`w`, 256, is the pipeline's target for the wider side),
  // `leaf` is near-square with `h` the fixed 256 — all three measured off
  // the rebuilt `manifest.json`'s own `sector-chest`/`sector-stone`/
  // `sector-leaf` entries, never guessed.
  chest: { href: '/art/sector-chest.png', w: 256, h: 200 },
  stone: { href: '/art/sector-stone.png', w: 256, h: 170 },
  leaf: { href: '/art/sector-leaf.png', w: 242, h: 256 },
}

/** The flower's two states. Both derive from `flor.png`, so the swap is an
 * `href` swap and the mark does not move or change shape when it opens —
 * exactly the argument `CLUE_ART`'s own `{earned, drained}` pair carries
 * (`free-trail-waypoints` design.md §3.2). */
export const FLOWER_ART: Readonly<Record<'dormant' | 'lit', ArtImage>> = {
  dormant: SECTOR_ADVENTURE_ART.flowerDormant,
  lit: SECTOR_ADVENTURE_ART.flower,
}

/** Hedgehog drawing activities: the two poses stay separate so the child can
 * draw spikes on a side-on body or recognise the same animal curled up.
 * Declared BEFORE `ZOO_ANIMAL_ART` so its `erizo` row (below) can reference
 * `HEDGEHOG_ART.profile` directly, module-init order — moved up from its
 * original position (Phase 1) for exactly this reason. */
export const HEDGEHOG_ART: Readonly<Record<'profile' | 'curled', ArtImage>> = {
  profile: { href: '/art/hedgehog-profile.png', w: 448, h: 306 },
  curled: { href: '/art/hedgehog-curled.png', w: 412, h: 407 },
}

/** The prologue's promise, kept (P1, `odd/tasks/promised-animals.md`):
 * `pez.png`/`tortuga.png` are genuine cutouts (real alpha, a blue contour
 * normalized to `ART_OUTLINE` by `build_art.py`'s `fill='contour'` mode —
 * the same treatment `oveja`/`llama`/`delfin` already get through
 * `SECTOR_ADVENTURE_ART`) rather than reused sector props, so — unlike
 * those three — they get no `SECTOR_ADVENTURE_ART` entry of their own:
 * nothing else in this app stands a fish or a turtle anywhere but at
 * `ZOO_ANIMAL_ART`. A small dedicated record, the same shape `SIGN_ART`
 * and `HEDGEHOG_ART` already use, rather than three bare literals inlined
 * into `ZOO_ANIMAL_ART` below — `artManifest.test.ts`'s `REGISTERED` table
 * imports named exports one registry at a time, and an inline literal with
 * no export of its own would ship art the manifest guard could never see,
 * the exact "dead weight" failure its own header warns about. `w`/`h`
 * copied from the rebuilt `manifest.json` (`docs/17` §4 step 3's own rule:
 * read, never estimated), guarded by `artManifest.test.ts`.
 *
 * `mono` is PENDING REAL ART (`docs/18` §6 is the standing request):
 * `art-source/mono.png` is a placeholder written by `make_placeholders.py`'s
 * `make_sign('MONO')` — a bordered block with the word stamped across it,
 * not a drawing of a monkey — shipped so the third promised animal still
 * has a legible stand-in rather than no entry at all. Swapping it for an
 * authored cutout is a source-file replacement plus a pipeline rerun
 * (`docs/17` §4); this record's `w`/`h` will need the same manifest
 * re-copy that step always does.
 */
export const PROMISED_ANIMAL_ART: Readonly<Record<'pez' | 'tortuga' | 'mono', ArtImage>> = {
  pez: { href: '/art/animal-pez.png', w: 448, h: 358 },
  tortuga: { href: '/art/animal-tortuga.png', w: 448, h: 292 },
  mono: { href: '/art/animal-mono.png', w: 320, h: 320 },
}

/** `ZOO_ANIMAL_ART` resolves every {@link ZooAnimalId} — spreading
 * `ANIMAL_ART` preserves referential identity for every existing entry, so
 * `mapBubble`'s art-reference comparisons keep working for the duck. */
export const ZOO_ANIMAL_ART: Readonly<Record<ZooAnimalId, ArtImage>> = {
  ...ANIMAL_ART,
  oveja: SECTOR_ADVENTURE_ART.sheep,
  llama: SECTOR_ADVENTURE_ART.llama,
  // The one a child would draw if asked to draw "a snake" — the middle
  // size, neither the smallest nor the largest of the three.
  vibora: SECTOR_ADVENTURE_ART.snakeMedium,
  abeja: SECTOR_ADVENTURE_ART.bee,
  // Already built and registered (`SECTOR_ADVENTURE_ART.dolphin`, this
  // file's own `'dolphin'` row above) and already passing
  // `artHierarchy.test.ts`'s coverage guard. Verify, don't rebuild
  // (design.md §8, task 6.7).
  delfin: SECTOR_ADVENTURE_ART.dolphin,
  // `radial-spines` design.md §5, §9 item 2: both shipped PNGs are
  // SPINELESS by design (`docs/13` §7), so the animal standing on the map
  // after `hedgehog4` is a hedgehog with no spines — a real art gap, flagged
  // to the author rather than silently accepted. Closing it needs a third
  // drawing (`erizo con espinas.png`), which is art, not code.
  erizo: HEDGEHOG_ART.profile,
  // `pez`/`tortuga`/`mono` — see `PROMISED_ANIMAL_ART`'s own header,
  // declared just above, for why this is a spread of a dedicated record
  // rather than three inline literals.
  ...PROMISED_ANIMAL_ART,
}

/** One pose's measured silhouette, in the image's OWN normalised space
 * (`radial-spines` capability, design.md §3.3's `SilhouetteProfile` shape,
 * restated structurally here rather than imported — `detective/` imports
 * nothing from `levels/`, the same leaf-module convention every other
 * `ArtImage` export in this file already follows). */
export interface HedgehogSilhouette {
  /** Opaque-pixel centroid, as a fraction of the image box (x/W, y/H). */
  readonly centroid: readonly [number, number]
  /** Outer silhouette extent along 24 equally spaced rays from the
   *  centroid, starting at 0° (+x) and increasing CLOCKWISE (SVG
   *  convention, y is down), as a fraction of the image WIDTH. */
  readonly radii: readonly number[]
}

/** Measured once with `scripts/art/png.py` at 0.25px marching resolution,
 * alpha ≥ 128, 24 rays (design.md §10 — transcribed VERBATIM, never
 * re-derived here). `radii` is the `r/W` column, normalised by WIDTH on
 * both axes on purpose: the `<image>` preserves aspect, so one uniform
 * scale carries both axes and a radius can never be stretched
 * (`levels/spines.ts`'s `spineBody`/`spineAnchors` read this table for the
 * body box and every anchor alike, so the art and the scored geometry
 * agree by construction — design.md §2 D2). `assets.test.ts` guards this
 * literal against a future silent retune, ray for ray. */
export const HEDGEHOG_SILHOUETTE: Readonly<Record<'profile' | 'curled', HedgehogSilhouette>> = {
  profile: {
    centroid: [0.5416, 0.5107],
    radii: [
      0.45491, 0.45938, 0.42455, 0.45089, 0.37388, 0.27277, 0.26563, 0.27277, 0.38438, 0.43929,
      0.42009, 0.50625, 0.45536, 0.40893, 0.39174, 0.3683, 0.35491, 0.34375, 0.34554, 0.35491,
      0.37054, 0.4, 0.41853, 0.43862,
    ],
  },
  curled: {
    centroid: [0.5002, 0.5029],
    radii: [
      0.4932, 0.48835, 0.54248, 0.50728, 0.49515, 0.48908, 0.48738, 0.48908, 0.49515, 0.49951,
      0.5, 0.49636, 0.50121, 0.49879, 0.49563, 0.49806, 0.50728, 0.50243, 0.49515, 0.49272,
      0.49223, 0.49223, 0.49393, 0.4932,
    ],
  },
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
