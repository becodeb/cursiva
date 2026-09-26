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
import { FLOWER_ART, HAZARD_STARFISH_ART, SECTOR_ADVENTURE_ART } from '../detective/assets'
import { buildWord } from '../letters/combinations'
import { LETTER_REGISTRY } from '../letters/registry'
import type { LetterConfig } from '../letters/types'
import {
  crests,
  garland,
  garlandVaried,
  hills,
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
 * `metronomeBpm` is phase 2 only — the rhythm phase. `rail` is the "riel
 * asistido" first-contact assist: it magnetizes the ink toward the route, so it
 * belongs to the FIRST route of a new kind of task and nowhere else. Left on it
 * stops being an assist and becomes the child's motor plan.
 */
function feedback(metronomeBpm: number, rail: boolean): LevelFeedback {
  return { tone: true, haptics: true, metronomeBpm, rail }
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
    { art: SECTOR_ADVENTURE_ART.snakeSmall, spine: 'snakeSmall', span: 520, at: { x: 446.04, y: 152.7 } },
    { art: SECTOR_ADVENTURE_ART.snakeMedium, spine: 'snakeMedium', span: 640, at: { x: 446.04, y: 332.9 } },
    { art: SECTOR_ADVENTURE_ART.snakeLarge, spine: 'snakeLarge', span: 760, at: { x: 446.04, y: 507.3 } },
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
      spine: 'snakeSmall',
      span: 374.4,
      at: { x: 197.95, y: 300 },
      rotate: -90,
    },
    {
      art: SECTOR_ADVENTURE_ART.snakeMedium,
      spine: 'snakeMedium',
      span: 460.8,
      at: { x: 497.95, y: 300 },
      rotate: -90,
    },
    {
      art: SECTOR_ADVENTURE_ART.snakeLarge,
      spine: 'snakeLarge',
      span: 547.2,
      at: { x: 797.95, y: 300 },
      rotate: -90,
    },
  ]
}

/** Live feedback shared by all four snake levels (design.md §6.1's frozen
 *  shape). */
const SNAKE_FEEDBACK: LevelFeedback = { tone: true, haptics: true, metronomeBpm: 0, rail: false }

/** Scatter points for `snakeHorizontalPieces()`. Corrected TWICE now, both
 *  times by a screenshot, both times because the check that would have
 *  caught it does not exist (see `catalog.test.ts`'s new "every arrange.from
 *  scatter point stays fully ON THE SHEET" test, which now checks BOTH axes
 *  instead of only the one the first correction happened to fix):
 *
 *  1. (task 8.7/8.8) The FIRST authored values sat at `y ≈ 560-580`, close
 *     enough to the sheet's own bottom edge that a capture showed the
 *     scattered pieces mostly clipped below the canvas.
 *  2. (this correction) Fixing (1) only checked the Y axis. The X centres
 *     chosen then (250/500/750) never accounted for each piece's OWN width
 *     (520/640/760) — `large` alone is 76% of the sheet's default 1000-unit
 *     width, so centring it at 750 ran its box from 370 to 1130, clipping
 *     130 units off the RIGHT edge; `small` at 250 clipped 10 units off the
 *     LEFT. A reviewer's screenshot caught this a second time. The values
 *     below keep every piece's own full-width box inside `[0, 1000]`, which
 *     is why `large` sits closest to centre (500): it is the one piece with
 *     almost no room to move at all (`[120, 880]` is close to its own
 *     `[0, 1000]` ceiling). */
function snakeHorizontalScatter(): readonly { x: number; y: number }[] {
  return [
    { x: 350, y: 200 },
    { x: 620, y: 320 },
    { x: 500, y: 450 },
  ]
}

/** Scatter points for `snakeVerticalPieces()`. `y = 300` matches the
 *  columns' own vertical centre (a vertical piece is nearly as tall as the
 *  sheet itself; any other `y` clips it — this was checked from the start).
 *  `x` values are distinct from the three home columns (198/498/798) but,
 *  per the SAME correction `snakeHorizontalScatter` above needed, chosen to
 *  keep each piece's own UNROTATED width (`large`'s own span, 547, since a
 *  scattered piece renders unrotated — `LevelPlay.tsx`'s `arrangeRenderPieces`
 *  call) fully inside `[0, 1000]`: `large` at the original 700 left only
 *  26 units of margin on the right (`[426, 974]`); 650 gives 76. */
function snakeVerticalScatter(): readonly { x: number; y: number }[] {
  return [
    { x: 300, y: 300 },
    { x: 500, y: 300 },
    { x: 650, y: 300 },
  ]
}

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
    feedback: { tone: false, haptics: true, metronomeBpm: 0, rail: false },
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
    feedback: { tone: false, haptics: true, metronomeBpm: 0, rail: false },
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
    feedback: { tone: false, haptics: true, metronomeBpm: 0, rail: false },
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
    feedback: { tone: false, haptics: true, metronomeBpm: 0, rail: false },
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
    feedback: { tone: false, haptics: true, metronomeBpm: 0, rail: false },
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
    feedback: { tone: false, haptics: true, metronomeBpm: 0, rail: false },
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
    feedback: { tone: false, haptics: true, metronomeBpm: 0, rail: false },
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
    feedback: { tone: false, haptics: true, metronomeBpm: 0, rail: false },
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
 *  `docs/09` §3 sizes animals at ~140, and 140 DOES NOT FIT. The band between
 *  the corridor's outer wall and the edge of the sheet is
 *  `300 − amplitude − corridorWidth/2 − clear`; the phase-1 guard forces
 *  amplitude > 150, so at this family's authored 160 and `dolphin1`'s
 *  110-wide channel the ceiling is 140 − 55 − 8 = 77 (design.md A3, §5.2).
 *  The proposal estimated 80–90 by omitting the clearance; the real ceiling
 *  is 77.
 *
 *  64 spends 83% of that ceiling and keeps 13 units between the picture and
 *  the edge of the sheet at the tightest rung, which is what stops
 *  `clampArtBox` from being anything but the identity (design.md §5.4). This
 *  is the fourth time a measured law has cornered an art-direction number
 *  (`docs/13` §4 items 5, 6, 7, 8); the exact value inside the ceiling is
 *  the author's, and `catalog.test.ts` asserts the CONSTRAINT, never this
 *  literal. */
const DOLPHIN_SIZE = 64
/** How far the dolphin's picture clears the channel wall.
 *
 *  Strictly greater than `BAND_INSET` (6, `buildLevel.ts`) — the slack the
 *  SCORER forgives, "a trace exactly on the wall still reads as inside". A
 *  picture that clears the wall by less than that slack could be visibly
 *  touched by a trace the engine counts as clean, and *"pasa entre ellos sin
 *  tocarlos"* would then be false on the screen while true in the score. 8
 *  is the smallest integer that is not (design.md §5.2). */
const DOLPHIN_CLEAR = 8

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
    feedback: { tone: false, haptics: false, metronomeBpm: 0, rail: false },
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
  // The duck case (case-registry-and-captions design.md §3): four themed
  // trails inserted BEFORE `trail1`, one clue each, corridor width strictly
  // decreasing 100→70. `game/migrateDuckCase.ts` protects a returning
  // child's positional unlock of `trail1..4` across this insertion — it
  // must ship before these four levels do (Ordering Summary, S1 before S2).
  //
  // The four are one undulation family (`docs/13` §2, duck-undulations design
  // §1): amplitude, then repetition, then per-cycle variation, then a
  // narrowing corridor — never a shape that belongs to another animal
  // (`docs/13` §4: the spiral is the snail's, the square/triangular shapes
  // are the sheep's).
  //
  //   duck-trail1  webfoot / one broad cycle — the pond's edge
  //   duck-trail2  breadcrumb / two cycles
  //   duck-trail3  bubble / two cycles with per-cycle amplitude variation
  //   duck-trail4  feather / three cycles, tapered narrower
  // ───────────────────────────────────────────────────────────────────────
  {
    id: 'duck-trail1',
    phase: 1,
    title: 'El charco del pato',
    hint: 'Seguí el charco de punta a punta.',
    kind: 'path',
    surface: 'blank',
    maze: true,
    resetOnContact: true,
    carrier: true,
    // FIRST CONTACT with a routed trail in the duck case: the rail is on
    // here and nowhere else, the same convention `trail1` carries.
    feedback: feedback(0, true),
    // [deviation from design.md §3's literal `amplitude: 140`] 140 draws a
    // vertical span of exactly 280 units, failing the pre-existing "phase 1
    // uses the whole blank sheet" guard (`catalog.test.ts`: every phase-1
    // routed level's vertical span MUST exceed the 300-420 writing band, i.e.
    // amplitude > 150) by 20 units. Widened to 170 — the same amplitude
    // design.md gives `duck-trail2` — which clears the guard with margin
    // (span 340, minY 130, maxY 470) while corridorWidth (100 vs 90) and
    // cycle count (1 vs 2) still carry the progression between the two.
    paths: [wave({ x0: 90, x1: 910, y: 300, amplitude: 170, cycles: 1 })],
    corridorWidth: 100,
    rules: rules(1, false, true, 0),
    showGuide: true,
    letters: [],
    demo: true,
    clue: { kind: 'webfoot', spacing: 60 },
  },
  {
    id: 'duck-trail2',
    phase: 1,
    title: 'El sendero de migas',
    hint: 'Seguí las migas sin salirte.',
    kind: 'path',
    surface: 'blank',
    maze: true,
    resetOnContact: true,
    carrier: true,
    feedback: feedback(0, false),
    paths: [wave({ x0: 90, x1: 910, y: 300, amplitude: 170, cycles: 2 })],
    corridorWidth: 90,
    rules: rules(1, false, true, 0),
    showGuide: true,
    letters: [],
    demo: true,
    clue: { kind: 'breadcrumb', spacing: 60 },
  },
  {
    id: 'duck-trail3',
    phase: 1,
    title: 'Las burbujas suben y bajan',
    hint: 'Seguí las burbujas: unas ondas son más grandes.',
    kind: 'path',
    surface: 'blank',
    maze: true,
    resetOnContact: true,
    carrier: true,
    feedback: feedback(0, false),
    // Step 3 of the undulation family (`docs/13` §2, "variación de
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
    // The switchback's reversal was the only thing that justified continuity
    // here; with no reversal it aligns with its three undulation siblings.
    rules: rules(1, false, true, 0),
    showGuide: true,
    letters: [],
    demo: true,
    clue: { kind: 'bubble', spacing: 60 },
  },
  {
    id: 'duck-trail4',
    phase: 1,
    title: 'El rastro de plumas',
    hint: 'Seguí el rastro de plumas, el camino se angosta.',
    kind: 'path',
    surface: 'blank',
    maze: true,
    // `{from: 1, to: 0.85}` against `corridorWidth: 70` keeps this step
    // narrower than step 3's fixed 80 along its ENTIRE length: `1.15` would
    // have started it at 80.5, wider than step 3 at one end.
    taper: { from: 1, to: 0.85 },
    resetOnContact: true,
    carrier: true,
    feedback: feedback(0, false),
    // Step 4 of the undulation family: the most cycles (three) AND the
    // tightest, narrowing corridor — the directive's progression
    // accumulates, so the last step keeps everything before it and adds the
    // final demand.
    paths: [wave({ x0: 90, x1: 910, y: 300, amplitude: 170, cycles: 3 })],
    corridorWidth: 70,
    rules: rules(1, false, true, 0),
    showGuide: true,
    letters: [],
    demo: true,
    clue: { kind: 'feather', spacing: 60 },
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
    feedback: feedback(0, false),
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
    feedback: feedback(0, false),
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
    feedback: feedback(0, false),
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
    feedback: feedback(0, false),
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
    feedback: feedback(0, true),
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
    feedback: feedback(0, false),
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
    hint: 'Subí alto, después una lomita más baja.',
    kind: 'path',
    surface: 'blank',
    maze: true,
    resetOnContact: true,
    carrier: false,
    feedback: feedback(0, false),
    paths: [peakRidge({ x0: 90, x1: 910, base: 480, heights: [320, 170, 320] })],
    corridorWidth: 80,
    rules: rules(1, false, true, 0),
    showGuide: true,
    letters: [],
    // T17: same mechanic as sheep-hill1's own `collect` — see its comment.
    collect: { items: 'peaks', art: SECTOR_ADVENTURE_ART.sheep, size: 56 },
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
    feedback: feedback(0, false),
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
    feedback: feedback(0, false),
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
    feedback: feedback(0, false),
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
    hint: 'Seguí los tres picos, uno tras otro.',
    kind: 'path',
    surface: 'blank',
    maze: true,
    resetOnContact: true,
    carrier: false,
    feedback: feedback(0, false),
    paths: [peakRidge({ x0: 90, x1: 910, base: 480, heights: [360, 360, 360] })],
    corridorWidth: 70,
    rules: rules(1, false, true, 0),
    showGuide: true,
    letters: [],
    // T17: same mechanic as llama-peak1's own `collect` — see its comment.
    collect: { items: 'peaks', art: SECTOR_ADVENTURE_ART.llama, size: 64 },
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
    feedback: feedback(0, false),
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
  // "búsqueda más intencional" step, expressed as a rising hidden-object
  // count (1, 2, 3, 3 — R4) rather than a widening area. No ordering is
  // required or asserted against `sand4` (design.md §5.4, ratified amendment
  // A2: an erase radius accumulates cleared area across an attempt, a light
  // radius does not persist anything, so the two are not comparable
  // quantities). Objects reference `SECTOR_ADVENTURE_ART.chest/.stone/.leaf`
  // (design.md §3.4) — their only consumer, landed in the same commit as
  // their `SINGLES` row and registry entry (task 4.4-4.6).
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
    feedback: { tone: false, haptics: true, metronomeBpm: 0, rail: false },
    paths: [],
    corridorWidth: 0,
    rules: { ...rules(1, false, false, 0), minAccuracy: 100 },
    showGuide: false,
    letters: [],
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
    reveal: {
      mode: 'light',
      cols: 15,
      rows: 9,
      radius: 200,
      objects: [{ art: SECTOR_ADVENTURE_ART.chest, size: 96, x: 180, y: 460 }],
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
    feedback: { tone: false, haptics: true, metronomeBpm: 0, rail: false },
    paths: [],
    corridorWidth: 0,
    rules: { ...rules(1, false, false, 0), minAccuracy: 100 },
    showGuide: false,
    letters: [],
    reveal: {
      mode: 'light',
      cols: 15,
      rows: 9,
      radius: 170,
      objects: [
        { art: SECTOR_ADVENTURE_ART.stone, size: 72, x: 260, y: 180 },
        { art: SECTOR_ADVENTURE_ART.leaf, size: 64, x: 740, y: 420 },
      ],
    },
  },
  {
    id: 'night3',
    phase: 1,
    title: 'Tres en la oscuridad',
    hint: 'Buscá las tres cosas escondidas en la oscuridad.',
    kind: 'free',
    surface: 'blank',
    maze: false,
    resetOnContact: false,
    carrier: false,
    feedback: { tone: false, haptics: true, metronomeBpm: 0, rail: false },
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
        { art: SECTOR_ADVENTURE_ART.chest, size: 96, x: 200, y: 140 },
        { art: SECTOR_ADVENTURE_ART.leaf, size: 64, x: 500, y: 440 },
        { art: SECTOR_ADVENTURE_ART.stone, size: 72, x: 820, y: 200 },
      ],
    },
  },
  {
    id: 'night4',
    phase: 1,
    title: 'La linterna chiquita',
    hint: 'La luz es más chica: buscá bien de cerca.',
    kind: 'free',
    surface: 'blank',
    maze: false,
    resetOnContact: false,
    carrier: false,
    feedback: { tone: false, haptics: true, metronomeBpm: 0, rail: false },
    paths: [],
    corridorWidth: 0,
    rules: { ...rules(1, false, false, 0), minAccuracy: 100 },
    showGuide: false,
    letters: [],
    reveal: {
      mode: 'light',
      cols: 20,
      rows: 12,
      radius: 110,
      objects: [
        { art: SECTOR_ADVENTURE_ART.leaf, size: 64, x: 140, y: 480 },
        { art: SECTOR_ADVENTURE_ART.chest, size: 96, x: 520, y: 120 },
        { art: SECTOR_ADVENTURE_ART.stone, size: 72, x: 880, y: 380 },
      ],
    },
  },
  // Víboras en la arena (`docs/13` §8 row E, `snake-drag-and-art-corridor`).
  // The arena sector's own four levels: the art corridor IS the drawn
  // snake, fitted at build time (design.md §1), and `snake2..4` gate
  // tracing behind arranging the three pieces smallest to largest first
  // (`object-arrange` capability). `enforceOrder: true` on all four is the
  // only rule that requires every one of the three snakes to be traced —
  // accuracy alone is scored as nearest-neighbour distance to the UNION of
  // the three bands (design.md §0 A3).
  {
    id: 'snake1',
    phase: 1,
    title: 'Tres víboras en la arena',
    hint: 'Mirá cómo se mueven las tres víboras y después seguilas vos.',
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
    title: 'Ordená y seguí',
    hint: 'Arrastrá cada víbora a su lugar, de la más chica a la más grande.',
    kind: 'path',
    surface: 'blank',
    maze: false,
    resetOnContact: false,
    carrier: false,
    feedback: SNAKE_FEEDBACK,
    paths: snakeHorizontalPieces().map(snakePathD),
    corridorWidth: 34, // lowered from 42 alongside snake1's own correction
    rules: { ...rules(1, false, true, 0), minAccuracy: 62 },
    showGuide: true,
    letters: [],
    artCorridor: snakeHorizontalPieces(),
    arrange: {
      from: snakeHorizontalScatter(),
      snapRadius: 60,
    },
  },
  {
    id: 'snake3',
    phase: 1,
    title: 'Víboras paradas',
    hint: 'Las víboras están de pie. Ordenalas y después seguilas de abajo hacia arriba.',
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
    arrange: {
      from: snakeVerticalScatter(),
      snapRadius: 60,
    },
  },
  {
    id: 'snake4',
    phase: 1,
    title: 'El desierto angosto',
    hint: 'El camino es más angosto ahora. Ordená y seguí con mucho cuidado.',
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
    arrange: {
      from: snakeHorizontalScatter(),
      snapRadius: 60,
    },
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
    feedback: { tone: false, haptics: true, metronomeBpm: 0, rail: false },
    paths: [],
    corridorWidth: 0,
    rules: { ...rules(1, false, false, 0), minAccuracy: 100 },
    showGuide: false,
    letters: [],
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
    feedback: { tone: false, haptics: true, metronomeBpm: 0, rail: false },
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
    hint: 'El panal está lejos. Pasá por las flores y llevá a la abeja hasta llegar.',
    kind: 'free',
    surface: 'blank',
    maze: false,
    resetOnContact: false,
    carrier: true,
    carrierArt: { art: SECTOR_ADVENTURE_ART.bee, size: 76 },
    feedback: { tone: false, haptics: true, metronomeBpm: 0, rail: false },
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
    feedback: { tone: false, haptics: true, metronomeBpm: 0, rail: false },
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
    feedback: feedback(0, false),
    // §2 step 1 — pocos delfines y separación amplia: 2 cycles, the widest
    // channel and the widest half-period in the family (design.md §4.2).
    paths: [wave({ x0: 90, x1: 910, y: 300, amplitude: 160, cycles: 2 })],
    corridorWidth: 110,
    rules: rules(1, false, true, 0),
    showGuide: true,
    letters: [],
    demo: true,
    vertexArt: { art: SECTOR_ADVENTURE_ART.dolphin, size: DOLPHIN_SIZE, place: 'extrema', clear: DOLPHIN_CLEAR },
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
    feedback: feedback(0, false),
    // §2 step 2 — más delfines: 3 cycles, same view, same corridor family
    // pace, narrower channel than step 1.
    paths: [wave({ x0: 80, x1: 920, y: 300, amplitude: 160, cycles: 3 })],
    corridorWidth: 100,
    rules: rules(1, false, true, 0),
    showGuide: true,
    letters: [],
    vertexArt: { art: SECTOR_ADVENTURE_ART.dolphin, size: DOLPHIN_SIZE, place: 'extrema', clear: DOLPHIN_CLEAR },
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
    feedback: feedback(0, false),
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
    vertexArt: { art: SECTOR_ADVENTURE_ART.dolphin, size: DOLPHIN_SIZE, place: 'extrema', clear: DOLPHIN_CLEAR },
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
    feedback: feedback(0, false),
    // §2 step 4 — sostener el patrón más tiempo: the most cycles AND the
    // narrowest channel in the family (design.md §4.2).
    paths: [wave({ x0: 80, x1: 2040, y: 300, amplitude: 160, cycles: 7 })],
    corridorWidth: 84,
    camera: { viewWidth: 1000, lead: 0.5 },
    rules: rules(1, false, true, 0),
    showGuide: true,
    letters: [],
    vertexArt: { art: SECTOR_ADVENTURE_ART.dolphin, size: DOLPHIN_SIZE, place: 'extrema', clear: DOLPHIN_CLEAR },
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
  //    `passesRemainingMeasures` compared the drawn direction against the
  //    ANCHOR's own idealised ray, but measure 1 already admits a start
  //    point anywhere within `baseRadius` — not ON the anchor. A child who
  //    starts at the EDGE of that tolerance circle and pulls perfectly
  //    straight outward from THEIR OWN fingertip draws along a ray that
  //    differs from the anchor's own ray by `atan(baseRadius / r)` — worth
  //    20°+ by itself on the old `hedgehog4` (baseRadius a third of
  //    `lenMin`), charged as a drawing mistake it never was. Fixed at the
  //    source (`spines.ts`'s own header on `passesRemainingMeasures`); this
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
    feedback: { tone: false, haptics: true, metronomeBpm: 0, rail: false },
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
      // fixed absolute number the doc's own "60 a 130" merely bounds —
      // 50-68 keeps the spike under half the ball's own radius (48% at
      // lenMax), matching the visual proportion `hedgehog3`/`hedgehog4`'s
      // profile bodies already had at their own (much larger) radius.
      rules: { baseRadius: 34, tolDeg: 46, straightness: 0.78, lenMin: 50, lenMax: 68 },
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
    feedback: { tone: false, haptics: true, metronomeBpm: 0, rail: false },
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
      // own comment) — 44-56 keeps lenMax at 44% of this ball's ~140-unit
      // anchor radius, shorter than hedgehog1's own band (decreasing within
      // the curled pair, matching the ladder hedgehog3/hedgehog4 keep).
      rules: { baseRadius: 30, tolDeg: 40, straightness: 0.82, lenMin: 44, lenMax: 56 },
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
    feedback: { tone: false, haptics: true, metronomeBpm: 0, rail: false },
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
      rules: { baseRadius: 27, tolDeg: 32, straightness: 0.86, lenMin: 76, lenMax: 98 },
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
    feedback: { tone: false, haptics: true, metronomeBpm: 0, rail: false },
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
      rules: { baseRadius: 26, tolDeg: 28, straightness: 0.9, lenMin: 62, lenMax: 80 },
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
    feedback: feedback(0, true),
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
    feedback: feedback(0, false),
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
    feedback: feedback(0, false),
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
    feedback: feedback(0, false),
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
    feedback: feedback(0, false),
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
    feedback: feedback(0, false),
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
// phase 3 — and what they gain is the metronome: this is the rhythm phase
// (docs/01 phase 2, "planificación motora, ritmo").
//
// One beat = one cycle of the pattern, so the bpm falls as the cycle gets
// longer: 63 for the four short arcs of the montañas, 56/52 for the three
// tall ones of the crestas and the rulos. Everything stays inside 50-70 bpm,
// which is a pace a six-to-eight-year-old can actually follow — fast enough
// to be a rhythm, slow enough to be a movement and not a scribble.
//
// `f2-guirnalda` is the SAME garland shape, retimed and rethemed as Nivel 3's
// entry point (docs/11): its id STAYS — it is a persisted unlock key — but its
// cycle widens (180×150 → 253×240) and its beat therefore falls with the same
// rule (66 → 54); the ordering pair this rule proves moves from
// `f2-guirnalda > f2-crestas` to `f2-agua2 > f2-guirnalda`. Nivel 3's own
// microprogression axis (`f2-guirnalda` → `f2-agua2` → `f2-agua3` →
// `f2-agua4`) is amplitude and proximity moving together and in opposite
// directions — cycle width 253→190→130…195(varied)→253, dip depth
// 240→140→95…200(varied)→240 — while the corridor narrows to match
// (100→80→68→90) and the beat climbs with it (54→64→68→silent). Desafío 4
// deliberately RETURNS to desafío 1's wide, easy-to-read geometry and drops
// both the metronome and the fluency bar: fluency is `1 − CV(speed)`, so it
// punishes the exact deceleration the level asks for, and a metronome would
// tell the child to keep going while the starfish says wait (design.md §3).
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
  // llama/snake/bee/dolphin/hedgehog — the reason is `maze`, not the
  // sector: `ovals()`'s own shape is the LESSON (a pattern to learn), so it
  // needs `maze: false` to keep `guide={showShapeLine && !level.maze}`
  // (`TraceCanvas.tsx`) drawing the ideal line — the exact reason
  // `f2-guirnalda`/`f2-colinas`/`f2-bucles` all keep `maze: false` too. But
  // `catalog.test.ts`'s own "renders only the phase-1 routes as real
  // mazes" guard is unconditional: `level.maze === (phase === 1 && kind ===
  // 'path')` for every level without an `artCorridor` — so a `maze: false`
  // routed level MUST be phase 2, full stop. Phase 2 also means these four
  // must stay INSIDE the 149-451 writing band (`catalog.test.ts`'s own
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
  // `carrier: true` would be a silent no-op without `inWorld` true (no
  // `carrierArt` would ever resolve, `LevelPlay.tsx:2526-2531`), which is
  // exactly why sheep/llama leave it off too.
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
  // `feedback.metronomeBpm` climbs 55 → 60 → 64 → 68 as the rings shrink
  // and multiply — inside `catalog.test.ts`'s own required 50-70 band for
  // any phase-2 level whose beat is not silenced.
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
  {
    id: 'turtle1',
    phase: 2,
    title: 'La vuelta de la tortuga',
    hint: 'Empezá arriba, andá para la izquierda y dá toda la vuelta, como la tortuga.',
    kind: 'path',
    surface: 'blank',
    maze: false,
    resetOnContact: false,
    carrier: false,
    feedback: feedback(55, false),
    // A single ring: `ovalTurnRadius(150, 150) = 150`, comfortably clear of
    // `100/2 − 6 = 44`.
    paths: [ovals({ x0: 350, x1: 650, cy: 300, rx: 150, ry: 150, count: 1 })],
    corridorWidth: 100,
    rules: rules(2, true, true, 35),
    showGuide: true,
    letters: [],
    demo: true,
  },
  {
    id: 'turtle2',
    phase: 2,
    title: 'Dos vueltas seguidas',
    hint: 'Dos vueltas seguidas: terminá una y seguí con la otra sin levantar el dedo.',
    kind: 'path',
    surface: 'blank',
    maze: false,
    resetOnContact: false,
    carrier: false,
    feedback: feedback(60, false),
    // `ovalTurnRadius(120, 150) = 96`, clear of `90/2 − 6 = 39`.
    // `ovalSpacingClearance(360, 120, 90, 2)`: gap left over is
    // `360 − 240 − 90 = 30`, which is `⅓` of the corridor width — clear of
    // the quarter-width floor.
    paths: [ovals({ x0: 140, x1: 860, cy: 300, rx: 120, ry: 150, count: 2 })],
    corridorWidth: 90,
    rules: rules(2, true, true, 38),
    showGuide: true,
    letters: [],
    demo: true,
  },
  {
    id: 'turtle3',
    phase: 2,
    title: 'Tres vueltas chiquitas',
    hint: 'Tres vueltas más chiquitas, siempre para el mismo lado.',
    kind: 'path',
    surface: 'blank',
    maze: false,
    resetOnContact: false,
    carrier: false,
    feedback: feedback(64, false),
    // `ovalTurnRadius(95, 150) ≈ 60.2`, clear of `80/2 − 6 = 34`.
    // `ovalSpacingClearance(300, 95, 80, 3)`: leftover `300 − 190 − 80 = 30`,
    // `⅜` of the corridor width.
    paths: [ovals({ x0: 50, x1: 950, cy: 300, rx: 95, ry: 150, count: 3 })],
    corridorWidth: 80,
    rules: rules(2, true, true, 40),
    showGuide: true,
    letters: [],
    demo: true,
  },
  {
    id: 'turtle4',
    phase: 2,
    title: 'Cuatro vueltas redonditas',
    hint: 'Cuatro vueltas redonditas, ¡como escribir oooo!',
    kind: 'path',
    surface: 'blank',
    maze: false,
    resetOnContact: false,
    carrier: false,
    feedback: feedback(68, false),
    // `ovalTurnRadius(75, 150) = 37.5`, clear of `70/2 − 6 = 29` — this
    // family's own tightest margin, the same role `f2-agua3`'s worst cycle
    // plays for the garland family.
    // `ovalSpacingClearance(240, 75, 70, 4)`: leftover `240 − 150 − 70 = 20`,
    // exactly the quarter-width floor (`0.25 × 70 = 17.5`, cleared by 2.5).
    paths: [ovals({ x0: 20, x1: 980, cy: 300, rx: 75, ry: 150, count: 4 })],
    corridorWidth: 70,
    rules: rules(2, true, true, 42),
    showGuide: true,
    letters: [],
    demo: true,
  },
  // ───────────────────────────────────────────────────────────────────────
  // The monkeys' own family (P4, `odd/tasks/promised-animals.md`): the Rulo
  // letter family's own rising, self-crossing loop (`docs/01` §8: `e l b h
  // k f`), taught by monkeys swinging on the forest's lianas — the same
  // `loops()` generator `f2-bucles` already ships (never changed, never
  // reused here: a fresh call with this family's own sizes).
  //
  // Every field this family shares with the turtles above carries the SAME
  // reasoning, restated once rather than per level: phase 2 (the same
  // `maze: false` ⇒ phase-2-only rule); `yTop: 150, yBase: 450` on every
  // level — `f2-bucles`' own exact band — rather than a shrinking one,
  // because phase 2's own "keeps phase 2 in the writing band" ceiling
  // leaves no room to grow BEYOND that band and still clears phase 1's
  // "spans over 300 units" floor were this phase 1 instead (the reason
  // this family is phase 2 at all, restated: `loops()`'s crossing shape
  // is a lesson, and `f2-bucles` already proves this exact band works for
  // it). `carrier: false`/no `clue`/no `detectiveWorld` (not in the
  // world — unlike turtles, the forest backdrop needs no `ink` override
  // at all: its own `brightest` clears the 55-luma law against the
  // default slate ink by 111, so `backdropEntry?.ink` resolving
  // `undefined` and falling back to `INK_COLOR` is already correct, see
  // the `monkeys` row in `zoo/backdrops.ts`). `resetOnContact: false` (a
  // gentle pattern family, no hazard). `rules(2, true, true, fluency)`
  // (one continuous stroke — every hint below says so). `feedback.rail`
  // stays off throughout — `loops()` is not a new mechanic here, the same
  // reason `llama-peak1` (reusing sheep's own `peakRidge`) gets no
  // first-contact assist either.
  //
  // Sizes are chosen against `loopHoleClearance(width, height,
  // corridorWidth)` (`paths.ts`/`paths.test.ts`): `loops()`'s own crossing
  // makes the strict `ovalTurnRadius`-style "never folds" bound unreachable
  // for this shape at ANY size this sheet can hold (that function's own
  // header shows the arithmetic), so this asks the achievable question
  // instead — stays at least as open, proportionally, as `f2-bucles`' own
  // shipped hole. `width` here is each cycle's own span, `(x1 − x0) /
  // cycles` — the exact quantity `loops()` itself divides by. `monkey4`'s
  // own `corridorWidth: 60` — narrower than the `≈70` first sketched for
  // this family — is a deliberate, measured departure: fitting five rings
  // across the sheet at `corridorWidth: 70` leaves no `x0`/`x1` span left
  // that ALSO clears the hole-clearance floor (checked, not assumed: every
  // span wide enough to clear the floor overflows the viewBox, and every
  // span that fits the viewBox falls short of the floor) — narrowing the
  // corridor by 10 units is what actually resolves the conflict, not a
  // loosened guard.
  // ───────────────────────────────────────────────────────────────────────
  {
    id: 'monkey1',
    phase: 2,
    title: 'El primer rulo',
    hint: 'Subí, dá una vuelta como el mono en la liana y bajá. Otra vez.',
    kind: 'path',
    surface: 'blank',
    maze: false,
    resetOnContact: false,
    carrier: false,
    feedback: feedback(55, false),
    // width 260, height 300: `loopHoleClearance(260, 300, 100)` — ratio
    // ≈0.135, clear of the 0.12 floor.
    paths: [loops({ x0: 240, x1: 760, yTop: 150, yBase: 450, cycles: 2 })],
    corridorWidth: 100,
    rules: rules(2, true, true, 35),
    showGuide: true,
    letters: [],
    demo: true,
  },
  {
    id: 'monkey2',
    phase: 2,
    title: 'Tres rulos colgado',
    hint: 'Tres vueltas colgado: subí, girá y bajá.',
    kind: 'path',
    surface: 'blank',
    maze: false,
    resetOnContact: false,
    carrier: false,
    feedback: feedback(60, false),
    // width 240, height 300: ratio ≈0.133.
    paths: [loops({ x0: 140, x1: 860, yTop: 150, yBase: 450, cycles: 3 })],
    corridorWidth: 90,
    rules: rules(2, true, true, 38),
    showGuide: true,
    letters: [],
    demo: true,
  },
  {
    id: 'monkey3',
    phase: 2,
    title: 'Rulos más chiquitos',
    hint: 'Las lianas se juntan: vueltas más chiquitas.',
    kind: 'path',
    surface: 'blank',
    maze: false,
    resetOnContact: false,
    carrier: false,
    feedback: feedback(64, false),
    // width 220, height 300: ratio ≈0.130.
    paths: [loops({ x0: 60, x1: 940, yTop: 150, yBase: 450, cycles: 4 })],
    corridorWidth: 80,
    rules: rules(2, true, true, 40),
    showGuide: true,
    letters: [],
    demo: true,
  },
  {
    id: 'monkey4',
    phase: 2,
    title: 'Muchos rulos seguidos',
    // Four rings, like `monkey3`, but in a narrower corridor. The first cut
    // squeezed five rings into a 60-unit corridor, the tightest path in the
    // game, for a first grader's last level before the letters. Difficulty now
    // comes from the corridor alone.
    hint: '¡Cuatro vueltas seguidas, como escribir llll!',
    kind: 'path',
    surface: 'blank',
    maze: false,
    resetOnContact: false,
    carrier: false,
    feedback: feedback(68, false),
    // width 220, height 300 (monkey3's own geometry) at corridor 70: the
    // hole ratio rises above monkey3's ≈0.130, comfortably clear of the 0.12
    // floor.
    paths: [loops({ x0: 60, x1: 940, yTop: 150, yBase: 450, cycles: 4 })],
    corridorWidth: 70,
    rules: rules(2, true, true, 42),
    showGuide: true,
    letters: [],
    demo: true,
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
    maze: false,
    resetOnContact: false,
    carrier: true,
    feedback: feedback(54, false),
    paths: [garland({ x0: 120, x1: 880, yTop: 190, yBottom: 430, cycles: 3 })],
    corridorWidth: 100,
    rules: rules(2, true, true, 35),
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
    // Renamed from "La medusa se apura" (P3 follow-up) — see `f2-guirnalda`'s
    // own comment above for why this title is spoken, not decorative.
    title: 'Las burbujas se apuran',
    hint: 'Más burbujas. Hacé las curvas redonditas, como una U.',
    kind: 'path',
    surface: 'blank',
    maze: false,
    resetOnContact: false,
    carrier: true,
    feedback: feedback(64, false),
    paths: [garland({ x0: 120, x1: 880, yTop: 290, yBottom: 430, cycles: 4 })],
    corridorWidth: 80,
    rules: rules(2, true, true, 38),
    showGuide: true,
    letters: [],
    demo: true,
    // `clue`/no `goalArt`/no `detectiveWorld` — see `f2-guirnalda`'s own comment above.
    clue: { kind: 'bubble', spacing: 60 },
  },
  {
    id: 'f2-agua3',
    phase: 2,
    // Renamed from "Las olas cambian" (P3 follow-up) — see `f2-guirnalda`'s
    // own comment above. `f2-agua4`'s own "La estrella de mar" already
    // named the hazard, not the medusa, so it is untouched.
    title: 'Las burbujas cambian',
    // The microprogression's third step: SIZE and SPACING both vary within
    // one path (docs/11 Nivel 3), not just from level to level — the reason
    // `garlandVaried` exists rather than a wider `garland` call.
    hint: 'Las burbujas se achican: curvas más chiquitas, despacio.',
    kind: 'path',
    surface: 'blank',
    maze: false,
    resetOnContact: false,
    carrier: true,
    feedback: feedback(68, false),
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
    rules: rules(2, true, true, 40),
    showGuide: true,
    letters: [],
    demo: true,
    // `clue`/no `goalArt`/no `detectiveWorld` — see `f2-guirnalda`'s own comment above.
    clue: { kind: 'bubble', spacing: 60 },
  },
  {
    id: 'f2-agua4',
    phase: 2,
    title: 'La estrella de mar',
    // The fourth step of the microprogression: same wide geometry as desafío
    // 1 (the new demand is TIMING, not precision), but with a hazard that
    // means no beat and no fluency bar (design.md §3) — a real child's stop is
    // a deceleration, and fluency (`1 − CV(speed)`) would fail them for it.
    hint: '¡Cuidado con las estrellas de mar! Seguí las burbujas sin tocarlas.',
    kind: 'path',
    surface: 'blank',
    maze: false,
    // The one Nivel 3 level with a hazard: touching the border (or the
    // starfish) restarts the run, same rule trail1 carries (D3).
    resetOnContact: true,
    carrier: true,
    feedback: feedback(0, false),
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
    // `clue`/no `goalArt`/no `detectiveWorld` — see `f2-guirnalda`'s own
    // comment above. This is also the `fish` row's own LAST level
    // (`zoo/adventures.ts`), so `endArt`'s priority chain's step 2 (an
    // animal-recovering adventure's own last level shows THAT animal) now
    // wins here once `goalArt` is out of the way — the fish, not a star or
    // another bubble, standing where THIS tramo's route ends.
    clue: { kind: 'bubble', spacing: 60 },
    hazardArt: HAZARD_STARFISH_ART,
  },
  {
    id: 'f2-colinas',
    phase: 2,
    title: 'Las montañas',
    hint: 'Subí y bajá las montañas al ritmo, sin levantar el dedo.',
    kind: 'path',
    surface: 'blank',
    maze: false,
    resetOnContact: false,
    carrier: false,
    feedback: feedback(63, false),
    paths: [hills({ cycles: 4 })],
    corridorWidth: 85,
    rules: rules(2, true, true, 40),
    showGuide: true,
    letters: [],
  },
  {
    id: 'f2-bucles',
    phase: 2,
    title: 'Los rulos altos',
    hint: 'Un rulo por golpe: subí bien alto y cruzá, todos iguales.',
    kind: 'path',
    surface: 'blank',
    maze: false,
    resetOnContact: false,
    carrier: false,
    feedback: feedback(52, false),
    paths: [loops({ cycles: 3 })],
    corridorWidth: 80,
    rules: rules(2, true, true, 45),
    showGuide: true,
    letters: [],
  },
  {
    id: 'f2-crestas',
    phase: 2,
    title: 'Las olas grandes',
    hint: 'Una ola por golpe, de arriba abajo, sin frenar.',
    kind: 'path',
    surface: 'blank',
    maze: false,
    resetOnContact: false,
    carrier: false,
    feedback: feedback(56, false),
    paths: [crests({ cycles: 3 })],
    corridorWidth: 80,
    rules: rules(2, true, true, 45),
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
    feedback: feedback(0, true),
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
    feedback: feedback(0, false),
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
    feedback: feedback(0, false),
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
    feedback: feedback(0, false),
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
    feedback: feedback(0, false),
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
    feedback: feedback(0, false),
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
    feedback: feedback(0, false),
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
    feedback: feedback(0, false),
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
