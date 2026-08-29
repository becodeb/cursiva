# Delta for `main-screen`

## ADDED Requirements

### Requirement: Combo Picker

The screen SHALL render a combo picker group listing every ordered pair of currently-registered hand-drawn letters, and SHALL launch the selected pair's flow — guided demo (Mode 1) then free trace (Mode 2) — with the same selected/mode flow as the letter picker.

#### Scenario: Selecting a pair starts its flow

- GIVEN the main screen with registered letters `a`–`f`
- WHEN the user selects pair `a c`
- THEN the guided-trace flow for the `ac` combination MUST start

#### Scenario: Reversed pairs are distinct entries

- GIVEN the combo picker listing ordered pairs
- WHEN the user selects `c a`
- THEN the flow for the `ca` combination MUST start, distinct from `ac`

### Requirement: Checkpoint Overlay Toggle

The screen SHALL render a toggle button labeled verbatim "Mostrar puntos del trazo", and SHALL thread its state into both guided and free trace modes and into the launched selection (letter or combo), so the overlay choice carries through the whole flow.

#### Scenario: Toggle ON carries into the launched flow

- GIVEN the toggle ON with dev checkpoint data available
- WHEN the user selects a letter or pair
- THEN the launched flow MUST render the checkpoint overlay in both modes

#### Scenario: Toggle OFF keeps overlay hidden in production

- GIVEN the toggle OFF in a non-dev session
- WHEN the user selects a letter or pair
- THEN the checkpoint overlay MUST NOT render in either mode