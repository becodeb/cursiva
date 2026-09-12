# Design: Duck undulations and the lagoon sector backdrop

Binding input: `proposal.md`. Its five decisions are settled and are not reopened; this
document is the HOW. Every `file:line` was re-verified against the working tree on
`sdd/patos-ondulaciones`. Numbers are marked **[derived]** (closed-form arithmetic from the
generators or the shipped hex literals), **[corrected]** (the proposal's figure was off and
the corrected one is used everywhere below), or **[estimated]** (read off the rendered PNG by
eye — this phase has no shell, so nothing was re-sampled; every estimated number carries a
named re-measurement step in §3.5 and an Open Question).

## Technical Approach

Nothing in the trace engine, the scoring model, the progress store or the catalog's shape
changes. The change is one new generator, four level literals, one new leaf registry, one
canvas layer, one screen, and two navigation edits:

1. `levels/paths.ts` — `waveVaried` (per-cycle amplitude, `garlandVaried`'s exact shape) plus
   `waveCrestRadius`, the arithmetic that makes §2's fold claim assertable;
2. `levels/catalog.ts` — the four duck entries become one undulation family;
3. `client/src/zoo/adventures.ts` + `zoo/backdrops.ts` — two pure leaf registries: which
   levels belong to which adventure and what the Pulpito says about it, and which sector
   carries a drawn backdrop;
4. `canvas/TraceCanvas.tsx` — one `backdrop` prop, one new layer, three conditionals inside
   the existing maze block;
5. `screen/AdventureIntro.tsx` — the reusable narrative entry;
6. `screen/GameScreen.tsx` + `App.tsx` — `resolveEnterAction` and one new `GameView` variant;
7. `screen/ZooMap.tsx` — the bubble's picture and word come from a pure selector.

The governing constraint is unchanged: vitest on the **node** environment, no jsdom, no DOM.
Every decision this change introduces is therefore a **named exported pure function** —
`waveVaried`, `waveCrestRadius`, `adventureFor`, `backdropFor`, `mapBubble`,
`resolveEnterAction`, `viewBoxToImage`, `luma` — and each component only renders what one of
them returned. The precedents are the ones already shipped: `shouldFileClue`,
`resolveNextAction`, `nextAdventure`, `uTurnRadius`, `isSectorDebug`.

No `url(#…)`, no `<mask>`, `<pattern>`, `<clipPath>`, `<defs>`, `useId` (`TraceCanvas.tsx:70-84`
— it hydrated blank sheets on real devices). `transformPath` accepts only `M`/`L`/`C`
(`paths.ts:172-174`), and `waveVaried` emits only `M`/`C`. No level id moves: `duck-trail1..4`
are persisted keys in `cursiva.levels.v1`. No new persisted key, no migration, no new
dependency, no art generation.

---

## 1. The wave progression

### Decision: `waveVaried` mirrors `garlandVaried`, cycle-for-cycle

**Choice**: a sibling generator in `paths.ts`, `~18` lines, with the same option-bag shape,
the same accumulate-`x` loop and the same `M`/`C`-only alphabet.

```ts
/** One cycle of a varied wave ({@link waveVaried}). */
export interface WaveCycle {
  /** Horizontal span of this FULL cycle — crest AND trough — in viewBox units. */
  width: number
  /** How far this cycle's extrema sit from the centreline, in viewBox units. */
  amplitude: number
}

export function waveVaried(
  o: { x0?: number; y?: number; cycles?: readonly WaveCycle[] } = {},
): string {
  const x0 = o.x0 ?? 120
  const y = o.y ?? 300
  const cycles = o.cycles?.length ? o.cycles : [{ width: 380, amplitude: 170 }]
  let x = x0
  let d = move(x, y)
  for (const c of cycles) {
    const w = Math.max(1, c.width) / 2              // one HALF-arch
    const arm = (c.amplitude * 4) / 3               // `alternatingArches`'s own offset
    // Crest first, then trough — `wave`'s `firstHalfUp`, restated per cycle so the
    // hand always leaves a cycle going UP and the family never inverts mid-route.
    for (const off of [-arm, arm]) {
      d += cubic(x + w / 3, y + off, x + (2 * w) / 3, y + off, x + w, y)
      x += w
    }
  }
  return d
}
```

**Alternatives considered**: widening `wave` with an optional `amplitudes` array; composing
per-cycle `transformPath` calls; extra `paths[]` entries.

**Rationale**: with per-cycle widths, `wave`'s `x1` and single `amplitude` stop meaning
anything — the span is the SUM of the widths — so a widened `wave` would carry two mutually
exclusive parameter sets, which is the exact argument `garlandVaried` already recorded
(`paths.ts:573-590`). `transformPath` is a UNIFORM scale about one pivot (`paths.ts:148`), so
it cannot change one cycle without changing the rest. Extra `paths[]` entries are pen-lift
routes, and only `paths[0]` receives the taper (`buildLevel.ts:199`).

**The proof that nothing was re-derived** is `garlandVaried`'s own: a uniform `cycles` list
must reproduce `wave`'s `d` string **byte for byte**, asserted with `toBe`, not
`toBeCloseTo`. Verified by hand for the test's own literals **[derived]**: `wave()` has
`x0=120, x1=880, cycles=2` → `halves=4`, `w=190`, half-arch starts `120, 310, 500, 690`;
`waveVaried({ cycles: [{width:380,amplitude:170},{width:380,amplitude:170}] })` accumulates
`120, 310, 500, 690` and alternates `−arm, +arm, −arm, +arm` — the same four cubics with the
same arguments. `alternatingArches` computes `sx = x0 + i·w` while this accumulates; the two
agree exactly on these literals, and `r2`'s 2-decimal rounding is what absorbs the difference
in general. That is the same footing `garlandVaried` ships on today.

### Decision: step 3's one cycle boundary is a kink, and that is stated rather than hidden

**Choice**: accept an 8.7° tangent-direction change at the single join between
`waveVaried`'s two cycles, and name it in the catalog comment.

**Rationale**: `alternatingArches`'s C1 continuity (`paths.ts:82-83`) holds when consecutive
half-arches satisfy `off' = −off·w'/w`. Inside a cycle `w' = w` and `off' = −off`, so every
INTERNAL join is exactly C1 **[derived]**. Between cycles the tangent slope magnitude at a
join is exactly the peak slope `4A/w`, so the kink is `|atan(4A₂/w₂) − atan(4A₁/w₁)|` =
`|77.96° − 69.25°| = 8.71°` **[derived]**. Making it zero would force `A/w` constant across
the list — which makes the peak slope constant, which is precisely the variation step 3
exists to introduce. So genuine per-cycle amplitude and exact C1 are mutually exclusive, and
the directive asked for the amplitude. The kink is not a cusp: `dx` is strictly positive on
both sides, so the pen never reverses, which is what separates this from the switchback being
removed and from `garland`'s real cusps (`catalog.ts:288-291`).

### The four levels

| Step | Level | `paths` | `corridorWidth` | `taper` | minY | maxY | span | peak slope |
|---|---|---|---|---|---|---|---|---|
| 1 | `duck-trail1` | `wave({ x0:90, x1:910, y:300, amplitude:170, cycles:1 })` — **unchanged** | 100 | — | 130 | 470 | 340 | 1.66 (58.9°) |
| 2 | `duck-trail2` | `wave({ …, cycles:2 })` — **unchanged** | 90 | — | 130 | 470 | 340 | 3.32 (73.2°) |
| 3 | `duck-trail3` | `waveVaried({ x0:90, y:300, cycles:[{width:470,amplitude:155},{width:350,amplitude:205}] })` | 80 | — | 95 | 505 | 410 | 4.69 (77.9°) |
| 4 | `duck-trail4` | `wave({ …, cycles:3 })` | 70 | `{from:1, to:0.85}` | 130 | 470 | 340 | 4.98 (78.6°) |

Every row clears `catalog.test.ts:415-426`'s three phase-1 assertions (span > 300, minY < 180,
maxY > 420) and stays on the sheet. Step 3's cycle widths sum to `470 + 350 = 820 = 910 − 90`,
so it spans the same sheet as its siblings.

### Content that moves with the shapes

| Field | From | To | Why |
|---|---|---|---|
| `duck-trail3.title` | `La vuelta de las burbujas` | `Las burbujas suben y bajan` | "vuelta" named the reversal, which is gone |
| `duck-trail3.hint` | `Seguí hasta el fondo, dá la vuelta y volvé.` | `Seguí las burbujas: unas ondas son más grandes.` | ≤ 80 chars, names no failure (`catalog.test.ts:89-97`) |
| `duck-trail3.rules` | `rules(1, true, …)` | `rules(1, false, …)` | `mustBeContinuous` was justified *solely* by the reversal (`catalog.ts:301-304`); with no reversal it aligns with its three siblings |
| `duck-trail4.hint` | `Seguí el rastro, esquina por esquina.` | `Seguí el rastro de plumas, el camino se angosta.` | there are no corners left |
| `duck-trail4.taper` | `{ from: 1.15, to: 0.9 }` | `{ from: 1, to: 0.85 }` | `1.15 × 70 = 80.5` would start step 4 WIDER than step 3's 80 |

Untouched: ids, `clue.kind`, `clue.spacing`, `resetOnContact`, `carrier`, `demo`, the `rail`
on `duck-trail1` only, `corridorWidth` (pinned by `catalog.test.ts:103-106`), and
`duck-trail1`/`duck-trail2` entirely. `switchback` and `squareWave` stay imported in
`catalog.ts` — `trail3` (`:573`) and `trail4` (`:444`) still call them, so no import is
orphaned and `noUnusedLocals` stays quiet.

### `catalog.test.ts`, named assertion by assertion

**Delete** — `describe('detective-mode — duck-trail4 clears the corner and arm guards…')`,
`catalog.test.ts:697-709`. It reads `target.polyline[0..2]` as a flat run and a vertical
transition; a wave has neither, so the test would not merely fail, it would be
*subjectless*. `cornerClearance`, `armClearance` and `buildLevelTarget` all stay imported —
the `trail4` describe at `:678-695` still uses all three.

**Unchanged and re-verified**: `:103-106` (corridor widths), `:290-296` (the tapered set is
still `['duck-trail4','trail1','trail4']` and `1 > 0.85` still holds), `:305-314`
(`resetOnContact`), `:415-426` (the phase-1 guard now covers the recut shapes automatically),
`:169-179` (phase-1 continuity: it pins `trail1..4` and never mentioned the ducks).

**Add** — one `describe('LEVELS — the duck adventure is one undulation family')`:

| # | Assertion | What it stops |
|---|---|---|
| 1 | every duck level has exactly one path and its command letters are a subset of `{M, C}` | a `switchback`/`squareWave` (both emit `L`) slipping back in |
| 2 | `peakSlope = 4A/halfWidth`, restated from each level's own generator literals, is strictly increasing: 1.66 → 3.32 → 4.69 → 4.98 | a re-tune that flattens the progression |
| 3 | `corridorWidth` strictly decreases 100 → 90 → 80 → 70 | the ordering, not just the four values |
| 4 | `cw₄ · taper.from ≤ cw₃` and `cw₄ · taper.to < cw₃` | step 4 ever starting wider than step 3 |
| 5 | measured from `buildLevelTarget(duck-trail3).polyline`: the two crest depths differ by ≥ 40 units | step 3 silently losing its variation |
| 6 | `mustBeContinuous` is `false` on all four | the reason `duck-trail3` had one going away without the flag |

`paths.test.ts` adds five rows for `waveVaried` (alphabet is `M`/`C` only; `transformPath`
accepts it and throws on an appended `A`; the byte-equality row against `wave()`; extrema land
exactly at `y ∓ amplitude` per cycle; the first extremum is ABOVE `y`) and one for
`waveCrestRadius` (§2).

---

## 2. `pushBand`, computed

The proposal is right that the ducks fold and right that it is benign. Its **reason** is
weaker than the proof that is actually available, and two of its numbers are off. Both are
corrected here and the stronger claim is what gets asserted.

### The closed form

`alternatingArches` (`paths.ts:88-109`) emits, per half-arch of width `w` about `mid`, the
cubic `P0=(sx,mid)`, `P1=P2=(sx+w/3, mid+off)`, `P3=(sx+w,mid)` with `off = ±4A/3`. The `x`
control points are equally spaced, so `x(t) = sx + w·t` **exactly**, and
`y(t) = mid + 3·off·t(1−t)`. At the crest (`t = ½`): `x' = w`, `x'' = 0`, `y' = 0`,
`|y''| = 6|off| = 8A`. Hence **[derived]**

```
κ = |x'y'' − y'x''| / (x'² + y'²)^{3/2} = 8A·w / w³ = 8A / w²
R = w² / (8A)                              ← waveCrestRadius(halfWidth, amplitude)
```

This is *not* `uTurnRadius`'s formula. `garland`'s control points sit at 15 %/85 % of the
cycle, giving `x'(½) = 1.275w`; the wave's are at 1/3 and 2/3, giving exactly `w`. Two
generators, two closed forms, two exported helpers — which is why `waveVaried` gets its own
rather than reusing `uTurnRadius`.

### The table

`band = max(MIN_BAND, corridorWidth/2 − BAND_INSET)` with `BAND_INSET = 6`
(`buildLevel.ts:38, 160`). All values **[derived]**:

| Step | half-width `w` | `A` | `R = w²/8A` | `band` | `R/band` | folds? |
|---|---|---|---|---|---|---|
| 1 `duck-trail1` | 410 | 170 | 168100/1360 = **123.60** | 100/2−6 = 44 | 2.81 | no, by +79.60 |
| 2 `duck-trail2` | 205 | 170 | 42025/1360 = **30.90** | 90/2−6 = 39 | 0.79 | **yes**, by −8.10 (ships on `main`) |
| 3 cycle 1 | 235 | 155 | 55225/1240 = **44.54** | 80/2−6 = 34 | 1.31 | no, by +10.54 |
| 3 cycle 2 | 175 | 205 | 30625/1640 = **18.67** | 34 | 0.55 | **yes**, by −15.33 |
| 4 `duck-trail4` | 410/3 = 136.67 | 170 | 18677.8/1360 = **13.73** | 29 × (1 → 0.85) = 29 → 24.65 | 0.48 at the first crest | **yes**, by −14.91 |

So **step 4 folds harder than the shipped `duck-trail2`** — ratio 0.48 against 0.79, deficit
−14.9 against −8.1 — and step 3's second cycle is the second worst. The proposal's "R 13.7 vs
band 29" is confirmed; its "R 30.9 vs 39" for step 2 is confirmed.

### Decision: assert the universal containment bound, not a wave-shaped variant of the U predicate

**Choice**: a new assertion in `buildLevel.test.ts` over every catalog level with a corridor —

> every point `pushBand` pushes lies within `band` of its level's own centreline, i.e. inside
> the drawn channel with at least `BAND_INSET` of clearance, folded or not

— plus a second, *documentary* assertion naming which duck crests fold and which do not.

**Alternatives considered**: importing `uTurnRadius`'s predicate shape and asserting
`waveCrestRadius > band` for every duck level (it is false for three of the four, so the
change could not ship); asserting the proposal's crest-local claim ("folded points land at
`y_crest ± band`, inside the drawn channel"); leaving the fold unasserted as it is today.

**Rationale — and this is the part the proposal did not reach.** `pushBand`
(`buildLevel.ts:55-82`) pushes each sample to `c(i) ± half·n̂(i)` with
`half ≤ band = corridorWidth/2 − BAND_INSET`. Every pushed point is therefore at distance
exactly `half` from a point that is ON the centreline, so its distance to the centreline is
`≤ half < corridorWidth/2`. **The ideal cloud can never leave the stroked channel, at any
curvature, on any generator, under any taper, at any `widthFactor`** — because `band` is
derived from the same `corridorWidth` the channel is stroked at (`buildLevel.ts:160`). The
proposal's "a crest has no adjacent arm" is true but is a property of the wave; the bound
above is a property of `pushBand` and holds for the garlands too.

What folding actually costs is bounded and one-directional, and three shipped facts pin it:

- **The corridor walls never see the cloud.** Wall contact, the tone, the haptic pulse and
  `resetOnContact` all ride `corridorTick`'s LOCAL distance to `target.polyline` against
  `target.corridorWidth / 2` (`LevelPlay.tsx:921-940`). A folded cloud cannot make a wall
  softer or a reset later.
- **Scoring is a nearest-point union** (`validation/score.ts:32-52`,
  `evaluateLevel.ts:137`), so a fold is a union that is *slightly generous* at a crest —
  never smaller, never a hole, never `NaN`. That is the ruling the nivel-3 design already
  recorded verbatim (`archive/2026-09-12-nivel3-agua-medusa/design.md:223-229`), for
  `widthFactor: 2`, where **every** garland level folds including the two shipped.
- **The generosity is locally bounded by `half`.** Writing the crest as `Y = kX²` with
  `k = 4A/w²`, the concave offset is `Y(X) = kX² + half/√(1+4k²X²)`; `dY/dX = 0` at `X = 0`,
  and when `half > R` the vertex is a local MAXIMUM **[derived]**. So the deepest the folded
  band reaches below a crest is exactly `half` — the same value it reaches on a straight
  stretch. A fold redistributes cloud density; it does not extend reach.

The cost is paid on the CONVEX side, where consecutive offset samples spread by
`1 + half/R`. Worst case is step 4: `1 + 27/13.73 = 2.97×` on a centreline pitch of
`2271/600 = 3.79` units **[derived]**, giving 11.2 units between outer samples, so a point
mid-gap is 5.6 from the nearest — against `AREA_GRACE = 3` and `TolTouch = 26`
(`validation/constants.ts:9,14`). Immaterial.

**Falsifiability**: the containment test is paired with a row asserting the bound is TIGHT —
the same predicate at `band − 1` must fail for `duck-trail2` — so it can never pass
vacuously. That is the lesson of `verify-report.md`'s five assertions that shipped unable to
fail.

**Conclusion: the fold is benign and no number in decision 1 changes on account of it.**

---

## 3. The backdrop layer

### 3.1 Decision: the channel paint is FORCED, not chosen

Using the repo's own Rec. 601 `luma` (`palette.test.ts:31-36`), all **[derived]** from the
shipped hex literals:

| Paint | Hex | luma |
|---|---|---|
| lagoon quiet band | `#b4c5d0` (180, 197, 208) | **193.2** *(proposal: 194.2)* **[corrected]** |
| `CORRIDOR_EARTH` | `#d9c3ae` | 199.2 → separation **6.0** *(proposal: 4.0)* **[corrected]** |
| `SHEET_PAPER` | `#fdfcf7` | 251.7 → separation **58.5**, clearing `docs/09:158`'s 55 by **3.5** |
| `GROUND_FIELD` | `#c9d7bd` | 207.9 → 14.7 |
| `MAZE_WALL` | `#e2e8f0` | 231.1 → 37.9 |
| `CLUE_DRAINED` | `#838383` | 131.0 |
| `INK_COLOR` | `#1e293b` | 39.8 |

Three laws bind a channel painted over this water, and they leave exactly one window
**[derived]**:

```
vs the backdrop (docs/09:158, ≥ 55)        L ≥ 248.2  or  L ≤ 138.2
vs CLUE_DRAINED (MIN_DRAINED_GROUND_CONTRAST = 55, palette.test.ts:67)
                                            L ≥ 186.0  or  L ≤  76.0
vs the child's own ink, readability floor   L ≥  94.8
                                            ─────────────────────────
intersection                                L ∈ [248.2, 255]
```

The dark window `L ≤ 76` survives the first two laws and is killed by the third: a channel
that dark leaves the child's own `#1e293b` line at most 36 luma from the ground it is drawn
on. `SHEET_PAPER` at 251.7 is inside the surviving 6.8-luma window and is the only token in
the palette that is. **So the channel is not repainted to paper as a taste call; paper is the
only admissible value.** That sentence, and this arithmetic, is what the test in §3.5
encodes.

Every duck clue colour also clears paper comfortably, so extending
`palette.test.ts:128-136`'s ground set with `SHEET_PAPER` is a passing, cheap extension that
makes the law true for the new ground rather than for the one it replaced **[derived]**:
`BUBBLE` 153 (99), `BREADCRUMB` 117 (135), `PLUME` 87 (165), `PRINT` 0 (252), `POND` 100
(152), `KERNEL` 146 (106) — all clear `MIN_GROUND_CONTRAST = 40`; `CLUE_DRAINED` clears
`MIN_DRAINED_GROUND_CONTRAST = 55` at 121. **This is exactly the `CLUE_DRAINED` failure mode
of 2026-09-12** — a correct value whose context moved out from under it — caught this time
before it ships.

### 3.2 Decision: full-bleed, the ZooMap layering verbatim; the corridor's overflow is named and measured

**Choice**: the backdrop is one flat `<rect>` in the sector's quiet colour and one
`<image href>` on the whole sheet with `preserveAspectRatio="xMidYMid slice"` **on the image,
never on the root `<svg>`** — the exact four lines of `ZooMap.tsx:198-211`. Crop **[derived]**:
`scale = max(1000/1536, 600/1024) = 0.651042` (width-bound), rendered 1000 × 666.67, centred
→ source rows 51…973 survive, 5.0 % off the top and bottom.

**Alternatives considered**: laying the image on an oversized box so its quiet band covers
the whole corridor excursion; `preserveAspectRatio="none"`.

**Rationale, with the arithmetic that decided it.** `docs/13` §4.3 asks for the corridor over
"una franja central que el dibujo deja tranquila". The lagoon's drawn quiet band is source
rows ≈ **200…810** **[estimated]**, which `imageToViewBox` puts at viewBox **[96.9, 494.0]**.
The corridors reach further than that:

| Level | route | `cw`/2 | channel | overflow vs [96.9, 494.0] |
|---|---|---|---|---|
| `duck-trail1` | 130…470 | 50 | 80…520 | 16.9 top / 26.0 bottom |
| `duck-trail2` | 130…470 | 45 | 85…515 | 11.9 / 21.0 |
| `duck-trail3` | 95…505 | 40 | **55…545** | **41.9 / 51.0** |
| `duck-trail4` | 130…470 | 35 | 95…505 | 1.9 / 11.0 |

This is a real finding the proposal missed: it sampled rows 42–58 % and found one flat colour,
but the channel does not stay in rows 42–58 %. **It is not resolvable by geometry.** The
phase-1 guard needs `2A > 300`, so a level needs `2A + cw` of vertical room — 400 units at
step 1's `cw = 100` — against a drawn quiet band of ≈ 397. The band and the route budget are
the same size to within the measurement error, and step 1 alone is short by ≈ 3.

The oversized-box alternative *was* computed and rejected on the picture. To fit step 3's
490-unit channel inside a 610-row band needs `scale ≥ 0.803`; at `scale = 0.850` the sheet
shows only source rows 152…858, which leaves **48 of the top band's 200 reed rows and 48 of
the bottom band's 214** — the reeds and the bank, the two things that make the lagoon read as
a place, are cropped away to buy clearance. `preserveAspectRatio="none"` is worse on both
counts: it distorts the drawing and it makes the band *thinner* (rows 200…810 → [117.2,
474.6]).

So the overflow is **accepted, bounded and measured**, not hidden. It is cheap in contrast
terms: what sits immediately outside the water line is the bank's black `ART_OUTLINE` contour
and the reed greens, all far darker than 193, so the paper channel reads *better* there, not
worse. The one thing that could break it is the pale stones in the top reed band and the sand
at the bottom — which is exactly why §3.5's law is asserted against the LIGHTEST colour under
the corridor rather than against the water. Steps 1, 2 and 4 overflow by 12–26 units of a
90–100-unit channel — the outermost edge grazing the first stems. Step 3 is the outlier, and
the remedy if the measurement fails is named in §3.5 and in Open Questions.

### 3.3 The registries

Two new leaf modules under `client/src/zoo/`, both pure, no React.

```ts
// client/src/zoo/adventures.ts
/** One adventure of `docs/13` §2: one animal, one movement, its levels in play
 *  order, and the two things the Pulpito says about it. Rows C-H each add ONE
 *  entry here and change no code. */
export interface Adventure {
  /** In play order. `levelIds[0]` is where the narrative entry shows. */
  levelIds: readonly string[]
  sector: SectorId
  animal: AnimalId
  /** The Pulpito's line on the entry screen. */
  intro: string
  /** His line on the map once this adventure's animal is standing in the zoo. */
  closing: string
}

export const ADVENTURES: readonly Adventure[] = [
  {
    levelIds: ['duck-trail1', 'duck-trail2', 'duck-trail3', 'duck-trail4'],
    sector: 'estanque',
    animal: 'pato',
    intro: 'El pato se fue por la laguna. ¿Lo seguimos?',
    closing: '¡Encontramos al pato! Ya está en su laguna.',
  },
]

export function adventureFor(levelId: string): Adventure | undefined
/** True only for `levelIds[0]` — the entry belongs to the ADVENTURE, not to
 *  each challenge (`docs/13` §5). */
export function introLevel(levelId: string): Adventure | undefined
/** The bubble on the map: its picture and its word, together, always. */
export function mapBubble(sector: ZooSector, records: Records): { art: ArtImage; label: string }
```

```ts
// client/src/zoo/backdrops.ts
export interface SectorBackdrop {
  art: ArtImage
  /** The still colour of the band the drawing leaves quiet, hand-copied from
   *  the manifest. Fills the rect UNDER the art and the letterbox bars. */
  quiet: string
  /** The LIGHTEST colour anywhere the corridor is painted over, sampled at
   *  build time across `corridorRows`. `docs/09:158`'s law is asserted against
   *  THIS, never against `quiet` — the quiet colour alone would flatter it. */
  brightest: string
  /** The source rows a corridor in this sector can reach. Authored from the
   *  widest channel through `viewBoxToImage`, and asserted to cover every
   *  adventure level the sector owns. */
  corridorRows: { top: number; bottom: number }
}

export const SECTOR_BACKDROP: Partial<Record<SectorId, SectorBackdrop>> = {
  estanque: {
    art: SECTOR_BACKGROUND_ART.lagoon,
    quiet: '#b4c5d0',
    brightest: '#b4c5d0',   // MEASURED: see "Measured facts" at the end
    corridorRows: { top: 135, bottom: 889 },   // duck-trail3's 55…545 [derived]
  },
}

/** The backdrop a LEVEL is drawn on: its adventure's sector's backdrop, or
 *  `undefined`. */
export function backdropFor(levelId: string): SectorBackdrop | undefined {
  const adventure = adventureFor(levelId)
  return adventure ? SECTOR_BACKDROP[adventure.sector] : undefined
}
```

### Decision: the backdrop is keyed through the ADVENTURE, not through `sectorOf` alone

**Choice**: `backdropFor = SECTOR_BACKDROP[adventureFor(levelId)?.sector]`.

**Alternatives considered**: the proposal's `SECTOR_BACKDROP[sectorOf(levelId)?.id]`.

**Rationale — this is a trap, not a preference.** `estanque.adventureIds`
(`sectors.ts:317-328`) is **eight** ids: the duck's four AND the medusa's `f2-guirnalda`,
`f2-agua2..4`. `sectorOf('f2-agua2')` therefore returns the estanque, so keying on the sector
alone would give the four medusa levels the lagoon backdrop, repaint their channels and
**suppress their scattered ground** — breaking the proposal's own explicit out-of-scope
guarantee (`docs/13` §4 marks the medusa *Hecha — Nada*). Routing through `ADVENTURES` means a
level opts in only when its adventure has actually been recut for the backdrop, which is
`docs/13` §4.3's own sentence — *"se retiran cuando entre el fondo de cada sector"* — written
into the engine once. When the medusa gets its row, it inherits the lagoon and loses its
scatter with no further code.

### 3.4 The canvas

`TraceCanvas` gains one structural prop — no import from `zoo/` or `detective/`, the same
convention `TraceCarrierArt` follows (`TraceCanvas.tsx:311-322`):

```ts
/** The sector's drawn place, laid UNDER the maze block. Presence of this prop is
 *  the whole switch: the full-sheet wall rect is skipped (the backdrop IS the
 *  wall) and the channel is stroked in `SHEET_PAPER` whatever `ground` says,
 *  because `CORRIDOR_EARTH` fails `docs/09:158` against water by 49. */
export interface TraceBackdrop {
  href: string
  /** Painted flat under the art so a slow image never flashes a bare sheet. */
  quiet: string
}
backdrop?: TraceBackdrop
```

**Insertion point**: between the base rect (`:844-864`) and the maze block (`:865`). It is the
only position that works — after the maze block the wall rect would already have covered it;
before the base rect the base rect would cover it.

```tsx
{backdrop && (
  <g pointerEvents="none">
    <rect x={0} y={viewBoxY} width={viewBoxWidth} height={viewBoxHeight} fill={backdrop.quiet} />
    <image
      href={backdrop.href}
      x={0}
      y={viewBoxY}
      width={viewBoxWidth}
      height={viewBoxHeight}
      preserveAspectRatio="xMidYMid slice"
    />
  </g>
)}
```

**Four conditionals change, and nothing else:**

| Line | From | To | Why |
|---|---|---|---|
| `:865` | `corridor && (mazeOn \|\| ground)` | `corridor && (mazeOn \|\| ground \|\| !!backdrop)` | rows C-H's medusa is `maze: false`; without this its channel would fall through to the soft `CORRIDOR_FILL` grey-blue over water — the exact defect the `\|\| ground` clause was added for (`:879-886`) |
| `:901` | `{mazeOn && (<rect … />)}` | `{mazeOn && !backdrop && (<rect … />)}` | a full-sheet rect after the backdrop hides the backdrop everywhere except inside the channel — the exact opposite of the feature |
| `:916`, `:927` | `stroke={ground ? CORRIDOR_EARTH : SHEET_PAPER}` | `stroke={ground && !backdrop ? CORRIDOR_EARTH : SHEET_PAPER}` | §3.1 |
| `:969` | `corridor && !mazeOn` | `corridor && !mazeOn && !backdrop` | otherwise a `maze: false` backdrop level paints the channel twice |

**What `maze: true` still means for a duck level**: `guide={showShapeLine && !level.maze}`
(`LevelPlay.tsx:1210`) and `showCentreLine={showCorridor && !level.maze}` (`:1217`) — no shape
line, no centre line, the corridor read as a channel rather than a hint. Only the solid paint
yields. All four `LevelConfig`s keep `maze: true`.

`LevelPlay` resolves the prop and suppresses the ground:

```ts
const backdrop = useMemo<TraceBackdrop | undefined>(() => {
  const b = backdropFor(level.id)
  return b ? { href: b.art.href, quiet: b.quiet } : undefined
}, [level.id])

const ground = useMemo<TraceGround | undefined>(() => {
  if (!inWorld || !corridor || backdrop) return undefined   // ← §F, backdrop-scoped
  …unchanged…
}, [inWorld, corridor, backdrop, level.taper, target.polyline, target.viewBoxWidth])
```

and the page background follows the sheet's own edge, the same `docs/09` §7 rule
`.cv-play-ground` already encodes for grass (`LevelPlay.tsx:259-262`). `quiet` is per-sector
data, so it cannot be a CSS class:

```tsx
<main
  className={ground ? 'cv-play cv-play-ground' : 'cv-play'}
  style={backdrop ? { background: backdrop.quiet } : undefined}
>
```

### 3.5 What protects the 3.5-luma margin

Five things, in the order they fire.

1. **The constant is DERIVED, not eyed.** `build_art.py`'s `PASSTHROUGHS` table gains a
   per-backdrop row range, and `emit_opaque_canvas` emits two extra manifest fields for those
   entries: `quiet` (the modal colour of the middle 40 % of rows) and `brightest` (the
   MAXIMUM-luma pixel colour across `corridorRows`). ~25 lines, one existing function, no new
   invocation surface.
2. **Drift is loud.** `artManifest.test.ts` already asserts registry↔manifest parity for
   `w`/`h` and exists precisely because "two copies of the same numbers drift silently"
   (`:1-15`). It gains the same parity for `quiet` and `brightest`. A re-muted lagoon changes
   the manifest, breaks parity, and forces a human to re-copy the value — at which point (3)
   fails on the new one. **That feedback loop is the thing the `CLUE_DRAINED` defect lacked.**
3. **The law is a pure function over declared colours, runnable with no DOM.** In
   `client/src/zoo/backdrops.test.ts`, importing `luma` — which this change **moves from
   `palette.test.ts:31-36` into `palette.ts` as an exported function**, carrying its
   rounds-where-the-pipeline-floors comment with it, so both suites read the same one:

   ```ts
   const MIN_BACKDROP_CONTRAST = 55   // docs/09:158
   it('separates the corridor paint from the lightest thing it is painted over', () => {
     for (const [id, b] of Object.entries(SECTOR_BACKDROP)) {
       expect(Math.abs(luma(SHEET_PAPER) - luma(b.brightest)), id)
         .toBeGreaterThanOrEqual(MIN_BACKDROP_CONTRAST)
     }
   })
   it('goes red for the paint it replaced — which is WHY it replaced it', () => {
     expect(Math.abs(luma(CORRIDOR_EARTH) - luma(SECTOR_BACKDROP.estanque!.quiet)))
       .toBeLessThan(MIN_BACKDROP_CONTRAST)          // 6.0
   })
   ```

   The second row is the falsifiability proof and the record of the decision in one.
4. **The sampled rows provably cover the corridor.** `zoo/sectors.ts` gains
   `viewBoxToImage(vbX, vbY)`, the exact inverse of the existing `imageToViewBox`
   (`sectors.ts:147-156`) over the same `MAP_IMG_W/H` constants — honouring that function's
   own instruction that *"pasos B-H … should push their samples through the function this
   change's numbers came from, not re-derive the factor"*. A round-trip test pins the pair.
   Then, for every level of every adventure whose sector has a backdrop:
   `viewBoxToImage(0, channelTop).y ≥ corridorRows.top` and
   `viewBoxToImage(0, channelBottom).y ≤ corridorRows.bottom`, with `channelTop/Bottom`
   measured from `buildLevelTarget(level).polyline` ± `corridorWidth/2 · max(taper.from, 1)`.
   So `brightest` is sampled over exactly what the child's channel crosses.
5. **A capture, because 3.5 luma is a number and legibility is a screenshot** (`docs/12` §4).

**If the measurement fails** — i.e. `brightest` comes back above ≈ 196.7 — there is no second
paint to reach for: §3.1's window is 6.8 luma wide and `SHEET_PAPER` is already in it, and
pure white buys only 3.3 more. The remedy is geometric and it is one literal: pull
`duck-trail3`'s second cycle from `amplitude: 205` to `185`, which gives route 115…485,
channel 75…525 — in line with steps 1 and 2 — while keeping span 370 > 300, minY 115 < 180,
maxY 485 > 420, and a peak slope of 4.23 that still sits strictly between step 2's 3.32 and
step 4's 4.98. That is a change to decision 1, so it is an Open Question, not a licence.

---

## 4. The narrative entry

### Decision: `resolveEnterAction` returns a `GameView`, and `nextView` is byte-unchanged

```ts
// client/src/screen/GameScreen.tsx — beside resolveNextAction (:162-168)
export type GameView =
  | { view: 'map'; finished: boolean }
  | { view: 'play'; levelId: string }
  | { view: 'intro'; levelId: string }     // ← new
  | { view: 'deduce'; caseId: string }

/** Where a tap on the map LANDS. The mirror of `resolveNextAction`: `nextView`
 *  must stay catalog- and sector-independent (its own header, :45-53), so this
 *  is where the adventure registry and routing meet. `records` is unused today
 *  — hence the leading `_`, `noUnusedParameters` — and is kept for the same two
 *  reasons `resolveNextAction` keeps it: the call site already has it, and paso
 *  D's unlock rules will need it. */
export function resolveEnterAction(
  levelId: string,
  _records: Readonly<Record<string, LevelRecord>>,
): GameView {
  return introLevel(levelId) ? { view: 'intro', levelId } : { view: 'play', levelId }
}
```

**Alternatives considered**: a fourth `GameAction` member; folding the intro into
`LevelPlay`'s `phase` state; a `NextAction`-style sibling union.

**Rationale**: `nextView` switches on `action.type`, never on `state.view`, so adding a
`GameView` variant leaves its exhaustiveness intact and its body **byte-identical** — the
variant is simply a state no action produces. Its one `state.view` read (`:66`, the
`back`/`reset` case) already handles "anything that is not an unfinished map" correctly. A
`GameAction` member, by contrast, would force the reducer to grow a case, which is the exact
argument `ExitAction` already won (`archive/…/design.md:560-570`). `LevelPlay`'s `phase` is
per-attempt and the component remounts per level (`key={state.levelId}`,
`GameScreen.tsx:216`), so an intro there would replay after every `resetOnContact`.

`GameScreen` gains one branch, and its exit is an ordinary `play` dispatch, so `nextView`
keeps doing the routing:

```tsx
if (state.view === 'intro') {
  const adventure = introLevel(state.levelId)
  if (adventure) {
    return (
      <AdventureIntro
        adventure={adventure}
        onStart={() => dispatch({ type: 'play', levelId: state.levelId })}
      />
    )
  }
  // unknown id: fall through to play, the never-crash convention `getLevel` uses
}
```

`App.tsx:71-75` becomes:

```tsx
onEnter={(levelId: string) => {
  setTrip((n) => n + 1)
  setShell({ at: 'game', initial: resolveEnterAction(levelId, records) })
}}
```

`records` is already `App`'s own state (`:54`). Nothing else in `App` moves.

**Frequency, and why `key={trip}` is the mechanism rather than a hazard.** `App` bumps `trip`
on every `onEnter`, so `GameScreen` remounts and re-reads `initial` in its lazy initialiser
(`:196-205`) — the intro shows **every** time the child enters `duck-trail1` from the map, no
persisted key, no migration, and no way to strand a returning child in front of a story they
can no longer reach. Once through, `dispatch` moves the view inside the same mount, so
finishing or restarting a level cannot replay it: `LevelPlay`'s own remount is one level
down. And in practice it is once per adventure, because `resolveNextAction` exits every duck
level to the map and `nextAdventure` then resolves the first *unfiled* id — `duck-trail2`
onward, which `introLevel` does not match. `?nivel=duck-trail1` still goes straight to play:
`initialView` is untouched, and the deep link exists to review mechanics.

### Decision: the entry is one registry row rendered by one component

```tsx
// client/src/screen/AdventureIntro.tsx
export interface AdventureIntroProps {
  adventure: Adventure
  onStart: () => void
}
```

```tsx
<main className="cv-intro" style={{ background: /* sector quiet colour or SHEET_PAPER */ }}>
  <style>{INTRO_CSS}</style>
  <button type="button" className="cv-intro-stage" onClick={onStart}>
    <img src={ZOO_OCTOPUS_BACKPACK_ART.href} alt="" className="cv-intro-octopus" />
    <span className="cv-intro-bubble">
      <img src={ZOO_SPEECH_BUBBLE_ART.href} alt="" />
      <CaptionedArt art={ANIMAL_ART[adventure.animal]} label={adventure.intro} size={76} />
    </span>
  </button>
</main>
```

That is `docs/13` §5 item 1 literally — *"una pantalla con el Pulpito, el bocadillo y la
imagen del animal; se toca para empezar"* — and it is `ZooMap.tsx:341-360`'s bubble, reused
rather than reinvented. The animal is the CAPTION's picture, not a fourth image: the word and
the thing it names arrive welded, which is the point of `docs/12` §3's *"nunca una palabra
sola sin su imagen"*.

**Why the audit passes**: `auditCaptions` licenses text only inside a container whose class is
in `CAPTION_CONTAINERS` and which itself carries an `<image href>` (`captionAudit.ts:23,
136-142`). `CaptionedArt` emits `<span class="cv-captioned">` containing an SVG `<image href>`
and the `<span class="cv-caption">` — so the one phrase on the screen sits in the one
container licensed to hold it. `label` is required at type level, so the screen cannot ship
wordless either. The bubble backdrop and the octopus are `<img src>`, which the audit counts
as images (`:136`) and which is this repo's "every picture is a real image node" convention.
No `aria-label` on the button: the caption already gives it its accessible name, and an
`aria-label` would override the only sentence on the screen.

`CaptionedArt` styling follows the map's own fix verbatim — the stage is a percentage box with
`container-type: inline-size`, the caption is `cqw`, `.cv-captioned > svg` gets `flex: none`,
and `INTRO_CSS`'s comments carry **no backticks** (it is a template literal; a backtick inside
one ends the string — a trap that already cost a red build).

**Testing, with no DOM**: `renderToString(<AdventureIntro adventure={ADVENTURES[0]} onStart={()=>{}} />)`
and assert on the string — the three hrefs present; the intro line present exactly once;
`auditCaptions(html).uncaptioned` is `[]` and `.imagelessContainers` is `[]`; zero occurrences
of `url(#`; plus one hand-built failing row (the phrase outside `cv-captioned`) proving the
audit assertion can go red. `introLevel` / `adventureFor` are tested as pure functions:
`duck-trail1` → the row; `duck-trail2..4` → `adventureFor` yes, `introLevel` no; `trail1` and
`f2-agua2` → neither.

---

## 5. The closing

`resolveNextAction` already exits every duck level to the map; `animalPlacements` already
stands the duck at `{x:735, y:200}` once `duck-trail4` is filed; `footprintTrail`, the fog and
the HUD already render. The one gap is `ZooMap.tsx:354-358`'s constant phrase, shown whenever
a sector is discovered — after the ducks are done it still points the child onward instead of
closing anything.

**Choice**: a pure selector, and the picture changes with the word.

```ts
// client/src/zoo/adventures.ts
const ONWARD = { art: ZOO_OCTOPUS_PRINT_ART, label: '¡Mirá! Las huellas van hacia allá. ¿Vamos?' }

/** What the Pulpito says about the sector the huellas point at. Once that
 *  sector's animal is standing in the zoo the line CLOSES its adventure
 *  (`docs/13` §5 item 6) instead of pointing onward — and the bubble's picture
 *  becomes the recovered animal, because in this app the word never travels
 *  alone (`docs/12` §3). */
export function mapBubble(sector: ZooSector, records: Records): { art: ArtImage; label: string } {
  const recovered = ADVENTURES.find(
    (a) => a.sector === sector.id && animalPlacements(sector, records).some((p) => p.art === ANIMAL_ART[a.animal]),
  )
  return recovered
    ? { art: ANIMAL_ART[recovered.animal], label: recovered.closing }
    : ONWARD
}
```

`ZooMap` then collapses to one call:

```tsx
{discovered && (
  <div className="cv-zoo-bubble">
    <img src={ZOO_SPEECH_BUBBLE_ART.href} alt="" />
    <CaptionedArt {...mapBubble(discovered, records)} size={76} />
  </div>
)}
```

The bubble keeps rendering after `duck-trail4` because `recentlyDiscovered` still returns the
estanque (the medusa's four ids are unfiled), so there is no new visibility rule to write.

**Testing**: `mapBubble` carries the weight, exhaustively and with no DOM — empty records →
`ONWARD`; `duck-trail4` filed → the duck art and the closing line; a sector with no adventure
row → `ONWARD`. `ZooMap.test.tsx` then only asserts that the resolved label appears in the
rendered string, before and after, which is the house rule: extract the decision, test the
decision, let the component test prove the wiring. Asserting on `animal-pato.png` inside the
component test would be ambiguous — the same href is already in the SVG world and the HUD when
the duck is recovered.

---

## Data Flow

```
                   ADVENTURES[] ──adventureFor──▶ SECTOR_BACKDROP ──backdropFor──┐
                        │                                                        │
                        ├──introLevel──▶ resolveEnterAction ──▶ App.onEnter       │
                        │                     │                                  │
                        └──mapBubble──▶ ZooMap bubble                            │
                                              ▼                                  ▼
  cursiva.levels.v1 ─▶ records ─▶ GameScreen { view:'intro' } ─▶ AdventureIntro   │
                                              │ dispatch play                    │
                                              ▼                                  ▼
                                         LevelPlay ──────────────────────▶ TraceCanvas
                                              │  backdrop ⇒ ground=undefined,  backdrop
                                              │            page bg = quiet      ├─ rect quiet
  catalog.ts ─▶ buildLevelTarget ─▶ target ───┘                                 ├─ image slice
       │            │                                                           ├─ (no wall rect)
       │            └─ pushBand(band = cw/2 − 6) ─▶ ideal cloud ─▶ score()       └─ channel SHEET_PAPER
       └─ waveVaried / wave                          (never leaves the channel — §2)
```

## File Changes

| File | Action | Description |
|---|---|---|
| `client/src/levels/paths.ts` | Modify | `WaveCycle`, `waveVaried`, `waveCrestRadius` |
| `client/src/levels/paths.test.ts` | Modify | five `waveVaried` rows + `waveCrestRadius` |
| `client/src/levels/catalog.ts` | Modify | `duck-trail3` path/title/hint/continuity; `duck-trail4` path/hint/taper; the stale §3 comments replaced |
| `client/src/levels/catalog.test.ts` | Modify | delete `:697-709`; add the six-row undulation-family describe |
| `client/src/levels/buildLevel.test.ts` | Modify | the §2 containment bound + its tightness row + the fold ledger |
| `client/src/zoo/adventures.ts` (+`.test.ts`) | Create | `Adventure`, `ADVENTURES`, `adventureFor`, `introLevel`, `mapBubble` |
| `client/src/zoo/backdrops.ts` (+`.test.ts`) | Create | `SectorBackdrop`, `SECTOR_BACKDROP`, `backdropFor`, the luma law + falsifiability, the `corridorRows` coverage proof |
| `client/src/zoo/sectors.ts` (+`.test.ts`) | Modify | `viewBoxToImage`, the inverse of `imageToViewBox`, + round-trip test |
| `client/src/detective/palette.ts` | Modify | `luma` moves here from `palette.test.ts` and is exported |
| `client/src/detective/palette.test.ts` | Modify | imports `luma`; `SHEET_PAPER` joins the ground set |
| `client/src/canvas/TraceCanvas.tsx` (+`.test.tsx`) | Modify | `TraceBackdrop` + the layer + the four conditionals of §3.4 |
| `client/src/screen/LevelPlay.tsx` (+`.test.tsx`) | Modify | resolve `backdrop`; `ground` suppression; page background |
| `client/src/screen/AdventureIntro.tsx` (+`.test.tsx`) | Create | the narrative entry |
| `client/src/screen/GameScreen.tsx` (+`.test.tsx`) | Modify | `GameView` `'intro'`; `resolveEnterAction`; one render branch |
| `client/src/App.tsx` (+`.test.tsx`) | Modify | `onEnter` routes through `resolveEnterAction` |
| `client/src/screen/ZooMap.tsx` (+`.test.tsx`) | Modify | the bubble reads `mapBubble` |
| `client/src/detective/artManifest.test.ts` | Modify | `quiet`/`brightest` manifest parity |
| `scripts/art/build_art.py` | Modify | sample `quiet`/`brightest` per backdrop row range |
| `client/src/screen/GameScreen.tsx` `nextView` | **Unchanged** | byte-for-byte; the new variant is a state no action produces |
| `client/src/detective/cases.ts`, `Deduction.tsx`, the clue registry | **Unchanged** | `docs/13` §4 decision 1 |
| `client/public/art/*` | **Unchanged** | no art is generated |

## Testing Strategy

| Layer | What | Approach |
|---|---|---|
| Unit (pure) | `waveVaried` | `M`/`C` only; survives `transformPath`, throws on an appended `A`; a uniform list reproduces `wave()`'s `d` with `toBe`; extrema exactly at `y ∓ amplitude` per cycle; first extremum above `y` |
| Unit (pure) | `waveCrestRadius` | reproduces `w²/8A` on the four duck literals |
| Unit (data) | the duck family | the six-row table of §1 |
| Unit (geometry) | `pushBand` containment | every cloud point of every corridor level is within `band` of its own centreline; the same predicate at `band − 1` FAILS for `duck-trail2` (tightness); the fold ledger records which crests fold |
| Unit (pure) | the luma law | `\|luma(SHEET_PAPER) − luma(brightest)\| ≥ 55` per backdrop; the `CORRIDOR_EARTH` row goes red (falsifiability) |
| Unit (pure) | `corridorRows` coverage | every backdrop level's channel maps inside the sampled rows, through `viewBoxToImage` |
| Unit (pure) | `viewBoxToImage` | round-trips `imageToViewBox` |
| Unit (pure) | `backdropFor` | defined for the four duck ids; **undefined for `f2-guirnalda`, `f2-agua2..4`** and for `trail1..4` — the medusa regression guard |
| Unit (pure) | `adventureFor` / `introLevel` / `mapBubble` | §4 and §5 |
| Unit (pure) | `resolveEnterAction` | `duck-trail1` → `intro`; `duck-trail2..4`, `trail1`, `f3-a` → `play`; unknown id → `play` |
| Component | `TraceCanvas` | with `backdrop`: the `<image>` carries `xMidYMid slice`, the wall rect is absent, every channel `stroke` is `SHEET_PAPER`, the `quiet` rect is present, zero `url(#`. Without it: markup byte-identical to today for a `ground` maze and for a plain maze |
| Component | `LevelPlay` | `duck-trail2` → zero `GROUND_GRASS`/`GROUND_MUD` hrefs and the `quiet` page background; **`f2-agua2` → its grass and mud hrefs still present, unchanged** |
| Component | `AdventureIntro` | three hrefs; the line once; `auditCaptions` clean both fields; a hand-built failing row; zero `url(#` |
| Component | `ZooMap` | the onward label before `duck-trail4` is filed, the closing label after |
| Component | `App` | entering `duck-trail1` renders the intro, not the trail; entering `duck-trail2` renders the trail |
| Screenshot (human) | `scripts/shot.sh` → `capturas/` | non-negotiable, `docs/12` §4 — see below |

**Which invariants only a screenshot can catch.** Whether the paper channel is legible on
water at 3.5 luma of margin (a number is not legibility); whether the channel slicing into the
reeds at the crests reads as a path through the reeds or as damage; whether the drained clue
marks are findable on paper over water; whether the duck's four levels read as ONE movement
getting harder; whether the entry screen's bubble lands on the Pulpito rather than over him.
Required captures: the entry screen; each of the four duck levels; one mid-trace frame with
ink and clue marks over the water; the map before and after `duck-trail4` is filed; and **one
medusa level proving its scattered ground survives**.

## Threat Matrix

N/A — no HTTP/shell routing, no subprocess, no VCS/PR automation, no executable-file
classification, no process-integration boundary. `scripts/art/build_art.py` is an existing
offline build script whose invocation surface is unchanged: this change adds pixel sampling
inside a function it already runs, and adds no argument, no path input and no new caller. The
rest is rendering, pure geometry, and one read of `localStorage`.

## Migration / Rollout

**No migration.** No new key, no schema change, no store method, no level id moves. Every
rollback lever the proposal names still works by construction: emptying `SECTOR_BACKDROP`
restores the wall rect, the earth channel and the scattered ground in one edit, because every
consumer is keyed on `backdropFor` returning something; emptying `ADVENTURES` sends
`resolveEnterAction` straight to `play` and `mapBubble` back to the constant phrase; restoring
the two `catalog.ts` generator calls restores the two levels, and `waveVaried` ships unused
without affecting anything.

## Review-budget forecast

The proposal forecast **~850** lines against a cached `single-pr` budget of **800**. This
design adds four items it did not scope — `build_art.py` sampling and its manifest parity
(~45), `viewBoxToImage` and the `corridorRows` coverage proof (~40), the `pushBand`
containment test (~35), and the `palette.ts` `luma` move plus the `SHEET_PAPER` ground row
(~20) — and removes none. **Revised: ~990.** `sdd-tasks` owns the binding forecast; the seam
the proposal named still holds and is now clearly warranted:

| Slice | Contents | ~Lines |
|---|---|---|
| B1 | `paths.ts`, `catalog.ts`, `catalog.test.ts`, `buildLevel.test.ts` | 260 |
| B2 | `zoo/backdrops.ts`, `zoo/sectors.ts`, `palette.ts`, `build_art.py`, `TraceCanvas`, `LevelPlay` | 375 |
| B3 | `zoo/adventures.ts`, `AdventureIntro`, `GameScreen`, `App`, `ZooMap` | 355 |

B1 → B2 → B3 is dependency order and each is green on its own. B2 must not merge before its
capture is read: §3.2's overflow and §3.5's margin are both screenshot-gated.

## Open Questions

- [ ] **The lagoon's quiet-band rows are estimated, not sampled.** ≈ 200…810 of 1024 was read
      off the rendered PNG; this phase has no shell. `sdd-apply` must sample them and re-derive
      the §3.2 overflow table. Every conclusion in §3.2 is stable under ±20 rows; none of them
      is stable under ±100.
- [ ] **`brightest` is unmeasured, and it is the one number that can force decision 1 open
      again.** If the lightest colour across source rows 135…889 exceeds ≈ 196.7 luma, the
      paper channel fails `docs/09:158` and §3.5's remedy applies: `duck-trail3`'s second
      cycle goes from `amplitude: 205` to `185`. That is a change to a settled decision and
      needs the orchestrator, not `sdd-apply`.
- [ ] **Does the channel crossing the reeds read as a path or as damage?** Steps 1, 2 and 4
      overflow the drawn quiet band by 12–26 units; step 3 by 42–51. The contrast improves
      there (the bank contour is `ART_OUTLINE`), so only a capture can answer it. If step 3
      alone reads badly, the same amplitude remedy applies.
- [ ] **`demo: true` on all four contradicts `docs/13` §5 item 2** ("when the movement is
      new"). Carried forward from the proposal unchanged, out of scope for row B, recorded so
      it is not rediscovered as a defect.
- [ ] Nothing else is blocking. Every other decision above is settled.

---

### Accepted deviation

This document exceeds the skill's 800-word cap, the same deviation
`archive/2026-09-12-zoo-map-home/design.md:987-995`,
`case-registry-and-captions/design.md:950-955` and `detective-mode/design.md:397-402` each
recorded. `openspec/config.yaml` requires every architecture decision to carry its rationale;
this change carries nine, two of which correct the proposal's arithmetic and one of which
(§3.2) records a conflict between the directive's own two constraints that cannot be resolved
without the numbers being shown.


---

## Measured facts (orchestrator, before `sdd-tasks`)

Two numbers this design left open or eyeballed were measured directly against
`client/public/art/sector-lagoon-background.png` with `scripts/art/png.py`,
using the repo's own Rec. 601 `luma` (`build_art.py:85`). Both are now settled;
neither reopens decision 1.

### `brightest` — the open risk, closed

Sampling every pixel of `corridorRows` (source rows 135..889, the full 1536
width — 1,159,680 px, **13 distinct colours**):

| Colour | Luma | Share |
|---|---|---|
| `(180,197,208)` water | **193** | 87.07% |
| `(196,190,178)` | 190 | 0.24% |
| `(165,162,149)` | 161 | 0.18% |
| `(156,163,135)` | 157 | 1.10% |
| ...9 more, all darker | <=152 | |

**The brightest colour under the corridor is the water itself, luma 193.**
Pixels brighter than 196: **0 (0.0000%)**.

So `|luma(SHEET_PAPER) - luma(brightest)| = 251 - 193 = 58`, clearing
`docs/09:158`'s `>= 55` law by 3. The design's stated failure threshold was
~196.7; the real value is 193.

**Consequence**: `duck-trail3` cycle 2 keeps `amplitude: 205`. The remedy the
design held in reserve (205 -> 185) is NOT needed, and decision 1 stays closed.
`brightest` is `#b4c5d0` — the same colour as `quiet` for this backdrop, which
is why the law still has to be asserted against `brightest` as a separate
field: on a sector whose art is not this flat they will differ, and the field
is what keeps the assertion honest there.

### The quiet band — sampled, not eyeballed

Longest contiguous run of rows that are `>= 99%` water:

```
source rows 201..818  (618 rows)  ->  viewBox y 97.6 .. 499.1
```

The design estimated rows ~200-810 -> viewBox `[96.9, 494.0]`. The eyeball was
good; the sampled figure is 5 units taller at the bottom. The conflict the
design identified is real and unchanged — every corridor overflows it:

| Level | Channel extent | Over the top | Under the bottom |
|---|---|---|---|
| `duck-trail1` | `[80.0, 520.0]` | 17.6 | 20.9 |
| `duck-trail2` | `[85.0, 515.0]` | 12.6 | 15.9 |
| `duck-trail3` | `[55.0, 545.0]` | 42.6 | 45.9 |
| `duck-trail4` | `[95.0, 505.0]` | **2.6** | **5.9** |

`duck-trail4` very nearly fits; `duck-trail3` is the worst by a wide margin,
which is the price of its `amplitude: 205` cycle. Full-bleed stands, because
the luma law above holds across the whole `corridorRows` span, not just inside
the quiet band — the overflow costs scenery, not legibility.

### Crest radius — independently confirmed

`R = w^2 / (8A)` reproduced from `alternatingArches` (`paths.ts:88-109`):
`y(t) = mid + 3*off*t*(1-t)` with `off = 4A/3` and `x(t)` strictly linear, so
at the crest `kappa = 6|off|/w^2`. Values match the design exactly: step 1
123.6 vs band 44; step 2 **30.9 vs 39**; step 3 cycle 2 18.7 vs 34; step 4
**13.7 vs 29**. Step 4 folds harder than the shipped `duck-trail2` (ratio 0.47
vs 0.79) and the design's containment argument holds regardless: `pushBand`
(`buildLevel.ts:55`) places every cloud point at distance exactly
`band = cw/2 - BAND_INSET` from a centreline point, and the channel is stroked
at half-width `cw/2`, so the cloud is inside the drawn corridor for any
curvature. Independently: the cloud is only a snap magnet
(`LevelPlay.tsx:405`), never a boundary test — wall contact rides
`corridorTrack.ts`.
