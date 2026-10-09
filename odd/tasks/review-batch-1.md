# Review batch 1 — obvious fixes, no new art

Feature document (ODD). Engram mirror: topic `odd/review-batch-1/tasks`, project `cursiva`.
Source: `docs/25_REVISION_PSICOPEDAGOGICA.md` §7, tanda 1; the author said "arrancá" on 2026-10-09.

## Objective

Apply the six obvious fixes of `docs/25` §7 tanda 1 so a child who cannot read hears every
correction, understands a restart, hears the first prologue line, sees the gesture before the dark
night levels and the bee, and so real sessions can be timed.

## Scope and constraints

- Only tanda 1 items (1.1–1.6). No story, script or art change; no new spoken line unless it reuses
  copy that already exists in the game. Any genuinely new phrase is listed for the author instead.
- Everything in `odd/tasks/prewriting-stage-completion.md` §Constraints still applies (no
  `url(#…)`/mask/clipPath/pattern/filter, node-env tests, Rioplatense child copy, level ids are
  persisted keys, no red, no failure sound).
- One worktree per task under `/home/opencode/projects/cursiva-wt/`, `node_modules` symlinked to `main`.
  Never `npm ci`/`npm install` there.
- Pi limits: at most 3 writers in parallel; `npx vitest run --maxWorkers=2`; ONE headless Chromium at a
  time machine-wide (writers take `flock /tmp/cursiva-chromium.lock` around any browser run).

## Mode and checks

TDD off (`openspec/config.yaml`), runner vitest. Per task: targeted tests + full suite
(`cd client && npx vitest run --maxWorkers=2`), `npm run build` (exit code checked on its own),
`git diff --check`, browser QA with `/usr/bin/chromium --disable-gpu` at 1024x768 and 768x1024, with
`getBoundingClientRect` measurements; screenshots under `capturas/2026-10-09-tanda-r1/` (git-ignored).
The orchestrator looks at the screenshots before merging. RDD off (author's decision).

## Delivery

One branch per task, merged `--no-ff` into `main` by the orchestrator after its checks, pushed at the
end of the batch. Expected size: each task well under 400 authored lines.

## Tasks

| ID | Task | Branch / route | Status | Evidence |
|----|------|----------------|--------|----------|
| B1 | 1.1 speak the corrections that are text only today (reveal/erase hints, night "Encontraste…", `f3-*` advice) + 1.2 wall-contact restart: soft sound and the T33 start-point hint, plus the existing "Volvé a empezar" line if it already exists | `fix/spoken-feedback`, delegated writer | pending | |
| B2 | 1.3 big start tap before prologue plate 0 so its line is heard + 1.4 demo hand on `night2`–`4` and a demo on `bee1`–`4` | `fix/prologue-and-demos`, delegated writer (opus) | done | `1c772aa`, `925656a`. Full suite 3610 passed, build exit 0, diff-check clean. Spied speech: start tap speaks plate 0 once. Orchestrator looked at `_sheets/b2-*.png`: play button centred, no overlap; demo hand on night2-4; blue demo stroke on bee1/bee3. Bee demo replaces bee1's short hand nudge; bee levels gain the replay button |
| B3 | 1.5 visual defects V1 (prologue map button), V2 (turtles intro bubble wrap), V3 (`dolphin4` HUD clipped in portrait), V5 (deduction bubble type size) + 1.6 store each attempt's duration | `fix/review-visual-and-timing`, delegated writer | pending | |
| B4 | Orchestrator review of screenshots, merge the three branches, full checks on `main`, push | inline | pending | |

## Progress

- 2026-10-09: feature document created; three worktrees ready.
- 2026-10-09: B2 done and reviewed from its screenshots.

## Next step

B1, B2, B3 in parallel.
