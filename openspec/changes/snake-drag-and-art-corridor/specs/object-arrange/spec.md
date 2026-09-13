# Object Arrange Specification

## Purpose

Draggable objects arranged into an ordered set of slots — `docs/13` §2's
seriation, ordering three snakes smallest to largest before tracing any
of them. One pure fold, ridden by the SHIPPED pointer hook and the
SHIPPED per-frame sample the trace canvas already provides — never a
second pointer-capture hook, since `useTraceInput` already accepts
multiple strokes and a second owner of `setPointerCapture` on the same
`<svg>` is exactly what the shipped hook's own contract forbids. Every
decision is an exported pure function because this repo's harness is
node with no jsdom and no testing-library: a decision made only inside a
pointer handler is invisible to every test that exists.

## Requirements

### Requirement: The Arrange Gesture Rides the Shipped Pointer Hook and onFrame Sample — No New Input Hook

`useTraceInput.ts` MUST remain byte-identical to `main` after this
change: it already accepts multiple strokes (`multiStroke`) and the
level screen already passes it unconditionally on every level. No sibling
pointer-capture hook (e.g. a `useDragInput`) MAY be introduced — a second
hook capturing the same `<svg>`'s pointer events would be a second owner
of `setPointerCapture`, which the shipped hook's own header explicitly
forbids. The arrange gesture MUST be implemented entirely by
repurposing, during the arrange phase, the SAME per-frame point sample
(`onFrame`) the corridor, clue, and reveal folds already consume — no
second pointer-capture mechanism and no second cloud scan.

(Superseded: an earlier draft of this capability specified a sibling hook
`canvas/useDragInput.ts` with its own pointer capture. `design.md` §0
A4/§5.1 found the premise this rested on — that `useTraceInput` allows
only one stroke — false, and with it the case for a second hook.)

#### Scenario: useTraceInput.ts is byte-identical to before this change

- GIVEN `client/src/canvas/useTraceInput.ts`, compared before and after
  this change
- WHEN the diff is inspected
- THEN it MUST show no change

#### Scenario: No sibling pointer-capture hook is introduced

- GIVEN the diff this capability's implementation introduces
- WHEN scanned for a second hook calling `setPointerCapture` on the trace
  canvas's `<svg>`
- THEN none MUST be found

#### Scenario: The arrange gesture consumes the same onFrame sample as the corridor and clue folds

- GIVEN a level with `arrange` present and its arrange phase active
- WHEN a pointer moves across the canvas
- THEN the same per-frame point sample already delivered to the corridor
  and clue folds MUST be what drives `arrangeTick`, with no separate
  sampling path

### Requirement: The Arrange Phase Gates Completion by Sequencing, Not by a Second Score

While a level's `arrange` field is present and `isArranged` reports
`false` for its live arrange state, the level screen MUST redirect the
`onFrame` sample to `arrangeTick` INSTEAD OF the wall-contact fold, MUST
suppress every ink layer (`TraceCanvas`'s `inkHidden`), and MUST return
early on release without recording an attempt, evaluating a score, or
moving a star. Once `isArranged` reports `true`, the level screen MUST
resume routing `onFrame` to the wall-contact fold and MUST stop
suppressing ink, so a stroke traced from that point on is captured and
scored exactly as on a level with no `arrange` field.

(Superseded: an earlier draft expressed the arrange phase as disabling
`useTraceInput` via its existing `enabled` option. `design.md` §0 A4/§5.2
found the shipped mechanism is sequencing at the `onFrame`/`onRelease`
level, not a hook-level `enabled: false` — pointer capture itself is
unaffected throughout; what changes is which fold consumes the sample
and whether ink is painted.)

#### Scenario: No ink is painted and no attempt is recorded while unarranged

- GIVEN `snake2` with `isArranged` reporting `false`
- WHEN a pointer stroke is drawn and released
- THEN no ink MUST render, and the release MUST NOT record an attempt or
  evaluate a score

#### Scenario: Tracing and scoring resume once isArranged reports true

- GIVEN `snake2` with `isArranged` reporting `true`
- WHEN a pointer stroke is drawn and released
- THEN ink MUST render and the release MUST be evaluated exactly as on a
  level with no `arrange` field

### Requirement: The Arrange Fold Is Pure and Returns the Same Reference When Nothing Changes

`levels/arrange.ts` SHALL export `initialArrange(cfg)`, `grabPiece(state,
boxes, p)`, `arrangeTick(prev, boxes, p, down, cfg)`, `isArranged(state)`,
and `debugArrange(cfg, k)`, all pure and DOM-free. `arrangeTick` MUST
return the EXACT SAME object reference as `prev` when its inputs produce
no change — the same no-op contract `revealGrid.ts`'s `revealTick`
already holds, so an idle finger during the arrange phase costs a no-op
`setState`.

#### Scenario: arrangeTick returns the same reference on an idle re-pass

- GIVEN an `arrangeTick` call whose inputs produce no state change
- WHEN the returned value is compared to `prev` by reference
- THEN they MUST be the same object

#### Scenario: Every export runs with no DOM

- GIVEN `initialArrange`, `grabPiece`, `arrangeTick`, `isArranged`, and
  `debugArrange` called directly from a plain node test file
- WHEN inspected
- THEN none MUST require `window` access, jsdom, or any component context

### Requirement: grabPiece Picks the Topmost Piece Whose Box Contains the Point

`grabPiece(state, boxes, p)` MUST return the index of the piece whose
CURRENT box contains point `p`, and, when more than one box contains it,
MUST return the TOPMOST — the piece rendered last among the overlapping
candidates. It MUST return `null` when no box contains `p`.

#### Scenario: A point inside exactly one box returns that piece

- GIVEN three non-overlapping piece boxes and a point inside one of them
- WHEN `grabPiece` is called
- THEN it MUST return that piece's index

#### Scenario: A point inside two overlapping boxes returns the topmost

- GIVEN two overlapping piece boxes both containing point `p`
- WHEN `grabPiece` is called
- THEN it MUST return the index of the piece rendered last (on top)

#### Scenario: A point inside no box returns null

- GIVEN a point outside every piece's box
- WHEN `grabPiece` is called
- THEN it MUST return `null`

### Requirement: isArranged Reports True Only When Every Piece Occupies Its Own Slot

Because `config.artCorridor`'s pieces are authored smallest first,
seriation and slot occupancy are the SAME claim: `isArranged(state)` MUST
return `true` if and only if `state.placed[i] === i` for every index `i`
— every piece in its own, correctly-ranked slot. Any other arrangement,
including a partially-filled one, MUST report `false`.

#### Scenario: Every piece in its own slot reports true

- GIVEN a state where `placed[i] === i` for every piece
- WHEN `isArranged` is called
- THEN it MUST return `true`

#### Scenario: A swapped pair reports false

- GIVEN a state where two pieces' slots are swapped
- WHEN `isArranged` is called
- THEN it MUST return `false`

#### Scenario: A partially-filled arrangement reports false

- GIVEN a state where at least one piece's `placed` entry is `null`
- WHEN `isArranged` is called
- THEN it MUST return `false`

### Requirement: A Drop Outside snapRadius or Onto an Occupied Slot Returns the Piece to Its Scatter Point

`arrangeTick`'s drop resolution MUST place a released piece into the
nearest FREE slot only when that slot is within the level's authored
`snapRadius`. A drop that lands outside every slot's `snapRadius`, or
that lands nearest an ALREADY-OCCUPIED slot, MUST return the piece to its
own authored scatter point (`config.arrange.from[i]`) rather than
displacing the slot's existing occupant — a swap is a second rule the
mechanic does not ask for, and `docs/14` §14 forbids punishing an early
error hard.

#### Scenario: A drop within snapRadius of a free slot occupies it

- GIVEN a piece released within `snapRadius` of an empty slot
- WHEN `arrangeTick` resolves the drop
- THEN that slot's `placed` entry MUST become the piece's index

#### Scenario: A drop outside every slot's snapRadius returns the piece to its scatter point

- GIVEN a piece released outside every slot's `snapRadius`
- WHEN `arrangeTick` resolves the drop
- THEN the piece's position MUST return to its authored scatter point,
  and no slot's occupancy MUST change

#### Scenario: A drop nearest an occupied slot does not displace its occupant

- GIVEN a piece released nearest a slot already holding another piece
- WHEN `arrangeTick` resolves the drop
- THEN the occupied slot's existing occupant MUST remain, and the
  dropped piece MUST return to its own scatter point

### Requirement: Every Arrange Decision Is an Exported Pure Function

No arrangement decision (which piece a press picks up, where a drop
resolves, whether the whole level counts as arranged) MAY be computed
only inside a pointer event handler; each MUST be an exported pure
function reachable from a node-only test with no jsdom and no
testing-library. This is what makes the mechanic testable at all in this
repo's harness.

#### Scenario: Every decision function is directly importable and callable with no DOM

- GIVEN `initialArrange`, `grabPiece`, `arrangeTick`, and `isArranged`
- WHEN imported and called directly from a plain node test file
- THEN each MUST execute and return a value with no jsdom, no
  testing-library, and no component render involved

### Requirement: debugArrange Seeds the First K Pieces Home, Ungated

`?debug=ordenadas:<k>`, parsed by a pure exported function in
`canvas/devMode.ts` and resolved through `arrange.ts`'s
`debugArrange(cfg, k)`, SHALL NOT be dev-gated — following
`isSectorDebug`'s own stated reason: it paints render state (which
pieces are already home), adds no control and persists nothing, and must
work against the exact build being screenshotted. It MUST place exactly
the first `k` pieces (by seriation index) into their own slots and leave
the rest scattered.

#### Scenario: ordenadas:2 places exactly the first two pieces home

- GIVEN `?debug=ordenadas:2` applied to a level with three pieces
- WHEN the resulting arrange state is inspected
- THEN pieces 0 and 1 MUST occupy their own slots and piece 2 MUST remain
  scattered

#### Scenario: The parser is pure and DOM-free

- GIVEN the `ordenadas` parser called directly with a query string
- WHEN inspected
- THEN it MUST require no `window` access and no component context

### Requirement: No Fragment Reference Is Introduced by the Arrange Mechanic

No arrangement-related rendering (the pieces' live positions during the
arrange phase, rendered through the `art-corridor`/`trace-canvas`
capabilities' shared image layer) MAY introduce a `<mask>`, `<pattern>`,
`<clipPath>`, `<defs>`, `useId`, or `url(#…)` reference.

#### Scenario: No forbidden reference is introduced during the arrange phase

- GIVEN a snake level rendered mid-arrange via `renderToString`
- WHEN the HTML string is scanned
- THEN it MUST NOT contain `<mask`, `<pattern`, `<clipPath`, `<defs`, or
  the substring `url(#`
