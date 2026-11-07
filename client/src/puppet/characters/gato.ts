// The cat: a big striped head and a tail that says everything. Its own trick: with a
// fright the tail goes straight up and thick and the back arches.
import { lerp, rad, spine, tubePath, type Vec } from '../geometry'
import { PAPER_INK, type DynamicPath, type RigBuilder, type RigUpdate } from '../rig'
import type { Pose } from '../actor'
import { browPath, mouthPath } from './face'
import { blob, line } from './shapes'

export const GATO_PALETTE = {
  ink: PAPER_INK,
  fur: '#f58a2e',
  furD: '#d8691a',
  furB: '#c9620f',
  white: '#fff8ec',
  whiteD: '#eadfcc',
  pink: '#f8a48e',
  nose: '#e4635a',
} as const

function tailSpine(pose: Pose): Vec[] {
  const { wave, cheer, scare, sad, sleep } = pose.a
  return spine({
    x: 374,
    y: 230,
    a: rad(-34 + scare * -30 + sad * 60 + sleep * 80),
    L: 260,
    n: 22,
    bend: rad(-30 + sad * 30 + sleep * 40),
    tipCurl: -1.9 * (1 - scare * 0.8 - sad),
    sway: 0.16 + wave * 0.34 + cheer * 0.44 - scare * 0.1,
    t: pose.t * (1.6 + wave * 5 + cheer * 7 + scare * 14),
    ph: 0.4,
  })
}

const tail: DynamicPath = (pose) => {
  const thick = 1 + pose.a.scare * 0.55
  return tubePath(tailSpine(pose), (s) => lerp(25, 19, s) * thick)
}

const tailTip: DynamicPath = (pose) => {
  const pts = tailSpine(pose)
  const thick = 1 + pose.a.scare * 0.55
  return tubePath(pts.slice(16), (s) => lerp(19.5, 19, s) * thick)
}

const leg = (x: number, c: string, paw: string, part: string, top = 250) => [
  // A round shoulder on top: a square cut shows where the leg overlaps the body.
  { d: `M${x - 25} ${top + 20}C${x - 25} ${top - 8} ${x + 25} ${top - 8} ${x + 25} ${top + 20}L${x + 21} 368L${x - 21} 368Z`, c, part },
  { d: `M${x - 22} 362L${x + 22} 362C${x + 28} 378 ${x + 26} 408 ${x + 12} 408L${x - 30} 408C${x - 42} 404 ${x - 34} 372 ${x - 22} 362Z`, c: paw, part },
]

export function drawGato(p: RigBuilder): RigUpdate {
  p.cluster([{ d: tail, c: 'fur' }, { d: tailTip, c: 'white' }])
  p.cluster(leg(130, 'furD', 'whiteD', 'legFarF'))
  p.cluster(leg(352, 'furD', 'whiteD', 'legFarB'))

  p.cluster([{ d: blob([82, 208], [170, 170], [278, 170], [370, 190], [396, 252], [372, 306], [270, 324], [150, 330], [76, 298]), c: 'fur', part: 'back' }])
  for (const d of [
    blob([232, 166], [256, 166], [262, 232], [240, 238]),
    blob([288, 168], [312, 172], [316, 240], [294, 244]),
    blob([342, 180], [366, 192], [362, 250], [344, 248]),
  ]) {
    p.flat(d, 'furB', { part: 'back' })
  }
  p.flat(blob([74, 216], [140, 214], [168, 262], [142, 320], [84, 304], [64, 262]), 'white', { part: 'back' })
  p.cluster(leg(84, 'fur', 'white', 'legF'))
  p.cluster(leg(302, 'fur', 'white', 'legB'))

  p.cluster([{ d: 'M14 96C2 62 2 26 14 6C44 12 74 30 96 54Z', c: 'fur', part: 'head/earL' }])
  p.flat('M30 70C24 52 24 36 28 26C44 30 60 40 72 54Z', 'pink', { part: 'head/earL' })
  p.cluster([{ d: 'M132 50C154 28 182 10 214 4C224 26 224 62 208 96Z', c: 'fur', part: 'head/earR' }])
  p.flat('M158 52C172 38 186 30 200 26C204 40 204 56 196 72Z', 'pink', { part: 'head/earR' })
  p.cluster([{ d: blob([110, 38], [180, 56], [222, 116], [204, 182], [142, 218], [80, 216], [20, 180], [-2, 116], [38, 56]), c: 'fur', part: 'head' }])
  for (const d of [blob([84, 34], [100, 34], [100, 70], [90, 72]), blob([114, 36], [130, 40], [122, 72], [110, 70]), blob([58, 44], [74, 38], [80, 68], [70, 72])]) {
    p.flat(d, 'furB', { part: 'head' })
  }
  p.flat(blob([64, 170], [110, 134], [156, 170], [170, 196], [142, 218], [80, 216], [50, 196]), 'white', { part: 'head' })
  p.eye('eyeL', 62, 122, 25, { part: 'head', ry: 28 })
  p.eye('eyeR', 160, 122, 25, { part: 'head', ry: 28 })
  p.line(browPath(32, 84, 80, 78), { part: 'head/brows', w: 7, c: 'furB' })
  p.line(browPath(190, 84, 142, 78), { part: 'head/brows', w: 7, c: 'furB' })
  p.flat('M100 154L122 154L111 166Z', 'nose', { part: 'head' })
  p.mouth(mouthPath(111, 178, 17), { part: 'head', w: 6 })
  for (const [x1, y1, cx, cy, x2, y2] of [
    [36, 162, 10, 156, -12, 148],
    [36, 176, 10, 178, -10, 182],
    [186, 162, 212, 156, 232, 148],
    [186, 176, 212, 178, 230, 182],
  ]) {
    p.line(line(x1, y1, cx, cy, x2, y2), { part: 'head/whisk', w: 4 })
  }

  return (pose, set) => {
    const { wave, cheer, scare, sad, sleep } = pose.a
    const sink = sleep * 46 + sad * 6
    set('back', { ox: 230, oy: 324, y: sink - scare * 20, sy: 1 + scare * 0.12, r: Math.sin(pose.t * 10) * wave * 1.5 })
    set('head', {
      ox: 106,
      oy: 200,
      r: pose.look[0] * 4 + Math.sin(pose.t * 7.5) * 4 * cheer + sleep * 12 + sad * 8 - scare * 3,
      y: sink + sad * 8 + sleep * 8 + pose.breath,
      x: scare * 6,
    })
    const ear = Math.sin(pose.t * 13) * 8 * cheer + sad * 18 + sleep * 8 + scare * 24
    set('earL', { ox: 40, oy: 72, r: -ear })
    set('earR', { ox: 176, oy: 72, r: ear })
    set('whisk', { ox: 106, oy: 160, sy: 1 + Math.sin(pose.t * 9) * 0.1 * Math.max(cheer, wave) - sad * 0.4 + scare * 0.4 })
    set('brows', { y: -scare * 3 })
    const walk = Math.sin(pose.t * 10) * wave
    const fold = 1 - sleep * 0.42
    const stand = (name: string, x: number, sign: 1 | -1): void => set(name, { ox: x, oy: 408, sy: fold, r: walk * 12 * sign + scare * (x < 230 ? 5 : -5) })
    stand('legF', 84, 1)
    stand('legFarB', 352, 1)
    stand('legFarF', 130, -1)
    stand('legB', 302, -1)
  }
}
