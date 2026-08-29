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
 * (the `i`/`j` dot, the `t` cross — drawn AFTER every word letter and
 * connector). `x`'s second diagonal is NOT deferred (drawn immediately after
 * its main segment), and `f` is NOT deferred (single-path; a future `f` cross
 * draws immediately — flagged, out of scope). */
export const DEFERRED_SECONDARY_CHARS: ReadonlySet<string> = new Set(['t', 'i', 'j'])

/** Resolve the exit kind for a character (unknowns/uppercase → baseline). */
export function exitKindFor(char: string): ExitKind {
  return EXIT_BY_CHAR[char.toLowerCase()] ?? 'baseline'
}