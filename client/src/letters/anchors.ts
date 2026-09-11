// Per-letter exit-kind and secondary-stroke metadata for the SVG ductus
// pipeline. The exit kind selects the corner the stroke is expected to end
// near for the anchor-aware end diagnostic: baseline → bottom-right, top →
// top-right, mid → middle-right of the MAIN subpath span (see design.md).
//
// All letters ENTER at baseline-left; the exit varies by letter shape:
// - default: baseline-right (the stroke finishes on the baseline)
// - o v w: top-right (these letters end at the top of their body)
// - b e: mid-right (b ends at the middle line with its hook; e at mid-height)
// - r: baseline-right (the arm stays at mid-height but the connecting stroke
//   descends to the baseline)
//
// Letters with intentional pen-lift strokes (dot, cross, second diagonal)
// are authored as ADDITIONAL subpaths after the main body; the pipeline
// classifies them as secondary and suppresses the gap warning for them.

export type ExitKind = 'baseline' | 'top' | 'mid'

/** Exit kind per lowercase letter; anything not listed defaults to baseline. */
export const EXIT_BY_CHAR: Readonly<Record<string, ExitKind>> = {
  o: 'top',
  v: 'top',
  w: 'top',
  b: 'mid',
  e: 'mid',
}

/** Letters whose pen-lift strokes are declared secondary subpaths:
 * i/j dot, t/f cross, x second diagonal. The >15px jump between the main
 * body and those subpaths is intentional, so the gap warning is suppressed. */
export const SECONDARY_STROKE_CHARS: ReadonlySet<string> = new Set([
  'i',
  'j',
  't',
  'f',
  'x',
])

/** Letters whose secondary stroke is DEFERRED to the end of an assembled word
 * (the `i`/`j` dot, the `t`/`f` cross — drawn AFTER every word letter and
 * connector). `x`'s second diagonal is NOT deferred (drawn immediately after
 * its main segment).
 *
 * Governing rule (design.md Decision 4): defer when the secondary stroke is
 * NOT the writing exit. `x`'s second diagonal IS the exit, so it stays
 * immediate. `t`/`i`/`j`/`f` secondaries (cross / dot / crossbar) are never
 * the exit, so they defer. `f` is included as FORWARD-LOOKING: today's
 * `f.svg` is a single subpath (no crossbar authored yet), so `f` has no pen
 * lift and this entry is inert — pinned by a golden assertion on `f`'s
 * `effectiveExit` in combinations.test.ts. The day a crossbar IS authored,
 * leaving `f` out of this set would make the crossbar's right end the seam
 * origin — geometrically wrong — so it is declared here ahead of that change. */
export const DEFERRED_SECONDARY_CHARS: ReadonlySet<string> = new Set(['t', 'i', 'j', 'f'])

/** Resolve the exit kind for a character (unknowns/uppercase → baseline). */
export function exitKindFor(char: string): ExitKind {
  return EXIT_BY_CHAR[char.toLowerCase()] ?? 'baseline'
}