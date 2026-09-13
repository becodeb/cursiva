// The reveal grid's whole render contract (reveal-grid spec: "Reveal Layer
// Renders as Plain Rects With No Fragment Reference"; trace-canvas spec:
// "Reveal Layer Renders as Plain Rects Between Backdrop and Ink"; design.md
// §4.1). N plain `<rect>`s, no `<mask>`, no `<pattern>`, no `<clipPath>`, no
// `<defs>`, no `useId`, no `url(#…)` — `TraceCanvas.tsx`'s own scar
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
import type { TraceReveal } from './TraceCanvas'

export interface RevealLayerProps {
  reveal: TraceReveal
  /** The visible sheet band, for `clampArtBox` — the same `sheetBounds`
   *  every other art layer in `TraceCanvas.tsx` clamps against. */
  sheetBounds: ArtBox
}

export function RevealLayer({ reveal, sheetBounds }: RevealLayerProps) {
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
      {reveal.tiles.map((tile, idx) => (
        <rect
          key={`reveal-tile-${idx}`}
          x={tile.x}
          y={tile.y}
          width={tile.w}
          height={tile.h}
          fill={reveal.fill}
          // Defect found by reading `capturas/d/glass1.png`, `sand2-revelado.png`
          // and `night2-linterna.png` (Phase 7.6): adjacent tiles sit at
          // fractional device pixels (a 1000-wide sheet over 15 columns is
          // 66.67 per tile), so two antialiased edges meeting at a fractional
          // pixel composite to a visible lighter hairline — a rendering
          // artifact, not a geometry gap; the tiles genuinely abut. A plain
          // presentation attribute, not a `url(#…)` reference.
          shapeRendering="crispEdges"
          {...(tile.opacity < 1 ? { opacity: tile.opacity } : {})}
        />
      ))}
    </g>
  )
}
