import { afterEach, describe, expect, it } from 'vitest'
import {
  MAX_WRITING_POINTS,
  WRITINGS_KEY,
  forgetSessionWritings,
  loadWritings,
  notebookWritings,
  recordWriting,
  toWriting,
} from './notebookWriting'

function memoryStorage(initial: Record<string, string> = {}) {
  const data = { ...initial }
  return {
    data,
    getItem: (k: string) => data[k] ?? null,
    setItem: (k: string, v: string) => {
      data[k] = v
    },
  }
}

const stroke = (n: number) => Array.from({ length: n }, (_, i) => ({ x: 100 + i * 4, y: 300 + Math.sin(i / 3) * 40 }))

afterEach(forgetSessionWritings)

describe('the child\'s writing, kept', () => {
  it('stays in sheet units: a letter sits on the rule the way it was written', () => {
    const writing = toWriting('o', [stroke(20)])!
    const first = writing.strokes[0][0]
    expect(first).toEqual([100, 300])
  })

  it('never keeps more than a word needs', () => {
    const writing = toWriting('mano', [stroke(3000)])!
    expect(writing.strokes.reduce((n, s) => n + s.length, 0)).toBeLessThanOrEqual(MAX_WRITING_POINTS)
  })

  it('refuses a tap or a broken stroke', () => {
    expect(toWriting('o', [])).toBeNull()
    expect(toWriting('o', [[{ x: 1, y: 1 }]])).toBeNull()
    expect(toWriting('o', [[{ x: NaN, y: 1 }, { x: 2, y: 2 }]])).toBeNull()
  })

  it('round-trips through storage, and the latest writing of a letter wins', () => {
    const storage = memoryStorage()
    recordWriting('o', [stroke(10)], storage)
    recordWriting('o', [stroke(12)], storage)
    forgetSessionWritings()
    const loaded = loadWritings(storage)
    expect(Object.keys(loaded)).toEqual(['o'])
    expect(loaded.o.strokes[0].length).toBeGreaterThan(1)
    expect(JSON.parse(storage.data[WRITINGS_KEY]).o.key).toBe('o')
  })

  it('drops a corrupt entry alone and survives junk', () => {
    expect(loadWritings(memoryStorage({ [WRITINGS_KEY]: '{not json' }))).toEqual({})
    const good = { key: 'a', strokes: [[[1, 2], [3, 4]]] }
    const loaded = loadWritings(memoryStorage({ [WRITINGS_KEY]: JSON.stringify({ a: good, b: { key: 'b', strokes: [[[1]]] } }) }))
    expect(Object.keys(loaded)).toEqual(['a'])
  })

  it('still has this session\'s writing with no storage at all', () => {
    recordWriting('mano', [stroke(10)], null)
    expect(loadWritings(null).mano).toBeDefined()
  })

  it('shows words first, and leaves the bridge lines out of the notebook', () => {
    const line = { strokes: [[[1, 2], [3, 4]]] as [number, number][][] }
    const shown = notebookWritings({
      o: { key: 'o', ...line },
      mano: { key: 'mano', ...line },
      'turtle-puente': { key: 'turtle-puente', ...line },
    })
    expect(shown.map((w) => w.key)).toEqual(['mano', 'o'])
  })
})
