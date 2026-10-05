#!/usr/bin/env python3
"""Cut the round-2 character sheets ("láminas") into one source PNG per pose.

Run: `python3 scripts/art/crop_sheets.py`  (no dependencies, no network)

`docs/23` §0 point 7 asks ChatGPT to save every sheet WHOLE, so that the
session wiring them (T49, `odd/tasks/prewriting-stage-completion.md`) cuts
every pose with the same rule. This is that rule, kept as a script so the
cut is reproducible and reviewable instead of a one-off edit. It writes NEW
files next to the sheets in `art-source/` (`docs/23` §7 point 4 names them)
and never overwrites an authored source; `build_art.py` then treats the
crops like any other source.

Two kinds of output:

* TIGHT crops: one object, cropped to itself (`abeja v2.png`, `pulpo
  senala.png`, ...). The pipeline's own alpha-bbox crop would undo any
  margin anyway, so none is added.
* FRAMED crops: every pose of a sheet on one shared transparent canvas (the
  union of the poses' sizes), centred horizontally, with its LOWEST pixel on
  the canvas bottom -- "los pies a la misma altura" (`docs/23` §7 point 4).
  `build_art.py`'s `FRAMED` rows keep that canvas instead of re-cropping it,
  so every pose of a family ships at the same box and the same scale: a
  sitting monkey stays shorter than a standing one, and the two Pulpitos
  (with and without the magnifier) can replace each other in place.

The octopus pair (`pulpo lupa lamina.png`, `docs/23` D6) needs one more step:
the two poses must sit on the SAME canvas position, not merely on the same
canvas size, or the swap on touch jumps. `align_offset` measures the shift
that best overlays the lens-less pose on the lens pose (body only, the lens
area excluded) and the frame is built around that alignment.

Every crop drops stray marks that are not part of the pose (another pose's
glow, a neighbour's tail, the motion lines around the flapping duckling) by
keeping only the largest opaque blob plus a two-pixel antialiasing ring, and
clears the faint (alpha <= 8) export haze the same way `build_art.py`'s
`clear_ghost_alpha` does.
"""

from __future__ import annotations

import os
import sys
from collections import deque

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import png  # noqa: E402

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SRC = os.path.join(ROOT, 'art-source')

# A pose is everything 4-connected to its largest blob at this alpha.
BLOB_ALPHA = 40
# Antialiasing kept around the blob, in pixels.
EDGE_RING = 2
# The export haze cleared outright (`build_art.py`'s `clear_ghost_alpha`).
HAZE_ALPHA = 8


def isolate(img: png.Image) -> png.Image:
    """Keep the largest blob plus an `EDGE_RING` px ring; clear the rest."""
    w, h = img.w, img.h
    px = img.px
    seen = bytearray(w * h)
    best: list[int] = []
    for start in range(w * h):
        if seen[start] or px[start * 4 + 3] < BLOB_ALPHA:
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
                    if not seen[ni] and px[ni * 4 + 3] >= BLOB_ALPHA:
                        seen[ni] = 1
                        queue.append(ni)
                        blob.append(ni)
        if len(blob) > len(best):
            best = blob
    keep = bytearray(w * h)
    for ci in best:
        keep[ci] = 1
    for _ in range(EDGE_RING):
        grown = bytearray(keep)
        for ci in range(w * h):
            if keep[ci]:
                continue
            cy, cx = divmod(ci, w)
            if ((cx > 0 and keep[ci - 1]) or (cx < w - 1 and keep[ci + 1])
                    or (cy > 0 and keep[ci - w]) or (cy < h - 1 and keep[ci + w])):
                grown[ci] = 1
        keep = grown
    out = img.copy()
    for ci in range(w * h):
        if not keep[ci] or out.px[ci * 4 + 3] <= HAZE_ALPHA:
            out.px[ci * 4:ci * 4 + 4] = b'\x00\x00\x00\x00'
    return out


def pose_crops(sheet: png.Image, count: int) -> list[png.Image]:
    """The `count` largest poses, left to right, each tight and isolated."""
    blobs = png.components(sheet, thresh=128, scale=2)[:count]
    if len(blobs) < count:
        raise SystemExit(f'wanted {count} poses, found {len(blobs)}')
    blobs.sort(key=lambda b: b['box'][0])
    out = []
    for blob in blobs:
        x0, y0, x1, y1 = blob['box']
        pad = 8
        x0, y0 = max(0, x0 - pad), max(0, y0 - pad)
        x1, y1 = min(sheet.w, x1 + pad), min(sheet.h, y1 + pad)
        piece = isolate(png.crop(sheet, x0, y0, x1, y1))
        bx0, by0, bx1, by1 = png.alpha_bbox(piece)
        out.append(png.crop(piece, bx0, by0, bx1, by1))
    return out


def paste(canvas: png.Image, img: png.Image, ox: int, oy: int) -> None:
    for y in range(img.h):
        cy = oy + y
        if not 0 <= cy < canvas.h:
            continue
        for x in range(img.w):
            cx = ox + x
            if not 0 <= cx < canvas.w:
                continue
            s = (y * img.w + x) * 4
            if img.px[s + 3] == 0:
                continue
            d = (cy * canvas.w + cx) * 4
            canvas.px[d:d + 4] = img.px[s:s + 4]


def framed(poses: list[png.Image]) -> list[png.Image]:
    """Every pose on one shared canvas, centred, feet on the bottom edge."""
    fw = max(p.w for p in poses)
    fh = max(p.h for p in poses)
    out = []
    for p in poses:
        canvas = png.Image(fw, fh)
        paste(canvas, p, (fw - p.w) // 2, fh - p.h)
        out.append(canvas)
    return out


def mask_at(img: png.Image, x: int, y: int) -> int:
    if 0 <= x < img.w and 0 <= y < img.h:
        return 1 if img.px[(y * img.w + x) * 4 + 3] >= 128 else 0
    return 0


def align_offset(a: png.Image, b: png.Image, ignore: tuple[int, int, int, int]) -> tuple[int, int, int]:
    """The (dx, dy) placing `b` over `a` with the fewest mismatched opaque
    pixels, outside `ignore` (a box in `a`'s space: the magnifier). Coarse
    search on every 4th pixel, then a +-3 px refinement on every pixel.
    Returns (dx, dy, mismatches)."""
    ix0, iy0, ix1, iy1 = ignore

    def cost(dx: int, dy: int, step: int) -> int:
        n = 0
        for y in range(0, a.h, step):
            for x in range(0, a.w, step):
                if ix0 <= x < ix1 and iy0 <= y < iy1:
                    continue
                if mask_at(a, x, y) != mask_at(b, x - dx, y - dy):
                    n += 1
        return n

    base_dx = a.w - b.w  # both poses are right-aligned candidates to start
    best = None
    for dx in range(base_dx - 40, base_dx + 41, 4):
        for dy in range(-24, 25, 4):
            c = cost(dx, dy, 4)
            if best is None or c < best[2]:
                best = (dx, dy, c)
    assert best is not None
    cdx, cdy, _ = best
    best = None
    for dx in range(cdx - 3, cdx + 4):
        for dy in range(cdy - 3, cdy + 4):
            c = cost(dx, dy, 1)
            if best is None or c < best[2]:
                best = (dx, dy, c)
    assert best is not None
    return best


def write(name: str, img: png.Image) -> None:
    path = os.path.join(SRC, name)
    png.write_png(path, img)
    print(f'  {name:28s} {img.w}x{img.h}')


def main() -> None:
    # D4: pose 1 is the monkey of the rescue, map, notebook and deduction;
    # all three poses are the family collected along `monkey3`/`monkey4`.
    monkeys = pose_crops(png.read_png(os.path.join(SRC, 'monos lamina.png')), 3)
    write('mono v2.png', monkeys[0])
    for i, img in enumerate(framed(monkeys), start=1):
        write(f'mono familia {i}.png', img)

    # D5: the three ducklings collected along `duck-trail3`/`duck-trail4`.
    ducklings = pose_crops(png.read_png(os.path.join(SRC, 'patitos lamina.png')), 3)
    for i, img in enumerate(framed(ducklings), start=1):
        write(f'patito {i}.png', img)

    # D6: the octopus with and without the magnifier, on ONE aligned frame.
    with_lens, without_lens = pose_crops(png.read_png(os.path.join(SRC, 'pulpo lupa lamina.png')), 2)
    # The magnifier sits in the top-left of the lens pose: lens and handle
    # down to the gripping arm tip. Measured on the sheet (lens rim
    # x 104-262, y 144-300; the gripping tip reaches y ~385).
    lens_box = (0, 0, 250, 300)
    dx, dy, miss = align_offset(with_lens, without_lens, lens_box)
    print(f'  octopus pair aligned at dx={dx} dy={dy} ({miss} body pixels differ)')
    left = min(0, dx)
    top = min(0, dy)
    right = max(with_lens.w, dx + without_lens.w)
    bottom = max(with_lens.h, dy + without_lens.h)
    fw, fh = right - left, bottom - top
    a = png.Image(fw, fh)
    paste(a, with_lens, -left, -top)
    b = png.Image(fw, fh)
    paste(b, without_lens, dx - left, dy - top)
    write('pulpo con lupa v2.png', a)
    write('pulpo sin lupa.png', b)

    # D7: pointing (to the right), thinking, celebrating.
    points, thinks, cheers = pose_crops(png.read_png(os.path.join(SRC, 'pulpo poses lamina.png')), 3)
    write('pulpo senala.png', points)
    write('pulpo piensa.png', thinks)
    write('pulpo festeja.png', cheers)

    # D9: the bee, the flower and the honeycomb.
    bee, flower, comb = pose_crops(png.read_png(os.path.join(SRC, 'abeja lamina.png')), 3)
    write('abeja v2.png', bee)
    write('flor v2.png', flower)
    write('panal v2.png', comb)


if __name__ == '__main__':
    main()
