// The jellyfish: a bell on soft tentacles. Her own trick is the pulse, the bell
// squeezing and the tentacles trailing it, faster when she is happy.
import { ell, lerp, rad, spine, tubePath } from '../geometry'
import { PAPER_INK, type DynamicPath, type RigBuilder, type RigUpdate } from '../rig'
import type { Pose } from '../actor'
import { browPath, mouthPath } from './face'
import { blob } from './shapes'

export const MEDUSA_PALETTE = {
  ink: PAPER_INK,
  bell: '#f764b4',
  bellL: '#fb9bd0',
  arm: '#f764b4',
  armD: '#cf3f91',
  pink: '#ffc6dd',
  mouthIn: '#8f1f55',
} as const

const armWidth = (s: number): number => lerp(22, 13, s)
const pulseOf = (pose: Pose): number => Math.sin(pose.t * (2.2 + pose.a.cheer * 7 + pose.a.wave * 3))

/** Base x, length, wave phase. A fan with no crossings: each arm stays in its lane. */
type ArmDef = readonly [x: number, length: number, phase: number]

const arm = ([x, L, ph]: ArmDef, waver = false): DynamicPath => (pose) => {
  const { wave, cheer, scare, sad, sleep } = pose.a
  const out = x < 178 ? 1 : -1
  const flare = scare * 34 + cheer * 8 + pulseOf(pose) * 3 - sad * 10 - sleep * 6
  const lift = waver ? wave * 124 : 0
  return tubePath(
    spine({
      x,
      y: 196 + sleep * 8 + sad * 6,
      a: rad(90 + out * (Math.abs(x - 178) * 0.06 + flare + lift)),
      L: L * (1 - scare * 0.1),
      n: 22,
      sway: out * (0.75 + (waver ? wave * 0.5 : 0)) * (1 - sad * 0.7 - sleep * 0.5 - scare * 0.6),
      t: pose.t * (2.2 + wave * 5),
      ph,
    }),
    armWidth,
  )
}

export function drawMedusa(p: RigBuilder): RigUpdate {
  p.cluster([{ d: arm([102, 124, 1.1]), c: 'armD' }])
  p.cluster([{ d: arm([254, 124, 1.1]), c: 'armD' }])
  p.cluster([{ d: arm([60, 176, 0.4], true), c: 'arm' }])
  p.cluster([{ d: arm([140, 176, 0.9]), c: 'arm' }])
  p.cluster([{ d: arm([216, 176, 0.9]), c: 'arm' }])
  p.cluster([{ d: arm([296, 176, 0.4]), c: 'arm' }])

  p.cluster([{ d: 'M178 4C278 4 352 84 354 184C354 212 330 226 304 214C286 240 252 240 234 216C216 240 190 240 178 216C164 240 136 240 122 216C104 240 72 240 54 214C28 226 2 212 4 184C6 84 78 4 178 4Z', c: 'bell', part: 'dome' }])
  p.flat(blob([62, 96], [104, 48], [150, 28], [122, 70], [84, 112]), 'bellL', { part: 'dome' })
  p.flat(ell(286, 74, 13, 15), 'bellL', { part: 'dome' })
  p.flat(ell(70, 176, 18, 11), 'pink', { part: 'dome' })
  p.flat(ell(286, 176, 18, 11), 'pink', { part: 'dome' })
  p.eye('eyeL', 118, 128, 29, { part: 'dome', ry: 31 })
  p.eye('eyeR', 238, 128, 29, { part: 'dome', ry: 31 })
  p.line(browPath(86, 86, 138, 78), { part: 'dome/brows', w: 8 })
  p.line(browPath(270, 86, 218, 78), { part: 'dome/brows', w: 8 })
  p.mouth(mouthPath(178, 178, 27), { part: 'dome', c: 'mouthIn' })

  return (pose, set) => {
    const pulse = pulseOf(pose)
    const { scare, sad, sleep } = pose.a
    const sq = 1 + pulse * 0.035 * (1 - sleep * 0.6) - scare * 0.1
    set('dome', { ox: 178, oy: 200, sx: 1 / sq, sy: sq - sad * 0.05 - sleep * 0.05, y: sad * 8 + sleep * 8 + pose.breath * 0.5 })
    set('brows', { y: -scare * 3 })
  }
}
