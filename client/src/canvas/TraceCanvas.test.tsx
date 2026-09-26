// TraceCanvas SSR tests (trace-canvas "Multi-Step Demo Rendering"): the demo
// prop accepts a single DrawDemo or an array; every entry renders as its own
// animated motion.path with its own d/delay/duration — and the single-object
// form preserves the previous one-path behavior. Timeline completion itself is
// mode-side (readyMs in guidedTrace), not asserted here.
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import TraceCanvas, {
  BACKDROP_IMAGE_ASPECT,
  coverAspectRatio,
  coverVisibleFraction,
  DEMO_STROKE,
  fitCameraContentWithInsets,
  fitContentWithInsets,
  type DrawDemo,
  type SafeInsets,
} from './TraceCanvas'
import { placeArt } from './placeArt'
import { getLevel } from '../levels/catalog'
import { buildLevelTarget } from '../levels/buildLevel'
import { obstacleAt } from '../levels/obstacles'
import { luma } from '../detective/palette'
import { backdropFor, CHANNEL_STONE } from '../zoo/backdrops'
import { seedCameraOrigin } from './camera'
import { routeExtrema, vertexArtPoints } from '../levels/dolphinExtrema'
import { drawingBand } from '../screen/LevelPlay'

function demo(over: Partial<DrawDemo> = {}): DrawDemo {
  return { d: 'M 1 2 L 3 4 L 5 4', delay: 1, duration: 1, strokeWidth: 14, ...over }
}

function demoPathCount(html: string): number {
  return (html.match(/stroke="#0284c7"/g) ?? []).length
}

describe('TraceCanvas demo prop (multi-step demo rendering)', () => {
  it('an array renders one stroke-#0284c7 path per entry, each with its own d', () => {
    const html = renderToString(
      <TraceCanvas demo={[demo(), demo({ d: 'M 9 9 L 8 8', delay: 2, duration: 0.5 })]} />,
    )
    expect(demoPathCount(html)).toBe(2)
    expect(html).toContain('M 1 2 L 3 4 L 5 4')
    expect(html).toContain('M 9 9 L 8 8')
  })

  it('a single DrawDemo object renders exactly one path (previous behavior)', () => {
    const html = renderToString(<TraceCanvas demo={demo()} />)
    expect(demoPathCount(html)).toBe(1)
  })

  it('renders no demo paths when the prop is absent', () => {
    expect(demoPathCount(renderToString(<TraceCanvas />))).toBe(0)
  })
})

describe('TraceCanvas ruled guides (trace-canvas "Viewport and Ruled Lines", T7.1)', () => {
  it('renders the four full-width guides at Y=180/300/420/540 in viewBox space', () => {
    const html = renderToString(<TraceCanvas />)
    expect(html).toContain('viewBox="0 0 1000 600"')
    expect(html).toContain('y1="180"')
    expect(html).toContain('y1="300"')
    expect(html).toContain('y1="420"')
    expect(html).toContain('y1="540"') // descender guide: bottom of the roots zone
    expect(html).toContain('x2="1000"')
  })

  it('widens the sheet on viewBoxWidth, keeping the height and the guide Ys', () => {
    const html = renderToString(<TraceCanvas viewBoxWidth={1148} />)
    expect(html).toContain('viewBox="0 0 1148 600"')
    // The ruled lines still span the WHOLE sheet...
    expect(html).toContain('x2="1148"')
    expect(html).not.toContain('x2="1000"')
    // ...and the zones never move: the height is pedagogy (docs/02 §3).
    for (const y of ['180', '300', '420', '540']) expect(html).toContain(`y1="${y}"`)
  })
})
describe('TraceCanvas camera prop — the rendered viewBox attribute, against the REAL catalog (scrolling-camera spec §6.1, design.md §6.1 V1-V6, re-pointed in Phase 5.5)', () => {
  // A camera prop built the same way LevelPlay builds it: viewWidth/world
  // from the real target, originX from seedCameraOrigin(cameraDebugOrigin(...)).
  function cameraFor(
    levelId: string,
    debugX: number | null,
  ): { target: ReturnType<typeof buildLevelTarget>; camera?: { viewWidth: number; lead: number; originX: number } } {
    const level = getLevel(levelId)
    const target = buildLevelTarget(level)
    if (!level.camera) return { target, camera: undefined }
    const originX = seedCameraOrigin(debugX, target.viewWidth, target.viewBoxWidth)
    return { target, camera: { viewWidth: target.viewWidth, lead: level.camera.lead, originX } }
  }

  it('V1: dolphin3, no debug — viewBox="0 0 1000 600"', () => {
    const { target, camera } = cameraFor('dolphin3', null)
    const html = renderToString(<TraceCanvas viewBoxWidth={target.viewBoxWidth} camera={camera} />)
    expect(html).toContain('viewBox="0 0 1000 600"')
  })

  it('V2: dolphin3, ?debug=camara:280 — viewBox="280 0 1000 600"', () => {
    const { target, camera } = cameraFor('dolphin3', 280)
    const html = renderToString(<TraceCanvas viewBoxWidth={target.viewBoxWidth} camera={camera} />)
    expect(html).toContain('viewBox="280 0 1000 600"')
  })

  it('V3: dolphin4, ?debug=camara:9999 — the clamp, viewBox="1120 0 1000 600"', () => {
    const { target, camera } = cameraFor('dolphin4', 9999)
    const html = renderToString(<TraceCanvas viewBoxWidth={target.viewBoxWidth} camera={camera} />)
    expect(html).toContain('viewBox="1120 0 1000 600"')
  })

  it('V4: dolphin4, ?debug=camara:-50 — the floor, viewBox="0 0 1000 600"', () => {
    const { target, camera } = cameraFor('dolphin4', -50)
    const html = renderToString(<TraceCanvas viewBoxWidth={target.viewBoxWidth} camera={camera} />)
    expect(html).toContain('viewBox="0 0 1000 600"')
  })

  it('V5: dolphin1, ?debug=camara:400 — no effect, no camera on this level', () => {
    const { target, camera } = cameraFor('dolphin1', 400)
    expect(camera).toBeUndefined()
    const html = renderToString(<TraceCanvas viewBoxWidth={target.viewBoxWidth} camera={camera} />)
    expect(html).toContain('viewBox="0 0 1000 600"')
  })

  it('V6: the parity list stays byte-identical — no camera prop renders the shipped expression exactly', () => {
    for (const id of [
      'f4-la',
      'f5-mama',
      'duck-trail1',
      'duck-trail2',
      'duck-trail3',
      'duck-trail4',
      'sheep-hill1',
      'snake3',
      'bee1',
      'night2',
      'glass1',
    ]) {
      const target = buildLevelTarget(getLevel(id))
      const html = renderToString(<TraceCanvas viewBoxWidth={target.viewBoxWidth} />)
      expect(html, id).toContain(`viewBox="0 0 ${target.viewBoxWidth} 600"`)
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Post-verify amendment A4 (`sdd/dolphin-zigzag-scrolling-screen`, R2): the
// backdrop `<image>` is pinned to the VIEW WINDOW, not the world, on a camera
// level. Direct capture inspection (`capturas/pasoG/dolphin3-control.png` and
// siblings) showed a world-spanning backdrop slice reads as flat, textureless
// open water at 1.56x/2.12x — design.md §3.3's original pessimistic
// prediction, not the apply-time amendment's "reeds clearly visible" claim.
// Pinning `x`/`width` to the same expression the `<svg>`'s own `viewBox`
// attribute already uses keeps the whole lagoon (banks, reeds) in frame while
// the corridor and dolphins pan underneath it.
// ─────────────────────────────────────────────────────────────────────────────
describe('TraceCanvas backdrop pinned to the window on a camera level (post-verify amendment A4, design.md §3)', () => {
  // The SAME conversion `LevelPlay.tsx` applies before handing a registry row
  // to `TraceCanvas` (`backdropEntry` → `TraceBackdrop`): `art.href`, never
  // the raw `AdventureBackdrop` object, which has no `href` field of its own.
  function traceBackdrop(id: string) {
    const entry = backdropFor(id)!
    return { href: entry.art.href, quiet: entry.quiet, channel: entry.channel }
  }

  function backdropImage(html: string) {
    const images = parseImages(html).filter((img) => img.href === traceBackdrop('dolphin3').href)
    const image = images[images.length - 1] // the backdrop <image>, not a vertex-art dolphin
    if (!image) throw new Error('no backdrop <image> found')
    return image
  }

  it('dolphin3 with no debug seed: backdrop image reports x=0, width=1000 (the window), not 1560 (the world)', () => {
    const level = getLevel('dolphin3')
    const target = buildLevelTarget(level)
    const camera = { viewWidth: target.viewWidth, lead: level.camera!.lead, originX: 0 }
    const html = renderToString(
      <TraceCanvas
        fit="contain"
        viewBoxWidth={target.viewBoxWidth}
        backdrop={traceBackdrop('dolphin3')}
        camera={camera}
      />,
    )
    const image = backdropImage(html)
    expect(image.x).toBe(0)
    expect(image.width).toBe(1000)
    expect(image.width).not.toBe(target.viewBoxWidth)
    // The base `contain` rect stays world-anchored, unchanged by this
    // amendment (`trace-canvas` spec, "Full-Sheet Render Sites").
    expect(html).toContain(`width="${target.viewBoxWidth}"`)
  })

  it('?debug=camara:280 on dolphin3: the backdrop image x matches the seeded viewBox origin exactly', () => {
    const level = getLevel('dolphin3')
    const target = buildLevelTarget(level)
    const originX = seedCameraOrigin(280, target.viewWidth, target.viewBoxWidth)
    const camera = { viewWidth: target.viewWidth, lead: level.camera!.lead, originX }
    const html = renderToString(
      <TraceCanvas
        fit="contain"
        viewBoxWidth={target.viewBoxWidth}
        backdrop={traceBackdrop('dolphin3')}
        camera={camera}
      />,
    )
    expect(html).toContain('viewBox="280 0 1000 600"')
    const image = backdropImage(html)
    expect(image.x).toBe(280)
    expect(image.width).toBe(1000)
  })

  it('?debug=camara:9999 on dolphin4: the backdrop image clamps to the SAME origin the viewBox clamps to', () => {
    const level = getLevel('dolphin4')
    const target = buildLevelTarget(level)
    const originX = seedCameraOrigin(9999, target.viewWidth, target.viewBoxWidth)
    const camera = { viewWidth: target.viewWidth, lead: level.camera!.lead, originX }
    const html = renderToString(
      <TraceCanvas
        fit="contain"
        viewBoxWidth={target.viewBoxWidth}
        backdrop={traceBackdrop('dolphin4')}
        camera={camera}
      />,
    )
    expect(html).toContain(`viewBox="${target.viewBoxWidth - target.viewWidth} 0 1000 600"`)
    const image = backdropImage(html)
    expect(image.x).toBe(target.viewBoxWidth - target.viewWidth)
    expect(image.width).toBe(1000)
  })

  it('a non-camera level renders the backdrop image byte-identically to before this amendment: x=0, width=viewBoxWidth', () => {
    const level = getLevel('dolphin1')
    expect(level.camera).toBeUndefined()
    const target = buildLevelTarget(level)
    const html = renderToString(
      <TraceCanvas fit="contain" viewBoxWidth={target.viewBoxWidth} backdrop={traceBackdrop('dolphin1')} />,
    )
    const image = backdropImage(html)
    expect(image.x).toBe(0)
    expect(image.width).toBe(target.viewBoxWidth)
    expect(image.width).toBe(1000)
  })
})

/** Parse every `<image x y width height href>` out of the HTML STRING — never
 *  the internal box objects (paso E's own gap; design.md §6.3's "markup →
 *  geometry" discipline, `WaypointLayer.test.tsx`'s own helper, restated). */
function parseImages(html: string): Array<{ x: number; y: number; width: number; height: number; href: string }> {
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

describe('TraceCanvas — the dolphin coincidence test, markup → geometry (design.md §5.1/§6.3, real catalog)', () => {
  const DOLPHIN_IDS = ['dolphin1', 'dolphin2', 'dolphin3', 'dolphin4'] as const
  const EXPECTED_COUNT: Record<string, number> = { dolphin1: 4, dolphin2: 6, dolphin3: 10, dolphin4: 14 }

  function dolphinImages(id: string) {
    const level = getLevel(id)
    const target = buildLevelTarget(level)
    const extrema = routeExtrema(target.polyline)
    const at = vertexArtPoints(extrema, {
      corridorWidth: level.corridorWidth,
      size: level.vertexArt!.size,
      clear: level.vertexArt!.clear ?? 8,
    })
    const html = renderToString(
      <TraceCanvas
        viewBoxWidth={target.viewBoxWidth}
        vertexArt={{ ...level.vertexArt!.art, size: level.vertexArt!.size, at }}
      />,
    )
    const images = parseImages(html).filter((img) => img.href === '/art/sector-dolphin.png')
    return { level, target, extrema, images }
  }

  it('counts are 4/6/10/14, half crest half trough', () => {
    for (const id of DOLPHIN_IDS) {
      const { images } = dolphinImages(id)
      expect(images, id).toHaveLength(EXPECTED_COUNT[id])
      expect(images.length % 2, id).toBe(0)
    }
  })

  it('every box is disjoint from the channel band 300 ± (160 + cw/2) at the AUTHORED width', () => {
    for (const id of DOLPHIN_IDS) {
      const { level, images } = dolphinImages(id)
      const channelTop = 300 - (160 + level.corridorWidth / 2)
      const channelBottom = 300 + (160 + level.corridorWidth / 2)
      for (const img of images) {
        const disjoint = img.y + img.height <= channelTop || img.y >= channelBottom
        expect(disjoint, `${id} box [${img.y}, ${img.y + img.height}] vs channel [${channelTop}, ${channelBottom}]`).toBe(true)
      }
    }
  })

  it("every box's x-centre equals its extremum's x within 0.5", () => {
    for (const id of DOLPHIN_IDS) {
      const { extrema, images } = dolphinImages(id)
      images.forEach((img, i) => {
        expect(img.x + img.width / 2, `${id}[${i}]`).toBeCloseTo(extrema[i].x, 0)
      })
    }
  })

  it('every box lies inside [0, W] x [0, 600] — clampArtBox is the identity', () => {
    for (const id of DOLPHIN_IDS) {
      const { target, images } = dolphinImages(id)
      for (const img of images) {
        expect(img.x, id).toBeGreaterThanOrEqual(0)
        expect(img.x + img.width, id).toBeLessThanOrEqual(target.viewBoxWidth)
        expect(img.y, id).toBeGreaterThanOrEqual(0)
        expect(img.y + img.height, id).toBeLessThanOrEqual(600)
      }
    }
  })

  it('falsifiability: with clear=0 and size=140 (docs/09 §3), disjointness AND the [0,W]x[0,600] containment both fail', () => {
    const level = getLevel('dolphin1')
    const target = buildLevelTarget(level)
    const extrema = routeExtrema(target.polyline)
    const at = vertexArtPoints(extrema, { corridorWidth: level.corridorWidth, size: 140, clear: 0 })
    const html = renderToString(
      <TraceCanvas
        viewBoxWidth={target.viewBoxWidth}
        vertexArt={{ ...level.vertexArt!.art, size: 140, at }}
      />,
    )
    const images = parseImages(html).filter((img) => img.href === '/art/sector-dolphin.png')
    const channelTop = 300 - (160 + level.corridorWidth / 2)
    const channelBottom = 300 + (160 + level.corridorWidth / 2)
    const anyOverlapsChannel = images.some(
      (img) => !(img.y + img.height <= channelTop || img.y >= channelBottom),
    )
    const anyOutsideSheet = images.some((img) => img.y < 0 || img.y + img.height > 600)
    expect(anyOverlapsChannel || anyOutsideSheet).toBe(true)
  })
})

describe('TraceCanvas — insurance: sheetBounds anchored to the WINDOW is asserted BROKEN (design.md §1.3 row 1, §6.3)', () => {
  it("dolphin3's dolphin boxes COLLIDE at the window's right edge when sheetBounds is forced to viewWidth (1000) instead of the world (1560)", () => {
    const level = getLevel('dolphin3')
    const target = buildLevelTarget(level)
    const extrema = routeExtrema(target.polyline)
    const at = vertexArtPoints(extrema, {
      corridorWidth: level.corridorWidth,
      size: level.vertexArt!.size,
      clear: level.vertexArt!.clear ?? 8,
    })
    // Forcing the WINDOW width (1000) as `viewBoxWidth` — the broken version
    // §1.3 row 1 warns against — clamps every box past x=931.4 back to the
    // window's right edge via `clampArtBox`, instead of the correct world
    // (1560).
    const html = renderToString(
      <TraceCanvas
        viewBoxWidth={target.viewWidth}
        vertexArt={{ ...level.vertexArt!.art, size: level.vertexArt!.size, at }}
      />,
    )
    const images = parseImages(html).filter((img) => img.href === '/art/sector-dolphin.png')
    // At least two distinct extrema collapse onto the SAME clamped x once the
    // window (not the world) is what boxes are clamped against.
    const rightEdgeXs = images.filter((img) => img.x + img.width >= target.viewWidth - 0.5)
    expect(rightEdgeXs.length).toBeGreaterThanOrEqual(2)
  })
})

describe('TraceCanvas viewBox band override (docs/02 §3: crop margin, never rescale)', () => {
  it('defaults to the whole 0…600 sheet', () => {
    expect(renderToString(<TraceCanvas />)).toContain('viewBox="0 0 1000 600"')
  })

  it('viewBoxY/viewBoxHeight crop the visible band, leaving sheet coordinates alone', () => {
    const html = renderToString(<TraceCanvas viewBoxY={140} viewBoxHeight={440} />)
    expect(html).toContain('viewBox="0 140 1000 440"')
    // Nothing MOVES: the ruled lines keep their sheet Ys, they are just seen
    // through a narrower window.
    for (const y of ['180', '300', '420', '540']) expect(html).toContain(`y1="${y}"`)
  })

  it('crops and widens at the same time (a long word on a short screen)', () => {
    const html = renderToString(
      <TraceCanvas viewBoxWidth={1148} viewBoxY={140} viewBoxHeight={440} />,
    )
    expect(html).toContain('viewBox="0 140 1148 440"')
    expect(html).toContain('x2="1148"')
  })
})

describe('TraceCanvas fit prop (docs/04 §3.3: contain-fit inside a flex area)', () => {
  it('defaults to the width fit: full width, no height attribute, CSS paper', () => {
    const html = renderToString(<TraceCanvas />)
    expect(html).toContain('width="100%"')
    expect(html).not.toContain('height="100%"')
    expect(html).toContain('#fdfcf7') // background stays on the element
    expect(html).not.toContain('<rect')
  })

  it('contain fills both axes and paints the paper as a viewBox rect', () => {
    const html = renderToString(<TraceCanvas fit="contain" viewBoxY={140} viewBoxHeight={440} />)
    expect(html).toContain('width="100%"')
    expect(html).toContain('height="100%"')
    expect(html).toContain('preserveAspectRatio="xMidYMid meet"')
    // The element letterboxes, so the paper must be the SHEET, not the box.
    expect(html).toContain('<rect')
    expect(html).toContain('fill="#fdfcf7"')
  })
})

describe('TraceCanvas surface prop (docs/01 principle 1: no meaningless pauta)', () => {
  it('defaults to the ruled pauta, so every existing caller is unchanged', () => {
    const html = renderToString(<TraceCanvas />)
    for (const y of ['180', '300', '420', '540']) expect(html).toContain(`y1="${y}"`)
  })

  it('surface="blank" draws NO ruled lines at all (fases 1-2)', () => {
    const html = renderToString(<TraceCanvas surface="blank" />)
    for (const y of ['180', '300', '420', '540']) expect(html).not.toContain(`y1="${y}"`)
    expect(html).not.toContain('<line')
  })

  it('surface="blank" still draws the corridor, the ink and the start marker', () => {
    const html = renderToString(
      <TraceCanvas
        surface="blank"
        corridor={{ paths: ['M 100 300 L 900 300'], width: 110 }}
        startMarker={{ x: 100, y: 300 }}
      />,
    )
    expect(html).toContain('M 100 300 L 900 300')
    expect(html).toContain('#22c55e') // start marker
    expect(html).not.toContain('<line')
  })

  it('surface="ruled" is explicit opt-in to the same four lines', () => {
    const html = renderToString(<TraceCanvas surface="ruled" viewBoxWidth={1148} />)
    expect(html).toContain('y1="420"')
    expect(html).toContain('x2="1148"')
  })
})

describe('TraceCanvas maze walls (docs/01 fase 1: senderos y laberintos)', () => {
  const corridor = { paths: ['M 100 300 L 900 300'], width: 110 }

  it('a non-maze corridor stays a soft grey channel on open paper', () => {
    const html = renderToString(<TraceCanvas corridor={corridor} />)
    expect(html).toContain('#cbd5e1')
    expect(html).not.toContain('<mask')
    expect(html).not.toContain('#e2e8f0')
  })

  it('maze fills the sheet with wall and paints the channel back in PAPER', () => {
    const html = renderToString(<TraceCanvas corridor={corridor} maze />)
    expect(html).toContain('#e2e8f0') // the wall fill
    expect(html).toContain('stroke="#fdfcf7"') // the channel IS exposed sheet
    expect(html).toContain('M 100 300 L 900 300')
  })

  it('the channel is stroked at the corridor width with round caps', () => {
    const html = renderToString(<TraceCanvas corridor={corridor} maze />)
    expect(html).toContain('stroke-width="110"')
    expect(html).toContain('stroke-linecap="round"')
    expect(html).toContain('stroke-linejoin="round"')
  })

  it('uses NO mask and NO url(#…) reference at all — the whole blank-sheet bug', () => {
    // The picture is two ordinary paints. A `url(#id)` reference resolves
    // against the document base URL and `mask` on inline SVG is a known
    // compatibility hazard; either one failing paints a blank sheet, which is
    // exactly what the maze levels did on a real device. There is nothing to
    // resolve here, so there is nothing to fail.
    const html = renderToString(<TraceCanvas corridor={corridor} maze />)
    expect(html).not.toContain('<mask')
    expect(html).not.toContain('mask=')
    expect(html).not.toContain('url(#')
    expect(html).not.toContain('<defs')
    expect(html).not.toContain('<clipPath')
    expect(html).not.toContain('<filter')
  })

  it('the whole surface never emits a fragment reference, maze or not', () => {
    const html = renderToString(
      <TraceCanvas
        corridor={corridor}
        maze
        startMarker={{ x: 100, y: 300 }}
        endMarker={{ x: 900, y: 300 }}
        directionArrow={{ x: 170, y: 300, angle: 0 }}
        beatPulse={{ x: 100, y: 300, on: true }}
        guide={['M 100 300 L 900 300']}
        guideD="M 100 300 L 900 300"
        carrier={{ x: 100, y: 300 }}
        startArt={{ href: '/art/carrier-octopus.png', w: 384, h: 353, size: 60 }}
        endArt={{ href: '/art/lamp-off.png', w: 132, h: 192, size: 52 }}
        inkColor="#8a6a4a"
        inkDimColor="#b3a08c"
      />,
    )
    expect(html).not.toContain('url(#')
  })

  it('maze without a corridor renders no wall — there would be nothing to cut', () => {
    expect(renderToString(<TraceCanvas maze />)).not.toContain('#e2e8f0')
  })

  it('the wall covers the CROPPED band, not the whole sheet', () => {
    const html = renderToString(
      <TraceCanvas corridor={corridor} maze viewBoxY={140} viewBoxHeight={440} />,
    )
    expect(html).toContain('viewBox="0 140 1000 440"')
    expect(html).toContain('height="440"')
  })

  it('the wall is painted BEFORE the channel, or the channel would be buried', () => {
    const html = renderToString(<TraceCanvas corridor={corridor} maze />)
    expect(html.indexOf('#e2e8f0')).toBeLessThan(html.indexOf('stroke="#fdfcf7"'))
  })
})

describe('TraceCanvas tapered corridor (LevelConfig.taper)', () => {
  // Subdivided: `flattenPathD` calls a 2-point path degenerate, and authored
  // level paths are always denser than that (`levels/paths.ts`).
  const paths = ['M 100 300 L 500 300 L 900 300']

  it('without a taper the corridor is ONE stroked path at the nominal width', () => {
    const html = renderToString(<TraceCanvas corridor={{ paths, width: 110 }} />)
    expect(html).toContain('stroke-width="110"')
    expect((html.match(/stroke="#cbd5e1"/g) ?? []).length).toBe(1)
  })

  it('with a taper the corridor becomes many pieces of DIFFERENT widths', () => {
    const html = renderToString(
      <TraceCanvas corridor={{ paths, width: 110, taper: { from: 1, to: 0.5 } }} />,
    )
    const pieces = (html.match(/stroke="#cbd5e1"/g) ?? []).length
    expect(pieces).toBeGreaterThan(10)
    const widths = [...html.matchAll(/stroke-width="([\d.]+)"/g)].map((m) => Number(m[1]))
    expect(Math.max(...widths)).toBeGreaterThan(Math.min(...widths))
    expect(Math.max(...widths)).toBeLessThanOrEqual(110)
  })

  it('a tapered MAZE paints width-varying pieces, not one constant channel', () => {
    const html = renderToString(
      <TraceCanvas corridor={{ paths, width: 110, taper: { from: 1, to: 0.4 } }} maze />,
    )
    // Only the CHANNEL strokes, so the ink path's own width cannot answer for
    // the taper.
    const widths = [...html.matchAll(/stroke="#fdfcf7" stroke-width="([\d.]+)"/g)].map((m) =>
      Number(m[1]),
    )
    expect(widths.length).toBeGreaterThan(10)
    // The channel must actually NARROW: same taper behaviour the mask had, now
    // carried by the paper-coloured strokes instead of the knockout.
    expect(Math.max(...widths)).toBeGreaterThan(100)
    expect(Math.max(...widths)).toBeLessThanOrEqual(110)
    expect(Math.min(...widths)).toBeLessThan(55)
    expect(html).not.toContain('url(#')
  })

  it('a degenerate route falls back to the plain constant-width stroke', () => {
    const html = renderToString(
      <TraceCanvas corridor={{ paths: ['M 10 10'], width: 90, taper: { from: 1, to: 0.5 } }} />,
    )
    expect(html).toContain('stroke-width="90"')
  })
})

describe('TraceCanvas beat pulse (docs/01 fase 2: ritmo, visible when muted)', () => {
  it('renders nothing without the prop', () => {
    // The middle ruled line is also #0ea5e9, so the pulse is identified by its
    // transition instead of its colour.
    expect(renderToString(<TraceCanvas />)).not.toContain('transition:transform')
  })

  it('swells on the beat and settles between beats', () => {
    const on = renderToString(<TraceCanvas beatPulse={{ x: 120, y: 240, on: true }} />)
    const off = renderToString(<TraceCanvas beatPulse={{ x: 120, y: 240, on: false }} />)
    expect(on).toContain('scale(1.35)')
    expect(off).toContain('scale(1)')
    expect(on).toContain('cx="120"')
    expect(on).not.toEqual(off)
  })

  it('is a RING, concentric with the start marker, so it cannot hide it', () => {
    const html = renderToString(
      <TraceCanvas beatPulse={{ x: 120, y: 240, on: true }} startMarker={{ x: 120, y: 240 }} />,
    )
    // Stroked, not filled: the green start dot stays visible inside it.
    expect(html).toContain('stroke="#0ea5e9"')
    expect(html).toContain('fill="none"')
    // Wider than the r=22 marker, and clear of the arrow's nearest point (56).
    const r = Number(html.match(/r="(\d+)"[^>]*fill="none"[^>]*stroke="#0ea5e9"/)?.[1] ?? 0)
    expect(r).toBeGreaterThan(22)
    expect(r).toBeLessThan(56)
  })

  it('the swell is a CSS transition, so no animation library and no rAF', () => {
    const html = renderToString(<TraceCanvas beatPulse={{ x: 120, y: 240, on: true }} />)
    expect(html).toContain('transition:transform 120ms ease-out')
  })
})

describe('TraceCanvas goal marker (docs/03 §7: where the route ends)', () => {
  const marker = { x: 400, y: 300 }

  it('renders nothing without the prop', () => {
    expect(renderToString(<TraceCanvas />)).not.toContain('#b45309')
  })

  it('is a different SHAPE from the start dot, not just a different colour', () => {
    // A colour-blind child must still tell them apart; tracing the level
    // backwards would fail the direction pillar for a reason that is ours.
    const html = renderToString(<TraceCanvas endMarker={marker} startMarker={{ x: 90, y: 300 }} />)
    expect(html).toContain('<circle') // the start dot is a disc
    expect(html).toContain('<polygon') // the goal is a diamond
    expect(html).toContain('#b45309')
    expect(html).toContain('#22c55e')
  })

  it('is HOLLOW, so an overlap nests instead of hiding the start dot', () => {
    const html = renderToString(<TraceCanvas endMarker={marker} />)
    const goal = html.slice(html.indexOf('#b45309') - 200, html.indexOf('#b45309') + 200)
    expect(goal).toContain('fill="none"')
  })

  it('sits exactly on the given point', () => {
    expect(renderToString(<TraceCanvas endMarker={marker} />)).toContain('translate(400 300)')
  })

  it('draws BEFORE the start marker, so green always wins the centre', () => {
    const html = renderToString(<TraceCanvas endMarker={marker} startMarker={{ x: 400, y: 300 }} />)
    expect(html.indexOf('#b45309')).toBeLessThan(html.indexOf('#22c55e'))
  })

  it('is wide enough to nest around the r=22 start dot', () => {
    const html = renderToString(<TraceCanvas endMarker={marker} />)
    const points = [...html.matchAll(/points="0,-(\d+)/g)].map((m) => Number(m[1]))
    expect(Math.max(...points)).toBeGreaterThan(22)
  })
})

describe('TraceCanvas hazards (docs/08: obstáculos con tiempo)', () => {
  const hazards = {
    radii: [30, 22],
    at: (i: number, t: number) => ({ x: 200 + i * 100, y: 300 + t / 10 }),
  }

  it('renders nothing without the prop', () => {
    expect(renderToString(<TraceCanvas />)).not.toContain('#7e6a9e')
  })

  it('renders one solid muted circle per hazard, at its own radius', () => {
    const html = renderToString(<TraceCanvas hazards={hazards} />)
    expect((html.match(/fill="#7e6a9e"/g) ?? []).length).toBe(2)
    expect(html).toContain('r="30"')
    expect(html).toContain('r="22"')
  })

  it('is muted and distinguishable from the green start dot and the ochre goal', () => {
    const html = renderToString(
      <TraceCanvas hazards={hazards} startMarker={{ x: 90, y: 300 }} endMarker={{ x: 900, y: 300 }} />,
    )
    // Three different colours for three different meanings.
    expect(html).toContain('#7e6a9e') // hazard
    expect(html).toContain('#22c55e') // start
    expect(html).toContain('#b45309') // goal
  })

  it('is placed at t=0 in the markup, so the first paint already shows it on the route', () => {
    const html = renderToString(<TraceCanvas hazards={hazards} />)
    expect(html).toContain('cx="200"')
    expect(html).toContain('cx="300"')
    expect(html).toContain('cy="300"') // at(_, 0)
  })

  it('draws ABOVE the ink, so the child sees the ball over their own trace', () => {
    const html = renderToString(
      <TraceCanvas hazards={hazards} completedStrokes={[[{ x: 10, y: 10 }, { x: 20, y: 20 }]]} />,
    )
    expect(html.indexOf('#1e293b')).toBeLessThan(html.indexOf('#7e6a9e'))
  })

  it('trail1 renders its circle hazard numerically unchanged, not a translated wrapper', () => {
    // Numeric verification (design.md §4), not a screenshot: proves the added
    // art branch left the plain-circle branch byte-identical for the one
    // level that ships it today.
    const level = getLevel('trail1')
    const target = buildLevelTarget(level)
    const o = level.obstacles![0]
    const home = obstacleAt(o, target, 0)
    const html = renderToString(
      <TraceCanvas hazards={{ radii: [o.radius], at: (_, t) => obstacleAt(o, target, t) }} />,
    )
    expect(html).toContain(`cx="${home.x}"`)
    expect(html).toContain(`cy="${home.y}"`)
    expect(html).toContain('r="30"')
    // The load-bearing assertion: fails if the circle ever acquires a
    // translated `<g>` wrapper.
    expect(html).not.toMatch(/<g[^>]*transform="translate[^"]*"[^>]*>\s*<circle/)
  })

  it('an art-bearing hazard renders as a transformed group with an image, not a circle', () => {
    const art = { href: '/art/hazard-starfish.png', w: 320, h: 320 }
    const at = (_i: number, t: number) => ({ x: 500 + t, y: 300 })
    const home = at(0, 0)
    const html = renderToString(
      <TraceCanvas hazards={{ radii: [34], at, art }} />,
    )
    expect(html).toMatch(new RegExp(`<g[^>]*transform="translate\\(${home.x} ${home.y}\\)"`))
    expect(html).not.toMatch(/<circle/)
    expect(html).toContain('<image')
    expect(html).toMatch(/href="\/art\/hazard-starfish\.png"/)
    const box = placeArt(art, 2 * 34, { x: 0, y: 0 })
    expect(html).toContain(`width="${box.width}"`)
    expect(html).toContain(`height="${box.height}"`)
    expect(html).toContain(`x="${box.x}"`)
    expect(html).toContain(`y="${box.y}"`)
  })
})

describe('TraceCanvas carrier (LevelConfig.carrier: llevar a alguien, no trazar)', () => {
  it('renders nothing without the prop', () => {
    expect(renderToString(<TraceCanvas />)).not.toContain('#5f8a86')
  })

  it('rests on the given point before the stroke begins', () => {
    const html = renderToString(<TraceCanvas carrier={{ x: 140, y: 260 }} />)
    expect(html).toContain('#5f8a86')
    expect(html).toContain('translate(140 260)')
  })

  it('is a body and a head — a shape that reads as someone being carried', () => {
    const html = renderToString(<TraceCanvas carrier={{ x: 140, y: 260 }} />)
    const token = html.slice(html.indexOf('translate(140 260)'))
    expect(token).toContain('<rect')
    expect(token).toContain('<circle')
  })

  it('is drawn topmost, so it is never buried by the ink it rides on', () => {
    const html = renderToString(
      <TraceCanvas
        carrier={{ x: 140, y: 260 }}
        completedStrokes={[[{ x: 10, y: 10 }, { x: 20, y: 20 }]]}
      />,
    )
    expect(html.indexOf('#1e293b')).toBeLessThan(html.indexOf('#5f8a86'))
  })

  it('has an outline in the paper colour, so it stays legible over dark ink', () => {
    const html = renderToString(<TraceCanvas carrier={{ x: 140, y: 260 }} />)
    expect(html).toContain('stroke="#fdfcf7"')
  })
})

describe('TraceCanvas clues prop (design.md "Decision: clue layer is a new `clues` prop, not `children`")', () => {
  // The canvas imports nothing from `detective/`, so its own suite names the
  // art by literal path rather than importing the registry — the same
  // convention the colour-token version of these fixtures used. The registry
  // side of the contract is `detective/artManifest.test.ts`'s job.
  const DRAINED_HREF = '/art/clue-droplet-drained.png'
  const EARNED_HREF = '/art/clue-droplet-earned.png'
  const drainedMark = {
    x: 200,
    y: 300,
    angle: 0,
    href: DRAINED_HREF,
    w: 195,
    h: 256,
    size: 28,
  }
  const earnedMark = { ...drainedMark, href: EARNED_HREF }

  it('renders nothing without the prop (trace-canvas spec, "Drained mark renders grey")', () => {
    expect(renderToString(<TraceCanvas />)).not.toContain('/art/')
  })

  it('renders a drained mark with the shared drained art (trace-canvas spec, "Drained mark renders grey")', () => {
    const html = renderToString(<TraceCanvas clues={{ marks: [drainedMark] }} />)
    expect(html).toContain(`href="${DRAINED_HREF}"`)
  })

  it("renders an earned mark with its trail's own art (trace-canvas spec, \"Earned mark renders its trail colour\")", () => {
    const html = renderToString(<TraceCanvas clues={{ marks: [earnedMark] }} />)
    expect(html).toContain(`href="${EARNED_HREF}"`)
  })

  it('keeps drained and earned visibly DISTINCT, never the same file twice', () => {
    // The whole clue mechanic is "this mark lit up". Two marks in opposite
    // states must not render identically, which is the property the old
    // fill-colour assertions were really protecting.
    const html = renderToString(<TraceCanvas clues={{ marks: [drainedMark, earnedMark] }} />)
    expect(html).toContain(`href="${DRAINED_HREF}"`)
    expect(html).toContain(`href="${EARNED_HREF}"`)
    expect(DRAINED_HREF).not.toBe(EARNED_HREF)
  })

  it('renders a mark the caller resolved to any trail, without knowing the trail exists', () => {
    // The canvas holds no clue token of its own: whatever href the caller
    // resolved is what renders, including the achromatic footprint the
    // palette suite pins to PRINT.
    const footprint = { ...drainedMark, href: '/art/clue-footprint-earned.png', w: 220 }
    const html = renderToString(<TraceCanvas clues={{ marks: [footprint] }} />)
    expect(html).toContain('href="/art/clue-footprint-earned.png"')
  })

  it('introduces no url(#) reference with clues populated (trace-canvas spec, "No url() reference is introduced")', () => {
    const html = renderToString(<TraceCanvas clues={{ marks: [earnedMark, drainedMark] }} />)
    expect(html).not.toContain('url(#')
  })

  it('renders UNDER the live ink, not above it', () => {
    const html = renderToString(<TraceCanvas clues={{ marks: [earnedMark] }} />)
    // The only `#1e293b` (INK_COLOR) occurrence on a bare canvas is the live
    // ink path itself, so this stays a clean z-order check — only the clue
    // side of it is an href now instead of a colour.
    expect(html.indexOf(EARNED_HREF)).toBeLessThan(html.indexOf('#1e293b'))
  })

  it('positions a mark by translate/rotate, centring the image on the origin itself', () => {
    // The group transform stays PURE PLACEMENT and the `<image>` carries its
    // own centring offset, so the caller still does no offset arithmetic.
    // 100x200 art at size 40 is 20 wide, so the centred box is (-10,-20).
    const html = renderToString(
      <TraceCanvas
        clues={{ marks: [{ ...earnedMark, x: 150, y: 250, angle: 45, w: 100, h: 200, size: 40 }] }}
      />,
    )
    expect(html).toContain('transform="translate(150 250) rotate(45)"')
    expect(html).toContain('x="-10"')
    expect(html).toContain('y="-20"')
    expect(html).toContain('width="20"')
    expect(html).toContain('height="40"')
  })

  it('holds each source file\'s aspect ratio, so a slim feather is not stretched to a footprint\'s width', () => {
    // `size` is a HEIGHT. Two differently-shaped files at the same size must
    // share a height and differ in width — the regression this guards is
    // someone reintroducing a single square box for every mark.
    const feather = { ...earnedMark, href: '/art/clue-feather-earned.png', w: 103, h: 256, size: 64 }
    const footprint = { ...earnedMark, href: '/art/clue-footprint-earned.png', w: 220, h: 256, size: 64 }
    const html = renderToString(<TraceCanvas clues={{ marks: [feather, footprint] }} />)
    const boxes = [...html.matchAll(/width="([\d.]+)" height="([\d.]+)"/g)].map(([, w, h]) => [
      Number(w),
      Number(h),
    ])
    const marks = boxes.filter(([, h]) => h === 64)
    expect(marks.length).toBe(2)
    expect(marks[0][0]).not.toBe(marks[1][0])
    expect(marks[0][0]).toBeCloseTo((64 * 103) / 256, 4)
    expect(marks[1][0]).toBeCloseTo((64 * 220) / 256, 4)
  })
})

describe('TraceCanvas carrierArt override (design.md "carrierArt override stays")', () => {
  const LENS = { href: '/art/carrier-lens.png', w: 148, h: 160 }

  it('renders the shipped sage shape when the override is absent', () => {
    const html = renderToString(<TraceCanvas carrier={{ x: 140, y: 260 }} />)
    expect(html).toContain('#5f8a86')
    expect(html).toContain('<rect')
  })

  it('renders the override art instead of the shipped shape when present', () => {
    const html = renderToString(<TraceCanvas carrier={{ x: 140, y: 260 }} carrierArt={LENS} />)
    expect(html).toContain(`href="${LENS.href}"`)
    expect(html).not.toContain('#5f8a86')
    expect(html).not.toContain('<rect')
  })

  it('centres the override on the carrier group WITHOUT writing a transform of its own', () => {
    // Load-bearing: the rAF loop rewrites `transform` on the carrier GROUP
    // every frame (TraceCanvas.tsx's frame callback), so a transform written
    // on the art is erased within ~16ms and the glass would sit off-centre
    // the instant the child starts drawing. Centring must live on the
    // `<image>`'s own x/y. 148x160 at height 104 is 96.2 wide.
    const html = renderToString(<TraceCanvas carrier={{ x: 140, y: 260 }} carrierArt={LENS} />)
    const image = html.slice(html.indexOf('<image'), html.indexOf('>', html.indexOf('<image')))
    expect(image).not.toContain('transform')
    expect(image).toContain('x="-48.1"')
    expect(image).toContain('y="-52"')
    expect(image).toContain('width="96.2"')
    expect(image).toContain('height="104"')
  })

  it('introduces no url(#) reference under the override', () => {
    const html = renderToString(<TraceCanvas carrier={{ x: 140, y: 260 }} carrierArt={LENS} />)
    expect(html).not.toContain('url(#')
  })

  it('has no effect without a carrier', () => {
    const html = renderToString(<TraceCanvas carrierArt={LENS} />)
    expect(html).not.toContain(LENS.href)
  })

  it('renders at CARRIER_ART_SIZE (104) by default, and at carrierArt.size when authored (the bee, 76)', () => {
    // 148x160 at height 104 is 96.2 wide (matches the test above); at 76 it
    // is 70.3 wide — a level's own art beats a default it did not ask for
    // (design.md §2.3, the carrier-visibility repair).
    const defaultHtml = renderToString(<TraceCanvas carrier={{ x: 140, y: 260 }} carrierArt={LENS} />)
    const defaultImage = defaultHtml.slice(
      defaultHtml.indexOf('<image'),
      defaultHtml.indexOf('>', defaultHtml.indexOf('<image')),
    )
    expect(defaultImage).toContain('height="104"')

    const sized = renderToString(
      <TraceCanvas carrier={{ x: 140, y: 260 }} carrierArt={{ ...LENS, size: 76 }} />,
    )
    const sizedImage = sized.slice(sized.indexOf('<image'), sized.indexOf('>', sized.indexOf('<image')))
    expect(sizedImage).toContain('height="76"')
    expect(sizedImage).toContain('width="70.3"')
  })
})

describe('TraceCanvas inkOnly (detective-mode: the world is ink, colour means earned)', () => {
  const shipped = { goal: '#b45309', hazard: '#7e6a9e', start: '#22c55e' }

  it('renders none of the shipped marker colours when inkOnly is set', () => {
    const html = renderToString(
      <TraceCanvas
        inkOnly
        endMarker={{ x: 900, y: 300 }}
        startMarker={{ x: 100, y: 300 }}
        directionArrow={{ x: 140, y: 300, angle: 0 }}
        hazards={{ radii: [32], at: () => ({ x: 500, y: 300 }) }}
      />,
    )
    for (const [name, hex] of Object.entries(shipped)) {
      expect(html, `inkOnly still rendered the shipped ${name} colour`).not.toContain(hex)
    }
  })

  it('still renders them without inkOnly, so the assertion above can fail', () => {
    const html = renderToString(
      <TraceCanvas
        endMarker={{ x: 900, y: 300 }}
        startMarker={{ x: 100, y: 300 }}
        directionArrow={{ x: 140, y: 300, angle: 0 }}
        hazards={{ radii: [32], at: () => ({ x: 500, y: 300 }) }}
      />,
    )
    for (const hex of Object.values(shipped)) expect(html).toContain(hex)
  })
})

describe('TraceCanvas ground — the maze as a PLACE (docs/09 section 7)', () => {
  const corridor = { paths: ['M 100 300 L 900 300'], width: 110 }
  const art = [{ href: '/art/ground-grass-1.png', w: 118, h: 81 }]
  const mudArt = [{ href: '/art/ground-mud-1.png', w: 128, h: 99 }]
  const ground = {
    grass: { marks: [{ x: 120, y: 80, art: 0, size: 44, angle: -3 }], art },
    mud: { marks: [{ x: 400, y: 302, art: 0, size: 20, angle: 200 }], art: mudArt },
  }

  it('WITHOUT the prop the maze is exactly the grey sheet it always was', () => {
    const html = renderToString(<TraceCanvas corridor={corridor} maze />)
    expect(html).toContain('#e2e8f0')
    expect(html).toContain('stroke="#fdfcf7"')
    expect(html).not.toContain('#c9d7bd')
    expect(html).not.toContain('/art/ground-')
  })

  it('WITH it the field becomes grass and the channel becomes trodden earth', () => {
    const html = renderToString(<TraceCanvas corridor={corridor} maze ground={ground} />)
    expect(html).toContain('fill="#c9d7bd"') // the field
    expect(html).toContain('stroke="#d9c3ae"') // the walked path
    expect(html).not.toContain('#e2e8f0') // …and the grey wall is gone
  })

  it('keeps the stroking MECHANISM, so a taper still narrows', () => {
    // Same parse the grey maze is proved by, against the earth colour: the
    // `url(#)` scar is the reason this must stay a stroke and never a fill.
    const html = renderToString(
      <TraceCanvas
        corridor={{ paths: ['M 100 300 L 500 120 L 900 300'], width: 110, taper: { from: 1, to: 0.4 } }}
        maze
        ground={ground}
      />,
    )
    const widths = [...html.matchAll(/stroke="#d9c3ae" stroke-width="([\d.]+)"/g)].map((m) =>
      Number(m[1]),
    )
    expect(widths.length).toBeGreaterThan(10)
    expect(Math.max(...widths)).toBeLessThanOrEqual(110)
    expect(Math.min(...widths)).toBeLessThan(55)
  })

  it('scatters each mark as an origin-centred <image>, width from the aspect', () => {
    const html = renderToString(<TraceCanvas corridor={corridor} maze ground={ground} />)
    expect(html).toContain('/art/ground-grass-1.png')
    expect(html).toContain('/art/ground-mud-1.png')
    expect(html).toContain('transform="translate(120 80) rotate(-3)"')
    // 44 units tall at 118x81 => 64.098 wide, centred on the origin.
    const w = (44 * 118) / 81
    expect(html).toContain(`width="${w}"`)
    expect(html).toContain(`x="${-w / 2}"`)
  })

  it('paints mud before grass, and the whole ground UNDER the ink', () => {
    const html = renderToString(<TraceCanvas corridor={corridor} maze ground={ground} />)
    expect(html.indexOf('/art/ground-mud-1.png')).toBeLessThan(
      html.indexOf('/art/ground-grass-1.png'),
    )
    expect(html.indexOf('/art/ground-grass-1.png')).toBeLessThan(html.indexOf('#1e293b'))
    // …and the field is painted before any of it.
    expect(html.indexOf('fill="#c9d7bd"')).toBeLessThan(html.indexOf('/art/ground-mud-1.png'))
  })

  it('introduces no url(#) reference and no <defs> with the ground on', () => {
    const html = renderToString(
      <TraceCanvas corridor={corridor} maze ground={ground} fit="contain" />,
    )
    expect(html).not.toContain('url(#')
    expect(html).not.toContain('<defs')
    expect(html).not.toContain('<clipPath')
    expect(html).not.toContain('<pattern')
    expect(html).not.toContain('<mask')
  })

  it('drops a mark whose art index is out of range instead of emitting a broken href', () => {
    const html = renderToString(
      <TraceCanvas
        corridor={corridor}
        maze
        ground={{ grass: { marks: [{ x: 1, y: 2, art: 9, size: 30, angle: 0 }], art }, mud: ground.mud }}
      />,
    )
    expect(html).not.toContain('href="undefined"')
    expect((html.match(/\/art\/ground-/g) ?? []).length).toBe(1)
  })

  it('the sheet has NO rounded corner — that was half the "floating card" tell', () => {
    const html = renderToString(
      <TraceCanvas corridor={corridor} maze ground={ground} fit="contain" />,
    )
    expect(html).not.toContain('rx=')
    expect(html).not.toContain('rx="12"')
  })
})


describe('TraceCanvas backdrop (duck-undulations-and-sector-backdrop design.md §3.4)', () => {
  const corridor = { paths: ['M 100 300 L 900 300'], width: 110 }
  const backdrop = { href: '/art/sector-lagoon-background.png', quiet: '#b4c5d0' }
  const art = [{ href: '/art/ground-grass-1.png', w: 118, h: 81 }]
  const mudArt = [{ href: '/art/ground-mud-1.png', w: 128, h: 99 }]
  const ground = {
    grass: { marks: [{ x: 120, y: 80, art: 0, size: 44, angle: -3 }], art },
    mud: { marks: [{ x: 400, y: 302, art: 0, size: 20, angle: 200 }], art: mudArt },
  }

  it('renders the image with slice on the image, never on the root svg', () => {
    const html = renderToString(<TraceCanvas corridor={corridor} maze backdrop={backdrop} />)
    expect(html).toContain(`href="${backdrop.href}"`)
    expect(html).toContain('preserveAspectRatio="xMidYMid slice"')
    const svgOpenTag = html.slice(0, html.indexOf('>') + 1)
    expect(svgOpenTag).not.toContain('preserveAspectRatio="xMidYMid slice"')
  })

  it('paints the quiet rect under the image', () => {
    const html = renderToString(<TraceCanvas corridor={corridor} maze backdrop={backdrop} />)
    expect(html).toContain(`fill="${backdrop.quiet}"`)
  })

  it('drops the full-sheet wall rect — the backdrop IS the wall', () => {
    const html = renderToString(<TraceCanvas corridor={corridor} maze backdrop={backdrop} />)
    expect(html).not.toContain('#e2e8f0') // MAZE_WALL
    expect(html).not.toContain('#c9d7bd') // GROUND_FIELD
  })

  it('strokes the channel in SHEET_PAPER, whatever ground says', () => {
    const withGround = renderToString(
      <TraceCanvas corridor={corridor} maze backdrop={backdrop} ground={ground} />,
    )
    expect(withGround).toContain('stroke="#fdfcf7"')
    expect(withGround).not.toContain('stroke="#d9c3ae"') // CORRIDOR_EARTH
    const withoutGround = renderToString(<TraceCanvas corridor={corridor} maze backdrop={backdrop} />)
    expect(withoutGround).toContain('stroke="#fdfcf7"')
  })

  it('introduces no url(#) reference and no <mask>/<pattern>/<clipPath>/<defs>', () => {
    const html = renderToString(
      <TraceCanvas corridor={corridor} maze backdrop={backdrop} ground={ground} />,
    )
    expect(html).not.toContain('url(#')
    expect(html).not.toContain('<mask')
    expect(html).not.toContain('<pattern')
    expect(html).not.toContain('<clipPath')
    expect(html).not.toContain('<defs')
  })

  it('renders the channel path AFTER (below) the backdrop image, in document order', () => {
    const html = renderToString(<TraceCanvas corridor={corridor} maze backdrop={backdrop} />)
    expect(html.indexOf(`href="${backdrop.href}"`)).toBeLessThan(html.indexOf('stroke="#fdfcf7"'))
  })

  it('renders no backdrop layer at all without the prop', () => {
    const html = renderToString(<TraceCanvas corridor={corridor} maze />)
    expect(html).not.toContain('sector-lagoon-background')
  })

  it('leaves a plain maze byte-identical to before this prop existed', () => {
    const withoutBackdrop = renderToString(<TraceCanvas corridor={corridor} maze />)
    expect(withoutBackdrop).toContain('#e2e8f0')
    expect(withoutBackdrop).toContain('stroke="#fdfcf7"')
  })

  it('leaves a ground maze byte-identical to before this prop existed', () => {
    const withoutBackdrop = renderToString(<TraceCanvas corridor={corridor} maze ground={ground} />)
    expect(withoutBackdrop).toContain('fill="#c9d7bd"')
    expect(withoutBackdrop).toContain('stroke="#d9c3ae"')
    expect(withoutBackdrop).not.toContain('sector-lagoon-background')
  })

  // trace-canvas spec: "Channel Paint Follows the Backdrop Luma Law" — a
  // backdrop declaring its own `channel` (design.md §2.1, row C's stone).
  it('strokes the channel in the backdrop\'s own channel when it declares one', () => {
    const stoneBackdrop = { ...backdrop, channel: CHANNEL_STONE }
    const html = renderToString(<TraceCanvas corridor={corridor} maze backdrop={stoneBackdrop} />)
    expect(html).toContain(`stroke="${CHANNEL_STONE}"`)
    expect(html).not.toContain('stroke="#fdfcf7"')
  })

  it("byte-identical for the lagoon: no channel field, resolved paint is still SHEET_PAPER (task 4.10's regression)", () => {
    const html = renderToString(<TraceCanvas corridor={corridor} maze backdrop={backdrop} />)
    expect(backdrop).not.toHaveProperty('channel')
    expect(html).toContain('stroke="#fdfcf7"')
    expect(html).not.toContain(CHANNEL_STONE)
  })

  it('is tight: injecting a channel string on the lagoon backdrop DOES change the stroke (proves the byte-identity check is sensitive)', () => {
    const withChannel = { ...backdrop, channel: CHANNEL_STONE }
    const withoutChannel = renderToString(<TraceCanvas corridor={corridor} maze backdrop={backdrop} />)
    const withChannelHtml = renderToString(<TraceCanvas corridor={corridor} maze backdrop={withChannel} />)
    expect(withoutChannel).not.toEqual(withChannelHtml)
  })

  // trace-canvas spec: "Demo Stroke Contrasts With the Channel"
  it('swaps the demo stroke to SHEET_PAPER over a channelled backdrop, and keeps DEMO_STROKE otherwise', () => {
    const demoProp = { d: 'M 100 300 L 900 300', delay: 0, duration: 1, strokeWidth: 14 }
    const stoneBackdrop = { ...backdrop, channel: CHANNEL_STONE }
    const overStone = renderToString(
      <TraceCanvas corridor={corridor} maze backdrop={stoneBackdrop} demo={demoProp} />,
    )
    expect(overStone).toContain('stroke="#fdfcf7"')
    expect(overStone).not.toContain(`stroke="${DEMO_STROKE}"`)

    const noBackdrop = renderToString(<TraceCanvas demo={demoProp} />)
    expect(noBackdrop).toContain(`stroke="${DEMO_STROKE}"`)

    const lagoonBackdrop = renderToString(
      <TraceCanvas corridor={corridor} maze backdrop={backdrop} demo={demoProp} />,
    )
    expect(lagoonBackdrop).toContain(`stroke="${DEMO_STROKE}"`)
  })
})

describe('TraceCanvas vertexArt (design.md §3.3: static art standing at the route\'s own peaks)', () => {
  const SHEEP = { href: '/art/sector-sheep.png', w: 409, h: 448, size: 56 }
  const points = [
    { x: 250, y: 160 },
    { x: 500, y: 310 },
    { x: 750, y: 160 },
  ]

  it('renders exactly one <image> per apex, each via placeArt\'s own formula', () => {
    const html = renderToString(<TraceCanvas vertexArt={{ ...SHEEP, at: points }} />)
    const matches = html.match(new RegExp(`href="${SHEEP.href}"`, 'g')) ?? []
    expect(matches).toHaveLength(3)
    const width = (SHEEP.size * SHEEP.w) / SHEEP.h
    const firstImage = html.slice(html.indexOf('<image'), html.indexOf('>', html.indexOf('<image')))
    const attr = (name: string): number =>
      Number(firstImage.match(new RegExp(`${name}="([-\\d.]+)"`))?.[1])
    expect(attr('height')).toBe(SHEEP.size)
    expect(attr('y')).toBe(points[0].y - SHEEP.size) // feet at the point
    expect(attr('width')).toBeCloseTo(width, 6)
    expect(attr('x')).toBeCloseTo(points[0].x - width / 2, 6)
  })

  it('renders vertex art BEFORE (under) the endArt block, in document order', () => {
    const LAMP = { href: '/art/lamp-off.png', w: 132, h: 192, size: 52 }
    const html = renderToString(
      <TraceCanvas vertexArt={{ ...SHEEP, at: points }} endMarker={{ x: 900, y: 300 }} endArt={LAMP} />,
    )
    expect(html.indexOf(SHEEP.href)).toBeLessThan(html.indexOf(LAMP.href))
  })

  it('renders no vertex-art layer at all without the prop', () => {
    const html = renderToString(<TraceCanvas />)
    expect(html).not.toContain('sector-sheep')
  })

  it('introduces no url(#), <mask>, <pattern>, <clipPath>, or <defs>', () => {
    const html = renderToString(<TraceCanvas vertexArt={{ ...SHEEP, at: points }} />)
    expect(html).not.toContain('url(#')
    expect(html).not.toContain('<mask')
    expect(html).not.toContain('<pattern')
    expect(html).not.toContain('<clipPath')
    expect(html).not.toContain('<defs')
  })

  describe('vertexArtDeparting (T17, collect-along-the-path follow-up: a picture hopping away)', () => {
    it('renders one <image> per departing point, tagged .cv-collect-hop, distinct from the steady layer', () => {
      const html = renderToString(
        <TraceCanvas
          vertexArt={{ ...SHEEP, at: [points[1], points[2]] }}
          vertexArtDeparting={{ ...SHEEP, at: [points[0]] }}
        />,
      )
      expect(html.match(/class="cv-collect-hop"/g) ?? []).toHaveLength(1)
      // The steady layer's own images carry no hop class.
      const steadyImages = html.match(/<image[^>]*>/g) ?? []
      const nonHopSteady = steadyImages.filter((img) => !img.includes('cv-collect-hop'))
      expect(nonHopSteady).toHaveLength(2)
    })

    it('renders nothing extra without the prop', () => {
      const html = renderToString(<TraceCanvas vertexArt={{ ...SHEEP, at: points }} />)
      expect(html).not.toContain('cv-collect-hop')
    })

    it('places the departing image with the SAME feet-anchored formula as the steady layer', () => {
      const html = renderToString(<TraceCanvas vertexArtDeparting={{ ...SHEEP, at: [points[0]] }} />)
      const width = (SHEEP.size * SHEEP.w) / SHEEP.h
      const img = html.slice(html.indexOf('<image'), html.indexOf('>', html.indexOf('<image')))
      const attr = (name: string): number => Number(img.match(new RegExp(`${name}="([-\\d.]+)"`))?.[1])
      expect(attr('height')).toBe(SHEEP.size)
      expect(attr('y')).toBe(points[0].y - SHEEP.size)
      expect(attr('width')).toBeCloseTo(width, 6)
    })

    it('introduces no url(#), <mask>, <pattern>, <clipPath>, or <defs>', () => {
      const html = renderToString(<TraceCanvas vertexArtDeparting={{ ...SHEEP, at: points }} />)
      expect(html).not.toContain('url(#')
      expect(html).not.toContain('<mask')
      expect(html).not.toContain('<pattern')
      expect(html).not.toContain('<clipPath')
      expect(html).not.toContain('<defs')
    })
  })
})

// trace-canvas spec: "Channel Paint Follows the Backdrop Luma Law" —
// falsifiability rows (task 6.2). Each proves the luma law is SENSITIVE, not
// vacuously true: every colour below is the exact reason `CHANNEL_STONE` was
// forced rather than chosen (design.md §2.1). Mirrored as literals rather
// than imported from their owning (module-private) constants — the same
// convention `backdrops.test.ts` already follows for SHEET_PAPER/
// CORRIDOR_EARTH.
describe('luma law falsifiability rows (design.md §2.1 — must go RED)', () => {
  const MIN_CONTRAST = 55 // docs/09:158
  const MUD_INK = '#8a6a4a' // screen/LevelPlay.tsx, module-private
  const GOAL_COLOR = '#b45309' // canvas/TraceCanvas.tsx, module-private
  const START_GREEN = '#22c55e' // start dot / direction arrow

  it('MUD_INK fails the luma law against CHANNEL_STONE (gap 12)', () => {
    expect(Math.abs(luma(MUD_INK) - luma(CHANNEL_STONE))).toBeLessThan(MIN_CONTRAST)
  })

  it('GOAL_COLOR fails the luma law against CHANNEL_STONE (gap 4)', () => {
    expect(Math.abs(luma(GOAL_COLOR) - luma(CHANNEL_STONE))).toBeLessThan(MIN_CONTRAST)
  })

  it('the start marker / direction-arrow green fails the luma law against CHANNEL_STONE (gap 37)', () => {
    expect(Math.abs(luma(START_GREEN) - luma(CHANNEL_STONE))).toBeLessThan(MIN_CONTRAST)
  })

  it('DEMO_STROKE fails the luma law against CHANNEL_STONE (gap 1)', () => {
    expect(Math.abs(luma(DEMO_STROKE) - luma(CHANNEL_STONE))).toBeLessThan(MIN_CONTRAST)
  })
})

describe('TraceCanvas startArt / endArt (registry art standing at the ends of the route)', () => {
  const OCTOPUS = { href: '/art/carrier-octopus.png', w: 384, h: 353, size: 60 }
  const LAMP_OFF = { href: '/art/lamp-off.png', w: 132, h: 192, size: 52 }
  const LAMP_ON = { href: '/art/lamp-on.png', w: 181, h: 192, size: 52 }
  const start = { x: 100, y: 300 }
  const end = { x: 900, y: 300 }

  it('REPLACES the green start dot rather than joining it', () => {
    const html = renderToString(<TraceCanvas startMarker={start} startArt={OCTOPUS} />)
    expect(html).toContain(`href="${OCTOPUS.href}"`)
    // With a character standing on the spot, a dot underneath it is a second
    // thing saying the same thing.
    expect(html).not.toContain('#22c55e')
  })

  it('REPLACES the two goal diamonds rather than joining them', () => {
    const html = renderToString(<TraceCanvas endMarker={end} endArt={LAMP_OFF} />)
    expect(html).toContain(`href="${LAMP_OFF.href}"`)
    expect(html).not.toContain('#b45309')
    expect(html).not.toContain('<polygon')
  })

  it('stands the art on its FEET at the point, not centred on it', () => {
    // The convention every character in this world follows: a figure standing
    // at the start of the route, not one bisected by it. `y` therefore runs
    // from `point.y - size` to `point.y`.
    const html = renderToString(<TraceCanvas startMarker={start} startArt={OCTOPUS} />)
    const image = html.slice(html.indexOf('<image'), html.indexOf('>', html.indexOf('<image')))
    const attr = (name: string): number =>
      Number(image.match(new RegExp(`${name}="([-\\d.]+)"`))?.[1])
    expect(attr('height')).toBe(60)
    expect(attr('y')).toBe(start.y - 60) // the TOP of the art: its feet are at y
    // Width follows the source aspect ratio, so the picture is never squashed.
    const width = (60 * OCTOPUS.w) / OCTOPUS.h
    expect(attr('width')).toBeCloseTo(width, 6)
    // ...and it is horizontally CENTRED on the point.
    expect(attr('x')).toBeCloseTo(start.x - width / 2, 6)
  })

  it('swaps which lamp stands there without moving it — the caller resolves on/off, the canvas resolves nothing', () => {
    const off = renderToString(<TraceCanvas endMarker={end} endArt={LAMP_OFF} />)
    const on = renderToString(<TraceCanvas endMarker={end} endArt={LAMP_ON} />)
    expect(off).toContain('/art/lamp-off.png')
    expect(off).not.toContain('/art/lamp-on.png')
    expect(on).toContain('/art/lamp-on.png')
    expect(on).not.toContain('/art/lamp-off.png')
    // Both stand with their feet on the same y; only the WIDTH differs,
    // because the lit lamp's art carries its rays.
    for (const html of [off, on]) expect(html).toContain('y="248"') // 300 - 52
  })

  it('a route starting against the LEFT edge does not cut the character in half', () => {
    // The shipped defect: `?nivel=duck-trail4` (and, predating it, `trail4`)
    // begins hard against the left edge, so the feet-placed octopus hung off
    // the sheet and rendered as half an octopus.
    const html = renderToString(
      <TraceCanvas startMarker={{ x: 12, y: 300 }} startArt={OCTOPUS} />,
    )
    const image = html.slice(html.indexOf('<image'), html.indexOf('>', html.indexOf('<image')))
    const attr = (name: string): number =>
      Number(image.match(new RegExp(`${name}="([-\\d.]+)"`))?.[1])
    expect(attr('x')).toBe(0)
    expect(attr('x') + attr('width')).toBeLessThanOrEqual(1000)
    // Full size and still standing on the route's own y: only x moved, and
    // only by the 40 units it was overflowing.
    expect(attr('height')).toBe(60)
    expect(attr('y')).toBe(240)
  })

  it('the lamp at the RIGHT edge is pulled back in, and by the minimum', () => {
    const html = renderToString(
      <TraceCanvas endMarker={{ x: 995, y: 300 }} endArt={LAMP_ON} />,
    )
    const image = html.slice(html.indexOf('<image'), html.indexOf('>', html.indexOf('<image')))
    const attr = (name: string): number =>
      Number(image.match(new RegExp(`${name}="([-\\d.]+)"`))?.[1])
    const width = (LAMP_ON.size * LAMP_ON.w) / LAMP_ON.h
    expect(attr('x') + attr('width')).toBeCloseTo(1000, 6)
    expect(attr('width')).toBeCloseTo(width, 6)
    // Still nearly where the route ends: the shift is under half its width.
    expect(995 - width / 2 - attr('x')).toBeLessThan(width / 2)
  })

  it('clamps into the VISIBLE band, not the full 600-unit sheet', () => {
    // A cropped level shows less paper (`viewBoxY`/`viewBoxHeight`), and the
    // character has to fit inside what is actually shown.
    const html = renderToString(
      <TraceCanvas
        viewBoxY={200}
        viewBoxHeight={200}
        startMarker={{ x: 500, y: 240 }}
        startArt={OCTOPUS}
      />,
    )
    const image = html.slice(html.indexOf('<image'), html.indexOf('>', html.indexOf('<image')))
    const y = Number(image.match(/ y="([-\d.]+)"/)?.[1])
    expect(y).toBe(200) // feet at 240 would have put the top at 180, above the band
  })

  it('keeps the shipped dot and diamonds for every caller that passes no art', () => {
    const html = renderToString(<TraceCanvas startMarker={start} endMarker={end} />)
    expect(html).toContain('#22c55e')
    expect(html).toContain('#b45309')
    expect(html).toContain('<polygon')
  })

  it('has no effect without its marker — the art marks a point, it does not invent one', () => {
    const html = renderToString(<TraceCanvas startArt={OCTOPUS} endArt={LAMP_OFF} />)
    expect(html).not.toContain(OCTOPUS.href)
    expect(html).not.toContain(LAMP_OFF.href)
  })

  it('emits no url(#) reference and no text node', () => {
    const html = renderToString(
      <TraceCanvas startMarker={start} startArt={OCTOPUS} endMarker={end} endArt={LAMP_ON} />,
    )
    expect(html).not.toContain('url(#')
    expect(html).not.toContain('<title')
    expect(html).not.toContain('<text')
  })
})

describe('TraceCanvas inkColor / inkDimColor (the child\'s line is MUD on a trail)', () => {
  const strokes = [
    [
      { x: 100, y: 300 },
      { x: 200, y: 320 },
    ],
  ]

  it('defaults to INK_COLOR everywhere, so every existing caller is untouched', () => {
    const html = renderToString(<TraceCanvas completedStrokes={strokes} />)
    expect(html).toContain('#1e293b')
    expect(html).not.toContain('#8a6a4a')
  })

  it('repaints the settled ink AND the live ink path, in one prop', () => {
    const html = renderToString(<TraceCanvas completedStrokes={strokes} inkColor="#8a6a4a" />)
    // Two separate elements: the settled stroke above and the live `<path>`
    // the rAF loop writes into. Both must be mud, or the line changes colour
    // the instant the child lifts their finger.
    expect((html.match(/#8a6a4a/g) ?? []).length).toBe(2)
    expect(html).not.toContain('#1e293b')
  })

  it('leaves the CARRIER in ink while the trace becomes mud — the world is ink, only the line the child leaves is not', () => {
    // The reason this is a prop and not a change to INK_COLOR itself.
    const html = renderToString(
      <TraceCanvas completedStrokes={strokes} inkColor="#8a6a4a" inkOnly startMarker={{ x: 10, y: 10 }} />,
    )
    expect(html).toContain('#8a6a4a') // the trace
    expect(html).toContain('#1e293b') // the silhouetted marker, still ink
  })

  it('dims the LIVE ink to inkDimColor off-path, never to an error colour', () => {
    const html = renderToString(<TraceCanvas offPath inkColor="#8a6a4a" inkDimColor="#b3a08c" />)
    expect(html).toContain('#b3a08c')
    expect(html).not.toContain('#8a6a4a') // the live path is the only ink here
    // docs/01 principle 2: the light goes down, the stroke is never marked
    // wrong. Nothing red, ever.
    expect(html).not.toMatch(/#(e|f|d)[0-9a-f]{2}[0-3][0-9a-f]{3}/i)
  })

  it('falls back to the shipped cool grey dim when only inkColor is given', () => {
    const html = renderToString(<TraceCanvas offPath inkColor="#8a6a4a" />)
    expect(html).toContain('#94a3b8')
  })
})

describe('TraceCanvas artCorridor prop (trace-canvas spec: the drawn body IS the corridor — no channel stroke underneath)', () => {
  const backdrop = { href: '/art/sector-sand-background.png', quiet: '#d6cbba', channel: '#3b332b' }
  const corridor = { paths: ['M 100 300 L 900 300'], width: 60 }
  const artCorridor = [
    { href: '/art/sector-snake-medium.png', box: { x: 200, y: 250, width: 200, height: 46 } },
  ]

  it('renders no channel stroke at all — only the corridor image, and the guide after it', () => {
    // `artCorridor` populated used to also paint `corridor` as a
    // `backdrop.channel`-coloured stroke UNDER the image, meant to be fully
    // hidden by it. Found on a screenshot instead poking a sliver out past
    // the drawn body's own outline at the wave's tightest curves (the
    // stroke follows the FITTED spine, which tracks the real drawn
    // centreline only to within a few viewBox units) — a stray dark mark
    // riding the snake, not the redundant-but-invisible layer it was meant
    // to be. An art-corridor level's own body already IS the channel
    // (`levels/artCorridor.ts`'s own header), so nothing paints one.
    const html = renderToString(
      <TraceCanvas
        backdrop={backdrop}
        corridor={corridor}
        artCorridor={artCorridor}
        guide="M 0 0 L 100 100"
      />,
    )
    const corridorImgIdx = html.indexOf('/art/sector-snake-medium.png')
    const guideIdx = html.indexOf('M 0 0 L 100 100')
    expect(html).not.toContain('#3b332b')
    expect(corridorImgIdx).toBeGreaterThan(-1)
    expect(guideIdx).toBeGreaterThan(-1)
    expect(guideIdx).toBeGreaterThan(corridorImgIdx)
  })

  it('WITHOUT artCorridor, the very same corridor/backdrop still paints its channel stroke — this is a per-level exemption, not a global regression', () => {
    const html = renderToString(<TraceCanvas backdrop={backdrop} corridor={corridor} guide="M 0 0 L 100 100" />)
    expect(html).toContain('#3b332b')
  })

  it('no artCorridor prop renders no corridor-layer image', () => {
    const html = renderToString(<TraceCanvas backdrop={backdrop} corridor={corridor} />)
    expect(html).not.toContain('/art/sector-snake-medium.png')
  })

  it('zero <mask>, <pattern>, <clipPath>, <defs>, or url(# with artCorridor populated', () => {
    const html = renderToString(<TraceCanvas backdrop={backdrop} corridor={corridor} artCorridor={artCorridor} />)
    expect(html).not.toContain('<mask')
    expect(html).not.toContain('<pattern')
    expect(html).not.toContain('<clipPath')
    expect(html).not.toContain('<defs')
    expect(html).not.toContain('url(#')
  })

  it('without artCorridor, markup is byte-identical to today for a lagoon backdrop, a ground maze, and a plain maze', () => {
    const lagoon = { href: '/art/sector-lagoon-background.png', quiet: '#b4c5d0' }
    const withoutProp = renderToString(<TraceCanvas backdrop={lagoon} corridor={{ paths: ['M 0 0'], width: 40 }} />)
    const explicitUndefined = renderToString(
      <TraceCanvas backdrop={lagoon} corridor={{ paths: ['M 0 0'], width: 40 }} artCorridor={undefined} />,
    )
    expect(withoutProp).toBe(explicitUndefined)

    const groundMaze = renderToString(
      <TraceCanvas maze corridor={{ paths: ['M 0 0'], width: 40 }} ground={{ mud: { marks: [], art: [] }, grass: { marks: [], art: [] } }} />,
    )
    const groundMazeExplicit = renderToString(
      <TraceCanvas
        maze
        corridor={{ paths: ['M 0 0'], width: 40 }}
        ground={{ mud: { marks: [], art: [] }, grass: { marks: [], art: [] } }}
        artCorridor={undefined}
      />,
    )
    expect(groundMaze).toBe(groundMazeExplicit)

    const plainMaze = renderToString(<TraceCanvas maze corridor={{ paths: ['M 0 0'], width: 40 }} />)
    const plainMazeExplicit = renderToString(
      <TraceCanvas maze corridor={{ paths: ['M 0 0'], width: 40 }} artCorridor={undefined} />,
    )
    expect(plainMaze).toBe(plainMazeExplicit)
  })
})

describe('TraceCanvas inkHidden (object-arrange spec: suppresses ink while the arrange phase is open)', () => {
  const strokes = [
    [
      { x: 100, y: 300 },
      { x: 200, y: 320 },
    ],
  ]
  const backdrop = { href: '/art/sector-sand-background.png', quiet: '#d6cbba', channel: '#3b332b' }
  const corridor = { paths: ['M 100 300 L 900 300'], width: 60 }

  it('renders no guide, demo, settled ink, or endArt while inkHidden — backdrop/channel/corridor stroke unaffected', () => {
    const html = renderToString(
      <TraceCanvas
        guide="M 0 0 L 100 100"
        demo={{ d: 'M 0 0 L 50 50', strokeWidth: 6, delay: 0, duration: 1 }}
        completedStrokes={strokes}
        endMarker={{ x: 900, y: 300 }}
        endArt={{ href: '/art/lamp-off.png', w: 181, h: 192, size: 40 }}
        backdrop={backdrop}
        corridor={corridor}
        inkHidden
      />,
    )
    expect(html).not.toContain('M 0 0 L 100 100') // guide
    expect(html).not.toContain('M 0 0 L 50 50') // demo
    expect(html).not.toContain('/art/lamp-off.png') // endArt
    // The settled stroke's own `d` string must not appear (only the empty
    // live-ink `<path>` remains, which carries no `d` in SSR either way).
    expect(html).not.toMatch(/d="M 100 300 L 200 320/)
    // The backdrop and its channel stroke are entirely unaffected.
    expect(html).toContain('/art/sector-sand-background.png')
    expect(html).toContain('#3b332b')
  })

  it('absent or false renders ink exactly as before this change', () => {
    const withoutProp = renderToString(
      <TraceCanvas
        guide="M 0 0 L 100 100"
        completedStrokes={strokes}
        endMarker={{ x: 900, y: 300 }}
        endArt={{ href: '/art/lamp-off.png', w: 181, h: 192, size: 40 }}
      />,
    )
    const explicitFalse = renderToString(
      <TraceCanvas
        guide="M 0 0 L 100 100"
        completedStrokes={strokes}
        endMarker={{ x: 900, y: 300 }}
        endArt={{ href: '/art/lamp-off.png', w: 181, h: 192, size: 40 }}
        inkHidden={false}
      />,
    )
    expect(withoutProp).toBe(explicitFalse)
    expect(withoutProp).toContain('M 0 0 L 100 100')
    expect(withoutProp).toContain('/art/lamp-off.png')
  })
})



describe('TraceCanvas inkPolicy lifecycle rendering', () => {
  const strokes = [
    [
      { x: 100, y: 300 },
      { x: 200, y: 320 },
    ],
  ]

  it('settled renders released strokes and keeps the live ink path available', () => {
    const html = renderToString(<TraceCanvas completedStrokes={strokes} inkPolicy="settled" />)
    expect(html).toMatch(/d="M100 300 L200 320/)
    expect(html).toContain('data-ink-policy="settled"')
  })

  it('live-only keeps the live path but renders no settled trace after release', () => {
    const html = renderToString(<TraceCanvas completedStrokes={strokes} inkPolicy="live-only" />)
    expect(html).not.toMatch(/d="M100 300 L200 320/)
    expect(html).toContain('data-ink-policy="live-only"')
  })

  it('none renders no visible live path and no settled trace', () => {
    const html = renderToString(<TraceCanvas completedStrokes={strokes} inkPolicy="none" />)
    expect(html).not.toMatch(/d="M100 300 L200 320/)
    expect(html).toContain('data-ink-policy="none"')
    expect(html).toContain('display:none')
  })
})
describe('TraceCanvas reveal layer (reveal-grid spec: "Reveal Layer Renders as Plain Rects Between Backdrop and Ink")', () => {
  const backdrop = { href: '/art/sector-aquarium-background.png', quiet: '#9bb6c5' }
  const reveal = {
    fill: '#64726b',
    tiles: [
      { x: 0, y: 0, w: 100, h: 100, opacity: 1 },
      { x: 100, y: 0, w: 100, h: 100, opacity: 0.5 },
    ],
    art: [{ href: '/art/sector-chest.png', w: 200, h: 180, size: 96, x: 500, y: 300 }],
  }

  it('sits between the backdrop image and the guide/ink paths in document order', () => {
    const html = renderToString(<TraceCanvas backdrop={backdrop} reveal={reveal} guide="M 0 300 L 1000 300" />)
    const backdropIdx = html.indexOf(`href="${backdrop.href}"`)
    const revealIdx = html.indexOf(`fill="${reveal.fill}"`)
    const guideIdx = html.indexOf('M 0 300 L 1000 300')
    expect(backdropIdx).toBeGreaterThanOrEqual(0)
    expect(revealIdx).toBeGreaterThan(backdropIdx)
    expect(guideIdx).toBeGreaterThan(revealIdx)
  })

  it('renders no reveal-layer rect with no reveal prop', () => {
    const html = renderToString(<TraceCanvas backdrop={backdrop} />)
    expect(html).not.toContain(`fill="${reveal.fill}"`)
  })

  it('keeps non-glass reveal layers free of fragment references', () => {
    const nonGlassReveal = { ...reveal, fill: '#7a6a58' }
    const html = renderToString(<TraceCanvas backdrop={backdrop} reveal={nonGlassReveal} />)
    expect(html).not.toContain('url(#')
    expect(html).not.toContain('<mask')
    expect(html).not.toContain('<pattern')
    expect(html).not.toContain('<clipPath')
    expect(html).not.toContain('<defs')
  })

  it('uses direct glass frost shapes without fragment references', () => {
    const html = renderToString(<TraceCanvas backdrop={backdrop} reveal={reveal} />)
    expect(html).toContain('data-fog-pane="glass"')
    expect(html).toContain('data-fog-silhouette="glass"')
    expect(html).not.toContain('filter:')
    expect(html).not.toContain('<clipPath')
    expect(html).not.toContain('<filter')
    expect(html).not.toContain('<defs')
    expect(html).not.toContain('url(#')
    expect(html).not.toContain('<mask')
    expect(html).not.toContain('<pattern')
  })

  it('a lagoon backdrop, a ground maze and a plain maze render byte-identical to before this change', () => {
    const corridor = { paths: ['M 100 300 L 900 300'], width: 110 }
    const lagoon = { href: '/art/sector-lagoon-background.png', quiet: '#b4c5d0' }
    const art = [{ href: '/art/ground-grass-1.png', w: 118, h: 81 }]
    const mudArt = [{ href: '/art/ground-mud-1.png', w: 128, h: 99 }]
    const ground = {
      grass: { marks: [{ x: 120, y: 80, art: 0, size: 44, angle: -3 }], art },
      mud: { marks: [{ x: 400, y: 302, art: 0, size: 20, angle: 200 }], art: mudArt },
    }

    const plainMaze = renderToString(<TraceCanvas corridor={corridor} maze />)
    expect(plainMaze).toContain('#e2e8f0')
    expect(plainMaze).not.toContain(reveal.fill)

    const groundMaze = renderToString(<TraceCanvas corridor={corridor} maze ground={ground} />)
    expect(groundMaze).toContain('fill="#c9d7bd"')
    expect(groundMaze).not.toContain(reveal.fill)

    const lagoonMaze = renderToString(<TraceCanvas corridor={corridor} maze backdrop={lagoon} />)
    expect(lagoonMaze).toContain(`href="${lagoon.href}"`)
    expect(lagoonMaze).not.toContain(reveal.fill)
  })
})

describe('TraceCanvas waypoint layer (free-trail-waypoints spec: "Waypoint Layer Renders as Plain Images With No Fragment Reference")', () => {
  // Read from the registry rather than a hand-copied literal (`backdropFor`
  // is already imported above for the camera-backdrop describe block), so
  // this fixture cannot drift from a forest art regeneration the way a
  // hardcoded hex did before.
  const forestBackdrop = backdropFor('bee1')!
  const backdrop = { href: forestBackdrop.art.href, quiet: forestBackdrop.quiet }
  const waypoints = {
    art: [
      { href: '/art/sector-flower-dormant.png', w: 256, h: 245, size: 64, x: 500, y: 265 },
      { href: '/art/sector-honeycomb.png', w: 181, h: 256, size: 96, x: 750, y: 385 },
    ],
    rings: [{ x: 500, y: 265, radius: 110 }, { x: 750, y: 385, radius: 96 }],
    ringStroke: '#f2efe6',
  }

  it('sits between the backdrop image and the guide/ink paths in document order', () => {
    const html = renderToString(<TraceCanvas backdrop={backdrop} waypoints={waypoints} guide="M 0 300 L 1000 300" />)
    const backdropIdx = html.indexOf(`href="${backdrop.href}"`)
    const waypointIdx = html.indexOf(`href="${waypoints.art[0].href}"`)
    const guideIdx = html.indexOf('M 0 300 L 1000 300')
    expect(backdropIdx).toBeGreaterThanOrEqual(0)
    expect(waypointIdx).toBeGreaterThan(backdropIdx)
    expect(guideIdx).toBeGreaterThan(waypointIdx)
  })

  it('renders exactly one <image> per art entry, plus one <circle> per ring', () => {
    const html = renderToString(<TraceCanvas backdrop={backdrop} waypoints={waypoints} />)
    const images = (html.match(/href="\/art\/(sector-flower-dormant|sector-honeycomb)\.png"/g) ?? []).length
    expect(images).toBe(2)
    expect((html.match(/<circle/g) ?? []).length).toBe(2)
    expect(html).toContain(`stroke="${waypoints.ringStroke}"`)
  })

  it('renders no waypoint-layer image or ring with no waypoints prop', () => {
    const html = renderToString(<TraceCanvas backdrop={backdrop} />)
    expect(html).not.toContain(waypoints.art[0].href)
    expect(html).not.toContain(waypoints.art[1].href)
  })

  it('renders no rings when waypoints.rings is absent (the ordinary, non-debug frame)', () => {
    const html = renderToString(<TraceCanvas backdrop={backdrop} waypoints={{ art: waypoints.art }} />)
    expect(html).not.toContain('<circle')
  })

  it('introduces no forbidden fragment reference', () => {
    const html = renderToString(<TraceCanvas backdrop={backdrop} waypoints={waypoints} />)
    expect(html).not.toContain('url(#')
    expect(html).not.toContain('<mask')
    expect(html).not.toContain('<pattern')
    expect(html).not.toContain('<clipPath')
    expect(html).not.toContain('<defs')
  })

  it('a lagoon backdrop, a ground maze and a plain maze render byte-identical to today (no waypoints prop passed)', () => {
    const corridor = { paths: ['M 100 300 L 900 300'], width: 110 }
    const lagoon = { href: '/art/sector-lagoon-background.png', quiet: '#b4c5d0' }
    const groundArt = [{ href: '/art/ground-grass-1.png', w: 118, h: 81 }]
    const mudArt = [{ href: '/art/ground-mud-1.png', w: 128, h: 99 }]
    const ground = {
      grass: { marks: [{ x: 120, y: 80, art: 0, size: 44, angle: -3 }], art: groundArt },
      mud: { marks: [{ x: 400, y: 302, art: 0, size: 20, angle: 200 }], art: mudArt },
    }

    const plainMaze = renderToString(<TraceCanvas corridor={corridor} maze />)
    expect(plainMaze).not.toContain(waypoints.art[0].href)

    const groundMaze = renderToString(<TraceCanvas corridor={corridor} maze ground={ground} />)
    expect(groundMaze).not.toContain(waypoints.art[0].href)

    const lagoonMaze = renderToString(<TraceCanvas corridor={corridor} maze backdrop={lagoon} />)
    expect(lagoonMaze).toContain(`href="${lagoon.href}"`)
    expect(lagoonMaze).not.toContain(waypoints.art[0].href)
  })
})

describe('TraceCanvas spine layer (radial-spines spec: "Spine Layer Renders as Plain Images and Marks...")', () => {
  const backdrop = { href: '/art/sector-night-background.png', quiet: '#394459' }
  const spines = {
    body: { href: '/art/hedgehog-profile.png', x: 100, y: 100, width: 300, height: 200 },
    marks: [
      { x: 300, y: 200, filled: false },
      { x: 350, y: 250, filled: true },
    ],
    markRadius: 11,
    dim: '#989896',
    earned: '#f2efe6',
    rings: [{ x: 300, y: 200, radius: 38 }, { x: 350, y: 250, radius: 38 }],
    ringStroke: '#f2efe6',
  }

  it('sits between the backdrop image and the guide/ink paths in document order', () => {
    const html = renderToString(<TraceCanvas backdrop={backdrop} spines={spines} guide="M 0 300 L 1000 300" />)
    const backdropIdx = html.indexOf(`href="${backdrop.href}"`)
    const spineIdx = html.indexOf(`href="${spines.body.href}"`)
    const guideIdx = html.indexOf('M 0 300 L 1000 300')
    expect(backdropIdx).toBeGreaterThanOrEqual(0)
    expect(spineIdx).toBeGreaterThan(backdropIdx)
    expect(guideIdx).toBeGreaterThan(spineIdx)
  })

  it('renders exactly one body <image>, plus one <circle> per mark and one per ring', () => {
    const html = renderToString(<TraceCanvas backdrop={backdrop} spines={spines} />)
    const bodyImages = (html.match(new RegExp(`href="${spines.body.href.replace('/', '\\/')}"`, 'g')) ?? []).length
    expect(bodyImages).toBe(1)
    expect((html.match(/<circle/g) ?? []).length).toBe(spines.marks.length + spines.rings.length)
    expect(html).toContain(`fill="${spines.dim}"`)
    expect(html).toContain(`fill="${spines.earned}"`)
    expect(html).toContain(`stroke="${spines.ringStroke}"`)
  })

  it('renders no spine-layer element with no spines prop', () => {
    const html = renderToString(<TraceCanvas backdrop={backdrop} />)
    expect(html).not.toContain(spines.body.href)
  })

  it('renders no rings when spines.rings is absent (the ordinary, non-debug frame)', () => {
    const withoutRings = { body: spines.body, marks: spines.marks, markRadius: spines.markRadius, dim: spines.dim, earned: spines.earned }
    const html = renderToString(<TraceCanvas backdrop={backdrop} spines={withoutRings} />)
    // Only the marks' own circles — none carry a `stroke` attribute.
    expect((html.match(/<circle[^>]*stroke=/g) ?? []).length).toBe(0)
  })

  it('introduces no forbidden fragment reference', () => {
    const html = renderToString(<TraceCanvas backdrop={backdrop} spines={spines} />)
    expect(html).not.toContain('url(#')
    expect(html).not.toContain('<mask')
    expect(html).not.toContain('<pattern')
    expect(html).not.toContain('<clipPath')
    expect(html).not.toContain('<defs')
  })

  it('a plain maze and a lagoon backdrop render byte-identical to today (no spines prop passed)', () => {
    const corridor = { paths: ['M 100 300 L 900 300'], width: 110 }
    const lagoon = { href: '/art/sector-lagoon-background.png', quiet: '#b4c5d0' }

    const plainMaze = renderToString(<TraceCanvas corridor={corridor} maze />)
    expect(plainMaze).not.toContain(spines.body.href)

    const lagoonMaze = renderToString(<TraceCanvas corridor={corridor} maze backdrop={lagoon} />)
    expect(lagoonMaze).toContain(`href="${lagoon.href}"`)
    expect(lagoonMaze).not.toContain(spines.body.href)
  })
})

describe('TraceCanvas fitContentWithInsets / fitCameraContentWithInsets (T7 rework #2, "nothing playable sits under a button")', () => {
  const box = { x: 10, y: 20, width: 200, height: 100 } // aspect 2

  it('zero insets reduces to fitting the box into the whole container, centred (the T7-rework-#1 behaviour)', () => {
    // Container 200x200 (aspect 1, narrower than the box's own 2): height
    // must grow to 200 (width / 1), i.e. by 100, split evenly above/below.
    const grown = fitContentWithInsets(box, 200, 200)
    expect(grown).toEqual({ x: 10, y: -30, width: 200, height: 200 }) // 20 - (200-100)/2
    // Centre preserved: (x + width/2, y + height/2) unchanged.
    expect(grown.x + grown.width / 2).toBe(box.x + box.width / 2)
    expect(grown.y + grown.height / 2).toBe(box.y + box.height / 2)
  })

  it('zero insets, container narrower than the box: grows WIDTH instead, still centred', () => {
    // Container 100x100 (aspect 1 again, but box width alone already
    // exceeds container width — width is the binding/short axis here).
    const grown = fitContentWithInsets(box, 400, 100)
    expect(grown).toEqual({ x: -90, y: 20, width: 400, height: 100 }) // 10 - (400-200)/2
    expect(grown.x + grown.width / 2).toBe(box.x + box.width / 2)
    expect(grown.y + grown.height / 2).toBe(box.y + box.height / 2)
  })

  it('non-zero insets shift the content OFF the container centre, into the centre of the SAFE rectangle instead', () => {
    // Container 200x200, top inset 20 (a header row): the safe rectangle is
    // now 200x180. k = min(200/200, 180/100) = 1 (width-bound, same as the
    // zero-insets case). The returned box still fills the FULL container
    // (200x200 in content units, since k=1), but its y shifts so the
    // content lands centred in the shrunk 180-tall safe band instead.
    const grown = fitContentWithInsets(box, 200, 200, { top: 20, bottom: 0, left: 0, right: 0 })
    expect(grown.width).toBe(200)
    expect(grown.height).toBe(200)
    expect(grown.x).toBe(10) // no horizontal inset: x unchanged from the zero-insets case
    expect(grown.y).toBe(-40) // 20 - 20 - (180-100)/2, ten units lower than the -30 zero-insets case
    // The safe band itself (grown.y+insetTop .. grown.y+height-insetBottom)
    // is centred on the content box's own centre.
    const safeTop = grown.y + 20
    const safeBottom = grown.y + grown.height - 0
    expect((safeTop + safeBottom) / 2).toBe(box.y + box.height / 2)
  })

  it('left/right insets shift the content horizontally the same way', () => {
    const grown = fitContentWithInsets(box, 400, 100, { top: 0, bottom: 0, left: 40, right: 0 })
    expect(grown.width).toBe(400)
    expect(grown.height).toBe(100)
    expect(grown.y).toBe(20)
    const safeLeft = grown.x + 40
    const safeRight = grown.x + grown.width - 0
    expect((safeLeft + safeRight) / 2).toBe(box.x + box.width / 2)
  })

  it('is a no-op guard against non-finite/non-positive/degenerate input, never leaking NaN/Infinity into a viewBox', () => {
    expect(fitContentWithInsets(box, 0, 200)).toEqual(box)
    expect(fitContentWithInsets(box, 200, -1)).toEqual(box)
    expect(fitContentWithInsets(box, NaN, 200)).toEqual(box)
    expect(fitContentWithInsets({ ...box, width: 0 }, 200, 200)).toEqual({ ...box, width: 0 })
    // Insets that consume the whole container leave no safe rectangle to fit into.
    expect(fitContentWithInsets(box, 200, 200, { top: 250, bottom: 0, left: 0, right: 0 })).toEqual(box)
  })

  it('fitCameraContentWithInsets matches fitContentWithInsets exactly when insets are zero and height is the short axis', () => {
    expect(fitCameraContentWithInsets(box, 200, 200)).toEqual(fitContentWithInsets(box, 200, 200))
  })

  it('fitCameraContentWithInsets NEVER grows or shifts width — a container narrower than the box is accepted as-is', () => {
    // scrolling-camera's own reason (this function's own header): the
    // moving window's x/width belong to the rAF loop alone. left/right
    // insets are not even part of its own type signature.
    const grown = fitCameraContentWithInsets(box, 50, 200) // container width 50 < box.width 200
    expect(grown.width).toBe(box.width)
    expect(grown.x).toBe(box.x)
  })

  it('fitCameraContentWithInsets shifts the content vertically for a top/bottom inset, width/x still untouched', () => {
    const grown = fitCameraContentWithInsets(box, 200, 200, { top: 20, bottom: 0 })
    expect(grown.width).toBe(box.width)
    expect(grown.x).toBe(box.x)
    expect(grown.height).toBe(200) // container height / k, k = 200/200 = 1
    expect(grown.y).toBe(-40) // same shifted centring as the generic function's own inset test above
  })

  it('fitCameraContentWithInsets is the same guard against non-finite/non-positive input', () => {
    expect(fitCameraContentWithInsets(box, 0, 200)).toEqual(box)
    expect(fitCameraContentWithInsets(box, 200, NaN)).toEqual(box)
    expect(fitCameraContentWithInsets({ ...box, width: 0 }, 200, 200)).toEqual({ ...box, width: 0 })
  })

  // The container's real CSS-pixel size is measured via ResizeObserver
  // (real-browser-only, same split this file's own rAF-driven ink loop
  // already lives by) — absent in `renderToString`'s node environment, so
  // `containerSize` stays `null` and the SVG's own `viewBox`/backdrop
  // sizing stay BYTE-IDENTICAL to before this rework, whether or not a
  // backdrop and `fit="contain"` are both passed. The approved-and-
  // expanded render is real-browser-only proof, left to the orchestrator's
  // visual QA (`capturas/`, git-ignored).
  it('SSR safety: contain fit + a backdrop render the exact pre-rework viewBox (no ResizeObserver in node)', () => {
    const lagoon = { href: '/art/sector-lagoon-background.png', quiet: '#b4c5d0' }
    const html = renderToString(
      <TraceCanvas viewBoxWidth={1000} viewBoxY={100} viewBoxHeight={300} fit="contain" backdrop={lagoon} />,
    )
    expect(html).toContain('viewBox="0 100 1000 300"')
    expect(html).toContain(`x="0" y="100" width="1000" height="300" fill="${lagoon.quiet}"`)
  })
})

describe('T14 (prewriting-stage-completion, Batch 2.6): backdrop framing is a minimum-zoom cover, independent of content', () => {
  // The user's own report, on a tablet: "the image fills the screen now, but
  // it's VERY cropped: I only see the centre... and not the details around
  // it." The backdrop sector art is authored full-bleed landscape 3:2
  // (1536x1024, `BACKDROP_IMAGE_ASPECT`) with its interesting detail along
  // the top/bottom edges (`docs/09_GUIA_DE_ESTILO_VISUAL.md` §9's background
  // variant). The suspected cause was that the backdrop's own box was tied
  // to the level's CONTENT box (small relative to the art), so the art got
  // enlarged and its outer parts fell off-screen.

  it('coverAspectRatio: the box fitContentWithInsets returns ALWAYS has exactly the container aspect ratio, for many box/inset combinations — the algebraic proof that the backdrop box does not depend on content size', () => {
    const containers: Array<[number, number]> = [
      [1024, 768],
      [1180, 820],
      [768, 1024],
      [844, 390],
      [500, 500],
    ]
    const boxes = [
      { x: 0, y: 0, width: 1000, height: 600 }, // the shipped default sheet
      { x: 0, y: 0, width: 100, height: 60 }, // a MUCH smaller content box
      { x: 0, y: 0, width: 3000, height: 600 }, // a much WIDER one (long corridor)
      { x: 0, y: 0, width: 1000, height: 40 }, // a very short one
    ]
    const insetSets: SafeInsets[] = [
      { top: 0, bottom: 0, left: 0, right: 0 },
      { top: 64, bottom: 64, left: 16, right: 16 },
      { top: 120, bottom: 20, left: 16, right: 16 }, // asymmetric chrome
    ]
    for (const [cw, ch] of containers) {
      const expected = coverAspectRatio(cw, ch)
      for (const box of boxes) {
        for (const insets of insetSets) {
          const db = fitContentWithInsets(box, cw, ch, insets)
          expect(db.width / db.height).toBeCloseTo(expected, 9)
        }
      }
    }
  })

  it('coverVisibleFraction: symmetric, 1 at matching aspect, and matches the hand-worked 4:3 example from the task (~11% of the width cropped in total)', () => {
    expect(coverVisibleFraction(1.5, 1.5)).toBe(1)
    expect(coverVisibleFraction(4 / 3, 1.5)).toBeCloseTo(coverVisibleFraction(1.5, 4 / 3), 12)
    // 4:3 landscape against 3:2 art: (4/3) / (3/2) = 8/9 ≈ 0.889 visible,
    // i.e. ~11.1% cropped — the exact number the task's own diagnosis names.
    expect(coverVisibleFraction(4 / 3, BACKDROP_IMAGE_ASPECT)).toBeCloseTo(8 / 9, 9)
  })

  it('coverVisibleFraction: degenerate input never returns NaN/negative', () => {
    expect(coverVisibleFraction(0, 1.5)).toBe(0)
    expect(coverVisibleFraction(1.5, 0)).toBe(0)
    expect(coverVisibleFraction(-1, 1.5)).toBe(0)
  })

  it('the required viewports clear the acceptance floor: >= 85% visible at 4:3-ish landscape, and exactly the geometric maximum at portrait — same fraction for EVERY level, because it never depends on content', () => {
    // Portrait's own geometric maximum: a 768x1024 box (aspect 0.75) is
    // narrower than the 1.5-aspect art, so no cover fit — whatever the
    // content — can show more than boxAspect/imageAspect of it. That IS
    // `coverVisibleFraction`'s own answer, so this asserts the required
    // viewport reaches it exactly, not merely "close".
    const cases: Array<{ w: number; h: number; floor: number; exact?: boolean }> = [
      { w: 1024, h: 768, floor: 0.85 },
      { w: 1180, h: 820, floor: 0.85 },
      { w: 768, h: 1024, floor: 0, exact: true },
    ]
    for (const { w, h, floor, exact } of cases) {
      const boxAr = coverAspectRatio(w, h)
      const frac = coverVisibleFraction(boxAr, BACKDROP_IMAGE_ASPECT)
      expect(frac).toBeGreaterThanOrEqual(floor)
      if (exact) {
        expect(frac).toBeCloseTo(coverVisibleFraction(w / h, BACKDROP_IMAGE_ASPECT), 12)
      }
    }
  })

  it('regression: buildLevelTarget + drawingBand for every T14-named level agree with coverVisibleFraction at all three required viewports (the diagnostic this task asked for, pinned)', () => {
    const ids = ['glass1', 'sand1', 'duck-trail1', 'sheep-hill1', 'night2', 'snake1', 'bee1', 'turtle1', 'monkey1']
    const viewports: Array<[number, number]> = [
      [1024, 768],
      [1180, 820],
      [768, 1024],
    ]
    const insets: SafeInsets = { top: 64, bottom: 64, left: 16, right: 16 }
    for (const id of ids) {
      const level = getLevel(id)
      const target = buildLevelTarget(level)
      const band = drawingBand(target.ideal, target.corridorWidth, level.surface)
      const windowBounds = { x: 0, y: band.y, width: target.viewBoxWidth, height: band.height }
      for (const [w, h] of viewports) {
        const db = fitContentWithInsets(windowBounds, w, h, insets)
        const frac = coverVisibleFraction(db.width / db.height, BACKDROP_IMAGE_ASPECT)
        const expectedFrac = coverVisibleFraction(coverAspectRatio(w, h), BACKDROP_IMAGE_ASPECT)
        expect(frac, `${id} @ ${w}x${h}`).toBeCloseTo(expectedFrac, 9)
        expect(frac, `${id} @ ${w}x${h}`).toBeGreaterThanOrEqual(w === 768 ? 0.5 : 0.85)
      }
    }
  })
})
