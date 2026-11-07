// The sheep: one cloud of wool on four dark legs. Its own trick is the wool, which
// puffs up with a fright and bounces when it is happy.
import { ell } from '../geometry'
import { PAPER_INK, type RigBuilder, type RigUpdate } from '../rig'
import { browPath, mouthPath } from './face'
import { blob, cloud, line } from './shapes'

export const OVEJA_PALETTE = {
  ink: PAPER_INK,
  wool: '#fff6e0',
  woolD: '#ecd9b2',
  skin: '#5b5560',
  skinD: '#3f3b45',
  hoof: '#26252b',
  pink: '#f4a18f',
} as const

const leg = (x: number, c: string, part: string) => ({
  shape: [
    { d: `M${x - 20} 262L${x + 20} 262L${x + 15} 348L${x - 15} 348Z`, c, part },
    { d: `M${x - 14} 344L${x + 14} 344C${x + 18} 354 ${x + 16} 372 ${x + 6} 372L${x - 26} 372C${x - 34} 366 ${x - 24} 350 ${x - 14} 344Z`, c: 'hoof', part },
  ],
})

export function drawOveja(p: RigBuilder): RigUpdate {
  p.cluster(leg(198, 'skinD', 'legFarF').shape)
  p.cluster(leg(362, 'skinD', 'legFarB').shape)
  p.cluster(cloud(424, 150, 8, 12, 5, 18, 'wool', 'tail', 0.3))
  p.cluster(leg(136, 'skin', 'legF').shape)
  p.cluster(leg(312, 'skin', 'legB').shape)

  p.cluster(cloud(256, 204, 118, 74, 15, 36, 'woolD', 'woolly', 0.4))
  p.cluster(cloud(252, 172, 130, 78, 17, 37, 'wool', 'woolly', 0.15))
  for (const [x1, y1, cx, cy, x2, y2] of [
    [214, 96, 236, 74, 262, 92],
    [320, 112, 346, 94, 366, 118],
    [170, 196, 188, 224, 216, 210],
    [258, 182, 282, 210, 312, 192],
    [352, 200, 372, 218, 386, 192],
  ]) {
    p.line(line(x1, y1, cx, cy, x2, y2), { part: 'woolly', w: 8, c: 'woolD' })
  }

  p.cluster([{ d: blob([66, 72], [116, 64], [150, 104], [140, 150], [96, 180], [40, 180], [6, 156], [6, 132], [32, 98]), c: 'skin', part: 'head' }])
  p.flat(ell(20, 134, 8, 6), 'hoof', { part: 'head' })
  p.mouth(mouthPath(40, 158, 13), { part: 'head', w: 5, c: 'hoof' })
  p.eye('eye', 74, 116, 20, { part: 'head', ry: 23 })
  p.cluster(cloud(124, 56, 48, 26, 10, 23, 'wool', 'head', 0.4))
  p.line(browPath(98, 84, 58, 76), { part: 'head/brow', w: 7, c: 'hoof' })
  p.cluster([{ d: blob([142, 102], [182, 110], [212, 140], [204, 160], [164, 152], [136, 126]), c: 'skinD', part: 'head/ear' }])
  p.flat(blob([152, 114], [180, 122], [198, 146], [168, 144], [148, 128]), 'pink', { part: 'head/ear' })

  return (pose, set) => {
    const { wave, cheer, scare, sad, sleep } = pose.a
    const puff = 1 + scare * 0.14 + pose.breath * 0.012 + cheer * pose.hop * 0.06
    const sink = sleep * 46 + sad * 8
    set('woolly', { ox: 254, oy: 200, sx: puff, sy: puff, y: sink })
    set('tail', { ox: 412, oy: 160, r: Math.sin(pose.t * (3 + wave * 8 + cheer * 16)) * (3 + wave * 14 + cheer * 22) + sleep * 30, y: sink })
    set('head', {
      ox: 130,
      oy: 170,
      r: pose.look[0] * 4 + Math.sin(pose.t * 2) * 1 + Math.sin(pose.t * 7.5) * 4 * cheer - sad * 14 - sleep * 20 + Math.sin(pose.t * 10) * 3 * wave,
      y: sink + sad * 6 - scare * 6,
      x: scare * 8,
    })
    set('ear', { ox: 144, oy: 116, r: sad * 26 + sleep * 32 - scare * 24 + Math.sin(pose.t * 14) * 16 * cheer })
    set('brow', { y: -scare * 4 })
    const walk = Math.sin(pose.t * 10) * wave
    const fold = 1 - sleep * 0.42
    const stand = (name: string, x: number, sign: 1 | -1): void =>
      set(name, { ox: x, oy: 372, sy: fold, r: walk * 13 * sign + scare * (x < 254 ? 7 : -7) })
    stand('legF', 136, 1)
    stand('legFarB', 362, 1)
    stand('legFarF', 198, -1)
    stand('legB', 312, -1)
  }
}
