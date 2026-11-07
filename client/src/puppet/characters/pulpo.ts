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

/** Worn on the back: behind the arms, its straps come over the chest further down. */
function drawBackItems(p: RigBuilder): void {
  p.aside(9000, () => {
    p.cluster([
      { d: 'M106 170C106 140 294 140 294 170L306 296C306 316 94 316 94 296Z', c: '#3c6e9e', part: 'backpack' },
      { d: ell(200, 146, 30, 18), c: '#2a4f75', part: 'backpack' },
    ])
    p.cluster([
      { d: 'M150 186C110 230 84 300 92 352C140 374 260 374 308 352C316 300 290 230 250 186Z', c: '#6d4fc2', part: 'cape' },
    ])
    p.flat('M160 216C130 256 116 300 118 340C130 348 146 352 158 354C156 300 166 250 176 214Z', '#8a6cdb', { part: 'cape' })
  })
}

/** Worn on the head, in place of the cap: never wider than the arms, so his box stays. */
function drawHeadItems(p: RigBuilder): void {
  p.aside(9200, () => {
    p.cluster([
      { d: ell(200, 24, 11), c: '#f6c23a', part: 'head/hat' },
      { d: 'M122 92C112 2 288 2 278 92C240 74 160 74 122 92Z', c: '#d9574f', part: 'head/hat' },
      { d: 'M110 84L132 80L138 148C138 160 116 160 112 148Z', c: '#2f8fa8', part: 'head/hat' },
      { d: 'M290 84L268 80L262 148C262 160 284 160 288 148Z', c: '#2f8fa8', part: 'head/hat' },
    ])
    p.flat('M124 84C160 66 240 66 276 84L278 66C240 50 160 50 122 66Z', '#f6c23a', { part: 'head/hat' })
    for (const x of [146, 174, 202, 230, 256]) p.flat(`M${x - 11} 72L${x} 54L${x + 11} 72Z`, '#2f8fa8', { part: 'head/hat' })

    p.cluster([
      { d: 'M128 86C116 4 284 4 272 86C240 70 160 70 128 86Z', c: '#fbfbf5', part: 'head/sailor' },
      { d: 'M118 88C150 66 250 66 282 88C282 100 270 100 262 96C230 84 170 84 138 96C130 100 118 100 118 88Z', c: '#2d6aa6', part: 'head/sailor' },
    ])
    p.flat(ell(200, 44, 13, 10), '#2d6aa6', { part: 'head/sailor' })

    p.cluster([
      { d: ell(200, 78, 122, 22), c: '#ecc96f', part: 'head/straw' },
      { d: 'M126 78C118 4 282 4 274 78C232 90 168 90 126 78Z', c: '#f3d98a', part: 'head/straw' },
    ])
    p.flat('M126 62C170 76 230 76 274 62L274 78C230 92 170 92 126 78Z', '#3e9a7f', { part: 'head/straw' })

    p.cluster([{ d: 'M126 92L118 28L160 60L200 14L240 60L282 28L274 92C240 76 160 76 126 92Z', c: '#f6c23a', part: 'head/crown' }])
    p.flat(ell(200, 60, 10), '#e0557d', { part: 'head/crown' })
    p.flat(ell(154, 72, 7), '#2f8fa8', { part: 'head/crown' })
    p.flat(ell(246, 72, 7), '#2f8fa8', { part: 'head/crown' })

    // A flower tucked at the side goes with whatever is on his head.
    const petals = [0, 72, 144, 216, 288].map((deg) => ({ d: ell(266 + Math.sin(rad(deg)) * 15, 86 - Math.cos(rad(deg)) * 15, 12), c: '#ffffff', part: 'head/flower' }))
    p.cluster(petals)
    p.flat(ell(266, 86, 10), '#f6c23a', { part: 'head/flower' })
  })
}

/** Worn round the neck, over everything but his chin. */
function drawNeckItems(p: RigBuilder): void {
  p.aside(9400, () => {
    p.cluster([
      { d: 'M226 206L256 212L262 280L232 284Z', c: '#d9574f', part: 'scarf' },
      { d: 'M136 190C170 206 230 206 264 190C272 206 268 222 258 228C224 240 176 240 142 228C132 222 128 206 136 190Z', c: '#e8706a', part: 'scarf' },
    ])
    p.flat('M232 240L258 240L259 252L233 254Z', '#f8e8bf', { part: 'scarf' })
    p.flat('M234 264L260 262L261 274L235 276Z', '#f8e8bf', { part: 'scarf' })

    for (const [x, y, c] of [[140, 206, '#f59a7b'], [168, 222, '#ffe8d6'], [200, 230, '#f59a7b'], [232, 222, '#ffe8d6'], [260, 206, '#f59a7b']] as const) {
      p.cluster([{ d: `M${x - 18} ${y - 2}C${x - 18} ${y - 22} ${x + 18} ${y - 22} ${x + 18} ${y - 2}L${x} ${y + 20}Z`, c, part: 'shells' }])
      p.line(`M${x} ${y - 12}L${x} ${y + 8}`, { w: 4, c: '#b56a4a', part: 'shells' })
    }
  })
}

export function drawPulpo(p: RigBuilder): RigUpdate {
  drawBackItems(p)
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

  // After the lens in the tree, but a lens stands off to his side: nothing they share.
  drawHeadItems(p)

  p.cluster([
    { d: 'M200 202L160 182C152 178 146 184 146 192L146 218C146 226 154 228 162 224Z', c: 'gold', part: 'bow' },
    { d: 'M200 202L240 182C248 178 254 184 254 192L254 218C254 226 246 228 238 224Z', c: 'gold', part: 'bow' },
    { d: ell(200, 202, 13, 12), c: 'goldD', part: 'bow' },
  ])
  drawNeckItems(p)
  p.aside(9600, () => {
    p.flat('M150 176L168 174L176 214L156 216Z', '#7a4a24', { part: 'backpack' })
    p.flat('M250 176L232 174L224 214L244 216Z', '#7a4a24', { part: 'backpack' })
  })

  return (pose, set) => {
    // Every `head` group takes this same transform: the costume has its own after the lens.
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
