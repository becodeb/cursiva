# Archive Report: scaffold-mvp-canvas

**Change**: scaffold-mvp-canvas
**Archived**: 2026-08-27
**Archived to**: `openspec/changes/archive/2026-08-27-scaffold-mvp-canvas/`
**Mode**: openspec (archive-report mirrored to Engram `sdd/scaffold-mvp-canvas/archive-report`, capture_prompt: false)
**Artifacts read for this archive**: `openspec/changes/scaffold-mvp-canvas/{proposal,design,tasks,verify-report}.md`; Engram `sdd/scaffold-mvp-canvas/apply-progress` (obs #934); `openspec/changes/scaffold-mvp-canvas/verify-report.md` (admitted, admission sha256 `f188e235…`). No `reviewGate` present in structured status → receipt-driven gate structurally absent; archive proceeds under ordinary repository policy.

## Final-State Authority Note

This report describes the state of the change AT CLOSE, not at the time intermediate snapshots were written. Where `apply-progress` (obs #934) or `verify-report` disagree with the orchestrator's final-state facts, the final-state facts (most recent account) and the persisted `tasks.md` win. `verify-report` is authoritative for verification numbers at its time; final-state facts supersede its pending/blocked claims where later work resolved them.

## Task Reconciliation (Task Completion Gate)

`tasks.md` as persisted showed ALL checkboxes unchecked — `sdd-apply` never marked completion. The orchestrator's final-state facts and `verify-report` prove 19/19 implementation tasks complete. Per the gate's exception, this archive performed an **exceptional mechanical reconciliation**, authorized by explicit orchestrator final-state facts + `apply-progress` (obs #934) + `verify-report` evidence:

- Marked `[x]`: T1.1–T6.2 (18 tasks) **and** T7.2 (folded into T1.3).
- Left `[ ]`: **T7.1** Device checklist — by-design MANUAL, pending a human touch device (NOT stale completed work; genuinely not automatable). Recorded as a pending item below.

Archived `tasks.md` therefore has no stale unchecked boxes for completed work. Only T7.1 remains open.

## Specs Promoted to Baseline (Source of Truth)

This was the initial scaffold establishing the baseline, so the 7 spec dirs were authored directly into `openspec/specs/` during the cycle (no separate delta-vs-main split existed). They are now the permanent source of truth AND were snapshotted into the archive.

| Domain | Action | Details |
|--------|--------|---------|
| letter-model | Baseline created | Canonical `LetterConfig` (doc/02+doc/07 reconciliation), registry, seeds `a`/`c` |
| trace-canvas | Baseline created | SVG viewBox 0 0 1000 600, 3-zone ruled lines, capture→Point[], ink, resample |
| trace-validation | Baseline created | Checkpoint order, continuity, avg-distance + tolerant margins (touch wider) |
| guided-trace-mode | Baseline created | Mode 1 — draw-path demo + checkpoint follow |
| free-trace-mode | Baseline created | Mode 2 — score on release, tone + star feedback |
| progress-store | Baseline created | Interface, localStorage impl, per-letter % |
| main-screen | Baseline created | Picker, progress, bloom |

A frozen copy of all 7 was written to `openspec/changes/archive/2026-08-27-scaffold-mvp-canvas/specs/` (byte-identical, verified by empty `diff -r`). `openspec/specs/` remains the live source of truth.

## Verification (final state)

Per `verify-report` (admitted sha256 `f188e235…`, evidence_revision `8d36fa03…`):
- **Verdict**: pass_with_warnings — `verdict: pass_with_warnings`, `blockers: 0`, `critical_findings: 0`. No CRITICAL findings → archive permitted.
- **Tests**: 73 passed / 0 failed / 0 skipped (12 files), `npm test` exit 0.
- **Build**: `npm run build` (tsc --noEmit && vite build) green, exit 0.
- **Compliance**: 27/27 requirements, 48/48 scenarios compliant.
- **Runtime harnesses verified** (u5/u6a/u6/u7 CDP): ink ~60fps cadence avg 16.67ms, second-finger ignored, cancel clears, demo input ignored + ready in band, exactly-once feedback, monotonic best-of + corrupt→overwrite + no-throw fallback, bloom on-load + replayable; perfect-score persistence required store rounding + ideal flatten density 96 steps (fixes shipped in PR #9).

### Warnings / Suggestions (carried as advisory, not blockers)
- **W-1** (T7.1 manual gate): device checklist is the only incomplete task; cannot be automated. Headless equivalents pass; frame avg 16.67ms headless with an 18.7ms max outlier to watch on hardware. Pending human.
- **W-2** (design deviation, droppable per design flag 2): start-point registration `User[0]→Ideal[0]` NOT implemented — score.ts pairs index-wise with no start alignment. All passed evidence starts at Ideal[0], so the deviation is unexercised; advisory, never blocks. Pending decision (acknowledge or implement later).
- **S-1**: headless frame max 18.7ms vs 17ms target (avg 16.67ms OK) — confirm/tune on real device during T7.1.

## Known Deviations (recorded for the next owner)
- `streamline: 0` (perfect-freehand default is 0.5) — intentional.
- TS 7 bare `tsc --noEmit` quirk — use `npm run build`.
- `gh pr edit --add-label` broken — use `gh api` labels workaround.
- framer-motion 13.x resolved (design said 12 — `pathLength` API stable).
- favicon / audio (`soundEffectUrl`) assets are placeholders.

## Delivery — 8 Stacked PRs (ALL OPEN against main, user-owned rollout)

Branch chain, merge in ORDER #2 → #9:
| PR | Branch | Slice |
|----|--------|-------|
| #2 | feat/canvas-scaffold | Scaffold (PR1) |
| #3 | feat/letters | Letters (PR2) |
| #4 | feat/validation | Score math (PR3) |
| #5 | feat/checkpoints | Order+continuity (PR4) |
| #6 | feat/canvas-ui | Canvas UI (PR5) |
| #7 | feat/modes | Modes guided (PR6a) |
| #8 | feat/modes-free | Modes free (PR6b) |
| #9 | feat/progress | Progress+screen (PR7) |

Verified tree: `feat/progress` tip `f9a66ac` (chain tip). NOT merged by this archive (user-owned).

## Pending Items (rollout, user-owned — NOT done by archive)
1. **Merge the 8-PR chain in order #2 → #9** (stacked-to-main) after archive.
2. **Run T7.1** on a real touch device (frame ≤17ms avg, 2nd finger ignored ergonomics, pointercancel clears, touch ergonomics).
3. **Decide W-2** start-point registration: acknowledge the droppable deviation or implement the extension later.

## Mechanical Copy Evidence
- Change-folder move: `git mv` of `openspec/changes/scaffold-mvp-canvas` → `openspec/changes/archive/2026-08-27-scaffold-mvp-canvas`; `diff -r` snapshot vs archive = **empty (MOVE_DIFF_EMPTY_OK)**.
- Spec promotion: 7 × `cp -R openspec/specs/{d} archive/specs/{d}`; each `diff -r` = **empty (SPEC_DIFF_EMPTY_OK)**.
- `openspec/config.yaml` updated to reflect instantiated stack (React 19 / Vite 8 / TS 7, vitest 4 runner).
- The audit trail is frozen and MUST NOT be modified.

## SDD Cycle
scaffold-mvp-canvas is fully planned, implemented, verified (pass_with_warnings), and archived. Ready for the next change.
