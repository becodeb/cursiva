# Apply Progress: Finish MVP Roadmap

## Cumulative Status

- Completed before this unit: U0 Baseline, U1 Migration regression, U2 Progression consistency, U3 Asset/docs protection, U4 Playwright harness, U5 Responsive/map accessibility. Build/export atomicity is explicitly deferred to U12.
- Completed in this unit: U6 Ink policy, including explicit `settled | live-only | none` resolution, TraceCanvas lifecycle gating, interaction-level regression coverage, and before/after 15-cell Playwright evidence.
- Remaining before U7: U7–U15.1.
- Completed in this unit: U7 Fogged glass polish.
- Remaining after U7: U8–U15.1. Explicit deferrals: U10 narrative content, U15 final closure, and U15.1 archive preflight remain pending and are not complete. Execution priority after U9 is U11 → U12 → U13 → U14.

## U1 Migration Regression

### Scope
Implemented only the U1 storage/migration regression around the real `openProgressStore` path and tightened the progress-store spec to the intended conservative contamination contract.

### Behavior
- Fresh storage can complete only `glass1` and reopen through `openProgressStore` without inventing `sand4`.
- Because `sand4` is not invented, `estanque.unlockedWhen(records)` remains false for that fresh `glass1`-only profile.
- Existing legacy payloads without entrance-level records still receive the additive `sand4` copy-forward seed, preserving the verified returning-child pond behavior.
- Existing structurally valid `sand4` records and other known level records survive real store reopen/save without domain-field changes; `estanque` stays unlocked because the existing `sand4` progress remains present.
- The spec no longer promises byte-for-byte preservation of arbitrary malformed, duplicate, or out-of-contract localStorage fields.

### RED / GREEN Evidence
| Step | Command | Result |
|---|---|---|
| Baseline related tests | `npm run test -w client -- src/game/migrateEntrance.test.ts src/game/levelProgress.test.ts src/zoo/sectors.test.ts` | PASS: 3 files, 92 tests. |
| RED | `npm run test -w client -- src/game/migrateEntrance.test.ts` after adding only the fresh glass1 regression test | FAIL: new real-open-path test observed an invented `sand4` record. |
| GREEN focused | `npm run test -w client -- src/game/migrateEntrance.test.ts` | PASS: 1 file, 17 tests. |
| GREEN related | `npm run test -w client -- src/game/migrateEntrance.test.ts src/game/levelProgress.test.ts src/game/*.test.ts src/zoo/sectors.test.ts src/zoo/adventures.test.ts` | PASS: 4 files, 131 tests. |
| Root tests | `npm run test` | PASS: 82 files, 1903 tests. |
| Build | `npm run build` | PASS: TypeScript and Vite build succeeded; Vite reported only the existing chunk-size warning. |

### Files Changed
- `client/src/game/migrateEntrance.ts` — added an entrance-progress guard before seeding `sand4`.
- `client/src/game/migrateEntrance.test.ts` — added real `openProgressStore` regression coverage for fresh glass1 and real-storage preservation coverage for existing valid `sand4`.
- `openspec/changes/finish-mvp-roadmap/specs/progress-store/spec.md` — narrowed the contaminated-progress contract to valid existing `sand4`/known-record preservation.
- `openspec/changes/finish-mvp-roadmap/tasks.md` — marked only U1 complete.
- `openspec/changes/finish-mvp-roadmap/apply-progress.md` — recorded cumulative U0/U1 progress and evidence.

### Deviations
None — implementation follows the design's additive/idempotent migration seam and preserves valid existing progress without over-promising malformed localStorage preservation.

## U2 Progression Consistency

### Scope
Verified the existing concrete zoo progression seams and added regression coverage. The remaining review finding required observing App's actual state/wiring transitions, so the helper-export approach was removed and replaced with an interactive App render in the existing Vitest/React stack.

### Behavior
- Filing all entrada records produces the same story across seams: stars count those records, the pond opens, the map focuses the pond, the next pond adventure is `duck-trail1`, and no pond animal is recovered yet.
- Filing the first pond adventure through `duck-trail4` counts the same stars, places the duck, unlocks `montanas`, and advances the pond's next adventure to `f2-guirnalda` from the same record set.
- The interactive App regression seeds `sand4`, renders actual `App` at `?nivel=duck-trail1`, has mocked `GameScreen` invoke the real App `onExit` wiring after persisting `duck-trail1` through `openProgressStore`, observes App re-render mocked `ZooMap` with refreshed records, invokes the real `ZooMap.onEnter` prop with the same sector's `nextAdventure`, and observes App re-render mocked `GameScreen` for `duck-trail2`.
- Deduction semantics remain unchanged: no production route was added, and existing focused GameScreen assertions still prove sector-owned levels exit instead of opening deduction.

### Evidence
| Step | Command | Result |
|---|---|---|
| Baseline related tests | `npm run test -w client -- src/zoo/sectors.test.ts src/zoo/stars.test.ts src/zoo/adventures.test.ts src/screen/GameScreen.test.tsx src/App.test.tsx` | PASS before initial U2 edits: 5 files, 156 tests. |
| Initial characterization | Added U2 consistency tests in `sectors.test.ts` and a helper-only GameScreen map-return test | PASS: 5 files, 159 tests. |
| Final review fix | Removed helper-only/exported-seam strategy; added interactive App wiring regression in `App.test.tsx` using React `createRoot` plus a tiny fake DOM and mocked child boundaries | PASS: 5 files, 159 tests. |
| Focused related tests | `npm run test -w client -- src/App.test.tsx src/screen/GameScreen.test.tsx src/zoo/sectors.test.ts src/zoo/stars.test.ts src/zoo/adventures.test.ts` | PASS: 5 files, 159 tests. |
| Root tests | `npm run test` | PASS: 82 files, 1903 tests. |
| Build | `npm run build` | PASS: TypeScript and Vite build succeeded; Vite reported only the existing chunk-size warning. |

### Files Changed
- `client/src/App.test.tsx` — added the final interactive U2 wiring regression with a minimal fake DOM, mocked `GameScreen`/`ZooMap` boundaries, fake `localStorage`, actual App state transitions, actual `openProgressStore`, and actual `nextAdventure` for the pond sector.
- `client/src/zoo/sectors.test.ts` — added U2 consistency characterization tests across `totalStars`, `isOpen`, `recentlyDiscovered`, `nextAdventure`, and `animalPlacements` using the same persisted records.
- `openspec/changes/finish-mvp-roadmap/tasks.md` — marked only U2 complete; U3–U15.1 remain unchecked.
- `openspec/changes/finish-mvp-roadmap/apply-progress.md` — recorded cumulative U0–U2 progress and final review-fix evidence.

### Deviations
None — U2 avoided a generic progression engine and now requires no production seam exports for the App wiring regression.

## U3 Asset/docs Protection

### Scope
Implemented only the U3 art-source and documentation protection layer. No visual assets were normalized, regenerated, or edited.

### Behavior
- `make_placeholders.py` now has a testable `write_placeholders(src, dry_run=False)` seam and a `--dry-run` CLI mode.
- Existing placeholder-family source files are treated as protected authored sources and all six are skipped byte-for-byte rather than overwritten.
- Missing placeholder-family sources are created only when absent; dry runs report the same create/skip plan without writing files or creating a missing target directory.
- `docs/09_GUIA_DE_ESTILO_VISUAL.md` now documents the source -> build -> manifest -> registry hierarchy and the safe placeholder behavior without weakening its 3:2/calm-zone visual authority.
- Build/export failure atomicity and missing-source validation remain deferred to U12; U3 does not claim them fixed.

### RED / GREEN Evidence
| Step | Command | Result |
|---|---|---|
| RED | `python -m unittest scripts.art.make_placeholders_test` after adding the protection tests first | FAIL: `write_placeholders` did not exist, proving the old script had no dry-run/testable protection seam. |
| Review RED | `python -m unittest scripts.art.make_placeholders_test` after adding the confirmed dry-run regression | FAIL: dry run created a nonexistent target directory. |
| GREEN focused Python | `python -m unittest scripts.art.make_placeholders_test` | PASS: 2 tests. |
| Dry run | `python scripts\art\make_placeholders.py --dry-run` | PASS: reported 0 creates and 6 protected existing source skips; wrote no art files/directories. |
| Related existing client art guard | `npm run test -w client -- src/detective/artHierarchy.test.ts` | PASS: 1 file, 9 tests. |

### Files Changed
- `scripts/art/make_placeholders.py` — added conservative skip-only placeholder planning, dry-run CLI, and a reusable write seam.
- `scripts/art/make_placeholders_test.py` — added focused regression coverage for all-six non-overwrite byte preservation and zero-mutation dry-run behavior.
- `docs/09_GUIA_DE_ESTILO_VISUAL.md` — updated the art hierarchy and placeholder protection contract while deferring build/export failure behavior to U12.
- `openspec/changes/finish-mvp-roadmap/tasks.md` — marked only U3 complete.
- `openspec/changes/finish-mvp-roadmap/apply-progress.md` — recorded cumulative U0–U3 progress and evidence.

### Deviations
None — implementation preserves docs/09 authority, does not touch visual assets, and narrows U3 to safe placeholder generation. Build/export atomicity is deferred to U12.

## U4 Playwright Harness

### Scope
Implemented only the reusable Playwright visual-matrix foundation. No product UX, selectors, or component mocks were added.

### Behavior
- `@playwright/test` is installed in the `client` workspace and recorded in the root lockfile.
- `client/playwright.config.ts` starts the real Vite app at `127.0.0.1:4173`, writes reports under ignored Playwright folders, and defaults to managed Chromium while allowing `PLAYWRIGHT_CHANNEL=chrome` for local machines that already have Chrome installed.
- `client/e2e/mvp-visual.spec.ts` defines the reusable viewport names (`desktop` 1280x720, `landscape` 844x390, `portrait` 390x844) and state vocabulary (`start`, `partial`, `error`, `success`, `map-return`).
- The harness captures 15 real UI cells. The baseline matrix uses real app routes: `glass1` for start/partial/success/map-return, the existing `revelado` render-state debug flag for partial/success reveal fixtures, real pointer input on `f1-libre` for error, and the real back button for map-return.
- Evidence screenshots are generated under ignored `client/test-results/playwright-output/.../mvp-visual-matrix/*.png`; they are not committed golden baselines.

### Evidence
| Step | Command | Result |
|---|---|---|
| Browser setup attempt | `npx playwright install chromium` | FAILED locally: repeated timeout downloading Chrome for Testing from Playwright CDN. |
| Local browser fallback | `$env:PLAYWRIGHT_CHANNEL='chrome'; npm run test:e2e -w client` | PASS: 15 Playwright cells using installed local Chrome. |
| Existing client tests | `npm run test -w client` | PASS: 82 files, 1887 tests. |
| Root tests | `npm run test` | PASS: 82 files, 1903 tests. |
| Build | `npm run build` | PASS: TypeScript and Vite build succeeded; Vite reported only the existing chunk-size warning. |

### Visual Observations
- `start`: the fogged glass scene renders with the pale blue background, top water line, central covered rectangle, back control, and bottom action controls at all three viewports.
- `partial`: the same real glass scene renders with a smaller remaining covered area from the deterministic `revelado:45` fixture.
- `error`: the real `f1-libre` attempt view shows a short dark stroke, result pillars, the coaching text "Quedate adentro del camino, despacito.", and disabled `Siguiente`.
- `success`: the deterministic `revelado:100` fixture reveals the beach/treasure artwork with the action controls still visible.
- `map-return`: clicking the real back control lands on the zoo map with the Pulpito in the plaza, fogged sectors, star HUD, speech bubble, and dev reset overlay because the route is intentionally `?dev`.

### Files Changed
- `client/package.json` — added `test:e2e` and `@playwright/test`.
- `package-lock.json` — locked Playwright dependencies for the workspace.
- `client/playwright.config.ts` — added the stable local Vite webServer, Chromium project, output/report locations, reduced motion, and optional local Chrome channel override.
- `client/e2e/mvp-visual.spec.ts` — added reusable viewport/state matrix helpers and 15 real-UI captures.
- `.gitignore` — ignored Playwright output and HTML report folders.
- `openspec/changes/finish-mvp-roadmap/tasks.md` — marked only U4 complete.
- `openspec/changes/finish-mvp-roadmap/apply-progress.md` — recorded cumulative U0–U4 progress and evidence.

### Deviations
None — U4 establishes the Playwright harness and representative baseline matrix only. Later visual units still own their product-specific UX changes and quality judgment.

## U4 Review Fixes

### Scope
Fixed confirmed review/visual-QA findings in the U4 Playwright harness only. No U5+ product behavior was changed.

### Behavior
- `client/playwright.config.ts` now starts Vite with `--strictPort` on `127.0.0.1:4173` and `reuseExistingServer: false`, so an occupied port fails instead of reusing an unverified stale server.
- Playwright output and HTML report folders are isolated per invocation under a sanitized run id. `PLAYWRIGHT_RUN_ID` provides deterministic evidence paths; otherwise the config uses a timestamp plus process id. All output roots remain ignored.
- `client/e2e/mvp-visual.spec.ts` now asserts the real reveal-tile count for the glass fixtures: start = 60 tiles, partial `?debug=revelado:45` = 30 tiles, success `?debug=revelado:100` = 0 tiles.
- Evidence screenshots now use viewport capture only, not `fullPage`, so page overflow is visible as a defect instead of hidden in a taller screenshot.
- `tasks.md` and `apply-progress.md` were trimmed to a single EOF newline; `git diff --check` passes.

### Evidence
| Step | Command | Result |
|---|---|---|
| Matrix run A | `$env:PLAYWRIGHT_CHANNEL='chrome'; $env:PLAYWRIGHT_RUN_ID='u4-review-run-a'; npm run test:e2e -w client` | PASS: 15 Playwright cells in isolated run folder. |
| Matrix run B | `$env:PLAYWRIGHT_CHANNEL='chrome'; $env:PLAYWRIGHT_RUN_ID='u4-review-run-b'; npm run test:e2e -w client` | PASS: 15 Playwright cells in a second isolated run folder. |
| Root tests | `npm run test` | PASS: 82 files, 1887 tests. |
| Root build | `npm run build` | PASS: TypeScript and Vite build succeeded; Vite reported only the existing chunk-size warning. |
| Whitespace | `git diff --check` | PASS. |

### Visual Observations
- Run B produced exactly 15 viewport-sized screenshots: `1280x720`, `844x390`, and `390x844` for each state.
- `start` shows a full 60-tile grime cover over the glass scene.
- `partial` visibly differs from start and has the top half revealed by the 30 remaining-tile `revelado:45` fixture.
- `success` visibly differs from both start and partial with all grime tiles gone and the beach/treasure content visible.
- `error` still shows the real `f1-libre` attempt result with coaching text and disabled `Siguiente`.
- `map-return` still shows the real zoo map after using the visible back control.

### Evidence Paths
- `client/test-results/playwright-output/u4-review-run-a/.../mvp-visual-matrix/*.png`
- `client/test-results/playwright-output/u4-review-run-b/.../mvp-visual-matrix/*.png`
- `client/test-results/playwright-output/u4-review-run-b-contact-sheet.png`

### Deviations
None — the fixes harden the U4 harness and assertions without changing production UX or later roadmap units.

## U4 Path Traversal Fix

### Scope
Fixed the confirmed critical path-traversal defect in Playwright per-run output/report path handling only. No U5+ product behavior was changed.

### Behavior
- `PLAYWRIGHT_RUN_ID` is sanitized through `client/playwright.runPaths.mjs`; dot-only values such as `..`, `.`, and empty strings fall back to a safe id.
- Every sanitized id is prefixed with `run-`, so separator-containing values like `../outside` become a leaf directory under the dedicated base instead of a path segment that can escape.
- Output and report directories are resolved against their dedicated bases and rejected if the resolved path is outside those bases before the Playwright config is exported.
- `client/scripts/playwrightRunPaths.test.mjs` covers `..`, `.`, separators, empty, and normal ids without invoking Playwright cleanup.

### Evidence
| Step | Command | Result |
|---|---|---|
| Path regression | `node client/scripts/playwrightRunPaths.test.mjs` | PASS. |
| Unique-id matrix | `$env:PLAYWRIGHT_CHANNEL='chrome'; $env:PLAYWRIGHT_RUN_ID='u4-traversal-safe'; npm run test:e2e -w client` | PASS: 15 Playwright cells under `run-u4-traversal-safe`. |
| Root tests | `npm run test` | PASS: 82 files, 1887 tests. |
| Root build | `npm run build` | PASS: TypeScript and Vite build succeeded; Vite reported only the existing chunk-size warning. |
| Whitespace | `git diff --check` | PASS. |

### Visual Observations
- The unique-id run produced exactly 15 viewport screenshots: desktop `1280x720`, landscape `844x390`, and portrait `390x844` for each state.
- `partial` remains visibly distinct from `start` with the top of the glass scene revealed.
- `success` shows the beach/treasure content with no grime tiles, confirming the viewport capture still exercises the deterministic fixture.
- `error` and `map-return` still capture the real app paths: failed writing attempt and zoo-map return via the visible back control.

### Evidence Paths
- `client/test-results/playwright-output/run-u4-traversal-safe/.../mvp-visual-matrix/*.png`
- `client/test-results/playwright-output/run-u4-traversal-safe-contact-sheet.png`

### Deviations
None — the change hardens U4 evidence isolation without changing production UX or later roadmap units.

## U4 Changed-Line Accounting and Local Commit Boundaries

Git-style changed-line accounting uses additions plus deletions, counting untracked added files as all-added. The full U4 diff now exceeds the 400-line review budget, so it is split into two coherent local commit boundaries:

| Boundary | Scope | Files | Git-style count |
|---|---|---|---|
| A | Safe Playwright runner infrastructure | `.gitignore`, `client/package.json`, `package-lock.json`, `client/playwright.config.ts`, `client/playwright.runPaths.mjs`, `client/scripts/playwrightRunPaths.test.mjs` | 201 (199 additions, 2 deletions) |
| B | Visual matrix and SDD artifacts | `client/e2e/mvp-visual.spec.ts`, `openspec/changes/finish-mvp-roadmap/tasks.md`, `openspec/changes/finish-mvp-roadmap/apply-progress.md` | 257 (253 additions, 4 deletions) |

Both boundaries are independently coherent and below 400 changed lines: A installs/configures a safe reproducible runner plus path-regression coverage; B adds the reusable real-UI visual matrix and records U4 SDD completion/evidence.

## U5 Responsive / Map Accessibility

### Scope
Implemented only U5 responsive/orientation and zoo-map accessibility. Progression, scoring, reveal semantics, and U0-U4 behavior remain unchanged.

### Behavior
- Portrait gameplay now shows an accessible rotate-device guidance panel instead of miniaturizing the trace surface; Back/return and action controls stay outside the guidance and remain reachable.
- Reveal-based glass portrait states keep deterministic progress fixtures available for assertions while the visual surface is hidden behind the guidance.
- Desktop `1280x720` and landscape `844x390` continue to show the playable surface and controls without viewport clipping.
- ZooMap open sectors are keyboard-focusable SVG controls with `role="button"`, `tabindex="0"`, visible focus styling, actionable labels, Enter/Space activation, and a screen-reader status summary of open sectors, stars, and recovered animals.
- Closed/scenery sectors stay out of the tab order.
- Caption auditing now ignores the zoo-map screen-reader-only status text as non-visible copy; visible caption/image invariants remain enforced.

### Evidence
| Step | Command | Result |
|---|---|---|
| RED focused tests | `npm test -w client -- src/screen/ZooMap.test.tsx src/screen/LevelPlay.test.tsx` after adding U5 expectations first | FAILED: missing focusable sector controls/status and portrait guidance semantics. |
| Focused GREEN | `npm test -w client -- src/screen/ZooMap.test.tsx src/screen/LevelPlay.test.tsx` | PASS: 2 files, 108 tests. |
| Root tests | `npm test` | PASS: 82 files, 1890 tests. |
| Root tests | `npm run test` | PASS: 82 files, 1903 tests. |
| Build | `npm run build` | PASS: TypeScript and Vite build succeeded; Vite reported only the existing chunk-size warning. |
| Playwright matrix | `$env:PLAYWRIGHT_CHANNEL='chrome'; $env:PLAYWRIGHT_RUN_ID='u5-responsive-a11y-b'; npm run test:e2e -w client` | PASS: 15 real state×viewport cells. |
| Whitespace | `git diff --check` | PASS. |

### Visual Observations
- Portrait start/partial/success show a large centered rotate-device panel, visible Back control, and reachable action buttons; the trace surface is not miniaturized.
- Portrait error keeps the same guidance/navigation contract with `Siguiente` disabled.
- Portrait map-return reaches the real zoo map after the Back control.
- Landscape `844x390` and desktop `1280x720` keep the playable surface, Back, and action controls in view without clipping.
- Map-return screenshots show the real zoo map with fogged sectors, Pulpito, HUD, speech bubble, and newly accessible sector controls.

### Evidence Paths
- `client/test-results/playwright-output/run-u5-responsive-a11y-b/.../mvp-visual-matrix/*.png`

### Files Changed
- `client/src/screen/LevelPlay.tsx` — added portrait guidance layout that hides mini gameplay only in upright narrow viewports while preserving navigation/actions.
- `client/src/screen/LevelPlay.test.tsx` — added portrait guidance semantics regression coverage.
- `client/src/screen/ZooMap.tsx` — added focusable, labeled, keyboard-activatable sector controls and a meaningful map status.
- `client/src/screen/ZooMap.test.tsx` — added focused map accessibility coverage.
- `client/src/detective/captionAudit.ts` — excluded screen-reader-only zoo status from visible-caption auditing.
- `client/e2e/mvp-visual.spec.ts` — strengthened U4 matrix assertions for U5 portrait guidance and map control/status accessibility.
- `openspec/changes/finish-mvp-roadmap/tasks.md` — marked only U5 complete.
- `openspec/changes/finish-mvp-roadmap/apply-progress.md` — recorded cumulative U0–U5 progress and evidence.

### Deviations
None — U5 uses existing screen/map seams and does not introduce a generic responsive or progression engine.

## U5 Findings Remediation

### Scope
Fixed all confirmed U5 review findings without broadening beyond responsive/orientation/map accessibility.

### Behavior
- The rotate guidance is now controlled by the same media query that hides the trace sheet: `(max-width: 559px) and (orientation: portrait)`. This covers representative drawn-place levels without reveal such as `duck-trail2`, so portrait never shows a blank hidden game without an explanation.
- Outside that portrait query the guidance section is not rendered and `aria-describedby` is absent, so desktop and landscape assistive tech do not hear rotate-device copy.
- The Playwright portrait error cell now creates a real failed attempt by drawing in landscape, returns to portrait, and asserts actual attempt feedback plus disabled progression.

### Evidence
| Step | Command | Result |
|---|---|---|
| Focused regressions | `npm test -w client -- src/screen/LevelPlay.test.tsx src/screen/ZooMap.test.tsx` | PASS: 2 files, 110 tests. |
| Root tests | `npm test` | PASS: 82 files, 1892 tests. |
| Root tests | `npm run test` | PASS: 82 files, 1903 tests. |
| Build | `npm run build` | PASS: TypeScript and Vite build succeeded; Vite reported only the existing chunk-size warning. |
| Playwright matrix | `$env:PLAYWRIGHT_CHANNEL='chrome'; $env:PLAYWRIGHT_RUN_ID='u5-responsive-a11y-fix'; npm run test:e2e -w client` | PASS: 15 real state×viewport cells. |
| Whitespace | `git diff --check` | PASS. |

### Visual Observations
- Portrait start shows Back, a large rotate-device panel, and action controls; no mini gameplay is visible.
- Portrait error shows the same guidance plus a real failed-attempt result (`Quédate dentro del camino, despacito.`) and disabled `Siguiente`.
- Landscape `844x390` and desktop `1280x720` show playable trace surfaces without rotate guidance or clipping.
- Portrait map-return still reaches the real ZooMap; map status/control assertions pass.

### Evidence Paths
- `client/test-results/playwright-output/run-u5-responsive-a11y-fix/.../mvp-visual-matrix/*.png`

### Deviations
None — remediation tightened the existing U5 implementation and preserved progression/gameplay semantics plus U0-U4.

## U6 Ink Policy

### Scope
Implemented only U6 ink lifecycle policy through the existing `canvas/ink.ts`, `TraceCanvas.tsx`, `LevelPlay.tsx`, and backdrop/catalog seams. Scoring, deduction, progression, reveal fold state, and pointer capture remain unchanged.

### Behavior
- `canvas/ink.ts` now exposes exactly three policy values: `settled`, `live-only`, and `none`.
- `settled` keeps live ink plus released/persisted marks for ordinary mark-making surfaces, detective/world trails, art corridors, waypoint trails, and spine levels.
- `live-only` is selected for erase reveal levels: the active stroke can be shown while drawing, but released strokes are not rendered as dark persistent traces.
- `none` is selected for light reveal levels: child ink is hidden and only the reveal/world response renders.
- `TraceCanvas` still keeps pointer capture and `onFrame`/`onRelease` active; the policy changes paint only, so release scoring and deduction semantics are untouched.
- No new animation was introduced; the existing reduced-motion Playwright matrix remains under the configured reduced-motion context.

### Evidence
| Step | Command | Result |
|---|---|---|
| RED focused tests | `npm run test -w client -- src/canvas/ink.test.ts src/canvas/TraceCanvas.test.tsx src/screen/LevelPlay.test.tsx` after adding U6 expectations first | FAILED: missing policy resolver, TraceCanvas lifecycle gating, and LevelPlay policy prop. |
| Focused GREEN | `npm run test -w client -- src/canvas/ink.test.ts src/canvas/TraceCanvas.test.tsx src/screen/LevelPlay.test.tsx` | PASS: 3 files, 252 tests. |
| Root tests | `npm run test` | PASS: 82 files, 1902 tests. |
| Root build | `npm run build` | PASS: TypeScript and Vite build succeeded; Vite reported only the existing chunk-size warning. |
| Before matrix | `$env:PLAYWRIGHT_CHANNEL='chrome'; $env:PLAYWRIGHT_RUN_ID='u6-before'; npm run test:e2e -w client` | PASS: 15 cells. |
| After matrix | `$env:PLAYWRIGHT_CHANNEL='chrome'; $env:PLAYWRIGHT_RUN_ID='u6-after'; npm run test:e2e -w client` | PASS: 15 cells. |
| Screenshot diff | Pixel compare `run-u6-before` vs `run-u6-after` | 0 changed pixels in all 15 cells; the matrix uses deterministic debug reveal fixtures and the ordinary `f1-libre` error, so U6's changed post-release reveal ink lifecycle does not alter those still frames. |
| Whitespace | `git diff --check` | PASS. |

### Visual Observations
- Desktop/landscape/portrait `start`, `partial`, and `success` glass fixtures remain visually identical before/after: same grime coverage states, same revealed beach/treasure content, and no introduced dark trace.
- `error` remains the ordinary `f1-libre` failed attempt with its small dark stroke, coaching text, and disabled `Siguiente`; this proves ordinary `settled` mark-making still paints persisted ink.
- `map-return` remains the real zoo map at all three viewports with Pulpito, fogged sectors, HUD, and navigation intact.
- Exact image comparison found `0` changed pixels for every before/after matrix cell, which is expected because U6 changes the release lifecycle for reveal drawing rather than the debug-seeded static reveal states.

### Evidence Paths
- `client/test-results/playwright-output/run-u6-before/.../mvp-visual-matrix/*.png`
- `client/test-results/playwright-output/run-u6-after/.../mvp-visual-matrix/*.png`
- `client/test-results/playwright-output/run-u6-after-contact-sheet.png`

### Files Changed
- `client/src/canvas/ink.ts` — added explicit ink policy type, resolver, and lifecycle helpers.
- `client/src/canvas/ink.test.ts` — added policy resolution/lifecycle regression coverage.
- `client/src/canvas/TraceCanvas.tsx` — added `inkPolicy` paint gating for live, settled, and fading ink without affecting input callbacks.
- `client/src/canvas/TraceCanvas.test.tsx` — added SSR lifecycle rendering regressions for all three policy values.
- `client/src/screen/LevelPlay.tsx` — resolves policy from existing level/backdrop/reveal seams and passes it to TraceCanvas.
- `client/src/screen/LevelPlay.test.tsx` — proves erase reveal = `live-only`, light reveal = `none`, ordinary levels = `settled`.
- `openspec/changes/finish-mvp-roadmap/specs/trace-canvas/spec.md` — made the exact policy vocabulary explicit.
- `openspec/changes/finish-mvp-roadmap/tasks.md` — marked only U6 complete.
- `openspec/changes/finish-mvp-roadmap/apply-progress.md` — recorded cumulative U0–U6 progress and evidence.

### Deviations
None — U6 uses the narrow existing canvas/ink and LevelPlay seams and does not introduce a generic engine or alter score/deduction semantics.

## U6 Contract Defect Fix

### Scope
Fixed the confirmed U6 lifecycle defect: `live-only` ink must be tied to active drawing state, not merely to the retained single-stroke point buffer. No LevelPlay behavior, scoring, deduction, or persistence semantics were changed.

### Behavior
- `inkPolicyAllowsLive(policy, drawing)` now returns `false` for `live-only` once drawing is no longer active.
- `TraceCanvas` clears the live path after `pointerup` for `live-only`, even when `multiStroke` is omitted and `useTraceInput` intentionally retains the point buffer for default single-stroke mode.
- `settled` still keeps the default single-stroke path visible after `pointerup`.
- `pointercancel` clears `live-only` ink as well.
- Added a browser-level TraceCanvas harness so the regression exercises real pointerdown/move/up/cancel interactions; SSR-only tests remain as static lifecycle coverage but are not the contract proof.

### Evidence
| Step | Command | Result |
|---|---|---|
| Focused unit/SSR regressions | `npm run test -w client -- src/canvas/ink.test.ts src/canvas/TraceCanvas.test.tsx src/screen/LevelPlay.test.tsx` | PASS: 3 files, 252 tests. |
| Browser interaction regression | `$env:PLAYWRIGHT_CHANNEL='chrome'; $env:PLAYWRIGHT_RUN_ID='u6-ink-lifecycle-fix-final'; npm run test:e2e -w client -- e2e/trace-canvas-ink-policy.spec.ts` | PASS: 3 tests; `live-only` clears on pointerup/cancel, `settled` persists after pointerup. |
| Root tests | `npm run test` | PASS: 82 files, 1902 tests. |
| Root build | `npm run build` | PASS: TypeScript and Vite build succeeded; Vite reported only the existing chunk-size warning. |
| Whitespace | `git diff --check` | PASS. |

### Evidence Paths
- `client/test-results/playwright-output/run-u6-ink-lifecycle-fix-final/trace-canvas-ink-policy-*/`

### Files Changed
- `client/src/canvas/ink.ts` — added active-drawing awareness to live policy checks.
- `client/src/canvas/TraceCanvas.tsx` — uses active drawing state when deciding whether to write/retain the live path.
- `client/e2e/trace-canvas-ink-policy.spec.ts` — added browser interaction regression for pointerup/cancel and settled persistence.
- `client/src/testing/traceCanvasHarness.tsx` and `client/trace-canvas-harness.html` — minimal Vite-served TraceCanvas harness for the browser interaction test.
- `openspec/changes/finish-mvp-roadmap/apply-progress.md` — recorded this U6 contract fix evidence.

### Changed-Line Accounting
Current U6 working diff including untracked interaction harness files is 316 git-style changed lines, below the 400-line split threshold.

### Deviations
None — this is a contract repair inside U6's existing ink policy scope.


## U7 Fogged Glass Polish

### Scope and Behavior
Implemented only U7 visible fogged-glass polish; no scoring, deduction, persistence, progression, engine, commit, PR, push, pull, reset, rebase, or discard work was performed. Glass fog now renders as one direct continuous SVG silhouette from the union of remaining grid cells, with smoothed organic contours and even-odd holes. Per-tile rects remain stable invisible sentinels for reveal state/counting; visible fog is not one closed path per tile. Condensation is stable direct SVG and appears only where fog remains. No `<mask>`, `<pattern>`, `<clipPath>`, `<defs>`, `<filter>`, CSS filter, or `url(#...)` reference is introduced; superseded `frostBackdrop` plumbing was removed. Direct wiping exposes sharp art with no persistent dark trace, preserving U6 `live-only`; error keeps Next disabled, success enables it, and portrait keeps rotate guidance.

### Evidence
- Before matrix: `$env:PLAYWRIGHT_CHANNEL='chrome'; $env:PLAYWRIGHT_RUN_ID='u7-review-before'; npm run test:e2e -w client -- e2e/mvp-visual.spec.ts` => PASS, 15 cells.
- Focused regressions: `npm run test -w client -- src/canvas/RevealLayer.test.tsx src/canvas/TraceCanvas.test.tsx src/screen/LevelPlay.test.tsx` => PASS, 3 files / 251 tests.
- Diagonal direct wipe: `$env:PLAYWRIGHT_CHANNEL='chrome'; $env:PLAYWRIGHT_RUN_ID='u7-final-diagonal-c'; npm run test:e2e -w client -- e2e/u7-diagonal-temp.spec.ts` => PASS, 2 desktop/landscape captures; temp spec removed.
- Final matrix: `$env:PLAYWRIGHT_CHANNEL='chrome'; $env:PLAYWRIGHT_RUN_ID='u7-final-silhouette-matrix'; npm run test:e2e -w client -- e2e/mvp-visual.spec.ts` => PASS, 15 cells.
- Root tests/build/whitespace: `npm run test` PASS (82 files / 1905 tests); `npm run build` PASS with existing chunk warning; `git diff --check` PASS.

### Manual Visual Observations
Before remediation, diagonal wipes read as rectangular/stair-step deletion. Final desktop/landscape diagonal wipes read as continuous organic clearings with smoothed fog contours, stable direct condensation, and no dark settled trace. Success is sharp with Next active; map-return remains the real zoo map; portrait cells retain rotate guidance.

### Evidence Paths
- `client/test-results/playwright-output/run-u7-final-diagonal-c/.../u7-diagonal/*.png`
- `client/test-results/playwright-output/run-u7-final-silhouette-matrix/.../mvp-visual-matrix/*.png`
- `client/test-results/playwright-output/u7-final-silhouette-matrix-contact-sheet.png`

### Files Changed
`client/src/canvas/RevealLayer.tsx`, `client/src/canvas/RevealLayer.test.tsx`, `client/src/canvas/TraceCanvas.test.tsx`, `client/src/screen/LevelPlay.tsx`, `client/e2e/mvp-visual.spec.ts`, `openspec/changes/finish-mvp-roadmap/specs/reveal-grid/spec.md`, `openspec/changes/finish-mvp-roadmap/tasks.md`, and this apply-progress file.

### Changed-Line Accounting
Current working diff is 399 git-style changed lines (369 additions, 30 deletions), below the 400-line split threshold.

### Deviations
None - U7 stays on existing reveal/backdrop seams and does not change semantics, scoring, deduction, or persistence.

## U8 Night Discovery Polish

### Scope and Behavior
Implemented only U8 visible night discovery through the existing light reveal/backdrop seams. Night levels now show larger child-visible discoverable glow hints at start, a visible torch glow while the finger is down, persistent found-object halos for partial/error progress, explicit next-action feedback after incomplete attempts, and a warmer full-scene celebratory completed state instead of falling back to darkness. Completion rendering is derived from the same released stroke snapshot used for approval, and completed light reveals keep exactly one zero-opacity rect sentinel per tile with no decorative rect overcount. Light reveal still uses U6 `none` ink, scoring/deduction/progression rules are unchanged, map return preserves the earned attempt, and portrait keeps rotate guidance.

### Evidence
- Before inspection: `$env:PLAYWRIGHT_CHANNEL='chrome'; $env:PLAYWRIGHT_RUN_ID='u8-before-night-inspect'; npm run test:e2e -w client -- e2e/u8-night-inspect-temp.spec.ts` => PASS, 15 cells captured before product edits.
- Focused regressions: `npm run test -w client -- src/canvas/RevealLayer.test.tsx src/screen/LevelPlay.test.tsx` => PASS, 2 files / 103 tests.
- Final night matrix: `$env:PLAYWRIGHT_CHANNEL='chrome'; $env:PLAYWRIGHT_RUN_ID='u8-night-review-final-d'; npm run test:e2e -w client -- e2e/u8-night-visual.spec.ts` => PASS, 15 direct-pointer cells.
- Root tests/build/whitespace: `npm run test` PASS (82 files / 1908 tests); `npm run build` PASS with existing chunk warning; `git diff --check` PASS.

### Manual Visual Observations
Before U8, start/error/success were nearly all black; partial showed only a blocky dim window, and success enabled Next while returning the scene to darkness. After review remediation, desktop and landscape start states show stronger invitation rings without revealing art; partial shows a clear torch with no dark child ink; error keeps the first discovery visibly persisted plus the “Volvé a alumbrar” guidance; success keeps both discoveries bright under a persistent warm scene glow and celebration hierarchy; map-return reaches the real zoo map after earned progress; portrait retains rotate guidance.

### Evidence Paths
- Before: `client/test-results/playwright-output/run-u8-before-night-inspect/.../u8-before-*.png`
- Initial final: `client/test-results/playwright-output/run-u8-night-visual-final-c/.../u8-night-visual/*.png`
- Review final: `client/test-results/playwright-output/run-u8-night-review-final-d/.../u8-night-visual/*.png`

### Files Changed
`client/src/canvas/RevealLayer.tsx`, `client/src/canvas/TraceCanvas.tsx`, `client/src/screen/LevelPlay.tsx`, `client/src/canvas/RevealLayer.test.tsx`, `client/src/screen/LevelPlay.test.tsx`, `client/e2e/u8-night-visual.spec.ts`, `openspec/changes/finish-mvp-roadmap/tasks.md`, and this apply-progress file.

### Changed-Line Accounting
Current U8 product/test/SDD working diff is 303 git-style changed lines, below the 400-line review budget.

### Deviations
None - U8 stays on existing night/backdrop/reveal seams and does not change scoring, deduction, generic engine structure, or art placeholders.
