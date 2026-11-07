# Papel world: code-drawn characters and the road to cursive

## Objective

A child of 5 to 7 learns cursive while having fun, going from graphic gestures
to real letters. The whole game moves to the "Papel recortado" style, drawn in
code, and the child's own stroke becomes part of the world.

## Problem and why

- Art is 196 static PNGs: one pose, one colour, no reaction, slow to change.
- The route ends in the zoo: no child ever reaches a letter (`docs/25` P1-2).
  The project's goal is school cursive, so this is the central gap.
- The letter score rewards a zigzag and the letter screen needs reading
  (`docs/25` P1-1). Corrections are silent (`docs/25` P2-1).

## Direction accepted by the user (2026-11-07)

- Central idea: **your stroke is the drawing.** The line the child really traced
  becomes the water, the shell, the lianas.
- Only the Papel style ships. Gomita and Trazo vivo stay out of the app.
- Prototype to port from: `experiments/code-art-styles/` in the
  `~/projects/cursiva` checkout (untracked there; `engine.js`, `characters.js`).
- Audience correction: the user states **5 to 7 years**, the docs said 6 to 8.

## Constraints

- `docs/01` §5: while tracing, nothing moves except what the finger causes. No
  moving backgrounds, no music. Life goes before and after the trace.
- The child does not read: no text alone (`CaptionedArt`, `captionAudit.ts`),
  and corrections are heard and shown, never written only.
- No punishment: no red, no failure sound, never block the child.
- No `url(#)`, mask, clipPath, pattern or filter (`TraceCanvas.tsx` comment).
- Tests run without a DOM: pure functions, `renderToString`.
- Level ids are persisted: never rename or delete one.
- `docs/09` §5: a repeated mark must read when repeated, and marks cannot be
  animated all the time (about 40 per level).
- No visible text in Rioplatense slang beyond the game's existing copy voice.

## Decisions taken without asking (open `docs/25` §8 questions)

The user asked to implement and report what to test at the end, so these are
defaults to confirm, not settled answers.

- Letters keep the entry stroke from the baseline, as `f3-l` and `f3-o` do.
- Letters live inside the story, in the detective's notebook (`docs/25` 4.5).
- Letter order follows `docs/25` 4.6: `o a` (turtles), `l e` (monkeys),
  `m n` (duck), `u` (fish).

## Tasks

- [ ] T1 — Puppet engine in `client/src/puppet/`, paper treatment only, pure and testable. Route: delegated.
- [ ] T2 — Pulpito and duck on the engine, wired into one complete adventure (intro, level, closing, map). Route: delegated.
- [ ] T3 — Your stroke is the drawing: capture the real trace and replay it in the duck closing, then the other families. Route: delegated.
- [ ] T4 — Tentacle demo and wordless corrections with spoken feedback (`docs/25` P2-1). Route: delegated.
- [ ] T5 — Fix the letter score (`docs/25` 4.1). Route: delegated.
- [ ] T6 — The bridge to letters: bridge levels, the notebook, the letter sequence and its place in the journey (`docs/25` 4.2 to 4.6). Route: delegated.
- [ ] T7 — The rest of the cast on the engine. Route: delegated, reviewed side by side.
- [ ] T8 — Living map, album and the child's own Pulpito. Route: delegated.
- [ ] T9 — Paper theatre: backgrounds, corridor, marks and transitions. Route: delegated.
- [ ] T10 — Docs: audience 5 to 7, style guide, what remains. Route: inline or delegated.

## Acceptance

- Every task leaves `npx vitest run --maxWorkers=2` (from `client/`) and
  `npm run build` green.
- Art is accepted only from a side-by-side capture read by the parent.
- A child who does not read can go from the first adventure to writing a letter.

## Checks and TDD

- TDD: off, source `openspec/config.yaml` (`strict_tdd: false`); runner vitest.
- Baseline on `main` (`0a062b1`): 118 files, 3665 tests green.
- RDD: off, decided globally by the user. Ordinary checks apply.
- Real children and real tablets are outside what this environment can check.

## Delivery

Branch `feat/papel-world` in worktree `~/projects/cursiva-wt/papel`, from `main`.
Forecast is far over 400 authored lines. The user asked for implementation with
testing at the end, so work-unit commits stay on one branch and slicing into
pull requests is decided with the user. Push, pull request, merge and deploy are
the user's decisions.

## Progress

Created; nothing implemented yet.

## Next step

T1 and T2.
