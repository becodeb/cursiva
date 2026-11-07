// What the child has written, kept for the notebook: the keepsake of the letter
// stage is their real stroke, not a star (`docs/25` 4.5). Sheet units, so a letter
// sits on the rule the way it was written. Same shape as `zoo/tracedLine.ts`: session
// memory for a private tab, storage as a parameter, nothing can throw at a screen.
import { simplifyPoints, type RawPoint, type StorageLike, type TracedPoint } from './tracedLine'

export const WRITINGS_KEY = 'cursiva.libreta.v1'
/** A word is several letters long: more than a family's one-gesture line. */
export const MAX_WRITING_POINTS = 280
const SIMPLIFY_TOLERANCE = 1.2

export interface Writing {
  /** The letter, the word, or the bridge level this line came from. */
  readonly key: string
  readonly strokes: readonly (readonly TracedPoint[])[]
}

const countPoints = (strokes: readonly (readonly TracedPoint[])[]): number =>
  strokes.reduce((sum, s) => sum + s.length, 0)

export function toWriting(key: string, raw: readonly (readonly RawPoint[])[]): Writing | null {
  const strokes = raw.filter((s) => s.length >= 2)
  if (strokes.length === 0) return null
  for (const stroke of strokes) {
    for (const p of stroke) if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) return null
  }
  const asPoints = strokes.map((s) => s.map((p): TracedPoint => [p.x, p.y]))
  let tolerance = SIMPLIFY_TOLERANCE
  let simplified = asPoints.map((s) => simplifyPoints(s, tolerance))
  while (countPoints(simplified) > MAX_WRITING_POINTS) {
    tolerance *= 1.4
    simplified = asPoints.map((s) => simplifyPoints(s, tolerance))
  }
  return { key, strokes: simplified.map((s) => s.map((p): TracedPoint => [Math.round(p[0] * 10) / 10, Math.round(p[1] * 10) / 10])) }
}

function parseWriting(raw: unknown): Writing | null {
  if (typeof raw !== 'object' || raw === null) return null
  const { key, strokes } = raw as Record<string, unknown>
  if (typeof key !== 'string' || !Array.isArray(strokes) || strokes.length === 0) return null
  for (const stroke of strokes) {
    if (!Array.isArray(stroke) || stroke.length < 2) return null
    for (const p of stroke) {
      if (!Array.isArray(p) || p.length !== 2 || !Number.isFinite(p[0]) || !Number.isFinite(p[1])) return null
    }
  }
  return { key, strokes: strokes as Writing['strokes'] }
}

function browserStorage(): StorageLike | null {
  try {
    if (typeof window === 'undefined') return null
    return window.localStorage ?? null
  } catch {
    return null
  }
}

const session = new Map<string, Writing>()

/** Every stored writing, keyed; a corrupt entry is dropped alone. */
export function loadWritings(storage: StorageLike | null = browserStorage()): Readonly<Record<string, Writing>> {
  const out: Record<string, Writing> = {}
  try {
    const raw = storage?.getItem(WRITINGS_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : null
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
      for (const [key, entry] of Object.entries(parsed)) {
        const writing = parseWriting(entry)
        if (writing) out[key] = writing
      }
    }
  } catch {
    // Corrupt or unavailable: the same as nothing written.
  }
  for (const [key, writing] of session) out[key] = writing
  return out
}

export function recordWriting(
  key: string,
  raw: readonly (readonly RawPoint[])[],
  storage: StorageLike | null = browserStorage(),
): void {
  const writing = toWriting(key, raw)
  if (!writing) return
  session.set(key, writing)
  try {
    const all = { ...loadWritings(storage), [key]: writing }
    storage?.setItem(WRITINGS_KEY, JSON.stringify(all))
  } catch {
    // A full quota loses a keepsake, never a level.
  }
}

/** Tests only: session memory outlives a test the way it outlives a screen. */
export function forgetSessionWritings(): void {
  session.clear()
}

/** Written letters and words, in the order the notebook shows them: words first,
 *  because a word is the goal. A bridge line stays out: it is a gesture, kept for
 *  the morph. */
export function notebookWritings(all: Readonly<Record<string, Writing>>): readonly Writing[] {
  const written = Object.values(all).filter((w) => !w.key.endsWith('-puente'))
  return [...written].sort((a, b) => Number(b.key.length > 1) - Number(a.key.length > 1))
}
