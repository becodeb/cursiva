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
//
// [case-registry-and-captions, Phase 6] Made CASE-AWARE (design.md §1, spec:
// detective-mode "Case Routing Across Multiple Cases"). This module used to
// hardcode the hen's four trails as THE case; it now walks `DETECTIVE_CASES`
// in order and stops at the first one that is not yet resolved, so the duck
// case (first) and the hen case (second) share the exact same resume logic.
import { DETECTIVE_CASES, caseSolvedId, clueKindsOf, type DetectiveCase } from '../detective/cases'
import type { LevelRecord } from '../game/types'
import type { ClueKind } from '../detective/assets'

/** A clue is FILED once its trail has been approved at least once — the exact
 * threshold `GameScreen.allEarned` uses, quoted here rather than re-decided so
 * the rail on the home and the rail in play can never disagree. */
const APPROVALS_TO_FILE = 1

export type Records = Readonly<Record<string, LevelRecord>>

/** Where the magnifying glass takes the child (`docs/10` §4: "abre el rastro
 * siguiente sin terminar; si el caso está completo, abre la deducción").
 * `deduce` now carries WHICH case (design.md §1) — there is more than one. */
export type CaseStep =
  | { kind: 'trail'; levelId: string }
  | { kind: 'deduce'; caseId: string }

/** One position on the home's rail. */
export interface RailSlot {
  kind: ClueKind
  filed: boolean
}

export function isFiled(records: Records, levelId: string): boolean {
  return (records[levelId]?.approvals ?? 0) >= APPROVALS_TO_FILE
}

/**
 * The case in progress: the first entry in `DETECTIVE_CASES` (duck first,
 * hen second — the user's binding decision 3) whose trails are not all filed
 * OR whose own deduction is not yet solved (spec: "Case Routing Across
 * Multiple Cases"). Falls back to the LAST case once every case is resolved,
 * so a fully-solved child's home still has something to show — its own
 * (already-closed) deduction, rather than nothing.
 */
export function activeCase(records: Records): DetectiveCase {
  return (
    DETECTIVE_CASES.find(
      (kase) =>
        kase.trailIds.some((id) => !isFiled(records, id)) ||
        !isFiled(records, caseSolvedId(kase.id)),
    ) ?? DETECTIVE_CASES[DETECTIVE_CASES.length - 1]
  )
}

/**
 * "Por donde lo dejé". The first trail of the ACTIVE case whose clue is not
 * filed yet; that case's deduction once all of them are.
 *
 * Note what it deliberately does NOT do: it never consults `isUnlocked`. The
 * home is a resume control, not a level picker — sending the child to a locked
 * level is impossible by construction, because the first unfiled trail is
 * always the furthest they have legitimately reached.
 */
export function nextCaseStep(records: Records): CaseStep {
  const kase = activeCase(records)
  const pending = kase.trailIds.find((id) => !isFiled(records, id))
  return pending === undefined
    ? { kind: 'deduce', caseId: kase.id }
    : { kind: 'trail', levelId: pending }
}

/**
 * The rail positions for a GIVEN case, in play order, each carrying its
 * trail's own clue kind. The kinds come from `clueKindsOf` (`detective/
 * cases.ts`), which itself derives them from the catalog rather than
 * restating them — a trail authored without a clue is a catalog bug, not
 * something this screen should paper over, so it throws instead of
 * rendering a blank socket.
 */
export function railSlots(records: Records, kase: DetectiveCase): readonly RailSlot[] {
  const kinds = clueKindsOf(kase)
  return kase.trailIds.map((id, i) => ({ kind: kinds[i], filed: isFiled(records, id) }))
}

/**
 * The lamp is lit when the GIVEN case is complete — all of its own trails
 * filed.
 *
 * It means something narrower than the lamp in play, and that is intended. On
 * a trail the lamp marks the end of THIS route; on the home there is no route,
 * so the only honest thing for one light to say is whether the case is ready
 * to be solved. It is also the screen's only progress readout besides the
 * rail, and it has to be readable without words.
 */
export function lampOn(records: Records, kase: DetectiveCase): boolean {
  return kase.trailIds.every((id) => isFiled(records, id))
}
