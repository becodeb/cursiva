# Proposal — Level engine MVP (mechanics only)

## Intent
Replace the letter-first workbench with a phased level engine that walks a child
from raw visuomotor control to writing a whole word in one continuous stroke.

The current app jumps straight to tracing letters. Pedagogically that is backwards:
a letter is the END of the motor sequence, not its start. Docs 01/02/03/04/08 were
rewritten to specify five neurocognitive phases (path → pattern → grapheme →
ligature → word) driven by a single engine over level DATA.

## Scope
IN — a playable start-to-finish MVP that proves the mechanics:
- One `LevelConfig`-driven engine covering all five phases.
- Three independent evaluation pillars: accuracy, direction, fluency.
- A new fluency metric (pen lifts + speed regularity). This is the piece that
  distinguishes a child TRACING from a child DRAWING, and it did not exist.
- Adaptive corridor tolerance: 3 failures widen the channel; nothing ever blocks.
- 16 levels — a couple per phase — plus a level map with lock/unlock progression.
- Docker Compose serving the static build.

OUT — deliberately deferred until the mechanics are validated:
- Theme, characters, narrative, illustrations, the pop-up book metaphor.
- Backend, accounts, teacher dashboard.
- The full alphabet.

## Approach
Reuse the existing letter pipeline unchanged (`buildLetterConfig`, `buildWord`,
`TraceCanvas`, scoring primitives). Phases 1-2 generate their paths parametrically;
phases 3-5 pull theirs from the letter registry. `TraceCanvas` and `useTraceInput`
are extended additively (corridor rendering, multi-stroke capture, point
timestamps) so every existing test keeps passing.

The old `MainScreen` letter workbench stays reachable behind a toggle.
