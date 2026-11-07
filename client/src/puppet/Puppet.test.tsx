import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { createActor, type ActName } from './actor'
import { getRig, PUPPET_NAMES, puppetView } from './characters'
import { browPath, mouthPath } from './characters/face'
import Puppet from './Puppet'
import { computeFrame, figureView, frameBounds, PAPER_SHADOW_FILL, type PaperNode } from './rig'
import type { Pose } from './actor'

const poseWith = (acts: Partial<Record<ActName, number>>): Pose => ({
  t: 0.7,
  a: { wave: 0, cheer: 0, scare: 0, sad: 0, sleep: 0, ...acts },
  look: [0, 0],
  breath: 0,
  smile: 1 + (acts.cheer ?? 0) * 0.25 - (acts.sad ?? 0) * 1.9 - (acts.scare ?? 0) * 0.9,
  open: 0,
  brow: (acts.sad ?? 0) + (acts.scare ?? 0) * 0.7,
  hop: 0,
  state: {},
})

/** The numbers out of an `M a b Q c d e f` brow. */
function browPoints(d: string): { outerY: number; controlY: number; innerY: number } {
  const n = d.match(/-?[\d.]+/g)!.map(Number)
  return { outerY: n[1], controlY: n[3], innerY: n[5] }
}

describe('the brows the user approved', () => {
  const brow = browPath(144, 98, 180, 94)

  it('arch at rest, with the inner end higher than the outer one', () => {
    const { outerY, controlY, innerY } = browPoints(brow(poseWith({})))
    expect(outerY).toBe(98)
    expect(innerY).toBe(94)
    expect(controlY).toBeLessThan(innerY)
  })

  it('never lower the inner end, whatever the mood (that reads as angry)', () => {
    for (const act of ['sad', 'scare', 'cheer', 'sleep', 'wave'] as const) {
      for (const amount of [0, 0.25, 0.5, 1]) {
        const { outerY, innerY } = browPoints(brow(poseWith({ [act]: amount })))
        expect(innerY, `${act} ${amount}`).toBeLessThanOrEqual(94)
        expect(innerY, `${act} ${amount}`).toBeLessThan(outerY)
      }
    }
  })

  it('go straight on scare: the control point sits on the chord', () => {
    const { outerY, controlY, innerY } = browPoints(brow(poseWith({ scare: 1 })))
    expect(controlY).toBeCloseTo((outerY + innerY) / 2, 0)
  })
})

describe('the mouth', () => {
  const mouth = mouthPath(200, 162, 15)
  const ys = (d: string): number[] => {
    const n = d.match(/-?[\d.]+/g)!.map(Number)
    return n.filter((_, i) => i % 2 === 1)
  }

  it('smiles at rest: the middle hangs below the corners', () => {
    expect(Math.max(...ys(mouth(poseWith({}))))).toBeGreaterThan(162 + 3)
  })

  it('turns into a shaky line on scare: it crosses its own rest height both ways', () => {
    const values = ys(mouth(poseWith({ scare: 1 })))
    expect(Math.max(...values)).toBeGreaterThan(163)
    expect(Math.min(...values)).toBeLessThan(161)
  })
})

function allNodes(nodes: readonly PaperNode[]): PaperNode[] {
  return nodes.flatMap((n) => (n.kind === 'group' ? [n, ...allNodes(n.children)] : [n]))
}

describe.each(PUPPET_NAMES)('the %s rig', (name) => {
  it('is cut paper: every lifted piece has a shadow, and nothing has an outline', () => {
    const paths = allNodes(getRig(name).nodes).filter((n) => n.kind === 'path')
    const shadows = paths.filter((n) => n.shadow)
    expect(shadows.length).toBeGreaterThan(0)
    for (const shadow of shadows) expect(shadow.style.fill).toBe(PAPER_SHADOW_FILL)
    const outlined = paths.filter((n) => 'stroke' in n.style && n.style.fill !== 'none' && n.style.fill !== n.style.stroke)
    expect(outlined).toEqual([])
  })

  it('renders a complete still pose in node, with no banned reference', () => {
    const html = renderToString(<Puppet name={name} still />)
    expect(html).toContain('<svg')
    expect(html).toMatch(/<path d="M/)
    expect(html).not.toMatch(/url\(|<mask|<clipPath|<pattern|<filter|Gradient/)
    // An outline with no `d` would be an empty piece.
    expect(html).not.toMatch(/<path(?![^>]*\bd=)[^>]*>/)
  })

  it('renders the same markup every time', () => {
    expect(renderToString(<Puppet name={name} still />)).toBe(renderToString(<Puppet name={name} still />))
  })

  it('embeds as a <g> inside a parent svg, filling the box it was given', () => {
    const html = renderToString(
      <svg>
        <Puppet name={name} box={{ x: 10, y: 20, width: 90, height: 120 }} still />
      </svg>,
    )
    expect(html.match(/<svg/g)).toHaveLength(1)
    const view = puppetView(name, 90 / 120)
    expect(view.w / view.h).toBeCloseTo(90 / 120, 6)
    const k = 90 / view.w
    const [tx, ty, scale] = html.match(/translate\((-?[\d.]+) (-?[\d.]+)\)scale\(([\d.]+)\)/)!.slice(1).map(Number)
    expect(scale).toBeCloseTo(k, 3)
    // The view's top-left corner lands on the box's top-left corner.
    expect(view.x * scale + tx).toBeCloseTo(10, 1)
    expect(view.y * scale + ty).toBeCloseTo(20, 1)
  })

  it('stands its feet on the bottom edge of any box', () => {
    const rig = getRig(name)
    const bounds = frameBounds(rig, computeFrame(rig, createActor(7), true))
    for (const aspect of [0.5, 0.83, 1, 1.6]) {
      const view = figureView(bounds, null, aspect)
      expect(view.y + view.h).toBeCloseTo(bounds.maxY, 6)
      expect(view.w / view.h).toBeCloseTo(aspect, 6)
      expect(view.x).toBeLessThanOrEqual(bounds.minX + 1e-6)
      expect(view.x + view.w).toBeGreaterThanOrEqual(bounds.maxX - 1e-6)
      expect(view.y).toBeLessThanOrEqual(bounds.minY + 1e-6)
    }
  })
})

describe('the still pose', () => {
  it('fills the prototype box: the duck reaches its toes, the Pulpito his cap', () => {
    // From the authored drawing: the duck's toes reach y 400 and the Pulpito's
    // cap sits on y 13 minus its button's 6.
    const duck = frameBounds(getRig('pato'), computeFrame(getRig('pato'), createActor(7), true))
    expect(duck.maxY).toBeGreaterThan(395)
    expect(duck.maxY).toBeLessThan(412)
    const pulpo = frameBounds(getRig('pulpo'), computeFrame(getRig('pulpo'), createActor(7), true))
    expect(pulpo.minY).toBeLessThan(10)
    expect(pulpo.minY).toBeGreaterThan(-5)
  })
})

describe('accessories and colours', () => {
  it('leaves out what is switched off and draws what is on', () => {
    const bare = renderToString(<Puppet name="pulpo" still accessories={{ cap: false, apron: false }} />)
    expect(bare).not.toContain('data-part="cap"')
    expect(bare).not.toContain('data-part="apron"')
    expect(bare).not.toContain('data-part="lens"')
    expect(bare).not.toContain('data-part="bow"')
    const dressed = renderToString(<Puppet name="pulpo" still accessories={{ lens: true, bow: true }} />)
    for (const part of ['cap', 'apron', 'lens', 'bow']) expect(dressed).toContain(`data-part="${part}"`)
  })

  it('paints through CSS variables, and a caller can override one', () => {
    const html = renderToString(<Puppet name="pulpo" still colors={{ body: '#123456' }} />)
    expect(html).toContain('fill:var(--body)')
    expect(html).toContain('--body:#123456')
    expect(html).toContain('--shade:#d04a17')
  })

  it('shows a held act in the still render', () => {
    const rest = renderToString(<Puppet name="pato" still />)
    expect(renderToString(<Puppet name="pato" still holding="sad" />)).not.toBe(rest)
  })

  it('one costume change does not move him: lens or no lens, one window', () => {
    const on = renderToString(<Puppet name="pulpo" still accessories={{ lens: true }} aspect={0.85} />)
    const off = renderToString(<Puppet name="pulpo" still aspect={0.85} />)
    const viewBox = (html: string) => html.match(/viewBox="([^"]+)"/)![1]
    expect(viewBox(on)).toBe(viewBox(off))
  })
})

describe('a silhouette', () => {
  it('is one colour with no face and no shadow, in the same window', () => {
    const windowOf = (html: string): string | undefined => /viewBox="([^"]+)"/.exec(html)?.[1]
    const html = renderToString(<Puppet name="pato" still silhouette="#123456" />)
    const body = html.replace(/--[a-zA-Z0-9]+:[^;"]+;?/g, '')
    expect(body).not.toContain('#ffffff')
    expect(body).not.toContain(PAPER_SHADOW_FILL)
    expect(body).toContain('#123456')
    expect(windowOf(html)).toBe(windowOf(renderToString(<Puppet name="pato" still />)))
  })
})

describe('the Pulpito in costume', () => {
  const ITEMS = ['hat', 'sailor', 'straw', 'crown', 'flower', 'scarf', 'shells', 'backpack', 'cape', 'bow'] as const

  it('wears nothing extra unless asked, and each item shows when it is', () => {
    const plain = renderToString(<Puppet name="pulpo" still />)
    for (const item of ITEMS) {
      expect(plain, item).not.toContain(`data-part="${item}"`)
      const worn = renderToString(<Puppet name="pulpo" still accessories={{ [item]: true }} />)
      expect(worn, item).toContain(`data-part="${item}"`)
    }
  })

  it('stands in the same window whatever he wears: no costume moves or resizes him', () => {
    const windowOf = (html: string): string | undefined => /viewBox="([^"]+)"/.exec(html)?.[1]
    const plain = windowOf(renderToString(<Puppet name="pulpo" still />))
    for (const item of ITEMS) {
      expect(windowOf(renderToString(<Puppet name="pulpo" still accessories={{ [item]: true }} />)), item).toBe(plain)
    }
  })

  it('fits every costume inside the box he had without them', () => {
    const costume = new Set<string>(ITEMS.filter((i) => i !== 'bow'))
    const without = (nodes: readonly PaperNode[]): PaperNode[] =>
      nodes.flatMap((n): PaperNode[] => (n.kind !== 'group' ? [n] : costume.has(n.part) ? [] : [{ ...n, children: without(n.children) }]))
    const rig = getRig('pulpo')
    const frame = computeFrame(rig, createActor(7), true)
    const whole = frameBounds(rig, frame)
    const bare = frameBounds({ ...rig, nodes: without(rig.nodes) }, frame)
    expect(whole).toEqual(bare)
  })

  it('takes colours as overrides, never as a second drawing', () => {
    const html = renderToString(<Puppet name="pulpo" still colors={{ body: '#2f86d4' }} />)
    expect(html).toContain('--body:#2f86d4')
  })
})
