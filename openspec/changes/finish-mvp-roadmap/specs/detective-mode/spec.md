# Delta for detective-mode

## ADDED Requirements

### Requirement: PISTAS Clarity Improves Without Changing Filing Semantics

The PISTAS rail MAY improve animation, labels, focus behavior, and visual clarity, but clue filing MUST remain tied to the existing trail-completion semantics rather than clue-light or mid-trace state.

#### Scenario: Completed trail files once
- GIVEN a trail has earned clue marks and then reaches route completion
- WHEN the completion signal resolves
- THEN its clue MUST appear in PISTAS exactly once
- AND the clarity animation MUST NOT create duplicate filing events

#### Scenario: Mid-trace clue clarity does not file
- GIVEN clue marks are visually highlighted before the route is complete
- WHEN the PISTAS rail renders
- THEN the clue MUST remain unfiled
- AND deduction state MUST remain unchanged

#### Scenario: PISTAS remains accessible after animation
- GIVEN a clue was filed into PISTAS
- WHEN the rail animation completes
- THEN the filed clue MUST have an accessible name and stable focus order

### Requirement: In-Level CaptionedArt Uses the Wooden Zoo-Sign Frame

LevelPlay MUST render the approved wooden-framed `CaptionedArt` sign inside playable level content for the docs/16 zoo-sign defect. Pulpito-only speech bubbles MUST NOT count as satisfying that in-level signage requirement.

#### Scenario: LevelPlay renders the approved sign inside playable content
- GIVEN a docs/16 sign-bearing level is rendered by `LevelPlay`
- WHEN playable level content appears
- THEN an approved wooden-framed `CaptionedArt` sign MUST exist inside the level scene
- AND the frame MUST surround the image and caption together
- AND the sign MUST NOT be provided only by Pulpito's speech bubble

#### Scenario: Image and caption semantics are preserved
- GIVEN the framed in-level sign renders
- WHEN caption auditing and accessibility checks inspect it
- THEN the sign MUST still expose one image paired with its caption
- AND no standalone word, duplicate caption, or imageless caption container MAY be introduced

#### Scenario: Pulpito-only bubbles remain separate
- GIVEN `AdventureIntro`, `AdventureClosing`, or map bubbles use `CaptionedArt` inside Pulpito's speech bubble
- WHEN U14 lands
- THEN those bubbles MAY keep their existing bubble framing
- AND they MUST NOT be treated as the missing in-level wooden sign frame
