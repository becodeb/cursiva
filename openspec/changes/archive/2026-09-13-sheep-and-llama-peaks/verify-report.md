```yaml
schema: gentle-ai.verify-result/v1
evidence_revision: sha256:ff3bfc196d677a946bc53079c3fe5a6a6fb3cf203557328610ce87c893b30527
verdict: pass_with_warnings
blockers: 0
critical_findings: 0
requirements: 18/18
scenarios: 60/60
test_command: npm test
test_exit_code: 0
test_output_hash: sha256:55ebfc82c53f0ed156630ffc96d3087541f6914ce96d44d998bc268c56e83a1a
build_command: npm run build
build_exit_code: 0
build_output_hash: sha256:2717f76715efa05d33f3c00959b9cf4877058c7a05f321c607e85c816daa555f
```

## Verification Report

**Change**: sheep-and-llama-peaks
**Version**: N/A (openspec spec-driven, no semver)
**Mode**: Standard (`openspec/config.yaml testing.strict_tdd: false`)

This is a RE-verify. The prior report (commit `0ad279c`) was written before the
maintainer's own Phase 7 capture pass found and fixed three defects (commits
`017c173`, `3a1f515`, `de8a4cc`), amended one delta-spec scenario, and closed
the `docs/13` §4 status-row gap (`6471e68`). This report supersedes it and was
built by independently re-reading every changed file and re-running the full
suite and build against current `HEAD` (`2056abe`), not by trusting the prior
report or the prompt's own claims.

### Completeness
| Metric | Value |
|--------|-------|
| Tasks total | 47 |
| Tasks complete (`[x]`) | 46 |
| Tasks partial (`[~]`) | 1 (7.4) |
| Tasks incomplete (`[ ]`) | 0 |

Task 7.4 ("map after each mountain adventure closes" and "backpack HUD with
the hat") is marked `[~]`, honestly, not `[x]`. Confirmed by reading
`tasks.md`: the only progress-seeding dev flag (`?debug=pato-recuperado`,
`canvas/devMode.ts`) seeds the duck alone, so reaching those two captures
needs either a real eight-level drag-through or a new seeding flag; inventing
one would be unscoped work on the surface Phase 7 exists to review. The two
behaviours this gap would have visually confirmed are independently pinned by
runtime tests: `sectors.test.ts` asserts both `animals[].appearsWhen` rules
(`sheep-hill4`/`llama-peak4`) and `backpack.test.ts` asserts `earnedItems`
includes `andean-hat` exactly once `llama-peak4` is filed. **Ruling: this does
not block archive.** It is a deferred human visual-QA step with an explicit,
narrow, well-documented reason, zero corresponding untested spec scenario, and
compensating unit coverage over the exact conditions the screenshot would have
shown — not an abandoned engineering task. Reported as WARNING below, per the
skill's "unchecked tasks always remain visible" rule, not silently dropped.

### Build & Tests Execution

**Build**: PASSED
```text
$ npm run build
> tsc --noEmit && vite build
✓ 515 modules transformed
dist/index.html                  1.89 kB
dist/assets/index-BCSio6Mg.js  811.12 kB
✓ built in 447ms
(pre-existing >500kB chunk-size advisory only, no error)
```

**Tests**: PASSED — 65 test files / 1286 tests, all green
```text
$ npm test
 Test Files  65 passed (65)
      Tests  1286 passed (1286)
```
Independently re-run in this session, not copied from the prompt. Matches the
prompt's claimed 65/1286 exactly (apply-time baseline was 65/1282; the three
Phase 7 corrections net +4: +1 sheep-corner regression, +1 rewritten
wordless-shell row covering both sheep and llama, +2 fog-invariant rows —
consistent with `tasks.md` 8.1's own accounting). Repo `main` baseline remains
63 files / 1223 tests.

**Coverage**: N/A (no coverage tool configured in this repo, pre-existing convention)

### Spec Compliance Matrix

18 requirements / 60 scenarios across five delta specs, independently
re-counted from the current spec files by grepping `### Requirement:` /
`#### Scenario:` headings directly (`detective-mode` 2 req/6 scen,
`level-engine` 6 req/17 scen, `main-screen` 2 req/7 scen, `trace-canvas`
3 req/13 scen, `zoo-map` 5 req/17 scen) — the counts are unchanged from the
prior report; only the detective-mode scenario's wording and covering test
changed.

| Requirement | Scenario (representative) | Test | Result |
|---|---|---|---|
| level-engine: Per-Vertex-Height Ridge Path Generator | Peaks land at `base − heights[i]`; only M/L | `paths.test.ts` (peakRidge suite) | ✅ COMPLIANT |
| level-engine: Ridge Corner-Fusion Corridor Limit | Reduces to `cornerClearance` inversion; tight at `W*+1` | `paths.test.ts` (peakRidgeCorridorLimit suite) | ✅ COMPLIANT |
| level-engine: Sheep and Llama Ridge Level Set | 8 ids between duck-trail4/f2-guirnalda; corridorWidth strictly decreasing; demo/rail scoped | `catalog.test.ts` (EXPECTED_IDS, mountain-family describe) | ✅ COMPLIANT |
| level-engine: Height/Slope/Corner Invariants (I1–I4,I6,I7) | All six invariants hold over frozen literals | `catalog.test.ts` I1–I7 rows | ✅ COMPLIANT |
| level-engine: Vertex Art Field/Selector | `routeApexes` correct counts; no case-membership leak | `vertexArt.test.ts` | ✅ COMPLIANT |
| level-engine: Docs §6/§14 Checklist Coverage | Engine-owned fields all populated; no narrative-transition field | `catalog.test.ts` | ✅ COMPLIANT |
| trace-canvas: Channel Paint Follows the Backdrop Luma Law | Luma law holds for 3 backdrops; falsifiability rows fail | `backdrops.test.ts`, `TraceCanvas.test.tsx` | ✅ COMPLIANT (spec/design row-count naming drift persists, see Correctness) |
| trace-canvas: Vertex Art Rendering Layer | 1 image/apex, renders under `endArt`, no forbidden refs | `TraceCanvas.test.tsx` (vertexArt describe) | ✅ COMPLIANT |
| trace-canvas: Demo Stroke Contrasts With the Channel | SHEET_PAPER over channel, DEMO_STROKE otherwise | `TraceCanvas.test.tsx` | ✅ COMPLIANT |
| zoo-map: Sector-to-Adventure Mapping | montañas' 8 ids in order; 4 sectors stay fogged/empty | `sectors.test.ts` | ✅ COMPLIANT |
| zoo-map: Backpack Registry | Hat absent/present around `llama-peak4` | `backpack.test.ts` | ✅ COMPLIANT |
| zoo-map: Octopus Phrase Reads as a Closing | none/one/both-filed trio, most-recently-recovered | `adventures.test.ts` (mapBubble describe) | ✅ COMPLIANT |
| zoo-map: Montañas Opened | Closed→open on `duck-trail4`; llama `dy` above sheep's | `sectors.test.ts` | ✅ COMPLIANT |
| zoo-map: Adventure Backdrop Registry Re-Keyed | sheep/llama resolve stone-channel rows; duck/undefined unaffected | `backdrops.test.ts` | ✅ COMPLIANT |
| zoo-map: fog is exactly "not open" (unwritten invariant made explicit by the Phase 7 fix) | montañas' fog lifts on `duck-trail4`; every fogged sector equals `!unlockedWhen` for both inputs | `ZooMap.test.tsx` (2 new rows, `de8a4cc`) | ✅ COMPLIANT — genuine regression fix, verified below |
| detective-mode: ZooAnimalId Widens Vocabulary | Identity preserved; new animals resolve; `AnimalId` untouched | `assets`-adjacent tests, `AdventureIntro.test.tsx` | ✅ COMPLIANT |
| detective-mode: Sheep/Llama Levels Stay Outside Detective World — **amended scenario** | `isCaseTrail`/`inDetectiveWorld` false for all eight; **wordless shell renders** (was "ordinary shell renders" before `3a1f515`) | `world.test.ts`, `LevelPlay.test.tsx` (rewritten rows, both sheep and llama) | ✅ COMPLIANT — spec and code agree after the amendment, confirmed below |
| main-screen: resolveEnterAction | `'intro'` for all three adventures' first level; unaffected elsewhere | `GameScreen.test.tsx` | ✅ COMPLIANT |
| main-screen: Narrative Entry Screen Content | Own animal + own intro text, no new asset, taps to own first level | `AdventureIntro.test.tsx` | ✅ COMPLIANT |

**Compliance summary**: 60/60 scenarios compliant (full suite 1286/1286 green; every scenario above maps to a passing test confirmed by direct source reading of the current tree, not test-count inference).

### Correctness (Static Evidence) — re-verified against the current tree

| Claim | Status | Notes |
|---|---|---|
| The sheep asset defect and fix | ✅ Confirmed, with a correction to the maintainer's mechanism description | Decoded both the pre-fix and post-fix `sector-sheep.png` (via `scripts/art/png.py`, no PIL available in this environment) directly. Pre-fix: top-left/top-right alpha 0, **bottom-left/bottom-right alpha 255** — exactly matching the "bottom corners at alpha 255" claim — and 54.1% of all pixels at alpha ≥ 250 (also exact-255). A downsampled ASCII alpha-map confirms the real defect shape: the true sheep silhouette (a solid blob) plus a genuine speckled dither scattered across the transparent field, not a uniform box — this matches `build_art.py`'s own comment and the `SPECKLED_ALPHA_SOURCES`/`keep_largest_blob()` fix mechanism exactly. Post-fix: all four corners alpha 0, dimensions 420×448 matching the shipped `manifest.json` and `assets.ts`'s mirrored `w`. Exactly one manifest entry (`sector-sheep`) changed in the fix commit; no other asset's bytes moved. |
| The opacity-fraction assertion's actual power, as asked to confirm | ✅ Confirmed, exactly as stated | 54.1% (measured) is well under the test's `< 0.85` threshold — the opacity-fraction assertion alone would have PASSED on the old, defective asset and would NOT have caught the regression. The corner assertion (`alpha === 0` at all four corners) is the one that fails on the old asset (bottom two corners were 255) and is therefore the only genuinely discriminating check in the new test. Agreeing plainly, as asked: the fraction check is decorative here; the corner check does the work. |
| `artHierarchy.test.ts`'s new test docblock narrative | ⚠️ Inaccurate — not the actual defect or fix mechanism, flagged as a new WARNING | The test's own comment describes the defect as "an OPAQUE near-white background instead of transparency" fixed by a function called `key_out_border_background()`. Neither claim matches the shipped code: `rg` finds zero occurrences of `key_out_border_background` anywhere in the repository (verified), and the ASCII alpha-map above shows a scattered speckle dither, not a solid background box. The actually-shipped fix is `SPECKLED_ALPHA_SOURCES` feeding the pre-existing `keep_largest_blob()`, exactly as `build_art.py`'s own comment (and `tasks.md` 7.7) describe. The test's assertions themselves are correct and do discriminate (see above); only the prose explaining *why* is wrong, apparently copy-drifted from a different defect narrative. Cosmetic, but real, and worth fixing before a future reader trusts the wrong story. |
| The 13-gate `inWorld`→`drawnPlace` move, and that mechanics gates did NOT move | ✅ Confirmed | `rg` over `LevelPlay.tsx` shows `carrierArt` (line 1334), `inkColor`/`inkDimColor` (1339-1340) still gated on `inWorld`, unchanged by `3a1f515`. The scattered-ground `useMemo` (`!inWorld \|\| corridor \|\| backdrop`) is also still `inWorld`-gated (pre-existing from Phase 4, untouched by this fix). The PISTAS rail renders on `isCase`, a separate variable never touched. Counted 13 `drawnPlace` chrome-gate call sites in the diff (back button ×2, title, hint, rotate prompt, PISTAS-adjacent result section, erase button ×2, replay button ×2, guide-request button, next button ×2 — matches "13 chrome gates" in the maintainer's own account). |
| Spec/code agreement after the detective-mode amendment | ✅ Confirmed | `specs/detective-mode/spec.md`'s scenario now reads "The wordless shell renders for these levels" and lists title/hint/rotate-prompt/coach-copy/worded-buttons as MUST-NOT-render, plus no PISTAS rail. `LevelPlay.test.tsx`'s rewritten test for `sheep-hill1` and new test for `llama-peak1` assert exactly this set (`Fase 1 · …`, `level.hint`, `'Girá el dispositivo'`, `'Precisión'`, `'Borrar'`, `'Siguiente'`, `<aside`) — spec text and test assertions now agree with each other and with the shipped code. |
| ZooMap fog fix, duck levels and closed sectors unaffected | ✅ Confirmed | `ZooMap.tsx`'s fog filter changed from `fog.length > 0` to `fog.length > 0 && !isOpen(sector, records)`. The two new tests in `ZooMap.test.tsx` are exactly the right shape: one pins that ONLY `montanas` moves between the empty-records and `duck-trail4`-filed renders (`[...opened].sort()` equals `[...closed]` minus `montanas`), and the other asserts the general invariant — fogged iff not open — over both inputs, across every sector with any declared fog. This structurally cannot regress a duck-adjacent or still-closed sector without also failing the invariant row. |
| `docs/13` §4 status rows | ✅ Confirmed done | Ovejas/Llamas rows now read `**Hecha**` with the shipped mechanism named (`peakRidge`, `vertexArt`, ladera/cordillera backdrops, Andean hat) — the prior report's CRITICAL-adjacent WARNING is resolved. Decision 5 (added in the same commit) records three corrected assumptions: the corner-fusion warning targeted the wrong animal (llamas were named, sheep are actually the tighter case because pitch step, not slope, drives `W*`); "low hills as a wave" was undrawable against the phase-1 guard, resolved as a ridge-over-groundline instead; and decision 3 needed a per-backdrop channel, with the cordillera's own gap (43.4, below the 55 minimum) as the reason `CHANNEL_STONE` (gaps 59.8/145.0) was forced rather than chosen. All three read as accurate accounts of what actually shipped, cross-checked against `catalog.ts` and `backdrops.ts`. |
| Scope stop | ✅ Confirmed | `git diff --stat main...HEAD` touches no `cases.ts`, `Deduction.tsx`, `clues.ts`, or `PistasRail.tsx`. Zero real `url(#` occurrences in `client/src` — every hit is a comment documenting the ban or a test assertion checking its absence. 43 files changed total (26 code files + `manifest.json` + 1 binary PNG + 15 SDD/docs artifact files), 4303/-128 total — larger than the prior report's count because it now includes the three Phase 7 fix commits, `apply-progress.md`'s own diff, and the prior stale `verify-report.md`. No paso D–H content. |
| `trace-canvas` spec/design falsifiability-row naming drift | ⚠️ Still present, unchanged | `trace-canvas/spec.md` was not touched by the Phase 7 fixes (only `detective-mode/spec.md` was amended). It still names its fourth falsifiability row as `SHEET_PAPER`-vs-cordillera where `design.md` §2.1 computes the green start-dot/arrow instead. The implementation still ships all five assertions (satisfying both readings), so this remains a documentation-hygiene carry-over from the prior report, not a new or code-level issue. |
| Lagoon byte-identical claim | ⚠️ Still adequate, not literal, unchanged | Same caveat as the prior report: targeted prop/substring assertions plus `git diff` review, no full-markup snapshot infrastructure exists in this repo. Unaffected by the Phase 7 fixes (the fixed files are `LevelPlay.tsx`, `ZooMap.tsx`, `build_art.py` — the lagoon-specific assertions in `TraceCanvas.test.tsx`/`backdrops.test.ts` were not touched by any of the three corrections). |

### Coherence (Design)

| Decision | Followed? | Notes |
|---|---|---|
| §1.1 Ridge not wave | ✅ Yes | Unaffected by Phase 7; re-confirmed unchanged. |
| §1.3 `trail3` not a pre-existing failure | ✅ Yes | Unaffected; unchanged. |
| §1.5 I1–I3 replacing per-step mean slope | ✅ Yes | Unaffected; unchanged. |
| §2.1 `CHANNEL_STONE = '#606569'` | ✅ Yes | Unaffected; unchanged. |
| §2.3 Backdrop re-key to `AdventureId` | ✅ Yes | Unaffected; unchanged. |
| §3.2 `drawnPlace` / gate widening — **now includes the Phase 7 correction** | ✅ Yes, and more complete than the design anticipated | `design.md` names the original three call-site widenings; the maintainer's own reading found ten additional chrome sites still gated on `inWorld` that should have moved with the same reasoning (back/erase/replay/next buttons, rotate prompt, result section). All 13 now move together; the mechanics gates the design explicitly keeps on `inWorld` (the lens, ink colours) are untouched, matching the design's own separation of concerns even though the design's own task list undercounted the call sites. |
| §3.3 `vertexArt` primitive | ✅ Yes | Unaffected; unchanged. |
| §4.2 `mapBubble` defect fix | ✅ Yes | Unaffected; unchanged. |
| §4 fog invariant (implicit — not named as its own decision in `design.md`, but required by §4's own "fog per closed sector" framing) | ✅ Yes, corrected | `design.md` describes fog as drawn "per closed sector" but the shipped `ZooMap.tsx` computed closedness from `fog.length > 0` alone rather than consulting the sector's actual `unlockedWhen`/`isOpen` state — a latent bug that stayed invisible until montañas became the first sector with a conditional unlock. Now fixed to consult `isOpen` directly, matching the design's stated intent. |
| File Changes table: `docs/13_AVENTURAS_POR_ANIMAL.md` "Modify — §4 status rows" | ✅ Yes, now done | Resolved by `6471e68`; the prior report's WARNING here is closed. |

### Issues Found

**CRITICAL**: None. Zero requirements untested, zero failing tests, build green, no scope creep into `cases.ts`/`Deduction`/pistas machinery, no `url(#...)` violation, spec and code agree on the amended detective-mode scenario.

**WARNING**:
1. **`artHierarchy.test.ts`'s new regression-test docblock (added in `017c173`) misdescribes the defect and the fix.** It claims an "opaque near-white background instead of transparency" fixed by a function `key_out_border_background()`. Neither exists: `rg -n "key_out_border_background"` returns zero matches anywhere in the repo, and directly decoding the pre-fix asset shows a scattered alpha dither plus the real silhouette, not a uniform background box — matching `build_art.py`'s own comment (`SPECKLED_ALPHA_SOURCES` feeding `keep_largest_blob()`) and `tasks.md` 7.7's account, not the test's own prose. The test's actual assertions (all-four-corners-transparent, opacity-fraction-under-85%) are correct and were independently re-verified to discriminate the real defect; only the explanatory comment is wrong. Low severity — it costs nothing at runtime — but should be corrected before a future reader trusts the wrong causal story.
2. **Task 7.4 remains partially reached, honestly marked `[~]`.** The map-after-adventure-closes and backpack-HUD-with-hat screenshots were not captured, because the repo's only progress-seeding dev flag (`?debug=pato-recuperado`) seeds the duck adventure alone; capturing these would need either a real eight-level drag-through or unscoped new tooling. The two behaviours involved are unit-tested (`sectors.test.ts`'s `appearsWhen` rows, `backpack.test.ts`'s grant condition), so this is a deferred visual-QA step with compensating test coverage, not an engineering gap. **Ruling: does not block archive.**
3. **`trace-canvas` spec/design falsifiability-row naming drift persists, unchanged from the prior report.** `trace-canvas/spec.md` was not touched by the Phase 7 fixes; it still names a different fourth row than `design.md` computes. The implementation satisfies both readings (five assertions shipped), so this is a documentation-hygiene carry-over, not a code defect.
4. **The lagoon "byte-identical" claims remain proven by targeted assertions, not a stored snapshot**, unchanged from the prior report — this repo has no snapshot-testing infrastructure; the narrowness of the actual changed surface makes the evidence reasonably strong but not literal byte-identity.

**SUGGESTION**: None beyond the above.

### Verdict
PASS WITH WARNINGS
Zero critical findings, zero failing/untested spec scenarios, full suite green (65/65 files, 1286/1286 tests) and build green. The three maintainer-found-and-fixed defects (boxed sheep asset, worded mountain-level shell, montañas' stuck fog) are independently re-verified in this session against the current tree — corner-decoded the actual PNG bytes rather than trusting the claim, re-read every changed line of `LevelPlay.tsx`/`ZooMap.tsx`, and confirmed the amended detective-mode spec scenario matches its rewritten covering tests. `docs/13`'s status-row gap from the prior report is now closed. Four WARNING-level items remain (one new: an inaccurate test docblock narrative; three carried over: the deliberately-scoped Phase 7.4 gap, the trace-canvas spec/design naming drift, and the honestly-caveated lagoon byte-identical claim) — none block the shipped code's correctness or archive readiness.
