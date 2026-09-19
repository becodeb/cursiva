# Delta for zoo-map

## ADDED Requirements

### Requirement: Progression Stars, Unlocks, and Map Return Stay Consistent

The zoo map MUST derive stars, sector unlocks, next adventure, recovered animals, and return-to-map state from the same persisted level records without changing deduction semantics.

#### Scenario: Stars and unlocks use the same filed records
- GIVEN a record set with the final level of a sector filed
- WHEN stars, unlocked sectors, recovered animals, and next adventure are computed
- THEN every result MUST reflect that same record set
- AND no result MAY depend on transient screen state

#### Scenario: Finishing a playable level returns to the map
- GIVEN a child completes a non-deduction adventure level
- WHEN the close or success action resolves
- THEN the next view MUST be the zoo map
- AND the following tap MUST choose the first unfiled adventure for that sector

#### Scenario: Deduction semantics are unchanged
- GIVEN detective clues are filed or a case remains open
- WHEN zoo progression recomputes stars and unlocks
- THEN no deduction screen MAY open unless the existing deep-link or case route requested it
