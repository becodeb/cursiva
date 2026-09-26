// Shape contract for the art corridor's ONE placement function (art-corridor
// spec). `placeArtCorridor` is what the renderer, the engine derivation and
// this test all call — nothing here reimplements the placement formula.
import { describe, expect, it } from 'vitest'
import { flattenPathD } from '../letters/svgLetter'
import { buildLevelTarget } from './buildLevel'
import { spinePolyline } from './paths'
import { DRAWN_SPINE, placeArtCorridor, type ArtCorridorPiece } from './artCorridor'
import type { LevelConfig } from './types'
import { SECTOR_ADVENTURE_ART } from '../detective/assets'

const SNAKE_ART = SECTOR_ADVENTURE_ART.snakeMedium

function basePiece(overrides: Partial<ArtCorridorPiece> = {}): ArtCorridorPiece {
  return {
    art: SNAKE_ART,
    spine: 'snakeMedium',
    span: 640,
    at: { x: 500, y: 300 },
    ...overrides,
  }
}

/** Builds the SAME centreline a level author would author for
 *  `config.paths[i]` — matching `placeArtCorridor`'s own internal
 *  construction so a fixture level's picture and its scored path agree,
 *  exactly as a real catalog entry must. This is fixture SETUP, not a
 *  reimplementation used to check `placeArtCorridor`'s own output against. */
function fixturePathD(piece: ArtCorridorPiece): string {
  const spine = DRAWN_SPINE[piece.spine]
  const height = (piece.span * piece.art.h) / piece.art.w
  const boxX = piece.at.x - piece.span / 2
  const points = spine.points.map(([xFrac, yFrac]) => ({
    x: boxX + xFrac * piece.span,
    y: piece.at.y - spine.mid * height + yFrac * height,
  }))
  return spinePolyline(points)
}

function makeConfig(pieces: readonly ArtCorridorPiece[], paths: string[]): LevelConfig {
  return {
    id: 'fixture',
    phase: 1,
    title: 'fixture',
    kind: 'path',
    surface: 'blank',
    maze: false,
    resetOnContact: false,
    carrier: false,
    feedback: { tone: true, haptics: true, metronomeBpm: 0, rail: false },
    hint: '',
    paths,
    corridorWidth: 60,
    rules: { mustBeContinuous: false, enforceOrder: false, minFluency: 0, minAccuracy: 50 },
    showGuide: true,
    letters: [],
    artCorridor: pieces,
  }
}

/** 33 probes across a polyline's own INDEX fraction (art-corridor spec's own
 *  `SPINE_PROBES = 33`). */
const SPINE_PROBES = 33

function maxProbeDistance(a: readonly { x: number; y: number }[], b: readonly { x: number; y: number }[]): number {
  let worst = 0
  for (let i = 0; i < SPINE_PROBES; i++) {
    const f = i / (SPINE_PROBES - 1)
    const pa = a[Math.round(f * (a.length - 1))]
    const pb = b[Math.round(f * (b.length - 1))]
    const dist = Math.hypot(pa.x - pb.x, pa.y - pb.y)
    if (dist > worst) worst = dist
  }
  return worst
}

describe('placeArtCorridor', () => {
  it("box aspect equals the cutout's own", () => {
    const piece = basePiece()
    const placement = placeArtCorridor(piece, 0)
    expect(placement.box.width / placement.box.height).toBeCloseTo(piece.art.w / piece.art.h, 6)
  })

  it("the fitted mid lands on at.y", () => {
    const piece = basePiece()
    const placement = placeArtCorridor(piece, 0)
    const mid = DRAWN_SPINE[piece.spine].mid
    expect(placement.box.y + mid * placement.box.height).toBeCloseTo(piece.at.y, 6)
  })

  it('tx shifts the box and the pivot together, by the same amount', () => {
    const piece = basePiece()
    const p0 = placeArtCorridor(piece, 0)
    const p1 = placeArtCorridor(piece, 37.5)
    expect(p1.box.x - p0.box.x).toBeCloseTo(37.5, 6)
    expect(p1.box.y).toBeCloseTo(p0.box.y, 6)
    expect(p1.pivot.x - p0.pivot.x).toBeCloseTo(37.5, 6)
    expect(p1.pivot.y).toBeCloseTo(p0.pivot.y, 6)
  })

  it('rotation is an isometry of the box (a -90° rotation preserves box dimensions)', () => {
    const piece = basePiece({ rotate: -90 })
    const placement = placeArtCorridor(piece, 0)
    expect(placement.box.width).toBeCloseTo(basePiece().at ? 640 : 0, 0)
    // The box itself stays axis-aligned (rotation lives in the `rotate`
    // field, applied live to the <image>); its own width/height are
    // untouched by rotation, which is what makes the transform a live,
    // reversible rotation rather than a baked distortion.
    const unrotated = placeArtCorridor(basePiece(), 0)
    expect(placement.box.width).toBeCloseTo(unrotated.box.width, 6)
    expect(placement.box.height).toBeCloseTo(unrotated.box.height, 6)
    expect(placement.rotate).toBe(-90)
  })

  it('residual and thickness scale by span/art.w, matching the manifest fraction', () => {
    const piece = basePiece()
    const placement = placeArtCorridor(piece, 0)
    const spine = DRAWN_SPINE[piece.spine]
    expect(placement.residual).toBeCloseTo((spine.residual * piece.span) / piece.art.w, 6)
    expect(placement.thickness).toBeCloseTo(spine.thickness * ((piece.span * piece.art.h) / piece.art.w), 6)
  })

  describe('the coincidence — the generated path and the derived box/mid agree, through buildLevelTarget', () => {
    it('every probe lies within 0.5 viewBox units when config.paths matches the corridor piece', () => {
      const piece = basePiece()
      const d = fixturePathD(piece)
      const target = buildLevelTarget(makeConfig([piece], [d]))
      const generated = flattenPathD(target.paths[0]).points
      const derived = flattenPathD(target.artCorridor![0].d).points
      expect(maxProbeDistance(generated, derived)).toBeLessThan(0.5)
    })

    it('a shifted centreline fails the assertion (sensitivity proof)', () => {
      const piece = basePiece()
      const spine = DRAWN_SPINE[piece.spine]
      const height = (piece.span * piece.art.h) / piece.art.w
      const boxX = piece.at.x - piece.span / 2
      // Deliberately offset the AUTHORED path's y by 5 units from the piece's
      // own `at.y` — a level author's mistake the real coincidence test must
      // catch.
      const points = spine.points.map(([xFrac, yFrac]) => ({
        x: boxX + xFrac * piece.span,
        y: piece.at.y + 5 - spine.mid * height + yFrac * height,
      }))
      const shiftedD = spinePolyline(points)
      const target = buildLevelTarget(makeConfig([piece], [shiftedD]))
      const generated = flattenPathD(target.paths[0]).points
      const derived = flattenPathD(target.artCorridor![0].d).points
      expect(maxProbeDistance(generated, derived)).toBeGreaterThan(0.5)
    })
  })
})

/**
 * `fix-snakes-true-alignment` — `DRAWN_SPINE.points` against a HAND-MEASURED
 * fixture, independent of `scripts/art/build_art.py`'s own pipeline: five
 * x-fractions per snake, each measured directly off `client/public/art/
 * sector-snake-*.png`'s alpha channel by a standalone column scan (NOT the
 * code path that produced `DRAWN_SPINE` itself — a fixture generated by the
 * same code it checks would prove nothing about the actual art). This is
 * the regression guard the previous closed-form fit never had: a future
 * hand-edit of `DRAWN_SPINE` (or a re-export of the source art) that drifts
 * the stored centreline off the drawn body fails here, in viewBox-scale
 * pixels, rather than only showing up as a screenshot complaint.
 *
 * The threshold (3 SHIPPED px) is generous against the actual measured
 * agreement (< 0.7px on all three snakes, all five probes, at the time this
 * fixture was captured) — tight enough to catch a real drift, loose enough
 * to tolerate the light smoothing/resampling `sample_spine` applies.
 */
describe("DRAWN_SPINE.points against an independently hand-measured fixture", () => {
  const FIXTURE_TOLERANCE_PX = 3

  /** Linear-interpolates `spine.points` (already ascending in x) at `xFrac`,
   *  the same way a caller walking the emitted `M`/`L` polyline would read
   *  it between two stored samples. */
  function interpolateYFrac(points: readonly (readonly [number, number])[], xFrac: number): number {
    for (let i = 0; i < points.length - 1; i++) {
      const [x0, y0] = points[i]
      const [x1, y1] = points[i + 1]
      if (xFrac >= x0 && xFrac <= x1) {
        const t = x1 === x0 ? 0 : (xFrac - x0) / (x1 - x0)
        return y0 + (y1 - y0) * t
      }
    }
    return points[points.length - 1][1]
  }

  const FIXTURES: Record<'snakeSmall' | 'snakeMedium' | 'snakeLarge', readonly { xFrac: number; yFrac: number }[]> = {
    snakeSmall: [
      { xFrac: 0.29250000000000004, yFrac: 0.5030612244897958 },
      { xFrac: 0.4358333333333333, yFrac: 0.3428571428571428 },
      { xFrac: 0.5791666666666667, yFrac: 0.7295918367346939 },
      { xFrac: 0.7224999999999999, yFrac: 0.3010204081632653 },
      { xFrac: 0.8658333333333333, yFrac: 0.6408163265306124 },
    ],
    snakeMedium: [
      { xFrac: 0.29044715447154473, yFrac: 0.7978070175438596 },
      { xFrac: 0.4363821138211382, yFrac: 0.43114035087719305 },
      { xFrac: 0.5823170731707317, yFrac: 0.75 },
      { xFrac: 0.7282520325203251, yFrac: 0.5074561403508774 },
      { xFrac: 0.8741869918699188, yFrac: 0.7280701754385965 },
    ],
    snakeLarge: [
      { xFrac: 0.2718, yFrac: 0.6742105263157895 },
      { xFrac: 0.4214, yFrac: 0.49157894736842095 },
      { xFrac: 0.571, yFrac: 0.45526315789473687 },
      { xFrac: 0.7206, yFrac: 0.6894736842105263 },
      { xFrac: 0.8702000000000001, yFrac: 0.37894736842105264 },
    ],
  }

  for (const key of ['snakeSmall', 'snakeMedium', 'snakeLarge'] as const) {
    it(`${key}: every fixture probe stays within ${FIXTURE_TOLERANCE_PX}px of the hand-measured centreline`, () => {
      const spine = DRAWN_SPINE[key]
      const art = SECTOR_ADVENTURE_ART[key]
      const heightPx = art.h // the cutout's own shipped pixel height — the same space the fixture was measured in
      for (const { xFrac, yFrac } of FIXTURES[key]) {
        const stored = interpolateYFrac(spine.points, xFrac)
        const diffPx = Math.abs(stored - yFrac) * heightPx
        expect(diffPx, `${key} @ xFrac=${xFrac}`).toBeLessThan(FIXTURE_TOLERANCE_PX)
      }
    })
  }
})
