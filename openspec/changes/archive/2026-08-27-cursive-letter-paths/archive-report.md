# Archive Report: cursive-letter-paths

**Change**: cursive-letter-paths
**Archived**: 2026-08-27
**Archived to**: `openspec/changes/archive/2026-08-27-cursive-letter-paths/`
**Mode**: openspec (filesystem only — no Engram topics created; artifact store mode `openspec`)
**Artifacts read for this archive**: `openspec/changes/cursive-letter-paths/{exploration.md, proposal.md, design.md, tasks.md, verify-report.md, specs/letter-model/spec.md}`; `openspec/specs/letter-model/spec.md` (base, the merge target); `openspec/config.yaml`. No `reviewGate` present in structured status → receipt-driven gate structurally absent; archive proceeds under ordinary repository policy.

## Final-State Authority Note

This report describes the state of the change AT CLOSE, not at the time intermediate snapshots were written. `verify-report.md` is the authoritative verification snapshot at its time; the orchestrator's launch prompt final-state facts (most recent account) and the persisted `tasks.md` win for any disagreement about final state. Only the lower-ranked `verify-report` "pending T4.1/T4.2" claim is carried forward — but as an explicit, confirmed KNOWN PENDING USER ACTION, not as a defect, because the launch prompt and the verify report itself classify it as user-gated, not as incomplete implementation work.

## Task Reconciliation (Task Completion Gate)

`tasks.md` as persisted showed:
- **T1.1–T3.1** (6 implementation tasks, sdd-apply scope): ALL unchecked boxes present as `[x]` → complete. ✅
- **T4.1 / T4.2** (Phase 4, USER handoff): remain `[ ]` — **intentionally open, NOT stale completed work**.

T4.1/T4.2 are explicitly marked `Phase 4: Letter Authoring Handoff (USER — NOT sdd-apply)` in `tasks.md` and are forwarded as KNOWN PENDING USER ACTION final-state facts. The `verify-report` classifies them as `USER-GATED (not a defect)`. No CRITICAL findings exist, so archive is permitted. The archived `tasks.md` therefore has **no stale unchecked boxes for completed work**; only the two user-handoff tasks remain open by design. This archive is recorded as **intentional-with-warnings** (pending user action).

## Specs Promoted to Baseline (Source of Truth)

| Domain | Action | Details |
|--------|--------|---------|
| letter-model | Updated (delta merged) | 1 requirement MODIFIED (Path–Checkpoint Consistency: Kalam font-extraction REMOVED, replaced by hand-drawn single-stroke ductus model) + 5 requirements ADDED (Entry/Exit Anchor Metadata, Multi-Subpath Classification, Anchor-Aware Diagnostics, Ruled-Line Zone Map, Lowercase-Only Scope). Existing requirements (LetterConfig Shape, Registry Resolution) and the `## Open Values` section preserved verbatim. |

The merged file `openspec/specs/letter-model/spec.md` is the live source of truth. Merge performed via precise string replacement (Edit) of the Kalam requirement block followed by insertion of the 5 ADDED requirements before `## Open Values`; unchanged content preserved byte-for-byte.

## Destructive-Delta Warning (config.yaml: `archive: Warn before merging destructive deltas`)

⚠️ **WARNING — destructive merge executed.** The delta's MODIFIED `Path–Checkpoint Consistency` requirement **removes** the prior Kalam-Regular font-extraction contract (`guideD` contour fill, `ideal` glyph-body AREA cloud, "extracted from Kalam-Regular glyph outlines"). This is a destructive deletion of a previously stated requirement.

- **Authorization**: the orchestrator's launch prompt explicitly directed this exact merge ("the delta's MODIFIED Path–Checkpoint Consistency block replaces the base requirement — Kalam extraction REMOVED") and instructed recording the warning in this report. The verify-report confirms zero font-extraction references remain in `svgLetter.ts` (grep-confirmed), so the removal is consistent with the shipped implementation on commit `c4e1c4d`.
- **Reason recorded (from delta)**: "Kalam extraction REMOVED — `ideal` derives from the stroke centerline + perpendicular band (as `buildLetterConfig` already does), checkpoints follow the ductus, entry/exit anchors become per-letter metadata. No OpenType, no font extraction."
- **Migration note**: consumers reading `guideD` as a FILL must update — the new model sets `guideD: undefined` and emits `ideal` as a centerline-plus-band cloud; existing scoring (`min` distance to `ideal` cloud) is preserved.

## Verification (final state)

Per `verify-report.md` (admitted, validator sha256 `0b939be9…`, evidence_revision `0c7f7211…`):
- **Verdict**: `pass` — `blockers: 0`, `critical_findings: 0`. No CRITICAL findings → archive permitted.
- **Requirements**: 6/6 compliant. **Scenarios**: 12/12 compliant (all with passing covering tests; R5 via static scope inspection + default-path tests).
- **Tests**: `npm test -w client` → 135 passed / 14 files, exit 0 (hash `d6b6f736…`).
- **Build**: `npm run build -w client` → `tsc --noEmit && vite build` green, exit 0 (hash `f296cd9a…`).
- **Commit verified**: `c4e1c4d` (feat(letters): classify multi-subpath ductus with anchor-aware diagnostics), 10 files, +574/−128.

## Known Pending User Action (T4.1 / T4.2) — do NOT lose

This is the explicit follow-up the archive must preserve. The pipeline is complete and green on `c4e1c4d`; the remaining work is USER-authored content with no hard code dependency.

- **T4.1** — USER authors 25 lowercase SVGs `client/src/letters/svg/b…z.svg` (`a.svg` already exists and complies) per the rewritten README (`client/src/letters/svg/README.md`, authored in T3.1). Per-letter acceptance: entry starts ≈ baseline-left (Y≈420); exit per the 26-letter table (default baseline-right; `o r v w` top-right; `e` mid-right); ONE `<path>` element (Inkscape Ctrl+K / Figma flatten); `i`/`j` dot, `t`/`f` cross, `x` second diagonal combined as subpaths drawn after the main stroke.
- **T4.2** — Verify-phase cross-check once letters are authored:
  - `x.svg` second-diagonal ductus vs the first real SVG (validated against authored `x.svg`).
  - `f.svg` exit vs Zaner-Bloser reference (baseline-right, asterisk note in proposal).
  - `a.svg` compliance reconfirmed.

**Follow-up checklist for the next owner** (so the follow-up verification is not lost):
1. USER drops `b…z.svg` into `client/src/letters/svg/` (eager Vite glob picks them up automatically — no code change).
2. Re-run `npm test -w client` → must stay green (classification/diagnostics suites use synthetic fixtures + real `a.svg` only).
3. Run T4.2 cross-checks (x ductus, f exit vs Zaner-Bloser, a compliance).
4. Optionally re-run `sdd-verify` to close the Phase-4 verification gap.

No hard pipeline dependency on the missing SVGs: eager glob yields `{}` → registry falls back to Kalam seeds; all assertions are presence-based (`toContain`, `Object.keys`), per T2.2.

## Suggestions (carried as advisory, not blockers)

- **S-1**: Stale "Kalam" wording lingers in legacy seed/validation *data* comments (`letra_a.ts`, `letra_c.ts`, `ideal_a.ts`, `ideal_c.ts`, `canvas/validation/constants.ts`, `validation/score.ts`) — they describe fallback seed DATA, not the pipeline (grep-confirmed `svgLetter.ts` has zero font-extraction). A doc-comment cleanup can ride a later change.
- **S-2**: `f` exit is documented but only verifiable against authored `f.svg` — covered by T4.2.

## Delivery — Single PR (pending, user-owned)

- Implementation commit `c4e1c4d` is complete and verified. A single PR carries all 10 files (+574/−128).
- **Merge** the PR after archive (user-owned rollout). The change is NOT merged by this archive.
- SVG authoring (T4.1) is a subsequent user action; the SVGs are new files that can land in a follow-up commit/PR.

## Mechanical Copy Evidence

- Change-folder move: `mv openspec/changes/cursive-letter-paths` → `openspec/changes/archive/2026-08-27-cursive-letter-paths`; `diff -r` of pre-move recursive snapshot vs archived tree = **empty (MOVE_DIFF_EMPTY_OK)** — byte-identical, no truncation or alteration.
- Spec merge: performed via precise Edit of `openspec/specs/letter-model/spec.md`; unchanged requirements and `## Open Values` preserved verbatim. The archive-report file itself is additive-only and excluded from the move comparison (it did not exist in the source snapshot).
- The audit trail is frozen and MUST NOT be modified.

## SDD Cycle

cursive-letter-paths is fully planned, implemented (Phases 1–3), verified (PASS, 6/6 requirements, 12/12 scenarios, 135 tests green), and archived — **intentional-with-warnings** for the declared user-gated Phase-4 SVG authoring (T4.1/T4.2). Ready for the next change after the user authors `b…z.svg` and runs the T4.2 follow-up verification.
