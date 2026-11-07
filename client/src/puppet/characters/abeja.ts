// The bee: a striped body under two wings. Its own trick is the wings: when it is
// busy they blur into ghosts of themselves, and they fold down when it sleeps.
import { ell, polyline, type Vec } from '../geometry'
import { PAPER_INK, type RigBuilder, type RigUpdate } from '../rig'
import { browPath, mouthPath } from './face'
import { blob } from './shapes'

export const ABEJA_PALETTE = {
  ink: PAPER_INK,
  body: '#fccb26',
  bodyD: '#eda70f',
  stripe: '#2a2730',
  wing: '#c9ecfb',
  wingD: '#a5d9f0',
  pink: '#fb9e7c',
} as const

const CX = 176
const CY = 278
const RX = 150
const RY = 112

/** A band across the body, cut to the body's own outline: no clip path needed. */
function stripe(x1: number, x2: number): string {
  const edge = (x: number): number => RY * Math.sqrt(Math.max(0, 1 - ((x - CX) / RX) ** 2)) * 0.995
  const top: Vec[] = []
  const low: Vec[] = []
  for (let i = 0; i <= 8; i++) {
    const x = x1 + ((x2 - x1) * i) / 8
    top.push([x, CY - edge(x)])
    low.push([x, CY + edge(x)])
  }
  return polyline([...top, ...low.reverse()], true)
}

const WING_BACK = blob([236, 214], [150, 196], [56, 150], [18, 92], [52, 46], [132, 60], [210, 128])
const WING_FRONT = blob([240, 216], [200, 138], [186, 58], [226, 12], [286, 30], [300, 110], [272, 188])

export function drawAbeja(p: RigBuilder): RigUpdate {
  p.cluster([{ d: 'M60 300L0 338L74 350C66 334 62 318 60 300Z', c: 'stripe', part: 'sting' }])
  p.flat(WING_BACK, 'rgba(201,236,251,.55)', { part: 'blurBack' })
  p.flat(WING_FRONT, 'rgba(201,236,251,.55)', { part: 'blurFront' })
  p.cluster([{ d: WING_BACK, c: 'wingD', part: 'wingBack' }])

  p.cluster([{ d: ell(CX, CY, RX, RY), c: 'body', part: 'abdomen' }])
  p.flat(stripe(58, 94), 'stripe', { part: 'abdomen' })
  p.flat(stripe(128, 170), 'stripe', { part: 'abdomen' })
  p.flat(stripe(204, 246), 'stripe', { part: 'abdomen' })
  p.cluster([{ d: WING_FRONT, c: 'wing', part: 'wingFront' }])

  p.line('M346 150C342 118 346 86 360 58', { part: 'head/antL', w: 8 })
  p.flat(ell(362, 50, 15), 'ink', { part: 'head/antL' })
  p.line('M396 164C408 136 420 120 438 108', { part: 'head/antR', w: 8 })
  p.flat(ell(442, 104, 14), 'ink', { part: 'head/antR' })
  p.cluster([{ d: ell(336, 248, 104, 100), c: 'body', part: 'head' }])
  p.flat(ell(286, 294, 18, 12), 'pink', { part: 'head' })
  p.flat(ell(404, 292, 16, 11), 'pink', { part: 'head' })
  p.eye('eyeL', 310, 236, 31, { part: 'head', ry: 35 })
  p.eye('eyeR', 382, 236, 28, { part: 'head', ry: 33 })
  p.line(browPath(280, 186, 328, 176), { part: 'head/brows', w: 8 })
  p.line(browPath(408, 188, 370, 178), { part: 'head/brows', w: 8 })
  p.mouth(mouthPath(348, 298, 24), { part: 'head' })

  return (pose, set) => {
    const { wave, cheer, scare, sad, sleep } = pose.a
    const buzz = Math.max(wave, cheer, scare)
    const flap = Math.sin(pose.t * (8 + buzz * 40))
    const open = (1 - sleep) * (1 - sad * 0.6)
    const swing = flap * (2 + buzz * 13)
    set('wingBack', { ox: 226, oy: 210, r: -sleep * 44 - sad * 28 + swing, sy: 0.6 + open * 0.4 })
    set('wingFront', { ox: 244, oy: 212, r: sleep * 46 + sad * 30 - swing, sy: 0.6 + open * 0.4 })
    set('blurBack', { ox: 226, oy: 210, r: -24, sx: Math.max(buzz, 0.001), sy: Math.max(buzz, 0.001) })
    set('blurFront', { ox: 244, oy: 212, r: 24, sx: Math.max(buzz, 0.001), sy: Math.max(buzz, 0.001) })
    set('sting', { ox: 60, oy: 330, x: scare * -14 + Math.sin(pose.t * 9) * 3 * wave, r: Math.sin(pose.t * 13) * 7 * cheer })
    // Tilted, so the stripes run across a body that dips towards the sting.
    set('abdomen', { ox: 176, oy: 278, r: -26 + Math.sin(pose.t * 3) * 1.5 + Math.sin(pose.t * 14) * 3 * cheer + sad * 8 + sleep * 8 })
    set('head', {
      ox: 300,
      oy: 330,
      r: pose.look[0] * 3 + Math.sin(pose.t * 7.5) * 4 * cheer + sad * 8 + sleep * 10 - scare * 2,
      y: sad * 8 + sleep * 8 + pose.breath,
    })
    const ant = Math.sin(pose.t * 11) * 9 * Math.max(cheer, wave) + sad * 14 + sleep * 16 - scare * 10
    set('antL', { ox: 346, oy: 156, r: -ant * 0.8 })
    set('antR', { ox: 396, oy: 168, r: ant })
    set('brows', { y: -scare * 3 })
  }
}
