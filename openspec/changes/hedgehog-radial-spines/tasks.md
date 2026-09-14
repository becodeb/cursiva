# Tasks: The hedgehog in the night sector — loose radial strokes

Binding inputs: `design.md` (754 lines, §1-§13) — read §10 (measured silhouette
tables) and §11 (testing strategy) FIRST; the tables are TRANSCRIBED, never
re-derived. `specs/{radial-spines,level-engine,trace-canvas,zoo-map}/spec.md`.
`proposal.md` for scope only. Prior art matched for depth:
`archive/2026-09-14-bee-free-trail-and-waypoints/tasks.md` (paso F) and
`archive/2026-09-14-dolphin-zigzag-scrolling-screen/tasks.md` (paso G).

**§9's five open questions stay OPEN. Do not resolve any of them during
apply** — this repo's convention from pasos D, E, F: when a measured law
corners an art-direction call, leave the literal intact and name the author
as decider. Phase 12.3 re-confirms all five are still open at the gate.

**A known baseline flake, stated up front so it is not misread.** Four
baseline runs of the current tree returned `1 failed / 1729 passed` once and
fully green three times; the failing test was never captured. A single red
during Phase 13's gate is RE-RUN before it is attributed to this change.

---

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~2,300–2,700 (honest estimate; no cap applies) |
| 400-line budget risk | High |
| Chained PRs recommended | No |
| Suggested split | Single PR, branch `sdd/erizo-espinas-radiales`, fourteen phases as internal commit slices |
| Delivery strategy | exception-ok |
| Chain strategy | size-exception |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: High

`delivery_strategy: exception-ok` was cached with no line budget; the
maintainer explicitly said "sin limite" and has already accepted
`size:exception`, matching four prior steps in this directive (C, D, E, F,
G). This ships as **one PR** on branch `sdd/erizo-espinas-radiales`, with
the fourteen phases below as individually revertible commit slices per
`work-unit-commits`.

### Suggested Work Units

| Unit | Goal | Focused test command | Runtime harness | Rollback boundary |
|---|---|---|---|---|
| 1 Measurement | Transcribe §10's tables into `HEDGEHOG_SILHOUETTE` | `npm test -- detective/assets detective/artManifest detective/artHierarchy` | N/A — pure literal transcription, no render | Revert the two transcribed `radii` arrays and their ray-for-ray guard |
| 2 Pure fold | `levels/spines.ts` — types, geometry, five measures, score, live/settled split, render projections, debug seed | `npm test -- levels/spines` | N/A — node, no jsdom; the module is DOM-free by design | Delete `spines.ts`(+test); nothing else references it yet |
| 3 Engine repairs | `levelStart`'s third source; the demo split (`target.paths`→`demoPaths`, `playDemo`→`demoPlays`); `evaluateLevel`'s ternary | `npm test -- levels/buildLevel game/evaluateLevel` | N/A — no level authors `spines` yet | Revert the third `levelStart` source, the `demoPaths`/`demoPlays` rename, the ternary |
| 4 Render layer | `SpineLayer.tsx`; `TraceCanvas`'s `spines` prop and slot | `npm test -- canvas/SpineLayer canvas/TraceCanvas` | N/A — exercised through a fixture prop | Delete `SpineLayer.tsx`; drop the prop and slot |
| 5 Debug flag | `spineDebugCount` in `devMode.ts` | `npm test -- canvas/devMode` | N/A — pure parser | Drop `spineDebugCount`; the seven shipped parsers are untouched |
| 6 LevelPlay wiring | The eight sites in design §6: init, demo source/gate, refs, live fold, recount, both resets, render prop | `npm test -- screen/LevelPlay` | N/A — unreachable from any real level until Unit 7 | Revert the eight sites; `level.spines` stays undefined everywhere |
| 7 Four levels | `hedgehog1..4` in `catalog.ts`, appended at the END of the phase-1 block; every named `catalog.test.ts` guard | `npm test -- levels/catalog` | N/A — unreachable from the map until Unit 8 | Remove the four rows and their guard edits |
| 8 Zoo + ink law | `adventures.ts`/`sectors.ts`/`backdrops.ts` rows; the ink-law and undrawability assertions | `npm test -- zoo/ detective/assets` | N/A — the backdrop resolves for the first time here | Drop the four registry rows; `nocturna` reverts to four ids |
| 9 Six RED confirmations | Break each of design §11.1's six guards on purpose, record red, restore | `npm test` (full, before and after each break) | **Real scenario**: this IS the runtime proof this repo's node/no-jsdom harness otherwise cannot give — a break-and-restore cycle, not a fixture | N/A — net diff is zero; each break is reverted inside the same commit |
| 10 isUnlocked + orphan sweep | Re-grep `isUnlocked`; grep every new export for a real caller; confirm §9 stays open | `rg` only, no test command | N/A — grep-based verification | N/A — no code change unless an orphan is found, which becomes its own fix |
| 11 Capture | `capturas/pasoH/`, two per level, human read-back | `scripts/shot.sh` against `http://localhost:5173` | **Real scenario**: the unfilled-mark 0.8-margin bet and the demo's plausibility cannot be settled by the unit suite | Delete `capturas/pasoH/*`; any 13.9 fix rolls back with its own regression test |
| 12 Gate | Full suite + build | `npm test && npm run build` | N/A | N/A |
| 13 Docs | `docs/13` §4 amendment 10, Spanish | N/A | N/A | Revert the docs edit only |

---

## Phase 1: Measured Silhouette Tables — Transcribe, Not Derive

Spec traceability: `radial-spines/spec.md` "Anchors Are Derived From a
Build-Time-Measured Silhouette, Never Hand-Authored Coordinates". Design
§10's tables were already measured at 0.25 px/ray; this phase hand-copies
them, it does not re-derive them.

- [x] 1.1 In `client/src/detective/assets.ts:357-360`: transcribe design
      §10's `hedgehog-profile.png` table (24 rays, centroid (0.5416,
      0.5107)) VERBATIM into `HEDGEHOG_SILHOUETTE.profile` (`radii` as the
      `r/W` column, not `r_px`).
- [x] 1.2 Transcribe the `hedgehog-curled.png` table (centroid (0.5002,
      0.5029)) into `HEDGEHOG_SILHOUETTE.curled`.
- [x] 1.3 [TEST] Assert both `radii` arrays have exactly 24 entries, each
      centroid lies inside `(0,1)²`, and every value equals §10's table ray
      for ray (floating tolerance) — the guard against a future silent
      retune (design §11.2's `HEDGEHOG_SILHOUETTE` checklist item).
- [x] 1.4 [TEST] Re-run `artManifest.test.ts:109,175` and
      `artHierarchy.test.ts:286-287` — confirm both poses are ALREADY
      covered; verify only, no rebuild, no edit expected (design §13: "no
      `build_art.py` re-run").
- [x] 1.5 Run `npm test -- detective/assets detective/artManifest
      detective/artHierarchy` — green.

## Phase 2: The Pure Fold Module I — Types and Derived Geometry

Spec traceability: `radial-spines/spec.md` "SpineConfig Shape...", "Anchors
Are Derived...".

- [x] 2.1 Create `client/src/levels/spines.ts`: export `HedgehogPose`,
      `SilhouetteProfile`, `SpineConfig`, `SpineRules`, `SpineAnchor`,
      `SpineState`, `EMPTY_SPINES`, `DEMO_SPINES`, `SPINE_MARK_R`,
      `BODY_STEP` per design §3.3 — pure, no React, no DOM.
- [x] 2.2 Implement `spineBody(cfg)`: call the shipped `placeArt` with the
      measured centroid as grip, per §3.4's box/scale arithmetic.
- [x] 2.3 Implement `spineAnchors(cfg)`: midpoint sampling (`deg_i`,
      linear-interpolated `r_i`, `A_i`, `n̂_i`) exactly per §3.4.
- [x] 2.4 Implement `spineOrigin(cfg) = A_0` — derived, never authored.
- [x] 2.5 [TEST] `levels/spines.test.ts`: `spineAnchors` called twice on the
      same config is deep-equal; exactly `cfg.count` anchors, evenly spaced
      across `cfg.arc`.
- [x] 2.6 [TEST] the anchor-spacing invariant shape: `2·baseRadius ≤ min
      neighbour chord` and `baseRadius ≥ TolTouch (26)`, written against a
      fixture now — the real per-level numbers land in Phase 9.
- [x] 2.7 Run `npm test -- levels/spines` — green.

## Phase 3: The Pure Fold Module II — The Five Measures, spineSettle, spineScore, spineAim

Spec traceability: `radial-spines/spec.md` measures 1-5, "All Five Measures
Must Hold Jointly", "spineScore Recomputes Purely...", "A Filled Anchor
Never Unfills...", "A Stroke That Fills No Anchor Is Not Punished". Design
§2 D1 (live/settled split).

- [x] 3.1 [TEST] measure 1 — nearest-unfilled anchor wins within
      `baseRadius`; outside every anchor's radius fills nothing; an
      already-filled anchor is never reassigned.
- [x] 3.2 [TEST] measure 2 — a stroke within `tolDeg` of the outward normal
      fills; aimed inward (toward centroid) fails on direction alone.
- [x] 3.3 [TEST] measure 3 — chord/arclength ≥ `straightness` fills; a
      wobbly stroke fails on straightness alone.
- [x] 3.4 [TEST] measure 4 — chord inside `[lenMin,lenMax]` fills; outside
      the band fails on length alone (CHORD, not arclength).
- [x] 3.5 [TEST] measure 5 — no sample inside `r(θ)` of the centroid beyond
      the anchor's own radius fills; a body-crossing stroke fails on the
      crossing rule alone.
- [x] 3.6 [TEST] joint measures — any four of five passing still fills
      nothing; all five passing fills the anchor (no partial credit).
- [x] 3.7 Implement `spineSettle(prev, strokes, cfg)`: greedy
      nearest-unfilled assignment in settlement order, all five measures
      per §3.4's table; monotone.
- [x] 3.8 [TEST] monotonicity — appending a stroke never shrinks `filled`;
      `spineScore` over the full stroke list reproduces the live fold's own
      final result; unaffected by what the live buffer held mid-drawing.
- [x] 3.9 Implement `spineScore(strokes, cfg) = round(100·filled.size /
      anchors.length)`, purely from settled strokes.
- [x] 3.10 Implement `spineAim(prev, points, drawing, cfg)`: live `aiming`
      only, never scoreable; same reference when nothing flips.
- [x] 3.11 [TEST] no-op reference contract — `spineAim` returns the SAME
      reference when nothing latches.
- [x] 3.12 [TEST] a rejected stroke leaves the sheet unreset, no hazard, and
      does not lower the score below what filled anchors already earned.
- [x] 3.13 Run `npm test -- levels/spines` — green.

## Phase 4: The Pure Fold Module III — Render Projections, Demo Segments, Debug Seed

Spec traceability: `radial-spines/spec.md` "The Debug Flag Reaches the
Screen's Rendered Output...". Design §2 D4, §7.

- [x] 4.1 Implement `spineMarks(cfg,state)`: mark centre = `A_i +
      SPINE_MARK_R·n̂_i` (D4's tangency resolution); filled/unfilled from
      `state.filled`.
- [x] 4.2 Implement `spineRings(cfg)`: one debug ring per anchor at
      `baseRadius`.
- [x] 4.3 Implement `spineDemoPaths(cfg,k)`: first `k` anchor→tip line
      segments (the demo repair's own source, D3).
- [x] 4.4 Implement `debugSpines(cfg,k)` and `seedSpines(cfg,
      debugCount)`: ONE number drives both the filled-seed and the ring
      overlay, so a capture cannot tell two stories (§7).
- [x] 4.5 [TEST] `spineMarks`' centre formula equals `A_i +
      SPINE_MARK_R·n̂_i` exactly, both mark states.
- [x] 4.6 [TEST] `debugSpines(cfg,k)` seeds exactly the first `k` anchors
      (by generator order) filled, the rest unfilled.
- [x] 4.7 [TEST] every export runs with no DOM — no jsdom, no
      testing-library, no component render.
- [x] 4.8 Run `npm test -- levels/spines` — green (full module).

## Phase 5: Engine Repairs — levelStart, the Demo Split (D3), evaluateLevel

Spec traceability: `level-engine/spec.md` "Optional spines Field...",
"levelStart Learns spines.origin...", "Routeless Demo Segments...". Design
§4, §2 D3.

- [x] 5.1 Implement `levelStart`'s third source (`buildLevel.ts:66-69`): `if
      (config.spines) return spineOrigin(config.spines)`, after the
      waypoints source. Byte-identical for every level with neither field.
- [x] 5.2 [TEST] a spines level's start resolves to `spineOrigin(cfg)`;
      levels using the other two sources are unaffected.
- [x] 5.3 Add `demoPaths: readonly string[]` to `LevelTarget`. In the
      free/empty return, `demoPaths: config.spines ? spineDemoPaths(...) :
      noPaths` (SAME reference `noPaths`); in the routed return, `demoPaths:
      paths`.
- [x] 5.4 [RED, confirmed red against `main` today] write the assertion that
      a `kind:'free'`, `demo:true`, `spines`-bearing level emits
      `demoPaths.length ≥ 1`. Confirm it fails BEFORE 5.3 lands.
- [x] 5.5 Rename `playDemo` → `demoPlays(level, guide) = !!level.demo &&
      guide === 'full'`; call it at `LevelPlay.tsx:820`.
- [x] 5.6 [RED, confirmed red against `main` today — the second, unnamed
      blocker] write the assertion that `demoPlays(level,'none') === true`
      for the same fixture (since `showGuide:false` forces `guideLevel:
      'none'` on every free level, `catalog.test.ts:329-335`). Confirm it
      fails BEFORE 5.5 lands, then confirm GREEN after.
- [x] 5.7 [TEST] the whole-catalog invariant (§2 D3): for every `l` in
      `LEVELS`/`LEGACY_PHASE_1` WITHOUT `spines`, `buildLevelTarget(l).
      demoPaths === buildLevelTarget(l).paths` by REFERENCE; `demoPlays(l,g)
      === (!!l.demo && g==='full')` for every `l` and every `GuideLevel`.
- [x] 5.8 In `evaluateLevel.ts`'s free branch (`:120-128`): add the
      `config.spines ? spineScore(...) : config.waypoints ?
      waypointScore(...) : revealScore(...)` ternary.
- [x] 5.9 [TEST] a pre-existing `kind:'free'` level scores byte-identically
      before/after this change; a hedgehog fixture's accuracy equals
      `spineScore`'s result; `LevelKind` stays two-valued.
- [x] 5.10 Run `npm test -- levels/buildLevel game/evaluateLevel` — green.

## Phase 6: The Render Layer — SpineLayer and TraceCanvas

Spec traceability: `trace-canvas/spec.md` "Spine Layer Renders as Plain
Images...". Design §5.

- [x] 6.1 Create `client/src/canvas/SpineLayer.tsx`, modelled on
      `WaypointLayer.tsx` (51 lines): one `<g pointerEvents="none">`, one
      `<image>` for the body (through `clampArtBox`), one `<circle>` per
      mark, then debug rings. No `<mask>`, `<pattern>`, `<clipPath>`,
      `<defs>`, `useId`, `url(#…)`.
- [x] 6.2 In `TraceCanvas.tsx`: add `TraceSpineMark`/`TraceSpines` types
      (design §5) and a `spines?` prop; render `<SpineLayer>` in the
      reveal/waypoints slot (`:1161-1170`), between the backdrop and every
      ink layer.
- [x] 6.3 [TEST] `SpineLayer.test.tsx`: `renderToString`, parse `<image>`/
      `<circle>` from the HTML STRING, assert no `url(#`, no `<mask`, no
      `<defs`.
- [x] 6.4 [TEST] `TraceCanvas.test.tsx`: with `spines` set, the layer sits
      after the backdrop and before the ink; without it, no spine-layer
      element renders and markup is byte-identical to today.
- [x] 6.5 Run `npm test -- canvas/SpineLayer canvas/TraceCanvas` — green.

## Phase 7: The Debug Flag — devMode.ts

Spec traceability: `radial-spines/spec.md` "The Debug Flag Reaches the
Screen...". Design §7.

- [x] 7.1 [RED] `devMode.test.ts`: `spineDebugCount('?debug=espinas:3')`
      returns `3`; malformed/missing returns `null`. Confirm RED (function
      does not exist).
- [x] 7.2 Implement `spineDebugCount(search)`, appended after
      `arrangeDebugCount` (`:149-155`), body verbatim per §7 — ungated, no
      `isDevMode()` check.
- [x] 7.3 [TEST] no collision with the shipped `?debug=espina` (exact-value
      compare in `isSpineDebug`); the shipped parsers stay byte-identical.
- [x] 7.4 Run `npm test -- canvas/devMode` — green.

## Phase 8: LevelPlay Wiring

Spec traceability: `radial-spines/spec.md` "Reset Reseeds Through
seedSpines...". Design §6 (the wiring table) and its "found defect".

- [x] 8.1 Initialiser (`:307-313` sibling): `seedSpines(cfg,
      spineDebugCount(search))`; `EMPTY_SPINES` when no `spines` field.
- [x] 8.2 Demo source (`:791-801`): `target.demoPaths.map(...)`; `demoMs`
      reads `target.demoPaths.length`.
- [x] 8.3 Demo gate (`:820`): `const playDemo = demoPlays(level,
      guideLevel)`.
- [x] 8.4 Refs (`:923-930` sibling): add `spineRef`, `spineState`,
      `spinePin` — the flag REPLACES live input (`!debugLightPoint`'s
      shipped contract).
- [x] 8.5 Live fold (`:1177` sibling): `if (level.spines && !spinePin)` →
      `spineAim`, ref first then `setSpineState`, no haptics here.
- [x] 8.6 Recount (`:1318-1346`): `if (level.spines && !spinePin)` →
      `spineSettle(spineRef.current, snapshot, level.spines)`; a grown
      `filled` fires the shipped one-shot haptic edge, at RELEASE only (§2
      D1).
- [x] 8.7 Reset A (`resetSurface`, `:942-981`): through `initialSpineState`,
      NEVER bare `EMPTY_SPINES`; add `level.spines` to the dep array.
- [x] 8.8 Reset B (`restartRun`, `:1095-1139`): the same two lines again —
      does NOT call `resetSurface`.
- [x] 8.9 Render prop (`:1557` sibling, `:1809`): `spines` memo from
      `spineBody`/`spineMarks`/`spineRings`; `dim: TORCH_CHALK_DIM`,
      `earned: TORCH_CHALK`.
- [x] 8.10 [RED, confirmed red] source-read count: `initialSpineState(`
      appears at exactly 3 call sites. Write the guard, then delete the
      `restartRun` call, confirm the count falls 3→2, then RESTORE it.
- [x] 8.11 [TEST] `LevelPlay.test.tsx` `traceCanvasProbe`: the debug flag
      reaches `TraceCanvas`'s `spines` prop, not only `debugSpines`'s
      return value.
- [x] 8.12 Record, do not fix: `restartRun:1118-1119` resets the waypoint
      fold with bare `EMPTY_WAYPOINTS` — a real, latent, unreachable-today
      bug (§9 item 5). Add a comment naming it; no repair here.
- [x] 8.13 Run `npm test -- screen/LevelPlay` — green.

## Phase 9: The Four Levels and Catalog Guards

Spec traceability: `level-engine/spec.md` "Four Hedgehog Levels Occupy Fixed
Catalog Positions", "Tolerance and Length-Band Progression...", "minAccuracy
Rises 70→80→90→100...", "catalog.test.ts's Existing Guards Recognize...".
Design §8, §11.2.

- [ ] 9.1 In `catalog.ts`: insert `hedgehog1..4` per §8's table. Placement:
      appended at the END of the PHASE-1 BLOCK, after `dolphin4` and before
      `f2-guirnalda` — NOT at the end of `LEVELS` (`catalog.test.ts:121-127`
      requires ascending phases). Titles/hints copied VERBATIM (Spanish):
      *Las primeras espinas* / "Dibujá palitos largos desde el lomo hacia
      afuera."; *Más espinas* / "Salen más espinas. Empezá en cada marca y
      tirá para afuera."; *Espinas cortas* / "Espinas más cortas y más
      juntas: una en cada marca."; *El erizo enroscado* / "Se hizo una
      bola. Dibujá espinas chiquitas alrededor."
- [ ] 9.2 [TEST] the anchor-spacing invariant and per-level `baseRadius`
      ceiling (41.5/30.9/27.1/27.5) against the real levels, each clearing
      its literal by the recorded margin (3.5/2.9/1.1/1.5).
- [ ] 9.3 [TEST] no anchor on a foot or belly — every profile anchor's ray
      in `[200,380]`, identical arc on `hedgehog1..3`.
- [ ] 9.4 [TEST] the curled pose is round — `max/min − 1 ≤ 0.041` over its
      spine arc.
- [ ] 9.5 [TEST] the table is not an ellipse — the profile's radius at 90°
      is ≥20% below `0.5·H`.
- [ ] 9.6 [TEST] the ladder is checkable — `lenMin`/`lenMax` strictly
      decreasing, `tolDeg` strictly decreasing, `straightness` strictly
      increasing, `count` strictly increasing, `baseRadius` non-increasing
      and never under `TolTouch`; `minAccuracy` 70/80/90/100.
- [ ] 9.7 `catalog.test.ts:50-107` `EXPECTED_IDS` — four ids after
      `dolphin4`.
- [ ] 9.8 `catalog.test.ts:147-209` `CORRIDORS` and `:210-271` `FLUENCY` —
      four `0` rows each.
- [ ] 9.9 `catalog.test.ts:281-299` minAccuracy-by-phase — add `if
      (level.spines) continue`, joining `reveal`/`artCorridor`/`waypoints`.
- [ ] 9.10 `catalog.test.ts:329-335` `showGuide` — satisfied by
      `showGuide:false`; re-run, confirm green, NO edit.
- [ ] 9.11 `catalog.test.ts:357-377` the free-level census 17→**21**; the
      "no reveal and no waypoints" filter learns `spines`; `f1-libre`
      stays alone.
- [ ] 9.12 `catalog.test.ts:437-452` tone/haptics — `haptics` becomes
      `hasCorridor || reveal || waypoints || spines`.
- [ ] 9.13 `catalog.test.ts:593-612` phase-1 amplitude/on-paper guards — NO
      edit (`kind !== 'path'` skips); the hedgehog block asserts
      `hedgehog1`'s own numbers (span>300, minY<180, maxY>420, horizontal
      span>600) as its own assertion.
- [ ] 9.14 `catalog.test.ts:750-783` `levelsByPhase(1)` and `:820-856` the
      phase-1 detective list — both gain the four ids.
- [ ] 9.15 Run `npm test -- levels/catalog` — green.

## Phase 10: Zoo Registries and the Ink Law

Spec traceability: `zoo-map/spec.md` (all five ADDED requirements);
`trace-canvas/spec.md` "The Hedgehog Row Inherits TORCH_CHALK...", "The Body
Interior Is Undrawable...". Design §8.2, §2 D1(a)/(b)/D4.

- [ ] 10.1 `zoo/adventures.ts:24-33`: `AdventureId | 'hedgehog'`. `:74-195`:
      one row APPENDED AT THE END (amendment 9) — `sector:'nocturna'`,
      `animal:'erizo'`, no `closingBeat`, intro "Al erizo le faltan las
      espinas. ¿Se las dibujamos?", closing "¡El erizo tiene todas sus
      espinas!" (§8.2 verbatim).
- [ ] 10.2 `zoo/sectors.ts:455-456`: `nocturna.animals` gains `{id:'erizo',
      dx:0, dy:0, size:90, appearsWhen:['hedgehog4']}` at the existing
      `animalSpot`; `nocturna.adventureIds` becomes eight (`night1..4,
      hedgehog1..4`); `unlockedWhen` UNCHANGED.
- [ ] 10.3 `zoo/backdrops.ts:105+`: `hedgehog` row — `art:
      SECTOR_BACKGROUND_ART.night`, night's `quiet`/`brightest`/
      `corridorRows` verbatim, `ink: TORCH_CHALK`, `inkDim:
      TORCH_CHALK_DIM`, no `tile`, no `channel`. `:223` sibling:
      `SPINE_BACKDROPS = {hedgehog}`.
- [ ] 10.4 `detective/assets.ts:55`: `ZooAnimalId | 'erizo'`. `:340-353`:
      `ZOO_ANIMAL_ART.erizo = HEDGEHOG_ART.profile` — flag the art gap (§9
      item 2) in a comment, do NOT resolve it.
- [ ] 10.5 [TEST] `sectors.test.ts:244-249` — `nocturna.adventureIds`
      EXACTLY equals the eight ids in order; `arena.unlockedWhen` still
      `isFiled(records,'night4')`, unaffected.
- [ ] 10.6 [TEST] `backdrops.test.ts:92-111` — completeness guard picks up
      `SPINE_BACKDROPS`, asserting the substantive INK law (both mark
      states + `quiet`/`brightest`) rather than the vacuous `SHEET_PAPER`
      fallback (design §11.1 item 6).
- [ ] 10.7 [TEST] `TORCH_CHALK` clears `night.quiet`(67.1)/`brightest`(95.9)
      by ≥55; `INK_COLOR` fails the same gap (falsifiability).
- [ ] 10.8 [TEST] the undrawability — `TORCH_CHALK` FAILS the body's
      `brightest`(213.3) by 29.3 (<55); the floor is exact (a hypothetical
      `brightest ≤184.0` would pass).
- [ ] 10.9 [TEST] the unfilled/earned mark states clear `night.quiet`/
      `brightest` — unfilled clears `brightest` by only 0.8, recorded as a
      risk, not smoothed over (§2 D4).
- [ ] 10.10 [TEST] no new backpack item — `earnedItems(records)` unaffected
      by `hedgehog4` filed.
- [ ] 10.11 [TEST] filing `hedgehog4` flips `mapBubble('nocturna',…)` to
      the hedgehog's own closing line.
- [ ] 10.12 Run `npm test -- zoo/ detective/assets` — green.

## Phase 11: The Six RED Confirmations (design §11.1) — Break, Record, Restore

Each is broken on purpose against the FINISHED implementation (Phases
1-10), the red recorded, the break reverted. None of these introduce a net
diff.

- [ ] 11.1 Rendered-markup coincidence, all four levels/both poses: parse
      `<image>` from the HTML STRING (never the internal box), assert box
      == `spineBody(cfg).box`, every anchor lies on that box's silhouette,
      every mark centre == `A_i + SPINE_MARK_R·n̂_i`. **The break must be
      chosen carefully — moving `body.centre` alone is VACUOUS** (slides
      art and anchors together, stays green). Confirm RED via TWO separate
      breaks: (a) push `body.centre` off the sheet until `clampArtBox`
      clamps the `<image>` while anchors stay put; (b) add a constant
      offset inside `SpineLayer`'s own placement. Restore both.
- [ ] 11.2 The debug flag reaches the SCREEN: assert `probe.spines.marks`
      filled-count per `k` through `LevelPlay`. Break by temporarily
      unwiring 8.9's render prop; confirm RED; restore.
- [ ] 11.3 Reset coverage by source-read count — already executed at 8.10;
      confirm it is STILL restored, not left broken.
- [ ] 11.4 The ink law as undrawability — already executed at 10.8; confirm
      the assertion fails when `brightest` is temporarily lowered below
      184.0 IN THE TEST ONLY; restore.
- [ ] 11.5 The demo is not empty — already executed at 5.4/5.6 (BOTH halves
      confirmed red against `main` before 5.3/5.5 landed). Re-confirm both
      stay green now, and record that BOTH were red, not just the one the
      proposal named.
- [ ] 11.6 The backdrop group is substantive, not vacuous — already
      executed at 10.6; confirm removing `ink`/`inkDim` from the
      `hedgehog` row (temporarily, in the test) falls back to the vacuous
      `SHEET_PAPER` check; restore.
- [ ] 11.7 Run the full suite once more after every break is restored —
      `npm test` green, zero uncommitted breaks left in the tree.

## Phase 12: isUnlocked Re-grep, Orphan Sweep, Open-Questions Guard

Spec traceability: design §13, proposal Decision 6.

- [ ] 12.1 Re-grep `isUnlocked` (`LevelProgressStore.ts:123-129`) — state
      the ACTUAL result, do not assume it. Expected: the only non-test,
      non-migration consumer is the dev-only `LevelMap.tsx`; real
      navigation routes through `zoo/sectors.ts`'s `unlockedWhen` (D6).
- [ ] 12.2 For every new exported symbol (`spineBody`, `spineAnchors`,
      `spineOrigin`, `spineAim`, `spineSettle`, `spineScore`, `spineMarks`,
      `spineRings`, `spineDemoPaths`, `debugSpines`, `seedSpines`,
      `demoPlays`, `spineDebugCount`), `rg` it and confirm at least one
      real caller outside its own definition/test file. An orphan is a
      defect (§7's `debugCarrier` lesson), not done — fix by wiring it in.
- [ ] 12.3 Confirm the five §9 open questions stay OPEN, untouched by this
      apply: (1) luma-jump vs tone-gain earning colour; (2) the erizo
      standing spineless on the map; (3) a darkened-body escape for
      chalk-over-body; (4) no second backpack object; (5) `restartRun`'s
      bare `EMPTY_WAYPOINTS` bug (recorded at 8.12). None resolved
      silently.

## Phase 13: Final Gate and Captures (last, human-reviewed, not optional)

Non-negotiable per `docs/12` §4. Dev server: `npm run dev`, port 5173.
Output goes to `capturas/pasoH/`.

- [ ] 13.1 Run `npm test` (full suite) — baseline **76 files / 1730
      tests**. Report actual new totals. If a single test reports red,
      RE-RUN before attributing it to this change (see the flake note at
      the top of this file).
- [ ] 13.2 Run `npm run build` (`tsc --noEmit && vite build` — there is NO
      lint script; this IS the gate) — green.
- [ ] 13.3 Confirm zero new `url(#` occurrences beyond what pre-existed
      (`rg 'url\(#' client/src`).
- [ ] 13.4 Confirm every task in this file is closed (`[x]`), none left
      `[~]`.
- [ ] 13.5 Confirm the dev server answers at `http://localhost:5173` before
      capturing.
- [ ] 13.6 For each of `hedgehog1..4`, capture the pair TOGETHER into
      `capturas/pasoH/`: **control** (`?nivel=hedgehogN`) and
      **instrumented** (`?nivel=hedgehogN&debug=espinas:K`, `K` chosen per
      level's own anchor count) — reading one without the other makes
      correct art look detached (§13, paso E's lesson).
- [ ] 13.7 Capture the map before/after via `?debug=progreso:...` with and
      without `hedgehog1..4` filed.
- [ ] 13.8 Read every capture pair TOGETHER, not singly. Answer explicitly:
      does the unfilled mark read against `night.brightest` given its
      measured 0.8-unit margin; does the earned mark's luma jump read as a
      reward; does the body's night backdrop still read as a place; does
      the demo's first-k segments read as a plausible hint. Record the
      answers, not just the fact that captures were taken.
- [ ] 13.9 Correct and re-capture any defect found in 13.8, with a
      regression test added alongside the fix — not only a re-shot
      picture.

## Phase 14: docs/13 §4 Amendment 10 (Spanish)

- [ ] 14.1 Write, in Spanish (neutral register, matching amendments 5-9's
      style), **amendment 10** to `docs/13_AVENTURAS_POR_ANIMAL.md` §4,
      recording at minimum: the two-branch ink algebra and why the
      no-body-crossing rule is DERIVED rather than chosen; that the ellipse
      approximation failed on the profile pose (mean error 8.8%, max
      28.6%, concentrated at the concave belly between the feet); that the
      demo repair was blocked at the GATE (`playDemo`/`guideLevelFor`) as
      well as at the source (`target.paths`); and whatever Phases 1-13
      found that nobody anticipated (mirroring pasos C-G's own
      "found-during-apply" sections).
- [ ] 14.2 Flip `docs/13` §8's hedgehog status row from pending to shipped.

---

### Accepted deviation

This document exceeds the skill's 530-word cap, the same deviation
`design.md` and `specs/*/spec.md` (this change) and both prior-paso
`tasks.md` files each recorded under `delivery_strategy: exception-ok`. The
brief names hard requirements (six break-and-restore RED confirmations, the
full §11.2 guard checklist, the append-discipline distinction between the
catalog and the adventure registry, the isUnlocked re-grep, the open-
questions guard, the docs amendment) that do not fit a checklist under 530
words without deleting the traceability those requirements ask for.

## Commit Plan (`work-unit-commits`)

Fourteen work units mapped to the fourteen phases above, each a standalone
deliverable, tests included with the behavior they verify, conventional
commits, no `Co-Authored-By` or AI attribution trailers:

1. `feat(detective): transcribe measured hedgehog silhouette tables` —
   Phase 1.
2. `feat(levels): add pure spine fold types and derived anchor geometry` —
   Phase 2.
3. `feat(levels): implement the five spine measures, score and live/
   settled split` — Phase 3.
4. `feat(levels): add spine render projections, demo segments and debug
   seed` — Phase 4.
5. `feat(levels): repair levelStart's third source and the routeless demo
   split` — Phase 5.
6. `feat(canvas): render the spine layer between backdrop and ink` — Phase
   6.
7. `feat(canvas): add the ungated spine debug flag` — Phase 7.
8. `feat(screen): wire the spine fold into LevelPlay's frame, release and
   reset sites` — Phase 8.
9. `feat(levels): add hedgehog1..4 and extend the catalog guards` — Phase
   9.
10. `feat(zoo): register the hedgehog adventure, backdrop and recovered
    animal` — Phase 10.
11. `test(levels): confirm the six coincidence/reset/ink/demo guards red
    and restore` — Phase 11.
12. `chore: re-grep isUnlocked, sweep for orphan exports, confirm open
    questions untouched` — Phase 12.
13. `chore: confirm full suite and build green after paso H` — Phase 13.1-
    13.5 (no diff expected unless captures surface a fix, landing as its
    own `fix:` commit).
14. `docs(13): record paso H's ink algebra and demo-repair decisions` —
    Phase 13.6-13.9 (capture) and Phase 14 (amendment).
