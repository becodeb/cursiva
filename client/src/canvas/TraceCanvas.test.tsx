// TraceCanvas SSR tests (trace-canvas "Multi-Step Demo Rendering"): the demo
// prop accepts a single DrawDemo or an array; every entry renders as its own
// animated motion.path with its own d/delay/duration — and the single-object
// form preserves the previous one-path behavior. Timeline completion itself is
// mode-side (readyMs in guidedTrace), not asserted here.
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import TraceCanvas, { type DrawDemo } from './TraceCanvas'

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
  const drainedMark = {
    x: 200,
    y: 300,
    angle: 0,
    d: 'M0,-10 L10,10 L-10,10 Z',
    paint: 'fill' as const,
    color: '#c8cdd2',
    scale: 1,
  }
  const earnedMark = { ...drainedMark, color: '#3f6f8f' }
  const earnedFootprintMark = { ...drainedMark, color: '#000000' }

  it('renders nothing without the prop (trace-canvas spec, "Drained mark renders grey")', () => {
    expect(renderToString(<TraceCanvas />)).not.toContain('#c8cdd2')
  })

  it('renders a drained mark with the shared grey token (trace-canvas spec, "Drained mark renders grey")', () => {
    const html = renderToString(<TraceCanvas clues={{ marks: [drainedMark] }} />)
    expect(html).toContain('fill="#c8cdd2"')
  })

  it("renders an earned mark with its trail's colour (trace-canvas spec, \"Earned mark renders its trail colour\")", () => {
    const html = renderToString(<TraceCanvas clues={{ marks: [earnedMark] }} />)
    expect(html).toContain('fill="#3f6f8f"')
  })

  it('renders an earned footprint mark black, never chromatic (trace-canvas spec, "Earned footprint renders black, never chromatic")', () => {
    const html = renderToString(<TraceCanvas clues={{ marks: [earnedFootprintMark] }} />)
    expect(html).toContain('fill="#000000"')
  })

  it('introduces no url(#) reference with clues populated (trace-canvas spec, "No url() reference is introduced")', () => {
    const html = renderToString(<TraceCanvas clues={{ marks: [earnedMark, drainedMark] }} />)
    expect(html).not.toContain('url(#')
  })

  it('renders UNDER the live ink, not above it', () => {
    const html = renderToString(<TraceCanvas clues={{ marks: [earnedMark] }} />)
    // The only other `#1e293b` (INK_COLOR) occurrence on a bare canvas is the
    // live ink path itself, so this is a clean z-order check.
    expect(html.indexOf('#3f6f8f')).toBeLessThan(html.indexOf('#1e293b'))
  })

  it('paints a `paint: "stroke"` mark with stroke, not fill', () => {
    const strokeMark = { ...earnedMark, paint: 'stroke' as const }
    const html = renderToString(<TraceCanvas clues={{ marks: [strokeMark] }} />)
    expect(html).toContain('stroke="#3f6f8f"')
    expect(html).toContain('fill="none"')
  })

  it('positions a mark by translate/rotate/scale, with no offset arithmetic', () => {
    const html = renderToString(
      <TraceCanvas clues={{ marks: [{ ...earnedMark, x: 150, y: 250, angle: 45, scale: 0.8 }] }} />,
    )
    expect(html).toContain('translate(150 250) rotate(45) scale(0.8)')
  })
})

describe('TraceCanvas carrierArt override (design.md "carrierArt override stays")', () => {
  it('renders the shipped sage shape when the override is absent', () => {
    const html = renderToString(<TraceCanvas carrier={{ x: 140, y: 260 }} />)
    expect(html).toContain('#5f8a86')
    expect(html).toContain('<rect')
  })

  it('renders the override art in ink instead of the shipped shape when present', () => {
    const html = renderToString(
      <TraceCanvas
        carrier={{ x: 140, y: 260 }}
        carrierArt={{ d: 'M-9,0 L9,0 M9,9 L18,18', color: '#1e293b' }}
      />,
    )
    expect(html).toContain('stroke="#1e293b"')
    expect(html).not.toContain('#5f8a86')
    expect(html).not.toContain('<rect')
  })

  it('has no effect without a carrier', () => {
    const html = renderToString(<TraceCanvas carrierArt={{ d: 'M0,0 L1,1', color: '#123456' }} />)
    expect(html).not.toContain('#123456')
  })
})
