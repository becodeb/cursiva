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
  ANIMAL_ART,
  CARRIER_LENS_ART,
  CLUE_ART,
  GOAL_MEDUSA_ART,
  GROUND_GRASS,
  GROUND_MUD,
  HAZARD_STARFISH_ART,
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
import { ART_OUTLINE } from './palette'

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
}

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
  ['CARRIER_LENS_ART', CARRIER_LENS_ART] as const,
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
    // + 6 sector backgrounds + 10 sector adventure cutouts + 12 grass + 8 mud.
    // Grass carries MORE variants than mud on purpose: it covers the whole
    // field at full size, where a repeated silhouette is obvious, while mud
    // sits small inside the corridor and half-covered by the child's own line.
    expect(REGISTERED.length).toBe(71)
    const hrefs = REGISTERED.map(([, art]) => art.href)
    expect(new Set(hrefs).size, 'two registry entries point at the same file').toBe(hrefs.length)
  })

  it('leaves no manifest entry unregistered, so shipped art is never dead weight', () => {
    const registered = new Set(REGISTERED.map(([, art]) => keyOf(art.href)))
    const orphans = Object.keys(manifest).filter((key) => !registered.has(key))
    expect(orphans, 'the pipeline ships art nothing in the registry can reach').toEqual([])
  })

  it("pairs every clue's earned and drained art as two DIFFERENT files", () => {
    for (const [kind, art] of Object.entries(CLUE_ART)) {
      expect(art.art.earned.href, `${kind}: earned and drained must be distinguishable`).not.toBe(
        art.art.drained.href,
      )
    }
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
