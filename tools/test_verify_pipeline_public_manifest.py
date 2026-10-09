from __future__ import annotations

import hashlib
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path


SCRIPT = Path(__file__).with_name("verify_pipeline.py")
SPEC = importlib.util.spec_from_file_location("elite_verify_pipeline", SCRIPT)
assert SPEC and SPEC.loader
VERIFY = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(VERIFY)


class PublicManifestTests(unittest.TestCase):
    def test_only_matching_manifest_files_inside_release_are_approved(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            rel = "downloads/EgyptianBaccalaureate/2026/English/Student/c01/solutions.pdf"
            file = root / rel
            file.parent.mkdir(parents=True)
            content = b"approved public student solutions"
            file.write_bytes(content)
            manifest = {
                "public": True,
                "files": [{"path": rel, "public": True, "bytes": len(content), "sha256": hashlib.sha256(content).hexdigest()}],
            }
            manifest_path = root / "downloads/EgyptianBaccalaureate/2026/English/manifest.json"
            manifest_path.parent.mkdir(parents=True, exist_ok=True)
            manifest_path.write_text(json.dumps(manifest), encoding="utf-8")

            approved, errors = VERIFY.manifest_approved_public_files(root)
            self.assertEqual(approved, {rel})
            self.assertEqual(errors, [])

    def test_checksum_mismatch_is_not_approved(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            rel = "downloads/EgyptianBaccalaureate/2026/English/Student/c01/solutions.pdf"
            file = root / rel
            file.parent.mkdir(parents=True)
            file.write_bytes(b"changed")
            manifest = {
                "public": True,
                "files": [{"path": rel, "public": True, "bytes": 3, "sha256": "0" * 64}],
            }
            manifest_path = root / "downloads/EgyptianBaccalaureate/2026/English/manifest.json"
            manifest_path.parent.mkdir(parents=True, exist_ok=True)
            manifest_path.write_text(json.dumps(manifest), encoding="utf-8")

            approved, errors = VERIFY.manifest_approved_public_files(root)
            self.assertEqual(approved, set())
            self.assertIn(rel, errors[0])

    def test_path_traversal_is_not_approved(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            rel = "downloads/EgyptianBaccalaureate/2026/English/Student/../../../../outside/solutions.pdf"
            manifest = {"public": True, "files": [{"path": rel, "public": True}]}
            manifest_path = root / "downloads/EgyptianBaccalaureate/2026/English/manifest.json"
            manifest_path.parent.mkdir(parents=True)
            manifest_path.write_text(json.dumps(manifest), encoding="utf-8")

            approved, errors = VERIFY.manifest_approved_public_files(root)
            self.assertEqual(approved, set())
            self.assertTrue(errors)

    def test_non_public_entry_is_ignored(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            rel = "downloads/EgyptianBaccalaureate/2026/English/Student/c01/solutions.pdf"
            manifest = {"public": True, "files": [{"path": rel, "public": False}]}
            manifest_path = root / "downloads/EgyptianBaccalaureate/2026/English/manifest.json"
            manifest_path.parent.mkdir(parents=True)
            manifest_path.write_text(json.dumps(manifest), encoding="utf-8")

            approved, errors = VERIFY.manifest_approved_public_files(root)
            self.assertEqual(approved, set())
            self.assertEqual(errors, [])


if __name__ == "__main__":
    unittest.main()
