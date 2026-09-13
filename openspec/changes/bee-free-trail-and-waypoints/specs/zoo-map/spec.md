# Delta for Zoo Map

## ADDED Requirements

### Requirement: Bosque Sector Opens With the Bee Adventure and the Recovered Bee

`bosque.unlockedWhen` MUST return `true` exactly once `snake4` is filed,
extending the unlock ladder's next rung (`entrada → estanque ← sand4 →
montañas ← duck-trail4 → nocturna ← llama-peak4 → arena ← night4 → bosque`
— every sector unlocks off the immediately-preceding sector's last level,
never a skip). `bosque.adventureIds` MUST equal `bee1, bee2, bee3, bee4`, in
that order. `bosque.animals` MUST hold exactly one entry, `{id: 'abeja',
appearsWhen: ['bee4']}`, placed at `bosque.animalSpot` via `STANDING_GRIP`,
the same mechanism every other recovered animal uses.

#### Scenario: Bosque stays closed until snake4 is filed

- GIVEN `Records` where `snake4` is unfiled
- WHEN `bosque.unlockedWhen(records)` is evaluated
- THEN it MUST return `false`

#### Scenario: Bosque opens once snake4 is filed, with its four adventures

- GIVEN `Records` where `snake4` is filed
- WHEN `bosque.unlockedWhen(records)` is evaluated and `bosque.adventureIds`
  is read
- THEN `unlockedWhen` MUST return `true` and `adventureIds` MUST equal
  `bee1, bee2, bee3, bee4`

#### Scenario: The bee appears once bee4 is filed, and is absent before

- GIVEN `bee4` filed
- WHEN `animalPlacements(bosque, records)` is read
- THEN the bee MUST be present; with `bee4` unfiled, it MUST be absent

### Requirement: AdventureId and ZooAnimalId Widen for the Bee

`AdventureId` SHALL widen to include `'bee'`. The `ADVENTURES` row for `bee`
SHALL carry `animal: 'abeja'` and no `closingBeat` — the snake row is the
template: an animal-recovering adventure closes through the shipped map
bubble the moment its animal is placed, and the once-per-story closing
screen stays reserved for the entrance's sand adventure, which recovers no
animal. `ZooAnimalId` SHALL widen to include `'abeja'`, and
`ZOO_ANIMAL_ART.abeja` MUST equal `SECTOR_ADVENTURE_ART.bee`.

#### Scenario: The bee adventure row declares animal:'abeja' and no closingBeat

- GIVEN the `bee` row in `ADVENTURES`
- WHEN `animal` and `closingBeat` are read
- THEN `animal` MUST equal `'abeja'` and `closingBeat` MUST be absent

#### Scenario: Filing bee4 changes bosque's map-bubble phrase to the bee's closing line

- GIVEN `bee4` filed
- WHEN the phrase selector (`mapBubble`) is evaluated for `bosque`
- THEN it MUST equal the bee adventure's own closing line, not the existing
  onward-pointing phrase

#### Scenario: ZOO_ANIMAL_ART resolves abeja to the bee art

- GIVEN `ZOO_ANIMAL_ART.abeja`
- WHEN compared to `SECTOR_ADVENTURE_ART.bee`
- THEN they MUST be the same art reference

### Requirement: The Forest Backdrop Registry Entry Declares No Channel and No corridorArt

`zoo/backdrops.ts`'s forest row SHALL declare `corridorRows: (191, 926)`
(matching the rebuilt `manifest.json`) and MUST declare neither a `channel`
field nor a `corridorArt` field: the forest paints no channel because no
drawn corridor exists on a waypoint level, and it paints no ground marks
because none are drawn (`docs/13` §4 decision 3). `backdropFor` MUST
resolve every `bee*` level id to this row via the same
`adventureFor(levelId).id` lookup every other adventure already uses.

#### Scenario: The forest backdrop row declares corridorRows and neither channel nor corridorArt

- GIVEN the forest backdrop registry entry
- WHEN `corridorRows`, `channel`, and `corridorArt` are read
- THEN `corridorRows` MUST equal `(191, 926)`, and `channel` and
  `corridorArt` MUST both be absent

#### Scenario: backdropFor resolves a bee level id to the forest backdrop

- GIVEN a `bee` adventure level id
- WHEN `backdropFor` is called
- THEN it MUST return the forest backdrop row

### Requirement: Backpack Gains the Forest's Flower

`BACKPACK_ITEMS` SHALL gain a fifth entry: `{id: 'flor', art:
SECTOR_ADVENTURE_ART.flower, grantedBy: 'bosque', earnedWhen: ['bee4']}`.
`earnedItems(records)` MUST include it once `bee4` is filed and MUST NOT
include it before.

(Previously: `BACKPACK_ITEMS` held exactly four entries.)

#### Scenario: The flower item is absent before bee4 is filed

- GIVEN `Records` where `bee4` is unfiled
- WHEN `earnedItems(records)` is called
- THEN it MUST NOT include `flor`

#### Scenario: The flower item is present once bee4 is filed

- GIVEN `Records` where `bee4` is filed
- WHEN `earnedItems(records)` is called
- THEN it MUST include `flor` alongside the pre-existing four entries
