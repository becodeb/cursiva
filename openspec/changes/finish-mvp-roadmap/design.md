# Design: Finish MVP Roadmap

## Technical Approach
Finish the MVP as 15 ordered one-commit local work units (U1→U15). These units implement the 12 roadmap themes by splitting high-risk art, integration, QA, and final-polish work into smaller reviewable commits. Each unit runs: implement → validate → fresh review → fix confirmed findings → conventional local commit. Reuse existing pure seams: progress/migration modules, zoo registries, screen reducers, canvas layers, art scripts, and docs/09/docs/16 contracts. No PR chain, generic engine rewrite, clue semantic rewrite, or deletion/reinterpretation of contaminated historical progress.

## Architecture Decisions
| Decision | Choice | Rejected | Rationale |
|---|---|---|---|
| Migration preservation | Preserve existing contaminated payloads; only block new bad migrations. | Cleanup/rewrite stored progress. | `LevelProgressStore` and `migrateEntrance` are additive/idempotent; progress loss is worse than historical dirt. |
| Progression model | Patch concrete registries and tests. | New progression engine. | `SECTORS`, `nextAdventure`, `starsFor`, and `totalStars` are pure, tested seams. |
| Clues | Improve PISTAS clarity/animation only. | Changing filing/deduction semantics. | `shouldFileClue` intentionally depends on route end, not clue-light state. |
| Art workflow | Generate real backgrounds, then integrate and QA separately. | Regenerating placeholders or unrelated assets. | docs/09 requires full 3:2 compositions with calm central gameplay bands. |
| Final polish | U14 is the approved docs/16 defect: add the missing wooden zoo-sign frame around in-level `CaptionedArt`. | Generic “remaining polish”. | The defect is narrow, testable, and must preserve existing caption/image semantics. |
| Roles | Keep implementation, art, QA, and review separate. | One actor judging its own visuals. | Visual quality needs independent generation plus Playwright verification. |

## Data Flow
`localStorage/cursiva.levels.v1 -> LevelProgressStore/openProgressStore -> App records -> ZooMap(nextAdventure, animals, totalStars) -> GameScreen -> LevelPlay -> save attempt -> map return`. Playwright seeds records or uses dev URLs, then captures the same UI the player sees.

## File Changes / Ordered Local Work Units
| Unit | Roadmap theme | Main seams | Validation |
|---|---|---|---|
| U1 | Migration regression | `client/src/game/migrateEntrance.test.ts`, `LevelProgressStore.ts` | Vitest: glass1-only/pond-safe preservation; no destructive writes. |
| U2 | Stars/unlocks/map return | `client/src/zoo/sectors.ts`, `stars.ts`, `adventures.ts`, tests | Sector, star, map-return tests. |
| U3 | Placeholder/art contract protection | `scripts/art/make_placeholders.py`, `build_art.py`, `docs/09_GUIA_DE_ESTILO_VISUAL.md`, `client/src/detective/*test.ts` | Script dry run plus art manifest/hierarchy tests. |
| U4 | Playwright visual matrix | `client/package.json`, `client/playwright.config.ts`, `client/e2e/mvp-visual.spec.ts`, optional `scripts/shot.sh` | 15 state×viewport captures with assertions. |
| U5 | Responsive/map/accessibility | `ZooMap.tsx`, `ZooMap.test.tsx`, `LevelPlay.tsx`, `App.test.tsx` | Portrait guidance remains navigable; map return reachable. |
| U6 | Ink policy | `TraceCanvas.tsx`, `canvas/ink.ts`, related tests | Ink visibility tests/screenshots; scoring unchanged. |
| U7 | Fogged glass polish | `RevealLayer.tsx`, reveal-grid tests, glass levels in `catalog.ts` | 15-cell matrix: start/partial/error/success/map-return at all three viewports. |
| U8 | Night discovery polish | `catalog.ts`, `backdrops.ts`, `RevealLayer.tsx`, `LevelPlay.test.tsx` | 15-cell matrix: start/partial/error/success/map-return at all three viewports. |
| U9 | PISTAS clarity/animation | `PistasRail.tsx`, `LevelPlay.tsx`, `PistasRail.test.tsx` | Animation/accessibility assertions; filing semantics unchanged. |
| U10 | Narrative closures | `zoo/adventures.ts`, `AdventureIntro.tsx`, `AdventureClosing.tsx`, `GameScreen.test.tsx` | Verify/remediate already-existing approved closings for `peces`, `tortugas`, `monos`, and `sendero` beat 0/1; record jellyfish/medusa/unapproved content only. |
| U11 | Background generation | `art-source/`, `client/public/art/`, docs/09 prompts | Art role generates full 3:2 backgrounds with calm bands. |
| U12 | Background integration | `scripts/art/build_art.py`, art registry/public assets | Approved assets wired; placeholder protection retained. |
| U13 | Visual QA | Playwright evidence paths | Fresh QA verifies completed visual units have 15 real-scene cells across map, glass, night, PISTAS, approved closing, and renewed backgrounds; U14 is verified by U14 itself. |
| U14 | docs/16 sign-frame defect | `LevelPlay` in-level `CaptionedArt` rendering/tests | Add the approved wooden zoo-sign frame inside playable `LevelPlay` content, not only Pulpito speech bubbles; preserve caption/image semantics and run its own 15-cell Playwright matrix. |
| U15 | Final closure and archive preflight | Targeted Vitest/build, visual matrix, openspec/specs/{detective-mode,trace-canvas,zoo-map}/spec.md | Structurally repair the three known invalid main specs without semantic changes before archive; if combined U15 exceeds 400 lines, land that repair as its own local docs commit. |

## Interfaces / Contracts
No generic engine or new persistence contract. Continue with `LevelRecord`, `Records`, `ZooSector.unlockedWhen(records)`, `nextAdventure(sector, records)`, `starsFor(record)`, `totalStars(records)`, `shouldFileClue(hasClueTrail, reachedEnd)`, and the existing `CaptionedArt` caption/image accessibility contract.

## Testing Strategy
| Layer | What to Test | Approach |
|---|---|---|
| Unit | Migration, stars, unlocks, ink, reveal, PISTAS, narrative helpers, CaptionedArt frame contract | Vitest beside current seams. |
| Integration | Map return, screen wiring, in-level sign rendering | Existing React/render tests plus reducer-level assertions. |
| E2E | Required visual states | Playwright matrix: viewports `1280x720`, `844x390`, `390x844`; states start, partial, error, success, map-return; cover map, glass, night, PISTAS, approved narrative closing, renewed backgrounds, and the docs/16 in-level sign frame; U14 owns the signage 15-cell matrix and U15 may re-check it. |

## Migration / Rollout
No storage version bump. Migrations remain additive and idempotent; rollback is reverting the affected local commit without deleting localStorage. Keep each U1→U15 commit under 400 changed lines where practical; split only within the local-commit sequence if risk grows. Do not push, pull, reset, rebase, discard, open PRs, or create a PR chain. U15 includes an archive-preflight structural repair of pre-existing invalid main specs; if it would push U15 over 400 changed lines, make that repair its own conventional local docs commit.

## Open Questions
- None blocking design; content gaps are blockers only for their own units.
