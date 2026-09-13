#!/usr/bin/env python3
"""Derive the shipped raster art in `client/public/art/` from the authored
source PNGs in `art-source/`.

Run: `python3 scripts/art/build_art.py`  (no dependencies, no network)

WHY THIS EXISTS, and why it is not a one-off. Three reasons:

1. The sources are ~1.3 MB each, 9 MB for fifteen files, at 1254x1254 -- forty
   times the pixels any of them ever renders at. Shipping them as authored
   would make a tablet download 9 MB of art to draw a 30-unit footprint.
2. `docs/09_GUIA_DE_ESTILO_VISUAL.md` section 4 requires the art to use the
   palette VALUES in `client/src/detective/palette.ts`, not approximations.
   The authored clue art is close but not equal (the droplet is `#3090c0`
   against `POND` `#3f6f8f`; the kernel is `#d89018` against `KERNEL`
   `#b8912f`). That is not a rounding difference: `palette.test.ts` asserts
   chroma and hue bands against the shipped `GOAL_COLOR`/`HAZARD_COLOR`, and
   the raw art colours sit outside them. So the recolour happens here, in one
   auditable table, rather than by hand in an image editor.
3. Section 4's drained/earned pair needs a drained droplet and a drained
   kernel, and the author only produced the earned ones. They are DERIVED
   here from the same silhouette, so the two states can never drift apart.

This host has no Pillow, no ImageMagick and no potrace, so `png.py` next door
does the raster work by hand. That absence is also why the art ships as raster
at all -- see the style guide's section 3 amendment.

Recolour happens at 2x the target size and the last halving re-antialiases it,
so snapping a soft AI-rendered edge to two flat colours does not leave stair
steps in the shipped file.
"""

from __future__ import annotations

import json
import os
import sys
from collections import deque

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import png  # noqa: E402

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SRC = os.path.join(ROOT, 'art-source')
OUT = os.path.join(ROOT, 'client', 'public', 'art')

# Mirrors `client/src/detective/palette.ts`'s `ART_OUTLINE`, NOT
# `TraceCanvas.tsx`'s `INK_COLOR`. `INK_COLOR` (`#1e293b`, hue 217 -- a slate
# blue) is the colour of the child's OWN pencil trace; this pipeline used to
# point straight at it, which is why every clue mark's outline shipped blue
# instead of a neutral marker line. `ART_OUTLINE` exists precisely so a drawn-
# world contour and the child's trace can never be conflated again -- see its
# doc comment in `palette.ts` for the incident and the achromatic rule
# `palette.test.ts` now asserts on it.
# `scripts/art/palette_sync.test.py` is not a thing; the guard is
# `client/src/detective/artManifest.test.ts`, which mirrors this literal
# against the real TypeScript token so the two cannot drift apart.
INK = (0x1A, 0x1A, 0x1A)
CLUE_DRAINED = (0x83, 0x83, 0x83)
POND = (0x3F, 0x6F, 0x8F)
KERNEL = (0xB8, 0x91, 0x2F)
PRINT = (0x00, 0x00, 0x00)
PLUME = (0x2F, 0x6B, 0x5C)
LAMP = (0xF2, 0xD3, 0x77)
BREADCRUMB = (0xA9, 0x68, 0x2C)
BUBBLE = (0x4F, 0xB3, 0xD9)

# The two ground bases, mirroring `TraceCanvas.tsx`'s `GROUND_FIELD` and
# `CORRIDOR_EARTH`. Each scatter tile is muted toward the ground it lies on, so
# a tuft reads as growing out of the field rather than as pasted onto it.
GROUND_FIELD = (0xC9, 0xD7, 0xBD)
CORRIDOR_EARTH = (0xD9, 0xC3, 0xAE)
# The sheet the art is printed on (`TraceCanvas.tsx`'s `SHEET_PAPER`). Only
# `mute` uses it -- it is the colour the ground art fades TOWARD.
PAPER = (0xFD, 0xFC, 0xF7)

# A pixel darker than this is the marker CONTOUR, not the flat fill inside it.
# The authored outlines land near luminance 25 and the lightest fill (the
# lit lamp's glass) near 200, so the midpoint is nowhere near either.
INK_LUMA = 90


def luma(r: int, g: int, b: int) -> int:
    return (r * 299 + g * 587 + b * 114) // 1000


def recolour(img: png.Image, fill, keep_ink: bool):
    """Two-tone the art: contour to INK, everything else to `fill`.

    `keep_ink=False` sends EVERY opaque pixel to `fill`. That is for art that
    is already a bare silhouette with no contour of its own -- the black
    footprint, the unlit lamp -- where an ink/fill split would find no fill.
    """
    px = img.px
    cache: dict[bytes, bytes] = {}
    for i in range(0, len(px), 4):
        a = px[i + 3]
        if a == 0:
            continue
        key = bytes(px[i:i + 3])
        got = cache.get(key)
        if got is None:
            r, g, b = key
            if keep_ink and luma(r, g, b) < INK_LUMA:
                got = bytes(INK)
            else:
                got = bytes(fill)
            cache[key] = got
        px[i:i + 3] = got


def mute(img: png.Image, target, sat: float = 0.30,
         toward: float = 0.62, contour_lift: float = 0.78):
    """Desaturate ground art and wash it toward the ground it sits on.

    The ground is the only art that covers the whole sheet, and section 4 of
    `docs/09_GUIA_DE_ESTILO_VISUAL.md` is "el color es la recompensa": the only
    saturated things on screen should be the child's carrier and the clue marks
    they have earned. A full-saturation green field drowns that -- and the
    authored green also collides with `PLUME` (#2f6b5c), the feather trail's
    EARNED colour, so a loud field would make the reward look like scenery.

    Two steps per opaque pixel, in this order:
      1. pull each channel toward its own luma by `sat`, so the hue survives at
         a third of its strength instead of being greyed out entirely;
      2. blend toward `target` -- the colour of the GROUND this art sits on, not
         the paper. FILLS blend by a flat `toward`; CONTOURS (luma < 90) blend
         by the flat, harsher `contour_lift`.

    Why contours need their own, harsher lever, measured rather than assumed.
    The first pass weighted the blend by luma alone, which by construction left
    dark contours almost untouched -- and the authored grass contour is
    `#19241c`, within a hair of `INK_COLOR` `#1e293b`. With ~130 tufts against
    ~35 clue marks, a screenshot showed the eye going to the GRASS instead of to
    the path: the texture was out-shouting its own subject. Lifting the contours
    into the ground fixes it, and it is the smaller lever -- dropping tuft
    density instead would have thinned the field into bald patches.

    WHY THE FILL WEIGHT IS FLAT NOW, and it is the same lesson one step further
    in. It used to be `toward * (luma / 255)`, which blends BRIGHT fills hardest
    and dark ones barely at all. On a light ground that is backwards: a bright
    fill is already close to the ground and has almost no contrast to give up,
    while the dark fills carrying all the contrast were the ones the lever
    refused to touch. Measured over the shipped mud tiles, raising `toward` from
    0.42 to 0.78 under the old weighting moved the loudest clump's body contrast
    from 85 to 71 -- the parameter was nearly inert. Flat, the same tiles land in
    the 19-39 band where the ground belongs, and `artHierarchy.test.ts` is what
    now holds them there relative to the clue marks rather than in absolute
    terms.

    Cached on the RGB triple like `recolour`, because a scatter tile is mostly
    a handful of repeated flat fills.
    """
    px = img.px
    cache: dict[bytes, bytes] = {}
    for i in range(0, len(px), 4):
        if px[i + 3] == 0:
            continue
        key = bytes(px[i:i + 3])
        got = cache.get(key)
        if got is None:
            r, g, b = key
            lum = luma(r, g, b)
            t = contour_lift if lum < INK_LUMA else toward
            out = bytearray(3)
            for c_i, c in enumerate((r, g, b)):
                v = lum + (c - lum) * sat
                v = v + (target[c_i] - v) * t
                out[c_i] = max(0, min(255, round(v)))
            got = bytes(out)
            cache[key] = got
        px[i:i + 3] = got


NIGHT_PEAK = 96      # the brightest pixel the derived night is allowed to have
NIGHT_SHADOW = 0.22  # the darkest, as a fraction of the peak -> luma 21
NIGHT_TINT = (0.858, 1.000, 1.370)   # moonlight, NORMALIZED to luma 1.0
NIGHT_SAT = 0.45     # desaturation toward luma, mute()'s own shape


def nightfall(img: png.Image) -> None:
    """Derive a night scene from a daylight one (design.md §3.2).

    HOW TO SWAP IN THE AUTHORED ART, when `fondo nocturno.png` arrives.
    Two edits, no third:

        ('fondo bosque.png',   'sector-night-background.png', 1536, 1024,
         (51, 973), nightfall)
      ->
        ('fondo nocturno.png', 'sector-night-background.png', 1536, 1024,
         (51, 973))

    ...and delete this function. Nothing else mentions `bosque`: no registry
    entry, no level config, no test, no consumer -- they all name the BUILT
    file `sector-night-background.png`.

    WHAT THE REPLACEMENT MUST STILL SATISFY, and it is asserted, not hoped:
    its sampled `brightest` over rows (51, 973) must land in [77, 110].
    The floor is `docs/09:158`'s 55-luma law against `NIGHT_VEIL` (luma 22);
    the ceiling is the only machine-checkable part of "it has to read as
    night". `client/src/zoo/backdrops.test.ts` asserts both, so swap day
    fails loudly and immediately instead of silently shipping a grey wood.

    WHY THIS NORMALIZES instead of scaling. An affine luma map would make the
    output's brightest a function of the SOURCE's brightest, so the law would
    depend on a pixel nobody has measured. This maps the source's own maximum
    onto `NIGHT_PEAK`, so the output's brightest is `NIGHT_PEAK` BY
    CONSTRUCTION, whatever the source is. Order matters: desaturate, tint,
    THEN force the target luma per pixel -- doing the luma step last is what
    makes it exact rather than approximate, because the tint is applied to a
    pixel that still carries chroma.

    No alpha is touched: `emit_opaque_canvas` rejects any non-255 alpha, and
    a background has none.
    """
    px = img.px
    src_max = 0
    for i in range(0, len(px), 4):
        if px[i + 3] == 0:
            continue
        level = luma(px[i], px[i + 1], px[i + 2])
        if level > src_max:
            src_max = level
    if src_max == 0:
        return

    cache: dict[bytes, bytes] = {}
    for i in range(0, len(px), 4):
        if px[i + 3] == 0:
            continue
        key = bytes(px[i:i + 3])
        got = cache.get(key)
        if got is None:
            r, g, b = key
            lum = luma(r, g, b)
            target = NIGHT_PEAK * (NIGHT_SHADOW + (1 - NIGHT_SHADOW) * lum / src_max)
            channels = []
            for c_i, c in enumerate((r, g, b)):
                v = lum + (c - lum) * NIGHT_SAT
                v *= NIGHT_TINT[c_i]
                channels.append(v)
            cur_luma = (channels[0] * 299 + channels[1] * 587 + channels[2] * 114) / 1000
            factor = target / cur_luma if cur_luma > 0 else 0.0
            out = bytearray(3)
            for c_i, v in enumerate(channels):
                out[c_i] = max(0, min(255, round(v * factor)))
            got = bytes(out)
            cache[key] = got
        px[i:i + 3] = got


def recontour(img: png.Image):
    """Send only the CONTOUR to INK, leaving every fill exactly as authored.

    The third mode, and it exists because the other two could not express what
    drawn-world art actually needs. `recolour` flattens a drawing to one flat
    fill, which is right for a clue mark and destroys a creature. `fill=None`
    skips the recolour entirely, which is right for the deduction animals --
    they stand alone on a white sheet -- and wrong for anything that stands ON
    the sheet beside a clue mark.

    Measured on the first build of this slice, `medusa.png` and
    `estrella de mar.png` ship a contour of `rgb(0,17,120)` and `rgb(0,20,122)`:
    chroma 119 and 122 against `INK`'s 0. That is the same defect
    `client/src/detective/palette.ts`'s header records having already happened
    twice -- the clue marks' slate-blue outlines and the grass tufts' authored
    green `#19241c`, which measured chroma 11. These are ten times that, and
    they sit on the same sheet as marks whose contour IS `INK`, repeated across
    the whole route.

    The four deduction animals are deliberately NOT run through this: they are
    the one place `docs/09` section 4's "colour is the reward" is off, they
    appear alone on the lineup and never beside a clue mark, and they already
    measure chroma 0-2 anyway. The octopus used to retain the same defect one
    notch milder. Character fills remain authored, but octopus contours now use
    this function too so every dark drawn-world pixel obeys the same
    achromatic-outline contract.
    """
    px = img.px
    cache: dict[bytes, bytes] = {}
    for i in range(0, len(px), 4):
        if px[i + 3] == 0:
            continue
        key = bytes(px[i:i + 3])
        got = cache.get(key)
        if got is None:
            r, g, b = key
            got = bytes(INK) if luma(r, g, b) < INK_LUMA else key
            cache[key] = got
        px[i:i + 3] = got


def emit(name: str, img: png.Image) -> dict:
    x0, y0, x1, y1 = png.alpha_bbox(img)
    tight = png.crop(img, x0, y0, x1, y1)
    path = os.path.join(OUT, name)
    size = png.write_png(path, tight)
    return {
        'file': f'art/{name}',
        'w': tight.w,
        'h': tight.h,
        'bytes': size,
    }


def emit_opaque_canvas(name: str, img: png.Image, expected_w: int, expected_h: int) -> dict:
    """Emit a full-canvas scene without the cutout alpha-crop used by `emit`.

    A map is layout, not a sprite: transparent border pixels would be a source
    defect, and trimming them would silently change both its dimensions and
    coordinate system. Reject that input instead of making the defect look OK.
    """
    if (img.w, img.h) != (expected_w, expected_h):
        raise SystemExit(
            f'{name}: expected {expected_w}x{expected_h}, got {img.w}x{img.h}'
        )
    for i in range(3, len(img.px), 4):
        if img.px[i] != 255:
            pixel = i // 4
            y, x = divmod(pixel, img.w)
            raise SystemExit(f'{name}: map must be opaque; alpha={img.px[i]} at ({x}, {y})')
    path = os.path.join(OUT, name)
    size = png.write_png(path, img)
    return {
        'file': f'art/{name}',
        'w': img.w,
        'h': img.h,
        'bytes': size,
    }


# Sources whose alpha channel carries a DITHER across the whole canvas, not a
# clean cutout. `oveja.png` came back from its export with 4,374 evenly-spaced
# opaque specks of 240px each scattered over the transparent field, alongside
# the one real 632,576px sheep. That is invisible in the source thumbnail and
# fatal downstream: `alpha_bbox` sees opaque pixels in every corner, so it
# crops NOTHING, and the whole 1198x1313 lamina ships scaled down. Composited
# over the mountains' dark `CHANNEL_STONE` corridor each sheep wore a light
# box -- the exact "un bounding box no es una forma" failure
# `docs/09_GUIA_DE_ESTILO_VISUAL.md` section 7 already warns about, arrived at
# from a new direction.
#
# Opt-in by name rather than blanket: every other shipped source has a genuine
# cutout, and silently blob-filtering all of them would let a real two-part
# asset (a dotted letter, a pair of footprints) lose its smaller half without
# anyone noticing. `llama.png`, drawn in the same round, is clean.
SPECKLED_ALPHA_SOURCES = {'oveja.png'}


def prepare(src_name: str, target_h: int) -> png.Image:
    """Crop to content and downscale so the taller side lands on `2*target_h`."""
    img = png.read_png(os.path.join(SRC, src_name))
    if src_name in SPECKLED_ALPHA_SOURCES:
        img = keep_largest_blob(img)
    x0, y0, x1, y1 = png.alpha_bbox(img)
    img = png.crop(img, x0, y0, x1, y1)
    work = target_h * 2
    scale = work / max(img.w, img.h)
    return png.box_resize(img, max(1, round(img.w * scale)), max(1, round(img.h * scale)))


# (source, output, target height, fill or None, keep_ink)
#
# `fill=None` keeps authored colours without contour processing;
# `fill='contour'` keeps the fills but normalizes every dark contour to INK.
# The animals, octopuses, and world characters keep authored fills because
# they ARE the answer/presence in the scene, not reward-coloured clue marks.
SINGLES = [
    ('gota de agua.png',      'clue-droplet-earned.png',   256, POND,         True),
    ('gota de agua.png',      'clue-droplet-drained.png',  256, CLUE_DRAINED, True),
    ('grano de maiz.png',     'clue-corn-earned.png',      256, KERNEL,       True),
    ('grano de maiz.png',     'clue-corn-drained.png',     256, CLUE_DRAINED, True),
    ('huella negra.png',      'clue-footprint-earned.png', 256, PRINT,        False),
    ('huella gris.png',       'clue-footprint-drained.png', 256, CLUE_DRAINED, True),
    ('pluma verde.png',       'clue-feather-earned.png',   256, PLUME,        True),
    ('pluma gris.png',        'clue-feather-drained.png',  256, CLUE_DRAINED, True),
    # The duck case's three new clues (design.md §4). `huella palmeada.png` is
    # entirely dark -- black web, navy outline, both under INK_LUMA -- so
    # `keep_ink=True` would send every opaque pixel to INK for BOTH states,
    # the same trap `keep_ink=False` avoids for `huella negra.png` above.
    # `miga de pan.png` and `burbuja.png` both carry a bright body over a
    # navy contour, so they take the two-tone `True` path like every other
    # clue.
    ('huella palmeada.png',   'clue-webfoot-earned.png',     256, PRINT,        False),
    ('huella palmeada.png',   'clue-webfoot-drained.png',    256, CLUE_DRAINED, False),
    ('miga de pan.png',       'clue-breadcrumb-earned.png',  256, BREADCRUMB,   True),
    ('miga de pan.png',       'clue-breadcrumb-drained.png', 256, CLUE_DRAINED, True),
    ('burbuja.png',           'clue-bubble-earned.png',      256, BUBBLE,       True),
    ('burbuja.png',           'clue-bubble-drained.png',     256, CLUE_DRAINED, True),
    ('lamparita prendida.png', 'lamp-on.png',              192, LAMP,         True),
    # BOTH lamp states come from the LIT drawing, and that is deliberate.
    # `lamparita apagada.png` is a bare dark silhouette with no contour of its
    # own, so a flat `CLUE_DRAINED` recolour of it put a `#c8cdd2` shape on
    # `#d9c3ae` earth -- measured on a screenshot as very nearly invisible,
    # which is a poor way to mark the end of the route. Driving both states off
    # the same drawing gives OFF the ink contour every other drained mark has,
    # and makes the swap read as the SAME lamp lighting up rather than one
    # shape being replaced by a different one.
    #
    # The invisibility half of that argument expired on 2026-09-12, when
    # `CLUE_DRAINED` moved to `#838383` and stopped vanishing into the earth --
    # and it is worth noticing that this comment had ALREADY recorded the
    # symptom, one asset at a time, without anyone reading it as a statement
    # about the token. The second half is why the pairing stays anyway: two
    # states of one drawing read as a lamp lighting up, two drawings read as a
    # substitution.
    ('lamparita prendida.png', 'lamp-off.png',             192, CLUE_DRAINED, True),
    ('gallina.png',           'animal-gallina.png',        448, None,         True),
    ('pato.png',              'animal-pato.png',           448, None,         True),
    ('vaca.png',              'animal-vaca.png',           448, None,         True),
    ('gato.png',              'animal-gato.png',           448, None,         True),
    ('pulpo con lupa.png',    'carrier-octopus.png',       384, 'contour',    True),
    # The home screen (docs/10). The octopus sits in its office with eight free
    # arms; the desk is the "place" it sits at. Both keep their authored colour
    # for the same reason the carrier octopus does -- section 4's "colour is the
    # reward" protects the CLUE marks, and neither of these is one. The desk is
    # a single flat brown that the guide's own section 3 asked for, so there is
    # nothing here for the palette table to correct.
    #
    # Only these two land in this cut. The pencil and the map (`lapiz.png`,
    # `mapa.png`) are the OBJECTS of modes that do not exist yet, and
    # `artManifest.test.ts` refuses art the registry cannot reach -- shipping
    # them now would be dead weight by that test's own definition. They enter
    # with their mode.
    ('pulpo oficina.png',     'home-octopus.png',          448, 'contour',    True),
    ('escritorio.png',        'home-desk.png',             512, None,         True),
    # Nivel 3 (design.md §6): the jellyfish stands at the route's end and the
    # starfish crosses it as a hazard. Both keep their authored fills because
    # they are living things, not reward-coloured clues; the `contour` mode
    # still normalizes their dark line to the world's ART_OUTLINE token.
    ('medusa.png',            'goal-medusa.png',           384, 'contour',    True),
    ('estrella de mar.png',   'hazard-starfish.png',       320, 'contour',    True),
    # Zoo journey UI. These sources are normalized to exact square canvases
    # with safe flat fills; this step only enforces the shared contour token
    # while deriving the compact shipped dimensions.
    ('niebla 1.png',          'zoo-fog-1.png',             512, 'contour',    True),
    ('niebla 2.png',          'zoo-fog-2.png',             512, 'contour',    True),
    ('niebla 3.png',          'zoo-fog-3.png',             512, 'contour',    True),
    ('pulpo mochila.png',     'zoo-octopus-backpack.png',  448, 'contour',    True),
    ('mochila.png',           'zoo-backpack.png',          256, 'contour',    True),
    ('estrella.png',          'zoo-star.png',              256, 'contour',    True),
    ('huella pulpo.png',      'zoo-octopus-print.png',     256, 'contour',    True),
    ('bocadillo.png',         'zoo-speech-bubble.png',     512, 'contour',    True),
    # Sector adventure cutouts. Their authored canvases are standardized below;
    # this table owns the compact, intrinsic dimensions the client renders.
    ('vibora chica.png',      'sector-snake-small.png',    512, 'contour',    True),
    ('vibora mediana.png',    'sector-snake-medium.png',   512, 'contour',    True),
    ('vibora grande.png',     'sector-snake-large.png',    512, 'contour',    True),
    ('llama.png',             'sector-llama.png',          448, 'contour',    True),
    ('abeja.png',             'sector-bee.png',            256, 'contour',    True),
    ('flor.png',              'sector-flower.png',         256, 'contour',    True),
    ('panal.png',             'sector-honeycomb.png',      256, 'contour',    True),
    ('delfin.png',            'sector-dolphin.png',        448, 'contour',    True),
    ('caracol.png',           'sector-snail.png',          448, 'contour',    True),
    ('linterna.png',          'sector-flashlight.png',     256, 'contour',    True),
    # Hedgehog drawing activities. The body deliberately has no spikes: the
    # child supplies them with their own line. Both poses retain authored fills
    # while `contour` keeps the shared world marker neutral.
    ('erizo.png',              'hedgehog-profile.png',      448, 'contour',    True),
    ('erizo enroscado.png',    'hedgehog-curled.png',       448, 'contour',    True),
    # A compact front-facing reward/prop for the mountain activity.
    ('gorro andino.png',       'andean-hat.png',            256, 'contour',    True),
    # Row C (docs/13 §8): the sheep standing on the sheep-hill ridge peaks.
    # `oveja.png` predates `AUTHORED_SOURCE_SIZES` exactly as `pato.png` and
    # `gallina.png` do (design.md §6) -- no entry there, and `fill='contour'`
    # matches the llama's own row since both are drawn-world props that stand
    # beside the child's ink, not reward-coloured clue marks.
    ('oveja.png',              'sector-sheep.png',          448, 'contour',    True),
]

# Full-canvas scenes are already authored at final dimensions. They bypass the
# 2x work pass: scaling a 1536x1024 map up and back down can only soften its
# deliberately flat palette.
#
# The optional fifth element is a `(top, bottom)` source-row range: the rows
# a sector's corridor can reach, inclusive. When present, `main` samples that
# entry's `quiet` (the modal colour of the middle 40% of the range) and
# `brightest` (the maximum-luma pixel colour across the whole range) into its
# manifest entry -- the two fields `client/src/zoo/backdrops.ts`'s
# `SECTOR_BACKDROP` hand-copies and `artManifest.test.ts` guards against
# drift. `None` for every entry with no drawn corridor yet.
#
# An optional SIXTH element is a transform `(img) -> None`, applied to the
# source IN PLACE before the corridor sampling and the opaque-canvas emit --
# the same shape `mute`/`recolour`/`recontour` already use. This is how the
# night backdrop is DERIVED from `fondo bosque.png` instead of authored
# (`nightfall`, design.md §3.2): the row below runs the daylight forest
# through it and emits the result under its own name, while the untouched
# `fondo bosque.png -> sector-forest-background.png` row (paso F's own) keeps
# shipping the daylight scene unmodified.
PASSTHROUGHS = [
    ('mapa zoologico.png', 'zoo-map.png', 1536, 1024, None),
    ('fondo laguna.png', 'sector-lagoon-background.png', 1536, 1024, (135, 889)),
    ('fondo arena.png', 'sector-sand-background.png', 1536, 1024, (51, 973)),
    ('fondo ladera.png', 'sector-slope-background.png', 1536, 1024, (220, 866)),
    ('fondo cordillera.png', 'sector-range-background.png', 1536, 1024, (166, 858)),
    ('fondo bosque.png', 'sector-forest-background.png', 1536, 1024, None),
    ('fondo pecera.png', 'sector-aquarium-background.png', 1536, 1024, (51, 973)),
    ('fondo bosque.png', 'sector-night-background.png', 1536, 1024, (51, 973), nightfall),
]


def sample_corridor_band(img: png.Image, top: int, bottom: int) -> tuple[str, str]:
    """`quiet`/`brightest` for a `PASSTHROUGHS` row range (design.md §3.5
    point 1): `quiet` is the MODAL colour of the middle 40% of `[top,
    bottom]` (inclusive), `brightest` the MAXIMUM-luma pixel colour anywhere
    in the whole range -- what `docs/09:158`'s luma law is asserted against,
    never against `quiet` alone, so a backdrop whose art is not this flat
    keeps the two fields honest.
    """
    height = bottom - top + 1
    mid_top = top + round(height * 0.3)
    mid_bottom = top + round(height * 0.7)
    counts: dict[tuple[int, int, int], int] = {}
    brightest = None
    brightest_luma = -1
    for y in range(top, bottom + 1):
        row = y * img.w * 4
        for x in range(img.w):
            i = row + x * 4
            r, g, b, a = img.px[i], img.px[i + 1], img.px[i + 2], img.px[i + 3]
            if a == 0:
                continue
            key = (r, g, b)
            level = luma(r, g, b)
            if level > brightest_luma:
                brightest_luma = level
                brightest = key
            if mid_top <= y <= mid_bottom:
                counts[key] = counts.get(key, 0) + 1

    def to_hex(rgb: tuple[int, int, int]) -> str:
        return '#%02x%02x%02x' % rgb

    quiet = max(counts.items(), key=lambda kv: kv[1])[0]
    assert brightest is not None
    return to_hex(quiet), to_hex(brightest)

# Authoring-canvas contract for the zoo slice. These dimensions are deliberate:
# cutouts keep a shared square canvas (including their transparent margin), while
# the map is a final-size opaque scene. Failing here prevents a newly exported
# source from silently changing crop/downscale behavior later in the pipeline.
AUTHORED_SOURCE_SIZES = {
    'mapa zoologico.png': (1536, 1024),
    'niebla 1.png': (1024, 1024),
    'niebla 2.png': (1024, 1024),
    'niebla 3.png': (1024, 1024),
    'pulpo mochila.png': (1024, 1024),
    'mochila.png': (1024, 1024),
    'estrella.png': (1024, 1024),
    'huella pulpo.png': (1024, 1024),
    'bocadillo.png': (1024, 1024),
    'pulpo con lupa.png': (1024, 1024),
    'pulpo oficina.png': (1024, 1024),
    'fondo laguna.png': (1536, 1024),
    'fondo arena.png': (1536, 1024),
    'fondo ladera.png': (1536, 1024),
    'fondo cordillera.png': (1536, 1024),
    'fondo bosque.png': (1536, 1024),
    'fondo pecera.png': (1536, 1024),
    'vibora chica.png': (1024, 1024),
    'vibora mediana.png': (1024, 1024),
    'vibora grande.png': (1024, 1024),
    'llama.png': (1024, 1024),
    'abeja.png': (1024, 1024),
    'flor.png': (1024, 1024),
    'panal.png': (1024, 1024),
    'delfin.png': (1024, 1024),
    'caracol.png': (1024, 1024),
    'linterna.png': (1024, 1024),
    'erizo.png': (1024, 1024),
    'erizo enroscado.png': (1024, 1024),
    'gorro andino.png': (1024, 1024),
}


def validate_authored_source_sizes() -> None:
    for name, expected in AUTHORED_SOURCE_SIZES.items():
        img = png.read_png(os.path.join(SRC, name))
        actual = (img.w, img.h)
        if actual != expected:
            raise ValueError(
                f'{name}: expected source canvas {expected[0]}x{expected[1]}, '
                f'got {actual[0]}x{actual[1]}'
            )

# The two ground sources are SCATTER TILES, not single subjects: a field of
# separate tufts/clumps on transparency. They get cut into individual marks
# instead of being shipped whole, because the engine cannot tile them.
#
# Tiling an SVG region needs `<pattern>`, and painting one needs
# `fill="url(#id)"`. `url(#...)` is banned in this repo -- it hydrates WHITE on
# real devices, scarred at `client/src/canvas/TraceCanvas.tsx`. Confining a
# texture to the corridor's irregular shape needs `<clipPath>`, which is the
# same ban. So the ground is scattered as individual `<image>` marks whose
# positions are computed against the corridor geometry, exactly the way clue
# marks already work. Cutting the tiles up here is what makes that possible.
SCATTERS = [
    # Twelve, not eight: the authored sheet carries four distinct FAMILIES of
    # tuft (wide and low, tall and narrow, wind-leaned, sparse), and eight
    # picks cannot represent four families without dropping one. The area
    # floor does real work on this source -- its sparse tufts have blades that
    # do not touch, so they land as ~13 separate loose-blade blobs that must
    # not be scattered as marks of their own.
    ('pasto.png', 'ground-grass', 12, 128, GROUND_FIELD, 0.30),
    ('barro.png', 'ground-mud', 8, 128, CORRIDOR_EARTH, 0.03),
]


# Minimum blob area, as a fraction of the biggest blob in the same source.
# Per-source, because the two grounds mean opposite things by "small". A small
# GRASS blob is a loose blade that reads as a bean once scattered on its own,
# so grass needs a hard floor. A small MUD blob is a pebble, which is exactly
# what mud should also be made of, so a floor there would throw away the size
# variety that keeps the corridor from looking stamped.


def keep_largest_blob(img: png.Image) -> png.Image:
    """Erase everything except the biggest 4-connected opaque region."""
    px = img.px
    w, h = img.w, img.h
    seen = bytearray(w * h)
    best: list[int] = []
    for start in range(w * h):
        if seen[start] or px[start * 4 + 3] < 40:
            continue
        queue = deque([start])
        seen[start] = 1
        blob = [start]
        while queue:
            ci = queue.popleft()
            cy, cx = divmod(ci, w)
            for nx, ny in ((cx - 1, cy), (cx + 1, cy), (cx, cy - 1), (cx, cy + 1)):
                if 0 <= nx < w and 0 <= ny < h:
                    ni = ny * w + nx
                    if not seen[ni] and px[ni * 4 + 3] >= 40:
                        seen[ni] = 1
                        queue.append(ni)
                        blob.append(ni)
        if len(blob) > len(best):
            best = blob
    keep = bytearray(w * h)
    for ci in best:
        keep[ci] = 1
    for ci in range(w * h):
        if not keep[ci]:
            px[ci * 4 + 3] = 0
    return img


def centre_on(img: png.Image, feature_test) -> png.Image:
    """Pad so the centroid of `feature_test` pixels becomes the image centre.

    The caller places art with `translate(x, y)` around the image's CENTRE, so
    whatever sits at the centre is what lands on the fingertip. For the glass
    that must be the LENS, not the bounding box: the author drew the handle
    reaching down-left, which pulls the bbox centre off the lens by about a
    quarter of the width. Centred on the bbox, the child drags the glass with
    the crystal floating up and to the right of their own finger -- the one
    place it must not be, since the lens is the thing that is supposed to be
    looking at the trail.

    Padding rather than an anchor offset in the manifest, because it keeps the
    correction inside the art where it can be seen, instead of spreading a
    magic number through the registry and the renderer.
    """
    px = img.px
    sx = sy = n = 0
    for y in range(img.h):
        for x in range(img.w):
            i = (y * img.w + x) * 4
            if px[i + 3] > 128 and feature_test(px[i], px[i + 1], px[i + 2]):
                sx += x
                sy += y
                n += 1
    if n == 0:
        raise SystemExit('centre_on: feature not found')
    cx, cy = sx / n, sy / n
    half_w = max(cx, img.w - cx)
    half_h = max(cy, img.h - cy)
    out = png.Image(int(round(half_w * 2)), int(round(half_h * 2)))
    ox = int(round(half_w - cx))
    oy = int(round(half_h - cy))
    for y in range(img.h):
        src = y * img.w * 4
        dst = ((oy + y) * out.w + ox) * 4
        out.px[dst:dst + img.w * 4] = px[src:src + img.w * 4]
    return out


# The glass, centred on its lens. The author drew it standalone after the first
# pass had to cut one out of the octopus drawing; this replaces that extraction.
CENTRED = [
    ('lupa.png', 'carrier-lens.png', 192,
     lambda r, g, b: b > 180 and 100 < g < 210 and r < 160),
]


def main() -> None:
    os.makedirs(OUT, exist_ok=True)
    validate_authored_source_sizes()
    manifest: dict[str, dict] = {}

    for row in PASSTHROUGHS:
        src, name, expected_w, expected_h, corridor_rows = row[:5]
        transform = row[5] if len(row) > 5 else None
        img = png.read_png(os.path.join(SRC, src))
        if transform is not None:
            transform(img)  # in place, like mute/recolour/recontour
        key = name[:-4]
        manifest[key] = emit_opaque_canvas(name, img, expected_w, expected_h)
        if corridor_rows is not None:
            quiet, brightest = sample_corridor_band(img, *corridor_rows)
            manifest[key]['quiet'] = quiet
            manifest[key]['brightest'] = brightest
            manifest[key]['corridorRows'] = {'top': corridor_rows[0], 'bottom': corridor_rows[1]}
        print(f'  {key:26s} {manifest[key]["w"]}x{manifest[key]["h"]} '
              f'{manifest[key]["bytes"] / 1024:6.1f} KB')

    for src, name, target_h, fill, keep_ink in SINGLES:
        img = prepare(src, target_h)
        if fill == 'contour':
            recontour(img)
        elif fill is not None:
            recolour(img, fill, keep_ink)
        final = png.box_resize(img, max(1, img.w // 2), max(1, img.h // 2))
        # Halving blends contour and fill RGB at their shared boundary. Keep
        # alpha antialiasing at the outer silhouette, but snap any resulting
        # dark chromatic blend back to the neutral world contour.
        if fill == 'contour' and (
            name.startswith(('zoo-', 'sector-', 'hedgehog-')) or name in ('andean-hat.png', 'carrier-octopus.png', 'home-octopus.png')
        ):
            recontour(final)
        key = name[:-4]
        manifest[key] = emit(name, final)
        print(f'  {key:26s} {manifest[key]["w"]}x{manifest[key]["h"]} '
              f'{manifest[key]["bytes"] / 1024:6.1f} KB')

    for src, name, target_h, feature_test in CENTRED:
        img = centre_on(prepare(src, target_h), feature_test)
        key = name[:-4]
        manifest[key] = emit(name, img)
        print(f'  {key:26s} {manifest[key]["w"]}x{manifest[key]["h"]} '
              f'{manifest[key]["bytes"] / 1024:6.1f} KB')

    for src, prefix, count, target_h, ground_base, min_area in SCATTERS:
        img = png.read_png(os.path.join(SRC, src))
        blobs = png.components(img)
        if len(blobs) < count:
            raise SystemExit(f'{src}: wanted {count} whole marks, found {len(blobs)}')
        # Spread the picks across the size range instead of taking the top N:
        # eight near-identical big clumps read as a repeated stamp, while a mix
        # of sizes reads as ground. Section 5 of the guide, applied to ground.
        #
        # But spread the picks across the FILTERED range. Taking every Nth blob
        # from the raw size-sorted list guarantees picking the smallest ones,
        # and in a grass tile the smallest blobs are SINGLE BLADES. A lone
        # blade is fine as filler between tufts in the authored tile and reads
        # as a bean the moment it is cut out and scattered on its own -- and
        # because the picks are spread evenly, roughly a third of everything on
        # the field ended up being one. Anything under a third of the biggest
        # blob's area is not a tuft.
        biggest = blobs[0]['area']
        usable = [b for b in blobs if b['area'] >= biggest * min_area]
        if len(usable) < count:
            raise SystemExit(
                f'{src}: only {len(usable)} blobs clear the {min_area:.0%} '
                f'area floor, wanted {count}'
            )
        step = max(1, len(usable) // count)
        picks = [usable[i * step] for i in range(count)]
        for n, blob in enumerate(picks, start=1):
            bx0, by0, bx1, by1 = blob['box']
            piece = png.crop(img, bx0, by0, bx1, by1)
            # A bounding box is not a shape. Neighbouring tufts overlap the
            # picked blob's box and came along as dark chips in the corners --
            # visible in the shipped art as little triangular crumbs floating
            # beside every mark. Keeping only the biggest blob INSIDE the crop
            # drops them; the picked blob is by definition the biggest thing in
            # its own box.
            piece = keep_largest_blob(piece)
            work = target_h * 2
            scale = work / max(piece.w, piece.h)
            piece = png.box_resize(
                piece, max(1, round(piece.w * scale)), max(1, round(piece.h * scale))
            )
            # Ground only. `SINGLES` and `ISOLATES` keep their strength: a clue
            # mark and the carrier ARE the colour reward this mutes the field
            # to protect. Muted BEFORE the last halving, like every other
            # recolour here, so the halve re-antialiases the lifted contour
            # instead of leaving it stepped.
            mute(piece, ground_base)
            piece = png.box_resize(piece, max(1, piece.w // 2), max(1, piece.h // 2))
            name = f'{prefix}-{n}.png'
            key = name[:-4]
            manifest[key] = emit(name, piece)
            print(f'  {key:26s} {manifest[key]["w"]}x{manifest[key]["h"]} '
                  f'{manifest[key]["bytes"] / 1024:6.1f} KB')

    total = sum(e['bytes'] for e in manifest.values())
    with open(os.path.join(OUT, 'manifest.json'), 'w') as fh:
        json.dump(manifest, fh, indent=2, sort_keys=True)
        fh.write('\n')
    print(f'\n{len(manifest)} files, {total / 1024:.1f} KB total '
          f'(sources were {sum(os.path.getsize(os.path.join(SRC, f)) for f in os.listdir(SRC)) / 1024 / 1024:.1f} MB)')


if __name__ == '__main__':
    main()
