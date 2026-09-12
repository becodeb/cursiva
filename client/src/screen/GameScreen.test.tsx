// Deduction-view and exit-route wiring tests for the session shell (design
// unit 7, spec: detective-mode "Deduction Screen", level-engine "Deduction
// View Reachable from nextView"). `levelFlow.test.ts` already covers
// `nextView`'s pre-existing `play`/`next`/`back`/`reset` cases end to end —
// this file adds ONLY the `deduce` surface and `resolveNextAction`, so the
// two files stay split by concern the same way `clues.test.ts`/
// `palette.test.ts` are split from each other.
//
// Node environment, no DOM. `nextView`, `allEarned` and `resolveNextAction`
// are all pure functions over plain values, so every scenario below is
// asserted directly on them — the real `onNext` closure GameScreen builds
// runs inside a `useState` setter, and this repo's harness cannot observe a
// re-render after `renderToString` (the same constraint `LevelPlay.test.tsx`
// documents), so there is nothing to gain from trying to simulate the click
// itself.
//
// [zoo-map-home] `resolveNextAction` no longer routes to `deduce` at all —
// the auto-route is retired (proposal D2, design.md §6). It is now
// SECTOR-aware, not case-aware: a finished level owned by ANY zoo sector
// exits the shell, and a level no sector has adopted (today the hen's
// `trail1..4`, wired to no sector) keeps today's `next` behaviour unchanged.
// The `nextView` reducer's OWN `deduce` branch is untouched below — it is
// still reachable directly (the deep-link path, `initialView`), just no
// longer through `resolveNextAction`.
import { describe, expect, it, vi } from 'vitest'
import { renderToString } from 'react-dom/server'

// `AdventureIntro` is replaced with a prop-capturing stub (the same SSR-probe
// convention `LevelPlay.test.tsx` uses for `TraceCanvas`): this file tests
// GameScreen's OWN routing, and capturing the real `onStart` closure lets the
// wiring test below invoke it directly, with no DOM. `vi.mock` calls are
// hoisted above every import by vitest's transform.
const adventureIntroProbe: { current: Record<string, unknown> | null } = { current: null }
vi.mock('./AdventureIntro', () => ({
  default: (props: Record<string, unknown>) => {
    adventureIntroProbe.current = props
    return null
  },
}))

import GameScreen, {
  allEarned,
  initialView,
  nextView,
  resolveEnterAction,
  resolveNextAction,
  type GameView,
} from './GameScreen'
import { nextLevelId } from '../levels/catalog'
import { EMPTY_RECORD, DETECTIVE_TRAIL_IDS, DUCK_TRAIL_IDS, type LevelRecord } from '../game/types'
import { ADVENTURES } from '../zoo/adventures'

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

describe('initialView: ?nivel=intro-<levelId> is a dev-only capture surface (duck-undulations-and-sector-backdrop)', () => {
  it('resolves the narrative entry only when dev is true', () => {
    expect(initialView('?nivel=intro-duck-trail1', true)).toEqual({
      view: 'intro',
      levelId: 'duck-trail1',
    })
  })

  it('falls through to null when dev is false, including the default', () => {
    expect(initialView('?nivel=intro-duck-trail1', false)).toBeNull()
    expect(initialView('?nivel=intro-duck-trail1')).toBeNull()
  })

  it('falls through to null for a level with no narrative entry, even in dev mode', () => {
    expect(initialView('?nivel=intro-duck-trail2', true)).toBeNull()
    expect(initialView('?nivel=intro-trail1', true)).toBeNull()
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

// [zoo-map-home] The old deduce-route cases above (`describe.each`, per
// case) are converted below into exit-route cases (design.md §6, tasks.md
// Phase 3): a zoo sector owns EVERY one of the estanque's eight adventure
// ids, so finishing any one of them exits — regardless of position, unlike
// the retired "last trail of the case" rule. The hen's `trail1..4` are wired
// to no sector at all, so they keep today's `next` behaviour forever.
describe('resolveNextAction (zoo-map design.md §6: "finishing ANY sector adventure returns to the map")', () => {
  it('every id a zoo sector owns exits the shell, regardless of position within the sector', () => {
    for (const id of DUCK_TRAIL_IDS) {
      expect(resolveNextAction(id, {})).toEqual({ type: 'exit' })
    }
    for (const id of ['f2-guirnalda', 'f2-agua2', 'f2-agua3', 'f2-agua4']) {
      expect(resolveNextAction(id, {})).toEqual({ type: 'exit' })
    }
  })

  it('duck-trail4 exits — never routes to deduce (D2: the auto-route is retired)', () => {
    const action = resolveNextAction('duck-trail4', recordsWith(DUCK_TRAIL_IDS, 1))
    expect(action).toEqual({ type: 'exit' })
    expect(action.type).not.toBe('deduce')
  })

  it('composing an exit action through nextView is a type error — exit is deliberately outside GameAction', () => {
    // @ts-expect-error — `ExitAction` is not a `GameAction`; the whole point
    // of keeping `exit` OUT of that union (design.md §6) is that `nextView`
    // cannot accept it and the one call site (`GameScreen`'s `onNext`) MUST
    // discriminate before ever calling `dispatch`.
    nextView({ view: 'map', finished: false }, { type: 'exit' })
  })

  it("a hen trail — no sector owns it — keeps today's next behaviour, never exits", () => {
    for (const id of DETECTIVE_TRAIL_IDS) {
      const action = resolveNextAction(id, recordsWith(DETECTIVE_TRAIL_IDS, 1))
      expect(action).toEqual({ type: 'next', levelId: nextLevelId(id) })
    }
  })

  it('an ordinary non-sector, non-detective level keeps today\'s next behaviour unchanged', () => {
    const action = resolveNextAction('f1-libre', {})
    expect(action).toEqual({ type: 'next', levelId: nextLevelId('f1-libre') })
  })
})

describe('resolveEnterAction (main-screen spec "resolveEnterAction Chooses Between Play and the Narrative Entry")', () => {
  it('always resolves duck-trail1 to the narrative entry, whatever records says', () => {
    for (const records of [{}, recordsWith(DUCK_TRAIL_IDS, 1)]) {
      expect(resolveEnterAction('duck-trail1', records)).toEqual({
        view: 'intro',
        levelId: 'duck-trail1',
      })
    }
  })

  it('resolves every other duck level, the hen trails and an unknown id straight to play, unchanged', () => {
    for (const id of ['duck-trail2', 'duck-trail3', 'duck-trail4', 'trail1', 'f3-a', 'not-a-real-id']) {
      expect(resolveEnterAction(id, {})).toEqual({ view: 'play', levelId: id })
    }
  })
})

describe('GameScreen intro view (duck-undulations-and-sector-backdrop design.md §4)', () => {
  it("mounts AdventureIntro for the 'intro' view, and its onStart dispatches into play", () => {
    renderToString(
      <GameScreen initial={{ view: 'intro', levelId: 'duck-trail1' }} onExit={() => {}} />,
    )
    expect(adventureIntroProbe.current, 'AdventureIntro never mounted').toBeTruthy()
    expect(adventureIntroProbe.current?.adventure).toBe(ADVENTURES[0])
    const onStart = adventureIntroProbe.current?.onStart as (() => void) | undefined
    expect(typeof onStart).toBe('function')
    // Invoking the real closure proves it is wired to a `dispatch` call that
    // does not throw — the same limit `LevelPlay.test.tsx`'s own header
    // documents: a state update after a completed `renderToString` call is a
    // no-op on the server, so a re-render cannot be observed here.
    expect(onStart).not.toThrow()
  })
})
