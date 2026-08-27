// Per-letter exit-kind and secondary-stroke metadata for the SVG ductus
// pipeline. The exit kind selects the corner the stroke is expected to end
// near for the anchor-aware end diagnostic: baseline → bottom-right, top →
// top-right, mid → middle-right of the MAIN subpath span (see design.md).
//
// All letters ENTER at baseline-left; the exit varies by letter shape:
// - default: baseline-right (the stroke finishes on the baseline)
// - o r v w: top-right (these letters end at the top of their body)
// - e: mid-right (the e's tongue ends at mid-height)
//
// Letters with intentional pen-lift strokes (dot, cross, second diagonal)
// are authored as ADDITIONAL subpaths after the main body; the pipeline
// classifies them as secondary and suppresses the gap warning for them.

export type ExitKind = 'baseline' | 'top' | 'mid'

/** Exit kind per lowercase letter; anything not listed defaults to baseline. */
export const EXIT_BY_CHAR: Readonly<Record<string, ExitKind>> = {
  o: 'top',
  r: 'top',
  v: 'top',
  w: 'top',
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

/** Resolve the exit kind for a character (unknowns/uppercase → baseline). */
export function exitKindFor(char: string): ExitKind {
  return EXIT_BY_CHAR[char.toLowerCase()] ?? 'baseline'
}