# Delta for Detective Mode

## ADDED Requirements

### Requirement: ZooAnimalId Widens the Zoo's Animal Vocabulary

`detective/assets.ts` SHALL export `ZooAnimalId = AnimalId | 'oveja' |
'llama'` and `ZOO_ANIMAL_ART: Readonly<Record<ZooAnimalId, ArtImage>>`,
built by spreading `ANIMAL_ART` (preserving referential identity for every
existing entry) and adding `oveja`/`llama`. `SECTOR_ADVENTURE_ART.sheep`
MUST also be registered in this module, mirroring the already-registered
`SECTOR_ADVENTURE_ART.llama`. `AnimalId`, `ANIMAL_ART`,
`Deduction.tsx`'s `ANIMAL_LABEL` (`Record<AnimalId, string>`), `cases.ts`,
and `ClueKind` MUST remain byte-identical to `main` — the deduction's
exhaustive answer set is not widened by this change (`docs/13` §4 decision
1).

#### Scenario: Existing animal art keeps its identity

- GIVEN `ZOO_ANIMAL_ART.pato` and `ANIMAL_ART.pato`
- WHEN compared by reference
- THEN they MUST be the exact same object

#### Scenario: The new animals resolve their registered art

- GIVEN `ZOO_ANIMAL_ART.oveja` and `ZOO_ANIMAL_ART.llama`
- WHEN read
- THEN they MUST equal `SECTOR_ADVENTURE_ART.sheep` and
  `SECTOR_ADVENTURE_ART.llama` respectively

#### Scenario: The deduction's answer set is untouched

- GIVEN `AnimalId`, `ANIMAL_ART`, `cases.ts`, and `ClueKind` after this
  change
- WHEN compared against `main`
- THEN each MUST be byte-identical, with no `'oveja'` or `'llama'` member
  added to `AnimalId`

### Requirement: Sheep and Llama Levels Stay Outside the Detective World

All eight sheep and llama levels (`sheep-hill1..4`, `llama-peak1..4`) MUST
report `isCaseTrail(level) === false` and `inDetectiveWorld(level) ===
false`: no clue mark, no `PISTAS` rail entry, no ink-only mud-coloured
rendering, and no wordless-shell suppression — their title, hint, and
result block MUST render exactly as any other non-world level's do.
`world.test.ts`'s pinned list of world-only levels requires no edit; none
of the eight MUST be added to it.

#### Scenario: None of the eight report world or case membership

- GIVEN each of the eight sheep/llama `LevelConfig`s
- WHEN `isCaseTrail` and `inDetectiveWorld` are evaluated
- THEN both MUST be `false` for all eight

#### Scenario: The pinned world-only list is unchanged

- GIVEN `world.test.ts`'s pinned list of world-only level ids
- WHEN compared against `main`
- THEN it MUST be identical — none of the eight sheep/llama ids MUST appear

#### Scenario: The ordinary shell renders for these levels

- GIVEN `sheep-hill1` rendered via `renderToString`
- WHEN the HTML string is inspected
- THEN its title and hint text MUST render, unlike a world-only level's
  wordless shell
