# Proposal: Sheep and llama peaks in the mountains

Scope is `docs/13_AVENTURAS_POR_ANIMAL.md` §8 **row C, and only row C**:
*"Ovejas y llamas en las montañas, con sus fondos; el gorro a la mochila"*,
mechanic *"Alturas por vértice; medición de fusión de esquinas"*.

## Intent

Row B gave one adventure a shape, a place and a story. Row C is the first
one that has to be built from nothing, and it is the step where the engine
runs out of vocabulary.

- **There is no per-vertex height.** `triangularWave` →
  `alternatingZigzag` (`paths.ts:449-467`) carries ONE global `amplitude`;
  every apex is the same height by construction. `docs/13` §4 asks the
  sheep for a *"lista de alturas por vértice (alta-baja)"* — the author's
  own schematic (`docs/referencias/ovejas-alta-baja.png`) is captioned
  *"Alta - baja - alta - baja"*. The engine cannot draw that sentence.
- **Corner fusion has never been measured on a triangular route.**
  `cornerClearance` (`paths.ts:417-421`) ships and is asserted — but only
  against the square wave's 90° corners (`catalog.test.ts:30`,
  `catalog.ts:439-444`). Nothing derives a triangular apex's interior angle
  from its amplitude and half-cycle width. `docs/13` §4 makes that
  measurement a precondition for promising close llama peaks.
- **The montañas sector is fogged and empty.** `sectors.ts:346-355`:
  `unlockedWhen: alwaysClosed`, `animals: []`, `adventureIds: []`. Two
  backdrops (`sector-slope-background.png`, `sector-range-background.png`)
  and the llama cutout are already built and registered and nothing reaches
  them; `oveja.png` sits in `art-source/` unwired entirely.
- **The backpack is empty and its comment is wrong.** `backpack.ts:21-22`
  says the contents are "paso D's decision". `docs/13` §8 row C assigns the
  shepherd's hat here, and `andean-hat.png` already ships.

## Scope

### In scope

1. A per-vertex-height zigzag generator, plus the closed-form corner-fusion
   derivation for a triangular apex, both pure and tested (`paths.ts`).
2. Eight new phase-1 levels: `sheep-hill1..4` (ladera) and
   `llama-peak1..4` (cumbre), each satisfying the phase-1 arm guard, the
   corner-fusion predicate and its own progression step.
3. The two mountain backdrops under their corridors, which requires
   re-keying the backdrop registry from sector to ADVENTURE (one sector,
   two backdrops) and sampling `corridor_rows` for both PNGs.
4. `oveja.png` through the art pipeline; sheep and llama reachable as zoo
   animals.
5. The montañas sector opened, its two adventures registered, both animals
   standing in it when their adventure closes.
6. The Andean hat as `BACKPACK_ITEMS`' first entry.
7. A small primitive for standing static art at a route's own vertices —
   the sheep on the humps, the llamas on the peaks — WITHOUT making these
   levels detective trails.

### Out of scope (explicitly unchanged)

Rows D–H (entrance, night sector, flashlight, snakes, bees, dolphins,
hedgehog) and the snail; the paused three-option deduction (`cases.ts`,
`Deduction.tsx`, `ClueKind`, `AnimalId` — all untouched, `docs/13` §4
decision 1); the four duck levels and the lagoon; the four medusa levels;
`f2-colinas`/`f2-bucles`/`f2-crestas` (`docs/11`'s phase-2 "Nivel 4", a
different thing with the same name); `trail1..4`; the octopus WEARING the
hat (row C's words are *"el gorro a la mochila"*, and a composited sprite
needs art that does not exist); letters; any level id rename; any change to
the persisted store schema.

## Capabilities

### New capabilities

None.

### Modified capabilities

- `level-engine`: a per-vertex-height zigzag generator; the corner-fusion
  derivation for triangular apexes as an asserted authoring predicate; the
  sheep and llama progressions as authored invariants; an optional
  `LevelConfig` field for vertex-standing art.
- `trace-canvas`: a vertex-art layer; the channel's paint becomes a
  per-backdrop choice rather than a hardcoded `SHEET_PAPER`.
- `zoo-map`: montañas opens, carries two adventures and two animals; the
  backpack gains its first item.
- `main-screen`: two more adventures route through the existing narrative
  entry; no new routing.
- `detective-mode`: the zoo animal vocabulary widens without widening the
  deduction's `AnimalId`.

## The decisions

### 1. Sheep vs llamas: the differentiator is MEAN SLOPE via height alternation, not absolute height

**The conflict is real and it is three-way.** `catalog.test.ts:415-424`
forces every phase-1 routed level to span > 300 with `minY < 180` and
`maxY > 420` — around `y = 300` that is amplitude > 150 for the tallest
vertex. Paso B already ruled that this guard (`docs/01:49`, phase 1 trains
the arm) outranks a schematic's proportions. `docs/13` §2 and `docs/14` §7
say twice that the sheep must be *"más cortas y menos empinadas"* than the
llamas. `docs/13` §2 also gives the sheep *"más repeticiones"*. Under a
fixed span, more repetitions means a shorter run per leg, which means
STEEPER. You can satisfy at most two of {guard, more repetitions, less
steep} through the envelope alone.

**Measured, the schematics do not separate on slope either.** Off
`ovejas-alta-baja.png`: four apexes, half-cycle ≈ 50 px, tall rise ≈ 91,
short rise ≈ 51 — leg slopes 1.82 and 1.02. Off `llamas-picos.png`: three
apexes, half-widths ≈ 132/100/155, rises ≈ 243/123/297 — slopes 1.84, 1.23,
1.92. The tall sheep legs and the llama legs are the same steepness. What
differs is that HALF the sheep's legs are short ones and none of the
llama's are.

**Position adopted.** The per-vertex height list is the differentiator, and
what it buys is a lower **mean absolute leg slope**:

- **Sheep** — alternating heights. The tall vertices exist to satisfy the
  arm guard; the short vertices carry the identity. Half of the direction
  changes the child actually makes are shallow, which is what *"montañita
  corta"* means motorically.
- **Llamas** — uniform full-height apexes (except their own step 2,
  *"pico alto y pico bajo"*, which the schematic draws at ≈ 50% and which
  is one step of four, not the family's identity).

Worked illustration, 3 apexes over `x0 = 90 … x1 = 910`, run 136.7: a sheep
row of heights `[tall, short, tall]` yields leg slopes 2.34/2.34/1.10/1.10/
2.34/2.34, **mean 1.93**; the llama row `[tall, tall, tall]` yields
**2.34** uniform. The separation is real, it is a property of the height
list and not of the envelope, and it survives the guard untouched. Design
fixes the exact numbers; the proposal fixes the invariant:

> For each matched step *i*, `meanLegSlope(sheep-hill_i) < meanLegSlope(llama-peak_i)`,
> and from sheep step 3 onward every sheep level has at least one vertex at
> ≤ 0.55 × its own tallest.

Asserted in `catalog.test.ts`, in the spirit of the duck family test. A
max-vs-min formulation is rejected: llama step 1 is a single broad peak
(run 410, slope ≈ 0.78) and is by construction the gentlest route in the
sector, so no global ordering can hold.

**The guard is not relaxed and these levels are not demoted to phase 2.**
Making them phase 2 would exempt them from the guard and let the sheep be
literally short — but phase 2 is `f2-colinas`' band (`catalog.test.ts:436-443`
pins phase 2 inside 150–450 because *those are letter shapes*), and this is
arm work on a blank sheet. Recorded as a question for the author below, not
taken unilaterally.

### 2. Corner fusion binds by RUN, not by steepness — and `trail3` already fails it

**Derivation.** For a zigzag leg with horizontal run `r` (a quarter period)
and vertical rise `a`, the interior half-angle satisfies `tan(θ/2) = r/a`,
so a rounded join eats `(W/2)·(a/r)` of each incident leg. `cornerClearance`'s
own condition `L − 2·(W/2)/tan(θ/2) ≥ W` therefore reduces to a closed form
for the widest admissible corridor:

> `W* = r · √(r² + a²) / (r + a)`

**The consequence is not what `docs/13` §4 assumed.** Write `k = a/r`; then
`W*/r = √(1+k²)/(1+k)`, which is **0.707 at k = 1 and never exceeds 0.85
for any k in [0.2, 5]**. Steepness is almost irrelevant. **The corridor is
bounded at roughly 0.7–0.85 × the quarter-period run, whatever the apex
height.** So the binding pair is the sheep's own progression steps 2 and 4
(*more repetitions* shrinks `r`, *narrowing the path* is the only free
variable left), not the llamas' steep peaks — the llamas buy slack simply
by having few, wide peaks. The prompt's instinct that the sheep bind is
correct; the reason is repetition count, not short legs.

**Asymmetric corners.** With alternating heights a valley sits between two
different rises, so its two incident legs consume different amounts and
`cornerClearance`'s single `interiorDeg` no longer describes it. The
shipped helper is NOT changed (it is asserted in `paths.test.ts` and used
by `trail4`). A new pure derivation computes each vertex's interior angle
and each leg's length from the height list, and applies `cornerClearance`
per leg with the SMALLER of its two incident angles — conservative, exact
in the uniform case, and reusing the shipped predicate rather than forking
it.

**A pre-existing failure, named so it is not rediscovered as a defect of
this change.** `trail3` (`catalog.ts:417-418`) is
`triangularWave({x0: 90, x1: 910, amplitude: 200, cycles: 3})` at
`corridorWidth: 90`. Its run is 136.7 and its rise 200, so `W* ≈ 53.8`: its
rounded corners already merge, by a factor of 1.7. It is a duck-era level
outside row C. **The new assertion is scoped to the eight authored sheep
and llama levels**, with `trail3` recorded here as a follow-up. A catalog-
wide predicate would go red on `main` content this change does not own.

### 3. One sector, two backdrops — the backdrop registry re-keys to the adventure

`SECTOR_BACKDROP` is `Partial<Record<SectorId, SectorBackdrop>>`
(`backdrops.ts:32`) and `montanas` needs TWO: the ladera under the sheep
and the cordillera under the llamas (`docs/13` §3, *"Misma montaña, dos
alturas"*). `backdropFor` already routes through `adventureFor` rather than
the sector — paso B's own header explains why — so the fix makes that
literal: `Adventure` gains an `id` (`'duck' | 'sheep' | 'llama'`) and the
registry becomes `Partial<Record<AdventureId, SectorBackdrop>>`. The
estanque keeps the lagoon on the duck row; the medusa still has no
adventure row and keeps its scattered ground, so paso B's out-of-scope
guarantee holds unchanged.

**`SectorBackdrop` also gains its channel paint.** `TraceCanvas.tsx:300-306`
hardcodes `SHEET_PAPER` whenever a backdrop is present, because the lagoon
made `CORRIDOR_EARTH` fail `docs/09:158` by 51. That law is a MAGNITUDE
("separa al menos 55 de luma"), so a bright backdrop needs the opposite
move. A mountain range may well be brighter than the lagoon, and
`SHEET_PAPER` (luma 251.9) has nowhere to go upward. Making the channel a
per-backdrop field, asserted against the sampled `brightest`, costs ~5 lines
and removes a bet on an unmeasured PNG.

### 4. Sheep on the humps without making these levels detective trails

`clue` makes a level a case trail: `PistasRail`, the case machinery, and
`world.test.ts`'s `inDetectiveWorld === isCaseTrail` assertion. `docs/13`
§4 decision 1 keeps the deduction paused, not revived. So the sheep are not
clue marks.

Instead, one optional additive `LevelConfig` field in the exact shape
`goalArt`/`hazardArt`/`detectiveWorld` already established (`types.ts:136-154`
— *"a level's own art beats a default it did not ask for"*), whose
placement is DERIVED from the route's own vertices by a pure selector over
the height list rather than authored as coordinates. Absent on every level
that predates it, so nothing existing moves.

### 5. Appended to `LEVELS`, no migration

`isUnlocked` is positional (`LevelProgressStore.ts:123-129`) and
`catalog.test.ts:36-61` pins `EXPECTED_IDS` order-sensitively. Inserting the
eight after `duck-trail4` would demote `trail1`'s predecessor and require a
third copy-forward migration (`migratePhase1.ts`, `migrateDuckCase.ts`) plus
its tests. **They are appended instead.** The zoo map is the child's route
and it does not consult `isUnlocked` (`ZooMap.tsx:280` reads
`nextAdventure`); `docs/13` §4 decision 2 already rules that the unit is the
adventure, not the catalog's linear index. Accepted cost: the dev-only
`LevelMap` will render the eight as `bloqueado` until `f5-mama` is
approved — a chrome surface with a test-mode switch, not a child-facing one.

### 6. The seven-step structure: five come for free, two are content

| `docs/13` §5 | Status |
|---|---|
| 1. Narrative entry | **Free mechanism** (`AdventureIntro`, `resolveEnterAction`, `introLevel`). Needs two `intro` strings and the sheep art registered. |
| 2. Minimal demo when the movement is new | **Decision.** The angular route IS new against the duck's smooth undulation, so `demo: true` on `sheep-hill1` and `llama-peak1` ONLY. Paso B recorded `demo: true` on all four ducks as a §5-item-2 violation; row C does not repeat it. |
| 3. First wide accessible challenge | Level 1 of each, widest corridor. |
| 4. Two or more variations | Levels 2–4 of each. |
| 5. Immediate response | **Free** (engine: tone, haptics, ink, `resetOnContact`). |
| 6. Narrative close | **Free mechanism** (`resolveNextAction` exits to the map, `mapBubble`, `animalPlacements`). Needs two `closing` strings and two `ZooAnimal` rows. |
| 7. Achievement record | **Free** (`LevelProgressStore`, `zoo/stars.ts`). |

`docs/13` §6 / `docs/14` §14's nine per-screen obligations (start zone,
expected trajectory, tolerance, contact response, error conditions,
restart, help animation, completion criterion, narrative transition) are
**all expressible in today's `LevelConfig`** — no engine field is added for
them. Tolerance starts wide and narrows monotonically within each
adventure, and the llama adventure starts no wider than the sheep adventure
ended, because the directive's progression accumulates.

### 7. Vocabulary: widen the ZOO's animal type, never the deduction's

`AnimalId` is *"one art per deduction-screen animal choice"*
(`assets.ts:45-46`) and `Deduction.tsx:116`'s `ANIMAL_LABEL` is an
exhaustive `Record<AnimalId, string>`. Adding `'oveja' | 'llama'` there
would force two labels into a paused screen's answer set. Instead a
`ZooAnimalId` superset plus a `ZOO_ANIMAL_ART` lookup; `ZooAnimal.id` and
`Adventure.animal` widen to it; `cases.ts` and `Deduction.tsx` are
byte-identical to `main`.

## Art pipeline work

| Item | State | Work |
|---|---|---|
| `oveja.png` | in `art-source/`, **unwired everywhere** | `SINGLES` row → `sector-sheep.png` (448, `contour`, keep fill — the llama's own row), `AUTHORED_SOURCE_SIZES` entry, `SECTOR_ADVENTURE_ART.sheep`, manifest rebuild |
| `llama.png` → `sector-llama.png` | built, registered (299×448) | wiring only |
| `gorro andino.png` → `andean-hat.png` | built, registered (216×256) | wiring only |
| `fondo ladera.png` / `fondo cordillera.png` | built, registered (1536×1024) | **`corridor_rows=None` in `PASSTHROUGHS`** — no `quiet`/`brightest` sampled, so `SECTOR_BACKDROP` cannot be filled. `sample_corridor_band` must run for both. **This is task one**: the geometry cannot be frozen before the admissible band is known. |

## Tests that must change, and why

| Test | Change | Why |
|---|---|---|
| `catalog.test.ts:36-61` `EXPECTED_IDS` | add 8 ids, in order | hardcoded order-sensitive `.toEqual` |
| `catalog.test.ts:415-424` phase-1 guard | **no edit** | applies automatically; the eight must clear it |
| `catalog.test.ts` | **new** family invariants | corridor monotonicity, mean-slope separation (decision 1), alternation from sheep step 3, corner clearance on all eight (decision 2) |
| `sectors.test.ts:213-220` | exclude `montanas` | it asserts the five undeveloped sectors stay adventure-less and fogged *for any input*; montañas stops being one |
| `sectors.test.ts` | **new** | montañas opens exactly on the duck adventure being filed; both animals appear on their own adventure's last level |
| `paths.test.ts` | **new** | generator emits only `M`/`L`; a uniform height list reproduces `triangularWave`'s `d` byte for byte; apex `y` exact; the clearance derivation against hand-computed angles |
| `artManifest.test.ts` | follows | guards manifest ↔ registry drift for the new `quiet`/`brightest`/`corridorRows` and the sheep asset |
| `palette.test.ts` (luma law) | **new rows** | each mountain backdrop's channel separates ≥ 55 luma from its sampled `brightest` |
| `backpack` test | **new** | first `BACKPACK_ITEMS` entry; `earnedItems` over records |
| `artHierarchy.test.ts` | follows | the sheep PNG enters the shipped-art comparison |

## Affected areas

| Area | Impact | What changes |
|---|---|---|
| `client/src/levels/paths.ts` | New | per-vertex-height zigzag; apex-angle/leg derivation; clearance predicate |
| `client/src/levels/catalog.ts` | New | 8 level entries |
| `client/src/levels/types.ts` | Modified | one optional vertex-art field |
| `client/src/canvas/TraceCanvas.tsx` | Modified | vertex-art layer; channel paint from the backdrop |
| `client/src/screen/LevelPlay.tsx` | Modified | wiring only (`ground` suppression already follows the backdrop) |
| `client/src/zoo/adventures.ts` | Modified | `AdventureId`; two rows |
| `client/src/zoo/backdrops.ts` | Modified | re-key to adventure; two rows; `channel` field |
| `client/src/zoo/sectors.ts` | Modified | montañas: `unlockedWhen`, `animals`, `adventureIds` |
| `client/src/zoo/backpack.ts` | Modified | first item; the stale header comment corrected |
| `client/src/detective/assets.ts` | Modified | `ZooAnimalId`, `ZOO_ANIMAL_ART`, `SECTOR_ADVENTURE_ART.sheep` |
| `scripts/art/build_art.py` + `manifest.json` | Modified | sheep row; `corridor_rows` for both mountain backgrounds |
| `docs/13_AVENTURAS_POR_ANIMAL.md` | Modified | §4 status rows for ovejas/llamas |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| The mountain backdrops' quiet band, once sampled, is too narrow or too bright for a 300+ unit route with a legible channel. Nothing about these two PNGs has been measured. | **High** | Sample `corridor_rows` FIRST (task one) and derive geometry inside the measured band via `viewBoxToImage`, exactly as `sectors.ts:165` reserves. Channel paint becomes a per-backdrop field (decision 3) so a bright range is answered by a darker token rather than by a broken law. |
| The author reads "montañitas cortas" as literal height and rejects decision 1. | Med | The invariant is one line of the catalog test and the heights are data. Question 1 below asks directly; the fallback (phase-2 demotion, guard exemption) is named and costed. |
| 8 levels + a generator + a primitive + a registry re-key exceeds the 800-line budget. | **High** | Forecast below, with a 4-slice seam. `sdd-tasks` owns the binding call. |
| The vertex-art primitive drifts toward re-implementing `clueMarks`. | Med | It is placement-by-vertex, not by arc length, and it carries no `ClueKind`, no rail entry and no case membership. If budget forces, the degraded fallback is `goalArt` at the route end only — named as a scope lever, not taken. |
| `trail3`'s pre-existing corner fusion gets pulled in as a "fix". | Med | Assertion scoped to the eight authored levels; `trail3` recorded as a follow-up in the verify report. |
| Appending leaves the eight reading `bloqueado` in the dev `LevelMap`. | Low | Accepted (decision 5); dev chrome has a test-mode switch. |

## Estimated size against the 800-line budget

| Area | Authored lines |
|---|---|
| `paths.ts` generator + clearance derivation | 90 |
| `paths.test.ts` | 90 |
| `catalog.ts` — 8 entries | ~200 |
| `catalog.test.ts` — ids + family invariants | 70 |
| Vertex-art field + `TraceCanvas` layer + `LevelPlay` + tests | ~95 |
| `assets.ts` (`ZooAnimalId`, `ZOO_ANIMAL_ART`, sheep) | 25 |
| `build_art.py` rows + sampling | 10 |
| `adventures.ts` + `backdrops.ts` re-key, rows, `channel` | 65 |
| Backdrop / manifest / luma tests | 75 |
| `sectors.ts` + `sectors.test.ts` | 65 |
| `backpack.ts` + test | 40 |
| Docs + misc | 25 |
| **Code total** | **~850** |

SDD artifacts are counted by the ledger separately and are the larger half:
proposal ~260, spec deltas ~200, design ~350, tasks ~250, verify report
~120 — **~1180 artifact lines**, so roughly **2000 total**. Stated plainly
rather than split: `sdd-tasks` produces the binding forecast.

**Decision needed before apply: Yes. Chained PRs recommended: Yes.
800-line budget risk: High.**

**The seam, if one is wanted** — four slices, each green on its own, in
dependency order:

| Slice | Contents | ~Lines |
|---|---|---|
| C1 | Geometry: the generator, the clearance derivation, `paths.test.ts` | 180 |
| C2 | Art + backdrop: sheep through the pipeline, `corridor_rows` sampled, `ZooAnimalId`, backdrop re-key + `channel` + luma tests | 240 |
| C3 | The eight levels and their catalog invariants | 270 |
| C4 | Registries and the vertex-art primitive: montañas, adventures, backpack, the standing sheep and llamas | 160 |

## Rollback plan

Required by `openspec/config.yaml` `rules.proposal`.

1. **Whole change.** `git revert` the merge / reset `sdd/ovejas-y-llamas` to
   `main`. Nothing here writes a new storage key, renames a level id or
   migrates a record, so a revert restores `main` with every child's
   progress intact. Records earned on the eight new ids simply become
   unreachable keys, exactly as `f1-travesia`'s already are.
2. **Sector only.** Set `montanas.unlockedWhen` back to `alwaysClosed` and
   empty its `adventureIds`. The eight levels stay in the catalog,
   reachable only by `?nivel=` deep link — which is how they will be
   reviewed anyway.
3. **Backdrops only.** Remove the two rows from the backdrop registry. Every
   consumer keys off "a backdrop is present", so the wall rect and the
   scattered ground come back for these levels with one edit.
4. **Vertex art only.** Drop the optional field from the eight configs; it
   is additive and absent everywhere else, so nothing else moves.
5. **Backpack only.** Empty `BACKPACK_ITEMS` again; `earnedItems` is already
   written for the empty case.

## Dependencies

Paso A (zoo map) and paso B (duck undulations, backdrop layer, narrative
entry and closing) are both on `main`. Every asset except `oveja.png` is
already built and registered. `oveja.png` exists in `art-source/` and needs
no generation — only a pipeline row. **No new art is commissioned.**

## Success criteria

- [ ] `corridor_rows` sampled for both mountain backgrounds; both
      backdrops' `quiet`/`brightest` hand-copied from the manifest and
      guarded against drift; every corridor's viewBox extent falls inside
      its own backdrop's sampled band via `viewBoxToImage`.
- [ ] All eight levels clear the three phase-1 assertions and stay on the
      sheet with their channels.
- [ ] The corner-fusion predicate is asserted on all eight authored levels
      and passes; the derivation is tested against hand-computed angles.
- [ ] A uniform height list reproduces `triangularWave`'s `d` byte for byte;
      the generator emits only `M`/`L` and survives `transformPath`.
- [ ] Per matched step, sheep mean leg slope < llama mean leg slope; from
      sheep step 3 every sheep level has a vertex at ≤ 0.55 × its tallest.
- [ ] `demo: true` on `sheep-hill1` and `llama-peak1` only.
- [ ] Sheep and llama stand on the map once their own adventure's last
      level is filed; the octopus's phrase closes each adventure.
- [ ] The hat is in the backpack HUD after `llama-peak4`.
- [ ] No `<mask>`, `<pattern>`, `<clipPath>`, `<defs>`, `useId` or any
      `url(#…)` anywhere in the diff.
- [ ] `cases.ts`, `Deduction.tsx`, `AnimalId`, `ClueKind`, the four duck
      levels, the four medusa levels and `trail1..4` are byte-identical to
      `main`.
- [ ] **Baseline held**: ≥ 63 test files / ≥ 1223 tests green,
      `npm run build` green.
- [ ] **Captures** into `capturas/`: each of the eight levels showing its
      backdrop, channel and standing animals; both narrative entries; the
      map before and after each adventure closes; the backpack with the
      hat; one duck level and one medusa level proving they are unchanged.

## Proposal question round

SDD ran in `auto` mode, so these could not be asked live. They are product
questions, not harness ones, and each has a stated working assumption the
change proceeds on unless corrected.

1. **Sheep "shortness" under the arm guard.** The phase-1 guard forces every
   route to reach the top and the bottom of the sheet, so the sheep cannot
   be literally shorter than the llamas. Is *"mean slope lowered by
   alternating tall and short vertices"* an acceptable reading of *"más
   cortas y menos empinadas"*? *Assumption: yes (decision 1). The
   alternative — exempting the sheep from the arm guard — contradicts
   `docs/01:49` and is not taken unilaterally.*
2. **The hat.** Row C says *"el gorro a la mochila"*. Does the Pulpito also
   visibly WEAR it during the llama adventure? *Assumption: no — backpack
   and HUD only; wearing it needs a composited sprite that does not exist.*
3. **When does the mountain open?** Paso D owns the intro that grants
   sectors. *Assumption: montañas opens when the duck adventure is filed
   (`duck-trail4`), so row C is reachable without waiting for paso D.*
4. **Where do the sheep stand?** On every apex, or only on the tall ones?
   *Assumption: on every apex — the schematic draws four sheep over four
   vertices of both heights.*
5. **When do the animals appear in the zoo?** One per completed level, or
   both animals only at the end of their own adventure? *Assumption: one
   animal per adventure, appearing when that adventure's last level is
   filed — the rule `duck-trail4` already established.*
