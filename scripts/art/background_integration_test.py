import json
import unittest
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[2]
PUBLIC = ROOT / "client" / "public"

BACKGROUNDS = {
    "sector-sand-background": "fondo arena.png",
    "sector-monkeys-background": "fondo recinto monos.png",
}


class BackgroundIntegrationTest(unittest.TestCase):
    def test_approved_sources_are_exported_pixel_identically(self):
        manifest = json.loads((PUBLIC / "art" / "manifest.json").read_text())

        for key, source_name in BACKGROUNDS.items():
            with self.subTest(key=key):
                entry = manifest[key]
                source = Image.open(ROOT / "art-source" / source_name).convert("RGBA")
                exported_path = PUBLIC / entry["file"]
                exported = Image.open(exported_path).convert("RGBA")

                self.assertEqual((entry["w"], entry["h"]), source.size)
                self.assertEqual(exported.size, source.size)
                self.assertEqual(entry["bytes"], exported_path.stat().st_size)
                self.assertEqual(exported.tobytes(), source.tobytes())


if __name__ == "__main__":
    unittest.main()
