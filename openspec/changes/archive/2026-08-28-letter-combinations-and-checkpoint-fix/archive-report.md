# Archive Report: letter-combinations-and-checkpoint-fix

**Change**: letter-combinations-and-checkpoint-fix
**Archived**: 2026-08-28
**Archived to**: `openspec/changes/archive/2026-08-28-letter-combinations-and-checkpoint-fix/`
**Mode**: openspec (filesystem only — artifact store mode `openspec`; no Engram topics created)
**Artifacts read for this archive**: `openspec/changes/letter-combinations-and-checkpoint-fix/{proposal.md, exploration.md, design.md, tasks.md, verify-report.md, specs/letter-combinations/spec.md, specs/main-screen/spec.md, specs/trace-canvas/spec.md, specs/trace-validation/spec.md}`; base main specs `openspec/specs/{main-screen,trace-canvas,trace-validation}/spec.md`; `openspec/config.yaml`. No `reviewGate` present in structured status → receipt-driven gate structurally absent; archive proceeds under ordinary repository policy.

## Final-State Authority Note

This report describes the state of the change AT CLOSE, not at the time intermediate snapshots were written. `verify-report.md` is the authoritative verification snapshot at its time; the orchestrator's launch-prompt final-state facts (most recent account) and the persisted `tasks.md` win for any disagreement about final state. The verify-report verdict is `pass` (YAML `verdict: pass`, `critical_findings: 0`); its only WARNING is a delivery warning (untracked SVG assets), which does not block archive (no CRITICAL findings). Final numbers below are carried from the orchestrator handoff, which is the highest-ranked source for this close.

## Task Reconciliation (Task Completion Gate)

`tasks.md` as persisted showed **all 19 tasks `[x]`** (Phases 1–5): checkpoint containment fix (1.1–1.3), combination builder (2.1–2.3), overlay gate + main screen (3.1–3.4), tests (4.1–4.6), and verification (5.1–5.3). No unchecked implementation tasks remain — the Task Completion Gate passes with **no stale unchecked boxes**. The archive is recorded as **intentional-with-warnings** (delivery warning below, not an implementation defect).

## Specs Promoted to Baseline (Source of Truth)

| Domain | Action | Details |
|--------|--------|---------|
| letter-combinations | **NEW main spec created** (`openspec/specs/letter-combinations/spec.md`) | Full spec promoted from delta (6 ADDED requirements: buildCombination Invariants, Seam Continuity, Global Checkpoint Renumbering, Demo Timeline, Ordered-Pair Registry). Fixture corrected per handoff: "6 and 5 → 1..11" replaced with real counts "9 and 6 → 1..15" (a=9, c=6, combo_ac = 1..15). |
| main-screen | Updated (ADDED) | 2 requirements ADDED: **Combo Picker**, **Checkpoint Overlay Toggle** (verbatim "Mostrar puntos del trazo" toggle threaded through both modes). Existing Letter Picker / Per-Letter Progress / Family Bloom requirements preserved verbatim. |
| trace-canvas | Updated (ADDED) | 1 requirement ADDED: **Checkpoint Overlay Gate** — `showCheckpoints` prop + `(isDevMode() \|\| showCheckpoints) && devCheckpoints && devIdeal` gate; score line hidden outside dev. Existing requirements preserved verbatim. |
| trace-validation | Updated (MODIFIED) | 1 requirement MODIFIED: **Checkpoint Order Validation** — containment activation (`while` before early-continue guard), `sorted.length > 0` floor, `wrongDirection` reset on full pass, reentrant `c` scenario + co-located + empty-input scenarios added. Prior semantics retained as inline `(Previously: ...)` note. |

## Destructive-Delta Warning (config.yaml: `archive: Warn before merging destructive deltas`)

⚠️ **WARNING — substantive modification of a previously-shipped requirement.** The `trace-validation` MODIFIED `Checkpoint Order Validation` requirement changes the activation semantics of the shipped order validator: from fresh outside→inside entry activation (`orderPassed = N > 0 && !wrongDirection && activated.length === N`, `wrongDirection` never cleared) to containment activation (`orderPassed = sorted.length > 0 && activated.length === sorted.length`, `wrongDirection` resets on full pass). This is a behavioral contract change to a live requirement, not a wholesale deletion.

- **Authorization**: the orchestrator's launch prompt explicitly directed this exact merge ("trace-validation delta → merge into existing openspec/specs/trace-validation/spec.md"), and the verify-report confirms all 23/23 scenarios compliant with the new semantics (156 tests green, including the new `c`-backtrack case). The prior semantics are preserved as an inline `(Previously: ...)` note in the merged spec for traceability.
- **Rationale recorded (from delta)**: fixes reentrant `c` backtrack (head inside a pending zone never re-enters under entry-guard activation); reset fires only on a full strict pass, so genuine reversals still fail (can never activate all N).
- **Migration note**: consumers relying on `wrongDirection` staying latched across a full pass must update — the new contract heals benign re-entries on completion. (No known consumers beyond `combinations.ts`/`devCheckpointOverlay.ts`, which already target the new contract per the implementation.)

The `letter-combinations` spec is a NEW capability (no prior baseline to destroy). The `main-screen` and `trace-canvas` merges are purely additive.

## Verification (final state — from orchestrator handoff, highest-ranked source)

- **Implementation**: 19/19 tasks complete. `tasks.md` and `verify-report.md` agree on completion; no contradictions.
- **Tests**: 156 passed / 16 files (`npm test` → vitest run), 0 failed, 0 skipped. Per `verify-report.md` (validator sha256 `b0861a76…`, evidence_revision `b0861a76…`): requirements 9/9, scenarios 23/23 compliant.
- **Build**: `npm run build` (`tsc --noEmit && vite build`) clean, exit 0 (`dist` 416.47 kB / gzip 125.10 kB).
- **Diff size**: ~678 changed lines authored (under the 800 single-PR budget).
- **Verdict**: `pass` with WARNINGS; `critical_findings: 0` → archive permitted.

## Carried Warnings & Delivery Notes (NOT verification blockers)

- **W-1 (delivery, user-owned)**: `client/src/letters/svg/{b,c,d,e,f}.svg` are **untracked WIP files**. On a fresh clone `loadSvgLetters()` yields only `a` → `COMBO_REGISTRY` empty, the combo picker is hidden, and `combinations.test.ts` (asserts 12 ordered pairs) would fail. The feature's correctness depends on these assets being committed. The delivery gate (user) decides whether to include them in the PR. **No source was committed by this archive** (explicit instruction: do NOT commit anything).
- **W-2 (PR description note)**: `registry.test.ts` had a baseline failure (stale zone assertion; pre-existing) that this change fixed minimally (zone-aware). Worth a one-line PR note so reviewers don't attribute the fix to unrelated work.
- **W-3 (budget note)**: ~678 changed lines against the 800-line `single-pr` budget — fits; the untracked SVGs add ~15 lines of SVG payload; keep the PR description explicit about it.

## Suggestions (carried as advisory)

- **S-1 (APPLIED during archive)**: Spec fixture drift corrected in the promoted `letter-combinations` spec — "Orders stay strictly contiguous" scenario changed from stale `6+5 → 1..11` to real counts `a=9, c=6 → 1..15` (combo_ac). The invariant (strictly contiguous 1..N, no gaps/duplicates) is what tests assert; the fixture now matches shipped letter data.
- **S-2**: Re-run `sdd-verify` only if W-1 is resolved by committing the SVGs (otherwise combinations assertions fail on clean checkout). Not required for this archive (verdict already `pass` on the working tree).

## Delivery — Single PR (pending, user-owned)

- Implementation is complete and verified on the working tree (no commit made by this archive).
- A single PR carries all changed client source (~678 lines) plus, at the user's discretion, the untracked SVGs (`client/src/letters/svg/{b,c,d,e,f}.svg`).
- **Merge** the PR after archive (user-owned rollout). This archive does NOT merge or commit anything.
- Resolving W-1 (commit SVGs) is the only remaining gate before the combo feature works on a clean checkout.

## Mechanical Copy Evidence

- **Change-folder move**: `mv openspec/changes/letter-combinations-and-checkpoint-fix` → `openspec/changes/archive/2026-08-28-letter-combinations-and-checkpoint-fix` (used `mv` — `git mv` correctly fell back because the change dir was untracked). Pre-move recursive snapshot vs archived tree `diff -r` = **empty (MOVE_DIFF_EMPTY_OK)** — byte-identical, no truncation or alteration.
- **New main spec promotion (letter-combinations)**: mechanically `cp`'d the delta `spec.md` to `openspec/specs/letter-combinations/spec.md`, then a single targeted Edit applied the fixture correction (line 59 / 61 only). All other bytes preserved from the delta.
- **Main-spec merges (main-screen, trace-canvas, trace-validation)**: performed via targeted Edit — ADDED/MODIFIED requirement blocks inserted/replaced verbatim from the deltas; every requirement not mentioned in a delta is preserved byte-for-byte. No full-file Write-through-model occurred.
- **Readback**: the verbatim move `diff -r` (empty) is the only passing evidence; the `archive-report.md` itself is additive-only and excluded from the move comparison (it did not exist in the source snapshot).
- The audit trail is frozen and MUST NOT be modified.

## SDD Cycle

letter-combinations-and-checkpoint-fix is fully planned, implemented (19/19 tasks), verified (PASS, 9/9 requirements, 23/23 scenarios, 156 tests green), and archived — **intentional-with-warnings** for the declared delivery warning (untracked SVG assets, user-owned PR decision). Ready for the next change after the user commits the SVGs and merges the single PR.
