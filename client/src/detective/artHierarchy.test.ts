// The visual HIERARCHY of the sheet, asserted against the art that actually
// ships.
//
// THE RULE, in one sentence: an unfound clue mark must be easier to see than
// any piece of decorative ground, and must not be smaller than it.
//
// Why this file exists. The ground decoration and the clue marks are tuned in
// two different places by two different mechanisms — `build_art.py`'s `mute()`
// for the ground, `palette.ts`'s `CLUE_DRAINED` for the marks — and nothing
// connected them. `CLUE_DRAINED` was chosen when a clue mark lay on near-white
// paper (`SHEET_PAPER` #fdfcf7, luma 252), where #c8cdd2 cleared its ground by
// 48. When the sheet grew a ground, the corridor became `CORRIDOR_EARTH`
// #d9c3ae at luma 199 and that same grey collapsed to a contrast of 5 — while
// the grass, muted only against ITS own ground, kept 79. Measured on the
// shipped files: decoration out-shouted the subject by roughly sixteen to one,
// and rendered up to 1.9x its size. A five-year-old was being asked to hunt
// for the least visible thing on the screen.
//
// Neither half of that was a typo. Each value was right in its own context and
// went wrong when the other moved. That is exactly the class of defect a named
// invariant catches and a code review does not, which is the same argument
// `palette.test.ts` makes for `ART_OUTLINE`'s achromatic guard.
//
// WHY IT READS THE EMITTED PNGs AND NOT THE SOURCE VALUES. The ground art does
// not ship at its authored colours: `build_art.py`'s `mute()` desaturates it
// and blends it toward the ground beneath it, contours harder than fills. A
// test asserting on `art-source/` or on the `mute()` parameters would be
// asserting on an input to the thing that decides the answer. Only the files
// in `public/art/` know what the child sees.
//
// HOW THE BYTES GET HERE. Vite's `import.meta.glob` with `?inline`, which
// hands back a `data:` URL, rather than `node:fs` — the client tsconfig pins
// `types: ["vite/client"]` and `@types/node` is not a dependency, so a
// `node:fs` import fails `tsc --noEmit` even though it would run under vitest.
// `artManifest.test.ts` makes the same call for the same reason. The PNG
// decoder below is thirty lines because `build_art.py` writes exactly one
// shape of file — 8-bit RGBA, colour type 6, non-interlaced, one `IDAT` — and
// pulling in a decoding dependency to read art this repo generates itself
// would be a poor trade.
import { describe, expect, it } from 'vitest'
import { grassScatter, mudScatter, type ScatterMark } from '../canvas/groundScatter'
import { CLUE_MARK_SIZE } from '../screen/LevelPlay'
import {
  HOME_OCTOPUS_ART,
  HEDGEHOG_ART,
  ANDEAN_HAT_ART,
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

/** The two ground tones, mirrored from `TraceCanvas.tsx:108-109` the same way
 * `palette.test.ts` and `build_art.py` mirror them — importing the component
 * would drag React into a test that is arithmetic on pixels. */
/** A pixel darker than this is contour, not fill -- `build_art.py`'s own
 * `INK_LUMA`, mirrored here the same way the ground tones are. */
const INK_LUMA = 90

/** A contour pixel carrying more colour than this is not the contour, it is the
 * resample blending the contour into a saturated fill beside it. */
const CONTOUR_CHROMA_TOLERANCE = 20
const ZOO_DARK_CHROMA_TOLERANCE = 4

/** What share of a contour may be that fringe.
 *
 * Measured, not guessed, and the spread is what makes the rule safe: after the
 * fix `goal-medusa` sits at 3% and `hazard-starfish` at 4%, while the old navy
 * `carrier-octopus` sat at 97% and `goal-medusa` before the fix was effectively
 * 100%. Anything between the current prop fringe and those failures would do;
 * 25 is far from both edges rather than tuned to admit what happens to ship. */
const MAX_COLOURED_CONTOUR_SHARE = 0.25

const CORRIDOR_EARTH = '#d9c3ae'
const GROUND_FIELD = '#c9d7bd'

/** Rec. 601 luma. Same weights as `build_art.py`'s `luma()` and
 * `palette.test.ts`'s, and it FLOORS like the pipeline rather than rounding
 * like the palette test -- this file measures pixels the pipeline produced, so
 * it should round the way the pipeline does. The two can differ by one, which
 * is far below every margin asserted here. */
function luma(r: number, g: number, b: number): number {
  return Math.floor((r * 299 + g * 587 + b * 114) / 1000)
}

function lumaOfHex(hex: string): number {
  return luma(
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  )
}

// ── PNG ───────────────────────────────────────────────────────────────────

interface Raster {
  w: number
  h: number
  /** RGBA, row-major, 4 bytes per pixel. */
  px: Uint8Array
}

/** `Uint8Array<ArrayBuffer>`, spelled out, because the default parameter is
 * `ArrayBufferLike` and `BlobPart` will not accept a view that might be backed
 * by a `SharedArrayBuffer`. Every array here is freshly allocated, so pinning
 * the buffer type is a statement of fact rather than a cast. */
type Bytes = Uint8Array<ArrayBuffer>

function base64ToBytes(b64: string): Bytes {
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

async function inflate(data: Bytes): Promise<Bytes> {
  const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate'))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

function paeth(a: number, b: number, c: number): number {
  const p = a + b - c
  const pa = Math.abs(p - a)
  const pb = Math.abs(p - b)
  const pc = Math.abs(p - c)
  if (pa <= pb && pa <= pc) return a
  return pb <= pc ? b : c
}

/** Decode one 8-bit RGBA non-interlaced PNG. Rejects anything else loudly
 * rather than silently mis-reading it: if `png.py`'s `write_png` ever emits a
 * different shape, this must stop rather than measure garbage. */
async function decodePng(bytes: Bytes): Promise<Raster> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  let w = 0
  let h = 0
  const idat: Uint8Array[] = []
  let pos = 8 // past the 8-byte signature
  while (pos < bytes.length) {
    const len = view.getUint32(pos)
    const tag = String.fromCharCode(...bytes.subarray(pos + 4, pos + 8))
    const body = bytes.subarray(pos + 8, pos + 8 + len)
    if (tag === 'IHDR') {
      w = view.getUint32(pos + 8)
      h = view.getUint32(pos + 12)
      const [depth, colour, , , interlace] = body.subarray(8)
      if (depth !== 8 || colour !== 6 || interlace !== 0) {
        throw new Error(`unsupported PNG: depth ${depth}, colour type ${colour}`)
      }
    } else if (tag === 'IDAT') {
      idat.push(body)
    } else if (tag === 'IEND') {
      break
    }
    pos += 12 + len
  }
  const merged: Bytes = new Uint8Array(idat.reduce((n, c) => n + c.length, 0))
  let at = 0
  for (const chunk of idat) {
    merged.set(chunk, at)
    at += chunk.length
  }
  const raw = await inflate(merged)

  const stride = w * 4
  const px = new Uint8Array(stride * h)
  let src = 0
  for (let y = 0; y < h; y++) {
    const filter = raw[src++]
    const row = y * stride
    for (let x = 0; x < stride; x++) {
      const a = x >= 4 ? px[row + x - 4] : 0
      const b = y > 0 ? px[row - stride + x] : 0
      const c = x >= 4 && y > 0 ? px[row - stride + x - 4] : 0
      const v = raw[src + x]
      let out: number
      if (filter === 0) out = v
      else if (filter === 1) out = v + a
      else if (filter === 2) out = v + b
      else if (filter === 3) out = v + ((a + b) >> 1)
      else if (filter === 4) out = v + paeth(a, b, c)
      else throw new Error(`unknown PNG filter ${filter}`)
      px[row + x] = out & 0xff
    }
    src += stride
  }
  return { w, h, px }
}

// ── The measurement ───────────────────────────────────────────────────────

/**
 * How far this mark's BODY sits from the ground it lies on, in luma.
 *
 * The MEDIAN of the per-pixel gap over the mark's opaque pixels, not the mean
 * and not the darkest pixel. Three reasons, and they are the whole reason the
 * number below is trustworthy:
 *
 *  - The mean is flattered by the marker contour. A drained clue's `#1a1a1a`
 *    outline sits 174 from the earth and drags the mean up to ~50 even while
 *    the body it encloses sits at 5 and is invisible. The median ignores a
 *    thin rim, which is right: at a rendered height of 28 units the rim is
 *    about a pixel and the body is what the eye integrates.
 *  - The darkest pixel measures the rim and nothing else.
 *  - The median is also the one statistic here that cannot be gamed by
 *    splitting a fill into two near-identical colours, which a most-frequent-
 *    colour statistic can.
 *
 * `clue-webfoot-drained.png` is the proof that the choice matters: it is built
 * with `keep_ink=False`, so it has no contour at all and is a single flat
 * `CLUE_DRAINED` silhouette. Its mean and its median agree, and both say what
 * the eye says.
 */
function bodyContrast(art: Raster, groundHex: string): number {
  const ground = lumaOfHex(groundHex)
  const gaps: number[] = []
  for (let i = 0; i < art.px.length; i += 4) {
    if (art.px[i + 3] < 128) continue
    gaps.push(Math.abs(luma(art.px[i], art.px[i + 1], art.px[i + 2]) - ground))
  }
  if (gaps.length === 0) throw new Error('art has no opaque pixels')
  gaps.sort((a, b) => a - b)
  return gaps[gaps.length >> 1]
}

type Inlined = Record<string, string>

const GRASS_FILES = import.meta.glob('../../public/art/ground-grass-*.png', {
  eager: true,
  query: '?inline',
  import: 'default',
}) as Inlined
const MUD_FILES = import.meta.glob('../../public/art/ground-mud-*.png', {
  eager: true,
  query: '?inline',
  import: 'default',
}) as Inlined
const DRAINED_FILES = import.meta.glob('../../public/art/clue-*-drained.png', {
  eager: true,
  query: '?inline',
  import: 'default',
}) as Inlined

/** The props that stand ON the sheet beside a clue mark -- a goal at the end of
 * the route, a hazard crossing it. Globbed by prefix rather than listed, so a
 * prop added later is covered without anyone remembering to add it here. */
const PROP_FILES = import.meta.glob('../../public/art/{goal,hazard}-*.png', {
  eager: true,
  query: '?inline',
  import: 'default',
}) as Inlined

/** Zoo-journey outputs plus the two octopuses whose legacy navy contours were
 * corrected in the same pipeline change. Exact names make adding or removing
 * a shipped asset an explicit contract update rather than a wildcard surprise. */
const WORLD_GUARD_FILES = import.meta.glob(
  '../../public/art/{zoo-*,sector-*,hedgehog-*,andean-hat,carrier-octopus,home-octopus}.png',
  {
    eager: true,
    query: '?inline',
    import: 'default',
  },
) as Inlined

const WORLD_GUARDED_ART: Readonly<Record<string, ArtImage>> = {
  'zoo-map.png': ZOO_MAP_ART,
  'zoo-fog-1.png': ZOO_FOG_ART[0],
  'zoo-fog-2.png': ZOO_FOG_ART[1],
  'zoo-fog-3.png': ZOO_FOG_ART[2],
  'zoo-octopus-backpack.png': ZOO_OCTOPUS_BACKPACK_ART,
  'zoo-backpack.png': ZOO_BACKPACK_ART,
  'zoo-star.png': ZOO_STAR_ART,
  'zoo-octopus-print.png': ZOO_OCTOPUS_PRINT_ART,
  'zoo-speech-bubble.png': ZOO_SPEECH_BUBBLE_ART,
  'carrier-octopus.png': OCTOPUS_ART,
  'home-octopus.png': HOME_OCTOPUS_ART,
  'hedgehog-profile.png': HEDGEHOG_ART.profile,
  'hedgehog-curled.png': HEDGEHOG_ART.curled,
  'andean-hat.png': ANDEAN_HAT_ART,
  ...Object.fromEntries(
    Object.entries(SECTOR_BACKGROUND_ART).map(([id, art]) => [`sector-${id}-background.png`, art]),
  ),
  ...Object.fromEntries(
    Object.entries(SECTOR_ADVENTURE_ART).map(([id, art]) => [
      `sector-${id.replace(/([A-Z])/g, '-$1').toLowerCase()}.png`,
      art,
    ]),
  ),
}

const FULL_CANVAS_ART = new Set([
  'zoo-map.png',
  ...Object.values(SECTOR_BACKGROUND_ART).map((art) => art.href.split('/').pop()!),
])

/** Authoring canvases are a separate contract from compact shipped assets:
 * backgrounds retain their final 3:2 coordinate system, while cutouts retain
 * a square transparent workspace before `build_art.py` crops them. */
const SECTOR_SOURCE_FILES = import.meta.glob(
  '../../../art-source/{fondo laguna,fondo arena,fondo ladera,fondo cordillera,fondo bosque,fondo pecera,vibora chica,vibora mediana,vibora grande,llama,abeja,flor,panal,delfin,caracol,linterna,erizo,erizo enroscado,gorro andino}.png',
  { eager: true, query: '?inline', import: 'default' },
) as Inlined

const SECTOR_SOURCE_CANVASES: Readonly<Record<string, { w: number; h: number; opaque: boolean }>> = {
  'fondo laguna.png': { w: 1536, h: 1024, opaque: true },
  'fondo arena.png': { w: 1536, h: 1024, opaque: true },
  'fondo ladera.png': { w: 1536, h: 1024, opaque: true },
  'fondo cordillera.png': { w: 1536, h: 1024, opaque: true },
  'fondo bosque.png': { w: 1536, h: 1024, opaque: true },
  'fondo pecera.png': { w: 1536, h: 1024, opaque: true },
  'vibora chica.png': { w: 1024, h: 1024, opaque: false },
  'vibora mediana.png': { w: 1024, h: 1024, opaque: false },
  'vibora grande.png': { w: 1024, h: 1024, opaque: false },
  'llama.png': { w: 1024, h: 1024, opaque: false },
  'abeja.png': { w: 1024, h: 1024, opaque: false },
  'flor.png': { w: 1024, h: 1024, opaque: false },
  'panal.png': { w: 1024, h: 1024, opaque: false },
  'delfin.png': { w: 1024, h: 1024, opaque: false },
  'caracol.png': { w: 1024, h: 1024, opaque: false },
  'linterna.png': { w: 1024, h: 1024, opaque: false },
  'erizo.png': { w: 1024, h: 1024, opaque: false },
  'erizo enroscado.png': { w: 1024, h: 1024, opaque: false },
  'gorro andino.png': { w: 1024, h: 1024, opaque: false },
}

/** The tracing corridor is deliberate negative space, not empty scenery by
 * accident: docs/09 §9 reserves y=20–80% for only the sector's calm base
 * colour. A two-channel tolerance accepts lossless PNG tooling that rounds a
 * palette value while still rejecting decoration, contours, or texture. */
const SECTOR_QUIET_BAND_BASE: Readonly<Record<string, readonly [number, number, number]>> = {
  'fondo laguna.png': [180, 197, 208],
  'fondo arena.png': [214, 203, 186],
  'fondo ladera.png': [157, 163, 150],
  'fondo cordillera.png': [200, 211, 216],
  'fondo bosque.png': [148, 155, 140],
  'fondo pecera.png': [155, 182, 197],
}

/** Full-canvas sector art is a true pass-through: the authored source IS the
 * shipped coordinate system. Keep this explicit rather than deriving names,
 * because `laguna` → `lagoon` and `cordillera` → `range` are intentional
 * product vocabulary translations. */
const SECTOR_SOURCE_TO_EMITTED: Readonly<Record<string, string>> = {
  'fondo laguna.png': 'sector-lagoon-background.png',
  'fondo arena.png': 'sector-sand-background.png',
  'fondo ladera.png': 'sector-slope-background.png',
  'fondo cordillera.png': 'sector-range-background.png',
  'fondo bosque.png': 'sector-forest-background.png',
  'fondo pecera.png': 'sector-aquarium-background.png',
}

function named(files: Inlined): readonly (readonly [string, string])[] {
  return Object.entries(files).map(([path, url]) => [path.split('/').pop()!, url] as const)
}

async function measure(
  files: Inlined,
  groundHex: string,
): Promise<readonly { name: string; contrast: number }[]> {
  return Promise.all(
    named(files).map(async ([name, url]) => ({
      name,
      contrast: bodyContrast(await decodePng(base64ToBytes(url.split(',')[1])), groundHex),
    })),
  )
}

/** A drained mark is measured against the WORSE of the two grounds. The
 * corridor earth is the ground a clue is actually drawn on, but a mark near
 * the corridor edge is read against the field too, and eight luma of
 * difference is not worth a second rule. */
async function measureDrained(): Promise<readonly { name: string; contrast: number }[]> {
  const onEarth = await measure(DRAINED_FILES, CORRIDOR_EARTH)
  const onField = await measure(DRAINED_FILES, GROUND_FIELD)
  return onEarth.map((e, i) => ({ name: e.name, contrast: Math.min(e.contrast, onField[i].contrast) }))
}

/** Enough of a route to exercise the real scatter functions. The invariant is
 * about the sizes production actually emits, not about the constants that
 * produce them, so this calls `grassScatter`/`mudScatter` rather than
 * re-reading `GRASS_SIZE_MAX` — a size clamp added downstream would otherwise
 * not be seen, and a constant renamed would break the test for the wrong
 * reason. */
function scatterSizes(): readonly number[] {
  const polyline = Array.from({ length: 60 }, (_, i) => ({
    x: 60 + i * 15,
    y: 300 + Math.sin(i / 6) * 150,
  }))
  const input = {
    polyline,
    halfWidthAt: () => 45,
    viewBox: { x: 0, y: 0, width: 1000, height: 600 },
    artCount: 12,
    seed: 7,
  }
  const marks: readonly ScatterMark[] = [...grassScatter(input), ...mudScatter(input)]
  return marks.map((m) => m.size)
}

describe('visual hierarchy: the clue outranks the ground it lies on', () => {
  it('locks the sector source canvas and alpha contracts before shipping', async () => {
    const files = named(SECTOR_SOURCE_FILES)
    const emitted = new Map(named(WORLD_GUARD_FILES))
    expect(files.map(([name]) => name).sort()).toEqual(Object.keys(SECTOR_SOURCE_CANVASES).sort())
    for (const [name, url] of files) {
      const expected = SECTOR_SOURCE_CANVASES[name]
      const art = await decodePng(base64ToBytes(url.split(',')[1]))
      expect({ w: art.w, h: art.h }, `${name}: authoring canvas drifted`).toEqual({
        w: expected.w,
        h: expected.h,
      })
      let transparent = 0
      for (let index = 3; index < art.px.length; index += 4) {
        if (art.px[index] === 0) transparent += 1
      }
      if (expected.opaque) expect(transparent, `${name}: background must be opaque`).toBe(0)
      else {
        expect(transparent, `${name}: cutout needs transparent margin`).toBeGreaterThan(0)
        // New cutouts are source assets, not just pipeline products: reject a
        // navy/green contour before `recontour()` could hide it downstream.
        // The soft edge may blend a fill into the marker, but the source's
        // truly dark pixels must already be neutral #1a1a1a-family ink.
        let darkChromatic = 0
        for (let index = 0; index < art.px.length; index += 4) {
          if (art.px[index + 3] === 0 || luma(art.px[index], art.px[index + 1], art.px[index + 2]) >= INK_LUMA) continue
          if (Math.max(art.px[index], art.px[index + 1], art.px[index + 2]) - Math.min(art.px[index], art.px[index + 1], art.px[index + 2]) > ZOO_DARK_CHROMA_TOLERANCE) darkChromatic += 1
        }
        expect(darkChromatic, `${name}: source contour must be achromatic before processing`).toBe(0)
      }

      const quietBase = SECTOR_QUIET_BAND_BASE[name]
      if (quietBase) {
        let decorated = 0
        for (let y = Math.floor(art.h * 0.2); y < Math.floor(art.h * 0.8); y++) {
          for (let x = 0; x < art.w; x++) {
            const at = (y * art.w + x) * 4
            if (
              Math.abs(art.px[at] - quietBase[0]) > 2 ||
              Math.abs(art.px[at + 1] - quietBase[1]) > 2 ||
              Math.abs(art.px[at + 2] - quietBase[2]) > 2
            ) {
              decorated += 1
            }
          }
        }
        expect(decorated, `${name}: the y=20–80% tracing band must stay calm`).toBe(0)

        // `PASSTHROUGHS` must not later introduce a resize, recolour, or
        // crop. Check every RGBA byte, including the quiet corridor and the
        // intentionally dark/chromatic scenery fills outside it.
        const emittedName = SECTOR_SOURCE_TO_EMITTED[name]
        const emittedUrl = emitted.get(emittedName)
        expect(emittedUrl, `${name}: its pass-through output is missing`).toBeDefined()
        const shipped = await decodePng(base64ToBytes(emittedUrl!.split(',')[1]))
        expect({ w: shipped.w, h: shipped.h }, `${name}: pass-through dimensions drifted`).toEqual({
          w: art.w,
          h: art.h,
        })
        let mismatchedBytes = 0
        for (let index = 0; index < art.px.length; index++) {
          if (art.px[index] !== shipped.px[index]) mismatchedBytes += 1
        }
        expect(mismatchedBytes, `${name}: emitted art differs from its source`).toBe(0)
      }
    }
  }, 20_000)

  it('finds the shipped ground and clue art', () => {
    // The half that keeps every assertion below honest. `import.meta.glob`
    // returns `{}` for a pattern that matches nothing, and every `for` loop
    // over an empty list passes. Rename the art files and this goes red
    // FIRST, instead of the suite quietly asserting about nothing.
    expect(Object.keys(GRASS_FILES).length).toBe(12)
    expect(Object.keys(MUD_FILES).length).toBe(8)
    expect(Object.keys(DRAINED_FILES).length).toBeGreaterThanOrEqual(7)
  })

  it('makes every drained clue out-contrast every piece of ground decoration', async () => {
    const drained = await measureDrained()
    const decoration = [
      ...(await measure(GRASS_FILES, GROUND_FIELD)),
      ...(await measure(MUD_FILES, CORRIDOR_EARTH)),
    ]
    const faintestClue = drained.reduce((a, b) => (a.contrast <= b.contrast ? a : b))
    const loudestDecoration = decoration.reduce((a, b) => (a.contrast >= b.contrast ? a : b))
    expect(
      faintestClue.contrast,
      `${faintestClue.name} sits ${faintestClue.contrast} luma from its ground, but ` +
        `${loudestDecoration.name} sits ${loudestDecoration.contrast} from its own -- ` +
        'the decoration is easier to find than the thing the child is looking for',
    ).toBeGreaterThan(loudestDecoration.contrast)
  })

  it('keeps the ground visible rather than solving the rule by erasing it', async () => {
    // The rule above is an ORDERING, and an ordering can always be satisfied
    // from the wrong end: mute the ground until it is the colour of the
    // ground and the clue wins by default. That is not a fix, it is the
    // "bald patches" failure `build_art.py`'s `mute()` already records paying
    // to avoid. A floor here is what stops the next person taking that exit.
    //
    // 18 is deliberately far below where the decoration is tuned and far
    // above invisible: it does not pin the tuning, it forbids deletion.
    for (const [files, ground] of [
      [GRASS_FILES, GROUND_FIELD],
      [MUD_FILES, CORRIDOR_EARTH],
    ] as const) {
      for (const { name, contrast } of await measure(files, ground)) {
        expect(contrast, `${name} has been muted into its own ground`).toBeGreaterThanOrEqual(18)
      }
    }
  })

  it('never renders a piece of ground decoration larger than a clue mark', () => {
    const sizes = scatterSizes()
    expect(sizes.length).toBeGreaterThan(20)
    const biggest = Math.max(...sizes)
    expect(
      biggest,
      `ground decoration renders at ${biggest.toFixed(1)} units against a ${CLUE_MARK_SIZE}-unit ` +
        'clue mark -- the decoration is bigger than the subject',
    ).toBeLessThanOrEqual(CLUE_MARK_SIZE)
  })

  /** The drawn world has exactly one contour colour, and it is achromatic.
   *
   * Not a style preference -- a scar. `client/src/detective/palette.ts`'s header
   * records this drifting twice already: the clue marks' outlines shipped in the
   * child's own pencil blue `#1e293b` (hue 217), and the grass tufts came from
   * the author in `#19241c` (hue 136, chroma 11). It drifted a third time in
   * this very change: before their rows switched to `contour`, `medusa.png` and
   * `estrella de mar.png` measured chroma 119 and 122 -- ten times the grass
   * incident -- because their earlier `fill=None` path forced no outline token.
   *
   * The fix was a third pipeline mode, `recontour`, which sends only the contour
   * to `ART_OUTLINE` and leaves every fill exactly as drawn. This test is what
   * stops a fourth time.
   *
   * The four deduction animals are deliberately out of scope: they stand alone
   * on the lineup, never beside a clue mark, and `docs/09` section 4 makes them
   * the one place authored colour rules. The octopus variants are now normalized
   * too; the stricter zoo regression below checks every dark pixel in them rather
   * than allowing a percentage of coloured resampling fringe. */
  it('gives every prop that stands on the sheet the drawn world\'s achromatic contour', async () => {
    const props = named(PROP_FILES)
    expect(props.length, 'no goal/hazard prop art found -- the glob has gone stale').toBeGreaterThan(0)
    for (const [name, url] of props) {
      const art = await decodePng(base64ToBytes(url.split(',')[1]))
      let contour = 0
      let coloured = 0
      for (let i = 0; i < art.px.length; i += 4) {
        if (art.px[i + 3] < 250) continue
        const [r, g, b] = [art.px[i], art.px[i + 1], art.px[i + 2]]
        if (luma(r, g, b) >= INK_LUMA) continue
        contour += 1
        if (Math.max(r, g, b) - Math.min(r, g, b) > CONTOUR_CHROMA_TOLERANCE) coloured += 1
      }
      expect(contour, `${name} has no contour to measure`).toBeGreaterThan(0)
      const share = coloured / contour
      expect(
        share,
        `${(share * 100).toFixed(0)}% of ${name}'s contour carries colour -- the drawn world's ` +
          'outline is achromatic, and a coloured one is the most repeated wrong colour on the sheet',
      ).toBeLessThanOrEqual(MAX_COLOURED_CONTOUR_SHARE)
    }
  })

  it('keeps zoo and sector art on intrinsic canvases with safe alpha and dark pixels', async () => {
    const files = named(WORLD_GUARD_FILES)
    expect(files.map(([name]) => name).sort()).toEqual(Object.keys(WORLD_GUARDED_ART).sort())

    for (const [name, url] of files) {
      const expected = WORLD_GUARDED_ART[name]
      const art = await decodePng(base64ToBytes(url.split(',')[1]))
      expect({ w: art.w, h: art.h }, `${name}: intrinsic dimensions drifted`).toEqual({
        w: expected.w,
        h: expected.h,
      })

      let transparent = 0
      let partial = 0
      let visible = 0
      let darkChromatic = 0
      // A full scene may legitimately include a dark green/brown fill (for
      // example aquarium algae); only near-black pixels are unambiguously the
      // drawn contour. Transparent cutouts have no such scene fill, so their
      // stricter <90 rule remains the world-outline contract.
      const contourLuma = FULL_CANVAS_ART.has(name) ? 50 : INK_LUMA
      for (let i = 0; i < art.px.length; i += 4) {
        const [r, g, b, a] = [art.px[i], art.px[i + 1], art.px[i + 2], art.px[i + 3]]
        if (a === 0) transparent += 1
        else visible += 1
        if (a > 0 && a < 255) partial += 1
        if (
          a > 0 &&
          luma(r, g, b) < contourLuma &&
          Math.max(r, g, b) - Math.min(r, g, b) > ZOO_DARK_CHROMA_TOLERANCE
        ) {
          darkChromatic += 1
        }
      }

      expect(visible, `${name}: asset is empty`).toBeGreaterThan(0)
      if (FULL_CANVAS_ART.has(name)) {
        expect(transparent, `${name}: full-canvas map must be opaque`).toBe(0)
        expect(partial, `${name}: full-canvas map must be opaque`).toBe(0)
      } else {
        expect(transparent, `${name}: cutout has no transparent background`).toBeGreaterThan(0)
        expect(partial, `${name}: cutout lost its antialiased alpha edge`).toBeGreaterThan(0)
      }
      expect(
        darkChromatic,
        `${name}: dark pixels must be achromatic within ${ZOO_DARK_CHROMA_TOLERANCE} channels`,
      ).toBe(0)
    }
  })

  /** Regression for the sheep-hill boxed-sheep defect. `oveja.png` carries an
   * alpha DITHER across the whole canvas -- 4,374 evenly spaced opaque specks
   * of 240px each, alongside the one real 632,576px sheep -- so `prepare()`'s
   * `alpha_bbox` found opaque pixels in every corner, cropped NOTHING, and
   * shipped the entire 1198x1313 lamina scaled down. Over the mountains' dark
   * `CHANNEL_STONE` corridor that composited as a light box around each
   * sheep, visible in `capturas/pasoC/sheep-hill1.png` and `sheep-hill3.png`.
   *
   * Fixed in `scripts/art/build_art.py` by listing the source in
   * `SPECKLED_ALPHA_SOURCES`, which routes it through the pipeline's own
   * pre-existing `keep_largest_blob()` before the crop -- the sheep is one
   * connected region and every speck is its own. The shipped file went
   * 409x448/225 KB to 420x448/83 KB, and exactly one manifest entry moved.
   *
   * This asserts the SHIPPED file, the same way every other check in this
   * describe block does.
   *
   * Two checks, because either alone is not enough:
   *
   *  - Every corner must be fully transparent. A background box necessarily
   *    reaches all four corners opaque; a genuine cutout's alpha-bbox crop
   *    hugs the silhouette, and a blob-shaped animal's extreme-x and
   *    extreme-y points essentially never coincide at the same corner.
   *    Measured across every sibling cutout this file already knows about
   *    (llama, dolphin, snail, bee, the four deduction animals, the
   *    hedgehog poses), all four corners sit at alpha 0.
   *  - The near-fully-opaque pixel fraction alone is NOT a reliable box
   *    detector in this pipeline: a tightly-cropped, bulky silhouette
   *    legitimately fills most of its own bounding box. Measured on the
   *    files this pipeline already ships, real cutouts span roughly 44%
   *    (`sector-dolphin`) to 73% (`sector-snail`), while a genuine
   *    full-canvas background (`zoo-map`, every `sector-*-background`) sits
   *    at 100% with opaque corners. 85% sits with real headroom above every
   *    shipped cutout and real headroom below an actual box, so it catches a
   *    box recurring without being tripped by an ordinary bulky animal.
   *    (Alpha >= 250, not === 255: cascaded `box_resize` area-averaging
   *    rounds some interior pixels a shade under 255 even for wholly opaque
   *    source regions -- measured on `sector-llama.png`, which never reaches
   *    255 at all.)
   */
  it('keeps sector-sheep.png a genuine cutout, not the opaque near-white background it once shipped with', async () => {
    const sheepUrl = named(WORLD_GUARD_FILES).find(([name]) => name === 'sector-sheep.png')?.[1]
    expect(sheepUrl, 'sector-sheep.png not found among the shipped world/sector art').toBeDefined()
    const art = await decodePng(base64ToBytes(sheepUrl!.split(',')[1]))

    const alphaAt = (x: number, y: number) => art.px[(y * art.w + x) * 4 + 3]
    for (const [label, x, y] of [
      ['top-left', 0, 0],
      ['top-right', art.w - 1, 0],
      ['bottom-left', 0, art.h - 1],
      ['bottom-right', art.w - 1, art.h - 1],
    ] as const) {
      expect(alphaAt(x, y), `sector-sheep.png ${label} corner must be transparent`).toBe(0)
    }

    let nearOpaque = 0
    for (let i = 3; i < art.px.length; i += 4) {
      if (art.px[i] >= 250) nearOpaque += 1
    }
    const nearOpaqueFraction = nearOpaque / (art.w * art.h)
    expect(
      nearOpaqueFraction,
      `sector-sheep.png is ${(nearOpaqueFraction * 100).toFixed(1)}% near-fully-opaque -- reads ` +
        'as a background box, not a cutout',
    ).toBeLessThan(0.85)
  })
})
