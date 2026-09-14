# Apply progress: hedgehog-radial-spines

Batch 1 of N. Scope: Phases 1-8 of `tasks.md` (measured tables through
LevelPlay wiring). Phases 9-14 (four catalog levels, zoo registries, the
six RED confirmations, the isUnlocked/orphan sweep, the final gate and
captures, the docs amendment) are explicitly deferred to a later batch.

## Status

All of Phases 1-8 are `[x]` complete, committed as one work unit per phase
(commit plan units 1-8), tests green, `npm run build` green.

| Phase | Status | Commit |
|---|---|---|
| 1 — Measured Silhouette Tables | done | `623119c` |
| 2-4 — Pure Fold Module (types, geometry, 5 measures, score, render projections, demo segments, debug seed) | done, combined into ONE commit (see deviation below) | `cae9149` |
| 5 — Engine Repairs (levelStart, demo split, evaluateLevel) | done | `40c3950` |
| 6 — Render Layer (SpineLayer, TraceCanvas) | done | `96598d0` |
| 7 — Debug Flag (devMode.ts) | done | `c81e78e` |
| 8 — LevelPlay Wiring | done | `ad74f0d` |
| 9-14 | NOT STARTED — later batch | — |

## Test/build counts measured

- Baseline (before this batch): **76 files / 1730 tests**, green.
- After Phase 1: 78 files (no — `detective/assets.test.ts` is new) / 1739ish — measured cumulatively, not per-phase-committed-separately; see final count below.
- **After Phase 8 (end of this batch): 79 test files / 1810 tests, green.**
- `npm run build` (`tsc --noEmit && vite build`): green, no new errors. Pre-existing chunk-size warning (>500kB) is unrelated to this change.
- One full-suite run reported `1 failed | 1805 passed` at `detective/artHierarchy.test.ts > visual hierarchy: the clue outranks the ground it lies on > keeps zoo and sector art on intrinsic canvases with safe alpha and dark pixels` — re-run in isolation (9/9 passed) and re-run of the full suite (79/79, 1806/1806) both green. This is the documented baseline flake (`tasks.md`'s own note: "Four baseline runs... 1 failed / 1729 passed once... the failing test was never captured"). Now captured: it is in `artHierarchy.test.ts`, unrelated to any file this change touches (canvas image-loading timing, not spines/hedgehog code). Attributed to the pre-existing flake, not to this change.

## Deviations from tasks.md / design.md, and why

1. **Phases 2-4 combined into one commit**, not three. `levels/spines.ts` and
   its test file were authored as one cohesive, previously-nonexistent
   module with no usable intermediate state between "types only" and "the
   whole fold" — splitting the diff by function group (types vs measures vs
   render projections) would have been a file-content split, not a
   work-unit split, per `work-unit-commits`' own "do not commit by file
   type" rule. Recorded here rather than silently deviating from the
   commit plan's literal count.

2. **`spineDemoPaths`'s "tip" length is a design decision I made, not one
   given verbatim in design.md.** Design §3.3 lists the function's
   signature (`spineDemoPaths(cfg, k)`) and calls it "the first `k`
   anchor→tip line segments" but never states what "tip" means
   numerically. I chose the length band's own midpoint,
   `(lenMin + lenMax) / 2`, as a plausible admissible spine — neither the
   shortest nor the longest. This is an implementation decision within an
   underspecified contract, not a resolution of one of §9's five open
   author questions (none of which concern the demo).

3. **Found and resolved a real contradiction in design.md §2 D3 / §11.1
   item 5** (full reasoning in the `demoPlays` doc comment,
   `LevelPlay.tsx`, and in `buildLevel.test.ts`'s own comment block above
   the "half 2" describe): design.md states `demoPlays`'s formula as
   UNCHANGED from the old `playDemo` (`!!level.demo && guide === 'full'`)
   AND separately requires `demoPlays(level, 'none') === true` for a
   routeless `spines` level with `demo: true`. Both cannot hold — every
   hedgehog config carries `showGuide: false` (design.md §8's own literal
   table), so `guideLevelFor` can only ever return `'none'` for it, and the
   unchanged formula would leave hedgehog1's demo permanently unreachable
   despite the rename, which defeats the entire stated purpose of "the
   second, unnamed blocker" repair. **Resolution taken**: a `spines` level
   bypasses the guide-band gate entirely (`!!level.demo`, unconditional on
   `guide`) — it authors no guide ladder to withdraw from in the first
   place, so gating on a `'full'` band it can never reach is not "the band
   rule," it is a vacuous permanent lock. Every other level, including
   every existing `kind: 'free'` level (none of which declares `demo`),
   keeps the exact unchanged formula, so the whole-catalog invariant design
   also states (`demoPlays(l,g) === (!!l.demo && g==='full')` for every `l`
   in the CURRENT catalog) holds for every level this change does not
   touch. Both demo-repair halves were confirmed RED against the
   pre-Phase-5 source (via `git stash` of the source files only, keeping
   the new tests) and confirmed GREEN after restoring, per tasks.md
   5.4/5.6.

4. **The Phase 11 six-RED-confirmations are NOT yet executed** (they are
   Phase 11, out of this batch's scope) — EXCEPT the two demo-repair halves
   (item 3 above), which tasks.md itself schedules inline during Phase 5,
   and which I executed and verified as described.

## What Phase 9 (the next batch) needs to know

- `levels/types.ts`'s `levelStart`/`buildLevelTarget`'s existing
  `"every shipped level's target.start is byte-identical..."` test in
  `buildLevel.test.ts` already has an `else if (level.spines)` branch ready
  for when `hedgehog1..4` land in `LEVELS` — no further edit needed there.
- `demoPlays`'s whole-catalog invariant test in `buildLevel.test.ts`
  ("demoPlays(l, g) === (!!l.demo && g === 'full') for every shipped level
  (none of which carries spines)...") explicitly asserts
  `level.spines` is `undefined` for every level in the CURRENT catalog.
  **Once Phase 9 adds `hedgehog1..4`, this assertion will need to change**
  — the invariant no longer holds unconditionally for hedgehog1 (which has
  `demo: true`); Phase 9 (or whichever batch adds the catalog rows) should
  split this test into "levels without spines keep the old formula" /
  "levels with spines keep `!!demo` unconditionally," using the pattern
  already established by the two new `spines`-fixture tests directly above
  it in the same file.
- `HEDGEHOG_SILHOUETTE`, `spineBody`/`spineAnchors`/`spineOrigin`/
  `spineAim`/`spineSettle`/`spineScore`/`spineMarks`/`spineRings`/
  `spineDemoPaths`/`debugSpines`/`seedSpines`, `demoPlays`, and
  `spineDebugCount` are ALL currently orphans outside their own test files
  — every one of them has a real caller now (`buildLevel.ts`,
  `evaluateLevel.ts`, `LevelPlay.tsx`), but NO catalog level authors
  `spines` yet, so the whole feature is unreachable from any real level
  until Phase 9's four rows land. This matches `tasks.md`'s own note
  ("Unit 6... unreachable from any real level until Unit 7"; "Unit 7...
  unreachable from the map until Unit 8") and is expected, not a defect.
- §9's five open author questions are untouched, as required.
- `restartRun`'s pre-existing bare `EMPTY_WAYPOINTS` bug is recorded in a
  code comment (`LevelPlay.tsx`, inside `restartRun`) and left unrepaired,
  per the explicit non-negotiable constraint #8.

## Files touched (Phases 1-8)

- `client/src/detective/assets.ts` — `HEDGEHOG_SILHOUETTE` + `HedgehogSilhouette` type.
- `client/src/detective/assets.test.ts` — new, guards the transcription ray-for-ray.
- `client/src/levels/spines.ts` — new, the whole pure fold module.
- `client/src/levels/spines.test.ts` — new, 41 tests.
- `client/src/levels/types.ts` — `LevelConfig.spines?`, `LevelTarget.demoPaths`.
- `client/src/levels/buildLevel.ts` — `levelStart`'s third source, `demoPaths` at both return sites.
- `client/src/levels/buildLevel.test.ts` — new describe blocks for the third source and both demo-repair halves.
- `client/src/game/evaluateLevel.ts` — the `spineScore` ternary in the free branch.
- `client/src/game/evaluateLevel.test.ts` — a hedgehog-fixture describe block.
- `client/src/canvas/SpineLayer.tsx` — new render layer.
- `client/src/canvas/SpineLayer.test.tsx` — new, 6 tests (stage 1 coincidence proof).
- `client/src/canvas/TraceCanvas.tsx` — `TraceSpineMark`/`TraceSpines` types, `spines?` prop, render slot.
- `client/src/canvas/TraceCanvas.test.tsx` — a spine-layer describe block.
- `client/src/canvas/devMode.ts` — `spineDebugCount`.
- `client/src/canvas/devMode.test.ts` — its RED-then-GREEN tests, plus the collision guard.
- `client/src/screen/LevelPlay.tsx` — `demoPlays`, `initialSpineState`, `spineRef`/`spineState`/`spinePin`, the live/settle folds, both resets, the render prop, the demo-source rename to `demoPaths`.
- `client/src/screen/LevelPlay.test.tsx` — the call-site-count guard and the screen-level debug-flag-reaches-the-prop test.
