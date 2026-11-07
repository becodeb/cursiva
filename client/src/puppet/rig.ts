// A puppet as DATA: a tree of paper pieces plus a function that says, for one
// pose, where each part goes and what each moving outline is. `Puppet.tsx`
// renders the tree once and from then on only writes attributes.
//
// Paper treatment, the only one that ships: stacked pieces, each with an offset
// shadow, no outlines, edges cut as polylines that keep the authored corners. No
// `url(#)`, mask, clipPath, pattern, filter or gradient anywhere (the reason is
// at the top of `canvas/TraceCanvas.tsx`): plain paths and transforms only.
import { clamp, ell, fmt, polyline, sampleAnchored, wobble, type Vec } from './geometry'
import { isBlinking, poseOf, type Actor, type Pose } from './actor'

/** The cut-paper shadow: every piece casts it, always the same way. */
export const PAPER_SHADOW_OFFSET = { x: 3, y: 6 } as const
export const PAPER_SHADOW_TRANSFORM = `translate(${PAPER_SHADOW_OFFSET.x} ${PAPER_SHADOW_OFFSET.y})`
export const PAPER_SHADOW_FILL = 'rgba(16,28,24,.3)'
export const PAPER_INK = '#1a2226'
/** A card of the interface is cut from the same sheet: a slightly darker cut edge and
 *  the same offset shadow, never a black outline. The edge keeps the width a border
 *  always had, so no measured layout moves. */
export const PAPER_EDGE = '#decca6'
export const PAPER_LIP = '#bfa877'
export const PAPER_CARD_SHADOW = '3px 5px 0 rgba(16,28,24,.3)'
const WOBBLE_AMP = 0.55
const LINE_WIDTH_SCALE = 0.85

export type DynamicPath = (pose: Pose) => string
export type PaintStyle = Readonly<Record<string, string | number>>

export interface PaperPath {
  readonly kind: 'path'
  /** The fixed outline, or `null` when `dyn` draws it every frame. */
  readonly d: string | null
  /** Index into `Rig.dynamics` for an outline that changes with the pose. */
  readonly dyn: number | null
  readonly style: PaintStyle
  readonly shadow: boolean
  /** Half the stroke width, so bounds can count a line's real thickness. */
  readonly halfStroke: number
}

export interface PaperGroup {
  readonly kind: 'group'
  readonly part: string
  readonly children: PaperNode[]
}

export type PaperNode = PaperPath | PaperGroup

export interface PartTransform {
  x?: number
  y?: number
  r?: number
  sx?: number
  sy?: number
  ox?: number
  oy?: number
}

export type SetPart = (part: string, transform: PartTransform) => void
export type RigUpdate = (pose: Pose, set: SetPart) => void

export interface RigEye {
  readonly lid: string
  readonly pupil: string
  readonly cx: number
  readonly cy: number
  readonly r: number
}

/** How the whole figure moves on the page. A long snake must not swing about the
 *  Pulpito's feet: the defaults are the ones the Pulpito and the duck were approved with. */
export interface RootMotion {
  readonly pivot?: readonly [number, number]
  readonly hop?: number
  readonly tilt?: number
  readonly shake?: number
  readonly squash?: number
}

export interface Rig {
  readonly nodes: readonly PaperNode[]
  readonly dynamics: readonly DynamicPath[]
  readonly eyes: readonly RigEye[]
  readonly palette: Readonly<Record<string, string>>
  readonly update: RigUpdate
  readonly motion?: RootMotion
}

export interface ClusterShape {
  readonly d: string | DynamicPath
  readonly c: string
  readonly part?: string
}

interface ShapeOptions {
  part?: string
  closed?: boolean
  style: PaintStyle
  shadow?: boolean
  step?: number
  halfStroke?: number
}

/** A colour is a palette key, painted through a CSS variable so a caller can
 *  recolour one puppet with `style`, or a literal. */
function paint(colour: string): string {
  return colour.startsWith('#') || colour.startsWith('rgb') ? colour : `var(--${colour})`
}

/** The drawing API a character is written against. Draw order is call order. */
export class RigBuilder {
  readonly nodes: PaperNode[] = []
  readonly dynamics: DynamicPath[] = []
  readonly eyes: RigEye[] = []
  private readonly dynamicIndex = new Map<DynamicPath, number>()
  private seed: number

  constructor(seed: number) {
    this.seed = seed
  }

  private mount(node: PaperPath, part: string | undefined): void {
    let level = this.nodes
    for (const piece of part ? part.split('/') : []) {
      // Consecutive pieces of a part share one <g>: same paint order, fewer nodes.
      const last = level[level.length - 1]
      if (last?.kind === 'group' && last.part === piece) {
        level = last.children
      } else {
        const group: PaperGroup = { kind: 'group', part: piece, children: [] }
        level.push(group)
        level = group.children
      }
    }
    level.push(node)
  }

  private shape(d: string | DynamicPath, { part, closed = true, style, shadow = false, step = 9, halfStroke = 0 }: ShapeOptions): void {
    if (typeof d === 'function') {
      let dyn = this.dynamicIndex.get(d)
      if (dyn === undefined) {
        dyn = this.dynamics.length
        this.dynamics.push(d)
        this.dynamicIndex.set(d, dyn)
      }
      this.mount({ kind: 'path', d: null, dyn, style, shadow, halfStroke }, part)
      return
    }
    const cut = polyline(wobble(sampleAnchored(d, step), WOBBLE_AMP, this.seed++, closed), closed)
    this.mount({ kind: 'path', d: cut, dyn: null, style, shadow, halfStroke }, part)
  }

  /** Pieces lifted off the sheet: every shadow first, then every piece. */
  cluster(shapes: readonly ClusterShape[]): void {
    for (const s of shapes) this.shape(s.d, { part: s.part, style: { fill: PAPER_SHADOW_FILL }, shadow: true })
    for (const s of shapes) this.shape(s.d, { part: s.part, style: { fill: paint(s.c) } })
  }

  /** A piece glued flat on the one below: no shadow of its own. */
  flat(d: string | DynamicPath, c: string, { part, step = 9 }: { part?: string; step?: number } = {}): void {
    this.shape(d, { part, step, style: { fill: paint(c) } })
  }

  line(d: string | DynamicPath, { part, w = 8, c = 'ink' }: { part?: string; w?: number; c?: string } = {}): void {
    const width = w * LINE_WIDTH_SCALE
    this.shape(d, {
      part,
      closed: false,
      step: 8,
      halfStroke: width / 2,
      style: { fill: 'none', stroke: paint(c), strokeWidth: width, strokeLinecap: 'round', strokeLinejoin: 'round' },
    })
  }

  /** A shape that changes every frame, such as a mouth: fill and stroke share a colour. */
  mouth(fn: DynamicPath, { part, c = 'ink', w = 8 }: { part?: string; c?: string; w?: number } = {}): void {
    const width = w * LINE_WIDTH_SCALE
    this.shape(fn, {
      part,
      halfStroke: width / 2,
      style: { fill: paint(c), stroke: paint(c), strokeWidth: width, strokeLinecap: 'round', strokeLinejoin: 'round' },
    })
  }

  eye(name: string, cx: number, cy: number, r: number, { part, ry = r }: { part?: string; ry?: number } = {}): void {
    const lid = part ? `${part}/${name}` : name
    const pupil = `${lid}/${name}P`
    this.flat(ell(cx, cy, r, ry), '#ffffff', { part: lid, step: 5 })
    this.flat(ell(cx, cy, r * 0.74, ry * 0.76), 'ink', { part: pupil, step: 4 })
    this.flat(ell(cx + r * 0.24, cy - ry * 0.3, r * 0.24), '#ffffff', { part: pupil, step: 3 })
    this.eyes.push({ lid: name, pupil: `${name}P`, cx, cy, r })
  }
}

export function partTransform({ x = 0, y = 0, r = 0, sx = 1, sy = 1, ox = 0, oy = 0 }: PartTransform): string {
  return `translate(${fmt(x + ox)} ${fmt(y + oy)})rotate(${fmt(r)})scale(${sx.toFixed(3)} ${sy.toFixed(3)})translate(${fmt(-ox)} ${fmt(-oy)})`
}

/** Everything one frame writes: pure, so `renderToString` and the ticker share it. */
export interface PuppetFrame {
  readonly root: PartTransform
  readonly parts: ReadonlyMap<string, PartTransform>
  readonly dyn: readonly string[]
}

export function computeFrame(rig: Rig, actor: Actor, calm: boolean): PuppetFrame {
  const pose = poseOf(actor, calm)
  const a = pose.a
  const parts = new Map<string, PartTransform>()
  const set: SetPart = (part, transform) => parts.set(part, transform)

  const blink = !calm && isBlinking(actor) ? 1 : 0
  const lid = clamp(1 - blink - a.sleep * 0.92 - a.sad * 0.25, 0.08, 1) * (1 + a.scare * 0.18)
  const wide = 1 + a.scare * 0.14
  for (const e of rig.eyes) {
    set(e.lid, { ox: e.cx, oy: e.cy, sx: wide, sy: lid })
    const reach = e.r * 0.34 * (1 - a.scare * 0.3)
    const pupil = 1 - a.scare * 0.3
    set(e.pupil, { x: pose.look[0] * reach, y: pose.look[1] * reach + a.sad * e.r * 0.15, ox: e.cx, oy: e.cy, sx: pupil, sy: pupil })
  }
  rig.update(pose, set)

  const { pivot = [200, 380], hop = 1, tilt = 1, shake = 1, squash = 1 } = rig.motion ?? {}
  const stretch = 1 + (0.018 * pose.breath + (pose.hop - 0.5) * 0.09 * a.cheer + a.scare * 0.05 - a.sad * 0.05 - a.sleep * 0.05) * squash
  const root: PartTransform = {
    ox: pivot[0],
    oy: pivot[1],
    x: Math.sin(pose.t * 46) * 2.6 * a.scare * shake,
    y: -pose.hop * 34 * a.cheer * hop + a.sad * 4,
    r: (Math.sin(pose.t * 7.5) * 4 * a.cheer + a.sleep * 3) * tilt,
    sx: 1 / stretch,
    sy: stretch,
  }
  return { root, parts, dyn: rig.dynamics.map((fn) => fn(pose)) }
}

/** Where a puppet stands, set from outside: an offset from its box in the parent's
 *  units, the way it faces, and a lean. The closing finale walks an animal along a
 *  path with this and a held `wave`. */
export interface PuppetPlacement {
  readonly x?: number
  readonly y?: number
  readonly facing?: 1 | -1
  readonly tilt?: number
}

/** An SVG transform for `placement`, turning and flipping about `pivot`: the middle
 *  of the feet, so a flip leaves the animal on the spot. */
export function placementTransform({ x = 0, y = 0, facing = 1, tilt = 0 }: PuppetPlacement, pivot: { x: number; y: number }): string {
  return `translate(${fmt(x + pivot.x)} ${fmt(y + pivot.y)})rotate(${fmt(tilt)})scale(${facing} 1)translate(${fmt(-pivot.x)} ${fmt(-pivot.y)})`
}

/** The same for a standalone `<svg>`, whose `transform-origin` is its bottom middle. */
export function placementCss({ x = 0, y = 0, facing = 1, tilt = 0 }: PuppetPlacement): string {
  return `translate(${fmt(x)}px,${fmt(y)}px) rotate(${fmt(tilt)}deg) scaleX(${facing})`
}

export interface Bounds {
  readonly minX: number
  readonly minY: number
  readonly maxX: number
  readonly maxY: number
}

function applyTransform(p: Vec, { x = 0, y = 0, r = 0, sx = 1, sy = 1, ox = 0, oy = 0 }: PartTransform): Vec {
  const px = (p[0] - ox) * sx
  const py = (p[1] - oy) * sy
  const th = (r * Math.PI) / 180
  return [px * Math.cos(th) - py * Math.sin(th) + x + ox, px * Math.sin(th) + py * Math.cos(th) + y + oy]
}

/** One outline of a frame, in figure units. */
export interface FrameOutline {
  readonly points: readonly Vec[]
  readonly node: PaperPath
}

/** Every outline a frame paints, with each part's transforms applied. */
export function frameOutlines(rig: Rig, frame: PuppetFrame, step = 6): FrameOutline[] {
  const out: FrameOutline[] = []
  const walk = (nodes: readonly PaperNode[], chain: readonly PartTransform[]): void => {
    for (const node of nodes) {
      if (node.kind === 'group') {
        walk(node.children, [frame.parts.get(node.part) ?? {}, ...chain])
        continue
      }
      const d = node.dyn !== null ? frame.dyn[node.dyn] : node.d
      if (!d) continue
      const points = sampleAnchored(d, step).map((raw): Vec => {
        const start: Vec = node.shadow ? [raw[0] + PAPER_SHADOW_OFFSET.x, raw[1] + PAPER_SHADOW_OFFSET.y] : raw
        return applyTransform(chain.reduce<Vec>((p, xf) => applyTransform(p, xf), start), frame.root)
      })
      out.push({ points, node })
    }
  }
  walk(rig.nodes, [])
  return out
}

/** The box a frame really paints, shadows and stroke thickness included. */
export function frameBounds(rig: Rig, frame: PuppetFrame): Bounds {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const { points, node } of frameOutlines(rig, frame)) {
    for (const [x, y] of points) {
      minX = Math.min(minX, x - node.halfStroke)
      minY = Math.min(minY, y - node.halfStroke)
      maxX = Math.max(maxX, x + node.halfStroke)
      maxY = Math.max(maxY, y + node.halfStroke)
    }
  }
  return { minX, minY, maxX, maxY }
}

export interface ViewBox {
  readonly x: number
  readonly y: number
  readonly w: number
  readonly h: number
}

/**
 * The window onto a puppet that matches a picture box of `aspect` (width over
 * height): the figure's feet on the bottom edge, its `centreX` on the middle, and
 * the shorter side padded. So a puppet can stand in a PNG's exact box and every
 * placement measured against that box (grip, bubble, hit area) keeps working.
 */
export function figureView(bounds: Bounds, centreX: number | null, aspect: number | null): ViewBox {
  const cx = centreX ?? (bounds.minX + bounds.maxX) / 2
  let w = 2 * Math.max(cx - bounds.minX, bounds.maxX - cx)
  let h = bounds.maxY - bounds.minY
  if (aspect !== null) {
    if (w / h < aspect) w = h * aspect
    else h = w / aspect
  }
  return { x: cx - w / 2, y: bounds.maxY - h, w, h }
}
