```yaml
schema: gentle-ai.verify-result/v1
evidence_revision: sha256:53d8fad91ae0e4af1338dc97dc14ed43a575fc51effcdecf2fd9f79c17da0f2c
verdict: pass
blockers: 0
critical_findings: 0
requirements: 30/30
scenarios: 72/72
test_command: npx vitest run --testTimeout=30000
test_exit_code: 0
test_output_hash: sha256:323562bce7ded5cbcafec9ed5d2ac2894fae696d50b53763e3d9aadcceea95fe
build_command: npm run build
build_exit_code: 0
build_output_hash: sha256:ad24d7d6fce6420e5bb295be5b6db33e52ed0db19aad8a2be795df993f514a5f
```

## Verification Report

**Change**: hedgehog-radial-spines
**Branch**: `sdd/erizo-espinas-radiales` (HEAD `521af53`, tree clean)
**Version**: N/A
**Mode**: Standard (Strict TDD disabled per `openspec/config.yaml`)

### Completeness

| Metric | Value |
|--------|-------|
| Tasks total | 74 (14 phases, `tasks.md`) |
| Tasks complete | 74 |
| Tasks incomplete | 0 |

All 74 sub-tasks across 14 phases are `[x]`. Two post-`apply-progress.md` commits
(`cc09c67` fix, `521af53` docs) are treated as final-state facts per the task brief
and are folded into this report rather than flagged as drift.

### Build & Tests Execution

**Build**: ✅ Passed
```text
$ npm run build   (= tsc --noEmit && vite build)
✓ 528 modules transformed
dist/assets/index-CP_sPJql.js  850.23 kB │ gzip: 182.43 kB
(!) pre-existing >500kB chunk-size warning, unrelated to this change
✓ built in 1.40s
exit 0
```

**Tests**: ✅ 1841 passed / 0 failed / 0 skipped, 79/79 test files
```text
$ npx vitest run --testTimeout=30000   (uncommitted flag, used only for an
                                         unambiguous correctness reading —
                                         the committed default is `npm test`
                                         at 5000ms/test)
Test Files  79 passed (79)
     Tests  1841 passed (1841)
Duration    79.53s
exit 0
```
`/proc/loadavg` at verify time: `2.53 2.47 6.96` (low). No timeouts observed on
either the raised-timeout run above or an earlier same-session run (25.57s).
Counts match `apply-progress.md`'s reported end state (79 files / 1841 tests)
exactly — no drift between the recorded batch-2 end state and the current tree.

**Coverage**: not configured (`coverage_threshold: 0` in `openspec/config.yaml`) → ➖ Not available

### Live RED-confirmation spot-check (not just source inspection)

Per the task's hard requirement to confirm at least two of design §11.1's six
assertions are non-vacuous, I re-executed break-(b) of assertion 1 live (a
constant `x + 40` offset inside `SpineLayer`'s own `clampArtBox` call, exactly
the hand-tweak shape `apply-progress.md` recorded):

```
FAIL  the body <image> box equals spineBody(cfg).box exactly
  expected 273.838... to be close to 233.838..., difference is 40
FAIL  the rendered body box equals spineBody(cfg).box... (hedgehog1)
  difference is 40
FAIL  every anchor lies on the silhouette IMPLIED by the rendered box (hedgehog1[0])
  difference is 40
3 failed | 5 passed (8)
```
Reverted (`git checkout -- src/canvas/SpineLayer.tsx`); re-ran, 8/8 green, tree
clean. This reproduces `apply-progress.md`'s reported 40-unit discrepancy
exactly and confirms the assertion is sensitive, not vacuous — it catches a
render-layer-only drift (the class of defect design §11.1 names: "moving
`body.centre` alone is vacuous," but an offset applied only inside the layer's
own placement, independent of the generator, is not). The ink-undrawability
assertion (`backdrops.test.ts` "the floor is exact") was read directly rather
than re-broken live: its numbers (172.9→171.9 rounding aside, 143.1, 25.7,
55.8, the 184.0 floor) match `design.md` §2 D1/D4 and §10 exactly, and it
already asserts both the failing direction (today's 213.3) and the
hypothetical passing floor (184.0) in the same test — a falsifiable pair, not
a one-sided claim.

### Spec Compliance Matrix

**`radial-spines/spec.md`** — 14 requirements / 32 scenarios

| Requirement | Scenarios | Test | Result |
|---|---|---|---|
| SpineConfig Shape and the Pure Fold Module | 2 | `spines.test.ts` "every export runs with no DOM"; `spineAim` reference tests | ✅ COMPLIANT |
| Anchors Derived From a Build-Time-Measured Silhouette | 4 | `spines.test.ts` determinism/spacing; `SpineLayer.test.tsx` stage-2 (rendered box ⇄ anchors, all 4 levels); live break-confirmed above | ✅ COMPLIANT |
| Measure 1 — Base Proximity | 4 | `spines.test.ts` measure-1 block (assign/outside/nearer/no-reassign) | ✅ COMPLIANT |
| Measure 2 — Outward Direction | 2 | `spines.test.ts` measure-2 block | ✅ COMPLIANT |
| Measure 3 — Straightness | 2 | `spines.test.ts` measure-3 block | ✅ COMPLIANT |
| Measure 4 — Chord Length Band | 2 | `spines.test.ts` measure-4 block | ✅ COMPLIANT |
| Measure 5 — No Body Crossing | 2 | `spines.test.ts` measure-5 block (`crossesBody`) | ✅ COMPLIANT |
| All Five Measures Jointly | 2 | `spines.test.ts` joint-measures block | ✅ COMPLIANT |
| spineScore Recomputes Purely From Settled List | 2 | `spines.test.ts` monotonicity + score-reproduces-live-fold | ✅ COMPLIANT |
| A Filled Anchor Never Unfills | 2 | `spines.test.ts` monotonicity; `LevelPlay.test.tsx` restart-clears-latch | ✅ COMPLIANT |
| A Rejected Stroke Is Not Punished | 2 | `spines.test.ts` rejected-stroke block | ✅ COMPLIANT |
| Reset Reseeds Through seedSpines, Never Bare EMPTY_SPINES | 2 | `LevelPlay.test.tsx` source-read count (3 sites); manual re-count confirms mount/`resetSurface`/`restartRun` | ✅ COMPLIANT |
| The Debug Flag Reaches the Screen's Rendered Output | 3 | `devMode.test.ts`; `LevelPlay.test.tsx` `traceCanvasProbe` marks **and** `completedStrokes` (`cc09c67`, 8 new tests) | ✅ COMPLIANT |
| No Fragment Reference Anywhere | 1 | `SpineLayer.test.tsx` no `url(#`/`<mask`/`<pattern`/`<clipPath`/`<defs`; `rg 'url(#' client/src` — zero new introductions | ✅ COMPLIANT |

**`level-engine/spec.md` (delta)** — 8 requirements / 20 scenarios

| Requirement | Scenarios | Test | Result |
|---|---|---|---|
| Optional `spines` Field Gates Free-Branch Scoring, Bit-Identical Fallback | 3 | `evaluateLevel.test.ts` hedgehog fixture; whole-catalog byte-identical assertion; `LevelKind` stays 2-valued | ✅ COMPLIANT |
| `levelStart` Learns `spines.origin` as Third Source | 2 | `buildLevel.test.ts` third-source block | ✅ COMPLIANT |
| Routeless Demo Segments (both blockers) | 3 | `buildLevel.test.ts` demo RED/GREEN pair (`target.demoPaths` **and** `demoPlays(level,'none')`), whole-catalog byte-identical invariant | ✅ COMPLIANT |
| Four Hedgehog Levels at Fixed Catalog Positions | 2 | `catalog.test.ts` `EXPECTED_IDS`; pose-per-level assertion | ✅ COMPLIANT |
| Tolerance/Length-Band Progression | 3 | `catalog.test.ts` hedgehog-family block (ladder monotonicity, phase-1 guard numbers on real geometry) | ✅ COMPLIANT |
| minAccuracy 70→80→90→100 | 2 | `catalog.test.ts` minAccuracy + fluency-not-punished assertions | ✅ COMPLIANT |
| `catalog.test.ts` Existing Guards Recognize the Family | 3 | All 8 named guards (`EXPECTED_IDS`, `CORRIDORS`/`FLUENCY`, minAccuracy exemption, free-census 17→21, tone/haptics, `levelsByPhase`, detective list) extended and green | ✅ COMPLIANT |
| Docs §6/§14 Checklist Coverage | 2 | `catalog.test.ts` hedgehog block asserts every field defined; no narrative-transition field exists | ✅ COMPLIANT |

**`trace-canvas/spec.md` (delta)** — 3 requirements / 9 scenarios

| Requirement | Scenarios | Test | Result |
|---|---|---|---|
| Spine Layer Renders Between Backdrop and Ink, No Fragment Reference | 4 | `TraceCanvas.test.tsx` spine-layer describe block (ordering, count, absence, no-`url(#`) | ✅ COMPLIANT |
| Hedgehog Row Inherits TORCH_CHALK, Asserted Against Night-Band Law | 3 | `backdrops.test.ts` `SPINE_BACKDROPS ink law` block (172.9/143.1 gaps, `INK_COLOR` falsifiability, no-new-token) | ✅ COMPLIANT |
| Body Interior Undrawable Under the Ink Law (why measure 5 excludes it) | 2 | `backdrops.test.ts` "TORCH_CHALK FAILS the body's brightest by 29.3" + "the floor is exact" (184.0) — read directly, both directions asserted | ✅ COMPLIANT |

**`zoo-map/spec.md` (delta)** — 5 requirements / 11 scenarios

| Requirement | Scenarios | Test | Result |
|---|---|---|---|
| Nocturna Gains Second Adventure + First Recovered Animal | 3 | `sectors.test.ts` 8-id exact list; unlock-unchanged; animal appears/absent on `hedgehog4` | ✅ COMPLIANT |
| AdventureId/ZooAnimalId Widen | 3 | `adventures.test.ts` hedgehog block (`animal:'erizo'`, no `closingBeat`, map-bubble phrase); `ZOO_ANIMAL_ART.erizo === HEDGEHOG_ART.profile` verified in source | ✅ COMPLIANT |
| Hedgehog Backdrop Resolves Through Adventure-Keyed Registry | 2 | `backdrops.test.ts` `backdropFor` resolution for all 4 hedgehog ids; row literals match `night` row | ✅ COMPLIANT |
| No New Backpack Item | 1 | `backpack.test.ts` new test: `hedgehog4` filed adds no `nocturna` item | ✅ COMPLIANT |
| Unlock Ladder Unchanged (`arena` off `night4`, not `hedgehog4`) | 2 | `sectors.test.ts` arena-unlock-off-night4 pair | ✅ COMPLIANT |

**Compliance summary**: 72/72 scenarios compliant across 30/30 requirements.

### Correctness (Static Evidence, Cross-Checked Against Source)

| Requirement (from task brief) | Status | Notes |
|---|---|---|
| Six §11.1 RED-confirmation assertions exist and are non-vacuous | ✅ Confirmed | Two spot-checked live this session (assertion 1's break-b, ink law's floor-pair); the other four verified by direct source/test reading and cross-referenced against `apply-progress.md`'s own recorded break-and-restore numbers, which match design's algebra exactly |
| Ink law: `TORCH_CHALK` resolved for hedgehog row, separated from night band and body's `brightest`, "spine over body undrawable" ships as test | ✅ Confirmed | `zoo/backdrops.ts` hedgehog row = night's `ink`/`inkDim` verbatim; `backdrops.test.ts` asserts both directions with exact measured numbers |
| Five §9 open questions stay OPEN | ✅ Confirmed | No `184.0`/`mute()` literal outside test files; `ZOO_ANIMAL_ART.erizo` still resolves to spineless profile art with the gap comment intact; `BACKPACK_ITEMS` has no new `nocturna` row; `tasks.md` 12.3 is the recorded guard |
| `restartRun`'s bare `EMPTY_WAYPOINTS` left unrepaired, recorded not fixed | ✅ Confirmed | `LevelPlay.tsx:1216-1224`, comment names it explicitly as a found, latent, unreachable-today bug; spines reset correctly through `initialSpineState` alongside it |
| Two append disciplines (`catalog.ts` mid-phase-1, `adventures.ts` absolute end) | ✅ Confirmed | `hedgehog1..4` sit inside the `PHASE_1` array after `dolphin4`; `f2-guirnalda` is the first row of the separately-concatenated `PHASE_2` array; `ADVENTURES`' hedgehog row is the literal last entry before the array closes |
| No `url(#` introduced anywhere in `client/src` | ✅ Confirmed | `rg 'url\(#' client/src` — every hit is a comment/test/`.not.toContain` assertion; zero live `fill="url(#..."` usage |
| Reset coverage: spines re-seeded at all 3 sites, always through the seeded initialiser | ✅ Confirmed | Mount (`useRef` initializer), `resetSurface`, `restartRun` — all three call `initialSpineState(level.spines, debugSearch)`, which itself wraps `seedSpines`; none assigns bare `EMPTY_SPINES` |
| `?debug=espinas:<k>` draws the ink, not only the marks (`cc09c67`) | ✅ Confirmed | `spineSegments` factored as the single anchor→tip source for both `spineDemoPaths` and `debugSpineStrokes`; `LevelPlay.tsx` rides `spineDebugStrokes` as extra `completedStrokes` entries; 8 new tests, RED-confirmed by unwiring (+3→+0) |
| `hedgehog1` proportion finding (180 vs 220, factor 2.8) accurately recorded, not silently retuned | ✅ Confirmed | `docs/13` amendment 10 states the exact numbers (180 admissible minimum, horizontal clause binding, 0.69·H vs 0.25·H, factor 2.8, 740-unit compensation); catalog literal stays at `lenMin: 220` — no silent change |

### Coherence (Design)

| Decision | Followed? | Notes |
|---|---|---|
| D1 — live/settled fold split (`spineAim`/`spineSettle`) | ✅ Yes | `spineAim` carries only `aiming`; `spineScore` reads only settled strokes |
| D2 — anchors derived from measured build-time table | ✅ Yes | `HEDGEHOG_SILHOUETTE` transcribed verbatim from §10; `spineAnchors` reads it, never a hand-typed coordinate |
| D3 — demo split, both blockers repaired | ✅ Yes | `demoPaths`/`demoPlays` both present; the contradiction between design's two statements on `demoPlays`'s formula was found and resolved during apply (recorded as a deviation, not hidden) and is itself now recorded in amendment 10 |
| D4 — mark tangency (`A_i + SPINE_MARK_R·n̂_i`) | ✅ Yes | `spineMarks` implements exactly this; asserted in `SpineLayer.test.tsx` | 
| D5 — `baseRadius` ceiling/floor | ✅ Yes, with a stated deviation | `apply-progress.md` records that the *test* uses the real neighbour-chord distance rather than the circle-formula estimate, because that is what "nearest unfilled anchor" ambiguity actually depends on; margins reproduce design's declared 3.5/2.9/1.1/1.5. Recorded, not silent |
| D6 — catalog placement / unlock ladder unchanged | ✅ Yes | Confirmed by direct source read of `PHASE_1`/`PHASE_2` concatenation and `isUnlocked` re-grep (Phase 12.1) |
| §11.1 six RED confirmations | ✅ Yes | All six executed per `apply-progress.md`; one (assertion 1, break-b) re-verified live this session with matching numbers |

### Issues Found

**CRITICAL**: None

**WARNING**: None. Two items are pre-existing/self-flagged design tensions carried forward honestly, not defects:
1. `hedgehog1`'s spine-to-body ratio (0.98) reads as antennae rather than spines — an author-decision tension between "amplitud del brazo entero" (stage 1 pedagogy) and "se ve como un erizo," explicitly recorded in amendment 10 with the exact incompatible numbers (factor 2.8) and correctly left unresolved for the author, per the task's own instruction not to treat this as a blocker.
2. The unfilled mark clears `night.brightest` by only 0.8 luma units — recorded as a risk in both `design.md` §2 D4 and `backdrops.test.ts`'s own test name, and confirmed legible-but-thin in the capture read-back (`apply-progress.md` §"What the captures showed").

**SUGGESTION**:
1. `docs/referencias/erizo-cuatro-fases.jpeg`'s Etapa 1 crossing-stroke tension (proposal Decision 1) and the "luma jump vs. tone gain" earning-color question (design §9 item 1) remain open per design — no action needed now, flagged only as forward context for whoever eventually revisits `hedgehog1`'s proportions or the earning-color palette.

### Verdict

**PASS**

30/30 requirements and 72/72 scenarios across the four spec files map to real,
passing tests. The full suite (79 files / 1841 tests) and the build are green
under a raised, unambiguous timeout with low host load (`/proc/loadavg` 2.53).
One of the six mandatory RED-confirmation assertions was independently
re-executed live this session and reproduced the exact recorded break
signature (40-unit discrepancy), confirming it is not vacuous. The ink-law
undrawability, the five open §9 questions, the `restartRun` unrepaired defect,
both append disciplines, the zero-`url(#`-introduced guarantee, and the
three-site reset coverage were all independently confirmed against source,
not merely trusted from `apply-progress.md`. The known, accepted, documented
`hedgehog1` proportion finding is recorded accurately in `docs/13` amendment
10 and is not contradicted by any shipped assertion. No critical or warning
findings block archive.
