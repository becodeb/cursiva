// The turtle: a high shell and a head on a long neck. Her own trick is to pull
// neck and legs into the shell, slowly with sleep and fast with a fright.
import { ell, lerp, rad, spine, tubePath, type Vec } from '../geometry'
import { PAPER_INK, type DynamicPath, type RigBuilder, type RigUpdate } from '../rig'
import type { Pose } from '../actor'
import { browPath, mouthPath } from './face'
import { blob } from './shapes'

export const TORTUGA_PALETTE = {
  ink: PAPER_INK,
  skin: '#74c63f',
  skinD: '#4f9e2a',
  shell: '#25583c',
  rim: '#74c63f',
  pink: '#ff9e94',
} as const

/** How far she is inside the shell: 0 out, 1 gone. */
const tuckOf = (pose: Pose): number => Math.max(pose.a.scare, pose.a.sleep * 0.9)

function neckSpine(pose: Pose): Vec[] {
  const tuck = tuckOf(pose)
  const { cheer, sad, wave } = pose.a
  return spine({
    x: 280,
    y: 196,
    a: rad(-30 + sad * 30 + Math.sin(pose.t * 7.5) * 6 * cheer + Math.sin(pose.t * 5) * 4 * wave),
    L: lerp(150, 24, tuck) * (1 + cheer * 0.08),
    n: 12,
    bend: rad(-50 + sad * 40),
  })
}

const neck: DynamicPath = (pose) => tubePath(neckSpine(pose), (s) => lerp(44, 32, s))

const leg = (x: number, c: string, part: string) => [
  { d: `M${x - 30} 212L${x + 26} 212C${x + 30} 240 ${x + 50} 254 ${x + 56} 272C${x + 56} 288 ${x + 30} 290 ${x} 290C${x - 30} 290 ${x - 58} 288 ${x - 58} 272C${x - 52} 254 ${x - 32} 240 ${x - 30} 212Z`, c, part },
]

export function drawTortuga(p: RigBuilder): RigUpdate {
  p.cluster(leg(150, 'skinD', 'legFarB'))
  p.cluster(leg(214, 'skinD', 'legFarF'))
  p.cluster([{ d: 'M44 196C28 200 12 210 2 234C18 240 42 234 62 216Z', c: 'skin', part: 'tailT' }])
  p.cluster(leg(84, 'skin', 'legB'))
  p.cluster(leg(272, 'skin', 'legF'))
  p.cluster([{ d: neck, c: 'skin' }])

  // The head first, so the shell can swallow it.
  p.cluster([{ d: blob([-62, -8], [-40, -54], [8, -72], [52, -50], [64, -16], [84, 6], [66, 32], [28, 44], [-24, 44], [-54, 28]), c: 'skin', part: 'skull' }])
  p.flat(ell(-22, 18, 15, 9), 'pink', { part: 'skull' })
  p.eye('eye', 16, -14, 25, { part: 'skull', ry: 29 })
  p.line(browPath(-14, -54, 40, -62), { part: 'skull/brow', w: 7 })
  p.mouth(mouthPath(44, 22, 18), { part: 'skull', w: 6 })

  // Dark plates on a light shell: the shell is what you recognise at 48px.
  p.cluster([{ d: 'M36 200C38 96 104 24 180 24C256 24 310 96 314 200C240 220 110 220 36 200Z', c: 'rim', part: 'shellBody' }])
  for (const d of [
    blob([168, 46], [168, 108], [76, 116], [96, 72], [128, 52]),
    blob([184, 46], [184, 108], [276, 116], [256, 72], [222, 52]),
    blob([168, 122], [168, 190], [70, 186], [64, 156], [70, 130]),
    blob([184, 122], [184, 190], [282, 186], [288, 156], [282, 130]),
  ]) {
    p.flat(d, 'shell', { part: 'shellBody' })
  }
  p.cluster([{ d: 'M22 192C100 214 252 214 330 192C344 202 338 222 320 226C240 238 110 238 32 226C14 222 8 202 22 192Z', c: 'skin', part: 'shellBody' }])

  return (pose, set) => {
    const { wave, cheer, sad, sleep, scare } = pose.a
    const tuck = tuckOf(pose)
    const tip = neckSpine(pose)[12]
    const k = lerp(1, 0.82, tuck)
    set('skull', { x: tip[0], y: tip[1], sx: k, sy: k, r: pose.look[0] * 4 + sad * 22 + Math.sin(pose.t * 7.5) * 4 * cheer })
    set('brow', { y: -scare * 3 })
    const walk = Math.sin(pose.t * 8) * wave
    const stand = (name: string, x: number, sign: 1 | -1, far = 0): void =>
      set(name, {
        ox: x,
        oy: 214,
        sy: lerp(1, 0.5, tuck),
        x: walk * 10 * sign,
        y: -Math.max(0, walk * sign) * 8,
        r: far,
      })
    stand('legF', 272, 1)
    stand('legFarB', 150, 1)
    stand('legFarF', 214, -1)
    stand('legB', 84, -1)
    set('tailT', { ox: 50, oy: 206, r: Math.sin(pose.t * (3 + wave * 8 + cheer * 14)) * (3 + wave * 10 + cheer * 16), sx: lerp(1, 0.55, tuck) })
    set('shellBody', { ox: 176, oy: 226, y: tuck * 36 + sad * 6 - Math.abs(walk) * 2, r: Math.sin(pose.t * 8) * 1.2 * wave + sleep * -1 })
  }
}
