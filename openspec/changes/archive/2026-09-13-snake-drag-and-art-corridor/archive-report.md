# Archive Report: snake-drag-and-art-corridor

**Change ID**: `snake-drag-and-art-corridor`  
**Branch**: `sdd/viboras-en-la-arena`  
**Archived**: 2026-09-13  
**Status**: Complete  

---

## Summary

The snake-drag-and-art-corridor change archives successfully after implementation and full verification. This change delivers:

- **New capabilities**: `art-corridor` (drawn snake bodies fitted to centrelines) and `object-arrange` (drag-to-place ordering mechanic)
- **Enhanced capabilities**: `level-engine`, `guided-trace-mode`, `trace-canvas`, `zoo-map` (four delta specs merged into main specs)
- **Four snake levels** (`snake1..4`) integrated into the catalog between `night4` and `f2-guirnalda`
- **Arena sector** opened upon completion of `night4`, holding the four snake adventures
- **Recovered víbora animal** standing in the arena, earned by completing `snake4`
- **Carrito backpack item** granted by the arena, earned by completing `snake4`

All 72 files of tests pass (1555 tests, up from baseline 69 files / 1436 tests). Build is green. Verify verdict is PASS WITH WARNINGS (0 CRITICAL, 35/35 requirements, 96/96 scenarios).

---

## Artifacts Merged

### New Specs (Copied Mechanically)

| Domain | Status | Details |
|--------|--------|---------|
| `art-corridor` | ✅ Created | 250 lines. Specifies the centreline-fitting algorithm, sampled spine parameters, and placement contract. |
| `object-arrange` | ✅ Created | 248 lines. Specifies the drag-to-place mechanic, snap-radius logic, and state transitions. |

### Delta Specs (Merged Into Existing Specs)

| Domain | Action | Details |
|--------|--------|---------|
| `level-engine` | Updated | +8 ADDED requirements covering: optional `arrange` field, optional `artCorridor` field with routes derivation, phase-1 span guard for three centrelines, multi-route wall feedback via `multiCorridorTick`, snake catalog position with narrowing `corridorWidth` and rising `minAccuracy`, arc length non-decreasing within orientation groups (horizontal: snake1≤snake2≤snake4; vertical snake3 unconstrained), docs checklist coverage, byte-identical pre-existing levels and migrations. |
| `guided-trace-mode` | Modified | "Completion Handoff" requirement now gates checkpoint evaluation on `isArranged` when level carries an `arrange` field. Arranging and tracing are sequenced, not scored together. |
| `trace-canvas` | Updated | +5 ADDED requirements covering: art corridor layer rendering (arrange and trace phases), `inkHidden` prop to suppress ink during arrange, snake backdrop `channel: SAND_HOLLOW`, corridor-art luma law (4 forward gaps ≥55, 4 falsifiability rows <55), backdrop luma law completeness guard. |
| `zoo-map` | Modified + Added | Modified "Sector-to-Adventure Mapping": `arena` now carries `snake1..4` in order, unlocked upon `night4` filed; `bosque` and `sendero` (not `arena`) now asserted to stay empty and fogged. Modified "Backpack Registry": now holds 4 items (added `carrito` earned by `snake4`). Added "ZooAnimalId Widens to Víbora" and "Snake Adventure Carries No closingBeat". |

---

## Spec Merge Summary

**Before**: 12 specs in `openspec/specs/`  
**After**: 14 specs in `openspec/specs/`  
**New specs**: `art-corridor/spec.md`, `object-arrange/spec.md`  
**Modified specs**: `level-engine/spec.md` (+8 requirements), `guided-trace-mode/spec.md` (1 requirement modified), `trace-canvas/spec.md` (+5 requirements), `zoo-map/spec.md` (2 requirements modified, +2 requirements added)  

All merges are additive or explicitly modified (no destructive removals). The `openspec/config.yaml` archive rule did not trigger warnings: no destructive deltas were applied.

---

## Final State (Orchestrator-Provided Facts)

These facts supersede intermediate snapshots and represent the state at close:

### Tests and Build

- **Tests**: 72 files / 1555 passing (baseline: 69 files / 1436)
- **Build**: Green (`npm run build` succeeds)
- **New test files**: `artCorridor.test.ts`, `arrange.test.ts`, `ArtCorridorLayer.test.tsx`

### Commits and Verification

- **Commits on branch**: 13 commits (`39d4e97`..`0b80c02`)
- **Verify verdict**: PASS WITH WARNINGS
  - Critical issues: 0
  - Requirements: 35/35 (100%)
  - Scenarios: 96/96 (100%)
  - Warnings: 2 (disclosed, non-blocking)
  - Suggestions: 2 (recorded)

### Corrective Round (Disclosed)

The verify phase ran twice:

1. **First pass**: Captured screenshots showed three defects (per orchestrator's read of PNGs):
   - Scatter clipping bug on X axis in `catalog.ts` ✅ Fixed
   - `snake1` quiet-band placement issue ✅ Fixed
   - (Third reported item was orchestrator misread of legitimate unarranged scatter state, not a defect)

2. **Coverage gap exposed**: No test asserted that art sits on its corridor (no `<image>` markup comparison to scored path). Closed by new test `ArtCorridorLayer.test.tsx` exercising rotated `snake3` case; sensitivity verified by injecting desync.

### Disclosed Imperfections (Ship As-Is)

Two measured visual imperfections are recorded in `design.md` §3.6 and accepted for shipment:

1. **Thin `SAND_HOLLOW` sliver at tightest crests**: Unavoidable given the channel stroke's round joins and the measured sandbox hollow dimensions.
2. **`snake1` overlap with quiet band**: ~74.6 of `snake1`'s 144.4 units exceed the sand backdrop's quiet-band floor (rows 204–824). Incompatibility between authored centreline and measured band width; resolving it requires `corridorWidth` reduction that would break the phase-1 span guard.

### Scope Item Not Met (Recorded Explicitly)

**Step 4 of víbora adventure** (`docs/13` §2): "mayor variación de la ondulación" (greater wave undulation variation)

- **Status**: Not met in this change
- **Root cause**: Three snake source PNGs carry fixed uniform waves (2.5 / 3.5 / 4.5 cycles). Code-only escalation of wave demand cannot vary the authored shape.
- **Required to close**: New art (varies wave shapes across source PNGs), not code
- **Recorded in**: `docs/13` §4 decision 7 (commit `0b80c02`) and `sdd-verify`'s W1 warning

### Documentation Updates

- **`docs/13` §4**: Gained decision 7 (wave-variation scope), updated víboras row and row E status
- **Captures directory**: `capturas/pasoE/` (gitignored) holds final screenshots. Note: `capturas/e/` holds **paso D's** captures, not paso E's

### Follow-Ups for Next Step (Paso F, Bees)

Per `sdd-verify` report:

- **W1** (wave variation): New art needed to vary snake undulation. Carry to paso F scope.
- **W2** (visual imperfections): Human art-review pass on the two disclosed overlaps and hollow slivers.
- **S1** (HUD icon): Recovered-animal icon reads as "snake in the sky"; worth a `docs/12` note.
- **S2** (step mapping): The §2 four-step → `snake1..4` mapping is inferred from code, not stated explicitly in specs or code comments.

---

## Task Completion

All 9 phases marked complete in `tasks.md`:

✅ Phase 1: Measure the Drawn Spines and the Manifest  
✅ Phase 2: The Fitted Art Corridor  
✅ Phase 3: Fix the Multi-Route Wall Check  
✅ Phase 4: The Arrange Mechanic  
✅ Phase 5: Render the Corridor as Plain Images  
✅ Phase 6: The Four Snake Levels  
✅ Phase 7: The Zoo — Backdrop, Sector, Animal, Backpack  
✅ Phase 8: Screenshot Verification (human-reviewed, defects found and fixed)  
✅ Phase 9: Final Gate (tests 72/72 green, build green)  

No unchecked implementation tasks remain.

---

## Release State

This branch remains **unpushed and unmerged to `main`**, consistent with pasos A–D. The archive marks the completion of the SDD cycle; delivery to production is a separate orchestration step outside this phase.

**Key decision preserved**: The nine phases remain as internal commit slices on one PR (`sdd/viboras-en-la-arena`), per the `size:exception` delivery strategy accepted in the initial proposal.

---

## Risks and Mitigation

| Risk | Status | Mitigation |
|------|--------|-----------|
| Wave variation not delivered | Recorded | Explicit scope item W1; carry forward to paso F; new art required, not code |
| Visual imperfection: `snake1` overlap | Disclosed | Measured at 74.6/144.4 units; resolving breaks phase-1 span guard; documented in design §3.6 |
| Visual imperfection: `SAND_HOLLOW` sliver | Disclosed | Measured slivers at crests; unavoidable given channel stroke geometry; documented in design §3.6 |
| HUD icon ambiguity | Recorded | S1: suggestion for `docs/12` notation; non-blocking |
| Step-to-level mapping implicit | Recorded | S2: suggestion to add code comments or spec notes; non-blocking |

**No blockers remain.** All CRITICAL issues from verify are resolved. The two WARNING items and two SUGGESTION items are recorded in `docs/13` §4 decision 7.

---

## Archival Checklist

- [x] All 6 delta specs read and merged into main specs
- [x] 2 new specs (`art-corridor`, `object-arrange`) copied mechanically to `openspec/specs/`
- [x] Change folder moved from `openspec/changes/` to `openspec/changes/archive/2026-09-13-snake-drag-and-art-corridor/`
- [x] Byte-identical diff verification passed
- [x] Archive report written (this file)
- [x] No unchecked tasks in `tasks.md` at archive time
- [x] Task Completion Gate: PASSED
- [x] Native Review Receipt Gate: N/A (receipt-driven development not enabled for this candidate)

---

## Artifact Locations

| Artifact | Path |
|----------|------|
| New `art-corridor` spec | `openspec/specs/art-corridor/spec.md` |
| New `object-arrange` spec | `openspec/specs/object-arrange/spec.md` |
| Archived change folder | `openspec/changes/archive/2026-09-13-snake-drag-and-art-corridor/` |
| Archive report | `openspec/changes/archive/2026-09-13-snake-drag-and-art-corridor/archive-report.md` |

---

## References

- **Proposal**: `openspec/changes/archive/2026-09-13-snake-drag-and-art-corridor/proposal.md`
- **Design**: `openspec/changes/archive/2026-09-13-snake-drag-and-art-corridor/design.md`
- **Tasks**: `openspec/changes/archive/2026-09-13-snake-drag-and-art-corridor/tasks.md`
- **Verify Report**: `openspec/changes/archive/2026-09-13-snake-drag-and-art-corridor/verify-report.md`
- **Apply Progress**: `openspec/changes/archive/2026-09-13-snake-drag-and-art-corridor/apply-progress.md`
- **Docs guidance**: `docs/13_AVENTURAS_POR_ANIMAL.md` §4 decision 7 (updated at close)

---

**Archive Date**: 2026-09-13 | **Change Closed**: Complete and ready for delivery coordination
