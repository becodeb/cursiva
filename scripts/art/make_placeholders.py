#!/usr/bin/env python3
"""Generate the six placeholder sources this branch needs, into `art-source/`.

Run: `python3 scripts/art/make_placeholders.py` or `--dry-run` (no dependencies, no network). Existing sources are skipped, never overwritten.

Why this exists: this host has no Pillow, no ImageMagick and no potrace
(`build_art.py`'s own header), so a placeholder cannot be exported from an
image editor either. The repo's own `scripts/art/png.py` is the only raster
layer available, and it is enough: `png.Image(w, h)` gives a zeroed RGBA
bytearray and `png.write_png(path, img)` writes it straight to disk.

Two shapes come out of this, matching `build_art.py`'s own `AUTHORED_SOURCE_
SIZES` contract exactly (design.md D5):

- **Backgrounds** (1536x1024, `PASSTHROUGHS`): a flat base fill, a sparse
  diagonal stripe over it (~12.5% coverage, always darker than the base so
  the base stays the modal colour `sample_corridor_band` reads), and a
  darker label bar OUTSIDE the sampled corridor band (rows 51-973) so it
  never perturbs `quiet`/`brightest`. Every pixel is written with alpha 255,
  so `emit_opaque_canvas`'s full-opacity check passes by construction.
- **Cutouts** (1024x1024, `SINGLES`): a transparent canvas holding one inset
  opaque block, itself a flat interior fill bordered by `ART_OUTLINE`
  (`#1a1a1a`). No dither, no gradient -- a hand-written canvas has neither.
  The three signs additionally stamp their word (`PECES`/`TORTUGAS`/
  `MONOS`) across the interior in the same ink colour via a 5x7 block-letter
  routine, so the placeholder actually carries the word docs/16 section 5
  asks for instead of owing it.
"""

from __future__ import annotations

import argparse
from dataclasses import dataclass, field
import os
import sys
from typing import Callable

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import png  # noqa: E402

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SRC = os.path.join(ROOT, 'art-source')

ART_OUTLINE = (0x1A, 0x1A, 0x1A, 255)


def solid(w: int, h: int, rgba: tuple[int, int, int, int]) -> png.Image:
    """A fully opaque flat canvas -- opaque by construction when rgba[3]==255."""
    img = png.Image(w, h)
    img.px[:] = bytes(rgba) * (w * h)
    return img


def rect(img: png.Image, x0: int, y0: int, x1: int, y1: int, rgba: tuple[int, int, int, int]) -> None:
    row = bytes(rgba) * (x1 - x0)
    for y in range(y0, y1):
        i = (y * img.w + x0) * 4
        img.px[i:i + len(row)] = row


def stripes(img: png.Image, rgba: tuple[int, int, int, int], period: int = 128, width: int = 16) -> None:
    """Sparse diagonal stripes, ~width/period coverage (default 12.5%)."""
    for y in range(img.h):
        for x in range(img.w):
            if (x + y) % period < width:
                i = (y * img.w + x) * 4
                img.px[i:i + 4] = bytes(rgba)


# 5x7 block-letter glyphs, one 5-bit row per scanline (MSB = leftmost
# column). Only the letters `PECES`/`TORTUGAS`/`MONOS` actually need.
GLYPHS: dict[str, list[int]] = {
    'P': [0b11100, 0b10010, 0b10010, 0b11100, 0b10000, 0b10000, 0b10000],
    'E': [0b11111, 0b10000, 0b10000, 0b11110, 0b10000, 0b10000, 0b11111],
    'C': [0b01111, 0b10000, 0b10000, 0b10000, 0b10000, 0b10000, 0b01111],
    'S': [0b01111, 0b10000, 0b10000, 0b01110, 0b00001, 0b00001, 0b11110],
    'T': [0b11111, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100],
    'O': [0b01110, 0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b01110],
    'R': [0b11110, 0b10001, 0b10001, 0b11110, 0b10010, 0b10001, 0b10001],
    'U': [0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b01110],
    'G': [0b01111, 0b10000, 0b10000, 0b10111, 0b10001, 0b10001, 0b01111],
    'A': [0b01110, 0b10001, 0b10001, 0b11111, 0b10001, 0b10001, 0b10001],
    'M': [0b10001, 0b11011, 0b10101, 0b10001, 0b10001, 0b10001, 0b10001],
    'N': [0b10001, 0b11001, 0b10101, 0b10011, 0b10001, 0b10001, 0b10001],
}


def word_width(text: str, cell: int) -> int:
    if not text:
        return 0
    return (len(text) * 6 - 1) * cell


def word(img: png.Image, text: str, x: int, y: int, cell: int, rgba: tuple[int, int, int, int]) -> None:
    """Draw `text` as flat block letters; each set glyph bit is a cell x cell rect."""
    cx = x
    for ch in text:
        rows = GLYPHS[ch]
        for ry, bits in enumerate(rows):
            for cxi in range(5):
                if (bits >> (4 - cxi)) & 1:
                    px0 = cx + cxi * cell
                    py0 = y + ry * cell
                    rect(img, px0, py0, px0 + cell, py0 + cell, rgba)
        cx += 6 * cell


def make_background(base: tuple[int, int, int], stripe: tuple[int, int, int]) -> png.Image:
    w, h = 1536, 1024
    img = solid(w, h, (*base, 255))
    stripes(img, (*stripe, 255), period=128, width=16)
    # Darker label bar OUTSIDE the sampled corridor band (51, 973), so it
    # never perturbs `quiet`/`brightest` -- the bottom margin, rows 990-1024.
    bar = tuple(max(0, c - 60) for c in base)
    rect(img, 0, 990, w, h, (*bar, 255))
    return img


def octagon(
    img: png.Image, x0: int, y0: int, x1: int, y1: int, notch: int, rgba: tuple[int, int, int, int],
) -> None:
    """Fill an axis-aligned rect with its four corners cut on the diagonal.

    Plain filled rectangles are the wrong shape for a `SINGLES` cutout: their
    alpha bounding box is flush with all four sides, so `prepare()`'s
    crop-to-content leaves NOTHING transparent inside the crop, and a
    straight axis-aligned edge downscales to another hard 0/255 edge --
    `build_art.py`'s own cutout contract needs a REAL transparent margin and
    a REAL antialiased edge (`box_resize`'s area-average blends a diagonal
    or curved edge into partial alpha; a straight one stays binary). Cutting
    the corners gives both for free, with no dependency beyond `rect`.
    """
    for y in range(y0, y1):
        dy_top = y - y0
        dy_bot = (y1 - 1) - y
        inset = max(0, notch - min(dy_top, dy_bot))
        lx, rx = x0 + inset, x1 - inset
        if lx < rx:
            rect(img, lx, y, rx, y + 1, rgba)


def make_cutout_block() -> tuple[png.Image, int, int, int, int]:
    """A transparent 1024x1024 canvas with one inset opaque octagon, bordered
    by `ART_OUTLINE`. Returns the image plus a SAFE interior rect (inside
    the border AND clear of the corner notches), for callers that stamp a
    word into it."""
    w, h = 1024, 1024
    img = png.Image(w, h)  # transparent by construction (zeroed bytearray)
    block_x0, block_y0, block_x1, block_y1 = 192, 192, 832, 832
    notch = 96
    border = 16
    fill = (0x9b, 0x9b, 0x9b, 255)  # luma ~155, well above INK_LUMA (90) --
    # survives `recontour` as its own flat colour instead of collapsing to ink.
    octagon(img, block_x0, block_y0, block_x1, block_y1, notch, ART_OUTLINE)
    octagon(
        img, block_x0 + border, block_y0 + border, block_x1 - border, block_y1 - border,
        notch - border, fill,
    )
    inner_x0, inner_y0 = block_x0 + border, block_y0 + border
    inner_x1, inner_y1 = block_x1 - border, block_y1 - border
    inner_notch = notch - border
    # The safe rect is the octagon's full-width MIDDLE band -- clear of both
    # the border and the corner notches, so a stamped word never touches a
    # diagonal cut.
    interior = (inner_x0, inner_y0 + inner_notch, inner_x1, inner_y1 - inner_notch)
    return img, *interior


def make_sign(label: str) -> png.Image:
    img, ix0, iy0, ix1, iy1 = make_cutout_block()
    cell = 12
    w = word_width(label, cell)
    h = 7 * cell
    x = ix0 + ((ix1 - ix0) - w) // 2
    y = iy0 + ((iy1 - iy0) - h) // 2
    word(img, label, x, y, cell, ART_OUTLINE)
    return img



@dataclass(frozen=True)
class PlaceholderSpec:
    name: str
    make: Callable[[], png.Image]


@dataclass
class PlaceholderPlan:
    created: list[str] = field(default_factory=list)
    skipped: list[str] = field(default_factory=list)


PLACEHOLDERS = [
    PlaceholderSpec(
        'fondo recinto monos.png',
        lambda: make_background((0xc9, 0xd3, 0xb8), (0x8c, 0x9a, 0x7d)),
    ),
    PlaceholderSpec(
        'fondo sendero.png',
        lambda: make_background((0xd5, 0xc8, 0xb0), (0xa3, 0x90, 0x6f)),
    ),
    PlaceholderSpec('pulpo cuidador.png', lambda: make_cutout_block()[0]),
    PlaceholderSpec('cartel peces.png', lambda: make_sign('PECES')),
    PlaceholderSpec('cartel tortugas.png', lambda: make_sign('TORTUGAS')),
    PlaceholderSpec('cartel monos.png', lambda: make_sign('MONOS')),
    # The monkey's own ZOO ANIMAL cutout (P1, promised-animals) — there is no
    # authored `mono.png` cutout yet (`docs/18` §4.5's own table says so; the
    # ChatGPT request for the real drawing is `docs/18` §6). Reuses
    # `make_sign` byte-for-byte rather than a new helper: a bordered octagon
    # block with a stamped word is exactly what a labelled placeholder needs,
    # whether the word ends up read as a sign (the three `cartel *.png` rows
    # above) or, here, as the animal's own name standing in for its portrait.
    # PENDING REAL ART: swap this file for an authored cutout the same way
    # `docs/17` §4 describes for any other placeholder, and nothing else in
    # this script changes.
    PlaceholderSpec('mono.png', lambda: make_sign('MONO')),
]


def write_placeholders(src: str = SRC, dry_run: bool = False) -> PlaceholderPlan:
    """Create only missing placeholder sources; never overwrite authored files.

    Existing files are treated as protected authored assets. This intentionally
    means the placeholder command is idempotent and conservative: once art is
    present, even if it was originally generated by this script, replacement is
    an explicit human action outside this helper.
    """
    plan = PlaceholderPlan()
    if not dry_run:
        os.makedirs(src, exist_ok=True)
    for spec in PLACEHOLDERS:
        path = os.path.join(src, spec.name)
        if os.path.exists(path):
            plan.skipped.append(spec.name)
            print(f'  skip protected existing source: {spec.name}')
            continue
        plan.created.append(spec.name)
        if dry_run:
            print(f'  would create placeholder:      {spec.name}')
            continue
        png.write_png(path, spec.make())
        img = png.read_png(path)
        print(f'  created placeholder:           {spec.name:28s} {img.w}x{img.h}')
    return plan


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(
        description='Create only missing placeholder art sources; existing authored assets are protected.',
    )
    parser.add_argument('--dry-run', action='store_true', help='report create/skip actions without writing files')
    args = parser.parse_args(argv)

    plan = write_placeholders(SRC, dry_run=args.dry_run)
    print(f'\n{len(plan.created)} to create, {len(plan.skipped)} protected existing source(s) skipped')


if __name__ == '__main__':
    main()
