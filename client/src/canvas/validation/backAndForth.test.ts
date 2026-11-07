import { describe, expect, it } from 'vitest'
import { checkBackAndForth } from './backAndForth'

const route = Array.from({ length: 200 }, (_, i) => ({ x: 100 + i * 3, y: 300 }))

const along = (offset: (x: number) => number) => route.map((p) => ({ x: p.x, y: p.y + offset(p.x) }))
const triangle = (amplitude: number, wavelength: number) => (x: number) => {
  const phase = (x % wavelength) / wavelength
  return amplitude * (phase < 0.5 ? 4 * phase - 1 : 3 - 4 * phase)
}

describe('checkBackAndForth', () => {
  it('reads a clean stroke as clean', () => {
    const result = checkBackAndForth([route], route)
    expect(result.backAndForth).toBe(false)
    expect(result.travelRatio).toBeLessThan(1.1)
  })

  it('leaves a wobbly hand alone', () => {
    const wobbly = along((x) => Math.sin(x / 25) * 12 + Math.sin(x / 7) * 2)
    expect(checkBackAndForth([wobbly], route).backAndForth).toBe(false)
  })

  it('catches the zigzag of `docs/25` P1-1, whatever its amplitude within reason', () => {
    expect(checkBackAndForth([along(triangle(55, 60))], route).backAndForth).toBe(true)
    expect(checkBackAndForth([along(triangle(30, 50))], route).backAndForth).toBe(true)
  })

  it('allows one small correction', () => {
    const back = [...route.slice(0, 60), ...route.slice(40, 60).reverse(), ...route.slice(40)]
    expect(checkBackAndForth([back], route).backAndForth).toBe(false)
  })

  it('catches walking the same stretch up and down', () => {
    const scrub = [
      ...route,
      ...route.slice().reverse(),
      ...route,
    ]
    expect(checkBackAndForth([scrub], route).backAndForth).toBe(true)
  })

  it('does not depend on how densely the line was reported', () => {
    const sparse = route.filter((_, i) => i % 7 === 0)
    expect(checkBackAndForth([sparse], route).backAndForth).toBe(false)
  })

  it('has nothing to say on a degenerate route', () => {
    expect(checkBackAndForth([route], []).backAndForth).toBe(false)
  })
})
