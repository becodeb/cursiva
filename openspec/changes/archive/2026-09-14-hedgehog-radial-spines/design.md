# Design: The hedgehog in the night sector — loose radial strokes

Paso **H** of `docs/13` §8. Implements the proposal's seven decisions. Two of them move
under measurement, and this document says exactly where.

## 1. Technical Approach

One pure fold module, one render layer, one optional `LevelConfig` field, two engine
repairs, four levels. Every seam is additive, so an absent `spines` field leaves each of
the ~70 shipped levels on the exact code path it has today.

```
catalog.ts (4 rows)                     LevelPlay.tsx
   │ spines: SpineConfig                  │ spineRef (live aim, render only)
   ▼                                      │ spineState (mirrored for render)
levels/spines.ts  ── spineAnchors ──┬─────┤ onFrame  → spineAim
   pure, no React, no DOM           │     │ onRelease→ spineSettle (authoritative)
   │                                │     ▼
   ├── spineScore(strokes,cfg) ─────┼─► evaluateLevel (free branch)
   ├── spineMarks(cfg,state) ───────┼─► TraceCanvas.spines → SpineLayer
   ├── spineBody(cfg) ──────────────┘     (backdrop < HERE < ink)
   └── spineDemoPaths(cfg,k) ──────────► buildLevel.demoPaths → demo
detective/assets.ts: HEDGEHOG_SILHOUETTE (measured radius tables, hand-copied)
```

The architectural claim is `waypoints.ts:141-151`'s, tightened: **the live fold never
feeds the score.** `filled` is recomputed from the settled stroke list on every release,
so the lit anchor and `spineScore` cannot disagree by construction. The live fold carries
`aiming` only, which is render state and is never scored.

## 2. Architecture Decisions

### D1 — the fold splits into a live half and a settled half

| Option | Tradeoff | Decision |
|---|---|---|
| One `spineTick` latching `filled` live, like `waypointTick` | A spine is only a spine once it ends: straightness, chord length and the length band are end-of-stroke properties. A live latch would light an anchor the recount then refuses | Rejected |
| `spineAim` (live, `aiming` only) + `spineSettle` (from settled strokes) | Two functions, one extra state field | **Chosen** |

`spineAim` latches nothing scoreable, so the waypoint family's live/settled divergence
window does not exist here. `spineSettle` is monotone for free: greedy assignment over
strokes in temporal order gives the identical result for any prefix, so appending a stroke
can only grow `filled`. Both return the SAME REFERENCE when nothing flips.

### D2 — anchors are derived; the radius table is measured at build time

Hand-authoring 36 coordinates across four levels is how paso E lost a family. `spineAnchors`
derives every anchor from the same three numbers the `<image>` box comes from, so the art
and the scored geometry agree by construction rather than by audit.

Runtime PNG alpha reads are impossible (no canvas in the node test harness, and `docs/09` §3
bans the fragment machinery anyway). So the per-ray radius table is measured once with
`scripts/art/png.py` and shipped as a literal beside `HEDGEHOG_ART` in
`detective/assets.ts` — the same hand-copied-manifest idiom `backdrops.ts` already uses for
`quiet`/`brightest`, and the same precedent `docs/13` §4 records for the snake corridor
("ajustado por medición al momento de compilar"). Both poses live next to their own art
entry, keyed by the same union, so an art/table mismatch is not expressible. §10 carries
both measured tables and the command that reproduces them.

### D3 — the demo repair splits a name, and the gate turned out to be the real blocker

The proposal blamed `demos = target.paths.map(...)` (`LevelPlay.tsx:791-801`). Reading the
code found a **second, prior blocker it did not name**: `playDemo = !!level.demo &&
guideLevel === 'full'` (`:820`), and `guideLevelFor` returns `'none'` for any level with
`showGuide: false` (`:617`), which `catalog.test.ts:329-335` forces on every `kind: 'free'`
level. The demo is therefore unreachable on a routeless level for two independent reasons.
Both need repair.

Amendment 9's rule ("choose which meaning keeps the old name") applies twice:

| Name today | Two meanings | Old name keeps | New name |
|---|---|---|---|
| `target.paths` | the laid-out route (12 consumers) / the strokes the demo animates (1 consumer) | the route | `target.demoPaths` |
| `playDemo` | the level declares a demo / the child is still in the full-guide band | the band rule | `demoPlays(level, guide)` |

Invariant, true by construction and asserted over the whole shipped catalog, not over the
four new rows:

- `buildLevelTarget(l).demoPaths === buildLevelTarget(l).paths` (**reference** equality, not
  deep) for every `l` in `LEVELS` and `LEGACY_PHASE_1` without `spines`.
- `demoPlays(l, g) === (!!l.demo && g === 'full')` for every `l` in `LEVELS` and every
  `GuideLevel`. Verified precondition: no `kind: 'free'` level in the shipped catalog
  declares `demo`, so the new branch is unreachable without `spines`.

### D4 — the ink law binds the anchor MARK too, and the same geometry resolves it

Proposal Decision 1(b) closed both ink branches over the body (`TORCH_CHALK` 239 vs the
body's brightest 213.3 separates 25.7, short by 29.3). The anchor mark is subject to the
identical law, and it is worse: a mark centred ON the silhouette boundary puts half its
disc over the body's modal fill `#b09060` (148.1), where `TORCH_CHALK_DIM` (151.7) separates
**3.6**. The resolution is the one the mechanic already uses: the mark is pushed OUTWARD
along its own ray by exactly its own radius, so the disc is tangent to the silhouette and
lies entirely on the night band.

| Mark state | Paint | vs `night.quiet` 67.1 | vs `night.brightest` 95.9 | vs the other state |
|---|---|---|---|---|
| unfilled | `TORCH_CHALK_DIM` #989896, luma 151.7 | 84.6 | **55.8** | — |
| earned | `TORCH_CHALK` #f2efe6, luma 239.0 | 171.9 | 143.1 | 87.3 |

Both clear the 55 floor; the unfilled state clears `brightest` by 0.8, which is recorded as
a risk, not smoothed over. One flat colour per shape and an `href`-free fill swap follow
`docs/09` §1 and §4 ("el cambio es un swap de `fill`"); the geometry never moves, the
`WaypointLayer` "the swap must not move the art" precedent. Earning is a luma jump rather
than a gain of tone, which is `PRINT #000000`'s own documented exception inverted —
flagged to the author in §9, not resolved here.

### D5 — the base tolerance has a geometric ceiling and a pedagogical floor

`baseRadius` cannot exceed half the minimum neighbour spacing, or "nearest unfilled anchor"
stops being an unambiguous claim. Spacing is `2·r_min·sin(Δθ/2)`, so the ceiling is a
function of the BODY's own size and the anchor count, not a taste call:

```
baseRadius ≤ r_min · sin(arcWidth / (2·count))      (ceiling, asserted per level)
baseRadius ≥ TolTouch = 26                          (floor, docs/02 §5.1)
```

Two consequences, both stated as findings:

1. **The anchor count is capped by the body, and the measurement made the cap bite.** The
   profile's measured `r_min` over its spine arc is `154.0 px = 0.5033·H`, so 10 anchors at
   the 26-unit floor need `H ≥ 333`. At `H = 300` the ceiling is 23.9 and the floor wins, so
   `hedgehog3`'s BODY grows to 340 rather than its anchors thinning. The curled pose is round
   (`0.4956·W`, spread ±2.0% across its whole spine arc), so it carries 14 anchors at
   `H = 300`. Etapa 4's dense fan is only affordable on the curled hedgehog, which is exactly
   where `docs/14` puts it.
2. **`baseRadius` stops narrowing at 26.** Levels 3 and 4 share it. The ladder narrows
   through `tolDeg`, `straightness` and the length band instead. Below `TolTouch` the engine
   would be measuring the fingertip's contact patch rather than the child's aim.
3. **The body height is not a ladder rung.** 260 → 270 → 340 → 300 is not a progression, it
   is what the two bounds above leave. The strokes shrink down the ladder, the anchors
   multiply, and the body grows to hold them until the curled pose's roundness buys the last
   rung back.

### D6 — catalog placement and unlock ladder

Unchanged from proposal Decision 6: the four rows go after `dolphin4` and before
`f2-guirnalda` (`catalog.test.ts:121-127` requires ascending phases), `arena.unlockedWhen`
stays `isFiled(records, 'night4')`, no migration. `isUnlocked` (`LevelProgressStore.ts:
123-129`) is re-grepped at apply time and the result stated, as pasos E, F and G each did.

## 3. Data Model

### 3.1 `LevelConfig`, appended after `camera` (`types.ts:241`)

```ts
  /** A routeless level scored PER STROKE (`docs/13` §8 row H, "trazos sueltos
   *  radiales"). The field's REASON TO EXIST is `docs/13` §6's "trayectoria
   *  esperada": this family authors none and never will — each spine is its own
   *  short journey out of the body — so an anchor, an outward normal and a
   *  length band are what replaces it. Only legal on `kind: 'free'`; absent on
   *  every level that predates it, which keeps `f1-libre`, the twelve reveal
   *  levels and the four bee levels bit-identical. */
  spines?: SpineConfig
```

with `import type { SpineConfig } from './spines'` beside the existing `WaypointConfig`
import. No cycle: `spines.ts` imports from `letters/types`, `canvas/placeArt` and
`detective/assets`, never from `levels/types`.

### 3.2 `LevelTarget`, one added field

```ts
  /** The strokes the DEMONSTRATION animates. `paths` for every routed level —
   *  the SAME array reference, not a copy — so the demo, the corridor and the
   *  guide keep coming from one place. A routeless level with `spines` supplies
   *  its own (the first `DEMO_SPINES` anchor→tip segments); every other
   *  routeless level gets the same empty array `paths` is. */
  demoPaths: readonly string[]
```

### 3.3 `levels/spines.ts`

```ts
export type HedgehogPose = 'profile' | 'curled'

/** One pose's measured silhouette, in the image's OWN normalised space. */
export interface SilhouetteProfile {
  /** Opaque-pixel centroid, as a fraction of the image box (x/W, y/H). */
  readonly centroid: readonly [number, number]
  /** Outer silhouette extent along `radii.length` equally spaced rays from the
   *  centroid, starting at 0° (+x) and increasing CLOCKWISE (SVG convention,
   *  y is down), as a fraction of the image WIDTH. Normalised by WIDTH on both
   *  axes on purpose: the `<image>` preserves aspect, so one uniform scale
   *  carries both axes and a radius can never be stretched. */
  readonly radii: readonly number[]
}

export interface SpineConfig {
  readonly pose: HedgehogPose
  /** Where the body's CENTROID sits on the sheet, and how tall the picture is.
   *  The box is derived (`spineBody`), never authored, so the art and the
   *  scored anchors cannot drift apart. */
  readonly body: { readonly centre: Point; readonly height: number }
  /** The spine-bearing arc, degrees, SVG convention. `to` may exceed 360 to
   *  express a wrap (the profile's back runs 200 → 400). */
  readonly arc: { readonly from: number; readonly to: number }
  readonly count: number
  readonly rules: SpineRules
}

export interface SpineRules {
  readonly baseRadius: number    // measure 1, viewBox units
  readonly tolDeg: number        // measure 2
  readonly straightness: number  // measure 3, in (0, 1]
  readonly lenMin: number        // measure 4, CHORD
  readonly lenMax: number
}

export interface SpineAnchor {
  readonly x: number
  readonly y: number
  /** Outward unit normal: the RAY direction, centroid → anchor. */
  readonly nx: number
  readonly ny: number
  readonly deg: number
}

export interface SpineState {
  /** Anchor indices filled by SETTLED strokes. Never written from the live
   *  buffer: `waypoints.ts:141-151`'s argument, taken one step further — here
   *  the live fold cannot even disagree with the score. */
  readonly filled: ReadonlySet<number>
  /** The anchor the CURRENT stroke is addressing, or null. Render only, never
   *  scored, never persisted. */
  readonly aiming: number | null
}

export const EMPTY_SPINES: SpineState = { filled: new Set(), aiming: null }
/** How many spines the demonstration draws (`docs/13` §5 item 2, "mínima"). */
export const DEMO_SPINES = 3
/** Mark radius AND its outward offset, viewBox units — one number, so the disc
 *  is tangent to the silhouette by construction (§2 D4). 22 across sits inside
 *  `docs/09` §3's 20-30 band for a mark. */
export const SPINE_MARK_R = 11
/** Body-crossing sample step (measure 5). At the ~30 Hz onFrame throttle
 *  consecutive samples are tens of units apart, so the SEGMENT is subdivided —
 *  `trailPasses`'s own argument, restated. */
const BODY_STEP = 8

export function spineBody(cfg: SpineConfig): { href: string; box: ArtBox }
export function spineAnchors(cfg: SpineConfig): readonly SpineAnchor[]
export function spineOrigin(cfg: SpineConfig): Point
export function spineAim(prev: SpineState, points: readonly Point[], drawing: boolean, cfg: SpineConfig): SpineState
export function spineSettle(prev: SpineState, strokes: ReadonlyArray<ReadonlyArray<Point>>, cfg: SpineConfig): SpineState
export function spineScore(strokes: ReadonlyArray<ReadonlyArray<Point>>, cfg: SpineConfig): number
export function spineMarks(cfg: SpineConfig, state: SpineState): readonly SpineMark[]
export function spineRings(cfg: SpineConfig): readonly { x: number; y: number; radius: number }[]
export function spineDemoPaths(cfg: SpineConfig, k: number): readonly string[]
export function debugSpines(cfg: SpineConfig, k: number): SpineState
export function seedSpines(cfg: SpineConfig, debugCount: number | null): SpineState
```

### 3.4 Geometry, exactly

**Body box.** `spineBody` calls the shipped `placeArt` with the measured centroid as the
grip, so the layer and the scorer run the identical arithmetic:

```ts
const art = HEDGEHOG_ART[cfg.pose]
const { centroid } = HEDGEHOG_SILHOUETTE[cfg.pose]
const box = placeArt({ w: art.w, h: art.h, grip: centroid }, cfg.body.height, cfg.body.centre)
// centre C = cfg.body.centre, by definition of the grip
const scale = box.width / art.w        // uniform: aspect is preserved
```

**Anchors.** Midpoint sampling, so no anchor ever lands on an excluded endpoint and the set
is symmetric in the arc:

```
deg_i = arc.from + (arc.to − arc.from) · (i + 0.5) / count        i = 0 … count−1
r_i   = radiusAt(profile, deg_i) · art.w · scale                  (linear interpolation
                                                                   between the two nearest
                                                                   measured rays)
A_i   = C + (cos deg_i, sin deg_i) · r_i                          ON the silhouette
n̂_i   = (cos deg_i, sin deg_i)
```

The normal is the RAY, not the true surface normal. Deliberate: the pedagogy is "desde el
centro hacia afuera" (`docs/14`), the two coincide on the near-circular curled pose, and a
true normal would need a differentiable boundary the 24-ray table does not provide.

`spineOrigin(cfg) = A_0` — derived, so the level's start dot cannot drift from its anchors.

**The five measures.** A settled stroke `S = p₀ … pₙ` fills anchor `A_i` iff all five hold:

| # | Measure | Exact test |
|---|---|---|
| 1 | base proximity | `i` = the nearest **unfilled** anchor to `p₀`, ties to the lowest index; requires `‖p₀ − A_i‖ ≤ baseRadius` |
| 2 | outward aim | `angle(p_n − p₀, n̂_i) ≤ tolDeg`, via `acos(clamp(dot/‖·‖, −1, 1))` |
| 3 | straightness | `‖p_n − p₀‖ / arclength(S) ≥ straightness` |
| 4 | length band | `lenMin ≤ ‖p_n − p₀‖ ≤ lenMax` (CHORD, so a wobbly long stroke earns nothing) |
| 5 | no body crossing | for every sample of `S` subdivided at `BODY_STEP`, NOT (`‖p − C‖ < radiusAt(θ(p−C))·art.w·scale` AND `‖p − A_i‖ > baseRadius`) |

A stroke is tested against its nearest unfilled anchor **only**. Failing any measure fills
nothing and consumes nothing: the ink stays on the sheet and the child tries again
(`docs/13` §6, "condiciones de error: ninguna punitiva"). Searching every admissible anchor
was rejected because it would make assignment depend on the later measures, which is both
slower and harder to state.

`spineScore = round(100 · filled.size / anchors.length)`, recomputed purely from the settled
list at evaluation time.

## 4. Engine Repairs, Exact Code

**`levelStart`** (`buildLevel.ts:66-69`) gains a third source, after the second:

```ts
export function levelStart(config: LevelConfig, polyline: readonly Point[]): Point | undefined {
  if (polyline.length > 0) return polyline[0]
  if (config.waypoints) return config.waypoints.start
  // A routeless SPINE level begins at its first anchor — derived from the same
  // generator the scorer and the layer read, so there is no second literal to
  // drift. This is the third plug into the ONE place this function's own header
  // reserved for it.
  if (config.spines) return spineOrigin(config.spines)
  return undefined
}
```

Byte-identical for every level carrying neither field: `undefined`, exactly as
`config.waypoints?.start` returns today.

**`demoPaths`** in `buildLevelTarget`. In the free/empty early return (`:188-205`), bind the
array so reference equality is provable:

```ts
  const noPaths: string[] = []
  return {
    config,
    paths: noPaths,
    demoPaths: config.spines ? spineDemoPaths(config.spines, DEMO_SPINES) : noPaths,
    …
  }
```

and in the routed return (`:255-279`), `demoPaths: paths`.

**`evaluateLevel`'s free branch** (`:120-128`) gains one ternary:

```ts
    const accuracy = target.config.spines
      ? spineScore(strokes, target.config.spines)
      : target.config.waypoints
        ? waypointScore(strokes, target.config.waypoints)
        : revealScore(strokes, target.config, target.viewBoxWidth)
```

`mustBeContinuous: false` makes `allowedStrokes = strokes.length` (`:107`), so `extraLifts`
is 0 by construction and a many-stroke family is never punished for lifting. `minFluency: 0`.

## 5. Render Layer

`canvas/SpineLayer.tsx`, modelled on `WaypointLayer.tsx` (51 lines). One
`<g pointerEvents="none">` holding one `<image>` for the body, then one `<circle>` per mark,
then the debug rings. No `<mask>`, `<pattern>`, `<clipPath>`, `<defs>`, `useId`, no
`url(#…)` — `TraceCanvas.tsx:78-93`'s scar.

New structural prop on `TraceCanvas` (beside `TraceWaypoints`, `:490-496`):

```ts
export interface TraceSpineMark { x: number; y: number; filled: boolean }
export interface TraceSpines {
  body: { href: string; x: number; y: number; width: number; height: number }
  marks: readonly TraceSpineMark[]
  markRadius: number
  /** Resolved by the CALLER, never inside the layer — `TraceClueMark`'s
   *  convention. `TORCH_CHALK_DIM` / `TORCH_CHALK`. */
  dim: string
  earned: string
  rings?: readonly { x: number; y: number; radius: number }[]
  ringStroke?: string
}
```

Render order: the SAME slot `reveal` and `waypoints` occupy (`TraceCanvas.tsx:1161-1170`),
between the backdrop and every ink layer. A hedgehog level has no corridor, no ground and
no reveal, so this is the only thing between the backdrop and the ink. Inside the layer the
body goes first and the marks second, so a mark is never hidden by the picture it sits on.

Filled vs unfilled is a `fill` swap on the identical `<circle cx cy r>` (`docs/09` §4, and
§1's "un color plano por forma"): no stroke, no second shape, no movement. The mark's centre
is `A_i + SPINE_MARK_R · n̂_i`, which §2 D4 derives and §7 asserts.

The body `<image>` passes through `clampArtBox(box, sheetBounds)` like every other art layer.
All four levels place the box strictly inside the sheet, so the clamp is a no-op — asserted,
because a clamped box would silently move the art off the anchors the scorer measures.

## 6. `LevelPlay` Wiring

| Site | Line | Change |
|---|---|---|
| initialiser | `:307-313` sibling | `initialSpineState(level.spines, search)` → `seedSpines(cfg, spineDebugCount(search))`, `EMPTY_SPINES` when the level has no field |
| demo source | `:791-801` | `target.demoPaths.map(...)`; `demoMs` reads `target.demoPaths.length` |
| demo gate | `:820` | `const playDemo = demoPlays(level, guideLevel)` |
| refs | `:923-930` sibling | `spineRef` + `spineState` + `spinePin` (the flag REPLACES live input, `!debugLightPoint`'s shipped contract) |
| live fold | `:1177` sibling | `if (level.spines && !spinePin)` → `spineAim`, ref first then `setSpineState`, no haptics here |
| recount | `:1318-1346` | `if (level.spines && !spinePin)` → `spineSettle(spineRef.current, snapshot, level.spines)`; a grown `filled` fires the shipped one-shot haptic edge |
| reset A | `:942-981` `resetSurface` | through `initialSpineState`, never `EMPTY_SPINES`; `level.spines` added to the dep array |
| reset B | `:1095-1139` `restartRun` | the same two lines again — it does NOT call `resetSurface` |
| render prop | `:1557` sibling, `:1809` | `spines` memo from `spineBody`/`spineMarks`/`spineRings`; `dim: TORCH_CHALK_DIM`, `earned: TORCH_CHALK` |

The haptic edge lives at RELEASE, not mid-stroke: a spine is a spine only once it ends
(§2 D1). `onRelease` setting `phase: 'result'` costs nothing visible here — `drawnPlace =
inWorld || !!backdrop` (`:1475`) suppresses the pillars/coach block (`:1831`) on any backdrop
level, so the only effect of the Nth release is *Siguiente* enabling once approved (`:1900`).
No new phase machinery.

**A found defect, named and not silently fixed.** `restartRun:1118-1119` resets the waypoint
fold with the bare `EMPTY_WAYPOINTS`, which is exactly the bug `arrange.ts:180` warns about:
it would wipe a `?debug=estela:<k>` seed. It is unreachable today (only `resetOnContact:
true` reaches `restartRun`, and no free level sets it), so this change does not repair a
neighbouring capability's latent bug on the way past. It is recorded here and in §9.

## 7. Debug Flag

`devMode.ts`, appended after `arrangeDebugCount` (`:149-155`), body verbatim:

```ts
export function spineDebugCount(search: string): number | null {
  const arg = debugArg(search, 'espinas')
  …
}
```

Ungated, the same reason the other four screenshot flags are: it paints render state, adds
no control, persists nothing, and must work against the exact build `scripts/shot.sh` is
pointed at. **No collision with the shipped `?debug=espina`**: `isSpineDebug` (`:38-44`)
compares the whole value for exact equality with `'espina'`, and `debugArg` requires a colon
and an exact prefix match, so `?debug=espinas:3` reaches only the new parser. Verified by
reading both, and asserted.

ONE number drives both render facts the flag produces (the first `k` anchors filled AND the
`baseRadius` rings), so a capture cannot tell two stories — amendment A4's argument. The
assertions reach **`TraceCanvas`'s `spines` prop** through the shipped `traceCanvasProbe`
mock in `LevelPlay.test.tsx`, never the helper: `debugCarrier` was written, unit-tested,
green, and never invoked (amendment 8).

## 8. The Four Levels

Placement: after `dolphin4`, before `f2-guirnalda`. `phase: 1`, `kind: 'free'`,
`surface: 'blank'`, `maze: false`, `resetOnContact: false`, `carrier: false`,
`paths: []`, `corridorWidth: 0`, `showGuide: false`, `letters: []`,
`feedback: { tone: false, haptics: true, metronomeBpm: 0, rail: false }`,
`rules: { ...rules(1, false, false, 0), minAccuracy: … }`. `demo: true` on `hedgehog1`
alone: the movement is new exactly once (`docs/13` §5 item 2).

| Level | Pose | Height | Centre | Arc | n | baseRadius | tolDeg | straight | lenMin | lenMax | minAcc | Misses |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| hedgehog1 | profile | 260 | (440, 440) | 200 → 380 | 5 | 38 | 40 | 0.80 | 220 | 290 | 70 | 1 |
| hedgehog2 | profile | 270 | (450, 400) | 200 → 380 | 7 | 28 | 34 | 0.84 | 150 | 230 | 80 | 1 |
| hedgehog3 | profile | 340 | (460, 380) | 200 → 380 | 10 | 26 | 28 | 0.88 | 95 | 160 | 90 | 1 |
| hedgehog4 | curled | 300 | (500, 300) | 65 → 365 | 14 | 26 | 22 | 0.92 | 60 | 105 | 100 | 0 |

Every literal above is solved against the measured tables in §10, not against the ellipse
the first draft used. The profile arc is **identical on all three profile levels** and is not
a ladder rung: 200° → 380° is a property of the pose (§8.1), and widening it would put
anchors on a foot.

Titles and hints stay Spanish, matching the catalog: *Las primeras espinas* / "Dibujá
palitos largos desde el lomo hacia afuera."; *Más espinas* / "Salen más espinas. Empezá en
cada marca y tirá para afuera."; *Espinas cortas* / "Espinas más cortas y más juntas: una en
cada marca."; *El erizo enroscado* / "Se hizo una bola. Dibujá espinas chiquitas alrededor."

### 8.1 Why those numbers

**The arcs come from measurement, in two passes.** Pass one bucketed pale (luma > 190)
opaque pixels by angle from the centroid; pass two marched the alpha at 0.25 px per ray
(§10). SVG convention throughout:

| Asset | Box | Centroid | Pale FACE arc | Peak bucket | Also excluded | Spine arc |
|---|---|---|---|---|---|---|
| `hedgehog-profile.png` | 448×306 | (242.6, 156.3) = (0.5416, 0.5107) | **130°–199°** (faces LEFT) | 160-169° (59.1%) | belly and feet, 60°–120° | **200° → 380°** |
| `hedgehog-curled.png` | 412×407 | (206.1, 204.7) = (0.5002, 0.5029) | **10°–60°** (lower-RIGHT) | 40-49° (61.7%) | none | **65° → 365°** |

The proposal flagged the handed-over curled reading ("300°–360°, lower-right") as internally
inconsistent and asked for a re-measurement. It was right: 300°–360° is the UPPER right, and
the corrected face arc is 10°–60°.

**The profile arc stops at 380°, not at the 400°–419° the pale test alone would allow, and
the radius table is what says so.** Two shape facts sit in the numbers:

- **A rear foot protrudes at ≈45°.** The radius is non-monotonic there: 30° reads 190.2 px
  and 45° reads 202.0 px. An anchor anywhere in 30°–60° would sit on a foot, and the spine
  would grow out of it.
- **The belly is concave between the feet.** At 75°/90°/105° the radius collapses to
  119.0–122.2 px, 27-29% below the elliptical fit. That region is outside the spine arc
  either way, but it is why measure 5 reads the table rather than a circle.

Ending at 380° leaves a 10° margin to the foot's rise at 30° and a 1° margin to the measured
face edge at 199°. The arc is therefore the same on `hedgehog1..3`: it belongs to the pose,
not to the ladder.

**`hedgehog1` meets the phase-1 guard's three numbers plus the horizontal clause, on the
real radii.** The guard (`catalog.test.ts:593-603`) opens with `if (level.kind !== 'path')
continue`, so these four are exempt exactly as the twelve reveal and four bee levels are; the
family asserts the bee family's split instead. A radius converts as `r_viewBox = r_px · H/306`
for the profile. At `H = 260` the five anchors (mids of 200° → 380°, step 36°) land at
218/254/290/326/362°, with measured radii 144.4 / 131.1 / 137.1 / 157.4 / 173.4. With the
minimum admissible spine (`lenMin = 220`) and `c_y = 440`, `c_x = 440`:

```
minY = c_y − (131.1 + 220)·|sin 254°| = 440 − 337.5 = 102.5   < 180  ✓  (margin  77.5)
maxY = c_y + (173.4 + 220)· sin 362°  = 440 +  13.7 = 453.7   > 420  ✓  (margin  33.7)
span                                                 = 351.2   > 300  ✓  (margin  51.2)
horizontal span (218° to 362°)                       = 680.4   > 600  ✓  (margin  80.4)
```

and the LONGEST admissible spine (`lenMax = 290`) stays on the sheet: `y ∈ [35.2, 456.2]`,
`x ∈ [97.7, 903.1]`, body box `y ∈ [307.2, 567.2]`, `x ∈ [246.1, 626.7]`.

**The feasible band for `c_y` survived the measurement and got wider: 66 units, not 38.**
`(406.6, 472.8]`, bounded below by `maxY > 420` and above by the body staying on the paper.
The first draft's 38-unit band came from the ellipse's inflated lateral radius, which put a
long downward reach at 40° that the real silhouette does not have. The real profile is 9-12%
narrower at 0°/180° than the ellipse and almost exact at 270° (154.8 px measured against
153.0 predicted), so the vertical arithmetic barely moved while the horizontal shrank.

Levels 2-4 are checked for the on-paper claim only, with `lenMax`: a level must never ask for
a stroke it would then refuse. `hedgehog3`'s body is 340 because 10 anchors at the 26-unit
floor demand `r_min ≥ 166` (§2 D5), and `hedgehog4` returns to 300 because the curled pose
carries the same radius on every ray.

**The ladder is checkable, not adjectival** (amendment 8's standard). `lenMin` 220 > 150 > 95
> 60 and `lenMax` 290 > 230 > 160 > 105 strictly decreasing make *corto* and *pequeño*
verified claims. `tolDeg` 40 > 34 > 28 > 22 strictly decreasing, `straightness` 0.80 < 0.84 <
0.88 < 0.92 strictly increasing, `count` 5 < 7 < 10 < 14 strictly increasing, `baseRadius`
38 ≥ 28 ≥ 26 ≥ 26 non-increasing and never under the floor (§2 D5). The per-level
`baseRadius` ceilings, computed from the real anchor chords, are 41.5 / 30.9 / 27.1 / 27.5,
so each literal clears its own ceiling by 3.5 / 2.9 / 1.1 / 1.5.

**`minAccuracy` is chosen against the score's own granularity**, not copied. With `n`
anchors the score moves in steps of `100/n`, so the rule is "one spine forgiven on levels
1-3, none on level 4": `4/5 = 80 ≥ 70` and `3/5 = 60 < 70`; `6/7 = 86 ≥ 80` and `5/7 = 71 <
80`; `9/10 = 90 ≥ 90` and `8/10 = 80 < 90`; `14/14 = 100` and `13/14 = 93 < 100`. A `90` on
an 8-anchor level would have silently meant `100`, which is the hard early penalty `docs/13`
§6 forbids. The `100` on `hedgehog4` is not "fourteen perfect strokes in a row": a refused
stroke costs nothing and the attempt keeps accumulating, the same way the bee family's flat
100 works.

**A body 260-340 units tall is deliberate**, against `docs/09` §3's "animales ~140". The
hedgehog is not an animal standing on a corridor, it is the level's own surface — the snake
family's body-as-corridor precedent. `docs/13` §4 amendment 9 already records the reverse
case (the delfín at 64, not 140): a measured law beats an art-direction number, in both
directions.

### 8.2 Registry rows

| File | Change |
|---|---|
| `zoo/adventures.ts:24-33` | `AdventureId` gains `'hedgehog'` |
| `zoo/adventures.ts:74-195` | one row APPENDED at the end (amendment 9): `sector: 'nocturna'`, `animal: 'erizo'`, no `closingBeat` (`mapBubble` filters on `a.animal !== undefined`, `:251`), intro "Al erizo le faltan las espinas. ¿Se las dibujamos?", closing "¡El erizo tiene todas sus espinas!" |
| `zoo/sectors.ts:455-456` | `nocturna.animals` gains its first entry `{ id: 'erizo', dx: 0, dy: 0, size: 90, appearsWhen: ['hedgehog4'] }` at the existing `animalSpot`; `adventureIds` becomes eight |
| `zoo/backdrops.ts:105+` | `hedgehog` row: `art: SECTOR_BACKGROUND_ART.night`, the night row's `quiet`/`brightest`/`corridorRows` verbatim, `ink: TORCH_CHALK`, `inkDim: TORCH_CHALK_DIM`, no `tile`, no `channel` |
| `zoo/backdrops.ts:223` sibling | `export const SPINE_BACKDROPS = { hedgehog: ADVENTURE_BACKDROP.hedgehog! }` |
| `detective/assets.ts:55` | `ZooAnimalId` gains `'erizo'` |
| `detective/assets.ts:340-353` | `ZOO_ANIMAL_ART.erizo = HEDGEHOG_ART.profile`, with the art gap written down (§9) |
| `detective/assets.ts:357-360` sibling | `HEDGEHOG_SILHOUETTE: Readonly<Record<HedgehogPose, SilhouetteProfile>>` |

`arena.unlockedWhen` is untouched: re-pointing it at `hedgehog4` would REVOKE a sector
already open for existing records, which `sectors.ts:351` and `:446` both forbid.

## 9. Open Questions Carried to the Author

The repo's convention from pasos D, E and F: when a measured law corners an art-direction
call, leave the literal intact and name the author as the decider.

1. **Earning a spine is a luma jump, not a gain of tone.** `TORCH_CHALK` over
   `TORCH_CHALK_DIM` is +87.3 luma and 0 chroma, which is `PRINT #000000`'s documented
   exception used in the other direction. A warm token (the lamp's `#f2d377`, luma 209.8,
   clearing `quiet` by 142.7) would make it a real gain of tone. Not taken: adding a palette
   token to this family is art direction.
2. **The erizo standing on the map has no spines** (proposal Q2's assumption, kept). Both
   shipped PNGs are spineless by design (`docs/13` §7). Closing it needs a third drawing.
3. **A darkened body would admit chalk over it** (proposal Q1). The target is exact: the
   body's brightest must fall from 213.3 to ≤ 184.0. A `mute()`-class pass on approved art.
4. **No second backpack object for `nocturna`** (proposal Q4's assumption, kept).
5. **`restartRun:1118-1119` resets the waypoint fold with the bare `EMPTY_WAYPOINTS`.** Real,
   latent, unreachable today, and not this change's to fix silently.

## 10. The Measured Silhouette Tables

Produced with `scripts/art/png.py` at 0.25 px marching resolution, alpha ≥ 128, 24 rays,
angles in SVG convention. These are the literals `detective/assets.ts` ships as
`HEDGEHOG_SILHOUETTE`, normalised by the image WIDTH (§3.4's uniform-scale argument).

**The ellipse approximation the first draft used is unusable for the profile and fine for
the curled pose.** Profile: mean error 8.8%, max 28.6%; over the spine arc alone the radius
runs 154.0 → 205.8 px, a 34% spread. Curled: mean error 1.2%, max 8.1%, and that max sits
inside the excluded face arc. The table is load-bearing for one pose and a formality for the
other, and the design treats them differently for that measured reason.

### `hedgehog-profile.png` — 448×306, centroid (0.5416, 0.5107)

| ° | r_px | r/W | ° | r_px | r/W | ° | r_px | r/W | ° | r_px | r/W |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 0 | 203.8 | 0.45491 | 90 | 119.0 | 0.26563 | 180 | 204.0 | 0.45536 | 270 | 154.8 | 0.34554 |
| 15 | 205.8 | 0.45938 | 105 | 122.2 | 0.27277 | 195 | 183.2 | 0.40893 | 285 | 159.0 | 0.35491 |
| 30 | 190.2 | 0.42455 | 120 | 172.2 | 0.38438 | 210 | 175.5 | 0.39174 | 300 | 166.0 | 0.37054 |
| 45 | 202.0 | 0.45089 | 135 | 196.8 | 0.43929 | 225 | 165.0 | 0.36830 | 315 | 179.2 | 0.40000 |
| 60 | 167.5 | 0.37388 | 150 | 188.2 | 0.42009 | 240 | 159.0 | 0.35491 | 330 | 187.5 | 0.41853 |
| 75 | 122.2 | 0.27277 | 165 | 226.8 | 0.50625 | 255 | 154.0 | 0.34375 | 345 | 196.5 | 0.43862 |

Two features drive §8.1: the 30° → 45° reversal (a rear foot) and the 75°–105° collapse (the
belly, cut away between the feet). Both are OUTSIDE the 200° → 380° spine arc, so no anchor
touches either. Measure 5 still reads the table across the whole circle, and there the
concavity is handled conservatively: linear interpolation between two rays spanning a
concave stretch over-estimates the radius, which makes the body-crossing test stricter, never
laxer.

### `hedgehog-curled.png` — 412×407, centroid (0.5002, 0.5029)

| ° | r_px | r/W | ° | r_px | r/W | ° | r_px | r/W | ° | r_px | r/W |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 0 | 203.2 | 0.49320 | 90 | 200.8 | 0.48738 | 180 | 206.5 | 0.50121 | 270 | 204.0 | 0.49515 |
| 15 | 201.2 | 0.48835 | 105 | 201.5 | 0.48908 | 195 | 205.5 | 0.49879 | 285 | 203.0 | 0.49272 |
| 30 | 223.5 | 0.54248 | 120 | 204.0 | 0.49515 | 210 | 204.2 | 0.49563 | 300 | 202.8 | 0.49223 |
| 45 | 209.0 | 0.50728 | 135 | 205.8 | 0.49951 | 225 | 205.2 | 0.49806 | 315 | 202.8 | 0.49223 |
| 60 | 204.0 | 0.49515 | 150 | 206.0 | 0.50000 | 240 | 209.0 | 0.50728 | 330 | 203.5 | 0.49393 |
| 75 | 201.5 | 0.48908 | 165 | 204.5 | 0.49636 | 255 | 207.0 | 0.50243 | 345 | 203.2 | 0.49320 |

Over the spine arc (65° → 365°): min 200.8, max 209.0, mean 204.2 px = **0.4956·W, spread
±2.0%**. `hedgehog4`'s constant-radius treatment is therefore admissible, and §11.1 ships
that admissibility as an assertion with ±2.0% as its bound rather than as an assumption.

### Reproduction

```python
import sys, math; sys.path.insert(0, 'scripts/art')
from png import read_png
def prof(path, nang=24, step=0.25):
    img = read_png(path); W, H = img.w, img.h
    op = [[img.px[(y*W+x)*4+3] >= 128 for x in range(W)] for y in range(H)]
    sx = sy = n = 0
    for y in range(H):
        for x in range(W):
            if op[y][x]: sx += x; sy += y; n += 1
    cx, cy = sx/n, sy/n
    for k in range(nang):
        a = 2*math.pi*k/nang; dx, dy = math.cos(a), math.sin(a); r = 0.0; last = 0.0
        while True:
            x = int(round(cx+dx*r)); y = int(round(cy+dy*r))
            if x < 0 or y < 0 or x >= W or y >= H: break
            if op[y][x]: last = r
            r += step
        print(round(math.degrees(a)), round(last, 1), round(last/W, 5))
prof('client/public/art/hedgehog-profile.png')
prof('client/public/art/hedgehog-curled.png')
```

## 11. Testing Strategy

| Layer | What | How |
|---|---|---|
| Unit | the five measures, one by one | `spines.test.ts`: a fixture config, one crafted stroke per measure, each failing exactly one |
| Unit | determinism and monotonicity | `spineAnchors` called twice is deep-equal; appending a stroke never shrinks `filled` |
| Unit | the anchor-spacing invariant | per level, `2·baseRadius ≤ min neighbour chord`, and `baseRadius ≥ TolTouch` |
| Unit | no anchor on a foot or a belly | every profile anchor's ray lies in `[200, 380]`, and the arc is IDENTICAL on `hedgehog1..3` |
| Unit | the curled pose really is round | `max/min − 1 ≤ 0.041` over its spine arc (the measured ±2.0%), so the constant-radius treatment is asserted, not assumed |
| Unit | the table is not an ellipse | the profile's measured radius at 90° is ≥ 20% below `0.5·H`, so a future "simplification" back to a circle goes red |
| Unit | no-op reference contract | `spineAim` returns the SAME reference when nothing flips |
| Render | the layer's markup | `SpineLayer.test.tsx`: `renderToString`, parse `<image>`/`<circle>`, assert no `url(#`, no `<mask`, no `<defs` |
| Screen | the debug flag reaches the prop | `LevelPlay.test.tsx` `traceCanvasProbe` |
| Source | reset coverage | `?raw` source read, `initialSpineState` counted at exactly 3 sites |
| Catalog | ladder, layout, registries | `catalog.test.ts` hedgehog block; `sectors.test.ts`; `backdrops.test.ts` |

### 11.1 The six assertions that must be confirmed RED

Each is broken on purpose, the red is recorded, and the break is reverted.

1. **Rendered-markup coincidence, all four levels, both poses.** `renderToString` the layer
   for each level, parse the emitted `<image x y width height>` out of the HTML STRING (never
   the internal box object — that is the exact gap paso E left), recover the box, and assert
   (a) it equals `spineBody(cfg).box`, so `clampArtBox` was a no-op; (b) every anchor the
   scorer measures lies on the silhouette implied by THAT box, to floating-point tolerance;
   (c) every rendered mark centre equals `A_i + SPINE_MARK_R · n̂_i`.

   **The break has to be chosen carefully or the assertion is vacuous.** Moving `body.centre`
   slides the picture AND the anchors together, so it stays green and proves nothing. Two
   breaks are real, and both must be confirmed red: push `body.centre` far enough that the
   box leaves the sheet, so `clampArtBox` slides the `<image>` while the anchors stay put;
   and add a constant offset inside `SpineLayer`'s own placement, which is the hand-tweak
   shape of paso E's defect. This is the descendant of "1,553 green tests coexisted with art
   drawn away from its own route", and it only catches that if it can watch the two sides
   move independently.
2. **The debug flag reaches the SCREEN.** Assert `probe.spines.marks` filled-count for each
   `k`, through `LevelPlay`, not through `debugSpines`. Break it by unwiring the prop;
   `debugCarrier` was green and never invoked, and only the captures caught it.
3. **Reset coverage by source-read count.** `initialSpineState(` appears at exactly 3 call
   sites (mount, `resetSurface`, `restartRun`). Break it by deleting the `restartRun` call;
   the count falls 3 → 2, `seedCameraFor`'s exact precedent (`LevelPlay.test.tsx:1425`).
4. **The ink law as an UNDRAWABILITY.** Assert `TORCH_CHALK` clears `night.quiet` by ≥ 55
   AND fails the body's brightest (213.3) by 29.3, so the no-body-crossing rule cannot be
   quietly relaxed later. Same pair for the unfilled mark. Break it by lowering the declared
   body brightest below 184.0.
5. **The demo is not empty.** A routeless level with `demo: true` yields
   `target.demoPaths.length ≥ 1` AND `demoPlays(level, 'none') === true`. **Both halves are
   red against `main` today**, which is the point; the second half is the blocker the
   proposal did not name.
6. **Its own backdrop group, with a substantive law.** `SPINE_BACKDROPS` joins the
   completeness guard (`backdrops.test.ts:92-100`). With no `tile` and no `channel` the veil
   check would fall back to `SHEET_PAPER` vs `brightest` and pass VACUOUSLY, since no paper
   is painted on a backdrop level. The group asserts the INK law instead (both mark states
   and the child's own line against `quiet` and `brightest`). Amendment 8 already recorded
   one rule going vacuous by construction; this change does not add a second.

### 11.2 Hand-enumerated guards that go red, as a checklist

- [ ] `catalog.test.ts:50-107` `EXPECTED_IDS` — four ids after `dolphin4`
- [ ] `catalog.test.ts:147-209` `CORRIDORS` — four `0` rows
- [ ] `catalog.test.ts:210-271` `FLUENCY` — four `0` rows
- [ ] `catalog.test.ts:281-299` minAccuracy-by-phase — add `if (level.spines) continue`, joining `reveal`/`artCorridor`/`waypoints`
- [ ] `catalog.test.ts:329-335` `showGuide` — satisfied by `showGuide: false`, no edit; re-run to confirm
- [ ] `catalog.test.ts:357-377` the free-level census — 17 → **21**, and the "no reveal and no waypoints" filter must learn `spines` or `f1-libre` stops being alone
- [ ] `catalog.test.ts:437-452` tone/haptics — `haptics` becomes `hasCorridor || reveal || waypoints || spines`
- [ ] `catalog.test.ts:593-612` phase-1 amplitude and on-paper guards — no edit (`kind !== 'path'` skips); the family asserts its own in the hedgehog block
- [ ] `catalog.test.ts:750-783` `levelsByPhase(1)`
- [ ] `catalog.test.ts:820-856` the phase-1 detective list
- [ ] `sectors.test.ts:244-249` — `nocturna.adventureIds` asserted EXACTLY, now eight
- [ ] `backdrops.test.ts:92-111` — the completeness guard and its sensitivity proof
- [ ] `artManifest.test.ts:109,175` / `artHierarchy.test.ts:286-287` — both poses already covered, verify only, no rebuild
- [ ] `HEDGEHOG_SILHOUETTE` — the shipped literals equal §10's tables ray for ray, and each `radii` array has exactly 24 entries with the centroid inside `(0, 1)²`; a future retune of the silhouette cannot pass quietly
- [ ] `LevelPlay.test.tsx` — the `demoPlays` and `demoPaths` catalog-wide invariants (§2 D3)
- [ ] `LevelProgressStore.ts:123-129` `isUnlocked` — re-grep at apply and state the result

## 12. Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or
process-integration boundary. The one script named here (`scripts/art/png.py`) is read-only
measurement run by a human at apply time, not wired into the build.

## 13. Migration / Rollout

No `build_art.py` re-run: both PNGs are already emitted (`:483-484`), registered
(`assets.ts:357-360`) and now measured. Verify, do not rebuild. `hedgehog4`'s art also
becomes `ZOO_ANIMAL_ART.erizo`, spineless, with §9 item 2 open.

No migration. Every new field is optional, so each existing level keeps its exact scoring
path, and `levelStart`'s, `demoPaths`' and `demoPlays`' new branches are unreachable without
a `spines` field. No persisted key is renamed and no progress record is invalidated:
`hedgehog*` ids are new, and `unlockedWhen` is untouched for every sector. Revert is the
branch merge's `git revert`.

Captures land in `capturas/pasoH/`, two per level: control and `?debug=espinas:<k>`. Paso E's
lesson — read one without the other and correct art looks detached. `docs/13` §4 gains
**amendment 10** in Spanish, recording what paso H learned, as a deliverable.

---

*Length note: this design exceeds the skill's 800-word budget, the same recorded deviation
as its five predecessors under `delivery_strategy: exception-ok`. `openspec/config.yaml`
requires decisions documented with rationale; this one carries six, two measured laws, a
second demo blocker the proposal did not name, and four levels whose whole layout is bound
by arithmetic.*
