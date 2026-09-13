# Apply Progress: The reveal grid — entrance and night sector

**Scope so far**: Phases 1-4 (D1 art, D2 mechanic, D3 render layer, D4 the
twelve levels + migration), across two apply runs, per the orchestrator's
explicit per-run instructions. Phases 5-8 were not started. `state.yaml` was
not touched by either run.

**Mode**: Standard (strict TDD disabled, `openspec/config.yaml`
`testing.strict_tdd: false`).

**Baseline (run 1, Phases 1-3)**: 65 test files / 1286 tests, `npm run build`
green.
**End of run 1 (Phases 1-3)**: 67 test files / 1336 tests, `npm run build`
green.
**End of run 2 (Phase 4, this update)**: 68 test files / 1370 tests, `npm run
build` green. (+1 file: `migrateEntrance.test.ts`; +34 tests net — 15 new in
`migrateEntrance.test.ts`, 15 new in `catalog.test.ts`'s reveal-grid
`describe`, 4 net from other amended `catalog.test.ts`/`artManifest.test.ts`
assertions, after four pre-existing guards were found broken by the catalog
reorder and amended, not deleted — see Phase 4's own section below.)

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

## Phase 4 — The Twelve Levels and the Migration (D4)

All tasks 4.1-4.9 complete; 4.2 and 4.8 are `[~]` partial, each for the same
kind of cross-phase forward reference Phase 1 already established a pattern
for (`PENDING_ENTRANCE_BACKDROP`). No task was skipped; every partial is
fully covered by a synthetic proxy standing in for Phase 5 wiring that does
not exist yet, and every real, already-shippable claim is asserted directly
against the real catalog with no substitution.

- `game/migrateEntrance.ts` (new): `ENTRANCE_UNLOCK_ID='sand4'`,
  `NIGHT_UNLOCK_ID='night4'`, `migrateEntrance`, exactly the three-part shape
  `migrateDuckCase.ts`/`migrateNivel3.ts` established. One deliberate
  signature difference, matching design.md §8.1's own literal: `seedFrom`
  here takes `LevelRecord | undefined` (not `migrateDuckCase.ts`'s bare
  `LevelRecord`), because `f1-libre` used to be `LEVELS[0]` and therefore
  unconditionally reachable — a returning child can have progress with no
  `f1-libre` record at all, and `approvals` still has to floor at
  `APPROVALS_TO_UNLOCK` rather than at 0.
- `game/openProgressStore.ts`: `migrateEntrance` added to the existing
  migration loop, alongside the other three.
- `scripts/art/build_art.py`: `'piedra.png'` added to `SPECKLED_ALPHA_SOURCES`
  after MEASURING the defect, not guessing from the preview (see "The
  `piedra.png` finding" below); three `SINGLES` rows for
  `cofre.png`/`piedra.png`/`hoja.png` → `sector-chest.png`/`sector-stone.png`/
  `sector-leaf.png`, `'contour'`, no `AUTHORED_SOURCE_SIZES` entry for any of
  the three (confirmed, not assumed — see below). Pipeline re-run; manifest
  measured: `sector-chest` 256×200, `sector-stone` 256×170, `sector-leaf`
  242×256.
- `client/src/detective/assets.ts`: `SECTOR_ADVENTURE_ART` widened with
  `chest`/`stone`/`leaf`, the three measured `w`/`h` pairs above.
- `client/src/detective/artManifest.test.ts`: `REGISTERED.length` bumped
  76→79 (the three new `SECTOR_ADVENTURE_ART` entries, picked up automatically
  by the existing `Object.entries(SECTOR_ADVENTURE_ART)` spread); one new
  explicit parity test for chest/stone/leaf's `w`/`h`, mirroring the existing
  sheep-family one.
- `client/src/levels/catalog.ts`: `ENTRANCE` (glass1..4, sand1..4) spread into
  the start of `PHASE_1`, ahead of `f1-libre`; `night1..4` appended as the
  last four entries of `PHASE_1`, after `llama-peak4`. All twelve exactly the
  frozen literals design.md §5.2 specifies — grid, radius, `minAccuracy`,
  titles, hints, object placements, all restated and cross-checked by
  `catalog.test.ts`'s new R1-R8 `describe` below.
- `client/src/levels/catalog.test.ts`: `EXPECTED_IDS` gains the twelve at
  their exact positions; the free-level test amended to design.md §5.1's
  compound form (thirteen `kind:'free'` levels, exactly one — `f1-libre` —
  with no `reveal`; `LEVELS[0]` is `glass1`); one new `describe`
  ("LEVELS — the reveal grid, twelve authored levels") with R1-R8 plus
  catalog-position, checklist-coverage and art-identity checks (15 tests).

### The `piedra.png` finding (task 4.4)

Measured, not guessed from the rendered preview (which showed a plain
checkerboard, indistinguishable from a clean transparent margin). A Python
one-off against `scripts/art/png.py`:

- `png.alpha_bbox(piedra)` returned `(0, 0, 1313, 1198)` — the FULL source
  canvas. `alpha_bbox` crops nothing when opaque pixels exist in every
  corner region, which is exactly the `oveja.png` symptom design.md §3.4
  named.
- A 4-connected blob scan over the same source found **4,200 separate opaque
  regions**: one real stone at 572,352px (59.4% of the total 963,203 opaque
  pixels) and 4,199 scattered specks totalling 390,851px — the same defect
  class as `oveja.png`'s recorded 4,374 specks, arrived at independently.
- `cofre.png` and `hoja.png`, scanned the same way, are each exactly ONE
  opaque blob (1,009,323px and 593,839px respectively) — genuinely clean, not
  the same failure wearing a different preview.

`'piedra.png'` added to `SPECKLED_ALPHA_SOURCES`; `cofre.png`/`hoja.png` left
out. This is the second time this exact defect class has been found in this
change's lineage (paso C's `oveja.png`), both times by measuring rather than
by trusting a rendered preview — worth noting as a pattern for future art
intake, not just a one-off fix.

### `hoja.png`'s canvas size (task 4.5)

Measured with `scripts/art/png.py`: `hoja.png` is 1238×1271, aspect 0.974 —
close to square but confirmed NOT exactly 1024×1024. Per design.md §3.4's own
decision, none of the three findable objects takes an `AUTHORED_SOURCE_SIZES`
entry: `cofre.png` (1314×1197) and `piedra.png` (1313×1198) are both clearly
landscape (~1.10 aspect), and `hoja.png` came within measurement of square but
not exactly — an entry that does not match the source's actual dimensions
would fail `validate_authored_source_sizes` for every asset in the build, not
just this one.

### Four pre-existing guards found broken by the catalog reorder, and fixed

The catalog reorder (`LEVELS[0]` becoming `glass1`, eight levels ahead of
`f1-libre`, four more ahead of `f2-guirnalda`) broke four assertions
`tasks.md`'s own task list did not name. Each was confirmed RED before the
fix and GREEN after (full file run before/after), and each was amended, not
deleted or weakened for any level outside the twelve:

1. **`catalog.test.ts`'s "sounds and buzzes on every level with a corridor"**
   (a pre-existing guard, not part of this change's own task list) asserted
   `feedback.haptics === (kind === 'path')`. Task 4.7's own frozen literal
   sets `haptics: true` on all twelve despite `kind: 'free'` — design.md
   §5.2's explicit call ("a tile clearing under the finger is a contact
   worth feeling"), which falsifies the old guard by construction. Amended to
   `haptics === (hasCorridor || !!level.reveal)`; `tone` is unchanged (still
   tied strictly to having a corridor — the twelve carry no tone).
2. **A second, separate "keeps f1-libre at index 0" guard** at what was line
   711 (distinct from the free-level test tasks.md names by its old line
   number, `:253`) also hardcoded `LEVELS[0].id === 'f1-libre'`. Amended to
   assert `glass1` at index 0 and `f1-libre` unchanged mechanically (`kind`,
   `paths`, no `reveal`).
3. **`levelsByPhase`'s "groups the catalog by phase"** test hardcoded phase
   1's exact id order. Amended to splice in the eight entrance ids at the
   start and the four night ids at the end.
4. **The detective-mode describe's own `phase1Ids` exact-order check**
   ("lists exactly the four trail ids in LEVELS, none of the six removed
   ones") hardcoded the same kind of literal list. Amended the same way.

Two doc-table tests ("scales minAccuracy by phase" and "hides the guide…")
also needed a one-line exemption each — `level.reveal`/`kind==='free'` — both
stated inline in the amended assertion rather than silently, since the
twelve deliberately override the phase-default `minAccuracy` and never show
a guide.

A FIFTH pre-existing test outside `catalog.test.ts` broke the same way:
`game/levelProgress.test.ts`'s "works entirely in memory when there is no
storage" hardcoded the literal `'f1-libre'` instead of using the file's own
`FIRST`/`SECOND` (`LEVELS[0]`/`LEVELS[1]`) constants every OTHER test in that
file already uses — a pre-existing inconsistency in that one test, exposed
(not caused) by `f1-libre` no longer being `LEVELS[0]`. Fixed to use `FIRST`,
matching the file's own established convention.

### The two `[~]` partials, and why they are not full failures

**Task 4.2** (`migrateEntrance.test.ts`). All six scenarios level-engine
spec's "migrateEntrance Copy-Forward Positional-Unlock Migration" requirement
names are asserted and green. Two of them — "a mid-campaign payload keeps its
estanque open" and "a returning child still reaches the entrance's opening" —
cannot yet run against the REAL shipped `zoo/sectors.ts` rows they are meant
to protect, because those rows are Phase 5 work (`estanque.unlockedWhen`
still reads `alwaysOpen`, not `isFiled(records,'sand4')`; `entrada
.adventureIds` is still `[]`, not `[glass1..4, sand1..4]`), and this run was
explicitly told not to start Phase 5. Asserting against the shipped rows
right now would pass trivially regardless of whether the migration works —
`alwaysOpen` ignores its argument, and `nextAdventure` on an empty
`adventureIds` array returns `null` no matter what is seeded. Both scenarios
are instead proven against a locally-built stand-in that is byte-identical to
what Phase 5 will ship: the literal predicate `(records) =>
isFiled(records,'sand4')`, and a `ZooSector`-typed object with
`id:'entrada'`/`adventureIds:['glass1'..'sand4']`. The two REAL,
already-shippable claims in the same requirement — `f1-libre`'s and
`f2-guirnalda`'s own `isUnlocked` against the actual, post-4.7 `LEVELS` — are
asserted directly, with no stand-in.

**Task 4.8** (`catalog.test.ts`'s amended free-level test). Every line of
design.md §5.1's exact test snippet landed except one:
`ADVENTURES.find(a=>a.id==='glass')!.levelIds[0] === 'glass1'` does not
compile yet, because `AdventureId`/`ADVENTURES` only gain a `'glass'` row in
Phase 5's task 5.1. Omitted rather than worked around; Phase 5 must add this
one line once `ADVENTURES` widens.

---

## Full suite / build, end of run 1 (Phases 1-3)

```
npx vitest run   →  67 test files, 1336 tests, all green
npm run build    →  tsc --noEmit && vite build, green (one chunk-size
                     warning, pre-existing, unrelated to this change)
```

One flaky timeout was observed once in `artHierarchy.test.ts` (PNG
decoding under CPU load right after the art pipeline ran on this Raspberry
Pi host) and did not reproduce on re-run; not a regression.

## Full suite / build, end of run 2 (Phase 4, this update)

```
npx vitest run   →  68 test files, 1370 tests, all green
npm run build    →  tsc --noEmit && vite build, green (same pre-existing
                     chunk-size warning, unrelated to this change)
```

No flaky failures observed this run.

---

## What did NOT land (by design — out of this run's scope)

Phases 5-8 (the zoo registries, the closing screen and debug flags, the
capture pass, the final gate). The `glass`/`sand`/`night` levels and their
`SECTOR_ADVENTURE_ART.chest/.stone/.leaf` art now exist and are internally
complete, but are unreachable from the zoo map until Phase 5 wires
`entrada`/`nocturna`'s `adventureIds` and `PENDING_ENTRANCE_BACKDROP` into
`ADVENTURE_BACKDROP` — the same "authored but unreached" gap paso C's own
Phase 3.3 recorded for a comparable partial-apply state, now one phase closer
to closing.

## Accepted assumptions carried forward (no new ones introduced)

Every accepted deviation above was chosen to satisfy the orchestrator's
explicit constraints (build green per phase; do not start the next
out-of-scope phase) over a literal reading of `tasks.md`'s task text, and is
fully reversible without touching Phase 5-8 work. Phase 4 introduces exactly
two forward-reference gaps for Phase 5 to close — `migrateEntrance.test.ts`'s
two synthetic scenarios, and `catalog.test.ts`'s one omitted `ADVENTURES`
assertion — both named above, both trivial one-line additions once `zoo/
adventures.ts`/`zoo/sectors.ts` land their own Phase 5 rows.
