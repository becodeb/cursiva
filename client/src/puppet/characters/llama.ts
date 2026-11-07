// The llama: the long neck is the whole character. It is one tube that stretches
// with a fright and droops with sadness, and the head rides its tip; the ears talk.
import { ell, rad, spine, tubePath, type Vec } from '../geometry'
import { PAPER_INK, type DynamicPath, type RigBuilder, type RigUpdate } from '../rig'
import type { Pose } from '../actor'
import { browPath, mouthPath } from './face'
import { blob, cloud, widthProfile } from './shapes'

export const LLAMA_PALETTE = {
  ink: PAPER_INK,
  wool: '#e8dabf',
  woolL: '#f6eeda',
  woolD: '#c9b797',
  muzzle: '#fdf9f0',
  hoof: '#3a3232',
  pink: '#f4a79a',
  blanket: '#e0583c',
  blanketD: '#2f938d',
} as const

const neckBase = widthProfile([[0, 60], [0.4, 41], [1, 37]])
/** Little bumps down both sides: fleece, with one tube and no extra pieces. */
const neckWidth = (s: number): number => neckBase(s) + 3.4 * Math.abs(Math.sin(s * Math.PI * 4.5))
const sinkOf = (pose: Pose): number => pose.a.sleep * 44 + pose.a.sad * 8

/** The neck's centre line, from inside the chest up to the skull. */
function neckSpine(pose: Pose): Vec[] {
  const { wave, cheer, scare, sad, sleep } = pose.a
  const lean = sad * 16 + sleep * 30 - scare * 8 + Math.sin(pose.t * 1.6) * 1 + Math.sin(pose.t * 7.5) * 6 * cheer + Math.sin(pose.t * 6) * 4 * wave
  return spine({ x: 186, y: 272 + sinkOf(pose), a: rad(-78 + lean), L: 172 * (1 + scare * 0.12), n: 28, bend: rad(-6 + sad * 34 + sleep * 54) })
}

const neck: DynamicPath = (pose) => tubePath(neckSpine(pose), neckWidth)

const leg = (x: number, c: string, part: string) => [
  { d: `M${x - 19} 300L${x + 19} 300L${x + 13} 418L${x - 13} 418Z`, c, part },
  { d: `M${x - 14} 414L${x + 14} 414C${x + 28} 420 ${x + 34} 436 ${x + 26} 442L${x - 8} 442C${x - 18} 442 ${x - 20} 424 ${x - 14} 414Z`, c: 'hoof', part },
]

export function drawLlama(p: RigBuilder): RigUpdate {
  p.cluster(leg(92, 'woolD', 'legFarB'))
  p.cluster(leg(216, 'woolD', 'legFarF'))
  p.cluster(cloud(22, 246, 8, 14, 5, 20, 'wool', 'tail', 0.2))
  p.cluster(leg(48, 'wool', 'legB'))
  p.cluster(leg(172, 'wool', 'legF'))

  p.cluster([
    { d: neck, c: 'wool' },
    ...cloud(128, 288, 92, 42, 15, 25, 'wool', 'trunk', 0.1),
  ])
  p.flat(blob([62, 330], [120, 312], [190, 312], [176, 340], [110, 350]), 'woolL', { part: 'trunk' })
  p.cluster([{ d: 'M56 232C86 222 124 222 148 230L156 292C122 302 80 302 46 292Z', c: 'blanket', part: 'trunk' }])
  p.flat('M49 276C82 286 122 286 154 277L156 292C122 302 80 302 46 292Z', 'blanketD', { part: 'trunk' })

  // The head is drawn around its own origin and rides the neck's tip.
  p.cluster([{ d: blob([-48, -24], [-58, -74], [-46, -112], [-30, -74], [-22, -22]), c: 'woolD', part: 'skull/earFar' }])
  p.cluster([{ d: blob([-18, -24], [-28, -78], [-14, -118], [2, -78], [8, -22]), c: 'wool', part: 'skull/ear' }])
  p.flat(blob([-11, -34], [-17, -76], [-11, -100], [-3, -74], [-1, -34]), 'pink', { part: 'skull/ear' })
  p.cluster(cloud(-6, -36, 20, 6, 6, 13, 'wool', 'skull', 0.3))
  p.cluster([{ d: blob([-46, -16], [-8, -40], [34, -30], [72, -22], [92, 0], [78, 26], [36, 34], [-14, 36], [-44, 18]), c: 'wool', part: 'skull' }])
  p.flat(blob([40, -8], [76, -20], [92, 0], [78, 26], [42, 28]), 'muzzle', { part: 'skull' })
  p.flat(ell(82, -4, 7, 5), 'ink', { part: 'skull' })
  p.mouth(mouthPath(66, 14, 11), { part: 'skull', w: 5 })
  p.flat(ell(-16, 20, 12, 7), 'pink', { part: 'skull' })
  p.eye('eye', 8, -6, 18, { part: 'skull', ry: 21 })
  p.line(browPath(-14, -30, 28, -36), { part: 'skull/brow', w: 7 })

  return (pose, set) => {
    const { wave, cheer, scare, sad, sleep } = pose.a
    const tip = neckSpine(pose)[28]
    set('skull', {
      x: tip[0],
      y: tip[1],
      r: pose.look[0] * 4 + Math.sin(pose.t * 2) + Math.sin(pose.t * 7.5) * 5 * cheer + sad * 26 + sleep * 40 - scare * 6,
    })
    const flick = Math.sin(pose.t * 14) * 14 * cheer + Math.sin(pose.t * 9) * 5 * wave
    set('ear', { ox: -6, oy: -26, r: flick - sad * 44 - sleep * 52 + scare * 22 })
    set('earFar', { ox: -36, oy: -24, r: -flick - sad * 40 - sleep * 50 + scare * 26 })
    set('brow', { y: -scare * 4 })
    set('trunk', { y: sinkOf(pose), ox: 130, oy: 290, r: scare * -3 })
    set('tail', { ox: 40, oy: 262, y: sinkOf(pose), r: Math.sin(pose.t * (3 + wave * 8 + cheer * 16)) * (3 + wave * 14 + cheer * 24) + sad * -28 })
    const walk = Math.sin(pose.t * 10) * wave
    const fold = 1 - sleep * 0.3
    const stand = (name: string, x: number, sign: 1 | -1): void => set(name, { ox: x, oy: 442, sy: fold, r: walk * 12 * sign + scare * (x < 130 ? 6 : -6) })
    stand('legF', 172, 1)
    stand('legFarB', 92, 1)
    stand('legFarF', 216, -1)
    stand('legB', 48, -1)
  }
}
