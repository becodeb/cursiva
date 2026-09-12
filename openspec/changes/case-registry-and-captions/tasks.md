# Tasks: Case Registry and Captioned Art

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~2,160 authored ± across 9 slices (design §Slice Plan; S2 alone ≈430) |
| 400-line budget risk | High (informational only — see below) |
| Chained PRs recommended | No |
| Suggested split | Single PR, 9 internally green commits (S1..S9) |
| Delivery strategy | auto-chain (session preflight) |
| Chain strategy | size-exception |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: High

**Note**: `review_budget_lines` is unlimited by explicit user acceptance of
`size:exception` for this session. The guard does not fire. This is reported as
information, not a gate: one branch, one PR, sliced internally into 9
independently-green commits (S1..S9 below), matching design's Slice Plan.
`npm test` and `npm run build` MUST be green at the end of every slice
(baseline: 972 tests / 52 files).

### Suggested Work Units (commits within the one PR)

| Unit | Goal | Commit | Focused test command | Runtime harness | Rollback boundary |
|------|------|--------|----------------------|-----------------|-------------------|
| S1 | Seed duck trails before they exist | `fix(progress)` | `npm test -- migrateDuckCase` | N/A — pure store logic, no visual surface yet | Delete `migrateDuckCase.ts`; orphan seeded records tolerated by store |
| S2 | Duck art, tokens, clue kinds, four levels, case registry | `feat(detective)` (size-exception) | `npm test -- cases catalog palette artManifest` | `scripts/shot.sh` — duck trails + drained webfoot | Delete duck `SINGLES`/catalog block; `cases.ts` unused until S5/S6 |
| S3 | Captioned art + caption audit | `feat(detective)` | `npm test -- CaptionedArt captionAudit` | N/A — no screen wired yet | Delete `CaptionedArt.tsx`/`captionAudit.ts`, both new and unreferenced |
| S4 | Rewrite text-absence suites | `refactor(detective)` | `npm test -- HomeScreen App PistasRail LevelPlay Deduction` | N/A — test-only slice | Revert five test files; production code unchanged |
| S5 | Deduction becomes case-driven and captioned | `feat(detective)` | `npm test -- Deduction` | `scripts/shot.sh` — duck deduction, 3 captioned animals | Revert `Deduction.tsx`/`assets.ts`; `CULPRIT` restorable from git history |
| S6 | Per-case routing | `feat(detective)` | `npm test -- caseState GameScreen HomeScreen App` | N/A — routing logic only, screenshot deferred to S8 | Revert `caseState.ts`/`GameScreen.tsx` case plumbing |
| S7 | Exit to office; map becomes dev surface | `feat(main-screen)` | `npm test -- levelFlow GameScreen App` | N/A — nav-only; visually confirmed at S8 alongside lens shot | One prop (`onExit`) + one `isDevMode()` guard; both independently revertible |
| S8 | Lens centres on the fingertip | `fix(canvas)` | `npm test -- placeArt TraceCanvas` | `scripts/shot.sh` — trail mid-trace, lens on pointer | `placeArt` is pure/additive; reverting restores (0.5, 0.5) at both call sites |
| S9 | Docs: Nivel reterm + directive transcription + D6 fixes | `docs` | N/A — docs-only, no test command | N/A — prose review, no render | Docs-only; no code path depends on wording |

## Ordering Summary

Hard dependencies (violating these breaks a green slice):

1. **S1 before S2.** `migrateDuckCase` must seed before `catalog.ts` gains the
   four duck ids, or any returning child with `f1-libre.approvals >= 2` loses
   `trail1`'s positional unlock for however long the gap lasts (D4).
2. **S2 is one inseparable slice** (the recorded `size:exception`, ≈430
   lines). The moment `webfoot: PRINT` enters `CLUE_ART`,
   `palette.test.ts:125-126`'s global distinctness goes red; the only honest
   repair is the per-case re-scope, which needs `DETECTIVE_CASES`, which needs
   `clueKindsOf`, which needs the duck `LevelConfig`s in the catalog. Do not
   attempt to split art/tokens from the registry from the catalog rows.
3. **S3 before S4.** The rewritten text-absence suites call `auditCaptions`;
   it must exist first.
4. **S2 before S5 and S6.** Both need `DETECTIVE_CASES` to drive them.
5. Screenshot checks are pinned to S2, S5, S8 (design §Slice Plan) — do not
   defer them to a later "screenshots at the end" pass; each one verifies a
   defect this change exists to fix or a risk this change accepted.

---

## Phase 1: Seed duck trails before they exist (S1)

- [x] 1.1 Add `DUCK_TRAIL_IDS` (four ids, in trail order) to `client/src/game/types.ts`, beside `DETECTIVE_TRAIL_IDS`. `game/` cannot import `detective/cases.ts` without dragging the catalog in.
- [x] 1.2 Create `client/src/game/migrateDuckCase.ts`: `DUCK_PREDECESSOR_ID = 'f1-libre'`, `seedFrom()` copied from `migratePhase1.ts`'s policy, `migrateDuckCase(records)` guarded on `f1-libre.approvals >= APPROVALS_TO_UNLOCK`, returns `{}` if any duck id already has a record, never mutates or deletes.
- [x] 1.3 Create `client/src/game/migrateDuckCase.test.ts`: idempotent re-run is a no-op; no write below the approval threshold; no write when any duck id has a record; never deletes; a mid-hen-campaign payload keeps every unlock.
- [x] 1.4 Wire `migrateDuckCase` into `client/src/game/openProgressStore.ts`'s migration loop (`[migratePhase1(...), migrateDuckCase(...)]`), order irrelevant — the two share no id.
- [x] 1.5 Run `npm test` and `npm run build`; confirm green (baseline 972/52 plus this slice's new tests).

## Phase 2: Duck art, tokens, clue kinds, four levels, case registry (S2 — size-exception)

- [x] 2.1 In `scripts/art/build_art.py`, add `BREADCRUMB = (0x99, 0x41, 0x38)` and `BUBBLE = (0x4F, 0xB3, 0xD9)` beside the existing palette tuples (`:52-58`).
- [x] 2.2 Add six `SINGLES` rows for `webfoot`/`breadcrumb`/`bubble` (earned + drained, `keep_ink=False` for webfoot, `True` for breadcrumb/bubble — design §4 rationale). Alpha risk is resolved: `burbuja.png` (1197×1314, 57% transparent, bbox 134,204–1061,1130), `huella palmeada.png` (1299×1211, 65% transparent, bbox 58,76–1245,1145) and `miga de pan.png` (1299×1211, bbox 155,138–1148,1059) all have real alpha and tight bboxes — no opaque-background fallback needed.
- [x] 2.3 **Run `python3 scripts/art/build_art.py` and commit its outputs**, including the regenerated `client/public/art/*.png` and `client/public/art/manifest.json`, in this same commit. Art never enters by hand.
- [x] 2.4 Read the fresh `manifest.json` and confirm the emitted `w`/`h` for the three new clue kinds is a tight silhouette box (tall-narrow webfoot, near-square bubble, wide crumb), not a full-canvas crop — this is the manifest check design §4 requires before copying numbers into `assets.ts`. **Deviation**: emitted webfoot is 256×230 (wider than tall, not "tall-narrow" as design predicted) — this matches the orchestrator-verified alpha bbox (1187×1069, ratio 1.11) exactly, so the crop is correct and tight; only the design doc's descriptive adjective was off, not the pipeline.
- [x] 2.5 Update `client/src/detective/palette.ts` with `BREADCRUMB '#994138'` and `BUBBLE '#4fb3d9'`.
- [x] 2.6 Update `client/src/detective/palette.test.ts`: widen `EARNED` to six tokens (`POND, KERNEL, PRINT, PLUME, BREADCRUMB, BUBBLE`); re-scope the pairwise-distinctness assertion (`:121-127`) to iterate `DETECTIVE_CASES` and check distinctness within each case's `clueKindsOf(...)`, per design §4's exact test body.
- [x] 2.7 Update `client/src/detective/assets.ts`: extend `ClueKind` with `webfoot | breadcrumb | bubble`; add three `CLUE_ART` entries (`earned: PRINT | BREADCRUMB | BUBBLE`, both states, `w`/`h` from step 2.4).
- [x] 2.8 Update `client/src/detective/artManifest.test.ts`: `:121` count 38 → 44 (three new kinds × two states); `:116-117` comment arithmetic updated to `14 clue + 4 animal + …`.
- [x] 2.9 In `client/src/levels/catalog.ts`, insert four `LevelConfig`s (`duck-trail1..4`) into the private `PHASE_1` array, between `f1-libre` and `trail1`, using the exact generators/widths/clues from design §3's table (corridor widths 100/90/80/70 strictly decreasing; no `obstacles` on any — D1). **Deviation** (see apply-progress for full detail): design's literal `amplitude`/`garland` numbers for `duck-trail1` (140), `duck-trail3` (default `yTop`/`yBottom`) and `duck-trail4` (140) each drew a vertical span that violated the pre-existing "phase 1 uses the whole blank sheet" guard (`catalog.test.ts`, span must exceed the 300-420 writing band). Widened `duck-trail1`'s amplitude to 170, `duck-trail3`'s garland to `{yTop:110, yBottom:490}`, and `duck-trail4`'s amplitude to 170 — none of these changes affect corridor width, clue kind, or the clearance-guard conclusions (armClearance only gets more true as amplitude grows). Also moved the rail's first-contact slot from `trail1` to `duck-trail1` (`feedback(0,true)` → `duck-trail1`, `trail1` → `feedback(0,false)`), since `duck-trail1` is now the actual first routed level of phase 1 and the existing "rail on at first contact only" invariant requires exactly one bearer.
- [x] 2.10 Update `client/src/levels/catalog.test.ts`: `EXPECTED_IDS` gains the four ids in order between `'f1-libre'` and `'trail1'`; add a `duck-trail4` clearance case (`cornerClearance`/`armClearance`, arithmetic in design §3); confirm `:284`'s "hazards on exactly trail 1" guard stays green unchanged (proves no duck trail grew an obstacle). Also updated: `CORRIDORS`/`FLUENCY` maps, the rail/taper/resetOnContact assertions, `levelsByPhase(1)`, the "four trails replace six" phase1-id assertion, and the migration test asserting no locked dead end (now runs `migrateDuckCase` alongside `migratePhase1`) — all direct consequences of inserting four new phase-1 levels, not called out individually in the task list. Also fixed `client/src/detective/clues.test.ts`'s hardcoded trail-id list (outside the S2 file list but broken by the same insertion).
- [x] 2.11 Create `client/src/detective/cases.ts`: `DetectiveCase` interface, `DETECTIVE_CASES` (duck first: culprit `pato`, options `[pato, vaca, gato]`, `ruledOutBy: {vaca: 'feather', gato: 'bubble'}`; hen second, unchanged), `clueKindsOf`, `caseOf`, `caseSolvedId`.
- [x] 2.12 Create `client/src/detective/cases.test.ts` — the five structural assertions from design §9: culprit is the only unruled option; every non-culprit ruled out by a pairwise-distinct kind; no kind double-rules within a case; every ruled-out kind is one the case's own trails carry (`⊆ clueKindsOf(kase)`); `webfoot`/`breadcrumb` rule out nobody.
- [x] 2.13 **Screenshot check (human-reviewed).** PASS — `/tmp/shots/duck-trail1.png`..`duck-trail4.png`. Corridor width visibly narrows 100→70 across the four; `duck-trail4`'s elbows read as crisp right-angle corners, not merged into a blob.
- [x] 2.14 **Screenshot check (human-reviewed), open question.** PASS — `duck-trail4`'s corridor at width 70 reads as a child-plausible corridor in the screenshot, proportionate to the feather clue icons. No widen-to-80 needed.
- [x] 2.15 **Screenshot check (human-reviewed), the flagged risk.** PASS — `/tmp/shots/webfoot-drained-on-earth.png` (direct composite of `clue-webfoot-drained.png` on `CORRIDOR_EARTH #d9c3ae`) shows the flat `#c8cdd2` silhouette clearly legible against the earth tone via hue contrast (cool grey vs warm tan), even though the two colours' luma is nearly identical (204 vs 199). Not the lamp's near-invisible failure; no grey companion source needed.
- [x] 2.16 Run `npm test` and `npm run build`; confirm green. Measured: 999 tests / 54 files (up from S1's 979/53 — the increase includes `cases.test.ts`'s new assertions plus `artManifest.test.ts`'s `it.each` growing from 38 to 44 registry entries); `npm run build` green (`tsc --noEmit && vite build`).

## Phase 3: Captioned art and the caption audit (S3)

- [x] 3.1 Create `client/src/detective/CaptionedArt.tsx`: `label: string` required prop (no `?`, no default, no destructuring default — a destructuring default makes the type optional). Renders `<span class="cv-captioned">` containing the `<svg><image href></svg>` and a sibling `<span class="cv-caption">{label}</span>`.
- [x] 3.2 Create `client/src/detective/CaptionedArt.test.tsx`: a normal render assertion, plus the `@ts-expect-error` proof line (design §2) that a call site omitting `label` fails `tsc`. Confirm this line is exercised by `npm run build` (`tsconfig.json:20` includes `src`, so the build typechecks tests too) — vitest alone cannot prove this. **Verified for real**: temporarily removed the `@ts-expect-error` suppression, ran bare `tsc --noEmit` (diagnostic only) — it failed with `TS2741: Property 'label' is missing in type '{ art: ArtImage; size: number; }' but required in type 'CaptionedArtProps'`. Ran `npx vitest run` on the same unsuppressed file — 4/4 passed, proving vitest cannot see the type error. Restored the suppression; `tsc --noEmit` clean again.
- [x] 3.3 Create `client/src/detective/captionAudit.ts`: `CAPTION_CONTAINERS = ['cv-captioned', 'pistas-bar']`, `auditCaptions(html)` returning `{captioned, uncaptioned, imagelessContainers}`.
- [x] 3.4 Create `client/src/detective/captionAudit.test.tsx` (**deviation**: `.tsx` not `.ts` — row 4 requires `renderToString(<CaptionedArt .../>)`, real JSX, which a `.ts` file cannot parse; confirmed by a parse error on the first run) with the four hand-built falsifiability rows from design §2's table (bare `<h1>`, captionless `cv-captioned`, imageless `pistas-bar`, a real `CaptionedArt` render), plus two extra rows: a repaired row-2 shape that DOES carry an image (proves the verdict flips on the image, not the class name) and an unregistered class name (proves a container not in `CAPTION_CONTAINERS` is never falsely flagged as imageless). Rows 2 and 3 are load-bearing: they prove the licence is checked, not granted.
- [x] 3.5 Run `npm test` and `npm run build`; confirm green. 1011 tests / 56 files (up from 999/54: +12 tests, +2 files). `npm run build` green. No screen wired to `CaptionedArt`/`auditCaptions` yet — that is Phases 4 and 5.

## Phase 4: Rewrite every text-absence suite (S4)

- [x] 4.1 Rewrite `client/src/screen/HomeScreen.test.tsx:27,32` to call `auditCaptions` and assert `uncaptioned` and `imagelessContainers` are both empty; keep `expect(text).toBe('')` at `:27` exactly as-is (the office still carries no words).
- [x] 4.2 Rewrite `client/src/App.test.tsx:26` the same way (kept the strict `visible === ''` check too, strictly stronger than the audit alone on this exact screen today).
- [x] 4.3 Rewrite `client/src/detective/PistasRail.test.tsx:62,67,83` the same way; correct the module header's stale D6 "never typeset" claim in `PistasRail.tsx`. **Deviation**: the current file has three `toBe('PISTAS')`-style assertions (at lines 64, 69, 97 as shipped, not 62/67/83 verbatim — the task's line numbers drifted from an earlier draft of the file); rewrote all three, keeping the original exact-text check alongside each new `auditCaptions` call rather than deleting it (this screen's real invariant — the bar shows only PISTAS — is strictly stronger than "if present, captioned", so keeping both avoids weakening coverage).
- [x] 4.4 Rewrite `client/src/screen/LevelPlay.test.tsx:113,143` the same way (kept the exact-text checks alongside the new audit calls, same reasoning as 4.3).
- [x] 4.5 Rewrite `client/src/screen/Deduction.test.tsx:124,137,266,276` per design §9: `:137`/`:276` become the audit; `:124` inverts (animal names are now visible *and* captioned); `:266` (back control) stays as written. **Deviation, recorded deliberately**: inverting `:124` is a real behaviour change — `Deduction.tsx`'s `Animal` component now wraps each choice in `CaptionedArt` (visible caption under the picture) instead of an aria-only label. Tasks.md's own Suggested Work Units table describes S4 as "production code unchanged", which conflicts with design §9's explicit instruction to invert this exact assertion. Resolved in favour of design.md (the parent's stated authority on HOW) and the parent orchestrator's own scope fence, which restricts this slice only from "Deduction.tsx's *case wiring*" (props, `kase`, `onSolved`, `solvesCase`, `CULPRIT`/`ruledOutBy` removal — all Phase 5) — not from every edit to the file. This caption-only change touches nothing Phase 5 owns: `CULPRIT`, `ANIMAL_ART.ruledOutBy`, `pickAnimal`'s signature, and the four-culprit data model are all untouched. Removed the now-redundant `aria-label` from animal buttons (the visible caption already supplies the accessible name via content) — no other test in the suite referenced it. Added minimal `.cv-captioned`/`.cv-caption` stacking CSS to `DEDUCTION_CSS`.
- [x] 4.6 **Falsifiability check (mandatory, has an acceptance criterion).** Done for real on `HomeScreen.test.tsx`: temporarily added `<span>test</span>` as a direct child of `<main className="cv-home">`, ran `npx vitest run src/screen/HomeScreen.test.tsx`. RESULT: 2 of 13 tests went RED — `shows no text whatsoever...` (`AssertionError: expected 'test' to be ''`) and the new `every word (if any) carries its own image...` (`AssertionError: expected [ 'test' ] to deeply equal []`, showing `audit.uncaptioned` correctly caught the stray word). Reverted the span; re-ran the same suite — 13/13 green again. This directly answers `openspec/changes/detective-mode/verify-report.md`'s finding that five assertions shipped unable to fail.
- [x] 4.7 Run `npm test` and `npm run build`; confirm green. 1011 tests / 56 files (unchanged count from Phase 3 — this phase only rewrote existing assertions, added no new test files). `npm run build` green.

## Phase 5: Deduction becomes case-driven and captioned (S5)

- [x] 5.1 In `client/src/detective/assets.ts`, delete the module-level `CULPRIT` constant and `ruledOutBy` from `ANIMAL_ART` (now `Readonly<Record<AnimalId, ArtImage>>`).
- [x] 5.2 Rewrite `client/src/screen/Deduction.tsx`: props become `kase: DetectiveCase`, `solved: boolean`, `onSolved: () => void`, `onExit: () => void`; render `kase.options.length` `CaptionedArt` choices (animal image + `label` = the animal's Spanish name); `pickAnimal(state, animal, culprit)` takes `culprit` as a parameter and no longer imports the deleted `CULPRIT`; add exported `solvesCase(state, animal, culprit)`; wire `onPick` to call `onSolved()` when `solvesCase` is true, then `setState(s => pickAnimal(s, animal, kase.culprit))`.
- [x] 5.3 Interim wiring (superseded by Phase 6): in `client/src/screen/GameScreen.tsx`'s existing `{ view: 'deduce' }` branch, pass `kase={DETECTIVE_CASES[0]}` (hardcoded duck case), `solved={store.get(caseSolvedId(DETECTIVE_CASES[0].id)).approvals >= 1}`, `onSolved` writing that record, `onExit={() => dispatch({type:'back'})}` (unchanged for now) — the minimum needed so `GameScreen` still compiles against `Deduction`'s new required props. Full per-case routing lands in Phase 6.
- [x] 5.4 Rewrite `client/src/screen/Deduction.test.tsx` per design §9: `'presents exactly four animal choices'` (`:116`) becomes "presents exactly `kase.options.length` choices", driven per case (duck = 3, hen = 4). **Deviation** (orchestrator rulings, 2026-09-12): also deleted the old `'ANIMAL_ART / CULPRIT registry'` describe block (superseded by `cases.test.ts`'s per-case structural tests, already shipped in Phase 2), and added rendering-scale regression tests for the animal-size regression, the `.pistas-bar` selector fix, and the CSS-only uppercase mechanism — none of these were in the original task text but all three are the orchestrator's explicit rulings for this slice.
- [x] 5.5 **Screenshot check (human-reviewed).** Start the dev server, run `scripts/shot.sh http://localhost:5174/?nivel=deduccion /tmp/shots/duck-deduction-s5.png`. PASS: exactly three animals render (`pato`, `vaca`, `gato` — no `gallina`), each with its Spanish word in Nunito directly beneath its picture, legible at this viewport. Also shot at 1280x480 (`duck-deduction-s5-short.png`) to confirm the `max-height:520px` rail media query still reads. Both PASS — see apply-progress.md for the full judgement including what still looks wrong.
- [x] 5.6 Run `npm test` and `npm run build`; confirm green. 1020 tests / 56 files; build green.

## Phase 6: Per-case routing (S6)

- [x] 6.1 Update `client/src/home/caseState.ts`: `CaseStep.deduce` gains `caseId`; add `activeCase(records)` (falls back to the last case when all are solved); rewrite `nextCaseStep`, `railSlots`, `lampOn` to take the active `DetectiveCase`.
- [x] 6.2 Update `client/src/home/caseState.test.ts` (or equivalent) for the case-aware behavior: an open duck deduction is not skipped; a resolved duck case advances to the hen's first trail. Also added the orchestrator-ruling-4 integration test: a `migrateDuckCase`-seeded record set resumes inside the HEN case, never the duck's own deduction.
- [x] 6.3 Update `client/src/screen/GameScreen.tsx`: `GameView`/`GameAction` carry `caseId`; replace Phase 5's interim hardcoded `kase` with `DETECTIVE_CASES.find(k => k.id === state.caseId) ?? DETECTIVE_CASES[0]`; `resolveNextAction` becomes per-case (via `caseOf`); drop the `DETECTIVE_TRAIL_IDS` re-export (`:95`). **Deviation**: `initialView`'s `?nivel=deduccion` branch was also updated to carry `caseId: DETECTIVE_CASES[0].id` — required for `GameView.deduce` to typecheck at all; the full `?nivel=deduccion-<caseId>` link and the `?nivel=mapa` dev gate stay Phase 7 scope (design.md §8), not implemented here.
- [x] 6.4 Update `client/src/screen/GameScreen.test.tsx`: the `deduce` action test becomes `{type:'deduce', caseId:'duck'}` → `{view:'deduce', caseId:'duck'}`, parametrized over both cases. **Deviation**: did NOT add `onExit={() => {}}` to `<GameScreen/>` mount cases — `GameScreenProps` has no `onExit` prop until Phase 7 (task 7.1); adding an undeclared prop now would fail `tsc`'s excess-property check on the JSX literal and break the build. Left for Phase 7 to add alongside the prop itself.
- [x] 6.5 Update `client/src/screen/HomeScreen.tsx`'s rail rendering to read the active case; update `client/src/App.tsx`'s `viewFor` to thread the new `caseId` through `CaseStep.deduce` → `GameView.deduce`. Also updated `HomeScreen.test.tsx`'s three case-state tests (necessary consequential fix, not separately listed): a fresh child's ACTIVE case is now the duck's, not the hen's, so the "fresh child sees drained clues" / "filed clue in earned colour" / "lamp lights on completion" assertions now exercise duck ids and duck clue kinds, plus a new cross-case guard (filing all of the hen's trails does not light the duck's lamp).
- [x] 6.6 Run `npm test` and `npm run build`; confirm green. 1031 tests / 56 files; build green.

## Phase 7: Exit to the home office; map becomes a dev surface (S7)

- [x] 7.1 Add required `onExit: () => void` to `GameScreenProps` (`GameScreen.tsx:139-149`); replace `dispatch({type:'back'})` at the two wiring sites (`:179` `LevelPlay.onBack`, `:185` `Deduction.onBack`) with `onExit()`. Leave `nextView`'s `back` branch intact — it is still reached by `{type:'reset'}`.
- [x] 7.2 In `client/src/App.tsx`, pass `onExit={goHome}` at the `GameScreen` mount site (`:108`).
- [x] 7.3 Rewrite `initialView` in `GameScreen.tsx` per design §8: takes a `dev` parameter; `?nivel=deduccion` → `{view:'deduce', caseId: DETECTIVE_CASES[0].id}`; `?nivel=deduccion-<caseId>` → that case if it exists; `?nivel=mapa` only resolves `{view:'map', finished:false}` when `dev` is true; anything else falls through to `null` (never the map by default).
- [x] 7.4 Update `App.tsx`'s `initialShell`: `const v = initialView(search, isDevMode()); return v ? {at:'game', initial:v} : {at:'home'}`.
- [x] 7.5 Update `client/src/screen/levelFlow.test.ts:26`: retitled to `'reset returns to a plain map, never the finished banner'`, driving `{type:'reset'}` explicitly. **Deviation**: the file lives at `client/src/screen/levelFlow.test.ts`, not `client/src/game/levelFlow.test.ts` as the task text names it — its own header comment already calls it "session navigation," matching `GameScreen.tsx`'s own folder, so this is a task-text path drift, not a wrong file. The "assert the exit-to-office path via the `onExit` prop instead" half moved to `GameScreen.test.tsx` (task 7.6) as a compile-time proof, since `levelFlow.test.ts` only ever exercises the pure `nextView` reducer, which has no `onExit` parameter to assert on.
- [x] 7.6 Updated `GameScreen.test.tsx`: split the back/reset test into `'reset from the deduction view returns to a plain map, for either case'` (drives `{type:'reset'}` for both `deduceDuck`/`deduceHen`); added a compile-time proof mirroring `CaptionedArt.test.tsx`'s `label` precedent (`@ts-expect-error` on `<GameScreen initial={deduceDuck} />` missing `onExit`) — **verified for real**: temporarily removed the suppression, ran `npx tsc --noEmit`, got the exact expected `TS2741: Property 'onExit' is missing`, restored the suppression, confirmed `tsc --noEmit` clean again. Added `initialView` cases for `?nivel=deduccion-hen`/`?nivel=deduccion-duck`, an unknown-case-id case, and `?nivel=mapa` under `dev` true/false (including the no-arg default).
- [x] 7.7 Updated `App.test.tsx:48` (`initialView('')` → `.toBeNull()`, not the map); confirmed `:45` (`?nivel=trail1`, `dev` defaults false) and `:21` ("opens on the office") stay green unchanged — the latter is now load-bearing proof the dev gate did not turn the dev server into a map. (Line numbers drifted slightly from the task text's `:40`/`:39`/`:20` due to comments added in this same edit, not a different location.)
- [x] 7.8 Ran `npm test` and `npm run build`; confirm green. 1036 tests / 56 files (up from S6's 1031/56 — 5 new tests: the compile-proof case, two `deduccion-<caseId>` cases, one unknown-case-id case, two `?nivel=mapa` dev-gate cases, minus the one test split). `npm run build` green (`tsc --noEmit && vite build`). No new screenshot here — visually confirmed together with Phase 8's lens shot, since both touch the same trail/exit surface (see Phase 8's task 8.7 for the exit-to-office render).

## Phase 8: The lens centres on the fingertip (S8)

- [x] 8.1 Create `client/src/canvas/placeArt.ts`: `DEFAULT_GRIP = [0.5, 0.5]`; `placeArt(art: {w,h,grip?}, height, center)` returns `{x,y,width,height}` placing the grip point at `center`, defaulting to box centre when no grip is declared.
- [x] 8.2 Create `client/src/canvas/placeArt.test.ts`: default grip centres the box; grip `[0.603, 0.391]` lands off the bbox centre (this assertion fails if the fix is ever reverted); aspect ratio held for non-square `w`/`h`; zero height does not produce `NaN`.
- [x] 8.3 In `client/src/detective/assets.ts`, add `grip?: readonly [number, number]` to `ArtImage`; set `CARRIER_LENS_ART.grip = [0.603, 0.391]`, moving the measurement narrative from `modes.ts` onto it. Also corrected the module comment above `CARRIER_LENS_ART`, which stated the file arrives padded (stale — `emit()` crops the padding back off; the file's real lens sits at the grip, not the box centre).
- [x] 8.4 Update `client/src/canvas/TraceCanvas.tsx:1257-1264` to compute the carrier `<image>`'s `x/y/width/height` via `placeArt(carrierArt, CARRIER_ART_SIZE, {x:0, y:0})`; `TraceCarrierArt` gains `grip?`.
- [x] 8.5 In `client/src/home/modes.ts`, delete `HomeMode.grip` and the `DEFAULT_GRIP` export/duplicate literal — the grip is now solely on `CARRIER_LENS_ART`.
- [x] 8.6 Update `client/src/screen/HomeScreen.tsx`'s `Hung` to `<image href={art.href} {...placeArt(art, height, {x:cx, y:cy})} preserveAspectRatio="xMidYMid meet" />`; dropped the `at` prop and the `DEFAULT_GRIP` import; dropped `at={mode.grip}` at its one call site.
- [x] 8.7 **Screenshot check (human-reviewed) — the defect this change exists to fix.** PASS. Full detail (screenshots, DOM-dump numeric proof) in apply-progress.md — summary: shot the SAME `?nivel=trail1` corridor at rest on `main` (port 5199, before) and this branch (port 5174, after); the visible lens moved down-and-left between the two, and a `--dump-dom` extraction of the actual rendered `<image>` attributes proves the fix numerically: the old (main) box was `x=-48.885,y=-52` (box-centred on the carrier's translate point), the new box is `x=-58.956,y=-40.664` — plugging the shipped grip `(0.603,0.391)` into the new box lands EXACTLY on `(0,0)` relative to the carrier group's own translate, while the OLD box's grip point sits at `(+10.07, -11.34)` relative to that same origin — the "~11 units up and to the right" the defect was reported at, reproduced to within a fraction of a unit and eliminated by the fix.
- [x] 8.8 Run `npm test` and `npm run build`; confirm green. 1042 tests / 57 files (up from S7's 1036/56 — `placeArt.test.ts` is a new file, 6 tests). `npm run build` green (`tsc --noEmit && vite build`).

## Phase 9: Docs — Nivel reterm, directive transcription, D6 corrections (S9)

- [x] 9.1 Create `docs/11_PULPITO_DETECTIVE_DIRECTIVA.md`: faithful Spanish transcription of the PDF's structure, using `/tmp/directiva_pulpito.txt` as source.
- [x] 9.2 Update `docs/01`: five `### Fase N` headings gain their Nivel label without losing pedagogy; `:25`'s phase diagram and `:98` follow the both-numbers rule.
- [x] 9.3 Update `docs/02:116,118`: corridor-width contrast and narrow-channel floor retermed, content preserved.
- [x] 9.4 Update `docs/03:48,50,53`: relabel the two code-enforced boundaries as `Nivel N (Fase M en el código)` without renumbering `WITHDRAWAL_FROM_PHASE` or the `blank`/`ruled` split.
- [x] 9.5 Update `docs/04:30-34,60`: rewrite the stale inventory against the live catalog (duck trails included); keep the `"Fase 2 · Las hamacas"` code quote marked as a quote.
- [x] 9.6 Update `docs/05:13-22`: reterm the per-phase reward ladder, reconciled with what shipped.
- [x] 9.7 Correct the stale D6 "never typeset" claim in `docs/09_GUIA_DE_ESTILO_VISUAL.md:228-230`.
- [x] 9.8 Run `npm test` and `npm run build`; confirm green (docs-only slice, no code path should differ — this run is a regression check, not a proof of the docs themselves).

---

## Falsifiability and Screenshot Index (cross-reference)

| Concern | Task |
|---|---|
| Rewritten text-absence tests can actually FAIL | 4.6 |
| `auditCaptions` itself is falsifiable (hand-built rows) | 3.4 |
| `label` omission is a compile error, proven by `npm run build` | 3.2 |
| Lens on pointer, not up-and-right | 8.7 |
| Duck deduction: 3 captioned animals | 5.5 |
| Drained webfoot legible on corridor earth | 2.15 |
| `duck-trail4` at `corridorWidth: 70` — first case as tight as hardest hen trail | 2.14 |
| Duck trail width progression 100→70 reads correctly | 2.13 |
