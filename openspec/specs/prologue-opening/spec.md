# Prologue Opening Specification

## Purpose

`docs/16_PROLOGO_EL_CUIDADOR.md` §4: beat 0, the caretaker's presentation.
Owns the single-responsibility opening screen shown before the zoo map on a
child's first visit — three chained fixed plates today, a documented swap
point for a `<video>` later — its derived (never persisted) "already seen"
gate, its always-visible skip, the `?nivel=` deep-link bypass, and the
on-demand dev route that reaches it regardless of the gate. It does not own
`AdventureIntro`/`AdventureClosing` themselves (`main-screen`), the four
entrance adventures' own script (`zoo-map`), or the zoo map it hands off to
(`zoo-map`).

## Requirements

### Requirement: PrologueOpening Is a Single-Responsibility Component

`screen/PrologueOpening.tsx` SHALL export a component whose entire public
contract is "show the opening, report when it is done": its only required
prop SHALL be `onDone: () => void`, and it MUST call `onDone` exactly once
— by reaching the last plate's tap, by the skip control, or by the future
`<video>` swap point's own completion/fallback. No caller MAY reach into
the component's internal state; the app's only coupling to it is this one
callback.

#### Scenario: The component's only public output is the onDone callback

- GIVEN `PrologueOpening` rendered with a given `onDone`
- WHEN every interactive path through it is exercised (last plate, skip)
- THEN `onDone` MUST be the only externally observable effect — no other
  callback or store write happens

#### Scenario: Swapping the internal render touches no caller

- GIVEN `PrologueOpening`'s internal plates replaced with a stub that
  calls `onDone` immediately
- WHEN every call site (`App.tsx`) is inspected
- THEN none MUST require a code change — the swap stays internal to the
  component's own file

### Requirement: Three Plates Carry the docs/16 §4 Lines Verbatim, in Order

The opening SHALL render three chained fixed plates, each following
`AdventureIntro`'s stage pattern (backdrop, octopus, speech bubble, one
short line, tap to advance) without modifying `AdventureIntro` itself
(`main-screen` "The Opening Reuses AdventureIntro's Stage Pattern Without
Modifying It"). Their lines, in order, MUST be exactly:

1. "¡Hola! Soy el Pulpito y cuido este zoológico."
2. "Todas las mañanas limpio los recintos."
3. "¿Me ayudás?"

Tapping the third plate MUST call `onDone`.

#### Scenario: The three lines render in order, verbatim

- GIVEN `PrologueOpening` rendered via `renderToString`
- WHEN each plate is advanced by a tap in turn
- THEN the three lines MUST appear in the exact order and wording above

#### Scenario: Tapping the last plate ends the opening

- GIVEN the third plate showing
- WHEN it is tapped
- THEN `onDone` MUST be called exactly once

#### Scenario: Every plate's text passes the caption audit

- GIVEN each of the three plates rendered via `renderToString`
- WHEN `auditCaptions` runs on the resulting HTML string
- THEN `uncaptioned` MUST be `[]` for all three

### Requirement: A Skip Control Is Visible on Every Plate and Never Blocks Play

A skip control MUST render on every one of the three plates and MUST be
reachable by a single tap, calling `onDone` immediately regardless of
which plate is showing. The opening MUST NOT be a mandatory gate to play:
skipping MUST reach exactly the same outcome the last plate's tap reaches.

#### Scenario: Skip is present on every plate

- GIVEN each of the three plates rendered in turn via `renderToString`
- WHEN the markup is inspected
- THEN a skip control MUST be present on all three

#### Scenario: Skip on the first plate ends the opening immediately

- GIVEN the first plate showing
- WHEN skip is tapped
- THEN `onDone` MUST be called, without advancing through plates two and
  three

### Requirement: The Already-Seen Gate Is Derived, Never a New Persisted Key

Whether the opening has already been seen MUST be derived from the
existing level records the store already keeps — the same precedent
`sectors.ts:507-524` documents against a persisted `<sector>-seen` key,
and `migrateEntrance.ts:83`'s reading of an empty record set as a fresh
install. No new store key, field, or flag MAY be introduced. An empty
`Records` object (a fresh install) MUST resolve the gate to "not seen";
`Records` containing at least one level record MUST resolve it to "seen".

#### Scenario: An empty record set resolves to not-seen

- GIVEN an empty `Records` object
- WHEN the gate is evaluated
- THEN it MUST resolve to "not seen"

#### Scenario: Any existing level record resolves to seen

- GIVEN `Records` containing at least one level record (e.g. `glass1`
  attempted)
- WHEN the gate is evaluated
- THEN it MUST resolve to "seen"

#### Scenario: No new store key is introduced

- GIVEN the gate's implementation
- WHEN its inputs are inspected
- THEN it MUST read only pre-existing store fields, and localStorage MUST
  gain no new key because of this change

### Requirement: A `?nivel=` Deep Link Bypasses the Opening

Whenever a `?nivel=` deep link resolves to a playable view (the existing
`mapa`/`intro-<id>`/`cierre-<id>`/`deduccion`/bare-level-id convention),
`App.tsx`'s shell resolution MUST route straight to that view and MUST
NOT show the opening first, regardless of the already-seen gate's value.

#### Scenario: A level deep link skips the opening even on a fresh install

- GIVEN an empty `Records` object (opening not yet seen) and
  `?nivel=glass1` in the URL
- WHEN the app's initial shell is resolved
- THEN it MUST resolve directly to the `glass1` play view, never to the
  opening

### Requirement: The Opening Is Reachable On Demand Through a Dev-Gated Route

A dedicated dev-gated query token, following the shape of the existing
`?nivel=mapa`/`intro-<id>`/`cierre-<id>` convention (`GameScreen.tsx:113,
123`), MUST route directly to the opening when `isDevMode()` is `true`,
regardless of the already-seen gate's value, so tests and screenshot
captures can reach it without clearing storage.

#### Scenario: The dev route reaches the opening even when already seen

- GIVEN `Records` containing an existing level record (gate resolves to
  "seen") and the dev route active with `isDevMode()` true
- WHEN the app's initial shell is resolved
- THEN it MUST resolve to the opening, not the map

#### Scenario: The dev route is inert outside dev mode

- GIVEN the same query token present but `isDevMode()` false
- WHEN the app's initial shell is resolved
- THEN it MUST NOT resolve to the opening through that token

### Requirement: The Video Swap Point Is Documented and Falls Back to Plates

`PrologueOpening` MUST own exactly one seam where a `<video>` can replace
the three plates, with the rest of the app unaffected (`App.tsx` and every
caller keep the same `onDone`-only contract). Until a video source is
wired, the component MUST render the plates. When a video source IS
wired, the component MUST fall back to the plates if the video fails to
load, and the video, like the plates, MUST never be mandatory to play —
the skip control MUST remain visible for the video path too.

#### Scenario: With no video source, the plates render

- GIVEN `PrologueOpening` with no video wired (this change's state)
- WHEN it renders
- THEN the three plates MUST render, exactly as specified above

#### Scenario: A failed video load falls back to the plates

- GIVEN a video source wired and its load failing
- WHEN `PrologueOpening` renders
- THEN it MUST fall back to rendering the plates, with no broken or blank
  screen

#### Scenario: The video path still carries a skip control

- GIVEN a video source wired and loading successfully
- WHEN it renders
- THEN a skip control MUST still be visible and MUST call `onDone`
  immediately when tapped

### Requirement: No url(#…) Reference Is Introduced

No element rendered by `PrologueOpening` MAY reference `url(#…)` — no
`<defs>`, `<mask>`, `<clipPath>`, `<pattern>`, or filter — the same
prohibition every other screen in this app carries
(`TraceCanvas.tsx:69-86`).

#### Scenario: Rendered markup contains zero url(# occurrences

- GIVEN `PrologueOpening` rendered via `renderToString` for each plate
- WHEN the HTML string is scanned for `url(#`
- THEN zero occurrences MUST be found

---

**Accepted deviation:** this spec exceeds the skill's 650-word cap, the
same deviation this project's other capability specs already record under
`delivery_strategy: exception-ok`. This new capability carries eight
independently testable invariants — the component's single-responsibility
contract, the three verbatim lines, the skip control, the derived gate,
the deep-link bypass, the dev route, the video swap point with its
fallback, and the fragment-reference ban — none of which could be dropped
or merged without losing an assertion the harness can actually check.
