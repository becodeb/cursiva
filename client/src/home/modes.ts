// The home's mode registry (`docs/10_HOME_LA_OFICINA_DEL_PULPO.md` §5).
//
// THE ARCHITECTURAL POINT, and it is the whole reason this file exists rather
// than a pile of JSX in `HomeScreen`: a mode is an ENTRY IN AN ARRAY, not code.
// The octopus is drawn exactly once and every mode is an object placed on one
// of its eight free arms. Adding a mode is one row here plus its two PNGs
// through `scripts/art/build_art.py`; the screen is never redesigned. Eight
// arms is the natural ceiling and there is room to spare.
//
// Same shape as `levels/catalog.ts`: a declarative table the renderer walks,
// with the per-entry decisions (which arm, which art, when it unlocks, where
// it goes) stated as data instead of branches.
import { HOME_OCTOPUS_ART, CARRIER_LENS_ART, type ArtImage } from '../detective/assets'
import type { LevelRecord } from '../game/types'

/** Every mode the home can ever hold an object for. Grows one member per mode;
 * `detective` is the only one that exists today (`docs/10` §5, "primer corte"). */
export type HomeModeId = 'detective' | 'cuaderno' | 'casos'

/** Which of the eight arms holds the object. */
export type ArmIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7

/** Where touching the object takes the child. `letters` is the existing
 * `MainScreen` letter workbench and `caseMap` the future case picker; both are
 * named here so the registry's type is complete from the start, and neither
 * has an entry yet (`docs/10` §5: "los otros objetos entran cuando exista su
 * modo"). */
export type HomeDestination = 'trail' | 'letters' | 'caseMap'

export interface HomeMode {
  id: HomeModeId
  arm: ArmIndex
  /** The object, in its authored colour. */
  art: ArtImage
  /** The same object drained to `CLUE_DRAINED`, shown when `unlocked` is false.
   * `null` for a mode that can never be locked — requiring a grey file for a
   * state that cannot happen would mean shipping art nothing renders, which
   * `artManifest.test.ts` rejects by name. `docs/10` §5 types this field as a
   * plain `ArtImage`; it is widened here for that reason and no other. */
  artLocked: ArtImage | null
  /**
   * Where the ARM holds this object, as a fraction of the art's own box.
   *
   * Defaults to the centre, and the glass is why it has to be declarable.
   * `carrier-lens.png` is not centred on its lens: `build_art.py`'s `CENTRED`
   * step pads the image so the lens lands in the middle, and then `emit()`
   * crops every output back to its alpha bounding box, which removes exactly
   * that padding again. Measured on the shipped file, the glass sits at
   * (0.603, 0.391) of the box — a long way from (0.5, 0.5).
   *
   * A per-object grip point is the right shape regardless of that bug: a
   * pencil is held at its barrel and a map at a corner, and neither is its
   * bounding-box centre either. It is data in the registry, not an offset
   * hidden in the renderer — the distinction `docs/09` §2 draws.
   */
  grip?: readonly [number, number]
  unlocked: (records: Readonly<Record<string, LevelRecord>>) => boolean
  enter: HomeDestination
}

/** A grip that was never declared: the middle of the picture. */
export const DEFAULT_GRIP: readonly [number, number] = [0.5, 0.5]

/**
 * The eight arm tips, as FRACTIONS of the octopus art's own box.
 *
 * Measured once, by eye, against the shipped `home-octopus.png` (448x396) —
 * each pair is the centre of one curled arm tip, the spot an object sits in.
 * They are fractions and not canvas coordinates on purpose: `build_art.py`
 * crops every output to its alpha bounding box, so a redrawn or re-cropped
 * octopus changes the file's pixel size while the arms stay in the same place
 * RELATIVE to the drawing. Absolute canvas numbers would silently drift on the
 * next art pass; fractions do not. `HomeScreen` maps them through whatever box
 * it renders the octopus in.
 *
 * Order is reading order over the drawing: down the left side (0-2), across
 * the two front arms (3-4), then up the right side (5-7).
 */
export const ARM_ANCHORS: readonly (readonly [number, number])[] = [
  [0.116, 0.384], // 0 upper left
  [0.085, 0.593], // 1 middle left
  [0.174, 0.813], // 2 lower left
  [0.346, 0.889], // 3 front left
  [0.661, 0.896], // 4 front right
  [0.833, 0.821], // 5 lower right
  [0.915, 0.593], // 6 middle right
  [0.884, 0.384], // 7 upper right
]

/** The octopus art the anchors were measured against. Re-exported so the
 * screen and the anchors can never be pointed at two different drawings. */
export const HOME_OCTOPUS = HOME_OCTOPUS_ART

/**
 * The registry. One entry today.
 *
 * `detective` is the case itself, and the magnifying glass is its object — the
 * same glass that rides the child's finger on a trail, so touching it reads as
 * picking up where they left off rather than as opening a menu item. It sits
 * on a FRONT arm (`docs/10` §3: "sostenida en un brazo delantero, grande y a
 * mano") and it never locks: there is no state of this app in which the child
 * cannot go investigate.
 */
export const HOME_MODES: readonly HomeMode[] = [
  {
    id: 'detective',
    arm: 4,
    art: CARRIER_LENS_ART,
    artLocked: null,
    // The LENS, measured on the shipped file — see `grip` above for why this
    // is not (0.5, 0.5). The octopus grips the glass by its lens, the way the
    // child's finger carries it on a trail.
    grip: [0.603, 0.391],
    unlocked: () => true,
    enter: 'trail',
  },
]

/**
 * What to draw on a mode's arm, and whether it can be touched.
 *
 * Three outcomes, matching `docs/10` §3 exactly: the object in colour when the
 * mode is open, the object in drained grey when it is locked, and NOTHING when
 * a locked mode has no drained art — an arm with nothing on it is the honest
 * picture of a mode that is not there, and it is what every future arm shows
 * until its mode ships.
 *
 * Pure and exported rather than inlined into the renderer for this repo's
 * usual reason: the node test harness cannot observe a branch taken inside a
 * component, so the branch lives where a test can call it. It is also the only
 * way the locked path is exercised at all right now — no shipped mode locks.
 */
export function modeArt(
  mode: HomeMode,
  records: Readonly<Record<string, LevelRecord>>,
): { art: ArtImage; enabled: boolean } | null {
  if (mode.unlocked(records)) return { art: mode.art, enabled: true }
  return mode.artLocked ? { art: mode.artLocked, enabled: false } : null
}
