// The guard between the art PIPELINE and the art REGISTRY.
//
// `scripts/art/build_art.py` derives every file in `client/public/art/` and
// emits `manifest.json` beside them. `assets.ts` hardcodes the same `w`/`h`
// values, because it must answer them under `renderToString` in the node test
// env without fetching JSON. Two copies of the same numbers drift silently:
// re-crop one source, re-run the pipeline, and the registry keeps scaling
// every mark by a stale aspect ratio — no error, just art that is subtly the
// wrong shape. This test is what makes that drift loud.
//
// It checks three things per exported `ArtImage`: the manifest knows the key,
// the manifest's `w`/`h` match the registry's, and the file is really on disk.
// The last one catches the failure this slice actually hit — `carrier-lens`
// was in the pipeline's `ISOLATES` table but had never been emitted, so the
// registry would have pointed at a 404.
//
// Read through Vite's own `import.meta.glob` rather than `node:fs`. The
// client tsconfig pins `types: ["vite/client"]` and `@types/node` is not a
// dependency, so a `node:fs` import typechecks as an error under
// `tsc --noEmit` even though it would run fine under vitest — and this repo's
// build runs that typecheck. The glob is resolved by the same transform
// pipeline vitest already uses, needs no new dependency, and gives BOTH
// halves of the check: the manifest's contents and the real set of files
// sitting in `public/art/`.
import { describe, it, expect } from 'vitest'
import {
  ANDEAN_HAT_ART,
  ANIMAL_ART,
  CARRIER_LENS_ART,
  CART_ART,
  CLUE_ART,
  GOAL_MEDUSA_ART,
  GROUND_GRASS,
  GROUND_MUD,
  HAZARD_STARFISH_ART,
  HEDGEHOG_ART,
  HOME_DESK_ART,
  HOME_OCTOPUS_ART,
  LAMP_ART,
  OCTOPUS_ART,
  SECTOR_ADVENTURE_ART,
  SECTOR_BACKGROUND_ART,
  ZOO_BACKPACK_ART,
  ZOO_FOG_ART,
  ZOO_MAP_ART,
  ZOO_OCTOPUS_BACKPACK_ART,
  ZOO_OCTOPUS_PRINT_ART,
  ZOO_SPEECH_BUBBLE_ART,
  ZOO_STAR_ART,
  type ArtImage,
} from './assets'
import { ART_OUTLINE, luma } from './palette'
import { ADVENTURE_BACKDROP } from '../zoo/backdrops'

/** Every PNG actually present in `public/art/`, keyed by bare name. The glob
 * is evaluated against the filesystem at transform time, so a file named in
 * the manifest but never emitted simply will not appear here. */
const ON_DISK = new Set(
  Object.keys(import.meta.glob('../../public/art/*.png')).map(
    (path) => path.split('/').pop()!.replace(/\.png$/, ''),
  ),
)

interface ManifestEntry {
  file: string
  w: number
  h: number
  bytes: number
  quiet?: string
  brightest?: string
  corridorRows?: { top: number; bottom: number }
  // `sample_spine()` fields (design.md §1.1), only on the three snake rows.
  mid?: number
  halves?: readonly (readonly [number, number])[]
  residual?: number
  thickness?: number
  traceFrom?: number
  traceTo?: number
  bodyBrightest?: string
  bodyDarkest?: string
  headWhite?: string
}

/** Pipeline rows landed ahead of their registry entry, closed in a LATER
 * phase of this SAME change once their consumer exists. Empty now: `zoo-
 * cart` (`carrito.png`'s row, task 1.2) was the one pending entry, and
 * Phase 7 registers `CART_ART` and wires its consumer (`zoo/backpack.ts`),
 * closing the gap design.md §7.1's resequencing note opened. */
const PENDING_MANIFEST_KEYS = new Set<string>([])

const manifest: Record<string, ManifestEntry> = JSON.parse(
  Object.values(
    import.meta.glob('../../public/art/manifest.json', {
      eager: true,
      query: '?raw',
      import: 'default',
    }),
  )[0] as string,
)

/** Every `ArtImage` the registry exports, labelled by where it comes from so a
 * failure names the export rather than a bare path. */
const REGISTERED: readonly (readonly [string, ArtImage])[] = [
  ...Object.entries(CLUE_ART).flatMap(([kind, art]) => [
    [`CLUE_ART.${kind}.art.earned`, art.art.earned] as const,
    [`CLUE_ART.${kind}.art.drained`, art.art.drained] as const,
  ]),
  ...Object.entries(ANIMAL_ART).map(([id, a]) => [`ANIMAL_ART.${id}`, a] as const),
  ...Object.entries(HEDGEHOG_ART).map(([id, art]) => [`HEDGEHOG_ART.${id}`, art] as const),
  ['ANDEAN_HAT_ART', ANDEAN_HAT_ART] as const,
  ['CARRIER_LENS_ART', CARRIER_LENS_ART] as const,
  ['CART_ART', CART_ART] as const,
  ['OCTOPUS_ART', OCTOPUS_ART] as const,
  ['HOME_OCTOPUS_ART', HOME_OCTOPUS_ART] as const,
  ['HOME_DESK_ART', HOME_DESK_ART] as const,
  ['LAMP_ART.on', LAMP_ART.on] as const,
  ['LAMP_ART.off', LAMP_ART.off] as const,
  ['GOAL_MEDUSA_ART', GOAL_MEDUSA_ART] as const,
  ['HAZARD_STARFISH_ART', HAZARD_STARFISH_ART] as const,
  ['ZOO_MAP_ART', ZOO_MAP_ART] as const,
  ...ZOO_FOG_ART.map((art, i) => [`ZOO_FOG_ART[${i}]`, art] as const),
  ['ZOO_OCTOPUS_BACKPACK_ART', ZOO_OCTOPUS_BACKPACK_ART] as const,
  ['ZOO_BACKPACK_ART', ZOO_BACKPACK_ART] as const,
  ['ZOO_STAR_ART', ZOO_STAR_ART] as const,
  ['ZOO_OCTOPUS_PRINT_ART', ZOO_OCTOPUS_PRINT_ART] as const,
  ['ZOO_SPEECH_BUBBLE_ART', ZOO_SPEECH_BUBBLE_ART] as const,
  ...Object.entries(SECTOR_BACKGROUND_ART).map(([id, art]) =>
    [`SECTOR_BACKGROUND_ART.${id}`, art] as const,
  ),
  ...Object.entries(SECTOR_ADVENTURE_ART).map(([id, art]) =>
    [`SECTOR_ADVENTURE_ART.${id}`, art] as const,
  ),
  ...GROUND_GRASS.map((art, i) => [`GROUND_GRASS[${i}]`, art] as const),
  ...GROUND_MUD.map((art, i) => [`GROUND_MUD[${i}]`, art] as const),
]

/** `manifest.json` stores the pipeline-relative `art/x.png`; the registry
 * stores the root-absolute `/art/x.png` the browser and `<image href>` need.
 * The `/` is the only difference, and this is the one place that is asserted
 * rather than assumed. */
const keyOf = (href: string) => href.replace(/^\/art\//, '').replace(/\.png$/, '')

describe('art registry matches the shipped pipeline manifest', () => {
  it.each(REGISTERED.map(([label, art]) => [label, art] as const))(
    '%s has a manifest entry with matching intrinsic size, and the file exists',
    (label, art) => {
      expect(art.href, `${label}: href must be a root-absolute /art/ path`).toMatch(
        /^\/art\/[a-z0-9-]+\.png$/,
      )

      const entry = manifest[keyOf(art.href)]
      expect(entry, `${label}: no manifest entry for ${art.href} — re-run scripts/art/build_art.py`)
        .toBeDefined()

      // The whole point of the guard: the hardcoded aspect ratio must be the
      // shipped file's real one, or every caller scaling by `w/h` is wrong.
      expect({ w: art.w, h: art.h }, `${label}: registry size drifted from the manifest`).toEqual({
        w: entry.w,
        h: entry.h,
      })

      expect(
        ON_DISK.has(keyOf(art.href)),
        `${label}: ${entry.file} is in the manifest but not on disk`,
      ).toBe(true)
    },
  )

  it('registers every clue kind in both states, and never the same file twice', () => {
    // 14 clue + 4 animal + lens + octopus + 2 home (octopus, desk) + 2 lamp
    // + 1 goal (medusa) + 1 hazard (estrella de mar) + 9 zoo journey
    // + 7 sector backgrounds (this change adds `night`, derived by
    // `nightfall()`) + 14 sector adventure cutouts (row C adds the sheep;
    // this change adds the entrance's three night findable objects — chest,
    // stone, leaf) + 2 hedgehog poses + 1 Andean hat + 12 grass + 8 mud.
    // Grass carries MORE variants than mud on purpose: it covers the whole
    // field at full size, where a repeated silhouette is obvious, while mud
    // sits small inside the corridor and half-covered by the child's own line.
    // + 1 CART_ART (the arena's backpack reward, Phase 7).
    // + 1 flowerDormant (the bee family's dormant flower, paso F).
    expect(REGISTERED.length).toBe(81)
    const hrefs = REGISTERED.map(([, art]) => art.href)
    expect(new Set(hrefs).size, 'two registry entries point at the same file').toBe(hrefs.length)
  })

  it('leaves no manifest entry unregistered, so shipped art is never dead weight', () => {
    const registered = new Set(REGISTERED.map(([, art]) => keyOf(art.href)))
    const orphans = Object.keys(manifest).filter(
      (key) => !registered.has(key) && !PENDING_MANIFEST_KEYS.has(key),
    )
    expect(orphans, 'the pipeline ships art nothing in the registry can reach').toEqual([])
  })

  it("matches CART_ART's w/h against the pipeline's manifest (Phase 1's zoo-cart row, Phase 7's registry entry)", () => {
    const entry = manifest['zoo-cart']
    expect(entry, 're-run scripts/art/build_art.py').toBeDefined()
    expect(ON_DISK.has('zoo-cart'), 'zoo-cart.png must exist on disk').toBe(true)
    expect(CART_ART.w).toBe(entry.w)
    expect(CART_ART.h).toBe(entry.h)
  })

  it("carries the three snakes' fitted spine, thickness, traceable span and luma-extreme fields (design.md §1.1)", () => {
    const HEX = /^#[0-9a-f]{6}$/
    for (const key of ['sector-snake-small', 'sector-snake-medium', 'sector-snake-large'] as const) {
      const entry = manifest[key]
      expect(entry, key).toBeDefined()
      expect(typeof entry.mid, `${key}.mid`).toBe('number')
      expect(Array.isArray(entry.halves), `${key}.halves`).toBe(true)
      expect(entry.halves!.length, `${key}.halves must be non-empty`).toBeGreaterThan(0)
      for (const [width, rise] of entry.halves!) {
        expect(width, `${key}: half width must be positive`).toBeGreaterThan(0)
        expect(typeof rise, `${key}: half rise must be a number`).toBe('number')
      }
      expect(entry.residual, `${key}.residual`).toBeGreaterThanOrEqual(0)
      expect(entry.thickness, `${key}.thickness`).toBeGreaterThan(0)
      expect(entry.traceFrom, `${key}.traceFrom`).toBeGreaterThanOrEqual(0)
      expect(entry.traceTo!, `${key}.traceTo > traceFrom`).toBeGreaterThan(entry.traceFrom!)
      expect(entry.traceTo!, `${key}.traceTo <= 1`).toBeLessThanOrEqual(1)
      expect(entry.bodyBrightest, `${key}.bodyBrightest`).toMatch(HEX)
      expect(entry.bodyDarkest, `${key}.bodyDarkest`).toMatch(HEX)
      expect(entry.headWhite, `${key}.headWhite`).toMatch(HEX)
    }
  })

  it("pairs every clue's earned and drained art as two DIFFERENT files", () => {
    for (const [kind, art] of Object.entries(CLUE_ART)) {
      expect(art.art.earned.href, `${kind}: earned and drained must be distinguishable`).not.toBe(
        art.art.drained.href,
      )
    }
  })

  it("matches ADVENTURE_BACKDROP.duck's quiet/brightest/corridorRows against the pipeline's own sampled values", () => {
    // `client/src/zoo/backdrops.ts` hand-copies `quiet`/`brightest` from
    // `manifest.json` (`build_art.py`'s `sample_corridor_band`), the same
    // drift risk `w`/`h` already guard against above — a re-muted lagoon
    // changes the manifest, and this is what makes that drift loud.
    const entry = manifest['sector-lagoon-background']
    const backdrop = ADVENTURE_BACKDROP.duck!
    expect(entry.quiet).toBe(backdrop.quiet)
    expect(entry.brightest).toBe(backdrop.brightest)
    expect(entry.corridorRows).toEqual(backdrop.corridorRows)
    expect(backdrop.quiet).toBe('#b4c5d0')
    expect(backdrop.brightest).toBe('#b4c5d0')
    expect(backdrop.corridorRows).toEqual({ top: 135, bottom: 889 })
  })

  it("matches ADVENTURE_BACKDROP.sheep/.llama's quiet/brightest/corridorRows against the pipeline's own sampled values (row C)", () => {
    const ladera = manifest['sector-slope-background']
    const cordillera = manifest['sector-range-background']
    const sheep = ADVENTURE_BACKDROP.sheep!
    const llama = ADVENTURE_BACKDROP.llama!
    expect(ladera.quiet).toBe(sheep.quiet)
    expect(ladera.brightest).toBe(sheep.brightest)
    expect(ladera.corridorRows).toEqual(sheep.corridorRows)
    expect(cordillera.quiet).toBe(llama.quiet)
    expect(cordillera.brightest).toBe(llama.brightest)
    expect(cordillera.corridorRows).toEqual(llama.corridorRows)
  })

  it("matches SECTOR_ADVENTURE_ART.sheep's w/h against the pipeline's manifest (row C)", () => {
    const entry = manifest['sector-sheep']
    expect(SECTOR_ADVENTURE_ART.sheep.w).toBe(entry.w)
    expect(SECTOR_ADVENTURE_ART.sheep.h).toBe(entry.h)
  })

  it("matches SECTOR_ADVENTURE_ART.chest/.stone/.leaf's w/h against the pipeline's manifest (design.md §3.4)", () => {
    // `cofre.png`/`piedra.png` are landscape and `hoja.png` is near-square —
    // none of the three is exactly 1024x1024, so none takes an
    // `AUTHORED_SOURCE_SIZES` entry (design.md §3.4's own decision, not an
    // oversight); the parity below is what still keeps their hand-copied
    // `w`/`h` honest.
    const chest = manifest['sector-chest']
    const stone = manifest['sector-stone']
    const leaf = manifest['sector-leaf']
    expect(SECTOR_ADVENTURE_ART.chest.w).toBe(chest.w)
    expect(SECTOR_ADVENTURE_ART.chest.h).toBe(chest.h)
    expect(SECTOR_ADVENTURE_ART.stone.w).toBe(stone.w)
    expect(SECTOR_ADVENTURE_ART.stone.h).toBe(stone.h)
    expect(SECTOR_ADVENTURE_ART.leaf.w).toBe(leaf.w)
    expect(SECTOR_ADVENTURE_ART.leaf.h).toBe(leaf.h)
  })

  it("matches the entrance and night backdrops' quiet/brightest/corridorRows against the rebuilt manifest (design.md §2.3, §3.2)", () => {
    // `ADVENTURE_BACKDROP.glass/.sand/.night` are now wired in directly
    // (Phase 5's task 5.1 widened `AdventureId`; `zoo/backdrops.ts`'s own
    // Phase 1 `PENDING_ENTRANCE_BACKDROP` indirection is closed — see
    // `apply-progress.md`). The parity this test guards is unchanged.
    const aquarium = manifest['sector-aquarium-background']
    const sand = manifest['sector-sand-background']
    const night = manifest['sector-night-background']
    const glass = ADVENTURE_BACKDROP.glass!
    const sandBackdrop = ADVENTURE_BACKDROP.sand!
    const nightBackdrop = ADVENTURE_BACKDROP.night!

    expect(aquarium.quiet).toBe(glass.quiet)
    expect(aquarium.brightest).toBe(glass.brightest)
    expect(aquarium.corridorRows).toEqual(glass.corridorRows)
    expect(glass.quiet).toBe('#9bb6c5')
    expect(glass.brightest).toBe('#c7d9e0')

    expect(sand.quiet).toBe(sandBackdrop.quiet)
    expect(sand.brightest).toBe(sandBackdrop.brightest)
    expect(sand.corridorRows).toEqual(sandBackdrop.corridorRows)
    expect(sandBackdrop.quiet).toBe('#d6cbba')
    expect(sandBackdrop.brightest).toBe('#dad0c0')

    expect(night.quiet).toBe(nightBackdrop.quiet)
    expect(night.brightest).toBe(nightBackdrop.brightest)
    expect(night.corridorRows).toEqual(nightBackdrop.corridorRows)
    // nightfall()'s swap-day gate (design.md §3.2): brightest in [77, 110].
    expect(luma(nightBackdrop.brightest)).toBeGreaterThanOrEqual(77)
    expect(luma(nightBackdrop.brightest)).toBeLessThanOrEqual(110)
  })

  it("the night backdrop's brightest reflects nightfall()'s derivation, not fondo bosque.png's own unmodified sample (zoo-map spec)", () => {
    // `sector-forest-background.png` is the SAME source (`fondo bosque.png`)
    // passed through UNCHANGED for paso F's own forest sector row — its
    // manifest entry is what "the un-derived forest source's own sampled
    // brightest" means (zoo-map spec "Entrance and Night Backdrops Resolve
    // Through the Adventure-Keyed Registry"). The derived night row must
    // differ, proving the sample really was taken post-`nightfall()`.
    const forest = manifest['sector-forest-background']
    const night = manifest['sector-night-background']
    expect(night.brightest).not.toBe(forest.brightest)
    expect(ADVENTURE_BACKDROP.night!.brightest).not.toBe(forest.brightest)
  })

  it('the night backdrop registry entry names no source file — only the built sector-night-background.png (zoo-map spec)', () => {
    const href = ADVENTURE_BACKDROP.night!.art.href
    expect(href).toContain('sector-night-background')
    expect(href.toLowerCase()).not.toContain('bosque')
    expect(href.toLowerCase()).not.toContain('forest')
  })

  it("matches the forest backdrop's quiet/brightest/corridorRows against the rebuilt manifest (free-trail-waypoints design.md §3.1, task 3.1)", () => {
    // The bee's `ADVENTURE_BACKDROP` row is hand-copied from these exact
    // values in Phase 7 (task 3.6/7.1) — asserted here, ahead of that row's
    // own creation, as the guard against the pipeline's own numbers drifting.
    const forest = manifest['sector-forest-background']
    expect(forest.corridorRows).toEqual({ top: 191, bottom: 926 })
    // The band is flat over this range: quiet and brightest are the SAME
    // colour (design.md §3.1's own prediction, confirmed by the rebuild).
    expect(forest.quiet).toBe('#86a678')
    expect(forest.brightest).toBe('#86a678')
  })

  it("gives the flower's two states IDENTICAL w/h (free-trail-waypoints design.md §3.2) — both derive from flor.png", () => {
    // A divergence here is the `clue-footprint-earned`/`-drained` failure
    // class repeating (220x256 vs 217x256, because those two came from
    // different drawings): the dormant→lit swap must not move the art.
    const flower = manifest['sector-flower']
    const dormant = manifest['sector-flower-dormant']
    expect(SECTOR_ADVENTURE_ART.flowerDormant.w).toBe(flower.w)
    expect(SECTOR_ADVENTURE_ART.flowerDormant.h).toBe(flower.h)
    expect(dormant.w).toBe(flower.w)
    expect(dormant.h).toBe(flower.h)
  })

  it("mirrors scripts/art/build_art.py's INK constant against the real TypeScript token", () => {
    // `build_art.py` is Python and cannot be imported here, so this mirrors
    // its `INK` literal the same way `palette.test.ts` mirrors
    // `CORRIDOR_EARTH`/`GROUND_FIELD` -- rather than by an import, by a
    // pinned literal this assertion keeps honest.
    //
    // This used to guard `INK_COLOR` (`#1e293b`, `TraceCanvas.tsx`'s ink for
    // the child's OWN pencil trace). `build_art.py` pointed its `INK`
    // constant at that value, which is exactly why every clue mark's outline
    // shipped in that blue instead of a neutral marker line. It now guards
    // `ART_OUTLINE` instead, the token `palette.ts` defines specifically for
    // drawn-world contours. If the pipeline's `INK` and this token drift
    // apart again, this is the assertion that goes red first.
    expect(ART_OUTLINE).toBe('#1a1a1a')
  })
})
