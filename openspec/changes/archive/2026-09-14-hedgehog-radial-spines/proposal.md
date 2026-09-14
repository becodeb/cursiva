# Proposal: The hedgehog in the night sector — loose radial strokes

Paso **H** of `docs/13_AVENTURAS_POR_ANIMAL.md` §8. Scope is row H only: *"Erizo en la zona nocturna — Trazos sueltos radiales."*

## Intent

Every family shipped so far is **one continuous line**: a corridor to stay inside (duck, sheep, llama, snake, dolphin), a surface to sweep (glass, sand, night), or a trail the child invents but still draws in one movement (bee). The hedgehog is the first **radial, loose-stroke** movement in the whole progression (`docs/13` §2): many short independent strokes, each leaving the body and pointing outward, none of them a path.

That matters pedagogically, not just mechanically. A corridor trains *staying on a line*. A spine trains **starting a stroke at a chosen place, in a chosen direction, and stopping** — start control, directional aim, and inhibition, repeated. `docs/14`'s own four stages are a ladder inside that one movement: whole-arm free strokes → medium strokes *from the centre outward* → short strokes with rhythm and direction variation → small precise strokes on the curled animal. It is also the last unbuilt row of §8 apart from the caracol, which is blocked on an unresolved consigna.

The engine has no per-stroke mechanic at all today. `evaluateLevel` folds every stroke into **one** point list (`evaluateLevel.ts:104-105`) and the `kind: 'free'` branch scores coverage, a reveal latch, or a waypoint errand — three area/target measures, no notion of "this stroke, on its own, was a good stroke". That gap is this change.

## Scope

### In Scope

1. **`spines?: SpineConfig` — one additive optional field on `LevelConfig`**, at the end after `camera` (`types.ts:241`), legal only on `kind: 'free'`. The seventh member of the family `reveal?` / `arrange?` / `artCorridor?` / `waypoints?` / `carrierArt?` / `camera?` established: additive, absent on every level that predates it, so every shipped level stays byte-identical.
2. **Pure fold module `client/src/levels/spines.ts`**, modelled line for line on `levels/waypoints.ts` (249 lines, zero React, zero DOM): config type, state, `EMPTY_SPINES`, a monotone `spineTick` returning the **same reference** when nothing latches, a pure `spineScore(strokes, cfg)` recomputed from settled strokes, `spineArt`/`spineRings` render projections, `debugSpines`/`seedSpines`. `waypoints.ts:141-151`'s argument is inherited verbatim: *the live fold is an optimisation, the score is the claim.*
3. **A derived anchor generator**, not authored coordinates (Decision 2).
4. **Two engine repairs**, named up front rather than discovered at apply time:
   - `levelStart` (`buildLevel.ts:66-69`) — its own comment calls itself *"the ONE place a future routeless mechanic plugs in its own start"* — learns `config.spines?.origin`.
   - **The demo, which is inert on a routeless level.** `docs/13` §5 item 2 makes a demo MANDATORY when the movement is new, and this is the newest movement in the progression — but `demos` is `target.paths.map(...)` (`LevelPlay.tsx:791-800`) and a free level's `paths` is `[]`, so `demo: true` today buys a 300 ms blank pause (`demoMs`, `:801`). This closes the last unrepaired item on `docs/13` §4 amendment 8's list (*"el carrier, el punto de inicio, el pulpo parado, la flecha, la meta y el `demo`"*). Repair: a `levelStart` sibling that lets a routeless mechanic supply its own demo segments — here, the first k anchor→tip segments, which are already line segments the generator emits.
5. **Four levels `hedgehog1`..`hedgehog4`**, `phase: 1`, ids permanent from the first commit (they are persisted keys).
6. **Render layer `client/src/canvas/SpineLayer.tsx`**, copying `WaypointLayer.tsx` (51 lines): one `<image>` for the body, plus the filled/unfilled anchor marks, inside one `<g pointerEvents="none">`, between the backdrop and the ink. **No `url(#)` of any kind** — no `mask`, `clipPath`, `pattern`, gradient or filter (`docs/09` §3; the scar is `TraceCanvas.tsx:78-93`).
7. **One `ADVENTURE_BACKDROP.hedgehog` row** reusing the night sector's shipped art and literals, and **inheriting `ink: TORCH_CHALK` / `inkDim: TORCH_CHALK_DIM`** — no new ink token (Decision 1).
8. **Registries**, each appending: `AdventureId += 'hedgehog'`; one `ADVENTURES` row; `ZooAnimalId += 'erizo'`; `nocturna.adventureIds` extended to eight; `nocturna.animals` gains its first entry — `adventures.ts:57` already reserves it (*"el erizo es paso H's"*).
9. **One ungated `?debug=espinas:<k>` flag** on `devMode.ts`, copying `arrangeDebugCount` (`:149-155`), wired to the **screen's prop** and not only to a helper (amendment 8's `debugCarrier` lesson).
10. **The hand-enumerated guards that will go red**, extended rather than rewritten: `catalog.test.ts` `EXPECTED_IDS` (`:50-107`), `levelsByPhase(1)` (`:758-783`), the phase-1 detective list (`:824-856`), `CORRIDORS`, `FLUENCY`, minAccuracy-by-phase (`:281-299` — the new field needs its own `continue`, joining `reveal`/`artCorridor`/`waypoints`), `showGuide` (`:329-335`), **`:357-377`** (the free-level census: 17 → 21, and the *"no reveal and no waypoints"* filter must learn the new field or `f1-libre` stops being alone), the tone/haptics table (`:437-452`), and `sectors.test.ts:244-249`, which asserts `nocturna.adventureIds` **exactly** equals the four night ids.

### Out of Scope (Non-Goals)

- **The flashlight-tile "cross".** `docs/13` §4 amendment 6 says it *"queda para el paso H"*, but row H does not name it and **it is unsolvable as stated**: the anti-cross floor is `ρ = radius/tile ≥ 4` and the ratified frame budget `((2R/w)+2)·((2R/h)+2) ≤ 64` reduces, on square tiles, to `ρ ≤ 3`. Incompatible by algebra for any level and any radius; raising grid resolution is not an exit, because what quantises the disc is tile SIZE, not the five opacity steps. Deferring it is the honest act, not the lazy one — and it belongs to the `reveal-grid` capability, which this change does not touch.
- **Any `build_art.py` re-run.** Both PNGs are already emitted (`build_art.py:483-484`), registered (`assets.ts:357-360`) and measured. Verify, do not rebuild.
- **A new ink token.** Closed by algebra (Decision 1).
- **Moving `arena.unlockedWhen`.** It stays `isFiled(records, 'night4')`. Re-pointing it at `hedgehog4` would **revoke** a sector already open for existing records, violating the *"only ever WIDENS access"* rule `sectors.ts:351` and `:446` both state.
- **A new backpack item.** `nocturna` already grants the linterna at `night4`; §8 grants one object per closed **sector**, not per adventure. Flagged to the author instead of quietly adding a fifth item.
- Obstacles, hazards, `resetOnContact`, enforced spine order, letters, the caracol, and retiring `Deduction`/`cases.ts` (`docs/13` §4 decision 1 keeps them).

## Capabilities

### New Capabilities

- `radial-spines`: a routeless level scored **per stroke** — each settled stroke is tested on its own against a derived anchor on an art silhouette, for base proximity, outward direction, straightness and length band — with a spine counter instead of a corridor. Follows exactly how `reveal-grid`, `art-corridor`, `object-arrange`, `free-trail-waypoints` and `scrolling-camera` each earned their own spec.

### Modified Capabilities

- `level-engine`: `LevelConfig` gains optional `spines`; `levelStart` learns a third source; a routeless level can supply its own demo segments; the `kind: 'free'` scoring branch gains one conditional.
- `trace-canvas`: new `spines` prop and layer, drawn between backdrop and ink; no `url(#)`.
- `zoo-map`: `nocturna` gains a second adventure and its first recovered animal; `AdventureId`/`ZooAnimalId` each gain one member; one backdrop row.

## Approach

### Decision 1 — two constraints the 55-luma law imposes, and neither is a taste call

`docs/09` §4's law (≥55 luma separation from what is underneath), encoded as `MIN_BACKDROP_CONTRAST = 55` at `backdrops.test.ts:48`.

**(a) A dark ink is undrawable on the night band — already solved and shipped.** The measured quiet band of `sector-night-background.png` is luma **67.1** and its brightest **95.9**, corroborating the shipped literals `night.quiet '#394459'` and `night.brightest '#526084'` exactly. `INK_COLOR '#1e293b'` (luma **39.8**) separates only **27.3** — short by 27.7. An admissible dark ink would need luma ≤ **12.1**, darker than `ART_OUTLINE`'s 26, i.e. darker than the world's own contour line. The `night` row already declares `ink: TORCH_CHALK '#f2efe6'` (luma 239, separating 172 from the band and 143 from `brightest`). **The hedgehog row inherits it and invents nothing.**

**(b) A spine drawn ON TOP OF the body is undrawable — and the resolution is geometric, not editorial.** Both PNGs measure contour exactly `#1a1a1a` (luma 26.0), modal fill `#b09060` (148.1), **brightest opaque pixel 213.3** (the pale belly/snout). `TORCH_CHALK` (239) against 213.3 separates **25.7** — short by **29.3**. Under the law's shipped comparison the two branches close on each other: *light ink fails on the body, dark ink fails on the band.* The stronger form is worse still — the body's opaque pixels run continuously from 26 to 213, so an ink ≥55 from every luma present would need to be ≤ −29 or ≥ 268. Empty. **No ink is legible over this body, on any backdrop.**

This is the same class of finding as paso C's *"montañitas bajas es indibujable como onda"* and paso E's *"una tinta oscura sobre una víbora es indibujable"* — but **unlike both, it is not handed back to the author**, because the geometry that satisfies it is the pedagogy `docs/14` already states: *"trazos medianos que salen desde el centro hacia afuera."* The rule is therefore **derived**: a spine's base anchors ON the silhouette and the stroke runs OUTWARD, so admissible ink only ever lies on the night band. It ships as its own scored condition (Decision 3, measure 5) and its own assertion.

**The tension with the scheme, stated plainly rather than smoothed over.** `docs/referencias/erizo-cuatro-fases.jpeg`'s Etapa 1 shows long free strokes **crossing the body**. Three things about that: the image is a phone screenshot of a Gemini Flash chat, a visualiser's sketch and not an authored art board; the crossing strokes are the one feature the other three stages drop; and its own caption for Etapa 2 restates *desde el centro hacia afuera*. So the admissible region **excludes the body interior**, and Etapa 1's *amplitud* is delivered by stroke **length** outward, not by crossing — which the arithmetic below shows is worth ≥223 units, a genuinely whole-arm movement. **There is a real escape and it is the author's, not ours**: a darkened body would admit chalk. The measured target is exact — the body's brightest must fall from 213.3 to **≤184.0** for `TORCH_CHALK` to clear it by 55 (the modal fill at 148.1 and the contour at 26 already clear it by 91 and 213). That is a `mute()`-class pipeline pass on shipped, approved art, so it is art direction, and we do not take it.

### Decision 2 — anchors are DERIVED from the silhouette, from a build-time measurement

Hand-authoring ~14 coordinates per level is exactly how paso E lost a family: art drawn in one place, scored geometry in another, 1,553 tests green. Deriving the body's `<image>` box **and** the anchors from the same numbers makes them agree by construction. It is also this repo's established taste: `levels/paths.ts` carries ~20 pure generators, and `peakRidge` / `routeApexes` / `routeExtrema` already derive placement from geometry rather than from typed coordinates.

The catch, and its resolution: reading PNG alpha at runtime is impossible in the browser and would be banned anyway. So the radius-by-angle table is **measured at build time** (`scripts/art/png.py`, the same Rec.601/alpha conventions every measurement in this change used) and shipped as a small declarative table beside the art registry, guarded by a test — precisely the `artCorridor` precedent `docs/13` §4 records: *"el cuerpo de la víbora, ajustado por medición al momento de compilar, es el camino."* The authored level data stays declarative: arc span, anchor count, length band, tolerances.

Measured geometry, SVG convention (0° = +x, increasing **clockwise** because y is down):

| Asset | Centroid (normalised) | Silhouette | Spine arc | Excluded |
|---|---|---|---|---|
| `hedgehog-profile.png` 448×306 | (0.542, 0.511) | not a circle — needs the table | back ≈195° → 270° → ≈345° | face ≈150°–195°, feet ≈60°–120° |
| `hedgehog-curled.png` 412×407 | (0.500, 0.503) | **near-perfect circle**, r ≈ 0.49·W, flat within a few percent over 24 rays | whole circle minus the face | face arc (see below) |

**One inconsistency in the handed-over measurements, recorded rather than absorbed.** The curled hedgehog's face is described as *"lower-right, roughly the 300°–360° arc"*, but under the stated convention 300°–360° is the **upper**-right; the lower-right is 0°–60°. The profile's three arcs corroborate the convention (270° = up = the back, 90° = down = the feet), which makes the curled description the odd one out. `sdd-design` must re-measure the curled face arc before it becomes an exclusion literal. Neither reading changes the mechanic; both change which anchors exist.

Both PNGs were checked for the `oveja.png`/`piedra.png` alpha-speckle defect that `docs/13` §4 amendment 6 demands: largest 4-connected blob = **100.0%** of opaque pixels in both. Clean.

### Decision 3 — what makes a stroke a spine: five measures, no adjectives

`docs/13` §4 amendment 8's lesson is the standard here: *"'corto' pasa a ser una afirmación verificada y no un adjetivo."* A settled stroke `S` (`p₀..pₙ`) fills anchor `Aᵢ` iff **all five** hold:

| # | Measure | Definition | Ladder 1→4 |
|---|---|---|---|
| 1 | **base proximity** | `‖p₀ − Aᵢ‖ ≤ baseRadius`, nearest **unfilled** anchor, one stroke per anchor, greedy in stroke order (deterministic) | widest → narrowest |
| 2 | **outward direction** | angle between `p_end − p₀` and the outward normal `n̂ᵢ` (centroid→anchor) `≤ tolDeg` | ~40° → ~22° |
| 3 | **straightness** | `‖p_end − p₀‖ / arclength(S) ≥ straightness` — the number that makes *recto* checkable | ~0.80 → ~0.92 |
| 4 | **length band** | `lenMin ≤ ‖p_end − p₀‖ ≤ lenMax`, **chord** not arclength, so a wobbly long stroke earns nothing | large → small |
| 5 | **no body crossing** | no sample of `S` lies inside `r(θ)` of the centroid, except within `baseRadius` of its own anchor | constant — it is Decision 1(b), derived |

`spineScore = round(100 · filled / anchors.length)`. Measure 3 survives level 3's *"variaciones de ritmo y dirección"* because that variation is **across** spines (each one aimed differently, drawn at a different tempo), not wobble **within** one — the scheme's Etapa 3 is a dense fan of straight quills.

**`minAccuracy` rises 70 → 80 → 90 → 100, and deliberately does not copy the bee family's flat 100.** With one flower and a hive, 100 means *do the one thing*. With ~14 anchors, 100 means *fourteen perfect strokes in a row or the level will not open*, which is the hard early penalty `docs/13` §6 forbids. This is the per-family authored override `reveal`, `artCorridor` and `waypoints` each already take.

Fluency needs no special case: `mustBeContinuous: false` makes `allowedStrokes = strokes.length` (`evaluateLevel.ts:107`), so `extraLifts` is 0 by construction — a many-stroke family is never punished for lifting. `minFluency: 0`, as the reveal and bee families already ship.

**The phase-1 amplitude guard, checked by arithmetic before anything was promised.** The shipped guard (`catalog.test.ts:593-603`) opens with `if (level.kind !== 'path') continue`, so these four are exempt exactly as the twelve reveal levels and the four bee levels are. Its *spirit* is honoured the way the bee family honoured it (C4/C5, `:1720-1747`) — and here the arithmetic **binds the level's whole layout**, so it is done now, not at design time. Let `H` be the rendered body height, `a = 448/306 = 1.4641`, centroid at (0.542, 0.511) of the box, half-width estimated at `0.5·W = 0.732H` (an estimate: the profile's per-ray radii are not yet measured — measure 2 of Decision 2 is what replaces it). The stroke envelope's lowest points are the two arc endpoints at ≈195°/345°, at `c_y − sin15°·r_lat = c_y − 0.2588·r_lat`. Then:

- `maxY > 420` ⟹ `c_y > 420 + 0.1895H`
- body on paper ⟹ `c_y ≤ 600 − 0.489H`
- feasible ⟺ `420 + 0.1895H < 600 − 0.489H` ⟺ **`H < 265.3`**

At `H = 240`, `c_y ∈ (465.5, 482.6]`; take `c_y = 475` → body top 352.4, bottom 592.4 (on paper), `maxY = 429.5 > 420` ✓, `minY < 180` needs `L > 172.4`, and **`span > 300` binds harder, at `L ≥ 222.9`**. Horizontally a 223-unit spine at 15° off horizontal gives a 782-unit envelope, clearing the bee family's extra `> 600` clause.

**What that means, stated as a finding and not as a promise:** the guard's three numbers *are* reachable on `hedgehog1`, but only jointly — a body under ~265 tall, sitting low, with spines of at least ~223 units. And they are **unreachable on levels 3 and 4 by the pedagogy's own definition** (*trazos cortos*, *precisos y pequeños*). So the family asserts the bee family's split, inverted: the guard's numbers on `hedgehog1` (plus the horizontal clause), and **strictly decreasing length bands** on 2→3→4, so *"corto"* and *"pequeño"* are checked claims. `hedgehog4`'s body is the curled PNG, whose measured near-circularity makes a constant radius admissible — and that admissibility is itself an assertion, not an assumption.

**The input layer's tap trap is designed around, not discovered.** `useTraceInput.ts:175-176`: a pointer that never moves clears the buffer and never fires `onEnd`. There is no distance threshold — any movement at all arms it — so a `lenMin` in the tens of units is far clear of it. And the authoritative recount lives in `onRelease` (`LevelPlay.tsx:1318-1344`), the only callback firing exactly once per released, moved stroke, whose third argument is the complete settled list; `onFrame` (`:1156-1317`) sees only the live buffer, which `useTraceInput.ts:180` empties on lift, so it carries at most a live latch for feedback.

**And `onRelease` setting `phase: 'result'` on every release is harmless here — checked, not assumed.** `drawnPlace = inWorld || !!backdrop` (`:1475`), and this family carries a backdrop, so the whole pillars-and-coach block is suppressed (`:1831`). There is no modal and no interruption: the only visible effect of the Nth release is the *Siguiente* button becoming enabled once `attempt.approved` (`:1900`). A per-stroke family therefore needs no new phase machinery.

### Decision 4 — the nine items `docs/13` §6 demands

| §6 item | Answer |
|---|---|
| zona de inicio | Each spine has its own: the anchor. The level's single point (octopus, start dot) is `spines.origin`, authored, plugged into `levelStart`. |
| trayectoria esperada | **None, and that is the mechanic** — the same sentence `reveal` and `waypoints` each earned their field with. Replaced by: anchor, outward normal, length band. |
| tolerancia del camino | No corridor. Tolerance = `baseRadius` + `tolDeg` + `straightness`, all three widest at level 1 and narrowest at level 4 (§6: *"empieza amplia y se reduce"*). |
| respuesta visual al contacto | The anchor mark swaps unfilled → filled (`docs/09` §4: *ganar es ganar tono*); `haptics: true` — a spine landing is a contact worth feeling, the bee row's own argument. |
| condiciones de error | **None punitive.** No hazard, no corridor to leave, no `resetOnContact`. A rejected stroke is simply a stroke that filled no anchor; its ink stays on the sheet. |
| posibilidad de reinicio | `clearAttempt`/`resetSurface` (`:942-981`) **and** `restartRun` (`:1095-1139`), which deliberately does not call the former — both reset through `seedSpines`, never the bare `EMPTY_SPINES` (`arrange.ts:180`'s shipped-bug comment), and a source-read count guard proves all three call sites exist (`seedCameraFor`'s precedent). |
| animación de ayuda | **Mandatory here** (§5 item 2 — the movement is new) and **impossible today** — hence the demo repair in scope item 4. The demo draws the first k anchor→tip segments: the generator already emits them, so this costs a data source, not new animation machinery. |
| criterio de finalización | `spineScore ≥ minAccuracy`, recomputed purely from the complete settled stroke list at evaluation time, never from the live fold. |
| transición narrativa | Paso B's reusable entry/closing components: entry = Pulpito + bubble + hedgehog art; closing = `erizo` filed, the night sector's animal standing on the map. |

### Decision 5 — the narrative wrapper, and an art gap that must not be hidden

| Item | Decision | Why |
|---|---|---|
| `ADVENTURES` row | `id: 'hedgehog'`, `sector: 'nocturna'`, `animal: 'erizo'`, **no `closingBeat`** | `mapBubble` filters on `a.animal !== undefined` (`adventures.ts:251`), so an animal-recovering adventure already carries §5 item 6 through the shipped bubble — the snake, bee and dolphin rows' identical reasoning. The closing screen stays reserved for the entrance. Appended at the END of `ADVENTURES`, per amendment 9. |
| `ZooAnimalId` | add `'erizo'` | `docs/13` §7 lists `erizo.png` as an **animal**, not a UI icon. It resolves the `adventures.ts:57` comment that has been holding this row open since paso D. |
| `nocturna.animals` | first entry, `appearsWhen: ['hedgehog4']`, at the existing `animalSpot` | The sector was built with the spot and an empty list, waiting for this. |
| `nocturna.adventureIds` | eight ids: `night1..4`, then `hedgehog1..4` | A sector with two adventures is already precedented twice (`entrada`: glass then sand; `montañas`: sheep then llama). |
| backpack | **nothing new** | `nocturna` already grants the linterna at `night4`; §8's rule is one object per **sector**. Author's to override. |
| unlock ladder | **unchanged** | See Non-Goals. |

**The art gap, stated:** both shipped PNGs are **spineless by design** (`docs/13` §7: *"erizo.png (cuerpo de perfil, sin espinas, para que el chico las dibuje)"*). So the animal standing on the map after `hedgehog4` is a hedgehog with no spines — which quietly contradicts the closing the adventure just earned. We ship `ZOO_ANIMAL_ART.erizo = HEDGEHOG_ART.profile` and **flag it**: closing it needs a third drawing (`erizo con espinas.png`), which is art, not code, and is the author's. This is the same honesty `docs/13` §4 amendment 7 used for the unfulfilled snake step — written down, not disguised in the level.

### Decision 6 — catalog placement, and the demotion question answered rather than assumed

The four rows go at the end of the **phase-1 block** — after `dolphin4`, before `f2-guirnalda` — not at the end of `LEVELS`, because `catalog.test.ts:121-127` requires phases to ascend. That distinction matters: amendment 9's *"agregar al FINAL de un registro ordenado"* applies to `ADVENTURES`, where only relative order matters; the catalog has a real ordering constraint on top.

`isUnlocked` (`LevelProgressStore.ts:123-129`) reads the **predecessor's id**, so inserting four rows makes `f2-guirnalda`'s predecessor `hedgehog4` rather than `dolphin4`. On its face that re-locks a level an existing child had already opened. It does not, and the reason is recorded: paso G established (design.md "Migration / Rollout", task 10.3) that `isUnlocked`'s only non-test, non-migration consumer is the **dev-only** `LevelMap.tsx`, while real navigation routes through `zoo/sectors.ts`'s declarative `unlockedWhen`, which this change leaves untouched for every sector. **No migration — and `isUnlocked` is re-grepped at apply time and the result stated, exactly as pasos E, F and G each did.**

### Decision 7 — falsifiability: which assertions must render real markup and be confirmed RED

`docs/13` §4 amendment 7's most expensive lesson: *"una suite entera en verde no prueba que el arte esté sobre su corredor."* Here the analogous failure is: the body renders at one box and `spineScore` measures anchors against another, and nothing notices. Six assertions are **required to be confirmed red by temporarily breaking what they guard**, not merely written:

1. **Rendered-markup coincidence.** `renderToString` the canvas for all four levels, parse the emitted `<image x y width height>` for the body, recover its centre and scale, and assert every anchor the scorer measures lies **on the silhouette implied by that exact box**. Both poses. Break it by moving the art 40 units.
2. **The debug flag reaches the SCREEN.** Assertions must touch `TraceCanvas`'s prop, not the helper — `debugCarrier` was written, green, and never invoked, and only the captures caught it. Break it by unwiring the prop.
3. **Reset coverage**, by source-read count of `seedSpines` at all three sites (mount, `resetSurface`, `restartRun`). Break it by deleting the `restartRun` call; the count falls from 3 to 2 (`seedCameraFor`'s exact precedent).
4. **The ink law, asserted as an undrawability.** That `TORCH_CHALK` clears the night band by ≥55 **and** that it fails the body's `brightest` by 29.3 — so the no-body-crossing rule cannot be silently relaxed later. Break it by lowering the body's `brightest` below 184.0.
5. **The demo is not empty.** A routeless level with `demo: true` emits ≥1 demo segment. **This one is red against `main` today**, which is the point.
6. **Its own backdrop group, not a vacuous one.** `backdrops.test.ts:92-100`'s completeness guard fails until the `hedgehog` row joins a group — but with no `tile` and no `channel` the veil check falls back to `SHEET_PAPER` vs `brightest` and passes **vacuously**, since no paper is painted on a backdrop level. Amendment 8 already recorded one rule going vacuous by construction (`artHierarchy.test.ts`); this change does not add a second. The row gets its own group with the substantive **ink** law asserted instead.

## Affected Areas

| Area | Impact | What changes |
|---|---|---|
| `client/src/levels/types.ts` | Modified | `spines?: SpineConfig`, after `camera` |
| `client/src/levels/spines.ts` | New | pure fold: config, tick, score, art/rings, debug seed |
| `client/src/levels/buildLevel.ts` | Modified | `levelStart` third source; routeless demo segments |
| `client/src/game/evaluateLevel.ts` | Modified | one conditional in the `free` branch (`:120-140`) |
| `client/src/canvas/SpineLayer.tsx` | New | `<image>` + anchor marks, no `url(#)` |
| `client/src/canvas/TraceCanvas.tsx` | Modified | `spines` prop + render slot between backdrop and ink |
| `client/src/screen/LevelPlay.tsx` | Modified | `onFrame` latch, `onRelease` recount, both reset sites, debug prop |
| `client/src/levels/catalog.ts` | Modified | `hedgehog1..4`, after `dolphin4` |
| `client/src/detective/assets.ts` | Modified | `'erizo'` in `ZooAnimalId`/`ZOO_ANIMAL_ART`; the measured radius table |
| `client/src/zoo/{adventures,sectors,backdrops}.ts` | Modified | one row each; `nocturna` gains four ids and one animal |
| `client/src/canvas/devMode.ts` | Modified | one ungated flag |
| `client/src/levels/catalog.test.ts`, `zoo/sectors.test.ts`, `zoo/backdrops.test.ts` | Modified | the guards in scope item 10, plus a hedgehog-family block |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Art renders where the scorer does not measure — paso E's exact failure | **High** if untested | Decision 7 item 1, all four levels, both poses, confirmed red |
| The curled face arc literal is wrong (the 300°–360° / "lower-right" inconsistency) | **Medium** | Re-measure before authoring; flagged in Decision 2 |
| The half-width estimate `0.5·W` is wrong for the profile, moving the guard arithmetic | Medium | The build-time radius table replaces the estimate; `hedgehog1`'s guard numbers are asserted against the real table, not the estimate |
| A greedy nearest-anchor assignment behaves badly when two anchors are close | Medium | Deterministic by stroke order and asserted as such; anchor spacing ≥ 2·`baseRadius` asserted per level |
| Spine ink illegible because a stroke wanders over the body | **Certain without measure 5** | Measure 5 is scored, and Decision 7 item 4 pins the algebra |
| `hedgehog4`'s small strokes land near the input layer's tap behaviour | Low | `lenMin` far above it; `useTraceInput` has no distance threshold (`:175`) |
| Four ids inserted mid-catalog re-lock `f2-guirnalda` | Low | Decision 6; `isUnlocked` re-grepped at apply time and the result stated |
| A flaky test misread as a regression | Medium | One of four baseline runs reported `1 failed / 1729 passed`, the other three fully green; **the failing test was not captured**. Treat the suite as green, but a single red is re-run before it is attributed to this change. |

## Rollback Plan

Additive at every seam. To revert: drop the four `catalog.ts` rows, the `ADVENTURES`/`ZooAnimalId`/`ADVENTURE_BACKDROP` rows, and return `nocturna.adventureIds` to the four night ids and `nocturna.animals` to `[]`. Every new field is optional, so every existing level keeps its exact scoring path, and `levelStart`'s and the demo's new branches are unreachable without a `spines` field. Full revert is `git revert` of the branch merge. **No persisted key is renamed and no progress record is invalidated** — `hedgehog*` ids are new and unreferenced by any prior record, and `unlockedWhen` is untouched for every sector.

## Dependencies

- `hedgehog-profile.png` and `hedgehog-curled.png` are **already built, registered and measured** — verify, do not rebuild. No `build_art.py` re-run.
- The build-time radius-by-angle table (Decision 2) must be measured with `scripts/art/png.py` before any anchor literal is authored.

## Success Criteria

- [ ] Four levels play: strokes leaving the body outward fill anchors; strokes that cross the body, aim inward, curve, or fall outside the length band do not.
- [ ] A rendered-markup test proves the body `<image>` box and the scored anchors agree, on all four levels and both poses — confirmed red.
- [ ] `hedgehog1` satisfies the phase-1 guard's three numbers plus the horizontal clause; `hedgehog2..4` assert strictly decreasing length bands, so *corto* and *pequeño* are checked claims.
- [ ] A test proves `demo: true` on a routeless level emits at least one segment — red against `main` today.
- [ ] The ink algebra ships as an assertion, including the undrawability of chalk over the body.
- [ ] `seedSpines` is proven present at all three reset sites by source-read count.
- [ ] No `url(#)` introduced anywhere.
- [ ] Finishing `hedgehog4` stands the erizo in the night sector on the map.
- [ ] `npm test` and `npm run build` green (baseline **76 files / 1730 tests**; `npm run build` = `tsc --noEmit && vite build`, and there is no lint script).
- [ ] Captures in `capturas/pasoH/`, two per level: control, and `?debug=espinas:<k>`. Paso E's lesson — read one without the other and correct art looks detached.
- [ ] `docs/13` §4 gains an **amendment 10** in Spanish, recording what paso H learned. A deliverable, not an afterthought.

## Proposal question round

Raised here rather than asked live (the executor has no interactive channel). None blocks `sdd-spec` or `sdd-design`; each has a stated working assumption the author can overturn in one line.

1. **Does Etapa 1 accept "long outward" instead of "crossing the body"?** *Assumption: yes.* The law closes the crossing branch on the art as shipped, and the arithmetic makes the outward stroke ≥223 units — a real whole-arm movement. The escape exists and is yours: darken the body's brightest pixel to ≤184.0 and chalk becomes legible over it.
2. **Does the erizo stand on the map with no spines?** *Assumption: yes, using the shipped profile art.* Closing it needs a third drawing.
3. **Is `minAccuracy` 70/80/90/100 right, against the bee family's flat 100?** *Assumption: yes* — fourteen perfect strokes as an entry condition is the hard early penalty §6 forbids.
4. **Does `nocturna` grant a second backpack object?** *Assumption: no* — §8 grants one per sector and the linterna is already there.
5. **Anything to add to the ladder beyond `docs/14`'s four stages?** *Assumption: no.* §1's rungs (amplitud → repetición → variación → cambio de dirección → reducción de espacio → precisión) are carried by falling length bands and rising anchor counts; obstacles stay out, per §1.

---

*Length note: this proposal exceeds the skill's 450-word budget, the same recorded deviation as its five predecessors under `delivery_strategy: exception-ok`. `openspec/config.yaml` requires a rollback plan for risky changes; this one carries seven decisions, three measured algebraic constraints, and one engine repair that is red against `main` today.*
