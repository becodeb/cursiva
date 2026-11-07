// The small decisions of a letter step in the notebook, pure, so they can be tested
// without simulating a pointer: what he says after a stroke, when a stuck child gets
// help, and where the sign for a high exit goes.
import type { LevelAttempt } from '../game/types'
import type { Point } from '../letters/types'
import type { NotebookStep } from '../levels/types'

/** Spoken and never written; names the gesture, never the fault (`docs/03` §7). */
export function letterCoachLine(attempt: LevelAttempt, step: NotebookStep): string {
  const written = step === 'copy' || step === 'memory'
  if (attempt.wrongDirection) {
    return written ? 'Probá girando para el otro lado.' : 'Probá para el otro lado: arrancá en el puntito verde.'
  }
  if (attempt.backAndForth) return 'Despacito y para adelante, sin ir y volver.'
  if (attempt.extraLifts > 0) return 'Casi. Esta vez sin levantar el dedo.'
  if (attempt.failedPillar === 'accuracy') {
    return written ? 'Casi. Mirá bien la forma y probá de nuevo.' : 'Por adentro del caminito, despacito.'
  }
  if (attempt.failedPillar === 'direction') return 'Seguí hasta el final, sin levantar el dedo.'
  if (attempt.failedPillar === 'fluency') return 'Vas bien. Más parejito, sin frenar.'
  return 'Probá una vez más, tranquilo.'
}

export type NotebookHelp = 'none' | 'show-again' | 'offer-continue'

/** After two tries he shows it again with the guide back; after four the way
 *  forward is on the screen. Adaptive widening runs beside this (`game/
 *  adaptiveTolerance.ts`), but widening alone cannot rescue a child who, say, keeps
 *  turning the wrong way, and the app never blocks (`docs/01` §5). */
export function notebookHelpFor(fails: number): NotebookHelp {
  if (fails >= 4) return 'offer-continue'
  if (fails >= 2) return 'show-again'
  return 'none'
}

const EXIT_TAIL = 46

/** Where the sign for a high exit goes: on the letter's last point, with a dotted
 *  stub running on along its last heading, toward where the next letter would be. */
export function exitCueOf(polyline: readonly Point[]): { x: number; y: number; tail: string } | undefined {
  if (polyline.length < 2) return undefined
  const end = polyline[polyline.length - 1]
  let i = polyline.length - 2
  while (i > 0 && Math.hypot(end.x - polyline[i].x, end.y - polyline[i].y) < 24) i--
  const dx = end.x - polyline[i].x
  const dy = end.y - polyline[i].y
  const len = Math.hypot(dx, dy) || 1
  const tx = end.x + (dx / len) * EXIT_TAIL
  const ty = end.y + (dy / len) * EXIT_TAIL
  return { x: end.x, y: end.y, tail: `M${end.x} ${end.y}L${tx.toFixed(1)} ${ty.toFixed(1)}` }
}
