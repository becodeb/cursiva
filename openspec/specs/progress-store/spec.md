# Progress Store Specification

## Purpose

Persists per-letter progress percentages behind an interface, with a `LocalProgressStore` implementation on `localStorage`.

## Requirements

### Requirement: ProgressStore Interface

`ProgressStore` MUST expose `getProgress(letterId): number` and `setProgress(letterId, value: number)`. `setProgress` MUST clamp the value to the range 0–100 and MUST persist it so `getProgress` returns it from a fresh store instance.

#### Scenario: Round trip

- GIVEN a stored value of 85 for `a`
- WHEN a fresh `LocalProgressStore` instance reads `getProgress('a')`
- THEN it MUST return 85

#### Scenario: Values clamped

- GIVEN `setProgress('c', 140)` and `setProgress('a', -5)`
- WHEN progress is read
- THEN `c` MUST read 100 and `a` MUST read 0

### Requirement: Per-Letter Isolation

Progress MUST be keyed by letter id; updating one letter MUST NOT affect any other letter's stored value.

#### Scenario: Independent letters

- GIVEN stored progress `a` = 85, `c` = 40
- WHEN `setProgress('c', 60)` runs
- THEN `getProgress('a')` MUST still return 85

### Requirement: localStorage Persistence

`LocalProgressStore` MUST read and write through `localStorage` under a namespaced key, MUST preserve values across page reloads, and MUST degrade to in-memory storage — no throw, no crash — when `localStorage` is unavailable (e.g. privacy mode). Unparseable stored payloads MUST be treated as empty progress.

#### Scenario: Survives reload

- GIVEN `setProgress('a', 90)`
- WHEN the page reloads
- THEN `getProgress('a')` MUST return 90

#### Scenario: Storage unavailable

- GIVEN `localStorage` throws on every access
- WHEN `setProgress`/`getProgress` run
- THEN they MUST behave as in-memory storage and MUST NOT throw

#### Scenario: Corrupt payload

- GIVEN the stored payload is not valid JSON
- WHEN a store instance reads it
- THEN every letter MUST read 0 and writes MUST overwrite the corrupt payload