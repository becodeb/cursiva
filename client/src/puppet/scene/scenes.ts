// The zoo's places, cut out of paper. Each keeps the central working band one flat
// colour, so a corridor reads on it, and tells where it is at the edges. Numbers, not
// taste, bound the colours: `scene.test.ts` holds every colour within a corridor's
// reach to the 55-luma law against the paint that row actually lays over it, and the
// comment on each scene says which side of that paint it lives on.
import { ell } from '../geometry'
import { blade, lump, peak, poly, rise, SCENE_H, SCENE_W, tuft, type SceneDef, type SceneLayer, type ScenePiece } from './engine'

const scene = (base: string, layers: readonly SceneLayer[]): SceneDef => ({ w: SCENE_W, h: SCENE_H, base, layers })

const reedBed = (x: number, y: number, dir: 1 | -1): ScenePiece[] => [
  { d: blade(x, y, 240, 26 * dir, 13), c: '#3b8452' },
  { d: blade(x + 46 * dir, y, 300, -18 * dir, 14), c: '#357a4c' },
  { d: blade(x + 96 * dir, y, 210, 34 * dir, 12), c: '#3b8452' },
  { d: blade(x + 142 * dir, y, 165, 46 * dir, 11), c: '#458f58' },
  // Cattails, at the end of the two tall blades.
  { d: ell(x + 26 * dir, y - 250, 14, 44), c: '#7a4e2b' },
  { d: ell(x + 28 * dir, y - 306, 15, 48), c: '#6f4526' },
]

/** A chest you can name at a glance: a box, a domed lid on its own piece, two straps
 *  over both, and a gold clasp. Stands on `y`, `w` units wide. */
const chest = (x: number, y: number, w: number): SceneLayer[] => {
  const h = w * 0.46
  const lid = y - h
  return [
    {
      pieces: [
        { d: poly([x - w / 2, y], [x - w / 2 + 6, lid], [x + w / 2 - 6, lid], [x + w / 2, y]), c: '#e6a070' },
        { d: `M${x - w / 2 - 6} ${lid + 6}C${x - w / 2} ${lid - h * 0.92} ${x + w / 2} ${lid - h * 0.92} ${x + w / 2 + 6} ${lid + 6}Z`, c: '#efb084' },
      ],
    },
    {
      pieces: [
        { d: poly([x - w * 0.34, lid - h * 0.5], [x - w * 0.24, lid - h * 0.56], [x - w * 0.24, y], [x - w * 0.34, y]), c: '#dd9463' },
        { d: poly([x + w * 0.24, lid - h * 0.56], [x + w * 0.34, lid - h * 0.5], [x + w * 0.34, y], [x + w * 0.24, y]), c: '#dd9463' },
        { d: poly([x - w / 2 - 6, lid - 4], [x + w / 2 + 6, lid - 4], [x + w / 2 + 6, lid + 8], [x - w / 2 - 6, lid + 8]), c: '#dd9463' },
      ],
      flat: true,
    },
    { pieces: [{ d: poly([x - w * 0.09, lid - h * 0.16], [x + w * 0.09, lid - h * 0.16], [x + w * 0.09, lid + h * 0.3], [x - w * 0.09, lid + h * 0.3]), c: '#ffd84f' }] },
    { pieces: [{ d: ell(x, lid + h * 0.08, w * 0.026, w * 0.034), c: '#dd9463' }], flat: true },
  ]
}

/** A whole stone: its body and the lighter face the light falls on. */
const stone = (x: number, y: number, rx: number, ry: number, body: string, face: string): SceneLayer[] => [
  { pieces: [{ d: `M${x - rx} ${y}C${x - rx * 1.02} ${y - ry * 0.72} ${x - rx * 0.5} ${y - ry * 1.08} ${x - rx * 0.04} ${y - ry}C${x + rx * 0.5} ${y - ry * 1.02} ${x + rx * 1.02} ${y - ry * 0.56} ${x + rx} ${y}Z`, c: body }] },
  { pieces: [{ d: ell(x - rx * 0.26, y - ry * 0.62, rx * 0.36, ry * 0.22), c: face }], flat: true },
]

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

/** A rope hung from the canopy: a strip and its knots, the way a rope reads in paper. */
const rope = (x: number, top: number, length: number, delay = 0): SceneLayer[] => [
  {
    pieces: [{ d: poly([x - 9, top], [x + 9, top], [x + 9, top + length], [x - 9, top + length]), c: '#ecd79a' }],
    motion: 'sway',
    origin: [x, top],
    delay,
  },
  {
    pieces: [0.3, 0.55, 0.8, 1].map((u): ScenePiece => ({ d: ell(x, top + length * u, 15, 12), c: '#dcc37f' })),
    flat: true,
    motion: 'sway',
    origin: [x, top],
    delay,
  },
]

const apple = (x: number, y: number, r: number, c: string): ScenePiece[] => [
  { d: ell(x, y, r, r * 0.94), c },
  { d: poly([x - 3, y - r * 0.85], [x + 3, y - r * 0.85], [x + 6, y - r * 1.3], [x, y - r * 1.3]), c: '#c9ac6d' },
  { d: ell(x + r * 0.42, y - r * 1.06, r * 0.34, r * 0.17), c: '#a9d96a' },
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
  // Bubbles coming up from under the water ("dejó burbujas").
  {
    pieces: [[1000, 852, 16], [1036, 806, 11], [1006, 772, 8], [1130, 838, 13], [1160, 790, 9], [1458, 846, 14], [1484, 802, 9]].map(([x, y, r]): ScenePiece => ({ d: ell(x, y, r, r), c: '#9ad0de' })),
    flat: true,
    motion: 'bob',
    delay: 0.6,
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
  // The wire on the near ridge, where the wool caught ("lana en el alambrado"). Clear of
  // the bubble at every screen, because a child has to be able to find it.
  {
    pieces: [980, 1080, 1180, 1280, 1380].flatMap((x, i): ScenePiece[] => {
      const y = 214 - i * 4
      return [{ d: poly([x - 7, y - 58], [x + 7, y - 58], [x + 7, y + 8], [x - 7, y + 8]), c: '#efd9ac' }]
    }),
  },
  {
    pieces: [
      { d: poly([972, 166], [1388, 150], [1388, 158], [972, 174]), c: '#e3cb94' },
      { d: poly([972, 190], [1388, 174], [1388, 182], [972, 198]), c: '#e3cb94' },
    ],
    flat: true,
  },
  {
    pieces: [
      { d: lump(1030, 168, 34, 26, 3), c: '#ffffff' },
      { d: lump(1232, 176, 28, 22, 3), c: '#ffffff' },
      { d: lump(1334, 160, 30, 24, 3), c: '#ffffff' },
    ],
  },
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
  // The lianas someone went off on, and the hive the bee flies back to.
  { pieces: [{ d: `M470 150C500 300 452 400 490 560C462 410 440 300 450 150Z`, c: '#5f9a42' }], motion: 'sway', origin: [460, 150], delay: 0.5 },
  { pieces: [{ d: `M1560 130C1530 290 1574 380 1540 520C1566 390 1584 280 1580 130Z`, c: '#5f9a42' }], motion: 'sway', origin: [1570, 130], delay: 1.1 },
  {
    pieces: [
      { d: poly([1474, 150], [1486, 150], [1486, 190], [1474, 190]), c: '#8b6a45' },
      { d: `M1480 180C1530 180 1554 226 1546 266C1538 306 1512 330 1480 330C1448 330 1422 306 1414 266C1406 226 1430 180 1480 180Z`, c: '#e0a83a' },
    ],
  },
  {
    pieces: [
      { d: poly([1424, 222], [1536, 222], [1542, 238], [1418, 238]), c: '#c98f2a' },
      { d: poly([1416, 268], [1544, 268], [1538, 284], [1422, 284]), c: '#c98f2a' },
      { d: ell(1480, 300, 15, 15), c: '#8b6a45' },
    ],
    flat: true,
  },
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
      ...flower(1010, 902, 22, '#ef9db8', '#f3c23f'),
      ...flower(1090, 915, 22, '#ef9db8', '#f3c23f'),
      ...flower(1200, 904, 20, '#d9c050', '#d88a3a'),
      ...flower(1360, 912, 24, '#d9c050', '#d88a3a'),
      ...flower(1470, 892, 20, '#ef9db8', '#f3c23f'),
      // A stump and two toadstools at the foot of the near trunk.
      { d: poly([600, 980], [608, 912], [660, 912], [672, 980]), c: '#967450' },
      { d: ell(634, 912, 37, 13), c: '#b8926a' },
      { d: poly([1558, 980], [1564, 926], [1578, 926], [1584, 980]), c: '#d3bf98' },
      { d: `M1530 930C1536 884 1606 884 1612 930Z`, c: '#d9644f' },
    ],
  },
])

// The aquarium, seen through its glass. Empty: the glass is clean and "no hay ni un pez"
// (`zoo/adventures.ts`). A place has no eyes (`scene.test.tsx`): whoever lives here is a
// resident, and arrives with its own rescue. The grime veil is luma 109 and the snake-free
// water must be seen when it is wiped, so everything is 164 or lighter, ink aside.
const AQUARIUM = scene('#94dbea', [
  // The glass catches the light in two long slants.
  { pieces: [{ d: poly([420, -20], [500, -20], [190, 1020], [110, 1020]), c: '#b6e9f2' }, { d: poly([540, -20], [574, -20], [264, 1020], [230, 1020]), c: '#b6e9f2' }], flat: true },
  { pieces: [{ d: rise([[-100, 884], [420, 852], [1000, 898], [1560, 856], [2100, 886]]), c: '#f4dfae' }] },
  { pieces: [{ d: blade(470, 900, 320, 44, 30), c: '#6fcf8f' }, { d: blade(540, 900, 240, -30, 26), c: '#86d69a' }, { d: blade(420, 900, 190, -48, 22), c: '#86d69a' }], motion: 'sway', origin: [470, 900] },
  { pieces: [{ d: blade(1470, 900, 400, -38, 34), c: '#6fcf8f' }, { d: blade(1530, 900, 300, 30, 30), c: '#86d69a' }, { d: blade(1630, 900, 340, -26, 30), c: '#6fcf8f' }], motion: 'sway', origin: [1500, 900], delay: 1.2 },
  // What the Pulpito names when the glass is clean: the algae above, the chest and the
  // stones here, all on the sand and clear of where he stands. Nobody lives here until
  // the fish are back: the fish are residents (`zoo/residents.ts`), never paint.
  ...stone(1040, 918, 66, 52, '#b9c2c8', '#d3dade'),
  ...chest(1250, 930, 250),
  ...stone(1486, 912, 84, 66, '#b4bdc4', '#d0d8dc'),
  ...stone(1584, 926, 52, 40, '#c2cace', '#d9dfe2'),
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
  // The furrow and the prints someone left on the sand ("un surco en la arena"). A
  // trace, never the animal.
  {
    pieces: [
      { d: `M980 812C1090 776 1190 836 1300 802C1400 772 1500 806 1640 780L1642 796C1502 822 1402 788 1302 818C1192 852 1092 792 982 828Z`, c: '#e3c585' },
      ...[[1020, 790], [1120, 846], [1220, 786], [1330, 838], [1430, 768], [1540, 824]].flatMap(([x, y]): ScenePiece[] => [
        { d: ell(x, y, 15, 11), c: '#dcbc7a' },
        { d: ell(x - 15, y - 13, 5, 5), c: '#dcbc7a' },
        { d: ell(x, y - 17, 5, 5), c: '#dcbc7a' },
        { d: ell(x + 15, y - 13, 5, 5), c: '#dcbc7a' },
      ]),
    ],
    flat: true,
  },
  // What the Pulpito names in the clean pen: the stones and the log.
  {
    pieces: [
      { d: `M1176 914C1176 884 1206 878 1236 878L1436 870C1458 870 1470 888 1470 906C1470 926 1456 940 1434 940L1236 948C1204 948 1176 942 1176 914Z`, c: '#d9ae78' },
    ],
  },
  {
    pieces: [
      { d: ell(1204, 913, 27, 34), c: '#f0d3a4' },
      { d: ell(1204, 913, 13, 18), c: '#e3bd85' },
      { d: poly([1270, 894], [1400, 888], [1400, 896], [1270, 902]), c: '#d3a870' },
      { d: poly([1290, 922], [1430, 916], [1430, 924], [1290, 930]), c: '#d3a870' },
    ],
    flat: true,
  },
  ...stone(1060, 946, 70, 56, '#c7cdd0', '#dfe3e5'),
  ...stone(1560, 950, 80, 62, '#bfc6ca', '#dadfe2'),
  {
    pieces: [
      { d: ell(860, 948, 36, 22), c: '#f5a98c' },
      { d: poly([846, 934], [860, 920], [874, 934]), c: '#f5a98c' },
      { d: `M1660 972C1666 922 1738 922 1744 972Z`, c: '#fbe6cf' },
      { d: poly([1692, 972], [1702, 930], [1712, 972]), c: '#f5a98c' },
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
  // The ropes the Pulpito names ("las sogas"), knotted, and one swing to hang from.
  ...rope(556, 120, 580),
  ...rope(1446, 110, 500, 1.4),
  {
    pieces: [
      { d: poly([1130, 110], [1142, 110], [1142, 276], [1130, 276]), c: '#ecd79a' },
      { d: poly([1266, 110], [1278, 110], [1278, 276], [1266, 276]), c: '#ecd79a' },
      { d: poly([1110, 270], [1298, 270], [1298, 294], [1110, 294]), c: '#e3b778' },
    ],
    motion: 'sway',
    origin: [1204, 110],
    delay: 0.6,
  },
  { pieces: [{ d: rise([[-100, 896], [500, 860], [1000, 906], [1500, 864], [2100, 898]]), c: '#eeb95f' }] },
  {
    pieces: [
      ...tuft(1220, 950, 72, '#c4d865'),
      ...tuft(1040, 960, 54, '#c4d865'),
      ...tuft(520, 940, 62, '#c4d865'),
    ],
  },
  // The fruit ("las frutas"): a whole bunch of bananas and a pile of apples in a crate,
  // where nothing stands over them.
  {
    pieces: [
      { d: poly([1250, 950], [1490, 950], [1472, 880], [1268, 880]), c: '#e3b778' },
    ],
  },
  {
    pieces: [
      { d: poly([1262, 910], [1478, 910], [1474, 898], [1266, 898]), c: '#d6a766' },
      { d: poly([1256, 934], [1484, 934], [1480, 922], [1260, 922]), c: '#d6a766' },
    ],
    flat: true,
  },
  {
    pieces: [
      ...apple(1306, 858, 34, '#f29470'),
      ...apple(1372, 846, 38, '#f49a60'),
      ...apple(1436, 860, 32, '#f29470'),
    ],
  },
  {
    pieces: [
      { d: `M1030 940C1020 880 1040 830 1086 800C1066 846 1062 896 1078 950C1060 956 1040 952 1030 940Z`, c: '#ffe25f' },
      { d: `M1078 950C1058 892 1066 836 1100 796C1098 846 1104 896 1132 946C1116 958 1094 960 1078 950Z`, c: '#ffd93f' },
      { d: `M1132 946C1104 898 1096 840 1114 796C1128 846 1150 888 1188 926C1172 944 1150 952 1132 946Z`, c: '#ffe25f' },
      { d: poly([1086, 806], [1116, 800], [1112, 770], [1092, 772]), c: '#e3cf58' },
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
  // What the mud was hiding ("¡Son huellas!"): a line of prints along the road, a paw
  // and an arm's round print, going off toward the gate.
  {
    pieces: [[720, 816], [860, 766], [1000, 824], [1140, 770], [1280, 826], [1420, 772]].flatMap(([x, y], i): ScenePiece[] =>
      i % 2 === 0
        ? [{ d: ell(x, y + 6, 26, 20), c: '#c99757' }, { d: ell(x - 26, y - 20, 9, 10), c: '#c99757' }, { d: ell(x, y - 30, 9, 10), c: '#c99757' }, { d: ell(x + 26, y - 20, 9, 10), c: '#c99757' }]
        : [{ d: ell(x, y, 16, 32), c: '#c99757' }, { d: ell(x - 15, y - 44, 8, 9), c: '#c99757' }, { d: ell(x + 13, y - 42, 7, 8), c: '#c99757' }],
    ),
    flat: true,
  },
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

/** Where the things a line names stand, in scene units: a test holds each one whole
 *  inside what every screen shape shows (`scene.test.tsx`). A word in a closing means
 *  nothing if the crop cuts the thing in half. */
export const NAMED_THINGS: Readonly<Partial<Record<SceneName, Readonly<Record<string, { x0: number; x1: number; y0: number; y1: number }>>>>> = {
  aquarium: {
    algas: { x0: 1400, x1: 1660, y0: 500, y1: 900 },
    cofre: { x0: 1119, x1: 1381, y0: 700, y1: 930 },
    piedras: { x0: 974, x1: 1636, y0: 846, y1: 926 },
  },
  sand: {
    piedras: { x0: 990, x1: 1640, y0: 888, y1: 950 },
    tronco: { x0: 1176, x1: 1470, y0: 870, y1: 948 },
    surco: { x0: 980, x1: 1642, y0: 760, y1: 852 },
  },
  monkeys: {
    sogas: { x0: 540, x1: 1460, y0: 110, y1: 700 },
    frutas: { x0: 1030, x1: 1490, y0: 770, y1: 960 },
  },
  path: {
    huellas: { x0: 690, x1: 1450, y0: 720, y1: 850 },
  },
  slope: {
    lana: { x0: 980, x1: 1370, y0: 130, y1: 200 },
  },
  forest: {
    flores: { x0: 980, x1: 1500, y0: 840, y1: 960 },
    panal: { x0: 1410, x1: 1550, y0: 150, y1: 330 },
    lianas: { x0: 440, x1: 1590, y0: 130, y1: 560 },
  },
  lagoon: {
    burbujas: { x0: 985, x1: 1500, y0: 760, y1: 870 },
  },
}

