// The snake: one spine, and `length` (0, 1, 2) sets how many waves it holds, thinner
// as it gets longer, so all three fill the same wide box. Its own trick is to slither:
// the wave runs down the body, quick when it greets and tight when it is scared.
import { ell, fmt, lerp, tubePath, type Vec } from '../geometry'
import { PAPER_INK, type DynamicPath, type RigBuilder, type RigUpdate } from '../rig'
import type { Pose } from '../actor'
import { mouthPath } from './face'
import { beside, blob, sideBand, widthProfile } from './shapes'

export const VIBORA_PALETTE = {
  ink: PAPER_INK,
  body: '#6da35f',
  belly: '#c6dc8c',
  spot: '#2f5a3a',
  head: '#6da35f',
  tongue: '#e0553f',
  pink: '#f4a18f',
} as const

/** What each length is: half thickness, waves in the body, wave height. Head sizes
 *  are in `HEAD`, because it stays big while the body thins. */
const HEAD = [1.28, 1.42, 1.34]
const SIZES: readonly (readonly [number, number, number])[] = [
  [36, 2.1, 44],
  [31, 2.7, 62],
  [29, 3.4, 42],
]

function sizeOf(pose: Pose): { half: number; waves: number; height: number } {
  const l = pose.state.length ?? 1
  const i = Math.min(Math.floor(l), SIZES.length - 2)
  const u = l - i
  return { half: lerp(SIZES[i][0], SIZES[i + 1][0], u), waves: lerp(SIZES[i][1], SIZES[i + 1][1], u), height: lerp(SIZES[i][2], SIZES[i + 1][2], u) }
}

const N = 72
const LEFT = 86
const RIGHT = 960

function bodySpine(pose: Pose): Vec[] {
  const { wave, cheer, scare, sad, sleep } = pose.a
  const { waves, height } = sizeOf(pose)
  const flat = 1 - sad * 0.55 - sleep * 0.7
  const amp = height * flat * (1 + cheer * 0.25 + scare * 0.15)
  const tight = 1 + scare * 0.5
  const run = pose.t * (1.2 + wave * 8 + cheer * 9 + scare * 12) * (1 - sleep * 0.8)
  const shrink = 1 - scare * 0.14
  const pts: Vec[] = []
  for (let i = 0; i <= N; i++) {
    const s = i / N
    const x = LEFT + (RIGHT - LEFT) * s * shrink
    // Calm near the head, so the face does not bob out of its own neck.
    const grow = Math.min(1, s * 5)
    pts.push([x, 100 + Math.sin(s * waves * tight * Math.PI * 2 + run - 0.7) * amp * grow - cheer * pose.hop * 6 * (1 - s)])
  }
  return pts
}

const body: DynamicPath = (pose) => {
  const { half } = sizeOf(pose)
  const w = widthProfile([[0, half * 1.05], [0.8, half], [1, half * 0.5]])
  return tubePath(bodySpine(pose), w)
}

const belly: DynamicPath = (pose) => {
  const { half } = sizeOf(pose)
  const w = widthProfile([[0, half * 1.05], [0.8, half], [1, half * 0.5]])
  const pts = bodySpine(pose)
  return sideBand(pts, 3, N - 2, (s) => -w(s) * 0.96, (s) => -w(s) * 0.5)
}

const spots: DynamicPath = (pose) => {
  const l = pose.state.length ?? 1
  const { half } = sizeOf(pose)
  const pts = bodySpine(pose)
  // A plain little one; the grown ones earn their spots.
  const show = Math.min(1, l)
  if (show <= 0) return 'M0 100Z'
  const every = Math.round(N / (5 + l * 2.5))
  let d = ''
  for (let i = every; i < N - 2; i += every) {
    const [x, y] = beside(pts, i, half * 0.3)
    d += ell(Number(fmt(x)), Number(fmt(y)), half * 0.62 * show, half * 0.5 * show)
  }
  return d
}

export function drawVibora(p: RigBuilder): RigUpdate {
  p.cluster([{ d: body, c: 'body' }])
  p.flat(belly, 'belly')
  p.flat(spots, 'spot')

  p.line('M-54 8L-78 8L-96 -2M-78 8L-96 18', { part: 'skull/tongue', w: 5, c: 'tongue' })
  p.cluster([{ d: blob([-76, 8], [-50, -36], [8, -54], [52, -40], [70, 0], [50, 38], [4, 50], [-52, 44]), c: 'head', part: 'skull' }])
  p.eye('eyeL', -22, -16, 19, { part: 'skull', ry: 21 })
  p.eye('eyeR', 22, -16, 16, { part: 'skull', ry: 18 })
  p.flat(ell(-48, 20, 10, 7), 'pink', { part: 'skull' })
  p.mouth(mouthPath(-22, 26, 19), { part: 'skull', w: 6 })

  return (pose, set) => {
    const { wave, cheer, scare, sad, sleep } = pose.a
    const pts = bodySpine(pose)
    const l = pose.state.length ?? 1
    const k = l <= 1 ? lerp(HEAD[0], HEAD[1], l) : lerp(HEAD[1], HEAD[2], l - 1)
    const up = (Math.sin(pose.t * 2) * 1 + sad * 12 + sleep * 18 - scare * 8) * 1
    set('skull', {
      x: pts[0][0] + 2,
      y: pts[0][1] + up,
      sx: k,
      sy: k,
      r: pose.look[0] * 4 - sad * 8 - sleep * 10 + Math.sin(pose.t * 7.5) * 4 * cheer,
    })
    const flick = Math.max(wave, cheer) * Math.max(0, Math.sin(pose.t * 9))
    set('tongue', { ox: -54, oy: 8, sx: 0.02 + flick, sy: 1 - sleep })
  }
}
