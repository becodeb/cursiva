# Tasks: Finish MVP Roadmap

## Review Workload Forecast

Estimated changed lines: 1,200–1,800 total; each local work unit targets <400 changed lines.
Chained PRs recommended: No
Decision needed before apply: No
Chain strategy: N/A (local commits only; no PR chain)
400-line budget risk: Low
Suggested split: local commits U1→U15; no PR/push/pull/reset/rebase/discard.
Delivery mode: automatic local execution.

The committed LF/CRLF baseline is complete and excluded. Execute U1→U15 automatically in order. Each unit lifecycle is: implement → validate → fresh review → fix confirmed findings → conventional local commit. Do not pull, push, reset, rebase, discard, open PRs, or create a PR chain.

## Ordered Work Units

- [x] U0. Baseline — confirm the committed LF/CRLF normalization; no pending baseline changes.
- [x] U1. Migration regression — add Vitest coverage and additive/idempotent safeguards in `client/src/game/migrateEntrance.test.ts` and `LevelProgressStore.ts`; preserve contaminated localStorage.
- [x] U2. Progression consistency — verify/fix stars, unlocks, and map return in `client/src/zoo/{sectors,stars,adventures}.*` with focused tests.
- [x] U3. Asset/docs protection — protect authored placeholder sources in `scripts/art/make_placeholders.py`; document docs/09 source hierarchy and safe placeholder behavior.
- [x] U4. Playwright harness — add `client/playwright.config.ts` and `client/e2e/mvp-visual.spec.ts`; capture 15 state×viewport combinations.
- [x] U5. Responsive/map accessibility — update `ZooMap.tsx`, `LevelPlay.tsx`, and tests; portrait guidance stays dismissible and map return reachable.
- [x] U6. Ink policy — implement existing `TraceCanvas.tsx`/`canvas/ink.ts` seams with tests/screenshots; do not alter deduction or scoring.
- [x] U7. Fogged glass — polish `RevealLayer.tsx`, reveal-grid tests, and glass catalog; capture start/partial/error/success/map-return at all three viewports (15 cells).
- [x] U8. Night discovery — update catalog/backdrops/reveal behavior and tests; capture start/partial/error/success/map-return at all three viewports (15 cells).
- [x] U9. PISTAS clarity — improve `PistasRail.tsx`/`LevelPlay.tsx` animation and accessibility; prove filing/deduction semantics unchanged.
- [ ] U10. Narrative closures — verify/remediate the already-existing exact approved docs/16/current-registry entrance closings (`peces`, `tortugas`, `monos`, `sendero` beat 0/1); record jellyfish/medusa/unapproved content only. DEFERRED by explicit user instruction for this U7 slice; do not mark complete until resumed.
- [x] U11. Background generation — Art role created docs/09-compliant 3:2 family source candidates with calm gameplay zones in `art-source/`; `client/public/art/` export/registry wiring remains deferred to U12.
- [x] U12. Background integration — wire approved assets/build script; retain placeholder protection and add focused validation.
- [x] U13. Visual QA — fresh QA verifies 15 real-scene cells for completed visual units across map, glass, night, PISTAS, approved closing, and renewed backgrounds; record isolated blockers. U14 signage is excluded here and verified by U14.
- [x] U14. docs/16 sign-frame defect — add the approved wooden zoo-sign frame around in-level `CaptionedArt` inside playable `LevelPlay` content, not only Pulpito's speech bubble; preserve caption/image semantics, run focused tests, and capture its own 15-cell Playwright matrix.
- [ ] U15. Final closure — rerun required captures, including optional re-check of U14 signage, plus targeted Vitest/build; verify rollback boundaries, progress preservation, and no engine rewrite. DEFERRED by explicit user instruction for this U7 slice; infrastructure/archive work remains pending.
  - [ ] U15.1 Archive preflight — structurally repair pre-existing invalid main specs `openspec/specs/detective-mode/spec.md`, `openspec/specs/trace-canvas/spec.md`, and `openspec/specs/zoo-map/spec.md` without semantic changes before final archive; if combined U15 exceeds 400 lines, make this repair its own conventional local docs commit. DEFERRED by explicit user instruction; do not mark complete until resumed.

Execution priority after U9 is explicitly recorded as U11 → U12 → U13 → U14. U10 narrative content and U15/U15.1 infrastructure/archive work are deferred and not complete.

Content-dependent blockers remain recorded and isolated; unrelated local units may proceed.
