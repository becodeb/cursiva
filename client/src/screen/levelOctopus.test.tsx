// [T51] The start octopus on every level that stands him, at the shipped
// `OCTOPUS_SIZE`, measured against his own PIXELS (both FRAMED drawings): he
// never paints over anything drawn under him — a collect item, the goal mark,
// a segment's start dot or stop mark, an art corridor's drawn body — and when
// he holds the glass he stands exactly on his own spot (never clamped off it,
// which would leave the resting glass beside his tentacle). Clue marks are
// drawn OVER him (`TraceCanvas`'s clue layer comes after the start art), so
// none can be hidden; the SSR check at the end pins that order.
import { describe, expect, it } from 'vitest'
import { renderToString } from 'react-dom/server'
import { inlinedPng, type Raster } from '../testing/decodePng'
import { LEVELS, getLevel } from '../levels/catalog'
import { buildLevelTarget } from '../levels/buildLevel'
import { inDetectiveWorld } from '../levels/world'
import { resolveCollectItems } from '../levels/collect'
import { clampArtBox, placeArt, STANDING_GRIP, type ArtBox } from '../canvas/placeArt'
import { backdropFor } from '../zoo/backdrops'
import { OCTOPUS_ART, OCTOPUS_EMPTY_HANDED_ART } from '../detective/assets'
import { EMPTY_RECORD } from '../game/types'
import { goalMarkerOf } from './goalMarker'
import { START_ART_CUE_PUSH } from './idleNudgeCue'
import LevelPlay, { drawingBand, OCTOPUS_ASPECT, OCTOPUS_SIZE, octopusFeetOverride, octopusHoldsLens } from './LevelPlay'

const FILES = import.meta.glob('../../public/art/carrier-octopus*.png', {
  eager: true,
  query: '?inline',
  import: 'default',
}) as Record<string, string>

const intersects = (a: ArtBox, b: ArtBox): boolean =>
  a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y

/** The levels LevelPlay stands the octopus on (`drawnPlace`). */
const STANDING_LEVELS = LEVELS.filter(
  (level) => (inDetectiveWorld(level) || backdropFor(level.id) !== undefined) && buildLevelTarget(level).start !== undefined,
)

/** His rendered box on `level`, exactly as the canvas places it: feet on the
 *  override or the route's start, clamped into the visible band. */
function octopusOn(levelId: string) {
  const level = getLevel(levelId)
  const target = buildLevelTarget(level)
  const feet = octopusFeetOverride(target, !!level.segments) ?? target.start!
  const band = drawingBand(target.ideal, target.corridorWidth, level.surface)
  const sheet = { x: 0, y: band.y, width: target.viewBoxWidth, height: band.height }
  const box = clampArtBox(placeArt({ ...OCTOPUS_ART, grip: STANDING_GRIP }, OCTOPUS_SIZE, feet), sheet)
  return { level, target, feet, box }
}

describe('the start octopus at OCTOPUS_SIZE never hides what lies under him', () => {
  let glass: Raster
  let empty: Raster
  /** Is any opaque pixel of either drawing inside `r` (box-space sample)? */
  const paintsOver = (box: ArtBox, r: ArtBox): boolean => {
    if (!intersects(box, r)) return false
    for (let y = r.y; y <= r.y + r.height; y += 1) {
      for (let x = r.x; x <= r.x + r.width; x += 1) {
        const u = (x - box.x) / box.width
        const v = (y - box.y) / box.height
        if (u < 0 || u >= 1 || v < 0 || v >= 1) continue
        for (const img of [glass, empty]) {
          const px = Math.floor(u * img.w)
          const py = Math.floor(v * img.h)
          if (img.px[(py * img.w + px) * 4 + 3] > 128) return true
        }
      }
    }
    return false
  }

  it('loads both FRAMED drawings, which share one canvas (the swap neither jumps nor resizes)', async () => {
    glass = await inlinedPng(FILES['../../public/art/carrier-octopus.png'])
    empty = await inlinedPng(FILES['../../public/art/carrier-octopus-empty.png'])
    expect([glass.w, glass.h]).toEqual([OCTOPUS_ART.w, OCTOPUS_ART.h])
    expect([empty.w, empty.h]).toEqual([OCTOPUS_EMPTY_HANDED_ART.w, OCTOPUS_EMPTY_HANDED_ART.h])
    expect([OCTOPUS_EMPTY_HANDED_ART.w, OCTOPUS_EMPTY_HANDED_ART.h]).toEqual([OCTOPUS_ART.w, OCTOPUS_ART.h])
    expect(OCTOPUS_ASPECT).toBeCloseTo(OCTOPUS_ART.w / OCTOPUS_ART.h, 9)
  })

  it('the sweep covers the levels that stand him (sanity: not accidentally empty)', () => {
    expect(STANDING_LEVELS.length).toBeGreaterThan(40)
  })

  it('never on a collect item, the goal mark, a segment start dot or stop mark', () => {
    const offenders: string[] = []
    for (const { id } of STANDING_LEVELS) {
      const { level, target, box } = octopusOn(id)
      if (level.collect) {
        resolveCollectItems(level.collect, target.polyline, target.length, level.corridorWidth).forEach((item, i) => {
          const itemBox = placeArt({ w: 100, h: 100, grip: STANDING_GRIP }, level.collect!.size, item)
          if (paintsOver(box, itemBox)) offenders.push(`${id} item ${i}`)
        })
      }
      if (level.segments) {
        // `TraceCanvas`'s marker radii: start dot 22, stop diamond 34 + stroke.
        target.routes.forEach((route, i) => {
          const s = route.polyline[0]
          const e = route.polyline[route.polyline.length - 1]
          if (paintsOver(box, { x: s.x - 22, y: s.y - 22, width: 44, height: 44 })) offenders.push(`${id} start ${i}`)
          if (paintsOver(box, { x: e.x - 36.5, y: e.y - 36.5, width: 73, height: 73 })) offenders.push(`${id} stop ${i}`)
        })
      }
      const goal = goalMarkerOf(target)
      if (goal && level.kind === 'path' && !level.collect && !level.segments) {
        // The end mark (`END_MARK_SIZE` 84, standing on the goal).
        if (paintsOver(box, placeArt({ w: 100, h: 100, grip: STANDING_GRIP }, 84, goal))) offenders.push(`${id} goal`)
      }
    }
    expect(offenders).toEqual([])
  })

  it('never on an art corridor’s drawn body (N3: he stands beside the snake)', () => {
    const offenders: string[] = []
    for (const { id } of STANDING_LEVELS) {
      const { target, box } = octopusOn(id)
      for (const [i, piece] of (target.artCorridor ?? []).entries()) {
        // The piece's box rotated about its pivot, as an axis-aligned bound.
        const rad = (piece.rotate * Math.PI) / 180
        const corners = [
          [piece.box.x, piece.box.y],
          [piece.box.x + piece.box.width, piece.box.y],
          [piece.box.x, piece.box.y + piece.box.height],
          [piece.box.x + piece.box.width, piece.box.y + piece.box.height],
        ].map(([x, y]) => [
          piece.pivot.x + (x - piece.pivot.x) * Math.cos(rad) - (y - piece.pivot.y) * Math.sin(rad),
          piece.pivot.y + (x - piece.pivot.x) * Math.sin(rad) + (y - piece.pivot.y) * Math.cos(rad),
        ])
        const xs = corners.map((c) => c[0])
        const ys = corners.map((c) => c[1])
        const body = { x: Math.min(...xs), y: Math.min(...ys), width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) }
        if (paintsOver(box, body)) offenders.push(`${id} piece ${i}`)
      }
    }
    expect(offenders).toEqual([])
  })

  it('when he holds the glass he stands exactly on his spot, never clamped off it at the sheet’s edge', () => {
    const offenders: string[] = []
    for (const { id } of STANDING_LEVELS) {
      const { level, feet, box } = octopusOn(id)
      if (!level.carrier) continue
      const dx = box.x + box.width / 2 - feet.x
      const dy = box.y + box.height - feet.y
      if (Math.hypot(dx, dy) > 0.5) offenders.push(`${id} (${dx.toFixed(1)}, ${dy.toFixed(1)})`)
    }
    expect(offenders).toEqual([])
  })

  it('the idle cue still starts past him (its push keeps up with his size)', () => {
    expect(START_ART_CUE_PUSH).toBeGreaterThanOrEqual(OCTOPUS_SIZE - 2)
  })
})

describe('the clue marks are drawn over the start octopus', () => {
  it('on a clue trail, every clue picture comes after both octopus drawings in the canvas markup', () => {
    const level = getLevel('duck-trail1')
    expect(level.clue, 'duck-trail1 is a clue trail').toBeDefined()
    expect(octopusHoldsLens(level)).toBe(true)
    const html = renderToString(
      <LevelPlay level={level} record={EMPTY_RECORD} onAttempt={() => undefined} onNext={() => undefined} onBack={() => undefined} />,
    )
    const glassAt = html.indexOf(OCTOPUS_ART.href)
    const emptyAt = html.indexOf(OCTOPUS_EMPTY_HANDED_ART.href)
    // A clue mark is an <image> centred by its own transform (the HUD's clue
    // pictures elsewhere on the screen are not).
    const clueAt = html.search(/<image href="[^"]*" x="[^"]*" y="[^"]*" width="[^"]*" height="[^"]*" transform="translate\(/)
    expect(glassAt).toBeGreaterThan(-1)
    expect(emptyAt).toBeGreaterThan(-1)
    expect(clueAt, 'no clue mark rendered').toBeGreaterThan(-1)
    expect(clueAt).toBeGreaterThan(Math.max(glassAt, emptyAt))
  })

  it('both octopus drawings get the very same box (the touch swap is seamless)', () => {
    const html = renderToString(
      <LevelPlay level={getLevel('duck-trail1')} record={EMPTY_RECORD} onAttempt={() => undefined} onNext={() => undefined} onBack={() => undefined} />,
    )
    const boxOf = (href: string): string => {
      const tag = html.match(new RegExp(`<image[^>]*href="${href}"[^>]*>`))?.[0] ?? ''
      return ['x', 'y', 'width', 'height'].map((k) => tag.match(new RegExp(` ${k}="([^"]+)"`))?.[1]).join(',')
    }
    const glassBox = boxOf(OCTOPUS_ART.href)
    expect(glassBox.split(',').every((v) => v !== 'undefined')).toBe(true)
    expect(boxOf(OCTOPUS_EMPTY_HANDED_ART.href)).toBe(glassBox)
    expect(Number(glassBox.split(',')[3])).toBeCloseTo(OCTOPUS_SIZE, 6)
  })
})
