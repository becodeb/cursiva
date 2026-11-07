import { describe, expect, it } from 'vitest'
import { getCharacterView } from '../puppet/characters'
import { ADVENTURES, type AdventureFinale, type FinaleKind } from '../zoo/adventures'
import type { TracedLine } from '../zoo/tracedLine'
import { composeFinale, firstLoop, fitStrokes, finaleFrame, FINALE_STAGE, type FinaleScene } from './strokeFinale'

/** A wobbly wave, as `toTracedLine` would hand it over. */
const waveLine: TracedLine = {
  levelId: 'l',
  w: 1,
  h: 0.4,
  strokes: [
    Array.from({ length: 80 }, (_, i): [number, number] => {
      const x = i / 79
      return [x, 0.2 + Math.sin(x * 18) * 0.18 + Math.sin(i * 1.9) * 0.012]
    }),
  ],
}

const spinesLine: TracedLine = {
  levelId: 'l',
  w: 1,
  h: 0.7,
  strokes: Array.from({ length: 8 }, (_, k): [number, number][] => [
    [0.1 + k * 0.1, 0.5],
    [0.1 + k * 0.11, 0.1],
  ]),
}

const KINDS: readonly FinaleKind[] = ['water', 'leap', 'hills', 'shell', 'lianas', 'slither', 'route', 'bubbles', 'spines']

const scene = (kind: FinaleKind, extra: Partial<AdventureFinale> = {}, line: TracedLine = waveLine): FinaleScene =>
  composeFinale({ kind, ...extra }, line, 1.4)!

describe('the rows', () => {
  it('every family whose line means something has a finale, and the line-less ones do not', () => {
    const withFinale = ADVENTURES.filter((a) => a.finale).map((a) => a.id).sort()
    expect(withFinale).toEqual(['bee', 'dolphin', 'duck', 'fish', 'hedgehog', 'llama', 'monkeys', 'sheep', 'snake', 'turtles'].sort())
  })

  it('the family a brief names gets the kind it names', () => {
    const kind = (id: string) => ADVENTURES.find((a) => a.id === id)?.finale?.kind
    expect(kind('duck')).toBe('water')
    expect(kind('dolphin')).toBe('leap')
    expect(kind('turtles')).toBe('shell')
    expect(kind('monkeys')).toBe('lianas')
    expect(kind('snake')).toBe('slither')
    expect(kind('bee')).toBe('route')
    expect(kind('sheep')).toBe('hills')
    expect(kind('llama')).toBe('hills')
    expect(kind('fish')).toBe('bubbles')
    expect(kind('hedgehog')).toBe('spines')
  })
})

describe.each(KINDS)('the %s finale', (kind) => {
  const s = kind === 'spines' ? scene(kind, {}, spinesLine) : scene(kind)

  it('lasts about four seconds', () => {
    expect(s.seconds).toBeGreaterThanOrEqual(3)
    expect(s.seconds).toBeLessThanOrEqual(5)
  })

  it('never produces a non-finite position at any moment', () => {
    for (let t = 0; t <= s.seconds; t += 0.2) {
      const f = finaleFrame(s, t)
      expect(Number.isFinite(f.animal.x) && Number.isFinite(f.animal.y) && Number.isFinite(f.animal.rotate)).toBe(true)
      for (const prop of f.props) expect(Number.isFinite(prop.x) && Number.isFinite(prop.y)).toBe(true)
    }
  })

  it('reveals its line only forward', () => {
    let previous = -1
    for (let t = 0; t <= s.seconds; t += 0.1) {
      const shown = finaleFrame(s, t).strokes.reduce((sum, v) => sum + v, 0)
      expect(shown).toBeGreaterThanOrEqual(previous)
      previous = shown
    }
  })

  it('the still composition is finished: the whole line shown, nothing hidden', () => {
    const f = finaleFrame(s, 0, true)
    for (const part of f.strokes) expect(part).toBe(1)
    for (const fill of f.fills) expect(fill).toBe(1)
    for (const prop of f.props) expect(prop.shown).toBe(1)
    expect(f.cheering).toBe(true)
  })
})

describe('the line stays the child line', () => {
  it('scales uniformly: its proportions survive the fit', () => {
    const [fitted] = fitStrokes(waveLine.strokes, { w: waveLine.w, h: waveLine.h }, { x: 70, y: 200, w: 860, h: 250 })
    const a = waveLine.strokes[0]
    const scale = (fitted[1][0] - fitted[0][0]) / (a[1][0] - a[0][0])
    fitted.forEach((p, i) => {
      if (i === 0) return
      expect(p[1] - fitted[0][1]).toBeCloseTo((a[i][1] - a[0][1]) * scale, 3)
    })
  })

  it('the duck rides the very points the child traced, from first to last', () => {
    const s = scene('water')
    expect(s.track.length).toBe(waveLine.strokes[0].length)
    const start = finaleFrame(s, 0).animal
    expect([start.x, start.y]).toEqual([s.track[0][0], s.track[0][1]])
    const end = finaleFrame(s, s.seconds).animal
    expect([end.x, end.y]).toEqual([s.track[s.track.length - 1][0], s.track[s.track.length - 1][1]])
  })

  it('the water and the hills have the child line as their top edge', () => {
    for (const kind of ['water', 'hills'] as const) {
      const s = scene(kind)
      const point = s.track[10]
      const surface = `${point[0].toFixed(1)} ${point[1].toFixed(1)}`
      expect(s.fills.some((fill) => fill.d.includes(surface))).toBe(true)
    }
  })

  it('keeps the line on the stage', () => {
    for (const kind of KINDS.filter((k) => k !== 'slither' && k !== 'spines' && k !== 'shell')) {
      for (const p of scene(kind).track) {
        expect(p[0]).toBeGreaterThanOrEqual(0)
        expect(p[0]).toBeLessThanOrEqual(FINALE_STAGE.w)
        expect(p[1]).toBeGreaterThanOrEqual(0)
        expect(p[1]).toBeLessThanOrEqual(FINALE_STAGE.h)
      }
    }
  })
})

describe('direction', () => {
  it('an art that looks left is flipped to walk right, one that looks right is not', () => {
    const middle = (s: FinaleScene) => finaleFrame(s, (s.move[0] + s.move[1]) / 2).animal.flip
    expect(middle(scene('hills', { faces: 'left' }))).toBe(true)
    expect(middle(scene('hills'))).toBe(false)
  })

  it('a line drawn right to left turns the animal around', () => {
    const reversed: TracedLine = { ...waveLine, strokes: [[...waveLine.strokes[0]].reverse()] }
    const s = scene('hills', {}, reversed)
    expect(finaleFrame(s, (s.move[0] + s.move[1]) / 2).animal.flip).toBe(true)
  })
})

describe('firstLoop', () => {
  const oval = (cx: number, n = 40) =>
    Array.from({ length: n + 1 }, (_, i): [number, number] => {
      const a = (i / n) * Math.PI * 2 - Math.PI / 2
      return [cx + Math.cos(a) * 0.07, 0.15 + Math.sin(a) * 0.15]
    })

  it('finds the first oval in a run of ovals', () => {
    const loop = firstLoop([...oval(0.1), ...oval(0.3), ...oval(0.5)])
    const xs = loop.map((p) => p[0])
    expect(Math.max(...xs)).toBeLessThan(0.2)
  })

  it('is the whole line when it never closes', () => {
    const line = waveLine.strokes[0]
    expect(firstLoop(line).length).toBeGreaterThan(line.length / 2)
  })
})

describe('the snake', () => {
  const s = scene('slither')

  it('has no art travelling: the body is the line', () => {
    expect(s.snake).toBeDefined()
    expect(s.strokes).toEqual([])
  })

  it('asleep it lies exactly on the line, head at its end', () => {
    const f = finaleFrame(s, 0, true)
    const end = s.snake!.track[waveLine.strokes[0].length - 1]
    expect(f.snake!.head[0]).toBeCloseTo(end[0], 3)
    expect(f.snake!.head[1]).toBeCloseTo(end[1], 3)
  })

  it('then it leaves the stage', () => {
    const f = finaleFrame(s, s.seconds)
    expect(f.snake!.head[0]).toBeGreaterThan(FINALE_STAGE.w)
  })
})

describe('the bee', () => {
  it('flowers open in the order she reaches them, and the route follows her', () => {
    const s = scene('route')
    expect(s.trail).toBe(true)
    const openedAt = s.props.map((p) => p.at)
    expect(openedAt).toEqual([...openedAt].sort((a, b) => a - b))
    const f = finaleFrame(s, s.props[1].at + 0.5)
    expect(f.props[0].shown).toBe(1)
    expect(f.props[f.props.length - 1].shown).toBe(0)
  })
})

describe('the turtle', () => {
  it('a tall oval lies down instead of being stretched', () => {
    const tall: TracedLine = {
      levelId: 'l',
      w: 0.5,
      h: 1,
      strokes: [
        Array.from({ length: 41 }, (_, i): [number, number] => {
          const a = (i / 40) * Math.PI * 2
          return [0.25 + Math.sin(a) * 0.25, 0.5 - Math.cos(a) * 0.5]
        }),
      ],
    }
    const s = scene('shell', {}, tall)
    const xs = s.fills[0].d.match(/-?\d+\.\d+ -?\d+\.\d+/g)!.map((pair) => pair.split(' ').map(Number))
    const w = Math.max(...xs.map((p) => p[0])) - Math.min(...xs.map((p) => p[0]))
    const h = Math.max(...xs.map((p) => p[1])) - Math.min(...xs.map((p) => p[1]))
    expect(w).toBeGreaterThan(h)
    expect(w / h).toBeCloseTo(2, 0)
  })

  it('the line closes on itself and its shell sits over the art', () => {
    const s = scene('shell')
    expect(s.carriage.front).toBe(false)
    expect(s.fills).toHaveLength(1)
  })
})

describe('the hedgehog', () => {
  it('keeps one stroke per spine, drawn one after another', () => {
    const s = scene('spines', {}, spinesLine)
    expect(s.strokes).toHaveLength(8)
    const f = finaleFrame(s, (s.draw[0] + s.draw[1]) / 2)
    expect(f.strokes[0]).toBe(1)
    expect(f.strokes[7]).toBe(0)
  })
})

describe('nothing to draw with', () => {
  it('composes no scene: the closing runs alone', () => {
    expect(composeFinale({ kind: 'water' }, { levelId: 'l', w: 1, h: 1, strokes: [] })).toBeNull()
  })
})

describe('paper polish', () => {
  const numbers = (d: string) => d.match(/-?\d+\.\d+ -?\d+\.\d+/g)!.map((pair) => pair.split(' ').map(Number))

  it('the water has no step: past the line it runs on as a dying swell, not a flat edge', () => {
    const s = scene('water')
    const left = numbers(s.fills[0].d).filter(([x]) => x < s.track[0][0] - 20 && x > s.track[0][0] - 500)
    expect(new Set(left.map(([, y]) => y.toFixed(0))).size).toBeGreaterThan(3)
  })

  it('the deeper a sheet of water, the calmer: same line, softer', () => {
    const s = scene('water')
    const rough = (d: string) => {
      const ys = numbers(d).filter(([x]) => x > 100 && x < 900).map(([, y]) => y)
      return Math.max(...ys) - Math.min(...ys)
    }
    expect(rough(s.fills[2].d)).toBeLessThan(rough(s.fills[0].d))
  })

  it('the strip is a curve through every kept point, not a polygon', () => {
    const s = scene('water')
    expect(s.strokes[0]).toContain('C')
    expect(s.strokes[0]).not.toContain('L')
    for (const p of s.track) expect(s.strokes[0]).toContain(`${p[0].toFixed(1)} ${p[1].toFixed(1)}`)
  })

  const oval: TracedLine = {
    levelId: 'l',
    w: 1,
    h: 0.6,
    strokes: [
      Array.from({ length: 41 }, (_, i): [number, number] => {
        const a = (i / 40) * Math.PI * 2
        return [0.5 + Math.sin(a) * 0.5, 0.3 - Math.cos(a) * 0.3]
      }),
    ],
  }

  it("the plate lies over the turtle's real shell: her shell's middle is the plate's middle", () => {
    const aspect = 448 / 292
    const s = composeFinale({ kind: 'shell' }, oval, aspect)!
    const view = getCharacterView('tortuga', aspect)
    const box = { w: s.carriage.size * aspect, h: s.carriage.size }
    const shellInBox: [number, number] = [((175 - view.x) / view.w) * box.w, ((119 - view.y) / view.h) * box.h]
    expect(box.w * (s.carriage.pivotX ?? 0.5)).toBeCloseTo(shellInBox[0], 3)
    expect(box.h * (1 - s.carriage.anchor)).toBeCloseTo(shellInBox[1], 3)
    const plate = numbers(s.fills[0].d)
    const xs = plate.map((p) => p[0])
    const ys = plate.map((p) => p[1])
    expect((Math.min(...xs) + Math.max(...xs)) / 2).toBeCloseTo(s.track[0][0], -1)
    expect((Math.min(...ys) + Math.max(...ys)) / 2).toBeCloseTo(s.track[0][1], -1)
  })

  it('the shell keeps the wobble with no facets: its outline is curves', () => {
    const s = scene('shell', {}, oval)
    expect(s.fills[0].d).toContain('C')
    expect(s.fills[0].d).not.toContain('L')
  })

  it('a few vines reach the canopy, never one per loop', () => {
    const loops: TracedLine = {
      levelId: 'l',
      w: 1,
      h: 0.5,
      strokes: [Array.from({ length: 121 }, (_, i): [number, number] => [i / 120 + Math.sin((i / 120) * Math.PI * 12) * 0.03, 0.25 - Math.cos((i / 120) * Math.PI * 12) * 0.25])],
    }
    const s = scene('lianas', {}, loops)
    expect(s.hangs.length).toBeGreaterThan(0)
    expect(s.hangs.length).toBeLessThanOrEqual(4)
  })

  it("the monkey hangs by its raised hand: the hand is the point it travels on", () => {
    const aspect = 269 / 448
    const s = composeFinale({ kind: 'lianas' }, waveLine, aspect)!
    const view = getCharacterView('mono', aspect, { pose: 0 })
    const box = { w: s.carriage.size * aspect, h: s.carriage.size }
    expect(box.w * (s.carriage.pivotX ?? 0.5)).toBeCloseTo(((234 - view.x) / view.w) * box.w, 3)
  })
})
