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
| T1 | Snakes: align the corridor with the snake art so a child can pass `snake1..4` | `fix/snakes-corridor-alignment` | delegated (4+ files to map, writer trigger) | done | `4d28716` — `evaluateLevel` resampled all strokes as one arc, so a third of the samples fell on sand between snakes (a perfect trace scored 0-52); now per-stroke. `2bae9bb` — the dark channel paint under art corridors poked out of the snake outline (the "misalignment" the user saw); gated off for `artCorridor`. Start octopus no longer covers the head on snake1/2/4 (snake3 unchanged). Full suite and build green on main |
| T2 | Flashlight: the first tap must not reveal everything; no halo giving away hidden objects; a found object stays lit in a radius around it | `fix/night-flashlight` | delegated | done | `38919bc` — night1's only chest sat at the sheet centre inside the 200-unit find radius, so any first tap won (moved to (180,460)); the on-top `data-night-visible-hint` halo removed; found objects keep their own falloff in `revealTiles`. Full suite 2147 green, build green, QA screenshots in the branch worktree. Open: the lit area is tile-stepped, not round (batch 2) |
| T3 | Hedgehog: accept a spine that starts near (not exactly on) the start dot; make it less repetitive and clearer | `fix/hedgehog-spines` | delegated | done | commit `2ce1e92` on `fix/hedgehog-spines`; `npx vitest run --maxWorkers=2` on the 4 touched files: 342 passed; `npm test -- --maxWorkers=2`: 2154 passed (87 files); `npm run build`: clean; `git diff --check`: clean; browser QA (system Chromium, 1024x768, `?nivel=hedgehog1`/`?nivel=hedgehog4&dev`) in `capturas/2026-09-25-tanda1/`: an off-centre (~25 viewBox units) first stroke on hedgehog1 is accepted (`02-hedgehog1-01-after-offcentre-first-spine.png`), and both hedgehog1 (4 spines, was 5) and hedgehog4 (9 spines, was 14) complete to a green "Siguiente" (`03-hedgehog1-02-final.png`, `06-hedgehog4-02-final.png`) |
| T4 | Mud of the path enclosure (`sand3`) drawn in code like the sand and the leaves, not flat squares | `fix/cleaning-levels` | delegated | done | `1b4ef97` — new `visual: 'mud'` RevealLayer policy (pebbles, puddles, eroded silhouette); `npm test`/`npm run build` green; browser QA (`?nivel=sand3`, glass1/sand1/glass3 for regression) in `capturas/2026-09-25-tanda1/` |
| T6 | Cleaning levels (glass, sand, mud): the finger only cleans: no ink line, no drawing of any kind (user, 2026-09-25: "que solo limpie pasar el dedo, no que deje un trazo ni dibuje") | `fix/cleaning-levels` | delegated (same writer as T4) | done | `bf92bf9` — `resolveInkPolicy('erase')` now returns `'none'` (was `'live-only'`); verified `data-ink-policy="none"`, empty `d` mid-drag on glass1/sand1/glass3/sand3; flashlight (`'light'`) untouched |
| T5 | Dev-only "skip level" button in level play, visible in dev builds or with `?dev` (same gate as the progress reset) | `feat/dev-skip-level` | delegated | done | `client/src/screen/GameScreen.tsx`: button gated by the existing `isDevMode()` (same gate as `App.tsx`'s "Reiniciar progreso (dev)"), routed through the real `handleAttempt`/`handleNext` closures via a synthetic full-pass `SKIP_ATTEMPT` folded through `applyAttempt` — same completion path a real pass uses (progress saved, next level, closings, map, focus advance). `?dev` survives navigation for free: this SPA never mutates `window.location`, so `isDevMode()`'s live read of `window.location.search` stays valid across every screen without extra persistence. Intro/closing screens are single-tap (`.cv-intro-stage`, `.cv-closing-stage`). Tests: `client/src/screen/GameScreen.test.tsx` (present/absent by `isDevMode()` via `vi.spyOn`, absent on intro view, `SKIP_ATTEMPT` folds to one real approval through `applyAttempt`). Checks: `npx vitest run --maxWorkers=2 src/screen/GameScreen.test.tsx` → 65 passed; full suite `npx vitest run --maxWorkers=2` → 2147 passed (87 files); `npm run build` → OK; `git diff --check` → clean. Browser QA on a `vite preview` production build (port 5196), system Chromium headless `--disable-gpu`, empty localStorage, `?dev`: walked prologue skip → map → full `entrada` adventure (glass1→sand1→glass3→sand3) via the skip button at every level → back on the map, `?dev` still in the URL, at both 1024x768 and 844x390; confirmed the button is absent (count 0) without `?dev` on the same build. Screenshots in `capturas/2026-09-25-tanda1/` (git-ignored, not committed): `prod-01..05-*`. Commits: `3cfdea0` (code+tests), docs commit follows. |

## Batch 2: screen and UI (three writers, disjoint files)

Decisions taken by the orchestrator (user delegated, 2026-09-25; revisit after their test): auto-advance
after a short success celebration (a tap skips the wait); the "repeat" button goes; the demo (play) button
stays, restyled.

| ID | Task | Branch | Route | Status | Evidence |
|---|---|---|---|---|---|
| T7 | Level screen: the backdrop art fills 100% of the viewport (the playable sheet may shrink relative to the art; nothing clipped at 1024x768, 1180x820, 768x1024, 844x390); chrome floats over the art in the game's marker style (`docs/09`); drop "repeat"; auto-advance after the success celebration, tap to skip | `feat/fullscreen-level-ui` | delegated (writer trigger) | pending | |
| T8 | Life and feedback outside the level screen: Pulpito breathing/blinking on prologue, intro and closing; speech-bubble pop-in; star-counter flash on the map when a star is won; short transitions between screens | `feat/character-life-animations` | delegated (must not touch `LevelPlay.tsx`/`TraceCanvas.tsx`) | pending | |
| T9 | Flashlight: the permanently lit area around a found object is round and soft, not tile-stepped | `fix/flashlight-round-light` | delegated (`RevealLayer.tsx`/`revealGrid.ts` only) | pending | |

## Later batches (planned, not started)

- Batch 3, mechanics: collect along the path (items persist after leaving the line, the last one ends
  the level; sheep on the peaks); detective loop per animal (levels 1-3 collect clues with no
  silhouette in the bar, then choose among three animals reusing `screen/Deduction.tsx`, level 4
  collects the animals; snake story goes here). Remove the animal silhouette from the path bar.
- Batch 4, art requests for the user (ChatGPT): monkey (A6), path background with footprints,
  weak clue icons (user to point out where the "drops" and "seeds" are).
- Then: play-test bee, dolphins, fish, turtles, monkeys and the finale.

## Progress

- 2026-09-25: `main` fast-forwarded to `a1b1eed` and pushed. Batch 1 started.
- 2026-09-25: batch 1 done (T1-T6) and pushed. Machine note: five parallel writers exhausted RAM+swap on the Pi (22 other Claude sessions hold ~3.9 GB); T3/T5 were stopped and resumed from their worktrees. Run at most 3 writers at once and vitest with `--maxWorkers=2`.
- Open from batch 1: the white guide line on the first snake is not centred on the body (user; to be redone with the snake mechanic in batch 3); the flashlight's lit area is tile-stepped, not round; snake3's start octopus; the mud puddle tint reads grey; night levels have no hint at all while dark (check with a child).

## Next step

Batch 2 writers running; the user tests batches 1 and 2 together.
