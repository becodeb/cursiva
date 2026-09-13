# Tasks: Sheep and Llama Peaks in the Mountains

Binding inputs: `design.md` (authoritative on the three named corrections —
ridge not wave §1.1, `trail3` not a pre-existing failure §1.3, I1-I3 replacing
per-step mean slope §1.5), the five delta specs under `specs/`, `proposal.md`
for scope/rollback. Prior art matched for style: `archive/2026-09-13-duck-
undulations-and-sector-backdrop/tasks.md`.

**One spec/design drift found, not silently resolved.** `trace-canvas/spec.md`
"Channel Paint Follows the Backdrop Luma Law" names its four falsifiability
rows as `SHEET_PAPER`-vs-cordillera / `MUD_INK` / `GOAL_COLOR` / demo stroke.
`design.md` §2.1's own table computes a DIFFERENT fourth row — the green
start dot/arrow (`#22c55e`, gap 37) — and `SHEET_PAPER`-vs-cordillera belongs
to a separate argument in the same section (why paper can never be the
channel at all, not why an existing marker colour collides with stone). The
orchestrator's explicit ruling for this phase names `MUD_INK`, `GOAL_COLOR`,
the green dot/arrow, and the demo stroke — matching `design.md`'s arithmetic,
not the spec prose. Task 6.2 below implements the orchestrator's four; task
6.2 also keeps `SHEET_PAPER`-vs-cordillera as a fifth, clearly-labelled data
row proving §2.1's separate "no admissible light channel" claim, so nothing
`design.md` derived is dropped and the spec's literal wording is still
covered.

---

## Review Workload Forecast

Independent count, file by file, not a restatement of `design.md`'s own
~1055 (which the design itself assigns to `sdd-tasks` to bind).

| Slice | Files | Authored | Test | Docs |
|---|---|---|---|---|
| C1 — Ridge geometry | `paths.ts`, `paths.test.ts` | 80 | 110 | — |
| C2 — Art pipeline + backdrop registry | `build_art.py`, `assets.ts`, `backdrops.ts`, `backdrops.test.ts`, `artManifest.test.ts` | 84 | 160 | — |
| C3 — The eight levels | `catalog.ts`, `catalog.test.ts` | 160 | 90 | — |
| C4 — Registries + vertex art wiring | `vertexArt.ts(+.test)`, `types.ts`, `TraceCanvas.tsx(+.test)`, `LevelPlay.tsx(+.test)`, `sectors.ts(+.test)`, `adventures.ts(+.test)`, `backpack.ts(+.test)`, `stars.test.ts`, `GameScreen.test.tsx`, `AdventureIntro.test.tsx` | 159 | 302 | — |
| Docs | `docs/13_AVENTURAS_POR_ANIMAL.md` | — | — | 10 |
| **Code total** | | **483** | **662** | **10** |

**Estimated changed lines: ~1,155** (483 authored + 662 test + 10 docs — the
`manifest.json` regeneration is excluded from this count per the review-
workload guard's golden-file rule, but stays in scope for snapshot identity).

SDD artifact lines, kept in their own column per the runtime ledger's own
accounting (already-written artifacts, not re-forecast): `proposal.md` 435,
five spec deltas 680 (level-engine 204, trace-canvas 137, zoo-map 181,
detective-mode 67, main-screen 91), `design.md` 746, this `tasks.md` ~460,
a future `verify-report.md` ~100 (calibrated against the archived duck
change's 58-line report, larger here for eight levels and four falsifiability
rows) — **~2,421 artifact lines**. Every prior real artifact already landed
above its own proposal-stage estimate (proposal 435 vs its own ~260; specs
680 vs ~200; design 746 vs ~350), so this total is likely a floor, not a
ceiling.

```text
Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High
```

**800-line budget risk: High.** ~1,155 against 800 is ~44% over, and every
individual slice except C1 already clears the 400-line single-review guard on
its own (C2 244, C3 250, C4 461, C1 190) — this is not borderline.

**What would have to go to fit under 800, stated plainly, not recommended.**
Two cuts, taken together, land near ~700-750:

1. **Drop the llama adventure to a follow-up change**, shipping sheep only.
   Saves ~300 lines (half of C3, roughly half of C2's backdrop/manifest work,
   the llama rows of C4's registries). Cost: ships row C incomplete against
   `docs/13` §8's own text, which names both animals in the same sentence —
   not a scope trim, a broken directive.
2. **Replace `vertexArt` with the proposal's own named degraded fallback**,
   `goalArt` at the route's end only. Saves ~150 lines (`vertexArt.ts`+test,
   most of the `TraceCanvas`/`LevelPlay` wiring in C4). Cost: `design.md`
   §3.3 already rejected this by name — "it puts one animal where the
   schematics draw four" — so this un-rejects a decision the design closed.

Neither is taken. Both are named because the question was asked directly.

**Suggested split, if chained (the seam is C1→C2→C3→C4, the design's own
dependency order):**

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|---|---|---|---|---|---|
| C1 | `peakRidge` + `peakRidgeCorridorLimit`, standalone geometry | PR 1 | `npx vitest run client/src/levels/paths.test.ts` | N/A — pure geometry, no render surface yet | Revert `paths.ts`/`paths.test.ts`; nothing else references these functions yet |
| C2 | Sheep through the art pipeline; backdrop registry re-keyed with `channel`; `ZooAnimalId` | PR 2 | `npx vitest run client/src/zoo/backdrops.test.ts client/src/detective/artManifest.test.ts` | N/A — data/manifest only, no interactive scenario until C4 wires it | Revert `backdrops.ts`, `assets.ts`, `build_art.py` + regenerate `manifest.json`; the lagoon backdrop is unaffected |
| C3 | The eight levels, authored against C1's predicate | PR 3 | `npx vitest run client/src/levels/catalog.test.ts` | N/A — levels exist in the catalog but are unreachable from the map until C4 opens `montañas` | Revert `catalog.ts`'s eight entries and `catalog.test.ts`'s additions; `?nivel=sheep-hill1` etc. simply 404 |
| C4 | Registries, `vertexArt`, `TraceCanvas`/`LevelPlay` wiring, montañas opened | PR 4 | `npx vitest run client/src/levels/vertexArt.test.ts client/src/canvas/TraceCanvas.test.tsx client/src/screen/LevelPlay.test.tsx client/src/zoo/sectors.test.ts client/src/zoo/adventures.test.ts client/src/zoo/backpack.test.ts client/src/zoo/stars.test.ts client/src/screen/GameScreen.test.tsx client/src/screen/AdventureIntro.test.tsx` | `scripts/shot.sh` against all eight levels, both intros, the map before/after each adventure, the backpack — see Phase 7 | `montañas.unlockedWhen` back to `alwaysClosed` + empty `adventureIds`; drop `vertexArt` from the eight configs; empty `BACKPACK_ITEMS`; each is an independent one-edit revert (`design.md` "Migration / Rollout") |

**Flagged forward reference, not a blocker under `single-pr`.** C2's
`backdrops.ts` re-keys its registry to `AdventureId` and calls
`adventureFor(levelId).id` — but `AdventureId` and `Adventure.id` are C4's own
additions (`zoo/adventures.ts`). `backdrops.ts` will not compile in isolation
until C4 lands, mirroring the prior duck change's own B2→B3 note. Harmless
under one PR (only the Final Gate must be green); a real blocker if C2 and C4
ever ship as separately-merging PRs, in which case `AdventureId`/`Adventure.id`
must move into C2's own slice.

---

## Phase 1: Ridge Geometry (C1)

Spec traceability: `level-engine/spec.md` — "Per-Vertex-Height Ridge Path
Generator", "Ridge Corner-Fusion Corridor Limit". Sequential: 1.1 before 1.2.
Fully standalone — no other slice's files are touched.

- [x] 1.1 In `client/src/levels/paths.ts`: add `peakRidge({x0, x1, base,
      heights})` — starts/ends on `base`, valley `i` at `x0 + i*W` (`y =
      base`), peak `i` at `x0 + (i+0.5)*W` (`y = base - heights[i]`), `W =
      (x1-x0)/heights.length`. `M`/`L` only, never `C`. Add
      `peakRidgeCorridorLimit({x0, x1, heights})`: per-run `L_i =
      sqrt(r²+h_i²)`, `θ_peak,i = 2*atan(r/h_i)`, `θ_valley = (θ_peak,i +
      θ_peak,i+1)/2` (an END corner contributes 0), `w ≤ L/(1 +
      1/(2*tan(θ_peak/2)) + 1/(2*tan(θ_valley/2)))`, return the min over runs.
      Reduces to `cornerClearance`'s own inversion when all heights are equal.
- [x] 1.2 In `client/src/levels/paths.test.ts`: (a) `peakRidge`'s `d` string
      command alphabet is `{M, L}` only, and `transformPath` does not throw on
      it; (b) `peakRidge({x0:90, x1:910, base:480, heights:[320,170,320]})`'s
      three peak y's equal `480-320`, `480-170`, `480-320` exactly; (c) any
      output's first and last point has `y === base`; (d)
      `peakRidgeCorridorLimit` on a uniform `heights` list equals
      `r*sqrt(r²+h²)/(r+h)` within float epsilon; (e) hand-computed angles for
      `heights: [320, 170, 320]`, `r = 136.67` (design.md §1.4's `sheep-
      hill3` row, `W* = 88.8`); (f) tightness — the same corner-fusion
      condition evaluated at `W*+1` MUST fail, for at least one authored
      height list.

## Phase 2: Art Pipeline + Backdrop Registry (C2)

Spec traceability: `detective-mode/spec.md` — "ZooAnimalId Widens the Zoo's
Animal Vocabulary"; `zoo-map/spec.md` — "Adventure Backdrop Registry Re-Keyed
to the Adventure"; `trace-canvas/spec.md`'s luma-law scenarios (data half
only — see the drift note above). **Ordering constraint: 2.1 and the pipeline
run (2.2) MUST land and execute before 2.3-2.5 hand-copy any measured value**
— no code reads a new asset dimension or sampled colour ahead of the rebuild.
2.3 depends on 2.2's manifest output; 2.4/2.5 depend on 2.3's `CHANNEL_STONE`
being defined; 2.6 is independent and could run in parallel with 2.4/2.5.

- [x] 2.1 In `scripts/art/build_art.py`: add `('oveja.png', 'sector-
      sheep.png', 448, 'contour', True)` to `SINGLES` (the llama's own row).
      Change the two mountain `PASSTHROUGHS` rows' `corridor_rows` from `None`
      to `(220, 866)` (ladera) and `(166, 858)` (cordillera) — `design.md`
      §2.2's derivation from the frozen geometry, not a guess. No new
      invocation surface, no new argument, no new caller.
- [x] 2.2 Run the art pipeline (`python3 scripts/art/build_art.py` or its
      documented invocation) to regenerate `manifest.json`. Read back
      `manifest.json`'s `sector-sheep` entry for its measured `w` (h is the
      known `448`) and the two backdrop entries' `quiet`/`brightest`. **No
      later task may hand-copy a literal until this step has actually run.**
- [x] 2.3 In `client/src/detective/assets.ts`: add `oveja.png`'s measured
      `w`/`448` as `SECTOR_ADVENTURE_ART.sheep` (widen the type union to
      include `'sheep'`, mirroring the already-registered `llama` row). Add
      `ZooAnimalId = AnimalId | 'oveja' | 'llama'` and `ZOO_ANIMAL_ART:
      Readonly<Record<ZooAnimalId, ArtImage>> = {...ANIMAL_ART, oveja:
      SECTOR_ADVENTURE_ART.sheep, llama: SECTOR_ADVENTURE_ART.llama}` (spread
      preserves referential identity for every existing entry). **No entry is
      added to `AUTHORED_SOURCE_SIZES`** — settled: `oveja.png` belongs to the
      pre-existing hand-drawn animal family (`gallina.png`, `pato.png`), which
      that table does not cover either.
- [x] 2.4 In `client/src/zoo/backdrops.ts`: rename `SectorBackdrop` →
      `AdventureBackdrop` and `SECTOR_BACKDROP` → `ADVENTURE_BACKDROP: Partial
      <Record<AdventureId, AdventureBackdrop>>` (see the flagged forward
      reference above — this line will not typecheck until Phase 4 lands
      `AdventureId`/`Adventure.id`; write it against that contract now). Add
      `channel?: string` to the interface (absent = `SHEET_PAPER`, which is
      what keeps the lagoon's `duck` row byte-identical — no `channel` field
      on it). Add `export const CHANNEL_STONE = '#606569'`. Add the `sheep`
      row (`art: SECTOR_BACKGROUND_ART.slope, quiet: '#9da396', brightest:
      <measured>, corridorRows: {220, 866}, channel: CHANNEL_STONE`) and the
      `llama` row (`art: SECTOR_BACKGROUND_ART.range, quiet: '#c8d3d8',
      brightest: <measured>, corridorRows: {166, 858}, channel:
      CHANNEL_STONE`) using 2.2's measured `brightest` values. Change
      `backdropFor` to key through `adventureFor(levelId)?.id`.
- [x] 2.5 In `client/src/zoo/backdrops.test.ts`: (a) the luma law for all
      three registered backdrops — `|luma(backdrop.channel ?? SHEET_PAPER) -
      luma(backdrop.brightest)| >= 55`; (b) `corridorRows` coverage — each of
      the eight sheep/llama level ids' widest channel extent (`design.md`
      §1.4's table, converted via `viewBoxToImage`) falls inside its own
      adventure's `corridorRows`; (c) `backdropFor('sheep-hill2')` returns the
      ladera row with `channel === CHANNEL_STONE`; `backdropFor('llama-
      peak2')` returns the cordillera row with `channel === CHANNEL_STONE`;
      a duck id still returns the lagoon row with no `channel`; a medusa id
      and `trail1` still return `undefined` (paso B's regression guard,
      re-run). The four falsifiability rows and their `SHEET_PAPER`-vs-
      cordillera companion move to task 6.2 (they need `MUD_INK`/`GOAL_COLOR`/
      the marker literal, which live in `LevelPlay.tsx`/`TraceCanvas.tsx`,
      not here).
- [x] 2.6 In `client/src/detective/artManifest.test.ts`: extend the existing
      registry↔manifest parity check with two more backdrop rows —
      `ADVENTURE_BACKDROP.sheep`/`.llama` against `manifest['sector-slope-
      background']`/`['sector-range-background']`'s `quiet`/`brightest`/
      `corridorRows` — and one asset row confirming `SECTOR_ADVENTURE_ART.
      sheep.w`/`.h` match `manifest['sector-sheep'].w`/`.h`.
- [x] 2.7 Run `npx vitest run client/src/zoo/backdrops.test.ts client/src/
      detective/artManifest.test.ts` — expect `backdrops.ts` to fail to
      resolve `AdventureId` until Phase 4 lands (the flagged forward
      reference); `artManifest.test.ts` must be green on its own.

## Phase 3: The Eight Levels (C3)

Spec traceability: `level-engine/spec.md` — "Sheep and Llama Ridge Level Set",
"Sheep vs Llama Height, Slope and Corner Invariants", "Docs §6/§14 Checklist
Coverage". Depends on Phase 1's `peakRidge`/`peakRidgeCorridorLimit`. 3.1
before 3.2.

- [x] 3.1 In `client/src/levels/catalog.ts`: insert eight entries into
      `PHASE_1`, between `trail4` and `f2-guirnalda` — `sheep-hill1..4` then
      `llama-peak1..4`. Shared across all eight: `x0:90, x1:910, base:480,
      phase:1, kind:'path', surface:'blank', maze:true, resetOnContact:true,
      carrier:false, showGuide:true, letters:[], rules(1,false,true,0),
      mustBeContinuous:false`, no `obstacles`. Per `design.md` §1.4's table:
      sheep `heights`/`corridorWidth` = `[320,320]`/100, `[320,320,320]`/90,
      `[320,170,320]`/80, `[320,170,320,170]`/60 (`taper:{from:1,to:0.85}`);
      llama = `[360]`/90, `[360,180]`/80, `[360,360,360]`/70,
      `[360,360,360,360]`/60 (`taper:{from:1,to:0.85}`). `demo:true` on
      `sheep-hill1` and `llama-peak1` only; `feedback.rail:true` on `sheep-
      hill1` only. Titles/hints/intros/closings from `design.md` §5.2, each
      ≤ 80 chars, naming no failure.
- [x] 3.2 In `client/src/levels/catalog.test.ts`: insert the eight ids into
      `EXPECTED_IDS` (lines 36-61) between `'trail4'` and `'f2-guirnalda'`, in
      `sheep-hill1..4, llama-peak1..4` order — the hardcoded, order-sensitive
      `.toEqual` this test already runs. Add a new `describe('LEVELS — the
      mountain family is one ridge pair')` restating I1-I4, I6-I7 from
      `design.md` §1.5/§1.4 directly over the eight authored literals (not
      re-derived from geometry): I1 every sheep height < every llama height;
      I2 steepest sheep leg slope (3.122) < steepest llama (3.512); I3
      sharpest sheep corner angle (35.52°) > sharpest llama (31.78°); I4 from
      `sheep-hill3` onward at least one vertex ≤ 0.55× that level's own
      tallest; I6 llama heights uniform except `llama-peak2` = `[tall,
      tall/2]`; I7 `peakRidgeCorridorLimit(level) >= corridorWidth *
      max(taper.from, 1)` for all eight, using Phase 1's function directly.
      `corridorWidth` strictly decreasing within each adventure is already
      exercised by I7's own per-level rows; add one explicit row for it too.
      Confirm (no edit) that `catalog.test.ts:415-434`'s phase-1 span/minY/
      maxY guard passes automatically for the eight.
- [x] 3.3 Run `npx vitest run client/src/levels/catalog.test.ts` — green.
      The eight levels exist in `LEVELS` but are unreachable from the map
      until Phase 4 opens `montañas` (expected, not a defect).

## Phase 4: Registries and Vertex Art Wiring (C4)

Spec traceability: `zoo-map/spec.md` — "Sector-to-Adventure Mapping",
"Backpack Registry", "Octopus Phrase Reads as a Closing...", "Montañas Sector
Opened...", "Adventure Backdrop Registry Re-Keyed..."; `level-engine/spec.md`
— "Vertex Art Field and Placement Selector"; `trace-canvas/spec.md` — "Vertex
Art Rendering Layer", "Demo Stroke Contrasts With the Channel", plus the
render-level scenarios of "Channel Paint Follows the Backdrop Luma Law";
`detective-mode/spec.md` — "Sheep and Llama Levels Stay Outside the Detective
World"; `main-screen/spec.md` (test-only — `resolveEnterAction` is already
adventure-generic; the delta corrects stale spec prose, not code). Depends on
Phase 3's eight level ids and Phase 2's `CHANNEL_STONE`/backdrop rows.
Sequential: 4.1 before 4.2 (widens `AdventureId` before `backdrops.ts` can
resolve it — this is also what unblocks Phase 2's flagged forward reference);
4.3/4.4 depend on 4.1; 4.5-4.8 (`TraceCanvas`/`LevelPlay`) can run in either
order relative to 4.3/4.4 but both depend on 4.1's ids existing; 4.9/4.10
(backpack) are independent and could run in parallel with everything else in
this phase.

- [x] 4.1 In `client/src/zoo/adventures.ts`: add `export type AdventureId =
      'duck' | 'sheep' | 'llama'`; give `Adventure` a required `id:
      AdventureId`; set the existing duck row's `id: 'duck'`; add the `sheep`
      row (`levelIds: sheep-hill1..4, id:'sheep', sector:'montanas',
      animal:'oveja'`) and the `llama` row (`levelIds: llama-peak1..4,
      id:'llama', sector:'montanas', animal:'llama'`) with the intro/closing
      strings from `design.md` §5.2. Fix the defect found by reading:
      `mapBubble` uses `ADVENTURES.find(...)` (returns the FIRST match) —
      change to `ADVENTURES.filter(...).at(-1)` (the MOST RECENTLY recovered,
      in registry order), or the llama's closing line can never render once
      the sheep are already home.
- [x] 4.2 In `client/src/zoo/adventures.test.ts`: `adventureFor`/`introLevel`
      resolve the six new ids correctly (`sheep-hill1`→intro row,
      `sheep-hill2..4`→`undefined` for `introLevel`, same for llama).
      `mapBubble` for `montañas`: none recovered → `ONWARD`; `sheep-hill4`
      filed, `llama-peak4` unfiled → the sheep's closing line; both filed →
      the LLAMA's closing line (not the sheep's) — the defect fix, proven.
- [x] 4.3 In `client/src/zoo/sectors.ts`: `montañas.unlockedWhen` →
      `(records) => isFiled(records, 'duck-trail4')` (the first
      `unlockedWhen` that is neither `alwaysOpen` nor `alwaysClosed`).
      `animals: [{id:'oveja', dx:-55, dy:10, size:84,
      appearsWhen:['sheep-hill4']}, {id:'llama', dx:55, dy:-6, size:96,
      appearsWhen:['llama-peak4']}]` — the llama's smaller/negative `dy`
      stands it higher. `adventureIds: [...sheep-hill1..4,
      ...llama-peak1..4]`. Widen `ZooAnimal.id` to `ZooAnimalId`.
- [x] 4.4 In `client/src/zoo/sectors.test.ts`: narrow the filter at lines
      213-220 from `s.id !== 'estanque' && s.id !== 'sendero'` to also
      exclude `'montanas'`, leaving exactly the four remaining undeveloped
      sectors (`entrada`, `bosque`, `arena`, `nocturna`) asserted fogged and
      adventure-less for any input. Add: `montañas.unlockedWhen({})` is
      `false`; is `true` once `duck-trail4` is filed; with `sheep-hill4`
      filed and `llama-peak4` unfiled, `animalPlacements` includes the sheep
      and excludes the llama; with both placed, the llama's `dy` sits above
      the sheep's.
- [x] 4.5 In `client/src/levels/types.ts`: add `vertexArt?: {art: ArtImage;
      size: number}`, additive, absent on every level that predates it —
      the same convention `goalArt` established.
- [x] 4.6 Create `client/src/levels/vertexArt.ts`: pure, DOM-free
      `routeApexes(polyline, minRise = 40)` — scans the already-centred
      `LevelTarget.polyline` for local y-minima (peaks), in route order,
      rejecting rises below `minRise`. No `ClueKind`, no rail entry, no case
      membership — never touches `isCaseTrail`/`inDetectiveWorld`.
- [x] 4.7 Create `client/src/levels/vertexArt.test.ts`: `routeApexes` on
      `sheep-hill3`'s built polyline returns 3 points, each within 3 units of
      its authored apex; on `llama-peak4`'s, 4 points; a flat polyline
      returns `[]`; `isCaseTrail`/`inDetectiveWorld` are unaffected by
      `vertexArt`'s presence on a level.
- [x] 4.8 In `client/src/canvas/TraceCanvas.tsx`: add `channel?: string` to
      `TraceBackdrop` (absent = `SHEET_PAPER`). Add `TraceVertexArt`
      (`href`/`w`/`h`/`size`, `at: {x,y}[]`) and a `vertexArt?` prop;
      render one `<image>` per `at` entry via `placeArt({..., grip:
      STANDING_GRIP})` + `clampArtBox(..., sheetBounds)`, immediately before
      the `endMarker && endArt` block. Extract the inline `#0284c7` literal
      to a named `DEMO_STROKE` const. Change exactly three conditionals: the
      two channel `stroke` ternaries (currently `ground && !backdrop ?
      CORRIDOR_EARTH : SHEET_PAPER`) → `ground && !backdrop ? CORRIDOR_EARTH
      : (backdrop?.channel ?? SHEET_PAPER)`; the demo path's `stroke="#0284c7"`
      → `stroke={backdrop?.channel ? SHEET_PAPER : DEMO_STROKE}`. No
      `<mask>`, `<pattern>`, `<clipPath>`, `<defs>`, `useId`, or `url(#…)`.
- [x] 4.9 In `client/src/canvas/TraceCanvas.test.tsx`: (a) with `vertexArt`
      set to 3 points, exactly 3 attributable `<image>`s render, each via
      `placeArt`'s formula, and all render before (under) the `endArt` block;
      no `vertexArt` prop → none render; (b) with a backdrop declaring
      `channel: CHANNEL_STONE`, the channel `<path>`'s `stroke` equals
      `CHANNEL_STONE`, and the demo path's `stroke` equals `SHEET_PAPER`; (c)
      with the lagoon backdrop (no `channel`) or no backdrop, channel/demo
      stroke follow today's `ground ? CORRIDOR_EARTH : SHEET_PAPER` /
      `DEMO_STROKE` rules; (d) zero `<mask`/`<pattern`/`<clipPath`/`<defs`/
      `url(#` anywhere in the diff.
- [x] 4.10 **Byte-identical regression, its own row.** In
      `client/src/canvas/TraceCanvas.test.tsx`: render with the lagoon
      backdrop (`channel` absent) and confirm the emitted markup is BYTE-
      IDENTICAL to a snapshot taken before this change (same `stroke`
      attributes, same `<image>` set, no vertex-art layer, no `DEMO_STROKE`
      substitution) — proves the additive fields cost the shipped duck levels
      nothing. Pair with a tightness check: the same assertion with a
      `channel` string injected MUST fail, so the byte-identity check is
      provably sensitive, not vacuous.
- [x] 4.11 In `client/src/screen/LevelPlay.tsx`: add `const drawnPlace =
      inWorld || !!backdrop`. Change three call sites: `startArt` from
      `inWorld ? OCTOPUS_ART : undefined` to `drawnPlace ? {...OCTOPUS_ART,
      size: OCTOPUS_SIZE} : undefined`; `inkOnly` from `inWorld` to
      `drawnPlace`; `directionArrow` from `showMarkers && !inWorld` to
      `showMarkers && !drawnPlace`. Pass `channel: backdrop?.channel` through
      the existing backdrop-resolution memo. Resolve `vertexArt` from
      `level.vertexArt` + `routeApexes(target.polyline)` into
      `TraceVertexArt`'s `at` array when both are present.
- [x] 4.12 In `client/src/screen/LevelPlay.test.tsx`: `sheep-hill3` — the
      octopus stands at the start, no direction arrow renders, markers are
      `inkOnly`, zero `GROUND_GRASS`/`GROUND_MUD` hrefs; **regression pair,
      named explicitly**: `duck-trail2` and `f2-agua2` render byte-identical
      to before this change (the medusa keeps its scattered ground, the duck
      keeps its lagoon behaviour — `drawnPlace` evaluates the same as
      `inWorld`/`backdrop` did separately for both).
- [ ] 4.13 In `client/src/zoo/backpack.ts`: `BACKPACK_ITEMS = [{id:'andean-
      hat', art: ANDEAN_HAT_ART, grantedBy:'montanas',
      earnedWhen:['llama-peak4']}]`; correct the header comment (no longer
      "paso D's decision" for THIS item — paso D still owns every other
      sector's grant).
- [ ] 4.14 In `client/src/zoo/backpack.test.ts`: `earnedItems` returns `[]`
      while `llama-peak4` is unfiled and includes `andean-hat` once it is.
- [ ] 4.15 In `client/src/zoo/stars.test.ts`: add one row confirming
      `totalStars` counts approvals on the eight new real catalog ids with no
      change to `stars.ts` itself (`REAL_LEVEL_IDS` already contains them via
      `catalog.ts`'s `LEVELS`).
- [ ] 4.16 In `client/src/screen/GameScreen.test.tsx`: extend the
      `resolveEnterAction` describe with `'sheep-hill1'` and `'llama-peak1'`
      rows (each → `{view:'intro', levelId}`, unconditional on `records`) and
      confirm `'sheep-hill2..4'`/`'llama-peak2..4'` still resolve straight to
      `play` — `resolveEnterAction` needs no code change (it already calls
      `introLevel`, which is adventure-generic), this closes the coverage gap
      the stale spec prose left.
- [ ] 4.17 In `client/src/screen/AdventureIntro.test.tsx`: two new render
      rows — the sheep adventure's entry shows `ZOO_ANIMAL_ART.oveja`'s href
      and its own `intro` text; the llama adventure's shows
      `ZOO_ANIMAL_ART.llama`'s href and its own `intro` text; `auditCaptions`
      stays clean for both.
- [ ] 4.18 Run `npx vitest run client/src/levels/vertexArt.test.ts
      client/src/canvas/TraceCanvas.test.tsx client/src/screen/
      LevelPlay.test.tsx client/src/zoo client/src/screen/GameScreen.test.tsx
      client/src/screen/AdventureIntro.test.tsx` — green, and re-run Phase
      2's `backdrops.test.ts` now that `AdventureId` exists — it must be
      green too.

## Phase 5: Detective-Mode Regression (confirm, not edit)

Spec traceability: `detective-mode/spec.md` — "Sheep and Llama Levels Stay
Outside the Detective World". No code change — §3.1's mud-ink arithmetic
already settles `detectiveWorld` absent on all eight.

- [ ] 5.1 Run `npx vitest run client/src/levels/world.test.ts` — confirm it
      stays green with **no edit** and that its pinned world-only level-id
      list gains none of the eight.
- [ ] 5.2 Add one row to `client/src/screen/LevelPlay.test.tsx` (or
      `world.test.ts`, whichever already covers this shape) confirming
      `sheep-hill1` rendered via `renderToString` shows its title and hint
      text, unlike a world-only level's wordless shell.

## Phase 6: Falsifiability Rows (must go RED)

**A check that cannot fail is not a check** — each row below is its own task
because each proves the luma law is sensitive, not vacuously true.

- [x] 6.1 In `client/src/zoo/backdrops.test.ts`: add the lagoon-byte-identical
      regression as its own row — `ADVENTURE_BACKDROP.duck` renders with no
      `channel` field and the resolved paint equals `SHEET_PAPER`, matching
      what shipped before this change. (Data-level companion to 4.10's
      component-level version.)
- [x] 6.2 In `client/src/canvas/TraceCanvas.test.tsx` (or a new
      `palette`-adjacent describe if a pure test is preferred — either
      satisfies the spec, component-level is chosen here since `MUD_INK`/
      `GOAL_COLOR`/the marker literal are module-private to `LevelPlay.tsx`/
      `TraceCanvas.tsx`): four falsifiability rows, each asserting
      `|luma(x) - luma(CHANNEL_STONE)| < 55` — `MUD_INK` (`#8a6a4a`, gap 12);
      `GOAL_COLOR` (`#b45309`, gap 4); the start marker/direction-arrow green
      (`#22c55e`, gap 37); `DEMO_STROKE` (`#0284c7`, gap 1). Add a fifth,
      separately labelled row (not one of the four, see the drift note
      above) — `SHEET_PAPER` vs the cordillera's `brightest` (gap 7) — proving
      §2.1's independent "no admissible light channel" claim.
- [x] 6.3 Run `npx vitest run client/src/zoo/backdrops.test.ts client/src/
      canvas/TraceCanvas.test.tsx` and confirm all five/four rows fail before
      any production code changes their inputs, then pass once `CHANNEL_STONE`
      is wired (i.e., write these as RED first if TDD sequencing is followed
      for this phase; otherwise confirm by temporarily asserting the inverse
      and reverting — either way, record which method was used).

## Phase 7: Screenshot Verification (human-reviewed, not optional)

Spec-adjacent: `docs/12` §4; `design.md`'s Testing Strategy table names what
only a capture can answer. Sequential — capture, read, correct if needed,
re-capture. Depends on all of Phases 1-6 landing (this is the only surface
where backdrop, channel, vertex art and registries are all live together).

- [ ] 7.1 Start the dev server: `npm run dev -- --host 0.0.0.0` (port 5173).
- [ ] 7.2 Capture all eight levels via `scripts/shot.sh` into `capturas/`
      (gitignored): `?nivel=sheep-hill1..4` and `?nivel=llama-peak1..4`,
      1000x600 each.
- [ ] 7.3 Capture both narrative entries (`capturas/sheep-intro.png`,
      `capturas/llama-intro.png`) via an interactive session — tap
      `montañas` on the map after `duck-trail4` is filed (devtools or a full
      playthrough), same constraint the duck change's task 4.3 recorded:
      `?nivel=` bypasses the entry by design.
- [ ] 7.4 Capture the map before and after each adventure closes
      (`capturas/zoo-map-montanas-locked.png`, `-sheep-recovered.png`,
      `-both-recovered.png`) and the backpack HUD with the hat present.
- [ ] 7.5 Capture one duck level and one medusa level, proving both are
      visually unchanged (regression evidence alongside 4.10's byte-identical
      test).
- [ ] 7.6 **Read every capture from 7.2-7.5.** Specifically: does the stone
      channel over each mountain backdrop read as a path rather than a scar;
      do the sheep/llama read as standing ON their peaks at 56/64 viewBox
      units; does the `SHEET_PAPER` demo line read as a demonstration over
      stone; does the ladera's `quiet` band (luma 160) behind the intro
      screen leave its caption legible; does the llama channel grazing the
      snow cap at viewBox 75 look deliberate or clipped; do the eight levels'
      visible title/hint/result block (§3.1's forced non-world rendering)
      read as a different app next to the wordless duck levels.
- [ ] 7.7 If 7.6 finds a defect, correct the responsible code (never the
      already-measured registry literals), re-run the affected phase's
      tests, and re-capture. Record what was found and changed, or record
      that no correction was needed.

## Phase 8: Final Gate

- [ ] 8.1 Run `npm test` (full suite) — green. Baseline: **63 test files /
      1223 tests**. Report the actual new totals (this change nets: +2 files
      from `vertexArt.ts`+test; the seven other `.test.ts` files listed above
      grow in place, no new files) — the change must not drop a test outside
      any deliberate, named removal (none are named here).
- [ ] 8.2 Run `npm run build` — green.
- [ ] 8.3 Confirm byte-identical-to-`main`: `cases.ts`, `Deduction.tsx`,
      `AnimalId`, `ClueKind`, the four duck levels, the four medusa levels,
      `trail1..4`, `palette.ts`'s existing exports.
- [ ] 8.4 Confirm zero new `url(#` occurrences (`rg 'url\(#' client/src`
      shows no hits beyond whatever pre-existed, which is none per
      `TraceCanvas.tsx:70-84`'s ban).
- [ ] 8.5 **Scope stop.** Confirm no row D-H content was started (entrance
      screen beyond this row's own narrative entry, night sector,
      flashlight, snakes, bees, dolphins, hedgehog, the snail, mazes-and-
      clues); no edit to `cases.ts`/`Deduction`/the pistas machinery.

---

## Delivery decision (orchestrator, before apply)

Awaiting the user's choice between `size:exception` (single PR, C1-C4 as
internal commit slices) and a split into chained/stacked PRs along the C1→C2→
C3→C4 seam above. `delivery_strategy` is cached `single-pr`, so per the
review-workload guard this decision is required before `sdd-apply` starts
oversized work.

---

### Accepted deviation

This document exceeds the skill's 530-word cap, the same deviation
`design.md` (this change) and `archive/2026-09-13-duck-undulations-and-
sector-backdrop/design.md:908-916` recorded for their own caps. The
orchestrator's brief asked for an itemised, file-by-file changed-line
forecast, an explicit task per falsifiability row, and named ordering
constraints across a four-slice, ~1,155-line change — that content does not
fit a checklist held under 530 words without deleting the exact traceability
the brief asked for.
