// The monkey: long arms and a curled tail. One rig stands in three frames: `pose` 0
// reaches up, 1 sits with a banana, 2 greets. Its own trick is the arms, thrown
// overhead with joy, clapped to its cheeks with a fright, dangling when it is sad.
import { clamp, ell, lerp, rad, spine, tubePath, type Vec } from '../geometry'
import { PAPER_INK, type DynamicPath, type RigBuilder, type RigUpdate } from '../rig'
import type { Pose } from '../actor'
import { browPath, mouthPath } from './face'
import { blob, limbPoints, mix, widthProfile } from './shapes'

export const MONO_PALETTE = {
  ink: PAPER_INK,
  fur: '#96602f',
  furD: '#70451f',
  skin: '#f8d3a2',
  skinD: '#ecb97f',
  pink: '#f6a58c',
  banana: '#fbd33a',
  bananaD: '#dfa91c',
  mouthIn: '#7c2c1c',
} as const

const weights = (pose: Pose): { reach: number; sit: number; greet: number } => {
  const p = pose.state.pose ?? 0
  return { reach: clamp(1 - p, 0, 1), sit: clamp(1 - Math.abs(p - 1), 0, 1), greet: clamp(p - 1, 0, 1) }
}

/** How far the body has dropped: sitting, or a slump. */
const dropOf = (pose: Pose): number => weights(pose).sit * 58 + pose.a.sleep * 14 + pose.a.sad * 8

const SHOULDER_N: Vec = [150, 222]
const SHOULDER_F: Vec = [76, 222]
const HIP_N: Vec = [128, 322]
const HIP_F: Vec = [90, 322]

/** The near arm, on the free side: the one that does the talking. */
function nearHand(pose: Pose): Vec {
  const w = weights(pose)
  const drop = dropOf(pose)
  const { wave, cheer, scare, sad, sleep } = pose.a
  const up = Math.max(w.reach, w.greet * 0.6, wave, cheer)
  const sway = Math.sin(pose.t * (2 + wave * 11 + cheer * 13)) * (2 + wave * 26 + cheer * 14)
  let hand: Vec = mix([176, 300 + drop], [234 + sway, 38 + drop * 0.5], up)
  if (w.greet > 0 && !wave && !cheer) hand = mix(hand, [244 + sway, 170], w.greet)
  if (w.sit > 0) hand = mix(hand, [156, 346], w.sit * (1 - Math.max(wave, cheer)))
  hand = mix(hand, [212, 176], scare)
  hand = mix(hand, [178, 356], Math.max(sad, sleep))
  return hand
}

function farHand(pose: Pose): Vec {
  const w = weights(pose)
  const drop = dropOf(pose)
  const { cheer, scare, sad, sleep } = pose.a
  let hand: Vec = mix([44, 310 + drop], [62, 346], w.sit)
  hand = mix(hand, [12 + Math.sin(pose.t * 13) * 12, 40], cheer)
  hand = mix(hand, [20, 176], scare)
  hand = mix(hand, [48, 362], Math.max(sad, sleep))
  return hand
}

// Both start narrow, so the joint is a soft round end and never a square cut.
const armWidth = widthProfile([[0, 6], [0.1, 17], [1, 14]])
const legWidth = widthProfile([[0, 8], [0.12, 22], [1, 15]])

const armPath = (shoulder: Vec, hand: (pose: Pose) => Vec, sag: number): DynamicPath => (pose) => {
  const drop = dropOf(pose)
  return tubePath(limbPoints([shoulder[0], shoulder[1] + drop], hand(pose), sag), armWidth)
}

function footAt(pose: Pose, near: boolean): Vec {
  const w = weights(pose)
  const walk = Math.sin(pose.t * 10) * pose.a.wave * (1 - w.sit)
  const stand: Vec = near ? [176 + walk * 16, 424 - Math.max(0, walk) * 16] : [74 - walk * 16, 428 - Math.max(0, -walk) * 16]
  const seat: Vec = near ? [170, 428] : [58, 428]
  return mix(stand, seat, w.sit)
}

const legPath = (hip: Vec, near: boolean): DynamicPath => (pose) => {
  const sit = weights(pose).sit
  const drop = dropOf(pose)
  return tubePath(limbPoints([hip[0], hip[1] + drop], footAt(pose, near), (near ? -1 : 1) * (10 + sit * 44)), legWidth)
}

const footPath = (near: boolean): DynamicPath => (pose) => {
  const f = footAt(pose, near)
  return ell(f[0] + (near ? 8 : -8), f[1] + 6, 31, 15)
}

/** A mitten: a palm and three fingers fanned away from the wrist. */
const handPath = (hand: (pose: Pose) => Vec, shoulder: Vec): DynamicPath => (pose) => {
  const h = hand(pose)
  const th = Math.atan2(h[1] - shoulder[1] - dropOf(pose), h[0] - shoulder[0])
  let d = ell(h[0], h[1], 18, 18)
  for (const fan of [-0.62, 0, 0.62]) {
    const a = th + fan
    d += ell(h[0] + Math.cos(a) * 20, h[1] + Math.sin(a) * 20, 8, 8)
  }
  return d
}

const tail: DynamicPath = (pose) => {
  const { wave, cheer, scare, sad, sleep } = pose.a
  return tubePath(
    spine({
      x: 72,
      y: 330 + dropOf(pose),
      a: rad(150 - sad * 12 + sleep * 8 + scare * 62),
      L: 150,
      n: 22,
      tipCurl: 2.6 * (1 - scare * 0.7 - sad * 0.5),
      sway: 0.12 + wave * 0.3 + cheer * 0.4,
      t: pose.t * (2 + wave * 6 + cheer * 8),
      ph: 0.4,
    }),
    (s) => lerp(13, 9, s),
  )
}

export function drawMono(p: RigBuilder): RigUpdate {
  p.cluster([{ d: tail, c: 'fur' }])
  p.cluster([{ d: legPath(HIP_F, false), c: 'furD' }, { d: footPath(false), c: 'skinD' }])
  p.cluster([{ d: armPath(SHOULDER_F, farHand, 16), c: 'furD' }, { d: handPath(farHand, SHOULDER_F), c: 'skinD' }])

  p.cluster([{ d: blob([84, 206], [144, 206], [166, 268], [158, 330], [114, 356], [68, 332], [60, 268]), c: 'fur', part: 'trunk' }])
  p.flat(blob([92, 246], [136, 246], [146, 296], [114, 340], [82, 296]), 'skin', { part: 'trunk' })
  p.cluster([{ d: legPath(HIP_N, true), c: 'fur' }, { d: footPath(true), c: 'skin' }])

  // A banana held in both hands, only when sitting.
  p.cluster([{ d: 'M116 232C102 256 96 288 106 318C108 326 124 326 124 318C118 292 122 262 130 238C132 228 120 224 116 232Z', c: 'banana', part: 'bananaHeld' }])
  p.flat('M122 240C112 266 108 292 116 318C110 292 112 262 122 240Z', 'bananaD', { part: 'bananaHeld' })
  p.cluster([{ d: ell(88, 290, 18, 18), c: 'skinD', part: 'bananaHeld' }])

  p.cluster([{ d: armPath(SHOULDER_N, nearHand, -14), c: 'fur' }, { d: handPath(nearHand, SHOULDER_N), c: 'skin' }])

  p.cluster([{ d: ell(46, 128, 26, 28), c: 'fur', part: 'head/earL' }])
  p.flat(ell(46, 128, 15, 17), 'pink', { part: 'head/earL' })
  p.cluster([{ d: ell(186, 128, 26, 28), c: 'fur', part: 'head/earR' }])
  p.flat(ell(186, 128, 15, 17), 'pink', { part: 'head/earR' })
  p.cluster([
    { d: blob([96, 66], [92, 38], [108, 46], [114, 22], [128, 44], [146, 32], [140, 68]), c: 'fur', part: 'head' },
    { d: blob([116, 56], [168, 78], [184, 128], [166, 182], [116, 204], [66, 182], [48, 128], [64, 78]), c: 'fur', part: 'head' },
  ])
  p.flat(blob([116, 96], [146, 80], [168, 106], [164, 148], [156, 186], [116, 200], [76, 186], [68, 148], [64, 106], [86, 80]), 'skin', { part: 'head' })
  p.flat(ell(116, 150, 5, 3.5), 'furD', { part: 'head' })
  p.eye('eyeL', 88, 120, 20, { part: 'head', ry: 23 })
  p.eye('eyeR', 144, 120, 20, { part: 'head', ry: 23 })
  p.line(browPath(68, 90, 100, 84), { part: 'head/brows', w: 7, c: 'furD' })
  p.line(browPath(164, 90, 132, 84), { part: 'head/brows', w: 7, c: 'furD' })
  p.mouth(mouthPath(116, 162, 26), { part: 'head', c: 'mouthIn', w: 8 })

  return (pose, set) => {
    const { wave, cheer, scare, sad, sleep } = pose.a
    const drop = dropOf(pose)
    const w = weights(pose)
    const held = w.sit * (1 - Math.max(wave, cheer, scare))
    set('trunk', { y: drop, ox: 114, oy: 340, r: Math.sin(pose.t * 10) * wave * 2 })
    set('head', {
      ox: 116,
      oy: 196,
      y: drop + sad * 8 + sleep * 10 + pose.breath * 1.2,
      r: pose.look[0] * 4 + Math.sin(pose.t * 7.5) * 5 * cheer + (w.reach * 5 + w.greet * 3) * (1 - sad) + sleep * 8 + sad * 6,
    })
    set('bananaHeld', { ox: 116, oy: 290, y: drop, sx: held, sy: held })
    const ear = Math.sin(pose.t * 13) * 7 * cheer + sad * 12 - scare * 10
    set('earL', { ox: 66, oy: 130, r: -ear })
    set('earR', { ox: 166, oy: 130, r: ear })
    set('brows', { y: -scare * 3 })
  }
}
