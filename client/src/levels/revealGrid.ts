// The reveal grid: the mechanic behind a routeless `erase`/`light` level
// (docs/13 §4, §8 row D; design.md §1). Pure, no React, no DOM — the same
// discipline `coverage.ts` already holds to, and `coverage.ts` now DELEGATES
// here (design.md §1.3) instead of carrying its own second body.
//
// A reveal level tiles its WHOLE viewBox (design.md §1.1): `cols x rows`
// tiles over the level's own `1000 x 600` sheet (a `free`/`blank` level's
// sheet, always — `LevelPlay.tsx`'s `drawingBand` and `buildLevel.ts`'s free
// branch pin it), each tile indexed `row * cols + col` — the SAME convention
// `coverageScore` already used (`coverage.ts:59`), on purpose: a tile index
// and a coverage cell index are the same kind of number, which is what makes
// `coverageScore`'s delegation legal rather than a coincidence.
import type { Point } from '../letters/types'
import { coverageScore } from './coverage'
import type { RevealConfig, RevealObject } from './types'

/** Sheet height (`coverage.ts`'s own constant, restated here because a
 *  reveal grid's rows are independent of `COVERAGE_ROWS`). The width varies
 *  per level; the height never does (docs/02 §3). */
const SHEET_HEIGHT = 600

/** Under a tenth of the smallest tile edge on the smallest authored grid
 *  (10x6, tile 100x100 wide / 100 tall) — so no tile's quantized opacity can
 *  change across a drift this small (design.md §1.4). */
export const REVEAL_EPSILON = 2

function clampIndex(v: number, max: number): number {
  return Math.max(0, Math.min(max, v))
}

function tileIndex(col: number, row: number, cols: number): number {
  return row * cols + col
}

/** A reveal level's own grid, resolved to viewBox units. */
export interface RevealGrid {
  cols: number
  rows: number
  width: number
  radius: number
}

/**
 * Every tile the strokes cleared. A tile clears when a sample lands INSIDE
 * it, or within `radius` of its CENTRE — the union, not the disc alone,
 * which is what makes `radius: 0` degrade EXACTLY to `coverageScore`'s cell
 * marking instead of to nothing.
 *
 * Consecutive samples are joined by walking the segment in steps of half a
 * cell, and pen lifts do NOT join up: both rules are `coverage.ts:38-43`'s,
 * quoted rather than re-decided, because the two folds have to agree.
 *
 * Points outside the sheet clamp to the edge tile, exactly like
 * `coverageScore` — a stroke that runs off the paper still gets credit for
 * the edge it reached.
 */
export function clearedTiles(
  strokes: ReadonlyArray<ReadonlyArray<Point>>,
  grid: RevealGrid,
): ReadonlySet<number> {
  const { cols, rows, radius } = grid
  const width = grid.width > 0 ? grid.width : 1
  const tileW = width / cols
  const tileH = SHEET_HEIGHT / rows
  const step = Math.min(tileW, tileH) / 2

  const visited = new Set<number>()

  const mark = (x: number, y: number): void => {
    const colRaw = Math.floor(x / tileW)
    const rowRaw = Math.floor(y / tileH)
    const col = clampIndex(colRaw, cols - 1)
    const row = clampIndex(rowRaw, rows - 1)
    visited.add(tileIndex(col, row, cols))

    if (radius <= 0) return
    const colSpan = Math.ceil(radius / tileW) + 1
    const rowSpan = Math.ceil(radius / tileH) + 1
    const minCol = clampIndex(colRaw - colSpan, cols - 1)
    const maxCol = clampIndex(colRaw + colSpan, cols - 1)
    const minRow = clampIndex(rowRaw - rowSpan, rows - 1)
    const maxRow = clampIndex(rowRaw + rowSpan, rows - 1)
    for (let r = minRow; r <= maxRow; r++) {
      for (let c = minCol; c <= maxCol; c++) {
        const cx = (c + 0.5) * tileW
        const cy = (r + 0.5) * tileH
        if (Math.hypot(cx - x, cy - y) <= radius) visited.add(tileIndex(c, r, cols))
      }
    }
  }

  for (const stroke of strokes) {
    if (stroke.length === 0) continue
    mark(stroke[0].x, stroke[0].y)
    for (let i = 1; i < stroke.length; i++) {
      const from = stroke[i - 1]
      const to = stroke[i]
      const distance = Math.hypot(to.x - from.x, to.y - from.y)
      const steps = Math.max(1, Math.ceil(distance / step))
      for (let s = 1; s <= steps; s++) {
        const t = s / steps
        mark(from.x + (to.x - from.x) * t, from.y + (to.y - from.y) * t)
      }
    }
  }

  return visited
}

/** Live fold state, carried across `onFrame` samples for one attempt. */
export interface RevealState {
  /** Cleared tiles (erase) — monotone, never shrinks within an attempt. */
  readonly cleared: ReadonlySet<number>
  /** Objects found (light), by index into `RevealConfig.objects`. Latched:
   *  the light does not persist, the FINDING does. */
  readonly lit: ReadonlySet<number>
  /** T10 (`odd/tasks/prewriting-stage-completion.md`, "add animations to the
   *  darkness"): the `now` (ms, `onFrame`'s own clock) each index in `lit`
   *  first latched — the seam `canvas/RevealLayer.tsx`'s growth easing reads
   *  to grow a just-found object's light from 0 over `LIGHT_FOUND_GROWTH_MS`
   *  instead of popping it in at full size. Never removes an entry (`lit`
   *  itself is latched forever, so this is too) and is read-only past the
   *  tick that set it. */
  readonly litAt: ReadonlyMap<number, number>
  /** T10: `now` the level FIRST reached "every object found", or `null`
   *  before that (or for a non-`light`/no-objects reveal). Latched exactly
   *  once, the same way `lit` latches each index — the seam the completion
   *  wash's own outward growth (`LIGHT_COMPLETE_GROWTH_MS`) times itself
   *  from, instead of jumping straight from dark to fully lit. */
  readonly completeAt: number | null
  /** The live point, or `null` with the finger up — the light goes out. */
  readonly point: { x: number; y: number } | null
  /** T19 (`odd/tasks/prewriting-stage-completion.md`, "when you press, the
   *  torch light should appear progressively… both turning it on and off"):
   *  `now` the CURRENT press started — `null` while idle. Stamped fresh
   *  every time `point` transitions from `null`/fading to a live value, so
   *  `lightSources` can grow the live torch in from 0 the same way a found
   *  object already does, timed from THIS press rather than any earlier one. */
  readonly torchOnAt: number | null
  /** T19: the last live torch position, kept around AFTER `point` goes back
   *  to `null` on lift, purely so `lightSources` can fade it OUT over
   *  `TORCH_FADE_MS` instead of vanishing instantly. Cleared once the fade
   *  finishes (or a fresh press starts). Never read by anything that used to
   *  read `point` — this is an ADDITIVE ghost, so `point`'s own existing
   *  "null means finger up" contract is completely unchanged. */
  readonly torchGhost: { x: number; y: number } | null
  /** T19: `now` the torch was lifted (the instant `point` went back to
   *  `null`) — `null` once the ghost has fully faded or nothing is fading. */
  readonly torchOffAt: number | null
  /** How many points of the CURRENT stroke are already folded. The fold
   *  re-reads `points[seen - 1]` as the next segment's origin, so no segment
   *  is ever skipped and none is ever walked twice. */
  readonly seen: number
}

export const EMPTY_REVEAL: RevealState = {
  cleared: new Set(),
  lit: new Set(),
  litAt: new Map(),
  completeAt: null,
  point: null,
  torchOnAt: null,
  torchGhost: null,
  torchOffAt: null,
  seen: 0,
}

function objectLitByWindow(obj: RevealObject, radius: number, window: ReadonlyArray<Point>): boolean {
  for (const p of window) {
    if (Math.hypot(p.x - obj.x, p.y - obj.y) <= radius) return true
  }
  return false
}

/**
 * Monotone. Returns the SAME reference when nothing flips, so an idle
 * re-pass costs a no-op `setState` — the contract `clueTick` already holds
 * to (`LevelPlay.tsx:952-953`).
 *
 * The live fold is incremental over SEGMENTS: `points` is the CURRENT
 * stroke's growing point list (the same shape `onFrame` already hands the
 * corridor/clue folds), and `seen` carries forward how much of it is already
 * folded, so the window walked each call is `points[seen - 1 .. end]` — the
 * boundary point is re-read as the next window's origin, exactly
 * `corridorTrackRef`'s own convention (`LevelPlay.tsx:924-932`), so no
 * segment between two samples is ever skipped.
 *
 * `drawing === false` resets `seen = 0` and `point = null` — the same
 * pen-lift rule `coverage.ts` already states: no segment is drawn across a
 * lift, and light mode's torch goes out with the finger.
 *
 * `now` (T10, `odd/tasks/prewriting-stage-completion.md`): the caller's own
 * frame clock (`onFrame`'s `timeMs`, or one fixed `Date.now()` for an
 * instant full-stroke replay — `releasedRevealState`'s own convention),
 * required rather than defaulted so every stamp this function writes is
 * exactly the caller's own clock, never a hidden one this module reads for
 * itself (this file stays pure — no `Date.now()`/`performance.now()` call
 * anywhere in it).
 */
/**
 * T19 (`odd/tasks/prewriting-stage-completion.md`, "when you press, the
 * torch light should appear progressively… both turning it on and off"): how
 * long the LIVE torch takes to grow in on press and fade out on lift — the
 * task's own "≈250 ms" for both. Deliberately its own constant rather than
 * reusing {@link LIGHT_FOUND_GROWTH_MS} (400ms): the two are visually
 * related but independently tunable, and the found-object grow-in was never
 * reported as needing a matching fade-OUT (a found light stays forever).
 */
export const TORCH_FADE_MS = 250

export function revealTick(
  prev: RevealState,
  points: ReadonlyArray<Point>,
  drawing: boolean,
  reveal: RevealConfig,
  width: number,
  now: number,
): RevealState {
  if (!drawing) {
    // T19: `point` keeps meaning EXACTLY what it always meant — `null` the
    // instant the finger lifts, unconditionally, every existing caller's own
    // assumption untouched. The fade-out lives ENTIRELY in the additive
    // `torchGhost`/`torchOffAt` pair: the moment `point` goes null, its last
    // value is snapshotted into `torchGhost` and `torchOffAt` is stamped, so
    // `lightSources` (below) can shrink a source at that frozen position for
    // `TORCH_FADE_MS` instead of the torch vanishing outright. Once the fade
    // has run its course, a later idle tick clears the ghost for good.
    if (prev.point === null && prev.torchGhost === null && prev.seen === 0) return prev
    if (prev.point !== null) {
      return { ...prev, point: null, torchGhost: prev.point, torchOffAt: now, seen: 0 }
    }
    if (prev.torchGhost !== null && prev.torchOffAt !== null && now - prev.torchOffAt >= TORCH_FADE_MS) {
      return { ...prev, torchGhost: null, torchOffAt: null, seen: 0 }
    }
    if (prev.seen === 0) return prev
    return { ...prev, seen: 0 }
  }

  const head = points[points.length - 1]
  if (!head) return prev

  const start = Math.max(0, prev.seen - 1)
  const window = points.slice(start)

  if (reveal.mode === 'erase') {
    if (window.length === 0) return prev
    const grid: RevealGrid = { cols: reveal.cols, rows: reveal.rows, width, radius: reveal.radius }
    const added = clearedTiles([window], grid)
    let mutableCleared: Set<number> | null = null
    for (const idx of added) {
      if (!prev.cleared.has(idx)) {
        if (mutableCleared === null) mutableCleared = new Set(prev.cleared)
        mutableCleared.add(idx)
      }
    }
    if (mutableCleared === null) return prev
    return { ...prev, cleared: mutableCleared, seen: points.length }
  }

  // light mode
  let mutableLit: Set<number> | null = null
  let mutableLitAt: Map<number, number> | null = null
  if (window.length > 0) {
    for (let oi = 0; oi < reveal.objects.length; oi++) {
      if (prev.lit.has(oi)) continue
      if (objectLitByWindow(reveal.objects[oi], reveal.radius, window)) {
        if (mutableLit === null) mutableLit = new Set(prev.lit)
        if (mutableLitAt === null) mutableLitAt = new Map(prev.litAt)
        mutableLit.add(oi)
        mutableLitAt.set(oi, now)
      }
    }
  }
  const latchChanged = mutableLit !== null
  const lit = mutableLit ?? prev.lit
  const litAt = mutableLitAt ?? prev.litAt
  // T10: latched once, the instant `lit` first reaches every object — the
  // SAME tick that grew `lit` to that size, never a later idle pass (a
  // re-tick with no new object found can only ever see `lit` unchanged, so
  // `completeAt` cannot drift once set).
  const completeAt =
    prev.completeAt === null && reveal.objects.length > 0 && lit.size >= reveal.objects.length ? now : prev.completeAt

  const isFreshPress = prev.point === null
  const moved =
    isFreshPress || Math.hypot(head.x - prev.point.x, head.y - prev.point.y) > REVEAL_EPSILON

  if (!moved && !latchChanged) return prev

  // T19: a fresh press (the finger was up) restarts the live torch's own
  // grow-in clock and drops any ghost still fading from the PREVIOUS lift —
  // a brand new press means "not fading any more, starting again". A
  // continuing drag (the finger was already down) keeps `torchOnAt` as it
  // was: only the FIRST sample of a press stamps it, exactly like `litAt`
  // only stamps an object the instant it is newly found.
  const torchOnAt = isFreshPress ? now : prev.torchOnAt
  const torchGhost = isFreshPress ? null : prev.torchGhost
  const torchOffAt = isFreshPress ? null : prev.torchOffAt

  return {
    ...prev,
    point: { x: head.x, y: head.y },
    lit,
    litAt,
    completeAt,
    torchOnAt,
    torchGhost,
    torchOffAt,
    seen: points.length,
  }
}

/**
 * T9 (round flashlight, `odd/tasks/prewriting-stage-completion.md`): one
 * active light source for a `light`-mode reveal — either a FOUND object
 * (`state.lit`, latched forever, T2's own rule) or the live torch point.
 * `radius` is carried per source (always `reveal.radius` today, the level's
 * own constant) rather than assumed shared, so a future level could vary it
 * per object without this shape changing.
 */
export interface RevealLightSource {
  readonly cx: number
  readonly cy: number
  readonly radius: number
}

/**
 * T10 (`odd/tasks/prewriting-stage-completion.md`, "add animations to the
 * darkness"): how long a just-found object's own light takes to grow from 0
 * to `reveal.radius`, and how long the final "everyone's been found" wash
 * takes to grow outward until the whole scene is lit. Both are eased, never
 * linear (`growthFraction` below) — a linear grow reads as mechanical at
 * this duration, the same reason `canvas/screen/BubblePop.ts`'s own pop-in
 * is not linear either.
 */
export const LIGHT_FOUND_GROWTH_MS = 400
export const LIGHT_COMPLETE_GROWTH_MS = 1400

/**
 * Eases elapsed time into `[0, 1]`, monotonically non-decreasing in
 * `elapsedMs` (strictly increasing until it saturates at 1) — the property
 * `revealGrid.test.ts` holds this to directly, since a grow that ever moved
 * backward would read as a flicker, not a glow. `reducedMotion` snaps
 * straight to `1`: the fraction this file hands out is a TARGET size, and a
 * reduced-motion viewer is owed the finished frame immediately, not a
 * frozen mid-grow one (docs/01's own accessibility line, restated for a
 * fraction rather than a CSS `animation`).
 */
export function growthFraction(elapsedMs: number, durationMs: number, reducedMotion: boolean): number {
  if (reducedMotion || durationMs <= 0) return 1
  const t = Math.max(0, Math.min(1, elapsedMs / durationMs))
  return 1 - (1 - t) * (1 - t) // easeOutQuad — fast start, settling in, never overshoots 1
}

/**
 * True while ANY growth this file drives is still under way at `nowMs` — a
 * just-found object short of `LIGHT_FOUND_GROWTH_MS`, or the scene-wide
 * completion wash short of `LIGHT_COMPLETE_GROWTH_MS`. The one thing
 * `screen/LevelPlay.tsx`'s own `onFrame` needs to decide whether THIS frame
 * is worth spending a `setState` on to re-sample the clock (`design.md`
 * §1.6's frame-cost discipline, restated for an animation instead of a
 * tile): every other frame while nothing is growing costs nothing here.
 */
export function isLightAnimating(state: RevealState, nowMs: number): boolean {
  for (const foundAt of state.litAt.values()) {
    if (nowMs - foundAt < LIGHT_FOUND_GROWTH_MS) return true
  }
  if (state.completeAt !== null && nowMs - state.completeAt < LIGHT_COMPLETE_GROWTH_MS) return true
  // T19: the live torch's own grow-in (on press) and fade-out (on lift).
  if (state.torchOnAt !== null && nowMs - state.torchOnAt < TORCH_FADE_MS) return true
  if (state.torchOffAt !== null && nowMs - state.torchOffAt < TORCH_FADE_MS) return true
  return false
}

/**
 * The completion wash's own progress, `[0, 1]` — `0` before every object is
 * found (or on a reveal with no `completeAt` yet), `1` once the outward grow
 * has run its full `LIGHT_COMPLETE_GROWTH_MS`. `canvas/RevealLayer.tsx` is
 * the one reader: it owns `displayBounds`, so it is the one place that can
 * turn this bare fraction into an actual target radius (the corner of the
 * screen farthest from each found object) — this file has no such box to
 * grow toward, only the clock.
 */
export function completionGrowthFraction(state: RevealState, nowMs: number, reducedMotion: boolean): number {
  if (state.completeAt === null) return 0
  return growthFraction(nowMs - state.completeAt, LIGHT_COMPLETE_GROWTH_MS, reducedMotion)
}

/**
 * Every active source for a `light` reveal, pure. Replaces the OLD job
 * `revealTiles`'s light branch did alone (folding `state.lit`/`state.point`
 * straight into a `cols x rows` grid, design.md §1's original tiling): T9
 * moved the actual darkness geometry to `canvas/RevealLayer.tsx` (round
 * holes, not squares), and this is the seam between the two — the ONE place
 * that still reads `RevealState`/`RevealConfig` to decide WHERE the light
 * is, before any rendering shape is chosen.
 *
 * `nowMs`/`reducedMotion` (T10): a FOUND object's own radius grows from 0
 * over `LIGHT_FOUND_GROWTH_MS`, timed from `state.litAt`, defaulting to
 * `nowMs = Infinity` so every pre-T10 caller (this file's own
 * `revealScore`, every existing test) keeps getting the full radius
 * immediately — `growthFraction(Infinity, ...)` clamps to `1` regardless of
 * `reducedMotion`.
 *
 * T19 (`odd/tasks/prewriting-stage-completion.md`, "the torch light should
 * appear progressively… both turning it on and off"): the LIVE torch now
 * grows in from 0 over `TORCH_FADE_MS`, timed from `state.torchOnAt` the
 * SAME way a found object grows from `state.litAt` — and, once lifted, its
 * last position (`state.torchGhost`/`torchOffAt`) fades back OUT over the
 * same duration instead of disappearing outright. `reducedMotion` snaps the
 * grow-in to full immediately (`growthFraction`'s own existing rule) and the
 * fade-out to GONE immediately (the mirror image: reduced motion is owed the
 * finished END state, and the end state of a lift is "off").
 */
export function lightSources(
  reveal: Extract<RevealConfig, { mode: 'light' }>,
  state: RevealState,
  nowMs: number = Infinity,
  reducedMotion: boolean = false,
): readonly RevealLightSource[] {
  const sources: RevealLightSource[] = []
  for (const idx of state.lit) {
    const obj = reveal.objects[idx]
    if (!obj) continue
    const foundAt = state.litAt.get(idx)
    const elapsed = foundAt === undefined ? Infinity : nowMs - foundAt
    const radius = reveal.radius * growthFraction(elapsed, LIGHT_FOUND_GROWTH_MS, reducedMotion)
    if (radius > 0) sources.push({ cx: obj.x, cy: obj.y, radius })
  }
  if (state.point) {
    const onElapsed = state.torchOnAt === null ? Infinity : nowMs - state.torchOnAt
    const growIn = growthFraction(onElapsed, TORCH_FADE_MS, reducedMotion)
    const radius = reveal.radius * growIn
    if (radius > 0) sources.push({ cx: state.point.x, cy: state.point.y, radius })
  } else if (state.torchGhost && state.torchOffAt !== null) {
    const offElapsed = nowMs - state.torchOffAt
    const fadeOut = reducedMotion ? 0 : 1 - growthFraction(offElapsed, TORCH_FADE_MS, false)
    const radius = reveal.radius * fadeOut
    if (radius > 0) sources.push({ cx: state.torchGhost.x, cy: state.torchGhost.y, radius })
  }
  return sources
}

/** The torch: 1 at the rim, 0 at the centre, in five steps.
 *  `q = round(clamp(d / radius, 0, 1) * 4) / 4`. A float opacity is
 *  unassertable in this harness (`renderToString` would give
 *  `opacity="0.63719"`, pinning a rounding mode instead of a behaviour);
 *  quantizing to five steps also bounds the frame-rate cost (design.md
 *  §1.6): a tile only writes an attribute when it crosses a step boundary. */
export function lightOpacity(d: number, radius: number): number {
  const ratio = radius > 0 ? d / radius : 1
  const clamped = Math.max(0, Math.min(1, ratio))
  return Math.round(clamped * 4) / 4
}

/** One render-ready tile: the geometry `TraceRevealTile` needs, structurally
 *  (`canvas/TraceCanvas.tsx`'s convention — this file imports nothing from
 *  `canvas/`). A tile at opacity 0 is simply ABSENT from this list
 *  (design.md §1.5): in `erase` mode the layer's node count falls from N
 *  toward 0 as the child works, and `renderToString` can count `<rect`
 *  occurrences and get exactly `N - cleared.size`. */
export interface RevealTile {
  x: number
  y: number
  w: number
  h: number
  opacity: number
}

/**
 * Pure projection from fold state to render tiles. No React, no DOM.
 *
 * `erase` mode is unchanged: a `cols x rows` grid, one entry per tile still
 * covered (design.md §1's original tiling — `canvas/RevealLayer.tsx`'s
 * fog/sand/leaves/mud policies all trace a silhouette AROUND this exact
 * shape via `boundaryLoops`, so it has to stay literal grid geometry).
 *
 * `light` mode does NOT tile the grid any more (T9,
 * `odd/tasks/prewriting-stage-completion.md`): the old per-tile fold made
 * the found-object glow read as tile-stepped squares instead of a round
 * torch. Each entry here is now one ACTIVE source's own bounding SQUARE —
 * `x/y` its top-left corner, `w === h === 2 * radius` — which
 * `canvas/RevealLayer.tsx` reconstructs losslessly back into a circle
 * (`cx = x + w/2`, `cy = y + h/2`, `radius = w/2`) and turns into round
 * darkness geometry there (`TraceRevealTile`'s `{x,y,w,h,opacity}` shape,
 * `canvas/TraceCanvas.tsx`, is untouched — this is a new MEANING for light
 * mode, not a new field, so nothing outside this file's boundary had to
 * change). `opacity` carries no information for this branch (kept at `1`,
 * the harmless default) — the ring/band opacities are a rendering-only
 * concern `RevealLayer` derives itself from each source's own `radius`.
 * Zero active sources correctly returns `[]`: `RevealLayer` always paints
 * the base full-sheet dark regardless of this list, so an empty list means
 * zero holes in it, not zero darkness.
 */
export function revealTiles(
  reveal: RevealConfig,
  state: RevealState,
  width: number,
  nowMs: number = Infinity,
  reducedMotion: boolean = false,
): readonly RevealTile[] {
  if (reveal.mode === 'light') {
    return lightSources(reveal, state, nowMs, reducedMotion).map((s) => ({
      x: s.cx - s.radius,
      y: s.cy - s.radius,
      w: s.radius * 2,
      h: s.radius * 2,
      opacity: 1,
    }))
  }

  const { cols, rows } = reveal
  const w = width > 0 ? width : 1
  const tileW = w / cols
  const tileH = SHEET_HEIGHT / rows
  const tiles: RevealTile[] = []

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const opacity = state.cleared.has(tileIndex(col, row, cols)) ? 0 : 1
      if (opacity <= 0) continue
      tiles.push({ x: col * tileW, y: row * tileH, w: tileW, h: tileH, opacity })
    }
  }
  return tiles
}

/**
 * The accuracy pillar for a free level with a reveal grid. No `reveal` ->
 * `coverageScore` at its own defaults, which is EXACTLY today's call and is
 * what keeps `f1-libre` bit-identical. `erase` -> the cleared percentage at
 * the level's own resolution. `light` -> the percentage of hidden objects
 * the strokes lit — the one criterion a non-persistent grid can carry: it
 * never accumulates a coverage figure, so objects ARE its area.
 */
export function revealScore(
  strokes: ReadonlyArray<ReadonlyArray<Point>>,
  config: { reveal?: RevealConfig },
  viewBoxWidth: number,
): number {
  const reveal = config.reveal
  if (!reveal) return coverageScore(strokes, viewBoxWidth)

  const width = viewBoxWidth > 0 ? viewBoxWidth : 1

  if (reveal.mode === 'erase') {
    const grid: RevealGrid = { cols: reveal.cols, rows: reveal.rows, width, radius: reveal.radius }
    const cleared = clearedTiles(strokes, grid)
    return Math.round((100 * cleared.size) / (reveal.cols * reveal.rows))
  }

  const objects = reveal.objects
  if (objects.length === 0) return 100
  let lit = 0
  for (const obj of objects) {
    let found = false
    for (const stroke of strokes) {
      if (objectLitByWindow(obj, reveal.radius, stroke)) {
        found = true
        break
      }
    }
    if (found) lit++
  }
  return Math.round((100 * lit) / objects.length)
}

/** Pure, deterministic pre-clear for `?debug=revelado:<pct>` (Phase 6): the
 *  top `round(fraction * rows)` tile ROWS, so a screenshot can show a
 *  partially-revealed erase level without a live playthrough. `fraction` is
 *  clamped to `[0, 1]`. */
export function debugClearedTiles(reveal: RevealConfig, fraction: number): ReadonlySet<number> {
  const clamped = Math.max(0, Math.min(1, fraction))
  const rowsToFill = Math.round(clamped * reveal.rows)
  const cleared = new Set<number>()
  for (let row = 0; row < rowsToFill; row++) {
    for (let col = 0; col < reveal.cols; col++) {
      cleared.add(tileIndex(col, row, reveal.cols))
    }
  }
  return cleared
}
