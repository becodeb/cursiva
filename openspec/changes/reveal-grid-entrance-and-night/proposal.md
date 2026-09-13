# Proposal: The reveal grid — entrance and night sector

Scope is `docs/13_AVENTURAS_POR_ANIMAL.md` §8 **row D, and only row D**:
*"Entrada: vidrio empañado y arena; intro y transformación en detective;
zona nocturna con linterna"*, mechanic *"Grilla de revelado"*.

## Intent

Rows B and C built two adventures out of the same sentence the engine
already spoke: a route, a corridor, a score for staying inside it. Row D is
the first one whose movement **has no route at all**, and it is also the row
that owes the app its opening.

- **The mechanic does not exist.** `docs/13` §4: *"superficie tapada por una
  grilla de piezas que se borran al tocarlas. Sin `mask` ni `clipPath` (veda
  de `url(#)`). La linterna es la misma grilla con opacidad por distancia al
  dedo, sin persistir."* Nothing in the repo draws a covering layer, and the
  only "which cells did the finger touch" code that exists — `coverageScore`
  (`levels/coverage.ts:45`) — is release-time scoring on a 12×8 grid with no
  render side at all.
- **`kind: 'free'` exists but is a warm-up, not a place.** `f1-libre`
  (`catalog.ts:182`) is the single free level, and `catalog.test.ts:253`
  asserts exactly that: `free.map(l => l.id)).toEqual(['f1-libre'])` and
  `LEVELS[0].id === 'f1-libre'`. Row D adds twelve more free levels, so that
  assertion is the first shipped rule this change has to renegotiate rather
  than inherit.
- **The app has no opening.** `docs/12` §1 describes it exactly — the
  caretaker finds the fogged glass, the child helps clean it, together they
  discover the animals are gone, the camera pulls back to the map — and
  none of it is built. `AdventureIntro` (paso B) can carry the entry beat;
  there is **no closing component at all**. `docs/13` §5 item 6 asks for one
  and `mapBubble` is not it: a line in a map bubble cannot carry a once-per-
  story transformation.
- **The ladder and the backpack are placeholders left for this row.**
  `sectors.ts:116` annotates `alwaysOpen` *"Deleted in paso D, not a rule"*;
  `sectors.ts:441` annotates `recentlyDiscovered` as paso D's other
  replacement; `backpack.ts` carries one row and `docs/13` §8 says *"qué
  objeto da cada sector se define en el paso D"*.
- **Two shipped assets are unreachable.** `sector-flashlight.png`
  (`assets.ts:289`) is built, registered and consumed by nobody;
  `sector-aquarium-background.png` and `sector-sand-background.png` are
  built with `corridor_rows = None`, so neither has ever been measured.

## Scope

### In scope

1. **The reveal grid**, as one pure mechanic with two modes: an *erase*
   mode whose tiles stay gone, and a *light* mode whose tiles take opacity
   from the finger's distance and persist nothing.
2. **Three adventures, four levels each, twelve new phase-1 levels**:
   `glass` (fogged glass over `fondo pecera.png`), `sand` (sweeping over
   `fondo arena.png`), both in the `entrada`; `night` (flashlight) in
   `nocturna`.
3. **The narrative opening and the transformation into detective**: the
   entrance's `AdventureIntro` entry, plus a new `AdventureClosing` screen
   and the `close` route that finally gives `docs/13` §5 item 6 a home.
4. **A night backdrop derived from `fondo bosque.png`** by a new auditable
   function in `scripts/art/build_art.py`, built so the authored
   `fondo nocturno.png` replaces it with one table row and one deletion.
5. **The unlock ladder**: every sector's `unlockedWhen` stated as a real
   rule, `alwaysOpen` deleted, `recentlyDiscovered` given a real answer.
6. **The backpack mapping per sector**, for the two sectors this row owns.
7. **A screenshot seeding flag grammar** that scales past one boolean per
   capture.
8. `carrier-lens.png` and `sector-flashlight.png` reaching a consumer.

### Out of scope (explicitly unchanged)

Rows E–H (snakes, bees, dolphins, hedgehog — the `arena` and `bosque`
sectors stay fogged and adventure-less) and the snail; the paused
three-option deduction (`cases.ts`, `Deduction.tsx`, `ClueKind`, `AnimalId`
— `docs/13` §4 decision 1); the duck, sheep, llama and medusa levels and
their backdrops; `trail1..4`; `f1-libre` itself, which stays the catalog's
first level and keeps its exact config; letters; any level id rename; the
`docs/09` §3 `url(#)` ban, which this change is built around rather than
against; scattered ground in any existing level; `docs/*` beyond `docs/13`
§4's status row.

## Capabilities

### New capabilities

- `reveal-grid`: a covering layer of independent tiles over a level's
  backdrop, its two persistence modes, its completion criteria, and the
  `url(#)`-free render contract it must satisfy.

### Modified capabilities

- `level-engine`: an optional `reveal` field on `LevelConfig`; `kind:
  'free'` stops meaning "the warm-up" and starts meaning "no route";
  twelve authored levels and their progressions as invariants.
- `free-trace-mode`: the free level's completion criterion generalizes from
  a fixed 12×8 coverage grid to the level's own grid resolution.
- `trace-canvas`: a reveal layer between the backdrop and the ink, drawn as
  plain `<rect>`s with no fragment reference.
- `zoo-map`: the unlock ladder; `recentlyDiscovered` derived rather than
  constant; the backpack's second and third items; adventures that recover
  no animal.
- `main-screen`: a `close` `GameView` variant and `resolveCloseAction`,
  mirroring paso B's `intro`/`resolveEnterAction`.
- `progress-store`: a positional-unlock migration for twelve inserted ids.

## The decisions

### 1. The reveal grid is `kind: 'free'` PLUS an optional field, not a third `LevelKind`

**Position adopted: `kind: 'free'` plus an optional `reveal?: RevealConfig`.**

A third member of `LevelKind` looks cleaner and is not. Five production
sites branch on `kind` today — `buildLevel.ts:167` (empty target),
`evaluateLevel.ts:115` (coverage instead of accuracy),
`LevelPlay.tsx:546` (*"Empezá donde quieras"*), `LevelPlay.tsx:772`
(`resetOnContact` forced off), `LevelPlay.tsx:1046` (no goal marker) — and
a reveal level wants **every one of those behaviours unchanged**. A
`'reveal'` member would inherit none of them: each site says
`kind === 'free'` or `kind === 'path'`, so all five would have to be
rewritten into `kind !== 'path'`, plus `catalog.test.ts:559` and
`:575` and `buildLevel.test.ts:193`. That is eight edits to widen a union
whose only purpose would be to say something the existing member already
says.

The optional field is the repo's own established shape: `clue`,
`detectiveWorld`, `goalArt`, `hazardArt`, `vertexArt` are all optional,
additive, absent on every pre-existing level, and — in `detectiveWorld`'s
own words (`types.ts:143`) — *"can only WIDEN … never narrow"*. `reveal`
follows it exactly.

**The one thing it costs, stated plainly.** `catalog.test.ts:253`
(*"has exactly one free level, and it is the very first thing the child
does"*) goes red, because thirteen levels will be `kind: 'free'`. That
assertion is two claims welded together, and only one of them survives:
`LEVELS[0].id === 'f1-libre'` stays true and stays asserted; *"exactly
one"* becomes *"exactly one free level with no `reveal`, and it is
`LEVELS[0]`"*. The test is amended and its header rewritten to say why —
not deleted, and not weakened into vacuity.

### 2. One mechanic, two modes, and the difference is one boolean in the state fold

The grid is the same in both: `cols × rows` tiles over the drawable band,
each a plain `<rect>` with its own `opacity`, indexed `row * cols + col` —
the identical convention `coverageScore` already uses (`coverage.ts:59`),
deliberately, so a tile index and a coverage cell index are the same kind
of number.

| | `erase` (glass, sand) | `light` (night) |
|---|---|---|
| Tile opacity | `1` until touched, then `0` | `f(distance to the live point)`, recomputed every frame |
| Persistence | Permanent for the attempt; a touched tile never returns | None — the previous frame's opacities are not kept |
| What state lives | A `Set<number>` of cleared tiles, folded forward | The single current point |
| Completion | Cleared fraction ≥ the level's threshold | Every hidden object has been lit at least once |
| Restart | Clearing the set is the whole reset | Nothing to reset |
| Pedagogy (`docs/13` §2) | *exploración amplia → cubrir zonas más extensas* | *búsqueda más intencional* |

Both are one pure function of `(points, grid)` in `levels/revealGrid.ts`,
called from **the existing `onFrame` channel** (`TraceCanvas.tsx:437`),
which `clueTick` and `contactTick` already share
(`LevelPlay.tsx:955,981`). `docs/02` §7.2 forbids a second point-cloud
scan and this change does not open one.

The light mode's **latch** is the seam between the two: a lit object stays
found even though the light that found it does not stay. That is what
turns *"sin persistir"* into a level that can be completed, and it is why
the night sector's criterion is objects rather than coverage — a
non-persistent grid can never accumulate a coverage figure.

### 3. The completion criterion, and its exact relationship to `coverageScore`

`coverageScore(strokes, viewBoxWidth)` already answers *"how much of the
sheet did the finger reach"* on a 12×8 grid, feeds the `accuracy` pillar
for free levels, and is gated by `rules.minAccuracy`. **The reveal grid's
erase mode is that same question at a different resolution**, so the
honest move is to generalize, not to duplicate:

```
coverageScore(strokes, viewBoxWidth, cols = COVERAGE_COLUMNS, rows = COVERAGE_ROWS)
```

Defaulted, so `f1-libre` is bit-identical. A reveal level passes its own
`reveal.cols`/`reveal.rows` and its cleared percentage IS its `accuracy`.
One number, one pillar, one threshold — `rules.minAccuracy` needs no new
sibling, and `evaluateLevel`'s free branch is untouched except for the two
forwarded arguments.

**The live set and the release-time score must not be two sources of
truth.** The live render folds `onFrame` samples; `evaluateLevel` folds the
finished strokes. They can disagree (different sampling densities). The
rule adopted: **one exported pure function, two call sites** — incremental
during play, whole-stroke at release — with `coverage.ts`'s own half-cell
interpolation (`coverage.ts:53`, *"a fast swipe reports few points far
apart"*) applied in both. Design owns the exact signature; the proposal
fixes the invariant:

> For any stroke set, folding it incrementally and folding it at once
> produce the same cleared set. Asserted in `revealGrid.test.ts`.

One thing the grid needs that coverage does not: a **finger radius**. A
tile clears when the sample lands within `reveal.radius` of it, not only
when it lands inside it — a one-cell-wide wipe reads as a scratch, not as
a cleaned pane. This widens the cleared set relative to a pure coverage
fold, so the invariant above is stated over the reveal fold, and the
threshold is calibrated against it rather than against `f1-libre`'s.

### 4. `docs/13` §6 / `docs/14` §14, item by item — three of nine are new

| §6 obligation | Expressible today? |
|---|---|
| Zona de inicio | **Yes.** `standingHintFor` already answers a routeless level with *"Empezá donde quieras"* (`LevelPlay.tsx:546`). |
| Trayectoria esperada | **No — and deliberately absent.** The movement has no expected trajectory; what replaces it is *area to cover*, which is exactly what `reveal.cols/rows/threshold` express. This is the field's reason to exist. |
| Tolerancia del camino | **No.** `corridorWidth` is meaningless with no corridor. Its analogue is `reveal.radius` and the tile size: tolerance starts generous (big tiles, wide radius) and tightens across the four levels, which is `docs/14` §14's rule restated for a routeless task. |
| Respuesta visual al contacto | **No.** Nothing renders a covering layer. This is the new `trace-canvas` layer. |
| Condiciones de error | **Yes — there are none, by construction.** `resetOnContact` is already forced off for a routeless level (`LevelPlay.tsx:772`), and `docs/14` §14 asks that early errors not be punished. A reveal level has no wall to touch. |
| Posibilidad de reinicio | **Yes.** The existing retry path; the erase set is discarded with the attempt. |
| Animación de ayuda | **Yes, and not used.** `demo` animates a *route*; a routeless level has none to animate. Decision: **no `demo` on any of the twelve.** The mechanic demonstrates itself on the first touch, which is `docs/13` §2's own *"relación acción-consecuencia"*. |
| Criterio de finalización | **Yes after §3's generalization** (erase) and **new** (the light mode's object latch). |
| Transición narrativa | **No — `docs/13` §6 says so itself.** Paso B built the entry half; this row builds the closing half (decision 6). |

### 5. The twelve levels, mapped onto `docs/13` §2 and §5

`docs/13` §2 gives three steps (*exploración amplia → cubrir zonas más
extensas → búsqueda más intencional*) and §5 demands a first wide
accessible challenge plus two or more variations. Four levels per
adventure, matching every shipped adventure.

| Adventure | Level | §2 step | What moves |
|---|---|---|---|
| `glass` (entrada, `fondo pecera.png`) | `glass1` | amplia | Few big tiles, generous radius, low threshold. Any honest sweep finishes it. |
| | `glass2` | amplia | Same tiles, threshold raised — the whole pane, not a porthole. |
| | `glass3` | zonas más extensas | Finer grid, same radius: the same gesture now has to travel further. |
| | `glass4` | zonas más extensas | Finer grid and a tighter radius: tolerance's first real reduction. |
| `sand` (entrada, `fondo arena.png`) | `sand1..4` | the same three steps, restated on a second surface | The movement is identical and the surface is not, which is `docs/13` §2's own *"La misma lógica puede trasladarse a arena, barro, oscuridad"*. `sand1` restarts wide on purpose: a new surface is a new first challenge. |
| `night` (nocturna, derived backdrop) | `night1` | intencional | One large object, in the open, big light radius. |
| | `night2` | intencional | Two objects, further apart. |
| | `night3` | intencional | Three objects; light radius reduced. |
| | `night4` | intencional | Three objects, smallest radius — the most intentional search in the row. |

Invariant the catalog test asserts, in the spirit of paso C's family
invariants:

> Within each adventure, the cleared-area demand is non-decreasing and the
> reveal radius is non-increasing, step by step. `sand1`'s radius is not
> required to be ≤ `glass4`'s — a new surface restarts wide (§5 item 3) —
> but `night`'s is, because the night sector follows both.

### 6. The opening, the transformation, and the closing screen this row finally builds

**The entry rides a seam that already exists.** `resolveEnterAction`
(`GameScreen.tsx:193`) returns `{view:'intro'}` for `levelIds[0]` of any
registered adventure, generically, and `main-screen`'s shipped requirement
already says so. `glass1` gets the caretaker's line and needs **no new
routing at all**.

**The transformation needs a screen, and paso D builds it.** `docs/13` §5
item 6 has been mechanism-free since paso B: `mapBubble` surfaces
`Adventure.closing` as a line on the map, which is a label, not a beat.
The camera pulling back from a cleaned pane to a fogged zoo is the single
most important story moment in the app and it cannot be a bubble caption.

- `screen/AdventureClosing.tsx`, the mirror of `AdventureIntro`: same
  full-screen stage, same `CaptionedArt`, same speech bubble, props
  `{ adventure, onContinue }`. Not a generalization of `AdventureIntro` —
  two ~110-line components that share a stage read better than one with a
  mode flag, and `AdventureIntro` stays byte-identical.
- `GameView` gains `'close'`; `resolveCloseAction(finishedLevelId, records)`
  is exported and pure, called from the same place `resolveNextAction` is,
  and returns the close view when the finished level is an adventure's last
  and that adventure has a closing beat. `nextView`'s reducer switch stays
  unaffected — the exact contract `'intro'` and `'deduce'` already hold to.
- **Where the state lives: nowhere new.** The closing is reached by
  *finishing the last level*, so it is a function of the transition, not of
  a persisted flag. Replaying `sand4` replays the closing, exactly as
  re-entering `glass1` replays the intro. Accepted deliberately: a new
  persisted key means a new store version and a second migration in one
  change, to suppress a beat a child would have to deliberately re-enter.

**`Adventure.animal` becomes optional.** Today it is required and
`mapBubble` (`adventures.ts:97`) decides a sector's line by checking
whether that animal is standing in the zoo. The entrance and the night
sector recover **no animal** — the erizo arrives in paso H — so an
animal-keyed closing cannot express them. `animal?: ZooAnimalId`; when it
is absent the closing is keyed on the adventure's own last level being
filed. This is a real modification of shipped behaviour, and it is the one
place this change reaches into paso A/B code rather than beside it.

### 7. The unlock ladder and the backpack — product decisions, not derivations

Flagged as assumed product decisions the author has not ratified, the
precedent paso C set with its own question round.

| Sector | `unlockedWhen` | Backpack item on completion |
|---|---|---|
| `entrada` | **always open** — it is the intro; `alwaysOpen` moves here from the estanque and is then deleted as a named helper | **`lupa`** (`carrier-lens.png`, shipped) — `docs/13` §8's own example, earned on `sand4` |
| `estanque` | `isFiled(records, 'sand4')` — the entrance hands the map over | *deferred*: no art exists; no row added |
| `montanas` | `isFiled(records, 'duck-trail4')` — **unchanged, shipped in paso C** | `gorro andino` — **unchanged, shipped** |
| `nocturna` | `isFiled(records, 'llama-peak4')` — opens once the mountains close | **`linterna`** (`sector-flashlight.png`, shipped and unconsumed) earned on `night4` |
| `arena` | `alwaysClosed` — **unchanged**, paso E owns it | — |
| `bosque` | `alwaysClosed` — **unchanged**, paso F owns it | — |
| `sendero` | scenery, no `hit` — **unchanged** | — |

Two consequences worth naming. The estanque **stops being open on a fresh
install**, which is the whole point of building an entrance, and it means
the first thing a new child ever sees is a map with one sector clear.
And the flashlight is granted *by* the sector that teaches it, not
required to enter it — the light in `night1..4` is the mechanic, the
backpack item is the souvenir.

**`recentlyDiscovered` is derived, not persisted.** `sectors.ts:441`
proposes a `<sector>-seen` key; this change declines it. A new persisted
key means a store version bump and a second migration in a change that
already carries one. The derived rule — *the first open sector none of
whose adventures has ever been attempted* — needs no new storage, reads
off `attempts` the store already keeps, and is honest about what "recently
discovered" means to a child: the place they have not gone yet.

### 8. The night backdrop is derived, and the derivation is built to be deleted

`fondo nocturno.png` does not exist and the author has confirmed it is
coming. Until then, `nightfall()` joins `mute()` / `recolour()` /
`recontour()` as a fourth auditable transform in `build_art.py`, deriving
`sector-night-background.png` from `fondo bosque.png`.

**The swap must be one row and one deletion, and the shape of
`PASSTHROUGHS` is what makes that true.** Rows are 5-tuples today
(`build_art.py:406`); this change adds an **optional sixth element**, a
transform callable. Swapping in the authored art is then literally:

```
('fondo bosque.png',   'sector-night-background.png', 1536, 1024, (T,B), nightfall)
→
('fondo nocturno.png', 'sector-night-background.png', 1536, 1024, (T,B))
```

…plus deleting `nightfall` itself. A docblock at the derivation site says
exactly this, names the row, and states the one thing the replacement must
still satisfy (below). No consumer, no registry entry, no test and no
level config mentions `bosque` — they all name the built file.

**The derivation carries one hard constraint, and it is not cosmetic.**
`docs/09` §4's 55-luma law (`backdrops.test.ts:17`,
`MIN_BACKDROP_CONTRAST = 55`) applies to every backdrop registry row. For
a routeless level the thing that must be legible is not a corridor but the
**difference between covered and uncovered**, so the law is restated — not
weakened — as: *the tile paint separates ≥ 55 luma from the backdrop's
sampled `brightest`*. The night tile is darkness, so `nightfall()` must
**cap the derived image's maximum luma** low enough to clear it. That cap
is the derivation's specification, and the authored `fondo nocturno.png`
will be held to the same test when it lands — which is the honest risk of
the swap, named in Risks.

### 9. Inserted, not appended — and the migration question is now a product question

Paso C appended its eight levels and accepted that the dev-only `LevelMap`
would call them locked. Row D cannot: the entrance is the app's **first**
experience and `LEVELS` order is the story order every reader of
`catalog.ts` will assume. The twelve go in as `entrada` (4) before
`f1-libre`, and `night` (4) at the end of phase 1, with `sand` between
`glass` and `f1-libre`.

`isUnlocked` is positional (`LevelProgressStore.ts:123-129`), so inserting
ahead of `f1-libre` demotes every phase-1 level for an existing child —
the exact failure `migratePhase1.ts`, `migrateDuckCase.ts` and
`migrateNivel3.ts` each exist to prevent. **But the exposure has changed
since those were written**: `isUnlocked`'s only remaining consumer is
`LevelMap.tsx:81`, the dev chrome. The zoo map routes through
`nextAdventure`/`isOpen` and never asks.

Position adopted: **write `migrateEntrance.ts`** in the established
copy-forward shape, because the no-demotion rule (D3) is a shipped product
rule and three precedents is a convention. It seeds the twelve new ids for
a child who already has records, which means a returning child **skips the
entrance intro**. That trade — replay the opening, or stay unlocked — is a
product decision, not an engineering one, and it is question 4 below.

### 10. The seeding flag grammar, because one boolean per capture does not scale

`devMode.ts` has two flags and two functions. Row D needs captures of: a
half-cleaned pane, a swept patch of sand, a lit object at a fixed point, an
unlit night, the map with the entrance closed, the map with the entrance
open and the estanque revealed, the map fully unlocked, and the backpack
with two items. That is eight, and `shouldSeedRecoveredDuck`'s shape would
mean eight more booleans.

- `?debug=progreso:<id>,<id>,…` — **dev-gated**, like
  `pato-recuperado`, because it writes real persisted records. One pure
  parser, one test. `?debug=pato-recuperado` stays byte-identical so paso
  B's captures keep working.
- `?debug=revelado:<pct>` and `?debug=linterna:<x>,<y>` — **not
  dev-gated**, for `isSectorDebug`'s own stated reason
  (`devMode.ts:11-19`): they paint render state, add no control, no word
  and no route, and must work against the exact build being screenshotted.
  `revelado` pre-clears a deterministic tile pattern; `linterna` pins the
  light at a viewBox point, because `shot.sh` cannot move a finger.

Flag values stay Spanish to match the two shipped siblings. A URL a human
types alongside `?debug=sectores` is the one place local consistency beats
the English-identifier default, and the functions parsing them are English.

## Art pipeline work

| Item | State | Work |
|---|---|---|
| `fondo pecera.png` → `sector-aquarium-background.png` | built, registered, **`corridor_rows = None`** | Sample the reveal band. **Task one** — the glass tile paint cannot be chosen before `brightest` is known. |
| `fondo arena.png` → `sector-sand-background.png` | built, registered, **`corridor_rows = None`** | Same. **The highest-risk measurement in the change** (Risks). |
| `fondo bosque.png` → `sector-night-background.png` | source built as `sector-forest-background.png` | New `nightfall()` transform, new `PASSTHROUGHS` row, luma cap, band sampled, docblock for the swap. |
| `linterna.png` → `sector-flashlight.png` | built and registered, **consumed by nobody** | Wiring only — becomes the nocturna backpack item. |
| `lupa.png` → `carrier-lens.png` | built and registered | Wiring only — becomes the entrada backpack item. |
| `cofre.png`, `piedra.png`, `hoja.png` | in `art-source/`, **unwired everywhere** | `SINGLES` rows, `AUTHORED_SOURCE_SIZES` entries, registry entries, consumed as the night sector's findable objects. `artManifest.test.ts` requires row, registry and consumer in the same change (`build_art.py:346-350`) — all three land here. |
| `escoba.png`, `alga.png`, `cartel.png`, `nube.png` | in `art-source/`, unwired | **Not touched.** No consumer in this row. |

## Tests that must change, and why

| Test | Change | Why |
|---|---|---|
| `catalog.test.ts:42` `EXPECTED_IDS` | +12 ids, at their real positions | order-sensitive `.toEqual` (`:81`) |
| `catalog.test.ts:253` | **amended**, not deleted | *"exactly one free level"* becomes *"exactly one free level with no `reveal`, and it is `LEVELS[0]`"* (decision 1) |
| `catalog.test.ts:445-470` phase-1 guard | **no edit** | `kind: 'free'` is already exempt (`:459`) and the twelve ride that exemption honestly — they have no path to span anything |
| `catalog.test.ts:559,575` | extend the free branch | twelve more levels with `paths: []` |
| `catalog.test.ts` | **new** family invariants | decision 5's monotonicity, one adventure at a time |
| `revealGrid.test.ts` | **new** | index convention, incremental ≡ whole-stroke fold, radius behaviour, light opacity falloff, object latch |
| `coverage.test.ts` | **new rows** | default arguments reproduce today's 12×8 scores exactly |
| `backdrops.test.ts` | **new rows** | three backdrops against the restated 55-luma law (decision 8) |
| `sectors.test.ts` | **amended** | it asserts the five undeveloped sectors stay fogged for any input; entrada and nocturna stop being two of them |
| `TraceCanvas.test.tsx:145,163` | **no edit, and they must stay green** | the `url(#)` guards are the point |
| `artManifest.test.ts`, `artHierarchy.test.ts` | follow | three new PNGs enter the shipped-art comparison |
| `migrateEntrance.test.ts` | **new** | idempotence, no-demotion, never mutating a source record |

## Affected areas

| Area | Impact | What changes |
|---|---|---|
| `client/src/levels/revealGrid.ts` | New | the mechanic, pure |
| `client/src/levels/types.ts` | Modified | one optional `reveal` field |
| `client/src/levels/coverage.ts` | Modified | `cols`/`rows` parameters, defaulted |
| `client/src/levels/catalog.ts` | Modified | 12 entries, inserted |
| `client/src/canvas/RevealLayer.tsx` | New | plain `<rect>`s, no fragment reference |
| `client/src/canvas/TraceCanvas.tsx` | Modified | one layer between backdrop and ground; two props |
| `client/src/canvas/devMode.ts` | Modified | the flag grammar |
| `client/src/screen/LevelPlay.tsx` | Modified | `onFrame` fold, completion, chrome gates |
| `client/src/screen/AdventureClosing.tsx` | New | the transformation beat |
| `client/src/screen/GameScreen.tsx` | Modified | `close` view, `resolveCloseAction` |
| `client/src/zoo/sectors.ts` | Modified | the ladder; `alwaysOpen` deleted; `recentlyDiscovered` derived |
| `client/src/zoo/adventures.ts` | Modified | 3 rows; `animal` optional; closing keyed off records |
| `client/src/zoo/backdrops.ts` | Modified | 3 rows; tile paint field |
| `client/src/zoo/backpack.ts` | Modified | lupa, linterna |
| `client/src/game/migrateEntrance.ts` | New | positional-unlock copy-forward |
| `client/src/detective/assets.ts` | Modified | three findable objects; night backdrop |
| `scripts/art/build_art.py` + `manifest.json` | Modified | `nightfall()`, rows, two band samplings |
| `docs/13_AVENTURAS_POR_ANIMAL.md` | Modified | §4 status row for *Exploración libre* |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| **Sand on sand cannot clear 55 luma.** The sand level covers `fondo arena.png` with loose sand; a covering paint and a sand backdrop are the same colour family by construction. Nothing about this PNG has been measured. | **High** | Sample it as **task one**, before any tile paint is chosen. If no admissible paint exists, the named fallbacks in order: (a) measure against what is *revealed* — footprints or objects drawn into the backdrop — rather than against the field; (b) a wet/dark sand token, the same move `CHANNEL_STONE` was for the cordillera; (c) commission a darker `fondo arena.png`. Scope lever, not taken: drop `sand` to two levels, or defer it to paso E, which owns the arena sector anyway. |
| The aquarium backdrop is too dark for a fogged-glass white, or too bright. | Med | Same task-one sampling; the tile paint is a per-backdrop field, so the answer is a token, not a broken law. |
| **The authored `fondo nocturno.png` fails the luma cap that `nightfall()` was built to satisfy.** | Med | The cap is stated in the derivation's docblock and asserted by `backdrops.test.ts`, so the failure is loud and immediate on swap day, not silent. The swap stays one row either way. |
| ~2,600 authored lines against an 800-line budget. | **Certain** | `size:exception` accepted at session start. A six-slice seam is proposed below; `sdd-tasks` owns the binding call. |
| The reveal layer reintroduces `url(#)` through a well-meaning `<pattern>` for the tiles. | Med | It is N `<rect>`s, the same "N elements instead of a fill" the `ground` layer (`TraceCanvas.tsx:1011`) already establishes. Six shipped test files guard it; none is relaxed. |
| Tile count hurts frame rate on a real tablet. A 24×16 grid is 384 nodes redrawn per light frame. | Med | The erase mode mutates only touched tiles; the light mode's falloff is clamped to a radius so tiles outside it keep a constant attribute. If measurement says otherwise, the lever is grid resolution, which is authored data per level. **Not verifiable in this harness** (node, no jsdom) — it is a device check for the capture pass. |
| `Adventure.animal` becoming optional breaks a paso A/B behaviour nobody re-reads. | Med | `mapBubble`'s `.filter().at(-1)` contract is asserted; new scenarios cover an animal-less adventure alongside the shipped ones. |
| The migration silently skips the app's opening for existing children. | **High, by design** | Named as question 4 rather than decided. Both branches are one function. |
| Twelve `kind: 'free'` levels make the phase-1 arm guard vacuous for a third of phase 1. | Low | True and acceptable: the guard exists to force *routes* to span the sheet, and these have no route. The reveal grid's own coverage threshold is the arm-work guarantee that replaces it, and decision 5's monotonicity invariant is what asserts it. |

## Estimated size against the 800-line budget

| Area | Authored lines |
|---|---|
| `revealGrid.ts` + test | 320 |
| `types.ts` field, `coverage.ts` generalization + tests | 95 |
| `RevealLayer.tsx` + test, `TraceCanvas` wiring | 275 |
| `LevelPlay.tsx` wiring + tests | 150 |
| `catalog.ts` — 12 entries | ~340 |
| `catalog.test.ts` — ids, amended rules, family invariants | 140 |
| `zoo/sectors.ts` + test | 170 |
| `zoo/adventures.ts` + test | 130 |
| `zoo/backdrops.ts` + test | 110 |
| `zoo/backpack.ts` + test | 60 |
| `AdventureClosing.tsx` + test, `GameScreen` routing + test | 330 |
| `migrateEntrance.ts` + test | 200 |
| `devMode.ts` + test | 90 |
| `assets.ts`, `build_art.py`, manifest | 185 |
| Docs + misc | 25 |
| **Code total** | **~2,620** |

SDD artifacts add roughly **1,400** more (proposal ~480, spec deltas ~260,
design ~400, tasks ~280, verify ~120), so about **4,000 total**.

**Decision needed before apply: Yes. Chained PRs recommended: Yes.
800-line budget risk: High.**

**The seam** — six slices, each green on its own, in dependency order:

| Slice | Contents | ~Lines |
|---|---|---|
| D1 | Art: two bands sampled, `nightfall()`, three findable objects, backdrop rows + tile paint + luma tests | 350 |
| D2 | The mechanic: `revealGrid.ts`, the `reveal` field, `coverage.ts` generalized | 415 |
| D3 | Render: `RevealLayer`, `TraceCanvas` layer, `LevelPlay` fold and completion | 425 |
| D4 | The twelve levels, catalog invariants, `migrateEntrance` | 680 |
| D5 | Zoo registries: ladder, adventures, backpack, `recentlyDiscovered` | 420 |
| D6 | Narrative: `AdventureClosing`, `close` routing, the debug flag grammar | 420 |

## Rollback plan

Required by `openspec/config.yaml` `rules.proposal`. This change is riskier
to revert than rows B and C, because it inserts ids and runs a migration.

1. **Whole change.** `git revert` the merge / reset `sdd/entrada-y-linterna`
   to `main`. The migration is copy-forward only — it never deletes or
   mutates a source record — so reverting restores `main` with every
   child's prior progress intact. Records earned on the twelve new ids
   become unreachable keys, exactly as `f1-travesia`'s already are. No
   storage key is renamed and no store version is bumped, which is the
   single property that makes this revert clean, and it is why decision 6
   declines a new persisted key.
2. **Ladder only.** Restore `alwaysOpen` on the estanque and
   `alwaysClosed` on entrada and nocturna, and empty their `adventureIds`.
   The twelve levels stay in the catalog, reachable by `?nivel=` deep link
   — which is how they will be reviewed anyway.
3. **Night sector only.** Drop the `night` adventure row and its backdrop
   row; `nightfall()` and its `PASSTHROUGHS` row become dead and are
   deleted by the same one-row edit the authored-art swap would use.
4. **Closing screen only.** Remove the `'close'` variant and
   `resolveCloseAction`; `resolveNextAction` already exits to the map, so
   the pre-paso-D behaviour returns with one edit. `AdventureIntro` was
   never touched.
5. **Reveal mechanic only.** Drop the optional `reveal` field from the
   twelve configs. It is additive and absent everywhere else, so the levels
   degrade to plain `f1-libre`-style free levels rather than crashing.
6. **Migration only.** Delete `migrateEntrance.ts` and its call. Existing
   children see the dev-only `LevelMap` report phase-1 levels as locked;
   the zoo map, which is the real route, is unaffected.

## Dependencies

Pasos A, B and C are all on `main` (65 test files / 1286 tests green,
`npm run build` green). Every asset this row needs already exists in
`art-source/` or is already built. **No new art is commissioned** — the
night backdrop is derived on purpose, and `fondo nocturno.png` is expected
later as a drop-in replacement.

## Success criteria

- [ ] `corridor_rows` sampled for `fondo pecera.png` and `fondo arena.png`;
      each backdrop's tile paint separates ≥ 55 luma from its own sampled
      `brightest`, asserted, with the sand measurement resolved before any
      level geometry is frozen.
- [ ] `nightfall()` is a pure auditable transform whose luma cap is stated
      and asserted; swapping in an authored `fondo nocturno.png` is one
      `PASSTHROUGHS` row plus deleting the function, and a docblock at the
      site says so.
- [ ] Folding a stroke set incrementally and folding it at once produce the
      same cleared tile set.
- [ ] `coverageScore`'s default arguments reproduce today's scores for
      `f1-libre` exactly.
- [ ] Erase tiles stay erased; light tiles persist nothing across frames;
      a lit object stays found.
- [ ] Per adventure, cleared-area demand is non-decreasing and reveal
      radius is non-increasing.
- [ ] No `demo` on any of the twelve.
- [ ] **No `<mask>`, `<pattern>`, `<clipPath>`, `<defs>`, `useId` or any
      `url(#…)` anywhere in the diff**, and all six shipped guard tests
      stay green untouched.
- [ ] A fresh install lands on a map with only the entrada clear; finishing
      `sand4` opens the estanque, puts the lupa in the backpack, and shows
      the closing beat once.
- [ ] Finishing `llama-peak4` opens the nocturna; finishing `night4` puts
      the linterna in the backpack.
- [ ] `migrateEntrance` is idempotent, never mutates a source record, and
      demotes nobody.
- [ ] `cases.ts`, `Deduction.tsx`, `AnimalId`, `ClueKind`, `AdventureIntro`,
      the duck/sheep/llama/medusa levels and `trail1..4` are byte-identical
      to `main`.
- [ ] **Baseline held**: ≥ 65 test files / ≥ 1286 tests green,
      `npm run build` green.
- [ ] **Captures** into `capturas/`: each of the twelve levels, covered and
      part-revealed; the night sector lit and unlit; the entrance intro and
      the transformation closing; the map on a fresh install, after the
      entrance, and fully unlocked; the backpack with two items; one duck
      and one llama level proving they are unchanged.

## Proposal question round

SDD ran in `auto` mode, so these could not be asked live. They are product
questions, not harness ones, and each states the working assumption the
change proceeds on unless corrected.

1. **Three adventures in two sectors, twelve levels.** The entrance holds
   two surfaces (glass, sand) and the backdrop registry is keyed by
   adventure, so two surfaces means two adventures, which means eight
   levels in the entrance alone. *Assumption: twelve levels total. The
   named scope lever, not taken: `sand` drops to two levels, or defers to
   paso E, which owns the arena sector anyway.*
2. **When does the transformation fire?** `docs/12` §1 reads as though the
   discovery happens right after the pane is cleaned. *Assumption: after
   the entrance sector's LAST level (`sand4`), so the whole entrance is one
   caretaking stretch and the transformation closes it. The alternative —
   firing after `glass1` — splits the entrance's own story in half.*
3. **The backpack mapping.** *Assumption: entrada grants the lupa
   (`docs/13` §8's own example), nocturna grants the linterna. The estanque
   and the bosque get no item in this row, because no art exists for one
   and inventing a placeholder is worse than an honest gap.*
4. **The opening versus the no-demotion rule.** An existing child cannot
   both keep their unlocks and be shown the new opening: the migration that
   prevents demotion is the same write that marks the entrance done.
   *Assumption: no-demotion wins, matching three shipped precedents, and
   existing children skip the opening. The alternative — no migration —
   costs only the dev-only `LevelMap`, since the zoo map never consults
   `isUnlocked`, and would let everyone see the opening.*
5. **What is hidden in the dark.** *Assumption: `cofre.png`,
   `piedra.png` and `hoja.png`, three objects already drawn and sitting
   unwired in `art-source/`. No animal — the erizo is paso H's, and
   spending it here would leave that row with nothing to find.*
6. **The estanque closes on a fresh install.** Building an entrance means
   the pond is no longer open on first run. *Assumption: intended — it is
   the reason row D exists. Named because it is the most visible behaviour
   change in the row for anyone who has played the current build.*
