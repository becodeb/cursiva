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
// T3 (2026-09-25 tablet playtest, "isn't intuitive"/"pop" feedback): the
// next-to-draw anchor and a freshly-filled anchor get a `className` only —
// never a new inline `fill`/`stroke`/`r` attribute, so every byte this file
// used to emit (and every test that parses those exact bytes) is unchanged;
// the visual difference lives entirely in `LAYOUT_CSS` (LevelPlay.tsx). No
// new colour either (`TraceCanvas.tsx`'s own rule in this mode: colour
// means a clue was EARNED) — the "next" hint pulses the SAME dim stroke via
// `opacity`, and the "filled" pop scales via CSS `transform` with
// `transform-box: fill-box` set (an SVG `<circle>` has no bounding-box
// origin at its own centre by default; without that property the scale
// visibly jumps toward the sheet's (0,0) for the animation's duration).
//
// The body `<image>` passes through `clampArtBox` like every other art
// layer — `spines.body` is ALREADY the exact box `levels/spines.ts`'s
// `spineBody` computed, so the layer never recomputes placement
// independently of the scorer.
//
// The mark and ring colours are resolved by the CALLER, never here —
// `WaypointLayer`'s own convention, restated (`TraceClueMark`'s original).
//
// T13 (tablet playtest #2, "a line that isn't a spine could disappear when I
// lift"): `spines.fading` renders a just-rejected stroke as fading ink, run
// through the SAME `inkPath(traceInk(...))` pipeline `canvas/TraceCanvas.tsx`'s
// own settled-ink layer uses (`canvas/ink.ts`, imported here rather than
// re-derived, so the two can never draw a stroke's centreline two different
// ways) — never `completedStrokes`, which has one shared opacity for every
// entry and no per-entry fade. The actual fade is a plain CSS animation
// (`.cv-spine-fading`, `screen/LevelPlay.tsx`'s `LAYOUT_CSS`), so this layer
// only has to render the shape and stop rendering it once the caller drops
// the entry — no timer, no transition-flip state, lives here.
//
// T19 (`odd/tasks/prewriting-stage-completion.md` §3.3, "el trazo se
// convierte en espina"): `spines.spikes` renders every ACCEPTED anchor's own
// clean triangle (`levels/spines.ts`'s `spineSpikePaths` — an `M`/`L` path,
// never a second re-derivation of the shape). `screen/LevelPlay.tsx` stops
// feeding an accepted spine's raw ink into `TraceCanvas`'s own
// `completedStrokes` the instant its anchor fills, so the swap from wobbly
// child ink to a tidy spike happens by simply no longer drawing the old
// shape and starting to draw the new one — no morph animation, no new art,
// just a `.cv-spine-spike` pop-in (`LAYOUT_CSS`) on the fresh shape.
import { clampArtBox, type ArtBox } from './placeArt'
import { inkPath, traceInk } from './ink'
import type { TraceSpines } from './TraceCanvas'

/** The stroke width a fading rejected spine renders at — `TraceCanvas.tsx`'s
 *  own `INK_WIDTH` (not exported: this is the one other place that ever
 *  needs to draw a raw stroke's centreline, restated rather than plumbed
 *  through a new export for one number). */
const FADING_STROKE_WIDTH = 18

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
      {spines.spikes?.map((d, idx) => (
        <path
          key={`spine-spike-${idx}`}
          data-spine-spike="true"
          d={d}
          fill={spines.spikeFill ?? spines.earned}
          stroke={spines.spikeStroke ?? spines.earned}
          strokeWidth={3}
          strokeLinejoin="round"
          className="cv-spine-spike"
        />
      ))}
      {spines.fading?.map((f) => (
        <path
          key={`spine-fading-${f.id}`}
          data-spine-fading="true"
          d={inkPath(traceInk(f.points))}
          fill="none"
          stroke={spines.fadingColor ?? spines.dim}
          strokeWidth={FADING_STROKE_WIDTH}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="cv-spine-fading"
        />
      ))}
      {spines.marks.map((mark, idx) => (
        <circle
          key={`spine-mark-${idx}`}
          cx={mark.x}
          cy={mark.y}
          r={spines.markRadius}
          fill={mark.filled ? spines.earned : spines.dim}
          className={mark.filled ? 'cv-spine-mark-filled' : mark.next ? 'cv-spine-mark-next' : undefined}
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
