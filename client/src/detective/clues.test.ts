// Clue placement + collection reducer contract (`detective-mode` spec, "Clue
// Collection State Machine"). No DOM: a straight hand-built polyline is
// enough to pin arc-length placement and the discrete flip, the same way
// `screen/directionArrow.test.ts` pins `directionArrowOf` with a hand-built
// `LevelTarget`.
import { describe, expect, it } from 'vitest'
import {
  clueCountFor,
  clueMarks,
  levelClueMarks,
  clueIndicesAt,
  PLACED_MARK_DROP,
  CROSSING_CLEAR_RADIUS,
  clueTick,
  emptyClueState,
  reachedTrailEnd,
  trailEndArc,
  type ClueMark,
  type ClueState,
} from './clues'
// The invariant suite at the bottom walks the REAL catalog, not a fixture.
import { LEVELS } from '../levels/catalog'
import { buildLevelTarget } from '../levels/buildLevel'
import { MAX_WIDTH_FACTOR } from '../game/adaptiveTolerance'
import { flattenPathD, polylineLength } from '../letters/svgLetter'
import { bridges, lianas, loops, selfCrossingPoints } from '../levels/paths'

/** A 100-unit horizontal polyline, so arc length equals x and the tangent
 * angle is trivially 0 everywhere. */
const LINE = [
  { x: 0, y: 0 },
  { x: 100, y: 0 },
]
const LENGTH = 100

describe('emptyClueState', () => {
  it('starts every mark drained', () => {
    expect(emptyClueState(5)).toEqual({ lit: [false, false, false, false, false] })
  })

  it('never goes negative for a bad count', () => {
    expect(emptyClueState(-3)).toEqual({ lit: [] })
  })
})

describe('clueCountFor (defect fix: arc-length spacing, not a fixed count)', () => {
  it('derives the count that makes the actual inter-mark gap equal the requested spacing', () => {
    // clueMarks spaces count marks (and the two virtual end gaps) at
    // length / (count + 1) apart, so this is the inverse: solve for count
    // given a target gap.
    const count = clueCountFor(2600, 60)
    const actualGap = 2600 / (count + 1)
    expect(actualGap).toBeGreaterThanOrEqual(55)
    expect(actualGap).toBeLessThanOrEqual(65)
  })

  it('is denser on a longer trail and sparser on a shorter one, at the SAME spacing (regression: a fixed count reads sparse on a long trail, crowded on a short one)', () => {
    const short = clueCountFor(600, 60)
    const long = clueCountFor(3000, 60)
    expect(long).toBeGreaterThan(short)
  })

  it('floors at 1 mark for a trail shorter than one spacing unit, never 0', () => {
    expect(clueCountFor(10, 60)).toBe(1)
  })

  it('returns 0 for a non-positive length or spacing', () => {
    expect(clueCountFor(0, 60)).toBe(0)
    expect(clueCountFor(-5, 60)).toBe(0)
    expect(clueCountFor(100, 0)).toBe(0)
    expect(clueCountFor(100, -1)).toBe(0)
  })
})

describe('clueMarks', () => {
  it('places count marks uniformly in arc length, first at the start and last at the end', () => {
    const marks = clueMarks(LINE, LENGTH, 5, 'droplet')
    expect(marks).toHaveLength(5)
    // Interior spacing: (i + 1) / (count + 1) of a 100-unit line.
    const xs = marks.map((m) => m.x)
    for (const [i, want] of [100 / 6, 200 / 6, 300 / 6, 400 / 6, 500 / 6].entries()) {
      expect(xs[i]).toBeCloseTo(want, 6)
    }
    for (const m of marks) expect(m.y).toBeCloseTo(0, 6)
  })

  it('never places a mark at either endpoint of the trail', () => {
    // An endpoint mark is invisible under the start or goal marker, and the
    // one at arc 0 is earned for free the moment the child touches down.
    for (const count of [1, 2, 3, 5, 8]) {
      for (const m of clueMarks(LINE, LENGTH, count, 'droplet')) {
        expect(m.x, `count ${count}: a mark landed on an endpoint`).toBeGreaterThan(0)
        expect(m.x, `count ${count}: a mark landed on an endpoint`).toBeLessThan(LENGTH)
      }
    }
  })

  it('faces along the local tangent (a straight rightward line points at angle 0)', () => {
    const marks = clueMarks(LINE, LENGTH, 3, 'droplet')
    for (const m of marks) expect(m.angle).toBeCloseTo(0, 6)
  })

  it('returns no marks for a non-positive count', () => {
    expect(clueMarks(LINE, LENGTH, 0, 'droplet')).toEqual([])
    expect(clueMarks(LINE, LENGTH, -1, 'droplet')).toEqual([])
  })

  it('places a single mark at the midpoint when count is 1', () => {
    // 1 / (1 + 1) of the arc. The start is where the glass already sits, so a
    // lone mark there would be collected before the child moves at all.
    const marks = clueMarks(LINE, LENGTH, 1, 'droplet')
    expect(marks).toHaveLength(1)
    expect(marks[0].x).toBeCloseTo(LENGTH / 2, 6)
  })

  it.each(['footprint', 'handprint'] as const)('alternates %s marks left/right off the centreline (defect fix: "the footprint kind should alternate left/right down the trail... that is what makes a track read as walking"; T43: the monkey\'s hands climb the same way)', (kind) => {
    const marks = clueMarks(LINE, LENGTH, 6, kind)
    expect(marks).toHaveLength(6)
    // On this horizontal line the tangent is along +x, so the normal is
    // purely vertical: alternating marks sit off-centre in y, never x.
    for (const m of marks) expect(m.y).not.toBeCloseTo(0, 3)
    for (let i = 1; i < marks.length; i++) {
      // Consecutive marks sit on OPPOSITE sides — the sign of y flips.
      expect(Math.sign(marks[i].y)).toBe(-Math.sign(marks[i - 1].y))
    }
    // Every mark still sits on its own arc-length position along x (the
    // alternation only ever moves the mark PERPENDICULAR to the route).
    for (const [i, m] of marks.entries()) {
      expect(m.x).toBeCloseTo(((i + 1) / 7) * LENGTH, 6)
    }
  })

  it('does NOT alternate any other clue kind — only footprint and handprint get a two-sided track', () => {
    for (const kind of ['droplet', 'corn', 'feather', 'puddle', 'seeds', 'duckFeather', 'webfoot', 'scale', 'banana'] as const) {
      const marks = clueMarks(LINE, LENGTH, 4, kind)
      for (const m of marks) expect(m.y).toBeCloseTo(0, 6)
    }
  })
})

describe('clueTick (lights by ARC PROGRESS, not by proximity)', () => {
  // Marks at x = 100/6, 200/6, 50, 400/6, 500/6 — and, because LINE is a
  // horizontal unit-speed line, those are also their `arc` values.
  const marks: readonly ClueMark[] = clueMarks(LINE, LENGTH, 5, 'droplet')

  it('lights a mark the moment the walk REACHES its arc, and not before', () => {
    const start = emptyClueState(5)
    // One unit short of the middle mark: the first two are behind us, the
    // middle one is not yet earned.
    expect(clueTick(start, marks[2].arc - 1, marks).lit).toEqual([
      true,
      true,
      false,
      false,
      false,
    ])
    // Exactly ON it earns it: the boundary is inclusive, so a walk that
    // stops dead on a mark does not leave it dark.
    expect(clueTick(start, marks[2].arc, marks).lit).toEqual([true, true, true, false, false])
    // The input state itself was not mutated.
    expect(start.lit).toEqual([false, false, false, false, false])
  })

  it('lights a mark the child never came NEAR, as long as the walk passed its arc (the whole point of the change)', () => {
    // The defect this replaced: `lit` used to need the fingertip within a
    // radius of the mark's drawn point. A child cutting the inside of a bend
    // stays legally inside the corridor and never gets that close. Arc
    // progress does not care where the finger was, only how far along it got
    // — so this test passes NO position at all, which is the guarantee.
    const state = clueTick(emptyClueState(5), LENGTH, marks)
    expect(state.lit).toEqual([true, true, true, true, true])
  })

  it('never unlights a mark once earned, even when progress is reported as zero (monotone)', () => {
    const earned: ClueState = { lit: [true, false, false, false, false] }
    const next = clueTick(earned, 0, marks)
    expect(next.lit[0]).toBe(true)
  })

  it('re-passing an earned mark returns the SAME state and emits no event (spec: "Re-passing an earned mark is inert")', () => {
    const start = emptyClueState(5)
    const first = clueTick(start, 50, marks)
    const second = clueTick(first, 50, marks)
    expect(second).toBe(first) // referential equality: no new object, no event
    expect(second).toEqual(first)
  })

  it('a no-op sample (no mark newly reached) also returns the SAME state', () => {
    const start = emptyClueState(5)
    // Short of the FIRST mark's arc, so nothing can flip. Asserted rather
    // than assumed, so this stays a real no-op if the spacing changes again.
    const probe = marks[0].arc - 1
    expect(probe).toBeLessThan(marks[0].arc)
    expect(clueTick(start, probe, marks)).toBe(start)
    // And again once some marks are already lit but none is newly reached.
    const midway = clueTick(start, marks[1].arc, marks)
    expect(clueTick(midway, marks[1].arc, marks)).toBe(midway)
  })

  it('carries no tween, delay or animation field across a stream of progress updates while the pointer is down — only discrete drained/earned values (spec: "No motion while the pointer is down")', () => {
    let state = emptyClueState(5)
    for (const mark of marks) {
      state = clueTick(state, mark.arc, marks)
      expect(Object.keys(state)).toEqual(['lit'])
      for (const value of state.lit) expect(typeof value).toBe('boolean')
    }
    // Every mark's arc was reached, so all five ended up earned.
    expect(state.lit).toEqual([true, true, true, true, true])
  })

  it('ignores a footprint\'s sideways offset: the mark is earned on its arc, not on its drawn point', () => {
    // Footprints are nudged off the centreline, so their `x` is no longer
    // their `arc`. Lighting must follow the arc.
    const prints = clueMarks(LINE, LENGTH, 4, 'footprint')
    for (const [i, print] of prints.entries()) {
      expect(print.arc).toBeCloseTo(((i + 1) / 5) * LENGTH, 6)
      expect(Math.abs(print.y)).toBeGreaterThan(0) // genuinely off-centre
    }
    expect(clueTick(emptyClueState(4), prints[1].arc, prints).lit).toEqual([
      true,
      true,
      false,
      false,
    ])
  })
})

// [T44] Marks placed at named spots of the shape (`LevelConfig.clue.at`).
describe('clueIndicesAt / levelClueMarks (T44)', () => {
  const BRIDGES = flattenPathD(
    bridges({ x0: 60, x1: 940, yTop: 150, yBase: 460, cycles: 4, footRise: 190, footLean: 6, topHandle: 100 }),
  ).points
  const DIVES = flattenPathD(loops({ x0: 60, x1: 940, yBase: 150, yTop: 450, cycles: 3 })).points
  const LIANAS = flattenPathD(lianas({ x0: 60, x1: 940, pairs: 2 })).points

  it("'valleys' finds every shared foot between two bridges, and never the route's own ends", () => {
    const feet = clueIndicesAt(BRIDGES, 'valleys').map((i) => BRIDGES[i])
    expect(feet.map((p) => Math.round(p.x))).toEqual([280, 500, 720])
    for (const p of feet) expect(p.y).toBeCloseTo(460, 0)
  })

  it("'loopBottoms' finds the lowest point of every loop, far from its crossing", () => {
    const bottoms = clueIndicesAt(DIVES, 'loopBottoms').map((i) => DIVES[i])
    expect(bottoms).toHaveLength(3)
    const crossings = selfCrossingPoints(DIVES)
    for (const [k, p] of bottoms.entries()) {
      expect(p.y).toBeCloseTo(450, 0)
      expect(Math.hypot(p.x - crossings[k].x, p.y - crossings[k].y)).toBeGreaterThan(CROSSING_CLEAR_RADIUS)
    }
  })

  it("'loopTops' finds the top of every loop and never a garland's top", () => {
    const tops = clueIndicesAt(LIANAS, 'loopTops').map((i) => LIANAS[i])
    expect(tops).toHaveLength(2)
    for (const p of tops) expect(p.y).toBeCloseTo(150, 0)
  })

  it('places an upright mark just below its spot, earned at the spot\'s own arc', () => {
    const length = polylineLength(BRIDGES)
    const marks = levelClueMarks(BRIDGES, length, { kind: 'puddle', spacing: 60, at: 'valleys' })
    expect(marks).toHaveLength(3)
    for (const m of marks) {
      expect(m.y).toBeCloseTo(460 + PLACED_MARK_DROP, 0)
      expect(m.angle).toBe(0)
      expect(m.kind).toBe('puddle')
      expect(m.arc).toBeGreaterThan(0)
      expect(m.arc).toBeLessThan(length)
    }
    expect(clueTick(emptyClueState(3), marks[1].arc, marks).lit).toEqual([true, true, false])
  })

  it('keeps the evenly spaced marks for a level without `at`', () => {
    const marks = levelClueMarks(LINE, LENGTH, { kind: 'droplet', spacing: 60 })
    expect(marks).toEqual(clueMarks(LINE, LENGTH, clueCountFor(LENGTH, 60), 'droplet'))
  })

  it("walks the hedgehog's prints left and right of the trail, like footprints", () => {
    const prints = clueMarks(LINE, LENGTH, 4, 'hedgehogPrint')
    expect(Math.sign(prints[0].y)).toBe(-Math.sign(prints[1].y))
    expect(Math.abs(prints[0].y)).toBeGreaterThan(0)
  })
})

describe('reachedTrailEnd (Task B: "reached the end without leaving")', () => {
  it('is reached at exactly one corridor half-width short of the full length', () => {
    expect(trailEndArc(1000, 90)).toBe(955)
    expect(reachedTrailEnd(954.9, 1000, 90)).toBe(false)
    expect(reachedTrailEnd(955, 1000, 90)).toBe(true)
    expect(reachedTrailEnd(1000, 1000, 90)).toBe(true)
  })

  it('says nothing about accuracy, fluency or how many marks are lit — it takes none of them', () => {
    // The signature is the assertion: progress, length, width. A run that
    // walked the route is finished whatever `evaluateLevel` would have said.
    expect(reachedTrailEnd.length).toBe(3)
  })

  it('never completes a level with no route', () => {
    expect(reachedTrailEnd(0, 0, 90)).toBe(false)
    expect(reachedTrailEnd(500, 0, 90)).toBe(false)
  })
})

describe('THE INVARIANT: reaching the end of a SHIPPED trail means every clue is lit', () => {
  // This is the test the mechanic rests on, and it runs against the REAL
  // `catalog.ts` rather than a fixture on purpose. "Reached the end ⇒ all
  // clues lit" is not a property of `clueTick` — `clueTick` only compares two
  // numbers. It is a property of how far apart `clueMarks` places marks
  // versus where `trailEndArc` puts the finish, and both of those are
  // computed from a LEVEL. A fixture would prove the arithmetic and prove
  // nothing about the four trails a child actually plays.
  //
  // The margin is tighter than it looks: marks sit ~`length / (count + 1)`
  // apart (~60 units at the shipped spacing) and the last one sits exactly
  // that far short of the end, while the threshold sits `corridorWidth / 2`
  // short. A trail with a 120-unit corridor would put the threshold at 60 and
  // land the last mark right on it.
  //
  // If this ever fails, the fix is a catalog level's SPACING or WIDTH — never
  // a looser threshold. Loosening it would restore exactly the defect this
  // slice removed: a child who walked the whole route arriving with a mark
  // still dark.
  // [T45] A segment level (`level.segments`) lights each mark when ITS
  // segment is done, not by arc progress, so this invariant does not apply
  // to it; its own block below holds it to the segment rule instead.
  const trails = LEVELS.filter((level) => level.clue && !level.segments)

  it('covers every detective trail in the shipped catalog', () => {
    expect(trails.length).toBeGreaterThan(0)
    expect(trails.map((t) => t.id)).toEqual([
      // [T21] `duck-trail3`/`duck-trail4` no longer carry a `clue` — they
      // were repurposed to `LevelConfig.collect` (the duck family gathered
      // after the deduction, `docs/19` §2.3) — so only the case's own
      // pistas levels remain here (four since T40, one clue each).
      'duck-trail1',
      'duck-trail5',
      'duck-trail2',
      'duck-trail6',
      'trail1',
      'trail2',
      'trail3',
      'trail4',
      // [T27, `docs/19` §2.3/§3 monos row] `monkey1`/`monkey2` are the
      // monkeys case's own two pistas levels (`handprint`/`banana` since
      // T43) — `monkey3`/`monkey4` carry no clue
      // at all (repurposed to `collect`, the same duck-trail3/4 pattern).
      // [T44, `docs/21` N2] the night's routed clue trail, by torchlight.
      'night-rastro',
      'monkey1',
      'monkey2',
      // [T44, `docs/21` N4] loop and garland in one stroke.
      'monkey-lianas',
      // [T26] `f2-agua3`/`f2-agua4` no longer carry a `clue` either — past
      // the fish case's own deduction (`f2-agua2`), they were repurposed to
      // `LevelConfig.collect` (the fish family, `docs/19` §3), the SAME move
      // T21 made for `duck-trail3`/`duck-trail4` above. Only the case's own
      // two pistas levels (`f2-guirnalda`/`f2-agua2`, still bubble) remain
      // here; this catalog-wide filter picks them up automatically, same as
      // every trail above — the per-level loop right below already proves
      // the actual invariant on their real geometry, not just this
      // membership list.
      'f2-guirnalda',
      'f2-agua2',
      // [T44, `docs/21` N3] the descending loops.
      'f2-buceo',
    ])
  })

  for (const level of trails) {
    it(`${level.id}: every clue mark's arc is strictly below the completion threshold`, () => {
      const target = buildLevelTarget(level)
      const clue = level.clue
      if (!clue) throw new Error('filtered above')
      const marks = levelClueMarks(target.polyline, target.length, clue)
      const threshold = trailEndArc(target.length, target.corridorWidth)
      expect(marks.length).toBeGreaterThan(0)
      for (const [i, mark] of marks.entries()) {
        expect(
          mark.arc,
          `${level.id} mark ${i} of ${marks.length} sits at arc ${mark.arc}, at or past the ` +
            `completion threshold ${threshold} (length ${target.length}, corridor ` +
            `${target.corridorWidth}). Re-space or re-width the LEVEL; do not loosen the threshold.`,
        ).toBeLessThan(threshold)
      }
      // And the mechanic itself, end to end on this level's real numbers:
      // stand at the completion threshold and every mark is earned.
      expect(clueTick(emptyClueState(marks.length), threshold, marks).lit).toEqual(
        marks.map(() => true),
      )
    })
  }

  it('breaks if the threshold is ever fed the ADAPTIVE corridor width instead of the authored one', () => {
    // A guard against a plausible "simplification". `LevelPlay` has a
    // `target.corridorWidth` right there, already multiplied by the child's
    // `widthFactor`, and passing it would look tidier than reaching back to
    // `level.corridorWidth`. At `MAX_WIDTH_FACTOR` it inverts this whole
    // invariant — and only for the struggling child the widening exists to
    // help, who is therefore the only one who would ever see it. This test
    // asserts the BROKEN behaviour is really broken, so the correct call site
    // is not a matter of taste.
    let inverted = 0
    // [T44] Only the evenly spaced trails: a mark placed at a named spot of
    // the shape (`clue.at`) sits mid-route, nowhere near the finish line.
    const spaced = trails.filter((level) => !level.clue?.at)
    for (const level of spaced) {
      const target = buildLevelTarget(level, MAX_WIDTH_FACTOR)
      const clue = level.clue
      if (!clue) continue
      const marks = levelClueMarks(target.polyline, target.length, clue)
      const last = marks[marks.length - 1].arc
      // The authored width keeps the finish line where the route puts it.
      expect(last).toBeLessThan(trailEndArc(target.length, level.corridorWidth))
      // The adaptive one moves it back past the last mark.
      if (last >= trailEndArc(target.length, target.corridorWidth)) inverted++
    }
    expect(inverted, 'widening no longer moves the finish line — re-check this guard').toBe(
      spaced.length,
    )
  })

  it('reports the real margin each trail is carrying, so a future re-spacing can see the headroom it has', () => {
    // Not an assertion about a magic number — a floor. The last mark must
    // clear the threshold by more than nothing, on every trail.
    for (const level of trails) {
      const target = buildLevelTarget(level)
      const clue = level.clue
      if (!clue) continue
      const marks = levelClueMarks(target.polyline, target.length, clue)
      const margin = trailEndArc(target.length, target.corridorWidth) - marks[marks.length - 1].arc
      expect(margin, `${level.id} last-mark margin`).toBeGreaterThan(0)
    }
  })
})
