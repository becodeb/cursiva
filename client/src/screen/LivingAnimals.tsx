// The rescued animals, alive on the map (`docs/18` §7 P6). One small controller on the
// shared ticker moves a few of them at a time; the others stand `still` and cost nothing.
// Everything it writes goes straight to attributes, so the map never re-renders for it.
// Reduced motion: nobody walks, a tap still gets a reaction and the name.
import { useEffect, useRef, useState, type RefObject } from 'react'
import { playSfx } from '../audio/sfx'
import type { ArtImage, ZooAnimalId } from '../detective/assets'
import { ArtInSvg } from '../puppet/ArtFigure'
import type { PuppetHandle } from '../puppet/Puppet'
import { puppetTicker } from '../puppet/ticker'
import { canAutoSpeak, speak } from '../voice/narrator'
import { ANIMAL_LIFE, joyHop, layLine, lifePose, movingAt, type Box, type LifePose, AT_REST } from '../zoo/mapLife'
import { smoothStrokePath, type TracedLine, type TracedPoint } from '../zoo/tracedLine'

export interface LivingAnimal {
  readonly id: ZooAnimalId
  readonly art: ArtImage
  readonly box: Box
  /** The child's line for this family, when there is one. */
  readonly line?: TracedLine | null
}

const TAP_HOP_SECONDS = 0.7
const ARRIVAL_HOP_SECONDS = 1.3

interface Entry {
  readonly animal: LivingAnimal
  readonly route?: readonly (readonly TracedPoint[])[]
  handle: PuppetHandle | null
  hit: SVGGElement | null
  /** Seconds left of a hop of joy, and how long it is. */
  hop: number
  hopLength: number
  hopDelay: number
  still: (still: boolean) => void
}

export class MapLife {
  private readonly entries = new Map<ZooAnimalId, Entry>()
  private readonly ids: readonly ZooAnimalId[]
  private clock = 0
  private stop: (() => void) | null = null
  private paused = false
  private moving = new Set<ZooAnimalId>()

  constructor(animals: readonly LivingAnimal[], private readonly calm: () => boolean) {
    this.ids = animals.map((a) => a.id)
    for (const animal of animals) {
      const route = animal.line && ANIMAL_LIFE[animal.id].onLine ? layLine(animal.line, animal.box) : undefined
      this.entries.set(animal.id, { animal, route, handle: null, hit: null, hop: 0, hopLength: 0, hopDelay: 0, still: () => undefined })
    }
  }

  connect(id: ZooAnimalId, part: { handle?: PuppetHandle | null; hit?: SVGGElement | null; still?: (still: boolean) => void }): void {
    const entry = this.entries.get(id)
    if (!entry) return
    if (part.handle !== undefined) entry.handle = part.handle
    if (part.hit !== undefined) entry.hit = part.hit
    if (part.still) entry.still = part.still
  }

  /** The map is covered: nothing moves under an overlay. */
  setPaused(paused: boolean): void {
    this.paused = paused
    this.sync()
  }

  start(): void {
    this.sync()
  }

  dispose(): void {
    this.stop?.()
    this.stop = null
  }

  /** Comes home with a hop, once the flight has landed. */
  arrive(id: ZooAnimalId, delaySeconds: number): void {
    const entry = this.entries.get(id)
    if (!entry || this.calm()) return
    entry.hopDelay = delaySeconds
    entry.hop = ARRIVAL_HOP_SECONDS
    entry.hopLength = ARRIVAL_HOP_SECONDS
    this.sync()
  }

  tap(id: ZooAnimalId): void {
    const entry = this.entries.get(id)
    if (!entry) return
    playSfx('tap')
    entry.handle?.act('cheer', 1.4)
    if (canAutoSpeak()) speak(`¡${ANIMAL_LIFE[id].name}!`)
    if (this.calm()) return
    entry.hopDelay = 0
    entry.hop = TAP_HOP_SECONDS
    entry.hopLength = TAP_HOP_SECONDS
    this.sync()
  }

  private needsTicks(): boolean {
    if (this.paused || this.calm()) return false
    return this.ids.length > 0
  }

  private sync(): void {
    const wanted = this.needsTicks()
    if (wanted && !this.stop) this.stop = puppetTicker.subscribe((dt) => this.step(dt))
    else if (!wanted && this.stop) {
      this.stop()
      this.stop = null
      // Whoever was moving goes back to its spot and stands still.
      for (const id of this.moving) this.write(this.entries.get(id)!, AT_REST)
      for (const id of this.moving) this.entries.get(id)!.still(true)
      this.moving = new Set()
    }
  }

  private write(entry: Entry, pose: LifePose): void {
    const looks = ANIMAL_LIFE[entry.animal.id].looks
    entry.handle?.place({ x: pose.x, y: pose.y, facing: pose.facing === undefined || pose.facing === looks ? 1 : -1, tilt: pose.tilt })
    entry.hit?.setAttribute('transform', `translate(${pose.x.toFixed(1)} ${pose.y.toFixed(1)})`)
  }

  private step(dt: number): void {
    this.clock += dt
    const turns = movingAt(this.clock, this.ids)
    const now = new Set(turns.map((turn) => turn.id))
    for (const id of this.moving) {
      if (!now.has(id)) {
        this.entries.get(id)!.still(true)
        this.write(this.entries.get(id)!, AT_REST)
      }
    }
    for (const id of now) if (!this.moving.has(id)) this.entries.get(id)!.still(false)
    this.moving = now
    const timeOf = new Map(turns.map((turn) => [turn.id, turn.t]))
    for (const entry of this.entries.values()) {
      const id = entry.animal.id
      const t = timeOf.get(id)
      const hopping = entry.hop > 0
      if (t === undefined && !hopping) continue
      const pose = t === undefined ? AT_REST : lifePose(ANIMAL_LIFE[id].kind, t, entry.animal.box, entry.route)
      let lift = 0
      if (hopping) {
        if (entry.hopDelay > 0) entry.hopDelay -= dt
        else {
          entry.hop = Math.max(0, entry.hop - dt)
          lift = joyHop(entry.hopLength - entry.hop, entry.hopLength, entry.animal.box.height * 0.28)
        }
      }
      this.write(entry, { ...pose, y: pose.y + lift })
    }
  }
}

function prefersCalm(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** One controller for a map visit. `key` rebuilds it when the set of animals changes. */
export function useMapLife(animals: readonly LivingAnimal[], key: string): MapLife {
  const ref = useRef<{ key: string; life: MapLife } | null>(null)
  if (ref.current?.key !== key) {
    ref.current?.life.dispose()
    ref.current = { key, life: new MapLife(animals, prefersCalm) }
  }
  const life = ref.current.life
  useEffect(() => {
    life.start()
    return () => life.dispose()
  }, [life])
  return life
}

/** Where the line a family's child drew stays on the map: a keepsake of cut ribbon. */
export function KeepsakeLine({ animal }: { animal: LivingAnimal }) {
  const line = animal.line
  if (!line) return null
  const strokes = layLine(line, animal.box)
  return (
    <g data-map-keepsake={animal.id} aria-hidden="true" pointerEvents="none">
      {strokes.map((stroke, i) => (
        <g key={i}>
          <path d={smoothStrokePath(stroke)} fill="none" stroke="rgba(16,28,24,.3)" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" transform="translate(1 2)" />
          <path d={smoothStrokePath(stroke)} fill="none" stroke="#fff6da" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" />
        </g>
      ))}
    </g>
  )
}

export function AnimalFigure({ animal, life }: { animal: LivingAnimal; life: MapLife }) {
  const [still, setStill] = useState(true)
  const handleRef = useRef<PuppetHandle | null>(null)
  useEffect(() => {
    life.connect(animal.id, { still: setStill })
    return () => life.connect(animal.id, { still: () => undefined, handle: null })
  }, [life, animal.id])
  const connect = (handle: PuppetHandle | null): void => {
    handleRef.current = handle
    life.connect(animal.id, { handle })
  }
  return <ArtInSvg art={animal.art} box={animal.box} still={still} puppetRef={connect} />
}

/** The tap on an animal: above the sector's own hit, and it goes where the animal goes. */
export function AnimalHit({ animal, life }: { animal: LivingAnimal; life: MapLife }) {
  const ref: RefObject<SVGGElement | null> = useRef(null)
  useEffect(() => {
    life.connect(animal.id, { hit: ref.current })
    return () => life.connect(animal.id, { hit: null })
  }, [life, animal.id])
  return (
    <g
      ref={ref}
      role="button"
      tabIndex={0}
      aria-label={ANIMAL_LIFE[animal.id].name}
      data-map-animal={animal.id}
      style={{ cursor: 'pointer' }}
      onClick={() => life.tap(animal.id)}
      onKeyDown={(event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return
        event.preventDefault()
        life.tap(animal.id)
      }}
    >
      <rect x={animal.box.x} y={animal.box.y} width={animal.box.width} height={animal.box.height} fill="transparent" />
    </g>
  )
}
