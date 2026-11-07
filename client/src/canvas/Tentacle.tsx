// The Pulpito's arm on the sheet: it draws the demonstration, shows a stuck child
// how to go on, and points back at the start after a restart. It never moves while
// the child draws: the demonstration ends at the first touch, the other cues wait
// for an idle sheet or follow the finger's own contact.
import { useEffect, useRef, useState } from 'react'
import { demoTipAt, cueTipAt, TENTACLE_PAPER, tentacleOutline, type DemoTiming, type TentacleCue } from '../puppet/tentacle'
import type { Vec } from '../puppet/geometry'
import { PAPER_SHADOW_FILL, PAPER_SHADOW_TRANSFORM } from '../puppet/rig'
import { puppetTicker } from '../puppet/ticker'

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false
}

/** The two papers of the arm, redrawn together. */
function useArmPaths(root: Vec, tipAt: ((t: number) => Vec) | null) {
  const paper = useRef<SVGPathElement | null>(null)
  const shadow = useRef<SVGPathElement | null>(null)
  // A parent re-render hands over an equal root: that must not restart the arm.
  const rootRef = useRef(root)
  rootRef.current = root
  useEffect(() => {
    if (!tipAt) return undefined
    const draw = (t: number): void => {
      const d = tentacleOutline(rootRef.current, tipAt(t))
      paper.current?.setAttribute('d', d)
      shadow.current?.setAttribute('d', d)
    }
    // Real seconds, not summed ticks: the ticker caps a slow frame's step, and the
    // tip must stay on the stroke framer-motion is drawing against the real clock.
    const began = performance.now()
    draw(0)
    return puppetTicker.subscribe(() => draw((performance.now() - began) / 1000))
  }, [tipAt])
  return { paper, shadow }
}

function ArmPaper({ arm, d }: { arm: ReturnType<typeof useArmPaths>; d?: string }) {
  return (
    <>
      <path ref={arm.shadow} d={d} fill={PAPER_SHADOW_FILL} transform={PAPER_SHADOW_TRANSFORM} />
      <path ref={arm.paper} d={d} fill={TENTACLE_PAPER} />
    </>
  )
}

export interface TentacleCueArmProps {
  root: Vec
  cue: TentacleCue
  reducedMotion: boolean
}

/** Keyed by the caller per occurrence: a new cue plays from its beginning. */
export function TentacleCueArm({ root, cue, reducedMotion }: TentacleCueArmProps) {
  const [tipAt] = useState(() => (t: number) => cueTipAt(cue, root, t))
  const arm = useArmPaths(root, reducedMotion ? null : tipAt)
  const still = reducedMotion ? cue.to : cue.from
  return (
    <g pointerEvents="none" data-idle-cue={cue.visual} data-tentacle-tip={`${still[0]} ${still[1]}`}>
      <ArmPaper arm={arm} d={tentacleOutline(root, still)} />
    </g>
  )
}

export interface TentacleDemoArmProps {
  root: Vec
  demos: readonly (DemoTiming & { readonly d: string; readonly strokeWidth: number })[]
  strokeColour: string
}

/** The stroke and the arm that draws it, on one clock: the tip is exactly where
 *  the stroke has reached. Evenly paced, so the speed it shows is a speed to copy. */
export function TentacleDemoArm({ root, demos, strokeColour }: TentacleDemoArmProps) {
  const strokes = useRef<(SVGPathElement | null)[]>([])
  const [calm] = useState(prefersReducedMotion)
  const [tipAt] = useState(() => (t: number) => {
    const at = calm ? Infinity : t
    demos.forEach((demo, i) => {
      const shown = Math.max(0, Math.min(1, (at - demo.delay) / demo.duration))
      strokes.current[i]?.setAttribute('stroke-dashoffset', (1 - shown).toFixed(4))
      strokes.current[i]?.setAttribute('opacity', shown > 0 ? '1' : '0')
    })
    const sample = (index: number, fraction: number): Vec => {
      const path = strokes.current[index]
      if (!path || typeof path.getTotalLength !== 'function') return root
      const point = path.getPointAtLength(path.getTotalLength() * fraction)
      return [point.x, point.y]
    }
    return demoTipAt(demos, sample, at)
  })
  const arm = useArmPaths(root, tipAt)
  return (
    <g pointerEvents="none" data-tentacle-demo="">
      {/* Under the blue line: the arm draws it and never covers what it has drawn. */}
      <ArmPaper arm={arm} />
      {demos.map((demo, i) => (
        <path
          key={i}
          ref={(node) => {
            strokes.current[i] = node
          }}
          d={demo.d}
          fill="none"
          stroke={strokeColour}
          strokeWidth={demo.strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength={1}
          strokeDasharray="1 1"
          strokeDashoffset={1}
          opacity={0}
        />
      ))}
    </g>
  )
}
