# Psychopedagogical review of the full journey

Feature document (ODD). Engram mirror: topic `odd/psychopedagogical-review/tasks`, project `cursiva`.
Branch `docs/psychopedagogical-review`, worktree `/home/opencode/projects/cursiva-wt/docs-psychopedagogical-review`.
Source: the author's request on 2026-10-07 (line 1 of three; chosen order 1 → letters → accounts later).

## Objective

Play every step of the pre-writing journey the way a 6-year-old would and judge each screen:
what it teaches, whether it is understood without reading, whether the spoken instruction is
enough, frustration, pacing, reward, intrinsic motivation, and whether it practises correct
letter formation (stroke direction, start point, stop, left→right progression, continuity).
Compare against graphomotor and educational-game good practice.

## Deliverable

`docs/25_REVISION_PSICOPEDAGOGICA.md` (Spanish, neutral register): prioritised findings and a
concrete proposal. `docs/24_…` stays reserved for the next ChatGPT art-prompt doc.

## Scope and constraints

- Read-only for the game: **no code, story, script or art change** until the author approves the proposal.
- If the proposal needs new art, the prompts go in a new `docs/24_…` with the `docs/22`/`docs/23` format.
- Captures: system Chromium, `/?dev`, 1024×768 and 768×1024, git-ignored `capturas/2026-10-07-revision/`.
- Pi limits: one headless Chromium at a time, at most 3 writers in parallel.
- The orchestrator looks at the captures itself before merging.
- Not readable from this session: the author's checklist artifact (HTML artifact, docs tools deny it).

## Mode and checks

- TDD: not applicable (documentation only). Checks: `git diff --check`; structural readback of the doc;
  every finding cites a capture path or a code/doc location.
- RDD: off by the author's decision; no reviews started.

## Tasks

| ID | Task | Route | Status | Evidence |
|----|------|-------|--------|----------|
| R1 | Map the journey in play order (prologue, map, adventures, levels, cases, f3) and capture every screen at both viewports, with spoken lines, timings and measurements | delegated (4+ files, browser work) | done | 103 steps (59 levels + 44 story/map screens), 538 captures + `LOG.md` in `capturas/2026-10-07-revision/` (git-ignored; harness in `_harness/`). Limits and orchestrator review in `odd/psychopedagogical-review/orchestrator-notes.md` |
| R2 | Collect external evidence on graphomotor practice and educational-game design for 6-year-olds | delegated (research, parallel with R1) | done | `odd/psychopedagogical-review/research-r2.md` (WebSearch snippets; gaps listed there) |
| R3 | Analyse every screen against the criteria and write `docs/25` with prioritised findings and a proposal | delegated (opus writer) | done | `docs/25_REVISION_PSICOPEDAGOGICA.md` (`82e010b`, 571 lines): 2 P1, 6 P2, 3 P3 + 6 visual defects, 5 batches, 5 questions. Also found three harness errors that change the LOG's reading (§2.3) |
| R4 | Orchestrator review of captures and doc; merge `--no-ff` to `main`, push | inline | done | Doc read in full; spot-checked `resultSpeechLine` (`LevelPlay.tsx:480-489`), `checkpoints.ts:74-98`, `snake3` hint (`catalog.ts:1511`). Docs-only merge: suite and build not run (no code changed) |

## Progress

- 2026-10-07: feature document created.
- 2026-10-07: R2 done; evidence saved with its gaps (CABA curriculum text and the counter-clockwise rule not reached).
- 2026-10-07: R1 done after ~2h (asked to wrap up after it began re-shooting). The orchestrator looked at contact sheets of every first frame, every imperfect attempt and every portrait frame; notes saved.
- 2026-10-07: R3 done (`82e010b`). The LOG's "18 not approved" is mostly a harness artefact: on collect levels the first clean stroke completed the level and the game auto-advanced, so 13 of those 18 "imperfect" frames show the next screen; f3-l/f3-o were counted approved because the regex matched "Sentido ✓".

- 2026-10-09: author's answer to §8 question 1 (tentative): cursive starts with an entry stroke from the baseline, as the letter SVGs already do. To confirm against the school's notebook.

## Next step

The author approves or rejects `docs/25` §7 item by item and answers §8. Nothing is implemented until then.
