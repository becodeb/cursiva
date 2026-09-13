# Design: The reveal grid — entrance and night sector

Binding input: `proposal.md`. Its ten decisions are the starting point; **four are corrected
here with the arithmetic or the code that forced the correction** (§1.4, §5.1, §7.2, §8.1), the
way paso C's design corrected three of its own proposal's numbers. Every `file:line` was
re-verified against the working tree on `main`.

Numbers are marked **[derived]** (closed-form arithmetic from the shipped code, the shipped hex
literals, or `viewBoxToImage`), **[measured]** (`sample_corridor_band(img, 51, 973)` against the
real source, run by the orchestrator), **[corrected]** (the proposal's figure or claim was wrong
and the corrected one is used everywhere below), **[seen]** (read off the authored PNG as an
image, which is evidence but is not a measurement), or **[to copy]** (a value that exists but must
be hand-copied from the rebuilt `manifest.json` at apply time).

**How §2's numbers were obtained.** This design phase had no shell, so §2 was first written as a
*window* with one falsifiable prediction (`brightest ≥ 164` for both entrance backdrops) and both
tile literals pinned at the low end so the pending sampling could only widen the margin — the same
discipline paso C's §2.1 used. **The orchestrator then ran the sampling and the prediction held**
(§2.3). The derivation of the band and of the admissible window is kept verbatim, because it is
the part that transfers to paso E–H; it now carries its numbers.

---

## 0. Ratified amendments to the proposal

The orchestrator has ratified all four corrections below. **They supersede the proposal on these
four points**: `sdd-tasks`, `sdd-apply` and the archive read this contract, not the superseded one.

| # | § | What it corrects |
|---|---|---|
| A1 | §5.1 | The proposal's decisions 1 and 9 contradict each other. `LEVELS[0].id` is **`glass1`**, not `f1-libre`; decision 9 wins, because the insertion, `migrateEntrance` and `isUnlocked`'s `index === 0` branch all depend on it. |
| A2 | §5.4 | The proposal's cross-adventure radius ordering (`night1.radius ≤ sand4.radius`) is **dropped**: an erase radius accumulates and a light radius does not, so the two are not comparable. Replaced by within-adventure monotonicity (R2) plus a night-family invariant (R4). |
| A3 | §3.1 | `nightfall()`'s luma constraint is a **floor**, not the cap the proposal names. A cap alone is satisfied by a black rectangle, which fails the 55-luma law outright. |
| A4 | §8.1 | `migrateEntrance` seeds **two records, not twelve**, and **proposal question 4 is retired**: the returning child keeps every unlock *and* still meets the opening, because the zoo map routes through `nextAdventure`/`isFiled` and never asks `isUnlocked`. **The real stake is the pond, not the dev map** — `estanque.unlockedWhen` stops being `alwaysOpen` in this change, so without the migration a returning child loses the estanque outright. That is a far worse regression than the dev-only `LevelMap` display the proposal was guarding against, and it is why the migration is not optional. |

## Technical Approach

Nothing in the scoring model's *shape*, the progress store's schema, the case machinery, the
`GameView` reducer or the corridor engine changes. The change is one pure mechanic, one optional
level field, one canvas layer, twelve level literals, one derived backdrop, three registry rows,
one closing screen, one two-record migration:

1. `levels/revealGrid.ts` — the grid, its two folds, its scores. Pure, no React, no DOM.
2. `levels/types.ts` — one optional `reveal?: RevealConfig`, a discriminated union.
3. `levels/coverage.ts` — `coverageScore` generalized to any grid, *by delegating to (1)*.
4. `canvas/RevealLayer.tsx` + `canvas/TraceCanvas.tsx` — N plain `<rect>`s between the backdrop
   and everything else. No `url(#…)`, no `<mask>`, no `<pattern>`, no `<clipPath>`, no `<defs>`,
   no `useId`.
5. `screen/LevelPlay.tsx` — the fold rides the existing `onFrame` sample. No second cloud scan.
6. `levels/catalog.ts` — twelve entries, **inserted** (8 before `f1-libre`, 4 at the end of
   phase 1), plus `game/migrateEntrance.ts`.
7. `zoo/*` — three adventures, the unlock ladder, two backpack items, `recentlyDiscovered`
   derived, `Adventure.animal` optional.
8. `screen/AdventureClosing.tsx` + `screen/GameScreen.tsx` — the `'close'` view and
   `resolveCloseAction`.
9. `scripts/art/build_art.py` — `nightfall()`, an optional sixth `PASSTHROUGHS` element, three
   findable objects, three `corridor_rows` tuples.

Governing constraints, unchanged: vitest on the **node** environment, no jsdom, no
testing-library; every decision a **named exported pure function** and each component renders only
what one of them returned; `npm run build` = `tsc --noEmit && vite build` with `noUnusedLocals`,
`noUnusedParameters`, `verbatimModuleSyntax`. No new dependency, no new persisted key, no store
version bump, **no new art commissioned**.

`cases.ts`, `Deduction.tsx`, `AnimalId`, `ClueKind`, `AdventureIntro.tsx`, the duck/sheep/llama/
medusa levels, `trail1..4` and `f1-libre`'s own config are byte-identical to `main`.

---

## 1. The mechanic

### 1.1 Decision: the grid is `cols × rows` over the WHOLE viewBox, and the tile index is the coverage cell index

**Choice.** A reveal level is `kind: 'free'` and `surface: 'blank'`. `drawingBand`
(`LevelPlay.tsx:218`) returns `{ y: 0, height: 600 }` for **every** blank level, unconditionally
**[derived]**, and `buildLevelTarget`'s free branch pins `viewBoxWidth = MIN_VIEWBOX_WIDTH`
(`buildLevel.ts:171`). So a reveal level's sheet is exactly `1000 × 600`, always, and the grid
tiles that rectangle with no inset:

```
w_t = 1000 / cols        h_t = 600 / rows        tile index = row * cols + col
```

The index convention is `coverageScore`'s own (`coverage.ts:59`), deliberately: a tile index and
a coverage cell index are the same kind of number, which is what makes §1.3's delegation legal
rather than a coincidence.

**Tile shapes are square**, so `cols : rows = 5 : 3`. The whole row is drawn from one family
**[derived]**:

| grid | tile | nodes N |
|---|---|---|
| 10 × 6 | 100 × 100 | 60 |
| 15 × 9 | 66.67 × 66.67 | 135 |
| 20 × 12 | 50 × 50 | 240 |

**Alternatives considered**: reusing `COVERAGE_COLUMNS × COVERAGE_ROWS` (12 × 8) for the render
too. Rejected on arithmetic: 12 × 8 over 1000 × 600 gives 83.3 × 75 tiles — a 1.11 aspect. A wipe
is isotropic and a non-square tile makes a horizontal sweep clear visibly more than a vertical one
of the same length, which would silently make "cover the sheet" easier in one direction. The 5:3
family removes the axis from the pedagogy.

### 1.2 Decision: one state shape, two modes, and the mode is a TYPE, not a flag

```ts
// client/src/levels/types.ts — additive, absent on every level that predates it
/** A covering layer of independent tiles over this level's backdrop
 *  (`docs/13` §4, "superficie tapada por una grilla de piezas que se borran
 *  al tocarlas"). The field's REASON TO EXIST is `docs/13` §6's "trayectoria
 *  esperada": a reveal level has none, and `cols`/`rows`/`radius` are what
 *  replaces it — area to cover instead of a route to follow.
 *
 *  A UNION, not a `mode` flag with optional siblings: only a `light` level
 *  may carry `objects`, and only an `erase` level is scored on area. Stating
 *  that in the type makes `npm run build` the thing that catches an object
 *  list on a glass level, the same mechanism `FogPatch.rot: 0` and
 *  `CaptionedArt`'s required `label` already use. Additive and absent
 *  everywhere else — the convention `goalArt`/`vertexArt` established. */
export type RevealConfig =
  | { mode: 'erase'; cols: number; rows: number; radius: number }
  | { mode: 'light'; cols: number; rows: number; radius: number
      objects: readonly RevealObject[] }

/** Something hidden in the dark, lying ON the backdrop UNDER the veil.
 *  Authored coordinates, unlike `vertexArt` — there is no route to derive a
 *  position from, which is the whole point of a routeless level. */
export interface RevealObject { art: ArtImage; size: number; x: number; y: number }
```

| | `erase` (glass, sand) | `light` (night) |
|---|---|---|
| tile opacity | `1` until cleared, then the tile is **not rendered** | `q(d)`, quantized, recomputed each sample |
| persisted in the attempt | a `Set<number>` folded forward | nothing |
| live state | `{ cleared, seen }` | `{ point, lit, seen }` |
| completion | cleared fraction ≥ `rules.minAccuracy` | every object lit at least once |
| restart | discard the set | nothing to discard |

**No `threshold` field.** `rules.minAccuracy` already is the number and already gates approval
(`evaluateLevel.ts:118`) — the proposal's decision 3, adopted verbatim.

### 1.3 Decision: `coverageScore` does not gain a second body — it DELEGATES

```ts
// client/src/levels/revealGrid.ts
export interface RevealGrid { cols: number; rows: number; width: number; radius: number }

/** Every tile the strokes cleared. A tile clears when a sample lands INSIDE
 *  it, or within `radius` of its CENTRE — the union, not the disc alone,
 *  which is what makes `radius: 0` degrade EXACTLY to `coverageScore`'s cell
 *  marking instead of to nothing.
 *
 *  Consecutive samples are joined by walking the segment in steps of half a
 *  cell, and pen lifts do NOT join up: both rules are `coverage.ts:38-43`'s,
 *  quoted rather than re-decided, because the two folds have to agree. */
export function clearedTiles(
  strokes: ReadonlyArray<ReadonlyArray<Point>>,
  grid: RevealGrid,
): ReadonlySet<number>
```

```ts
// client/src/levels/coverage.ts — the whole change
export function coverageScore(
  strokes: ReadonlyArray<ReadonlyArray<Point>>,
  viewBoxWidth: number,
  cols: number = COVERAGE_COLUMNS,
  rows: number = COVERAGE_ROWS,
): number {
  const width = viewBoxWidth > 0 ? viewBoxWidth : 1
  const visited = clearedTiles(strokes, { cols, rows, width, radius: 0 })
  return Math.round((100 * visited.size) / (cols * rows))
}
```

**Rationale.** The proposal's rule was *"one exported pure function, two call sites"*. Two
BODIES computing the same marking would be two sources of truth with a defaulted signature
papering over it — the live set and the release score would drift the first time one of them
learned about the finger radius and the other did not. Delegation makes the bit-identity of
`f1-libre` a **consequence** rather than a promise, and it is falsifiable by the suite that
already exists: `coverage.test.ts` is **untouched** and must stay green, including
`coverage.test.ts:90-112`'s four hand-tuned threshold rows (a short line scores 4, a corner
scribble 13, an energetic scribble ≥ 55). One new row is added: `coverageScore(s, 1000)` equals
`coverageScore(s, 1000, 12, 8)` for every fixture.

**Alternatives considered**: leaving `coverage.ts` alone and duplicating the walk in
`revealGrid.ts` (rejected above); making `clearedTiles` take `COVERAGE_*` as its own defaults
(rejected — it would let a caller omit the grid and get the warm-up's resolution by accident,
which is precisely the bug the parameters exist to prevent).

### 1.4 [corrected] The live fold is incremental over SEGMENTS, and that is what makes the invariant a theorem

The proposal states the invariant — *"folding a stroke set incrementally and folding it at once
produce the same cleared set"* — and leaves the signature to design. The naïve shape (hand
`onFrame` the points since the last sample) **violates it**, and the counterexample is one line:
sample *k* ends at `p₉` and sample *k+1* begins at `p₁₀`, so the segment `p₉ → p₁₀` is never
walked, and at 30 Hz that is the longest segment in the stroke — a fast swipe leaves a gap every
33 ms. [corrected]

The fix is to carry the boundary in the state, exactly as `corridorTrackRef` already carries the
route position forward between samples (`LevelPlay.tsx:924-932`):

```ts
export interface RevealState {
  /** Cleared tiles (erase) — monotone, never shrinks within an attempt. */
  readonly cleared: ReadonlySet<number>
  /** Objects found (light). Latched: the light does not persist, the FINDING
   *  does. This is what turns `docs/13` §4's "sin persistir" into a level
   *  that can be completed. */
  readonly lit: ReadonlySet<number>
  /** The live point, or `null` with the finger up — the light goes out. */
  readonly point: { x: number; y: number } | null
  /** How many points of the CURRENT stroke are already folded. The fold
   *  re-reads `points[seen - 1]` as the next segment's origin, so no segment
   *  is ever skipped and none is ever walked twice. */
  readonly seen: number
}

export const EMPTY_REVEAL: RevealState

/** Monotone. Returns the SAME reference when nothing flips, so an idle
 *  re-pass costs a no-op `setState` — the contract `clueTick` already holds
 *  to (`LevelPlay.tsx:952-953`). */
export function revealTick(
  prev: RevealState, points: ReadonlyArray<Point>, drawing: boolean,
  reveal: RevealConfig, width: number,
): RevealState
```

**The invariant is then a theorem, not a hope.** The windows `[p_{seen-1} … p_last]` partition the
stroke's segment list exactly once each; `clearedTiles` is a union over segments; a union is
associative. `drawing === false` resets `seen = 0` and `point = null`, which is the same pen-lift
rule `coverage.ts` states, so no segment is drawn across a lift. `revealGrid.test.ts` asserts it
by driving a 200-point stroke through every window size from 1 to 200 and comparing against
`clearedTiles` over the whole stroke.

**Idle churn.** In `light` mode the point changes every sample and would re-render forever with a
still finger. `revealTick` returns `prev` unchanged when the new point is within
`REVEAL_EPSILON = 2` viewBox units of `prev.point` and nothing latched **[derived: 2 units is
under a tenth of the smallest tile edge, so no tile's quantized opacity can change across it]**.

### 1.5 Decision: opacity is QUANTIZED to five steps, and a zero-opacity tile is not rendered

```ts
/** The torch: 1 at the rim, 0 at the centre, in five steps.
 *  `q = round(clamp(d / radius, 0, 1) * 4) / 4`. */
export function lightOpacity(d: number, radius: number): number
```

**Rationale, and it is two things at once.** A float opacity is unassertable in this harness —
`renderToString` would give `opacity="0.63719"` and the test would pin a rounding mode instead of
a behaviour. Five steps give five exact strings a node test can name. And it is the frame-rate
lever: a tile only writes an attribute when it crosses a step boundary, so a finger drifting
inside one tile writes nothing at all.

A tile at opacity 0 emits **no element**. In `erase` that means the layer's node count *falls*
from N toward 0 as the child works — the cheapest possible direction — and `renderToString` can
count `<rect` occurrences and get exactly `N − cleared.size`, which is the layer's whole
contract in one assertion.

### 1.6 Tile count versus frame rate — the number the capture pass must falsify

`onFrame` is throttled to `OFF_PATH_PERIOD_MS = 33` (`LevelPlay.tsx:81,916`), so the reveal fold
runs at ~30 Hz on the same sample as `clueTick` and `contactTick`. Two costs, both bounded
**[derived]**:

```
vdom nodes rebuilt per sample      ≤ N                         (240 worst case, §2.3)
tiles whose opacity CHANGES        ≤ ((2R / w_t) + 2) · ((2R / h_t) + 2)
```

The second bound is the disc of radius `R` plus one tile ring, in tiles. Every tile outside it
keeps a constant attribute, so React writes nothing for it. Evaluated over the four night levels
(the only mode that repaints a whole disc every sample) **[derived]**:

| level | grid | tile | R | changed tiles / sample | at 30 Hz |
|---|---|---|---|---|---|
| `night1` | 15 × 9 | 66.67 | 200 | 64.0 | 1 920 /s |
| `night2` | 15 × 9 | 66.67 | 170 | 50.4 | 1 512 /s |
| `night3` | 20 × 12 | 50 | 140 | 57.8 | 1 734 /s |
| `night4` | 20 × 12 | 50 | 110 | 41.0 | 1 230 /s |

**The design budget is `≤ 64 changed tiles per sample`, and every authored level clears it.**
`catalog.test.ts` asserts the inequality over the twelve literals, so it is authored data that
cannot drift. The erase levels are strictly cheaper: only newly cleared tiles change, and the set
is monotone, so the total number of attribute writes across a whole attempt is bounded by N.

This is **not verifiable in this harness** (node, no jsdom — the proposal says so and it is
right). The capture pass gets a number to falsify: **`night1` on the target tablet must hold a
sustained frame time ≤ 33 ms while the finger sweeps.** If it does not, the lever is `cols`/`rows`
in authored data — `night1` drops to 10 × 6 (N = 60, 22.2 changed tiles) with no code change. The
proposal's worry about "a 24 × 16 grid is 384 nodes" never arises: the largest grid in the row is
20 × 12 = 240 **[derived]**.

---

## 2. The paints, and the measurement that is still outstanding

### 2.1 The law, restated for a routeless level, as a WINDOW

`docs/09:158` / `backdrops.test.ts:17`'s `MIN_BACKDROP_CONTRAST = 55` is asserted against a
backdrop's sampled `brightest`. For a corridor the legible thing is the channel; for a reveal
level it is **the difference between covered and uncovered**. Two laws bind a tile paint of luma
`T` over a backdrop of sampled brightest `B`, with the child's ink of luma `I`:

```
covered vs uncovered (docs/09:158)            |T − B| ≥ 55
the child's own line ON the veil              |T − I| ≥ 55
```

With the shipped default ink `INK_COLOR = #1e293b`, `I = 40` **[derived]**, so the second law is
`T ≥ 95`. The upper branch `T ≥ B + 55` needs `B ≤ 197` for any paint at or below `SHEET_PAPER`'s
252 to reach it. The lower branch `T ≤ B − 55` combined with `T ≥ 95` is **non-empty iff
B ≥ 150** **[derived]**.

### 2.2 What the two entrance backdrops actually are, and why the fog must be DARK

Both sources were read as images during this phase. `fondo pecera.png` is a flat pale blue-grey
water body with a **near-white foam waterline** across its top and a pale sand strip at its
bottom. `fondo arena.png` is a single flat pale beige field over roughly 70 % of the canvas, with
a pale blue sky band, dark stones and one palm. **[seen]** — evidence, not a measurement; §2.3
supplies the measurement and confirms both readings.

**The band cannot be narrowed to escape the foam.** §1.1 fixes a reveal level's sheet at the full
`1000 × 600`, and `viewBoxToImage` (`sectors.ts:165`) maps that onto source rows **[derived]**:

```
scale = max(1000/1536, 600/1024) = 0.6510417
row(y) = (y + 33.3333) / 0.6510417     row(0) = 51.2      row(600) = 972.8
```

so `corridor_rows = (51, 973)` for all three reveal backdrops — rounded OUTWARD, which is what
keeps `backdrops.test.ts`'s existing `topImg ≥ top` / `bottomImg ≤ bottom` coverage assertion
true. The foam and the sand strip are inside the band by construction.

**Therefore there is no admissible LIGHT paint on either backdrop, and the consequence is not a
defeat — it is the law telling the truth.** A white "vaho" over pale blue-grey water is a gap of
a few luma: it would be *invisible*, which is exactly what `docs/09:158` exists to prevent. The
fiction moves to meet it, and it is the better fiction anyway (`docs/12` §1: the caretaker finds
the glass and the child helps **clean** it — grime cleans, condensation does not):

| token | hex | luma **[derived]** | the fiction |
|---|---|---|---|
| `GLASS_GRIME` | `#64726b` | **109** | algae-grey on the inside of the pane; wiping reveals bright water |
| `SAND_DRIFT` | `#7a6a58` | **109** | wet, wind-piled sand; sweeping reveals the pale dry path |
| `NIGHT_VEIL` | `#12161f` | **22** | the dark itself |
| `TORCH_CHALK` | `#f2efe6` | **239** | the child's line on the night level (§2.4) |

**Why 109 specifically, and why the sampling could not move it.** The floor is 95 (the ink law).
109 sits 14 above it, and a sampling can only ever *lower* the ceiling `B − 55`, never raise the
floor — the same argument that pinned `CHANNEL_STONE` at the low end of its window. So the
literals hold for **any** `B ≥ 164` **[derived]**, which is why they were pinned before the
measurement rather than after it. §2.3 returned 212 and 209.

### 2.3 [measured] `sample_corridor_band(img, 51, 973)` — the prediction held

> **The prediction was:** `luma(brightest) ≥ 164` for both entrance backdrops. **It holds for
> both, with 45 and 48 luma to spare.** No fallback is taken and the proposal's scope lever
> (dropping or deferring the sand adventure) is **not** exercised.

| source | `quiet` | `brightest` | `luma(brightest)` | window `T ∈ [95, B−55]` | pinned `T` | margin |
|---|---|---|---|---|---|---|
| `fondo pecera.png` | `#9bb6c5` (175) | `#c7d9e0` | **212** | **[95, 157]** | `GLASS_GRIME` 109 | 103 vs the law's 55 |
| `fondo arena.png` | `#d6cbba` (204) | `#dad0c0` | **209** | **[95, 154]** | `SAND_DRIFT` 109 | 100 vs the law's 55 |
| `fondo bosque.png` | `#949b8c` (151) | `#f5f5f5` | **245** | — (it is `nightfall`'s SOURCE, §3.2) | — | — |

All three **[measured]** over rows `(51, 973)`, the band §2.2 derived.

**§2.2's argument is now confirmed rather than predicted, and it was confirmed the hard way.**
The upper branch `T ≥ B + 55` needs `B ≤ 197` to be reachable by any paint at or below
`SHEET_PAPER`'s 252. The measurement returns **212** and **209** — so the light branch is empty
by 15 and by 12 luma respectively **[derived from the measurement]**. A white "vaho" over this
tank misses the law by 40; over this sand by 43. **There is no admissible light paint on either
entrance backdrop, and the two falsifiability rows in `backdrops.test.ts` now encode a measured
fact rather than an expectation.**

**The sand case was the sharpest and it landed exactly where §2.2 said it would.** Its field is
luma 204 and its brightest 209: a covering *loose sand* is the same colour family as the surface
it covers by construction, and nothing in that family clears 55 against 209. `SAND_DRIFT` is dark
for the same reason `CHANNEL_STONE` is dark, and the measurement is the proof rather than the
taste.

**Residual, stated honestly.** These are measurements of the **source** PNGs. `ADVENTURE_BACKDROP`'s
literals must still be hand-copied from the rebuilt `manifest.json` after `build_art.py` runs with
the three new `corridor_rows = (51, 973)` rows — exactly as paso B and paso C did, and exactly
what `artManifest.test.ts` exists to keep honest **[to copy]**. For `pecera` and `arena` the copy
is a formality: `emit_opaque_canvas` writes the source through **unchanged** (no resize, no
recolour), so the manifest values will equal the table above byte for byte. For the night row they
will **not** — `nightfall()` runs first, and §3.2 derives what the manifest must then report.

### 2.4 The ink, and the one place it has to change

| level family | tile | ink | gap **[derived]** |
|---|---|---|---|
| glass | 109 | `INK_COLOR` 40 | 69 ✓ |
| sand | 109 | `INK_COLOR` 40 | 69 ✓ |
| night | 22 | `INK_COLOR` 40 | **18 ✗** → `TORCH_CHALK` 239, gap **217** ✓ |

A slate line on a black veil is invisible, so the night backdrop declares its own ink. The
mechanism already exists: `TraceCanvas` takes `inkColor`/`inkDimColor` as props
(`TraceCanvas.tsx:515,521`) and `LevelPlay.tsx:1339` already routes them. One widening:

```ts
inkColor={inWorld ? MUD_INK : backdrop?.ink}
inkDimColor={inWorld ? MUD_INK_DIM : backdrop?.inkDim}
```

Byte-identical today — no shipped backdrop declares `ink` **[derived: `ADVENTURE_BACKDROP` has
three rows, none with the field]**. `TORCH_CHALK` also clears the *revealed* night backdrop
(239 − 96 = 143) ✓.

**Named exception.** A partially lit tile sits at an intermediate luma and therefore inside the
forbidden band for part of the torch's falloff. That is the torch, not a defect: the law is
asserted on the two TERMINAL states, the same exemption the corridor's round caps and every
anti-aliased edge already ride. It is stated in the registry's docblock so nobody re-derives it.

### 2.5 The registry rows

`AdventureBackdrop` gains two optional fields and one doc widening. `corridorRows` keeps its
name — renaming it costs four files plus the manifest key for no behaviour — and its header
grows *"the rows a corridor **or a reveal grid** can reach"*.

```ts
// client/src/zoo/backdrops.ts
export interface AdventureBackdrop {
  art: ArtImage; quiet: string; brightest: string
  corridorRows: { top: number; bottom: number }
  channel?: string
  /** The reveal veil's paint. ABSENT = this adventure has no reveal grid,
   *  which is every row that predates this change. Forced DARK rather than
   *  chosen (design.md §2.2): there is no admissible light paint over either
   *  entrance backdrop, at any tint. */
  tile?: string
  /** The child's own line over `tile`, when the default slate cannot clear
   *  it. ABSENT = `INK_COLOR`, which is every row but the night's. */
  ink?: string
  inkDim?: string
}

glass: { art: SECTOR_BACKGROUND_ART.aquarium, quiet: '#9bb6c5', brightest: '#c7d9e0',  // 175 / 212
         corridorRows: { top: 51, bottom: 973 }, tile: GLASS_GRIME },
sand:  { art: SECTOR_BACKGROUND_ART.sand,     quiet: '#d6cbba', brightest: '#dad0c0',  // 204 / 209
         corridorRows: { top: 51, bottom: 973 }, tile: SAND_DRIFT },
night: { art: SECTOR_BACKGROUND_ART.night,    quiet: /* luma ≈ 67 */, brightest: /* luma ≈ 96 */,
         corridorRows: { top: 51, bottom: 973 }, tile: NIGHT_VEIL,        // both [to copy], §3.2
         ink: TORCH_CHALK, inkDim: TORCH_CHALK_DIM },
```

`backdrops.test.ts` gains: the `tile ?? channel ?? SHEET_PAPER` paint clears 55 against
`brightest` for all six rows; `|luma(tile) − luma(ink ?? INK_COLOR)| ≥ 55` for the three new
rows; and **three falsifiability rows that must go RED** — `SHEET_PAPER` against the aquarium,
`SHEET_PAPER` against the sand, and `INK_COLOR` against `NIGHT_VEIL` (gap 18). Those three
encode §2.2's and §2.4's arguments rather than only their conclusions.

---

## 3. The night backdrop, derived to be deleted

### 3.1 [corrected] The derivation needs a FLOOR on brightest, not only a cap

The proposal says *"`nightfall()` must **cap** the derived image's maximum luma low enough to
clear it"*. Read against §2.1's law that is backwards: the veil is the dark thing, so the law is
`B_night ≥ T + 55 = 77` — a **floor**. A cap alone is satisfied by a black rectangle, which fails
the law completely. The fiction supplies the cap (`B_night ≤ ~110`, or it does not read as
night). The real specification is a two-sided window, and one knob can guarantee both. [corrected]

### 3.2 Decision: `nightfall` NORMALIZES, so the output window is independent of the source

```python
# scripts/art/build_art.py — the fourth transform, beside mute/recolour/recontour
NIGHT_PEAK = 96      # the brightest pixel the derived night is allowed to have
NIGHT_SHADOW = 0.22  # the darkest, as a fraction of the peak -> luma 21
NIGHT_TINT = (0.858, 1.000, 1.370)   # moonlight, NORMALIZED to luma 1.0

def nightfall(img):
    """Derive a night scene from a daylight one (design.md §3.2).

    HOW TO SWAP IN THE AUTHORED ART, when `fondo nocturno.png` arrives.
    Two edits, no third:

        ('fondo bosque.png',   'sector-night-background.png', 1536, 1024,
         (51, 973), nightfall)
      ->
        ('fondo nocturno.png', 'sector-night-background.png', 1536, 1024,
         (51, 973))

    ...and delete this function. Nothing else mentions `bosque`: no registry
    entry, no level config, no test, no consumer -- they all name the BUILT
    file `sector-night-background.png`.

    WHAT THE REPLACEMENT MUST STILL SATISFY, and it is asserted, not hoped:
    its sampled `brightest` over rows (51, 973) must land in [77, 110].
    The floor is `docs/09:158`'s 55-luma law against `NIGHT_VEIL` (luma 22);
    the ceiling is the only machine-checkable part of "it has to read as
    night". `client/src/zoo/backdrops.test.ts` asserts both, so swap day
    fails loudly and immediately instead of silently shipping a grey wood.

    WHY THIS NORMALIZES instead of scaling. An affine luma map would make the
    output's brightest a function of the SOURCE's brightest, so the law would
    depend on a pixel nobody has measured. This maps the source's own maximum
    onto `NIGHT_PEAK`, so the output's brightest is `NIGHT_PEAK` BY
    CONSTRUCTION, whatever the source is. Order matters: desaturate, tint,
    THEN force the target luma per pixel -- doing the luma step last is what
    makes it exact rather than approximate, because the tint is applied to a
    pixel that still carries chroma.

    No alpha is touched: `emit_opaque_canvas` rejects any non-255 alpha, and
    a background has none.
    """
```

Per opaque pixel: `L = luma(px)`; desaturate toward `L` by `NIGHT_SAT = 0.45` (the shape `mute`
uses); multiply by `NIGHT_TINT`; then scale all three channels by `target / luma(current)` where

```
target = NIGHT_PEAK * (NIGHT_SHADOW + (1 − NIGHT_SHADOW) * L / SRC_MAX)
```

`SRC_MAX` is the maximum luma over the source's opaque pixels, computed by one extra pass.

**Guarantees, all [derived].** Output luma spans exactly `[21, 96]`. No channel clamps: the
largest factor in `NIGHT_TINT` is 1.370 and `96 × 1.370 = 131.5 < 255`, and the per-pixel rescale
only ever *reduces* a channel toward the target. The gap against `NIGHT_VEIL` is `96 − 22 = 74`,
a margin of 19 over the law. **The night backdrop therefore carries no measurement risk at all** —
which is the whole reason to normalize.

**The one assumption this design flagged is now confirmed [measured].** `nightfall`'s peak is
attained exactly only if the source's brightest pixel is *neutral*; a saturated one would clamp a
channel and cost luma. `sample_corridor_band` returns `SRC_MAX = 245` at **`#f5f5f5`** — `r = g =
b`, chroma **0**, a bright sky gap between the canopies. **The peak is attained exactly, and the
derived night's `brightest` will be luma 96 ± rounding.** Two consequences, both **[derived]** from
that measurement and both **[to copy]** as hex from the rebuilt manifest:

```
brightest:  96 × (0.22 + 0.78 × 245/245) = 96.0        → the swap-day gate, 77 ≤ 96 ≤ 110  ✓
quiet:      96 × (0.22 + 0.78 × 151/245) = 67.3        → from the source's quiet #949b8c (151)
```

So the night backdrop's dynamic range in the shipped file is luma **21 … 96**, sitting under a
veil at 22 and a torch line at 239 — a scene that is genuinely dark and still clears the law by
19. Had the derivation merely scaled the source instead of normalizing it, `brightest` would have
been a function of that unmeasured 245 and the whole gate would have moved with the art.

### 3.3 The optional sixth `PASSTHROUGHS` element

```python
PASSTHROUGHS = [
    # ...
    ('fondo arena.png',   'sector-sand-background.png',     1536, 1024, (51, 973)),
    ('fondo pecera.png',  'sector-aquarium-background.png', 1536, 1024, (51, 973)),
    ('fondo bosque.png',  'sector-night-background.png',    1536, 1024, (51, 973), nightfall),
]

for row in PASSTHROUGHS:
    src, name, expected_w, expected_h, corridor_rows = row[:5]
    transform = row[5] if len(row) > 5 else None
    img = png.read_png(os.path.join(SRC, src))
    if transform is not None:
        transform(img)          # in place, like mute/recolour/recontour
    ...unchanged...
```

`fondo bosque.png` keeps its existing `sector-forest-background.png` row untouched — paso F owns
the bosque sector and this change must not repaint it. The table's header comment gains one
sentence naming the sixth element and pointing at `nightfall`'s docblock.

**Alternatives considered**: a separate `DERIVED = [...]` table (rejected — a second loop that
does the same four things, and the swap would then be a row moving between tables rather than one
element disappearing); doing the derivation in a one-off script outside `build_art.py` (rejected
— `artManifest.test.ts` guards what the pipeline emits, and art the pipeline does not emit is art
nobody can prove is current).

### 3.4 The three findable objects

`cofre.png`, `piedra.png`, `hoja.png` land as `SINGLES` rows, registry entries **and** consumers
in the same change, which is `build_art.py:346-350`'s stated rule and `artManifest.test.ts`'s
enforcement of it.

| source | emitted | `SINGLES` row | registry | consumer |
|---|---|---|---|---|
| `cofre.png` | `sector-chest.png` | `(…, 256, 'contour', True)` | `SECTOR_ADVENTURE_ART.chest` | `night1`, `night3`, `night4` |
| `piedra.png` | `sector-stone.png` | `(…, 256, 'contour', True)` | `.stone` | `night2`, `night3`, `night4` |
| `hoja.png` | `sector-leaf.png` | `(…, 256, 'contour', True)` | `.leaf` | `night2`, `night3`, `night4` |

`'contour'` matches every sibling `sector-*` row: they are drawn-world props standing beside the
child's ink, not reward-coloured clue marks.

**Decision: none of the three takes an `AUTHORED_SOURCE_SIZES` entry.** All three sources were
read as images during this phase **[seen]**, and they do not share a canvas, let alone the square
one that table contracts:

| source | rendered aspect **[seen]** | verdict |
|---|---|---|
| `cofre.png` | ≈ 1.10, landscape | **not 1024 × 1024** — no entry |
| `piedra.png` | ≈ 1.10, landscape | **not 1024 × 1024** — no entry |
| `hoja.png` | ≈ 0.98, near-square | probably not; **one `png.py` call decides** |

`AUTHORED_SOURCE_SIZES` is the ZOO SLICE's square-canvas contract, and these three predate it
exactly as `pato.png`, `gallina.png` and `oveja.png` do — none of which is listed
(`build_art.py:457-488`, verified). Adding an entry that does not match makes
`validate_authored_source_sizes` (`build_art.py:491`) raise and **fails the whole build for every
asset**, which is the one outcome worse than an unlisted source. This is paso C's `oveja.png`
finding, reached before it cost a build rather than after.

The residual can no longer change the design: `sdd-apply` runs `scripts/art/png.py` on the three
and adds an entry **only** for one that is exactly 1024 × 1024 — reachable for `hoja.png` alone,
and additive either way. `w`/`h` for the three registry entries are hand-copied from the rebuilt
manifest **[to copy]**.

**One flag for apply, and it is the `oveja.png` defect class.** `piedra.png` renders its margin as
a transparency checkerboard while `cofre.png` and `hoja.png` render theirs as flat black **[seen]**.
That is consistent with two harmless renderer behaviours *and* with opaque black margins on two of
the three — which is precisely the failure `build_art.py:256-267` records: `alpha_bbox` sees opaque
pixels in the corners, crops nothing, and the whole lamina ships as a box. **Verify alpha before
wiring**: if a margin is opaque, the source joins the `DITHERED` opt-in list rather than being
blob-filtered blanket-wise. Cheap to check, expensive to discover in a capture.

`escoba.png`, `alga.png`, `cartel.png`, `nube.png` are **not touched** — no consumer in this row,
so a `SINGLES` row would be dead weight by `artManifest.test.ts`'s own definition.

---

## 4. The render layer

### 4.1 Decision: N `<rect>`s, in `RevealLayer.tsx`, taking only structural props

```ts
// client/src/canvas/TraceCanvas.tsx — structural, no import from `levels/` or `zoo/`,
// the same convention TraceBackdrop and TraceVertexArt already follow.
export interface TraceRevealTile {
  x: number; y: number; w: number; h: number
  /** 0.25 | 0.5 | 0.75 | 1 — five steps, and a tile at 0 is simply absent
   *  from this list (design.md §1.5). The attribute is emitted only when
   *  `< 1`, so an untouched veil is the cheapest markup possible. */
  opacity: number
}
export interface TraceReveal {
  fill: string
  tiles: readonly TraceRevealTile[]
  /** Hidden objects, drawn UNDER the tiles so the veil covers them. */
  art?: readonly { href: string; w: number; h: number; size: number; x: number; y: number }[]
}
```

`RevealLayer` renders, in order: one `<image>` per `art` entry through the existing
`placeArt(...)` + `clampArtBox(..., sheetBounds)` path, then one `<rect>` per tile. Both inside
`<g pointerEvents="none">`. Inserted immediately AFTER the backdrop group
(`TraceCanvas.tsx:933-944`) and before the maze/corridor block — a free level has no corridor and
no ground, so on the twelve it is the only thing between the backdrop and the guides.

**Alternatives considered and rejected on the scar** (`TraceCanvas.tsx:78-93`): one `<rect>`
filled with a `<pattern>` (needs `fill="url(#id)"`, banned — hydrates blank on a real device);
one full-sheet rect with the cleared area knocked out through `<mask>` (the exact mechanism the
scar removed); `<clipPath>` to confine the veil (same ban, and a reveal set is not a polygon).
The `ground` scatter layer (`TraceCanvas.tsx:1015-1047`) is the shipped precedent for "N elements
instead of a fill" and its header already argues the case; this layer is the same answer to the
same question. **Six shipped guard tests stay green untouched**, including
`TraceCanvas.test.tsx:145,163`.

### 4.2 `LevelPlay` wiring — three additions, every shipped level byte-identical

```ts
const [revealState, setRevealState] = useState(EMPTY_REVEAL)
// inside the EXISTING onFrame, after the OFF_PATH_PERIOD_MS throttle and
// beside clueTick/contactTick -- no second cloud scan (docs/02 §7.2).
if (level.reveal) {
  setRevealState((prev) =>
    revealTick(prev, points, drawing, level.reveal!, target.viewBoxWidth))
}
```

and one memo producing `TraceReveal` from `revealTiles(level.reveal, revealState, width)` plus
`backdrop.tile`. `restartRun` and `clearAttempt` reset it to `EMPTY_REVEAL`; the erase set is
discarded with the attempt, which is `docs/13` §6's "posibilidad de reinicio" for free.

The `!drawing` early-return branch (`LevelPlay.tsx:904-912`) also clears `point` — **the light
goes out when the finger lifts**, the same sentence the tone already obeys one line above.

**What the twelve inherit unchanged**, all five sites the proposal's decision 1 names, verified:
`buildLevel.ts:167` (empty target) ✓, `evaluateLevel.ts:115` (coverage instead of accuracy) ✓,
`LevelPlay.tsx:546` (*"Empezá donde quieras"*) ✓, `LevelPlay.tsx:772` (`resetOnContact` forced
off) ✓, `LevelPlay.tsx:1046` (no goal marker) ✓. A `'reveal'` `LevelKind` would have inherited
none of them.

**And one they inherit that the proposal did not count.** `drawnPlace = inWorld || !!backdrop`
(`LevelPlay.tsx:1143`) is already true for any level with a backdrop, so the twelve get the
adventure chrome — no title, no hint sentence, no rotate copy, no pillar/result block, icon-only
buttons — with **no edit at all**. The entrance therefore looks like the shipped adventures rather
than like a phase-1 exercise, which is what `docs/12` §1 asks for.

### 4.3 `evaluateLevel` — one line

```ts
// client/src/game/evaluateLevel.ts:116
const accuracy = revealScore(strokes, target.config, target.viewBoxWidth)
```

```ts
/** The accuracy pillar for a free level. No `reveal` -> `coverageScore` at
 *  its own defaults, which is EXACTLY today's call and is what keeps
 *  `f1-libre` bit-identical. `erase` -> the cleared percentage at the
 *  level's own resolution. `light` -> the percentage of hidden objects the
 *  strokes lit, which is the one criterion a non-persistent grid can carry:
 *  it never accumulates a coverage figure, so objects ARE its area. */
export function revealScore(
  strokes: ReadonlyArray<ReadonlyArray<Point>>,
  config: Pick<LevelConfig, 'reveal'>,
  viewBoxWidth: number,
): number
```

The live latch and this release-time score are the same function over different inputs: an object
is lit iff some sample came within `radius` of it, which is whole-stroke computable. The
incremental-equals-whole invariant of §1.4 covers `lit` as well as `cleared`, in the same test.

---

## 5. The twelve levels

### 5.1 [corrected] The catalog opens with `glass1`, and the amended test says so

The proposal contradicts itself. Decision 1: *"`LEVELS[0].id === 'f1-libre'` stays true and stays
asserted."* Decision 9: *"The twelve go in as `entrada` (4) before `f1-libre` … with `sand`
between `glass` and `f1-libre`."* Both cannot hold. [corrected]

Decision 9 wins, and it is not a preference — it is load-bearing three ways. The entrance IS the
app's first experience (`docs/12` §1); `migrateEntrance` exists *because* the insertion is ahead
of `f1-libre` and has nothing to protect otherwise; and `isUnlocked`'s `index === 0` branch
(`LevelProgressStore.ts:127`) is what makes the opening reachable on a fresh install with no
records at all.

`catalog.test.ts:253` is amended, not deleted, and its header rewritten:

```ts
it('has exactly one free level with no reveal grid, and the catalog opens with the entrance', () => {
  const free = LEVELS.filter((l) => l.kind === 'free')
  expect(free.filter((l) => !l.reveal).map((l) => l.id)).toEqual(['f1-libre'])
  expect(free).toHaveLength(13)
  expect(LEVELS[0].id).toBe('glass1')          // the app's opening (design.md §5.1)
  expect(ADVENTURES.find((a) => a.id === 'glass')!.levelIds[0]).toBe('glass1')
  for (const l of free) expect(l.paths, l.id).toEqual([])
  for (const l of free) expect(l.phase, l.id).toBe(1)
})
```

`catalog.test.ts:42`'s `EXPECTED_IDS` gains twelve ids at their real positions: `glass1..4`,
`sand1..4` **before** `f1-libre`, and `night1..4` between `llama-peak4` and `f2-guirnalda` (the
end of phase 1 — `catalog.test.ts:75-81` asserts phases never decrease, so that is the only place
"end of phase 1" can mean). `:559` and `:575`'s free branches already `continue` on
`kind === 'free'` and need only the widened expectation that twelve more levels have
`paths: []`. `:445-470`'s phase-1 arm guard skips `kind !== 'path'` at `:463` and needs **no
edit** — the twelve ride that exemption honestly, having no route to span anything, and §5.3's
monotonicity is the arm-work guarantee that replaces it.

### 5.2 The twelve, frozen

All twelve: `phase: 1`, `kind: 'free'`, `surface: 'blank'`, `maze: false`, `resetOnContact:
false`, `carrier: false`, `showGuide: false`, `letters: []`, `paths: []`, `corridorWidth: 0`,
`feedback: { tone: false, haptics: true, metronomeBpm: 0, rail: false }`, **no `demo`** —
`f1-libre`'s exact shape but for haptics, which stay on because a tile clearing under the finger
is a contact worth feeling.

`rules(1, false, false, 0)` yields `minAccuracy = 55` (`minAccuracyFor`, `catalog.ts:60`), which
is `glass1`'s number exactly; every other level overrides it as
`{ ...rules(1, false, false, 0), minAccuracy: N }`.

**Glass — `entrada`, `fondo pecera.png`, `mode: 'erase'`** (`docs/13` §2: amplia → zonas más
extensas):

| step | id | grid | N | radius | `minAccuracy` | title |
|---|---|---|---|---|---|---|
| 1 | `glass1` | 10 × 6 | 60 | 110 | 55 | `El vidrio sucio` |
| 2 | `glass2` | 10 × 6 | 60 | 110 | 68 | `Todo el vidrio` |
| 3 | `glass3` | 15 × 9 | 135 | 110 | 76 | `Los rincones` |
| 4 | `glass4` | 15 × 9 | 135 | 80 | 82 | `Sin dejar marcas` |

**Sand — `entrada`, `fondo arena.png`, `mode: 'erase'`.** `sand1` restarts wide on purpose: a new
surface is a new first challenge (`docs/13` §5 item 3, the same licence the llamas took).

| step | id | grid | N | radius | `minAccuracy` | title |
|---|---|---|---|---|---|---|
| 1 | `sand1` | 10 × 6 | 60 | 110 | 60 | `Barrer la arena` |
| 2 | `sand2` | 15 × 9 | 135 | 110 | 70 | `Toda la entrada` |
| 3 | `sand3` | 20 × 12 | 240 | 90 | 78 | `La arena fina` |
| 4 | `sand4` | 20 × 12 | 240 | 70 | 85 | `La última pasada` |

**Night — `nocturna`, the derived backdrop, `mode: 'light'`** (`docs/13` §2: búsqueda más
intencional). `minAccuracy: 100` on all four — the criterion is *every* object.

| step | id | grid | N | radius | objects | title |
|---|---|---|---|---|---|---|
| 1 | `night1` | 15 × 9 | 135 | 200 | chest (500, 300) | `Una luz en la noche` |
| 2 | `night2` | 15 × 9 | 135 | 170 | stone (260, 180), leaf (740, 420) | `Dos cosas perdidas` |
| 3 | `night3` | 20 × 12 | 240 | 140 | chest (200, 140), leaf (500, 440), stone (820, 200) | `Tres en la oscuridad` |
| 4 | `night4` | 20 × 12 | 240 | 110 | leaf (140, 480), chest (520, 120), stone (880, 380) | `La linterna chiquita` |

Object sizes: chest 96, stone 72, leaf 64 viewBox units. Every object sits at least
`size/2 + 20` from every sheet edge **[derived]**, so `clampArtBox` never moves one and no
authored coordinate silently disagrees with what is drawn.

**Worked check, `glass1` — "any honest sweep finishes it"** **[derived]**. One horizontal sweep
at `y = 300` on the 10 × 6 grid clears every tile whose centre is within 110 of the line: row
centres are 50, 150, 250, 350, 450, 550, so rows at 250 and 350 (distance 50) and rows at 150 and
450 (distance 150 ✗) — four rows clear only where the containing-tile rule also fires. Taking the
disc rule alone, two full rows = 20/60 = 33 %; a single sweep plus the return stroke a child
actually makes reaches 55 with room. At `glass3`'s 15 × 9, the same gesture reaches 3 of 9 rows =
33 % against a bar of 76: **the same movement now has to travel three times as far**, which is
`docs/13` §2's *"cubrir zonas más extensas"* expressed as arithmetic rather than as a word.

**Content rules honoured**: every `title` ≤ 80 characters and names no failure
(`catalog.test.ts:89-97`); `hint` is authored but never rendered (§4.2 — `drawnPlace` suppresses
it), and is written anyway so `standingHintFor`'s contract stays honest.

### 5.3 The family invariants `catalog.test.ts` asserts

| # | invariant | value |
|---|---|---|
| R1 | within each adventure, `minAccuracy` is non-decreasing | 55→68→76→82; 60→70→78→85; 100×4 |
| R2 | within each adventure, `radius` is non-increasing | 110→80; 110→70; 200→110 |
| R3 | within each adventure, `cols × rows` is non-decreasing | 60→135; 60→240; 135→240 |
| R4 | the night family's object count is non-decreasing | 1, 2, 3, 3 |
| R5 | every level clears §1.6's frame budget | `((2R/w_t)+2)((2R/h_t)+2) ≤ 64` |
| R6 | no `demo` on any of the twelve | `docs/13` §6, decision 4 |
| R7 | every `light` object lies at least `size/2 + 20` inside the sheet | §5.2 |
| R8 | every grid is 5:3, so every tile is square | `1000/cols === 600/rows` |

### 5.4 [corrected] The cross-adventure radius ordering is dropped, and the reason is arithmetic

The proposal requires *"`night`'s [radius] is [≤ the previous], because the night sector follows
both"*. The two numbers are not comparable. **An erase radius ACCUMULATES and a light radius does
not**: in `sand4` a radius-70 finger that visits 39 disc-placements has cleared the sheet, because
what it cleared stays cleared; in `night1` a radius-70 torch that visits 39 placements has lit
nothing, because nothing persists but the finding. Ordering them would hold `night1` — the
sector's *first wide accessible challenge* (`docs/13` §5 item 3) — to a tolerance derived from a
different quantity. [corrected]

Replaced by R2/R4: monotonicity **within** each adventure, plus the night family's own rising
demand (objects 1→3, radius 200→110). Across the row the demand accumulates in the MOVEMENT —
broad wiping, then finer wiping, then intentional search — which is `docs/13` §2's own three
steps, and it is the same correction paso C made when it dropped its proposal's cross-adventure
corridor rule (§5.1 there).

### 5.5 `docs/13` §6 / `docs/14` §14 — the nine obligations, for all twelve

| obligation | how it is expressed |
|---|---|
| Zona de inicio | `standingHintFor` already answers *"Empezá donde quieras"* (`LevelPlay.tsx:546`); no start dot, no arrow, no goal — all three already suppressed for `kind: 'free'` |
| Trayectoria esperada | **deliberately absent** — replaced by `reveal.cols/rows` + `minAccuracy`, the field's reason to exist |
| Tolerancia | `reveal.radius` and the tile size; generous then tightening, R2/R3 |
| Respuesta al contacto | the tile vanishes (erase) or brightens (light) under the finger, at 30 Hz; `feedback.haptics` on |
| Condiciones de error | **none, by construction** — no corridor, no wall, `resetOnContact` already forced off (`LevelPlay.tsx:772`) |
| Reinicio | the existing retry path; `EMPTY_REVEAL` is the whole reset |
| Animación de ayuda | **no `demo` on any of the twelve** (R6) — `demo` animates a route and there is none; the mechanic demonstrates itself on the first touch |
| Criterio de finalización | `revealScore ≥ rules.minAccuracy` (§4.3) — one number, one pillar |
| Transición narrativa | `AdventureIntro` on `glass1`/`sand1`/`night1` via the shipped `resolveEnterAction`; `AdventureClosing` on `sand4`/`night4` (§6) |

---

## 6. The opening, the transformation, and the closing screen

### 6.1 Decision: `Adventure`'s subject is a TYPE-LEVEL union, so an animal-less adventure cannot be authored wrong

```ts
// client/src/zoo/adventures.ts
export type AdventureId = 'duck' | 'sheep' | 'llama' | 'glass' | 'sand' | 'night'

/** An adventure recovers an animal, or it carries a picture of its own.
 *  Exactly one, enforced by the union rather than by a test: the entrance
 *  and the night sector recover NO animal (the erizo is paso H's), and
 *  `mapBubble` keys a sector's closing line on an animal standing in the
 *  zoo, so an animal-less adventure has to say what picture travels with its
 *  two lines. `npm run build` is what catches a row with neither, the same
 *  mechanism `FogPatch.rot: 0` uses. */
type AdventureSubject =
  | { animal: ZooAnimalId; icon?: undefined }
  | { animal?: undefined; icon: ArtImage }

export type Adventure = AdventureBase & AdventureSubject

/** Total by construction — the union above is what makes the `else` branch
 *  reachable only when `icon` is present. */
export function adventureIcon(a: Adventure): ArtImage {
  return a.animal ? ZOO_ANIMAL_ART[a.animal] : a.icon
}
```

Icons, all shipped, none commissioned: `glass` → `CARRIER_LENS_ART`, `sand` →
`ZOO_OCTOPUS_PRINT_ART` (*las huellas siguen por la arena* — the map's own onward symbol, and it
reads on sand), `night` → `SECTOR_ADVENTURE_ART.flashlight`.

`mapBubble` (`adventures.ts:97`) gains one clause — `a.animal !== undefined &&` — inside its
existing `.filter(...).at(-1)`. Its contract is otherwise untouched and its three shipped
scenarios re-run, plus one new: a sector holding an animal-less adventure still reports `ONWARD`.
`AdventureIntro.tsx:63` changes `ZOO_ANIMAL_ART[adventure.animal]` to
`adventureIcon(adventure)` — **one line, and it is the only line of `AdventureIntro` this change
touches.**

### 6.2 Decision: the closing BEAT is its own optional field, not `closing`

```ts
/** The once-per-adventure closing SCREEN (`docs/13` §5 item 6). Distinct
 *  from `closing`, which is the map bubble's one-line label and stays
 *  exactly what it is: a caption cannot carry a transformation. ABSENT = no
 *  closing screen, which is every shipped row -- so finishing the duck,
 *  sheep or llama adventure behaves byte-for-byte as it does today. */
closingBeat?: { line: string; art: ArtImage }
```

`sand`: `{ line: '¡Se fueron todos los animales! Agarrá la lupa: los vamos a buscar.',
art: CARRIER_LENS_ART }`.
`night`: `{ line: '¡Encontramos todo en la oscuridad! La linterna va a la mochila.',
art: SECTOR_ADVENTURE_ART.flashlight }`.
`glass`: **none** — the entrance is one caretaking stretch and its story closes at `sand4`, which
is the proposal's question 2 assumption, adopted.

### 6.3 Decision: `close` follows the `ExitAction` precedent, so `nextView` stays byte-unchanged

```ts
export type GameView = /* …unchanged… */ | { view: 'close'; levelId: string }
export type CloseAction = { type: 'close'; levelId: string }
export type NextAction = GameAction | ExitAction | CloseAction

/** The adventure whose LAST level this is, if it carries a closing beat.
 *  The mirror of `introLevel`, and pure for the same reason. */
export function closingLevel(levelId: string): Adventure | undefined

export function resolveCloseAction(
  finishedLevelId: string,
  _records: Readonly<Record<string, LevelRecord>>,
): CloseAction | null {
  return closingLevel(finishedLevelId) ? { type: 'close', levelId: finishedLevelId } : null
}

export function resolveNextAction(finishedLevelId: string, records: Records): NextAction {
  return resolveCloseAction(finishedLevelId, records)
      ?? (sectorOf(finishedLevelId) ? { type: 'exit' } : { type: 'next', levelId: nextLevelId(finishedLevelId) })
}
```

**Rationale.** `GameScreen.tsx:139-149` already argues this exact shape for `ExitAction`: adding a
case to `GameAction` would force `nextView`'s switch to grow a branch for a state the reducer is
deliberately kept ignorant of. `close` is the second member of the same family, and `onNext`'s
single discrimination point (`GameScreen.tsx:279-282`) grows one arm. `nextView` and its tests
are **untouched**, which is the contract `'intro'` and `'deduce'` already hold to.

`AdventureClosing.tsx`: the mirror of `AdventureIntro` — same `INTRO_CSS`-shaped stage, same
`CaptionedArt`, same bubble, props `{ adventure, onContinue }`, rendering `closingBeat.art` and
`closingBeat.line`. **Not a generalization of `AdventureIntro`**: two ~110-line components sharing
a stage read better than one with a mode flag, and `AdventureIntro` stays byte-identical but for
§6.1's one line. Its `onContinue` is `onExit` — the child lands on the zoo map, which is where
`resolveNextAction` was sending them anyway.

**Where the one-shot state lives: nowhere.** The closing is a function of the transition, so
replaying `sand4` replays it, exactly as re-entering `glass1` replays the intro. A persisted
"seen" key would mean a store version bump and a second migration in a change that already
carries one, to suppress a beat a child must deliberately re-enter. The proposal's decision 6,
adopted.

---

## 7. The zoo

### 7.1 The ladder, the fog and the backpack

| sector | `unlockedWhen` | `fog` | backpack |
|---|---|---|---|
| `entrada` | `alwaysOpen` — **now a rule** | authored, never rendered (gated by `!isOpen`, `ZooMap.tsx:231`) | **`lupa`** (`CARRIER_LENS_ART`) on `sand4` |
| `estanque` | `isFiled(records, 'sand4')` | **`closedFog(ESTANQUE_HIT, 2)` — new** | — (no art; an honest gap) |
| `montanas` | `isFiled(records, 'duck-trail4')` | unchanged | `gorro andino` — unchanged |
| `nocturna` | `isFiled(records, 'llama-peak4')` | unchanged | **`linterna`** (`SECTOR_ADVENTURE_ART.flashlight`) on `night4` |
| `arena`, `bosque` | `alwaysClosed` — unchanged | unchanged | — |
| `sendero` | scenery, no `hit` — unchanged | — | — |

**`alwaysOpen` survives as a helper and its JUSTIFICATION changes.** `sectors.ts:114-116`
promises *"Deleted in paso D, not a rule"*. That promise is discharged by rewriting the comment,
not by deleting a one-line function and inlining `() => true` twice: the entrance is open on a
fresh install **because there is nowhere else to start** (`docs/12` §1), which is a rule. The
estanque is the only row that moves off it.

**The estanque's fog art is derived, not chosen** **[derived]**, and reading art 0's dimensions
turned this into a real finding rather than a lookup. `ESTANQUE_HIT` is 280 × 200 →
`cols = round(280/130) = 2`, `rows = round(200/130) = 2`, cell **140 × 100**, cell aspect **1.40**.
All three silhouettes, from `assets.ts:208-212`:

| art | file | w × h | aspect | `max(cellH, cellW/aspect)` | aspect distance from 1.40 |
|---|---|---|---|---|---|
| 0 | `zoo-fog-1.png` | 495 × 155 | **3.194** | **100.0** ← smallest | 2.28 ← worst |
| 1 | `zoo-fog-2.png` | 343 × 479 | 0.716 | 195.5 | 1.96 |
| 2 | `zoo-fog-3.png` | 474 × 424 | 1.118 | 125.2 | **1.25** ← closest |

**The two candidate rules disagree, and the header's wording is the one that binds.**
`closedFog`'s header states the rule as *"pick the silhouette whose aspect is CLOSEST to the
cell's own `cellW / cellH`"*, which gives **art 2**. Minimising `max(cellH, cellW/aspect)` — the
quantity `size` is actually computed from — would give art 0, and it is **wrong**, because that
expression bounds the patch's HEIGHT and says nothing about its width. Art 0 at `size = 1.3 × 100
= 130` would be `130 × 3.194 = 415` units wide on a 140-unit cell **[derived]**: three times the
cell, which is the exact spill the header's own paragraph records having already happened once
(*"bosque … drew two patches ≈355 wide for a 300-unit sector, so its fog spanned ≈670 units and
spilled over the plaza"*), and which `FOG_BBOX_SLACK` in `sectors.test.ts` exists to catch.

**`closedFog(ESTANQUE_HIT, 2)`.** The open question is closed; nothing is deferred to apply.

**The pond closes on a fresh install**, which is the most visible behaviour change in the row and
is the reason row D exists. `sectors.test.ts`'s "five undeveloped sectors stay fogged for any
input" narrows to three (`arena`, `bosque`, `sendero`); `entrada` and `nocturna` leave it, and the
estanque joins the conditional set.

### 7.2 [corrected] `recentlyDiscovered` is derived by PREFERENCE, not replaced

The proposal's rule — *"the first open sector none of whose adventures has ever been attempted"* —
returns `null` for a child mid-way through the entrance, because `entrada` then has an attempt and
`estanque` is not yet open. Today the function never returns `null` while any open sector has
unfinished work, and `ZooMap` renders its bubble off it. [corrected]

```ts
/** The place the child has not gone yet, preferred over the place they have
 *  not finished. Derived, never persisted: `sectors.ts:441` proposed a
 *  `<sector>-seen` key and this change declines it -- a new persisted key
 *  means a store version bump and a second migration in a change that
 *  already carries one, and `attempts` (which the store already keeps)
 *  answers "recently discovered" the way a child means it. */
export function recentlyDiscovered(records: Records): ZooSector | null {
  const untouched = SECTORS.find(
    (s) => isOpen(s, records) && s.adventureIds.length > 0 &&
           s.adventureIds.every((id) => (records[id]?.attempts ?? 0) === 0))
  return untouched ?? /* today's rule, unchanged, as the fallback */ ...
}
```

Today's rule stays as the fallback, so every shipped `sectors.test.ts` row stays green and the
new preference is the only new behaviour. On a fresh install it points at `entrada`; on a
returning child's first visit after §8, it also points at `entrada` (the two seeded records carry
`attempts: 0`), which is exactly right.

---

## 8. The migration

### 8.1 [corrected] Two records, not twelve — and the returning child does NOT lose the opening

The proposal's question 4 frames a dilemma: *"An existing child cannot both keep their unlocks and
be shown the new opening: the migration that prevents demotion is the same write that marks the
entrance done."* **Read against the code, the dilemma dissolves**, and so does the proposal's
estimate of a 200-line migration. [corrected]

Three facts, all `file:line`:

1. `isUnlocked` is positional over the WHOLE catalog (`LevelProgressStore.ts:123-129`), so
   inserting ahead of an id demotes **that id's successor chain**, and nothing else. Only two
   successors exist: `f1-libre` (whose predecessor becomes `sand4`) and `f2-guirnalda` (whose
   predecessor moves from `llama-peak4` to `night4`).
2. The twelve inserted ids were never unlocked before, so displaying them as locked is not a
   demotion. **Seeding them would be seeding levels nobody has a claim to.**
3. The zoo map — the child's real route — never asks `isUnlocked`. It routes through
   `isOpen`/`nextAdventure` (`ZooMap.tsx:231,285`; `sectors.ts:411,421`), and `nextAdventure`
   returns `adventureIds.find(id => !isFiled(...))`, which for `entrada` is **`glass1`**.

So seeding `sand4` protects `f1-libre`'s chain **and** keeps the estanque open (which is the real
stake the proposal missed: without the migration a returning child **loses the pond**, because
`estanque.unlockedWhen` stops being `alwaysOpen`), while `nextAdventure` still sends that child
into `glass1` — **they see the opening anyway**. Question 4's alternative is refuted by evidence
rather than declined by preference.

```ts
// client/src/game/migrateEntrance.ts — the established copy-forward shape
export const ENTRANCE_UNLOCK_ID = 'sand4'   // f1-libre's new predecessor
export const NIGHT_UNLOCK_ID = 'night4'     // f2-guirnalda's new predecessor

export function migrateEntrance(
  records: Readonly<Record<string, LevelRecord>>,
): Record<string, LevelRecord> {
  const changed: Record<string, LevelRecord> = {}
  // `f1-libre` used to be LEVELS[0] and therefore UNCONDITIONALLY reachable
  // (`LevelProgressStore.ts:127`), so there is no predecessor approval count
  // to quote -- the condition being preserved is "the child has been here
  // before", which is "the store is not empty". A copy-forward of a ZERO
  // approval count would demote exactly the child this exists for, so the
  // seed carries an APPROVALS_TO_UNLOCK floor rather than a plain max.
  if (Object.keys(records).length > 0 && !records[ENTRANCE_UNLOCK_ID]) {
    changed[ENTRANCE_UNLOCK_ID] = seedFrom(records['f1-libre'])
  }
  // `f2-guirnalda`'s unlock DID have a condition, and it is quoted rather
  // than re-decided -- `migrateDuckCase.ts:54-59`'s own discipline.
  const source = records['llama-peak4']
  if (source && source.approvals >= APPROVALS_TO_UNLOCK && !records[NIGHT_UNLOCK_ID]) {
    changed[NIGHT_UNLOCK_ID] = seedFrom(source)
  }
  return changed
}
```

`seedFrom` is `migrateDuckCase.ts:38`'s policy verbatim — field-wise MAX on every forgiving field,
`attempts` summed against zero, `streakFail` not carried — with `approvals:
Math.max(source?.approvals ?? 0, APPROVALS_TO_UNLOCK)`. Registered in `openProgressStore.ts:32`'s
existing loop; order is irrelevant, the four migrations share no id.

**Costs, named.** Two records the child did not earn means **4 stars** (`starsFor` caps at 2 per
level, `stars.ts:17`) and, for a child who had already finished the mountains, the **linterna**
arriving before the night sector is played. Both were weighed against a returning child seeing the
pond fogged over and every phase-2 level reported locked, and both lose. `migrateEntrance.test.ts`
asserts idempotence (a second run returns `{}`), no-demotion (every previously-unlocked id stays
unlocked across the insertion, checked against the real `LEVELS`), that no source record is ever
mutated, and that a **fresh install writes nothing**.

---

## 9. The seeding flag grammar

```ts
// client/src/canvas/devMode.ts — one private parser, three public functions
function debugArg(search: string, prefix: string): string | null   // `?debug=<prefix>:<rest>`

/** `?debug=progreso:<id>,<id>,…` — DEV-GATED at the call site, exactly like
 *  `?nivel=mapa` and `shouldSeedRecoveredDuck`: it writes real persisted
 *  records. Generalizes one boolean per capture into one grammar. */
export function seededProgressIds(search: string): readonly string[]

/** `?debug=revelado:<pct>` — NOT dev-gated, for `isSectorDebug`'s own stated
 *  reason (`devMode.ts:11-19`): it paints render state, adds no control, no
 *  word and no route, and must work against the EXACT build being
 *  screenshotted. */
export function revealDebugFraction(search: string): number | null

/** `?debug=linterna:<x>,<y>` — same, and it exists because `scripts/shot.sh`
 *  cannot move a finger. */
export function lightDebugPoint(search: string): { x: number; y: number } | null
```

`?debug=revelado:<pct>` pre-clears **the top `round(pct × rows)` tile rows**, a deterministic
band that photographs as a half-swept pane rather than as a dither
(`debugClearedTiles(reveal, fraction)`, pure, in `revealGrid.ts`). `shouldSeedRecoveredDuck` and
`isSectorDebug` are **byte-identical**, so paso B's captures keep working. Flag values stay
Spanish to match their two shipped siblings; the functions parsing them are English.

---

## Data Flow

```
  catalog.ts  ──level.reveal──┐
                              ▼
  TraceCanvas.onFrame(points, drawing, timeMs)   ← ~30 Hz, the ONE sample
        │                     │
        │                     ├─ corridorTick ─ tone / haptics / contactTick   (unchanged)
        │                     ├─ clueTick                                      (unchanged)
        │                     └─ revealTick(prev, points, drawing, reveal, w)
        │                             │  monotone, same ref when nothing flips
        │                             ▼
        │                        RevealState { cleared, lit, point, seen }
        │                             │
        │                        revealTiles ──▶ TraceReveal ──▶ RevealLayer
        │                                          │ fill = backdrop.tile      ├─ <image> objects
        │                                          │                           └─ N × <rect>
        ▼
  onRelease ─▶ evaluateLevel ─▶ revealScore(strokes, config, w) ─▶ accuracy ≥ rules.minAccuracy
                                     └─ no `reveal` ─▶ coverageScore(strokes, w)   (f1-libre)

  ADVENTURES[glass|sand|night] ─┬─ introLevel ─▶ resolveEnterAction ─▶ {view:'intro'}
                                ├─ closingLevel ─▶ resolveCloseAction ─▶ {type:'close'}
                                │                       └─▶ AdventureClosing ─▶ onExit
                                └─ adventureIcon ─▶ AdventureIntro / AdventureClosing
  ADVENTURE_BACKDROP[glass|sand|night] ──backdropFor──▶ LevelPlay ──▶ tile / ink
  SECTORS.entrada(alwaysOpen) ─ sand4 filed ─▶ estanque opens ─▶ lupa
  SECTORS.nocturna(llama-peak4) ─ night4 filed ─▶ linterna
  migrateEntrance ─▶ { sand4, night4 } ─▶ openProgressStore
```

## File Changes

| File | Action | Description |
|---|---|---|
| `client/src/levels/revealGrid.ts` (+`.test.ts`) | Create | `clearedTiles`, `revealTick`, `revealTiles`, `revealScore`, `lightOpacity`, `debugClearedTiles`, `EMPTY_REVEAL` |
| `client/src/levels/types.ts` | Modify | `RevealConfig` union, `RevealObject`, `reveal?` |
| `client/src/levels/coverage.ts` (+`.test.ts`) | Modify | `cols`/`rows` parameters; body delegates to `clearedTiles` |
| `client/src/levels/catalog.ts` | Modify | twelve entries, inserted (8 before `f1-libre`, 4 before `f2-guirnalda`) |
| `client/src/levels/catalog.test.ts` | Modify | `EXPECTED_IDS` ×12, the amended free rule (§5.1), R1–R8 |
| `client/src/game/evaluateLevel.ts` | Modify | one line: `coverageScore` → `revealScore` |
| `client/src/canvas/RevealLayer.tsx` (+`.test.tsx`) | Create | N `<rect>`s + hidden-object `<image>`s, zero `url(#` |
| `client/src/canvas/TraceCanvas.tsx` (+`.test.tsx`) | Modify | `TraceReveal`/`TraceRevealTile`, one layer after the backdrop |
| `client/src/canvas/devMode.ts` (+`.test.ts`) | Modify | `debugArg`, three flags; two shipped functions byte-identical |
| `client/src/screen/LevelPlay.tsx` (+`.test.tsx`) | Modify | `revealState`, the `onFrame` fold, the `reveal` memo, `ink` passthrough |
| `client/src/screen/AdventureClosing.tsx` (+`.test.tsx`) | Create | the transformation beat |
| `client/src/screen/AdventureIntro.tsx` | Modify | **one line** — `adventureIcon(adventure)` |
| `client/src/screen/GameScreen.tsx` (+`.test.ts`) | Modify | `'close'` view, `CloseAction`, `resolveCloseAction`; `nextView` untouched |
| `client/src/zoo/adventures.ts` (+`.test.ts`) | Modify | 3 rows, `AdventureSubject` union, `icon`, `closingBeat`, `adventureIcon`, `closingLevel`, `mapBubble` clause |
| `client/src/zoo/sectors.ts` (+`.test.ts`) | Modify | the ladder, estanque fog, `alwaysOpen`'s rule, `recentlyDiscovered` |
| `client/src/zoo/backdrops.ts` (+`.test.ts`) | Modify | 3 rows, `tile`/`ink`/`inkDim`, 4 tokens, 3 red rows |
| `client/src/zoo/backpack.ts` (+`.test.ts`) | Modify | lupa, linterna |
| `client/src/game/migrateEntrance.ts` (+`.test.ts`) | Create | two seeded records (§8) |
| `client/src/game/openProgressStore.ts` | Modify | one entry in the existing loop |
| `client/src/detective/assets.ts` | Modify | `SECTOR_BACKGROUND_ART.night`, `SECTOR_ADVENTURE_ART.chest/stone/leaf` |
| `client/src/detective/artManifest.test.ts` | Modify | three backdrops + three cutouts enter the parity comparison |
| `scripts/art/build_art.py` + `manifest.json` | Modify | `nightfall()`, the optional 6th element, 3 `corridor_rows`, 3 `SINGLES` rows |
| `docs/13_AVENTURAS_POR_ANIMAL.md` | Modify | §4 status row for *Exploración libre* |
| `cases.ts`, `Deduction.tsx`, `clues.ts`, `world.ts`, `paths.ts` | **Unchanged** | `docs/13` §4 decision 1; no routed level moves |
| `TraceCanvas.test.tsx:145,163` and the five sibling guards | **Unchanged, and must stay green** | the `url(#` ban is the point |

## Testing Strategy

| Layer | What | Approach |
|---|---|---|
| Unit (pure) | `clearedTiles` | index convention `row*cols+col`; the containing tile always clears; a tile whose centre is `radius + ε` away does not; **`radius: 0` reproduces `coverageScore`'s visited set exactly** |
| Unit (pure) | `revealTick` | incremental ≡ whole-stroke for every window size 1..200; no segment crosses a pen lift; same reference when nothing flips; `REVEAL_EPSILON` suppresses an idle re-render |
| Unit (pure) | `lightOpacity` | exactly five values; 0 at the centre, 1 at and beyond the rim; monotone |
| Unit (pure) | the object latch | a lit object stays lit after the light leaves; latch ≡ the whole-stroke `revealScore` |
| Unit (pure) | `coverageScore` | **`coverage.test.ts` untouched and green** (the bit-identity proof), plus `(s,1000) === (s,1000,12,8)` |
| Unit (data) | the twelve | R1–R8 of §5.3, over the authored literals restated in the test |
| Unit (data) | the luma law | all six backdrops; the three new ink rows; **three falsifiability rows that must go RED**: `SHEET_PAPER` vs the aquarium, `SHEET_PAPER` vs the sand, `INK_COLOR` vs `NIGHT_VEIL` |
| Unit (data) | the night window | `77 ≤ luma(night.brightest) ≤ 110`, and `luma(brightest)` within ±3 of `NIGHT_PEAK = 96` — the swap-day gate |
| Unit (pure) | `corridorRows` | `viewBoxToImage(0,0)` and `(0,600)` land inside `(51, 973)` for the three new rows; **the three shipped rows unchanged** |
| Unit (pure) | `backdropFor` | the twelve → their own row; **`f2-agua*` and `trail1..4` still `undefined`** (paso B's regression guard, re-run) |
| Unit (pure) | `adventureIcon` / `mapBubble` | animal rows → the animal; icon rows → the icon; a sector with an animal-less adventure still reports `ONWARD`; the three shipped scenarios re-run |
| Unit (pure) | `closingLevel` / `resolveCloseAction` | fires on `sand4` and `night4` only; `duck-trail4`/`sheep-hill4`/`llama-peak4` return `null` (the shipped-behaviour guard) |
| Unit (pure) | `sectors` | entrada open on `{}`; estanque closed on `{}` and open once `sand4` is filed; nocturna on `llama-peak4`; `recentlyDiscovered` prefers the untouched sector and falls back to today's answer |
| Unit (pure) | `backpack` | lupa absent before `sand4`, linterna absent before `night4` |
| Unit (pure) | `migrateEntrance` | idempotent; fresh install writes nothing; no previously-unlocked id becomes locked, checked against the real `LEVELS`; no source record mutated |
| Unit (pure) | `devMode` | the three grammars, malformed input, and **`?debug=pato-recuperado` / `?debug=sectores` byte-identical** |
| Component | `RevealLayer` | `<rect` count is exactly `N − cleared.size`; five opacity strings and no sixth; objects render under the tiles; **zero `url(#`** |
| Component | `TraceCanvas` | with `reveal`: the layer sits between the backdrop and the guides. **Without `reveal`: markup byte-identical to today** for a lagoon backdrop, a `ground` maze and a plain maze |
| Component | `LevelPlay` | `glass3` → no title, no hint, no rotate copy, no result block (the `drawnPlace` inheritance); `night2` → `inkColor` is `TORCH_CHALK`; **`duck-trail2` and `f2-agua2` byte-identical to today** |
| Component | `AdventureClosing` | renders `closingBeat.art` + `.line`; `auditCaptions` clean |
| Screenshot (human) | `scripts/shot.sh` → `capturas/` | non-negotiable, `docs/12` §4 — below |

**What only a capture can answer**: whether `GLASS_GRIME` over the tank reads as a dirty pane
rather than as a bug; whether `SAND_DRIFT` reads as sand at all once the law has forced it dark;
whether a 200-unit torch on a 1000-wide sheet reads as a torch or as a spotlight; whether five
opacity steps read as a falloff or as five rings; whether `night1` holds 30 Hz on a real tablet
(§1.6's falsifier); whether the transformation screen lands after `sand4` as a beat rather than as
an interruption. Required: each of the twelve levels covered and part-revealed; the night lit and
unlit; the entrance intro and the transformation closing; the map on a fresh install, after the
entrance, and fully unlocked; the backpack with two items; **one duck level and one llama level
proving they are unchanged**.

## Threat Matrix

N/A — no HTTP/shell routing, no subprocess, no VCS/PR automation, no executable-file
classification, no process-integration boundary. `scripts/art/build_art.py` is an existing offline
build script: this change adds one callable to a data table, three data tuples and three rows, and
adds no argument, no path input and no new caller. The rest is rendering, pure arithmetic, three
URL-query parsers over an explicit string argument, and one read/write of `localStorage` through
the shipped store.

## Migration / Rollout

§8's `migrateEntrance` — **two records**, copy-forward only, no key renamed, no store version
bumped. Every rollback lever the proposal names still works by construction: `git revert` restores
`main` with every child's progress intact (records on the twelve new ids become unreachable keys,
exactly as `f1-travesia`'s already are); restoring `alwaysOpen` on the estanque and
`alwaysClosed` on entrada/nocturna and emptying their `adventureIds` hides the row while leaving
the twelve reachable by `?nivel=`; dropping the three `ADVENTURE_BACKDROP` rows removes the veil
in one edit; dropping `reveal` from the twelve configs degrades them to plain `f1-libre`-style
free levels rather than crashing, because the field is additive and absent everywhere else;
removing the `'close'` variant restores the pre-paso-D exit in one edit, `nextView` never having
been touched; deleting `nightfall` and its `PASSTHROUGHS` row is the same one-row edit the
authored-art swap uses.

## Review-budget forecast

The proposal forecast **~2 620** authored lines. This design **removes** ~140 (the migration
shrinks from twelve seeded ids to two, §8.1; `coverage.ts` delegates instead of growing a second
body, §1.3; `AdventureIntro` changes one line, §6.1) and **adds** ~150 (the `AdventureSubject`
union and `adventureIcon`, the `ink`/`inkDim` fields and their rows, R5/R7/R8, the three
falsifiability rows, the night-window gate). **Revised: ~2 630.** `sdd-tasks` owns the binding
forecast.

**Decision needed before apply: Yes. Chained PRs recommended: Yes. 800-line budget risk: High.**
`size:exception` was accepted at session start (`delivery_strategy: exception-ok`).

### The seam — six slices, each green on its own, in dependency order

| slice | contents | ~lines | why it is green alone |
|---|---|---|---|
| **D1** Art | `nightfall()` + the 6th `PASSTHROUGHS` element + 3 `corridor_rows`; 3 `SINGLES` rows + `AUTHORED_SOURCE_SIZES`; `SECTOR_BACKGROUND_ART.night`, `.chest/.stone/.leaf`; the four paint tokens; 3 `ADVENTURE_BACKDROP` rows; `backdrops.test.ts` + `artManifest.test.ts` | 350 | `ADVENTURE_BACKDROP` is `Partial<Record<AdventureId,…>>`, so a row may exist before its `ADVENTURES` row; `backdropFor` returns `undefined` and nothing renders |
| **D2** Mechanic | `revealGrid.ts` + test; `RevealConfig` in `types.ts`; `coverage.ts` delegation; the one `evaluateLevel` line | 400 | nothing authors `reveal` yet; `coverage.test.ts` is the bit-identity proof |
| **D3** Render | `RevealLayer.tsx` + test; `TraceReveal` and the layer in `TraceCanvas`; the `LevelPlay` fold, memo and `ink` passthrough | 420 | exercised through synthetic props; every shipped level byte-identical |
| **D4** Levels | the twelve entries; `EXPECTED_IDS`; the amended free rule; R1–R8; `migrateEntrance.ts` + test + the `openProgressStore` line | 600 | the insertion and its migration must land in the same commit (`migrateDuckCase.ts:9-11`'s own rule) |
| **D5** Zoo | `adventures.ts` (3 rows, the union, `icon`, `closingBeat`, `adventureIcon`, `closingLevel`, `mapBubble`); `sectors.ts` (ladder, fog, `recentlyDiscovered`); `backpack.ts`; `AdventureIntro`'s one line | 420 | the backdrops resolve for the first time here, which is where the captures start paying |
| **D6** Narrative | `AdventureClosing.tsx` + test; `GameScreen`'s `close` route, `CloseAction`, `resolveCloseAction` + tests; `devMode.ts` grammar + test; `docs/13` §4 | 440 | `nextView` untouched, so the shipped routing suite stays green |

**D1 must not merge before its capture is read.** The *numeric* risk is closed — §2.3 is measured
and §3.2's peak is guaranteed by construction — but D1 remains the only slice that can be wrong in
a way the suite cannot see: whether a luma-109 veil over a luma-212 tank reads as a pane to clean
is a question no assertion can answer.

Each slice is one work unit: one deliverable behaviour, its tests in the same commit, a
conventional-commit subject naming the outcome, and a rollback boundary that removes nothing
else. Evidence each slice must record at apply time:

| slice | commit subject | focused test command | rollback boundary |
|---|---|---|---|
| D1 | `feat(art): derive the night backdrop and measure the entrance bands` | `npm test -- zoo/backdrops detective/artManifest` | delete `nightfall` + its `PASSTHROUGHS` row + the three `ADVENTURE_BACKDROP` rows |
| D2 | `feat(levels): add the reveal grid mechanic` | `npm test -- levels/revealGrid levels/coverage game/evaluateLevel` | delete `revealGrid.ts`; revert `coverage.ts` to its inline body; revert one `evaluateLevel` line |
| D3 | `feat(canvas): draw the reveal veil as plain rects` | `npm test -- canvas/RevealLayer canvas/TraceCanvas screen/LevelPlay` | delete `RevealLayer.tsx`; drop the `reveal` prop and the `LevelPlay` memo/fold |
| D4 | `feat(levels): add the entrance and night levels` | `npm test -- levels/catalog game/migrateEntrance` | remove the twelve entries + `EXPECTED_IDS` rows; delete `migrateEntrance.ts` and its loop entry |
| D5 | `feat(zoo): open the entrance and the night sector` | `npm test -- zoo/ screen/AdventureIntro` | restore `alwaysOpen` on the estanque, `alwaysClosed` on entrada/nocturna, empty their `adventureIds`, empty the two backpack rows |
| D6 | `feat(screen): give the transformation its own screen` | `npm test -- screen/AdventureClosing screen/GameScreen canvas/devMode` | remove the `'close'` variant, `CloseAction` and `resolveCloseAction`; `nextView` was never touched |

Runtime-harness evidence: **N/A for every slice at the unit level** (node, no jsdom — this repo
has no runtime harness), which is exactly why §1.6's frame budget and §2.3's measurement are
routed to the capture pass instead of being claimed as verified.

## Open Questions

- [x] **RESOLVED — all four proposal corrections are ratified** and recorded as A1–A4 in §0. They
      supersede the proposal; `sdd-tasks` and the archive read §0, not the superseded text.
- [x] **RESOLVED — `brightest` is measured** (§2.3). `#c7d9e0` (212) for the aquarium and
      `#dad0c0` (209) for the sand, over rows `(51, 973)`. The prediction `B ≥ 164` held with 48
      and 45 luma to spare; both tile literals stay at 109, **no fallback is taken and the
      proposal's scope lever is not exercised**. The light branch is now *measurably* empty
      (`B ≤ 197` was required; 212 and 209 were returned), so §2.2's argument is a fact rather
      than a forecast. Residual: the `ADVENTURE_BACKDROP` literals are still **[to copy]** from
      the rebuilt `manifest.json`, which for these two rows is a formality —
      `emit_opaque_canvas` passes the source through unchanged.
- [x] **RESOLVED — `nightfall`'s source is measured** (§3.2). `SRC_MAX = 245` at `#f5f5f5`,
      chroma 0, so the normalized peak is attained exactly and the derived `brightest` is luma
      96 ± rounding, inside the `[77, 110]` swap-day gate. The derived `quiet` lands at luma 67.
      Both hexes **[to copy]** from the manifest.
- [x] **RESOLVED — the three objects take no `AUTHORED_SOURCE_SIZES` entry** (§3.4). `cofre.png`
      and `piedra.png` are landscape (≈ 1.10) and cannot be 1024²; `hoja.png` is near-square and
      one `png.py` call may add an entry for it alone, additively. A **new flag** replaces the
      old question: two of the three may carry OPAQUE margins (`piedra.png` renders a
      transparency checkerboard, the other two flat black), which is the `oveja.png` defect
      class — verify alpha before wiring.
- [x] **RESOLVED — the estanque's fog is `closedFog(ESTANQUE_HIT, 2)`** (§7.1). Reading
      `ZOO_FOG_ART[0]` (495 × 155, aspect 3.194) showed the two candidate selection rules
      disagree; the header's closest-aspect wording binds, because minimising
      `max(cellH, cellW/aspect)` would pick a patch 415 units wide for a 140-unit cell and
      reintroduce the spill `FOG_BBOX_SLACK` exists to catch.
- [ ] **Frame rate on a real tablet is the one thing this harness cannot answer** (§1.6). The
      budget is `≤ 64 changed tiles per sample` and every authored level clears it; the falsifier
      is `night1` sustaining ≤ 33 ms. The lever, if it fails, is authored data.
- [ ] **A dark "fogged" glass and a dark "swept" sand are the row's biggest aesthetic bet**
      (§2.2). The law forces them and the alternative would be invisible, but only a capture can
      say whether a child reads `GLASS_GRIME` as a pane to clean.
- [ ] Nothing else is blocking. Every other decision above is settled.

---

### Accepted deviation

This document exceeds the skill's 800-word cap — the same deviation
`archive/2026-09-13-sheep-and-llama-peaks/design.md:738-746`,
`archive/2026-09-13-duck-undulations-and-sector-backdrop/design.md:908-916` and
`archive/2026-09-12-zoo-map-home/design.md:987-995` each recorded. `openspec/config.yaml` requires
every architecture decision to carry its rationale; this change carries nineteen, four of which
correct the proposal, one of which (§2.2) records a colour window with no light branch at all,
and one of which (§8.1) shrinks a 200-line migration to two records by reading three call sites.
