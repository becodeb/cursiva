import { describe, expect, it } from 'vitest'
import type { LevelAttempt } from '../game/types'
import { exitCueOf, letterCoachLine, notebookHelpFor } from './notebookStep'

const attempt = (over: Partial<LevelAttempt>): LevelAttempt => ({
  accuracy: 80,
  directionOk: true,
  wrongDirection: false,
  fluency: 80,
  extraLifts: 0,
  approved: false,
  failedPillar: null,
  ...over,
})

describe('letterCoachLine', () => {
  it('names the gesture and never the fault', () => {
    const lines = [
      letterCoachLine(attempt({ wrongDirection: true }), 'trace'),
      letterCoachLine(attempt({ wrongDirection: true }), 'memory'),
      letterCoachLine(attempt({ backAndForth: true, failedPillar: 'direction' }), 'trace'),
      letterCoachLine(attempt({ extraLifts: 1, failedPillar: 'fluency' }), 'copy'),
      letterCoachLine(attempt({ failedPillar: 'accuracy' }), 'trace'),
      letterCoachLine(attempt({ failedPillar: 'accuracy' }), 'memory'),
      letterCoachLine(attempt({ failedPillar: 'direction' }), 'dotted'),
      letterCoachLine(attempt({ failedPillar: 'fluency' }), 'word'),
    ]
    for (const line of lines) expect(line.toLowerCase()).not.toMatch(/\bmal\b|error|incorrect|no es/)
    expect(new Set(lines).size).toBeGreaterThan(5)
  })

  it('never mentions a green dot or a path where none is on the page', () => {
    expect(letterCoachLine(attempt({ wrongDirection: true }), 'memory')).not.toMatch(/verde/)
    expect(letterCoachLine(attempt({ failedPillar: 'accuracy' }), 'memory')).not.toMatch(/camin/)
  })
})

describe('notebookHelpFor: the app never blocks (`docs/01` §5)', () => {
  it('gives the guide back, then a way forward, and never takes either away', () => {
    expect(notebookHelpFor(0)).toBe('none')
    expect(notebookHelpFor(1)).toBe('none')
    expect(notebookHelpFor(2)).toBe('show-again')
    expect(notebookHelpFor(3)).toBe('show-again')
    expect(notebookHelpFor(4)).toBe('offer-continue')
    expect(notebookHelpFor(40)).toBe('offer-continue')
  })
})

describe('exitCueOf', () => {
  it('sits on the last point and runs on along the last heading', () => {
    const cue = exitCueOf([{ x: 0, y: 100 }, { x: 60, y: 60 }, { x: 100, y: 40 }])!
    expect(cue).toMatchObject({ x: 100, y: 40 })
    const [, tx, ty] = cue.tail.match(/L([\d.]+) ([\d.]+)/)!
    expect(Number(tx)).toBeGreaterThan(100)
    expect(Number(ty)).toBeLessThan(40)
  })

  it('has nothing to say about a degenerate line', () => {
    expect(exitCueOf([])).toBeUndefined()
    expect(exitCueOf([{ x: 1, y: 1 }])).toBeUndefined()
  })
})
