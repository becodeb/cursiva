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
import { describe, expect, it } from 'vitest'
import {
  allEarned,
  DETECTIVE_TRAIL_IDS,
  initialView,
  nextView,
  resolveNextAction,
  type GameView,
} from './GameScreen'
import { EMPTY_RECORD, type LevelRecord } from '../game/types'

const playing = (levelId: string): GameView => ({ view: 'play', levelId })
const deduce: GameView = { view: 'deduce' }

/** All four trail ids at `approvals: n`, or a custom per-id override. */
function recordsWith(
  approvals: number,
  override: Readonly<Record<string, number>> = {},
): Record<string, LevelRecord> {
  const out: Record<string, LevelRecord> = {}
  for (const id of DETECTIVE_TRAIL_IDS) {
    out[id] = { ...EMPTY_RECORD, approvals: override[id] ?? approvals }
  }
  return out
}

describe('nextView: deduce (level-engine spec "Deduction View Reachable from nextView")', () => {
  it('the deduce action reaches the deduction view from any state', () => {
    expect(nextView(playing('trail4'), { type: 'deduce' })).toEqual(deduce)
    expect(nextView({ view: 'map', finished: false }, { type: 'deduce' })).toEqual(deduce)
  })

  it('back/reset from the deduction view returns to a plain map', () => {
    expect(nextView(deduce, { type: 'back' })).toEqual({ view: 'map', finished: false })
    expect(nextView(deduce, { type: 'reset' })).toEqual({ view: 'map', finished: false })
  })
})

describe('initialView: ?nivel=deduccion deep link', () => {
  it('opens the deduction view directly', () => {
    expect(initialView('?nivel=deduccion')).toEqual(deduce)
  })
})

describe('allEarned (design.md "Decision: earned clues are derived from progress, not stored")', () => {
  it('true once every trail id has at least one approval', () => {
    expect(allEarned(DETECTIVE_TRAIL_IDS, recordsWith(1))).toBe(true)
  })

  it('false when even one trail id has zero approvals', () => {
    expect(allEarned(DETECTIVE_TRAIL_IDS, recordsWith(1, { trail4: 0 }))).toBe(false)
  })

  it('false for an empty trail id list — nothing to have earned', () => {
    expect(allEarned([], recordsWith(5))).toBe(false)
  })

  it('a record entirely absent from the map counts as zero approvals, not a crash', () => {
    expect(allEarned(DETECTIVE_TRAIL_IDS, { trail1: { ...EMPTY_RECORD, approvals: 1 } })).toBe(
      false,
    )
  })
})

describe('resolveNextAction (design.md "Decision: deduction is a third GameView branch")', () => {
  it(
    'scenario "Deduction view becomes reachable after the fourth clue": three of four filed ' +
      "and the fourth trail just completed → resolves to deduce, and composing it through " +
      'nextView reaches the deduction view',
    () => {
      // "The fourth trail just completed" means its own record now also
      // carries an approval — the completion that triggers this very call
      // is what wrote it.
      const records = recordsWith(1)
      const action = resolveNextAction('trail4', records)
      expect(action).toEqual({ type: 'deduce' })
      expect(nextView(playing('trail4'), action)).toEqual(deduce)
    },
  )

  it(
    'scenario "Deduction view stays unreachable with clues missing": fewer than four filed → ' +
      'never resolves to deduce, from ANY trail\'s completion',
    () => {
      const records = recordsWith(1, { trail4: 0 })
      for (const id of DETECTIVE_TRAIL_IDS) {
        const action = resolveNextAction(id, records)
        expect(action.type).not.toBe('deduce')
        expect(nextView(playing(id), action)).not.toEqual(deduce)
      }
    },
  )

  it('all four earned but the finished level is NOT the last trail → still resolves to next, not deduce', () => {
    // Both conditions are required (design.md: "the finished level is the
    // last trail AND all four clues are earned") — this proves the "last
    // trail" gate is load-bearing on its own, not implied by allEarned.
    const records = recordsWith(1)
    const action = resolveNextAction('trail1', records)
    expect(action.type).toBe('next')
  })

  it('an ordinary (non-detective) finished level id never resolves to deduce', () => {
    const action = resolveNextAction('f1-libre', recordsWith(1))
    expect(action.type).toBe('next')
  })
})
