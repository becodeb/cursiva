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

- [x] T1 — Puppet engine in `client/src/puppet/`, paper treatment only, pure and testable. Route: delegated.
- [x] T2 — Pulpito and duck on the engine, wired into one complete adventure (intro, level, closing, map). Route: delegated.
- [x] T3 — Your stroke is the drawing: capture the real trace and replay it in the duck closing, then the other families. Route: delegated.
- [x] T4 — Tentacle demo and wordless corrections with spoken feedback (`docs/25` P2-1). Route: delegated.
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

- T1 done (`e9c3f92`): `client/src/puppet/`. Pure rig and actor, one shared
  ticker capped near 30 fps, calm mode for `still` and reduced motion.
- T2 done (`bef9549`): `puppet/ArtFigure.tsx` is the seam, keyed on the registry
  href. Puppets stand in the PNG's exact box. Wired: map, intro, level, deduction,
  closing, rescue flight, captioned art.
- Evidence: `npx vitest run --maxWorkers=2` 123 files, 3722 tests green;
  `npm run build` green. In the browser: trace screen attributes unchanged over
  700 ms, intro, closing and map moving, reduced-motion intro static after its act.
- Still PNG in the duck adventure: ducklings, clue marks, the fingertip lens. The
  notebook still shows the PNG duck. The gold puppet lens becomes the PNG lens on
  touch, a visible mismatch to settle in T7.
- The intro speech anchor moved to (0.86, 0.30), clear of the puppet's cap brim.
- T3 done (`ee000dc`, `a942bc3`): `zoo/tracedLine.ts` keeps the approved raw strokes
  (Ramer-Douglas-Peucker, unit box, at most 120 points) in session memory and in
  `cursiva.trazos.v1`. `screen/strokeFinale.ts` composes one scene per `finale` row
  (water, leap, hills, shell, lianas, slither, route, bubbles, spines), and
  `screen/StrokeFinale.tsx` plays it before `AdventureClosing` through `FinaleGate`.
  No line means today's closing. The animal goes through the seam, so PNGs work now.
  In the browser, real drags on `duck-trail4`, `turtle4`, `monkey4`, `bee4`, `hedgehog1`;
  tap skip and reduced motion checked on the bee. The other five families were seen
  only with injected lines of the right shape.
- T4 done (`ad2b7b2`): `puppet/tentacle.ts` and `canvas/Tentacle.tsx` replace the idle hand
  and draw the demo stroke on one clock. A restart, from a wall or a hazard, gets the scare,
  the arm pointing at the start and a kind spoken line, with no failure sound. The
  Pulpito stands beside the start (`besideRouteFeet`), the green dot stays, and
  `duck-trail1` and `turtle4` are the two tight shapes. `docs/25` P2-1 text corrections were
  already spoken (`resultSpeechLine`). The night demo is the arm over its one-shot cue.
- Evidence: `npx vitest run --maxWorkers=2` 127 files, 3828 tests green; `npm run build` green.
- Decisions to confirm: the hazard restart also speaks and points (the brief names the wall);
  the sound on restart is gone; the arm also replaces the idle-cue hand on all cues.

## Next step

Parent reads the T3 and T4 captures, then T5.
