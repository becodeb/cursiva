// The Pulpito's reaching arm: an arm of any length, from his body to wherever its
// tip has to be. Pure, like the rest of the engine: where the tip is at a given
// second is a function, so a test can walk a demonstration without a clock.
import { clamp, lerp, tubePath, type Vec } from './geometry'

/** His own body colour (`characters/pulpo.ts`), so it reads as one of his arms. */
export const TENTACLE_PAPER = '#f7682c'
const BASE_WIDTH = 11
const TIP_WIDTH = 4.5
const SAMPLES = 26
/** How far the arm bows, as a share of its reach. */
const BOW = 0.16

/** The arm's centre line: leaves his body, bows, and arrives at the tip. */
export function tentacleSpine(root: Vec, tip: Vec): Vec[] {
  const dx = tip[0] - root[0]
  const dy = tip[1] - root[1]
  const nx = -dy * BOW
  const ny = dx * BOW
  // Always bowing downward, the way a heavy arm hangs.
  const sign = ny >= 0 ? 1 : -1
  const out: Vec[] = []
  for (let i = 0; i <= SAMPLES; i++) {
    const s = i / SAMPLES
    const sag = Math.sin(s * Math.PI) * sign
    const curl = Math.sin(s * Math.PI * 2) * 0.3 * sign
    out.push([root[0] + dx * s + (nx * sag + ny * curl * 0.3), root[1] + dy * s + (ny * sag - nx * curl * 0.3)])
  }
  return out
}

export function tentacleOutline(root: Vec, tip: Vec): string {
  // A short reach must not be a stub thicker than it is long.
  const reach = Math.hypot(tip[0] - root[0], tip[1] - root[1])
  const base = Math.min(BASE_WIDTH, TIP_WIDTH + reach * 0.08)
  return tubePath(tentacleSpine(root, tip), (s) => lerp(base, TIP_WIDTH, s))
}

/** Where on a standing figure's box his arm comes out: the side facing `toward`. */
export function armRootOf(box: { x: number; y: number; width: number; height: number }, toward: { x: number; y: number }): Vec {
  const right = toward.x >= box.x + box.width / 2
  return [box.x + box.width * (right ? 0.7 : 0.3), box.y + box.height * 0.7]
}

const easeInOut = (t: number): number => t * t * (3 - 2 * t)
const mix = (a: Vec, b: Vec, t: number): Vec => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)]

export const REACH_SECONDS = 0.35

export type TentacleCueKind = 'hand' | 'wipe' | 'torch' | 'point'

export interface TentacleCue {
  readonly visual: TentacleCueKind
  readonly from: Vec
  readonly to: Vec
}

/** One slide, or a repeated pass for ground with no single target point. */
const CUE_SECONDS: Readonly<Record<TentacleCueKind, number>> = { hand: 2, wipe: 2.4, torch: 2.4, point: 1.6 }

/** The tip of an idle or restart cue, `t` seconds in. */
export function cueTipAt(cue: TentacleCue, root: Vec, t: number): Vec {
  if (cue.visual === 'point') {
    // It goes out to the spot and nods at it: "acá".
    if (t < REACH_SECONDS) return mix(root, cue.to, easeInOut(t / REACH_SECONDS))
    const nod = Math.sin(clamp((t - REACH_SECONDS) / CUE_SECONDS.point, 0, 1) * Math.PI * 4) * 7
    return [cue.to[0], cue.to[1] - Math.abs(nod)]
  }
  if (t < REACH_SECONDS) return mix(root, cue.from, easeInOut(t / REACH_SECONDS))
  const s = clamp((t - REACH_SECONDS) / CUE_SECONDS[cue.visual], 0, 1)
  if (cue.visual === 'hand') return mix(cue.from, cue.to, easeInOut(s))
  // Two passes there and back.
  const leg = s * 4
  const i = Math.min(3, Math.floor(leg))
  const f = easeInOut(leg - i)
  return i % 2 === 0 ? mix(cue.from, cue.to, f) : mix(cue.to, cue.from, f)
}

export interface DemoTiming {
  readonly delay: number
  readonly duration: number
}

/** Reads a point along the `index`th demonstration stroke, `fraction` of the way. */
export type DemoSampler = (index: number, fraction: number) => Vec

/** The tip of a demonstration `t` seconds in: it IS the pen. It draws each stroke
 *  at the stroke's own pace, and lifts across to the next one in the gap. */
export function demoTipAt(demos: readonly DemoTiming[], sample: DemoSampler, t: number): Vec {
  let previousEnd: Vec | null = null
  let previousEndAt = 0
  for (let i = 0; i < demos.length; i++) {
    const { delay, duration } = demos[i]
    if (t < delay) {
      const start = sample(i, 0)
      if (!previousEnd) return start
      return mix(previousEnd, start, easeInOut((t - previousEndAt) / Math.max(1e-3, delay - previousEndAt)))
    }
    if (t < delay + duration) return sample(i, (t - delay) / duration)
    previousEnd = sample(i, 1)
    previousEndAt = delay + duration
  }
  return previousEnd ?? [0, 0]
}
