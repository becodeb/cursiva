# Apply Progress: Finish MVP Roadmap

## Cumulative Status

- Completed before this unit: U0 Baseline.
- Completed in this unit: U1 Migration regression.
- Remaining: U2–U15.1.

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