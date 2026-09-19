# Delta for progress-store

## ADDED Requirements

### Requirement: Fresh glass1 Reopen Migration Safety

The progress store MUST migrate a fresh profile that reopens `glass1` without duplicating records, changing unrelated levels, or treating an empty/missing payload as contaminated progress.

#### Scenario: Fresh glass1 reopen is idempotent
- GIVEN no stored progress or an empty progress payload
- WHEN `glass1` is opened, saved, and opened again
- THEN exactly one valid `glass1` record MUST be present
- AND unrelated level records MUST remain absent

#### Scenario: Fresh migration does not invent completions
- GIVEN a fresh profile with no completed levels
- WHEN migration runs during `glass1` startup
- THEN no level other than the active `glass1` attempt MAY become filed

### Requirement: Previously Seeded sand4 Progress Is Preserved Non-Destructively

The progress store MUST preserve profiles that already contain a structurally valid `sand4` record from the previous migration behavior. This preservation contract applies to known valid level records, not arbitrary malformed, duplicate, or out-of-contract localStorage fields.

#### Scenario: Existing sand4 progress survives read and save
- GIVEN localStorage already contains a structurally valid `sand4` record and other known level records
- WHEN the real progress store opens, saves a valid `glass1` update, and opens again
- THEN the valid update MUST be written
- AND the existing `sand4` domain fields MUST NOT be deleted or semantically changed
- AND `estanque` MUST remain unlocked because that existing progress is still present

#### Scenario: Existing sand4 blocks synthetic reseeding
- GIVEN a profile already contains a valid `sand4` record
- WHEN the entrance migration runs
- THEN no replacement `sand4` record MAY be generated
- AND other known valid records MUST keep their existing level semantics
