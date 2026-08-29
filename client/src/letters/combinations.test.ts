// Letter-combinations focused tests (letter-combinations spec): seam
// continuity, global renumbering, guards, demo timeline, and the ordered-pair
// registry — plus the integration rail proving a continuous stroke along the
// combined `d` completes guidedFollowState/evaluateTrace across the seam
// (a's last checkpoint and c's renumbered first are co-located at the handoff:
// containment activates both in one sample — "no earlier than when expected
// reaches it").
import { describe, expect, it } from 'vitest'
import { referenceFlattenPath } from '../canvas/testUtils'
import { guidedFollowState } from '../modes/guidedTrace'
import { evaluateTrace } from '../modes/freeTrace'
import { buildCombination, buildOrderedPairs } from './combinations'
import { COMBO_REGISTRY } from './registry'
import { flattenPathD, loadSvgLetters, transformPathD } from './svgLetter'
import type { LetterConfig } from './types'

const svgLetters = loadSvgLetters()
const a = svgLetters.a
const c = svgLetters.c
const ac = buildCombination([a, c])
const dx = Math.round((a.anchors.exit.x - c.anchors.entry.x) * 100) / 100
const dy = Math.round((a.anchors.exit.y - c.anchors.entry.y) * 100) / 100
const round1 = (n: number): number => Math.round(n * 10) / 10
const round2 = (n: number): number => Math.round(n * 100) / 100

describe('buildCombination seam continuity', () => {
  it('translated `c` entry lands on `a` exit within 0.01 (seam = translation)', () => {
    // The concatenated `d` is d₀ + translated d₁; the first point of the SECOND
    // subpath is c's entry moved by (dx, dy) — must equal a's exit.
    const flat = flattenPathD(ac.pathDefinition.d)
    expect(flat.starts).toHaveLength(2) // exactly one seam, no connector
    const cStart = flat.points[flat.starts[1]]
    const seam = Math.hypot(cStart.x - a.anchors.exit.x, cStart.y - a.anchors.exit.y)
    expect(seam).toBeLessThanOrEqual(0.01)
  })

  it('the seam is the shared round2(exit₀ − entry₁) offset applied to every field', () => {
    const flat = flattenPathD(ac.pathDefinition.d)
    expect(flat.points[flat.starts[1]]).toEqual({
      x: round2(c.anchors.entry.x + dx),
      y: round2(c.anchors.entry.y + dy),
    })
    expect(transformPathD(c.pathDefinition.d, 1, 1, dx, dy)).toBe(
      ac.pathDefinition.d.slice(a.pathDefinition.d.length + 1),
    )
  })

  it('anchors span the combo: entry of the first member, translated exit of the last', () => {
    expect(ac.anchors.entry).toEqual(a.anchors.entry)
    expect(ac.anchors.exit).toEqual({
      x: round2(c.anchors.exit.x + dx),
      y: round2(c.anchors.exit.y + dy),
    })
    // The exit anchor sits on the real end of the combined stroke.
    const flat = flattenPathD(ac.pathDefinition.d)
    const end = flat.points[flat.points.length - 1]
    expect(Math.hypot(end.x - ac.anchors.exit.x, end.y - ac.anchors.exit.y)).toBeLessThanOrEqual(0.01)
  })
})

describe('buildCombination global renumbering', () => {
  it('renumbers a+c to exactly 1..N with no gaps or duplicates, names kept', () => {
    const expectedN = a.pathDefinition.checkpoints.length + c.pathDefinition.checkpoints.length
    const orders = ac.pathDefinition.checkpoints.map((cp) => cp.order)
    expect(orders).toEqual(Array.from({ length: expectedN }, (_, i) => i + 1))
    // Names preserved through the renumbering.
    expect(ac.pathDefinition.checkpoints[a.pathDefinition.checkpoints.length].name).toBe(
      c.pathDefinition.checkpoints[0].name,
    )
  })

  it('translates each member checkpoint and ideal tuple by the shared offset', () => {
    const firstCFirst = a.pathDefinition.checkpoints.length
    const renumberedC = ac.pathDefinition.checkpoints[firstCFirst]
    expect(renumberedC).toEqual({
      ...c.pathDefinition.checkpoints[0],
      x: round1(c.pathDefinition.checkpoints[0].x + dx),
      y: round1(c.pathDefinition.checkpoints[0].y + dy),
      order: firstCFirst + 1,
    })
    // Ideal concatenation: member clouds translated, in order.
    expect(ac.pathDefinition.ideal).toHaveLength(
      a.pathDefinition.ideal.length + c.pathDefinition.ideal.length,
    )
    expect(ac.pathDefinition.ideal[a.pathDefinition.ideal.length][0]).toBe(
      round1(c.pathDefinition.ideal[0][0] + dx),
    )
    expect(ac.pathDefinition.ideal[a.pathDefinition.ideal.length][1]).toBe(
      round1(c.pathDefinition.ideal[0][1] + dy),
    )
  })
})

describe('buildCombination guards', () => {
  it('refuses a multi-subpath member (more than one M in the stored `d`)', () => {
    const multi: LetterConfig = {
      ...a,
      pathDefinition: { ...a.pathDefinition, d: 'M 0 0 L 10 10 M 20 20 L 30 30' },
    }
    expect(() => buildCombination([multi, c])).toThrow(/más de un subpath/)
    expect(() => buildCombination([a, multi])).toThrow(/más de un subpath/)
  })

  it('refuses members with different baseline zones', () => {
    expect(() => buildCombination([a, svgLetters.b])).toThrow(/zonas de renglón distintas/)
  })

  it('refuses a combination that is not exactly two letters', () => {
    expect(() => buildCombination([a] as unknown as [LetterConfig, LetterConfig])).toThrow(
      /exactamente 2 letras/,
    )
    expect(() =>
      buildCombination([a, c, c] as unknown as [LetterConfig, LetterConfig]),
    ).toThrow(/exactamente 2 letras/)
  })
})

describe('buildCombination demo timeline', () => {
  it('builds one draw_path (1000, 2600n) plus slide_in (member 0) and fade_out at 1000+2600n+200', () => {
    const [slideIn, draw, fadeOut] = ac.animationTimeline
    expect(slideIn.type).toBe('slide_in')
    expect(slideIn.target).toBe('background_theme')
    expect(slideIn.duration).toBe(600)
    expect(draw).toMatchObject({ type: 'draw_path', delay: 1000, duration: 2600 * 2 })
    expect(fadeOut).toMatchObject({
      type: 'fade_out',
      delay: 1000 + 2600 * 2 + 200,
      duration: 600,
      properties: { opacity: 0.08 },
    })
    expect(ac.animationTimeline.filter((s) => s.type === 'draw_path')).toHaveLength(1)
  })

  it('exposes family enlazada, the first member theme/strokeWidth, and the concatenated character', () => {
    expect(ac.family).toBe('enlazada')
    expect(ac.theme).toBe(a.theme)
    expect(ac.pathDefinition.strokeWidth).toBe(a.pathDefinition.strokeWidth)
    expect(ac.baselineZone).toBe(a.baselineZone)
    expect(ac.id).toBe('combo_ac')
    expect(ac.character).toBe('ac')
  })
})

describe('COMBO_REGISTRY (ordered pairs from svg letters only)', () => {
  it('offers all 12 ordered pairs across a–f with reversed pairs distinct', () => {
    const keys = Object.keys(COMBO_REGISTRY)
    expect(keys).toHaveLength(12)
    expect(keys.sort()).toEqual(
      [
        'combo_ac', 'combo_ae', 'combo_bd', 'combo_bf', 'combo_ca', 'combo_ce',
        'combo_db', 'combo_df', 'combo_ea', 'combo_ec', 'combo_fb', 'combo_fd',
      ].sort(),
    )
    expect(COMBO_REGISTRY.combo_ac.character).toBe('ac')
    expect(COMBO_REGISTRY.combo_ca.character).toBe('ca')
    expect(COMBO_REGISTRY.combo_ac).not.toBe(COMBO_REGISTRY.combo_ca)
  })

  it('contains no mixed-zone pair and no violating (multi-subpath) pair', () => {
    const media = new Set(['a', 'c', 'e'])
    const alta = new Set(['b', 'd', 'f'])
    const offered = Object.values(COMBO_REGISTRY).map((cfg) => cfg.character)
    expect(offered.length).toBeGreaterThan(0)
    for (const chars of offered) {
      const [x, y] = chars.split('')
      expect(media.has(x) === media.has(y)).toBe(true)
      expect(alta.has(x) === alta.has(y)).toBe(true)
    }
  })

  it('buildOrderedPairs mirrors the registry on svg letters and skips zone mismatches', () => {
    const pairs = buildOrderedPairs(svgLetters)
    expect(pairs).toHaveLength(12)
    expect(pairs.map((cfg) => cfg.id).sort()).toEqual(Object.keys(COMBO_REGISTRY).sort())
  })
})

describe('seam handoff rail (integration)', () => {
  it('a continuous stroke along the combined `d` completes the guided rail and the free evaluation', () => {
    const stroke = referenceFlattenPath(ac.pathDefinition.d)
    const follow = guidedFollowState(stroke, ac.pathDefinition.checkpoints, ac.pathDefinition.ideal)
    expect(follow.activated).toEqual(
      ac.pathDefinition.checkpoints.map((cp) => cp.order),
    )
    expect(follow.wrongDirection).toBe(false)
    expect(follow.offPath).toBe(false)
    expect(follow.complete).toBe(true)

    const r = evaluateTrace(stroke, ac, 'touch')
    expect(r.orderPassed).toBe(true)
    expect(r.isContinuous).toBe(true)
    expect(r.wrongDirection).toBe(false)
    expect(r.approved).toBe(true)
  })
})