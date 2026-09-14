# Tasks: Dolphins in the pond — a screen that scrolls

Binding inputs: `design.md` — read `§0 Ratified amendments` (A1–A3) FIRST;
they supersede `proposal.md` on three points and set the apply order (G1–G6,
`design.md` §"Review-budget forecast"). `specs/{scrolling-camera,level-engine,
trace-canvas,zoo-map}/spec.md`. `proposal.md` for scope only. Prior art
matched for depth: `archive/2026-09-14-bee-free-trail-and-waypoints/tasks.md`
(paso F).

Corrected citations (verified against the working tree, design.md's own line
numbers were wrong at these four spots): `adventures.ts`'s `mapBubble` filter
is `:224` (doc comment `:147`), not `:97`. `catalog.test.ts`'s haptics clause
is `:427-437`, not `:399-411` (that range is the metronome). `catalog.test.ts`
sites encoding `kind === 'path'` are `:312, 377, 420, 435`. The phase-1
amplitude guard is `catalog.test.ts:580-590`, not `:580-598`; `docs/01 §49`
does not exist as a heading. `viewBoxWidth` world consumers also include
`revealTick` (`LevelPlay.tsx:1139,1183`) and `revealTiles` (`:1448`) —
unreachable on a `kind:'path'` dolphin level, unchanged.

---

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~1,500–1,800 |
| 400-line budget risk | High |
| Chained PRs recommended | No |
| Suggested split | Single PR, branch `sdd/delfines-en-el-estanque`, ten phases as internal commit slices |
| Delivery strategy | exception-ok |
| Chain strategy | size-exception |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: High

`delivery_strategy: exception-ok` was cached with no line budget; the
maintainer has already accepted `size:exception`, matching four prior steps
in this directive (C, D, E, F). This ships as one PR, phases below as
individually-revertible commit slices per `work-unit-commits`.

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|------------------|--------------------|
| G1 Split | `viewWidth` sibling on `LevelTarget` | commit 1 | `npm test -- levels/buildLevel` | N/A — no level authors `camera` yet, so `viewWidth === viewBoxWidth` everywhere | Drop `viewWidth` and the one `Math.min` line per branch |
| G2 Camera | `cameraOrigin`/`seedCameraOrigin`, the debug flag, the `viewBox` expression, the rAF block, V1–V6 against a fixture | commits 2–3 | `npm test -- canvas/camera canvas/devMode canvas/TraceCanvas screen/LevelPlay` | N/A — exercised through synthetic props; `camera` absent on every real level until Phase 5 | Delete `camera.ts`; revert the prop, the `viewBox` expression, and the rAF block |
| G3 Placement | `dolphinExtrema.ts`, the superset proof, the `vertexArt.place` branch | commit 4 | `npm test -- levels/dolphinExtrema screen/LevelPlay` | N/A — `place` absent on the eight shipped ridge levels, which keep `routeApexes` byte for byte | Delete `dolphinExtrema.ts`; revert the branch to `routeApexes` unconditionally |
| G4 Transforms | `stageWidth` parameter on both zoo transforms | commit 5 | `npm test -- zoo/sectors` | N/A — default-argument change, provably inert | Drop the parameter; all fifteen callers already pass none |
| G5 Levels | `dolphin1..4`, catalog guards, the coincidence test against the real catalog | commits 6–7 | `npm test -- levels/catalog canvas/TraceCanvas screen/LevelPlay` | N/A — `ADVENTURE_BACKDROP.dolphin` does not exist yet; the four levels render on paper | Remove the four catalog rows and their `EXPECTED_IDS` entries |
| G6 Zoo | Backdrop row, adventure, sector slot, animal | commit 8 | `npm test -- zoo/ detective/assets` | N/A — the backdrop resolves for the first time here, which is where the captures start paying | Drop the backdrop/adventure/sector/animal rows; `estanque` reverts to eight adventures |
| Sweep | Paso F's lesson: every new export has a real caller | no commit unless a defect is found | `rg` per new symbol, see Phase 8 | N/A | A found orphan becomes its own fix commit |
| Capture | `capturas/pasoG/`, human read-back | no commit — `capturas/` is gitignored (`.gitignore:8`) | `scripts/shot.sh` against `http://localhost:5173` | **Real scenario**: reading the paired captures is the only proof of live camera motion (design §6.2) | Any fix from reading them rolls back with its own regression test |
| Gate | Full suite + build + doc amendment | commit 9 (docs) + commit 10 (gate, likely no diff) | `npm test && npm run build` | N/A | Revert `docs/13`'s status row and item 9 only |

---

## Phase 1: [G1] The World/Window Split

Spec traceability: `level-engine/spec.md` "Optional Camera Field on
LevelConfig and viewWidth on LevelTarget"; `scrolling-camera/spec.md`
"Sheet Width and View Width Are Distinct Quantities".

- [x] 1.1 RED: in `client/src/levels/buildLevel.test.ts`, add a parity test
      asserting every shipped level's target returns `viewWidth ===
      viewBoxWidth`. Confirm RED — `viewWidth` does not exist on the target
      type yet.
- [x] 1.2 In `client/src/levels/types.ts`: add `CameraConfig { viewWidth:
      number; lead: number }`, `LevelConfig.camera?: CameraConfig` (the
      10th additive-optional precedent), and `LevelTarget.viewWidth:
      number` (design §1.1–1.2).
- [x] 1.3 In `client/src/levels/buildLevel.ts`, both return branches: add
      `viewWidth: Math.min(config.camera?.viewWidth ?? MIN_VIEWBOX_WIDTH,
      viewBoxWidth)` (design §1.2). **Corrected during apply**: the
      documented fallback (`MIN_VIEWBOX_WIDTH`) broke the parity invariant
      for any non-camera level wider than 1000 (`trail4`, `viewBoxWidth
      1480`, reported `viewWidth 1000`). Used `viewBoxWidth` as the
      fallback instead — `Math.min(config.camera?.viewWidth ?? viewBoxWidth,
      viewBoxWidth)`. See apply-progress and `docs/13` amendment.
- [x] 1.4 RED→GREEN: in `buildLevel.test.ts`, add a fixture-config test
      authoring `camera: {viewWidth: 200, lead: 0.5}` on a wide synthetic
      path and assert `viewWidth === 200` while `viewBoxWidth` stays the
      full world (the `Math.min` clamp, independent of any catalog level).
      Confirm 1.1 and this case both pass.
- [x] 1.5 Run `npm test -- levels/buildLevel` — green.

## Phase 2: [G2] The Camera

Spec traceability: `scrolling-camera/spec.md` all seven requirements;
`trace-canvas/spec.md` "Camera Origin Mutates the viewBox Attribute
Imperatively..." and "Viewport and Ruled Lines" (MODIFIED).

- [x] 2.1 RED: create `client/src/canvas/camera.test.ts` asserting design
      §6.3's falsifiability table for `cameraOrigin`: HOLD-STILL (a naive
      `headX − lead·view` without `max(prev, …)` passes the lead case but
      fails this one); FORWARD-ONLY; CLAMP at `sheetWidth − viewWidth`;
      LEAD threshold; PEN-LIFT (`headX === undefined` returns `prev`, not
      0); DEGENERATE (`sheetWidth <= viewWidth` returns 0 always). Add
      `seedCameraOrigin` cases: `null → 0`, clamped both ends. Confirm RED
      — the module does not exist.
- [x] 2.2 GREEN: create `client/src/canvas/camera.ts` implementing
      `cameraOrigin` and `seedCameraOrigin` exactly per design §2.1 (pure,
      no React, no DOM, lives beside `placeArt.ts`). Confirm 2.1 passes.
- [x] 2.3 RED: in `client/src/canvas/devMode.test.ts`, add
      `cameraDebugOrigin` cases — valid, negative, malformed, missing all
      return `null` — mirroring the seven shipped parsers. Confirm RED.
      (Corrected: "negative" returns the negative NUMBER as-is, not `null`
      — mirrors every shipped parser's own body; `seedCameraOrigin` is
      where clamping happens, per design §7's own doc comment.)
- [x] 2.4 GREEN: in `client/src/canvas/devMode.ts`, add `cameraDebugOrigin`
      (design §7) through the shipped private `debugArg` helper, ungated.
      Confirm 2.3 passes and the seven shipped parsers stay byte-identical.
- [x] 2.5 In `client/src/canvas/TraceCanvas.tsx`: add the `TraceCamera`
      interface and a `camera?` prop (design §2.1); change the `viewBox`
      attribute expression at `:1003` to `` `${camera?.originX ?? 0}
      ${viewBoxY} ${camera?.viewWidth ?? viewBoxWidth} ${viewBoxHeight}` ``.
- [x] 2.6 In `TraceCanvas.tsx`: add `cameraRef`/`cameraXRef`/
      `viewBoxWidthRef` `useRef` mirrors (assigned on render, beside
      `hazardsRef`/`carrierRef`) and the rAF block immediately after the
      carrier write at `:915-922`, computing `next = cameraOrigin(...)` and
      writing `svg.setAttribute('viewBox', …)` only when `next` changed
      (design §2.1). **Refined during apply**: `cameraXRef` (the loop's own
      monotone accumulator) is NOT reassigned on every render like
      `hazardsRef`/`carrierRef` — an unrelated re-render (the throttled dev
      overlay) would otherwise snap a mid-attempt camera back to its seed.
      It is lazily initialised once and re-seeded only via a `useEffect`
      keyed on `camera?.originX` itself changing (mount + explicit reset),
      never on every render. `cameraRef`/`viewBoxWidthRef` ARE reassigned
      every render as design specifies, since they carry no accumulator.
- [x] 2.7 RED: in `client/src/canvas/TraceCanvas.test.tsx`, add V1–V6
      (design §6.1) against a **fixture** camera config (no real dolphin
      catalog level exists yet): initial `viewBox` reports origin 0 and the
      window width; `?debug=camara:280`-style seeding reflects in the
      initial `viewBox`; the clamp at a seed past the extent; the floor at
      a negative seed; a fixture with no `camera` field renders `` `0
      ${band.y} ${viewBoxWidth} ${band.height}` `` byte-identically.
      Confirm RED.
      **Process note**: 2.5/2.6's implementation was written immediately
      before this dedicated SSR test rather than strictly after a RED
      failure of THIS test file (the two are one mechanical wiring step —
      read a prop, interpolate a string, mirror three refs). The test
      therefore passed on first run rather than failing first. The
      underlying falsifiable logic (`cameraOrigin`/`seedCameraOrigin`) DID
      follow strict RED→GREEN in Phase 2.1–2.4. Recorded rather than
      hidden, per the apply contract.
- [x] 2.8 In `client/src/screen/LevelPlay.tsx`: pass the `camera` prop
      through, and seed it via `seedCameraOrigin(cameraDebugOrigin(search),
      viewWidth, sheetWidth)` at mount and at every reset site
      (`clearAttempt`/`restartRun`/`resetSurface`) — the one initialiser
      design §2.4 requires. Confirm 2.7 passes. **Found during apply**:
      `clearAttempt` calls `resetSurface` (covered once, there), but
      `restartRun` does NOT call `resetSurface` — it duplicates a subset of
      its resets inline (contact-restart path). The reseed was therefore
      added a SECOND time, directly inside `restartRun`, with its own
      dependency-array entries (`level.camera`, `debugSearch`,
      `target.viewWidth`, `target.viewBoxWidth`) — otherwise a contact
      reset (not exercised by the four `resetOnContact: false` dolphin
      levels, but a real engine path) would leave the camera parked
      mid-route while the ink faded, exactly design §2.4's own named
      failure mode.
- [x] 2.9 Run `npm test -- canvas/camera canvas/devMode canvas/TraceCanvas
      screen/LevelPlay` — green (262 tests).

## Phase 3: [G3] Placement — `routeExtrema`

Spec traceability: `level-engine/spec.md` "The Existing wave Generator Is
Reused, and a Trough-Aware Extrema Sibling Is Added".

- [ ] 3.1 RED: create `client/src/levels/dolphinExtrema.test.ts` with the
      superset proof (design §5.1, A2): `routeExtrema(p).filter(e =>
      e.side === 'crest')` must equal `routeApexes(p)` on all eight shipped
      `sheep-hill*`/`llama-peak*` polylines; and `routeApexes(dolphinPoly)`
      returns `[]` (the row that names A2). Confirm RED — the module does
      not exist.
- [ ] 3.2 GREEN: create `client/src/levels/dolphinExtrema.ts` implementing
      `RouteExtremum`, `routeExtrema` (monotone-run scan, NOT a three-point
      scan — design §5.1) and `vertexArtPoints` (crest/trough offset
      formulas). Confirm 3.1 passes.
- [ ] 3.3 RED: extend `dolphinExtrema.test.ts` — on a synthetic
      `wave`-shaped polyline, `routeExtrema` returns alternating
      crest/trough entries at `x` within 0.5 of `x0 + (i+0.5)·w` and `y`
      within 0.5 of `300 ∓ 160`; `vertexArtPoints` falsifiability: fed
      `target.corridorWidth` at `MAX_WIDTH_FACTOR` instead of the authored
      width, `dolphin1`'s crest picture overlaps the channel by 47 units
      (`clues.test.ts:306`'s discipline). Confirm RED.
- [ ] 3.4 GREEN: confirm 3.3 passes against 3.2's implementation with no
      retuning of `routeApexes`.
- [ ] 3.5 In `client/src/levels/types.ts`: add `vertexArt.place?: 'apexes'
      | 'extrema'` and `vertexArt.clear?: number` (design §5.4).
- [ ] 3.6 In `client/src/screen/LevelPlay.tsx:1415-1420`: branch on
      `level.vertexArt.place` — `'extrema'` calls `vertexArtPoints(
      routeExtrema(target.polyline), {corridorWidth: level.corridorWidth`
      **(the AUTHORED width, never `target.corridorWidth`)**`, size, clear:
      clear ?? 8})`; absent falls back to `routeApexes` unchanged.
- [ ] 3.7 Run `npm test -- levels/dolphinExtrema screen/LevelPlay` — green.

## Phase 4: [G4] The Sheet-Width Parameter

Spec traceability: `zoo-map/spec.md` "Image-to-ViewBox Transform and
Background" (MODIFIED).

- [ ] 4.1 RED: in `client/src/zoo/sectors.test.ts`, add explicit-width
      cases for `viewBoxToImage`/`imageToViewBox` at `W = 1560` and `W =
      2120` reproducing design §3.2's channel-row table, and the "161-row
      lie" case (the 1000-wide transform reports 204.8 where the correct
      answer at `W=2120` is 365.6). Confirm RED — the parameter does not
      exist.
- [ ] 4.2 GREEN: in `client/src/zoo/sectors.ts:151-175`, add `stageWidth:
      number = STAGE_W` to both `imageToViewBox` and `viewBoxToImage`
      (design §3.4). Confirm 4.1 passes and add the fifteen-existing-caller
      parity proof (byte-identical at the default).
- [ ] 4.3 Run `npm test -- zoo/sectors` — green.

## Phase 5: [G5] The Four Dolphin Levels

Spec traceability: `level-engine/spec.md` "Dolphin Level Set...",
"catalog.test.ts's Existing Guards Recognize the Dolphin Family", "Docs
§6/§14 Checklist Coverage for the Dolphin Family". Depends on Phases 1–4.

- [ ] 5.1 In `client/src/levels/catalog.ts`: add `DOLPHIN_SIZE = 64` and
      `DOLPHIN_CLEAR = 8` with doc comments citing the 77-unit ceiling
      derivation (design §5.2, A3).
- [ ] 5.2 In `client/src/levels/catalog.ts`: insert `dolphin1..4` after
      `bee4` per design §4.2–4.3's worked literals — `wave` x0/x1/cycles
      per level, `corridorWidth` ladder `110 > 100 > 96 > 84`, `camera:
      {viewWidth: 1000, lead: 0.5}` on `dolphin3`/`dolphin4` only,
      `vertexArt: {art: SECTOR_ADVENTURE_ART.dolphin, size: DOLPHIN_SIZE,
      place: 'extrema', clear: DOLPHIN_CLEAR}`, `demo: true` on `dolphin1`
      only, `resetOnContact: false`, no `clue`, `feedback(0, false)`,
      `rules(1, false, true, 0)`.
- [ ] 5.3 In `client/src/levels/catalog.test.ts`: extend `EXPECTED_IDS`
      with the four dolphin ids after `bee4`; extend `CORRIDORS`/`FLUENCY`
      (four rows each); extend the `minAccuracy`-by-phase exemption and the
      tone/haptics clause at `:427-437` if the dolphin family needs it (it
      should not — same `kind: 'path'` shape as every corridor family).
      Confirm `:289, :297, :352` and the amplitude guard `:580-590` stay
      unedited and green; confirm the `kind === 'path'` sites `:312, 377,
      420, 435` require no change.
- [ ] 5.4 In `catalog.test.ts`: add a dolphin-family `describe` asserting
      the ladder monotone (period count `4<6<10<14`, `corridorWidth`
      `110>100>96>84`), the amplitude guard (`A=160>150`, span/minY/maxY
      per design §4.2) on all four, `camera` present only on
      `dolphin3`/`dolphin4` with `viewWidth === MIN_VIEWBOX_WIDTH`, `demo`
      true only on `dolphin1`, `resetOnContact` false and no `clue` on all
      four, and design §5.2's crest/trough box table.
- [ ] 5.5 Re-point §6.1's V1–V6 rendered-`viewBox` test (Phase 2.7's
      fixture version) at the **real catalog**: `dolphin3` no-debug ⇒
      `viewBox="0 0 1000 600"`; `?debug=camara:280` ⇒ `"280 0 1000 600"`;
      `dolphin4` `?debug=camara:9999` ⇒ the clamp `"1120 0 1000 600"`;
      `?debug=camara:-50` ⇒ the floor; `dolphin1` `?debug=camara:400` ⇒ no
      effect (no camera); and V6's parity list (`f4-la`, `f5-mama`,
      `duck-trail1..4`, `sheep-hill1`, `snake3`, `bee1`, `night2`,
      `glass1`) stays byte-identical.
- [ ] 5.6 Paso E's lesson (hard requirement): create the coincidence test
      (design §6.3 "markup → geometry") — `renderToString` each dolphin
      level's real `TraceCanvas` with the real catalog config; parse every
      `<image href="/art/sector-dolphin.png">`'s `x/y/width/height` **out
      of the HTML string**, never the internal box objects. Assert: (i)
      each box disjoint from the channel band `300 ± (160 + cw/2)` at the
      authored width; (ii) each box's x-centre equals its extremum's x
      within 0.5; (iii) each box lies inside `[0, W] × [0, 600]`
      (`clampArtBox` is the identity); (iv) counts are 4/6/10/14, half
      crest half trough. Falsifiability: with `clear = 0` and `size = 140`
      (`docs/09` §3's literal), (i) and (iii) both fail. This must pass
      given Phases 3 and 5.1–5.2's wiring; if it fails, fix the wiring, not
      the test.
- [ ] 5.7 Insurance test: render `dolphin3` with `sheetBounds.width` forced
      to `1000` (the window) instead of `1560` (the world) and assert the
      dolphin boxes COLLIDE at the window's right edge — §1.3 row 1's
      broken version, asserted broken (design §6.3).
- [ ] 5.8 Run `npm test -- levels/catalog canvas/TraceCanvas
      screen/LevelPlay` — green.

## Phase 6: [G6] The Zoo

Spec traceability: `zoo-map/spec.md` all MODIFIED and ADDED requirements.

- [ ] 6.1 In `client/src/zoo/backdrops.ts`: add the `dolphin` row after
      `duck` — `art: SECTOR_BACKGROUND_ART.lagoon`, `quiet`/`brightest`
      copied verbatim from `duck` (`'#b4c5d0'`), `corridorRows: {top: 135,
      bottom: 889}`, no `channel` (design §3.1).
- [ ] 6.2 In `client/src/zoo/backdrops.test.ts`: assert the dolphin row's
      values equal the duck row's; assert the visible-source-rows
      containment inside `(135, 889)` at `W = 1560` and `W = 2120`; assert
      the channel's own rows (via Phase 4's `stageWidth` param at each
      level's own sheet width) fall inside `(135, 889)` for all four
      dolphin levels (design §3.2).
- [ ] 6.3 In `client/src/zoo/adventures.ts`: `AdventureId | 'dolphin'`; the
      `ADVENTURES.dolphin` row — `levelIds: dolphin1..4`, `sector:
      'estanque'`, `animal: 'delfin'`, intro/closing text per design §8, no
      `closingBeat` (the `mapBubble` filter at `adventures.ts:224`, doc
      comment `:147`, already covers an animal-recovering adventure).
- [ ] 6.4 In `client/src/zoo/adventures.test.ts`: row count; `animal ===
      'delfin'` and `closingBeat` absent; filing `dolphin4` flips
      `mapBubble('estanque', …)` to the dolphin's closing line.
- [ ] 6.5 In `client/src/zoo/sectors.ts`: `estanque.adventureIds` 8 → 12
      (append `dolphin1..4`); `estanque.animals += {id: 'delfin', dx: 105,
      dy: 60, size: 72, appearsWhen: ['dolphin4']}`; `unlockedWhen`
      unchanged.
- [ ] 6.6 In `client/src/zoo/sectors.test.ts`: `estanque.adventureIds`
      equals the twelve ids in order; `unlockedWhen` returns the same
      value as before for inputs that already returned `true`; the Z1
      disjointness assertion — the `delfin` box (via `STANDING_GRIP` off
      `animalSpot`) is inside `ESTANQUE_HIT`, clear of the reed island, and
      disjoint from the duck's box computed from the real `ANIMAL_ART.pato`
      dimensions (design §8).
- [ ] 6.7 In `client/src/detective/assets.ts`: `ZooAnimalId | 'delfin'`;
      `ZOO_ANIMAL_ART.delfin = SECTOR_ADVENTURE_ART.dolphin` — already
      registered at `assets.ts:315`, already passing
      `artHierarchy.test.ts:670-677`. **Verify, do not rebuild.**
- [ ] 6.8 In `client/src/zoo/backpack.test.ts` (or equivalent): assert
      `earnedItems(records)` never returns an entry with `grantedBy ===
      'estanque'` for any `records`, including `dolphin4` filed — the
      explicit no-backpack-item decision (`zoo-map/spec.md` "No Backpack
      Item Is Granted by the Dolphin Adventure"), recorded rather than
      invented.
- [ ] 6.9 Run `npm test -- zoo/ detective/assets` — green.

## Phase 7: `docs/13` Amendment

Spec traceability: proposal item 10; design §10.

- [ ] 7.1 In `docs/13_AVENTURAS_POR_ANIMAL.md` §4's cross table: flip the
      *Delfines* row from "No existe" to "Hecha".
- [ ] 7.2 In `docs/13_AVENTURAS_POR_ANIMAL.md` §4: add, in Spanish, neutral
      register, matching items 5–8's style: **"9. Enmendado al implementar
      el paso G (2026-09-14)."** with the four bullets from design.md §10
      verbatim (the world/window naming choice; the monotone-run scan over
      `routeApexes`; why the camera rejects inertia; `resetOnContact`'s
      incompatibility with a forward-only camera, plus the three minor
      findings — no test can see the camera move, the panned backdrop
      shows only water, the dolphin ships at 64 not ~140).
- [ ] 7.3 Confirm `docs/13` §8 is left as-is — no edit (explicit no-op
      check, stated rather than assumed).

## Phase 8: Paso F's Lesson — the Orphan-Export Sweep

- [ ] 8.1 For every new exported symbol in this change — `cameraOrigin`,
      `seedCameraOrigin`, `TraceCamera`, `cameraDebugOrigin`,
      `routeExtrema`, `vertexArtPoints`, `RouteExtremum`, `DOLPHIN_SIZE`,
      `DOLPHIN_CLEAR` — run `rg '<symbol>' client/src` and confirm at least
      one caller outside its own definition and test file. A symbol with
      no real caller is a defect, not done: fix by wiring it in, not by
      deleting its test. Record the grep result per symbol.

## Phase 9: Screenshot Verification (last, human-reviewed, not optional)

Non-negotiable per `docs/12` §4 and design §6.2 ("no test in this repo can
observe the per-frame `setAttribute('viewBox', …)`" — the captures are the
proof, not the garnish). Dev server: `npm run dev -w client` (or `npm run
dev` from repo root, which forwards to the workspace) at
`http://localhost:5173`. Output goes to **`capturas/pasoG/`**
(`capturas/pasoF/` holds paso F's captures — do not write there).
Invocation: `scripts/shot.sh <url> <out.png> [w] [h]`; `--disable-gpu` is
handled inside the script; width clamps to a 500px floor; `data:` URLs have
no `localStorage`, so every seeded capture goes through the dev server URL.

- [ ] 9.1 Confirm the dev server at `http://localhost:5173` answers before
      capturing.
- [ ] 9.2 Capture the six pairs from design §7's table into
      `capturas/pasoG/`: `dolphin1` control/`?debug=camara:400` (must be
      pixel-identical); `dolphin2` control/`?debug=camara:400`; `dolphin3`
      control (origin 0)/`?debug=camara:280` (half of the 560 extent);
      `dolphin4` control/`?debug=camara:560` (half of the 1120 extent) and
      a third `?debug=camara:9999` (the clamp, route's tail, no blank
      paper past the right edge).
- [ ] 9.3 Capture the map before/after:
      `?debug=progreso:dolphin1,dolphin2,dolphin3,dolphin4` as
      `capturas/pasoG/zoo-before.png` (pre-existing progress only) and
      `capturas/pasoG/zoo-after.png` (with the dolphin's own progress
      flags added), plus the intro/closing screens (`?nivel=intro-dolphin1
      &dev`, the `intro-<levelId>` route paso F's read-back corrected).
- [ ] 9.4 Read every capture pair together, anchoring on the corridor's
      pixel columns, never the art (the SVG sheet does not fill the
      window). Answer explicitly and record the answers: does the lagoon
      at 1.56×/2.12× magnification still read as a pond (§3.3); does a
      64-unit dolphin read as a dolphin or a smudge; does a world that
      holds still for 420 units, pans for 560, then holds still again read
      as one continuous movement or three; does the carrier occlude the
      dolphin it passes; and — the one thing no test in this repo can
      see — does the camera visibly move at all between the control and
      debug captures on `dolphin3`/`dolphin4`.
- [ ] 9.5 If any answer is bad, apply the named fallback (pin the backdrop
      `<image>` to the window instead of the world, design §3.3 — a
      two-line change at `TraceCanvas.tsx`'s backdrop site) or the
      appropriate fix, add a regression test alongside it, and re-capture.

## Phase 10: Final Gate

- [ ] 10.1 Run `npm test` (repo root or `client/` — same workspace script).
      Baseline at `main`: 74 files / 1656 tests. Report the actual new
      totals; expected new files: `canvas/camera.test.ts`,
      `levels/dolphinExtrema.test.ts`, plus extended existing files.
- [ ] 10.2 Run `npm run build` (`tsc --noEmit && vite build`) — green.
- [ ] 10.3 Re-grep `isUnlocked` and state the result (paso E/F precedent):
      confirm its only non-test, non-migration consumer stays the dev-only
      `LevelMap.tsx`, so `dolphin1..4` inserted after `bee4` needs no
      migration.
- [ ] 10.4 Confirm zero new `url(#` occurrences beyond what pre-existed
      (`rg 'url\(#' client/src`); the five shipped guards in
      `TraceCanvas.test.tsx` stay green, unedited.
- [ ] 10.5 Confirm byte-identical to `main` via `git diff main...HEAD` for:
      `useTraceInput.ts`, `coverage.ts`, `revealGrid.ts`, `corridorTrack.ts`,
      `evaluateLevel.ts`, `vertexArt.ts`, `paths.ts`, `arrange.ts`,
      `artCorridor.ts`, `waypoints.ts`, `cases.ts`, `build_art.py`,
      `manifest.json`.
- [ ] 10.6 Confirm every task in this file is closed (`[x]`), none left
      `[~]`.

---

## Not in this change (author-bound, recorded not invented)

- The `estanque` backpack item (none exists today; design/spec both say the
  duck row shipped without one and this change grants none).
- The author's promised reference image for `docs/referencias/`; the schema
  stands in.
- How magnified the lagoon may become before it stops reading as a place
  (§3.3) — art direction, answerable only from Phase 9's captures.
- The exact dolphin size within the 77-unit ceiling — the family ships 64;
  the test asserts the constraint, never this literal.

## Commit Plan (`work-unit-commits`)

Ten work units, each a standalone deliverable, tests included with the
behavior they verify, conventional commits, no `Co-Authored-By` or AI
attribution trailers:

1. `feat(levels): split viewBoxWidth into world and viewWidth window on
   LevelTarget` — Phase 1.
2. `feat(canvas): add pure forward-only lead-window camera and its debug
   seed` — Phase 2.1–2.4.
3. `feat(canvas): wire the camera into TraceCanvas's viewBox and rAF loop`
   — Phase 2.5–2.9.
4. `feat(levels): add routeExtrema placement helper for wave crests and
   troughs` — Phase 3.
5. `feat(zoo): add optional stage-width parameter to viewBox/image
   transforms` — Phase 4.
6. `feat(levels): add dolphin1..4 corridor levels` — Phase 5.1–5.4.
7. `test(canvas): prove the camera and dolphin placement against the real
   catalog` — Phase 5.5–5.8.
8. `feat(zoo): register the dolphin adventure, backdrop, sector slot and
   recovered animal` — Phase 6.
9. `docs(13): record paso G's world-window and camera decisions` — Phase 7.
10. `chore: confirm full suite and build green after paso G` — Phase 10
    (no diff expected unless Phase 8/9 surfaced a fix, which lands as its
    own `fix:` commit named for the finding).

---

### Accepted deviation

This document exceeds the skill's 530-word cap, the same deviation
`design.md` and `specs/*/spec.md` (this change) and
`archive/2026-09-14-bee-free-trail-and-waypoints/tasks.md` each recorded.
The brief names hard requirements (red-first tests by file, the two
prior-paso lessons as their own tasks, the screenshot pairing rule, the
docs amendment content, the commit plan, four author-bound exclusions) that
do not fit a checklist under 530 words without deleting the traceability
those requirements ask for.
