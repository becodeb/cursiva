// Shape contract for the art corridor's ONE placement function (art-corridor
// spec). `placeArtCorridor` is what the renderer, the engine derivation and
// this test all call — nothing here reimplements the placement formula.
import { describe, expect, it } from 'vitest'
import { flattenPathD } from '../letters/svgLetter'
import { buildLevelTarget } from './buildLevel'
import { spineWave } from './paths'
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

/** Builds the SAME wave a level author would author for `config.paths[i]` —
 *  matching `placeArtCorridor`'s own internal construction so a fixture
 *  level's picture and its scored path agree, exactly as a real catalog
 *  entry must. This is fixture SETUP, not a reimplementation used to check
 *  `placeArtCorridor`'s own output against. */
function fixturePathD(piece: ArtCorridorPiece): string {
  const spine = DRAWN_SPINE[piece.spine]
  const height = (piece.span * piece.art.h) / piece.art.w
  const x0 = piece.at.x - piece.span / 2 + spine.traceFrom * piece.span
  const halves = spine.halves.map(([w, r]) => ({ width: w * piece.span, rise: r * height }))
  return spineWave({ x0, y: piece.at.y, halves })
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
      const x0 = piece.at.x - piece.span / 2 + spine.traceFrom * piece.span
      const halves = spine.halves.map(([w, r]) => ({ width: w * piece.span, rise: r * height }))
      // Deliberately offset the AUTHORED path's y by 5 units from the piece's
      // own `at.y` — a level author's mistake the real coincidence test must
      // catch.
      const shiftedD = spineWave({ x0, y: piece.at.y + 5, halves })
      const target = buildLevelTarget(makeConfig([piece], [shiftedD]))
      const generated = flattenPathD(target.paths[0]).points
      const derived = flattenPathD(target.artCorridor![0].d).points
      expect(maxProbeDistance(generated, derived)).toBeGreaterThan(0.5)
    })
  })
})
