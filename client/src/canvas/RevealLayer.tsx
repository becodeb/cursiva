// The reveal grid's whole render contract (reveal-grid spec: "Reveal Layer
// Renders as Plain Rects With No Fragment Reference"; trace-canvas spec:
// "Reveal Layer Renders as Plain Rects Between Backdrop and Ink"; design.md
// §4.1). N plain `<rect>`s, no `<mask>`, no `<pattern>`, no `<clipPath>`, no
// `<defs>`, no `useId`, no `url(#...)` — `TraceCanvas.tsx`'s own scar
// (`TraceCanvas.tsx:78-93`): an SVG mask hydrated BLANK on a real device
// while rendering perfectly in headless Chromium.
//
// `RevealLayer` renders, in order: one `<image>` per hidden object (through
// the SAME `placeArt(...)` + `clampArtBox(..., sheetBounds)` path every
// other standing/held art in this file uses), then one `<rect>` per tile —
// both inside `<g pointerEvents="none">`. `reveal.tiles` already excludes
// any tile at opacity 0 (`levels/revealGrid.ts`'s `revealTiles` projection,
// design.md §1.5): this layer never filters, it only renders what it is
// given.
//
// T9 (round flashlight, `odd/tasks/prewriting-stage-completion.md`): a
// `light`-mode veil is the ONE exception to "one `<rect>` per tile" above.
// `revealTiles` no longer tiles a grid for `light` mode — each entry in
// `reveal.tiles` is now one ACTIVE source's own bounding square (found
// object or live torch, `levels/revealGrid.ts`'s own header), and this file
// turns that list into ROUND darkness: plain `<path>`s, `fillRule="evenodd"`
// (allowed — it is a fill rule, not a fragment reference), never `<mask>`/
// `<clipPath>`/`url(#…)`. The batch-1 fix (`38919bc`) made a found object's
// own clearing latch forever; what stayed square was the SHAPE of that
// clearing (grid tiles), not whether it persisted — this only changes the
// shape.
//
// T10 (`odd/tasks/prewriting-stage-completion.md`, play-test on a tablet):
// T9's veil punched one hole PER SOURCE (`circlePath`, `fillRule="evenodd"`)
// and concatenated their ring annuli independently. That is a boundary-
// CROSSING count, not a union: a point sitting inside TWO overlapping holes
// crosses an even number of boundaries and reads as FILLED again — the
// exact bug report item 1 ("where the torch overlaps a found object's own
// light, the overlap renders black"). No fill-rule trick fixes this for
// arbitrary overlap (flipping to `nonzero` with opposite-wound holes only
// moves the same parity problem — two overlapping holes still drive the
// winding number past zero instead of stopping at it); the shapes have to
// be UNIONED before they are traced, not composed by the renderer at
// paint time.
//
// T10 rework (orchestrator review of the first T10 pass): a grid-sampled
// union (classify a coarse 25-unit cell grid, trace each darkness level's
// tile set with `boundaryLoops`) fixed the overlap bug but left the EDGE
// itself grid-quantized — visibly stair-stepped even after smoothing, not
// the round/soft circle T9 shipped. The veil's own edge now unions EXACT
// circle geometry instead of sampling it onto a grid: each circle is
// polygonized at `VEIL_CIRCLE_SEGMENTS` segments (well past the sagitta a
// single viewBox unit needs at any radius this file ever grows to — see its
// own header) and combined with the `polygon-clipping` library (MIT,
// `client/package.json`, pinned exact) — a real polygon-boolean union/
// difference, not a grid approximation of one. This is the one file in the
// codebase that works in raw SVG path data rather than the generator M/L/C
// convention `levels/*.ts`'s route generators hold to (that rule is about
// authored/scored route geometry — corridors, spines, waypoints — never
// about a decorative veil composited from polygon-boolean output); plain
// `M`/`L`/`Z` commands, still no `<mask>`/`<clipPath>`/`<filter>`/`url(#…)`,
// this file's own ban, unchanged.
import { clampArtBox, placeArt, type ArtBox } from './placeArt'
import { difference as clipDifference, union as clipUnion } from 'polygon-clipping'
import type { MultiPolygon as ClipMultiPolygon, Polygon as ClipPolygon } from 'polygon-clipping'
import { lightOpacity } from '../levels/revealGrid'
import type { TraceReveal, TraceRevealTile } from './TraceCanvas'

/**
 * T9: `reveal.tiles` for a `light` reveal is a list of source bounding
 * squares (`levels/revealGrid.ts`'s own header), not grid cells. This
 * losslessly reconstructs the circle each square encodes — `x/y` is the
 * top-left corner, `w === h === 2 * radius` — the exact inverse of how
 * `revealTiles` built the square from `{ cx, cy, radius }` in the first
 * place.
 *
 * One exception: `screen/LevelPlay.tsx`'s completion frame bypasses
 * `revealTiles` entirely and passes `allRevealTiles`'s full COLS x ROWS grid
 * at `opacity: 0` instead, once the T10 completion wash has finished
 * growing (a pre-existing, untouched convention this file cannot reach into
 * `LevelPlay.tsx` to change). A real active source is always emitted at
 * `opacity: 1` (`revealTiles`'s light branch, hardcoded — see its own
 * header), so a non-empty list where EVERY entry reads `opacity <= 0` is
 * unambiguously that bypass, not a zero-radius source; it decodes to
 * `null` — NO veil at all, not even the solid base rect, exactly the
 * "everything already found, stop darkening" state that frame means. An
 * EMPTY list is the other, unrelated case (no torch, nothing found yet): it
 * decodes to `[]`, which `nightVeilLayers` below turns into a SOLID base
 * rect with zero bands — full darkness, correctly distinct from the `null`
 * "no veil" case despite both starting from an empty-ish input.
 */
function nightVeilSources(tiles: readonly TraceRevealTile[]): readonly { cx: number; cy: number; radius: number }[] | null {
  if (tiles.length > 0 && tiles.every((t) => t.opacity <= 0)) return null
  return tiles.map((t) => ({ cx: t.x + t.w / 2, cy: t.y + t.h / 2, radius: t.w / 2 }))
}

/** The sheet-wide dark path, the SAME `M`/`H`/`V`/`H`/`Z` rectangle
 *  `data-night-success-glow`'s wash already uses (below) — one shared
 *  formula rather than a second literal. */
function sheetRectPath(bounds: ArtBox): string {
  return `M ${bounds.x} ${bounds.y} H ${bounds.x + bounds.width} V ${bounds.y + bounds.height} H ${bounds.x} Z`
}

/**
 * T10: how dark a single POINT is, `[0, 1]`, given every active light
 * source — the scalar field the task brief's own recommended approach
 * describes ("L(p) = max over sources of a smooth falloff of distance"),
 * restated as DARKNESS (1 = pitch dark, 0 = fully lit) because that is what
 * this file actually paints. The MIN of each source's own normalized ratio
 * (`distance / that source's radius`, so a found object with a smaller
 * grown radius and a full-radius torch compare fairly) is exactly `max`
 * light turned upside down: a point close to EITHER source is bright,
 * full stop — there is no way for two sources to combine into something
 * DARKER than either alone, which is what makes this immune to the T9 bug
 * by construction rather than by careful fill-rule bookkeeping.
 * `lightOpacity(ratio, 1)` reuses the exact five-step quantization the live
 * torch's own falloff already defines (`levels/revealGrid.ts`), just fed a
 * pre-normalized ratio instead of a raw distance/radius pair.
 */
export function veilDarknessAt(sources: readonly { cx: number; cy: number; radius: number }[], px: number, py: number): number {
  let bestRatio = Infinity
  for (const s of sources) {
    if (!(s.radius > 0)) continue
    const ratio = Math.hypot(px - s.cx, py - s.cy) / s.radius
    if (ratio < bestRatio) bestRatio = ratio
  }
  if (!Number.isFinite(bestRatio)) return 1 // no active source reaches this point: pitch dark
  return lightOpacity(bestRatio, 1)
}

/**
 * T10: a circle, polygonized to a closed ring — GeoJSON-style, first point
 * repeated last (`polygon-clipping`'s own input contract, verified against
 * its own test fixtures). `VEIL_CIRCLE_SEGMENTS` (128) keeps the sagitta —
 * the true circle's worst-case deviation from its polygon approximation,
 * `r * (1 - cos(pi / segments))` — under 0.31 viewBox units at the largest
 * radius this file ever grows a source to (`farthestCornerDistance` over a
 * realistic `displayBounds`, at most ~1300), comfortably inside the ±1 unit
 * a single grid line used to cost this shape.
 */
const VEIL_CIRCLE_SEGMENTS = 128

function circleRing(cx: number, cy: number, r: number): [number, number][] {
  const ring: [number, number][] = []
  for (let i = 0; i < VEIL_CIRCLE_SEGMENTS; i++) {
    const a = (2 * Math.PI * i) / VEIL_CIRCLE_SEGMENTS
    ring.push([cx + r * Math.cos(a), cy + r * Math.sin(a)])
  }
  ring.push(ring[0])
  return ring
}

function rectPolygon(bounds: ArtBox): ClipPolygon {
  const { x, y, width, height } = bounds
  return [
    [
      [x, y],
      [x + width, y],
      [x + width, y + height],
      [x, y + height],
      [x, y],
    ],
  ]
}

/**
 * T10: the EXACT union of every active source's own circle at a given
 * radius fraction — real polygon-boolean geometry (`polygon-clipping`),
 * not a grid sampling of one (the orchestrator's own review of the first
 * T10 pass: a grid-classified union fixed the overlap bug but left a
 * visibly stair-stepped edge). `null` for zero sources — the caller's own
 * fast path, not an empty `MultiPolygon`, so the zero-source case never
 * even calls into the union library.
 */
function unionOfCircles(sources: readonly { cx: number; cy: number; radius: number }[], ratio: number): ClipMultiPolygon | null {
  const rings = sources.filter((s) => s.radius > 0).map((s) => [circleRing(s.cx, s.cy, s.radius * ratio)] as ClipPolygon)
  if (rings.length === 0) return null
  if (rings.length === 1) return [rings[0]]
  return clipUnion(rings[0], ...rings.slice(1))
}

function multiPolygonToPath(mp: ClipMultiPolygon): string {
  const parts: string[] = []
  for (const polygon of mp) {
    for (const ring of polygon) {
      if (ring.length < 3) continue
      parts.push(`M ${ring[0][0]} ${ring[0][1]}`)
      for (let i = 1; i < ring.length; i++) parts.push(`L ${ring[i][0]} ${ring[i][1]}`)
      parts.push('Z')
    }
  }
  return parts.join(' ')
}

/**
 * T10: the veil's own band ladder — 6 levels (1 base + 5 rings), inside the
 * task brief's "5-7 bands" for a gently-decreasing falloff. `RATIOS` are the
 * midpoints of 6 equal `[0, 1]` bins, outer to inner
 * (`(2k+1)/12` for `k = 5..0`); `OPACITIES[k]` is `1 - k/6`. Both arrays are
 * the SAME length and index together: band `k`'s outer boundary is
 * `RATIOS[k]`, its inner boundary is `RATIOS[k + 1]` (or "no source reaches
 * here at all" for `k = 0`), and its paint opacity is `OPACITIES[k]`.
 */
// Exported so `RevealLayer.test.tsx` can assert the rendered polygon edge
// sits within a known tolerance of the TRUE circle at a KNOWN ratio,
// instead of hardcoding a second copy of these numbers.
export const VEIL_BAND_RATIOS = [11 / 12, 9 / 12, 7 / 12, 5 / 12, 3 / 12, 1 / 12] as const
const VEIL_BAND_OPACITIES = [1, 5 / 6, 4 / 6, 3 / 6, 2 / 6, 1 / 6] as const

/**
 * The round flashlight veil (T9, reworked T10 twice — see this file's own
 * header): one path per band, each the EXACT union of every active
 * source's own circle at that band's ratio, minus the next band IN's union
 * (so bands never overlap and compose correctly regardless of source
 * count or how much they overlap each other). Zero sources is a fast path
 * straight back to the plain full-`displayBounds` rectangle: nothing to
 * union, and it keeps the idle "solid darkness" frame exactly the
 * single-`<path>` shape it always was (`RevealLayer.test.tsx`'s own "no
 * holes before anything is found" case). Node count stays flat at up to 6
 * `<path>`s regardless of source count — the SAME ceiling shape T9 shipped
 * (there it was 1 base + 3 rings; here 1 base + 5 rings for a softer
 * falloff), never `cols x rows`.
 */
function nightVeilLayers(
  sources: readonly { cx: number; cy: number; radius: number }[],
  displayBounds: ArtBox,
): readonly { opacity: number; d: string }[] {
  if (sources.length === 0) return [{ opacity: 1, d: sheetRectPath(displayBounds) }]
  const rect = rectPolygon(displayBounds)
  // `outerUnions[k]`: the exact union of every source's own circle at
  // `VEIL_BAND_RATIOS[k]` — band `k`'s own INNER boundary (what band `k`
  // itself excludes) and band `k + 1`'s OUTER boundary (what band `k + 1`
  // itself covers, before its own inner boundary is subtracted in turn).
  const outerUnions = VEIL_BAND_RATIOS.map((ratio) => unionOfCircles(sources, ratio))
  const layers: { opacity: number; d: string }[] = []
  for (let k = 0; k < VEIL_BAND_RATIOS.length; k++) {
    const inner = outerUnions[k]
    if (!inner) continue // no active source reaches even this band's own widest ratio
    const outer = k === 0 ? rect : outerUnions[k - 1]
    if (k > 0 && !outer) continue // cannot happen (see header: either every ratio has a union, or none do), guarded for the type checker
    const region = clipDifference(outer!, inner)
    const d = multiPolygonToPath(region)
    if (d) layers.push({ opacity: VEIL_BAND_OPACITIES[k], d })
  }
  return layers
}

/** T10 ("when ALL objects are found... the light grows outward from the
 *  found objects until the whole scene is lit"): the radius a source
 *  centred at `(cx, cy)` needs to fully cover `bounds` — the farthest of
 *  its four corners, so a circle of at least this radius leaves no corner
 *  of the display unlit. `Math.max` over exactly four candidates, not a
 *  general polygon distance, because `bounds` is always the axis-aligned
 *  `displayBounds` rectangle. */
function farthestCornerDistance(cx: number, cy: number, bounds: ArtBox): number {
  const right = bounds.x + bounds.width
  const bottom = bounds.y + bounds.height
  return Math.max(
    Math.hypot(bounds.x - cx, bounds.y - cy),
    Math.hypot(right - cx, bounds.y - cy),
    Math.hypot(bounds.x - cx, bottom - cy),
    Math.hypot(right - cx, bottom - cy),
  )
}

export interface RevealLayerProps {
  reveal: TraceReveal
  /** The visible sheet band, for `clampArtBox` — the same `sheetBounds`
   *  every other art layer in `TraceCanvas.tsx` clamps against. Also what
   *  `reveal.tiles` itself is scored/positioned against — NEVER grown, so
   *  scoring and geometry stay exactly where they were before the T7
   *  rework below. */
  sheetBounds: ArtBox
  /**
   * T7 rework (`odd/tasks/prewriting-stage-completion.md`, "the art is
   * drawn twice"): the EXPANDED window `TraceCanvas.tsx`'s own backdrop
   * `<image>` now covers, when it grew past `sheetBounds` to fill the
   * viewport. Defaults to `sheetBounds` (no margin, no growth) — every
   * existing caller (`RevealLayer.test.tsx`, a level with no backdrop) is
   * byte-identical without passing it.
   *
   * Used two ways, never for `reveal.tiles` positioning itself: the night
   * veil's own full-cover darkness grows to this box (so the child never
   * sees a lit ring of backdrop peeking past a small dark rectangle), and
   * every OTHER policy (glass/sand/leaves/mud, and the plain per-tile
   * fallback) gets a flat "outer margin" patch covering exactly
   * `displayBounds` minus `sheetBounds` (`marginBands` below) — the pile
   * silhouette itself stays scored against `sheetBounds` alone, so the
   * margin is a separate, permanently-covered band, never a wider grid.
   */
  displayBounds?: ArtBox
}

/**
 * The frame `outer` minus `inner`, as up to four non-overlapping bands (top,
 * bottom, left, right) — standard border-box decomposition, used for the T7
 * rework's "outer margin" veil patch (`RevealLayerProps.displayBounds`'s own
 * header). Top/bottom span `outer`'s FULL width (covering the corners too);
 * left/right span only `inner`'s height, so the four never overlap. Returns
 * `[]` when the two boxes coincide (no growth — every pre-T7 caller). Pure,
 * no dependency on `reveal` or any policy.
 */
export function marginBands(outer: ArtBox, inner: ArtBox): ArtBox[] {
  const bands: ArtBox[] = []
  if (inner.y > outer.y) bands.push({ x: outer.x, y: outer.y, width: outer.width, height: inner.y - outer.y })
  const innerBottom = inner.y + inner.height
  const outerBottom = outer.y + outer.height
  if (outerBottom > innerBottom) bands.push({ x: outer.x, y: innerBottom, width: outer.width, height: outerBottom - innerBottom })
  if (inner.x > outer.x) bands.push({ x: outer.x, y: inner.y, width: inner.x - outer.x, height: inner.height })
  const innerRight = inner.x + inner.width
  const outerRight = outer.x + outer.width
  if (outerRight > innerRight) bands.push({ x: innerRight, y: inner.y, width: outerRight - innerRight, height: inner.height })
  return bands
}

/**
 * The margin, tiled at the SAME cell size (`cellWidth`/`cellHeight`) and on
 * the SAME grid lines as the real reveal grid (anchored to `sheetBounds`'s
 * own origin) — what `marginBands`' own few large rectangles cannot give
 * `boundaryLoops`: its edge-cancellation only merges tiles whose edges land
 * EXACTLY on top of each other, so a large margin band's one long edge
 * never cancels against fifteen separate 66.7-unit real-grid edges — found
 * by looking at the actual render (a bizarre oval blob, not a clean
 * rectangular frontier), not by inspection alone. Extending the SAME grid
 * instead means every margin cell's edge either cancels against its real-
 * grid neighbour (inside `sheetBounds`) or against its own margin neighbour
 * (elsewhere in the margin), exactly like the real grid already does for
 * itself.
 *
 * Cells whose grid position falls inside `sheetBounds` are skipped (the
 * real `reveal.tiles` already cover that ground, cleared or not); every
 * other cell needed to reach `displayBounds`'s own edge is included, always
 * one full cell past it in every direction so a margin narrower than one
 * cell (a small resize) still tiles cleanly rather than leaving a sliver.
 */
export function marginGridTiles(
  displayBounds: ArtBox,
  sheetBounds: ArtBox,
  cellWidth: number,
  cellHeight: number,
): TraceRevealTile[] {
  if (!(cellWidth > 0) || !(cellHeight > 0)) return []
  const sheetCols = Math.max(1, Math.round(sheetBounds.width / cellWidth))
  const sheetRows = Math.max(1, Math.round(sheetBounds.height / cellHeight))
  const firstCol = Math.floor((displayBounds.x - sheetBounds.x) / cellWidth)
  const lastCol = Math.ceil((displayBounds.x + displayBounds.width - sheetBounds.x) / cellWidth) - 1
  const firstRow = Math.floor((displayBounds.y - sheetBounds.y) / cellHeight)
  const lastRow = Math.ceil((displayBounds.y + displayBounds.height - sheetBounds.y) / cellHeight) - 1
  const tiles: TraceRevealTile[] = []
  for (let row = firstRow; row <= lastRow; row++) {
    const insideRow = row >= 0 && row < sheetRows
    for (let col = firstCol; col <= lastCol; col++) {
      if (insideRow && col >= 0 && col < sheetCols) continue // the real grid already covers this cell
      tiles.push({
        x: sheetBounds.x + col * cellWidth,
        y: sheetBounds.y + row * cellHeight,
        w: cellWidth,
        h: cellHeight,
        opacity: 1,
      })
    }
  }
  return tiles
}

const GLASS_GRIME_FILL = '#64726b'
const GLASS_FOG_STROKE = '#dcecf0'
const GLASS_DROPLET_FILL = '#eef8fb'
const GLASS_FROST = '#edf7fa'
const GLASS_EDGE = '#b8cbd0'
const NIGHT_VEIL_FILL = '#12161f'
const NIGHT_FOUND_GLOW = '#fce97a'
const NIGHT_HINT = '#f7d66b'
const NIGHT_SUCCESS_WASH = '#ffe88a'
const SAND_BASE = '#c4945c'
const SAND_WARM = '#dfb774'
const SAND_EDGE = '#f0cf91'
const SAND_GRAIN = '#8e6b46'
const SAND_ROCK = '#76685a'
// The leaf pile's own paints, render-local peers of the `SAND_*` row above.
// `LEAF_BASE` restates `backdrops.ts`'s `LEAF_LITTER` rather than importing it:
// that constant answers the 55-luma veil law, this one answers what the leaves
// policy paints. The other three lean toward the renewed monkey background's
// sampled tones (`manifest.json`: quiet `#f8be64`, brightest `#f7fdea`), so the
// pile reads as litter in that sunlight, not a flat green slab on top of it.
const LEAF_BASE = '#6e7a4a'
const LEAF_DEEP = '#4d5733'
const LEAF_RIM = '#9aa861'
const LEAF_DRY = '#b07a3c'
// The mud pile's own paints (T4, `sand3`/`sendero`'s path enclosure), render-
// local peers of the `SAND_*`/`LEAF_*` rows above. `backdrops.ts`'s `PATH_MUD`
// (`#75634c`) is the flat veil colour this policy REPLACES — restating it here
// would tie this file's own decoration tones to that constant's own reasons
// (the 55-luma veil law), which have nothing to do with this policy's reasons
// (wet earth reads as wet through tonal variety, not through one flat fill).
const MUD_BASE = '#5a4632'
const MUD_DEEP = '#392c1f'
const MUD_EDGE = '#8c7355'
const MUD_PUDDLE = '#8fa0aa'
const MUD_PEBBLE = '#332a20'

type Point = { x: number; y: number }
type Edge = { a: Point; b: Point }

function isGlassFog(fill: string): boolean {
  return fill.toLowerCase() === GLASS_GRIME_FILL
}

function isNightVeil(fill: string): boolean {
  return fill.toLowerCase() === NIGHT_VEIL_FILL
}

function stableTileId(tile: TraceRevealTile): string {
  return `fog-${Math.round(tile.x * 100)}-${Math.round(tile.y * 100)}-${Math.round(tile.w * 100)}-${Math.round(tile.h * 100)}`
}

function pointKey(point: Point): string {
  return `${Math.round(point.x * 100)},${Math.round(point.y * 100)}`
}

function edgeKey(a: Point, b: Point): string {
  return `${pointKey(a)}>${pointKey(b)}`
}

function jitter(seed: number, amount: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453
  return (x - Math.floor(x) - 0.5) * amount
}

function addBoundaryEdge(edges: Map<string, Edge>, a: Point, b: Point): void {
  const reverse = edgeKey(b, a)
  if (edges.has(reverse)) {
    edges.delete(reverse)
    return
  }
  edges.set(edgeKey(a, b), { a, b })
}

function boundaryLoops(tiles: readonly TraceRevealTile[]): Point[][] {
  const edges = new Map<string, Edge>()
  for (const tile of tiles) {
    const tl = { x: tile.x, y: tile.y }
    const tr = { x: tile.x + tile.w, y: tile.y }
    const br = { x: tile.x + tile.w, y: tile.y + tile.h }
    const bl = { x: tile.x, y: tile.y + tile.h }
    addBoundaryEdge(edges, tl, tr)
    addBoundaryEdge(edges, tr, br)
    addBoundaryEdge(edges, br, bl)
    addBoundaryEdge(edges, bl, tl)
  }

  const byStart = new Map<string, Edge[]>()
  for (const edge of edges.values()) {
    const list = byStart.get(pointKey(edge.a)) ?? []
    list.push(edge)
    byStart.set(pointKey(edge.a), list)
  }

  const loops: Point[][] = []
  while (edges.size > 0) {
    const first = edges.values().next().value as Edge
    const firstKey = pointKey(first.a)
    const loop: Point[] = [first.a]
    let edge: Edge | undefined = first
    while (edge) {
      edges.delete(edgeKey(edge.a, edge.b))
      loop.push(edge.b)
      const endKey = pointKey(edge.b)
      if (endKey === firstKey) break
      edge = (byStart.get(endKey) ?? []).find((candidate) => edges.has(edgeKey(candidate.a, candidate.b)))
    }
    if (loop.length > 3) loops.push(loop)
  }
  return loops
}


function smoothLoop(points: readonly Point[], iterations: number): Point[] {
  let loop = pointKey(points[0]) === pointKey(points[points.length - 1]) ? points.slice(0, -1) : [...points]
  for (let pass = 0; pass < iterations; pass++) {
    const next: Point[] = []
    for (let idx = 0; idx < loop.length; idx++) {
      const a = loop[idx]
      const b = loop[(idx + 1) % loop.length]
      next.push({ x: a.x * 0.72 + b.x * 0.28, y: a.y * 0.72 + b.y * 0.28 })
      next.push({ x: a.x * 0.28 + b.x * 0.72, y: a.y * 0.28 + b.y * 0.72 })
    }
    loop = next
  }
  return loop
}

function organicLoopPath(points: readonly Point[], loopIndex: number): string {
  const closed = smoothLoop(points, 2)
  if (closed.length < 3) return ''
  const nudge = (point: Point, idx: number): Point => ({
    x: point.x + jitter(loopIndex * 101 + idx * 7 + point.y * 0.03, 5.5),
    y: point.y + jitter(loopIndex * 109 + idx * 11 + point.x * 0.03, 5.5),
  })
  const start = nudge(closed[0], 0)
  const parts = [`M ${start.x} ${start.y}`]
  for (let idx = 0; idx < closed.length; idx++) {
    const a = nudge(closed[idx], idx)
    const b = nudge(closed[(idx + 1) % closed.length], idx + 1)
    const dx = b.x - a.x
    const dy = b.y - a.y
    const len = Math.hypot(dx, dy) || 1
    const normal = { x: -dy / len, y: dx / len }
    const wobble = jitter(loopIndex * 53 + idx * 17 + a.x * 0.05 + a.y * 0.09, Math.min(18, len * 0.18))
    const c1 = { x: a.x + dx * 0.34 + normal.x * wobble, y: a.y + dy * 0.34 + normal.y * wobble }
    const c2 = { x: a.x + dx * 0.68 - normal.x * wobble * 0.45, y: a.y + dy * 0.68 - normal.y * wobble * 0.45 }
    parts.push(`C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${b.x} ${b.y}`)
  }
  parts.push('Z')
  return parts.join(' ')
}

function fogSilhouettePath(tiles: readonly TraceRevealTile[]): string {
  return boundaryLoops(tiles).map(organicLoopPath).filter(Boolean).join(' ')
}

function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
}

function erodedSandLoopPath(points: readonly Point[], loopIndex: number): string {
  const loop = pointKey(points[0]) === pointKey(points[points.length - 1]) ? points.slice(0, -1) : [...points]
  if (loop.length < 3) return ''

  const eroded: Point[] = []
  for (let idx = 0; idx < loop.length; idx++) {
    const a = loop[idx]
    const b = loop[(idx + 1) % loop.length]
    const dx = b.x - a.x
    const dy = b.y - a.y
    const len = Math.hypot(dx, dy) || 1
    const outward = { x: dy / len, y: -dx / len }
    for (let step = 0; step < 3; step++) {
      const t = step / 3
      const base = { x: a.x + dx * t, y: a.y + dy * t }
      const seed = loopIndex * 911 + idx * 71 + step * 29 + a.x * 0.013 + a.y * 0.019
      const normalOffset = jitter(seed, Math.min(32, len * 0.32))
      const tangentOffset = jitter(seed + 37, Math.min(6, len * 0.06))
      eroded.push({
        x: base.x + outward.x * normalOffset + (dx / len) * tangentOffset,
        y: base.y + outward.y * normalOffset + (dy / len) * tangentOffset,
      })
    }
  }

  const start = midpoint(eroded[eroded.length - 1], eroded[0])
  const parts = [`M ${start.x} ${start.y}`]
  for (let idx = 0; idx < eroded.length; idx++) {
    const point = eroded[idx]
    const end = midpoint(point, eroded[(idx + 1) % eroded.length])
    parts.push(`Q ${point.x} ${point.y}, ${end.x} ${end.y}`)
  }
  parts.push('Z')
  return parts.join(' ')
}

function sandSilhouettePath(loops: readonly Point[][]): string {
  return loops.map(erodedSandLoopPath).filter(Boolean).join(' ')
}

/** How much exposed frontier one leaf lobe is worth, in viewBox units. An
 *  entrance cell edge is 1000/15 ≈ 66.7, so most edges want ~1.45 lobes and the
 *  jitter below rounds that to one or two — which is what keeps the scalloping
 *  off the cell rhythm. `boundaryLoops` never merges collinear runs, so every
 *  edge arriving here is exactly one cell side. */
const LEAF_LOBE_SPAN = 46

/**
 * The two bow directions are NOT equally risky, and the winding is what makes
 * that statement well-formed.
 *
 * `boundaryLoops` walks each tile tl -> tr -> br -> bl, which winds the outer
 * contour of the covered union clockwise and every interior hole
 * counter-clockwise. Verified by shoelace on real `glass3`/`glass4` geometry
 * (15 cols x 9 rows over the 1000x600 sheet): the outer contour came back at
 * +600000, a 2x2 hole at -17777.8, an L-shaped 10-cell hole at -44444.4. That
 * opposite handedness is exactly why ONE `outward` normal serves both — and it
 * is what lets a single global sign rule be correct: `+depth` is the pile
 * ADVANCING over paper the child already cleared on both kinds of loop (off the
 * union on the outer contour, into the hole on an island), and `-depth` is the
 * pile RETREATING, which can only ever expose more of that same cleared paper.
 * Were holes wound the same way as the outer contour, this cap would be
 * backwards on every hole and would eat them all.
 *
 * So the advance cap stays where it was — this is the bound that keeps the pile
 * off what the child erased.
 */
const LEAF_ADVANCE_DEPTH = 24

/** The retreat cap, as a fraction of the grid's own cell edge rather than as an
 *  absolute, so the licence means the same thing on the 15x9 grid (66.7 units)
 *  `glass3`/`glass4` use as on the coarser 10x6 one. 0.55 of a cell is 36.7
 *  units there — half again the advance cap, which is what a multi-cell run
 *  needs before it stops returning to the straight cell line at every lobe
 *  junction. The ceiling is the thin ridge case: two cleared blobs either side
 *  of a one-cell-wide spine of leaves each retreat by at most this bow's own
 *  deflection plus the vertex pull below, and the two together must stay under
 *  one cell or the spine between them would be rendered away. */
const LEAF_RETREAT_RATIO = 0.55

/** How far a vertex may be pulled back, same units. The bow alone is pinned to
 *  the straight polyline at every lobe junction, so a 90-degree corner stays a
 *  hard 90-degree corner however deep the bows either side of it get — that is
 *  the stair step visual QA measured in the `glass4` SW corner. Only moving the
 *  vertices themselves softens it. Small next to the bow because the two
 *  compound, per the ridge argument above. */
const LEAF_VERTEX_PULL_RATIO = 0.12

/** The grid's cell edge, read off the loop itself. `boundaryLoops` never merges
 *  collinear runs, so every edge it emits is exactly one cell side and the
 *  shortest of them IS the cell — no need to thread `cols`/`rows` down here. */
function shortestEdge(loop: readonly Point[]): number {
  let shortest = Infinity
  for (let idx = 0; idx < loop.length; idx++) {
    const a = loop[idx]
    const b = loop[(idx + 1) % loop.length]
    const len = Math.hypot(b.x - a.x, b.y - a.y)
    if (len > 0 && len < shortest) shortest = len
  }
  return Number.isFinite(shortest) ? shortest : 0
}

/**
 * Which sheet sides a point sits on, as a bitmask — the one place retreat is
 * NOT free.
 *
 * Retreating anywhere else only uncovers paper the child already cleared. On
 * the sheet's own border it would uncover paper nobody has touched: the reveal
 * grid tiles the WHOLE viewBox (`revealGrid.ts`), so at level start the union
 * IS the sheet rectangle and a deep inward bow there would open a bare margin
 * around a pile that is supposed to cover the enclosure floor. Pinning those
 * edges also means the very first frame of a leaves level renders exactly as it
 * did before this clamp was split — every edge and every vertex of that one
 * loop is on the border, so nothing there moves.
 *
 * `boundaryLoops` emits tile corners verbatim, so these comparisons are against
 * exact grid arithmetic; the half-unit tolerance only absorbs float drift in
 * `width / cols`.
 */
function sheetSides(point: Point, bounds: ArtBox): number {
  const eps = 0.5
  let sides = 0
  if (Math.abs(point.x - bounds.x) < eps) sides |= 1
  if (Math.abs(point.x - (bounds.x + bounds.width)) < eps) sides |= 2
  if (Math.abs(point.y - bounds.y) < eps) sides |= 4
  if (Math.abs(point.y - (bounds.y + bounds.height)) < eps) sides |= 8
  return sides
}

/** An edge lies ON the border only when both ends share the same side — two
 *  points on DIFFERENT borders (the run across a corner notch, say) bound
 *  cleared paper, not paper's edge. */
function onSheetEdge(a: Point, b: Point, bounds: ArtBox): boolean {
  return (sheetSides(a, bounds) & sheetSides(b, bounds)) !== 0
}

/**
 * Pull the frontier's vertices back into the pile.
 *
 * The direction is the negated bisector of the two edge normals meeting at the
 * vertex, so it is the retreat direction by construction rather than by a sign
 * guess — the winding argument above is what makes that hold on hole loops too.
 * The magnitude is `(0.5 + jitter(…, 1))`, which lands in `[0, 1]` and so is
 * NEVER negative: a vertex can only ever uncover more, which is why no amount
 * of noise here can reintroduce the pile-eats-the-hole failure. Adjacent
 * vertices draw independent amounts, and that is what turns a right-angled
 * stair step into a ragged one. Vertices on the sheet border do not move at
 * all.
 */
function retreatVertices(loop: readonly Point[], loopIndex: number, pull: number, bounds: ArtBox): Point[] {
  const count = loop.length
  return loop.map((point, idx) => {
    if (sheetSides(point, bounds) !== 0) return point
    const prev = loop[(idx - 1 + count) % count]
    const next = loop[(idx + 1) % count]
    const before = outwardNormal(prev, point)
    const after = outwardNormal(point, next)
    const bx = before.x + after.x
    const by = before.y + after.y
    const blen = Math.hypot(bx, by)
    // A 180-degree reversal (a degenerate one-cell spur) cancels the bisector;
    // there is no well-defined retreat there, so leave that vertex alone.
    if (blen === 0) return point
    const amount = (0.5 + jitter(loopIndex * 617 + idx * 43 + point.x * 0.011 + point.y * 0.013, 1)) * pull
    return { x: point.x - (bx / blen) * amount, y: point.y - (by / blen) * amount }
  })
}

function outwardNormal(a: Point, b: Point): Point {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len = Math.hypot(dx, dy) || 1
  return { x: dy / len, y: -dx / len }
}

/**
 * The leaf pile's own frontier — what `erodedSandLoopPath` is for sand, given
 * a deliberately different character rather than one shared parameterised
 * curve generator. Sand erodes: three noise-pushed samples per cell edge, so
 * the drift reads as swept grit. A raked leaf pile does not erode; it ends in
 * overlapping blades, so this spends each edge on a whole number of cubic lobes
 * whose COUNT comes from that edge's own length plus noise. A long exposed edge
 * therefore scallops repeatedly while a one-cell hole gets a single blade —
 * which is what stops a short erase hole from reading as a rounded rectangle,
 * the exact defect the sand perimeter follow-up fixed (`apply-progress.md`,
 * "Independent Visual-QA P2 Follow-up"). Handedness matches sand's:
 * `boundaryLoops` winds the outer union clockwise and holes counter-clockwise,
 * so one outward normal serves both — and, per `LEAF_ADVANCE_DEPTH`, so does
 * one sign rule for which way is dangerous. Cubic `C` (sand uses `Q`) — plain
 * path data, no `<defs>` and no `url(#…)`, per this file's header ban.
 */
function lobedLeafLoopPath(points: readonly Point[], loopIndex: number, sheetBounds: ArtBox): string {
  const closed = pointKey(points[0]) === pointKey(points[points.length - 1]) ? points.slice(0, -1) : [...points]
  if (closed.length < 3) return ''

  const cell = shortestEdge(closed)
  const islandRetreat = Math.max(LEAF_ADVANCE_DEPTH, cell * LEAF_RETREAT_RATIO)
  const loop = retreatVertices(closed, loopIndex, cell * LEAF_VERTEX_PULL_RATIO, sheetBounds)

  const parts: string[] = []
  for (let idx = 0; idx < loop.length; idx++) {
    const a = loop[idx]
    const b = loop[(idx + 1) % loop.length]
    // Per EDGE, not per loop. A cleared blob that happens to touch the paper's
    // border is topologically part of the outer contour rather than a hole, yet
    // its frontier is the same stair-stepped rectangle geometry an enclosed
    // island shows — so the licence has to follow which paper an edge bounds,
    // not which loop it was walked in. Only the border edges themselves stay on
    // the original symmetric bound.
    const border = onSheetEdge(a, b, sheetBounds)
    const retreatLimit = border ? LEAF_ADVANCE_DEPTH : islandRetreat
    // The raised cap alone would never bind: the raw noise below only reaches
    // about -13 on a full-cell span, well inside the old ±24. So the safe half
    // of the signed depth is GAINED into that headroom as well. Without this
    // the bound would widen on paper and the frontier would stay exactly as
    // straight as it is today.
    const retreatGain = border ? 1 : 3.2
    const dx = b.x - a.x
    const dy = b.y - a.y
    const len = Math.hypot(dx, dy) || 1
    const outward = { x: dy / len, y: -dx / len }
    const tangent = { x: dx / len, y: dy / len }
    const edgeSeed = loopIndex * 733 + idx * 97 + a.x * 0.017 + a.y * 0.023
    const lobes = Math.max(1, Math.round(len / LEAF_LOBE_SPAN + jitter(edgeSeed, 0.9)))
    const span = len / lobes
    for (let lobe = 0; lobe < lobes; lobe++) {
      const seed = edgeSeed + lobe * 31
      const p0 = { x: a.x + dx * (lobe / lobes), y: a.y + dy * (lobe / lobes) }
      const p1 = { x: a.x + dx * ((lobe + 1) / lobes), y: a.y + dy * ((lobe + 1) / lobes) }
      // SIGNED, with only a small outward bias. An always-outward bow was tried
      // first and rejected by arithmetic, not taste: it inflates the pile in
      // every direction, so on an interior hole the pile EATS the hole — one
      // cleared 66.7-wide cell comes back ~22 units narrower per side and the
      // child barely sees what they just erased.
      const raw = jitter(seed, span * 0.56) + span * 0.08
      // ASYMMETRIC about that sign, because the two directions are not equally
      // risky (see `LEAF_ADVANCE_DEPTH`). Positive is `outward`: into the hole
      // on an island loop, off the covered union on the outer one — in both
      // cases the pile advancing over cleared paper, so it keeps the original
      // tight bound everywhere, unconditionally. Negative is the pile
      // retreating, which can only ever expose more of what the child already
      // erased. Widening BOTH sides instead would be the rejected
      // always-outward bow with extra steps.
      const depth =
        raw >= 0 ? Math.min(LEAF_ADVANCE_DEPTH, raw) : Math.max(-retreatLimit, raw * retreatGain)
      // Asymmetry, so no two lobes are the same blade seen twice.
      const skew = jitter(seed + 53, span * 0.2)
      if (parts.length === 0) parts.push(`M ${p0.x} ${p0.y}`)
      const c1 = {
        x: p0.x + tangent.x * (span * 0.2 + skew) + outward.x * depth,
        y: p0.y + tangent.y * (span * 0.2 + skew) + outward.y * depth,
      }
      const c2 = {
        x: p1.x - tangent.x * (span * 0.2 - skew) + outward.x * depth * 0.66,
        y: p1.y - tangent.y * (span * 0.2 - skew) + outward.y * depth * 0.66,
      }
      parts.push(`C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${p1.x} ${p1.y}`)
    }
  }
  parts.push('Z')
  return parts.join(' ')
}

function leafSilhouettePath(loops: readonly Point[][], sheetBounds: ArtBox): string {
  return loops.map((loop, idx) => lobedLeafLoopPath(loop, idx, sheetBounds)).filter(Boolean).join(' ')
}

function pointInTile(tile: TraceRevealTile, px: number, py: number): boolean {
  return px >= tile.x && px <= tile.x + tile.w && py >= tile.y && py <= tile.y + tile.h
}

function pointInAnyTile(tiles: readonly TraceRevealTile[], px: number, py: number): boolean {
  return tiles.some((tile) => pointInTile(tile, px, py))
}

function wholePaneStreaks(sheetBounds: ArtBox): readonly { path: string; anchor: Point }[] {
  const { x, y, width, height } = sheetBounds
  return Array.from({ length: 18 }, (_, idx) => {
    const row = idx % 6
    const band = Math.floor(idx / 6)
    const y0 = y + height * (0.12 + row * 0.145) + jitter(idx + 11, height * 0.025)
    const x0 = x + width * (0.06 + band * 0.31) + jitter(idx + 23, width * 0.025)
    const len = width * (0.07 + ((idx + 1) % 4) * 0.018)
    const wobble = height * (0.006 + (idx % 2) * 0.004)
    return {
      path: `M ${x0} ${y0} C ${x0 + len * 0.28} ${y0 + wobble}, ${x0 + len * 0.7} ${y0 - wobble}, ${x0 + len} ${y0 + wobble * 0.35}`,
      anchor: { x: x0 + len * 0.5, y: y0 },
    }
  })
}

function wholePaneDroplets(sheetBounds: ArtBox): readonly { cx: number; cy: number; r: number }[] {
  const { x, y, width, height } = sheetBounds
  return Array.from({ length: 12 }, (_, idx) => ({
    cx: x + width * (0.09 + (idx % 6) * 0.16) + jitter(idx + 41, width * 0.018),
    cy: y + height * (0.18 + Math.floor(idx / 6) * 0.48) + jitter(idx + 59, height * 0.055),
    r: Math.max(1.8, Math.min(width, height) * (0.006 + (idx % 3) * 0.0015)),
  }))
}

function wholePaneSandCues(sheetBounds: ArtBox): readonly {
  cx: number
  cy: number
  rx: number
  ry: number
  rotate: number
  rock: boolean
}[] {
  const { x, y, width, height } = sheetBounds
  return Array.from({ length: 27 }, (_, idx) => {
    const fx = (0.08 + idx * 0.61803398875) % 0.9
    const fy = (0.12 + idx * 0.38196601125 + (idx % 4) * 0.07) % 0.82
    const rock = idx % 6 === 0
    return {
      cx: x + width * (0.05 + fx),
      cy: y + height * (0.07 + fy),
      rx: rock ? 7 + (idx % 3) * 2 : 2.2 + (idx % 4) * 0.7,
      ry: rock ? 4.5 + (idx % 2) * 1.5 : 1.5 + (idx % 3) * 0.45,
      rotate: -32 + (idx * 47) % 67,
      rock,
    }
  })
}

function wholePaneSandSweeps(sheetBounds: ArtBox): readonly { path: string; anchor: Point }[] {
  const { x, y, width, height } = sheetBounds
  return Array.from({ length: 9 }, (_, idx) => {
    const x0 = x + width * (0.08 + ((idx * 0.29) % 0.74))
    const y0 = y + height * (0.14 + ((idx * 0.23) % 0.68))
    const len = width * (0.055 + (idx % 3) * 0.018)
    return {
      path: `M ${x0} ${y0} Q ${x0 + len * 0.48} ${y0 - height * 0.015}, ${x0 + len} ${y0 + height * 0.004}`,
      anchor: { x: x0 + len * 0.5, y: y0 },
    }
  })
}

/** Small stones sitting in the mud, the wet-earth peer of `wholePaneSandCues`'s
 *  `rock` variant. `sand3`'s grid is denser than `sand1`'s (20x12 vs 10x6), so
 *  this stays a fixed pane-wide count rather than scaling with `cols`/`rows` —
 *  the same design `wholePaneSandCues` already makes, and the same reason: a
 *  cell-count-scaled scatter would make the decoration density (not just the
 *  reveal grid) part of a level's difficulty tuning. */
function wholePaneMudPebbles(sheetBounds: ArtBox): readonly {
  cx: number
  cy: number
  rx: number
  ry: number
  rotate: number
}[] {
  const { x, y, width, height } = sheetBounds
  return Array.from({ length: 24 }, (_, idx) => {
    const fx = (0.06 + idx * 0.61803398875) % 0.91
    const fy = (0.09 + idx * 0.38196601125 + (idx % 4) * 0.06) % 0.85
    return {
      cx: x + width * (0.04 + fx),
      cy: y + height * (0.07 + fy),
      rx: 2.4 + (idx % 4) * 1.15,
      ry: 1.6 + (idx % 3) * 0.85,
      rotate: -30 + ((idx * 43) % 73),
    }
  })
}

/** Small puddles catching the sky, the one wet-specific decoration neither
 *  sand nor leaves carries (mud is what stays wet after the rest of the
 *  entrance dries). Bigger and far sparser than a pebble — a puddle reads at
 *  a glance, it does not need repetition to be legible (docs/09 §5's own
 *  "does it survive repeated" test is about a THIRTY-times mark; six puddles
 *  scattered over one enclosure floor is not that kind of mark). */
function wholePaneMudPuddles(sheetBounds: ArtBox): readonly { cx: number; cy: number; rx: number; ry: number }[] {
  const { x, y, width, height } = sheetBounds
  return Array.from({ length: 6 }, (_, idx) => {
    const fx = (0.14 + idx * 0.5395) % 0.76
    const fy = (0.18 + idx * 0.4213) % 0.68
    return {
      cx: x + width * (0.08 + fx),
      cy: y + height * (0.1 + fy),
      rx: 9 + (idx % 3) * 4.5,
      ry: 4.5 + (idx % 2) * 2.5,
    }
  })
}

/** How many blades the pane carries. Raised from 44 by real-browser visual QA
 *  (system Chromium, 30 cells over three viewports): at `844x390` — the
 *  realistic play viewport, where a 1000-unit viewBox lands at roughly 0.45
 *  device px per unit — 44 blades over a 1000x600 sheet left gaps wide enough
 *  that the pile read as a flat olive mat with scattered specks instead of
 *  overlapping litter. The ceiling is the frontier and the enclosure's own
 *  sign underneath: a blade renders only when its WHOLE outline sits over
 *  still-covered tiles (`bladeProbes` below), so a denser scatter cannot creep
 *  into what the child already cleared. Raising this number is therefore the
 *  sanctioned way to pay for the thinning that gate causes at the frontier —
 *  loosening the gate back to the anchor is not. */
const LEAF_BLADE_COUNT = 128

/**
 * Where a blade's ink actually lands, as points the frontier gate can test.
 *
 * Gating on the anchor tests the blade's CENTRE, and a blade is up to
 * `2 * half` = 52.8 units long against the 66.7-unit play cell — so an anchor
 * one unit inside the frontier still paints up to 26.4 units of leaf ink onto
 * paper the child just cleared. Independent review measured 5 blades and 1 rake
 * overhanging a 3x2 erased block on the real 15x9 grid, worst overhang 20.4
 * units; this file's own fixture reproduces 16.8. That is exactly the ink
 * `LEAF_ADVANCE_DEPTH` exists to keep off cleared paper — the silhouette was
 * bounded and the decoration painted on top of it was not.
 *
 * Nine points, in local blade coordinates before the render's own `rotate`:
 * the two tips, three samples along each belly quadratic (a quadratic through
 * `(±half, 0)` with control `(0, ∓belly)` reaches only `belly / 2`, so the
 * extremes are `t = 0.5` — not the control point), and the centre FIRST so the
 * common far-outside blade rejects after a single tile scan. Both blade axes
 * are shorter than one cell, so a body crossing a cleared cell always drags one
 * of these into it. Computed once with the scatter — pane-relative and
 * deterministic, like the scatter itself — never per render.
 */
function bladeProbes(cx: number, cy: number, half: number, belly: number, rotate: number): Point[] {
  const rad = (rotate * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  const local: readonly Point[] = [
    { x: 0, y: 0 },
    { x: -half, y: 0 },
    { x: half, y: 0 },
    { x: -half / 2, y: -belly * 0.375 },
    { x: 0, y: -belly * 0.5 },
    { x: half / 2, y: -belly * 0.375 },
    { x: -half / 2, y: belly * 0.375 },
    { x: 0, y: belly * 0.5 },
    { x: half / 2, y: belly * 0.375 },
  ]
  return local.map((p) => ({ x: cx + p.x * cos - p.y * sin, y: cy + p.x * sin + p.y * cos }))
}

/** Individual blades scattered over the WHOLE pane, exactly like
 *  `wholePaneSandCues`: deterministic and pane-relative, so clearing a cell
 *  never re-rolls the survivors (the render below drops any blade whose whole
 *  outline is no longer over covered tiles, via `probes`). A blade is a pointed
 *  oval — two quadratics, tip to tip — not sand's ellipse, because that is the
 *  silhouette that reads as a leaf at this size. Three tones, because the silhouette below
 *  paints one flat union: these blades ARE the pile's internal relief, so they
 *  carry a shadowed one, a lit one, and a dry one off the backdrop's amber. */
function wholePaneLeafCues(sheetBounds: ArtBox): readonly {
  path: string
  anchor: Point
  probes: readonly Point[]
  rotate: number
  fill: string
  opacity: number
}[] {
  const { x, y, width, height } = sheetBounds
  return Array.from({ length: LEAF_BLADE_COUNT }, (_, idx) => {
    // The same irrational strides the sand cues use, so the scatter never
    // lines up with the reveal grid's own columns and rows.
    const fx = (0.06 + idx * 0.61803398875) % 0.88
    const fy = (0.1 + idx * 0.38196601125 + (idx % 5) * 0.06) % 0.8
    const cx = x + width * (0.06 + fx)
    const cy = y + height * (0.08 + fy)
    // Blade LENGTH, raised alongside the count for the same measured reason:
    // the old `10 + (idx % 5) * 2.4` rendered 9-18 device px at `844x390`,
    // which is under the size at which a pointed oval reads as a leaf rather
    // than as a speck.
    const half = 15 + (idx % 7) * 1.9
    const tone = idx % 3
    // Belly (half-width) is driven by a SEPARATE index term from the tone, and
    // deliberately by an irrational stride rather than another modulus: with
    // the old `idx % 3` driving both, belly was a pure function of tone, so
    // `LEAF_DRY` — the amber blade, by far the most visible against
    // `LEAF_BASE` and therefore the one a child actually notices — was
    // PERMANENTLY the thinnest silhouette of the three. Real captures read
    // those blades as twigs or pine needles. The stride below (√2 − 1) shares
    // no period with 3, so every tone now spans the whole fatness range;
    // swapping which tone got the thin constant would have kept the coupling.
    const plump = (idx * 0.41421356237) % 1
    // On top of that decorrelated spread, the amber blade gets a flat bonus:
    // it is the one doing the visual work, so it should also be the fattest
    // silhouette on average, not merely no longer the thinnest.
    const belly = half * (0.34 + plump * 0.22) + (tone === 0 ? 3.2 : 0)
    const rotate = -48 + ((idx * 53) % 97)
    return {
      path: `M ${cx - half} ${cy} Q ${cx} ${cy - belly}, ${cx + half} ${cy} Q ${cx} ${cy + belly}, ${cx - half} ${cy} Z`,
      anchor: { x: cx, y: cy },
      probes: bladeProbes(cx, cy, half, belly, rotate),
      rotate,
      fill: tone === 0 ? LEAF_DRY : tone === 1 ? LEAF_RIM : LEAF_DEEP,
      // The two GREEN tones sat at a luma delta of only 12-20 out of 255
      // against `LEAF_BASE` at their old 0.46/0.52, so two blades in three
      // effectively vanished and the amber third had to carry the whole read.
      // Raising their alpha (not their hex — the palette is authored) lifts
      // `LEAF_RIM` to roughly +28 and `LEAF_DEEP` to roughly -23, which is
      // where a blade separates from the mat. The amber keeps its 0.68: it was
      // never the tone that failed to show.
      opacity: tone === 0 ? 0.68 : tone === 1 ? 0.66 : 0.7,
    }
  })
}

/** The rake's own marks — the leaves peer of `wholePaneSandSweeps`, straighter
 *  and longer because a rake leaves furrows where wind leaves curved drifts.
 *
 *  A furrow is 70-100 units long, so the anchor gate was even weaker here than
 *  on a blade: measured reach past the midpoint was 50.9 units, three quarters
 *  of a play cell. `probes` samples the quadratic at fifths — the curve is
 *  shallow (`drop` is at most 19.2 against a length of 100), so five samples
 *  bracket it far more tightly than the cell the gate is resolving against, and
 *  the two ENDPOINTS are what the old anchor was missing. */
function wholePaneLeafRakes(sheetBounds: ArtBox): readonly { path: string; probes: readonly Point[] }[] {
  const { x, y, width, height } = sheetBounds
  return Array.from({ length: 8 }, (_, idx) => {
    const x0 = x + width * (0.1 + ((idx * 0.31) % 0.7))
    const y0 = y + height * (0.13 + ((idx * 0.27) % 0.66))
    const len = width * (0.07 + (idx % 3) * 0.015)
    const drop = height * (0.022 + (idx % 2) * 0.01)
    const at = (t: number): Point => ({
      x: (1 - t) * (1 - t) * x0 + 2 * t * (1 - t) * (x0 + len * 0.55) + t * t * (x0 + len),
      y: (1 - t) * (1 - t) * y0 + 2 * t * (1 - t) * (y0 + drop * 0.5) + t * t * (y0 + drop),
    })
    return {
      path: `M ${x0} ${y0} Q ${x0 + len * 0.55} ${y0 + drop * 0.5}, ${x0 + len} ${y0 + drop}`,
      // Midpoint first: it is the old anchor, so the far-outside furrow still
      // rejects on one tile scan.
      probes: [at(0.5), at(0), at(0.25), at(0.75), at(1)],
    }
  })
}

export function RevealLayer({ reveal, sheetBounds, displayBounds = sheetBounds }: RevealLayerProps) {
  const glassFog = isGlassFog(reveal.fill)
  const nightVeil = isNightVeil(reveal.fill)
  const sand = reveal.visual === 'sand'
  // Opt-in by the level projection ONLY (`LevelPlay`'s `isLeavesRevealLevel`),
  // never inferred from `reveal.fill`: a future adventure reusing `LEAF_LITTER`
  // must not silently inherit this pile. The sand policy holds the same line.
  const leaves = reveal.visual === 'leaves'
  // The mud policy (T4, `sand3`/`sendero`): a third `boundaryLoops`-driven
  // silhouette, sharing sand's OWN erosion geometry (`erodedSandLoopPath` via
  // `sandSilhouettePath`) rather than a fourth curve generator — wet earth and
  // dry sand erode into the same kind of ragged, noise-pushed frontier; only
  // the paint differs. `leaves` earned its own `lobedLeafLoopPath` because a
  // raked pile ends in whole blades, a shape sand's erosion cannot produce;
  // mud has no such distinct silhouette need.
  const mud = reveal.visual === 'mud'
  // T7 rework #2 (orchestrator review, "the cleaning margins show seams"):
  // the flat single-colour margin patch this file's own earlier T7 commit
  // added read as a visibly DIFFERENT tone/texture from the real grid's own
  // multi-pass silhouette (body + deep wash + rim stroke), a hard seam at
  // exactly the old `sheetBounds` edge. Fixed by feeding the SAME organic
  // generator (`boundaryLoops`/`fogSilhouettePath`/`sandSilhouettePath`/
  // `leafSilhouettePath`) a few extra, non-scoring "margin tiles" ALONGSIDE
  // the real remaining ones — one continuous boundary, one continuous
  // fill/opacity, no seam, because it is the SAME path.
  //
  // `marginGridTiles`, not `marginBands`: the margin has to be tiled at the
  // SAME cell size and grid lines as the real tiles (`reveal.tiles[0]`'s own
  // `w`/`h`) — `marginGridTiles`'s own header explains why a few large
  // rectangles broke `boundaryLoops`' edge-cancellation outright (a
  // self-intersecting oval blob, not a clean frontier).
  //
  // Never scored: `marginTiles` never reaches `evaluateLevel`/
  // `revealGrid.ts`, only this render. `reveal.tiles.length > 0` gates it
  // OFF the instant the REAL grid finishes — "the extra area clears
  // together with the rest" — by falling back to the bare (now also empty)
  // `reveal.tiles`, which is exactly what already makes `fogPath`/
  // `sandPath`/etc render nothing at real completion.
  const marginTiles: TraceRevealTile[] =
    reveal.tiles.length > 0 && !nightVeil
      ? marginGridTiles(displayBounds, sheetBounds, reveal.tiles[0].w, reveal.tiles[0].h)
      : []
  const tilesWithMargin = marginTiles.length > 0 ? [...reveal.tiles, ...marginTiles] : reveal.tiles
  const fogPath = glassFog ? fogSilhouettePath(tilesWithMargin) : ''
  const sandLoops = sand ? boundaryLoops(tilesWithMargin) : []
  const sandPath = sand ? sandSilhouettePath(sandLoops) : ''
  const leafLoops = leaves ? boundaryLoops(tilesWithMargin) : []
  // `displayBounds`, not `sheetBounds`: this is the frontier's OWN outer-
  // border test (`onSheetEdge`/`sheetSides`) — with the margin merged in,
  // the true outer border moved to `displayBounds`'s own edge, so THAT is
  // the box whose sides may never retreat, not the old (now interior)
  // `sheetBounds` edge.
  const leafPath = leaves ? leafSilhouettePath(leafLoops, displayBounds) : ''
  const mudLoops = mud ? boundaryLoops(tilesWithMargin) : []
  const mudPath = mud ? sandSilhouettePath(mudLoops) : ''
  const streaks = glassFog ? wholePaneStreaks(sheetBounds) : []
  const droplets = glassFog ? wholePaneDroplets(sheetBounds) : []
  const sandCues = sand ? wholePaneSandCues(sheetBounds) : []
  const sandSweeps = sand ? wholePaneSandSweeps(sheetBounds) : []
  const leafCues = leaves ? wholePaneLeafCues(sheetBounds) : []
  const leafRakes = leaves ? wholePaneLeafRakes(sheetBounds) : []
  const mudPebbles = mud ? wholePaneMudPebbles(sheetBounds) : []
  const mudPuddles = mud ? wholePaneMudPuddles(sheetBounds) : []
  const hiddenArt = reveal.art?.filter((obj) => !obj.revealed) ?? []
  const revealedArt = reveal.art?.filter((obj) => obj.revealed) ?? []
  const nightVeilSourcesList = nightVeil ? nightVeilSources(reveal.tiles) : null
  // T10 ("when ALL objects are found... the light grows outward"): while
  // the completion wash is still growing (`reveal.light.growth < 1`, set
  // ONLY once every object is found — `screen/LevelPlay.tsx`'s own `reveal`
  // projection), every active source's radius is lerped from its own
  // current (already-grown, per-object) size out to whatever it takes to
  // reach the farthest corner of `displayBounds` — so the union naturally
  // swallows the whole screen by the time `growth` reaches 1, instead of
  // popping from "found objects lit" straight to "no veil at all"
  // (`LevelPlay.tsx`'s `allRevealTiles` bypass, which still owns the AFTER
  // state once this grow finishes). `growth` is undefined/1 every other
  // time (not complete yet, or complete and already fully grown), so this
  // is a no-op then — every source keeps exactly its own already-grown
  // radius, byte-identical to before T10 for that case.
  const completionGrowth = reveal.light?.complete ? reveal.light.growth : undefined
  // T10 defect fix (orchestrator review, "a grid of small white dots" +
  // "a pale disk with a hard edge" mid-completion): `data-night-success-glow`
  // and `data-night-celebration` below used to gate on `reveal.light?.complete`
  // ALONE — correct back when completion was instantaneous (T9), but once
  // T10 made it grow over `LIGHT_COMPLETE_GROWTH_MS`, `complete` turns true
  // on the FIRST frame of that grow, long before the darkness has actually
  // finished clearing. Both are "the level is fully lit" chrome, so they now
  // wait for the grow to actually finish too (`completionGrowth` undefined
  // or `>= 1` — `screen/LevelPlay.tsx`'s own `reveal` projection only ever
  // sends a `growth < 1` while `stillGrowingCompletion` holds).
  const completionSettled = completionGrowth === undefined || completionGrowth >= 1
  const nightVeilSourcesGrown =
    nightVeilSourcesList && completionGrowth !== undefined && completionGrowth < 1
      ? nightVeilSourcesList.map((s) => {
          const target = farthestCornerDistance(s.cx, s.cy, displayBounds)
          return target > s.radius ? { ...s, radius: s.radius + (target - s.radius) * completionGrowth } : s
        })
      : nightVeilSourcesList
  // T7 rework: the night darkness's own full-sheet rectangle grows to
  // `displayBounds` (`RevealLayerProps`'s own header) — the SOURCE positions
  // are untouched by that box, so a found object or the live torch lights
  // exactly the same spot it always did; only how far the surrounding
  // darkness now reaches (and, T10, how far a completing source's own grow
  // targets) changes.
  const nightVeilGeometry = nightVeilSourcesGrown ? nightVeilLayers(nightVeilSourcesGrown, displayBounds) : null
  // The plain per-tile fallback ONLY (no `visual` policy at all — an
  // untextured `mode:'erase'` level, if one is ever shipped): none of the
  // four named policies above apply, so there is no silhouette generator to
  // merge the margin into. Falls back to the flat single-fill patch this
  // file's own earlier T7 commit used for every policy — same "clears
  // together" gate (`reveal.tiles.length > 0`, via `marginTiles` above,
  // already computed for this exact case since `plainFallback` is neither
  // glass/sand/leaves/mud).
  const plainFallback = !glassFog && !sand && !leaves && !mud && !nightVeil
  const plainMargin = plainFallback ? marginTiles : []

  return (
    <g pointerEvents="none">
      {plainMargin.map((tile, idx) => (
        <rect
          key={`reveal-margin-${idx}`}
          data-reveal-margin="true"
          x={tile.x}
          y={tile.y}
          width={tile.w}
          height={tile.h}
          fill={reveal.fill}
        />
      ))}
      {hiddenArt.map((obj, idx) => (
        <image
          key={`reveal-art-hidden-${idx}`}
          href={obj.href}
          {...clampArtBox(placeArt(obj, obj.size, { x: obj.x, y: obj.y }), sheetBounds)}
          preserveAspectRatio="xMidYMid meet"
        />
      ))}
      {nightVeil && hiddenArt.map((obj, idx) => (
        <g key={`night-hint-${idx}`} data-night-hint="true">
          <circle cx={obj.x} cy={obj.y} r={Math.max(34, obj.size * 0.64)} fill={NIGHT_HINT} opacity={0.11} />
          <circle cx={obj.x} cy={obj.y} r={Math.max(24, obj.size * 0.44)} fill={NIGHT_HINT} opacity={0.13} />
          <path
            d={`M ${obj.x} ${obj.y - 27} L ${obj.x + 8} ${obj.y - 8} L ${obj.x + 27} ${obj.y} L ${obj.x + 8} ${obj.y + 8} L ${obj.x} ${obj.y + 27} L ${obj.x - 8} ${obj.y + 8} L ${obj.x - 27} ${obj.y} L ${obj.x - 8} ${obj.y - 8} Z`}
            fill={NIGHT_HINT}
            opacity={0.24}
          />
        </g>
      ))}
      {/* T10 defect fix (play-test 2026-09-26, item 3: "there's a light in
          the centre even though there's nothing there... adds nothing and
          is ugly"). This used to render, UNDER the veil, a warm decorative
          glow at `reveal.light`'s own position (two soft halos plus a small
          opaque `#fffbe6` dot dead centre) any time the torch was held. It
          predates T9: back when the veil was tile-stepped, this group was
          the ONLY thing giving the torch a visible soft edge. T9 replaced
          the veil with real radial falloff bands carved into the darkness
          itself (`nightVeilLayers`, now T10's union of them) — that geometry
          alone already fully describes what is and is not lit, so this
          group has painted a redundant highlight, always exactly matching
          wherever the child points regardless of whether anything is
          actually there, ever since. Removed outright, the same call T2
          made for the old always-on object-position halo just above. */}
      {glassFog && fogPath && (
        <g data-fog-pane="glass">
          <path data-fog-silhouette="glass" d={fogPath} fill={reveal.fill} fillRule="evenodd" opacity={0.78} />
          <path d={fogPath} fill={GLASS_FROST} fillRule="evenodd" opacity={0.16} />
          <path d={fogPath} fill="none" stroke={GLASS_EDGE} strokeWidth={24} strokeLinecap="round" strokeLinejoin="round" opacity={0.16} />
          {streaks.map((d, idx) => {
            if (!pointInAnyTile(reveal.tiles, d.anchor.x, d.anchor.y)) return null
            return (
              <path
                key={`fog-streak-${idx}`}
                data-fog-streak="true"
                d={d.path}
                fill="none"
                stroke={GLASS_FOG_STROKE}
                strokeWidth={Math.max(1.6, Math.min(sheetBounds.width, sheetBounds.height) * 0.006)}
                strokeLinecap="round"
                opacity={0.52}
              />
            )
          })}
          {droplets.map((drop, idx) => {
            if (!pointInAnyTile(reveal.tiles, drop.cx, drop.cy)) return null
            return <circle key={`fog-drop-${idx}`} cx={drop.cx} cy={drop.cy} r={drop.r} fill={GLASS_DROPLET_FILL} opacity={0.38} />
          })}
        </g>
      )}
      {sand && sandPath && (
        <g data-sand-drift="true">
          <path
            data-sand-silhouette="true"
            d={sandPath}
            fill={SAND_BASE}
            fillRule="evenodd"
            stroke={SAND_BASE}
            strokeWidth={52}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d={sandPath} fill={SAND_WARM} fillRule="evenodd" opacity={0.28} />
          <path
            d={sandPath}
            fill="none"
            stroke={SAND_EDGE}
            strokeWidth={12}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.55}
          />
          {sandSweeps.map((sweep, idx) =>
            pointInAnyTile(reveal.tiles, sweep.anchor.x, sweep.anchor.y) ? (
              <path
                key={`sand-sweep-${idx}`}
                data-sand-sweep="true"
                d={sweep.path}
                fill="none"
                stroke={SAND_EDGE}
                strokeWidth={3}
                strokeLinecap="round"
                opacity={0.48}
              />
            ) : null,
          )}
          {sandCues.map((cue, idx) =>
            pointInAnyTile(reveal.tiles, cue.cx, cue.cy) ? (
              <ellipse
                key={`sand-grain-${idx}`}
                data-sand-grain="true"
                cx={cue.cx}
                cy={cue.cy}
                rx={cue.rx}
                ry={cue.ry}
                fill={cue.rock ? SAND_ROCK : SAND_GRAIN}
                opacity={cue.rock ? 0.78 : 0.62}
                transform={`rotate(${cue.rotate} ${cue.cx} ${cue.cy})`}
              />
            ) : null,
          )}
        </g>
      )}
      {leaves && leafPath && (
        <g data-leaf-litter="true">
          {/* One continuous union painted three times: body, a deep wash that
              reads as shadow under a pile, and a lifted rim. The body stroke is
              deliberately thin (sand's is 52) — a fat one would fill in the
              very lobe notches this policy exists to produce. */}
          <path
            data-leaf-silhouette="true"
            d={leafPath}
            fill={LEAF_BASE}
            fillRule="evenodd"
            stroke={LEAF_BASE}
            strokeWidth={12}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d={leafPath} fill={LEAF_DEEP} fillRule="evenodd" opacity={0.26} />
          <path d={leafPath} fill="none" stroke={LEAF_RIM} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" opacity={0.5} />
          {/* Gated on the WHOLE mark, not its midpoint: see `bladeProbes`. The
              frontier thins slightly as a result — a furrow or blade that
              straddles it is dropped whole rather than clipped — which is the
              intended reading of a pile edge, and is paid for by
              `LEAF_BLADE_COUNT` rather than by relaxing the gate. */}
          {leafRakes.map((rake, idx) =>
            rake.probes.every((p) => pointInAnyTile(reveal.tiles, p.x, p.y)) ? (
              <path
                key={`leaf-rake-${idx}`}
                data-leaf-rake="true"
                d={rake.path}
                fill="none"
                stroke={LEAF_DEEP}
                strokeWidth={4}
                strokeLinecap="round"
                opacity={0.34}
              />
            ) : null,
          )}
          {leafCues.map((cue, idx) =>
            cue.probes.every((p) => pointInAnyTile(reveal.tiles, p.x, p.y)) ? (
              <path
                key={`leaf-blade-${idx}`}
                data-leaf-blade="true"
                d={cue.path}
                fill={cue.fill}
                opacity={cue.opacity}
                transform={`rotate(${cue.rotate} ${cue.anchor.x} ${cue.anchor.y})`}
              />
            ) : null,
          )}
        </g>
      )}
      {mud && mudPath && (
        <g data-mud-drift="true">
          {/* Same three-pass layering as sand/leaves: body, a deep wet wash,
              a lighter rim where the mud catches the light — flat fills at
              varying opacity, no gradients (docs/09 §1/§4). */}
          <path
            data-mud-silhouette="true"
            d={mudPath}
            fill={MUD_BASE}
            fillRule="evenodd"
            stroke={MUD_BASE}
            strokeWidth={52}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d={mudPath} fill={MUD_DEEP} fillRule="evenodd" opacity={0.3} />
          <path
            d={mudPath}
            fill="none"
            stroke={MUD_EDGE}
            strokeWidth={12}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.45}
          />
          {mudPuddles.map((puddle, idx) =>
            pointInAnyTile(reveal.tiles, puddle.cx, puddle.cy) ? (
              <ellipse
                key={`mud-puddle-${idx}`}
                data-mud-puddle="true"
                cx={puddle.cx}
                cy={puddle.cy}
                rx={puddle.rx}
                ry={puddle.ry}
                fill={MUD_PUDDLE}
                opacity={0.4}
              />
            ) : null,
          )}
          {mudPebbles.map((pebble, idx) =>
            pointInAnyTile(reveal.tiles, pebble.cx, pebble.cy) ? (
              <ellipse
                key={`mud-pebble-${idx}`}
                data-mud-pebble="true"
                cx={pebble.cx}
                cy={pebble.cy}
                rx={pebble.rx}
                ry={pebble.ry}
                fill={MUD_PEBBLE}
                opacity={0.72}
                transform={`rotate(${pebble.rotate} ${pebble.cx} ${pebble.cy})`}
              />
            ) : null,
          )}
        </g>
      )}
      {nightVeil ? (
        nightVeilGeometry &&
        nightVeilGeometry.length > 0 && (
          <g data-night-veil="round">
            {nightVeilGeometry.map((layer, idx) => (
              <path
                key={`night-veil-layer-${idx}`}
                data-night-veil-base={layer.opacity >= 1 ? 'true' : undefined}
                data-night-veil-ring={layer.opacity < 1 ? idx : undefined}
                d={layer.d}
                fill={reveal.fill}
                fillRule="evenodd"
                {...(layer.opacity < 1 ? { opacity: layer.opacity } : {})}
              />
            ))}
          </g>
        )
      ) : (
        reveal.tiles.map((tile) => (
          <rect
            key={stableTileId(tile)}
            data-fog-tile-id={stableTileId(tile)}
            x={tile.x}
            y={tile.y}
            width={tile.w}
            height={tile.h}
            fill={reveal.fill}
            // Defect found by reading `capturas/d/glass1.png`, `sand2-revelado.png`
            // and `night2-linterna.png` (Phase 7.6): adjacent tiles sit at
            // fractional device pixels (a 1000-wide sheet over 15 columns is
            // 66.67 per tile), so two antialiased edges meeting at a fractional
            // pixel composite to a visible lighter hairline - a rendering
            // artifact, not a geometry gap; the tiles genuinely abut. A plain
            // presentation attribute, not a `url(#...)` reference.
            shapeRendering="crispEdges"
            // `leaves`/`mud` join `glassFog`/`sand` for the same reason: the visible
            // surface is the silhouette above, so these rects stay invisible
            // state/counting sentinels (reveal-grid spec, "Reveal Layer Renders as
            // Plain Rects With No Fragment Reference"). Count, keys, and geometry
            // are untouched, so folding and scoring cannot move.
            {...(glassFog || sand || leaves || mud ? { opacity: 0 } : tile.opacity < 1 ? { opacity: tile.opacity } : {})}
          />
        ))
      )}
      {nightVeil && reveal.light?.complete && completionSettled && (
        // T7 rework: `displayBounds`, not `sheetBounds` — the completion
        // wash is decorative chrome over the SAME area the darkness itself
        // just covered (above), so it grows with it rather than leaving a
        // smaller glow floating inside a bigger picture.
        <g data-night-success-glow="true">
          <path d={sheetRectPath(displayBounds)} fill={NIGHT_SUCCESS_WASH} opacity={0.16} />
          <circle cx={displayBounds.x + displayBounds.width * 0.5} cy={displayBounds.y + displayBounds.height * 0.45} r={Math.min(displayBounds.width, displayBounds.height) * 0.58} fill={NIGHT_SUCCESS_WASH} opacity={0.2} />
        </g>
      )}
      {/* Defect fix (play-test 2026-09-25, T2 item 2: "a circle/halo already
          marks where each hidden object is"). This group used to render a
          filled circle plus a ring at every UNFOUND object's exact (x, y),
          AFTER `reveal.tiles.map(...)` above — i.e. drawn on TOP of the dark
          veil rects, so it was visible from the very first frame regardless
          of the torch's position. Nothing in the mechanic needs it: the
          torch's own falloff (`data-night-torch`, `data-night-hint` above —
          that one stays UNDER the veil, so it only bleeds through once a
          tile near the object is already partly lit by real searching) and
          the level's hint text are what the search is supposed to run on.
          Removed outright rather than dimmed or gated: there was no
          solvability need for a permanent position marker, only a leftover
          hint layer nobody had reason to keep once the torch mechanic was
          shipped. */}
      {revealedArt.map((obj, idx) => {
        const box = clampArtBox(placeArt(obj, obj.size * (nightVeil ? 1.16 : 1), { x: obj.x, y: obj.y }), sheetBounds)
        return (
          <g key={`reveal-art-found-${idx}`} data-night-discovery="true">
            {nightVeil && (
              <>
                <circle cx={obj.x} cy={obj.y} r={Math.max(42, obj.size * 0.72)} fill={NIGHT_FOUND_GLOW} opacity={reveal.light?.complete && completionSettled ? 0.38 : 0.25} />
                <circle cx={obj.x} cy={obj.y} r={Math.max(28, obj.size * 0.5)} fill="#fffbe6" opacity={reveal.light?.complete && completionSettled ? 0.5 : 0.22} />
              </>
            )}
            <image href={obj.href} {...box} preserveAspectRatio="xMidYMid meet" opacity={nightVeil ? 1 : undefined} />
          </g>
        )
      })}
      {nightVeil && reveal.light?.complete && completionSettled && (
        <g data-night-celebration="true">
          {Array.from({ length: 14 }, (_, idx) => (
            <circle
              key={`night-star-${idx}`}
              cx={sheetBounds.x + sheetBounds.width * (0.12 + (idx % 7) * 0.125)}
              cy={sheetBounds.y + sheetBounds.height * (0.12 + Math.floor(idx / 7) * 0.68 + (idx % 2) * 0.06)}
              r={5 + (idx % 4)}
              fill="#fff6bf"
              opacity={0.9}
            />
          ))}
        </g>
      )}
    </g>
  )
}
