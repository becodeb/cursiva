// The art corridor's whole render contract (art-corridor spec, "Art Corridor
// Layer Render Contract — No Fragment Reference"; trace-canvas spec, "Art
// Corridor Layer Renders as Plain Images..."). One plain `<image>` per snake
// piece, `transform="rotate(…)"` only when the piece was authored with a
// rotation — no `<mask>`, `<pattern>`, `<clipPath>`, `<defs>`, `useId`, and no
// `url(#…)` — this file's own scar (`TraceCanvas.tsx:78-93`).
//
// Whether a box is the trace-phase `placeArtCorridor` placement or the live
// arrange-phase scatter/held/snapped position is decided by the CALLER
// (`screen/LevelPlay.tsx`); this layer only ever draws the box it is given.
//
// T20 (`odd/tasks/prewriting-stage-completion.md`, docs/19 §3.1): a piece
// carrying `colourHref`/`progress` (only the snakes, today) renders its GREY
// `href` first, then windows `colourHref` in over it through a NESTED
// `<svg>` — no `<mask>`, `<clipPath>`, `<pattern>` or `url(#…)`, the same
// scar as above.
//
// WHY A NESTED `<svg>` OVER THE ALTERNATIVES THIS TASK ASKED TO EVALUATE:
//  - A fixed number of pre-cut SLICES (build-time PNG strips) needs the
//    pipeline to author N extra files per snake and the client to pick a
//    slice count that trades granularity for markup size; a reveal that
//    stops mid-slice still needs SOME sub-slice mechanism to look smooth, at
//    which point the slicing has bought nothing over the continuous version
//    below.
//  - A CSS `clip-path: inset(...)` on the colour `<image>` reads exactly the
//    same as the nested-`<svg>` approach but is a `clip-path`/`clip` in
//    everything but name — this repo's own `url(#…)`/mask/clipPath ban
//    (`docs/13`'s constraints) is about SVG clip machinery in general, not
//    only the `<clipPath>` ELEMENT, and a nested `<svg>` viewport clip is the
//    one clipping mechanism the ban's own precedent (`TraceCanvas.tsx:78-93`)
//    explicitly carves out as allowed.
//  - `stroke-dasharray`/`stroke-dashoffset` reveal only works for a STROKED
//    path, not a raster `<image>` fill — no shape here to dash along.
// A nested `<svg>` sized to `box.width * progress` is the CONTINUOUS limit of
// "N vertical slices" (N → ∞): perfectly smooth reveal, no extra art, no
// slice-count tuning, and it is exactly the mechanism the task's own brief
// names as allowed. `x`/`y` on the nested `<svg>` shift its user space by the
// SAME amount as the parent's, with no `viewBox` — so the inner `<image>` is
// drawn at `(0, 0)`, one-for-one with the outer box's own coordinates,
// instead of needing a second coordinate system to reason about.
import type { TraceArtCorridor } from './TraceCanvas'

export interface ArtCorridorLayerProps {
  artCorridor: TraceArtCorridor
}

export function ArtCorridorLayer({ artCorridor }: ArtCorridorLayerProps) {
  return (
    <g pointerEvents="none">
      {artCorridor.map((piece, idx) => {
        const cx = piece.box.x + piece.box.width / 2
        const cy = piece.box.y + piece.box.height / 2
        // Kept on the `<image>` itself (never hoisted onto a wrapping `<g>`)
        // so the BASE image's own markup stays byte-identical to before this
        // task — `ArtCorridorLayer.test.tsx`'s rendered-markup coincidence
        // proof parses `transform="rotate(…)"` straight off the `<image>`
        // tag string. The reveal `<svg>` below carries the SAME attribute so
        // it rotates about the SAME pivot as the base image beneath it.
        const rotateAttr = piece.rotate ? { transform: `rotate(${piece.rotate} ${cx} ${cy})` } : {}
        const revealWidth =
          piece.colourHref && piece.progress !== undefined
            ? Math.max(0, Math.min(1, piece.progress)) * piece.box.width
            : 0
        return (
          // No `transform` on this wrapper — only `className` for the "wake
          // me next" pulse, so the base `<image>`'s own rotation semantics
          // (and the coincidence test that parses them) are untouched.
          <g key={`art-corridor-${idx}`} {...(piece.next ? { className: 'cv-snake-next' } : {})}>
            <image
              href={piece.href}
              x={piece.box.x}
              y={piece.box.y}
              width={piece.box.width}
              height={piece.box.height}
              preserveAspectRatio="xMidYMid meet"
              {...rotateAttr}
            />
            {piece.colourHref && revealWidth > 0 && (
              <svg
                x={piece.box.x}
                y={piece.box.y}
                width={revealWidth}
                height={piece.box.height}
                style={{ overflow: 'hidden' }}
                {...rotateAttr}
              >
                <image
                  href={piece.colourHref}
                  x={0}
                  y={0}
                  width={piece.box.width}
                  height={piece.box.height}
                  preserveAspectRatio="xMidYMid meet"
                />
              </svg>
            )}
          </g>
        )
      })}
    </g>
  )
}
