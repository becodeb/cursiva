// caseState — home/caseState.ts. Node-only, no DOM.
//
// [case-registry-and-captions, Phase 6] Rewritten for per-case routing (spec:
// detective-mode "Case Routing Across Multiple Cases"). `nextCaseStep`,
// `railSlots` and `lampOn` all used to hardcode the hen's four trails as THE
// case; they now take/derive the ACTIVE `DetectiveCase` from the registry,
// duck first.
import { describe, expect, it } from 'vitest'
import {
  EMPTY_RECORD,
  APPROVALS_TO_UNLOCK,
  DETECTIVE_TRAIL_IDS,
  DUCK_TRAIL_IDS,
  type LevelRecord,
} from '../game/types'
import { migrateDuckCase, DUCK_PREDECESSOR_ID } from '../game/migrateDuckCase'
import { DETECTIVE_CASES, caseSolvedId } from '../detective/cases'
import { activeCase, isFiled, lampOn, nextCaseStep, railSlots, type Records } from './caseState'

const DUCK = DETECTIVE_CASES[0]
const HEN = DETECTIVE_CASES[1]

/** Records where exactly the listed trails have been approved once. */
function filed(...ids: readonly string[]): Records {
  const out: Record<string, LevelRecord> = {}
  for (const id of ids) out[id] = { ...EMPTY_RECORD, approvals: 1 }
  return out
}

/** A case's own deduction, marked solved (design.md §5's literal writer shape). */
function solved(caseId: string): Records {
  return { [caseSolvedId(caseId)]: { ...EMPTY_RECORD, approvals: 1 } }
}

describe('activeCase (design.md §1: the first case not yet resolved, duck before hen)', () => {
  it('a child who has never played is in the duck case', () => {
    expect(activeCase({}).id).toBe('duck')
  })

  it('an open duck deduction is not skipped — all four duck trails filed keeps the duck case active', () => {
    const records = filed(...DUCK_TRAIL_IDS)
    expect(activeCase(records).id).toBe('duck')
    expect(nextCaseStep(records)).toEqual({ kind: 'deduce', caseId: 'duck' })
  })

  it('a resolved duck case advances to the hen case, at its first trail', () => {
    const records = { ...filed(...DUCK_TRAIL_IDS), ...solved('duck') }
    expect(activeCase(records).id).toBe('hen')
    expect(nextCaseStep(records)).toEqual({ kind: 'trail', levelId: DETECTIVE_TRAIL_IDS[0] })
  })

  it('every case resolved falls back to the LAST case, already closed', () => {
    const records = {
      ...filed(...DUCK_TRAIL_IDS, ...DETECTIVE_TRAIL_IDS),
      ...solved('duck'),
      ...solved('hen'),
    }
    expect(activeCase(records).id).toBe('hen')
    expect(nextCaseStep(records)).toEqual({ kind: 'deduce', caseId: 'hen' })
  })
})

describe('nextCaseStep (docs/10 §4: the glass opens the next unfinished trail of the ACTIVE case)', () => {
  it('resumes at the first trail whose clue is not filed, not at the last played one', () => {
    expect(nextCaseStep(filed(DUCK_TRAIL_IDS[0], DUCK_TRAIL_IDS[1]))).toEqual({
      kind: 'trail',
      levelId: DUCK_TRAIL_IDS[2],
    })
  })

  it('a GAP is filled before moving on — the case needs all of its clues, in any order', () => {
    // trail2 was skipped (test mode, a deep link). The office sends the child
    // back for the missing clue rather than forward past it.
    expect(
      nextCaseStep(filed(DUCK_TRAIL_IDS[0], DUCK_TRAIL_IDS[2], DUCK_TRAIL_IDS[3])),
    ).toEqual({ kind: 'trail', levelId: DUCK_TRAIL_IDS[1] })
  })

  it('an attempt that was never approved is not a filed clue', () => {
    const tried: Records = { [DUCK_TRAIL_IDS[0]]: { ...EMPTY_RECORD, attempts: 9, bestAccuracy: 80 } }
    expect(isFiled(tried, DUCK_TRAIL_IDS[0])).toBe(false)
    expect(nextCaseStep(tried)).toEqual({ kind: 'trail', levelId: DUCK_TRAIL_IDS[0] })
  })
})

describe('railSlots (the rail carries the REAL state of a GIVEN case)', () => {
  it("is one slot per trail of the case, in play order, carrying each trail's catalog clue kind", () => {
    expect(railSlots({}, DUCK)).toEqual([
      { kind: 'webfoot', filed: false },
      { kind: 'breadcrumb', filed: false },
      { kind: 'bubble', filed: false },
      { kind: 'feather', filed: false },
    ])
    expect(railSlots({}, HEN)).toEqual([
      { kind: 'droplet', filed: false },
      { kind: 'corn', filed: false },
      { kind: 'footprint', filed: false },
      { kind: 'feather', filed: false },
    ])
  })

  it('marks exactly the filed trails, leaving the rest drained', () => {
    expect(railSlots(filed(DUCK_TRAIL_IDS[0], DUCK_TRAIL_IDS[2]), DUCK).map((s) => s.filed)).toEqual([
      true,
      false,
      true,
      false,
    ])
  })
})

describe('lampOn (the office light means the GIVEN case is ready to solve)', () => {
  it('stays off while any clue of the case is missing', () => {
    expect(lampOn({}, DUCK)).toBe(false)
    expect(lampOn(filed(DUCK_TRAIL_IDS[0], DUCK_TRAIL_IDS[1], DUCK_TRAIL_IDS[2]), DUCK)).toBe(false)
  })

  it('lights only when every one of the case\'s own clues is filed', () => {
    expect(lampOn(filed(...DUCK_TRAIL_IDS), DUCK)).toBe(true)
  })

  it('does not light off another case\'s trails — the two cases never cross-light each other', () => {
    expect(lampOn(filed(...DETECTIVE_TRAIL_IDS), DUCK)).toBe(false)
  })

  it("agrees with nextCaseStep: the lamp is lit exactly when the glass opens THIS case's deduction", () => {
    const cases: Records[] = [{}, filed(DUCK_TRAIL_IDS[0]), filed(...DUCK_TRAIL_IDS)]
    for (const records of cases) {
      expect(lampOn(records, DUCK)).toBe(nextCaseStep(records).kind === 'deduce')
    }
  })
})

describe('migrateDuckCase integration (orchestrator ruling 4, 2026-09-12)', () => {
  it('a migrated duck-only record set resumes inside the HEN case, never the duck deduction', () => {
    const seeded = migrateDuckCase({
      [DUCK_PREDECESSOR_ID]: { ...EMPTY_RECORD, approvals: APPROVALS_TO_UNLOCK },
    })
    expect(activeCase(seeded).id).toBe('hen')
    expect(nextCaseStep(seeded)).toEqual({ kind: 'trail', levelId: DETECTIVE_TRAIL_IDS[0] })
  })
})
