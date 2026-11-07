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
- [x] T5 — Fix the letter score (`docs/25` 4.1). Route: delegated. Calibration on real tablets still owed.
- [x] T6 — The bridge to letters: bridge levels, the notebook, the letter sequence and its place in the journey (`docs/25` 4.2 to 4.6). Route: delegated. Real children still owed.
- [x] T7 — The rest of the cast on the engine. Route: delegated, reviewed side by side. Merged in `2dc31e3` (20 characters). Parent review: bee, cow, snail and jellyfish strongest; hen, fish fins and monkey hands weakest, second pass pending. Surfaces still PNG on the trace screen move to T9.
- [x] T8 — Living map, album and the child's own Pulpito, plus the parent review's leftovers. Route: delegated. Commits `488fc03`..`3833c06`.
- [x] T9 — Paper theatre: backgrounds, corridor, marks and transitions. Route: delegated. Merged from `feat/papel-cast` (`7c7053f`..`7554316`): ten scenes, map, trace surfaces, finale polish. Parent review of contact sheets: coherent; weakest are the hedgehog's flat body, PNG chrome (bubbles, buttons, HUD) and small clue marks.
- [x] T10 — Docs: audience 5 to 7, style guide, what remains. Route: delegated, with T8.

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

- T5 done (`30b097d`): `canvas/validation/fluency.ts` reads speed in 120 ms windows and abrupt turns
  along the arc (not counting the model's own), `backAndForth.ts` reads line drawn per route covered,
  letter zones shrink to corridor/2 + 12 (`levels/buildLevel.ts`). Simulated at four event rates in
  `testing/childStrokes.ts`: clean 100, wobbly 74 to 81, zigzag 0, all within a few points between rates.
  Two `fluency.test.ts` cases changed premise: alternating steps on every 16 ms event is what event
  delivery looks like, so "jerky" is now stops on a hand's time scale.
- T6 done (`65b9632`, `133c9da`, `f4480b4` and the commit that records this). Four chapters, one row
  each (`letters-mn`, `letters-u`, `letters-oa`, `letters-le`), each opening with its bridge level.
  `levels/notebookLevels.ts` is the table. Letters on `screen/NotebookPaper.tsx` through `LevelPlay`,
  morph in `screen/LetterMorph.tsx`, keepsake in `screen/NotebookKeepsake.tsx`, writing kept in
  `cursiva.libreta.v1` (`zoo/notebookWriting.ts`), notebook's own page by a pencil icon.
  Words: `mano`, `ola`, `luna`. Defaults recorded in `docs/25` §9.
- Evidence: `npx vitest run --maxWorkers=2` 136 files, 4249 tests green; `npm run build` green. Real
  drags through the bridge, morph, all of `o`, `a`, `mano`, keepsake, closing and notebook at
  1024x768 and 844x390, plus `e`, `l`, `m`, `ola`, `luna` and the four bridges. A fresh profile reached
  `duck-puente` through the map with no query string, skipping levels with the dev build's own button.
- Open: `f3-*` keep their classic screen (dev link only). Guard tests whose premise changed: the catalog
  tables now exclude the notebook levels, which `levels/notebookLevels.test.ts` checks instead.
- Not checked: real children, real tablets, real touch (Playwright drove a mouse pointer; touch is only
  in the simulated scoring), real speech timing against the demo.

- T8 done. Pure parts and their tests first, then the screens, then the real flow.
  - Living map: `zoo/mapLife.ts` (routines, turns, keepsake layout), `screen/LivingAnimals.tsx` (one
    controller on the shared ticker; moving ones leave `still` only for their turn). Duck, fish, bee and
    snake go along the child's line when there is one. Arrival hop, tap reacts and speaks. The green
    play button became a real tap target, since it can sit outside the sector's rect and animals now
    take their own taps.
  - Album: extended `screen/DetectiveNotebook.tsx`, no new screen: the backpack already opens it, and it
    already held the animals and the writing. Live puppet once found, the puppet's own outline before
    (`Puppet.silhouette`), the child's letter or line beside it, no word on a card, every card heard.
  - His Pulpito: `zoo/pulpitoLook.ts` (`cursiva.pulpito.v1`), `zoo/backpack.ts` `WEARABLES` (ten gifts,
    one per animal, derived from level records), `screen/PulpitoWardrobe.tsx`, costume parts in
    `characters/pulpo.ts` under `p.aside` so the approved cuts do not change, pictures cut from the same
    rig (`puppet/wardrobe.ts`). The seam dresses every appearance, and the demo arm follows his colour.
  - Leftovers: paper chrome (`puppet/chrome.ts`, card edges keep their width, so no layout moved);
    hedgehog fur and marks measured from the puppet (`puppet/silhouette.ts`, `levels/spines.ts`), at a size
    that keeps the mean radius the levels were tuned on; marks redrawn (puddle, seeds, bubbles, webfoot,
    crumb); writing keeps up to 400 and 900 points through `smoothStrokePath`; finished-zoo bubble clear
    of the pens.
  - Chapter length: stop after a pair's first letter, second letter without its dotted step. Levels
    `m n` 9 to 8 (5+3), `u` 5, `o a` 10 to 9 (5+4), `l e` 11 to 10 (5+5). `docs/25` §9 has the reasoning.
- Evidence: `npx vitest run --maxWorkers=2` 142 files, 4416 tests green; `npm run build` green. Real drags
  from an empty profile, no query string, through prologue, four pens, the whole duck adventure with its
  deduction, the letter chapter with its stop, and back to the map, at 1024x768 and 844x390: 18 levels, 0
  skips, 0 page errors. Finished map on this Pi, built app: 59.5 rAF fps, at most 3 moving, frozen under
  overlays, static under reduced motion. Corrupt values on every new key and on the level records: app
  renders, 0 errors.
- PNG use, measured on the built app (154 visits: every level, entry, closing, deduction, the prologue,
  the finished map, notebook and wardrobe): 164 of 196 PNGs and all 10 webp never fetched. Of the 32 fetched,
  25 only by the hen's old `trail1`-`trail4`, off the story; the normal flow fetches 7: the favicon and 6
  deduction silhouettes. A visit does not play a level, so art shown only after a play was checked by the
  seam, not by a fetch. No art was deleted.
- Guard tests whose premise changed: tests read `src=`/`href=` of chrome now read `data-art=`; `not box-shadow`
  and `border #1a1a1a` became the paper edge and shadow; the two hedgehog margins follow the measured puppet
  (still positive: 3.5, 2.9, 0.4, 0.7, so the start zones do not overlap, but hedgehog3 is tight); a record's
  size bound went from 2 kB to 6 kB; the journey no longer visits the three resting dotted levels.

- Parent review after T8: the webfoot read as a plane, redrawn with round toes and a shallow web (`puppet/marks.ts`). Measured on `duck-trail6`: every mark faces within 62 degrees of the trail's direction, none backward. 142 files, 4416 tests green.

## What remains

- **Real children and real tablets.** The chapter split, the gift moment, a tap on an animal standing in the
  highlighted sector, and the score's calibration are all desk decisions. `docs/25` tanda 1.6 still owed.
- Deduction silhouettes are still PNG, the last art of the normal flow. `Puppet.silhouette` can replace them.
- Hen and old `trail*`, `f3-*` and the classic level screen stay as they were: dev links only.
- A family's line was only seen for real on the duck; the other keepsakes on the map were injected lines.
- `docs/00` §2 and §3 still describe the older state; it now says so at the top.

## Next step

The user tests the whole game and decides on slicing and merge.
