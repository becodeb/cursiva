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
  /** The live point, or `null` with the finger up — the light goes out. */
  readonly point: { x: number; y: number } | null
  /** How many points of the CURRENT stroke are already folded. The fold
   *  re-reads `points[seen - 1]` as the next segment's origin, so no segment
   *  is ever skipped and none is ever walked twice. */
  readonly seen: number
}

export const EMPTY_REVEAL: RevealState = {
  cleared: new Set(),
  lit: new Set(),
  point: null,
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
 */
export function revealTick(
  prev: RevealState,
  points: ReadonlyArray<Point>,
  drawing: boolean,
  reveal: RevealConfig,
  width: number,
): RevealState {
  if (!drawing) {
    if (prev.point === null && prev.seen === 0) return prev
    return { ...prev, point: null, seen: 0 }
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
  if (window.length > 0) {
    for (let oi = 0; oi < reveal.objects.length; oi++) {
      if (prev.lit.has(oi)) continue
      if (objectLitByWindow(reveal.objects[oi], reveal.radius, window)) {
        if (mutableLit === null) mutableLit = new Set(prev.lit)
        mutableLit.add(oi)
      }
    }
  }
  const latchChanged = mutableLit !== null
  const lit = mutableLit ?? prev.lit

  const moved =
    prev.point === null || Math.hypot(head.x - prev.point.x, head.y - prev.point.y) > REVEAL_EPSILON

  if (!moved && !latchChanged) return prev

  return { ...prev, point: { x: head.x, y: head.y }, lit, seen: points.length }
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

/** Pure projection from fold state to render tiles. No React, no DOM. */
export function revealTiles(reveal: RevealConfig, state: RevealState, width: number): readonly RevealTile[] {
  const { cols, rows } = reveal
  const w = width > 0 ? width : 1
  const tileW = w / cols
  const tileH = SHEET_HEIGHT / rows
  const tiles: RevealTile[] = []

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      let opacity: number
      if (reveal.mode === 'erase') {
        opacity = state.cleared.has(tileIndex(col, row, cols)) ? 0 : 1
      } else {
        const cx = (col + 0.5) * tileW
        const cy = (row + 0.5) * tileH
        opacity = state.point === null ? 1 : lightOpacity(Math.hypot(cx - state.point.x, cy - state.point.y), reveal.radius)
        // Defect fix (play-test 2026-09-25, T2 item 3: "when the child
        // discovers an object, it stays lit"). Before this, a tile's
        // opacity depended ONLY on the LIVE torch point, so the instant the
        // finger lifted every tile snapped back to `1` (fully dark) even
        // around an object already latched into `state.lit` — the object's
        // own picture kept showing (`revealedArt` renders above the veil,
        // unconditionally), but the clearing around it did not, so a found
        // chest read as a lit sprite floating in total black. Each FOUND
        // object now also contributes its own falloff, exactly like the
        // live point (same `reveal.radius`, so a found object's clearing is
        // the same size the torch needed to find it) — and it never resets,
        // because `state.lit` is latched (never shrinks) for the rest of
        // the attempt. `Math.min` takes whichever source reveals the tile
        // MORE (lower opacity = less covering), so the live torch and every
        // permanent find compose rather than race.
        for (const oi of state.lit) {
          const obj = reveal.objects[oi]
          const foundOpacity = lightOpacity(Math.hypot(cx - obj.x, cy - obj.y), reveal.radius)
          if (foundOpacity < opacity) opacity = foundOpacity
        }
      }
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
