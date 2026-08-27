import type { LetterConfig } from './types'
import { aArea } from './ideal_a'

// Paths extracted from Kalam-Regular (OFL, Google Fonts) glyph outlines,
// scaled into the middle ruled zone (Y 180–420, baseline 420) of viewBox
// 0 0 1000 600. a glyph analyzed by dense curve sampling:
//  - d: exterior contour = the natural single-pass ductus (demo + ideal line)
//  - guideD: full contour incl. counter-holes (evenodd fill for the guide)
//  - ideal: area point cloud (generated) — distance-based scoring target
export const letraA: LetterConfig = {
  id: 'letra_a',
  character: 'a',
  family: 'ola',
  baselineZone: 'media',
  theme: {
    backgroundColor: 'rgba(224, 242, 254, 0.4)',
    watermarkAssetSvg: '/assets/themes/mar_ola_a.svg',
  },
  pathDefinition: {
    d: 'M538.56 186.84 L538.56 186.84 Q559.09 186.84 576.42 207.60 Q593.77 228.37 593.77 245.02 Q593.77 261.67 582.36 279.01 Q587.84 285.86 587.84 290.87 Q587.84 303.65 582.13 334.68 Q576.42 365.70 575.29 375.29 Q574.14 384.87 573.24 390.57 Q572.32 396.27 570.95 401.75 Q569.13 413.16 562.74 413.16 Q554.53 413.16 549.28 398.78 Q544.03 384.41 543.12 361.60 Q502.51 413.16 467.84 413.16 Q446.85 413.16 426.54 395.13 Q406.24 377.11 406.24 357.95 Q406.24 330.57 426.32 290.19 Q446.39 249.81 478.33 218.33 Q510.27 186.84 538.56 186.84',
    guideD: 'M538.56 186.84 L538.56 186.84 Q559.09 186.84 576.42 207.60 Q593.77 228.37 593.77 245.02 Q593.77 261.67 582.36 279.01 Q587.84 285.86 587.84 290.87 Q587.84 303.65 582.13 334.68 Q576.42 365.70 575.29 375.29 Q574.14 384.87 573.24 390.57 Q572.32 396.27 570.95 401.75 Q569.13 413.16 562.74 413.16 Q554.53 413.16 549.28 398.78 Q544.03 384.41 543.12 361.60 Q502.51 413.16 467.84 413.16 Q446.85 413.16 426.54 395.13 Q406.24 377.11 406.24 357.95 Q406.24 330.57 426.32 290.19 Q446.39 249.81 478.33 218.33 Q510.27 186.84 538.56 186.84 M559.55 267.60 L559.55 267.60 L559.55 267.15 Q559.55 224.71 542.65 224.71 Q524.87 224.71 501.14 250.04 Q477.42 275.36 460.99 307.30 Q444.57 339.24 444.57 357.95 Q444.57 365.70 450.95 370.49 Q457.34 375.29 466.01 375.29 Q487.46 375.29 514.38 346.31 Q541.30 317.34 551.79 275.82 Q553.15 268.97 559.55 267.60',
    ideal: aArea,
    strokeWidth: 14,
    checkpoints: [
  {
    "order": 1,
    "x": 467.8,
    "y": 413.2,
    "radius": 50,
    "name": "inicio_enganche"
  },
  {
    "order": 2,
    "x": 406.2,
    "y": 357.9,
    "radius": 45,
    "name": "subida_ola"
  },
  {
    "order": 3,
    "x": 538.6,
    "y": 186.8,
    "radius": 45,
    "name": "cresta_ola"
  },
  {
    "order": 4,
    "x": 593.8,
    "y": 245,
    "radius": 50,
    "name": "gancho_salida"
  },
  {
    "order": 5,
    "x": 562.7,
    "y": 413.2,
    "radius": 45,
    "name": "bajada_pie"
  },
  {
    "order": 6,
    "x": 467.8,
    "y": 413.2,
    "radius": 50,
    "name": "cierre_ovalo"
  }
],
  },
  animationTimeline: [
    {
      id: 'sube_mar_base',
      type: 'slide_in',
      target: 'background_theme',
      duration: 600,
      properties: { y: [100, 0], opacity: [0, 0.8] },
    },
    {
      id: 'trazo_tinta_a',
      type: 'draw_path',
      target: 'ink_demonstration',
      delay: 1000,
      duration: 1200,
    },
    {
      id: 'desvanecer_a_guia',
      type: 'fade_out',
      target: 'thematic_asset',
      delay: 2400,
      duration: 600,
      properties: { opacity: 0.08 },
    },
  ],
}
