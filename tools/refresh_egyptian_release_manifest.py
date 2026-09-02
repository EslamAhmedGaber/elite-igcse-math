"""Refresh the staged Egyptian Baccalaureate manifest after card rendering.

The PDF build is intentionally separate from question-card rendering.  This
small release step records the final JSON/JS/card inventory without rebuilding
or touching the approved source PDFs.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path


DEFAULT_STAGE = Path(r"D:\Tyro4_Latex\البكالوريا المصرية 2026_STUDIO_DESIGN\website_release_staging_20260902")
DATA_REL = Path("data/EgyptianBaccalaureate/2026/English")
ASSET_REL = Path("assets/questions/EgyptianBaccalaureate/2026/English")
MANIFEST_REL = Path("downloads/EgyptianBaccalaureate/2026/English/manifest.json")


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def tree_hash(paths: list[Path], root: Path) -> str:
    digest = hashlib.sha256()
    for path in sorted(paths):
        digest.update(path.relative_to(root).as_posix().encode("utf-8"))
        digest.update(b"\0")
        digest.update(sha256(path).encode("ascii"))
        digest.update(b"\n")
    return digest.hexdigest()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--stage-root", type=Path, default=DEFAULT_STAGE)
    args = parser.parse_args()
    stage = args.stage_root.resolve()
    manifest_path = stage / MANIFEST_REL
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    # Keep the public manifest focused on downloads and browser resources.
    # Production exclusions and audit/process notes belong in the private
    # release plan, not in the student-facing website payload.
    manifest.pop("diagram_guide_uploaded", None)
    manifest.pop("excluded_artifacts", None)
    # PDF text cleanup and targeted figure repairs happen after the initial
    # staging copy.  Recompute every public file fingerprint here so the
    # promoted manifest always describes the exact downloadable bytes.
    from pypdf import PdfReader  # type: ignore

    for item in manifest.get("files", []):
        pdf_path = stage / item["path"]
        if not pdf_path.exists():
            raise FileNotFoundError(pdf_path)
        reader = PdfReader(str(pdf_path), strict=False)
        first_page = reader.pages[0] if reader.pages else None
        item["bytes"] = pdf_path.stat().st_size
        item["sha256"] = sha256(pdf_path)
        item["pages"] = len(reader.pages)
        item["media_box_pt"] = (
            [round(float(first_page.mediabox.width), 2), round(float(first_page.mediabox.height), 2)]
            if first_page is not None
            else None
        )
        item["public"] = True
    data_root = stage / DATA_REL
    question_path = data_root / "questions.json"
    solution_path = data_root / "solutions.json"
    runtime_path = data_root / "baccalaureate-data.js"
    questions = json.loads(question_path.read_text(encoding="utf-8"))
    solutions = json.loads(solution_path.read_text(encoding="utf-8"))
    manifest["question_bank"] = {
        "path": question_path.relative_to(stage).as_posix(),
        "solutions_path": solution_path.relative_to(stage).as_posix(),
        "runtime_path": runtime_path.relative_to(stage).as_posix(),
        "record_count": len(questions.get("records", [])),
        "solution_count": len(solutions.get("records", {})),
        "format_counts": questions.get("format_counts", {}),
        "sha256": sha256(question_path),
        "solutions_sha256": sha256(solution_path),
        "runtime_sha256": sha256(runtime_path),
        "public": True,
    }
    cards = sorted((stage / ASSET_REL / "cards").glob("*.png"))
    card_manifest_path = stage / ASSET_REL / "cards" / "manifest.json"
    card_rows = []
    for path in cards:
        card_rows.append({
            "id": path.stem,
            "path": path.relative_to(stage).as_posix(),
            "bytes": path.stat().st_size,
            "sha256": sha256(path),
        })
    card_manifest_path.write_text(json.dumps({
        "schema_version": "egyptian-baccalaureate-question-cards-1.0",
        "public": True,
        "count": len(card_rows),
        "dpi": questions.get("records", [{}])[0].get("image_dpi") if questions.get("records") else None,
        "cards": card_rows,
    }, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    manifest["question_cards"] = {
        "root": (ASSET_REL / "cards").as_posix(),
        "manifest": card_manifest_path.relative_to(stage).as_posix(),
        "count": len(cards),
        "total_bytes": sum(path.stat().st_size for path in cards),
        "tree_sha256": tree_hash(cards, stage) if cards else None,
        "dpi": questions.get("records", [{}])[0].get("image_dpi") if questions.get("records") else None,
        "public": True,
    }
    visual_manifest = stage / ASSET_REL / "manifest.json"
    if visual_manifest.exists():
        visual_data = json.loads(visual_manifest.read_text(encoding="utf-8"))
        manifest["visual_assets"] = {
            "policy": "selected diagrams only; no page-by-page render duplication",
            "count": len(visual_data.get("assets", [])),
            "manifest": visual_manifest.relative_to(stage).as_posix(),
            "sha256": sha256(visual_manifest),
            "public": True,
        }
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"pdfs": len(manifest.get("files", [])), "questions": len(questions.get("records", [])), "cards": len(cards), "visual_assets": manifest.get("visual_assets", {}).get("count", 0)}, ensure_ascii=True))


if __name__ == "__main__":
    main()
