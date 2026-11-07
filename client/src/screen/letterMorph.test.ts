import { describe, expect, it } from 'vitest'
import {
  MORPH_TIMING,
  MORPH_TOTAL_S,
  boxOf,
  fitLine,
  morphAmount,
  morphPath,
  partOfLine,
  sampleLine,
} from './letterMorph'

const line = Array.from({ length: 50 }, (_, i) => ({ x: i * 4, y: Math.sin(i / 5) * 30 }))

describe('the gesture becoming the letter', () => {
  it('samples any line to exactly the same count, ending at its end', () => {
    for (const n of [12, 120]) {
      const out = sampleLine(line, n)
      expect(out).toHaveLength(n)
      expect(out[0]).toEqual(line[0])
      expect(out[n - 1]).toEqual(line[line.length - 1])
    }
  })

  it('takes one gesture out of a run of them', () => {
    const third = partOfLine(line, 1 / 3)
    expect(third[0]).toEqual(line[0])
    expect(boxOf(third).width).toBeLessThan(boxOf(line).width * 0.5)
    expect(partOfLine(line, 1)).toEqual(line)
  })

  it('fits the line in the letter box without straightening it', () => {
    const fitted = fitLine(line, { x: 100, y: 300, width: 100, height: 120 })
    const box = boxOf(fitted)
    expect(box.width).toBeLessThanOrEqual(100.001)
    expect(box.height).toBeLessThanOrEqual(120.001)
    expect(box.x + box.width / 2).toBeCloseTo(150, 5)
    // Same shape: proportions kept.
    expect(box.width / box.height).toBeCloseTo(boxOf(line).width / boxOf(line).height, 3)
  })

  it('holds the line, then the letter, and moves only in between', () => {
    expect(morphAmount(0)).toBe(0)
    expect(morphAmount(MORPH_TIMING.holdLineS)).toBe(0)
    expect(morphAmount(MORPH_TIMING.holdLineS + MORPH_TIMING.morphS / 2)).toBeCloseTo(0.5, 5)
    expect(morphAmount(MORPH_TOTAL_S)).toBe(1)
    expect(morphAmount(MORPH_TOTAL_S + 10)).toBe(1)
  })

  it('starts as the child\'s line and ends as the letter, exactly', () => {
    const from = sampleLine(line, 20)
    const to = sampleLine(line.map((p) => ({ x: p.x + 10, y: p.y })), 20)
    expect(morphPath(from, to, 0)).toBe(morphPath(from, from, 1))
    expect(morphPath(from, to, 1)).toBe(morphPath(to, to, 0))
  })

  it('is short: a five-year-old is waiting to write', () => {
    expect(MORPH_TOTAL_S).toBeLessThanOrEqual(6)
  })
})
