// A character drawn in code. React renders the paper tree once, complete, so
// `renderToString` yields a finished still pose; after mount every frame only
// writes attributes through refs, on one shared ticker. React's props for those
// attributes never change, so a re-render never fights the animation.
import { useEffect, useImperativeHandle, useMemo, useRef, type CSSProperties, type Ref } from 'react'
import { actFor, actorNeedsTicks, createActor, holdAct, lookFromPointer, setActorState, stepActor, type ActName, type Actor, type RigState } from './actor'
import { getRig, puppetView, type PuppetName } from './characters'
import {
  computeFrame,
  partTransform,
  PAPER_SHADOW_TRANSFORM,
  placementCss,
  placementTransform,
  type PaperNode,
  type PuppetFrame,
  type PuppetPlacement,
  type ViewBox,
} from './rig'
import { puppetTicker } from './ticker'

export interface PuppetAccessories {
  readonly cap?: boolean
  readonly apron?: boolean
  readonly lens?: boolean
  readonly bow?: boolean
  /** The tint in the lupa's ring. Off for the screen-change glass, which ends up
   *  covering the whole screen and has to be truly empty. */
  readonly glass?: boolean
}

/** Dressed as the prototype: cap and apron on, lens and bow put away. */
const DEFAULT_ACCESSORIES: Required<PuppetAccessories> = { cap: true, apron: true, lens: false, bow: false, glass: true }

export interface PuppetHandle {
  act(name: ActName, seconds?: number): void
  hold(name: ActName, on: boolean): void
  /** Aim the eyes: each axis from -1 to 1. */
  lookAt(x: number, y: number): void
  /** Stand somewhere else, without React: safe to call every frame of a walk. */
  place(placement: PuppetPlacement): void
  /** Ease the rig to a new state, such as a hedgehog uncurling. */
  setState(values: RigState): void
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
  /** What the rig is: the hedgehog's curl, the snake's length. */
  state?: RigState
  /** Where it stands on the first paint; `PuppetHandle.place` moves it after that. */
  placement?: PuppetPlacement
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

/** The middle of the feet: what a placement turns about. */
const feet = (box: { x: number; y: number; width: number; height: number }) => ({ x: box.x + box.width / 2, y: box.y + box.height })

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
  state,
  placement,
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
  if (actorRef.current === null) actorRef.current = createActor(seed + name.length, holding, state)
  const actor = actorRef.current
  const stateKey = state ? JSON.stringify(state) : ''
  const firstFrame = useMemo(
    () => computeFrame(rig, createActor(seed, holding, stateKey ? (JSON.parse(stateKey) as RigState) : undefined), true),
    [rig, seed, holding, stateKey],
  )
  const rootRef = useRef<SVGGElement | null>(null)
  const placedRef = useRef<SVGGElement | null>(null)
  const svgRef = useRef<SVGSVGElement | null>(null)
  const facingRef = useRef<1 | -1>(placement?.facing ?? 1)
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
    const isSnapped = (): boolean => media?.matches === true
    const isCalm = (): boolean => still || isSnapped()
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
      stepActor(actor, dt, isCalm(), isSnapped())
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
      stepActor(actor, 0, isCalm(), isSnapped())
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
      actor.lookGoal = [x * facingRef.current, y]
      if (isCalm()) onMotionChange()
    }
    if (followPointer && !still) {
      window.addEventListener('pointermove', onPointer, { passive: true })
      window.addEventListener('pointerdown', onPointer, { passive: true })
    }

    stepActor(actor, 0, isCalm(), isSnapped())
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

  useEffect(() => {
    if (!stateKey) return
    setActorState(actor, JSON.parse(stateKey) as RigState)
    syncRef.current()
  }, [actor, stateKey])

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
        actor.lookGoal = [x * facingRef.current, y]
        syncRef.current()
      },
      place(next) {
        facingRef.current = next.facing ?? 1
        if (placedRef.current && box) placedRef.current.setAttribute('transform', placementTransform(next, feet(box)))
        if (svgRef.current) svgRef.current.style.transform = placementCss(next)
      },
      setState(values) {
        setActorState(actor, values)
        syncRef.current()
      },
    }),
    [actor, box],
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
    const view = puppetView(name, box.width / box.height, state)
    const k = box.width / view.w
    return (
      <g ref={placedRef} transform={placement ? placementTransform(placement, feet(box)) : undefined}>
        <g
          transform={`translate(${(box.x - view.x * k).toFixed(2)} ${(box.y - view.y * k).toFixed(2)})scale(${k.toFixed(5)})`}
          aria-hidden="true"
          style={style}
        >
          {figure}
        </g>
      </g>
    )
  }

  const view: ViewBox = puppetView(name, aspect ?? null, state)
  return (
    <svg
      ref={svgRef}
      viewBox={`${view.x.toFixed(1)} ${view.y.toFixed(1)} ${view.w.toFixed(1)} ${view.h.toFixed(1)}`}
      width={size?.width}
      height={size?.height}
      className={className ? `cv-puppet ${className}` : 'cv-puppet'}
      data-art={artHref}
      aria-hidden="true"
      focusable="false"
      // Acts reach past the rest pose (a raised arm, a hop): never crop them.
      style={{ overflow: 'visible', transformOrigin: '50% 100%', ...(placement ? { transform: placementCss(placement) } : null), ...style }}
    >
      {figure}
    </svg>
  )
}
