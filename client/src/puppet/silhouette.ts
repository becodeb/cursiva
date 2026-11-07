// A puppet's real outline, measured from the rig the way `detective/assets.ts` once
// measured a PNG: the middle of its mass and how far its edge is along each ray. So what
// depends on the outline (the hedgehog's spine marks) lands on what is drawn.
import { createActor, type RigState } from './actor'
import { getRig, puppetView, type PuppetName } from './characters'
import { computeFrame, frameOutlines, type ViewBox } from './rig'
import type { Vec } from './geometry'

const RAYS = 24
const GRID = 72

export interface PuppetSilhouette {
  /** As fractions of the box the puppet stands in. */
  readonly centroid: readonly [number, number]
  /** Along 24 equally spaced rays from the centroid, as fractions of the box's width. */
  readonly radii: readonly number[]
}

function inside(polygon: readonly Vec[], x: number, y: number): boolean {
  let hit = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [ax, ay] = polygon[i]
    const [bx, by] = polygon[j]
    if (ay > y !== by > y && x < ((bx - ax) * (y - ay)) / (by - ay) + ax) hit = !hit
  }
  return hit
}

interface Piece {
  readonly points: readonly Vec[]
  readonly minX: number
  readonly maxX: number
  readonly minY: number
  readonly maxY: number
}

/** Measured on the still pose, in the window a box of `aspect` shows it through. */
export function measureSilhouette(name: PuppetName, state: RigState, aspect: number): PuppetSilhouette {
  const rig = getRig(name)
  const frame = computeFrame(rig, createActor(7, undefined, state), true)
  const pieces: Piece[] = frameOutlines(rig, frame, 4)
    .filter(({ node }) => !node.shadow && node.style.fill !== 'none')
    .map(({ points }): Piece => {
      const xs = points.map((p) => p[0])
      const ys = points.map((p) => p[1])
      return { points, minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) }
    })
    // A part scaled away, such as the coat with its quills down, has no area left.
    .filter((p) => p.maxX - p.minX > 2 && p.maxY - p.minY > 2)
  const paints = (x: number, y: number): boolean =>
    pieces.some((p) => x >= p.minX && x <= p.maxX && y >= p.minY && y <= p.maxY && inside(p.points, x, y))

  const minX = Math.min(...pieces.map((p) => p.minX))
  const maxX = Math.max(...pieces.map((p) => p.maxX))
  const minY = Math.min(...pieces.map((p) => p.minY))
  const maxY = Math.max(...pieces.map((p) => p.maxY))
  let sumX = 0
  let sumY = 0
  let count = 0
  for (let i = 0; i < GRID; i++) {
    const y = minY + ((i + 0.5) / GRID) * (maxY - minY)
    for (let j = 0; j < GRID; j++) {
      const x = minX + ((j + 0.5) / GRID) * (maxX - minX)
      if (paints(x, y)) {
        sumX += x
        sumY += y
        count++
      }
    }
  }
  const cx = sumX / count
  const cy = sumY / count
  const reach = Math.hypot(maxX - minX, maxY - minY)
  const view: ViewBox = puppetView(name, aspect, state)
  const radii: number[] = []
  for (let r = 0; r < RAYS; r++) {
    const a = (r / RAYS) * Math.PI * 2
    let edge = 0
    for (let d = 2; d < reach; d += 2) {
      if (paints(cx + Math.cos(a) * d, cy + Math.sin(a) * d)) edge = d
    }
    radii.push(edge / view.w)
  }
  return { centroid: [(cx - view.x) / view.w, (cy - view.y) / view.h], radii }
}
