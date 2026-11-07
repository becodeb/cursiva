// The fish: a round body and fins that do the talking. Its own trick is to puff up
// like a balloon with a fright, every fin standing straight out.
import { ell } from '../geometry'
import { PAPER_INK, type RigBuilder, type RigUpdate } from '../rig'
import { browPath, mouthPath } from './face'
import { blob, line } from './shapes'

export const PEZ_PALETTE = {
  ink: PAPER_INK,
  body: '#fb8a1e',
  fin: '#e8620f',
  finD: '#c94e08',
  belly: '#ffc56b',
  gill: '#d9620c',
  pink: '#ffa98c',
} as const

export function drawPez(p: RigBuilder): RigUpdate {
  // Lobed fins, soft like the fish itself: a sharp fin reads as a shark.
  p.cluster([{ d: blob([130, 182], [84, 136], [42, 92], [8, 96], [8, 136], [38, 180], [8, 226], [8, 266], [46, 268], [88, 226]), c: 'fin', part: 'tailFin' }])
  p.line(line(40, 124, 74, 150, 104, 174), { part: 'tailFin', w: 7, c: 'finD' })
  p.line(line(40, 238, 74, 212, 104, 190), { part: 'tailFin', w: 7, c: 'finD' })
  p.cluster([{ d: blob([156, 128], [176, 74], [226, 58], [206, 34], [226, 16], [276, 28], [300, 8], [330, 42], [336, 110]), c: 'fin', part: 'dorsal' }])
  p.cluster([{ d: blob([206, 272], [196, 306], [212, 340], [244, 346], [266, 318], [284, 276]), c: 'finD', part: 'anal' }])

  p.cluster([{ d: blob([112, 184], [160, 118], [250, 80], [346, 86], [418, 128], [430, 166], [448, 196], [426, 228], [388, 256], [320, 284], [226, 286], [156, 250]), c: 'body', part: 'plump' }])
  p.flat(blob([160, 252], [240, 240], [330, 240], [396, 250], [320, 284], [226, 286]), 'belly', { part: 'plump' })
  p.line(line(304, 124, 274, 176, 304, 230), { part: 'plump', w: 8, c: 'gill' })
  p.flat(ell(338, 216, 17, 11), 'pink', { part: 'plump' })
  p.eye('eye', 366, 158, 28, { part: 'plump', ry: 32 })
  p.line(browPath(330, 112, 390, 104), { part: 'plump/brow', w: 8 })
  p.mouth(mouthPath(404, 216, 19), { part: 'plump', w: 7 })
  p.cluster([{ d: blob([262, 184], [222, 190], [190, 216], [196, 244], [236, 240], [274, 214]), c: 'fin', part: 'plump/pectoral' }])

  return (pose, set) => {
    const { wave, cheer, scare, sad, sleep } = pose.a
    const beat = Math.sin(pose.t * (3 + wave * 10 + cheer * 14))
    set('tailFin', { ox: 124, oy: 180, sx: 1 - scare * 0.1, r: beat * (5 + wave * 16 + cheer * 20) + sad * 16 + sleep * 8 })
    set('dorsal', { ox: 240, oy: 104, r: beat * 3 - sad * 20 - sleep * 16 + scare * 6, y: -scare * 14 + sad * 12 })
    set('anal', { ox: 232, oy: 268, r: -beat * 4 + sad * 12, y: scare * 14 })
    set('pectoral', { ox: 262, oy: 190, r: Math.sin(pose.t * (3 + cheer * 22 + wave * 14)) * (6 + cheer * 28 + wave * 18) - sad * 18 + scare * 32 })
    const puff = 1 + scare * 0.16 + pose.breath * 0.01
    set('plump', { ox: 280, oy: 186, sx: puff, sy: puff * (1 + scare * 0.1), r: pose.look[0] * 2 + sad * 10 + sleep * 8 })
    set('brow', { y: -scare * 3 })
  }
}
