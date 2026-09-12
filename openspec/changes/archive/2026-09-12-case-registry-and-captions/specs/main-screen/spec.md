# Delta for Main Screen

## ADDED Requirements

### Requirement: Exit Returns to Home Office

`GameScreenProps` SHALL gain a required `onExit: () => void` prop. Both exit affordances inside the game shell — a trail's back control and the deduction screen's back control — MUST invoke `onExit` instead of dispatching the internal `back` action, so leaving any mode lands on the home office (`App`'s home shell), never on the internal level map.

#### Scenario: Omitting onExit is a type error
- GIVEN a `GameScreen` call site with `onExit` omitted
- WHEN the project is type-checked
- THEN it MUST fail to compile

#### Scenario: A trail's back control calls onExit
- GIVEN `LevelPlay` rendered inside `GameScreen` with a given `onExit`
- WHEN its exposed `onBack` prop is invoked directly
- THEN `onExit` MUST be called, and no dispatch to the internal map view MUST occur

#### Scenario: The deduction screen's back control calls onExit
- GIVEN `Deduction` rendered inside `GameScreen` with a given `onExit`
- WHEN its exposed `onBack` prop is invoked directly
- THEN `onExit` MUST be called

### Requirement: Level Map Is a Development-Gated Route

The level map view MUST NOT be reachable through ordinary exit navigation. It SHALL remain reachable only when `isDevMode()` is `true` or via an explicit `?nivel=` deep-link route, and while reachable it MUST continue to own "Reiniciar progreso" and "Modo prueba: abrir todo".

#### Scenario: Ordinary exit never resolves to the map
- GIVEN `isDevMode()` is `false` and no `?nivel=` deep link is present
- WHEN the child exits a trail or the deduction screen
- THEN the resulting view MUST be the home office, never the level map

#### Scenario: Dev-gated map still owns reset and test mode
- GIVEN `isDevMode()` is `true` and the level map is reached
- WHEN the map renders
- THEN its "Reiniciar progreso" and "Modo prueba: abrir todo" controls MUST render as before
