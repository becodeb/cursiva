```yaml
schema: gentle-ai.verify-result/v1
evidence_revision: sha256:b116b0b0780cf589eb2ef5d1dd9d2e6ab320117c57f0529207f7922d54a839eb
verdict: pass_with_warnings
blockers: 0
critical_findings: 0
requirements: 19/19
scenarios: 52/52
test_command: npm test
test_exit_code: 0
test_output_hash: sha256:c9e561d5718cdd3fcc94d3d943645f584112182d516f4019e4797ac8fb112cc3
build_command: npm run build
build_exit_code: 0
build_output_hash: sha256:556cd12fe50353870d10fa5182b61b5bcdcd79aeb43a911bacd2ca8112de93fc
```

## Verification Report

**Change**: `bee-free-trail-and-waypoints`
**Version**: N/A (no spec version field in this project)
**Mode**: Standard (no Strict TDD marker found in status/config; project's own tasks.md shows RED-before-GREEN discipline used voluntarily on the two named repairs)

### Completeness

| Metric | Value |
|--------|-------|
| Tasks total | 63 |
| Tasks complete (`[x]`) | 55 |
| Tasks incomplete (`[ ]`) | 8 (Phase 8: 8.1–8.7; Phase 9: 9.6) |

**Task-tracking finding, not a work gap.** All 8 open checkboxes concern Phase 8 (screenshot capture + human read-back) and the 9.6 closing confirmation that depends on it. Independent verification in this pass confirms the underlying work is done and exceeds what tasks.md records:

- All 12 required captures exist in `capturas/pasoF/` (`bee1..4-control.png`, `bee1..4-estela.png`, `bee4-estela-0.png`, `bee-intro.png`, `zoo-before.png`, `zoo-after.png`), matching task 8.2–8.5's exact list.
- The read-back (8.6) happened and produced three real findings, committed in `8926317` to `docs/13_AVENTURAS_POR_ANIMAL.md` decision 8.
- One of those findings (the dead `debugCarrier`) was corrected with a regression test per 8.7's own requirement, in `c5ea4ae`, confirmed RED on the pre-fix tree per the commit message and re-verified in this pass (see Q1 below).
- File-timestamp analysis (`capturas/pasoF/*.png` mtimes vs. commit timestamps) shows the `estela` captures were taken at 01:29:44–01:29:50 BST, essentially concurrent with the `c5ea4ae` fix commit (01:29:50) and well after the `control` captures (01:27:49–01:28:02) — consistent with a genuine re-capture after the fix, not a stale pre-fix screenshot being left in place.

`tasks.md` itself was last edited by `5f493bf` (01:25:11), which predates both the `debugCarrier` fix (`c5ea4ae`, 01:29:50) and the docs finding (`8926317`, 01:31:09). **`tasks.md`'s checkboxes for 8.1–8.7 and 9.6 were never updated after the work that closes them landed.** This is a documentation-sync gap, not an incomplete-work gap — see WARNING W1.

### Build & Tests Execution

**Build**: PASSED
```text
$ npm run build
tsc --noEmit && vite build
✓ 524 modules transformed.
✓ built in 510ms
(exit 0)
```

**Tests**: 1656 passed / 0 failed / 0 skipped
```text
$ npm test
Test Files  74 passed (74)
     Tests  1656 passed (1656)
(exit 0)
```

Baseline on `main` was 72 files / 1555 tests (proposal's own stated baseline); this change adds 2 files (`levels/waypoints.test.ts`, `canvas/WaypointLayer.test.tsx`) and 101 tests net (1656 − 1555). No flake observed on this run; `artHierarchy.test.ts`'s documented parallel-load flakiness (Engram #1384) did not manifest.

**Coverage**: Not applicable — this project has no coverage threshold configured.

### The three hardest questions, answered with evidence

**Q1 — Is the coincidence proof genuinely sensitive?** Yes, proven by direct fault injection in this verification pass, not merely by reading the test's existence.

I temporarily changed `client/src/levels/waypoints.ts`'s `waypointArt` to render every stop 5 viewBox units off its authored `x` (a synthetic "art renders at one coordinate, scorer measures another" defect — exactly paso E's failure mode). Re-running `npx vitest run client/src/canvas/WaypointLayer.test.tsx` on the mutated tree produced **6 failing tests out of 17**, across both the fixture-stage and real-catalog-stage coincidence proofs, for all four levels (`bee1..4`), in both the dormant and lit assertions:

```
FAIL bee1: every rendered <image> centre equals the authored coordinate, in both states
AssertionError: bee1 stop 0: expected 505 to be close to 500, received difference is 5
FAIL bee2/bee3/bee4: same assertion, same shape of failure
```

The file was restored immediately afterward and re-run green (17/17). This confirms the spec's own falsifiability scenario ("An artificially shifted authored coordinate fails the assertion") holds in practice, not just on paper, and that both stage-1 (fixture) and stage-2 (real catalog, `WaypointLayer.test.tsx`'s `it.each(BEE_IDS)` block, task 6.4) genuinely exercise the render → parse → score round trip rather than comparing a value against itself.

The `debugCarrier` finding independently corroborates the same lesson from the opposite direction: `debugCarrier` was written and unit-tested (`waypoints.test.ts`'s "one k drives all three" suite) but never called from `LevelPlay.tsx` until `c5ea4ae`. I confirmed the fix is real and wired: `LevelPlay.tsx:1502-1505` now computes `waypointDebugCarrier` via `debugCarrier(level.waypoints, waypointDebugK)`, and it feeds the `carrier` prop at `:1662-1663` (`waypointDebugCarrier ?? …`) — the actual prop reaching `TraceCanvas`. `c5ea4ae`'s four new tests in `LevelPlay.test.tsx` assert `traceCanvasProbe.current?.carrier` (the mock-captured SCREEN prop), not the helper function directly, so they are sensitive to exactly the class of defect that shipped: the commit message's claimed pre-fix RED state (bee at `{95,175}`, trail ending at `{320,440}` — `bee4`'s authored `start` and its second stop, respectively) is internally consistent with `bee4`'s catalog literals, which I independently confirmed in `catalog.ts:1284-1310`.

**Q2 — Is `kind: 'free'` without `waypoints` still bit-identical (except the A1 repair, an intended change)?**

- `git diff main...HEAD --stat` over the nine files the design names byte-identical (`useTraceInput.ts`, `revealGrid.ts`, `coverage.ts`, `arrange.ts`, `artCorridor.ts`, `corridorTrack.ts`, `cases.ts`, `Deduction.tsx`, and the four `migrate*.ts` files) returns empty in this tree — re-confirmed in this pass, matching the apply-progress record.
- `evaluateLevel.ts`'s `free` branch: `evaluateLevel.test.ts:287` explicitly asserts "any pre-existing `kind:'free'` level scores identically, byte for byte, before and after this change," routed through the unchanged `revealScore` call.
- `buildLevel.test.ts:404` asserts every shipped level's `target.start` is byte-identical to the old `target.polyline[0]` **except the bee family**, which legitimately now authors its own (`target.start === level.waypoints.start`) — the correct, disclosed exception, not an unnoticed regression (task 6.6 names this explicitly as "the CORRECT first exercise of the repair").
- **The A1 repair's own numbers, independently recomputed in this pass** (not just read off the design doc): `luma(GLASS_GRIME '#64726b') = 109.02`, `luma(INK_COLOR '#1e293b') = 39.76`, `Δ = 69.25` — I computed this directly with a small Node script using the same luma formula the test file mirrors, matching the design's claimed 69.2 to the first decimal. Likewise `luma(SAND_DRIFT '#7a6a58') = 108.73`, `Δ(SAND_DRIFT, INK) = 68.97`, matching the claimed 68.9. Both now clear the `backdrops.test.ts` `MIN_BACKDROP_CONTRAST = 55` floor, versus the pre-fix reality of `OFF_PATH_INK` against the same tiles: `backdrops.test.ts:152-158`'s own falsifiability rows assert those specific deltas (`OFF_PATH_INK` vs. `GLASS_GRIME`, short by 3.1; vs. `SAND_DRIFT`, short by 2.8) go RED, which they do (`<` 55 is asserted, and passes as a falsifiability proof).
- **The general ink-law test genuinely changed meaning, not just genuinely changed nothing.** `backdrops.test.ts:108-110` still reads `luma(b.tile!) - luma(b.ink ?? INK_COLOR)` — the DECLARED ink, unedited literally — but post-A1 this is no longer a claim about a colour nobody renders: since `offPath` can no longer latch `true` on a routeless level, `glass1..4`/`sand1..4` never reach `inkDimColor` at all, so "declared ink" and "rendered ink" are now the same value for the first time. Pre-fix, the assertion was checking a value the screen never painted (a false-positive-shaped test); post-fix it checks reality. This is exactly the claim in the prompt, and I confirm it by arithmetic rather than by trusting the design doc's prose.
- `isOffPath(routeCount, distance, corridorWidth): boolean { return routeCount > 0 && distance > corridorWidth / 2 }` at `LevelPlay.tsx:695-697` matches the design's A1 diff verbatim, and `LevelPlay.tsx:1164` calls it at the exact site (`:1058` in the design's pre-repair line numbering, shifted by intervening edits) the design names.

**Q3 — Are there any other green tests on unreachable code?** I swept every export of `client/src/levels/waypoints.ts` and the debug parser in `devMode.ts` against the shipped (non-test) source tree:

| Export | Real (non-test) caller |
|---|---|
| `trailPasses` | Internal to `waypointTick`/`waypointScore` in the same file — both of which are themselves called from shipped code (below) |
| `waypointTick` | `LevelPlay.tsx:1113` |
| `waypointScore` | `game/evaluateLevel.ts:126` |
| `waypointArt` | `LevelPlay.tsx:1475` |
| `waypointRings` | `LevelPlay.tsx:1476` |
| `debugWaypoints` | Internal to `seedWaypoints`, which is called from `LevelPlay.tsx:308` |
| `debugTrail` | `LevelPlay.tsx:1489` |
| `debugCarrier` | `LevelPlay.tsx:1504` (the exact gap this verify was asked to re-check — now closed) |
| `seedWaypoints` | `LevelPlay.tsx:308` |
| `EMPTY_WAYPOINTS` | `LevelPlay.tsx:1063-1064` |
| `levelStart` (`buildLevel.ts`) | `buildLevel.ts:197,259` (both branches of `buildLevelTarget`) |
| `waypointDebugCount` (`devMode.ts`) | `LevelPlay.tsx:308,906,1471` |

Every export has at least one caller outside its own test file. No second instance of the `debugCarrier` pattern was found.

### Spec Compliance Matrix

**`free-trail-waypoints` (8 requirements, 22 scenarios)**

| Requirement | Scenario | Test | Result |
|---|---|---|---|
| WaypointConfig Shape and the Pure Fold Module | Every export runs with no DOM | `waypoints.test.ts:45-52` | COMPLIANT |
| " | waypointTick same reference when nothing changes | `waypoints.test.ts:93-97` | COMPLIANT |
| The Waypoint Latch Is Monotone and Visit-Order-Free | Lit flower stays lit | `waypoints.test.ts:109-118` | COMPLIANT |
| " | Restart clears every latch | `LevelPlay.tsx:1063-1064` + `waypointTick`'s own contract; `waypoints.test.ts` proves the pure half | COMPLIANT |
| " | Reverse-order touch all light | `waypoints.test.ts:120-126` | COMPLIANT |
| " | Point outside every radius lights nothing | `waypoints.test.ts:128-131` | COMPLIANT |
| waypointScore Recomputes Purely... | Recompute reproduces live fold | `waypoints.test.ts:213-224` | COMPLIANT |
| " | All reached scores complete | `waypoints.test.ts:171-183` (100 case) | COMPLIANT |
| " | One flower missed lowers score, no separate failure | `waypoints.test.ts:144-170` (0/25/50/75 cases) | COMPLIANT |
| Rendered Flower/Hive Coincide, Both States | Dormant centre == authored coord | `WaypointLayer.test.tsx:68-84`, `:205-221` (stage 2) | COMPLIANT |
| " | Lit centre == same coord | `WaypointLayer.test.tsx:86-98`, `:223-237` | COMPLIANT |
| " | Hive centre == authored coord | `WaypointLayer.test.tsx:80-83`, `:219-221` | COMPLIANT |
| " | Shifted coordinate fails | `WaypointLayer.test.tsx:130-145`, `:240-259` — **independently re-proven by fault injection in this pass (Q1)** | COMPLIANT |
| Dormant State Achromatic + Separated | Chroma ≤ 12 | `backdrops.test.ts:329-331` (W3) | COMPLIANT |
| " | ≥55 luma gap | `backdrops.test.ts:316-319` (W1) | COMPLIANT |
| " | Low-luma grey fails | `backdrops.test.ts:337-339` (F1) | COMPLIANT |
| Two-State Swap Not a Ground Comparison | Decorative set empty | `artHierarchy.test.ts` (design §3.3's replacement — absolute measurement, not hierarchy loop); confirmed no `flowerDormant` entry in the hierarchy comparison loop | COMPLIANT |
| " | artHierarchy does not false-fail | `artHierarchy.test.ts:739` (`bodyContrast(art, FOREST_QUIET) >= 55`, absolute, not comparative) | COMPLIANT |
| Screenshot Seeding Flags | Position-pin replaces pointer input | `LevelPlay.test.tsx` (`waypointPin` guard) + `devMode.test.ts` | COMPLIANT |
| " | Lit-seed lights exactly first k | `waypoints.test.ts:253-274` | COMPLIANT |
| " | Both parsers pure/DOM-free | `devMode.test.ts` ("needs no window") | COMPLIANT |
| No Fragment Reference | No forbidden reference | `WaypointLayer.test.tsx:158-167`; repo-wide sweep (this pass): zero functional `url(#` occurrences | COMPLIANT |

**`level-engine` (5 requirements, 15 scenarios)** — all COMPLIANT: `evaluateLevel.test.ts:287,313,321` (fallback + bee routing); `catalog.test.ts` bee-family block R1/R3 + `kind==='free'` assertion (kind-stays-free scenario); `LevelPlay.test.tsx:361-419` (carrier regression, own art, existing levels unaffected via `evaluateLevel.test.ts:287`); `catalog.ts` bee1..4 R1/R2/R3/R5; `catalog.test.ts`'s exemption/haptics/EXPECTED_IDS edits (confirmed present at the cited line ranges) + `WaypointLayer.test.tsx` stage 2 for the docs-checklist scenario (start/radius/minAccuracy/haptics/demo all read off real configs).

**`trace-canvas` (2 requirements, 5 scenarios)** — all COMPLIANT: `TraceCanvas.test.tsx:1285-1352` (waypoint layer image count, no-prop-no-layer, byte-identical for lagoon/ground/plain-maze); the forest-backdrop requirement is satisfied by reused, unedited generic coverage (`TraceCanvas.test.tsx:764-765`'s existing "no wall rect for a channel-less backdrop" assertion plus `:821`'s lagoon byte-identical case) — consistent with the design's own claim that no new test was needed for this requirement, verified rather than assumed.

**`zoo-map` (4 requirements, 10 scenarios)** — all COMPLIANT: `sectors.test.ts:247-262` (bosque unlock + bee appearance); `adventures.test.ts:73-78` (animal/no closingBeat), `:207` (mapBubble closing phrase); `backdrops.ts` bee row + `backdrops.test.ts` W1-W3/F1-F4 (registry entry, no channel/corridorArt); `backpack.test.ts:16-66` (fifth entry, earned/not-earned).

**Compliance summary**: 52/52 scenarios compliant.

### Correctness (Static Evidence)

| Requirement | Status | Notes |
|---|---|---|
| Additive `waypoints?`/`carrierArt?` fields, `LevelKind` unchanged | Implemented | `types.ts`; `catalog.test.ts`'s "kind stays free" scenario |
| Every authored waypoint coordinate inside `y ∈ [100, 499]` | Implemented | `catalog.test.ts` C1 (`:1657-1673`) checks the rendered ART BOX, not the bare point; manually cross-checked all 4×(stops+goal) `y` literals in `catalog.ts:1195-1310` against the band — all inside |
| No `url(#)` anywhere the change renders | Implemented | Repo-wide `rg 'url\('` sweep in this pass: every hit is a comment/doc-string or a `not.toContain` test assertion |
| `FLOWER_DORMANT` achromatic, ≥55 from forest, constraint not literal | Implemented | `backdrops.test.ts` W1/W3 read `FLOWER_DORMANT`/`bee.brightest` directly, not a hardcoded 151.2 literal; confirmed **not** added to `palette.test.ts`'s general ground loop (`rg` found zero `FLOWER_DORMANT` occurrences there) |
| Bee ladder: `bee1` carries exactly one flower, waypoint count non-decreasing, radius strictly decreasing | Implemented | `catalog.test.ts` R1 (110→84→62→38), R3 (1,3,3,3) |
| `docs/13` §6's nine obligations | Implemented | Design §6.3 table cross-checked against shipped `LevelConfig`s and code; all nine answered, none silently dropped |
| Manifest literals match `manifest.json` | Implemented | `artManifest.test.ts:341-355` asserts forest `corridorRows {191,926}`, `quiet`/`brightest` `'#949b8c'`, and `flowerDormant`/`flower` dimension parity |

### Coherence (Design)

| Decision | Followed? | Notes |
|---|---|---|
| A1 (offPath repair, isolated commit) | Yes | `e25e8f8` is its own commit; repairs 12 shipped levels; numbers re-verified in Q2 |
| A2 (no `demo` on free levels; discharged via §6.3) | Yes | `catalog.test.ts` R5 asserts `demo` absent on all four; `bee1` alone was proposed for `demo:true` in the proposal but the design's A2 correction (adopted) removed it — `R5` correctly asserts absence, not presence, matching the ratified amendment over the superseded proposal text |
| A3 (no octopus on a bee level) | Yes | `carrierArt`/`carrier` prop path has no `startArt`/octopus wiring for waypoint levels; `showGuide:false` on all four (`catalog.test.ts`) |
| A4 (one debug flag, not two) | Yes | `devMode.ts` exposes only `waypointDebugCount`; `debugWaypoints`/`debugTrail`/`debugCarrier` all take the same `k` |
| §2.2 carrier repair as a general causal-class fix | Yes | `levelStart`/`LevelTarget.start` is generic, not bee-specific; `buildLevel.test.ts` proves it |
| §3.3 hierarchy rule vacuous, replaced by absolute measurement | Yes | `artHierarchy.test.ts:739` |
| §4.3 span-guard tension, both halves enforced | Yes | `catalog.test.ts` C4 (bee3/bee4) and C5 (bee1/bee2 strictly smaller) both present and green |
| §11 decision 8, written honestly in Spanish | Yes | `docs/13_AVENTURAS_POR_ANIMAL.md` decision 8, four bullets matching design.md §11 plus three additional capture-only findings, all disclosed rather than hidden |

### Issues Found

**CRITICAL**: None.

**WARNING**:
1. **`tasks.md` tracking is stale.** Phase 8's seven items (8.1–8.7) and 9.6 remain `[ ]` even though the underlying work — 12 captures present in `capturas/pasoF/`, a genuine read-back that produced three documented findings, and one code defect (dead `debugCarrier`) found and fixed with a regression test per 8.7's own requirement — is independently verifiable as complete in commits `c5ea4ae` and `8926317`, both after `tasks.md`'s last edit (`5f493bf`). Recommend a final `tasks.md` sync commit (checking 8.1–8.7 and 9.6, with a note on the two still-open art-direction items below) before archive.
2. **Two capture-only findings remain open and unresolved, correctly disclosed rather than hidden**, per `docs/13` decision 8: (a) the decorative white flowers painted inside `fondo bosque.png` itself separate 93.8 luma from the band — more than the actual target flower's dormant state (58.8) — so a child may find the decoration more visually prominent than the thing they need to find; no code fix exists because both achromatic branches (≥245 or ≤57.4) are shown to fail either legibility or the ink-contrast law. (b) The 76-unit bee occludes ~98.7% of the 64-unit flower she lands on, the same class of occlusion `docs/09` §2 solved once by separating the octopus from the lens — unresolved here because the character and the cursor are the same object by design. Both are named as art-direction decisions for the author, consistent with the project's established precedent (paso D's fog/sand colour, paso E's snake ink) of leaving a cornered art choice open rather than quietly picking it. Neither is a spec violation — the "Two-State Swap Is the Reward, Not a Ground-Mark Comparison" requirement's own scenarios (decorative set empty, no false hierarchy failure) are satisfied because the decoration is baked into the backdrop art rather than being a separately registered decorative mark — but both are real, disclosed, unresolved risks to the pedagogy this family exists to teach.

**SUGGESTION**:
1. `FLOWER_DORMANT`'s `#d2d2d2` literal and the forest's `flor` backpack item both remain explicitly provisional per the proposal's own "What is explicitly NOT closed" section — expected and already tracked, not a new finding, but worth confirming with the author in the same pass as the two WARNING items above rather than as a separate round.

### Verdict

**PASS WITH WARNINGS**

All 19 requirements and 52 scenarios across the four spec deltas trace to real, independently-verified test evidence — including a fault-injection re-proof of the coincidence test's sensitivity and a from-scratch numeric recomputation of the A1 repair's luma deltas, both performed in this verification pass rather than taken on the design document's word. The full suite (74 files / 1656 tests) and build are green, every new exported function has a real caller in shipped code (the one prior gap, `debugCarrier`, is now closed and independently confirmed wired), and no `url(#)` reference exists outside comments and test assertions. The verdict is PASS WITH WARNINGS rather than a clean PASS because `tasks.md`'s checkboxes have not been synced to reflect completed work, and because two genuine, honestly-disclosed art-direction risks from the capture read-back remain open for the author — neither blocks a technically correct, spec-compliant implementation, but both should be resolved or explicitly accepted before this change is presented as finished to a human reviewer.
