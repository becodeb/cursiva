# Delta for Zoo Map

## MODIFIED Requirements

### Requirement: Sector-to-Adventure Mapping

`estanque.adventureIds` MUST equal, in order: `duck-trail1`, `duck-trail2`,
`duck-trail3`, `duck-trail4`, `f2-guirnalda`, `f2-agua2`, `f2-agua3`,
`f2-agua4`. `montanas.adventureIds` MUST equal, in order, `sheep-hill1..4`
then `llama-peak1..4`. `entrada.adventureIds` MUST equal, in order,
`glass1..4` then `sand1..4`, and `entrada.unlockedWhen` MUST always return
`true`. `nocturna.adventureIds` MUST equal, in order, `night1..4`, and
`nocturna.unlockedWhen` MUST return `true` exactly once `llama-peak4` is
filed. `arena.adventureIds` MUST equal, in order, `snake1..4`, and
`arena.unlockedWhen` MUST return `true` exactly once `night4` is filed.
`bosque` and `sendero` MUST have empty `adventureIds` and MUST render
fogged (or, for `sendero`, have no `hit` to fog at all) for every input.

(Previously: `bosque` and `arena` were the two sectors asserted to carry
empty `adventureIds` and stay fogged for every input; `docs/13` §8 row E
promotes `arena` out of that set. `design.md` §7.1 narrows the set this
requirement asserts to `bosque` and `sendero` — row F's own sector plus
the scenery-only sendero, which has always carried empty `adventureIds`
and an always-false `unlockedWhen`.)

#### Scenario: Estanque's eight adventures are in the exact order

- GIVEN `estanque.adventureIds`
- WHEN read
- THEN it MUST equal the eight ids above, in that order

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

- GIVEN `arena.adventureIds` and `Records` where `night4` is unfiled, then
  filed
- WHEN `arena.unlockedWhen` is evaluated for each
- THEN it MUST return `false` then `true`, and `adventureIds` MUST equal
  `snake1, snake2, snake3, snake4`

#### Scenario: Bosque and sendero remain empty and closed for every input

- GIVEN `bosque` and `sendero`
- WHEN `adventureIds` and `unlockedWhen` are checked for any `Records`
- THEN `adventureIds` MUST be empty and `unlockedWhen` MUST return `false`
  for both

### Requirement: Backpack Registry

`client/src/zoo/backpack.ts` MUST export `BackpackItem`, `BACKPACK_ITEMS:
readonly BackpackItem[]` holding exactly four entries — the existing
`{id: 'andean-hat', art: ANDEAN_HAT_ART, grantedBy: 'montanas',
earnedWhen: ['llama-peak4']}`, `{id: 'lupa', art: CARRIER_LENS_ART,
grantedBy: 'entrada', earnedWhen: ['sand4']}`, and `{id: 'linterna', art:
SECTOR_FLASHLIGHT_ART, grantedBy: 'nocturna', earnedWhen: ['night4']}` —
plus `{id: 'carrito', art: CART_ART, grantedBy: 'arena', earnedWhen:
['snake4']}` — and `earnedItems(records)`, which MUST return only the
subset of these four whose `earnedWhen` id is filed.

(Previously: `BACKPACK_ITEMS` held exactly three entries.)

#### Scenario: Each item is absent before its own earnedWhen id is filed

- GIVEN `Records` where none of `llama-peak4`, `sand4`, `night4`,
  `snake4` is filed
- WHEN `earnedItems(records)` is called
- THEN it MUST return `[]`

#### Scenario: The cart is present once snake4 is filed

- GIVEN `Records` where `snake4` is filed and the other three are not
- WHEN `earnedItems(records)` is called
- THEN it MUST include `carrito` and MUST NOT include `andean-hat`,
  `lupa`, or `linterna`

#### Scenario: earnedItems returns exactly the earned subset

- GIVEN `Records` where all four ids are filed
- WHEN `earnedItems(records)` is called
- THEN it MUST include all four entries and no others

## ADDED Requirements

### Requirement: ZooAnimalId Widens to Include the Víbora, and the Recovered Snake Stands in the Arena

`ZooAnimalId` SHALL widen to `AnimalId | 'oveja' | 'llama' | 'vibora'`.
`ZOO_ANIMAL_ART.vibora` MUST equal `SECTOR_ADVENTURE_ART.snakeMedium` —
the middle-sized snake. `arena.animals` MUST hold exactly one entry,
`{id: 'vibora', appearsWhen: ['snake4']}`, placed at `arena.animalSpot`
via `STANDING_GRIP`, the same mechanism every other recovered animal
uses.

#### Scenario: The víbora appears once snake4 is filed

- GIVEN `snake4` filed
- WHEN `animalPlacements(arena, records)` is read
- THEN the víbora MUST be present

#### Scenario: The víbora is absent before snake4 is filed

- GIVEN `snake4` unfiled
- WHEN `animalPlacements(arena, records)` is read
- THEN the víbora MUST be absent

#### Scenario: ZOO_ANIMAL_ART resolves vibora to the middle snake

- GIVEN `ZOO_ANIMAL_ART.vibora`
- WHEN compared to `SECTOR_ADVENTURE_ART.snakeMedium`
- THEN they MUST be the same art reference

### Requirement: The Snake Adventure Carries No closingBeat

The `snake` adventure row (`zoo/adventures.ts`) MUST NOT declare a
`closingBeat`, for a structural reason as well as a narrative one:
`mapBubble`'s selector filters on `a.animal !== undefined`, so ANY
adventure that recovers an animal (`AdventureSubject`'s `animal` branch)
already carries `docs/13` §5 item 6 through the shipped map bubble the
moment its animal is placed — the víbora stands in the sector and the
Pulpito's line closes it, exactly as the duck, the sheep and the llama
do, none of which carries a `closingBeat`. The once-per-story closing
screen (`main-screen`'s `close` route) stays reserved for the entrance's
sand adventure alone, which recovers no animal and therefore has no
other way to carry that beat.

#### Scenario: The snake adventure declares no closingBeat

- GIVEN the `snake` row in `ADVENTURES`
- WHEN its `closingBeat` field is read
- THEN it MUST be absent

#### Scenario: Filing snake4 changes arena's map-bubble phrase to the víbora's closing line

- GIVEN `snake4` filed
- WHEN the phrase selector (`mapBubble`) is evaluated for `arena`
- THEN it MUST equal the víbora adventure's own closing line, not the
  existing onward-pointing phrase

#### Scenario: resolveCloseAction never fires for a snake level

- GIVEN any of `snake1..4` finished
- WHEN `resolveCloseAction` (`main-screen` capability) is evaluated
- THEN it MUST return `null`, exactly as for `night4` and every other
  adventure with no `closingBeat`
