# Apply Progress: Finish MVP Roadmap

## Cumulative Status

- Completed before this unit: U0 Baseline, U1 Migration regression, U2 Progression consistency.
- Completed in this unit: U3 Asset/docs protection, including zero-mutation dry-run behavior, all-six authored-source byte preservation, docs/09 hierarchy updates, and focused Python regression coverage. Build/export atomicity is explicitly deferred to U12.
- Remaining: U4–U15.1.

## U1 Migration Regression

### Scope
Implemented only the U1 storage/migration regression around the real `openProgressStore` path and tightened the progress-store spec to the intended conservative contamination contract.

### Behavior
- Fresh storage can complete only `glass1` and reopen through `openProgressStore` without inventing `sand4`.
- Because `sand4` is not invented, `estanque.unlockedWhen(records)` remains false for that fresh `glass1`-only profile.
- Existing legacy payloads without entrance-level records still receive the additive `sand4` copy-forward seed, preserving the verified returning-child pond behavior.
- Existing structurally valid `sand4` records and other known level records survive real store reopen/save without domain-field changes; `estanque` stays unlocked because the existing `sand4` progress remains present.
- The spec no longer promises byte-for-byte preservation of arbitrary malformed, duplicate, or out-of-contract localStorage fields.

### RED / GREEN Evidence
| Step | Command | Result |
|---|---|---|
| Baseline related tests | `npm run test -w client -- src/game/migrateEntrance.test.ts src/game/levelProgress.test.ts src/zoo/sectors.test.ts` | PASS: 3 files, 92 tests. |
| RED | `npm run test -w client -- src/game/migrateEntrance.test.ts` after adding only the fresh glass1 regression test | FAIL: new real-open-path test observed an invented `sand4` record. |
| GREEN focused | `npm run test -w client -- src/game/migrateEntrance.test.ts` | PASS: 1 file, 17 tests. |
| GREEN related | `npm run test -w client -- src/game/migrateEntrance.test.ts src/game/levelProgress.test.ts src/game/*.test.ts src/zoo/sectors.test.ts src/zoo/adventures.test.ts` | PASS: 4 files, 131 tests. |
| Build | `npm run build` | PASS: TypeScript and Vite build succeeded; Vite reported only the existing chunk-size warning. |

### Files Changed
- `client/src/game/migrateEntrance.ts` — added an entrance-progress guard before seeding `sand4`.
- `client/src/game/migrateEntrance.test.ts` — added real `openProgressStore` regression coverage for fresh glass1 and real-storage preservation coverage for existing valid `sand4`.
- `openspec/changes/finish-mvp-roadmap/specs/progress-store/spec.md` — narrowed the contaminated-progress contract to valid existing `sand4`/known-record preservation.
- `openspec/changes/finish-mvp-roadmap/tasks.md` — marked only U1 complete.
- `openspec/changes/finish-mvp-roadmap/apply-progress.md` — recorded cumulative U0/U1 progress and evidence.

### Deviations
None — implementation follows the design's additive/idempotent migration seam and preserves valid existing progress without over-promising malformed localStorage preservation.

## U2 Progression Consistency

### Scope
Verified the existing concrete zoo progression seams and added regression coverage. The remaining review finding required observing App's actual state/wiring transitions, so the helper-export approach was removed and replaced with an interactive App render in the existing Vitest/React stack.

### Behavior
- Filing all entrada records produces the same story across seams: stars count those records, the pond opens, the map focuses the pond, the next pond adventure is `duck-trail1`, and no pond animal is recovered yet.
- Filing the first pond adventure through `duck-trail4` counts the same stars, places the duck, unlocks `montanas`, and advances the pond's next adventure to `f2-guirnalda` from the same record set.
- The interactive App regression seeds `sand4`, renders actual `App` at `?nivel=duck-trail1`, has mocked `GameScreen` invoke the real App `onExit` wiring after persisting `duck-trail1` through `openProgressStore`, observes App re-render mocked `ZooMap` with refreshed records, invokes the real `ZooMap.onEnter` prop with the same sector's `nextAdventure`, and observes App re-render mocked `GameScreen` for `duck-trail2`.
- Deduction semantics remain unchanged: no production route was added, and existing focused GameScreen assertions still prove sector-owned levels exit instead of opening deduction.

### Evidence
| Step | Command | Result |
|---|---|---|
| Baseline related tests | `npm run test -w client -- src/zoo/sectors.test.ts src/zoo/stars.test.ts src/zoo/adventures.test.ts src/screen/GameScreen.test.tsx src/App.test.tsx` | PASS before initial U2 edits: 5 files, 156 tests. |
| Initial characterization | Added U2 consistency tests in `sectors.test.ts` and a helper-only GameScreen map-return test | PASS: 5 files, 159 tests. |
| Final review fix | Removed helper-only/exported-seam strategy; added interactive App wiring regression in `App.test.tsx` using React `createRoot` plus a tiny fake DOM and mocked child boundaries | PASS: 5 files, 159 tests. |
| Focused related tests | `npm run test -w client -- src/App.test.tsx src/screen/GameScreen.test.tsx src/zoo/sectors.test.ts src/zoo/stars.test.ts src/zoo/adventures.test.ts` | PASS: 5 files, 159 tests. |
| Build | `npm run build` | PASS: TypeScript and Vite build succeeded; Vite reported only the existing chunk-size warning. |

### Files Changed
- `client/src/App.test.tsx` — added the final interactive U2 wiring regression with a minimal fake DOM, mocked `GameScreen`/`ZooMap` boundaries, fake `localStorage`, actual App state transitions, actual `openProgressStore`, and actual `nextAdventure` for the pond sector.
- `client/src/zoo/sectors.test.ts` — added U2 consistency characterization tests across `totalStars`, `isOpen`, `recentlyDiscovered`, `nextAdventure`, and `animalPlacements` using the same persisted records.
- `openspec/changes/finish-mvp-roadmap/tasks.md` — marked only U2 complete; U3–U15.1 remain unchecked.
- `openspec/changes/finish-mvp-roadmap/apply-progress.md` — recorded cumulative U0–U2 progress and final review-fix evidence.

### Deviations
None — U2 avoided a generic progression engine and now requires no production seam exports for the App wiring regression.

## U3 Asset/docs Protection

### Scope
Implemented only the U3 art-source and documentation protection layer. No visual assets were normalized, regenerated, or edited.

### Behavior
- `make_placeholders.py` now has a testable `write_placeholders(src, dry_run=False)` seam and a `--dry-run` CLI mode.
- Existing placeholder-family source files are treated as protected authored sources and all six are skipped byte-for-byte rather than overwritten.
- Missing placeholder-family sources are created only when absent; dry runs report the same create/skip plan without writing files or creating a missing target directory.
- `docs/09_GUIA_DE_ESTILO_VISUAL.md` now documents the source -> build -> manifest -> registry hierarchy and the safe placeholder behavior without weakening its 3:2/calm-zone visual authority.
- Build/export failure atomicity and missing-source validation remain deferred to U12; U3 does not claim them fixed.

### RED / GREEN Evidence
| Step | Command | Result |
|---|---|---|
| RED | `python -m unittest scripts.art.make_placeholders_test` after adding the protection tests first | FAIL: `write_placeholders` did not exist, proving the old script had no dry-run/testable protection seam. |
| Review RED | `python -m unittest scripts.art.make_placeholders_test` after adding the confirmed dry-run regression | FAIL: dry run created a nonexistent target directory. |
| GREEN focused Python | `python -m unittest scripts.art.make_placeholders_test` | PASS: 2 tests. |
| Dry run | `python scripts\art\make_placeholders.py --dry-run` | PASS: reported 0 creates and 6 protected existing source skips; wrote no art files/directories. |
| Related existing client art guard | `npm run test -w client -- src/detective/artHierarchy.test.ts` | PASS: 1 file, 9 tests. |

### Files Changed
- `scripts/art/make_placeholders.py` — added conservative skip-only placeholder planning, dry-run CLI, and a reusable write seam.
- `scripts/art/make_placeholders_test.py` — added focused regression coverage for all-six non-overwrite byte preservation and zero-mutation dry-run behavior.
- `docs/09_GUIA_DE_ESTILO_VISUAL.md` — updated the art hierarchy and placeholder protection contract while deferring build/export failure behavior to U12.
- `openspec/changes/finish-mvp-roadmap/tasks.md` — marked only U3 complete.
- `openspec/changes/finish-mvp-roadmap/apply-progress.md` — recorded cumulative U0–U3 progress and evidence.

### Deviations
None — implementation preserves docs/09 authority, does not touch visual assets, and narrows U3 to safe placeholder generation. Build/export atomicity is deferred to U12.
