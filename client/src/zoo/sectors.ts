// The zoo's sector registry (`docs/12_MAPA_DEL_ZOOLOGICO.md` §3, design.md
// §1-§5). One object per sector: where it sits on the map, what covers it
// while it is closed, which adventures it opens, and the pure decisions a
// `renderToString`-only harness can actually observe. Nothing here is a
// component — `screen/ZooMap.tsx` is the only consumer that draws anything.
//
// Every coordinate below follows from ONE measured fact (design.md §1): the
// map image is 1536×1024 laid on a 1000×600 viewBox at `xMidYMid slice`, so
// `vbX = imgX × 0.651042` and `vbY = imgY × 0.651042 − 33.333`. The rects are
// the result of pushing region-sampled points through those two lines, not
// numbers picked by eye. `docs/12` §4 governs what happens when one misses: a
// misplaced `hit` is corrected HERE, never in `zoo-map.png` itself.
import { LEVELS } from '../levels/catalog'
import { ZOO_ANIMAL_ART, ZOO_FOG_ART, type ArtImage, type ZooAnimalId } from '../detective/assets'
import { placeArt, STANDING_GRIP, type ArtBox } from '../canvas/placeArt'
import type { LevelRecord } from '../game/types'

/** The persisted records, straight from `cursiva.levels.v1`. Re-homed here
 *  because `home/caseState.ts:29` owned this alias and `home/` is deleted by
 *  this same change; nothing outside `home/` ever imported it (verified,
 *  design.md §8). */
export type Records = Readonly<Record<string, LevelRecord>>

/** "Filed" = at least one approval — the exact rule `home/caseState.ts`'s
 *  `isFiled` used, re-homed rather than re-decided. */
export function isFiled(records: Records, levelId: string): boolean {
  return (records[levelId]?.approvals ?? 0) >= 1
}

/** An axis-aligned rect in viewBox units. `ArtBox` (`canvas/placeArt.ts`) is
 *  the same shape with `w`/`h` spelled out as `width`/`height`; this one
 *  keeps `docs/12` §3's own field names so the registry reads like the
 *  directive it implements. */
export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

/** The centre of a `Rect` — the point a footprint trail walks toward and a
 *  sector's own hit-test aims at. */
export function hitCentre(hit: Rect): { x: number; y: number } {
  return { x: hit.x + hit.w / 2, y: hit.y + hit.h / 2 }
}

export interface FogPatch {
  /** Index into `ZOO_FOG_ART`: 0 wide (495×155), 1 tall (343×479), 2 round
   *  (474×424). */
  art: 0 | 1 | 2
  /** Centre of the patch, viewBox units. */
  x: number
  y: number
  /** Rendered HEIGHT; width follows the file's own aspect ratio. */
  size: number
  /** ALWAYS 0, and the literal type is the guard (design.md §4, "an
   *  unprovable invariant is worse than a plainer picture"): a rotated
   *  blob's footprint is not its axis-aligned rect, so `coversRect` could
   *  only stay sound at `rot: 0`. `sectors.test.ts`'s `@ts-expect-error` on
   *  a `rot: 15` literal is the same mechanism `CaptionedArt`'s required
   *  `label` uses — a compile error `npm run build` catches and `vitest`
   *  cannot. */
  rot: 0
  /** Mirror about the patch's own vertical centreline. Footprint-preserving
   *  (the axis-aligned box is bit-identical either way), which is why
   *  variety is spent here and not on `rot`. */
  flip?: boolean
}

export interface ZooAnimal {
  /** Drawn from `ZOO_ANIMAL_ART[id]`, by its FEET (`STANDING_GRIP`). */
  id: ZooAnimalId
  /** Offset from the sector's single `animalSpot`, so one spot carries a
   *  group later without a schema change. */
  dx: number
  dy: number
  /** Rendered height, viewBox units. */
  size: number
  /** Every one of these filed ⇒ the animal stands in the zoo. Declarative
   *  ids, not a closure: the structural test below needs to prove each id
   *  is a real catalog level, and a closure cannot be inspected. */
  appearsWhen: readonly string[]
}

export type SectorId =
  | 'entrada'
  | 'bosque'
  | 'estanque'
  | 'montanas'
  | 'arena'
  | 'nocturna'
  | 'sendero'

export interface ZooSector {
  id: SectorId
  /** ABSENT = scenery: never tappable, never fogged, skipped by both
   *  geometry tests (OD3, the sendero — it IS the paths, and any 120×120
   *  rect on them would collide with the plaza or a neighbour). */
  hit?: Rect
  fog: readonly FogPatch[]
  animalSpot: { x: number; y: number }
  animals: readonly ZooAnimal[]
  /** In play order (`docs/13` §3). */
  adventureIds: readonly string[]
  /** Pure. Today every implementation is `alwaysOpen` (the estanque, D4's
   *  seed) or `alwaysClosed` (the five fogged sectors) — paso D's intro
   *  plugs in here, one line per sector. */
  unlockedWhen: (records: Records) => boolean
}

export const PLAZA: Rect = { x: 408, y: 225, w: 180, h: 115 }
export const PLAZA_CENTRE = { x: 498, y: 282 } as const

/** The entrance's own justification, replacing the placeholder promise this
 *  comment used to carry ("Deleted in paso D, not a rule" — proposal,
 *  "Decisions"). `entrada` is open on a fresh install because there is
 *  nowhere else to start (`docs/12` §1; design.md §7.1): the estanque is the
 *  only row that ever moves OFF this helper, to `isFiled(records, 'sand3')
 *  || isFiled(records, 'sand4')`
 *  below. */
const alwaysOpen = (): boolean => true
/** Entrada, bosque, montañas, arena and nocturna: content is pasos B-H. */
const alwaysClosed = (): boolean => false

/** The map source's own pixel dimensions (`ZOO_MAP_ART`, `assets.ts:193-200`)
 *  and the stage it is laid on. Named rather than inlined because the whole
 *  registry below is downstream of these four numbers. */
const MAP_IMG_W = 1536
const MAP_IMG_H = 1024
const STAGE_W = 1000
const STAGE_H = 600

/**
 * A point on `zoo-map.png`, in its own pixels, expressed in viewBox units.
 *
 * `xMidYMid slice` covers the stage, so it scales by the LARGER of the two
 * ratios: `max(1000/1536, 600/1024) = max(0.651042, 0.585938) = 0.651042`, the
 * width one. The image therefore renders 1000 wide by `1024 × 0.651042 =
 * 666.67` tall, centred, so its top sits `(600 − 666.67) / 2 = −33.33` and
 * `33.33` units are cropped off the top and the bottom alike. Uniform scale on
 * both axes — that is what makes one factor enough.
 *
 * This is an AUTHORING tool, not a render-time one: nothing draws through it,
 * because every `hit` below is already a literal. It is exported and tested
 * for two reasons. Its scenario ("Transform matches the measured scale
 * factor", spec: zoo-map) was prose-only, and a spec claim no test can fail is
 * not a claim. And pasos B-H have to measure their own sectors off this same
 * PNG — they should push their samples through the function this change's
 * numbers came from, not re-derive the factor and get 0.65 or forget the
 * crop.
 *
 * `stageWidth` (`scrolling-camera`/`zoo-map` capability, design.md §3.4)
 * defaults to `STAGE_W` (1000), so all fifteen existing callers — every one
 * of them in this file's own test suite, passing no argument — stay
 * byte-identical. A caller measuring a WIDER sheet (a panned dolphin level's
 * own backdrop) passes its actual sheet width explicitly, or it validates
 * rows the render never shows at that width — a certain, not merely likely,
 * defect (design.md §3.2's "161-row lie"). This is the STAGE width, never
 * the SOURCE size: both functions are named and built for the zoo map's own
 * `1536 × 1024` pixels, and they work for a backdrop only because every
 * sector background ships at that same resolution. A future source at
 * another size needs its own transform, not a third parameter on this one.
 */
export function imageToViewBox(
  imgX: number,
  imgY: number,
  stageWidth: number = STAGE_W,
): { x: number; y: number } {
  const scale = Math.max(stageWidth / MAP_IMG_W, STAGE_H / MAP_IMG_H)
  return {
    x: imgX * scale,
    y: imgY * scale - (MAP_IMG_H * scale - STAGE_H) / 2,
  }
}

/**
 * The exact inverse of {@link imageToViewBox}: a viewBox point back to its
 * source pixel on `zoo-map.png`. Pasos B-H need this to check that a
 * corridor's viewBox extent falls inside a sector backdrop's own sampled
 * `corridorRows` — pushed through the SAME factor `imageToViewBox`'s numbers
 * came from, not re-derived (this function's own header).
 *
 * `stageWidth` — same contract as {@link imageToViewBox}'s own parameter,
 * defaulting to `STAGE_W`.
 */
export function viewBoxToImage(
  vbX: number,
  vbY: number,
  stageWidth: number = STAGE_W,
): { x: number; y: number } {
  const scale = Math.max(stageWidth / MAP_IMG_W, STAGE_H / MAP_IMG_H)
  return {
    x: vbX / scale,
    y: (vbY + (MAP_IMG_H * scale - STAGE_H) / 2) / scale,
  }
}

const ENTRADA_HIT: Rect = { x: 398, y: 424, w: 228, h: 170 }
const BOSQUE_HIT: Rect = { x: 25, y: 230, w: 300, h: 300 }
const ESTANQUE_HIT: Rect = { x: 660, y: 68, w: 280, h: 200 }
const MONTANAS_HIT: Rect = { x: 360, y: 22, w: 270, h: 140 }
const ARENA_HIT: Rect = { x: 675, y: 290, w: 280, h: 228 }
// x 88, not 95, and 257 wide rather than 250. The provenance test found this:
// the navy sky was sampled at image x 136, which is viewBox 88.5, so a hit
// starting at 95 left 6.5 units of the DRAWN sector outside its own rect — and
// therefore outside the fog that is sized from that rect. That is the thin
// dark sliver the first captures showed at the map's left edge. `docs/12` §4
// is explicit about which side gives way: the registry is corrected, never the
// drawing. Still disjoint from everything (montañas starts at 360, bosque's
// band starts at y 230).
const NOCTURNA_HIT: Rect = { x: 88, y: 22, w: 257, h: 190 }

/** design.md §4's closed-form fog construction, restated as code rather than
 * hand-authored numbers. The `hit` is TILED by `cols × rows` cells and one
 * patch sits on each cell's centre, sized so that the patch's own box
 * contains its own cell:
 *
 *     cols = max(1, round(w / 130))      cellW = w / cols
 *     rows = max(1, round(h / 130))      cellH = h / rows
 *     size = max(cellH, cellW / aspect) × 1.06        (aspect = art.w / art.h)
 *
 * Proof, in two lines. The box is `size ≥ 1.06 × cellH` tall centred on its
 * cell's own midline, so it spans `[cy − 0.53 cellH, cy + 0.53 cellH] ⊇` the
 * cell. It is `size × aspect ≥ 1.06 × cellW` wide, centred on the cell's own
 * vertical midline, so it covers the cell horizontally. The union of the
 * cells is EXACTLY the `hit`, so the union of the boxes contains it. ∎
 *
 * This replaces the shipped two-patches-at-the-width-quadrants construction,
 * whose `size = 1.06 × h` made a near-square sector's patches far wider than
 * the sector itself (`aspect × 1.06h`): bosque (300 × 300) drew two patches
 * ≈355 wide for a 300-unit sector, so its fog spanned ≈670 units and spilled
 * over the plaza, the paths and the neighbouring sectors. The grid keeps the
 * containment proof (it is strictly tighter — every cell is covered by its
 * OWN patch rather than by a half-width one) and reads as a bank of fog
 * rather than as two grey balloons. `FOG_BBOX_SLACK` in `sectors.test.ts` is
 * what keeps the spill from coming back.
 *
 * `art` stays a per-call authored argument rather than a computed one — the
 * choice is a one-time fact about a fixed `hit`, not something to re-derive
 * on every render — but its RULE changed with the construction: pick the
 * silhouette whose aspect is CLOSEST to the cell's own `cellW / cellH`, which
 * is what minimises the `max(…)` above and therefore the overshoot. Under the
 * quadrant construction the rule was a one-sided `aspect ≥ w / (2.12 h)`
 * floor. Re-derived per sector against its own cell: entrada (114 × 170 cell)
 * and nocturna (125 × 190) take the tall art 1; bosque (150 × 150), montañas
 * (135 × 140) and arena (140 × 114) take the round art 2. Bosque and arena
 * moved off art 1, and nocturna off art 2, because the rule changed — under
 * the old one-sided floor those were all admissible.
 */
/** How far each patch's box overruns its own cell. The containment proof only
 *  needs `> 1`, and 1.06 was enough to satisfy it — but the PROOF is about
 *  boxes and the fog is about PIXELS, and those came apart on the first
 *  capture. The three fog silhouettes are rounded blobs, so each box's four
 *  corners are transparent; at 1.06 the four transparent corners meeting at a
 *  grid junction left a real hole, and the drawing showed through it. In
 *  `nocturna` that hole leaked night sky and two stars, which is not a
 *  cosmetic miss: `docs/12` §1 rules that a closed sector tells the child
 *  "hay algo ahí" and NOT what. A hole that shows the stars answers the
 *  question the fog exists to keep open.
 *
 *  1.3 makes neighbouring bodies overlap by about a third of a cell, which is
 *  more than the corner radius, so the blobs close on each other instead of
 *  merely touching. `FOG_JUNCTIONS` below plugs the interior junctions
 *  directly, which is what lets this stay at 1.3 rather than climbing until
 *  the spill this whole construction exists to remove comes back. */
const FOG_OVERLAP = 1.3
/** Target cell edge, viewBox units. Chosen so the smallest `hit` (entrada,
 *  228 × 170) still tiles into more than one patch and the largest (bosque,
 *  300 × 300) into four — few enough to stay cheap, many enough that no
 *  single patch reads as a balloon. */
const FOG_CELL = 130
/** Whether to add the interior junction patches below. A named constant and
 *  not an inline `true` so the reason survives next to the switch: it is the
 *  pixel-level half of the fog, and the geometry tests cannot observe it —
 *  they read boxes, and a box has no transparent corner. */
const FOG_JUNCTIONS = true
function closedFog(hit: Rect, art: 0 | 1 | 2): readonly FogPatch[] {
  const aspect = ZOO_FOG_ART[art].w / ZOO_FOG_ART[art].h
  const cols = Math.max(1, Math.round(hit.w / FOG_CELL))
  const rows = Math.max(1, Math.round(hit.h / FOG_CELL))
  const cellW = hit.w / cols
  const cellH = hit.h / rows
  const size = FOG_OVERLAP * Math.max(cellH, cellW / aspect)
  const patches: FogPatch[] = []
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      patches.push({
        art,
        x: hit.x + (col + 0.5) * cellW,
        y: hit.y + (row + 0.5) * cellH,
        size,
        rot: 0,
        // Checkerboard rather than alternating-by-index, so two patches
        // sharing an edge are never the same mirror image in either axis.
        // Footprint-preserving (§4), which is why variety is spent here.
        flip: (row + col) % 2 === 1,
      })
    }
  }
  // The interior junctions, where four cells — and therefore four transparent
  // blob corners — meet. These add nothing to the containment proof above
  // (the grid already covers the `hit` on its own); they exist only to close
  // the holes the proof cannot see, and they are INTERIOR by construction, so
  // they cost the union's bounding box nothing. A sector that tiles to a
  // single row or column has no interior junction and gets none.
  if (FOG_JUNCTIONS) {
    for (let row = 1; row < rows; row++) {
      for (let col = 1; col < cols; col++) {
        patches.push({
          art,
          x: hit.x + col * cellW,
          y: hit.y + row * cellH,
          size,
          rot: 0,
          flip: (row + col) % 2 === 0,
        })
      }
    }
  }
  return patches
}

export const SECTORS: readonly ZooSector[] = [
  {
    id: 'entrada',
    hit: ENTRADA_HIT,
    // D4: no entrance/intro existed yet, so the entrada shipped fogged.
    // Row D opens it — `fog` is kept authored but never rendered while
    // `unlockedWhen` returns true (`!isOpen`, `ZooMap.tsx:231`).
    fog: closedFog(ENTRADA_HIT, 1),
    animalSpot: hitCentre(ENTRADA_HIT),
    animals: [],
    // Narrowed from eight ids to four by adventure-flow-and-map-guidance T1
    // ("levels that must be done twice"): each enclosure used to carry TWO
    // levels of the same erase gesture on the same picture
    // (add-caretaker-prologue design.md D7), and `zoo/adventures.ts`'s four
    // rows now each keep only their easier level id. This list IS the play
    // order — `nextAdventure` (below, `:495-497`) hands out the next one by
    // taking the first UNFILED id in THIS list, not `nextLevelId` — so it
    // must read `glass1, sand1, glass3, sand3`, the order docs/16 §9's
    // script requires: peces, tortugas, monos, sendero. The dropped twin of
    // each pair (`glass2`/`sand2`/`glass4`/`sand4`) is never renamed or
    // deleted from the catalog — only removed from here and from
    // `ADVENTURES` — so it no longer appears in the play order at all;
    // reaching it still works through the dev `?nivel=` deep link.
    // Finishing any one of these four now shows its own closing beat
    // (`resolveCloseAction`, tried before the ordinary sector-exit outcome
    // — `screen/GameScreen.tsx`), since each is now its own adventure's
    // only, and therefore last, level.
    adventureIds: ['glass1', 'sand1', 'glass3', 'sand3'],
    unlockedWhen: alwaysOpen,
  },
  {
    id: 'bosque',
    hit: BOSQUE_HIT,
    // aspect ≥ 300/(2.12×300) = 0.47 → art 1 clears it.
    fog: closedFog(BOSQUE_HIT, 2),
    animalSpot: hitCentre(BOSQUE_HIT),
    // `size` is a HEIGHT (`placeArt.ts`): the bee's aspect is 1.113, so 48
    // renders 53×48 — half the duck's 96, the right sentence about a bee,
    // and it sits comfortably inside `BOSQUE_HIT`'s 300×300
    // (`free-trail-waypoints` design.md §9).
    animals: [{ id: 'abeja', dx: 0, dy: 0, size: 48, appearsWhen: ['bee4'] }],
    adventureIds: ['bee1', 'bee2', 'bee3', 'bee4'],
    // The ladder's new last rung: entrada → estanque ← sand4 → montañas ←
    // duck-trail4 → nocturna ← llama-peak4 → arena ← night4 → bosque ←
    // snake4 (`free-trail-waypoints` design.md §9). Only ever WIDENS access.
    unlockedWhen: (records) => isFiled(records, 'snake4'),
  },
  {
    id: 'estanque',
    hit: ESTANQUE_HIT,
    // D4 shipped this discovered (`alwaysOpen`, no fog). Row D closes it
    // for real (design.md §7.1, amendment A4): opening the entrance is now
    // what unlocks the pond, so the pond needs an actual fog patch to hide
    // behind first. `closedFog(ESTANQUE_HIT, 2)` is design.md §7.1's own
    // closest-aspect derivation for this cell (2×2 cells, aspect 1.40 —
    // art 2's 1.118 is the closest of the three, NOT art 0, whose
    // `max(cellH, cellW/aspect)`-minimising box would spill ~3× the cell).
    fog: closedFog(ESTANQUE_HIT, 2),
    // Inside the water, clear of the reed island (x ∈ [768,833], y ∈
    // [130,182]) — design.md §1's measured spot.
    animalSpot: { x: 735, y: 200 },
    animals: [
      // The duck appears once ITS OWN trail is filed, not when the whole
      // sector is (design.md §3) — `appearsWhen` is per-animal on purpose.
      { id: 'pato', dx: 0, dy: 0, size: 96, appearsWhen: ['duck-trail4'] },
      // The dolphin, once `dolphin4` is filed (design.md §8). Z1, asserted
      // rather than eyeballed: with `STANDING_GRIP` off this sector's own
      // `animalSpot` {735, 200}, the box is x ∈ [801.4, 878.6], y ∈ [188,
      // 260] — inside `ESTANQUE_HIT`, clear of the reed island, and
      // disjoint from the duck's own box.
      { id: 'delfin', dx: 105, dy: 60, size: 72, appearsWhen: ['dolphin4'] },
    ],
    // The exact order docs/13 §3 assigns to the estanque: the duck's four
    // trails, then the medusa's four, then the dolphin's four (design.md §3,
    // §8 — patos → medusa → delfines).
    adventureIds: [
      'duck-trail1',
      'duck-trail2',
      'duck-trail3',
      'duck-trail4',
      'f2-guirnalda',
      'f2-agua2',
      'f2-agua3',
      'f2-agua4',
      'dolphin1',
      'dolphin2',
      'dolphin3',
      'dolphin4',
    ],
    // No longer `alwaysOpen` (amendment A4, design.md §7.1): the real stake
    // of `migrateEntrance` is right here — without that migration a
    // returning child would find the pond fogged over the moment this row
    // ships. `sand3` is the sendero's own level after adventure-flow-and-
    // map-guidance T1 narrowed it to one; `sand4` stays in the OR as a
    // widening, never a replacement, for a returning child who could have
    // IT filed instead — the sendero's own old last level, or what
    // `migrateEntrance` itself seeds for a pre-entrance legacy child (it
    // seeds `sand4`, never `sand3`). Either alone opens the pond.
    unlockedWhen: (records) => isFiled(records, 'sand3') || isFiled(records, 'sand4'),
  },
  {
    id: 'montanas',
    hit: MONTANAS_HIT,
    // aspect ≥ 270/(2.12×140) = 0.91 → only art 2 (474×424 → 1.118) clears it.
    fog: closedFog(MONTANAS_HIT, 2),
    animalSpot: hitCentre(MONTANAS_HIT),
    // Each animal appears once its OWN adventure's last level is filed, not
    // when the whole sector is — the same per-animal `appearsWhen` the duck
    // established. The llama's smaller/negative `dy` stands it higher than
    // the sheep's: the cumbre above the ladera, the same sentence as the two
    // peak heights (design.md §4.3).
    animals: [
      { id: 'oveja', dx: -55, dy: 10, size: 84, appearsWhen: ['sheep-hill4'] },
      { id: 'llama', dx: 55, dy: -6, size: 96, appearsWhen: ['llama-peak4'] },
    ],
    adventureIds: [
      'sheep-hill1',
      'sheep-hill2',
      'sheep-hill3',
      'sheep-hill4',
      'llama-peak1',
      'llama-peak2',
      'llama-peak3',
      'llama-peak4',
    ],
    // The first `unlockedWhen` that is neither `alwaysOpen` nor
    // `alwaysClosed` — row C is reachable without waiting for paso D
    // (design.md §4.3, proposal question 3's assumption).
    unlockedWhen: (records) => isFiled(records, 'duck-trail4'),
  },
  {
    id: 'arena',
    hit: ARENA_HIT,
    // aspect ≥ 280/(2.12×228) = 0.58 → art 1 clears it.
    fog: closedFog(ARENA_HIT, 2),
    animalSpot: hitCentre(ARENA_HIT),
    // `size` is a HEIGHT (`placeArt.ts`): `snakeMedium`'s aspect is 4.32, so
    // 30 renders 130×30 — not a typo beside the llama's 96, and it fits
    // `ARENA_HIT`'s width with room (`snake-drag-and-art-corridor`
    // design.md §7.1).
    animals: [{ id: 'vibora', dx: 0, dy: 0, size: 30, appearsWhen: ['snake4'] }],
    adventureIds: ['snake1', 'snake2', 'snake3', 'snake4'],
    // The ladder's new last rung: entrada → estanque ← sand4 → montañas ←
    // duck-trail4 → nocturna ← llama-peak4 → arena ← night4. Only ever
    // WIDENS access (design.md §0 A1).
    unlockedWhen: (records) => isFiled(records, 'night4'),
  },
  {
    id: 'nocturna',
    hit: NOCTURNA_HIT,
    // aspect ≥ 250/(2.12×190) = 0.62 → art 2 clears it.
    fog: closedFog(NOCTURNA_HIT, 1),
    animalSpot: hitCentre(NOCTURNA_HIT),
    // The sector's first recovered animal (`radial-spines` design.md §8.2):
    // the erizo, at the existing `animalSpot`, once `hedgehog4` is filed —
    // the same shape every other recovered animal uses (`vibora` above).
    animals: [{ id: 'erizo', dx: 0, dy: 0, size: 90, appearsWhen: ['hedgehog4'] }],
    // A second adventure joins an already-open sector (design.md §8.2,
    // amendment 9's precedent: `entrada` — glass then sand; `montañas` —
    // sheep then llama). `unlockedWhen` below is UNCHANGED: adding an
    // adventure to an open sector does not change when the sector itself
    // opens.
    adventureIds: ['night1', 'night2', 'night3', 'night4', 'hedgehog1', 'hedgehog2', 'hedgehog3', 'hedgehog4'],
    // Opens once the mountains are done (design.md §7.1) — the night
    // sector is the row's own last stop, after glass/sand/duck/sheep/llama.
    unlockedWhen: (records) => isFiled(records, 'llama-peak4'),
  },
  {
    id: 'sendero',
    // OD3: no hit at all. It IS the drawn paths; a 120×120 rect on them
    // would necessarily collide with the plaza or a neighbour, which is
    // exactly the test §4 exists to enforce. Scenery only.
    fog: [],
    animalSpot: PLAZA_CENTRE,
    animals: [],
    adventureIds: [],
    unlockedWhen: alwaysClosed,
  },
]

/** `!!sector.hit && sector.unlockedWhen(records)` — a sector with no `hit`
 *  can never be open, whatever its `unlockedWhen` says (design.md §5). */
export function isOpen(sector: ZooSector, records: Records): boolean {
  return !!sector.hit && sector.unlockedWhen(records)
}

/**
 * OD2: tapping a finished sector re-enters its FIRST adventure (D10,
 * `docs/18_DIAGNOSTICO_Y_REDISENO_PEDAGOGICO.md` — replacing the earlier
 * "re-enter the LAST adventure" rule). A sector that carries several
 * adventures back to back (the entrance's four enclosures; montañas' sheep
 * then llama) reads as one continuous story, and re-opening on the LAST one
 * only replayed its own final beat in isolation — for the entrance that
 * meant the mud path plus its huellas/lupa closing, with no trace of
 * peces/tortugas/monos ever having happened. Restarting from the FIRST
 * adventure replays the whole arc, which is what a child tapping a sector
 * they already finished is actually asking for. `null` only for a sector
 * with no adventures at all — today every fogged sector, and those are
 * never tappable anyway.
 */
export function nextAdventure(sector: ZooSector, records: Records): string | null {
  if (sector.adventureIds.length === 0) return null
  const firstUnfiled = sector.adventureIds.find((id) => !isFiled(records, id))
  return firstUnfiled ?? sector.adventureIds[0]
}

/** Which sector a level id belongs to, if any. `undefined` for a level no
 *  sector has adopted yet — today the hen's `trail1..4` and everything past
 *  the estanque's own eight ids. */
export function sectorOf(levelId: string): ZooSector | undefined {
  return SECTORS.find((sector) => sector.adventureIds.includes(levelId))
}

/**
 * The place the child has not gone yet, preferred over the place they have
 * not finished ([corrected] design.md §7.2, amendment: the proposal's own
 * rule — "the first open sector none of whose adventures has ever been
 * attempted," taken as the WHOLE rule — would regress to no sector for a
 * child mid-way through the entrance: `entrada` already has an attempt and
 * `estanque` is not yet open. The untouched-sector check below is a
 * PREFERENCE layered in front of paso A's own rule, never a replacement of
 * it, so this function must not start returning no sector while any open
 * sector still has unfinished work — every shipped scenario for the
 * fallback rule stays green.
 *
 * Derived, never persisted: `sectors.ts:441` (pre-this-change) proposed a
 * `<sector>-seen` key and this change declines it — a new persisted key
 * means a store version bump and a second migration in a change that
 * already carries one, and `attempts` (which the store already keeps)
 * answers "recently discovered" the way a child means it.
 */
export function recentlyDiscovered(records: Records): ZooSector | null {
  const untouched = SECTORS.find(
    (sector) =>
      isOpen(sector, records) &&
      sector.adventureIds.length > 0 &&
      sector.adventureIds.every((id) => (records[id]?.attempts ?? 0) === 0),
  )
  if (untouched) return untouched
  // The fallback: paso A's own rule, unchanged (the first open sector that
  // still has an unfinished adventure).
  return (
    SECTORS.find(
      (sector) => isOpen(sector, records) && sector.adventureIds.some((id) => !isFiled(records, id)),
    ) ?? null
  )
}

/**
 * Which animals stand where, right now. `STANDING_GRIP` is applied by
 * OVERRIDING the art's own grip for this one placement — `ANIMAL_ART`
 * entries declare no grip of their own (they default to box-centre when
 * held, e.g. in the deduction lineup), and the zoo is the one place an
 * animal is planted by its feet rather than centred (`docs/09` §3, "los
 * animales llevan el origen en las patas"). No second placer is written:
 * this still goes through `canvas/placeArt.ts`'s one function.
 */
export function animalPlacements(
  sector: ZooSector,
  records: Records,
): readonly { art: ArtImage; box: ArtBox }[] {
  const placed: { art: ArtImage; box: ArtBox }[] = []
  for (const animal of sector.animals) {
    if (!animal.appearsWhen.every((id) => isFiled(records, id))) continue
    const art = ZOO_ANIMAL_ART[animal.id]
    const box = placeArt({ ...art, grip: STANDING_GRIP }, animal.size, {
      x: sector.animalSpot.x + animal.dx,
      y: sector.animalSpot.y + animal.dy,
    })
    placed.push({ art, box })
  }
  return placed
}

/** How far, viewBox units, a footprint sits off the trail's own centreline —
 *  smaller than `detective/clues.ts`'s `FOOTPRINT_OFFSET` (10, sized against
 *  a 35-45-unit trail corridor) because the map has no corridor and its
 *  prints render at ~26 units tall rather than a clue mark's size. Its OWN
 *  constant, not an import: exporting the trail's number would tie a map
 *  coordinate to a corridor width, and widening a corridor would then
 *  silently move the map's footprints too (design.md §5). */
const PRINT_OFFSET = 12

/** The print art (134×256) is authored pointing along −y, so facing the
 *  walked direction needs this offset added to `atan2(dy, dx)` — measured
 *  from the file's aspect, not from looking at it (design.md §5). */
const PRINT_FACING = -90

export interface FootprintMark {
  x: number
  y: number
  /** Degrees, SVG `rotate(...)` convention. */
  angle: number
}

/**
 * A print every `step` units along the straight segment from `from` to `to`,
 * alternating sides of the line — the same alternation `detective/clues.ts`'s
 * `clueMarks` uses for its own footprint kind (`clues.ts:161-171`, "that is
 * what makes a track read as walking"), restated here at zoo scale because
 * the map has no polyline to walk, only two points.
 *
 * Interior arcs only (`step, 2×step, … ≤ dist − step`): a print under the
 * octopus or under the sector itself would be invisible either way, the
 * same reasoning `clueMarks`' `(i+1)/(count+1)` placement encodes for a
 * curved trail.
 */
export function footprintTrail(
  from: { x: number; y: number },
  to: { x: number; y: number },
  step = 40,
): readonly FootprintMark[] {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const dist = Math.hypot(dx, dy)
  if (dist <= 0 || step <= 0) return []
  const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI
  const rad = (angleDeg * Math.PI) / 180
  const ux = dx / dist
  const uy = dy / dist
  // SVG convention (y grows down, `rotate(deg)` turns clockwise): rotating
  // the tangent `(cos, sin)` by +90° gives the LEFT-hand normal `(-sin, cos)`
  // — `clues.ts:161-171`'s own derivation, reused verbatim.
  const nx = -Math.sin(rad)
  const ny = Math.cos(rad)
  const marks: FootprintMark[] = []
  let i = 0
  for (let arc = step; arc <= dist - step; arc += step) {
    const cx = from.x + ux * arc
    const cy = from.y + uy * arc
    const side = i % 2 === 0 ? 1 : -1
    marks.push({
      x: cx + nx * PRINT_OFFSET * side,
      y: cy + ny * PRINT_OFFSET * side,
      angle: angleDeg + PRINT_FACING,
    })
    i++
  }
  return marks
}

/** Each fog patch's rect, as the box `<image>` actually draws — the shipped
 *  placer (`canvas/placeArt.ts`), default (box-centre) grip, matching how a
 *  full-size scenery blob is meant to sit on its point. `flip` is a render
 *  detail (mirrors the picture, not the axis-aligned box) and does not
 *  change the returned rect — the containment proof in `sectors.test.ts`
 *  does not need to know about it. */
export function fogBoxes(sector: ZooSector): readonly ArtBox[] {
  return sector.fog.map((patch) => placeArt(ZOO_FOG_ART[patch.art], patch.size, { x: patch.x, y: patch.y }))
}

/**
 * Exact containment of `target` by the union of `boxes`, via coordinate
 * compression: collect every box edge that falls strictly inside `target`
 * plus `target`'s own edges, sort each axis, and check that some box
 * contains the CENTRE of every resulting cell. Exact for axis-aligned
 * rects — unlike grid sampling, it cannot step over a hole narrower than a
 * sampling stride, and unlike area comparison it stays correct when boxes
 * overlap (design.md §4's construction guarantees they do).
 */
export function coversRect(boxes: readonly ArtBox[], target: Rect): boolean {
  const xs = new Set<number>([target.x, target.x + target.w])
  const ys = new Set<number>([target.y, target.y + target.h])
  for (const box of boxes) {
    const x0 = box.x
    const x1 = box.x + box.width
    const y0 = box.y
    const y1 = box.y + box.height
    if (x0 > target.x && x0 < target.x + target.w) xs.add(x0)
    if (x1 > target.x && x1 < target.x + target.w) xs.add(x1)
    if (y0 > target.y && y0 < target.y + target.h) ys.add(y0)
    if (y1 > target.y && y1 < target.y + target.h) ys.add(y1)
  }
  const xsSorted = [...xs].sort((a, b) => a - b)
  const ysSorted = [...ys].sort((a, b) => a - b)
  for (let i = 0; i < xsSorted.length - 1; i++) {
    const cx = (xsSorted[i] + xsSorted[i + 1]) / 2
    for (let j = 0; j < ysSorted.length - 1; j++) {
      const cy = (ysSorted[j] + ysSorted[j + 1]) / 2
      const covered = boxes.some(
        (box) => cx >= box.x && cx <= box.x + box.width && cy >= box.y && cy <= box.y + box.height,
      )
      if (!covered) return false
    }
  }
  return true
}

/** Every real catalog level id — `zoo/stars.ts`'s `totalStars` and the
 *  registry↔catalog structural test both need this same set, so it is
 *  computed once here rather than twice. */
export const REAL_LEVEL_IDS: ReadonlySet<string> = new Set(LEVELS.map((level) => level.id))
