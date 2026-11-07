// The game's furniture in paper: speech bubbles, round buttons, the star, the signs and
// the things in the backpack. Each is a tiny scene with no actor and nothing on the
// ticker, standing in the PNG's own box through the same seam as every other prop, so a
// tap size, a measured tail or a text area keeps meaning what it meant.
//
// Everything a child must read at a glance sits dark on light: glyphs are `CHROME_INK`
// on a pale disc, and a piece is told apart from its background by its shadow, never by
// a black outline (`docs/09`).
import {
  ANDEAN_HAT_ART,
  CART_ART,
  SIGN_ART,
  UI_BUTTON_ART,
  ZOO_BACKPACK_ART,
  ZOO_SPEECH_BUBBLE_ART,
  ZOO_SPEECH_BUBBLE_LEFT_ART,
  ZOO_STAR_ART,
} from '../detective/assets'
import { ell, type Vec } from './geometry'
import { cutScene, poly, type CutScene, type SceneLayer, type ScenePiece } from './scene/engine'

const SHEET = 200

/** Far past 7:1 on `BUTTON_PAPER` and on the bubble (`chrome.test.ts`). */
export const CHROME_INK = '#22303a'
export const BUTTON_PAPER = '#fff4d8'
export const BUTTON_GOLD = '#f6c23a'
export const BUBBLE_PAPER = '#fffdf6'
export const BUBBLE_EDGE = '#efe3c8'

const sheet = (layers: readonly SceneLayer[], seed: number, w = SHEET, h = SHEET, grain = 0.14): CutScene =>
  cutScene({ w, h, base: 'none', layers, grain }, seed)

const ROUND = ell(100, 100, 94, 94)

/** A band of a circle, angles in degrees: the shape a round arrow or a sound wave is. */
function arcBand(cx: number, cy: number, r: number, width: number, from: number, to: number): string {
  const steps = Math.max(6, Math.ceil(Math.abs(to - from) / 12))
  const at = (radius: number, deg: number): Vec => {
    const a = (deg * Math.PI) / 180
    return [cx + Math.cos(a) * radius, cy + Math.sin(a) * radius]
  }
  const out: Vec[] = []
  for (let i = 0; i <= steps; i++) out.push(at(r + width / 2, from + ((to - from) * i) / steps))
  for (let i = steps; i >= 0; i--) out.push(at(r - width / 2, from + ((to - from) * i) / steps))
  return poly(...out)
}

/** A straight bar with square ends, from `a` to `b`. */
function bar(a: Vec, b: Vec, width: number): string {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const k = width / 2 / Math.hypot(dx, dy)
  const nx = -dy * k
  const ny = dx * k
  return poly([a[0] + nx, a[1] + ny], [b[0] + nx, b[1] + ny], [b[0] - nx, b[1] - ny], [a[0] - nx, a[1] - ny])
}

const button = (face: string, glyph: readonly ScenePiece[], seed: number): CutScene =>
  sheet([{ pieces: [{ d: ROUND, c: face }] }, { pieces: glyph, flat: true }], seed)

const ink = (d: string): ScenePiece => ({ d, c: CHROME_INK })

const SPEAKER = poly([46, 82], [72, 82], [106, 54], [106, 146], [72, 118], [46, 118])

/** The bubble's own outline, drawn on the measured curve of the picture it replaces: its
 *  oval holds the measured text area and its tail ends on the measured tip. */
export function bubbleOutline(w: number, h: number, tipX: number, tipY: number, inset = 1): string {
  const kx = w / 496
  const ky = h / 373
  const cx = w / 2
  const cy = h * 0.43
  const p = (x: number, y: number): string => {
    const px = x * kx
    const py = y * ky
    return `${(cx + (px - cx) * inset).toFixed(1)} ${(cy + (py - cy) * inset).toFixed(1)}`
  }
  const tx = tipX / kx
  const ty = tipY / ky
  return (
    `M${p(258, 2)}C${p(350, 0)} ${p(440, 28)} ${p(476, 88)}C${p(505, 130)} ${p(504, 210)} ${p(474, 256)}` +
    `C${p(444, 302)} ${p(350, 326)} ${p(270, 324)}C${p(225, 322)} ${p(185, 318)} ${p(152, 300)}` +
    `C${p(120, 330)} ${p(tx + 28, ty)} ${p(tx, ty)}C${p(tx - 17, ty)} ${p(tx - 19, ty - 16)} ${p(tx - 9, ty - 32)}` +
    `C${p(tx + 1, ty - 44)} ${p(66, 316)} ${p(70, 302)}C${p(30, 286)} ${p(4, 232)} ${p(2, 170)}` +
    `C${p(-2, 110)} ${p(40, 55)} ${p(110, 28)}C${p(155, 10)} ${p(205, 3)} ${p(258, 2)}Z`
  )
}

function bubble(w: number, h: number, tipX: number, tipY: number, seed: number): CutScene {
  return sheet(
    [
      { pieces: [{ d: bubbleOutline(w, h, tipX, tipY), c: BUBBLE_EDGE }] },
      { pieces: [{ d: bubbleOutline(w, h, tipX, tipY, 0.965), c: BUBBLE_PAPER }], flat: true },
    ],
    seed,
    w,
    h,
    0.32,
  )
}

/** Five soft points, the way a star is cut from a folded sheet. */
function starOutline(cx: number, cy: number, outer: number, inner: number): string {
  const points: Vec[] = []
  for (let i = 0; i < 10; i++) {
    const a = (Math.PI / 5) * i - Math.PI / 2
    const r = i % 2 === 0 ? outer : inner
    points.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r])
  }
  return poly(...points)
}

const star = sheet(
  [
    { pieces: [{ d: starOutline(100, 106, 96, 44), c: '#f6b92c' }] },
    { pieces: [{ d: starOutline(100, 106, 56, 26), c: '#ffdc72' }], flat: true },
  ],
  21,
)

/** A wooden sign: two posts, planks and a picture of who lives there. */
function sign(picture: readonly ScenePiece[], seed: number): CutScene {
  return sheet(
    [
      {
        pieces: [
          { d: poly([46, 8], [66, 8], [66, 196], [46, 196]), c: '#9c6a36' },
          { d: poly([134, 8], [154, 8], [154, 196], [134, 196]), c: '#9c6a36' },
        ],
      },
      {
        pieces: [
          { d: poly([12, 26], [188, 22], [192, 74], [10, 78]), c: '#d9a35e' },
          { d: poly([8, 76], [192, 72], [188, 126], [12, 130]), c: '#cf9650' },
          { d: poly([12, 128], [188, 124], [190, 166], [10, 170]), c: '#d9a35e' },
        ],
      },
      { pieces: picture, flat: true },
    ],
    seed,
  )
}

const FISH: readonly ScenePiece[] = [
  { d: poly([34, 96], [66, 62], [66, 132]), c: '#e8701f' },
  { d: ell(112, 97, 58, 40), c: '#f58a2a' },
  { d: poly([104, 62], [132, 42], [136, 66]), c: '#e8701f' },
  { d: ell(140, 86, 12, 12), c: '#ffffff' },
  { d: ell(143, 87, 6.5, 6.5), c: CHROME_INK },
]

const TURTLE: readonly ScenePiece[] = [
  { d: ell(154, 112, 20, 16), c: '#8cbf58' },
  { d: ell(54, 136, 16, 11), c: '#8cbf58' },
  { d: ell(120, 140, 16, 11), c: '#8cbf58' },
  { d: `M34 122C36 76 70 56 96 56C124 56 152 78 154 122Z`, c: '#4f8a3c' },
  { d: ell(94, 94, 22, 18), c: '#79b254' },
  { d: ell(160, 106, 5, 5), c: CHROME_INK },
]

const MONKEY: readonly ScenePiece[] = [
  { d: ell(58, 92, 17, 17), c: '#c58a55' },
  { d: ell(142, 92, 17, 17), c: '#c58a55' },
  { d: ell(100, 96, 46, 46), c: '#8a5a33' },
  { d: ell(100, 110, 30, 26), c: '#eec9a0' },
  { d: ell(84, 88, 9, 10), c: '#ffffff' },
  { d: ell(116, 88, 9, 10), c: '#ffffff' },
  { d: ell(84, 89, 5, 6), c: CHROME_INK },
  { d: ell(116, 89, 5, 6), c: CHROME_INK },
]

const backpack = sheet(
  [
    {
      pieces: [
        { d: `M66 42C66 8 134 8 134 42L120 44C120 26 80 26 80 44Z`, c: '#7a4a24' },
        { d: `M36 64C36 40 60 34 100 34C140 34 164 40 164 64L170 170C170 188 152 192 100 192C48 192 30 188 30 170Z`, c: '#c9743a' },
      ],
    },
    {
      pieces: [
        { d: `M40 72C60 60 140 60 160 72L156 106C130 116 70 116 44 106Z`, c: '#a95a28' },
        { d: poly([52, 128], [148, 128], [146, 176], [54, 176]), c: '#a95a28' },
        { d: ell(100, 112, 10, 10), c: '#f6c23a' },
      ],
      flat: true,
    },
  ],
  31,
)

const cart = sheet(
  [
    {
      pieces: [
        { d: bar([150, 48], [190, 22], 12), c: '#7a4a24' },
        { d: poly([12, 50], [168, 50], [150, 136], [34, 136]), c: '#c98a4a' },
        { d: ell(62, 160, 26, 26), c: '#5b6a78' },
        { d: ell(130, 160, 26, 26), c: '#5b6a78' },
      ],
    },
    {
      pieces: [
        { d: poly([26, 74], [158, 74], [156, 84], [28, 84]), c: '#a56f35' },
        { d: poly([32, 102], [152, 102], [150, 112], [34, 112]), c: '#a56f35' },
        { d: ell(62, 160, 9, 9), c: '#d6dde3' },
        { d: ell(130, 160, 9, 9), c: '#d6dde3' },
      ],
      flat: true,
    },
  ],
  33,
)

/** The andean hat: a knitted point, its stripes, ear flaps and a pompom. */
const andeanHat = sheet(
  [
    {
      pieces: [
        { d: ell(100, 24, 18, 18), c: '#f6c23a' },
        { d: `M28 126C30 62 66 34 100 34C134 34 170 62 172 126Z`, c: '#d94f4f' },
        { d: poly([28, 118], [54, 118], [50, 186], [34, 186]), c: '#2f8fa8' },
        { d: poly([146, 118], [172, 118], [166, 186], [150, 186]), c: '#2f8fa8' },
      ],
    },
    {
      pieces: [
        { d: poly([30, 96], [170, 96], [172, 126], [28, 126]), c: '#f6c23a' },
        { d: poly([44, 74], [156, 74], [162, 88], [38, 88]), c: '#2f8fa8' },
        ...[52, 84, 116, 148].map((x): ScenePiece => ({ d: poly([x - 10, 124], [x, 100], [x + 10, 124]), c: '#2f8fa8' })),
      ],
      flat: true,
    },
  ],
  35,
)

/** Every piece of furniture that has its own registry picture. */
export const CHROME_PROPS: ReadonlyMap<string, CutScene> = new Map<string, CutScene>([
  [ZOO_SPEECH_BUBBLE_ART.href, bubble(ZOO_SPEECH_BUBBLE_ART.w, ZOO_SPEECH_BUBBLE_ART.h, 0.121 * ZOO_SPEECH_BUBBLE_ART.w, 0.997 * ZOO_SPEECH_BUBBLE_ART.h, 41)],
  [ZOO_SPEECH_BUBBLE_LEFT_ART.href, bubble(ZOO_SPEECH_BUBBLE_LEFT_ART.w, ZOO_SPEECH_BUBBLE_LEFT_ART.h, 57, 372, 43)],
  [ZOO_STAR_ART.href, star],
  [SIGN_ART.fish.href, sign(FISH, 51)],
  [SIGN_ART.turtles.href, sign(TURTLE, 53)],
  [SIGN_ART.monkeys.href, sign(MONKEY, 55)],
  [ZOO_BACKPACK_ART.href, backpack],
  [CART_ART.href, cart],
  [ANDEAN_HAT_ART.href, andeanHat],
  [UI_BUTTON_ART.back.href, button(BUTTON_PAPER, [ink(poly([40, 100], [104, 44], [104, 78], [160, 78], [160, 122], [104, 122], [104, 156]))], 61)],
  [UI_BUTTON_ART.next.href, button(BUTTON_GOLD, [ink(poly([160, 100], [96, 44], [96, 78], [40, 78], [40, 122], [96, 122], [96, 156]))], 63)],
  [UI_BUTTON_ART.replay.href, button(BUTTON_PAPER, [ink(poly([70, 46], [70, 154], [154, 100]))], 65)],
  [UI_BUTTON_ART.retry.href, button(BUTTON_PAPER, [ink(arcBand(100, 104, 46, 22, -40, 240)), ink(poly([116, 22], [172, 58], [112, 86]))], 67)],
  [UI_BUTTON_ART.close.href, button(BUTTON_PAPER, [ink(bar([58, 58], [142, 142], 26)), ink(bar([142, 58], [58, 142], 26))], 69)],
  [
    UI_BUTTON_ART.notebook.href,
    button(
      BUTTON_PAPER,
      [
        ink(poly([56, 40], [146, 40], [146, 160], [56, 160])),
        { d: poly([68, 54], [136, 54], [136, 148], [68, 148]), c: BUTTON_PAPER },
        ink(poly([80, 76], [124, 76], [124, 84], [80, 84])),
        ink(poly([80, 96], [124, 96], [124, 104], [80, 104])),
        ink(poly([80, 116], [110, 116], [110, 124], [80, 124])),
      ],
      71,
    ),
  ],
  [UI_BUTTON_ART.sound.href, button(BUTTON_PAPER, [ink(SPEAKER), ink(arcBand(106, 100, 30, 12, -48, 48)), ink(arcBand(106, 100, 54, 12, -48, 48))], 73)],
  // Muted reads by the marks over it, in the same ink: no red in this game (`docs/25`).
  [UI_BUTTON_ART.soundOff.href, button('#e6e2d6', [ink(SPEAKER), ink(bar([124, 78], [166, 122], 14)), ink(bar([166, 78], [124, 122], 14))], 75)],
])
