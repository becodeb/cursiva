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

// Same SSR-probe convention as `AdventureIntro` above, for the `'close'`
// view's own mount test (design.md §6.3, main-screen spec).
const adventureClosingProbe: { current: Record<string, unknown> | null } = { current: null }
vi.mock('./AdventureClosing', () => ({
  default: (props: Record<string, unknown>) => {
    adventureClosingProbe.current = props
    return null
  },
}))

import GameScreen, {
  advanceClosing,
  allEarned,
  initialView,
  nextView,
  resolveCloseAction,
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

// Added during the Phase 7 capture pass. The `'close'` view is otherwise
// reachable only by finishing an adventure's last level, so `scripts/shot.sh`
// -- one URL, no clicks, no seeded localStorage -- could not photograph the
// transformation screen at all. Dev-gated exactly like `intro-`, and only for
// a level that really closes an adventure, so a typo stays null rather than
// rendering a closing screen for a level that has none.
describe('initialView: ?nivel=cierre-<levelId> is a dev-only capture surface (reveal-grid-entrance-and-night)', () => {
  it('resolves the closing screen only when dev is true', () => {
    expect(initialView('?nivel=cierre-sand4', true)).toEqual({
      view: 'close',
      levelId: 'sand4',
    })
  })

  it('falls through to null when dev is false, including the default', () => {
    expect(initialView('?nivel=cierre-sand4', false)).toBeNull()
    expect(initialView('?nivel=cierre-sand4')).toBeNull()
  })

  it('falls through to null for a level that closes no adventure, even in dev mode', () => {
    expect(initialView('?nivel=cierre-sand1', true)).toBeNull()
    expect(initialView('?nivel=cierre-trail1', true)).toBeNull()
  })

  // [add-caretaker-prologue] An optional `:<n>` suffix reaches a beat past
  // the first — `sendero`'s two-beat closing is otherwise unreachable by a
  // single-URL capture (design.md D3).
  it('an optional :<n> suffix resolves to that beat', () => {
    expect(initialView('?nivel=cierre-sand4:1', true)).toEqual({
      view: 'close',
      levelId: 'sand4',
      beat: 1,
    })
    expect(initialView('?nivel=cierre-sand4:0', true)).toEqual({
      view: 'close',
      levelId: 'sand4',
      beat: 0,
    })
  })

  it('a malformed :<n> suffix falls through to null, never a crash', () => {
    expect(initialView('?nivel=cierre-sand4:abc', true)).toBeNull()
    expect(initialView('?nivel=cierre-sand4:-1', true)).toBeNull()
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

  // Row C widens the requirement's asserted scope to every registered
  // adventure — `resolveEnterAction` needed no code change (it already
  // calls `introLevel`, which is adventure-generic); this closes the
  // coverage gap the stale spec prose left.
  it('always resolves sheep-hill1 and llama-peak1 to the narrative entry, unconditional on records', () => {
    for (const records of [{}, recordsWith(DUCK_TRAIL_IDS, 1)]) {
      expect(resolveEnterAction('sheep-hill1', records)).toEqual({
        view: 'intro',
        levelId: 'sheep-hill1',
      })
      expect(resolveEnterAction('llama-peak1', records)).toEqual({
        view: 'intro',
        levelId: 'llama-peak1',
      })
    }
  })

  it('resolves every other duck level, the hen trails and an unknown id straight to play, unchanged', () => {
    for (const id of ['duck-trail2', 'duck-trail3', 'duck-trail4', 'trail1', 'f3-a', 'not-a-real-id']) {
      expect(resolveEnterAction(id, {})).toEqual({ view: 'play', levelId: id })
    }
  })

  it('resolves every other sheep/llama level straight to play', () => {
    for (const id of ['sheep-hill2', 'sheep-hill3', 'sheep-hill4', 'llama-peak2', 'llama-peak3', 'llama-peak4']) {
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

// resolveCloseAction (reveal-grid-entrance-and-night, design.md §6.3,
// main-screen spec "close GameView Variant and resolveCloseAction").
describe('resolveCloseAction', () => {
  // (Previously: only `sand4` resolved to `'close'`, and `glass4` was
  // asserted BY NAME not to — the entrance's own only closing beat lived on
  // the old `sand` row. `glass4` is now `monos`'s own last level and `monos`
  // now declares a `closingBeat` (add-caretaker-prologue, main-screen delta
  // "close GameView Variant and resolveCloseAction"), so that prior
  // negative-case scenario is RETIRED, not merely widened: `glass4` MUST
  // resolve to `'close'` after this change.)
  it('finishing each entrance adventure\'s last level (glass2, sand2, glass4, sand4) resolves to the close view', () => {
    for (const id of ['glass2', 'sand2', 'glass4', 'sand4']) {
      expect(resolveCloseAction(id, {}), id).toEqual({ type: 'close', levelId: id })
    }
  })

  it('finishing a mid-adventure entrance level does not resolve to the close view', () => {
    for (const id of ['glass1', 'sand1', 'glass3', 'sand3']) {
      expect(resolveCloseAction(id, {}), id).toBeNull()
    }
  })

  it('finishing night4 does not resolve to the close view — no closingBeat on that adventure', () => {
    expect(resolveCloseAction('night4', {})).toBeNull()
  })

  it('finishing llama-peak4/sheep-hill4/duck-trail4 does not resolve to the close view (shipped-behaviour guard)', () => {
    for (const id of ['llama-peak4', 'sheep-hill4', 'duck-trail4']) {
      expect(resolveCloseAction(id, {}), id).toBeNull()
    }
  })

  it('finishing any of snake1..4 does not resolve to the close view — the snake adventure carries no closingBeat', () => {
    for (const id of ['snake1', 'snake2', 'snake3', 'snake4']) {
      expect(resolveCloseAction(id, {}), id).toBeNull()
    }
  })

  // Every enclosure's last level, not just sand4. The scenario this covers
  // names glass4/monos specifically, and `resolveCloseAction` being pure and
  // id-generic is an argument, not a test: the thing that would actually
  // break this is a persisted "already saw the closing" flag creeping in,
  // and such a flag would most likely be keyed per adventure.
  it('replaying any enclosure\'s last level resolves to the close view again — no persisted flag suppresses it', () => {
    for (const levelId of ['glass2', 'sand2', 'glass4', 'sand4'] as const) {
      expect(resolveCloseAction(levelId, {}), levelId).toEqual({ type: 'close', levelId })
      expect(
        resolveCloseAction(levelId, { [levelId]: { ...EMPTY_RECORD, approvals: 5 } }),
        levelId,
      ).toEqual({ type: 'close', levelId })
    }
  })
})

describe("resolveNextAction tries resolveCloseAction first (design.md §6.3)", () => {
  it('sand4 resolves to close, not the ordinary sector-exit outcome entrada would otherwise trigger', () => {
    expect(resolveNextAction('sand4', {})).toEqual({ type: 'close', levelId: 'sand4' })
  })

  it("nextView's exhaustive switch is unaffected by the 'close' variant, for every pre-existing input", () => {
    expect(nextView(playing('trail4'), { type: 'next', levelId: 'trail5' })).toEqual(playing('trail5'))
    expect(nextView({ view: 'map', finished: false }, { type: 'reset' })).toEqual({
      view: 'map',
      finished: false,
    })
  })
})

describe("GameScreen close view (design.md §6.3, D3, main-screen spec 'AdventureClosing Screen Renders the Transformation')", () => {
  // Renamed from `sand` (add-caretaker-prologue design.md D7): `sendero` is
  // `sand`'s direct successor, ending on the same `sand4` and carrying the
  // TWO-beat closing the old single-beat `sand` row used to carry as one.
  const sendero = ADVENTURES.find((a) => a.id === 'sendero')!

  it("mounts AdventureClosing for the 'close' view at beat 0 by default, and passes the FIRST beat", () => {
    let exited = false
    renderToString(
      <GameScreen
        initial={{ view: 'close', levelId: 'sand4' }}
        onExit={() => {
          exited = true
        }}
      />,
    )
    expect(adventureClosingProbe.current, 'AdventureClosing never mounted').toBeTruthy()
    expect(adventureClosingProbe.current?.adventure).toBe(sendero)
    expect(adventureClosingProbe.current?.beat).toBe(sendero.closingBeat![0])
    const onContinue = adventureClosingProbe.current?.onContinue as (() => void) | undefined
    expect(typeof onContinue).toBe('function')
    // `renderToString` cannot observe a re-render (this file's own header),
    // so this only proves the beat-0 tap does NOT call `onExit` directly —
    // it must advance to beat 1 instead of leaving the shell early.
    onContinue?.()
    expect(exited).toBe(false)
  })

  it("mounts AdventureClosing at beat 1 when the view's beat field says so, and its onContinue exits", () => {
    let exited = false
    renderToString(
      <GameScreen
        initial={{ view: 'close', levelId: 'sand4', beat: 1 }}
        onExit={() => {
          exited = true
        }}
      />,
    )
    expect(adventureClosingProbe.current?.beat).toBe(sendero.closingBeat![1])
    const onContinue = adventureClosingProbe.current?.onContinue as (() => void) | undefined
    onContinue?.()
    expect(exited).toBe(true)
  })

  it('a single-beat adventure (peces) at beat 0 exits on its own onContinue', () => {
    let exited = false
    renderToString(
      <GameScreen
        initial={{ view: 'close', levelId: 'glass2' }}
        onExit={() => {
          exited = true
        }}
      />,
    )
    const peces = ADVENTURES.find((a) => a.id === 'peces')!
    expect(adventureClosingProbe.current?.beat).toBe(peces.closingBeat![0])
    const onContinue = adventureClosingProbe.current?.onContinue as (() => void) | undefined
    onContinue?.()
    expect(exited).toBe(true)
  })

  it('an out-of-range beat index falls back to the first beat, never crashes', () => {
    expect(() =>
      renderToString(
        <GameScreen initial={{ view: 'close', levelId: 'sand4', beat: 99 }} onExit={() => {}} />,
      ),
    ).not.toThrow()
    expect(adventureClosingProbe.current?.beat).toBe(sendero.closingBeat![0])
  })

  it('an unknown/stale close levelId (no closingBeat) falls through to the ordinary play render, never crashes', () => {
    adventureClosingProbe.current = null
    expect(() =>
      renderToString(<GameScreen initial={{ view: 'close', levelId: 'night4' }} onExit={() => {}} />),
    ).not.toThrow()
    // `night4`'s own adventure carries no `closingBeat` — `AdventureClosing`
    // must never mount for it.
    expect(adventureClosingProbe.current).toBeNull()
  })
})

// GameView gains no new member (main-screen delta "GameView Gains No New
// Member"; add-caretaker-prologue design.md D3). Compile-time proof, the
// same `@ts-expect-error`-adjacent convention `rot is pinned to the literal
// 0` (`zoo/sectors.test.ts`) and `CaptionedArt.test.tsx`'s `label` proof
// both use: a `Record<GameView['view'], true>` that lists exactly today's
// five variants type-checks ONLY while the union has exactly those five
// keys — a sixth variant added to `GameView` without a matching key here
// fails `tsc --noEmit` (`npm run build`), never `npm test`.
const GAME_VIEW_VARIANTS: Record<GameView['view'], true> = {
  map: true,
  play: true,
  intro: true,
  deduce: true,
  close: true,
}

describe('GameView gains no new member (main-screen delta)', () => {
  it('lists exactly the five existing variants — proven at compile time by npm run build, not this run', () => {
    expect(Object.keys(GAME_VIEW_VARIANTS).sort()).toEqual(
      ['close', 'deduce', 'intro', 'map', 'play'].sort(),
    )
  })
})

// advanceClosing (add-caretaker-prologue design.md D3) — the mirror of
// `resolveCloseAction` for the "already showing the closing" side.
describe('advanceClosing', () => {
  it("sendero's two-beat closing advances from 0 to 1, then exits", () => {
    expect(advanceClosing('sand4', 0)).toEqual({ type: 'close', levelId: 'sand4', beat: 1 })
    expect(advanceClosing('sand4', 1)).toEqual({ type: 'exit' })
  })

  it("peces's single-beat closing exits straight from beat 0", () => {
    expect(advanceClosing('glass2', 0)).toEqual({ type: 'exit' })
  })

  it('an out-of-range beat exits rather than advancing past the list', () => {
    expect(advanceClosing('sand4', 5)).toEqual({ type: 'exit' })
  })

  it('a level id with no closingBeat exits immediately', () => {
    expect(advanceClosing('night4', 0)).toEqual({ type: 'exit' })
  })
})
