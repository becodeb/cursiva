// A place as DATA: a flat sheet and a few stacked paper layers, each casting the
// engine's offset shadow. Pure, like the rest of `puppet/`: `renderToString` gets
// the finished still scene and a test can read every colour a corridor might cross.
//
// No `url(#)`, mask, clipPath, pattern, filter or gradient (the reason is at the top
// of `canvas/TraceCanvas.tsx`): plain paths and transforms only.
import { ell, polyline, sampleAnchored, wobble, type Vec } from '../geometry'

/** Scenes are authored 2:1 with everything that matters inside the central 4:3,
 *  the same safe zone the round-2 pictures were commissioned with (`docs/20` §2.2). */
export const SCENE_W = 2000
export const SCENE_H = 1000

/** Deeper than a puppet's: a layer of a place lies further off the sheet. */
export const SCENE_SHADOW_TRANSFORM = 'translate(6 10)'
const CUT_STEP = 26
const CUT_WOBBLE = 1.8

/** How a layer may breathe. Only ever in intros, closings and on the map: the trace
 *  screen renders the same scene with `still` (`docs/01` §5). */
export type SceneMotion = 'sway' | 'drift' | 'rays' | 'bob'

export interface ScenePiece {
  readonly d: string
  readonly c: string
}

export interface SceneLayer {
  readonly pieces: readonly ScenePiece[]
  /** Glued flat on the layer below, no shadow of its own. */
  readonly flat?: boolean
  readonly motion?: SceneMotion
  /** What a sway turns about, in scene units. */
  readonly origin?: Vec
  /** So two reed beds do not sway in step. */
  readonly delay?: number
}

export interface SceneDef {
  readonly w: number
  readonly h: number
  /** The flat sheet: what fills the central working band. */
  readonly base: string
  readonly layers: readonly SceneLayer[]
  /** Scissors scale, for a scene authored on a smaller sheet. Absent is 1. */
  readonly grain?: number
}

export interface CutPiece {
  readonly d: string
  readonly c: string
  /** Vertical reach, scene units: which colours a corridor can actually land on. */
  readonly top: number
  readonly bottom: number
  readonly left: number
  readonly right: number
}

export interface CutLayer {
  readonly pieces: readonly CutPiece[]
  readonly flat: boolean
  readonly motion?: SceneMotion
  readonly origin?: Vec
  readonly delay?: number
}

export interface CutScene {
  readonly w: number
  readonly h: number
  readonly base: string
  readonly layers: readonly CutLayer[]
}

/** Scissors: every piece gets the same slightly unsteady edge, seeded by its place in
 *  the scene so the paper does not crawl between renders. */
export function cutScene(def: SceneDef, seed = 11): CutScene {
  let next = seed
  const grain = def.grain ?? 1
  return {
    w: def.w,
    h: def.h,
    base: def.base,
    layers: def.layers.map((layer) => ({
      pieces: layer.pieces.map((piece) => {
        // A lump is several round outlines: each one is cut on its own.
        const outlines = piece.d.split(/(?=M)/).filter(Boolean).map((sub) => sampleAnchored(sub, CUT_STEP * grain))
        const ys = outlines.flat().map((p) => p[1])
        const xs = outlines.flat().map((p) => p[0])
        return {
          d: outlines.map((points) => polyline(wobble(points, CUT_WOBBLE * grain, next++, true), true)).join(''),
          c: piece.c,
          top: Math.min(...ys),
          bottom: Math.max(...ys),
          left: Math.min(...xs),
          right: Math.max(...xs),
        }
      }),
      flat: layer.flat ?? false,
      motion: layer.motion,
      origin: layer.origin,
      delay: layer.delay,
    })),
  }
}

const num = (n: number): string => (Math.round(n * 10) / 10).toString()

/** A closed polygon from corner points. */
export const poly = (...points: readonly Vec[]): string =>
  `M${points.map((p) => `${num(p[0])} ${num(p[1])}`).join('L')}Z`

/** A band down to the bottom of the sheet (or from its top), its open edge a smooth
 *  run through `points`: ground, hills, water, a canopy. */
export function rise(points: readonly Vec[], down = true, edge: number = down ? 1300 : -300): string {
  const first = points[0]
  const last = points[points.length - 1]
  let d = `M${num(first[0])} ${edge}L${num(first[0])} ${num(first[1])}`
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]
    const b = points[i]
    const mid = (a[0] + b[0]) / 2
    d += `C${num(mid)} ${num(a[1])} ${num(mid)} ${num(b[1])} ${num(b[0])} ${num(b[1])}`
  }
  return `${d}L${num(last[0])} ${edge}Z`
}

/** A lump of round lobes, cut as one piece: cloud, crown of a tree, bush. */
export function lump(cx: number, cy: number, rx: number, ry: number, lobes = 5): string {
  let d = ell(cx, cy + ry * 0.2, rx, ry * 0.65)
  for (let i = 0; i < lobes; i++) {
    const u = lobes === 1 ? 0.5 : i / (lobes - 1)
    const r = ry * (0.5 + Math.sin(u * Math.PI) * 0.42)
    d += ell(cx - rx * 0.8 + rx * 1.6 * u, cy + ry * 0.22 - Math.sin(u * Math.PI) * ry * 0.5, r, r)
  }
  return d
}

/** A leaf or blade from a base point, leaning: reeds, grass, palm fronds, seaweed. */
export function blade(x: number, y: number, h: number, lean: number, w = h * 0.09): string {
  const tipX = x + lean
  const tipY = y - h
  return `M${num(x - w)} ${num(y)}C${num(x - w * 0.8 + lean * 0.2)} ${num(y - h * 0.6)} ${num(tipX - w * 0.6)} ${num(tipY + h * 0.2)} ${num(tipX)} ${num(tipY)}C${num(tipX + w * 0.2)} ${num(tipY + h * 0.26)} ${num(x + w + lean * 0.3)} ${num(y - h * 0.5)} ${num(x + w)} ${num(y)}Z`
}

/** A tuft of blades, the same grass in every scene that has any. */
export function tuft(x: number, y: number, h: number, c: string): ScenePiece[] {
  return [
    { d: blade(x - h * 0.26, y, h * 0.72, -h * 0.26), c },
    { d: blade(x, y, h, h * 0.04), c },
    { d: blade(x + h * 0.26, y, h * 0.66, h * 0.28), c },
  ]
}

/** A simple peak with a jagged snow cap: the range and the map's mountains. */
export function peak(cx: number, baseY: number, halfW: number, h: number, rock: string, snow: string, capShare = 0.28): ScenePiece[] {
  const top: Vec = [cx, baseY - h]
  const capY = baseY - h + h * capShare
  const capW = halfW * capShare
  return [
    { d: poly([cx - halfW, baseY], top, [cx + halfW, baseY]), c: rock },
    { d: poly(top, [cx + capW, capY], [cx + capW * 0.4, capY - h * 0.05], [cx, capY + h * 0.04], [cx - capW * 0.44, capY - h * 0.05], [cx - capW, capY]), c: snow },
  ]
}

/** Every colour painted where a corridor can land, shadows aside: the strip casts its
 *  own, and a shadow is a few units wide. `reach` is the row's own vertical range. */
export function coloursInReach(scene: CutScene, reach?: { top: number; bottom: number }): string[] {
  const out = new Set<string>([scene.base])
  for (const layer of scene.layers) {
    for (const piece of layer.pieces) {
      if (!reach || (piece.bottom >= reach.top && piece.top <= reach.bottom)) out.add(piece.c)
    }
  }
  return [...out]
}
