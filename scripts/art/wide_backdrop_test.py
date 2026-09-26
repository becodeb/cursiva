"""T22 (`odd/tasks/prewriting-stage-completion.md`, "Wide backgrounds"): proves
the art pipeline already accepts a 2:1 (2048x1024) background end to end,
instead of assuming every full-canvas scene is 1536x1024.

`sample_corridor_band` and `emit_opaque_canvas` (`build_art.py`) both read the
image's OWN `w`/`h` at runtime (`img.w`, never a hardcoded 1536) and the
corridor band is a ROW range, which depends only on HEIGHT — a 2048-wide
canvas needs no code change on either path. This file is the falsifiable
proof: a synthetic 2:1 fixture, generated here (never written under
`art-source/` or `client/public/art/` — this task ships no new/changed PNG),
round-tripped through the real `png.read_png`/`write_png`, with a marker pixel
placed past column 1536 so a hardcoded-width regression would silently miss it
and fail this test.
"""
from __future__ import annotations

import importlib.util
import pathlib
import sys
import tempfile
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[2]
MODULE_PATH = ROOT / "scripts" / "art" / "build_art.py"
spec = importlib.util.spec_from_file_location("build_art", MODULE_PATH)
build_art = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = build_art
assert spec.loader is not None
spec.loader.exec_module(build_art)

png = build_art.png


def make_wide_fixture(w: int = 2048, h: int = 1024) -> "png.Image":
    """A fully opaque `w x h` canvas: a uniform quiet colour everywhere,
    except one distinctive BRIGHT marker pixel placed past column 1536 (only
    reachable at all on a 2:1 canvas) inside the sampled band, and one darker
    band near the top/bottom edges (outside the sampled band) so the fixture
    is not suspiciously flat end to end.
    """
    img = png.Image(w, h)
    quiet = (120, 130, 140, 255)
    edge = (40, 45, 50, 255)
    for y in range(h):
        row = y * w * 4
        colour = edge if y < 40 or y >= h - 40 else quiet
        for x in range(w):
            i = row + x * 4
            img.px[i:i + 4] = bytes(colour)
    # The marker: brighter than `quiet`, at x=2000 — past the old hardcoded
    # 1536 width, inside the sampled band (well within [40, h - 40]).
    marker_x, marker_y = 2000, h // 2
    marker = (250, 250, 250, 255)
    i = (marker_y * w + marker_x) * 4
    img.px[i:i + 4] = bytes(marker)
    return img, quiet, marker


class WideBackdropFixtureTest(unittest.TestCase):
    def test_sample_corridor_band_scans_the_full_2048_width(self) -> None:
        img, quiet, marker = make_wide_fixture()
        top, bottom = 40, img.h - 41
        quiet_hex, brightest_hex = build_art.sample_corridor_band(img, top, bottom)
        self.assertEqual(quiet_hex, '#%02x%02x%02x' % quiet[:3])
        # The marker at x=2000 is only found if the row scan actually walks
        # the image's OWN width (2048), not a hardcoded 1536 — the concrete
        # regression this test guards against.
        self.assertEqual(brightest_hex, '#%02x%02x%02x' % marker[:3])

    def test_sample_corridor_band_ignores_rows_outside_the_band(self) -> None:
        # A brighter pixel OUTSIDE [top, bottom] must never win `brightest` —
        # proves the row bound, not just the column one, still holds at this
        # size.
        img, quiet, _marker = make_wide_fixture()
        outside_bright = (255, 255, 255, 255)
        i = (5 * img.w + 10) * 4
        img.px[i:i + 4] = bytes(outside_bright)
        top, bottom = 40, img.h - 41
        _quiet_hex, brightest_hex = build_art.sample_corridor_band(img, top, bottom)
        self.assertNotEqual(brightest_hex, '#ffffff')

    def test_round_trips_through_the_real_png_read_write_at_2048_wide(self) -> None:
        img, _quiet, marker = make_wide_fixture()
        with tempfile.TemporaryDirectory() as tmp:
            # A tmp dir, never `art-source/` or `client/public/art/` — this
            # task ships no new/changed PNG (`odd/tasks/prewriting-stage-
            # completion.md`, T22's own instruction).
            path = str(pathlib.Path(tmp) / 'wide-fixture.png')
            size = png.write_png(path, img)
            self.assertGreater(size, 0)
            back = png.read_png(path)
            self.assertEqual((back.w, back.h), (2048, 1024))
            marker_x, marker_y = 2000, back.h // 2
            i = (marker_y * back.w + marker_x) * 4
            self.assertEqual(tuple(back.px[i:i + 4]), marker)

    def test_emit_opaque_canvas_records_the_wide_size_in_the_manifest_entry(self) -> None:
        # `emit_opaque_canvas` writes under the module's own `OUT` constant —
        # monkeypatched to a tmp dir for this call only, so nothing lands
        # under the real `client/public/art/` (this task ships no new PNG).
        img, _quiet, _marker = make_wide_fixture()
        original_out = build_art.OUT
        try:
            with tempfile.TemporaryDirectory() as tmp:
                build_art.OUT = tmp
                entry = build_art.emit_opaque_canvas('wide-fixture.png', img, 2048, 1024)
        finally:
            build_art.OUT = original_out
        # The manifest entry's own `w`/`h` are read off the REAL image, not a
        # hardcoded 1536x1024 — this is what lets `zoo/backdrops.ts`'s
        # `AdventureBackdrop.art` (and `zoo/sectors.ts`'s `imageToViewBox`/
        # `viewBoxToImage`) read a wide backdrop's true aspect from the
        # manifest instead of assuming the map's own size.
        self.assertEqual((entry['w'], entry['h']), (2048, 1024))

    def test_emit_opaque_canvas_rejects_a_size_mismatch_at_2048_wide_too(self) -> None:
        # The pipeline's own opacity/size guard (`docs/17` Pedido 3) still
        # applies at the new size: declaring 2048x1024 but shipping something
        # else is rejected, not silently accepted.
        img, _quiet, _marker = make_wide_fixture(w=2000, h=1024)
        original_out = build_art.OUT
        try:
            with tempfile.TemporaryDirectory() as tmp:
                build_art.OUT = tmp
                with self.assertRaises(SystemExit):
                    build_art.emit_opaque_canvas('wide-fixture.png', img, 2048, 1024)
        finally:
            build_art.OUT = original_out


if __name__ == '__main__':
    unittest.main()
