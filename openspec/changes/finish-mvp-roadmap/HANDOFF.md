# Handoff: visual MVP follow-up

## Current state

- Branch: `main`
- Last pushed implementation: `b518031 feat(sand): make sweeping visually organic`
- Local, not yet pushed: `3831634 feat(leaves): speak of leaves in the monkey enclosure` and `64d9904 feat(leaves): paint the monkey enclosure's litter as leaves`
- Renewed 3:2 ImageGen sources and public exports are complete for:
  - glass/entrance
  - night zoo
  - sand/turtle habitat
  - leaves/monkey habitat
- Sand reveal polish is complete and visually approved.
- Leaves reveal polish (`glass3` / `glass4`) is complete and visually approved; see `apply-progress.md`, section "Leaves Activity Polish".
- Existing untracked `dev-server.err.log`, `dev-server.out.log`, and `tmp/` are local artifacts. Do not add, delete, or reinterpret them without the user's direction.

## Highest-priority remaining slice

None outstanding. The leaves slice this document was written to hand off is done: `glass3` / `glass4` no longer render rectangular `LEAF_LITTER` tiles, and their child-facing copy speaks of leaves rather than glass. Requirements 1-6 below were all met, except that requirement 5's 400-line cap was knowingly exceeded on the rendering commit — the copy/rendering split that requirement prescribes was applied, and the rendering half cannot be made smaller without gutting its falsifiable guards.

What remains is the work already listed under "Intentional deferrals", plus one open question for the author:

- **Blade overhang at the pile edge.** Blades and rakes are now admitted by their sampled extent, so no leaf ink lands on cleared paper. An earlier round let them overhang by up to 24 units, which visual QA judged as reading like fallen leaves at the pile's edge rather than as a defect. The stricter gate thins the frontier by about 3 blades out of 119 on a 3x2 cleared fixture, which did not warrant raising `LEAF_BLADE_COUNT`. If the author prefers the looser, more scattered edge, the sanctioned lever is the blade count, never the gate.

## Required workflow

1. Verify branch, SHA, status, and pre-existing local artifacts.
2. Delegate implementation to one agent.
3. Run an independent clean-context code review.
4. Run separate real-Chrome visual QA.
5. Fix confirmed findings and re-review.
6. Run focused tests, `npm test`, `npm run build`, and `git diff --check`.
7. Commit conventionally without AI attribution and push only when explicitly authorized.

Visual QA must cover start, partial, error, success, and map-return at `1280x720`, `844x390`, and `390x844`, using direct pointer gestures. Portrait must show rotate guidance rather than miniaturized gameplay.

## Intentional deferrals

- U10 narrative closures: wait for approved content.
- U15 / U15.1 infrastructure, final OpenSpec repair, verify/archive: deferred by user priority.
- PISTAS semantic deduction changes: out of scope.

## Evidence

Implementation and visual evidence for completed slices is recorded in `apply-progress.md`. The latest accepted backgrounds are:

- `art-source/fondo entrada vidrio.png`
- `art-source/fondo noche zoo.png`
- `art-source/fondo arena.png`
- `art-source/fondo recinto monos.png`
