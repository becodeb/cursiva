// The things in the world that are not characters: what a level has to find, dodge or
// reach. A prop never acts, so it is a tiny scene: static paper in the PNG's own box,
// with no actor and nothing on the ticker. Each stands on a 200-unit sheet.
import {
  HAZARD_STARFISH_ART,
  LAMP_ART,
  SECTOR_ADVENTURE_ART,
  ZOO_OCTOPUS_PRINT_ART,
} from '../detective/assets'
import { DRAWN_SPINE, type DrawnSpine } from '../levels/artCorridor'
import { CHROME_PROPS } from './chrome'
import { ell, tubePath, type Vec } from './geometry'
import { cutScene, poly, type CutScene, type SceneLayer, type ScenePiece } from './scene/engine'

const SHEET = 200

const prop = (layers: readonly SceneLayer[]): CutScene => cutScene({ w: SHEET, h: SHEET, base: 'none', layers, grain: 0.14 }, 3)

const smooth = (...p: readonly Vec[]): string => {
  const n = p.length
  let d = `M${p[0][0]} ${p[0][1]}`
  for (let i = 0; i < n; i++) {
    const a = p[(i - 1 + n) % n]
    const b = p[i]
    const c = p[(i + 1) % n]
    const e = p[(i + 2) % n]
    d += `C${b[0] + (c[0] - a[0]) / 6} ${b[1] + (c[1] - a[1]) / 6} ${c[0] - (e[0] - b[0]) / 6} ${c[1] - (e[1] - b[1]) / 6} ${c[0]} ${c[1]}`
  }
  return `${d}Z`
}

const stone = prop([
  { pieces: [{ d: smooth([18, 132], [36, 66], [92, 34], [152, 46], [186, 104], [172, 168], [96, 184], [32, 174]), c: '#99a0a2' }] },
  {
    pieces: [
      { d: smooth([54, 92], [86, 60], [128, 62], [112, 88], [78, 108]), c: '#b7bdbe' },
      { d: 'M120 122L140 110L150 132L134 138L140 158L128 158Z', c: '#7c8486' },
    ],
    flat: true,
  },
])

const leaf = (tilt: number, c: string, vein: string): CutScene => {
  const top: Vec = [100 + tilt, 14]
  const foot: Vec = [100 - tilt * 0.5, 174]
  return prop([
    {
      pieces: [
        { d: poly([foot[0] - 5, 196], [foot[0] + 5, 196], [foot[0] + 4, 170], [foot[0] - 4, 170]), c: vein },
        { d: smooth(top, [152 + tilt * 0.4, 62], [156, 118], [foot[0], foot[1]], [46, 122], [48 + tilt * 0.4, 62]), c },
      ],
    },
    {
      pieces: [
        { d: poly([top[0] - 2, 40], [top[0] + 2, 40], [foot[0] + 3, foot[1]], [foot[0] - 3, foot[1]]), c: vein },
        { d: poly([100, 96], [134, 72], [136, 78], [102, 106]), c: vein },
        { d: poly([100, 118], [66, 92], [64, 98], [98, 128]), c: vein },
      ],
      flat: true,
    },
  ])
}

const apple = (lean: number, c: string, shade: string, tilt = 0): CutScene =>
  prop([
    {
      pieces: [
        { d: poly([98 + tilt, 48], [108 + tilt, 48], [112 + tilt + lean, 16], [102 + tilt + lean, 14]), c: '#6b4a2e' },
        { d: smooth([112 + tilt, 40], [136 + tilt, 14], [172 + tilt, 22], [150 + tilt, 46]), c: '#5caa47' },
        { d: smooth([100, 50], [146, 36], [182, 76], [172, 138], [130, 186], [100, 176], [70, 186], [28, 138], [18, 76], [54, 36]), c },
      ],
    },
    { pieces: [{ d: smooth([46, 74], [68, 58], [62, 92], [44, 118]), c: shade }], flat: true },
  ])

const mushroom = prop([
  {
    pieces: [
      { d: smooth([70, 96], [130, 96], [136, 172], [104, 192], [64, 172]), c: '#f3e7cf' },
      { d: smooth([10, 104], [36, 42], [100, 16], [164, 42], [190, 104], [100, 124]), c: '#d9583f' },
    ],
  },
  { pieces: [{ d: ell(68, 66, 19, 15), c: '#f8e9d2' }, { d: ell(128, 54, 16, 13), c: '#f8e9d2' }, { d: ell(150, 88, 12, 10), c: '#f8e9d2' }], flat: true },
])

const flower = (petal: string, heart: string): CutScene =>
  prop([
    {
      pieces: [
        { d: poly([96, 196], [104, 196], [104, 96], [96, 96]), c: '#5a8f3a' },
        { d: smooth([100, 170], [130, 142], [160, 148], [140, 176]), c: '#6aa047' },
        ...[0, 60, 120, 180, 240, 300].map((deg): ScenePiece => {
          const a = (deg * Math.PI) / 180
          return { d: ell(100 + Math.sin(a) * 42, 74 - Math.cos(a) * 42, 27, 27), c: petal }
        }),
      ],
    },
    { pieces: [{ d: ell(100, 74, 26, 26), c: heart }], flat: true },
  ])

const hexAt = (x: number, y: number, r: number): string =>
  poly(...Array.from({ length: 6 }, (_, i): Vec => {
    const a = (Math.PI / 3) * i + Math.PI / 6
    return [x + Math.cos(a) * r, y + Math.sin(a) * r]
  }))

const honeycomb = prop([
  {
    pieces: [
      { d: smooth([100, 8], [168, 30], [194, 100], [168, 170], [100, 192], [32, 170], [6, 100], [32, 30]), c: '#e89a2a' },
    ],
  },
  {
    pieces: [
      [100, 100], [100, 52], [100, 148], [58, 76], [142, 76], [58, 124], [142, 124],
    ].map(([x, y]): ScenePiece => ({ d: hexAt(x, y, 22), c: '#ffc94d' })),
    flat: true,
  },
])

const chest = prop([
  {
    pieces: [
      { d: poly([14, 86], [186, 86], [178, 186], [22, 186]), c: '#a8703a' },
      { d: smooth([14, 90], [28, 30], [100, 14], [172, 30], [186, 90], [100, 100]), c: '#c98a4a' },
    ],
  },
  {
    pieces: [
      { d: poly([84, 76], [116, 76], [116, 122], [84, 122]), c: '#f2c64a' },
      { d: poly([40, 94], [52, 94], [50, 186], [38, 186]), c: '#8b5a2b' },
      { d: poly([148, 94], [160, 94], [162, 186], [150, 186]), c: '#8b5a2b' },
    ],
    flat: true,
  },
])

const starfish = prop([
  {
    pieces: [
      {
        d: smooth(
          ...Array.from({ length: 10 }, (_, i): Vec => {
            const a = (Math.PI / 5) * i - Math.PI / 2
            const r = i % 2 === 0 ? 92 : 40
            return [100 + Math.cos(a) * r, 104 + Math.sin(a) * r]
          }),
        ),
        c: '#f27a54',
      },
    ],
  },
  {
    pieces: [
      ell(100, 104, 12, 12),
      ...[0, 1, 2, 3, 4].map((i) => {
        const a = (Math.PI * 2 * i) / 5 - Math.PI / 2
        return ell(100 + Math.cos(a) * 42, 104 + Math.sin(a) * 42, 8, 8)
      }),
    ].map((d): ScenePiece => ({ d, c: '#ffbb9a' })),
    flat: true,
  },
])

const flashlight = prop([
  {
    pieces: [
      { d: poly([18, 76], [118, 62], [118, 138], [18, 124]), c: '#6f7e92' },
      { d: poly([116, 44], [176, 22], [176, 178], [116, 156]), c: '#f2c64a' },
    ],
  },
  { pieces: [{ d: ell(170, 100, 12, 74), c: '#fff4b8' }, { d: poly([52, 92], [96, 88], [96, 112], [52, 108]), c: '#46536a' }], flat: true },
])

const lamp = (glass: string, base: string): CutScene =>
  prop([
    {
      pieces: [
        { d: poly([76, 142], [124, 142], [132, 190], [68, 190]), c: base },
        { d: smooth([100, 10], [150, 34], [162, 82], [130, 130], [120, 150], [80, 150], [70, 130], [38, 82], [50, 34]), c: glass },
      ],
    },
  ])

const shedSkin = prop([
  {
    pieces: [
      { d: 'M6 120C30 92 58 92 78 112C96 130 118 130 136 110C152 92 176 88 196 100L194 114C176 104 158 108 144 124C122 148 92 146 70 126C54 110 34 110 14 132Z', c: '#d9cf9a' },
    ],
  },
  {
    pieces: [50, 86, 122, 158].map((x, i): ScenePiece => ({ d: ell(x, i % 2 === 0 ? 112 : 118, 7, 4), c: '#b8ab76' })),
    flat: true,
  },
])

/** An arm's print on the zoo's paths: a soft pad and two suckers, nothing like a
 *  traffic light (`docs/18` §7 P10). */
const octopusPrint = prop([
  { pieces: [{ d: `${ell(100, 124, 34, 64)}${ell(72, 34, 18, 20)}${ell(128, 38, 16, 18)}`, c: '#6b4a2e' }] },
])

/** A snake lying on its measured centre line, the one the corridor is scored on: the
 *  body is the spine the picture was measured to have, so nothing about the level moves.
 *  Its colours keep the row's measured lumas (`zoo/backdrops.ts`, `corridorArt`). */
function paperSnake(art: { w: number; h: number }, spineOf: DrawnSpine, grey: boolean): CutScene {
  const X = (u: number): number => u * art.w
  const Y = (v: number): number => v * art.h
  const half = (spineOf.thickness * art.h) / 2
  const points = spineOf.points.map(([u, v]): Vec => [X(u), Y(v)])
  const first = points[0]
  const last = points[points.length - 1]
  const tailEnd: Vec = [art.w * 0.995, last[1] + half * 0.3]
  const tail: Vec[] = [0.25, 0.5, 0.75, 1].map((t): Vec => [last[0] + (tailEnd[0] - last[0]) * t, last[1] + (tailEnd[1] - last[1]) * t * t])
  const neck: Vec = [first[0] - art.w * 0.02, first[1] - half * 0.1]
  const spinePoints = [neck, ...points, ...tail]
  const n = spinePoints.length
  const widthAt = (s: number): number => {
    const u = s * (n - 1)
    return u > n - 5 ? half * Math.max(0.22, (n - 1 - u) / 4) : half
  }
  const body = grey ? '#8f8f8f' : '#7b9b6e'
  const headFill = grey ? '#9c9c9c' : '#83a576'
  const spot = '#1a1a1a'
  const head: Vec = [art.w * 0.12, first[1] - half * 0.4]
  const headR = Math.min(art.h * 0.34, art.w * 0.105)
  const spots = points.filter((_, i) => i % 6 === 3).map((p): ScenePiece => ({ d: ell(p[0], p[1], half * 0.42, half * 0.36), c: spot }))
  return cutScene(
    {
      w: art.w,
      h: art.h,
      base: 'none',
      grain: 0.16,
      layers: [
        {
          pieces: [
            { d: tubePath(spinePoints, widthAt), c: body },
            { d: smooth([head[0] - headR, head[1]], [head[0] - headR * 0.4, head[1] - headR * 0.9], [head[0] + headR * 0.6, head[1] - headR * 0.7], [first[0] + 2, first[1] - half * 0.6], [first[0] + 2, first[1] + half * 0.6], [head[0] + headR * 0.3, head[1] + headR * 0.85], [head[0] - headR * 0.6, head[1] + headR * 0.7]), c: headFill },
          ],
        },
        {
          pieces: [
            ...spots,
            { d: ell(head[0] - headR * 0.25, head[1] - headR * 0.25, headR * 0.3, headR * 0.34), c: '#f5f5f5' },
            { d: ell(head[0] - headR * 0.33, head[1] - headR * 0.25, headR * 0.17, headR * 0.2), c: spot },
          ],
          flat: true,
        },
      ],
    },
    9,
  )
}

const PROPS: ReadonlyMap<string, CutScene> = new Map<string, CutScene>([
  [SECTOR_ADVENTURE_ART.stone.href, stone],
  [SECTOR_ADVENTURE_ART.leaf.href, leaf(0, '#c78a2f', '#94621c')],
  [SECTOR_ADVENTURE_ART.leaf2.href, leaf(16, '#d9a23a', '#a77723')],
  [SECTOR_ADVENTURE_ART.leaf3.href, leaf(-14, '#b5722a', '#855018')],
  [SECTOR_ADVENTURE_ART.apple.href, apple(0, '#d9412f', '#f07a68')],
  [SECTOR_ADVENTURE_ART.apple2.href, apple(4, '#e8542f', '#f58a6a', 3)],
  [SECTOR_ADVENTURE_ART.apple3.href, apple(-3, '#c9362a', '#e56a5c', -2)],
  [SECTOR_ADVENTURE_ART.mushroom.href, mushroom],
  [SECTOR_ADVENTURE_ART.flower.href, flower('#ffffff', '#fbc92f')],
  [SECTOR_ADVENTURE_ART.flowerDormant.href, flower('#d2d2d2', '#a8a8a8')],
  [SECTOR_ADVENTURE_ART.honeycomb.href, honeycomb],
  [SECTOR_ADVENTURE_ART.chest.href, chest],
  [SECTOR_ADVENTURE_ART.flashlight.href, flashlight],
  [SECTOR_ADVENTURE_ART.shedSkin.href, shedSkin],
  [HAZARD_STARFISH_ART.href, starfish],
  [LAMP_ART.on.href, lamp('#f2d377', '#8a6a3f')],
  [LAMP_ART.off.href, lamp('#838383', '#6a6a6a')],
  [ZOO_OCTOPUS_PRINT_ART.href, octopusPrint],
  [SECTOR_ADVENTURE_ART.snakeSmall.href, paperSnake(SECTOR_ADVENTURE_ART.snakeSmall, DRAWN_SPINE.snakeSmall, false)],
  [SECTOR_ADVENTURE_ART.snakeMedium.href, paperSnake(SECTOR_ADVENTURE_ART.snakeMedium, DRAWN_SPINE.snakeMedium, false)],
  [SECTOR_ADVENTURE_ART.snakeLarge.href, paperSnake(SECTOR_ADVENTURE_ART.snakeLarge, DRAWN_SPINE.snakeLarge, false)],
  [SECTOR_ADVENTURE_ART.snakeSmallGrey.href, paperSnake(SECTOR_ADVENTURE_ART.snakeSmallGrey, DRAWN_SPINE.snakeSmall, true)],
  [SECTOR_ADVENTURE_ART.snakeMediumGrey.href, paperSnake(SECTOR_ADVENTURE_ART.snakeMediumGrey, DRAWN_SPINE.snakeMedium, true)],
  [SECTOR_ADVENTURE_ART.snakeLargeGrey.href, paperSnake(SECTOR_ADVENTURE_ART.snakeLargeGrey, DRAWN_SPINE.snakeLarge, true)],
  ...CHROME_PROPS,
])

/** The paper drawing for a registry picture of a thing, if it has one. */
export function paperPropFor(art: { readonly href: string }): CutScene | undefined {
  return PROPS.get(art.href)
}
