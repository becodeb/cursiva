// The spine fold's coincidence proof, stage 1: against a FIXTURE config
// (`radial-spines` spec: "Rendered Body Box and Scored Anchors Agree";
// design.md §11.1 item 1). Stage 2, against the REAL catalog, lands once
// `hedgehog1..4` exist (a later batch — `tasks.md` Phase 9/11).
//
// Paso E cost a family: 1,553 green tests while the snake's drawn art sat
// at one coordinate and its scored route sat at another, because nothing
// rendered the real `<image>` and compared it to the anchors. This is the
// analogous insurance here: parse every `<image>`/`<circle>` OUT OF THE
// HTML STRING — never the internal box/anchor objects — and compare
// against the real generator's own output.
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { SpineLayer } from './SpineLayer'
import type { ArtBox } from './placeArt'
import {
  EMPTY_SPINES,
  SPINE_MARK_R,
  debugSpines,
  spineAnchors,
  spineBody,
  spineMarks,
  spineRings,
  type SpineConfig,
} from '../levels/spines'
import { LEVELS } from '../levels/catalog'
import { HEDGEHOG_SILHOUETTE } from '../detective/assets'

const CFG: SpineConfig = {
  pose: 'profile',
  body: { centre: { x: 440, y: 440 }, height: 260 },
  arc: { from: 200, to: 380 },
  count: 5,
  rules: { baseRadius: 38, tolDeg: 40, straightness: 0.8, lenMin: 220, lenMax: 290 },
}

const DIM = '#989896'
const EARNED = '#f2efe6'
const SHEET_BOUNDS: ArtBox = { x: 0, y: 0, width: 1000, height: 600 }

/** Parse every `<image x y width height href>` out of the HTML STRING —
 *  never the internal box object (the exact gap paso E's own coincidence
 *  proof left). */
function parseImages(
  html: string,
): Array<{ x: number; y: number; width: number; height: number; href: string }> {
  const tags = html.match(/<image[^>]*>/g) ?? []
  return tags.map((tag) => {
    const num = (attr: string): number => {
      const m = tag.match(new RegExp(`${attr}="(-?[0-9.]+)"`))
      if (!m) throw new Error(`${attr} not found in ${tag}`)
      return Number(m[1])
    }
    const hrefMatch = tag.match(/href="([^"]+)"/)
    if (!hrefMatch) throw new Error(`href not found in ${tag}`)
    return { x: num('x'), y: num('y'), width: num('width'), height: num('height'), href: hrefMatch[1] }
  })
}

/** Parse every `<circle cx cy r fill? stroke?>` out of the HTML STRING. */
function parseCircles(
  html: string,
): Array<{ cx: number; cy: number; r: number; fill: string | null; stroke: string | null }> {
  const tags = html.match(/<circle[^>]*>/g) ?? []
  return tags.map((tag) => {
    const num = (attr: string): number => {
      const m = tag.match(new RegExp(`${attr}="(-?[0-9.]+)"`))
      if (!m) throw new Error(`${attr} not found in ${tag}`)
      return Number(m[1])
    }
    const fillMatch = tag.match(/fill="([^"]+)"/)
    const strokeMatch = tag.match(/stroke="([^"]+)"/)
    return {
      cx: num('cx'),
      cy: num('cy'),
      r: num('r'),
      fill: fillMatch ? fillMatch[1] : null,
      stroke: strokeMatch ? strokeMatch[1] : null,
    }
  })
}

function traceSpinesFor(cfg: SpineConfig, state = EMPTY_SPINES) {
  const { href, box } = spineBody(cfg)
  return {
    body: { href, x: box.x, y: box.y, width: box.width, height: box.height },
    marks: spineMarks(cfg, state),
    markRadius: SPINE_MARK_R,
    dim: DIM,
    earned: EARNED,
  }
}

describe('SpineLayer — the coincidence proof (stage 1, fixture config)', () => {
  it('the body <image> box equals spineBody(cfg).box exactly', () => {
    const { box } = spineBody(CFG)
    const html = renderToString(<SpineLayer spines={traceSpinesFor(CFG)} sheetBounds={SHEET_BOUNDS} />)
    const images = parseImages(html)
    expect(images).toHaveLength(1)
    expect(images[0].x).toBeCloseTo(box.x, 3)
    expect(images[0].y).toBeCloseTo(box.y, 3)
    expect(images[0].width).toBeCloseTo(box.width, 3)
    expect(images[0].height).toBeCloseTo(box.height, 3)
  })

  it('every anchor mark renders at A_i + SPINE_MARK_R·n̂_i, unfilled by default', () => {
    const anchors = spineAnchors(CFG)
    const html = renderToString(<SpineLayer spines={traceSpinesFor(CFG)} sheetBounds={SHEET_BOUNDS} />)
    const circles = parseCircles(html)
    expect(circles).toHaveLength(anchors.length)
    anchors.forEach((a, i) => {
      expect(circles[i].cx).toBeCloseTo(a.x + SPINE_MARK_R * a.nx, 3)
      expect(circles[i].cy).toBeCloseTo(a.y + SPINE_MARK_R * a.ny, 3)
      expect(circles[i].r).toBe(SPINE_MARK_R)
      expect(circles[i].fill).toBe(DIM)
    })
  })

  it('a filled mark swaps to the earned colour at the SAME centre — the swap must not move the mark', () => {
    const state = debugSpines(CFG, 2)
    const anchors = spineAnchors(CFG)
    const html = renderToString(
      <SpineLayer spines={traceSpinesFor(CFG, state)} sheetBounds={SHEET_BOUNDS} />,
    )
    const circles = parseCircles(html)
    for (let i = 0; i < anchors.length; i++) {
      expect(circles[i].fill).toBe(i < 2 ? EARNED : DIM)
      expect(circles[i].cx).toBeCloseTo(anchors[i].x + SPINE_MARK_R * anchors[i].nx, 3)
      expect(circles[i].cy).toBeCloseTo(anchors[i].y + SPINE_MARK_R * anchors[i].ny, 3)
    }
  })

  it('renders one debug ring per anchor, at baseRadius, when rings are supplied', () => {
    const rings = spineRings(CFG)
    const html = renderToString(
      <SpineLayer
        spines={{ ...traceSpinesFor(CFG), rings, ringStroke: EARNED }}
        sheetBounds={SHEET_BOUNDS}
      />,
    )
    const circles = parseCircles(html)
    // marks + rings, marks first (body goes first, marks second — a mark is
    // never hidden by the picture it sits on).
    expect(circles).toHaveLength(CFG.count * 2)
    const ringCircles = circles.slice(CFG.count)
    rings.forEach((ring, i) => {
      expect(ringCircles[i].cx).toBeCloseTo(ring.x, 3)
      expect(ringCircles[i].cy).toBeCloseTo(ring.y, 3)
      expect(ringCircles[i].r).toBe(ring.radius)
      expect(ringCircles[i].stroke).toBe(EARNED)
    })
  })

  it('renders no rings at all when rings is absent — every frame a child ever sees', () => {
    const html = renderToString(<SpineLayer spines={traceSpinesFor(CFG)} sheetBounds={SHEET_BOUNDS} />)
    // Only the marks' circles, none with a `stroke` attribute (rings only).
    expect(parseCircles(html).every((c) => c.stroke === null)).toBe(true)
  })

  it('introduces no url(#), <mask>, <pattern>, <clipPath>, or <defs>', () => {
    const html = renderToString(
      <SpineLayer
        spines={{ ...traceSpinesFor(CFG), rings: spineRings(CFG), ringStroke: EARNED }}
        sheetBounds={SHEET_BOUNDS}
      />,
    )
    expect(html).not.toContain('url(#')
    expect(html).not.toContain('<mask')
    expect(html).not.toContain('<pattern')
    expect(html).not.toContain('<clipPath')
    expect(html).not.toContain('<defs')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Stage 2 (design.md §11.1 item 1, radial-spines spec: "Rendered Body Box
// and Scored Anchors Agree" / "A Moved Body Fails the Coincidence
// Assertion"): the REAL catalog, all four levels, both poses. Everything is
// parsed OUT OF THE HTML STRING, never the internal `box`/anchor objects —
// paso E's exact gap.
//
// The second assertion below recovers the body's centre/scale from the
// RENDERED box alone (placeArt's own inverse: `centre = box.pos +
// grip·size`) and re-derives the "implied" anchors from that recovered
// geometry, then compares them to the real `spineAnchors(cfg)` the scorer
// reads. When `clampArtBox` is a no-op (every shipped level), the two are
// identical; if the rendered box ever moved independently of the anchors —
// paso E's failure class — they would disagree.
// ─────────────────────────────────────────────────────────────────────────────
describe('SpineLayer — the coincidence proof (stage 2, the real catalog, both poses)', () => {
  const HEDGEHOG_IDS = ['hedgehog1', 'hedgehog2', 'hedgehog3', 'hedgehog4'] as const

  function renderAndParse(cfg: SpineConfig, sheetBounds: ArtBox = SHEET_BOUNDS) {
    const html = renderToString(<SpineLayer spines={traceSpinesFor(cfg)} sheetBounds={sheetBounds} />)
    return { images: parseImages(html), circles: parseCircles(html) }
  }

  it('the rendered body box equals spineBody(cfg).box, and every mark centre equals A_i + SPINE_MARK_R·n̂_i, for all four levels', () => {
    for (const id of HEDGEHOG_IDS) {
      const cfg = LEVELS.find((l) => l.id === id)!.spines!
      const { box } = spineBody(cfg)
      const { images, circles } = renderAndParse(cfg)
      expect(images, id).toHaveLength(1)
      expect(images[0].x, id).toBeCloseTo(box.x, 3)
      expect(images[0].y, id).toBeCloseTo(box.y, 3)
      expect(images[0].width, id).toBeCloseTo(box.width, 3)
      expect(images[0].height, id).toBeCloseTo(box.height, 3)

      const anchors = spineAnchors(cfg)
      expect(circles, id).toHaveLength(anchors.length)
      anchors.forEach((a, i) => {
        expect(circles[i].cx, `${id}[${i}]`).toBeCloseTo(a.x + SPINE_MARK_R * a.nx, 3)
        expect(circles[i].cy, `${id}[${i}]`).toBeCloseTo(a.y + SPINE_MARK_R * a.ny, 3)
      })
    }
  })

  it('every anchor lies on the silhouette IMPLIED by the rendered box — geometry recovered from the box itself, not from cfg', () => {
    for (const id of HEDGEHOG_IDS) {
      const cfg = LEVELS.find((l) => l.id === id)!.spines!
      const { images } = renderAndParse(cfg)
      const box = images[0]
      const [gx, gy] = HEDGEHOG_SILHOUETTE[cfg.pose].centroid
      const recoveredCentre = { x: box.x + gx * box.width, y: box.y + gy * box.height }
      const recoveredCfg: SpineConfig = { ...cfg, body: { centre: recoveredCentre, height: box.height } }
      const implied = spineAnchors(recoveredCfg)
      const real = spineAnchors(cfg)
      implied.forEach((a, i) => {
        expect(a.x, `${id}[${i}]`).toBeCloseTo(real[i].x, 3)
        expect(a.y, `${id}[${i}]`).toBeCloseTo(real[i].y, 3)
      })
    }
  })
})
