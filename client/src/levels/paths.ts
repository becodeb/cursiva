// Parametric level-path generators (docs/08 section 5: "Los caminos de las
// Fases 1 y 2 se generan con funciones paramétricas (levels/paths.ts), no se
// escriben a mano: así se pueden retunear amplitud, ciclos y ancho sin
// redibujar nada"). Every generator returns an SVG path `d` in the fixed
// virtual space `viewBox="0 0 1000 600"` (docs/02 section 3) — a level path is
// retunable DATA, never a redrawn asset.
//
// PHASE 1 DOES NOT LIVE ON THE WRITING LINE (docs/01 phase 1, docs/08 section
// 5). The ruled lines mean nothing before phase 3, so a phase-1 route that sits
// in the 300-420 band is drawing noise the child has to filter out (docs/01
// principle 1) AND it trains only the fingertip. Phase 1 trains the whole arm,
// so its generators span the WHOLE 1000x600 sheet, roughly y=60 to y=540, at
// varied scales and orientations. The band constants below are therefore for
// PHASE 2 onward only.
//
// PHASE 2 KEEPS THE WRITING-BAND GEOMETRY, because guirnalda / colinas / bucles
// / crestas ARE letter shapes and their proportions against the pauta are the
// lesson. What changes is that the pauta is not DRAWN there (`surface: 'blank'`,
// docs/08 section 5), so the patterns are scaled 1.25× about the centre of the
// band they belong to: without visible rules to give them scale, a
// band-exact pattern reads small, and the child shrinks the movement to match.
//
//   guirnalda / colinas  300-420  →  285-435
//   bucles               180-420  →  150-450
//   crestas              200-420  →  172-448
//
// Ruled-line reference (docs/02 section 3), Y grows DOWNWARD so "up" is a
// DECREASING y:
//
//   180  techo de ascendentes (TOP)
//   300  línea media (MIDDLE)
//   420  LÍNEA BASE (BASELINE)
//   540  piso de descendentes (DESCENDER)
//
// Every emitted `d` is consumed by `flattenPathD` (svgLetter.ts), which needs
// at least 3 flattened points, so even the straight path is emitted as a
// multi-segment polyline.

/** Top ruled line — ceiling of the ascender zone. */
export const TOP = 180
/** Middle ruled line — x-height, top of the `a`/`c`/`o` body. */
export const MIDDLE = 300
/** Baseline — where the letters rest. */
export const BASELINE = 420
/** Descender line — floor of the descender zone. */
export const DESCENDER = 540

/** Round to 2 decimals — the `d` precision used across the letter pipeline. */
function r2(n: number): number {
  return Math.round(n * 100) / 100
}

/** Append an absolute cubic segment `C c1 c2 p` to a `d` string builder. */
function cubic(
  c1x: number,
  c1y: number,
  c2x: number,
  c2y: number,
  px: number,
  py: number,
): string {
  return ` C ${r2(c1x)} ${r2(c1y)} ${r2(c2x)} ${r2(c2y)} ${r2(px)} ${r2(py)}`
}

/** Append an absolute line segment `L p`. */
function line(px: number, py: number): string {
  return ` L ${r2(px)} ${r2(py)}`
}

/** Absolute move `M p` — always the first command of a generated path. */
function move(px: number, py: number): string {
  return `M ${r2(px)} ${r2(py)}`
}

/**
 * Alternating half-arch sinusoid shared by {@link wave} and {@link crests}.
 *
 * Each half period is ONE cubic whose control points sit at 1/3 and 2/3 of the
 * span with a vertical offset of `amplitude · 4/3`: that cubic has
 * `y(t) = mid − 3·A·h·t·(1−t)`, i.e. an exact extremum of `amplitude` at the
 * half-period midpoint and `x(t)` strictly linear. So the curve NEVER
 * overshoots the declared amplitude, and consecutive half-arches share their
 * end tangent — the joins are smooth, as a pre-cursive wave must be.
 *
 * `firstHalfUp` starts the first arch UPWARD (writing direction, left to
 * right): the child's hand leaves the start going up, never down.
 */
function alternatingArches(
  x0: number,
  x1: number,
  mid: number,
  amplitude: number,
  cycles: number,
  firstHalfUp: boolean,
): string {
  const halves = Math.max(1, Math.round(cycles * 2))
  const w = (x1 - x0) / halves
  const arm = (amplitude * 4) / 3
  let d = move(x0, mid)
  for (let i = 0; i < halves; i++) {
    const sx = x0 + i * w
    // Up-arch offsets are NEGATIVE (y grows downward); the sign alternates so
    // half-arches read crest, trough, crest, …
    const up = firstHalfUp ? i % 2 === 0 : i % 2 === 1
    const off = up ? -arm : arm
    d += cubic(sx + w / 3, mid + off, sx + (2 * w) / 3, mid + off, sx + w, mid)
  }
  return d
}

/** A point in the fixed 1000x600 virtual space. */
interface Vec {
  x: number
  y: number
}

/** Affine transform of a generated path (docs/08 section 5). */
export interface PathTransform {
  /** Uniform scale about {@link PathTransform.pivot}. Default 1. */
  scale?: number
  /**
   * Rotation in DEGREES about the pivot. The viewBox Y axis grows DOWNWARD, so
   * a POSITIVE angle reads clockwise on screen and a NEGATIVE one tilts the
   * path up to the right.
   */
  rotate?: number
  /** Translation applied AFTER the scale and the rotation. Default none. */
  translate?: Vec
  /** Fixed point of the scale and the rotation. Default: the sheet centre. */
  pivot?: Vec
}

/**
 * Affine transform of a path `d`, in the order `scale → rotate → translate`,
 * all about `pivot`.
 *
 * `transformPathD` (svgLetter.ts) already does translate+scale, but it cannot
 * ROTATE, and phase 1 needs orientation variety: the same wave tilted 20° is a
 * different wrist movement, not a different drawing (docs/01 principle 4,
 * "repetición variada"). Rewriting the generators per orientation would make
 * the geometry an asset again instead of retunable data, so the transform lives
 * here and composes with every generator.
 *
 * Only the absolute `M`/`L`/`C` alphabet the generators in this file emit is
 * accepted; anything else fails loud by name rather than being silently
 * dropped, which would ship a shorter path than the level declares.
 */
export function transformPath(d: string, o: PathTransform = {}): string {
  const scale = o.scale ?? 1
  const pivot = o.pivot ?? { x: 500, y: 300 }
  const translate = o.translate ?? { x: 0, y: 0 }
  const radians = ((o.rotate ?? 0) * Math.PI) / 180
  const cos = Math.cos(radians)
  const sin = Math.sin(radians)

  const tokenRe = /([A-Za-z])|(-?(?:\d*\.\d+|\d+\.?\d*)(?:[eE][-+]?\d+)?)/g
  let out = ''
  let pendingX: number | null = null
  let match: RegExpExecArray | null

  const map = (x: number, y: number): string => {
    const dx = (x - pivot.x) * scale
    const dy = (y - pivot.y) * scale
    const px = pivot.x + dx * cos - dy * sin + translate.x
    const py = pivot.y + dx * sin + dy * cos + translate.y
    return `${r2(px)} ${r2(py)}`
  }

  while ((match = tokenRe.exec(d)) !== null) {
    if (match[1] !== undefined) {
      const letter = match[1]
      if (letter !== 'M' && letter !== 'L' && letter !== 'C') {
        throw new Error(`transformPath: comando no soportado '${letter}'`)
      }
      out += `${out ? ' ' : ''}${letter}`
      continue
    }
    const value = Number(match[2])
    // Every M/L/C argument list is a flat run of (x, y) PAIRS, so pairing the
    // number stream transforms control points and endpoints alike.
    if (pendingX === null) {
      pendingX = value
    } else {
      out += ` ${map(pendingX, value)}`
      pendingX = null
    }
  }
  if (pendingX !== null) throw new Error('transformPath: coordenada impar en el path')
  return out
}

/**
 * Fase 1 `f1-travesia`, `f1-pelotas`, `f1-paseo` — the gross-motor route: one
 * long sweep from the BOTTOM-LEFT corner of the sheet to the TOP-RIGHT one,
 * bowed into a wide S.
 *
 * It is built as the straight diagonal `P0 → P1` plus a sinusoidal offset of
 * `bow` along the diagonal's NORMAL, so the whole shape is defined by its two
 * corners: move the corners and the route still spans exactly what it should.
 * `waves = 1` gives one out-and-back bow, i.e. a single S — the biggest single
 * gesture the sheet allows, which is the point of the first route: the arm
 * moves from the shoulder, not the finger (docs/01 phase 1). `waves = 0.5`
 * leaves the offset on ONE side for the whole run, so a level with `y0 === y1`
 * and a negative `bow` gets a single broad arch with no corner in it — the
 * readable route `f1-pelotas` needs, where the lesson is the timing and the
 * shape must not compete with it.
 */
export function sweep(
  o: {
    x0?: number
    y0?: number
    x1?: number
    y1?: number
    bow?: number
    waves?: number
  } = {},
): string {
  const x0 = o.x0 ?? 100
  const y0 = o.y0 ?? 520
  const x1 = o.x1 ?? 900
  const y1 = o.y1 ?? 90
  const bow = o.bow ?? 105
  const waves = o.waves ?? 1
  const dx = x1 - x0
  const dy = y1 - y0
  const len = Math.hypot(dx, dy) || 1
  // Unit normal of the diagonal.
  const nx = -dy / len
  const ny = dx / len
  const SAMPLES = 72
  let d = ''
  for (let i = 0; i <= SAMPLES; i++) {
    const t = i / SAMPLES
    const off = bow * Math.sin(2 * Math.PI * waves * t)
    const px = x0 + dx * t + nx * off
    const py = y0 + dy * t + ny * off
    d += i === 0 ? move(px, py) : line(px, py)
  }
  return d
}

/**
 * Fase 1 `f1-pasillo` — a corridor that DOUBLES BACK: one run left to right
 * across the top of the sheet, a half-turn on the right, and the return run
 * right to left along the bottom.
 *
 * This is the LONG route of phase 1 (docs/08 section 5). Length is the point:
 * an escort level asks the child to hold precision for a whole journey, and a
 * single diagonal is over before the hand has to work at holding it. The
 * half-turn adds the one thing a straight run cannot ask for — stop the
 * movement, reverse the direction, keep the ink off the wall — which is the
 * inhibition half of docs/01 phase 1 folded into the precision task.
 *
 * THE TURN RADIUS IS `(yBottom − yTop) / 2` BY CONSTRUCTION, so the two runs
 * are exactly one diameter apart and the half-turn joins them tangentially:
 * the child never meets a hairpin the corridor cannot contain. With the shipped
 * 130/470 band that radius is 170 against a 56px corridor, so the inner wall of
 * the turn still has a 142-unit radius — a wrist rotation, not a pivot.
 *
 * The runs are emitted as many short `L` steps (not one segment) so the
 * flattened polyline keeps a roughly uniform point density around the turn and
 * along the straights alike; the arc-length checkpoints depend on it.
 */
export function switchback(
  o: { x0?: number; x1?: number; yTop?: number; yBottom?: number } = {},
): string {
  const x0 = o.x0 ?? 120
  const x1 = o.x1 ?? 880
  const yTop = o.yTop ?? 130
  const yBottom = o.yBottom ?? 470
  const radius = (yBottom - yTop) / 2
  const cy = (yTop + yBottom) / 2
  // The turn bulges to `x1`, so the straight runs stop one radius short of it.
  const cx = x1 - radius
  const RUN_STEPS = 14
  const TURN_SAMPLES = 32

  let d = move(x0, yTop)
  // 1) top run, left to right.
  for (let i = 1; i <= RUN_STEPS; i++) {
    d += line(x0 + ((cx - x0) * i) / RUN_STEPS, yTop)
  }
  // 2) half-turn on the right: theta sweeps -90 degrees to +90 degrees, so the
  // arc leaves the top run heading right and rejoins the bottom run heading
  // left. Y grows downward, so an increasing angle reads clockwise on screen.
  for (let i = 1; i <= TURN_SAMPLES; i++) {
    const angle = -Math.PI / 2 + (Math.PI * i) / TURN_SAMPLES
    d += line(cx + radius * Math.cos(angle), cy + radius * Math.sin(angle))
  }
  // 3) bottom run, right to left.
  for (let i = 1; i <= RUN_STEPS; i++) {
    d += line(cx - ((cx - x0) * i) / RUN_STEPS, yBottom)
  }
  return d
}

/**
 * A horizontal line. Emitted as 24 `L` steps (not a single segment) so the
 * flattened polyline is dense enough for arc-length checkpoint spacing and for
 * the perpendicular ideal band.
 *
 * No level ships it any more: it is the catalog's DEGRADATION fallback
 * (catalog.ts) for a level whose letter left the registry, so that an authoring
 * mistake produces an easy level instead of a blank app.
 */
export function straight(o: { x0?: number; x1?: number; y?: number } = {}): string {
  const x0 = o.x0 ?? 140
  const x1 = o.x1 ?? 860
  const y = o.y ?? 360
  const STEPS = 24
  let d = move(x0, y)
  for (let i = 1; i <= STEPS; i++) {
    d += line(x0 + ((x1 - x0) * i) / STEPS, y)
  }
  return d
}

/**
 * Fase 1 `f1-ondas` — a smooth sinusoid of `cycles` periods around `y`,
 * STARTING UPWARD. Extrema land exactly at `y ∓ amplitude`.
 *
 * Centred on the SHEET (y = 300), not on the baseline, and only two cycles wide
 * so each arch is a broad wrist rotation rather than a fingertip wiggle. The
 * catalog tilts it with {@link transformPath}: the curve and its orientation
 * are two separate knobs.
 */
export function wave(
  o: { x0?: number; x1?: number; y?: number; amplitude?: number; cycles?: number } = {},
): string {
  const x0 = o.x0 ?? 120
  const x1 = o.x1 ?? 880
  const y = o.y ?? 300
  const amplitude = o.amplitude ?? 170
  const cycles = o.cycles ?? 2
  return alternatingArches(x0, x1, y, amplitude, cycles, true)
}

/** One cycle of a varied wave ({@link waveVaried}). */
export interface WaveCycle {
  /** Horizontal span of this FULL cycle — crest AND trough — in viewBox units. */
  width: number
  /** How far this cycle's extrema sit from the centreline, in viewBox units. */
  amplitude: number
}

/**
 * `detective-mode` duck trail 3 — a wave whose AMPLITUDE varies per cycle
 * ("variación de amplitud", `docs/13` §2), the per-cycle sibling of
 * {@link garlandVaried}: same accumulate-`x` loop, same `M`/`C`-only
 * alphabet, same crest-then-trough construction as {@link alternatingArches},
 * restated per cycle instead of once for the whole route.
 *
 * A uniform `cycles` list — every entry sharing `wave`'s own half-width and
 * amplitude — MUST reproduce `wave`'s `d` string byte for byte (the same
 * proof `garlandVaried` already carries): the two constructions agree
 * exactly on those literals, and `r2`'s 2-decimal rounding is what absorbs
 * the difference in general.
 *
 * With per-cycle widths, `wave`'s `x1` and single `amplitude` stop meaning
 * anything — the span is the SUM of the widths — so this is a separate
 * generator rather than a widened `wave` (design.md §1). Consecutive cycles
 * of DIFFERING amplitude meet at a real kink (C1 continuity holds only
 * within a cycle, where `off' = −off`); that kink is accepted and named at
 * the call site, not hidden here.
 */
export function waveVaried(
  o: { x0?: number; y?: number; cycles?: readonly WaveCycle[] } = {},
): string {
  const x0 = o.x0 ?? 120
  const y = o.y ?? 300
  const cycles = o.cycles?.length ? o.cycles : [{ width: 380, amplitude: 170 }]
  let x = x0
  let d = move(x, y)
  for (const c of cycles) {
    const w = Math.max(1, c.width) / 2 // one HALF-arch
    const arm = (c.amplitude * 4) / 3 // `alternatingArches`'s own offset
    // Crest first, then trough — `wave`'s `firstHalfUp`, restated per cycle so
    // the hand always leaves a cycle going UP and the family never inverts
    // mid-route.
    for (const off of [-arm, arm]) {
      d += cubic(x + w / 3, y + off, x + (2 * w) / 3, y + off, x + w, y)
      x += w
    }
  }
  return d
}

/**
 * Radius of curvature at a {@link waveVaried}/`wave` crest, in viewBox units:
 * `alternatingArches`'s cubic has `x(t) = sx + w·t` exactly and
 * `y(t) = mid + 3·off·t·(1−t)` with `off = 4A/3`, so at the crest (`t = ½`)
 * `x' = w`, `x'' = 0`, `y' = 0`, `|y''| = 6|off| = 8A`, giving
 * `κ = 8A/w²` and `R = w²/(8A)` (design.md §2). This is NOT
 * {@link uTurnRadius}'s formula — `garland`'s control points sit at 15%/85%
 * of the cycle (`x'(½) = 1.275w`), while the wave's sit at 1/3 and 2/3
 * (`x'(½) = w` exactly) — two generators, two closed forms.
 */
export function waveCrestRadius(halfWidth: number, amplitude: number): number {
  return halfWidth ** 2 / (8 * amplitude)
}

/**
 * Corner-clearance closed form (`detective-mode` design, "corner clearance is
 * one pure closed-form helper"): a ROUNDED join (`strokeLinejoin="round"`)
 * eats `(w/2)/tan(interiorDeg/2)` of EACH incident leg, so the readable flat
 * left on a leg of length `legLength` after BOTH its corners consume their
 * share is `legLength − 2·(w/2)/tan(interiorDeg/2)`. This helper asserts that
 * flat is at least the corridor width itself, so two consecutive rounded
 * corners never merge into one filled shape — the same failure mode already
 * documented for {@link spiral} below. At the square wave's 90° corners this
 * reduces to `run ≥ 2·corridorWidth`.
 *
 * A PREDICATE, not a throw: the failure IS the useful signal here — a level
 * author who feeds it a merging candidate must see `false` and a test must be
 * able to assert that directly, not catch an exception.
 */
export function cornerClearance(legLength: number, interiorDeg: number, w: number): boolean {
  const halfAngle = ((interiorDeg / 2) * Math.PI) / 180
  const consumedPerCorner = w / 2 / Math.tan(halfAngle)
  return legLength - 2 * consumedPerCorner >= w
}

/**
 * Arm-to-arm clearance for a parallel-arm wave (`detective-mode` design C5):
 * `amplitude` is the offset from the centreline — the SAME convention {@link
 * wave} already documents ("Extrema land exactly at `y ∓ amplitude`") — so two
 * consecutive arms of a wave sit `2·amplitude` apart. This asserts that gap
 * leaves at least the same wall-to-corridor ratio the shipped {@link spiral}
 * keeps between its turns (~50 of wall against a 70 corridor, `catalog.ts:329`):
 * `2·amplitude − w ≥ 0.7·w`.
 *
 * Reading `amplitude` as a PEAK-TO-PEAK span instead of an offset halves the
 * real gap and fails this check — that misreading is exactly the bug this
 * helper exists to catch, not a case it silently tolerates.
 */
export function armClearance(amplitude: number, w: number): boolean {
  return 2 * amplitude - w >= 0.7 * w
}

/**
 * Alternating half-period ZIGZAG shared by {@link triangularWave}: the linear
 * sibling of {@link alternatingArches}. Each half period is two straight `L`
 * segments — mid-line to the extremum at the half's midpoint, extremum back to
 * the mid-line — so every apex lands EXACTLY at `mid ∓ amplitude` (no overshoot
 * possible, unlike a spline) and consecutive half-periods share their mid-line
 * endpoint. `firstHalfUp` mirrors {@link alternatingArches}: the child's hand
 * leaves the start going up, never down.
 */
function alternatingZigzag(
  x0: number,
  x1: number,
  mid: number,
  amplitude: number,
  cycles: number,
  firstHalfUp: boolean,
): string {
  const halves = Math.max(1, Math.round(cycles * 2))
  const w = (x1 - x0) / halves
  let d = move(x0, mid)
  for (let i = 0; i < halves; i++) {
    const up = firstHalfUp ? i % 2 === 0 : i % 2 === 1
    const apexY = up ? mid - amplitude : mid + amplitude
    d += line(x0 + i * w + w / 2, apexY)
    d += line(x0 + (i + 1) * w, mid)
  }
  return d
}

/**
 * `detective-mode` trail 3 (footprints) — a triangular wave: the SHARP-CORNER
 * sibling of {@link wave}, built from straight `L` segments instead of cubic
 * arches, so the elbow at every apex is a real corner rather than a rounded
 * crest. `amplitude` is the offset from the centreline, matching {@link wave}'s
 * shipped convention (`y ∓ amplitude`, arm-to-arm gap `2·amplitude` —
 * `detective-mode` design C5), so its extrema and {@link wave}'s land in
 * exactly the same place for the same inputs.
 *
 * Emits ONLY `M`/`L` (level-engine spec, "Generators emit only supported
 * commands") — there is no curve to approximate, a triangle wave IS straight
 * lines.
 */
export function triangularWave(
  o: { x0?: number; x1?: number; y?: number; amplitude?: number; cycles?: number } = {},
): string {
  const x0 = o.x0 ?? 120
  const x1 = o.x1 ?? 880
  const y = o.y ?? 300
  const amplitude = o.amplitude ?? 170
  const cycles = o.cycles ?? 2
  return alternatingZigzag(x0, x1, y, amplitude, cycles, true)
}

/**
 * `detective-mode` trail 4 (feathers) — a square wave: flat runs of length
 * `run` at `mid ∓ amplitude`, joined by vertical transitions. `amplitude` is
 * the offset from the centreline, matching {@link wave}'s shipped convention
 * (`y ∓ amplitude`, arm-to-arm gap `2·amplitude` — `detective-mode` design
 * C5), so a wall of `2·amplitude − corridorWidth` separates two parallel arms,
 * asserted by {@link armClearance}.
 *
 * `run` is a first-class parameter, not derived from `x0`/`x1` the way every
 * other generator here derives its span: the level-engine spec ties `run`
 * directly to `corridorWidth` via {@link cornerClearance} (`run ≥
 * 2·corridorWidth`, the ROUNDED-join consumption at each of the flat's two 90°
 * corners), so the caller must be able to set it independently of how many
 * cycles the trail runs. Every cycle spans `2·run` — one flat top, one flat
 * bottom — so the generator's own default width (`run 190 · cycles 2 · 2 =
 * 760`) reproduces the worked example `x ∈ [120, 880]` design C5 checks
 * against.
 *
 * Emits ONLY `M`/`L` (level-engine spec, "Generators emit only supported
 * commands"): the corners are corners ON PURPOSE — the whole feature under
 * test is whether they read as corners once `strokeLinejoin="round"` rounds
 * them, not whether the path itself curves.
 */
export function squareWave(
  o: {
    x0?: number
    mid?: number
    amplitude?: number
    run?: number
    cycles?: number
  } = {},
): string {
  const x0 = o.x0 ?? 120
  const mid = o.mid ?? 300
  const amplitude = o.amplitude ?? 110
  const run = o.run ?? 190
  const cycles = o.cycles ?? 2
  const top = mid - amplitude
  const bottom = mid + amplitude
  let x = x0
  let d = move(x, top)
  for (let i = 0; i < cycles; i++) {
    x += run
    d += line(x, top) // end of the flat top run — a 90° corner
    d += line(x, bottom) // vertical transition down — the paired 90° corner
    x += run
    d += line(x, bottom) // end of the flat bottom run — a 90° corner
    d += line(x, top) // vertical transition up — the paired 90° corner
  }
  return d
}

/**
 * Fase 1 `f1-espiral` — an Archimedean spiral sampled as a polyline, traced
 * from the OUTSIDE INWARD (radius `rStart` → `rEnd`).
 *
 * `clockwise` defaults to FALSE on purpose (docs/08 section 5): the
 * counter-clockwise turn is the same movement the `a`/`c`/`o` family needs, so
 * it is trained before it has a name. With Y growing downward, an INCREASING
 * angle in `(cx + r·cosθ, cy + r·sinθ)` reads clockwise on screen, so the
 * counter-clockwise direction sweeps the angle NEGATIVE.
 *
 * It is CENTRED ON THE SHEET (500, 300) and sized to it, not to the writing
 * band: `rStart = 260` puts its widest arm 260 units from the sheet centre. A
 * spiral scaled to the 120-unit x-height would be a fingertip movement; this
 * one is an arm movement that happens to end in a wrist movement.
 *
 * THE WALLS ARE THE LEVEL. Consecutive turns are `(rStart − rEnd) / turns`
 * apart radially, and the corridor eats `corridorWidth` of that gap; whatever
 * is left is the wall the child has to stay inside. The defaults keep a radial
 * gap of `(260 − 50) / 1.75 = 120` against the shipped 70px corridor (docs/08
 * section 5), so ~50 units of bone-coloured wall survive between arms. Raising
 * `turns` or narrowing the span past that merges the arms into a filled disc
 * and the maze stops being a maze.
 */
export function spiral(
  o: {
    cx?: number
    cy?: number
    rStart?: number
    rEnd?: number
    turns?: number
    clockwise?: boolean
  } = {},
): string {
  const cx = o.cx ?? 500
  const cy = o.cy ?? 300
  const rStart = o.rStart ?? 260
  const rEnd = o.rEnd ?? 50
  const turns = o.turns ?? 1.75
  const clockwise = o.clockwise ?? false
  const dir = clockwise ? 1 : -1
  // ≥ 40 samples per turn (48 here) so the polyline reads as a curve, not a
  // polygon, at every checkpoint radius.
  const samples = Math.max(40, Math.ceil(turns * 48))
  const sweep = dir * 2 * Math.PI * turns
  let d = ''
  for (let i = 0; i <= samples; i++) {
    const t = i / samples
    const radius = rStart + (rEnd - rStart) * t
    const angle = sweep * t
    const px = cx + radius * Math.cos(angle)
    const py = cy + radius * Math.sin(angle)
    d += i === 0 ? move(px, py) : line(px, py)
  }
  return d
}

/**
 * Fase 2 `f2-guirnalda` — the cursive `u u u u` garland: repeated arcs that DIP
 * DOWN, each cycle leaving `yTop`, reaching `yBottom` and returning to `yTop`.
 *
 * The control points are pushed BELOW `yBottom` (to `(4·yBottom − yTop)/3`, the
 * exact value that puts the symmetric cubic's midpoint on `yBottom`) and spread
 * horizontally, so the bottom of every cycle is a rounded U — never a V. A V
 * bottom would teach a corner where cursive needs a turn.
 */
export function garland(
  o: { x0?: number; x1?: number; yTop?: number; yBottom?: number; cycles?: number } = {},
): string {
  const x0 = o.x0 ?? 140
  const x1 = o.x1 ?? 860
  const yTop = o.yTop ?? 285
  const yBottom = o.yBottom ?? 435
  const cycles = Math.max(1, o.cycles ?? 4)
  const w = (x1 - x0) / cycles
  // Symmetric cubic midpoint: (yTop + 3·cy + 3·cy + yTop)/8 = yBottom.
  const cy = (4 * yBottom - yTop) / 3
  let d = move(x0, yTop)
  for (let i = 0; i < cycles; i++) {
    const sx = x0 + i * w
    d += cubic(sx + w * 0.15, cy, sx + w * 0.85, cy, sx + w, yTop)
  }
  return d
}

/** One cycle of a varied garland ({@link garlandVaried}). */
export interface GarlandCycle {
  /** Horizontal span of this U, in viewBox units. */
  width: number
  /** How far below `yTop` this U dips, in viewBox units. */
  depth: number
}

/**
 * Nivel 3 desafío 3 — a garland whose U's differ in SIZE and in SPACING
 * ("variación de tamaño y distancia entre las U", docs/11 Nivel 3).
 *
 * Identical rounded-U cubic to {@link garland}: the control points go to
 * `(4·(yTop + depth) − yTop)/3`, the exact value that puts the symmetric
 * cubic's midpoint on `yTop + depth`, and sit at 15% / 85% of the cycle's own
 * width. A uniform `cycles` list reproduces `garland`'s `d` string exactly
 * (`paths.test.ts`), which is what proves nothing was re-derived.
 *
 * With per-cycle widths, `x1` and `yBottom` stop meaning anything — the span
 * is the SUM of the widths and the depth is per cycle — so this is a
 * separate generator rather than a widened `garland` (design.md §2).
 *
 * Emits ONLY absolute `M` and `C`: {@link transformPath} (`paths.ts:172-174`)
 * throws on any other command, and `buildLevel.ts`'s `layOutPaths` runs every
 * level through it.
 */
export function garlandVaried(
  o: { x0?: number; yTop?: number; cycles?: readonly GarlandCycle[] } = {},
): string {
  const x0 = o.x0 ?? 140
  const yTop = o.yTop ?? 285
  const cycles = o.cycles?.length ? o.cycles : [{ width: 180, depth: 150 }]
  let x = x0
  let d = move(x, yTop)
  for (const c of cycles) {
    const w = Math.max(1, c.width)
    const cy = (4 * (yTop + c.depth) - yTop) / 3
    d += cubic(x + w * 0.15, cy, x + w * 0.85, cy, x + w, yTop)
    x += w
  }
  return d
}

/**
 * Radius of curvature at the BOTTOM of a garland/hills U (`t = ½` of one
 * cycle's cubic), in viewBox units. Derived from the generators' own
 * symmetric cubic, not measured: at the bottom of a U, `x'=1.275·w`, `x''=0`,
 * `y'=0`, `y''=−8·depth`, so `κ = 8·depth / (1.275·w)²` and this returns
 * `1/κ` (design.md §2).
 *
 * Used to assert the authoring predicate `uTurnRadius(width, depth) >
 * corridorWidth/2 − BAND_INSET` for every garland/hills level at its
 * AUTHORED width (`catalog.test.ts`): below that radius, `pushBand`'s fixed
 * `±half` offset (`buildLevel.ts`) folds through itself on the concave side
 * of the turn.
 */
export function uTurnRadius(width: number, depth: number): number {
  return (1.275 * width) ** 2 / (8 * depth) // ≈ 0.2032·w²/depth
}

/**
 * Fase 2 `f2-colinas` — the cursive `n n n n` hills: the mirror of
 * {@link garland}. Each cycle leaves `yBottom`, RISES to `yTop` and returns to
 * `yBottom`, with the control points pushed ABOVE `yTop` for a rounded crest.
 */
export function hills(
  o: { x0?: number; x1?: number; yTop?: number; yBottom?: number; cycles?: number } = {},
): string {
  const x0 = o.x0 ?? 140
  const x1 = o.x1 ?? 860
  const yTop = o.yTop ?? 285
  const yBottom = o.yBottom ?? 435
  const cycles = Math.max(1, o.cycles ?? 4)
  const w = (x1 - x0) / cycles
  const cy = (4 * yTop - yBottom) / 3
  let d = move(x0, yBottom)
  for (let i = 0; i < cycles; i++) {
    const sx = x0 + i * w
    d += cubic(sx + w * 0.15, cy, sx + w * 0.85, cy, sx + w, yBottom)
  }
  return d
}

/**
 * Fase 2 `f2-bucles` — the cursive `l l l` loops: tall ascenders that CROSS
 * THEMSELVES. The self-crossing is the whole point — that is what a cursive `l`
 * is, and a loop drawn without it is a stick.
 *
 * Each cycle is four segments over its width `w`:
 *  1. upstroke — baseline up and to the right, to `yTop + 0.10·H`;
 *  2. the top — over `yTop` and swinging back LEFT, to `x + 0.14·w`;
 *  3. downstroke — down and to the RIGHT, crossing the upstroke on the way,
 *     landing on the baseline at `x + 0.62·w`;
 *  4. baseline run to the next cycle start.
 *
 * The horizontal reversal in segment 2 (x decreasing) is the geometric
 * signature of the crossing.
 */
export function loops(
  o: { x0?: number; x1?: number; yBase?: number; yTop?: number; cycles?: number } = {},
): string {
  const x0 = o.x0 ?? 160
  const x1 = o.x1 ?? 840
  const yBase = o.yBase ?? 450
  const yTop = o.yTop ?? 150
  const cycles = Math.max(1, o.cycles ?? 3)
  const w = (x1 - x0) / cycles
  const H = yBase - yTop
  let d = move(x0, yBase)
  for (let i = 0; i < cycles; i++) {
    const sx = x0 + i * w
    // 1) upstroke, leaning right as it climbs.
    d += cubic(
      sx + w * 0.1,
      yBase - H * 0.35,
      sx + w * 0.3,
      yTop + H * 0.42,
      sx + w * 0.38,
      yTop + H * 0.1,
    )
    // 2) over the top and back to the LEFT (controls above yTop keep the apex
    // itself ON the top line instead of short of it).
    d += cubic(
      sx + w * 0.42,
      yTop - H * 0.06,
      sx + w * 0.18,
      yTop - H * 0.06,
      sx + w * 0.14,
      yTop + H * 0.3,
    )
    // 3) downstroke: crosses the upstroke, then eases onto the baseline.
    d += cubic(sx + w * 0.18, yTop + H * 0.625, sx + w * 0.42, yBase, sx + w * 0.62, yBase)
    // 4) baseline run into the next loop, subdivided so the flattened polyline
    // keeps a roughly uniform point density across the whole path.
    const runFrom = sx + w * 0.62
    const runSteps = 6
    for (let s = 1; s <= runSteps; s++) {
      d += line(runFrom + ((sx + w - runFrom) * s) / runSteps, yBase)
    }
  }
  return d
}

/**
 * The tightest radius of curvature on one {@link loops} cycle's own "top"
 * segment — the swing from the upstroke's own end to the downstroke's own
 * start, `y` measured from `yTop` (so this is scale-invariant in `y`
 * position, only `width`/`height` matter) — found by SAMPLING the cubic's
 * exact calculus derivatives at 1000 points along it, not by a closed form
 * (`odd/tasks/promised-animals.md` P4, the monkeys' own "does the hole stay
 * open" guard).
 *
 * WHY SAMPLED, NOT DERIVED. {@link uTurnRadius}/{@link ovalTurnRadius} both
 * get a clean closed form because their own curves are SYMMETRIC about
 * their tightest point (`t = ½` of a garland U; the end of an ellipse's own
 * major axis) — the derivative of curvature is zero there by symmetry alone,
 * with no calculus needed to find WHERE the extremum sits. The "top"
 * segment's four control points are NOT symmetric (segment 2 of `loops`,
 * above: "swinging back LEFT" is a one-sided correction, not a mirror of
 * the upstroke it continues), so its tightest point sits at whatever `t`
 * happens to minimise `radius(t)` — measured here at `t ≈ 0.34` for the
 * shipped `f2-bucles` size, not `t = ½` — and finding that exactly means
 * either solving a quintic for `dκ/dt = 0` or sampling densely enough that
 * the true minimum cannot hide between two adjacent samples. 1000 steps
 * measured stable to 3 significant figures against 4000 on every size this
 * function is actually called with (checked, not assumed) — the same
 * "measure it" discipline `scripts/art/png.py`'s `sample_spine` already
 * uses for a curve too irregular to have earned a formula of its own.
 *
 * WHY THE RESULT IS SMALL. Measured on the shipped `f2-bucles` size
 * (`width ≈ 227`, `height = 300`): `loopHoleRadius(227, 300) ≈ 10.9`. That
 * is short of `corridorWidth/2 − BAND_INSET` (34, at `f2-bucles`'
 * `corridorWidth: 80`) by a wide margin — the `uTurnRadius`-style STRICT
 * "the corridor's own concave edge never folds through itself" bound a
 * garland/oval level is held to is UNREACHABLE here at any `width`/`height`
 * this app's 1000×600 sheet can hold (scaling the shape enough to clear it
 * would need a loop several sheets tall), which is exactly what a
 * self-crossing shape being asked to leave "a real hole", rather than "an
 * uncrossed edge that never doubles back on itself", should be expected to
 * mean: {@link loopHoleClearance}, below, asks a DIFFERENT, achievable
 * question instead.
 */
export function loopHoleRadius(width: number, height: number): number {
  const p0 = { x: width * 0.38, y: height * 0.1 }
  const c1 = { x: width * 0.42, y: -height * 0.06 }
  const c2 = { x: width * 0.18, y: -height * 0.06 }
  const p3 = { x: width * 0.14, y: height * 0.3 }
  const STEPS = 1000
  let minRadius = Infinity
  for (let i = 1; i < STEPS; i++) {
    const t = i / STEPS
    const mt = 1 - t
    const xPrime = 3 * mt * mt * (c1.x - p0.x) + 6 * mt * t * (c2.x - c1.x) + 3 * t * t * (p3.x - c2.x)
    const yPrime = 3 * mt * mt * (c1.y - p0.y) + 6 * mt * t * (c2.y - c1.y) + 3 * t * t * (p3.y - c2.y)
    const xDouble = 6 * mt * (c2.x - 2 * c1.x + p0.x) + 6 * t * (p3.x - 2 * c2.x + c1.x)
    const yDouble = 6 * mt * (c2.y - 2 * c1.y + p0.y) + 6 * t * (p3.y - 2 * c2.y + c1.y)
    const denominator = (xPrime * xPrime + yPrime * yPrime) ** 1.5
    if (denominator < 1e-9) continue
    const curvature = Math.abs(xPrime * yDouble - yPrime * xDouble) / denominator
    if (curvature === 0) continue
    const radius = 1 / curvature
    if (radius < minRadius) minRadius = radius
  }
  return minRadius
}

/**
 * `f2-bucles`' own measured `loopHoleRadius(width, height) / corridorWidth`
 * — `loopHoleRadius((840 − 160) / 3, 300) / 80`, restated as a literal
 * rather than computed at module load, so this file's only runtime cost is
 * the one call {@link loopHoleClearance} itself makes. `loopHoleRadius`'s
 * own header explains why an absolute bound is unreachable for this shape;
 * this is the achievable question instead — "at least as open,
 * proportionally, as the loop already shipping" — checked against
 * `catalog.test.ts`'s own re-derivation of the same call, not trusted as a
 * bare number.
 */
export const F2_BUCLES_HOLE_RATIO = 0.1364

/**
 * Whether a {@link loops} cycle at this `width`/`height` keeps a hole at
 * least as open, proportionally, as `f2-bucles`' own shipped one, once a
 * corridor of `corridorWidth` is painted around it — `loopHoleRadius(width,
 * height) / corridorWidth`, floored a hair under {@link
 * F2_BUCLES_HOLE_RATIO} (0.12, not 0.1364) so the LAST, tightest level of a
 * new four-level family can be genuinely harder than the one level already
 * shipping without this guard refusing it outright — the same allowance
 * `catalog.test.ts`'s own `uTurnRadius` table gives `f2-agua3`'s own
 * worst cycle (a documented 4.5-unit margin, not zero).
 */
export function loopHoleClearance(width: number, height: number, corridorWidth: number): boolean {
  return loopHoleRadius(width, height) / corridorWidth >= 0.12
}

/**
 * `docs/13` §2's "montañitas cortas y sucesivas" / "picos altos y
 * empinados" — a ridge of peaks over a ground line. The linear sibling of
 * {@link waveVaried}, and the RIDGE sibling of {@link triangularWave}: a
 * wave alternates about a centreline, a ridge only ever rises from `base`.
 * That distinction is not cosmetic — `alternatingZigzag` alternates SIDES
 * by index, so under the phase-1 arm guard (`minY < 180` AND `maxY > 420`)
 * a wave's "short" apexes are exactly the ones the guard forces tall, and
 * "alta - baja" is undrawable.
 *
 * `heights[i]` is peak `i`'s rise ABOVE `base`, so a peak's `y` is
 * `base − heights[i]` exactly (no overshoot is possible — these are
 * straight lines). Emits ONLY `M`/`L`.
 */
export function peakRidge(
  o: { x0?: number; x1?: number; base?: number; heights?: readonly number[] } = {},
): string {
  const x0 = o.x0 ?? 90
  const x1 = o.x1 ?? 910
  const base = o.base ?? 480
  const heights = o.heights?.length ? o.heights : [320, 170, 320]
  const n = heights.length
  const w = (x1 - x0) / n
  let d = move(x0, base)
  for (let i = 0; i < n; i++) {
    d += line(x0 + (i + 0.5) * w, base - heights[i])
    d += line(x0 + (i + 1) * w, base)
  }
  return d
}

/**
 * The widest corridor a {@link peakRidge} can carry before two rounded
 * joins (`strokeLinejoin="round"`) merge into one filled shape —
 * `docs/13` §4's "medir el límite de fusión de esquinas", as a number
 * rather than a promise.
 *
 * EXACT, not conservative: each straight run is charged its own two
 * corners' consumption `(w/2)/tan(θ/2)`, never one angle twice. It reduces
 * to {@link cornerClearance}'s closed form exactly when the two incident
 * angles are equal, which is what the uniform-ridge row of `paths.test.ts`
 * asserts. An END corner (the route's first or last vertex) contributes
 * zero consumption.
 */
export function peakRidgeCorridorLimit(
  o: { x0?: number; x1?: number; heights?: readonly number[] } = {},
): number {
  const x0 = o.x0 ?? 90
  const x1 = o.x1 ?? 910
  const heights = o.heights?.length ? o.heights : [320, 170, 320]
  const n = heights.length
  const r = (x1 - x0) / (2 * n)

  // Full interior angle at peak i.
  const peakAngle = heights.map((h) => 2 * Math.atan(r / h))

  // Corner angle at route vertex v (0 = start valley, 2n = end valley,
  // odd = a peak, even interior = a valley between two peaks). `null` marks
  // an END corner, which contributes zero consumption.
  const cornerAngle = (v: number): number | null => {
    if (v === 0 || v === 2 * n) return null
    if (v % 2 === 1) return peakAngle[(v - 1) / 2]
    const j = v / 2
    return (peakAngle[j - 1] + peakAngle[j]) / 2
  }
  const consumption = (angle: number | null): number =>
    angle === null ? 0 : 1 / (2 * Math.tan(angle / 2))

  let limit = Infinity
  for (let v = 0; v < 2 * n; v++) {
    const h = heights[Math.floor(v / 2)]
    const legLength = Math.sqrt(r * r + h * h)
    const denom = 1 + consumption(cornerAngle(v)) + consumption(cornerAngle(v + 1))
    limit = Math.min(limit, legLength / denom)
  }
  return limit
}

/**
 * `docs/13` §8 row E — one HALF period of a {@link spineWave}: a crest OR a
 * trough. `width` is this half's own horizontal span, viewBox units.
 * `rise` is the SIGNED offset of this half's extremum from the centreline —
 * NEGATIVE is UP (y grows downward), matching {@link alternatingArches}'s own
 * sign convention. Unlike {@link waveVaried}'s {@link WaveCycle} (one
 * amplitude per FULL cycle, symmetric crest/trough), each half here carries
 * its OWN independent width and rise, because it is FITTED to a hand-drawn
 * spine's real, asymmetric wiggle rather than authored.
 */
export interface SpineHalf {
  /** Horizontal span of this HALF period, viewBox units. */
  width: number
  /** Signed offset of this half's extremum from the centreline. NEGATIVE is
   *  UP (y grows downward), matching `alternatingArches`'s own sign. */
  rise: number
}

/**
 * `docs/13` §8 row E — a wave whose every HALF period carries its own width
 * and its own signed rise, because it is FITTED to a hand-drawn snake rather
 * than authored. The per-half sibling of {@link waveVaried}, which is itself
 * the per-cycle sibling of {@link wave}: same accumulate-`x` loop, same
 * `M`/`C`-only alphabet, same cubic. A `halves` list that alternates
 * `-arm, +arm` at a uniform width reproduces `waveVaried`'s `d` string BYTE
 * FOR BYTE, and `waveVaried`'s uniform list reproduces `wave`'s — the same
 * three-generation proof `garlandVaried` already carries (`paths.test.ts`).
 *
 * Consecutive halves of differing rise meet at a real kink (C1 continuity
 * holds only within a half). On a fitted spine that kink is the DRAWING's,
 * not the generator's, which is the whole point of fitting.
 */
export function spineWave(
  o: { x0?: number; y?: number; halves?: readonly SpineHalf[] } = {},
): string {
  const x0 = o.x0 ?? 120
  const y = o.y ?? 300
  const halves = o.halves?.length
    ? o.halves
    : [
        { width: 190, rise: -170 },
        { width: 190, rise: 170 },
      ]
  let x = x0
  let d = move(x, y)
  for (const h of halves) {
    const w = Math.max(1, h.width)
    // `alternatingArches`'s own closed form restated per half: `off = 4A/3`
    // for a signed rise A gives `y(t) = y + 3·off·t(1−t)`, exactly `y` at
    // `t = 0, 1` and exactly `y + rise` at `t = ½` — no overshoot possible.
    const off = (h.rise * 4) / 3
    d += cubic(x + w / 3, y + off, x + (2 * w) / 3, y + off, x + w, y)
    x += w
  }
  return d
}

/**
 * `docs/13` §8 row E, `fix-snakes-true-alignment` — a centreline threaded
 * through MEASURED points rather than fitted to a formula: `M`/`L` only, one
 * line segment per consecutive pair. The sibling of {@link spineWave} for a
 * hand-drawn body whose true wiggle is not well summarized by a five-number
 * closed form (a fitted formula's own residual only measures its fit against
 * the data it was reduced FROM, not against where a caller anchors the
 * replay — the bug a dense, directly-stored polyline has no room to
 * reproduce, because there is nothing left to re-derive: the points already
 * ARE the path). Needs at least 2 points, same as every generator here needs
 * at least one real segment.
 */
export function spinePolyline(points: readonly Vec[]): string {
  if (points.length < 2) throw new Error('spinePolyline: at least 2 points required')
  let d = move(points[0].x, points[0].y)
  for (let i = 1; i < points.length; i++) d += line(points[i].x, points[i].y)
  return d
}

/**
 * Fase 2 `f2-crestas` — large waves spanning the FULL ruled height: the same
 * alternating-arch construction as {@link wave}, centred on the midpoint of
 * `[yTop, yBottom]` with amplitude `(yBottom − yTop)/2`, so the crests land
 * exactly on `yTop` and the troughs exactly on `yBottom`. Starts UPWARD from
 * the midline.
 */
export function crests(
  o: { x0?: number; x1?: number; yTop?: number; yBottom?: number; cycles?: number } = {},
): string {
  const x0 = o.x0 ?? 120
  const x1 = o.x1 ?? 880
  const yTop = o.yTop ?? 172
  const yBottom = o.yBottom ?? 448
  const cycles = o.cycles ?? 3
  const mid = (yTop + yBottom) / 2
  return alternatingArches(x0, x1, mid, (yBottom - yTop) / 2, cycles, true)
}

/**
 * The Ola letter family's own closed turn (`docs/01` §8: `c a d g q o`;
 * `odd/tasks/promised-animals.md` P3, the turtles' own generator) — no
 * earlier generator draws it: {@link spiral} is reserved for the snail (an
 * open, ever-tightening curve, not a repeated closed ring), and every other
 * shape here is an open wave/ridge/loop that never returns to its own start.
 *
 * `count` closed ovals, left to right on one shared baseline `cy`, each one
 * a standalone counter-clockwise ring — the exact motion a child is taught
 * for `o`/`a`: start upper-right, sweep UP AND LEFT over the top, DOWN the
 * left side, AROUND the bottom, UP the right side, back to the start. A
 * short connecting curve runs from one ring's start point to the next's,
 * arcing gently upward so the join reads as "along the top", the way a
 * cursive `oo` lifts only slightly between letters rather than dropping to
 * the baseline and climbing again.
 *
 * WHERE EACH RING STARTS. Real cursive does not start an `o` at 12 or 3
 * o'clock — it starts around "1 o'clock", partway from the top toward the
 * right, so the very first movement is already the up-and-left sweep this
 * function's whole point is to teach. Clock position `h` (0 = top, clockwise
 * increasing, matching this app's `y`-down screen space) maps to viewBox
 * point `(cx + rx·sin(h·30°), cy − ry·cos(h·30°))` — `h = 0` is `(cx, cy −
 * ry)` (12 o'clock, top), `h = 3` is `(cx + rx, cy)` (3 o'clock, right), `h =
 * 6` is `(cx, cy + ry)` (6 o'clock, bottom): the ordinary clock-face layout.
 * `h = 1` (30°) is therefore upper-right, between 12 and 3 — the authored
 * start.
 *
 * THE FOUR ARCS. Each ring is four cubic-Bezier quarter-arcs (90° of clock
 * face, i.e. exactly three clock-hours, each), walked in DECREASING clock
 * order — 1 → 10 → 7 → 4 → 1 — because decreasing this particular angle
 * convention IS counter-clockwise on screen (`h` was built to increase
 * clockwise, so walking it backward is the only way to turn the other way).
 * `1 → 10` climbs through 12 (over the top), `10 → 7` descends through 8-9
 * (down the left side), `7 → 4` climbs back up through 6 (around the
 * bottom — "up" in clock-hour terms, not screen `y`), `4 → 1` returns
 * through 2-3 (up the right side): exactly the sweep the function's own
 * header promises, four arcs for four quarters of one ring.
 *
 * THE MATH. Each arc is built in an intermediate UNIT-CIRCLE frame —
 * `q(θ) = (sin θ, −cos θ)`, the same shape as the point formula above with
 * `rx = ry = 1` — because `q'(θ) = (cos θ, sin θ)` is a UNIT tangent at every
 * θ, which is what the standard `κ = (4/3)·tan(Δθ/4)` cubic-arc
 * approximation (0.5523 at the 90° sweep used here) is defined against. The
 * unit-frame control points `q(θ₀) + κ·q'(θ₀)` and `q(θ₁) − κ·q'(θ₁)` are
 * then mapped into the real ellipse by scaling each axis independently by
 * `rx`/`ry` — valid because a Bezier curve is affine-invariant, and
 * `diag(rx, ry)` applied to the unit circle is exactly this ellipse. `Δθ`
 * negative (the sweep runs backward through increasing-θ, i.e. decreasing
 * clock hours) makes `κ` itself come out negative, which is what turns the
 * tangent addition into a subtraction in the right places without a second
 * code path for direction.
 *
 * Emits ONLY absolute `M` and `C` (`paths.test.ts`), the same contract
 * every closed generator in this file keeps.
 */
export function ovals(
  o: { x0?: number; x1?: number; cy?: number; rx?: number; ry?: number; count?: number } = {},
): string {
  const x0 = o.x0 ?? 260
  const x1 = o.x1 ?? 740
  const cy = o.cy ?? 300
  const rx = o.rx ?? 150
  const ry = o.ry ?? 190
  const count = Math.max(1, Math.round(o.count ?? 1))
  const w = (x1 - x0) / count

  // Clock-hour position, `h = 0` at the top, clockwise increasing (see this
  // function's own header for the derivation).
  function clockPoint(cx: number, h: number): { x: number; y: number } {
    const th = (h * 30 * Math.PI) / 180
    return { x: cx + rx * Math.sin(th), y: cy - ry * Math.cos(th) }
  }
  // Unit tangent at clock-hour `h`, in the direction of INCREASING `h`
  // (screen-clockwise) — `d/dθ (sin θ, −cos θ) = (cos θ, sin θ)`.
  function clockTangent(h: number): { x: number; y: number } {
    const th = (h * 30 * Math.PI) / 180
    return { x: Math.cos(th), y: Math.sin(th) }
  }
  // One 90°-of-clock-face arc, from hour `h0` to hour `h1` (`h1 − h0 = ±3`
  // here, always `-3` — see the header). Emits a single absolute `C`.
  function arc(cx: number, h0: number, h1: number): string {
    const dTh = ((h1 - h0) * 30 * Math.PI) / 180
    const k = (4 / 3) * Math.tan(dTh / 4)
    const p0 = clockPoint(cx, h0)
    const p1 = clockPoint(cx, h1)
    const t0 = clockTangent(h0)
    const t1 = clockTangent(h1)
    return cubic(
      p0.x + k * rx * t0.x,
      p0.y + k * ry * t0.y,
      p1.x - k * rx * t1.x,
      p1.y - k * ry * t1.y,
      p1.x,
      p1.y,
    )
  }

  // The ring's own four quarter-arcs, in walking order (see header): 1 → 10
  // → 7 → 4 → 1 o'clock. `-11`/`-20`/`-29` are `10`/`7`/`4` o'clock reached
  // by SUBTRACTING three hours three times in a row rather than wrapping
  // into `[0, 12)` — `clockPoint`/`clockTangent` are periodic in `h` (they
  // only ever consume it through `sin`/`cos`), so an unwrapped, monotonically
  // decreasing sequence is exactly as valid as a wrapped one and needs no
  // modulo arithmetic to get the DIRECTION of the sweep right.
  const RING_STOPS = [1, -2, -5, -8, -11] as const

  // The connecting curve's own rise above the shared 1-o'clock height,
  // measured as a fraction of `ry`. Small enough to stay clear of each
  // ring's own topmost point (`cy - ry`, `1 - cos(30°) ≈ 0.134` of `ry`
  // below it) at every authored `turtle1..4` size (`catalog.test.ts` proves
  // this numerically alongside the corridor-clearance guard below, rather
  // than trusting the arithmetic margin alone).
  const CONNECTOR_RISE = 0.08

  let d = ''
  for (let i = 0; i < count; i++) {
    const cx = x0 + w * (i + 0.5)
    const start = clockPoint(cx, RING_STOPS[0])
    if (i === 0) {
      d = move(start.x, start.y)
    } else {
      // The short connector (header, "along the top"): a single symmetric
      // cubic from the PREVIOUS ring's own 1-o'clock point (where the pen
      // already sits) to this one's, rising `CONNECTOR_RISE · ry` at its
      // midpoint — {@link hills}'s own single-cubic bump construction,
      // restated for a connector that starts and ends at the SAME height
      // (every ring in one `ovals()` call shares `cy`/`ry`) rather than
      // hills' rise-from-a-baseline shape.
      const prevCx = x0 + w * (i - 1 + 0.5)
      const prevStart = clockPoint(prevCx, RING_STOPS[0])
      const span = start.x - prevStart.x
      const peakY = prevStart.y - CONNECTOR_RISE * ry
      const ctrlY = (4 * peakY - prevStart.y) / 3
      d += cubic(
        prevStart.x + span * 0.15,
        ctrlY,
        prevStart.x + span * 0.85,
        ctrlY,
        start.x,
        start.y,
      )
    }
    for (let s = 0; s < RING_STOPS.length - 1; s++) {
      d += arc(cx, RING_STOPS[s], RING_STOPS[s + 1])
    }
  }
  return d
}

/**
 * The tightest radius of curvature anywhere on an `rx`×`ry` ellipse — the
 * {@link ovals} analogue of {@link uTurnRadius}, and used the SAME way
 * (`catalog.test.ts`): the authoring predicate is `ovalTurnRadius(rx, ry) >
 * corridorWidth/2 − BAND_INSET`, below which `pushBand`'s fixed `±half`
 * offset (`buildLevel.ts`) folds through itself and an oval's own hole
 * closes up.
 *
 * An ellipse's curvature is tightest at the ends of its MAJOR axis (radius
 * `minor²/major`) and gentlest at the ends of its minor axis (`major²/
 * minor`) — the standard closed form, restated here rather than derived
 * inline because, unlike {@link uTurnRadius}'s one bottom-of-a-U point, an
 * `ovals()` ring has its tightest point at whichever pair of its four
 * quarter-arc joins sits on the longer axis (the top/bottom joins when `ry
 * > rx`, as every authored `turtle1..4` size is).
 */
export function ovalTurnRadius(rx: number, ry: number): number {
  const major = Math.max(rx, ry)
  const minor = Math.min(rx, ry)
  return (minor * minor) / major
}

/**
 * Whether `count` ovals of radius `rx`, `spacing` apart centre-to-centre,
 * leave a real gap between neighbours once each side's own corridor padding
 * (`corridorWidth / 2`) is subtracted — the {@link ovals} analogue of {@link
 * armClearance}: a real, visible wall must remain, not merely a
 * non-negative one, so this asks for at least a QUARTER of the corridor's
 * own width as leftover daylight (`armClearance`'s own mountain-family
 * precedent asks for 0.7 of a wave's width; a quarter is enough here
 * because up to four ovals have to share the SAME 1000-unit sheet at
 * `turtle4`'s own size, which a 0.7 ratio cannot fit at all — checked, not
 * assumed, by the failing arithmetic `catalog.test.ts`'s own comment
 * records). `count` does not otherwise enter the formula: it is accepted so
 * a caller can pass a level's own `{ rx, count }` straight through without
 * re-deriving `spacing` at the call site, and so a FUTURE version of this
 * guard that also checks the outermost ring against the viewBox edge (not
 * needed today — every authored size already clears that separately) has
 * `count` on hand without a second argument list to change.
 */
export function ovalSpacingClearance(
  spacing: number,
  rx: number,
  corridorWidth: number,
  count: number,
): boolean {
  if (count < 2) return true
  return spacing - 2 * rx - corridorWidth >= 0.25 * corridorWidth
}
