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
# [free-trail-waypoints, task 3.2] The flower's off-state, mirrored from
# `client/src/detective/palette.ts`'s `FLOWER_DORMANT` -- provisional, the
# author's to retune; the pipeline only needs the same literal.
FLOWER_DORMANT = (0xD2, 0xD2, 0xD2)
POND = (0x3F, 0x6F, 0x8F)
KERNEL = (0xB8, 0x91, 0x2F)
PRINT = (0x00, 0x00, 0x00)
PLUME = (0x2F, 0x6B, 0x5C)
LAMP = (0xF2, 0xD3, 0x77)
BREADCRUMB = (0xA9, 0x68, 0x2C)
BUBBLE = (0x4F, 0xB3, 0xD9)
# T49: the inside of `bocadillo izquierda.png` (`docs/20` B9). The export
# came back with a soft grey smudge in the middle of the white fill (luma
# ~166 at its darkest), right where the line is written; a two-tone recolour
# to INK + WHITE is the existing `recolour` path and removes it.
WHITE = (0xFF, 0xFF, 0xFF)

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


def desaturate_keep_alpha(img: png.Image) -> png.Image:
    """T20 (`odd/tasks/prewriting-stage-completion.md`, docs/19 §3.1): a TRUE
    luma-601 desaturation -- every opaque pixel's R/G/B all become its own
    `luma(r, g, b)` -- with alpha copied through untouched.

    This is what lets the snakes "start grey and regain colour as the finger
    traces them" without ever touching an SVG filter at runtime (this repo
    bans `url(#…)`/`filter`/`mask`/`clipPath` outright -- see `docs/13`'s own
    constraints, restated in `odd/tasks/prewriting-stage-completion.md`'s
    Constraints section): the grey art ships as its own PNG, derived here at
    build time, and the client only ever windows between two plain `<image>`s
    (`client/src/canvas/ArtCorridorLayer.tsx`).

    Load-bearing property, used by `sample_spine` below rather than merely
    assumed: desaturating this way preserves luma EXACTLY.
    `luma(l, l, l) == (l*299 + l*587 + l*114) // 1000 == (l*1000) // 1000 ==
    l` for any integer `l` -- the terms sum to exactly `l*1000` before the
    floor-divide, so there is no rounding to lose. `sample_spine`'s own
    centreline/thickness/traceFrom/traceTo/`mid` math reads ONLY alpha (for
    the opaque-run bounds) and `luma()` (for the eye-white/body-luma
    extremes) -- never r/g/b individually -- so re-running it against the
    grey copy reproduces the identical numbers a hand-copy would have to
    trust blindly, letting `artManifest.test.ts` assert byte-equality instead
    of "should be about the same". Only the derived HEX colours
    (`bodyBrightest`/`bodyDarkest`/`headWhite`) differ, because those
    genuinely ARE grey now -- exactly what "the body's own '55' corridor rule
    keeps holding without re-measuring" (docs/19 §3.1) means in practice.
    """
    out = img.copy()
    px = out.px
    for i in range(0, len(px), 4):
        level = luma(px[i], px[i + 1], px[i + 2])
        px[i] = px[i + 1] = px[i + 2] = level
    return out


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


# T49: below this luma a pixel of a round-2 character is unambiguously its
# marker line (the line measures luma 0-9, the darkest fills 70+).
CHARACTER_INK_LUMA = 50


def lift_dark_fills(img: png.Image) -> None:
    """The `'character'` mode (T49): `recontour` for art whose FILLS are dark.

    `recontour` sends every pixel under `INK_LUMA` (90) to INK, which is right
    for art drawn with light fills and wrong for the round-2 characters: the
    monkey's fur (`#8a5a3c` and its shading) measures luma 80-99, the
    uncurling hedgehog's spines 80-99, the Pulpito's hat 70-79. Through
    `recontour` that fill straddles the threshold and ships as black speckle
    over brown (measured on the first build of this task: 22% of the
    monkey's opaque pixels sat in the 80-89 band).

    Here only pixels under `CHARACTER_INK_LUMA` become INK. Between that and
    `INK_LUMA`, an achromatic pixel (chroma <= 4, the sheep's grey face) is
    kept as drawn, and a chromatic one is a fill: it is lifted, hue kept, to
    luma `INK_LUMA`, so the drawn world's rule that every dark pixel is an
    achromatic line (`artHierarchy.test.ts`) still holds without
    blackening the fill. Cached on the RGB triple like `recontour`."""
    px = img.px
    cache: dict[bytes, bytes] = {}
    for i in range(0, len(px), 4):
        if px[i + 3] == 0:
            continue
        key = bytes(px[i:i + 3])
        got = cache.get(key)
        if got is None:
            r, g, b = key
            level = luma(r, g, b)
            if level < CHARACTER_INK_LUMA:
                got = bytes(INK)
            elif level < INK_LUMA and max(r, g, b) - min(r, g, b) > 4:
                k = (INK_LUMA + 0.5) / max(1, level)
                got = bytes(min(255, round(c * k)) for c in (r, g, b))
            else:
                got = key
            cache[key] = got
        px[i:i + 3] = got


def fill_enclosed_alpha(img: png.Image) -> None:
    """Make everything enclosed by the outline fully opaque (T49).

    `bocadillo izquierda.png`'s inside came back at alpha ~242 under its grey
    smudge, so even repainted white the smudge stayed visible as a faint
    patch of whatever is behind the bubble. The outside is every pixel under
    alpha 128 reachable from the canvas border; it is grown by two pixels so
    the outline's own antialiased outer edge is left alone, and everything
    else becomes alpha 255."""
    w, h = img.w, img.h
    px = img.px
    outside = bytearray(w * h)
    queue: deque[int] = deque()
    for x in range(w):
        for y in (0, h - 1):
            queue.append(y * w + x)
    for y in range(h):
        for x in (0, w - 1):
            queue.append(y * w + x)
    while queue:
        ci = queue.popleft()
        if outside[ci] or px[ci * 4 + 3] >= 128:
            continue
        outside[ci] = 1
        cy, cx = divmod(ci, w)
        if cx > 0:
            queue.append(ci - 1)
        if cx < w - 1:
            queue.append(ci + 1)
        if cy > 0:
            queue.append(ci - w)
        if cy < h - 1:
            queue.append(ci + w)
    for _ in range(2):
        grown = bytearray(outside)
        for ci in range(w * h):
            if outside[ci]:
                continue
            cy, cx = divmod(ci, w)
            if ((cx > 0 and outside[ci - 1]) or (cx < w - 1 and outside[ci + 1])
                    or (cy > 0 and outside[ci - w]) or (cy < h - 1 and outside[ci + w])):
                grown[ci] = 1
        outside = grown
    for ci in range(w * h):
        if not outside[ci]:
            px[ci * 4 + 3] = 255


def dominant_fill(img: png.Image) -> str:
    """The authored fill of a two-tone clue mark, as `#rrggbb`.

    T43: a clue that keeps its authored colours still needs a palette token
    (the rail socket and `palette.test.ts` reason about it), and that token
    must be what the pixels ARE. This is the measurement the token copies.
    The modal colour bucket (4 bits per channel) among the opaque non-contour
    pixels, then the per-channel median inside that bucket -- so an
    antialiased edge or a stray contour blend cannot move it, and the same
    file always gives the same answer.
    """
    px = img.px
    buckets: dict[tuple[int, int, int], list[tuple[int, int, int]]] = {}
    for i in range(0, len(px), 4):
        if px[i + 3] < 250:
            continue
        r, g, b = px[i], px[i + 1], px[i + 2]
        if luma(r, g, b) < INK_LUMA:
            continue
        buckets.setdefault((r >> 4, g >> 4, b >> 4), []).append((r, g, b))
    members = max(buckets.values(), key=len)
    mid = len(members) // 2
    r, g, b = (sorted(c[k] for c in members)[mid] for k in range(3))
    return f'#{r:02x}{g:02x}{b:02x}'


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
#
# `piedra.png` (design.md §3.4, the entrance's night findable objects) joined
# this set after checking, not guessing: `alpha_bbox` returned the FULL
# 1313x1198 canvas -- the exact "crops nothing" symptom -- and a blob scan
# found 4,200 separate opaque regions, one real 572,352px stone and 4,199
# scattered specks totalling 390,851px, the same defect class as `oveja.png`
# (4,374 specks) down to the shape of the finding. `cofre.png` and
# `hoja.png`, checked the same way, are each a single clean blob and need no
# entry here.
SPECKLED_ALPHA_SOURCES = {'oveja.png', 'piedra.png'}

# Sources whose "transparent" field came back at a low but NON-ZERO alpha.
# See `clear_ghost_alpha` for the measurement and why this is opt-in like
# `SPECKLED_ALPHA_SOURCES` rather than a blanket pass.
GHOST_ALPHA_SOURCES = {
    'pulpo cuidador.png',
    'cartel peces.png',
    'cartel tortugas.png',
    'cartel monos.png',
}


def clear_ghost_alpha(img: png.Image, thresh: int = 8) -> png.Image:
    """Erase a background that was exported almost-transparent instead of
    transparent.

    Some exports return the "transparent" field at a low but NON-ZERO alpha.
    `pulpo cuidador.png` and the three `cartel *.png` of the prologue's first
    authored round each came back with ~10% of the canvas at alpha EXACTLY 8
    -- a flat spike, not the smooth tail antialiasing leaves. That field is
    invisible in a thumbnail and does two things downstream: `recolour` dyes
    it INK, so the asset ships as a near-black wash, and `alpha_bbox` counts
    it as content, so the crop keeps it. `pulpo cuidador.png` cropped 640px
    wide instead of its figure's 470.

    Note the boundary. `alpha_bbox`'s own test is `>= thresh`, so alpha 8 is
    content to the cropper; clearing `< thresh` would step over the one value
    that matters and change nothing. We clear `<= thresh`: under ~3% opacity
    is background, and the cropper and the eraser now agree on that.

    Measured before shipping this, so it is not a guess. Every previously
    approved cutout is untouched: `pulpo mochila.png` returns the IDENTICAL
    bounding box at thresh 8 and 9, and the shipped cutouts measure
    0.00-0.40% in the 1-8 band against these four's 23-29%.

    This is `SPECKLED_ALPHA_SOURCES`'s defect class reached from a third
    direction -- `oveja.png` and `piedra.png` were opaque specks, which break
    the crop by scattering -- and it takes the same opt-in shape, for the
    reason that set already gives: a blanket pass is not free. Run over every
    source, clearing `<= 8` moved four ALREADY-APPROVED assets by one pixel
    (`droplet` 195->194 wide, `webfoot` 230->231 tall, `hedgehog-profile`
    306->307, `home-desk`). Not a visible change -- a one-pixel crop shift
    flipping a rounding in `box_resize` -- but `artManifest.test.ts` and
    `artHierarchy.test.ts` guard those dimensions on purpose, and editing a
    guard to match a change the guard just caught is how the guard stops
    meaning anything. Opt-in keeps this aimed at the sources that measured
    the defect.
    """
    px = img.px
    for i in range(3, len(px), 4):
        if px[i] <= thresh:
            px[i - 3] = px[i - 2] = px[i - 1] = px[i] = 0
    return img


def prepare(src_name: str, target_h: int) -> png.Image:
    """Crop to content and downscale so the taller side lands on `2*target_h`."""
    img = png.read_png(os.path.join(SRC, src_name))
    if src_name in SPECKLED_ALPHA_SOURCES:
        img = keep_largest_blob(img)
    if src_name in GHOST_ALPHA_SOURCES:
        img = clear_ghost_alpha(img)
    x0, y0, x1, y1 = png.alpha_bbox(img)
    img = png.crop(img, x0, y0, x1, y1)
    work = target_h * 2
    scale = work / max(img.w, img.h)
    return png.box_resize(img, max(1, round(img.w * scale)), max(1, round(img.h * scale)))


# (source, output, target height, fill or None, keep_ink[, sample_spine])
#
# `fill=None` keeps authored colours without contour processing;
# `fill='contour'` keeps the fills but normalizes every dark contour to INK;
# `fill='character'` (T49) is `contour` for art with dark fills, see
# `lift_dark_fills`.
# The animals, octopuses, and world characters keep authored fills because
# they ARE the answer/presence in the scene, not reward-coloured clue marks.
#
# An optional SIXTH element, `True`, marks a row whose SHIPPED file (after
# `recontour`, before the final halving) is also run through `sample_spine`
# (design.md §1.1) -- the sibling of `sample_corridor_band` for a DRAWN
# centreline instead of a painted band. Only the three snake rows pay for it.
SINGLES = [
    ('gota de agua.png',      'clue-droplet-earned.png',   256, POND,         True),
    ('gota de agua.png',      'clue-droplet-drained.png',  256, CLUE_DRAINED, True),
    ('grano de maiz.png',     'clue-corn-earned.png',      256, KERNEL,       True),
    ('grano de maiz.png',     'clue-corn-drained.png',     256, CLUE_DRAINED, True),
    ('huella negra.png',      'clue-footprint-earned.png', 256, PRINT,        False),
    ('huella gris.png',       'clue-footprint-drained.png', 256, CLUE_DRAINED, True),
    ('pluma verde.png',       'clue-feather-earned.png',   256, PLUME,        True),
    ('pluma gris.png',        'clue-feather-drained.png',  256, CLUE_DRAINED, True),
    # `miga de pan.png` carries a bright body over a navy contour, so it takes
    # the two-tone `True` path like every other flat clue. (`huella
    # palmeada.png` and `burbuja.png` used to sit here; T43 replaced both
    # drawings, below.)
    ('miga de pan.png',       'clue-breadcrumb-earned.png',  256, BREADCRUMB,   True),
    ('miga de pan.png',       'clue-breadcrumb-drained.png', 256, CLUE_DRAINED, True),
    # T43 (`docs/22` C1-C8, C11, C12): the redrawn clue marks. The coloured
    # ones keep their AUTHORED fills (`fill='contour'`, the mode every drawn
    # prop uses) instead of the flat one-token repaint above. `docs/22` §3.2
    # is the reason: that repaint is what turned `burbuja.png`'s white shine
    # into a plain cyan disc and the hen's green into the duck's feather.
    # These were drawn as two-tone art on purpose (contour plus one fill, all
    # detail in dark line), so keeping the drawing costs nothing and keeps
    # what the author approved. The palette token of each kind is then the
    # MEASURED fill, not a fill imposed on the pixels: `main` samples it into
    # the manifest (`fill`) and `artManifest.test.ts` holds `CLUE_ART` to it.
    # The drained twin stays the flat `CLUE_DRAINED` recolour of the same
    # drawing, so the pair still cannot drift apart.
    #
    # The prints (`huella de pato`, `huellita de erizo`, `mano de mono`) are
    # bare black silhouettes with no contour of their own, so they take the
    # `keep_ink=False` path `huella palmeada.png` took: a print in the earth
    # has no colour (`PRINT`).
    #
    # None of the twelve sources needs `GHOST_ALPHA_SOURCES` or
    # `SPECKLED_ALPHA_SOURCES`: measured, the 1-8 alpha band is a smooth
    # antialiasing tail (0.21-0.66% of the canvas, falling off from alpha 1,
    # no spike at 8) and `alpha_bbox` returns the same box at 8 and 13.
    ('pista charco.png',      'clue-puddle-earned.png',        256, 'contour',    True),
    ('pista charco.png',      'clue-puddle-drained.png',       256, CLUE_DRAINED, True),
    ('pista semillas.png',    'clue-seeds-earned.png',         256, 'contour',    True),
    ('pista semillas.png',    'clue-seeds-drained.png',        256, CLUE_DRAINED, True),
    ('pista pluma de pato.png', 'clue-duck-feather-earned.png', 256, 'contour',   True),
    ('pista pluma de pato.png', 'clue-duck-feather-drained.png', 256, CLUE_DRAINED, True),
    ('pista huella de pato.png', 'clue-webfoot-earned.png',    256, PRINT,        False),
    ('pista huella de pato.png', 'clue-webfoot-drained.png',   256, CLUE_DRAINED, False),
    ('pista burbujas.png',    'clue-bubble-earned.png',        256, 'contour',    True),
    ('pista burbujas.png',    'clue-bubble-drained.png',       256, CLUE_DRAINED, True),
    ('pista escama.png',      'clue-scale-earned.png',         256, 'contour',    True),
    ('pista escama.png',      'clue-scale-drained.png',        256, CLUE_DRAINED, True),
    ('pista mano de mono.png', 'clue-handprint-earned.png',    256, PRINT,        False),
    ('pista mano de mono.png', 'clue-handprint-drained.png',   256, CLUE_DRAINED, False),
    ('pista banana.png',      'clue-banana-earned.png',        256, 'contour',    True),
    ('pista banana.png',      'clue-banana-drained.png',       256, CLUE_DRAINED, True),
    # `docs/21` N2 (`night-rastro`) and N4 (`monkey-lianas`), registered by
    # T43 and on their levels since T44.
    ('pista huellita de erizo.png', 'clue-hedgehog-print-earned.png', 256, PRINT, False),
    ('pista huellita de erizo.png', 'clue-hedgehog-print-drained.png', 256, CLUE_DRAINED, False),
    ('pista cascara de banana.png', 'clue-banana-peel-earned.png', 256, 'contour', True),
    ('pista cascara de banana.png', 'clue-banana-peel-drained.png', 256, CLUE_DRAINED, True),
    # T44 (`docs/21` N3, `f2-buceo`): the fish case already shows bubbles
    # (`f2-guirnalda`) and scales (`f2-agua2`), and every clue of a case is a
    # different thing (T40). What the fish nibbles at the bottom of each dive
    # is a bit of seaweed: `alga.png` is existing art (blue contour, green
    # fill), kept with its authored fills like the T43 marks above.
    ('alga.png',              'clue-seaweed-earned.png',       256, 'contour',    True),
    ('alga.png',              'clue-seaweed-drained.png',      256, CLUE_DRAINED, True),
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
    # The prologue's promise, kept (docs/18 §4.5, `odd/tasks/promised-
    # animals.md` P1): the fish and turtle recintos ship empty today only
    # because nobody ever exported their own art, not because the drawings
    # are missing. `pez.png`/`tortuga.png` are genuine cutouts with real
    # alpha (measured, not assumed: halo 0.00%/0.38% at thresh 8, both well
    # inside the 0.00-0.40% "healthy cutout" band `docs/17` §3 bis gives —
    # neither needs `GHOST_ALPHA_SOURCES`), but both carry a BLUE contour
    # (the same defect class `recontour`'s own header records for
    # `medusa.png`/`estrella de mar.png`), so `fill='contour'` is the right
    # mode here, not `None`: these two land in `ZOO_ANIMAL_ART` rather than
    # `SECTOR_ADVENTURE_ART`, but they are drawn-world creatures standing
    # beside the child's own ink exactly like the llama/oveja/delfín rows
    # below, not lineup art on a blank sheet like the four `animal-*.png`
    # rows just above (whose `fill=None` is right only because they never
    # share a scene with anything else). `animal-` is still the correct
    # PREFIX, not `sector-`: unlike the llama/oveja/delfín, these two are
    # never wrapped in a `SECTOR_ADVENTURE_ART` row of their own — the fish
    # and the turtle are ZOO ANIMALS the child recovers and sees standing at
    # the entrance afterward, the exact role `animal-pato.png` already
    # plays, so their filename follows THAT sibling, not the sector props'.
    # Both names are added to the post-halving `recontour` allow-list below
    # (next to `sector-`/`zoo-`/`hedgehog-`) for the same reason those rows
    # are: a real photographed contour, halved twice, can blend a few
    # boundary pixels toward a faint chromatic tint that `docs/09` §4 bans —
    # the flat, hand-drawn placeholder block below has no such gradient to
    # blend, so it is left off that list, matching `sign-*.png`'s own
    # precedent (also `fill='contour'`, also never added to that list).
    ('pez.png',               'animal-pez.png',            448, 'contour',    True),
    ('tortuga.png',           'animal-tortuga.png',        448, 'contour',    True),
    # T49 (`docs/23` D4): the real monkey, pose 1 of `monos lamina.png`
    # (cut by `crop_sheets.py`). It replaces `mono.png`, the
    # `make_placeholders.py` sign block that stood in since P1; that file
    # stays in `art-source/` (`docs/23` §7 point 3) but nothing ships it.
    # Poses 2 and 3 are the `FRAMED` rows below.
    ('mono v2.png',           'animal-mono.png',           448, 'character',    True),
    # `carrier-octopus.png` moved to `FRAMED` (T49, `docs/23` D6): it now
    # ships on the same canvas as its lens-less twin.
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
    ('vibora chica.png',      'sector-snake-small.png',    512, 'contour',    True, True),
    ('vibora mediana.png',    'sector-snake-medium.png',   512, 'contour',    True, True),
    ('vibora grande.png',     'sector-snake-large.png',    512, 'contour',    True, True),
    ('llama.png',             'sector-llama.png',          448, 'contour',    True),
    # T49 (`docs/23` D9): the bee, flower and honeycomb, redrawn in bright
    # colours (`abeja lamina.png`, cut by `crop_sheets.py`).
    ('abeja v2.png',          'sector-bee.png',            256, 'contour',    True),
    ('flor v2.png',           'sector-flower.png',         256, 'contour',    True),
    # [free-trail-waypoints, task 3.2] The flower BEFORE the bee has been to
    # it. `keep_ink=True` keeps the `#1a1a1a` contour and flattens only the
    # petal -- the same two-tone path every `clue-*-drained` row takes, so
    # the dormant state still reads as a flower rather than a blank patch.
    ('flor v2.png',           'sector-flower-dormant.png', 256, FLOWER_DORMANT, True),
    ('panal v2.png',          'sector-honeycomb.png',      256, 'contour',    True),
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
    # T49 (`docs/23` D10): `oveja v2.png`, side-on with legs and cream wool.
    # Measured before deciding on `SPECKLED_ALPHA_SOURCES`: `alpha_bbox`
    # returns the sheep's own box (45-988 x 122-923) and the 1-8 alpha band
    # is a smooth antialiasing tail (0.56% of the canvas, falling from alpha
    # 1, no spike), so it needs neither opt-in set.
    ('oveja v2.png',           'sector-sheep.png',          448, 'character',    True),
    # The entrance's night findable objects (design.md §3.4): drawn-world
    # props standing beside the child's own ink, not reward-coloured clue
    # marks, so `fill='contour'` matches every sibling `sector-*` row rather
    # than a flat recolour. `piedra.png` needs `SPECKLED_ALPHA_SOURCES`
    # (above) before `prepare()` ever reaches its `alpha_bbox` call; `cofre.png`
    # and `hoja.png` do not. None of the three takes an `AUTHORED_SOURCE_SIZES`
    # entry (design.md §3.4): `cofre.png` (1314x1197) and `piedra.png`
    # (1313x1198) are both landscape, ~1.10 aspect, and `hoja.png` (1238x1271,
    # aspect 0.974) is close but confirmed NOT exactly square by reading it
    # with `png.py` -- an entry that does not match fails
    # `validate_authored_source_sizes` for every asset in the build.
    ('cofre.png',              'sector-chest.png',          256, 'contour',    True),
    ('piedra.png',             'sector-stone.png',          256, 'contour',    True),
    ('hoja.png',               'sector-leaf.png',           256, 'contour',    True),
    # `docs/20` B12 (T43): the hedgehog's apple and mushroom, found by torch
    # on `night2`/`night3`. Same drawn-world props as the leaf beside them,
    # so the same `'contour'` row: the red apple and its green leaf keep
    # their colours (`docs/22` §6).
    ('manzana.png',            'sector-apple.png',          256, 'contour',    True),
    ('hongo.png',              'sector-mushroom.png',       256, 'contour',    True),
    # The arena's cart, `docs/13` §8 row E's own backpack reward
    # (design.md §7.1). PIPELINE ROW ONLY here -- no `CART_ART` registry entry
    # and no consumer yet, deliberately: `artManifest.test.ts` requires a
    # pipeline row, a registry entry AND a consumer to land in the same
    # change, and `carrito`'s only consumer (`zoo/backpack.ts`) cannot exist
    # before Phase 7 wires the `arena` sector. `carrito.png`'s `alpha_bbox`
    # is stable 8-200 (checked, not guessed) so it needs no
    # `SPECKLED_ALPHA_SOURCES` entry; its authored canvas is 1254x1254, not
    # 1024x1024, so it takes no `AUTHORED_SOURCE_SIZES` entry either.
    ('carrito.png',            'zoo-cart.png',              256, 'contour',    True),
    # The prologue's caretaker beat 0 and the three sign closings
    # (design.md D5/§4). Placeholder sources, same `'contour'`/`keep_ink`
    # path as every other zoo journey cutout -- the border already carries
    # `ART_OUTLINE`, and the sign words are already drawn in ink.
    ('pulpo cuidador.png',     'zoo-octopus-caretaker.png', 448, 'contour',    True),
    ('cartel peces.png',       'sign-fish.png',             256, 'contour',    True),
    ('cartel tortugas.png',    'sign-turtles.png',          256, 'contour',    True),
    ('cartel monos.png',       'sign-monkeys.png',          256, 'contour',    True),
    # --- T49 (`odd/tasks/prewriting-stage-completion.md`, `docs/23` round 2:
    # characters). None of these sources needs `GHOST_ALPHA_SOURCES` or
    # `SPECKLED_ALPHA_SOURCES`: measured, their 1-8 alpha band is a smooth
    # antialiasing tail (0.2-1.8% of the canvas, falling off from alpha 1, no
    # spike at 8), and the sheet crops already drop stray blobs
    # (`crop_sheets.py`'s `isolate`).
    #
    # `docs/23` D7: the Pulpito on the scene. Points at the entry screen
    # (mirrored when he stands in the right corner), thinks on the deduction,
    # cheers on the rescue closing (`docs/19` §4.1's table).
    ('pulpo senala.png',       'zoo-octopus-points.png',    448, 'character',    True),
    ('pulpo piensa.png',       'zoo-octopus-thinks.png',    448, 'character',    True),
    ('pulpo festeja.png',      'zoo-octopus-cheers.png',    448, 'character',    True),
    # `docs/20` B14 pose 2: the hedgehog uncurling with every spine on, for
    # the hedgehog's rescue (closing, map, notebook, deduction). Pose 1
    # (`erizo con espinas.png`) is NOT shipped: its export is cut off by the
    # right edge of the canvas (418 opaque rows on column 1023), so the
    # hedgehog's back ends in a straight vertical line.
    ('erizo desenroscando recortado.png', 'hedgehog-uncurling.png', 448, 'character', True),
    # `docs/20` B17: the shed snake skin, shown on the snakes' entry screen.
    ('piel vibora.png',        'sector-shed-skin.png',      448, 'contour',    True),
    # `docs/20` B9: the stage screens' speech bubble, same tail corner as
    # `bocadillo.png`. Two-tone INK + WHITE to drop its grey smudge (WHITE's
    # own comment, above).
    ('bocadillo izquierda.png', 'zoo-speech-bubble-left.png', 512, WHITE,     True),
    # `docs/23` D35: the transition's magnifier. Its empty glass is measured
    # into the manifest (`measure_lens_hole`) so `screen/lupaWipe.ts` lines
    # the hole up with the reveal circle from numbers, not estimates.
    ('lupa transicion.png',    'zoo-transition-lens.png',   512, 'contour',    True),
]

# T49 (`docs/23` §7 point 4): family poses that must ship on ONE shared
# canvas, at one scale. `crop_sheets.py` puts each sheet's poses on a common
# transparent frame (centred, feet on the bottom edge); these rows keep that
# frame instead of cropping each pose to itself, so:
#   * the two Pulpitos (`docs/23` D6, `docs/20` B18) are pixel-aligned and
#     the swap on touch (`screen/LevelPlay.tsx`'s `OCTOPUS_EMPTY_HANDED_ART`)
#     never jumps or resizes;
#   * a family collected along a route (`LevelConfig.collect.variants`) keeps
#     its relative sizes: the sitting monkey stays shorter than the standing
#     ones at the same `size`.
# (source, output, target size of the frame's longer side)
FRAMED = [
    ('pulpo con lupa v2.png',  'carrier-octopus.png',       384),
    ('pulpo sin lupa.png',     'carrier-octopus-empty.png', 384),
    # Pose 1's frame is its own tight box (`crop_sheets.py`), so
    # `animal-mono.png` (the `SINGLES` row above) is the first of the three.
    ('mono familia 2.png',     'animal-mono-family-2.png',  448),
    ('mono familia 3.png',     'animal-mono-family-3.png',  448),
    ('patito 1.png',           'animal-duckling-1.png',     256),
    ('patito 2.png',           'animal-duckling-2.png',     256),
    ('patito 3.png',           'animal-duckling-3.png',     256),
]


def emit_framed(name: str, img: png.Image) -> dict:
    """`emit` without the alpha-bbox crop: the frame IS the layout."""
    path = os.path.join(OUT, name)
    size = png.write_png(path, img)
    return {
        'file': f'art/{name}',
        'w': img.w,
        'h': img.h,
        'bytes': size,
    }


def measure_lens_hole(img: png.Image) -> dict:
    """The empty glass of `zoo-transition-lens.png`, as fractions of the
    shipped file: centre `cx`/`cy` (of width/height) and radius `r` (of
    width). Rays from a seed near the glass centre march outward to the first dark ring pixel (alpha >= 128, luma < 120:
    the marker line on the glass's inner edge -- the white glint inside the
    glass is skipped by the luma test), and a least-squares circle (Kasa)
    is fitted to the 360 hits."""
    import math
    w, h = img.w, img.h
    px = img.px

    def solid_dark(x: int, y: int) -> bool:
        i = (y * w + x) * 4
        return px[i + 3] >= 128 and luma(px[i], px[i + 1], px[i + 2]) < 120

    # Seed: the rim is the widest part of the drawing and its top is the
    # bbox's top, so the glass centre sits near (w/2, w/2) of the tight crop.
    cx0, cy0 = w * 0.5, w * 0.5
    hits = []
    for k in range(360):
        a = math.radians(k)
        rr = 1.0
        while True:
            x = int(round(cx0 + rr * math.cos(a)))
            y = int(round(cy0 + rr * math.sin(a)))
            if not (0 <= x < w and 0 <= y < h):
                break
            if solid_dark(x, y):
                hits.append((x + 0.5, y + 0.5))
                break
            rr += 0.5
    # Kasa fit: minimise sum (x^2 + y^2 + D x + E y + F)^2.
    sxx = sxy = syy = sx1 = sy1 = sxz = syz = sz = 0.0
    m = len(hits)
    for x, y in hits:
        z = x * x + y * y
        sxx += x * x
        sxy += x * y
        syy += y * y
        sx1 += x
        sy1 += y
        sxz += x * z
        syz += y * z
        sz += z
    # Normal equations for [D, E, F].
    a11, a12, a13, b1 = sxx, sxy, sx1, -sxz
    a21, a22, a23, b2 = sxy, syy, sy1, -syz
    a31, a32, a33, b3 = sx1, sy1, float(m), -sz
    det = (a11 * (a22 * a33 - a23 * a32) - a12 * (a21 * a33 - a23 * a31)
           + a13 * (a21 * a32 - a22 * a31))
    d = (b1 * (a22 * a33 - a23 * a32) - a12 * (b2 * a33 - a23 * b3)
         + a13 * (b2 * a32 - a22 * b3)) / det
    e = (a11 * (b2 * a33 - a23 * b3) - b1 * (a21 * a33 - a23 * a31)
         + a13 * (a21 * b3 - b2 * a31)) / det
    f = (a11 * (a22 * b3 - b2 * a32) - a12 * (a21 * b3 - b2 * a31)
         + b1 * (a21 * a32 - a22 * a31)) / det
    cx, cy = -d / 2, -e / 2
    r = math.sqrt(cx * cx + cy * cy - f)
    worst = max(abs(math.hypot(x - cx, y - cy) - r) for x, y in hits)
    if worst > r * 0.06:
        raise SystemExit(f'measure_lens_hole: the glass is not a circle (worst {worst:.1f}px of r {r:.1f})')
    return {'hole': {'cx': round(cx / w, 4), 'cy': round(cy / h, 4), 'r': round(r / w, 4)}}

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
# the same shape `mute`/`recolour`/`recontour` already use. Authored sector
# backgrounds remain untouched pass-throughs so their measured flat corridors
# and hand-drawn edge treatment are preserved exactly.
#
# T22 (`odd/tasks/prewriting-stage-completion.md`, "Wide backgrounds"): every
# row below ships at 1536x1024 (3:2) today, but nothing here assumes that
# width. `expected_w`/`expected_h` are just what `emit_opaque_canvas` checks
# the source against; `sample_corridor_band` scans the image's OWN `img.w`
# and the `(top, bottom)` row range depends only on HEIGHT (unchanged at
# 1024) -- so a WIDE replacement (2:1, `2048x1024`, `docs/20` §2.2's central-
# safe-zone convention) is a `(2048, 1024, (top, bottom))` row with the SAME
# vertical numbers, no other change. `wide_backdrop_test.py` proves this
# against a synthetic 2:1 fixture rather than assuming it.
PASSTHROUGHS = [
    ('mapa zoologico.png', 'zoo-map.png', 1536, 1024, None),
    ('fondo laguna.png', 'sector-lagoon-background.png', 1536, 1024, (135, 889)),
    ('fondo arena.png', 'sector-sand-background.png', 1536, 1024, (51, 973)),
    ('fondo ladera.png', 'sector-slope-background.png', 1536, 1024, (220, 866)),
    ('fondo cordillera.png', 'sector-range-background.png', 1536, 1024, (166, 858)),
    # [free-trail-waypoints, task 3.1] The bee family draws no corridor at
    # all -- the whole play area is the band, per `docs/13` §4 decision 3 --
    # so the range is the widest one a bee level's art boxes actually sit
    # in, pinned at the safe end of the test-proven flat region
    # (design.md §4.1, §3.1): measured quiet/brightest are BOTH `#86a678`
    # (regenerated forest art, 2026-09-15; `#949b8c` before that) over this
    # range, so the two fields below are equal (design.md §3.1's own
    # prediction, verified by re-running this script).
    ('fondo bosque.png', 'sector-forest-background.png', 1536, 1024, (191, 926)),
    ('fondo entrada vidrio.png', 'sector-aquarium-background.png', 1536, 1024, (51, 973)),
    ('fondo nocturno.png', 'sector-night-background.png', 1536, 1024, (51, 973)),
    ('fondo noche zoo.png', 'sector-night-zoo-background.png', 1536, 1024, (51, 973)),
    # The prologue's two new entrance enclosures (design.md D6/§4). Same
    # corridor band as the other entrance backgrounds -- (51, 973).
    ('fondo recinto monos.png', 'sector-monkeys-background.png', 1536, 1024, (51, 973)),
    ('fondo sendero.png', 'sector-path-background.png', 1536, 1024, (51, 973)),
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


def _median(values: list[int]) -> float:
    s = sorted(values)
    n = len(s)
    mid = n // 2
    return s[mid] if n % 2 else (s[mid - 1] + s[mid]) / 2


EYE_WHITE_LUMA = 200  # design.md §1.1 -- the eye-white threshold `traceTo` stops behind.
SPINE_ALPHA_THRESH = 128


def sample_spine(img: png.Image) -> dict:
    """The drawn body's true centreline, sampled directly off the pixels
    rather than fitted to a formula (`fix-snakes-true-alignment`'s own
    correction of the previous closed-form fit below).

    `mid`      the traceable span's mean centreline y, as a fraction of the
               cutout's height -- still the anchor `placeArtCorridor` maps
               `at.y` onto, same role the fitted `mid` used to play.
    `points`   `[[x, y], ...]` -- the measured centreline itself, x and y both
               as fractions of the cutout's width/height, x STRICTLY
               ascending from `traceFrom` to `traceTo` inclusive (the first
               and last point sit exactly on the traceable span's own
               boundary, so a caller that starts drawing at `traceFrom` and
               ends at `traceTo` can never silently draw a DIFFERENT stretch
               of the curve than the one measured here -- the bug this
               replaces: the previous closed-form fit's `halves` widths
               summed to the span between its own first/last zero-crossing,
               which sat INSIDE `[traceFrom, traceTo]` by a margin the
               runtime never accounted for, so `placeArtCorridor` marched the
               fitted halves from `traceFrom` and silently drew a shifted
               segment of the wave -- up to 35 shipped px off on the small
               snake, the worst-case a whole-route RMS check hides).
    `residual` max |measured spine - stored polyline| after the light
               smoothing/resampling below, SHIPPED px -- small by
               construction (the points ARE the measurement, not a fitted
               approximation of it). `catalog.test.ts` turns this into a
               viewBox tolerance (design.md 3.2 C1), same role the old fit
               residual played.
    `thickness`the NARROWEST opaque-column run length over the traceable
               span, as a fraction of the height (unchanged: a channel that
               must stay under the body everywhere answers to its thinnest
               cross-section, not a typical one).
    `traceFrom`/`traceTo`  the TRACEABLE span, as fractions of the width,
               `traceFrom < traceTo` always. Whichever tip carries the eye
               white (luma >= 200 -- measured, not assumed to sit on a
               particular side: the shipped cutouts carry it near LOW x, not
               the high-x side the composite reference sheet suggested) is
               inset past the cluster's far edge by one half-thickness, so the
               ink stops behind the head (design.md 2.2 red row R3) rather
               than landing on the eye. The OTHER tip is inset by a plain
               half-thickness from its own opaque edge (design.md §3.2 C5).
    `bodyBrightest`/`bodyDarkest` the luma extremes over the opaque body,
               strictly BETWEEN `traceFrom` and `traceTo` (so the eye white
               never counts as `bodyBrightest`), as `#rrggbb`.
    `headWhite` the single brightest opaque pixel anywhere in the cutout (the
               eye), as `#rrggbb`.

    Normalized to the cutout's own box so the numbers survive a re-export at a
    different pixel size -- the same reason `ArtImage` carries `w`/`h` rather
    than a scale. No alpha is sampled at RUNTIME; this is a build step, and
    nothing in the client ever reads a pixel.

    Per-column midpoint (`(y_min + y_max) / 2` of the opaque run) is an
    UNBIASED read of a straight tube's true centre at any slope -- elementary
    geometry, a vertical cut through an infinite straight strip always bisects
    it -- and this shape never has more than one opaque run per traceable
    column (checked directly: zero multi-run columns on the small/medium
    bodies, and the large body's only ones sit in the head taper, outside
    `[traceFrom, traceTo]`), so there is no self-occlusion to correct for
    either. What was wrong was never the per-column measurement -- it was
    reducing it to a five-number formula and then re-expanding that formula
    from the WRONG anchor. Storing the measured points removes the
    reduction and the anchor mismatch in one move.
    """
    w, h = img.w, img.h
    px = img.px
    spine: list[float | None] = [None] * w
    thickness_cols: dict[int, int] = {}
    col_min_luma: dict[int, int] = {}
    col_max_luma: dict[int, int] = {}
    for x in range(w):
        y_min = y_max = None
        count = 0
        lo_luma = 256
        hi_luma = -1
        for y in range(h):
            i = (y * w + x) * 4
            if px[i + 3] < SPINE_ALPHA_THRESH:
                continue
            if y_min is None:
                y_min = y
            y_max = y
            count += 1
            level = luma(px[i], px[i + 1], px[i + 2])
            if level < lo_luma:
                lo_luma = level
            if level > hi_luma:
                hi_luma = level
        # A tight alpha-bbox crop guarantees SOME pixel at or above threshold 8
        # touches the first/last row and column, but this scan's threshold
        # (128, "opaque enough to belong to the body") is stricter -- so an
        # antialiased edge column can legitimately come back empty. Left as a
        # gap and NEAREST-FILLED below rather than treated as a defect: it is
        # one or two feathered columns at the very tail/head tip, never the
        # drawn body itself.
        if y_min is not None:
            spine[x] = (y_min + y_max) / 2
            thickness_cols[x] = y_max - y_min + 1
            col_min_luma[x] = lo_luma
            col_max_luma[x] = hi_luma

    known = [x for x in range(w) if spine[x] is not None]
    if not known:
        raise SystemExit('sample_spine: no column reaches the opaque threshold')
    for x in range(w):
        if spine[x] is None:
            nearest = min(known, key=lambda k: abs(k - x))
            spine[x] = spine[nearest]
            thickness_cols[x] = thickness_cols[nearest]
            col_min_luma[x] = col_min_luma[nearest]
            col_max_luma[x] = col_max_luma[nearest]

    # A PROVISIONAL thickness (the median) only to size the two tip insets
    # below -- reasonable for "how far in from a tapering tip", where being
    # off by a few px changes nothing else. The MANIFEST's own `thickness`
    # (what `catalog.test.ts`'s C1 actually gates the channel width against)
    # is recomputed below as the MINIMUM over the traceable span instead:
    # measured on the first screenshot of this data (task 8.7), a corridor
    # stroked at the MEDIAN thickness pokes the sand hollow out past the
    # drawn body at a real trough of the wave, where the body is thinner
    # than its own median run length. A channel that must stay under the
    # body EVERYWHERE has to answer to the narrowest cross-section it
    # actually crosses, not the typical one.
    provisional_thickness_px = _median(list(thickness_cols.values()))

    # The TRACEABLE span excludes both tip ends (half-thickness in, so the
    # corridor stroke's round cap lands ON the body) and the eye-white zone,
    # WHICHEVER side of the cutout it sits on -- the measured art's own head
    # is at low x for all three snakes, not the high-x side the reference
    # sheet's composite drawing suggested, so this is orientation-agnostic
    # rather than assuming a side.
    eye_cols = [x for x in range(w) if col_max_luma[x] >= EYE_WHITE_LUMA]
    left_tip_inset = provisional_thickness_px / 2
    right_tip_inset = (w - 1) - provisional_thickness_px / 2
    if eye_cols:
        near_left = min(eye_cols) < (w - 1) - max(eye_cols)
        if near_left:
            # The eye sits near x=0: the boundary that matters is the
            # cluster's FAR edge (closest to the rest of the body), pushed
            # one further half-thickness away from the eye.
            head_boundary = max(eye_cols) + provisional_thickness_px / 2
            tail_boundary = right_tip_inset
        else:
            head_boundary = min(eye_cols) - provisional_thickness_px / 2
            tail_boundary = left_tip_inset
    else:
        head_boundary = right_tip_inset
        tail_boundary = left_tip_inset

    trace_from_px = max(0.0, min(head_boundary, tail_boundary))
    trace_to_px = min(float(w - 1), max(head_boundary, tail_boundary))
    trace_from_col = max(0, min(w - 1, round(trace_from_px)))
    trace_to_col = max(trace_from_col, min(w - 1, round(trace_to_px)))

    # The REAL `thickness`: the narrowest cross-section anywhere in the
    # traceable span, not the typical one (see the note above).
    thickness_px = min(thickness_cols[x] for x in range(trace_from_col, trace_to_col + 1))

    body_cols = range(trace_from_col, trace_to_col + 1)
    body_darkest_luma = min(col_min_luma[x] for x in body_cols)
    body_brightest_luma = max(col_max_luma[x] for x in body_cols)

    def hex_at_luma(target_luma: int, want_min_x: int, want_max_x: int) -> str:
        for x in range(want_min_x, want_max_x + 1):
            for y in range(h):
                i = (y * w + x) * 4
                if px[i + 3] < SPINE_ALPHA_THRESH:
                    continue
                if luma(px[i], px[i + 1], px[i + 2]) == target_luma:
                    return '#%02x%02x%02x' % (px[i], px[i + 1], px[i + 2])
        raise SystemExit('sample_spine: luma target not found')

    body_darkest = hex_at_luma(body_darkest_luma, trace_from_col, trace_to_col)
    body_brightest = hex_at_luma(body_brightest_luma, trace_from_col, trace_to_col)
    head_white_luma = max(col_max_luma.values())
    head_white = hex_at_luma(head_white_luma, 0, w - 1)

    # The centreline is sampled over the TRACEABLE span only,
    # `[traceFrom, traceTo]` -- not the whole cutout. The tapering tail/head
    # tips outside it are real drawn art but are not corridor: a taper's own
    # tip is a point, not a cross-section, so `mid` is the mean over the
    # traceable span alone, which is also the span the stored polyline needs
    # to cover: the round-capped corridor stroke already stops at the same
    # two insets (C5).
    mid_px = sum(spine[x] for x in body_cols) / len(body_cols)  # type: ignore[misc]

    # A light 3-tap box filter over the raw per-column measurement -- not to
    # fix any real defect (the per-column jitter measured on all three snakes
    # tops out at 1.5px between adjacent columns, i.e. already smooth: a
    # hand-inked antialiased edge, not noise) but so the stored points do not
    # bake in single-pixel antialiasing-threshold flicker.
    def smoothed(x: int) -> float:
        lo = max(trace_from_col, x - 1)
        hi = min(trace_to_col, x + 1)
        return sum(spine[i] for i in range(lo, hi + 1)) / (hi - lo + 1)  # type: ignore[misc]

    # Resample the smoothed measurement at evenly spaced x's across the
    # traceable span, roughly one point every 8px -- dense enough to read as
    # a smooth curve at the sizes this art is placed at, sparse enough to stay
    # a short, reviewable literal (`DRAWN_SPINE` in `artCorridor.ts`), same as
    # every other hand-copied manifest number in `assets.ts`/`backdrops.ts`.
    # The FIRST and LAST sample sit exactly on `traceFrom`/`traceTo` by
    # construction, which is what makes the anchor bug above structurally
    # impossible here: whatever starts drawing at `traceFrom` and ends at
    # `traceTo` draws exactly this data, never a shifted stretch of it.
    span_px = trace_to_px - trace_from_px
    point_count = max(8, round(span_px / 8) + 1)
    points_px: list[tuple[float, float]] = []
    for i in range(point_count):
        t = i / (point_count - 1)
        x_px = trace_from_px + t * span_px
        x_lo = max(trace_from_col, min(trace_to_col, int(x_px)))
        x_hi = min(trace_to_col, x_lo + 1)
        frac = 0.0 if x_hi == x_lo else (x_px - x_lo) / (x_hi - x_lo)
        y_px = smoothed(x_lo) * (1 - frac) + smoothed(x_hi) * frac
        points_px.append((x_px, y_px))

    # `residual`: how far the stored (smoothed, resampled) polyline strays
    # from the RAW per-column measurement, at every raw column -- small by
    # construction, since the points are a light smoothing of the
    # measurement itself rather than a fitted approximation of it.
    residual = 0.0
    pi = 0
    for x in range(trace_from_col, trace_to_col + 1):
        while pi + 1 < len(points_px) - 1 and points_px[pi + 1][0] < x:
            pi += 1
        (ax, ay), (bx, by) = points_px[pi], points_px[min(pi + 1, len(points_px) - 1)]
        t = 0.0 if bx == ax else max(0.0, min(1.0, (x - ax) / (bx - ax)))
        recon = ay + (by - ay) * t
        residual = max(residual, abs(spine[x] - recon))  # type: ignore[operator]

    return {
        'mid': mid_px / h,
        'points': [[xpx / w, ypx / h] for xpx, ypx in points_px],
        'residual': residual,
        'thickness': thickness_px / h,
        'traceFrom': trace_from_px / w,
        'traceTo': trace_to_px / w,
        'bodyBrightest': body_brightest,
        'bodyDarkest': body_darkest,
        'headWhite': head_white,
    }


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
    'fondo nocturno.png': (1536, 1024),
    'fondo pecera.png': (1536, 1024),
    'fondo entrada vidrio.png': (1536, 1024),
    'fondo noche zoo.png': (1536, 1024),
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
    # The prologue's caretaker beat (design.md D5). `make_placeholders.py`
    # writes all six at these exact canvases; `validate_authored_source_
    # sizes` runs before anything else, so a mismatched regeneration fails
    # loudly rather than silently changing crop/downscale behavior.
    'pulpo cuidador.png': (1024, 1024),
    'fondo recinto monos.png': (1536, 1024),
    'fondo sendero.png': (1536, 1024),
    'cartel peces.png': (1024, 1024),
    'cartel tortugas.png': (1024, 1024),
    'cartel monos.png': (1024, 1024),
    # The monkey's own placeholder (P1, promised-animals): also written by
    # `make_placeholders.py` at this exact canvas, same reasoning as the
    # caretaker/carteles rows just above — fail loudly on a mismatched
    # regeneration rather than silently mis-cropping it.
    'mono.png': (1024, 1024),
    # T43: the redrawn clue marks and `docs/20` B12, all exported at the
    # square canvas `docs/22` §0 asks for.
    'pista charco.png': (1024, 1024),
    'pista pluma de pato.png': (1024, 1024),
    'pista huella de pato.png': (1024, 1024),
    'pista burbujas.png': (1024, 1024),
    'pista semillas.png': (1024, 1024),
    'pista escama.png': (1024, 1024),
    'pista huellita de erizo.png': (1024, 1024),
    'pista mano de mono.png': (1024, 1024),
    'pista cascara de banana.png': (1024, 1024),
    'pista banana.png': (1024, 1024),
    'manzana.png': (1024, 1024),
    'hongo.png': (1024, 1024),
    # T49: the round-2 character sources, and the crops `crop_sheets.py`
    # writes from the sheets (pinned so a re-cut that changes a frame fails
    # here instead of silently moving a pose).
    'oveja v2.png': (1024, 1024),
    'lupa v2.png': (1024, 1024),
    'lupa transicion.png': (1024, 1024),
    'bocadillo izquierda.png': (1024, 1024),
    'piel vibora.png': (1024, 1024),
    'mono v2.png': (599, 997),
    'mono familia 2.png': (599, 997),
    'mono familia 3.png': (599, 997),
    'patito 1.png': (500, 686),
    'patito 2.png': (500, 686),
    'patito 3.png': (500, 686),
    'pulpo con lupa v2.png': (716, 843),
    'pulpo sin lupa.png': (716, 843),
    'pulpo senala.png': (558, 674),
    'pulpo piensa.png': (456, 693),
    'pulpo festeja.png': (515, 663),
    'abeja v2.png': (514, 473),
    'flor v2.png': (371, 554),
    'panal v2.png': (442, 455),
    'erizo desenroscando recortado.png': (697, 710),
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
    # T49 (`docs/23` D8): `lupa v2.png`, the same grey-rimmed glass the new
    # Pulpito holds. Its glass is EMPTY (transparent) inside a light-blue
    # band, so the feature is that band: blue clearly above red (the grey
    # rim and the white glint are near-neutral), bright.
    ('lupa v2.png', 'carrier-lens.png', 192,
     lambda r, g, b: b > 225 and g > 195 and b - r > 35),
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

    for row in SINGLES:
        src, name, target_h, fill, keep_ink = row[:5]
        want_spine = row[5] if len(row) > 5 else False
        img = prepare(src, target_h)
        if name == 'zoo-speech-bubble-left.png':
            fill_enclosed_alpha(img)
        if fill == 'contour':
            recontour(img)
        elif fill == 'character':
            lift_dark_fills(img)
        elif fill is not None:
            recolour(img, fill, keep_ink)
        final = png.box_resize(img, max(1, img.w // 2), max(1, img.h // 2))
        # Halving blends contour and fill RGB at their shared boundary. Keep
        # alpha antialiasing at the outer silhouette, but snap any resulting
        # dark chromatic blend back to the neutral world contour.
        if fill == 'contour' and (
            name.startswith(('zoo-', 'sector-', 'hedgehog-', 'clue-'))
            or name in (
                'andean-hat.png', 'carrier-octopus.png', 'home-octopus.png',
                # `animal-pez.png`/`animal-tortuga.png` (P1, promised-animals):
                # real photographed cutouts with a genuine antialiased
                # contour, the same blend risk the `sector-`/`zoo-` rows
                # above are already re-run for — an `animal-` prefix does not
                # exempt them. `animal-mono.png` joined in T49: it is the
                # real drawn monkey now, no longer the flat placeholder block.
                'animal-pez.png', 'animal-tortuga.png', 'animal-mono.png',
            )
        ):
            recontour(final)
        if fill == 'character':
            lift_dark_fills(final)
        # `sample_spine` reads the SHIPPED file -- the exact array `emit`
        # crops to its own alpha bbox -- so the manifest's `w`/`h` fractions
        # match what `assets.ts`'s registry ships, not the pre-crop canvas.
        spine = None
        if want_spine:
            x0, y0, x1, y1 = png.alpha_bbox(final)
            spine = sample_spine(png.crop(final, x0, y0, x1, y1))
        key = name[:-4]
        manifest[key] = emit(name, final)
        if fill == 'contour' and name.startswith('clue-'):
            manifest[key]['fill'] = dominant_fill(final)
        if name == 'zoo-transition-lens.png':
            x0, y0, x1, y1 = png.alpha_bbox(final)
            manifest[key].update(measure_lens_hole(png.crop(final, x0, y0, x1, y1)))
        if spine is not None:
            manifest[key].update(spine)
        print(f'  {key:26s} {manifest[key]["w"]}x{manifest[key]["h"]} '
              f'{manifest[key]["bytes"] / 1024:6.1f} KB')

    # T49: the framed family poses (`FRAMED`'s own header).
    for src, name, target in FRAMED:
        img = png.read_png(os.path.join(SRC, src))
        scale = target * 2 / max(img.w, img.h)
        img = png.box_resize(img, max(1, round(img.w * scale)), max(1, round(img.h * scale)))
        lift_dark_fills(img)
        final = png.box_resize(img, max(1, img.w // 2), max(1, img.h // 2))
        lift_dark_fills(final)
        key = name[:-4]
        manifest[key] = emit_framed(name, final)
        print(f'  {key:26s} {manifest[key]["w"]}x{manifest[key]["h"]} '
              f'{manifest[key]["bytes"] / 1024:6.1f} KB')

    # T20 (`odd/tasks/prewriting-stage-completion.md`, docs/19 §3.1): the
    # snakes start grey and regain colour as the child's finger traces them.
    # Own section, deliberately not a `SINGLES` row -- the grey variant is
    # derived from the SHIPPED colour file `emit` just wrote above (so its
    # crop/alpha/size can never drift from its sibling by construction),
    # never from the raw source PNG the `SINGLES` loop starts from. This is
    # the only place this pipeline reads back a file it just wrote instead of
    # a fresh source, and it is why the loop stays separate from `SINGLES`
    # rather than growing that table a seventh column.
    for snake_name in ('sector-snake-small.png', 'sector-snake-medium.png', 'sector-snake-large.png'):
        colour_key = snake_name[:-4]
        grey_name = f'{colour_key}-grey.png'
        grey_key = grey_name[:-4]
        grey_img = desaturate_keep_alpha(png.read_png(os.path.join(OUT, snake_name)))
        manifest[grey_key] = emit(grey_name, grey_img)
        # Re-run `sample_spine` rather than copy the colour sibling's fields:
        # cheap, and it is what lets `artManifest.test.ts` assert the two
        # agree BY MEASUREMENT (`desaturate_keep_alpha`'s own header has the
        # exact-luma proof) instead of by construction alone.
        manifest[grey_key].update(sample_spine(grey_img))
        print(f'  {grey_key:26s} {manifest[grey_key]["w"]}x{manifest[grey_key]["h"]} '
              f'{manifest[grey_key]["bytes"] / 1024:6.1f} KB')

    # --- Deduction-screen animal silhouettes (T21, prewriting-stage-
    # completion.md; T25 widens this to the NIGHT case's own lineup). A
    # SECOND pass over cutouts SINGLES already emitted above
    # (`animal-pato.png`/`animal-gallina.png`/`animal-vaca.png`/
    # `animal-gato.png`, `fill=None` so they ship in full authored colour;
    # `hedgehog-profile.png`/`sector-sheep.png`/`sector-llama.png`,
    # `fill='contour'` so they keep an ink/fill split of their own): a copy of
    # the shipped file, `recolour`'d to one flat `INK` fill with
    # `keep_ink=False` -- `recolour`'s own docstring names exactly this case
    # ("art that is already a bare silhouette with no contour of its own,
    # where an ink/fill split would find no fill"), and `keep_ink=False`
    # sends EVERY opaque pixel to `fill` regardless of whether the source had
    # an ink/fill split to begin with, so the `contour`-mode trio silhouettes
    # exactly as flat as the `fill=None` quartet. The result is a real
    # derived PNG, alpha-identical to the coloured original, never a runtime
    # CSS/SVG filter -- `Deduction.tsx` shows this file until the child picks
    # the right animal, then swaps to the coloured one (the "silhouette fills
    # with colour" requirement). Read from `OUT`, not re-`prepare()`d from
    # `art-source/`, so this can never drift from what the coloured lineup
    # itself ships. Deliberately its OWN section, after every other pass in
    # this function and touching no shared code, so it can never collide with
    # another writer's own derivation elsewhere in this file (the snake
    # greyscale pass, `docs/19` §3.1).
    #
    # `hedgehog-profile.png` (erizo, the night case's own culprit) and
    # `sector-sheep.png`/`sector-llama.png` (oveja/llama, two of the night
    # case's progress-computed "already rescued" discard candidates --
    # `detective/cases.ts`'s `resolveNightDiscards`, `docs/19` §2.3/§3.2) are
    # the T25 addition: the night lineup can show erizo, pato, oveja, llama,
    # vaca or gato depending on what the child has actually rescued by then,
    # so every one of those six needs a silhouette, not just the original
    # four `AnimalId`s.
    for animal_file in (
        'animal-pato.png',
        'animal-gallina.png',
        'animal-vaca.png',
        'animal-gato.png',
        # T49: the erizo's lineup/notebook picture is the uncurling hedgehog
        # with its spines (`docs/20` B14) instead of the spineless profile.
        'hedgehog-uncurling.png',
        'sector-sheep.png',
        'sector-llama.png',
    ):
        img = png.read_png(os.path.join(OUT, animal_file))
        recolour(img, INK, keep_ink=False)
        out_name = animal_file[:-4] + '-silhouette.png'
        key = out_name[:-4]
        manifest[key] = emit(out_name, img)
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

    # --- Detective's notebook animal silhouettes (T23, prewriting-stage-
    # completion.md, `docs/19` §5 slice 6). A SECOND animal-silhouette pass,
    # alongside T21's own (the deduction lineup's `animal-*.png` four,
    # above): `zoo/notebook.ts`'s registry needs a silhouette for every OTHER
    # real zoo animal too, so a missing one's own notebook page shows a
    # silhouette instead of falling back to its full-colour art (which would
    # give away an animal the child has not found yet). `pato` already has
    # one from the T21 pass above (`animal-pato-silhouette.png`) and is not
    # repeated here. Same technique as T21: read the file `OUT` already
    # ships (never re-`prepare()`d from `art-source/`, so this can never
    # drift from what the coloured art itself shows), `recolour` a COPY to
    # one flat `INK` fill with `keep_ink=False` — every one of these nine is
    # already a bare cutout with no contour of its own, `recolour`'s own
    # docstring's exact case. Deliberately its own section, after every
    # other pass in this function and touching no shared code, so it can
    # never collide with another writer's own derivation elsewhere in this
    # file (T20's snake grey pass, T21's own pass above, a future night/
    # hedgehog pass).
    # erizo/oveja/llama are emitted once by the T21/T25 pass above; the
    # notebook reuses those files by reference (assets.ts), never a second copy.
    for animal_file in (
        'sector-snake-medium.png',  # vibora
        'sector-bee.png',           # abeja
        'sector-dolphin.png',       # delfin
        'animal-pez.png',           # pez
        'animal-tortuga.png',       # tortuga
        'animal-mono.png',          # mono (the real monkey since T49)
    ):
        img = png.read_png(os.path.join(OUT, animal_file))
        recolour(img, INK, keep_ink=False)
        out_name = animal_file[:-4] + '-silhouette.png'
        key = out_name[:-4]
        manifest[key] = emit(out_name, img)
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
