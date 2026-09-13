# Tasks: Snakes in the sand — dragging objects, and the art as the corridor

Binding inputs: `design.md` — read `§0 Ratified amendments` (A1–A7) and `§881
The seam` FIRST; both supersede `proposal.md`. `specs/*/spec.md` (six files,
already reconciled against `design.md §0` per `state.yaml`'s notes — spec and
design win over the proposal wherever they disagree). `proposal.md` for scope
only. Prior art matched for depth and style:
`archive/2026-09-13-reveal-grid-entrance-and-night/tasks.md`.

**One deliberate resequencing, not silently taken.** Design's own E1 slice
line lists `carrito`'s `SINGLES` row, alpha check, AND its `CART_ART`
registry entry together. But `build_art.py:346-350`'s rule — "the registry
cannot reach it" — requires a pipeline row, a registry entry, and a CONSUMER
to land in the same change, and `design.md §7.1` itself says exactly that
("all three land here", naming the zoo section). `carrito`'s only consumer is
`zoo/backpack.ts`'s row, which cannot exist before Phase 7 wires `arena`. The
same gap paso D found and resolved for `cofre`/`piedra`/`hoja`. Resolution:
Phase 1 keeps only the `SINGLES` pipeline row and its alpha check; `CART_ART`
and the backpack row move to Phase 7, landing together with their consumer.

---

## Phase 1: Measure the Drawn Spines and the Manifest (E1)

Spec traceability: `art-corridor/spec.md` "The Centreline Is Fitted…", "Each
Snake's Fit Parameters, Thickness, Traceable Span and Luma Extremes Are
Sampled Into manifest.json". **Non-negotiable, task one**: no literal in
`artCorridor.ts`, `catalog.ts`, or `backdrops.ts` may be authored anywhere
downstream before 1.3 rebuilds the manifest and 1.4 copies it. 1.1 → 1.2 →
1.3 → 1.4 → 1.5, strictly sequential.

- [x] 1.1 In `scripts/art/build_art.py`: implement `sample_spine(img)` per
      design.md §1.1 — spine sampled column by column, `mid`/`halves` fitted
      at 3 interpolation points per half-arch (closed form, no solver),
      `residual`, `thickness`, `traceFrom`/`traceTo` (eye-white threshold
      minus half-thickness), `bodyBrightest`/`bodyDarkest` (excluding
      `x > traceTo`), `headWhite`. Reached through an optional 6th element on
      the three snake `SINGLES` rows.
- [x] 1.2 In `scripts/art/build_art.py`: add `('carrito.png', 'zoo-cart.png',
      256, 'contour', True)` as a `SINGLES` row (pipeline only — no registry
      entry yet, see the resequencing note above). Verify `carrito.png`'s
      `alpha_bbox` for the speckle-defect class (stable 8–200, or add
      `SPECKLED_ALPHA_SOURCES`); add an `AUTHORED_SOURCE_SIZES` entry only if
      its authored canvas measures exactly 1024×1024.
- [x] 1.3 Run `python3 scripts/art/build_art.py`. Read the rebuilt
      `manifest.json`'s `sector-snake-{small,medium,large}` entries for
      `mid`, `halves`, `residual`, `thickness`, `traceFrom`, `traceTo`,
      `bodyBrightest`, `bodyDarkest`, `headWhite`, and `sector-cart`'s `w`.
- [x] 1.4 **Record the measured values into `design.md`**, replacing every
      `[to copy]` placeholder in §1.3, §3.1, and §3.4–§3.5 with the real
      numbers read in 1.3 — the same discipline pasos C and D each recorded.
- [x] 1.5 **Verify the residual prediction** (§3.5: `residual ≤ 0.10 ×
      amplitude`) for all three cutouts. If it holds, record the confirmed
      C1 margins in `design.md`. **If it fails**, apply the named fallback in
      this order, no code change: (a) lower `corridorWidth` (C1 is linear in
      it, `MIN_CORRIDOR = 30` leaves `snake4` two units of room); (b) raise
      `s_L` on `snake3` above 0.72; (c) split a half-arch in two in the fit.
      Record which lever, if any, was needed.
- [x] 1.6 In `client/src/detective/artManifest.test.ts`: extend the
      registry↔manifest parity check to the three snakes' new fields; add
      `sector-cart`'s pipeline-row parity (registry entry not yet wired — the
      guard only proves the pipeline emits it).
- [x] 1.7 Run `npm test -- detective/artManifest` — green.

## Phase 2: The Fitted Art Corridor (E2)

Spec traceability: `art-corridor/spec.md` (spineWave, DRAWN_SPINE,
placeArtCorridor, coincidence); `level-engine/spec.md` (routes/artCorridor
derivation). Depends on Phase 1's manifest. 2.1 → 2.3 → 2.4 → 2.5.

- [x] 2.1 In `client/src/levels/paths.ts`: add `SpineHalf` and
      `spineWave(o)` per design.md §1.2.
- [x] 2.2 In `client/src/levels/paths.test.ts`: `spineWave` emits only `M`/
      `C`; a uniform alternating `halves` list reproduces `waveVaried`'s `d`
      byte for byte, and `waveVaried`'s uniform list reproduces `wave`'s
      (`garlandVaried`'s own three-generation proof); composes with
      `transformPath` at −90° without throwing; no half overshoots its
      `rise`.
- [x] 2.3 Create `client/src/levels/artCorridor.ts`: `DrawnSpine`,
      `DRAWN_SPINE` (hand-copied from 1.4's recorded values),
      `ArtCorridorPiece`, `ArtCorridorPlacement`, `placeArtCorridor(piece,
      tx)` per design.md §1.3.
- [x] 2.4 In `client/src/levels/types.ts`: add `LevelConfig.artCorridor?`,
      `LevelTarget.routes`, `LevelTarget.artCorridor?`.
- [x] 2.5 In `client/src/levels/buildLevel.ts`: `layOutPaths` returns `tx`;
      derive `routes` (`routes[0]` IS `polyline`/`length`, same objects) and
      `artCorridor` (via `placeArtCorridor`) AFTER the centring translation,
      through that same `tx`.
- [x] 2.6 In `client/src/levels/buildLevel.test.ts`: every shipped level's
      `target` unchanged; `routes[0] === {polyline, length}` by reference.
- [x] 2.7 Create `client/src/levels/artCorridor.test.ts`: box aspect equals
      the cutout's; fitted `mid` lands on `at.y`; `tx` shifts box and pivot
      together; rotation is an isometry; **the coincidence** — 33 probes
      within 0.5 viewBox units of `flattenPathD` against a fixture level,
      through `placeArtCorridor` only; a shifted centreline fails (sensitivity
      proof).
- [x] 2.8 Run `npm test -- levels/paths levels/artCorridor levels/buildLevel`
      — green.

## Phase 3: Fix the Multi-Route Wall Check (E3) — regression before repair

**Non-negotiable**: A2 repairs a LIVE pre-existing defect (`corridorTick`
reads `paths[0]` only). Its regression lands here, before Phase 6 authors any
level that would otherwise look broken for the wrong reason.

- [x] 3.1 In `client/src/screen/corridorTrack.test.ts`: **write the RED
      regression test first** — a synthetic three-route fixture where the
      shipped `corridorTick(polyline0, …)` alone reads a point near route 2's
      body as far outside, proving A2's defect, before `multiCorridorTick`
      exists.
- [x] 3.2 In `client/src/screen/corridorTrack.ts`: add `RouteSegment`,
      `RouteTrack`, `routeTrackStart(n)`, `multiCorridorTick(routes, track, x,
      y)` per design.md §4 — delegates to the untouched `corridorTick` once
      per route, returns the nearest. `corridorTick` itself MUST NOT change.
- [x] 3.3 In `client/src/screen/corridorTrack.test.ts`: complete the GREEN
      suite — single-route call equals `corridorTick` exactly over the
      shipped `trail1`/`trail2` fixtures; three disjoint routes select the
      nearest and advance only that track; an unvisited route's `maxArc`
      stays `0`; `corridorTick`'s source is byte-identical (diff check).
- [x] 3.4 In `client/src/screen/LevelPlay.tsx`: swap the direct
      `corridorTick(target.polyline, …)` call for
      `multiCorridorTick(target.routes, …)`; both `maxArc` consumers
      (`clueTick`, `reachedTrailEnd`) read `track.tracks[active].maxArc`.
- [x] 3.5 In `client/src/screen/LevelPlay.test.tsx`: `duck-trail2`, `night2`,
      `f2-agua2` (single-route levels) render byte-identical wall feedback to
      before this change.
- [x] 3.6 Run `npm test -- screen/corridorTrack screen/LevelPlay` — green.

## Phase 4: The Arrange Mechanic (E4)

Spec traceability: `object-arrange/spec.md` (all requirements);
`guided-trace-mode/spec.md` (Completion Handoff). Depends on Phase 2. 4.1 →
4.2 → 4.4.

- [x] 4.1 In `client/src/levels/types.ts`: add `LevelConfig.arrange?: {
      readonly from: readonly Point[]; readonly snapRadius: number }`.
- [x] 4.2 Create `client/src/levels/arrange.ts`: `ArrangeState`,
      `initialArrange`, `grabPiece` (topmost containing box), `arrangeTick`
      (same-reference no-op contract; snap-within-radius-or-return-to-scatter
      drop resolution; never a swap), `isArranged` (`placed[i] === i` for
      all i), `debugArrange(cfg, k)`.
- [x] 4.3 Create `client/src/levels/arrange.test.ts`: grab picks the topmost
      overlapping box; a drop within `snapRadius` of a free slot occupies it;
      a drop outside `snapRadius` or nearest an occupied slot returns the
      piece to `from[i]` with no displacement; `isArranged` iff every
      `placed[i] === i` (false on a swap or a partial fill); same reference
      when nothing changes; `debugArrange(cfg, k)` places exactly the first
      `k`; every export runs with no DOM.
- [x] 4.4 In `client/src/screen/LevelPlay.tsx`: add `arrangeState`;
      `arrangeOpen = !!level.arrange && !isArranged(arrangeState)`; inside
      `onFrame`, redirect to `arrangeTick` and return early while
      `arrangeOpen` (no wall/clue/reveal fold runs); `onRelease` returns
      early while `arrangeOpen` (no ink, no attempt, no score);
      `restartRun`/`clearAttempt` reset to `initialArrange`.
- [x] 4.5 In `client/src/canvas/TraceCanvas.tsx`: add `inkHidden?: boolean` —
      suppresses guide/demo/user-stroke/`endArt` only, leaving pointer
      capture, backdrop, and channel untouched. Wire
      `inkHidden={arrangeOpen}` from `LevelPlay`.
- [x] 4.6 In `client/src/canvas/TraceCanvas.test.tsx`: `inkHidden: true`
      renders no ink but backdrop/channel/corridor unaffected; absent/`false`
      is byte-identical to before this change.
- [x] 4.7 In `client/src/screen/LevelPlay.test.tsx`: a synthetic
      `arrange`-bearing fixture with `isArranged` false suppresses ink and
      blocks completion on release; once `isArranged` true, tracing and
      scoring resume exactly as a no-`arrange` level.
- [x] 4.8 Run `npm test -- levels/arrange screen/LevelPlay canvas/TraceCanvas`
      — green.

## Phase 5: Render the Corridor as Plain Images (E5)

Spec traceability: `trace-canvas/spec.md` (Art Corridor Layer render
contract). Depends on Phase 2 (`ArtCorridorPlacement`) and Phase 4 (live
arrange boxes).

- [x] 5.1 Create `client/src/canvas/ArtCorridorLayer.tsx`: `TraceArtCorridor`
      structural type in `TraceCanvas.tsx`; one `<image>` per piece at its
      live box (arrange phase: scatter/held/snapped; trace phase:
      `placeArtCorridor`'s output), `transform="rotate(…)"` only when
      authored, zero `url(#`.
- [x] 5.2 In `client/src/canvas/TraceCanvas.tsx`: add `artCorridor?:
      TraceArtCorridor` prop; insert the layer after the channel-stroke block
      and before every ink layer.
- [x] 5.3 In `client/src/screen/LevelPlay.tsx`: narrow the two guide
      booleans — `guide={showShapeLine && !level.maze && !level.artCorridor
      ? … }`, `showCentreLine={showCorridor && !level.maze &&
      !level.artCorridor}`.
- [x] 5.4 In `client/src/canvas/devMode.ts`: add `arrangeDebugCount(search)`
      (`?debug=ordenadas:<k>`, ungated) and `isSpineDebug(search)`
      (`?debug=espina`, ungated, mirrors `isSectorDebug`'s shape). The four
      shipped parsers stay byte-identical.
- [x] 5.5 Wire both flags in `LevelPlay.tsx`: `arrangeDebugCount` seeds the
      initial arrange state via `debugArrange`; `isSpineDebug` overlays
      `target.paths` as a 2-unit `TORCH_CHALK` line over the art.
- [x] 5.6 Create `client/src/canvas/ArtCorridorLayer.test.tsx`: one `<image>`
      per piece at the derived box; rotation present only when authored;
      zero `url(#`.
- [x] 5.7 In `client/src/canvas/TraceCanvas.test.tsx`: with `artCorridor` set,
      the layer sits after the channel and before the ink; without it,
      markup is byte-identical to today for a lagoon backdrop, a `ground`
      maze, and a plain maze (the six pre-existing `url(#` guards stay green,
      unedited).
- [x] 5.8 In `client/src/canvas/devMode.test.ts`: both new parsers round-trip
      correctly, reject malformed input, require no `window`; the four
      shipped parsers stay byte-identical.
- [x] 5.9 Run `npm test -- canvas/ArtCorridorLayer canvas/TraceCanvas
      canvas/devMode` — green.

## Phase 6: The Four Snake Levels (E6)

Spec traceability: `level-engine/spec.md` (span guard, catalog position, arc
length within orientation group, docs checklist). Depends on Phase 3
(`multiCorridorTick` already fixed — the levels must not ship on top of the
known wall-feedback defect), Phase 4 (arrange), Phase 5 (render).

- [x] 6.1 In `client/src/levels/catalog.ts`: insert `snake1..4` immediately
      after `night4` and before `f2-guirnalda`, per design.md §3.4/§6.1's
      frozen shape and worked literals (spans, rotations, `corridorWidth`,
      `minAccuracy`, `enforceOrder: true` on all four, `demo: true` on
      `snake1` only, `arrange` on `snake2..4` only, `resetOnContact: false`).
- [x] 6.2 In `client/src/levels/catalog.test.ts`: extend `EXPECTED_IDS` with
      `snake1..4` between `night4` and `f2-guirnalda`. Add C1–C6 (§3.2) and
      R1–R7 (§6.2) as one new `describe`, asserted directly over the
      authored literals. Confirm the pre-existing span-guard and
      "keeps every phase-1 route on paper" tests need no edit and stay green.
- [x] 6.3 Run `npm test -- levels/catalog` — green. The four levels exist in
      `LEVELS` but are unreachable from the map until Phase 7 wires `arena`.

## Phase 7: The Zoo — Backdrop, Sector, Animal, Backpack (E7)

Spec traceability: `trace-canvas/spec.md` (`SAND_HOLLOW` channel,
`corridorArt` luma law L1–L4/R1–R4, registry-completeness guard);
`zoo-map/spec.md` (Sector-to-Adventure Mapping, Backpack Registry,
ZooAnimalId/vibora, no closingBeat). Depends on Phase 6. Reunites the
`carrito` registry entry with its consumer here, per the resequencing note.

- [x] 7.1 In `client/src/zoo/backdrops.ts`: add `SAND_HOLLOW = '#3b332b'`;
      widen `AdventureBackdrop` with `corridorArt?: {brightest; darkest;
      headWhite}`; add the `snake` row — `channel: SAND_HOLLOW`, `ink:
      TORCH_CHALK`, `inkDim: TORCH_CHALK_DIM`, `corridorArt` from 1.4's
      recorded values.
- [x] 7.2 In `client/src/zoo/backdrops.test.ts`: assert L1–L4 (all ≥ 55) and
      the four falsifiability rows R1/R2/R3/R4 (all < 55, R2 reusing the
      existing unedited assertion). **Add the registry-completeness guard**:
      the union of the luma loop's hand-listed groups' keys equals
      `Object.keys(ADVENTURE_BACKDROP)`; add a test proving a hypothetical
      ungrouped row fails the guard (sensitivity proof).
- [x] 7.3 In `client/src/detective/assets.ts`: add `CART_ART` (from 1.3's
      measured `sector-cart` width) and widen `ZooAnimalId | 'vibora'`,
      `ZOO_ANIMAL_ART.vibora = SECTOR_ADVENTURE_ART.snakeMedium`.
- [x] 7.4 In `client/src/detective/artManifest.test.ts`: complete the
      `sector-cart` parity check now that 7.3 registers it.
- [x] 7.5 In `client/src/zoo/adventures.ts`: `AdventureId | 'snake'`; add the
      `snake` row (`animal: 'vibora'`, `levelIds: snake1..4`, `sector:
      'arena'`, intro/closing text per design.md §7.2, **no `closingBeat`**).
- [x] 7.6 In `client/src/zoo/sectors.ts`: `arena.unlockedWhen = (records) =>
      isFiled(records, 'night4')`; `arena.adventureIds = snake1..4`;
      `arena.animals = [{id:'vibora', dx:0, dy:0, size:30,
      appearsWhen:['snake4']}]`. Narrow the "undeveloped sectors stay fogged"
      test set to `bosque`/`sendero`.
- [x] 7.7 In `client/src/zoo/backpack.ts`: add `{id:'carrito', art: CART_ART,
      grantedBy:'arena', earnedWhen:['snake4']}`.
- [x] 7.8 In `client/src/zoo/adventures.test.ts`, `sectors.test.ts`,
      `backpack.test.ts`: the víbora appears/disappears on `snake4`; `arena`
      stays fogged until `night4`; `resolveCloseAction` returns `null` for
      every `snake1..4` (no `closingBeat`); the map bubble resolves the
      víbora's closing line once `snake4` is filed; `carrito` is
      absent/present per `earnedWhen`.
- [x] 7.9 Run `npm test -- zoo/ detective/artManifest` — green. The backdrop
      resolves for the first time here — where the captures start paying off.

## Phase 8: Screenshot Verification (last, human-reviewed, not optional)

Non-negotiable: last phase, after Phases 1–7 land — the only surface where
every backdrop, mechanic, and registry is live together. Dev server already
running at `http://localhost:5173`. Output goes to **`capturas/pasoE/`** —
`capturas/e/` already holds paso D's captures; do NOT write there. Uses
`scripts/shot.sh`. `?debug=` flags are render-only and need no `&dev`;
`?nivel=intro-<id>`/`?nivel=cierre-<id>` need `&dev`.

- [x] 8.1 Confirm the dev server at `http://localhost:5173` answers before
      capturing.
- [x] 8.2 Capture each of the four snake levels untraced and part-traced into
      `capturas/pasoE/`: `snake1..4.png`, plus a mid-drag and a
      correctly-arranged capture of `snake2` via `?debug=ordenadas:<k>`.
- [x] 8.3 Capture `?debug=espina` on `snake1` and `snake3` — the fitted
      centreline overlaid on the drawing, photographing §1.4's coincidence.
- [x] 8.4 Capture the arena before and after `snake4`
      (`?debug=progreso:night4` / `?debug=progreso:night4,snake1,snake2,
      snake3,snake4`) — the map with the víbora standing, the backpack with
      `carrito`.
- [x] 8.5 Capture `?nivel=intro-snake&dev` (the adventure intro); confirm no
      `?nivel=cierre-snake` route exists, since `snake` carries no
      `closingBeat` (the arena's map-bubble line is the only closing beat).
- [x] 8.6 Capture one `night` level and one `llama` level, the human-readable
      confirmation that both render byte-identical to before this change.
- [x] 8.7 **Read every capture.** Answer explicitly: does `SAND_HOLLOW` read
      as a scooped hollow or a hole punched in the beach; does `TORCH_CHALK`
      read as a child's pencil or a highlight; do three vertical snakes
      (`snake3`) read as snakes or as ropes; does the arrange phase's silence
      read as "pick one up" or "nothing is happening". Record any defect
      found by reading, not by any test.
- [x] 8.8 Correct and re-capture any defect found in 8.7, with a regression
      test added alongside the fix, not only a re-shot picture.
      **Reopened once**: the coordinator's own read of `capturas/pasoE/`
      found this task's first pass incomplete — the arrange scatter fix
      only checked one axis, leaving `snake2`/`snake4` genuinely broken,
      and `snake1`'s placement against the sand's own quiet band had not
      been checked at all. See `apply-progress.md`'s Phase 10 for the full
      second pass: the scatter fix (both axes), `snake1`'s `at.y` fix (with
      the C3/C4 trade-off disclosed in `design.md` §3.6), and the new
      render-level coincidence test in `ArtCorridorLayer.test.tsx` that
      closes the gap which let the first defect through a green suite.

## Phase 9: Final Gate

- [x] 9.1 Run `npm test` (full suite) — green. Baseline: 69 test files / 1436
      tests. Report actual new totals; new test files expected:
      `artCorridor.test.ts`, `arrange.test.ts`, `ArtCorridorLayer.test.tsx`.
      No test drops outside any deliberate, named removal (none named here).
- [x] 9.2 Run `npm run build` — green (`tsc --noEmit && vite build`; never a
      bare `tsc --noEmit`).
- [x] 9.3 Confirm byte-identical to `main` via `git diff main...HEAD`:
      `useTraceInput.ts`, `migrateEntrance.ts`, `cases.ts`, `Deduction.tsx`,
      `AdventureIntro.tsx`, `AdventureClosing.tsx`, `revealGrid.ts`,
      `coverage.ts`, `evaluateLevel.ts`, `corridorTick` itself, every shipped
      level.
- [x] 9.4 Confirm zero new `url(#` occurrences beyond what pre-existed
      (`rg 'url\(#' client/src` shows no new hit).
- [x] 9.5 Update `docs/13_AVENTURAS_POR_ANIMAL.md` §4's status row for
      *Víboras* from pending to shipped.
- [x] 9.6 Confirm every task in this file is closed (`[x]`), none left
      `[~]` — the native gate does not advance to archive while a task sits
      partial.

---

### Accepted deviation

This document exceeds the skill's 530-word cap, the same deviation
`design.md` (this change) and `archive/2026-09-13-reveal-grid-entrance-and-
night/tasks.md` each recorded. The brief asks for named hard-ordering
constraints across a seven-slice, ~2,440-line change plus an explicit capture
phase — that content does not fit a checklist held under 530 words without
deleting the traceability the brief asked for.

---

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~2,440 (design's own bound `sdd-tasks` owns) |
| 800-line budget risk | High |
| Chained PRs recommended | No |
| Suggested split | Single PR, branch `sdd/viboras-en-la-arena`, nine phases as internal commit slices |
| Delivery strategy | exception-ok |
| Chain strategy | size-exception |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
800-line budget risk: High

`size:exception` was accepted by the user UP FRONT this session
(`delivery_strategy: exception-ok`), so per the review-workload guard's own
mapping ("exception-ok: No — maintainer has accepted `size:exception`") no
further decision is required and no chained-PR split is proposed. This
change ships as **one PR** on branch `sdd/viboras-en-la-arena`, with the nine
phases below as internal, individually-revertible commit slices — the same
seam `design.md §881` names, in its own dependency order.

| Phase (slice) | Files | Est. lines |
|---|---|---|
| 1 (E1 — Measure) | `build_art.py`, `artManifest.test.ts` | 300 |
| 2 (E2 — Corridor) | `paths.ts`(+test), `artCorridor.ts`(+test), `types.ts`, `buildLevel.ts`(+test) | 450 |
| 3 (E3 — Walls) | `corridorTrack.ts`(+test), `LevelPlay.tsx`(+test) | 200 |
| 4 (E4 — Arrange) | `arrange.ts`(+test), `types.ts`, `LevelPlay.tsx`, `TraceCanvas.tsx`(+test) | 430 |
| 5 (E5 — Render) | `ArtCorridorLayer.tsx`(+test), `TraceCanvas.tsx`(+test), `LevelPlay.tsx`, `devMode.ts`(+test) | 380 |
| 6 (E6 — Levels) | `catalog.ts`, `catalog.test.ts` | 300 |
| 7 (E7 — Zoo) | `backdrops.ts`(+test), `assets.ts`, `artManifest.test.ts`, `adventures.ts`(+test), `sectors.ts`(+test), `backpack.ts`(+test) | 380 |
| 8 (Capture) | `capturas/pasoE/*.png` (screenshots, not authored code) | 0 |
| 9 (Gate) | `docs/13_AVENTURAS_POR_ANIMAL.md` | ~10 |
| **Total** | | **~2,440** |

**800-line budget risk: High.** ~2,440 against the cached 800-line budget is
~205% over, and phases 2/4/5/7 individually already clear the guard on their
own — stated truthfully, not shrunk to fit, exactly as pasos C and D each
recorded under the same cached `exception-ok` strategy.

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|------------------|--------------------|
| 1 (E1) | Measure the spines into the manifest | commit slice 1 (single PR) | `npm test -- detective/artManifest` | N/A — node, no jsdom; the pipeline emits, nothing consumes yet | Drop `sample_spine`, the 4 fields, the `carrito` `SINGLES` row |
| 2 (E2) | Fit the corridor to the drawing | commit slice 2 | `npm test -- levels/paths levels/artCorridor levels/buildLevel` | N/A — no catalog entry authors the field yet | Delete `artCorridor.ts`/`spineWave`; revert `layOutPaths`'s return |
| 3 (E3) | Fix the multi-route wall check | commit slice 3 | `npm test -- screen/corridorTrack screen/LevelPlay` | N/A — single-route bit-identity is the whole proof | Revert one call site; `corridorTick` was never touched |
| 4 (E4) | Add the object-arrange mechanic | commit slice 4 | `npm test -- levels/arrange screen/LevelPlay canvas/TraceCanvas` | N/A — every shipped level byte-identical | Delete `arrange.ts`; drop the field, the gate, `inkHidden` |
| 5 (E5) | Draw the art corridor as plain images | commit slice 5 | `npm test -- canvas/ArtCorridorLayer canvas/TraceCanvas canvas/devMode` | N/A — exercised through synthetic props | Delete the layer; drop the prop and the two booleans |
| 6 (E6) | Add the four snake levels | commit slice 6 | `npm test -- levels/catalog` | N/A — unreachable from the map until slice 7 | Remove the four entries and their `EXPECTED_IDS` rows |
| 7 (E7) | Open the arena and recover the víbora | commit slice 7 | `npm test -- zoo/ detective/artManifest` | N/A — this is where the backdrop first resolves | Restore `arena.unlockedWhen: alwaysClosed`; empty `adventureIds`/`animals`; drop the backpack/backdrop rows |
| 8 (Capture) | Verify the surface by reading it | commit slice 8 (docs/fixture only) | `scripts/shot.sh` against `http://localhost:5173` → `capturas/pasoE/` | **Real scenario**: human reads every capture (§2.3's dark-hollow bet, §2.1's chalk-ink bet, `snake3`'s vertical read, the arrange phase's silence) — the only phase this repo's node/no-jsdom harness cannot substitute for | Delete `capturas/pasoE/*`; any code fix from 8.8 rolls back with its own regression test |
| 9 (Gate) | Full suite + build + docs status | commit slice 9 | `npm test && npm run build` | N/A | Revert the docs status-row edit only |

Runtime-harness evidence for phases 1–7: **N/A at the unit level** (node, no
jsdom, no testing-library — this repo has no runtime harness), which is
exactly why the drag gesture and §2.3's colour bet are routed to Phase 8's
capture pass instead of being claimed as verified by the unit suite.
