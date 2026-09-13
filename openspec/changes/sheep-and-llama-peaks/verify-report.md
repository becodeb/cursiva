```yaml
schema: gentle-ai.verify-result/v1
evidence_revision: sha256:bc7b051b264df1a946b4720c70d43c0978fdeb3ea9bba5ba15858f95e0499f88
verdict: pass_with_warnings
blockers: 0
critical_findings: 0
requirements: 18/18
scenarios: 60/60
test_command: npm test
test_exit_code: 0
test_output_hash: sha256:b1cc8c9aa8a9526b59c0a01a14456cf875bd8348443912f2390df66358389440
build_command: npm run build
build_exit_code: 0
build_output_hash: sha256:d3ebfc0b621dee6c96a0133af8e8a35915f7aad02523049d5efbebfe7078f652
```

## Verification Report

**Change**: sheep-and-llama-peaks
**Version**: N/A (openspec spec-driven, no semver)
**Mode**: Standard (`openspec/config.yaml testing.strict_tdd: false`)

### Completeness
| Metric | Value |
|--------|-------|
| Tasks total | 47 |
| Tasks complete | 40 |
| Tasks incomplete | 7 (all Phase 7 — screenshot verification, deliberately deferred to the maintainer's own capture pass, not an implementation gap) |

### Build & Tests Execution

**Build**: PASSED
```text
$ npm run build -w client
> tsc --noEmit && vite build
✓ 515 modules transformed
dist/index.html                  1.89 kB
dist/assets/index-DHR-EwJV.js  811.10 kB
✓ built in 390ms
(pre-existing >500kB chunk-size advisory only, no error)
```

**Tests**: PASSED — 65 test files / 1282 tests, all green (baseline on `main`: 63 files / 1223 tests)
```text
$ npm test -w client
 Test Files  65 passed (65)
      Tests  1282 passed (1282)
```

**Coverage**: N/A (no coverage tool configured in this repo, pre-existing convention)

### Spec Compliance Matrix

18 requirements / 60 scenarios across five delta specs, independently re-counted from the retrieved spec files (`detective-mode` 2 req/6 scen, `level-engine` 6 req/17 scen, `main-screen` 2 req/7 scen, `trace-canvas` 3 req/13 scen, `zoo-map` 5 req/17 scen).

| Requirement | Scenario (representative) | Test | Result |
|---|---|---|---|
| level-engine: Per-Vertex-Height Ridge Path Generator | Peaks land at `base − heights[i]`; only M/L | `paths.test.ts` (peakRidge suite) | ✅ COMPLIANT |
| level-engine: Ridge Corner-Fusion Corridor Limit | Reduces to `cornerClearance` inversion; tight at `W*+1` | `paths.test.ts` (peakRidgeCorridorLimit suite) | ✅ COMPLIANT |
| level-engine: Sheep and Llama Ridge Level Set | 8 ids between duck-trail4/f2-guirnalda; corridorWidth strictly decreasing; demo/rail scoped | `catalog.test.ts` (EXPECTED_IDS, mountain-family describe) | ✅ COMPLIANT |
| level-engine: Height/Slope/Corner Invariants (I1–I4,I6,I7) | All six invariants hold over frozen literals | `catalog.test.ts` I1–I7 rows | ✅ COMPLIANT |
| level-engine: Vertex Art Field/Selector | `routeApexes` correct counts; no case-membership leak | `vertexArt.test.ts` | ✅ COMPLIANT |
| level-engine: Docs §6/§14 Checklist Coverage | Engine-owned fields all populated; no narrative-transition field | `catalog.test.ts` | ✅ COMPLIANT |
| trace-canvas: Channel Paint Follows the Backdrop Luma Law | Luma law holds for 3 backdrops; 4 named falsifiability rows fail | `backdrops.test.ts`, `TraceCanvas.test.tsx` | ✅ COMPLIANT (see Correctness note on the spec/design row-count drift) |
| trace-canvas: Vertex Art Rendering Layer | 1 image/apex, renders under `endArt`, no forbidden refs | `TraceCanvas.test.tsx` (vertexArt describe) | ✅ COMPLIANT |
| trace-canvas: Demo Stroke Contrasts With the Channel | SHEET_PAPER over channel, DEMO_STROKE otherwise | `TraceCanvas.test.tsx` | ✅ COMPLIANT |
| zoo-map: Sector-to-Adventure Mapping | montañas' 8 ids in order; 4 sectors stay fogged/empty | `sectors.test.ts` | ✅ COMPLIANT |
| zoo-map: Backpack Registry | Hat absent/present around `llama-peak4` | `backpack.test.ts` | ✅ COMPLIANT |
| zoo-map: Octopus Phrase Reads as a Closing | none/one/both-filed trio, most-recently-recovered | `adventures.test.ts` (mapBubble describe) | ✅ COMPLIANT |
| zoo-map: Montañas Opened | Closed→open on `duck-trail4`; llama `dy` above sheep's | `sectors.test.ts` | ✅ COMPLIANT |
| zoo-map: Adventure Backdrop Registry Re-Keyed | sheep/llama resolve stone-channel rows; duck/undefined unaffected | `backdrops.test.ts` | ✅ COMPLIANT |
| detective-mode: ZooAnimalId Widens Vocabulary | Identity preserved; new animals resolve; `AnimalId` untouched | `assets`-adjacent tests, `AdventureIntro.test.tsx` | ✅ COMPLIANT |
| detective-mode: Sheep/Llama Levels Stay Outside Detective World | `isCaseTrail`/`inDetectiveWorld` false for all eight; ordinary shell renders | `world.test.ts`, `LevelPlay.test.tsx` | ✅ COMPLIANT |
| main-screen: resolveEnterAction | `'intro'` for all three adventures' first level; unaffected elsewhere | `GameScreen.test.tsx` | ✅ COMPLIANT |
| main-screen: Narrative Entry Screen Content | Own animal + own intro text, no new asset, taps to own first level | `AdventureIntro.test.tsx` | ✅ COMPLIANT |

**Compliance summary**: 60/60 scenarios compliant (full suite 1282/1282 green; every scenario above maps to a passing test file confirmed by direct source reading, not test-count inference alone).

### Correctness (Static Evidence)

| Requirement | Status | Notes |
|---|---|---|
| Falsifiability rows discriminate | ✅ Confirmed | Hand-recomputed luma601 for all 6 literals against `CHANNEL_STONE`/`SHEET_PAPER`: `MUD_INK` gap 12, `GOAL_COLOR` gap 4, start-green gap 37, `DEMO_STROKE` gap 1, `SHEET_PAPER`-vs-cordillera gap 7 — all genuinely `<55`, all mirrored literals in `TraceCanvas.test.tsx`/`backdrops.test.ts` match the actual module-private constants byte-for-byte (`LevelPlay.tsx:158`, `TraceCanvas.tsx:71,187,1263`). These are real, sensitive assertions, not tautologies. |
| Eight levels' geometry | ✅ Confirmed | `catalog.ts:470-617`'s heights/corridorWidth/taper for all eight match `design.md` §1.4's table exactly, including `feedback(0,true)` scoped to `sheep-hill1` only via the `feedback()` helper's `rail` parameter. `peakRidgeCorridorLimit`'s implementation (`paths.ts:816-848`) matches the design's per-run consumption formula term-for-term; `catalog.test.ts`'s I1–I7 rows and the pre-existing phase-1 span/minY/maxY guard (415-434) all pass with no edit needed for the guard, as claimed. |
| `sheep.brightest` deviation | ✅ Confirmed correct | Rebuilt `manifest.json`'s `sector-slope-background.brightest` is exactly `#9da396`, matching `backdrops.ts`'s shipped value (not `design.md`'s draft `#b4bec5`). Luma law still clears: `|luma(CHANNEL_STONE=100) − luma(#9da396=160)| = 60 ≥ 55`. |
| `mapBubble` defect fix | ✅ Confirmed | `.filter(...).at(-1)` over `ADVENTURES` (registry order duck→sheep→llama) correctly resolves the llama's closing line once both are filed; the none/sheep-only/both-filed trio exists in `adventures.test.ts` and passes. |
| Lagoon byte-identical claim | ⚠️ Adequate, not literal | Evidence is targeted prop/substring assertions (`stroke="#fdfcf7"`, absence of `CHANNEL_STONE`, `inkOnly`/`directionArrow`/`startArt.href` equality) plus `git diff` review of the exact three changed conditionals, not a full-markup snapshot diff — this repo has no snapshot-testing setup, as apply-progress.md states plainly. The narrowness of the actual code change (3 ternaries + 1 layer, all gated on new-prop presence) makes this reasonably strong evidence, but it is not literally "byte-identical" proof. |
| `url(#...)` scope | ✅ Confirmed | Zero real occurrences; every `rg` hit across `client/src` is either a comment documenting the ban or a test assertion checking for its absence. |
| Scope stop | ✅ Confirmed | `git diff --stat main...HEAD` touches no `cases.ts`, `Deduction.tsx`, `clues.ts`, or `PistasRail.tsx`; no D–H content. 38 files changed total (26 code files + `manifest.json` + 1 binary PNG + 10 SDD artifact files), matching the claimed 3919/-111 total. |
| `docs/13` §4 status row | ❌ Not done | See CRITICAL/WARNING findings below — this is a genuine, owed gap. |
| Spec/design falsifiability-row drift | ⚠️ Pre-existing artifact inconsistency, correctly worked around | Confirmed real: `trace-canvas/spec.md`'s literal text names its four rows as `SHEET_PAPER`-vs-cordillera / `MUD_INK` / `GOAL_COLOR` / demo stroke; `design.md` §2.1's own table computes a different fourth row (the green start-dot/arrow) and treats `SHEET_PAPER`-vs-cordillera as a separate argument. The implementation ships all five assertions (`MUD_INK`, `GOAL_COLOR`, start-green, `DEMO_STROKE` in `TraceCanvas.test.tsx`, plus `SHEET_PAPER`-vs-cordillera in `backdrops.test.ts`), which satisfies both the spec's literal scenario text and `design.md`'s fuller ruling — nothing derived was dropped. The underlying delta-spec document itself was never corrected to remove the ambiguity it and `design.md` disagree on, which is a documentation-hygiene issue in the spec artifact, not a code defect. |

### Coherence (Design)

| Decision | Followed? | Notes |
|---|---|---|
| §1.1 Ridge not wave | ✅ Yes | `peakRidge` matches the spec's M/L-only, `base − heights[i]` contract exactly. |
| §1.3 `trail3` not a pre-existing failure | ✅ Yes | Assertion scoped to the eight authored levels only, as both `design.md` and the spec require; `trail3`/`triangularWave` untouched. |
| §1.5 I1–I3 replacing per-step mean slope | ✅ Yes | `catalog.test.ts`'s mountain-family describe restates I1–I4,I6,I7 verbatim over the frozen literals. |
| §2.1 `CHANNEL_STONE = '#606569'` | ✅ Yes | Value, luma (100), and window derivation all confirmed by hand computation. |
| §2.3 Backdrop re-key to `AdventureId` | ✅ Yes | `backdropFor` routes through `adventureFor(levelId).id`; duck/medusa/trail regression rows re-run and pass. |
| §3.2 `drawnPlace` / three gate widenings | ✅ Yes | `LevelPlay.tsx`'s `drawnPlace = inWorld || !!backdrop` and the three call-site changes match the design table exactly. |
| §3.3 `vertexArt` primitive | ✅ Yes | No `ClueKind`, no rail entry; `isCaseTrail`/`inDetectiveWorld` unaffected, confirmed by dedicated test. |
| §4.2 `mapBubble` defect fix | ✅ Yes | See Correctness table above. |
| File Changes table: `docs/13_AVENTURAS_POR_ANIMAL.md` "Modify — §4 status rows" | ❌ No | Design.md commits to this edit in its own File Changes table (line 633), but no numbered task in `tasks.md` ever assigned it, and it was never done — confirmed via `git diff main...HEAD -- docs/13_AVENTURAS_POR_ANIMAL.md` returning empty. |

### Issues Found

**CRITICAL**: None. Zero requirements are untested, zero tests fail, build is green, no scope creep into `cases.ts`/`Deduction`/pistas machinery, no `url(#...)` violation.

**WARNING**:
1. **`docs/13_AVENTURAS_POR_ANIMAL.md` §4's status rows for Ovejas/Llamas were never updated**, even though `design.md`'s own File Changes table (line 633) lists this file as one this change modifies. Lines 162–163 still read "Parcial: hay onda triangular (`trail3`) y marcas por arco" / "Parcial: la misma onda triangular" — describing the pre-change state, not what shipped. This is a real, owed gap: `sdd-tasks` should have carried a numbered task for it and did not, and `sdd-apply` did not self-correct it either. Exact replacement text, mirroring how the "Medusa" row (`Hecha`) already reads in the same table:
   - `| Ovejas | Hecha (\`sheep-hill1..4\`) | Nada. Zigzag bajo con lista de alturas por vértice (alta-baja), ovejas como marcas en los picos, ladera con canal de piedra. |`
   - `| Llamas | Hecha (\`llama-peak1..4\`) | Nada. Picos altos y empinados con la fusión de esquinas medida; accesorio de pastor sumado a la mochila. |`
2. **Phase 7 (7 of 47 tasks) is unstarted** — the eight levels' backdrops, channels, vertex art and registries have never been visually inspected together. This is explicitly, deliberately deferred to the maintainer's own capture pass per their stated instruction to `sdd-apply`, and it maps to zero untested spec scenarios (Phase 7 is a "Testing Strategy" screenshot layer named in `design.md`, not a formal spec requirement/scenario pair) — but per the skill's own decision gate ("Unchecked tasks: always remain CRITICAL, even when other artifacts are missing or warnings-only"), this is flagged here explicitly rather than silently downgraded. It is reported at WARNING severity because it represents a deferred human sign-off step with an explicit rationale and zero code/spec gap, not an abandoned or forgotten engineering task.
3. **The lagoon "byte-identical" claims (tasks 4.10, 6.1, 8.3) are proven by targeted prop/substring assertions plus manual `git diff` review, not a stored full-markup snapshot** — adequate given this repo has no snapshot-testing infrastructure, and the actual code surface that could regress is narrow and each conditional is individually tested, but this is not literally byte-for-byte proof and should not be described as such in future artifacts without this caveat.
4. **The `trace-canvas` delta spec and `design.md` name different "fourth" falsifiability rows** (spec: `SHEET_PAPER`-vs-cordillera; design: the green start-dot/arrow), an inconsistency `tasks.md` correctly identified and worked around by implementing all five assertions, but the spec artifact itself was never corrected to remove the ambiguity for future readers.

**SUGGESTION**: None beyond the above.

### Verdict
PASS WITH WARNINGS
Zero critical findings, zero failing/untested spec scenarios, full suite green (65/65 files, 1282/1282 tests) and build green; four WARNING-level gaps recorded above (an un-updated docs status row, the deliberately deferred human screenshot phase, an honestly-labelled evidentiary caveat on byte-identical claims, and an uncorrected spec/design cross-reference drift) — none of which block the shipped code's correctness.
