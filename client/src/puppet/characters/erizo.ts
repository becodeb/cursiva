// The hedgehog: one body with two numbers. `curl` rolls it from walking to a ball and
// `quills` raises the spiny coat; the spineless drawing is the same rig with quills
// down. Its own trick: with a fright every quill bristles and it starts to roll up.
import { clamp, ell, fmt, lerp, polyline, rad, type Vec } from '../geometry'
import { PAPER_INK, type DynamicPath, type RigBuilder, type RigUpdate } from '../rig'
import type { Pose } from '../actor'
import { browPath, mouthPath } from './face'
import { blob } from './shapes'

export const ERIZO_PALETTE = {
  ink: PAPER_INK,
  skin: '#cfa077',
  skinD: '#b0835c',
  skinL: '#e0bb94',
  coat: '#6d4629',
  coatL: '#8d6239',
  coatD: '#4f301a',
  face: '#f7d6a6',
  feet: '#c88a55',
  feetD: '#a36d3f',
  pink: '#ef8f73',
} as const

const curlOf = (pose: Pose): number => Math.max(pose.state.curl ?? 0, pose.a.sleep * 0.85, pose.a.scare * 0.45)
const quillsOf = (pose: Pose): number => Math.max(pose.state.quills ?? 0, pose.a.scare)

interface Dome {
  cx: number
  cy: number
  rx: number
  ry: number
  floor: number
}

function domeOf(pose: Pose): Dome {
  const curl = curlOf(pose)
  const breathe = pose.breath * 1.4
  return {
    cx: lerp(250, 224, curl),
    cy: lerp(180, 176, curl),
    rx: lerp(192, 172, curl) + breathe,
    ry: lerp(138, 172, curl) + breathe,
    floor: lerp(276, 400, curl),
  }
}

/** The body's edge at `a`: an ellipse with its belly cut flat until it curls. */
function edgeAt(d: Dome, a: number, out = 0): Vec {
  const x = d.cx + Math.cos(a) * (d.rx + out)
  const y = d.cy + Math.sin(a) * (d.ry + out)
  return [x, Math.min(y, d.floor + out * 0.2)]
}

const skinPath: DynamicPath = (pose) => {
  const d = domeOf(pose)
  const pts: Vec[] = []
  for (let i = 0; i < 40; i++) pts.push(edgeAt(d, (i / 40) * Math.PI * 2))
  return polyline(pts, true)
}

const SPIKES = 30

const coatPath: DynamicPath = (pose) => {
  const d = domeOf(pose)
  const curl = curlOf(pose)
  const { scare, cheer } = pose.a
  const tall = 24 + scare * 24 + cheer * pose.hop * 8
  // Over the back from the shoulders to the rump, reaching all the way round once it
  // curls; the head sits on top, so the coat needs no hole for it.
  const round = Math.min(1, curl * 1.25)
  const from = rad(lerp(200, 120, round))
  const to = rad(lerp(372, 480, round))
  const pts: Vec[] = []
  for (let i = 0; i <= SPIKES * 2; i++) {
    const a = from + ((to - from) * i) / (SPIKES * 2)
    const wiggle = i % 2 ? Math.sin(pose.t * 2 + i) * 1.2 : 0
    // The two ends sink into the body, so the coat never ends in a cut corner.
    const ease = Math.min(1, Math.min(i, SPIKES * 2 - i) / 5)
    pts.push(edgeAt(d, a, (i % 2 ? tall + wiggle : 6) * ease - (1 - ease) * 26))
  }
  pts.push([d.cx + d.rx * 0.5 * (1 - curl), d.cy + d.ry * lerp(0.42, 0.7, curl)])
  pts.push([d.cx - d.rx * 0.5 * (1 - curl), d.cy + d.ry * lerp(0.42, 0.7, curl)])
  return polyline(pts, true)
}

/** A round stub with its toes forward: the hedgehog walks to the left. */
const footOf = (x: number): string => blob([x - 18, 250], [x + 18, 250], [x + 20, 284], [x + 8, 300], [x - 24, 300], [x - 36, 288], [x - 22, 272])

/** Short strokes on the coat: enough to read as quills, few enough to stay paper. */
const TICKS: readonly (readonly [number, number, number])[] = [
  [228, 72, -14], [298, 90, 18], [160, 96, -34], [352, 142, 42], [250, 140, 4], [188, 156, -22], [310, 170, 24], [252, 208, 6],
]
/** Only on the ball's lower half, which the walking coat does not reach. */
const LOW_TICKS: readonly (readonly [number, number, number])[] = [
  [206, 268, -14], [278, 276, 12], [340, 244, 40], [236, 320, -6], [306, 316, 24],
]

/** A soft V of cut fur, its point outward from `(cx, cy)`. */
function furMark(cx: number, cy: number, x: number, y: number): string {
  const a = Math.atan2(y - cy, x - cx)
  const ux = Math.cos(a)
  const uy = Math.sin(a)
  const arm = 10
  return `M${fmt(x - uy * arm - ux * 8)} ${fmt(y + ux * arm - uy * 8)}L${fmt(x + ux * 4)} ${fmt(y + uy * 4)}L${fmt(x + uy * arm - ux * 8)} ${fmt(y - ux * arm - uy * 8)}`
}

/** Rings of fur over a body of this shape, so the paper is a coat and not a flat disc. */
function furRings(cx: number, cy: number, rx: number, ry: number, floor: number): string[] {
  const out: string[] = []
  for (const [share, count] of [[0.3, 6], [0.56, 11], [0.8, 16]] as const) {
    for (let i = 0; i < count; i++) {
      const a = ((i + share * 3) / count) * Math.PI * 2
      const y = cy + Math.sin(a) * ry * share
      if (y < floor) out.push(furMark(cx, cy, cx + Math.cos(a) * rx * share, y))
    }
  }
  return out
}

export function drawErizo(p: RigBuilder): RigUpdate {
  for (const [x, part] of [[326, 'footB2'], [172, 'footF2']] as const) {
    p.cluster([{ d: footOf(x), c: 'feetD', part }])
  }
  p.cluster([{ d: skinPath, c: 'skin' }])
  // Only the ball's lit side and its fur: a walking body has the fur of its own shape.
  p.flat(blob([120, 62], [200, 18], [288, 28], [262, 52], [190, 54], [132, 96]), 'skinL', { part: 'fuzzBall' })
  for (const d of furRings(224, 176, 172, 172, 400)) p.line(d, { w: 6, c: 'skinD', part: 'fuzzBall' })
  for (const d of furRings(250, 180, 192, 138, 262)) p.line(d, { w: 6, c: 'skinD', part: 'fuzzWalk' })
  p.cluster([{ d: coatPath, c: 'coat', part: 'coatLayer' }])
  for (const [x, y, r] of TICKS) {
    p.line(`M${x} ${y}L${fmt(x + Math.sin(rad(r)) * 26)} ${fmt(y - Math.cos(rad(r)) * 26)}`, { w: 8, c: 'coatL', part: 'coatLayer' })
  }
  for (const [x, y, r] of LOW_TICKS) {
    p.line(`M${x} ${y}L${fmt(x + Math.sin(rad(r)) * 26)} ${fmt(y - Math.cos(rad(r)) * 26)}`, { w: 8, c: 'coatL', part: 'ticksLow' })
  }
  for (const [x, part] of [[376, 'footB1'], [226, 'footF1']] as const) {
    p.cluster([{ d: footOf(x), c: 'feet', part }])
  }

  // The head is drawn around its neck and slides in as the body curls.
  p.cluster([{ d: blob([36, -58], [-10, -58], [-50, -30], [-74, 8], [-104, 32], [-108, 54], [-84, 74], [-34, 90], [24, 88], [62, 40], [64, -20]), c: 'face', part: 'skull' }])
  p.flat(ell(-30, 56, 18, 11), 'pink', { part: 'skull' })
  p.cluster([{ d: ell(-104, 42, 17, 15), c: 'ink', part: 'skull/nose' }])
  p.eye('eye', -34, 2, 21, { part: 'skull', ry: 24 })
  p.line(browPath(-8, -36, -58, -46), { part: 'skull/brow', w: 7, c: 'coat' })
  p.mouth(mouthPath(-70, 74, 14), { part: 'skull', w: 6 })
  p.cluster([{ d: ell(36, -40, 28, 30), c: 'skin', part: 'skull/ear' }])
  p.flat(ell(36, -40, 15, 18), 'pink', { part: 'skull/ear' })

  return (pose, set) => {
    const { wave, cheer, scare, sad, sleep } = pose.a
    const curl = curlOf(pose)
    const q = quillsOf(pose)
    const d = domeOf(pose)
    set('coatLayer', { ox: d.cx, oy: d.cy + 20, sx: q, sy: q })
    const ball = Math.max(clamp((curl - 0.7) * 4, 0, 1), 0.001)
    const walking = Math.max(clamp((0.3 - curl) * 4, 0, 1), 0.001)
    set('fuzzBall', { ox: 224, oy: 176, sx: ball, sy: ball })
    set('fuzzWalk', { ox: 250, oy: 180, sx: walking, sy: walking })
    const low = q * clamp((curl - 0.5) * 3, 0, 1)
    set('ticksLow', { ox: d.cx, oy: d.cy + 60, sx: Math.max(low, 0.001), sy: Math.max(low, 0.001) })
    const k = lerp(1, 0.78, curl)
    set('skull', {
      // Tucked into the ball, so a mark around it still rings a ball.
      x: lerp(116, 128, curl),
      y: lerp(190, 232, curl) + sad * 8,
      sx: k,
      sy: k,
      r: pose.look[0] * 3 + Math.sin(pose.t * 7) * 3 * cheer - sad * 8 - curl * 6 + scare * 2,
    })
    set('nose', { ox: -104, oy: 42, y: Math.sin(pose.t * 4.4) * 1.6, sx: 1 + Math.sin(pose.t * 8.8) * 0.05 })
    set('ear', { ox: 36, oy: -14, r: -sad * 22 - scare * 12 - sleep * 22 })
    const walk = Math.sin(pose.t * 11) * wave
    const hide = 1 - clamp(curl * 1.5, 0, 1)
    const step = (name: string, x: number, sign: 1 | -1): void =>
      set(name, { ox: x, oy: 256, sx: Math.max(hide, 0.001), sy: Math.max(hide, 0.001), y: -Math.max(0, walk * sign) * 11, x: walk * sign * 7 })
    step('footB2', 326, -1)
    step('footF2', 172, 1)
    step('footB1', 376, 1)
    step('footF1', 226, -1)
  }
}
