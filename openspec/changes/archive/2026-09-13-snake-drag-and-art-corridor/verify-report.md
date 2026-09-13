```yaml
schema: gentle-ai.verify-result/v1
evidence_revision: sha256:477bc761ba5c4296301fcfd0a23b9cee039563bcec901d55188b18e64e1be746
verdict: pass_with_warnings
blockers: 0
critical_findings: 0
requirements: 35/35
scenarios: 96/96
test_command: npm test
test_exit_code: 0
test_output_hash: sha256:986f6798e5879c93ff73afc844d7a51c5c2886d8de322c5429164e408fa97124
build_command: npm run build
build_exit_code: 0
build_output_hash: sha256:5012ae727d238b6f1b78e98bc196a92e8f47a54ca3483061edaaba1759b75c42
```

## Verification Report

**Change**: snake-drag-and-art-corridor
**Branch**: sdd/viboras-en-la-arena, HEAD `8462ce8`
**Version**: N/A (single-shot SDD change, not a versioned spec revision)
**Mode**: Standard (no Strict TDD marker found)

### Completeness

| Metric | Value |
|--------|-------|
| Tasks total | 64 |
| Tasks complete (`[x]`) | 64 |
| Tasks incomplete / `[~]` | 0 |

### Build & Tests Execution

**Build**: PASSED (`tsc --noEmit && vite build`)
```text
$ npm run build
> tsc --noEmit && vite build
✓ 522 modules transformed.
✓ built in 416ms
exit 0
```

**Tests**: PASSED — 72 test files / 1555 tests, 0 failed, 0 skipped
```text
$ npm test
 Test Files  72 passed (72)
      Tests  1555 passed (1555)
exit 0
```

Independently re-run twice by this verify pass (not taken on the apply agent's word). Baseline recorded in `tasks.md`/`apply-progress.md` was 69 files / 1436 tests; the reported delta (72/1555, +3 files / +119 tests) is consistent with the three new test files named in the tasks (`artCorridor.test.ts`, `arrange.test.ts`, `ArtCorridorLayer.test.tsx`) plus expanded assertions inside existing files (`catalog.test.ts`, `corridorTrack.test.ts`, `backdrops.test.ts`, `devMode.test.ts`, `TraceCanvas.test.tsx`, `LevelPlay.test.tsx`, `buildLevel.test.ts`, `artManifest.test.ts`).

**Coverage**: not tracked by this repo's `npm test` config — not available.

### 1. Every requirement in the six delta specs is implemented

Verified by direct source inspection, not prose. All 35 requirements / 96 scenarios across the six delta specs are backed by shipped code and a passing test.

| Spec / Requirement | File : Symbol | Status |
|---|---|---|
| art-corridor: fitted centreline, closed-form | `scripts/art/build_art.py:590` `sample_spine()` | ✅ COMPLIANT |
| art-corridor: `spineWave` M/C-only, 3-gen proof | `client/src/levels/paths.ts:882` `spineWave()`; `paths.test.ts` | ✅ COMPLIANT |
| art-corridor: manifest fields per snake | `manifest.json` (rebuilt); `detective/artManifest.test.ts` | ✅ COMPLIANT |
| art-corridor: one shared placement function | `client/src/levels/artCorridor.ts:138` `placeArtCorridor()` — the ONLY caller in renderer/engine/test | ✅ COMPLIANT |
| art-corridor: coincidence within 0.5 units | `levels/artCorridor.test.ts`; `levels/catalog.test.ts` R6 | ✅ COMPLIANT |
| art-corridor: no alpha sampling | grep confirms no `getImageData`/`<canvas>` in diff | ✅ COMPLIANT |
| art-corridor: C1–C6 constraint set | `levels/catalog.test.ts` (new `describe`) | ✅ COMPLIANT |
| art-corridor: render contract, no fragment ref | `canvas/ArtCorridorLayer.tsx` (read in full — clean) | ✅ COMPLIANT |
| level-engine: `arrange?` field, additive | `levels/types.ts`; absent on all pre-existing levels | ✅ COMPLIANT |
| level-engine: `artCorridor?`/`routes`/`tx` derivation | `levels/buildLevel.ts:182-241` — `routes[0]` literally `{polyline, length}` by reference | ✅ COMPLIANT |
| level-engine: span guard via union of 3 centrelines | `levels/catalog.test.ts` (guard tests byte-identical, confirmed via diff) | ✅ COMPLIANT |
| level-engine: `multiCorridorTick` covers all routes | `screen/corridorTrack.ts:168`; `LevelPlay.tsx:1051` actual call site confirmed | ✅ COMPLIANT |
| level-engine: fixed catalog position, tolerance clamp note | `levels/catalog.ts` (snake1..4 between night4/f2-guirnalda, confirmed via diff) | ✅ COMPLIANT |
| level-engine: arc length non-decreasing per orientation group | `levels/catalog.test.ts` R7 | ✅ COMPLIANT |
| level-engine: docs §6/§14 checklist coverage | `levels/catalog.ts` snake1..4 configs (read in full) | ✅ COMPLIANT |
| level-engine: byte-identical pre-existing files/no migration | `git diff main...HEAD` — zero diff on all 9 named files, `corridorTick` body unedited | ✅ COMPLIANT |
| guided-trace-mode: completion handoff sequencing | `screen/LevelPlay.tsx` `arrangeOpen`/`onFrame`/`onRelease` gating (read in full) | ✅ COMPLIANT |
| trace-canvas: art corridor layer render contract | `canvas/TraceCanvas.tsx` (artCorridor prop wiring); `ArtCorridorLayer.test.tsx` | ✅ COMPLIANT |
| trace-canvas: `inkHidden` suppresses ink only | `canvas/TraceCanvas.tsx:628,703,1200-1380` | ✅ COMPLIANT |
| trace-canvas: `SAND_HOLLOW` channel | `zoo/backdrops.ts:103,179` | ✅ COMPLIANT |
| trace-canvas: corridor-art luma law L1-L4/R1-R4 | `zoo/backdrops.test.ts:123-168` | ✅ COMPLIANT |
| trace-canvas: registry-completeness guard | `zoo/backdrops.test.ts:67-84` — includes a sensitivity proof (hypothetical ungrouped row fails) | ✅ COMPLIANT |
| zoo-map: sector-to-adventure mapping, arena unlock | `zoo/sectors.ts:395-409` | ✅ COMPLIANT |
| zoo-map: backpack registry, `carrito` | `zoo/backpack.ts` | ✅ COMPLIANT |
| zoo-map: `ZooAnimalId`/`vibora` | `detective/assets.ts`; `zoo/sectors.ts:404` | ✅ COMPLIANT |
| zoo-map: no `closingBeat` | `zoo/adventures.ts` (snake row); `adventures.test.ts` | ✅ COMPLIANT |
| object-arrange: rides shipped hook, no `useDragInput` | `useTraceInput.ts` confirmed byte-identical via diff; no new hook found | ✅ COMPLIANT |
| object-arrange: sequencing gate, not second score | `screen/LevelPlay.tsx:778,789,1016,1151` | ✅ COMPLIANT |
| object-arrange: pure fold, same-reference no-op | `levels/arrange.ts` (read in full) | ✅ COMPLIANT |
| object-arrange: `grabPiece` topmost-first | `levels/arrange.ts:80-91` | ✅ COMPLIANT |
| object-arrange: `isArranged` iff every `placed[i]===i` | `levels/arrange.ts:154-156` | ✅ COMPLIANT |
| object-arrange: drop-outside-radius/occupied-slot returns to scatter | `levels/arrange.ts:129-148` | ✅ COMPLIANT |
| object-arrange: every decision an exported pure function | `levels/arrange.ts` (all 8 exports, no DOM) | ✅ COMPLIANT |
| object-arrange: `debugArrange`/`?debug=ordenadas:<k>` ungated | `levels/arrange.ts:161-169`; `canvas/devMode.ts` | ✅ COMPLIANT |
| object-arrange: no fragment reference | `canvas/ArtCorridorLayer.tsx` (shared render path) | ✅ COMPLIANT |

**Result: CONFIRMED.** No requirement found satisfied only in prose; every one traces to a named symbol and a passing test.

### 2. docs/13 §8 row E scope met, not exceeded

**Result: CONFIRMED.** `git diff main...HEAD` (49 files) contains no new bee (`abeja`/row F), dolphin (`delfin`/row G), or hedgehog (`erizo`/row H) implementation. The only occurrences of those tokens in the diff are: (a) pre-existing, unchanged context lines in `docs/13_AVENTURAS_POR_ANIMAL.md` shown by the diff viewer around an edited line, (b) design.md's own explicit scope-fence prose ("erizo art stays unwired... paso H's"), and (c) two `SINGLES` rows (`abeja.png`, `flor.png`) in `build_art.py` confirmed via targeted diff to be **unchanged context**, not additions — they predate this change. The two named mechanics (dragging objects into place; the drawn art itself as the corridor) are exactly what shipped, with no third mechanic introduced.

### 3. §5 adventure structure and §6 nine obligations, per snake1..4

**Result: CONFIRMED.** §5's seven-item structure (entrada narrativa, demo when new, first wide challenge, variations, immediate response, cierre, registro) is answered: `AdventureIntro` on `snake1` entry (`zoo/adventures.ts` snake row, `design.md` §7.2), `demo: true` only on `snake1` (playing all three sub-paths in seriation order per A5), `snake1` as the accessible first challenge (no `arrange` — single demand only), `snake2..4` as variations raising the bar (`arrange` present, `corridorWidth` narrowing, `minAccuracy` rising), immediate tone/haptics/ink feedback (shipped, extended via `multiCorridorTick` to all three sub-paths), the map-bubble closing (no `closingBeat`, `mapBubble`'s `animal !== undefined` filter), and star/backpack registration (`earnedItems`).

§6's nine obligations table (`design.md` §6.3) answers each named item verified against code: zona de inicio (octopus placement, unconditional on backdrop levels, `LevelPlay.tsx:1376`), trayectoria esperada (the fitted centreline itself), tolerancia del camino (`corridorWidth`/`minAccuracy` ladder), respuesta visual al contacto (shipped tone/ink mechanism, now correct on all 3 sub-paths via A2), condiciones de error (`resetOnContact: false` on all four, confirmed in `catalog.ts`), posibilidad de reinicio (existing retry path + deterministic re-scatter), animación de ayuda (`demo` on `snake1`), criterio de finalización (sequencing gate, confirmed in `LevelPlay.tsx`), transición narrativa (intro + map bubble, no closing screen).

### 4. §2 pedagogical progression for víboras

**Result: CONFIRMED WITH ONE DISCLOSED GAP (see WARNING W1).** Seriation-then-tracing is faithfully implemented: `arrange` (drag pieces smallest-to-largest into their own hollows) gates `evaluateLevel` entirely via `isArranged`/sequencing (confirmed in `LevelPlay.tsx`), so a child cannot trace before ordering. The internal four-step progression docs/13 §2 names (*acostadas y de ondulación simple → tamaños diferentes → orientación vertical u oblicua → mayor variación de la ondulación*) walks as: `snake1` lying, single demonstrated wave, no arrange gate (simplest — accessible first challenge); `snake2` lying, arrange gate now active (the drag-to-hollow mechanic is where size comparison against the destination is actually exercised, per design.md §2.3's own disclosed rationale); `snake3` vertical orientation (rotated −90°, confirmed in `catalog.ts`/`snakeVerticalPieces()`); `snake4` narrowest corridor and highest accuracy bar. **The fourth step's literal claim — "mayor variación de la ondulación" (greater undulation variation) — is NOT implemented as a wave-shape change**: `snake4` uses the exact same `snakeHorizontalPieces()` call (identical `DRAWN_SPINE` halves, identical spans) as `snake1`/`snake2`; only `corridorWidth`/`minAccuracy` differ. `design.md` §3.4 discloses this candidly ("this is not what shipped... same spans, same at, same halves, same arc length") and reframes step 4 as being carried by tolerance narrowing instead — but that reframing is the implementer's own interpretation, not something docs/13 §2 itself states. Flagged as W1 below.

### 5. docs/09 §4's 55-luma law restated for the art corridor + registry-completeness guard

**Result: CONFIRMED.** `zoo/backdrops.test.ts:123-168` asserts L1-L4 (all ≥55: 213, 98.7, 183.2, 68.9) and the four falsifiability rows R1-R4 (all <55: 14, 42.8 [reused, unedited], 6, 13), matching `design.md` §2's own table exactly. The registry-completeness guard (`backdrops.test.ts:67-84`) asserts `Object.keys(CHANNEL_BACKDROPS ∪ REVEAL_BACKDROPS ∪ ART_CORRIDOR_BACKDROPS) === Object.keys(ADVENTURE_BACKDROP)`, **and** carries its own sensitivity proof: a companion test adds a hypothetical row to `ADVENTURE_BACKDROP`'s key set with no matching group entry and asserts the guard's equality check would then fail — i.e. the guard is proven to actually catch an escaping row, not merely assert a tautology.

### 6. The A2 repair (`multiCorridorTick`) has a failing-without-the-fix regression test

**Result: CONFIRMED.** `screen/corridorTrack.test.ts:151-164`, `describe('the pre-existing defect A2 repairs (RED regression, written before multiCorridorTick existed)')`, calls **only** the untouched `corridorTick` (not `multiCorridorTick`) against a synthetic 3-route fixture and asserts a point sitting exactly on route 2's centreline reads as 200 units away when measured against route 0 alone — i.e. this test exercises the actual pre-existing defect shape and would fail once `multiCorridorTick` is what LevelPlay calls, unless the delegation is correct. `screen/LevelPlay.tsx:1051` is confirmed to call `multiCorridorTick(target.routes, …)`, not a direct `corridorTick(target.polyline, …)` call.

### 7. The coincidence proof covers the ROTATED case (adversarially verified)

**Result: CONFIRMED, with an independent adversarial check performed by this verify pass.** `client/src/canvas/ArtCorridorLayer.test.tsx:63-146` renders `snake3` (the vertical/rotated level) through the REAL `getLevel` → `buildLevelTarget` → `ArtCorridorLayer` pipeline, parses the rendered `<image>`'s own `x`/`y`/`width`/`height`/`transform` attributes directly out of the produced HTML string (never touching internal `box`/`rotate` props), applies an independently-computed rotation from those parsed numbers, and compares the result against `flattenPathD(target.paths[i])`.

This verify pass injected a real defect to test the assertion's sensitivity rather than trust the claim: `levels/artCorridor.ts`'s `placeArtCorridor` was temporarily patched to add `+80` to the rendered box's `x` (shifting only what is DRAWN, not the scored `d` path) and the test was re-run in isolation. **The test failed** (`piece 0: expected 111.98 to be less than 76.44`), confirming it is sensitive to exactly the class of defect (art drawn off its scored route) that shipped and slipped past 1553 green tests in round 1. The file was restored immediately afterward and the full suite was re-confirmed green (`git status --short` clean, `npm test` 72/1555 passing). This closes the gap `apply-progress.md`'s Phase 10 names: `catalog.test.ts`'s pre-existing R6 "coincidence" check only ever compared two internally-generated path strings and never touched what `ArtCorridorLayer` actually renders.

### 8. No forbidden SVG fragment references introduced

**Result: CONFIRMED.** `canvas/ArtCorridorLayer.tsx` was read in full: one `<g>`/`<image>` per piece, `transform="rotate(…)"` only when `piece.rotate` is truthy, no `<mask>`/`<pattern>`/`<clipPath>`/`<defs>`/`useId`/`url(#…)`. Grep of the new/changed files finds `url(#…)` only inside comments describing the ban and inside pre-existing `.not.toContain('url(#')` test guards — zero live usage. `TraceCanvas.test.tsx`'s six pre-existing `url(#)` guard tests are confirmed unedited by `git diff main...HEAD` and pass.

### 9. Levels that predate this change are byte-identical in behaviour

**Result: CONFIRMED.** `git diff main...HEAD` shows **zero** diff on `useTraceInput.ts`, `migrateEntrance.ts`, `cases.ts`, `Deduction.tsx`, `AdventureIntro.tsx`, `AdventureClosing.tsx`, `revealGrid.ts`, `coverage.ts`, `evaluateLevel.ts`. `corridorTrack.ts`'s diff shows `corridorTick`'s function body untouched (only new code appended after it). `catalog.ts`'s diff contains **zero removed lines** (`git diff --stat` and a targeted `-` count both confirm additions-only). The two specific phase-1 span-guard tests named in tasks.md ("puts no phase-1 route inside the writing band", "keeps every phase-1 route on the paper") show no diff and remain green. Six collateral test edits in `catalog.test.ts` (adjacency assumptions like "night1..4 sit between llama-peak4 and f2-guirnalda") were confirmed as legitimate, disclosed consequences of inserting four new catalog entries — not silent behavioural drift on any *pre-existing* level.

### 10. tasks.md: zero `[~]`, spot-checked truthfulness

**Result: CONFIRMED.** All 64 tasks are `[x]`; a `rg` scan of `tasks.md` (already read in full) shows no `[~]` marker anywhere. Eight tasks spot-checked directly against code, including two from the Phase 10 corrective round:

| Task | Claim | Verified against |
|---|---|---|
| 1.1 | `sample_spine` fitted per §1.1 | `scripts/art/build_art.py:590-750` |
| 2.3 | `placeArtCorridor` per §1.3 | `levels/artCorridor.ts:138` |
| 3.2/3.4 | `multiCorridorTick` swap in `LevelPlay` | `screen/LevelPlay.tsx:1051`, `corridorTrack.ts:168` |
| 4.5 | `TraceCanvas` gains `inkHidden` | `canvas/TraceCanvas.tsx:628,703,1200+` |
| 6.1 | `snake1..4` inserted after `night4` | `levels/catalog.ts` (read in full) + `git diff` |
| 7.6 | `arena.unlockedWhen`/animals wired | `zoo/sectors.ts:395-409` |
| 8.8 (Phase 10) | scatter fix now checks BOTH axes | `catalog.test.ts:1478` regression test (read in full) |
| 8.8 (Phase 10) | `at.y` quiet-band fix w/ disclosed C3/C4 trade-off | `catalog.test.ts:1504` regression test (read in full), values match `design.md` §3.6 exactly |

No `[~]` found; no spot-checked claim found false.

### 11. design.md `[to copy]` placeholders replaced with measured values matching code

**Result: CONFIRMED.** `rg '\[to copy\]' design.md` returns exactly one hit — the legend line defining what the tag *means* — no unfilled instance remains. Spot-checked `DRAWN_SPINE.snakeSmall` in `levels/artCorridor.ts`: `residual: 3.2717806204692295` matches design.md's recorded "3.27"; `thickness: 0.4897959183673469` × `h=98` = 48.0, matching the table's "48.0"; `corridorWidth` ladder in `catalog.ts` (38/34/30/28) matches design.md §3.4/§6.2's R1 exactly; `minAccuracy` (55/62/70/76) matches R2 exactly.

### 12. apply-progress.md honestly records the corrective round

**Result: CONFIRMED.** The document's own header states plainly: *"Neither was true"* regarding Phase 8's original "shipped clean" claim, and a full Phase 10 section documents what the coordinator's own read of the captures found, root-caused item by item, distinguishing real defects (scatter X-axis clipping, `at.y` quiet-band placement) from false alarms (the `?debug=espina` vs scatter-state confusion, the pre-existing HUD-icon "stray snake"). This is a genuine self-correcting record, not a hidden rewrite — Phase 9's numbers are explicitly marked superseded rather than silently edited away.

### Correctness (Static Evidence)

| Requirement area | Status | Notes |
|---|---|---|
| No `getImageData`/`<canvas>` in diff | ✅ Implemented | grep-confirmed clean |
| `corridorTick` byte-identical | ✅ Implemented | diff-confirmed |
| `useTraceInput.ts` byte-identical | ✅ Implemented | diff-confirmed |
| Registry-completeness guard sensitive | ✅ Implemented | negative-case test present |
| Rotated-case coincidence sensitive | ✅ Implemented | adversarially re-verified by this pass |

### Coherence (Design)

| Decision | Followed? | Notes |
|---|---|---|
| A1-A7 amendments | ✅ Yes | All seven traced to shipped code, not merely asserted |
| §2.3 SAND_HOLLOW as hollow, not exemption | ✅ Yes | Channel declared, luma law honoured with no special case |
| §3.6 C3/C4 vs. quiet-band trade-off | ✅ Yes, disclosed | Locked in by regression test, not left to drift |
| §3.4 "snake4 longest arc" aspiration | ⚠️ Not followed | Superseded in the doc itself; see W1 |

### Issues Found

**CRITICAL**: None.

**WARNING**:
- **W1 — docs/13 §2's fourth pedagogical step ("mayor variación de la ondulación") is not implemented as a wave-shape change.** `snake4`'s `artCorridor`/`paths` are geometrically identical to `snake1`/`snake2` (same `DRAWN_SPINE` halves, same spans, same arc length) — only `corridorWidth`/`minAccuracy` narrow. `design.md` §3.4 discloses this candidly but reframes step 4 as satisfied by tolerance narrowing, which is the implementer's own interpretation of docs/13 §2's text, not what that line literally says. Not spec-blocking (the delta specs were already reconciled to require only R7's non-decreasing arc length, satisfied by equality), but a real gap against the *governing pedagogical document* this change was scoped against. Recommend either a follow-up SDD change that varies undulation shape across the horizontal three, or an explicit docs/13 amendment (in the same style as its existing §4 "Enmendado" notes) recording that this family's step 4 is expressed as tolerance narrowing instead.
- **W2 — Two disclosed-but-real visual imperfections remain, both explicitly accepted trade-offs, not silently shipped.** (a) A thin dark `SAND_HOLLOW` sliver is still visible at the single tightest wave trough (C1 margin ~1-5 units there); (b) the large snake's box still overlaps `fondo arena.png`'s rock band by ~74.6 of its own 144.4 units (reduced from ~99, not eliminated) because full quiet-band containment is arithmetically incompatible with the pre-existing C3/C4 minimum-separation constraint. Both are named, measured, and regression-tested in `catalog.test.ts` — not blockers, but worth a human's eyes on the next art pass.

**SUGGESTION**:
- **S1 (follow-up, out of scope)** — The map's pre-existing `cv-zoo-hud-mid` "every recovered animal gets a small icon here" row (top-centre of the whole stage) now also shows the víbora, which reads as "a snake floating in the sky" to a reviewer unfamiliar with that mechanic. Confirmed by this change's own investigation to be a pre-existing, unrelated mechanic (duck/sheep/llama already trigger it identically), not a defect this change introduced or should fix — but it may be worth a short doc note in `docs/12` (the map spec) for future reviewers, since two different SDD rounds independently mistook it for a bug.
- **S2 (follow-up, out of scope)** — `docs/13` §2's four-step internal progression (lying+simple → different sizes → vertical/oblique → greater undulation) is not literally restated anywhere in the delta specs as a per-level mapping; this verify pass's own mapping of steps 1/2 to `snake1`/`snake2` (§4 above) is an inference from design.md's prose and the arrange-gate's introduction point, not something either the specs or `catalog.ts`'s comments state explicitly. Not a defect, but a future reader benefits from an explicit comment in `catalog.ts` naming which step each level answers, the way `design.md` §3.4 already does for step 3/4.

### Verdict

**PASS WITH WARNINGS** — All 64 tasks complete and truthful (including a Phase 10 corrective round honestly recorded rather than hidden); all 35 requirements / 96 scenarios across the six delta specs implemented and test-backed; full suite 72/1555 green and build green, both independently re-run by this verify pass; docs/13 §8 row E's scope honoured with no leakage from rows F/G/H; the A2 wall-check repair and the rotated-orientation coincidence proof were both independently, adversarially re-verified (real bugs injected, confirmed caught, files restored, tree left clean). One disclosed pedagogical gap (W1: docs/13 §2 step 4's undulation-variation claim is not actually implemented) and two disclosed visual trade-offs (W2) keep this from an unqualified PASS, but none of the three rises to CRITICAL: all three are already measured, named, and regression-tested rather than hidden.
