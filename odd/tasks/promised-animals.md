# The promised animals: fish, turtles and monkeys

Feature document (ODD). Engram mirror: topic `odd/promised-animals/tasks`, project `cursiva`.
Story source: `docs/18_DIAGNOSTICO_Y_REDISENO_PEDAGOGICO.md` §4.5, approved by the user on
2026-09-23 ("me parece bien, continuala").

## Objective

Keep the prologue's promise. The prologue shows the fish, turtle and monkey enclosures empty; today
the child never finds those animals. Add one rescue adventure for each, and use them to teach the
three pre-writing patterns cursive still needs:

| Adventure id | Animal | Sector | Pattern | Prepares |
|---|---|---|---|---|
| `fish` | pez | estanque | U garlands (reuses `f2-guirnalda`, `f2-agua2..4`) | `u`, `w`, joins between letters |
| `turtles` | tortuga | arena | counter-clockwise closed ovals (new generator) | Ola family `c a d g q o` (`docs/01` §8) |
| `monkeys` | mono | bosque | rising loops (`loops` generator) | Rulo family `e l b h k f` (`docs/01` §8) |

When rescued, each animal goes back to its enclosure at the entrance (its map spot is in `entrada`),
which closes the prologue's loop.

## Constraints

- The ids `peces`, `tortugas`, `monos` belong to the entrance's cleaning enclosures: new rows use
  `fish`, `turtles`, `monkeys`. New level ids (`turtle1..4`, `monkey1..4`) become persisted keys.
- Everything from `odd/tasks/adventure-flow-and-map-guidance.md` §Constraints still applies (no
  `url(#…)`/mask/clipPath/pattern/filter, node-env tests, M/L/C-only paths, Rioplatense child copy).
- Art: `pez.png` and `tortuga.png` exist in `art-source/` (real transparency); there is no monkey
  cutout, so it ships as a placeholder plus a ChatGPT request in `docs/18` §6.

## Mode and checks

TDD off (`openspec/config.yaml`); `npm test`, `npm run build`, `git diff --check`; browser QA with
the geometry tracer (`/tmp/cursiva-qa/lib.mjs`) on every new level at 1280x720 and 844x390; journey
replay. RDD is off (user, 2026-09-23): `gentle-ai review assess` over each writer diff decides the
verification tier.

## Delivery

Branch `feat/promised-animals`, stacked on `feat/adventure-flow-and-map-guidance` (`29f97a8`, not
merged). Forecast ~1,200 authored lines; PR chain strategy deferred to delivery (user decision).

## Tasks

- [x] **P0 — Feature document + Engram mirror.** Route: inline.
- [ ] **P1 — Animal art.** Export `pez.png` and `tortuga.png` as zoo animals, add a monkey
      placeholder source, extend `ZooAnimalId`/`ZOO_ANIMAL_ART`, manifest and registry tests.
      Route: delegated (art pipeline + assets + tests).
- [ ] **P2 — The fish adventure.** `fish` row over the four garland levels (bubble clues instead of
      the medusa goal), intro/closing/hints, backdrop, fish back at the entrance, journey stop.
      Route: delegated (same writer as P1).
- [ ] **P3 — Oval generator + the turtles adventure.** New `ovals` path generator (M/L/C only,
      counter-clockwise, tested by signed area), `turtle1..4`, `turtles` row in arena. Route:
      delegated.
- [ ] **P4 — The monkeys adventure.** `monkey1..4` on `loops`, `monkeys` row in bosque. Route:
      delegated (same writer as P3).
- [ ] **P5 — QA and docs.** Trace every new level in the browser, replay the journey, captures,
      `docs/18` (§4.5, §6 monkey request, §7), `docs/00`. Route: inline.

## Acceptance criteria

- Every new level is completable by tracing its route in a real browser at 1280x720 and 844x390.
- The map's journey reaches fish, turtles and monkeys; each rescue closes with its animal and puts
  it back at the entrance.
- The oval generator only emits M/L/C and its ovals are counter-clockwise on screen.
- `npm test`, `npm run build`, `git diff --check` green at every commit.

## Progress and evidence

| Task | Commit | Route | Checks |
|------|--------|-------|--------|

## Next step

Delegate P1 + P2.
