# Apply Progress: Case Registry and Captioned Art

Cumulative scope across apply runs: **Phase 1 (S1) through Phase 7 (S7).**
Phases 8-9 are untouched and remain `[ ]` in `tasks.md`.

Mode: Standard (strict TDD disabled — `openspec/config.yaml testing.strict_tdd: false`).

## Phase 1: Seed duck trails before they exist (S1) — COMPLETE (5/5)

| Task | Status | Evidence |
|---|---|---|
| 1.1 `DUCK_TRAIL_IDS` in `game/types.ts` | done | Four ids, in trail order, beside `DETECTIVE_TRAIL_IDS`. |
| 1.2 `game/migrateDuckCase.ts` | done | Same three-part shape as `migratePhase1.ts`; guarded on `f1-libre.approvals >= APPROVALS_TO_UNLOCK`; never mutates/deletes. |
| 1.3 `game/migrateDuckCase.test.ts` | done | 7 tests: idempotent re-run, no write below threshold, no write when any duck id has a record, never deletes/mutates, mid-hen-campaign payload keeps every unlock. |
| 1.4 Wire into `openProgressStore.ts` | done | Loop form `[migratePhase1(...), migrateDuckCase(...)]`. |
| 1.5 `npm test` / `npm run build` | done | 979 tests / 53 files (baseline 972/52 + 7 new); build green. |

### Work Unit Evidence — S1

| Evidence | Value |
|---|---|
| Focused test command | `npm test -- migrateDuckCase` → 7/7 passed |
| Runtime harness | N/A — pure store logic, no visual surface yet (per tasks.md's own forecast) |
| Rollback boundary | Delete `client/src/game/migrateDuckCase.ts` and its test; revert `types.ts`/`openProgressStore.ts` edits. Orphan seeded records tolerated by the store (same tolerance `f1-ondas`/`f1-espiral` already get). |

Committed as `fix(progress): seed duck trails before they exist` (447e9b2).

## Phase 2: Duck art, tokens, clue kinds, four levels, case registry (S2 — size-exception) — COMPLETE (16/16)

| Task | Status | Evidence |
|---|---|---|
| 2.1 `build_art.py` palette tuples | done | `BREADCRUMB`, `BUBBLE` added beside existing tuples. |
| 2.2 Six `SINGLES` rows | done | webfoot (`keep_ink=False`), breadcrumb/bubble (`keep_ink=True`). |
| 2.3 Ran `build_art.py`, committed outputs | done | 6 new PNGs + regenerated `manifest.json` (44 total files, 1195.5 KB). |
| 2.4 Manifest tight-bbox check | done, with deviation | See tasks.md note — webfoot emitted 256×230 (wider than tall), which matches the orchestrator-verified alpha bbox ratio exactly; the design doc's "tall-narrow" adjective was imprecise, the pipeline itself is correct. |
| 2.5 `palette.ts` tokens | done | `BREADCRUMB '#994138'`, `BUBBLE '#4fb3d9'`. |
| 2.6 `palette.test.ts` re-scope | done | `EARNED` widened to six; distinctness re-scoped per `DETECTIVE_CASES`/`clueKindsOf`, exact body from design §4. |
| 2.7 `assets.ts` `ClueKind` + `CLUE_ART` | done | Three new kinds, `w`/`h` copied from fresh manifest. `ANIMAL_ART`/`CULPRIT` untouched (Phase 5 scope, out of this run). |
| 2.8 `artManifest.test.ts` count | done | 38 → 44; comment arithmetic updated. |
| 2.9 Four `LevelConfig`s in `catalog.ts` | done, with deviations | See below — three geometry deviations, all consequential fixes for a pre-existing test guard. |
| 2.10 `catalog.test.ts` updates | done, broader than listed | `EXPECTED_IDS`, `CORRIDORS`/`FLUENCY` maps, rail/taper/resetOnContact assertions, `levelsByPhase(1)`, phase1-id assertion, migration-no-dead-end test (now calls `migrateDuckCase` too), new `duck-trail4` clearance describe block. Also fixed `detective/clues.test.ts` (outside S2's file list, broken by the same LEVELS insertion). |
| 2.11 `detective/cases.ts` | done | `DetectiveCase`, `DETECTIVE_CASES`, `clueKindsOf`, `caseOf`, `caseSolvedId` — matches design §1 verbatim. |
| 2.12 `detective/cases.test.ts` | done | Five structural describe blocks, iterating `DETECTIVE_CASES`. |
| 2.13 Screenshot: width progression | PASS | `/tmp/shots/duck-trail1.png`..`duck-trail4.png` |
| 2.14 Screenshot: duck-trail4 tightness | PASS | Same screenshots, corridorWidth 70 judged child-plausible |
| 2.15 Screenshot: drained webfoot legibility | PASS | `/tmp/shots/webfoot-drained-on-earth.png` |
| 2.16 `npm test` / `npm run build` | done | 999 tests / 54 files; build green. |

### Deviations from design.md (task 2.9)

Design.md §3's literal generator calls, taken exactly as written, violate the
PRE-EXISTING `catalog.test.ts` guard "puts no phase-1 route inside the
writing band" (every phase-1 routed level's vertical span must exceed the
300-420 band: span > 300, minY < 180, maxY > 420). This guard predates this
change and was not being checked against when design.md's table was
authored. Three numeric deviations, each minimal and each verified not to
break any other design-stated invariant:

1. **`duck-trail1`**: `wave(...)` `amplitude: 140` → **170**. 140 draws a
   span of exactly 280 (2×140), 20 short of the >300 floor. 170 (the same
   amplitude design.md already gives `duck-trail2`) clears it with margin
   (span 340, minY 130, maxY 470).
2. **`duck-trail3`**: `garland({ cycles: 3 })` (default `yTop: 285, yBottom:
   435`) → `garland({ cycles: 3, yTop: 110, yBottom: 490 })`. The default
   span is only 150 units and sits almost entirely INSIDE the 300-420 band —
   the same band `f2-guirnalda` (phase 2) is deliberately left inside, since
   phase 2 IS the writing-band pattern phase. Phase 1 is not; widened to a
   380-unit span.
3. **`duck-trail4`**: `squareWave(...)` `amplitude: 140` → **170**. Same
   280-unit shortfall as `duck-trail1`. `cornerClearance` depends only on
   `run`/`corridorWidth` (unaffected); `armClearance` only gets MORE true as
   amplitude grows (`2·amplitude − w ≥ 0.7·w`), so design.md §3's clearance
   CONCLUSION (both guards hold) is unaffected — only its literal worked
   numbers (`2·140−70=210`, etc.) go stale relative to the shipped code.

None of these three changes touch `corridorWidth`, `clue.kind`, `taper`, or
any other design-load-bearing field. All three are recorded as inline
comments at their exact location in `catalog.ts`.

4. **Rail first-contact reassignment** (not a numeric deviation, a
   consequential fix): design.md gives `duck-trail1` `feedback(0, true)`
   ("first contact... same convention `trail1` carries") but never states
   that `trail1` itself should lose its own `feedback(0, true)`. Since
   `duck-trail1` is now the true first routed level of phase 1, leaving
   BOTH trails with `rail: true` would violate the pre-existing, still-live
   invariant "`turns the assisted rail on at FIRST CONTACT only`"
   (`catalog.test.ts`) and falsify `trail1`'s own module comment ("the rail
   is on here and nowhere else in phase 1"). Moved `trail1`'s feedback to
   `feedback(0, false)` and updated its comment accordingly.

### Task 2.4's descriptive deviation (not a code deviation)

Design §4 predicted "tall-narrow webfoot, near-square bubble, wide crumb."
The actual manifest gives:
- `clue-webfoot-earned`: 256×230 (ratio 1.11, wider than tall)
- `clue-breadcrumb-earned`: 256×237 (ratio 1.08, mildly wide — matches)
- `clue-bubble-earned`: 256×255 (ratio 1.004, near-square — matches)

The webfoot's actual proportions do not match "tall-narrow," but they DO
match the orchestrator-pre-verified alpha bbox for `huella palmeada.png`
(1187×1069, ratio 1.11) almost exactly — the crop is tight and correct, not
a full-canvas fallback (full canvas would have been 1299×1211, ratio 1.07,
a measurably different shape). This is the design doc's adjective being
imprecise, not a pipeline defect; no code change was needed.

### Work Unit Evidence — S2

| Evidence | Value |
|---|---|
| Focused test command | `npm test -- catalog cases palette artManifest` → 124/124 passed |
| Runtime harness | `scripts/shot.sh` — four duck-trail screenshots + one direct art composite; all three checks judged PASS, recorded above |
| Rollback boundary | Delete `client/src/detective/cases.ts`/`.test.ts`; revert `catalog.ts`'s four inserted `LevelConfig`s and `catalog.test.ts`'s companion edits; revert `assets.ts`/`palette.ts`/`palette.test.ts`/`artManifest.test.ts`; revert `build_art.py` and the six generated PNGs + `manifest.json`. `cases.ts` is unused by any other module until Phase 5/6 land, so it is safe to delete in isolation. |

Full suite at the end of S2: **999 tests / 54 files, `npm run build` green.**

## Screenshots (paths for the orchestrator to open)

- `/tmp/shots/duck-trail1.png` — PASS (widest corridor, one broad S-curve)
- `/tmp/shots/duck-trail2.png` — PASS (narrower, two cycles)
- `/tmp/shots/duck-trail3.png` — PASS (garland/"W" shape, narrower still)
- `/tmp/shots/duck-trail4.png` — PASS (narrowest, crisp square corners, no merged blobs)
- `/tmp/shots/webfoot-drained-on-earth.png` — PASS (direct art composite, drained webfoot legible on corridor earth)

## Phase 3: Captioned art and the caption audit (S3) — COMPLETE (5/5)

| Task | Status | Evidence |
|---|---|---|
| 3.1 `detective/CaptionedArt.tsx` | done | Required `label: string`, no `?`, no destructuring default. Renders `<span class="cv-captioned">` wrapping `<svg><image href></svg>` and a sibling `<span class="cv-caption">{label}</span>`. |
| 3.2 `detective/CaptionedArt.test.tsx` | done | Normal-render assertion, aspect-ratio sizing assertion, `className` modifier assertion, and the `@ts-expect-error` proof line. |
| 3.3 `detective/captionAudit.ts` | done | `CAPTION_CONTAINERS = ['cv-captioned', 'pistas-bar']`; `auditCaptions(html)` — hand-written stack-based HTML tokenizer (no DOM), returns `{captioned, uncaptioned, imagelessContainers}`. |
| 3.4 `detective/captionAudit.test.tsx` | done, with deviation | **Deviation**: file created as `.tsx` not `.ts` — row 4 of design §2's table requires `renderToString(<CaptionedArt .../>)`, real JSX, which a `.ts` file's parser rejects (confirmed: first run threw a PARSE_ERROR on the JSX). Contains all four design rows plus two extra: a repaired row-2 shape that DOES carry an image (proves the verdict flips on the image, not the class name) and an unregistered class name (proves a container not in `CAPTION_CONTAINERS` is never falsely flagged). |
| 3.5 `npm test` / `npm run build` | done | 1011 tests / 56 files (up from 999/54: +12 tests, +2 files). Build green. |

### Falsifiability proof for the compile-error claim (task 3.2)

Verified for real rather than assumed, per the non-negotiable to check the
build/vitest split before relying on it:

1. Temporarily removed the `@ts-expect-error` suppression from
   `CaptionedArt.test.tsx`.
2. Ran bare `tsc --noEmit` (diagnostic only, never the reported final
   result) — FAILED: `TS2741: Property 'label' is missing in type '{ art:
   ArtImage; size: number; }' but required in type 'CaptionedArtProps'`.
3. Ran `npx vitest run` on the SAME unsuppressed file — 4/4 PASSED, proving
   vitest cannot see the type error at all.
4. Restored the suppression; `tsc --noEmit` clean again.

This confirms the design's central claim: only `npm run build` (which runs
`tsc --noEmit`) can prove `label` is required; `npm test` alone cannot.

### Work Unit Evidence — S3

| Evidence | Value |
|---|---|
| Focused test command | `npx vitest run src/detective/captionAudit.test.tsx src/detective/CaptionedArt.test.tsx` → 12/12 passed |
| Runtime harness | N/A — no screen wired to `CaptionedArt`/`auditCaptions` yet (per tasks.md's own forecast; wiring lands in Phases 4-5) |
| Rollback boundary | Delete `CaptionedArt.tsx`/`.test.tsx`/`captionAudit.ts`/`.test.tsx` — all four are new and unreferenced by any other module at this point |

Committed as `feat(detective): captioned art and the caption audit` (a79ce3a).

## Phase 4: Rewrite every text-absence suite (S4) — COMPLETE (7/7)

| Task | Status | Evidence |
|---|---|---|
| 4.1 `HomeScreen.test.tsx` | done | First test (`toBe('')`) kept verbatim; second test replaced with `auditCaptions`-based assertions. |
| 4.2 `App.test.tsx` | done | Kept the strict `visible === ''` check AND added the audit assertions (belt-and-suspenders — this screen genuinely has zero words today). |
| 4.3 `PistasRail.tsx` + `.test.tsx` | done, with deviation | **Deviation**: the module header's stale claim ("`PISTAS` is DRAWN, not typeset") corrected to describe the real typeset-text implementation and its licensed-container status. Task's cited line numbers (62/67/83) had drifted from the file's current state; the three actual `toBe('PISTAS')`-style assertions (at 64/69/97 as shipped) were all found and rewritten, keeping the original exact-text check alongside the new `auditCaptions` call in each (this screen's real invariant is strictly stronger than "if present, captioned"). |
| 4.4 `LevelPlay.test.tsx` | done | Same keep-and-augment pattern as 4.3, at both cited test blocks. |
| 4.5 `Deduction.tsx` + `.test.tsx` | done, with a recorded design/tasks conflict — resolved | See "Deviation and conflict resolution" below. |
| 4.6 Falsifiability check | done | See "Falsifiability proof" below — done for real, not simulated. |
| 4.7 `npm test` / `npm run build` | done | 1011 tests / 56 files (unchanged count from Phase 3 — pure rewrite, no new test files). Build green. |

### Deviation and conflict resolution (task 4.5)

`tasks.md`'s own Suggested Work Units table describes S4 as "test-only
slice... production code unchanged", but `design.md` §9 explicitly requires
`Deduction.test.tsx:124` to INVERT — "the name is now visible *and*
captioned" — which is only true if `Deduction.tsx` itself changes. These two
documents conflict.

Resolved in favour of `design.md` (the parent orchestrator named it
authoritative for HOW) and the parent's own scope fence, which reads "do not
touch ... Deduction.tsx's *case wiring* this slice" — a qualified
restriction, not a blanket one. Reasoned that "case wiring" names Phase 5's
actual payload (`kase`/`solved`/`onSolved`/`onExit` props, `solvesCase`,
`CULPRIT` and `ANIMAL_ART.ruledOutBy` removal) and that a caption-only visual
change to the existing four-animal, `CULPRIT`-driven `Deduction.tsx` touches
none of that.

**What changed in `Deduction.tsx`**: the `Animal` component now wraps each
choice in `CaptionedArt` (picture + visible Spanish name underneath) instead
of an SVG-only `<Art>` with an aria-only label. Removed the now-redundant
`aria-label` (the visible caption already supplies the button's accessible
name via content — confirmed no other test in the suite referenced it).
Added `.cv-captioned`/`.cv-caption` stacking CSS to `DEDUCTION_CSS`. Fixed a
CSS template-literal bug of my own (a `` ` `` character inside a CSS comment
prematurely closed the JS template string — caught immediately by a PARSE_ERROR
on the first test run, fixed before it ever reached a commit).

**What did NOT change**: `CULPRIT`, `ANIMAL_ART.ruledOutBy`, `pickAnimal`'s
signature, the four-animal lineup, and every other data-model piece Phase 5
owns are untouched.

### Falsifiability proof (task 4.6) — done for real

1. Added `<span>test</span>` as a direct child of `<main className="cv-home">`
   in `HomeScreen.tsx`.
2. Ran `npx vitest run src/screen/HomeScreen.test.tsx` — RED, 2 of 13 tests
   failed:
   - `shows no text whatsoever...`: `AssertionError: expected 'test' to be ''`
   - `every word (if any) carries its own image...`: `AssertionError:
     expected [ 'test' ] to deeply equal []` — `audit.uncaptioned` correctly
     caught the stray word.
3. Reverted the span. Ran the same suite again — GREEN, 13/13 passed.
4. Confirmed `git diff --stat client/src/screen/HomeScreen.tsx` was empty
   before committing — the temporary defect left no trace.

This directly answers `openspec/changes/detective-mode/verify-report.md`'s
finding that five assertions shipped unable to fail: the rewritten
assertions in this phase can, and were shown to, go red on a real defect.

### Work Unit Evidence — S4

| Evidence | Value |
|---|---|
| Focused test command | `npx vitest run src/detective/PistasRail.test.tsx src/screen/HomeScreen.test.tsx src/App.test.tsx src/screen/LevelPlay.test.tsx src/screen/Deduction.test.tsx` → 97/97 passed |
| Runtime harness | N/A — test-only + one production visual change (Deduction's captions), no screenshot required this phase (Deduction's screenshot is pinned to Phase 5, task 5.5, once the case-driven lineup lands) |
| Rollback boundary | Revert the 7 modified files listed above; each is an independent diff (test-file rewrites and the two small production comment/caption edits do not depend on each other) |

Committed as `refactor(detective): every text-absence suite asserts the captioned-art invariant` (eed2788).

## Phase 5: Deduction becomes case-driven and captioned (S5) — COMPLETE (6/6)

Driven by four orchestrator rulings issued 2026-09-12 before this batch, on
top of the tasks.md/design.md text (see each ruling's own note below).

| Task | Status | Evidence |
|---|---|---|
| 5.1 Delete `CULPRIT`/`ANIMAL_ART.ruledOutBy` | done | `ANIMAL_ART` collapsed to `Readonly<Record<AnimalId, ArtImage>>`. Fixed three consequential breakages the task list did not name: `artManifest.test.ts:72` (`.art` accessor), `CaptionedArt.test.tsx` (5 call sites), `captionAudit.test.tsx` (1 call site) — all still read `ANIMAL_ART.pato.art` from the old wrapper shape. |
| 5.2 Rewrite `Deduction.tsx` | done, with three orchestrator-ruling deviations from the shipped S4 render | See "Four orchestrator rulings" below. |
| 5.3 Interim wiring in `GameScreen.tsx` | done | Hardcoded `DETECTIVE_CASES[0]` exactly as specified; superseded three tasks later by 6.3. |
| 5.4 Rewrite `Deduction.test.tsx` | done, broader than listed | Deleted the old `'ANIMAL_ART / CULPRIT registry'` describe block (its five assertions are superseded by `cases.test.ts`, already shipped in Phase 2, which checks them per case — strictly stronger). Parametrized every case-shaped assertion over BOTH `DETECTIVE_CASES` entries via `describe.each`. Added three new regression tests tied directly to the orchestrator rulings: animal-size, `.pistas-bar` selector, and the CSS-only uppercase mechanism. |
| 5.5 Screenshot check | PASS | See below. |
| 5.6 `npm test` / `npm run build` | done | 1020 tests / 56 files (up from 1011/56 — Phase 3/4's count — the net delta is small because a describe block was deleted while `describe.each` added more). Build green. |

### Four orchestrator rulings, and what changed because of them

1. **Animal size regression (undone, not merely restored).** The shipped S4
   render used `size={36}` on every `CaptionedArt` animal — a real regression
   from `main`'s 64px `Art` helper, confirmed by rendering both
   (`/tmp/shots/ref-deduction-main.png` vs `/tmp/shots/deduction-s4.png`).
   Sized to **`ANIMAL_SIZE = 180`** — past `docs/09`'s ~140-unit trail
   baseline, not merely back to 64, because with only 3-4 choices and no
   canvas competing for space, this screen has strictly more room per animal
   than a trail does, and the animal IS the answer here.
2. **`.pistas-rail` dead-CSS defect (found on `main`, fixed here).** Verified
   the orchestrator's claim directly: `PistasRail.tsx:157` renders
   `className="pistas-bar"`, never `"pistas-rail"`, so `Deduction.tsx`'s old
   `.pistas-rail {...}` block (base rule AND its `@media (max-height:520px)`
   override) matched nothing and the rail fell through to `LAYOUT_CSS`'s
   full LevelPlay-sized `.pistas-bar` treatment (96px `PISTAS` text, a wide
   horizontal bar) — confirmed by rendering `?nivel=deduccion` on this
   branch's own HEAD before this slice touched it
   (`/tmp/shots/deduction-s4.png` shows exactly this). Renamed the selector
   to `.pistas-bar` and re-scoped it as a narrow **132px-wide vertical
   column** (lamp, `PISTAS` at 18px, four slots stacked) rather than
   redesigning the screen further, per the explicit instruction to fix only
   the selector and the sizing.
3. **Captions are visually uppercase, never literally.** `ANIMAL_LABEL` stays
   normal Spanish case (`"Pato"`) in the DOM; `.cv-caption` gets
   `text-transform: uppercase`. Reasoning recorded in both the code comment
   and a dedicated test (`'captions render uppercase via CSS text-transform,
   never as literal uppercase text'`): several screen readers treat a
   genuinely all-caps short DOM string as an acronym and spell it letter by
   letter, which would be a real accessibility regression for a five-year-old
   audience; a CSS paint rule gets the directive's visual requirement with
   none of that cost.
4. **(Ruling 4 is Phase 6/migration-scoped — see that phase's section below.)**

### S5 screenshot check (task 5.5)

- `/tmp/shots/duck-deduction-s5.png` (1280×900) — **PASS**. Three animals
  (pato, vaca, gato — no gallina), large and confidently spaced, each word
  directly beneath its picture in uppercase. The rail sits on the right as a
  narrow column (lamp, PISTAS, four duck-clue-kind slots: webfoot/breadcrumb/
  bubble/feather, all drained since this render has no progress), no longer
  dominating the page. The lineup reads as the subject of the screen.
- `/tmp/shots/duck-deduction-s5-short.png` (1280×480) — **PASS**. Confirms the
  `max-height: 520px` rail media query still applies: the rail collapses to a
  horizontal row below the lineup, exactly as `LevelPlay`'s own short-viewport
  convention does.

**What still looks wrong, said honestly rather than absorbed** (per the
explicit instruction not to redesign further): there is a large amount of
empty vertical space above and below the lineup at 1280×900 — `.cv-lineup`
vertically centers its content inside the full-viewport flex column, and with
only three animals at 180px tall the used region is much shorter than the
viewport. This is the SAME "most of the page is empty" defect the orchestrator
identified on `main` (`ref-deduction-main.png`), reduced in severity (the
lineup itself is far more prominent now, and the rail no longer eats the right
half) but not eliminated. Left as a visible, recorded gap rather than
addressed, since the instruction was to fix the selector and the sizing only.

## Phase 6: Per-case routing (S6) — COMPLETE (6/6)

| Task | Status | Evidence |
|---|---|---|
| 6.1 `caseState.ts` case-aware rewrite | done | `activeCase`, `nextCaseStep`, `railSlots(records, kase)`, `lampOn(records, kase)` — matches design.md §1's literal signatures. |
| 6.2 `caseState.test.ts` case-aware tests | done, plus the ruling-4 integration test | 14 tests: `activeCase` duck-first/duck-open/duck-resolved/all-resolved; `nextCaseStep` gap-filling within the active case; `railSlots`/`lampOn` per case, including a cross-case non-interference guard; and the orchestrator-ruling-4 test proving a `migrateDuckCase`-seeded record set resumes in the HEN case. |
| 6.3 `GameScreen.tsx` per-case routing | done, with one necessary-minimum deviation | `GameView`/`GameAction.deduce` carry `caseId`; `resolveNextAction` now uses `caseOf` instead of a hardcoded `LAST_DETECTIVE_TRAIL_ID`; `DETECTIVE_TRAIL_IDS` re-export dropped. **Deviation**: `initialView`'s `?nivel=deduccion` branch needed `caseId: DETECTIVE_CASES[0].id` added just to typecheck against the new `GameView.deduce` shape — this is a strict subset of design.md §8's eventual Phase-7 rewrite (which adds `?nivel=deduccion-<caseId>` and the `?nivel=mapa` dev gate), not an early implementation of Phase 7 itself. |
| 6.4 `GameScreen.test.tsx` updates | done, with one scope-fence deviation | Parametrized every `resolveNextAction`/`nextView` deduce scenario over BOTH cases via `describe.each`. **Deviation, deliberate**: did NOT add `onExit={() => {}}` to `<GameScreen/>` mount cases as the task text suggested "in preparation for Phase 7" — `GameScreenProps` has no `onExit` field until Phase 7 (task 7.1) adds it, and passing an undeclared prop in a JSX literal fails `tsc`'s excess-property check, which would have broken `npm run build`. Left for Phase 7 to add together with the prop declaration. |
| 6.5 `HomeScreen.tsx`/`App.tsx` active-case wiring | done, plus a necessary consequential test fix | `HomeScreen` now derives `activeCase(records)` once and threads it into `railSlots`/`lampOn`; `App.tsx`'s `viewFor` threads `CaseStep.deduce`'s new `caseId` into `GameView.deduce`. **Not separately listed but required**: `HomeScreen.test.tsx`'s three case-state tests hardcoded the HEN's clue kinds/ids as the only possible active case — with duck-first routing now real, a fresh child's active case is the DUCK's. Rewrote those three tests against duck ids/kinds and added a fourth: filing every one of the hen's trails must NOT light the duck case's own lamp (proves the two cases never cross-light each other). |
| 6.6 `npm test` / `npm run build` | done | 1031 tests / 56 files (up from 1020/56 — Phase 5's count). Build green. |

### Orchestrator ruling 4 — `migrateDuckCase` also seeds `duck-deduce`

The Phase 1/2 apply run flagged and deferred this discrepancy (spec says the
migration seeds the duck case's `-deduce` pseudo-id; design.md and tasks 1.2/
1.3 did not). This batch resolved it in the spec's favour, exactly as the
orchestrator ruled, because Phase 6 is what makes the omission observable:

- Added `DUCK_CASE_SOLVED_ID = 'duck-deduce'` to `game/types.ts`, quoting
  `detective/cases.ts`'s `caseSolvedId('duck')` formula literally rather than
  importing it — `game/` cannot import `detective/cases.ts` without dragging
  the whole catalog-backed case registry in, the same reason `DUCK_TRAIL_IDS`
  already lives in `game/types.ts` instead of next to the registry.
- Widened `migrateDuckCase`'s idempotency guard from "none of the four duck
  trail ids has a record" to "none of the four duck trail ids OR
  `DUCK_CASE_SOLVED_ID` has a record" — a lone existing `duck-deduce` record
  now also blocks the whole seed, tested directly.
- The seeded `duck-deduce` record is the LITERAL shape the real writer uses
  (`{ ...EMPTY_RECORD, approvals: 1 }`, design.md §5, spec "Case-Solved
  Persistence") — never `seedFrom(source)`. A deduction pseudo-record carries
  no accuracy/fluency of its own to copy forward; `seedFrom` exists for real
  trail progress, which this is not.
- Added the exact test the orchestrator asked for, in `caseState.test.ts`:
  `'a migrated duck-only record set resumes inside the HEN case, never the
  duck deduction'` — feeds `migrateDuckCase`'s own output straight into
  `activeCase`/`nextCaseStep` and asserts the child lands on `trail1`
  (the hen's first trail), not on the duck's own deduction.
- Corrected `design.md` §6 in place (marked `[Corrected 2026-09-12 —
  orchestrator ruling 4]`) rather than leaving the shipped code and the
  design doc disagreeing; also strengthened §6's "D4's accepted cost"
  paragraph to state explicitly that its "never meets the duck" claim is only
  true END TO END because of this seed — without it, per-case routing would
  turn "never meets the duck" into "is asked to solve the duck case blind",
  which is worse than the cost D4 already accepted.

No screenshot task is assigned to S6 (design's Slice Plan pins screenshots to
S2/S5/S8 only) — took one anyway for confidence, given how much the home
screen's default rendering changed: `/tmp/shots/home-duck-first-s6.png` shows
the office rail now displaying the duck's four drained clue kinds (webfoot/
breadcrumb/bubble/feather) instead of the hen's, confirming `activeCase`
correctly resolves to the duck case for a fresh child.

## Phase 7: Exit to the home office; map becomes a dev surface (S7) — COMPLETE (8/8)

| Task | Status | Evidence |
|---|---|---|
| 7.1 `GameScreenProps.onExit` required; `dispatch({type:'back'})` replaced | done | Both wiring sites (`LevelPlay.onBack`, `Deduction.onExit`) now call `onExit()` directly. `nextView`'s `back` case untouched — still reached by `{type:'reset'}`. |
| 7.2 `App.tsx` passes `onExit={goHome}` | done | At the sole `<GameScreen/>` mount site. |
| 7.3 `initialView` rewrite (design §8) | done | Takes `dev = false`; `?nivel=deduccion` → first case; `?nivel=deduccion-<caseId>` → that case if it exists, else falls through; `?nivel=mapa` only resolves when `dev` is true; everything else → `null`. Return type is now `GameView \| null`. |
| 7.4 `App.tsx initialShell` | done | `const v = initialView(search, isDevMode()); return v ? {at:'game', initial:v} : {at:'home'}`. |
| 7.5 `levelFlow.test.ts` retitle | done, with a path-name deviation | See tasks.md's note: the file is `client/src/screen/levelFlow.test.ts`, not `client/src/game/levelFlow.test.ts` as the task text names it — same file, task-text path drift. Retitled and now drives `{type:'reset'}` explicitly. The `onExit`-prop half of the assertion moved to task 7.6's compile-time proof, since `nextView` itself has no `onExit` parameter. |
| 7.6 `GameScreen.test.tsx` split + new cases | done | Split test into a `reset`-only case (both `deduceDuck`/`deduceHen`) plus a `CaptionedArt`-precedent `@ts-expect-error` compile proof that `onExit` is required. Added `initialView` cases: `?nivel=deduccion-hen`/`-duck`, an unknown-case-id fallthrough, and `?nivel=mapa` under `dev` true/false/default. |
| 7.7 `App.test.tsx` `initialView('')` | done | Now `.toBeNull()`. `?nivel=trail1` (dev defaults false) and "opens on the office" both confirmed still green, unchanged — the latter is now load-bearing proof the dev gate never turns the dev server itself into a map. |
| 7.8 `npm test` / `npm run build` | done | 1036 tests / 56 files (up from 1031/56); build green. |

### Falsifiability proof for the onExit compile-error claim (task 7.6)

Same precedent as `CaptionedArt.test.tsx`'s `label` proof (Phase 3, task 3.2),
done for real rather than assumed:

1. Temporarily removed the `@ts-expect-error` suppression from
   `GameScreen.test.tsx`'s new compile-proof test.
2. Ran `npx tsc --noEmit` — FAILED exactly as expected: `TS2741: Property
   'onExit' is missing in type '{ initial: {...} }' but required in type
   'GameScreenProps'.`
3. Restored the suppression; `tsc --noEmit` clean again; full `npm test` /
   `npm run build` re-run green (1036/56, build green).

### Why the "GameScreen wires Deduction.onExit/LevelPlay.onBack to onExit,
never to dispatch" claim is proven at compile time, not by a click

This repo's harness is `renderToString` in a node environment with no DOM
and no click simulation (documented repeatedly across this change's own
files — `Deduction.tsx`'s module comment, `LevelPlay.test.tsx`). There is no
way to simulate a press on `LevelPlay`'s ‹ Volver or `Deduction`'s back
control and observe which function actually ran. What IS structurally
guaranteed, and what design.md's own words ask for ("required, like
`label`, so no caller can silently keep landing on the map"), is that
`onExit` is a required prop: no `GameScreen` can be mounted at all — in
production or in a test — without a real exit destination. `dispatch` was
also removed from both call sites by direct code inspection (they now read
`onBack={onExit}` and `onExit={onExit}`, both simple pass-throughs), which
a human reviewer can verify in the diff; there is no decision or branch left
in that wiring for a unit test to be wrong about.

### Work Unit Evidence — S7

| Evidence | Value |
|---|---|
| Focused test command | `npm test -- levelFlow GameScreen App` → 35/35 passed |
| Runtime harness | N/A for a new render this phase — visually confirmed together with Phase 8's task 8.7 lens screenshot, since exiting a trail and the lens defect share the same rendered surface |
| Rollback boundary | One prop (`onExit` on `GameScreenProps`, threaded from `App.tsx`'s `goHome`) and one `isDevMode()` gate inside `initialView`; both are independently revertible — reverting `onExit` restores `dispatch({type:'back'})` at the two call sites, reverting the dev gate restores the old three-branch `initialView` returning `GameView` (never `null`) |

## Remaining Tasks (out of scope for this apply run)

- [ ] Phase 8: The lens centres on the fingertip (S8)
- [ ] Phase 9: Docs — Nivel reterm, directive transcription, D6 fixes (S9)

## Status

53/69 tasks complete (Phase 1: 5/5, Phase 2: 16/16, Phase 3: 5/5, Phase 4:
7/7, Phase 5: 6/6, Phase 6: 6/6, Phase 7: 8/8). All seven slices committed
separately. Ready for the next apply batch (Phase 8, S8) or for verify on
this slice's scope.

## Orchestrator correction after the S2 screenshot review (2026-09-12)

The S2 screenshot check was reported as PASS on all three shots. Two of the four
duck trails did not survive a second look.

**`duck-trail3` rebuilt: `garland` → `switchback`.** Three defects, one root cause.

1. **A garland IS the row of U's, and the row of U's is the signature of the
   directive's Nivel 3** (the jellyfish). Spending it on a Nivel 2 case trail
   flattens that level before it ships. This is proposal D1's ruling — a later
   level's mechanic is not free decoration for an earlier one — applied to the
   shape instead of to the obstacle. Neither the design nor the first
   implementation caught it.
2. `garland`'s cusps put consecutive clue marks ~20 units apart where the arcs
   nearly meet. A bubble is a fat round 28-unit mark, so on the render
   (`/tmp/shots/duck-trail3.png`) they merged into single blobs. A switchback
   has no cusp.
3. Clearing the pre-existing "phase 1 uses the whole blank sheet" guard by
   pushing `yTop` to 110 put the route's FIRST POINT so high that the octopus
   and its glass — which stand at that point — were clipped by the top of the
   sheet. `yTop: 140` is where `trail4` already starts safely.

Now `switchback({ x0: 120, x1: 880, yTop: 140, yBottom: 480 })`, which is also
the shape the directive actually asks Nivel 2 for: "laberintos". Guard maths:
`minY 140 < 180`, `maxY 480 > 420`, span `340 > 300`. Re-shot at
`/tmp/shots/duck-trail3-fixed.png` — carrier whole, marks evenly spaced, lamp on
the corridor. 999 tests / 54 files still green.

**`duck-trail4`'s start carrier is clipped by the LEFT edge — and that is
PRE-EXISTING, not this change's doing.** Verified against the shipped hen trail
at `/tmp/shots/ref-trail4.png`, which clips the octopus in exactly the same way.
Both square-wave trails start at `(x0, mid - amplitude)`, and the octopus art is
drawn from that point outward with no edge inset. Recorded here rather than
fixed: it is a `TraceCanvas` start-marker concern, outside this change's scope,
and fixing it silently inside an unrelated slice would hide it.
