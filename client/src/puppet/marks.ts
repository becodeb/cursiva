// The clue marks in paper: a small set of flat shapes, repeated about 40 times along
// a trail (`docs/09` §5). Each is one path, so a level's whole trail costs its marks
// and nothing per frame. A mark is the trace left behind, never the animal that left
// it: the deduction must still have something to deduce (`docs/25` Tanda 2.1).
//
// Authored in a 100-unit box centred on the origin. A print points along +x, the way
// the trail's tangent turns it; anything else is free to tumble with the route.
import { CLUE_ART, type ClueKind } from '../detective/assets'
import { CLUE_DRAINED } from '../detective/palette'
import { ell, fmt, type Vec } from './geometry'

const MARK_BOX = 100

/** A mark is glued on whatever is under it, so it wears a thin paper edge: on the
 *  paper strip it vanishes, on the stone and the mud it is what keeps grey readable. */
export const MARK_EDGE_PAPER = '#fdfcf7'
export const MARK_EDGE_WIDTH = 11

export interface PaperMark {
  readonly d: string
  readonly fill: string
  /** A print of a walking thing: every other one is mirrored about its heading. */
  readonly alternates: boolean
  /** Height over width of the box it stands for: 1, it is drawn to fit its own. */
  readonly scale: number
}

const blob = (...points: readonly Vec[]): string => {
  const n = points.length
  let d = `M${fmt(points[0][0])} ${fmt(points[0][1])}`
  for (let i = 0; i < n; i++) {
    const a = points[(i - 1 + n) % n]
    const b = points[i]
    const c = points[(i + 1) % n]
    const e = points[(i + 2) % n]
    d += `C${fmt(b[0] + (c[0] - a[0]) / 6)} ${fmt(b[1] + (c[1] - a[1]) / 6)} ${fmt(c[0] - (e[0] - b[0]) / 6)} ${fmt(c[1] - (e[1] - b[1]) / 6)} ${fmt(c[0])} ${fmt(c[1])}`
  }
  return `${d}Z`
}

/** One toe or finger, from `(x, y)` out at `angle` degrees. */
const digit = (x: number, y: number, angle: number, length: number, width: number): string => {
  const a = (angle * Math.PI) / 180
  const ux = Math.cos(a)
  const uy = Math.sin(a)
  const nx = -uy * width
  const ny = ux * width
  const tipX = x + ux * length
  const tipY = y + uy * length
  return (
    `M${fmt(x + nx)} ${fmt(y + ny)}L${fmt(tipX + nx * 0.8)} ${fmt(tipY + ny * 0.8)}` +
    `Q${fmt(tipX + ux * width * 1.5)} ${fmt(tipY + uy * width * 1.5)} ${fmt(tipX - nx * 0.8)} ${fmt(tipY - ny * 0.8)}` +
    `L${fmt(x - nx)} ${fmt(y - ny)}Z`
  )
}

const hen = (spread: number): string =>
  digit(-10, 0, 0, 52, 8) + digit(-10, 0, spread, 44, 7) + digit(-10, 0, -spread, 44, 7) + digit(-10, 0, 180, 26, 6) + ell(-10, 0, 13, 13)

/** Webbed: a fan cut as one piece, with three toe tips past its edge. */
const web = (lean: number): string =>
  `M-34 ${fmt(lean)}L10 -40C22 -38 26 -30 22 -24L38 ${fmt(-4 + lean)}C46 ${fmt(lean)} 46 ${fmt(4 + lean)} 38 ${fmt(8 + lean)}L22 26C26 32 22 40 10 40Z`

/** A palm and five fingers, the thumb spread to the side. */
const hand = (spread: number): string => {
  const fingers = [-spread * 1.6, -spread * 0.55, spread * 0.55, spread * 1.6]
  return (
    blob([-20, -24], [10, -26], [22, 0], [10, 26], [-20, 24], [-28, 0]) +
    fingers.map((a, i) => digit(14, (i - 1.5) * 13, a, i === 0 || i === 3 ? 22 : 30, 5.6)).join('') +
    digit(-12, 22, 60 + spread, 26, 6.4)
  )
}

/** A small round pad with four tiny claws. */
const paw = (fan: number): string =>
  blob([-18, -16], [8, -18], [18, 0], [8, 18], [-18, 16], [-24, 0]) +
  [-1.5, -0.5, 0.5, 1.5].map((u) => ell(24 + (1.6 - Math.abs(u)) * 5, u * fan, 6.5, 6.5)).join('')

/** The turtle's flat flipper print: one long oval and a row of nicks. */
const flipper = (lean: number): string =>
  blob([-34, -12 + lean], [4, -22 + lean], [32, -12], [36, 6], [8, 22 - lean], [-30, 14 - lean]) + digit(36, -8, -24, 12, 4) + digit(38, 4, 0, 13, 4) + digit(34, 14, 24, 12, 4)

/** A puddle, its own droplet thrown off to one side. */
const puddle = (a: number, b: number): string =>
  blob([-38, 2], [-22, -22 + a], [6, -26], [34, -12 + b], [40, 12], [12, 26 - a], [-22, 24]) + ell(38 + a * 0.5, -30 + b, 8, 8)

const drop = (): string => `M0 -44C12 -24 30 -8 30 12C30 32 16 42 0 42C-16 42 -30 32 -30 12C-30 -8 -12 -24 0 -44Z`

const kernel = (x: number, y: number, r: number, turn: number): string => {
  const a = (turn * Math.PI) / 180
  const ux = Math.cos(a) * r
  const uy = Math.sin(a) * r
  const nx = -uy * 0.62
  const ny = ux * 0.62
  return `M${fmt(x - ux)} ${fmt(y - uy)}Q${fmt(x + nx)} ${fmt(y + ny)} ${fmt(x + ux)} ${fmt(y + uy)}Q${fmt(x - nx)} ${fmt(y - ny)} ${fmt(x - ux)} ${fmt(y - uy)}Z`
}

const seeds = (spots: readonly (readonly [number, number, number])[]): string => spots.map(([x, y, t]) => kernel(x, y, 17, t)).join('')

/** A feather: a long leaf, with the barb cuts taken out of one edge. */
const feather = (curl: number): string =>
  `M-6 44L-2 30C-24 20 -28 -8 ${fmt(4 + curl)} -44C24 -20 28 8 6 26L6 44Z`

/** A puff of cut wool. */
const wool = (a: number): string => {
  const lobes: readonly (readonly [number, number, number])[] = [[-22, -6, 21], [0, -22 + a, 23], [22, -8, 20], [14, 14, 19], [-12, 16, 19]]
  return lobes.map(([x, y, r]) => ell(x, y, r, r)).join('')
}

/** Three scales overlapping: each one an arch with a pointed foot. */
const scale = (x: number, y: number, r: number): string =>
  `M${fmt(x - r)} ${fmt(y - r * 0.2)}C${fmt(x - r)} ${fmt(y - r * 1.2)} ${fmt(x + r)} ${fmt(y - r * 1.2)} ${fmt(x + r)} ${fmt(y - r * 0.2)}C${fmt(x + r)} ${fmt(y + r * 0.6)} ${fmt(x + r * 0.3)} ${fmt(y + r)} ${fmt(x)} ${fmt(y + r * 1.2)}C${fmt(x - r * 0.3)} ${fmt(y + r)} ${fmt(x - r)} ${fmt(y + r * 0.6)} ${fmt(x - r)} ${fmt(y - r * 0.2)}Z`

const banana = (bend: number): string =>
  `M-34 -22C-30 ${fmt(12 + bend)} -2 ${fmt(30 + bend)} 32 20C36 18 38 14 36 10C14 ${fmt(14 + bend * 0.6)} -8 ${fmt(2 + bend * 0.5)} -22 -30C-26 -36 -36 -30 -34 -22Z`

/** A peel: the stalk at the middle and three flaps thrown open. */
const peel = (a: number): string =>
  `M-6 -40L6 -40L8 -16C26 -12 40 4 42 ${fmt(26 + a)}C28 ${fmt(14 + a)} 18 8 12 6C14 20 12 32 2 ${fmt(42 - a)}C-6 30 -10 20 -10 6C-18 10 -28 18 -42 ${fmt(30 - a)}C-40 8 -24 -10 -8 -16Z`

const weed = (a: number): string =>
  `M-8 44C-22 22 8 8 -8 -14C-16 -26 -6 -38 ${fmt(4 + a)} -46C4 -32 8 -22 12 -14C26 8 -4 24 8 44Z`

const bubble = (a: number): string => ell(-8 + a, 12, 25, 25) + ell(20 - a, -22, 14, 14) + ell(-22 - a, -28, 8, 8)

const crumb = (): string => blob([-30, -10], [-8, -28], [22, -22], [34, 6], [12, 28], [-20, 22]) + ell(34, -26, 7, 7) + ell(-34, 26, 6, 6)

/** The drawings of a kind, in the registry's order: variation `i` of the same trace,
 *  never the same stamp twice in a row. */
const DRAWINGS: Readonly<Record<ClueKind, readonly string[]>> = {
  droplet: [drop()],
  corn: [seeds([[-14, -14, 40], [16, -8, -30], [0, 18, 80]])],
  footprint: [hen(40)],
  feather: [feather(0)],
  webfoot: [web(0), web(-5), web(5)],
  breadcrumb: [crumb()],
  bubble: [bubble(0), bubble(5), bubble(-5)],
  puddle: [puddle(0, 0), puddle(5, -5), puddle(-5, 6)],
  seeds: [
    seeds([[-16, -12, 30], [16, -14, -40], [2, 16, 80]]),
    seeds([[-20, 6, -20], [8, -18, 50], [20, 14, 10]]),
    seeds([[-10, -18, 70], [20, -2, 20], [-12, 16, -40]]),
  ],
  duckFeather: [feather(0), feather(10), feather(-10)],
  scale: [scale(-18, 8, 18) + scale(18, 2, 18) + scale(0, -22, 16), scale(-16, -14, 16) + scale(18, -8, 19) + scale(-2, 20, 18)],
  handprint: [hand(16), hand(20), hand(13)],
  banana: [banana(0), banana(8), banana(-6)],
  hedgehogPrint: [paw(13), paw(15), paw(11)],
  bananaPeel: [peel(0), peel(6), peel(-6)],
  seaweed: [weed(0), weed(8), weed(-6)],
  wool: [wool(0), wool(6), wool(-5)],
  turtlePrint: [flipper(0), flipper(4), flipper(-4)],
}

const ALTERNATING: ReadonlySet<ClueKind> = new Set<ClueKind>(['footprint', 'webfoot', 'handprint', 'hedgehogPrint', 'turtlePrint'])

const MARKS: ReadonlyMap<string, PaperMark> = (() => {
  const out = new Map<string, PaperMark>()
  for (const kind of Object.keys(CLUE_ART) as ClueKind[]) {
    const art = CLUE_ART[kind]
    const drawings = DRAWINGS[kind]
    const pairs = [art.art, ...(art.variations ?? [])]
    pairs.forEach((pair, i) => {
      const d = drawings[i % drawings.length]
      const alternates = ALTERNATING.has(kind)
      const scale = 1 / MARK_BOX
      out.set(pair.earned.href, { d, fill: art.earned, alternates, scale })
      out.set(pair.drained.href, { d, fill: CLUE_DRAINED, alternates, scale })
    })
  }
  return out
})()

/** The paper mark for a registry clue picture, if it has one. */
export function paperMarkFor(art: { readonly href: string }): PaperMark | undefined {
  return MARKS.get(art.href)
}

/** The transform that lays a mark on the sheet: `index` decides its side when it is a
 *  print, so the pair of feet reads as walking. `size` is its height on the sheet. */
export function markTransform(mark: PaperMark, x: number, y: number, angle: number, size: number, index: number): string {
  const k = size * mark.scale
  const mirror = mark.alternates && index % 2 === 1 ? -1 : 1
  return `translate(${fmt(x)} ${fmt(y)})rotate(${fmt(angle)})scale(${k.toFixed(3)} ${(k * mirror).toFixed(3)})`
}
