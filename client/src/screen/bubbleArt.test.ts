// [T51] The bubble geometry checked against the SHIPPED pixels, not against
// numbers restated by hand: the measured text areas are really the white
// inside of each bubble, each speech anchor really sits in free space beside
// the figure's head, and on every entry/closing screen the bubble never
// paints over the octopus standing under it.
import { describe, expect, it } from 'vitest'
import { inlinedPng, type Raster } from '../testing/decodePng'
import { STAGE_VIEWPORTS, stageBubbleCases } from '../testing/stageBubbleCases'
import {
  OCTOPUS_ART,
  PULPITO_POSE_ART,
  ZOO_OCTOPUS_BACKPACK_ART,
  ZOO_SPEECH_BUBBLE_ART,
  ZOO_SPEECH_BUBBLE_LEFT_ART,
  type ArtImage,
} from '../detective/assets'
import { ZOO_SPEECH_BUBBLE_LEFT_TEXT_AREA, ZOO_SPEECH_BUBBLE_TEXT_AREA, type BubbleRect } from './bubbleFit'
import { STAGE_SPEECH_ANCHORS } from './pulpitoStance'
import { placeStageBubble } from './stageBubble'

const FILES = import.meta.glob('../../public/art/{zoo-speech-bubble,zoo-speech-bubble-left,zoo-octopus-*,carrier-octopus}.png', {
  eager: true,
  query: '?inline',
  import: 'default',
}) as Record<string, string>

async function raster(art: ArtImage): Promise<Raster> {
  const url = FILES[`../../public${art.href}`]
  if (!url) throw new Error(`not inlined: ${art.href}`)
  const img = await inlinedPng(url)
  expect([img.w, img.h], art.href).toEqual([art.w, art.h])
  return img
}

const alphaAt = (img: Raster, x: number, y: number): number => img.px[(y * img.w + x) * 4 + 3]

function isWhiteInside(img: Raster, x: number, y: number): boolean {
  const i = (y * img.w + x) * 4
  const luma = 0.299 * img.px[i] + 0.587 * img.px[i + 1] + 0.114 * img.px[i + 2]
  return img.px[i + 3] > 200 && luma > 200
}

describe('the measured text areas are the bubbles’ own white inside', () => {
  for (const [art, area] of [
    [ZOO_SPEECH_BUBBLE_ART, ZOO_SPEECH_BUBBLE_TEXT_AREA],
    [ZOO_SPEECH_BUBBLE_LEFT_ART, ZOO_SPEECH_BUBBLE_LEFT_TEXT_AREA],
  ] as ReadonlyArray<readonly [ArtImage, BubbleRect]>) {
    it(`${art.href}: every pixel of the text area is white, no outline inside it`, async () => {
      const img = await raster(art)
      const x0 = Math.round(area.left * img.w)
      const x1 = Math.round((area.left + area.width) * img.w) - 1
      const y0 = Math.round(area.top * img.h)
      const y1 = Math.round((area.top + area.height) * img.h) - 1
      let dark = 0
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (!isWhiteInside(img, x, y)) dark++
      expect(dark).toBe(0)
    })

    it(`${art.href}: the area is tight — one pixel further down it would touch the outline`, async () => {
      const img = await raster(art)
      const x0 = Math.round(area.left * img.w)
      const x1 = Math.round((area.left + area.width) * img.w) - 1
      const below = Math.round((area.top + area.height) * img.h) + 1
      let dark = 0
      for (let x = x0; x <= x1; x++) if (!isWhiteInside(img, x, below)) dark++
      expect(dark).toBeGreaterThan(0)
    })
  }
})

describe('each speech anchor sits in free space just beside the head', () => {
  const figures: ArtImage[] = [
    PULPITO_POSE_ART.points,
    PULPITO_POSE_ART.cheers,
    ZOO_OCTOPUS_BACKPACK_ART,
    OCTOPUS_ART,
  ]

  it('every anchored figure is covered here (sanity)', () => {
    expect(new Set(figures.map((f) => f.href))).toEqual(new Set(STAGE_SPEECH_ANCHORS.keys()))
  })

  for (const figure of figures) {
    it(`${figure.href}: nothing of the figure above-right of the tip, and the figure within reach of it`, async () => {
      const img = await raster(figure)
      const anchor = STAGE_SPEECH_ANCHORS.get(figure.href)!
      const ax = Math.round(anchor.x * img.w)
      const ay = Math.round(anchor.y * img.h)
      // The tail rises up and to the right of its tip: that wedge's box
      // (8% of the width to the right, 10% of the height up) must be empty.
      let covered = 0
      for (let y = Math.max(0, ay - Math.round(0.1 * img.h)); y <= ay; y++) {
        for (let x = ax; x <= Math.min(img.w - 1, ax + Math.round(0.08 * img.w)); x++) {
          if (alphaAt(img, x, y) > 128) covered++
        }
      }
      expect(covered).toBe(0)
      // ...and it points AT him: an opaque pixel within 10% of his height.
      const reach = Math.round(0.1 * img.h)
      let near = false
      for (let y = Math.max(0, ay - reach); y <= Math.min(img.h - 1, ay + reach) && !near; y++) {
        for (let x = Math.max(0, ax - reach); x <= Math.min(img.w - 1, ax + reach); x++) {
          if (alphaAt(img, x, y) > 128 && Math.hypot(x - ax, y - ay) <= reach) {
            near = true
            break
          }
        }
      }
      expect(near).toBe(true)
    })
  }
})

describe('on the entry and closing screens the bubble never paints over Pulpito', () => {
  it('no opaque bubble pixel lands on an opaque octopus pixel, for every line at every size', async () => {
    const bubble = await raster(ZOO_SPEECH_BUBBLE_LEFT_ART)
    const rasters = new Map<string, Raster>()
    const offenders: string[] = []
    for (const viewport of STAGE_VIEWPORTS) {
      for (const { id, text, art, figure } of stageBubbleCases()) {
        if (!rasters.has(figure.href)) rasters.set(figure.href, await raster(figure))
        const img = rasters.get(figure.href)!
        const { octopusBox, placement } = placeStageBubble({ figure, corner: 'left', viewport, text, art })
        let overlap = 0
        for (let fy = 0; fy < img.h; fy += 2) {
          for (let fx = 0; fx < img.w; fx += 2) {
            if (alphaAt(img, fx, fy) <= 128) continue
            const sx = octopusBox.x + (fx / img.w) * octopusBox.w
            const sy = octopusBox.y + (fy / img.h) * octopusBox.h
            let u = (sx - placement.left) / placement.width
            const v = (sy - placement.top) / placement.height
            if (u < 0 || u >= 1 || v < 0 || v >= 1) continue
            if (placement.mirrored) u = 1 - u
            if (alphaAt(bubble, Math.floor(u * bubble.w), Math.floor(v * bubble.h)) > 128) overlap++
          }
        }
        if (overlap > 0) offenders.push(`${id} @${viewport.width}x${viewport.height}: ${overlap}`)
      }
    }
    expect(offenders).toEqual([])
  })
})
