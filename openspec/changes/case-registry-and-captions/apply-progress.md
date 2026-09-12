# Apply Progress: Case Registry and Captioned Art

Scope of this apply run: **Phase 1 (S1) and Phase 2 (S2) only.** Phases 3-9
are untouched and remain `[ ]` in `tasks.md`.

Mode: Standard (strict TDD disabled — `openspec/config.yaml testing.strict_tdd: false`).

## Phase 1: Seed duck trails before they exist (S1) — COMPLETE (5/5)

| Task | Status | Evidence |
|---|---|---|
| 1.1 `DUCK_TRAIL_IDS` in `game/types.ts` | done | Four ids, in trail order, beside `DETECTIVE_TRAIL_IDS`. |
| 1.2 `game/migrateDuckCase.ts` | done | Same three-part shape as `migratePhase1.ts`; guarded on `f1-libre.approvals >= APPROVALS_TO_UNLOCK`; never mutates/deletes. |
| 1.3 `game/migrateDuckCase.test.ts` | done | 7 tests: idempotent re-run, no write below threshold, no write when any duck id has a record, never deletes/mutates, mid-hen-campaign payload keeps every unlock. |
| 1.4 Wire into `openProgressStore.ts` | done | Loop form `[migratePhase1(...), migrateDuckCase(...)]`. |
| 1.5 `npm test` / `npm run build` | done | 979 tests / 53 files (baseline 972/52 + 7 new); build green. |

### Work Unit Evidence — S1

| Evidence | Value |
|---|---|
| Focused test command | `npm test -- migrateDuckCase` → 7/7 passed |
| Runtime harness | N/A — pure store logic, no visual surface yet (per tasks.md's own forecast) |
| Rollback boundary | Delete `client/src/game/migrateDuckCase.ts` and its test; revert `types.ts`/`openProgressStore.ts` edits. Orphan seeded records tolerated by the store (same tolerance `f1-ondas`/`f1-espiral` already get). |

Committed as `fix(progress): seed duck trails before they exist` (447e9b2).

## Phase 2: Duck art, tokens, clue kinds, four levels, case registry (S2 — size-exception) — COMPLETE (16/16)

| Task | Status | Evidence |
|---|---|---|
| 2.1 `build_art.py` palette tuples | done | `BREADCRUMB`, `BUBBLE` added beside existing tuples. |
| 2.2 Six `SINGLES` rows | done | webfoot (`keep_ink=False`), breadcrumb/bubble (`keep_ink=True`). |
| 2.3 Ran `build_art.py`, committed outputs | done | 6 new PNGs + regenerated `manifest.json` (44 total files, 1195.5 KB). |
| 2.4 Manifest tight-bbox check | done, with deviation | See tasks.md note — webfoot emitted 256×230 (wider than tall), which matches the orchestrator-verified alpha bbox ratio exactly; the design doc's "tall-narrow" adjective was imprecise, the pipeline itself is correct. |
| 2.5 `palette.ts` tokens | done | `BREADCRUMB '#994138'`, `BUBBLE '#4fb3d9'`. |
| 2.6 `palette.test.ts` re-scope | done | `EARNED` widened to six; distinctness re-scoped per `DETECTIVE_CASES`/`clueKindsOf`, exact body from design §4. |
| 2.7 `assets.ts` `ClueKind` + `CLUE_ART` | done | Three new kinds, `w`/`h` copied from fresh manifest. `ANIMAL_ART`/`CULPRIT` untouched (Phase 5 scope, out of this run). |
| 2.8 `artManifest.test.ts` count | done | 38 → 44; comment arithmetic updated. |
| 2.9 Four `LevelConfig`s in `catalog.ts` | done, with deviations | See below — three geometry deviations, all consequential fixes for a pre-existing test guard. |
| 2.10 `catalog.test.ts` updates | done, broader than listed | `EXPECTED_IDS`, `CORRIDORS`/`FLUENCY` maps, rail/taper/resetOnContact assertions, `levelsByPhase(1)`, phase1-id assertion, migration-no-dead-end test (now calls `migrateDuckCase` too), new `duck-trail4` clearance describe block. Also fixed `detective/clues.test.ts` (outside S2's file list, broken by the same LEVELS insertion). |
| 2.11 `detective/cases.ts` | done | `DetectiveCase`, `DETECTIVE_CASES`, `clueKindsOf`, `caseOf`, `caseSolvedId` — matches design §1 verbatim. |
| 2.12 `detective/cases.test.ts` | done | Five structural describe blocks, iterating `DETECTIVE_CASES`. |
| 2.13 Screenshot: width progression | PASS | `/tmp/shots/duck-trail1.png`..`duck-trail4.png` |
| 2.14 Screenshot: duck-trail4 tightness | PASS | Same screenshots, corridorWidth 70 judged child-plausible |
| 2.15 Screenshot: drained webfoot legibility | PASS | `/tmp/shots/webfoot-drained-on-earth.png` |
| 2.16 `npm test` / `npm run build` | done | 999 tests / 54 files; build green. |

### Deviations from design.md (task 2.9)

Design.md §3's literal generator calls, taken exactly as written, violate the
PRE-EXISTING `catalog.test.ts` guard "puts no phase-1 route inside the
writing band" (every phase-1 routed level's vertical span must exceed the
300-420 band: span > 300, minY < 180, maxY > 420). This guard predates this
change and was not being checked against when design.md's table was
authored. Three numeric deviations, each minimal and each verified not to
break any other design-stated invariant:

1. **`duck-trail1`**: `wave(...)` `amplitude: 140` → **170**. 140 draws a
   span of exactly 280 (2×140), 20 short of the >300 floor. 170 (the same
   amplitude design.md already gives `duck-trail2`) clears it with margin
   (span 340, minY 130, maxY 470).
2. **`duck-trail3`**: `garland({ cycles: 3 })` (default `yTop: 285, yBottom:
   435`) → `garland({ cycles: 3, yTop: 110, yBottom: 490 })`. The default
   span is only 150 units and sits almost entirely INSIDE the 300-420 band —
   the same band `f2-guirnalda` (phase 2) is deliberately left inside, since
   phase 2 IS the writing-band pattern phase. Phase 1 is not; widened to a
   380-unit span.
3. **`duck-trail4`**: `squareWave(...)` `amplitude: 140` → **170**. Same
   280-unit shortfall as `duck-trail1`. `cornerClearance` depends only on
   `run`/`corridorWidth` (unaffected); `armClearance` only gets MORE true as
   amplitude grows (`2·amplitude − w ≥ 0.7·w`), so design.md §3's clearance
   CONCLUSION (both guards hold) is unaffected — only its literal worked
   numbers (`2·140−70=210`, etc.) go stale relative to the shipped code.

None of these three changes touch `corridorWidth`, `clue.kind`, `taper`, or
any other design-load-bearing field. All three are recorded as inline
comments at their exact location in `catalog.ts`.

4. **Rail first-contact reassignment** (not a numeric deviation, a
   consequential fix): design.md gives `duck-trail1` `feedback(0, true)`
   ("first contact... same convention `trail1` carries") but never states
   that `trail1` itself should lose its own `feedback(0, true)`. Since
   `duck-trail1` is now the true first routed level of phase 1, leaving
   BOTH trails with `rail: true` would violate the pre-existing, still-live
   invariant "`turns the assisted rail on at FIRST CONTACT only`"
   (`catalog.test.ts`) and falsify `trail1`'s own module comment ("the rail
   is on here and nowhere else in phase 1"). Moved `trail1`'s feedback to
   `feedback(0, false)` and updated its comment accordingly.

### Task 2.4's descriptive deviation (not a code deviation)

Design §4 predicted "tall-narrow webfoot, near-square bubble, wide crumb."
The actual manifest gives:
- `clue-webfoot-earned`: 256×230 (ratio 1.11, wider than tall)
- `clue-breadcrumb-earned`: 256×237 (ratio 1.08, mildly wide — matches)
- `clue-bubble-earned`: 256×255 (ratio 1.004, near-square — matches)

The webfoot's actual proportions do not match "tall-narrow," but they DO
match the orchestrator-pre-verified alpha bbox for `huella palmeada.png`
(1187×1069, ratio 1.11) almost exactly — the crop is tight and correct, not
a full-canvas fallback (full canvas would have been 1299×1211, ratio 1.07,
a measurably different shape). This is the design doc's adjective being
imprecise, not a pipeline defect; no code change was needed.

### Work Unit Evidence — S2

| Evidence | Value |
|---|---|
| Focused test command | `npm test -- catalog cases palette artManifest` → 124/124 passed |
| Runtime harness | `scripts/shot.sh` — four duck-trail screenshots + one direct art composite; all three checks judged PASS, recorded above |
| Rollback boundary | Delete `client/src/detective/cases.ts`/`.test.ts`; revert `catalog.ts`'s four inserted `LevelConfig`s and `catalog.test.ts`'s companion edits; revert `assets.ts`/`palette.ts`/`palette.test.ts`/`artManifest.test.ts`; revert `build_art.py` and the six generated PNGs + `manifest.json`. `cases.ts` is unused by any other module until Phase 5/6 land, so it is safe to delete in isolation. |

Full suite at the end of S2: **999 tests / 54 files, `npm run build` green.**

## Screenshots (paths for the orchestrator to open)

- `/tmp/shots/duck-trail1.png` — PASS (widest corridor, one broad S-curve)
- `/tmp/shots/duck-trail2.png` — PASS (narrower, two cycles)
- `/tmp/shots/duck-trail3.png` — PASS (garland/"W" shape, narrower still)
- `/tmp/shots/duck-trail4.png` — PASS (narrowest, crisp square corners, no merged blobs)
- `/tmp/shots/webfoot-drained-on-earth.png` — PASS (direct art composite, drained webfoot legible on corridor earth)

## Remaining Tasks (out of scope for this apply run)

- [ ] Phase 3: Captioned art and the caption audit (S3)
- [ ] Phase 4: Rewrite every text-absence suite (S4)
- [ ] Phase 5: Deduction becomes case-driven and captioned (S5)
- [ ] Phase 6: Per-case routing (S6)
- [ ] Phase 7: Exit to the home office; map becomes a dev surface (S7)
- [ ] Phase 8: The lens centres on the fingertip (S8)
- [ ] Phase 9: Docs — Nivel reterm, directive transcription, D6 fixes (S9)

## Status

21/69 tasks complete (Phase 1: 5/5, Phase 2: 16/16). Both slices committed
separately. Ready for the next apply batch (Phase 3, S3) or for verify on
this slice's scope.
