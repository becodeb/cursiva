# Archive Report: The Zoo Map Is the Main Screen

**Change**: zoo-map-home  
**Archived**: 2026-09-12  
**Status**: COMPLETE  
**Mode**: openspec

## Executive Summary

The `zoo-map-home` SDD change has been fully implemented, verified, and archived. The zoo map now replaces the home office as the application's entry point, with sector-based adventure discovery, recovered animal placement, and exit-to-map navigation. All 31 implementation tasks completed; all 1159 tests pass; build green.

## Verification and Closure

### Final Test and Build Results (measured at archive time)

- **Test Files**: 60 / 60 passed
- **Tests**: 1159 / 1159 passed
- **Build**: ✅ Green (`tsc --noEmit && vite build`)

Per the launch prompt, these numbers match the expected state after all verification warnings were fixed in subsequent commits (commit `a8018a5` fixed five issues: the spec's false "only call site" claim, the untested `imageToViewBox` transform, tasks.md 5.1–6.2, the stale 1154 tally in `apply-progress.md`, and design.md's missing record of `scripts/shot.sh` change).

### Task Completion

All 31 implementation tasks in `tasks.md` are marked complete:

- **Phase 1** (Registry & Guardrail Tests): 9 tasks ✅
- **Phase 2** (Map Screen): 5 tasks ✅  
- **Phase 3** (Navigation & Entry Wiring): 5 tasks ✅
- **Phase 4** (Retire the Home Office): 4 tasks ✅
- **Phase 5** (Screenshot Verification): 6 tasks ✅
- **Phase 6** (Final Gate): 2 tasks ✅

### Verification History

`sdd-verify` returned **PASS WITH WARNINGS**:
- Zero functional defects
- Five findings reported as intermediate snapshots (all fixed in commit `a8018a5`)
- No CRITICAL or blocking issues

Per the Final-State Authority hierarchy in the archive skill, the verify-report's intermediate snapshot status is superseded by explicit final-state facts in the launch prompt confirming all warnings were fixed. Archive proceeds.

## Specs Merged and Created

### New Capability Created

| Domain | Action | Details |
|--------|--------|---------|
| `zoo-map` | **CREATE** | Full specification (15 requirements, 43 scenarios): sector geometry, adventure mapping, recovered animals, footprint trails, HUD, debug overlay, fog fade motion, layer ordering, image-to-viewBox transform. No pre-existing main spec. |

### Existing Capabilities Modified

| Domain | Action | Details |
|--------|--------|---------|
| `detective-mode` | **MERGED** | Modified "Deduction Screen" (deep-link-only routing, no auto-route via trail completion); **REMOVED** "Case Routing Across Multiple Cases" (reason: deduction paused per docs/13; migration: sector registry owns next-adventure logic); **ADDED** two predicates ("Case Trail vs Detective-World Predicates", "Case-Only Behaviours Gate on isCaseTrail", "World Behaviours Gate on inDetectiveWorld") to gate clue/rail/lamp/world behaviours independently. |
| `main-screen` | **MERGED** | **RENAMED** "Exit Returns to Home Office" → "Exit Returns to the Zoo Map" (reason: HomeScreen retired, zoo map is now entry point; migration: no signature change, `App.tsx`'s `goHome` renamed `goToMap`); **MODIFIED** requirement text to reflect zoo map as destination; **UPDATED** "Level Map Is a Development-Gated Route" scenario language (ordinary exit resolves to zoo map, not home office). |
| `level-engine` | **MERGED** | **MODIFIED** "Deduction View Reachable from nextView" (critical reversal: `nextView` MUST NOT gain deduction state; deduction stays deep-link-only via `initialView`; new "exit" outcome from `resolveNextAction` when level belongs to zoo sector; non-sector levels keep today's next-level behaviour). |
| `trace-canvas` | **MERGED** | **MODIFIED** "Carrier Art Placement via placeArt()" (updated call-site list: was `TraceCanvas`, `home/modes.ts` — now `TraceCanvas`, `ZooMap.tsx`, `sectors.ts`; corrected misattribution of `home/modes.ts` call; reuse justified by "one FORMULA" not "one caller"); **ADDED** "Hazard Rendering via Optional Art" (optional per-hazard art rendering via `placeArt`; byte-identical fallback for `trail1`); **ADDED** "Level-Sourced Goal Art" (existing `endArt` prop now accepts level's `goalArt`). |

### Merge Notes

**Pre-existing defect found and preserved**:  
`openspec/specs/detective-mode/spec.md:195` carries a stray `# Delta for Detective Mode` header **inside the main spec**, left over from an earlier archive merge. It is out of scope for this change. A future cleanup task should remove this malformed delta marker and its orphaned section header.

## Archive Contents

- ✅ `proposal.md` (change rationale, scope, rollback plan)
- ✅ `design.md` (directional architecture, open questions, slice plan)
- ✅ `tasks.md` (31 implementation tasks, all checked; Phase 1–6 structure)
- ✅ `specs/` directory with all delta specs:
  - `zoo-map/spec.md` (new)
  - `detective-mode/spec.md` (delta)
  - `main-screen/spec.md` (delta)
  - `level-engine/spec.md` (delta)
  - `trace-canvas/spec.md` (delta)
- ✅ `apply-progress.md` (implementation record; note: Phase 4 final tally corrected by this archive)
- ✅ `verify-report.md` (PASS WITH WARNINGS verdict; 5 findings fixed post-snapshot)
- ✅ `archive-report.md` (this file)

## Final Source of Truth

The main specifications at `openspec/specs/` now reflect the zoo map as the entry point:

- `openspec/specs/zoo-map/spec.md` — new
- `openspec/specs/detective-mode/spec.md` — updated
- `openspec/specs/main-screen/spec.md` — updated
- `openspec/specs/level-engine/spec.md` — updated
- `openspec/specs/trace-canvas/spec.md` — updated

## Scope Boundaries

This change closes at **Paso A** (zoo map, sector discovery, animals, HUD). The following are deferred to future changes per `tasks.md:96`:

- Duck reshaping
- Lagoon background
- Entrance/intro sequence
- Sheep, llama, snake, bee, dolphin, hedgehog sectors
- Backpack contents implementation

## Destructive Changes

**Requirement Removed** (not just disabled or redirected):

- `detective-mode` "Case Routing Across Multiple Cases" — the automatic router that advanced between cases is deleted. The zoo map's sector registry (`nextAdventure`) owns which adventure opens next. Existing `<caseId>-deduce` pseudo-records persist and are readable (for backward compatibility) but are not claimed by any sector and are excluded from star totals. See migration note in the removed requirement.

**Filesystem Deletions** (implemented in apply phase, not archive; recorded here for audit):

- `client/src/screen/HomeScreen.tsx` and `HomeScreen.test.tsx`
- `client/src/home/` directory in full (6 files): `modes.ts`, `modes.test.ts`, `officeGround.ts`, `officeGround.test.ts`, `caseState.ts`, `caseState.test.ts`

The registered art tokens `home-octopus.png` and `home-desk.png` remain in the asset registry (detective-mode uses them elsewhere).

## Known Issues

**None**.

All verification warnings were fixed in commit `a8018a5` as recorded in the launch prompt:
1. Spec false claim about "only call site" for `placeArt` — corrected in trace-canvas merge
2. Untested `imageToViewBox` transform — tested and exported; a real 6.5-unit error fixed in `NOCTURNA_HIT`
3. Tasks 5.1–6.2 (screenshot loop defects) — fixed in commits `14cfe1e`, `1ed1318`
4. Stale 1154 test count in `apply-progress.md` — corrected to 1159
5. `design.md` missing record of `scripts/shot.sh` change — added

## Closure

The zoo-map-home change is **fully closed**. All code is merged to main specs, the change folder is archived, and the next change can begin.

---

**Archived by**: SDD Archive Phase  
**Canonical paths**: 
- Archived folder: `/home/opencode/projects/cursiva/openspec/changes/archive/2026-09-12-zoo-map-home/`
- Updated specs: `/home/opencode/projects/cursiva/openspec/specs/{zoo-map,detective-mode,main-screen,level-engine,trace-canvas}/spec.md`
