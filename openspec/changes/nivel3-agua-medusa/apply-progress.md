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
