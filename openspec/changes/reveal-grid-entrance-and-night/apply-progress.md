# Apply Progress: The reveal grid — entrance and night sector

**Scope of this run**: Phases 1-3 only (D1 art, D2 mechanic, D3 render
layer), per the orchestrator's explicit instruction. Phases 4-8 were not
started. `state.yaml` was not touched.

**Mode**: Standard (strict TDD disabled, `openspec/config.yaml`
`testing.strict_tdd: false`).

**Baseline**: 65 test files / 1286 tests, `npm run build` green.
**End of this run**: 67 test files / 1336 tests, `npm run build` green.
(+2 files: `RevealLayer.test.tsx`, `revealGrid.test.ts`; +50 tests net,
after one legitimate exemption added to a pre-existing suite — see
"Contradiction found" below.)

---

## Phase 1 — Art: Backdrop Derivation and Band Sampling (D1)

All tasks 1.1-1.7 complete. See `tasks.md`'s own per-task notes for the
measured values and the falsifiability check's output. Summary:

- `nightfall()` implemented in `scripts/art/build_art.py` exactly per
  design.md §3.2 (NORMALIZE, not scale; floor+ceiling from one knob).
- Pipeline run. Manifest measured: aquarium `#c7d9e0`/`#9bb6c5` (exact
  match to the design's prediction), sand `#dad0c0`/`#d6cbba` (exact
  match), night `brightest` `#526084` (luma 96, exact), `quiet` `#394459`
  (luma 67, exact). The night backdrop's colour is genuinely blue-tinted
  (moonlight), not grey — expected, and it caused a real, unrelated test
  failure (below).
- `backdrops.ts` widened with `tile?`/`ink?`/`inkDim?` and five new tokens
  (`GLASS_GRIME`, `SAND_DRIFT`, `NIGHT_VEIL`, `TORCH_CHALK`,
  `TORCH_CHALK_DIM`).
- `assets.ts`'s `SECTOR_BACKGROUND_ART` widened with `'night'`.

### Deviation, not silent: `PENDING_ENTRANCE_BACKDROP`

**Discovered cross-phase dependency in `tasks.md` itself.** Task 1.3 asks
for the `glass`/`sand`/`night` rows to land directly inside
`ADVENTURE_BACKDROP`. `ADVENTURE_BACKDROP` is typed
`Partial<Record<AdventureId, AdventureBackdrop>>`, and `AdventureId`
(`zoo/adventures.ts`) is only widened to include `'glass' | 'sand' |
'night'` by task 5.1 — Phase 5, which this run was explicitly told not to
start. Adding those object-literal keys now fails `tsc --noEmit` ("Object
literal may only specify known properties") the instant this file alone is
compiled — this is not a hypothetical, it was reproduced and reverted
during this session.

This also contradicts the tasks.md's own D1 seam entry (Review Workload
Forecast table), whose stated rollback boundary is "Delete `nightfall` +
its `PASSTHROUGHS` row + the three `ADVENTURE_BACKDROP` rows" — implying
D1 was assumed to stand alone with a green build, which is only possible
if `AdventureId` already carried those three keys. It does not, until
Phase 5. Since the orchestrator's brief requires `npm run build` green at
the end of EACH phase in this run, I could not implement task 1.3 exactly
as literally written without either (a) breaking the build, or (b)
reaching into Phase 5's file, both forbidden.

**Resolution**: the three rows live in a new export,
`PENDING_ENTRANCE_BACKDROP: Readonly<Record<'glass'|'sand'|'night',
AdventureBackdrop>>`, in the same file (`zoo/backdrops.ts`), fully
documented with the reasoning above, and using the FINAL, already
hand-copied manifest literals — no further copying work is deferred, only
the wiring. Phase 5's task 5.1 becomes a one-line change:
`ADVENTURE_BACKDROP = { ...ADVENTURE_BACKDROP, ...PENDING_ENTRANCE_BACKDROP
}` (or equivalent inline rows) once `AdventureId` is widened.

Tasks 1.5 and 1.6 (the test additions) were written against
`PENDING_ENTRANCE_BACKDROP` instead of `ADVENTURE_BACKDROP.glass/.sand/
.night`, with the same assertions design.md specifies. `artManifest.test.ts`'s
`REGISTERED.length` was bumped 75→76 (a necessary consequence of widening
`SECTOR_BACKGROUND_ART`, task 1.4, that the task list did not call out).

### Contradiction found: `artHierarchy.test.ts`'s achromatic-dark-pixel guard

Running the full suite after Phase 1 surfaced one real, pre-existing test
whose assumption the design's own literal contradicts:
`artHierarchy.test.ts`'s "keeps zoo and sector art on intrinsic canvases
with safe alpha and dark pixels" asserts every full-canvas background's
near-black (< luma 50) pixels are ACHROMATIC — a reasonable rule for hand-
drawn contour art, where a near-black pixel really is a drawn outline.
`nightfall()` (design.md §3.2, ratified `NIGHT_TINT = (0.858, 1.000,
1.370)`) deliberately tints EVERY opaque pixel toward moonlight, including
the scene's own shadows — its darkest pixels are chromatic (blue) BY
CONSTRUCTION, which is the whole point of the transform, not a defect.

This is a genuine conflict between an existing guard's assumption and this
change's own ratified design, not something to code around silently. I
added one narrow, documented exemption (`COLOUR_GRADED_FULL_CANVAS = new
Set(['sector-night-background.png'])`) rather than weakening the rule for
every other asset — every other full-canvas background keeps the original,
unweakened check. See the comment in `artHierarchy.test.ts` for the full
reasoning.

### Falsifiability check (task 1.7), full output

Method: temporarily inverted all three falsifiability assertions
(`toBeLessThan` → `toBeGreaterThanOrEqual`), ran the suite, confirmed all
three failed, then reverted.

```
FAIL src/zoo/backdrops.test.ts > ... > goes red for SHEET_PAPER against the aquarium ...
AssertionError: expected 40 to be greater than or equal to 55
FAIL src/zoo/backdrops.test.ts > ... > goes red for SHEET_PAPER against the sand ...
AssertionError: expected 43 to be greater than or equal to 55
FAIL src/zoo/backdrops.test.ts > ... > goes red for INK_COLOR against NIGHT_VEIL ...
AssertionError: expected 18 to be greater than or equal to 55
Test Files  1 failed (1)
     Tests  3 failed | 16 passed (19)
```

All three genuinely sensitive. Reverted; `backdrops.test.ts` green again
(19/19).

### Work Unit Evidence (D1)

| Evidence | Value |
|---|---|
| Focused test | `npx vitest run client/src/zoo/backdrops.test.ts client/src/detective/artManifest.test.ts` → 103/103 green |
| Runtime harness | N/A — node-only harness, no jsdom (repo-wide constraint); the visual bet (dark-glass/dark-sand aesthetic, moonlight tint) is deferred to Phase 7's capture pass, not claimed as verified here |
| Rollback boundary | Delete `nightfall()` + its two `PASSTHROUGHS` edits + the sixth row; delete the five tokens, the `AdventureBackdrop` field widening, and `PENDING_ENTRANCE_BACKDROP` from `backdrops.ts`; delete `'night'` from `SECTOR_BACKGROUND_ART`; revert `artHierarchy.test.ts`'s exemption; re-run `build_art.py` to drop `sector-night-background.png` from the manifest |

---

## Phase 2 — The Reveal Mechanic (D2)

All tasks 2.1-2.7 complete, exactly as specified, no deviation.

- `levels/types.ts`: `RevealConfig` (discriminated union on `mode`),
  `RevealObject`, `LevelConfig.reveal?`.
- `levels/revealGrid.ts` (new): `RevealGrid`, `clearedTiles`, `RevealState`,
  `EMPTY_REVEAL`, `revealTick`, `lightOpacity`, `RevealTile`, `revealTiles`,
  `revealScore`, `debugClearedTiles`.
- `levels/coverage.ts`: `coverageScore` now delegates to `clearedTiles`,
  gains optional `cols`/`rows` params defaulting to the warm-up's own
  resolution.
- `game/evaluateLevel.ts`: line 116 now calls `revealScore` instead of
  `coverageScore` directly; absent `reveal` still routes to `coverageScore`
  at its own defaults, so `f1-libre` stays bit-identical (asserted:
  `revealGrid.test.ts`'s "no reveal field delegates to coverageScore at its
  own defaults — f1-libre stays bit-identical" + `coverage.test.ts`'s new
  bit-identity fixtures).

**One implementation note, not a deviation**: `coverage.ts` imports
`clearedTiles` from `revealGrid.ts`, and `revealGrid.ts` imports
`coverageScore` from `coverage.ts` (the "no `reveal`" delegation branch) —
a genuine circular ES-module import. This is safe here because both usages
are inside function bodies invoked after the whole module graph has
loaded, never at module-top-level; `tsc --noEmit` and `vite build` both
confirm it resolves cleanly. An earlier draft avoided the cycle with a
manual "bind" indirection; removed once confirmed the direct circular
import just works, because the indirection was strictly worse
(harder to read, same runtime behaviour).

### Work Unit Evidence (D2)

| Evidence | Value |
|---|---|
| Focused test | `npx vitest run client/src/levels/revealGrid.test.ts client/src/levels/coverage.test.ts client/src/game/evaluateLevel.test.ts` → 62/62 green |
| Runtime harness | N/A — node-only harness; nothing authors a `reveal` field on a shipped level yet (Phase 4), so this is exercised entirely through synthetic fixtures, per the task's own scope |
| Rollback boundary | Delete `levels/revealGrid.ts` and its test; revert `coverage.ts` to its pre-delegation inline body (git history); revert the one `evaluateLevel.ts` line and its import |

---

## Phase 3 — The Render Layer (D3)

All tasks 3.1-3.7 complete. One naming deviation, functionally
equivalent to the spec:

- `canvas/RevealLayer.tsx` (new): `RevealLayer` component, `RevealLayerProps`.
- `canvas/TraceCanvas.tsx`: `TraceRevealTile`, `TraceReveal` types added;
  `reveal?: TraceReveal` prop; `<RevealLayer>` inserted immediately after
  the backdrop group, before the maze/corridor block.
- `screen/LevelPlay.tsx`: `revealState` (`useState(EMPTY_REVEAL)`);
  `onFrame` folds it on the same throttled sample as `clueTick`/
  `contactTick` (no second cloud scan) AND on the `!drawing` early-return
  branch (so the torch goes out and `seen` resets on finger-lift, which the
  throttled body alone would miss); `restartRun` and `resetSurface`
  (`clearAttempt`'s shared reset, also used on level change) both reset
  `revealState` to `EMPTY_REVEAL`; `reveal` memo built from `revealTiles`
  + the backdrop's own `tile`/hidden-object art; `inkColor`/`inkDimColor`
  widened to fall back to the backdrop's own `ink`/`inkDim`.

**Naming deviation, not a behavioural one**: task 3.3's text says
`backdrop?.tile`/`backdrop?.ink`/`backdrop?.inkDim`. The existing local
variable named `backdrop` in `LevelPlay.tsx` is already narrowed to the
`TraceBackdrop`-shaped prop object (`{ href, quiet, channel }`), which does
NOT carry `tile`/`ink`/`inkDim` — those live only on the raw
`zoo/backdrops.ts` registry row. I kept the raw row in a new variable,
`backdropEntry`, and read `backdropEntry?.tile`/`.ink`/`.inkDim` from it;
the trimmed `backdrop` variable (still exactly `{ href, quiet, channel }`)
is unchanged and still what's passed to `TraceCanvas`'s `backdrop` prop.

### Work Unit Evidence (D3)

| Evidence | Value |
|---|---|
| Focused test | `npx vitest run client/src/canvas/RevealLayer.test.tsx client/src/canvas/TraceCanvas.test.tsx client/src/screen/LevelPlay.test.tsx` → 117 + 57 = 174/174 green (`RevealLayer.test.tsx`+`TraceCanvas.test.tsx` = 117; `LevelPlay.test.tsx` = 57) |
| Runtime harness | N/A — node-only harness (this file's own header comment: state dispatches after `renderToString` returns are no-ops on the server). `onFrame`'s effect on `revealState` is proven to RUN without throwing, matching the same constraint every pre-existing `onFrame` wiring test in this file already accepts; it is not observable through a second render. The visual bet (does a torch read as a torch, do five opacity steps read as a falloff) is explicitly deferred to Phase 7's human-reviewed capture pass |
| Rollback boundary | Delete `canvas/RevealLayer.tsx` and its test; drop the `reveal` prop, its two types, and the `<RevealLayer>` insertion from `TraceCanvas.tsx`; drop the `revealState` hook, the `onFrame`/`restartRun`/`resetSurface` reveal wiring, the `reveal` memo, the `backdropEntry` variable, and the ink-passthrough widening from `LevelPlay.tsx` |

`TraceCanvas.test.tsx`'s six pre-existing guard tests (`:145,163` and
siblings) confirmed still green, untouched.

---

## Full suite / build, end of this run

```
npx vitest run   →  67 test files, 1336 tests, all green
npm run build    →  tsc --noEmit && vite build, green (one chunk-size
                     warning, pre-existing, unrelated to this change)
```

One flaky timeout was observed once in `artHierarchy.test.ts` (PNG
decoding under CPU load right after the art pipeline ran on this Raspberry
Pi host) and did not reproduce on re-run; not a regression.

---

## What did NOT land (by design — out of this run's scope)

Phases 4-8 (the twelve levels, `migrateEntrance`, the zoo registries, the
closing screen and debug flags, the capture pass, the final gate). The
`glass`/`sand`/`night` backdrop rows exist but are unreachable from any
level until Phase 4 authors the twelve configs and Phase 5 wires
`PENDING_ENTRANCE_BACKDROP` into `ADVENTURE_BACKDROP` — the same
"authored but unreached" gap paso C's own Phase 3.3 recorded for a
comparable partial-apply state.

## Accepted assumptions carried forward (no new ones introduced)

Every accepted deviation above was chosen to satisfy the orchestrator's
explicit constraints (build green per phase; do not start Phase 4/5) over
a literal reading of `tasks.md`'s task text, and is fully reversible
without touching Phase 4-8 work.
