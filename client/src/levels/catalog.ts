// The MVP level catalog (docs/08 section 5). Everything playable is DATA:
// adding a level is adding an object to this array, never touching the engine.
//
// Phases 1-2 generate their paths parametrically (`paths.ts`), so amplitude,
// cycles and width can be retuned without redrawing anything. Phases 3-5 take
// their paths from the EXISTING letter pipeline (docs/08 section 6):
// `src/letters/svg/<char>.svg` → `buildLetterConfig()` for a single grapheme,
// and `buildWord()` for a linked group.
//
// Import-time resilience: a word whose members are not `isWordEligible` makes
// `buildWord` throw. That must NEVER blank the app, so the failure degrades to
// the first letter's own path and warns. A level always exists; at worst it is
// easier than authored.
// `GOAL_MEDUSA_ART` is no longer imported here: P2 (`odd/tasks/promised-
// animals.md`) removes `goalArt: GOAL_MEDUSA_ART` from all four `f2-*`
// levels below (their own comments explain why — the `fish` adventure row
// now supplies a real default, the bubble clue then the animal, that a
// level's own `goalArt` would otherwise keep overriding forever). The
// export itself stays in `detective/assets.ts`, still registered in
// `artManifest.test.ts`'s `REGISTERED` table — it ships no orphaned file,
// it simply has no consumer left in this catalog.
import {
  ANIMAL_ART,
  FLOWER_ART,
  HAZARD_STARFISH_ART,
  HEDGEHOG_ART,
  SECTOR_ADVENTURE_ART,
  ZOO_ANIMAL_ART,
} from '../detective/assets'
import { buildWord } from '../letters/combinations'
import { LETTER_REGISTRY } from '../letters/registry'
import type { LetterConfig } from '../letters/types'
import {
  bridges,
  crests,
  garland,
  garlandVaried,
  hills,
  lianas,
  loops,
  ovals,
  peakRidge,
  spinePolyline,
  spiral,
  squareWave,
  straight,
  sweep,
  switchback,
  transformPath,
  triangularWave,
  wave,
  waveVaried,
} from './paths'
import { DRAWN_SPINE, type ArtCorridorPiece } from './artCorridor'
import { fencePosts, furrowSegments } from './segments'
import type { LevelConfig, LevelFeedback, LevelRules, Phase } from './types'

/** Phase headings, as named in docs/08 section 5. */
export const PHASE_TITLES: Record<Phase, string> = {
  1: 'Control visomotor',
  2: 'Patrón continuo',
  3: 'Grafema aislado',
  4: 'Enlace',
  5: 'Palabra y automatización',
}

/**
 * Minimum accuracy per phase: the mazes are wide and forgiving, the letters are
 * not. 55 in phase 1, 60 in phase 2, 65 from the first grapheme on.
 *
 * `f1-libre` reuses the phase-1 number for a DIFFERENT quantity: on a `free`
 * level accuracy is COVERAGE, not nearness to a route (coverage.ts). 55 is not
 * a coincidence, it is a measurement: a single short line scores 4, a dense
 * scribble in one corner scores 13, and every model of a child covering the
 * whole sheet scores 60-90. The bar sits under that band ON PURPOSE — a free
 * warm-up has nothing to widen when it is failed (the adaptive corridor
 * (docs/03 section 4) has no corridor to widen here), so a bar the child cannot
 * clear would be the hard block docs/01 principle 3 forbids, and it would be
 * the very first screen of the app.
 */
function minAccuracyFor(phase: Phase): number {
  if (phase === 1) return 55
  if (phase === 2) return 60
  return 65
}

/**
 * Live feedback (docs/01 principle 2, docs/03 section 6). Tone and haptics are
 * on everywhere: leaving the corridor dims the trace and buzzes, it never marks
 * an error.
 *
 * `rail` is the "riel asistido" first-contact assist: it magnetizes the ink
 * toward the route, so it belongs to the FIRST route of a new kind of task and
 * nowhere else. Left on it stops being an assist and becomes the child's motor
 * plan.
 *
 * There is no metronome any more (T40, the author's play-test: "un coso de
 * ritmo que no sé para qué sirve ni nadie lo va a entender, sacalo").
 */
function feedback(rail: boolean): LevelFeedback {
  return { tone: true, haptics: true, rail }
}

/** Compact rule builder — every level declares the same four switches. */
function rules(
  phase: Phase,
  mustBeContinuous: boolean,
  enforceOrder: boolean,
  minFluency: number,
): LevelRules {
  return { mustBeContinuous, enforceOrder, minFluency, minAccuracy: minAccuracyFor(phase) }
}

/**
 * Path strings of a letter config: the per-subpath `segments` when the glyph
 * has pen-lift secondaries (a dot, a crossbar), otherwise the single stored
 * `d`. Both shapes are exactly what `LevelConfig.paths` means.
 */
function pathsOf(config: LetterConfig): string[] {
  return config.pathDefinition.segments ?? [config.pathDefinition.d]
}

/**
 * `docs/13` §8 row E — the drawn snake's own centreline, authored from the
 * SAME `ArtCorridorPiece` its art corridor uses, but through a DIFFERENT
 * code path than `placeArtCorridor`'s own internal one (path string →
 * `transformPathD` → `flattenPathD`, versus spine parameters →
 * `placeArtCorridor` → box) — which is what makes `artCorridor.test.ts`'s
 * coincidence a real proof rather than a tautology (design.md §1.4). No
 * `tx` here: `layOutPaths` applies the SAME centring translation to this
 * path string and to `placeArtCorridor`'s own derivation afterward, so the
 * two can never disagree about where the level sits.
 */
function snakePathD(piece: ArtCorridorPiece): string {
  const spine = DRAWN_SPINE[piece.spine]
  const height = (piece.span * piece.art.h) / piece.art.w
  const boxX = piece.at.x - piece.span / 2
  const boxY = piece.at.y - spine.mid * height
  const pivot = { x: boxX + piece.span / 2, y: boxY + height / 2 }
  const points = spine.points.map(([xFrac, yFrac]) => ({
    x: boxX + xFrac * piece.span,
    y: boxY + yFrac * height,
  }))
  const localD = spinePolyline(points)
  return transformPath(localD, { rotate: piece.rotate ?? 0, pivot })
}

/**
 * The three snake pieces shared by `snake1`, `snake2` and `snake4`
 * (design.md §3.4: "Per-snake spans are fixed across the family (they ARE
 * the seriation); the level scale `s_L` and the rotation are the per-level
 * knobs" — all three of these levels share `s_L = 1`, `rotate = 0`).
 * Smallest first, matching `DRAWN_SPINE`'s own seriation and
 * `enforceOrder`'s numbering.
 */
function snakeHorizontalPieces(): readonly ArtCorridorPiece[] {
  return [
    // `at.x` is 446.04, not 500: `traceFrom`/`traceTo` are not symmetric
    // about a piece's own box centre (each snake's traceable span is
    // measured off the drawing, not authored), so the DRAWN centreline's
    // own bounding box sits off-centre from the box even when every piece
    // shares one `at.x`. 446.04 is the corrected value that lands the
    // union's own centroid exactly on the sheet centre, so `layOutPaths`'s
    // `tx` measures under 0.5 (R6) — found by measuring, not guessed.
    // (Re-measured for `fix-snakes-true-alignment`: the stored centreline
    // now spans the FULL `[traceFrom, traceTo]` instead of stopping short at
    // an inner zero-crossing, which grows each piece's own path noticeably
    // — the old 455.66 no longer centres the union; tx measured -9.62
    // before this correction.)
    //
    // `at.y` was corrected by a reviewer's screenshot (docs/13 §4 decision
    // 3, design.md §3.6): `93.2`/`319.1`/`531.7` sat the small and large
    // snakes' boxes well past `fondo arena.png`'s own quiet, uniform sand
    // band (measured directly off the source PNG: rows 204-819 are luma
    // 204.4 with ZERO row-to-row variance; the rock/palm bands on either
    // side are not). Mapped through `xMidYMid slice`'s own crop
    // (`zoo/backdrops.ts`'s `corridorRows: {top: 51, bottom: 973}`, source
    // px → viewBox: `(row - 51) * (1000/1536)`), that quiet band is viewBox
    // y `[99.48, 499.87]` — 400.39 units tall.
    //
    // This does NOT fully solve the placement, and design.md §3.6 says so:
    // the quiet band (400.39 units) and the three boxes' own heights
    // summed (106.17 + 148.29 + 144.40 = 398.86) leave only 1.53 units of
    // slack — but C3/C4 (`catalog.test.ts`'s "minimum centreline separation
    // clears 2·corridorWidth and 2·60") independently requires every pair
    // of centrelines to stay over 120 apart even at their wave's closest
    // approach, which a zero-gap stack fails (measured minSep ≈ 83, both
    // pairs). The two constraints are provably incompatible at this scale
    // (design.md §3.6's own arithmetic): honouring C3/C4 needs centre-to-
    // centre gaps of at least ~53/~28 units above the bare sum of half-
    // heights, which pushes the LARGE snake's box back out past the quiet
    // band's bottom edge by ~74.6 of its own 144.4 units (down from the
    // original ~99, a real reduction, not a full fix). The SMALL snake's
    // box, at the top, does now sit fully inside the quiet band (0
    // overlap, down from ~59). C3/C4 was chosen over full quiet-band
    // containment because it is a scoring-safety constraint (two routes
    // read as one below it), not a visual one.
    {
      art: SECTOR_ADVENTURE_ART.snakeSmall,
      greyArt: SECTOR_ADVENTURE_ART.snakeSmallGrey,
      spine: 'snakeSmall',
      span: 520,
      at: { x: 446.04, y: 152.7 },
    },
    {
      art: SECTOR_ADVENTURE_ART.snakeMedium,
      greyArt: SECTOR_ADVENTURE_ART.snakeMediumGrey,
      spine: 'snakeMedium',
      span: 640,
      at: { x: 446.04, y: 332.9 },
    },
    {
      art: SECTOR_ADVENTURE_ART.snakeLarge,
      greyArt: SECTOR_ADVENTURE_ART.snakeLargeGrey,
      spine: 'snakeLarge',
      span: 760,
      at: { x: 446.04, y: 507.3 },
    },
  ]
}

/**
 * `snake2`'s own vertical arrangement (T20 follow-up, orchestrator screenshot
 * review, docs/18 T1 "never the same drawing twice in a row"): with the drag
 * step gone, `snake2` rendered IDENTICAL to `snake1` — the same three
 * horizontal snakes in the same top-to-bottom small→medium→large stack.
 * docs/19 §3.1's own preferred fix ("sizes in another order") applies here:
 * LARGE on top, medium in the middle, SMALL on the bottom — the reverse of
 * `snakeHorizontalPieces()` — while every piece keeps `rotate: 0` (still
 * traced head-to-tail, LOW x to HIGH x — never right-to-left, cursive prep)
 * and the `paths`/`artCorridor` ARRAY stays in [small, medium, large] order,
 * so `enforceOrder`'s own small→large seriation (and the colour mechanic's
 * `nextWakingIndex` pulse) is untouched: only WHERE each piece sits changes,
 * never which one traces first.
 *
 * The two vertical gaps are NOT interchangeable — re-derived by measurement,
 * not by guessing a symmetric flip. `snakeHorizontalPieces()`'s own comment
 * documents that its small-medium gap (180.2) needed a `+53` margin above
 * the bare sum of half-heights to clear C3/C4, while its medium-large gap
 * (174.4) only needed `+28` — i.e. SMALL's own wave needs more clearance
 * against medium than LARGE's does. A naive mirror (reusing 180.2 for
 * large-medium and 174.4 for medium-small) would put medium-small at a
 * gap 5.8 units short of what small actually needs, failing C3/C4 the same
 * way a zero-gap stack does. So this arrangement keeps small's own PAIRING
 * distance to medium (180.2) and large's own PAIRING distance to medium
 * (174.4) exactly as measured — only the DIRECTION each sits in flips
 * (large above medium instead of below; small below medium instead of
 * above) — verified against the real geometry by `catalog.test.ts`'s C1-C6
 * suite and its own "quiet sand band" regression, both extended to cover
 * this arrangement rather than skipping it for `snake2`.
 */
function snakeHorizontalPiecesReordered(): readonly ArtCorridorPiece[] {
  const MEDIUM_Y = 332.9 // unchanged from `snakeHorizontalPieces()` — the middle slot
  const LARGE_MEDIUM_GAP = 178.4 // see MEDIUM_SMALL_GAP's own comment: widened from 174.4
  // 180.2 (small's own gap to medium in `snakeHorizontalPieces()`) measured
  // C4 at 118.12 here — short of the required >120 by 1.88 units. The two
  // arrangements are NOT identical even though the pairing distance is the
  // same number: `snakeHorizontalPieces()` pairs small-above-medium with
  // medium ALSO below large, while this arrangement pairs medium between
  // large-above and small-below — a different THIRD neighbour changes which
  // point of each wave sits closest to which, so the same centre-to-centre
  // gap does not guarantee the same worst-case closest approach. Widened by
  // 3 (to 183.2) for headroom over the 1.88 measured shortfall, then
  // reconfirmed against the real geometry, not assumed.
  const MEDIUM_SMALL_GAP = 183.2
  return [
    {
      art: SECTOR_ADVENTURE_ART.snakeSmall,
      greyArt: SECTOR_ADVENTURE_ART.snakeSmallGrey,
      spine: 'snakeSmall',
      span: 520,
      at: { x: 446.04, y: MEDIUM_Y + MEDIUM_SMALL_GAP },
    },
    {
      art: SECTOR_ADVENTURE_ART.snakeMedium,
      greyArt: SECTOR_ADVENTURE_ART.snakeMediumGrey,
      spine: 'snakeMedium',
      span: 640,
      at: { x: 446.04, y: MEDIUM_Y },
    },
    {
      art: SECTOR_ADVENTURE_ART.snakeLarge,
      greyArt: SECTOR_ADVENTURE_ART.snakeLargeGrey,
      spine: 'snakeLarge',
      span: 760,
      at: { x: 446.04, y: MEDIUM_Y - LARGE_MEDIUM_GAP },
    },
  ]
}

/** `snake3`'s three VERTICAL pieces, at `s_L = 0.72` (design.md §3.4: three
 *  oblique snakes fit the sheet at no scale that also clears the phase-1
 *  span guard; three vertical ones fit comfortably at 0.72). `rotate: -90`
 *  puts the tail at the bottom and the head at the top. */
function snakeVerticalPieces(): readonly ArtCorridorPiece[] {
  return [
    // Column x's are 197.95/497.95/797.95, not 200/500/800: the same
    // traceFrom/traceTo asymmetry that shifts the horizontal levels' `at.x`
    // (see `snakeHorizontalPieces`) shifts these columns too, once rotated
    // — corrected by measuring so `layOutPaths`'s `tx` clears R6's 0.5 bound.
    {
      art: SECTOR_ADVENTURE_ART.snakeSmall,
      greyArt: SECTOR_ADVENTURE_ART.snakeSmallGrey,
      spine: 'snakeSmall',
      span: 374.4,
      at: { x: 197.95, y: 300 },
      rotate: -90,
    },
    {
      art: SECTOR_ADVENTURE_ART.snakeMedium,
      greyArt: SECTOR_ADVENTURE_ART.snakeMediumGrey,
      spine: 'snakeMedium',
      span: 460.8,
      at: { x: 497.95, y: 300 },
      rotate: -90,
    },
    {
      art: SECTOR_ADVENTURE_ART.snakeLarge,
      greyArt: SECTOR_ADVENTURE_ART.snakeLargeGrey,
      spine: 'snakeLarge',
      span: 547.2,
      at: { x: 797.95, y: 300 },
      rotate: -90,
    },
  ]
}

/** Live feedback shared by all four snake levels (design.md §6.1's frozen
 *  shape). */
const SNAKE_FEEDBACK: LevelFeedback = { tone: true, haptics: true, rail: false }

/** Level ids that fell back to a degraded path at import time (diagnostics). */
const degraded: string[] = []

/**
 * Paths for a single grapheme (phase 3). An unregistered character cannot
 * happen with the bundled SVG set, but it must not throw at import either:
 * it degrades to the phase-1 straight path so the catalog still loads.
 */
function letterPaths(id: string, char: string): string[] {
  const config = LETTER_REGISTRY[char]
  if (!config) {
    degraded.push(id)
    console.warn(
      `[levels] El nivel '${id}' no encontró la letra '${char}' en el registro; ` +
        'se degradó a un camino recto. Revisá src/letters/svg/.',
    )
    return [straight()]
  }
  return pathsOf(config)
}

/**
 * Paths for a linked group or word (phases 4-5). `buildWord` throws when a
 * member is not word-eligible (its stroke does not start at its entry anchor —
 * docs/08 section 6). That is an authoring problem, not a runtime one: the
 * level degrades to the FIRST letter's own path and warns, so the catalog
 * never throws and the app never blanks.
 */
function wordPaths(id: string, chars: string[]): string[] {
  try {
    return pathsOf(buildWord(chars))
  } catch (error) {
    degraded.push(id)
    const reason = error instanceof Error ? error.message : String(error)
    console.warn(
      `[levels] El nivel '${id}' no pudo componer '${chars.join('')}' (${reason}); ` +
        `se degradó a la letra '${chars[0]}' sola.`,
    )
    return letterPaths(id, chars[0])
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Fase 1 — Control visomotor. TODA LA HOJA EN BLANCO, no el renglón.
//
// `detective-mode` retheme (design units 9-10): the six unthemed corridor
// levels below are RETIRED — moved unwired to `LEGACY_PHASE_1` further down —
// and replaced by four themed detective trails, each carrying exactly one
// clue kind. `f1-libre` stays, rethemed as the opening beat of the case and
// explicitly clue-free (level-engine spec, "f1-libre Retheme Carries No
// Clue").
//
// Motor volume is restored by CONFIG, not level count (proposal Q1): the
// four trails between them keep the taper narrowing, the timed hazard and
// the arc-length total the six removed levels offered — asserted directly in
// `catalog.test.ts` ("Total arc length does not regress") rather than eyed.
// The themed hazard sits on trail 1 alone (design C3: it has the most open
// interior of the four, and the spiral's 120-unit radial gap against a
// 70-unit corridor leaves no room for one).
//
//   f1-libre  free scribble, rethemed as the case's opening page — no clue
//   trail1    droplet / sine wave — carries the one themed hazard
//   trail2    corn / counter-clockwise coil (D2, reuses the shipped spiral())
//   trail3    footprint / triangular wave — sharp corners, no curve to approx
//   trail4    feather / square wave — sharp corners, both clearance rules
//
// `demo: true` on every trail (design C1): the shell renders no title, hint
// or coach text in the detective world (`LevelPlay.tsx`'s `inDetectiveWorld`
// branch, `levels/world.ts`, already shipped in S3), so the engine's existing
// pre-attempt route animation is what replaces the written instruction —
// shown, not written.
//
// Every trail sets `carrier: true`: that carrier IS the magnifying glass.
// `LevelPlay.tsx` passes `carrierArt` with the ink glass override in the
// detective world, so the shipped sage shape never renders here.
//
// These shipped `carrier: false` for one slice, because the override existed
// on `TraceCanvas` and nothing passed it — the mode's central mechanic was
// missing while the suite stayed green, held there by a test that asserted
// the gap. If a trail ever reads `carrier: false` again, the glass is gone.
// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// The entrance (`docs/12` §1, design.md §5): eight reveal-grid levels, the
// app's OPENING (`LEVELS[0]` is `glass1`, design.md §5.1, ratified amendment
// A1) — inserted ahead of `f1-libre`, which is what `game/migrateEntrance.ts`
// exists to protect (design.md §8.1). Two `mode: 'erase'` families, one per
// backdrop (`glass`/`sand`), each following `docs/13` §2's own progression:
// wide, forgiving passes first, then narrower and more demanding ones
// (`radius` non-increasing, `minAccuracy` non-decreasing, `cols*rows`
// non-decreasing — R1-R3, `catalog.test.ts`).
//
// No path, no corridor, no wall to reset from — `haptics: true` stays ON
// even though `kind: 'free'` has no corridor, because a tile clearing under
// the finger IS the contact worth feeling here (design.md §5.2); every other
// `feedback` switch matches `f1-libre`'s own shape. Backdrops resolve
// per-ADVENTURE, not per-level (`zoo/backdrops.ts`'s `ADVENTURE_BACKDROP`/
// `PENDING_ENTRANCE_BACKDROP`, wired by Phase 5), so no level here names its
// own art.
// ─────────────────────────────────────────────────────────────────────────────
const ENTRANCE: LevelConfig[] = [
  {
    id: 'glass1',
    phase: 1,
    title: 'El vidrio sucio',
    hint: 'Pasá el dedo por el vidrio para limpiarlo todo.',
    kind: 'free',
    surface: 'blank',
    maze: false,
    resetOnContact: false,
    carrier: false,
    feedback: { tone: false, haptics: true, rail: false },
    paths: [],
    corridorWidth: 0,
    rules: { ...rules(1, false, false, 0), minAccuracy: 55 },
    showGuide: false,
    letters: [],
    reveal: { mode: 'erase', cols: 10, rows: 6, radius: 110 },
  },
  {
    id: 'glass2',
    phase: 1,
    title: 'Todo el vidrio',
    hint: 'Ahora limpiá cada rincón del vidrio.',
    kind: 'free',
    surface: 'blank',
    maze: false,
    resetOnContact: false,
    carrier: false,
    feedback: { tone: false, haptics: true, rail: false },
    paths: [],
    corridorWidth: 0,
    rules: { ...rules(1, false, false, 0), minAccuracy: 68 },
    showGuide: false,
    letters: [],
    reveal: { mode: 'erase', cols: 10, rows: 6, radius: 110 },
  },
  {
    id: 'glass3',
    phase: 1,
    // `glass3`/`glass4` are the `monos` adventure (`zoo/adventures.ts`), whose
    // backdrop veil is `LEAF_LITTER`, not glass grime: only the child-facing
    // title/hint move to the leaves here. The IDs, `rules`, and `reveal`
    // geometry stay byte-identical — R1-R3's progression is asserted on those
    // numbers, and renaming a level is a progress-store migration, not copy.
    title: 'Hojas en los rincones',
    hint: 'Buscá las hojas que quedaron en los rincones.',
    kind: 'free',
    surface: 'blank',
    maze: false,
    resetOnContact: false,
    carrier: false,
    feedback: { tone: false, haptics: true, rail: false },
    paths: [],
    corridorWidth: 0,
    rules: { ...rules(1, false, false, 0), minAccuracy: 76 },
    showGuide: false,
    letters: [],
    reveal: { mode: 'erase', cols: 15, rows: 9, radius: 110 },
  },
  {
    id: 'glass4',
    phase: 1,
    title: 'Ni una hoja',
    hint: 'Juntá todas las hojas, sin dejar ninguna.',
    kind: 'free',
    surface: 'blank',
    maze: false,
    resetOnContact: false,
    carrier: false,
    feedback: { tone: false, haptics: true, rail: false },
    paths: [],
    corridorWidth: 0,
    rules: { ...rules(1, false, false, 0), minAccuracy: 82 },
    showGuide: false,
    letters: [],
    reveal: { mode: 'erase', cols: 15, rows: 9, radius: 80 },
  },
  // sand1 restarts wide on purpose: a new surface is a new first challenge
  // (`docs/13` §5 item 3, the same licence the llamas took) — no ordering is
  // required or asserted against `glass4` (design.md §5.4, ratified
  // amendment A2).
  {
    id: 'sand1',
    phase: 1,
    title: 'Barrer la arena',
    hint: 'Barré la arena de la entrada con el dedo.',
    kind: 'free',
    surface: 'blank',
    maze: false,
    resetOnContact: false,
    carrier: false,
    feedback: { tone: false, haptics: true, rail: false },
    paths: [],
    corridorWidth: 0,
    rules: { ...rules(1, false, false, 0), minAccuracy: 60 },
    showGuide: false,
    letters: [],
    reveal: { mode: 'erase', cols: 10, rows: 6, radius: 110 },
  },
  {
    id: 'sand2',
    phase: 1,
    title: 'Toda la entrada',
    hint: 'Barré toda la entrada, de punta a punta.',
    kind: 'free',
    surface: 'blank',
    maze: false,
    resetOnContact: false,
    carrier: false,
    feedback: { tone: false, haptics: true, rail: false },
    paths: [],
    corridorWidth: 0,
    rules: { ...rules(1, false, false, 0), minAccuracy: 70 },
    showGuide: false,
    letters: [],
    reveal: { mode: 'erase', cols: 15, rows: 9, radius: 110 },
  },
  {
    id: 'sand3',
    phase: 1,
    title: 'La arena fina',
    hint: 'La arena es más fina: barré con cuidado.',
    kind: 'free',
    surface: 'blank',
    maze: false,
    resetOnContact: false,
    carrier: false,
    feedback: { tone: false, haptics: true, rail: false },
    paths: [],
    corridorWidth: 0,
    rules: { ...rules(1, false, false, 0), minAccuracy: 78 },
    showGuide: false,
    letters: [],
    reveal: { mode: 'erase', cols: 20, rows: 12, radius: 90 },
  },
  {
    id: 'sand4',
    phase: 1,
    title: 'La última pasada',
    hint: 'Dale la última pasada a toda la arena.',
    kind: 'free',
    surface: 'blank',
    maze: false,
    resetOnContact: false,
    carrier: false,
    feedback: { tone: false, haptics: true, rail: false },
    paths: [],
    corridorWidth: 0,
    rules: { ...rules(1, false, false, 0), minAccuracy: 85 },
    showGuide: false,
    letters: [],
    reveal: { mode: 'erase', cols: 20, rows: 12, radius: 70 },
  },
]

/** How tall a dolphin is drawn, in viewBox units.
 *
 *  `docs/09` §3 sizes animals at ~140, and 140 DOES NOT FIT. Pre-T26, this
 *  picture stood BESIDE the route (`vertexArt: { place: 'extrema', clear:
 *  8 }`), pushed clear of the channel wall, and the ceiling on that pushed-out
 *  box was 300 − amplitude − corridorWidth/2 − clear = 140 − 55 − 8 = 77
 *  (design.md A3, §5.2) at `dolphin1`'s own numbers — 64 was chosen to spend
 *  83% of that ceiling with room to spare.
 *
 *  [T26, `docs/19` §3: "cada delfín que pasás se suma"] The dolphin family now
 *  authors `collect: { items: 'extrema', art: ..., size: DOLPHIN_SIZE }`
 *  instead of a standing `vertexArt` — the SAME `routeExtrema` positions
 *  (`levels/dolphinExtrema.ts`), but drawn ON the route like every other
 *  collect family (sheep/llama/duck), never pushed outward: a collect item
 *  hops to the bar once earned, so there is no permanent picture left beside
 *  the channel to clear it FROM. The old pushed-out ceiling no longer bounds
 *  this number, and 64 is kept unchanged for visual continuity with every
 *  other shipped rung — `catalog.test.ts` now asserts the collect config
 *  directly rather than the retired clear-of-the-wall geometry. */
const DOLPHIN_SIZE = 64

const PHASE_1: LevelConfig[] = [
  ...ENTRANCE,
  {
    id: 'f1-libre',
    phase: 1,
    title: 'El caso empieza',
    hint: 'Antes de investigar, dibujá lo que quieras por toda la hoja.',
    // The most literal answer to "que sea libre": no route, no corridor, no
    // rule about where to start or which way to go. The child warms the arm up.
    // No `clue` field — clue-free by design (level-engine spec, "f1-libre
    // contributes no clue" / "f1-libre is not tracked by the clue reducer").
    kind: 'free',
    surface: 'blank',
    maze: false,
    resetOnContact: false,
    carrier: false,
    // Nothing to be inside of, so there is no tone to sustain and no wall to
    // buzz against: the only feedback is the ink itself.
    feedback: { tone: false, haptics: false, rail: false },
    paths: [],
    corridorWidth: 0,
    // No path means no checkpoints, so order cannot be validated; and lifting
    // the finger is not a defect when there is nothing to draw continuously.
    rules: rules(1, false, false, 0),
    // There is no guide to draw.
    showGuide: false,
    letters: [],
  },
  // ───────────────────────────────────────────────────────────────────────
  // The duck case (case-registry-and-captions design.md §3): themed trails
  // inserted BEFORE `trail1`. `game/migrateDuckCase.ts` protects a returning
  // child's positional unlock of `trail1..4` across that first insertion.
  //
  // One undulation family (`docs/13` §2, duck-undulations design §1): each
  // step is a wave with more half-arches, a steeper peak slope and a
  // narrower corridor than the one before (100 → 95 → 90 → 85 → 80 → 70) —
  // never a shape that belongs to another animal (`docs/13` §4: the spiral
  // is the snail's, the garland the fish's, the loops the monkey's, the
  // square/triangular shapes the sheep's).
  //
  // [T21, `docs/19` §2.3/§7 slice 3] Recipe A: the case's own pistas levels
  // first, then the deduction, then the recovered duck FAMILY gathered with
  // `LevelConfig.collect` (T17's engine), never a clue.
  //
  // [T40, author's tablet play-test 2026-09-27: "Las pistas del pato quiero
  // que haya una por nivel así que tiene que haber un par más de niveles del
  // pato."] ONE clue kind per level. T29 had squeezed four clues into two
  // levels by alternating a second kind along each trail; that alternation
  // is gone, and two new levels (`duck-trail5`, `duck-trail6`) carry the two
  // clues it used to double up. Ids are persisted keys, so the new ones are
  // numbered after the old ones even though they play in between;
  // `zoo/adventures.ts`'s `duck.levelIds` is the play order, and
  // `game/migrateDuckOneCluePerLevel.ts` files both for a child who already
  // collected all four clues. `droplet` (rules out the cat) and `feather`
  // (rules out the cow) stay the case's two RULING clues (`cases.ts`'s
  // `ruledOutBy`); `corn` and `webfoot` are the duck's other two traces.
  //
  //   duck-trail1  droplet (pistas) / one broad cycle — the pond's edge
  //   duck-trail5  corn    (pistas) / one and a half cycles, ending on a crest
  //   duck-trail2  feather (pistas) / two cycles
  //   duck-trail6  webfoot (pistas) / two and a half cycles → the deduction
  //   duck-trail3  collect the duck family / two cycles with per-cycle amplitude variation
  //   duck-trail4  collect the duck family / three cycles, tapered narrower
  // ───────────────────────────────────────────────────────────────────────
  {
    id: 'duck-trail1',
    phase: 1,
    // [T44, `docs/21` N1] The duck's first level became the bridges: "El
    // pato salió del agua a los saltitos, de charco en charco." Same id
    // (saved progress), same clue kind; the shape and the copy changed.
    title: 'De charco en charco',
    hint: 'Hacé los puentes del pato y pasá por todos los charquitos.',
    kind: 'path',
    surface: 'blank',
    maze: true,
    resetOnContact: true,
    carrier: true,
    // FIRST CONTACT with a routed trail in the duck case: the rail is on
    // here and nowhere else, the same convention `trail1` carries.
    feedback: feedback(true),
    // [T44, `docs/21` §3.1.1] Four bridges `∩` left to right, the arcade the
    // Colina family (`m n v w`) is made of; the duck's waves never turn the
    // other way round over a crest with a shared foot. `bridges()` rather
    // than `hills()`: at four arches a sheet with this 100 corridor, the
    // hills' crest would bend tighter than the corridor's half-width (see
    // the generator's header). Measured on the cubics (`catalog.test.ts`'s
    // T44 block): crest radius ≈71, inside of every arch ≈105 open at
    // mid-height. Span 310 (150-460), so it still trains the arm like every
    // phase-1 trail. Neighbouring bridges share their foot, the pillar of the
    // bridge, where the stroke comes down and goes back up the same way.
    paths: [bridges({ x0: 60, x1: 940, yTop: 150, yBase: 460, cycles: 4, footRise: 190, footLean: 6, topHandle: 100 })],
    corridorWidth: 100,
    rules: rules(1, false, true, 0),
    showGuide: true,
    letters: [],
    demo: true,
    // [T21] The duck case's own first RULING clue (`cases.ts`'s
    // `ruledOutBy.gato`), "the duck came out of the water dripping"
    // (`docs/19` §3's own pato flavour line). [T43] `puddle` (`docs/22` C1)
    // replaces the plain `droplet`, which stays for `trail1` only. [T44] One
    // puddle at the foot of every pillar between two bridges (`at:
    // 'valleys'`), not one every 60 units: the duck hopped from puddle to
    // puddle.
    clue: { kind: 'puddle', spacing: 60, at: 'valleys' },
  },
  {
    id: 'duck-trail5',
    phase: 1,
    // [T43] Renamed from "El maíz del pato": the kernel became the seeds of
    // `docs/22` C5.
    title: 'Las semillas del pato',
    hint: 'Seguí las semillas sin salirte.',
    kind: 'path',
    surface: 'blank',
    maze: true,
    resetOnContact: true,
    carrier: true,
    feedback: feedback(false),
    // [T40] Three half-arches (crest, trough, crest): the first wave that
    // ends climbing, a shape no other duck level draws. Peak slope
    // 4·170/273 ≈ 2.49, between `duck-trail1`'s 1.66 and `duck-trail2`'s 3.32.
    paths: [wave({ x0: 90, x1: 910, y: 300, amplitude: 170, cycles: 1.5 })],
    corridorWidth: 95,
    rules: rules(1, false, true, 0),
    showGuide: true,
    letters: [],
    demo: true,
    // [T40] What the duck pecked at the puddle's edge — T29's non-ruling
    // second kind on `duck-trail1`, now a level of its own. [T43] `seeds`
    // (`docs/22` C5) replaces `corn`, which stays for `trail2` only.
    clue: { kind: 'seeds', spacing: 60 },
  },
  {
    id: 'duck-trail2',
    phase: 1,
    // [T40] Renamed from "El sendero de migas" / "Seguí las migas": this
    // trail has carried feathers since T21, never crumbs.
    title: 'Las plumas del pato',
    hint: 'Seguí las plumas sin salirte.',
    kind: 'path',
    surface: 'blank',
    maze: true,
    resetOnContact: true,
    carrier: true,
    feedback: feedback(false),
    paths: [wave({ x0: 90, x1: 910, y: 300, amplitude: 170, cycles: 2 })],
    corridorWidth: 90,
    rules: rules(1, false, true, 0),
    showGuide: true,
    letters: [],
    demo: true,
    // [T21] The duck case's own second RULING clue (`cases.ts`'s
    // `ruledOutBy.vaca`, "a cow has no feathers"). [T43] `duckFeather`
    // (`docs/22` C2, a yellow duck feather) replaces the hen's green
    // `feather`, which stays for `trail4` and the hen case only.
    clue: { kind: 'duckFeather', spacing: 60 },
  },
  {
    id: 'duck-trail6',
    phase: 1,
    title: 'Las huellas del pato',
    hint: 'Seguí las huellas del pato, ola por ola.',
    kind: 'path',
    surface: 'blank',
    maze: true,
    resetOnContact: true,
    carrier: true,
    feedback: feedback(false),
    // [T40] Five half-arches, ending on a crest like `duck-trail5` but with
    // two more humps. Peak slope 4·170/164 ≈ 4.15, between `duck-trail2`'s
    // 3.32 and `duck-trail3`'s 4.69.
    paths: [wave({ x0: 90, x1: 910, y: 300, amplitude: 170, cycles: 2.5 })],
    corridorWidth: 85,
    rules: rules(1, false, true, 0),
    showGuide: true,
    letters: [],
    demo: true,
    // [T40] The webbed footprint — T29's non-ruling second kind on
    // `duck-trail2`, now a level of its own. Never a `ruledOutBy` verdict
    // (`cases.test.ts`'s "webfoot and breadcrumb rule nobody out"). This is
    // the LAST pistas level (`cases.ts`'s `duck.trailIds`): finishing it is
    // what routes into the deduction (`zoo/adventures.ts`'s
    // `duck.deduction.after`).
    clue: { kind: 'webfoot', spacing: 60 },
  },
  {
    id: 'duck-trail3',
    phase: 1,
    // [T40] Renamed from "Las burbujas suben y bajan" / "Seguí las
    // burbujas": the level collects ducklings, and the author heard the
    // narrator send the child after bubbles that were not there.
    title: 'Los patitos en las olas',
    // [T41] The duck adventure's inhibition step: the first hazard of the
    // journey, one slow fish. The hint names it and the strategy.
    hint: '¡Cuidado con el pez que salta! Esperá que pase y juntá a los patitos.',
    kind: 'path',
    surface: 'blank',
    maze: true,
    resetOnContact: true,
    carrier: true,
    feedback: feedback(false),
    // The per-cycle variation step (`docs/13` §2, "variación de
    // amplitud"): two cycles of differing amplitude via `waveVaried`, the
    // one thing a plain `wave` cannot express (one global amplitude only).
    // The two cycles meet at a real 8.71° kink (C1 holds within a cycle, not
    // across one of differing amplitude) — accepted, not hidden: making it
    // zero would force the amplitude constant, which is exactly the
    // variation this step exists to introduce (design.md §1).
    paths: [
      waveVaried({
        x0: 90,
        y: 300,
        cycles: [
          { width: 470, amplitude: 155 },
          { width: 350, amplitude: 205 },
        ],
      }),
    ],
    corridorWidth: 80,
    rules: rules(1, false, true, 0),
    showGuide: true,
    letters: [],
    demo: true,
    // [T21, `docs/19` §1/§2.1 step 4] Past the deduction, the case is
    // already solved — this level (and `duck-trail4`) gathers the recovered
    // duck FAMILY along the waves, the same `collect` mechanic
    // `sheep-hill`/`llama-peak` ship (T17), never a clue: `'crests'`
    // (`levels/collect.ts`'s `waveCrestArcs`, NOT `'peaks'`/`routeApexes` —
    // that function finds zero apexes on this smooth a wave, see its own
    // header) derives one duckling per wave crest plus one more at the
    // route's end. `ANIMAL_ART.pato` scaled down stands in for a real
    // duckling — there is no smaller-duck art yet (flagged to the author as
    // a new art request, `docs/20`'s own `B…` numbering; T21's own report
    // names it `B16`).
    collect: { items: 'crests', art: ANIMAL_ART.pato, size: 40 },
    // [T41, author: "que aprendan cuándo frenar y no hacer todo apurado"]
    // One fish jumping across the pond, on the first descending flank, well
    // clear of the first crest's duckling (`catalog.test.ts`'s T41 block
    // measures every clearance, including the stretch where a child stops to
    // wait). `travel` 272 is 3.4× the 80 corridor, shifted 20 toward the open
    // water below the flank; the slowest period of all (3200) because this is
    // the child's first hazard in the journey. The corridor walls keep this
    // level's own reset rule (T29: collected ducklings stay collected).
    obstacles: [{ at: 0.25, travel: 272, shift: 20, periodMs: 3200, phase: 0, radius: 30 }],
    hazardArt: ZOO_ANIMAL_ART.pez,
  },
  {
    id: 'duck-trail4',
    phase: 1,
    // [T40] Renamed from "El rastro de plumas" / "Seguí el rastro de
    // plumas": no feathers here either, only the last ducklings.
    title: 'Los últimos patitos',
    hint: 'El camino se angosta: juntá a los últimos patitos.',
    kind: 'path',
    surface: 'blank',
    maze: true,
    // `{from: 1, to: 0.85}` against `corridorWidth: 70` keeps this step
    // narrower than step 3's fixed 80 along its ENTIRE length: `1.15` would
    // have started it at 80.5, wider than step 3 at one end.
    taper: { from: 1, to: 0.85 },
    resetOnContact: true,
    carrier: true,
    feedback: feedback(false),
    // The last step of the undulation family: the most cycles (three) AND
    // the tightest, narrowing corridor — the directive's progression
    // accumulates, so the last step keeps everything before it and adds the
    // final demand.
    paths: [wave({ x0: 90, x1: 910, y: 300, amplitude: 170, cycles: 3 })],
    corridorWidth: 70,
    rules: rules(1, false, true, 0),
    showGuide: true,
    letters: [],
    demo: true,
    // [T21] Same reasoning as `duck-trail3` above — the last of the duck
    // family, gathered along the route's three crests plus the end.
    collect: { items: 'crests', art: ANIMAL_ART.pato, size: 40 },
  },
  {
    id: 'trail1',
    phase: 1,
    title: 'El sendero del agua',
    hint: 'Seguí el sendero de punta a punta.',
    kind: 'path',
    surface: 'blank',
    maze: true,
    // Narrows as the route runs, same "el sendero se estrecha" idea the
    // retired `f1-travesia` carried.
    taper: { from: 1.15, to: 0.85 },
    // ONE themed hazard (design C3: trail 1 has the most open interior of the
    // four, and it is the only trail this change places a hazard on). Sits at
    // the midpoint, with room to approach, stop and go on either side.
    obstacles: [{ at: 0.5, travel: 220, periodMs: 2400, phase: 0, radius: 30 }],
    resetOnContact: true,
    carrier: true,
    // The rail's first-contact slot moved to `duck-trail1` when the duck
    // case was inserted ahead of this trail (design.md §3) — it is now the
    // actual first routed level of phase 1, and the rail is on there and
    // nowhere else, same convention the retired `f1-travesia` carried
    // (docs/03 section 6).
    feedback: feedback(false),
    // A broad sinusoid across the whole sheet — the droplet's open water.
    paths: [wave({ x0: 90, x1: 910, y: 300, amplitude: 200, cycles: 3 })],
    corridorWidth: 90,
    rules: rules(1, false, true, 0),
    showGuide: true,
    letters: [],
    demo: true,
    // Arc-length spacing, not a fixed count (defect fix: "far more clue
    // marks; the trail must look walked-on" — the user's reference is a
    // trail densely covered in marks, like footprints, not five pickups).
    // 60 units sits in the middle of the target 55-70 range; `clueCountFor`
    // (`detective/clues.ts`) turns that into ~42 marks on this trail's real
    // ~2607-unit length (spacing ≈ 60.6). Same 60 on every trail below, so
    // density reads the same regardless of each trail's own length: trail2
    // (~1719 units) → ~28 marks (≈59.3), trail3 (~2536) → ~41 (≈60.4),
    // trail4 (~3240) → ~53 (≈60.0).
    clue: { kind: 'droplet', spacing: 60 },
  },
  {
    id: 'trail2',
    phase: 1,
    // Counter-clockwise on purpose: the same turn the `a` family needs later
    // (D2, `explore.md` §5.3 — the proposal's overturned sawtooth suggestion).
    title: 'El caracol de maíz',
    hint: 'Girá para este lado, sin levantar el dedo.',
    kind: 'path',
    surface: 'blank',
    maze: true,
    resetOnContact: true,
    carrier: true,
    feedback: feedback(false),
    // Shipped defaults, counter-clockwise: no override, so the radial gap
    // stays exactly the 120 units the corridor width below is measured against.
    paths: [spiral()],
    // 70 against the generator's 120 radial gap leaves ~50 units of visible
    // wall between the arms; wider merges the turns into a filled disc (D2,
    // `paths.ts:498-502`).
    corridorWidth: 70,
    rules: rules(1, true, true, 0),
    showGuide: true,
    letters: [],
    demo: true,
    clue: { kind: 'corn', spacing: 60 },
  },
  {
    id: 'trail3',
    phase: 1,
    title: 'El sendero de huellas',
    hint: 'Seguí las huellas de punta a punta.',
    kind: 'path',
    surface: 'blank',
    maze: true,
    resetOnContact: true,
    carrier: true,
    feedback: feedback(false),
    // Sharp-corner sibling of `wave()`: every footprint sits at a real elbow,
    // not a rounded crest (level-engine spec, "Generators emit only supported
    // commands" — `triangularWave` is `M`/`L` only).
    paths: [triangularWave({ x0: 90, x1: 910, y: 300, amplitude: 200, cycles: 3 })],
    corridorWidth: 90,
    rules: rules(1, false, true, 0),
    showGuide: true,
    letters: [],
    demo: true,
    clue: { kind: 'footprint', spacing: 60 },
  },
  {
    id: 'trail4',
    phase: 1,
    title: 'El sendero de plumas',
    hint: 'Seguí el sendero, esquina por esquina.',
    kind: 'path',
    surface: 'blank',
    maze: true,
    // The last taper of the catalog, same narrowing shape the retired
    // `f1-pasillo` carried.
    taper: { from: 1.2, to: 0.8 },
    resetOnContact: true,
    carrier: true,
    feedback: feedback(false),
    // `run: 220`, `amplitude: 160` against `corridorWidth: 70` satisfies BOTH
    // `cornerClearance` (run ≥ 2·corridorWidth ⇒ 220 ≥ 140) and `armClearance`
    // (amplitude ≥ corridorWidth ⇒ 160 ≥ 70, wall 250 against a 49 threshold —
    // level-engine spec, "Square-Wave Corner Constraint").
    paths: [squareWave({ x0: 100, mid: 300, amplitude: 160, run: 220, cycles: 3 })],
    corridorWidth: 70,
    rules: rules(1, false, true, 0),
    showGuide: true,
    letters: [],
    demo: true,
    clue: { kind: 'feather', spacing: 60 },
  },
  // ───────────────────────────────────────────────────────────────────────
  // Row C (`docs/13` §8): the sheep and llama ridge families. Appended to
  // the END of PHASE_1 (design.md §4.5) — `f2-guirnalda`'s dev-only
  // `LevelMap` predecessor moves from `duck-trail4` to `sheep-hill4`, an
  // accepted test-mode-only cost, not a defect to migrate away.
  //
  // Sheep — `montañitas cortas`, ladera (docs/13 §2: amplias → más
  // repeticiones → alternancia → reducción del ancho). Llamas — `picos
  // altos y empinados`, cumbre (un pico claro → pico alto y pico bajo →
  // varios picos → mayor precisión). Both share a base at y=480; the sheep
  // rise 320 (peak y 160), the llamas 360 (peak y 120) — `docs/13` §3's
  // "misma montaña, dos alturas", drawn (design.md §1.4).
  //
  // Not in the detective world (design.md §3.1: MUD_INK against the stone
  // channel clears the luma law by only 12, and the window that would admit
  // it is empty) — `carrier: false`, no `clue`, no `detectiveWorld`. Not a
  // case (`docs/13` §4 decision 1: row C is caretaker content).
  // ───────────────────────────────────────────────────────────────────────
  // [T45, `docs/21` N5] The sheep's own case (recipe A since the author's
  // decision 1 of `docs/21` §6, 2026-10-02): a pistas level first, then
  // "¿De quién es esta lana?", then the sheep gathered on the hills below. Five
  // fence posts, each its OWN stroke top to bottom (`segments`): land on the
  // top, pull down, stop at the bottom and lift. The straight downstroke
  // with a real start and stop no other level trains (§3.1.4, §3.2.6). One
  // tuft of wool on each post lights when its post is done. Walls forgive
  // (`resetOnContact: false`): a post that goes wrong is simply drawn again,
  // and the posts already done stay done.
  {
    id: 'sheep-lana',
    phase: 1,
    title: 'La lana del alambrado',
    hint: 'Bajá por cada poste, de arriba abajo, y frená al final. Buscá la lana.',
    kind: 'path',
    surface: 'blank',
    maze: true,
    resetOnContact: false,
    carrier: true,
    feedback: feedback(false),
    // Span 130-470 clears the phase-1 "whole sheet" guard; 160 units between
    // posts leaves 70 of open sheet between two 90-wide corridors, and the
    // run (centred to 180-820) leaves room left of the first post for the
    // octopus to stand clear of every post (`segmentStandPoint`).
    paths: fencePosts({ x0: 210, x1: 850, top: 130, bottom: 470, count: 5 }),
    corridorWidth: 90,
    rules: rules(1, false, true, 0),
    showGuide: true,
    letters: [],
    demo: true,
    segments: { startReach: 70, stopReach: 55 },
    // One tuft per 340-unit post (`clueCountFor(340, 170)` = 1).
    clue: { kind: 'wool', spacing: 170 },
  },
  {
    id: 'sheep-hill1',
    phase: 1,
    title: 'Las dos lomas',
    hint: 'Seguí el lomo de las dos ovejas, de punta a punta.',
    kind: 'path',
    surface: 'blank',
    maze: true,
    resetOnContact: true,
    carrier: false,
    feedback: feedback(true),
    paths: [peakRidge({ x0: 90, x1: 910, base: 480, heights: [320, 320] })],
    corridorWidth: 100,
    rules: rules(1, false, true, 0),
    showGuide: true,
    letters: [],
    demo: true,
    // T17 (docs/19 §2.2, §3.4): one sheep collected per peak plus one more
    // at the route's end — `'peaks'` derives both from the route's own
    // apexes. REPLACES a standing `vertexArt`/`goalArt`: the sheep now only
    // stands while its own item is un-collected (`LevelPlay.tsx`'s
    // collect-driven `vertexArt`/`vertexArtDeparting`), so authoring both
    // here would draw the same picture twice.
    collect: { items: 'peaks', art: SECTOR_ADVENTURE_ART.sheep, size: 56 },
  },
  {
    id: 'sheep-hill2',
    phase: 1,
    title: 'Tres lomas seguidas',
    hint: 'Seguí las tres lomas seguidas sin salirte.',
    kind: 'path',
    surface: 'blank',
    maze: true,
    resetOnContact: true,
    carrier: false,
    feedback: feedback(false),
    paths: [peakRidge({ x0: 90, x1: 910, base: 480, heights: [320, 320, 320] })],
    corridorWidth: 90,
    rules: rules(1, false, true, 0),
    showGuide: true,
    letters: [],
    // T17: same mechanic as sheep-hill1's own `collect` — see its comment.
    collect: { items: 'peaks', art: SECTOR_ADVENTURE_ART.sheep, size: 56 },
  },
  {
    id: 'sheep-hill3',
    phase: 1,
    title: 'Una alta y una bajita',
    // [T41] Names the stone and the strategy (the stop is the new demand).
    hint: '¡Cuidado con la piedra que rueda! Esperá que pase y seguí las lomas.',
    kind: 'path',
    surface: 'blank',
    maze: true,
    resetOnContact: true,
    carrier: false,
    feedback: feedback(false),
    paths: [peakRidge({ x0: 90, x1: 910, base: 480, heights: [320, 170, 320] })],
    corridorWidth: 80,
    rules: rules(1, false, true, 0),
    showGuide: true,
    letters: [],
    // T17: same mechanic as sheep-hill1's own `collect` — see its comment.
    collect: { items: 'peaks', art: SECTOR_ADVENTURE_ART.sheep, size: 56 },
    // [T41] One stone rolling across the climb to the last tall peak. The
    // ridge's flanks stand close (an 80 corridor on 273-unit peaks), so this
    // is the one spot where a swing opens a real gap without reaching the
    // flank before it: a small stone (radius 22) on a swing shifted 35 units
    // up the slope's outer side, measured in `catalog.test.ts`'s T41 block
    // (a first try at the valley swept back over the flank the child waits
    // on). Not on `sheep-hill4`: its 60 corridor is the narrowest of the
    // family, and a stop there would stack two demands on the hardest step.
    obstacles: [{ at: 0.71, travel: 240, shift: -35, periodMs: 3200, phase: 0, radius: 22 }],
    hazardArt: SECTOR_ADVENTURE_ART.stone,
  },
  {
    id: 'sheep-hill4',
    phase: 1,
    title: 'La ladera angosta',
    hint: 'La ladera se angosta: seguí despacito.',
    kind: 'path',
    surface: 'blank',
    maze: true,
    taper: { from: 1, to: 0.85 },
    resetOnContact: true,
    carrier: false,
    feedback: feedback(false),
    paths: [peakRidge({ x0: 90, x1: 910, base: 480, heights: [320, 170, 320, 170] })],
    corridorWidth: 60,
    rules: rules(1, false, true, 0),
    showGuide: true,
    letters: [],
    // T17: same mechanic as sheep-hill1's own `collect` — see its comment.
    collect: { items: 'peaks', art: SECTOR_ADVENTURE_ART.sheep, size: 56 },
  },
  {
    id: 'llama-peak1',
    phase: 1,
    title: 'El pico de la llama',
    hint: 'Subí hasta la punta del pico y bajá.',
    kind: 'path',
    surface: 'blank',
    maze: true,
    resetOnContact: true,
    carrier: false,
    feedback: feedback(false),
    paths: [peakRidge({ x0: 90, x1: 910, base: 480, heights: [360] })],
    corridorWidth: 90,
    rules: rules(1, false, true, 0),
    showGuide: true,
    letters: [],
    demo: true,
    // T17 (docs/19 §2.2, §3.4): same mechanic as the sheep — see
    // sheep-hill1's own comment — one llama per peak plus one at the end.
    collect: { items: 'peaks', art: SECTOR_ADVENTURE_ART.llama, size: 64 },
  },
  {
    id: 'llama-peak2',
    phase: 1,
    title: 'Pico alto y pico bajo',
    hint: 'Un pico bien alto, después uno más bajo.',
    kind: 'path',
    surface: 'blank',
    maze: true,
    resetOnContact: true,
    carrier: false,
    feedback: feedback(false),
    paths: [peakRidge({ x0: 90, x1: 910, base: 480, heights: [360, 180] })],
    corridorWidth: 80,
    rules: rules(1, false, true, 0),
    showGuide: true,
    letters: [],
    // T17: same mechanic as llama-peak1's own `collect` — see its comment.
    collect: { items: 'peaks', art: SECTOR_ADVENTURE_ART.llama, size: 64 },
  },
  {
    id: 'llama-peak3',
    phase: 1,
    title: 'Tres picos seguidos',
    // [T41] Names the stone and the strategy.
    hint: '¡Cuidado con la piedra que rueda! Esperá que pase y seguí los picos.',
    kind: 'path',
    surface: 'blank',
    maze: true,
    resetOnContact: true,
    carrier: false,
    feedback: feedback(false),
    paths: [peakRidge({ x0: 90, x1: 910, base: 480, heights: [360, 360, 360] })],
    corridorWidth: 70,
    rules: rules(1, false, true, 0),
    showGuide: true,
    letters: [],
    // T17: same mechanic as llama-peak1's own `collect` — see its comment.
    collect: { items: 'peaks', art: SECTOR_ADVENTURE_ART.llama, size: 64 },
    // [T41] One stone rolling through the valley between the second and
    // third peaks, down into the open ground under the ridge. Mid-flank the
    // peaks stand too close for any swing that opens a gap (it reaches the
    // flank before); the valley is where the sheet opens up. 245 travel
    // (3.5 × 70) keeps the clear window over half the cycle
    // (`hazardGapFraction`). `llama-peak4` (60, the narrowest) stays free.
    obstacles: [{ at: 0.665, travel: 245, shift: 10, periodMs: 3000, phase: 0, radius: 28 }],
    hazardArt: SECTOR_ADVENTURE_ART.stone,
  },
  {
    id: 'llama-peak4',
    phase: 1,
    title: 'La cumbre angosta',
    hint: 'La cumbre se angosta: caminá con cuidado.',
    kind: 'path',
    surface: 'blank',
    maze: true,
    taper: { from: 1, to: 0.85 },
    resetOnContact: true,
    carrier: false,
    feedback: feedback(false),
    paths: [peakRidge({ x0: 90, x1: 910, base: 480, heights: [360, 360, 360, 360] })],
    corridorWidth: 60,
    rules: rules(1, false, true, 0),
    showGuide: true,
    letters: [],
    // T17: same mechanic as llama-peak1's own `collect` — see its comment.
    collect: { items: 'peaks', art: SECTOR_ADVENTURE_ART.llama, size: 64 },
  },
  // ───────────────────────────────────────────────────────────────────────
  // The night sector (`docs/12`, design.md §5): four `mode: 'light'`
  // reveal-grid levels, the last four entries of phase 1 — `docs/13` §2's
  // "búsqueda más intencional" step. No ordering is required or asserted
  // against `sand4` (design.md §5.4, ratified amendment A2: an erase radius
  // accumulates cleared area across an attempt, a light radius does not
  // persist anything, so the two are not comparable quantities).
  //
  // [T25, `odd/tasks/prewriting-stage-completion.md`, `docs/19` §3.2]
  // SUPERSEDES the original design's arbitrary rising hidden-object count
  // (1, 2, 3, 3 — R4) with the night CASE's own story: what is hidden is
  // specifically the erizo's own belongings (a leaf, a bitten apple, a
  // mushroom), found before the deduction ever asks "who eats these at
  // night?" — so the counts are now 1/2/2/1 (`night4` drops to ONE object,
  // the curled erizo itself, `docs/19`'s own reveal at the end of the
  // sector), not a difficulty curve. `detective/cases.ts`'s `night` case
  // reads these same three concepts (leaf/apple/mushroom) as its own chip
  // row (`DetectiveCase.clueArt`); [T43] all three are real art since
  // `docs/20` B12 landed. `chest` is
  // dropped from this family entirely: a treasure chest has nothing to do
  // with a hedgehog (`docs/19`'s own diagnosis of the pre-T25 design:
  // "cofres y piedras que no tienen que ver con nadie").
  // ───────────────────────────────────────────────────────────────────────
  {
    id: 'night1',
    phase: 1,
    title: 'Una luz en la noche',
    hint: 'Movete con la linterna y encontrá lo que brilla.',
    kind: 'free',
    surface: 'blank',
    maze: false,
    resetOnContact: false,
    carrier: false,
    feedback: { tone: false, haptics: true, rail: false },
    paths: [],
    corridorWidth: 0,
    rules: { ...rules(1, false, false, 0), minAccuracy: 100 },
    showGuide: false,
    letters: [],
    // T33 (`odd/tasks/prewriting-stage-completion.md`, docs/18 P5/D24): the
    // night's own first level plays a one-shot torch-sweep intro instead of
    // the (never-available, `kind: 'free'`) route demo — "mostrar antes de
    // pedir" for the one mechanic in this app with no demo at all until now.
    introCue: true,
    // Defect fix (play-test 2026-09-25, T2 item 1: "a single tap anywhere
    // turns the whole level to day"): the chest used to sit at (500, 300) —
    // the sheet's exact geometric centre, which is also where a curious
    // child's very first blind touch on an all-dark screen is most likely to
    // land. With only ONE object (R4) and this family's widest radius (200,
    // R5's own frame-budget ceiling for a 15x9 grid, not a gameplay choice —
    // see the archived `2026-09-13-reveal-grid-entrance-and-night/design.md`
    // §5.2), that first touch already sat inside the find radius, so the
    // level ended before any searching happened. Moved off-centre so the
    // obvious first tap misses (distance to the old centre point is ~358,
    // well past `radius: 200`) and the child has to move the torch — the
    // search `docs/13` §2 calls for. `radius`/grid/family ordering (R1-R8)
    // are unchanged.
    // T25 (`docs/19` §3.2): a leaf, the erizo's own first trace — the real
    // art already exists (✓). Position/radius unchanged from the pre-T25
    // fix (the "first blind tap" defect note above still applies: this spot
    // sits ~358 units from centre, well past `radius: 200`).
    reveal: {
      mode: 'light',
      cols: 15,
      rows: 9,
      radius: 200,
      objects: [{ art: SECTOR_ADVENTURE_ART.leaf, size: 64, x: 180, y: 460 }],
    },
  },
  {
    id: 'night2',
    phase: 1,
    title: 'Dos cosas perdidas',
    hint: 'Alumbrá despacio: hay dos cosas escondidas.',
    kind: 'free',
    surface: 'blank',
    maze: false,
    resetOnContact: false,
    carrier: false,
    feedback: { tone: false, haptics: true, rail: false },
    paths: [],
    corridorWidth: 0,
    rules: { ...rules(1, false, false, 0), minAccuracy: 100 },
    showGuide: false,
    letters: [],
    // T25 (`docs/19` §3.2): a bitten apple and another leaf. [T43] The
    // apple is real art now (`docs/20` B12), no longer the leaf standing in.
    // Positions/radius unchanged from the pre-T25 config.
    reveal: {
      mode: 'light',
      cols: 15,
      rows: 9,
      radius: 170,
      objects: [
        { art: SECTOR_ADVENTURE_ART.apple, size: 64, x: 260, y: 180 },
        { art: SECTOR_ADVENTURE_ART.leaf, size: 64, x: 740, y: 420 },
      ],
    },
  },
  {
    id: 'night3',
    phase: 1,
    // T25 (`docs/19` §3.2 table): this level finds a mushroom and another
    // apple ([T43] real `docs/20` B12 art; they were the stone and the leaf
    // standing in) — two things, not three; the
    // title/hint below were "tres"/"las tres" before this task dropped the
    // unrelated `chest` object (this family's own header comment).
    title: 'Dos cosas más en la oscuridad',
    hint: 'Buscá las dos cosas escondidas en la oscuridad.',
    kind: 'free',
    surface: 'blank',
    maze: false,
    resetOnContact: false,
    carrier: false,
    feedback: { tone: false, haptics: true, rail: false },
    paths: [],
    corridorWidth: 0,
    rules: { ...rules(1, false, false, 0), minAccuracy: 100 },
    showGuide: false,
    letters: [],
    reveal: {
      mode: 'light',
      cols: 20,
      rows: 12,
      radius: 140,
      objects: [
        { art: SECTOR_ADVENTURE_ART.mushroom, size: 72, x: 200, y: 140 },
        { art: SECTOR_ADVENTURE_ART.apple, size: 64, x: 820, y: 200 },
      ],
    },
  },
  // [T44, `docs/21` N2] The night case's last clue, after the three
  // searches and before the deduction: the hedgehog's own trail, followed
  // in the dark. A routed level with NO visible corridor (`torch`): the
  // octopus's torch shows a pool of light around the fingertip and the
  // hedgehog's prints are the only guide (`docs/21` §3.2.7, "seguir un trazo
  // sin corredor"), left to right along one long, gentle wave that ends at
  // an apple, the hedgehog's own (`docs/19` §3.2). Forgiving walls
  // (`resetOnContact: false`): a wall the child cannot see must never send
  // them back; the tone sounds while the finger is on the trail and the ink
  // dims off it, so the trail can still be felt. Wider than any lit trail
  // (110) for the same reason. Clue marks are only lit from inside the
  // corridor (`LevelPlay`'s `shouldTickClue`), so wandering off the prints
  // earns nothing.
  {
    id: 'night-rastro',
    phase: 1,
    title: 'Las huellitas en la oscuridad',
    hint: 'Alumbrá el piso y seguí las huellitas del erizo hasta la manzana.',
    kind: 'path',
    surface: 'blank',
    maze: true,
    resetOnContact: false,
    carrier: true,
    feedback: feedback(false),
    // One and a half gentle cycles: a long, low swing across the whole sheet,
    // amplitude 155 so it still spans the arm's 300 units (phase 1).
    paths: [wave({ x0: 90, x1: 910, y: 300, amplitude: 155, cycles: 1.5 })],
    corridorWidth: 110,
    rules: rules(1, false, true, 0),
    showGuide: true,
    letters: [],
    demo: true,
    // `docs/22` C7, registered by T43 for this level. Spaced wider than the
    // lit trails (70): a few prints at a time under the light, "cada tanto".
    clue: { kind: 'hedgehogPrint', spacing: 70 },
    goalArt: SECTOR_ADVENTURE_ART.apple,
    torch: { radius: 130 },
  },
  {
    id: 'night4',
    phase: 1,
    // T25 (`docs/19` §3.2): this is where the erizo itself turns up, curled
    // up from the fright — the night case's own rescue, not one more
    // hidden-object level. ONE object now (was three unrelated props), so
    // the title/hint no longer promise a search among several things.
    title: 'Algo se mueve en la oscuridad',
    hint: 'La luz es más chica: alumbrá bien de cerca.',
    kind: 'free',
    surface: 'blank',
    maze: false,
    resetOnContact: false,
    carrier: false,
    feedback: { tone: false, haptics: true, rail: false },
    paths: [],
    corridorWidth: 0,
    rules: { ...rules(1, false, false, 0), minAccuracy: 100 },
    showGuide: false,
    letters: [],
    // Off-centre for the same reason `night1`'s own fix documents (~322
    // units from the sheet's (500, 300) centre, well past `radius: 110`): a
    // curious first blind tap must not win the level outright.
    reveal: {
      mode: 'light',
      cols: 20,
      rows: 12,
      radius: 110,
      objects: [{ art: HEDGEHOG_ART.curled, size: 120, x: 220, y: 460 }],
    },
  },
  // Víboras en la arena (`docs/13` §8 row E, `snake-drag-and-art-corridor`;
  // T20 `odd/tasks/prewriting-stage-completion.md`, docs/19 §3.1 dropped the
  // drag step). The arena sector's own four levels: the art corridor IS the
  // drawn snake, fitted at build time (design.md §1). The three pieces now
  // start already in their FINAL corridor position on every level — no
  // `arrange` config anywhere in this family any more — and the seriation
  // `docs/13` §2 originally taught through dragging (smallest snake first)
  // is carried instead by `enforceOrder: true` (scoring: the child must
  // trace small→medium→large) together with the colour-follows-the-finger
  // mechanic's own "next to wake" pulse (`screen/snakeColour.ts`'s
  // `nextWakingIndex`, `canvas/ArtCorridorLayer.tsx`'s `.cv-snake-next`) —
  // the Pulpito-less stand-in for docs/19's "El Pulpito señala cuál sigue".
  // `enforceOrder: true` on all four is the only rule that requires every
  // one of the three snakes to be traced — accuracy alone is scored as
  // nearest-neighbour distance to the UNION of the three bands (design.md
  // §0 A3).
  {
    id: 'snake1',
    phase: 1,
    title: 'Tres víboras en la arena',
    hint: 'Las víboras están grises. Acariciálas de la cabeza a la cola.',
    kind: 'path',
    surface: 'blank',
    maze: false,
    resetOnContact: false,
    carrier: false,
    feedback: SNAKE_FEEDBACK,
    paths: snakeHorizontalPieces().map(snakePathD),
    // Lowered from an earlier 48 (task 8.7/8.8): the channel must stay
    // under the body EVERYWHERE along the wave, not just at its median
    // cross-section — a screenshot caught `SAND_HOLLOW` poking out past
    // the small/medium snake's own thinnest trough at 48. 38 clears C1's
    // corrected, MINIMUM-thickness margin comfortably (design.md §3.2 C1).
    corridorWidth: 38,
    rules: { ...rules(1, false, true, 0), minAccuracy: 55 },
    showGuide: true,
    letters: [],
    demo: true,
    artCorridor: snakeHorizontalPieces(),
  },
  {
    id: 'snake2',
    phase: 1,
    title: 'De la más chica a la más grande',
    // T20: no more "arrastrá" — the drag/arrange step is gone (docs/19
    // §3.1). The seriation lesson (`docs/13` §2's "encontrar la más chica")
    // now comes from tracing them in size order while the colour mechanic
    // shows which one is awake.
    hint: 'Acariciá primero la más chica, después la mediana y la más grande.',
    kind: 'path',
    surface: 'blank',
    maze: false,
    resetOnContact: false,
    carrier: false,
    feedback: SNAKE_FEEDBACK,
    // T20 follow-up: `snakeHorizontalPiecesReordered()`, not
    // `snakeHorizontalPieces()` — large on top, small on the bottom (docs/19
    // §3.1's "sizes in another order"), so this level no longer renders
    // identically to `snake1` now that the drag step is gone. `paths` and
    // `artCorridor` share the SAME array (art-corridor spec's "one shared
    // placement function"), so the two can never disagree about geometry.
    paths: snakeHorizontalPiecesReordered().map(snakePathD),
    corridorWidth: 34, // lowered from 42 alongside snake1's own correction
    rules: { ...rules(1, false, true, 0), minAccuracy: 62 },
    showGuide: true,
    letters: [],
    artCorridor: snakeHorizontalPiecesReordered(),
  },
  {
    id: 'snake3',
    phase: 1,
    title: 'Víboras paradas',
    hint: 'Están de pie. Acariciálas de abajo arriba, de más chica a más grande.',
    kind: 'path',
    surface: 'blank',
    maze: false,
    resetOnContact: false,
    carrier: false,
    feedback: SNAKE_FEEDBACK,
    paths: snakeVerticalPieces().map(snakePathD),
    // Lowered from 36 to `MIN_CORRIDOR` itself (design.md §3.5's own named
    // lever): at `s_L = 0.72` the vertical family's C1 margin is the
    // tightest in the family (task 8.7/8.8's correction made it tighter
    // still), and 30 is as far as it goes without also raising `s_L` —
    // which C6 has no room left to give (the vertical box already nearly
    // fills the 600-tall sheet).
    corridorWidth: 30,
    rules: { ...rules(1, false, true, 0), minAccuracy: 70 },
    showGuide: true,
    letters: [],
    artCorridor: snakeVerticalPieces(),
  },
  {
    id: 'snake4',
    phase: 1,
    title: 'El desierto angosto',
    hint: 'El camino es angosto. Con cuidado, de la más chica a la más grande.',
    kind: 'path',
    surface: 'blank',
    maze: false,
    resetOnContact: false,
    carrier: false,
    feedback: SNAKE_FEEDBACK,
    paths: snakeHorizontalPieces().map(snakePathD),
    // Below `MIN_CORRIDOR` (30) on purpose: `snake3`'s own authored value
    // now sits exactly at that floor, and R1 still needs `snake4` strictly
    // BELOW it. The engine clamps the EFFECTIVE width to 30 regardless
    // (`buildLevel.ts`'s own `clamp`), so `snake3` and `snake4` play at the
    // identical real corridor either way — already true of every pair at
    // or under 56 (design.md §6.2's own finding, restated here at the
    // family's tightest end rather than contradicted by it).
    corridorWidth: 28,
    rules: { ...rules(1, false, true, 0), minAccuracy: 76 },
    showGuide: true,
    letters: [],
    artCorridor: snakeHorizontalPieces(),
  },
  // Las abejas en el bosque (`docs/13` §8 row F, `free-trail-waypoints`).
  // The forest's own four levels: no route at all — the child invents the
  // trail, the bee follows it immediately, and the errand is "pass through
  // the flowers and reach the hive" (`levels/waypoints.ts`). The frozen
  // shape below is forced by shipped guards, not chosen: `showGuide: false`
  // by `catalog.test.ts`'s own `kind !== 'free'` rule, `enforceOrder: false`
  // by the same rule, `tone: false` by the phase-1 corridor tables (no
  // corridor at all), `corridorWidth: 0` / `minFluency: 0` by the
  // routeless-level convention the reveal grid already established. No
  // `demo` (amendment A2 — the engine's demo animates `target.paths`, which
  // is empty on every free level). `minAccuracy: 100` matches the four
  // `night*` light-mode levels' own completion criterion: every authored
  // object found. Ladder: 1 → 3 → 3 (longer) → 3 (tighter), radii strictly
  // decreasing 110 → 84 → 62 → 38 (design.md §4.4's worked instantiation).
  {
    id: 'bee1',
    phase: 1,
    title: 'La primera flor',
    hint: 'Dibujá un camino desde la abeja hasta la flor, y después hasta el panal.',
    kind: 'free',
    surface: 'blank',
    maze: false,
    resetOnContact: false,
    carrier: true,
    carrierArt: { art: SECTOR_ADVENTURE_ART.bee, size: 76 },
    feedback: { tone: false, haptics: true, rail: false },
    paths: [],
    corridorWidth: 0,
    rules: { ...rules(1, false, false, 0), minAccuracy: 100 },
    showGuide: false,
    letters: [],
    // T33 (`odd/tasks/prewriting-stage-completion.md`, docs/18 P5/D24): the
    // bee's own first level plays a one-shot intro nudging toward the first
    // flower instead of the (never-available, `kind: 'free'`) route demo —
    // D24's own "sin demo ni consigna; no se entiende qué hacer".
    introCue: true,
    waypoints: {
      start: { x: 250, y: 400 },
      stops: [{ x: 500, y: 265, radius: 110 }],
      stopArt: FLOWER_ART,
      stopSize: 64,
      goal: { x: 750, y: 385, radius: 96 },
      goalArt: SECTOR_ADVENTURE_ART.honeycomb,
      goalSize: 96,
    },
  },
  {
    id: 'bee2',
    phase: 1,
    title: 'Varias flores',
    hint: 'Pasá por las tres flores y llevá a la abeja hasta el panal.',
    kind: 'free',
    surface: 'blank',
    maze: false,
    resetOnContact: false,
    carrier: true,
    carrierArt: { art: SECTOR_ADVENTURE_ART.bee, size: 76 },
    feedback: { tone: false, haptics: true, rail: false },
    paths: [],
    corridorWidth: 0,
    rules: { ...rules(1, false, false, 0), minAccuracy: 100 },
    showGuide: false,
    letters: [],
    waypoints: {
      start: { x: 250, y: 400 },
      stops: [
        { x: 380, y: 280, radius: 84 },
        { x: 520, y: 395, radius: 84 },
        { x: 660, y: 275, radius: 84 },
      ],
      stopArt: FLOWER_ART,
      stopSize: 64,
      goal: { x: 750, y: 390, radius: 88 },
      goalArt: SECTOR_ADVENTURE_ART.honeycomb,
      goalSize: 96,
    },
  },
  {
    id: 'bee3',
    phase: 1,
    title: 'El trayecto más largo',
    // [T41] Names the leaf and the strategy; the flowers stay in the hint.
    hint: 'Pasá por las flores. ¡Cuidado con la hoja! Esperá que pase y seguí.',
    kind: 'free',
    surface: 'blank',
    maze: false,
    resetOnContact: false,
    carrier: true,
    carrierArt: { art: SECTOR_ADVENTURE_ART.bee, size: 76 },
    feedback: { tone: false, haptics: true, rail: false },
    paths: [],
    corridorWidth: 0,
    rules: { ...rules(1, false, false, 0), minAccuracy: 100 },
    showGuide: false,
    letters: [],
    waypoints: {
      start: { x: 90, y: 420 },
      stops: [
        { x: 300, y: 145, radius: 62 },
        { x: 560, y: 455, radius: 62 },
        { x: 800, y: 160, radius: 62 },
      ],
      stopArt: FLOWER_ART,
      stopSize: 64,
      goal: { x: 930, y: 305, radius: 80 },
      goalArt: SECTOR_ADVENTURE_ART.honeycomb,
      goalSize: 96,
    },
    // [T41] A leaf blown back and forth across the way from the second
    // flower to the third. A bee level has no route, so the hazard is pinned
    // to the midpoint of that leg (`centre`) and swings across it (39°, the
    // leg's own perpendicular) far enough that going around it is a long
    // detour: waiting is the short way. Touching it sends the bee back to
    // its start with every opened flower still open (T29's rule; the latch
    // approves, `levelCompletion.ts`). `bee4` (smallest flowers) stays free.
    obstacles: [
      { at: 0, centre: { x: 680, y: 307 }, swingDeg: 39, travel: 300, periodMs: 3000, phase: 0, radius: 30 },
    ],
    hazardArt: SECTOR_ADVENTURE_ART.leaf,
  },
  {
    id: 'bee4',
    phase: 1,
    title: 'Mayor precisión',
    hint: 'Las flores son más chicas ahora. Con cuidado, llevá a la abeja hasta el panal.',
    kind: 'free',
    surface: 'blank',
    maze: false,
    resetOnContact: false,
    carrier: true,
    carrierArt: { art: SECTOR_ADVENTURE_ART.bee, size: 76 },
    feedback: { tone: false, haptics: true, rail: false },
    paths: [],
    corridorWidth: 0,
    rules: { ...rules(1, false, false, 0), minAccuracy: 100 },
    showGuide: false,
    letters: [],
    waypoints: {
      start: { x: 95, y: 175 },
      stops: [
        { x: 320, y: 440, radius: 38 },
        { x: 555, y: 142, radius: 38 },
        { x: 790, y: 445, radius: 38 },
      ],
      stopArt: FLOWER_ART,
      stopSize: 64,
      goal: { x: 930, y: 230, radius: 72 },
      goalArt: SECTOR_ADVENTURE_ART.honeycomb,
      goalSize: 96,
    },
  },
  {
    id: 'dolphin1',
    phase: 1,
    title: 'Los primeros delfines',
    hint: 'Seguí el camino entre los delfines, de punta a punta.',
    kind: 'path',
    surface: 'blank',
    maze: true,
    resetOnContact: false,
    carrier: true,
    feedback: feedback(false),
    // §2 step 1 — pocos delfines y separación amplia: 2 cycles, the widest
    // channel and the widest half-period in the family (design.md §4.2).
    paths: [wave({ x0: 90, x1: 910, y: 300, amplitude: 160, cycles: 2 })],
    corridorWidth: 110,
    rules: rules(1, false, true, 0),
    showGuide: true,
    letters: [],
    demo: true,
    // [T26, `docs/19` §3.3/§7 recipe B: "cada delfín que pasás se suma"; no
    // deduction on this row (`zoo/adventures.ts`'s `dolphin` — recipe B is
    // "the place already says who it is"), so every level here just gathers
    // the family, the same collect-along-the-path mechanic T17/T21 ship.
    // `'extrema'` (`levels/collect.ts`) reuses `levels/dolphinExtrema.ts`'s
    // `routeExtrema` — the SAME crest-and-trough points the pre-T26
    // `vertexArt: { place: 'extrema' }` stood a dolphin picture on — so a
    // returning child sees a dolphin in exactly the spot they already
    // expect, now earned by passing through it rather than merely painted
    // there. Replaces `vertexArt` outright (never both: `sheep-hill1`'s own
    // T17 comment states the rule, "authoring both here would draw the same
    // picture twice"). The collected dolphins hop to the pistas-style bar
    // (`detective/CollectBar.tsx`, reused byte-for-byte) rather than trailing
    // behind the carrier — a visible trailing FORMATION is real new render
    // work this task's own brief allows skipping in favour of "just the hop
    // to the bar" when trailing is not cheap, and the shipped collect
    // pipeline already does the hop for free.
    collect: { items: 'extrema', art: SECTOR_ADVENTURE_ART.dolphin, size: DOLPHIN_SIZE },
  },
  {
    id: 'dolphin2',
    phase: 1,
    title: 'Más delfines en el agua',
    hint: 'Ahora hay más delfines. Seguí el camino sin salirte.',
    kind: 'path',
    surface: 'blank',
    maze: true,
    resetOnContact: false,
    carrier: true,
    feedback: feedback(false),
    // §2 step 2 — más delfines: 3 cycles, same view, same corridor family
    // pace, narrower channel than step 1.
    paths: [wave({ x0: 80, x1: 920, y: 300, amplitude: 160, cycles: 3 })],
    corridorWidth: 100,
    rules: rules(1, false, true, 0),
    showGuide: true,
    letters: [],
    // [T26] Same reasoning as `dolphin1` above.
    collect: { items: 'extrema', art: SECTOR_ADVENTURE_ART.dolphin, size: DOLPHIN_SIZE },
  },
  {
    id: 'dolphin3',
    phase: 1,
    title: 'Un estanque más grande',
    hint: 'El camino sigue más allá de lo que ves. Continuá sin salirte.',
    kind: 'path',
    surface: 'blank',
    maze: true,
    resetOnContact: false,
    carrier: true,
    feedback: feedback(false),
    // §2 step 3 — recorrido desplazable: the new mechanic enters here. 5
    // cycles across a sheet wider than the window (design.md §4.2, §1).
    paths: [wave({ x0: 80, x1: 1480, y: 300, amplitude: 160, cycles: 5 })],
    corridorWidth: 96,
    // `viewWidth` matches `MIN_VIEWBOX_WIDTH` on purpose: the stroke on this
    // level is drawn at the identical visual scale as on `dolphin1` and on
    // every other level in the app (design.md §1.1).
    camera: { viewWidth: 1000, lead: 0.5 },
    rules: rules(1, false, true, 0),
    showGuide: true,
    letters: [],
    // [T26] Same reasoning as `dolphin1` above.
    collect: { items: 'extrema', art: SECTOR_ADVENTURE_ART.dolphin, size: DOLPHIN_SIZE },
  },
  {
    id: 'dolphin4',
    phase: 1,
    title: 'El recorrido más largo',
    hint: 'Sostené el mismo camino durante todo el recorrido.',
    kind: 'path',
    surface: 'blank',
    maze: true,
    resetOnContact: false,
    carrier: true,
    feedback: feedback(false),
    // §2 step 4 — sostener el patrón más tiempo: the most cycles AND the
    // narrowest channel in the family (design.md §4.2).
    paths: [wave({ x0: 80, x1: 2040, y: 300, amplitude: 160, cycles: 7 })],
    corridorWidth: 84,
    camera: { viewWidth: 1000, lead: 0.5 },
    rules: rules(1, false, true, 0),
    showGuide: true,
    letters: [],
    // [T26] Same reasoning as `dolphin1` above.
    collect: { items: 'extrema', art: SECTOR_ADVENTURE_ART.dolphin, size: DOLPHIN_SIZE },
  },
  // ───────────────────────────────────────────────────────────────────────
  // The hedgehog family (`docs/13` §8 row H, "erizo en la zona nocturna —
  // trazos sueltos radiales", design.md §8): the first RADIAL, loose-stroke
  // movement in the whole progression — many short independent strokes,
  // each leaving the body and pointing outward, none of them a path. Every
  // literal below is solved against the MEASURED silhouette tables
  // (design.md §10), not against the ellipse the first draft used. Appended
  // at the END of the phase-1 block, after `dolphin4` and before
  // `f2-guirnalda` — NOT at the end of `LEVELS` (`catalog.test.ts:121-127`
  // requires ascending phases; design.md §2 D6).
  //
  // T19 (`odd/tasks/prewriting-stage-completion.md` §3.3, third tablet
  // play-test — "it's still really ugly and not intuitive; they don't look
  // like spines. Maybe more spines, but shorter"): a full redesign per
  // `docs/19_PROPUESTA_HISTORIA_Y_MECANICAS.md` §3.3, on top of T3's
  // start-tolerance fix. Four changes:
  //
  // 1. MORE, SHORTER spines: 4/5/7/9 → 8/9/10/11 (docs/19's own "8 a 12" —
  //    `hedgehog4` stops one short of the upper bound: 12 anchors over the
  //    profile's 180° arc pushes the geometric ceiling — `2·baseRadius ≤`
  //    the nearest two anchors' own chord — under `TolTouch` (26) at any
  //    body size that still fits the 600-tall sheet; 11 is the most this
  //    body can carry without either violating that floor or growing the
  //    silhouette off the paper), length bands compressed down from
  //    hedgehog1's old 220-290 — a spine used to be nearly as long as the
  //    whole hedgehog. Each band is sized RELATIVE TO ITS OWN POSE'S body
  //    radius rather than to one shared absolute number (docs/19's own
  //    "60 a 130" bounds the family, but a curled ball's ~150-unit anchor
  //    radius and a profile back's ~220-unit one cannot share one band and
  //    both read as "short" — a T19 follow-up caught `hedgehog1`'s original
  //    100-130 reaching 86% of its own ball's radius on a real screenshot):
  //    44-68 on the two curled levels (~45-48% of their own radius), 62-98
  //    on the two profile ones (~35-46%). Shorter spines read as spines,
  //    not as a stray line across the animal; more
  //    of them makes a recognisable silhouette once several are up.
  // 2. ENROSCADO → PERFIL, not the other way around (docs/19 §3.3: "on a
  //    ball every direction is the same — the easiest radial task; on the
  //    back, every spine has its own angle"). `hedgehog1`/`hedgehog2` are
  //    now `pose: 'curled'` (`HEDGEHOG_SILHOUETTE.curled`, the SAME body the
  //    old `hedgehog4` used, arc 65→365 — a property of the pose, identical
  //    on both curled levels exactly the way the profile arc used to be
  //    identical on the three old profile levels); `hedgehog3`/`hedgehog4`
  //    are now `pose: 'profile'` (arc 200→380, reusing the two old
  //    `hedgehog1`/`hedgehog2` bodies, already measured safe against the
  //    silhouette's feet/belly).
  // 3. The REAL acceptance blocker, measured (not re-guessed): `spines.ts`'s
  //    `passesRemainingMeasures` (now `remainingMeasureFailure`) compared the drawn direction against the
  //    ANCHOR's own idealised ray, but measure 1 already admits a start
  //    point anywhere within `baseRadius` — not ON the anchor. A child who
  //    starts at the EDGE of that tolerance circle and pulls perfectly
  //    straight outward from THEIR OWN fingertip draws along a ray that
  //    differs from the anchor's own ray by `atan(baseRadius / r)` — worth
  //    20°+ by itself on the old `hedgehog4` (baseRadius a third of
  //    `lenMin`), charged as a drawing mistake it never was. Fixed at the
  //    source (`spines.ts`'s own header on `remainingMeasureFailure`); this
  //    alone recovers real headroom without loosening `tolDeg` further than
  //    the shorter spines already require.
  // 4. Every level now requires ALL its anchors: `minAccuracy: 100` on all
  //    four (was 70/80/90/100). Bug: `hedgehog1` at 70% (4 anchors) already
  //    cleared the bar at 3/4 = 75%, and `hedgehog2` at 80% (5 anchors)
  //    cleared it at 4/5 = 80% EXACTLY — so with the last spine still
  //    undrawn, ANY release (a bare pointerup that barely moved, evaluated
  //    like any other stroke) reported `approved` from the anchors already
  //    filled, ending the level out from under the child's own last stroke
  //    ("as soon as I tap to start drawing it, the level completes"). A
  //    spine is a discrete, countable thing (`docs/19`'s whole "collect
  //    them" framing) — there is no meaningful partial credit for it the
  //    way there is for a wobbly path, and `docs/01`'s "no punishment" is
  //    unaffected: a `spines` level never fails a child, it only waits.
  //    `count ≤ 12` keeps `Math.round(100·(count−1)/count)` strictly below
  //    100 for every level (11/12 ≈ 91.7 → 92), so this is airtight, not a
  //    tuned coincidence — see `catalog.test.ts`'s own regression.
  //
  // T30 (`odd/tasks/prewriting-stage-completion.md`, next tablet play-test —
  // "it works worse than before; now it detects it fewer times"): T19's own
  // four changes above were each individually justified, but MEASURED
  // against a realistic child-stroke simulator (`levels/
  // spines.strokeSimulator.test.ts` — ~200 simulated strokes/level: start
  // within ~0-35px of the anchor dot, heading ±25° off the anchor's own ray,
  // 0.6-1.6× the spine's own mid-length, ±4px hand tremor, sampled like a
  // real ~15-point pointer stream), the SHIPPED T19 numbers accepted
  // essentially NONE of them (hedgehog1 4%, hedgehog2 0%, hedgehog3 8%,
  // hedgehog4 0%) — genuinely WORSE than the pre-T19 catalog + measure
  // (`git show 2ce1e92`) against the SAME simulator (21%, 33%, 46%, 23%),
  // confirming the play-test's own "worse than before" as measured fact, not
  // a false impression. Not because any ONE rule was wrong, but because four
  // rules tightened AT ONCE (shorter length bands, smaller baseRadius, lower
  // tolDeg, higher straightness) compound multiplicatively: a stroke has to
  // clear all four simultaneously, and each one alone was already only
  // "plausible-fixture-passes", not "realistic-child-stroke-passes". Three
  // real, measured fixes, none of them re-loosening the visual redesign
  // (`spineSpikeOf` always renders at the band's own MIDPOINT, never the
  // child's drawn length, so widening the acceptance band changes nothing
  // on screen):
  //
  //  1. `baseRadius` raised close to its own geometric ceiling (`2·baseRadius
  //     ≤` the nearest two anchors' own chord — `catalog.test.ts`'s own
  //     margins, recomputed below) on every level. The old values left 3-14
  //     units of UNUSED headroom under that ceiling; a child's touch-down
  //     error (measured up to ~35px) was landing outside `baseRadius` more
  //     often than it needed to, and once measure 1 fails, no other measure
  //     gets a chance at all — this was the single largest rejector on
  //     hedgehog2-4.
  //  2. `lenMin`/`lenMax` widened substantially AROUND THE SAME MIDPOINT
  //     (`(lenMin+lenMax)/2` barely moves per level — 59→61, 50→50, 87→88,
  //     71→71 — so the rendered spike, which always uses that midpoint, is
  //     visually IDENTICAL to before this fix). The T19 bands were only
  //     ~1.3× wide (min to max) around that midpoint, but a real child's
  //     drawn length varies far more than that stroke-to-stroke — this was
  //     the second largest rejector everywhere.
  //  3. `tolDeg`/`straightness` loosened, but NOT uniformly harder-to-easier
  //     across all four levels the way T19 assumed: the simulator showed the
  //     opposite pattern for `straightness` — a SHORTER spine (hedgehog2,
  //     hedgehog4 within their own pose pair) is proportionately MORE
  //     affected by the same ±4px absolute hand tremor than a longer one, so
  //     it needs a LOOSER straightness floor, not a stricter one. `catalog.
  //     test.ts`'s old "straightness strictly increases, tolDeg strictly
  //     decreases, across all four levels" ladder encoded the untested
  //     assumption; it is now scoped to WITHIN each pose pair only, the same
  //     scoping the length ladder already used for exactly this reason (a
  //     curled ball's ~140-150-unit anchor radius and a profile back's
  //     ~210-230-unit one cannot share one ladder).
  //
  // Re-measured against the fixed numbers below: hedgehog1 ~95-97%,
  // hedgehog2 ~98-100%, hedgehog3 ~90-94%, hedgehog4 ~90-95% (seven seeds,
  // 40 trials/anchor) — clearing the task's own ≥90%/≥90%/≥80%/≥80% bar with
  // margin, while a clearly-wrong stroke (inward, tangential, or nowhere
  // near any anchor) is still rejected on every level (same test file).
  //
  // T39 (next tablet play-test: "sometimes I draw it quite well and it still
  // says I didn't"): a harsher simulator (slow 25-70-sample drags, landing on
  // the mark, touch-down settle and lift flick, ±30°, 0.5-1.7× length) read
  // 27.5% / 29.2% / 63.2% / 59.8% on the numbers above. Two catalog changes
  // here, beside two measure fixes in `spines.ts` (straightness no longer
  // depends on the sample rate; a Voronoi start zone out to
  // `SPINE_START_REACH` past `baseRadius`'s geometric ceiling): `lenMax`
  // raised to ~2.2× the drawn spike (a long, confident pull is still a
  // spine), and `spikeLen` pinned to each level's old band midpoint so the
  // spike on screen does not grow with it. Now 98.8% / 99.4% / 99.8% /
  // 99.8%; scribbles, loops, taps, out-and-back and big-wiggle strokes are
  // still rejected on every level (`spines.strokeSimulator.test.ts`).
  {
    id: 'hedgehog1',
    phase: 1,
    title: 'Las primeras espinas',
    hint: 'Dibujá palitos cortos desde el lomo hacia afuera.',
    kind: 'free',
    surface: 'blank',
    maze: false,
    resetOnContact: false,
    carrier: false,
    feedback: { tone: false, haptics: true, rail: false },
    paths: [],
    corridorWidth: 0,
    rules: { ...rules(1, false, false, 0), minAccuracy: 100 },
    showGuide: false,
    letters: [],
    // The movement is new exactly once (`docs/13` §5 item 2) — `demo: true`
    // on hedgehog1 alone.
    demo: true,
    spines: {
      pose: 'curled',
      body: { centre: { x: 500, y: 300 }, height: 300 },
      arc: { from: 65, to: 365 },
      count: 8,
      // T19 follow-up (orchestrator screenshot review, `hedgehog1-04-all-
      // but-last.png`): 100-130 read as LONG on this pose — the curled
      // body's own anchor radius is ~150 units, so a lenMax of 130 is 86%
      // of it, reaching almost to the far side of the ball. "Short hedgehog
      // spines" (docs/19 §3.3) means short RELATIVE TO THE BODY, not a
      // fixed absolute number the doc's own "60 a 130" merely bounds — the
      // RENDERED spike sits at the band's own midpoint (`spineSpikeOf`,
      // `spines.ts`), which this band keeps at 61 (41% of the ~150-unit
      // ball radius), matching `hedgehog3`/`hedgehog4`'s own proportion.
      //
      // T30 (family header comment above, "it detects fewer times than
      // before"): baseRadius and the length band widened AROUND that same
      // midpoint (measured ceiling 48.0, margin recomputed in `catalog.
      // test.ts`) — a realistic child stroke's own drawn length varies far
      // more than the old ~1.3×-wide band admitted, and this was hedgehog1's
      // second-largest rejector after the old baseRadius. tolDeg/straightness
      // loosened too: this pair's own anchor radius (~150 units, the
      // smallest in the family) amplifies a given touch-down offset into a
      // larger angular error than the profile pair's own larger radius does,
      // so hedgehog1/2 need a LOOSER tolDeg than hedgehog3/4, not a tighter
      // one — see the family header for the measured rates.
      rules: { baseRadius: 44, tolDeg: 58, straightness: 0.62, lenMin: 26, lenMax: 130, spikeLen: 61 },
    },
  },
  {
    id: 'hedgehog2',
    phase: 1,
    title: 'Más espinas',
    hint: 'Salen más espinas. Empezá en cada marca y tirá para afuera.',
    kind: 'free',
    surface: 'blank',
    maze: false,
    resetOnContact: false,
    carrier: false,
    feedback: { tone: false, haptics: true, rail: false },
    paths: [],
    corridorWidth: 0,
    rules: { ...rules(1, false, false, 0), minAccuracy: 100 },
    showGuide: false,
    letters: [],
    spines: {
      pose: 'curled',
      body: { centre: { x: 500, y: 300 }, height: 280 },
      arc: { from: 65, to: 365 },
      count: 9,
      // T19 follow-up: same over-length correction as hedgehog1 (see its
      // own comment) — the rendered midpoint (50) stays under this ball's
      // ~140-unit anchor radius, shorter than hedgehog1's own 61 (decreasing
      // within the curled pair, matching the ladder hedgehog3/hedgehog4
      // keep).
      //
      // T30 (family header above): baseRadius and the length band widened
      // around that same 50 midpoint (measured ceiling 39.9). tolDeg/
      // straightness loosened LESS than hedgehog1's, not more — "harder"
      // within the pair still means a tighter tolerance, just not tight
      // enough to fail nearly every realistic stroke the way the T19 numbers
      // did.
      rules: { baseRadius: 37, tolDeg: 55, straightness: 0.55, lenMin: 18, lenMax: 110, spikeLen: 50 },
    },
  },
  {
    id: 'hedgehog3',
    phase: 1,
    title: 'Se asoma',
    hint: 'Ahora se ve de costado. Una espina en cada marca del lomo.',
    kind: 'free',
    surface: 'blank',
    maze: false,
    resetOnContact: false,
    carrier: false,
    feedback: { tone: false, haptics: true, rail: false },
    paths: [],
    corridorWidth: 0,
    rules: { ...rules(1, false, false, 0), minAccuracy: 100 },
    showGuide: false,
    letters: [],
    spines: {
      pose: 'profile',
      body: { centre: { x: 460, y: 390 }, height: 370 },
      arc: { from: 200, to: 380 },
      count: 10,
      // T30 (family header comment above): baseRadius raised to near this
      // level's own measured ceiling (29.5, margin 1.5), and the length band
      // widened around the SAME rendered midpoint as before (88, was 87) —
      // the profile pose's own larger ~210-unit anchor radius needs less
      // angular loosening than the curled pair above, so tolDeg/straightness
      // land tighter than hedgehog1/2's own, while still clearing this
      // level's own (lower, ≥80%) realistic-stroke bar with margin.
      rules: { baseRadius: 28, tolDeg: 54, straightness: 0.58, lenMin: 38, lenMax: 194, spikeLen: 88 },
    },
  },
  {
    id: 'hedgehog4',
    phase: 1,
    title: 'Espinas cortas',
    hint: 'Espinas chiquitas y muy juntas: una en cada marca.',
    kind: 'free',
    surface: 'blank',
    maze: false,
    resetOnContact: false,
    carrier: false,
    feedback: { tone: false, haptics: true, rail: false },
    paths: [],
    corridorWidth: 0,
    rules: { ...rules(1, false, false, 0), minAccuracy: 100 },
    showGuide: false,
    letters: [],
    spines: {
      pose: 'profile',
      body: { centre: { x: 460, y: 390 }, height: 400 },
      arc: { from: 200, to: 380 },
      count: 11,
      // T30 (family header comment above): same correction as hedgehog3 —
      // baseRadius near this level's own tighter ceiling (28.9, margin 1.9,
      // the family's own thinnest slack: 11 anchors over 180°), length band
      // widened around the same rendered midpoint (71, unchanged), tolDeg/
      // straightness the tightest in the family but no longer tight enough,
      // stacked with the others, to reject nearly every realistic stroke.
      rules: { baseRadius: 27, tolDeg: 50, straightness: 0.52, lenMin: 30, lenMax: 156, spikeLen: 71 },
    },
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// Retired phase-1 configs (design unit 10 / Phase 11, `detective-mode`).
//
// The six unthemed corridor levels this catalog shipped before the retheme
// above, UNWIRED from `LEVELS` but kept exported and byte-for-byte unchanged
// (level-engine spec, "LEGACY_PHASE_1 preserves the removed configs"). This is
// the whole rollback plan: reverting is swapping this array back into `LEVELS`
// in place of the four trails, no revert needed (proposal §Rollback Plan).
//
// Safe to remove from `LEVELS` only because `client/src/game/migratePhase1.ts`
// (Phase 9, already shipped) runs a one-time copy-forward migration BEFORE
// this swap ever reaches a real child's store: `isUnlocked` is positional
// (`LevelProgressStore.ts:123-129`), so removing these six without that
// migration landing first would lock trails 2-4 for anyone already past
// `f1-travesia` (D3, no-demotion). See `tasks.md`'s Ordering Summary.
// ─────────────────────────────────────────────────────────────────────────────
export const LEGACY_PHASE_1: readonly LevelConfig[] = [
  {
    id: 'f1-travesia',
    phase: 1,
    title: 'La travesía',
    hint: 'Cruzá toda la hoja, de una punta a la otra, sin frenar.',
    kind: 'path',
    surface: 'blank',
    maze: true,
    // "El sendero se estrecha": forgiving where the child starts, narrower
    // where the movement is already running.
    taper: { from: 1.3, to: 0.7 },
    resetOnContact: false,
    carrier: false,
    // FIRST CONTACT with a route in the whole app: the rail is on here and
    // nowhere else in phase 1 (docs/03 section 6).
    feedback: feedback(true),
    paths: [sweep()],
    corridorWidth: 120,
    rules: rules(1, false, true, 0),
    showGuide: true,
    letters: [],
  },
  {
    id: 'f1-pelotas',
    phase: 1,
    title: 'Las pelotas que cruzan',
    // Names the STRATEGY, not the obstacle: "wait, then go" is the thing being
    // trained (docs/01 phase 1, inhibición motriz).
    hint: 'Esperá a que pase la pelota y recién ahí seguí.',
    kind: 'path',
    surface: 'blank',
    maze: true,
    // TWO hazards, and the difficulty is the TIMING, not the shape. They sit a
    // third and two thirds along the route so there is room to approach, stop
    // and go between them.
    //
    // `travel` 260 against an 84-unit corridor is 3.1x the channel: the sweep
    // covers the corridor wall to wall, so there is no safe lane to hug, and it
    // carries the ball far enough OUT of the channel that a real gap opens. The
    // ball is clear of the corridor (|offset| > 84/2 + 32 + 12) for 54% of each
    // cycle — two windows of about 0.7s, which is a gap a six-year-old can see
    // coming and act on.
    //
    // The periods differ (2600 / 2200) AND the phases are half a cycle apart:
    // either alone would leave the two balls in a fixed relation the child can
    // learn as ONE rhythm. With 13:11 periods the pair only repeats every ~29s,
    // so each hazard has to be read on its own — which is the lesson.
    obstacles: [
      { at: 0.33, travel: 260, periodMs: 2600, phase: 0, radius: 32 },
      { at: 0.66, travel: 260, periodMs: 2200, phase: 0.5, radius: 32 },
    ],
    resetOnContact: true,
    carrier: false,
    feedback: feedback(false),
    // A broad, gentle arch: one rise and one fall across the whole sheet, with
    // no corner anywhere. The route is deliberately EASY to read — a shape that
    // also had to be solved would hide what the child is actually learning.
    paths: [sweep({ x0: 110, y0: 470, x1: 890, y1: 470, bow: -330, waves: 0.5 })],
    corridorWidth: 84,
    rules: rules(1, false, true, 0),
    showGuide: true,
    letters: [],
  },
  {
    id: 'f1-paseo',
    phase: 1,
    title: 'El paseo',
    hint: 'Llevá al viajero de una punta a la otra sin tocar los bordes.',
    kind: 'path',
    surface: 'blank',
    maze: true,
    resetOnContact: true,
    carrier: true,
    feedback: feedback(false),
    // FIRST CONTACT with the escort rule, so the SHAPE gives nothing away: a
    // long diagonal with a bow of 45, barely more than a straight line. When a
    // new rule arrives the geometry has to get out of its way (docs/01
    // principle 1); the difficulty lives in the 68-unit corridor.
    paths: [sweep({ x0: 110, y0: 480, x1: 890, y1: 130, bow: 45 })],
    corridorWidth: 68,
    rules: rules(1, false, true, 0),
    showGuide: true,
    letters: [],
  },
  {
    id: 'f1-pasillo',
    phase: 1,
    title: 'El pasillo angosto',
    hint: 'Ahora el pasillo se angosta: llevalo despacio y por el medio.',
    kind: 'path',
    surface: 'blank',
    maze: true,
    // The second taper of the catalog, and the only one that narrows into a
    // half-turn: the corridor is most forgiving on the outward run and tightest
    // on the way back, when the child already knows the movement.
    taper: { from: 1.2, to: 0.8 },
    resetOnContact: true,
    carrier: true,
    feedback: feedback(false),
    // Nearly twice the length of any other phase-1 route, so precision has to
    // be HELD rather than found, plus one half-turn — stop, reverse, keep the
    // ink off the wall.
    paths: [switchback()],
    // The narrowest corridor in phase 1. The escort levels are the precision
    // levels: if the walls did not actually matter, `resetOnContact` would be a
    // rule the child never meets.
    corridorWidth: 56,
    rules: rules(1, false, true, 0),
    showGuide: true,
    letters: [],
  },
  {
    id: 'f1-ondas',
    phase: 1,
    title: 'Las olas inclinadas',
    hint: 'Seguí las olas grandes, despacio y por el medio.',
    kind: 'path',
    surface: 'blank',
    maze: true,
    resetOnContact: false,
    carrier: false,
    feedback: feedback(false),
    // The same wave, TILTED: an oblique route is a different wrist rotation,
    // and a horizontal one would quietly rehearse the writing line again.
    paths: [transformPath(wave(), { rotate: -22 })],
    corridorWidth: 95,
    rules: rules(1, false, true, 0),
    showGuide: true,
    letters: [],
  },
  {
    id: 'f1-espiral',
    phase: 1,
    // Counter-clockwise on purpose: the same turn the `a` family needs later.
    title: 'El caracol',
    hint: 'Entrá al caracol girando para este lado, sin levantar el dedo.',
    kind: 'path',
    surface: 'blank',
    maze: true,
    resetOnContact: false,
    carrier: false,
    feedback: feedback(false),
    paths: [spiral()],
    // 70 against the generator's 120 radial gap leaves ~50 units of visible
    // wall between the arms; wider merges the turns into a filled disc.
    corridorWidth: 70,
    rules: rules(1, true, true, 0),
    showGuide: true,
    letters: [],
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// Fase 2 — Patrón continuo (pre-cursiva). Todos con mustBeContinuous: acá se
// instala la regla de la cursiva.
//
// The geometry STAYS in the writing band, scaled 1.25× (paths.ts): colinas,
// bucles and crestas are letter shapes, and their proportions against the
// pauta are the whole point of the phase. What they lose is the DRAWN pauta
// (`surface: 'blank'`) — the rules still mean nothing to the child until
// phase 3.
//
// [T40, the author's play-test 2026-09-27] This phase used to be the "rhythm
// phase" (docs/01 fase 2, "planificación motora, ritmo"): a pulsing
// metronome ring at the start, a grey centreline and crisp guide inside a
// soft corridor, and a fluency floor (`1 − CV(speed)`) that paired with the
// beat. The author: "¿Por qué es tan distinto? Tiene un trazo gris en el
// medio... un coso de ritmo que nadie lo va a entender, sacalo." Every
// routed level before the letters now draws the same plain white corridor
// (`maze: true`, which is what drops the centreline and the guide), the
// metronome is gone from the engine, and phase 2's fluency floor is 0: with
// no beat to keep, a "steady speed" rule would fail a child for a reason
// nothing on screen explains. The rhythm is still in the shapes (equal
// cycles, one after another); nothing asks the child to match a tempo.
//
// `f2-guirnalda` is the SAME garland shape, rethemed as Nivel 3's entry point
// (docs/11): its id STAYS — it is a persisted unlock key — but its cycle
// widens (180×150 → 253×240). Nivel 3's own microprogression axis
// (`f2-guirnalda` → `f2-agua2` → `f2-agua3` → `f2-agua4`) is amplitude and
// proximity moving together and in opposite directions — cycle width
// 253→190→130…195(varied)→253, dip depth 240→140→95…200(varied)→240 — while
// the corridor narrows to match (100→80→68→90). Desafío 4 deliberately
// RETURNS to desafío 1's wide, easy-to-read geometry and adds the starfish:
// the new demand is stopping, not precision (design.md §3).
// ─────────────────────────────────────────────────────────────────────────────
const PHASE_2: LevelConfig[] = [
  // ───────────────────────────────────────────────────────────────────────
  // The turtles' own family (P3, `odd/tasks/promised-animals.md`): the Ola
  // letter family's closed counter-clockwise turn (`docs/01` §8: `c a d g
  // q o`), taught by turtles going in circles in the arena's sand. Placed at
  // the START of PHASE_2, alongside `f2-guirnalda`'s own family — the
  // adventure ROW lives in `zoo/adventures.ts`'s `turtles` entry, appended
  // to the arena's own `snake` row there, same as every other family; this
  // array's own order is catalog bookkeeping only.
  //
  // PHASE 2, NOT PHASE 1, despite being zoo-native side content like sheep/
  // llama/snake/bee/dolphin/hedgehog — the reason is the shape, not the
  // sector: `ovals()`'s closed turn is a letter-family pattern (the `o`/`a`),
  // phase 2's own continuity rule applies to it, and it sits in the writing
  // band like every other phase-2 pattern. [T40] It no longer draws the
  // ideal line inside a soft corridor: every routed level before the letters
  // is `maze: true` now (the plain white corridor the author asked for, no
  // grey centreline, no guide — PHASE_2's own header). Phase 2 also means
  // these four must stay INSIDE the 149-451 writing band (`catalog.test.ts`'s own
  // "keeps phase 2 in the writing band"), the opposite requirement phase 1
  // pattern levels carry — `ry: 150` uniform across all four keeps every
  // ring's own top/bottom exactly on that band's edge with a hair of
  // margin (measured, not assumed: `ovals()`'s Bezier approximation
  // deviates from the ideal ellipse by under 0.05 units at this scale).
  //
  // `carrier: false`, no `clue`, no `detectiveWorld`: NOT in the detective
  // world, the same choice sheep/llama make and for the same functional
  // reason — with a real sand backdrop (`zoo/backdrops.ts`'s `turtles`
  // row) but `inWorld` false, `LevelPlay.tsx`'s `inkColor={inWorld ?
  // MUD_INK : backdropEntry?.ink}` (`:2543`) lets `backdropEntry.ink`
  // actually reach the canvas instead of the forced `MUD_INK` a case trail
  // would get — necessary here because the sand channel (`SAND_HOLLOW`,
  // luma 52) fails the 55-luma law against the default slate ink by 12,
  // the same reason the snake adventure needs the identical override.
  // `carrier: false` here is purely the ink-colour choice above — the lupa
  // itself no longer depends on `inWorld` (T29 fixed `LevelPlay.tsx`'s
  // `carrierArt` default, which used to silently drop it outside the
  // detective world; see that fix's own comment). Turtle simply never asks
  // for a carrier at all, the same choice sheep/llama make, because a
  // magnifying glass has no place in a sand/nature sector that is not the
  // detective's own story.
  //
  // `rules(2, true, true, fluency)`: `mustBeContinuous: true` because a
  // closed loop drawn with a pen lift is not the shape at all — turtle2-4's
  // own hints say so outright ("sin levantar el dedo"). `resetOnContact:
  // false`, the garland family's own gentle pattern-practice convention:
  // there is no hazard here, and a delicate curve deserves patience, not
  // repeated restarts. `feedback.rail` stays OFF on every level here,
  // including `turtle1`: `catalog.test.ts`'s own "turns the assisted rail
  // on at FIRST CONTACT only" is a CLOSED, curated list of exactly three
  // ids (`duck-trail1`, `sheep-hill1`, `f3-l`), not "every family's own
  // first level" — `llama-peak1`/`dolphin1`/`snake1`/`bee1`/`hedgehog1` all
  // introduce a family of their own and none of them get it either.
  //
  // T28 (`odd/tasks/prewriting-stage-completion.md`; `docs/19` §3 recipe B,
  // "cada vuelta hace asomar una tortuga"): every level here also authors
  // `collect: { items: 'loops', ... }` — see `levels/collect.ts`'s
  // `collectItemsFromLoops` and each level's own comment below.
  //
  // Sizes (`rx`/`corridorWidth`; `ry` is fixed at 150) are chosen, not
  // merely approximated, against TWO measured guards (`paths.test.ts`,
  // `catalog.test.ts`): `ovalTurnRadius(rx, ry) > corridorWidth/2 −
  // BAND_INSET` (the hole never folds shut under `pushBand`'s fixed
  // offset) and, for turtle2-4, `ovalSpacingClearance` (neighbouring rings
  // leave a real gap, a quarter of the corridor's own width, once each
  // side's own padding is subtracted). `x0`/`x1` widen level over level
  // (350-650 → 140-860 → 50-950 → 20-980) because MORE, smaller rings need
  // MORE of the sheet's own width to keep that gap real — turtle4's own
  // 20-unit margin either side of the viewBox is the tightest this family
  // gets, the same kind of margin `f2-agua3`'s own worst cycle already
  // ships at (4.5 units on ITS own guard).
  // ───────────────────────────────────────────────────────────────────────
  // [T45, `docs/21` N6] The turtles' own case: a pistas level first, then
  // "¿De quién es esta huella?" (the fourth way of deducing: compare
  // prints), then the four rings below. One straight line left to right,
  // the furrow the tail drags, cut into three stretches (`segments`): each
  // ends at a stop, and the child lifts there before the next — "recta y
  // frenar" (§3.1.4, §3.2.6). Turtle prints on both sides of the furrow
  // light when their stretch is done.
  {
    id: 'turtle-huellas',
    phase: 2,
    title: 'El surco de la cola',
    hint: 'Seguí el surco de la tortuga y frená en cada marca. Mirá las huellas.',
    kind: 'path',
    surface: 'blank',
    maze: true,
    resetOnContact: false,
    carrier: true,
    feedback: feedback(false),
    // [T45 follow-up] 120 units between stretches: with an 80-wide corridor
    // that is 40 units of sand between two stretches, so each stop mark sits
    // wholly before the next start and the three read as one line with
    // stops, not one bar with markers piled up.
    paths: furrowSegments({ x0: 80, x1: 920, y: 300, count: 3, gap: 120 }),
    corridorWidth: 80,
    rules: rules(2, false, true, 0),
    showGuide: true,
    letters: [],
    demo: true,
    segments: { startReach: 70, stopReach: 55 },
    clue: { kind: 'turtlePrint', spacing: 60 },
  },
  {
    id: 'turtle1',
    phase: 2,
    title: 'La vuelta de la tortuga',
    hint: 'Empezá arriba, andá para la izquierda y dá toda la vuelta, como la tortuga.',
    kind: 'path',
    surface: 'blank',
    maze: true,
    resetOnContact: false,
    carrier: false,
    feedback: feedback(false),
    // A single ring: `ovalTurnRadius(150, 150) = 150`, comfortably clear of
    // `100/2 − 6 = 44`.
    paths: [ovals({ x0: 350, x1: 650, cy: 300, rx: 150, ry: 150, count: 1 })],
    corridorWidth: 100,
    rules: rules(2, true, true, 0),
    showGuide: true,
    letters: [],
    demo: true,
    // T28 (`odd/tasks/prewriting-stage-completion.md`; `docs/19` §3, recipe
    // B: "cada vuelta hace asomar una tortuga"). `items: 'loops'`
    // (`levels/collect.ts`'s `collectItemsFromLoops`) places one turtle at
    // each ring's own closure plus a final item at the route's end — a
    // single ring authors exactly one item, so finishing the one loop here
    // both makes the turtle peek out AND finishes the level in the same
    // motion.
    collect: { items: 'loops', art: ZOO_ANIMAL_ART.tortuga, size: 48 },
  },
  {
    id: 'turtle2',
    phase: 2,
    title: 'Dos vueltas seguidas',
    hint: 'Dos vueltas seguidas: terminá una y seguí con la otra sin levantar el dedo.',
    kind: 'path',
    surface: 'blank',
    maze: true,
    resetOnContact: false,
    carrier: false,
    feedback: feedback(false),
    // `ovalTurnRadius(120, 150) = 96`, clear of `90/2 − 6 = 39`.
    // `ovalSpacingClearance(360, 120, 90, 2)`: gap left over is
    // `360 − 240 − 90 = 30`, which is `⅓` of the corridor width — clear of
    // the quarter-width floor.
    paths: [ovals({ x0: 140, x1: 860, cy: 300, rx: 120, ry: 150, count: 2 })],
    corridorWidth: 90,
    rules: rules(2, true, true, 0),
    showGuide: true,
    letters: [],
    demo: true,
    // T28: same mechanic as turtle1's own `collect` — see its comment.
    collect: { items: 'loops', art: ZOO_ANIMAL_ART.tortuga, size: 48 },
  },
  {
    id: 'turtle3',
    phase: 2,
    title: 'Tres vueltas chiquitas',
    // [T41] Names the snails and the strategy.
    hint: 'Tres vueltas chiquitas. ¡Cuidado con los caracoles! Esperá que pasen.',
    kind: 'path',
    surface: 'blank',
    maze: true,
    resetOnContact: false,
    carrier: false,
    feedback: feedback(false),
    // `ovalTurnRadius(95, 150) ≈ 60.2`, clear of `80/2 − 6 = 34`.
    // `ovalSpacingClearance(300, 95, 80, 3)`: leftover `300 − 190 − 80 = 30`,
    // `⅜` of the corridor width.
    paths: [ovals({ x0: 50, x1: 950, cy: 300, rx: 95, ry: 150, count: 3 })],
    corridorWidth: 80,
    rules: rules(2, true, true, 0),
    showGuide: true,
    letters: [],
    demo: true,
    // T28: same mechanic as turtle1's own `collect` — see its comment.
    collect: { items: 'loops', art: ZOO_ANIMAL_ART.tortuga, size: 48 },
    // [T41] Two snails, late in the journey, at the bottoms of the second
    // and third rings (the first ring is the warm-up). A ring bottom is the
    // only open sheet a ring has: its neighbours sit 30 units away sideways
    // and its own turtle sits in the hole above. So the swing is short
    // (radius 22) and shifted 10 units OUTWARD (down): it reaches from just
    // under the turtle to the sheet's bottom margin and still leaves the
    // corridor clear for half of every cycle (`hazardGapFraction`). Periods
    // 3000/2600 and half a cycle apart, like `f1-pelotas`, so each snail is
    // read on its own. The walls stay forgiving; only a snail restarts
    // (T41, `LevelPlay`'s `hazardResets`), and ringed turtles stay out.
    obstacles: [
      { at: 0.518, travel: 214, shift: 10, periodMs: 3000, phase: 0, radius: 22 },
      { at: 0.885, travel: 214, shift: 10, periodMs: 2600, phase: 0.5, radius: 22 },
    ],
    hazardArt: SECTOR_ADVENTURE_ART.snail,
  },
  {
    id: 'turtle4',
    phase: 2,
    title: 'Cuatro vueltas redonditas',
    hint: 'Cuatro vueltas redonditas, ¡como escribir oooo!',
    kind: 'path',
    surface: 'blank',
    maze: true,
    resetOnContact: false,
    carrier: false,
    feedback: feedback(false),
    // `ovalTurnRadius(75, 150) = 37.5`, clear of `70/2 − 6 = 29` — this
    // family's own tightest margin, the same role `f2-agua3`'s worst cycle
    // plays for the garland family.
    // `ovalSpacingClearance(240, 75, 70, 4)`: leftover `240 − 150 − 70 = 20`,
    // exactly the quarter-width floor (`0.25 × 70 = 17.5`, cleared by 2.5).
    paths: [ovals({ x0: 20, x1: 980, cy: 300, rx: 75, ry: 150, count: 4 })],
    corridorWidth: 70,
    rules: rules(2, true, true, 0),
    showGuide: true,
    letters: [],
    demo: true,
    // T28: same mechanic as turtle1's own `collect` — see its comment.
    collect: { items: 'loops', art: ZOO_ANIMAL_ART.tortuga, size: 48 },
  },
  // ───────────────────────────────────────────────────────────────────────
  // The monkeys' own family (P4, `odd/tasks/promised-animals.md`): the Rulo
  // letter family's own rising, self-crossing loop (`docs/01` §8: `e l b h
  // k f`), taught by monkeys swinging on the forest's lianas — the same
  // `loops()` generator `f2-bucles` already ships (a fresh call with this
  // family's own sizes).
  //
  // Every field this family shares with the turtles above carries the SAME
  // reasoning, restated once rather than per level: phase 2 (a letter-
  // family pattern, the turtles' own reasoning); `yTop: 150, yBase: 450` on every
  // level — `f2-bucles`' own exact band — rather than a shrinking one,
  // because phase 2's own "keeps phase 2 in the writing band" ceiling
  // leaves no room to grow BEYOND that band and still clears phase 1's
  // "spans over 300 units" floor were this phase 1 instead (the reason
  // this family is phase 2 at all, restated: `loops()`'s crossing shape
  // is a lesson, and `f2-bucles` already proves this exact band works for
  // it). `resetOnContact: false` (a gentle pattern family, no hazard).
  // `rules(2, true, true, fluency)` (one continuous stroke — every hint
  // below says so). `feedback.rail` stays off throughout — `loops()` is
  // not a new mechanic here, the same reason `llama-peak1` (reusing
  // sheep's own `peakRidge`) gets no first-contact assist either.
  //
  // [T27, `odd/tasks/prewriting-stage-completion.md`, `docs/19` §2.3/§3
  // monos row] Recipe A, reusing this exact shape family: `monkey1`/
  // `monkey2` are now the case's own two PISTAS levels (`carrier: true`,
  // the lens default — the same bundle every other clue-bearing level in
  // this catalog carries, `catalog.test.ts`'s "every detective trail gets
  // the fingertip carrier" invariant) — `detective/cases.ts`'s `monkeys`
  // case reads their `clue.kind` through `clueKindsOf`, so the case and
  // the levels can never disagree about which two kinds it carries. [T43]
  // `monkey1` carries the monkey's own `handprint` (`docs/22` C8) and
  // `monkey2` a `banana` (C12); until then they reused `footprint` and
  // `corn` as stand-ins. (T27 had shipped `feather` on `monkey1` first,
  // which was worse than a mismatch: a case whose answer is "mono" showing
  // a feather says a BIRD left the trace.) Never `webfoot`/`breadcrumb` — `cases.test.ts`'s
  // "webfoot and breadcrumb rule nobody out" invariant bans either from
  // ever being a `ruledOutBy` verdict. `monkey3`/`monkey4` gather the
  // recovered monkey FAMILY
  // instead (`LevelConfig.collect`, T17's engine, the sheep-hill/
  // llama-peak convention): `items: 'crests'` (`waveCrestArcs`), NOT
  // `'peaks'` — measured directly against these two shipped routes (the
  // same way `duck-trail3`/`4`'s own header measured its wave), `'peaks'`
  // (`routeApexes`) finds ZERO apexes on either: `loops()`'s own upstroke/
  // downstroke controls keep the flattened polyline's apex ON the top
  // line across more than one sample, so no single point is STRICTLY
  // lower than both its immediate neighbours (`routeApexes`'s own exact
  // test) — the identical failure mode that function's header already
  // documents for a smooth bezier wave. `waveCrestArcs`'s window-based
  // comparison finds exactly one crest per loop instead, at the same
  // place docs/19 §3 puts a monkey ("un mono colgado arriba de cada
  // bucle"). `ZOO_ANIMAL_ART.mono`
  // is itself a placeholder sign block (`docs/20` B10, real monkey art
  // still pending) — flagged the same way `duck-trail3`/`4`'s scaled-down
  // `ANIMAL_ART.pato` duckling stand-in already is.
  //
  // [T40] Sizes are chosen so every loop's HOLE stays visible with the plain
  // corridor (no centreline): `loopHoleClearances` (`paths.ts`) measures the
  // largest circle that fits inside each loop, and `catalog.test.ts` holds
  // every loop level to a visible hole (`2·clearance − corridorWidth`) at
  // least one corridor wide, and to round, smooth loops (the author: "un
  // rulo más suave y prolijo") whose tightest bend is the loop itself. Round
  // loops that keep their hole are about 0.55 of a cycle across, so the
  // family tops out at three loops, and no corridor goes below 70 (the
  // journey's narrowest, `duck-trail4`/`llama-peak4`). Loop radius and
  // measured hole clearance (visible hole = 2·clearance − corridor):
  //
  //   monkey1  2 loops r≈96, corridor 90, clearance ≈96 (visible ≈102)
  //   monkey2  3 loops r≈90, corridor 80, clearance ≈88 (≈96)
  //   monkey3  3 loops r≈83, corridor 75, clearance ≈80 (≈85)
  //   monkey4  3 loops r≈77, corridor 70, clearance ≈76 (≈82)
  // ───────────────────────────────────────────────────────────────────────
  {
    id: 'monkey1',
    phase: 2,
    title: 'El primer rulo',
    // [T27 follow-up] The hint names what the clue ACTUALLY shows. [T43]
    // The bird footprint stand-in became the monkey's own handprint
    // (`docs/22` C8).
    hint: 'Subí como el mono y juntá las manitos que dejó en la liana.',
    kind: 'path',
    surface: 'blank',
    maze: true,
    resetOnContact: false,
    // [T27] `carrier: true` — the lens default, `catalog.test.ts`'s
    // "every detective trail gets the fingertip carrier" invariant.
    carrier: true,
    feedback: feedback(false),
    // [T40] Two round loops (see this family's header for the hole numbers).
    paths: [loops({ x0: 140, x1: 860, yTop: 150, yBase: 450, cycles: 2, loopWidth: 0.267, loopHeight: 0.32 })],
    corridorWidth: 90,
    rules: rules(2, true, true, 0),
    showGuide: true,
    letters: [],
    demo: true,
    // [T43] `handprint` (`docs/22` C8): the monkey's own hand, replacing the
    // `footprint` stand-in (a three-toed BIRD print, which said the opposite
    // of the answer). `footprint` stays for `trail3` only.
    clue: { kind: 'handprint', spacing: 60 },
  },
  {
    id: 'monkey2',
    phase: 2,
    title: 'Tres rulos colgado',
    // [T27] The case's LAST pistas level — finishing it routes into the
    // `monkeys` deduction (`zoo/adventures.ts`'s `monkeys.deduction.after`).
    // [T40] The spoken hint names only what is on screen. [T43] The marks
    // are real bananas now (`docs/22` C12), so the hint can say so.
    hint: 'Otra vez colgado: juntá las bananas que se les cayeron.',
    kind: 'path',
    surface: 'blank',
    maze: true,
    resetOnContact: false,
    carrier: true,
    feedback: feedback(false),
    // [T40] Three round loops (hole numbers in this family's header).
    paths: [loops({ x0: 60, x1: 940, yTop: 150, yBase: 450, cycles: 3, loopWidth: 0.307, loopHeight: 0.3 })],
    corridorWidth: 80,
    rules: rules(2, true, true, 0),
    showGuide: true,
    letters: [],
    demo: true,
    // [T43] `banana` (`docs/22` C12), replacing the `corn` stand-in.
    clue: { kind: 'banana', spacing: 60 },
  },
  // [T44, `docs/21` N4] The monkey case's third clue, before the
  // deduction: loop, garland, loop, garland in ONE stroke (`l u l u`), "Subió
  // a la liana, se hamacó, y subió a la otra" — changing shape without
  // lifting the finger, the core of the cursive link (`docs/21` §3.2.5).
  // `lianas()`: each loop is one `loops()` cycle (round, hole clearance ≈82,
  // visible ≈89 at this corridor), each garland a round `u` bowl after it:
  // the stroke dips onto the baseline, turns round the bowl's flat bottom and
  // rises into the next loop, or, after the last loop, up to the x-height
  // (330) where it ends. No pointed top anywhere (the author rejects them):
  // every join is tangent-continuous and no cubic bends tighter than ≈82
  // (`catalog.test.ts`'s T44 block). The loops are narrower than their cycle
  // so the bowl between them is wide enough to read as a `u` of its own.
  {
    id: 'monkey-lianas',
    phase: 2,
    title: 'De liana en liana',
    hint: 'Subí a la liana, hamacate y subí a la otra. Juntá las cáscaras.',
    kind: 'path',
    surface: 'blank',
    maze: true,
    resetOnContact: false,
    carrier: true,
    feedback: feedback(false),
    paths: [
      lianas({
        x0: 60,
        x1: 940,
        yBase: 450,
        yTop: 150,
        yExit: 330,
        pairs: 2,
        exitShare: 0.18,
        loopWidth: 0.23,
        loopHeight: 0.28,
        bowlHandle: 0.35,
        exitHandle: 0.45,
      }),
    ],
    corridorWidth: 75,
    rules: rules(2, true, true, 0),
    showGuide: true,
    letters: [],
    demo: true,
    // `docs/22` C11, registered by T43 for this level: one peel hanging at
    // the top of each liana (`at: 'loopTops'`).
    clue: { kind: 'bananaPeel', spacing: 60, at: 'loopTops' },
  },
  {
    id: 'monkey3',
    phase: 2,
    title: 'Rulos más chiquitos',
    // [T41] Names the leaves and the strategy.
    hint: 'Vueltas chiquitas. ¡Cuidado con las hojas! Esperá que pasen y seguí.',
    kind: 'path',
    surface: 'blank',
    maze: true,
    resetOnContact: false,
    carrier: false,
    feedback: feedback(false),
    // [T40] Three round loops, a little smaller than monkey2's.
    paths: [loops({ x0: 60, x1: 940, yTop: 150, yBase: 450, cycles: 3, loopWidth: 0.28, loopHeight: 0.28 })],
    corridorWidth: 75,
    rules: rules(2, true, true, 0),
    showGuide: true,
    letters: [],
    demo: true,
    // [T41] Two falling leaves, last adventure of the journey: one in each
    // valley between two loops, where the route runs level and the sheet is
    // open below (and, above, the leaf rises into the gap between the two
    // loops, clear of both). Never on a loop's own crossing. Radius 24 and a
    // 5-unit outward shift keep the rising leaf off both loops' strands.
    // Periods and phases as `turtle3`'s. `monkey4` (70, the narrowest)
    // stays free.
    obstacles: [
      { at: 0.335, travel: 218, shift: 5, periodMs: 3000, phase: 0, radius: 24 },
      { at: 0.665, travel: 218, shift: 5, periodMs: 2600, phase: 0.5, radius: 24 },
    ],
    hazardArt: SECTOR_ADVENTURE_ART.leaf,
    // [T27] Past the deduction, the case is solved — this level (and
    // `monkey4`) gathers the recovered monkey FAMILY along the loops'
    // own crests, the `collect` mechanic `sheep-hill`/`llama-peak`/
    // `duck-trail3`/`4` ship (T17): `'crests'` (`waveCrestArcs`), NOT
    // `'peaks'` — see this family's own header comment (measured, not
    // guessed: `routeApexes` finds zero apexes on this shipped route).
    // `ZOO_ANIMAL_ART.mono` is a placeholder sign block (`docs/20` B10
    // pending), flagged the same way as `duck-trail3`/`4`'s own scaled-
    // down duckling stand-in.
    collect: { items: 'crests', art: ZOO_ANIMAL_ART.mono, size: 50 },
  },
  {
    id: 'monkey4',
    phase: 2,
    title: 'Muchos rulos seguidos',
    // [T40] Three loops, the smallest of the family, in the journey's
    // narrowest corridor (70). Four loops no longer fit: at four per sheet no
    // round loop keeps a visible hole at any corridor of 70 or more.
    hint: '¡Tres rulos redonditos seguidos, sin levantar el dedo!',
    kind: 'path',
    surface: 'blank',
    maze: true,
    resetOnContact: false,
    carrier: false,
    feedback: feedback(false),
    paths: [loops({ x0: 60, x1: 940, yTop: 150, yBase: 450, cycles: 3, loopWidth: 0.26, loopHeight: 0.26 })],
    corridorWidth: 70,
    rules: rules(2, true, true, 0),
    showGuide: true,
    letters: [],
    demo: true,
    // [T27] Same reasoning as `monkey3` above — the last of the monkey
    // family, gathered along the route's own loop apexes.
    collect: { items: 'crests', art: ZOO_ANIMAL_ART.mono, size: 50 },
  },
  {
    id: 'f2-guirnalda',
    phase: 2,
    // Renamed from "Las olas de la medusa" (P3 follow-up, `odd/tasks/
    // promised-animals.md`): the title reaches the map's own accessible
    // action label (`ZooMap.tsx`'s `sectorActionLabel`, "Próximo juego:
    // …"), so a medusa name for a fish trail was a real, spoken
    // inconsistency once P2 retired the jellyfish's own `goalArt` — not
    // merely a cosmetic label nobody reads.
    title: 'Las burbujas de los peces',
    // The fish adventure's own first tramo (P2, `odd/tasks/promised-
    // animals.md`; `zoo/adventures.ts`'s `fish` row): the child follows the
    // bubbles the fish left behind on their way out, not a medusa swimming
    // for its own sake — the same "trace the animal's own path" reframing
    // `docs/18` §4.1 asks every trail to carry.
    hint: 'Seguí las burbujas: bajá, hacé la curva y subí, sin levantar el dedo.',
    kind: 'path',
    surface: 'blank',
    // [T40, author's tablet play-test 2026-09-27: "¿Por qué el nivel de los
    // peces es tan distinto? Tiene un trazo gris en el medio... Además tiene
    // un coso de ritmo... sacalo."] The whole fish adventure (this level and
    // `f2-agua2..4`) draws the same plain white corridor every other
    // adventure trail draws: `maze: true` is what drops the grey centreline
    // and the crisp guide (`LevelPlay.tsx`'s `showCentreLine`/`guide`, both
    // gated on `!level.maze`). The pulsing beat ring is gone and so is the
    // fluency floor it paired with: without a beat to keep, an invisible
    // "steady speed" rule would fail a child for a reason nothing on screen
    // explains. The follow-up extended both to every phase-2 level and
    // removed the metronome from the engine (PHASE_2's own header).
    maze: true,
    resetOnContact: false,
    carrier: true,
    feedback: feedback(false),
    paths: [garland({ x0: 120, x1: 880, yTop: 190, yBottom: 430, cycles: 3 })],
    corridorWidth: 100,
    rules: rules(2, true, true, 0),
    showGuide: true,
    letters: [],
    demo: true,
    // `clue`/no `goalArt`/no `detectiveWorld` (P2): this trail now belongs
    // to the `fish` ADVENTURES row, so `LevelPlay.tsx`'s `endArt` priority
    // chain (its own header, "1. goalArt WINS over everything below") would
    // have kept showing the jellyfish here forever had `goalArt` stayed —
    // a level's own content beating a default it did not ask for is
    // exactly backwards once the level HAS a real adventure default (the
    // bubble clue, then the fish on the adventure's own last tramo) to
    // fall through to. `spacing: 60` matches every duck trail's own clue
    // spacing — the same arc-length density this app already uses
    // everywhere else.
    //
    // `detectiveWorld: true` — the field these four levels were the ONLY
    // ones ever authored with (`levels/world.ts`'s own header: "Nivel 3 is
    // the first thing in the app that needs [world membership and case
    // membership] apart") — is DROPPED here rather than kept alongside the
    // new `clue`: `isCaseTrail(level) = !!level.clue` (`levels/world.ts`)
    // now puts this level in the detective world all on its own, the exact
    // same mechanism every duck trail already relies on with no
    // `detectiveWorld` flag of its own. Keeping the flag would be
    // harmless in principle (`inDetectiveWorld`'s own doc: "can only
    // WIDEN, never narrow") but would falsify `world.test.ts`'s regression
    // guard, which specifically proves these four widen the world WITHOUT
    // a clue — a claim this change makes untrue. `world.test.ts` is
    // updated in the same commit to say so: no shipped level needs the
    // widening flag any more, and the mechanism stays generic and tested
    // through its own hand-built fixtures for whatever level needs it next.
    clue: { kind: 'bubble', spacing: 60 },
  },
  {
    id: 'f2-agua2',
    phase: 2,
    // [T26, `docs/19` §3: the peces row lists TWO clue arts, "burbuja ✓,
    // gota ✓"] Renamed from "Las burbujas se apuran" — `f2-guirnalda` already
    // carries `bubble`, and `detective/palette.test.ts`'s own case-wide
    // invariant ("keeps a CASE's earned clue colours pairwise distinct")
    // forbids the SAME clue kind twice within one case's own rail (two
    // identical chips read as one, not as two different traces found) — the
    // exact reason `duck`'s own two pistas levels already carry two
    // DIFFERENT kinds (`droplet`/`feather`, `cases.ts`'s own header). `gota`
    // is `ClueKind: 'droplet'`, the same physical picture duck's own
    // "salió del agua chorreando" clue uses — reuse across cases is fine
    // (only WITHIN one case's rail must stay distinct), so the title/hint
    // move from bubbles to drops to match what the chip actually shows.
    // [T43] The drops became the fish's own orange scales (`docs/22` C6:
    // fish leave no drops out of the water), so the title and hint follow.
    title: 'Las escamas brillantes',
    hint: 'Seguí las escamitas: hacé las curvas redonditas, como una U.',
    kind: 'path',
    surface: 'blank',
    maze: true,
    resetOnContact: false,
    carrier: true,
    feedback: feedback(false),
    paths: [garland({ x0: 120, x1: 880, yTop: 290, yBottom: 430, cycles: 4 })],
    corridorWidth: 80,
    rules: rules(2, true, true, 0),
    showGuide: true,
    letters: [],
    demo: true,
    // no `goalArt`/no `detectiveWorld` — see `f2-guirnalda`'s own comment
    // above. Not `bubble` — see this level's own title/hint comment above
    // for why. [T43] `scale` (`docs/22` C6), replacing `droplet`.
    clue: { kind: 'scale', spacing: 60 },
  },
  // [T44, `docs/21` N3] The fish case's third clue, before the deduction:
  // three loops going DOWN from a high line, "El pez bajó al fondo y volvió
  // a subir" — the descending loops of `g j p q y` (`docs/01` §7), which no
  // other level draws. `loops()` mirrored (`yBase` above `yTop`): the very
  // same round loops as `monkey2` (r≈90, hole clearance ≈88, visible ≈96 at
  // this corridor), turned upside down, so every T40 rule holds unchanged.
  {
    id: 'f2-buceo',
    phase: 2,
    title: 'El pez bajó al fondo',
    hint: 'Bajá como el pez hasta el fondo, girá y volvé a subir. Juntá las algas.',
    kind: 'path',
    surface: 'blank',
    maze: true,
    resetOnContact: false,
    carrier: true,
    feedback: feedback(false),
    paths: [loops({ x0: 60, x1: 940, yBase: 150, yTop: 450, cycles: 3, loopWidth: 0.307, loopHeight: 0.3 })],
    corridorWidth: 80,
    rules: rules(2, true, true, 0),
    showGuide: true,
    letters: [],
    demo: true,
    // [deviation from `docs/21` N3 / `docs/22` C6, which give this level the
    // scale] `f2-agua2` already carries `scale`, and every clue of a case is
    // a different thing (T40; `palette.test.ts` keeps a case's earned
    // colours distinct). What the fish nibbled at the bottom of each dive
    // is a bit of seaweed (`alga.png`, existing art), one at the bottom of
    // every loop (`at: 'loopBottoms'`).
    clue: { kind: 'seaweed', spacing: 60, at: 'loopBottoms' },
  },
  {
    id: 'f2-agua3',
    phase: 2,
    // Renamed from "Las olas cambian" (P3 follow-up) — see `f2-guirnalda`'s
    // own comment above. `f2-agua4`'s own "La estrella de mar" already
    // named the hazard, not the medusa, so it is untouched.
    // [T40] Past the deduction this level carries no bubbles (it collects
    // the fish family), so neither the title nor the spoken hint may name
    // them — the author heard "sigue las burbujas" with none on screen.
    title: 'Los peces en las curvas',
    // The microprogression's third step: SIZE and SPACING both vary within
    // one path (docs/11 Nivel 3), not just from level to level — the reason
    // `garlandVaried` exists rather than a wider `garland` call.
    hint: 'Las curvas se achican: juntá a los peces, despacito.',
    kind: 'path',
    surface: 'blank',
    maze: true,
    resetOnContact: false,
    carrier: true,
    feedback: feedback(false),
    paths: [
      garlandVaried({
        x0: 95,
        yTop: 220,
        cycles: [
          { width: 180, depth: 180 },
          { width: 130, depth: 95 },
          { width: 195, depth: 200 },
          { width: 140, depth: 110 },
          { width: 165, depth: 170 },
        ],
      }),
    ],
    corridorWidth: 68,
    rules: rules(2, true, true, 0),
    showGuide: true,
    letters: [],
    demo: true,
    // [T26, `docs/19` §2.3/§3] Past the deduction (`f2-guirnalda`/`f2-agua2`
    // are the fish case's own pistas levels; `f2-agua2` is where
    // `zoo/adventures.ts`'s `fish.deduction.after` fires), the case is
    // already solved — this level (and `f2-agua4`) gathers the recovered
    // fish FAMILY along the garland's own U's, never a clue: the same
    // `collect` mechanic `sheep-hill`/`llama-peak` (T17) and
    // `duck-trail3`/`duck-trail4` (T21) ship. `'troughs'`
    // (`levels/collect.ts`'s `collectItemsFromExtrema` via
    // `levels/dolphinExtrema.ts`'s `routeExtrema`, filtered to the `trough`
    // side) derives one fish per U bottom — `routeApexes`/`'peaks'` finds
    // nothing here for the identical reason `waveCrestArcs`'s own header
    // gives for a smooth wave (a garland's bottom is a smooth cubic
    // extremum, not a ridge's sharp apex), and `'crests'`/`waveCrestArcs`
    // itself would find the garland's own cycle BOUNDARIES instead of its
    // bottoms (they are turning points too, at the SAME height as the
    // route's own start/end) — `'troughs'` is the mode that asks for
    // neither. `ZOO_ANIMAL_ART.pez` scaled down stands in for a smaller
    // fish, the same convention T21 used for `ANIMAL_ART.pato` — no
    // dedicated small-fish art exists yet, flagged to the author.
    collect: { items: 'troughs', art: ZOO_ANIMAL_ART.pez, size: 40 },
  },
  {
    id: 'f2-agua4',
    phase: 2,
    title: 'La estrella de mar',
    // The fourth step of the microprogression: same wide geometry as desafío
    // 1 (the new demand is TIMING, not precision), but with a hazard that
    // means no fluency bar (design.md §3) — a real child's stop is a
    // deceleration, and fluency (`1 − CV(speed)`) would fail them for it.
    // [T40] One starfish and no bubbles on screen: the hint says what the
    // child sees, and names the stop the level is about.
    hint: '¡Cuidado con la estrella de mar! Esperá que pase y juntá a los peces.',
    kind: 'path',
    surface: 'blank',
    maze: true,
    // The one Nivel 3 level with a hazard: touching the border (or the
    // starfish) restarts the run, same rule trail1 carries (D3).
    resetOnContact: true,
    carrier: true,
    feedback: feedback(false),
    paths: [garland({ x0: 120, x1: 880, yTop: 190, yBottom: 430, cycles: 3 })],
    corridorWidth: 90,
    // travel 280 against a 90-unit corridor is 3.1× the channel, `f1-pelotas`'s
    // own ratio; `hazardGapFraction` (obstacles.ts) confirms a real, majority
    // gap (≈0.550) — longer than `f1-pelotas`'s, because stopping mid-garland
    // without lifting the finger is harder than stopping on a phase-1 maze.
    //
    // `at` is a FLANK, and which of the three numbers had to move was decided by
    // measurement rather than by taste. A hazard swings ±travel/2 along the
    // route's LOCAL PERPENDICULAR, so where it sits decides how much of that
    // swing is vertical. Authored at the trough (`at: 0.5`), the perpendicular
    // is straight up and down and the starfish's centre reached y 569 on a
    // 600-unit sheet — read off the live DOM, not estimated — with ~34 units of
    // art below it. It hung off the bottom of the world.
    //
    // Two fixes were tried and rejected before this one. Shrinking travel to 240
    // keeps it on the paper and turns the stop-and-go window into a MINORITY of
    // the cycle, which `catalog.test.ts` and `obstacles.test.ts` both caught —
    // the child would be waiting more than moving. Moving to a crest fixes the
    // edge too, but a garland's tangent at a crest is steep, so the
    // perpendicular is nearly horizontal and the starfish slides along the path
    // instead of across it: measured at 226 units sideways against 29 down.
    //
    // A flank is where the route runs diagonally, so the same full swing crosses
    // the channel at an angle and spends most of itself sideways: measured at
    // 221 across and 84 down, bottom edge y 411. Full travel, full window, and
    // the whole starfish stays on the sheet.
    obstacles: [{ at: 0.25, travel: 280, periodMs: 3000, phase: 0, radius: 34 }],
    rules: rules(2, true, true, 0),
    showGuide: true,
    letters: [],
    demo: true,
    // [T26] Same reasoning as `f2-agua3` above — the last of the fish
    // family, gathered along the garland's own U bottoms plus the route's
    // end. This is also the `fish` row's own LAST level (`zoo/adventures.ts`),
    // but `endArt` never has to choose the animal here any more: `collectDef`
    // suppresses `endArt` outright (`screen/LevelPlay.tsx`'s own priority
    // chain, "a collect level's route-end picture is the LAST collect item")
    // — the fish standing at the route's end is now the FINAL COLLECT ITEM
    // itself, drawn through the same vertexArt/vertexArtDeparting layer as
    // every other one, not a second, separately-drawn picture in the same
    // spot.
    collect: { items: 'troughs', art: ZOO_ANIMAL_ART.pez, size: 40 },
    hazardArt: HAZARD_STARFISH_ART,
  },
  {
    id: 'f2-colinas',
    phase: 2,
    title: 'Las montañas',
    // [T40] "al ritmo" named the metronome, which is gone.
    hint: 'Subí y bajá las montañas, sin levantar el dedo.',
    kind: 'path',
    surface: 'blank',
    maze: true,
    resetOnContact: false,
    carrier: false,
    feedback: feedback(false),
    paths: [hills({ cycles: 4 })],
    corridorWidth: 85,
    rules: rules(2, true, true, 0),
    showGuide: true,
    letters: [],
  },
  {
    id: 'f2-bucles',
    phase: 2,
    // [T40] Round loops now, not tall ones.
    title: 'Los rulos redondos',
    // [T40] "por golpe" named the metronome's beat, which is gone.
    hint: 'Rulo por rulo: subí, dá la vuelta y cruzá, todos iguales.',
    kind: 'path',
    surface: 'blank',
    maze: true,
    resetOnContact: false,
    carrier: false,
    feedback: feedback(false),
    paths: [loops({ x0: 60, x1: 940, cycles: 3, loopWidth: 0.307, loopHeight: 0.3 })],
    corridorWidth: 80,
    rules: rules(2, true, true, 0),
    showGuide: true,
    letters: [],
  },
  {
    id: 'f2-crestas',
    phase: 2,
    title: 'Las olas grandes',
    // [T40] "por golpe" named the metronome's beat, which is gone.
    hint: 'Ola por ola, de arriba abajo, sin frenar.',
    kind: 'path',
    surface: 'blank',
    maze: true,
    resetOnContact: false,
    carrier: false,
    feedback: feedback(false),
    paths: [crests({ cycles: 3 })],
    corridorWidth: 80,
    rules: rules(2, true, true, 0),
    showGuide: true,
    letters: [],
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// Fase 3 — Grafema aislado: una letra por familia de movimiento, para probar
// que el motor sirve para las cinco.
// ─────────────────────────────────────────────────────────────────────────────
const PHASE_3: LevelConfig[] = [
  {
    id: 'f3-l',
    phase: 3,
    title: 'La letra l',
    hint: 'Hacé el rulo alto de la ele, de una sola vez.',
    kind: 'path',
    surface: 'ruled',
    maze: false,
    resetOnContact: false,
    carrier: false,
    feedback: feedback(true),
    paths: letterPaths('f3-l', 'l'),
    corridorWidth: 42,
    rules: rules(3, true, true, 40),
    showGuide: true,
    letters: ['l'],
    demo: true,
  },
  {
    id: 'f3-a',
    phase: 3,
    title: 'La letra a',
    hint: 'Girá para este lado y cerrá la a, sin levantar el dedo.',
    kind: 'path',
    surface: 'ruled',
    maze: false,
    resetOnContact: false,
    carrier: false,
    feedback: feedback(false),
    paths: letterPaths('f3-a', 'a'),
    corridorWidth: 42,
    rules: rules(3, true, true, 40),
    showGuide: true,
    letters: ['a'],
    demo: true,
  },
  {
    id: 'f3-m',
    phase: 3,
    title: 'La letra m',
    hint: 'Hacé las montañas de la eme de corrido, sin frenar.',
    kind: 'path',
    surface: 'ruled',
    maze: false,
    resetOnContact: false,
    carrier: false,
    feedback: feedback(false),
    paths: letterPaths('f3-m', 'm'),
    corridorWidth: 42,
    rules: rules(3, true, true, 45),
    showGuide: true,
    letters: ['m'],
    demo: true,
  },
  {
    id: 'f3-o',
    phase: 3,
    title: 'La letra o',
    hint: 'Girá redondito y cerrá la o arriba.',
    kind: 'path',
    surface: 'ruled',
    maze: false,
    resetOnContact: false,
    carrier: false,
    feedback: feedback(false),
    paths: letterPaths('f3-o', 'o'),
    corridorWidth: 42,
    rules: rules(3, true, true, 45),
    showGuide: true,
    letters: ['o'],
    demo: true,
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// Fase 4 — Enlace. El corte del trazo entre las dos letras es el error a
// detectar: acá `mustBeContinuous` no es negociable.
// ─────────────────────────────────────────────────────────────────────────────
const PHASE_4: LevelConfig[] = [
  {
    id: 'f4-la',
    phase: 4,
    title: 'Enlace la',
    hint: 'Uní la ele con la a sin levantar el dedo.',
    kind: 'path',
    surface: 'ruled',
    maze: false,
    resetOnContact: false,
    carrier: false,
    feedback: feedback(false),
    paths: wordPaths('f4-la', ['l', 'a']),
    corridorWidth: 40,
    rules: rules(4, true, true, 50),
    showGuide: true,
    letters: ['l', 'a'],
    demo: true,
  },
  {
    id: 'f4-ma',
    phase: 4,
    title: 'Enlace ma',
    hint: 'Uní la eme con la a de un solo trazo.',
    kind: 'path',
    surface: 'ruled',
    maze: false,
    resetOnContact: false,
    carrier: false,
    feedback: feedback(false),
    paths: wordPaths('f4-ma', ['m', 'a']),
    corridorWidth: 40,
    rules: rules(4, true, true, 50),
    showGuide: true,
    letters: ['m', 'a'],
    demo: true,
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// Fase 5 — Palabra y automatización. En `f5-mama` la guía desaparece: solo
// quedan los renglones. Ese es el examen real de la memoria motora.
// ─────────────────────────────────────────────────────────────────────────────
const PHASE_5: LevelConfig[] = [
  {
    id: 'f5-ala',
    phase: 5,
    title: 'La palabra ala',
    hint: 'Escribí ala completa, de corrido.',
    kind: 'path',
    surface: 'ruled',
    maze: false,
    resetOnContact: false,
    carrier: false,
    feedback: feedback(false),
    paths: wordPaths('f5-ala', ['a', 'l', 'a']),
    corridorWidth: 40,
    rules: rules(5, true, true, 55),
    showGuide: true,
    letters: ['a', 'l', 'a'],
    demo: true,
  },
  {
    id: 'f5-mama',
    phase: 5,
    title: 'La palabra mama',
    hint: 'Ahora de memoria: escribí mama de un solo trazo.',
    kind: 'path',
    surface: 'ruled',
    maze: false,
    resetOnContact: false,
    carrier: false,
    feedback: feedback(false),
    paths: wordPaths('f5-mama', ['m', 'a', 'm', 'a']),
    corridorWidth: 40,
    rules: rules(5, true, true, 55),
    showGuide: false,
    letters: ['m', 'a', 'm', 'a'],
  },
]

/** The full MVP catalog, in play order (docs/08 section 5). */
export const LEVELS: readonly LevelConfig[] = [
  ...PHASE_1,
  ...PHASE_2,
  ...PHASE_3,
  ...PHASE_4,
  ...PHASE_5,
]

/**
 * Level ids whose path DEGRADED at import time (an unregistered letter, or a
 * word whose members are not eligible). Empty in a healthy build; exposed so a
 * dev overlay or a test can assert authoring health without parsing console
 * output.
 */
export const DEGRADED_LEVEL_IDS: readonly string[] = degraded

/** Look up a level by id. Throws — an unknown id is a programming error. */
export function getLevel(id: string): LevelConfig {
  const level = LEVELS.find((l) => l.id === id)
  if (!level) throw new Error(`Nivel no encontrado: ${id}`)
  return level
}

/** Every level of a phase, in play order. */
export function levelsByPhase(phase: Phase): LevelConfig[] {
  return LEVELS.filter((l) => l.phase === phase)
}

/** The next level in play order; `null` at the end of the catalog or for an unknown id. */
export function nextLevelId(id: string): string | null {
  const index = LEVELS.findIndex((l) => l.id === id)
  if (index < 0 || index >= LEVELS.length - 1) return null
  return LEVELS[index + 1].id
}
