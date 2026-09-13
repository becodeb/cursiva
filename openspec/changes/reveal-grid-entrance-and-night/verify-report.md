```yaml
schema: gentle-ai.verify-result/v1
evidence_revision: sha256:5545f9e83f7722aaee9a7a0bfd57b03e8706fb2b4a5b86753305b535b40045b4
verdict: pass_with_warnings
blockers: 0
critical_findings: 0
requirements: 30/30
scenarios: 89/89
test_command: npm test
test_exit_code: 0
test_output_hash: sha256:156a57533376c5896e3f4e240428165b7821ecacc8d8ae12d04c6b676ec20b8d
build_command: npm run build
build_exit_code: 0
build_output_hash: sha256:0ce50ad6a01a64887055db9ac9b27991768f21d85177ac42e04b43d503c428d0
```

# Verify Report: The reveal grid — entrance and night sector

**Change**: `reveal-grid-entrance-and-night`
**Version**: six spec files (one new capability `reveal-grid`, five modified: `level-engine`, `free-trace-mode`, `trace-canvas`, `zoo-map`, `main-screen`) — 30 requirements, 89 scenarios total, counted directly from the retrieved specs.
**Mode**: Standard (strict TDD disabled, `openspec/config.yaml` `testing.strict_tdd: false`)
**Commit verified**: `4f8f16b` (HEAD of `sdd/entrada-y-linterna`, 12 commits ahead of `main`, tree clean)
**Artifact mode**: openspec (filesystem)

## Completeness

| Phase | Status |
|---|---|
| 1–6 (D1–D6, all 45 tasks) | Complete, verified below |
| 7 (screenshot verification) | **Not started — pending by design.** Explicitly reserved for the parent orchestrator's own next step per the run's brief. Not a task-completion defect. |
| 8 (final gate) | **Not started — pending by design.** Same as above. |

Per the orchestrator's brief, phases 7–8 are excluded from the "unchecked task blocks full verification" gate; `tasks.md` itself records them as `[ ]` deliberately, with the reason stated in its own header. Every task in Phases 1–6 is checked `[x]`, including two `[~]` partials in Phase 4 that were explicitly closed by Phase 5 (confirmed below by direct source inspection) and are no longer partial in the shipped tree.

## Runtime Evidence (re-executed independently by this verification)

```
npm test        →  69 test files, 1432 tests, all green (baseline at branch point: 65/1286)
npm run build   →  tsc --noEmit && vite build, green (one pre-existing chunk-size warning, unrelated)
```

Both commands were re-run fresh for this report (not taken from `apply-progress.md`'s own figures) and their exact output hashed for the envelope above. Counts match `apply-progress.md`'s "End of run 3" figures exactly.

## Spec Compliance Matrix (counted directly from the retrieved spec files)

| Capability | Requirements | Scenarios | Verdict |
|---|---|---|---|
| `reveal-grid` (new) | 9 | 20 | PASS — covered by `revealGrid.test.ts`, `RevealLayer.test.tsx`, `devMode.test.ts` |
| `level-engine` (delta) | 8 | 26 | PASS — covered by `types.ts` (compile-time union), `catalog.test.ts`, `migrateEntrance.test.ts`, `devMode.test.ts` |
| `free-trace-mode` (delta) | 2 | 4 | PASS — covered by `coverage.test.ts`'s bit-identity row and `revealGrid.test.ts` |
| `trace-canvas` (delta) | 2 | 7 | PASS — covered by `RevealLayer.test.tsx`, `TraceCanvas.test.tsx`, `backdrops.test.ts` |
| `zoo-map` (delta) | 5 | 16 | PASS, with one documented open finding (see Findings §1) |
| `main-screen` (delta) | 4 | 16 | PASS |
| **Total** | **30** | **89** | |

Every scenario has a runtime-executed, passing covering test — not static inspection alone. No spec scenario was found untested.

## The Four Ratified Amendments (design.md §0) — Verified Against Shipped Code

**A1 — catalog order.** Confirmed directly in `client/src/levels/catalog.ts`: `ENTRANCE` (glass1..4, sand1..4, in that order) is spread as the first entries of `PHASE_1`, immediately followed by `f1-libre`. `night1..4` are the last four entries of `PHASE_1` (lines 800–906), immediately after `llama-peak4` (line 422) and immediately before `PHASE_1`'s own close (line 907) — `f2-guirnalda` lives in a later phase-2 array, so "between `llama-peak4` and `f2-guirnalda`" holds. `LEVELS[0].id === 'glass1'` — verified structurally (`ENTRANCE[0]` is `glass1`, `PHASE_1` is `LEVELS`'s first spread) and by the passing `catalog.test.ts` assertion of the same claim.

**A2 — no cross-adventure radius ordering.** Confirmed: `catalog.test.ts`'s own test (`'drops the cross-adventure radius ordering — no comparison between sand1/glass4 or night1/sand4'`) asserts `night1.radius === 200` and `sand4.radius === 70` as independent facts with no inequality binding them — `night1`'s radius (200) exceeds `sand4`'s (70) and nothing in the suite requires otherwise. R2 asserts only within-adventure monotonicity.

**A3 — nightfall's luma constraint is a floor, not a cap.** Confirmed in both the Python implementation (`scripts/art/build_art.py`'s `nightfall()`, docstring explicitly states "The floor is `docs/09:158`'s 55-luma law... the ceiling is the only machine-checkable part of 'it has to read as night'") and the TypeScript test (`backdrops.test.ts`: `"the night backdrop's brightest clears NIGHT_VEIL by the law's floor, not merely reads low (amendment A3)"`, asserting `brightest ≥ luma(NIGHT_VEIL) + 55`). Verified arithmetically against the actually emitted `public/art/manifest.json`: `sector-night-background`'s `brightest` is `#526084` (luma 96), `NIGHT_VEIL` is `#12161f` (luma 22); 96 ≥ 22+55=77 holds with margin 19, matching design.md's prediction exactly.

**A4 — migrateEntrance seeds exactly two records, and a returning child who had the estanque still has it.** This is the highest-stakes regression risk named in the brief, and it was verified against the **real shipped registry**, not a synthetic fixture. `migrateEntrance.test.ts`'s describe block `"migrateEntrance — protects the pond, the real stake (design.md §8.1)"` imports `SECTORS` directly from `../zoo/sectors` and reads `estanque.unlockedWhen` — the actual shipped predicate, confirmed by direct source inspection to be `(records) => isFiled(records, 'sand4')` (`zoo/sectors.ts:362`), no longer `alwaysOpen`. The test proves: (1) before migration, a mid-campaign payload with any prior progress (and no `sand4` record) reads `estanque.unlockedWhen(before) === false`, reproducing the exact regression amendment A4 exists to prevent; (2) after `migrateEntrance`'s output is merged, `estanque.unlockedWhen(merged) === true`. A separate describe block does the same for `entrada.adventureIds` (confirmed real, `['glass1'..'sand4']` at `zoo/sectors.ts:314`) and `nextAdventure`, proving a returning child still resolves to `glass1`. `migrateEntrance` itself (`game/migrateEntrance.ts`) seeds at most two keys (`sand4`, `night4`), matching the two-record claim exactly — no synthetic stand-in remains anywhere in the closed test file (Phase 4's two `[~]` partials were fully closed by Phase 5, per `apply-progress.md` and confirmed by reading the current test file, which no longer constructs a local `ZooSector` literal or a bare `isFiled(records,'sand4')` predicate).

## The `url(#)` Ban

`rg 'url\(#'` across `client/src` was re-run by this verification. Every match is either a code comment documenting the ban, a test assertion that a string is absent (`expect(html).not.toContain('url(#')`), or a docblock — zero live `fill="url(#...)"` or equivalent reference exists anywhere, including in the two new files named in the brief (`RevealLayer.tsx`, `AdventureClosing.tsx`, both confirmed to contain only ban-documenting comments). No `<mask>`, `<clipPath>`, `<pattern>`, `<defs>`, or `useId` usage was found in either file.

## The 55-Luma Law, Against the Emitted `manifest.json`

Re-derived independently by this verification (ITU-R 601 luma, matching `detective/palette.ts`'s `luma()`), reading `public/art/manifest.json` directly rather than trusting design.md's source-PNG predictions:

| backdrop | manifest `brightest` | luma | tile paint | luma | gap | law (≥55) |
|---|---|---|---|---|---|---|
| aquarium (glass) | `#c7d9e0` | 212 | `GLASS_GRIME` `#64726b` | 109 | 103 | PASS |
| sand | `#dad0c0` | 209 | `SAND_DRIFT` `#7a6a58` | 109 | 100 | PASS |
| night | `#526084` | 96 | `NIGHT_VEIL` `#12161f` | 22 | 74 | PASS |

All three match design.md's predicted values exactly, confirming the manifest was correctly hand-copied per §2.3/§3.2's `[to copy]` residuals.

## `f1-libre` Bit-Identity

Confirmed: `coverage.ts`'s `coverageScore` is a thin wrapper delegating to `clearedTiles` at `radius: 0` — no second scoring body exists. `coverage.test.ts`'s four pre-existing hand-tuned threshold rows (`:90-112`) are unmodified (confirmed by reading the file) and remain green, plus one new bit-identity row (`coverageScore(s,1000) === coverageScore(s,1000,12,8)`) runs `it.each` over the same fixtures. This makes bit-identity a structural consequence of the delegation rather than a separately-maintained promise, exactly as design.md §1.3 argues.

## `docs/13` §5/§6/§2 — Product Contract

The twelve level configs (`client/src/levels/catalog.ts`) were read directly and compared against design.md §5.2's frozen table — every field (grid, radius, `minAccuracy`, titles, object placements, `resetOnContact: false`, no `demo`) matches literally. §6's per-level checklist obligations are satisfied structurally (start zone via `standingHintFor`'s existing routeless branch; no `paths`; `resetOnContact: false` on all twelve, both directly inspected and asserted in `catalog.test.ts`; retry via the existing path; no `demo`, R6-asserted). §2's three-step pedagogical progression (*exploración amplia → cubrir zonas más extensas → búsqueda más intencional*) is visible in the authored data itself: `cols×rows` grows monotonically within each adventure (R3), `radius` shrinks monotonically (R2, so coverage requires progressively more deliberate movement), and the night family's object count rises 1→2→3→3 (R4) while its torch radius narrows 200→170→140→110 — the same "wider, then more deliberate" arc §2 describes, expressed as authored numbers rather than only prose.

## Non-Tautological Test Check (the paso C class of defect)

Spot-checked the new/heaviest test files for assertions that could not fail: `revealGrid.test.ts`, `RevealLayer.test.tsx`, `AdventureClosing.test.tsx`, `catalog.test.ts`'s R1–R8 describe, `backdrops.test.ts`, `migrateEntrance.test.ts`, `GameScreen.test.tsx`'s `resolveCloseAction` block, `devMode.ts`/`.test.ts`. All assertions found compare independently-derived values (real catalog data, real registry rows, real manifest-derived literals, or the falsifiability rows that are documented and confirmed sensitive by the apply run's own invert-and-revert method) against expectations that could plausibly diverge from the implementation. No assertion of the form "a value equals itself" or "a function returns exactly what it was just handed with no independent check" was found in the files inspected. This is not an exhaustive line-by-line audit of all 69 test files, but it covers every file the brief specifically flagged as high-risk for this defect class.

## Findings Carried Forward From the Apply Run

**Finding 1 — `recentlyDiscovered`'s untouched-sector preference can outrank the duck's closing phrase.** Confirmed still present, and confirmed **not silently coded around**: `ZooMap.test.tsx`'s `"closes with the duck art and line once duck-trail4 is filed"` test was amended, not to hide the interaction, but to reproduce the REAL reachable state (an extra `sheep-hill1` attempt) required to make the closing line surface, with a code comment explaining exactly why filing `duck-trail4` alone does not. `mapBubble`'s own contract remains correctly tested and unaffected in `zoo/adventures.test.ts`. **This finding is not resolved — it is an open, documented product-level gap between two features that neither the ratified design nor the spec asks to be reconciled.** It is reported here as a WARNING for human product review, not a code defect: no spec requirement is violated (the spec only requires `recentlyDiscovered`'s existing fallback rule to remain reachable, which it does), but a real child will see "look over there" instead of "we found the duck!" the first time they finish the duck adventure, every time.

**Finding 2 — design.md §6.2's `night` `closingBeat` contradicted the ratified `main-screen` spec.** Confirmed **resolved correctly**: `zoo/adventures.ts`'s `night` row was directly inspected and carries no `closingBeat` field; `sand` is the only shipped adventure with one. `GameScreen.test.tsx`'s `resolveCloseAction('night4', {})` test passes and returns `null`, matching both the spec's explicit by-name exclusion of `night` and task 6.5's own scenario. The linterna is still granted via `backpack.ts`'s independent `earnedWhen: ['night4']`, confirmed unaffected. This resolution is fully documented in both `apply-progress.md` and inline code comments in `zoo/adventures.ts`, `AdventureClosing.test.tsx`, and `GameScreen.test.tsx`.

## What Remains Genuinely Unverifiable in This Harness (capture-gated / device-gated, not a defect)

- **Frame rate on a real tablet** (design.md §1.6's falsifier: `night1` sustaining ≤33ms while the finger sweeps). The vitest suite runs on Node with no jsdom and no timing harness; this cannot be measured here. Reserved for Phase 7.
- **Whether `GLASS_GRIME`/`SAND_DRIFT` read as a dirty pane/sand to a child**, rather than as a rendering bug (design.md §2.2's aesthetic bet, forced dark by the 55-luma law with no admissible light alternative — confirmed mathematically inescapable, but "reads as intended to a child" is a human-judgment question no assertion can settle). Reserved for Phase 7.
- **Whether five opacity steps read as a falloff or as five rings**, and whether a 200-unit torch reads as a torch or a spotlight. Reserved for Phase 7.
- **Whether the transformation screen (`AdventureClosing` after `sand4`) lands as a narrative beat rather than an interruption.** Reserved for Phase 7.

None of these are reported as PASS. They are explicitly out of scope for this verification pass by design (Phase 7 is the parent's own next step), and this report does not claim them as verified.

## Issues

**CRITICAL**: None.

**WARNING**:
1. Finding 1 above (`recentlyDiscovered` vs. the duck's closing phrase) remains open and unresolved at the product level — flagged for human review before or alongside Phase 7's capture pass, since it is exactly the kind of thing a capture of the zoo map after finishing the duck would surface visually.
2. Phases 7–8 (screenshot verification, final gate) are not started. This is by design per the run's brief, not a defect, but it means the visual/performance bets named in "What Remains Genuinely Unverifiable" above are still open questions, not closed ones.

**SUGGESTION**: None beyond what is already tracked in `apply-progress.md`'s own "Accepted deviation" sections (all reversible, all documented, none blocking).

## Verdict

**PASS WITH WARNINGS**, scoped to Phases 1–6 (D1–D6). All 30 spec requirements / 89 scenarios across the six capabilities are covered by real, runtime-executed, non-tautological tests. Both `npm test` (69/69 files, 1432/1432 tests) and `npm run build` are green, independently re-run by this verification. All four ratified amendments (A1–A4) hold in the shipped code, verified against the real registry rather than synthetic fixtures for the highest-stakes case (A4). The `url(#)` ban and the 55-luma law both hold against emitted artifacts, not source predictions. The two findings raised by the apply run were checked: one is correctly resolved (§6.2's `closingBeat` contradiction), one remains open and is reported honestly as a WARNING rather than silently passed. Phases 7–8 are pending by design and are not scored PASS or FAIL — they are unverified in this harness, as the design itself predicted they would need to be.
