// Letter-combinations focused tests (letter-combinations spec): buildWord seam
// continuity (20px gap along the entry tangent, exact placed entry), the
// 24-step Bézier connector with stroke-end tangents, global renumbering, the
// per-segment demo timeline, x-immediate / t-i-deferred ordering, and the
// removal of the ordered-pair registry. The guided/free rail over a word path
// lives in modes.test.ts (integration).
import { describe, expect, it, vi } from 'vitest'
import { buildWord } from './combinations'
import * as registryModule from './registry'
import { LETTER_REGISTRY } from './registry'
import { flattenPathD, buildLetterConfig } from './svgLetter'
import type { Point } from './types'

const a = LETTER_REGISTRY.a
const c = LETTER_REGISTRY.c

const round2 = (n: number): number => Math.round(n * 100) / 100
const round1 = (n: number): number => Math.round(n * 10) / 10

function normalize(v: Point): Point {
  const len = Math.hypot(v.x, v.y)
  if (len < 1e-9) return { x: 1, y: 0 }
  return { x: v.x / len, y: v.y / len }
}

/** The connector's expected endpoints for a→c, mirroring buildWord. */
function expectedSeam(): { p0: Point; p3: Point; u: Point } {
  const p0 = a.anchors.exit
  const entry = c.anchors.entry
  const u = normalize({ x: p0.x - entry.x, y: p0.y - entry.y })
  const p3 = { x: round2(p0.x - 20 * u.x), y: round2(p0.y - 20 * u.y) }
  return { p0, p3, u }
}

describe('buildWord seam continuity (20px gap along the entry tangent)', () => {
  it('the translated `c` entry lands EXACTLY on round2(exit_a − 20·u)', () => {
    const word = buildWord(['a', 'c'])
    const { p0, p3, u } = expectedSeam()
    const flat = flattenPathD(word.pathDefinition.d)
    // Single M: the word is ONE stroke, never split by M.
    expect(flat.starts).toEqual([0])
    const aLen = flattenPathD(a.pathDefinition.d).points.length
    const placed = flat.points[aLen + 24] // first point after a + the 24 connector steps
    // Exact by construction: transformPathD rounds entry + (target − entry).
    expect(Math.hypot(placed.x - p3.x, placed.y - p3.y)).toBeLessThan(1e-6)
    // The gap from the previous exit is 20px ALONG u (vector equality, not
    // just distance): the placed entry sits exactly where the seam spec puts it.
    const delta = { x: p0.x - placed.x, y: p0.y - placed.y }
    expect(Math.hypot(delta.x - 20 * u.x, delta.y - 20 * u.y)).toBeLessThanOrEqual(0.02)
  })

  it('single-`M` composition: a points, 24 connector steps, then c points', () => {
    const word = buildWord(['a', 'c'])
    const flat = flattenPathD(word.pathDefinition.d)
    const aFlat = flattenPathD(a.pathDefinition.d).points
    const cFlat = flattenPathD(c.pathDefinition.d).points
    expect(flat.points).toHaveLength(aFlat.length + 24 + cFlat.length)
  })
})

describe('buildWord connector (24-step Bézier, stroke-end tangents, arms |P3−P0|/3)', () => {
  it('exposes exactly 24 uniform steps whose ends follow the joining strokes tangent directions', () => {
    const word = buildWord(['a', 'c'])
    const flat = flattenPathD(word.pathDefinition.d).points
    const aFlat = flattenPathD(a.pathDefinition.d).points
    const cFlat = flattenPathD(c.pathDefinition.d).points
    const { p0, p3 } = expectedSeam()

    // The connector occupies indices [aFlat.length, aFlat.length + 23].
    const step1 = flat[aFlat.length]
    const step24 = flat[aFlat.length + 23]
    // P0 is a's last point; the connector's last sample is the placed entry
    // (the translated c start sits at index aFlat.length + 24).
    expect(flat[aFlat.length - 1]).toEqual(p0)
    expect(flat[aFlat.length + 24]).toEqual(p3)

    // step₁ direction ≈ the LAST-3-points tangent of `a`'s stroke.
    const prevChunk = aFlat
    const t0 = normalize({
      x: prevChunk[prevChunk.length - 1].x - prevChunk[prevChunk.length - 3].x,
      y: prevChunk[prevChunk.length - 1].y - prevChunk[prevChunk.length - 3].y,
    })
    const d1 = normalize({ x: step1.x - p0.x, y: step1.y - p0.y })
    const dot1 = d1.x * t0.x + d1.y * t0.y
    expect(dot1).toBeGreaterThan(0.99)

    // Final connector segment direction ≈ the FIRST-3-points tangent of `c`'s main.
    const t3 = normalize({ x: cFlat[2].x - cFlat[0].x, y: cFlat[2].y - cFlat[0].y })
    const d24 = normalize({
      x: step24.x - flat[aFlat.length + 22].x,
      y: step24.y - flat[aFlat.length + 22].y,
    })
    const dot24 = d24.x * t3.x + d24.y * t3.y
    expect(dot24).toBeGreaterThan(0.99)
  })
})

describe('buildWord global renumbering', () => {
  it('renumbers a+c to exactly 1..N with no gaps or duplicates, names kept', () => {
    const word = buildWord(['a', 'c'])
    const expectedN = a.pathDefinition.checkpoints.length + c.pathDefinition.checkpoints.length
    const orders = word.pathDefinition.checkpoints.map((cp) => cp.order)
    expect(orders).toEqual(Array.from({ length: expectedN }, (_, i) => i + 1))
    // Names preserved through the renumbering (first of c keeps its name).
    expect(word.pathDefinition.checkpoints[a.pathDefinition.checkpoints.length].name).toBe(
      c.pathDefinition.checkpoints[0].name,
    )
  })

  it('translates each member checkpoint by the member offset (placed entry − natural entry)', () => {
    const word = buildWord(['a', 'c'])
    const { p3 } = expectedSeam() // p3 = placed entry = prevExit − 20·u
    const entry = c.anchors.entry
    const dx = p3.x - entry.x
    const dy = p3.y - entry.y
    const firstC = word.pathDefinition.checkpoints[a.pathDefinition.checkpoints.length]
    expect(firstC.x).toBe(round1(c.pathDefinition.checkpoints[0].x + dx))
    expect(firstC.y).toBe(round1(c.pathDefinition.checkpoints[0].y + dy))
  })
})

describe('buildWord demo timeline', () => {
  // Synthetic multi-subpath letters through the REAL pipeline, registered for
  // this FILE only (vitest isolates module state per file).
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  const xLetter = buildLetterConfig('x', 'M100 420 L320 210 L540 420 M580 240 L260 410')
  const tLetter = buildLetterConfig('t', 'M100 420 L100 180 L820 180 M300 300 L600 300')
  const iLetter = buildLetterConfig(
    'i',
    'M100 420 L100 240 Q100 190 200 190 L220 240 L220 420 L300 420 M520 170 L526 170 L523 176 Z',
  )
  vi.restoreAllMocks()
  LETTER_REGISTRY.x = xLetter
  LETTER_REGISTRY.t = tLetter
  LETTER_REGISTRY.i = iLetter

  it('builds one draw_path per segment with cumulative delays and properties.d', () => {
    const word = buildWord(['a', 'c'])
    const draws = word.animationTimeline.filter((s) => s.type === 'draw_path')
    // a main 1000/2600 → connector 3600/500 → c main 4100/2600.
    expect(draws).toHaveLength(3)
    expect(draws[0]).toMatchObject({ delay: 1000, duration: 2600 })
    expect(draws[1]).toMatchObject({ delay: 3600, duration: 500 })
    expect(draws[2]).toMatchObject({ delay: 4100, duration: 2600 })
    for (const d of draws) {
      expect(typeof (d.properties as { d?: unknown } | undefined)?.d).toBe('string')
    }
    // fade_out at max(delay + duration) + 200.
    const fade = word.animationTimeline.find((s) => s.type === 'fade_out')
    expect(fade).toMatchObject({ delay: 6700 + 200, duration: 600 })
    // slide_in from member 0, family/theme/strokeWidth/zone from the first.
    expect(word.animationTimeline[0].type).toBe('slide_in')
    expect(word.family).toBe('enlazada')
    expect(word.theme).toBe(a.theme)
    expect(word.pathDefinition.strokeWidth).toBe(a.pathDefinition.strokeWidth)
    expect(word.baselineZone).toBe(a.baselineZone)
    expect(word.id).toBe('palabra_ac')
    expect(word.character).toBe('ac')
  })

  it('schedules the x second diagonal inside its letter block, before the following connector', () => {
    const x = buildLetterConfig('x', 'M100 420 L320 210 L540 420 M580 240 L260 410')
    const word = buildWord(['x', 'a'])
    const draws = word.animationTimeline.filter((s) => s.type === 'draw_path')
    // x main 1000/2600 → x tail 3600/600 → connector 4200/500 → a main 4700/2600.
    expect(draws.map((d) => [d.delay, d.duration])).toEqual([
      [1000, 2600],
      [3600, 600],
      [4200, 500],
      [4700, 2600],
    ])
    // The x tail is inside the letter block: the SECOND step carries x's tail d.
    expect((draws[1].properties as { d: string }).d.startsWith('M')).toBe(true)
  })

  it('defers t/i secondary steps to the end, after every letter and connector', () => {
    const t = buildLetterConfig(
      't',
      'M100 420 L100 180 L820 180 M300 300 L600 300',
    )
    const i = buildLetterConfig(
      'i',
      'M100 420 L100 240 Q100 190 200 190 L220 240 L220 420 L300 420 M520 170 L526 170 L523 176 Z',
    )
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const word = buildWord(['t', 'i'])
      const draws = word.animationTimeline.filter((s) => s.type === 'draw_path')
      expect(draws).toHaveLength(5) // t main, connector, i main, t cross, i dot
      // The last two steps are the deferred secondaries, 600ms each, after all others.
      const kinds = draws.map((d) => d.duration)
      expect(kinds).toEqual([2600, 500, 2600, 600, 600])
      const starts = draws.map((d) => d.delay)
      expect(starts[3]).toBeGreaterThan(starts[2] + 2600 - 1) // cross starts after i main ends
    } finally {
      vi.restoreAllMocks()
    }
  })
})

describe('COMBO_REGISTRY removal (ordered-pair registry dropped)', () => {
  it('no longer exports COMBO_REGISTRY; the single-letter flow is untouched', () => {
    const combo = (registryModule as unknown as Record<string, unknown>).COMBO_REGISTRY
    expect(combo).toBeUndefined()
    // n=1 passthrough still returns the registry config UNCHANGED.
    expect(buildWord(['a'])).toBe(a)
  })

  it('rejects unregistered names and the empty word', () => {
    expect(() => buildWord(['z'])).toThrow(/Letra no configurada: z/)
    expect(() => buildWord([])).toThrow(/al menos 1 letra/)
  })
})