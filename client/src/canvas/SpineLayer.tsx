// The spine fold's whole render contract (`radial-spines` spec: "No
// Fragment Reference Anywhere the Spine Fold's Output Is Rendered"; `trace-
// canvas` spec: "Spine Layer Renders as Plain Images and Marks..."; design.md
// §5). `WaypointLayer.tsx`'s own shape (51 lines): one plain `<image>` for
// the body, plus one `<circle>` per anchor mark, plus optional debug
// `<circle>` rings — one `<g pointerEvents="none">`, no `<mask>`,
// `<pattern>`, `<clipPath>`, `<defs>`, `useId`, no `url(#…)` —
// `TraceCanvas.tsx:78-93`'s own scar.
//
// Filled vs unfilled is a `fill` swap on the identical `<circle cx cy r>`
// (`docs/09` §4, §1's "un color plano por forma"): no stroke, no second
// shape, no movement.
//
// The body `<image>` passes through `clampArtBox` like every other art
// layer — `spines.body` is ALREADY the exact box `levels/spines.ts`'s
// `spineBody` computed, so the layer never recomputes placement
// independently of the scorer.
//
// The mark and ring colours are resolved by the CALLER, never here —
// `WaypointLayer`'s own convention, restated (`TraceClueMark`'s original).
import { clampArtBox, type ArtBox } from './placeArt'
import type { TraceSpines } from './TraceCanvas'

export interface SpineLayerProps {
  spines: TraceSpines
  /** The visible sheet band, for `clampArtBox` — the same `sheetBounds`
   *  every other art layer in `TraceCanvas.tsx` clamps against. */
  sheetBounds: ArtBox
}

export function SpineLayer({ spines, sheetBounds }: SpineLayerProps) {
  const bodyBox = clampArtBox(spines.body, sheetBounds)
  return (
    <g pointerEvents="none">
      <image href={spines.body.href} {...bodyBox} preserveAspectRatio="xMidYMid meet" />
      {spines.marks.map((mark, idx) => (
        <circle
          key={`spine-mark-${idx}`}
          cx={mark.x}
          cy={mark.y}
          r={spines.markRadius}
          fill={mark.filled ? spines.earned : spines.dim}
        />
      ))}
      {spines.rings?.map((ring, idx) => (
        <circle
          key={`spine-ring-${idx}`}
          cx={ring.x}
          cy={ring.y}
          r={ring.radius}
          fill="none"
          stroke={spines.ringStroke}
          strokeWidth={2}
        />
      ))}
    </g>
  )
}
