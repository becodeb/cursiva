// The game's furniture in paper: speech bubbles, round buttons, the star, the signs and
// the things in the backpack. Each is a tiny scene with no actor and nothing on the
// ticker, standing in the PNG's own box through the same seam as every other prop, so a
// tap size, a measured tail or a text area keeps meaning what it meant.
//
// A control is a small object, not a glyph on a disc: an arrow sign, a speaker, a pencil.
// A piece is told apart from its background by its shadow, never by a black outline
// (`docs/09`). `puppet/PaperButton.tsx` lifts each one off its shadow so a press can push
// it back down.
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
import { ell, tubePath, type Vec } from './geometry'
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

/** A polygon with the corners a pair of scissors rounds off: kinder to a small hand than
 *  a point, and it still reads as the same shape at 52 px. */
function softPoly(points: readonly Vec[], radius: number): string {
  let d = ''
  points.forEach((v, i) => {
    const prev = points[(i - 1 + points.length) % points.length]
    const next = points[(i + 1) % points.length]
    const toward = (to: Vec): Vec => {
      const k = Math.min(radius / Math.hypot(to[0] - v[0], to[1] - v[1]), 0.5)
      return [v[0] + (to[0] - v[0]) * k, v[1] + (to[1] - v[1]) * k]
    }
    const a = toward(prev)
    const b = toward(next)
    d += `${i === 0 ? 'M' : 'L'}${a[0].toFixed(1)} ${a[1].toFixed(1)}C${v[0]} ${v[1]} ${v[0]} ${v[1]} ${b[0].toFixed(1)} ${b[1].toFixed(1)}`
  })
  return `${d}Z`
}

// One family of small objects, in the wood and the paper the enclosure signs are cut from.
// Secondary controls are quiet furniture: cream and wood, no colour that shouts. The one
// primary action is the only warm gold thing on a screen (`GO_ARROW`).
const WOOD = '#dba565'
const WOOD_LIGHT = '#ecc78e'
const WOOD_DARK = '#9c6a36'
const CREAM = '#fff0cf'
const CREAM_SHADE = '#e6d3a6'

/** The way out, everywhere: a wooden arrow on its post. The same object goes back from a
 *  level and closes the notebook and the wardrobe, so there is one thing to learn. */
const ARROW_SIGN = sheet(
  [
    {
      pieces: [
        { d: poly([104, 118], [130, 116], [132, 196], [106, 196]), c: WOOD_DARK },
        { d: softPoly([[10, 78], [78, 14], [80, 46], [188, 40], [192, 116], [80, 122], [78, 150]], 11), c: WOOD },
      ],
    },
    {
      pieces: [
        { d: poly([78, 58], [178, 52], [179, 64], [78, 70]), c: WOOD_LIGHT },
        { d: poly([80, 92], [180, 86], [181, 94], [80, 100]), c: '#c8914f' },
        { d: ell(168, 76, 6.5, 6.5), c: WOOD_DARK },
      ],
      flat: true,
    },
  ],
  61,
)

const SPEAKER_BODY: readonly SceneLayer[] = [
  {
    pieces: [
      { d: softPoly([[12, 72], [58, 72], [58, 132], [12, 132]], 8), c: WOOD },
      { d: softPoly([[52, 74], [116, 22], [116, 182], [52, 130]], 8), c: CREAM },
    ],
  },
  {
    pieces: [
      { d: ell(113, 102, 11, 62), c: CREAM_SHADE },
      { d: poly([22, 92], [46, 92], [46, 112], [22, 112]), c: WOOD_LIGHT },
    ],
    flat: true,
  },
]

/** A paper speaker with its two waves cut out too, each a piece of its own. */
const SPEAKER_ON = sheet(
  [...SPEAKER_BODY, { pieces: [{ d: arcBand(116, 102, 42, 15, -46, 46), c: WOOD }, { d: arcBand(116, 102, 70, 15, -42, 42), c: WOOD }] }],
  73,
)

/** The same speaker with a strip of paper taped over where the waves were. No red: this
 *  game does not scold (`docs/25`). */
const SPEAKER_OFF = sheet(
  [
    ...SPEAKER_BODY.map((layer) => ({ ...layer, pieces: layer.pieces.map((p) => ({ d: p.d, c: p.c === CREAM ? '#e8e2d2' : p.c === WOOD ? '#b9ad96' : p.c })) })),
    { pieces: [{ d: bar([128, 66], [188, 138], 20), c: '#8d8675' }, { d: bar([188, 66], [128, 138], 20), c: '#8d8675' }] },
  ],
  75,
)

const ARM = '#f2743a'
const ARM_PALE = '#ffc9a3'

/** "Show me again": a little sheet with the line dotted on it and the Pulpito's arm still
 *  drawing it, which is exactly what the demo is. Not a play triangle: nothing here is a
 *  video. The sheet is what lets the dots read on a busy place. */
const SHOW_AGAIN = (() => {
  const dots: Vec[] = Array.from({ length: 9 }, (_, i): Vec => [38 + i * 13, 92 + Math.sin((i / 8) * Math.PI * 2) * 34])
  const tip = dots[dots.length - 1]
  const arm: Vec[] = [[198, 196], [182, 172], [162, 152], [146, 128], [tip[0] + 6, tip[1] + 10]]
  const cups: Vec[] = [[176, 168], [158, 146], [146, 126]]
  return sheet(
    [
      { pieces: [{ d: softPoly([[18, 26], [176, 14], [188, 168], [26, 182]], 8), c: '#fff8e6' }] },
      { pieces: [{ d: poly([150, 15], [176, 14], [177, 40]), c: CREAM_SHADE }, ...dots.slice(0, -1).map(([x, y]): ScenePiece => ({ d: ell(x, y, 7.5, 7.5), c: '#b97a3e' }))], flat: true },
      { pieces: [{ d: tubePath(arm, (u) => 26 - u * 12), c: ARM }, { d: ell(tip[0] + 6, tip[1] + 10, 13, 13), c: ARM }] },
      { pieces: cups.map(([x, y], i): ScenePiece => ({ d: ell(x, y, 7.5 - i, 7.5 - i), c: ARM_PALE })), flat: true },
    ],
    65,
  )
})()

/** The one big thing to press: a chunky gold arrow on a darker sheet, with a lighter strip
 *  glued along its top. Every screen has at most one of these. */
const GO_ARROW = sheet(
  [
    { pieces: [{ d: softPoly([[12, 62], [96, 56], [96, 10], [192, 100], [96, 190], [96, 144], [12, 138]], 14), c: '#e58a24' }] },
    { pieces: [{ d: softPoly([[20, 62], [102, 56], [102, 22], [180, 94], [102, 166], [102, 132], [20, 130]], 12), c: BUTTON_GOLD }], flat: true },
    { pieces: [{ d: softPoly([[28, 68], [106, 62], [106, 40], [146, 76], [32, 88]], 8), c: '#ffdf7e' }], flat: true },
  ],
  63,
)

const PENCIL = sheet(
  [
    { pieces: [{ d: softPoly([[150, 16], [188, 54], [62, 178], [18, 186], [26, 142]], 6), c: '#f4c34d' }] },
    {
      pieces: [
        { d: poly([26, 142], [62, 178], [18, 186]), c: '#f6dfb4' },
        { d: poly([22, 166], [36, 180], [18, 186]), c: CHROME_INK },
        { d: poly([150, 16], [188, 54], [166, 76], [128, 38]), c: '#e9825f' },
        { d: poly([128, 38], [166, 76], [156, 86], [118, 48]), c: '#cfd6da' },
        { d: poly([104, 72], [120, 88], [58, 150], [42, 134]), c: '#e2ab35' },
      ],
      flat: true,
    },
  ],
  71,
)

const PAW = sheet(
  [
    { pieces: [{ d: ell(100, 128, 52, 44), c: WOOD }, { d: ell(42, 72, 24, 28), c: WOOD }, { d: ell(100, 46, 25, 30), c: WOOD }, { d: ell(158, 72, 24, 28), c: WOOD }] },
    { pieces: [{ d: ell(100, 136, 28, 20), c: WOOD_LIGHT }], flat: true },
  ],
  77,
)

/** The Pulpito's head in any colour he comes in: the wardrobe's swatches and the map's
 *  way into the wardrobe. Cut once per colour. */
const heads = new Map<string, CutScene>()
export function pulpitoHead(body: string, pink: string): CutScene {
  const key = `${body}${pink}`
  let cut = heads.get(key)
  if (!cut) {
    cut = sheet(
      [
        { pieces: [{ d: ell(100, 112, 84, 78), c: body }] },
        {
          pieces: [
            { d: ell(40, 136, 14, 9), c: pink },
            { d: ell(160, 136, 14, 9), c: pink },
            { d: ell(72, 104, 21, 24), c: '#ffffff' },
            { d: ell(128, 104, 21, 24), c: '#ffffff' },
            { d: ell(74, 107, 14, 17), c: '#1a2226' },
            { d: ell(126, 107, 14, 17), c: '#1a2226' },
            { d: ell(79, 100, 4.5, 4.5), c: '#ffffff' },
            { d: ell(131, 100, 4.5, 4.5), c: '#ffffff' },
            { d: `M78 150C88 164 112 164 122 150L116 146C108 154 92 154 84 146Z`, c: '#1a2226' },
          ],
          flat: true,
        },
        { pieces: [{ d: `M28 70C36 8 164 8 172 70Z`, c: '#f3e6c4' }] },
        { pieces: [{ d: poly([24, 58], [176, 58], [180, 76], [20, 76]), c: '#2f8f6f' }], flat: true },
      ],
      91,
    )
    heads.set(key, cut)
  }
  return cut
}

/** Named cuts with no registry picture of their own. */
export const PAPER_ICONS = { pencil: PENCIL, paw: PAW } as const

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
  [UI_BUTTON_ART.back.href, ARROW_SIGN],
  [UI_BUTTON_ART.close.href, ARROW_SIGN],
  [UI_BUTTON_ART.next.href, GO_ARROW],
  [UI_BUTTON_ART.replay.href, SHOW_AGAIN],
  [UI_BUTTON_ART.retry.href, SHOW_AGAIN],
  [UI_BUTTON_ART.notebook.href, PENCIL],
  [UI_BUTTON_ART.sound.href, SPEAKER_ON],
  [UI_BUTTON_ART.soundOff.href, SPEAKER_OFF],
])
