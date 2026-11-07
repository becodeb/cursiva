// The Pulpito: the geometry and paper palette the user approved in the
// `experiments/code-art-styles` prototype.
import { ell, lerp, rad, spine, tubePath } from '../geometry'
import { PAPER_INK, type DynamicPath, type RigBuilder, type RigUpdate } from '../rig'
import type { Pose } from '../actor'
import { browPath, mouthPath } from './face'

export const PULPO_PALETTE = {
  ink: PAPER_INK,
  paper: '#ffffff',
  body: '#f7682c',
  shade: '#d04a17',
  cream: '#f8e8bf',
  creamD: '#e3cd97',
  goldD: '#d9951c',
  green: '#3e9a7f',
  greenD: '#14534b',
  blue: '#a7e0da',
  gold: '#f4b638',
  pink: '#ffa68c',
} as const

const armWidth = (s: number): number => lerp(21, 8.5, Math.pow(s, 0.85))

/** The arm that carries things: the lens is placed from this same spine. */
function holdingSpine(pose: Pose) {
  const raise = Math.max(pose.a.cheer, 0)
  return spine({
    x: 234,
    y: 206,
    a: rad(2 - raise * 34),
    L: 136,
    n: 30,
    tipCurl: -3.7,
    sway: 0.14 + raise * 0.3,
    t: pose.t * (1.4 + raise * 4),
    ph: 0.6,
  })
}

type ArmDef = readonly [x: number, y: number, heading: number, length: number, tipCurl: number, phase: number, colour: string]

/** Drawn back to front. */
const ARM_PAIRS: readonly ArmDef[] = [
  [222, 268, 56, 172, 3.3, 3.6, 'shade'],
  [228, 250, 30, 146, 3.9, 2.0, 'body'],
  [209, 280, 84, 134, 2.8, 0.9, 'body'],
]

function pairedArm([x, y, heading, L, curl, ph]: ArmDef, sign: 1 | -1): DynamicPath {
  return (pose) =>
    tubePath(
      spine({
        x: sign < 0 ? x : 400 - x,
        y,
        a: rad((sign < 0 ? heading : 180 - heading) + sign * pose.a.cheer * 24),
        L,
        n: 30,
        tipCurl: sign * curl,
        sway: 0.16,
        t: pose.t * 1.5,
        ph: ph + (sign < 0 ? 0 : 1.3),
      }),
      armWidth,
    )
}

const greetingArm: DynamicPath = (pose) => {
  const wave = pose.a.wave
  const raise = Math.max(wave, pose.a.cheer)
  return tubePath(
    spine({
      x: 166,
      y: 206,
      a: rad(166 + raise * 12),
      L: 196,
      n: 30,
      bend: 0.75,
      tipCurl: 2.9,
      sway: 0.14 + wave * 0.55,
      t: pose.t * (1.4 + wave * 6.4),
      ph: 2.4,
    }),
    armWidth,
  )
}

const holdingArm: DynamicPath = (pose) => tubePath(holdingSpine(pose), armWidth)

export function drawPulpo(p: RigBuilder): RigUpdate {
  const arms: { d: DynamicPath; c: string }[] = ARM_PAIRS.flatMap((def) => [
    { d: pairedArm(def, -1), c: def[6] },
    { d: pairedArm(def, 1), c: def[6] },
  ])
  arms.splice(4, 0, { d: holdingArm, c: 'body' }, { d: greetingArm, c: 'body' })
  for (const arm of arms) p.cluster([arm])
  p.cluster([{ d: ell(200, 238, 50, 46), c: 'body' }])

  p.cluster([
    { d: 'M164 206L178 206L176 176L160 180Z', c: 'green', part: 'apron' },
    { d: 'M236 206L222 206L224 176L240 180Z', c: 'green', part: 'apron' },
    { d: 'M160 204L240 204C242 230 250 262 260 290C226 300 174 300 140 290C150 262 158 230 160 204Z', c: 'cream', part: 'apron' },
  ])
  p.flat('M174 236L226 236C230 236 232 238 232 242L229 264C227 272 173 272 171 264L168 242C168 238 170 236 174 236Z', 'green', { part: 'apron' })
  p.line('M176 246C190 249 210 249 224 246', { part: 'apron', w: 4, c: 'greenD' })
  p.flat(ell(170, 216, 6), 'gold', { part: 'apron' })
  p.flat(ell(230, 216, 6), 'gold', { part: 'apron' })

  p.cluster([{ d: 'M200 26C252 26 284 66 284 112C284 156 248 200 200 200C152 200 116 156 116 112C116 66 148 26 200 26Z', c: 'body', part: 'head' }])
  p.flat(ell(146, 154, 14, 9), 'pink', { part: 'head' })
  p.flat(ell(254, 154, 14, 9), 'pink', { part: 'head' })
  p.eye('eyeL', 166, 124, 23, { part: 'head', ry: 25 })
  p.eye('eyeR', 234, 124, 23, { part: 'head', ry: 25 })
  p.line(browPath(144, 98, 180, 94), { part: 'head/brows', w: 8 })
  p.line(browPath(256, 98, 220, 94), { part: 'head/brows', w: 8 })
  p.mouth(mouthPath(200, 162, 15), { part: 'head' })

  // Accessories are ordinary parts: `Puppet` leaves out the ones switched off.
  p.cluster([
    { d: 'M126 78C118 -8 282 -8 274 78C240 66 160 66 126 78Z', c: 'cream', part: 'head/cap' },
    { d: ell(200, 13, 8, 6), c: 'green', part: 'head/cap' },
  ])
  p.line('M186 21C166 30 152 48 148 68', { part: 'head/cap', w: 5, c: 'creamD' })
  p.line('M214 21C234 30 248 48 252 68', { part: 'head/cap', w: 5, c: 'creamD' })
  p.flat(ell(200, 50, 10, 8.5), 'greenD', { part: 'head/cap' })
  for (const [x, y] of [[184, 41], [194, 33], [206, 33], [216, 41]]) p.flat(ell(x, y, 4.2, 5), 'greenD', { part: 'head/cap' })
  p.cluster([{ d: 'M112 72C150 52 250 52 288 72C300 80 296 96 282 92C240 78 160 78 118 92C104 96 100 80 112 72Z', c: 'green', part: 'head/cap' }])

  p.cluster([
    { d: 'M-8 12L8 12L10 74C10 84 -10 84 -10 74Z', c: 'gold', part: 'lens' },
    { d: ell(0, -22, 42), c: 'gold', part: 'lens' },
  ])
  p.cluster([{ d: ell(0, -22, 29), c: 'blue', part: 'lens' }])
  p.line('M-15 -32Q-11 -41 -2 -41', { part: 'lens', w: 7, c: '#ffffff' })

  p.cluster([
    { d: 'M200 202L160 182C152 178 146 184 146 192L146 218C146 226 154 228 162 224Z', c: 'gold', part: 'bow' },
    { d: 'M200 202L240 182C248 178 254 184 254 192L254 218C254 226 246 228 238 224Z', c: 'gold', part: 'bow' },
    { d: ell(200, 202, 13, 12), c: 'goldD', part: 'bow' },
  ])

  return (pose, set) => {
    set('head', {
      ox: 200,
      oy: 196,
      r: pose.look[0] * 3.5 + Math.sin(pose.t * 7.5) * 3 * pose.a.cheer,
      y: pose.a.sad * 8 + pose.a.sleep * 7 + pose.breath * 1.5,
    })
    set('cap', { ox: 200, oy: 80, y: -pose.hop * 12 * pose.a.cheer - pose.a.scare * 16, r: pose.a.sad * -6 })
    set('apron', { ox: 200, oy: 206, r: Math.sin(pose.t * 2.3) * 1.2 })
    const hand = holdingSpine(pose)[20]
    set('lens', { x: hand[0], y: hand[1] - 40, ox: 0, oy: 40, r: 24 })
  }
}
