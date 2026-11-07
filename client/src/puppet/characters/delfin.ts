// The dolphin: one spine from the tail stock to the beak, with a width profile that
// carves melon, beak and tail. Its own trick is the wave that runs down that spine.
import { ell, fmt, tangentAt, tubePath, type Vec } from '../geometry'
import { PAPER_INK, type DynamicPath, type RigBuilder, type RigUpdate } from '../rig'
import type { Pose } from '../actor'
import { browPath } from './face'
import { beside, sideBand, widthProfile } from './shapes'

export const DELFIN_PALETTE = {
  ink: PAPER_INK,
  body: '#7fa6c9',
  shade: '#5780a6',
  belly: '#f2f5ea',
  pink: '#f6a690',
} as const

const N = 60
/** From the tail: slim, full through the middle, the melon, a pinch, the beak. */
const widthAt = widthProfile([[0, 4], [0.14, 20], [0.4, 62], [0.6, 80], [0.74, 78], [0.86, 60], [0.95, 30], [1, 22]])

/** The body's arc, tail low at the left and beak high at the right. */
function bodySpine(pose: Pose): Vec[] {
  const { wave, cheer, scare, sad, sleep } = pose.a
  const nod = sad * 70 + sleep * 54 - scare * 26 + cheer * -6
  const curve = 1 + scare * 0.12 - sad * 0.08
  const P0: Vec = [58, 394 - sad * 10]
  const P1: Vec = [36, 200 * curve]
  const P2: Vec = [190, 14 + nod * 0.1]
  const P3: Vec = [418, 148 + nod]
  const swim = 7 + wave * 22 + cheer * 16
  const run = pose.t * (2 + wave * 7 + cheer * 7)
  const pts: Vec[] = []
  for (let i = 0; i <= N; i++) {
    const s = i / N
    const u = 1 - s
    const x = u * u * u * P0[0] + 3 * u * u * s * P1[0] + 3 * u * s * s * P2[0] + s * s * s * P3[0]
    const y = u * u * u * P0[1] + 3 * u * u * s * P1[1] + 3 * u * s * s * P2[1] + s * s * s * P3[1]
    pts.push([x, y])
  }
  // The wave grows towards the tail: the head leads and the flukes follow.
  return pts.map((p, i) => {
    const s = i / N
    const th = tangentAt(pts, i)
    const k = Math.sin(s * 7 - run) * swim * (1 - s) * (1 - s)
    return [p[0] + Math.sin(th) * k, p[1] - Math.cos(th) * k]
  })
}

const body: DynamicPath = (pose) => tubePath(bodySpine(pose), widthAt)

const belly: DynamicPath = (pose) => {
  const pts = bodySpine(pose)
  return sideBand(
    pts,
    Math.round(N * 0.24),
    Math.round(N * 0.93),
    (s) => -widthAt(s) * 0.98,
    (s) => {
      const u = (s - 0.24) / 0.69
      return -widthAt(s) * (1 - 0.82 * Math.sin(Math.PI * Math.min(1, u * 1.1)))
    },
  )
}

function placed(pose: Pose, s: number, off: number, extra = 0): { x: number; y: number; r: number } {
  const pts = bodySpine(pose)
  const i = Math.round(s * N)
  const [x, y] = beside(pts, i, widthAt(s) * off)
  return { x, y, r: (tangentAt(pts, i) * 180) / Math.PI + extra }
}

export function drawDelfin(p: RigBuilder): RigUpdate {
  // Fins are drawn with +x along the body, towards the head, and -y towards the back.
  p.cluster([
    { d: 'M14 0C-4 -18 -30 -68 -74 -86C-92 -58 -62 8 -8 12Z', c: 'shade', part: 'flukes' },
    { d: 'M14 0C-4 18 -30 68 -74 86C-92 58 -62 -8 -8 -12Z', c: 'shade', part: 'flukes' },
  ])
  p.cluster([{ d: 'M44 12C30 -22 2 -54 -42 -64C-30 -34 -36 -8 -36 14Z', c: 'shade', part: 'dorsal' }])
  p.cluster([{ d: 'M26 -8C30 14 22 48 -8 74C-18 52 -24 16 -18 -8Z', c: 'shade', part: 'pectoralFar' }])
  p.cluster([{ d: body, c: 'body' }])
  p.flat(belly, 'belly')
  p.cluster([{ d: 'M30 -10C36 16 18 52 -28 76C-30 46 -32 14 -20 -10Z', c: 'shade', part: 'pectoral' }])

  p.flat(ell(30, 22, 14, 9), 'pink', { part: 'face' })
  p.eye('eye', 0, -6, 21, { part: 'face', ry: 23 })
  p.line(browPath(-26, -32, 22, -40), { part: 'face/brow', w: 7 })
  p.line(
    (pose) => {
      const smile = 1 + pose.a.cheer * 0.5 - pose.a.sad * 1.7 - pose.a.scare
      const open = pose.open * 6
      return `M16 ${fmt(34 + open)}Q42 ${fmt(38 + smile * 14 + open)} 70 ${fmt(30 + open * 0.4)}`
    },
    { part: 'face', w: 7 },
  )

  return (pose, set) => {
    const { wave, cheer, scare, sad, sleep } = pose.a
    const pts = bodySpine(pose)
    const beat = Math.sin(pose.t * (2 + wave * 9 + cheer * 9))
    set('flukes', { x: pts[0][0], y: pts[0][1], r: (tangentAt(pts, 0) * 180) / Math.PI + beat * (6 + wave * 18 + cheer * 16) })
    set('dorsal', placed(pose, 0.52, 0.86))
    const flap = Math.sin(pose.t * (2.4 + cheer * 14 + wave * 10)) * (4 + cheer * 22 + wave * 14) + sad * 22 + sleep * 14 - scare * 18
    set('pectoral', { ...placed(pose, 0.66, -0.7, flap) })
    set('pectoralFar', { ...placed(pose, 0.74, -0.86, flap * 0.7) })
    set('face', { ...placed(pose, 0.8, 0.2) })
    set('brow', { y: -scare * 3 })
  }
}
