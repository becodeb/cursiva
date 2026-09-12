# Archive Report: case-registry-and-captions

**Change**: case-registry-and-captions  
**Archived to**: `openspec/changes/archive/2026-09-12-case-registry-and-captions/`  
**Archive date**: 2026-09-12  
**Archived by**: sdd-archive  

## Executive Summary

The `case-registry-and-captions` change has been fully implemented, verified, and archived. All four delta specs have been mechanically merged into their main-spec bases in `openspec/specs/`, the change folder has been moved to the archive with date prefix, and the artifact store has been updated.

## Specs Synced

### detective-mode/spec.md

**Status**: Updated with MODIFIED and ADDED requirements  
**Action**: 1 MODIFIED, 6 ADDED

- **Modified requirement**: `Deduction Screen` — generalized from hardcoded four choices with global CULPRIT (always hen) to dynamic `case.options.length` with case-scoped `DetectiveCase` and per-case `culprit`. Updated three scenarios to reflect case-driven logic.
- **Added requirements**:
  1. `Case Registry Data Shape` — Introduced `DetectiveCase` data structure with `id`, `culprit`, ordered `options`, per-case `ruledOutBy`, and `trailIds`. Specified invariant that exactly one option has no verdict and equals culprit. Included 3 scenarios.
  2. `Duck Case` — Defined the first case's structure: culprit `pato`, options `[pato, vaca, gato]`, four trail ids clued `webfoot`, `breadcrumb`, `bubble`, `feather`, with exclusion rules. 1 scenario.
  3. `Captioned Art Invariant` — Established that words may only appear with images (supersedes D6's text ban) and the `captioned-art` component's `label` prop must be required. 2 scenarios.
  4. `Per-Case Clue Colour Distinctness` — Specified that earned clue colours must be pairwise distinct within a case but may be reused across cases. 2 scenarios.
  5. `Case-Solved Persistence` — Required that closing a case's deduction persists a record via the level-progress store under pseudo-id `<caseId>-deduce` as a `LevelRecord` with `approvals: 1`. 2 scenarios.
  6. `Case Routing Across Multiple Cases` — Established routing to the first unresolved case, where resolved means all four trails filed AND deduction solved. 2 scenarios.

**Finding**: The new requirement "Per-Case Clue Colour Distinctness" and the pre-existing "Colour Asset Registry" (which describes how earned colours appear per trail) will coexist without explicit cross-reference. Both are valid and non-contradictory — the Colour Asset Registry establishes per-trail earned colours globally, while the new requirement adds that those colours must be pairwise distinct *within each case*. This is stricter per-case scoping applied atop global trail definitions. A future reader should understand that case scoping is strictly narrower than the trail-global registry, and the two requirements work together: the registry defines what earned colours exist, and the new requirement constrains their distribution within a case.

### level-engine/spec.md

**Status**: Updated with ADDED requirements  
**Action**: 2 ADDED

- `Duck Trail Set Precedes trail1` — Four new trail levels (`duck-trail1..4`) inserted before `trail1` with specified generators and strictly decreasing corridor widths (100, 90, 80, 70). Includes note that amplitudes and one generator shape were corrected after apply (from 140/garland to 170/switchback per `apply-progress.md` and `catalog.test.ts` guard). No timed obstacles on any duck trail. `duck-trail4` must satisfy existing clearance guards. Level ids are persisted keys. 3 scenarios.
- `Duck Case Positional-Unlock Migration` — Specified `game/migrateDuckCase.ts` module in migratePhase1.ts's three-part shape (declarative table, per-field merge policy, pure function) to seed duck trail ids and duck case `duck-deduce` pseudo-id when locked on `f1-libre.approvals >= APPROVALS_TO_UNLOCK`. Must be pure, copy-forward-only, MUST NOT delete or mutate existing records. 3 scenarios.

**Finding**: The main-spec Purpose states that this spec "is not a complete engine spec: the engine shipped in `level-engine-mvp` with no delta spec at all, and its pre-existing behaviour lives only in `docs/08_MOTOR_DE_NIVELES.md`." This gap is documented and not this change's responsibility. The merged spec now covers the duck-case changes but does not attempt to backfill the narrative engine spec.

### main-screen/spec.md

**Status**: Updated with ADDED requirements  
**Action**: 2 ADDED

- `Exit Returns to Home Office` — Added required `onExit: () => void` prop to `GameScreenProps`. Both exit affordances (trail back control and deduction screen back control) must invoke `onExit` instead of dispatching internal `back` action, landing on home office (`App`'s home shell) not internal level map. 3 scenarios.
- `Level Map Is a Development-Gated Route` — The level map view must not be reachable through ordinary exit navigation. Reachable only when `isDevMode()` is true or via explicit `?nivel=` deep-link route. While reachable, it must continue to own "Reiniciar progreso" and "Modo prueba: abrir todo" controls. 2 scenarios.

### trace-canvas/spec.md

**Status**: Updated with ADDED requirement  
**Action**: 1 ADDED

- `Carrier Art Placement via placeArt()` — Single pure exported function `placeArt(art, height, center, grip?)` computing where carrier/lens art is drawn. Given optional grip point `[gx, gy]` in art's 0..1 box, returns `x`, `y`, `width`, `height` placing grip point at center. Defaults to box centre `(0.5, 0.5)`. Every call site must use this function, not compute own centring. 3 scenarios.

## Spec Merge Summary

| Domain | Requirements | Modified | Added | Status |
|--------|--------------|----------|-------|--------|
| detective-mode | 4 pre-existing + 6 new = 10 | 1 | 6 | ✓ Updated |
| level-engine | 4 pre-existing + 2 new = 6 | 0 | 2 | ✓ Updated |
| main-screen | 5 pre-existing + 2 new = 7 | 0 | 2 | ✓ Updated |
| trace-canvas | 5 pre-existing + 1 new = 6 | 0 | 1 | ✓ Updated |

**Total**: 11 requirements merged (1 MODIFIED, 10 ADDED) into four specs.

## Archive Contents

- `proposal.md` ✅ (14.3 KB)
- `design.md` ✅ (56.8 KB)
- `explore.md` ✅ (13.7 KB)
- `specs/detective-mode/spec.md` ✅
- `specs/level-engine/spec.md` ✅
- `specs/main-screen/spec.md` ✅
- `specs/trace-canvas/spec.md` ✅
- `tasks.md` ✅ (69/69 tasks complete, no unchecked items)
- `apply-progress.md` ✅ (49.1 KB)
- `verify-report.md` ✅ (22.4 KB)

## Final State

### Task Completion

Per the persisted `tasks.md` artifact: **69/69 implementation tasks complete** (100% completion rate). All checkboxes are marked `[x]`. The Task Completion Gate passes.

### Verification Status

Per `verify-report.md` (refreshed at close):
- Result: `pass_with_warnings`
- Critical issues: 0
- Test coverage: 58 test files, 1073 tests passing
- Build: ✓ Green (chunk size warning is pre-existing)

Per the final-state-authority hierarchy, explicit facts provided in the launch prompt take precedence: verify validates with `pass_with_warnings`, 0 CRITICAL, and all 69 tasks complete.

### Tests and Build (Current)

Validation run at archive time:
```
npm test:  58 test files passed, 1073 tests passed
npm build: ✓ built in 420ms (chunk warning pre-existing)
```

No changes to test or build counts from earlier runs. All coverage gates remain green.

### Source of Truth Updated

`openspec/config.yaml` was updated to reflect the current state: changed from "7 main specs" to "**10 main specs**" (detective-mode, free-trace-mode, guided-trace-mode, letter-combinations, letter-model, level-engine, main-screen, progress-store, trace-canvas, trace-validation).

## Mechanical Verification

### Specs Sync Verification

All four delta specs were appended to their main-spec bases via shell command (`cat >>`). No Read → Write cycle was used. Merge was mechanical:
- `detective-mode`: Replaced one requirement, appended six.
- `level-engine`: Appended two requirements.
- `main-screen`: Appended two requirements.
- `trace-canvas`: Appended one requirement.

### Archive Move Verification

Readback diff after move:

```
(empty diff — no differences between pre-move snapshot and archived tree)
```

✅ Passing evidence: empty `diff -r` output confirms byte-identity of archived tree.

## Known Findings Carried from Earlier Phases

1. **Spec relationship clarification needed** (noted during merge): "Per-Case Clue Colour Distinctness" and "Colour Asset Registry" coexist in `detective-mode/spec.md`. The new requirement specifies per-case distinctness; the pre-existing requirement establishes per-trail earned colours. Both are correct and non-contradictory — case scoping is strictly narrower. A future reader should understand their relationship without re-deriving it.

2. **Engine spec gap** (pre-existing): `level-engine/spec.md`'s Purpose states the spec is not a complete engine specification. The actual engine behaviour (shipped in `level-engine-mvp` with no delta at that time) is documented only in `docs/08_MOTOR_DE_NIVELES.md`. Backfilling a complete engine narrative is deferred work and not this change's scope.

## Integrity Notes

- No artifacts were Read and re-Written (mechanical copy only).
- All delta content was appended or replaced as deltas specified.
- The worktree was clean before archive; only `openspec/` paths are staged.
- Configuration (`openspec/config.yaml`) was updated to reflect factual state.

## Cycle Complete

The SDD cycle for `case-registry-and-captions` is now closed:
- ✅ Proposal written and approved
- ✅ Spec deltas merged into main specs
- ✅ Design documented and reviewed
- ✅ Implementation completed (69/69 tasks)
- ✅ Verification passed (0 CRITICAL, all tests/build green)
- ✅ Change folder archived with date prefix
- ✅ Archive report persisted

The change is ready for deployment. All artifacts remain in the archive for audit and future reference.
