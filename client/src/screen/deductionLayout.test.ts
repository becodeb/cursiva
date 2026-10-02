// T46: the deduction screen's geometry, proven in node for every shipped
// case at every required viewport — nothing overlaps, nothing leaves the
// screen, Pulpito and his bubble never cover the evidence or the cards, the
// evidence and the choices are BIG, and a comparison reads "this = which?".
import { describe, expect, it } from 'vitest'
import { DETECTIVE_CASES, nightCaseOptions, resolveCase } from '../detective/cases'
import { DEDUCTION_INSTRUCTION, deductionPulpitoZone, deductionScreenLayout } from './Deduction'
import {
  deductionFramePx,
  deductionLayout,
  deductionMetrics,
  layoutProblems,
  promptWidthFor,
  type DeductionLayout,
  type Rect,
  type Viewport,
} from './deductionLayout'

/** The task's three required viewports, plus the larger tablet the bubble
 *  sweep also covers and two smaller phones in landscape. */
const VIEWPORTS: readonly Viewport[] = [
  { w: 1024, h: 768 },
  { w: 768, h: 1024 },
  { w: 844, h: 390 },
  { w: 1180, h: 820 },
  { w: 812, h: 375 },
  { w: 740, h: 360 },
]

/** Every case as the screen can actually receive it: the static registry,
 *  plus the night/monkeys lineups resolved with nothing and everything
 *  rescued (their options/hints change with progress). */
const CASES = [
  ...DETECTIVE_CASES,
  ...DETECTIVE_CASES.filter((k) => k.id === 'night' || k.id === 'monkeys').flatMap((k) => [
    resolveCase(k, () => false),
    resolveCase(k, () => true),
  ]),
]

const bottom = (r: Rect) => r.y + r.h
const right = (r: Rect) => r.x + r.w

describe('deductionFramePx (Pulpito\'s corner frame)', () => {
  it('keeps the shipped landscape sizes: 48% of the height, never under 280px', () => {
    expect(deductionFramePx({ w: 1024, h: 768 })).toBeCloseTo(368.64)
    expect(deductionFramePx({ w: 844, h: 390 })).toBe(280)
  })

  it('caps a portrait tablet at half the width, so the evidence and the cards get the room', () => {
    expect(deductionFramePx({ w: 768, h: 1024 })).toBe(384)
  })
})

describe('deductionLayout — every case, every viewport', () => {
  for (const vp of VIEWPORTS) {
    for (const kase of CASES) {
      const label = `${kase.id} [${kase.options.join(',')}] at ${vp.w}x${vp.h}`
      const layout = deductionScreenLayout(kase, vp)
      const zone = deductionPulpitoZone(kase, vp)

      it(`${label}: nothing overlaps, nothing leaves the screen, Pulpito covers nothing`, () => {
        expect(layoutProblems(layout, vp, zone)).toEqual([])
        expect(layout.cards).toHaveLength(kase.options.length)
      })

      it(`${label}: the clues and the choices are BIG (the T21 chips were 40-52px)`, () => {
        // The task's own viewports (and the bubble sweep's 1180x820) with a
        // journey-sized lineup (three options) get the full floor; the
        // legacy four-option hen case and the two smaller phones a lower one.
        const required = VIEWPORTS.indexOf(vp) < 4
        const fraction = required && kase.options.length <= 3 ? 0.2 : 0.16
        const floor = fraction * Math.min(vp.w, vp.h)
        expect(layout.clueSize, 'clue photo').toBeGreaterThanOrEqual(floor)
        expect(layout.picture, 'option picture').toBeGreaterThanOrEqual(floor)
        expect(layout.clueSize).toBeGreaterThanOrEqual(required ? 72 : 56)
        // Every card keeps the 64px tap floor with room to spare.
        for (const card of layout.cards) expect(Math.min(card.w, card.h)).toBeGreaterThanOrEqual(required ? 96 : 80)
      })

      it(`${label}: the longest caption and the prompt fit on one line`, () => {
        // Uppercase Nunito ExtraBold, ~0.75em per letter, 7 letters for
        // TORTUGA/GALLINA (the longest option names).
        expect(7 * 0.75 * layout.captionFont).toBeLessThanOrEqual(layout.picture)
        const cardsSpan = right(layout.cards[layout.cards.length - 1]) - layout.cards[0].x
        const chars = DEDUCTION_INSTRUCTION[kase.form].label.length
        expect(promptWidthFor(chars, layout.promptFont)).toBeLessThanOrEqual(Math.max(cardsSpan, layout.prompt.w) + 0.5)
        expect(layout.promptFont).toBeGreaterThanOrEqual(14)
      })

      if (kase.form === 'comparison') {
        it(`${label}: the sample sits next to its candidates with an "=" between, at their size`, () => {
          expect(layout.relation).not.toBeNull()
          const rel = layout.relation!
          const cardsBox = layout.cards.reduce((a, c) => ({
            x: Math.min(a.x, c.x),
            y: Math.min(a.y, c.y),
            w: Math.max(right(a), right(c)) - Math.min(a.x, c.x),
            h: Math.max(bottom(a), bottom(c)) - Math.min(a.y, c.y),
          }))
          if (layout.arrangement === 'side') {
            expect(rel.x).toBeGreaterThanOrEqual(right(layout.board))
            expect(right(rel)).toBeLessThanOrEqual(cardsBox.x)
          } else {
            expect(rel.y).toBeGreaterThanOrEqual(bottom(layout.board))
            expect(bottom(rel)).toBeLessThanOrEqual(layout.prompt.y)
          }
          // The sample's art (80% of its photo) within 25% of a candidate's.
          const sampleArt = layout.clueSize * 0.8
          expect(Math.abs(sampleArt - layout.picture) / layout.picture).toBeLessThanOrEqual(0.25)
        })
      } else {
        it(`${label}: evidence first — the board sits above the choices, no "=" badge`, () => {
          expect(layout.relation).toBeNull()
          if (layout.arrangement === 'stacked') {
            expect(bottom(layout.board)).toBeLessThanOrEqual(layout.prompt.y)
          } else {
            expect(right(layout.board)).toBeLessThanOrEqual(layout.cards[0].x)
          }
        })
      }
    }
  }

  it('lays a three-option lineup out in ONE row on every landscape viewport (pick one of these)', () => {
    for (const vp of VIEWPORTS.filter((v) => v.w > v.h)) {
      for (const kase of CASES.filter((k) => k.options.length <= 3)) {
        const { cards } = deductionScreenLayout(kase, vp)
        expect(new Set(cards.map((c) => c.y)).size, `${kase.id} at ${vp.w}x${vp.h}`).toBe(1)
      }
    }
  })

  it('stacks the evidence above the choices for a silhouette/sign case on the tablets', () => {
    for (const vp of [VIEWPORTS[0], VIEWPORTS[1]]) {
      const duck = deductionScreenLayout(DETECTIVE_CASES[0], vp)
      expect(duck.arrangement, `${vp.w}x${vp.h}`).toBe('stacked')
    }
  })

  it('every night lineup the progress can resolve gets a valid layout', () => {
    const night = DETECTIVE_CASES.find((k) => k.id === 'night')!
    const kase = { ...night, options: nightCaseOptions((a) => a === 'pato') }
    for (const vp of VIEWPORTS) {
      expect(layoutProblems(deductionScreenLayout(kase, vp), vp, deductionPulpitoZone(kase, vp))).toEqual([])
    }
  })
})

describe('layoutProblems (the checker can fail)', () => {
  const vp = { w: 1024, h: 768 }
  const zone: Rect = { x: 0, y: 380, w: 300, h: 360 }
  const base: DeductionLayout = deductionLayout({
    viewport: vp,
    clueCount: 4,
    optionCount: 3,
    form: 'new-silhouettes',
    pulpito: zone,
    promptChars: 14,
  })

  it('accepts the real layout', () => {
    expect(layoutProblems(base, vp, zone)).toEqual([])
  })

  it('names a card moved into Pulpito', () => {
    const cards = [{ ...base.cards[0], x: 10, y: 400 }, ...base.cards.slice(1)]
    expect(layoutProblems({ ...base, cards }, vp, zone)).toContain("card 0 enters Pulpito's zone")
  })

  it('names two cards on top of each other, and a card off screen', () => {
    const cards = [base.cards[0], base.cards[0], { ...base.cards[2], x: vp.w - 10 }]
    const problems = layoutProblems({ ...base, cards }, vp, zone)
    expect(problems).toContain('card 0 overlaps card 1')
    expect(problems).toContain('card 2 leaves the screen')
  })

  it('names a clue outside its board and a part in the top button band', () => {
    const clues = [{ ...base.clues[0], y: base.board.y - 200 }, ...base.clues.slice(1)]
    const problems = layoutProblems({ ...base, clues, prompt: { ...base.prompt, y: 4 } }, vp, zone)
    expect(problems).toContain('clue 0 leaves the board')
    expect(problems).toContain('prompt enters the top button band')
  })

  it('compact metrics apply on a short landscape phone only', () => {
    expect(deductionMetrics({ w: 844, h: 390 }).compact).toBe(true)
    expect(deductionMetrics({ w: 1024, h: 768 }).compact).toBe(false)
  })
})
