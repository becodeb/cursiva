# Exploration: PASO F — "Abejas en el bosque" (bee-free-trail-and-waypoints)

> Recovered from Engram `sdd/bee-free-trail-and-waypoints/explore` (observation #1386).
> The `sdd-explore` phase ran without a Write tool, so this file is the on-disk
> materialization of that artifact, per the OpenSpec convention.

## Current State

The engine has exactly two `LevelKind` values (`client/src/levels/types.ts:16`): `'free'` (no target, scored on area coverage or reveal-grid) and `'path'` (scored against a fixed ideal cloud). `buildLevelTarget` (`client/src/levels/buildLevel.ts:168-180`) early-returns an EMPTY target for `kind==='free'` — no `paths`, no `routes`, no `polyline`. `evaluateLevel.ts:119-133`'s free branch scores via `revealScore` (`client/src/levels/revealGrid.ts:275-305`), which itself branches internally: no `config.reveal` → `coverageScore`; `reveal.mode==='erase'` → cleared-tile %; `reveal.mode==='light'` → % of authored `RevealObject`s (`{art,size,x,y}`, `types.ts:201-206`) found by proximity. `RevealObject` is the ONLY existing precedent for AUTHORED sheet coordinates on a routeless level, and its own doc comment states why: "there is no route to derive a position from."

The carrier (the lupa/glass that already follows the finger, `carrier: boolean` at `types.ts:106`) is driven by `TraceCanvas.tsx:866-876`'s rAF loop off `rendered` (the ink the child sees), and rendered at `:1512-1565` via a per-level `carrierArt` prop that today is HARD-WIRED at `screen/LevelPlay.tsx:1511` (`carrierArt={inWorld ? CARRIER_LENS_ART : undefined}`) — there is no `LevelConfig.carrierArt` field yet.

**Blocking finding, not previously flagged in the brief**: the carrier's rendered position (`LevelPlay.tsx:1498-1503`) is gated on `level.carrier && startMarker`, and `startMarker = target.polyline[0]` (`LevelPlay.tsx:1186`). For `kind:'free'` this is `undefined` (empty `polyline`). **As shipped today, a `carrier:true` level with `kind:'free'` renders NO carrier at all** — the exact "green suite, invisible mechanic" failure paso E's Engram lesson (#1377) already caught once for víboras. This must be fixed for the bee to be visible on screen, not just scored correctly.

Precedent pure-fold modules to imitate (mandatory convention, `levels/arrange.ts:1-6`'s own header: the test harness is node/no-jsdom, so any decision made only inside a pointer handler is invisible to every test):

- `levels/revealGrid.ts`: `revealTick` (live incremental fold, monotone, same-reference-when-unchanged), `revealTiles` (render projection), `revealScore` (pure, recomputes from the COMPLETE stroke list at evaluation time — does NOT reuse live fold state).
- `levels/arrange.ts`: `arrangeTick`, `debugArrange`/`seedArrange` (screenshot seeding).
- `detective/clues.ts`: `clueTick`/`ClueState` (monotone latch over authored marks), `ClueMark.arc` doc comment (arc-length vs. Euclidean tradeoff — inverts for a free trace, where there is no arc to speak of and Euclidean containment is the only available predicate).
- `canvas/RevealLayer.tsx`: the exact render precedent for authored-coordinate art — `<image>` per object via `placeArt`+`clampArtBox`, then `<rect>` tiles, inside one `<g pointerEvents="none">`, NO `url(#…)`.

Registry gaps confirmed by reading the files directly: `zoo/adventures.ts:24` `AdventureId` has no `'bee'`; `zoo/sectors.ts:318-326` `bosque` ships `animals: []`, `adventureIds: []`, `unlockedWhen: alwaysClosed`; `detective/assets.ts:53` `ZooAnimalId` has no `'abeja'`; `zoo/backpack.ts` grants nothing for `bosque`. Art is already built and registered (`SECTOR_ADVENTURE_ART.bee/.flower/.honeycomb` at `assets.ts:304-306`, `SECTOR_BACKGROUND_ART.forest` at `assets.ts:270`) — confirmed present, not re-measured.

`fondo bosque.png`'s `PASSTHROUGHS` row (`scripts/art/build_art.py:536`) is still `None` for the corridor-rows tuple; per Engram #1381 it must become `(191, 926)`.

## Affected Areas

- `client/src/levels/types.ts` — new additive `LevelConfig.waypoints?: WaypointConfig` field (7th precedent after `goalArt`/`hazardArt`/`vertexArt`/`reveal`/`arrange`/`artCorridor`); new additive `LevelConfig.carrierArt?: ArtImage`.
- `client/src/levels/waypoints.ts` (new file) — pure fold module: `WaypointConfig`, `WaypointState`, `waypointTick` (render-state latch), `waypointScore` (evaluation-time pure scorer mirroring `revealScore`), `debugWaypoints` (screenshot seeding, mirrors `debugArrange`).
- `client/src/game/evaluateLevel.ts:119-133` — the `kind==='free'` branch grows one more conditional: `config.waypoints` present → `waypointScore`; else unchanged `revealScore` (bit-identical fallback preserved, same idiom `revealScore` itself already uses for `reveal` vs. none).
- `client/src/canvas/TraceCanvas.tsx` — new `waypoints?: TraceWaypoints` prop mirroring `reveal?: TraceReveal` (`:652`), rendered in the same slot as the `{reveal && …}` block (`:1019-1028`, between the backdrop group and the maze/corridor block); carrier resting position (`:866-876`, render at `:1512-1565`) unaffected once `LevelPlay` supplies an authored start.
- `client/src/canvas/WaypointLayer.tsx` (new file) — mirrors `RevealLayer.tsx` exactly: `<image>` per flower/goal via `placeArt`+`clampArtBox`, no `url(#…)`.
- `client/src/screen/LevelPlay.tsx:1011-1140` (`onFrame`) — new block reading the same per-frame sample, gated on `level.waypoints` (mirrors the existing `level.reveal && !debugLightPoint` block at `:1076-1078`, and the `arrangeOpen` short-circuit at `:1016-1021` as the template for routing a NEW mechanic through the SAME sample); `:1186` (`startMarker`) and `:1498-1511` (carrier prop + `carrierArt`) both need an authored-coordinate fallback and the `level.carrierArt` override respectively.
- `client/src/zoo/adventures.ts:24,65-155` — add `'bee'` to `AdventureId`; add an `ADVENTURES` row (snake's row at `:139-154` is the closest template: `animal: 'abeja'`, no `closingBeat`).
- `client/src/zoo/sectors.ts:318-326` — fill `bosque`'s `animals`, `adventureIds`, `unlockedWhen`.
- `client/src/zoo/backdrops.ts:105-188` — add a `bee` (or `forest`) row to `ADVENTURE_BACKDROP`, once `corridorRows=(191,926)` exists in the manifest — note this backdrop needs NO `channel` (Engram #1381: paper corridor is directly admissible at 151.2 luma) and NO `corridorArt` (there is no drawn corridor at all, only authored points).
- `client/src/detective/assets.ts:53,323-330` — `ZooAnimalId` add `'abeja'`; `ZOO_ANIMAL_ART.abeja = SECTOR_ADVENTURE_ART.bee`.
- `client/src/zoo/backpack.ts` — optionally a bosque reward item (not mandated by docs/13 §8, unlike the llama's hat or the arena's cart — flag as an open question, not a requirement).
- `client/src/canvas/devMode.ts` — new ungated debug flag (see Risks/Open Decision 4 below).
- `scripts/art/build_art.py:536` — `fondo bosque.png`'s `PASSTHROUGHS` row gains `(191, 926)`; a NEW pipeline row for the flower's achromatic "undiscovered" marker (see Open Decision 3).
- `client/src/detective/palette.ts` — a NEW achromatic token at luma ≥ 206.2 (no existing token sits there; `CLUE_DRAINED` at luma 131 fails by 34.8 per Engram #1381).
- `client/src/levels/catalog.ts` — 4 new level entries (`bee1..bee4`, proposed id stem below), inserted after `snake4` and before `f2-guirnalda` (matches docs/13 §8's plan order and the arena→bosque unlock ladder).
- `client/src/levels/catalog.test.ts` — THREE existing guards will fail the moment these levels are added, found by reading them directly, not assumed:
  - `:251-264` (`minAccuracy` scales by phase, exemptions for `level.reveal`/`level.artCorridor`) needs a third `if (level.waypoints) continue`, plus its own new describe block asserting the bee's own rising `minAccuracy` (mirrors the snake family's own separate block, referenced in the comment at `:252-257`).
  - `:399-411` (`tone === hasCorridor`, `haptics === hasCorridor || !!level.reveal`) needs `|| !!level.waypoints` added to the `haptics` clause — bee levels should ship `haptics: true` (a flower/goal touch is "a contact worth feeling", the same reasoning `:401-405`'s own comment gives for the reveal grid) but `hasCorridor` is false and `level.reveal` is absent, so this guard as written would currently reject `haptics:true` on a bee level.
  - `:48-97` (`EXPECTED_IDS`) needs the 4 new ids inserted in play order.
  - `:538-561` (phase-1 span guard) does NOT need changes — it already `continue`s on `level.kind !== 'path'` (`:556`), so a `kind:'free'` bee level is silently exempt. Confirmed by reading the guard body directly, not assumed.
- `client/src/detective/artManifest.test.ts` — new manifest keys for the forest's `corridorRows`/`quiet`/`brightest` and any new flower-marker asset.

## Approaches

### Q1 — scoring/completion shape

1. **Additive `waypoints?: WaypointConfig` on `kind: 'free'`** (recommended)
   - Pros: zero blast radius on the `LevelKind` type itself (still 2 values); every `kind==='free'`/`kind==='path'` equality check in the codebase (16 call sites found via grep, e.g. `buildLevel.ts:168`, `LevelPlay.tsx:587,879,1192`, `catalog.test.ts:289,352,395,407`) keeps working unchanged, because a bee level IS a `free` level with one more optional field, exactly the relationship `reveal?`/`arrange?`/`artCorridor?` already have to `kind`. Reuses `revealScore`'s own internal-branching idiom precisely (`evaluateLevel.ts` grows one more `if`, same as `revealGrid.ts:281`'s `if (!reveal) return coverageScore(...)`).
   - Cons: `WaypointConfig` and `RevealConfig` are conceptually adjacent (both are "routeless authored targets") but structurally distinct enough (one is a torch-veil grid, the other is carrier+goal+flowers) that they cannot share a union without confusing the veil-specific fields (`tile`, `cols`/`rows` grid) that make no sense for a daylight forest with no darkness.
   - Effort: Low-Medium (one new pure module + one new render layer + one new `evaluateLevel` branch, all following an existing template each).

2. **Third `LevelKind = 'waypoints'` value**
   - Pros: gives the mechanic its own name in the type system; a future exhaustiveness check (if one is ever added) would force every consumer to handle it explicitly rather than silently falling into the `free` default branch.
   - Cons: every one of the 16+ `kind==='free'`/`kind==='path'` sites found by grep would need auditing for whether "not path" (today's implicit meaning at sites like `LevelPlay.tsx:879,1192`, `catalog.test.ts:352`) still means what it currently means once a THIRD value exists that is also "not path". No such audit is free; several of those sites (`resetOnContact = level.resetOnContact && level.kind === 'path'`, `catalog.test.ts:352`'s `maze` check) already encode "path" as the ONLY non-default kind. Higher risk of a silent behavioural gap the test suite does not catch, precisely the paso-E lesson.
   - Effort: Medium-High, for no capability the additive field does not already deliver.

**Recommendation: Option 1.**

### Q2 — expressing "mayor precisión" without a `corridorWidth`

1. **Shrinking waypoint/goal touch radius across bee1→bee4** (recommended) — direct structural analogue of every other adventure's own corridor-narrowing progression (sheep: 100→60, llama: 90→60, snake: 38→28, all read from `catalog.test.ts:137-189`'s own `CORRIDORS` table). Cheapest to implement (one number per level) and cheapest to test (mirrors the snake family's own separate `minAccuracy` progression block).
2. **Path-length efficiency budget** (penalize a scribbled/roundabout route vs. a direct one) — rejected: this is closer to an inhibition/obstacle mechanic than a precision one, and docs/13 §1 is explicit — "los obstáculos aparecen después, nunca al comienzo" — this is the FIRST bee level's own family, not a later one.
3. **Enforcing visit order** — rejected: docs/13 §2's own wording ("puede pasar por flores y llegar al panal") does not ask for order, and `revealGrid.ts`'s own `light` mode precedent (the ONLY existing "touch N authored points" mechanic in the codebase) is deliberately unordered — matching it keeps the bee's flower-touch semantics identical in kind to the night sector's object-finding, which is the established pattern for "routeless, multiple authored targets."

**Recommendation: Option 1**, combined with (already decided by docs/13 §2 itself, not a choice) more flowers and a longer journey for bee2/bee3 respectively.

### Q3 — the flower's off-state

1. **New light achromatic marker (luma ≥ 206.2) that swaps to the drawn `sector-flower.png` on touch** (recommended) — mirrors the `CLUE_ART.<kind>.art.{earned,drained}` swap idiom the codebase already ships (referenced structurally at `artManifest.test.ts:104-107`), and satisfies `docs/09` §4's "ganar una pista es ganar TONO" literally: achromatic → the flower's own colour (`#c89bb2` petal, per Engram #1381). Requires: one new palette token (no existing token sits in the admissible ≥206.2 band, confirmed by reading `palette.ts` in full — `CLUE_DRAINED` is 131, everything else is a "won" colour); one new `build_art.py` pipeline row (a `recolour()`-mode pass of `flor.png` at the new token, the same two-pass shape `CLUE_ART` sources already get); one new `assets.ts` registry shape (`FLOWER_ART: {earned, drained}` or similar).
2. **Draw the flower art as-is from the start (its natural petal colour), signal "touched" some other way (a bump/scale, a small sparkle overlay)** — rejected as PRIMARY signal: `docs/09` §4's rule is explicit and tested elsewhere (`artHierarchy.test.ts`) that colour IS the reward; inventing a second reward channel (motion/sparkle) for one adventure only would be a new, undocumented convention. Could still be layered ON TOP of option 1 as secondary juice, but is not a substitute.

**Recommendation: Option 1**, flagged as NEW asset-pipeline work not yet started (unlike bee/flower/honeycomb themselves, which per the brief are already built).

### Q4 — phase

Confirmed by reading `catalog.test.ts:538-561` directly: the phase-1 span guard iterates `levelsByPhase(1)` and immediately `continue`s past any level whose `kind !== 'path'` (`:556`). A `kind:'free'` bee level phase-1-assigned is therefore automatically exempt — no conflict, no guard change needed. Recommend `phase: 1`, matching every other sector-adventure precedent (duck/sheep/llama/snake/glass/sand/night are ALL phase 1) and the plan's own sequencing (paso F sits directly after paso E/arena, both pre-cursive-pattern-phase content).

### Q5 — does the bee recover a `ZooAnimalId`?

Yes, recommended: add `'abeja'` to `ZooAnimalId` (`assets.ts:53`) and an `ADVENTURES` row with `animal: 'abeja'`, no `closingBeat` — this is the snake/sheep/llama/duck pattern exactly (`adventures.ts:139-154`'s snake row is the closest template: recovers an animal, closing reads through the shipped `mapBubble` bubble once the animal is filed, no dedicated closing screen because `closingBeat` is reserved for the entrance's `sand` adventure per `adventures.ts:150-153`'s own comment). The alternative — an `icon`-based adventure like `glass`/`sand`/`night` (`adventures.ts:93-138`) — is wrong here: those three exist because they recover NO animal (the entrance's cleaning tasks, the night sector's found objects); the bee is literally an animal in the zoo's own animal roster (docs/13 §7 lists `abeja.png` alongside `llama.png`/`vibora chica.png` as an ANIMAL asset, not a UI icon).

### Q6 — what unlocks `bosque`?

Recommended: `unlockedWhen: (records) => isFiled(records, 'snake4')`, extending the ladder documented at `sectors.ts:406-408`'s own comment ("entrada → estanque ← sand4 → montañas ← duck-trail4 → nocturna ← llama-peak4 → arena ← night4") by one more rung: `→ bosque ← snake4`. This is the only choice consistent with docs/13 §8's plan table, which places paso F (bosque) directly after paso E (arena/víboras) — every other sector in the ladder unlocks off the immediately-preceding sector's own last level, never a skip.

### Q7 — screenshotting a free-invented finger path

Recommended: a new ungated flag, e.g. `?debug=estela:<x>,<y>` (named after docs/13 §2's own words, "el chico crea una estela"), parsed via the SAME private `debugArg(search, prefix)` helper `devMode.ts:74-85` already factors out, with the exact grammar `lightDebugPoint` uses (`devMode.ts:130-138`): a comma-separated float pair, `null` on anything malformed. Wired the same way `debugLightPoint`/`revealDebugFraction` are consumed in `LevelPlay.tsx` (`:1034,1076`, `!debugLightPoint` guards) — it REPLACES live pointer input for the waypoint fold's "current position," which is what makes a static screenshot show the carrier sitting mid-route. This alone cannot show "2 of 3 flowers already lit" in one frame (a single pinned point cannot express an accumulated latch); recommend PAIRING it with a `debugArrange`-style seeding function, `debugWaypoints(cfg, litCount)` (`levels/waypoints.ts`, new), ungated for the same reason `debugArrange`/`revealDebugFraction` are ungated (`devMode.ts:141-148`'s own stated rule: paints render state, adds no control, persists nothing, must match the exact build being screenshotted). Two flags, not one — left for sdd-design/sdd-tasks to fix the exact query grammar (a single `?debug=abejas:<k>` for "first k flowers lit" plus the existing point-pin idea is the leading candidate).

## Risks

- **The carrier-visibility gap is the single highest-risk item.** `LevelPlay.tsx:1186,1498-1503` gates the carrier's rendered position on `target.polyline[0]`, which is always `undefined` for `kind:'free'`. Without an authored fallback start point (naturally `WaypointConfig.start: Point`, following the exact justification `RevealObject`'s own doc comment gives), the bee would be scored correctly but never drawn — the precise "green suite proves nothing about what the screen shows" failure mode from paso E (Engram #1377/#1381's own §7 amendment 7 in docs/13).
- Three existing `catalog.test.ts` guards (`:251-264`, `:399-411`, `:48-97`) WILL fail the moment bee levels are added and MUST be edited in the same change — flagged above with exact line numbers, not left implicit.
- The flower's achromatic off-state needs a NEW palette token and a NEW `build_art.py` pipeline row; this is real, uncompleted asset-pipeline work, not a config-only change — likely the largest single line-count item in this change if `size:exception` needs an estimate.
- `fondo bosque.png`'s `PASSTHROUGHS` row (`build_art.py:536`) still reads `None`; the corridor-rows tuple `(191, 926)` from Engram #1381 must be added and `build_art.py` re-run before `backdrops.ts` can hand-copy `quiet`/`brightest`, or `artManifest.test.ts` will fail on a literal mismatch.
- No existing `ADVENTURE_BACKDROP` entry has BOTH "no `channel`" AND "an authored-coordinate mechanic with no drawn corridor at all" — the forest is the first background to combine "paper corridor admissible" with "nothing is actually painted as a corridor." Worth a small design note so a future reader does not assume a `channel` is missing by oversight.
- The exact level-id stem (`bee1..4` vs. `bee-trail1..4` vs. something else) and the exact per-level flower counts/radii/distances are left to `sdd-design`/`sdd-tasks` — this exploration deliberately does not author the four `WaypointConfig` literals, only the shape and the progression they must express.

## Ready for Proposal

Yes. The scoring shape (Q1), precision mechanism (Q2), flower-state mechanism (Q3), phase (Q4), animal-recovery status (Q5), and unlock ladder (Q6) are all resolved with concrete recommendations grounded in file:line evidence. Q7 (screenshot flag) has a clear direction but its exact two-flag grammar should be finalized in design. The orchestrator should tell the user: this change touches roughly a dozen files across engine/registry/catalog/tests plus new palette+pipeline work for the flower's off-state — sizeable but each piece has a close existing precedent to copy, which is what keeps the risk Low-Medium despite the file count.
