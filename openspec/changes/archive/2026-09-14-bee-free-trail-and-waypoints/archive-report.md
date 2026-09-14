# Archive Report: Bees in the forest — the free trail with waypoints

**Change**: `bee-free-trail-and-waypoints`  
**Dated**: 2026-09-14  
**Status**: ARCHIVED AND CLOSED

## Final State Authority

This archive report describes the state of the change AT CLOSE, not intermediate snapshots. The following facts outrank any stale claims in `apply-progress` or `verify-report`:

- **13 commits on the branch**, all merged to the working tree.
- **npm test**: **74 files / 1656 tests, all green** (baseline: 72 files / 1555 tests).
- **npm run build**: green (`tsc --noEmit && vite build`).
- **Verify report**: PASS WITH WARNINGS (0 CRITICAL, 2 WARNING, 1 SUGGESTION), all 19 requirements traced to 52 scenarios.
- **Tasks.md**: All implementation tasks complete (phases 1–9.6 marked `[x]`). Phase 8 read-back answers recorded in `docs/13_AVENTURAS_POR_ANIMAL.md` decision 8.

**Two commits landed AFTER `apply-progress` was written** (by the orchestrator):
1. `c5ea4ae` — `debugCarrier` wired into `LevelPlay.tsx:1502-1505`; defect found by reading a capture, fixed with four regression tests added to `LevelPlay.test.tsx`.
2. `8926317` — `docs/13_AVENTURAS_POR_ANIMAL.md` §4 decision 8 recorded: three capture-only findings in Spanish.

## Specs Synced

| Capability | Files | Action | Requirements | Scenarios |
|---|---|---|---|---|
| `free-trail-waypoints` | NEW | Created | 8 ADDED | 22 |
| `level-engine` | MODIFIED | Merged | 5 ADDED | 15 |
| `trace-canvas` | MODIFIED | Merged | 2 ADDED | 5 |
| `zoo-map` | MODIFIED | Merged | 4 ADDED | 10 |

**Merge method**: Mechanical copy of new capability spec; mechanical append of ADDED requirements sections to existing specs. All deltas properly integrated into `openspec/specs/`.

## Archive Contents

- ✅ `proposal.md` — scope, approach, risks, dependencies
- ✅ `design.md` — technical design with four ratified amendments (A1–A4)
- ✅ `exploration.md` — prior art, research, design decisions
- ✅ `tasks.md` — nine phases, 55 complete tasks, with phase-8 read-back answers appended
- ✅ `verify-report.md` — PASS WITH WARNINGS; 19/19 requirements, 52/52 scenarios; two findings open for author
- ✅ `specs/` (four files):
  - `free-trail-waypoints/spec.md` — new capability
  - `level-engine/spec.md` — delta, 5 ADDED requirements
  - `trace-canvas/spec.md` — delta, 2 ADDED requirements
  - `zoo-map/spec.md` — delta, 4 ADDED requirements

## Key Findings Recorded

The project's most valuable artifact is its accumulated scar tissue — decisions written down rather than resolved silently. Four findings from this change carry forward:

### 1. Two live engine defects were found and repaired

Both caused by one root: a routeless level gets an empty `LevelTarget` and two places read that emptiness as data.

**A1 — `offPath` was permanently true on all twelve shipped routeless levels**

`LevelPlay.tsx:1058` computed `out = multiCorridorTick(target.routes, …).distance > target.corridorWidth/2`, and `corridorTrack.ts:188` returned `Infinity` for an empty routes array (from `buildLevel.ts:168–180`). So `offPath` was `true` forever on levels `glass1..4`, `sand1..4`, `night1..4`, painting the child's live ink in `OFF_PATH_INK` (`#94a3b8`, luma 161) against backgrounds of luma ~151 — a gap of 10 against a law of 55. One spurious haptic pulse fired per stroke. The repair: `const out = target.routes.length > 0 && …` at `LevelPlay.tsx:695–697`. Commit `e25e8f8`, isolated, repaired twelve levels with no other change.

**A2 — The carrier never rendered on a `kind:'free'` level**

`startMarker` came from `target.polyline[0]`, which `buildLevel.ts` sets to `undefined` for every routeless level. Repair: `LevelTarget.start` authored, fallback to it when polyline is empty. General, reusable fix (commit `2b25c64`). Confirmed by regression test and independent proof.

Verify re-proved both defects by fault injection:
- Injected a 5-unit offset into `waypointArt`: 6 of 17 coincidence tests failed, then passed on restore.
- Confirmed `debugCarrier` was written and tested but never wired until commit `c5ea4ae`, found by reading a capture.

### 2. A green test on unreachable code (the third in this project)

`debugCarrier` was correct, unit-tested in `waypoints.test.ts`, and called by nobody until `c5ea4ae`. Verify swept every export of `waypoints.ts` and `devMode.ts` for non-test callers — all had real callers, making this the only gap. The practice now standard: sweep exported functions for real use before claiming coverage.

### 3. Two open art-direction findings (disclosed, not disguised)

Per `docs/13` §4 decisions 5–7, this change records unfulfilled constraints rather than hiding them:

**Finding 1: The decoration painted into `fondo bosque.png` out-contrasts the flower**

The dormant flower separates 58.8 luma from the forest band; the backdrop's white daisies separate 93.8. It is the literal defect `docs/09` §4 documents. It has **no fix in the literal** — beating 93.8 needs luma ≥245 (the decoration's own colour, indistinguishable) or ≤57.4 (17.6 from the child's ink, which draws straight through the flower). Both branches closed by arithmetic. **The exit is the art, and it is the author's.**

Mitigations and truth: The other half of the rule passes — the target is 76×72 against the decoration's 57×37, i.e. 1.3× wider and twice as tall. The flower is visually prominent. Whether it is VISUALLY MORE prominent than its own dormant colour is the authored question left open.

**Finding 2: The bee covers the flower she lands on**

1.3% of petal left visible. The same occlusion `docs/09` §2 solved once by taking the lens off the octopus, back because here the character and the cursor are one object. Transient in play, total in a still. Untouched: resizing either is art direction.

### 4. The flower's dormant colour `#d2d2d2` is PROVISIONAL

The test asserts the constraint (achromatic, ≥55 from forest band), never the literal. The author changes it in one line and the suite still polices her. This follows paso D and paso E's precedent of cornering an art choice and leaving the exact value to the author.

### 5. One capture was DELETED rather than kept: `glass2-after-a1.png`

It appeared to evidence the A1 repair but could not — A1 changes the live ink while the finger is down, and a static screenshot never draws. A1 is proven by test only (`backdrops.test.ts`, `LevelPlay.test.tsx`). Keeping false evidence is worse than not keeping it.

### 6. The attempt ledger's final state is `interrupted`, and that is accurate

`sdd-apply` genuinely stopped before phase 8, which the orchestrator then ran. A second attempt could not be opened because the objective had changed. It was left alone rather than forced, per protocol.

### 7. Archiving is not merging

Like pasos A–E, this branch stays unpushed and unmerged.

## Practical Gotchas (for future work)

1. **`scripts/shot.sh` resolves relative paths against `capturas/`**, so passing `capturas/...` duplicates the directory.
2. **Vite fell through to port 5176** because 5173 was held by an older server that still answered 200.
3. **The intro route is `?nivel=intro-<levelId>&dev`**, not `?nivel=intro-bee` — the first capture silently fell through to the map.

## Test & Build Summary

| Metric | Value |
|---|---|
| Test files | 74 (was 72; +2) |
| Tests passed | 1656 (was 1555; +101) |
| New test files | `levels/waypoints.test.ts`, `canvas/WaypointLayer.test.tsx` |
| Build | ✅ green |
| Type check | ✅ green (found and fixed one error in `waypoints.ts` during build) |

## Artifact Observation IDs

This archive was generated from openspec artifact store (hybrid mode). Artifact locations in `openspec/`:

- Change folder: `openspec/changes/archive/2026-09-14-bee-free-trail-and-waypoints/`
- New capability: `openspec/specs/free-trail-waypoints/spec.md` (NEW)
- Modified capabilities: 
  - `openspec/specs/level-engine/spec.md` (5 ADDED requirements)
  - `openspec/specs/trace-canvas/spec.md` (2 ADDED requirements)
  - `openspec/specs/zoo-map/spec.md` (4 ADDED requirements)

## Checklist

- [x] Main specs updated correctly
- [x] Change folder moved to archive with date prefix (2026-09-14)
- [x] Archive contains all artifacts (proposal, specs, design, tasks, verify-report)
- [x] Archived `tasks.md` has no unchecked implementation tasks
- [x] Active changes directory no longer has this change (`openspec/changes/bee-free-trail-and-waypoints/` → moved to archive)
- [x] Verbatim `diff -r` readback output run and shows empty (no differences)
- [x] No CRITICAL issues in verify-report
- [x] All 19 requirements traced to 52 scenarios

## Closure

The bee adventure is the first family where the child authors the route instead of following one. The mechanic — a start point, N flower waypoints, one goal (the hive), with a carrier that follows the invented trail — is now fully implemented, tested (74 files / 1656 tests green), and ready for shipping.

Four levels (`bee1..bee4`), one adventure, one sector (`bosque`), one animal (`abeja`), and one backpack item (the forest's flower) are now part of the catalog. The forest background, the dormant flower art, and the coincidence test ensuring rendered coordinates match scored ones are in place.

Two live defects on the existing twelve routeless levels were found and repaired as isolated commits. One was previously invisible to 1555 green tests.

This change is complete, archived, and closed. The branch remains unpushed and unmerged, per project convention for SDD changes.

---

**Archive created**: 2026-09-14  
**Generated by**: sdd-archive executor  
**Artifact store**: openspec/hybrid  
**Delivery strategy**: exception-ok (single PR, no slicing)
