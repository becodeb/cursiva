// The hen: a round body, a cream ruff and a comb. Her own trick is the head, which
// pecks when she walks, and the ruff, which stands up with a fright.
import { ell, lerp } from '../geometry'
import { PAPER_INK, type RigBuilder, type RigUpdate } from '../rig'
import { browPath } from './face'
import { blob } from './shapes'

export const GALLINA_PALETTE = {
  ink: PAPER_INK,
  body: '#c0591f',
  bodyD: '#8e3d14',
  tail: '#6f2f12',
  ruff: '#fbe7c2',
  comb: '#e43d31',
  combD: '#bf2a22',
  beak: '#f8bd2c',
  beakD: '#df9417',
  leg: '#f2ab21',
  legD: '#d58c14',
  pink: '#f9a98a',
} as const

/** A thin leg and a three-toed foot, in profile: the toes point the way she faces. */
const leg = (x: number, c: string, part: string) => [
  { d: `M${x - 11} 356L${x + 11} 356L${x + 10} 412L${x - 10} 412Z`, c, part },
  { d: `M${x - 14} 404L${x + 12} 404L${x + 62} 428C${x + 70} 436 ${x + 58} 442 ${x + 46} 438L${x + 20} 430L${x + 34} 442C${x + 34} 448 ${x + 14} 448 ${x + 4} 440L${x - 8} 428L${x - 34} 442C${x - 44} 444 ${x - 46} 434 ${x - 38} 428Z`, c, part },
]

export function drawGallina(p: RigBuilder): RigUpdate {
  p.cluster(leg(212, 'legD', 'legFar'))
  p.cluster(leg(146, 'leg', 'legNear'))
  p.cluster([
    { d: blob([104, 236], [44, 176], [2, 182], [6, 232], [36, 258], [80, 288]), c: 'tail', part: 'tailFan' },
    { d: blob([96, 262], [28, 240], [-4, 264], [14, 306], [62, 320], [106, 314]), c: 'tail', part: 'tailFan' },
    { d: blob([86, 206], [58, 134], [20, 120], [10, 170], [46, 218], [96, 250]), c: 'tail', part: 'tailFan' },
  ])

  p.cluster([{ d: blob([56, 286], [102, 218], [190, 190], [270, 222], [302, 292], [272, 352], [184, 384], [96, 364]), c: 'body', part: 'hull' }])

  // The ruff and the head ride together. The bill grows out of the head, and the
  // comb and wattle out of it too: all drawn behind it, so it covers their base.
  // The comb and wattle grow out of the head too, three soft lobes each side of it.
  p.cluster([
    { d: ell(232, 56, 26, 28), c: 'comb', part: 'neck/skull/combTop' },
    { d: ell(270, 38, 30, 34), c: 'comb', part: 'neck/skull/combTop' },
    { d: ell(302, 68, 24, 27), c: 'comb', part: 'neck/skull/combTop' },
  ])
  p.cluster([{ d: blob([310, 142], [344, 144], [356, 182], [336, 206], [314, 186]), c: 'comb', part: 'neck/skull/wattle' }])
  p.cluster([{ d: 'M304 126C324 130 340 136 352 146C338 156 318 156 300 150Z', c: 'beakD', part: 'neck/skull/billLow' }])
  p.cluster([{ d: 'M298 84C332 90 360 108 370 134C346 146 318 144 294 138Z', c: 'beak', part: 'neck/skull/billUp' }])
  // Head and ruff are one paper piece, one shadow; the ruff hangs in scallops.
  p.cluster([
    ...[[190, 226, 25], [220, 250, 27], [256, 258, 28], [292, 250, 27], [320, 226, 25]].map(([x, y, r]) => ({ d: ell(x, y, r, r), c: 'ruff', part: 'neck' })),
    { d: blob([196, 96], [220, 58], [268, 50], [304, 82], [310, 128], [314, 182], [332, 226], [254, 250], [172, 226], [186, 164]), c: 'ruff', part: 'neck/skull' },
  ])
  p.flat(ell(250, 150, 14, 9), 'pink', { part: 'neck/skull' })
  p.eye('eye', 270, 112, 20, { part: 'neck/skull', ry: 24 })
  p.line(browPath(238, 80, 286, 70), { part: 'neck/skull/brow', w: 7, c: 'bodyD' })

  p.cluster([{ d: blob([206, 272], [166, 246], [104, 252], [72, 288], [90, 300], [80, 324], [118, 326], [126, 346], [172, 332], [210, 302]), c: 'bodyD', part: 'wing' }])

  return (pose, set) => {
    const { wave, cheer, scare, sad, sleep } = pose.a
    // A peck: down and up on the walk, and no higher than the neck allows.
    const peck = Math.max(0, Math.sin(pose.t * 5.5)) * wave
    const ruffle = 1 + scare * 0.18 + cheer * pose.hop * 0.05
    set('neck', {
      ox: 232,
      oy: 262,
      sx: ruffle,
      sy: ruffle,
      x: scare * -6,
      r: peck * 24 + sad * 18 + sleep * 34 + Math.sin(pose.t * 7.5) * 4 * cheer + pose.look[0] * 3,
    })
    set('skull', { ox: 240, oy: 160, r: pose.look[0] * 3 + sleep * 16 + sad * 6 })
    const jaw = pose.open
    set('billUp', { ox: 300, oy: 116, r: -jaw * 8 })
    set('billLow', { ox: 302, oy: 138, r: jaw * 20 + 2 - sad * 4 })
    set('combTop', { ox: 256, oy: 74, r: Math.sin(pose.t * 7.5) * 5 * cheer + sad * 12 + Math.sin(pose.t * 5.5) * 5 * wave, sy: 1 + scare * 0.1 })
    set('wattle', { ox: 312, oy: 152, r: Math.sin(pose.t * 11) * 9 * Math.max(cheer, wave) })
    set('brow', { y: -scare * 3 })
    const flap = Math.sin(pose.t * (2 + cheer * 24 + scare * 28))
    set('wing', { ox: 196, oy: 270, r: -flap * (1 + cheer * 22 + scare * 16) + sad * 8 + wave * Math.sin(pose.t * 11) * 3 })
    set('tailFan', { ox: 84, oy: 266, r: Math.sin(pose.t * (2 + wave * 7 + cheer * 16)) * (1.5 + wave * 5 + cheer * 10) - scare * 10 + sad * 18 + sleep * 10 })
    const sink = sleep * 42 + sad * 8
    set('hull', { y: sink })
    const walk = Math.sin(pose.t * 11) * wave
    const fold = lerp(1, 0.55, sleep)
    set('legNear', { ox: 146, oy: 356, r: walk * 15, sy: fold, y: sink })
    set('legFar', { ox: 212, oy: 356, r: -walk * 15, sy: fold, y: sink })
  }
}
