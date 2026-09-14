```yaml
schema: gentle-ai.verify-result/v1
evidence_revision: sha256:ba2600487d0bb23ef2c6bd2a76d610ea474c693186af489ca870f3aeab0f8f7d
verdict: pass_with_warnings
blockers: 0
critical_findings: 0
requirements: 21/21
scenarios: 59/59
test_command: npm test
test_exit_code: 0
test_output_hash: sha256:ee9414ddd5be3f14a30b69a8011abb8c49e0fb1179154ab3cfb1d9e642bfedd0
build_command: npm run build
build_exit_code: 0
build_output_hash: sha256:406ec47f59419a6a31961d3a9771c120d00d19ff3740f24a88e5c27a1627b961
```

## Verification Report — Re-verify after remediation (retry 1)

**Change**: `dolphin-zigzag-scrolling-screen` (paso G of `docs/13` §8)
**Branch**: `sdd/delfines-en-el-estanque`, HEAD `13ce60b`, 13 implementation commits above `a1cff82` above `main` `8fecedb` (10 original + 3 remediation: `24f40e4`, `452edbd`, `13ce60b`)
**Prior report**: FAIL (2 CRITICAL, 2 WARNING). This report supersedes it in full — not a delta.

### Completeness
| Metric | Value |
|--------|-------|
| Tasks total | 56 + 4 remediation (R1–R4) |
| Tasks complete | 60 |
| Tasks incomplete | 0 |

`tasks.md` gained a "Remediation after verify" section with R1–R4, all `[x]`. No `[~]` marker anywhere.

### Build & Tests Execution

**Build**: PASS
```text
$ npm run build
> tsc --noEmit && vite build
✓ 526 modules transformed.
dist/index.html                  1.89 kB │ gzip:   1.02 kB
dist/assets/index-CdKISnXn.js  842.43 kB │ gzip: 180.17 kB
✓ built in 442ms
```

**Tests**: PASS — 1730 passed / 0 failed / 0 skipped
```text
$ npm test
 Test Files  76 passed (76)
      Tests  1730 passed (1730)
   Duration  26.40s
```
Matches the requested expectation exactly: 76 files / 1730 tests (1722 from the first verify pass + 8 new: 4 `seedCameraFor` semantics tests + 1 call-site guard test in `LevelPlay.test.tsx`, + 3 pinned-backdrop tests — no-debug/debug280/debug9999/non-camera — in `TraceCanvas.test.tsx`; net after `backdrops.test.ts`'s two-test collapse into one is +8 total).

### Re-verification of the two prior CRITICAL findings

#### (a) "Restarting resets the origin" — was CRITICAL/UNTESTED, now **RESOLVED**

`LevelPlay.tsx` now extracts the shared reseed expression into one pure, exported `seedCameraFor(level, target, search)` function, called at all three reset sites (mount `useState` initialiser, `resetSurface`, `restartRun`). Confirmed directly:
```
$ grep -c "seedCameraFor(level, target, debugSearch)" client/src/screen/LevelPlay.tsx
3
```
`LevelPlay.test.tsx` adds two describe blocks:
1. `seedCameraFor`'s own semantics (4 tests: no-camera→0 regardless of seed, camera+no-seed→0, camera+seed→seed, camera+overflowing-seed→clamped to `viewBoxWidth − viewWidth`).
2. A **source-reading call-site guard** using `import.meta.glob('./LevelPlay.tsx', { query: '?raw' })`, regex-counting `seedCameraFor(level, target, debugSearch)` occurrences and asserting exactly 3, plus asserting the old hand-copied ternary (`seedCameraOrigin(cameraDebugOrigin(debugSearch)`) is gone from the source.

This is a real regression test: removing the `restartRun` call (or any of the three) drops the count to 2 and fails the guard — the commit message states this was confirmed RED before restoring, and I independently confirmed the current source has exactly 3 occurrences, matching the test's assertion. **This closes the gap**: a future edit that silently drops one of the three reseed call sites (the exact class of the original apply-time bug) now fails the suite. **PASS.**

Caveat carried forward: this remains a *source-structure* proof, not a live-DOM proof that a real restart actually re-renders the `<svg viewBox>` back to the seed (the `node`/no-rAF harness still cannot drive a live stroke-then-restart through `TraceCanvas`). Given `design.md` §6.2's own admission that no test in this repo can observe the live per-frame mutation at all, this is the strongest test achievable in this harness, and it is materially stronger than before (zero coverage → a test that fails on the exact defect class found). Not flagged as an issue.

#### (b) `docs/13` §4 item 9's backdrop finding — was CRITICAL (false claim), now **RESOLVED**

`docs/13_AVENTURAS_POR_ANIMAL.md` now states plainly: "El fondo de la laguna paneada SÍ muestra sólo agua — el diseño tenía razón, y la primera lectura de las capturas al implementar fue un error," names the exact re-read files, and records the adopted decision (window-pinned backdrop) with its reasoning. `design.md` gains §3.5 "Post-verify amendment A4" with the same correction and the technical description of the fix. The `scrolling-camera` and `trace-canvas` specs were both updated (see below). **This is a direct, honest correction, not a re-assertion of the same wrong claim — confirmed by re-reading the rewritten text.** **PASS.**

New captures in `capturas/pasoG-verify/` (5 files, all viewed directly) confirm the fix works:
- **`dolphin3-control.png`** and **`dolphin3-debug280.png`**: both show the SAME fixed reed/bank illustration top and bottom (byte-for-byte-looking, unmoving), while the corridor's wave pattern and the octopus start-marker are visibly shifted between the two — the octopus sits at world-x≈0 in the control and is fully panned off-screen in the debug-280 capture. **Confirms**: banks/reeds visible (previously the CRITICAL finding), backdrop now fixed while corridor pans underneath it (the window-pin design), exactly as `design.md` §3.5 describes.
- **`dolphin4-control.png`** vs **`dolphin4-debug9999-clamp.png`**: same fixed backdrop in both; the clamp capture shows the route's end-marker diamond fully on-screen with no blank paper past the right edge of the sheet, and the corridor pattern is shifted left relative to the control — the clamp still works correctly with the backdrop pin in place.
- `dolphin4-debug560.png` exists but was not separately needed once the above two bracket it.

### Re-verification of the two prior WARNING findings

#### WARNING 1 (id-list test omissions) — **RESOLVED**

`docs/13` §4 item 9 now has a dedicated bullet, "Cuatro listas de ids fijas a mano, encontradas al correr la batería completa, no al diseñar," naming all four (`levelsByPhase`, the detective-mode trail list, "Registro↔Catálogo, consistencia estructural," "Resolución de nextAdventure") and restating the append-not-insert lesson. **PASS.**

#### WARNING 2 ("no literal dedicated test" for backdrop/base-rect widths on `dolphin3`) — **RESOLVED (base rect); the guide-line half remains correctly untestable, not forced**

`TraceCanvas.test.tsx`'s new "no debug seed" pinned-backdrop test explicitly asserts `expect(html).toContain(\`width="${target.viewBoxWidth}"\`)` for the base rect on a real `dolphin3` render — the exact literal test that was previously missing. `tasks.md`'s R4 explicitly notes the guide-line scenario stays structurally unreachable on the shipped dolphin config (`surface: 'blank'` never renders the guide-line group) rather than forcing an artificial test — the same vacuous-PASS reasoning my first report already used for that scenario. **PASS** (both halves correctly resolved: one by a new test, one by an honest "not applicable" note).

### Spec Compliance Matrix (full re-count against the UPDATED specs)

The `scrolling-camera` and `trace-canvas` deltas changed shape (backdrop requirement renamed/split, one scenario added to each), so total scenario count rose from 57 to 59.

#### `scrolling-camera` spec (8 requirements, 17 scenarios — was 16)

| Requirement | Scenario | Test / Evidence | Result |
|---|---|---|---|
| Sheet Width and View Width Are Distinct Quantities | Non-scrolling level equal | `buildLevel.test.ts:338` | PASS |
| Sheet Width and View Width Are Distinct Quantities | `dolphin3`/`dolphin4` exceed | `buildLevel.test.ts:352-355`; `catalog.test.ts:1822-1826` | PASS |
| Camera Origin Forward-Only, Monotone, Clamped | Origin never decreases | `camera.test.ts` FORWARD-ONLY | PASS |
| Camera Origin Forward-Only, Monotone, Clamped | Clamps at route's end | `camera.test.ts` CLAMP; `TraceCanvas.test.tsx` V3; `dolphin4-debug9999-clamp.png` | PASS |
| Camera Origin Forward-Only, Monotone, Clamped | **Restarting resets the origin** | `LevelPlay.test.tsx`'s `seedCameraFor` semantics tests + the three-call-site source guard (see (a) above) | **PASS (was CRITICAL)** |
| A Lead Window Gates Camera Advance | Held-still finger | `camera.test.ts` HOLD STILL | PASS |
| A Lead Window Gates Camera Advance | Crossing lead threshold | `camera.test.ts` LEAD threshold | PASS |
| Frame/Event Ordering Is Named and Bounded | Fast-stroke tolerance | No executable test possible (`design.md` §2.3 closed-form derivation only, no `getScreenCTM`/rAF in `node`) | **NOT VERIFIABLE (carried forward)** |
| A Non-Opting Level Renders Byte-Identically | Word-building level unaffected | `TraceCanvas.test.tsx` V6 | PASS |
| **The Backdrop Is Pinned to the View Window on a Camera Level** (renamed) | Backdrop image pinned to window, `x`=origin, `width`=`viewWidth` | `TraceCanvas.test.tsx` — "no debug seed"/"?debug=camara:280"/"?debug=camara:9999" pinned-backdrop tests | **PASS (new/renamed requirement)** |
| **The Backdrop Is Pinned to the View Window on a Camera Level** | Non-camera level's backdrop unaffected (`x`=0, `width`=`viewBoxWidth`) | `TraceCanvas.test.tsx` — "a non-camera level renders the backdrop image byte-identically" | **PASS (new scenario)** |
| `prefers-reduced-motion` Does Not Suppress the Camera | Identical sequence | No test exists; true by code inspection (no media-query logic in `camera.ts`/`TraceCanvas.tsx`) | **NOT VERIFIABLE (carried forward)** |
| Rendered `viewBox` Attribute Required Test Surface | Initial origin 0 | `TraceCanvas.test.tsx` V1 | PASS |
| Rendered `viewBox` Attribute Required Test Surface | Debug flag seeds origin | `TraceCanvas.test.tsx` V2 | PASS |
| Rendered `viewBox` Attribute Required Test Surface | Clamp at extent | `TraceCanvas.test.tsx` V3 | PASS |
| Rendered `viewBox` Attribute Required Test Surface | Live clamp proven by capture | `capturas/pasoG-verify/dolphin4-debug9999-clamp.png` — read directly, end marker fully in frame, no blank paper | PASS |
| Rendered `viewBox` Attribute Required Test Surface | Debug flag ungated | `cameraDebugOrigin` has no `isDevMode()` call (unchanged from first pass) | PASS |

**scrolling-camera summary**: 15 PASS, 0 CRITICAL, 2 NOT VERIFIABLE — 17 scenarios.

#### `trace-canvas` delta (3 requirements, 10 scenarios — was 9)

| Requirement | Scenario | Test / Evidence | Result |
|---|---|---|---|
| Camera Origin Mutates viewBox Imperatively | Reuses existing rAF loop | Diff inspection: backdrop `x` write is one more `setAttribute` call in the same block that already writes `viewBox`, no new `useEffect`, no `setState` | PASS |
| Camera Origin Mutates viewBox Imperatively | Non-camera x-origin never moves across frames | Not directly testable in `node` (no rAF); V5-equivalent initial-state proof only | **NOT VERIFIABLE (carried forward)** |
| Full-Sheet Render Sites Already Span the World | Base rect spans world, unchanged | `TraceCanvas.test.tsx`'s new pinned-backdrop test explicitly asserts `width="${target.viewBoxWidth}"` on `dolphin3` (closes prior WARNING) | **PASS (newly covered)** |
| Full-Sheet Render Sites Already Span the World | **Backdrop image pinned to window** (new) | `TraceCanvas.test.tsx` pinned-backdrop describe block, 4 tests | **PASS (new scenario)** |
| Full-Sheet Render Sites Already Span the World | Rendered viewBox width reports window | `TraceCanvas.test.tsx` V1/V2/V3 | PASS |
| Full-Sheet Render Sites Already Span the World | Guide lines span world | Structurally unreachable on shipped dolphin config (`surface: 'blank'`), vacuously true, explicitly noted rather than forced (`tasks.md` R4) | PASS (vacuous) |
| Full-Sheet Render Sites Already Span the World | Non-camera spans unaffected | Full suite green, pre-existing assertions unedited | PASS |
| MODIFIED: Viewport and Ruled Lines | Non-camera guides on grid | Pre-existing, unedited, green | PASS |
| MODIFIED: Viewport and Ruled Lines | Descender below baseline | Pre-existing, unedited, green | PASS |
| MODIFIED: Viewport and Ruled Lines | Camera-enabled x-origin advances, width stays window | `TraceCanvas.test.tsx` V2 | PASS |

**trace-canvas summary**: 9 PASS, 0 CRITICAL, 1 NOT VERIFIABLE — 10 scenarios.

#### `level-engine` delta (5 requirements, 14 scenarios — unchanged, spec file not touched by remediation)

All 14 scenarios remain PASS, re-confirmed unchanged from the first report (full suite still green, `catalog.ts`/`dolphinExtrema.ts` untouched by the three remediation commits).

#### `zoo-map` delta (5 requirements, 18 scenarios — unchanged, spec file not touched by remediation)

All 18 scenarios remain PASS, re-confirmed unchanged from the first report.

### Grand total
- Requirements: 21 total (unchanged count; two requirement bodies were renamed/expanded but the count of distinct requirements per spec is the same). 18/21 fully compliant across every one of their scenarios; 3 requirements (`scrolling-camera`'s "Frame/Event Ordering," `scrolling-camera`'s "`prefers-reduced-motion`," `trace-canvas`'s "Camera Origin Mutates viewBox Imperatively") each carry exactly one NOT VERIFIABLE scenario — the same three inherent `node`/no-rAF harness limits `design.md` §6.2 names, unchanged from the first report.
- Scenarios: 59 total (was 57; +2 from the backdrop-pin remediation adding one scenario to each of `scrolling-camera` and `trace-canvas`). **56 PASS, 0 CRITICAL, 3 NOT VERIFIABLE.**

### Commit Hygiene (three new commits)

```
24f40e4 test(canvas): cover the camera reseed at all three LevelPlay reset sites
452edbd fix(canvas): pin the backdrop image to the view window on camera levels
13ce60b docs(13): correct paso G's backdrop finding and record the remediation
```
All three: conventional `type(scope): description` format, present-tense body explaining what/why. `git log 0d60090..HEAD --format=%B | rg -i "co-authored|generated with|claude"` returns nothing — **no AI/Co-Authored-By trailers.** `git status --short` is clean (the new `capturas/pasoG-verify/` directory is inside the already-gitignored `capturas/`).

### NEW finding from the remediation captures — the crest/trough dolphins sit on the bank illustration

Direct inspection of `capturas/pasoG-verify/dolphin3-control.png`, `dolphin3-debug280.png`, `dolphin4-control.png`, and `dolphin4-debug9999-clamp.png` (all now showing the fixed, correctly-visible reed/bank artwork) shows the decorative dolphin pictures at every wave crest sitting **directly on top of / overlapping the drawn reed and bush illustration**, not on open water, and — by the same geometry, mirrored — the trough dolphins sit on the lower bank band. This is visible in every one of the four captures listed, at every rung shown.

**This follows from the shipped arithmetic, not from the backdrop-pin fix itself.** The phase-1 amplitude guard forces `amplitude > 150`; at the family's authored `A = 160`, `design.md` §5.2's own derivation puts the dolphin-ceiling at 77 and the shipped crest/trough boxes at `y ∈ [13,90]` (crest) / `[510,587]` (trough) depending on rung — see the exact per-level table in `design.md` §5.2, unchanged by this remediation. `docs/13`'s own `corridorRows: {top: 135, bottom: 889}` puts the bank/reed illustration's source rows below 135 (and above 889) — the same band the crest boxes (`y ≤ 90` on every rung) fall inside. **This was already true on `dolphin1`/`dolphin2` in the very first (pre-fix) captures I reviewed** — I noted at the time that the crest dolphins in `dolphin1-control.png` appeared to sit among the reed artwork, but did not flag it as a distinct issue in the first report. The window-pin fix makes the SAME thing now equally visible on `dolphin3`/`dolphin4`, because those two levels now also render the reed/bank band at the same 1× scale the un-camera'd levels always used.

**Classification: art-direction consequence, not a code defect.** Nothing in the engine is wrong: `vertexArtPoints` places the picture exactly where `design.md` §5.1/§5.2 specifies, `clampArtBox` is the identity (asserted by the coincidence test), and the placement is disjoint from the CHANNEL (the scored corridor) as required — the dolphins do not touch the traced path. The overlap is with the DECORATIVE bank illustration behind the channel, which the phase-1 amplitude guard and the derived 77-unit ceiling leave no room to avoid: a shorter amplitude ladder is barred by the guard (`A > 150` is a hard requirement, `docs/13`'s own reasoning for phase 1 training the arm), and a smaller dolphin (moving further from the 77-unit ceiling) is an author's art-direction call, not an engine change. This is the same class of open item as `design.md`'s already-recorded "`DOLPHIN_SIZE = 64` is provisional inside a ceiling of 77."

**Not currently recorded anywhere.** `docs/13` §4 item 9's remediation bullets (backdrop finding, id-list fixes, `restartRun` regression test) do not mention this. I recommend the orchestrator add the following sentence (Spanish, neutral register, matching item 9's existing bullet style) before archive:

> **Y una consecuencia de la aritmética que sólo se ve ahora que el fondo está fijo a la ventana: los delfines de las crestas quedan dibujados sobre la propia ilustración de la orilla, entre los juncos, y los de los valles sobre la banda inferior — la guardia de fase 1 obliga amplitud > 150, el techo del delfín es 77 (A3, diseño §5.2), y esa franja cae dentro de las filas que ocupa la orilla una vez que el fondo deja de recortarse. No es un defecto de motor: acortar la amplitud está bloqueado por la guardia, y separar más al delfín de la orilla implica achicarlo, decisión de la autora, no del motor. Queda abierto como los demás ítems de dirección de arte (`DOLPHIN_SIZE` provisional, la imagen de referencia pendiente).**

### Issues Found

**CRITICAL**: None. Both prior CRITICAL findings are resolved (see re-verification sections above).

**WARNING**:
1. **NEW** — the crest/trough dolphins render on top of the bank/reed illustration rather than on open water, on all four dolphin levels (visible pre-existing on `dolphin1`/`dolphin2`, now equally visible on `dolphin3`/`dolphin4` after the backdrop-pin fix). Art-direction consequence of the phase-1 amplitude guard and the 77-unit ceiling, not a code defect. Not currently recorded in `docs/13`'s amendment; exact recommended sentence given above.

**SUGGESTION**:
1. (Carried forward, downgraded from the first report — the backdrop/base-rect gap is now closed) None remaining from the first report's suggestions beyond what's already addressed.
2. Consider, at a future author-direction pass, whether the dolphin family should crop the reed illustration locally behind each decorative dolphin (a possible small art fix) or accept the overlap as intentional ("delfines saltando sobre la orilla" reads plausibly as intentional, not obviously wrong) — purely a judgement call for the author, not engineering.

### NOT VERIFIABLE items (carried forward in full from the first report, per instruction)
1. `scrolling-camera` "Frame/Event Ordering Is Named and Bounded" — the Δ≤19-world-unit tolerance is a closed-form derivation in `design.md` §2.3; no executable test exists or is possible in this repo's `node`-only vitest harness (no `getScreenCTM`, no rAF).
2. `scrolling-camera` "`prefers-reduced-motion` Does Not Suppress the Camera" — true by code inspection (no media-query reference anywhere in `camera.ts`/`TraceCanvas.tsx`), not runtime-testable.
3. `trace-canvas` "A non-camera level's viewBox x-origin never moves" (per-frame, across multiple frames) — only the initial-render state is testable in `node`; the live per-frame invariant is the same class of gap `design.md` §6.2 names for the whole camera mechanism.
4. Whether a world that holds still 420 units, pans 560, then holds still again reads as one continuous movement or three — a live-motion-feel question no static screenshot can answer (recorded honestly in `docs/13`'s own amendment, unchanged by this remediation).
5. Whether the carrier (the octopus) occludes a dolphin it passes mid-route — every capture across both capture rounds is a pre-stroke rest state; no capture shows a live stroke mid-route past a dolphin.

### Verdict
**PASS WITH WARNINGS**
Both prior CRITICAL findings are genuinely resolved: the "Restarting resets the origin" spec scenario now has a real regression test (source-structure guard proving all three reseed call sites exist by name, confirmed to fail on the exact original defect), and the `docs/13` backdrop finding has been honestly corrected and the design's own named fallback adopted and tested end-to-end (pinned-backdrop `x`/`width`, non-camera parity, base-rect unchanged). The build is green, `npm test` matches the expected 76/1730 exactly, and commit hygiene is clean. One new WARNING — an art-direction consequence (dolphins rendering over the bank illustration), not a defect — is not yet recorded in `docs/13`'s amendment; a ready-to-paste sentence is provided above. Three NOT VERIFIABLE items remain, all inherent to this repo's `node`-only test harness and already named honestly by `design.md` itself, not newly discovered gaps.
