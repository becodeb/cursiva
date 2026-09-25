# Finishing the pre-writing stage

Feature document (ODD). Engram mirror: topic `odd/prewriting-stage-completion/tasks`, project `cursiva`.
Source: the user's play-test on 2026-09-25, after `main` was published at `a1b1eed`.

## Objective

Make the pre-writing stage playable end to end by a first-grade child, then make it feel like one
game: full-screen art, UI in the game's style, a detective loop that gives every trace a purpose.
Work ships in batches; each batch is merged to `main` and pushed so the user can test the deploy
before the next one starts.

## Problem (what the user hit)

- Snakes: impossible to pass; the corridor does not line up with the snake art; no goal or story.
  The user could not get past it, so bee, dolphins, fish, turtles, monkeys and the finale are untested.
- Flashlight (night): the first tap lights up the whole level; on the others a halo already shows
  where the hidden objects are, so there is nothing to search for.
- Hedgehog: a well-drawn spine is rejected when it does not start exactly on the small start dot;
  repetitive and not intuitive. "A child cannot pass this level."
- Path/mud cleaning (last entrance enclosure): the mud is flat brown squares, unlike the drawn sand
  and leaves; the revealed background has no footprints (art request, pending).
- The art does not fill the screen; the buttons look detached from the game; "repeat" is useless;
  "next" should be big or automatic.
- Stars are collected on some levels; the user prefers the detective loop (collect an animal's
  clues, then guess which animal left them) or collecting the animals along the path.

## Constraints

- Everything from `odd/tasks/adventure-flow-and-map-guidance.md` §Constraints still applies: no
  `url(#…)`/mask/clipPath/pattern/filter in SVG, node-env tests (`renderToString`, no DOM),
  generators emit only M/L/C, Rioplatense child copy, level ids are persisted keys (never delete one).
- No punishment, no red, no failure sound (`docs/01` principle 2).
- Out of scope for this stage: accounts/profiles, PWA/offline, cursive letters (`docs/15`).
- Another session works in `/home/opencode/projects/cursiva` on `exp/svg-art` (SVG art, including the
  map footprints). Never touch that working tree; each task runs in its own worktree under
  `/home/opencode/projects/cursiva-wt/`.

## Mode and checks

TDD off (`openspec/config.yaml`: `tdd: false`, `strict_tdd: false`); runner vitest. Per task:
`npm test`, `npm run build`, `git diff --check`, and browser QA with the system Chromium
(`/usr/bin/chromium`, `--disable-gpu`) on the touched levels at 1024x768 and 844x390 (screenshots
under `capturas/2026-09-25-tanda1/`, outside git). RDD is off (user, 2026-09-23).

## Delivery

One branch per task off `main`, merged into `main` by the orchestrator after its checks, then pushed
at the end of each batch. Strategy: `single-pr`-free direct merges to `main` (the user asked for
merge + push so the deploy updates and they can test).

## Batch 1: what blocks play (parallel, one writer each)

| ID | Task | Branch | Route | Status | Evidence |
|---|---|---|---|---|---|
| T1 | Snakes: align the corridor with the snake art so a child can pass `snake1..4` | `fix/snakes-corridor-alignment` | delegated (4+ files to map, writer trigger) | pending | |
| T2 | Flashlight: the first tap must not reveal everything; no halo giving away hidden objects; a found object stays lit in a radius around it | `fix/night-flashlight` | delegated | pending | |
| T3 | Hedgehog: accept a spine that starts near (not exactly on) the start dot; make it less repetitive and clearer | `fix/hedgehog-spines` | delegated | done | commit `2ce1e92` on `fix/hedgehog-spines`; `npx vitest run --maxWorkers=2` on the 4 touched files: 342 passed; `npm test -- --maxWorkers=2`: 2154 passed (87 files); `npm run build`: clean; `git diff --check`: clean; browser QA (system Chromium, 1024x768, `?nivel=hedgehog1`/`?nivel=hedgehog4&dev`) in `capturas/2026-09-25-tanda1/`: an off-centre (~25 viewBox units) first stroke on hedgehog1 is accepted (`02-hedgehog1-01-after-offcentre-first-spine.png`), and both hedgehog1 (4 spines, was 5) and hedgehog4 (9 spines, was 14) complete to a green "Siguiente" (`03-hedgehog1-02-final.png`, `06-hedgehog4-02-final.png`) |
| T4 | Mud of the path enclosure (`sand3`) drawn in code like the sand and the leaves, not flat squares | `fix/cleaning-levels` | delegated | done | `1b4ef97` — new `visual: 'mud'` RevealLayer policy (pebbles, puddles, eroded silhouette); `npm test`/`npm run build` green; browser QA (`?nivel=sand3`, glass1/sand1/glass3 for regression) in `capturas/2026-09-25-tanda1/` |
| T6 | Cleaning levels (glass, sand, mud): the finger only cleans: no ink line, no drawing of any kind (user, 2026-09-25: "que solo limpie pasar el dedo, no que deje un trazo ni dibuje") | `fix/cleaning-levels` | delegated (same writer as T4) | done | `bf92bf9` — `resolveInkPolicy('erase')` now returns `'none'` (was `'live-only'`); verified `data-ink-policy="none"`, empty `d` mid-drag on glass1/sand1/glass3/sand3; flashlight (`'light'`) untouched |
| T5 | Dev-only "skip level" button in level play, visible in dev builds or with `?dev` (same gate as the progress reset) | `feat/dev-skip-level` | delegated | pending | |

## Later batches (planned, not started)

- Batch 2, screen and UI: full-screen art; UI in the game's style; drop "repeat"; auto-advance or a
  big "next"; cheap animations (Pulpito breathing/blinking, speech-bubble pop, star flash, screen
  transitions).
- Batch 3, mechanics: collect along the path (items persist after leaving the line, the last one ends
  the level; sheep on the peaks); detective loop per animal (levels 1-3 collect clues with no
  silhouette in the bar, then choose among three animals reusing `screen/Deduction.tsx`, level 4
  collects the animals; snake story goes here). Remove the animal silhouette from the path bar.
- Batch 4, art requests for the user (ChatGPT): monkey (A6), path background with footprints,
  weak clue icons (user to point out where the "drops" and "seeds" are).
- Then: play-test bee, dolphins, fish, turtles, monkeys and the finale.

## Progress

- 2026-09-25: `main` fast-forwarded to `a1b1eed` and pushed. Batch 1 started.

## Next step

Launch the T1, T2, T3, T4+T6 and T5 writers in parallel worktrees.
