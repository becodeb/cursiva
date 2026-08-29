# Delta for `trace-canvas`

## ADDED Requirements

### Requirement: Checkpoint Overlay Gate

The canvas SHALL accept an optional `showCheckpoints` prop and SHALL render the checkpoint overlay when `(isDevMode() || showCheckpoints) && devCheckpoints && devIdeal`. When the overlay renders outside dev mode (`isDevMode()` false), the live score line MUST be hidden — score display stays dev-only.

#### Scenario: Toggle reveals overlay in production

- GIVEN a non-dev session with `showCheckpoints` true and dev checkpoint data loaded
- WHEN the canvas renders
- THEN the checkpoint overlay MUST render and the live score line MUST NOT render

#### Scenario: Overlay stays hidden when toggle is off

- GIVEN a non-dev session with `showCheckpoints` false
- WHEN the canvas renders
- THEN the overlay MUST NOT render

#### Scenario: Dev mode enables overlay regardless of toggle

- GIVEN a dev session with `showCheckpoints` false and dev checkpoint data loaded
- WHEN the canvas renders
- THEN the overlay MUST render with the live score line (dev behavior unchanged)