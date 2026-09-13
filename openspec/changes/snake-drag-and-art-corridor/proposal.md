# Proposal: Snakes in the sand — dragging objects, and the art as the corridor

Scope is `docs/13_AVENTURAS_POR_ANIMAL.md` §8 **row E, and only row E**:
*"Víboras en la arena"*, mechanics *"Arrastre de objetos; el arte como
corredor"*. Rows F, G and H are untouched.

## Intent

Every corridor the engine has ever drawn was a painted band under the
child's finger: earth, stone, paper. Row E is the first adventure where
**the corridor is a drawn animal**, and the first where the child moves
something before tracing anything.

- **Both mechanics are absent.** `docs/13` §4: *"Víboras — No existe. Dos
  mecánicas nuevas: arrastrar objetos (ordenar, llevar) y el corredor es el
  arte."* Nothing in the app drags: the map's sectors are `onClick` on
  transparent rects and the backpack is inert `<img>`s. `useTraceInput`
  allows exactly one stroke and treats a move-less `pointerup` as a tap.
- **The art is already built and already unreachable.** `build_art.py`'s
  `SINGLES` emits `sector-snake-{small,medium,large}.png` and `assets.ts`
  declares all three (`480×98`, `492×114`, `500×95`). No consumer. **There
  is no art step in this change** — what the pipeline still owes is
  measurement, not pixels.
- **The `arena` is the last fogged sector with shipped art waiting for it.**
  `sectors.ts` has it at `alwaysClosed`, `animals: []`, `adventureIds: []`,
  and `docs/13` §8 says the backpack gains one object per closed sector —
  the arena owes one.
- **The pedagogy is seriation, and nothing in the app teaches it.** `docs/13`
  §2 and `docs/14` §6: the child first **orders** the snakes smallest to
  largest, then **traces** each body to **carry** it somewhere suitable in
  the sector. Ordering by size is not a grafomotor task, and it is the one
  step of the whole progression that a route cannot express.

## Scope

### In scope

1. **The art corridor**: a snake's drawn centreline authored as a generator
   in `paths.ts`, `corridorWidth` taken from the measured body, and the PNG
   placed so the two coincide — with the coincidence **measured and
   asserted**, not promised in prose.
2. **The arrange mechanic**: dragging objects into an ordered arrangement,
   as one pure fold plus a sibling input hook, with every decision an
   exported pure function.
3. **Four levels, `snake1..4`**, appended after `night4`, walking `docs/13`
   §2's four víbora steps in order.
4. **The `snake` adventure row**, its intro and closing, its sand backdrop
   entry, and the restated 55-luma law an art corridor needs.
5. **The `arena` sector opened**: `unlockedWhen`, the recovered víbora
   standing in the zoo, one backpack item.
6. **Spine and luma sampling in `build_art.py`**, emitted into
   `manifest.json` alongside the `quiet`/`brightest` it already emits.

### Out of scope (explicitly unchanged)

Rows F, G and H (bees, dolphins, hedgehog — `bosque` stays fogged and the
erizo art stays unwired) and the snail; the paused three-option deduction
(`cases.ts`, `Deduction.tsx`, `ClueKind`, `AnimalId` — `docs/13` §4
decision 1); every shipped level and backdrop (glass, sand, duck, sheep,
llama, night, medusa, `trail1..4`, `f1-libre`); the reveal grid and
`coverage.ts`; `AdventureIntro`/`AdventureClosing` and the `close` route,
which this row **uses and does not touch**; `migrateEntrance.ts`; any level
id rename; letters; the `docs/09` §3 `url(#)` ban, which this change is
built around rather than against; `docs/*` beyond `docs/13` §4's status
row.

## Capabilities

### New capabilities

- `art-corridor`: a corridor whose surface is a drawn cutout rather than a
  painted band — the centreline generator, the placement function shared by
  renderer and test, the manifest-backed coincidence proof, and the
  legibility law an art surface must satisfy.
- `object-arrange`: draggable objects, slots, and the ordered-arrangement
  completion criterion; the pure fold and its pointer sibling.

### Modified capabilities

- `level-engine`: an optional `arrange?` field on `LevelConfig`; a level
  whose `paths` are art centrelines; four authored levels and their
  progression as invariants.
- `guided-trace-mode`: a guided level may gate tracing behind a completed
  arrangement, and its completion becomes the conjunction of both.
- `trace-canvas`: two new layers — the snake cutouts under the ink, the
  draggable objects above the backdrop — both plain `<image>`/`<rect>`, no
  fragment reference; per-backdrop `ink`/`inkDim` reused, not invented.
- `zoo-map`: the `arena` unlock, the `snake` adventure, the recovered
  víbora, the arena's backpack item.

## The decisions

### 1. The phase-1 span guard is satisfied honestly, by the author's own scheme

`catalog.test.ts:528` (*"puts no phase-1 route inside the writing band"*)
demands of every `kind: 'path'` phase-1 level that `maxY − minY > 300`,
`minY < 180` and `maxY > 420`. A snake is ~5:1 horizontal; one snake
cannot clear it, and a generator clever enough to make one snake clear it
would be drawing something the author did not draw. This is paso C's
"montañitas bajas" trap exactly.

**It is resolved by reading the scheme, not by amending the test.**
`docs/referencias/viboras-el-animal-es-el-trazo.png` draws **three snakes
stacked down one sheet**, amplitude increasing top to bottom, head at the
right end. The guard iterates `level.paths` — *every path of the level* —
and `buildLevel.ts:148` already defines multi-entry `paths` as pen-lift
segments that each contribute checkpoints, numbered `1..N` across the whole
level, and their own band to the ideal cloud. So **each snake level's
`paths` array holds three snake centrelines**, and the union clears the
guard because the child's arm really does cross the whole sheet three
times.

The arithmetic, from the measurements in `state.yaml`:

| | shipped px | at ~1.58× (760-unit span) |
|---|---|---|
| median body thickness (grande) | 52.5 | ≈ 83 units |
| centreline peak-to-peak swing (grande) | 42 | ≈ 66 units |
| envelope per snake | | ≈ 149 units |
| three stacked | | ≈ 447 of the 480-unit drawable band |

Centres at y ≈ 160 / 300 / 440 put the **centreline** union at minY ≈ 127
(< 180 ✓), maxY ≈ 473 (> 420 ✓), span ≈ 346 (> 300 ✓). The sizing
constraint design must hold is `3 × (thickness + swing) ≤ 480`; it fits at
a horizontal span of roughly 700–760 units, and that is the knob.

Two consequences, named rather than discovered later:
`mustBeContinuous: false` on all four (three snakes are three strokes), and
`enforceOrder` becomes **seriation restated as a motor rule** — tracing
smallest, then medium, then largest is the same claim the drag step makes.
It starts `false` on `snake1` and turns `true` once the movement is
understood, which is `docs/13` §1's own ordering rule.

### 2. The art is the corridor by construction, and the coincidence is measured

**Position adopted: an authored centreline generator plus a placement
function, with the drawn spine sampled at build time and asserted against
it. No alpha sampling.**

`paths.ts`'s own opening rule is that phase-1 geometry is *retunable data,
never a redrawn asset*. So the snake's centreline is `snakeSpine(...)` in
`paths.ts`, emitting the same absolute `M`/`L`/`C` alphabet as every other
generator; `corridorWidth` comes from the measured median body thickness;
`corridorTick` does the hit-testing it already does, unchanged.

**The rejected alternative, named because silence would be worse.** Reading
the PNG's alpha at runtime — `<canvas>`, `getImageData` — would make the
coincidence exact by construction. There is **no `getImageData` anywhere in
this app today**, and introducing raster sampling into a pure-geometry
engine is an architectural first that would have to earn its way in on its
own merits, not arrive as a side effect of one adventure. It is declined.

**The risk that buys: the generator's wave drifting from the drawn wave.**
A corridor that scores against a centreline the picture does not follow is
the worst failure this change can ship, and it is invisible to every test
that only reads TypeScript. So the coincidence becomes falsifiable:

- `build_art.py` samples each snake cutout's **spine** — the vertical
  midpoint of the opaque body, column by column — and its **median
  thickness**, and emits both into `manifest.json`, normalized to the
  shipped cutout's own box. This is exactly the shape `sample_corridor_band`
  already has for `quiet`/`brightest` (`build_art.py:527`), and
  `artManifest.test.ts` already guards manifest drift.
- **One exported pure placement function**, `snakePlacement(art, spine,
  span)`, returns the `<image>`'s `{x, y, w, h}` **and** the viewBox-space
  spine. The renderer and the test call the same function; a test that
  recomputed placement independently would prove nothing about what is
  drawn.
- The assertion: *for every snake level, every sampled spine point lies
  within N viewBox units of the generated centreline, and N is well inside
  `corridorWidth/2`.* Design pins N against the real manifest.

### 3. The 55-luma law is restated for an art surface, not waived

`backdrops.test.ts:41` asserts, for every registry row,
`|luma(tile ?? channel ?? SHEET_PAPER) − luma(brightest)| ≥ 55`. A snake row
with no `channel` resolves to `SHEET_PAPER` (252) against the sand's
measured `brightest` (`#dad0c0`, 209.2) and **goes red at 42.8**. An
exemption would be the easy move and the wrong one.

**Position: the corridor's surface is the art, so the law is asserted
against the art's own measured extremes — in two directions, which is
strictly stronger than the one assertion it replaces.** A new optional
field, sampled at build time and hand-copied from the manifest the way
every other literal in `backdrops.ts` is:

```ts
/** This adventure's corridor is DRAWN ART, not a painted band. */
corridorArt?: { brightest: string; darkest: string }
```

| Assertion | Value | Margin |
|---|---|---|
| child's ink vs. the art's **darkest** (the author's spots, `#1a1a1a`, 26) | `TORCH_CHALK` 239 | **213** ✓ |
| child's ink vs. the art's **brightest** body (`#7b9b6e`, 140.3) | `TORCH_CHALK` 239 | **99** ✓ |
| the art's darkest vs. the backdrop's `brightest` (209.2) | 26 | **183** ✓ |
| the art's body vs. the backdrop's `brightest` | 121.7–140.3 | **69–87** ✓ |

So the sand needs **no channel painted under the snakes** — the third and
fourth rows are why — and the snake row declares `ink: TORCH_CHALK`,
`inkDim: TORCH_CHALK_DIM`, the **exact two fields the night row already
ships**. A shipped mechanism reused, not a new one invented.

**Three deliberately-red falsifiability tests**, paso D's own discipline
(`backdrops.test.ts:63-83`), each asserting `< 55` so none can pass
alongside the rows above:

1. `|luma(INK_COLOR) − luma(#1a1a1a)| < 55` — **14**. This is the proof that
   a dark ink is undrawable on a snake, over up to 37 % of the traced
   columns. Without it, `TORCH_CHALK` looks like a taste call.
2. `|luma(SHEET_PAPER) − luma(sand brightest)| < 55` — **42.8**. No paper
   channel is admissible on sand.
3. `|luma(TORCH_CHALK) − luma(#f5f5f5)| < 55` — **6**. The eye whites reach
   the spine for 1–3 % of columns at the head end, so **the traceable span
   must end behind the head**. The head is the goal the child is heading
   for, and the ink stops just short of it.

### 4. The drag is a sibling, not a mode flag — and every decision is a pure function

`useTraceInput` permits one stroke, treats a move-less release as a tap, and
accumulates into a ref. Widening it with a `mode` would put the tap/drag
discriminator inside the one hook the whole app's input correctness rests
on. The repo's consistent answer to a second behaviour is a **sibling with
its reason written down**: `AdventureClosing` beside `AdventureIntro`,
`waveVaried` beside `wave`.

- `canvas/useDragInput.ts` — its own pointer capture, its own
  `getScreenCTM().inverse()` mapping (naive `clientX` scaling stays banned),
  its own single-active-pointer rule.
- `useTraceInput` is **switched off during the arrange phase through
  `options.enabled`, which already exists** (`useTraceInput.ts:140`). No new
  flag inside it, and its tap semantics are untouched.
- `levels/arrange.ts` — the pure fold: `grab(objects, point)`,
  `dropInto(state, slots)`, `isArranged(state)`, `arrangeTick(prev, …)`
  returning **the same reference when nothing changes**, the exact contract
  `revealGrid.ts` established.

**Why this is not optional.** The node harness has no jsdom and no
testing-library; components are tested through `renderToString` only. A
decision taken inside a pointer handler is *invisible to every test in this
repo*. Naming and exporting each decision is what makes the mechanic
testable at all.

### 5. The four levels, against `docs/13` §2's own four steps

§2, in order: *acostadas y de ondulación simple → tamaños diferentes →
orientación vertical u oblicua → mayor variación de la ondulación*. The
three drawn snakes are the only art, so what varies is arrangement,
orientation, amplitude and tolerance.

| Level | §2 step | The sheet | Arrange | Corridor |
|---|---|---|---|---|
| `snake1` | acostadas, ondulación simple | three snakes lying, already in their hollows | **none** — §5 item 3's wide, accessible first challenge; `demo: true` | widest |
| `snake2` | tamaños diferentes | the same three, arriving scattered | **yes**: drag into the three hollows, smallest to largest | −1 step |
| `snake3` | orientación vertical u oblicua | the three rotated oblique via `transformPath` | yes | −1 step |
| `snake4` | mayor variación de la ondulación | `waveVaried`-shaped spines, uneven cycles | yes | narrowest |

Invariants the catalog test asserts, in the spirit of paso C's and paso D's
family invariants:

> Across `snake1..4` the corridor width is non-increasing and the traced arc
> length is non-decreasing; `snake1` is the only one with no `arrange`, and
> the only one with `demo`; every level's `paths` holds exactly three
> centrelines and clears the phase-1 span guard on their union.

`demo` on `snake1` only: §5 item 2 asks for a demonstration *when the
movement is new*, and "sustained undulation along a body that is itself the
path" is a new relationship even though the wave shipped with the ducks.
`demo` animates `paths[0]`, so it demonstrates the first snake and stops —
accepted, because one demonstration is the point.

### 6. `docs/13` §6 / `docs/14` §14, item by item

| §6 obligation | How this row answers it |
|---|---|
| Zona de inicio | The tail — the left end of each snake, where the engine's start marker already lands. Left-to-right is the writing direction and the author's scheme puts the head on the right. |
| Trayectoria esperada | The snake's own drawn body. This is the row's whole premise; decision 2 is what makes it true rather than approximately true. |
| Tolerancia del camino | `corridorWidth` from the measured median body thickness, narrowing across the four (decision 5). Tolerance is literally *how much of the snake you may stray from its spine*. |
| Respuesta visual al contacto | Shipped and unchanged — corridor ink inside, `inkDim` outside — with the night row's `ink`/`inkDim` override doing the work (decision 3). |
| Condiciones de error | `resetOnContact: false` on all four. §14 forbids punishing early errors hard, and a snake is a living thing the child is carrying, not a maze wall. |
| Posibilidad de reinicio | The existing retry path; the arrangement is discarded with the attempt and re-scattered deterministically. |
| Animación de ayuda | `demo: true` on `snake1` only (decision 5). |
| Criterio de finalización | All three snakes traced within tolerance **and**, from `snake2` on, the arrangement correct — the conjunction, which is `guided-trace-mode`'s modification. |
| Transición narrativa | `AdventureIntro` on `snake1` and the map's animal-keyed closing, both shipped by pasos B and D. **No `closingBeat`** — see below. |

**No `closingBeat`.** The arena recovers an animal, so `mapBubble`'s
animal-keyed branch already carries §5 item 6: the víbora stands in the
sector and the Pulpito's line closes it, exactly as the duck, the sheep and
the llama do, none of which carries a `closingBeat`. The closing *screen*
was built for a once-per-story transformation and spending it on a fourth
routine recovery would cheapen the one that matters.

### 7. `ZooAnimalId` is widened, and the sector opens off the night

`AdventureSubject` lets an adventure either recover an `animal:
ZooAnimalId` or carry an `icon: ArtImage`. `ZooAnimalId` has no `'vibora'`.

**Position: widen it.** `docs/12` says a completed sector puts the
recovered animal on the map, and `assets.ts:48-51` already documents
`ZooAnimalId` as *"a superset of `AnimalId` … every animal the ZOO can
stand"* — `oveja` and `llama` were added by exactly this move. The `icon`
route exists for the entrance and the night sector, which recover **no**
animal; the arena recovers one. Taking `icon` here would make the arena's
map read like the entrance's, and would leave `arena.animals` empty forever.

So: `ZooAnimalId | 'vibora'`, `ZOO_ANIMAL_ART.vibora =
SECTOR_ADVENTURE_ART.snakeMedium` (the middle snake — the one a child would
draw if asked to draw "a snake"), and `arena.animals` gains one placement
with `appearsWhen: ['snake4']`.

| Sector | `unlockedWhen` | Backpack item |
|---|---|---|
| `arena` | `isFiled(records, 'night4')` — the ladder's new last rung | **`carrito`** (`carrito.png`, in `art-source/`, unwired) on `snake4` |

The ladder becomes entrada (always) → estanque ← `sand4` → montañas ←
`duck-trail4` → nocturna ← `llama-peak4` → **arena ← `night4`**.

The cart is the tool for *"llevarla a un lugar adecuado"* — the row's own
verb. `artManifest.test.ts` requires a `SINGLES` row, a registry entry and a
consumer in the same change; all three land here.

### 8. No migration, and this reverses the obvious assumption

`isUnlocked` is positional (`LevelProgressStore.ts:123-129`), and
`snake1..4` do insert ahead of every phase-2 id. Three migrations exist
precisely for this. **This change needs none**, for two independently
sufficient reasons:

1. `isUnlocked`'s **only remaining consumer is `LevelMap.tsx:81`, the dev
   chrome** — the same reading paso D's amendment A4 already ratified. The
   zoo map routes through `nextAdventure`/`isFiled` and never asks.
2. **Paso C is the precedent**: it inserted eight ids ahead of all of phase
   2 with no migration at all, and there is no `migrateSheep.ts`.

And `arena.unlockedWhen` moves from `alwaysClosed` to a real rule, which
only ever **widens** access — the opposite of paso D, where `estanque`
stopped being `alwaysOpen` and a returning child would have *lost* the pond.
`migrateEntrance.ts` is untouched. Stated as a success criterion so a later
reader does not "restore" a migration nobody needs.

## Art pipeline work

| Item | State | Work |
|---|---|---|
| `sector-snake-{small,medium,large}.png` | **built and registered, consumed by nobody** | Spine + median-thickness + luma-extremes sampling into `manifest.json`. No new pixels. |
| `fondo arena.png` → `sector-sand-background.png` | built, registered, `corridorRows {51, 973}`, `quiet`/`brightest` already measured | Reused as-is under the `snake` row. The quiet band (source rows 204–824) is what the three snakes lie on; confirm it covers the stacked envelope. |
| `carrito.png` | in `art-source/`, unwired | `SINGLES` row, `AUTHORED_SOURCE_SIZES` entry, registry entry, consumed as the arena's backpack item. |
| `escoba.png`, `cartel.png`, `mapa.png`, `sombrero.png`, `nube.png`, `alga.png` | in `art-source/`, unwired | **Not touched.** No consumer in this row. |
| `erizo.png`, `erizo enroscado.png` | in `art-source/`, unwired | **Not touched** — paso H's. |

## Tests that must change, and why

| Test | Change | Why |
|---|---|---|
| `catalog.test.ts` `EXPECTED_IDS` | +4 ids after `night4` | order-sensitive `.toEqual` |
| `catalog.test.ts:528` phase-1 guard | **no edit, and it must stay green** | decision 1 — the union of three stacked centrelines clears it honestly |
| `catalog.test.ts` | **new** family invariants | decision 5's monotonicity, the three-path rule, `demo`/`arrange` exclusivity |
| `paths.test.ts` | **new** | `snakeSpine` emits only absolute `M`/`L`/`C`; amplitude never overshoots; composes with `transformPath` |
| `artCorridor.test.ts` | **new** | the manifest spine lies within N units of the generated centreline, through the shared placement function |
| `arrange.test.ts` | **new** | grab/drop/ordering, reference stability, idempotence, out-of-bounds drops |
| `backdrops.test.ts` | **new rows + three red tests** | decision 3 |
| `sectors.test.ts` | **amended** | it asserts the undeveloped sectors stay fogged for any input; `arena` stops being one |
| `adventures.test.ts`, `backpack.test.ts` | **amended** | one adventure row, one item, one recovered animal |
| `TraceCanvas.test.tsx:145,163` | **no edit, and they must stay green** | the `url(#)` guards are the point |
| `artManifest.test.ts`, `artHierarchy.test.ts` | follow | one new PNG and four new manifest fields |

## Affected areas

| Area | Impact | What changes |
|---|---|---|
| `client/src/levels/paths.ts` | Modified | `snakeSpine` generator |
| `client/src/levels/artCorridor.ts` | New | placement + manifest spine resolution, pure |
| `client/src/levels/arrange.ts` | New | the arrange fold, pure |
| `client/src/levels/types.ts` | Modified | optional `arrange?` field |
| `client/src/levels/catalog.ts` | Modified | 4 entries, appended after `night4` |
| `client/src/canvas/useDragInput.ts` | New | the pointer sibling |
| `client/src/canvas/ArrangeLayer.tsx` | New | draggable `<image>`s, no fragment reference |
| `client/src/canvas/ArtCorridorLayer.tsx` | New | the snake cutouts under the ink |
| `client/src/canvas/TraceCanvas.tsx` | Modified | two layers, props |
| `client/src/screen/LevelPlay.tsx` | Modified | arrange→trace phase gate, completion conjunction |
| `client/src/zoo/adventures.ts` | Modified | one `snake` row, `AdventureId` widened |
| `client/src/zoo/sectors.ts` | Modified | `arena` unlock, animals, adventureIds |
| `client/src/zoo/backdrops.ts` | Modified | the `snake` row, `corridorArt` field |
| `client/src/zoo/backpack.ts` | Modified | the cart |
| `client/src/detective/assets.ts` | Modified | `ZooAnimalId` + `'vibora'`, the cart |
| `scripts/art/build_art.py` + `manifest.json` | Modified | spine/thickness/luma sampling, one `SINGLES` row |
| `docs/13_AVENTURAS_POR_ANIMAL.md` | Modified | §4 status row for *Víboras* |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| **The generated centreline drifts from the drawn body** and the child is scored against a spine the picture does not follow. The worst failure available to this change, and invisible to any test that only reads TypeScript. | **High** | Decision 2: the spine is sampled into `manifest.json`, and one shared placement function is what both the renderer and the test call. Fix the sampling as **task one**, before any level geometry is frozen. |
| **Three stacked snakes do not fit the 480-unit drawable band** once real thickness and swing are placed. | Med | The measured envelope is ≈447 units at a 760-unit span, so it fits with ~33 to spare. The knob is horizontal span; the fallback is two snakes per level plus a fourth path, which still clears the guard. Named lever, not taken: drop to two snakes and accept a shorter span guard margin. |
| **`TORCH_CHALK` on sand reads as chalk on a beach.** The law forces a light ink here just as it forced dark paint in paso D, and paso D's own §4 decision 6 records that the aesthetic consequence was left for the author. | **High, by design** | The literal is one token in `backdrops.ts`. The law's arithmetic is in decision 3's table and the three red tests, so the constraint is legible to the author rather than presented as a taste call. Flagged as question 3. |
| The drag mechanic is built for three levels and never reused. | Med | True today; `docs/13` §2's carry is the only other caller in sight. The fold is ~120 lines of pure code and the input hook is a sibling that changes nothing existing, so the cost is bounded and the blast radius is zero. |
| Two demands in one attempt — order correctly, then trace precisely — overloads a six-year-old. | Med | `snake1` carries no arrangement at all (§5 item 3), and the arrangement is checked before tracing opens rather than scored together. Flagged as question 1. |
| A `<pattern>` or `<clipPath>` sneaks in to clip the snake to its corridor. | Med | The snake is one `<image href>`, which `docs/09` §3 explicitly exempts. Six shipped guard tests; none relaxed. |
| ~2,400 authored lines against an 800-line budget. | **Certain** | `size:exception` accepted up front at session start. Six slices proposed below; `sdd-tasks` owns the binding call. |
| Dragging cannot be verified in this harness (node, no jsdom, no testing-library). | **Certain** | Every decision is an exported pure function (decision 4), so the *logic* is fully covered; the *gesture* is a device check for the capture pass, the same boundary paso D accepted for tile frame rate. |

## Estimated size against the 800-line budget

| Area | Authored lines |
|---|---|
| `paths.ts` `snakeSpine` + tests | 180 |
| `artCorridor.ts` + tests | 220 |
| `arrange.ts` + tests | 300 |
| `useDragInput.ts` + tests | 190 |
| `ArrangeLayer.tsx` + `ArtCorridorLayer.tsx` + tests | 280 |
| `TraceCanvas.tsx` wiring | 90 |
| `LevelPlay.tsx` phase gate + tests | 180 |
| `types.ts` field | 40 |
| `catalog.ts` — 4 entries | 140 |
| `catalog.test.ts` — ids + family invariants | 110 |
| `zoo/backdrops.ts` + test (incl. 3 red tests) | 150 |
| `zoo/adventures.ts` + `sectors.ts` + `backpack.ts` + tests | 220 |
| `detective/assets.ts` | 40 |
| `build_art.py` + manifest + `artManifest.test.ts` | 220 |
| Docs + misc | 15 |
| **Code total** | **~2,375** |

SDD artifacts add roughly **1,300** more (proposal ~520, spec deltas ~250,
design ~350, tasks ~230, verify ~100), so about **3,700 total**.

**Decision needed before apply: Yes. Chained PRs recommended: Yes.
800-line budget risk: High.** `size:exception` was accepted at session
start, up front, so this is a note and not a blocker.

**The seam** — six slices, each green on its own, in dependency order:

| Slice | Contents | ~Lines |
|---|---|---|
| E1 | Measurement: spine/thickness/luma sampling in `build_art.py`, manifest fields, the cart's `SINGLES` row, manifest tests | 300 |
| E2 | The art corridor: `snakeSpine`, `artCorridor.ts`, the coincidence assertion | 400 |
| E3 | The arrange mechanic: `arrange.ts`, `useDragInput.ts`, the `arrange?` field | 530 |
| E4 | Render: `ArtCorridorLayer`, `ArrangeLayer`, `TraceCanvas` wiring, `LevelPlay` phase gate | 550 |
| E5 | The four levels and the catalog invariants | 250 |
| E6 | Zoo registries: backdrop row + luma law, adventure, sector, animal, backpack | 350 |

## Rollback plan

Required by `openspec/config.yaml` `rules.proposal`. This change is
**cheaper to revert than rows C or D**, because it appends rather than
inserts ahead of live ids, runs no migration and bumps no store version.

1. **Whole change.** `git revert` the merge, or reset
   `sdd/viboras-en-la-arena` to `main`. No storage key is renamed, no store
   version is bumped and no migration ran, so every child's progress is
   intact and records earned on `snake1..4` become unreachable keys — the
   same state `f1-travesia`'s already occupy.
2. **Sector only.** Restore `arena.unlockedWhen: alwaysClosed`, empty its
   `adventureIds` and `animals`, drop the backpack row. The four levels stay
   in the catalog, reachable by `?nivel=` deep link — which is how they will
   be reviewed anyway.
3. **Arrange mechanic only.** Drop the optional `arrange` field from
   `snake2..4`. It is additive and absent everywhere else, so the three
   levels degrade to plain traces of the same three snakes rather than
   crashing. `useDragInput` and `ArrangeLayer` become dead and delete
   cleanly.
4. **Art corridor only.** Drop `corridorArt` from the `snake` backdrop row
   and give it a `channel`; the levels degrade to a painted band **under**
   the snakes. The stronger law in decision 3 reverts to the shipped
   single assertion. This is a real visual regression, not a crash.
5. **Ink only.** Remove the snake row's `ink`/`inkDim`. The levels revert to
   `INK_COLOR`, which fails the 55-luma law over the spots — so this branch
   is reversible only alongside step 4.
6. **Measurement only.** Delete the manifest's spine fields and the
   coincidence assertion. The generator still draws; the proof that it
   matches the picture is what is lost, which is why it is last.

## Dependencies

Pasos A–D are all on `main` (**69 test files / 1436 tests green**,
`npm run build` green). Every asset this row needs is already built
(`sector-snake-*.png`, `sector-sand-background.png`) or already sitting in
`art-source/` (`carrito.png`). **No new art is commissioned.**
`AdventureIntro`, `AdventureClosing`, `ADVENTURE_BACKDROP`, `backpack.ts`
and the unlock ladder are all shipped seams this row plugs into.

## Success criteria

- [ ] Each snake cutout's spine, median thickness and luma extremes are
      sampled into `manifest.json` by `build_art.py`; every literal in
      `backdrops.ts` is hand-copied from the rebuilt manifest, not from this
      proposal.
- [ ] Every sampled spine point lies within the asserted tolerance of the
      generated centreline, through the **one** placement function the
      renderer itself calls.
- [ ] The three restated luma assertions pass and the **three red
      falsifiability tests stay red-by-assertion**: dark ink vs. the spots
      (14), paper vs. sand (42.8), chalk vs. the eye whites (6).
- [ ] No alpha sampling, no `<canvas>`, no `getImageData` anywhere in the
      diff.
- [ ] **No `<mask>`, `<pattern>`, `<clipPath>`, `<defs>`, `useId` or any
      `url(#…)` anywhere in the diff**, and every shipped guard test stays
      green untouched.
- [ ] `catalog.test.ts:528`'s phase-1 span guard passes for all four snake
      levels **unedited**.
- [ ] Across `snake1..4`: corridor width non-increasing, traced arc length
      non-decreasing, exactly three centrelines each, `arrange` absent only
      on `snake1`, `demo` present only on `snake1`.
- [ ] `useTraceInput.ts` is byte-identical to `main`; the arrange phase
      gates it through the existing `enabled` option.
- [ ] Every arrange and placement decision is an exported pure function with
      node-only tests; none lives inside a pointer handler.
- [ ] **No new migration**, and `migrateEntrance.ts` is byte-identical.
- [ ] Finishing `night4` opens the arena; finishing `snake4` stands the
      víbora in the arena and puts the cart in the backpack.
- [ ] `f1-libre`, the glass/sand/duck/sheep/llama/night levels, `trail1..4`,
      the medusa, `cases.ts`, `Deduction.tsx`, `AdventureIntro` and
      `AdventureClosing` are byte-identical to `main`.
- [ ] **Baseline held**: ≥ 69 test files / ≥ 1436 tests green,
      `npm run build` green.
- [ ] **Captures** into `capturas/`: each of the four levels, untraced and
      part-traced; `snake2` mid-drag and correctly arranged; the arena
      before and after; the map with the víbora standing; the backpack with
      four items; one night and one llama level proving they are unchanged.

## Proposal question round

SDD ran in `auto` mode, so these could not be asked live. They are product
questions, not harness ones, and each states the working assumption the
change proceeds on unless corrected.

1. **Does ordering belong inside the trace levels, or as its own level?**
   `docs/13` §2 says *"primero el chico las ordena … después recorre"*,
   which reads as two acts, but §2's own four-step internal progression is
   entirely about the trace. *Assumption: the arrangement is a short first
   phase inside `snake2..4`, and `snake1` has none at all — so the adventure
   still opens on the widest, most accessible single demand (§5 item 3).
   The alternative — `snake1` as a pure seriation level with no tracing —
   would make the drag its own beat but would break §5's "dos o más
   variaciones que mantienen el mismo patrón".*
2. **Where is *"un lugar adecuado dentro de su sector"*?** *Assumption:
   three hollows in the sand, sized to the three snakes, so the destination
   itself teaches the size comparison. Explicitly not a jar, per §2.*
3. **The child's line on a snake is chalk-white.** The 55-luma law leaves
   no dark ink admissible over the author's own black spots — the same
   corner paso D hit with the white vaho, in the opposite direction.
   *Assumption: `TORCH_CHALK`, already shipped for the night. The
   aesthetic consequence is real and is the author's call: the alternative
   is repainting the spots in the source art so a dark ink becomes legal.*
4. **The víbora joins the zoo's animals.** *Assumption: `ZooAnimalId` is
   widened and the middle snake stands in the arena once `snake4` is filed
   — the directive-faithful reading of `docs/12`. The alternative, the
   `icon` route, would leave the arena permanently animal-less like the
   entrance.*
5. **The arena grants the cart.** *Assumption: `carrito.png`, unwired in
   `art-source/`, because the row's own verb is "llevar". Named
   alternatives already drawn and unclaimed: `sombrero.png` (the sun over
   the sand — but a second hat beside the andean one reads as a duplicate),
   `escoba.png`, `cartel.png`, `mapa.png`.*
