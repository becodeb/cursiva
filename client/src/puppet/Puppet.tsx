// A character drawn in code. React renders the paper tree once, complete, so
// `renderToString` yields a finished still pose; after mount every frame only
// writes attributes through refs, on one shared ticker. React's props for those
// attributes never change, so a re-render never fights the animation.
import { useEffect, useImperativeHandle, useMemo, useRef, type CSSProperties, type Ref } from 'react'
import { actFor, actorNeedsTicks, createActor, holdAct, lookFromPointer, stepActor, type ActName, type Actor } from './actor'
import { getRig, puppetView, type PuppetName } from './characters'
import { computeFrame, partTransform, PAPER_SHADOW_TRANSFORM, type PaperNode, type PuppetFrame, type ViewBox } from './rig'
import { puppetTicker } from './ticker'

export interface PuppetAccessories {
  readonly cap?: boolean
  readonly apron?: boolean
  readonly lens?: boolean
  readonly bow?: boolean
}

/** Dressed as the prototype: cap and apron on, lens and bow put away. */
const DEFAULT_ACCESSORIES: Required<PuppetAccessories> = { cap: true, apron: true, lens: false, bow: false }

export interface PuppetHandle {
  act(name: ActName, seconds?: number): void
  hold(name: ActName, on: boolean): void
  /** Aim the eyes: each axis from -1 to 1. */
  lookAt(x: number, y: number): void
}

export interface PuppetProps {
  name: PuppetName
  ref?: Ref<PuppetHandle>
  /** Draw as a `<g>` filling this box of a parent `<svg>`, instead of a standalone `<svg>`. */
  box?: { x: number; y: number; width: number; height: number }
  /** Standalone only: rendered size, CSS px. Absent leaves sizing to CSS. */
  size?: { width: number; height: number }
  /** Standalone only: width over height of the box it must fill. Absent uses the figure's own. */
  aspect?: number
  /** No idle life at all: the pose a trace screen needs. It still reacts to acts. */
  still?: boolean
  accessories?: PuppetAccessories
  /** Palette overrides by key (`{ body: '#3e9a7f' }`), set as CSS variables. */
  colors?: Readonly<Record<string, string>>
  /** Plays once when it mounts. */
  entrance?: { act: ActName; seconds?: number }
  /** Held for as long as the prop says so. */
  holding?: ActName
  /** Eyes follow the child's finger. */
  followPointer?: boolean
  className?: string
  style?: CSSProperties
  /** Which registry picture this puppet stands in for, when it does. */
  artHref?: string
  seed?: number
}

function renderNodes(nodes: readonly PaperNode[], frame: PuppetFrame, hidden: ReadonlySet<string>) {
  return nodes.map((node, i) => {
    if (node.kind === 'group') {
      if (hidden.has(node.part)) return null
      const xf = frame.parts.get(node.part)
      return (
        <g key={i} data-part={node.part} transform={xf ? partTransform(xf) : undefined}>
          {renderNodes(node.children, frame, hidden)}
        </g>
      )
    }
    return (
      <path
        key={i}
        d={node.dyn !== null ? frame.dyn[node.dyn] : (node.d ?? undefined)}
        data-dyn={node.dyn ?? undefined}
        transform={node.shadow ? PAPER_SHADOW_TRANSFORM : undefined}
        style={node.style as CSSProperties}
      />
    )
  })
}

function prefersReducedMotion(): MediaQueryList | null {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)')
    : null
}

/** How far a finger must be, in units of the puppet's own size, for a full glance. */
const POINTER_REACH_FACTOR = 1.5

export default function Puppet({
  name,
  ref,
  box,
  size,
  aspect,
  still = false,
  accessories,
  colors,
  entrance,
  holding,
  followPointer = false,
  className,
  style,
  artHref,
  seed = 7,
}: PuppetProps) {
  const rig = getRig(name, seed)
  const dressed = { ...DEFAULT_ACCESSORIES, ...accessories }
  const hiddenKey = (Object.keys(dressed) as (keyof PuppetAccessories)[]).filter((k) => !dressed[k]).join(',')
  const hidden = useMemo(() => new Set(hiddenKey.split(',')), [hiddenKey])

  const actorRef = useRef<Actor | null>(null)
  // Every puppet starts on the canonical pose, so the server's markup and the
  // first client paint agree before the first tick. The name keeps two characters
  // on one screen from blinking in step.
  if (actorRef.current === null) actorRef.current = createActor(seed + name.length, holding)
  const actor = actorRef.current
  const firstFrame = useMemo(() => computeFrame(rig, createActor(seed, holding), true), [rig, seed, holding])
  const rootRef = useRef<SVGGElement | null>(null)
  const syncRef = useRef<() => void>(() => undefined)

  useEffect(() => {
    const root = rootRef.current
    if (!root) return undefined
    const parts = new Map<string, Element[]>()
    root.querySelectorAll('[data-part]').forEach((node) => {
      const part = node.getAttribute('data-part')
      if (!part) return
      const list = parts.get(part)
      if (list) list.push(node)
      else parts.set(part, [node])
    })
    const moving: { node: Element; dyn: number }[] = []
    root.querySelectorAll('[data-dyn]').forEach((node) => {
      moving.push({ node, dyn: Number(node.getAttribute('data-dyn')) })
    })

    const media = prefersReducedMotion()
    const isCalm = (): boolean => still || media?.matches === true
    const apply = (): void => {
      const frame = computeFrame(rig, actor, isCalm())
      root.setAttribute('transform', partTransform(frame.root))
      for (const [part, xf] of frame.parts) {
        const value = partTransform(xf)
        for (const node of parts.get(part) ?? []) node.setAttribute('transform', value)
      }
      for (const { node, dyn } of moving) node.setAttribute('d', frame.dyn[dyn])
    }

    let onScreen = true
    let stop: (() => void) | null = null
    const onTick = (dt: number): void => {
      stepActor(actor, dt, isCalm())
      apply()
      sync()
    }
    const sync = (): void => {
      const wanted = onScreen && actorNeedsTicks(actor, isCalm())
      if (wanted && !stop) {
        stop = puppetTicker.subscribe(onTick)
      } else if (!wanted && stop) {
        stop()
        stop = null
      }
    }
    syncRef.current = sync

    const onMotionChange = (): void => {
      stepActor(actor, 0, isCalm())
      apply()
      sync()
    }
    media?.addEventListener?.('change', onMotionChange)

    const observer =
      typeof IntersectionObserver === 'undefined'
        ? null
        : new IntersectionObserver((entries) => {
            onScreen = entries[entries.length - 1]?.isIntersecting ?? true
            sync()
          })
    observer?.observe(root)

    const onPointer = (event: PointerEvent): void => {
      const rect = root.getBoundingClientRect()
      const centre = { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 }
      const reach = Math.max(rect.width, rect.height) * POINTER_REACH_FACTOR
      const [x, y] = lookFromPointer(centre, { x: event.clientX, y: event.clientY }, reach)
      actor.lookGoal = [x, y]
      if (isCalm()) onMotionChange()
    }
    if (followPointer && !still) {
      window.addEventListener('pointermove', onPointer, { passive: true })
      window.addEventListener('pointerdown', onPointer, { passive: true })
    }

    stepActor(actor, 0, isCalm())
    apply()
    sync()
    return () => {
      stop?.()
      stop = null
      syncRef.current = () => undefined
      observer?.disconnect()
      media?.removeEventListener?.('change', onMotionChange)
      window.removeEventListener('pointermove', onPointer)
      window.removeEventListener('pointerdown', onPointer)
    }
    // `hidden` remounts part groups, so its nodes must be collected again.
  }, [rig, actor, still, followPointer, hidden])

  useEffect(() => {
    if (!holding) return undefined
    holdAct(actor, holding, true)
    syncRef.current()
    return () => {
      holdAct(actor, holding, false)
      syncRef.current()
    }
  }, [actor, holding])

  const entranceAct = entrance?.act
  const entranceSeconds = entrance?.seconds
  useEffect(() => {
    if (!entranceAct) return
    actFor(actor, entranceAct, entranceSeconds)
    syncRef.current()
  }, [actor, entranceAct, entranceSeconds])

  useImperativeHandle(
    ref,
    () => ({
      act(act, seconds) {
        actFor(actor, act, seconds)
        syncRef.current()
      },
      hold(act, on) {
        holdAct(actor, act, on)
        syncRef.current()
      },
      lookAt(x, y) {
        actor.lookGoal = [x, y]
        syncRef.current()
      },
    }),
    [actor],
  )

  const vars = useMemo(() => {
    const out: Record<string, string> = {}
    for (const [key, value] of Object.entries({ ...rig.palette, ...colors })) out[`--${key}`] = value
    return out as CSSProperties
  }, [rig, colors])

  const figure = (
    <g
      ref={rootRef}
      data-puppet={name}
      data-art={box ? artHref : undefined}
      className={box ? className : undefined}
      transform={partTransform(firstFrame.root)}
      style={vars}
    >
      {renderNodes(rig.nodes, firstFrame, hidden)}
    </g>
  )

  if (box) {
    const view = puppetView(name, box.width / box.height)
    const k = box.width / view.w
    return (
      <g
        transform={`translate(${(box.x - view.x * k).toFixed(2)} ${(box.y - view.y * k).toFixed(2)})scale(${k.toFixed(4)})`}
        aria-hidden="true"
        style={style}
      >
        {figure}
      </g>
    )
  }

  const view: ViewBox = puppetView(name, aspect ?? null)
  return (
    <svg
      viewBox={`${view.x.toFixed(1)} ${view.y.toFixed(1)} ${view.w.toFixed(1)} ${view.h.toFixed(1)}`}
      width={size?.width}
      height={size?.height}
      className={className ? `cv-puppet ${className}` : 'cv-puppet'}
      data-art={artHref}
      aria-hidden="true"
      focusable="false"
      // Acts reach past the rest pose (a raised arm, a hop): never crop them.
      style={{ overflow: 'visible', ...style }}
    >
      {figure}
    </svg>
  )
}
