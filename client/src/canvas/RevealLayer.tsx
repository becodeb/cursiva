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
import { clampArtBox, placeArt, type ArtBox } from './placeArt'
import type { TraceReveal, TraceRevealTile } from './TraceCanvas'

export interface RevealLayerProps {
  reveal: TraceReveal
  /** The visible sheet band, for `clampArtBox` — the same `sheetBounds`
   *  every other art layer in `TraceCanvas.tsx` clamps against. */
  sheetBounds: ArtBox
}

const GLASS_GRIME_FILL = '#64726b'
const GLASS_FOG_STROKE = '#dcecf0'
const GLASS_DROPLET_FILL = '#eef8fb'
const GLASS_FROST = '#edf7fa'
const GLASS_EDGE = '#b8cbd0'

type Point = { x: number; y: number }
type Edge = { a: Point; b: Point }

function isGlassFog(fill: string): boolean {
  return fill.toLowerCase() === GLASS_GRIME_FILL
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

export function RevealLayer({ reveal, sheetBounds }: RevealLayerProps) {
  const glassFog = isGlassFog(reveal.fill)
  const fogPath = glassFog ? fogSilhouettePath(reveal.tiles) : ''
  const streaks = glassFog ? wholePaneStreaks(sheetBounds) : []
  const droplets = glassFog ? wholePaneDroplets(sheetBounds) : []

  return (
    <g pointerEvents="none">
      {reveal.art?.map((obj, idx) => (
        <image
          key={`reveal-art-${idx}`}
          href={obj.href}
          {...clampArtBox(placeArt(obj, obj.size, { x: obj.x, y: obj.y }), sheetBounds)}
          preserveAspectRatio="xMidYMid meet"
        />
      ))}
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
      {reveal.tiles.map((tile) => (
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
          {...(glassFog ? { opacity: 0 } : tile.opacity < 1 ? { opacity: tile.opacity } : {})}
        />
      ))}
    </g>
  )
}
