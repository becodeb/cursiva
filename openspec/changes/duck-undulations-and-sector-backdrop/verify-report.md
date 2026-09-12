# Verification Report: duck-undulations-and-sector-backdrop

**Change**: `duck-undulations-and-sector-backdrop`
**Branch**: `sdd/patos-ondulaciones`
**Mode**: Full artifact set (proposal/specs/design/tasks/apply-progress all present)
**Verified**: 2026-09-13

## Completeness

- Tasks: 44/44 checked in `tasks.md`, including `## Delivery decision` and `## Phase 4 evidence` (orchestrator-appended). No unchecked task found.
- `detective-mode/spec.md` ground-retirement gate read in its reconciled form: `inDetectiveWorld(level) && backdropFor(level.id)`, keyed on the ADVENTURE. Code matches this exactly (see row 4 below).
- `design.md`'s "Measured facts" appendix (brightest = `#b4c5d0` luma 193, quiet band rows 201..818) is reflected in the shipped `SECTOR_BACKDROP.estanque` and in `manifest.json` — no drift.

## Test / Build Evidence (observed, not assumed)

| Command | Result |
|---|---|
| `npm test` | **63 test files / 1223 tests, all green.** Exact match to tasks.md's declared post-change total. Baseline was 60/1162 (+3 test files, +61 tests net of the one deliberate deletion). |
| `npm run build` | Green — `tsc --noEmit` clean, `vite build` succeeds (514 modules). Only warning is the pre-existing >500kB chunk-size notice, unrelated to this change. |

## Per-Requirement Verdict

| # | Requirement | Verdict | Evidence |
|---|---|---|---|
| 1 | Duck geometry exact: t1 `wave(170,1)` cw100; t2 `wave(170,2)` cw90; t3 `waveVaried([{470,155},{350,205}])` cw80; t4 `wave(170,3)` cw70 taper `{1,0.85}`; all `x0:90,x1:910,y:300` | **PASS** | `client/src/levels/catalog.ts:245,264,290-299,320,328` — every literal matches design/tasks byte for byte. Phase-1 guard (span>300, minY<180, maxY>420) asserted at `client/src/levels/catalog.test.ts:415-423` covering all `LEVELS` including the four ducks; `npm test` green confirms it passes at runtime. |
| 2 | Level ids `duck-trail1..4` unchanged (persisted `cursiva.levels.v1` keys) | **PASS** | `git diff main -- client/src/levels/catalog.ts` shows zero `id:` line changes; only `paths`/`title`/`hint`/`rules`/`taper` fields differ for `duck-trail3`/`duck-trail4`. |
| 3 | Medusa regression: `f2-guirnalda`, `f2-agua2..4` keep scattered ground, no lagoon backdrop | **PASS** | `client/src/zoo/backdrops.test.ts:64-68` (`backdropFor` undefined for all four, named "the regression guard"); `client/src/screen/LevelPlay.test.tsx:270-284` (`f2-agua2` render: `backdrop` undefined, `ground` still defined with grass/mud). Both are real, runtime-passing tests, not comments. |
| 4 | `backdropFor` undefined for medusa ids and `trail1..4`, defined for the four duck ids | **PASS** | `client/src/zoo/backdrops.ts:51-54` (`backdropFor` keyed through `adventureFor`, not `sectorOf`); test coverage at `backdrops.test.ts:57-75` exercises all three id groups explicitly. |
| 5 | No `<mask>`, `<pattern>`, `<clipPath>`, `<defs>`, `useId`, `url(#…)` introduced in the diff against `main` | **PASS** | `git diff main --unified=0 -- client/src` scanned for these tokens on added (`+`) lines: every hit is inside a test assertion string (`.not.toContain('url(#')`) or a comment restating the ban (`TraceCanvas.test.tsx:136-144,811-813`; `AdventureIntro.test.tsx:851`). Zero live-markup occurrences. |
| 6 | `transformPath` restricted to `M`/`L`/`C`; `waveVaried` emits only `M`/`C` | **PASS** | `client/src/levels/paths.ts:172-174` throws `comando no soportado` on any other letter; `waveVaried` (`:366-386`) only calls `move`/`cubic`. Asserted at runtime: `paths.test.ts:571-587` (alphabet check + `transformPath` throw on injected `A`). |
| 7 | Luma law asserted against `brightest`, not `quiet`; declared `SECTOR_BACKDROP.estanque` values match `build_art.py` samples | **PASS** | `client/src/zoo/backdrops.test.ts:20-26` asserts `luma(SHEET_PAPER) − luma(b.brightest) >= 55` (not `.quiet`). Manifest parity: `manifest.json` has `quiet`/`brightest` both `#b4c5d0`, `corridorRows {135,889}`, matching `SECTOR_BACKDROP.estanque` exactly and asserted at `artManifest.test.ts:177-189`. |
| 8 | `nextView` stays catalog- and sector-independent (`GameScreen.tsx`) | **PASS** | `git diff main -- client/src/screen/GameScreen.tsx` touches only `initialView`'s docblock, adds a new `resolveEnterAction` function, and adds an `'intro'` render branch; `nextView`'s own function body has zero diff lines — confirmed byte-identical. |
| 9 | Three declared deviations in `apply-progress.md` are harmless and covered by a test | **PASS** | (a) Phase 3's `zoo/adventures.ts` landing early (Phase 2 commit) — cosmetic re-sequencing only, `npm test`/`npm run build` green after every commit per apply-progress.md, and the final gate result confirms it. (b) `pushBand` containment bound scaled by `max(taper.from, taper.to)` — implemented at `buildLevel.test.ts:409-415` (`nominalBand` helper) with the tightness row at `:433` still failing at `band − 1` for `duck-trail2` (falsifiability preserved). (c) `GameScreen.tsx`'s literal `if (state.view === 'play' || state.view === 'intro')` merge (vs. design's bare fallthrough) — covered by `GameScreen.test.tsx:239-252`, which mounts the `'intro'` view and exercises `onStart` dispatching into `play` without throwing. |

## Additional Spot Checks (adversarial)

- `detective-mode` reconciled gate `inDetectiveWorld(level) && backdropFor(level.id)`: implemented at `LevelPlay.tsx:1136-1140` as `if (!inWorld || !corridor || backdrop) return undefined` — De Morgan-equivalent to "ground defined iff inWorld && corridor && !backdrop", i.e. ground retires exactly when both `inWorld` and a resolved `backdropFor` are true. Matches the reconciled spec, not the pre-reconciliation `sectorOf`/`level.maze` framing. **PASS**.
- `trace-canvas/spec.md`'s five ADDED-requirement scenario groups (image slice, no forbidden refs, wall-rect suppression, channel-above-backdrop document order, SHEET_PAPER-regardless-of-ground) each have a named, matching test in `TraceCanvas.test.tsx:718-773`. **PASS**.
- `main-screen/spec.md`'s `resolveEnterAction` scenarios (duck-trail1 → intro unconditionally on records; every other id → play; pure/DOM-free) verified against `GameScreen.test.tsx:222-236` and the function signature itself (no `window`/DOM access, `_records` unused parameter). **PASS**.
- `zoo-map/spec.md`'s `mapBubble` closing-phrase requirement: `client/src/zoo/adventures.ts`'s `mapBubble` and `ZooMap.tsx`'s single call-site collapse, tested at `ZooMap.test.tsx` (onward before, closing after `duck-trail4` filed) — not independently re-read line-by-line here beyond the tasks.md/apply-progress.md description, but `npm test` green covers it at runtime. **PASS (runtime-covered)**.
- Scope stop (tasks 5.5): confirmed no row C-H content — `rg` for sheep/llama/snake/bee/dolphin/hedgehog/snail in the diff returns only pre-existing untouched `detective/assets.ts` entries (apply-progress.md's own claim, spot-checked via the `id:` diff scan in row 2 above and the `git log` commit list, which shows only the four expected feature commits plus one fix and two doc commits).

## Drift Between Artifacts and Code

None found. Every measured number in `design.md`'s "Measured facts" appendix (brightest luma 193/margin 58, quiet band rows 201..818, `corridorRows {135,889}`) is reproduced exactly in the shipped `SECTOR_BACKDROP.estanque` and in `manifest.json`. `tasks.md`'s declared 63/1223 test total and the `npm run build` green claim both reproduced exactly under independent re-run.

## Issues

**CRITICAL**: none.

**WARNING**: none.

**SUGGESTION**:
1. `zoo-map/spec.md`'s `mapBubble`/closing-phrase requirement was verified via `npm test` passing and the artifact descriptions rather than an independent line-by-line read of `ZooMap.tsx`/`ZooMap.test.tsx` in this pass — low risk given the green suite and the pure-function testing pattern used everywhere else in this change, but noted for completeness.
2. `demo: true` on all four duck levels remains a recorded, out-of-scope contradiction with `docs/13` §5 item 2 (carried forward deliberately, not a defect of this change).

## Final Verdict

**PASS**

All nine specifically-requested checks pass against the actual code, not merely against prose. The reconciled `detective-mode` gate is implemented correctly and is provably not keyed on `sectorOf` or `level.maze`. The `url(#…)` ban holds with zero live-markup violations. Test and build gates reproduce the exact numbers declared in `tasks.md`/`apply-progress.md` (63 test files / 1223 tests, build green). All three declared deviations from `design.md` are harmless and each is backed by a real, currently-passing test. No CRITICAL or WARNING issues found.
