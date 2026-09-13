# Design: Bees in the forest — the free trail with waypoints

Binding input: `proposal.md` and `exploration.md`. **Four of the proposal's decisions are corrected
here** (§0), and one of the corrections is a live, shipped defect on twelve levels that nobody has
named yet. Every `file:line` below was re-verified against the working tree on `sdd/abejas-en-el-bosque`.

Numbers are marked **[measured]** (Engram #1381, `scripts/art/png.py`, luma-601 — not re-measured
here), **[derived]** (closed-form arithmetic from the shipped code, the shipped hex literals,
`imageToViewBox`/`viewBoxToImage` or `placeArt`), **[read]** (read off the shipped source this
session — evidence, not a measurement), **[corrected]** (the proposal's claim was wrong and the
corrected one is used everywhere below), or **[to copy]** (a value that exists only after
`build_art.py` runs and must be hand-copied from the rebuilt `manifest.json` at apply time).

**How §4's geometry was obtained.** This design phase has no shell, so §4 is a CONSTRAINT SET with
one worked instantiation, and every authored literal is pinned at the safe end of its own window —
paso C §2.1, paso D §2.2 and paso E's §3 discipline. The one quantity the rebuild still owes
(`brightest` over the forest's new corridor rows) carries a stated prediction and a named lever.

---

## 0. Ratified amendments to the proposal

These supersede the proposal on these points. `sdd-tasks`, `sdd-apply` and the archive read this
contract, not the superseded text.

| # | § | What it corrects |
|---|---|---|
| **A1** | Scope 2 / Risks | **`offPath` is permanently TRUE on every routeless level, so the child's live line renders in the DIM colour — and on the forest that colour sits 10 luma from the ground.** `LevelPlay.tsx:1051-1058` computes `out = multiCorridorTick(target.routes, …).distance > corridorWidth/2`, and `corridorTrack.ts:174,188` returns `Infinity` for an empty `routes` array, which `buildLevel.ts:168-180` gives every `kind: 'free'` level. `Infinity > 0` is `true`, so on the first drawing frame `offPath` flips and `TraceCanvas.tsx:1466` strokes the live ink in `inkDimColor` for the whole level. On a bee level that default is `OFF_PATH_INK '#94a3b8'`, luma **161** against the forest's **151** — **a gap of 10 against a law of 55** **[derived]**. The bee's trail would be very nearly invisible, with 1,555 tests green. This is paso E's lesson arriving in a new costume, and §2 repairs it generally. |
| **A2** | Approach D3 | **`demo: true` cannot demonstrate anything on a `kind: 'free'` level, for two independent reasons.** `LevelPlay.tsx:711-721` builds one `DrawDemo` per entry of `target.paths`, which is `[]`; and `playDemo = !!level.demo && guideLevel === 'full'` (`:740`) while `guideLevelFor` returns `'none'` for any level with `showGuide: false` (`:556-557`) — and `catalog.test.ts:297` requires `showGuide === (id !== 'f5-mama' && kind !== 'free')`. `demo` is absent on all four; §6.3 says what discharges `docs/13` §5 item 2 instead. |
| **A3** | Scope 2 | **The octopus does NOT stand on a bee level, and that is correct.** `startArt` renders only through `{startMarker && startArt}` (`TraceCanvas.tsx:1338`) and `LevelPlay.tsx:1458` passes `showMarkers ? startMarker : undefined`, with `showMarkers = guideLevel !== 'none'` — `'none'` on every free level (A2). Ungating it would put a 96-unit octopus on the same point as the bee, which is the exact occlusion `docs/09` §2 exists to prevent. On a routeless level there is nothing to be left behind: **the bee itself rests at the start and departs from it**, so the start is marked by the thing that leaves it. The twelve shipped reveal levels already behave this way. |
| **A4** | Approach D6.3 | **ONE debug flag, not two.** The proposal's reason for two (*"a single pinned point cannot encode an accumulated latch"*) is answered by encoding the latch instead of the point: `?debug=estela:<k>` drives the lit set, the bee's position, the implied trail AND the touch-radius overlay from ONE number, so the four cannot disagree. Two independent flags is precisely the shape that produced paso E's misreading (`docs/13` §4 decision 7, second bullet). §8. |

Everything else in the proposal is adopted. Its four author-bound decisions (the `1 → 3 → 3 → 3`
ladder, the bee resting at the authored start, an unlit flower blocking completion, the flower as
the forest's backpack item) are **binding and not re-opened**.

## Technical Approach

Nothing in the scoring model's *shape*, the progress store, `useTraceInput`, the `GameView` reducer
or the case machinery changes. The change is one general engine repair, one pure fold, one render
layer, four level literals, one pipeline row, one palette token and six registry rows:

1. `screen/LevelPlay.tsx` — **A1's repair**: `out` is `false` when the level has no route.
2. `levels/buildLevel.ts` — `levelStart()`, and `LevelTarget.start`. **The carrier repair, general.**
3. `levels/waypoints.ts` — the pure fold: config, tick, score, render projection, debug seed.
4. `game/evaluateLevel.ts` — one conditional in the `free` branch; `revealScore` bit-identical.
5. `canvas/WaypointLayer.tsx` + `canvas/TraceCanvas.tsx` — N plain `<image>`s. No `url(#…)`.
6. `canvas/devMode.ts` — one ungated parser, through the shipped private `debugArg`.
7. `detective/palette.ts` + `scripts/art/build_art.py` + `detective/assets.ts` — the dormant flower.
8. `levels/catalog.ts` + `zoo/*` — four levels, one adventure, one sector, one animal, one item.

Governing constraints, unchanged: vitest on the **node** environment, no jsdom, no testing-library;
every decision a **named exported pure function** and each component renders only what one of them
returned (`levels/arrange.ts:1-6`); `npm run build` = `tsc --noEmit && vite build` with
`noUnusedLocals`, `noUnusedParameters`, `verbatimModuleSyntax`. No new dependency, no new persisted
key, no store version bump, **no new art commissioned**, and no `getImageData` anywhere.

`useTraceInput.ts`, `revealGrid.ts`, `coverage.ts`, `arrange.ts`, `artCorridor.ts`, `corridorTrack.ts`,
`cases.ts`, `Deduction.tsx` and every shipped level literal are byte-identical to `main`.

---

## 1. The mechanic

### 1.1 `waypoints?` is an additive field, not a third `LevelKind`

Adopted verbatim from the proposal's Decision 1 and the exploration's Q1: `LevelKind` stays at two
values, and a bee level IS a `free` level with one more optional field — the exact relationship
`reveal?` / `arrange?` / `artCorridor?` / `goalArt?` / `hazardArt?` / `vertexArt?` already have.
Sixteen `kind === 'free'` / `kind === 'path'` sites keep working untouched, and several of them
(`resetOnContact && kind === 'path'`, `catalog.test.ts:289,297,352`) already encode `'path'` as the
only non-default kind. That audit has no test to catch its misses, which is the whole paso-E lesson.

### 1.2 The types

```ts
// client/src/levels/types.ts — two additive optional fields, the 7th and 8th precedents
  /** A routeless level scored by AUTHORED targets rather than by a route
   *  (`docs/13` §8 row F, "trazo libre con puntos de paso"). The field's
   *  REASON TO EXIST is `docs/13` §6's "trayectoria esperada": this family
   *  authors none — the child invents it — so a start, N stops and one goal
   *  are what replaces it. Only legal on `kind: 'free'`; absent on every
   *  level that predates it, which keeps `f1-libre` and the twelve reveal
   *  levels bit-identical. */
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
```

```ts
// client/src/levels/waypoints.ts — pure, no React, no DOM
/** One authored target on a routeless sheet: a point, and the radius within
 *  which the child's own trail counts as having passed THROUGH it. */
export interface Waypoint { readonly x: number; readonly y: number; readonly radius: number }

export interface WaypointConfig {
  /** Where the carried animal RESTS before the finger moves, and where the
   *  errand begins. This is the field that repairs the carrier defect (§2):
   *  `RevealObject`'s own doc comment already gives the argument — on a
   *  routeless level "there is no route to derive a position from". */
  readonly start: Point
  /** The flowers. Order is AUTHORING order, never a required visit order:
   *  `docs/13` §2 says "puede pasar por flores y llegar al panal", and the
   *  only existing touch-N-authored-points mechanic in the repo
   *  (`reveal.mode: 'light'`) is deliberately unordered too. */
  readonly stops: readonly Waypoint[]
  /** The two states of a stop's picture, and its rendered HEIGHT. ONE pair
   *  for every stop, not one per stop: this family's stops are the same
   *  object repeated, and per-stop art would let an author put a different
   *  picture at each coordinate — a second mechanic nobody asked for. The
   *  `CLUE_ART.<kind>.art.{earned,drained}` idiom, restated. */
  readonly stopArt: { readonly dormant: ArtImage; readonly lit: ArtImage }
  readonly stopSize: number
  /** The hive. Reaching it is the errand's last target; it is NOT required to
   *  be last in time (see `stops`). */
  readonly goal: Waypoint
  readonly goalArt: ArtImage
  readonly goalSize: number
}

export interface WaypointState {
  /** Stops the trail has passed through, by index. LATCHED: the flower stays
   *  open once it opens — the light does not persist, the FINDING does
   *  (`revealGrid.ts`'s own words for `lit`). */
  readonly lit: ReadonlySet<number>
  /** Whether the hive has been reached. Latched for the same reason. */
  readonly home: boolean
  /** How many points of the CURRENT stroke are already folded. The fold
   *  re-reads `points[seen - 1]` as the next window's origin, so no segment
   *  between two samples is skipped and none is walked twice —
   *  `corridorTrackRef`'s own convention (`LevelPlay.tsx:924-932`). */
  readonly seen: number
}
export const EMPTY_WAYPOINTS: WaypointState
```

### 1.3 The predicate is SEGMENT containment, and that is load-bearing

```ts
/** Did this polyline pass within `w.radius` of `w`? Point-to-SEGMENT distance
 *  over consecutive samples, not point-to-SAMPLE.
 *
 *  `revealGrid.ts`'s `objectLitByWindow` tests the samples alone, and for a
 *  200-unit torch that is harmless. Here it is not: at the ~30 Hz `onFrame`
 *  throttle (`OFF_PATH_PERIOD_MS`) a moving finger puts consecutive samples
 *  tens of units apart, and `bee4`'s radius is 38 — so a sample-only test
 *  would make the latch FRAME-RATE DEPENDENT, and worse, would let the live
 *  latch disagree with `waypointScore`'s own recomputation over the settled
 *  strokes. Testing the segment makes the two agree BY CONSTRUCTION. A
 *  one-point stroke degrades to the point test, which is the right limit.
 *
 *  `clearedTiles` already pays this cost the other way (it walks each segment
 *  in half-cell steps); a closed-form segment distance is cheaper and exact.
 *
 *  Arc length is not available and not wanted: `ClueMark.arc`'s tradeoff
 *  INVERTS on a free trail — there is no route to measure arc along, so
 *  Euclidean containment is the only predicate there is. */
export function trailPasses(w: Waypoint, points: readonly Point[]): boolean
```

### 1.4 The fold, the score and the projection

```ts
/** One `onFrame` sample. Monotone, and returns the SAME REFERENCE when
 *  nothing latches — `revealTick`/`clueTick`'s contract, restated, so an idle
 *  finger costs a no-op `setState`. `drawing === false` resets `seen` and
 *  joins nothing across the lift: the same pen-lift rule `coverage.ts`
 *  states, because a bee does not fly between two places the finger never
 *  travelled. */
export function waypointTick(
  prev: WaypointState, points: readonly Point[], drawing: boolean, cfg: WaypointConfig,
): WaypointState

/** The accuracy pillar for a waypoint level: the fraction of the ERRAND that
 *  is done, `round(100 * (lit + home) / (stops.length + 1))`.
 *
 *  Recomputed PURELY from the complete stroke list at evaluation time and
 *  never from the live fold — `revealScore`'s own architecture
 *  (`revealGrid.ts:275-305`), and the reason it exists: the live fold is an
 *  optimisation, the score is the claim.
 *
 *  This is what "an unlit flower blocks COMPLETION, never the SCORE" means
 *  precisely: nothing is ever SUBTRACTED and no error is named — the number
 *  simply has not reached 100 yet, because the errand is not finished. There
 *  is no second penalty channel, which is `docs/13` §6's "los errores
 *  iniciales no se penalizan fuerte" honoured structurally rather than by
 *  tuning. The four levels ship `minAccuracy: 100`, exactly as the four
 *  `night*` light-mode levels do, whose completion criterion is also "every
 *  authored object found". */
export function waypointScore(
  strokes: ReadonlyArray<ReadonlyArray<Point>>, cfg: WaypointConfig,
): number

/** One render-ready picture. Structural on purpose so this module imports
 *  nothing from `canvas/` — `revealGrid.ts`'s own convention.
 *
 *  The GOAL is always emitted LAST. That is not cosmetic: it makes the
 *  `<image>` index mapping in the coincidence test (§7.1) unambiguous —
 *  `[0 .. stops.length-1]` are the stops in authored order and
 *  `[stops.length]` is the hive — and it puts the hive on top if the author
 *  ever overlaps two boxes. */
export interface WaypointRender {
  readonly href: string; readonly w: number; readonly h: number
  readonly size: number; readonly x: number; readonly y: number
}
export function waypointArt(cfg: WaypointConfig, state: WaypointState): readonly WaypointRender[]

/** Every touch radius, in the SAME order as `waypointArt` — `?debug=estela`
 *  only (§8). Derived from the same `cfg` the scorer reads, so a ring can
 *  never be drawn somewhere the scorer does not measure. */
export function waypointRings(cfg: WaypointConfig): readonly Waypoint[]
```

### 1.5 The scoring branch

```ts
// client/src/game/evaluateLevel.ts:119-120 — one conditional, the same idiom
// `revealGrid.ts:281` itself already uses for `reveal` vs. none.
  if (target.config.kind === 'free') {
    const accuracy = target.config.waypoints
      ? waypointScore(strokes, target.config.waypoints)
      : revealScore(strokes, target.config, target.viewBoxWidth)
```

`revealScore` is untouched and is reached on exactly the levels it is reached on today. The
direction pillar stays satisfied by construction (no checkpoints), and the fluency pillar stays at
`minFluency: 0` — a child may lift the finger mid-errand and the bee waits, which is the whole
point of `carrier` resting at `start` rather than at the last point flown.

---

## 2. The repairs, both general

### 2.1 [A1] `offPath` is meaningless without a route

```ts
// client/src/screen/LevelPlay.tsx:1058
- const out = corridorSample.distance > target.corridorWidth / 2
+ // A routeless level has no wall to be outside of. `multiCorridorTick`
+ // returns `Infinity` for an empty `routes` array (`corridorTrack.ts:188`),
+ // so without this guard EVERY `kind: 'free'` level flips `offPath` true on
+ // its first drawing frame and strokes the child's live line in
+ // `inkDimColor` for the whole attempt — plus one spurious haptic pulse per
+ // stroke, which is a phantom error signal `docs/03` §7 forbids.
+ const out = target.routes.length > 0 && corridorSample.distance > target.corridorWidth / 2
```

**This is a behaviour change on twelve shipped levels, and it is a repair rather than a regression.**
Each of the three is stated with its arithmetic so a reader can check it **[derived]**:

| level group | today's live ink | after | the law `backdrops.test.ts` already asserts |
|---|---|---|---|
| `glass1..4` | `OFF_PATH_INK` 161 over `GLASS_GRIME` 109 → **52** | `INK_COLOR` 40 → **69** ✓ | `:86-92` asserts `ink ?? INK_COLOR` — i.e. the colour that was never rendering |
| `sand1..4` | `OFF_PATH_INK` 161 over `SAND_DRIFT` 109 → **52** | `INK_COLOR` 40 → **69** ✓ | same |
| `night1..4` | `TORCH_CHALK_DIM` 152 over the revealed 96 → **56** | `TORCH_CHALK` 239 → **143** ✓ | same |

So the suite has been asserting a legibility law about `ink` on twelve levels that render `inkDim`,
and on eight of them the colour that actually shipped **fails that law by 3**. The repair makes
reality match the assertion. Two further consequences, disclosed rather than discovered later:

- The twelve reveal levels **lose their once-per-stroke haptic pulse** and gain none, so their
  `feedback.haptics: true` becomes a declaration with no live site. Bee levels get a real one (§2.3).
  Closing the reveal grid's own (a pulse when a tile clears) is paso H's business and is named here,
  not hidden.
- Settled strokes already render in `inkColor` (`offPath` only tints the LIVE path,
  `TraceCanvas.tsx:1466`), so today the line visibly jumps colour the instant the finger lifts.
  That flicker goes away.

**The bee row needs no `ink`/`inkDim` at all after this**: `INK_COLOR` clears the forest band by
111.4 **[measured]**, and `offPath` is never true on a bee level, so `inkDim` is never reached.
Without the repair the bee row would have had to declare an `inkDim` that clears the band — i.e. the
level would have shipped permanently in its "you have drifted" colour, which is a lie about state.

### 2.2 [the carrier repair] `LevelTarget.start`, and the one seam a future mechanic extends

The defect, re-verified: `LevelPlay.tsx:1186` is `const startMarker = target.polyline[0]`;
`buildLevel.ts:168-180` returns `polyline: []` for `kind === 'free'`; the carrier prop at
`:1498-1504` is gated `level.carrier && startMarker`. **A `carrier: true` + `kind: 'free'` level
renders no carrier today**, and the repo's own comment at `:1188-1190` already says why.

The repair is general in the same sense `multiCorridorTick` was — it fixes the causal class, not the
bee:

```ts
// client/src/levels/buildLevel.ts — exported, pure, tested in buildLevel.test.ts
/** Where a level BEGINS as a POINT, for everything that needs one rather than
 *  a route: the carrier's resting place, the standing octopus, the start dot.
 *
 *  A routed level's start is its route's first point, which is what
 *  `LevelPlay.tsx:1186` has always read. A ROUTELESS level has no route to
 *  derive one from — `RevealObject`'s own doc comment already makes exactly
 *  this argument for authored coordinates — so it must AUTHOR one, and this
 *  is the ONE place a future routeless mechanic plugs its own in.
 *
 *  Returns `undefined` when a level supplies neither, which is every shipped
 *  `kind: 'free'` level: `target.start` is then `undefined` exactly as
 *  `target.polyline[0]` is today, and every gate downstream behaves
 *  byte-for-byte as it does now. */
export function levelStart(
  config: LevelConfig, polyline: readonly Point[],
): Point | undefined {
  if (polyline.length > 0) return polyline[0]
  return config.waypoints?.start
}
```

`LevelTarget` gains `start?: Point`, set from `levelStart` in BOTH branches of
`buildLevelTarget`; `LevelPlay.tsx:1186` becomes `const startMarker = target.start`. One line at the
consumer, one named function at the source.

**The adjacent instance that is NOT repaired, named so a reader does not think it was missed.** The
END half has the same root: `endMarker` is `level.kind === 'path' ? goalMarkerOf(target) : undefined`
(`:1191-1194`) and `TraceCanvas.tsx:1290` renders `endArt` only through `{endMarker && endArt}`, so
**`LevelConfig.goalArt` is equally dead on a `kind: 'free'` level.** It is not repaired here because
the only thing that would use it is the hive, and the hive's coordinate and its touch radius must
live in the same object or they can drift — which is exactly what `WaypointConfig.goal` is. Recorded
as a known gap for row G.

### 2.3 `carrierArt`, the bee's size, and the haptic that is real

```ts
// client/src/screen/LevelPlay.tsx:1511
- carrierArt={inWorld ? CARRIER_LENS_ART : undefined}
+ // A level's own art beats a default it did not ask for (`goalArt`'s own
+ // argument, `:1196-1201`). Absent = the shipped hard-wire, unchanged.
+ carrierArt={
+   level.carrierArt
+     ? { ...level.carrierArt.art, size: level.carrierArt.size }
+     : inWorld ? CARRIER_LENS_ART : undefined
+ }
```

`TraceCarrierArt` gains `size?: number`, and `TraceCanvas.tsx:1539` reads
`placeArt(carrierArt, carrierArt.size ?? CARRIER_ART_SIZE, { x: 0, y: 0 })` — additive, absent
everywhere else, byte-identical for the lens. The shipped 104 is sized for the lens's transparent
handle margin (`TraceCanvas.tsx:376-385` says so); `abeja.png` fills 76.9 % of its lamina
**[measured]**, so it needs its own number. **`BEE_SIZE = 76`** — under the hive's 96 so the
destination stays the biggest thing on the sheet, over the flower's 64 so the arrival reads.

The bee rides the fingertip through the shipped rAF loop untouched
(`TraceCanvas.tsx:869-876`: the carried point is the last RENDERED ink point while drawing, the rest
point otherwise). That is `docs/14` §10's *"la abeja lo sigue inmediatamente"* for free, and it is
also why she waits at `start` and departs when the finger does.

**The haptic.** With A1's repair `pulseOnLeaving` never fires on a bee level, so `haptics: true`
needs a real site. One pulse when a flower opens or the hive is reached — a contact worth feeling,
the same sentence `catalog.test.ts:401-405` already gives for the reveal grid. The fold is mirrored
in a ref (`waypointRef`, the shape `corridorTrackRef` already uses) rather than folded inside a
`setState` updater, because the pulse needs a before/after comparison and a state updater must stay
pure:

```ts
if (level.waypoints && !waypointPin) {
  const next = waypointTick(waypointRef.current, points, drawing, level.waypoints)
  if (next !== waypointRef.current) {
    const opened = next.lit.size > waypointRef.current.lit.size || (next.home && !waypointRef.current.home)
    waypointRef.current = next
    setWaypointState(next)
    if (opened && feedback.haptics) pulseOnLeaving(false, true) // the shipped one-shot edge
  }
}
```

This block sits inside the existing single `onFrame` (`LevelPlay.tsx:1011-1140`), beside `revealTick`
and `clueTick` — no second pointer-capture mechanism and no second per-frame sample
(`docs/02` §7.2). `!waypointPin` mirrors the shipped `!debugLightPoint` guard: the flag REPLACES live
input rather than racing it.

---

## 3. The paints

### 3.1 The forest is the first band that needs no channel, and the first that needs no veil

**[measured, Engram #1381]** `fondo bosque.png`'s quiet band is rows **191–926**, colour `#949b8c`,
luma **151**, and `quiet == brightest` over that range — the flattest band of any shipped backdrop.
Against it:

| token | luma | Δ | |
|---|---|---|---|
| `SHEET_PAPER #fdfcf7` | 252 | **101** | ✓ |
| `INK_COLOR #1e293b` | 40 | **111** | ✓ — the child's own line, after A1 |
| `ART_OUTLINE #1a1a1a` | 26 | **125** | ✓ — what the flower, the bee and the hive all read by |
| `TORCH_CHALK #f2efe6` | 239 | **88** | ✓ — the `?debug=estela` rings |
| `FLOWER_DORMANT #d2d2d2` | 210 | **59** | ✓ — provisional, §3.2 |
| `GROUND_FIELD #c9d7bd` | 208 | 57 | ✓ but chroma 26, not achromatic |
| `CORRIDOR_EARTH #d9c3ae` | 199 | **48** | ✗ |
| `CLUE_DRAINED #838383` | 131 | **20** | ✗ — fails by 35 |
| `OFF_PATH_INK #94a3b8` | 161 | **10** | ✗ — **A1's defect, measured** |
| `TORCH_CHALK_DIM #989896` | 152 | **1** | ✗ — never reuse the night's dim here |

The `bee` backdrop row therefore declares **no `channel`** (a waypoint level passes no `corridor`
prop at all, so `TraceCanvas.tsx:1029`'s whole block never runs), **no `tile`** (there is no veil),
and **no `ink`/`inkDim`** (the defaults clear the band).

```ts
// client/src/zoo/backdrops.ts
bee: {
  art: SECTOR_BACKGROUND_ART.forest,
  quiet: '#949b8c',      // [confirmed by rebuild, apply-time]
  brightest: '#949b8c',  // [confirmed by rebuild] — equal to `quiet`; the band is flat
  corridorRows: { top: 191, bottom: 926 },
},
```
and `build_art.py:536` becomes
`('fondo bosque.png', 'sector-forest-background.png', 1536, 1024, (191, 926))`. The `nightfall` row
at `:538` samples the same source at `(51, 973)` and emits under a different key, so the two do not
collide.

**Prediction, and the lever if it misses.** `brightest` over `(191, 926)` is predicted to come back
exactly `#949b8c`, the way `sheep`'s own row did (`backdrops.ts:117-121`: *"the ladera's brightest
pixel over this exact band is its own quiet modal colour"*). If the rebuild returns anything above
luma **155**, `FLOWER_DORMANT` at 210 stops clearing the law and the **lever is to narrow
`corridorRows`** toward the region `artHierarchy.test.ts:454-469` already proves flat (rows 204–818,
§4.1), not to move the literal. If narrowing cannot close it, the dormant branch flips from pale to
dark and that is an art-direction fork for the author, not a tuning knob — say so, do not absorb it.

### 3.2 The dormant flower: the constraint is ours, the light is the author's

```ts
// client/src/detective/palette.ts
/** The flower before the bee has been to it (`docs/13` §8 row F).
 *
 *  PROVISIONAL, and deliberately so. The law corners a RANGE and art
 *  direction picks the value inside it — the third time `docs/09` §4 has done
 *  this (paso D's fog and swept sand, paso E's snake ink), and both earlier
 *  times the cornered literal was left intact for the author rather than
 *  quietly chosen. Same here.
 *
 *  The range, measured: the forest's quiet band is luma 151, so an achromatic
 *  dormant mark sits at luma <= 96 or >= 206. BOTH branches exist for the
 *  first time in this project — every earlier sector's band was light enough
 *  that only the dark one survived (`docs/13` §4 decision 6) — and the PALE
 *  branch is much the safer: at 206 it clears the child's own `INK_COLOR`
 *  (40) by 166, where the dark branch at 96 clears it by 56, one luma above
 *  the law's own floor.
 *
 *  `#d2d2d2` is luma 210, saturation 0: 59 from the band, 170 from the ink.
 *  `backdrops.test.ts` asserts the CONSTRAINT — achromatic, >= 55 from the
 *  forest's own sampled `brightest`, >= 55 from the ink — and never this
 *  literal, so changing it is a one-line edit the suite still polices. */
export const FLOWER_DORMANT = '#d2d2d2'
```

Pipeline row, beside the existing `flor.png` row at `build_art.py:466`:

```python
('flor.png', 'sector-flower-dormant.png', 256, FLOWER_DORMANT, True),
```

`keep_ink=True` is what makes the dormant state still read as a flower: it keeps the `#1a1a1a`
contour (26.6 % of the shipped file **[measured]**) and flattens only the petal, the exact two-tone
path every `clue-*-drained` row takes. `fill != 'contour'`, so the post-halving `recontour` at
`build_art.py:1036-1039` correctly skips it, and `flor.png` already has an
`AUTHORED_SOURCE_SIZES` entry and needs no `SPECKLED_ALPHA_SOURCES` one.

Registry — the aliasing idiom `ZOO_ANIMAL_ART` already uses, so `artManifest.test.ts`'s
`SECTOR_ADVENTURE_ART` spread picks the new file up with no edit to `REGISTERED`:

```ts
// client/src/detective/assets.ts
  flowerDormant: { href: '/art/sector-flower-dormant.png', w: 256, h: 245 }, // [confirmed by rebuild]
…
/** The flower's two states. Both derive from `flor.png`, so the swap is an
 *  `href` swap and the mark does not move or change shape when it opens —
 *  exactly the argument `CLUE_ART`'s own `{earned, drained}` pair carries. */
export const FLOWER_ART: Readonly<Record<'dormant' | 'lit', ArtImage>> = {
  dormant: SECTOR_ADVENTURE_ART.flowerDormant,
  lit: SECTOR_ADVENTURE_ART.flower,
}
```

`artHierarchy.test.ts`'s `WORLD_GUARDED_ART` maps `SECTOR_ADVENTURE_ART` keys by
camelCase → kebab (`:292-297`), so `flowerDormant` resolves to `sector-flower-dormant.png` and joins
the world guard automatically; its `#1a1a1a` contour satisfies the achromatic-dark-pixel rule and its
`recolour` output keeps the antialiased alpha edge.

### 3.3 The decorative-hierarchy rule is VACUOUS here, and no test is wired against it

`docs/09` §4's rule — *a dormant mark must separate from its ground more than any decorative ground
mark separates from its own* — has **no comparison set in this sector, by construction**:
`LevelPlay.tsx:1305-1309` returns `undefined` ground whenever a backdrop is present, which is
`docs/13` §4 decision 3, so a bee level carries no grass and no mud. `artHierarchy.test.ts:501-515`
globs `clue-*-drained.png` against `ground-*.png` and would compare the dormant flower against
nothing. **A test wired against an empty set is not proof, and none is written.**

Its honest replacement is an ABSOLUTE measurement with a real referent, in the same file and in the
same style (read the emitted PNG, not the token):

> `bodyContrast(sector-flower-dormant.png, ADVENTURE_BACKDROP.bee.quiet) >= 55`

That proves the pipeline actually painted the token onto the shipped pixels, which mirroring a hex
literal into `build_art.py` would not.

### 3.4 A fourth backdrop group, and four rows that must stay RED

`backdrops.test.ts`'s law loop iterates hand-listed groups (`:32-51`), not the registry, with a
completeness guard at `:67-74`. The bee row joins as a FOURTH group, `WAYPOINT_BACKDROPS = { bee }`,
kept separate because the inherited `tile ?? channel ?? SHEET_PAPER` assertion is **vacuous for it**:
it would be a claim about a paint this family never applies. Say that in the group's own comment
rather than let it read as proof.

The group's real law is two-sided, over `bee.brightest`:

| # | assertion | value | |
|---|---|---|---|
| W1 | `abs(luma(FLOWER_DORMANT) − luma(brightest)) >= 55` | **59** | ✓ the dormant flower is findable |
| W2 | `abs(luma(INK_COLOR) − luma(brightest)) >= 55` | **111** | ✓ the child's own trail is legible — **and A1 is what makes this true in fact rather than only in the registry** |
| W3 | `chroma(FLOWER_DORMANT) <= 12` | **0** | ✓ achromatic; the tolerance is what lets the author pick a near-grey |

Falsifiability, paso D's discipline (`backdrops.test.ts:100+`): each asserts `< 55`, so none can pass
alongside W1–W3, and each encodes an ARGUMENT rather than only its conclusion.

| row | assertion | value | what it proves |
|---|---|---|---|
| **F1** | `abs(luma(CLUE_DRAINED) − luma(bee.brightest))` | **20** | the shipped dormant grey is unusable in this sector — without it `FLOWER_DORMANT` looks like a taste call |
| **F2** | `abs(luma(TORCH_CHALK_DIM) − luma(bee.brightest))` | **1** | the night's dim is not reusable here, at any tint |
| **F3** | `abs(luma(OFF_PATH_INK) − luma(bee.brightest))` | **10** | **§2.1's defect, as a number.** This is what makes A1 a measurement rather than an opinion, and it is the one row a future reader must not delete |
| **F4** | `abs(luma(CORRIDOR_EARTH) − luma(bee.brightest))` | **48** | no earth channel is admissible either, so "no channel" is a finding and not an omission |

---

## 4. The geometry

### 4.1 The band, pushed back to source pixels BEFORE anything is authored

Paso E shipped a snake pressing 74.6 of its 144.4 units into the stone band because this check was
done late (`docs/13` §4 decision 7's closing note). It is done first here.

`viewBoxToImage` (`zoo/sectors.ts:169-175`) at `scale = max(1000/1536, 600/1024) = 0.651042`
**[derived]**:

| viewBox y | source row | inside `corridorRows (191, 926)`? | inside the TEST-proven flat region? |
|---|---|---|---|
| 100 | **204.8** | ✓ (13.8 rows of margin) | ✓ — `artHierarchy.test.ts:457` scans from `floor(1024 × 0.2) = 204` |
| 499 | **817.7** | ✓ (108.3 rows of margin) | ✓ — that scan ends at `floor(1024 × 0.8) = 819`, exclusive, i.e. row 818 |

Two bands exist and they are not the same: the **measured** band (rows 191–926 → viewBox
`[91.0, 569.5]`) and the **test-proven** flat band (rows 204–818 → viewBox `[99.5, 499.2]`), which
`artHierarchy.test.ts` already asserts is uniform to within two channels. **Every authored art box
is pinned inside the narrower, test-proven one**: `y ∈ [100, 499]`. That leaves the measured band's
extra 70 units of slack entirely unspent, which is the "pin at the safe end so the pending check can
only widen a margin" discipline paso C, D and E all used.

Horizontally the backdrop is not cropped at all — 1536 px × 0.651042 = 1000 viewBox units exactly —
so `x ∈ [0, 1000]` is all inside the image, and the only horizontal rule is the art-box margin below.

### 4.2 The constraint set

`catalog.test.ts`'s bee-family block asserts all of these, so the literals can be retuned without
this document going stale.

| # | constraint | why |
|---|---|---|
| **C1** | every waypoint's art BOX lies inside `y ∈ [100, 499]` and at least 20 units inside `x ∈ [0, 1000]` | the box sits on the band the drawing leaves quiet (§4.1), and `clampArtBox` is therefore the IDENTITY — which is what makes §7.1's coincidence exact instead of approximate. The reveal family's own R7 rule (`catalog.test.ts:1234`), restated with a measured band instead of a bare margin |
| **C2** | `radius >= max(artW, artH) / 2` for every stop and for the goal, where `artW = size × art.w / art.h` | **the target is never smaller than the picture.** A child who visibly touches a flower and does not open it reads the level as broken. This is also the FLOOR that stops "mayor precisión" from being tuned past the point of honesty |
| **C3** | the carrier's own box at `start` lies inside the sheet | the carrier is rendered through a translated `<g>` with NO `clampArtBox` (`TraceCanvas.tsx:1512-1541`), so a start near an edge clips the bee and nothing catches it |
| **C4** | for `bee3`/`bee4`, over `{start} ∪ stops ∪ {goal}`: `maxY − minY > 300`, `minY < 180`, `maxY > 420`, `maxX − minX > 600` | §4.3 |
| **C5** | for `bee1`/`bee2`, that same envelope is STRICTLY SMALLER than `bee3`'s on BOTH axes | §4.3 |
| **C6** | minimum-route length strictly increasing `bee1 < bee2 < bee3`, and `bee4` within ±5 % of `bee3` | the errand gets longer, and it does not get shorter when the radii tighten. "Minimum route" is the polyline `start → stops (authored order) → goal` — a lower bound on what the child must travel, since the route itself is invented |

### 4.3 [decided] The phase-1 span guard's spirit is honoured — and its opposite is enforced too

**Verified, not assumed**: `catalog.test.ts:556` is `if (level.kind !== 'path') continue`, so a
`kind: 'free'` bee level is exempt by construction and the shipped guard needs no edit.

The guard's spirit — *phase 1 trains the arm, not the fingertip* (`docs/01` §49) — and `docs/13` §2's
own first rung — *recorrido **corto** y visible* — **cannot both hold on `bee1`.** A level that must
span more than 300 units vertically and 600 horizontally is not short. The proposal asserted the
spirit was "honoured anyway" across `bee1`–`bee3`; that is not arithmetically available, and pretending
otherwise is how paso E ended up with an unfulfilled progression step written down after the fact.

So the family asserts BOTH halves of the ladder instead of only the flattering one:

- **C4** applies to `bee3` and `bee4`, which are §2's *trayecto más largo* and *mayor precisión*
  rungs: those two use the whole arm, on the shipped guard's own three numbers, plus a **horizontal
  clause the shipped guard does not have** (`abejas-estela.png` travels the full width, and the
  shipped guard only ever looked at `y`). That is a strengthening, stated as such.
- **C5** applies to `bee1` and `bee2` in the opposite direction: their envelope must be strictly
  smaller than `bee3`'s on both axes. *"Corto"* becomes a CHECKED claim rather than an adjective, and
  a future retune cannot quietly inflate the first rung into the third.

### 4.4 The worked instantiation

Art sizes, fixed across the family: **flower 64** (→ 66.9 wide, `256×245` **[read]**), **hive 96**
(→ 67.9 wide, `181×256` **[read]**), **bee 76** (→ 84.6 wide, `256×230` **[read]**).

| level | §2 step | `start` | `stops` | stop r | goal | goal r |
|---|---|---|---|---|---|---|
| `bee1` | *recorrido corto y visible* | (250, 400) | (500, 265) | **110** | (750, 385) | **96** |
| `bee2` | *varias flores* | (250, 400) | (380, 280) · (520, 395) · (660, 275) | **84** | (750, 390) | **88** |
| `bee3` | *trayecto más largo* | (90, 420) | (300, 145) · (560, 455) · (800, 160) | **62** | (930, 305) | **80** |
| `bee4` | *mayor precisión* | (95, 175) | (320, 440) · (555, 142) · (790, 445) | **38** | (930, 230) | **72** |

Every level keeps the schematic's grammar **[read, `docs/referencias/abejas-estela.png`]**: the bee
at the LEFT, the hive at the RIGHT, and the flowers placed so the shortest route through them
undulates — crest, trough, crest. **That is how this family teaches route planning without drawing a
route: the flowers' positions imply the shape, and nothing on the sheet asserts it.** The schematic's
own amplitude is only ~21 % of its height; `docs/13` §4 decision 5 and paso E §3.1 both settled that
a schematic is a schematic of the TRACE and the pedagogy wins, so the amplitude comes from C4.

> **C1, worked** **[derived]**. Extreme boxes: `bee3`'s stop at `y = 145` → `[113, 177]`; its stop at
> `y = 455` → `[423, 487]`; `bee4`'s stop at `y = 142` → `[110, 174]` and at `y = 445` → `[413, 477]`;
> `bee3`/`bee4`'s hive at `x = 930` → `[896, 964]`, 36 units inside the right edge. All inside
> `y ∈ [100, 499]` and `x ∈ [20, 980]`. ✓

> **C2, worked** **[derived]**. Flower half-extent `max(66.87, 64)/2 = 33.44`; margins 76.6 / 50.6 /
> 28.6 / **4.6**. The `bee4` margin is thin ON PURPOSE — that IS the precision rung — and C2 is what
> stops the next retune from making the target smaller than the picture. Hive half-extent
> `max(67.88, 96)/2 = 48`; margins 48 / 40 / 32 / 24. Arriving home is not the precision lesson.

> **C3, worked** **[derived]**. Bee box half-width 42.3, half-height 38. Tightest start is `bee3`'s
> `x = 90` → box `[47.7, 132.3]` ✓ and `bee4`'s `y = 175` → box `[137, 213]` ✓.

> **C4, worked** **[derived]**. `bee3`: `x ∈ [90, 930]` = **840** > 600 ✓; `y ∈ [145, 455]` — span
> **310** > 300 ✓, `minY` 145 < 180 ✓, `maxY` 455 > 420 ✓. `bee4`: `x` = **835** ✓; `y ∈ [142, 445]`
> — span **303** ✓, 142 < 180 ✓, 445 > 420 ✓. Both clear, and both clear thinly, which is the
> consequence of C1 pinning the band at `[100, 499]` rather than at the measured `[91, 569.5]` —
> a trade taken deliberately in favour of the band a shipped test already proves.

> **C5, worked** **[derived]**. `bee1` envelope 500 × 135, `bee2` 500 × 125, `bee3` 840 × 310. Both
> strictly smaller on both axes ✓.

> **C6, worked** **[derived]**. Minimum-route lengths **561.4 → 688.5 → 1325.6 → 1367.2**. Strictly
> increasing through `bee3`; `bee4 / bee3 = 1.031`, inside ±5 % ✓.

**Why `bee4` is not `bee3`'s sheet re-radiused.** It would have been the cheaper move and paso E took
it for `snake2`/`snake4` — and paid for it in a review round where two captures looked like the same
file and a reviewer had to be talked out of a defect that did not exist (`docs/13` §4 decision 7).
`bee4` inverts `bee3`'s profile (it starts high and descends first) at the same envelope and within
5 % of the same route length, so the two sheets are visibly different while the only thing that
actually changed is the radius.

---

## 5. The render layer

```tsx
// client/src/canvas/WaypointLayer.tsx — `RevealLayer.tsx`'s art half, minus the tiles
export function WaypointLayer({ waypoints, sheetBounds }: WaypointLayerProps) {
  return (
    <g pointerEvents="none">
      {waypoints.art.map((obj, idx) => (
        <image
          key={`waypoint-art-${idx}`}
          href={obj.href}
          {...clampArtBox(placeArt(obj, obj.size, { x: obj.x, y: obj.y }), sheetBounds)}
          preserveAspectRatio="xMidYMid meet"
        />
      ))}
      {waypoints.rings?.map((ring, idx) => (
        <circle key={`waypoint-ring-${idx}`} cx={ring.x} cy={ring.y} r={ring.radius}
          fill="none" stroke={waypoints.ringStroke} strokeWidth={2} />
      ))}
    </g>
  )
}
```

No `<mask>`, `<pattern>`, `<clipPath>`, `<defs>`, `useId`, no `url(#…)` — `TraceCanvas.tsx:78-93`'s
own scar. The ring stroke is resolved by the CALLER, never by this component: `TraceCanvas` holds no
palette token, which is `TraceClueMark`'s own stated convention (`TraceCanvas.tsx:246-255`).

**Grip and centring.** `placeArt` reads `art.grip ?? DEFAULT_GRIP` (`placeArt.ts:59`), and neither
`SECTOR_ADVENTURE_ART.flower` nor `.honeycomb` declares a grip, so **the art's centre IS the scored
coordinate** — by construction, not by coincidence. Deliberately NOT `STANDING_GRIP`: a flower and a
hive on a forest floor drawn from above are not standing on a ground line, and a feet-grip would put
the scored point on the picture's bottom edge. §7.1's test is what stops a future `grip` from
silently breaking this.

**Slot.** `TraceCanvas` renders `{waypoints && <WaypointLayer …/>}` in the SAME slot as `reveal`
(`:1019-1028`): immediately after the backdrop group, before the maze/corridor block. On a bee level
there is no corridor, no ground and no reveal, so this is the only thing between the backdrop and the
ink — and the carrier stays topmost (`:1512`), which is right: it marks where the child actually is.

**Prop**, mirroring `TraceReveal`:

```ts
export interface TraceWaypointArt { href: string; w: number; h: number; size: number; x: number; y: number }
export interface TraceWaypointRing { x: number; y: number; radius: number }
export interface TraceWaypoints {
  art: readonly TraceWaypointArt[]
  /** `?debug=estela:<k>` ONLY. Absent = no overlay, which is every frame a
   *  child ever sees. */
  rings?: readonly TraceWaypointRing[]
  ringStroke?: string
}
```

---

## 6. The four levels

### 6.1 Frozen shape

All four: `phase: 1`, `kind: 'free'`, `surface: 'blank'`, `maze: false`, `resetOnContact: false`,
`carrier: true`, `letters: []`, `paths: []`, `corridorWidth: 0`, `showGuide: false`,
`rules: { ...rules(1, false, false, 0), minAccuracy: 100 }`,
`feedback: { tone: false, haptics: true, metronomeBpm: 0, rail: false }`, **no `demo`** (A2),
`carrierArt: { art: SECTOR_ADVENTURE_ART.bee, size: 76 }`, and a `waypoints` block from §4.4.

Every one of those is forced by a shipped guard rather than chosen: `showGuide: false` by
`catalog.test.ts:297`, `enforceOrder: false` by `:289`, `tone: false` by `:408`, `corridorWidth: 0`
and `minFluency: 0` by the `CORRIDORS`/`FLUENCY` tables' own convention for routeless levels
(`:138-152`).

`surface: 'blank'` makes `drawingBand` return `{ y: 0, height: 600 }` (`LevelPlay.tsx:234`), so
`sheetBounds` is the whole sheet and C1 guarantees `clampArtBox` is the identity.

### 6.2 The family invariants `catalog.test.ts` asserts

| # | invariant | values |
|---|---|---|
| R1 | stop radius strictly decreasing | 110 → 84 → 62 → **38** |
| R2 | goal radius strictly decreasing | 96 → 88 → 80 → 72 |
| R3 | stop counts | **1**, 3, 3, 3 |
| R4 | C1–C6 of §4.2, over the authored literals restated in the test | §4.4's margins |
| R5 | `minAccuracy === 100`, `demo` absent, `carrier === true`, `carrierArt` present, on all four | — |
| R6 | §7.1's coincidence, over the RENDERED markup, in BOTH states | — |
| R7 | every `bee*` id appears in `ADVENTURES.bee.levelIds`, `bosque.adventureIds` and `EXPECTED_IDS`, in the same order | — |

Three shipped guards go red the moment the levels land and are edited in this change:
`:48-97` `EXPECTED_IDS` (four ids inserted after `snake4`), `:251-264` minAccuracy-by-phase (a third
`if (level.waypoints) continue`, beside the `reveal` and `artCorridor` ones), and `:399-411`
tone/haptics (`haptics === hasCorridor || !!level.reveal || !!level.waypoints`). The
`CORRIDORS`/`FLUENCY` tables gain four `0` rows each. **`:538-561` is NOT edited** — §4.3.

### 6.3 `docs/13` §6's nine obligations

| obligation | how this family answers it |
|---|---|
| **Zona de inicio** | `WaypointConfig.start`, and the bee resting on it. No octopus and no green dot (A3): on a routeless level the start is marked by the thing that departs from it. |
| **Trayectoria esperada** | **None is authored — that is the mechanic.** What the level authors is a start, N stops and a goal; the shortest route through them undulates (§4.4), so the shape is IMPLIED by placement and invented by the child. |
| **Tolerancia del camino** | No corridor, so tolerance is the per-waypoint touch radius: 110 → 38, floored by C2 at the picture's own half-extent. `docs/13` §6's *"empieza amplia y se reduce"*, with a floor that is measured rather than felt. |
| **Respuesta visual al contacto** | The flower swaps `dormant → lit` — an `href` swap of two files derived from one drawing, so the mark does not move (§7.1 asserts that to the unit). `docs/09` §4's *"ganar una pista es ganar TONO"* taken literally: the reward is chroma 0 → 45, not brightness. In this palette luma can no longer be read as a reward signal, and `docs/09` §4 already says so. |
| **Condiciones de error** | **None punitive.** No hazard, no corridor to leave, `resetOnContact: false`, and after A1 no phantom off-path dim and no phantom buzz. A missed flower is an unopened flower. |
| **Posibilidad de reinicio** | The shipped `clearAttempt`/`resetSurface`/`restartRun`, all three routed through one `initialWaypointState(level.waypoints, debugSearch)` — `seedArrange`'s own scar (`arrange.ts:171-182`), where a reset site calling the raw initialiser silently wiped the screenshot seed. |
| **Animación de ayuda** | **`demo` is absent (A2), and the obligation is discharged elsewhere.** The engine's demo cannot express this movement — it animates `target.paths`, and this family has none — and a drawn sample route would teach COPYING, which is the exact skill (*planificación del recorrido*) the family exists to train. What is genuinely new here is not "move your finger" (four glass, four sand and four night levels already train that) but "something follows you", and that is shown the instant the finger moves — `docs/14` §10's *"la abeja lo sigue inmediatamente"*. A pre-animation would show the bee moving WITHOUT the finger, which is the opposite sentence. `docs/13` §5 item 1's narrative entry (`AdventureIntro`, shipped in paso B) carries the rest. |
| **Criterio de finalización** | `waypointScore === 100`: every flower open AND the hive reached, recomputed purely from the complete stroke list. One criterion, no second channel (§1.4). |
| **Transición narrativa** | Paso B's reusable components: entry = Pulpito + bubble + `abeja.png`; closing = `abeja` filed, `bosque` de-fogged on the map, the flower into the backpack. The one thing `docs/13` §6 says the engine does not express, supplied by §5. |

---

## 7. The insurance policy

### 7.1 The coincidence test, from PIXELS to SCORE

Paso E cost a family: 1,553 green tests while the snake art sat in one place and its scored route in
another, because no assertion rendered the real `<image>` and compared it to the path. Here there is
no path, so the analogous failure is: the flower renders at one coordinate, `waypointScore` measures
against another, and nothing notices.

**`WaypointLayer.test.tsx`**, for each of `bee1..bee4` and for each of the two states:

1. Read the REAL catalog config: `getLevel('beeN').waypoints`.
2. Render the REAL projection through the REAL component:
   `renderToString(<WaypointLayer waypoints={…waypointArt(cfg, state)} sheetBounds={{0,0,1000,600}} />)`.
3. Parse every `<image …>` out of the HTML STRING — `x`, `y`, `width`, `height`, `href` — **never the
   internal box objects**. That is the exact gap paso E's own `catalog.test.ts` coincidence proof
   left, and the one its `ArtCorridorLayer.test.tsx` was written to close.
4. Recover each picture's centre as `x + width/2`, `y + height/2`.
5. **Assert the centre equals the authored `cfg.stops[i]` / `cfg.goal` to within 0.5 viewBox units**
   (`r2`'s own two-decimal rounding, with three orders of magnitude to spare). Any `clampArtBox`
   slide, any grip, any aspect-ratio error, any index shift shows up at once.
6. **Assert both states emit identical boxes and different `href`s.** The swap must not move the art
   by a unit — and this is a live hazard, not a hypothetical: `clue-footprint-earned/drained` ship at
   220 and 217 px wide because they come from two different drawings.
7. **The headline assertion, which closes the loop.** Build a stroke out of the coordinates the test
   just PARSED FROM THE MARKUP — `[start, …parsed stop centres, parsed goal centre]` — and feed it to
   the real scorer: `waypointScore([parsedTrail], cfg) === 100`.
8. **Falsifiability.** The same trail translated by `radius + 1` in `+x` scores **below** 100, so the
   test cannot pass by measuring nothing.
9. `expect(html).not.toContain('url(#')`.

Step 7 is what makes this different from every green suite paso E shipped: the two sides genuinely
travel different code — authored literal → `waypointArt` → `placeArt` → `clampArtBox` → JSX →
HTML string → parse → centre → `trailPasses` → score — and they meet at 100.

### 7.2 The carrier-presence regression, written FIRST

In `LevelPlay.test.tsx`, and it must go red on `main` before §2.2 lands:

> `renderToString` a `carrier: true` + `kind: 'free'` level and assert (a) the carrier's `href`
> appears in the markup at all, and (b) the carrier group's `transform` is
> `translate(<start.x> <start.y>)` for the level's authored start.

### 7.3 Everything else

| Layer | What | Approach |
|---|---|---|
| Unit (pure) | `trailPasses` | a TWO-POINT stroke that steps ACROSS a waypoint without landing inside it lights it — **the assertion that fails under `revealGrid.ts`'s sample-only predicate**, which is why §1.3 exists; a one-point stroke degrades to the point test; a point exactly at `radius` is inside |
| Unit (pure) | `waypointTick` | monotone; **same reference when nothing latches**; `drawing === false` resets `seen` and joins nothing across a lift; `seen` never re-walks a segment |
| Unit (pure) | `waypointScore` | `0 / 25 / 50 / 75 / 100` on `bee2`'s four targets; unordered (a trail visiting the stops backwards scores the same); a lift between two flowers costs nothing; **agrees with the terminal `waypointTick` state for the same strokes** — the live/settled agreement §1.3 exists to guarantee |
| Unit (pure) | `levelStart` | `polyline[0]` when there is a route; the authored start when there is not; `undefined` for every shipped free level — **and `buildLevel.test.ts` proves every shipped target byte-identical** |
| Unit (pure) | `waypointArt` / `waypointRings` | the goal is emitted LAST in both; `dormant` before a latch, `lit` after; rings mirror the art order index for index |
| Unit (pure) | `debugWaypoints` / `debugTrail` / `debugCarrier` | one `k` drives all three; `k` clamps to `[0, stops.length + 1]`; the trail's last point IS the carrier point (§8's whole no-misreading argument, asserted) |
| Unit (data) | the four levels | R1–R7 and C1–C6, over the authored literals restated in the test |
| Unit (data) | the luma law | W1–W3 for the bee row; **four falsifiability rows that must go RED** — F1 (20), F2 (1), **F3 (10)**, F4 (48); the completeness guard picks the fourth group up |
| Unit (pure) | `corridorRows` | `viewBoxToImage(0, 100).y = 204.8 >= 191` and `(0, 499).y = 817.7 <= 926`; the six shipped rows unchanged |
| Unit (pure) | `devMode` | `estela:<k>`'s grammar, malformed input, and **the six shipped parsers byte-identical** |
| Unit (pixels) | the dormant flower | `bodyContrast(sector-flower-dormant.png, bee.quiet) >= 55` (§3.3); `SECTOR_ADVENTURE_ART.flower` and `.flowerDormant` have IDENTICAL `w`/`h` in `artManifest.test.ts` — both derive from `flor.png`, and a divergence is the `clue-footprint` failure waiting to happen |
| Component | `TraceCanvas` | with `waypoints`: the layer sits after the backdrop and before the corridor block, **zero `url(#`**. **Without it: markup byte-identical to today** for a lagoon backdrop, a `ground` maze and a plain maze |
| Component | `LevelPlay` | `bee1` renders the bee at `start` (§7.2); **`night2`, `glass1` and `duck-trail2` differ from today in EXACTLY ONE way — the live ink's stroke colour (A1) — and in nothing else**, asserted attribute by attribute rather than claimed |
| Unit (pure) | zoo | `bosque` closed on `{}` and open once `snake4` is filed; the `abeja` appears only on `bee4`; the flower item only on `bee4`; every `appearsWhen`/`earnedWhen` id is a real catalog level |
| Screenshot (human) | `scripts/shot.sh` → `capturas/pasoF/` | non-negotiable, `docs/12` §4 — §8 |

**What only a capture can answer**: whether `#d2d2d2` reads as *a flower nobody has been to* or as
*a broken flower*; whether the reward reads as a reward when the luma barely moves and only the
chroma does (`docs/09` §4 predicts this is fine and has never been tested on a mark this large);
whether a 76-unit bee on the fingertip covers the 64-unit flower she is arriving at; whether the
forest reads as a place with nothing drawn on it at all; and whether the twelve reveal levels look
BETTER after A1, which is the one thing this design asserts about them that a test cannot.

---

## 8. The one debug flag

`devMode.ts:8-20`'s rule, applied unchanged: a flag that writes persisted state or opens a navigable
surface is dev-gated; a flag that only paints render state is not.

| flag | gated? | why |
|---|---|---|
| `?debug=estela:<k>` | **no** | it paints render state, adds no control, no word and no route, persists nothing, and must work against the EXACT build being screenshotted. Parsed by `waypointDebugCount`, through the shipped private `debugArg` — `arrangeDebugCount`'s body, verbatim. |
| `?debug=progreso:bee1,…,bee4` | yes — **already shipped** | `seededProgressIds` needs no change and carries the `bosque` before/after, the `abeja` standing and the five-item backpack. |

**One number, four render facts, and that is the whole point.** `k` drives (1) which flowers are
open, (2) where the bee sits, (3) the trail that got her there, and (4) the touch-radius rings — all
from `debugWaypoints(cfg, k)` / `debugTrail(cfg, k)` / `debugCarrier(cfg, k)` / `waypointRings(cfg)`,
which read the SAME config the scorer reads. They cannot tell inconsistent stories.

That is the direct repair of paso E's lesson (`docs/13` §4 decision 7, second bullet): there,
`?debug=ordenadas:<k>` and `?debug=espina` were two independent flags, only one `debug=` value is
passable per URL, and reading the two captures together made the art look detached from its route
when nothing had happened. **A4 declines the proposal's second flag for exactly that reason.**

`debugTrail`'s polyline is passed as an extra entry on `completedStrokes` — render-only. It is never
in `strokes`, never released, never scored and never persisted; `onRelease` overwrites `strokes` from
the canvas's own stroke list regardless.

**The pairing rule, stated so a reviewer cannot get it wrong.** Per level, exactly two captures, and
they are always taken together:

- `?nivel=beeN` — **the control**: the level as the child first meets it. Every flower dormant, the
  bee at `start`, no rings, no trail.
- `?nivel=beeN&debug=estela:<k>` — the instrumented view, `k = 1` on `bee1` and `k = 2` on
  `bee2`–`bee4`, so every capture shows both states of the flower at once.

**The instrumented capture is never read alone**, because the rings and the seeded trail are not
things the child ever sees. Plus one `?debug=estela:0` on `bee4` — nothing flown, all four rings
drawn — which is the only frame that photographs the precision rung's actual tolerance.

---

## 9. The zoo

| row | value | note |
|---|---|---|
| `AdventureId` | `… \| 'bee'` | |
| `ADVENTURES.bee` | `{ id:'bee', levelIds:['bee1'..'bee4'], sector:'bosque', animal:'abeja', intro:'La abeja se perdió entre las flores. ¿La ayudamos a volver al panal?', closing:'¡La abeja volvió a su panal!' }` | snake's row is the template. **No `closingBeat`**: `mapBubble` filters on `a.animal !== undefined` (`adventures.ts:97`), so an adventure that recovers an animal already carries `docs/13` §5 item 6 through the shipped map bubble — and the closing SCREEN was built for a once-per-story transformation. |
| `ZooAnimalId` | `… \| 'abeja'` | `docs/13` §7 lists `abeja.png` among the ANIMALS, not the UI icons — so this is the animal route, not the `icon` route `glass`/`sand`/`night` take. |
| `ZOO_ANIMAL_ART.abeja` | `SECTOR_ADVENTURE_ART.bee` | |
| `bosque.animals` | `[{ id:'abeja', dx:0, dy:0, size: 48, appearsWhen:['bee4'] }]` | **`size` is a HEIGHT** (`placeArt.ts:53-61`); aspect 1.113, so 48 renders 53 × 48 — half the duck's 96, which is the right sentence about a bee, and it sits comfortably in `BOSQUE_HIT`'s 300 × 300. |
| `bosque.adventureIds` | `['bee1','bee2','bee3','bee4']` | |
| `bosque.unlockedWhen` | `(records) => isFiled(records, 'snake4')` | the ladder's new last rung: entrada → estanque ← `sand4` → montañas ← `duck-trail4` → nocturna ← `llama-peak4` → arena ← `night4` → **bosque ← `snake4`**. Only ever WIDENS access. |
| backpack | `{ id:'flor', art: SECTOR_ADVENTURE_ART.flower, grantedBy:'bosque', earnedWhen:['bee4'] }` | `docs/13` §8: one object per closed sector, and all four shipped items reuse existing art. The hive would be narratively wrong — the bee needs it. Still the author's to override (proposal, "What is explicitly NOT closed"). |
| `sectors.test.ts` | amended | its *"undeveloped sectors stay fogged for any input"* narrows from `{bosque, sendero}` to `{sendero}`. |

---

## Data Flow

```
  build_art.py  ──PASSTHROUGHS(191,926)──▶ manifest { quiet, brightest, corridorRows }
                ──SINGLES(FLOWER_DORMANT)─▶ sector-flower-dormant.png
                                    │  hand-copied, guarded by artManifest.test.ts
                                    ▼
      backdrops.ts  ADVENTURE_BACKDROP.bee      assets.ts  FLOWER_ART {dormant, lit}
                                    │                               │
  catalog.ts  waypoints{start,stops,goal} ◀─────────────────────────┘
        │
        ├─ buildLevelTarget ─ levelStart ─▶ target.start ──▶ startMarker ──▶ carrier ✦REPAIR
        │                                                              └──▶ carrierArt ✦REPAIR
        ▼
  TraceCanvas.onFrame(points, drawing, timeMs)        ← ~30 Hz, the ONE sample
        │
        ├─ routes.length === 0 ─▶ out = false ✦REPAIR (no phantom dim, no phantom buzz)
        │
        └─ waypointTick ─▶ WaypointState ─┬─ lit latch ─▶ haptic pulse
                                          └─ waypointArt ─▶ WaypointLayer ─▶ N × <image>
                                                              waypointRings ─▶ N × <circle> (debug)
  onRelease ─▶ evaluateLevel ─ kind 'free' ─ waypoints? ─▶ waypointScore(COMPLETE strokes)
                                            └─ else ────▶ revealScore  (bit-identical)

  ADVENTURES.bee ─ introLevel ─▶ {view:'intro'}   ·   mapBubble ─ animal ─▶ closing
  SECTORS.bosque(snake4 filed) ─ bee4 filed ─▶ abeja stands + flor
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `client/src/levels/waypoints.ts` (+`.test.ts`) | Create | `Waypoint`, `WaypointConfig`, `WaypointState`, `trailPasses`, `waypointTick`, `waypointScore`, `waypointArt`, `waypointRings`, `debugWaypoints`, `debugTrail`, `debugCarrier`, `seedWaypoints` |
| `client/src/canvas/WaypointLayer.tsx` (+`.test.tsx`) | Create | N `<image>`s + optional rings, zero `url(#`. **§7.1 lives here** |
| `client/src/levels/types.ts` | Modify | `waypoints?`, `carrierArt?`, `LevelTarget.start?` |
| `client/src/levels/buildLevel.ts` (+`.test.ts`) | Modify | `levelStart()`; `start` set in BOTH branches; every shipped target byte-identical |
| `client/src/game/evaluateLevel.ts` (+`.test.ts`) | Modify | one conditional in the `free` branch |
| `client/src/screen/LevelPlay.tsx` (+`.test.tsx`) | Modify | **A1's `out` guard**; `startMarker = target.start`; the `carrierArt` override; the waypoint fold + haptic; `initialWaypointState`; the debug trail on `completedStrokes` |
| `client/src/canvas/TraceCanvas.tsx` (+`.test.tsx`) | Modify | `TraceWaypoints`, the layer slot, `TraceCarrierArt.size?` |
| `client/src/canvas/devMode.ts` (+`.test.ts`) | Modify | `waypointDebugCount`; six shipped parsers byte-identical |
| `client/src/levels/catalog.ts` | Modify | `bee1..bee4`, inserted after `snake4` |
| `client/src/levels/catalog.test.ts` | Modify | `EXPECTED_IDS` ×4; `CORRIDORS`/`FLUENCY` ×4; the `waypoints` exemption at `:259-260`; the `haptics` clause at `:409`; R1–R7 + C1–C6. **`:297`, `:289`, `:538-561` unedited and green** |
| `client/src/detective/palette.ts` (+ verify `palette.test.ts`) | Modify | `FLOWER_DORMANT` (provisional). Read `palette.test.ts` first: if it iterates module exports rather than a listed set, the new token joins its loops |
| `client/src/detective/assets.ts` | Modify | `SECTOR_ADVENTURE_ART.flowerDormant`, `FLOWER_ART`, `ZooAnimalId \| 'abeja'`, `ZOO_ANIMAL_ART.abeja` |
| `scripts/art/build_art.py` + `client/public/art/manifest.json` | Modify | `:536`'s corridor rows; one `SINGLES` row. **No new pixels commissioned** |
| `client/src/detective/artManifest.test.ts` | Modify | the forest's `quiet`/`brightest`/`corridorRows`; the dormant flower; **the `flower` ↔ `flowerDormant` dimension-parity claim** |
| `client/src/detective/artHierarchy.test.ts` | Modify | the absolute dormant-flower measurement (§3.3). **The decorative-hierarchy rule is left alone: it is vacuous here** |
| `client/src/zoo/backdrops.ts` (+`.test.ts`) | Modify | the `bee` row; `WAYPOINT_BACKDROPS`; W1–W3; **F1–F4** |
| `client/src/zoo/adventures.ts` (+`.test.ts`) | Modify | `AdventureId \| 'bee'`, one row |
| `client/src/zoo/sectors.ts` (+`.test.ts`) | Modify | `bosque`'s unlock, animals, `adventureIds` |
| `client/src/zoo/backpack.ts` (+`.test.ts`) | Modify | the flower |
| `docs/13_AVENTURAS_POR_ANIMAL.md` | Modify | §4's *Abejas* status row, and **decision 8** (§11) |
| `useTraceInput.ts`, `revealGrid.ts`, `coverage.ts`, `arrange.ts`, `artCorridor.ts`, `corridorTrack.ts`, `cases.ts`, `migrate*.ts` | **Unchanged** | §10 |
| `TraceCanvas.test.tsx`'s five `url(#` guards | **Unchanged, and must stay green** | the ban is the point |

## Threat Matrix

N/A — no HTTP/shell routing, no subprocess, no VCS/PR automation, no executable-file classification,
no process-integration boundary. `scripts/art/build_art.py` is an existing offline build script: this
change adds one `SINGLES` row and one tuple element to an existing `PASSTHROUGHS` row, and adds no
argument, no path input and no new caller. The rest is rendering, pure arithmetic, and one URL-query
parser over an explicit string argument.

## Migration / Rollout

**No migration.** `isUnlocked` is positional, and `bee1..bee4` are inserted between `snake4` and
`f2-guirnalda`, so a returning child's positional unlock of `f2-guirnalda` would nominally shift —
but `isUnlocked`'s only non-test, non-migration consumer is the dev-only `LevelMap.tsx`
(`migrateEntrance.ts:20`: *"the zoo map itself never asks `isUnlocked`"*; `migrateEntrance.test.ts:187`
calls it *"`LevelMap.tsx`'s dev-only"*). Real navigation routes through `zoo/sectors.ts`'s
declarative `unlockedWhen`, and `bosque` moving off `alwaysClosed` only ever WIDENS access.
**Re-grep `isUnlocked` at apply time and state the result**, the way paso E did; this is recorded as a
success criterion so a later reader does not "restore" a migration nobody needs.
`migrateEntrance.test.ts:190-191` keeps its current expectations (`snake1` true, `f2-guirnalda` false).

**Rollback.** Every seam is additive: drop the four catalog rows and set `bosque.unlockedWhen` back
to `alwaysClosed`, and every existing level keeps its current scoring path. `git revert` of the
branch merge restores `main` with every child's progress intact — no persisted key is renamed and no
`bee*` id is referenced by any prior record. **A1 is the one thing a partial revert must not leave
behind**: reverting it alone restores a live defect on twelve levels, so it belongs in the first
commit and is called out in its own commit message.

## Review-budget forecast

`delivery_strategy: exception-ok` was cached at session start and the line budget was **removed
entirely** for this change — there is no cap, and no slicing is proposed. `sdd-tasks` owns the
binding forecast. The dependency order below is an APPLY order, not a PR split: each step is green on
its own, which is what makes a bisect useful.

| step | contents | why it is green alone |
|---|---|---|
| **F1** Repairs | A1's `out` guard; `levelStart` + `LevelTarget.start`; `carrierArt` override + `TraceCarrierArt.size`; §7.2's regression test | no level authors `waypoints` or `carrierArt` yet; the twelve reveal levels' one changed attribute is asserted explicitly |
| **F2** Fold | `waypoints.ts` + tests; `types.ts`; `evaluateLevel`'s conditional | nothing authors the field; `revealScore`'s path proven unchanged |
| **F3** Paints | `FLOWER_DORMANT`; the two `build_art.py` rows; the rebuild; `assets.ts`; `artManifest`/`artHierarchy` | the pipeline emits and the registry resolves; no level consumes yet |
| **F4** Render | `WaypointLayer.tsx` + §7.1's harness against a FIXTURE config; `TraceCanvas`'s prop and slot; `devMode`'s parser | exercised through synthetic props |
| **F5** Levels | the four entries; `EXPECTED_IDS`; R1–R7, C1–C6; §7.1 re-pointed at the real catalog; `LevelPlay`'s fold, haptic and debug wiring | `ADVENTURE_BACKDROP` may still lack the `bee` row — `backdropFor` returns `undefined` and the levels render on paper |
| **F6** Zoo | the backdrop row + W1–W3 + F1–F4 + the fourth group; adventure, sector, animal, backpack; `docs/13` §4 decision 8 | the backdrop resolves for the first time here, which is where the captures start paying |

**F6 must not merge before its captures are read.** The numeric risk is closed by §3, but F6 is the
only step that can be wrong in a way the suite cannot see: whether a luma-210 grey flower on a
luma-151 forest reads as *dormant* or as *broken* is a question no assertion answers.

## Open Questions

- [ ] **`brightest` over `(191, 926)` is the one number this design owes.** Predicted `#949b8c`,
      equal to `quiet` (§3.1). Lever if it lands above luma 155: narrow `corridorRows` toward the
      test-proven 204–818, never move the literal. If narrowing cannot close it, the dormant branch
      flips pale → dark and that is the author's fork, not a tuning knob.
- [ ] **`#d2d2d2` is provisional and the exact light is the author's** (proposal, binding). The test
      asserts the constraint, so changing it is a one-line edit the suite still polices.
- [ ] **The forest's backpack item is proposed, not mandated** (proposal, binding).
- [x] **RESOLVED — the carrier defect is repaired generally**, through `levelStart` and
      `LevelTarget.start`, with the adjacent `goalArt`-on-a-free-level instance named and
      deliberately left for row G (§2.2).
- [x] **RESOLVED — and this design found a SECOND live defect the proposal did not name**: `offPath`
      is permanently true on every routeless level, so the child's line has been rendering in the dim
      colour on twelve shipped levels, 3 luma short of the law the suite asserts — and 10 luma from
      the forest, where it would have been invisible (A1, §2.1, F3).
- [x] **RESOLVED — `demo` is impossible on a free level, twice over** (A2), and §6.3 says what
      discharges `docs/13` §5 item 2 instead.
- [x] **RESOLVED — one debug flag, not two** (A4, §8), because two independent flags is the exact
      shape that produced paso E's misreading.
- [x] **RESOLVED — the span guard's spirit and §2's first rung are in genuine tension**, and BOTH
      halves are enforced rather than one asserted in prose (§4.3, C4/C5).
- [x] **RESOLVED — `artHierarchy.test.ts`'s decorative-hierarchy rule is vacuous in this sector**, by
      construction, and is replaced by an absolute measurement with a real referent (§3.3).
- [x] Nothing else is blocking.

## 11. `docs/13` §4 decision 8 — what it will say

Written in Spanish in `docs/13`'s amendment style, matching decisions 5–7. The design fixes the
content; `sdd-apply` writes it. Four bullets, and the first is the expensive one:

1. **Un nivel sin ruta venía dibujando la tinta del chico en el color "te saliste".** `offPath` sale
   de comparar la distancia al corredor, y `multiCorridorTick` devuelve `Infinity` cuando no hay
   rutas — que es todo nivel `kind: 'free'`. Doce niveles embarcados (vidrio, arena, linterna) vienen
   pintando la línea viva en `inkDim` desde que existe el campo, y en vidrio y arena ese gris separa
   52 del velo, tres por debajo de la ley que el propio `backdrops.test.ts` afirma sobre `ink`. En el
   bosque habría separado **10**. Reparado en una línea, con una fila roja de falsabilidad que lo
   deja medido y no opinado.
2. **En un nivel sin ruta se apaga todo lo que se deriva de la ruta, no sólo el corredor.** El
   carrier, el punto de inicio, el pulpo parado, la flecha, la meta y el `demo` salen todos de
   `target.polyline`/`target.paths`, que vienen vacíos. La reparación general es **autorizar un
   inicio**: `levelStart` es el único lugar donde una mecánica sin ruta enchufa el suyo. La mitad del
   FINAL queda anotada y sin reparar — su único consumidor sería el panal, y el panal necesita su
   coordenada y su radio en el mismo objeto.
3. **La rama PÁLIDA se abrió por primera vez, y la abre el fondo, no el arte.** La banda tranquila
   del bosque está en el MEDIO (luma 151), así que existen las dos ramas acromáticas — ≤96 y ≥206 — y
   la clara es mucho mejor: separa 166 de la tinta del chico contra los 56 de la oscura, que queda a
   un luma del piso de la ley. Es la tercera vez que `docs/09` §4 acorrala una decisión de dirección
   de arte, y como en los pasos D y E, **cuál claro es de la autora**.
4. **"Recorrido corto" y el guard de amplitud de fase 1 no pueden valer los dos en el primer nivel de
   una familia.** Son incompatibles por aritmética, no por descuido. Se resolvió afirmando las dos
   mitades de la escalera: `bee3`/`bee4` cumplen los tres números del guard más una cláusula
   horizontal que el guard embarcado no tiene, y `bee1`/`bee2` se afirman **estrictamente más chicos**
   que `bee3` en los dos ejes. "Corto" pasa a ser una afirmación verificada y no un adjetivo.

   Y dos cosas menores que conviene no volver a descubrir: la franja de `fondo bosque.png` que un
   test embarcado ya prueba plana son las filas **204-818** (viewBox `[99,5, 499,2]`), más angosta
   que las 191-926 medidas — se autoriza contra la angosta. Y las capturas de este paso están en
   `capturas/pasoF/`, siempre de a dos por nivel: la de control y la de `?debug=estela:<k>`.

---

### Accepted deviation

This document exceeds the skill's 800-word cap, and the orchestrator removed the length budget for
this change — the same deviation `archive/2026-09-13-snake-drag-and-art-corridor/design.md:1104-1114`
and its three predecessors each recorded. `openspec/config.yaml` requires every architecture decision
to carry its rationale; this change carries nineteen, **four of which correct the proposal**, one of
which (A1) repairs a defect live on twelve shipped levels that neither the proposal nor the
exploration named, one of which (§2.2) repairs the named defect as a causal class rather than as a
patch, and one of which (§4.3) proves that the directive's own first rung and the phase-1 guard
cannot both hold — and enforces both halves instead of asserting one.
