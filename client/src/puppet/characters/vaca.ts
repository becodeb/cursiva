// The cow: a white body with brown maps on it, a big head turned to you. Her own
// trick is the tail, which swishes all day and shoots up with a fright.
import { ell, rad, spine, tubePath } from '../geometry'
import { PAPER_INK, type DynamicPath, type RigBuilder, type RigUpdate } from '../rig'
import type { Pose } from '../actor'
import { browPath, mouthPath } from './face'
import { blob, cloud, widthProfile } from './shapes'

export const VACA_PALETTE = {
  ink: PAPER_INK,
  hide: '#fbf5e9',
  hideD: '#e7dcc6',
  patch: '#8b5328',
  patchD: '#6f4220',
  muzzle: '#f7a9a5',
  muzzleD: '#d97f7c',
  horn: '#f0cd86',
  hoof: '#5a3618',
  udder: '#f5b3ae',
} as const

const tailSpine = (pose: Pose) => {
  const { wave, cheer, scare, sad, sleep } = pose.a
  return spine({
    x: 36,
    y: 170,
    a: rad(106 - scare * 110 + sad * -2 + sleep * 8),
    L: 128,
    n: 14,
    tipCurl: 0.9,
    sway: 0.4 + wave * 0.5 + cheer * 0.7 - sleep * 0.3,
    t: pose.t * (1.8 + wave * 6 + cheer * 9),
    ph: 0.6,
  })
}

const tail: DynamicPath = (pose) => tubePath(tailSpine(pose), widthProfile([[0, 9], [1, 7]]))
const tuft: DynamicPath = (pose) => {
  const end = tailSpine(pose)[14]
  return ell(end[0], end[1], 17, 22)
}

const leg = (x: number, c: string, part: string) => [
  { d: `M${x - 25} 268L${x + 25} 268L${x + 22} 360L${x - 22} 360Z`, c, part },
  { d: `M${x - 23} 356L${x + 23} 356C${x + 30} 372 ${x + 30} 398 ${x + 18} 400L${x - 26} 400C${x - 34} 396 ${x - 30} 370 ${x - 23} 356Z`, c: 'hoof', part },
]

export function drawVaca(p: RigBuilder): RigUpdate {
  p.cluster([{ d: tail, c: 'hide' }, { d: tuft, c: 'patch' }])
  p.cluster(leg(112, 'hideD', 'legFarB'))
  p.cluster(leg(292, 'hideD', 'legFarF'))
  p.cluster([{ d: blob([118, 278], [164, 288], [166, 328], [146, 352], [122, 334]), c: 'udder', part: 'hull' }])
  p.cluster(leg(62, 'hide', 'legB'))
  p.cluster(leg(238, 'hide', 'legF'))

  p.cluster([{ d: blob([26, 196], [64, 150], [160, 150], [250, 140], [320, 176], [328, 258], [290, 306], [190, 300], [84, 312], [30, 268]), c: 'hide', part: 'hull' }])
  p.flat(blob([44, 196], [78, 160], [150, 160], [182, 186], [140, 196], [126, 238], [84, 216], [60, 244], [40, 228]), 'patch', { part: 'hull' })
  p.flat(blob([214, 212], [262, 198], [296, 226], [280, 264], [240, 262], [212, 288], [196, 250]), 'patch', { part: 'hull' })
  p.flat(ell(150, 276, 22, 15), 'patch', { part: 'hull' })

  // Horns and ears grow out from behind the head.
  p.cluster([{ d: blob([284, 46], [270, 8], [296, 16], [314, 52]), c: 'horn', part: 'head' }])
  p.cluster([{ d: blob([372, 52], [392, 16], [408, 10], [404, 50]), c: 'horn', part: 'head' }])
  p.cluster([{ d: blob([274, 86], [232, 62], [214, 86], [234, 116], [278, 118]), c: 'patch', part: 'head/earL' }])
  p.flat(blob([256, 90], [232, 78], [226, 92], [240, 106], [258, 106]), 'muzzle', { part: 'head/earL' })
  p.cluster([{ d: blob([404, 86], [436, 66], [446, 92], [430, 118], [400, 116]), c: 'patch', part: 'head/earR' }])
  p.flat(blob([414, 92], [432, 80], [436, 94], [424, 106], [412, 104]), 'muzzle', { part: 'head/earR' })
  p.cluster([{ d: blob([268, 90], [296, 44], [344, 30], [392, 44], [418, 88], [414, 150], [404, 200], [344, 230], [286, 202], [270, 150]), c: 'hide', part: 'head' }])
  p.cluster(cloud(344, 38, 18, 6, 6, 14, 'hide', 'head', 0.3))
  p.flat(blob([272, 96], [296, 56], [340, 62], [344, 122], [316, 154], [274, 142]), 'patch', { part: 'head' })
  p.cluster([{ d: blob([278, 174], [314, 150], [378, 150], [412, 174], [396, 222], [344, 240], [292, 222]), c: 'muzzle', part: 'head' }])
  p.flat(ell(322, 178, 9, 7), 'muzzleD', { part: 'head' })
  p.flat(ell(370, 178, 9, 7), 'muzzleD', { part: 'head' })
  p.eye('eyeL', 310, 112, 22, { part: 'head', ry: 26 })
  p.eye('eyeR', 382, 112, 21, { part: 'head', ry: 25 })
  p.line(browPath(284, 78, 330, 72), { part: 'head/brows', w: 7, c: 'hide' })
  p.line(browPath(408, 80, 362, 72), { part: 'head/brows', w: 7, c: 'patch' })
  p.mouth(mouthPath(346, 204, 24), { part: 'head', w: 7 })

  return (pose, set) => {
    const { wave, cheer, scare, sad, sleep } = pose.a
    const sink = sleep * 50 + sad * 8
    set('hull', { y: sink, ox: 180, oy: 300, sy: 1 + scare * 0.03 })
    const chew = Math.sin(pose.t * 2.2) * 1.2 * (1 - sleep)
    set('head', {
      ox: 330,
      oy: 210,
      r: pose.look[0] * 3 + Math.sin(pose.t * 7.5) * 4 * cheer + sad * 12 + sleep * 18 + chew + Math.sin(pose.t * 10) * 2 * wave,
      y: sink + sad * 12 + sleep * 18 - scare * 8,
      x: scare * 4,
    })
    const ear = Math.sin(pose.t * 13) * 12 * cheer + sad * 20 + sleep * 26 - scare * 18
    set('earL', { ox: 270, oy: 100, r: -ear })
    set('earR', { ox: 406, oy: 100, r: ear })
    set('brows', { y: -scare * 3 })
    const walk = Math.sin(pose.t * 9) * wave
    const fold = 1 - sleep * 0.44
    const stand = (name: string, x: number, sign: 1 | -1): void => set(name, { ox: x, oy: 400, sy: fold, r: walk * 11 * sign + scare * (x < 180 ? 4 : -4) })
    stand('legF', 238, 1)
    stand('legFarB', 112, 1)
    stand('legFarF', 292, -1)
    stand('legB', 62, -1)
  }
}
