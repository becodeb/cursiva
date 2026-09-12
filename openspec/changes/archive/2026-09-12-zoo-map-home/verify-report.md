# Verify Report: zoo-map-home

**Mode**: Full artifact set (proposal, design, specs × 5, tasks). Store: openspec.
**Verdict**: **PASS WITH WARNINGS**

## Test / Build Evidence

| Command | Result |
|---|---|
| `npm test` (`vitest run`, from `client/`) | **60 files / 1156 tests, all passed** (25.5s) |
| `npm run build` (`tsc --noEmit && vite build`) | 0 TypeScript errors, build succeeded in ~500ms |
| Focused: `cases.test.ts clues.test.ts PistasRail.test.tsx Deduction.test.tsx` | 4 files / 103 tests, green — deduction mode intact |
| Focused: `artManifest.test.ts artHierarchy.test.ts` | 2 files / 82 tests, green — `HOME_OCTOPUS_ART`/`HOME_DESK_ART` parity guards intact |
| `git diff main -- client/src/levels/catalog.ts` | **empty** — zero bytes changed |

The counts the launch prompt cited (60/1156) match exactly what this run measured. `apply-progress.md`'s own final tally (60/1154) is **stale**: it was written *before* three later commits (`14cfe1e`, `1ed1318`, `ae1bb7e`) that added 2 net tests while fixing screenshot-discovered defects. Not a functional problem, but the artifact under-reports the true final state.

## Item-by-Item Findings

1. **Every `specs/zoo-map/spec.md` requirement checked against code + test.** 14 of 15 requirements are fully implemented and covered by a real, falsifiable test. One requirement scenario has **no covering test at all** — see Finding C1 below. No vacuous assertions found: the geometry/fog tests iterate real non-empty sets (`withHit` = 6 sectors, `fogged` = 5 sectors), and both include an explicit falsifiability test (shrink a patch → `coversRect` goes `false`; hand-built bare word → `auditCaptions` goes non-empty).

2. **Estanque's eight adventures.** `sectors.ts:273-282` — `duck-trail1, duck-trail2, duck-trail3, duck-trail4, f2-guirnalda, f2-agua2, f2-agua3, f2-agua4`, in that exact order. Proven by `sectors.test.ts:179-190`. `git diff main -- client/src/levels/catalog.ts` is byte-empty — confirmed, no level id/path/clue changed.

3. **Deduction is paused, not deleted.** `detective/cases.ts`, `detective/clues.ts`, `detective/PistasRail.tsx`, `screen/Deduction.tsx` all still exist, byte-unchanged (`git diff main` shows zero diff on these four paths), and their 103 tests are green. `GameScreen.tsx:162-168` `resolveNextAction` now returns `{type:'exit'}` for any sector-owned level and never `{type:'deduce',...}`. `initialView` (`GameScreen.tsx:92-106`) still resolves `?nivel=deduccion` and `?nivel=deduccion-<caseId>`, tested in `App.test.tsx:47-56` and `GameScreen.test.tsx`.

4. **`client/src/home/` and `HomeScreen` are gone.** Confirmed via `ls` (no such file/directory) and `rg` (zero import statements anywhere in `client/src`, only historical comments in `ZooMap.tsx`/`ZooMap.test.tsx`). `HOME_OCTOPUS_ART`/`HOME_DESK_ART` are still exported from `detective/assets.ts:306,317`; `artManifest.test.ts`/`artHierarchy.test.ts` (82 tests) stay green.

5. **The two geometry invariants hold and are not vacuous.** `sectors.test.ts`: "the union of fog rects contains the whole hit, for every closed sector" (loops over 5 real closed sectors, `coversRect` exact via coordinate compression) and "no two hits overlap"/"no hit overlaps the plaza" (loops over all 6-with-hit pairs). Both carry an explicit falsifiability twin (shrink one patch → breaks; the `FOG_BBOX_SLACK`/patch-count tests pin the actual construction, not just its outcome).

6. **No `url(#…)`, no `<defs>/<mask>/<clipPath>/<pattern>/<filter>` in any new code.** `git diff main -- client/src` — every occurrence of these strings in the diff is either a `-` (deleted `HomeScreen`/old comment) or a `+` inside a comment/test assertion proving their *absence*. Zero live usage introduced. `ZooMap.tsx` renders every visual with `<image href=...>` only.

7. **`auditCaptions` passes on the app's first screen, and the assertion is genuinely falsifiable.** `App.test.tsx:28-45`: one test asserts `renderToString(<App/>)` → `uncaptioned === []`, and the very next test hands `auditCaptions` a hand-built `<div class="cv-zoo-hud-right">12</div>` bare word and asserts `uncaptioned` is non-empty — this is a real, working falsifiability proof, not a tautology (confirmed the assertion actually depends on `auditCaptions`'s real logic, not a hardcoded return).

8. **Stars derive purely from persisted records, no new key.** `zoo/stars.ts`: `starsFor = min(approvals, APPROVALS_TO_UNLOCK)`; `totalStars` filters through `REAL_LEVEL_IDS` (built from `LEVELS`), excluding `<caseId>-deduce` pseudo-records. Tested in `stars.test.ts` (7 tests) including the exact "ignores duck-deduce" scenario the spec names. No new `localStorage` key introduced (verified: `zoo/*.ts` never imports any storage module directly, only receives `Records` as a plain read).

9. **`tasks.md` completeness — see Finding C2.** Phases 1-4 (16/16 tasks) are honestly checked off and each checked task's claim matches the code (verified 1.1-4.4 individually above). **Phases 5 and 6 (8 tasks) remain unchecked `[ ]`**, despite their substance having demonstrably happened: `capturas/mapa.png`, `mapa-debug-sectores.png`, `mapa-tablet-vertical.png` exist and were reviewed (this report reviewed them); commits `14cfe1e`/`1ed1318` are literally task 5.5's "read the capture, correct the registry, re-run tests, re-capture" loop, executed twice; and this report itself constitutes task 6.1's full-suite gate. The tracking artifact was never updated to reflect completed work.

10. **Divergences from `design.md`.** The fog construction's two revisions (quadrant→grid→grid+junction, `FOG_OVERLAP` 1.06→1.30, `FOG_BBOX_SLACK` 1.25→1.35) are thoroughly documented in `design.md` (a first pass at lines ~326-430, a second at lines ~920-948, plus both fix commits' own detailed messages) and in `sectors.test.ts`'s inline comments. The one gap: **`scripts/shot.sh`'s destination change to `capturas/` at the repo root (commit `ae1bb7e`) is recorded in the commit message and the script's own header comment, but nowhere in `design.md`** — see Finding W1.

## Known, Already-Accepted Items — Confirmed Recorded, Not Re-Raised

- Star rule `min(approvals, 2)` conflating advance/reward: recorded in `proposal.md` OD1, `design.md` §2 "OD1", and `zoo/stars.ts`'s own header comment. ✓
- Nocturna's residual fog-corner sliver: recorded verbatim in `design.md` line 944 ("Residual, and deliberately not chased..."). Visually confirmed present but minor in `capturas/mapa.png`. ✓
- Portrait-tablet 5:3 letterbox into a large `#76B56A` field: visually confirmed in `capturas/mapa-tablet-vertical.png` — a large green area below the map on a 768×1024 capture. This is an open question for the user per the launch prompt, not re-raised as a defect. ✓
- `openspec/specs/detective-mode/spec.md:195`'s stray `# Delta for Detective Mode` header: confirmed present, confirmed pre-existing (this change's own delta at `openspec/changes/zoo-map-home/specs/detective-mode/spec.md` is a clean, correctly-headed delta with no such artifact). Not touched, correctly out of scope. ✓

## Issues

### CRITICAL

**C1 — `zoo-map` spec's "Image-to-ViewBox Transform" scenario has zero covering test.**
The requirement (`specs/zoo-map/spec.md:67-77`) asserts `vbX = imgX × 0.651042`, `vbY = imgY × 0.651042 − 33.333` as the mapping that produced every `hit` rect, with the scenario "GIVEN a measured point on the source PNG WHEN converted with the two transform lines THEN the result MUST equal the registry's corresponding hit coordinate." No code exports this transform as a callable function — the constant `0.651042` appears only in `design.md` prose and a `sectors.ts` header comment, never as code. `rg` for `0.651042` in any `*.test.*` file returns nothing. The only proof this scenario ever ran is the human screenshot review (which the launch prompt itself frames as "necessary and not sufficient," and which did in fact catch and fix four real scale defects in `14cfe1e`). Recommendation: either downgrade this scenario's wording to explicitly name it human-screenshot-verified (consistent with how the proposal's own risk table treats `hit` placement), or add a small unit test asserting a couple of registry rects against the two transform lines applied to their documented source-PNG coordinates.

**C2 — `tasks.md` 5.1-6.2 (8 tasks) are unchecked despite their work being substantively done.** Screenshots exist and were reviewed by this pass; the "capture → read → correct the registry → recapture" loop tasks.md 5.5 describes was executed twice in commits `14cfe1e` and `1ed1318`; task 6.1 (full-suite final gate) is this report's own primary evidence. Per this skill's own rule, unchecked tasks are always CRITICAL regardless of other findings. Recommendation: check off 5.1-6.2 in `tasks.md` (or have the orchestrator do so) once this report is accepted, since the underlying work is done and verified — this is a tracking-hygiene gap, not a missing deliverable.

### WARNING

**W1 — `scripts/shot.sh`'s `capturas/` destination change (commit `ae1bb7e`) is not recorded in `design.md`.** The launch prompt explicitly asked to confirm this; it is documented in the commit message and the script's own new header comment, but `design.md` (unlike its thorough treatment of the two fog revisions) has no matching entry. Low severity — it is build tooling, not application behavior, and does not affect any spec compliance — but it is a real, if minor, "divergence not recorded in the artifacts" per the launch prompt's own bar.

**W2 — `apply-progress.md`'s final tally (60 files / 1154 tests) is stale.** It was committed (`32108c0`) before the three later fix commits that landed 2 net additional tests while correcting screenshot-discovered scale defects. The number this report measured (1156) is correct and matches the launch prompt's own stated baseline; `apply-progress.md` simply predates it. No action needed beyond awareness — do not treat 1154 as the number to reproduce.

**W3 — The `trace-canvas` spec delta's claim that `TraceCanvas` is `placeArt`'s only remaining call site is now false, and untested.** `specs/trace-canvas/spec.md`'s "Carrier Art Placement via placeArt()" requirement states "Every call site (`TraceCanvas`) MUST use this function," and its scenario "No second call site remains" asserts "`TraceCanvas` MUST be the only call site." In fact `client/src/zoo/sectors.ts` and `client/src/screen/ZooMap.tsx` both import and call `placeArt` too (`rg` confirms three importers total: `TraceCanvas.tsx`, `zoo/sectors.ts`, `screen/ZooMap.tsx`). This is not a code defect — `design.md` §"a fog patch's rect is `placeArt`" and its "Recovered Animal Placement" section explicitly and deliberately reuse `placeArt` rather than writing a second placer, which is good practice ("no second placer is written," `design.md:458`). The defect is purely in the **spec artifact**: `proposal.md`'s own "Modified Capabilities" table anticipated only removing the retired `HomeScreen.tsx:180` call site, not that this change would *add* two new ones, so the spec's "only call site" language was never updated and no test was ever written or could pass against it as literally stated. Recommend correcting `specs/trace-canvas/spec.md`'s requirement/scenario text to reflect the actual, intentional three-call-site state before this change is archived, since an archived spec should not assert something the shipped code contradicts.

### SUGGESTION

**S1 — Fog Fade Motion's spec scenario remains genuinely unreachable end-to-end under the shipped registry**, exactly as `apply-progress.md`'s own Deviation #1 and `ZooMap.tsx`'s `fogClassFor` comment already state. This is honestly disclosed, not hidden, and the pure function is directly tested against real closed-sector data (`bosque`) instead — the correct call given the constraint. No action needed now; flagged only so paso D's author knows to add an end-to-end assertion once a closeable-then-discoverable sector exists.

## Spec Compliance Matrix (zoo-map, abbreviated — full detail above)

| Requirement | Status |
|---|---|
| Sector Registry Data Shape | PASS — `sectors.test.ts` |
| Sector Geometry Invariants | PASS — `sectors.test.ts`, not vacuous |
| Fog Containment Invariant | PASS — `sectors.test.ts`, falsifiability proven |
| Image-to-ViewBox Transform and Background | **PARTIAL** — background sub-scenario tested; transform sub-scenario untested (C1) |
| Sector-to-Adventure Mapping | PASS — `sectors.test.ts` |
| Estanque Starts Discovered | PASS — `sectors.test.ts` |
| nextAdventure Resolution | PASS — `sectors.test.ts` |
| Recovered Animal Placement | PASS — `sectors.test.ts` |
| Layer Order | PASS — `ZooMap.test.tsx` |
| HUD Captioning | PASS — `ZooMap.test.tsx`, `App.test.tsx`, falsifiability proven |
| Star Derivation | PASS — `stars.test.ts` |
| Backpack Registry | PASS — implicit (`earnedItems` over empty registry, exercised by `ZooMap.test.tsx`) |
| Sector Debug Overlay | PASS — `devMode.test.ts`, `ZooMap.test.tsx` |
| Fog Fade Motion | PASS (with disclosed limitation, S1) — `ZooMap.test.tsx` against `fogClassFor` directly |
| No url(#…) References | PASS — `ZooMap.test.tsx`, confirmed via diff |

**14 of 15 requirements fully verified; 1 partially verified (transform sub-scenario, C1).**

## Verdict

**PASS WITH WARNINGS.**

The implementation is substantively correct, well-tested, and matches the design's stated reasoning at every point this pass could check against code. Zero functional regressions found; the full suite (60 files / 1156 tests) and build are green; the deduction mode, art registry, and catalog are all verified untouched. Two CRITICAL findings are both artifact/process gaps rather than functional defects — C2 (unchecked-but-done tasks) is pure bookkeeping, and C1 (untested transform scenario) is a spec-writing gap for a claim that was in practice verified by the mandated human-screenshot process instead of a unit test. Three WARNINGs are documentation-completeness gaps (W1, W2) and one now-false spec claim (W3) that should be corrected before archive so the archived spec does not assert something the shipped code contradicts.

Recommend: check off `tasks.md` 5.1-6.2, correct `specs/trace-canvas/spec.md`'s "only call site" claim, add a one-line `design.md` note for the `capturas/` script change, then proceed to archive.
