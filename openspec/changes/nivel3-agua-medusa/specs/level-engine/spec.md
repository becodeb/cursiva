# Delta for Level Engine

## ADDED Requirements

### Requirement: Nivel 3 Trail Set Between f2-guirnalda and f2-colinas

Four levels SHALL occupy `LEVELS` between the existing `f2-guirnalda`
(retained id, retheme only) and `f2-colinas`: `f2-guirnalda` itself as
desafío 1, plus three new ids for desafíos 2–4, in that order. None of the
four MUST use an angular-peak path generator, and none but desafío 4 MUST
configure a timed obstacle (D5). The four MUST form a measurable
microprogression — decreasing per-cycle width and/or increasing cycle count
from desafío 1 to desafío 2 — and desafío 3 alone MUST vary width and/or
depth across its own cycles (per-cycle garland variant).

#### Scenario: Four ids sit between the two catalog anchors

- GIVEN `LEVELS` in catalog order
- WHEN the ids between `f2-guirnalda` and `f2-colinas` are read
- THEN exactly three new ids MUST appear, and `f2-guirnalda` MUST immediately
  precede the first of them

#### Scenario: No angular peak leaks into Nivel 3

- GIVEN the four Nivel 3 configs
- WHEN each config's path generator is inspected
- THEN none MUST be an angular-peak generator (e.g. `hills`, `crests`)

#### Scenario: Only desafío 4 carries a timed obstacle

- GIVEN the four Nivel 3 configs
- WHEN each config's hazard/obstacle field is inspected
- THEN desafíos 1–3 MUST configure none, and desafío 4 MUST configure at
  least one

### Requirement: Rhythm Instruction Survives the Wordless Shell

Desafío 1 (`f2-guirnalda`) MUST set `demo: true` and keep a positive
`feedback.metronomeBpm`, so that with its hint text suppressed by the
detective world's wordless shell (`detective-mode` "World Behaviours Gate on
inDetectiveWorld"), the rhythm instruction is still carried by the animated
demonstration and the metronome's beat cue at the start marker.

#### Scenario: Desafío 1 carries a demo and a metronome

- GIVEN `f2-guirnalda`'s config after the retheme
- WHEN `demo` and `feedback.metronomeBpm` are read
- THEN `demo` MUST be `true` and `metronomeBpm` MUST be greater than 0

### Requirement: Per-Cycle Garland Variant

`paths.ts` SHALL provide a garland variant accepting an array of
`{width, depth}` entries, one per cycle, in place of a scalar `cycles`,
preserving `garland`'s rounded-U cubic construction and emitting only
absolute `M`/`C` commands.

#### Scenario: Non-uniform cycles still emit only M/C

- GIVEN a per-cycle array with at least two differing `{width, depth}`
  entries
- WHEN the variant's output is scanned for path commands
- THEN only `M` and `C` MUST appear

#### Scenario: buildLevel derives valid checkpoints on non-uniform input

- GIVEN the per-cycle variant's output as a level's path
- WHEN `buildLevel.ts` derives checkpoints and the ideal band
- THEN both MUST be produced with no gap or overlap at the amplitude change
  between cycles

### Requirement: LevelConfig.goalArt

`LevelConfig` SHALL gain an optional `goalArt?: TraceStandingArt` field. When
present, it MUST determine the level's end-of-route art in place of the case
lamp. `LAMP`, `LAMP_ART`, and `caseState.lampOn` MUST remain unaffected by
this field's presence or absence.

#### Scenario: A level with goalArt uses it at the route's end

- GIVEN a level with `goalArt` set to the medusa art
- WHEN `LevelPlay` computes the value passed as the canvas's `endArt`
- THEN it MUST equal the level's `goalArt`, not the lamp

#### Scenario: A case trail without goalArt keeps the lamp

- GIVEN a case trail with no `goalArt`
- WHEN the same value is computed
- THEN it MUST remain the case lamp, on or off per its trail-end latch

### Requirement: Nivel 3 Positional-Unlock Migration

`game/migrateNivel3.ts`, in `migrateDuckCase.ts`'s shape, SHALL ship before
the four-level insertion and MUST copy `f2-colinas`'s existing unlock state
forward so that inserting the three new ids does not relock `f2-colinas` for
a child who already had it unlocked. The migration MUST be pure, idempotent,
copy-forward only, MUST NOT delete or mutate any existing record, and MUST
return only changed entries.

#### Scenario: An unlocked f2-colinas is not relocked by the insertion

- GIVEN a stored payload with `f2-guirnalda.approvals` at or above the unlock
  threshold and no Nivel 3 desafío 2–4 records
- WHEN the migration runs, its output is merged, and `isUnlocked('f2-colinas')`
  is checked against the new four-level catalog
- THEN it MUST remain `true`

#### Scenario: Migration returns only changed entries and never deletes

- GIVEN a payload where the migration has already run once
- WHEN it runs again
- THEN it MUST return an empty change set and MUST NOT remove or alter any
  existing record

## MODIFIED Requirements

### Requirement: PISTAS Rail Chrome

`LevelPlay` chrome SHALL render the `PISTAS` rail in the DOM beside the
canvas, outside the `0 0 1000 600` viewBox, visible during play on a case
trail (`isCaseTrail(level)` true) only — never for a detective-world level
with no clue (proposal decision #2, D1). The rail's only copy MUST be the
literal word `PISTAS`, hand-drawn as SVG capitals — no additional text and no
font subsystem (D6).
(Previously: gated implicitly on `isDetectiveTrail = !!level.clue`, before
world membership and case membership were distinct concepts.)

#### Scenario: Rail renders beside the canvas on a case trail

- GIVEN `LevelPlay` rendered during an active case trail
- WHEN the DOM structure is inspected
- THEN the `PISTAS` rail element MUST exist outside the canvas's `<svg>`
  viewBox content and MUST be present alongside the canvas in the chrome

#### Scenario: Rail carries no copy beyond PISTAS

- GIVEN the rendered rail markup
- WHEN its text content is inspected
- THEN the only literal word present MUST be `PISTAS`, with no other prose

#### Scenario: A Nivel 3 world-only level renders no rail

- GIVEN a Nivel 3 level with `inDetectiveWorld` true and `isCaseTrail` false
- WHEN `LevelPlay` renders it
- THEN no `PISTAS` rail element MUST be present anywhere in the chrome
