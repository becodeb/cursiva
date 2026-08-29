// Free word building tests (letter-combinations spec + main-screen keyboard):
// buildWord seam geometry, connector tangents, t/i deferral and x immediacy,
// global renumbering, n=1 passthrough, rejection paths, the single-M contract,
// and the nextWord keyboard helper. Fixtures are synthetic multi-subpath
// configs (built through the real pipeline) until real t/i/x SVGs land.
import { describe, expect, it, vi } from 'vitest'
import { LETTER_REGISTRY } from './registry'
import { buildWord } from './combinations'
import { nextWord } from '../screen/MainScreen'
import { buildLetterConfig, flattenPathD, isWordEligible } from './svgLetter'
import { letraA } from './letra_a'
import { DEFERRED_SECONDARY_CHARS } from './anchors'
import type { Point } from './types'

const a = LETTER_REGISTRY.a
const c = LETTER_REGISTRY.c

function normalize(v: Point): Point {
  const len = Math.hypot(v.x, v.y)
  if (len < 1e-9) return { x: 1, y: 0 }
  return { x: v.x / len, y: v.y / len }
}

/** Walk chords to the vertex whose cumulative arc reaches `arc` (mirrors
 * buildWord's cut) — test-side ground truth for tail separation. */
function cutIndexAtArc(points: Point[], arc: number): number {
  let acc = 0
  for (let i = 1; i < points.length; i++) {
    acc += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y)
    if (acc >= arc - 1e-9) return i
  }
  return points.length - 1
}

/** Arc length to the vertex nearest `p` (mirrors buildWord's projectArc). */
function projectArc(points: Point[], p: Point): number {
  let best = 0
  let bestD = Infinity
  for (let i = 0; i < points.length; i++) {
    const d = Math.hypot(points[i].x - p.x, points[i].y - p.y)
    if (d < bestD) {
      bestD = d
      best = i
    }
  }
  let acc = 0
  for (let i = 1; i <= best; i++) {
    acc += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y)
  }
  return acc
}

/** Synthetic multi-subpath letters through the REAL pipeline, so mainEndArc,
 * anchors, eligibility, and checkpoints come from production code. Built under
 * a console-warn silence (the pipeline flags their authored anchor ends). */
vi.spyOn(console, 'warn').mockImplementation(() => {})
const tLetter = buildLetterConfig('t', 'M100 420 L100 180 L820 180 M300 300 L600 300')
const iLetter = buildLetterConfig(
  'i',
  'M100 420 L100 240 Q100 190 200 190 L220 240 L220 420 L300 420 M520 170 L526 170 L523 176 Z',
)
const xLetter = buildLetterConfig('x', 'M100 420 L320 210 L540 420 M580 240 L260 410')
vi.restoreAllMocks()

// The synthetic letters are NOT in the real registry — register them for this
// file only (vitest isolates module state per file, so the shared registry is
// untouched for every other suite).
LETTER_REGISTRY.t = tLetter
LETTER_REGISTRY.i = iLetter
LETTER_REGISTRY.x = xLetter

describe('buildWord seam geometry (T2.2–T2.3)', () => {
  it('places the second letter entry exactly at prevEffectiveExit − 20·u (u = normalize(prevExit − entryNatural))', () => {
    const word = buildWord(['a', 'c'])
    const exitA = a.anchors.exit
    const entryC = c.anchors.entry
    const u = normalize({ x: exitA.x - entryC.x, y: exitA.y - entryC.y })
    const target = {
      x: Math.round((exitA.x - 20 * u.x) * 100) / 100,
      y: Math.round((exitA.y - 20 * u.y) * 100) / 100,
    }
    const flat = flattenPathD(word.pathDefinition.d)
    // The word is [a][connector][c]: c's placed entry is the first point AFTER
    // a's polyline and the 24 connector steps.
    const aLen = flattenPathD(a.pathDefinition.d).points.length
    const placed = flat.points[aLen + 24]
    expect(Math.hypot(placed.x - target.x, placed.y - target.y)).toBeLessThanOrEqual(0.01)
  })

  it('the gap direction and magnitude match u exactly (vector contract, not just distance)', () => {
    const word = buildWord(['a', 'c'])
    const exitA = a.anchors.exit
    const entryC = c.anchors.entry
    const u = normalize({ x: exitA.x - entryC.x, y: exitA.y - entryC.y })
    const flat = flattenPathD(word.pathDefinition.d)
    const aLen = flattenPathD(a.pathDefinition.d).points.length
    const placed = flat.points[aLen + 24]
    const delta = { x: exitA.x - placed.x, y: exitA.y - placed.y }
    expect(Math.hypot(delta.x - 20 * u.x, delta.y - 20 * u.y)).toBeLessThanOrEqual(0.02)
  })
})

describe('buildWord connector (T2.4)', () => {
  it('emits exactly 24 connector steps between the two letters', () => {
    const word = buildWord(['a', 'c'])
    const flat = flattenPathD(word.pathDefinition.d)
    const aLen = flattenPathD(a.pathDefinition.d).points.length
    const cLen = flattenPathD(c.pathDefinition.d).points.length
    expect(flat.points).toHaveLength(aLen + 24 + cLen)
  })

  it('step₁ follows the last-3-points tangent of `a`; step₂₄ the first-3-points tangent of `c`', () => {
    const word = buildWord(['a', 'c'])
    const flat = flattenPathD(word.pathDefinition.d).points
    const aFlat = flattenPathD(a.pathDefinition.d).points
    const cFlat = flattenPathD(c.pathDefinition.d).points
    const p0 = aFlat[aFlat.length - 1]
    const t0 = normalize({
      x: aFlat[aFlat.length - 1].x - aFlat[aFlat.length - 3].x,
      y: aFlat[aFlat.length - 1].y - aFlat[aFlat.length - 3].y,
    })
    const t3 = normalize({ x: cFlat[2].x - cFlat[0].x, y: cFlat[2].y - cFlat[0].y })
    const step1 = flat[aFlat.length]
    const step24 = flat[aFlat.length + 23] // last sample == placed entry
    const d1 = normalize({ x: step1.x - p0.x, y: step1.y - p0.y })
    // Direction of the LAST connector segment (step23 → step24), aligned with t3.
    const d24 = normalize({ x: step24.x - flat[aFlat.length + 22].x, y: step24.y - flat[aFlat.length + 22].y })
    expect(d1.x * t0.x + d1.y * t0.y).toBeGreaterThan(0.99)
    expect(d24.x * t3.x + d24.y * t3.y).toBeGreaterThan(0.99)
  })
})

describe('buildWord deferral and immediacy (T2.4–T2.5, letter-model)', () => {
  it('t/i secondaries come LAST in d, in word order, after all mains and the connector', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const word = buildWord(['t', 'i'])
      const draws = word.animationTimeline.filter((s) => s.type === 'draw_path')
      const segments = draws.map((d) => flattenPathD((d.properties as { d: string }).d).points)
      const tFlat = flattenPathD(tLetter.pathDefinition.d).points
      const iFlat = flattenPathD(iLetter.pathDefinition.d).points
      const tCut = cutIndexAtArc(tFlat, tLetter.pathDefinition.mainEndArc!)
      const iCut = cutIndexAtArc(iFlat, iLetter.pathDefinition.mainEndArc!)
      // Composition: [t main][connector][i main][t cross][i dot] — the two
      // secondaries are the LAST two segments, in word order.
      expect(segments.map((s) => s.length)).toEqual([
        tCut + 1,
        24,
        iCut + 1,
        tFlat.length - tCut - 1,
        iFlat.length - iCut - 1,
      ])
      // t is the first member (untranslated): the deferred cross ENDS exactly
      // at t's stored d end.
      const tCross = segments[3]
      expect(tCross[tCross.length - 1]).toEqual(tFlat[tFlat.length - 1])
      // i is the second member: its dot end carries the SAME translation as
      // its main end, so the (dot end − main end) vector is translation-free.
      const iDot = segments[4]
      const iMain = segments[2]
      const deltaSeg = {
        x: iDot[iDot.length - 1].x - iMain[iMain.length - 1].x,
        y: iDot[iDot.length - 1].y - iMain[iMain.length - 1].y,
      }
      const deltaRaw = {
        x: iFlat[iFlat.length - 1].x - iFlat[iCut].x,
        y: iFlat[iFlat.length - 1].y - iFlat[iCut].y,
      }
      expect(Math.hypot(deltaSeg.x - deltaRaw.x, deltaSeg.y - deltaRaw.y)).toBeLessThan(0.02)
    } finally {
      vi.restoreAllMocks()
    }
  })

  it('t and i deferred checkpoints are numbered LAST, owning the highest orders', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const word = buildWord(['t', 'i'])
      const cps = word.pathDefinition.checkpoints
      const N = cps.length
      const tFlat = flattenPathD(tLetter.pathDefinition.d).points
      const iFlat = flattenPathD(iLetter.pathDefinition.d).points
      const tTail = tLetter.pathDefinition.checkpoints.filter(
        (cp) => projectArc(tFlat, cp) > tLetter.pathDefinition.mainEndArc!,
      )
      const iTail = iLetter.pathDefinition.checkpoints.filter(
        (cp) => projectArc(iFlat, cp) > iLetter.pathDefinition.mainEndArc!,
      )
      // Deferred blocks are renumbered LAST: both tails own the top orders.
      const deferredCount = tTail.length + iTail.length
      const lastOrders = cps.slice(N - deferredCount).map((cp) => cp.order)
      expect(lastOrders).toEqual(
        Array.from({ length: deferredCount }, (_, k) => N - deferredCount + 1 + k),
      )
      // Within the deferred block the WORD order holds: t cross, then i dot.
      expect(cps[N - 1].name).toBe(iTail[iTail.length - 1].name)
    } finally {
      vi.restoreAllMocks()
    }
  })

  it('x second diagonal is IMMEDIATE: precedes the connector and the next main', () => {
    const word = buildWord(['x', 'a'])
    const flat = flattenPathD(word.pathDefinition.d).points
    const xFlat = flattenPathD(xLetter.pathDefinition.d).points
    // x's full stroke (main + second diagonal) occupies the first xFlat.length
    // points UNINTERRUPTED — the tail is not deferred, so no connector precedes it.
    for (let k = 0; k < xFlat.length; k++) {
      expect(flat[k]).toEqual(xFlat[k])
    }
    // The timeline draws the second diagonal inside x's letter block (600ms),
    // before the connector (500ms).
    const draws = word.animationTimeline.filter((s) => s.type === 'draw_path')
    expect(draws.map((d) => [d.delay, d.duration])).toEqual([
      [1000, 2600],
      [3600, 600],
      [4200, 500],
      [4700, 2600],
    ])
  })
})

describe('buildWord global renumbering (T2.5)', () => {
  it('a + c renumber to exactly 1..N — strictly contiguous, names kept', () => {
    const word = buildWord(['a', 'c'])
    const nA = a.pathDefinition.checkpoints.length
    const nC = c.pathDefinition.checkpoints.length
    const orders = word.pathDefinition.checkpoints.map((cp) => cp.order)
    // The spec scenario pins 9+6 → exactly 1..15; the invariant holds for the
    // real checkpoint counts whatever they are.
    expect(orders).toEqual(Array.from({ length: nA + nC }, (_, i) => i + 1))
    expect(word.pathDefinition.checkpoints[nA].name).toBe(c.pathDefinition.checkpoints[0].name)
  })
})

describe('buildWord meta and refusals (T2.6, T2.1)', () => {
  it('n=1 returns the registry config object UNCHANGED (no properties.d on its step)', () => {
    const word = buildWord(['a'])
    expect(word).toBe(a)
    const draw = word.animationTimeline.find((s) => s.type === 'draw_path')
    expect(draw?.properties).toBeUndefined()
  })

  it('anchors span the word: first member entry, last effective exit on the d end', () => {
    const word = buildWord(['a', 'c'])
    expect(word.anchors.entry).toEqual(a.anchors.entry)
    const flat = flattenPathD(word.pathDefinition.d)
    const end = flat.points[flat.points.length - 1]
    expect(Math.hypot(end.x - word.anchors.exit.x, end.y - word.anchors.exit.y)).toBeLessThanOrEqual(0.01)
  })

  it('the stored d is a SINGLE-M polyline for any word length', () => {
    for (const chars of [['a', 'c'], ['a', 'c', 'e'], ['a', 'c', 'a', 'c']]) {
      const d = buildWord(chars).pathDefinition.d
      expect((d.match(/m/gi) ?? []).length).toBe(1)
      expect(flattenPathD(d).starts).toEqual([0])
    }
  })

  it('throws for unregistered names and the empty word; the deferral set excludes x/f', () => {
    expect(() => buildWord(['z'])).toThrow(/Letra no configurada: z/)
    expect(() => buildWord(['Z'])).toThrow(/Letra no configurada/)
    expect(() => buildWord([])).toThrow(/al menos 1 letra/)
    // The Kalam seed fails eligibility directly (every registered letter is
    // entry-matched today, so the ineligible-throw is reachable only in data).
    expect(isWordEligible(letraA)).toBe(false)
    expect(DEFERRED_SECONDARY_CHARS).toEqual(new Set(['t', 'i', 'j']))
    expect(DEFERRED_SECONDARY_CHARS.has('x')).toBe(false)
    expect(DEFERRED_SECONDARY_CHARS.has('f')).toBe(false)
  })

  it('builds longer words: 4 letters, 3 connectors, per-segment timeline, fade at max+200', () => {
    const word = buildWord(['a', 'c', 'e', 'a'])
    expect(word.character).toBe('acea')
    expect(word.id).toBe('palabra_acea')
    const draws = word.animationTimeline.filter((s) => s.type === 'draw_path')
    expect(draws).toHaveLength(7) // 4 mains + 3 connectors
    for (const d of draws) {
      expect(typeof (d.properties as { d?: unknown }).d).toBe('string')
    }
    const fade = word.animationTimeline.find((s) => s.type === 'fade_out')
    const last = draws[draws.length - 1]
    expect(fade?.delay).toBe(last.delay! + last.duration + 200)
  })
})

describe('buildWord ideal cloud (T2.5)', () => {
  it('concatenates translated member clouds plus a ±8px band around each connector step', () => {
    const word = buildWord(['a', 'c'])
    const memberPoints = a.pathDefinition.ideal.length + c.pathDefinition.ideal.length
    // 24 connector samples × 2 perpendicular band points.
    expect(word.pathDefinition.ideal).toHaveLength(memberPoints + 24 * 2)
  })
})

describe('nextWord (main-screen keyboard, T5.1/T5.4)', () => {
  it("appends a registered eligible letter: ['c'] + 'a' → ['c','a']; ca+b → cab", () => {
    expect(nextWord(['c'], 'a')).toEqual(['c', 'a'])
    expect(nextWord(['c', 'a'], 'b')).toEqual(['c', 'a', 'b'])
  })

  it('Backspace pops the last letter; empty word is a no-op', () => {
    expect(nextWord(['c', 'a'], 'Backspace')).toEqual(['c'])
    expect(nextWord(['c'], 'Backspace')).toEqual([])
    expect(nextWord([], 'Backspace')).toEqual([])
  })

  it('uppercase, modifiers, space, and unknown keys are ignored (null)', () => {
    expect(nextWord(['c'], 'A')).toBeNull()
    expect(nextWord(['c'], 'Control')).toBeNull()
    expect(nextWord(['c'], 'Shift')).toBeNull()
    expect(nextWord(['c'], ' ')).toBeNull()
    expect(nextWord(['c'], 'z')).toBeNull() // unregistered → no append
    expect(nextWord(['c'], 'Enter')).toBeNull()
  })
})