# Design: Dolphins in the pond — a screen that scrolls

Binding input: `proposal.md` and `exploration.md`. **Three of the proposal's decisions are corrected
here** (§0), and the first correction removes nine of the ten sites its own audit called mandatory.
Every `file:line` below was re-verified against the working tree on `sdd/delfines-en-el-estanque`.

Numbers are marked **[measured]** (Engram #1329/#1381, `scripts/art/png.py`, luma-601 — not
re-measured here), **[derived]** (closed-form arithmetic from the shipped code and the shipped
literals: `layOutPaths`, `alternatingArches`, `placeArt`, `viewBoxToImage`), **[read]** (read off the
shipped source this session), or **[corrected]** (the proposal's claim was wrong and the corrected
one is used everywhere below).

**This design phase has no shell.** `art-source/delfin.png` was therefore not re-measured; the
arithmetic below uses the SHIPPED derived file's own registered dimensions,
`SECTOR_ADVENTURE_ART.dolphin = { href: '/art/sector-dolphin.png', w: 448, h: 418 }`
(`detective/assets.ts:315` **[read]**), which is the number the renderer actually divides by
(`placeArt.ts:58`). Aspect **1.07177**. The proposal's dependency line already says "verify, do not
rebuild"; nothing below needs a source measurement.

---

## 0. Ratified amendments to the proposal

These supersede the proposal on these points. `sdd-tasks`, `sdd-apply` and the archive read this
contract, not the superseded text.

| # | § | What it corrects |
|---|---|---|
| **A1** | Decision 3(e) | **The world/window split needs ONE site changed, not ten — and choosing which of the two numbers keeps the old name is the whole reason.** `LevelTarget.viewBoxWidth` already means *the paper the level is laid out on*: `layOutPaths` widens it for a long route, `buildIdealGrid`, `coverageScore`, `revealScore`, `groundScatter`, `sheetBounds`, the base rect, the backdrop pair, the wall rect and the four guide lines all consume it as the WORLD and are all correct as written. The only site that has ever meant *the window* is the `viewBox` attribute itself (`TraceCanvas.tsx:1003`). So the change adds `viewWidth` (new, consumed by exactly one attribute) instead of re-pointing `viewBoxWidth` (old, consumed by twelve). Decision 3(d) — "every other level stays bit-identical" — then holds **by construction rather than by audit**: no expression outside `:1003` is touched, so there is nothing for an audit to miss. §1.3 enumerates all twelve sites anyway, with `world`/`window` and `changes`/`no change` against each, because the proposal asked for the enumeration and an enumeration that ends in nine "no change" rows is still the proof. |
| **A2** | Decision 5 | **`routeApexes`' immediate-neighbour test cannot find a smooth wave's extrema at all, and neither can a trough-aware copy of it.** `vertexArt.ts:24-31` accepts an apex only when `min(prev.y, next.y) − cur.y >= minRise` (default 40) against its IMMEDIATE flattened neighbours. That works for `peakRidge`, which emits one polyline point per apex between two long `L` legs; on a flattened cubic the neighbours of the crest sample sit a fraction of a unit away and **every apex is rejected**. The sibling is therefore a MONOTONE-RUN scan, not a three-point scan (§5.1), and §5.1's first test is that its crests reproduce `routeApexes`' output on all eight shipped ridge levels — which is what makes it a superset instead of a rewrite. |
| **A3** | Decision 5 | **The dolphin's ceiling is 77 units at rung 1, not "roughly 80–90".** The proposal's band `300 − A − cw/2` omits the clearance between the picture and the channel wall, and reads `A > 150` as if `A` could sit at the guard's edge. With the authored `A = 160` and `dolphin1`'s `corridorWidth = 110` the band is 85 and the clearance is 8 (§5.2), so the tallest admissible dolphin is **77**. The family ships **64**, which keeps 13 units between the picture and the sheet edge at the tightest rung. |

Everything else in the proposal is adopted, including its four author-bound items (the pond rather
than a coast, the decorative reading of *sin tocarlos*, the demo on `dolphin1` only, and the four
things listed as explicitly not closed).

## Technical Approach

Nothing in the scoring model, the progress store, `useTraceInput`, `buildLevelTarget`'s derivation,
`evaluateLevel`, the reveal grid, the waypoint fold or the case machinery changes. The change is one
new pure function, one new prop, one attribute expression, one placement sibling, four level
literals and six registry rows:

1. `canvas/camera.ts` — **new**: `cameraOrigin`, `seedCameraOrigin`. Pure, no React, no DOM.
2. `canvas/TraceCanvas.tsx` — one `camera?` prop; the `viewBox` attribute expression; one block in
   the shipped rAF loop, beside the carrier's.
3. `canvas/devMode.ts` — one ungated parser, through the shipped private `debugArg`.
4. `levels/types.ts` — `LevelConfig.camera?` (the 10th additive-optional precedent) and
   `vertexArt.place?`/`vertexArt.clear?`.
5. `levels/dolphinExtrema.ts` — **new**: `routeExtrema`, `vertexArtPoints`. Pure.
6. `screen/LevelPlay.tsx` — the camera prop, the reset seeding, and the `vertexArt` placement branch.
7. `zoo/sectors.ts` — a sheet-width parameter on both transforms; `estanque` 8 → 12; one animal.
8. `levels/catalog.ts` + `zoo/{adventures,backdrops}.ts` + `detective/assets.ts` — four levels, one
   adventure, one backdrop row, one animal id.

Governing constraints, unchanged: vitest on the **node** environment, no jsdom, no testing-library;
every decision a **named exported pure function** and each component renders only what one of them
returned; `npm run build` = `tsc --noEmit && vite build` with `noUnusedLocals`, `noUnusedParameters`,
`verbatimModuleSyntax`. No new dependency, no new persisted key, no store version bump, **no new art
commissioned**, **no `build_art.py` re-run**, no new manifest literal, and no `getImageData`.

`useTraceInput.ts`, `buildLevel.ts`, `coverage.ts`, `revealGrid.ts`, `corridorTrack.ts`,
`evaluateLevel.ts`, `vertexArt.ts`, `paths.ts`, `arrange.ts`, `artCorridor.ts`, `waypoints.ts`,
`cases.ts` and every shipped level literal are **byte-identical to `main`**.

**What the skill `svg-animations` contributes, and what it must not.** Its viewBox semantics
(`minX minY width height`, everything downstream of one rectangle) and its `preserveAspectRatio`
notes are exactly the mechanism this change uses; its `prefers-reduced-motion` note is answered in
§2.5. Everything else it offers — `<defs>`, gradients, masks, filters, `<animateMotion>`,
`<mpath href>`, CSS `d` interpolation — is **inadmissible here**: `docs/09` §3 forbids `url(#…)`
outright and `TraceCanvas.tsx:78-93` carries the scar. No SMIL, no `<defs>`, no `useId`, nothing
with a `#` in it is introduced anywhere in this change.

---

## 1. The camera's data model

### 1.1 `camera?` is an additive optional field, not a new `LevelKind`

```ts
// client/src/levels/types.ts — the 10th additive-optional precedent, after
// goalArt, hazardArt, vertexArt, reveal, arrange, artCorridor, waypoints,
// carrierArt and taper.
  /** A WINDOW narrower than the world (`docs/13` §8 row G,
   *  "desplazamiento de pantalla — viewBox que avanza con el trazo").
   *
   *  The field's REASON TO EXIST: `LevelTarget.viewBoxWidth` is the paper the
   *  level is laid out on, and until this field existed it was ALSO how much
   *  of that paper you could see, because `LevelPlay` renders `fit="contain"`
   *  (`:1616`) and `preserveAspectRatio="xMidYMid meet"` shrinks a wider
   *  sheet to fit. A longer route therefore shipped a SMALLER movement —
   *  the exact opposite of `docs/13` §2's "sostener el movimiento". This
   *  field splits the two numbers apart, and only for the levels that ask.
   *
   *  Absent = `viewWidth === viewBoxWidth`, the camera code path is
   *  unreachable, and the rendered markup is byte-identical to `main`. Absent
   *  on every level that predates it, including `f4-la` and `f5-mama`, whose
   *  wide-sheet `fit="contain"` behaviour is what `layOutPaths` was written
   *  for and must not move by a unit. */
  camera?: CameraConfig
```

```ts
// client/src/levels/types.ts
export interface CameraConfig {
  /** How wide the WINDOW is, in the same viewBox units the world is in.
   *  Every camera level ships `MIN_VIEWBOX_WIDTH` (1000) and
   *  `catalog.test.ts` asserts it: that single equality IS the pedagogical
   *  claim of this whole change — the stroke on `dolphin3` is drawn at the
   *  identical visual scale as the stroke on `dolphin1`, on `duck-trail1`,
   *  and on every other level in the app. The field is a number rather than
   *  the constant so a future row can widen its window without a new field,
   *  but nothing here does. */
  readonly viewWidth: number
  /** Where the finger sits inside the window once the world is moving, as a
   *  FRACTION of `viewWidth`. This is the lead window, and it is the whole
   *  defence against the central trap: a camera that simply centres on the
   *  finger self-scrolls, because a stationary finger on a moving view is
   *  moving in WORLD coordinates, so the world runs away and drags the child
   *  off a corridor they never left. See §2.2 for the algebra that makes a
   *  held-still finger a fixed point. */
  readonly lead: number
}
```

**Why a field and not a `LevelKind`.** `LevelKind` stays at two values for the same reason
`waypoints` did not add a third (`free-trail-waypoints` design §1.1): sixteen
`kind === 'path'` / `kind === 'free'` sites keep working untouched, and several of them
(`resetOnContact && kind === 'path'`, `catalog.test.ts:289,297,352`) already encode `'path'` as the
only non-default kind. A dolphin level IS a `path` level with one more optional field.

### 1.2 `LevelTarget` gains one derived number, and `viewBoxWidth` keeps its meaning

```ts
// client/src/levels/types.ts — LevelTarget
  /** Width of the WORLD: 1000, or wider when the level's own path needs more
   *  paper (docs/02 §3). Unchanged in meaning, unchanged in value, and
   *  unchanged in every one of its twelve consumers (§1.3). */
  viewBoxWidth: number
  /** Width of the WINDOW — what the `viewBox` ATTRIBUTE is wide. Equal to
   *  `viewBoxWidth` unless the level authors a camera, which is every level
   *  that predates this field. Consumed by exactly one expression in the
   *  whole repo. */
  viewWidth: number
```

```ts
// client/src/levels/buildLevel.ts — both return branches, one line each
  viewWidth: Math.min(config.camera?.viewWidth ?? MIN_VIEWBOX_WIDTH, viewBoxWidth),
```

`Math.min` rather than a bare `??`: a level that authors a window WIDER than its own world would
otherwise produce a negative pannable extent, and clamping it here means the camera's own clamp
(§2.1) can never be handed a negative maximum. `buildLevel.test.ts` asserts every shipped target
comes back with `viewWidth === viewBoxWidth`, which is the machine-checked form of "no level that
predates this field can reach the new code path".

**The world extent comes from `layOutPaths`, untouched.** `buildLevel.ts:149-152` already computes
`viewBoxWidth = max(1000, ceil(span + 2·80))` and `tx = viewBoxWidth/2 − (minX+maxX)/2`. The four
dolphin routes are authored so that `tx === 0` exactly (§4.2), so the authored coordinates ARE the
world coordinates and `docs/13` §4 decision 7's "the art is in one place and the scored route in
another" cannot arise from a centring drift. `layOutPaths` is not modified.

### 1.3 [A1] The twelve sites, enumerated

The proposal named ten and said every one of them must be re-anchored. With `viewBoxWidth` keeping
its meaning, eleven of the twelve are already anchored to the world and are left alone. Each row is
stated with what it renders, so a reader can check the claim rather than take it.

| # | site | world or window | changes? |
|---|---|---|---|
| 1 | `TraceCanvas.tsx:998` `sheetBounds` | **world** | **no change.** `{x:0, y:viewBoxY, width: viewBoxWidth, height: viewBoxHeight}`. This is what `clampArtBox` clamps every standing character against, and it MUST span the world: at `dolphin3` the ten dolphins run to x = 1410, and a window-anchored 1000 would slide every one past x = 931.4 back to the window's right edge — paso E's exact failure, one code line away. §5.4 asserts the broken version broken. |
| 2 | `TraceCanvas.tsx:1003` the `viewBox` attribute | **window** | **the one change in the file.** §2.1. |
| 3 | `:1026-1029` the `contain` base rect | **world** | no change. It paints paper/field under the whole sheet; the part outside the window simply is not composited. |
| 4 | `:1054` the backdrop quiet rect | **world** | no change — Decision 4 puts the backdrop on the world, and §3 is the arithmetic. |
| 5 | `:1055-1062` the backdrop `<image>` | **world** | no change. One element, `xMidYMid slice`, no seam, no mirror, no `pattern`. |
| 6 | `:1122-1128` the maze wall rect | **world** | no change. Also never rendered on a dolphin level: the gate is `mazeOn && !backdrop` and these four carry a backdrop. |
| 7 | `:1250-1253` the four ruled guide lines (`x2={viewBoxWidth}`) | **world** | no change. Also never rendered here: `surface: 'blank'` gates the whole group. |
| 8 | `:1163-1196` the ground `<image>` marks | **world** | no change. Also never rendered here: `LevelPlay.tsx:1426` returns `undefined` ground whenever a backdrop is present (`docs/13` §4 decision 3). |
| 9 | `LevelPlay.tsx:1430` `groundScatter`'s `viewBox` | **world** | no change — already `target.viewBoxWidth`. Unreachable here, same gate as row 8. |
| 10 | `LevelPlay.tsx:504` `buildIdealGrid(ideal, corridorWidth, viewBoxWidth)` | **world** | no change. This buckets the ideal cloud for the snap magnet; the cloud spans the world, so the grid must. A window-anchored `cols` would bucket every point past x = 1000 into the last column and turn an O(1) lookup into an O(n) scan — slow, not wrong, and still the world is the correct number. |
| 11 | `coverage.ts:45` `coverageScore(strokes, viewBoxWidth)` | **world** | no change. Unreachable here (`kind: 'path'`). |
| 12 | `revealGrid.ts:278` `revealScore(…, viewBoxWidth)` | **world** | no change. Unreachable here (no `reveal`). |

**Eleven no-change rows are the design, not an omission.** The proposal's risk row —
*"a missed site in the 3(e) audit clamps art into the wrong half of the world"* — is retired by
making the audit have one row, and that row is an attribute nobody else reads.

---

## 2. The camera

### 2.1 The step, as one pure function and one attribute write

```ts
// client/src/canvas/camera.ts — pure, no React, no DOM.
// Lives in `canvas/` beside `placeArt.ts` and `resample.ts`, NOT in `levels/`:
// `TraceCanvas` imports nothing from `levels/` or `detective/` (it holds no
// registry and no palette token), and `screen/` already depends on `canvas/`,
// never the reverse.

/**
 * The world x-origin of the window, for one frame.
 *
 * THREE properties, and each is one clause of this expression:
 *
 *  - FORWARD-ONLY. `Math.max(prev, …)` makes the origin monotone
 *    non-decreasing within an attempt. A camera that can retreat turns a
 *    wobbling finger into a rocking world, and a rocking world is a second
 *    motion the child did not ask for.
 *  - CLAMPED. `Math.min(max, …)` with `max = sheetWidth − viewWidth` keeps
 *    the window inside the world, so the child never reaches blank space past
 *    the right edge of the paper.
 *  - THE LEAD WINDOW. `headX − lead·viewWidth` is what stops the self-scroll:
 *    a finger held at world-x `h` yields the same `want` on every frame, and
 *    `max(prev, want)` of a constant is a FIXED POINT. The world cannot move
 *    under a finger that is not moving — proved here by algebra, and asserted
 *    in §6 rather than felt.
 *
 * `headX === undefined` (the finger is up) returns `prev`, clamped. That is
 * the whole of the pen-lift rule: the camera does NOT rewind between strokes
 * (§2.4), and it falls out of the forward-only clause with no extra code.
 *
 * NO cap, NO damping, NO easing, and that is a decision rather than a
 * simplification — §2.3.
 */
export function cameraOrigin(
  prev: number,
  headX: number | undefined,
  o: { viewWidth: number; lead: number; sheetWidth: number },
): number {
  const max = Math.max(0, o.sheetWidth - o.viewWidth)
  if (headX === undefined) return Math.min(max, prev)
  return Math.min(max, Math.max(prev, headX - o.lead * o.viewWidth))
}

/**
 * The origin an attempt STARTS at: 0, or `?debug=camara:<x>`'s seed, clamped
 * into the same `[0, sheetWidth − viewWidth]` the live step clamps into.
 *
 * ONE initialiser, called from mount AND from every reset site (§2.4). That
 * is `seedArrange`'s own scar (`arrange.ts:171-182`), where a reset site
 * calling the raw initialiser silently wiped the screenshot seed, restated
 * before it can happen again.
 */
export function seedCameraOrigin(seed: number | null, viewWidth: number, sheetWidth: number): number {
  const max = Math.max(0, sheetWidth - viewWidth)
  return Math.min(max, Math.max(0, seed ?? 0))
}
```

The prop, mirroring `TraceReveal`/`TraceWaypoints`' structural convention (no import from `levels/`):

```ts
// client/src/canvas/TraceCanvas.tsx
/** The WINDOW, when it is narrower than the world. Absent = the window IS
 *  the world and the `viewBox` attribute is the shipped expression, character
 *  for character. */
export interface TraceCamera {
  viewWidth: number
  lead: number
  /** Where the attempt starts. Seeded by `?debug=camara:<x>` through
   *  `seedCameraOrigin`, so the FIRST PAINT, the server render, a screenshot
   *  taken before the first frame, and the rAF loop's monotone floor are all
   *  the same number — they cannot tell different stories. Same reason
   *  `hazardHome` exists at `:828-831`. */
  originX: number
}
```

The attribute, `TraceCanvas.tsx:1003`:

```tsx
-      viewBox={`0 ${viewBoxY} ${viewBoxWidth} ${viewBoxHeight}`}
+      // The WINDOW, not the world. Without a camera this is the shipped
+      // expression exactly: `camera` is absent, so the origin is 0 and the
+      // width is `viewBoxWidth`.
+      viewBox={`${camera?.originX ?? 0} ${viewBoxY} ${camera?.viewWidth ?? viewBoxWidth} ${viewBoxHeight}`}
```

The loop, inside the shipped `useEffect` at `TraceCanvas.tsx:843-936`, immediately AFTER the carrier
block at `:915-922` and BEFORE the dev-overlay throttle at `:924`:

```ts
      // The world advances with the trace (`docs/13` §8 row G). Written from
      // the SAME `rendered` array, in the SAME callback, one statement after
      // the carrier — so the ink (`:887`), the carried character (`:918`) and
      // the world can never disagree about where the finger is. That is not
      // tidiness: it is what makes §2.3's ordering argument hold.
      const cam = cameraRef.current
      const svg = svgRef.current
      if (cam && svg) {
        const head = drawingRef.current ? rendered[rendered.length - 1] : undefined
        const next = cameraOrigin(cameraXRef.current, head?.x, {
          viewWidth: cam.viewWidth,
          lead: cam.lead,
          sheetWidth: viewBoxWidthRef.current,
        })
        if (next !== cameraXRef.current) {
          cameraXRef.current = next
          svg.setAttribute('viewBox', `${next} ${viewBoxY} ${cam.viewWidth} ${viewBoxHeight}`)
        }
      }
```

Zero `setState` per frame, one attribute write and only when the number changed — the identical
discipline the ink (`:885-888`), the hazards (`:903-908`) and the carrier (`:918-921`) already keep.
`cameraRef`/`cameraXRef`/`viewBoxWidthRef` are `useRef` mirrors assigned on render, exactly as
`hazardsRef`/`carrierRef` are at `:820-824`, so the effect's dependency array
(`[pointsRef, onFrame]`) does not change and the loop is not torn down per frame.

**The source of the finger's world-x is `rendered[rendered.length − 1]`, never the raw pointer.**
That is the identical expression the carrier already uses at `:917`, and `rendered` is the
rail-warped mirror on an assisted level — so on an assisted level the world follows the line the
child SEES, not the line their finger made. One expression, three consumers.

### 2.2 The lead window, in numbers

`viewWidth = 1000` and `lead = 0.5` on both camera levels. The origin is `0` until the finger's
world-x passes 500, then tracks it, then parks at `sheetWidth − 1000`.

| | world | pannable extent | still head | panning | still tail |
|---|---|---|---|---|---|
| `dolphin3` | 1560 | **560** | x ∈ [80, 500] — 420 units | x ∈ [500, 1060] — 560 | x ∈ [1060, 1480] — 420 |
| `dolphin4` | 2120 | **1120** | x ∈ [80, 500] — 420 | x ∈ [500, 1620] — 1120 | x ∈ [1620, 2040] — 420 |

**[derived]** The still head and the still tail are each `lead·viewWidth − VIEWBOX_MARGIN = 500 − 80
= 420` units on any camera level, for any world, because `layOutPaths` centres the route and leaves
exactly 80 units of margin on each side. The child therefore begins and ends on a world that is
holding still, and the motion happens in the middle — which is where the rhythm is.

**Why `lead = 0.5` and not a look-ahead value.** A sine is locally self-similar: there is no new
information ahead of the finger except which dolphin comes next, and at 0.5 the window already shows
500 units ahead — 3.5 half-periods, three or four dolphins. Against that, the half BEHIND the finger
carries the thing this family exists to train: the wave the child has already sustained, visible as
evidence. 0.5 is also the one value that cannot be argued to be a taste call, and it is authored
per level so a capture can retune it without touching a line of engine code.

### 2.3 [the named risk, closed] Frame/event ordering, measured

The proposal made this scope: *"measured and given a stated tolerance, not assumed safe."* Here is
the measurement and the tolerance.

**The ordering, stated exactly.** `useTraceInput.ts:49-54` calls `svg.getScreenCTM()` fresh on every
`pointerdown`/`pointermove` and never caches it, so a mutated `viewBox` is honoured on the very next
event. rAF callbacks run BEFORE style, layout and paint of their own frame, so the attribute written
in frame `n`'s callback is composited in frame `n`'s paint. Therefore, for the whole of the interval
between frame `n`'s paint and frame `n+1`'s callback:

> the pixels on screen show origin `O_n`, and `getScreenCTM()` reports origin `O_n`. **They agree.**

A point captured in that interval is mapped by the CTM that was live when the child touched the
pixel. There is no staleness there at all, which is the opposite of what the exploration feared.

**The one window where they disagree, and its size.** A pointer event dispatched AFTER frame `n`'s
rAF callback but BEFORE its compositor commit reads a CTM at `O_n` while the pixels still show
`O_{n−1}`. The aim error is exactly `Δ = O_n − O_{n−1}`, i.e. the finger's own travel during the
previous inter-frame interval, in x only (`viewBoxY`, `viewBoxHeight` and `viewWidth` never change,
so the CTM's scale and its y offset are bit-identical frame to frame — the error cannot reach the
y axis, and it cannot change the scale).

**The bound.** Moving a point by `Δ` changes its distance to any fixed set by at most `Δ`
(triangle inequality), so the corridor-distance error is `≤ Δ` regardless of how steep the wave is.
`dolphin4` is the tight case: `corridorWidth = 84`, half-width 42, and the width the scorer actually
forgives is `cw/2 − BAND_INSET = 36` (`buildLevel.ts:39,181`). The route is 1960 units of x across 14
half-periods of a movement `docs/13` §2 calls *sostenido*; at a brisk two half-periods per second
the finger covers 280 units/s, so `Δ = 4.7` units at 60 Hz **[derived]**. A four-times burst gives
**18.7**, or 52 % of the forgiven slack, for pointer events dispatched inside one frame's render
window, each contributing one sample to an ideal cloud of hundreds.

**The tolerance, stated: `Δ ≤ 19 world units`, sub-frame, x-only, and it costs at most one frame of
ink tint.** `LevelPlay`'s `out` flag drives the live ink colour and a one-shot haptic; the accuracy
pillar is the cloud, not the sample.

**No compensation, and the reason is positive rather than lazy.** A cap, a damping term or an easing
curve would each bound `Δ` — and each would break the 1:1 finger↔world relation that Decision 3(g)
uses to exempt this camera from `prefers-reduced-motion`. A camera with inertia is motion the child
did not cause; it would have to be suppressed under reduced motion; and suppressing it makes
`dolphin3`/`dolphin4` unreachable. **Inertia is rejected here so that reduced motion can be honoured
there.**

**And the camera adds no new lag CLASS.** The live ink has always been one frame behind the
fingertip — `:884-888` writes `d` once per rAF from the same buffer. The camera is written in the
same callback from the same array, so the ink and the world share the offset exactly and the stroke
never appears to slide against the paper. What this change introduces is not a new lag; it is the
existing one, now also applied to the background.

### 2.4 Reset, restart, and the next stroke

| event | what the camera does | why |
|---|---|---|
| mount | `seedCameraOrigin(cameraDebugOrigin(search), viewWidth, sheetWidth)` | one initialiser (§2.1) |
| `resetSignal` bump — "Borrar", `restartRun`, `clearAttempt` | back to the SAME seeded origin, through the SAME initialiser | otherwise the child restarts with the world parked at the route's end and the green start dot off-screen — literally unreachable. `seedArrange`'s scar. |
| `pointerup` → `pointerdown` (a new stroke inside one attempt) | **does not move, does not rewind** | `docs/13` §6 / `docs/14` §14: early errors are not punished hard. Rewinding on a pen lift would relocate the child's own work and make them re-find where they were. It costs zero code: `head` is `undefined` while not drawing, so `cameraOrigin` returns `prev` clamped. |
| a completed attempt → the next attempt | the reset path above | an attempt is the unit the monotone floor belongs to |
| `resetOnContact` | **not applicable — it is `false` on all four** | see below |

**`resetOnContact` is not merely out of scope; it is incompatible with a forward-only camera, and
that is a finding rather than a scope note.** `resetOnContact` calls `abortStroke` (`useTraceInput.ts:74-83`),
which drops the pointer and empties both buffers but does NOT end the attempt — so the world would
stay parked mid-route while the ink vanished, and the child would have to restart from a start that
is no longer on screen. The four duck levels ship `resetOnContact: true`; the four dolphin levels
ship `false`, and now there are two independent reasons: `docs/13` §1 (*"los obstáculos aparecen
después, nunca al comienzo"*) and this one. Recorded so that turning it on later is understood to
require re-seeding the camera in the same breath.

### 2.5 `prefers-reduced-motion`

Unchanged and unsuppressed, per Decision 3(g), and §2.3 is what earns it: the world moves one unit
per unit of finger travel, with no easing, no inertia and no motion that outlives the touch. The
reduced-motion contract covers animation the child did not ask for. Without the camera the route is
unreachable, so suppressing it would not degrade the level — it would delete it.

---

## 3. The backdrop under a wide world

### 3.1 The closed form, and the two worlds fixed

The backdrop is one `<image>` with `preserveAspectRatio="xMidYMid slice"` spanning the WORLD
(`TraceCanvas.tsx:1055-1062`, site 5 of §1.3, unchanged). `slice` scales by the larger ratio; for the
`1536 × 1024` lagoon on a world `W` wide and the full 600-unit sheet (`surface: 'blank'` makes
`drawingBand` return `{y: 0, height: 600}`), `scale = max(W/1536, 600/1024)`, which is the width
ratio for every `W > 900`. Visible source rows are centred on 512 spanning `± 460800/W` **[derived]**.

| level | world `W` | scale | vs the 1000-wide levels | visible source rows | inside the sampled `(135, 889)`? | inside the measured quiet band `(201, 818)`? |
|---|---|---|---|---|---|---|
| `dolphin1`/`dolphin2` | 1000 | 0.651042 | 1.00× | 51.2 – 972.8 | no — identical to the ducks | no |
| `dolphin3` | **1560** | 1.015625 | **1.56×** | **216.6 – 807.4** | ✓ 81.6 rows of margin each side | ✓ 15.6 / 10.6 rows |
| `dolphin4` | **2120** | 1.380208 | **2.12×** | **294.6 – 729.4** | ✓ 159.6 rows each side | ✓ 93.6 / 88.6 rows |

`512 − 135 = 377` and `889 − 512 = 377`: the sampled band is symmetric about the crop centre, so
every world wider than `460800/377 = 1222.3` shows only rows already inside the band `build_art.py`
sampled **[derived]**. Both camera worlds clear that threshold with room. `brightest` over a subset
cannot exceed `brightest` over its superset (`#b4c5d0`, luma 193 **[measured, Engram #1329]**), so
`SHEET_PAPER` (luma 251.7) keeps its **58.7** of separation and `docs/09` §4's 55-luma law holds
**a fortiori**. A panned dolphin level is measurably SAFER on that law than the four shipped duck
levels are.

**Therefore: the `dolphin` backdrop row copies the duck row verbatim. No new `PASSTHROUGHS` row, no
`build_art.py` re-run, no new manifest literal, no re-measurement.**

```ts
// client/src/zoo/backdrops.ts — the row after `duck`
  dolphin: {
    art: SECTOR_BACKGROUND_ART.lagoon,
    quiet: '#b4c5d0',
    brightest: '#b4c5d0',
    // The duck's own rows, reused rather than re-sampled: at W = 1560 and
    // W = 2120 the visible source rows are a strict SUBSET of (135, 889)
    // (design.md §3.1), so `brightest` over what actually renders cannot
    // exceed the value measured over this wider band. The law is satisfied
    // a fortiori, and `backdrops.test.ts` asserts the containment at both
    // widths so the claim is checked rather than asserted.
    corridorRows: { top: 135, bottom: 889 },
    // No `channel` — the lagoon keeps SHEET_PAPER, exactly as the ducks do.
  },
```

### 3.2 The channel's own rows, pushed back to source pixels BEFORE anything is authored

Paso E shipped a snake pressing 74.6 of its 144.4 units into the stone band because this check was
done late (`docs/13` §4 decision 7). Done first here, through `viewBoxToImage` at the level's own
sheet width **[derived]**:

| level | `W` | scale | channel y extent | source rows | inside `(135, 889)`? | inside the quiet `(201, 818)`? |
|---|---|---|---|---|---|---|
| `dolphin1` | 1000 | 0.651042 | [85, 515] | 181.8 – 842.2 | ✓ | partly — same as `duck-trail3`, and for the same reason (`docs/13` §4 decision 3: the bank above and below is the same drawn scene) |
| `dolphin2` | 1000 | 0.651042 | [90, 510] | 189.4 – 834.6 | ✓ | partly |
| `dolphin3` | 1560 | 1.015625 | [92, 508] | **307.2 – 716.8** | ✓ 172.2 / 172.2 rows | ✓ |
| `dolphin4` | 2120 | 1.380208 | [98, 502] | **365.6 – 658.4** | ✓ 230.6 / 230.6 rows | ✓ |

The channel extent is `300 ± (A + corridorWidth/2)` with `A = 160` (§4.1). The panned levels' channels
sit deep inside the measured quiet band, so `SHEET_PAPER` on the channel is the most comfortable it
has ever been in this sector.

### 3.3 The honest cost, and the fallback that is named rather than rediscovered

**At both camera worlds the visible backdrop is ENTIRELY inside the lagoon's quiet band. The banks,
the reeds and everything that makes the drawing recognisable crop away completely; what the child
sees is a field of open water at 1.56× and 2.12× the magnification the duck levels use.**

`docs/13` §4 decision 3 says the sector is a **drawn place**, and a place you cannot recognise is a
weaker claim on that decision. This is stated rather than discovered in review, and it is what the
`capturas/pasoG/` pairs exist to answer (§7).

**The named fallback**, if the captures read badly: pin the `<image>` to the WINDOW —
`x={originX} width={viewWidth}` — instead of the world. Cost: three more attribute writes per frame
on an element the child is not looking at, and a world that slides under a static picture, which
reads as swimming in place. That is the opposite sentence from the one this family teaches, so it is
the fallback and not the recommendation. **It is a two-line change confined to site 5 of §1.3**, so
choosing it after the captures costs nothing already spent.

### 3.4 [Decision 4(2)] The sheet-width parameter on both transforms

```ts
// client/src/zoo/sectors.ts:151-175 — both functions, one optional parameter
export function imageToViewBox(imgX: number, imgY: number, stageWidth: number = STAGE_W): { x: number; y: number }
export function viewBoxToImage(vbX: number, vbY: number, stageWidth: number = STAGE_W): { x: number; y: number }
//   const scale = Math.max(stageWidth / MAP_IMG_W, STAGE_H / MAP_IMG_H)
```

Default `STAGE_W` keeps **all fifteen existing call sites byte-identical**, asserted in
`sectors.test.ts` before the new rows are added. Without it, `backdrops.test.ts:278-301` would keep
validating rows the render never shows: at `W = 2120`, corridor y = 100 is source row **365.6**,
while the 1000-wide transform reports **204.8** **[derived]** — a 161-row lie, and it would be a
green test.

**One honesty note that must not be widened.** These two functions are named and documented for the
ZOO MAP (`MAP_IMG_W`/`MAP_IMG_H` are `zoo-map.png`'s own pixels). They work for backdrops only
because every sector background ships at the same `1536 × 1024`. The parameter added here is the
STAGE width, never the SOURCE size; a future source at another size needs its own transform, not a
third parameter on this one. Say so in the doc comment.

### 3.5 Post-verify amendment A4 — window-pinned backdrop

§3.3's own captures answered the question it posed. The apply phase's first read of
`capturas/pasoG/dolphin3-control.png`, `dolphin3-debug280.png`, `dolphin4-control.png`, and
`dolphin4-debug9999-clamp.png` was wrong: it reported reeds and shore grass "clearly visible" at
both camera worlds. A later verification pass looked at the SAME four files again and found the
opposite — a flat, textureless field of water with zero visible bank or reed texture at either
1.56× or 2.12×, while `dolphin1`/`dolphin2` (uncamera'd, same 1000-wide world as the ducks) do show
the texture clearly. §3.3's original, more pessimistic prediction was the correct one all along.

The named fallback above is adopted, not merely re-confirmed: the backdrop `<image>` is now pinned
to the WINDOW (`x={originX} width={viewWidth}`) rather than the world, on every camera level. The
`<svg>`'s own `viewBox` attribute already carries exactly this pair of values one line above the
image in `TraceCanvas.tsx`'s render, so the image's `x`/`width` now mirror that expression verbatim
— `camera?.originX ?? 0` and `camera?.viewWidth ?? viewBoxWidth` — rather than the unconditional
`0`/`viewBoxWidth` every other full-sheet site keeps. The rAF loop's existing per-frame `viewBox`
write gains one more `setAttribute` call, on the image ref, in the same statement block, for the
same reason the camera and the ink already share one callback: they must never disagree about
where the camera is.

Cost, paid deliberately rather than discovered later: the world under the lagoon now slides beneath
a FIXED picture instead of a picture that pans with it, which §3.3 named as reading like "swimming
in place." That trade is preferred over a corridor whose backdrop only ever shows open water,
because the water-only rendering fails `docs/13` §4 decision 3's own claim that the sector is a
drawn PLACE, not a texture. The backdrop's quiet `<rect>` underneath is untouched — it still spans
the world, since only the visible window is ever painted over it regardless.

`backdrops.test.ts`'s own channel-rows check for the dolphin row changes with it: the two
"camera-world" sampling widths (1560, 2120) no longer correspond to anything the backdrop image is
ever rendered at, so the check now samples at the VIEW width (1000) instead — the exact same
scale, and the exact same (135, 889) sampled range, the duck row's own channels already use.

---

## 4. The wave, and the four sheets

### 4.1 The generator is `wave`, unchanged

**No new generator.** The exploration allowed "a purpose-built long-wave generator"; nothing is
built, because `wave({x0, x1, y, amplitude, cycles})` (`paths.ts:327-336`) already produces N
periods across an arbitrary span, and `layOutPaths` already widens the sheet for a span past
`MIN_VIEWBOX_WIDTH`. Adding a generator would put a second construction beside a shipped one that
does the same thing — the exact "two places carrying one fact" this repo has paid for twice.

**The wave is a smooth sine, not an angular zigzag** — the proposal's Decision 2, adopted. `wave`
routes through `alternatingArches`, whose cubic has `x(t)` strictly linear and an exact extremum of
`amplitude` at each half-period midpoint, with consecutive half-arches sharing their end tangent.
`triangularWave` and `peakRidge` belong to the sheep and the llamas (`docs/13` §2), and are not
touched.

### 4.2 The four literals, and the arithmetic that fixes them

`amplitude = 160` on all four — the **Y** dial is constant and the **X** dial carries the whole
ladder, which is what makes paso F's "corto vs guard" incompatibility unable to recur:

- `minY = 140 < 180` ✓, `maxY = 460 > 420` ✓, span `320 > 300` ✓, and `0 ≤ 140`, `460 ≤ 600` ✓.
  **`catalog.test.ts:580-598` therefore stays GREEN, unedited, for all four levels** **[derived]**.
- `160 > 150` by 10, so the guard is cleared with margin at the SPARSEST rung, at full amplitude.
- `armClearance(160, cw)`: `2·160 − cw ≥ 0.7·cw` holds for any `cw ≤ 188`; the widest here is 110 ✓.

| level | `§2` step | `wave(…)` | halves | half-period `w` | span | world `W` | `tx` | dolphins | `corridorWidth` | `camera` |
|---|---|---|---|---|---|---|---|---|---|---|
| `dolphin1` | *pocos delfines y separación amplia* | `x0:90, x1:910, cycles:2` | 4 | **205** | 820 | **1000** | 0 | **4** | **110** | — |
| `dolphin2` | *más delfines* | `x0:80, x1:920, cycles:3` | 6 | **140** | 840 | **1000** | 0 | **6** | **100** | — |
| `dolphin3` | *recorrido desplazable* | `x0:80, x1:1480, cycles:5` | 10 | **140** | 1400 | **1560** | 0 | **10** | **96** | `{viewWidth:1000, lead:0.5}` |
| `dolphin4` | *sostener el patrón más tiempo* | `x0:80, x1:2040, cycles:7` | 14 | **140** | 1960 | **2120** | 0 | **14** | **84** | `{viewWidth:1000, lead:0.5}` |

> **The worlds, worked** **[derived]**. `layOutPaths`: `W = max(1000, ceil(span + 160))`.
> `dolphin1` 820 → `max(1000, 980) = 1000`; `dolphin2` 840 → `max(1000, 1000) = 1000`;
> `dolphin3` 1400 → `1560`; `dolphin4` 1960 → `2120`. And `tx = W/2 − (minX+maxX)/2` is
> `500 − 500`, `500 − 500`, `780 − 780`, `1060 − 1060` — **zero on all four**, so the authored
> coordinates ARE the world coordinates and the dolphin placement cannot drift from a centring
> translation it did not know about.

> **Why `dolphin2`, `dolphin3` and `dolphin4` share one half-period (140)** and `dolphin1` does not.
> That is the mechanic's own claim made literal: `dolphin3` is not a different wave shown smaller, it
> is `dolphin2`'s wave **continued**, at the identical scale, for longer. `dolphin1`'s wider 205
> half-period is §2's step 1 — *separación amplia* — and it is the only rung where the shape itself
> is easier.

> **Crest curvature** **[derived]**, `waveCrestRadius(w, A) = w²/(8A)` (`paths.ts:398-400` — the wave's
> own closed form, NOT `uTurnRadius`'s garland factor): `dolphin1` **32.83**, `dolphin2`/`3`/`4`
> **15.31**. Against `pushBand`'s offset `cw/2 − BAND_INSET`: 49, 44, 42, 36. **All four fold**, and
> the fold is harmless and already shipped: `duck-trail2` folds at 30.9 against 39 and `duck-trail4`
> at 13.7 against 29 on `main` today **[measured, Engram #1329]**. The reason it is harmless is
> structural, not empirical — `pushBand` (`buildLevel.ts:76-103`) places every band point at exactly
> `cw/2 − BAND_INSET` from a point of the centreline, and the channel is STROKED at `cw/2`, so the
> folded cloud can never leave the drawn corridor; and the cloud is the snap magnet, never the wall
> test, which is `corridorTrack.ts`'s job. Stated so a reviewer who recomputes it does not file it.

> **The ladder, monotone and asserted** **[derived]**: dolphins `4 < 6 < 10 < 14`; `corridorWidth`
> `110 > 100 > 96 > 84`; world `1000 = 1000 < 1560 < 2120`; route span `820 < 840 < 1400 < 1960`.
> Rung 4 raises BOTH dials — *sostener el patrón más tiempo* is the span, and the narrower channel is
> `docs/13` §1's *reducción de espacio*.

### 4.3 Frozen shape of all four

`phase: 1`, `kind: 'path'`, `surface: 'blank'`, `maze: true`, **`resetOnContact: false`** (§2.4),
`carrier: true`, `letters: []`, `showGuide: true`, `vertexArt: { art: SECTOR_ADVENTURE_ART.dolphin,
size: 64, place: 'extrema', clear: 8 }`, `feedback(0, false)`, `rules(1, false, true, 0)` — the
`duck-trail2` row, verbatim, for every field this change does not have an argument about.

`demo: true` on **`dolphin1` only** (Decision 6). `dolphin2..4` carry none.

- **No `clue`.** These are not a detective case trail; `docs/13` §4 decision 1 keeps the deduction
  paused, and `isCaseTrail`/`inDetectiveWorld` must return exactly what they return today for every
  id. Asserted.
- **`feedback(0, false)`** on all four, not `duck-trail1`'s `feedback(0, true)`: the rail is for
  FIRST CONTACT with a routed trail, and by row G the child has met four duck, four sheep, four
  llama and four snake routes.
- **`haptics`** follows `catalog.test.ts:399-411`'s shipped clause — these have a corridor, so
  `haptics === true` with no edit to the guard.
- **`demo` must be absent on `dolphin3`/`dolphin4`, and that is asserted rather than merely omitted.**
  `DrawDemo` (`LevelPlay.tsx:796`) animates framer-motion over `target.paths` inside the markup the
  camera is mutating underneath it; on a panned level the animated head would walk straight off the
  right edge of the window and read as broken. A panning demo has no precedent anywhere in the repo
  (`bee1` set the same boundary one row ago).

---

## 5. The dolphins

### 5.1 [A2] `routeExtrema` — a monotone-run scan, not a three-point scan

```ts
// client/src/levels/dolphinExtrema.ts — pure, no React, no DOM.
// A SIBLING of `levels/vertexArt.ts`, not a mode on it: `routeApexes` has two
// shipped consumers (eight sheep and llama levels) whose behaviour must not
// change, and a mode parameter puts a branch inside a function two families
// already depend on.

export interface RouteExtremum {
  readonly x: number
  readonly y: number
  /** Y grows DOWNWARD, so a CREST is a local MINIMUM in y and a TROUGH is a
   *  local MAXIMUM. Naming them by what the child sees rather than by the
   *  sign is the whole reason this field is a word and not a boolean. */
  readonly side: 'crest' | 'trough'
}

/**
 * Every turning point of a route, in route order, tagged by side.
 *
 * IT SCANS MONOTONE RUNS, NOT TRIPLES, AND THAT IS THE WHOLE POINT.
 * `routeApexes` (`vertexArt.ts:24-31`) accepts an apex only when it rises at
 * least `minRise` above its IMMEDIATE flattened neighbours. On a `peakRidge`
 * that works, because the generator emits exactly one polyline point per apex
 * between two long straight legs. On a `wave` it finds NOTHING: `flattenPathD`
 * samples the cubic densely, so the neighbours of the crest sample sit a
 * fraction of a unit away and every apex is rejected. A trough-aware copy of
 * the same test would find nothing either — which is why this is not a copy.
 *
 * A run ends where the sign of `Δy` reverses; that reversal point is the
 * turning point, and its rise is measured against the SURROUNDING RUNS
 * (`min(|y − yPrevTurn|, |y − yNextTurn|)`), so it stays correct at any sample
 * density and for a route whose extrema are not all the same height. The
 * route's first and last points are never turning points, which is right: a
 * `wave` starts and ends on its own centreline.
 *
 * Read off the already-centred `LevelTarget.polyline`, like `routeApexes`, so
 * no caller redoes `buildLevelTarget`'s centring arithmetic and no authored
 * coordinate can drift from a re-tuned literal.
 */
export function routeExtrema(
  polyline: ReadonlyArray<{ x: number; y: number }>,
  minRise = 40,
): readonly RouteExtremum[]

/**
 * Where each dolphin's PICTURE stands, as points the SHIPPED `vertexArt`
 * render layer can draw with no new component and no new prop.
 *
 * `TraceCanvas.tsx:1333-1343` places vertex art with `STANDING_GRIP`
 * (`placeArt.ts:33` = `[0.5, 1]`), i.e. the point is the box's BOTTOM edge,
 * horizontally centred. So:
 *
 *   crest  → return `e.y − cw/2 − clear`            → box `[that − size, that]`
 *   trough → return `e.y + cw/2 + clear + size`     → box `[e.y + cw/2 + clear, +size]`
 *
 * One point list, one grip, one shipped layer, zero new render code and zero
 * new `url(#…)` surface. The proposal budgeted a new layer; the shipped one
 * already expresses this exactly.
 *
 * `corridorWidth` MUST be the level's AUTHORED width
 * (`LevelConfig.corridorWidth`), never the adaptive `LevelTarget.corridorWidth`
 * — the identical rule `clues.ts:243-253` states for `trailEndArc`, with the
 * identical consequence at `MAX_WIDTH_FACTOR = 2`, and `clues.test.ts:306`'s
 * own falsifiability discipline is reused in §6 to assert the wrong width
 * really is wrong. §5.3 states what the widened channel does to the picture.
 */
export function vertexArtPoints(
  extrema: readonly RouteExtremum[],
  o: { corridorWidth: number; size: number; clear: number },
): readonly { x: number; y: number }[]
```

**The superset proof.** `routeExtrema(p).filter(e => e.side === 'crest').map(({x, y}) => ({x, y}))`
must equal `routeApexes(p)` on all eight shipped `sheep-hill*`/`llama-peak*` polylines. That single
assertion is what makes the sibling a strict widening rather than a second, drifting implementation
— and it goes red the moment either function is retuned alone.

### 5.2 [A3] The size, the clearance, and the ceiling that corners it

```ts
// client/src/levels/catalog.ts
/** How tall a dolphin is drawn, in viewBox units.
 *
 *  `docs/09` §3 sizes animals at ~140, and 140 DOES NOT FIT. The band between
 *  the corridor's outer wall and the edge of the sheet is
 *  `300 − amplitude − corridorWidth/2 − clear`; the phase-1 guard forces
 *  amplitude > 150, so at this family's authored 160 and `dolphin1`'s
 *  110-wide channel the ceiling is 140 − 55 − 8 = 77. The proposal estimated
 *  80–90 by omitting the clearance; the real ceiling is 77 (design.md A3).
 *
 *  64 spends 83 % of that ceiling and keeps 13 units between the picture and
 *  the edge of the sheet at the tightest rung, which is what stops
 *  `clampArtBox` from being anything but the identity (design.md §5.4). This
 *  is the FOURTH time a measured law has cornered an art-direction number
 *  (`docs/13` §4 items 5, 6, 7, 8); the exact value inside the ceiling is the
 *  author's, and the test asserts the CONSTRAINT, never this literal. */
const DOLPHIN_SIZE = 64
/** How far the picture clears the channel wall.
 *
 *  Strictly greater than `BAND_INSET` (6), and that is the derivation rather
 *  than a round number: `BAND_INSET` is the slack the SCORER forgives — "a
 *  trace exactly on the wall still reads as inside" (`buildLevel.ts:36-39`).
 *  A picture that clears the wall by less than that slack can be visibly
 *  touched by a trace the engine counts as clean, and *"pasa entre ellos sin
 *  tocarlos"* would then be false on the screen while true in the score. 8 is
 *  the smallest integer that is not. */
const DOLPHIN_CLEAR = 8
```

> **The boxes, worked** **[derived]**. Rendered width `64 × 448/418 = 68.59`, half-width 34.30.
>
> | level | `cw` | crest box `y` | trough box `y` | margin to the sheet edge |
> |---|---|---|---|---|
> | `dolphin1` | 110 | **[13, 77]** | **[523, 587]** | **13** — the tightest in the family |
> | `dolphin2` | 100 | [18, 82] | [518, 582] | 18 |
> | `dolphin3` | 96 | [20, 84] | [516, 580] | 20 |
> | `dolphin4` | 84 | [26, 90] | [510, 574] | 26 |
>
> Every box is strictly outside the channel: the crest wall sits at `140 − cw/2` and the box's
> bottom at `140 − cw/2 − 8`; the trough wall at `460 + cw/2` and the box's top at `460 + cw/2 + 8`.
> Perfectly symmetric about y = 300, because the wave is.

> **The x extent, worked** **[derived]**. Extrema at `x0 + (i + 0.5)·w`. `dolphin1`: 192.5, 397.5,
> 602.5, 807.5 → boxes span [158.2, 841.8] inside [0, 1000] ✓. `dolphin2`/`3`/`4`: 150 + 140k →
> leftmost box edge 115.7; rightmost 884.3 / 1444.3 / 2004.3, inside 1000 / 1560 / 2120 ✓.
> **`clampArtBox` is the IDENTITY on all thirty-four dolphins**, which is what makes §6's
> coincidence test exact rather than approximate.

### 5.3 Orientation, and the adaptive-width consequence

**No rotation and no mirror. One `href`, one orientation, thirty-four copies.**
`docs/referencias/delfines-zigzag.png` draws its arcs above the crests and below the troughs with
**all of them opening downward** — the same posture, not a mirrored pair. The engine agrees for two
independent reasons: a vertical flip (`scale(1,-1)`) would put the trough dolphins belly-up, and a
horizontal flip (`scale(-1,1)`) would face them left, a direction change this family never asks for.
Either would also need a `transform` wrapper composed with `preserveAspectRatio`, i.e. a second
sizing system beside `placeArt`'s — precisely what `docs/09` §3 and the shipped `ArtCorridorLayer`
avoid.

**What a widened corridor does to the picture, bounded and disclosed.** Placement uses the AUTHORED
width (§5.1), so the pictures never move; the CHANNEL does. At `MAX_WIDTH_FACTOR = 2`
(`game/adaptiveTolerance.ts`, cited at `clues.ts:246`) `dolphin1`'s channel becomes 220 wide, its
crest wall rises to y = 30, and it reaches **47 of the picture's 64 units** **[derived]**. Nothing
scores differently — `resetOnContact` is false and the dolphins are decoration — so what the child
sees is the channel growing to include them, which is a forgiving sentence, not a punitive one. The
alternative is arithmetically self-defeating: sizing rung 1 so that even a doubled channel clears the
picture needs `corridorWidth ≤ 68`, which would make the WIDEST rung narrower than the narrowest.
Recorded as a bounded consequence of `docs/13` §6's *"la tolerancia empieza amplia"*, not as a defect.

### 5.4 The `vertexArt` field gains two optional keys, and the shipped path is untouched

```ts
// client/src/levels/types.ts
-  vertexArt?: { art: ArtImage; size: number }
+  vertexArt?: {
+    art: ArtImage
+    size: number
+    /** WHERE on the route the art stands. Absent = `routeApexes`, i.e. the
+     *  crests only, standing ON the line — the shipped sheep and llama
+     *  behaviour, byte for byte. `'extrema'` = crests AND troughs, pushed
+     *  OUTWARD clear of the channel (design.md §5.1). The mode lives on the
+     *  LEVEL, not inside `routeApexes`, so the function two families depend
+     *  on gains no branch. */
+    place?: 'apexes' | 'extrema'
+    /** `'extrema'` only: how far the picture clears the channel wall.
+     *  Defaulted at the call site so `'apexes'` never reads it. */
+    clear?: number
+  }
```

```tsx
// client/src/screen/LevelPlay.tsx:1415-1420
  const vertexArt = useMemo<TraceVertexArt | undefined>(() => {
    if (!level.vertexArt) return undefined
    const at =
      level.vertexArt.place === 'extrema'
        ? vertexArtPoints(routeExtrema(target.polyline), {
            // The AUTHORED width, never `target.corridorWidth` — §5.1.
            corridorWidth: level.corridorWidth,
            size: level.vertexArt.size,
            clear: level.vertexArt.clear ?? 8,
          })
        : routeApexes(target.polyline)
    if (at.length === 0) return undefined
    return { ...level.vertexArt.art, size: level.vertexArt.size, at }
  }, [level.vertexArt, level.corridorWidth, target.polyline])
```

`TraceCanvas.tsx:1325-1345` renders it unchanged. **No new layer, no new prop, no new `<image>`
code path, and the five shipped `url(#` guards in `TraceCanvas.test.tsx` stay green untouched.**

---

## 6. The insurance policy

Paso E cost a family (art in one place, scored route in another, 1,553 tests green). Paso F cost a
capture round (`debugCarrier` written, unit-tested, green, and called by nobody). The camera is the
same shape of risk in its worst form: a per-frame DOM mutation.

### 6.1 The rendered `viewBox` attribute — the proposal's Decision 7, satisfied

`TraceCanvas.test.tsx`, through `renderToString` on the REAL `<svg>`, reading the REAL attribute off
the HTML string — never the prop, never the helper:

| # | case | expected | red on `main` because |
|---|---|---|---|
| **V1** | `dolphin3`, no debug | `viewBox="0 0 1000 600"` | today it renders `0 0 1560 600` — the whole world, shrunk to fit |
| **V2** | `dolphin3`, `?debug=camara:280` | `viewBox="280 0 1000 600"` | no flag exists |
| **V3** | `dolphin4`, `?debug=camara:9999` | `viewBox="1120 0 1000 600"` — the clamp | no clamp exists |
| **V4** | `dolphin4`, `?debug=camara:-50` | `viewBox="0 0 1000 600"` — the floor | — |
| **V5** | `dolphin1`, `?debug=camara:400` | `viewBox="0 0 1000 600"` — **the seed does nothing on a level with no camera** | — |
| **V6** | `f4-la`, `f5-mama`, `duck-trail1..4`, `sheep-hill1`, `snake3`, `bee1`, `night2`, `glass1` | `viewBox` equals `` `0 ${band.y} ${target.viewBoxWidth} ${band.height}` `` | Decision 3(d), machine-checked |

### 6.2 The gap this repo's harness cannot close, named rather than papered over

**Vitest runs on the `node` environment with no jsdom and no testing-library.** There is no
`requestAnimationFrame`, no layout, and no `getScreenCTM`. **No test in this repo can observe the
per-frame `setAttribute('viewBox', …)`.** Saying otherwise would be paso F's `debugCarrier` in a new
costume — a green assertion about a helper, sold as a claim about a screen.

So the live mutation is covered by three compensating controls, and the design says which one is
actually load-bearing:

1. `cameraOrigin` and `seedCameraOrigin` are pure and fully tested (§6.3).
2. §6.1 proves the attribute the loop mutates exists, is on the real `<svg>`, carries the WINDOW
   width, and honours the seed — through the same `seedCameraOrigin` the loop clamps with.
3. **`capturas/pasoG/` is the proof of the live mutation, and it is not optional review material.**
   Paso F's most expensive finding was made by a capture, not by the suite; this is the same class of
   risk and the same instrument. §7 pairs every capture so it cannot be misread.

### 6.3 Everything else

| Layer | What | Approach |
|---|---|---|
| Unit (pure) | `cameraOrigin` | **HOLD STILL**: an unchanged `headX` returns `prev` for any number of calls — the fixed point of §2.2, and the falsifiability row is that a naive `origin = headX − lead·view` without `max(prev, …)` passes the lead test and FAILS this one. **FORWARD-ONLY**: a decreasing `headX` never decreases the result. **CLAMP**: `headX` past the end returns `sheetWidth − viewWidth` exactly. **LEAD**: `headX ≤ lead·viewWidth` returns 0. **PEN LIFT**: `headX === undefined` returns `prev`, not 0. **DEGENERATE**: `sheetWidth ≤ viewWidth` returns 0 always — the non-opting path, unreachable but proved harmless |
| Unit (pure) | `seedCameraOrigin` | `null → 0`; clamped both ends; `NaN` cannot arrive (`cameraDebugOrigin` filters it) |
| Unit (pure) | `routeExtrema` | **the superset proof** (§5.1) on all eight shipped ridge polylines; on each dolphin polyline exactly `halves` entries, alternating `crest, trough, …` from the first, with `x` within 0.5 of `x0 + (i+0.5)·w` and `y` within 0.5 of `300 ∓ 160`; **and the row that names A2**: `routeApexes(dolphinPolyline)` returns `[]`, so the sibling is a necessity and not a preference |
| Unit (pure) | `vertexArtPoints` | crest points are `e.y − cw/2 − clear`; trough points are `e.y + cw/2 + clear + size`; **falsifiability**: fed `target.corridorWidth` at `MAX_WIDTH_FACTOR` instead of the authored width, `dolphin1`'s crest picture overlaps the channel by 47 units — `clues.test.ts:306`'s discipline, so the correct call site is not a matter of taste |
| Unit (pure) | `devMode` | `camara:<x>`'s grammar; negative, malformed, non-numeric and missing all return `null`; **the seven shipped parsers byte-identical** |
| Unit (pure) | `buildLevelTarget` | every shipped target returns `viewWidth === viewBoxWidth`; the four dolphin targets return `1000/1000/1560/2120` for the world and `1000` for all four windows; **`tx === 0` on all four** |
| Unit (pure) | `viewBoxToImage`/`imageToViewBox` | all fifteen shipped callers identical at the default; the §3.2 table at 1560 and 2120; **the inverse round-trips at every width** |
| **Component** | **the coincidence test, markup → geometry** | `renderToString` each dolphin level's `TraceCanvas` with the REAL catalog config; parse every `<image href="/art/sector-dolphin.png">`'s `x/y/width/height` **out of the HTML string, never the internal box objects** — paso E's own gap. Then assert: (i) each box is disjoint from the channel band `300 ± (160 + cw/2)` at the AUTHORED width; (ii) each box's x-centre equals its extremum's x within 0.5; (iii) each box lies inside `[0, W] × [0, 600]`, so `clampArtBox` was the identity; (iv) counts are 4 / 6 / 10 / 14, half crest and half trough. **Falsifiability**: with `clear = 0` and `size` at the 140 of `docs/09` §3, (i) and (iii) both fail |
| **Component** | **`sheetBounds` anchored to the WINDOW** | render `dolphin3` with `sheetBounds.width = 1000` and assert the dolphin boxes COLLIDE at the window's right edge — §1.3 row 1's broken version, asserted broken |
| Unit (data) | the four levels | the §4.2 ladder, monotone; `camera.viewWidth === MIN_VIEWBOX_WIDTH` on both camera levels and `camera` absent on the other two; `demo` on `dolphin1` only; `resetOnContact === false` on all four; `clue` absent on all four; the §5.2 box table |
| Unit (data) | the shipped phase-1 guard | `catalog.test.ts:580-598` **unedited and green** for `dolphin1..4` |
| Unit (data) | the luma law | `backdrops.test.ts`: the `dolphin` row joins the existing corridor group; the visible-rows containment at 1560 and 2120 (§3.1); the channel-rows containment at both (§3.2) |
| Unit (pure) | zoo | `estanque.adventureIds` has twelve ids in the §8 order; `estanque.unlockedWhen` **unchanged**; the `delfin` appears only on `dolphin4`; every `appearsWhen` id is a real catalog level; §8's Z1 disjointness computed from the REAL `ANIMAL_ART.pato` dimensions |
| Component | `url(#` | absent from every rendered dolphin level, and the five shipped guards untouched |
| Screenshot (human) | `scripts/shot.sh` → `capturas/pasoG/` | **non-negotiable, `docs/12` §4, and §6.2 makes it load-bearing** — §7 |

**Shipped guards that go red and are edited**: `catalog.test.ts` `EXPECTED_IDS` (four ids after
`bee4`), the `CORRIDORS` and `FLUENCY` tables (four rows each), the free-level count claim at `:356`
(unchanged at 17 — these are `path` levels, asserted so the reader knows it was checked),
`zoo/adventures.test.ts`'s row count, `zoo/sectors.test.ts`'s `estanque` count 8 → 12, and
`zoo/backdrops.test.ts`'s completeness guard. **`catalog.test.ts:289,297,352,580-598` are NOT edited.**

---

## 7. The one debug flag, and the captures

`devMode.ts:8-20`'s rule, applied unchanged: a flag that writes persisted state or opens a navigable
surface is dev-gated; a flag that only paints render state is not.

```ts
/**
 * `?debug=camara:<x>` (`scrolling-camera` spec; design.md §7). NOT dev-gated —
 * the same reason `arrangeDebugCount`/`waypointDebugCount` are not: it paints
 * render state (where the window sits over the world), adds no control, no
 * word and no route, persists nothing, and must work against the EXACT build
 * a reviewer is screenshotting. `arrangeDebugCount`'s body, verbatim.
 * Malformed input, a missing flag, or a non-numeric origin all return `null`,
 * never throw. Spanish, unaccented, matching `sectores`/`ordenadas`/`espina`/
 * `estela`/`revelado`/`linterna`/`progreso`.
 */
export function cameraDebugOrigin(search: string): number | null
```

**ONE number, and it is the same number the loop uses.** The seed goes through `seedCameraOrigin` —
the same clamp — and becomes both the first-paint `viewBox` and the rAF loop's monotone floor. A
seeded capture and a live stroke therefore cannot tell different stories, which is A4's whole
argument from paso F, and paso E's two-independent-flags misreading is not available here because
there is only one flag.

**`capturas/pasoG/`, and the pairing rule stated so a reviewer cannot get it wrong.**

| level | control | second capture | what the pair proves |
|---|---|---|---|
| `dolphin1` | `?nivel=dolphin1` | `?nivel=dolphin1&debug=camara:400` | **they must be pixel-identical.** This is Decision 3(d) photographed: a seed does nothing on a level with no camera |
| `dolphin2` | `?nivel=dolphin2` | `?nivel=dolphin2&debug=camara:400` | the same, at six dolphins |
| `dolphin3` | `?nivel=dolphin3` — the child's first sight, origin 0 | `?nivel=dolphin3&debug=camara:280` — half of the 560 extent | the world moved, the stroke's scale did not |
| `dolphin4` | `?nivel=dolphin4` | `?nivel=dolphin4&debug=camara:560` | half of the 1120 extent |
| `dolphin4` | — | `?nivel=dolphin4&debug=camara:9999` | the clamp: `1120 0 1000 600`, the route's tail, and no blank paper past the right edge |
| map | — | `?nivel=mapa&debug=progreso:dolphin1,dolphin2,dolphin3,dolphin4` (dev-gated, shipped) | the dolphin standing at the pond beside the duck |

**The headless traps, all three already paid for** **[measured]**: `--disable-gpu` is mandatory or
chromium hangs; the window width is clamped to a 500 px floor, so never ask for less (all captures
here are the 1280 × 900 default); and a `data:` URL has no `localStorage`, so every seeded capture
goes through the dev server URL, never an inlined document. `--virtual-time-budget=6000` must
outlast the backdrop load — check the backdrop is actually painted before reading a capture.

**How to READ them** **[measured, Engram #1329]**: anchor on the CORRIDOR's pixel columns, never on
the art. The SVG sheet does not fill the window — it measures 635 px for 1000 viewBox units — and
`.cv-play`'s CSS background paints the rest in the water's own colour on purpose, which makes a
full-bleed backdrop LOOK letterboxed when nothing is wrong. And one rule specific to this row:
**on a camera level the corridor's columns differ between the two captures BY DESIGN** — that is the
thing being photographed — so the "the sheet did not change size" check is the sheet's own left and
right edges, and the cross-level check is `dolphin1` against `dolphin3`, which must render the sheet
at identical width because both viewBoxes are 1000 wide.

**What only a capture can answer**: whether the lagoon at 1.56× and 2.12×, cropped to open water,
still reads as the pond (§3.3, and the window-pinned fallback is one site away); whether a 64-unit
dolphin reads as a dolphin or as a smudge; whether a world that holds still for 420 units, moves for
560, then holds still again reads as one continuous movement or as three; whether the octopus riding
the fingertip occludes the dolphin it is passing, the way the bee occluded her flower one row ago;
and **whether the camera moves at all**, which §6.2 says no test in this repo can see.

---

## 8. The zoo

| row | value | note |
|---|---|---|
| `AdventureId` | `… \| 'dolphin'` | |
| `ADVENTURES.dolphin` | `{ id:'dolphin', levelIds:['dolphin1'..'dolphin4'], sector:'estanque', animal:'delfin', intro:'Los delfines saltan en fila. ¿Pasamos entre ellos sin tocarlos?', closing:'¡Pasamos entre los delfines! Ya están tranquilos en el estanque.' }` | the `duck` row is the template. **No `closingBeat`**: `mapBubble` filters on `a.animal !== undefined` (`adventures.ts:97`), so an adventure that recovers an animal already carries `docs/13` §5 item 6 through the shipped map bubble |
| `ZooAnimalId` | `… \| 'delfin'` | `docs/13` §7 lists `delfin.png` among the ANIMALS, so this is the animal route, not the `icon` route `glass`/`sand`/`night` take |
| `ZOO_ANIMAL_ART.delfin` | `SECTOR_ADVENTURE_ART.dolphin` | already registered at `assets.ts:315`, already passing `artHierarchy.test.ts:670-677`. **Verify, do not rebuild.** |
| `estanque.adventureIds` | eight → **twelve**: `duck-trail1..4`, `f2-guirnalda`, `f2-agua2..4`, **`dolphin1..4`** | `docs/13` §3's own order, *Patos → Medusa → Delfines* |
| `estanque.animals` | `+ { id:'delfin', dx: 105, dy: 60, size: 72, appearsWhen: ['dolphin4'] }` | **Z1, asserted rather than eyeballed**: with `STANDING_GRIP` off `animalSpot {735, 200}`, the box is x ∈ [801.4, 878.6], y ∈ [188, 260] **[derived]** — inside `ESTANQUE_HIT {660, 68, 280, 200}` ✓, clear of the reed island (x ∈ [768, 833], y ∈ [130, 182]) ✓, and disjoint from the duck's box. The test computes the duck's box from the REAL `ANIMAL_ART.pato` dimensions and asserts disjointness; the literal is retunable and the constraint is not |
| `estanque.unlockedWhen` | **UNCHANGED** — `isFiled(records, 'sand4')` | the pond is already open, and no sector unlocks off a dolphin level. The ladder entrada → estanque → montañas → nocturna → arena → bosque is untouched. Stated so nobody "completes" it |
| `ADVENTURE_BACKDROP.dolphin` | §3.1's row | the duck's literals, reused with the containment proof |
| backpack | **none** | `docs/13` §8 grants one object per closed sector but never assigned the pond one, and the duck row shipped without it. Hers to decide (proposal, "What is explicitly NOT closed") |
| entrada / cierre | the shipped `AdventureIntro` and the shipped closing screen | paso B built them once to be reused; row G adds no component |

---

## Data Flow

```
  catalog.ts  dolphin1..4  { paths: wave(...), camera?, vertexArt{place:'extrema'} }
        │
        ├─ layOutPaths ──▶ viewBoxWidth  = 1000 | 1000 | 1560 | 2120   (the WORLD)
        │                  tx            = 0 on all four
        └─ buildLevelTarget ─▶ viewWidth = 1000 on all four            (the WINDOW)
                    │
                    ├──▶ ideal / checkpoints / routes / polyline       (unchanged)
                    │
   LevelPlay ───────┤
        │           ├─ routeExtrema(polyline) ─ vertexArtPoints(AUTHORED cw)
        │           │        └──▶ TraceVertexArt.at ──▶ the SHIPPED <image> layer
        │           │
        │           └─ seedCameraOrigin(cameraDebugOrigin(search), view, world)
        │                    └──▶ TraceCamera.originX  ◀── every reset site, one initialiser
        ▼
  TraceCanvas
        │  viewBox attribute  = `${originX} ${band.y} ${viewWidth} ${band.height}`   ← the ONE window site
        │  sheetBounds        = { 0, band.y, viewBoxWidth, band.height }             ← the WORLD (clampArtBox)
        │  backdrop rect+img  = 0 .. viewBoxWidth, `slice`                           ← the WORLD (§3)
        │
        └─ rAF loop, ONE callback, ONE `rendered` array:
                 ink     path.setAttribute('d', …)                     :887
                 hazards el.setAttribute('transform', …)               :904
                 carrier el.setAttribute('transform', …)               :918
                 CAMERA  svg.setAttribute('viewBox', …)                ← new, one statement later
                            └── cameraOrigin(prev, rendered[last].x, {view, lead, world})
                                    forward-only · clamped · lead window

  pointermove ─▶ getScreenCTM() (fresh, never cached, useTraceInput.ts:49-54)
                    └── reads the viewBox the SAME callback just wrote  (§2.3)
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `client/src/canvas/camera.ts` (+`.test.ts`) | Create | `cameraOrigin`, `seedCameraOrigin`. Pure, DOM-free |
| `client/src/levels/dolphinExtrema.ts` (+`.test.ts`) | Create | `RouteExtremum`, `routeExtrema`, `vertexArtPoints`. **§5.1's superset proof lives here** |
| `client/src/levels/types.ts` | Modify | `CameraConfig`, `LevelConfig.camera?`, `vertexArt.place?`/`.clear?`, `LevelTarget.viewWidth` |
| `client/src/levels/buildLevel.ts` (+`.test.ts`) | Modify | one line per return branch; every shipped target proved `viewWidth === viewBoxWidth` |
| `client/src/canvas/TraceCanvas.tsx` (+`.test.tsx`) | Modify | `TraceCamera` prop; the `viewBox` expression at `:1003`; one block in the rAF loop after `:922`. **§6.1 lives here** |
| `client/src/canvas/devMode.ts` (+`.test.ts`) | Modify | `cameraDebugOrigin`; seven shipped parsers byte-identical |
| `client/src/screen/LevelPlay.tsx` (+`.test.tsx`) | Modify | the camera prop and its reset seeding; the `vertexArt` placement branch at `:1415-1420` |
| `client/src/levels/catalog.ts` | Modify | `dolphin1..4`, inserted after `bee4`; `DOLPHIN_SIZE`, `DOLPHIN_CLEAR` |
| `client/src/levels/catalog.test.ts` | Modify | `EXPECTED_IDS` ×4; `CORRIDORS`/`FLUENCY` ×4; the dolphin family block. **`:289`, `:297`, `:352`, `:580-598` unedited and green** |
| `client/src/zoo/sectors.ts` (+`.test.ts`) | Modify | the `stageWidth` parameter on both transforms; `estanque` 8 → 12; the `delfin` animal |
| `client/src/zoo/adventures.ts` (+`.test.ts`) | Modify | `AdventureId \| 'dolphin'`, one row |
| `client/src/zoo/backdrops.ts` (+`.test.ts`) | Modify | the `dolphin` row (duck literals); the containment assertions at 1560 and 2120 |
| `client/src/detective/assets.ts` | Modify | `ZooAnimalId \| 'delfin'`, `ZOO_ANIMAL_ART.delfin`. **No new art, no new manifest entry** |
| `docs/13_AVENTURAS_POR_ANIMAL.md` | Modify | §4's *Delfines* status row, and **decision 9** (§10) |
| `levels/vertexArt.ts`, `levels/paths.ts`, `levels/coverage.ts`, `levels/revealGrid.ts`, `canvas/useTraceInput.ts`, `canvas/placeArt.ts`, `screen/corridorTrack.ts`, `game/evaluateLevel.ts`, `scripts/art/build_art.py`, `client/public/art/manifest.json` | **Unchanged** | §0, §4.1, §3.1 |
| `TraceCanvas.test.tsx`'s five `url(#` guards | **Unchanged, and must stay green** | the ban is the point |

## Threat Matrix

N/A — no HTTP/shell routing, no subprocess, no VCS/PR automation, no executable-file classification,
and no process-integration boundary. `scripts/art/build_art.py` is **not run and not edited** (§3.1).
The rest is rendering, pure arithmetic, and one URL-query parser over an explicit string argument
that returns `null` on anything malformed.

## Migration / Rollout

**No migration.** `dolphin1..4` are new, unreferenced ids appended after `bee4`; `isUnlocked` is
positional but its only non-test, non-migration consumer is the dev-only `LevelMap.tsx`
(`migrateEntrance.ts:20`), and real navigation routes through `zoo/sectors.ts`'s declarative
`unlockedWhen`, which is **unchanged for every sector**. Re-grep `isUnlocked` at apply time and state
the result, the way pasos E and F did.

**Rollback.** Additive at every seam. Drop the four catalog rows and remove the four ids from
`estanque.adventureIds`: `camera` is then absent from every level, so the new code path is
unreachable without deleting it, and both transform parameters default to `STAGE_W` so all fifteen
existing callers are unaffected. `git revert` of the branch merge restores `main` with every child's
progress intact — no persisted key renamed, no manifest literal changed, `build_art.py` not re-run.

## Review-budget forecast

`delivery_strategy: exception-ok` was cached at session start with **no line budget**; no slicing is
proposed. `sdd-tasks` owns the binding forecast. The order below is an APPLY order, not a PR split:
each step is green on its own, which is what makes a bisect useful.

| step | contents | why it is green alone |
|---|---|---|
| **G1** Split | `LevelTarget.viewWidth`; `CameraConfig`; `buildLevel`'s two lines; the `buildLevel.test.ts` parity proof | no level authors `camera`, so `viewWidth === viewBoxWidth` everywhere and nothing renders differently |
| **G2** Camera | `canvas/camera.ts` + tests; `devMode`'s parser; `TraceCamera`; the `viewBox` expression; the rAF block; V1–V6 against a FIXTURE config | exercised through synthetic props; `camera` absent everywhere real |
| **G3** Placement | `dolphinExtrema.ts` + the superset proof; `vertexArt.place?`; `LevelPlay`'s branch | `place` absent on the eight shipped ridge levels, which keep `routeApexes` byte for byte |
| **G4** Transforms | the `stageWidth` parameter on both; the fifteen-caller parity proof | default-argument change, provably inert |
| **G5** Levels | `dolphin1..4`; `EXPECTED_IDS`; the family block; §6's coincidence and window-anchored-`sheetBounds` tests; §6.1 re-pointed at the real catalog | `ADVENTURE_BACKDROP` may still lack the `dolphin` row — `backdropFor` returns `undefined` and the four levels render on paper |
| **G6** Zoo | the backdrop row and its containment assertions; adventure, sector, animal; `docs/13` §4 decision 9 | the backdrop resolves for the first time here, which is where the captures start paying |

**G6 must not merge before its captures are read.** The numeric risk is closed by §3; G6 is the only
step that can be wrong in a way the suite cannot see — and §6.2 adds a second one that no step can
close: whether the world moves at all.

## Open Questions

- [ ] **`DOLPHIN_SIZE = 64` is provisional inside a ceiling of 77** (A3, §5.2). The test asserts the
      constraint, never the literal, so changing it is a one-line edit the suite still polices.
- [ ] **The pond gets no backpack item** (proposal, binding). Hers.
- [ ] **The author's reference image has not arrived** (proposal, binding). The schema stands in, and
      §5.3 reads its orientation directly; if her image mirrors the trough dolphins, that is a
      placement change, not a mechanic change.
- [x] **RESOLVED — the world/window split needs ONE site, not ten** (A1, §1.3), because
      `viewBoxWidth` already meant the world at all twelve of them.
- [x] **RESOLVED — `routeApexes`' test finds nothing on a smooth wave**, so the sibling is a
      monotone-run scan and its first assertion is the superset proof (A2, §5.1).
- [x] **RESOLVED — the dolphin's ceiling is 77, not 80–90** (A3, §5.2).
- [x] **RESOLVED — how magnified the lagoon may become before it stops being a place** (§3.3, §3.5).
      A first capture read-back misread the lagoon as still recognisable at 1.56×/2.12×; a later
      verification pass read the same files and found flat, textureless water instead — §3.3's
      original prediction. The named window-pinned fallback is adopted (A4, §3.5).
- [x] **RESOLVED — the frame/event ordering risk is measured and closed** (§2.3): the CTM and the
      painted pixels agree for the whole inter-frame interval, the residual is a sub-frame x-only
      error bounded at 19 units, and compensation is REJECTED because inertia would forfeit the
      reduced-motion exemption the mechanic depends on.
- [x] **RESOLVED — no new render layer and no new generator** (§4.1, §5.1): the shipped `vertexArt`
      layer places the dolphins exactly, because `STANDING_GRIP` puts the point on the box's bottom
      edge.
- [x] **RESOLVED — `resetOnContact` is incompatible with a forward-only camera** (§2.4), which is a
      second, independent reason for the `false` the proposal already scoped.
- [x] **RESOLVED — no test in this repo can watch the camera move** (§6.2), and the captures are
      therefore the proof rather than the garnish.

## 9. `docs/13` §6's nine obligations

| obligation | how this family answers it |
|---|---|
| **Zona de inicio** | `target.start = polyline[0]`, the shipped green dot with the octopus standing on it (`drawnPlace`). Always inside the first window: the route starts at x = 80 and the camera starts at 0 |
| **Trayectoria esperada** | the drawn channel, `showGuide: true`. On `dolphin3`/`dolphin4` only the part inside the window is visible at any moment, and **that is the mechanic**: the route is longer than one look |
| **Tolerancia del camino** | 110 → 100 → 96 → 84, `docs/13` §6's *"empieza amplia y se reduce"*, with the adaptive multiplier on top |
| **Respuesta visual al contacto** | the shipped `offPath` ink tint, tone and haptic — and **the corridor edge is the dolphin's back** (Decision 5), so *"pasa entre ellos sin tocarlos"* is scored by the mechanic the child is already on |
| **Condiciones de error** | leaving the channel, and nothing else. No hazard, no obstacle, `resetOnContact: false` (§2.4) |
| **Posibilidad de reinicio** | the shipped `clearAttempt`/`resetSurface`/`restartRun`, all three routed through the ONE `seedCameraOrigin` (§2.4) |
| **Animación de ayuda** | `demo: true` on `dolphin1`, where the movement is new; absent on the rest, and **asserted absent** on the two panned levels (§4.3) |
| **Criterio de finalización** | the shipped accuracy/direction/fluency pillars against `rules(1, false, true, 0)`. Nothing new |
| **Transición narrativa** | paso B's reusable components: entry = Pulpito + bubble + `sector-dolphin.png`; closing = `delfin` filed and standing in the pond beside the duck |

## 10. `docs/13` §4 decision 9 — what it will say

Written in Spanish in `docs/13`'s amendment style, matching decisions 5–8. The design fixes the
content; `sdd-apply` writes it. Four bullets, and the first is the one that pays for itself:

1. **Partir un número en dos se hace eligiendo cuál se queda con el nombre viejo.** `viewBoxWidth`
   quería decir *el papel* en sus doce consumidores y *la ventana* en uno solo, el atributo
   `viewBox`. Dejarle el nombre al MUNDO y agregar un `viewWidth` nuevo deja once sitios sin tocar y
   convierte "todos los demás niveles quedan idénticos" en algo cierto por construcción, no por
   auditoría. La propuesta pedía re-anclar diez sitios; cambia uno.
2. **`routeApexes` no encuentra nada en una onda suave, y una copia con valles tampoco.** Mide el
   ascenso contra los vecinos INMEDIATOS del polyline, y `flattenPathD` samplea una cúbica tan denso
   que el vecino de la cresta está a una fracción de unidad. Funciona en `peakRidge` porque ese
   generador emite un punto por pico. El hermano escanea **tramos monótonos**, no ternas, y su
   primera aserción es que sus crestas reproducen `routeApexes` en los ocho niveles embarcados de
   ovejas y llamas.
3. **La cámara no puede tener inercia, y la razón no es de gusto.** El tope, el amortiguado y el
   easing acotarían el error de puntería sub-cuadro; los tres romperían la relación 1:1 entre el
   dedo y el mundo, que es exactamente lo que permite NO suprimir esta cámara bajo
   `prefers-reduced-motion`. Una cámara con inercia es movimiento que el chico no causó, habría que
   apagarla, y apagada el nivel no se puede jugar. Se rechaza la compensación acá para poder
   respetar la regla allá. Y no agrega una clase de retraso nueva: la tinta viva siempre estuvo un
   cuadro atrás del dedo, y la cámara se escribe en la MISMA llamada desde el MISMO array.
4. **`resetOnContact` es incompatible con una cámara de avance monótono.** `abortStroke` tira el
   trazo pero no el intento, así que el mundo quedaría estacionado en la mitad del recorrido con la
   tinta borrada y el punto de inicio fuera de pantalla. Los cuatro niveles del pato lo llevan en
   `true`; estos cuatro en `false`, y ahora hay dos razones independientes.

   Y tres cosas menores que conviene no volver a descubrir: **ningún test de este repo puede ver la
   cámara moverse** — vitest corre en `node`, sin jsdom, sin `requestAnimationFrame` y sin
   `getScreenCTM` — así que las capturas de `capturas/pasoG/` son la prueba y no el adorno, que es
   exactamente la lección de `debugCarrier` del paso F. **A los dos anchos con cámara (1560 y 2120)
   el fondo de la laguna sólo muestra agua**: las filas visibles caen enteras dentro de la franja
   tranquila medida, así que la orilla y los juncos se recortan del todo — la ley de luma queda más
   holgada que nunca y la decisión 3 ("el sector es un lugar dibujado") queda más floja que nunca. Y
   **el delfín mide 64, no los ~140 de `docs/09` §3**: el techo real en el primer peldaño es 77, con
   amplitud 160 y corredor 110. Es la cuarta vez que una ley medida acorrala un número de dirección
   de arte.

---

### Accepted deviation

This document exceeds the skill's 800-word cap. The orchestrator removed the length budget for this
change (`delivery_strategy: exception-ok`, no `review_budget_lines`), the same deviation
`archive/2026-09-14-bee-free-trail-and-waypoints/design.md:1042-1051` and its four predecessors each
recorded. `openspec/config.yaml` requires every architecture decision to carry its rationale; this
change carries eighteen, **three of which correct the proposal** — one of which (A1) removes nine of
the ten mandatory edits its own risk table was built around, one of which (A2) shows that the helper
the proposal specified cannot work on the shape this family is made of, and one of which (A3) proves
the art-direction number it proposed does not fit on the sheet.
