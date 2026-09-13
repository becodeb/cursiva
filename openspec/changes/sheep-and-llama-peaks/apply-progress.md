# Apply Progress: Sheep and Llama Peaks in the Mountains

**Mode**: Standard (no `strict_tdd` signal found; existing suite uses a
write-code-then-verify convention throughout, matched here).

## Status

**40/47 tasks complete.** All of Phases 1-6 and 8 are done. Phase 7
(screenshot verification, 7 tasks) is deliberately left unstarted: the
maintainer's explicit instruction for this apply session was "Do NOT take
screenshots — I do that myself at the end." Nothing in Phases 1-6 is
blocked on it; the maintainer's own capture pass can run whenever they
choose.

## Completed Tasks

### Phase 1 — Ridge Geometry (C1)
- [x] 1.1 `peakRidge` + `peakRidgeCorridorLimit` in `client/src/levels/paths.ts`
- [x] 1.2 Their test rows in `client/src/levels/paths.test.ts`

### Phase 2 — Art Pipeline + Backdrop Registry (C2)
- [x] 2.1 `oveja.png` SINGLES row + two `corridor_rows` tuples in `build_art.py`
- [x] 2.2 Ran the pipeline; measured `sector-sheep` (409×448) and both
      backdrops' `brightest` from the rebuilt manifest
- [x] 2.3 `SECTOR_ADVENTURE_ART.sheep`, `ZooAnimalId`, `ZOO_ANIMAL_ART` in `assets.ts`
- [x] 2.4 `backdrops.ts` re-keyed `SectorBackdrop`→`AdventureBackdrop`,
      `CHANNEL_STONE`, the sheep/llama rows
- [x] 2.5 `backdrops.test.ts` luma law + corridorRows coverage + `backdropFor` rows
- [x] 2.6 `artManifest.test.ts` two more backdrop parity rows + sheep asset row
- [x] 2.7 Ran the C2 focused tests — green

### Phase 3 — The Eight Levels (C3)
- [x] 3.1 Eight `LevelConfig`s in `catalog.ts`, `sheep-hill1..4`/`llama-peak1..4`
- [x] 3.2 `EXPECTED_IDS` + the I1-I7 mountain-family describe in `catalog.test.ts`
- [x] 3.3 Ran `catalog.test.ts` — green

### Phase 4 — Registries and Vertex Art Wiring (C4)
- [x] 4.1 `AdventureId`, `Adventure.id`, sheep/llama rows, `mapBubble` `.filter().at(-1)` fix
- [x] 4.2 `adventures.test.ts` new rows, including the defect-fix proof
- [x] 4.3 `montañas.unlockedWhen`, animals, `adventureIds` in `sectors.ts`
- [x] 4.4 `sectors.test.ts` narrowed filter + montañas rows
- [x] 4.5 `LevelConfig.vertexArt?` in `types.ts`
- [x] 4.6 `routeApexes` in `levels/vertexArt.ts`
- [x] 4.7 `vertexArt.test.ts`
- [x] 4.8 `TraceCanvas.tsx`: `channel`, `TraceVertexArt`, `DEMO_STROKE`, 3 ternaries
- [x] 4.9 `TraceCanvas.test.tsx` vertexArt + channel/demo-stroke rows
- [x] 4.10 Byte-identical lagoon regression + tightness pair
- [x] 4.11 `LevelPlay.tsx`: `drawnPlace`, 3 gates, `channel` passthrough, `vertexArt` resolution
- [x] 4.12 `LevelPlay.test.tsx` sheep-hill3 row + duck-trail2/f2-agua2 regression pair
- [x] 4.13 `backpack.ts` the Andean hat entry
- [x] 4.14 `backpack.test.ts` (new file — none existed for the empty registry)
- [x] 4.15 `stars.test.ts` row over the eight new ids
- [x] 4.16 `GameScreen.test.tsx` `resolveEnterAction` coverage for the new ids
- [x] 4.17 `AdventureIntro.test.tsx` sheep/llama render rows
- [x] 4.18 Ran the whole C4 batch plus `backdrops.test.ts` — green

### Phase 5 — Detective-Mode Regression (confirm, not edit)
- [x] 5.1 `world.test.ts` green with no edit
- [x] 5.2 `LevelPlay.test.tsx` row: sheep-hill1 renders title/hint

### Phase 6 — Falsifiability Rows
- [x] 6.1 Lagoon byte-identical regression, data-level, in `backdrops.test.ts`
- [x] 6.2 Four `MUD_INK`/`GOAL_COLOR`/start-green/`DEMO_STROKE` rows plus the
      fifth `SHEET_PAPER`-vs-cordillera row, in `TraceCanvas.test.tsx`
- [x] 6.3 Confirmed by construction: each row asserts the pair's luma gap is
      `< 55` using the exact measured hex literals (design.md §2.1's table),
      so each is provably red against the actual channel candidates named
      there — not asserted the inverse and reverted, since the arithmetic
      itself is what the row exists to encode (matching how
      `backdrops.test.ts`'s pre-existing companion row already worked).

### Phase 8 — Final Gate
- [x] 8.1 `npm test` — **65 test files / 1282 tests, all green** (baseline
      63/1223; net +2 files: `vertexArt.test.ts`, `backpack.test.ts`, both new)
- [x] 8.2 `npm run build` — green, after one fix (see Deviations)
- [x] 8.3 Byte-identical-to-`main` confirmed via `git diff main...HEAD`
- [x] 8.4 Zero new `url(#` occurrences confirmed
- [x] 8.5 Scope stop confirmed — no row D-H content, no edit to
      `cases.ts`/`Deduction`/pistas machinery

## Deferred (not blocked, deliberately unstarted)

### Phase 7 — Screenshot Verification
- [ ] 7.1-7.7 Not started. Maintainer's explicit instruction: "Do NOT take
      screenshots — I do that myself at the end." Reported here as `blocked`
      by that instruction, not silently skipped. Every level, backdrop,
      channel and registry Phase 7 would capture is implemented and covered
      by the test suite; nothing else in the change depends on this phase
      running first.

## Real Test/Build Numbers

- `npm test`: **65 test files / 1282 tests, all green** (baseline on `main`:
  63 files / 1223 tests — net +59 tests, +2 files)
- `npm run build`: **green**
- `git diff --stat main...HEAD`: 37 files changed, 3762 insertions(+), 110
  deletions(-) total, including SDD artifacts. Code-only (excluding
  `openspec/`, `manifest.json`, and the new `sector-sheep.png` binary): 26
  files, **1345 insertions(+) + 110 deletions(-) = 1455 changed lines**.

## Deviations from Design

1. **`ADVENTURE_BACKDROP.sheep.brightest` is `#9da396`, not design.md's
   draft `#b4bec5`.** The orchestrator's prompt already carried the
   corrected measurement (ruling #4: "ladera rows (220,866) brightest
   `#9da396`"), and the rebuilt manifest confirms it exactly — the ladera's
   brightest pixel over the *frozen* corridor band equals its own quiet
   modal colour. `design.md`'s §2.3 code block used a wider, pre-freeze
   sample; that literal is superseded by the actual pipeline output, per the
   design's own `[to measure]` marker on that exact value.
2. **`AdventureIntro.test.tsx` needed one type-level fix `tsc --noEmit`
   caught that `vitest` did not**: it indexed `ANIMAL_ART` (typed over the
   narrower `AnimalId`) with `adventure.animal`, now typed `ZooAnimalId`
   after the widening this change makes. Fixed by indexing `ZOO_ANIMAL_ART`
   instead — not a design deviation, a downstream fix the widening itself
   required.
3. **Byte-identical claims (tasks 4.10, 6.1, 8.3) are proven by targeted
   assertions and `git diff`, not a literal stored pre-change HTML
   snapshot** — this repo has no snapshot-testing setup. Each byte-identical
   test asserts the exact `stroke`/prop values the shipped code produced
   before this change, paired with a tightness check proving the assertion
   is sensitive (task 4.10's own requirement), which is the same rigor
   `backdrops.test.ts`'s pre-existing lagoon regression row already used.

No other deviation from `design.md`. The three corrections `design.md`
itself named (ridge vs wave §1.1, `trail3` not a defect §1.3, I1-I3 replacing
per-step mean slope §1.5) are all implemented exactly as `design.md` states.

## Work Unit Evidence

| Slice | Focused test command | Result | Runtime harness | Rollback boundary |
|---|---|---|---|---|
| C1 | `npx vitest run client/src/levels/paths.test.ts` | 120 passed | N/A — pure geometry | Revert `paths.ts`/`paths.test.ts` |
| C2 | `npx vitest run client/src/zoo/backdrops.test.ts client/src/detective/artManifest.test.ts` | 95 passed | N/A — data/manifest only | Revert `backdrops.ts`, `assets.ts`, `build_art.py` + regenerate `manifest.json` |
| C3 | `npx vitest run client/src/levels/catalog.test.ts` | 66 passed | N/A — unreachable from the map until C4 | Revert the eight `catalog.ts` entries + `catalog.test.ts` additions |
| C4 | `npx vitest run client/src/levels/vertexArt.test.ts client/src/canvas/TraceCanvas.test.tsx client/src/screen/LevelPlay.test.tsx client/src/zoo client/src/screen/GameScreen.test.tsx client/src/screen/AdventureIntro.test.tsx` | 270 passed | Deferred to the maintainer's own Phase 7 capture | `montañas.unlockedWhen` back to `alwaysClosed` + empty `adventureIds`; drop `vertexArt` from the eight configs; empty `BACKPACK_ITEMS` |
| Full suite | `npm test` | 1282/1282 passed (65 files) | N/A | `git revert` of the whole change |
