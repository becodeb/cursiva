// Drawing surface (trace-canvas "Viewport and Ruled Lines", T3.5/T7.1): a
// normalized SVG viewBox `0 0 <viewBoxWidth> 600` with full-width guides at Y=180,
// Y=300, Y=420 and Y=540 (sky 0–180 / grass 180–420 / roots 420–600; the
// descender guide at 540 marks the bottom of the roots zone), pointer capture
// into normalized `Point[]` (useTraceInput), and rAF-driven perfect-freehand
// ink.
//
// 60fps strategy (design.md): points live in a ref and the ink `<path>` is
// mutated once per frame — no setState per move, no resample during drawing.
// The `Z`-closed ink polygon is the only per-frame cost (sub-ms at capture
// sizes). Evaluation happens at release time in the U6 modes.
//
// U6 modes hooks: the surface is shared by guided (animated `demo`, capture
// `enabled` gating while the demo plays, live `onFrame` rail feed) and free
// (faint `guide`, single-release `onRelease`, `onStart` clean retry, and an
// overlay `children` slot for the star/rescue feedback).
//
// Level engine hooks (docs/04 §3.3, docs/08): the same surface also renders the
// visible walkable `corridor`, the green `startMarker` + `directionArrow`, the
// settled `completedStrokes` of a multi-stroke attempt, and dims the live ink
// when `offPath` — never red, never an X (docs/01 principle 2).
//
// The sheet is not always the same sheet (docs/01 principle 1, "carga cognitiva
// controlada"):
//   `surface='blank'`  fases 1-2 draw on EMPTY paper. The ruled pauta means
//                      nothing before a letter exists, and four dashed lines
//                      under a maze are pure visual noise.
//   `maze=true`        the corridor stops being a hint and becomes WALLS: the
//                      sheet is filled and the channel is painted back over it
//                      in the paper colour, so "no toques los bordes" is
//                      legible without words. See `MAZE_WALL` for why this is
//                      two ordinary paints and not an SVG mask.
//   `corridor.taper`   the channel narrows along the route (see corridorTaper).
//   `inkWarp`          the assisted rail. Rendering only — see `rail.ts`.
//   `hazards`          timed obstacles crossing the route (`levels/obstacles.ts`).
//   `carrier`          a small character riding the fingertip.
//   `resetSignal`      the run goes back to the start (docs/01 principle 2).
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { inkPath, inkPolicyAllowsLive, inkPolicyAllowsSettled, traceInk, type InkRenderPolicy } from './ink'
import { taperedCorridor, type CorridorSegment } from './corridorTaper'
import type { ScatterMark } from './groundScatter'
import { useTraceInput, type TracePoint } from './useTraceInput'
import { isDevMode } from './devMode'
import { cameraOrigin } from './camera'
import { clampArtBox, placeArt, STANDING_GRIP, type ArtBox } from './placeArt'
import { RevealLayer } from './RevealLayer'
import { TorchPool, TorchVeil, type TraceTorch } from './TorchLayer'
import { ArtCorridorLayer } from './ArtCorridorLayer'
import { SpineLayer } from './SpineLayer'
import { WaypointLayer } from './WaypointLayer'
import { devCheckpointState, type DevCheckpointState } from './devCheckpointState'
import { DevCheckpointOverlay } from './devCheckpointOverlay'
import type { LetterCheckpoint } from '../letters/types'
import type { Taper } from '../levels/types'

/** Full normalized sheet HEIGHT: the ruled zones are pedagogy (docs/02 §3).
 * A caller may SHOW a narrower band of it (`viewBoxY`/`viewBoxHeight`), which
 * crops empty margin without ever rescaling the zones. */
const VIEWBOX_HEIGHT = 600
/** Default viewBox WIDTH; a long word asks for a wider sheet (docs/02 §3). */
const DEFAULT_VIEWBOX_WIDTH = 1000
const SKY_GUIDE_Y = 180
const MIDDLE_GUIDE_Y = 300
const BASELINE_Y = 420
const ROOTS_GUIDE_Y = 540 // descender guide: bottom of the roots zone
/** The paper itself. Also the colour the maze corridor is painted in — the
 * channel IS exposed sheet, so it must be exactly this value. */
export const SHEET_PAPER = '#fdfcf7'

/** How much of the container's own CSS-pixel edges the chrome (back/sound
 *  button row, the actions row) claims — `fitContentWithInsets`'s own
 *  contract below. All four default to 0 (no insets — every pre-T7-rework-#2
 *  caller). */
export interface SafeInsets {
  top: number
  bottom: number
  left: number
  right: number
}

const NO_INSETS: SafeInsets = { top: 0, bottom: 0, left: 0, right: 0 }

/**
 * T7 rework #2 (orchestrator review, "the art still does NOT fill the
 * screen... the chrome sits on flat bands"): the level SVG now fills the
 * WHOLE viewport (`position: fixed; inset: 0` — `LevelPlay.tsx`'s own
 * `.cv-sheet`), with every button floating over the art rather than on a
 * flat-colour row that reserved its own strip of the layout. This function
 * is what keeps the PLAYABLE content (corridor, markers, the octopus) clear
 * of that floating chrome regardless: it fits `box` into the container
 * MINUS `insets` (in CSS px — the chrome's own measured footprint), THEN
 * expands the returned viewBox to the container's FULL aspect ratio, so the
 * backdrop `<image>` (sized to this same returned box) still covers every
 * pixel of the viewport, including behind the chrome — only the CONTENT
 * avoids sitting under a button.
 *
 * The maths: `k` (content-units-to-CSS-px) is the largest scale that fits
 * `box` inside the SAFE rectangle (`container` minus `insets`) — an
 * ordinary "contain" fit, just against the safe rectangle instead of the
 * whole container. Given that single `k`, the returned viewBox is sized so
 * the FULL container maps to it 1:1 (`container / k`), and positioned so
 * `box` lands centred within the safe rectangle's own CSS-pixel bounds —
 * never within the full container, which is what would put content back
 * under the chrome. `insets` of all zero reduces exactly to fitting `box`
 * into the whole container, centred — the T7-rework-#1 behaviour.
 *
 * Degenerate input (non-positive container/box dimensions, or insets that
 * consume the whole container) returns `box` unchanged rather than NaN or
 * an inverted rectangle.
 */
export function fitContentWithInsets(
  box: ArtBox,
  containerWidth: number,
  containerHeight: number,
  insets: SafeInsets = NO_INSETS,
): ArtBox {
  if (!(containerWidth > 0) || !(containerHeight > 0) || !(box.width > 0) || !(box.height > 0)) return box
  const safeWidth = containerWidth - insets.left - insets.right
  const safeHeight = containerHeight - insets.top - insets.bottom
  if (!(safeWidth > 0) || !(safeHeight > 0)) return box
  const k = Math.min(safeWidth / box.width, safeHeight / box.height)
  if (!(k > 0) || !Number.isFinite(k)) return box
  // T14 (`odd/tasks/prewriting-stage-completion.md`, Batch 2.6, "the image
  // fills the screen now, but it's VERY cropped"): `width`/`height` below is
  // the MINIMUM-ZOOM COVER box — see `coverAspectRatio`'s own header just
  // below this function for the property that makes it one: this ratio is
  // ALWAYS `containerWidth / containerHeight`, for ANY `box`/`insets`, which
  // is exactly "the backdrop is scaled to cover the viewport at the minimum
  // zoom, independent of how big the content is" stated as an algebraic fact
  // rather than a hope. `box`/`insets` only ever move `k` (the zoom level)
  // and the CENTRING below — never this ratio.
  const width = containerWidth / k
  const height = containerHeight / k
  const safeContentWidth = safeWidth / k
  const safeContentHeight = safeHeight / k
  const x = box.x - insets.left / k - (safeContentWidth - box.width) / 2
  const y = box.y - insets.top / k - (safeContentHeight - box.height) / 2
  return { x, y, width, height }
}

/**
 * T14's own guarantee, named and pure so it can be asserted directly instead
 * of trusted as an emergent property of `fitContentWithInsets`'s arithmetic
 * above: for ANY positive `containerWidth`/`containerHeight`, that
 * function's returned box (the barring the degenerate-input fallback, which
 * returns `box` unchanged and is never reached by a real container) has
 * `width / height === containerWidth / containerHeight` — proved by the
 * algebra (`width = containerWidth / k`, `height = containerHeight / k`,
 * same `k` on both), not merely observed. `coverAspectRatio` exists so a
 * test can pin that proof as a property across many `box`/`insets` inputs,
 * which is the literal meaning of "independent of how big the content is".
 */
export function coverAspectRatio(containerWidth: number, containerHeight: number): number {
  return containerWidth / containerHeight
}

/** Backdrop art is a raster whose own intrinsic aspect ratio decides how
 *  much of it a `preserveAspectRatio="xMidYMid slice"` cover fit can show
 *  (`docs/09_GUIA_DE_ESTILO_VISUAL.md` §9's background variant). The `<image
 *  href>` render itself (below) already covers correctly for ANY aspect —
 *  the browser reads the file's OWN intrinsic size, never this constant — so
 *  this is a DEFAULT for the math functions below (`coverVisibleFraction`,
 *  `backdropSafeZoneWidthFraction`) when a caller has no per-image value to
 *  hand, not a universal truth. T22 (`odd/tasks/prewriting-stage-
 *  completion.md`): every backdrop shipped before this task happens to be
 *  landscape 3:2, `1536×1024`, so this stays their exact aspect; a WIDE
 *  backdrop (2:1, `2048×1024`) passes its own `w/h` to those functions
 *  instead of relying on this default. */
export const BACKDROP_IMAGE_ASPECT = 1536 / 1024

/**
 * T14: the fraction of a `imageAspect`-shaped source image a
 * `preserveAspectRatio="…slice"` COVER fit leaves visible inside a
 * `boxAspect`-shaped box — the two exact numbers `fitContentWithInsets`'
 * design note above claims (~88.9% at 4:3, "the minimum possible crop") and
 * this task's own acceptance thresholds are checked against. A cover fit
 * always fills the SMALLER-relative-to-image axis exactly and crops only
 * the other one, so the visible fraction is always `min(boxAspect /
 * imageAspect, imageAspect / boxAspect)` — symmetric, and `1` exactly when
 * the two aspects match.
 */
export function coverVisibleFraction(boxAspect: number, imageAspect: number): number {
  if (!(boxAspect > 0) || !(imageAspect > 0)) return 0
  const ratio = boxAspect / imageAspect
  return ratio > 1 ? 1 / ratio : ratio
}

/**
 * T22 (`odd/tasks/prewriting-stage-completion.md`): the squarest viewport
 * this game plays a level in landscape (a portrait screen gets its own
 * rotate prompt instead — `LevelPlay.tsx`'s own portrait-rotate card, out of
 * scope here). Named so `docs/20_PEDIDOS_DE_ARTE_TANDA_3.md` §2's own "central
 * safe zone" prompt guidance and this file's test can both point at the same
 * number instead of two independent `4/3` literals drifting apart.
 */
export const BACKDROP_SAFE_ZONE_ASPECT = 4 / 3

/**
 * The fraction of a `imageAspect`-shaped backdrop's own WIDTH a centred
 * `safeZoneAspect`-shaped "safe zone" occupies — literally
 * `coverVisibleFraction` evaluated at the safe zone's own aspect, since "the
 * safe zone is exactly what a `safeZoneAspect` cover crop leaves visible" IS
 * the definition (a `2048×1024` backdrop's `docs/20` "middle 1365px" band is
 * `2048 * backdropSafeZoneWidthFraction(2)`, `1365 ≈ 2048 * 0.6667`).
 *
 * Why this guarantees the safe zone is NEVER cropped at any supported
 * viewport (`docs/20` §2.2's own claim, proved rather than assumed): a
 * landscape backdrop's own aspect and every supported viewport's aspect are
 * both `>= BACKDROP_SAFE_ZONE_ASPECT` (the squarest is 4:3 itself). When the
 * viewport is squarer than the image (`viewportAspect <= imageAspect`, the
 * only case that crops the image's WIDTH at all), the visible width fraction
 * is `viewportAspect / imageAspect`, monotonically increasing in
 * `viewportAspect` — so its minimum over the whole supported range is at
 * `viewportAspect = BACKDROP_SAFE_ZONE_ASPECT`, which is EXACTLY this
 * function's own value. Any wider viewport shows the image's FULL width
 * (only its top/bottom crop), so the safe zone is trivially all there too.
 * `backdropSafeZoneCoversAt` below is the same argument restated as one
 * boolean per call, for a test to assert directly rather than re-derive.
 */
export function backdropSafeZoneWidthFraction(
  imageAspect: number,
  safeZoneAspect: number = BACKDROP_SAFE_ZONE_ASPECT,
): number {
  return coverVisibleFraction(safeZoneAspect, imageAspect)
}

/**
 * The fraction of a `imageAspect`-shaped backdrop's own WIDTH a
 * `viewportAspect`-shaped cover crop leaves visible — UNLIKE
 * `coverVisibleFraction`, which reports whichever axis is actually
 * constrained (T14's own "how much of the image survives the crop"
 * question, the right one for that task's framing bug). Once the viewport
 * is WIDER than the image (`viewportAspect > imageAspect`), the image's
 * FULL width already fits and only its height crops further — the width
 * fraction pins at `1`, it does not keep shrinking the way
 * `coverVisibleFraction`'s returned number does (that number has quietly
 * switched to reporting the HEIGHT fraction by then). This distinction is
 * exactly why `backdropSafeZoneCoversAt` cannot just reuse
 * `coverVisibleFraction` directly: the safe zone is a WIDTH-only central
 * crop, so what it needs is this function, not that one.
 */
export function backdropVisibleWidthFraction(viewportAspect: number, imageAspect: number): number {
  if (!(viewportAspect > 0) || !(imageAspect > 0)) return 0
  return viewportAspect >= imageAspect ? 1 : viewportAspect / imageAspect
}

/**
 * Whether a `viewportAspect`-shaped cover crop of a `imageAspect`-shaped
 * backdrop still shows the WHOLE `safeZoneAspect`-shaped central safe zone —
 * `docs/20`'s own acceptance test for "the content stays inside the image's
 * safe zone", restated as a direct boolean instead of a fraction comparison
 * at every call site. `backdropSafeZoneWidthFraction`'s own header proves
 * this holds for every `viewportAspect >= BACKDROP_SAFE_ZONE_ASPECT` (which
 * `backdropVisibleWidthFraction` above computes exactly).
 */
export function backdropSafeZoneCoversAt(
  viewportAspect: number,
  imageAspect: number,
  safeZoneAspect: number = BACKDROP_SAFE_ZONE_ASPECT,
): boolean {
  const visible = backdropVisibleWidthFraction(viewportAspect, imageAspect)
  const needed = backdropSafeZoneWidthFraction(imageAspect, safeZoneAspect)
  // A tiny epsilon: both sides are the SAME expression when
  // `viewportAspect === safeZoneAspect`, but floating point can still land a
  // hair below `needed` at that exact boundary.
  return visible >= needed - 1e-9
}

/**
 * `fitContentWithInsets`'s own maths, WIDTH LOCKED — the scrolling-camera
 * capability needs this split: `box.x`/`box.width` there are the moving
 * WINDOW (`originX`/`camera.viewWidth`), imperatively rewritten every frame
 * by the rAF loop below, never by this function. Growing or shifting width
 * here would mean the loop and this call could disagree about the window's
 * own extent — an unrelated resize firing between frames would either fight
 * the live scroll or silently widen the world window mid-run, changing how
 * much of the corridor is visible ahead of the child. Left/right insets are
 * therefore not honoured either (there is no width left to make room with);
 * only the vertical placement (top/bottom insets) and the vertical growth
 * needed to fill the container's own height are computed. `box.width`
 * fixes `k` (it must map to the FULL container width, edge to edge — the
 * whole point of this rework), so unlike the generic function above there
 * is no "fit into a safe width" choice being made on that axis at all.
 */
export function fitCameraContentWithInsets(
  box: ArtBox,
  containerWidth: number,
  containerHeight: number,
  insets: Pick<SafeInsets, 'top' | 'bottom'> = NO_INSETS,
): ArtBox {
  if (!(containerWidth > 0) || !(containerHeight > 0) || !(box.width > 0) || !(box.height > 0)) return box
  const k = containerWidth / box.width
  const height = Math.max(box.height, containerHeight / k)
  const safeHeight = Math.max(1, containerHeight - insets.top - insets.bottom)
  const safeContentHeight = Math.min(height, safeHeight / k)
  const y = box.y - insets.top / k - (safeContentHeight - box.height) / 2
  return { x: box.x, y, width: box.width, height }
}

/** The animated demo stroke's shipped colour — chalk-blue, readable over
 * paper. Extracted from the inline literal so `backdrop?.channel`'s own
 * contrast rule (design.md §3.2) can name it: `#0284c7` clears the paper by
 * a wide margin but fails the mountain stone channel's luma law by nearly
 * everything (gap 1), so a channelled backdrop swaps this for
 * `SHEET_PAPER` instead — chalk on rock reads, blue-on-blue-grey would not. */
export const DEMO_STROKE = '#0284c7'

/** Maze wall fill. A soft warm grey against the bone paper — docs/01 principle
 * 1 keeps the palette muted, so the walls read as SOLID without ever reading as
 * a warning. Nothing saturated, nothing red.
 *
 * HOW THE WALLS ARE DRAWN, and why it is not a mask. This used to fill the
 * sheet and knock the corridor out through an SVG `<mask>` referenced by
 * `url(#id)`. The picture was right and the mechanism was not: `url(#…)`
 * resolves against the DOCUMENT BASE URL, so a single `<base>` tag anywhere in
 * the page silently breaks every such reference; `mask` on inline SVG combined
 * with `preserveAspectRatio` letterboxing (which the contain fit depends on)
 * has a long history of engine bugs; and the id came from `useId()`, which
 * differs between the server and the client render. Any one of those paints a
 * BLANK sheet — no walls, no corridor, nothing — which is exactly what the
 * maze levels did on a real device while rendering perfectly in headless
 * Chromium.
 *
 * The identical picture comes from two ordinary paints with no reference and no
 * compatibility surface at all: fill the sheet with the wall colour, then
 * stroke the corridor over it in `SHEET_PAPER` at the corridor width with round
 * caps and joins. A tapered corridor is the same thing repeated per piece. This
 * is not a workaround for one engine — it removes the dependency on the feature,
 * which is why it is right whatever the child's browser turns out to be. */
const MAZE_WALL = '#e2e8f0'

/** The maze wall repainted as a PLACE (`docs/09_GUIA_DE_ESTILO_VISUAL.md` §7:
 * "el 'afuera' del corredor no tiene identidad: es un relleno gris. Con esta
 * dirección debería ser pasto, y el corredor tierra pisada").
 *
 * These two are the base tones the scattered ground art sits on, sampled from
 * that art after `build_art.py`'s `mute()` pass so a tuft never shows a rim of
 * a different green. They are deliberately LOW-chroma: section 4's rule is "el
 * color es la recompensa", and a field is the largest thing on the sheet, so
 * a saturated one would outshout the clue marks it surrounds.
 *
 * They do NOT replace `MAZE_WALL`, and the `ground` prop is the switch between
 * them. Every maze in the SHIPPED catalog is a detective trail, so nothing
 * currently renders the grey wall — but `catalog.ts`'s `LEGACY_PHASE_1` keeps
 * six unthemed corridor mazes byte-for-byte as the retheme's documented
 * rollback plan ("reverting is swapping this array back into LEVELS"). Those
 * six have no ground art and no world to belong to; deleting the grey wall
 * would silently turn that rollback into six FLAT GREEN sheets, which is worse
 * than the grey it reverts to. One unused constant is a cheap price for a
 * rollback that still works. */
export const GROUND_FIELD = '#c9d7bd'
const CORRIDOR_EARTH = '#d9c3ae'

/** Corridor colour when it is a soft channel rather than a wall. */
const CORRIDOR_FILL = '#cbd5e1'
/** Settled and live ink. */
export const INK_COLOR = '#1e293b'
/** The live ink while the fingertip is outside the corridor: the same line
 * with the light turned down (docs/01 principle 2 — never an error colour).
 * Overridable per caller through `inkDimColor`, because a line that is not ink
 * needs a dim of its own substance. */
const OFF_PATH_INK = '#94a3b8'
const INK_WIDTH = 18

/** Animated draw demo: framer-motion `pathLength` 0→1, times in seconds. */
export interface DrawDemo {
  d: string
  delay: number
  duration: number
  strokeWidth: number
}

/** Visible walkable channel (docs/08 §2): the level path(s) stroked at the
 * effective corridor width, in light grey under everything else. */
export interface TraceCorridor {
  paths: string[]
  width: number
  /** Optional narrowing along the route. Absent = one constant-width stroke,
   * which is the cheap path and stays the default. */
  taper?: Taper
}

/** Where the stroke must begin (docs/03 §7: "empezá desde el punto verde"). */
export interface TraceMarker {
  x: number
  y: number
}

/** Where the route ENDS (docs/03 section 7: the child is told where to start,
 * which way to go, and — since the goal marker — where they are heading).
 *
 * Deliberately NOT a second `TraceMarker`-shaped dot. A child who confuses the
 * two would trace the whole level backwards and fail the direction pillar for a
 * reason that is ours, not theirs, so the goal differs in SHAPE (nested hollow
 * diamonds vs. a solid disc) as well as in colour — the shape alone still
 * separates them for a colour-blind child, which colour alone would not. */
const GOAL_OUTER_R = 34
const GOAL_INNER_R = 16
/** Muted ochre. Warm, clearly not the green start dot, and nothing saturated
 * (docs/01 principle 1). */
const GOAL_COLOR = '#b45309'

/** Local tangent hint: which way to go, in degrees. */
export interface TraceDirectionArrow extends TraceMarker {
  angle: number
}

/**
 * Timed hazards crossing the route (`LevelConfig.obstacles`). The geometry is
 * NOT computed here: `at` is the pure `obstacleAt` from `levels/obstacles.ts`
 * bound to the level target, so the picture and the hit test are the same
 * function of the same clock and can never disagree.
 *
 * The clock is the ink loop's own `performance.now()`, handed back through
 * `onFrame`. One rAF loop drives the whole surface: a second loop, or a
 * `Date.now()` read per channel, is how the two get out of step.
 */
export interface TraceHazards {
  /** Contact radius of each hazard, index-aligned with `at`. */
  radii: readonly number[]
  /** Centre of hazard `index` at `timeMs`, in viewBox units. Pure. */
  at: (index: number, timeMs: number) => { x: number; y: number }
  /** Draw every hazard of this level as this picture instead of the plain
   *  circle. Absent = the shipped circle, so every existing caller is
   *  untouched. Same contract as `carrierArt`: WHICH picture is entirely the
   *  caller's decision, and this component imports nothing from `detective/`.
   *  No `size` — the drawn size is always `2 * radii[index]`, so the picture
   *  and the hit circle (`obstacles.ts`'s `hitObstacle`) can never drift
   *  apart (design.md §4). */
  art?: { href: string; w: number; h: number }
}

/** Hazard body. A muted plum: far from the green start dot and the ochre goal
 * in hue, darker than the wall grey so it reads as SOLID on top of it, and
 * nothing saturated (docs/01 principle 1) — an obstacle must be legible without
 * becoming the brightest thing on the sheet. */
const HAZARD_COLOR = '#7e6a9e'
const HAZARD_OPACITY = 0.9

/**
 * T41 follow-up: the "sticker" edge every hazard PICTURE wears — a paper
 * outline cut ~3 units around the drawn shape plus a faint lift shadow — so a
 * hazard reads on any corridor: the grey stone on the grey mountain path, the
 * snail on the brown sand channel, the fish on the white pond corridor (where
 * the outline disappears into the paper and the lift shadow does the work).
 *
 * CSS filter FUNCTIONS, deliberately: no `<filter>` element, no `<defs>`, no
 * `url(#…)` — this file's own scar (see the maze notes above). A browser that
 * ignored filter functions on SVG content would just draw the plain picture,
 * never a blank sheet. Offsets are in the sheet's own units (the image lives
 * in the viewBox), so the edge scales with the sheet like the stroke does.
 * Hazards only: collect items and clue marks never wear it.
 */
export const HAZARD_STICKER_FILTER = [
  `drop-shadow(4px 0 0.8px ${SHEET_PAPER})`,
  `drop-shadow(-4px 0 0.8px ${SHEET_PAPER})`,
  `drop-shadow(0 4px 0.8px ${SHEET_PAPER})`,
  `drop-shadow(0 -4px 0.8px ${SHEET_PAPER})`,
  'drop-shadow(0 2px 2.5px rgba(26, 26, 26, 0.3))',
].join(' ')

/**
 * T33 follow-up (orchestrator screenshot review, "the cues work but are
 * nearly invisible"): the idle-nudge cue's own hand — a marker-style
 * pointing hand, drawn from three plain rounded rects (never a filled dot or
 * a grey cloth-coloured rect, both too small/muted to register for a
 * 6-year-old), paper-filled with the SAME thick dark ink outline the rest of
 * the app's chrome uses. Local coordinates: `(0, 0)` is the WRIST — the
 * anchor a caller translates to `from`/`to` and rotates toward the
 * direction of travel around, the same convention `directionArrow`'s own
 * dart already uses (rotate around its own local origin, never the SVG's).
 * The palm/thumb sit BEHIND the wrist (negative x), the index finger points
 * AHEAD of it (positive x) — rest orientation +x, `rotate(deg)` matches
 * `screen/directionArrow.ts`'s own SVG-clockwise convention.
 *
 * Overall bounding box: x in [-30, 48] (78 wide), y in [-36, 26] (62 tall).
 * BOTH dimensions matter, not just the larger one: a rotated hand's
 * on-screen AXIS-ALIGNED box shrinks toward its SMALLER local dimension at
 * a 90-degree direction of travel (a level whose route starts nearly
 * vertical) — 62 stays comfortably above the task's own "56px" measured
 * floor even then, confirmed live (`hedgehog1`, whose spine anchors point in
 * every direction around the body, measured 59.7-93px across several
 * anchors, never below the floor; the horizontal `glass1` wipe, the one
 * angle with NO rotation gain, measured 77.4x51.6 — its own local size,
 * unrotated). The un-rotated width (78) lands just past the task's own
 * "64-80 px" TARGET band, on purpose: that band describes the icon at its
 * OWN size, and the 90-degree case needed height raised to match rather than
 * width trimmed down.
 */
const HAND_CUE_PALM = { x: -30, y: -26, width: 42, height: 52, rx: 18 }
const HAND_CUE_THUMB = { x: -24, y: -36, width: 18, height: 16, rx: 8 }
const HAND_CUE_FINGER = { x: 8, y: -8, width: 40, height: 16, rx: 8 }
const HAND_CUE_STROKE = 4

/** One hand instance (palm + thumb + finger), reused for the live cue and
 *  each trailing ghost behind it — `opacity` is the only thing that ever
 *  differs between calls. */
function HandCueShape({ opacity }: { opacity: number }): ReactNode {
  return (
    <g opacity={opacity}>
      <rect {...HAND_CUE_PALM} fill={SHEET_PAPER} stroke={INK_COLOR} strokeWidth={HAND_CUE_STROKE} />
      <rect {...HAND_CUE_THUMB} fill={SHEET_PAPER} stroke={INK_COLOR} strokeWidth={HAND_CUE_STROKE} />
      <rect {...HAND_CUE_FINGER} fill={SHEET_PAPER} stroke={INK_COLOR} strokeWidth={HAND_CUE_STROKE} />
    </g>
  )
}

/** Trailing ghost copies behind the live hand — a delayed START of the SAME
 *  translate animation reads as "a moment behind", the cheapest correct way
 *  to trail a translate+rotate without a second geometry system. The first
 *  entry (`delay: 0`, full opacity) IS the live hand a child actually reads
 *  as "the hand"; the other two are the fading trail. */
const HAND_CUE_TRAIL: readonly { delay: number; opacity: number }[] = [
  { delay: 0, opacity: 1 },
  { delay: 0.12, opacity: 0.4 },
  { delay: 0.24, opacity: 0.18 },
]

/**
 * The carried character (`LevelConfig.carrier`), and the point it rests on
 * before the stroke begins — the start of the route.
 *
 * The task stops being "trace a line" and becomes "carry someone across", which
 * is the same motor demand wrapped in an intention a six-year-old already has.
 * No theme and no illustration: docs/04 §2 puts theme out of scope for the MVP,
 * so this is a shape that reads as A THING BEING CARRIED and nothing more.
 */
export type TraceCarrier = TraceMarker

/** Carrier body. Muted sage — its own hue, so it is never confused with the
 * hazard, the start dot or the goal. The pale outline is what keeps it legible
 * where it sits on top of the child's own dark ink. */
const CARRIER_COLOR = '#5f8a86'
const CARRIER_OUTLINE = SHEET_PAPER

/**
 * One clue mark placed on the sheet (`detective-mode` design unit 4, spec:
 * trace-canvas "Clue Layer Rendering"), following the `TraceHazards` prop
 * precedent above: index-aligned readonly data, values computed OUTSIDE this
 * component. WHICH art a mark shows is already resolved by the caller — this
 * component imports nothing from `detective/` and holds no token of its own,
 * so `drained` vs. `earned` is entirely the caller's decision (design.md
 * "Interfaces / Contracts"). That contract is unchanged; only its currency
 * is, from a colour to an `href`, because the shipped art is raster (see
 * `detective/assets.ts`'s header for why).
 */
export interface TraceClueMark {
  /** Origin-centred art, positioned by `translate(x,y) rotate(angle)` — no
   * offset arithmetic. The image is centred on that origin by its own
   * `x`/`y`, not by the group, so the transform stays a pure placement. */
  x: number
  y: number
  angle: number
  /** Root-absolute path into `public/` (`/art/…`), never a Vite import and
   * never a `url(#…)` reference. */
  href: string
  /** The source file's intrinsic pixel size, used only to hold aspect while
   * scaling to `size`. */
  w: number
  h: number
  /** The mark's rendered HEIGHT in viewBox units. Width follows from the
   * aspect ratio, so a tall feather and a wide footprint agree on how big
   * "one clue mark" is. */
  size: number
}

/** All of one level's clue marks. Absent = no clue layer, and the surface
 * pays nothing for it. */
export interface TraceClues {
  marks: readonly TraceClueMark[]
}

/** One scattered layer of ground: WHERE the marks go (`groundScatter`, pure and
 * seeded) and WHICH art they may draw from. The split is the same contract the
 * clue layer uses — this component resolves nothing and imports nothing from
 * `detective/`; `ScatterMark.art` indexes straight into `art` below. */
export interface TraceGroundLayer {
  marks: readonly ScatterMark[]
  /** Root-absolute `/art/…` paths with their intrinsic pixel size, so a mark's
   * width follows from its requested height without squashing. */
  art: readonly { href: string; w: number; h: number }[]
}

/**
 * Turns the maze from a diagram into a PLACE: the "outside" becomes grass and
 * the corridor becomes trodden earth (docs/09 §7).
 *
 * Presence of this prop is the whole switch. Absent, the maze is painted
 * exactly as it always was — grey wall, paper channel — which is what keeps the
 * six non-detective phase-1 mazes and the letter workbench untouched.
 *
 * Mud is listed first because it is painted first: it belongs to the corridor,
 * grass belongs to everything else, and both sit UNDER the guides, the markers,
 * the ink, the clue marks and the carrier.
 */
export interface TraceGround {
  grass: TraceGroundLayer
  mud: TraceGroundLayer
}

/**
 * The sector's drawn place, laid UNDER the maze block (duck-undulations-and-
 * sector-backdrop design.md §3.4). Presence of this prop is the whole
 * switch: the full-sheet wall rect is skipped (the backdrop IS the wall)
 * and the channel is stroked in `SHEET_PAPER` whatever `ground` says,
 * because `CORRIDOR_EARTH` fails `docs/09_GUIA_DE_ESTILO_VISUAL.md`
 * section 4's `>= 55` luma law against water by 49.
 *
 * No import from `zoo/` or `detective/` — the same structural convention
 * {@link TraceCarrierArt} follows, so this file never depends on the
 * registries that resolve `href`/`quiet`.
 */
export interface TraceBackdrop {
  href: string
  /** Painted flat under the art so a slow image never flashes a bare
   * sheet. */
  quiet: string
  /** The corridor channel's own paint, when this backdrop declares one
   * (design.md §2.1, row C). ABSENT = {@link SHEET_PAPER}, which is what
   * keeps the lagoon backdrop byte-identical to before this field existed:
   * there is no admissible LIGHT channel over either mountain backdrop, so a
   * dark `channel` is the only remaining move for those two. */
  channel?: string
  /** A marker outline stroked UNDER the channel, {@link CHANNEL_EDGE_WIDTH}
   * wider on each side (T50, `odd/tasks/prewriting-stage-completion.md`).
   * ABSENT = no outline, byte-identical to before this field existed. The
   * round-2 backgrounds are detailed scenes, not a flat band, so the light
   * or dark pixels a channel can land next to span almost the whole luma
   * range: no single channel paint clears every one of them by the 55-luma
   * law. An outline makes the channel's own boundary the channel-vs-edge
   * contrast instead, whatever the art behind it does. */
  edge?: string
}

/** How far, in viewBox units, a {@link TraceBackdrop.edge} outline shows
 * past each side of the channel. About the art's own marker line at the
 * sheet's usual 1-1.3 px per unit. */
export const CHANNEL_EDGE_WIDTH = 5

/**
 * Static art standing at one or more points on the sheet — the sheep on
 * their humps, the llamas on their summits (design.md §3.3). Structural, no
 * import from `zoo/`/`levels/`, the same convention {@link TraceCarrierArt}
 * and {@link TraceStandingArt} follow.
 */
export interface TraceVertexArt {
  href: string
  w: number
  h: number
  /** Rendered HEIGHT in viewBox units, per image. Width follows the aspect
   * ratio. */
  size: number
  /** Where each copy stands, sheet coordinates. One `<image>` per entry. */
  at: readonly { x: number; y: number }[]
}

/**
 * Override the hardcoded carrier shape with registry art (design.md "Decision:
 * assets behind a typed registry..."; "carrierArt override stays"). Absent =
 * the shipped sage figure below, so every existing caller is untouched.
 *
 * It is an `ArtImage`-shaped raster now rather than a `d` + colour pair. The
 * reason the glass used to be drawn IN INK was that a colour of its own would
 * crowd `PLUME` while colour in this mode only ever means "a clue was earned"
 * — the art pipeline honours the same rule by keeping the glass's authored
 * ink contour instead of tinting it.
 */
export interface TraceCarrierArt {
  href: string
  w: number
  h: number
  /** [case-registry-and-captions, Phase 8] Where the carrier is HELD, as a
   * fraction of its own box — read by `canvas/placeArt.ts` (design.md §7).
   * Absent centres on the bounding box, same as `placeArt`'s own default.
   * `detective/assets.ts`'s `CARRIER_LENS_ART` is the one caller that
   * declares this today; this type stays structural (no import from
   * `detective/`) so `ArtImage` satisfies it by shape alone. */
  grip?: readonly [number, number]
  /** Rendered HEIGHT, overriding {@link CARRIER_ART_SIZE}. Absent = the
   * shipped 104, sized for the lens's transparent handle margin — a cutout
   * that fills its own box (the bee) needs its own number
   * (`LevelConfig.carrierArt.size`, the carrier-visibility repair). */
  size?: number
}

/** Rendered HEIGHT of a `carrierArt` override, in viewBox units — big enough
 * to read as a held object on the 1000x600 sheet without covering the ink it
 * travels over (docs/09 §3).
 *
 * This is the height of the FILE, and the glass file is padded: `build_art.py`
 * centres it on its lens, which leaves roughly a quarter of the canvas as
 * transparent margin balancing the handle. So the glass the child actually
 * sees is about three quarters of this number, and this is sized accordingly
 * rather than to the guide's bare figure. */
const CARRIER_ART_SIZE = 104

/**
 * Registry art standing AT one end of the route, in place of the engine's own
 * marker glyph.
 *
 * The convention is the one `docs/09_GUIA_DE_ESTILO_VISUAL.md` sets for every
 * character in this world: the art's ORIGIN IS ITS FEET, so it stands on the
 * point rather than being bisected by it. That is the whole reason this is a
 * type of its own instead of another `TraceCarrierArt` — the carrier is centred
 * on the fingertip because it is a held object, and a character is not.
 *
 * Like `TraceClueMark`, this component resolves nothing: WHICH picture stands
 * there (a lit lamp or an unlit one) is entirely the caller's decision.
 */
export interface TraceStandingArt {
  /** Root-absolute path into `public/` (`/art/…`), never a `url(#…)`. */
  href: string
  /** Intrinsic pixel size, used only to hold aspect while scaling to `size`. */
  w: number
  h: number
  /** Rendered HEIGHT in viewBox units. Width follows from the aspect ratio. */
  size: number
  /**
   * Where the feet actually land, when it differs from the route's own
   * marker point. Absent on every ordinary route, where "on the point" (the
   * grip's whole reason to exist, above) is exactly where a character should
   * stand.
   *
   * An art-corridor route is the one place it is not: `target.start` sits on
   * the drawn body's OWN centreline (the traced path is the animal's spine),
   * so a character planted there with its feet at that point stands chest-
   * deep in the animal and its 96-unit body rises straight up over the head
   * (`snake1`'s start octopus, found on a screenshot — the diagnostic doc's
   * N3). Every other route lies on open ground, where the marker point
   * already IS where feet belong. `screen/LevelPlay.tsx` sets this only for
   * an art-corridor level's start art, offset onto the sand beside the body.
   */
  at?: { x: number; y: number }
}

/**
 * T38 (`odd/tasks/prewriting-stage-completion.md`, the author's tablet play-
 * test): "cuando no estoy apretando que la lupa esté en la mano del pulpo ...
 * una vez que pongo el dedo ... debería cambiar a una imagen sin la lupa y
 * debería aparecer la lupa que me sigue el dedo". One object, one place at a
 * time: at rest the character standing at the start holds it (so the loose
 * carrier is hidden), while a stroke is live the character is drawn empty-
 * handed and the carrier rides the fingertip.
 *
 * Pure so the rest/drawing split is testable without a DOM (`isDrawing` only
 * flips on a real pointer, which `renderToString` cannot produce). With no
 * `emptyHanded` art the carrier is not held by anyone and keeps its pre-T38
 * behaviour: always shown, `startArt` unchanged.
 */
export function heldCarrierView(
  drawing: boolean,
  startArt: TraceStandingArt | undefined,
  emptyHanded: TraceStandingArt | undefined,
): { standing: TraceStandingArt | undefined; carrierVisible: boolean } {
  if (!startArt || !emptyHanded) return { standing: startArt, carrierVisible: true }
  return drawing ? { standing: emptyHanded, carrierVisible: true } : { standing: startArt, carrierVisible: false }
}

/**
 * One tile of the reveal grid's covering layer (`reveal-grid` capability,
 * design.md §4.1). Structural, no import from `levels/`/`zoo/` — the same
 * convention {@link TraceBackdrop} and {@link TraceVertexArt} follow.
 */
export interface TraceRevealTile {
  x: number
  y: number
  w: number
  h: number
  /** 0.25 | 0.5 | 0.75 | 1 — five steps, and a tile at 0 is simply absent
   *  from `TraceReveal.tiles` (design.md §1.5): the levels layer's
   *  `revealTiles` projection excludes it entirely. Emitted as an `opacity`
   *  attribute only when `< 1`, so an untouched veil is the cheapest
   *  possible markup. */
  opacity: number
}

/**
 * The reveal grid's whole render contract: one plain `<rect>` per tile and,
 * for a `light` level, the hidden objects lying UNDER them. No `<mask>`,
 * `<pattern>`, `<clipPath>`, `<defs>`, `useId`, or `url(#…)` reference is
 * ever introduced by this layer — the same ban {@link MAZE_WALL}'s own
 * header documents.
 */
export interface TraceReveal {
  /** The veil's own paint — a reveal level's `backdrop?.tile`. */
  fill: string
  /** An opt-in visual treatment owned by the current level projection. The
   * default stays the plain tile contract; `sand`, `leaves` and `mud` change
   * only how those same remaining tiles are painted. This union is a closed
   * list of NAMED surfaces on purpose — each one is a render-local policy
   * inside `RevealLayer`, not a registry a level can extend, so adding a
   * surface stays a typed compile-time decision rather than runtime
   * configuration. */
  visual?: 'sand' | 'leaves' | 'mud'
  tiles: readonly TraceRevealTile[]
  /** Hidden objects for light discovery. Undiscovered objects stay under the veil;
   * discovered objects may be celebrated above it. */
  art?: readonly { href: string; w: number; h: number; size: number; x: number; y: number; revealed?: boolean }[]
  /** The live torch point for light reveal levels. Null when the finger is up. */
  light?: {
    x: number
    y: number
    radius: number
    complete: boolean
    /** T10 (`odd/tasks/prewriting-stage-completion.md`, "add animations to
     *  the darkness"): `[0, 1]`, only meaningful when `complete` is true —
     *  how far the scene-wide completion wash has grown outward. Absent (or
     *  `1`) means either not complete yet, or complete and already fully
     *  grown; `canvas/RevealLayer.tsx` is the one reader, since it alone
     *  knows the screen it has to grow to fill (`displayBounds`). */
    growth?: number
  } | null
}

/** One art-corridor piece's own render box (art-corridor spec, "Art Corridor
 *  Layer Render Contract"). The BOX already reflects wherever the piece
 *  currently sits — `placeArtCorridor`'s output during the trace phase, or
 *  the live arrange state's own scatter/held/snapped position — so this
 *  layer never asks WHY a box is where it is, only draws it there. */
export interface TraceArtCorridorPiece {
  href: string
  box: ArtBox
  /** Degrees, about the box's own centre. Absent = 0 (no `transform`
   *  attribute at all, so an unrotated piece's markup stays plain). */
  rotate?: number
  /**
   * T20 (`odd/tasks/prewriting-stage-completion.md`, docs/19 §3.1): the
   * colour-follows-the-finger mechanic. When present, `href` above is the
   * GREY base image and `colourHref` is the same picture in colour;
   * `ArtCorridorLayer.tsx` windows `colourHref` in over the grey base,
   * revealed from the head, through a nested `<svg>` whose own width is
   * `progress` of the box's — see that file's header for why a nested `<svg>`
   * and not a slice array or a CSS mask. Absent `colourHref`/`progress`
   * (every non-snake art-corridor consumer today) renders exactly as before:
   * one plain `<image>`, no nested `<svg>` at all.
   */
  colourHref?: string
  /** `[0, 1]`. Only meaningful together with `colourHref`. */
  progress?: number
  /**
   * T20: this is the next piece the child should wake (docs/19 §3.1 point 5,
   * "the Pulpito points at which one is next and it pulses softly") — a
   * gentle opacity pulse (`.cv-snake-next`, `screen/LevelPlay.tsx`'s
   * `LAYOUT_CSS`), never a colour or transform, so a rotated piece
   * (`snake3`'s vertical family) has no transform-origin concern.
   */
  next?: boolean
}

export type TraceArtCorridor = readonly TraceArtCorridorPiece[]

/** One waypoint's render-ready picture (`free-trail-waypoints` capability,
 *  design.md §5). Structural, no import from `levels/`/`detective/` — the
 *  same convention {@link TraceBackdrop}/{@link TraceVertexArt} follow. */
export interface TraceWaypointArt {
  href: string
  w: number
  h: number
  size: number
  x: number
  y: number
}

/** One touch-radius overlay ring, `?debug=estela:<k>` only. */
export interface TraceWaypointRing {
  x: number
  y: number
  radius: number
}

/**
 * The waypoint fold's whole render contract: N plain `<image>`s (the
 * flowers, then the hive) and, only under `?debug=estela:<k>`, their touch
 * radii as plain `<circle>`s. No `<mask>`, `<pattern>`, `<clipPath>`,
 * `<defs>`, `useId`, or `url(#…)` reference is ever introduced by this layer.
 */
export interface TraceWaypoints {
  art: readonly TraceWaypointArt[]
  /** `?debug=estela:<k>` ONLY. Absent = no overlay, which is every frame a
   *  child ever sees. */
  rings?: readonly TraceWaypointRing[]
  ringStroke?: string
}

/** One anchor's render-ready mark (`radial-spines` capability, design.md
 *  §5). Structural, no import from `levels/`/`detective/` — the same
 *  convention {@link TraceWaypointArt}/{@link TraceBackdrop} follow. */
export interface TraceSpineMark {
  x: number
  y: number
  filled: boolean
  /** T3 (radial-spines' "draw here next" hint) — optional so every existing
   *  fixture literal (`{ x, y, filled }`, no `next`) still type-checks;
   *  `SpineLayer` treats absent the same as `false`. */
  next?: boolean
}

/**
 * The spine fold's whole render contract: one plain `<image>` for the
 * body, one plain `<circle>` per anchor mark (filled vs unfilled is a
 * `fill` swap on the identical shape), and — only under
 * `?debug=espinas:<k>` — one debug ring per anchor. No `<mask>`,
 * `<pattern>`, `<clipPath>`, `<defs>`, `useId`, or `url(#…)` reference is
 * ever introduced by this layer.
 */
export interface TraceSpines {
  body: { href: string; x: number; y: number; width: number; height: number }
  marks: readonly TraceSpineMark[]
  markRadius: number
  /** Resolved by the CALLER, never inside the layer — `TraceClueMark`'s own
   *  convention. `TORCH_CHALK_DIM` / `TORCH_CHALK`. */
  dim: string
  earned: string
  /** `?debug=espinas:<k>` ONLY. Absent = no overlay, which is every frame a
   *  child ever sees. */
  rings?: readonly { x: number; y: number; radius: number }[]
  ringStroke?: string
  /** T13 (tablet playtest #2, "a stroke that isn't a spine could disappear
   *  when I lift the finger"): a just-released stroke that did NOT settle
   *  into a spine, rendered here as fading ink — never through
   *  `TraceCanvasProps.completedStrokes`, which paints every entry at the
   *  SAME fixed opacity forever and has no per-entry fade. Points, not a
   *  pre-built path: `SpineLayer` runs it through the same `inkPath(trace
   *  Ink(...))` pipeline `screen/LevelPlay.tsx` already imports from
   *  `canvas/ink.ts`, so a rejected stroke looks exactly like the ink it
   *  just was before it fades. Absent = nothing fading, every existing
   *  caller's byte-identical default. */
  fading?: readonly { id: number; points: readonly { x: number; y: number }[] }[]
  /** Stroke colour for `fading` entries — the caller's own ink colour
   *  (`INK_COLOR`, this file), so a fading rejected stroke reads as the
   *  ink it just was rather than the chalk `dim`/`earned` marks use.
   *  Required only alongside `fading`. */
  fadingColor?: string
  /** T19 (`odd/tasks/prewriting-stage-completion.md` §3.3, "el trazo se
   *  convierte en espina"): one `M`/`L` triangle path per FILLED anchor —
   *  `levels/spines.ts`'s `spineSpikePaths` — replacing the raw ink of the
   *  stroke that earned it. Absent = no spikes, every pre-T19 caller's
   *  byte-identical default (an empty family, or one mid-render before any
   *  anchor fills). */
  spikes?: readonly string[]
  /** Fill/outline for `spikes` — resolved by the CALLER, never inside the
   *  layer (`TraceClueMark`'s own convention, restated for the spike). A
   *  dark fill with a marker-style outline (docs/19 §3.3: "relleno oscuro y
   *  contorno de marcador"). Required only alongside `spikes`. */
  spikeFill?: string
  spikeStroke?: string
}

/** The WINDOW, when it is narrower than the world (`scrolling-camera`
 *  capability, design.md §2.1). Absent = the window IS the world and the
 *  `viewBox` attribute is the shipped expression, character for character.
 *  Structural, no import from `levels/` — the same convention
 *  {@link TraceBackdrop}/{@link TraceVertexArt} follow. */
export interface TraceCamera {
  viewWidth: number
  lead: number
  /** Where the attempt starts. Seeded by `?debug=camara:<x>` through
   *  `seedCameraOrigin`, so the FIRST PAINT, the server render, a screenshot
   *  taken before the first frame, and the rAF loop's monotone floor are all
   *  the same number — they cannot tell different stories. Same reason
   *  `hazardHome` exists above. */
  originX: number
}

/** How long the abandoned ink takes to fade on a reset. Long enough to be seen
 * as a departure rather than a glitch, short enough that the child is not kept
 * waiting to start again. */
const RESET_FADE_MS = 500

export interface TraceCanvasProps {
  /** Faint ideal-path guide line drawn under the ink (free mode). A single
   * `d` string keeps the previous one-path behavior; an array renders one
   * `<path>` per entry — no connecting line across pen-lift boundaries (a
   * letter's `pathDefinition.segments`, trace-canvas "Guide Path Pen-Lift
   * Fidelity"). */
  guide?: string | string[]
  /** Full glyph contour (incl. counter-holes) for the evenodd FILL layer of
   * the guide (a real cursive 'a'/'c' shape the child can see and follow). */
  guideD?: string
  /** Animated draw demo(s) (guided mode) — input is ignored until they end.
   * A single `DrawDemo` keeps the previous one-path behavior; an array renders
   * one `motion.path` per entry, each with its own d/delay/duration. */
  demo?: DrawDemo | DrawDemo[]
  /** False ignores pointer input entirely (guided demo phase). */
  enabled?: boolean
  /** Called when a NEW stroke begins (modes clear the previous feedback). */
  onStart?: () => void
  /** Called each frame with the live capture (guided rail feed). `timeMs` is
   * THIS surface's animation clock — the same `performance.now()` reading the
   * hazards were just drawn at, so a caller's hit test and the picture the
   * child is looking at are one frame of one clock. Additive: two-argument
   * callers are unaffected. */
  onFrame?: (points: TracePoint[], drawing: boolean, timeMs: number) => void
  /** Called exactly once per moved-stroke release (single evaluation). The
   * third argument is the full completed-stroke list including the stroke just
   * released — additive, so two-argument callers are unaffected. */
  onRelease?: (points: TracePoint[], pointerType: string, strokes: TracePoint[][]) => void
  /** Extra SVG children — rescue hints / star feedback overlays. */
  children?: ReactNode
  /** DEV overlay: checkpoints to visualize (lit in activation order). */
  devCheckpoints?: LetterCheckpoint[]
  /** DEV overlay: dense ideal cloud used for the approximate distance score. */
  devIdeal?: ReadonlyArray<readonly [number, number]>
  /** Render the checkpoint overlay outside dev mode too (main-screen toggle).
   * Default false — the dev gate stays unchanged. */
  showCheckpoints?: boolean
  /** Visible walkable channel, drawn UNDER everything else (level engine). */
  corridor?: TraceCorridor
  /** Thin dashed centre line over the corridor (assisted-rail phases). */
  showCentreLine?: boolean
  /** The paper itself. `'ruled'` (the default, so every existing caller is
   * untouched) draws the four-line pauta; `'blank'` draws NO ruled lines at
   * all. Fases 1-2 train visuomotor control and rhythm, where the writing
   * zones carry no meaning — showing them there spends the child's attention
   * on something they cannot yet use (docs/01 principle 1). */
  surface?: 'blank' | 'ruled'
  /** Render the `corridor` as WALLS instead of a soft channel: the sheet is
   * filled with `MAZE_WALL` and the corridor is knocked out of it through an
   * SVG mask. A fase-1 sendero is a laberinto (docs/01 fase 1) — a grey hint on
   * open paper is not, and a child can leave it without noticing. */
  maze?: boolean
  /** T33 (`odd/tasks/prewriting-stage-completion.md`, "help a stuck child"):
   *  strengthen the START marker's own pulse — absent/`false` leaves the
   *  static dot/art exactly as it always rendered (`.cv-idle-nudge-start`,
   *  `LAYOUT_CSS` in `screen/LevelPlay.tsx`, is the only thing this flag
   *  adds). Applied to whichever of the two start blocks below actually
   *  renders (the plain green dot, or `startArt` when a level authors one)
   *  — never both, since only one of the two ever mounts. */
  idleNudgeActive?: boolean
  /** T33: the short "look here" cue that slides once from `from` to `to`
   *  when the child has left the sheet untouched for a while (or, once per
   *  level, as a stand-in intro for the two levels with no route to
   *  demonstrate — `screen/idleNudgeCue.ts`'s own `hasIntroCue`). `cueKey`
   *  changes on every fresh occurrence so the mount-triggered slide replays
   *  instead of freezing at its finished frame; `reducedMotion` renders the
   *  cue sitting still at `to`, no animation at all (docs/01 accessibility:
   *  a reduced-motion viewer is owed the finished frame, the same contract
   *  `levels/revealGrid.ts`'s own `growthFraction` already documents).
   *  `null`/absent renders nothing. */
  idleCue?: {
    visual: 'hand' | 'wipe' | 'torch'
    from: { x: number; y: number }
    to: { x: number; y: number }
    cueKey: number
    reducedMotion: boolean
  } | null
  /** RENDER-ONLY point transform for the assisted rail (`canvas/rail.ts`).
   *
   * It is applied to the live ink and to nothing else. `onRelease` still hands
   * back the RAW captured points, because the evaluator must score the child
   * and not the assist — see the rule at the top of `rail.ts`. */
  inkWarp?: (point: TracePoint) => { x: number; y: number }
  /** Let the child lift the finger and keep going (forwarded to useTraceInput). */
  multiStroke?: boolean
  /** Already-released strokes, drawn as settled ink beneath the live ink. */
  completedStrokes?: ReadonlyArray<ReadonlyArray<{ x: number; y: number }>>
  /** Green start dot — where the stroke must begin. */
  startMarker?: TraceMarker
  /** Stand this art at `startMarker` INSTEAD of the green dot. Absent = the
   * shipped dot, so every existing caller is untouched. With a character
   * already standing on the spot the dot is not additional information, it is
   * a second thing saying the same thing — and `docs/01` principle 1 spends
   * the child's attention on one. Has no effect without `startMarker`. */
  startArt?: TraceStandingArt
  /** T38: the same character as `startArt`, drawn WITHOUT the carried
   * object in hand. Present = the carrier rests IN `startArt`'s hand: while
   * no stroke is live only `startArt` shows (it already holds the object, so
   * the separate carrier is hidden), and while the finger is down this art
   * replaces `startArt` and the carrier rides the fingertip. Absent = the
   * carrier is always shown, resting on its home point — every caller that
   * predates T38. Has no effect without `startArt` and `carrier`. See
   * {@link heldCarrierView}. */
  startArtEmptyHanded?: TraceStandingArt
  /** Goal mark — where the route ends. Drawn UNDER the start dot and the arrow
   * and always HOLLOW, which is what makes a collision harmless by
   * construction: on a closed shape like `f3-o` the route ends about where it
   * began, and the goal simply nests around the green dot instead of hiding it.
   * No fixed offset could have guaranteed that. */
  endMarker?: TraceMarker
  /** Stand this art at `endMarker` INSTEAD of the two hollow diamonds, same
   * contract as `startArt`. The diamonds' nesting trick exists so a route that
   * ends where it began does not occlude the start dot; a detective trail
   * supplies both ends' art and places them at opposite ends of an open route,
   * so there is nothing left for it to protect against. Has no effect without
   * `endMarker`. */
  endArt?: TraceStandingArt
  /** T45 (`docs/21` N5/N6): a segment level's own start dots and stop marks,
   * one entry per segment — every segment is its own stroke, so each one
   * says where it starts (the green dot) and where it STOPS (the same
   * hollow diamonds `endMarker` draws). `start` is absent where something
   * else already stands on it (the octopus on the first segment). Absent =
   * nothing drawn, every level that predates it. */
  routeMarkers?: ReadonlyArray<{ start?: TraceMarker; end: TraceMarker }>
  /** Small arrow head showing the direction of travel. */
  directionArrow?: TraceDirectionArrow
  /** True dims the LIVE ink instead of tinting it red: the light goes down,
   * the stroke is never marked wrong (docs/01 principle 2). */
  offPath?: boolean
  /**
   * What the CHILD'S OWN LINE is made of — settled ink, fading ink and live
   * ink alike. Defaults to {@link INK_COLOR}, so every existing caller draws
   * the same slate it always did.
   *
   * This is a prop and not a change to `INK_COLOR` itself on purpose.
   * `INK_COLOR` is exported and does three other jobs — it paints the carrier,
   * the hazards and every marker the `inkOnly` mode silhouettes — and on a
   * detective trail those must all STAY ink: they are the world, drawn in the
   * world's one colour. It is only the trace the child leaves that stops being
   * ink there and becomes MUD, because a trail is walked, not written.
   */
  inkColor?: string
  /** The LIVE ink's colour while `offPath` is true — the dimmed state, not an
   * error colour (docs/01 principle 2). Defaults to the shipped cool grey. A
   * caller that overrides `inkColor` should override this too, or the line
   * jumps hue the moment the child drifts: the dim has to read as the SAME
   * substance with the light down. */
  inkDimColor?: string
  /** Width of the normalized viewBox. Defaults to 1000; a level whose path is
   * wider than that asks for more paper so nothing is clipped at the edge. The
   * HEIGHT never changes — see `VIEWBOX_HEIGHT`. Pointer input needs no change
   * either: normalization goes through `getScreenCTM().inverse()`, which reads
   * the live viewBox (docs/02 §3). */
  viewBoxWidth?: number
  /** Top of the VISIBLE viewBox band, in sheet units. Defaults to 0 (the whole
   * sheet). Cropping the empty margin above the ascender ceiling flattens the
   * aspect ratio, which is what lets a height-constrained screen give the
   * letters more room (docs/02 §3). Nothing moves in sheet coordinates, so the
   * ruled lines, the corridor, the guide and the ink all stay put. */
  viewBoxY?: number
  /** Height of the VISIBLE viewBox band. Defaults to the full 600. */
  viewBoxHeight?: number
  /** How the surface is sized in CSS. `'width'` (the default) keeps the
   * historic `width="100%"`, so the element's height follows from the aspect
   * ratio and the page grows with it. `'contain'` fills a flex-sized parent in
   * BOTH axes and lets `preserveAspectRatio="xMidYMid meet"` scale the sheet to
   * the larger of the two limits — the fit a full-viewport level needs when the
   * height, not the width, is the constraint (docs/04 §3.3). */
  fit?: 'width' | 'contain'
  /** Any CHANGE of this value clears the live buffer AND the completed strokes
   * ("Borrar"). Value-change is the whole contract — the number itself is
   * meaningless, which keeps the clear testable without an imperative handle. */
  clearSignal?: number
  /** Timed hazards crossing the route. Absent = none, and the surface pays
   * nothing for them. */
  hazards?: TraceHazards
  /** Draw a small character riding the fingertip, resting on this point until
   * the stroke begins. Absent = no carrier. */
  carrier?: TraceCarrier
  /** Override the carrier's shipped shape with registry art, drawn in ink.
   * Absent = the shipped sage figure. Has no effect without `carrier`. */
  carrierArt?: TraceCarrierArt
  /** Renders the engine's own markers -- goal, start, direction arrow and
   * hazards -- in INK instead of their shipped colours.
   *
   * `detective-mode`'s whole art direction is that the world is ink on paper
   * and colour means a clue was EARNED. The shipped markers break that on
   * sight: the goal is `#b45309`, which sits in the warm-clay band the mode's
   * palette test exists to stay out of, and a hazard is a saturated `#7e6a9e`
   * circle -- between them the two loudest things on the sheet, and neither is
   * a clue. That palette test asserted the earned colours do not APPROACH
   * these; it never asserted these do not RENDER, which was the half that
   * mattered. */
  inkOnly?: boolean
  /** Suppresses every INK layer (`guide`, `demo`, settled strokes, `endArt`)
   * while the object-arrange phase is open (`docs/13` §8 row E, design.md
   * §5.2) — leaving pointer capture, the backdrop, the channel, and the
   * `artCorridor` layer entirely unaffected. Deliberately NOT applied to
   * the live current-stroke `<path>`: its rAF loop is also what drives the
   * `onFrame` callback (the caller's whole game loop, arrange fold
   * included), so unmounting it would silence `onFrame` itself. That path
   * carries no `d` in SSR either way (only the client-side rAF loop ever
   * sets one), so this is a no-op for the static markup a test can see.
   * Absent or `false` renders exactly as before this change. */
  inkHidden?: boolean
  /** Explicit child-ink lifecycle. 'settled' persists released marks; 'live-only' shows only the active stroke; 'none' renders no child ink. */
  inkPolicy?: InkRenderPolicy
  /** The snake adventure's drawn-cutout corridor pieces (`art-corridor`/
   * `object-arrange` capabilities), rendered above the channel stroke and
   * below every ink layer. Absent = no corridor-art layer, which is every
   * level that predates this field. */
  artCorridor?: TraceArtCorridor
  /** Clue marks (`detective-mode`), rendered as their own `<g>` layer UNDER
   * the ink — see `TraceClueMark`. Absent = no clue layer. */
  clues?: TraceClues
  /** Grass and mud scatter (docs/09 §7). Absent = the shipped grey maze; see
   * `TraceGround`. Has no effect without `maze` + `corridor`. */
  ground?: TraceGround
  /** The sector's drawn backdrop, laid under the maze block. Absent = the
   * shipped grey wall / paper or field / earth channel, byte-identical to
   * before this prop existed. See {@link TraceBackdrop}. */
  backdrop?: TraceBackdrop
  /** Static art standing at one or more points on the route (design.md
   * §3.3). Absent = no vertex-art layer, byte-identical to before this prop
   * existed. See {@link TraceVertexArt}. */
  vertexArt?: TraceVertexArt
  /** T17 (`odd/tasks/prewriting-stage-completion.md`, collect-along-the-path
   * follow-up): the SAME shape as {@link TraceVertexArt}, for a picture that
   * has just been collected and is hopping away toward the top bar instead
   * of standing still. Rendered with `.cv-collect-hop` (a one-shot keyframe,
   * `forwards` fill — the same idiom `.cv-spine-fading` already uses), on
   * its OWN layer so a departing picture is never confused with a steady
   * one at the type level. Absent = no departing layer, which is every
   * level that predates this field. */
  vertexArtDeparting?: TraceVertexArt
  /** The reveal grid's covering layer (`reveal-grid` capability), rendered
   * above the backdrop and below every ink layer. Absent = no reveal layer
   * at all, byte-identical to before this prop existed. See
   * {@link TraceReveal}. */
  reveal?: TraceReveal
  /** [T44] A routed level played by torchlight (`LevelConfig.torch`,
   * `canvas/TorchLayer.tsx`): the pool of light goes UNDER the clue marks,
   * the darkness OVER them and under the live ink, the carrier and the
   * hazards. Absent on every other level. */
  torch?: TraceTorch
  /** T33 (`odd/tasks/prewriting-stage-completion.md`): the night's own
   *  second-level hint sparkle (`levels/revealGrid.ts`'s `nightHintFor`),
   *  forwarded straight to `RevealLayer` — this component owns no geometry
   *  of its own for it. `null`/absent draws nothing, which is every level
   *  that is not a `light` reveal, and a `light` reveal before its own
   *  15s-of-no-find delay has elapsed. */
  nightHint?: { x: number; y: number } | null
  /** The waypoint fold's render projection (`free-trail-waypoints`
   * capability), rendered in the SAME slot as `reveal` — a bee level has no
   * corridor, no ground and no reveal, so this is the only thing between
   * the backdrop and the ink. Absent = no waypoint layer at all,
   * byte-identical to before this prop existed. See {@link TraceWaypoints}. */
  waypoints?: TraceWaypoints
  /** The spine fold's render projection (`radial-spines` capability),
   *  rendered in the SAME slot as `reveal`/`waypoints` — a hedgehog level
   *  has no corridor, no ground and no reveal, so this is the only thing
   *  between the backdrop and the ink. Absent = no spine layer at all,
   *  byte-identical to before this prop existed. See {@link TraceSpines}. */
  spines?: TraceSpines
  /** The WINDOW, narrower than the world, when this level declares one
   * (`scrolling-camera` capability). Absent = the window IS the world:
   * `camera?.originX ?? 0` and `camera?.viewWidth ?? viewBoxWidth` fall back
   * to the shipped expression, byte-identical to before this prop existed.
   * See {@link TraceCamera}. */
  camera?: TraceCamera
  /** Any CHANGE of this value RESTARTS THE RUN (`LevelConfig.resetOnContact`):
   * the stroke in progress is abandoned, both buffers are emptied, and the ink
   * that was on the sheet FADES rather than vanishing.
   *
   * The fade is the whole kindness of it. An instant disappearance reads as a
   * glitch or a snatch; a half-second departure reads as "that run is over,
   * start again". Nothing turns red and nothing sounds — docs/01 principle 2
   * forbids punishing the child, not letting the level have a rule.
   *
   * Same value-change contract as `clearSignal`, for the same reason. */
  resetSignal?: number
  /**
   * T7 rework #2 (`odd/tasks/prewriting-stage-completion.md`, "nothing
   * playable sits under a button"): the floating chrome's own measured CSS-
   * pixel footprint on each edge of the container — `LevelPlay.tsx` owns
   * the actual measurement (its header/footer rows' own `ResizeObserver`s)
   * and hands the four numbers down here. All four default to 0 (no
   * insets, the T7-rework-#1 behaviour) — only meaningful under `fit
   * ="contain"` with a `backdrop` (`fitContentWithInsets`'s own guard).
   */
  insetTop?: number
  insetBottom?: number
  insetLeft?: number
  insetRight?: number
}

export default function TraceCanvas({
  guide,
  guideD,
  demo,
  enabled = true,
  onStart,
  onFrame,
  onRelease,
  children,
  devCheckpoints,
  devIdeal,
  showCheckpoints = false,
  corridor,
  showCentreLine = false,
  surface = 'ruled',
  maze = false,
  idleNudgeActive = false,
  idleCue,
  inkWarp,
  multiStroke = false,
  completedStrokes,
  startMarker,
  startArt,
  startArtEmptyHanded,
  endMarker,
  endArt,
  routeMarkers,
  directionArrow,
  offPath = false,
  inkColor = INK_COLOR,
  inkDimColor = OFF_PATH_INK,
  viewBoxWidth = DEFAULT_VIEWBOX_WIDTH,
  viewBoxY = 0,
  viewBoxHeight = VIEWBOX_HEIGHT,
  fit = 'width',
  clearSignal,
  hazards,
  carrier,
  carrierArt,
  inkOnly = false,
  inkHidden = false,
  inkPolicy = 'settled',
  artCorridor,
  clues,
  ground,
  backdrop,
  vertexArt,
  vertexArtDeparting,
  reveal,
  torch,
  nightHint,
  waypoints,
  spines,
  camera,
  resetSignal,
  insetTop,
  insetBottom,
  insetLeft,
  insetRight,
}: TraceCanvasProps) {
  // `contain` letterboxes inside its box, so the CSS background would paint the
  // whole box instead of the sheet. The paper becomes a viewBox-space rect so
  // the visible paper is exactly the sheet, whatever the box shape.
  const contain = fit === 'contain'
  const svgRef = useRef<SVGSVGElement | null>(null)
  // T7 rework (`odd/tasks/prewriting-stage-completion.md`, "the art is drawn
  // twice" / "the art still does NOT fill the screen"): the container's own
  // on-screen CSS-pixel size, measured via `ResizeObserver` rather than
  // assumed — `LevelPlay.tsx`'s own `.cv-sheet` is `position: fixed; inset:
  // 0` (rework #2), so this IS the viewport, but no fixed constant could
  // stand in for it across every device this app runs on regardless. `null`
  // before the first measurement (SSR, and the very first client paint) is
  // the exact "no expansion" default `fitContentWithInsets`/
  // `fitCameraContentWithInsets` both already treat as a no-op (their own
  // `containerWidth > 0` guard) — a level rendered before layout settles is
  // BYTE-IDENTICAL to before this rework, the same real-browser-only split
  // this file's own rAF-driven ink loop already lives by.
  const [containerSize, setContainerSize] = useState<{ width: number; height: number } | null>(null)
  useEffect(() => {
    if (!contain) return undefined
    const el = svgRef.current
    if (!el || typeof ResizeObserver === 'undefined') return undefined
    const observer = new ResizeObserver((entries) => {
      const box = entries[0]?.contentRect
      if (box && box.width > 0 && box.height > 0) setContainerSize({ width: box.width, height: box.height })
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [contain])
  const inkRef = useRef<SVGPathElement | null>(null)
  const drawingRef = useRef(false)
  const { bind, pointsRef, clearStrokes, abortStroke, isDrawing } = useTraceInput(svgRef, {
    enabled,
    onStart,
    onEnd: onRelease,
    multiStroke,
  })
  // T38: who holds the carrier right now — see `heldCarrierView`.
  const held = heldCarrierView(isDrawing, startArt, carrier ? startArtEmptyHanded : undefined)
  const standingStartArt = held.standing
  const showLiveInkLayer = inkPolicyAllowsLive(inkPolicy)
  const showSettledInk = inkPolicyAllowsSettled(inkPolicy)
  useEffect(() => {
    drawingRef.current = isDrawing // mirror so the frame-loop closure never reads stale state
  }, [isDrawing])

  // "Borrar": clearing on the FIRST run is a no-op (both buffers start empty),
  // so no mount guard is needed — every later value change is a real clear.
  useEffect(() => {
    clearStrokes()
  }, [clearSignal, clearStrokes])

  // DEV overlay state. Computed live inside the rAF loop but THROTTLED (~10Hz
  // and only when the stroke length changed) so it never competes with the
  // 60fps ink loop for setState. Enabled ONLY by the production toggle AND
  // both props (trace-canvas "Checkpoint Overlay Gate") — dev mode alone must
  // NOT force the overlay (it only shows the live score line).
  const devOn = showCheckpoints && !!devCheckpoints && !!devIdeal
  const [devState, setDevState] = useState<DevCheckpointState | null>(null)
  const devCPRef = useRef(devCheckpoints)
  const devIdealRef = useRef(devIdeal)
  const devOnRef = useRef(devOn)
  const lastLenRef = useRef(-1)
  const lastTimeRef = useRef(0)
  devCPRef.current = devCheckpoints
  devIdealRef.current = devIdeal
  devOnRef.current = devOn

  // The corridor geometry, derived once per corridor. A taper re-cuts the route
  // into ~40 width-varying pieces (`corridorTaper`); without one the corridor
  // stays the single constant-width stroke it has always been, and the taper
  // code never runs. `null` also covers a degenerate route.
  const corridorPieces = useMemo<CorridorSegment[] | null>(() => {
    if (!corridor?.taper) return null
    const pieces = taperedCorridor(corridor.paths, corridor.width, corridor.taper)
    return pieces.length > 0 ? pieces : null
  }, [corridor])
  const mazeOn = maze && !!corridor

  // Settled ink of the strokes already released, as `d` strings. Memoized here
  // rather than inline in the JSX because the reset fade needs to keep them
  // after the caller has cleared them (see `settledRef`).
  const settledDs = useMemo(
    () => (completedStrokes ?? []).map((stroke) => inkPath(traceInk(stroke))),
    [completedStrokes],
  )

  // Hazards and carrier are read by the rAF loop, never by it through props.
  // The union is a second branch, not a wrapper: `trail1`'s circle stays a
  // bare `SVGCircleElement`, never a `<g>` (design.md §4's corrected choice).
  const hazardEls = useRef<Array<SVGCircleElement | SVGGElement | null>>([])
  const hazardsRef = useRef(hazards)
  hazardsRef.current = hazards
  const carrierEl = useRef<SVGGElement | null>(null)
  const carrierRef = useRef(carrier)
  carrierRef.current = carrier
  // The camera, mirrored the identical way: read by the rAF loop, never
  // through props. `cameraRef`/`viewBoxWidthRef` are reassigned every render,
  // exactly like `hazardsRef`/`carrierRef` above, because the loop only ever
  // reads the CURRENT `viewWidth`/`lead`/world-width from them.
  //
  // `cameraXRef` is different: it is the loop's OWN monotone floor, mutated
  // imperatively frame to frame, so it must NOT be reassigned on every
  // render (an unrelated re-render — e.g. the throttled dev-overlay state —
  // would otherwise snap a mid-attempt camera straight back to its seed).
  // It is seeded once via `useRef`'s lazy initializer and re-seeded ONLY
  // when `camera.originX` itself changes value, which happens exactly at
  // mount and at every reset site (`LevelPlay`'s one `seedCameraOrigin`
  // initialiser) — never merely because the component re-rendered.
  const cameraRef = useRef(camera)
  cameraRef.current = camera
  const viewBoxWidthRef = useRef(viewBoxWidth)
  viewBoxWidthRef.current = viewBoxWidth
  // The WINDOW — the exact rectangle the `<svg>`'s own `viewBox` attribute
  // and the backdrop `<image>` were already sized to before this rework
  // (`camera?.originX ?? 0` / `camera?.viewWidth ?? viewBoxWidth`,
  // `viewBoxY`/`viewBoxHeight`) — named once here instead of staying two
  // separate inline literals, so the expansion below and the plain render
  // read the exact same box.
  const windowBounds: ArtBox = {
    x: camera?.originX ?? 0,
    y: viewBoxY,
    width: camera?.viewWidth ?? viewBoxWidth,
    height: viewBoxHeight,
  }
  // T7 rework #2: fit the WINDOW into the container MINUS the chrome's own
  // safe insets, then expand to the container's FULL aspect ratio — the
  // backdrop `<image>` below (sized to THIS box, with the SAME `xMidYMid
  // slice` fit it always used) covers every pixel of the viewport as one
  // continuous picture, INCLUDING behind the chrome, while the PLAYABLE
  // content stays clear of it (`fitContentWithInsets`'s own header). Gated
  // on `backdrop`: a level with no backdrop image has nothing to extend, so
  // its `viewBox` stays byte-identical to before. A camera level grows
  // HEIGHT ONLY and ignores left/right insets (`fitCameraContentWithInsets`'s
  // own header) — the moving window's WIDTH stays exactly what the rAF loop
  // already scrolls.
  const insets: SafeInsets = {
    top: insetTop ?? 0,
    bottom: insetBottom ?? 0,
    left: insetLeft ?? 0,
    right: insetRight ?? 0,
  }
  const displayBounds: ArtBox =
    contain && backdrop && containerSize
      ? camera
        ? fitCameraContentWithInsets(windowBounds, containerSize.width, containerSize.height, insets)
        : fitContentWithInsets(windowBounds, containerSize.width, containerSize.height, insets)
      : windowBounds
  // Mirrored into refs for the SAME reason `viewBoxWidthRef`/`cameraRef`
  // are above: the rAF loop's camera branch (below) imperatively rewrites
  // the live `viewBox` attribute every frame, inside a `useEffect` whose
  // own dependency array does not include these — reading the bare closure
  // values (as the pre-T7 code did, when they were always constant for a
  // level's whole mount) would go stale the instant a resize changes
  // `containerSize` mid-run.
  const displayYRef = useRef(displayBounds.y)
  displayYRef.current = displayBounds.y
  const displayHeightRef = useRef(displayBounds.height)
  displayHeightRef.current = displayBounds.height
  // The backdrop `<image>` itself, mutated the SAME way the `<svg>`'s own
  // `viewBox` is (post-verify amendment A4, design.md §3): pinned to the
  // WINDOW on a camera level, so the lagoon's banks and reeds stay in frame
  // at every magnification instead of panning an already-cropped slice of
  // open water under a fixed window. `null` on every level with no backdrop
  // — the optional chaining below is the whole guard.
  const backdropImgRef = useRef<SVGImageElement | null>(null)
  const cameraXRef = useRef(camera?.originX ?? 0)
  const cameraOriginSeed = camera?.originX
  useEffect(() => {
    cameraXRef.current = cameraOriginSeed ?? 0
  }, [cameraOriginSeed])
  // Hazards are placed at t=0 in the markup so the FIRST paint (and the server
  // render, and a screenshot taken before the first frame) already shows them
  // on the route instead of at the origin.
  const hazardHome = useMemo(
    () => (hazards ? hazards.radii.map((_, i) => hazards.at(i, 0)) : []),
    [hazards],
  )

  // Assisted-rail mirror of the live stroke. Points are warped ONCE, as they
  // arrive, and cached — re-warping the whole buffer every frame would make the
  // ink loop O(n) in stroke length and cost exactly the 60fps the surface
  // exists to protect. The raw `pointsRef` is never modified: it is what
  // `onRelease` hands the evaluator (see `rail.ts`).
  const warpedRef = useRef<TracePoint[]>([])
  const warpSourceRef = useRef<TracePoint[] | null>(null)
  const inkWarpRef = useRef(inkWarp)
  inkWarpRef.current = inkWarp

  useEffect(() => {
    const path = inkRef.current
    if (!path) return
    let raf = 0
    let lastD = ''
    const frame = (): void => {
      // ONE clock for the whole surface, read exactly once per frame: the ink,
      // the hazard positions, the dev throttle and the caller's `onFrame` all
      // use this reading. Scattering `performance.now()`/`Date.now()` calls
      // would let the drawn hazard and the hit test disagree by a frame, and a
      // hazard that hits where it is not drawn is unplayable.
      const now = performance.now()
      const points = pointsRef.current
      // `useTraceInput` assigns a FRESH array on every pointerdown/cancel, so
      // an identity change is an exact "new stroke" signal — no length
      // heuristics, no stale warped tail bleeding into the next stroke.
      const warp = inkWarpRef.current
      let rendered: TracePoint[] = points
      if (warp) {
        if (warpSourceRef.current !== points || warpedRef.current.length > points.length) {
          warpSourceRef.current = points
          warpedRef.current = []
        }
        const cache = warpedRef.current
        for (let i = cache.length; i < points.length; i++) {
          const raw = points[i]
          const pulled = warp(raw)
          cache.push({ ...raw, x: pulled.x, y: pulled.y })
        }
        rendered = cache
      } else if (warpedRef.current.length > 0) {
        warpedRef.current = []
        warpSourceRef.current = null
      }
      if (rendered.length === 0) {
        // Stroke ended or cancelled: clear the ink (spec "pointercancel clears").
        if (lastD !== '') {
          lastD = ''
          path.setAttribute('d', '')
        }
      } else if (!inkPolicyAllowsLive(inkPolicy, drawingRef.current)) {
        if (lastD !== '') {
          lastD = ''
          path.setAttribute('d', '')
        }
      } else {
        const d = inkPath(traceInk(rendered))
        if (d !== lastD) {
          lastD = d
          path.setAttribute('d', d)
        }
      }
      // Timed hazards. Same discipline as the ink: two attribute writes per
      // hazard per frame, never React state — driving five circles from
      // `setState` at 60fps is precisely the cost this loop exists to avoid.
      const hz = hazardsRef.current
      if (hz) {
        // Read ONCE per frame, not per hazard, and from the same expression
        // the JSX below branches on — so the picture and the loop can never
        // disagree about which shape a hazard is (design.md §4).
        const byTransform = !!hz.art
        for (let i = 0; i < hz.radii.length; i++) {
          const el = hazardEls.current[i]
          if (!el) continue
          const p = hz.at(i, now)
          if (byTransform) {
            el.setAttribute('transform', `translate(${p.x} ${p.y})`)
          } else {
            el.setAttribute('cx', String(p.x))
            el.setAttribute('cy', String(p.y))
          }
        }
      }

      // The carried character rides the fingertip while drawing and waits on
      // the start of the route otherwise. `rendered` is used on purpose, so on
      // an assisted level the carrier travels with the ink the child SEES.
      const home = carrierRef.current
      if (home && carrierEl.current) {
        const head = drawingRef.current ? rendered[rendered.length - 1] : undefined
        carrierEl.current.setAttribute(
          'transform',
          `translate(${head ? head.x : home.x} ${head ? head.y : home.y})`,
        )
      }

      // The world advances with the trace (`docs/13` §8 row G). Written from
      // the SAME `rendered` array, in the SAME callback, one statement after
      // the carrier — so the ink, the carried character and the world can
      // never disagree about where the finger is (design.md §2.3).
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
          // `displayYRef`/`displayHeightRef`, not the bare `viewBoxY`/
          // `viewBoxHeight` closure values — T7 rework, see their own
          // declaration comment above: only WIDTH is pinned to `cam
          // .viewWidth` (`fitCameraContentWithInsets`'s own contract), the
          // vertical expansion can still change after this effect's own
          // setup if a resize updates `containerSize` mid-run.
          svg.setAttribute('viewBox', `${next} ${displayYRef.current} ${cam.viewWidth} ${displayHeightRef.current}`)
          // The backdrop image's `x` follows the SAME origin, one statement
          // later, so the lagoon and the window can never disagree about
          // where the camera is (post-verify amendment A4, design.md §3).
          backdropImgRef.current?.setAttribute('x', String(next))
        }
      }

      if (devOnRef.current && devCPRef.current && devIdealRef.current) {
        if (points.length !== lastLenRef.current || now - lastTimeRef.current >= 100) {
          lastLenRef.current = points.length
          lastTimeRef.current = now
          setDevState(devCheckpointState(points, devCPRef.current, devIdealRef.current))
        }
      }
      onFrame?.(pointsRef.current, drawingRef.current, now)
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [pointsRef, onFrame, inkPolicy])

  // ---- Restart the run (`resetSignal`, docs/01 principle 2) ----------------
  // The ink that was on the sheet is snapshotted into a layer of its own and
  // faded out, so the run visibly ENDS instead of being snatched away.
  const [fading, setFading] = useState<{ ink: string; strokes: string[] } | null>(null)
  const [fadedOut, setFadedOut] = useState(false)
  // Deliberately LAGGING mirror of `settledDs`: the caller clears its completed
  // strokes in the very commit that bumps `resetSignal`, so by the time the
  // effect below runs the prop is already empty and the strokes to fade would
  // be lost. Updated by an effect declared AFTER that one — passive effects run
  // in hook declaration order within a commit, which is what makes the lag
  // exact rather than lucky.
  const settledRef = useRef<string[]>(settledDs)

  useEffect(() => {
    if (resetSignal === undefined) return
    // Read the live ink straight off the DOM: the rAF loop owns that attribute
    // and there is no React copy of it. This runs before the next frame clears
    // it, so it is still the stroke the child was drawing.
    const ink = inkRef.current?.getAttribute('d') ?? ''
    const strokes = settledRef.current
    abortStroke()
    if (ink === '' && strokes.length === 0) {
      // Nothing on the sheet — mount, or a reset with no stroke to abandon.
      setFading(null)
      return
    }
    setFading({ ink, strokes })
    setFadedOut(false)
  }, [resetSignal, abortStroke])

  useEffect(() => {
    settledRef.current = settledDs
  }, [settledDs])

  useEffect(() => {
    if (!fading) return
    // The layer has to PAINT at full opacity before the transition to zero
    // begins, or the engine collapses both values into one style and the fade
    // is never seen. One frame is the whole delay.
    const raf = requestAnimationFrame(() => setFadedOut(true))
    const done = window.setTimeout(() => setFading(null), RESET_FADE_MS + 80)
    return () => {
      cancelAnimationFrame(raf)
      window.clearTimeout(done)
    }
  }, [fading])

  const setHazardEl = useCallback(
    (index: number, el: SVGCircleElement | SVGGElement | null): void => {
      hazardEls.current[index] = el
    },
    [],
  )

  // The VISIBLE sheet, in viewBox units — the same rectangle the `<svg>` and
  // the paper rect below are given. `startArt`/`endArt` are clamped into it so
  // a route that begins or ends against an edge cannot cut its character in
  // half (`clampArtBox`, `canvas/placeArt.ts`). Deliberately the visible band
  // (`viewBoxY`/`viewBoxHeight`), not the full 600: a cropped level shows less
  // paper, and the character has to fit in what is actually shown.
  const sheetBounds = { x: 0, y: viewBoxY, width: viewBoxWidth, height: viewBoxHeight }

  return (
    <svg
      ref={svgRef}
      // The WINDOW, not the world — grown to `displayBounds` (T7 rework)
      // when a backdrop needs the extra room; byte-identical to the old
      // inline expression (`camera?.originX ?? 0`/`viewBoxY`/`camera
      // ?.viewWidth ?? viewBoxWidth`/`viewBoxHeight`) whenever it is not.
      viewBox={`${displayBounds.x} ${displayBounds.y} ${displayBounds.width} ${displayBounds.height}`}
      width="100%"
      height={contain ? '100%' : undefined}
      // The SVG default, spelled out: `contain` depends on it to scale the
      // sheet down to the smaller of the two limits and centre the remainder.
      preserveAspectRatio="xMidYMid meet"
      style={{
        touchAction: 'none', // spec: pointer events must not scroll/zoom the page
        display: 'block',
        cursor: isDrawing ? 'crosshair' : 'default',
        background: contain ? undefined : SHEET_PAPER,
        borderRadius: contain ? undefined : 12,
        // A flex item's automatic minimum size comes from the intrinsic aspect
        // ratio, so a sheet whose ratio-derived width exceeds a narrow screen
        // would refuse to shrink and push the whole column sideways. `contain`
        // means "never wider than the box", so the minimum has to be released.
        ...(contain ? { minWidth: 0, minHeight: 0 } : null),
      }}
      aria-label="Trace surface: draw the letter between the sky and grass guides"
      {...bind}
    >
      {contain && (
        <rect
          x={0}
          y={viewBoxY}
          width={viewBoxWidth}
          height={viewBoxHeight}
          // NO `rx`. A rounded corner is half of what made the sheet read as a
          // CARD floating on a page instead of as the world (docs/09 §7: "la
          // hoja … debería ocupar la pantalla"). The other half was the page
          // background behind the letterbox bars — see `LevelPlay`'s
          // `LAYOUT_CSS`.
          // When the ground is on, this base rect takes the FIELD colour, not
          // the paper. It is not a taste call: the ground rect painted over it
          // antialiases against this one at the viewBox edge, and a paper-white
          // base bleeds a 2px `#d4dfc9` hairline down both sides of the sheet —
          // measured, not guessed. Matching the two kills the seam, and nothing
          // renders the base anywhere else once the field covers it.
          fill={ground ? GROUND_FIELD : SHEET_PAPER}
          pointerEvents="none"
        />
      )}
      {backdrop && (
        // The sector's drawn place (design.md §3.4). Between the base rect
        // above and the maze block below — the only position that is not
        // hidden by either: after the maze block the wall rect would already
        // cover it, before the base rect the base rect would cover it. Plain
        // `<image href>` with `slice` ON THE IMAGE, never the root `<svg>` —
        // no `<mask>`, `<pattern>`, `<clipPath>`, `<defs>`, `useId`, no
        // `url(#…)` (this file's own scar, above).
        <g pointerEvents="none">
          <rect x={displayBounds.x} y={displayBounds.y} width={displayBounds.width} height={displayBounds.height} fill={backdrop.quiet} />
          {/* Sized to `displayBounds` (T7 rework), the SAME box the `<svg>`'s
              own `viewBox` above uses — `xMidYMid slice`, already centred on
              that box, is what turns "the window grew" into "more of the
              SAME picture is now visible", never a second independently-fit
              copy (`fitContentWithInsets`'s own header). Byte-identical to
              the old window-sized rect whenever `displayBounds` has not
              grown. The rAF loop mutates `x` imperatively, in step with the
              `viewBox` write, via `backdropImgRef` — only `x` ever needs to,
              since a camera level's own width/height are pinned
              (`fitCameraContentWithInsets`'s own contract: width never
              moves, height only through `displayYRef`/`displayHeightRef`,
              which React's ordinary re-render already keeps this JSX in
              sync with). */}
          <image
            ref={backdropImgRef}
            href={backdrop.href}
            x={displayBounds.x}
            y={displayBounds.y}
            width={displayBounds.width}
            height={displayBounds.height}
            preserveAspectRatio="xMidYMid slice"
          />
        </g>
      )}
      {reveal && (
        // The reveal grid's covering layer (`reveal-grid` capability,
        // design.md §4.1-4.2): immediately after the backdrop group and
        // before the maze/corridor block — a reveal level has no corridor
        // and no ground, so on the twelve entrance/night levels this is the
        // only thing between the backdrop and the guides. Plain `<rect>`s,
        // this file's own scar (above): no `<mask>`, `<pattern>`,
        // `<clipPath>`, `<defs>`, `useId`, no `url(#…)`.
        //
        // `displayBounds` (T7 rework): the expanded window, so the night
        // veil's own full-cover darkness and the cleaning policies' outer
        // margin patch (`RevealLayer`'s own header) reach the same area the
        // backdrop `<image>` now covers — never leaving unclean/undark art
        // visible in the margin `sheetBounds` alone would leave uncovered.
        <RevealLayer reveal={reveal} sheetBounds={sheetBounds} displayBounds={displayBounds} nightHint={nightHint} />
      )}
      {waypoints && (
        // The waypoint fold's render projection (`free-trail-waypoints`
        // capability, design.md §5): the SAME slot as `reveal` above — a bee
        // level has no corridor, no ground and no reveal, so this is the
        // only thing between the backdrop and the ink. Plain `<image>`s and,
        // debug-only, plain `<circle>`s — this file's own scar (above): no
        // `<mask>`, `<pattern>`, `<clipPath>`, `<defs>`, `useId`, no
        // `url(#…)`.
        <WaypointLayer waypoints={waypoints} sheetBounds={sheetBounds} />
      )}
      {spines && (
        // The spine fold's render projection (`radial-spines` capability,
        // design.md §5): the SAME slot as `reveal`/`waypoints` above — a
        // hedgehog level has no corridor, no ground and no reveal, so this
        // is the only thing between the backdrop and the ink. Plain
        // `<image>` and plain `<circle>`s — this file's own scar (above):
        // no `<mask>`, `<pattern>`, `<clipPath>`, `<defs>`, `useId`, no
        // `url(#…)`.
        <SpineLayer spines={spines} sheetBounds={sheetBounds} />
      )}
      {corridor && !artCorridor && (mazeOn || ground || !!backdrop) && (
        // MAZE (docs/01 fase 1: "senderos y laberintos … sin tocar los
        // bordes"). The sheet is filled solid and the corridor is painted BACK
        // OVER it in the paper colour, so the child sees a channel through a
        // field instead of a grey line on open paper.
        //
        // `!artCorridor`: this block paints the WALKABLE-CHANNEL colour along
        // the level's own centreline, `corridor.width` wide, UNDER the art —
        // on an art-corridor level the drawn body already IS the channel
        // (`levels/artCorridor.ts`'s own header), so painting a second one
        // underneath is redundant at best. At worst it is visible: the
        // channel follows the FITTED spine `d`, which tracks the real drawn
        // body only to within a few viewBox units (`artCorridor.ts`'s own
        // `residual`), so at the wave's tightest curves the painted band
        // pokes a sliver out past the body's own black outline — the
        // `backdrop.channel` colour is dark earth, not sand, so it reads as
        // a stray dark mark riding the snake rather than as paper showing
        // through. Screenshot on `snake1`'s own start piece, `?nivel=snake1`.
        //
        // GROUND WITHOUT A MAZE runs this too, and the `|| ground` is not a
        // convenience. The two flags used to move together because every level
        // with ground on was also a maze. Nivel 3's U levels are the first that
        // are not: they are in the detective world, so the sheet is a field of
        // grass, but they keep `maze: false` because a pattern level has a
        // SHAPE the child is learning and `guide={showShapeLine && !level.maze}`
        // takes that line away inside a maze.
        //
        // With ground on and this block skipped, the channel fell back to the
        // soft `CORRIDOR_FILL` grey-blue, which is the NO-ground styling and
        // was never meant to be seen against grass. Measured on a render: the
        // channel came out `#cad6d1` against a `#c9d7bd` field — two luma
        // apart, so the only thing actually marking the route was the absence
        // of grass tufts on it. A level whose whole rule is "stay inside the
        // channel" was not drawing a channel a child could see. Painting the
        // earth here costs nothing on a maze, where the wall rect above already
        // covers the sheet before the same stroke runs.
        //
        // Two ordinary paints, no `<defs>`, no `url(#…)`, no mask — see
        // `MAZE_WALL` for the whole reason. The corridor is stroked at exactly
        // the same width, caps and joins the knockout used, so the picture is
        // unchanged; a tapered corridor is the same paint repeated once per
        // width-varying piece.
        //
        // `ground` swaps only the two COLOURS — grey wall becomes field, paper
        // channel becomes trodden earth. The stroking MECHANISM is untouched on
        // purpose: it is the whole substance of the `url(#…)` scar, and
        // `TraceCanvas.test.tsx` proves the taper by parsing the emitted
        // stroke/stroke-width pairs.
        <g pointerEvents="none">
          {mazeOn && !backdrop && (
            <rect
              x={0}
              y={viewBoxY}
              width={viewBoxWidth}
              height={viewBoxHeight}
              fill={ground ? GROUND_FIELD : MAZE_WALL}
            />
          )}
          {/* T50: the channel's marker outline, every piece BEFORE any
              channel stroke, so one piece's outline never paints over a
              neighbouring piece's channel. */}
          {backdrop?.edge &&
            (corridorPieces
              ? corridorPieces.map((piece, idx) => (
                  <path
                    key={`edge-${idx}`}
                    d={piece.d}
                    fill="none"
                    stroke={backdrop.edge}
                    strokeWidth={piece.width + 2 * CHANNEL_EDGE_WIDTH}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    data-channel-edge="true"
                  />
                ))
              : corridor.paths.map((cd, idx) => (
                  <path
                    key={`edge-${idx}`}
                    d={cd}
                    fill="none"
                    stroke={backdrop.edge}
                    strokeWidth={corridor.width + 2 * CHANNEL_EDGE_WIDTH}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    data-channel-edge="true"
                  />
                )))}
          {corridorPieces
            ? corridorPieces.map((piece, idx) => (
                <path
                  key={`channel-${idx}`}
                  d={piece.d}
                  fill="none"
                  stroke={ground && !backdrop ? CORRIDOR_EARTH : (backdrop?.channel ?? SHEET_PAPER)}
                  strokeWidth={piece.width}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ))
            : corridor.paths.map((cd, idx) => (
                <path
                  key={`channel-${idx}`}
                  d={cd}
                  fill="none"
                  stroke={ground && !backdrop ? CORRIDOR_EARTH : (backdrop?.channel ?? SHEET_PAPER)}
                  strokeWidth={corridor.width}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ))}
        </g>
      )}
      {artCorridor && (
        // The snake adventure's own drawn-cutout pieces: above the channel
        // stroke (the hollow each snake lies in) and below every ink layer
        // (trace-canvas spec, "Art Corridor Layer Renders as Plain
        // Images..."). Live through both the arrange and trace phases — the
        // CALLER decides which box each piece gets; this only draws it.
        <ArtCorridorLayer artCorridor={artCorridor} />
      )}
      {ground && (
        // The ground itself: individual `<image>` marks, because a texture FILL
        // would need `<pattern>` + `url(#id)` and confining one to the corridor
        // would need `<clipPath>` — both banned here (see `MAZE_WALL`), and the
        // corridor has no fillable polygon to clip against anyway; it only ever
        // exists as a stroked centreline. `groundScatter` places the marks
        // against that centreline instead, deterministically, so the field does
        // not crawl between renders.
        //
        // Mud first, then grass, and the whole layer BELOW the guides, markers,
        // ink, clue marks and carrier. Nothing here may compete with the clue
        // marks: they are the only thing on this sheet the child is hunting.
        <g pointerEvents="none">
          {[ground.mud, ground.grass].map((layer, layerIdx) =>
            layer.marks.map((mark, idx) => {
              const img = layer.art[mark.art]
              if (!img) return null
              const width = (mark.size * img.w) / img.h
              return (
                <image
                  key={`ground-${layerIdx}-${idx}`}
                  href={img.href}
                  x={-width / 2}
                  y={-mark.size / 2}
                  width={width}
                  height={mark.size}
                  transform={`translate(${mark.x} ${mark.y}) rotate(${mark.angle})`}
                  preserveAspectRatio="xMidYMid meet"
                />
              )
            }),
          )}
        </g>
      )}
      {corridor && !artCorridor && !mazeOn && !backdrop && (
        // Walkable channel (docs/08 §2), UNDER everything else so the ruled
        // pauta and the ink both read on top of it. A tapered corridor is the
        // same channel cut into width-varying pieces (`corridorTaper`).
        // `!artCorridor`: same reason as the block above — no art-corridor
        // level actually reaches this branch today (every one authors a
        // `backdrop`), kept in step so a future one that did not would not
        // reopen the same poke-through.
        <g>
          {corridorPieces
            ? corridorPieces.map((piece, idx) => (
                <path
                  key={idx}
                  d={piece.d}
                  fill="none"
                  stroke={CORRIDOR_FILL}
                  strokeWidth={piece.width}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={0.55}
                  pointerEvents="none"
                />
              ))
            : corridor.paths.map((cd, idx) => (
                <path
                  key={idx}
                  d={cd}
                  fill="none"
                  stroke={CORRIDOR_FILL}
                  strokeWidth={corridor.width}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={0.55}
                  pointerEvents="none"
                />
              ))}
        </g>
      )}
      {corridor && showCentreLine && (
        <g pointerEvents="none">
          {corridor.paths.map((cd, idx) => (
            <path
              key={`centre-${idx}`}
              d={cd}
              fill="none"
              stroke="#94a3b8"
              strokeWidth={2}
              strokeDasharray="10 10"
              opacity={0.5}
            />
          ))}
        </g>
      )}
      {surface === 'ruled' && (
        // The three-zone pauta. Fases 1-2 pass `surface='blank'` and get none
        // of it: a maze has no sky, no grass and no roots (docs/01 principle 1).
        <g>
          <line x1={0} y1={SKY_GUIDE_Y} x2={viewBoxWidth} y2={SKY_GUIDE_Y} stroke="#94a3b8" strokeWidth={2} strokeDasharray="12 8" />
          <line x1={0} y1={MIDDLE_GUIDE_Y} x2={viewBoxWidth} y2={MIDDLE_GUIDE_Y} stroke="#0ea5e9" strokeWidth={2.5} strokeDasharray="14 6" opacity={0.55} />
          <line x1={0} y1={BASELINE_Y} x2={viewBoxWidth} y2={BASELINE_Y} stroke="#64748b" strokeWidth={3} strokeDasharray="18 8" />
          <line x1={0} y1={ROOTS_GUIDE_Y} x2={viewBoxWidth} y2={ROOTS_GUIDE_Y} stroke="#64748b" strokeWidth={2.5} strokeDasharray="18 8" opacity={0.7} />
        </g>
      )}
      {guideD && !inkHidden && (
        <path
          d={guideD}
          fill="#334155"
          fillRule="evenodd"
          opacity={0.06}
          pointerEvents="none" // the guide never intercepts pointer input
        />
      )}
      {guide && !inkHidden && (
        <g>
          {(Array.isArray(guide) ? guide : [guide]).map((gd, idx) => (
            <path
              key={idx}
              d={gd}
              fill="none"
              stroke="#334155"
              strokeWidth={10}
              strokeLinejoin="round"
              // Readable ON TOP of the level corridor without competing with
              // the child's own ink, which is the same slate at full strength
              // (docs/01 principle 1: muted palette, nothing saturated).
              opacity={0.3}
              pointerEvents="none" // the guide never intercepts pointer input
            />
          ))}
        </g>
      )}
      {demo && !inkHidden && (
        <g>
          {(Array.isArray(demo) ? demo : [demo]).map((d, idx) => (
            <motion.path
              key={idx}
              d={d.d}
              fill="none"
              stroke={backdrop?.channel ? SHEET_PAPER : DEMO_STROKE}
              strokeWidth={d.strokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ delay: d.delay, duration: d.duration }}
              pointerEvents="none"
            />
          ))}
        </g>
      )}
      {vertexArt && (
        // Static art standing at one or more points on the route
        // (design.md §3.3) — the sheep on their humps, the llamas on their
        // summits. Same placement formula as the standing animals and the
        // carrier: origin at the FEET (`STANDING_GRIP`), clamped into the
        // sheet. Rendered BEFORE `endArt` so vertex art joins the standing-
        // character band under every ink layer.
        <g pointerEvents="none">
          {vertexArt.at.map((point, idx) => (
            <image
              key={`vertex-art-${idx}`}
              href={vertexArt.href}
              {...clampArtBox(
                placeArt({ ...vertexArt, grip: STANDING_GRIP }, vertexArt.size, point),
                sheetBounds,
              )}
              preserveAspectRatio="xMidYMid meet"
            />
          ))}
        </g>
      )}
      {vertexArtDeparting && (
        // T17: a just-collected picture hopping away — same placement
        // formula as the steady layer above, but tagged `.cv-collect-hop`
        // (LAYOUT_CSS, `screen/LevelPlay.tsx`) so it visibly leaves its spot
        // instead of a silent removal. The caller owns removing an entry
        // from `at` once its animation has actually finished (the same
        // `fadingSpineStrokes` timeout convention `SpineLayer` uses) — this
        // component only ever draws whatever it is handed.
        <g pointerEvents="none">
          {vertexArtDeparting.at.map((point, idx) => (
            <image
              key={`vertex-art-departing-${idx}`}
              className="cv-collect-hop"
              href={vertexArtDeparting.href}
              {...clampArtBox(
                placeArt({ ...vertexArtDeparting, grip: STANDING_GRIP }, vertexArtDeparting.size, point),
                sheetBounds,
              )}
              preserveAspectRatio="xMidYMid meet"
            />
          ))}
        </g>
      )}
      {endMarker && endArt && !inkHidden && (
        // Registry art standing where the route ends (`TraceStandingArt`),
        // in place of the diamonds below. Its origin is its FEET
        // (`STANDING_GRIP`) so it stands ON the end of the route instead of
        // being cut in half by it, and then `clampArtBox` slides it the
        // minimum needed to stay inside the sheet — a route ending against
        // the edge used to cut the lamp in half the other way.
        <image
          href={endArt.href}
          {...clampArtBox(
            placeArt({ ...endArt, grip: STANDING_GRIP }, endArt.size, endMarker),
            sheetBounds,
          )}
          preserveAspectRatio="xMidYMid meet"
          pointerEvents="none"
        />
      )}
      {endMarker && !endArt && (
        // The goal (docs/03 §7). Two nested HOLLOW diamonds: a silhouette no
        // child can mistake for the solid green start dot, and hollow so that
        // when the route ends near where it starts the two nest instead of
        // occluding. Drawn before the start marker so green always wins the
        // centre.
        <g
          pointerEvents="none"
          transform={`translate(${endMarker.x} ${endMarker.y})`}
          opacity={0.85}
        >
          <polygon
            points={`0,-${GOAL_OUTER_R} ${GOAL_OUTER_R},0 0,${GOAL_OUTER_R} -${GOAL_OUTER_R},0`}
            fill="none"
            stroke={inkOnly ? INK_COLOR : GOAL_COLOR}
            strokeWidth={5}
            strokeLinejoin="round"
          />
          <polygon
            points={`0,-${GOAL_INNER_R} ${GOAL_INNER_R},0 0,${GOAL_INNER_R} -${GOAL_INNER_R},0`}
            fill="none"
            stroke={inkOnly ? INK_COLOR : GOAL_COLOR}
            strokeWidth={4}
            strokeLinejoin="round"
          />
        </g>
      )}
      {routeMarkers && (
        // T45: every segment's own stop (the goal's diamonds) and start (the
        // green dot), drawn like the single-route pair below.
        <g pointerEvents="none">
          {routeMarkers.map(({ start, end }, idx) => (
            <g key={`route-marker-${idx}`}>
              <g transform={`translate(${end.x} ${end.y})`} opacity={0.85}>
                <polygon
                  points={`0,-${GOAL_OUTER_R} ${GOAL_OUTER_R},0 0,${GOAL_OUTER_R} -${GOAL_OUTER_R},0`}
                  fill="none"
                  stroke={inkOnly ? INK_COLOR : GOAL_COLOR}
                  strokeWidth={5}
                  strokeLinejoin="round"
                />
                <polygon
                  points={`0,-${GOAL_INNER_R} ${GOAL_INNER_R},0 0,${GOAL_INNER_R} -${GOAL_INNER_R},0`}
                  fill="none"
                  stroke={inkOnly ? INK_COLOR : GOAL_COLOR}
                  strokeWidth={4}
                  strokeLinejoin="round"
                />
              </g>
              {start && (
                <g>
                  <circle
                    cx={start.x}
                    cy={start.y}
                    r={22}
                    fill={inkOnly ? 'none' : '#22c55e'}
                    stroke={inkOnly ? INK_COLOR : 'none'}
                    strokeWidth={inkOnly ? 3 : 0}
                    opacity={0.9}
                  />
                  <circle cx={start.x} cy={start.y} r={5} fill="#ffffff" />
                </g>
              )}
            </g>
          ))}
        </g>
      )}
      {startMarker &&
        // Registry art standing where the route begins, feet on the point and
        // clamped into the sheet — same convention as `endArt` above, and it
        // REPLACES the green dot rather than joining it (see `startArt`).
        //
        // T38: with an empty-handed variant BOTH pictures are mounted and
        // only the one `heldCarrierView` picks is visible — the swap on touch
        // is then a visibility flip on an already-decoded image, never a
        // fresh request that would leave the spot blank for the first touch.
        [startArt, carrier ? startArtEmptyHanded : undefined].map((art, idx) =>
          art ? (
            <image
              key={`start-art-${idx}`}
              href={art.href}
              className={idleNudgeActive ? 'cv-idle-nudge-start' : undefined}
              {...clampArtBox(placeArt({ ...art, grip: STANDING_GRIP }, art.size, art.at ?? startMarker), sheetBounds)}
              preserveAspectRatio="xMidYMid meet"
              pointerEvents="none"
              visibility={art === standingStartArt ? undefined : 'hidden'}
            />
          ) : null,
        )}
      {startMarker && !startArt && (
        // "Empezá desde el punto verde" (docs/03 §7).
        <g pointerEvents="none" className={idleNudgeActive ? 'cv-idle-nudge-start' : undefined}>
          <circle
            cx={startMarker.x}
            cy={startMarker.y}
            r={22}
            fill={inkOnly ? 'none' : '#22c55e'}
            stroke={inkOnly ? INK_COLOR : 'none'}
            strokeWidth={inkOnly ? 3 : 0}
            opacity={0.9}
          />
          <circle cx={startMarker.x} cy={startMarker.y} r={5} fill="#ffffff" />
        </g>
      )}
      {idleCue && (() => {
        // T33 follow-up (orchestrator screenshot review, "the cues work but
        // are nearly invisible… make every cue unmistakable"): every
        // `idleCue.visual` now draws the SAME marker-style hand
        // (`HandCueShape`) — a filled dot and a small grey rect both read as
        // decoration, not an instruction, at this size. Only the MOTION
        // differs: `'hand'` (a routed level, the bee, a hedgehog spine)
        // slides ONCE from `from` to `to`; `'wipe'`/`'torch'` (cleaning /
        // night) scrub back and forth twice — "a wiping motion over the
        // cover" and "the hand sweeps the torch" are both a repeated pass,
        // never a one-shot slide, over ground with no single target point.
        // Keyed on `cueKey` so a fresh occurrence remounts and replays
        // `initial -> animate` instead of freezing at its last finished
        // frame. `reducedMotion` renders ONE static hand at `to`, at the
        // SAME full size — "static but still large", never shrunk.
        const angleDeg =
          (Math.atan2(idleCue.to.y - idleCue.from.y, idleCue.to.x - idleCue.from.x) * 180) / Math.PI
        const xs =
          idleCue.visual === 'hand'
            ? [idleCue.from.x, idleCue.to.x]
            : [idleCue.from.x, idleCue.to.x, idleCue.from.x, idleCue.to.x, idleCue.from.x]
        const ys =
          idleCue.visual === 'hand'
            ? [idleCue.from.y, idleCue.to.y]
            : [idleCue.from.y, idleCue.to.y, idleCue.from.y, idleCue.to.y, idleCue.from.y]
        const duration = idleCue.visual === 'hand' ? 2 : 2.4
        return (
          <g pointerEvents="none" data-idle-cue={idleCue.visual}>
            {(idleCue.reducedMotion ? [HAND_CUE_TRAIL[0]] : HAND_CUE_TRAIL).map((ghost) => (
              <motion.g
                key={`${idleCue.cueKey}-${ghost.delay}`}
                // ONLY translate here — framer-motion's `x`/`y` on an SVG
                // element compiles to `transform: translate(...)`, which
                // transform-origin never affects, so no pivot concern exists
                // for this element at all. Rotation is a SEPARATE, plain SVG
                // `transform="rotate(...)"` ATTRIBUTE one level in (below),
                // never a framer-motion CSS value: framer defaults an SVG
                // element's `transform-origin` to its own bounding-box
                // CENTRE (`transform-box: fill-box`), which would rotate the
                // hand around the wrong point (its visual centre, not the
                // wrist this group is being translated to) — measured
                // directly in this file's own SSR output before this split.
                // A plain attribute rotates around local `(0, 0)` with no
                // origin concept at all, exactly matching `directionArrow`'s
                // own dart below.
                initial={idleCue.reducedMotion ? { x: idleCue.to.x, y: idleCue.to.y } : { x: xs[0], y: ys[0] }}
                animate={idleCue.reducedMotion ? { x: idleCue.to.x, y: idleCue.to.y } : { x: xs, y: ys }}
                transition={
                  idleCue.reducedMotion
                    ? { duration: 0 }
                    : { duration, delay: ghost.delay, ease: 'easeInOut' }
                }
              >
                <g transform={`rotate(${angleDeg})`}>
                  <HandCueShape opacity={ghost.opacity} />
                </g>
              </motion.g>
            ))}
          </g>
        )
      })()}
      {directionArrow && (
        // A NOTCHED DART, not a plain triangle. The previous `0,-12 26,0 0,12`
        // was 26 long and 24 wide — near-equilateral, so at the ~23 CSS px it
        // renders at, no vertex read as "the point" and the eye simply picked
        // the topmost one: the hint pointed wherever the tangent happened to
        // tilt it. The swept-back barbs and the concave tail make the tip the
        // only sharp vertex, so the direction is unambiguous at any angle.
        // Rest orientation is +x, which is what `rotate(angle)` expects
        // (see `screen/directionArrow.ts`).
        <polygon
          points="26,0 -14,-16 -5,0 -14,16"
          fill={inkOnly ? INK_COLOR : "#22c55e"}
          opacity={0.8}
          transform={`translate(${directionArrow.x} ${directionArrow.y}) rotate(${directionArrow.angle})`}
          pointerEvents="none"
        />
      )}
      {settledDs.length > 0 && !inkHidden && showSettledInk && (
        // Settled ink of the strokes already released in this attempt.
        <g pointerEvents="none">
          {settledDs.map((d, idx) => (
            <path
              key={idx}
              d={d}
              fill="none"
              stroke={inkColor}
              strokeWidth={INK_WIDTH}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.85}
            />
          ))}
        </g>
      )}
      {fading && showSettledInk && (
        // The abandoned run, on its way out (`resetSignal`). Same ink, same
        // width, only leaving — no red, no cross, no shrink-and-pop. A plain
        // opacity transition, so nothing depends on an animation library.
        <g
          pointerEvents="none"
          opacity={fadedOut ? 0 : 0.85}
          style={{ transition: `opacity ${RESET_FADE_MS}ms ease-out` }}
        >
          {fading.strokes.map((d, idx) => (
            <path
              key={`faded-${idx}`}
              d={d}
              fill="none"
              stroke={inkColor}
              strokeWidth={INK_WIDTH}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
          {fading.ink !== '' && (
            <path
              d={fading.ink}
              fill="none"
              stroke={inkColor}
              strokeWidth={INK_WIDTH}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
        </g>
      )}
      {torch && <TorchPool torch={torch} />}
      {clues && clues.marks.length > 0 && (
        // Clue layer (design.md "Decision: clue layer is a new `clues`
        // prop, not `children`"): its own `<g>` immediately BEFORE the ink
        // path, so marks sit on the ground UNDER both the live ink and the
        // carrier — the opposite z-order `hazards` uses below, for the
        // opposite reason (a hazard must be seen coming; a clue mark must
        // never compete with the child's own trace). No animation: a
        // mark's art is a discrete attribute the caller already
        // resolved, not a value this loop mutates per frame.
        //
        // Each mark is an `<image>` CENTRED on the origin by its own negative
        // `x`/`y`, so the group transform stays pure placement and the
        // caller still does no offset arithmetic. Width comes from the
        // source file's aspect ratio against the requested height, so a
        // 103x256 feather and a 220x256 footprint read as the same "one
        // mark" size instead of one being squashed.
        <g pointerEvents="none">
          {clues.marks.map((mark, idx) => {
            const width = (mark.size * mark.w) / mark.h
            return (
              <image
                key={idx}
                href={mark.href}
                x={-width / 2}
                y={-mark.size / 2}
                width={width}
                height={mark.size}
                transform={`translate(${mark.x} ${mark.y}) rotate(${mark.angle})`}
                preserveAspectRatio="xMidYMid meet"
              />
            )
          })}
        </g>
      )}
      {torch && <TorchVeil torch={torch} displayBounds={displayBounds} />}
      <path
        ref={inkRef}
        data-ink-policy={inkPolicy}
        fill="none"
        stroke={offPath ? inkDimColor : inkColor}
        strokeWidth={INK_WIDTH}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={showLiveInkLayer ? undefined : { display: 'none' }}
      />
      {hazards && hazards.radii.length > 0 && (
        // Timed hazards, drawn ABOVE the ink on purpose: the child has to see
        // the ball coming while their own trace is already under it. `cx`/`cy`
        // are mutated by the rAF loop — these values are only the t=0 pose.
        <g pointerEvents="none">
          {hazards.radii.map((r, idx) =>
            hazards.art ? (
              // Art hazard: a SEPARATE, untouched branch from the plain
              // circle below — never a `<g>` wrapping a circle (design.md
              // §4's corrected choice). The `<image>` carries its own
              // placement and NO transform of its own: the rAF loop above
              // rewrites this GROUP's `transform` every frame, exactly as it
              // does for the carrier.
              <g
                key={idx}
                ref={(el) => setHazardEl(idx, el)}
                transform={`translate(${hazardHome[idx]?.x ?? 0} ${hazardHome[idx]?.y ?? 0})`}
              >
                <image
                  href={hazards.art.href}
                  {...placeArt(hazards.art, 2 * r, { x: 0, y: 0 })}
                  preserveAspectRatio="xMidYMid meet"
                  opacity={HAZARD_OPACITY}
                  style={{ filter: HAZARD_STICKER_FILTER }}
                />
              </g>
            ) : (
              <circle
                key={idx}
                ref={(el) => setHazardEl(idx, el)}
                cx={hazardHome[idx]?.x ?? 0}
                cy={hazardHome[idx]?.y ?? 0}
                r={r}
                fill={inkOnly ? 'none' : HAZARD_COLOR}
                stroke={inkOnly ? INK_COLOR : 'none'}
                strokeWidth={inkOnly ? 3 : 0}
                opacity={HAZARD_OPACITY}
              />
            ),
          )}
        </g>
      )}
      {carrier && (
        // The carried character. A head and a rounded body, in one muted
        // colour with a pale outline — enough to read as SOMEONE being carried
        // without becoming an illustration (docs/04 §2 keeps theme out of the
        // MVP). Topmost, because it marks where the child actually is.
        <g
          ref={carrierEl}
          pointerEvents="none"
          transform={`translate(${carrier.x} ${carrier.y})`}
          // T38: hidden (never unmounted — the rAF loop keeps its ref) while
          // the character at the start holds it (`heldCarrierView`).
          visibility={held.carrierVisible ? undefined : 'hidden'}
        >
          {carrierArt ? (
            // Registry art (`detective/assets.ts`'s `CARRIER_LENS_ART`).
            //
            // The `<image>` carries its own placement and NO transform of its
            // own: the rAF loop above rewrites `transform` on this GROUP every
            // single frame, so anything written there is gone in ~16ms.
            // Placement has to live on the child, which is why this is not
            // simply `transform="translate(-w/2 -h/2)"`.
            //
            // [case-registry-and-captions, Phase 8] `placeArt` puts
            // `carrierArt.grip` — the LENS, not the bounding box — exactly on
            // the group's own origin (`{x:0, y:0}`, since the group is already
            // translated to the carried point every frame above). This is the
            // fix for the ~11-unit drift the old bbox-centred `x`/`y` shipped
            // with (design.md §7).
            <image
              href={carrierArt.href}
              {...placeArt(carrierArt, carrierArt.size ?? CARRIER_ART_SIZE, { x: 0, y: 0 })}
              preserveAspectRatio="xMidYMid meet"
            />
          ) : (
            <>
              <rect
                x={-11}
                y={-6}
                width={22}
                height={24}
                rx={9}
                fill={CARRIER_COLOR}
                stroke={CARRIER_OUTLINE}
                strokeWidth={3}
              />
              <circle
                cx={0}
                cy={-14}
                r={8}
                fill={CARRIER_COLOR}
                stroke={CARRIER_OUTLINE}
                strokeWidth={3}
              />
            </>
          )}
        </g>
      )}
      {children}
      {devOn && devState && devCheckpoints && devIdeal && (
        <DevCheckpointOverlay
          checkpoints={devCheckpoints}
          state={devState}
          showScore={isDevMode()}
        />
      )}
    </svg>
  )
}
