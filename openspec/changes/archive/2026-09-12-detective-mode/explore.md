# Exploration — Detective mode (phase 1 retheme)

Written by the orchestrator from a codebase mapping pass, not by `sdd-explore`.
Every file:line below was read; nothing here is inferred.

## 1. The brief, as given

The user wants a four-level detective campaign. The player drags a magnifying
glass along a bounded trail. Touching the trail's border sends the glass back
to the start. Clue marks laid along the trail light up as the glass passes
them. At the end of a trail a lamp switches on and the clue earned there files
itself into a `PISTAS` rail on the right. With all four clues collected, the
player picks which of four animals left them.

| # | Clue mark | Trail shape | Given or chosen |
|---|-----------|-------------|-----------------|
| 1 | water droplets | sinusoidal | given |
| 2 | corn seeds | "another shape" | **shape open** |
| 3 | animal footprints | triangular wave | given |
| 4 | feathers | square wave | given |

Collected marks recover colour; footprints are the exception and go grey to
black, because a print in the dirt has no colour of its own.

Everything is placeholder art for now. The user will supply the real assets.
Only one word of copy exists in the whole mode: `PISTAS`.

## 2. What the existing engine already provides

Five of the brief's mechanics are already built and shipped.

| Brief mechanic | Where it already lives |
|---|---|
| bordered trail the finger must stay inside | `client/src/canvas/TraceCanvas.tsx:612-657` — fills the sheet with `MAZE_WALL` then strokes the corridor back over it in `SHEET_PAPER`. Deliberately not an SVG `<mask>`; the comment at `TraceCanvas.tsx:70-84` records that `url(#…)` plus `<base>` plus `useId()` hydrated blank on real devices. |
| touch the border, return to start | `client/src/canvas/resetOnContact.ts` (`RESET_CONTACT_TICKS = 2`, `contactTick` at `:51`) wired at `LevelPlay.tsx:610-623` into `restartRun()` (`:549`). The ink fade is `TraceCanvas.tsx:523-548`, `RESET_FADE_MS = 500`. Turned on by `resetOnContact: true` in the level config. |
| a sprite that follows the fingertip | `carrier: true` already draws a shape tracking the ink head every frame — `TraceCanvas.tsx:498-508`, rendered `:917-940`. |
| sinusoidal trail | `wave()` at `client/src/levels/paths.ts:327` and `crests()` at `:512`, both via the private `alternatingArches` helper (`:88`) which gives exact extrema and no overshoot. |
| marks placed evenly along the trail | `pointAtArcLength(points, target)` — `client/src/letters/svgLetter.ts:70`. Tangent for rotating a mark: `directionArrowOf` — `client/src/screen/directionArrow.ts:34`. |

Also free: the whole `LevelConfig` → `LevelTarget` derivation
(`client/src/levels/buildLevel.ts:154`), which produces the corridor, the
`ideal` point cloud, the arc-length checkpoints, the start/goal markers and the
`viewBoxWidth` from a declarative object; per-level persistence under
`cursiva.levels.v1`; adaptive corridor widening after repeated failures; and
the map → play → next flow behind the pure `nextView` reducer
(`client/src/screen/GameScreen.tsx:33`).

The wall hit test is worth knowing about because it is not geometric
containment. It is a nearest-point query against the `ideal` cloud —
`LevelPlay.tsx:596` compares `neighbourhoodNearest(...).distance` to
`corridorWidth / 2`, over a 3×3 bucket grid built at `LevelPlay.tsx:219-262`.
That grid is the only spatial index in the app and it is currently private to
`LevelPlay`.

## 3. What has to be built

1. **Two path generators** in `client/src/levels/paths.ts`: a triangular wave
   and a square wave. Both are cheap (`M` plus `L` runs). Two constraints:
   generators must emit `M`/`L`/`C` only or `transformPath` throws
   (`paths.ts:172-175`), and they must emit at least 3 flattened points.
2. **A square-wave corner constraint.** The corridor is a stroked path with
   `strokeLinejoin="round"`, so 90° corners render as rounded elbows, and if
   the corridor half-width approaches half the straight run the corners merge
   into each other and the trail stops reading as a square wave. The generator
   has to relate its run length to the level's `corridorWidth`. The same
   failure mode is already documented for `spiral` at `paths.ts:361`.
3. **A clue-collection state machine.** No pickup concept exists. Arc-length
   `checkpoints` are the closest analogue but they are scoring-only and are
   rendered solely by the dev overlay. Per the repo's own convention this
   belongs in a pure exported reducer, testable with no DOM.
4. **A clue layer on the canvas.** Two seams exist: a new prop rendered as its
   own `<g>` following the `hazards` precedent (`TraceCanvas.tsx:166-177` for
   the interface, `:895-916` for the render), or the existing `children` slot
   (`:239`, rendered `:942`) which `StarFeedback` already uses.
5. **The `PISTAS` rail and the filing animation.**
6. **The deduction screen** — four animals, the four collected clues shown
   large, one correct answer.
7. **An asset seam** so the user's real art drops in without touching logic.
8. **The first design tokens in the repo.** See §5.

## 4. Constraints discovered that shape the design

- **There is no theme layer.** Every colour in the app is an inline literal,
  mostly module-scoped consts at `TraceCanvas.tsx:59-196` plus a CSS string
  template at `LevelPlay.tsx:112-146`. Current values include
  `SHEET_PAPER '#fdfcf7'`, `MAZE_WALL '#e2e8f0'`, `CORRIDOR_FILL '#cbd5e1'`,
  `INK_COLOR '#1e293b'`, `GOAL_COLOR '#b45309'`, page background `#faf8f5`.
- **There is no font layer at all.** `fontFamily`, `font-family` and
  `@font-face` return zero hits across the repo; `client/index.html` links no
  font. Everything renders in the user-agent default.
- **`framer-motion` is used in exactly two places** — the demo `pathLength`
  animation at `TraceCanvas.tsx:747` and `screen/Bloom.tsx`. Everything else is
  deliberately library-free: the beat pulse is a CSS transition
  (`TraceCanvas.tsx:777-781`) and the reset fade carries a comment at `:856`
  saying it exists "so nothing depends on an animation library".
- **`perfect-freehand` is a declared dependency that is no longer used.**
  `client/src/canvas/ink.ts:31` is a plain centreline polyline; the comment at
  `ink.ts:5-9` explains the switch — a thick filled polygon self-intersects on
  a doubled-back stroke and the fill rule punches holes, whereas an open
  stroke has no interior. Two live specs still describe
  perfect-freehand ink (`openspec/specs/trace-canvas/spec.md` Purpose and
  `Requirement: Ink Rendering`). **Pre-existing spec drift, out of scope for
  this change, recorded here so it is not rediscovered as a regression.**
- **Tests use `renderToString`, not a DOM.** vitest 4 with the default `node`
  environment; no jsdom, no happy-dom, no `@testing-library`. Component
  assertions are made against the HTML string, and pointer behaviour is tested
  against hand-written stubs in `client/src/canvas/testUtils.ts`
  (`fakeSvgSurface`, `fakePointerEvent`). `testUtils.ts` also holds independent
  reference implementations of the geometry so results are checked against a
  second implementation rather than the module under test. This is precisely
  why `corridorTaper.ts` walks the `d` string instead of calling
  `getTotalLength()` (`corridorTaper.ts:12-16`).

## 5. Decisions taken before proposal

These are orchestrator calls, each with its reason. The proposal may overturn
any of them, but must say why.

1. **Detective mode replaces phase 1, it does not sit beside it.** Confirmed
   with the user. Phase 1 currently holds six corridor levels
   (`f1-travesia`, `f1-pelotas`, `f1-paseo`, `f1-pasillo`, `f1-ondas`,
   `f1-espiral`, `catalog.ts:187-356`) running the identical follow-the-corridor
   mechanic with no theme. `docs/05` already records that theming was deferred
   past the MVP. Four themed trails replace those six.
2. **`f1-libre` survives.** It is `kind: 'free'` (`catalog.ts:163`), a
   different mechanic — free drawing scored by coverage, not corridor
   following. It is also the app's only onboarding surface. It stays as the
   opening beat, rethemed: the child picks up the glass and looks around before
   there is any trail to follow.
3. **Trail 2 is a sawtooth.** The brief leaves its shape open. A sawtooth
   completes a motor-difficulty ramp by sharp corners per cycle: sine 0 →
   sawtooth 1 → triangular 2 → square 2 right angles. It is also visually
   distinct from the other three and from every phase-2 shape
   (`garland`/`hills`/`loops`/`crests`), which stay where they are.
4. **The animal is a hen.** Water, corn, three-toed bird prints and feathers
   identify it unambiguously. The three distractors each get ruled out by a
   different clue, which is the point of the exercise: a duck by the print
   (webbed, not three-toed), a pig and a cow by the feather.
5. **Colour is the reward, and it is the only colour in the scene.** Derived
   straight from the user's own mechanic — marks start drained and recover
   colour as the glass passes. So the world is ink on paper throughout and
   every trail owns exactly one colour that only appears once earned. The lamp
   is the single light source in the mode and its switch-on is the one
   orchestrated motion moment. This also keeps the mode inside the existing
   near-monochrome palette instead of introducing a competing one.
6. **`PISTAS` is drawn as SVG, not typeset.** It is the only word in the mode.
   Adding a font subsystem — self-hosting, preload, FOUT handling — for one
   word is disproportionate, and the repo has no font layer to extend. Hand
   drawn in block capitals also matches how children at this age are taught to
   write, and matches the user's own sketch.
7. **Assets go behind a typed registry**, one entry per clue kind and one per
   animal, so replacing placeholder art with the user's is a single-file edit.

## 6. Open questions for the proposal

1. Does replacing six levels with four cost too much motor practice before
   phase 2? Options: more clues per trail, or a second lap.
2. Should the `PISTAS` rail be visible during play (as in the user's sketch)
   or only between trails? Visible during play spends horizontal room that
   `viewBoxWidth` currently gives to the trail.
3. Does the deduction screen become a 5th level in the catalog, a terminal
   state of the 4th, or its own view in `GameView`?
4. `f1-libre` currently has no clue. Does the retheme give it one, or is it
   explicitly clue-free?

## Key Learnings

1. The cursiva level engine already implements corridor rendering, wall contact reset, and a fingertip-following sprite, so the detective mode is a retheme rather than a new engine.
2. The corridor wall test in cursiva is a nearest-point query against a precomputed ideal point cloud, not geometric polygon containment.
3. Cursiva has no theme layer and no font declarations anywhere, so every colour is an inline module constant and all text renders in the user-agent default face.
4. Cursiva component tests assert against `renderToString` output under vitest's default node environment, which is why its geometry helpers parse path strings instead of calling DOM measurement APIs.
5. The `perfect-freehand` dependency is declared and unused in cursiva while two live specs still describe it, which is pre-existing spec drift rather than a regression.
