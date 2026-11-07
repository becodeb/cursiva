// The zoo seen from above, as a paper diorama. Authored on the map's own 1000x600
// stage, so every `hit`, `animalSpot` and fog patch in `zoo/sectors.ts` lands on what
// it names at any screen shape: unlike the old picture, this one does not rescale
// when the window grows, it just shows more grass.
import { ell, tubePath, type Vec } from '../geometry'
import { blade, lump, peak, poly, type SceneDef, type SceneLayer, type ScenePiece } from './engine'

const GRASS = '#a9cf6e'
const PATHWAY = '#efdcab'

const way = (points: readonly Vec[], width: number): ScenePiece => {
  const dense: Vec[] = []
  for (let i = 1; i < points.length; i++) {
    const [a, b] = [points[i - 1], points[i]]
    for (let k = 0; k < 8; k++) dense.push([a[0] + ((b[0] - a[0]) * k) / 8, a[1] + ((b[1] - a[1]) * k) / 8])
  }
  dense.push(points[points.length - 1])
  return { d: tubePath(dense, () => width), c: PATHWAY }
}

const pine = (x: number, y: number, h: number, c: string): ScenePiece[] => [
  { d: poly([x - 4, y], [x - 3, y - h * 0.3], [x + 3, y - h * 0.3], [x + 4, y]), c: '#7a5a38' },
  { d: poly([x - h * 0.34, y - h * 0.22], [x, y - h], [x + h * 0.34, y - h * 0.22]), c },
]

const crown = (x: number, y: number, r: number, c: string): ScenePiece[] => [
  { d: poly([x - 4, y], [x - 3, y - r], [x + 3, y - r], [x + 4, y]), c: '#7a5a38' },
  { d: lump(x, y - r * 1.4, r * 0.9, r * 0.86, 3), c },
]

const reeds = (x: number, y: number): ScenePiece[] => [
  { d: blade(x, y, 40, 6, 3), c: '#3b8452' },
  { d: blade(x + 8, y, 52, -4, 3), c: '#357a4c' },
  { d: blade(x + 16, y, 34, 8, 3), c: '#3b8452' },
  { d: ell(x + 5, y - 46, 2.6, 7), c: '#7a4e2b' },
]

const fence = (from: Vec, to: Vec, posts: number, c: string): ScenePiece[] => {
  const out: ScenePiece[] = [{ d: poly([from[0], from[1] - 11], [to[0], to[1] - 11], [to[0], to[1] - 8], [from[0], from[1] - 8]), c }]
  for (let i = 0; i <= posts; i++) {
    const x = from[0] + ((to[0] - from[0]) * i) / posts
    const y = from[1] + ((to[1] - from[1]) * i) / posts
    out.push({ d: poly([x - 2, y - 16], [x + 2, y - 16], [x + 2, y], [x - 2, y]), c })
  }
  return out
}

const LAYERS: readonly SceneLayer[] = [
  // Soft grass patches beyond the sectors, including what a wider screen reveals.
  {
    pieces: [
      { d: ell(30, 560, 150, 70), c: '#9dc765' },
      { d: ell(960, 580, 180, 70), c: '#9dc765' },
      { d: ell(380, 280, 56, 30), c: '#9dc765' },
      { d: ell(640, 330, 46, 26), c: '#9dc765' },
      { d: ell(-120, 300, 110, 200), c: '#9dc765' },
      { d: ell(1120, 300, 110, 200), c: '#9dc765' },
      { d: ell(500, -60, 500, 44), c: '#9dc765' },
      { d: ell(500, 680, 500, 46), c: '#9dc765' },
    ],
    flat: true,
  },
  // The paths, all from the plaza: the sendero is what connects them.
  {
    pieces: [
      way([[498, 282], [380, 340], [250, 380]], 12),
      way([[498, 282], [720, 200]], 12),
      way([[498, 282], [495, 150]], 11),
      way([[498, 282], [760, 400]], 12),
      way([[498, 282], [510, 470]], 13),
      way([[420, 240], [300, 190], [220, 130]], 10),
    ],
    flat: true,
  },
  { pieces: [{ d: ell(498, 282, 94, 56), c: '#e4cd97' }] },
  { pieces: [{ d: ell(498, 278, 78, 44), c: PATHWAY }], flat: true },

  // The night sector: its own dark sheet, under its own sky.
  { pieces: [{ d: 'M92 44C120 12 310 8 338 34C358 80 354 180 322 206C250 226 130 224 96 200C70 150 74 80 92 44Z', c: '#223f70' }] },
  {
    pieces: [
      { d: ell(292, 62, 24, 24), c: '#f6efb4' },
      { d: ell(282, 56, 21, 21), c: '#223f70' },
      ...[[140, 56], [190, 40], [230, 84], [118, 104], [176, 92]].map(([x, y]): ScenePiece => ({ d: poly([x, y - 6], [x + 2, y - 2], [x + 6, y], [x + 2, y + 2], [x, y + 6], [x - 2, y + 2], [x - 6, y], [x - 2, y - 2]), c: '#f6efb4' })),
    ],
    flat: true,
  },
  { pieces: [{ d: 'M86 176C140 142 210 170 268 150C300 142 330 160 346 180C340 210 250 226 170 222C130 220 96 208 86 176Z', c: '#2d5478' }] },
  { pieces: [...pine(118, 196, 58, '#1b3658'), ...pine(322, 192, 54, '#1b3658')] },

  // The forest: a floor of its own, crowns around the clearing.
  { pieces: [{ d: 'M28 262C70 226 280 226 320 268C346 340 338 470 306 520C230 548 90 540 44 514C14 440 12 330 28 262Z', c: '#79b257' }] },
  { pieces: [...crown(76, 304, 30, '#4f8f45'), ...crown(276, 296, 34, '#4f8f45'), ...crown(170, 268, 26, '#5b9c50')] },
  { pieces: [...crown(62, 430, 34, '#5b9c50'), ...crown(290, 420, 30, '#4f8f45')] },
  { pieces: [...crown(98, 520, 30, '#4f8f45'), ...crown(240, 526, 36, '#5b9c50'), ...crown(170, 534, 24, '#4f8f45')], motion: 'sway', origin: [170, 534] },

  // The mountains, the far edge of the zoo.
  { pieces: [...peak(500, 96, 90, 92, '#b3c3d6', '#ffffff')] },
  { pieces: [...peak(412, 112, 76, 108, '#9fb2c8', '#ffffff')] },
  { pieces: [...peak(592, 118, 84, 124, '#9fb2c8', '#ffffff')] },
  { pieces: [{ d: 'M352 110C400 92 470 118 500 112C550 96 600 106 642 116C650 150 630 172 590 170C510 176 420 176 370 166C350 150 346 128 352 110Z', c: '#c3df8e' }] },

  // The pond. The duck's house on the bank, reeds, a lily pad.
  { pieces: [{ d: 'M668 96C716 58 880 58 930 92C958 150 950 240 910 264C820 282 720 276 682 250C646 200 650 140 668 96Z', c: '#8fc06a' }] },
  { pieces: [{ d: ell(800, 174, 124, 88), c: '#5cb2cc' }] },
  { pieces: [{ d: 'M700 150C750 118 860 118 900 150C860 136 750 136 700 150Z', c: '#79c3d8' }, { d: 'M730 240C770 222 850 222 880 240C850 232 770 232 730 240Z', c: '#79c3d8' }], flat: true },
  {
    pieces: [
      { d: poly([884, 86], [930, 86], [930, 124], [884, 124]), c: '#d99a55' },
      { d: poly([876, 90], [907, 62], [938, 90]), c: '#b9513a' },
      { d: ell(907, 106, 9, 12), c: '#5e3620' },
      ...reeds(678, 214),
      ...reeds(920, 248),
      { d: ell(860, 212, 15, 6), c: '#449a63' },
    ],
  },

  // The arena: a ring of sand behind a low wall.
  { pieces: [{ d: 'M684 340C720 292 910 288 948 336C972 390 960 482 918 508C850 530 740 526 704 504C668 470 664 390 684 340Z', c: '#dcae74' }] },
  { pieces: [{ d: ell(816, 406, 118, 92), c: '#f2d694' }] },
  { pieces: [...[[764, 368], [876, 372], [858, 458], [772, 452]].map(([x, y]): ScenePiece => ({ d: ell(x, y, 14, 6), c: '#ebc97f' }))], flat: true },

  // The entrance: three small enclosures, with the gate below them.
  {
    pieces: [
      { d: poly([410, 462], [474, 462], [474, 518], [410, 518]), c: '#94dbea' },
      { d: poly([480, 462], [544, 462], [544, 518], [480, 518]), c: '#f2d694' },
      { d: poly([550, 462], [614, 462], [614, 518], [550, 518]), c: '#f6c873' },
    ],
  },
  {
    pieces: [
      { d: poly([410, 502], [474, 502], [474, 518], [410, 518]), c: '#f4dfae' },
      { d: poly([550, 462], [614, 462], [614, 476], [550, 476]), c: '#b9d65f' },
    ],
    flat: true,
  },
  { pieces: [...fence([408, 524], [616, 524], 10, '#f2dcab')] },
  {
    pieces: [
      { d: poly([468, 590], [480, 590], [480, 540], [468, 540]), c: '#c76a4e' },
      { d: poly([548, 590], [560, 590], [560, 540], [548, 540]), c: '#c76a4e' },
      { d: 'M456 546C480 516 548 516 572 546L572 560C548 532 480 532 456 560Z', c: '#e68a5e' },
    ],
  },

  // The world beyond the fence, for a wider screen.
  { pieces: [...crown(-40, 200, 40, '#6aa84e'), ...crown(-70, 420, 46, '#5b9c50'), ...crown(1040, 150, 42, '#6aa84e'), ...crown(1074, 400, 48, '#5b9c50')] },
  { pieces: [...crown(980, 580, 36, '#6aa84e'), ...crown(30, 596, 38, '#6aa84e'), ...crown(780, 590, 26, '#5b9c50'), ...crown(330, 586, 28, '#5b9c50')] },
]

export const ZOO_MAP_SCENE: SceneDef = { w: 1000, h: 600, base: GRASS, layers: LAYERS, grain: 0.45 }
