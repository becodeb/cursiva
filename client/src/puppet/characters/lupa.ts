// The magnifying glass the child's finger carries, in the colours of the one the
// Pulpito holds. The glass only tints: whatever is under it shows through, with no
// mask. Its pivot is the middle of the glass, which is `CARRIER_LENS_ART`'s grip.
import { ell } from '../geometry'
import { PAPER_INK, PAPER_SHADOW_FILL, type RigBuilder, type RigUpdate } from '../rig'

export const LUPA_PALETTE = {
  ink: PAPER_INK,
  gold: '#f4b638',
  goldD: '#d9951c',
  handle: '#c97a2e',
  handleD: '#9c5a1d',
} as const

const CX = 117
const CY = 115
const RING = 96

export function drawLupa(p: RigBuilder): RigUpdate {
  p.cluster([
    { d: `M${CX - 14} 208L${CX + 14} 208L${CX + 22} 238L${CX - 22} 238Z`, c: 'goldD', part: 'tool' },
    { d: `M${CX - 16} 232L${CX + 16} 232C${CX + 18} 280 ${CX + 29} 316 ${CX + 29} 348C${CX + 29} 378 ${CX - 29} 378 ${CX - 29} 348C${CX - 29} 316 ${CX - 18} 280 ${CX - 16} 232Z`, c: 'handle', part: 'tool' },
  ])
  p.flat(`M${CX + 6} 240L${CX + 16} 240C${CX + 18} 282 ${CX + 27} 318 ${CX + 27} 348C${CX + 27} 360 ${CX + 18} 366 ${CX + 10} 366C${CX + 14} 330 ${CX + 8} 282 ${CX + 6} 240Z`, 'handleD', { part: 'tool' })
  // A translucent disc, then the ring as a stroke, so its hole is really a hole.
  p.flat(ell(CX, CY, RING - 8), 'rgba(167,224,218,.28)', { part: 'tool/glass', step: 7 })
  p.line(ell(CX + 3, CY + 6, RING), { part: 'tool', w: 28, c: PAPER_SHADOW_FILL })
  p.line(ell(CX, CY, RING), { part: 'tool', w: 28, c: 'gold' })
  p.line('M58 106Q62 70 96 56', { part: 'tool/glass', w: 11, c: '#ffffff' })

  return (pose, set) => {
    const { wave, cheer, sad, sleep, scare } = pose.a
    set('tool', {
      ox: CX,
      oy: CY,
      r: Math.sin(pose.t * (2 + wave * 9 + cheer * 12)) * (1 + wave * 14 + cheer * 12) + sad * 16 + sleep * 24 - scare * 6,
      y: sad * 6 + sleep * 8,
    })
  }
}
