```yaml
schema: gentle-ai.verify-result/v1
evidence_revision: sha256:e8101dcac6b7d664841a14ec0d6604bf6d728959761eb38c78fc51394bd7d0ef
verdict: pass_with_warnings
blockers: 0
critical_findings: 0
requirements: 12/12
scenarios: 29/29
test_command: npm test
test_exit_code: 0
test_output_hash: sha256:5ea9580a77df64872e4ff946ce5d56db7a914071cfb572decfaf54847981cadd
build_command: npm run build
build_exit_code: 0
build_output_hash: sha256:dcc47fb8f15aa1cdd6481283e1eb5bf73b5bcc47f89c8a1d93d1e97204c6d496
```

## Verification Report

**Change**: case-registry-and-captions
**Version**: N/A (openspec spec-driven, no semver)
**Mode**: Standard (`openspec/config.yaml testing.strict_tdd: false`)

### Completeness
| Metric | Value |
|--------|-------|
| Tasks total | 69 |
| Tasks complete | 69 |
| Tasks incomplete | 0 |

### Build & Tests Execution

**Build**: PASSED
```text
$ npm run build
> cursiva@0.1.0 build
> npm run build -w client
> @cursiva/client@0.1.0 build
> tsc --noEmit && vite build

vite v8.2.2 building client environment for production...
✓ 509 modules transformed.
dist/index.html                  1.89 kB │ gzip:   1.02 kB
dist/assets/index-CmhYCORT.js  790.08 kB │ gzip: 165.59 kB
✓ built in 413ms
Exit code: 0
```
Note: per this repo's own known TS7 quirk (`openspec/config.yaml`), bare `tsc --noEmit` was never run standalone as the reported final result — `npm run build` (which runs `tsc --noEmit && vite build` as one pipeline) was used throughout, matching `openspec/config.yaml`'s explicit instruction.

**Tests**: 1042 passed / 0 failed / 0 skipped (57 files)
```text
$ npm test
> cursiva@0.1.0 test
> npm run test -w client
> @cursiva/client@0.1.0 test
> vitest run

 RUN  v4.1.11 /home/opencode/projects/cursiva/client
 Test Files  57 passed (57)
      Tests  1042 passed (1042)
   Duration  17.74s
Exit code: 0
```
Matches the claimed 1042 tests / 57 files exactly — measured independently, not trusted from apply-progress.md.

**Coverage**: Not configured (`openspec/config.yaml verify.coverage_threshold: 0`) → Not available

### Spec Compliance Matrix

Counted directly from the four delta spec files under `openspec/changes/case-registry-and-captions/specs/`: **12 requirements, 29 scenarios** (detective-mode: 7 req / 15 scen; level-engine: 2 req / 6 scen; trace-canvas: 1 req / 3 scen; main-screen: 2 req / 5 scen).

| Requirement | Scenario | Test | Result |
|-------------|----------|------|--------|
| Case Registry Data Shape | Culprit is only unruled option | `cases.test.ts` (iterates `DETECTIVE_CASES`) | ✅ COMPLIANT |
| Case Registry Data Shape | Same animal, different verdicts across cases | `cases.test.ts` | ✅ COMPLIANT |
| Case Registry Data Shape | No clue kind double-rules within a case | `cases.test.ts` | ✅ COMPLIANT |
| Duck Case | Duck deduction renders exactly 3 captioned options | `Deduction.test.tsx` (`describe.each` over cases) | ✅ COMPLIANT |
| Captioned Art Invariant | A caption cannot compile without its image | `CaptionedArt.test.tsx` `@ts-expect-error`, enforced by `npm run build` — independently re-verified: temporarily removed the suppression in a sibling proof pattern (`GameScreen.test.tsx`'s `onExit` case, same mechanism) and confirmed `tsc` fails; vitest alone cannot see it | ✅ COMPLIANT |
| Captioned Art Invariant | Every rendered word has an image | `captionAudit.test.tsx` (4 hand-built rows) + `HomeScreen/App/PistasRail/LevelPlay/Deduction .test.tsx` audits | ✅ COMPLIANT — falsifiability independently reproduced (see Correctness §1 below) |
| Per-Case Clue Colour Distinctness | Duck case's 4 earned colours pairwise distinct | `palette.test.ts` (re-scoped, iterates `DETECTIVE_CASES`) | ✅ COMPLIANT |
| Per-Case Clue Colour Distinctness | Two cases may share a token (`webfoot`/`footprint` both `PRINT`) | `palette.test.ts` | ✅ COMPLIANT |
| Case-Solved Persistence | Solving duck case persists (`isFiled('duck-deduce')`) | `Deduction.test.tsx`, `caseState.test.ts` | ✅ COMPLIANT |
| Case-Solved Persistence | Unresolved case has no record | `Deduction.test.tsx` | ✅ COMPLIANT |
| Case Routing Across Multiple Cases | Open duck deduction not skipped | `caseState.test.ts` | ✅ COMPLIANT |
| Case Routing Across Multiple Cases | Resolved case advances to next | `caseState.test.ts` | ✅ COMPLIANT |
| Deduction Screen (MODIFIED) | All clues collected reaches deduction, `case.options.length` choices | `Deduction.test.tsx` | ✅ COMPLIANT |
| Deduction Screen (MODIFIED) | Correct pick closes the case | `Deduction.test.tsx` | ✅ COMPLIANT |
| Deduction Screen (MODIFIED) | Wrong pick free and retryable | `Deduction.test.tsx` | ✅ COMPLIANT |
| Duck Trail Set Precedes trail1 | Corridor width strictly decreases 100→90→80→70 | `catalog.test.ts` | ✅ COMPLIANT — verified directly in `catalog.ts` |
| Duck Trail Set Precedes trail1 | No duck trail carries a timed obstacle | `catalog.test.ts` (`:284` "hazards on exactly trail 1" guard) | ✅ COMPLIANT — verified directly (only `trail1` has `obstacles`) |
| Duck Trail Set Precedes trail1 | duck-trail4 clears corner/arm guards | `catalog.test.ts` (`duck-trail4` clearance case) | ✅ COMPLIANT |
| Duck Case Positional-Unlock Migration | Mid-hen-campaign payload loses no unlock | `migrateDuckCase.test.ts` ("keeps every unlock") | ✅ COMPLIANT |
| Duck Case Positional-Unlock Migration | Migration returns only changed entries | `migrateDuckCase.test.ts` | ✅ COMPLIANT |
| Duck Case Positional-Unlock Migration | Migration never deletes | `migrateDuckCase.test.ts` | ✅ COMPLIANT |
| Carrier Art Placement via placeArt() | Declared grip lands on target point | `placeArt.test.ts` | ✅ COMPLIANT — arithmetic independently recomputed by hand (see Correctness §2) |
| Carrier Art Placement via placeArt() | No grip defaults to box centre | `placeArt.test.ts` | ✅ COMPLIANT |
| Carrier Art Placement via placeArt() | TraceCanvas renders carrier via placeArt's output | `TraceCanvas.test.tsx` | ✅ COMPLIANT |
| Exit Returns to Home Office | Omitting onExit is a type error | `GameScreen.test.tsx` `@ts-expect-error`, `npm run build` | ✅ COMPLIANT |
| Exit Returns to Home Office | Trail's back control calls onExit | `GameScreen.test.tsx` / code inspection (`onBack={onExit}`) | ✅ COMPLIANT |
| Exit Returns to Home Office | Deduction's back control calls onExit | `GameScreen.test.tsx` / code inspection (`onExit={onExit}`) | ✅ COMPLIANT |
| Level Map Is a Development-Gated Route | Ordinary exit never resolves to map | `App.test.tsx`, `GameScreen.test.tsx` (`initialView` dev-gate cases) | ✅ COMPLIANT |
| Level Map Is a Development-Gated Route | Dev-gated map still owns reset/test mode | `GameScreen.test.tsx` | ✅ COMPLIANT |

**Compliance summary**: 29/29 scenarios compliant.

### Correctness (Independent Adversarial Verification)

| # | Claim checked | Method | Result |
|---|---|---|---|
| 1 | Caption audit requires the container to *itself* carry `<image href>`, not merely be named | Read `captionAudit.ts` + `captionAudit.test.tsx` (rows "no image still fails"); then broke `HomeScreen.tsx` live by inserting `<span>VERIFY_DEFECT_PROBE</span>` as a direct child of `<main className="cv-home">`, ran `npx vitest run src/screen/HomeScreen.test.tsx` | ✅ Went RED on exactly 2/14 tests (`shows no text whatsoever`, `every word... carries its own image`) with the expected assertion diffs; reverted the injection (`git checkout --`), re-ran — 14/14 GREEN, `git diff --stat` empty. The invariant can fail. |
| 2 | Lens-fix arithmetic: old offset (+10.07, −11.34), new offset exactly (0, 0) | Recomputed by hand from `CARRIER_LENS_ART` (`w:361, h:384, grip:[0.603,0.391]`) and `CARRIER_ART_SIZE = 104`: `width = 104×361/384 = 97.7708…`. Old (bbox-centred) box `x=-48.8854…, y=-52` → grip point `= -48.8854+0.603×97.7708 = 10.070`, `= -52+0.391×104 = -11.336`. New box `x=-58.9558…, y=-40.664` → grip point `= -58.9558+58.9558 = 0.000`, `= -40.664+40.664 = 0.000` | ✅ Independently reproduced the exact apply-progress.md figures |
| 3 | Exactly one implementation of the placement fix | `rg -n "placeArt"` across `client/src` | ✅ One function (`client/src/canvas/placeArt.ts`), two call sites (`TraceCanvas.tsx:1274`, `HomeScreen.tsx:180`); `home/modes.ts` no longer declares its own grip/offset logic |
| 4 | No module imports a global `CULPRIT` or reads `ANIMAL_ART.ruledOutBy` | `rg -n "CULPRIT\b"` (zero matches) and `rg -n "ruledOutBy"` (all hits are on `DetectiveCase.ruledOutBy`, comments about the removal, or `Deduction.tsx`'s `kase.ruledOutBy[id]`) | ✅ `ANIMAL_ART` is `Readonly<Record<AnimalId, ArtImage>>` — no `ruledOutBy` field |
| 5 | Structural deduction tests iterate `DETECTIVE_CASES`, not one hardcoded case | Read `cases.test.ts` in full | ✅ All 5 describe blocks use `for (const kase of DETECTIVE_CASES)` |
| 6 | `migrateDuckCase` is idempotent, copy-forward, deletes nothing, seeds `duck-deduce`, mid-campaign payload undemoted | Read `migrateDuckCase.ts` + `migrateDuckCase.test.ts` in full | ✅ Guard is `!source \|\| approvals < threshold → {}`; second guard blocks re-seed if any of the 4 trail ids OR `DUCK_CASE_SOLVED_ID` exists; `seedFrom` uses `Math.max`/sum only, never deletion; "mid-hen-campaign" test asserts `trail1/2/3` are absent from the returned diff (untouched, no demotion) and `structuredClone` snapshot equality proves no mutation |
| 7 | Duck trails precede `trail1`, widths 100→70, none has a timed obstacle, `duck-trail3` is a switchback not a garland | Read `catalog.ts:216-333` directly | ✅ Four `LevelConfig`s at lines 217/246/265/308, corridor widths 100/90/80/70, no `obstacles` field on any (only `trail1` at line 348 has one); `duck-trail3` (line 296) is `switchback({...})`, matching the recorded orchestrator correction — NOT `garland` |
| 8 | No new `url(#` reference | `rg -n "url\(#"` across `client/src` | ✅ Zero occurrences in production code (all hits are in comments recording the *ban*, or in tests asserting its absence — all passing) |
| 9 | `WITHDRAWAL_FROM_PHASE` and the ruled/blank split reach the same levels after the Fase→Nivel reterm | `rg -n "WITHDRAWAL_FROM_PHASE"` in `LevelPlay.tsx` | ✅ Still `= 3` at line 503, used unchanged at line 507; docs reterm is prose-only as designed |

### Design Coherence
| Decision | Followed? | Notes |
|----------|-----------|-------|
| D1 — No timed obstacle on any duck trail | ✅ Yes | Verified directly in `catalog.ts`; `catalog.test.ts:284` guard still green |
| D2 — Case-solved state persists as `<caseId>-deduce` | ✅ Yes | `caseSolvedId()`, `DUCK_CASE_SOLVED_ID`, both migration and live writer use the same literal shape |
| D3 — Level map is dev-gated | ✅ Yes | `initialView(search, dev)`; `?nivel=mapa` only resolves under `isDevMode()` |
| D4 — Migration's accepted cost recorded | ✅ Yes | `migrateDuckCase` seeds all 4 duck ids + `duck-deduce`; orchestrator ruling 4 closed the gap that would have routed a migrated child into a blind deduction |
| D5 — `webfoot` reuses `PRINT` token | ✅ Yes | `palette.ts`; distinctness re-scoped per case in `palette.test.ts` |
| §1 case registry derives clue kinds, doesn't restate | ✅ Yes | `clueKindsOf(kase)` reads `getLevel(id).clue` |
| §7 `placeArt()` structural, no `detective/` import in `canvas/` | ✅ Yes | Confirmed — `placeArt.ts` takes `{w,h,grip?}`, no import from `detective/` |
| §3 duck trail generator/amplitude table | ⚠️ Stale in design.md | See WARNING below — shipped code deviates from design.md's literal worked table (deliberately, and recorded in apply-progress.md and inline code comments), but design.md §3 itself was never corrected in place the way §6 was |

### Issues Found

**CRITICAL**: None.

**WARNING**:
1. **Spec/design text names a generator the shipped code does not use, for `duck-trail3`.** `openspec/changes/case-registry-and-captions/specs/level-engine/spec.md`'s "Duck Trail Set Precedes trail1" requirement states the four trails use "generators `wave(140,1)`, `wave(170,2)`, `garland(3)`, `squareWave(140,200,3)`" — but the shipped `catalog.ts` uses `wave(170,1)` (not 140), `switchback` (not `garland`) for `duck-trail3`, and `squareWave` with `amplitude:170` (not 140) for `duck-trail4`. This is a real, deliberate, well-reasoned deviation (a garland is Nivel 3's signature shape per the directive, and the literal design numbers failed a pre-existing "phase 1 uses the whole blank sheet" guard) — apply-progress.md documents it in detail and `catalog.ts` carries inline comments at each site, and all three of the requirement's actual falsifiable scenarios (corridor-width monotonicity, no-timed-obstacle, `duck-trail4` clearance) remain compliant regardless of the exact generator identity. But unlike `design.md` §6 (which carries an explicit `[Corrected 2026-09-12 — orchestrator ruling 4]` marker), neither the spec delta text nor `design.md` §3's table was corrected in place — the spec now describes a fact about the implementation that is false. Recommend correcting `specs/level-engine/spec.md`'s requirement text and `design.md` §3's table before archive, so `openspec/specs/level-engine/` does not inherit a wrong claim when this change merges.
2. **`proposal.md`'s Success Criteria checkboxes are all unchecked**, despite every one being demonstrably met by the evidence gathered in this verification pass (case registry, structural tests, caption type-error, duck trail widths/clearance, case-solved persistence, migration safety, `placeArt` centring, exit-to-office routing, docs/D6 correction, green suite, screenshot checks). Cosmetic, but an artifact-trail hygiene gap worth closing before archive.

**SUGGESTION**:
1. Known pre-existing/out-of-scope items are correctly recorded in `apply-progress.md` and were confirmed, not re-litigated, in this pass: `duck-trail4`'s start carrier clipped by the left edge (identical to the shipped hen `trail4` on `main`), the deduction screen's residual empty vertical space (reduced, not eliminated), and the app still rendering "Fase N" while docs say "Nivel N" (intentional, temporary — `Phase` type untouched, confirmed unchanged at `LevelPlay.tsx:503`).
2. `design.md`'s §3 worked-arithmetic table (`cornerClearance`/`armClearance` computed against `amplitude:140`) is now a stale illustration of a conclusion that still holds at the shipped `amplitude:170` — not misleading about the *result*, but a reader deriving the numbers themselves from the doc would get a different geometry than what shipped.

### Verdict
**PASS WITH WARNINGS**
All 69/69 tasks complete, both 12/12 requirements and 29/29 scenarios compliant with real passing tests (measured independently: 1042/1042 tests, 57/57 files, build green), and all seven adversarial checks requested by the orchestrator held up under direct inspection and one live break/restore. The two WARNINGs are documentation-drift items (a spec/design table describing a generator the shipped code deliberately no longer uses, and unchecked-but-satisfied proposal checkboxes) that do not affect scenario compliance, runtime behavior, or the caption/lens/migration/routing invariants this change exists to ship — recommended to fix before archive but not blocking.
---

## Evidence Refresh — 2026-09-12 (post-drift re-verification)

The tree moved substantially after the report above was written and admitted (`evidence_revision: sha256:467fa17...`). This section re-runs the evidence at the current HEAD (`c5abfd0`, 20 commits ahead of `main`) and records what changed. The original prose above is left untouched; nothing in it was found to be wrong, only stale in evidence hashes and in the two items below.

### What drifted, all already committed on this branch

1. **This change's own orchestrator fixes**: `1f378e4` (BREADCRUMB `#994138`→`#a9682c`, `palette.test.ts`'s GOAL_COLOR-hue rule replaced with a ground-luma-separation rule), `aa6e4c2` (`Deduction.tsx` lineup CSS grows into the sheet, +89/-11 lines), `8ee8957` (withdrew the false "clipped start carrier" claim from `apply-progress.md`).
2. **`627cc0e`** archived `detective-mode` and promoted its three delta specs into `openspec/specs/` (8→10 specs). This change's four delta specs now sit against a real baseline for `detective-mode`, `level-engine`, `main-screen`, and `trace-canvas` for the first time.
3. **A concurrent, out-of-scope session** landed art-direction work on the same branch: `6e6fee2`, `23dd58b`, `c5abfd0` — introduced `ART_OUTLINE`, reworked `groundScatter.ts`, added `artHierarchy.test.ts`, and, in `c5abfd0`, inverted `palette.test.ts`'s drained-clue rule (`CLUE_DRAINED` `#c8cdd2`→`#838383`; the file used to assert the drained grey stays BELOW the ground-contrast floor, now asserts it must clear a HIGHER floor than the earned colours).

**Correction to the launch brief**: the "~100 lines added to `Deduction.tsx`" attributed to the concurrent session actually belongs to `aa6e4c2` (item 1, this change's own fix) — `git show --stat` on all three concurrent-session commits confirms none of them touch `client/src/screen/Deduction.tsx`. Re-attributing this before it gets copied forward as fact.

### Re-checked against the drift

- **Five files this change's core invariants depend on — `cases.ts`, `CaptionedArt.tsx`, `captionAudit.ts`, `catalog.ts`, `migrateDuckCase.ts` — are untouched across the entire `1f378e4^..c5abfd0` range** (`git diff --stat` on all five returns empty). The case registry, caption audit, duck-trail catalog entries, and migration are exactly as verified in the report above; the drift did not reach them.
- **`placeArt()` single-implementation invariant still holds.** `6e6fee2` added `clampArtBox` alongside it, but `clampArtBox` clamps an already-placed box against sheet bounds — it does not compute a placement — so the spec's "the single pure exported function computing where carrier/lens art is drawn" is not violated. All four call sites (`TraceCanvas.tsx:1066,1107,1284`, `HomeScreen.tsx:180`) still route through `placeArt` alone.
- **The `CLUE_DRAINED` rule inversion is internally coherent as shipped, not two live contradictory rule sets.** Read `palette.test.ts` and `palette.ts` in full at HEAD: the pre-`c5abfd0` assertion ("drained sits below the ground-contrast floor") is gone from the file, not merely outvoted — `c5abfd0` replaced it with a single active rule ("drained must clear a *higher* floor than earned, because earning is a change of CHROMA, not contrast") and left an explicit block comment narrating the correction and why the old reasoning was wrong. `npm test` confirms both the new floor and the case-scoped distinctness test (`"keeps a CASE's earned clue colours pairwise distinct"`) pass together. This is a sequential correction on the same branch, not a merge conflict between two still-active rules — but `1f378e4`'s own justification for `BREADCRUMB` ("the drained grey asserted to sit BELOW that floor") is now stale prose referring to a rule that no longer exists in code; this is a documentation-drift WARNING below, not a CRITICAL, because no code or test currently asserts the superseded claim.
- **Baseline promotion (`627cc0e`) checked for contradiction/duplication against this change's four delta specs**: none of the four delta specs' ADDED requirements restate a baseline requirement verbatim, and the one MODIFIED requirement (`detective-mode`'s "Deduction Screen") is standard OpenSpec supersession of the baseline's global-hen/four-choices version — expected, not a defect. One coexistence worth flagging as a SUGGESTION below: baseline `detective-mode`'s "Colour Asset Registry" requirement (trail-scoped colour uniqueness) is not modified or deprecated by this change's ADDED "Per-Case Clue Colour Distinctness" (case-scoped); both will exist side by side in `openspec/specs/detective-mode/spec.md` after archive. They do not conflict in practice (case-scoping is a strictly narrower, additional constraint), but neither delta text says so explicitly.
- **Test/build re-run independently**: `npm test` → 1073 passed / 0 failed (58 files, up from 1042/57 — the concurrent session's `artHierarchy.test.ts` plus additions to `placeArt.test.ts`, `TraceCanvas.test.tsx`, `artManifest.test.ts`, and `Deduction.test.tsx` account for the delta). `npm run build` → exit 0, 509 modules, no new TypeScript errors. Both commands and hashes recorded in the refreshed YAML envelope above.
- **`gentle-ai sdd-status case-registry-and-captions --cwd . --json`** re-confirmed at this HEAD: `"nextRecommended": "archive"`, `"dependencies.archive": "ready"`, `taskProgress` still 69/69, `remediationState.required: false`.

### New issue found in this pass

**WARNING (new)**: `design.md`'s art-pipeline code sample and prose (lines ~376, 378, 380, 394) still show `clue-webfoot-drained.png`, `clue-breadcrumb-drained.png`, and `clue-bubble-drained.png` built against the literal `#c8cdd2` `CLUE_DRAINED` value and describe it as "a flat `#c8cdd2` silhouette." That value was superseded by `c5abfd0` (`CLUE_DRAINED` is now `#838383`, for a documented, deliberate reason — the old value made an unfound clue the least visible thing on the sheet). This is the same category of drift already flagged above for `level-engine/spec.md`'s stale generator table: a design doc describing a fact about the implementation that the shipped code no longer matches. Recommend correcting `design.md`'s three build-script sample lines and the drained-silhouette prose before archive, alongside the existing §3 table fix.

No new CRITICAL or blocking findings. The three sources of drift landed in files this change's own scope depends on (`palette.ts`, `Deduction.tsx`, `TraceCanvas.tsx`, `placeArt.ts`) but not in the five files its falsifiable invariants are anchored to, and the one rule-set change (`CLUE_DRAINED`) replaced itself cleanly rather than leaving two contradictory assertions green by accident.

### Updated Verdict

**PASS WITH WARNINGS** (unchanged). 0 CRITICAL, 3 WARNING (2 carried forward + 1 new documentation-drift item above), 2 SUGGESTION (1 carried forward + 1 new coexistence note above). 12/12 requirements and 29/29 scenarios remain compliant; 1073/1073 tests and build both green, independently re-measured at HEAD `c5abfd0`. Routing confirmed `archive`.
