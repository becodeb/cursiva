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
// adventure- and sector-aware, not case-aware: [adventure-flow-and-map-
// guidance T2] a finished level that is not its own adventure's (or
// no-row sector block's) last one continues straight to the next one. The
// true end of a run usually leaves the shell for the map — EXCEPT [T2
// amendment] an animal-less adventure whose sector opens straight into
// another adventure right after it, which instead continues into THAT
// adventure's own narrative entry (`resolveAfterAdventure`) — see the
// dedicated `resolveNextAction` and `resolveAfterAdventure` describe blocks
// below for the full rule. A level no sector has adopted (today the hen's
// `trail1..4`, wired to no sector) keeps today's `next` behaviour
// unchanged. The `nextView` reducer's OWN `deduce` branch is untouched
// below — it is still reachable directly (the deep-link path,
// `initialView`), just no longer through `resolveNextAction`.
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
  resolveAfterAdventure,
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
// `sand3` is the sendero's own (and, after adventure-flow-and-map-guidance
// T1 narrowed it to one level, therefore last) level — the id this surface
// targets changed from `sand4` when T1 shipped; `sand4` itself now closes
// no adventure at all.
describe('initialView: ?nivel=cierre-<levelId> is a dev-only capture surface (reveal-grid-entrance-and-night)', () => {
  it('resolves the closing screen only when dev is true', () => {
    expect(initialView('?nivel=cierre-sand3', true)).toEqual({
      view: 'close',
      levelId: 'sand3',
    })
  })

  it('falls through to null when dev is false, including the default', () => {
    expect(initialView('?nivel=cierre-sand3', false)).toBeNull()
    expect(initialView('?nivel=cierre-sand3')).toBeNull()
  })

  it('falls through to null for a level that closes no adventure, even in dev mode', () => {
    // `duck-trail1` is a real adventure level whose own adventure carries no
    // closing beat at all; `trail1` belongs to no adventure whatsoever; and
    // `sand4` — the sendero's own dropped, harder twin after T1 — now
    // belongs to no adventure either, so it joins this negative list.
    expect(initialView('?nivel=cierre-duck-trail1', true)).toBeNull()
    expect(initialView('?nivel=cierre-trail1', true)).toBeNull()
    expect(initialView('?nivel=cierre-sand4', true)).toBeNull()
  })

  // [add-caretaker-prologue] An optional `:<n>` suffix reaches a beat past
  // the first — `sendero`'s two-beat closing is otherwise unreachable by a
  // single-URL capture (design.md D3).
  it('an optional :<n> suffix resolves to that beat', () => {
    expect(initialView('?nivel=cierre-sand3:1', true)).toEqual({
      view: 'close',
      levelId: 'sand3',
      beat: 1,
    })
    expect(initialView('?nivel=cierre-sand3:0', true)).toEqual({
      view: 'close',
      levelId: 'sand3',
      beat: 0,
    })
  })

  it('a malformed :<n> suffix falls through to null, never a crash', () => {
    expect(initialView('?nivel=cierre-sand3:abc', true)).toBeNull()
    expect(initialView('?nivel=cierre-sand3:-1', true)).toBeNull()
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

// [adventure-flow-and-map-guidance T2] Replaces the old "any sector level
// exits" rule (zoo-map-home, design.md §6): finishing a level that belongs
// to an `ADVENTURES` row now continues STRAIGHT to the next level of that
// SAME row, in order, whenever it is not the row's own last level — a child
// plays a whole adventure without seeing the map until it ends. A level a
// sector owns directly, with no adventure row of its own, chains the same
// way through a contiguous block of its sector's own `adventureIds` — no
// shipped level is in that state any more since `promised-animals` P2 gave
// the medusa's own `f2-guirnalda`..`f2-agua4` (inside `estanque`) the
// `fish` row (see the dedicated describe block below for its own coverage).
// The last id of a no-row block always exits to the map. An adventure's own
// last level — when it carries no closing beat — used to always exit too;
// [T2 amendment] it now chains into the NEXT adventure's own narrative
// entry instead, whenever that adventure recovers no animal and its sector
// opens straight into another adventure right after it (`night` → `night4`
// → `hedgehog`, below) — every other closingBeat-less last level (one that
// recovers an animal, or has nothing left after it in its sector) still
// exits exactly as before. The hen's `trail1..4` are wired to no sector at
// all, so they keep today's `next` behaviour forever, and so do the four
// entrance ids T1 dropped from every sector.
describe('resolveNextAction (adventure-flow-and-map-guidance T2: "an unfinished adventure continues, and only a true dead end returns to the map")', () => {
  it("every non-last level of every ADVENTURES row resolves to next, with the following id in that row's own levelIds — even for a single-level row, which has none", () => {
    for (const adventure of ADVENTURES) {
      for (let i = 0; i < adventure.levelIds.length - 1; i++) {
        const id = adventure.levelIds[i]
        expect(resolveNextAction(id, {}), `${adventure.id}: ${id}`).toEqual({
          type: 'next',
          levelId: adventure.levelIds[i + 1],
        })
      }
    }
  })

  it("every ADVENTURES row's own last level resolves to close (adventure-flow-and-map-guidance T8, docs/18 §4.7 item 1: every shipped row carries a closingBeat now) — night4's own chain into hedgehog happens one level deeper, through advanceClosing's fall-off, asserted in that function's own describe block below", () => {
    for (const adventure of ADVENTURES) {
      const last = adventure.levelIds[adventure.levelIds.length - 1]
      expect(adventure.closingBeat, adventure.id).toBeDefined()
      expect(resolveNextAction(last, {}), `${adventure.id}: ${last}`).toEqual({
        type: 'close',
        levelId: last,
      })
    }
  })

  it("night4 now resolves to close (T8) — its own OLD direct chain into hedgehog's narrative entry (T2 amendment) moved to advanceClosing's fall-off, once the (now real) closing beat is shown", () => {
    expect(resolveNextAction('night4', {})).toEqual({ type: 'close', levelId: 'night4' })
  })

  it('duck-trail4 now closes with its own rescue beat (T8) — never routes to deduce (D2: the auto-route is retired)', () => {
    const action = resolveNextAction('duck-trail4', recordsWith(DUCK_TRAIL_IDS, 1))
    expect(action).toEqual({ type: 'close', levelId: 'duck-trail4' })
    expect(action.type).not.toBe('deduce')
  })

  // The medusa's own four garland levels used to be a no-row sector block
  // (no `ADVENTURES` row claimed them), chaining through `nextInSectorBlock`
  // and exiting flatly on `f2-agua4`. `promised-animals` P2 gives them the
  // `fish` row instead: the three-to-next-level chain looks the same
  // (already covered generically by "every non-last level of every
  // ADVENTURES row resolves to next", above, and by "every ADVENTURES row's
  // own last level resolves to close"), but `f2-agua4` itself now closes
  // with its own rescue beat, the same T8 outcome `duck-trail4` gets above,
  // rather than exiting flatly.
  it('f2-agua4 (the fish row\'s own last level) now closes with its own rescue beat, not a flat exit (promised-animals P2)', () => {
    const action = resolveNextAction('f2-agua4', {})
    expect(action).toEqual({ type: 'close', levelId: 'f2-agua4' })
    expect(action.type).not.toBe('exit')
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

  it('the four entrance ids T1 dropped from every sector (glass2, sand2, glass4, sand4) fall back to catalog next behaviour, same as any other unclaimed level', () => {
    for (const id of ['glass2', 'sand2', 'glass4', 'sand4']) {
      expect(resolveNextAction(id, {}), id).toEqual({ type: 'next', levelId: nextLevelId(id) })
    }
  })
})

// resolveAfterAdventure (adventure-flow-and-map-guidance T2 amendment: "an
// adventure that recovers no animal chains into the next adventure of its
// sector"). Both `advanceClosing` and `resolveNextAction` defer to this once
// they already know the level is its own adventure's own last one — see
// their own describe blocks for the wiring; this block asserts the decision
// itself, directly.
describe('resolveAfterAdventure', () => {
  it("peces, tortugas and monos each chain straight into the next enclosure's narrative entry (glass1 → tortugas, sand1 → monos, glass3 → sendero)", () => {
    expect(resolveAfterAdventure('glass1', {})).toEqual({ view: 'intro', levelId: 'sand1' })
    expect(resolveAfterAdventure('sand1', {})).toEqual({ view: 'intro', levelId: 'glass3' })
    expect(resolveAfterAdventure('glass3', {})).toEqual({ view: 'intro', levelId: 'sand3' })
  })

  it("sendero (sand3) is entrada's own last adventureIds entry — nothing follows it, so it does not chain", () => {
    expect(resolveAfterAdventure('sand3', {})).toBeNull()
  })

  it("night chains straight into hedgehog's narrative entry, the same rule applied to nocturna's own pair of adventures", () => {
    // Concretely `intro` because `hedgehog` carries an `intro` string like
    // every registered adventure does today — asserted against
    // `resolveEnterAction` itself so this stays correct even if that ever
    // changes, and pinned to the literal shape besides.
    expect(resolveAfterAdventure('night4', {})).toEqual(resolveEnterAction('hedgehog1', {}))
    expect(resolveAfterAdventure('night4', {})).toEqual({ view: 'intro', levelId: 'hedgehog1' })
  })

  it('an adventure that recovers an animal never chains — it always ends on the map, where the animal now stands', () => {
    for (const id of [
      'duck-trail4',
      'sheep-hill4',
      'llama-peak4',
      'snake4',
      // The turtles' and monkeys' own last levels (`promised-animals` P3/P4).
      'turtle4',
      'bee4',
      'monkey4',
      // The fish row's own last level (`promised-animals` P2) — it recovers
      // `pez`, so it follows the exact same rule as every other
      // animal-recovering row here. Before P2 this id belonged to no
      // `ADVENTURES` row at all (a no-row sector block, `resolveAfterAdventure`'s
      // own header), which also resolved `null` here, but for the OTHER
      // reason that header names (`!adventure`, not `adventure.animal !==
      // undefined`) — a dedicated test used to assert that case separately;
      // it is folded into this generic list now that the reason has changed.
      'f2-agua4',
      'dolphin4',
      'hedgehog4',
    ]) {
      expect(resolveAfterAdventure(id, {}), id).toBeNull()
    }
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
  // (Previously — reveal-grid-entrance-and-night, then add-caretaker-
  // prologue's four-enclosure regrouping — each enclosure's closing-eligible
  // id was its own SECOND level: `glass2`/`sand2`/`glass4`/`sand4`, with
  // `glass1`/`sand1`/`glass3`/`sand3` asserted BY NAME not to close, being
  // merely mid-adventure. Adventure-flow-and-map-guidance T1 narrows every
  // enclosure to its easier level alone, so that single id is now BOTH
  // first and last: the closing-eligible ids INVERT to `glass1`/`sand1`/
  // `glass3`/`sand3`, and their old, harder twins belong to no adventure at
  // all — this prior negative/positive split is RETIRED, not merely
  // widened.)
  it('finishing each entrance enclosure\'s own single level (glass1, sand1, glass3, sand3) resolves to the close view', () => {
    for (const id of ['glass1', 'sand1', 'glass3', 'sand3']) {
      expect(resolveCloseAction(id, {}), id).toEqual({ type: 'close', levelId: id })
    }
  })

  it('finishing the four ids T1 dropped from every enclosure (glass2, sand2, glass4, sand4) does not resolve to the close view — they belong to no adventure at all', () => {
    for (const id of ['glass2', 'sand2', 'glass4', 'sand4']) {
      expect(resolveCloseAction(id, {}), id).toBeNull()
    }
  })

  it('finishing night4 now resolves to the close view (T8: night gained its own animal-less closing beat)', () => {
    expect(resolveCloseAction('night4', {})).toEqual({ type: 'close', levelId: 'night4' })
  })

  it('finishing llama-peak4/sheep-hill4/duck-trail4 now resolves to the close view — each carries its own one-beat rescue closing (T8)', () => {
    for (const id of ['llama-peak4', 'sheep-hill4', 'duck-trail4']) {
      expect(resolveCloseAction(id, {}), id).toEqual({ type: 'close', levelId: id })
    }
  })

  it('finishing snake1..3 does not resolve to the close view (mid-adventure, not the row\'s own last level); snake4 does (T8: the snake row now carries a rescue closing)', () => {
    for (const id of ['snake1', 'snake2', 'snake3']) {
      expect(resolveCloseAction(id, {}), id).toBeNull()
    }
    expect(resolveCloseAction('snake4', {})).toEqual({ type: 'close', levelId: 'snake4' })
  })

  // Every enclosure's own level, not just one of them. `resolveCloseAction`
  // being pure and id-generic is an argument, not a test: the thing that
  // would actually break this is a persisted "already saw the closing" flag
  // creeping in, and such a flag would most likely be keyed per adventure.
  it('replaying any enclosure\'s level resolves to the close view again — no persisted flag suppresses it', () => {
    for (const levelId of ['glass1', 'sand1', 'glass3', 'sand3'] as const) {
      expect(resolveCloseAction(levelId, {}), levelId).toEqual({ type: 'close', levelId })
      expect(
        resolveCloseAction(levelId, { [levelId]: { ...EMPTY_RECORD, approvals: 5 } }),
        levelId,
      ).toEqual({ type: 'close', levelId })
    }
  })
})

describe("resolveNextAction tries resolveCloseAction first (design.md §6.3)", () => {
  // `sand3` is the sendero's own level after adventure-flow-and-map-guidance
  // T1 narrowed it to one — without the close-first check, `sand3` would
  // otherwise resolve to `{ type: 'exit' }` (it is entrada's own last
  // adventureIds entry) rather than to its closing beat.
  it('sand3 resolves to close, not the ordinary sector-exit outcome entrada would otherwise trigger', () => {
    expect(resolveNextAction('sand3', {})).toEqual({ type: 'close', levelId: 'sand3' })
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
  // `sand`'s direct successor, carrying the TWO-beat closing the old
  // single-beat `sand` row used to carry as one. Ended on `sand4` until
  // adventure-flow-and-map-guidance T1 narrowed the sendero to one level;
  // `sand3` is its own (and therefore last) level now.
  const sendero = ADVENTURES.find((a) => a.id === 'sendero')!

  it("mounts AdventureClosing for the 'close' view at beat 0 by default, and passes the FIRST beat", () => {
    let exited = false
    renderToString(
      <GameScreen
        initial={{ view: 'close', levelId: 'sand3' }}
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
        initial={{ view: 'close', levelId: 'sand3', beat: 1 }}
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

  it('a single-beat adventure (peces) at beat 0 chains into the next enclosure instead of exiting (adventure-flow-and-map-guidance T2 amendment: peces recovers no animal, and tortugas opens right after it in entrada)', () => {
    let exited = false
    renderToString(
      <GameScreen
        initial={{ view: 'close', levelId: 'glass1' }}
        onExit={() => {
          exited = true
        }}
      />,
    )
    const peces = ADVENTURES.find((a) => a.id === 'peces')!
    expect(adventureClosingProbe.current?.beat).toBe(peces.closingBeat![0])
    const onContinue = adventureClosingProbe.current?.onContinue as (() => void) | undefined
    // `renderToString` cannot observe the re-render into tortugas' own intro
    // (this file's own header) — this only proves onContinue no longer
    // leaves the shell early. `advanceClosing`'s own describe block below
    // asserts the resolved destination directly.
    onContinue?.()
    expect(exited).toBe(false)
  })

  it('an out-of-range beat index falls back to the first beat, never crashes', () => {
    expect(() =>
      renderToString(
        <GameScreen initial={{ view: 'close', levelId: 'sand3', beat: 99 }} onExit={() => {}} />,
      ),
    ).not.toThrow()
    expect(adventureClosingProbe.current?.beat).toBe(sendero.closingBeat![0])
  })

  it('an unknown/stale close levelId (no adventure at all — every real ADVENTURES row carries a closingBeat as of T8) falls through to the ordinary play render, never crashes', () => {
    adventureClosingProbe.current = null
    const staleId = DETECTIVE_TRAIL_IDS[0]
    expect(() =>
      renderToString(<GameScreen initial={{ view: 'close', levelId: staleId }} onExit={() => {}} />),
    ).not.toThrow()
    // The hen's own trail levels belong to no `ADVENTURES` row at all
    // (`adventureFor` resolves `undefined`), so `closingLevel` resolves
    // `undefined` too and `AdventureClosing` must never mount for it.
    expect(adventureClosingProbe.current).toBeNull()
  })

  // T8 (docs/18 §4.7 item 1): every animal-recovering adventure now has its
  // own one-beat rescue closing, mounted the same way the entrance's own
  // enclosures always were.
  it("mounts AdventureClosing for an animal adventure's own rescue beat (duck-trail4), and its onContinue exits (an animal row never chains)", () => {
    let exited = false
    const duck = ADVENTURES.find((a) => a.id === 'duck')!
    renderToString(
      <GameScreen
        initial={{ view: 'close', levelId: 'duck-trail4' }}
        onExit={() => {
          exited = true
        }}
      />,
    )
    expect(adventureClosingProbe.current?.adventure).toBe(duck)
    expect(adventureClosingProbe.current?.beat).toBe(duck.closingBeat![0])
    const onContinue = adventureClosingProbe.current?.onContinue as (() => void) | undefined
    onContinue?.()
    expect(exited).toBe(true)
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
// [adventure-flow-and-map-guidance T2 amendment] Falling off the LAST beat
// of a real closing sequence now defers to `resolveAfterAdventure` instead
// of unconditionally exiting — see that function's own describe block for
// the destination assertions; the point of the `{}` records argument below
// is only that it threads through, since none of entrada's chained targets
// consult it.
describe('advanceClosing', () => {
  // `sand3` replaces `sand4` throughout this block after adventure-flow-and-
  // map-guidance T1 narrowed the sendero to its own one level; `glass2`
  // (peces's own dropped, harder twin) becomes `glass1`.
  it("sendero's two-beat closing advances from 0 to 1, then exits (sand3 is entrada's own last adventure — nothing follows it)", () => {
    expect(advanceClosing('sand3', 0, {})).toEqual({ type: 'close', levelId: 'sand3', beat: 1 })
    expect(advanceClosing('sand3', 1, {})).toEqual({ type: 'exit' })
  })

  it("peces's single-beat closing chains into tortugas' narrative entry from beat 0 (T2 amendment: peces recovers no animal, tortugas opens right after it)", () => {
    expect(advanceClosing('glass1', 0, {})).toEqual({
      type: 'enter',
      view: { view: 'intro', levelId: 'sand1' },
    })
  })

  it("tortugas' single-beat closing chains into monos' narrative entry from beat 0", () => {
    expect(advanceClosing('sand1', 0, {})).toEqual({
      type: 'enter',
      view: { view: 'intro', levelId: 'glass3' },
    })
  })

  it("monos' single-beat closing chains into sendero's narrative entry from beat 0", () => {
    expect(advanceClosing('glass3', 0, {})).toEqual({
      type: 'enter',
      view: { view: 'intro', levelId: 'sand3' },
    })
  })

  it('an out-of-range beat exits rather than advancing past the list (sand3 still has nothing to chain into)', () => {
    expect(advanceClosing('sand3', 5, {})).toEqual({ type: 'exit' })
  })

  it('a level id belonging to no adventure at all (closingLevel undefined) exits immediately — not trigger (a) of the T2 amendment, so it never reaches resolveAfterAdventure (this input is never reached by the real UI)', () => {
    expect(advanceClosing(DETECTIVE_TRAIL_IDS[0], 0, {})).toEqual({ type: 'exit' })
  })

  // T8 (docs/18 §4.7 item 1): night's own new closing beat is animal-less,
  // so falling off it (like peces/tortugas/monos before it) chains straight
  // into the next adventure the sector opens — hedgehog's narrative entry —
  // rather than exiting. This is the "resolveAfterAdventure runs when
  // advanceClosing falls off the last beat" case the orchestrator's own
  // brief asks to verify directly.
  it("night4's own one-beat closing chains into hedgehog's narrative entry from beat 0 (T2 amendment, now reached through T8's own closing beat)", () => {
    expect(advanceClosing('night4', 0, {})).toEqual({
      type: 'enter',
      view: { view: 'intro', levelId: 'hedgehog1' },
    })
  })

  // An animal-recovering adventure's own closing never chains — the guard
  // is `resolveAfterAdventure`'s own `animal !== undefined` check, exercised
  // here through `advanceClosing` for every shipped animal row at once.
  it("every animal-recovering adventure's own one-beat closing exits from beat 0 — it never chains (T8)", () => {
    for (const [levelId, adventureId] of [
      ['duck-trail4', 'duck'],
      ['sheep-hill4', 'sheep'],
      ['llama-peak4', 'llama'],
      ['snake4', 'snake'],
      // The turtles' and monkeys' own last levels (`promised-animals` P3/P4).
      ['turtle4', 'turtles'],
      ['bee4', 'bee'],
      ['monkey4', 'monkeys'],
      // The fish row's own last level (`promised-animals` P2).
      ['f2-agua4', 'fish'],
      ['dolphin4', 'dolphin'],
      ['hedgehog4', 'hedgehog'],
    ] as const) {
      const adventure = ADVENTURES.find((a) => a.id === adventureId)!
      expect(adventure.closingBeat, adventureId).toHaveLength(1)
      expect(advanceClosing(levelId, 0, {}), levelId).toEqual({ type: 'exit' })
    }
  })
})
