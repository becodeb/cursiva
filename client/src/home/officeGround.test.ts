import { describe, expect, it } from 'vitest'
import { bandScatter, type BandInput } from './officeGround'

const band: BandInput = {
  x0: 0,
  x1: 1000,
  y0: 20,
  y1: 60,
  count: 15,
  sizeMin: 30,
  sizeMax: 50,
  tilt: 7,
  artCount: 12,
  seed: 1234,
}

describe('bandScatter (the office ground)', () => {
  it('is deterministic — the office is the same office on every visit', () => {
    expect(bandScatter(band)).toEqual(bandScatter(band))
  })

  it('a different seed gives a different field', () => {
    expect(bandScatter({ ...band, seed: 99 })).not.toEqual(bandScatter(band))
  })

  it('keeps every mark inside its band, and within the declared size range', () => {
    for (const m of bandScatter(band)) {
      expect(m.y).toBeGreaterThanOrEqual(band.y0)
      expect(m.y).toBeLessThanOrEqual(band.y1)
      expect(m.size).toBeGreaterThanOrEqual(band.sizeMin)
      expect(m.size).toBeLessThanOrEqual(band.sizeMax)
      expect(Math.abs(m.angle)).toBeLessThanOrEqual(band.tilt)
      expect(m.art).toBeGreaterThanOrEqual(0)
      expect(m.art).toBeLessThan(band.artCount)
    }
  })

  it('leans, never spins: a tuft rotated on its side reads as debris', () => {
    for (const m of bandScatter(band)) expect(Math.abs(m.angle)).toBeLessThan(20)
  })

  it('never repeats the same silhouette twice in a row', () => {
    // The style guide's section 5 rule, applied to the only surface here that
    // repeats: random art picks reliably produce a run of three at this count.
    const marks = bandScatter(band)
    for (let i = 1; i < marks.length; i++) {
      expect(marks[i].art, `mark ${i} repeats mark ${i - 1}`).not.toBe(marks[i - 1].art)
    }
  })

  it('spreads the marks across the whole span rather than clumping', () => {
    const xs = bandScatter(band).map((m) => m.x)
    expect(Math.min(...xs)).toBeLessThan(120)
    expect(Math.max(...xs)).toBeGreaterThan(880)
  })
})
