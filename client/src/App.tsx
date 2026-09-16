/** App shell. The entry point is the ZOO MAP (`docs/12_MAPA_DEL_ZOOLOGICO.md`):
 * one drawn illustration with registered layers, replacing the home office
 * (`docs/10`) this screen used to open on. Returning from any level still
 * lands here, exactly as it landed on the office before — the map replaces
 * the office as the first thing the child sees and as the shell's own resume
 * destination, not as the game's internal navigation.
 *
 * The U7 letter workbench stays reachable behind a small text toggle, and
 * that toggle lives under the MAP, never on it: the map's own text is the
 * star count and the octopus's phrase, both captioned (`docs/12` §3), and
 * adding a third piece of UI copy there would be an unrelated screen's
 * concern riding along.
 */
import { useState } from 'react'
import GameScreen, { initialView, resolveEnterAction, type GameView } from './screen/GameScreen'
import PrologueOpening, { prologueRoute } from './screen/PrologueOpening'
import MainScreen from './screen/MainScreen'
import ZooMap from './screen/ZooMap'
import { LocalProgressStore } from './progress/LocalProgressStore'
import { openProgressStore } from './game/openProgressStore'
import { isDevMode, seededProgressIds, shouldSeedRecoveredDuck } from './canvas/devMode'
import { EMPTY_RECORD } from './game/types'
import type { LevelRecord } from './game/types'

/** Which shell is on screen. `game` carries where to open it, which is how
 * the map's own routing decision (`nextAdventure`) reaches the game without
 * the game having to re-derive it. `prologue` (add-caretaker-prologue
 * design.md D2) is the caretaker's opening, shown before the map on a
 * child's first visit — a `Shell` variant, not a `GameView`: the opening
 * happens BEFORE the map, which the game shell never owns. */
type Shell =
  | { at: 'map' }
  | { at: 'game'; initial?: GameView }
  | { at: 'workbench' }
  | { at: 'prologue'; from?: number }

/** Whether the opening has already been seen, DERIVED from the existing
 *  level records rather than a new persisted key (design.md D2; the same
 *  precedent `sectors.ts:507-524` records against a persisted `<sector>-
 *  seen` flag, and `migrateEntrance.ts:83`'s reading of an empty record set
 *  as a fresh install — every migration returns `{}` on one, so an empty
 *  store after `openProgressStore()` is exactly a fresh install). */
export function firstVisit(records: Readonly<Record<string, LevelRecord>>): boolean {
  return Object.keys(records).length === 0
}

/** The map is a resume control, so it needs the persisted records — but only
 * at the moment it is shown. Reading them through a store constructed right
 * here, each time, is deliberate: `LevelProgressStore` caches on construction,
 * so a long-lived second instance would go stale the moment the game wrote
 * anything (`game/openProgressStore.ts`). */
function readRecords(): Readonly<Record<string, LevelRecord>> {
  return openProgressStore().all()
}

/**
 * `?debug=pato-recuperado`, dev-gated (`canvas/devMode.ts`): files
 * `duck-trail4` before the map's own records are read, so the zoo map can
 * be captured with the duck already standing at the pond without a live
 * interactive session or manual devtools edit
 * (duck-undulations-and-sector-backdrop, screenshot verification).
 * Idempotent — filing an already-filed level is a no-op.
 */
function maybeSeedRecoveredDuck(search: string, dev: boolean): void {
  if (!dev || !shouldSeedRecoveredDuck(search)) return
  const store = openProgressStore()
  if (store.get('duck-trail4').approvals < 1) {
    store.save('duck-trail4', { ...EMPTY_RECORD, approvals: 1 })
  }
}

/**
 * `?debug=progreso:<id>,<id>,…`, dev-gated (`canvas/devMode.ts`'s
 * `seededProgressIds`, design.md §9): files every listed id before the
 * map's own records are read, generalizing `maybeSeedRecoveredDuck`'s one
 * hardcoded id into an arbitrary list — the same idempotent shape, one
 * store read and one guarded write per id.
 */
function maybeSeedProgress(search: string, dev: boolean): void {
  if (!dev) return
  const ids = seededProgressIds(search)
  if (ids.length === 0) return
  const store = openProgressStore()
  for (const id of ids) {
    if (store.get(id).approvals < 1) {
      store.save(id, { ...EMPTY_RECORD, approvals: 1 })
    }
  }
}

/** A `?nivel=` deep link skips the map — AND the opening (`prologue-opening`
 * spec "A `?nivel=` Deep Link Bypasses the Opening"): the link exists so a
 * level can be opened directly while the mechanics are being reviewed, and
 * routing it through either screen would defeat that. `initialView` returns
 * `null` for anything unroutable — including a bare `?nivel=mapa` outside
 * dev mode (design.md §8, "Dev gate on the map route") — so the opening (on
 * a first visit) or the zoo map (otherwise) is the fallback whenever nothing
 * was asked for (design.md D2). */
export function resolveShell(
  search: string,
  dev: boolean,
  records: Readonly<Record<string, LevelRecord>>,
): Shell {
  const view = initialView(search, dev)
  if (view) return { at: 'game', initial: view }
  const opening = prologueRoute(search, dev)
  if (opening) return opening
  return firstVisit(records) ? { at: 'prologue' } : { at: 'map' }
}

/** The impure wrapper: reads `window`, the store and the dev flag, seeds any
 *  requested progress, then hands the pure resolver above the three values
 *  it needs. Split this way because the ORDER of those three branches is
 *  what three `prologue-opening` scenarios actually assert, and a private
 *  function that reads globals can only be checked by reading it. Every
 *  ingredient was already tested alone; what was untested was the
 *  composition — which is the part a later refactor would silently break. */
function initialShell(): Shell {
  const search = typeof window === 'undefined' ? '' : window.location.search
  const dev = isDevMode()
  maybeSeedRecoveredDuck(search, dev)
  maybeSeedProgress(search, dev)
  return resolveShell(search, dev, readRecords())
}

export default function App() {
  // One store per app: reads localStorage once, monotonic best-of on writes.
  // This is the LETTER store (U7 workbench), unrelated to level progress.
  const [store] = useState(() => new LocalProgressStore())
  const [shell, setShell] = useState<Shell>(initialShell)
  const [records, setRecords] = useState(readRecords)
  // A fresh mount per trip into the game, so `initial` is honoured every time
  // rather than only on the first one (it is read in a lazy initialiser).
  const [trip, setTrip] = useState(0)

  // Renamed from `goHome` (zoo-map-home, main-screen spec "Exit Returns to
  // the Zoo Map") — same one function that can reach `{ at: 'map' }`, still
  // what `onExit` receives below.
  const goToMap = () => {
    setRecords(readRecords())
    setShell({ at: 'map' })
  }

  if (shell.at === 'prologue') {
    return <PrologueOpening from={shell.from} onDone={goToMap} />
  }

  if (shell.at === 'map') {
    return (
      <ZooMap
        records={records}
        onEnter={(levelId: string) => {
          setTrip((n) => n + 1)
          // `resolveEnterAction` is the mirror of `resolveNextAction`
          // (duck-undulations-and-sector-backdrop design.md §4): routes
          // through the narrative entry for an adventure's first level,
          // straight to play for every other one.
          setShell({ at: 'game', initial: resolveEnterAction(levelId, records) })
        }}
      />
    )
  }

  const toggle = (
    <div style={{ textAlign: 'center', padding: '12px 0 24px', display: 'flex', gap: 18, justifyContent: 'center' }}>
      <button type="button" onClick={goToMap} style={LINK}>
        el mapa
      </button>
      <button
        type="button"
        onClick={() => setShell((s) => (s.at === 'workbench' ? { at: 'game' } : { at: 'workbench' }))}
        style={LINK}
      >
        {shell.at === 'workbench' ? 'volver al juego' : 'modo letras (viejo)'}
      </button>
    </div>
  )

  if (shell.at === 'workbench') {
    return (
      <>
        <MainScreen store={store} />
        {toggle}
      </>
    )
  }

  // The toggle goes THROUGH the game shell rather than under it: a level is
  // exactly one viewport tall (docs/04 §3.3), so anything appended below it
  // would reintroduce the page scroll the layout exists to remove.
  // `onExit={goToMap}`: leaving any mode (a trail's back control, the
  // deduction's back control) lands on the zoo map, never the internal level
  // map (design.md §8, "onExit, a prop, not a GameAction") — `goToMap` is
  // the only function that can reach `{ at: 'map' }`.
  return <GameScreen key={trip} initial={shell.initial} footer={toggle} onExit={goToMap} />
}

const LINK = {
  background: 'none',
  border: 'none',
  color: '#94a3b8',
  fontSize: 14,
  textDecoration: 'underline',
  cursor: 'pointer',
} as const
