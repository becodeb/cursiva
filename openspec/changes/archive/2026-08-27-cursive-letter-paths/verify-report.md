```yaml
schema: gentle-ai.verify-result/v1
evidence_revision: sha256:0c7f72118fcd216ec83a87a4adc20669bf82ddb0a0a6d66e23f45ee9a645a2ae
verdict: pass
blockers: 0
critical_findings: 0
requirements: 6/6
scenarios: 12/12
test_command: npm test -w client
test_exit_code: 0
test_output_hash: sha256:d6b6f736d213d7328526583a55b3c9206886c1797f3458755b5d0e734de56c70
build_command: npm run build -w client
build_exit_code: 0
build_output_hash: sha256:f296cd9a83a1de19c16d392d5d6c11e5bd781ca010b18e2a27dd957b5d2605c7
```

## Verification Report

**Change**: cursive-letter-paths
**Version**: delta spec `openspec/changes/cursive-letter-paths/specs/letter-model/spec.md` (1 ADDED block of 5 requirements + 1 MODIFIED requirement; 12 scenarios)
**Mode**: Standard (strict_tdd: false per `openspec/config.yaml`)
**Commit verified**: `c4e1c4d` (Phases 1–3: T1.1–T3.1; 574 insertions / 128 deletions across 10 files)
**Artifact mode**: openspec (filesystem only)

### Completeness

| Metric | Value |
|--------|-------|
| Tasks total | 8 (T1.1–T3.1, T4.1, T4.2) |
| Tasks complete (sdd-apply scope) | 6/6 (T1.1–T3.1) |
| Tasks incomplete | 2 — T4.1/T4.2 USER-GATED (hand-drawn SVGs b…z; NOT sdd-apply scope) |
| Phase 4 classification | KNOWN PENDING USER ACTION — not a defect (see note) |

### Build & Tests Execution

**Build**: ✅ Passed
```text
npm run build -w client
→ tsc --noEmit && vite build: ✓ 443 modules transformed, built in 766ms (exit 0)
build_output_hash: sha256:f296cd9a83a1de19c16d392d5d6c11e5bd781ca010b18e2a27dd957b5d2605c7
```

**Tests**: ✅ 135 passed (135) / 14 files — matches the apply claim exactly (135 / 14)
```text
npm test -w client
→ vitest run (v4.1.11): Test Files 14 passed (14), Tests 135 passed (135), 2.96s (exit 0)
test_output_hash: sha256:d6b6f736d213d7328526583a55b3c9206886c1797f3458755b5d0e734de56c70
```

**Coverage**: ➖ Not available (coverage_threshold: 0; no coverage run configured)

### Spec Compliance Matrix

| # | Requirement | Scenario | Test | Result |
|---|-------------|----------|------|--------|
| R1 | Entry/Exit Anchor Metadata | Default baseline-right exit | `svgLetter.test.ts > zones and anchors > "exit anchor: a ≈ bottom-right, o ≈ top-right, e ≈ mid-right of the main span"` (a exit ≈ (maxX, maxY) of MAIN span); `anchor-aware diagnostics > "the 'i' dot jump … exit.y ≈ BASELINE_Y"` | ✅ COMPLIANT |
| R1 | Entry/Exit Anchor Metadata | Top and mid exits | `zones and anchors > "exit anchor a/o/e"` (o ≈ top-right, e ≈ mid-right); `zones and anchors > "exitKindFor maps o r v w → top, e → mid"`; static: EXIT_BY_CHAR in anchors.ts | ✅ COMPLIANT |
| R2 | Multi-Subpath Classification | Pen-lift stroke drawn after the body | `classifySubpaths/reorderForWriting > "classifies the body as MAIN for a dot-first 'i': body first, dot after"` (order [1,0]; body start leads, dot pen-lift last) | ✅ COMPLIANT |
| R2 | Multi-Subpath Classification | Tie-break by length, then file order | `> "breaks an entry-distance tie by LONGER polyline"` + `> "breaks an equal-length tie by FILE ORDER"` (order [0,1]) | ✅ COMPLIANT |
| R2 | Multi-Subpath Classification | Only the first `<path>` element is read | `extractPathD > "takes the first path even when nested in <g>"` (M1 1 L2 2 wins over M9 9); pipeline reads `flat.starts` of that single `d` | ✅ COMPLIANT |
| R3 | Anchor-Aware Diagnostics | No false warning for top/mid exits | `anchor-aware diagnostics > "o r v w ending at top-right do NOT warn"` + `> "e ending at mid-right does NOT warn"` (console.warn spy: zero calls) | ✅ COMPLIANT |
| R3 | Anchor-Aware Diagnostics | Genuinely wrong end still warns | `> "a ending at TOP-right corner still warns"` (message `no termina cerca del extremo`); `> "a wrong start warns"` (message `no arranca cerca del extremo`) | ✅ COMPLIANT |
| R4 | Ruled-Line Zone Map | `t` is an ascender | `letter zones > "classifies media/alta/baja/mixta"` (t→alta); `zones and anchors > "'t' resolves to the alta (ascender) zone"`; static: ALTA_CHARS `'bdfhklt'` | ✅ COMPLIANT |
| R4 | Ruled-Line Zone Map | Media set unchanged | `letter zones > "LETTER_ZONES is the union of the zone char groups"` (`aceimnorsuvwxz` → media, `gpqy` → baja, `j` → mixta); `zones and anchors > "the media zone set is unchanged except t"` | ✅ COMPLIANT |
| R5 | Lowercase-Only Scope | Uppercase imposes no contract | Static (no uppercase/digit requirements in delta spec); defaults tested: `resolveBaselineZone('Z') → 'media'`, `exitKindFor('O') → 'top'` (case-insensitive); `registry.test > "throws a descriptive error for unregistered chars"` | ✅ COMPLIANT |
| R6 | Path–Checkpoint Consistency (MODIFIED) | Sampled ductus preserves order | `generateCheckpoints > "produces strictly increasing orders 1..N"` + `"spaces checkpoints uniformly in ARC LENGTH (±1%)"`; `buildLetterConfig > "orders checkpoints 1..N"` (order 1..N, unique) | ✅ COMPLIANT |
| R6 | Path–Checkpoint Consistency (MODIFIED) | Area cloud drives scoring | `buildLetterConfig > "emits ~1800 ideal points with a ±8px perpendicular band"` (1620–1980); `canvas/validation/score.test.ts` min-distance cloud scoring suite (pre-existing, green: score = min over ideal cloud points) | ✅ COMPLIANT |

**Compliance summary**: 12/12 scenarios compliant (all with passing covering tests; R5 via static spec/scope inspection + default-path tests).

### Correctness (Static Evidence)

| Requirement | Status | Notes |
|------------|--------|-------|
| R1 Anchors | ✅ Implemented | `types.ts` `LetterAnchors { entry, exit }` REQUIRED on LetterConfig; `anchors.ts` `ExitKind`/`EXIT_BY_CHAR`/`exitKindFor`; `buildLetterConfig` populates entry = fitted MAIN start, exit = `pointAtArcLength(fitted, mainEndArc * scaleX)` (design AD1/AD4); seeds `letra_a.ts`/`letra_c.ts` and synthetic fixtures (modes.test.ts:32, devCheckpointState.test.ts:19) carry anchors |
| R2 Multi-subpath | ✅ Implemented | `classifySubpaths` (main = nearest bbox bottom-left proxy (minX, maxY); ties → longer arc; then file order — exact design algorithm); `reorderForWriting` concatenates main-first, never reverses, reports `hasGaps`, returns `mainEndArc`; `extractPathD` first-`<path>` regex; `mainSpanEndIndex` keeps secondary strokes out of the exit corner |
| R3 Diagnostics | ✅ Implemented | Entry check vs MAIN span bottom-left; end vs exit corner per kind (baseline/maxY, top/minY, mid/midY), 80px tolerance; gap-warn suppressed for `SECONDARY_STROKE_CHARS` (i j t f x); single-subpath gap-warn regression test (line 476) still green |
| R4 Zone map | ✅ Implemented | `MEDIA_CHARS='aceimnorsuvwxz'`, `ALTA_CHARS='bdfhklt'` (t moved media→alta), `BAJA_CHARS='gpqy'`, `j`→mixta; `LETTER_ZONES`/`resolveBaselineZone` |
| R5 Lowercase scope | ✅ Implemented | No uppercase/digit requirements in delta; unknowns default to media/baseline; registry presence-based (`toContain`) not exact-26 |
| R6 Ductus model | ✅ Implemented | `d` = normalized authored centerline (reordered + fitted polyline); `guideD: undefined` (tested); `ideal` = 600-sample centerline + ±8px perpendicular band (~1800 pts); `checkpoints` uniform in arc length, order 1..N (N = clamp(round(L/90), 6, 12), radius [35,60]); NO font extraction in `svgLetter.ts` (grep: zero Kalam/OpenType/font references; only required `extractPathD` SVG-d reader) |

### Coherence (Design)

| Decision | Followed? | Notes |
|----------|-----------|-------|
| AD1 `LetterConfig.anchors: LetterAnchors` REQUIRED, built from fitted main start/end | ✅ Yes | types.ts + buildLetterConfig (entry/exit) |
| AD2 new `anchors.ts` module | ✅ Yes | 40-line module, exported pure metadata |
| AD3 classification inside `reorderForWriting`, exported pure `classifySubpaths` | ✅ Yes | both exported; direct unit tests |
| AD4 bbox bottom-left proxy `(minX, maxY)`; `mainEndArc` survives fit (`endArc * scaleX`) | ✅ Yes | exact algorithm in classifySubpaths + buildLetterConfig line 723 |
| AD5 gap-warn suppressed for declared secondaries | ✅ Yes | `SECONDARY_STROKE_CHARS.has(character)` guard |
| AD6 MAIN bbox + exit kind corners, 80px tolerance | ✅ Yes | main-span corners mapped through affine fit; kind selects corner |
| AD7 full concatenation, no marker info | ✅ Yes | all subpath points concatenated main-first |
| AD8 `MEDIA_CHARS` drops t, `ALTA_CHARS` gains it | ✅ Yes | const move; tests updated (line 127 union loop, README) |

### Phase 4 — Known Pending User Action (NOT a defect)

- **T4.1** (25 SVGs b…z): only `a.svg` exists in `client/src/letters/svg/` — expected; the user hand-draws the rest next.
- **Authoring contract** (T3.1 README) verified complete: 26-letter entry/exit anchor table (incl. f↔Zaner-Bloser note, o/r/v/w top-right, e mid-right); zone map with t→alta; one-`<path>` element rule + "only the `d` matters"; Ctrl+K (Inkscape) / flatten-combine (Figma); main stroke first, pen-lift secondaries after; x first-diagonal rule; 80px warning tolerance documented.
- **No hard pipeline dependency on missing SVGs**: eager Vite glob yields `{}` → registry falls back to Kalam seeds (`registry.ts` spread); all assertions presence-based (`toContain`, `Object.keys(letters)`), no exact-26 count anywhere (registry.test.ts rewritten from exact-keys `toEqual(['a','c'])` per T2.2).
- **T4.2** (x ductus / f exit / a compliance cross-check) runs in a follow-up verify once the letters are authored; the x second-diagonal ductus is validated against the first real `x.svg` at that point.

When the user drops b…z.svg, `npm test -w client` must stay green (classification/diagnostics suites use synthetic fixtures + real a.svg only) and the letters will load + normalize automatically.

### Issues Found

**CRITICAL**: None
**WARNING**: None (Phase 4 is a declared user-gated pending action, per launch scope)
**SUGGESTION**:
1. Stale Kalam references linger in legacy seed headers/comments (`letra_a.ts`, `letra_c.ts`, `ideal_a.ts`, `ideal_c.ts` — "Paths extracted from Kalam-Regular") and in `canvas/validation/constants.ts` + `validation/score.ts` ("the ideal is the REAL glyph AREA (Kalam-derived point cloud)"). They describe the fallback seed DATA, not the pipeline (grep-confirmed: `svgLetter.ts` has zero font-extraction), but the validation comments now misdescribe pipeline-generated ideal clouds. A small doc-comment cleanup can ride a later change.
2. `f` exit (baseline-right with Zaner-Bloser asterisk) is documented but only verifiable against the authored `f.svg` — covered by T4.2.

### Verdict

PASS — 6/6 requirements, 12/12 scenarios compliant with passing runtime evidence; tests 135/135 and build green on commit `c4e1c4d`; Phase 4 remains a declared user-gated pending action, not a defect.

*Report bytes validated with `gentle-ai sdd-verify-validate --input … --requirements 6 --scenarios 12` (gentle-ai 2.4.0) before persistence.*