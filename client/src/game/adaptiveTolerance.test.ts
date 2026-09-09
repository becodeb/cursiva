// Adaptive tolerance + coaching contract (docs/03 sections 4 and 7).
import { describe, expect, it } from 'vitest'
import { MAX_WIDTH_FACTOR, MIN_WIDTH_FACTOR, applyAttempt, coachMessage } from './adaptiveTolerance'
import { EMPTY_RECORD } from './types'
import type { LevelAttempt, LevelRecord } from './types'

function attempt(over: Partial<LevelAttempt> = {}): LevelAttempt {
  return {
    accuracy: 80,
    directionOk: true,
    wrongDirection: false,
    fluency: 70,
    extraLifts: 0,
    approved: true,
    failedPillar: null,
    ...over,
  }
}

const PASS = attempt()
const FAIL = attempt({ approved: false, accuracy: 20, failedPillar: 'accuracy' })

/** Fold a sequence of attempts into a fresh record. */
function run(sequence: LevelAttempt[], from: LevelRecord = EMPTY_RECORD): LevelRecord {
  return sequence.reduce((record, a) => applyAttempt(record, a), from)
}

const repeat = (a: LevelAttempt, n: number): LevelAttempt[] => Array.from({ length: n }, () => a)

describe('applyAttempt — purity and counters', () => {
  it('never mutates the input record', () => {
    const before = { ...EMPTY_RECORD }
    const after = applyAttempt(before, PASS)
    expect(before).toEqual(EMPTY_RECORD)
    expect(after).not.toBe(before)
  })

  it('counts every attempt', () => {
    expect(run([PASS, FAIL, FAIL, PASS]).attempts).toBe(4)
  })

  it('counts only approvals in approvals', () => {
    expect(run([PASS, FAIL, PASS, FAIL, FAIL]).approvals).toBe(2)
  })

  it('keeps bestAccuracy and bestFluency as monotonic maxima', () => {
    const record = run([
      attempt({ accuracy: 90, fluency: 40 }),
      attempt({ accuracy: 55, fluency: 88 }),
      attempt({ accuracy: 10, fluency: 10 }),
    ])
    expect(record.bestAccuracy).toBe(90)
    expect(record.bestFluency).toBe(88)
  })

  it('records the best scores even from FAILED attempts', () => {
    const record = run([attempt({ approved: false, accuracy: 64, fluency: 51 })])
    expect(record.bestAccuracy).toBe(64)
    expect(record.bestFluency).toBe(51)
  })
})

describe('applyAttempt — streak bookkeeping', () => {
  it('a pass clears the failure streak and vice versa', () => {
    expect(run([FAIL, FAIL, PASS]).streakFail).toBe(0)
    expect(run([FAIL, FAIL, PASS]).streakPass).toBe(1)
    expect(run([PASS, FAIL]).streakPass).toBe(0)
    expect(run([PASS, FAIL]).streakFail).toBe(1)
  })

  it('does not widen when failures are interrupted by a pass', () => {
    expect(run([FAIL, FAIL, PASS, FAIL, FAIL]).widthFactor).toBe(1)
  })
})

describe('applyAttempt — widening after failures', () => {
  it('leaves the corridor alone for the first two failures', () => {
    expect(run([FAIL]).widthFactor).toBe(1)
    expect(run([FAIL, FAIL]).widthFactor).toBe(1)
  })

  it('widens by 25% on the THIRD consecutive failure and resets the counter', () => {
    const record = run(repeat(FAIL, 3))
    expect(record.widthFactor).toBeCloseTo(1.25, 10)
    expect(record.streakFail).toBe(0)
  })

  it('needs another three failures before widening again', () => {
    expect(run(repeat(FAIL, 5)).widthFactor).toBeCloseTo(1.25, 10)
    expect(run(repeat(FAIL, 6)).widthFactor).toBeCloseTo(1.5625, 10)
    expect(run(repeat(FAIL, 9)).widthFactor).toBeCloseTo(1.953125, 10)
  })

  it('caps the accumulated widening at x2', () => {
    expect(run(repeat(FAIL, 12)).widthFactor).toBe(MAX_WIDTH_FACTOR)
    expect(run(repeat(FAIL, 30)).widthFactor).toBe(MAX_WIDTH_FACTOR)
    expect(MAX_WIDTH_FACTOR).toBe(2)
  })

  it('never blocks the level, however many failures accumulate', () => {
    const record = run(repeat(FAIL, 30))
    expect(record.attempts).toBe(30)
    expect(record.widthFactor).toBeLessThanOrEqual(MAX_WIDTH_FACTOR)
  })
})

describe('applyAttempt — returning to nominal after passes', () => {
  const widened = run(repeat(FAIL, 3)) // widthFactor 1.25

  it('holds the widened corridor after a single pass', () => {
    expect(applyAttempt(widened, PASS).widthFactor).toBeCloseTo(1.25, 10)
  })

  it('returns to the nominal width on the SECOND consecutive pass', () => {
    const record = run(repeat(PASS, 2), widened)
    expect(record.widthFactor).toBe(1)
    expect(record.streakPass).toBe(2)
  })

  it('does not overshoot below nominal on the way back', () => {
    expect(run(repeat(PASS, 2), widened).widthFactor).toBe(1)
  })
})

describe('applyAttempt — narrowing after mastery', () => {
  it('narrows by 15% on the THIRD consecutive pass at nominal, and resets the counter', () => {
    const record = run(repeat(PASS, 3))
    expect(record.widthFactor).toBeCloseTo(0.85, 10)
    expect(record.streakPass).toBe(0)
  })

  it('needs another three passes before narrowing again', () => {
    expect(run(repeat(PASS, 5)).widthFactor).toBeCloseTo(0.85, 10)
    expect(run(repeat(PASS, 6)).widthFactor).toBeCloseTo(0.7225, 10)
  })

  it('floors the narrowing at 0.7', () => {
    expect(run(repeat(PASS, 9)).widthFactor).toBe(MIN_WIDTH_FACTOR)
    expect(run(repeat(PASS, 30)).widthFactor).toBe(MIN_WIDTH_FACTOR)
    expect(MIN_WIDTH_FACTOR).toBe(0.7)
  })

  it('widens a narrowed level again after three failures', () => {
    const mastered = run(repeat(PASS, 3)) // 0.85
    const struggling = run(repeat(FAIL, 3), mastered)
    expect(struggling.widthFactor).toBeCloseTo(0.85 * 1.25, 10)
  })

  it('walks a full widen → recover → narrow cycle', () => {
    let record = run(repeat(FAIL, 3))
    expect(record.widthFactor).toBeCloseTo(1.25, 10)
    record = run(repeat(PASS, 2), record)
    expect(record.widthFactor).toBe(1)
    record = applyAttempt(record, PASS) // third consecutive pass
    expect(record.widthFactor).toBeCloseTo(0.85, 10)
    expect(record.approvals).toBe(3)
    expect(record.attempts).toBe(6)
  })
})

describe('coachMessage', () => {
  it('celebrates an approved attempt', () => {
    expect(coachMessage(attempt())).toBe('¡Muy bien!')
  })

  it('names the gesture for an inverted turn', () => {
    expect(coachMessage(attempt({ approved: false, wrongDirection: true, failedPillar: 'direction' }))).toBe(
      'Probá al revés: seguí la flecha desde el punto verde.',
    )
  })

  it('asks for one movement when the child lifted the finger', () => {
    expect(
      coachMessage(attempt({ approved: false, failedPillar: 'fluency', extraLifts: 1 })),
    ).toBe('Casi. Probá otra vez sin levantar el dedo.')
  })

  it('asks for an even rhythm when the trace was jerky but unbroken', () => {
    expect(
      coachMessage(attempt({ approved: false, failedPillar: 'fluency', extraLifts: 0 })),
    ).toBe('Vas bien. Probá más parejo, sin frenar.')
  })

  it('asks to stay in the corridor when accuracy failed', () => {
    expect(coachMessage(attempt({ approved: false, failedPillar: 'accuracy' }))).toBe(
      'Quedate adentro del camino, despacito.',
    )
  })

  it('asks to walk the whole path when checkpoints were missed', () => {
    expect(
      coachMessage(attempt({ approved: false, failedPillar: 'direction', directionOk: false })),
    ).toBe('Recorré todo el camino, desde el punto verde hasta el final.')
  })

  it('surfaces an inverted turn even on a level that did not fail for it', () => {
    // enforceOrder false ⇒ the pillar cannot block, but the gesture still gets
    // named: a clockwise `a` looks perfect and will never link.
    const message = coachMessage(
      attempt({ approved: false, wrongDirection: true, failedPillar: 'fluency' }),
    )
    expect(message).toBe('Probá al revés: seguí la flecha desde el punto verde.')
  })

  it('never names the failure — no "mal", no "error", no "incorrecto"', () => {
    const everyCase: LevelAttempt[] = [
      attempt(),
      attempt({ approved: false, wrongDirection: true, failedPillar: 'direction' }),
      attempt({ approved: false, failedPillar: 'fluency', extraLifts: 2 }),
      attempt({ approved: false, failedPillar: 'fluency' }),
      attempt({ approved: false, failedPillar: 'accuracy' }),
      attempt({ approved: false, failedPillar: 'direction' }),
      attempt({ approved: false, failedPillar: null }),
    ]
    for (const a of everyCase) {
      const message = coachMessage(a)
      expect(message.length).toBeGreaterThan(0)
      expect(message.length).toBeLessThanOrEqual(70)
      expect(message.toLowerCase()).not.toMatch(/\bmal\b|error|incorrect|fall|equivoc/)
    }
  })

  it('always returns something, even for an unclassified failure', () => {
    expect(coachMessage(attempt({ approved: false, failedPillar: null }))).toBe(
      'Probá una vez más, tranquilo.',
    )
  })
})
