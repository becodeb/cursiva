# Delta for Level Engine

## ADDED Requirements

### Requirement: Optional Reveal Field on LevelConfig

`LevelConfig` SHALL gain an optional `reveal?: RevealConfig` field — a
discriminated union on `mode`, `{ mode: 'erase'; cols; rows; radius }` or
`{ mode: 'light'; cols; rows; radius; objects: readonly RevealObject[] }` —
additive and absent on every level that predates it, the same convention
`goalArt`, `vertexArt`, and `detectiveWorld` already established. `reveal`
introduces NO separate completion-threshold field: an erase level's
completion is gated by the level's own `rules.minAccuracy`, the same field
and the same accuracy pillar every other free level already uses. `reveal`'s
presence MUST NOT change `kind`: a reveal level's `kind` remains `'free'`,
and only a `light` level MUST carry `objects` — an erase level with an
`objects` list, or a light level without one, MUST fail to compile.

#### Scenario: A pre-existing free level is unaffected

- GIVEN `f1-libre`'s config
- WHEN inspected after this change
- THEN it MUST carry no `reveal` field and its free-draw coverage mechanic
  MUST be unchanged

#### Scenario: A reveal level's kind stays free

- GIVEN any of the twelve reveal levels
- WHEN its `kind` is read
- THEN it MUST equal `'free'`, never a new `LevelKind` member

#### Scenario: The mode discriminant is enforced at compile time

- GIVEN a `reveal` value of `{ mode: 'erase', ..., objects: [...] }` or of
  `{ mode: 'light', ... }` with no `objects`
- WHEN the project is type-checked
- THEN it MUST fail to compile

### Requirement: `kind: 'free'` Means "No Route," Not "The Warm-Up"

Thirteen levels SHALL carry `kind: 'free'` after this change: `f1-libre`
(no `reveal` field) and the twelve reveal levels (each with a `reveal`
field). `catalog.test.ts`'s free-level assertion MUST read as a compound
claim: exactly one free level carries no `reveal` field, with id `f1-libre`;
the catalog's `LEVELS[0]` is `glass1`, not `f1-libre`.

(Previously: `catalog.test.ts:253` asserted `free.map(l => l.id)).toEqual(['f1-libre'])`
AND `LEVELS[0].id === 'f1-libre'` — both true only while no other
`kind: 'free'` level existed and the entrance did not yet exist.
`design.md` §5.1, ratified amendment A1, supersedes the proposal's own
internally contradictory claim that `LEVELS[0]` stays `f1-libre`: the
insertion ahead of `f1-libre`, `migrateEntrance`'s reason to exist, and
`isUnlocked`'s `index === 0` branch are all load-bearing on `LEVELS[0]`
becoming `glass1`.)

#### Scenario: Exactly one free level carries no reveal field

- GIVEN all `kind: 'free'` levels in the catalog
- WHEN filtered to those with no `reveal` field
- THEN exactly one MUST remain, and its id MUST be `f1-libre`

#### Scenario: LEVELS[0] is glass1

- GIVEN `LEVELS` in catalog order
- WHEN its first entry's id is read
- THEN it MUST equal `glass1`, not `f1-libre`

#### Scenario: Twelve free levels carry a reveal field

- GIVEN the twelve `glass`/`sand`/`night` levels
- WHEN each is inspected
- THEN each MUST carry a `reveal` field

### Requirement: Twelve Reveal-Grid Levels Occupy Fixed Catalog Positions

`glass1..4` and `sand1..4` SHALL immediately precede `f1-libre` in the
catalog — eight entrance levels ahead of `f1-libre` — `glass1..4` followed
immediately by `sand1..4` in that order, so the catalog's `LEVELS[0]` is
`glass1`. `night1..4` SHALL be the last four entries of `PHASE_1`, between
`llama-peak4` and `f2-guirnalda`. `catalog.test.ts`'s `EXPECTED_IDS` MUST
include all twelve ids at these exact positions, and none of the twelve
MUST configure a `paths` array — `paths: []` for all twelve, consistent
with a routeless level.

#### Scenario: The catalog opens with the eight entrance levels

- GIVEN `LEVELS` in catalog order
- WHEN its first eight entries are read
- THEN they MUST equal `glass1, glass2, glass3, glass4, sand1, sand2,
  sand3, sand4`, immediately followed by `f1-libre`

#### Scenario: glass1..4 immediately precede sand1..4

- GIVEN `LEVELS` in catalog order
- WHEN the ids between the last glass id and the first sand id are read
- THEN there MUST be none — `sand1` MUST immediately follow `glass4`

#### Scenario: night1..4 sit between llama-peak4 and f2-guirnalda

- GIVEN `PHASE_1`'s ids in order
- WHEN the ids between `llama-peak4` and `f2-guirnalda` are read
- THEN they MUST equal `night1, night2, night3, night4`, in that order

#### Scenario: All twelve configure no path

- GIVEN the twelve reveal levels
- WHEN each config's `paths` field is read
- THEN it MUST equal `[]`

### Requirement: Pedagogical Progression Invariant Per Adventure

Within `glass1..4`, within `sand1..4`, and within `night1..4`,
INDEPENDENTLY: `rules.minAccuracy` SHALL be non-decreasing step to step and
`reveal.radius` SHALL be non-increasing step to step. `night`'s
hidden-object count SHALL additionally be non-decreasing step to step
(`night1`: one object; `night4`: three). NO ordering is required BETWEEN
adventures — not `sand1` against `glass4`, and not `night1` against
`sand4`.

(`design.md` §5.4, ratified amendment A2, drops the proposal's
cross-adventure rule `night1.radius ≤ sand4.radius`: an erase radius
ACCUMULATES cleared area across an attempt while a light radius does not
persist anything, so the two are not comparable quantities, and holding
`night1` — the night sector's own first wide accessible challenge — to a
tolerance derived from a different mechanic's radius would be arithmetic
theatre, not a pedagogical constraint.)

#### Scenario: glass's minAccuracy rises and radius falls, step to step

- GIVEN `glass1..4` in catalog order
- WHEN `rules.minAccuracy` and `reveal.radius` are compared step to step
- THEN `minAccuracy` MUST be non-decreasing and `radius` MUST be
  non-increasing

#### Scenario: sand's own progression is independent of glass

- GIVEN `sand1..4` in catalog order, and separately `sand1`'s `reveal.radius`
  compared to `glass4`'s
- WHEN `sand1..4`'s own `minAccuracy`/`radius` sequence is checked, and the
  cross-adventure comparison is attempted
- THEN `sand1..4`'s own sequence MUST satisfy the same within-adventure
  rule, and NO ordering MUST be asserted or required between `sand1` and
  `glass4`

#### Scenario: night's own progression is independent of sand

- GIVEN `night1..4`'s own `radius`/object-count sequence, and separately
  `night1`'s `reveal.radius` compared to `sand4`'s
- WHEN `night1..4`'s own sequence is checked, and the cross-adventure
  comparison is attempted
- THEN `night1..4`'s own sequence MUST satisfy the within-adventure rule
  plus the non-decreasing object count, and NO ordering MUST be asserted or
  required between `night1` and `sand4`

#### Scenario: night's object count rises step to step

- GIVEN `night1..4`'s hidden-object counts
- WHEN compared step to step
- THEN they MUST be non-decreasing

### Requirement: No Demo on Any of the Twelve

None of the twelve reveal-grid `LevelConfig`s MUST set `demo: true`; the
mechanic demonstrates itself on the first touch (`docs/13` §2's own
"relación acción-consecuencia"), and a routeless level has no route to
animate.

#### Scenario: No reveal-grid config sets demo

- GIVEN the twelve reveal-grid configs
- WHEN each is inspected
- THEN `demo` MUST be `false` or absent on every one

### Requirement: Docs §6/§14 Checklist Coverage for the Twelve Reveal-Grid Levels

Each of the twelve `LevelConfig`s SHALL populate, in terms `docs/13` §6's
and `docs/14` §14's per-level checklist can be read off directly: start
zone (`standingHintFor`'s existing routeless "Empezá donde quieras",
unaffected by `reveal`), area-to-cover in place of expected trajectory
(`reveal.cols/rows` plus `rules.minAccuracy` for erase; the hidden-object
list for light), tolerance (`reveal.radius`, tightening across the four
steps per adventure), error conditions (none by construction —
`resetOnContact: false` on every one of the twelve, since a routeless level
has no wall to reset from), restart (the existing retry path; the erase set
and the light latch are both discarded with the attempt), help animation
(no `demo`, per the requirement above), and completion criterion
(`rules.minAccuracy` for erase, the object latch for light). Visual response
to contact is NOT expressed by `LevelConfig` — it is satisfied by the
`reveal-grid` and `trace-canvas` capabilities' own render requirements. The
narrative transition is NOT expressed by any `LevelConfig` field — it is
satisfied by `main-screen`'s narrative-entry and closing requirements.

#### Scenario: Every reveal-grid LevelConfig answers the engine-owned checklist items

- GIVEN the twelve `LevelConfig`s
- WHEN each is inspected
- THEN `reveal.cols`, `reveal.rows`, `reveal.radius`, `rules.minAccuracy`,
  and (for `light`) a hidden-object list MUST all be defined as specified

#### Scenario: resetOnContact stays off on every one of the twelve

- GIVEN the twelve `LevelConfig`s
- WHEN `resetOnContact` is read on each
- THEN it MUST equal `false` on every one, since a routeless level has no
  wall-contact error to reset from

#### Scenario: The narrative transition is not claimed by LevelConfig

- GIVEN the twelve `LevelConfig`s
- WHEN scanned for any field naming a narrative transition
- THEN none MUST exist

### Requirement: migrateEntrance Copy-Forward Positional-Unlock Migration

`game/migrateEntrance.ts`, in `migrateDuckCase.ts`'s and
`migrateNivel3.ts`'s exact three-part shape (declarative table, per-field
merge policy, pure function), SHALL seed AT MOST TWO records for a child
whose `LevelProgressStore` (`cursiva.levels.v1`) already has records:
`sand4` (`f1-libre`'s new predecessor, seeded whenever the store is
non-empty and `sand4` has no record yet) and `night4` (`f2-guirnalda`'s new
predecessor, seeded only when `llama-peak4` already meets
`APPROVALS_TO_UNLOCK` and `night4` has no record yet). The migration MUST be
pure, copy-forward only, MUST NOT delete or mutate any existing record, MUST
run at most once per id, and MUST return only the entries it changed.

A returning child keeps EVERY existing unlock AND still reaches the
entrance's narrative opening through ordinary play — the two are not in
tension. `nextAdventure`/`isFiled` (the zoo map's own routing, `zoo-map`
capability), never `isUnlocked`, decide what a child plays next, and
`entrada.adventureIds.find(id => !isFiled(...))` resolves to `glass1`
regardless of what this migration seeds. The migration's real stake is
`estanque.unlockedWhen`, which stops being `alwaysOpen` in this change: a
returning child who had the estanque open MUST still have it open after
migration, because `estanque.unlockedWhen` now reads `isFiled(records,
'sand4')`.

(`design.md` §8.1, ratified amendment A4, retires the proposal's question 4
dilemma: the proposal estimated a twelve-record migration and framed
"keep every unlock" versus "see the opening" as a forced choice. Neither
holds — `isUnlocked` is positional over the WHOLE catalog, so inserting
ahead of an id only demotes that id's OWN successor chain, and the twelve
inserted ids were never unlocked before, so leaving them unseeded is not a
demotion. Only `f1-libre`'s and `f2-guirnalda`'s successor chains needed
protecting, which is two records, not twelve.)

#### Scenario: A mid-campaign payload keeps its estanque open

- GIVEN a stored payload where `estanque` was open under the pre-existing
  `alwaysOpen` rule (any non-empty payload) and no entrance/night records
- WHEN the migration runs, its output is merged, and
  `estanque.unlockedWhen(mergedRecords)` is evaluated
- THEN it MUST return `true`

#### Scenario: A mid-campaign payload's phase-2 chain is not demoted

- GIVEN a stored payload with `llama-peak4` meeting `APPROVALS_TO_UNLOCK`
  and no `night4` record
- WHEN the migration runs, its output is merged, and `isUnlocked` is
  checked against the new catalog for the level that used to follow
  `llama-peak4`
- THEN it MUST return `true`

#### Scenario: A returning child still reaches the entrance's opening

- GIVEN a stored payload migrated by the scenarios above
- WHEN `nextAdventure(entrada, mergedRecords)` is evaluated
- THEN it MUST return `glass1`, exactly as for a fresh install

#### Scenario: Migration returns only changed entries and never mutates a source record

- GIVEN a payload where the migration has already run once
- WHEN it runs again
- THEN it MUST return an empty change set and MUST NOT alter or remove any
  existing record

#### Scenario: A fresh install with no prior records is unaffected

- GIVEN an empty stored payload
- WHEN the migration runs
- THEN it MUST return an empty change set — there is nothing to migrate

### Requirement: Comma-Separated Progress Seeding Flag

`?debug=progreso:<id>,<id>,…`, parsed by a pure exported function in
`canvas/devMode.ts`, SHALL be dev-gated exactly like `pato-recuperado`
(`devMode.ts`) because it writes real persisted `LevelProgressStore`
records: when active, it MUST seed a filed record for each comma-separated
id listed, generalizing the single-boolean `pato-recuperado` shape to an
arbitrary id list. `?debug=pato-recuperado` MUST remain byte-identical in
behaviour after this change.

#### Scenario: Parsing progreso seeds filed records for exactly the listed ids

- GIVEN `?debug=progreso:sand4,night2`
- WHEN the flag is applied
- THEN `LevelProgressStore` MUST hold filed records for exactly `sand4` and
  `night2`

#### Scenario: The parser is pure and DOM-free

- GIVEN the parser called directly with a query string
- WHEN inspected
- THEN it MUST require no `window` access and no component context

#### Scenario: pato-recuperado is unchanged

- GIVEN `?debug=pato-recuperado`
- WHEN applied
- THEN it MUST continue to seed exactly the duck record, byte-identical to
  before this change
