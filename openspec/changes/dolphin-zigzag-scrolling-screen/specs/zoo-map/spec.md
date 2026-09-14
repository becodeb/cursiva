# Delta for Zoo Map

## MODIFIED Requirements

### Requirement: Image-to-ViewBox Transform and Background

The map `<image>` SHALL render inside a `0 0 1000 600` viewBox at
`preserveAspectRatio="xMidYMid slice"`, mapping the 1536×1024 source PNG
by `vbX = imgX × 0.651042`, `vbY = imgY × 0.651042 − 33.333`. The
document background behind the letterboxed SVG MUST be `#76B56A` and MUST
NOT be white. `imageToViewBox`/`viewBoxToImage` SHALL gain an optional
sheet-width parameter defaulting to `1000` (the pre-existing `STAGE_W`),
so every one of the fifteen existing callers, which pass no argument,
MUST stay byte-identical to before this change. A caller measuring a
wider sheet (e.g. `backdrops.test.ts`'s dolphin corridor check) MUST pass
its actual sheet width explicitly.

(Previously: `imageToViewBox`/`viewBoxToImage` took no sheet-width
parameter and always computed against the hardcoded `STAGE_W = 1000`.)

#### Scenario: Transform matches the measured scale factor

- GIVEN a measured point on the source PNG
- WHEN it is converted with the two transform lines
- THEN the result MUST equal the registry's corresponding `hit`
  coordinate

#### Scenario: Background renders the measured green

- GIVEN the map rendered via `renderToString`
- WHEN the outer background colour is read
- THEN it MUST equal `#76B56A`, never white

#### Scenario: Every existing caller stays byte-identical at the default width

- GIVEN each of the fifteen existing `imageToViewBox`/`viewBoxToImage`
  call sites, invoked with no sheet-width argument, before and after this
  change
- WHEN their return values are compared
- THEN they MUST be identical

#### Scenario: A caller passing a wider sheet gets a different, correct result

- GIVEN `viewBoxToImage` called once at the default width and once at a
  wider explicit sheet width, for the same viewBox point
- WHEN the two results are compared
- THEN they MUST differ, and the wider-sheet result MUST match the row
  `build_art.py`'s sampling would report for that sheet

### Requirement: Sector-to-Adventure Mapping

`estanque.adventureIds` MUST equal, in order: `duck-trail1`,
`duck-trail2`, `duck-trail3`, `duck-trail4`, `f2-guirnalda`, `f2-agua2`,
`f2-agua3`, `f2-agua4`, `dolphin1`, `dolphin2`, `dolphin3`, `dolphin4`.
`montanas.adventureIds` MUST equal, in order, `sheep-hill1..4` then
`llama-peak1..4`. `entrada.adventureIds` MUST equal, in order,
`glass1..4` then `sand1..4`, and `entrada.unlockedWhen` MUST always
return `true`. `nocturna.adventureIds` MUST equal, in order,
`night1..4`, and `nocturna.unlockedWhen` MUST return `true` exactly once
`llama-peak4` is filed. `arena.adventureIds` MUST equal, in order,
`snake1..4`, and `arena.unlockedWhen` MUST return `true` exactly once
`night4` is filed. `bosque.adventureIds` MUST equal `bee1..4`, and
`bosque.unlockedWhen` MUST return `true` exactly once `snake4` is filed.
`sendero` MUST have empty `adventureIds` and MUST have no `hit` to fog.

(Previously: `estanque.adventureIds` ended at `f2-agua4`, twelve entries
fewer than this requirement now states; the dolphin adventure adds no new
unlock rung of its own — `estanque.unlockedWhen` is untouched, since the
sector is already open by the time `dolphin1` becomes reachable.)

#### Scenario: Estanque's twelve adventures are in the exact order

- GIVEN `estanque.adventureIds`
- WHEN read
- THEN it MUST equal the twelve ids above, in that order, with the four
  dolphin ids last

#### Scenario: Estanque's unlockedWhen is unaffected by the dolphin addition

- GIVEN `Records` for which `estanque.unlockedWhen` already returned
  `true` before this change
- WHEN `estanque.unlockedWhen` is evaluated again after this change
- THEN it MUST return the same value, unchanged

#### Scenario: Montañas' eight adventures are in the exact order

- GIVEN `montanas.adventureIds`
- WHEN read
- THEN it MUST equal `sheep-hill1..4, llama-peak1..4`, in that order

#### Scenario: Entrada's eight levels are glass then sand, and entrada is never fogged

- GIVEN `entrada.adventureIds` and `entrada.unlockedWhen`, evaluated for
  any `Records`
- WHEN read
- THEN `adventureIds` MUST equal `glass1..4, sand1..4` in that order, and
  `unlockedWhen` MUST return `true` for every input

#### Scenario: Nocturna stays fogged until llama-peak4 is filed

- GIVEN `nocturna.adventureIds` and `Records` where `llama-peak4` is
  unfiled, then filed
- WHEN `nocturna.unlockedWhen` is evaluated for each
- THEN it MUST return `false` then `true`, and `adventureIds` MUST equal
  `night1..4`

#### Scenario: Arena stays fogged until night4 is filed, then opens with snake1..4

- GIVEN `arena.adventureIds` and `Records` where `night4` is unfiled,
  then filed
- WHEN `arena.unlockedWhen` is evaluated for each
- THEN it MUST return `false` then `true`, and `adventureIds` MUST equal
  `snake1, snake2, snake3, snake4`

#### Scenario: Bosque opens once snake4 is filed, with its four bee adventures

- GIVEN `Records` where `snake4` is filed
- WHEN `bosque.unlockedWhen(records)` is evaluated and
  `bosque.adventureIds` is read
- THEN `unlockedWhen` MUST return `true` and `adventureIds` MUST equal
  `bee1..4`

#### Scenario: Sendero remains empty and closed for every input

- GIVEN `sendero`
- WHEN `adventureIds` and `unlockedWhen` are checked for any `Records`
- THEN `adventureIds` MUST be empty and `unlockedWhen` MUST return
  `false`

## ADDED Requirements

### Requirement: AdventureId and ZooAnimalId Widen for the Dolphin

`AdventureId` SHALL widen to include `'dolphin'`. The `ADVENTURES` row
for `dolphin` SHALL carry `animal: 'delfin'` and no `closingBeat` — an
animal-recovering adventure closes through the shipped map bubble the
moment its animal is placed, the same template the duck, sheep, llama,
snake, and bee rows already use. `ZooAnimalId` SHALL widen to include
`'delfin'`, and `ZOO_ANIMAL_ART.delfin` MUST equal
`SECTOR_ADVENTURE_ART.dolphin` (the already-built, already-registered
`sector-dolphin.png`).

#### Scenario: The dolphin adventure row declares animal:'delfin' and no closingBeat

- GIVEN the `dolphin` row in `ADVENTURES`
- WHEN `animal` and `closingBeat` are read
- THEN `animal` MUST equal `'delfin'` and `closingBeat` MUST be absent

#### Scenario: Filing dolphin4 changes estanque's map-bubble phrase to the dolphin's closing line

- GIVEN `dolphin4` filed and it is the most recently recovered of
  estanque's adventures
- WHEN the phrase selector (`mapBubble`) is evaluated for `estanque`
- THEN it MUST equal the dolphin adventure's own closing line

#### Scenario: ZOO_ANIMAL_ART resolves delfin to the dolphin art

- GIVEN `ZOO_ANIMAL_ART.delfin`
- WHEN compared to `SECTOR_ADVENTURE_ART.dolphin`
- THEN they MUST be the same art reference

#### Scenario: The dolphin appears in the zoo once dolphin4 is filed

- GIVEN `dolphin4` filed
- WHEN `animalPlacements(estanque, records)` is read
- THEN the dolphin MUST be present, placed at `estanque.animalSpot` via
  `STANDING_GRIP`; with `dolphin4` unfiled, it MUST be absent

### Requirement: The Dolphin Adventure Backdrop Reuses the Lagoon Art With No New build_art.py Row

`zoo/backdrops.ts` SHALL gain an `ADVENTURE_BACKDROP.dolphin` row reusing
`SECTOR_BACKGROUND_ART.lagoon`, with `quiet`, `brightest`, and
`corridorRows` copied verbatim from the duck adventure's own registered
row — no new `PASSTHROUGHS` entry and no `build_art.py` re-run are
required. `backdropFor` MUST resolve every `dolphin*` level id to this
row via the same `adventureFor(levelId).id` lookup every other adventure
already uses.

#### Scenario: The dolphin backdrop row copies the duck row's literals

- GIVEN the dolphin backdrop registry entry and the duck backdrop
  registry entry
- WHEN `quiet`, `brightest`, and `corridorRows` are compared
- THEN the dolphin row's values MUST equal the duck row's values

#### Scenario: backdropFor resolves a dolphin level id to the dolphin backdrop

- GIVEN a `dolphin` adventure level id
- WHEN `backdropFor` is called
- THEN it MUST return the dolphin backdrop row, not the duck row

### Requirement: No Backpack Item Is Granted by the Dolphin Adventure

`BACKPACK_ITEMS` MUST NOT gain an entry keyed `grantedBy: 'estanque'` as
part of this change — an explicit author decision recorded, not an
oversight, consistent with the duck adventure shipping without one.

#### Scenario: earnedItems never includes an estanque-granted item

- GIVEN `Records` where `dolphin4` is filed
- WHEN `earnedItems(records)` is called
- THEN no returned entry MUST have `grantedBy === 'estanque'`

---

**Accepted deviation:** this spec exceeds the skill's 650-word cap, the
same deviation this project's other capability specs already record; the
session's delivery strategy is `exception-ok`.
