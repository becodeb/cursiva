"""Minimal dependency-free PNG read/write plus the raster ops the art pipeline
needs.

Why hand-rolled: this host has no Pillow, no ImageMagick and no potrace (see
`build_art.py` header). Everything here is 8-bit, non-interlaced PNG only,
which is what every source asset happens to be. Anything else raises rather
than guessing.

All averaging is done on PREMULTIPLIED alpha. Averaging straight RGBA against
fully transparent pixels (whose RGB is arbitrary, usually black) pulls a dark
fringe around every shape -- the classic halo. Premultiply, average, then
unpremultiply.
"""

from __future__ import annotations

import struct
import zlib
from collections import deque


class Image:
    """8-bit RGBA raster. `px` is a bytearray of w*h*4, row-major."""

    __slots__ = ('w', 'h', 'px')

    def __init__(self, w: int, h: int, px: bytearray | None = None):
        self.w = w
        self.h = h
        self.px = px if px is not None else bytearray(w * h * 4)

    def copy(self) -> 'Image':
        return Image(self.w, self.h, bytearray(self.px))


def _unfilter(raw: bytes, w: int, h: int, bpp: int) -> bytearray:
    stride = w * bpp
    out = bytearray(stride * h)
    prev = bytearray(stride)
    i = 0
    o = 0
    for _ in range(h):
        ftype = raw[i]
        i += 1
        line = bytearray(raw[i:i + stride])
        i += stride
        if ftype == 0:
            pass
        elif ftype == 1:
            for x in range(bpp, stride):
                line[x] = (line[x] + line[x - bpp]) & 0xFF
        elif ftype == 2:
            for x in range(stride):
                line[x] = (line[x] + prev[x]) & 0xFF
        elif ftype == 3:
            for x in range(bpp):
                line[x] = (line[x] + (prev[x] >> 1)) & 0xFF
            for x in range(bpp, stride):
                line[x] = (line[x] + ((line[x - bpp] + prev[x]) >> 1)) & 0xFF
        elif ftype == 4:
            for x in range(stride):
                a = line[x - bpp] if x >= bpp else 0
                b = prev[x]
                c = prev[x - bpp] if x >= bpp else 0
                pa = abs(b - c)
                pb = abs(a - c)
                pc = abs(a + b - 2 * c)
                pr = a if (pa <= pb and pa <= pc) else (b if pb <= pc else c)
                line[x] = (line[x] + pr) & 0xFF
        else:
            raise ValueError(f'unknown PNG filter type {ftype}')
        out[o:o + stride] = line
        o += stride
        prev = line
    return out


def read_png(path: str) -> Image:
    data = open(path, 'rb').read()
    if data[:8] != b'\x89PNG\r\n\x1a\n':
        raise ValueError(f'{path}: not a PNG')
    pos = 8
    idat = bytearray()
    w = h = depth = ctype = interlace = None
    palette = None
    trns = None
    while pos < len(data):
        (length,) = struct.unpack('>I', data[pos:pos + 4])
        ctag = data[pos + 4:pos + 8]
        chunk = data[pos + 8:pos + 8 + length]
        if ctag == b'IHDR':
            w, h, depth, ctype, _comp, _filt, interlace = struct.unpack('>IIBBBBB', chunk[:13])
        elif ctag == b'PLTE':
            palette = chunk
        elif ctag == b'tRNS':
            trns = chunk
        elif ctag == b'IDAT':
            idat += chunk
        elif ctag == b'IEND':
            break
        pos += 12 + length
    if depth != 8:
        raise ValueError(f'{path}: only 8-bit PNGs supported, got depth {depth}')
    if interlace:
        raise ValueError(f'{path}: interlaced PNGs not supported')

    bpp = {0: 1, 2: 3, 3: 1, 4: 2, 6: 4}.get(ctype)
    if bpp is None:
        raise ValueError(f'{path}: unsupported colour type {ctype}')
    rows = _unfilter(zlib.decompress(bytes(idat)), w, h, bpp)

    if ctype == 6:
        return Image(w, h, bytearray(rows))

    n = w * h
    out = bytearray(n * 4)
    if ctype == 2:
        for i in range(n):
            s = i * 3
            d = i * 4
            out[d:d + 3] = rows[s:s + 3]
            out[d + 3] = 255
    elif ctype == 0:
        for i in range(n):
            g = rows[i]
            d = i * 4
            out[d] = out[d + 1] = out[d + 2] = g
            out[d + 3] = 255
    elif ctype == 4:
        for i in range(n):
            g = rows[i * 2]
            d = i * 4
            out[d] = out[d + 1] = out[d + 2] = g
            out[d + 3] = rows[i * 2 + 1]
    elif ctype == 3:
        if palette is None:
            raise ValueError(f'{path}: indexed PNG with no PLTE')
        for i in range(n):
            idx = rows[i]
            s = idx * 3
            d = i * 4
            out[d:d + 3] = palette[s:s + 3]
            out[d + 3] = trns[idx] if (trns and idx < len(trns)) else 255
    return Image(w, h, out)


def _best_filter_row(line: bytes, prev: bytes, bpp: int) -> tuple[int, bytearray]:
    """Pick the filter whose output has the smallest sum of absolute signed
    bytes -- the standard heuristic, and the reason these files land far
    smaller than filter-0 rows would."""
    stride = len(line)
    cands = []

    none = bytearray(line)
    cands.append((0, none))

    sub = bytearray(line)
    for x in range(stride - 1, bpp - 1, -1):
        sub[x] = (line[x] - line[x - bpp]) & 0xFF
    cands.append((1, sub))

    up = bytearray((line[x] - prev[x]) & 0xFF for x in range(stride))
    cands.append((2, up))

    avg = bytearray(stride)
    for x in range(stride):
        a = line[x - bpp] if x >= bpp else 0
        avg[x] = (line[x] - ((a + prev[x]) >> 1)) & 0xFF
    cands.append((3, avg))

    pae = bytearray(stride)
    for x in range(stride):
        a = line[x - bpp] if x >= bpp else 0
        b = prev[x]
        c = prev[x - bpp] if x >= bpp else 0
        pa = abs(b - c)
        pb = abs(a - c)
        pc = abs(a + b - 2 * c)
        pr = a if (pa <= pb and pa <= pc) else (b if pb <= pc else c)
        pae[x] = (line[x] - pr) & 0xFF
    cands.append((4, pae))

    def cost(buf: bytearray) -> int:
        return sum(v if v < 128 else 256 - v for v in buf)

    return min(cands, key=lambda kv: cost(kv[1]))


def write_png(path: str, img: Image) -> int:
    stride = img.w * 4
    body = bytearray()
    prev = bytes(stride)
    for y in range(img.h):
        line = bytes(img.px[y * stride:(y + 1) * stride])
        ftype, filtered = _best_filter_row(line, prev, 4)
        body.append(ftype)
        body += filtered
        prev = line

    def chunk(tag: bytes, payload: bytes) -> bytes:
        return (
            struct.pack('>I', len(payload))
            + tag
            + payload
            + struct.pack('>I', zlib.crc32(tag + payload) & 0xFFFFFFFF)
        )

    ihdr = struct.pack('>IIBBBBB', img.w, img.h, 8, 6, 0, 0, 0)
    out = (
        b'\x89PNG\r\n\x1a\n'
        + chunk(b'IHDR', ihdr)
        + chunk(b'IDAT', zlib.compress(bytes(body), 9))
        + chunk(b'IEND', b'')
    )
    open(path, 'wb').write(out)
    return len(out)


def alpha_bbox(img: Image, thresh: int = 8) -> tuple[int, int, int, int]:
    """Tight box around everything at least `thresh` opaque."""
    px = img.px
    w, h = img.w, img.h
    x0, y0, x1, y1 = w, h, -1, -1
    for y in range(h):
        base = y * w * 4
        row_hit = False
        for x in range(w):
            if px[base + x * 4 + 3] >= thresh:
                if x < x0:
                    x0 = x
                if x > x1:
                    x1 = x
                row_hit = True
        if row_hit:
            if y < y0:
                y0 = y
            y1 = y
    if x1 < 0:
        raise ValueError('image is fully transparent')
    return x0, y0, x1 + 1, y1 + 1


def crop(img: Image, x0: int, y0: int, x1: int, y1: int) -> Image:
    w = x1 - x0
    h = y1 - y0
    out = bytearray(w * h * 4)
    src_stride = img.w * 4
    dst_stride = w * 4
    for y in range(h):
        s = (y0 + y) * src_stride + x0 * 4
        d = y * dst_stride
        out[d:d + dst_stride] = img.px[s:s + dst_stride]
    return Image(w, h, out)


def pad_to_square(img: Image) -> Image:
    """Centre the art in a square so a caller can scale by one factor and keep
    the drawing's own proportions."""
    side = max(img.w, img.h)
    out = Image(side, side)
    ox = (side - img.w) // 2
    oy = (side - img.h) // 2
    for y in range(img.h):
        s = y * img.w * 4
        d = ((oy + y) * side + ox) * 4
        out.px[d:d + img.w * 4] = img.px[s:s + img.w * 4]
    return out


def box_resize(img: Image, tw: int, th: int) -> Image:
    """Area-average downscale on premultiplied alpha."""
    sw, sh = img.w, img.h
    if (sw, sh) == (tw, th):
        return img.copy()
    src = img.px
    out = Image(tw, th)
    dst = out.px
    xs = [(x * sw) // tw for x in range(tw + 1)]
    ys = [(y * sh) // th for y in range(th + 1)]
    for x in range(tw):
        if xs[x + 1] <= xs[x]:
            xs[x + 1] = xs[x] + 1
    for y in range(th):
        if ys[y + 1] <= ys[y]:
            ys[y + 1] = ys[y] + 1
    for ty in range(th):
        sy0, sy1 = ys[ty], min(ys[ty + 1], sh)
        for tx in range(tw):
            sx0, sx1 = xs[tx], min(xs[tx + 1], sw)
            ar = ag = ab = aa = 0
            n = 0
            for yy in range(sy0, sy1):
                base = yy * sw * 4
                for xx in range(sx0, sx1):
                    i = base + xx * 4
                    a = src[i + 3]
                    ar += src[i] * a
                    ag += src[i + 1] * a
                    ab += src[i + 2] * a
                    aa += a
                    n += 1
            d = (ty * tw + tx) * 4
            if aa == 0 or n == 0:
                dst[d] = dst[d + 1] = dst[d + 2] = dst[d + 3] = 0
            else:
                dst[d] = min(255, ar // aa)
                dst[d + 1] = min(255, ag // aa)
                dst[d + 2] = min(255, ab // aa)
                dst[d + 3] = min(255, aa // n)
    return out


def components(img: Image, thresh: int = 128, scale: int = 4):
    """Label 4-connected opaque blobs and return their full-resolution boxes.

    Labelling runs on an alpha mask downscaled by `scale`: a 1254px tile is
    1.5M pixels and a pure-Python flood fill over that is minutes, while the
    same fill over the 313px mask is instant and the boxes come back accurate
    to `scale` pixels -- which then get re-tightened at full resolution by the
    caller's `alpha_bbox`.

    Blobs touching the mask border are dropped: a scatter tile cuts its edge
    shapes in half, and half a grass tuft is not a grass tuft.
    """
    mw, mh = max(1, img.w // scale), max(1, img.h // scale)
    mask = bytearray(mw * mh)
    px = img.px
    for my in range(mh):
        for mx in range(mw):
            i = ((my * scale) * img.w + (mx * scale)) * 4
            mask[my * mw + mx] = 1 if px[i + 3] >= thresh else 0

    seen = bytearray(mw * mh)
    found = []
    for sy in range(mh):
        for sx in range(mw):
            si = sy * mw + sx
            if not mask[si] or seen[si]:
                continue
            q = deque([(sx, sy)])
            seen[si] = 1
            x0 = x1 = sx
            y0 = y1 = sy
            area = 0
            touches_border = False
            while q:
                cx, cy = q.popleft()
                area += 1
                if cx == 0 or cy == 0 or cx == mw - 1 or cy == mh - 1:
                    touches_border = True
                if cx < x0:
                    x0 = cx
                if cx > x1:
                    x1 = cx
                if cy < y0:
                    y0 = cy
                if cy > y1:
                    y1 = cy
                for nx, ny in ((cx - 1, cy), (cx + 1, cy), (cx, cy - 1), (cx, cy + 1)):
                    if 0 <= nx < mw and 0 <= ny < mh:
                        ni = ny * mw + nx
                        if mask[ni] and not seen[ni]:
                            seen[ni] = 1
                            q.append((nx, ny))
            if touches_border:
                continue
            found.append({
                'area': area * scale * scale,
                'box': (
                    max(0, x0 * scale - scale),
                    max(0, y0 * scale - scale),
                    min(img.w, (x1 + 2) * scale),
                    min(img.h, (y1 + 2) * scale),
                ),
            })
    found.sort(key=lambda c: -c['area'])
    return found
