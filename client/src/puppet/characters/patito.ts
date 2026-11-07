// A duckling: the duck's colours in a chick's proportions, all head and fluff. `pose`
// picks how it stands in its three frames. Its own trick is the fuzz on its crown,
// which stands up with a fright and bounces when it is happy.
import { clamp, ell, fmt, lerp } from '../geometry'
import { PAPER_INK, type RigBuilder, type RigUpdate } from '../rig'
import { blob } from './shapes'
import { PATO_PALETTE } from './pato'

export const PATITO_PALETTE = { ...PATO_PALETTE, ink: PAPER_INK, body: '#ffd84a', shade: '#f4b92b', light: '#ffe98f' } as const

const foot = (x: number): string => `M${x - 10} 462C${x - 18} 474 ${x - 26} 486 ${x - 22} 494C${x - 12} 500 ${x - 4} 492 ${x + 2} 490C${x + 14} 500 ${x + 28} 500 ${x + 36} 494C${x + 54} 500 ${x + 72} 498 ${x + 76} 488C${x + 72} 480 ${x + 40} 472 ${x + 12} 462Z`
const leg = (x: number): string => `M${x - 12} 396L${x + 12} 396L${x + 11} 470L${x - 11} 470Z`

export function drawPatito(p: RigBuilder): RigUpdate {
  p.cluster([{ d: leg(124), c: 'beakD', part: 'footFar' }, { d: foot(124), c: 'beakD', part: 'footFar' }])
  p.cluster([{ d: leg(186), c: 'beak', part: 'footNear' }, { d: foot(186), c: 'beak', part: 'footNear' }])

  p.cluster([{ d: blob([58, 262], [10, 216], [6, 256], [22, 300], [66, 310]), c: 'body', part: 'hull' }, { d: blob([28, 300], [14, 258], [44, 262], [62, 238], [100, 226], [236, 236], [284, 306], [256, 384], [172, 416], [86, 398], [42, 358]), c: 'body', part: 'hull' }])
  p.flat(blob([266, 296], [278, 322], [254, 380], [176, 412], [112, 402], [184, 384], [240, 346]), 'light', { part: 'hull' })

  // The bill grows out of the head, drawn behind it so the head covers its base.
  p.cluster([{ d: 'M278 172C298 178 324 182 344 180C344 196 318 208 296 202C286 198 278 186 278 172Z', c: 'beakD', part: 'head/billLow' }])
  p.cluster([{ d: 'M280 134C302 134 324 146 348 146C366 148 372 160 362 168C340 182 306 182 276 176Z', c: 'beak', part: 'head/billUp' }])
  p.cluster([
    { d: blob([172, 62], [172, 36], [192, 44], [200, 14], [216, 46], [242, 36], [236, 66]), c: 'body', part: 'head/fuzz' },
  ])
  p.cluster([{ d: ell(200, 150, 100, 98), c: 'body', part: 'head' }])
  p.flat(ell(176, 188, 19, 13), 'pink', { part: 'head' })
  p.eye('eye', 244, 124, 26, { part: 'head', ry: 31 })
  p.line((pose) => `M210 ${fmt(74 - pose.a.scare * 8)}Q232 ${fmt(lerp(58, 66, pose.a.scare))} 258 66`, { part: 'head/brow', w: 7 })

  p.cluster([{ d: blob([190, 268], [130, 256], [78, 274], [66, 310], [94, 318], [98, 342], [132, 338], [152, 354], [192, 326], [208, 292]), c: 'shade', part: 'wing' }])

  return (pose, set) => {
    const { wave, cheer, scare, sad, sleep } = pose.a
    const stance = pose.state.pose ?? 0
    const lean = stance === 1 ? -3 : stance === 2 ? 3 : 0
    const walk = Math.sin(pose.t * 11) * wave + clamp(stance - 1, -1, 1) * 0.5
    set('head', {
      ox: 200,
      oy: 236,
      r: lean + pose.look[0] * 3 + Math.sin(pose.t * 2) * 1.5 - cheer * 6 + sad * 12 + sleep * 16,
      y: sad * 8 + sleep * 8,
    })
    set('fuzz', { ox: 206, oy: 66, sy: 1 + scare * 0.5 + cheer * pose.hop * 0.3, r: Math.sin(pose.t * 13) * 7 * cheer + sad * 16 })
    set('brow', { y: -cheer * 4 + sad * 2 + sleep * 5 })
    set('billUp', { ox: 282, oy: 156, r: -pose.open * 9 })
    set('billLow', { ox: 282, oy: 172, r: 8 + pose.open * 20 - sad * 8 })
    const flap = Math.sin(pose.t * (2 + cheer * 22 + wave * 16 + scare * 28))
    set('wing', { ox: 190, oy: 276, r: flap * (1.5 + cheer * 30 + wave * 12 + scare * 18) - sad * 6 })
    set('hull', { ox: 180, oy: 410, y: sleep * 22, r: lean * 0.6 + Math.sin(pose.t * (2 + wave * 6)) * wave * 1.5 })
    const fold = 1 - sleep * 0.5
    set('footFar', { ox: 124, oy: 396, r: -walk * 20 + (stance === 0 ? 20 : stance === 1 ? 8 : 0), sy: fold })
    set('footNear', { ox: 186, oy: 396, r: walk * 20 + (stance === 0 ? -22 : stance === 1 ? -8 : 0), sy: fold })
  }
}
