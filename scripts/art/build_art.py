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
    measure chroma 0-2 anyway. The octopus does measure chroma 63, which is the
    same defect one notch milder; it is left alone here because `docs/09`
    section 2 makes the navy contour part of the character's own look and
    changing it is an art-direction decision, not a pipeline one. It is
    recorded rather than silently fixed.
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


def prepare(src_name: str, target_h: int) -> png.Image:
    """Crop to content and downscale so the taller side lands on `2*target_h`."""
    img = png.read_png(os.path.join(SRC, src_name))
    x0, y0, x1, y1 = png.alpha_bbox(img)
    img = png.crop(img, x0, y0, x1, y1)
    work = target_h * 2
    scale = work / max(img.w, img.h)
    return png.box_resize(img, max(1, round(img.w * scale)), max(1, round(img.h * scale)))


# (source, output, target height, fill or None, keep_ink)
#
# `fill=None` means the art keeps its authored colours. Only the four animals
# and the octopus do: they are the one place the guide's "colour is the reward"
# rule is not in force, because the animals ARE the answer and the octopus is
# the child's own hand on the screen.
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
    ('pulpo con lupa.png',    'carrier-octopus.png',       384, None,         True),
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
    ('pulpo oficina.png',     'home-octopus.png',          448, None,         True),
    ('escritorio.png',        'home-desk.png',             512, None,         True),
    # Nivel 3 (design.md §6): the jellyfish stands at the route's end and the
    # starfish crosses it as a hazard. Both keep their authored colour for the
    # same reason the animals do -- they are living things in the world, not
    # clue marks, so section 4's "colour is the reward" rule protects them from
    # nothing here. `fill=None` means `recolour` never runs, so neither row
    # names a contour colour at all -- `ART_OUTLINE` is never referenced by
    # this pipeline for these two files, only measured against afterward.
    # Drawn-world creatures: authored fills, but the world's own contour.
    ('medusa.png',            'goal-medusa.png',           384, 'contour',    True),
    ('estrella de mar.png',   'hazard-starfish.png',       320, 'contour',    True),
]

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
    manifest: dict[str, dict] = {}

    for src, name, target_h, fill, keep_ink in SINGLES:
        img = prepare(src, target_h)
        if fill == 'contour':
            recontour(img)
        elif fill is not None:
            recolour(img, fill, keep_ink)
        final = png.box_resize(img, max(1, img.w // 2), max(1, img.h // 2))
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
