```yaml
schema: gentle-ai.verify-result/v1
evidence_revision: sha256:73869a2ddc2e5a2f852024f9bd5c82ce04d33a6822c90b126b7b4b7f02da3e92
verdict: pass
blockers: 0
critical_findings: 0
requirements: 13/13
scenarios: 30/43
test_command: npx vitest run
test_exit_code: 0
test_output_hash: sha256:0add470169e7c9e41d952b599562fd8718d42ae76c9b1efa791a7241b949ca2e
build_command: npm run build
build_exit_code: 0
build_output_hash: sha256:bc4fd3ea1fe48427e2bfc08407b592c21631fff534b367d857f66037f915022e
```

## Verification Report

**Change**: word-building
**Version**: N/A (delta specs, post-proposal)
**Mode**: Standard (strict_tdd: false — no Strict TDD module loaded)
**Validator note**: `gentle-ai sdd-verify-validate` could not be invoked — the session preflight declares the gentle-ai binary UNAVAILABLE and forbids attempting it (no reviews, no correction budget). Admission validation was therefore delegated to the orchestrator; the report is persisted on its explicit directive.

### Verification Method

1. Read the acceptance contract: 5 delta specs (`letter-combinations`, `letter-model`, `main-screen`, `trace-canvas`, `guided-trace-mode`) — **13 requirements, 43 scenarios** counted from the spec files; `tasks.md` (23 checked task rows T1.1–T6.2 + 4 acceptance items); `design.md` (8 architecture decisions, buildWord algorithm, open questions); `proposal.md` (binding decisions 1–10); Engram `sdd/word-building/apply-progress` (#1001).
2. Executed the declared commands from `client/`: `npx vitest run` and `npm run build` (`tsc --noEmit && vite build`), exit codes and output hashes in the envelope above.
3. Inspected every changed source file against the spec deltas: `types.ts`, `anchors.ts`, `svgLetter.ts`, `combinations.ts`, `registry.ts`, `MainScreen.tsx`, `guidedTrace.tsx`, `TraceCanvas.tsx`, plus the test suites `wordBuilding.test.ts`, `combinations.test.ts`, `svgLetter.test.ts`, `TraceCanvas.test.tsx`, `App.test.tsx`, `modes.test.ts`.
4. Resolved the seam `u` open question (design decision 4) and the flagged apply deviations (see sections below).

### Completeness

| Metric | Value |
|--------|-------|
| Tasks total (checked rows in tasks.md) | 23 |
| Tasks complete | 23 |
| Tasks incomplete | 0 |
| Acceptance checklist items | 4 (3 resolved by this verification; 1 partially — browser runtime pending manual) |

> Note: apply-progress reported "22 tasks" and the launch preflight "24 tasks"; the tasks.md file itself contains 23 checked task rows (4+8+2+3+4+2). The canonical file count governs. No impact on the verdict.

### Build & Tests Execution

**Build**: ✅ Passed (exit 0)
```text
> @cursiva/client@0.1.0 build
> tsc --noEmit && vite build

vite v8.2.2 building client environment for production...
transforming...
✓ 449 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                  0.43 kB │ gzip:   0.28 kB
dist/assets/index-Dv-AERV3.js  418.91 kB │ gzip: 126.16 kB

✓ built in 231ms
```

**Tests**: ✅ 180 passed / 18 files, 0 failed, 0 skipped — exact output:
```text
 RUN  v4.1.11 /home/opencode/projects/cursiva/client

 Test Files  18 passed (18)
      Tests  180 passed (180)
   Start at  04:00:36
   Duration  3.95s (transform 1.26s, setup 0ms, import 4.17s, tests 2.87s, environment 4ms)
```

**Coverage**: ➖ Not available (no coverage threshold configured in this project)

### Spec Compliance Matrix

| Requirement | Scenario | Test / Evidence | Result |
|-------------|----------|-----------------|--------|
| **letter-combinations** | | | |
| buildWord Invariants | Single letter passes through | `wordBuilding.test.ts > n=1 returns the registry config object UNCHANGED`; `combinations.test.ts > n=1 passthrough still returns the registry config UNCHANGED` | ✅ COMPLIANT |
| buildWord Invariants | Multi-subpath member accepted | `wordBuilding.test.ts > t/i secondaries come LAST in d` (buildWord(['t','i']), both multi-subpath) | ✅ COMPLIANT |
| buildWord Invariants | Longer words build | `wordBuilding.test.ts > builds longer words: 4 letters, 3 connectors, per-segment timeline, fade at max+200` | ✅ COMPLIANT |
| buildWord Invariants | Word-ineligible member refused | `wordBuilding.test.ts > throws for unregistered names and the empty word` (throw path `combinations.ts:142-145`); `isWordEligible(letraA) === false` (wordBuilding.test.ts:266). The registered-but-ineligible throw is reachable only with crafted data (every registered letter is entry-matched today) — predicate proven directly. | ✅ COMPLIANT |
| Seam Continuity | Gap lands 20px along the entry tangent | `combinations.test.ts > the translated c entry lands EXACTLY on round2(exit_a − 20·u)` (≤1e-6) + vector-contract test `wordBuilding.test.ts:90-100` | ✅ COMPLIANT (proposal `u` — see resolution section) |
| Seam Continuity | Seam is a 24-step Bézier | `combinations.test.ts > exposes exactly 24 uniform steps whose ends follow the joining strokes tangent directions`; `wordBuilding.test.ts > emits exactly 24 connector steps` | ✅ COMPLIANT |
| Seam Continuity | Effective exit differs by letter | `x` → second diagonal: `wordBuilding.test.ts > x second diagonal is IMMEDIATE` (flat[k] === xFlat[k] through x's full stroke ⇒ seam P0 = x d end). `t` → main end: only composition-based evidence (segments `[tCut+1, 24, iCut+1, tTail, iTail]` implies P0 = t main end, `combinations.ts:197` `isDeferred ? translatedExit : flatEnd`). | ⚠️ PARTIAL (t branch inferred, not directly asserted) |
| Seam Continuity | Anchor metadata spans the word | `wordBuilding.test.ts > anchors span the word: first member entry, last effective exit on the d end`; code `combinations.ts:332-335` | ✅ COMPLIANT |
| Global Checkpoint Renumbering | Orders stay strictly contiguous | `wordBuilding.test.ts > a + c renumber to exactly 1..N`; `combinations.test.ts > renumbers a+c to exactly 1..N with no gaps or duplicates, names kept` (asserts invariant generically; spec's illustrative 9+6→1..15 predates current seed counts — see SUGGESTION S1) | ✅ COMPLIANT |
| Global Checkpoint Renumbering | Deferred checkpoints number last | `wordBuilding.test.ts > t and i deferred checkpoints are numbered LAST, owning the highest orders` (word order inside the deferred block asserted) | ✅ COMPLIANT |
| Demo Timeline | Segments draw sequentially | `combinations.test.ts > builds one draw_path per segment with cumulative delays and properties.d` (1000/2600 → 3600/500 → 4100/2600; fade 6700+200) | ✅ COMPLIANT |
| Demo Timeline | Deferred secondaries scheduled last | `combinations.test.ts > defers t/i secondary steps to the end` (durations [2600,500,2600,600,600]) | ✅ COMPLIANT |
| Demo Timeline | `x` second diagonal is immediate | `wordBuilding.test.ts` + `combinations.test.ts > schedules the x second diagonal inside its letter block` ([1000,2600],[3600,600],[4200,500],[4700,2600]) | ✅ COMPLIANT |
| Demo Timeline | Single letter unchanged | `wordBuilding.test.ts > n=1 … (no properties.d on its step)`; n=1 passthrough returns registry config (`svgLetter.ts:819-825` single draw_path 1000/2600) | ✅ COMPLIANT |
| Ordered-Pair Registry (REMOVED) | Registry dropped | `combinations.test.ts > no longer exports COMBO_REGISTRY`; `registry.ts` has no COMBO_REGISTRY; `App.test.tsx:30-31` no combo nav | ✅ COMPLIANT |
| **letter-model** | | | |
| Secondary Deferral Set | t/i/j deferred to word end | `wordBuilding.test.ts > t/i secondaries come LAST in d`; set equality `DEFERRED_SECONDARY_CHARS === {t,i,j}` (wordBuilding.test.ts:267-269); `anchors.ts:44` | ✅ COMPLIANT |
| Secondary Deferral Set | x secondary is immediate | `wordBuilding.test.ts > x second diagonal is IMMEDIATE` (d and timeline) | ✅ COMPLIANT |
| Word Eligibility | Entry-matched letter passes (even when d.end is a secondary) | `svgLetter.test.ts > passes an entry-matched synthetic multi-subpath letter even though d.end is its dot` | ✅ COMPLIANT |
| Word Eligibility | Kalam seed rejected | `svgLetter.test.ts:792` and `wordBuilding.test.ts:266` (isWordEligible(letraA) false); `svgLetter.ts:847-852` (dist ≤ 15px, no d.end requirement) | ✅ COMPLIANT |
| LetterConfig Shape | Seed `c` replicates docs/07 verbatim | `letra_c.test.ts` (path verbatim, orders 1–5, names, Q-ductus, radii **50/45/45/50/50**) — spec text says radii 40/35/40/40/45: stale figure, data supersedes (see WARNING W3) | ⚠️ PARTIAL (orders/path/names proven; spec radii figure contradicts evidence) |
| LetterConfig Shape | Seed `a` is the keystone | `letra_a.test.ts` (6 checkpoint names incl. inicio_enganche/cresta_ola/gancho_salida/bajada_pie/cierre_ovalo, orders 1–6, co-located entry/cierre pair) — spec text "apex at 480,200" contradicts data (cresta [538.6,186.8]; co-located pair [467.8,413.2]): stale figure (see WARNING W3) | ⚠️ PARTIAL (structure proven; spec apex figure contradicts evidence) |
| LetterConfig Shape | Checkpoint ordering is strict | `letra_a.test.ts > orders are exactly 1..6 with no gaps or duplicates`; `letra_c.test.ts > carries 5 checkpoints: orders exactly 1-5`; word-level renumber asserted too | ✅ COMPLIANT |
| LetterConfig Shape | Main-end arc recorded for multi-subpath letters | `svgLetter.test.ts > mainEndArc storage … exactly one M`; absent for single-subpath (`svgLetter.test.ts > undefined`); `svgLetter.ts:807-809` stores only when `flat.starts.length > 1` | ✅ COMPLIANT |
| **main-screen** | | | |
| Keyboard Word Building | Letter appends on keydown | `wordBuilding.test.ts > appends a registered eligible letter`; mode kept: `setMode` never invoked on append (`MainScreen.tsx:62-67,168-184`); listener wiring `MainScreen.tsx:72-100` (event dispatch is browser runtime — manual pass) | ✅ COMPLIANT (logic + invariant; dispatch manual) |
| Keyboard Word Building | Backspace removes and prevents default | `wordBuilding.test.ts > Backspace pops the last letter`; `e.preventDefault()` at `MainScreen.tsx:85-86` (browser-only behavior) | ⚠️ PARTIAL (pop proven; preventDefault runtime manual) |
| Keyboard Word Building | Modifiers, uppercase, and space ignored | `wordBuilding.test.ts > uppercase, modifiers, space, and unknown keys are ignored`; modifier-flag guard `MainScreen.tsx:83-84` | ✅ COMPLIANT |
| Keyboard Word Building | Focused input exempt | `MainScreen.tsx:74-82` activeElement guard (INPUT/TEXTAREA/contentEditable) — static inspection only; browser runtime manual | ⚠️ PARTIAL |
| Keyboard Word Building | Borrar clears the word | `MainScreen.tsx:152-166` onClick → `setWord([])`; empty-word render proven by `App.test.tsx > an empty word renders the placeholder` (via `initialWord={[]}`) | ⚠️ PARTIAL (render proven; click runtime manual) |
| Letter Picker | Selecting a letter appends and keeps mode | append = `nextWord` wrapper (`MainScreen.tsx:62-67`) — logic proven by nextWord suite; mode untouched; SSR picker renders (`App.test.tsx:28-37`) | ✅ COMPLIANT (click wiring manual) |
| Letter Picker | Remount key follows the word | `key={wordKey}` invariant, `wordKey = word.join('')` (`MainScreen.tsx:48,172,179`) | ✅ COMPLIANT (static invariant) |
| Letter Picker | Word-ineligible letter refused | `nextWord` returns null for unregistered/ineligible (`MainScreen.tsx:38-40`; `wordBuilding.test.ts:313` for 'z'); ineligible-registered case is data-gated like buildWord | ✅ COMPLIANT |
| Letter Picker | Empty word shows placeholder | `App.test.tsx > an empty word renders the placeholder: no canvas, no current-word label` | ✅ COMPLIANT |
| Per-Letter Progress Display | Stored progress shown | Button renders `{cfg.character} · {progress[key]}%` from `store.getProgress` (`MainScreen.tsx:51-53,120-132`) — static invariant, no dedicated test | ✅ COMPLIANT (static) |
| Per-Letter Progress Display | Progress refreshes | `onEvaluate` → `store.setProgress` + `setProgress` state update (`MainScreen.tsx:102-108`); runtime refresh path (free-trace completion) is browser — manual pass | ⚠️ PARTIAL |
| Per-Letter Progress Display | Multi-letter completion not persisted | Guard `if (word.length !== 1) return` (`MainScreen.tsx:104`) — static invariant, no dedicated test | ✅ COMPLIANT (static) |
| **trace-canvas** | | | |
| Multi-Step Demo Rendering | Array renders one path per demo | `TraceCanvas.test.tsx > an array renders one stroke-#0284c7 path per entry, each with its own d` (2 entries → 2 paths; mechanism is N→N) | ✅ COMPLIANT |
| Multi-Step Demo Rendering | Single object unchanged | `TraceCanvas.test.tsx > a single DrawDemo object renders exactly one path` (+ absent → 0 paths) | ✅ COMPLIANT |
| Checkpoint Overlay Gate | Toggle reveals overlay in production | `TraceCanvas.tsx:92` `devOn = showCheckpoints && !!devCheckpoints && !!devIdeal` (no isDevMode in gate); overlay block `:202-207`; `showScore = isDevMode()` (`:206`) — runtime render is rAF-driven (browser) → T6.2 manual E2E pending | ⚠️ PARTIAL (static verified; runtime manual) |
| Checkpoint Overlay Gate | Overlay stays hidden when toggle is off | Toggle-off ⇒ `devOn` false ⇒ overlay never renders regardless of dev state (`TraceCanvas.tsx:92,202`) — browser E2E (T6.2) pending manual | ⚠️ PARTIAL (static verified; runtime manual) |
| Checkpoint Overlay Gate | Dev mode no longer forces the overlay | Gate drops `isDevMode() ||` (previous behavior removed); dev alone cannot satisfy `showCheckpoints` — verified in code `TraceCanvas.tsx:92` | ⚠️ PARTIAL (static verified; runtime manual) |
| Checkpoint Overlay Gate | Dev toggle ON shows overlay with score | `devOn` true + data → overlay; score line renders dev-only via `showScore` (`TraceCanvas.tsx:202-207`) | ⚠️ PARTIAL (static verified; runtime manual) |
| **guided-trace-mode** | | | |
| Guided Demo Playback | Multi-step word demo plays sequentially | Every `draw_path` → `DrawDemo[]` with own delay/duration and `properties.d` (`guidedTrace.tsx:80-89`); `readyMs = max(delay + duration) + 200` (`:91`); demo array rendering proven SSR (`TraceCanvas.test.tsx`); framer-motion sequencing runtime is browser — manual pass | ⚠️ PARTIAL (mapping + readyMs static; runtime manual) |
| Guided Demo Playback | Single-letter fallback draws the letter path | Fallback `(s.properties?.d) ?? letter.pathDefinition.d` (`guidedTrace.tsx:84`); single-letter draw_path carries no properties (`svgLetter.ts:819-825`) — static invariant | ✅ COMPLIANT (static) |
| Guided Demo Playback | Input ignored during demo | `enabled={phase === 'ready'}` (`guidedTrace.tsx:126`) gates pointer capture while the demo plays; useTraceInput disabled — static; runtime manual | ⚠️ PARTIAL (static verified; runtime manual) |

**Compliance summary**: 30/43 scenarios fully compliant, 13/43 partial (browser-runtime behaviors pending the manual E2E pass, or minor indirect/dead-data evidence), 0 untested, 0 failing. All 13 requirements have positive evidence; none CRITICAL.

### Requirement Verdicts (requirement → level → evidence)

| Requirement | Level | Evidence |
|-------------|-------|----------|
| buildWord Invariants | ✅ no issue | wordBuilding.test.ts:237-284, combinations.test.ts:192-203 |
| Seam Continuity | ⚠️ WARNING (spec wording only) | implementation/tests assert proposal `u` (combinations.ts:172-175) — spec text conflict, see resolution below |
| Global Checkpoint Renumbering | ✅ no issue (SUGGESTION: stale 9+6 example) | wordBuilding.test.ts:223-234 |
| Demo Timeline | ✅ no issue | combinations.test.ts:122-189, wordBuilding.test.ts:272-284 |
| Ordered-Pair Registry (REMOVED) | ✅ no issue | combinations.test.ts:192-198 |
| Secondary Deferral Set | ✅ no issue | anchors.ts:44, wordBuilding.test.ts:133-220 |
| Word Eligibility | ✅ no issue | svgLetter.ts:847-852, svgLetter.test.ts:785-804 |
| LetterConfig Shape | ⚠️ WARNING (stale spec figures, pre-existing) | letra_c.test.ts:46-51, letra_a.test.ts:21-53 vs spec text |
| Keyboard Word Building | ⚠️ WARNING (browser runtime pending manual) | nextWord suite + MainScreen.tsx:72-100 |
| Letter Picker | ✅ no issue (manual click note) | App.test.tsx:28-44, nextWord suite |
| Per-Letter Progress Display | ⚠️ WARNING (refresh runtime + guard untested at runtime) | MainScreen.tsx:102-108 |
| Multi-Step Demo Rendering | ✅ no issue | TraceCanvas.test.tsx:18-36 |
| Checkpoint Overlay Gate | ⚠️ WARNING (E2E pending manual) | TraceCanvas.tsx:92,202-207 |
| Guided Demo Playback | ⚠️ WARNING (sequencing/input-gating runtime pending manual) | guidedTrace.tsx:80-91,126 |

### Correctness (Static Evidence — flagged deviations)

| Deviation | Verdict | Notes |
|-----------|---------|-------|
| `initialWord?` test-only prop on MainScreen | ✅ Benign | Documented "test seam" (`MainScreen.tsx:23-26`); used only by `App.test.tsx:40` for the empty-word placeholder scenario; default behavior (open on first letter) unchanged. |
| `mainEndArc` only for multi-subpath | ✅ Benign | Matches spec letter-model: "Present ONLY for multi-subpath letters; absent ⇒ single-subpath, cut at d end" (`svgLetter.ts:804-809`; `types.ts:72-76`). |
| dx/dy unrounded | ✅ Benign | Deliberate (`combinations.ts:165-167`): `transformPathD` rounding reproduces the placed entry exactly — tests assert placement ≤1e-6 (`combinations.test.ts:45`). |
| Work units 2+3 merged | ✅ Benign | Transactional necessity (buildWord rewrite forces COMBO_REGISTRY deletion in one commit, `724a7f8`); documented in apply-progress (#1001, C2); tasks.md rows remain individually checked. |
| Synthetic letters registered per test file | ✅ Benign | `wordBuilding.test.ts:68-70`, `combinations.test.ts:133-135`; vitest isolates module state per file, so the shared registry is untouched for other suites; documented in both files. |

### Coherence (Design)

| Decision | Followed? | Notes |
|----------|-----------|-------|
| D1 buildWord replaces buildCombination; n=1 passthrough | ✅ Yes | combinations.ts:136-150 |
| D2 mainEndArc stored only when multi-subpath | ✅ Yes | svgLetter.ts:807-809 |
| D3 Cut: arc-walk at mainEndArc, else nearest vertex to translated exit | ✅ Yes | combinations.ts:190-193 |
| D4 Seam u = normalize(prevEffectiveExit − entryNatural) | ✅ Yes | combinations.ts:171-179; tested both files |
| D5 DEFERRED_SECONDARY_CHARS {t,i,j}; x → d end | ✅ Yes | anchors.ts:44; combinations.ts:197 |
| D6 isWordEligible: dist(flat[0], entry) ≤ 15 | ✅ Yes | svgLetter.ts:847-852 |
| D7 One draw_path per segment, cumulative 1000/2600/500/600 | ✅ Yes | combinations.ts:298-325 |
| D8 nextWord pure helper | ✅ Yes | MainScreen.tsx:35-41 |
| Data-flow: MainScreen → buildWord → GuidedTrace → TraceCanvas, gate = toggle-only | ✅ Yes | MainScreen.tsx:56,172-183; guidedTrace.tsx:80-89,124-133; TraceCanvas.tsx:92 |

### Resolution: seam `u` (design open question 1)

- **Spec wording** (letter-combinations "Seam Continuity"): "`u` is the incoming letter's normalized entry tangent".
- **Proposal (binding, decision 3)**: "gap 20px along `u = normalize(prevEffectiveExit − entryNatural)`".
- **Design (decision 4)**: resolves toward the proposal; flags the conflicting definition text.
- **Implementation**: `combinations.ts:171-179` computes `u = normalize(prevExit − entryNatural)`, placed entry `round2(prevExit − 20·u)`; connector tangents separately derive from the joining strokes' ~3-point directions (`combinations.ts:229-240`). Tests assert the proposal's `u` (`wordBuilding.test.ts:73-100`, `combinations.test.ts:27-33`).
- **Verdict**: the binding proposal is asserted; the delta spec's "incoming letter's normalized entry tangent" sentence is a definition-text conflict (the placement formula `prevEffectiveExit − 20px·u` is identical in both texts — only the character of `u` differs).
- **Recommendation**: amend the delta spec sentence to `u = normalize(prevEffectiveExit − entryNatural)` (or "the normalized direction from `prevEffectiveExit` toward the incoming letter's natural entry") before the delta is merged/archived, so the merged main spec carries the proposal definition. No code change required.

### Pending-manual browser E2E (T6.2) — NOT covered by vitest

- The T6.2 gate expression in the real code is **confirmed**: `TraceCanvas.tsx:92` `const devOn = showCheckpoints && !!devCheckpoints && !!devIdeal` — exactly `showCheckpoints && devCheckpoints && devIdeal` (truthiness-equivalent coercion), with `isDevMode() ||` dropped. `showScore = isDevMode()` (`:206`) stays independent.
- **Browser verification remains PENDING MANUAL testing**: the overlay render path is rAF-driven (`devCheckpointState` set inside the frame loop, `TraceCanvas.tsx:123-129`), so SSR/renderToString cannot produce it and the vitest environment is `node` (no jsdom, no browser harness in the repo — no playwright/puppeteer; `modes.test.ts`'s "headless Chromium + CDP" header describes an intended lane that does not exist in-tree).
- This report claims **no vitest coverage** for the gate runtime; the pending manual pass must also cover the keyboard/click interaction behaviors graded ⚠️ PARTIAL above (Backspace preventDefault, focused-input exemption, Borrar click, free-trace progress refresh, demo input-gating at runtime).

### Acceptance checklist (tasks.md) — item by item

| Item | Status | Evidence |
|------|--------|----------|
| [ ] n=1 passthrough; unknown/Kalam throw; d single-M 24-step seams | ✅ RESOLVED (was left unchecked by apply) | wordBuilding.test.ts:237-284 (n=1 `toBe` registry config; z/empty throws; single-M assertion for 2/3/4-letter words — `m` count === 1); 24 connector steps proven |
| [ ] t/i/j last in d+timeline+checkpoints; x immediate | ✅ RESOLVED (was left unchecked by apply) | wordBuilding.test.ts:133-220; combinations.test.ts:161-189 |
| [ ] Segments 1000/2600/500/600ms; single letter no properties.d; SSR array→N, single→1 | ✅ RESOLVED (was left unchecked by apply) | combinations.test.ts:137-159; wordBuilding.test.ts:237-242; TraceCanvas.test.tsx:19-35 |
| [x] Toggle-off hides overlay; picker gone; keyboard/Borrar; progress len-1 only | ⚠️ PARTIAL | picker gone: automated (`App.test.tsx:30-31`); keyboard logic: automated (nextWord suite); toggle-off overlay + Borrar click + progress len-1 guard: statically verified (`TraceCanvas.tsx:92`, `MainScreen.tsx:104,152-166`) — runtime confirmation pending the manual browser pass (T6.2) |

### Issues Found

**CRITICAL**: None.

**WARNING**:
- W1 (process): T6.2 toggle-off overlay gate + keyboard/click interaction behaviors are statically verified only — browser E2E is pending manual testing; no browser harness exists in the repo. Gate expression itself confirmed correct (`TraceCanvas.tsx:92`).
- W2 (spec text): letter-combinations "Seam Continuity" defines `u` as "the incoming letter's normalized entry tangent"; implementation/proposal/design use `normalize(prevEffectiveExit − entryNatural)`. Resolved toward the binding proposal; the delta text must be amended before merge (see resolution section).
- W3 (spec text, pre-existing drift): letter-model delta scenarios carry stale seed figures — "Seed c … radii 40/35/40/40/45" vs shipped data 50/45/45/50/50 (`letra_c.ts:31-60`), and "Seed a … oval apex at 480,200" vs data (cresta [538.6,186.8]; co-located entry/cierre [467.8,413.2], `letra_a.test.ts:33-40`). The covering tests pass against the current data; the spec text was never refreshed after the glyph re-extraction (predates this change — also present in `openspec/specs/letter-model/spec.md:17`).
- W4 (coverage): progress-refresh runtime, Backspace preventDefault, focused-input exemption, Borrar click, and demo input-gating have no automated tests (vitest env is `node`); all statically verified — fold into the W1 manual pass.

**SUGGESTION**:
- S1: Refresh the illustrative "9+6 → exactly 1..15" example in letter-combinations "Orders stay strictly contiguous" (and the same stale counts in design.md "Testing Strategy") — current seeds yield different totals; the tested invariant (strictly contiguous 1..N) is generic.
- S2: tasks.md acceptance checkboxes 1–3 were left `[ ]` by apply; this verification resolves them — mark completed at archive. Also reconcile the stated task count (22 per apply-progress, 24 per preflight) with the file's 23 checked rows.
- S3: t/i/j/x deferral/immediacy rests on synthetic fixtures until real SVGs land (design open question 2) — pipeline emits `mainEndArc` automatically when they arrive; no action required, keep the fixture note.
- S4: `guidedTrace.tsx`'s DrawDemo mapping and `MainScreen.tsx`'s progress/guard logic are pure and node-testable but lack dedicated unit tests — adding them could shrink the manual-pass scope (optional).

### Verdict

**PASS WITH WARNINGS** — conditional on the pending manual browser E2E pass (T6.2) and the spec-wording alignment (W2/W3) before archive.

No blockers, no CRITICAL findings. The implementation asserts the binding proposal's `u`; the gate expression is correct; all flagged apply deviations are benign; 180/180 tests and the production build pass. The delta spec text conflicts (u definition, stale c/a data figures) are documentation defects, not implementation defects.

---

## Remediation Re-verification (T7)

**Context**: Focused re-verification after remediation T7 (manual browser feedback) — commits `29fcf5d` (canvas: descender guide at Y=540; letter-model: `f` → `mixta`) and `95ac557` (screen: every append returns the flow to guided and replays the whole-word demo). Fresh evidence run from `client/` on 2026-08-29. Gentle-ai binary unavailable (no reviews) — admission validation delegated to the orchestrator, same as the original report; the original report and its verdicts are preserved above.

### Command Evidence (re-run)

```text
$ npx vitest run  → exit 0 | Test Files 18 passed (18) | Tests 187 passed (187) | Duration 4.17s
                    output sha256:a13fe9a3aa0a5b3f13f7163c40da5fda528abf08fd691ed249586ffaec2a3ffd
$ npm run build   → exit 0 | tsc --noEmit && vite build | 449 modules transformed | built in 266ms
                    output sha256:89cf68a1aacc0135e42c5afb6b4ba92fed3f1f5fa04d1719dcb660ea49dd1427
```

Suite grew 180 → 187 tests with the T7 additions; zero failures, zero skips, zero regressions in the previously verified areas (T1–T6).

### Amended Requirement Verdicts (3 requirements, 6 aspects)

| Requirement (amended delta) | Aspect | Implementation evidence | Test evidence | Result |
|---|---|---|---|---|
| letter-model — Ruled-Line Zone Map | `f` moves from `alta` to `mixta` ('fj') | `svgLetter.ts:30` (ALTA_CHARS `'bdhklt'`, no `f`), `:32-39` (ZONE_GROUPS `{ chars: 'fj', zone: 'mixta' }`), `:47-49` resolveBaselineZone | `svgLetter.test.ts:124-125`, `:136-137` (f/j → mixta, alta set minus f), `:683-686` (`t` → alta) | ✅ PASS |
| letter-model — Ruled-Line Zone Map | fitted `f` stroke spans Y=180 → Y=540 | `svgLetter.ts:19` TOP_LINE_Y=180, `:22` DESCENDER_LINE_Y=540, `:504-505` zoneBounds('mixta') = 180–540, `:546-551` fit math | `svgLetter.test.ts:688-703` (full-height fixture: fitted minY≈180, maxY≈540), `:705-708` (media set unchanged) | ✅ PASS |
| trace-canvas — Viewport and Ruled Lines | 4th full-width guide at Y=540 (`ROOTS_GUIDE_Y`) | `TraceCanvas.tsx:30` (ROOTS_GUIDE_Y=540), `:159` (`<line x1=0 y1=540 x2=1000 y2=540>` full-width), viewBox `:26,:144` | `TraceCanvas.test.tsx:39-46` (SSR: viewBox `0 0 1000 600` + y1=180/300/420/540) | ✅ PASS |
| main-screen — Letter Picker | every append returns the flow to guided; whole-word demo replays | `MainScreen.tsx:59-69` flowWord reducer, `:68` append → `{ word: next, mode: 'guided' }`; picker `append` `:91-95`; GuidedTrace remount keyed by `wordKey` `:78,:196` | `wordBuilding.test.ts:321-325` ('free'→'guided' on append), `App.test.tsx:46+` (T7.3 guided start) | ✅ PASS |
| main-screen — Keyboard Word Building | Backspace / Borrar do NOT reset mode | `MainScreen.tsx:60` (Borrar `{ ...state, word: [] }`), `:61-65` (Backspace pop, mode untouched) | `wordBuilding.test.ts:327-333` (mode stays 'free' after Backspace and Borrar) | ✅ PASS |
| main-screen — Letter Picker + Keyboard Word Building | word state unchanged otherwise (no hidden mutation) | shared `nextWord` (`MainScreen.tsx:37-43`) is the only word mutation path; refused key returns the SAME state object (`:67`) | `wordBuilding.test.ts:335-340` (refused keys `toBe(s)` identity — React bails out) | ✅ PASS |

**Verdict: 3/3 amended requirements PASS with passing vitest coverage** — the three previously browser-degraded behaviors (f zone, 4th guide, append-replay) are now node-verified. Previously verified requirements keep their prior verdicts unchanged.

### `f.svg` — KNOWN PENDING ITEM (not a defect)

`client/src/letters/svg/f.svg` was NOT modified by the remediation: `git status --porcelain` is empty for the path; the name-only diffs of `29fcf5d` and `95ac557` do not contain it (last commit touching it: `6edf653`, pre-change). The current alta-shaped `f` squeezes into the mixta span via `adjustToRuledZone` until the user re-authors the glyph (entry hook at the baseline, per design.md Remediation Addendum 2 / tasks.md Phase 7 note). The pipeline consumes the redraw unchanged. Expected — flagged as a pending user item, NOT a regression.

### Browser-only pending items — NO vitest coverage claimed

The vitest env is `node` (rAF/framer-motion/event-dispatch paths cannot execute there); the following remain on the manual browser lane (same standing as the original T6.2 pending list):
- **4th guide line rendering** (pixels): SSR-proven (`TraceCanvas.test.tsx:39-46`); on-screen appearance pending manual pass.
- **Demo replay animation after append**: flow logic node-proven (`wordBuilding.test.ts:321-325`); framer-motion `pathLength` sequencing (`TraceCanvas.tsx:179-196`) is a browser runtime.
- **T6.2 overlay gate runtime**: gate expression statically confirmed (`TraceCanvas.tsx:95` `showCheckpoints && !!devCheckpoints && !!devIdeal`, overlay `:206-212`, `showScore={isDevMode()}`); rAF-driven `devState` render pending manual E2E.
- **Keydown dispatch runtime**: Backspace `preventDefault` and focused-input exemption (`MainScreen.tsx:104-119`) statically verified; browser dispatch pending manual.

### Updated Totals & Verdict

Tests: **187/187 passed, 18 files, exit 0** (pre-T7: 180). Build: **exit 0** (`tsc --noEmit && vite build`, 449 modules). No CRITICAL findings. **Verdict: PASS WITH WARNINGS** — the amended requirements are fully node-verified; remaining warnings are the browser-manual lane (never claimed as vitest-covered) and the pre-existing spec-text drifts (W2 seam-`u` wording, W3 stale seed figures), which require no code change. Ready for archive subject to the standing manual-browser pass.