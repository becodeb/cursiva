// Letter combinations (letter-combinations spec): turn TWO single-subpath
// registered letters into ONE continuous `enlazada` LetterConfig by translating
// the second member so its entry lands EXACTLY on the first member's exit —
// the concatenated `d` is a single stroke with NO connector segment
// (seam = translation, design decision 3). The combined config is a plain
// LetterConfig, so guided/free trace and evaluate consume it unchanged.
//
// Guards (design decision 4): each member's stored `d` MUST have at most one
// M command (multi-subpath `d` ends at a dot/cross → seam jump), members MUST
// share a baselineZone (mixed zones misalign vertically), and the combination
// is capped at 2 letters (2600·n demo grows too fast). Error strings in
// Spanish, house style.
import { transformPathD } from './svgLetter'
import type { AnimationStep, LetterCheckpoint, LetterConfig } from './types'

/** Round to 2 decimals — the `d`/anchors precision of pathFromPoints. */
function round2(n: number): number {
  return Math.round(n * 100) / 100
}

/** Round to 1 decimal — the checkpoint/ideal precision of generateCheckpoints. */
function round1(n: number): number {
  return Math.round(n * 10) / 10
}

/** True when the stored `d` contains more than one M command (multi-subpath). */
function isMultiSubpath(cfg: LetterConfig): boolean {
  return (cfg.pathDefinition.d.match(/m/gi) ?? []).length > 1
}

/** Translate a checkpoint by the shared seam offset (1-decimal rounding). */
function offsetCheckpoint(cp: LetterCheckpoint, dx: number, dy: number): LetterCheckpoint {
  return { ...cp, x: round1(cp.x + dx), y: round1(cp.y + dy) }
}

/**
 * Build the combined `LetterConfig` for an ordered pair:
 *
 *  - `d` = d₀ + " " + transformPathD(d₁, 1, 1, dx, dy) with
 *    (dx, dy) = round2(exit₀ − entry₁) — the seam is EXACT by construction.
 *  - checkpoints: translated + renumbered strictly 1..N (names kept);
 *    ideal: translated clouds concatenated; anchors {entry₀, exit₁}.
 *  - timeline: slide_in from member 0, ONE draw_path (delay 1000,
 *    duration 2600·n), fade_out at 1000 + 2600·n + 200.
 *  - family 'enlazada', theme/strokeWidth from the first member.
 *
 * Throws on guard violation (multi-subpath member, mixed zones, length ≠ 2).
 */
export function buildCombination(letters: [LetterConfig, LetterConfig]): LetterConfig {
  if (letters.length !== 2) {
    throw new Error('La combinación debe tener exactamente 2 letras')
  }
  const [first, second] = letters
  if (isMultiSubpath(first) || isMultiSubpath(second)) {
    const offender = isMultiSubpath(first) ? first : second
    throw new Error(
      `La letra '${offender.character}' tiene más de un subpath; no se ofrece en combinación`,
    )
  }
  if (first.baselineZone !== second.baselineZone) {
    throw new Error(
      `Las letras '${first.character}' y '${second.character}' tienen zonas de renglón distintas; no se ofrecen en combinación`,
    )
  }

  const dx = round2(first.anchors.exit.x - second.anchors.entry.x)
  const dy = round2(first.anchors.exit.y - second.anchors.entry.y)
  const chars = `${first.character}${second.character}`

  // Seam: translate the second member so its entry lands on the first exit.
  const d = `${first.pathDefinition.d} ${transformPathD(second.pathDefinition.d, 1, 1, dx, dy)}`

  // Global renumbering: member orders are strictly 1..N by contract, so the
  // cumulative offset is exactly the previous member's checkpoint count.
  const firstCount = first.pathDefinition.checkpoints.length
  const checkpoints: LetterCheckpoint[] = [
    ...first.pathDefinition.checkpoints,
    ...second.pathDefinition.checkpoints.map((cp) => ({
      ...offsetCheckpoint(cp, dx, dy),
      order: cp.order + firstCount,
    })),
  ]

  // Ideal clouds concatenated (translated), anchors span the full combo.
  const ideal: Array<readonly [number, number]> = [
    ...first.pathDefinition.ideal,
    ...second.pathDefinition.ideal.map(
      ([x, y]) => [round1(x + dx), round1(y + dy)] as const,
    ),
  ]

  const timeline: AnimationStep[] = [
    {
      id: `slide_in_${chars}`,
      type: 'slide_in',
      target: 'background_theme',
      duration: 600,
      properties: { y: [100, 0], opacity: [0, 0.8] },
    },
    {
      id: `draw_path_${chars}`,
      type: 'draw_path',
      target: 'ink_demonstration',
      delay: 1000,
      duration: 2600 * letters.length,
    },
    {
      id: `fade_out_${chars}`,
      type: 'fade_out',
      target: 'thematic_asset',
      delay: 1000 + 2600 * letters.length + 200,
      duration: 600,
      properties: { opacity: 0.08 },
    },
  ]

  return {
    id: `combo_${chars}`,
    character: chars,
    family: 'enlazada',
    baselineZone: first.baselineZone,
    anchors: {
      entry: first.anchors.entry,
      exit: {
        x: round2(second.anchors.exit.x + dx),
        y: round2(second.anchors.exit.y + dy),
      },
    },
    theme: first.theme,
    pathDefinition: {
      d,
      ideal,
      strokeWidth: first.pathDefinition.strokeWidth,
      checkpoints,
    },
    animationTimeline: timeline,
  }
}

/**
 * Enumerate EVERY ordered pair (i ≠ j, same zone, single-subpath members) from
 * a letter registry, in registry order — reversed pairs included. Pairs that
 * would violate the build guards are simply not offered. Returns the combined
 * `LetterConfig`s ready for the combo registry.
 */
export function buildOrderedPairs(letters: Record<string, LetterConfig>): LetterConfig[] {
  const entries = Object.entries(letters)
  const combos: LetterConfig[] = []
  for (const [char1, cfg1] of entries) {
    for (const [char2, cfg2] of entries) {
      if (char1 === char2) continue
      if (cfg1.baselineZone !== cfg2.baselineZone) continue
      if (isMultiSubpath(cfg1) || isMultiSubpath(cfg2)) continue
      combos.push(buildCombination([cfg1, cfg2]))
    }
  }
  return combos
}