// Level model (docs/08_MOTOR_DE_NIVELES.md). One engine drives all five
// pedagogical phases: a maze path, a pre-cursive pattern, a single letter and
// a whole word are the same thing to the engine — a target path, a corridor
// width and a set of rules.
import type { LetterCheckpoint, Point } from '../letters/types'
import type { ArtImage, ClueKind } from '../detective/assets'
import type { ArtCorridorPiece, ArtCorridorPlacement } from './artCorridor'
// [free-trail-waypoints, Phase 4] `import type` only — `verbatimModuleSyntax`
// erases this at compile time, so `types.ts` (touched first, Phase 2) never
// depends on `levels/waypoints.ts` (created later, Phase 4) at runtime.
import type { WaypointConfig } from './waypoints'

export type Phase = 1 | 2 | 3 | 4 | 5

/**
 * What the child is doing on the surface.
 * `free`  — no target at all: open scribbling to warm up the whole arm.
 * `path`  — follow a target route (every other level).
 */
export type LevelKind = 'free' | 'path'

/**
 * The paper under the trace.
 * `blank` — an empty sheet. Phases 1-2 train visuomotor control and rhythm;
 *           the writing rules mean NOTHING there and are pure visual noise
 *           against docs/01 principle 1 (controlled cognitive load).
 * `ruled` — the three-zone pauta. Only from phase 3, where zone is the lesson.
 */
export type Surface = 'blank' | 'ruled'

export interface LevelRules {
  /** true = one single stroke; lifting the finger fails the fluency pillar. */
  mustBeContinuous: boolean
  /** true = checkpoints must activate strictly 1..N (stroke direction matters). */
  enforceOrder: boolean
  /** minimum fluency (0-100) required to pass. 0 disables the pillar. */
  minFluency: number
  /** minimum accuracy (0-100) required to pass. */
  minAccuracy: number
}

/**
 * A hazard that travels across the route and must be TIMED, not outrun.
 * This is the clearest inhibition task phase 1 can offer: approach, stop,
 * wait for the gap, go. A corner only asks the child to turn; a moving ball
 * asks them to hold still on purpose, which is the harder and more useful skill.
 */
export interface Obstacle {
  /** Where it sits on the route, 0..1 by arc length. */
  at: number
  /** Peak-to-peak travel, perpendicular to the route, in viewBox units. */
  travel: number
  /** Milliseconds for one full out-and-back cycle. */
  periodMs: number
  /** Cycle offset 0..1, so two hazards are never in step. */
  phase: number
  /** Contact radius. */
  radius: number
}

/** Corridor width multiplier along the route — "el sendero se estrecha". */
export interface Taper {
  /** multiplier at the start of the path. */
  from: number
  /** multiplier at the end. */
  to: number
}

/** Live feedback while the finger moves (docs/01 principle 2). */
export interface LevelFeedback {
  /** Soft sustained tone while inside the corridor; silence when outside. */
  tone: boolean
  /** navigator.vibrate pulse on leaving the corridor. Best-effort. */
  haptics: boolean
  /** Rhythm cue in beats per minute; 0 = off. Phase 2 only. */
  metronomeBpm: number
  /** Magnetize the ink toward the ideal route (docs/03 section 6, "riel asistido"). */
  rail: boolean
}

/** Authored level content. Everything jugable is data; the engine never changes. */
export interface LevelConfig {
  id: string
  phase: Phase
  title: string
  /** `free` levels have no target path and are scored on coverage, not accuracy. */
  kind: LevelKind
  /** Blank sheet for phases 1-2; ruled pauta from phase 3. */
  surface: Surface
  /** Render the corridor as walls knocked out of a solid field (a real maze). */
  maze: boolean
  /** Optional narrowing along the route. Absent = constant width. */
  taper?: Taper
  /** Timed hazards crossing the route. Empty/absent = none. */
  obstacles?: Obstacle[]
  /**
   * Touching a wall or a hazard sends the child back to the start of the route.
   *
   * This is a RULE, not a punishment: no score penalty, no red mark, no sound
   * of failure — the run simply begins again. It is what makes precision matter
   * moment to moment instead of only at the end, and it keeps faith with
   * docs/01 principle 2, which forbids scolding, not consequences.
   */
  resetOnContact: boolean
  /**
   * Draw a character riding the fingertip. The task stops being "trace a line"
   * and becomes "carry someone across without bumping the walls", which is the
   * same motor demand wrapped in an intention a six-year-old already has.
   */
  carrier: boolean
  feedback: LevelFeedback
  /** Spoken-style instruction, imperative and short. */
  hint: string
  /** Target path(s). Multiple entries = pen-lift segments (letter dots/bars). */
  paths: string[]
  /** Nominal corridor width in viewBox units. */
  corridorWidth: number
  rules: LevelRules
  /** false = no visible guide; the child traces from motor memory (phase 5). */
  showGuide: boolean
  /** Characters composing the level; empty for phases 1-2. */
  letters: string[]
  /** Animated demonstration before the attempt. */
  demo?: boolean
  /**
   * Marks this level as a detective trail (`detective-mode`). A trail owns
   * exactly one clue kind and places clue marks along its route, spaced by
   * ARC LENGTH rather than a fixed count (design.md "Colour Asset
   * Registry"; `detective/clues.ts`'s `clueMarks`/`clueCountFor`) — density
   * reads the same on a short trail and a long one, marks every `spacing`
   * units rather than a level-length-agnostic five. Optional and additive:
   * every level config that predates this field simply omits it and stays
   * an ordinary level, so all existing catalog entries remain valid
   * untouched.
   *
   * Absent here on purpose — the catalog wires this onto the four themed
   * trails (design unit 9, a later slice); `f1-libre` deliberately keeps it
   * absent too (design unit 9, task 10.5: "no clue mark, no PISTAS entry,
   * not tracked by the clue reducer").
   */
  clue?: { kind: ClueKind; spacing: number }
  /**
   * Marks this level as DRAWN IN the detective world (grass, mud ink, the
   * standing octopus, the wordless shell) without making it a case trail
   * (`levels/world.ts`'s `inDetectiveWorld`). A case trail (`clue` set) is
   * always in the world regardless of this field — the field can only WIDEN
   * world membership, never narrow it. Absent/false on every level authored
   * before this field, so every existing level keeps today's behaviour.
   */
  detectiveWorld?: boolean
  /** Stand THIS picture where the route ends, instead of the engine's two
   * hollow diamonds and instead of the case lamp. The medusa is Nivel 3's
   * content, not a side effect of case membership — a level's own art beats
   * a default it did not ask for (design.md §5). Absent = today's behaviour:
   * the lamp on a case trail, the diamonds otherwise. */
  goalArt?: ArtImage
  /** Draw this level's hazards as this picture instead of the plain circle
   * (`TraceHazards.art`). Absent = the shipped circle. */
  hazardArt?: ArtImage
  /** Static art STANDING at this route's own peaks: the sheep on the humps,
   * the llamas on the summits (`docs/13` §2). NOT a clue — no `ClueKind`, no
   * `PistasRail` entry, no case membership, and it does not put the level in
   * the detective world. Placement is DERIVED from the built route via
   * `levels/vertexArt.ts`'s `routeApexes`, never authored as coordinates.
   * Additive, absent on every level that predates it — the same convention
   * `goalArt` established. */
  vertexArt?: {
    art: ArtImage
    size: number
    /** WHERE on the route the art stands. Absent = `routeApexes`, i.e. the
     *  crests only, standing ON the line — the shipped sheep and llama
     *  behaviour, byte for byte. `'extrema'` = crests AND troughs, pushed
     *  OUTWARD clear of the channel (`levels/dolphinExtrema.ts`). The mode
     *  lives on the LEVEL, not inside `routeApexes`, so the function two
     *  families depend on gains no branch. */
    place?: 'apexes' | 'extrema'
    /** `'extrema'` only: how far the picture clears the channel wall.
     *  Defaulted at the call site so `'apexes'` never reads it. */
    clear?: number
  }
  /** A covering layer of independent tiles over this level's backdrop
   *  (`docs/13` §4, "superficie tapada por una grilla de piezas que se borran
   *  al tocarlas"). The field's REASON TO EXIST is `docs/13` §6's "trayectoria
   *  esperada": a reveal level has none, and `cols`/`rows`/`radius` are what
   *  replaces it — area to cover instead of a route to follow.
   *
   *  A UNION, not a `mode` flag with optional siblings: only a `light` level
   *  may carry `objects`, and only an `erase` level is scored on area.
   *  Stating that in the type makes `npm run build` the thing that catches
   *  an object list on a glass level, the same mechanism `FogPatch.rot: 0`
   *  and `CaptionedArt`'s required `label` already use. Additive and absent
   *  everywhere else — the convention `goalArt`/`vertexArt` established. */
  reveal?: RevealConfig
  /** Before the tracing opens, the child DRAGS this level's art-corridor
   *  pieces into their hollows, smallest to largest (`docs/13` §2). The
   *  SLOTS are the pieces' own homes — `artCorridor`'s own placements — so
   *  there is no second table to author. Absent = no arrange phase, which is
   *  every level that predates this field. */
  arrange?: { readonly from: readonly Point[]; readonly snapRadius: number }
  /** This level's drawn-cutout corridor pieces (`object-arrange`/
   *  `art-corridor` capabilities). Additive and absent on every level that
   *  predates it — every existing level keeps painting its corridor. */
  artCorridor?: readonly ArtCorridorPiece[]
  /** A routeless level scored by AUTHORED targets rather than by a route
   *  (`docs/13` §8 row F, "trazo libre con puntos de paso"). The field's
   *  REASON TO EXIST is `docs/13` §6's "trayectoria esperada": this family
   *  authors none — the child invents it — so a start, N stops and one goal
   *  are what replaces it. Only legal on `kind: 'free'`; absent on every
   *  level that predates it, which keeps `f1-libre` and the twelve reveal
   *  levels bit-identical.
   *
   *  [free-trail-waypoints, Phase 4] Additive — applied here, after Phase
   *  2's `carrierArt?`/`LevelTarget.start?` land in this same file. */
  waypoints?: WaypointConfig
  /** Ride THIS picture on the fingertip instead of the world's magnifying
   *  glass. A level's own art beats a default it did not ask for — the exact
   *  argument `goalArt` already carries (`LevelPlay.tsx:1196-1201`) — and
   *  until this field existed the carrier art was hard-wired at
   *  `LevelPlay.tsx:1511`. `{art, size}` rather than a bare `ArtImage`
   *  because `vertexArt` already established that shape and because the
   *  shipped `CARRIER_ART_SIZE` (104) is sized for the lens's transparent
   *  handle margin, not for a cutout that fills its own box. Absent = the
   *  shipped hard-wire, byte-for-byte. */
  carrierArt?: { art: ArtImage; size: number }
  /** A WINDOW narrower than the world (`docs/13` §8 row G,
   *  "desplazamiento de pantalla — viewBox que avanza con el trazo").
   *
   *  The field's REASON TO EXIST: `LevelTarget.viewBoxWidth` is the paper the
   *  level is laid out on, and until this field existed it was ALSO how much
   *  of that paper you could see, because `LevelPlay` renders `fit="contain"`
   *  (`:1616`) and `preserveAspectRatio="xMidYMid meet"` shrinks a wider
   *  sheet to fit. A longer route therefore shipped a SMALLER movement —
   *  the exact opposite of `docs/13` §2's "sostener el movimiento". This
   *  field splits the two numbers apart, and only for the levels that ask.
   *
   *  Absent = `viewWidth === viewBoxWidth`, the camera code path is
   *  unreachable, and the rendered markup is byte-identical to `main`. Absent
   *  on every level that predates it, including `f4-la` and `f5-mama`, whose
   *  wide-sheet `fit="contain"` behaviour is what `layOutPaths` was written
   *  for and must not move by a unit. */
  camera?: CameraConfig
}

/** The camera's own authored parameters (`scrolling-camera` capability).
 *  Additive and optional on `LevelConfig`; absent everywhere it predates
 *  this field. */
export interface CameraConfig {
  /** How wide the WINDOW is, in the same viewBox units the world is in.
   *  Every camera level ships `MIN_VIEWBOX_WIDTH` (1000) and
   *  `catalog.test.ts` asserts it: that single equality IS the pedagogical
   *  claim of this whole change — the stroke on `dolphin3` is drawn at the
   *  identical visual scale as the stroke on `dolphin1`, on `duck-trail1`,
   *  and on every other level in the app. The field is a number rather than
   *  the constant so a future row can widen its window without a new field,
   *  but nothing here does. */
  readonly viewWidth: number
  /** Where the finger sits inside the window once the world is moving, as a
   *  FRACTION of `viewWidth`. This is the lead window, and it is the whole
   *  defence against the central trap: a camera that simply centres on the
   *  finger self-scrolls, because a stationary finger on a moving view is
   *  moving in WORLD coordinates, so the world runs away and drags the child
   *  off a corridor they never left. See `canvas/camera.ts` for the algebra
   *  that makes a held-still finger a fixed point. */
  readonly lead: number
}

/** A covering layer over a routeless level's backdrop (`levels/revealGrid.ts`
 *  design.md §1.2). `erase` levels persist a cleared tile `Set` across the
 *  attempt and score on the cleared fraction against `rules.minAccuracy`;
 *  `light` levels persist nothing but which `objects` were ever lit, and
 *  complete when every one of them has been. */
export type RevealConfig =
  | { mode: 'erase'; cols: number; rows: number; radius: number }
  | { mode: 'light'; cols: number; rows: number; radius: number; objects: readonly RevealObject[] }

/** Something hidden in the dark, lying ON the backdrop UNDER the veil.
 *  Authored coordinates, unlike `vertexArt` — there is no route to derive a
 *  position from, which is the whole point of a routeless level. */
export interface RevealObject {
  art: ArtImage
  size: number
  x: number
  y: number
}

/** Runtime target derived from a LevelConfig at load time. */
export interface LevelTarget {
  config: LevelConfig
  /**
   * The config paths after horizontal centring in the 1000-wide viewBox. Every
   * other derived field comes from THESE, so the screen must render them too —
   * rendering `config.paths` instead would draw a corridor the engine does not
   * score against.
   */
  paths: string[]
  /**
   * Width of the normalized viewBox for this level: 1000, or wider when the
   * level's own path needs more paper (docs/02 section 3). The HEIGHT is always
   * 600 — the ruled zones never move.
   */
  viewBoxWidth: number
  /** Width of the WINDOW — what the `viewBox` ATTRIBUTE is wide. Equal to
   *  `viewBoxWidth` unless the level authors a camera, which is every level
   *  that predates this field. Consumed by exactly one expression in the
   *  whole repo: the `viewBox` attribute in `canvas/TraceCanvas.tsx`. */
  viewWidth: number
  /** Effective corridor width after adaptive tolerance. */
  corridorWidth: number
  /** Dense point band around the path — the accuracy scoring cloud. */
  ideal: ReadonlyArray<readonly [number, number]>
  /** Ordered activation zones along the path. */
  checkpoints: LetterCheckpoint[]
  /** Polyline of the main path, for the start marker and direction arrow. */
  polyline: Array<{ x: number; y: number }>
  /** Where this level BEGINS as a point (`levels/buildLevel.ts`'s
   *  `levelStart`): `polyline[0]` for a routed level, the authored
   *  `config.waypoints.start` for a routeless one that declares it,
   *  `undefined` for every level that has neither — exactly
   *  `target.polyline[0]` was before this field existed. The one place a
   *  future routeless mechanic plugs in its own start. */
  start?: Point
  /** Total arc length of the main path. */
  length: number
  /** Every path's own polyline and arc length. `routes[0]` IS `polyline`/
   *  `length` — the SAME objects, never copies (level-engine spec). One
   *  entry per `config.paths` entry, in the same order. Consumed by
   *  `screen/corridorTrack.ts`'s `multiCorridorTick` so the live wall-contact
   *  check can walk every route, not `paths[0]` alone. */
  routes: readonly RouteSegment[]
  /** One placement per `config.artCorridor` entry, derived AFTER the layout
   *  and therefore through the SAME `tx` the paths took. Absent when the
   *  level authors none, which is every level that predates this field. */
  artCorridor?: readonly ArtCorridorPlacement[]
}

/** One route's own polyline and arc length (level-engine spec, "Optional Art
 *  Corridor Field, and the Derived Routes..."). Defined here rather than in
 *  `screen/corridorTrack.ts` (which imports it) because it is a property of
 *  the LEVEL TARGET, and `screen/` already depends on `levels/`, never the
 *  reverse. */
export interface RouteSegment {
  readonly polyline: readonly Point[]
  readonly length: number
}
