// The duck: the geometry and paper palette the user approved in the
// `experiments/code-art-styles` prototype.
import { ell, fmt, lerp } from '../geometry'
import { PAPER_INK, type RigBuilder, type RigUpdate } from '../rig'

export const PATO_PALETTE = {
  ink: PAPER_INK,
  paper: '#ffffff',
  body: '#fbcd2f',
  shade: '#f2a91f',
  light: '#fde27a',
  beak: '#f47a2a',
  beakD: '#d85c1b',
  mouthIn: '#8d2c17',
  pink: '#f9a98a',
} as const

const foot = (x: number): string =>
  `M${x - 10} 360C${x - 22} 370 ${x - 30} 382 ${x - 28} 390C${x - 24} 396 ${x - 16} 392 ${x - 10} 388C${x - 4} 396 ${x + 8} 398 ${x + 14} 392C${x + 20} 398 ${x + 34} 400 ${x + 42} 394C${x + 48} 388 ${x + 40} 380 ${x + 30} 376C${x + 20} 370 ${x + 10} 364 ${x + 10} 360Z`
const leg = (x: number): string => `M${x - 10} 322L${x + 10} 322L${x + 10} 366L${x - 10} 366Z`

export function drawPato(p: RigBuilder): RigUpdate {
  p.cluster([{ d: leg(142), c: 'beakD', part: 'footL' }, { d: foot(142), c: 'beakD', part: 'footL' }])
  p.cluster([{ d: leg(206), c: 'beak', part: 'footR' }, { d: foot(206), c: 'beak', part: 'footR' }])

  // The bill grows out of the head: drawn behind, and the face covers its base.
  p.flat('M292 120C318 134 346 128 358 116L342 148L300 152Z', 'mouthIn', { part: 'head' })
  p.cluster([{ d: 'M288 124C312 134 338 132 352 124C358 140 334 158 308 154C296 150 286 138 288 124Z', c: 'beakD', part: 'head/beakLow' }])
  p.cluster([{ d: 'M294 84C316 80 332 96 354 94C376 90 388 102 378 116C356 134 318 134 288 128Z', c: 'beak', part: 'head/beakUp' }])

  p.cluster([
    {
      d: 'M186 150C186 170 192 184 200 190C172 196 140 206 116 212C98 214 86 192 68 168C58 182 56 200 64 218C52 216 42 220 34 228C42 240 52 248 66 254C74 294 118 336 184 338C252 340 306 302 306 248C306 216 282 186 258 168L258 150Z',
      c: 'body',
      part: 'tail',
    },
  ])
  p.flat('M306 248C306 302 252 340 184 338C150 337 122 326 100 306C150 322 230 316 268 276C284 258 296 240 300 222C304 230 306 240 306 248Z', 'light', { part: 'tail' })
  p.cluster([
    { d: 'M200 38C188 28 186 18 190 8C200 14 210 22 218 30Z', c: 'body', part: 'head' },
    { d: 'M214 30C206 14 212 2 224 -4C224 8 230 16 238 24Z', c: 'body', part: 'head' },
    { d: 'M232 26C232 10 242 2 256 0C252 12 252 20 252 28Z', c: 'body', part: 'head' },
    { d: ell(236, 100, 80, 76), c: 'body', part: 'head' },
  ])
  p.flat(ell(216, 132, 15, 10), 'pink', { part: 'head' })
  p.eye('eye', 266, 84, 21, { part: 'head', ry: 26 })
  p.line((pose) => `M244 46Q260 ${fmt(lerp(32, 44, pose.a.scare))} 280 42`, { part: 'head/brow', w: 7 })
  p.cluster([
    {
      d: 'M238 214C200 204 150 206 102 222C82 232 92 254 124 246C100 262 108 284 140 270C124 290 142 306 170 288C210 290 244 266 248 232C249 222 246 216 238 214Z',
      c: 'shade',
      part: 'wing',
    },
  ])

  return (pose, set) => {
    const stepping = pose.a.wave
    set('head', {
      ox: 236,
      oy: 165,
      r: pose.look[0] * 3 + Math.sin(pose.t * 2) * 1.5 - pose.a.cheer * 6 + pose.a.sad * 12 + pose.a.sleep * 14,
      y: pose.a.sad * 6,
    })
    set('brow', { y: -pose.a.scare * 10 - pose.a.cheer * 5 + pose.a.sad * 3 + pose.a.sleep * 6, ox: 262, oy: 42, r: -pose.a.sad * 16 })
    set('beakUp', { ox: 298, oy: 108, r: -pose.open * 10 })
    set('beakLow', { ox: 298, oy: 128, r: 9 + pose.open * 20 - pose.a.sad * 9 })
    const flap = Math.sin(pose.t * (2 + pose.a.cheer * 22 + stepping * 16))
    set('wing', { ox: 236, oy: 224, r: flap * (1.5 + pose.a.cheer * 30 + stepping * 12) + pose.a.sad * -5 })
    set('tail', { ox: 190, oy: 300, r: Math.sin(pose.t * (2.5 + stepping * 6)) * (0.8 + stepping * 1.6) })
    const walk = Math.sin(pose.t * 11) * stepping
    set('footL', { ox: 142, oy: 322, r: walk * 18 })
    set('footR', { ox: 206, oy: 322, r: -walk * 18 })
  }
}
