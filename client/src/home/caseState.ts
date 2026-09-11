// What the home shows about the case in progress, derived — never stored.
//
// Same rule the game shell already follows (`GameScreen.tsx`'s `allEarned`,
// design.md "earned clues are derived from progress, not stored"): the only
// persisted thing is `cursiva.levels.v1`, and every display state on this
// screen is a pure function of it. A second copy of "which clues are filed"
// would be a second thing that can be wrong.
//
// Pure and store-free so it is testable in this repo's node harness. That is
// not a nicety here: `HomeScreen` renders under `renderToString` with no DOM,
// so a decision taken inside a click handler can never be observed by a test.
// The decision therefore lives out here, and the handler only dispatches it —
// the same reason `resolveNextAction` and `shouldFileClue` are exported.
import { getLevel } from '../levels/catalog'
import { DETECTIVE_TRAIL_IDS, type LevelRecord } from '../game/types'
import type { ClueKind } from '../detective/assets'

/** A clue is FILED once its trail has been approved at least once — the exact
 * threshold `GameScreen.allEarned` uses, quoted here rather than re-decided so
 * the rail on the home and the rail in play can never disagree. */
const APPROVALS_TO_FILE = 1

export type Records = Readonly<Record<string, LevelRecord>>

/** Where the magnifying glass takes the child (`docs/10` §4: "abre el rastro
 * siguiente sin terminar; si el caso está completo, abre la deducción"). */
export type CaseStep = { kind: 'trail'; levelId: string } | { kind: 'deduce' }

/** One position on the home's rail. */
export interface RailSlot {
  kind: ClueKind
  filed: boolean
}

export function isFiled(records: Records, levelId: string): boolean {
  return (records[levelId]?.approvals ?? 0) >= APPROVALS_TO_FILE
}

/**
 * "Por donde lo dejé". The first trail whose clue is not filed yet; the
 * deduction once all four are.
 *
 * Note what it deliberately does NOT do: it never consults `isUnlocked`. The
 * home is a resume control, not a level picker — sending the child to a locked
 * level is impossible by construction, because the first unfiled trail is
 * always the furthest they have legitimately reached.
 */
export function nextCaseStep(records: Records): CaseStep {
  const pending = DETECTIVE_TRAIL_IDS.find((id) => !isFiled(records, id))
  return pending === undefined ? { kind: 'deduce' } : { kind: 'trail', levelId: pending }
}

/**
 * The four rail positions, in play order, each carrying its trail's own clue
 * kind. The kinds come from the catalog rather than from a second list here:
 * the trail owns its clue (`catalog.ts`'s `clue: { kind, spacing }`), and a
 * trail authored without one is a catalog bug, not something this screen
 * should paper over — so it throws instead of rendering a blank socket.
 */
export function railSlots(records: Records): readonly RailSlot[] {
  return DETECTIVE_TRAIL_IDS.map((id) => {
    const clue = getLevel(id).clue
    if (!clue) throw new Error(`Rastro sin pista: ${id}`)
    return { kind: clue.kind, filed: isFiled(records, id) }
  })
}

/**
 * The lamp is lit when the case is complete — all four clues filed.
 *
 * It means something narrower than the lamp in play, and that is intended. On
 * a trail the lamp marks the end of THIS route; on the home there is no route,
 * so the only honest thing for one light to say is whether the case is ready
 * to be solved. It is also the screen's only progress readout besides the
 * rail, and it has to be readable without words.
 */
export function lampOn(records: Records): boolean {
  return DETECTIVE_TRAIL_IDS.every((id) => isFiled(records, id))
}
