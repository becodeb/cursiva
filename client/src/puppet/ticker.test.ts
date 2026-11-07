import { describe, expect, it } from 'vitest'
import { createTicker, MAX_DT, type FrameClock } from './ticker'

function fakeClock() {
  let next = 1
  const pending = new Map<number, (now: number) => void>()
  const clock: FrameClock = {
    request(callback) {
      const handle = next++
      pending.set(handle, callback)
      return handle
    },
    cancel(handle) {
      pending.delete(handle)
    },
  }
  const fire = (now: number): void => {
    const callbacks = [...pending.values()]
    pending.clear()
    for (const callback of callbacks) callback(now)
  }
  return { clock, fire, pendingCount: () => pending.size }
}

describe('createTicker', () => {
  it('runs one loop however many puppets listen, and stops when the last leaves', () => {
    const { clock, fire, pendingCount } = fakeClock()
    const ticker = createTicker(() => clock)
    expect(pendingCount()).toBe(0)
    const seen: number[] = []
    const a = ticker.subscribe(() => seen.push(1))
    const b = ticker.subscribe(() => seen.push(2))
    expect(pendingCount()).toBe(1)
    fire(1000)
    expect(seen).toEqual([1, 2])
    a()
    expect(pendingCount()).toBe(1)
    b()
    expect(pendingCount()).toBe(0)
  })

  it('skips frames faster than about 30 per second', () => {
    const { clock, fire } = fakeClock()
    const ticker = createTicker(() => clock)
    const dts: number[] = []
    ticker.subscribe((dt) => dts.push(dt))
    fire(1000)
    fire(1016)
    fire(1033)
    expect(dts).toHaveLength(2)
    expect(dts[1]).toBeCloseTo(0.033, 6)
  })

  it('caps the step after a stall', () => {
    const { clock, fire } = fakeClock()
    const ticker = createTicker(() => clock)
    const dts: number[] = []
    ticker.subscribe((dt) => dts.push(dt))
    fire(1000)
    fire(9000)
    expect(dts[1]).toBe(MAX_DT)
  })

  it('survives a listener leaving during its own call', () => {
    const { clock, fire, pendingCount } = fakeClock()
    const ticker = createTicker(() => clock)
    let calls = 0
    const stop = ticker.subscribe(() => {
      calls++
      stop()
    })
    fire(1000)
    fire(2000)
    expect(calls).toBe(1)
    expect(pendingCount()).toBe(0)
  })
})
