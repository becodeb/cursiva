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

### Requirement: Contaminated Progress Is Preserved Non-Destructively

The progress store MUST block newly bad migrations while preserving existing contaminated historical localStorage records for investigation and manual recovery.

#### Scenario: Contaminated payload survives read and save
- GIVEN localStorage already contains unexpected or duplicate progress fields
- WHEN the store opens and later saves a valid `glass1` update
- THEN the valid update MUST be written
- AND the unexpected historical data MUST NOT be deleted by migration

#### Scenario: New bad migration is rejected
- GIVEN a migration would overwrite unrelated filed levels or stars
- WHEN the store validates the migrated payload
- THEN the write MUST be refused or isolated
- AND the previous stored payload MUST remain recoverable