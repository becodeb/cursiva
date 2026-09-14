// Guard for `HEDGEHOG_SILHOUETTE` (`radial-spines` capability, design.md
// §10's measured tables). The literal in `assets.ts` is a TRANSCRIPTION, not
// a derivation — this file holds an independent copy of the measured table
// and checks the shipped constant against it ray for ray, so a future
// silent retune (a hand-edit that "rounds" a value, or a re-measurement
// that is not carried through) goes red instead of drifting unnoticed
// (design.md §11.2's `HEDGEHOG_SILHOUETTE` checklist item).
import { describe, expect, it } from 'vitest'
import { HEDGEHOG_SILHOUETTE } from './assets'

// design.md §10 — `hedgehog-profile.png`, 448×306, centroid (0.5416, 0.5107).
const MEASURED_PROFILE_RADII = [
  0.45491, 0.45938, 0.42455, 0.45089, 0.37388, 0.27277, 0.26563, 0.27277, 0.38438, 0.43929,
  0.42009, 0.50625, 0.45536, 0.40893, 0.39174, 0.3683, 0.35491, 0.34375, 0.34554, 0.35491, 0.37054,
  0.4, 0.41853, 0.43862,
]

// design.md §10 — `hedgehog-curled.png`, 412×407, centroid (0.5002, 0.5029).
const MEASURED_CURLED_RADII = [
  0.4932, 0.48835, 0.54248, 0.50728, 0.49515, 0.48908, 0.48738, 0.48908, 0.49515, 0.49951, 0.5,
  0.49636, 0.50121, 0.49879, 0.49563, 0.49806, 0.50728, 0.50243, 0.49515, 0.49272, 0.49223,
  0.49223, 0.49393, 0.4932,
]

describe('HEDGEHOG_SILHOUETTE (radial-spines capability, design.md §10)', () => {
  for (const pose of ['profile', 'curled'] as const) {
    it(`${pose} has exactly 24 rays and a centroid inside (0,1)²`, () => {
      const table = HEDGEHOG_SILHOUETTE[pose]
      expect(table.radii).toHaveLength(24)
      expect(table.centroid[0]).toBeGreaterThan(0)
      expect(table.centroid[0]).toBeLessThan(1)
      expect(table.centroid[1]).toBeGreaterThan(0)
      expect(table.centroid[1]).toBeLessThan(1)
    })
  }

  it("profile matches design.md §10's measured table, ray for ray", () => {
    expect(HEDGEHOG_SILHOUETTE.profile.centroid).toEqual([0.5416, 0.5107])
    HEDGEHOG_SILHOUETTE.profile.radii.forEach((r, i) => {
      expect(r, `ray ${i * 15}°`).toBeCloseTo(MEASURED_PROFILE_RADII[i], 5)
    })
  })

  it("curled matches design.md §10's measured table, ray for ray", () => {
    expect(HEDGEHOG_SILHOUETTE.curled.centroid).toEqual([0.5002, 0.5029])
    HEDGEHOG_SILHOUETTE.curled.radii.forEach((r, i) => {
      expect(r, `ray ${i * 15}°`).toBeCloseTo(MEASURED_CURLED_RADII[i], 5)
    })
  })
})
