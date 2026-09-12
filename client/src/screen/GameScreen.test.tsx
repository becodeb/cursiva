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
import GameScreen, { allEarned, initialView, nextView, resolveNextAction, type GameView } from './GameScreen'
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

  it('reset from the deduction view returns to a plain map, for either case', () => {
    // [case-registry-and-captions, Phase 7] `nextView`'s `back` branch stays
    // reachable (design.md §8: "the whole point of the deliverable... but
    // still reached by {type:'reset'}"), but the UI no longer dispatches
    // `{type:'back'}` to leave a mode — see the required-`onExit`-prop proof
    // below. Only `{type:'reset'}` — the map's own "Reiniciar progreso"
    // control — is asserted here now.
    expect(nextView(deduceDuck, { type: 'reset' })).toEqual({ view: 'map', finished: false })
    expect(nextView(deduceHen, { type: 'reset' })).toEqual({ view: 'map', finished: false })
  })

  // Compile-time proof (design.md §8: "onExit, a prop, not a GameAction" —
  // "required, like `label`, so no caller can silently keep landing on the
  // map"). Same precedent as `CaptionedArt.test.tsx`'s `label` proof: this
  // repo's node/no-DOM harness cannot simulate a click on `LevelPlay`'s ‹
  // Volver or `Deduction`'s back control to observe that `GameScreen` wires
  // them to the `onExit` prop and never to `dispatch({type:'back'})` — a
  // click needs a live DOM this harness does not have. What IS provable, and
  // provable only by `npm run build`'s `tsc --noEmit` (never by this test's
  // own vitest run — see the CaptionedArt precedent's own comment), is that
  // NO caller can mount `GameScreen` without supplying `onExit` at all, which
  // is the structural guarantee design.md asks for: dispatch can never be the
  // silent fallback because there is no path that compiles without a real
  // exit destination.
  it('documents the onExit-omission compile error; the real proof is npm run build, not this test run', () => {
    // @ts-expect-error — `onExit` is required; a `GameScreen` with nowhere to
    // exit to would silently keep landing on the level map (design.md §8). If
    // this line ever stops erroring, the invariant is gone, and only
    // `npm run build` — never `npm test` — notices.
    const proof = <GameScreen initial={deduceDuck} />
    expect(proof).toBeTruthy()
  })
})

describe('initialView: ?nivel=deduccion deep link', () => {
  it("opens the FIRST case's deduction view directly (duck, design decision 3)", () => {
    expect(initialView('?nivel=deduccion')).toEqual(deduceDuck)
  })

  it('?nivel=deduccion-<caseId> opens that specific case', () => {
    expect(initialView('?nivel=deduccion-hen')).toEqual(deduceHen)
    expect(initialView('?nivel=deduccion-duck')).toEqual(deduceDuck)
  })

  it('an unknown case id in ?nivel=deduccion-<caseId> falls through to null, never a crash', () => {
    expect(initialView('?nivel=deduccion-raccoon')).toBeNull()
  })
})

describe('initialView: ?nivel=mapa is a dev-only surface (design.md §8, proposal D3)', () => {
  it('resolves the map only when dev is true', () => {
    expect(initialView('?nivel=mapa', true)).toEqual({ view: 'map', finished: false })
  })

  it('falls through to null (the office) when dev is false, including the default', () => {
    expect(initialView('?nivel=mapa', false)).toBeNull()
    expect(initialView('?nivel=mapa')).toBeNull()
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
