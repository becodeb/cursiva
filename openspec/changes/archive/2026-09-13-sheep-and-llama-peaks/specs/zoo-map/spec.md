# Delta for Zoo Map

## MODIFIED Requirements

### Requirement: Sector-to-Adventure Mapping

`estanque.adventureIds` MUST equal, in order: `duck-trail1`, `duck-trail2`,
`duck-trail3`, `duck-trail4`, `f2-guirnalda`, `f2-agua2`, `f2-agua3`,
`f2-agua4`. `montanas.adventureIds` MUST equal, in order, `sheep-hill1..4`
then `llama-peak1..4`. `entrada`, `bosque`, `arena`, and `nocturna` MUST
have empty `adventureIds` and MUST render fogged for every input.

(Previously: `montanas` was grouped with `entrada`, `bosque`, `arena`, and
`nocturna` as one of five sectors required to carry empty `adventureIds`
and stay fogged for every input; `docs/13` §8 row C promotes it out of that
set.)

#### Scenario: Estanque's eight adventures are in the exact order

- GIVEN `estanque.adventureIds`
- WHEN read
- THEN it MUST equal the eight ids above, in that order

#### Scenario: Montañas' eight adventures are in the exact order

- GIVEN `montanas.adventureIds`
- WHEN read
- THEN it MUST equal `sheep-hill1..4, llama-peak1..4`, in that order

#### Scenario: The four remaining sectors carry no adventures and stay fogged

- GIVEN `entrada`, `bosque`, `arena`, `nocturna`
- WHEN `adventureIds` and `unlockedWhen` are checked for any `Records`
- THEN `adventureIds` MUST be empty and `unlockedWhen` MUST return `false`

### Requirement: Backpack Registry

`client/src/zoo/backpack.ts` MUST export `BackpackItem`, `BACKPACK_ITEMS:
readonly BackpackItem[]` holding exactly one entry — `{id: 'andean-hat',
art: ANDEAN_HAT_ART, grantedBy: 'montanas', earnedWhen: ['llama-peak4']}` —
and `earnedItems(records)`, which MUST return `[]` until `llama-peak4` is
filed and MUST return the hat once it is.

(Previously: `BACKPACK_ITEMS` was empty and `earnedItems` always returned
`[]`.)

#### Scenario: The hat is absent before llama-peak4 is filed

- GIVEN `Records` where `llama-peak4` is unfiled
- WHEN `earnedItems(records)` is called
- THEN it MUST return `[]`

#### Scenario: The hat is present once llama-peak4 is filed

- GIVEN `Records` where `llama-peak4` is filed
- WHEN `earnedItems(records)` is called
- THEN it MUST include the `andean-hat` entry

### Requirement: Octopus Phrase Reads as a Closing Once the Sector's Animal Is Recovered

The map's `discovered`-bubble phrase SHALL be chosen by a pure phrase
selector over `records`. When a sector carries more than one adventure
(`montañas`: sheep, then llama), the selector MUST pick the MOST RECENTLY
recovered adventure — the last matching entry in registry order whose
animal has been placed — not merely the first adventure that matches.
Before any of a sector's adventures is recovered, the phrase MUST remain
the existing onward-pointing line. Once at least one is recovered, the
phrase MUST read as that adventure's own closing line, and MUST update to a
later adventure's closing line once that one is also recovered. The phrase
MUST still render only through `CaptionedArt`, keeping `auditCaptions`
green.

(Previously: the lookup used the first matching adventure
[`ADVENTURES.find`], which was unobservably correct only because every
sector carried at most one adventure; `montañas` now carries two, so the
lookup MUST become "most recently recovered" [`ADVENTURES.filter(...).at(-1)`]
to ever surface the second adventure's closing line.)

#### Scenario: Before any adventure is recovered, the phrase still points onward

- GIVEN `duck-trail4` unfiled and the estanque resolved as
  `recentlyDiscovered`
- WHEN the phrase selector is evaluated for the estanque
- THEN it MUST equal the existing onward-pointing phrase

#### Scenario: With one of two adventures recovered, its own closing line shows

- GIVEN `sheep-hill4` filed and `llama-peak4` unfiled, for the montañas
  sector
- WHEN the phrase selector is evaluated for montañas
- THEN it MUST equal the sheep adventure's closing line

#### Scenario: With both adventures recovered, the later one's closing line shows

- GIVEN both `sheep-hill4` and `llama-peak4` filed
- WHEN the phrase selector is evaluated for montañas
- THEN it MUST equal the llama adventure's closing line, not the sheep
  adventure's

#### Scenario: The closing phrase still passes the caption audit

- GIVEN the map rendered via `renderToString` with an adventure recovered
- WHEN `auditCaptions` runs on the resulting HTML string
- THEN `uncaptioned` MUST be `[]`

## ADDED Requirements

### Requirement: Montañas Sector Opened With Two Adventures and Two Animals

`montañas.unlockedWhen` MUST return `true` exactly once `duck-trail4` is
filed — the first `unlockedWhen` in the registry that is neither
`alwaysOpen` nor `alwaysClosed`. Its `animals` array MUST hold `oveja`
(`appearsWhen: ['sheep-hill4']`) and `llama` (`appearsWhen:
['llama-peak4']`), each typed `ZooAnimal.id: ZooAnimalId`
(`detective-mode` "ZooAnimalId Widens the Zoo's Animal Vocabulary"). The
llama's placement offset MUST sit higher (a smaller or negative `dy`) than
the sheep's, matching the cumbre standing above the ladera.

#### Scenario: Montañas stays closed until duck-trail4 is filed

- GIVEN `Records` where `duck-trail4` is unfiled
- WHEN `montañas.unlockedWhen(records)` is evaluated
- THEN it MUST return `false`

#### Scenario: Montañas opens once duck-trail4 is filed

- GIVEN `Records` where `duck-trail4` is filed
- WHEN `montañas.unlockedWhen(records)` is evaluated
- THEN it MUST return `true`

#### Scenario: Each animal appears only after its own adventure's last level

- GIVEN `sheep-hill4` filed and `llama-peak4` unfiled
- WHEN `animalPlacements(montañas, records)` is read
- THEN the sheep MUST be present and the llama MUST be absent

#### Scenario: The llama stands higher than the sheep

- GIVEN both animals placed
- WHEN their placement offsets are compared
- THEN the llama's `dy` MUST place it higher on the sheet than the sheep's

### Requirement: Adventure Backdrop Registry Re-Keyed to the Adventure

The backdrop registry SHALL be keyed by `AdventureId`
(`Partial<Record<AdventureId, AdventureBackdrop>>`), not `SectorId`, so one
sector may carry more than one backdrop. `Adventure` SHALL gain a required
`id: AdventureId`. `backdropFor(levelId)` MUST resolve through
`adventureFor(levelId).id`. The sheep adventure MUST resolve the ladera
backdrop with `channel: CHANNEL_STONE`; the llama adventure MUST resolve
the cordillera backdrop with `channel: CHANNEL_STONE`; the duck adventure
MUST continue resolving the lagoon backdrop with no `channel` field. A
level belonging to no adventure (a medusa level, `trail1..4`) MUST continue
to resolve `undefined`.

#### Scenario: The sheep adventure resolves the ladera with the stone channel

- GIVEN `sheep-hill2`'s level id
- WHEN `backdropFor` is called
- THEN it MUST return the ladera backdrop with `channel === CHANNEL_STONE`

#### Scenario: The llama adventure resolves the cordillera with the stone channel

- GIVEN `llama-peak2`'s level id
- WHEN `backdropFor` is called
- THEN it MUST return the cordillera backdrop with `channel ===
  CHANNEL_STONE`

#### Scenario: The duck adventure is unaffected by the re-key

- GIVEN a duck trail id
- WHEN `backdropFor` is called
- THEN it MUST return the lagoon backdrop with no `channel` field, byte-
  identical to before this change

#### Scenario: Unbacked levels still resolve undefined

- GIVEN a medusa level id and `trail1`
- WHEN `backdropFor` is called for each
- THEN both MUST return `undefined`
