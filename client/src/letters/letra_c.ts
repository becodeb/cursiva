import type { LetterConfig } from './types'
import { cArea } from './ideal_c'

// Paths extracted from Kalam-Regular (OFL, Google Fonts) glyph outlines,
// scaled into the middle ruled zone (Y 180–420, baseline 420) of viewBox
// 0 0 1000 600. c glyph analyzed by dense curve sampling:
//  - d: exterior contour = the natural single-pass ductus (demo + ideal line)
//  - guideD: full contour incl. counter-holes (evenodd fill for the guide)
//  - ideal: area point cloud (generated) — distance-based scoring target
export const letraC: LetterConfig = {
  id: 'letra_c',
  character: 'c',
  family: 'ola',
  baselineZone: 'media',
  // Anchors derived from the ductus bbox (left-right at the baseline of the
  // contour): entry = (minX, maxY), exit = (maxX, maxY) in viewBox space.
  anchors: {
    entry: { x: 412.62, y: 413.16 },
    exit: { x: 587.38, y: 413.16 },
  },
  theme: {
    backgroundColor: 'rgba(224, 242, 254, 0.4)',
    watermarkAssetSvg: '/assets/themes/mar_ola_c.svg',
  },
  pathDefinition: {
    d: 'M485.85 413.16 L485.85 413.16 Q459.16 413.16 435.89 392.40 Q412.62 371.63 412.62 343.12 Q412.62 314.60 431.79 277.19 Q450.95 239.77 481.29 213.31 Q511.63 186.84 540.38 186.84 Q559.09 186.84 573.23 203.73 Q587.38 220.61 587.38 233.38 Q587.38 237.03 585.09 239.54 Q582.81 242.05 578.48 242.05 Q574.14 242.05 563.19 233.84 Q552.24 225.63 543.57 225.63 Q518.93 225.63 486.08 268.97 Q453.23 312.32 453.23 344.71 Q453.23 358.86 462.13 367.07 Q471.03 375.29 490.87 375.29 Q510.72 375.29 527.38 370.49 Q544.03 365.70 553.15 360.91 Q562.28 356.12 567.30 356.12 Q575.97 356.12 575.97 364.79 Q575.97 378.02 544.26 395.59 Q512.55 413.16 485.85 413.16',
    guideD: 'M485.85 413.16 L485.85 413.16 Q459.16 413.16 435.89 392.40 Q412.62 371.63 412.62 343.12 Q412.62 314.60 431.79 277.19 Q450.95 239.77 481.29 213.31 Q511.63 186.84 540.38 186.84 Q559.09 186.84 573.23 203.73 Q587.38 220.61 587.38 233.38 Q587.38 237.03 585.09 239.54 Q582.81 242.05 578.48 242.05 Q574.14 242.05 563.19 233.84 Q552.24 225.63 543.57 225.63 Q518.93 225.63 486.08 268.97 Q453.23 312.32 453.23 344.71 Q453.23 358.86 462.13 367.07 Q471.03 375.29 490.87 375.29 Q510.72 375.29 527.38 370.49 Q544.03 365.70 553.15 360.91 Q562.28 356.12 567.30 356.12 Q575.97 356.12 575.97 364.79 Q575.97 378.02 544.26 395.59 Q512.55 413.16 485.85 413.16',
    ideal: cArea,
    strokeWidth: 14,
    checkpoints: [
  {
    "order": 1,
    "x": 485.8,
    "y": 413.2,
    "radius": 50,
    "name": "inicio_subida"
  },
  {
    "order": 2,
    "x": 412.6,
    "y": 343.1,
    "radius": 45,
    "name": "retorno_agua"
  },
  {
    "order": 3,
    "x": 540.4,
    "y": 186.8,
    "radius": 45,
    "name": "cresta_ola"
  },
  {
    "order": 4,
    "x": 587.4,
    "y": 233.4,
    "radius": 50,
    "name": "gancho_salida"
  },
  {
    "order": 5,
    "x": 544.3,
    "y": 395.6,
    "radius": 50,
    "name": "apoyo_tierra"
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
      id: 'trazo_tinta_c',
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
