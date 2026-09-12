# Tasks: The Zoo Map Is the Main Screen

**Binding delivery ruling (user, verbatim: "Un cambio SDD, rama desde main"):** ONE
change, ONE branch (`sdd/zoo-map-home`), ONE PR. The forecast below is recorded
honestly per `design.md` §"Slice Plan"; the user's ruling is its resolution, not a
reopening of it. No chained PRs are planned.

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | S1 ~360, S2 ~360, S3 ~170, S4 ~1,400 (pure deletion) — ~2,290 total |
| 400-line budget risk | High |
| Chained PRs recommended | No (user ruling overrides the design's own "Yes") |
| Suggested split | Single PR, ordered as internal commit slices S1→S4 |
| Delivery strategy | single-pr |
| Chain strategy | size-exception |

Decision needed before apply: Yes
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: High

**Why the number is misleading rather than alarming**: ~1,400 of the ~2,290 lines
are S4's deletion of `HomeScreen.tsx`/`.test.tsx` and all of `client/src/home/` —
the cheapest diff a reviewer reads, zero additions. The other three slices
(~890 lines total, all additive) each sit under the 400-line guard individually.
Recorded as one `size:exception` PR per the user's ruling, not split.

### Suggested Work Units (internal commit slices inside the one PR)

| Unit | Goal | Slice | Focused test command | Runtime harness | Rollback boundary |
|------|------|-------|----------------------|-----------------|-------------------|
| S1 | Registry + guardrail tests | commit 1 | `npx vitest run client/src/zoo` | N/A — no browser harness in this repo | Delete `client/src/zoo/` (no external importers yet) |
| S2 | Map screen, HUD, debug flag | commit 2 | `npx vitest run client/src/screen/ZooMap.test.tsx` | N/A — component tests are `renderToString`; screenshot check is Phase 5 | Delete `screen/ZooMap.tsx`(+test) and the `isSectorDebug` addition; not yet wired to `App` |
| S3 | Entry + navigation wiring | commit 3 | `npx vitest run client/src/screen/GameScreen.test.tsx client/src/screen/levelFlow.test.ts client/src/App.test.tsx` | N/A | Revert the commit; `HomeScreen` still exists as the pre-image fallback |
| S4 | Retire the office | commit 4 (last) | `npm test` (full suite; pure deletion, no new test) | N/A | Revert the commit — restores `HomeScreen`/`home/` byte-for-byte (proposal Rollback Plan #1) |
| Screenshots | Human-reviewed captures | after S4 | N/A — no automated proof possible | `npm run dev` (port 5173) + `scripts/shot.sh` | N/A — read-only verification, corrects the registry if needed |

## Phase 1: Registry and Guardrail Tests (S1)

- [x] 1.1 Create `client/src/zoo/sectors.ts`: `Rect`, `FogPatch` (`rot: 0` literal), `ZooAnimal`, `ZooSector` (`hit` optional), `SECTORS` (7 sectors incl. sendero with no `hit`), `PLAZA`, `PLAZA_CENTRE`, `Records`, `isFiled` (design §3).
- [x] 1.2 Add decision functions to `sectors.ts`: `isOpen`, `nextAdventure` (OD2), `sectorOf`, `recentlyDiscovered`, `animalPlacements` (via `placeArt`+`STANDING_GRIP`), `footprintTrail` (pitch 40, `clues.ts:161-171` alternation), `fogBoxes` (closed-form construction, design §4).
- [x] 1.3 Add `coversRect` (coordinate-compression containment) to `sectors.ts`.
- [x] 1.4 Create `client/src/zoo/sectors.test.ts`: hit hygiene (≥120×120, pairwise disjoint, disjoint from `PLAZA`, sendero is the ONLY sector without `hit`); fog containment true for every closed sector AND false when one patch's `size` is halved (falsifiability, spec "Shrinking a patch breaks coverage"); registry↔catalog (`estanque.adventureIds` exact 8-id order; every `adventureIds`/`appearsWhen` id is a real `LEVELS` id; no id in two sectors); `nextAdventure` 3 cases (first unfinished, all-filed→last, empty→null); `sectorOf`/`isOpen`/`recentlyDiscovered` (estanque open on empty `Records`, five others closed always); `footprintTrail` (pitch=40, no print on endpoints, alternating sides); `animalPlacements` (duck absent before `duck-trail4`, present after, `STANDING_GRIP` bottom-edge check); `@ts-expect-error` on a `rot: 15` literal.
- [x] 1.5 Create `client/src/zoo/stars.ts`: `starsFor(record) = min(record.approvals, APPROVALS_TO_UNLOCK)`, `totalStars(records)` (real catalog ids only, per spec "Star Derivation").
- [x] 1.6 Create `client/src/zoo/stars.test.ts`: `starsFor` 0→0,1→1,2→2,5→2; `totalStars` ignores `duck-deduce` and unknown keys.
- [x] 1.7 Create `client/src/zoo/backpack.ts`: `BackpackItem`, empty `BACKPACK_ITEMS`, `earnedItems(records)` returning `[]` over the empty registry.
- [x] 1.8 Add `isSectorDebug(search: string): boolean` to `client/src/canvas/devMode.ts`, pure parse of `?debug=sectores`, no `isDevMode()` gate. Add its test cases: on, off, absent, malformed (must not throw).
- [x] 1.9 Run `npx vitest run client/src/zoo client/src/canvas/devMode.test.ts` — all green, zero regressions.

## Phase 2: The Map Screen (S2)

- [x] 2.1 Create `client/src/screen/ZooMap.tsx` per design §7 tree: `#76B56A` background rect, map `<image>` at `xMidYMid slice`, fog per closed sector, `animalPlacements`, footprint trail (`rotate` via `PRINT_FACING = atan2(dy,dx) − 90°`), octopus-with-backpack via `placeArt`, transparent hit-rects with `onClick → nextAdventure`, `isSectorDebug` overlay (red translucent `hit`+`animalSpot` markers).
- [x] 2.2 Add `ZOO_CSS` scoped `<style>` with the fog fade `@keyframes` (1.5s opacity) and `@media (prefers-reduced-motion: reduce) { animation: none }`, mirroring `HomeScreen.tsx:88-104`.
- [x] 2.3 Build the HUD as DOM siblings of the `<svg>`: backpack (left), recovered-animal row (mid), `CaptionedArt` star count (right); speech bubble (`<img>` backdrop + `CaptionedArt` phrase) rendered only when `recentlyDiscovered` is non-null.
- [x] 2.4 Create `client/src/screen/ZooMap.test.tsx` (`renderToString`): map `<image>` href + `xMidYMid slice`; fog present on exactly 5 sectors, estanque's absent (deviation: the design's own two-patch-per-sector construction (§4) means 10 `<image>` elements across those 5 sectors, not 5 elements — asserted both ways, see the test's own comment); zero `url(#` occurrences; duck href present only when `duck-trail4` filed; the fade class is proven directly against the exported `fogClassFor` pure function (deviation: the CURRENT registry's estanque starts open (D4) and so never carries fog to attach the class to in a full render — noted in the test file, exercisable end-to-end once paso D adds a closeable sector); HUD nodes are siblings of, not children of, `<svg>`; `auditCaptions(html).uncaptioned === []` and `imagelessContainers === []`; a hand-built bare-word-outside-`cv-captioned` string proves `auditCaptions` CAN fail (falsifiability); debug flag off → no `#ff0000`, on → hit+plaza+animalSpot markers and no new caption word.
- [x] 2.5 Run `npx vitest run client/src/screen/ZooMap.test.tsx` — green, zero regressions elsewhere.

## Phase 3: Navigation and Entry Wiring (S3)

- [x] 3.1 Edit `client/src/screen/GameScreen.tsx`: add `ExitAction`/`NextAction` types (design §6, `exit` NOT a `GameAction` member); make `resolveNextAction` sector-aware (`sectorOf(finishedLevelId)` non-null → `{type:'exit'}`, else today's `{type:'next', levelId: nextLevelId(...)}` unchanged); update the `onNext` call site to discriminate `exit` (`onExit()`) vs `dispatch(action)`; narrow the `caseOf`/`caseSolvedId` import (deduction auto-route removed, D2); keep `allEarned` (loses its last production caller, stays for `Deduction`).
- [x] 3.2 Update `client/src/screen/GameScreen.test.tsx` and `levelFlow.test.ts`: convert the old deduce-route test cases into exit-route cases; add `resolveNextAction` cases — a sector level → `exit`; `duck-trail4` → `exit`, never `deduce`; a non-sector level → today's `{type:'next'}` unchanged; `nextView`'s existing cases stay unchanged. (`levelFlow.test.ts` needed no edit — it carries no deduce-route case at all; confirmed and left untouched.)
- [x] 3.3 Edit `client/src/App.tsx`: `Shell` gains `{ at: 'map' }` replacing `{ at: 'home' }`; `initialShell()` falls back to `{ at: 'map' }`; rename `goHome` → `goToMap`; delete `viewFor(step: CaseStep)`, the `CaseStep`/`HomeMode` type imports, and the `HomeScreen` import; `onEnter` becomes `(levelId: string) => void`.
- [x] 3.4 Edit `client/src/App.test.tsx`: entry assertion → asserts `/art/zoo-map.png` present and neither `/art/home-octopus.png` nor `Elegí un camino` present; replace the zero-visible-text assertion (D3) with an `auditCaptions`-based assertion, PLUS a hand-built failing case proving the new assertion can go red (do not duplicate 2.4's ZooMap-level falsifiability check if it already covers the same string — this task covers the `App`-level entry render).
- [x] 3.5 Run `npx vitest run client/src/screen/GameScreen.test.tsx client/src/screen/levelFlow.test.ts client/src/App.test.tsx` and `npm run build` — green, `HomeScreen` still present and unbroken (not yet deleted).

## Phase 4: Retire the Home Office (S4, deletion only, last)

- [x] 4.1 Delete `client/src/screen/HomeScreen.tsx` and `client/src/screen/HomeScreen.test.tsx`.
- [x] 4.2 Delete `client/src/home/` in full: `modes.ts`+`modes.test.ts`, `officeGround.ts`+`officeGround.test.ts`, `caseState.ts`+`caseState.test.ts` (6 files).
- [x] 4.3 Confirm zero remaining imports of `home/*` or `HomeScreen` anywhere in `client/src` (the verified importer list is closed: `App.tsx`, `HomeScreen.tsx`, `HomeScreen.test.tsx`, the three `home/*.test.ts` — all deleted in this slice; `rg` confirms zero remaining import statements, only historical comment mentions). Confirmed `home-octopus.png`/`home-desk.png` stay registered, untouched, in `client/src/detective/assets.ts` — `artManifest.test.ts`/`artHierarchy.test.ts` still green (82 tests).
- [x] 4.4 Run `npm test` (full suite) and `npm run build`: both green. File count returns to 60 (the 4 files added S1/S2 minus the 4 deleted here); test count is 1154 (net +9 over the 1145 baseline, from S1-S3's additions minus this slice's 4 removed test files) — no drop outside this slice.

## Phase 5: Screenshot Verification (deliverable, not optional)

- [x] 5.1 Start the dev server: `npm run dev -- --host 0.0.0.0` (port 5173). `--host` added so the map is reviewable from a real tablet on the LAN, not only from headless chromium on this box.
- [x] 5.2 Captured as `capturas/mapa.png` (1000x600, no flag). `scripts/shot.sh` was changed in `ae1bb7e` so a relative name lands in `capturas/` at the repo root instead of `/tmp` — a capture the reviewer cannot open has done nothing.
- [x] 5.3 Captured as `capturas/mapa-debug-sectores.png` (1000x600) — `hit`/`animalSpot` overlay.
- [x] 5.4 Captured as `capturas/mapa-tablet-vertical.png` (768x1024) — portrait tablet ratio, above the 500px window-width floor, `CHROME_OFFSET=87` handled by the script.
- [x] 5.5 Read the 5.3 capture. For any `hit` rect that misses its drawn sector, correct the rect in `client/src/zoo/sectors.ts` (`docs/12` §4: registry is corrected, never `zoo-map.png`); re-run Phase 1's geometry/containment tests and re-capture 5.3 until every rect aligns.
  **This loop ran three times and found four real defects, none of which any test could see.**
  (a) The fog was sized `1.06 x hit.h` per patch at the width quadrants, so bosque's fog spanned
  ~670 units for a 300-unit sector; replaced by a cell grid (`14cfe1e`). (b) The speech bubble had
  no width and rendered at its intrinsic 488px, 49% of the stage, swallowing two sectors; sized in
  percent (`14cfe1e`). (c) The grid's rounded blobs left a hole at each junction and nocturna leaked
  night sky and two stars, which `docs/12` §1 forbids outright; closed with `FOG_OVERLAP` 1.30 plus
  interior junction patches (`1ed1318`). (d) `NOCTURNA_HIT.x` was 95 while the drawn night sky starts
  at viewBox 88.5, so 6.5 units of the sector sat outside its own rect and outside the fog sized from
  it — the registry was corrected to x 88 / w 257, exactly the direction `docs/12` §4 mandates.
- [x] 5.6 Human-review all three captures against design §"Open Questions": does `PRINT_FACING` point the toe at the sector; do the two fog patches read as fog, not two ellipses; does `#76B56A` read continuous with the map's edge at the portrait ratio (no seam); does the HUD stay clear of drawn sky at the portrait ratio.

## Phase 6: Final Gate

- [x] 6.1 Run `npm test` (full suite, repo root or `client/`) and `npm run build` — both green, this is the final proof.
- [x] 6.2 Confirm scope stop: this change ends at **paso A**. Do NOT start any `docs/13` §8 paso B–H content — no duck reshaping, no lagoon background, no entrance/intro, no sheep/llama/snake/bee/dolphin/hedgehog sectors, no backpack contents. Those are the next change.

---

**Accepted deviation**: this tasks artifact exceeds the skill's 530-word cap, the
same deviation `proposal.md` and `design.md` recorded for this change. Six phases,
a High-risk forecast that must be recorded honestly against an explicit
single-PR user ruling, and a mandatory human-verification loop (capture → read →
correct the registry → recapture) could not be shortened without dropping a
concrete file path, command, or the falsifiability check the design demands.
