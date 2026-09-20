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

## U9 PISTAS Clarity / Animation

### Scope and Behavior
Implemented only U9 visible PISTAS clarity and collection feedback. The rail now reads as a soft reward tray with clearer slot sockets, stable accessible names for filed/pending slots, a filed-slot pop/spark, and a one-off fly-home clue affordance that runs only after route-end filing changes `clueFiled` on release. Mid-trace clue collection remains a non-animated earned-art swap on the trail; filing still depends only on `shouldFileClue(hasClueTrail, reachedEnd)` and does not use clue-light/lit-mark state, scoring, or deduction state. Reduced-motion users receive no travel/pop animation; the filed slot remains visibly highlighted with a persistent static outline.

### Evidence
- Before inspection: `$env:PLAYWRIGHT_CHANNEL='chrome'; $env:PLAYWRIGHT_RUN_ID='u9-before-pistas-inspect'; npm run test:e2e -w client -- e2e/u9-pistas-inspect-temp.spec.ts` => captured real PISTAS start/partial/error/success/map-return at 1280x720, 844x390, and 390x844. Desktop/landscape success drawing initially failed because the temporary path used the opposite sine direction; captures still showed the baseline rail hierarchy and map-return.
- Focused regressions: `npm run test -w client -- src/detective/PistasRail.test.tsx src/screen/LevelPlay.test.tsx` => PASS, 2 files / 114 tests.
- Deduction/no-filter regression after CSS polish: `npm run test -w client -- src/screen/Deduction.test.tsx src/detective/PistasRail.test.tsx src/screen/LevelPlay.test.tsx` => PASS, 3 files / 156 tests.
- Final real PISTAS matrix with normal motion: `$env:PLAYWRIGHT_CHANNEL='chrome'; $env:PLAYWRIGHT_RUN_ID='u9-after-pistas-visual'; npm run test:e2e -w client -- e2e/u9-pistas-inspect-temp.spec.ts` => PASS, 15 cells.
- Final real PISTAS matrix with reduced motion: `$env:PLAYWRIGHT_CHANNEL='chrome'; $env:PLAYWRIGHT_RUN_ID='u9-after-pistas-reduced'; npm run test:e2e -w client -- e2e/u9-pistas-inspect-temp.spec.ts` => PASS, 15 cells.
- Root tests/build/whitespace: `npm run test` PASS (82 files / 1910 tests); `npm run build` PASS with existing Vite chunk-size warning; `git diff --check` PASS.

### Manual Visual Observations
Before U9, PISTAS read as flat text plus small loose sockets; partial/error/success did not make progress/reward hierarchy obvious, and the child saw no clear storage moment. After U9, desktop and landscape start states show PISTAS as a distinct cream reward tray; partial visibly shows earned trail marks while the rail remains unfiled; error keeps the rail unfiled and Next disabled; success shows the lamp/route reward, the first slot filled and highlighted, and Next enabled; map-return remains the real zoo map. Portrait keeps rotate guidance plus the improved rail fallback, and reduced-motion keeps a static filed-slot highlight without travel/pop motion.

### Evidence Paths
- Before: `client/test-results/playwright-output/run-u9-before-pistas-inspect/.../u9-pistas-inspect/*.png`
- Normal motion final: `client/test-results/playwright-output/run-u9-after-pistas-visual/.../u9-pistas-inspect/*.png`
- Normal motion contact sheet: `client/test-results/playwright-output/run-u9-after-pistas-visual/u9-after-contact-sheet.jpg`
- Reduced-motion final: `client/test-results/playwright-output/run-u9-after-pistas-reduced/.../u9-pistas-inspect/*.png`

### Files Changed
`client/src/detective/PistasRail.tsx`, `client/src/detective/PistasRail.test.tsx`, `client/src/screen/LevelPlay.tsx`, `client/src/screen/LevelPlay.test.tsx`, `openspec/changes/finish-mvp-roadmap/tasks.md`, and this apply-progress file.

### Changed-Line Accounting
Current U9 product/test/SDD working diff is below the 400-line review budget.

### Deviations
None - U9 stays on existing `PistasRail`/`LevelPlay` seams, keeps animation after filing/release rather than during active tracing, and does not change `shouldFileClue`, route-end filing, clue-light, scoring, deduction, storage, or progression semantics.

### Portrait Layout Follow-up
Fixed the confirmed 390x844 portrait defect by making the PISTAS tray wrap into a compact two-row narrow layout: lamp + label on the first row, all four slots centered on a second row. The filed-slot highlight and reduced-motion fallback now stay within the visible tray, and the clue flight destination is an onscreen slot. The portrait rotate guidance remains the active-gameplay fallback, and the rail no longer covers Back or bottom actions.

### Follow-up Evidence
- Focused layout/unit contracts: `npm run test -w client -- src/screen/LevelPlay.test.tsx src/detective/PistasRail.test.tsx` => PASS, 2 files / 115 tests.
- Portrait normal-motion layout assertion: `$env:PLAYWRIGHT_CHANNEL='chrome'; $env:PLAYWRIGHT_RUN_ID='u9-portrait-layout-normal-b'; $env:U9_MOTION='normal'; npm run test:e2e -w client -- e2e/u9-pistas-visual-temp.spec.ts --grep "portrait"` => PASS, 5 portrait cells.
- Full normal-motion layout matrix: `$env:PLAYWRIGHT_CHANNEL='chrome'; $env:PLAYWRIGHT_RUN_ID='u9-layout-full-normal'; $env:U9_MOTION='normal'; npm run test:e2e -w client -- e2e/u9-pistas-visual-temp.spec.ts` => PASS, 15 cells.
- Full reduced-motion layout matrix: `$env:PLAYWRIGHT_CHANNEL='chrome'; $env:PLAYWRIGHT_RUN_ID='u9-layout-full-reduced'; Remove-Item Env:U9_MOTION -ErrorAction SilentlyContinue; npm run test:e2e -w client -- e2e/u9-pistas-visual-temp.spec.ts` => PASS, 15 cells.

### Follow-up Evidence Paths
- Normal layout matrix: `client/test-results/playwright-output/run-u9-layout-full-normal/.../u9-pistas-visual/*.png`
- Normal layout contact sheet: `client/test-results/playwright-output/run-u9-layout-full-normal/u9-layout-full-normal-contact-sheet.jpg`
- Reduced layout matrix: `client/test-results/playwright-output/run-u9-layout-full-reduced/.../u9-pistas-visual/*.png`
- Reduced layout contact sheet: `client/test-results/playwright-output/run-u9-layout-full-reduced/u9-layout-full-reduced-contact-sheet.jpg`

## U11 Background Generation

### Scope and Behavior
Generated only the ART-source candidates for renewed backgrounds. No integration code, build pipeline output, `client/public/art/`, manifest, or registry files were edited. The selected minimum high-impact set covers the two immediate families requested for the next integration slice: glass/entrance and night.

### Selected Assets
| Family | Source path | Dimensions | Visual rationale |
|---|---|---:|---|
| glass/entrance | `art-source/fondo entrada vidrio.png` | 1536x1024 | Full zoo glass-foyer scene with gate/glass depth, edge-weighted foliage/wood/stone, and a broad pale blue-green calm playable zone that should tolerate fog and hitbox overlays without looking like an artificial empty rectangle. |
| night | `art-source/fondo noche zoo.png` | 1536x1024 | Full moonlit zoo-garden scene with edge-weighted foliage, moon/stars, warm lantern cue, and a muted central blue play field that is calmer and more inviting than the current nearly-flat night placeholder. |

### Final Prompts
#### glass/entrance
```text
Use case: illustration-story
Asset type: authored source background for a children's handwriting game, to be copied into art-source/ only; 3:2 landscape full scene, suitable for later 1280x720 and 844x390 crops.
Primary request: Generate a full-bleed glass entrance family background: a quiet zoo entrance / glass aviary foyer seen through freshly cleaned panes, child-friendly and storybook, polished illustrated game art.
Style/medium: 2D children's game illustration drawn with thick felt-tip marker by hand. Dark outline #1a1a1a, thick, rounded ends, HUMAN not vector: slight wobble, small variation in thickness, curves that do not close perfectly. Flat colour fills that overshoot the outline slightly on one side and fall short on another, like tidy child colouring. Chunky generous shapes, no fine detail, flat colours only.
Scene/backdrop: a friendly zoo entrance beside tall glass panels, rounded shrubs, soft blue-green sky reflections, simple wooden gate posts, small rocks and plants at edges. The middle playable area must remain calm and readable: broad quiet pale blue/blue-green glass-ground zone with low contrast, no busy texture, no central empty rectangle or artificial cut-out.
Composition/framing: full complete composition with depth and narrative; foreground foliage and gate details mostly along the top/bottom/side edges, organic edges only. Maintain a calm open playable zone across the central 65% through lighting, contrast, and object distribution, not by leaving a blank rectangle. Important elements must not rely on the far extreme edges so the scene still works when cropped to 1280x720 or 844x390.
Lighting/mood: gentle morning light, inviting, clean, calm, readable under semi-transparent fog/glass overlays.
Color palette: paper-warm neutrals, pale blue glass, muted green shrubs, warm wooden accents; contour is neutral #1a1a1a only.
Constraints: no text, no letters, no numbers, no UI, no watermark, no logos, no paths or embedded route lines, no characters, no animals. Preserve quiet contrast for gesture/hitbox overlays. Complete scene; no isolated asset; no transparent background.
Avoid: photorealism, 3D, vector clip-art, gradients, bevels, drop shadows, glowing UI, texture noise, dense central decorations, rectangular empty center, signs with writing.
```

#### night
```text
Use case: illustration-story
Asset type: authored source background for a children's handwriting game, to be copied into art-source/ only; 3:2 landscape full scene, suitable for later 1280x720 and 844x390 crops.
Primary request: Generate a full-bleed night family background: a calm nighttime zoo garden where little discovery objects can be revealed by a flashlight, child-friendly storybook and inviting rather than scary.
Style/medium: 2D children's game illustration drawn with thick felt-tip marker by hand. Dark outline #1a1a1a, thick, rounded ends, HUMAN not vector: slight wobble, small variation in thickness, curves that do not close perfectly. Flat colour fills that overshoot the outline slightly on one side and fall short on another, like tidy child colouring. Chunky generous shapes, no fine detail, flat colours only.
Scene/backdrop: moonlit zoo garden at night with rounded bushes, soft tree silhouettes, simple stones and low plants along edges, a crescent moon and a few chunky stars high in the scene. Keep the central playable zone broad and calm: muted deep blue ground/air with enough quiet contrast for illuminated overlays and hidden-object hitboxes, no busy texture in the middle.
Composition/framing: full complete composition with depth and narrative; decoration mostly along top/bottom/side edges with organic edges, not a straight band. No central empty rectangle or artificial cut-out; the calm play area is integrated by dim even lighting and sparse object distribution. Important scenery should survive both 1280x720 and 844x390 landscape crops.
Lighting/mood: soft moonlight with a gentle warm lantern glow near one side, cozy, safe, quiet, readable; not black-on-black.
Color palette: deep muted navy and blue-gray, desaturated greens, small warm yellow accents; contour is neutral #1a1a1a only.
Constraints: no text, no letters, no numbers, no UI, no watermark, no logos, no path or embedded route line, no characters, no animals. Preserve quiet contrast for gesture/hitbox overlays. Complete scene; no isolated asset; no transparent background.
Avoid: horror, photorealism, 3D, vector clip-art, gradients, bevels, drop shadows, glowing UI, texture noise, dense central decorations, rectangular empty center, signs with writing.
```

### Inspection and Rejected Variants
- Inspected docs/09 visual style contract, `docs/referencias/primer-caso/i09-reconocer-la-pista.png`, existing `art-source/fondo nocturno.png`, U7 glass screenshot `client/test-results/playwright-output/u7-fresh-direct-wipe/desktop-diagonal-direct-wipe.png`, and U8 night screenshots from `run-u8-night-visual-final-c` before selection.
- Inspected both generated outputs with `view_image` before copying into `art-source/`.
- Rejected variants: none. Each family used exactly one ImageGen call and the first generated scene met the minimum U11 composition/style need well enough for U12 integration validation.

### Files Changed
`art-source/fondo entrada vidrio.png`, `art-source/fondo noche zoo.png`, `openspec/changes/finish-mvp-roadmap/tasks.md`, and this apply-progress file.

### Deviations
U11 deliberately copied selected finals only to `art-source/`. Despite the older task wording mentioning `client/public/art/`, the U11 execution instruction explicitly deferred build/registry/public-art integration to U12, so no shipped asset or registry was touched.

### Status
U11 complete. U12 is next: wire approved sources through `scripts/art/build_art.py`, `client/public/art/manifest.json`, and the typed background registry with focused validation.

### U11 Remediation After Review

Review found two ART defects in the selected U11 sources: chromatic dark linework in both generated backgrounds, and animal silhouettes/icons on the night background's upper-left gate. Remediation used exactly one targeted built-in ImageGen edit call per affected asset, using the current local source file as the reference, then inspected each result at original resolution before replacing the `art-source` file.

| Asset | Edit source path | Built-in ImageGen output | Inspection result |
|---|---|---|---|
| `art-source/fondo entrada vidrio.png` | previous `art-source/fondo entrada vidrio.png` | `C:/Users/mastr/.codex/generated_images/01a0bd1f-024e-7541-b0c4-e609f6241223/call_e6547fEoPdB5nromeIpnLhFH.png` | Accepted after original-resolution visual inspection: full 3:2 glass composition and calm center preserved; dark linework reads as neutral near-black rather than teal/green. |
| `art-source/fondo noche zoo.png` | previous `art-source/fondo noche zoo.png` | `C:/Users/mastr/.codex/generated_images/01a0bd1f-024e-7541-b0c4-e609f6241223/call_q7dFZ0MEMXRA30LilNJj8ySq.png` | Accepted after original-resolution visual inspection: full 3:2 night composition and calm center preserved; upper-left gate animal icons removed; dark linework reads as neutral near-black rather than blue/teal. |

#### Remediation prompt: glass/entrance
```text
Use case: precise-object-edit
Asset type: remediation edit for an authored 3:2 children's game background source.
Input image: the provided image is the exact edit target; preserve its full 1536x1024 landscape composition.
Primary request: Keep the scene, palette, calm playable center, lighting, glass entrance, plants, rocks, gate posts, perspective, and all content exactly as close as possible, but recontour every dark outline/linework stroke to a consistent neutral near-black #1a1a1a. The current dark linework drifts chromatic green/teal/blue; make it neutral marker black.
Style/medium: preserve the existing hand-drawn 2D children's game/storybook illustration with thick felt-tip marker outlines, rounded ends, slight human wobble, flat colour fills.
Composition/framing: do not crop, resize, rotate, add, remove, or rearrange scene elements. Preserve full-bleed 3:2 frame and broad calm playable center.
Constraints: change only the chromatic dark outlines/linework to neutral near-black #1a1a1a. No text, no letters, no numbers, no UI, no watermark, no logos, no animals, no characters, no path/route line. Do not introduce new objects.
Avoid: changing colours of fills, adding texture, changing the calm center, making vector-clean lines, adding shadows/glow, altering scene content.
```

#### Remediation prompt: night
```text
Use case: precise-object-edit
Asset type: remediation edit for an authored 3:2 children's game background source.
Input image: the provided image is the exact edit target; preserve its full 1536x1024 landscape composition.
Primary request: Preserve the moonlit zoo garden, calm central playable zone, palette, lighting, depth, trees, moon, stars, lantern, gate, plants, rocks, waterfall, and all scenery as close as possible, but make two targeted fixes: (1) remove the small giraffe and elephant silhouettes/icons from the upper-left gate sign/arch so there are no animals or characters anywhere; replace that area with plain matching arch/gate surface and linework; (2) recontour every dark outline/linework stroke to a consistent neutral near-black #1a1a1a instead of chromatic blue/teal.
Style/medium: preserve the existing hand-drawn 2D children's game/storybook illustration with thick felt-tip marker outlines, rounded ends, slight human wobble, flat colour fills.
Composition/framing: do not crop, resize, rotate, or rearrange. Keep the full-bleed 3:2 frame and calm central play area.
Constraints: change only the animal-icon removal on the upper-left gate and the chromatic dark outlines/linework to neutral near-black #1a1a1a. No text, no letters, no numbers, no UI, no watermark, no logos, no path/route line, no animals, no characters. Do not introduce new objects.
Avoid: changing the scene layout, adding characters, adding animal silhouettes/icons elsewhere, changing fill colours, adding texture, making vector-clean lines, adding shadows/glow.
```

Post-replacement dimensions remain 1536x1024 RGB for both selected sources. U12 integration remains next; no `client/public/art`, manifest, registry, or build output was touched.

## U12 Background Integration

### Scope and Wiring
- `glass1` (the U7 matrix target) resolves through `peces` to `SECTOR_BACKGROUND_ART.aquarium`; the existing public export `sector-aquarium-background.png` now builds from approved `art-source/fondo entrada vidrio.png`. The same adventure mapping covers `glass1` and `glass2`; `glass3` and `glass4` retain their separate `monos` backdrop.
- `night2` (the U8 matrix target) resolves through `night`; the approved `art-source/fondo noche zoo.png` now builds as `sector-night-zoo-background.png`, exported as typed `SECTOR_BACKGROUND_ART.nightZoo`, and is used by `night1`–`night4`.
- The established `sector-night-background.png` remains wired to hedgehog levels so their existing chalk-ink contrast contract is preserved. No gameplay, scoring, persistence, progression, reveal, clue, or narrative behavior changed.
- `make_placeholders.py` was not changed; its authored-source skip and dry-run protections remain covered by its focused Python tests.

### Focused Validation
- `python scripts/art/build_art.py` — PASS; 88 files emitted, including the renewed glass export and distinct night-zoo export.
- `python -m unittest scripts/art/make_placeholders_test.py` — PASS, 2 tests.
- `npm test -w client -- src/detective/artManifest.test.ts src/detective/artHierarchy.test.ts src/zoo/backdrops.test.ts` — PASS, 168 tests.
- `npm test` — PASS, 82 files / 1,913 tests.
- `npm run build` — PASS (`tsc --noEmit` + Vite); existing chunk-size warning only.
- `git diff --check` — PASS.

### Visual Evidence and Findings
- Raw 30-cell Playwright run: `client/test-results/playwright-output/run-u12-background-integration/` (glass and night: start, partial, error, success, and map-return at 1280x720, 844x390, and 390x844).
- Glass contact sheet: `client/test-results/playwright-output/run-u12-background-integration/contact-sheets/u12-glass-contact-sheet.jpg`.
- Night contact sheet: `client/test-results/playwright-output/run-u12-background-integration/contact-sheets/u12-night-contact-sheet.jpg`.
- `PLAYWRIGHT_RUN_ID=u12-background-integration PLAYWRIGHT_CHANNEL=chrome npm run test:e2e -w client -- e2e/mvp-visual.spec.ts e2e/u8-night-visual.spec.ts` — PASS, 30/30.
- Manual inspection confirmed both renewed scenes are visibly present. `xMidYMid slice` keeps the calm central action zones useful at desktop and compact landscape sizes; fog, torch/discovery, feedback, and progress/reward remain legible. A subsequent review identified the portrait map-return defect remediated below.

### Remediation After Visual Review
- Confirmed defect: returning from either glass or night at `390x844` rendered the 5:3 ZooMap as a `390x234` strip with unused green space and no rotate guidance.
- Focused fix: ZooMap now follows the existing portrait MVP pattern at `(max-width: 559px) and (orientation: portrait)`: the miniaturized map stage is hidden and replaced by a full-height accessible rotate status. Desktop and compact-landscape map rendering and all map interactions remain unchanged.
- Falsifiable coverage: `ZooMap.test.tsx` asserts the portrait media contract, hidden stage rule, status role, and accessible label. Both real Playwright suites now assert that portrait map-return shows the named rotate status and hides the map SVG, while landscape/desktop still require the map.
- `npm test -w client -- src/screen/ZooMap.test.tsx` — PASS, 22 tests.
- `PLAYWRIGHT_RUN_ID=u12-background-remediation-final PLAYWRIGHT_CHANNEL=chrome npm run test:e2e -w client -- e2e/mvp-visual.spec.ts e2e/u8-night-visual.spec.ts -g 'map-return'` — PASS, 6/6 affected cells.
- Raw remediation captures: `client/test-results/playwright-output/run-u12-background-remediation-final/`.
- Remediation contact sheet: `client/test-results/playwright-output/run-u12-background-remediation-final/contact-sheets/u12-map-return-remediation.jpg`.
- Manual inspection: both glass-return and night-return show the full-height rotate card at `390x844` with no miniaturized map; `1280x720` and `844x390` retain the full interactive map without the guidance.
- Post-remediation `npm test` — PASS, 82 files / 1,914 tests. `npm run build` — PASS with the existing chunk-size warning only. `git diff --check` — PASS.

### Status
U12 complete. U10, U13, U14, U15, and U15.1 remain pending; the recorded U10/U15/U15.1 deferrals are unchanged.

## U13 Visual QA / Iteration

### Real-Chrome Matrices
- `PLAYWRIGHT_CHANNEL=chrome PLAYWRIGHT_RUN_ID=u13-visual-audit-final npm run test:e2e -w client -- e2e/mvp-visual.spec.ts e2e/u8-night-visual.spec.ts e2e/u13-visual-audit-temp.spec.ts` — PASS, 78/78 cells: ZooMap 15, renewed glass/aquarium 15, renewed night 15, PISTAS normal motion 15, and exact current-registry approved closings 18. Each family covers start, partial, error, success, and map-return at 1280x720, 844x390, and 390x844; closing adds its final approved beat.
- `PLAYWRIGHT_CHANNEL=chrome PLAYWRIGHT_RUN_ID=u13-pistas-reduced-final npm run test:e2e -w client -- e2e/u13-visual-audit-temp.spec.ts -g 'u13 PISTAS'` — PASS, 15/15 reduced-motion cells. The success-flight animation is suppressed while the static reward/progress state remains visible.
- The temporary U13 Playwright harness was removed after capture. Raw evidence remains gitignored under `client/test-results/playwright-output/run-u13-visual-audit-final/` and `client/test-results/playwright-output/run-u13-pistas-reduced-final/`.

### Manual Contact-Sheet Inspection
- `client/test-results/playwright-output/run-u13-visual-audit-final/contact-sheets/glass-contact-sheet.png`
- `client/test-results/playwright-output/run-u13-visual-audit-final/contact-sheets/night-contact-sheet.png`
- `client/test-results/playwright-output/run-u13-visual-audit-final/contact-sheets/map-contact-sheet.png`
- `client/test-results/playwright-output/run-u13-visual-audit-final/contact-sheets/pistas-normal-contact-sheet.png`
- `client/test-results/playwright-output/run-u13-visual-audit-final/contact-sheets/closing-contact-sheet.png`
- `client/test-results/playwright-output/run-u13-pistas-reduced-final/contact-sheets/pistas-reduced-contact-sheet.png`

Manual inspection verified child-readable action, visible progress and reward, recoverable error states, renewed-scene crops, controls/navigation, desktop/compact-landscape responsiveness, portrait rotate guidance, and focus/contrast/accessibility. PISTAS retains its intentional no-result-copy detective presentation; reset and disabled/enabled progression states remain visually legible. No new gameplay, scoring, persistence, progression, ink, reveal, deduction, or narrative semantics were introduced.

### Confirmed Defect and Remediation
- Real Chrome exposed the browser-default 8px body margin around `AdventureClosing`, creating a white frame and 16px vertical overflow at every required viewport.
- `AdventureClosing.tsx` now resets `html`, `body`, and `#root` margin/height inside the closing document CSS. `AdventureClosing.test.tsx` protects the full-viewport contract. The final closing contact sheet confirms edge-to-edge backgrounds, readable approved copy, and a clean map return at all three viewports.
- Focused validation: `npm run test -w client -- src/screen/AdventureClosing.test.tsx` — PASS, 11/11; targeted system-Chrome remediation probe — PASS, 4/4.

### Scope and Deferrals
U13 complete. The already-wired exact approved `peces`, `tortugas`, `monos`, and `sendero` beat 0/1 closings were exercised only as current-registry evidence; U10 remains an isolated deferred blocker because no narrative remediation or unapproved content was added. U14 signage was explicitly excluded. U15 and U15.1 remain deferred and unchecked.

## U14 docs/16 In-Level Zoo-Sign Frame

### Scope and Implementation
- Real system-Chrome inspection of `glass1` showed an empty fogged enclosure with no in-level cue that fish belong there. The approved sign materially clarifies the image/caption relationship while the child cleans, rather than revealing it only later in Pulpito's closing bubble.
- `LevelPlay` now projects the existing approved `SIGN_ART` assets through `CaptionedArt` for the six sign-bearing prologue levels: `glass1..2` (`PECES`), `sand1..2` (`TORTUGAS`), and `glass3..4` (`MONOS`). `sendero`, night, and ordinary levels remain unchanged.
- The sign is an absolute, pointer-transparent overlay inside the playable sheet. Container-relative placement follows the visible 5:3 canvas edge, so it does not resize the drawing surface or drift into surrounding chrome at compact landscape sizes.
- The approved raster already contains its readable uppercase word inside the wooden frame. The duplicate DOM glyph is visually clipped but remains inside the real `CaptionedArt` container for assistive technology and `captionAudit`; no standalone or imageless caption was introduced.

### Focused and Full Validation
- `npm test -w client -- src/screen/LevelPlay.test.tsx` — PASS, 104/104. Coverage proves all six sign-bearing level ids use the approved art/label, caption audit stays clean, non-sign families remain untouched, and the overlay cannot shrink or intercept the canvas.
- `PLAYWRIGHT_CHANNEL=chrome PLAYWRIGHT_RUN_ID=u14-zoo-sign-final npx playwright test e2e/mvp-visual.spec.ts --project=chromium` — PASS, 15/15 using system Chrome. The matrix covers start, partial, error, success, and map-return at `1280x720`, `844x390`, and `390x844`; Playwright's configured reduced-motion mode was active.
- Raw captures: `client/test-results/playwright-output/run-u14-zoo-sign-final/`. Manual contact sheet: `client/test-results/playwright-output/run-u14-zoo-sign-final/u14-contact-sheet.png`.
- Manual inspection confirmed the wood-and-orange sign is immediately recognizable, its animal and caption remain readable, it stays inside the upper-left scene edge without shrinking the canvas or covering the central cleaning area, controls/reward/map return stay clear, and portrait correctly replaces all play content with rotate guidance.
- The first compact-landscape probe caught the sign outside the 5:3 scene; container-relative placement fixed it before the final matrix.
- `npm test` — PASS, 82 files / 1,923 tests. `npm run build` — PASS with the existing chunk-size warning only. `git diff --check` — PASS.

### Status
U14 complete. No gameplay, scoring, persistence, progression, ink, clue, deduction, or narrative copy changed. U10, U15, and U15.1 remain explicitly deferred and unchecked.

## Post-U14 Corrective Art Follow-up — Sand / Monkeys Sources

### Execution Status
- Stopped before replacing either source. The mandatory one-call-per-asset limit prohibits a regeneration: the sole sand-generation result includes three small flying-bird silhouettes in the upper-left sky, violating the explicit no-animals rule. It is therefore rejected and was not copied into `art-source/fondo arena.png`.
- No ImageGen call was made for `art-source/fondo recinto monos.png`: once the sand result required a second call to become usable, continuing would not produce the requested complete, compliant two-asset replacement. Existing source files remain unchanged.
- No task checkbox was changed. No public-art integration, build, manifest, registry, code, or tests were changed.

### Built-in ImageGen Record

| Asset | Built-in ImageGen call id | Output path | Dimensions | Inspection | Result |
|---|---|---|---|---|---|
| `art-source/fondo arena.png` | `exec-a034daa8-3962-40d2-a400-09a0e5dbd0b9` | `C:/Users/mastr/.codex/generated_images/01a0bf54-6970-7392-94ae-0a45c1e3e5bb/exec-a034daa8-3962-40d2-a400-09a0e5dbd0b9.png` | `1536x1024`, RGB | Inspected with `view_image` at original resolution. Composition, near-black contours, edge-weighted rocks/fence/water/shelter, and calm lower sand are suitable, but three bird silhouettes appear at upper-left. | Rejected; no replacement copied. |
| `art-source/fondo recinto monos.png` | — | — | — | Not generated because completing the rejected sand asset would require a forbidden second sand call. | Not attempted. |

#### Exact sand prompt
```text
Use case: illustration-story
Asset type: authored source background for a children's handwriting/erase game, to replace art-source/fondo arena.png; 1536x1024 landscape, 3:2, full-bleed complete scene.
Primary request: Create a polished child-friendly sandy turtle-enclosure entrance habitat, with no turtle, animal, person, character, or text anywhere. The child will erase a sand/debris veil over the central and lower area, so keep a broad calm integrated play zone across the middle and lower half.
Style/medium: 2D children's game illustration matching the approved renewed glass/night background family: thick neutral near-black #1a1a1a felt-tip outlines, rounded ends, slight human hand wobble, flat warm colour fills with very gentle paper-like texture; strong chunky readable shapes; no gradients, no shading, no 3D, no vector clip-art.
Scene/backdrop: sunlit warm sand habitat and entry scene. Along the organic outer edges place broad rounded boulders and stones, low dry grasses and succulents, weathered wooden fence posts/rails, a tiny shallow water basin or trickle, and a simple arched earth-and-stone shelter entrance with NO signage and NO writing. Use warm sand, ochre, terracotta, muted sage green, pale blue water, and neutral grey rocks. Detail is edge-weighted; the center and lower sand must remain calm and low-contrast but naturally connected to the habitat, never a blank or rectangular cut-out.
Composition/framing: complete 3:2 landscape, useful under later 1280x720 and 844x390 crops. Keep important scenery inside crop-safe edge zones. Frame a broad central/lower sandy clearing organically with side and upper-edge habitat cues; make the lower clearing clear enough for a semi-transparent sand/debris erase veil and gesture/hitbox overlays.
Lighting/mood: gentle sunny morning, friendly, inviting, calm.
Constraints: exact 1536x1024 PNG; no animals, no people, no characters, no turtle silhouette, no monkey silhouette, no text, letters, numbers, signs, logos, watermark, UI, paths or embedded route lines. Neutral #1a1a1a contours only. No artificial central cutout or empty rectangle.
Avoid: photorealism, 3D render, gradients, shadows, glossy effects, dense central texture, busy central decorations, blue/green/teal outlines, watermark, gibberish.
```

### Required Follow-up
A new sand-generation call (and then the first monkeys-generation call) is needed to complete this corrective-art task. That requires explicit approval because it would exceed the one-call cap for the sand asset.

### Follow-up Execution After Clarification

The clarification authorizes one isolated targeted remediation for the sand output and one isolated first-generation call for the monkeys source. Each call targeted only its own asset; neither call combined subjects or output destinations.

| Asset | Operation | Built-in ImageGen call id | Output path | Dimensions | Original-resolution inspection | Disposition |
|---|---|---|---|---|---|---|
| `art-source/fondo arena.png` | Targeted edit of the rejected sand output | `exec-e743d333-bcc2-41ea-ac0b-a43de451d801` | `C:/Users/mastr/.codex/generated_images/01a0bf54-6970-7392-94ae-0a45c1e3e5bb/exec-e743d333-bcc2-41ea-ac0b-a43de451d801.png` | `1536x1024`, RGB | Inspected with `view_image` at original resolution. The composition and style remain appropriate, but the upper-left still visibly contains the small flying-bird silhouettes the edit was meant to remove. | Rejected; `art-source/fondo arena.png` remains untouched. |
| `art-source/fondo recinto monos.png` | New source generation | `exec-824b9032-cbd7-46f6-8ea4-fdbd8fd1ad7b` | `C:/Users/mastr/.codex/generated_images/01a0bf54-6970-7392-94ae-0a45c1e3e5bb/exec-824b9032-cbd7-46f6-8ea4-fdbd8fd1ad7b.png` | `1536x1024`, RGB | Inspected with `view_image` at original resolution. No animals, characters, text, logos, or watermark observed. The scene has neutral near-black linework, ropes/platforms/branches/foliage/rocks at the edges, and a broad organically calm central/lower earth clearing suitable for leaf-litter erasure. | Accepted and copied to `art-source/fondo recinto monos.png` (SHA-256 `80ADB8846E40E244BAD14331F793E4136F7AFC9997DAF3FCFCAC6781C0EDC590`). |

#### Exact sand-remediation prompt
```text
Use case: precise-object-edit
Asset type: targeted remediation for the authored source background art-source/fondo arena.png.
Input image: the provided 1536x1024 sandy turtle-enclosure scene is the exact edit target.
Primary request: Remove only the three small flying bird silhouettes from the upper-left sky. Replace them with matching plain pale-blue sky and subtle existing atmosphere, leaving no animal, character, bird, silhouette, text, or new object there.
Style/medium: preserve the existing polished 2D child-friendly storybook game illustration exactly: thick neutral near-black #1a1a1a rounded felt-tip contours, warm flat fills, gentle paper texture, strong readable shapes.
Composition/framing: preserve the full 1536x1024 3:2 composition exactly: the organic edge-weighted rocks, fence, water pool and trickle, arched earth-and-stone shelter, plants, broad integrated calm central and lower sandy play clearing, palette, crop safety, and lighting. Do not crop, resize, rotate, alter, add, remove, or rearrange anything except the three birds.
Constraints: remove the birds only; no animals, people, characters, text, letters, numbers, logos, watermark, UI, paths, or route lines. Keep contours neutral near-black #1a1a1a; do not introduce central cutout, new texture, gradient, shadow, or 3D effect.
Avoid: changing the existing scene, changing fill colours, busy central detail, blue/green/teal outlines, photorealism, vector clip-art, gradients, glossy effects, watermark, gibberish.
```

#### Exact monkeys-generation prompt
```text
Use case: illustration-story
Asset type: authored source background for a children's handwriting/leaf-litter erase game, to replace art-source/fondo recinto monos.png; exact 1536x1024 landscape, 3:2, full-bleed complete scene.
Primary request: Create a polished child-friendly leafy monkey-habitat clearing with absolutely no monkeys, animals, people, characters, faces, silhouettes, or text anywhere. The child will erase a leaf-litter veil over the central and lower area, so keep a broad calm, naturally integrated clearing across the middle and lower half.
Style/medium: 2D children's game illustration matching the approved renewed glass/night family: thick neutral near-black #1a1a1a felt-tip marker contours, round ends, slight human hand wobble; flat warm colours with gentle paper texture; chunky strong readable shapes. No gradients, shading, 3D, glossy render, or vector clip-art.
Scene/backdrop: a sunny, welcoming leafy primate habitat without inhabitants. Use thick ropes looping organically from sturdy wooden posts and branches at upper sides, simple wooden climbing platforms near the edge zones, layered rounded green foliage, chunky tree trunks, a few large rocks, and low shrubs framing the scene. The central/lower clearing is a warm muted earth-and-leaf-toned ground, calm and low contrast but organically continuous with the habitat; no artificial central empty rectangle or cutout.
Composition/framing: full complete 3:2 landscape, crop-safe for later 1280x720 and 844x390 displays. Put ropes, branches, platforms, foliage, trunks and rocks mainly around top, bottom, and side edges. Maintain a broad clear central/lower zone for a semi-transparent leaf-litter erase veil, gesture tracing, and hitbox overlays. Important scenery must survive crop without depending on extreme edges.
Lighting/mood: gentle dappled morning light, friendly, tranquil, child-readable.
Color palette: warm ochre/brown wood, moss and leaf greens, muted clay/tan ground, grey stones, small pale sky openings; dark contours exclusively neutral near-black #1a1a1a.
Constraints: exact 1536x1024 PNG; no animals, no monkeys, no birds, no people, no characters, no faces, no animal silhouettes or icons, no text, letters, numbers, signs, logos, watermark, UI, paths, or embedded route lines. No artificial central cutout. No transparent background.
Avoid: photorealism, 3D, gradients, shadows, dense central details, busy central texture, blue/green/teal outlines, watermark, gibberish.
```

### Post-Follow-up Status
- `fondo recinto monos.png` is renewed and accepted.
- `fondo arena.png` remains blocked by the birds retained in the sole authorized targeted edit; further sand work requires a new explicit instruction.
- No task checkboxes, public-art integration, manifest, registry, code, build output, commit, push, PR, or history were changed.

### Final From-Scratch Sand Generation

Authorized one-asset final generation completed independently from the monkeys asset.

| Asset | Operation | Built-in ImageGen call id | Output path | Dimensions | Original-resolution inspection | Disposition |
|---|---|---|---|---|---|---|
| `art-source/fondo arena.png` | From-scratch generation, sand asset only | `exec-f13b7acb-18ce-4afa-a996-67a299d9aef0` | `C:/Users/mastr/.codex/generated_images/01a0bf54-6970-7392-94ae-0a45c1e3e5bb/exec-f13b7acb-18ce-4afa-a996-67a299d9aef0.png` | `1536x1024`, RGB | Inspected with `view_image` at original resolution. No living creatures, creature silhouettes/icons/patterns, text, logos, or watermark observed. The complete sandy habitat has neutral near-black contours, edge-weighted rocks/fence/water/shelter/plants, and an organically broad calm central/lower sand play zone. | Accepted and copied to `art-source/fondo arena.png` (SHA-256 `8FE9003E3219EFD9218AB2ED609CD4F6CC852CBEFE4EAD37E474C8FCF11A1064`). |

#### Exact final sand-generation prompt
```text
Use case: illustration-story
Asset type: final authored source background for a children's handwriting/sand-debris erase game, to replace art-source/fondo arena.png only. Generate exactly one full 1536x1024 PNG, landscape 3:2, full-bleed complete scene.
Primary request: Create a polished child-friendly sandy turtle-habitat enclosure and entrance, completely uninhabited. It must provide a broad calm, naturally integrated sandy play zone across the middle and lower half for a semi-transparent sand/debris erase veil, tracing gestures, and hitbox overlays.
Critical exclusion rule: ABSOLUTELY NO LIVING CREATURES anywhere in the entire image. No birds, animals, turtles, monkeys, insects, fish, people, characters, faces, animal or human silhouettes, shadows shaped like creatures, creature icons, creatures on signs, creature decorations, creature patterns, or creature-like marks — including in the sky, background, foreground, water, rocks, wood, plants, signs, or any decorative area. No text, letters, numbers, logos, symbols, watermark, UI, signs, or glyphs anywhere.
Style/medium: 2D children's game illustration matching the approved renewed glass/night family and docs/09: thick rounded felt-tip marker contours in neutral near-black #1a1a1a, slight human hand wobble, flat warm colours, very gentle paper texture, chunky strong readable shapes. No gradients, no shading, no 3D, no glossy render, no vector clip-art.
Scene/backdrop: gentle sunny sandy habitat, framed organically along upper and side edges by rounded natural stone formations, grey and terracotta boulders, low dry grasses/succulents, weathered wooden fence posts/rails, a small shallow pale-blue water basin with a tiny trickle, and a simple arched earth-and-stone shelter entrance with an empty plain opening. The center and lower sand must be calm, low contrast, and continuous with the enclosure, never an artificial blank rectangle or cut-out.
Composition/framing: full complete crop-safe 3:2 scene for later 1280x720 and 844x390 views. Keep important edge scenery inside crop-safe zones. Detail is edge-weighted, but all negative space emerges naturally from calm open sand rather than a central empty box.
Lighting/mood: inviting warm morning, tranquil, clean, child-readable.
Color palette: warm sand, ochre, terracotta, muted sage green, pale blue water, neutral grey rock. Dark contours exclusively neutral #1a1a1a.
Constraints: preserve exact 1536x1024 RGB output, no transparent background, no path or embedded route lines, no busy central details, no dense central texture, no blue/green/teal contours.
Avoid: every living creature or silhouette, photorealism, 3D, gradients, shadows, dense central detail, artificial central cutout, text, watermark, logo, gibberish.
```

### Corrective-Art Follow-up Final Status
- Both renewed authoring sources are now accepted: `art-source/fondo arena.png` and `art-source/fondo recinto monos.png`.
- No task checkbox, public-art integration, manifest, registry, build output, code, commit, push, PR, or history was changed.
