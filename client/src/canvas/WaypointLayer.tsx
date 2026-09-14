// The waypoint fold's whole render contract (`free-trail-waypoints` spec:
// "The Rendered Flower and Hive Coincide..."; `trace-canvas` spec: "Waypoint
// Layer Renders as Plain Images With No Fragment Reference"; design.md §5).
// `RevealLayer.tsx`'s art half, minus the tiles: N plain `<image>`s via
// `placeArt` + `clampArtBox`, plus optional debug `<circle>` rings — one
// `<g pointerEvents="none">`, no `<mask>`, `<pattern>`, `<clipPath>`,
// `<defs>`, `useId`, no `url(#…)` — `TraceCanvas.tsx:78-93`'s own scar.
//
// Grip and centring. `placeArt` reads `art.grip ?? DEFAULT_GRIP`, and
// neither the flower nor the honeycomb art declares a grip, so the art's
// CENTRE is the scored coordinate — by construction, not by coincidence.
// Deliberately NOT `STANDING_GRIP`: a flower and a hive on a forest floor
// drawn from above are not standing on a ground line.
//
// The ring stroke is resolved by the CALLER, never by this component:
// `TraceCanvas` holds no palette token, `TraceClueMark`'s own convention.
import { clampArtBox, placeArt, type ArtBox } from './placeArt'
import type { TraceWaypoints } from './TraceCanvas'

export interface WaypointLayerProps {
  waypoints: TraceWaypoints
  /** The visible sheet band, for `clampArtBox` — the same `sheetBounds`
   *  every other art layer in `TraceCanvas.tsx` clamps against. */
  sheetBounds: ArtBox
}

export function WaypointLayer({ waypoints, sheetBounds }: WaypointLayerProps) {
  return (
    <g pointerEvents="none">
      {waypoints.art.map((obj, idx) => (
        <image
          key={`waypoint-art-${idx}`}
          href={obj.href}
          {...clampArtBox(placeArt(obj, obj.size, { x: obj.x, y: obj.y }), sheetBounds)}
          preserveAspectRatio="xMidYMid meet"
        />
      ))}
      {waypoints.rings?.map((ring, idx) => (
        <circle
          key={`waypoint-ring-${idx}`}
          cx={ring.x}
          cy={ring.y}
          r={ring.radius}
          fill="none"
          stroke={waypoints.ringStroke}
          strokeWidth={2}
        />
      ))}
    </g>
  )
}
