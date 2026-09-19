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
- [ ] U1. Migration regression — add Vitest coverage and additive/idempotent safeguards in `client/src/game/migrateEntrance.test.ts` and `LevelProgressStore.ts`; preserve contaminated localStorage.
- [ ] U2. Progression consistency — verify/fix stars, unlocks, and map return in `client/src/zoo/{sectors,stars,adventures}.*` with focused tests.
- [ ] U3. Asset/docs protection — protect authored assets in `scripts/art/{make_placeholders,build_art}.py`; document docs/09 contract and test manifest hierarchy.
- [ ] U4. Playwright harness — add `client/playwright.config.ts` and `client/e2e/mvp-visual.spec.ts`; capture 15 state×viewport combinations.
- [ ] U5. Responsive/map accessibility — update `ZooMap.tsx`, `LevelPlay.tsx`, and tests; portrait guidance stays dismissible and map return reachable.
- [ ] U6. Ink policy — implement existing `TraceCanvas.tsx`/`canvas/ink.ts` seams with tests/screenshots; do not alter deduction or scoring.
- [ ] U7. Fogged glass — polish `RevealLayer.tsx`, reveal-grid tests, and glass catalog; capture start/partial/success.
- [ ] U8. Night discovery — update catalog/backdrops/reveal behavior and tests; capture start/partial/error/success.
- [ ] U9. PISTAS clarity — improve `PistasRail.tsx`/`LevelPlay.tsx` animation and accessibility; prove filing/deduction semantics unchanged.
- [ ] U10. Narrative closures — render only the approved docs/16/current-registry entrance closings (`peces`, `tortugas`, `monos`, `sendero` beat 0/1); record jellyfish/medusa/unapproved content as blockers, not invented copy.
- [ ] U11. Background generation — Art role creates docs/09-compliant 3:2 families with calm gameplay bands in `art-source/` and `client/public/art/`.
- [ ] U12. Background integration — wire approved assets/build script; retain placeholder protection and add focused validation.
- [ ] U13. Visual QA — fresh QA verifies 15 real-scene cells per applicable visual unit across map, glass, night, PISTAS, approved closing, renewed backgrounds, and U14 signage; record isolated blockers.
- [ ] U14. docs/16 sign-frame defect — add the missing wooden zoo-sign frame around in-level `CaptionedArt`, not only Pulpito's speech bubble; preserve caption/image semantics with focused tests and stay under 400 changed lines.
- [ ] U15. Final closure — rerun required captures plus targeted Vitest/build; verify rollback boundaries, progress preservation, and no engine rewrite.
  - [ ] U15.1 Archive preflight — structurally repair pre-existing invalid main specs `openspec/specs/detective-mode/spec.md`, `openspec/specs/trace-canvas/spec.md`, and `openspec/specs/zoo-map/spec.md` without semantic changes before final archive; if combined U15 exceeds 400 lines, make this repair its own conventional local docs commit.

Content-dependent blockers remain recorded and isolated; unrelated local units may proceed.