```yaml
schema: gentle-ai.verify-result/v1
evidence_revision: sha256:467fa170571be2ed14c33f8a9a1487100c2d19e42f1b07d48a8cc03937b3176f
verdict: pass_with_warnings
blockers: 0
critical_findings: 0
requirements: 12/12
scenarios: 29/29
test_command: npm test
test_exit_code: 0
test_output_hash: sha256:987f98786527ef0258ad43715bae02a8779e8784bfd65e206475f1faea2998f9
build_command: npm run build
build_exit_code: 0
build_output_hash: sha256:e96d7a56ae43c3a1419d472c3280e2d810e18c528a3618a26147610bc36cf870
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
