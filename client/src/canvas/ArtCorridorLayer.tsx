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
        return (
          <image
            key={`art-corridor-${idx}`}
            href={piece.href}
            x={piece.box.x}
            y={piece.box.y}
            width={piece.box.width}
            height={piece.box.height}
            preserveAspectRatio="xMidYMid meet"
            {...(piece.rotate ? { transform: `rotate(${piece.rotate} ${cx} ${cy})` } : {})}
          />
        )
      })}
    </g>
  )
}
