```yaml
schema: gentle-ai.verify-result/v1
evidence_revision: sha256:0d600904a2bf0a3d1e9f1b0d0d0e0a1f2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e
verdict: fail
blockers: 1
critical_findings: 2
requirements: 19/21
scenarios: 53/57
test_command: npm test
test_exit_code: 0
test_output_hash: sha256:6d26b98557dd613d76f4e636735fcbebe341194fa7e7c89f2804bf4fbefedd4b
build_command: npm run build
build_exit_code: 0
build_output_hash: sha256:3a80422c8ca602478c8d24037774687ca55b681c4d8aa37afb14595202daa7ef
```

## Verification Report

**Change**: `dolphin-zigzag-scrolling-screen` (paso G of `docs/13` §8)
**Version**: N/A
**Mode**: Standard (Strict TDD not declared for this change; tasks.md follows RED→GREEN discipline throughout, verified against test-file timestamps/content, not re-enforced here as a separate gate)
**Branch**: `sdd/delfines-en-el-estanque`, HEAD `0d60090`, 10 implementation commits above `a1cff82` above `main` `8fecedb`

### Completeness
| Metric | Value |
|--------|-------|
| Tasks total | 56 |
| Tasks complete | 56 |
| Tasks incomplete | 0 |

All 56 tasks in `tasks.md` are checked `[x]`; no `[~]` marker exists anywhere in the file (confirmed by direct read and by task 10.6's own re-check).

### Build & Tests Execution

**Build**: PASS
```text
$ npm run build
> tsc --noEmit && vite build
✓ 526 modules transformed.
dist/index.html                  1.89 kB │ gzip:   1.02 kB
dist/assets/index-rZHsxwmh.js  842.38 kB │ gzip: 180.13 kB
✓ built in 525ms
```
`tsc --noEmit` reported zero errors.

**Tests**: PASS — 1722 passed / 0 failed / 0 skipped
```text
$ npm test
 RUN  v4.1.11 /home/opencode/projects/cursiva/client
 Test Files  76 passed (76)
      Tests  1722 passed (1722)
   Duration  26.69s
```
Matches the claimed baseline exactly: main is 74 files / 1656 tests; this branch adds 2 new files (`canvas/camera.test.ts`, `levels/dolphinExtrema.test.ts`) and 66 new tests inside extended existing files, landing at 76/1722.

**Coverage**: Not configured in this repo (no coverage script); not available.

### Spec Compliance Matrix

Legend: PASS (covering test/capture passed at runtime), FAIL (covering test failed or contradicted by evidence), NOT VERIFIABLE (no executable path exists in this repo's `node`-only vitest harness; verified, if at all, by static/derived reasoning only), UNTESTED (a testable claim that has no covering test).

#### `scrolling-camera` spec

| Requirement | Scenario | Test / Evidence | Result |
|---|---|---|---|
| Sheet Width and View Width Are Distinct Quantities | Non-scrolling level: `viewBoxWidth === viewWidth` | `buildLevel.test.ts:338` "every shipped level with no camera field reports viewWidth === viewBoxWidth" | PASS |
| Sheet Width and View Width Are Distinct Quantities | `dolphin3`/`dolphin4`: `viewBoxWidth > viewWidth` | `buildLevel.test.ts:352-355`; `catalog.test.ts:1822-1826` "a camera is present ONLY on dolphin3/dolphin4, with viewWidth === MIN_VIEWBOX_WIDTH" | PASS |
| Camera Origin Forward-Only, Monotone, Clamped | Origin never decreases within an attempt | `camera.test.ts` "FORWARD-ONLY" describe block, both cases | PASS |
| Camera Origin Forward-Only, Monotone, Clamped | Origin clamps at the route's end | `camera.test.ts` "CLAMP at the route's end"; `TraceCanvas.test.tsx` V3 (`?debug=camara:9999` on `dolphin4` clamps to `1120 0 1000 600`); `dolphin4-debug9999-clamp.png` shows the route's end marker with no blank paper past the right edge | PASS |
| Camera Origin Forward-Only, Monotone, Clamped | **Restarting resets the origin to its initial value** | **No covering test exists.** `LevelPlay.tsx` wires the reseed at three sites (mount `useState` initialiser, `resetSurface`, `restartRun` — the last one is the apply-time bugfix), but `LevelPlay.test.tsx` contains **zero** references to `camera`, `seedCameraOrigin`, `cameraOriginX`, or `viewBox` (`rg` returns no hits). `camera.test.ts` proves the pure `seedCameraOrigin`/`cameraOrigin` algebra is correct in isolation; `TraceCanvas.test.tsx`'s `cameraFor()` helper *reimplements* LevelPlay's seeding recipe by hand rather than exercising `LevelPlay.tsx` itself. The specific `restartRun` fix the apply phase reports finding and fixing (task 2.8, commit `2cc27f4`) has **no regression test** anywhere in the suite. | **CRITICAL — UNTESTED** |
| A Lead Window Gates Camera Advance | Held-still finger does not move camera | `camera.test.ts` "HOLD STILL" describe block (fixed-point proof + falsifiability case) | PASS |
| A Lead Window Gates Camera Advance | Crossing the lead threshold advances the camera | `camera.test.ts` "LEAD threshold" describe block | PASS |
| Frame/Event Ordering Is Named and Bounded | Fast stroke's sample stays within stated tolerance | No executable test exists; the Δ≤19-world-unit bound is a closed-form derivation in `design.md` §2.3, not code the vitest `node` harness can exercise (no `getScreenCTM`, no rAF). Structurally consistent with the shipped code (the camera and the ink share one `rendered` array read in one callback, unchanged from the pre-existing carrier/ink pattern). | **NOT VERIFIABLE** |
| A Non-Opting Level Renders Byte-Identically | Word-building level's render unaffected | `TraceCanvas.test.tsx` V6 "the parity list stays byte-identical" — `f4-la`, `f5-mama`, `duck-trail1..4`, `sheep-hill1`, `snake3`, `bee1`, `night2`, `glass1` | PASS |
| The Backdrop Spans the World as One Element | Exactly one backdrop `<image>` spans `viewBoxWidth`, no `<pattern>`/`url(#` | No dedicated test renders a dolphin level's `TraceCanvas` with both `backdrop` and the real (wide) `viewBoxWidth` together and reads the `<image>` width off the string. Verified instead by diff: `TraceCanvas.tsx`'s backdrop-image and base-rect definitions (`:1026-1062` region) are **byte-unchanged** by this change (confirmed via `git diff main..HEAD`), and `buildLevel.ts` independently proves `target.viewBoxWidth` is correct (1560/2120) for `dolphin3`/`dolphin4`. `rg 'url\(#'` finds zero occurrences in rendered markup repo-wide. | PASS (by construction + diff evidence; no literal dedicated test) |
| `prefers-reduced-motion` Does Not Suppress the Camera | Identical origin sequence with/without reduced motion | No test exists (and none is claimed). True by code inspection: `camera.ts` and the `TraceCanvas.tsx` rAF block contain no reference to `prefers-reduced-motion` or any media query — the camera block executes unconditionally. Cannot be confirmed at runtime in a `node`-only harness. | **NOT VERIFIABLE** |
| The Rendered `viewBox` Attribute Is the Required Test Surface | Initial rendered viewBox reports origin 0 | `TraceCanvas.test.tsx` V1 | PASS |
| The Rendered `viewBox` Attribute Is the Required Test Surface | Debug flag seeds the rendered origin | `TraceCanvas.test.tsx` V2 | PASS |
| The Rendered `viewBox` Attribute Is the Required Test Surface | Seeded origin beyond extent clamps in rendered viewBox | `TraceCanvas.test.tsx` V3 | PASS |
| The Rendered `viewBox` Attribute Is the Required Test Surface | Live per-frame clamp proven by capture, not test | `capturas/pasoG/dolphin4-debug9999-clamp.png` — read directly: shows the route's end-marker diamond with no blank paper past the right edge | PASS |
| The Rendered `viewBox` Attribute Is the Required Test Surface | Debug flag is ungated | `cameraDebugOrigin` (`devMode.ts:190-196`) contains no call to `isDevMode()` at all, structurally identical to the other seven shipped parsers; `devMode.test.ts` exercises it directly with no dev-mode setup | PASS |

**scrolling-camera summary**: 13 PASS, 1 CRITICAL/UNTESTED, 2 NOT VERIFIABLE — 16 scenarios.

#### `trace-canvas` delta

| Requirement | Scenario | Test / Evidence | Result |
|---|---|---|---|
| Camera Origin Mutates viewBox Imperatively, Zero setState | The write reuses the existing rAF loop | `git diff` of `TraceCanvas.tsx`: the camera block is inserted one statement after the carrier write, inside the same `useEffect`/rAF callback; no new `useEffect`, no `setState` call anywhere in the block | PASS (by diff inspection; also implied by V1-V3 passing, which requires the same loop to be live) |
| Camera Origin Mutates viewBox Imperatively, Zero setState | Non-camera level's viewBox x-origin never moves across frames | Not directly testable in `node` (no rAF). `TraceCanvas.test.tsx` V5 proves the **initial** render is unaffected by a debug seed on a non-camera level (`dolphin1`), but no test observes multiple frames. Same class of gap `design.md` §6.2 names for the whole camera mechanism. | **NOT VERIFIABLE** (partially supported by V5's initial-state check) |
| Full-Sheet Render Sites Already Span the World | Backdrop and base rect span the world on `dolphin3`, unchanged | No literal test reads the base `<rect>`/backdrop `<image>` width off `dolphin3`'s real render. Verified by diff: these sites are byte-unchanged (confirmed above) | PASS (by construction) |
| Full-Sheet Render Sites Already Span the World | Rendered viewBox width reports the window, not the world | `TraceCanvas.test.tsx` V1/V2/V3 all assert `viewBox="... 1000 600"` on `dolphin3`/`dolphin4` whose `viewBoxWidth` is 1560/2120 | PASS |
| Full-Sheet Render Sites Already Span the World | Guide lines span the world on a camera level | No literal test on `dolphin3` with `surface: 'blank'`; the four dolphin levels ship `surface: 'blank'`, which per `design.md` §4.3 means the guide-line group never renders on any of the four anyway (`surface === 'ruled'` is the gate) — so this scenario is **structurally unreachable** on the shipped dolphin levels, exactly as `design.md` §1.3 row 7 states | PASS (vacuously true; confirmed by reading `surface: 'blank'` in `catalog.ts`'s dolphin literals) |
| Full-Sheet Render Sites Already Span the World | A non-camera level's spans are unaffected | Full suite green (1722/1722), including every pre-existing `TraceCanvas.test.tsx` assertion on non-camera levels, unedited | PASS |
| MODIFIED: Viewport and Ruled Lines | Guides sit on viewBox grid for non-camera level | Pre-existing test, unedited, green | PASS |
| MODIFIED: Viewport and Ruled Lines | Descender letter visible below baseline | Pre-existing test, unedited, green | PASS |
| MODIFIED: Viewport and Ruled Lines | Camera-enabled level's x-origin advances while width stays the window | `TraceCanvas.test.tsx` V2 (`dolphin3`, `?debug=camara:280` → `viewBox="280 0 1000 600"`) — origin > 0, width = viewWidth | PASS |

**trace-canvas summary**: 7 PASS, 2 NOT VERIFIABLE — 9 scenarios.

#### `level-engine` delta

| Requirement | Scenario | Test / Evidence | Result |
|---|---|---|---|
| Optional Camera Field / viewWidth on LevelTarget | Pre-existing level: viewWidth === viewBoxWidth | `buildLevel.test.ts:338` | PASS |
| Optional Camera Field / viewWidth on LevelTarget | Camera level reports narrower view | `buildLevel.test.ts:352-355` | PASS |
| Existing `wave` Generator Reused / Extrema Sibling | `wave` output survives `transformPath` at every dolphin width | Full suite green, all four dolphin levels render via `buildLevelTarget`/`TraceCanvas` without throwing (implicit in every dolphin test); no dedicated throw-assertion test found by name, but non-throwing is a precondition of every other passing dolphin test | PASS |
| Existing `wave` Generator Reused / Extrema Sibling | `routeExtrema` superset of `routeApexes` on the eight ridge levels | `dolphinExtrema.test.ts` — the superset proof (task 3.1) | PASS |
| Existing `wave` Generator Reused / Extrema Sibling | `routeExtrema` finds troughs, not only crests | `dolphinExtrema.test.ts` — alternating crest/trough assertions (task 3.3) | PASS |
| Existing `wave` Generator Reused / Extrema Sibling | `routeApexes` and consumers unaffected | `dolphinExtrema.test.ts`'s "row that names A2" (`routeApexes(dolphinPolyline)` returns `[]`); full suite green on sheep/llama tests, unedited | PASS |
| Dolphin Level Set — Four Levels | Period count rises, corridor width falls monotonically | `catalog.test.ts:1789+` "the dolphin family" describe block | PASS |
| Dolphin Level Set — Four Levels | Every dolphin clears the phase-1 amplitude guard | `catalog.test.ts`'s shared phase-1 guard (`levelsByPhase(1)`, span>300/minY<180/maxY>420), now including the four dolphin ids since `levelsByPhase`'s hardcoded list was fixed | PASS |
| Dolphin Level Set — Four Levels | Only `dolphin3`/`dolphin4` declare a camera | `catalog.test.ts:1822-1826` | PASS |
| Dolphin Level Set — Four Levels | `demo`/`resetOnContact`/obstacle hold as specified | `catalog.test.ts:1829+`; confirmed directly in `catalog.ts`'s diff (`demo: true` only on `dolphin1`, `resetOnContact: false` on all four, no `obstacle`/`hazard` field on any) | PASS |
| `catalog.test.ts`'s Guards Recognize the Dolphin Family | `EXPECTED_IDS` includes the four ids in play order | `catalog.test.ts:88-91` | PASS |
| `catalog.test.ts`'s Guards Recognize the Dolphin Family | Family passes existing guards with no new exemption | Full suite green; `catalog.test.ts:289,297,352,580-590` confirmed unedited by the apply's own task 5.3/10 notes and by this session's read of the same line ranges | PASS |
| Docs §6/§14 Checklist Coverage | Every dolphin LevelConfig answers the engine-owned checklist items | `paths[0]`, `corridorWidth`, `rules`, `demo` all defined per-level in `catalog.ts`'s diff; no dedicated single test asserts all four fields together as a checklist, but each is independently asserted elsewhere in `catalog.test.ts` | PASS |
| Docs §6/§14 Checklist Coverage | Narrative transition not claimed by any dolphin LevelConfig | Confirmed by reading `catalog.ts`'s four dolphin entries: no field names a narrative transition; the four author only engine-owned fields | PASS |

**level-engine summary**: 14 PASS — 14 scenarios.

#### `zoo-map` delta

| Requirement | Scenario | Test / Evidence | Result |
|---|---|---|---|
| Image-to-ViewBox Transform | Transform matches measured scale factor | Pre-existing test, unedited, green | PASS |
| Image-to-ViewBox Transform | Background renders measured green | Pre-existing test, unedited, green | PASS |
| Image-to-ViewBox Transform | Every existing caller stays byte-identical at default width | `sectors.test.ts` — fifteen-caller parity proof (task 4.2) | PASS |
| Image-to-ViewBox Transform | Caller passing wider sheet gets different, correct result | `sectors.test.ts:597,603` — W=1560/2120 channel-row table | PASS |
| Sector-to-Adventure Mapping | Estanque's twelve adventures in exact order | `sectors.test.ts:205-218` | PASS |
| Sector-to-Adventure Mapping | Estanque's unlockedWhen unaffected | `sectors.test.ts:317-324` (pre-existing, unedited assertions, still green) | PASS |
| Sector-to-Adventure Mapping | Montañas' eight adventures in exact order | Pre-existing test, unedited, green | PASS |
| Sector-to-Adventure Mapping | Entrada eight levels, never fogged | Pre-existing test, unedited, green | PASS |
| Sector-to-Adventure Mapping | Nocturna fogged until llama-peak4 | Pre-existing test, unedited, green | PASS |
| Sector-to-Adventure Mapping | Arena fogged until night4 | Pre-existing test, unedited, green | PASS |
| Sector-to-Adventure Mapping | Bosque opens once snake4 filed | Pre-existing test, unedited, green | PASS |
| Sector-to-Adventure Mapping | Sendero remains empty and closed | Pre-existing test, unedited, green | PASS |
| AdventureId/ZooAnimalId Widen | Dolphin row declares `animal:'delfin'`, no `closingBeat` | `adventures.test.ts:269-271` | PASS |
| AdventureId/ZooAnimalId Widen | Filing dolphin4 flips mapBubble to dolphin's closing line | `adventures.test.ts:258-263` | PASS |
| AdventureId/ZooAnimalId Widen | `ZOO_ANIMAL_ART.delfin` resolves to dolphin art | `adventures.test.ts:501` region / `assets.ts` diff (`delfin: SECTOR_ADVENTURE_ART.dolphin`) | PASS |
| AdventureId/ZooAnimalId Widen | Dolphin appears in zoo once dolphin4 filed | `sectors.test.ts:467-501` (Z1 disjointness); confirmed visually in `capturas/pasoG/zoo-before.png` vs `zoo-after.png` | PASS |
| Dolphin Backdrop Reuses Lagoon Art | Dolphin row copies duck row's literals | `backdrops.test.ts:312-319`, verified directly against `backdrops.ts` source (`quiet`/`brightest`/`corridorRows` byte-identical to the duck row) | PASS |
| Dolphin Backdrop Reuses Lagoon Art | `backdropFor` resolves dolphin level id to dolphin row | Implicit in `backdrops.test.ts`'s completeness guard (every `AdventureId` with levels must resolve); full suite green | PASS |
| No Backpack Item Granted | `earnedItems` never includes an estanque-granted item | `backpack.test.ts:69-78` | PASS |

**zoo-map summary**: 18 PASS — 18 scenarios.

### Grand total
- Requirements: 21 total. 19 fully compliant across all their scenarios; 2 have at least one non-PASS scenario (`scrolling-camera`'s "Camera Origin Forward-Only..." — 1 CRITICAL; `scrolling-camera`'s "Frame/Event Ordering" and "`prefers-reduced-motion`" requirements — each single-scenario NOT VERIFIABLE; `trace-canvas`'s "Camera Origin Mutates viewBox..." — 1 NOT VERIFIABLE scenario alongside 1 PASS).
- Scenarios: 57 total. 53 PASS, 1 CRITICAL/UNTESTED, 3 NOT VERIFIABLE (frame/event tolerance, reduced-motion, one trace-canvas per-frame observation — all three are the exact class of gap `design.md` §6.2 names and none is a surprise finding).

### Correctness (Static Evidence)

| Requirement | Status | Notes |
|------------|--------|-------|
| `viewWidth` fallback formula uses `viewBoxWidth`, not `MIN_VIEWBOX_WIDTH` | PASS | Confirmed in `buildLevel.ts` diff; matches the apply's own recorded correction to `design.md` §1.2 |
| `restartRun` reseeds the camera | PASS (code), CRITICAL (no test) | Fix present in `LevelPlay.tsx` diff at the `restartRun` callback, with the correct dependency array (`level.camera`, `debugSearch`, `target.viewWidth`, `target.viewBoxWidth`); see the spec-matrix row above for the missing test |
| `dolphin1..4` are `kind: 'path'`, `demo` only on `dolphin1`, `resetOnContact: false` on all four | PASS | Confirmed directly in `catalog.ts` diff |
| Amplitude guard A=160>150 on all four | PASS | Confirmed in `catalog.ts` (amplitude 160 on all four `wave(...)` calls) and green via `catalog.test.ts`'s shared guard |
| Corridor ladder narrows monotonically (110>100>96>84) | PASS | Confirmed in `catalog.ts` diff and `catalog.test.ts:1789+` |
| World widths 1000/1000/1560/2120 | PASS | Matches `design.md` §4.2's worked table exactly; confirmed via `wave` x0/x1/cycles literals in `catalog.ts` |
| Dolphins decorative at crests/troughs via `routeExtrema` | PASS | `place: 'extrema'` on all four in `catalog.ts`; `LevelPlay.tsx`'s branch confirmed in diff; coincidence test in `TraceCanvas.test.tsx` |
| Size 64 ≤ 77 ceiling | PASS | `DOLPHIN_SIZE = 64` in `catalog.ts`, doc comment derives the 77 ceiling; `catalog.test.ts` asserts the constraint (box-table test), never the literal |
| `routeExtrema` superset of `routeApexes` on the eight sheep/llama levels | PASS | `dolphinExtrema.test.ts` |
| Placement test renders real `<image>` markup | PASS | `TraceCanvas.test.tsx`'s coincidence test parses `<image href="/art/sector-dolphin.png">` out of the rendered HTML string, never internal box objects |
| No `url(#` in new markup | PASS | `rg 'url\(#' client/src` returns only doc-comment/test-guard hits, zero in rendered markup |
| No `Co-Authored-By`/AI trailers in the 10 commits | PASS | `git log main..HEAD --format=%B \| rg -i "co-authored\|generated with\|claude"` returns nothing |
| Conventional commit format | PASS | All 10 commits use `type(scope): description`; verified by direct read of `git log` |
| `estanque.adventureIds` gains dolphin1..4 | PASS | `sectors.ts` diff |
| `AdventureId`/`ZooAnimalId` widen | PASS | `adventures.ts`/`assets.ts` diff |
| Backdrop row reuses lagoon literals verbatim | PASS | Confirmed byte-for-byte against the duck row in `backdrops.ts` |
| No backpack item added | PASS | Confirmed — no `estanque`-keyed row in `BACKPACK_ITEMS`; `backpack.test.ts` guard |
| Unlock ladder unaffected | PASS | `estanque.unlockedWhen` unchanged in `sectors.ts` diff; pre-existing tests green |
| `mapBubble` filter | PASS | `dolphin` row appended at the END of `ADVENTURES` (not after `duck`), preserving every existing index — confirmed in `adventures.ts` diff and `adventures.test.ts` |
| `sectors.ts` transforms with default stage-width param, 15 callers unchanged | PASS | `imageToViewBox`/`viewBoxToImage` diff; `sectors.test.ts`'s fifteen-caller parity proof |
| `backdrops.test.ts` channels rows through the parametrised transform | PASS | `backdrops.test.ts:335-337` uses `stageWidth` explicitly for each dolphin level |
| Paso F's lesson: every new export has a real caller | PASS | Re-verified independently via `rg` for all nine symbols (`cameraOrigin`, `seedCameraOrigin`, `TraceCamera`, `cameraDebugOrigin`, `routeExtrema`, `vertexArtPoints`, `RouteExtremum`, `DOLPHIN_SIZE`, `DOLPHIN_CLEAR`) — every one has a real, non-test caller |
| **docs/13 §4 amendment records the real findings** | **CRITICAL — contradicted by direct capture evidence** | See "Captures Read-Back" below |
| **docs/13 §4 amendment records the four id-list-test findings** | **WARNING — omitted** | See "Captures Read-Back" / Issues below |
| 13 named engine files byte-identical to `main` | PASS | Re-verified independently: `useTraceInput.ts`, `coverage.ts`, `revealGrid.ts`, `corridorTrack.ts`, `evaluateLevel.ts`, `vertexArt.ts`, `paths.ts`, `arrange.ts`, `artCorridor.ts`, `waypoints.ts`, `cases.ts`, `build_art.py`, `manifest.json` all produce empty `git diff main..HEAD` |
| `isUnlocked`'s only real consumer stays `LevelMap.tsx` | PASS | Re-verified independently via `rg` |
| docs/13 §8 row G left as-is | PASS | Confirmed — diff touches only §4, not §8 |

### Coherence (Design)

| Decision | Followed? | Notes |
|----------|-----------|-------|
| A1 — one site changes (`viewBox` attribute), eleven stay world-anchored | YES | Confirmed by diff: `TraceCanvas.tsx`'s sheetBounds/backdrop/wall/guide-line definitions are byte-unchanged; only the `viewBox` attribute expression and the rAF block changed |
| A2 — `routeExtrema` is a monotone-run scan, not a three-point scan | YES | `dolphinExtrema.ts` implementation matches the design's algorithm exactly (turn-detection by sign reversal, rise measured against surrounding turns) |
| A3 — dolphin ceiling is 77, ships 64 | YES | `catalog.ts`'s `DOLPHIN_SIZE = 64` with the doc comment deriving 77 |
| §2.1 camera algebra (forward-only, clamped, lead window, pen-lift) | YES | `camera.ts` is a verbatim implementation of the design's pseudocode |
| §2.4 reset/restart routes through one initialiser | YES (with the documented apply-time correction) | `restartRun`'s own reseed was a real gap the design's "clearAttempt/restartRun/resetSurface all reseed" assumption missed; the apply fix is correct in code but untested (see CRITICAL above) |
| §3.1/§3.2 backdrop reuse and channel-row containment | YES (mechanically) | `backdrops.ts` diff matches the design's literals exactly; **but design §3.3's own pessimistic prediction (only water visible) is what the captures actually confirm — the apply's "corrected" finding claiming otherwise is wrong** (see below) |
| §4.2 the four wave literals | YES | `catalog.ts` diff matches the worked table exactly (x0/x1/cycles, corridorWidth, camera config) |
| §5.1/§5.2 placement algebra and size ceiling | YES | `dolphinExtrema.ts`/`catalog.ts` match |
| §6.1 V1-V6 rendered-viewBox test surface | YES | `TraceCanvas.test.tsx` matches the design's table exactly, case for case |
| §7 the one debug flag, ungated | YES | `cameraDebugOrigin` matches `arrangeDebugCount`'s own body/shape, per design's instruction |
| §8 zoo registry rows | YES | `adventures.ts`/`sectors.ts`/`backdrops.ts`/`assets.ts` all match the design's literal table |

### Captures Read-Back (task item 9)

Twelve capture files exist in `capturas/pasoG/`, all viewed directly:

- **`dolphin3-control.png` vs `dolphin3-debug280.png`**: the control shows the start-marker octopus at the left edge (world x≈0); the debug-280 capture has the octopus panned entirely off-screen and the left/right edge dolphins crop differently. **The camera visibly moved.** Left corridor edge position differs between the two as expected of a 280-unit pan.
- **`dolphin4-debug9999-clamp.png`**: shows the route's end-marker diamond icon fully on-screen with no blank paper past the right edge of the sheet — the clamp is visually confirmed, corroborating the `?debug=camara:9999` seeded-origin test.
- **Backdrop finding — CONTRADICTS the shipped docs/13 amendment.** `dolphin1-control.png` and `dolphin2-control.png` (world width 1000, no camera, same scale as the duck levels) both show clearly textured reed/grass bands above and below the corridor. **`dolphin3-control.png`, `dolphin3-debug280.png`, `dolphin4-control.png`, and `dolphin4-debug9999-clamp.png` (the two camera levels, world 1560/2120) show a perfectly flat, solid, untextured light blue-grey field with zero visible reed or grass texture at either the top or bottom band.** This is the *opposite* of what `docs/13` §4 item 9's third apply-time bullet and Engram's `apply-progress` (finding #7) both claim ("reeds and shore grass are clearly visible at both `dolphin3` (1.56×) and `dolphin4` (2.12×)... this corrects design §3.3's own pessimistic prediction"). Direct visual inspection of the same files the amendment cites as its evidence shows the ORIGINAL `design.md` §3.3 prediction was correct all along: at 1.56× and 2.12× the visible backdrop rows fall entirely inside the sampled quiet band and show only open water. The amendment's "corrected" finding is factually wrong, and the design-named fallback (pin the backdrop `<image>` to the window instead of the world) was never applied, on the strength of a misread capture.
- **Dolphin size (64 units) reads clearly as a dolphin, not a smudge**, at every rung — confirmed in all four levels' captures (grey body, white belly, recognisable fin).
- **`zoo-before.png`/`zoo-after.png`**: the dolphin is absent in `zoo-before.png` (duck-trail4/sand4 baseline) and present in `zoo-after.png`, standing beside the duck in the reeds, clear of the reed island — matches the Z1 placement math and the `sectors.test.ts` assertions.
- **`intro-dolphin1.png`**: renders the adventure-intro screen (Pulpito + bubble + `sector-dolphin.png`), consistent with paso B's reused components.

**NOT VERIFIABLE from these captures** (as the apply itself already recorded, and independently confirmed here — no attempt was made to force an answer):
- Whether a world that holds still 420 units, pans 560, then holds still again reads as one continuous movement or three (a live-motion-feel question no static screenshot pair can answer).
- Whether the carrier (the octopus) occludes a dolphin it passes mid-route (every capture is a pre-stroke rest state; no capture shows a live stroke mid-route past a dolphin).

### Issues Found

**CRITICAL**:
1. **`scrolling-camera` spec scenario "Restarting resets the origin" has no covering test.** `LevelPlay.tsx`'s three camera-reseed call sites (mount, `resetSurface`, `restartRun`) are exercised by zero tests in `LevelPlay.test.tsx` (`rg` for `camera`/`viewBox` in that file returns nothing). The apply-time `restartRun` bugfix (a real defect, correctly fixed in code) ships with no regression test guarding it — a future refactor of `LevelPlay.tsx`'s reset paths could silently reintroduce the exact bug the apply phase found and fixed, and the suite would stay green.
2. **`docs/13` §4 item 9's backdrop finding is factually false, contradicted by the exact captures it cites as evidence.** The amendment (and Engram's `apply-progress` observation #1406, finding #7) states reeds/shore grass are "claramente visibles" on `dolphin3`/`dolphin4` at 1.56×/2.12×, correcting `design.md` §3.3's prediction of a featureless water field. Direct visual inspection of `capturas/pasoG/dolphin3-control.png`, `dolphin3-debug280.png`, `dolphin4-control.png`, and `dolphin4-debug9999-clamp.png` shows the opposite: a flat, textureless backdrop with zero visible reed/grass at either camera world, while `dolphin1`/`dolphin2` (uncamera'd, same 1000-wide world as the ducks) clearly show the reed texture. `design.md` §3.3's original, more pessimistic prediction was correct. The named fallback (pin the backdrop `<image>` to the window instead of the world, a two-line change at one site) was never applied because the capture read-back that would have triggered it was performed incorrectly.

**WARNING**:
1. `docs/13` §4 item 9's "corrected or found during apply" bullet list records three findings (the `viewWidth` fallback bug, `restartRun`'s missing reseed, the backdrop finding above) but omits the four hardcoded phase-1/adventure id-list test fixes the apply phase itself found and recorded twice in `apply-progress` (`levelsByPhase`, the detective-mode trail list, `sectors.test.ts`'s "Registry↔Catalog Structural Consistency" test, and its "nextAdventure Resolution" test). These are real, apply-time-discovered test-suite gaps of the same class as the other three recorded findings, and their omission from the shipped documentation is inconsistent with the amendment's own stated two-part shape ("design decisions, then what apply actually found").
2. Several `trace-canvas`/`scrolling-camera` scenarios that are provably true by construction (unchanged code paths, confirmed via diff) lack a literal dedicated runtime test exercising the real `dolphin3`/`dolphin4` config end-to-end for the backdrop `<image>`/base-rect widths specifically. Low risk today since the sites are byte-unchanged, but any future edit to those "no change" sites would not be caught by a dolphin-specific test.

**SUGGESTION**:
1. Consider adding a `renderToString`-based test that mounts `LevelPlay` itself (not just `TraceCanvas` with a hand-built `camera` prop) for `dolphin3`, reads the initial `<svg viewBox>`, then simulates the `resetSurface`/`restartRun` code paths and re-reads it, to close the CRITICAL gap above with a test that would actually have caught the `restartRun` bug the apply phase found by inspection alone.
2. A future capture-reading pass should re-open the `dolphin3`/`dolphin4` backdrop question against `design.md` §3.3's named fallback, since the current captures argue for applying it, not against it.

### Verdict
**FAIL**
Two CRITICAL findings block a clean archive: an explicitly named spec scenario ("Restarting resets the origin") has zero covering test at the only layer where the reset actually happens, and the shipped `docs/13` amendment records a capture-based finding that is factually contradicted by the very screenshots it cites — with a real consequence (the design's named backdrop fallback was skipped on the strength of that wrong reading). All 1722 automated tests pass and the build is green; the codebase implementation itself is faithful to the design and specs in every area checked. The two CRITICAL items are both closeable without touching the working camera/placement/zoo mechanics: one new LevelPlay-level test, and one documentation correction (plus a design-direction decision on whether to apply the named backdrop fallback).
