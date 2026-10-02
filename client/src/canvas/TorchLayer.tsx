// The torch over a routed level (T44, `docs/21` N2 `night-rastro`): the
// night's round flashlight, carried onto a level that HAS a route. Two plain
// layers the surface draws around the clue marks, so the marks are only seen
// where the light falls:
//
//  - `TorchPool`, UNDER the marks: the warm pool of light a real torch throws
//    on the ground. The night backdrop is dark blue and the hedgehog's prints
//    are black, so without a lit ground under them a print would be black on
//    near-black even inside the light. Concentric plain circles, brightest at
//    the centre — no gradient, which would need `<defs>`/`url(#…)`.
//  - `TorchVeil`, OVER the marks: the darkness itself, the exact band ladder
//    the night levels already draw (`RevealLayer.tsx`'s `nightVeilLayers`,
//    a real polygon union of every light, plain `<path>`s), so a print fades
//    in at the edge of the light the same way a hidden object does there.
//
// Same ban as `RevealLayer.tsx`: no `<mask>`, `<clipPath>`, `<defs>`, `useId`
// or `url(#…)`.
import { nightVeilLayers } from './RevealLayer'
import type { ArtBox } from './placeArt'

/** One light on the ground: the finger's torch, or the small glow that keeps
 *  the start and the goal findable in the dark. */
export interface TorchSource {
  cx: number
  cy: number
  radius: number
}

export interface TraceTorch {
  /** Every light this frame. The finger's torch is absent while it is up. */
  sources: readonly TorchSource[]
  /** The darkness's paint — the night backdrop's own `tile`. */
  fill: string
}

/** The pool's colour: the warm torchlight the night already uses for a
 *  found object's glow (`RevealLayer.tsx`'s `NIGHT_SUCCESS_WASH`). */
export const TORCH_POOL = '#ffe88a'

/** Pool rings, outer to inner, as fractions of a light's radius, and the
 *  opacity each ring adds. Four rings of 0.24 stack to ≈0.67 at the centre:
 *  bright enough that a black print reads on it, dim enough that the
 *  backdrop still shows through, so it reads as light on the ground, not a
 *  yellow disc. */
export const TORCH_POOL_RINGS: readonly number[] = [0.95, 0.75, 0.55, 0.35]
export const TORCH_POOL_RING_OPACITY = 0.24

export function TorchPool({ torch }: { torch: TraceTorch }) {
  return (
    <g pointerEvents="none" data-torch-pool="true">
      {torch.sources.flatMap((s, i) =>
        TORCH_POOL_RINGS.map((ratio, k) => (
          <circle
            key={`${i}-${k}`}
            cx={s.cx}
            cy={s.cy}
            r={s.radius * ratio}
            fill={TORCH_POOL}
            opacity={TORCH_POOL_RING_OPACITY}
          />
        )),
      )}
    </g>
  )
}

export function TorchVeil({ torch, displayBounds }: { torch: TraceTorch; displayBounds: ArtBox }) {
  const sources = torch.sources.filter((s) => s.radius > 0)
  return (
    <g pointerEvents="none" data-torch-veil="true">
      {nightVeilLayers(sources, displayBounds).map((layer, i) => (
        <path key={i} d={layer.d} fill={torch.fill} fillRule="evenodd" opacity={layer.opacity} />
      ))}
    </g>
  )
}
