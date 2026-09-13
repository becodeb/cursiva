# Design: Snakes in the sand — dragging objects, and the art as the corridor

Binding input: `proposal.md`. Its eight decisions are the starting point; **seven are corrected
here with the arithmetic or the `file:line` that forced the correction** (§0). Every `file:line`
was re-verified against the working tree on `main`.

Numbers are marked **[measured]** (`scripts/art/png.py` against the real sources, run by the
orchestrator this session, luma-601), **[derived]** (closed-form arithmetic from the shipped code,
the shipped hex literals, `viewBoxToImage` or `placeArt`), **[read]** (read off the shipped
`assets.ts` / a source image — evidence, not a measurement), **[corrected]** (the proposal's
figure or claim was wrong and the corrected one is used everywhere below), or **[to copy]** (a
value that exists only after `build_art.py` runs and must be hand-copied from the rebuilt
`manifest.json` at apply time).

**How §3's geometry was obtained.** This design phase had no shell, so §3 is written as a
CONSTRAINT SET with one worked instantiation, and every level literal is pinned at the safe end of
its own window so the pending sampling can only *widen* a margin, never close one — paso C §2.1's
and paso D §2.2's discipline. The three quantities the sampling still owes (`thickness`,
`residual`, `traceTo`) each carry a stated prediction and a named lever if it fails.

---

## 0. Ratified amendments to the proposal

These supersede the proposal on these seven points. `sdd-tasks`, `sdd-apply` and the archive read
this contract, not the superseded text.

| # | § | What it corrects |
|---|---|---|
| **A1** | §4 | **The proposal's migration claim is CORRECT and is ratified.** Verified rather than inherited: `isUnlocked`'s only surviving consumer is `LevelMap.tsx:81` (grep over `client/src` returns that one call site plus tests and four migration headers), `snake1..4` append after `night4`, and `arena.unlockedWhen` moves from `alwaysClosed` to a real rule, which only ever WIDENS access. **No migration. `migrateEntrance.ts` byte-identical.** |
| **A2** | §4 | **`corridorTick` only walks `paths[0]`, so a three-path level's live wall feedback is wrong on two of its three snakes.** `LevelPlay.tsx:979` passes `target.polyline`, which `buildLevel.ts:181` takes from `paths[0]` alone — and `LevelPlay.tsx:439-442` already records the gap in prose (*"A future multi-path level … would need `corridorTick` extended to search every path"*). Without §4 the child tracing snake 2 reads as permanently OUTSIDE: no tone, a dimmed line, a haptic pulse at every crest. `docs/13` §6's *"respuesta visual al contacto"* is unmet. The proposal never names this. |
| **A3** | §6 | **`enforceOrder` must be `true` on ALL FOUR, not `false` on `snake1`.** `evaluateLevel.ts:141` scores accuracy as nearest-neighbour distance to the ideal cloud (`score.ts:43`), and the cloud is the UNION of the three bands — so a child who traces only the small snake scores ~100 and is approved. `checkCheckpointOrder` (`enforceOrder`) is the ONLY thing that requires all three to be traced. The proposal's `false` on `snake1` ships a level completable in one third of the work. |
| **A4** | §5 | **There is no `useDragInput`, and `useTraceInput` is byte-identical anyway.** The proposal's premise — *"`useTraceInput` allows exactly one stroke"* — is false: `multiStroke` shipped (`useTraceInput.ts:104,177`) and `LevelPlay.tsx:1323` passes it unconditionally on every level. A second pointer-capture hook on the same `<svg>` would be a second owner of `setPointerCapture`, which is the one thing the shipped hook's header forbids. The arrange gesture rides the SHIPPED hook and the SHIPPED `onFrame` sample; what changes is one structural boolean on the canvas (`inkHidden`) and one early return in `onRelease`. |
| **A5** | §5 | **`demo` on `snake1` is kept and it demonstrates all three snakes, not one.** `LevelPlay.tsx:693-705` builds one `DrawDemo` per entry of `target.paths`, `delay: idx * DEMO_STEP_S` — *"One demonstration per sub-path, played in sequence"*. So the demo shows tail→head on the small one, then the medium, then the large: it is a demonstration of the SERIATION ORDER as well as of the wave, which is exactly what `docs/13` §5 item 2 asks for when the movement is new. |
| **A6** | §2 | **The sand needs a channel after all — a DARK one — and it is what makes the art corridor legible rather than an exemption.** The proposal's *"the sand needs no channel painted under the snakes"* is right about luma and wrong about mechanism: with no channel the shipped `TraceCanvas.tsx:1046` strokes `SHEET_PAPER` (252) over a 209.2 backdrop, red by 42.8 — the row cannot simply omit the field. §2.3 turns the channel into the **hollow the snake lies in**: the same shipped stroke, at the same corridor width, in a dark sand-shadow, covered by the animal once the animal is home. One shipped mechanism, no exemption, and the drop target of §5 comes free. |
| **A7** | §5 | **The four levels are not four re-scalings of one sheet.** The proposal's family invariant (*"traced arc length non-decreasing"*) cannot hold once `docs/13` §2 step 3 (*orientación vertical u oblicua*) is honoured: three OBLIQUE snakes do not fit the sheet at any scale that also clears the phase-1 span guard (§3.5's arithmetic), and three VERTICAL ones only fit at 0.72 scale, which shortens the arc. Replaced by §6.2's R1–R7. |

Two proposal decisions are adopted **verbatim and unchanged**: decision 7 (`ZooAnimalId` is widened
to carry `'vibora'`) and decision 6's "no `closingBeat`" — and the latter now has a structural
reason as well as a narrative one (§7.2).

## Technical Approach

Nothing in the scoring model's *shape*, the progress store, the case machinery, the `GameView`
reducer, `useTraceInput` or `evaluateLevel` changes. The change is one measurement, one generator,
one placement derivation, one pure fold, one canvas layer, four level literals, three registry
rows and one widened wall check:

1. `scripts/art/build_art.py` — `sample_spine()`, four manifest fields on the three snake cutouts,
   one `SINGLES` row for the cart. **No new pixels.**
2. `levels/paths.ts` — `spineWave()`, the half-arch sibling of `waveVaried`, fed by the MEASURED
   fit. Emits `M`/`C` only.
3. `levels/artCorridor.ts` — the hand-copied `DRAWN_SPINE` table and **one** placement function.
4. `levels/buildLevel.ts` — `LevelTarget` gains `routes` and `artCorridor`, both derived AFTER
   `layOutPaths` and therefore through the same `tx` the paths took.
5. `screen/corridorTrack.ts` — `multiCorridorTick`, delegating to the untouched `corridorTick`.
6. `levels/arrange.ts` — the arrange fold. Pure, no React, no DOM.
7. `canvas/ArtCorridorLayer.tsx` + `canvas/TraceCanvas.tsx` — N plain `<image>`s. No `url(#…)`.
8. `screen/LevelPlay.tsx` — the arrange gate on the existing `onFrame` sample; two guide booleans.
9. `levels/catalog.ts` + `zoo/*` + `detective/assets.ts` — four levels, one adventure, one sector,
   one animal, one backpack item.

Governing constraints, unchanged: vitest on the **node** environment, no jsdom, no
testing-library; every decision a **named exported pure function** and each component renders only
what one of them returned; `npm run build` = `tsc --noEmit && vite build` with `noUnusedLocals`,
`noUnusedParameters`, `verbatimModuleSyntax`. No new dependency, no new persisted key, no store
version bump, **no new art commissioned**, and **no `getImageData`, no `<canvas>`, no alpha
sampling anywhere in the diff**.

`useTraceInput.ts`, `migrateEntrance.ts`, `cases.ts`, `Deduction.tsx`, `AdventureIntro.tsx`,
`AdventureClosing.tsx`, `revealGrid.ts`, `coverage.ts`, `evaluateLevel.ts` and every shipped level
are byte-identical to `main`.

---

## 1. The art corridor

### 1.1 [corrected] The centreline is FITTED to the drawing, not authored beside it

The proposal's decision 2 authors a sinusoid in `paths.ts` and then measures how far the drawn
spine strays from it, naming the drift *"the worst failure this change can ship"*. **A design that
can name its own worst failure should remove it, not budget for it.** [corrected]

`build_art.py` samples each cutout's spine — the vertical midpoint of the opaque body, column by
column — and then **fits it exactly at three points per half-arch**: the two zero crossings of
`spine − mid` and the extremum between them. That is the same cubic `alternatingArches` already
emits (`paths.ts:88-109`), whose `y(t) = mid − 3·off·t(1−t)` with `off = 4A/3` attains exactly
`mid ∓ A` at `t = ½` and exactly `mid` at `t = 0, 1` **[derived]**. So the fit needs no solver, no
numpy, and no least squares — three interpolation conditions per half, closed form.

What is emitted is therefore not a point dump but the generator's own parameters, per half-arch,
plus **the residual**: the maximum `|Δy|` between the measured spine and the reconstructed cubics,
in shipped pixels. The residual is the number the whole coincidence argument rests on, and it is
**measured at build time rather than predicted in prose**.

```python
# scripts/art/build_art.py -- the sibling of `sample_corridor_band`, reached through an
# optional 6th element on a `SINGLES` row so only the three snakes pay for it.
def sample_spine(img) -> dict:
    """The drawn body's centreline, as `spineWave`'s own parameters.

    `mid`      the fitted centreline's y, as a fraction of the cutout's height
    `halves`   [[width, rise], ...] -- width as a fraction of the cutout's WIDTH,
               rise SIGNED as a fraction of its height (negative = up)
    `residual` max |measured spine - reconstructed cubic|, SHIPPED px. The number
               `catalog.test.ts` turns into a viewBox tolerance (design.md 3.2 C1).
    `thickness`median opaque-column run length, as a fraction of the height
    `traceFrom`/`traceTo`  the TRACEABLE span, as fractions of the width.
               `traceTo` is the leftmost column whose spine pixel has luma >= 200
               -- the eye white -- minus one half-thickness. That is why the ink
               stops behind the head (design.md 2.2 red row R3): it is measured off
               the drawing, not chosen.
    Normalized to the cutout's own box so the numbers survive a re-export at a
    different pixel size -- the same reason `ArtImage` carries `w`/`h` rather than
    a scale. No alpha is sampled at RUNTIME; this is a build step, and nothing in
    the client ever reads a pixel.
    """
```

Three more fields land beside it: `bodyBrightest` / `bodyDarkest` (the luma extremes over the
opaque body, **excluding** `x > traceTo`) and `headWhite` (the head's brightest pixel). The head is
split out because it is the reason the span stops, not a colour the ink must clear.

**Alternatives considered.** Reading the PNG's alpha at runtime — `<canvas>`, `getImageData` —
would make the coincidence exact by construction and is **declined**, verbatim from the proposal:
there is no `getImageData` anywhere in this app, and raster sampling in a pure-geometry engine is
an architectural first that must earn its way in on its own merits. Dumping 65 spine points per
snake into TypeScript was also rejected: 195 hand-copied numbers is an asset, not retunable data,
and `paths.ts`'s opening rule (`paths.ts:1-6`) is that phase-1 geometry is *data, never a redrawn
asset*. The half-arch parameters are 10 / 14 / 18 numbers **[derived from the wave counts]** and
are a generator call.

### 1.2 `spineWave` — the half-arch sibling of `waveVaried`

```ts
// client/src/levels/paths.ts
/** One half-arch of a {@link spineWave}: a crest OR a trough. */
export interface SpineHalf {
  /** Horizontal span of this HALF period, viewBox units. */
  width: number
  /** Signed offset of this half's extremum from the centreline. NEGATIVE is
   *  UP (y grows downward), matching `alternatingArches`'s own sign. */
  rise: number
}

/**
 * `docs/13` §8 row E — a wave whose every HALF period carries its own width
 * and its own signed rise, because it is FITTED to a hand-drawn snake rather
 * than authored. The per-half sibling of {@link waveVaried}, which is itself
 * the per-cycle sibling of {@link wave}: same accumulate-`x` loop, same
 * `M`/`C`-only alphabet, same cubic. A `halves` list that alternates
 * `-arm, +arm` at a uniform width reproduces `waveVaried`'s `d` string BYTE
 * FOR BYTE, and `waveVaried`'s uniform list reproduces `wave`'s — the same
 * three-generation proof `garlandVaried` already carries (`paths.test.ts`).
 *
 * Consecutive halves of differing rise meet at a real kink (C1 continuity
 * holds only within a half). On a fitted spine that kink is the DRAWING's,
 * not the generator's, which is the whole point of fitting.
 */
export function spineWave(
  o: { x0?: number; y?: number; halves?: readonly SpineHalf[] } = {},
): string
```

It composes with `transformPath` unchanged (`M`/`C` only — `transformPath` throws by name on
anything else, `paths.ts:172-174`), which is what §3.4's vertical level needs.

### 1.3 ONE placement function, and the renderer is what calls it

```ts
// client/src/levels/artCorridor.ts -- pure, no React, no DOM
export interface DrawnSpine {
  readonly mid: number                       // fraction of h
  readonly halves: readonly (readonly [number, number])[]   // [widthFrac, riseFrac]
  readonly residual: number                  // shipped px
  readonly thickness: number                 // fraction of h
  readonly traceFrom: number
  readonly traceTo: number                   // fractions of w
}

/** Hand-copied from the rebuilt `manifest.json`, the way every literal in
 *  `assets.ts` and `backdrops.ts` already is, and guarded against drift by
 *  `artManifest.test.ts` -- which is the mechanism, not a promise. */
export const DRAWN_SPINE: Readonly<Record<'snakeSmall' | 'snakeMedium' | 'snakeLarge', DrawnSpine>>

/** An art corridor's piece, as a level authors it. */
export interface ArtCorridorPiece {
  art: ArtImage
  spine: keyof typeof DRAWN_SPINE
  /** The ONLY size knob: the cutout's rendered WIDTH in viewBox units. The
   *  height, the thickness, the amplitude and the corridor all follow from
   *  it, so seriation is one number per snake (design.md §3.1). */
  span: number
  /** Where the fitted centreline's midline sits, viewBox units. */
  at: { x: number; y: number }
  /** Degrees about the piece's own centre, applied to the `<image>` AND to
   *  the path, from this one field. Absent = 0. */
  rotate?: number
}

export interface ArtCorridorPlacement {
  readonly box: ArtBox                    // what the `<image>` is spread onto
  readonly rotate: number
  readonly pivot: { x: number; y: number }
  /** `spineWave`'s emitted `d`, already rotated and already translated. */
  readonly d: string
  /** The drawn body's median thickness, viewBox units. */
  readonly thickness: number
  /** The fit residual, viewBox units -- `residual * span / art.w`. */
  readonly residual: number
}

/** The `<image>` box and the path that runs down the middle of it, from ONE
 *  derivation. The renderer takes `box`/`rotate`/`pivot`; the level takes
 *  `d`; `catalog.test.ts` takes `thickness`/`residual`. A test that
 *  recomputed the placement independently would prove nothing about what is
 *  drawn -- so nothing recomputes it. */
export function placeArtCorridor(piece: ArtCorridorPiece, tx: number): ArtCorridorPlacement
```

### 1.4 The `tx` trap, and why the derivation moves into `buildLevelTarget`

`buildLevelTarget` runs `layOutPaths` (`buildLevel.ts:116-134`), which translates **every** path
by `tx = viewBoxWidth/2 − (minX + maxX)/2` so the union is centred on the sheet, and every derived
field then comes from the centred copy. If `ArtCorridorLayer` placed its `<image>`s from
`level.artCorridor` while the engine scored `target.paths`, **the picture and the corridor would
separate by exactly `tx` — and no test that only reads TypeScript could see it.** That, not the
wave shape, is the real drift this change can ship.

So `layOutPaths` returns `tx` as well, and `LevelTarget` grows the derivation:

```ts
// client/src/levels/types.ts
export interface LevelTarget {
  /* …unchanged… */
  /** Every path's own polyline and arc length. `routes[0]` IS `polyline`/
   *  `length` — the same objects, not copies (design.md §4). */
  routes: readonly RouteSegment[]
  /** One placement per `config.artCorridor` entry, derived AFTER the layout
   *  and therefore through the SAME `tx` the paths took. Absent when the
   *  level authors none, which is every level that predates this field. */
  artCorridor?: readonly ArtCorridorPlacement[]
}
```

`catalog.test.ts` then asserts the thing that matters, and it is not a tautology — the two sides
travel through different code (path string → `flattenPathD` → polyline, versus spine parameters →
`placeArtCorridor` → box):

> For every snake level and every piece `i`: the midline of `target.artCorridor[i].box`, walked
> across the box at `SPINE_PROBES = 33` fractions of its width and offset by
> `DRAWN_SPINE[…].mid`, lies within **0.5 viewBox units** of `flattenPathD(target.paths[i])`.

0.5 is `r2`'s own rounding (`paths.ts:49`, 2 decimals) with three orders of magnitude to spare
**[derived]**; anything larger is a real disagreement. A missing `tx`, a y-flip, a wrong pivot or a
scale error all show up at once. The family also asserts `|tx| < 0.5` on all four levels, so the
authored coordinates ARE the shipped ones and a reader can trust the catalog literals.

---

## 2. The paints — the 55-luma law restated for an ART corridor

### 2.1 The law in both directions, which is strictly stronger than the one it replaces

`docs/09:158` / `backdrops.test.ts:19`'s `MIN_BACKDROP_CONTRAST = 55` is asserted against a
backdrop's sampled `brightest`. For a painted corridor the legible thing is the channel; for an
ART corridor there are **two** legibility claims and the shipped registry can express neither:

```
the child's line ON the animal          |luma(ink) − luma(art extremes)| ≥ 55      (both extremes)
the animal ON the sand                  |luma(art extremes) − luma(B_sand)| ≥ 55   (both extremes)
```

Four assertions where the shipped loop makes one. Every number **[measured]** this session except
where marked:

| # | assertion | values | gap |
|---|---|---|---|
| L1 | ink vs the art's **darkest** (the author's spots, `#1a1a1a`) | 239 vs 26 | **213** ✓ |
| L2 | ink vs the art's **brightest body** (`#7b9b6e`, the small snake) | 239 vs 140.3 | **98.7** ✓ |
| L3 | the art's darkest vs the sand's `brightest` (`#dad0c0`) | 26 vs 209.2 | **183.2** ✓ |
| L4 | the art's brightest body vs the sand's `brightest` | 140.3 vs 209.2 | **68.9** ✓ |

L1 is the finding that drives the whole row: **the author's black spots sit ON the traced midline,
over 12.0 % / 30.4 % / 37.1 % of the spine columns** **[measured]**. `INK_COLOR` (`#1e293b`,
luma 40) against them separates **14** — short of the law by 41, over up to 37 % of the path the
child is being asked to follow. **A dark ink on a snake is undrawable.** `TORCH_CHALK`
(`#f2efe6`, 239) is the shipped answer (`backdrops.ts:79`) and clears both extremes. The snake row
declares `ink: TORCH_CHALK`, `inkDim: TORCH_CHALK_DIM` — **the exact two fields the night row
already ships**, a mechanism reused rather than invented.

```ts
// client/src/zoo/backdrops.ts — one new optional field
/** This adventure's corridor SURFACE is DRAWN ART rather than a painted band
 *  (`docs/13` §8 row E). The extremes are over the cutouts' BODIES; the
 *  head's eye white is carried separately because it is the reason the
 *  traced span stops behind the head (design.md §2.2 R3), not a colour the
 *  ink has to clear. ABSENT = this adventure paints its corridor, which is
 *  every row that predates this change. */
corridorArt?: { brightest: string; darkest: string; headWhite: string }
```

### 2.2 Four falsifiability rows, three of them new

Paso D's discipline (`backdrops.test.ts:63-83`): each asserts `< 55`, so none can pass alongside
L1–L4, and each encodes an ARGUMENT rather than only its conclusion.

| row | assertion | value | what it proves |
|---|---|---|---|
| **R1** *(new)* | `|luma(INK_COLOR) − luma(art.darkest)|` | **14** | a dark ink is undrawable on a snake. Without it `TORCH_CHALK` looks like a taste call. |
| **R2** *(shipped, `backdrops.test.ts:75`, UNTOUCHED)* | `|luma(SHEET_PAPER) − luma(sand.brightest)|` | **42.8** | no paper channel is admissible on sand — which is why §2.3's channel is dark, and it is already red in the suite. |
| **R3** *(new)* | `|luma(TORCH_CHALK) − luma(art.headWhite)|` | **6** | the eye whites reach the spine for 1–3 % of columns at the head end, so **the traceable span must end behind the head** — measured as `traceTo`, not chosen. |
| **R4** *(new)* | `|luma(TORCH_CHALK) − luma(SHEET_PAPER)|` | **13** | the chalk line is admissible ONLY because there is no paper under it. R2 and R4 together are why the snake row can never fall back to a default channel: each alone leaves one escape open. |

The existing `tile ?? channel ?? SHEET_PAPER` loop iterates two **hand-listed groups**
(`backdrops.test.ts:25-37`), not `Object.entries(ADVENTURE_BACKDROP)` — so a new row silently
escapes the law. **[corrected]** against the proposal's *"asserts, for every registry row"*. A
third group `ART_CORRIDOR_BACKDROPS = { snake }` joins the loop, **plus a completeness guard**:

> the union of the three groups' keys equals `Object.keys(ADVENTURE_BACKDROP)`.

That closes the hole for every future row, which is worth more than the row it was written for.

### 2.3 [corrected] The channel is the HOLLOW the snake lies in

The proposal says the sand needs *"no channel painted under the snakes"*. Luma-wise it is right;
mechanically it cannot be done — `TraceCanvas.tsx:1046` strokes `backdrop?.channel ?? SHEET_PAPER`
whenever a backdrop and a corridor are both present, so omitting the field ships R2's own red case
as a shipped visual. [corrected]

The field is kept and **re-read**: the channel is the scooped hollow in the sand that this snake
fits into. Same shipped stroke, same `target.corridorWidth`, round caps — a snake-shaped shadow.
`ArtCorridorLayer` draws the `<image>`s immediately after it, so:

- during the **arrange** phase the hollows are the visible drop targets, sized and shaped like the
  snake that belongs in each — which teaches the size comparison with the destination itself,
  proposal question 2's assumption, adopted and now free;
- during the **trace** the animal covers its own hollow exactly, because C1 (§3.2) makes
  `corridorWidth + 2·residual ≤ thickness`. One constraint, two consequences.

The admissible window is two-sided **[derived from the measurements]**: the paint must clear the
sand's `brightest` (209.2) by 55 *and* the darkest snake body (`#67895c`, 121.7) by 55, so
`luma ≤ min(154.2, 66.7) = 66.7`; and it must not read as the art's own contour (26), which puts a
soft floor at 40. **`SAND_HOLLOW = '#3b332b'`, luma 52.5** **[derived]** sits mid-window with 14.2
of headroom, and only the CEILING can move when the sampling lands — so, as with `CHANNEL_STONE`
and `GLASS_GRIME`, the literal is pinned low and the measurement can only widen it.

This is **the third time** the law has forced a dark paint over a light backdrop
(`docs/13` §4 decision 6, first bullet: *"toda superficie que tape un fondo claro tiene que ser
oscura"*). The aesthetic consequence is real and is the author's: a dark hollow may read as a hole
rather than as a scoop. Flagged as an open question, not hidden.

**Named exception.** `TORCH_CHALK_DIM` (152) clears the sand (209.2) by 57.2 but only the snake
body by 11.7–30.3. That is the drifting zone — the `(thickness − corridorWidth)/2` strip between
the corridor edge and the body edge, 6.9 units wide at `snake1` **[derived]** — where the line is
*meant* to be fading. `inkDim` carries no law today (`backdrops.test.ts:49` asserts `ink` only),
and this design does not invent one for it.

---

## 3. The geometry

### 3.1 What the art can and cannot say, measured

All three sources are 1024×1024 with an `alpha_bbox` **stable from threshold 8 to 200**
**[measured]** — so none carries the `oveja.png`/`piedra.png` speckled-alpha defect and none joins
`SPECKLED_ALPHA_SOURCES`. The drawn contour is already exactly `#1a1a1a`. Shipped cutouts are
exactly half the source bbox **[read, `assets.ts:282-284`]**:

| cutout | shipped `w × h` | half-arches (fitted) | thickness | amplitude (max) | body fill |
|---|---|---|---|---|---|
| `snakeSmall` | 480 × 98 | 3 | **48.0** | 23.6 | `#7b9b6e` (140.3) |
| `snakeMedium` | 492 × 114 | 4 | **40.0** | 25.95 | `#7b986f` (132.6) |
| `snakeLarge` | 500 × 95 | 6 | **46.0** | 17.16 | `#75976a` (121.0) |

All **[measured]**, by `build_art.py`'s own `sample_spine()` against the rebuilt `manifest.json`
(task 1.3), except `w × h` **[read]**. `amplitude` is the largest `|rise|` among the fitted `halves`.

**`thickness` corrected AGAIN, this time in Phase 8/task 8.7-8.8, after a screenshot caught the
consequence of the first definition.** It originally read here as the MEDIAN opaque-column run
length (58.0 / 50.0 / 53.0) — a reasonable-sounding "typical thickness", and what task 1.4 first
copied in. A capture of `snake1` showed `SAND_HOLLOW` visibly poking out past the small snake's own
body at a real trough of the wave (measured: local thickness 48 shipped px there, against a median
of 58) — the channel only has to be narrower than the THINNEST cross-section it actually crosses,
not the typical one. `sample_spine` now reports the MINIMUM opaque-column run length within the
traceable span instead, which is what the table above and every `thickness_vb` figure below already
reflect. This is why §3.4's worked C1 margins and the shipped `corridorWidth` ladder (§6.1/§6.2) are
both narrower than this document's own earlier draft — see task 8.8's own note for the corrected
values, which supersede every `corridorWidth`/C1 figure below that predates it.

**Corrected against this design's own earlier estimate.** The half-arch count is NOT 5/7/9 (that
number assumed the wave model covers the FULL cutout, tail tip to head tip). `sample_spine`'s fit
domain is `[traceFrom, traceTo]` — the traceable span — and only counts a REAL zero crossing of
`spine − mid` as a half-arch boundary. The columns between each tip and the wave's own first/last
real crossing are genuine drawn art (the `<image>` still shows them) but are not part of the
modelled centreline: forcing the wave's `move(x0, mid)` origin onto a tip column the real spine does
not cross `mid` at was the single largest source of fit error on the first measurement of this data
(residual as large as the amplitude itself, at both tips) — not fixable by splitting a half, since
the mismatch sits at the boundary itself, not inside a span a split can bisect. 3/4/6 is what
remains once those two tapering ends are excluded; nothing downstream asserts a specific half-arch
count.

**The finding the proposal misses: the shipped widths are 480 / 492 / 500 — equal within 4 %.**
`docs/referencias/viboras-el-animal-es-el-trazo.png` **[read]** draws three snakes of the SAME
length stacked down one sheet, heads (an ellipse) at the right, differing only in undulation. So
*"el chico las ordena de la más chica a la más grande"* (`docs/13` §2) **cannot be read off the art
at any uniform scale.** The scheme is a schematic of the TRACE; the sentence is the pedagogy.
Pedagogy wins: the three are placed at **different spans**, and the wave count rises with the size,
which is also what a child's intuition says — the big one wiggles more.

### 3.2 The constraint set

Everything below is one of six inequalities over authored literals. `catalog.test.ts` asserts all
six, so the numbers can be retuned without this document going stale.

| # | constraint | why |
|---|---|---|
| **C1** | `corridorWidth + 2·residual_vb ≤ thickness_min_vb` | the ink stays ON the body, and the hollow stays UNDER it (§2.3). The single load-bearing inequality. |
| **C2** | `waveCrestRadius(halfWidth_i, amplitude_i) > corridorWidth/2 − BAND_INSET` for every piece | `pushBand`'s fixed `±half` offset (`buildLevel.ts:75-80`) folds through itself on the concave side of a crest below this radius — `catalog.test.ts:497`'s rule, restated for a wave. |
| **C3** | min centreline separation `> 2 · corridorWidth` | §4's nearest-route selection is unambiguous only when the snakes are farther apart than the corridor is wide. |
| **C4** | min centreline separation `> 2 · 60` | checkpoint radii are clamped to `[35, 60]` (`buildLevel.ts:5-8`), so no point on one snake can sit inside another's zone and latch `wrongDirection` spuriously. |
| **C5** | `traceFrom ≥ thickness/2w` and `traceTo` from the eye white | the corridor stroke's round caps land ON the body at both ends — the head rule (§2.2 R3) restated symmetrically at the tail. |
| **C6** | every `<image>` box inside `[0, 600]`; every centreline union clears `catalog.test.ts:528` AND `:540` | the span guard *and* the "keeps every phase-1 route on the paper" guard, which the proposal never names. |

### 3.3 [corrected] What binds here is the AMPLITUDE, not the step

`docs/13` §4 decision 5's second bullet records paso C's correction: on a peak ridge *"lo que manda
es el paso entre picos, no la pendiente"*. **For a wave the answer is the other one**, and the
algebra says why. `waveCrestRadius(w, A) = w²/(8A)` (`paths.ts:398`). Over the three cutouts at the
spans of §3.4 **[derived]**:

| piece | halfWidth | amplitude | `waveCrestRadius` |
|---|---|---|---|
| small | 104.0 | 22.2 | **60.9** |
| medium | 91.4 | 42.0 | **24.9** ← binds |
| large | 84.4 | 32.3 | **27.6** |

The *large* snake has the smallest step (84.4) and is **not** the binding one. From large to
medium the step rises ×1.083 (`w²` ×1.17) while the amplitude rises ×1.30 — the amplitude wins by
11 %. On a fitted spine the amplitude is the DRAWING's and the step is the level's, so **the knob
is the span and the binding quantity is the one the author controls**. Worth carrying into rows F
and G.

**`peakRidgeCorridorLimit` is the wrong precedent here and is not used.** It charges each straight
leg its two rounded joins' consumption; a smooth wave has no straight legs and no joins. And the
repo already SHIPS a wave that violates C2 — `duck-trail3` at `waveCrestRadius(175, 205) = 18.7`
against a band of `80/2 − 6 = 34` **[derived from `catalog.test.ts:569` and the shipped
`corridorWidth`]** — unasserted, because C2 is asserted today only for the four garland/hills rows.
The snake family asserting it is therefore a **strengthening**, not a restatement, and C2's
margins below are real rather than inherited.

### 3.4 The worked instantiation

Per-snake spans are fixed across the family (they ARE the seriation); the level scale `s_L` and
the rotation are the per-level knobs.

| level | `s_L` | spans (small/medium/large) | rotation | `corridorWidth` | `minAccuracy` |
|---|---|---|---|---|---|
| `snake1` | 1.00 | 520 / 640 / 760 | 0° | **38** | 55 |
| `snake2` | 1.00 | 520 / 640 / 760 | 0° | **34** | 62 |
| `snake3` | 0.72 | 374 / 461 / 547 | **−90°** (vertical, heads up) | **30** | 70 |
| `snake4` | 1.00 | 520 / 640 / 760 | 0° | **28** | 76 |

**`corridorWidth` lowered AGAIN in Phase 8/task 8.8, from the 48/42/36/32 this table originally
shipped** — see §3.1's own note: once `thickness` was corrected to the traceable span's MINIMUM
cross-section, C1 failed for `snake1` and `snake3` at their original widths. `snake3` now sits
EXACTLY at `MIN_CORRIDOR` (30); `snake4` is authored BELOW that floor (28) on purpose, so R1's
strict-decrease still holds against `snake3`'s floor-pinned value even though the engine clamps
both to the identical effective 30 at runtime — already true of every pair at or under 56 (§6.2's
own finding, restated here at the family's tightest end rather than contradicted by it).

**`snake1`/`snake2`/`snake4` — three lying snakes.** Scales 1.0833 / 1.3008 / 1.52; art heights
106.2 / 148.3 / 144.4; art blocks at `[99.5, 205.7]`, `[240.0, 388.3]`, `[430.0, 574.4]`
**[corrected, §3.6 — a reviewer's screenshot round]**. Centreline extents `[127.1, 178.1]`,
`[299.2, 358.3]`, `[481.7, 533.4]`.

> **C6, `snake1`**: union `minY = 127.1 < 180` ✓, `maxY = 533.4 > 420` ✓, span `406.3 > 300` ✓;
> art within `[99.5, 574.4] ⊂ [0, 600]` ✓ **[derived, corrected]**.

> **C3/C4**: min centreline separation is now the constraint THIS layout was chosen against, not a
> comfortable margin — `≈ 122.8` (small–medium) and `≈ 124.0` (medium–large), against `2 · 38 = 76`
> and `2 · 60 = 120` **[measured, §3.6]**. Both still clear, but by only 2.8 / 4.0 units, not the
> 13.7-unit margin this table originally recorded — see §3.6 for why the margin shrank and what it
> was traded for.

> **C1 [measured, task 1.5, corrected again in task 8.8 against the MINIMUM-thickness figure —
> see §3.1].** The narrowest piece is `snakeMedium`, not `snakeSmall`, once the corrected thickness
> is used: `thickness_vb = 40.0 × (640/492) = 52.03`, `residual_vb = 3.36 × (640/492) = 4.37`.
> Margin `thickness_vb − corridorWidth − 2·residual_vb` = **5.29 / 9.29 / — / 13.29** for
> `snake1`/`snake2`/`snake4` (`snake3` below) — all positive, `snake1` tightest.

> **C2**: required band `cw/2 − 6` = 13 / 11 / — / 8 against the binding 24.9 **[derived]** —
> margins 11.9 / 13.9 / 16.9.

**`snake3` — three VERTICAL snakes.** `transformPath(d, { rotate: −90, pivot })` puts the tail at
the bottom and the head at the top; the `<image>` takes `transform="rotate(−90 cx cy)"` from the
same `placeArtCorridor` result, so the two cannot disagree. Lengths 374 / 461 / 547 occupy y, and
the drawn widths 76.5 / 106.8 / 104.0 occupy x — three columns totalling 287.3 of a 1000-unit
sheet **[derived]**, which is why vertical fits where oblique does not. C6 is cleared with enormous
margin (span ≈ 547). C1 at 0.72 **[measured, task 1.5, corrected in task 8.8]**: using
`snakeMedium`'s corrected thickness/residual scaled to `snake3`'s own span (461), margin
`thickness_vb − 30 − 2·residual_vb` = **1.16** — the tightest row in the family by a wide margin,
exactly as this section already predicted, and the row task 8.8's `corridorWidth` lever (pinning it
at `MIN_CORRIDOR`) was aimed at. 1.16 viewBox units is thin, but positive, and cannot be improved
further without either raising `s_L` (C6 has no room left to give — the vertical box already nearly
fills the 600-tall sheet) or breaking R1's strict ordering against `snake4`.

**Why `snake4` returns to horizontal.** `docs/13` §2's step 4 is *mayor variación de la
ondulación*, not a third orientation — the orientation lesson finished at `snake3`. `snake4` is
`snake1`'s sheet at the narrowest corridor and the highest bar.

**[corrected against this section's own earlier claim, at apply time].** This paragraph originally
said `traceFrom`/`traceTo` would open to their measured limits on `snake4` specifically, making its
arc length the longest of the three horizontal levels. That is not what shipped: `DRAWN_SPINE` is
ONE fixed measurement per spine (§1's own architecture), not a field `ArtCorridorPiece` exposes as a
per-level override, so `snake1`/`snake2`/`snake4` share IDENTICAL geometry — same spans, same `at`,
same `halves` — and therefore the SAME arc length. R7's own literal requirement (§6.2) is
non-decreasing, which equality satisfies; only `corridorWidth`/`minAccuracy` carry the family's
progression across these three, which is consistent with this document's own finding one section
down (§6.2: "every corridor at or below 56 scores at exactly the same tolerance ... the narrowing
is carried by `minAccuracy`, not `corridorWidth` alone") — restated here one level further than
originally written.

**Why three OBLIQUE snakes are not available, with the arithmetic** **[derived]**. A piece at angle
`a` occupies `h·cos a + w·sin a` vertically. At `s_L = 1` the three already use 398.9 of 600, so
`1920·sin a ≤ 141` after gaps and margins → `a ≤ 4.2°`, which is a nudge, not an orientation. At
`s_L = 0.72` the ceiling rises only to `a ≤ 10.5°`. At 30° or 45° the three fit neither stacked
(809 units tall) nor side by side (1155 units wide), and staggering them diagonally either fails
C6's span or C4's separation. **Vertical is the branch `docs/13` §2 offers and the only one that
fits.** [corrected] against the proposal's decision 5, which assumed obliqueness was free.

### 3.5 The prediction the sampling confirmed against C1, though not against its own 10% bound

> **Prediction:** `residual ≤ 0.10 × amplitude` for each cutout — ≤ 2.1 / 3.2 / 2.1 shipped px.

**[measured, task 1.5]** The rebuilt `manifest.json` reports `residual` **3.27 / 3.36 / 1.70**
shipped px for small/medium/large — `large` clears its own 10% bound (1.72), but `small` and
`medium` miss theirs (2.36, 2.60) by roughly one pixel, even after `sample_spine`'s automatic
"split a half-arch in two" fallback (lever 3, applied wherever a half's own local residual exceeded
its own 10% bound; it did not close the last ~1px on these two, because that residual sits at the
tips of the traceable span itself — see §3.1's correction — not inside a span a further split can
bisect).

**What actually gates the geometry is C1, not the 10% heuristic — TRUE at task 1.5, and STILL true,
but the margins below are NOT the ones task 1.5 first recorded.** `thickness` was corrected a second
time in Phase 8/task 8.8 (§3.1's own note: median → minimum opaque-column run length, after a
screenshot caught the channel poking out past a real trough). Against the FIRST (median) thickness,
C1 held on all four levels with margin to spare and lever (1) genuinely was not needed at task 1.5.
Against the CORRECTED (minimum) thickness, it no longer did — `snake1` and `snake3` both went
negative at their original `corridorWidth` (48/36). Lever (1), lower `corridorWidth`, is the one
task 8.8 actually took, on all four levels (48/42/36/32 → 38/34/30/28), restoring:

| level | narrowest margin (`thickness_vb − corridorWidth − 2·residual_vb`), corrected thickness |
|---|---|
| `snake1` | **5.29** (medium piece), at the corrected `corridorWidth = 38` |
| `snake2` | **9.29** (medium piece), at `corridorWidth = 34` |
| `snake3` | **1.16** (medium piece) — the tightest in the family, at `corridorWidth = 30` (`MIN_CORRIDOR`) |
| `snake4` | **13.29** (medium piece), against the engine's EFFECTIVE floor of 30 (authored 28) |

Lever (2), raise `snake3`'s `s_L` above 0.72, was considered and declined for `snake3` specifically:
C6 has no further room to give (the vertical box already nearly fills the 600-tall sheet at 0.72),
so `corridorWidth` alone had to carry the correction there. The narrowest piece also changed hands:
`snakeSmall` at task 1.5's own (since-superseded) numbers, `snakeMedium` now — a real consequence of
the thickness correction, not a typo.

This is recorded as a live correction, not silently overwritten, because it is exactly the kind of
drift this document's own header warns a later reader against: trusting a table that was true when
written but stopped being true once a later phase measured something more carefully.
measurement.

### 3.6 [Phase 8, round 2] The quiet band and C3/C4 are in genuine tension — the arithmetic

A second reviewer round, AFTER this document's own Phase-8 "shipped clean" close, read the
`capturas/pasoE/` PNGs directly and found `snake1`'s original `at.y` values (93.2 / 319.1 / 531.7)
sat the small snake's box mostly over `fondo arena.png`'s own sky-and-rocks strip and the large
snake's box mostly over its lower rocks — `docs/13` §4 decision 3's own rule ("the corridor goes in
the band the drawing leaves quiet") was not honoured, only asserted.

**The quiet band, measured, not eyeballed.** Sampling `art-source/fondo arena.png` row by row
(`scripts/art/png.py`'s hand-rolled decoder, luma 601), rows 204-819 read as a PERFECTLY uniform
sand tone (zero row-to-row variance); the rock/sky/palm rows on either side do not. Mapped through
the backdrop's own `xMidYMid slice` crop (`zoo/backdrops.ts`'s `corridorRows: {top: 51, bottom:
973}`, source px → viewBox: `(row − 51) × (1000/1536)`), that quiet band is viewBox
`y ∈ [99.48, 499.87]` — 400.39 units tall.

**Full containment is arithmetically almost impossible, and C3/C4 is why "almost" becomes
"actually impossible".** The three boxes' own heights sum to 106.17 + 148.29 + 144.40 = 398.86,
leaving 1.53 units of slack against the 400.39-unit band — the three would have to sit stacked
edge to edge, touching. But `catalog.test.ts`'s existing C3/C4 check (§3.4, §4) independently
requires every pair of centrelines to stay over `2 · 60 = 120` units apart even at their wave's
closest approach — a zero-gap stack measures `≈ 83` for both pairs, failing it outright. The two
constraints are provably incompatible at this scale: honouring C3/C4 needs centre-to-centre gaps
of roughly 53 (small–medium) and 28 (medium–large) units MORE than the bare sum of half-heights,
and that extra room has to come from somewhere the quiet band does not have to give.

**The chosen trade-off.** `at.y` moved to 152.7 / 332.9 / 507.3 (from 93.2 / 319.1 / 531.7):

- The SMALL snake's box now sits fully inside the quiet band (`[99.5, 205.7] ⊂ [99.48, 499.87]`,
  zero overlap — down from ~59 of its own 106 units originally).
- The LARGE snake's box still overlaps the rocks below the quiet band, by **≈ 74.6** of its own
  144.4 units (`[430.0, 574.4]`, quiet bottom at 499.87) — reduced from the original ~99, a real
  27% reduction, but not a fix. Closing it further needs either less separation (C3/C4 fails) or a
  smaller `span` for `snakeLarge` specifically (out of scope here: `DRAWN_SPINE`/`span` are shared,
  fixed measurements across the whole family per §1's own architecture, and R1/R7's family-wide
  orderings assume it).
- C3/C4's own margin shrank from 13.7 units (§3.4's original table) to 2.8 / 4.0 — thin, but
  positive, and locked in by `catalog.test.ts`'s new regression test so it cannot silently regress
  again in either direction.

C3/C4 was kept intact rather than the quiet band, because it is a SCORING-SAFETY constraint (below
it, two routes read as one to the nearest-neighbour check the whole family's tracing depends on),
where the quiet band is a visual-fit constraint. Both are now measured and asserted, not assumed;
neither reader has to take the other's word for where the remaining rock overlap is or how large.

---

## 4. [new] The corridor is THREE routes, and `corridorTick` DELEGATES

Amendment A2's fix. `corridorTick` is **untouched**; a sibling walks each route with that route's
own carried track and returns the nearest:

```ts
// client/src/screen/corridorTrack.ts — additive
export interface RouteSegment { readonly polyline: readonly Point[]; readonly length: number }
export interface RouteTrack { readonly tracks: readonly CorridorTrack[] }
export function routeTrackStart(n: number): RouteTrack

/** The nearest of several DISJOINT routes, and the track advanced on that one
 *  alone. DELEGATES to `corridorTick` once per route — one body, not two —
 *  so a single-route call returns `corridorTick`'s own `{distance, track}`
 *  unchanged, which `corridorTrack.test.ts` asserts point for point over the
 *  shipped `trail1`/`trail2` fixtures. That bit-identity is what keeps every
 *  shipped level's wall feedback exactly what it is today.
 *
 *  Taking the minimum across routes is correct ONLY because the routes are
 *  farther apart than the corridor is wide — `catalog.test.ts`'s C3 asserts
 *  exactly that for the snake family (as little as ≈123 against 76, §3.6).
 *  Without C3 a
 *  fingertip between two arms could be claimed by the wrong one, which is the
 *  same failure the windowed search already exists to prevent WITHIN a route
 *  (`corridorTrack.ts:1-18`'s scar). */
export function multiCorridorTick(
  routes: readonly RouteSegment[], track: RouteTrack, x: number, y: number,
): { distance: number; track: RouteTrack; active: number }
```

`LevelPlay.tsx:979-987` swaps `corridorTick` for `multiCorridorTick(target.routes, …)`; the two
consumers of `maxArc` (`clueTick`, `reachedTrailEnd`) read `track.tracks[active].maxArc`, which for
every shipped level is `tracks[0]` — `active === 0` always when there is one route **[derived]**.
`CORRIDOR_TRACK_START` survives as `routeTrackStart(1).tracks[0]`.

Cost: three walks of a ≤ 300-point polyline per 30 Hz sample instead of one, and each is already
window-limited **[derived]** — the same order as the reveal grid's per-sample budget paso D
accepted.

---

## 5. The arrange mechanic

### 5.1 [corrected] It rides the SHIPPED pointer hook

Amendment A4. There is no second pointer owner and no `mode` flag inside `useTraceInput`; there is
one pure fold and one structural boolean.

```ts
// client/src/levels/types.ts — additive, absent everywhere else
/** Before the tracing opens, the child DRAGS this level's art-corridor pieces
 *  into their hollows, smallest to largest (`docs/13` §2: "primero el chico
 *  las ordena … después recorre"). The SLOTS are the pieces' own homes — the
 *  hollows §2.3 already draws — so there is no second table to author and no
 *  way for the arrangement and the trace to disagree about where a snake
 *  belongs. ABSENT = no arrange phase, which is every level that predates
 *  this field AND `snake1`, whose first challenge is deliberately the single
 *  wide demand (`docs/13` §5 item 3). */
arrange?: { readonly from: readonly Point[]; readonly snapRadius: number }
```

```ts
// client/src/levels/arrange.ts — pure, no React, no DOM
export interface ArrangeState {
  /** `placed[i]` = the slot piece `i` occupies, or `null` while scattered. */
  readonly placed: readonly (number | null)[]
  /** The piece under the finger, or `null`. */
  readonly held: number | null
  /** The held piece's live offset from its scatter point, viewBox units. */
  readonly offset: { x: number; y: number }
}

export function initialArrange(cfg: ArrangeConfig): ArrangeState
/** Which piece a press picks up: the one whose current box contains the
 *  point, TOPMOST first when boxes overlap. Pure over boxes the caller
 *  already has (`target.artCorridor`), so it is testable with three rects. */
export function grabPiece(state, boxes: readonly ArtBox[], p: Point): number | null
/** One `onFrame` sample. Returns the SAME REFERENCE when nothing changes —
 *  `revealTick`'s contract (`revealGrid.ts`), restated, so an idle finger
 *  costs a no-op `setState`. A drop lands in the nearest FREE slot within
 *  `snapRadius`; an occupied or distant slot returns the piece to its
 *  scatter point, because a swap is a second rule a six-year-old did not
 *  ask for and `docs/14` §14 forbids punishing an early error hard. */
export function arrangeTick(prev, boxes, p, down, cfg): ArrangeState
/** Every piece in its OWN slot. Seriation and completion are the SAME claim:
 *  `artCorridor` is authored smallest first, so `placed[i] === i` for all i
 *  is literally "ordered from smallest to largest". */
export function isArranged(state: ArrangeState): boolean
/** `?debug=ordenadas:<k>` — the first `k` pieces already home (§8). */
export function debugArrange(cfg: ArrangeConfig, k: number): ArrangeState
```

### 5.2 The gate, and the completion criterion as a CONJUNCTION

```ts
// client/src/screen/LevelPlay.tsx
const [arrangeState, setArrangeState] = useState(() => initialArrange(level.arrange))
const arrangeOpen = !!level.arrange && !isArranged(arrangeState)
```

- **Inside the existing `onFrame`**, beside `revealTick` and `clueTick` — no second cloud scan
  (`docs/02` §7.2): `if (arrangeOpen) { setArrangeState(prev => arrangeTick(prev, boxes, head, drawing, level.arrange!)); return }`.
- **`onRelease` returns early** while `arrangeOpen`, so a drop is never evaluated, never records an
  attempt and never moves a star.
- **`TraceCanvas` takes one new structural boolean**, `inkHidden`, passed `arrangeOpen`: pointer
  capture is exactly as it always was, and no ink is painted. Absent = today, byte-identical.
- `restartRun` and `clearAttempt` reset to `initialArrange(level.arrange)` — `docs/13` §6's
  *"posibilidad de reinicio"* for free, and the re-scatter is deterministic because `from` is
  authored.

So `docs/13` §6's *criterio de finalización* is a conjunction enforced by **sequencing**, not by a
second score: the arrangement must complete before a single stroke is captured as ink, and
approval is then the ordinary `evaluateLevel` over the traced strokes. That also answers the
proposal's own risk (*"two demands in one attempt overloads a six-year-old"*): the two demands are
never simultaneous and only the second is scored.

**Why this is not optional.** The node harness has no jsdom and no testing-library; components are
tested through `renderToString` only. A decision taken inside a pointer handler is invisible to
every test in this repo. Naming and exporting each decision is what makes the mechanic testable at
all — the proposal's argument, adopted verbatim, and the only part of its decision 4 that survives.

---

## 6. The four levels

### 6.1 Frozen shape

All four: `phase: 1`, `kind: 'path'`, `surface: 'blank'`, `maze: false`, `carrier: false`,
`letters: []`, `showGuide: true`, **`resetOnContact: false`** (`docs/14` §14 forbids punishing
early errors hard, and a snake is a living thing the child is carrying, not a maze wall),
`feedback: { tone: true, haptics: true, metronomeBpm: 0, rail: false }`,
`rules: { ...rules(1, false, true, 0), minAccuracy: N }`.

- **`mustBeContinuous: false`** — three snakes are three strokes; `LevelPlay.tsx:1323` already
  passes `multiStroke` (A4), and `evaluateLevel.ts:106` then allows `strokes.length` with
  `minFluency: 0`, so the two mandatory pen lifts cost nothing.
- **`enforceOrder: true` on all four** (A3) — the only thing that requires all three snakes, and
  the motor restatement of the seriation the drag makes. `buildLevel.ts:203-214` numbers the
  secondary paths' checkpoints strictly after the main one's, so `1..N` across the level IS
  smallest → medium → largest.
- **`demo: true` on `snake1` only** (A5) — it plays all three in `target.paths` order, which
  demonstrates the wave AND the order. `guideLevelFor` returns `'full'` for any phase-1 level with
  `showGuide`, so it actually runs (`LevelPlay.tsx:726`).
- **`showGuide: true`**, so `catalog.test.ts:280`'s shipped invariant
  (`showGuide === (id !== 'f5-mama' && kind !== 'free')`) stays green **untouched**. Two guide
  booleans are narrowed for an art corridor, and only there:
  `guide={showShapeLine && !level.maze && !level.artCorridor ? … }` and
  `showCentreLine={showCorridor && !level.maze && !level.artCorridor}` — a crisp dark centreline
  drawn down the middle of the animal is the one thing the art corridor cannot carry (R1's 14).
- **No `goalArt`** — the octopus already stands at the route's start on any level with a backdrop
  (`LevelPlay.tsx:1376`, `drawnPlace`), which is `docs/13` §6's *zona de inicio*, and the goal
  diamonds land at the first snake's head. Named: they mark where snake ONE ends, which is true.

### 6.2 [corrected] The family invariants `catalog.test.ts` asserts

| # | invariant | values |
|---|---|---|
| R1 | `corridorWidth` strictly decreasing | 38 → 34 → 30 → 28 (lowered in task 8.8; see §3.1/§3.5) |
| R2 | `minAccuracy` strictly increasing | 55 → 62 → 70 → 76 |
| R3 | every level holds exactly **three** `paths` and **three** `artCorridor` pieces, in the same order | 3, 3, 3, 3 |
| R4 | `arrange` absent on `snake1` and present on the other three; `demo` present on `snake1` and absent on the other three | — |
| R5 | C1–C6 of §3.2, over the authored literals restated in the test | §3.4's margins |
| R6 | §1.4's coincidence: every probe within **0.5** viewBox units, and `|tx| < 0.5` | — |
| R7 | arc length non-decreasing **within each orientation group** — `snake1 ≤ snake2 ≤ snake4` | `snake3` is the vertical outlier, named |

R7 replaces the proposal's cross-family *"arc length non-decreasing"*, which A7 shows is
unsatisfiable once step 3's orientation is honoured: the vertical level must be shorter to fit.
The demand still rises monotonically across all four through R1 and R2, which is `docs/13` §1's own
ladder (*reducción de espacio → mayor precisión*).

**One number that stops moving below 56, and it is worth knowing.** `toleranceFor` clamps
`corridorWidth / 80` to `[0.7, 2.5]` (`evaluateLevel.ts:47,58-65`), so **every corridor at or below
56 scores at exactly the same tolerance** **[derived]**. Across R1's ladder the corridor therefore
moves the LIVE wall feedback (tone, dimmed ink, haptics) and nothing else; `minAccuracy` is what
carries the narrowing into the score. That is not a defect — `MIN_TOLERANCE_SCALE` exists precisely
so a narrow channel cannot become a stylus test for a six-year-old's finger (`docs/02` §5.1) — but
a reader who saw only R1 would draw the wrong conclusion.

### 6.3 `docs/13` §6 / `docs/14` §14 — the nine obligations

| obligation | how this row answers it |
|---|---|
| **Zona de inicio** | The tail of the first snake, where the octopus already stands (`LevelPlay.tsx:1376`, unconditional on any backdrop level) plus the green start dot, which `showGuide: true` keeps. Left-to-right is the writing direction and the author's scheme puts the head on the right. |
| **Trayectoria esperada** | The snake's own drawn body. §1 is what makes that literally true rather than approximately: the centreline is FITTED to the drawing and both the path and the picture come out of one function. |
| **Tolerancia del camino** | `corridorWidth` inside the measured body (C1), narrowing 38 → 28, with `minAccuracy` 55 → 76 carrying it past the tolerance clamp (§6.2). Tolerance is literally *how far off the spine you may stray and still be on the snake*. |
| **Respuesta visual al contacto** | Shipped and unchanged — chalk ink inside, `inkDim` outside, tone while inside — with the night row's `ink`/`inkDim` mechanism doing the work (§2.1) and **§4** making it true on all three snakes instead of one. |
| **Condiciones de error** | `resetOnContact: false` on all four; a wrong drop returns the snake to its scatter point and costs nothing. |
| **Posibilidad de reinicio** | The existing retry path; `initialArrange` is the whole reset and the re-scatter is deterministic. |
| **Animación de ayuda** | `demo: true` on `snake1` only, playing all three in order (A5). |
| **Criterio de finalización** | The arrangement completes, then the three snakes are traced in order within tolerance — a conjunction enforced by sequencing (§5.2), not by a second score. |
| **Transición narrativa** | `AdventureIntro` on `snake1` and the map's animal-keyed closing, both shipped by pasos B and D. **No `closingBeat`** (§7.2). |

---

## 7. The zoo

### 7.1 The ladder, the animal and the cart

| row | value | note |
|---|---|---|
| `arena.unlockedWhen` | `(records) => isFiled(records, 'night4')` | the ladder's new last rung: entrada → estanque ← `sand4` → montañas ← `duck-trail4` → nocturna ← `llama-peak4` → **arena ← `night4`**. Only ever WIDENS access (A1). |
| `arena.adventureIds` | `['snake1','snake2','snake3','snake4']` | |
| `arena.animals` | `[{ id: 'vibora', dx: 0, dy: 0, size: 30, appearsWhen: ['snake4'] }]` | **`size` is a HEIGHT** (`placeArt.ts:53-61`), and `snakeMedium`'s aspect is 4.32 **[derived]**, so 30 renders 130 × 30 — not a typo beside the llama's 96, and it fits `ARENA_HIT`'s 280-unit width with room. `STANDING_GRIP` puts the belly on the spot, which is where a snake rests. |
| `ZooAnimalId` | `AnimalId \| 'oveja' \| 'llama' \| 'vibora'` | proposal decision 7, adopted verbatim: `assets.ts:48-51` already documents the type as *"every animal the ZOO can stand"*, and the `icon` route exists for adventures that recover NONE. |
| `ZOO_ANIMAL_ART.vibora` | `SECTOR_ADVENTURE_ART.snakeMedium` | the one a child would draw if asked to draw "a snake". |
| backpack | `{ id: 'carrito', art: CART_ART, grantedBy: 'arena', earnedWhen: ['snake4'] }` | the row's own verb is *llevarla a un lugar adecuado*. |
| `sectors.test.ts` | amended | its *"undeveloped sectors stay fogged for any input"* narrows from three to two (`bosque`, `sendero`); `arena` joins the conditional set. |

`carrito.png` takes a `SINGLES` row (`('carrito.png', 'zoo-cart.png', 256, 'contour', True)`) and a
new `CART_ART` registry entry; `artManifest.test.ts` requires a pipeline row, a registry entry and
a consumer in the same change, and all three land here. **Two paso-D lessons apply before wiring**
(`docs/13` §4 decision 6, third bullet): measure its alpha for the `oveja.png`/`piedra.png` speckle
defect, and add an `AUTHORED_SOURCE_SIZES` entry **only** if `png.py` reports exactly 1024 × 1024 —
a mismatched entry raises in `validate_authored_source_sizes` and fails the build for every asset.
The three snake sources are 1024 × 1024 **[measured]** and may take entries additively; neither is
required by this change.

### 7.2 The adventure, and why there is no closing screen

```ts
{ id: 'snake', levelIds: ['snake1','snake2','snake3','snake4'], sector: 'arena',
  animal: 'vibora',
  intro: 'Las víboras se enredaron en la arena. ¿Las ordenamos y las llevamos a su lugar?',
  closing: '¡Las víboras están en su arena!' }
```

`AdventureId` gains `'snake'`; the `AdventureSubject` union (`adventures.ts:53-55`) makes `animal`
and `icon` mutually exclusive, so `npm run build` is what would catch a row with both.

**No `closingBeat`, and now for a structural reason as well as a narrative one.** `mapBubble`
(`adventures.ts:97`) filters on `a.animal !== undefined`, so an adventure that recovers an animal
already carries `docs/13` §5 item 6 through the shipped map bubble: the víbora stands in the sector
and the Pulpito's line closes it, exactly as the duck, the sheep and the llama do — none of which
carries a `closingBeat`. The closing SCREEN was built for a once-per-story transformation and
spending it on a fourth routine recovery would cheapen the one that matters.

---

## 8. The two debug flags

Paso D's gating rule, applied unchanged (`devMode.ts:11-19`): a flag that writes persisted state or
opens a navigable surface is dev-gated; a flag that only paints render state is not.

| flag | gated? | why |
|---|---|---|
| `?debug=ordenadas:<k>` | **no** | places the first `k` pieces home via `debugArrange`. The arrangement is per-attempt and is never persisted, so this paints render state, adds no control, no word and no route — and it must work against the EXACT build being screenshotted. Parsed by `arrangeDebugCount`, through the shipped private `debugArg`. |
| `?debug=espina` | **no** | overlays `target.paths` as a 2-unit `TORCH_CHALK` line over the art, so §1.4's coincidence is *photographable* rather than only assertable. Same reasoning; parsed by `isSpineDebug`, which mirrors `isSectorDebug`'s colon-less shape. |
| `?debug=progreso:night4` / `:snake1,…,snake4` | yes — **already shipped** | `seededProgressIds` (`devMode.ts:82`) needs no change and carries the arena-before/after, the víbora standing and the four-item backpack. |

`isSectorDebug`, `shouldSeedRecoveredDuck`, `revealDebugFraction` and `lightDebugPoint` are
**byte-identical**, so every paso B and paso D capture keeps working.

---

## Data Flow

```
  build_art.py  ──sample_spine──▶  manifest.json { mid, halves, residual,
                                     thickness, traceFrom/To, bodyBrightest,
                                     bodyDarkest, headWhite }
                                          │  hand-copied, guarded by artManifest.test.ts
                                          ▼
  catalog.ts  ──artCorridor[]──▶  levels/artCorridor.ts  DRAWN_SPINE
                                          │
        buildLevelTarget ─ layOutPaths ─▶ tx ─┬─▶ paths[]   (the engine scores these)
                                              ├─▶ routes[]  (§4)
                                              └─▶ placeArtCorridor ─▶ artCorridor[]
                                                        │  ONE derivation
        ┌───────────────────────────────────────────────┘
        ▼
  TraceCanvas.onFrame(points, drawing, timeMs)     ← ~30 Hz, the ONE sample
        │
        ├─ arrangeOpen ─▶ arrangeTick ─▶ ArrangeState ──┐   (and RETURN: no wall check,
        │                                                │    no ink, no attempt)
        └─ else ─▶ multiCorridorTick(routes, …) ─▶ out ─▶ tone / haptics / inkDim
                                                         │
   backdrop.channel = SAND_HOLLOW ─▶ shipped channel stroke (the hollows)
                                                         ▼
                                    ArtCorridorLayer ─▶ N × <image> at box/rotate
                                                         │
   onRelease ─▶ (arrangeOpen ? nothing) : evaluateLevel ─▶ accuracy ∧ order ∧ fluency

  ADVENTURES.snake ─ introLevel ─▶ {view:'intro'}   ·   mapBubble ─ animal ─▶ closing
  SECTORS.arena(night4 filed) ─ snake4 filed ─▶ víbora stands + carrito
```

## File Changes

| File | Action | Description |
|---|---|---|
| `scripts/art/build_art.py` + `client/public/art/manifest.json` | Modify | `sample_spine()`, the optional 6th `SINGLES` element, 4 fields × 3 cutouts, one `carrito` row |
| `client/src/levels/paths.ts` (+`.test.ts`) | Modify | `spineWave`, `SpineHalf`; the three-generation byte-identity proof |
| `client/src/levels/artCorridor.ts` (+`.test.ts`) | Create | `DRAWN_SPINE`, `ArtCorridorPiece`, `placeArtCorridor`, `spineProbes` |
| `client/src/levels/arrange.ts` (+`.test.ts`) | Create | `initialArrange`, `grabPiece`, `arrangeTick`, `isArranged`, `debugArrange` |
| `client/src/levels/types.ts` | Modify | `artCorridor?`, `arrange?`, `LevelTarget.routes`, `LevelTarget.artCorridor` |
| `client/src/levels/buildLevel.ts` (+`.test.ts`) | Modify | `layOutPaths` returns `tx`; `routes` and `artCorridor` derived after the layout |
| `client/src/levels/catalog.ts` | Modify | four entries, **appended after `night4`** |
| `client/src/levels/catalog.test.ts` | Modify | `EXPECTED_IDS` ×4; R1–R7; C1–C6. `:280`, `:528`, `:540` **unedited and green** |
| `client/src/screen/corridorTrack.ts` (+`.test.ts`) | Modify | `RouteSegment`, `RouteTrack`, `multiCorridorTick`; `corridorTick` untouched |
| `client/src/screen/LevelPlay.tsx` (+`.test.tsx`) | Modify | the arrange fold + gate, `multiCorridorTick`, two guide booleans, `inkHidden` |
| `client/src/canvas/ArtCorridorLayer.tsx` (+`.test.tsx`) | Create | N `<image>`s with `transform="rotate(…)"`, zero `url(#` |
| `client/src/canvas/TraceCanvas.tsx` (+`.test.tsx`) | Modify | `TraceArtCorridor`, `inkHidden`, one layer after the channel block |
| `client/src/canvas/devMode.ts` (+`.test.ts`) | Modify | `arrangeDebugCount`, `isSpineDebug`; four shipped functions byte-identical |
| `client/src/zoo/backdrops.ts` (+`.test.ts`) | Modify | the `snake` row, `corridorArt`, `SAND_HOLLOW`, L1–L4, R1/R3/R4, the completeness guard |
| `client/src/zoo/adventures.ts` (+`.test.ts`) | Modify | `AdventureId \| 'snake'`, one row |
| `client/src/zoo/sectors.ts` (+`.test.ts`) | Modify | `arena` unlock, animals, `adventureIds` |
| `client/src/zoo/backpack.ts` (+`.test.ts`) | Modify | the cart |
| `client/src/detective/assets.ts` | Modify | `ZooAnimalId \| 'vibora'`, `ZOO_ANIMAL_ART.vibora`, `CART_ART` |
| `client/src/detective/artManifest.test.ts` | Modify | one new PNG; `DRAWN_SPINE` ↔ manifest parity |
| `docs/13_AVENTURAS_POR_ANIMAL.md` | Modify | §4 status row for *Víboras* |
| `useTraceInput.ts`, `migrateEntrance.ts`, `evaluateLevel.ts`, `revealGrid.ts`, `coverage.ts`, `cases.ts`, `Deduction.tsx`, `AdventureIntro.tsx`, `AdventureClosing.tsx` | **Unchanged** | A1, A4; `docs/13` §4 decision 1 |
| `TraceCanvas.test.tsx:145,163` and the four sibling `url(#` guards | **Unchanged, and must stay green** | the ban is the point |

## Interfaces / Contracts

Every new type is in §1.2, §1.3, §1.4, §4 and §5.1. Two additive `LevelConfig` fields
(`artCorridor?`, `arrange?`), two additive `LevelTarget` fields (`routes`, `artCorridor?`), one
additive `AdventureBackdrop` field (`corridorArt?`), one additive `TraceCanvas` prop group
(`artCorridor?`, `inkHidden?`). All absent on every level, row and call site that predates them.

## Testing Strategy

| Layer | What | Approach |
|---|---|---|
| Unit (pure) | `spineWave` | `M`/`C` only; a uniform alternating list reproduces `waveVaried`'s `d` byte for byte, and `waveVaried`'s uniform list reproduces `wave`'s; no half overshoots its declared `rise`; composes with `transformPath` at −90° |
| Unit (pure) | `placeArtCorridor` | box aspect equals the cutout's; the spine's normalized mid lands on `at.y`; `tx` shifts box and pivot together; rotation about the piece's own centre is an isometry of the box |
| Unit (pure) | **the coincidence** | §1.4's 33 probes within 0.5 units of `flattenPathD(target.paths[i])`, for all four levels × three pieces, through the ONE placement function |
| Unit (pure) | `multiCorridorTick` | **single-route equals `corridorTick` exactly**, distance and track, over the shipped `trail1`/`trail2` polylines; with three disjoint routes it selects the nearest and advances only that one; a route the finger never visits keeps `maxArc === 0` |
| Unit (pure) | `arrange` | grab picks the topmost containing box; a drop outside `snapRadius` returns the piece; an occupied slot rejects; `isArranged` iff `placed[i] === i`; **same reference when nothing changes**; `debugArrange(cfg, k)` places exactly `k` |
| Unit (data) | the four levels | R1–R7 and C1–C6 of §3.2/§6.2, over the authored literals restated in the test |
| Unit (data) | the luma law | L1–L4 for the snake row; **four falsifiability rows that must go RED** — R1 (14), R2 (42.8, shipped and untouched), R3 (6), R4 (13); **the group-completeness guard** |
| Unit (pure) | `corridorRows` | `viewBoxToImage(0, 30)` = 97.3 ≥ 51 and `(0, 570)` = 926.0 ≤ 973 **[derived]** for the snake row; the six shipped rows unchanged |
| Unit (pure) | `backdropFor` | `snake1..4` → the snake row; **`f2-agua*` and `trail1..4` still `undefined`** (paso B's regression guard, re-run) |
| Unit (pure) | zoo | `arena` closed on `{}` and open once `night4` is filed; the víbora appears only on `snake4`; the cart only on `snake4`; every `appearsWhen`/`earnedWhen` id is a real catalog level |
| Unit (pure) | `devMode` | the two new grammars, malformed input, and **the four shipped parsers byte-identical** |
| Component | `ArtCorridorLayer` | one `<image>` per piece at the derived box; `transform="rotate(…)"` present only when authored; **zero `url(#`** |
| Component | `TraceCanvas` | with `artCorridor`: the layer sits after the channel block and before the ink. **Without it: markup byte-identical to today** for a lagoon backdrop, a `ground` maze and a plain maze |
| Component | `LevelPlay` | `snake2` with `arrange` open → no ink, no attempt on release; `snake1` → `inkColor` is `TORCH_CHALK`; **`duck-trail2`, `night2` and `f2-agua2` byte-identical to today** |
| Screenshot (human) | `scripts/shot.sh` → `capturas/` | non-negotiable, `docs/12` §4 — below |

**What only a capture can answer**: whether `SAND_HOLLOW` reads as a scooped hollow or as a hole
punched in the beach; whether a chalk-white line on a green snake on beige sand reads as a child's
pencil or as a highlight; whether three vertical snakes read as *snakes* or as three ropes; whether
the arrange phase's silence (no ink, no sound) reads as "pick one up" or as "nothing is happening".
Required: each of the four levels untraced and part-traced; `snake2` mid-drag and correctly
arranged; `?debug=espina` on `snake1` and `snake3`; the arena before and after; the map with the
víbora standing; the backpack with four items; **one night and one llama level proving they are
unchanged**.

## Threat Matrix

N/A — no HTTP/shell routing, no subprocess, no VCS/PR automation, no executable-file
classification, no process-integration boundary. `scripts/art/build_art.py` is an existing offline
build script: this change adds one callable reached through an optional tuple element, four data
fields and one row, and adds no argument, no path input and no new caller. The rest is rendering,
pure arithmetic, and two URL-query parsers over an explicit string argument.

## Migration / Rollout

**No migration** (A1). `snake1..4` append after `night4`, so `isUnlocked`'s positional rule demotes
nothing: there is no successor chain past the last id. Its only surviving consumer is the dev-only
`LevelMap.tsx:81` anyway, and `arena.unlockedWhen` moving off `alwaysClosed` only ever WIDENS
access — the opposite of paso D, where `estanque` stopped being `alwaysOpen` and a returning child
would have LOST the pond. `migrateEntrance.ts` is byte-identical, and **this is stated as a success
criterion so a later reader does not "restore" a migration nobody needs.**

Every rollback lever the proposal names still works by construction, and one is stronger than it
claimed: dropping `arrange` from `snake2..4` leaves three plain traces of the same three snakes
(the field is additive and the slots are the pieces' own homes, so nothing dangles); dropping
`artCorridor` degrades the four to painted-channel levels showing a dark hollow and no animal,
which is a visual regression rather than a crash; dropping the `snake` backdrop row removes the
row's paints in one edit; `git revert` restores `main` with every child's progress intact, records
on the four new ids becoming unreachable keys exactly as `f1-travesia`'s already are.

## Review-budget forecast

The proposal forecast **~2 375** authored lines. This design **removes** ~190 (no `useDragInput`
and no second pointer capture, A4; no independent generator plus drift assertion, §1.1; no slot
table, §5.1) and **adds** ~255 (`multiCorridorTick` and `routes`, §4; the `tx`-aware derivation,
§1.4; C1–C6 and R1–R7; the fourth red row and the completeness guard; two debug flags).
**Revised: ~2 440.** `sdd-tasks` owns the binding forecast.

**Decision needed before apply: Yes. Chained PRs recommended: Yes. 800-line budget risk: High.**
`size:exception` was accepted at session start (`delivery_strategy: exception-ok`).

### The seam — seven slices, each green on its own, in dependency order

| slice | contents | ~lines | why it is green alone |
|---|---|---|---|
| **E1** Measure | `sample_spine`, 4 manifest fields, the `carrito` row + alpha check + `CART_ART`; `artManifest.test.ts` | 300 | the pipeline emits; nothing consumes yet |
| **E2** Corridor | `spineWave` + tests; `artCorridor.ts` + `DRAWN_SPINE`; `types.ts`; `buildLevel`'s `tx`/`routes`/`artCorridor`; the coincidence test against a fixture level | 450 | no catalog entry authors the field; `buildLevel.test.ts` proves every shipped target unchanged |
| **E3** Walls | `multiCorridorTick` + tests; the `LevelPlay` swap | 200 | single-route bit-identity is the whole proof |
| **E4** Arrange | `arrange.ts` + tests; `arrange?`; `LevelPlay`'s gate; `TraceCanvas.inkHidden` | 430 | no level authors `arrange`; every shipped level byte-identical |
| **E5** Render | `ArtCorridorLayer.tsx` + test; `TraceArtCorridor` and the layer; the two guide booleans; `devMode`'s two flags | 380 | exercised through synthetic props |
| **E6** Levels | the four entries; `EXPECTED_IDS`; R1–R7; C1–C6 | 300 | `ADVENTURE_BACKDROP` may lack the row — `backdropFor` returns `undefined` and the levels render on paper |
| **E7** Zoo | the backdrop row + `SAND_HOLLOW` + `corridorArt` + L1–L4 + R1/R3/R4 + completeness; adventure, sector, animal, backpack, `ZooAnimalId` | 380 | the backdrop resolves for the first time here, which is where the captures start paying |

**E7 must not merge before its capture is read.** The numeric risk is closed by §2's table, but E7
is the only slice that can be wrong in a way the suite cannot see: whether a luma-52.5 hollow under
a green snake on luma-209 sand reads as a scoop in the beach is a question no assertion answers.

| slice | commit subject | focused test command | rollback boundary |
|---|---|---|---|
| E1 | `feat(art): measure the snakes' drawn spines into the manifest` | `npm test -- detective/artManifest` | drop `sample_spine`, the 4 fields and the `carrito` row |
| E2 | `feat(levels): fit the corridor to the drawn snake` | `npm test -- levels/paths levels/artCorridor levels/buildLevel` | delete `artCorridor.ts` and `spineWave`; revert `layOutPaths`'s return |
| E3 | `fix(screen): measure the wall against every route, not just the first` | `npm test -- screen/corridorTrack screen/LevelPlay` | revert one call site; `corridorTick` was never touched |
| E4 | `feat(levels): add the object-arrange mechanic` | `npm test -- levels/arrange screen/LevelPlay canvas/TraceCanvas` | delete `arrange.ts`; drop the field, the gate and `inkHidden` |
| E5 | `feat(canvas): draw the art corridor as plain images` | `npm test -- canvas/ArtCorridorLayer canvas/TraceCanvas canvas/devMode` | delete the layer; drop the prop and the two booleans |
| E6 | `feat(levels): add the four snake levels` | `npm test -- levels/catalog` | remove the four entries and their `EXPECTED_IDS` rows |
| E7 | `feat(zoo): open the arena and recover the víbora` | `npm test -- zoo/ detective/artManifest` | restore `arena.unlockedWhen: alwaysClosed`, empty its `adventureIds`/`animals`, drop the backpack and backdrop rows |

Runtime-harness evidence: **N/A for every slice at the unit level** (node, no jsdom — this repo has
no runtime harness), which is exactly why the drag GESTURE and §2.3's colour are routed to the
capture pass instead of being claimed as verified.

## Open Questions

- [x] **RESOLVED — all seven proposal corrections are ratified** and recorded as A1–A7 in §0. They
      supersede the proposal; `sdd-tasks` and the archive read §0, not the superseded text.
- [x] **RESOLVED — no migration** (A1), verified against the one surviving `isUnlocked` consumer
      rather than inherited from the proposal's argument.
- [x] **RESOLVED — the seriation is by SPAN, and the art does not supply it** (§3.1). The shipped
      widths are 480 / 492 / 500 and the author's scheme draws three equal-length snakes, so
      *"de la más chica a la más grande"* is expressed by three authored spans, not by the drawing.
- [x] **RESOLVED — step 3 is VERTICAL, not oblique** (A7, §3.5). Three oblique snakes fit the sheet
      at no scale that also clears the phase-1 span guard; three vertical ones fit comfortably at
      0.72, and `docs/13` §2 offers exactly that branch.
- [x] **RESOLVED — the hollow is the channel** (§2.3, A6), which closes the "no channel" problem,
      supplies the arrange phase's drop targets and keeps `backdrops.test.ts`'s existing loop
      honest with no exemption.
- [x] **RESOLVED — `residual` measured at 3.27 / 3.36 / 1.70 shipped px** (task 1.5). Missed its own
      `≤ 0.10 × amplitude` bound by ~1px for small/medium, but C1 — the constraint that actually
      gates the geometry — held with real margin against it. A DIFFERENT number, `thickness`, turned
      out to be the one this phase measured wrong (median instead of minimum), caught by a screenshot
      in Phase 8/task 8.8 and corrected there — see §3.1/§3.5's amendments.
- [x] **RESOLVED, imperfectly — a dark hollow on a pale beach mostly reads as a scoop** (§2.3, task
      8.7). After task 8.8's `corridorWidth` correction the channel stays under the body across
      nearly its whole length; a thin dark sliver remains visible at the single tightest trough
      (the C1 margin there is only ~1-5 viewBox units, depending on the level). Closing it further
      would need to violate either R1's strict ordering or `snake3`'s already-tight C6 ceiling, so
      it is accepted and disclosed rather than chased to zero. **Re-verified after the Phase-8
      round-2 review** (§3.6): the round-2 captures had shown the hollow reading as a separate
      "second snake" on `snake2`/`snake3`/`snake4` specifically, which turned out to be downstream
      of the scatter-clipping and rotation-viewing defects §3.6 fixes, not of this thickness math —
      freshly re-captured `snake1.png`/`snake2.png`/`snake4.png` (after those fixes) show the SAME
      thin-sliver-at-the-crests reading this bullet originally disclosed, not a worse one.
- [x] **RESOLVED — the quiet band and C3/C4 are provably in tension, and the chosen trade-off is
      arithmetic, not a guess** (§3.6, Phase 8 round 2). `snake1`'s original `at.y` placed the small
      and large snakes mostly over the rock/sky bands `docs/13` §4 decision 3 says to avoid. Full
      containment inside the measured quiet band (`y ∈ [99.48, 499.87]`) and C3/C4's own minimum
      centreline separation cannot both be honoured at this scale (1.53 units of slack against
      separations that need ~53/~28 more). C3/C4 was kept (a scoring-safety constraint); the small
      snake's box now sits fully inside the quiet band and the large one's rock overlap is reduced
      (not eliminated) from ~99 to ~74.6 of its own 144.4 units — disclosed, not silently ugly.
- [x] **RESOLVED — the chalk-white line reads as a drawn line, not a highlight** (§2.1, task 8.7).
      The `?debug=espina` captures on `snake1`/`snake3` show it tracing the spine clearly against
      the green body.
- [x] **RESOLVED — `snake3.png`/`snake3-espina.png` looked like the art and the corridor disagreed;
      they do not** (Phase 8 round 2). `?debug=espina` always draws the FIXED, fully-arranged
      centreline regardless of arrange state, but a plain `?nivel=snake3` capture (no `ordenadas`
      flag) shows the pieces at their SCATTER positions — only one `debug=` value is passable per
      URL, so espina-plus-arranged cannot be captured in one shot, and the two captures together
      read as "the snake is not on the line" to a reviewer who does not know that. The placement
      MATH was never wrong: `snake3-ordenadas3.png` (freshly re-captured) shows all three pieces
      correctly rotated onto their columns, and a NEW test closes the coverage gap this exposed —
      `ArtCorridorLayer.test.tsx` now renders `snake3`'s REAL catalog data through the REAL
      component, parses the `<image>`'s own `x`/`y`/`width`/`height`/`transform` back out of the
      RENDERED HTML STRING (never the internal `box`/`rotate` fields directly), and checks THAT
      against `target.paths[i]` — the gap the existing `catalog.test.ts` coincidence proof left:
      it compared two internally-generated path strings and never touched what `ArtCorridorLayer`
      actually draws.
- [x] **RESOLVED — `snake2.png` and `snake4.png` are not the same file** (Phase 8 round 2,
      confirmed by `md5sum`: distinct hashes). They look alike because `snake2`/`snake4` share the
      exact same `snakeHorizontalPieces()`/`snakeHorizontalScatter()` geometry by design (only
      `corridorWidth`/`minAccuracy` differ across the family, per §3.4's own table) — a 6-unit
      corridor width difference is not visible at screenshot resolution. The actual defect this
      round found was real, but different: the scatter points' X axis was never checked against
      the sheet's own width (only Y, in the first Phase-8 round) — `large`'s scatter box ran 130
      units past the right edge, `small`'s 10 past the left. Fixed in `catalog.ts`'s
      `snakeHorizontalScatter`/`snakeVerticalScatter`; `catalog.test.ts`'s regression test now
      checks both axes against the real `viewBoxWidth`, not a hardcoded one.
- [x] Nothing else is blocking. Every decision above is settled, including Phase 8's own two rounds
      of screenshot-found-and-corrected defects — see `apply-progress.md`'s Phase 8 section (round
      1) and its round-2 addendum for the full story.

---

### Accepted deviation

This document exceeds the skill's 800-word cap — the same deviation
`archive/2026-09-13-reveal-grid-entrance-and-night/design.md:1338-1347`,
`archive/2026-09-13-sheep-and-llama-peaks/design.md:738-746` and
`archive/2026-09-13-duck-undulations-and-sector-backdrop/design.md:908-916` each recorded.
`openspec/config.yaml` requires every architecture decision to carry its rationale; this change
carries twenty-two, **seven of which correct the proposal**, one of which (§1.1) removes the
proposal's own named worst failure rather than budgeting for it, one of which (A2) repairs a live
defect the proposal's own shape would have shipped, and one of which (§3.5) proves that the
orientation step the directive asks for has exactly one branch that fits the sheet.
