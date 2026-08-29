# Archive Report: word-building

**Change**: word-building
**Archived**: 2026-08-29
**Archived to**: `openspec/changes/archive/2026-08-29-word-building/`
**Mode**: openspec (filesystem only — artifact store mode `openspec`; no Engram topics created by this phase beyond the final mem_save summary, per the launch directive)
**Artifacts read for this archive**: `openspec/changes/word-building/{proposal.md, exploration.md, design.md, tasks.md, verify-report.md, specs/letter-combinations/spec.md, specs/letter-model/spec.md, specs/main-screen/spec.md, specs/trace-canvas/spec.md, specs/guided-trace-mode/spec.md}`; base main specs `openspec/specs/{letter-combinations, letter-model, main-screen, trace-canvas, guided-trace-mode}/spec.md`; `openspec/config.yaml`. No `reviewGate` present in structured status (gentle-ai binary UNAVAILABLE; no reviews) → receipt-driven gate structurally absent; archive proceeds under ordinary repository policy.

## Final-State Authority Note

This report describes the state of the change AT CLOSE, not at the time intermediate snapshots were written. `verify-report.md` is the authoritative verification snapshot at its time (verdict `pass`, `critical_findings: 0`, `requirements: 13/13`, `scenarios: 30/43`). The orchestrator's launch-prompt final-state facts (most recent account) and the persisted `tasks.md` win for any disagreement about final state. The verify-report verdict is `pass` with WARNINGS — the only warnings are the manual-browser lane (runtime behaviors) and pre-existing spec-text drifts, neither of which is CRITICAL. Final numbers below are carried from the orchestrator handoff and the T7 re-verification section of `verify-report.md`, which is the highest-ranked source for this close.

## Task Reconciliation (Task Completion Gate)

`tasks.md` as persisted shows **all implementation tasks `[x]`**: T1.1–T1.4 (model), T2.1–T2.8 (`buildWord`), T3.1–T3.2 (registry), T4.1–T4.3 (demo pipeline), T5.1–T5.4 (word UI), T6.1–T6.2 (rail/E2E), T7.1–T7.4 (remediation). No unchecked **implementation** task remains — the Task Completion Gate passes.

The `tasks.md` "Acceptance" block has 3 unchecked bullets plus 1 checked:
- `[ ] n=1 passthrough; unknown/Kalam throw; d single-M 24-step seams`
- `[ ] t/i/j last in d+timeline+checkpoints; x immediate`
- `[ ] Segments 1000/2600/500/600ms; single letter no properties.d; SSR array→N, single→1`
- `[x] Toggle-off hides overlay; picker gone; keyboard/Borrar; progress len-1 only`

These 3 unchecked acceptance bullets are **stale checkboxes**, not implementation tasks: every behavior they list is node-verified by the completed T-tasks and the 187/187 vitest suite (`wordBuilding.test.ts`, `TraceCanvas.test.tsx` SSR), and the overlay/toggle/keyboard behaviors were confirmed by the user's manual browser pass (see User Validation). Per the gate's exception clause, the orchestrator's handoff + `verify-report`/`tasks.md` prove every unchecked item complete, so they are reconciled as **done at close**. Recorded explicitly: the archive is **intentional-with-warnings** for the declared browser-lane and authoring-pending items (below), not for any open implementation defect.

## Specs Promoted to Baseline (Source of Truth)

| Domain | Action | Details |
|--------|--------|---------|
| letter-combinations | **Updated** | `buildCombination Invariants` → **RENAMED + MODIFIED** to `buildWord Invariants` (no length cap, multi-subpath allowed, `d` single-`M`); `Seam Continuity` **MODIFIED** (20px chord gap + 24-step Bézier connector, `prevEffectiveExit`); `Global Checkpoint Renumbering` **MODIFIED** (deferred secondaries last, ±8px connector band); `Demo Timeline` **MODIFIED** (per-segment `draw_path`, 1000/2600/500/600ms, `properties.d`); `Ordered-Pair Registry` **REMOVED**. |
| letter-model | **Updated** | `LetterConfig Shape` **MODIFIED** (`optional mainEndArc`, single-`M` cut); `Ruled-Line Zone Map` **MODIFIED** (`f` → `mixta` 'fj', fits Y=180–540); **ADDED** `Secondary Deferral Set` (`DEFERRED_SECONDARY_CHARS = {t,i,j}`, `x` immediate); **ADDED** `Word Eligibility` (`isWordEligible`). |
| main-screen | **Updated** | `Letter Picker` **MODIFIED** (append + replay whole-word demo, remount keyed by `word.join('')`); `Per-Letter Progress Display` **MODIFIED** (persist only when `word.length === 1`); **ADDED** `Keyboard Word Building` (a–z append, Backspace+preventDefault, modifiers/space ignored, focused-input exempt, Borrar clears); `Combo Picker` **REMOVED**. |
| trace-canvas | **Updated** | `Viewport and Ruled Lines` **MODIFIED** (4 guides: Y=180/300/420/540, descender at Y=540); `Checkpoint Overlay Gate` **MODIFIED** (gate `showCheckpoints && devCheckpoints && devIdeal`; dev no longer forces overlay; `showScore = isDevMode()`); **ADDED** `Multi-Step Demo Rendering` (`DrawDemo` single or array). |
| guided-trace-mode | **Updated** | `Guided Demo Playback` **MODIFIED** (plays ALL `draw_path` steps, per-entry delay/duration/`properties.d`, single-letter fallback; ready at max(delay+duration)+200). |

All renamed/modified requirements carry an inline `(Previously: ...)` note for traceability. Unchanged requirements in each domain were preserved byte-for-byte.

## Destructive-Delta Warning (config.yaml: `archive: Warn before merging destructive deltas`)

⚠️ **WARNING — substantive modification/removal of previously-shipped requirements.** This change removes two shipped requirements (`Ordered-Pair Registry` in `letter-combinations`, `Combo Picker` in `main-screen`) and changes the behavioral contracts of several live requirements:
- `buildWord Invariants` (was `buildCombination`): now uncapped length, multi-subpath members accepted, explicit 24-step connector — a contract change, not a wholesale deletion.
- `Checkpoint Overlay Gate`: gate changed from `(isDevMode() || showCheckpoints) && …` to `showCheckpoints && …` — dev mode no longer forces the overlay.
- `Guided Demo Playback`: now plays every `draw_path` step (was first only).
- `Ruled-Line Zone Map`: `f` moved `alta` → `mixta`, changing the fit span to Y=180–540 (remediated from manual browser feedback).

- **Authorization**: the orchestrator's launch prompt explicitly directed this exact merge ("sync the 5 delta specs into the main specs"); `verify-report.md` confirms `verdict: pass`, `critical_findings: 0`, 13/13 requirements with positive evidence; the T7 re-verification section confirms the 3 amended requirements **3/3 PASS** on node + user manual browser pass. Prior semantics are preserved as inline `(Previously: …)` notes in the merged specs.
- **Migration note**: consumers relying on `buildCombination`/`COMBO_REGISTRY` or the `isDevMode()`-forced overlay must update (the implementation already targets the new contracts per `combinations.ts`, `TraceCanvas.tsx`, `MainScreen.tsx`). No known remaining consumers beyond those modules.

## Verification (final state — from T7 re-verification section of `verify-report.md` + orchestrator handoff, highest-ranked sources)

- **Implementation**: all 27 implementation task rows (T1.1–T7.4, T6.1–T6.2) `[x]`; no incomplete implementation tasks.
- **Tests**: `npx vitest run` → exit 0 | **187 passed / 187**, **18 files** (`client/`). Zero failures, zero skips, zero regressions vs pre-T7 180. Per `verify-report.md` T7 section (evidence_revision `sha256:73869a…`).
- **Build**: `npm run build` (`tsc --noEmit && vite build`, 449 modules) → exit 0.
- **T7 remediation re-verification**: 3/3 amended requirements PASS — `f`→`mixta` (letter-model), 4th full-width guide at Y=540 (`trace-canvas`), append returns flow to guided + replays whole-word demo (`main-screen`).
- **Verdict**: `pass` with WARNINGS; `critical_findings: 0` → archive permitted (no CRITICAL findings to block).

## User Validation Status

- **Manual browser E2E**: the user confirmed the manual browser pass for the remediation items and the standing manual lane — "listo" (4th guide line visible at Y=540, `f` fitted to the `mixta` 180–540 span, append restarts the whole-word sequential demo, toggle gate works, keyboard/Borrar, progress `len===1` only). The browser-only runtime behaviors (framer-motion sequencing, keydown dispatch, overlay rAF render) that vitest's `node` env cannot execute were confirmed by this manual pass.
- **f.svg redraw**: a PENDING AUTHORING task, NOT a defect. The user will re-author `f` in Inkscape (entry hook at baseline) after merge; the pipeline already maps `f` → `mixta` (180–540) and will consume the redraw unchanged. `client/` source was NOT touched in this phase.

## Known Pending Items (carried, NOT verification blockers)

- **P-1 (user authoring, not a defect)**: `f.svg` redraw at baseline — owned by the user in Inkscape; pipeline already targets `mixta`. No code change required here.
- **P-2 (browser-lane warning, carried)**: framer-motion `pathLength` sequencing + keydown dispatch + overlay rAF render are statically verified and manually passed by the user; no browser harness exists in-repo (no playwright/puppeteer/jsdom). Never claimed as vitest-covered; not CRITICAL.
- **P-3 (pre-existing, OUT OF SCOPE — preserved, not silently "fixed")**: stale seed figures in `openspec/specs/letter-model/spec.md` — Seed `c` radii `40/35/40/40/45` (real `50/45/45/50/50`) and Seed `a` oval apex `480,200` (real `538.6,186.8`); also the W2 seam-`u` wording drift between proposal and spec. These are documentation defects from an earlier change, explicitly excluded from this archive ("do NOT fix them silently, just preserve them in the merge"). The `word-building` deltas do not alter those scenario texts, so they remain verbatim in the merged baseline. Requires no code change.

## Mechanical Copy Evidence

- **Change-folder move**: `mv openspec/changes/word-building` → `openspec/changes/archive/2026-08-29-word-building` (used `mv` — `git mv` correctly fell back because the change dir was untracked). Pre-move recursive snapshot vs archived tree `diff -r` = **empty (MOVE_DIFF_EMPTY_OK)** — byte-identical, no truncation or alteration.
- **Main-spec merges** (`letter-combinations`, `letter-model`, `main-screen`, `trace-canvas`, `guided-trace-mode`): performed via targeted `Edit` — each ADDED/MODIFIED/RENAMED/REMOVED requirement block applied verbatim from the deltas; every requirement NOT mentioned in a delta is preserved byte-for-byte. No full-file Read→Write reproduction of artifact content occurred (Mechanical Copy Contract honored for merges — only the folder move used shell `mv`/`diff -r`).
- **Readback**: the verbatim move `diff -r` (empty) is the only passing evidence; this `archive-report.md` is additive-only and excluded from the move comparison (it did not exist in the source snapshot).
- The audit trail is frozen and MUST NOT be modified.

## Delivery — Single PR (pending, user-owned)

- Implementation is complete and verified on the working tree (no commit made by this archive — explicit instruction: do NOT commit anything).
- A single PR carries the changed `client/` source plus, at the user's discretion, the `f.svg` redraw (`client/src/letters/svg/f.svg`).
- **Merge** the PR after archive (user-owned rollout). This archive does NOT merge or commit anything.
- Resolving P-1 (commit the redrawn `f.svg`) is the only remaining authoring gate before the `mixta` fit of `f` is exercised on a clean checkout; the pipeline code is already correct.

## SDD Cycle

word-building is fully planned, implemented (27/27 implementation tasks), verified (PASS, 13/13 requirements with positive evidence, 187/187 vitest, build green, T7 3/3 amended PASS, user manual browser pass "listo"), and archived — **intentional-with-warnings** for the declared browser-lane and authoring-pending items (P-1/P-2/P-3, none blocking). Ready for the next change after the user commits the redrawn `f.svg` and merges the single PR.
