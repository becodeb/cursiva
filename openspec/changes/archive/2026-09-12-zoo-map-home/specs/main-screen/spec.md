# Delta for Main Screen

## RENAMED Requirements

### Requirement: Exit Returns to Home Office → Exit Returns to the Zoo Map

(Reason: `client/src/screen/HomeScreen.tsx` and its mode registry are
retired; the zoo map (`zoo-map` capability) is the application's entry screen
and the destination every exit affordance now reaches.)
(Migration: no call-site signature changes — `GameScreenProps.onExit` stays
required and is still what a trail's and the deduction screen's back
controls invoke. `App.tsx`'s `goHome` is renamed `goToMap` and now resolves
`Shell` to `{ at: 'map' }` instead of `{ at: 'home' }`.)

## MODIFIED Requirements

### Requirement: Exit Returns to the Zoo Map

`GameScreenProps` SHALL carry a required `onExit: () => void` prop. Both exit
affordances inside the game shell — a trail's back control and the deduction
screen's back control — MUST invoke `onExit` instead of dispatching the
internal `back` action, so leaving any mode lands on the zoo map (`App`'s
`{ at: 'map' }` shell), never on the internal level map.
(Previously: `onExit` resolved to the home office, `App`'s `{ at: 'home' }`
shell rendering `HomeScreen`.)

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

#### Scenario: Finishing an adventure that belongs to a zoo sector exits to the map
- GIVEN a finished level id owned by a zoo sector
- WHEN the after-level decision resolves and `onExit` fires
- THEN the resulting `App` shell MUST be the zoo map, never the home office

### Requirement: Level Map Is a Development-Gated Route

The level map view MUST NOT be reachable through ordinary exit navigation. It
SHALL remain reachable only when `isDevMode()` is `true` or via an explicit
`?nivel=mapa` deep-link route, and while reachable it MUST continue to own
"Reiniciar progreso" and "Modo prueba: abrir todo".
(Previously: ordinary exit resolved to the home office; this requirement's
sole edit re-anchors that destination to the zoo map, which is the same
`App`-shell re-anchoring `Exit Returns to the Zoo Map` records above.)

#### Scenario: Ordinary exit never resolves to the internal map
- GIVEN `isDevMode()` is `false` and no `?nivel=` deep link is present
- WHEN the child exits a trail or the deduction screen
- THEN the resulting view MUST be the zoo map, never the internal level map

#### Scenario: Dev-gated map still owns reset and test mode
- GIVEN `isDevMode()` is `true` and the level map is reached
- WHEN the map renders
- THEN its "Reiniciar progreso" and "Modo prueba: abrir todo" controls MUST render as before
