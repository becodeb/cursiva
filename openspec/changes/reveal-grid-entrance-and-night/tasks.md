# Tasks: The reveal grid — entrance and night sector

Binding inputs: `design.md` — read its `§0 Ratified amendments` (A1-A4) and
`§7.2` FIRST; both supersede `proposal.md` and are the contract this file
implements, exactly as `state.yaml`'s notes require. `specs/*/spec.md` (six
files: `reveal-grid` new, `level-engine`/`free-trace-mode`/`trace-canvas`/
`zoo-map`/`main-screen` modified — `progress-store` is NOT in this change).
`proposal.md` for scope/rollback only. Prior art matched for style and depth:
`archive/2026-09-13-sheep-and-llama-peaks/tasks.md`.

**One deliberate resequencing, not silently taken.** `design.md`'s own D1
slice lists the three findable objects' `SINGLES` rows and registry entries
(`cofre`/`piedra`/`hoja`) alongside the backdrop work. The orchestrator's
brief for this phase requires the `SINGLES` row, the `detective/assets.ts`
registry entry AND a consumer to land in the same task
(`build_art.py:346-350`'s "the registry cannot reach it" rule). Their only
consumer is `night1..4`'s `reveal.objects` arrays, which cannot exist before
Phase 4 authors the twelve levels. Resolution: the three findable objects
move to Phase 4 (their own sub-pipeline run, independent of Phase 1's
backdrop-band sampling — they carry no `corridor_rows` and gate no tile-paint
decision), landing in the SAME task as their night-level consumers. Phase 1
keeps only the three backdrops. This is the same kind of forward-reference
management paso C's own Phase 2→Phase 4 `AdventureId` split already
established for this repo — flagged here rather than left implicit.

---

## Phase 1: Art — Backdrop Derivation and Band Sampling (D1)

Spec traceability: `trace-canvas/spec.md` "Reveal Tile Paint Satisfies the
Backdrop Luma Law"; `zoo-map/spec.md` "Entrance and Night Backdrops Resolve
Through the Adventure-Keyed Registry"; `design.md` §2-§3. **Task one,
non-negotiable**: no tile paint and no level geometry may be authored before
1.3 copies the manifest. 1.1 before 1.2 before 1.3. 1.4 depends on 1.3.

- [x] 1.1 In `scripts/art/build_art.py`: change the `fondo pecera.png` and
      `fondo arena.png` `PASSTHROUGHS` rows' fifth element from `None` to
      `(51, 973)` (design.md §2.2's derivation via `viewBoxToImage`, rounded
      outward). Add the sixth `PASSTHROUGHS` row `('fondo bosque.png',
      'sector-night-background.png', 1536, 1024, (51, 973), nightfall)`
      beside the existing untouched `fondo bosque.png → sector-forest-
      background.png` row (paso F still owns that one). Add `nightfall(img)`
      per design.md §3.2: `NIGHT_PEAK=96`, `NIGHT_SHADOW=0.22`,
      `NIGHT_TINT=(0.858,1.000,1.370)` — desaturate toward luma by
      `NIGHT_SAT=0.45` (mute's own shape), tint, then rescale each opaque
      pixel so its luma hits `target = NIGHT_PEAK*(NIGHT_SHADOW+(1-
      NIGHT_SHADOW)*L/SRC_MAX)`, `SRC_MAX` from one extra max-luma pass.
      Docblock states the two-edit swap (row + delete `nightfall`) and the
      `[77, 110]` swap-day gate, word for word from design.md §3.2.
- [x] 1.2 Run `python3 scripts/art/build_art.py` (or its documented
      invocation). Read `manifest.json`'s `sector-aquarium-background`,
      `sector-sand-background` and `sector-night-background` entries for
      `quiet`/`brightest`. **No later task may hand-copy a literal until this
      has run.** Expected: aquarium `#c7d9e0` (212), sand `#dad0c0` (209),
      night `brightest` luma ≈96 ± rounding, `quiet` luma ≈67.
      **Measured**: aquarium `#c7d9e0`/`#9bb6c5` (exact match); sand
      `#dad0c0`/`#d6cbba` (exact match); night `brightest` `#526084` (luma
      96), `quiet` `#394459` (luma 67) — both exactly as predicted.
- [x] 1.3 In `client/src/zoo/backdrops.ts`: widen `AdventureBackdrop` with
      `tile?: string`, `ink?: string`, `inkDim?: string`; widen
      `corridorRows`'s comment to "a corridor **or a reveal grid**". Add
      tokens `GLASS_GRIME='#64726b'` (109), `SAND_DRIFT='#7a6a58'` (109),
      `NIGHT_VEIL='#12161f'` (22), `TORCH_CHALK='#f2efe6'` (239),
      `TORCH_CHALK_DIM` (the same dim-factor convention `INK_COLOR_DIM`
      uses). Add the `glass` row (`SECTOR_BACKGROUND_ART.aquarium`, 1.2's
      `quiet`/`brightest`, `corridorRows:{51,973}`, `tile: GLASS_GRIME`); the
      `sand` row (same shape, `SAND_DRIFT`); the `night` row
      (`SECTOR_BACKGROUND_ART.night` from 1.4, 1.2's `quiet`/`brightest`,
      `corridorRows:{51,973}`, `tile: NIGHT_VEIL`, `ink: TORCH_CHALK`,
      `inkDim: TORCH_CHALK_DIM`).
      **[~] Partial, with reason — see `apply-progress.md`.** The interface
      widening and all five tokens landed exactly as specified. The three
      ROWS did NOT land inside `ADVENTURE_BACKDROP` itself: that object is
      typed `Partial<Record<AdventureId, AdventureBackdrop>>`, and
      `AdventureId` only gains `'glass' | 'sand' | 'night'` in task 5.1
      (Phase 5, out of scope for this apply run and explicitly forbidden to
      start). Adding those keys now fails `tsc --noEmit`
      ("Object literal may only specify known properties") the moment this
      file alone is compiled — a real cross-phase ordering gap in this
      task list, not a workaround. The three rows instead live in a new
      export, `PENDING_ENTRANCE_BACKDROP` (same file, fully documented,
      exact literals below), ready for Phase 5 to wire in with one line.
      `TORCH_CHALK_DIM` = `#989896` (luma ≈152): no formula named
      `INK_COLOR_DIM` exists in this codebase (checked); implemented as the
      same blend `MUD_INK_DIM` uses — 40% toward the backdrop it fades into.
- [x] 1.4 In `client/src/detective/assets.ts`: widen `SECTOR_BACKGROUND_ART`'s
      key union with `'night'`; add `night: { href:
      '/art/sector-night-background.png', w: 1536, h: 1024 }`.
- [x] 1.5 In `client/src/zoo/backdrops.test.ts`: extend the luma law to all
      six rows (`|luma(tile ?? channel ?? SHEET_PAPER) − luma(brightest)| ≥
      55`); add `|luma(tile) − luma(ink ?? INK_COLOR)| ≥ 55` for the three
      new rows; add the night floor scenario (`brightest ≥
      luma(NIGHT_VEIL)+55 = 77`, not merely low); add the three
      falsifiability rows that MUST go RED — `SHEET_PAPER` vs the aquarium's
      `brightest` (fails by 40), `SHEET_PAPER` vs the sand's (fails by 43),
      `INK_COLOR` vs `NIGHT_VEIL` (fails by 37, gap 18 against the 55 law).
      **[~]** Written against `PENDING_ENTRANCE_BACKDROP` (see 1.3's note)
      instead of `ADVENTURE_BACKDROP.glass/.sand/.night` — same assertions,
      same six rows via `{...ADVENTURE_BACKDROP, ...PENDING_ENTRANCE_BACKDROP}`.
      Measured gaps confirmed exactly: aquarium 40, sand 43, night-ink 18
      (the actual luma gap; "fails by 37" is 55−18, the law's shortfall).
- [x] 1.6 In `client/src/detective/artManifest.test.ts`: add
      `ADVENTURE_BACKDROP.glass/.sand/.night` against
      `manifest['sector-aquarium-background']`/`['sector-sand-background']`/
      `['sector-night-background']`'s `quiet`/`brightest`/`corridorRows`,
      mirroring the existing `duck`/`sheep`/`llama` rows.
      **[~]** Same substitution as 1.5: asserted against
      `PENDING_ENTRANCE_BACKDROP.glass/.sand/.night`. Also bumped
      `REGISTERED.length` 75→76 and its comment, a necessary consequence of
      widening `SECTOR_BACKGROUND_ART` (task 1.4) that the task list did not
      call out explicitly.
- [x] 1.7 Run `npx vitest run client/src/zoo/backdrops.test.ts client/src/
      detective/artManifest.test.ts` — green. Confirm the three
      falsifiability rows are sensitive (temporarily assert the inverse and
      revert, or confirm they failed before 1.3's tokens existed — record
      which method was used, paso C Phase 6's own discipline).
      **Done — 103/103 tests green.** Sensitivity confirmed by the first
      method: inverted all three assertions (`toBeGreaterThanOrEqual`
      instead of `toBeLessThan`), ran the suite — all 3 of 3 failed
      (`3 failed | 16 passed (19)`), confirming every falsifiability row is
      genuinely sensitive — then reverted and re-ran green (19/19). Full
      output recorded in `apply-progress.md`.

## Phase 2: The Reveal Mechanic (D2)

Spec traceability: `reveal-grid/spec.md` (Tile Grid Geometry, Erase/Light
modes, Object Latch, Completion Criteria, Finger Radius, Incremental/Whole-
Stroke Fold); `level-engine/spec.md` "Optional Reveal Field on LevelConfig";
`free-trace-mode/spec.md` (both requirements). Fully standalone from Phase 1
— no shared file. 2.1 before 2.2 before 2.3; 2.4 depends on 2.1-2.3.

- [x] 2.1 In `client/src/levels/types.ts`: add `RevealConfig` — a
      discriminated union on `mode`: `{mode:'erase';cols;rows;radius}` |
      `{mode:'light';cols;rows;radius;objects:readonly RevealObject[]}` — and
      `RevealObject {art:ArtImage;size:number;x:number;y:number}`, additive.
      Add `reveal?: RevealConfig` to `LevelConfig` (`goalArt`/`vertexArt`'s
      own convention).
- [x] 2.2 Create `client/src/levels/revealGrid.ts`: `RevealGrid
      {cols;rows;width;radius}`; `clearedTiles(strokes, grid):
      ReadonlySet<number>` — index `row*cols+col` (`coverage.ts:59`'s own
      convention), a tile clears when a sample lands within `radius` of its
      centre (union with the containing-tile rule, so `radius:0` degrades
      exactly to `coverage.ts`'s own marking), segments joined in half-cell
      steps (`coverage.ts:53`'s rule, quoted). `RevealState
      {cleared;lit;point;seen}`, `EMPTY_REVEAL`. `revealTick(prev, points,
      drawing, reveal, width): RevealState` — incremental over segments,
      re-reading `points[seen-1]` as the next window's origin (design.md
      §1.4); same reference when nothing flips; `drawing===false` resets
      `seen=0`/`point=null`; a `light` point within `REVEAL_EPSILON=2` of
      `prev.point` with no new latch returns `prev` unchanged. `lightOpacity
      (d, radius)` — `q=round(clamp(d/radius,0,1)*4)/4`, five steps.
      `revealTiles(reveal, state, width)` — pure projection to render tiles.
      `revealScore(strokes, config, viewBoxWidth)` — erase: cleared fraction
      ×100 at the level's own grid; light: percentage of `objects` within
      `radius` of any whole-stroke sample; no `reveal` → delegates to
      `coverageScore` unchanged. `debugClearedTiles(reveal, fraction)` — pure,
      pre-clears the top `round(fraction*rows)` tile rows (Phase 6's flag).
- [x] 2.3 In `client/src/levels/coverage.ts`: widen `coverageScore(strokes,
      viewBoxWidth, cols=COVERAGE_COLUMNS, rows=COVERAGE_ROWS)`, body
      delegating to `clearedTiles({cols,rows,width,radius:0})` and returning
      `Math.round(100*visited.size/(cols*rows))` — no second walk.
- [x] 2.4 In `client/src/game/evaluateLevel.ts`: line 116, `const accuracy =
      revealScore(strokes, target.config, target.viewBoxWidth)` replacing the
      direct `coverageScore` call — absent `reveal` still routes to
      `coverageScore` at its own defaults inside `revealScore`, exactly
      today's call.
- [x] 2.5 Create `client/src/levels/revealGrid.test.ts`: index convention
      matches `coverageScore`'s cell index for the same row/col; the
      containing tile always clears, one at `radius+ε` does not; `radius:0`
      reproduces `coverageScore`'s visited set exactly (fixture-driven);
      `revealTick` incremental ≡ whole-stroke for window sizes 1..200 over a
      200-point stroke; no segment crosses a pen lift; same reference when
      nothing flips; `REVEAL_EPSILON` suppresses an idle re-render with no
      latch change; `lightOpacity` exactly five values, 0 at centre, 1 at and
      beyond the rim, monotone; an object stays lit after the light moves
      away, latch ≡ whole-stroke `revealScore`; the light branch requires
      every object; the erase branch equals the cleared fraction; no
      `reveal` delegates to `coverageScore`'s own defaults.
- [x] 2.6 In `client/src/levels/coverage.test.ts`: add
      `coverageScore(s,1000) === coverageScore(s,1000,12,8)` for every
      fixture (bit-identity proof) — `coverage.test.ts:90-112`'s four
      hand-tuned rows stay untouched and green.
- [x] 2.7 Run `npx vitest run client/src/levels/revealGrid.test.ts client/src/
      levels/coverage.test.ts client/src/game/evaluateLevel.test.ts` — green.
      Nothing authors a `reveal` field yet; exercised entirely through
      synthetic fixtures.

## Phase 3: The Render Layer (D3)

Spec traceability: `reveal-grid/spec.md` "Reveal Layer Renders as Plain
Rects…"; `trace-canvas/spec.md` "Reveal Layer Renders as Plain Rects Between
Backdrop and Ink". Depends on Phase 2's `RevealState`/`revealTiles`/
`RevealConfig`. 3.1 before 3.2 before 3.3.

- [x] 3.1 Create `client/src/canvas/RevealLayer.tsx`: `TraceRevealTile
      {x;y;w;h;opacity}` and `TraceReveal {fill;tiles;art?}` types in
      `TraceCanvas.tsx` (structural, no import from `levels/`/`zoo/`,
      `TraceBackdrop`'s own convention). `RevealLayer` renders one `<image>`
      per `art` entry via the existing `placeArt(...)+clampArtBox(...,
      sheetBounds)` path, then one `<rect>` per tile — `opacity` emitted only
      when `<1`, a tile at 0 renders no element — inside `<g
      pointerEvents="none">`.
- [x] 3.2 In `client/src/canvas/TraceCanvas.tsx`: add `reveal?: TraceReveal`
      prop; insert `<RevealLayer .../>` immediately after the backdrop group
      (`TraceCanvas.tsx:933-944`) and before the maze/corridor block. Zero
      `<mask>`/`<pattern>`/`<clipPath>`/`<defs>`/`useId`/`url(#`.
- [x] 3.3 In `client/src/screen/LevelPlay.tsx`: add `const [revealState,
      setRevealState] = useState(EMPTY_REVEAL)`; inside the existing
      `onFrame`, after the `OFF_PATH_PERIOD_MS` throttle and beside
      `clueTick`/`contactTick` (no second cloud scan, docs/02 §7.2): `if
      (level.reveal) setRevealState(prev => revealTick(prev, points,
      drawing, level.reveal!, target.viewBoxWidth))`. Memo `TraceReveal` from
      `revealTiles(level.reveal, revealState, width)` + `backdrop?.tile`.
      `restartRun`/`clearAttempt` reset `revealState` to `EMPTY_REVEAL`. The
      `!drawing` early-return branch also sets `point: null`. Widen the ink
      passthrough: `inkColor={inWorld ? MUD_INK : backdrop?.ink}` /
      `inkDimColor={inWorld ? MUD_INK_DIM : backdrop?.inkDim}` — byte-
      identical today, no shipped backdrop declares `ink` yet.
- [x] 3.4 Create `client/src/canvas/RevealLayer.test.tsx`: `<rect` count is
      exactly `N − cleared.size` for an erase grid; five opacity strings and
      no sixth for a light grid; hidden-object `<image>`s render under the
      tiles; zero `url(#`.
- [x] 3.5 In `client/src/canvas/TraceCanvas.test.tsx`: with `reveal` set, the
      layer sits between the backdrop image and the guide/ink paths in
      document order; with no `reveal` prop, no reveal-layer `<rect>`
      renders; **byte-identical regression** — a lagoon backdrop, a `ground`
      maze and a plain maze render byte-identical to before this change.
      Confirm the six pre-existing guard tests (`TraceCanvas.test.tsx:145,
      163` and siblings) stay green untouched.
- [x] 3.6 In `client/src/screen/LevelPlay.test.tsx`: a synthetic
      `reveal`-bearing fixture advances `revealState` on `onFrame`;
      `restartRun` resets it; a `night`-shaped fixture (`ink: TORCH_CHALK`)
      resolves `inkColor` to `TORCH_CHALK`; a fixture with no backdrop `ink`
      resolves to `MUD_INK`/`INK_COLOR` exactly as before this change.
- [x] 3.7 Run `npx vitest run client/src/canvas/RevealLayer.test.tsx
      client/src/canvas/TraceCanvas.test.tsx client/src/screen/
      LevelPlay.test.tsx` — green. Every shipped level renders byte-
      identical; exercised entirely through synthetic fixtures.

## Phase 4: The Twelve Levels and the Migration (D4)

Every hard ordering constraint in the brief converges here — sequential,
binding:

1. 4.1-4.2 (`migrateEntrance`) MUST land before 4.7 inserts the twelve
   configs — the same gating `migratePhase1`/`migrateDuckCase`/
   `migrateNivel3` each required (design.md §8, level-engine spec).
2. 4.4-4.6 (the three findable objects' `SINGLES` row, registry entry and
   consumer) land in the SAME task-group, closed by 4.7's night configs —
   see this file's opening note. Independent of Phase 1's pipeline run.
3. 4.7 depends on both 4.1 (migration exists first) and 4.6 (chest/stone/
   leaf registered).

- [ ] 4.1 Create `client/src/game/migrateEntrance.ts`,
      `migrateDuckCase.ts`'s exact three-part shape: `ENTRANCE_UNLOCK_ID=
      'sand4'`, `NIGHT_UNLOCK_ID='night4'`; `migrateEntrance(records)` seeds
      `sand4` (via `seedFrom` — field-wise MAX, `attempts` summed,
      `streakFail` not carried, `approvals: Math.max(source?.approvals ?? 0,
      APPROVALS_TO_UNLOCK)`) whenever `Object.keys(records).length > 0 &&
      !records.sand4`, source `records['f1-libre']`; seeds `night4` only
      when `records['llama-peak4']?.approvals >= APPROVALS_TO_UNLOCK &&
      !records.night4`. Pure, copy-forward only, returns only changed
      entries.
- [ ] 4.2 Create `client/src/game/migrateEntrance.test.ts`: idempotent (a
      second run on its own output returns `{}`); a fresh install (`{}`)
      writes nothing; a mid-campaign payload with any non-empty records and
      no entrance/night ids keeps `estanque.unlockedWhen` returning `true`
      after merge (the real stake, design.md §8.1); a payload with
      `llama-peak4` meeting `APPROVALS_TO_UNLOCK` and no `night4` keeps the
      old `f2-guirnalda` predecessor's chain unlocked, checked against the
      real `LEVELS`; `nextAdventure(entrada, mergedRecords)` still resolves
      `glass1` regardless of what was seeded; no source record is ever
      mutated. Run `npx vitest run client/src/game/migrateEntrance.test.ts`
      — green.
- [ ] 4.3 In `client/src/game/openProgressStore.ts`: add
      `migrateEntrance(store.all())` to the existing migration loop — order
      irrelevant, the four migrations share no id.
- [ ] 4.4 **Verify `piedra.png`'s alpha before wiring it** (design.md §3.4's
      flagged risk — the `oveja.png` defect class): read it with
      `scripts/art/png.py` and inspect `alpha_bbox`'s returned box against
      the canvas's own size. If the margin is opaque (its rendered
      transparency-checkerboard preview suggests this), add `'piedra.png'`
      to `SPECKLED_ALPHA_SOURCES` (`build_art.py:271`) rather than let
      `alpha_bbox` crop nothing. `cofre.png`/`hoja.png` render flat-black
      margins in preview — check those are genuinely transparent, not the
      same failure with a different symptom, before assuming no opt-in is
      needed.
- [ ] 4.5 In `scripts/art/build_art.py`: add three `SINGLES` rows —
      `('cofre.png', 'sector-chest.png', 256, 'contour', True)`,
      `('piedra.png', 'sector-stone.png', 256, 'contour', True)`,
      `('hoja.png', 'sector-leaf.png', 256, 'contour', True)` — `'contour'`
      matches every sibling `sector-*` row. Run `scripts/art/png.py` against
      `hoja.png` alone to check whether its authored canvas is exactly
      1024×1024; add exactly one `AUTHORED_SOURCE_SIZES` entry for it if and
      only if it is. **Decision, not a question**: `cofre.png` and
      `piedra.png` take NO entry — both render landscape (≈1.10 aspect), and
      a mismatched entry fails `validate_authored_source_sizes`
      (`build_art.py:491`) for every asset in the build. Re-run the
      pipeline; read `manifest.json`'s `sector-chest`/`sector-stone`/
      `sector-leaf` entries for their measured `w` (`h=256` fixed).
- [ ] 4.6 In `client/src/detective/assets.ts`: widen `SECTOR_ADVENTURE_ART`'s
      key union with `'chest' | 'stone' | 'leaf'`; add the three entries with
      4.5's measured `w`/`h`. In `client/src/detective/artManifest.test.ts`:
      add the three cutouts to the registry↔manifest parity check.
- [ ] 4.7 In `client/src/levels/catalog.ts`: insert `glass1..4` then
      `sand1..4` (8 entries) immediately before `f1-libre` — `LEVELS[0]`
      becomes `glass1` (design.md §5.1, amendment A1). Insert `night1..4` as
      the last four entries of `PHASE_1`, between `llama-peak4` and
      `f2-guirnalda`. Shared shape (design.md §5.2): `phase:1,
      kind:'free', surface:'blank', maze:false, resetOnContact:false,
      carrier:false, showGuide:false, letters:[], paths:[],
      corridorWidth:0, feedback:{tone:false, haptics:true, metronomeBpm:0,
      rail:false}`, no `demo`. `rules: {...rules(1,false,false,0),
      minAccuracy:N}` per level. Authored literals, frozen:
      - glass (erase, `fondo pecera.png`): glass1 10×6/60t, r110, min55,
        "El vidrio sucio"; glass2 10×6/60t, r110, min68, "Todo el vidrio";
        glass3 15×9/135t, r110, min76, "Los rincones"; glass4 15×9/135t,
        r80, min82, "Sin dejar marcas".
      - sand (erase, `fondo arena.png`): sand1 10×6/60t, r110, min60,
        "Barrer la arena"; sand2 15×9/135t, r110, min70, "Toda la entrada";
        sand3 20×12/240t, r90, min78, "La arena fina"; sand4 20×12/240t,
        r70, min85, "La última pasada".
      - night (light, derived backdrop): night1 15×9/135t, r200, min100,
        objects `[{chest,(500,300)}]`, "Una luz en la noche"; night2
        15×9/135t, r170, `[{stone,(260,180)},{leaf,(740,420)}]`, "Dos cosas
        perdidas"; night3 20×12/240t, r140, `[{chest,(200,140)},
        {leaf,(500,440)},{stone,(820,200)}]`, "Tres en la oscuridad";
        night4 20×12/240t, r110, `[{leaf,(140,480)},{chest,(520,120)},
        {stone,(880,380)}]`, "La linterna chiquita". Object sizes: chest 96,
        stone 72, leaf 64, each `art: SECTOR_ADVENTURE_ART.chest/.stone/
        .leaf` (4.6's consumer wiring).
      Titles/hints ≤ 80 chars, naming no failure; `hint` is authored but
      never rendered (§4.2, suppressed by the pre-existing `drawnPlace`).
- [ ] 4.8 In `client/src/levels/catalog.test.ts`: insert `glass1..4,
      sand1..4` at the START of `EXPECTED_IDS` (before `'f1-libre'`); insert
      `night1..4` between `'llama-peak4'` and `'f2-guirnalda'`. Amend
      (not delete) the free-level test (`:253`) to design.md §5.1's exact
      form: exactly one free level with no `reveal` field, id `f1-libre`;
      `free.length === 13`; `LEVELS[0].id === 'glass1'`;
      `ADVENTURES.find(a=>a.id==='glass')!.levelIds[0] === 'glass1'`; every
      free level's `paths` is `[]` and `phase` is `1`. Add family invariants
      R1-R8 (design.md §5.3) as one new `describe`: R1 `minAccuracy`
      non-decreasing per adventure; R2 `radius` non-increasing per
      adventure; R3 `cols*rows` non-decreasing per adventure; R4 night's
      object count non-decreasing (1,2,3,3); R5 `((2R/w_t)+2)*((2R/h_t)+2) ≤
      64` for all twelve; R6 no `demo` on any of the twelve; R7 every
      `light` object at least `size/2+20` inside the sheet; R8 every grid is
      5:3 (`1000/cols === 600/rows`). Confirm `:445-470`'s phase-1 arm guard
      needs no edit (`kind !== 'path'` already exempts the twelve) and
      `:559,575`'s free branch needs only the widened count of `paths: []`
      levels — no line change either place.
- [ ] 4.9 Run `npx vitest run client/src/levels/catalog.test.ts` — green.
      `glass`/`sand`/`night` exist in `LEVELS` but are unreachable from the
      map until Phase 5 wires `entrada`/`nocturna`'s `adventureIds` — same
      "authored but unreached" gap paso C's Phase 3.3 recorded.

## Phase 5: Zoo Registries (D5)

Spec traceability: `zoo-map/spec.md` (Sector-to-Adventure Mapping, Backpack
Registry, `recentlyDiscovered`, Animal-less Adventures Excluded, Entrance/
Night Backdrops Resolve); `main-screen/spec.md` (Narrative Entry Screen
Content, animal-less rendering). Depends on Phase 4's twelve ids. 5.1 before
5.2/5.4; 5.4/5.5 can run in parallel with each other.

- [ ] 5.1 In `client/src/zoo/adventures.ts`: widen `AdventureId = 'duck' |
      'sheep' | 'llama' | 'glass' | 'sand' | 'night'`. Add `AdventureSubject`
      union (`{animal:ZooAnimalId;icon?:undefined} |
      {animal?:undefined;icon:ArtImage}`) and `Adventure = AdventureBase &
      AdventureSubject` (design.md §6.1 — the union, not a bare optional
      field, so an animal-less row is a compile error to author wrong). Add
      `adventureIcon(a): ArtImage` (`a.animal ? ZOO_ANIMAL_ART[a.animal] :
      a.icon`). Add `closingBeat?: {line:string; art:ArtImage}`, absent on
      every shipped row. Add `closingLevel(levelId): Adventure | undefined`
      — the adventure whose LAST `levelIds` entry this is, if it carries a
      `closingBeat` (mirror of `introLevel`). Add the three rows: `glass`
      (`icon: CARRIER_LENS_ART`, `levelIds: glass1..4`, `sector:'entrada'`,
      no `closingBeat`); `sand` (`icon: ZOO_OCTOPUS_PRINT_ART`, `levelIds:
      sand1..4`, `sector:'entrada'`, `closingBeat: {line:'¡Se fueron todos
      los animales! Agarrá la lupa: los vamos a buscar.', art:
      CARRIER_LENS_ART}`); `night` (`icon: SECTOR_ADVENTURE_ART.flashlight`,
      `levelIds: night1..4`, `sector:'nocturna'`, `closingBeat: {line:'¡
      Encontramos todo en la oscuridad! La linterna va a la mochila.', art:
      SECTOR_ADVENTURE_ART.flashlight}`). Widen `mapBubble`'s
      `.filter(...)` predicate with `a.animal !== undefined &&`.
- [ ] 5.2 In `client/src/screen/AdventureIntro.tsx`: line 63,
      `ZOO_ANIMAL_ART[adventure.animal]` → `adventureIcon(adventure)` — the
      only line this task touches.
- [ ] 5.3 In `client/src/zoo/adventures.test.ts`: `adventureFor`/
      `introLevel` resolve `glass1`/`sand1`/`night1` correctly,
      `glass2..4`/`sand2..4`/`night2..4` return `undefined` for
      `introLevel`; `adventureIcon` returns animal art for an animal-bearing
      row and `icon` for an animal-less one; `mapBubble` for `entrada`/
      `nocturna` never resolves the animal-placement branch — filing
      `sand4`/`night4` does not change the bubble; `closingLevel('sand4')`/
      `closingLevel('night4')` return their adventures, `closingLevel
      ('glass4')` and every pre-existing last-level id (`duck-trail4`,
      `sheep-hill4`, `llama-peak4`) return `undefined`.
- [ ] 5.4 In `client/src/zoo/sectors.ts`: `entrada.adventureIds =
      [glass1..4, sand1..4]`, `entrada.unlockedWhen = alwaysOpen` (rewrite
      `alwaysOpen`'s docblock from "Deleted in paso D, not a rule" to the
      entrance's own justification — design.md §7.1). `nocturna.adventureIds
      = [night1..4]`, `nocturna.unlockedWhen = (records) =>
      isFiled(records,'llama-peak4')`. `estanque.unlockedWhen = (records) =>
      isFiled(records,'sand4')` (no longer `alwaysOpen`),
      `estanque.fog = closedFog(ESTANQUE_HIT, 2)` (design.md §7.1's
      closest-aspect derivation — art 2, NOT art 0's `max(cellH,cellW/
      aspect)`-minimising rule). Replace `recentlyDiscovered`'s body: prefer
      `SECTORS.find(s => isOpen(s,records) && s.adventureIds.length>0 &&
      s.adventureIds.every(id => (records[id]?.attempts??0)===0))`, falling
      back to the EXISTING rule unchanged when no sector qualifies — never
      return `null` while any open sector has unfinished work.
- [ ] 5.5 In `client/src/zoo/backpack.ts`: `BACKPACK_ITEMS` gains
      `{id:'lupa', art: CARRIER_LENS_ART, grantedBy:'entrada',
      earnedWhen:['sand4']}` and `{id:'linterna', art:
      SECTOR_ADVENTURE_ART.flashlight, grantedBy:'nocturna',
      earnedWhen:['night4']}` beside the existing `andean-hat` row.
- [ ] 5.6 In `client/src/zoo/sectors.test.ts`: narrow the "undeveloped
      sectors stay fogged for any input" filter to the three that remain
      (`bosque`, `arena`, `sendero`). Add: `entrada.unlockedWhen` returns
      `true` for every input including `{}`; `estanque.unlockedWhen({})` is
      `false`, `true` once `sand4` is filed; `nocturna.unlockedWhen` is
      `false` until `llama-peak4` is filed; `recentlyDiscovered` on a fresh
      install returns `entrada`; attempting `glass1` moves the preference
      onward to the next untouched open sector; with every open sector's
      levels attempted at least once, `recentlyDiscovered` returns exactly
      what the pre-existing fallback rule would (never `null` while
      unfinished work remains) — every shipped row for the old rule stays
      green.
- [ ] 5.7 In `client/src/zoo/backpack.test.ts`: `earnedItems` excludes
      `lupa`/`linterna` while `sand4`/`night4` are unfiled, includes each
      once its own id is filed.
- [ ] 5.8 Run `npx vitest run client/src/zoo client/src/screen/
      AdventureIntro.test.tsx` — green. The backdrops resolve for the first
      time here (Phase 1's rows, reached through `adventureFor(levelId).id`)
      — this is where the captures start paying off.

## Phase 6: Narrative and Debug Flags (D6)

Spec traceability: `main-screen/spec.md` (close GameView Variant and
`resolveCloseAction`; AdventureClosing Screen Renders the Transformation);
`reveal-grid/spec.md` (Screenshot Seeding Flags); `level-engine/spec.md`
(Comma-Separated Progress Seeding Flag). Depends on Phase 5's `closingLevel`
and Phase 4's twelve levels. 6.1 before 6.2. 6.3-6.4 can run in parallel with
6.1-6.2.

- [ ] 6.1 In `client/src/screen/GameScreen.tsx`: add `'close'` to
      `GameView`; export `CloseAction = {type:'close'; levelId:string}`;
      widen `NextAction = GameAction | ExitAction | CloseAction`; export
      `resolveCloseAction(finishedLevelId, records): CloseAction | null` —
      `closingLevel(finishedLevelId) ? {type:'close', levelId:
      finishedLevelId} : null`; `resolveNextAction` tries
      `resolveCloseAction` first, falling back to today's exit/next logic.
      `onNext`'s single discrimination point grows one arm for `'close'`.
      `nextView`'s reducer switch stays untouched.
- [ ] 6.2 Create `client/src/screen/AdventureClosing.tsx`: mirror of
      `AdventureIntro` — same stage/`CaptionedArt`/speech-bubble shape,
      props `{adventure, onContinue}`, rendering `closingBeat.art`/
      `.line`. `onContinue` resolves to `{at:'map'}`. `AdventureIntro`
      stays byte-identical (only touched by 5.2's one line).
- [ ] 6.3 In `client/src/canvas/devMode.ts`: add a private `debugArg(search,
      prefix)` parser; export `seededProgressIds(search)` —
      `?debug=progreso:<id>,<id>,…`, dev-gated exactly like
      `shouldSeedRecoveredDuck`; export `revealDebugFraction(search)` —
      `?debug=revelado:<pct>`, NOT dev-gated (`isSectorDebug`'s own stated
      reason: paints render state, must work against the exact screenshotted
      build); export `lightDebugPoint(search)` — `?debug=linterna:<x>,<y>`,
      NOT dev-gated. `?debug=pato-recuperado` and `isSectorDebug` stay
      byte-identical.
- [ ] 6.4 Wire the two non-gated flags: `revealDebugFraction` feeds
      `debugClearedTiles` (Phase 2) to pre-clear an erase-mode level's
      reveal state before first render; `lightDebugPoint` pins a light-mode
      level's fold point, replacing live pointer input, in
      `screen/LevelPlay.tsx`. Wire `seededProgressIds` into the progress-
      store bootstrap (alongside `shouldSeedRecoveredDuck`) to seed a filed
      record per listed id.
- [ ] 6.5 In `client/src/screen/GameScreen.test.ts`: `resolveCloseAction
      ('sand4', records)` returns the close view; `resolveCloseAction`
      on `'glass4'`/`'night4'`/`'llama-peak4'`/`'sheep-hill4'`/
      `'duck-trail4'` all return `null` and fall through to the ordinary
      exit-to-map outcome; `nextView`'s exhaustive switch is unaffected for
      every pre-existing input.
- [ ] 6.6 In `client/src/screen/AdventureClosing.test.tsx`: renders
      `closingBeat.art`+`.line` for the `sand` adventure; `auditCaptions`
      reports `uncaptioned: []`; `onContinue` resolves to `{at:'map'}`;
      replaying `sand4` to completion (no persisted flag) resolves `'close'`
      again.
- [ ] 6.7 In `client/src/canvas/devMode.test.ts`:
      `seededProgressIds('?debug=progreso:sand4,night2')` returns
      `['sand4','night2']`, dev-gated; `revealDebugFraction
      ('?debug=revelado:60')` returns `0.6`; `lightDebugPoint
      ('?debug=linterna:500,300')` returns `{x:500,y:300}`; all three
      require no `window`/component context; malformed query strings return
      `null`/`[]`, never throw; `?debug=pato-recuperado`/`isSectorDebug
      ('?debug=sectores')` byte-identical to before this change.
- [ ] 6.8 In `docs/13_AVENTURAS_POR_ANIMAL.md`: update §4's status row for
      *Exploración libre* / row D from pending to shipped.
- [ ] 6.9 Run `npx vitest run client/src/screen/GameScreen.test.ts
      client/src/screen/AdventureClosing.test.tsx
      client/src/canvas/devMode.test.ts` — green.

## Phase 7: Screenshot Verification (human-reviewed, not optional)

Spec-adjacent: docs/12 §4; design.md's Testing Strategy table names what
only a capture can answer (§1.6's frame-rate falsifier, §2.2's dark-glass/
dark-sand aesthetic bet). Depends on Phases 1-6 landing — the only surface
where every backdrop, mechanic and registry is live together. Uses
`scripts/shot.sh <url> <out.png> [w] [h]`, output into `capturas/`
(gitignored). Its three traps: `--disable-gpu` is mandatory; `--window-size`
is the window not the viewport (`CHROME_OFFSET=87`, already compensated
inside the script); width is clamped to a 500px floor — a 390px phone is not
measurable this way, use an iframe harness instead.

- [ ] 7.1 Start the dev server on a free port (check for a stale server
      first, do not assume the default port is free — paso C's own 7.1);
      confirm it answers before capturing.
- [ ] 7.2 Capture each of the twelve levels at 1280×900 into `capturas/`:
      `glass1..4.png`, `sand1..4.png`, `night1..4.png` — plus one
      part-revealed capture per adventure using `?debug=revelado:<pct>` on
      one erase level per adventure and `?debug=linterna:<x>,<y>` on one
      night level.
- [ ] 7.3 Capture the entrance's narrative entry (`glass1`'s intro) and the
      transformation closing (`sand4`'s `AdventureClosing`) via this app's
      existing dev-route pattern for narrative screens.
- [ ] 7.4 Capture the zoo map at three unlock states using
      `?debug=progreso:<id>,<id>,…` (Phase 6) instead of a live playthrough:
      a fresh install (only `entrada` clear); after the entrance
      (`?debug=progreso:sand4` — `estanque` open, `lupa` in the backpack);
      fully unlocked (`?debug=progreso:sand4,duck-trail4,sheep-hill4,
      llama-peak4,night4` — every sector open, both new backpack items
      present).
- [ ] 7.5 Capture one duck level and one llama level, the human-readable
      confirmation of the byte-identical regression the unit suite already
      pins.
- [ ] 7.6 **Read every capture.** Answer, explicitly: does `GLASS_GRIME`
      read as a dirty pane rather than a bug; does `SAND_DRIFT` read as sand
      at all once the law has forced it dark; does a 200-unit torch on a
      1000-wide sheet read as a torch or a spotlight; do five opacity steps
      read as a falloff or as five rings; does the transformation screen
      land after `sand4` as a beat rather than an interruption. Record any
      defect found by reading, not by any test — paso C's Phase 7.7
      precedent found three this way.
- [ ] 7.7 Correct and re-capture any defect found in 7.6, with a regression
      test added alongside the fix, not only a re-shot picture.

## Phase 8: Final Gate

- [ ] 8.1 Run `npm test` (full suite) — green. Baseline: 65 test files /
      1286 tests. Report actual new totals — new test files expected:
      `revealGrid.test.ts`, `RevealLayer.test.tsx`, `migrateEntrance.test.ts`,
      `AdventureClosing.test.tsx`; every other touched `.test.ts(x)` grows in
      place. The change must not drop a test outside any deliberate, named
      removal (none are named here).
- [ ] 8.2 Run `npm run build` — green (`tsc --noEmit && vite build`,
      `noUnusedLocals`, `noUnusedParameters`, `verbatimModuleSyntax`).
      Confirm `RevealConfig`'s discriminant actually fires at compile time:
      a scratch `{mode:'erase', ..., objects:[]}` or a `{mode:'light', ...}`
      with no `objects` fails to compile — verify with a temporary local
      edit that is reverted, not by trusting the type alone.
- [ ] 8.3 Confirm byte-identical-to-`main` via `git diff main...HEAD`:
      `cases.ts`, `Deduction.tsx`, `AnimalId`, `ClueKind`, `AdventureIntro`'s
      stage markup (all but 5.2's one line), the duck/sheep/llama/medusa
      levels, `trail1..4`, `f1-libre`'s own config.
- [ ] 8.4 Confirm zero new `url(#` occurrences
      (`rg 'url\(#' client/src` shows no hit beyond whatever pre-existed,
      which is none).
- [ ] 8.5 **Scope stop.** Confirm no row E-H content was started (snakes,
      bees, dolphins, hedgehog, the snail; `arena`/`bosque` staying fogged
      and adventure-less); no edit to `cases.ts`/`Deduction`/the pistas
      machinery beyond what Phase 5 explicitly touches (none).
- [ ] 8.6 Record proposal.md's five product-question assumptions (question 4
      retired by amendment A4) as accepted working assumptions the shipped
      code now embodies, not silent decisions — paso C's own question-round
      discipline.

---

### Accepted deviation

This document exceeds the skill's 530-word cap, the same deviation
`design.md` (this change), `archive/2026-09-13-sheep-and-llama-peaks/
tasks.md` and two earlier archived designs each recorded. The brief asked for
named hard-ordering constraints across a twelve-level, six-slice, ~2,630-line
change plus an explicit capture phase — that content does not fit a
checklist held under 530 words without deleting the traceability the brief
asked for.

---

## Review Workload Forecast

Independent count, file by file, not a restatement of `design.md`'s own
~2,630 (which the design itself assigns to `sdd-tasks` to bind). Landing at
the same total by dependency on the same nineteen ratified decisions, not by
copying the design's number.

| Phase (slice) | Files | Authored | Test | Docs |
|---|---|---|---|---|
| 1 (D1 — Art/backdrops) | `build_art.py` (backdrop rows), `backdrops.ts`, `backdrops.test.ts`, `assets.ts` (night entry), `artManifest.test.ts` (backdrop parity) | 135 | 145 | — |
| 2 (D2 — Mechanic) | `revealGrid.ts`(+.test), `types.ts`, `coverage.ts`(+.test), `evaluateLevel.ts` | 203 | 280 | — |
| 3 (D3 — Render) | `RevealLayer.tsx`(+.test), `TraceCanvas.tsx`(+.test), `LevelPlay.tsx`(+.test) | 175 | 320 | — |
| 4 (D4 — Levels+migration) | `migrateEntrance.ts`(+.test), `openProgressStore.ts`, `build_art.py` (3 SINGLES), `assets.ts` (chest/stone/leaf), `artManifest.test.ts` (cutout parity), `catalog.ts`, `catalog.test.ts` | 469 | 305 | — |
| 5 (D5 — Zoo registries) | `adventures.ts`(+.test), `sectors.ts`(+.test), `backpack.ts`(+.test), `AdventureIntro.tsx` | 118 | 180 | — |
| 6 (D6 — Narrative) | `AdventureClosing.tsx`(+.test), `GameScreen.tsx`(+.test), `devMode.ts`(+.test), `docs/13` | 130 | 155 | 15 |
| **Code total** | | **1,230** | **1,385** | **15** |

**Estimated changed lines: ~2,630** (1,230 authored + 1,385 test + 15 docs —
`manifest.json` regeneration excluded per the review-workload guard's golden-
file rule, but stays in scope for snapshot identity).

```text
Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
800-line budget risk: High
```

**800-line budget risk: High.** ~2,630 against 800 is ~229% over, and every
individual phase above 800/6≈133 lines already clears the guard on its own —
this is not borderline, and `size:exception` was accepted at session start
(`delivery_strategy: exception-ok`), so this forecast is stated truthfully
rather than shrunk to fit.

**Suggested split, if chained (the seam is Phase1→2→3→4→5→6, design.md's own
dependency order):**

| Slice | Commit subject | Focused test command | Rollback boundary |
|---|---|---|---|
| D1 | `feat(art): derive the night backdrop and measure the entrance bands` | `npx vitest run client/src/zoo/backdrops.test.ts client/src/detective/artManifest.test.ts` | Delete `nightfall` + its `PASSTHROUGHS` row + the three `ADVENTURE_BACKDROP` rows |
| D2 | `feat(levels): add the reveal grid mechanic` | `npx vitest run client/src/levels/revealGrid.test.ts client/src/levels/coverage.test.ts` | Delete `revealGrid.ts`; revert `coverage.ts` to its inline body; revert the one `evaluateLevel` line |
| D3 | `feat(canvas): draw the reveal veil as plain rects` | `npx vitest run client/src/canvas/RevealLayer.test.tsx client/src/canvas/TraceCanvas.test.tsx client/src/screen/LevelPlay.test.tsx` | Delete `RevealLayer.tsx`; drop the `reveal` prop and the `LevelPlay` memo/fold |
| D4 | `feat(levels): add the entrance and night levels` | `npx vitest run client/src/levels/catalog.test.ts client/src/game/migrateEntrance.test.ts` | Remove the twelve entries + `EXPECTED_IDS` rows; delete `migrateEntrance.ts` and its loop entry |
| D5 | `feat(zoo): open the entrance and the night sector` | `npx vitest run client/src/zoo client/src/screen/AdventureIntro.test.tsx` | Restore `alwaysOpen` on the estanque, `alwaysClosed` on entrada/nocturna, empty their `adventureIds`, empty the two backpack rows |
| D6 | `feat(screen): give the transformation its own screen` | `npx vitest run client/src/screen/GameScreen.test.ts client/src/screen/AdventureClosing.test.tsx client/src/canvas/devMode.test.ts` | Remove the `'close'` variant, `CloseAction` and `resolveCloseAction`; `nextView` was never touched |

Runtime-harness evidence: **N/A for every slice at the unit level** (node, no
jsdom — this repo has no runtime harness), which is exactly why §1.6's frame
budget and §2.3's dark-glass/dark-sand bet are routed to Phase 7's capture
pass instead of being claimed as verified.

**Delivery decision (orchestrator, before apply).** `delivery_strategy:
exception-ok` is already cached, so per the review-workload guard no further
user decision is required to proceed — `size:exception` covers this change as
a single PR with the six phases as internal commit slices, or the six may
ship as a chained/stacked sequence along the seam above; either satisfies the
cached strategy.
