// The zoo's places, cut out of paper. Each keeps the central working band one flat
// colour, so a corridor reads on it, and tells where it is at the edges. Numbers, not
// taste, bound the colours: `scene.test.ts` holds every colour within a corridor's
// reach to the 55-luma law against the paint that row actually lays over it, and the
// comment on each scene says which side of that paint it lives on.
import { ell } from '../geometry'
import { blade, lump, peak, poly, rise, SCENE_H, SCENE_W, tuft, type SceneDef, type SceneLayer, type ScenePiece } from './engine'

const scene = (base: string, layers: readonly SceneLayer[]): SceneDef => ({ w: SCENE_W, h: SCENE_H, base, layers })

const INK = '#1a2226'

const reedBed = (x: number, y: number, dir: 1 | -1): ScenePiece[] => [
  { d: blade(x, y, 240, 26 * dir, 13), c: '#3b8452' },
  { d: blade(x + 46 * dir, y, 300, -18 * dir, 14), c: '#357a4c' },
  { d: blade(x + 96 * dir, y, 210, 34 * dir, 12), c: '#3b8452' },
  { d: blade(x + 142 * dir, y, 165, 46 * dir, 11), c: '#458f58' },
  // Cattails, at the end of the two tall blades.
  { d: ell(x + 26 * dir, y - 250, 14, 44), c: '#7a4e2b' },
  { d: ell(x + 28 * dir, y - 306, 15, 48), c: '#6f4526' },
]

const fish = (x: number, y: number, k: number, body: string, fin: string, dir: 1 | -1): ScenePiece[] => {
  const X = (u: number): number => x + u * k * dir
  const Y = (v: number): number => y + v * k
  return [
    { d: poly([X(-52), Y(0)], [X(-98), Y(-34)], [X(-90), Y(0)], [X(-98), Y(34)]), c: fin },
    { d: ell(x, y, 66 * k, 36 * k), c: body },
    { d: poly([X(-12), Y(-30)], [X(14), Y(-58)], [X(30), Y(-28)]), c: fin },
    { d: ell(X(36), Y(-8), 10 * k, 10 * k), c: '#ffffff' },
    { d: ell(X(39), Y(-8), 5 * k, 5 * k), c: INK },
  ]
}

const palm = (x: number, y: number, h: number, dir: 1 | -1, trunk: string, frond: string): SceneLayer[] => {
  const topX = x + 56 * dir
  const topY = y - h
  return [
    { pieces: [{ d: poly([x - 20, y], [topX - 9, topY], [topX + 9, topY], [x + 22, y]), c: trunk }] },
    {
      pieces: [
        { d: blade(topX, topY + 6, 170, 150 * dir, 16), c: frond },
        { d: blade(topX, topY + 6, 170, -150 * dir, 16), c: frond },
        { d: blade(topX, topY + 2, 150, 44 * dir, 17), c: frond },
        { d: `M${topX} ${topY}C${topX + 70} ${topY - 40} ${topX + 150} ${topY + 16} ${topX + 186} ${topY + 96}C${topX + 130} ${topY + 40} ${topX + 66} ${topY + 18} ${topX} ${topY + 18}Z`, c: frond },
        { d: `M${topX} ${topY}C${topX - 70} ${topY - 40} ${topX - 150} ${topY + 16} ${topX - 186} ${topY + 96}C${topX - 130} ${topY + 40} ${topX - 66} ${topY + 18} ${topX} ${topY + 18}Z`, c: frond },
      ],
      motion: 'sway',
      origin: [topX, topY],
      delay: x % 3,
    },
  ]
}

/** A round-crowned tree: the crown goes on its own layer, so it can breathe. */
const tree = (x: number, y: number, h: number, trunk: string, crown: string, delay = 0): SceneLayer[] => [
  { pieces: [{ d: poly([x - 20, y], [x - 12, y - h * 0.62], [x + 12, y - h * 0.62], [x + 20, y]), c: trunk }] },
  { pieces: [{ d: lump(x, y - h * 0.74, h * 0.34, h * 0.32), c: crown }], motion: 'sway', origin: [x, y - h * 0.55], delay },
]

const flower = (x: number, y: number, r: number, petal: string, heart: string): ScenePiece[] => [
  ...[0, 72, 144, 216, 288].map((deg) => {
    const a = (deg * Math.PI) / 180
    return { d: ell(x + Math.sin(a) * r, y - Math.cos(a) * r, r * 0.72, r * 0.72), c: petal }
  }),
  { d: ell(x, y, r * 0.62, r * 0.62), c: heart },
]

const star = (x: number, y: number, r: number, c: string): ScenePiece => ({
  d: poly([x, y - r], [x + r * 0.28, y - r * 0.28], [x + r, y], [x + r * 0.28, y + r * 0.28], [x, y + r], [x - r * 0.28, y + r * 0.28], [x - r, y], [x - r * 0.28, y - r * 0.28]),
  c,
})

const rays = (x: number, y: number, c: string, from: number, count: number, span: number, reach: number): SceneLayer => ({
  pieces: Array.from({ length: count }, (_, i): ScenePiece => {
    const a = from + (i / Math.max(1, count - 1)) * span
    const w = 0.055
    return { d: poly([x, y], [x + Math.cos(a - w) * reach, y + Math.sin(a - w) * reach], [x + Math.cos(a + w) * reach, y + Math.sin(a + w) * reach]), c }
  }),
  flat: true,
  motion: 'rays',
  origin: [x, y],
})

// The lagoon. A paper strip runs over it (luma 252), so everything stays at 197 or
// darker. Duck house on the far bank, reeds in the near corners, lily pads.
const LAGOON = scene('#56a9c4', [
  { pieces: [{ d: rise([[-100, 186], [2100, 186]], false), c: '#7cc0d8' }], flat: true },
  { pieces: [{ d: lump(640, 72, 110, 40), c: '#a3cedc' }], motion: 'drift' },
  { pieces: [{ d: lump(1370, 56, 130, 44), c: '#a3cedc' }], motion: 'drift', delay: 2 },
  { pieces: [{ d: rise([[-100, 158], [360, 112], [800, 162], [1250, 118], [1680, 160], [2100, 116]]), c: '#6ea65a' }] },
  { pieces: [{ d: rise([[-100, 186], [520, 168], [1000, 188], [1460, 170], [2100, 190]]), c: '#8cba5e' }] },
  { pieces: [{ d: rise([[-100, 204], [520, 192], [1000, 208], [1460, 194], [2100, 208]]), c: '#56a9c4' }] },
  // The duck house, on stilts at the water's edge.
  {
    pieces: [
      { d: poly([452, 206], [462, 206], [462, 238], [452, 238]), c: '#7a4e2b' },
      { d: poly([586, 206], [596, 206], [596, 238], [586, 238]), c: '#7a4e2b' },
      { d: poly([444, 128], [604, 128], [604, 214], [444, 214]), c: '#d99a55' },
      { d: poly([424, 136], [524, 72], [624, 136]), c: '#b9513a' },
      { d: ell(524, 174, 28, 34), c: '#5e3620' },
    ],
  },
  ...tree(1500, 196, 150, '#7a4e2b', '#4f9152', 1),
  ...tree(1610, 186, 110, '#7a4e2b', '#5b9c58', 2),
  // Edge water, one darker sheet: the corners are where the place happens.
  { pieces: [{ d: rise([[-100, 898], [420, 868], [900, 912], [1380, 874], [2100, 904]]), c: '#4792b0' }] },
  {
    pieces: [
      { d: ell(748, 912, 76, 26), c: '#449a63' },
      { d: ell(1262, 936, 92, 30), c: '#3f9460' },
      { d: ell(1110, 968, 56, 19), c: '#449a63' },
      ...flower(748, 900, 11, '#e68aa6', '#efc23f'),
    ],
  },
  { pieces: reedBed(400, 1000, 1), motion: 'sway', origin: [470, 1000] },
  { pieces: reedBed(1610, 1000, -1), motion: 'sway', origin: [1540, 1000], delay: 1.4 },
  { pieces: reedBed(90, 1000, 1), motion: 'sway', origin: [160, 1000], delay: 0.7 },
  { pieces: reedBed(1910, 1000, -1), motion: 'sway', origin: [1840, 1000], delay: 2.1 },
])

// The slope under the sheep. The stone channel is luma 100, so everything is 155 or
// lighter: a bright, open hillside with a little barn and a fence along the ridge.
const SLOPE = scene('#b9dc6e', [
  { pieces: [{ d: rise([[-100, 210], [2100, 210]], false), c: '#d6eef6' }], flat: true },
  { pieces: [{ d: ell(1420, 88, 58, 58), c: '#ffe27a' }] },
  rays(1420, 88, '#fff0b3', 0.2, 6, 2.7, 150),
  { pieces: [{ d: lump(620, 92, 130, 50), c: '#ffffff' }], motion: 'drift' },
  { pieces: [{ d: rise([[-100, 214], [400, 142], [900, 216], [1300, 168], [1700, 210], [2100, 150]]), c: '#cbe58c' }] },
  // A red barn on the far hill, and the fence that runs off it.
  {
    pieces: [
      { d: poly([1500, 132], [1604, 132], [1604, 208], [1500, 208]), c: '#fbe3c0' },
      { d: poly([1484, 138], [1552, 86], [1620, 138]), c: '#e8867a' },
      { d: poly([1536, 158], [1570, 158], [1570, 208], [1536, 208]), c: '#e8867a' },
    ],
  },
  {
    pieces: [420, 490, 560, 630, 700, 770].flatMap((x, i): ScenePiece[] => {
      const y = 196 + i * 3
      return [{ d: poly([x - 7, y - 42], [x + 7, y - 42], [x + 7, y + 8], [x - 7, y + 8]), c: '#efd9ac' }]
    }),
  },
  { pieces: [{ d: poly([402, 176], [790, 188], [790, 200], [402, 188]), c: '#efd9ac' }], flat: true },
  { pieces: [{ d: rise([[-100, 244], [460, 216], [1000, 246], [1500, 222], [2100, 240]]), c: '#b9dc6e' }] },
  ...tree(220, 420, 300, '#d0a878', '#96cc5a', 1),
  ...tree(1830, 400, 280, '#d0a878', '#96cc5a', 2),
  { pieces: [{ d: rise([[-100, 462], [120, 470], [300, 636], [420, 830], [520, 1100]]), c: '#a6d05e' }] },
  { pieces: [{ d: rise([[1500, 1100], [1610, 830], [1720, 640], [1880, 470], [2100, 440]]), c: '#a6d05e' }] },
  { pieces: [{ d: rise([[-100, 900], [500, 862], [1000, 908], [1500, 866], [2100, 902]]), c: '#a2cc5a' }] },
  {
    pieces: [
      ...flower(640, 934, 13, '#ffffff', '#ffd35a'),
      ...flower(1220, 950, 15, '#ffffff', '#ffd35a'),
      ...flower(1400, 916, 11, '#ffd35a', '#ffffff'),
      ...tuft(860, 960, 56, '#90c455'),
      ...tuft(1060, 930, 48, '#90c455'),
    ],
  },
])

// The range under the llama. The same stone channel, so 155 or lighter again: pale
// peaks with real snow, a calm valley floor and cactus at the foot of the rocks.
const RANGE = scene('#dfe8cf', [
  { pieces: [{ d: rise([[-100, 260], [2100, 260]], false), c: '#cde6f3' }], flat: true },
  { pieces: [{ d: lump(1020, 70, 130, 44), c: '#ffffff' }], motion: 'drift' },
  { pieces: [...peak(1000, 250, 360, 130, '#c6d6e4', '#ffffff')] },
  { pieces: [...peak(540, 290, 400, 266, '#bccfe0', '#ffffff')] },
  { pieces: [...peak(1500, 290, 430, 280, '#bccfe0', '#ffffff')] },
  { pieces: [...peak(180, 480, 400, 430, '#a9bdd2', '#ffffff')] },
  { pieces: [...peak(1860, 500, 420, 460, '#a9bdd2', '#ffffff')] },
  { pieces: [{ d: rise([[-100, 280], [500, 262], [1000, 284], [1500, 264], [2100, 282]]), c: '#dfe8cf' }] },
  { pieces: [{ d: rise([[-100, 560], [160, 600], [330, 800], [420, 1100]]), c: '#cdd8b0' }] },
  { pieces: [{ d: rise([[1620, 1100], [1710, 800], [1860, 590], [2100, 560]]), c: '#cdd8b0' }] },
  { pieces: [{ d: rise([[-100, 908], [520, 874], [1000, 916], [1500, 880], [2100, 910]]), c: '#cdd8b0' }] },
  {
    pieces: [
      { d: lump(600, 952, 94, 36, 3), c: '#c8c4b4' },
      { d: lump(1340, 960, 110, 42, 3), c: '#c8c4b4' },
      { d: poly([1078, 980], [1094, 880], [1112, 880], [1128, 980]), c: '#a6cf8e' },
      { d: poly([1050, 930], [1050, 900], [1064, 900], [1068, 920], [1098, 930], [1098, 946], [1060, 946]), c: '#a6cf8e' },
      { d: poly([1150, 918], [1150, 888], [1136, 888], [1132, 906], [1104, 912], [1104, 930], [1142, 930]), c: '#a6cf8e' },
    ],
  },
])

// The forest. Monkeys lay the paper strip on it (luma 252) and the bee draws the
// child's slate line straight on it (luma 40), so everything lives between 95 and 197.
const FOREST = scene('#7fb54e', [
  rays(1480, -30, '#92c356', 1.1, 5, 1.2, 310),
  { pieces: [{ d: rise([[-100, 200], [200, 146], [520, 192], [860, 134], [1160, 186], [1500, 138], [1840, 196], [2100, 150]], false), c: '#6dab50' }] },
  { pieces: [{ d: rise([[-100, 134], [240, 94], [600, 140], [1000, 78], [1400, 132], [1760, 92], [2100, 134]], false), c: '#4f8f45' }] },
  { pieces: [{ d: poly([60, 1100], [84, 120], [176, 120], [220, 1100]), c: '#8b6a45' }] },
  { pieces: [{ d: poly([1800, 1100], [1842, 110], [1926, 110], [1960, 1100]), c: '#8b6a45' }] },
  { pieces: [{ d: poly([330, 1100], [352, 90], [410, 90], [446, 1100]), c: '#967450' }] },
  { pieces: [{ d: poly([1580, 1100], [1606, 90], [1662, 90], [1690, 1100]), c: '#967450' }] },
  { pieces: [{ d: lump(300, 96, 330, 110), c: '#4f8f45' }], motion: 'sway', origin: [300, 200] },
  { pieces: [{ d: lump(1700, 90, 340, 120), c: '#4f8f45' }], motion: 'sway', origin: [1700, 200], delay: 1.5 },
  { pieces: [{ d: rise([[-100, 880], [460, 846], [1000, 900], [1540, 852], [2100, 884]]), c: '#6aa347' }] },
  {
    pieces: [
      ...tuft(520, 900, 78, '#568f3c'),
      ...tuft(1460, 910, 84, '#568f3c'),
      ...tuft(880, 960, 60, '#568f3c'),
      ...tuft(1220, 950, 64, '#568f3c'),
    ],
  },
  {
    pieces: [
      ...flower(700, 932, 15, '#ef9db8', '#f3c23f'),
      ...flower(1090, 962, 13, '#ef9db8', '#f3c23f'),
      ...flower(1360, 954, 16, '#d9c050', '#d88a3a'),
      // A stump and two toadstools at the foot of the near trunk.
      { d: poly([600, 980], [608, 912], [660, 912], [672, 980]), c: '#967450' },
      { d: ell(634, 912, 37, 13), c: '#b8926a' },
      { d: poly([1558, 980], [1564, 926], [1578, 926], [1584, 980]), c: '#d3bf98' },
      { d: `M1530 930C1536 884 1606 884 1612 930Z`, c: '#d9644f' },
    ],
  },
])

// The aquarium, seen through its glass. The grime veil is luma 109 and the snake-free
// water must be seen when it is wiped, so everything is 164 or lighter, ink aside.
const AQUARIUM = scene('#94dbea', [
  // The glass catches the light in two long slants.
  { pieces: [{ d: poly([420, -20], [500, -20], [190, 1020], [110, 1020]), c: '#b6e9f2' }, { d: poly([540, -20], [574, -20], [264, 1020], [230, 1020]), c: '#b6e9f2' }], flat: true },
  { pieces: [{ d: rise([[-100, 884], [420, 852], [1000, 898], [1560, 856], [2100, 886]]), c: '#f4dfae' }] },
  { pieces: [{ d: blade(470, 900, 320, 44, 30), c: '#6fcf8f' }, { d: blade(540, 900, 240, -30, 26), c: '#86d69a' }, { d: blade(420, 900, 190, -48, 22), c: '#86d69a' }], motion: 'sway', origin: [470, 900] },
  { pieces: [{ d: blade(1480, 900, 340, -38, 30), c: '#6fcf8f' }, { d: blade(1560, 900, 220, 34, 26), c: '#86d69a' }], motion: 'sway', origin: [1500, 900], delay: 1.2 },
  {
    pieces: [
      { d: poly([1180, 958], [1188, 884], [1320, 884], [1328, 958]), c: '#e8b76a' },
      { d: `M1180 890C1190 846 1318 846 1328 890Z`, c: '#f0c98a' },
      { d: lump(800, 952, 74, 30, 3), c: '#d9d3c4' },
      { d: lump(690, 968, 44, 18, 3), c: '#e4dfd2' },
    ],
  },
  { pieces: fish(490, 190, 1.1, '#ffb04d', '#ff9a6b', 1), motion: 'bob' },
  { pieces: fish(1510, 150, 0.9, '#d7b6f0', '#c4a0e8', -1), motion: 'bob', delay: 1 },
  { pieces: fish(1590, 620, 1.05, '#ffc65c', '#ff9f6b', -1), motion: 'bob', delay: 2 },
  { pieces: fish(420, 610, 0.8, '#f7a8c0', '#f293ad', 1), motion: 'bob', delay: 1.6 },
  { pieces: fish(170, 360, 1, '#ffc65c', '#ff9f6b', 1), motion: 'bob', delay: 0.8 },
  { pieces: fish(1840, 400, 1.1, '#ffb04d', '#ff9a6b', -1), motion: 'bob', delay: 2.4 },
  {
    pieces: [ell(600, 150, 18), ell(632, 96, 12), ell(1420, 120, 15), ell(1394, 62, 10)].map((d) => ({ d, c: '#dbf4f8' })),
    flat: true,
    motion: 'bob',
    delay: 0.6,
  },
  // The tank's own rim: what makes this water behind glass.
  { pieces: [{ d: poly([-100, -100], [2100, -100], [2100, 26], [-100, 26]), c: '#eccb94' }] },
  { pieces: [{ d: poly([-100, 974], [2100, 974], [2100, 1100], [-100, 1100]), c: '#eccb94' }] },
])

// The turtle beach, shared by the turtles, the snakes and the sand drift. Its corridor
// paints are luma 52, 109 and 116, so everything stays at 171 or lighter.
const SAND = scene('#f2d694', [
  { pieces: [{ d: rise([[-100, 170], [2100, 170]], false), c: '#cfeef5' }], flat: true },
  { pieces: [{ d: lump(1300, 66, 120, 42), c: '#ffffff' }], motion: 'drift' },
  { pieces: [{ d: rise([[-100, 118], [500, 110], [1000, 122], [1500, 112], [2100, 118]]), c: '#9ddde0' }] },
  { pieces: [{ d: rise([[-100, 176], [440, 158], [900, 180], [1400, 160], [2100, 178]]), c: '#e8f7f5' }], flat: true },
  { pieces: [{ d: rise([[-100, 190], [440, 172], [900, 194], [1400, 174], [2100, 192]]), c: '#f2d694' }] },
  ...palm(380, 660, 470, 1, '#d9ae78', '#a9d96a'),
  ...palm(1640, 610, 420, -1, '#d9ae78', '#a9d96a'),
  { pieces: [{ d: rise([[-100, 620], [260, 650], [430, 780], [560, 1100]]), c: '#ebc97f' }] },
  { pieces: [{ d: rise([[1470, 1100], [1580, 780], [1740, 640], [2100, 600]]), c: '#ebc97f' }] },
  { pieces: [{ d: rise([[-100, 900], [500, 858], [1000, 910], [1500, 862], [2100, 898]]), c: '#ebc97f' }] },
  {
    pieces: [
      { d: ell(660, 948, 36, 22), c: '#f5a98c' },
      { d: poly([646, 934], [660, 920], [674, 934]), c: '#f5a98c' },
      { d: `M1266 960C1272 910 1344 910 1350 960Z`, c: '#fbe6cf' },
      { d: poly([1298, 960], [1308, 918], [1318, 960]), c: '#f5a98c' },
      ...[0, 72, 144, 216, 288].map((deg): ScenePiece => {
        const a = (deg * Math.PI) / 180
        return { d: poly([980 + Math.sin(a - 0.7) * 10, 948 - Math.cos(a - 0.7) * 10], [980 + Math.sin(a) * 34, 948 - Math.cos(a) * 34], [980 + Math.sin(a + 0.7) * 10, 948 - Math.cos(a + 0.7) * 10]), c: '#f9c08a' }
      }),
    ],
  },
])

// The monkeys' enclosure. The leaf veil is luma 113, so everything is 168 or lighter:
// a warm clearing with a rope and a platform, jungle at the top of the sheet.
const MONKEYS = scene('#f6c873', [
  { pieces: [{ d: rise([[-100, 170], [240, 118], [620, 168], [1000, 110], [1360, 170], [1740, 118], [2100, 170]], false), c: '#b9d65f' }] },
  { pieces: [{ d: rise([[-100, 100], [280, 66], [700, 112], [1100, 60], [1500, 104], [2100, 60]], false), c: '#a3cf58' }] },
  { pieces: [{ d: poly([120, 1100], [148, 150], [224, 150], [252, 1100]), c: '#dcae74' }] },
  { pieces: [{ d: poly([1780, 1100], [1806, 150], [1880, 150], [1908, 1100]), c: '#dcae74' }] },
  // A platform in each safe corner, tied to the trees with rope.
  {
    pieces: [
      { d: poly([230, 382], [470, 382], [470, 408], [230, 408]), c: '#e3b778' },
      { d: poly([430, 408], [442, 408], [442, 150], [430, 150]), c: '#eed39b' },
      { d: poly([1540, 322], [1790, 322], [1790, 348], [1540, 348]), c: '#e3b778' },
      { d: poly([1576, 322], [1588, 322], [1588, 150], [1576, 150]), c: '#eed39b' },
    ],
  },
  { pieces: [{ d: `M570 120C596 360 546 470 586 640C560 470 530 360 546 120Z`, c: '#d2dc74' }], motion: 'sway', origin: [558, 120] },
  { pieces: [{ d: `M1436 110C1406 310 1450 390 1420 540C1440 390 1456 300 1456 110Z`, c: '#d2dc74' }], motion: 'sway', origin: [1446, 110], delay: 1.4 },
  { pieces: [{ d: rise([[-100, 896], [500, 860], [1000, 906], [1500, 864], [2100, 898]]), c: '#eeb95f' }] },
  {
    pieces: [
      { d: `M720 946C760 972 830 972 866 928C862 962 794 996 718 958Z`, c: '#ffe25f' },
      { d: `M748 912C786 942 850 942 884 894C884 932 816 964 744 924Z`, c: '#ffe25f' },
      ...tuft(1220, 950, 72, '#c4d865'),
      ...tuft(1040, 960, 54, '#c4d865'),
      ...tuft(520, 940, 62, '#c4d865'),
    ],
  },
])

// The trodden path to the gate. The mud veil is luma 102, so everything is 157 or
// lighter: a warm road between two grass verges, with signposts and a low fence.
const PATH = scene('#e9b36c', [
  { pieces: [{ d: rise([[-100, 170], [2100, 170]], false), c: '#d7eef6' }], flat: true },
  { pieces: [{ d: lump(1440, 66, 120, 40), c: '#ffffff' }], motion: 'drift' },
  { pieces: [{ d: lump(560, 86, 96, 34), c: '#ffffff' }], motion: 'drift', delay: 3 },
  { pieces: [{ d: rise([[-100, 176], [500, 126], [1040, 172], [1500, 128], [2100, 172]]), c: '#c7e3a0' }] },
  { pieces: [{ d: lump(1420, 146, 120, 46, 3), c: '#a0cf5e' }] },
  // The zoo's arch, far off down the road.
  {
    pieces: [
      { d: poly([860, 200], [884, 200], [884, 90], [860, 90]), c: '#e8a27a' },
      { d: poly([1110, 200], [1134, 200], [1134, 90], [1110, 90]), c: '#e8a27a' },
      { d: `M842 96C900 42 1094 42 1152 96L1152 120C1094 70 900 70 842 120Z`, c: '#f2c79a' },
    ],
  },
  { pieces: [{ d: rise([[-100, 214], [560, 196], [1000, 216], [1460, 198], [2100, 214]]), c: '#e9b36c' }] },
  { pieces: [{ d: rise([[-100, 460], [240, 500], [420, 720], [560, 1100]]), c: '#b7d86a' }] },
  { pieces: [{ d: rise([[1450, 1100], [1590, 720], [1760, 480], [2100, 440]]), c: '#b7d86a' }] },
  {
    pieces: [370, 450, 530].flatMap((x, i): ScenePiece[] => {
      const y = 880 - i * 2
      return [{ d: poly([x - 8, y - 56], [x + 8, y - 56], [x + 8, y + 6], [x - 8, y + 6]), c: '#f2dcab' }]
    }),
  },
  {
    pieces: [1480, 1560, 1640].flatMap((x, i): ScenePiece[] => {
      const y = 880 - i * 2
      return [{ d: poly([x - 8, y - 56], [x + 8, y - 56], [x + 8, y + 6], [x - 8, y + 6]), c: '#f2dcab' }]
    }),
  },
  { pieces: [{ d: rise([[-100, 918], [500, 884], [1000, 926], [1500, 888], [2100, 920]]), c: '#e0a55e' }] },
  {
    pieces: [
      { d: lump(610, 960, 60, 24, 3), c: '#dcd3c2' },
      { d: lump(1380, 952, 74, 30, 3), c: '#dcd3c2' },
      ...tuft(420, 940, 70, '#a0cf5e'),
      ...tuft(1580, 950, 76, '#a0cf5e'),
    ],
  },
])

// The hedgehog's night. The child's chalk line (luma 239) is drawn straight on it,
// through the row's own veil, so it only has to stay dark: a moon and a low hill.
const NIGHT = scene('#1f3a66', [
  { pieces: [{ d: ell(1450, 120, 72, 72), c: '#f6efb4' }, { d: ell(1420, 104, 62, 62), c: '#1f3a66' }], flat: true },
  { pieces: [[620, 60, 13], [860, 120, 9], [1120, 66, 12], [1700, 76, 10], [440, 130, 8], [1260, 150, 7]].map(([x, y, r]) => star(x, y, r, '#f6efb4')), flat: true },
  { pieces: [{ d: rise([[-100, 170], [420, 120], [860, 176], [1340, 134], [1740, 172], [2100, 130]]), c: '#25466f' }] },
  { pieces: [{ d: rise([[-100, 214], [500, 188], [1000, 216], [1500, 192], [2100, 214]]), c: '#1f3a66' }] },
  ...tree(330, 660, 520, '#18304f', '#22456a', 1),
  ...tree(1680, 640, 500, '#18304f', '#22456a', 2),
  { pieces: [{ d: rise([[-100, 640], [280, 660], [430, 800], [560, 1100]]), c: '#254a5c' }] },
  { pieces: [{ d: rise([[1440, 1100], [1580, 800], [1740, 650], [2100, 630]]), c: '#254a5c' }] },
  { pieces: [{ d: rise([[-100, 900], [500, 862], [1000, 908], [1500, 866], [2100, 898]]), c: '#2a5a55' }] },
  { pieces: [...tuft(640, 950, 62, '#336c60'), ...tuft(1320, 958, 70, '#336c60'), ...tuft(980, 974, 50, '#336c60')] },
])

// The zoo at night, under the torch. The veil is luma 22 and the prize has to show
// when the light falls on it, so everything is 77 or lighter: a cold moonlit blue.
const NIGHT_ZOO = scene('#3b6199', [
  { pieces: [{ d: ell(430, 118, 64, 64), c: '#fbf4b6' }], flat: true },
  { pieces: [[700, 66, 13], [980, 120, 9], [1240, 58, 12], [1540, 110, 10], [1760, 60, 8]].map(([x, y, r]) => star(x, y, r, '#fbf4b6')), flat: true },
  { pieces: [{ d: lump(1180, 100, 170, 44), c: '#5a7fb0' }], motion: 'drift' },
  { pieces: [{ d: rise([[-100, 180], [500, 140], [1000, 186], [1460, 146], [2100, 184]]), c: '#34578c' }] },
  {
    pieces: [760, 860, 960, 1060, 1160, 1260].map((x): ScenePiece => ({ d: poly([x - 7, 204], [x - 7, 144], [x, 128], [x + 7, 144], [x + 7, 204]), c: '#6d8fbd' })),
  },
  { pieces: [{ d: poly([740, 158], [1280, 158], [1280, 170], [740, 170]), c: '#6d8fbd' }], flat: true },
  { pieces: [{ d: rise([[-100, 214], [500, 194], [1000, 218], [1500, 198], [2100, 216]]), c: '#3b6199' }] },
  // Two lamps, the warm ones the night is named by.
  {
    pieces: [
      { d: poly([220, 700], [236, 700], [240, 200], [216, 200]), c: '#6d8fbd' },
      { d: ell(228, 190, 40, 44), c: '#ffd97a' },
      { d: poly([1770, 740], [1786, 740], [1790, 240], [1766, 240]), c: '#6d8fbd' },
      { d: ell(1778, 230, 40, 44), c: '#ffd97a' },
    ],
  },
  { pieces: [{ d: rise([[-100, 900], [500, 864], [1000, 908], [1500, 868], [2100, 898]]), c: '#34578c' }] },
  { pieces: [...tuft(560, 950, 62, '#517aab'), ...tuft(1410, 950, 70, '#517aab'), ...tuft(1000, 968, 52, '#517aab')] },
])

export const SCENES = {
  lagoon: LAGOON,
  slope: SLOPE,
  range: RANGE,
  forest: FOREST,
  aquarium: AQUARIUM,
  sand: SAND,
  monkeys: MONKEYS,
  path: PATH,
  night: NIGHT,
  nightZoo: NIGHT_ZOO,
} as const satisfies Readonly<Record<string, SceneDef>>

export type SceneName = keyof typeof SCENES

