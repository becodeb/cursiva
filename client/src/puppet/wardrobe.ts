// A picture of each thing the Pulpito can wear, cut from his own rig: the piece in the
// wardrobe is the piece he puts on, so the two cannot disagree. Registered through the
// same seam as every other paper prop, under a `paper:` name no PNG will ever have.
import type { WearableId } from '../zoo/backpack'
import { getRig } from './characters'
import { sampleAnchored, type Vec } from './geometry'
import type { PaperNode, PaperPath } from './rig'
import { cutScene, poly, type CutScene, type ScenePiece } from './scene/engine'

const SHEET = 200
const MARGIN = 14

export const WEARABLE_ART: Readonly<Record<WearableId, { readonly href: string; readonly w: number; readonly h: number }>> = {
  backpack: { href: 'paper:backpack', w: SHEET, h: SHEET },
  scarf: { href: 'paper:scarf', w: SHEET, h: SHEET },
  hat: { href: 'paper:hat', w: SHEET, h: SHEET },
  bow: { href: 'paper:bow', w: SHEET, h: SHEET },
  flower: { href: 'paper:flower', w: SHEET, h: SHEET },
  shells: { href: 'paper:shells', w: SHEET, h: SHEET },
  cape: { href: 'paper:cape', w: SHEET, h: SHEET },
  sailor: { href: 'paper:sailor', w: SHEET, h: SHEET },
  straw: { href: 'paper:straw', w: SHEET, h: SHEET },
  crown: { href: 'paper:crown', w: SHEET, h: SHEET },
}

function pathsOf(nodes: readonly PaperNode[], part: string, within = false): PaperPath[] {
  const out: PaperPath[] = []
  for (const node of nodes) {
    if (node.kind === 'group') out.push(...pathsOf(node.children, part, within || node.part === part))
    else if (within && !node.shadow) out.push(node)
  }
  return out
}

/** The rig's palette colours by the literal this costume paints with. */
function colourOf(node: PaperPath, palette: Readonly<Record<string, string>>): string {
  const raw = String(node.style.fill === 'none' ? node.style.stroke : node.style.fill)
  const key = /^var\(--(.+)\)$/.exec(raw)?.[1]
  return key ? palette[key] : raw
}

function pictureOf(part: WearableId, seed: number): CutScene {
  const rig = getRig('pulpo')
  const nodes = pathsOf(rig.nodes, part).filter((n) => n.d !== null)
  const outlines = nodes.map((node) => ({ node, points: sampleAnchored(node.d!, 8) }))
  const all = outlines.flatMap((o) => o.points)
  const minX = Math.min(...all.map((p) => p[0]))
  const maxX = Math.max(...all.map((p) => p[0]))
  const minY = Math.min(...all.map((p) => p[1]))
  const maxY = Math.max(...all.map((p) => p[1]))
  const k = (SHEET - MARGIN * 2) / Math.max(maxX - minX, maxY - minY)
  const dx = (SHEET - (maxX - minX) * k) / 2
  const dy = (SHEET - (maxY - minY) * k) / 2
  const place = ([x, y]: Vec): Vec => [dx + (x - minX) * k, dy + (y - minY) * k]
  const pieces: ScenePiece[] = outlines
    // A line is a detail on the piece under it: at this size its strip can go.
    .filter(({ node }) => node.style.fill !== 'none')
    .map(({ node, points }) => ({ d: poly(...points.map(place)), c: colourOf(node, rig.palette) }))
  return cutScene({ w: SHEET, h: SHEET, base: 'none', layers: [{ pieces }], grain: 0.08 }, seed)
}

const WEARABLE_IDS = Object.keys(WEARABLE_ART) as WearableId[]

export const WARDROBE_PROPS: ReadonlyMap<string, CutScene> = new Map(
  WEARABLE_IDS.map((id, i) => [WEARABLE_ART[id].href, pictureOf(id, 80 + i * 2)] as const),
)
