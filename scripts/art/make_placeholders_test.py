import importlib.util
import pathlib
import sys
import tempfile
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[2]
MODULE_PATH = ROOT / "scripts" / "art" / "make_placeholders.py"
spec = importlib.util.spec_from_file_location("make_placeholders", MODULE_PATH)
make_placeholders = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = make_placeholders
assert spec.loader is not None
spec.loader.exec_module(make_placeholders)


class PlaceholderProtectionTest(unittest.TestCase):
    def test_existing_authored_source_is_not_overwritten(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            src = pathlib.Path(tmp)
            before = {}
            for spec in make_placeholders.PLACEHOLDERS:
                path = src / spec.name
                path.write_bytes(f"approved {spec.name}".encode())
                before[spec.name] = path.read_bytes()

            plan = make_placeholders.write_placeholders(str(src))

            for spec in make_placeholders.PLACEHOLDERS:
                self.assertEqual((src / spec.name).read_bytes(), before[spec.name])
            self.assertEqual(set(plan.skipped), {spec.name for spec in make_placeholders.PLACEHOLDERS})
            self.assertEqual(plan.created, [])

    def test_dry_run_reports_missing_sources_without_writing(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            src = pathlib.Path(tmp) / "missing-art-source"

            plan = make_placeholders.write_placeholders(str(src), dry_run=True)

            self.assertIn("fondo sendero.png", plan.created)
            self.assertFalse(src.exists())



if __name__ == "__main__":
    unittest.main()