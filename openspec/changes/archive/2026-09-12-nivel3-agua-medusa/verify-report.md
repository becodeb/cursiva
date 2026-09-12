```yaml
schema: gentle-ai.verify-result/v1
evidence_revision: sha256:07cf9f8d697048c1e164536b571416d55c452df92967c1815fc617965ccce5de
verdict: pass_with_warnings
blockers: 0
critical_findings: 0
requirements: 11/11
scenarios: 26/26
test_command: npm test
test_exit_code: 0
test_output_hash: sha256:bf170ec86d15e386d24c7e5c5a9629d72698a432bc0c6bb5dd36d726ed2fd124
build_command: npm run build
build_exit_code: 0
build_output_hash: sha256:9ebdd34b5fdb617eeb6cb03bafe7ca48295d7ab3a6c689f6e68a5bf4831c5722
```

## Verification Report

**Change**: nivel3-agua-medusa
**Version**: N/A (no versioned spec base bump; delta specs against `openspec/specs/detective-mode`, `level-engine`, `trace-canvas`)
**Mode**: Standard

### Completeness

| Metric | Value |
|--------|-------|
| Tasks total | 47 |
| Tasks complete | 47 |
| Tasks incomplete | 0 |

### Build & Tests Execution

**Build**: ✅ Passed
```text
$ npm run build
> tsc --noEmit && vite build
✓ 511 modules transformed.
dist/index.html                  1.89 kB │ gzip:   1.02 kB
dist/assets/index-Dz0j8QMA.js  796.26 kB │ gzip: 167.47 kB
✓ built in 433ms
(warning only: chunk >500kB, pre-existing, out of scope)
Exit code: 0
```

**Tests**: ✅ 1118 passed / ❌ 0 failed / ⚠️ 0 skipped
```text
$ npm test
> vitest run
 Test Files  60 passed (60)
      Tests  1118 passed (1118)
   Duration  19.93s
Exit code: 0
```
Matches the claimed 1118/60. Both commands re-run independently by the verifier, not trusted from apply-progress.md.

**Coverage**: N/A — no coverage tool configured in this repo (pre-existing; not introduced by this change).

### Spec Compliance Matrix

| Requirement | Scenario | Test | Result |
|---|---|---|---|
| Case Trail vs Detective-World Predicates | A case trail is always in the world | `world.test.ts > "both: a case trail with the world flag also set stays true on both"` + regression guard | ✅ COMPLIANT |
| Case Trail vs Detective-World Predicates | A world-only level reports no case membership | `world.test.ts > "world-only: in the world, but not a case trail"` | ✅ COMPLIANT |
| Case-Only Behaviours Gate on isCaseTrail | No PISTAS rail for world-only | `LevelPlay.test.tsx > "renders no rail for a world-only level..."` | ✅ COMPLIANT |
| Case-Only Behaviours Gate on isCaseTrail | No `clues` prop for world-only | `LevelPlay.test.tsx > "passes a clues prop... absent on an ordinary level"` (extended to world-only) | ✅ COMPLIANT |
| Case-Only Behaviours Gate on isCaseTrail | No lamp latch for world-only | `LevelPlay.test.tsx > "sends the octopus on a world-only level (inDetectiveWorld), but no lamp"` | ✅ COMPLIANT |
| World Behaviours Gate on inDetectiveWorld | Ground scatter renders for world-only | `LevelPlay.test.tsx > "passes ground only on a detective trail..."` (world-only branch) | ✅ COMPLIANT |
| World Behaviours Gate on inDetectiveWorld | Wordless shell suppresses text | `LevelPlay.test.tsx > "a world-only level ... suppresses the same chrome as a case trail"` | ✅ COMPLIANT |
| World Behaviours Gate on inDetectiveWorld | Result block/stars suppressed | same test, `expect(html).not.toContain('Precisión')` | ✅ COMPLIANT |
| World Behaviours Gate on inDetectiveWorld | Non-world level keeps every behaviour | `LevelPlay.test.tsx > "a phase-2+ (non-detective) level is unaffected..."` | ✅ COMPLIANT |
| Nivel 3 Trail Set Between f2-guirnalda/f2-colinas | Four ids sit between the anchors | `catalog.test.ts` `EXPECTED_IDS` ordering assertion | ✅ COMPLIANT |
| Nivel 3 Trail Set... | No angular peak leaks in | `catalog.test.ts` generator-type assertion over the four configs | ✅ COMPLIANT |
| Nivel 3 Trail Set... | Only desafío 4 carries a timed obstacle | `catalog.test.ts` "silences the beat and the fluency bar on exactly the level that asks the child to STOP" | ✅ COMPLIANT |
| Rhythm Instruction Survives the Wordless Shell | Desafío 1 carries demo + metronome | `catalog.test.ts` metronome-band assertion + `demo: true` on `f2-guirnalda` (source-verified) | ✅ COMPLIANT |
| Per-Cycle Garland Variant | Non-uniform cycles emit only M/C | `paths.test.ts > describe('garlandVaried', ...)` M/C-only emission test | ✅ COMPLIANT |
| Per-Cycle Garland Variant | buildLevel derives valid checkpoints on non-uniform input | `paths.test.ts` band-predicate assertions over `f2-agua3` geometry | ✅ COMPLIANT |
| LevelConfig.goalArt | goalArt used at route's end | `LevelPlay.test.tsx > "sends the octopus on a world-only level... goalArt renders as endArt"` | ✅ COMPLIANT |
| LevelConfig.goalArt | Case trail without goalArt keeps lamp | `LevelPlay.test.tsx > "sends the lamp as endArt, OFF before the trail is finished"` | ✅ COMPLIANT |
| Nivel 3 Positional-Unlock Migration | Unlocked f2-colinas not relocked | `migrateNivel3.test.ts` captured-payload scenario | ✅ COMPLIANT |
| Nivel 3 Positional-Unlock Migration | Returns only changed entries, never deletes | `migrateNivel3.test.ts` idempotent re-run + never-mutates-source tests | ✅ COMPLIANT |
| PISTAS Rail Chrome | Rail renders beside canvas on case trail | `LevelPlay.test.tsx > "a detective-trail level's only visible word is PISTAS..."` | ✅ COMPLIANT |
| PISTAS Rail Chrome | Rail carries no copy beyond PISTAS | same test, `captionAudit` assertion | ✅ COMPLIANT |
| PISTAS Rail Chrome | Nivel 3 world-only level renders no rail | `LevelPlay.test.tsx > "renders no rail for a world-only level..."` | ✅ COMPLIANT |
| Hazard Rendering via Optional Art | Art-bearing hazard renders as `<g>`+`<image>` | `TraceCanvas.test.tsx` art-present case, asserts `<g transform>`+`<image href>`, `not.toMatch(/<circle/)` | ✅ COMPLIANT |
| Hazard Rendering via Optional Art | No-art hazard keeps circle default | `TraceCanvas.test.tsx > "trail1 renders its circle hazard numerically unchanged"` | ✅ COMPLIANT |
| Hazard Rendering via Optional Art | trail1's hazard is byte-identical | same test + independent `chromium --dump-dom` before/after diff (apply-progress.md), re-verified via source diff of the `<circle>` JSX literal (untouched character-for-character in commit `48f2ed8`) | ✅ COMPLIANT |
| Level-Sourced Goal Art | endArt renders supplied goal art | `TraceCanvas.test.tsx` `endArt`/`endMarker` suite (generic prop, no new surface per design) + `LevelPlay.test.tsx` goalArt tests exercising the medusa specifically | ✅ COMPLIANT |

**Compliance summary**: 26/26 scenarios compliant (11/11 requirements).

### Correctness (Static Evidence)

| Requirement / Concern | Status | Notes |
|---|---|---|
| `isDetectiveTrail` fully retired | ✅ Verified | `rg -n "isDetectiveTrail" client/src docs` returns only prose/comment references to the retired name (in `world.ts`'s own doc comment and `docs/03`'s historical sentence); zero live code reads it. |
| `trail1` unchanged | ✅ Verified | `git show 48f2ed8 -- TraceCanvas.tsx` shows the `<circle>` JSX literal moved into a ternary branch with not one character changed; `catalog.ts` diff confirms `trail1`'s own config entry untouched. |
| Four levels are a microprogression | ✅ Verified | Source-read `catalog.ts:640-763`: width 253→190→130..195→253, depth 240→140→95..200→240, corridor 100→80→68→90, beat 54→64→68→silent — matches design.md §3 exactly. `f2-agua4` carries `metronomeBpm: 0`/`minFluency: 0`, and `catalog.test.ts`'s named guard asserts the exempt set is exactly `['f2-agua4']`. |
| Migration idempotent/safe | ✅ Verified | `NIVEL3_TRAIL_IDS = ['f2-agua2','f2-agua3','f2-agua4']` (types.ts:99) excludes `f2-guirnalda`; the guard's structural idempotency was traced by hand (source read of `migrateNivel3.ts`) and matches the design's own falsifiability argument. |
| Contour guard is real, not gamed | ✅ Verified | `PROP_FILES` glob is `{goal,hazard}-*.png` (name-pattern, not a list); threshold `MAX_COLOURED_CONTOUR_SHARE = 0.25` against measured 3-4% conforming / 92% when reverted (per apply-progress.md's own falsification test) — wide margin, not tuned to the exact shipped value. |
| goalArt orthogonal to case lamp | ✅ Verified | `detective/cases.ts`'s `DETECTIVE_CASES` lists only `DUCK_TRAIL_IDS`/`DETECTIVE_TRAIL_IDS`; no `NIVEL3_TRAIL_IDS` reference anywhere in that file. `trailLampOn` stays gated on `isCase` (`LevelPlay.tsx:730,1054`), never on `goalArt`. |
| No new `url(#` | ✅ Verified | `rg "url\(#" client/src` returns only comments/tests *asserting the absence* of `url(#`, never a live attribute value. |
| `main-screen` untouched | ✅ Verified | `git diff --stat main...HEAD` shows no `HomeScreen.tsx`/`HomeScreen.test.tsx` entries. |

### Coherence (Design)

| Decision | Followed? | Notes |
|----------|-----------|-------|
| D1 (world, not case) | ✅ Yes | `detectiveWorld: true`, no `clue`, on all four levels; verified in `catalog.ts`. |
| D2 (four as microprogression) | ✅ Yes | See Correctness row above. |
| D3 (desafío 4 hazard numbers ≠ trail1) | ✅ Yes | `travel: 280, periodMs: 3000, radius: 34` vs trail1's `220/2400/30`; asserted in `catalog.test.ts`/`obstacles.test.ts`. |
| D4 (medusa via goalArt, not case machinery) | ✅ Yes | See goalArt orthogonality row above. |
| D5 (no cross-level mechanic leak) | ✅ Yes | `catalog.test.ts` asserts no angular-peak generator on Nivel 3 and no timed obstacle outside desafío 4. |
| D6 (stars suppressed, world reason not phase reason) | ✅ Yes | Suppression is gated on `inDetectiveWorld`, confirmed by source read and the `Precisión`-absence test on a world-only, non-Nivel-3-specific fixture. |
| D7 (migration ships before insertion) | ✅ Yes | Commit order: `26bda4b` (migration, S2) precedes `e98d403` (levels, S7). |
| Orchestrator fix 1: `recontour` pipeline mode | ✅ Real, coherent | `build_art.py:176-211` implements it; `SINGLES` rows at `:314-315` use `'contour'`; `artHierarchy.test.ts`'s glob-anchored 25% test passes; `carrier-octopus.png` (97%) left alone with its `docs/09` §2 rationale recorded. |
| Orchestrator fix 2: `mazeOn \|\| ground` corridor fill | ✅ Real, coherent | Present in `TraceCanvas.tsx` per commit `f81f6c2`; reasoning (Nivel 3 is the first ground-on, non-maze pairing) matches the code's actual gating change. |
| Orchestrator fix 3: `docs/08` phase-2 table | ✅ Real | `docs/08_MOTOR_DE_NIVELES.md` diff (11 lines) present in the branch, carries all seven Fase 2 levels. |

### Issues Found

**CRITICAL**: None.

**WARNING**:
1. Stale explanatory comment at `client/src/screen/LevelPlay.tsx:1108-1109` still reads "Keyed off `level.clue`, the same sole discriminator every other detective branch uses" for the `ground` memo, but the code on the next lines (`if (!inWorld || !corridor) return undefined`) has correctly gated on `inDetectiveWorld` since this change's own S1/S7 slices — `inDetectiveWorld` is a strictly wider discriminator than `level.clue` and is exactly what makes the four Nivel 3 (clue-less) levels show ground at all. The behaviour is correct and tested; only the comment's own claim is now false, which is a real risk for a future edit given how much this change's own design/apply-progress rely on comments as the source of truth for "why". Low severity — not spec-breaking, not test-breaking, one-line fix.

**SUGGESTION**:
1. Task 7.9's screenshot verification method (a single `scripts/shot.sh` capture at a fixed nominal `--virtual-time-budget`) cannot reliably catch the hazard mid-corridor on a level whose gap fraction is ≈0.55 by design — apply-progress.md documents needing a second, manually re-timed capture to get positive confirmation. Not a code defect (the numeric `hazardGapFraction`/`TraceCanvas` tests already prove the geometry), but a real gap in the human-screenshot method for any future hazard-bearing level; worth a follow-up note in the screenshot tooling rather than relying on a lucky capture.
2. `client/src/detective/assets.ts`'s doc comments on `GOAL_MEDUSA_ART`/`HAZARD_STARFISH_ART` were confirmed updated in the S8 pass to describe the post-`recontour` state correctly — no action needed, noted only because apply-progress.md flagged them as stale at an earlier pass and a re-check was warranted (now clean).

### Verdict
PASS WITH WARNINGS
All 47/47 tasks complete, 26/26 spec scenarios compliant with real covering tests, 1118/1118 tests and the build green (both re-executed independently), and all three orchestrator mid-change fixes verified as real and coherent; one low-severity stale code comment is the only finding.
