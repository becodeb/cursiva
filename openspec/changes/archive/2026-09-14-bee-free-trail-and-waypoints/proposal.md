# Proposal: Bees in the forest — free trail with waypoints

Paso F of `docs/13_AVENTURAS_POR_ANIMAL.md` §8. Scope is row F only.

## Intent

The bee adventure is the first one where **the child authors the route instead of following one**. Every shipped family (ducks, snakes, sheep, llamas) scores a finger against a corridor the engine drew. Here the engine draws no corridor: the child invents a trail, the bee follows it immediately, and success is "did the trail pass through the flowers and reach the hive". `docs/13` §2 and `docs/14` §10 name the skills this trains — continuity, **route planning**, coordination, and response to immediate feedback — and planning is exactly what a pre-drawn corridor cannot train.

The mechanic is half-built and half-broken. The carrier that follows the finger already exists (`LevelConfig.carrier`, `TraceCanvas.tsx:866-876`). But it is positioned from `target.polyline[0]` (`LevelPlay.tsx:1186`) and gated on that value (`:1498-1503`), and `buildLevel.ts:168-180` returns an empty `polyline` for every `kind: 'free'` level. **A `carrier: true` + `kind: 'free'` level renders no carrier at all today.** The repo's own comment at `LevelPlay.tsx:1188-1190` predicted this. It is the same shape as paso E's `corridorTick`-walks-only-`paths[0]` defect, which the repo's own comment had also predicted. This change repairs it as named work, not as an apply-time surprise.

## Scope

### In Scope

1. **`waypoints?: WaypointConfig` — an additive optional field on `kind: 'free'`**, not a third `LevelKind`. Pure fold module `levels/waypoints.ts`: `waypointTick` (monotone render latch), `waypointScore` (pure, recomputed from the complete stroke list at evaluation time), `debugWaypoints` (screenshot seeding). `evaluateLevel.ts:119-133`'s free branch grows one `if`, with `revealScore` preserved bit-identical as the fallback.
2. **The carrier-visibility repair.** `WaypointConfig.start: Point` is authored; `startMarker` falls back to it when `target.polyline` is empty; new additive `LevelConfig.carrierArt?: ArtImage` overrides the hard-wire at `LevelPlay.tsx:1511` so the **bee**, not the lens, follows the finger. The octopus stands at `start` (`docs/09` §2).
3. **Four levels `bee1`..`bee4`**, `phase: 1`, ids permanent from first commit.
4. **Render layer** `canvas/WaypointLayer.tsx`, mirroring `RevealLayer.tsx`: one `<image>` per flower and hive via `placeArt` + `clampArtBox` inside a single `<g pointerEvents="none">`. No `url(#)` of any kind.
5. **Forest background under the whole play area** (`docs/13` §4 decision 3): `build_art.py:536`'s `PASSTHROUGHS` row for `fondo bosque.png` gains `corridorRows=(191, 926)`; a new `ADVENTURE_BACKDROP` row with **no `channel`** and **no `corridorArt`**.
6. **Flower dormant/drawn state**: new achromatic palette token, new pipeline row, new two-state registry entry.
7. **Registry + ladder**: `AdventureId += 'bee'`; `ZooAnimalId += 'abeja'`; `bosque` sector filled; `unlockedWhen: isFiled(records, 'snake4')`; one backpack item.
8. **Two ungated `?debug=` flags** and the **rendered-markup coincidence test** (below).
9. The three `catalog.test.ts` guards that will go red (`:48-97` `EXPECTED_IDS`, `:251-264` minAccuracy-by-phase, `:399-411` tone/haptics).

### Out of Scope

- **Delfines (row G), erizo (row H), caracol.** Explicitly not this change.
- Screen scrolling / advancing `viewBox` — that is row G's new mechanic.
- Visit-order enforcement, path-length efficiency budgets, hazards, or any obstacle. `docs/13` §1: *"los obstáculos aparecen después, nunca al comienzo."*
- Retiring `Deduction`, `cases.ts`, or any clue machinery (`docs/13` §4 decision 1 keeps them).
- Choosing the flower dormant colour's exact literal — see Decision 4.

## Capabilities

### New Capabilities

- `free-trail-waypoints`: a routeless level scored by authored waypoints — a start point, N flower waypoints, one goal — with a carrier that follows the child's own invented trail. Mirrors how `reveal-grid`, `art-corridor` and `object-arrange` each got their own spec.

### Modified Capabilities

- `level-engine`: `LevelConfig` gains optional `waypoints` and `carrierArt`; the `kind: 'free'` scoring branch gains one conditional.
- `trace-canvas`: new `waypoints` prop and layer; carrier resting position derives from an authored start when the route is empty.
- `zoo-map`: `bosque` sector activated, `bee` adventure, `abeja` animal, unlock ladder extended by one rung, backpack gains one item.

## Approach

### Decision 1 — additive field, not a third `LevelKind`

`LevelKind` stays at two values. A bee level **is** a free level with one more optional field, the exact relationship `reveal?` / `arrange?` / `artCorridor?` already have. The tradeoff, argued rather than asserted: a third value would buy a name in the type system and future exhaustiveness pressure, but it would cost an audit of 16+ `kind === 'free'` / `kind === 'path'` sites where "not path" today silently means "the one default case". Several of those (`resetOnContact = … && level.kind === 'path'`, `catalog.test.ts:352`'s maze check) already encode `'path'` as the only non-default kind. That audit has no test to catch its misses — which is precisely paso E's lesson. The additive field delivers the same capability with a blast radius of zero on existing call sites.

### Decision 2 — the four-level ladder, one rung per step of `docs/13` §2

| Level | §2 step | What changes | Touch radius |
|---|---|---|---|
| `bee1` | *recorrido corto y visible* | Hive close to start, **no flowers**. The whole lesson is "the bee follows your line." Carries the `demo`. | widest |
| `bee2` | *varias flores* | Same span, 3 flowers between start and hive. Planning enters. | widest |
| `bee3` | *trayecto más largo* | Hive across the sheet, flowers spread wider, 4 of them. Continuity under sustained travel. | wide |
| `bee4` | *mayor precisión* | Radii shrink; flowers placed so a careless sweep misses them. | narrowest |

Precision is expressed by **shrinking the waypoint touch radius**, the direct analogue of every other family narrowing its corridor (sheep 100→60, llama 90→60, snake 38→28). Rejected alternatives, with reasons: a path-length efficiency budget is an inhibition mechanic, not a precision one; enforced visit order contradicts §2's own wording (*"puede pasar por flores y llegar al panal"*) and contradicts the only existing touch-N-authored-points precedent in the repo (`reveal.mode: 'light'`, deliberately unordered).

**On the phase-1 span guard**: `catalog.test.ts:556` is `if (level.kind !== 'path') continue`, so a bee level is automatically exempt. The guard's *spirit* — phase 1 trains the whole arm, not the fingertip — is honoured anyway: `bee1`–`bee3` place `start`, flowers and hive so the travel envelope spans a large share of the sheet both horizontally and vertically (the author's schematic `abejas-estela.png` rises and falls across the full width), and `bee4` gains precision **by shrinking the targets, never by shrinking the gesture**.

### Decision 3 — the nine items `docs/13` §6 demands, answered for the family

| §6 item | Answer |
|---|---|
| zona de inicio | Authored `WaypointConfig.start`. The octopus stands there; the bee rests there. This is the field that repairs the carrier defect. |
| trayectoria esperada | **None is authored — that is the mechanic.** Expected = continuous from `start`, through every flower, ending at the hive. |
| tolerancia del camino | No corridor. Tolerance = per-waypoint touch radius, wide at `bee1`, narrowest at `bee4` (§6: *"empieza amplia y se reduce"*). |
| respuesta visual al contacto | Flower swaps dormant → drawn art (`docs/09` §4: *ganar una pista es ganar TONO*). `haptics: true` on contact. |
| condiciones de error | **None punitive.** No hazard, no corridor to leave, no `resetOnContact`. A missed flower is an unlit flower, i.e. a score under `minAccuracy`. |
| posibilidad de reinicio | Existing `clearAttempt`/`resetSurface`. The latch is monotone within an attempt and cleared between attempts. |
| animación de ayuda | The engine's existing `demo`, on `bee1` only — the movement is new there and nowhere else in the family (`docs/13` §5 item 2). |
| criterio de finalización | `waypointScore`: every flower lit **and** the hive reached, recomputed purely from the complete stroke list, the shape `revealScore` already uses. |
| transición narrativa | The reusable entry/closing components built in paso B (`docs/13` §5): entry = Pulpito + bubble + `abeja.png`; closing = `abeja` filed, forest de-fogged on the map, backpack item granted. This is the one thing §6 says the engine does not express, and §5 supplies it. |

### Decision 4 — the flower's dormant state: the constraint is ours, the colour is the author's

Measured (Engram #1381, not re-measured here):

| Quantity | Value |
|---|---|
| Forest quiet band `#949b8c` | luma **151.2**, flat across rows 191–926 |
| `docs/09` §4 admissible achromatic bands | luma **≤ 96.2** or **≥ 206.2** |
| `CLUE_DRAINED #838383` (luma 131) | separates **20.2** — **fails by 34.8**. The shipped dormant grey is invisible in the forest. |
| Light branch floor (206.2) vs `INK_COLOR` (luma 39.8) | **166.4** |
| Dark branch ceiling (96.2) vs `INK_COLOR` | **56.4** — 1.4 above the law's floor |

**The pale branch reopens here, for the first time in the project.** `docs/13` §4 decision 6 concluded that any surface covering a *light* background must be dark, because the child's own ink imposes a floor. The forest band is in the **middle**, so both branches exist — and the light one is far safer (166.4 against the child's ink versus 56.4 sitting on the law's edge). No existing palette token is achromatic at luma ≥ 206.2.

**This proposal fixes the constraint and does not quietly pick the colour.** `docs/13` §4 decisions 6 and 7 both ended the same way — *"los dos literales quedaron intactos esperando a la autora"*, *"cuál claro es de la autora"* — and this is the same kind of item: the law corners a range, art direction picks the value inside it. We will ship a named token `FLOWER_DORMANT` at a **provisional** `#d2d2d2` (luma 210.0; separates 58.8 from the band, 170.2 from the ink; saturation 0), with the constraint written into the test so the author can change the literal in one place and the suite will hold her to the law. **The exact light is hers, not ours.**

One note for design: `docs/09` §4's hierarchy rule (a dormant mark must separate from its ground more than any decorative ground mark separates from its own) is **vacuous in this sector** — decision 3 removes scattered ground marks entirely. `artHierarchy.test.ts` must not be made to compare against an empty set.

### Decision 5 — registry, ladder, backpack

| Item | Decision | Why |
|---|---|---|
| `AdventureId` | add `'bee'` | new adventure |
| `ADVENTURES` row | `animal: 'abeja'`, **no `closingBeat`** | snake's row is the template; `closingBeat` is reserved for the entrance's `sand` |
| `ZooAnimalId` | add `'abeja'`; `ZOO_ANIMAL_ART.abeja = SECTOR_ADVENTURE_ART.bee` | `docs/13` §7 lists `abeja.png` as an **animal**, not a UI icon |
| `bosque.unlockedWhen` | `isFiled(records, 'snake4')` | extends the documented ladder by one rung; every sector unlocks off the previous sector's last level, never a skip |
| backpack | one item granted by `bosque`, `earnedWhen: ['bee4']`, art = the already-built `SECTOR_ADVENTURE_ART.flower` | `docs/13` §8: one object per closed sector, and all four shipped items reuse existing art. The **hive** would be narratively wrong (the bee needs it); a flower kept from the forest is clean and needs zero new art. Flagged for the author in the question round below. |

### Decision 6 — how this becomes screenshottable, and the test paso E's lesson demands

Paso E cost a whole family: 1,553 green tests while the snake art sat in one place and its scored route in another, because **no assertion rendered the real `<image>` and compared it to the path**. Here there is no path, so the analogous failure is: the flower renders at one coordinate and `waypointScore` measures against another, and nothing notices.

Required, not optional:

1. **A rendered-markup coincidence test.** `renderToString` the canvas for all four bee levels; parse every emitted `<image x y width height>`; recover each flower's and the hive's **centre**; assert it equals the authored `WaypointConfig` coordinate that `waypointScore` actually measures against. Run it for **both** the dormant and the drawn state — the swap must not move the art by a unit.
2. **A carrier-presence regression test.** Assert that a `carrier: true` + `kind: 'free'` level emits a carrier `<image>` at all. This is the test that would have caught the defect in Decision 2 of the In Scope list, and it must exist before the fix, not after.
3. **Two ungated `?debug=` flags** on `devMode.ts`'s existing private `debugArg` helper: one to pin the live trail position (a static frame cannot show a moving finger), one to seed *k* flowers already lit (a single pinned point cannot encode an accumulated latch). Ungated per `devMode.ts:8-20`'s own rule — they paint render state only, open no surface, persist nothing, and must work against the exact build being screenshotted. Exact grammar is for `sdd-design`.

## Affected Areas

| Area | Impact | What changes |
|---|---|---|
| `client/src/levels/types.ts` | Modified | `waypoints?`, `carrierArt?` — the 7th and 8th additive-optional precedents |
| `client/src/levels/waypoints.ts` | New | pure fold: config, tick, score, debug seed |
| `client/src/game/evaluateLevel.ts` | Modified | one conditional in the `free` branch |
| `client/src/canvas/WaypointLayer.tsx` | New | `<image>` per waypoint, no `url(#)` |
| `client/src/canvas/TraceCanvas.tsx` | Modified | `waypoints` prop + render slot |
| `client/src/screen/LevelPlay.tsx` | Modified | `onFrame` block; **`:1186` start fallback**; **`:1498-1511` carrier gate + per-level art** |
| `client/src/levels/catalog.ts` | Modified | `bee1`..`bee4` |
| `client/src/detective/palette.ts` | Modified | `FLOWER_DORMANT` (provisional literal) |
| `scripts/art/build_art.py` | Modified | `:536` `corridorRows=(191, 926)`; new dormant-flower recolour row |
| `client/src/zoo/{adventures,sectors,backdrops,backpack}.ts` | Modified | registry, ladder, backdrop, reward |
| `client/src/detective/assets.ts` | Modified | `'abeja'`, two-state flower entry |
| `client/src/canvas/devMode.ts` | Modified | two ungated flags |
| `client/src/levels/catalog.test.ts` | Modified | three guards + a bee-family progression block |
| `client/src/detective/artManifest.test.ts` | Modified | forest `corridorRows`/`quiet`/`brightest`, dormant-flower keys |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Art renders at a coordinate the scorer does not measure — paso E's exact failure | **High** if untested | The rendered-markup coincidence test in Decision 6, mandatory, for all 4 levels × both states |
| Carrier invisible on a `free` level | **Certain today** | Authored `start` + explicit presence regression test |
| Manifest literals drift from the rebuilt art | Medium | `build_art.py` re-run precedes any hand-copied literal; `artManifest.test.ts` guards them |
| `#d2d2d2` ships as if it were an author decision | Medium | Named `FLOWER_DORMANT`, documented as provisional, constraint (not value) asserted by test |
| `artHierarchy.test.ts` compares against an empty decorative set in a sector with no ground marks | Medium | Flagged for `sdd-design`; the rule is vacuous here by construction |
| `artHierarchy.test.ts` flakiness under parallel load (Engram #1384) | Low | A red there is re-run before being believed |

## Rollback Plan

The change is additive at every seam. To revert: drop the `bee1..bee4` catalog rows and set `bosque.unlockedWhen` back to `alwaysClosed` — every new field is optional and every existing level keeps its current scoring path (the `revealScore` fallback is bit-identical). Full revert is `git revert` of the branch merge; no persisted key is renamed and no progress record is invalidated, because `bee*` ids are new and unreferenced by any prior record.

## Dependencies

- `scripts/art/build_art.py` must be re-run after the `corridorRows` and dormant-flower rows land, before any manifest literal is hand-copied.
- `sector-bee.png`, `sector-flower.png`, `sector-honeycomb.png` and `sector-forest-background.png` are **already built and registered** — verify, do not rebuild.

## Success Criteria

- [ ] All four `bee1..bee4` levels play: the bee follows the child's trail from `start`, flowers light on contact, the hive completes.
- [ ] A rendered-markup test proves every flower and hive `<image>` centre equals the coordinate `waypointScore` measures — in both states.
- [ ] A regression test proves a `carrier: true` + `kind: 'free'` level renders a carrier.
- [ ] The four levels' touch radii decrease monotonically, asserted by a bee-family block in `catalog.test.ts`.
- [ ] `FLOWER_DORMANT` is achromatic and ≥ 55 luma from the forest band, asserted as a **constraint** so the author can change the literal freely.
- [ ] No `url(#)` introduced anywhere.
- [ ] Finishing `bee4` files `abeja`, de-fogs `bosque` on the map, and grants the backpack item.
- [ ] `npm test` and `npm run build` green (baseline 72 files / 1555 tests).
- [ ] Captures in `capturas/pasoF/`, including both the seeded and unseeded flower states (paso E's lesson: read one without the other and the art looks detached when nothing is wrong).

## What is explicitly NOT closed

Stated openly, following the precedent of `docs/13` §4 decision 7, which wrote down the unfulfilled snake step rather than faking it:

1. **The flower dormant colour is a decision for the author.** We ship a provisional literal and a tested constraint. This is the third time `docs/09` §4 has cornered an art-direction choice (paso D's fog and swept sand, paso E's snake ink, now this).
2. **The forest's backpack item is proposed, not mandated.** `docs/13` §8 defers per-sector objects; the flower is the cheapest coherent choice, but it is hers to confirm.
3. **The exact `?debug=` grammar** is for `sdd-design`, not decided here.
4. **`docs/13` §4 will need a decision 8** recording what paso F learned, in Spanish, in the same amendment style as decisions 5–7. That is a deliverable of this change, not an afterthought.

## Proposal question round — resolved

Five questions were raised. One was put to the author; the other four are settled by the directives themselves, and the reasoning is recorded here so nobody re-opens them.

### Answered by the author

**`bee1` carries ONE flower.** The zero-flower reading is rejected. `docs/13` §8 names this row's mechanic *"trazo libre con puntos de paso"*, and a level with no waypoint does not exercise it — `bee1` would be free scribbling toward a goal, and the family's own mechanic would not appear until `bee2`. One flower lets the first level teach both halves at once: the bee follows your line, **and** there is a place to pass through before the hive. *"Varias flores"* at `bee2` still reads correctly as a step up from one.

This binds the ladder: **1 → 3 → 3 over a longer journey → 3 with tighter radii.** `sdd-design` owns the exact counts for `bee2`–`bee4` within that shape.

### Settled by the directives, not by assumption

- **Where the bee is when the level opens.** `docs/14` §10 is literal: *"El niño crea una estela con el dedo y la abeja lo sigue inmediatamente."* She rests at `start` and departs when the finger does. The alternative — waiting at the far end and flying the finished trail — contradicts *"inmediatamente"* and drops the immediate-feedback skill `docs/13` §2 names.
- **An unlit flower counts against completion, never against the score.** `docs/13` §6 forbids punishing early errors hard, and §1 places obstacles after the movement is understood, never at the start. This is the family's first appearance.
- **The forest's backpack item is a flower.** `docs/13` §8 grants one object per closed sector; the flower reuses shipped art, and the hive would be narratively wrong (the bee's home is not the Pulpito's souvenir). Still the author's to override.
- **The flower's dormant light stays provisional at `#d2d2d2`.** The law admits any achromatic value at luma ≥ 206.2 and the author owns the choice. This follows the precedent of `docs/13` §4 decisions 6 and 7, where the cornered literal was left intact and written down rather than quietly picked. The test asserts the **constraint** — achromatic, ≥ 55 luma from the forest band — not the literal, so changing it is a one-line edit the suite still polices.
