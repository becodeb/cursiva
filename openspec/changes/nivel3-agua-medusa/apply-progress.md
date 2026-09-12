# Apply Progress: nivel3-agua-medusa

Scope of the first pass: **Phase 1 only (S1 — world/case predicate split)**.
Scope of this second pass: **Phases 2 and 3 only (S2 — the migration; S3 —
per-cycle garland geometry)**, per an explicit parent-orchestrator scope
fence. Phases 4-8 remain untouched and `[ ]` in `tasks.md`.

## Completed Tasks

- [x] 1.1 Created `client/src/levels/world.ts` — `isCaseTrail(level)` and
  `inDetectiveWorld(level)`, both pure, no React/`detective/` import.
- [x] 1.2 Added `detectiveWorld?: boolean` to `LevelConfig`
  (`client/src/levels/types.ts`).
- [x] 1.3 Created `client/src/levels/world.test.ts` — six tests: the four
  truth-table fixtures, the widening invariant, and a regression guard over
  every level in `LEVELS` (asserts `detectiveWorld` is falsy on every shipped
  level today, and `inDetectiveWorld(l) === isCaseTrail(l)` for all of them —
  the exact equality that proves this slice is behaviour-neutral).
- [x] 1.4 Audit task — see **Reconciled Enumeration** below. A real
  discrepancy was found in design.md's own prose count; reported, not
  silently followed either direction.
- [x] 1.5 Converted all 26 `LevelPlay.tsx` conversion sites (see enumeration):
  3 groups (4 lines) → `isCase`, the rest (22 lines) → `inWorld`. Deleted the
  `isDetectiveTrail` definition at the old `:633`.
- [x] 1.6 Updated stale prose in `client/src/levels/catalog.ts:162` and
  `client/src/detective/palette.test.ts:260`. **`docs/03:131` deliberately
  NOT touched** — see Deviations below.
- [x] 1.7 Added a `makeWorldOnlyLevel()` fixture (`detectiveWorld: true,
  clue: undefined`) and a world-only assertion in all eight named suites
  (by content, since line numbers shifted as tests were inserted
  top-to-bottom): chrome branch, magnifying glass, icon controls, PISTAS
  rail presence, `clues` prop, `ground`, octopus/lamp, mud ink. Six of the
  eight got a wholly new `it` block; the `clues`-prop and `ground` suites
  already had an existing `it` structured to compare an ordinary level
  against the gated behaviour in one place, so the world-only case was added
  as a third `render()` call inside that SAME `it` rather than duplicating
  the whole test shape — same assertion coverage, fewer new test names.
- [x] 1.8 `npm test` and `npm run build` green — see Work Unit Evidence.

## Files Changed

| File | Action | What Was Done |
|------|--------|----------------|
| `client/src/levels/world.ts` | Created | `isCaseTrail` / `inDetectiveWorld`, pure predicates (26 lines). |
| `client/src/levels/world.test.ts` | Created | 6 tests: truth table, widening invariant, catalog regression guard. |
| `client/src/levels/types.ts` | Modified | Added `detectiveWorld?: boolean` to `LevelConfig`, documented. |
| `client/src/screen/LevelPlay.tsx` | Modified | Deleted `isDetectiveTrail`; added `isCase`/`inWorld` derived from `world.ts`; converted all 26 conversion sites; updated 3 comment blocks that named the old identifier. |
| `client/src/screen/LevelPlay.test.tsx` | Modified | Added `makeWorldOnlyLevel()` helper and 8 new `it` blocks (one per named suite), asserting world-only behaviour without a case trail. |
| `client/src/levels/catalog.ts` | Modified | Comment at old `:162` renamed `isDetectiveTrail` → `inDetectiveWorld`. |
| `client/src/detective/palette.test.ts` | Modified | Comment at old `:260` renamed `isDetectiveTrail` → `inDetectiveWorld(level)` / `isCaseTrail`. |

## Reconciled Enumeration (Task 1.4)

Ran `rg -n "isDetectiveTrail" client/src` and `rg -n "clueDef"
client/src/screen/LevelPlay.tsx` before any edit, then reconciled against
design.md §1's table line by line.

**Result: the design table's line numbers are correct and match the grep
exactly** — 26 raw code lines convert (plus the definition line, deleted),
split 4 lines → `isCaseTrail` (3 behaviour groups: lamp latch `:949,:977`,
`PistasRail` mount `:1162`, `endArt` lamp `:1234`) and 22 lines →
`inDetectiveWorld` (16 behaviour groups). The 6 `clueDef` consumers
(`:635`, `:862`, `:1004`, `:1065`, `:1119`, `:1281`) needed no change, exactly
as the design predicted.

**Discrepancy found, reported per the task's instruction "if your grep and
the table disagree, the table is wrong":** design.md's own PROSE at line 108
says "Three case, seventeen world," and tasks.md 1.4 says "24 renamed sites
(3 → isCaseTrail ... 17 → inDetectiveWorld)." Counting the design table's ROWS
(not raw line numbers) gives 3 `isCaseTrail` rows and **16** `inDetectiveWorld`
rows (19 total), not 17/24. The row list, counted directly from the table:
ground scatter, back control, `<h1>`, hint, rotate prompt, `startArt`, arrow
suppression, carrier rest offset, `carrierArt`, `inkOnly`, `MUD_INK`/`_DIM`,
result block, "Borrar", "Ver de nuevo", "Ver la guía" suppression, "Siguiente"
— 16 rows. The table's own LINE-NUMBER content is internally consistent and
matches the live code exactly; only its own summary prose ("seventeen") and
tasks.md's derived count ("24") undercount/miscount by conflating rows with
raw line numbers. This is a documentation-only discrepancy in design.md/tasks.md,
not a code defect — no site was missed and no site was over-converted. Verified
by `rg -n "isDetectiveTrail" client/src` post-edit returning ONLY the two
historical-prose comment references (`world.ts`'s own doc comment quoting the
old name, and `catalog.ts`) — zero live code references remain.

## Deviations from Design

1. **`docs/03:131` intentionally NOT edited**, though tasks.md 1.6 calls for
   it. The parent orchestrator's launch prompt for this apply pass set an
   explicit scope fence: "Do not touch `docs/`." I made the edit once (a
   one-line prose rename, matching the task), then reverted it via `git
   checkout -- docs/03_SISTEMA_PROGRESION_Y_DESAFIOS.md` on recognizing the
   fence overrides the task instruction for this pass. `docs/03:131` still
   reads `isDetectiveTrail` in prose; this is the one open line item against
   task 1.6, left for a docs-scoped pass (Phase 8 already covers `docs/04`
   and `docs/09` — `docs/03:131` can ride with it, or a dedicated docs slice).
2. Everything else matches design.md exactly — no other deviation.

## Work Unit Evidence

| Evidence | Value |
|---|---|
| Focused test command and exact result | `npm test -- world LevelPlay` → 2 files, 46 tests, all passed |
| Full suite | `npm test` → 59 files, 1085 tests, all passed (baseline 58/1073 + 1 new file `world.test.ts` (6 tests) + 6 new `it`s across `LevelPlay.test.tsx`'s 8 named suites = 12 new tests; 1073+12=1085 ✓, 58+1=59 ✓) |
| Build | `npm run build` (`tsc --noEmit && vite build`) → 0 TypeScript errors (confirms no `noUnusedLocals` orphans from removing `isDetectiveTrail`), build succeeded in 396-408ms across two runs |
| Runtime harness command/scenario and exact result | DOM-dump neutrality proof (below) — real dev-server render, not a synthetic probe |
| Rollback boundary | Revert `client/src/levels/world.ts`, `world.test.ts` (delete, new files); revert `LevelPlay.tsx`, `LevelPlay.test.tsx`, `types.ts`, `catalog.ts`, `palette.test.ts` hunks (all additive/rename-only, no other logic touched). Collapses `isCaseTrail`/`inDetectiveWorld` back to nothing; behaviour-neutral either direction while no level sets `detectiveWorld`. |

## Neutrality Evidence (mandatory for this slice)

Dev server was already running on `http://localhost:5174`. Compared two
URLs — a case trail (`?nivel=duck-trail1`) and an ordinary Fase 2 level
(`?nivel=f2-guirnalda&dev=1`) — before and after the code change, two ways:

1. **PNG screenshots** (`scripts/shot.sh`, 1280×900): `duck-trail1` came back
   **byte-for-byte identical** (`cmp` exit 0) before vs. after. `f2-guirnalda`
   came back with a small byte diff — investigated and found to be **capture
   noise, not a render change**: two consecutive POST-change screenshots of
   the exact same URL, with zero code change between them, already differ by
   bytes (confirmed via `cmp`). This is timing/compositor jitter under
   `--disable-gpu` headless capture (the `&dev=1` overlay likely animates),
   not a regression.
2. **DOM dumps** (`chromium --headless --dump-dom`, deterministic — confirmed
   by two dumps of the same unchanged URL diffing to zero): captured a
   genuine "before" state by `git stash -u`, dumping both URLs, then `git
   stash pop` to restore the change and dumping again. Diffing before vs.
   after: **both URLs are identical except for Vite's HMR cache-busting query
   string on the `<script src="/src/main.tsx?t=...">` tag** — every other
   byte of markup (chrome text, PISTAS rail, ground scatter, ink colours,
   button labels, everything) is unchanged. This is the rigorous proof the
   screenshot noise could not provide on its own.

Conclusion: **S1 is confirmed behaviour-neutral** for both a case trail and
an ordinary level, matching the design's stated invariant that
`inDetectiveWorld ≡ isCaseTrail` while no level sets `detectiveWorld`.

## Status (S1 pass)

8/8 Phase 1 tasks complete (1 partial: 1.6's `docs/03:131` line deferred per
scope fence — see Deviations). Phases 2-8 remain untouched at the end of this
pass. Ready for the next apply batch (Phase 2, S2) or for `sdd-verify` to
review S1 alone if the orchestrator wants it audited before continuing.

---

## Second pass: Phase 2 (S2) and Phase 3 (S3)

Scope fence for this pass: Phases 2 and 3 only. Phase 4 not started; no
Nivel 3 level added to the catalog; no art; no new `LevelConfig` field; `docs/`
untouched.

### Completed Tasks — Phase 2 (S2)

- [x] 2.1 Added `NIVEL3_TRAIL_IDS = ['f2-agua2', 'f2-agua3', 'f2-agua4']` to
  `client/src/game/types.ts`, beside `DUCK_TRAIL_IDS`. Does **not** include
  `'f2-guirnalda'` — verified by a named test (see 2.3).
- [x] 2.2 Created `client/src/game/migrateNivel3.ts`: `NIVEL3_PREDECESSOR_ID
  = 'f2-guirnalda'`, `seedFrom()` copied verbatim from `migrateDuckCase.ts`'s
  policy, `migrateNivel3(records)` guarded on `f2-guirnalda.approvals >=
  APPROVALS_TO_UNLOCK`, returns `{}` if any of the three new ids already has
  a record, never mutates or deletes `f2-guirnalda`'s own entry. Unlike
  `migrateDuckCase`, there is no pseudo-id to seed (Nivel 3 is not a case),
  matching design.md §7 exactly.
- [x] 2.3 Created `client/src/game/migrateNivel3.test.ts` — 8 tests: the
  named guard (`NIVEL3_TRAIL_IDS.length === 3`, excludes both the literal
  `'f2-guirnalda'` and the exported `NIVEL3_PREDECESSOR_ID`); idempotent
  re-run; no write below threshold; no write with no source record; no write
  when a single destination id already has a record; never mutates the
  source; never writes outside the three new ids; and the captured-payload
  scenario (`f2-guirnalda` approved plus an existing `f2-colinas` record)
  proving every new id inherits `approvals === APPROVALS_TO_UNLOCK` and
  `f2-colinas`'s own record is untouched.
- [x] 2.4 Wired `migrateNivel3` into `client/src/game/openProgressStore.ts`'s
  migration array as a third entry.
- [x] 2.5 `npm test` and `npm run build` green — see Work Unit Evidence.

### Completed Tasks — Phase 3 (S3)

- [x] 3.1 Added `GarlandCycle` interface and `garlandVaried(o)` to
  `client/src/levels/paths.ts`, directly beside `garland`. Verified the cubic
  is IDENTICAL to `garland`'s (same 15%/85% control placement, same `move`
  start, same `cy` formula restated in per-cycle terms) by a test asserting
  string equality between a uniform-cycles `garlandVaried` call and
  `garland()`'s own output — not merely visual similarity.
- [x] 3.2 Added `uTurnRadius(width, depth)` to `client/src/levels/paths.ts`.
  **Independently re-derived the closed form before trusting it** (see
  "uTurnRadius derivation, checked" below) — confirms
  `(1.275·w)² / (8·depth)` exactly, matching design.md §2 with no
  correction needed.
- [x] 3.3 Exported `BAND_INSET` from `client/src/levels/buildLevel.ts:38`
  (added the `export` keyword only — no other line in `buildLevel.ts`
  touched, per design's own ruling that checkpoints and the ideal band hold
  unconditionally for non-uniform paths).
- [x] 3.4 Updated `client/src/levels/paths.test.ts`: added `garlandVaried` to
  the shared-contract `GENERATORS` registry (not only a bespoke suite); a
  dedicated `describe('garlandVaried', …)` with the string-equality
  reproduction test, an M/C-only emission test, a per-cycle `t = ½` point
  test (uses the curve's own `t → 1−t` / `x → w−x` symmetry to locate the
  point by X rather than root-finding), and a single-cycle-default sanity
  check; a dedicated `describe('uTurnRadius', …)` reproducing the shipped
  `f2-guirnalda` value (43.9) and asserting the band predicate for every
  garland/hills level (shipped + all four Nivel 3 desafíos) using widths/
  depths derived from each level's own generator call (not the design
  table's rounded literals) plus the design's own `corridorWidth` numbers —
  since the catalog does not carry these levels yet. Also asserts the
  worst-case margin equals 4.5 (desafío 3's `{165, 170}` cycle) to the
  precision the design records.
- [x] 3.5 `npm test` and `npm run build` green — see Work Unit Evidence.

### `uTurnRadius` derivation, checked independently

Re-derived from the generator's own cubic rather than trusting design.md's
closed form on faith, as the launch prompt required.

Setting up one cycle in local coordinates (`yTop = 0`, cycle width `w`,
depth `depth`): `P0 = (0,0)`, `P1 = (0.15w, cy)`, `P2 = (0.85w, cy)`,
`P3 = (w, 0)`, with `cy = 4·depth/3` (from `(4·yBottom − yTop)/3` with
`yTop=0`, `yBottom=depth`).

- `y(t) = 3·cy·t·(1−t)` (both control points share the same `y`), so
  `y(0.5) = 0.75·cy = depth` — confirms the midpoint claim.
- Standard cubic Bézier first derivative at `t=0.5`:
  `B'(0.5) = 0.75·(P1−P0) + 1.5·(P2−P1) + 0.75·(P3−P2)`. Substituting gives
  `x' = 1.275w`, `y' = 0` exactly — matches design.md's stated values.
- Second derivative at `t=0.5`: `B''(0.5) = 3·(P0 + P3 − P1 − P2)`.
  Substituting gives `x'' = 0`, `y'' = −6·cy = −8·depth` exactly — matches
  design.md's stated values.
- Curvature with `y'=0, x''=0`: `κ = |x'·y''| / |x'|³ = 8·depth / (1.275w)²`,
  so the radius of curvature `1/κ = (1.275w)² / (8·depth)` — **exactly**
  design.md's `uTurnRadius` formula. No correction was needed.
- Cross-checked two numeric table entries by hand: `uTurnRadius(180, 150) =
  (229.5)² / 1200 = 43.89…` ≈ 43.9 (matches design's `f2-guirnalda` row
  exactly); of desafío 3's five cycles `{180,180}, {130,95}, {195,200},
  {140,110}, {165,170}`, computing `uTurnRadius` for each gives
  `36.58, 36.15, 38.63, 36.21, 32.54` — the `{165, 170}` cycle is indeed the
  worst, at `32.54`, and `32.54 − (68/2 − 6) = 4.54 ≈ 4.5`, matching
  design.md's stated worst-case margin exactly.

### Deviations from Design

None in Phases 2-3. `migrateNivel3.ts` matches design.md §7 verbatim (module
doc comment restructured slightly for this repo's comment style, no
behavioural difference). `garlandVaried`/`uTurnRadius` match design.md §2's
signatures and formulas exactly; `BAND_INSET` export is the only change to
`buildLevel.ts`.

### Work Unit Evidence

| Evidence | Value |
|---|---|
| Focused test command and exact result (S2) | `npm test -- migrateNivel3` → 1 file, 8 tests, all passed |
| Focused test command and exact result (S3) | `npm test -- paths` → 1 file, 108 tests, all passed |
| Full suite after S2 | `npm test` → 60 files, 1093 tests, all passed (baseline 59/1085 + 8 new `migrateNivel3.test.ts` tests) |
| Full suite after S3 | `npm test` → 60 files, 1103 tests, all passed (1093 + 10 new `paths.test.ts` tests: 4 `garlandVaried` + 2 `uTurnRadius` + the `garlandVaried` shared-contract block's 4 generic checks) |
| Build (both slices) | `npm run build` (`tsc --noEmit && vite build`) → 0 TypeScript errors, build succeeded both times |
| Runtime harness command/scenario and exact result | N/A for both slices — pure store logic (S2) and pure geometry unused by any level until S7 (S3); no new render surface exists yet, as tasks.md itself states for both slices |
| Rollback boundary (S2) | Delete `client/src/game/migrateNivel3.ts` + `.test.ts`; revert the third array entry in `openProgressStore.ts` and the `NIVEL3_TRAIL_IDS` export in `types.ts`. Seeded records (if any ever exist from this code path) are tolerated by the store either way — nothing reads them until S7. |
| Rollback boundary (S3) | Delete the `GarlandCycle`/`garlandVaried`/`uTurnRadius` block in `paths.ts`, the `export` keyword on `BAND_INSET`, and the corresponding `paths.test.ts` additions. Fully additive: unused by any shipped level until S7. |

### Status (this pass)

13/13 assigned tasks complete (2.1-2.5, 3.1-3.5, plus this progress record).
Phases 4-8 remain untouched. Baseline for the next pass: 60 files / 1103
tests, `npm run build` green. Ready for the next apply batch (Phase 4, S4)
or for `sdd-verify` to review S2-S3 if the orchestrator wants them audited
before continuing.

---

## Third pass: Phase 4 (S4), Phase 5 (S5) and Phase 6 (S6)

Scope fence for this pass: Phases 4, 5 and 6 only. Phase 7 not started; no
Nivel 3 level added to the catalog; `docs/` untouched.

### Completed Tasks — Phase 4 (S4)

- [x] 4.1 Added `art?: { href: string; w: number; h: number }` to
  `TraceHazards` (`client/src/canvas/TraceCanvas.tsx`); widened `hazardEls`
  to `Array<SVGCircleElement | SVGGElement | null>` and `setHazardEl`'s
  parameter type to match.
- [x] 4.2 Added the art branch to hazard markup as a **separate, untouched**
  JSX alternative to the existing `<circle>` — the circle branch's own JSX
  was not touched by a single character. The art branch is `<g ref
  transform>` holding a static `<image href={hazards.art.href}
  {...placeArt(hazards.art, 2*r, {x:0,y:0})} preserveAspectRatio="xMidYMid
  meet" opacity={HAZARD_OPACITY} />`.
- [x] 4.3 Branched the rAF loop on `const byTransform = !!hz.art`, read once
  per frame (not once per hazard) — the identical expression the JSX above
  branches on, so the picture and the loop cannot disagree. `transform`
  written for art hazards, `cx`/`cy` mutation kept verbatim for circle
  hazards.
- [x] 4.4 Numeric verification added to `TraceCanvas.test.tsx`: `trail1`'s
  hazard rendered through `renderToString`, asserting `cx`, `cy` (computed
  via the real `obstacleAt`/`buildLevelTarget`/`getLevel('trail1')`) and
  `r="30"` are present, and the markup does NOT match a translated `<g>`
  wrapping a `<circle>` (the load-bearing regex from design §4). A parallel
  art-present case asserts the group's `transform`, the `<image href>`, and
  `width`/`height`/`x`/`y` equal `placeArt(art, 2*radius, {x:0,y:0})`.
- [x] 4.5 `npm test` and `npm run build` green — see Work Unit Evidence.

### `trail1` neutrality proof (mandatory for this slice)

Per the launch prompt's explicit correction from the S1 pass ("screenshot
bytes are NOT a valid neutrality proof on this host"), used ONLY the
deterministic `chromium --headless --dump-dom` method, not screenshots.

1. Dev server already running at `http://localhost:5174` (pre-existing,
   started before this session).
2. Captured `after.html`: `chromium --headless --disable-gpu --no-sandbox
   --virtual-time-budget=5000 --user-data-dir=$(mktemp -d) --dump-dom
   "http://localhost:5174/?nivel=trail1"` against the changed working tree.
3. `git stash -u`, waited for HMR to settle, captured `before.html` against
   the pre-change working tree, then `git stash pop`.
4. **First finding, investigated rather than assumed**: `trail1`'s hazard
   `cx`/`cy` differed between `before.html` and `after.html`
   (`cx="411.34…" cy="315.47…"` vs `cx="432.60…" cy="311.76…"`). This is
   `trail1`'s hazard being a MOVING target — `obstacleAt` is a function of
   wall-clock `performance.now()`, and `--virtual-time-budget` advances real
   rAF frames during the 5s budget, so two captures land at different phases
   of the hazard's sine motion regardless of any code change. **Confirmed as
   capture-time position, not a regression**: captured `after2.html` — a
   THIRD dump of the identical (unchanged, "after") URL — and its `cx`/`cy`
   differ from `after.html`'s too (`cx="395.80…" cy="318.18…"`), proving the
   position varies run-to-run even with zero code change between captures.
5. **The rigorous check**: normalized `before.html`/`after.html` by
   replacing every `cx="…"`/`cy="…"` numeric value with a placeholder and the
   Vite HMR cache-busting `?t=…` query string on `main.tsx` with a
   placeholder, then diffed. **Result: zero differences** (`diff` exit 0).
   Every other byte — the `<circle ... r="30" fill="none" stroke="#1e293b"
   stroke-width="3" opacity="0.9">` element itself, its attribute order, the
   surrounding `<g pointer-events="none">` wrapper, and everything else on
   the page — is byte-identical before and after.
6. Confirmed directly (not just via the normalized diff) that both captures
   show `<g pointer-events="none"><circle cx="…" cy="…" r="30" …>` with NO
   `translate(` wrapper around the circle in either capture — the exact
   thing design §4's regex guards against in the unit test.

**Conclusion**: `trail1`'s hazard is proven numerically unchanged in
structure (tag, attributes, wrapper) and its only varying values (`cx`/`cy`)
vary identically in BOTH the before and the after state, for a reason
(wall-clock animation phase) that has nothing to do with this change. This
satisfies "byte-identical in rendered attributes" the only way it can be
proven on an animated element: by isolating the one axis (position) that is
inherently non-deterministic under this capture method and showing every
other byte is identical.

### Completed Tasks — Phase 5 (S5)

- [x] 5.1 Added two `SINGLES` rows to `scripts/art/build_art.py`:
  `('medusa.png', 'goal-medusa.png', 384, None, True)` and `('estrella de
  mar.png', 'hazard-starfish.png', 320, None, True)`. `fill=None`, no new
  palette tuple, matching design.md §6 exactly.
- [x] 5.2 Ran `python3 scripts/art/build_art.py`. Emitted 46 files total (was
  44), including `client/public/art/goal-medusa.png` (357×384) and
  `client/public/art/hazard-starfish.png` (320×296), plus the regenerated
  `client/public/art/manifest.json`. All to be committed together in this
  slice's commit.
- [x] 5.3 Added `GOAL_MEDUSA_ART` (`w: 357, h: 384`) and
  `HAZARD_STARFISH_ART` (`w: 320, h: 296`) to `client/src/detective/assets.ts`
  — both sizes copied from the freshly emitted `manifest.json`, never
  guessed.
- [x] 5.4 Updated `client/src/detective/artManifest.test.ts`: added the two
  imports, two `REGISTERED` rows, changed the count assertion `44 → 46`, and
  extended the "14 clue + 4 animal + …" comment with "+ 1 goal (medusa) + 1
  hazard (estrella de mar)".
- [x] 5.5 **Performed the mandatory contour-colour check — FAILED, reported
  rather than silently shipped.** See "Contour colour measurement" below for
  the full data. Per the launch prompt's explicit instruction ("If either
  outline is not near-achromatic, say so plainly rather than shipping a
  third coloured line into the drawn world"), I am reporting this plainly
  and have NOT applied the task's suggested fallback (a two-tone recolour),
  because that fallback requires choosing a specific bespoke `fill` RGB
  value per creature — a real art-direction decision with no value given
  anywhere in design.md/tasks.md, which is not mine to invent unilaterally
  as an implementation detail. `fill=None` (5.1) ships as specified; the
  colour defect is real and unresolved, not silently patched.
- [x] 5.6 `npm test` and `npm run build` green — see Work Unit Evidence.
  (Nothing in code asserts contour colour numerically today, so the FAIL
  above does not fail any test — it is a human-reviewed/measured gate, and
  it failed.)

### Contour colour measurement (task 5.5, mandatory before accepting the art)

Per the launch prompt: "measure the two sources' contour colours before you
accept them... verify by reading the emitted PNG files directly, not
through a rendered page." Used `scripts/art/png.py`'s `read_png` directly
(no Pillow/ImageMagick on this host) rather than eyeballing a screenshot.

Method: for each emitted PNG, classified every opaque pixel as "contour" if
(a) its luma is below `build_art.py`'s own `INK_LUMA = 90` threshold AND
(b) it borders a near-transparent neighbour (i.e. it sits on the silhouette
edge, not on an interior shading line) — the strictest reasonable reading of
"the authored contour", to avoid over-counting interior dark shading as if
it were the outline.

| File | Edge-adjacent dark pixels sampled | Dominant contour RGB | Luma | Chroma (max−min) |
|---|---|---|---|---|
| `goal-medusa.png` | 1,019 | `rgb(0, 17, 120)` | 23 | **118/255** |
| `hazard-starfish.png` | 609 | `rgb(0, 20, 122)` | 25 | **122/255** |

For comparison: `ART_OUTLINE` (`#1a1a1a`) is `rgb(26,26,26)`, chroma **0**.
The already-flagged `#19241c` grass failure (`palette.ts`'s own recorded
incident) is `rgb(25,36,28)`, chroma **11** — and that one was bad enough to
need a dedicated `mute()`/`contour_lift` fix in the ground-art pipeline.
Both Nivel 3 sources measure chroma ≈118–122, roughly **10–11× more
saturated** than the incident already on record.

**This is unambiguously FAIL** by task 5.5's own stated criterion ("either
contour is visibly hued/coloured"). Both `medusa.png` and `estrella de
mar.png` are drawn with the SAME deep-navy-blue outline pen (not
coincidence — same artist, same source set), over a bright authored body
(`rgb(250,101,173)` magenta/pink for the medusa, `rgb(252,129,0)` orange for
the starfish, both measured separately and not part of the contour claim
above).

**What this means for the drawn world, said plainly**: shipping these two
files as `fill=None` (design.md §6's chosen approach) puts a THIRD coloured
contour into a world whose whole point (`docs/09` §4, "el color es la
recompensa") is that colour is reserved for earned clues. This is not a
close call or a rounding difference the way the grass's `#19241c` (chroma
11) arguably was — chroma ≈120 is a fully saturated hue, not a near-neutral
dark tone that merely drifted.

**Recommendation, not a unilateral fix**: design.md §6's own stated fallback
is "move that SINGLES row to a two-tone recolour, not a palette token" —
i.e. `recolour(img, fill, keep_ink=True)` instead of `fill=None`, with a
bespoke `fill` RGB chosen for each creature (not one of the existing
POND/KERNEL/PLUME tokens, which are clue-earned colours this is explicitly
not). Applying that requires an actual colour choice — for reference, each
creature's own bright authored fill measured above (`rgb(250,101,173)` /
`rgb(252,129,0)`) could seed that choice, muted per docs/01 principle 1's
"nothing saturated" the way `mute()` already treats ground art, but doing so
is an art-direction call outside this executor's authority to make
unprompted. **Flagging for an explicit decision before this ships past a
draft branch**, not blocking the rest of this apply pass, which proceeds
with `fill=None` exactly as design.md specified.

### Completed Tasks — Phase 6 (S6)

- [x] 6.1 Added `goalArt?: ArtImage` and `hazardArt?: ArtImage` to
  `LevelConfig` (`client/src/levels/types.ts`), importing `ArtImage`
  alongside the pre-existing `ClueKind` import from `../detective/assets`
  (the file already crossed this exact boundary; no new layering violation).
- [x] 6.2 In `client/src/screen/LevelPlay.tsx`: added `GOAL_ART_SIZE = 96`
  beside `LAMP_SIZE`; added a `const endArt = level.goalArt ? {...} :
  isCase ? {...lamp...} : undefined` computed alongside `endMarker`
  (`goalArt` wins over the case lamp, design §5's exact branch), and
  replaced the old inline `endArt={isCase ? … : undefined}` JSX with
  `endArt={endArt}`; wired `level.hazardArt` into the `hazards` `useMemo`'s
  `art` field (with `level.hazardArt` added to its dependency array).
- [x] 6.3 Added three tests to `LevelPlay.test.tsx`'s existing "stands the
  octopus at the start and the lamp at the end" suite: `goalArt` renders as
  `endArt` on a world-only level with no case (size 96, not 84); `goalArt`
  WINS over the case lamp when both are present (href is the goal art's, not
  either lamp state's). The pre-existing "sends the lamp… OFF before the
  trail is finished" test (case trail, no `goalArt`) and "sends neither on
  an ordinary level" test (the `:526`-equivalent, unchanged) both stay green
  unmodified, together covering all four states tasks.md 6.3 asks for.
- [x] 6.4 `npm test` and `npm run build` green — see Work Unit Evidence.

### Proof `goalArt` is orthogonal to the case lamp (verified, not just asserted)

- Read `home/caseState.ts`: `lampOn(records, kase)` is
  `kase.trailIds.every((id) => isFiled(records, id))`, a pure boolean over a
  case's own trail ids with no art in it — confirmed nothing here touches
  it.
- Read `detective/cases.ts`: `DETECTIVE_CASES` lists only
  `DUCK_TRAIL_IDS`/`DETECTIVE_TRAIL_IDS`; no Nivel 3 id is a member, so no
  Nivel 3 id can appear in any `trailIds` array, and `lampOn` cannot be
  moved by a `goalArt` level by construction.
- `trailLampOn` stays gated on `isCase` (`level.clue`-derived), unchanged by
  this slice — a `goalArt`-only level (`detectiveWorld: true, clue:
  undefined`) never latches it, confirmed by the new test asserting
  `endArt.href` is the goal art's href, never a lamp href, on such a level.
- The `endArt` branch itself puts `goalArt` FIRST: a level with both `clue`
  and `goalArt` set gets the goal art, never the lamp — confirmed by the
  "goalArt WINS" test using `makeDetectiveLevel({ goalArt })`.

### Deviations from Design

1. **Task 5.5's contour-colour check FAILED** (measured, not eyeballed) —
   see "Contour colour measurement" above. Shipped `fill=None` exactly as
   design.md §6 specifies (this executor did not invent a recolour), but the
   design's own optimistic open question ("whether the authored contours are
   near-achromatic") resolves to NO, with hard numbers. Flagged for an
   explicit decision, not silently patched.
2. Everything else in Phases 4-6 matches design.md exactly — no other
   deviation. The `TraceHazards.art`/loop-branch shape, the `endArt`
   precedence, and the `GOAL_ART_SIZE`/`LAMP_SIZE` split all match design §4
   and §5 verbatim.

### Work Unit Evidence

| Evidence | Value |
|---|---|
| Focused test command and exact result (S4) | `npm test -- TraceCanvas` → 1 file, 87 tests, all passed |
| Focused test command and exact result (S5) | `npm test -- artManifest` → 1 file, 50 tests, all passed |
| Focused test command and exact result (S6) | `npm test -- LevelPlay` → 1 file, 42 tests, all passed |
| Full suite after S4 | `npm test` → 60 files, 1105 tests, all passed (1103 + 2 new `TraceCanvas.test.tsx` tests) |
| Full suite after S5 | `npm test` → 60 files, 1107 tests, all passed (+2 new `artManifest.test.ts` rows exercised via the existing `it.each`) |
| Full suite after S6 | `npm test` → 60 files, 1109 tests, all passed (+2 new `LevelPlay.test.tsx` tests) |
| Build (all three slices) | `npm run build` (`tsc --noEmit && vite build`) → 0 TypeScript errors, build succeeded each time |
| Runtime harness command/scenario and exact result (S4) | `chromium --headless --dump-dom` DOM-diff of `?nivel=trail1` before/after via `git stash` — see "trail1 neutrality proof" above; zero structural differences after normalizing the two inherently time-varying `cx`/`cy` values |
| Runtime harness command/scenario and exact result (S5) | Direct PNG pixel measurement via `scripts/art/png.py` (`read_png`) — see "Contour colour measurement" above; FAILED, reported |
| Runtime harness command/scenario and exact result (S6) | N/A — no level sets `goalArt`/`hazardArt` yet (S7's scope); orthogonality proof done by reading `caseState.ts`/`cases.ts` directly, not by rendering |
| Rollback boundary (S4) | Delete the `art` branch in the hazard markup and the `byTransform` branch in the rAF loop; narrow `hazardEls`'/`setHazardEl`'s types back to `SVGCircleElement \| null`; remove `art?` from `TraceHazards`. The circle branch is untouched either way. |
| Rollback boundary (S5) | Delete the two `SINGLES` rows, delete `client/public/art/goal-medusa.png`/`hazard-starfish.png`, revert `manifest.json` to 44 entries, delete the two `assets.ts` constants and the two `artManifest.test.ts` rows/count. |
| Rollback boundary (S6) | Delete `goalArt?`/`hazardArt?` from `LevelConfig`; revert `endArt` to its old inline `isCase ? … : undefined` form; remove `level.hazardArt` from the `hazards` memo. No shipped level sets either field yet. |

### Status (this pass)

13/13 assigned tasks complete (4.1-4.5, 5.1-5.6, 6.1-6.4), with task 5.5
explicitly FAILED and reported rather than silently passed — see Deviations.
Phases 7-8 remain untouched. Baseline for the next pass: 60 files / 1109
tests, `npm run build` green. **Before Phase 7 authors any level that sets
`hazardArt: HAZARD_STARFISH_ART` or ships `goal-medusa.png`/
`hazard-starfish.png` to a real child, the contour-colour finding above
needs an explicit decision** (accept the authored navy contour as a fifth
`docs/09` §4 exception, or approve a specific two-tone recolour fill per
creature). Ready for the next apply batch (Phase 7, S7) once that decision
is made, or for `sdd-verify` to review S4-S6 first.

## Orchestrator resolution of the S5 contour defect (2026-09-12)

S5 reported task 5.5 as FAILED and, correctly, refused to invent a colour to fix
it. `medusa.png` and `estrella de mar.png` shipped a contour of `rgb(0,17,120)`
and `rgb(0,20,122)` — chroma 119 and 122 — because the pipeline's `fill=None`
path skips `recolour` entirely and nothing forced their outline anywhere.

**Measured across the shipped art before deciding.** Contour chroma: the four
deduction animals 0-2, the clue marks and the lamp 0 (`ART_OUTLINE`), the
octopus 63, the medusa and starfish 119 and 122. So the drawn world does have
one contour colour and it is achromatic; these two were the outliers by a factor
of two over the worst existing case and ten over the recorded grass incident.

**Fix: a third pipeline mode, `recontour`.** It sends only contour pixels to
`INK` and leaves every fill exactly as authored. The two existing modes could not
express what drawn-world creature art needs: `recolour` flattens a drawing to one
fill, which is right for a clue mark and destroys a jellyfish, and `fill=None`
skips everything, which is right for the deduction animals — they stand alone on
the lineup, never beside a clue mark — and wrong for anything standing ON the
sheet. No colour was invented: `ART_OUTLINE` already existed.

Both files now measure `#1a1a1a` across 95% of their contour, with the remaining
3-4% the resample's fringe where the outline meets a saturated fill. The animals
measure 7% on the same metric, so the profile is normal.

**Guarded, not just fixed.** `artHierarchy.test.ts` gained a test globbing
`goal-*`/`hazard-*` — by prefix, so a prop added later is covered without anyone
remembering — asserting at most 25% of a prop's contour carries colour. The
threshold is anchored on measurements with a wide gap on both sides: 3/4/7% for
conforming art against 92% for the defect. **Proved falsifiable**: reverting the
pipeline row to `fill=None`, rebuilding and re-running gave
`92% of goal-medusa.png's contour carries colour`, then restoring returned it to
green.

**Recorded, not fixed:** `carrier-octopus.png` measures 97% of its contour
carrying colour — the same defect, and the worst of all of them. It is left alone
because `docs/09` §2 makes that navy line part of the character's own look, so
changing it is an art-direction decision and not a pipeline one. It is outside
the `goal-*`/`hazard-*` glob, so the new test does not silently exempt it by
name; it simply is not a prop.
