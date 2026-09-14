# Proposal: Dolphins in the pond — a screen that scrolls

Paso G of `docs/13_AVENTURAS_POR_ANIMAL.md` §8. Scope is row G only.

## Intent

Every adventure shipped so far ends when the sheet ends. The child traces from one edge of a fixed `1000 × 600` window to the other, and the movement stops because the paper stopped — not because the movement was sustained long enough to become rhythm. `docs/13` §2 and `docs/14` §11 name what the dolphins train that nothing before them does: **ritmo, alternancia, anticipación y sostén del movimiento**. Sustaining a movement requires a route longer than one view, and `docs/13` §4's row for this adventure is literal about the mechanic that buys it: *"Desplazamiento de pantalla (viewBox que avanza con el trazo)."*

The engine cannot do this today, and the near-miss is the dangerous part. `buildLevel.ts:137-154`'s `layOutPaths` already widens `viewBoxWidth` for long word levels, but `LevelPlay.tsx:1616` renders the canvas with `fit="contain"` and `preserveAspectRatio="xMidYMid meet"`, so a wider sheet is shown **shrunk to fit, all at once**. Authoring a long dolphin route that way ships a *smaller* movement, which is the exact opposite of sustaining the same one. `viewBoxWidth` is currently one number doing two jobs — how wide the world is, and how much of it you see. This change separates them.

## Scope

### In Scope

1. **A camera: an advancing `viewBox` x-origin, on `dolphin3`/`dolphin4` only.** Implemented inside the existing rAF loop (`TraceCanvas.tsx:843-936`) by `svgRef.current.setAttribute('viewBox', …)`, alongside the ink/hazard/carrier attribute writes that loop already makes. Zero `setState` per frame.
2. **The `sheetWidth` vs `viewWidth` split** and the audit it forces (Decision 3). Every site that today spans `x={0} width={viewBoxWidth}` must span the **world**, while only the `viewBox` attribute spans the **window**.
3. **A sheet-width parameter on `imageToViewBox`/`viewBoxToImage`** (`zoo/sectors.ts:151-175`), defaulting to `1000` so every existing caller stays bit-identical (Decision 4).
4. **Four levels `dolphin1..4`, `kind: 'path'`**, `phase: 1`, ids permanent from first commit. One rung per step of `docs/13` §2 (Decision 2).
5. **A sustained sine generator** in `levels/paths.ts` producing N periods across a sheet wider than `MIN_VIEWBOX_WIDTH`, plus a **trough-aware extrema helper** — `vertexArt.ts:19-34`'s `routeApexes` finds local y-minima only and cannot place the lower half of the file.
6. **Dolphins as standing decoration, not hazards** (Decision 5), placed outside the corridor band at the wave's own extrema.
7. **Registry**: `AdventureId += 'dolphin'`; `ZooAnimalId += 'delfin'` + one `ZOO_ANIMAL_ART` row; one `ADVENTURE_BACKDROP.dolphin` row reusing `SECTOR_BACKGROUND_ART.lagoon`; `estanque.adventureIds` 8 → 12; `unlockedWhen` unchanged (the sector is already open).
8. **One ungated `?debug=camara:<x>` flag** to seed the camera origin, and a test that reads the **real rendered `viewBox` attribute** (Decision 7).
9. The `catalog.test.ts` guards that will go red (`EXPECTED_IDS`, minAccuracy-by-phase, tone/haptics), plus `zoo/adventures.test.ts`, `zoo/sectors.test.ts`, `zoo/backdrops.test.ts` counts.
10. **`docs/13` §4 gains an "Enmendado al implementar el paso G" entry**, in Spanish, matching items 5–8.

### Out of Scope

- **Erizo (row H), caracol, laberintos.** Explicitly not this change.
- **A "costa" sector.** `docs/13` §3 left it open; taking it would need new map art, a new hit rect, fog and backdrop (Decision 1).
- **Hazards, obstacles, `resetOnContact`, inhibition.** `docs/13` §1: *"los obstáculos aparecen después, nunca al comienzo."*
- **A backpack item for `estanque`.** None exists today and the duck row shipped without one. Author decision, recorded not invented.
- **Parallax, decorative camera motion, vertical scrolling, a panning `DrawDemo`.**
- The author's promised reference image (`docs/14` §11). The schema stands in.
- Re-running `build_art.py`. Decision 4 proves it is unnecessary.

## Capabilities

### New Capabilities

- `scrolling-camera`: a level whose world is wider than its view, with a forward-only camera that follows the child's stroke, a lead window that prevents self-scroll, and a world/window split every full-sheet render site respects.

### Modified Capabilities

- `level-engine`: `LevelConfig` gains an optional camera field; `LevelTarget` distinguishes sheet extent from view extent.
- `trace-canvas`: the `viewBox` attribute's x-origin becomes per-frame mutable; full-sheet spans re-anchor to the world.
- `zoo-map`: `dolphin` adventure, `delfin` animal, `estanque` grows to twelve levels; `imageToViewBox`/`viewBoxToImage` take a sheet width.

## Approach

### Decision 1 — the pond, not a new coast

`docs/13` §3 says the dolphins *"pueden pedir un sector propio (costa) si el estanque queda cargado. Se decide cuando lleguen."* They have arrived, and the answer is no. `zoo-map.png` is a single authored drawing with fixed sectors; there is no `costa` hit rect, no fog patch, no backdrop, and `docs/12` §4 is explicit that the registry gives way to the drawing, never the reverse. A new sector is an art request, not a code change.

The pond is not "cargado" in any measurable sense either: `adventures.ts` keys backdrops per **adventure**, not per sector, precisely so one sector can carry more than one — `montanas` already does it for sheep and llama (`backdrops.ts:114-132`). The dolphin row is the third adventure in `estanque`, ordered `patos → medusa → delfines` exactly as §3's own table reads.

### Decision 2 — the ladder, one rung per step of `docs/13` §2

| Level | §2 step | Sheet | Camera | What changes |
|---|---|---|---|---|
| `dolphin1` | *pocos delfines y separación amplia* | 1000 | no | ~2 periods, widest corridor. Carries the `demo`. |
| `dolphin2` | *más delfines* | 1000 | no | ~3 periods, same view, same corridor |
| `dolphin3` | *recorrido desplazable* | wide | **yes** | the new mechanic enters exactly where §2 puts it |
| `dolphin4` | *sostener el patrón más tiempo* | wider | yes | more periods **and** a narrower corridor |

Rungs 1–2 ship as ordinary corridor levels with **zero new engine code**, which is the pattern every prior row followed: `peakRidge` arrived with sheep, the reveal grid with the entrance, drag with snakes, waypoints with bees. This confines the one genuinely novel piece of engineering to two of four levels.

**On paso F's "corto vs guard" incompatibility: it does not recur here, and the arithmetic says why.** `docs/01` §49 / `catalog.test.ts:580-598` require a phase-1 path level to have `minY < 180`, `maxY > 420` and vertical span `> 300`. For a sine centred at y=300 with amplitude `A`, all three reduce to `A > 150`. Amplitude is the **Y** dial; "pocos delfines / más delfines" is the **X** dial (period count). They are orthogonal, so `dolphin1` satisfies the guard at full amplitude while still being the sparsest level in the family. F had to assert both halves of its ladder because "corto" and the guard fought over one axis; here nothing fights. The family block still asserts the ladder monotonically (period count up, corridor width down) — that is a progression claim, not a workaround.

`A ≈ 160` also settles Decision 3 of the exploration's open list: the dolphin wave is **clearly larger** than the ducks' *"ondulaciones pequeñas y suaves, al principio casi una recta"*. The ducks are the gentle precursor; these are the sustained version of the same gesture.

**The wave is a smooth sine, not an angular zigzag.** "Zigzag" is the adventure's *name*; `docs/referencias/delfines-zigzag.png` draws a continuous sine of ~2.2 periods with no corners anywhere, and §2's own words are *"rítmico y sostenido"*. The angular reading belongs to the sheep and llamas (`ovejas-alta-baja.png`, `llamas-picos.png`), and `docs/13` §2 is explicit that those families own it.

### Decision 3 — the camera, and the five properties it must have

`viewBoxWidth` is one number doing two jobs. The change splits it: **`sheetWidth`** (the world — what art, guides and backdrop span) and **`viewWidth`** (the window — what the `viewBox` attribute is wide). For every level shipped today they are equal and nothing moves.

The camera itself is a drop-in extension of an idiom already proven at 60fps: the rAF loop at `TraceCanvas.tsx:843-936` already writes `path.setAttribute('d', …)` (`:887`), hazard transforms (`:904-907`) and the carrier transform (`:918-921`) every frame with no React involvement. The camera origin is computed from `rendered[rendered.length-1].x` — the identical expression the carrier head already uses at `:917`. Pointer mapping needs **no change at all**: `useTraceInput.ts:49-54` calls `getScreenCTM()` fresh on every event and never caches it, so a mutated `viewBox` is honoured on the very next `pointermove`.

Five properties are scope, not detail:

- **(a) Forward-only and clamped.** The origin is monotone non-decreasing within an attempt and clamps at `sheetWidth − viewWidth`. A camera that can retreat turns a wobbling finger into a rocking world.
- **(b) A lead window.** The camera advances only once the finger's world-x passes a fraction of the view width. **This is the central trap of the whole change**: a stationary finger on a moving view is *moving in world coordinates*, so a naive follow-the-finger camera self-scrolls and drags the child off their own corridor without the child moving at all.
- **(c) Frame/event ordering is a named risk with a test.** The camera mutates per frame; pointers arrive per event. A fast stroke can sample a `pointermove` against a one-tick-stale `viewBox`. This is measured and given a stated tolerance, not assumed safe.
- **(d) Every other level stays bit-identical.** `fit="contain"` and `layOutPaths`' wide-sheet behaviour are what the word levels (`f4-la`, `f5-mama`) depend on. With `sheetWidth === viewWidth` the new code path is unreachable for them, and that is asserted.
- **(e) The full-sheet audit, enumerated.** Every one of these hardcodes `x = 0` and `width = viewBoxWidth` and must be re-anchored to the world, not the window: `TraceCanvas.tsx:998` `sheetBounds` (which is what `clampArtBox`/`placeArt` clamp against), `:1003` the `viewBox` attribute itself, `:1026-1029` the base rect, `:1054` the backdrop quiet rect, `:1055-1062` the backdrop image, `:1125` the ground image, `:1250-1253` the four guide lines, `LevelPlay.tsx:1430` the corridor viewBox, `LevelPlay.tsx:504-507` the debug grid, and the `viewBoxWidth` consumers in `coverage.ts:45-49` and `revealGrid.ts:278-283`. Missing one produces art clamped into the wrong half of the world — paso E's exact failure, which a green suite did not catch.
- **(g) `prefers-reduced-motion` does not suppress the camera.** The camera is not decoration; without it the route is unreachable. The reduced-motion contract covers animation the child did not ask for, and this motion is caused by the child's own finger, one-to-one, with no easing or inertia. Stated here so the design does not silently exempt it and ship an unplayable level.

### Decision 4 — (f) the backdrop covers the panned world, with no seam, no tiling, and no re-measurement

The exploration flagged this as open; the arithmetic closes it. The backdrop is a single `<image>` with `preserveAspectRatio="xMidYMid slice"` (`TraceCanvas.tsx:1055-1062`). Spanning it across the **world** (not the window) means one element, so there is no seam, no mirrored copy, and no `pattern` — which `docs/09` §3 forbids outright.

`slice` scales by the larger ratio. For the `1536 × 1024` lagoon source on a world `W` wide, `scale = W/1536`, and the visible source rows are centred on 512, spanning `±460800/W`:

| World `W` | Visible source rows | Inside the sampled `(135, 889)`? |
|---|---|---|
| 1000 (`dolphin1/2`) | 51 – 973 | no — same as the ducks |
| 1223 | 135 – 889 | exactly |
| 2000 | 281 – 743 | yes |
| 2600 | 335 – 689 | yes |

`512 − 135 = 377` and `889 − 512 = 377`: the sampled band is symmetric about the crop centre, so **every world wider than ≈1223 units shows only rows already inside the band `build_art.py` sampled** (`PASSTHROUGHS`, `build_art.py:541`). `brightest` over a subset cannot exceed `brightest` over its superset (`#b4c5d0`, luma 193), so `SHEET_PAPER` (luma 251.7) keeps its 58.7 separation and `docs/09` §4's 55-luma law holds **a fortiori**. The dolphin backdrop row can therefore copy the duck row's `quiet`/`brightest`/`corridorRows` verbatim: **no new `PASSTHROUGHS` row, no `build_art.py` re-run, no new manifest literal.** A panned dolphin level is *safer* on the luma law than the duck levels are, not riskier.

Two consequences that are not free and are recorded rather than hidden:

1. **The wider the world, the more the lagoon is magnified and cropped.** At `W = 2600` only the middle 35% of the drawing's height is on screen, so its banks and reeds crop away entirely and the child sees a near-featureless field of water. `docs/13` §4 decision 3 says the sector is a **drawn place**; a place you cannot recognise is a weaker claim on that decision. The fallback, if the captures read badly, is to pin the backdrop to the **window** instead of the world — cheaper and measurement-free, at the cost of a static world under a sliding route. Recommended path is the world-spanning image; the fallback is named so the design does not have to rediscover it.
2. **`imageToViewBox`/`viewBoxToImage` hardcode `STAGE_W = 1000`** (`sectors.ts:127-175`) and `backdrops.test.ts:278-301` validates every registered channel through them. At `W = 2600`, corridor y=100 is source row **394**, but the 1000-wide transform reports **205** — the test would be checking rows the render never shows. Both functions take a sheet-width parameter defaulting to `1000`, so all fifteen existing call sites stay byte-identical and the dolphin row is the first to pass anything else.

### Decision 5 — "sin tocarlos" is the corridor's own geometry, not a hazard

The codebase supports both readings and they are not the same mechanic. `vertexArt` (`vertexArt.ts`) stands art at route extrema and never touches scoring — sheep and llamas have used it for two rows. `obstacles` + `resetOnContact` (the medusa's starfish, `catalog.ts:1637`) is a real timed hazard that restarts the run.

**We take the decorative reading**, and the argument is not aesthetic. The dolphins are placed just outside the corridor band, so **the corridor edge is the dolphin's back**: leaving the channel already produces the engine's existing "te saliste" response — `offPath` ink colour, tone, haptics — and *"pasa entre ellos sin tocarlos"* is satisfied by the mechanic the child is already being scored on. Adding `resetOnContact` would encode the same fact twice, once forgivingly and once punitively.

`docs/13` §1 settles it independently: *"las dificultades se introducen cuando el movimiento ya está comprendido. Los obstáculos aparecen después, nunca al comienzo."* This is the dolphins' first appearance, and §2's own four-step progression for them never mentions an obstacle. `docs/14` §14 adds that early errors must not be punished hard. **The hazard reading is rejected for those reasons, not overlooked.**

Placement needs a new helper: `routeApexes` (`vertexArt.ts:19-34`) tests `cur.y < prev.y && cur.y < next.y` and finds crests only. We add a **sibling helper** rather than adding a mode to `routeApexes`, because `routeApexes` has two shipped consumers whose behaviour must not change and a mode parameter puts a branch inside a function two families already depend on. A sibling is additive and its own test file.

**One measured constraint the design cannot negotiate away.** The band between the corridor edge and the sheet edge is `300 − A − cw/2`. The phase-1 guard forces `A > 150`, so the band is strictly under `150 − cw/2` — under 120 units for any real corridor. `docs/09` §3 sizes animals at **~140**. **A 140-unit dolphin does not fit outside a phase-1-legal corridor on a 600-tall sheet, for any amplitude and any corridor width.** It must render at roughly 80–90 units, or `clampArtBox` will silently shove it back into the channel the child is tracing. The schema agrees — its arcs are small against the wave. This is the fourth time a measured law has cornered an art-direction number (`docs/13` §4 items 5, 6, 7, 8); recorded here so it is a decision, not a surprise.

**A note the design should not re-derive from the schema.** Read directly, `delfines-zigzag.png` places six arcs in two horizontal rows at even ~140px spacing, alternating top and bottom — not strictly at the wave's extrema (its half-period is ~215px). We anchor to the **extrema** anyway, because that makes "more dolphins" and "more periods" the *same dial*: a sine has exactly one extremum per half-cycle, so `docs/13` §2's steps 1 and 2 become one parameter instead of two that can disagree. The schema is a provisional sketch by the author's own framing (`docs/14` §1), and the difference is a spacing choice, not a shape claim.

### Decision 6 — the demo runs once, on `dolphin1`, and never pans

`docs/13` §5 item 2: the demo appears *"cuando el movimiento es nuevo"*. The movement — a sustained up-down alternation — is new at `dolphin1` and nowhere else in the family; `dolphin3` does not introduce a new *movement*, it introduces more room for the same one. `dolphin1` fits in one unpanned 1000-wide view, so the existing `DrawDemo` (`LevelPlay.tsx:796`, framer-motion over `target.paths`) works untouched.

This is stated as a scope boundary because the alternative is expensive and invisible until someone builds it: a panning demo has **no precedent anywhere in the repo** and would require driving the camera in sync with a framer-motion `pathLength` animation. `dolphin3`/`dolphin4` carry no `demo`. `bee1` set the same precedent one row ago.

### Decision 7 — the test paso F's lesson demands

Paso F's most expensive finding was `debugCarrier`: a helper that was written, tested, green, and **called by nobody**. The suite proved it computed a correct point that never reached the screen.

The camera is the same shape of risk, worse: it is a per-frame DOM mutation that no component test can observe, so "the camera helper returns the right x" is a claim about a helper, not about a screen. **Required, not optional: at least one test that reads the real rendered `viewBox` attribute off the real `<svg>`** — initial origin, seeded origin via the debug flag, and the clamp at the route's end. A test that only exercises the pure camera function is explicitly insufficient.

`?debug=camara:<x>` seeds the camera origin so a still capture can show a panned world without a live stroke, following `?debug=estela:<k>`'s grammar. Ungated per `devMode.ts:8-20`'s own rule: it paints render state only, opens no surface and persists nothing. Captures go in `capturas/pasoG/`, two per level — control and debug — which is the cadence paso F established and the one that found all three of its late defects.

## Affected Areas

| Area | Impact | What changes |
|---|---|---|
| `client/src/canvas/TraceCanvas.tsx` | Modified | camera prop; rAF origin write; the ten world/window sites of Decision 3(e) |
| `client/src/screen/LevelPlay.tsx` | Modified | camera window params; `:504`, `:1430` world spans |
| `client/src/levels/buildLevel.ts` | Modified | `sheetWidth` vs `viewWidth` on the target |
| `client/src/levels/types.ts` | Modified | optional camera field (the 9th additive-optional precedent) |
| `client/src/levels/paths.ts` | Modified | sustained sine generator |
| `client/src/levels/dolphinExtrema.ts` | New | trough-aware sibling to `routeApexes` |
| `client/src/levels/catalog.ts` | Modified | `dolphin1..4` |
| `client/src/zoo/sectors.ts` | Modified | sheet-width param on both transforms; `estanque` 8 → 12 |
| `client/src/zoo/{adventures,backdrops}.ts` | Modified | `dolphin` adventure + backdrop row (duck's literals, reused) |
| `client/src/detective/assets.ts` | Modified | `'delfin'` + `ZOO_ANIMAL_ART` row |
| `client/src/canvas/devMode.ts` | Modified | one ungated flag |
| `docs/13_AVENTURAS_POR_ANIMAL.md` | Modified | §4 "Enmendado al implementar el paso G" |
| `catalog.test.ts`, `buildLevel.test.ts`, `TraceCanvas.test.tsx`, `zoo/*.test.ts` | Modified | guards, family block, rendered-`viewBox` test |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| A stationary finger self-scrolls the world off the corridor | **High** if the lead window is skipped | Decision 3(b) is scope, with a test that holds the finger still and asserts the origin does not move |
| A missed site in the 3(e) audit clamps art into the wrong half of the world | **High** if unenumerated | The ten sites are listed by file and line; a rendered-markup test covers `sheetBounds` |
| Camera helper green, screen unchanged — paso F's `debugCarrier` | **High** if untested | Decision 7: a test on the real rendered `viewBox`, mandatory |
| `pointermove` sampled against a one-tick-stale `viewBox` | Medium | Named, measured, given a stated tolerance in design — not assumed safe |
| A word level's `fit="contain"` behaviour shifts by one unit | Medium | `sheetWidth === viewWidth` makes the path unreachable; asserted |
| `viewBoxToImage` validates rows the render never shows | **Certain** at any wide sheet | The sheet-width parameter, Decision 4(2) |
| The magnified lagoon stops reading as a place | Medium | Measured in Decision 4; window-pinned backdrop named as the fallback |
| The dolphin ships at 140 units and `clampArtBox` pushes it onto the corridor | Medium | Closed-form band arithmetic in Decision 5; ~80–90 units asserted |

## Rollback Plan

Additive at every seam. To revert: drop the four `dolphin1..4` catalog rows and remove `'dolphin'` from `estanque.adventureIds`. The camera field is optional and absent from every other level, so removing the four rows makes the new code path unreachable without deleting it. Both sheet-width parameters default to `1000`, so reverting them is a no-op for all fifteen existing callers. Full revert is `git revert` of the branch merge: no persisted key is renamed, no manifest literal changed, `build_art.py` was not re-run, and no progress record is invalidated because `dolphin*` ids are new and unreferenced.

## Dependencies

- `client/public/art/sector-dolphin.png` (448 × 418) is **already built, already registered** (`assets.ts:291,315`) and already passing `artHierarchy.test.ts:670-677`. Verify, do not rebuild.
- `sector-lagoon-background.png` ships with its literals. Decision 4 proves no re-measurement is needed; if the design overturns that argument, `build_art.py` must be re-run before any literal is hand-copied.

## Success Criteria

- [ ] All four `dolphin1..4` play; on `dolphin3`/`dolphin4` the world advances with the stroke and the stroke stays at constant visual scale.
- [ ] A test reads the **real rendered `viewBox` attribute**: initial origin, seeded origin, and the clamp at the route's end.
- [ ] A held-still finger does not move the camera.
- [ ] The camera origin is monotone non-decreasing within an attempt.
- [ ] Every level with `sheetWidth === viewWidth` renders byte-identically to `main`, asserted for the word levels.
- [ ] `imageToViewBox`/`viewBoxToImage` return identical values for all existing callers at the default width.
- [ ] Each dolphin's rendered box lies strictly outside the corridor band, asserted from the rendered markup, at every level.
- [ ] `dolphin1..4` clear the phase-1 amplitude guard; period count rises and corridor width falls monotonically across the family.
- [ ] No `url(#)` and no `pattern` introduced anywhere.
- [ ] Finishing `dolphin4` files `delfin` and shows it in the zoo.
- [ ] `npm test` and `npm run build` green.
- [ ] `capturas/pasoG/`, two per level: control and `?debug=camara:<x>`.

## Proposal question round — what is explicitly NOT closed

Execution mode is `auto`, so no interactive round was run. Following `docs/13` §4 item 7's precedent of writing down the unfulfilled item rather than faking it, these need the author, not the design phase:

1. **The pond gets no backpack item.** `backpack.ts` has rows for `montanas`, `entrada`, `nocturna`, `arena` and `bosque` — never `estanque`, not even after the duck row shipped. `docs/13` §8 grants one object per closed sector but never assigned the pond one. We invent nothing. Hers to decide.
2. **The reference image `docs/14` §11 promises has not arrived.** The schema stands in, and Decision 5's extrema-anchoring differs from the schema's even spacing. If her image anchors the dolphins differently, that is a placement change, not a mechanic change.
3. **How magnified the lagoon may become before it stops being a place** is an art-direction call. Decision 4 gives the arithmetic and both options; the captures will make it answerable.
4. **The dolphin renders at ~80–90 units, not `docs/09` §3's ~140.** The geometry leaves no alternative, but the exact size within that ceiling is hers.
