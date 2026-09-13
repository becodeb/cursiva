// TraceCanvas SSR tests (trace-canvas "Multi-Step Demo Rendering"): the demo
// prop accepts a single DrawDemo or an array; every entry renders as its own
// animated motion.path with its own d/delay/duration — and the single-object
// form preserves the previous one-path behavior. Timeline completion itself is
// mode-side (readyMs in guidedTrace), not asserted here.
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import TraceCanvas, { DEMO_STROKE, type DrawDemo } from './TraceCanvas'
import { placeArt } from './placeArt'
import { getLevel } from '../levels/catalog'
import { buildLevelTarget } from '../levels/buildLevel'
import { obstacleAt } from '../levels/obstacles'
import { luma } from '../detective/palette'
import { CHANNEL_STONE } from '../zoo/backdrops'

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

  it('introduces no forbidden fragment reference', () => {
    const html = renderToString(<TraceCanvas backdrop={backdrop} reveal={reveal} />)
    expect(html).not.toContain('url(#')
    expect(html).not.toContain('<mask')
    expect(html).not.toContain('<pattern')
    expect(html).not.toContain('<clipPath')
    expect(html).not.toContain('<defs')
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
