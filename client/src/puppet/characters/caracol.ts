// The snail: a spiral on a long foot, two eyes on stalks. Its own trick is to
// retract: with a fright or with sleep the head slides back behind the shell.
import { ell, lerp, polyline, rad, spine, tubePath, type Vec } from '../geometry'
import { PAPER_INK, type DynamicPath, type RigBuilder, type RigUpdate } from '../rig'
import type { Pose } from '../actor'
import { browPath, mouthPath } from './face'
import { blob, widthProfile } from './shapes'

export const CARACOL_PALETTE = {
  ink: PAPER_INK,
  foot: '#b5c88a',
  footD: '#90a766',
  shell: '#a07f62',
  shellL: '#bb9b7d',
  shellD: '#755840',
  pink: '#f4a18f',
} as const

const tuckOf = (pose: Pose): number => Math.max(pose.a.scare, pose.a.sleep * 0.9)

function neckSpine(pose: Pose): Vec[] {
  const tuck = tuckOf(pose)
  const { sad, wave, cheer } = pose.a
  return spine({
    x: 300,
    y: 284,
    a: rad(-18 + sad * 14 + Math.sin(pose.t * 2.6) * 2 + Math.sin(pose.t * 6) * 4 * wave + Math.sin(pose.t * 7.5) * 6 * cheer),
    L: lerp(150, 8, tuck) * (1 + cheer * 0.06),
    n: 14,
    bend: rad(-60 + sad * 34),
  })
}

const neckWidth = widthProfile([[0, 12], [0.22, 38], [1, 33]])
const neck: DynamicPath = (pose) => tubePath(neckSpine(pose), neckWidth)

/** The shell's line, wound from the middle out. */
function spiral(cx: number, cy: number, turns: number, r1: number): string {
  const pts: Vec[] = []
  const n = 60
  for (let i = 0; i <= n; i++) {
    const u = i / n
    const a = rad(150) + u * turns * Math.PI * 2
    const r = 8 + (r1 - 8) * u
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.98])
  }
  return polyline(pts, false)
}

export function drawCaracol(p: RigBuilder): RigUpdate {
  p.cluster([{ d: blob([4, 316], [40, 286], [140, 276], [260, 272], [340, 270], [392, 288], [410, 306], [376, 318], [260, 320], [120, 320]), c: 'foot', part: 'sole' }])
  p.flat(blob([30, 314], [160, 304], [300, 304], [382, 306], [340, 318], [120, 320]), 'footD', { part: 'sole' })
  p.cluster([{ d: neck, c: 'foot' }])
  // Stalks and eyes ride the head, drawn around its own origin. The head goes before
  // the shell, so the shell can swallow it.
  p.line('M-10 -28C-10 -56 -18 -80 -28 -96', { part: 'skull/stalkFar', w: 12, c: 'footD' })
  p.flat(ell(-30, -112, 23, 25), 'footD', { part: 'skull/stalkFar' })
  p.eye('eyeFar', -30, -112, 18, { part: 'skull/stalkFar', ry: 20 })
  p.line('M24 -30C26 -58 30 -82 42 -98', { part: 'skull/stalk', w: 12, c: 'foot' })
  p.flat(ell(44, -114, 25, 27), 'foot', { part: 'skull/stalk' })
  p.eye('eye', 44, -114, 20, { part: 'skull/stalk', ry: 22 })
  p.cluster([{ d: blob([-34, -26], [18, -44], [56, -22], [66, 12], [40, 38], [-14, 40], [-40, 20]), c: 'foot', part: 'skull' }])
  p.flat(ell(-4, 18, 12, 8), 'pink', { part: 'skull' })
  p.line(browPath(0, -18, 44, -24), { part: 'skull/brow', w: 6 })
  p.mouth(mouthPath(34, 14, 16), { part: 'skull', w: 6 })

  p.cluster([{ d: ell(164, 156, 150, 146), c: 'shell', part: 'house' }])
  p.flat(blob([46, 92], [86, 42], [142, 22], [96, 66], [62, 116]), 'shellL', { part: 'house' })
  p.line(spiral(164, 164, 2.2, 118), { part: 'house', w: 14, c: 'shellD' })

  return (pose, set) => {
    const { wave, cheer, scare, sad, sleep } = pose.a
    const tuck = tuckOf(pose)
    const tip = neckSpine(pose)[14]
    const k = lerp(1, 0.55, tuck)
    set('skull', { x: tip[0], y: tip[1], sx: k, sy: k, r: pose.look[0] * 3 + sad * 16 + Math.sin(pose.t * 7.5) * 4 * cheer })
    const sway = Math.sin(pose.t * 3) * 4 + Math.sin(pose.t * 11) * 10 * Math.max(cheer, wave)
    const droop = sad * 40 + sleep * 36 - scare * 8
    const stalkLen = lerp(1, 0.28, tuck)
    set('stalk', { ox: 24, oy: -28, r: sway + droop, sy: stalkLen })
    set('stalkFar', { ox: -10, oy: -28, r: sway * 0.7 - droop * 0.5, sy: stalkLen })
    set('brow', { y: -scare * 3 })
    const creep = Math.sin(pose.t * 5) * wave
    set('sole', { ox: 180, oy: 320, sx: 1 + creep * 0.03 - tuck * 0.14 })
    set('house', { ox: 160, oy: 300, r: creep * 2 + sad * 2 + Math.sin(pose.t * 7.5) * 3 * cheer, y: tuck * 8 + creep * 2 })
  }
}
