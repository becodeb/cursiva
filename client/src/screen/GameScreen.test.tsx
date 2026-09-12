// Deduction-view wiring tests for the session shell (design unit 7, spec:
// detective-mode "Deduction Screen", level-engine "Deduction View Reachable
// from nextView"). `levelFlow.test.ts` already covers `nextView`'s
// pre-existing `play`/`next`/`back`/`reset` cases end to end — this file adds
// ONLY the `deduce` surface this slice introduces, so the two files stay
// split by concern the same way `clues.test.ts`/`palette.test.ts` are split
// from each other.
//
// Node environment, no DOM. `nextView`, `allEarned` and `resolveNextAction`
// are all pure functions over plain values (design.md "Testing Strategy":
// "Unit (pure) | nextView with deduce; allEarned | Node, no DOM, existing
// GameScreen test pattern"), so every scenario below is asserted directly on
// them — the real `onNext` closure GameScreen builds runs inside a `useState`
// setter, and this repo's harness cannot observe a re-render after
// `renderToString` (the same constraint `LevelPlay.test.tsx` documents), so
// there is nothing to gain from trying to simulate the click itself.
//
// [case-registry-and-captions, Phase 6] `deduce` now carries a `caseId` (spec:
// detective-mode "Case Routing Across Multiple Cases") and `resolveNextAction`
// is per-case, driven by `caseOf` — every scenario below runs for BOTH the
// duck case (`duck-trail*`) and the hen case (`trail*`), so a regression that
// only breaks one case cannot hide behind the other. `DETECTIVE_TRAIL_IDS` is
// imported straight from `game/types` now — `GameScreen.tsx` dropped its
// re-export once `resolveNextAction` stopped hardcoding the hen's ids.
import { describe, expect, it } from 'vitest'
import { allEarned, initialView, nextView, resolveNextAction, type GameView } from './GameScreen'
import { EMPTY_RECORD, DETECTIVE_TRAIL_IDS, DUCK_TRAIL_IDS, type LevelRecord } from '../game/types'

const playing = (levelId: string): GameView => ({ view: 'play', levelId })
const deduceDuck: GameView = { view: 'deduce', caseId: 'duck' }
const deduceHen: GameView = { view: 'deduce', caseId: 'hen' }

/** All of `trailIds`' ids at `approvals: n`, or a custom per-id override. */
function recordsWith(
  trailIds: readonly string[],
  approvals: number,
  override: Readonly<Record<string, number>> = {},
): Record<string, LevelRecord> {
  const out: Record<string, LevelRecord> = {}
  for (const id of trailIds) {
    out[id] = { ...EMPTY_RECORD, approvals: override[id] ?? approvals }
  }
  return out
}

describe('nextView: deduce (level-engine spec "Deduction View Reachable from nextView")', () => {
  it('the deduce action reaches the deduction view for its own case, from any state', () => {
    expect(nextView(playing('trail4'), { type: 'deduce', caseId: 'duck' })).toEqual(deduceDuck)
    expect(nextView({ view: 'map', finished: false }, { type: 'deduce', caseId: 'hen' })).toEqual(
      deduceHen,
    )
  })

  it('back/reset from the deduction view returns to a plain map', () => {
    expect(nextView(deduceDuck, { type: 'back' })).toEqual({ view: 'map', finished: false })
    expect(nextView(deduceDuck, { type: 'reset' })).toEqual({ view: 'map', finished: false })
  })
})

describe('initialView: ?nivel=deduccion deep link', () => {
  it("opens the FIRST case's deduction view directly (duck, design decision 3)", () => {
    expect(initialView('?nivel=deduccion')).toEqual(deduceDuck)
  })
})

describe('allEarned (design.md "Decision: earned clues are derived from progress, not stored")', () => {
  it('true once every trail id has at least one approval', () => {
    expect(allEarned(DETECTIVE_TRAIL_IDS, recordsWith(DETECTIVE_TRAIL_IDS, 1))).toBe(true)
  })

  it('false when even one trail id has zero approvals', () => {
    expect(
      allEarned(DETECTIVE_TRAIL_IDS, recordsWith(DETECTIVE_TRAIL_IDS, 1, { trail4: 0 })),
    ).toBe(false)
  })

  it('false for an empty trail id list — nothing to have earned', () => {
    expect(allEarned([], recordsWith(DETECTIVE_TRAIL_IDS, 5))).toBe(false)
  })

  it('a record entirely absent from the map counts as zero approvals, not a crash', () => {
    expect(allEarned(DETECTIVE_TRAIL_IDS, { trail1: { ...EMPTY_RECORD, approvals: 1 } })).toBe(
      false,
    )
  })
})

describe.each([
  ['duck', DUCK_TRAIL_IDS, 'duck'],
  ['hen', DETECTIVE_TRAIL_IDS, 'hen'],
] as const)(
  'resolveNextAction — %s case (design.md "Decision: deduction is a third GameView branch")',
  (_label, trailIds, caseId) => {
    it(
      'scenario "Deduction view becomes reachable after the fourth clue": the whole case filed ' +
        'and its last trail just completed → resolves to deduce for THIS case, and composing it ' +
        'through nextView reaches that case\'s deduction view',
      () => {
        // "The last trail just completed" means its own record now also
        // carries an approval — the completion that triggers this very call
        // is what wrote it.
        const records = recordsWith(trailIds, 1)
        const lastTrail = trailIds[trailIds.length - 1]
        const action = resolveNextAction(lastTrail, records)
        expect(action).toEqual({ type: 'deduce', caseId })
        expect(nextView(playing(lastTrail), action)).toEqual({ view: 'deduce', caseId })
      },
    )

    it(
      'scenario "Deduction view stays unreachable with clues missing": fewer than all filed → ' +
        'never resolves to deduce, from ANY of this case\'s trails',
      () => {
        const lastTrail = trailIds[trailIds.length - 1]
        const records = recordsWith(trailIds, 1, { [lastTrail]: 0 })
        for (const id of trailIds) {
          const action = resolveNextAction(id, records)
          expect(action.type).not.toBe('deduce')
          expect(nextView(playing(id), action)).not.toEqual({ view: 'deduce', caseId })
        }
      },
    )

    it('all of the case earned but the finished level is NOT its last trail → still resolves to next, not deduce', () => {
      // Both conditions are required (design.md: "the finished level is the
      // last trail of its case AND that case's clues are all earned") — this
      // proves the "last trail" gate is load-bearing on its own, not implied
      // by allEarned.
      const records = recordsWith(trailIds, 1)
      const action = resolveNextAction(trailIds[0], records)
      expect(action.type).toBe('next')
    })
  },
)

describe('resolveNextAction — cross-case and non-detective levels', () => {
  it('an ordinary (non-detective) finished level id never resolves to deduce', () => {
    const action = resolveNextAction('f1-libre', recordsWith(DETECTIVE_TRAIL_IDS, 1))
    expect(action.type).toBe('next')
  })

  it("completing the duck's last trail never resolves to the HEN case, and vice versa", () => {
    const duckDone = resolveNextAction(
      DUCK_TRAIL_IDS[DUCK_TRAIL_IDS.length - 1],
      recordsWith(DUCK_TRAIL_IDS, 1),
    )
    expect(duckDone).toEqual({ type: 'deduce', caseId: 'duck' })
    const henDone = resolveNextAction(
      DETECTIVE_TRAIL_IDS[DETECTIVE_TRAIL_IDS.length - 1],
      recordsWith(DETECTIVE_TRAIL_IDS, 1),
    )
    expect(henDone).toEqual({ type: 'deduce', caseId: 'hen' })
  })
})
