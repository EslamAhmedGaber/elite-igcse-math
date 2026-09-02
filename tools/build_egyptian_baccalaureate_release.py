"""Stage the public English Egyptian Baccalaureate release.

This script deliberately copies only approved PDFs and the small set of
question/diagram assets needed by the interactive test builder.  It never
copies the teacher Diagram Guide, QA contact sheets, TeX sources, or the
convenience duplicate folder from the studio output.
"""

from __future__ import annotations

import hashlib
import json
import re
import shutil
import argparse
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_STAGE_ROOT = Path(
    r"D:\Tyro4_Latex\البكالوريا المصرية 2026_STUDIO_DESIGN\website_release_staging_20260902"
)
STUDENT_SOURCE = Path(
    r"D:\Tyro4_Latex\البكالوريا المصرية 2026_STUDIO_DESIGN\Student Edition Rev5_20260902_FINAL_A4L_V2"
)
TEACHER_SOURCE = Path(
    r"D:\Tyro4_Latex\البكالوريا المصرية 2026_STUDIO_DESIGN\Teacher Edition Version 2 (B5 Landscape)_20260902"
)
OUTPUT_ROOT = DEFAULT_STAGE_ROOT
RELEASE_ROOT = OUTPUT_ROOT / "downloads" / "EgyptianBaccalaureate" / "2026" / "English"
DATA_ROOT = OUTPUT_ROOT / "data" / "EgyptianBaccalaureate" / "2026" / "English"
QUESTION_ASSET_ROOT = OUTPUT_ROOT / "assets" / "questions" / "EgyptianBaccalaureate" / "2026" / "English"
AUXILIARY_ASSET_ROOTS = [
    Path(r"D:\Tyro4_Latex\البكالوريا المصرية 2026_STUDIO_DESIGN\00_project\part1_visual_assets"),
]

CHAPTER_TITLES = {
    "C01": "Algebraic Proofs",
    "C02": "Sequences",
    "C03": "Complex Numbers and Equations",
    "C04": "Geometry and Equations",
    "C05": "Trigonometric Functions",
    "C06": "Exponents and Logarithms",
    "C07": "Differentiation and Integration",
    "C08": "Statistical Inference",
}


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def pdf_info(path: Path) -> tuple[int | None, list[float] | None]:
    """Return page count and first-page media box where pypdf is available."""
    try:
        from pypdf import PdfReader  # type: ignore

        reader = PdfReader(str(path), strict=False)
        pages = len(reader.pages)
        box = reader.pages[0].mediabox if pages else None
        media = [float(box.width), float(box.height)] if box else None
        return pages, media
    except Exception:
        return None, None


def copy_pdf(source: Path, destination: Path, *, edition: str, scope: str, item_id: str, title: str) -> dict[str, Any]:
    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source, destination)
    pages, media_box = pdf_info(destination)
    return {
        "edition": edition,
        "scope": scope,
        "id": item_id,
        "title": title,
        "path": destination.relative_to(OUTPUT_ROOT).as_posix(),
        "bytes": destination.stat().st_size,
        "sha256": sha256(destination),
        "pages": pages,
        "media_box_pt": media_box,
        "public": True,
    }


def concept_id_from_dir(path: Path) -> str | None:
    match = re.search(r"\b(C\d{2}-K\d{2})\b", path.name)
    return match.group(1) if match else None


def chapter_id_from_dir(path: Path) -> str | None:
    match = re.search(r"Chapter\s+(\d{2})", path.name, re.IGNORECASE)
    return f"C{match.group(1)}" if match else None


def stage_student(files: list[dict[str, Any]]) -> None:
    for pdf in STUDENT_SOURCE.glob("*.pdf"):
        name = pdf.name
        if name == "All_Chapters_cover.pdf":
            target = RELEASE_ROOT / "Student" / "covers" / "all-chapters.pdf"
            files.append(copy_pdf(pdf, target, edition="student", scope="cover", item_id="ALL", title="All Chapters — Student Edition"))
        elif name == "Part1_cover.pdf":
            target = RELEASE_ROOT / "Student" / "covers" / "part-1.pdf"
            files.append(copy_pdf(pdf, target, edition="student", scope="cover", item_id="PART1", title="Part 1 — Student Edition"))
        elif name == "Part2_cover.pdf":
            target = RELEASE_ROOT / "Student" / "covers" / "part-2.pdf"
            files.append(copy_pdf(pdf, target, edition="student", scope="cover", item_id="PART2", title="Part 2 — Student Edition"))
        elif "All_Chapters_Student_Rev5_Classified" in name:
            target = RELEASE_ROOT / "Student" / "complete" / "classified.pdf"
            files.append(copy_pdf(pdf, target, edition="student", scope="complete", item_id="ALL-CLASSIFIED", title="Complete Student Classified Book"))
        elif "All_Chapters_Student_Rev5_Solutions" in name:
            target = RELEASE_ROOT / "Student" / "complete" / "solutions.pdf"
            files.append(copy_pdf(pdf, target, edition="student", scope="complete", item_id="ALL-SOLUTIONS", title="Complete Student Solutions Book"))
        elif re.search(r"Part[12]_Student_Rev5_Classified", name):
            part = re.search(r"Part([12])", name).group(1)
            target = RELEASE_ROOT / "Student" / "parts" / f"part-{part}" / "classified.pdf"
            files.append(copy_pdf(pdf, target, edition="student", scope="part", item_id=f"PART{part}-CLASSIFIED", title=f"Part {part} — Student Classified Book"))
        elif re.search(r"Part[12]_Student_Rev5_Solutions", name):
            part = re.search(r"Part([12])", name).group(1)
            target = RELEASE_ROOT / "Student" / "parts" / f"part-{part}" / "solutions.pdf"
            files.append(copy_pdf(pdf, target, edition="student", scope="part", item_id=f"PART{part}-SOLUTIONS", title=f"Part {part} — Student Solutions Book"))

    for chapter_dir in sorted(STUDENT_SOURCE.glob("Chapter *")):
        chapter_id = chapter_id_from_dir(chapter_dir)
        if not chapter_id:
            continue
        title = CHAPTER_TITLES.get(chapter_id, chapter_id)
        for pdf in chapter_dir.glob(f"Egyptian_Baccalaureate_{chapter_id}_Student_Rev5_*.pdf"):
            kind = "solutions" if "Solutions" in pdf.name else "classified"
            target = RELEASE_ROOT / "Student" / "chapters" / chapter_id.lower() / f"{kind}.pdf"
            files.append(copy_pdf(pdf, target, edition="student", scope="chapter", item_id=f"{chapter_id}-{kind.upper()}", title=f"{chapter_id} — {title} — Student {kind.title()}"))
        for concept_dir in sorted(chapter_dir.glob("Concept *")):
            concept_id = concept_id_from_dir(concept_dir)
            if not concept_id:
                continue
            concept_title = re.sub(r"^.*?\bC\d{2}-K\d{2}\s*-\s*", "", concept_dir.name).replace("_", " ")
            for kind in ("classified", "solutions"):
                candidates = list((concept_dir / ("Classified" if kind == "classified" else "Solutions")).glob("*.pdf"))
                if not candidates:
                    continue
                target = RELEASE_ROOT / "Student" / "concepts" / concept_id.lower() / f"{kind}.pdf"
                files.append(copy_pdf(candidates[0], target, edition="student", scope="concept", item_id=f"{concept_id}-{kind.upper()}", title=f"{concept_id} — {concept_title} — Student {kind.title()}"))


def stage_teacher(files: list[dict[str, Any]]) -> None:
    # Diagram Guide is intentionally not traversed or copied.
    full = TEACHER_SOURCE / "Teachers_Egyptian_Baccalaureate_Mathematics_Chapters01-08_Version2_B5_Landscape.pdf"
    files.append(copy_pdf(full, RELEASE_ROOT / "Teacher" / "complete" / "teacher-b5-landscape.pdf", edition="teacher", scope="complete", item_id="ALL-TEACHER", title="Complete Teacher Classroom Working Edition"))

    part1 = TEACHER_SOURCE / "Part 1" / "Teachers_Egyptian_Baccalaureate_Mathematics_Part1_Classroom_Working_English_B5_Landscape_visual_scope_revision.pdf"
    files.append(copy_pdf(part1, RELEASE_ROOT / "Teacher" / "parts" / "part-1" / "teacher-b5-landscape.pdf", edition="teacher", scope="part", item_id="PART1-TEACHER", title="Part 1 — Teacher Classroom Working Edition"))

    for chapter_id, needle in {
        "C05": "Egyptian_Baccalaureate_Part2_C05_Teacher_B5_Landscape.pdf",
        "C06": "Egyptian_Baccalaureate_Part2_C06_Teacher_B5_Landscape.pdf",
        "C07": "Egyptian_Baccalaureate_Part2_Chapter07_Teacher_B5_Landscape.pdf",
        "C08": "Egyptian_Baccalaureate_Part2_Chapter08_Teacher_B5_Landscape.pdf",
    }.items():
        source = TEACHER_SOURCE / "Part 2" / needle
        files.append(copy_pdf(source, RELEASE_ROOT / "Teacher" / "chapters" / chapter_id.lower() / "teacher-b5-landscape.pdf", edition="teacher", scope="chapter", item_id=f"{chapter_id}-TEACHER", title=f"{chapter_id} — {CHAPTER_TITLES[chapter_id]} — Teacher Classroom Working Edition"))


def compact_question(record: dict[str, Any]) -> dict[str, Any]:
    def public_text(value: Any) -> Any:
        """Remove production-only provenance wording from public question copy."""
        if isinstance(value, str):
            # Source/provenance labels are useful in the private ledger but
            # are not student-facing instructions.  Remove the prefix while
            # preserving the actual mathematical noun (graph, demand, set…).
            return re.sub(r"\bsource\s+", "", value, flags=re.IGNORECASE)
        if isinstance(value, list):
            return [public_text(item) for item in value]
        return value

    question_format = record.get("question_format") or ("mcq" if record.get("options_en") else "written")
    marks = record.get("marks")
    if not isinstance(marks, int):
        # These curriculum workbook records are not exam mark-scheme records;
        # use a transparent builder default for timing/score estimates.
        marks = 1 if question_format == "mcq" else 2
    visual = record.get("visual_asset")
    visual_asset = None
    if isinstance(visual, dict):
        # Keep only the fields the browser needs to resolve a public figure.
        # Source-page lineage and hashes stay in the private production ledger.
        visual_asset = {k: visual.get(k) for k in ("asset_id", "method", "file") if visual.get(k) is not None}
    elif isinstance(visual, str):
        visual_asset = {"file": visual}
    return {
        "id": record.get("id"),
        "chapter_id": record.get("chapter_id"),
        "chapter_title": CHAPTER_TITLES.get(record.get("chapter_id"), record.get("chapter_id")),
        "concept_id": record.get("concept_id"),
        "concept_number": record.get("concept_number"),
        "concept_title": record.get("concept_title_en"),
        "topic_id": record.get("topic_id"),
        "family_id": record.get("family_id"),
        "variant_id": record.get("variant_id"),
        "kind": record.get("kind"),
        "format": question_format,
        "level": record.get("level"),
        "marks": marks,
        "prompt": public_text(record.get("prompt_en", "")),
        "stem": public_text(record.get("mcq_stem_en") or record.get("prompt_en", "")),
        "options": public_text(record.get("options_en")) if isinstance(record.get("options_en"), list) else [],
        "correct_option": record.get("correct_option"),
        "solution": public_text(record.get("solution_en", [])),
        "final_answer": public_text(record.get("final_en") or record.get("answer_tex")),
        "quiz": bool(record.get("quiz") or record.get("is_concept_quiz")),
        "combined": bool(record.get("combined")),
        "working_space_mm": record.get("working_space_mm"),
        # Bound after the one-time card render; these are public browser paths,
        # not source-file references.
        "image": record.get("image"),
        "image_width": record.get("image_width"),
        "image_height": record.get("image_height"),
        "image_dpi": record.get("image_dpi"),
        "visual_asset": visual_asset,
    }


def stage_question_bank() -> dict[str, Any]:
    records = []
    seen: set[str] = set()
    for records_file in sorted(STUDENT_SOURCE.rglob("records_normalized.json")):
        data = json.loads(records_file.read_text(encoding="utf-8"))
        for record in data.get("records", []):
            item = compact_question(record)
            if not item["id"] or item["id"] in seen:
                continue
            seen.add(item["id"])
            records.append(item)
    records.sort(key=lambda item: (item.get("chapter_id") or "", item.get("concept_id") or "", item.get("id") or ""))
    DATA_ROOT.mkdir(parents=True, exist_ok=True)
    question_payload = {
        "schema_version": "egyptian-baccalaureate-question-bank-1.0",
        "public": True,
        "language": "English",
        "course": "Egyptian Baccalaureate Mathematics 2026",
        "record_count": len(records),
        "format_counts": {
            "mcq": sum(item["format"] == "mcq" for item in records),
            "written": sum(item["format"] == "written" for item in records),
        },
        "records": records,
    }
    question_path = DATA_ROOT / "questions.json"
    question_path.write_text(json.dumps(question_payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (DATA_ROOT / "solutions.json").write_text(json.dumps({
        "schema_version": "egyptian-baccalaureate-solution-bank-1.0",
        "public": True,
        "language": "English",
        "course": "Egyptian Baccalaureate Mathematics 2026",
        "records": {item["id"]: {"solution": item["solution"], "final_answer": item["final_answer"], "correct_option": item["correct_option"]} for item in records},
    }, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return {"path": question_path.relative_to(OUTPUT_ROOT).as_posix(), "record_count": len(records), "format_counts": question_payload["format_counts"], "sha256": sha256(question_path)}


def stage_visual_assets() -> list[dict[str, Any]]:
    copied: list[dict[str, Any]] = []
    for chapter_dir in sorted(STUDENT_SOURCE.glob("Chapter *")):
        for concept_dir in sorted(chapter_dir.glob("Concept *")):
            records_file = concept_dir / "records_normalized.json"
            if not records_file.exists():
                continue
            data = json.loads(records_file.read_text(encoding="utf-8"))
            for record in data.get("records", []):
                visual = record.get("visual_asset")
                if not visual:
                    continue
                filename = visual.get("file") if isinstance(visual, dict) else visual
                if not filename:
                    continue
                candidates = [concept_dir / "assets" / Path(filename).name, concept_dir / Path(filename).name]
                candidates.extend(root / Path(filename).name for root in AUXILIARY_ASSET_ROOTS)
                source = next((candidate for candidate in candidates if candidate.exists()), None)
                if source is None:
                    wanted = re.sub(r"[^a-z0-9]+", "", Path(filename).stem.lower())
                    wanted = re.sub(r"q(?=\d)", "", wanted)
                    search_roots = [concept_dir / "assets", *AUXILIARY_ASSET_ROOTS]
                    for search_root in search_roots:
                        if not search_root.exists():
                            continue
                        for candidate in search_root.glob("*"):
                            candidate_key = re.sub(r"[^a-z0-9]+", "", candidate.stem.lower())
                            candidate_key = re.sub(r"q(?=\d)", "", candidate_key)
                            if candidate_key == wanted or candidate_key.startswith(wanted) or wanted.startswith(candidate_key):
                                source = candidate
                                break
                        if source:
                            break
                if not source:
                    continue
                asset_id = (visual.get("asset_id") if isinstance(visual, dict) else None) or record["id"]
                target = QUESTION_ASSET_ROOT / f"{asset_id}{source.suffix.lower()}"
                target.parent.mkdir(parents=True, exist_ok=True)
                if not target.exists():
                    shutil.copy2(source, target)
                copied.append({"asset_id": asset_id, "path": target.relative_to(OUTPUT_ROOT).as_posix(), "sha256": sha256(target), "source_question_id": record["id"]})
    unique: dict[str, dict[str, Any]] = {item["asset_id"]: item for item in copied}
    manifest_path = QUESTION_ASSET_ROOT / "manifest.json"
    manifest_path.parent.mkdir(parents=True, exist_ok=True)
    manifest_path.write_text(json.dumps({"schema_version": "egyptian-baccalaureate-visual-assets-1.0", "public": True, "assets": list(unique.values())}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return list(unique.values())


def main() -> None:
    global OUTPUT_ROOT, RELEASE_ROOT, DATA_ROOT, QUESTION_ASSET_ROOT
    parser = argparse.ArgumentParser()
    parser.add_argument("--output-root", type=Path, default=DEFAULT_STAGE_ROOT)
    args = parser.parse_args()
    OUTPUT_ROOT = args.output_root.resolve()
    RELEASE_ROOT = OUTPUT_ROOT / "downloads" / "EgyptianBaccalaureate" / "2026" / "English"
    DATA_ROOT = OUTPUT_ROOT / "data" / "EgyptianBaccalaureate" / "2026" / "English"
    QUESTION_ASSET_ROOT = OUTPUT_ROOT / "assets" / "questions" / "EgyptianBaccalaureate" / "2026" / "English"
    # The release folders are owned by this build.  Remove only these precise
    # generated paths; unrelated website files and user changes are untouched.
    for generated in (RELEASE_ROOT, DATA_ROOT, QUESTION_ASSET_ROOT):
        if generated.exists():
            shutil.rmtree(generated)
    files: list[dict[str, Any]] = []
    stage_student(files)
    stage_teacher(files)
    bank = stage_question_bank()
    visual_assets = stage_visual_assets()
    files.sort(key=lambda item: (item["edition"], item["scope"], item["id"]))
    manifest = {
        "schema_version": "elite-egyptian-baccalaureate-public-release-1.0",
        "release_id": "egyptian-baccalaureate-2026-english-public-20260902",
        "public": True,
        "course": "Egyptian Baccalaureate Mathematics 2026",
        "language": "English",
        "student_design": "A4 Landscape — Open Workbook / Guided Practice",
        "teacher_design": "B5 Landscape — Classroom Working Edition Version 2",
        "files": files,
        "question_bank": bank,
        "visual_assets": {"policy": "selected diagrams only; no page-by-page render duplication", "count": len(visual_assets), "manifest": (QUESTION_ASSET_ROOT / "manifest.json").relative_to(OUTPUT_ROOT).as_posix()},
        "counts": {"pdfs": len(files), "student_pdfs": sum(item["edition"] == "student" for item in files), "teacher_pdfs": sum(item["edition"] == "teacher" for item in files)},
    }
    (RELEASE_ROOT / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"release_root": str(RELEASE_ROOT), "pdf_count": len(files), "student_pdfs": manifest["counts"]["student_pdfs"], "teacher_pdfs": manifest["counts"]["teacher_pdfs"], "question_count": bank["record_count"], "visual_asset_count": len(visual_assets)}, ensure_ascii=True))


if __name__ == "__main__":
    main()
