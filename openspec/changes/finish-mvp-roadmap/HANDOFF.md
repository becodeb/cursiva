# Handoff: visual MVP follow-up

## Current state

- Branch: `main`
- Last pushed implementation: `b518031 feat(sand): make sweeping visually organic`
- Renewed 3:2 ImageGen sources and public exports are complete for:
  - glass/entrance
  - night zoo
  - sand/turtle habitat
  - leaves/monkey habitat
- Sand reveal polish is complete and visually approved.
- Existing untracked `dev-server.err.log`, `dev-server.out.log`, and `tmp/` are local artifacts. Do not add, delete, or reinterpret them without the user's direction.

## Highest-priority remaining slice

Polish the leaves activity (`glass3` / `glass4`) so it no longer renders hard rectangular `LEAF_LITTER` tiles or uses glass-oriented child-facing copy.

Requirements:

1. Reuse the typed render-local reveal policy established by the sand slice; do not build a generic engine.
2. Add a leaves-specific visual policy with a coherent leaf layer, subtle organic cleared boundaries, and sparse leaf cues.
3. Preserve exactly the reveal grid, invisible rect sentinels, scoring, gestures, persistence, unlocks, ink policy, level IDs, and progression.
4. Align only child-facing titles/instruction/error/success copy for `glass3` / `glass4`; do not change narrative or deduction semantics.
5. Keep the slice below 400 textual changed lines. If that is not possible, split copy from rendering.
6. Do not generate more background images unless real visual QA proves one of the four renewed families is unusable.

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
