# Apply Progress: Finish MVP Roadmap

## Cumulative Status

- Completed before this unit: U0 Baseline, U1 Migration regression.
- Completed in this unit: U2 Progression consistency, including the final interactive App wiring regression for the real GameScreen → App map-return → ZooMap enter state transitions.
- Remaining: U3–U15.1.

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