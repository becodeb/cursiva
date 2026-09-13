# Design: Sheep and llama peaks in the mountains

Binding input: `proposal.md`. Its seven decisions are the starting point; three of them are
**corrected here with the arithmetic that forced the correction** (§1.1, §1.3, §5.1), the way
paso B's design corrected two of its own proposal's numbers. Every `file:line` was re-verified
against the working tree on `sdd/ovejas-y-llamas`.

Numbers are marked **[derived]** (closed-form arithmetic from the shipped generators, the
shipped hex literals, or the two schematics), **[corrected]** (the proposal's figure was wrong
and the corrected one is used everywhere below), or **[to measure]** (a named step `sdd-apply`
must run before the value is hand-copied into the registry).

## Technical Approach

Nothing in the scoring model, the progress store, the case machinery or the catalog's *shape*
changes. The change is one new generator, one new clearance derivation, eight level literals,
one tiny pure placement module, one canvas layer, one registry re-key, and two registry rows:

1. `levels/paths.ts` — `peakRidge` (per-vertex heights over a ground line) and
   `peakRidgeCorridorLimit` (the exact corner-fusion bound);
2. `levels/vertexArt.ts` — `routeApexes`, the pure selector that puts an animal on a peak
   without touching `detective/clues.ts`;
3. `levels/catalog.ts` — eight entries at the end of `PHASE_1`;
4. `zoo/backdrops.ts` — re-keyed from `SectorId` to `AdventureId`, plus the channel paint;
5. `zoo/adventures.ts`, `zoo/sectors.ts`, `zoo/backpack.ts` — two adventures, two animals, one
   backpack item, montañas opened;
6. `canvas/TraceCanvas.tsx` + `screen/LevelPlay.tsx` — one vertex-art layer, one channel-paint
   field, three gate widenings that are byte-identical for every shipped level;
7. `detective/assets.ts` — `ZooAnimalId`, a superset that never touches `AnimalId`.

The governing constraints are unchanged: vitest on the **node** environment, no jsdom; every
decision is a **named exported pure function** and each component only renders what one of them
returned; no `url(#…)`, no `<mask>`, `<pattern>`, `<clipPath>`, `<defs>`, `useId`
(`TraceCanvas.tsx:63-84`). `transformPath` accepts only `M`/`L`/`C` and `peakRidge` emits only
`M`/`L`. No level id moves, no new persisted key, no new dependency, **no new art is
commissioned** — `oveja.png` only needs a pipeline row.

`cases.ts`, `Deduction.tsx`, `AnimalId`, `ClueKind`, the four duck levels, the four medusa
levels and `trail1..4` are byte-identical to `main`.

---

## 1. The geometry

### 1.1 Decision: the shape is a RIDGE above a ground line, not a wave about a centreline

**Choice**: a new generator `peakRidge` whose route starts and ends on a base line `y_b`,
touches `y_b` at every valley, and rises to `heights[i]` above it at peak `i`. Peaks are evenly
spaced: with `n` peaks over `x1 − x0`, each hill is `W = (x1 − x0)/n` wide, peak `i` sits at
`x0 + (i + ½)·W` and valley `i` at `x0 + i·W`. Every leg therefore has the same horizontal run
`r = W/2 = (x1 − x0)/(2n)`.

**Alternatives considered**: the proposal's per-vertex-amplitude variant of `alternatingZigzag`
(`paths.ts:449-467`), i.e. a wave whose apexes alternate above and below `y = 300`.

**Rationale, and it is arithmetic rather than taste.** `alternatingZigzag` alternates SIDES by
index: apex `i` is up when `i` is even. So in a height list `[tall, short, tall, short]` every
tall apex is ABOVE the midline and every short apex BELOW it. The phase-1 guard
(`catalog.test.ts:415-424`) demands `minY < 180` **and** `maxY > 420`, which on a `y = 300`
midline means the tallest UP apex and the tallest DOWN apex must BOTH exceed 120 **[derived]**.
A height list cannot have a genuinely short vertex under that guard — the short side is exactly
the side the guard forces tall. **The proposal's own decision 1 ("you can satisfy at most two of
{guard, more repetitions, less steep}") is a consequence of the centreline model, not of the
directive.** [corrected]

Both schematics draw a ridge, not a wave. In `ovejas-alta-baja.png` the four valleys all sit on
one line (image y ≈ 350) and the four peaks rise above it, alternating ≈ 91 and ≈ 51 of rise
**[derived]**; in `llamas-picos.png` the three valleys sit on one line (y ≈ 385) and the peaks
rise 243/123/297 above it. Neither drawing has anything below its ground line. A ridge is what
the author drew and it is what "montañitas" means.

With a base at `y_b = 480` and a tallest peak at `h = 320`, the guard is satisfied by
`minY = 160 < 180`, `maxY = 480 > 420`, `span = 320 > 300` **[derived]** — and a short peak is
then free to be as short as the authoring wants. **The ridge makes "alta - baja" literally
drawable under the guard the wave could not.** `triangularWave` and `alternatingZigzag` are
NOT touched: `trail3` and `paths.test.ts` still pin them byte for byte.

```ts
/** A ridge of peaks over a ground line (`docs/13` §2, "montañitas cortas y
 *  sucesivas" / "picos altos y empinados"; both schematics in
 *  `docs/referencias/`). The linear sibling of {@link waveVaried}, and the
 *  RIDGE sibling of {@link triangularWave}: a wave alternates about a
 *  centreline, a ridge only ever rises from `base`. That distinction is not
 *  cosmetic — `alternatingZigzag` alternates SIDES by index, so under the
 *  phase-1 arm guard (minY < 180 AND maxY > 420) a wave's "short" apexes are
 *  exactly the ones the guard forces tall, and "alta - baja" is undrawable.
 *
 *  `heights[i]` is peak i's rise ABOVE `base`, so a peak's y is `base −
 *  heights[i]` exactly (no overshoot is possible — these are straight lines).
 *  Emits ONLY `M`/`L`. */
export function peakRidge(
  o: { x0?: number; x1?: number; base?: number; heights?: readonly number[] } = {},
): string
```

### 1.2 Decision: the clearance derivation charges each corner its OWN angle

**Choice**: one exported pure function returning the widest admissible corridor.

```ts
/** The widest corridor a {@link peakRidge} can carry before two rounded joins
 *  (`strokeLinejoin="round"`) merge into one filled shape — `docs/13` §4's
 *  "medir el límite de fusión de esquinas", as a number rather than a promise.
 *
 *  EXACT, not conservative: each straight run is charged its own two corners'
 *  consumption `(w/2)/tan(θ/2)`, never one angle twice. It reduces to
 *  {@link cornerClearance}'s closed form exactly when the two incident angles
 *  are equal, which is what the uniform-ridge row of `paths.test.ts` asserts. */
export function peakRidgeCorridorLimit(
  o: { x0?: number; x1?: number; heights?: readonly number[] },
): number
```

The geometry, all **[derived]**. With run `r` and rise `h_i`:

```
leg length        L_i = √(r² + h_i²)
peak angle        θ_peak,i = 2·atan(r/h_i)          tan(θ/2) = r/h_i
valley angle      θ_valley = (θ_peak,i + θ_peak,i+1) / 2     ← exact, not an approximation
per-run limit     w ≤ L / (1 + 1/(2·t_a) + 1/(2·t_b))        t = tan(θ/2), an END corner gives 0
limit             W* = min over runs
```

Uniform check: when `h_i = h_{i+1}`, `θ_valley = θ_peak` and the formula collapses to
`W* = L·t/(1+t) = r·√(r²+h²)/(r+h)` — **exactly `cornerClearance`'s own inversion, and exactly
the closed form the proposal states** **[derived]**. `W*/r = √(1+k²)/(1+k)` with `k = h/r`, which
is 0.707 at `k = 1` and never exceeds 1. So **the corridor is bounded at 0.71–1.0 × the run, and
the run is `(x1 − x0)/(2n)`: peak COUNT binds, steepness barely does.** The proposal's
conclusion holds.

**Alternatives considered**: the proposal's "apply `cornerClearance` per leg with the SMALLER of
its two incident angles". It is genuinely conservative but it costs real width — on
`sheep-hill4` it returns 59.7 against the exact 67.7 **[derived]**, which would have forced a
narrower corridor than the geometry requires. Also considered: changing `cornerClearance` itself
— rejected, it is asserted in `paths.test.ts` and used by `trail4`.

### 1.3 `trail3` is NOT a pre-existing failure — and the assertion stays scoped anyway

The proposal reports `trail3` (`catalog.ts:404-424`) failing corner fusion at `W* ≈ 53.8`
against its shipped `corridorWidth: 90`. That number applies the single-leg ridge formula to a
level that is not a ridge. [corrected]

`trail3` is `triangularWave(…)`, and in `alternatingZigzag` the midline crossings are
**collinear** — incoming and outgoing directions are both `(+w_h/2, +a)` (`paths.ts:460-465`)
— so they are 180° joins that consume nothing, and the straight run between two real corners is
**two** legs, not one **[derived]**:

```
r = (910−90)/6 / 2 = 68.33   a = 200   L = 2·√(r²+a²) = 422.7   t = r/a = 0.34167
W* = L·t/(1+t) = 107.6   vs shipped 90   → clears by 17.6
```

So `trail3`'s rounded corners do **not** merge. The proposal's fact and its fact about
collinearity contradict each other; the collinearity one is the correct one and it is what the
shipped code does.

**The new assertion is scoped to the eight authored levels regardless**, exactly as the proposal
requires — `peakRidgeCorridorLimit` is defined over a height list, `trail3` has none, and a
catalog-wide predicate would be reasoning about shapes it does not describe. `trail3` is
recorded here as a **resolved** finding, not carried forward as a defect this change declined to
fix, so nobody re-derives 53.8 in the verify report.

### 1.4 The eight levels, frozen

All eight: `x0 = 90`, `x1 = 910`, `base = 480`, `phase: 1`, `kind: 'path'`, `surface: 'blank'`,
`maze: true`, `resetOnContact: true`, `carrier: false`, `showGuide: true`, `letters: []`,
`rules(1, false, true, 0)` — the ducks' exact call. Sheep peaks rise 320 (peak y **160**), llama
peaks rise 360 (peak y **120**): `docs/13` §3's *"misma montaña, dos alturas"*, drawn.

**Sheep — `montañitas cortas`, ladera** (`docs/13` §2: amplias → más repeticiones → alternancia
→ reducción del ancho). All values **[derived]**.

| Step | id | peaks | heights | run `r` | `cw` | taper | `W*` | margin | mean slope |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `sheep-hill1` | 2 | `[320,320]` | 205 | 100 | — | 148.4 | +48.4 | 1.561 |
| 2 | `sheep-hill2` | 3 | `[320,320,320]` | 136.67 | 90 | — | 104.1 | +14.1 | 2.341 |
| 3 | `sheep-hill3` | 3 | `[320,170,320]` | 136.67 | 80 | — | 88.8 | +8.8 | 1.976 |
| 4 | `sheep-hill4` | 4 | `[320,170,320,170]` | 102.5 | 60 | `{from:1,to:0.85}` | 67.7 | +7.7 | 2.390 |

**Llamas — `picos altos y empinados`, cumbre** (un pico claro → pico alto y pico bajo → varios
picos → mayor precisión).

| Step | id | peaks | heights | run `r` | `cw` | taper | `W*` | margin | mean slope |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `llama-peak1` | 1 | `[360]` | 410 | 90 | — | 379.2 | +289.2 | 0.878 |
| 2 | `llama-peak2` | 2 | `[360,180]` | 205 | 80 | — | 132.9 | +52.9 | 1.317 |
| 3 | `llama-peak3` | 3 | `[360,360,360]` | 136.67 | 70 | — | 106.0 | +36.0 | 2.634 |
| 4 | `llama-peak4` | 4 | `[360,360,360,360]` | 102.5 | 60 | `{from:1,to:0.85}` | 83.0 | +23.0 | 3.512 |

Every row clears the three phase-1 assertions with the same margins (`minY` 160 or 120 against
180; `maxY` 480 against 420; span 320 or 360 against 300) and stays inside `[0, 600]`. The
binding clearance leg is always the run into a SHORT peak (its `L` is small and its valley
corner is the sharpest one that leg meets) — `sheep-hill4`'s 67.7 comes from
`L = 198.51`, `g_peak = 0.8293`, `g_valley = 1.1015` **[derived]**. `demo: true` on
`sheep-hill1` and `llama-peak1` only; `feedback.rail: true` on `sheep-hill1` only (the ducks'
convention: the rail rides the adventure's first routed level).

### 1.5 Decision: "más cortas y menos empinadas" is asserted as three family facts, not as a
per-matched-step slope ordering

**Choice**, replacing the proposal's `meanLegSlope(sheep_i) < meanLegSlope(llama_i)`:

| # | Invariant | Value |
|---|---|---|
| I1 | every sheep peak is shorter than every llama peak | 320 < 360; 170 < 180 |
| I2 | the steepest sheep leg is gentler than the steepest llama leg | 3.122 < 3.512 |
| I3 | the sharpest sheep corner is blunter than the sharpest llama corner | 35.52° > 31.78° |
| I4 | from sheep step 3, a peak at ≤ 0.55 × that level's own tallest | 170/320 = 0.531 |
| I5 | `corridorWidth` strictly decreases within each adventure | 100→60, 90→60 |
| I6 | llama heights are uniform except step 2, which is `[tall, tall/2]` | `[360,180]` |
| I7 | `peakRidgeCorridorLimit ≥ corridorWidth · max(taper.from, 1)` on all eight | table §1.4 |

**Rationale.** The per-matched-step ordering is **unsatisfiable**, and by the proposal's own
evidence. `docs/13` §2 gives the llamas *"un pico claro"* at step 1 — one peak over the whole
sheet, run 410, slope **0.878** — which the proposal itself calls "by construction the gentlest
route in the sector". No sheep step 1 can be gentler: under the arm guard its tallest peak must
rise > 300, and the gentlest possible sheep 2-peak route is 320/205 = **1.561**. Step 2 fails
the same way: the llamas' *"pico alto y pico bajo"* averages 1.317 against three uniform sheep
hills at 2.341 **[derived]**. The proposal rejected a max-vs-min formulation for exactly this
reason and then adopted a per-step one with exactly the same hole; its worked illustration
silently held the peak count fixed at 3 for both families, which the directive's two
progressions never do. [corrected]

I1–I3 say the directive's sentence exactly and are true of every pair of levels: the llamas'
mountains are taller (360 vs 320), their legs steeper (3.512 vs 3.122) and their corners sharper
(31.78° vs 35.52°). I4 is the proposal's own second clause, kept verbatim.

---

## 2. The channel on the mountains

### 2.1 Decision: `CHANNEL_STONE = '#606569'`, luma 100 — and it is FORCED, not chosen

Using the repo's Rec. 601 `luma` (`detective/palette.ts:39-44`), all **[derived]** from the
shipped hex literals and the orchestrator's sampling:

| Paint | Hex | luma | gap vs a luma-100 channel |
|---|---|---|---|
| `SHEET_PAPER` | `#fdfcf7` | 252 | 152 |
| cordillera brightest | `#f5f5f5` | 245 | 145 |
| ladera brightest | `#b4bec5` | 188 | 88 |
| ladera **quiet** (worst case, §2.2) | `#9da396` | 160 | **60** |
| `MUD_INK` | `#8a6a4a` | 112 | **12** ✗ |
| demo stroke | `#0284c7` | 101 | **1** ✗ |
| `GOAL_COLOR` | `#b45309` | 104 | **4** ✗ |
| start dot / arrow | `#22c55e` | 137 | **37** ✗ |
| `INK_COLOR` | `#1e293b` | 40 | 60 |
| `ART_OUTLINE` | `#1a1a1a` | 26 | 74 |

**Why the channel must be dark, and cannot be paper.** The orchestrator's profiling of
`fondo cordillera.png` found the pale sky `#c8d3d8` (luma 208) unbroken from row ~200 to ~840
with `#f5f5f5` snow above it. For one colour to clear `docs/09:158`'s ≥ 55 law against BOTH
mountain backdrops it needs `L ≤ 188 − 55 = 133` or `L ≥ 245 + 55 = 300` **[derived]**. 300 does
not exist. **There is no admissible light channel anywhere on the cordillera, at any amplitude,
and `SHEET_PAPER` has nowhere to go upward.** The proposal's per-backdrop channel field is
therefore not an option, it is the only remaining move.

**Why luma 100 specifically.** Three laws bind from below and one from above:

```
vs the backdrops (docs/09:158)                        L ≤ 133   (ladera binds)
vs the child's own INK_COLOR (40), same ≥55 rule       L ≥  95
vs ART_OUTLINE (26) on every standing animal           L ≥  81
                                                       ──────────
window                                                 L ∈ [95, 133]
```

The dark window paso B could not reach (`L ≤ 76`) is open here for one reason: **these levels
carry no clue marks**, so `MIN_DRAINED_GROUND_CONTRAST` against `CLUE_DRAINED` (131) does not
apply. Inside `[95, 133]` the value is pinned to the LOW end deliberately: §2.2's sampling can
only lower the ceiling, never raise it, and the ladera's modal colour 160 guarantees a ceiling
of at least 105. **A channel at 100 is admissible whatever the sampling returns** — worst case
it still clears the ladera by 60 and the ink by 60 **[derived]**. `#606569` is luma 100 with
chroma 9 (≈ 4 % saturation, hue 213°): mountain stone, and low enough in chroma to sit inside
`docs/09` §4's muted palette.

The four ✗ rows above are not incidental; each one forces a wiring decision in §3, and each gets
a falsifiability row in `backdrops.test.ts`.

### 2.2 `corridorRows`, derived from the frozen geometry

`viewBoxToImage` (`sectors.ts:165-171`) is `row = y·1.536 + 51.2`. Channel extent is
`peak y − cw/2` to `base + cw/2 · max(taper.from, 1)`, widest level per adventure **[derived]**:

| Backdrop | widest channel (viewBox) | `corridorRows` |
|---|---|---|
| ladera (`sheep-hill1`, cw 100) | 110 … 530 | `{ top: 220, bottom: 866 }` |
| cordillera (`llama-peak1`, cw 90) | 75 … 525 | `{ top: 166, bottom: 858 }` |

**The ordering the proposal and `state.yaml` fix is inverted here, on purpose.** They make
sampling task one because "no level geometry can be frozen before the admissible band is
measured". That was true when the channel could still be paper; after §2.1 the geometry has no
colour degree of freedom left — it is fixed by the arm guard and by `peakRidgeCorridorLimit`,
neither of which reads a pixel. So the real order is **freeze the geometry → derive
`corridorRows` from it → sample `quiet`/`brightest` over those exact rows → hand-copy**. The
lagoon's 135..889 must NOT be reused: it is a different range and `brightest` is range-sensitive.
**[to measure]** — `sample_corridor_band` over `(220, 866)` and `(166, 858)`.

Both ranges overflow the longest fully-clean band (rows 204..818) at the bottom, and the
cordillera also at the top. That is the same accepted trade paso B measured and captured: the
luma law is asserted against `brightest` across the WHOLE range, so overflow costs scenery, not
legibility.

### 2.3 The registry, re-keyed to the adventure

`montanas` needs two backdrops and `Partial<Record<SectorId, …>>` cannot hold two. `backdropFor`
already routes through `adventureFor`, so the fix makes that literal.

```ts
// client/src/zoo/adventures.ts
export type AdventureId = 'duck' | 'sheep' | 'llama'
export interface Adventure { id: AdventureId; /* …unchanged… */ animal: ZooAnimalId }

// client/src/zoo/backdrops.ts        (SECTOR_BACKDROP → ADVENTURE_BACKDROP,
//                                     SectorBackdrop → AdventureBackdrop)
/** Mountain stone. Not a taste call — design.md §2.1's window is [95, 133]
 *  and this sits at its low end so §2.2's sampling cannot close it. */
export const CHANNEL_STONE = '#606569'

export interface AdventureBackdrop {
  art: ArtImage
  quiet: string
  brightest: string
  corridorRows: { top: number; bottom: number }
  /** The channel's paint. ABSENT = `SHEET_PAPER`, which is what keeps the
   *  lagoon byte-identical to what paso B shipped. */
  channel?: string
}

export const ADVENTURE_BACKDROP: Partial<Record<AdventureId, AdventureBackdrop>> = {
  duck:  { art: SECTOR_BACKGROUND_ART.lagoon, quiet: '#b4c5d0', brightest: '#b4c5d0',
           corridorRows: { top: 135, bottom: 889 } },          // unchanged, no `channel`
  sheep: { art: SECTOR_BACKGROUND_ART.slope, quiet: '#9da396', brightest: '#b4bec5',
           corridorRows: { top: 220, bottom: 866 }, channel: CHANNEL_STONE },   // [to measure]
  llama: { art: SECTOR_BACKGROUND_ART.range, quiet: '#c8d3d8', brightest: '#f5f5f5',
           corridorRows: { top: 166, bottom: 858 }, channel: CHANNEL_STONE },   // [to measure]
}

export function backdropFor(levelId: string): AdventureBackdrop | undefined {
  const adventure = adventureFor(levelId)
  return adventure ? ADVENTURE_BACKDROP[adventure.id] : undefined
}
```

**Rationale**: the `f2-agua*` regression guard paso B wrote survives untouched — the medusa has
no adventure row, so it still resolves `undefined`; and the estanque keeps exactly one backdrop
even though it owns eight level ids. `AdventureIntro.tsx:55` already calls
`backdropFor(adventure.levelIds[0])` and needs no edit.

---

## 3. What the stone channel forces elsewhere

Each of §2.1's four ✗ rows is a colour chosen against paper that now sits on stone.

### 3.1 Decision: `detectiveWorld` is ABSENT on all eight — the mud ink settles it

`MUD_INK` (112) against a stone channel is a gap of **12**. To clear 55 the channel would need
`L ≤ 57`, and `ART_OUTLINE` (26) on every standing animal needs `L ≥ 81`. **The window is empty:
a level with mud ink cannot have an admissible channel on these two backdrops** **[derived]**.
So the eight are NOT in the detective world, they use the default slate `INK_COLOR`, and
`world.test.ts:57`'s pinned `['f2-guirnalda','f2-agua2','f2-agua3','f2-agua4']` needs **no
edit**. This also agrees with `docs/13` §4 decision 1: row C is caretaker content, not a case.

`carrier: false` on all eight for the same reason the glass is detective chrome — and because a
`carrier: true` level with no `carrierArt` falls back to the shipped sage figure
(`CARRIER_COLOR` 125, gap 25), which belongs to no world.

### 3.2 Decision: one derived `drawnPlace` boolean, three gates, byte-identical today

`LevelPlay` gains one line and three call sites change:

```ts
/** The level is drawn in a PLACE — a sector's backdrop or the detective
 *  world's ground — so the engine's own marker colours, all chosen against
 *  paper, yield to ink. Today `backdrop ⇒ inWorld`, so every shipped level
 *  renders byte-identically; the eight mountain levels are the first to be a
 *  place without being the world (design.md §3.2). */
const drawnPlace = inWorld || !!backdrop
```

| Call site | From | To | The number that forces it |
|---|---|---|---|
| `startArt` | `inWorld ? OCTOPUS_ART : undefined` | `drawnPlace ? … : undefined` | the Pulpito must stand at the start of his own adventure |
| `inkOnly` | `inWorld` | `drawnPlace` | `GOAL_COLOR` 104 → gap **4**; silhouetted in `INK_COLOR` it is gap 60 |
| `directionArrow` | `showMarkers && !inWorld` | `showMarkers && !drawnPlace` | green 137 → gap **37**, and it is drawn AT the route's first point, i.e. on the octopus's head (paso B's own screenshot finding) |

`TraceCanvas` takes the channel as DATA — it still imports nothing from `zoo/`:

| Line | From | To |
|---|---|---|
| `:312-317` | `TraceBackdrop { href, quiet }` | `+ channel?: string` |
| `:960`, `:971` | `ground && !backdrop ? CORRIDOR_EARTH : SHEET_PAPER` | `ground && !backdrop ? CORRIDOR_EARTH : (backdrop?.channel ?? SHEET_PAPER)` |
| `:1107` | `stroke="#0284c7"` | `stroke={backdrop?.channel ? SHEET_PAPER : DEMO_STROKE}` (the literal extracted to `DEMO_STROKE`) |

The demo row is the fourth ✗: `#0284c7` is luma 101 against a 100 channel, a gap of **1**, and
`demo: true` ships on `sheep-hill1` and `llama-peak1`. `SHEET_PAPER` on stone is a gap of 152 and
needs no new token — chalk on rock, which is also the right picture.

**What else lands on the channel, checked**: with `maze: true`, `guide={showShapeLine &&
!level.maze}` and `showCentreLine={showCorridor && !level.maze}` are both false
(`LevelPlay.tsx:1210,1217`), so **neither the shape line nor the centre line renders** — the
proposal's worry about `showGuide: true` drawing a centreline does not apply to a maze level
[corrected]. That leaves the octopus (authored orange fill, `ART_OUTLINE` contour, gap 74), the
standing animals (same), the child's ink (gap 60) and the goal diamonds in `INK_COLOR` (gap 60).

### 3.3 Decision: `vertexArt` — a dedicated primitive that never touches the clue machinery

```ts
// client/src/levels/types.ts — additive, absent on every level that predates it
/** Static art STANDING at this route's own peaks: the sheep on the humps, the
 *  llamas on the summits (`docs/13` §2). NOT a clue — no `ClueKind`, no
 *  `PistasRail` entry, no case membership, and it does not put the level in
 *  the detective world. Placement is DERIVED from the built route, never
 *  authored as coordinates. */
vertexArt?: { art: ArtImage; size: number }
```

```ts
// client/src/levels/vertexArt.ts — pure, no React, its own test file
/** The route's local MINIMA in y — a ridge's peaks, in route order. Read off
 *  `LevelTarget.polyline`, which is already past `buildLevelTarget`'s
 *  horizontal centring, so no caller redoes that arithmetic and no authored
 *  coordinate can drift from a re-tuned literal. `minRise` (default 40)
 *  rejects sampling noise while keeping a 170-unit short peak. */
export function routeApexes(
  polyline: ReadonlyArray<{ x: number; y: number }>,
  minRise?: number,
): readonly { x: number; y: number }[]
```

`TraceCanvas` gains `vertexArt?: TraceVertexArt` (`href`/`w`/`h`/`size` + `at: {x,y}[]`),
rendered immediately BEFORE the `endMarker && endArt` block (`:1141`) so the animals join the
standing-character band, under every ink layer. Each is one `<image>` through the existing
`placeArt({ …, grip: STANDING_GRIP })` + `clampArtBox(…, sheetBounds)` path — `docs/09` §3's
*"los animales llevan el origen en las patas"*, reused rather than re-implemented.

**Alternatives considered**: `clue`/`clueMarks` (makes the level a case trail, drags in
`PistasRail`, the case machinery and `world.test.ts`'s pinned list — and `docs/13` §4 decision 1
forbids it); authored `at` coordinates in the config (duplicates the generator's arithmetic and
sits in the wrong coordinate space); `goalArt` at the route end only (the proposal's named
degraded fallback — it puts one animal where the schematics draw four).

Counts: 2/3/3/4 sheep and 1/2/3/4 llamas, one per peak, both heights — proposal question 4's
assumption, and what `ovejas-alta-baja.png` draws (four ellipses over four apexes). Sizes 56
(sheep) and 64 (llama) viewBox units.

---

## 4. The zoo

### 4.1 `ZooAnimalId`: widen the zoo's vocabulary, never the deduction's

```ts
// client/src/detective/assets.ts
/** Every animal the ZOO can stand — a superset of {@link AnimalId}, which is
 *  the deduction screen's exhaustive answer set and is NOT widened here
 *  (`docs/13` §4 decision 1: the deduction is paused, not revived). */
export type ZooAnimalId = AnimalId | 'oveja' | 'llama'

export const ZOO_ANIMAL_ART: Readonly<Record<ZooAnimalId, ArtImage>> = {
  ...ANIMAL_ART,                              // same object identities, on purpose
  oveja: SECTOR_ADVENTURE_ART.sheep,
  llama: SECTOR_ADVENTURE_ART.llama,
}
```

Widened: `ZooAnimal.id` (`sectors.ts:71`), `animalPlacements`'s lookup (`:445`),
`Adventure.animal`, `mapBubble` (`adventures.ts:70,72`), `AdventureIntro.tsx:63` and its test.
`Deduction.tsx:116`'s `Record<AnimalId, string>` and `ANIMAL_ART` itself are untouched; the
spread preserves identity, so `mapBubble`'s `p.art === ZOO_ANIMAL_ART[a.animal]` comparison keeps
working for the duck.

### 4.2 Defect found: `mapBubble` returns the FIRST recovered animal, not the last

`adventures.ts:67` is `ADVENTURES.find(…)`. With two adventures in one sector, the map keeps
saying the sheep's closing line forever once the sheep are home, and the llama's closing can
never be seen. Fix: `ADVENTURES.filter(…).at(-1)` — the most recently recovered in registry
order — plus one test row per state (none / sheep only / both). Found by reading, not by running.

### 4.3 Montañas, opened

```ts
{ id: 'montanas', hit: MONTANAS_HIT, fog: closedFog(MONTANAS_HIT, 2),
  animalSpot: hitCentre(MONTANAS_HIT),                       // (495, 92)
  animals: [
    { id: 'oveja', dx: -55, dy: 10, size: 84, appearsWhen: ['sheep-hill4'] },
    { id: 'llama', dx:  55, dy: -6, size: 96, appearsWhen: ['llama-peak4'] },
  ],
  adventureIds: ['sheep-hill1', …, 'sheep-hill4', 'llama-peak1', …, 'llama-peak4'],
  unlockedWhen: (records) => isFiled(records, 'duck-trail4') }
```

The first `unlockedWhen` that is neither `alwaysOpen` nor `alwaysClosed` — proposal question 3's
assumption, so row C is reachable without waiting for paso D. The llama stands higher than the
sheep (`dy −6` vs `+10`): the cumbre above the ladera, same sentence as the two peak heights.

### 4.4 The backpack's first item

```ts
/** One entry today. `docs/13` §8 row C assigns the shepherd's hat to THIS
 *  step ("el gorro a la mochila"); §8's closing sentence defers which object
 *  every OTHER sector grants to paso D, and that is the part this header used
 *  to over-state. */
export const BACKPACK_ITEMS: readonly BackpackItem[] = [
  { id: 'andean-hat', art: ANDEAN_HAT_ART, grantedBy: 'montanas',
    earnedWhen: ['llama-peak4'] },
]
```

`llama-peak4` rather than all eight: the hat is the LLAMA adventure's shepherd accessory
(`docs/13` §2) and `llama-peak4` is also the sector's last level, so both readings land on the
same id. The Pulpito does not WEAR it — proposal question 2's assumption; a worn hat needs a
composited sprite that does not exist.

### 4.5 Decision: appended to `PHASE_1`, and no migration

`LEVELS` is `[...PHASE_1, ...PHASE_2, …]` (`catalog.ts:1001-1007`) and `catalog.test.ts:75-81`
asserts phases never decrease, so "appended" can only mean appended to the END of `PHASE_1` —
between `trail4` and `f2-guirnalda`. Phase 2 is not an option: `catalog.test.ts:436-443` pins it
inside `[149, 451]` because those are letter shapes, and these routes span `[120, 480]`.
[corrected — the proposal's "appended to `LEVELS`" is an insertion from the store's positional
view.]

That moves `f2-guirnalda`'s `isUnlocked` predecessor from `trail4` to `sheep-hill4`. **No
migration is written**, breaking with `migratePhase1.ts` / `migrateDuckCase.ts` /
`migrateNivel3.ts`, because the precedent's premise is gone: `isUnlocked`'s ONLY runtime consumer
is `LevelMap.tsx:81`, the dev level map, which has a test-mode switch. The child's route is
`ZooMap`, which reads `nextAdventure` (`sectors.ts:401`). Cost: the dev `LevelMap` renders the
eight — and `f2-guirnalda` — as `bloqueado`. If a reviewer wants belt-and-braces the fallback is
~25 lines (`migrateSheepLlama.ts`, copying `trail4`'s approvals forward to `sheep-hill4`),
named here and not taken.

---

## 5. The adventure structure

### 5.1 `docs/13` §5, step by step

| §5 | Status |
|---|---|
| 1. Narrative entry | **Free mechanism** (`AdventureIntro`, `resolveEnterAction`, `introLevel`). Needs two `intro` strings and `oveja` registered. |
| 2. Minimal demo when the movement is new | `demo: true` on `sheep-hill1` and `llama-peak1` only, and the demo stroke goes to `SHEET_PAPER` on a stone channel (§3.2). |
| 3. First wide accessible challenge | `sheep-hill1` cw 100, `llama-peak1` cw 90 over a single broad peak (slope 0.878 — the gentlest route in the sector). |
| 4. Two or more variations | Steps 2–4 of each, §1.4. |
| 5. Immediate response | **Free** (tone, haptics, ink, `resetOnContact`). |
| 6. Narrative close | **Free mechanism**, once §4.2's `find`→`filter().at(-1)` defect is fixed. Needs two `closing` strings and the two `ZooAnimal` rows. |
| 7. Achievement record | **Free** (`LevelProgressStore`, `zoo/stars.ts` — the eight ids are real catalog ids, so `totalStars` counts them with no edit). |

**The proposal's cross-adventure tolerance rule is dropped.** It says "the llama adventure starts
no wider than the sheep adventure ended". The sheep end at 60 and no llama adventure can start
there and still narrow four times without going below the finest corridor in the app. The shipped
catalog does not obey it either — the ducks end at `70 × 0.85 = 59.5` and `trail1` starts at 90.
`docs/13` §5 item 3 gives EACH adventure its own wide first challenge, and across the two
adventures the demand accumulates in the MOVEMENT (mean slope 0.878 → 3.512; peaks 360 vs 320),
not in the corridor. Replaced by I5 (strictly decreasing WITHIN each adventure). [corrected]

### 5.2 `docs/13` §6 / `docs/14` §14 — the nine obligations, for all eight

| Obligation | How it is expressed |
|---|---|
| Start zone | the route's first point `(90, 480)`, with the Pulpito standing on it (`startArt`, §3.2) |
| Expected trajectory | `paths[0]` = `peakRidge({ x0:90, x1:910, base:480, heights:[…] })` |
| Tolerance | `corridorWidth` per §1.4, plus `taper {1, 0.85}` on each step 4 |
| Contact response | `feedback.tone` inside, `feedback.haptics` pulse on leaving |
| Error conditions | leaving the corridor only — no `obstacles` on any of the eight (`docs/13` §2: *"los obstáculos aparecen después"*) |
| Restart | `resetOnContact: true` restarts the run; the shell's own control restarts on demand |
| Help animation | `demo: true` on step 1 of each; `feedback.rail: true` on `sheep-hill1` only |
| Completion criterion | `rules(1, false, true, 0)` — the ducks' exact call; `mustBeContinuous: false` on all eight |
| Narrative transition | `AdventureIntro` on `levelIds[0]`; `resolveNextAction` exits to the map; `mapBubble` closes with `closing` once the animal stands |

Content, ≤ 80 chars and naming no failure (`catalog.test.ts:89-97`): `Las dos lomas` /
`Tres lomas seguidas` / `Una alta y una bajita` / `La ladera angosta`; `El pico de la llama` /
`Pico alto y pico bajo` / `Tres picos seguidos` / `La cumbre angosta`. Intros:
*"Las ovejas se escaparon por la ladera. ¿Las juntamos?"* and *"Las llamas están en los picos.
¿Subimos a buscarlas?"*; closings *"¡Juntamos las ovejas! Ya están en su ladera."* and
*"¡Encontramos a la llama! Ya está en la cumbre."*

---

## 6. Art pipeline

| Item | State | Work |
|---|---|---|
| `oveja.png` | in `art-source/`, unwired everywhere | `SINGLES` row `('oveja.png', 'sector-sheep.png', 448, 'contour', True)` — the llama's own row; `SECTOR_ADVENTURE_ART.sheep`; `w`/`h` hand-copied from the rebuilt manifest **[to measure]** |
| `AUTHORED_SOURCE_SIZES` | — | **no entry.** That table is the ZOO SLICE's square-canvas contract; `oveja.png` predates it exactly as `pato.png` and `gallina.png` do, and neither is listed. `sdd-apply` checks the real canvas with `scripts/art/png.py` first and adds an entry only if it is already 1024×1024. [corrected — the proposal asks for an entry unconditionally] |
| `llama.png` → `sector-llama.png` | built, registered 299×448 | wiring only |
| `gorro andino.png` → `andean-hat.png` | built, registered 216×256 | wiring only |
| `fondo ladera.png` / `fondo cordillera.png` | built, registered, `corridor_rows=None` | `(220, 866)` and `(166, 858)` per §2.2; rebuild; hand-copy `quiet`/`brightest` **[to measure]** |

`build_art.py`'s invocation surface, argument list and callers are unchanged — the two tuples
feed a function it already runs.

---

## Data Flow

```
                  ADVENTURES[] ──adventureFor──▶ ADVENTURE_BACKDROP ──backdropFor──┐
                       │  (id: duck | sheep | llama)                               │
                       ├──introLevel──▶ resolveEnterAction ──▶ App.onEnter          │
                       └──mapBubble (filter().at(-1)) ──▶ ZooMap bubble             │
                                                                                    ▼
  catalog.ts ─▶ buildLevelTarget ─▶ target ─┬─▶ routeApexes ─▶ vertexArt marks ─▶ TraceCanvas
       │                                     └─────────────────────────────────────▶  ├─ rect quiet
       ├─ peakRidge(heights)                                                          ├─ image slice
       └─ peakRidgeCorridorLimit ──(catalog.test only)                                ├─ channel CHANNEL_STONE
                                                                                      ├─ vertex animals
  SECTORS.montanas ──unlockedWhen(duck-trail4)──▶ ZooMap                              └─ demo SHEET_PAPER
       └─ animals[oveja|llama] ──appearsWhen──▶ animalPlacements ──▶ ZOO_ANIMAL_ART
  BACKPACK_ITEMS[andean-hat] ──earnedWhen(llama-peak4)──▶ earnedItems ──▶ HUD
```

## File Changes

| File | Action | Description |
|---|---|---|
| `client/src/levels/paths.ts` (+`.test.ts`) | Modify | `peakRidge`, `peakRidgeCorridorLimit` |
| `client/src/levels/vertexArt.ts` (+`.test.ts`) | Create | `routeApexes` |
| `client/src/levels/catalog.ts` | Modify | eight entries at the end of `PHASE_1` |
| `client/src/levels/catalog.test.ts` | Modify | `EXPECTED_IDS` ×8, `CORRIDORS` ×8, the mountain-family describe (I1–I7) |
| `client/src/levels/types.ts` | Modify | `vertexArt?` |
| `client/src/canvas/TraceCanvas.tsx` (+`.test.tsx`) | Modify | `TraceBackdrop.channel`, `TraceVertexArt` + layer, `DEMO_STROKE`, 3 ternaries |
| `client/src/screen/LevelPlay.tsx` (+`.test.tsx`) | Modify | `drawnPlace`, 3 gates, `channel` passthrough, `vertexArt` resolution |
| `client/src/zoo/backdrops.ts` (+`.test.ts`) | Modify | re-key + rename, `channel`, `CHANNEL_STONE`, two rows, the luma law over both |
| `client/src/zoo/adventures.ts` (+`.test.ts`) | Modify | `AdventureId`, `Adventure.id`, two rows, `mapBubble` `.at(-1)` |
| `client/src/zoo/sectors.ts` (+`.test.ts`) | Modify | montañas opened, `ZooAnimal.id: ZooAnimalId` |
| `client/src/zoo/backpack.ts` (+`.test.ts`) | Modify | the hat; the header corrected |
| `client/src/detective/assets.ts` | Modify | `ZooAnimalId`, `ZOO_ANIMAL_ART`, `SECTOR_ADVENTURE_ART.sheep` |
| `client/src/screen/AdventureIntro.tsx` (+`.test.tsx`) | Modify | `ANIMAL_ART` → `ZOO_ANIMAL_ART` (one line each) |
| `client/src/detective/artManifest.test.ts` | Modify | two more backdrop parity rows, the sheep asset |
| `scripts/art/build_art.py` + `manifest.json` | Modify | sheep `SINGLES` row, two `corridor_rows` tuples |
| `docs/13_AVENTURAS_POR_ANIMAL.md` | Modify | §4 status rows for ovejas/llamas |
| `client/src/levels/world.ts` / `world.test.ts` | **Unchanged** | §3.1 — `detectiveWorld` is absent on all eight |
| `cases.ts`, `Deduction.tsx`, `clues.ts`, `palette.ts` | **Unchanged** | `docs/13` §4 decision 1 |
| `client/public/art/*` authored sources | **Unchanged** | no art generated |

## Testing Strategy

| Layer | What | Approach |
|---|---|---|
| Unit (pure) | `peakRidge` | `M`/`L` only; survives `transformPath`, throws on an appended `A`; exact vertex list against hand-computed literals; peaks land exactly at `base − heights[i]`; the route starts and ends on `base` |
| Unit (pure) | `peakRidgeCorridorLimit` | equals `cornerClearance`'s inversion on a UNIFORM ridge (the degeneracy proof); hand-computed angles for `[320,170,320]`; **tightness**: the same predicate at `W* + 1` must be false |
| Unit (data) | the mountain family | I1–I7 of §1.5, over the eight authored literals restated in the test (not re-derived from geometry) |
| Unit (guard) | phase 1 | `catalog.test.ts:415-434` covers the eight automatically — no edit |
| Unit (pure) | `routeApexes` | 3 peaks for `sheep-hill3`, 1 for `llama-peak1`, 4 for `llama-peak4`, each within 3 units of its authored apex; a flat polyline returns `[]` |
| Unit (pure) | the luma law | `|luma(channel ?? SHEET_PAPER) − luma(brightest)| ≥ 55` for all three backdrops; **four falsifiability rows that must go RED**: `SHEET_PAPER` vs the cordillera (gap 7), `MUD_INK` vs `CHANNEL_STONE` (12), `GOAL_COLOR` vs it (4), the demo stroke vs it (1) — §2.1's whole argument, encoded |
| Unit (pure) | `corridorRows` coverage | each of the eight channels maps inside its own backdrop's rows via `viewBoxToImage`; the duck rows unchanged |
| Unit (pure) | `backdropFor` | the eight → their own row; **`f2-agua*` and `trail1..4` still `undefined`** (paso B's regression guard, re-run) |
| Unit (pure) | `mapBubble` | none / sheep only / both filed → ONWARD, sheep closing, **llama closing** (§4.2's defect) |
| Unit (pure) | `sectors` | montañas closed on `{}`, open once `duck-trail4` is filed; each animal appears only on its own last level; `:213-220` narrowed to the four remaining undeveloped sectors |
| Unit (pure) | `backpack` | the hat absent before `llama-peak4`, present after |
| Unit (data) | manifest parity | `quiet`/`brightest`/`corridorRows` for both mountain backdrops, `w`/`h` for `sector-sheep.png` |
| Component | `TraceCanvas` | with `channel`: every channel `stroke` is `CHANNEL_STONE`, the demo stroke is `SHEET_PAPER`, one `<image>` per apex, zero `url(#`. **Without `channel`: markup byte-identical to today** for a lagoon backdrop, a `ground` maze and a plain maze |
| Component | `LevelPlay` | `sheep-hill3` → the octopus at the start, no direction arrow, `inkOnly` markers, zero `GROUND_GRASS`/`GROUND_MUD`; **`duck-trail2` and `f2-agua2` byte-identical to today** |
| Component | `AdventureIntro` | both new rows render their animal and their line; `auditCaptions` clean |
| Screenshot (human) | `scripts/shot.sh` → `capturas/` | non-negotiable, `docs/12` §4 — see below |

**What only a capture can answer**: whether a stone channel over a mountain reads as a path
rather than a scar; whether the white sheep and the cream llama read standing ON their peaks at
56/64 units; whether a `SHEET_PAPER` demo line over stone reads as a demonstration; whether the
ladera's `quiet` (luma 160) behind the intro screen leaves its caption legible; whether the
llama channel grazing the snow caps at viewBox 75 looks deliberate. Required: each of the eight
levels; both intros; the map before/after each adventure closes; the backpack with the hat; and
**one duck level plus one medusa level proving they are unchanged**.

## Threat Matrix

N/A — no HTTP/shell routing, no subprocess, no VCS/PR automation, no executable-file
classification, no process-integration boundary. `scripts/art/build_art.py` is an existing
offline build script: this change adds two data tuples and one table row, and adds no argument,
no path input and no new caller. The rest is rendering, pure geometry and one read of
`localStorage`.

## Migration / Rollout

**No migration** (§4.5) — no new persisted key, no schema change, no level id moves. Every
rollback lever the proposal names still works by construction: emptying `ADVENTURE_BACKDROP`'s
two mountain rows restores the wall rect and a paper channel in one edit; dropping `vertexArt`
from the eight configs removes the animals (the field is additive and absent everywhere else);
setting `montanas.unlockedWhen` back to `alwaysClosed` and emptying its `adventureIds` hides the
adventure while leaving the levels reachable by `?nivel=`; emptying `BACKPACK_ITEMS` is already a
supported state. A `git revert` of the merge restores `main` with every child's progress intact.

## Review-budget forecast

The proposal forecast **~850** authored lines against a cached `single-pr` budget of **800**.
This design adds `levels/vertexArt.ts` and its test (~70), three `LevelPlay` gates and the demo
stroke with their component rows (~55), the `mapBubble` defect fix (~15), the
`ADVENTURE_BACKDROP` rename across four files (~20) and four falsifiability rows (~25), and
removes the `AUTHORED_SOURCE_SIZES` entry and `palette.test.ts` rows the proposal scoped (−15).
**Revised: ~1055.** `sdd-tasks` owns the binding forecast.

**Decision needed before apply: Yes. Chained PRs recommended: Yes. 800-line budget risk: High.**

| Slice | Contents | ~Lines |
|---|---|---|
| C1 | `paths.ts` + `paths.test.ts`: `peakRidge`, `peakRidgeCorridorLimit` | 185 |
| C2 | Art + backdrop: sheep through the pipeline, `corridor_rows` sampled, `ZooAnimalId`, the re-key, `CHANNEL_STONE`, the luma law and its four red rows, manifest parity | 300 |
| C3 | The eight levels and their catalog invariants (I1–I7) | 290 |
| C4 | Registries and the standing animals: `vertexArt`, `TraceCanvas`, `LevelPlay`, montañas, adventures, backpack, `mapBubble` | 280 |

C1 → C2 → C3 → C4 is dependency order and each is green on its own. **C2 must not merge before
its capture is read**: §2.1's channel and §2.2's sampled band are both screenshot-gated.

## Open Questions

- [ ] **Three of the proposal's decisions are corrected here and each needs the orchestrator, not
      `sdd-apply`**: the shape is a ridge rather than an alternating wave (§1.1); `trail3` does
      not fail corner fusion (§1.3); and the per-matched-step mean-slope invariant is
      unsatisfiable and is replaced by I1–I3 (§1.5). None of them widens scope — all three make
      the directive's own sentence *more* literally true — but the proposal's success criteria
      name the invariant it drops.
- [ ] **`brightest` for both mountain backdrops is unmeasured over the ranges this design
      froze.** `sample_corridor_band` must run over `(220, 866)` and `(166, 858)`, not the
      lagoon's `(135, 889)`. §2.1 proves the channel window cannot close (the ladera's modal
      colour alone guarantees a ceiling of ≥ 105 against a floor of 95), so this cannot block —
      but if the ladera's `brightest` comes back below 155 the channel must move down inside
      `[95, brightest − 55]` and `CHANNEL_STONE`'s literal changes.
- [ ] **`oveja.png`'s authored canvas is unknown.** `sdd-apply` measures it before deciding
      whether it earns an `AUTHORED_SOURCE_SIZES` row (§6), and copies the emitted `w`/`h` into
      `SECTOR_ADVENTURE_ART.sheep` from the rebuilt manifest.
- [ ] **The map bubble will not point at the mountains.** `recentlyDiscovered`
      (`sectors.ts:421-427`) returns the FIRST open sector with an unfiled adventure, and the
      estanque owns the medusa's four ids, which nothing in this change files — so the bubble
      stays on the lagoon forever. The sector is still tappable and the adventure still
      reachable, and `recentlyDiscovered` is documented as paso D's to replace, so this is
      recorded and NOT fixed. The one-line candidate (prefer the LAST such sector) would change
      shipped behaviour and belongs to whoever owns paso D.
- [ ] **These eight are not in the detective world (§3.1), so they show a title, a hint and a
      result block where the duck levels show none.** Forced by the mud-ink arithmetic, but it is
      a visible difference between two consecutive adventures and only a capture can say whether
      it reads as a different app.
- [ ] Nothing else is blocking. Every other decision above is settled.

---

### Accepted deviation

This document exceeds the skill's 800-word cap — the same deviation
`archive/2026-09-13-duck-undulations-and-sector-backdrop/design.md:908-916`,
`archive/2026-09-12-zoo-map-home/design.md:987-995` and `detective-mode/design.md:397-402` each
recorded. `openspec/config.yaml` requires every architecture decision to carry its rationale;
this change carries eleven, three of which correct the proposal's arithmetic and one of which
(§2.1) records a colour window with exactly one admissible answer that has to be shown to be
believed.
