from __future__ import annotations

import argparse
import hashlib
import json
import re
import shutil
from pathlib import Path

import fitz


CHAPTERS = {
    1: "Number",
    2: "Algebra",
    3: "Graphs and Functions",
    4: "Geometry and Measures",
    5: "Vectors and Transformations",
    6: "Statistics and Probability",
}


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def read_window_data(path: Path, name: str) -> dict:
    text = path.read_text(encoding="utf-8")
    match = re.search(rf"window\.{re.escape(name)}\s*=\s*", text)
    if not match:
        raise ValueError(f"{path} does not assign window.{name}")
    value, _ = json.JSONDecoder().raw_decode(text[match.end():])
    if not isinstance(value, dict):
        raise ValueError(f"window.{name} must contain an object")
    return value


def write_window_data(path: Path, name: str, value: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        f"(function () {{\n  window.{name} = "
        + json.dumps(value, ensure_ascii=False, indent=1)
        + ";\n})();\n",
        encoding="utf-8",
    )


def href_path(href: str | None) -> str | None:
    return href.split("?", 1)[0] if href else None


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source-root", required=True, type=Path)
    parser.add_argument("--site-root", required=True, type=Path)
    parser.add_argument("--stage-root", required=True, type=Path)
    parser.add_argument("--version", required=True)
    parser.add_argument("--max-chapter", type=int, default=5)
    args = parser.parse_args()

    source_root = args.source_root.resolve()
    site_root = args.site_root.resolve()
    stage_root = args.stage_root.resolve()
    if not source_root.is_dir() or not site_root.is_dir():
        raise SystemExit("Source and site roots must exist")
    if stage_root == site_root or stage_root.is_relative_to(site_root):
        raise SystemExit("Stage root must be outside the live website tree")
    if not re.fullmatch(r"\d{8}[a-z]", args.version):
        raise SystemExit("Version must look like YYYYMMDDa")

    library = read_window_data(site_root / "library-data.js", "ELITE_LIBRARY")
    old_linear_notes = read_window_data(site_root / "linear-notes-data.js", "ELITE_LINEAR_NOTES")
    linear = library["courses"]["linear"]
    old_chapters = linear["notes"]["chapters"]
    old_focus = {
        topic["number"]: topic
        for chapter in old_linear_notes["chapters"]
        for topic in chapter["topics"]
    }
    linear_by_num = {
        topic["num"]: topic
        for chapter in old_chapters
        for topic in chapter["topics"]
    }

    all_topic_dirs = sorted(
        (p for p in source_root.glob("C*_T*_*" ) if p.is_dir()),
        key=lambda p: tuple(map(int, re.match(r"C(\d+)_T(\d+)_", p.name).groups())),
    )
    topic_dirs = [
        p for p in all_topic_dirs
        if int(re.match(r"C(\d+)_T", p.name).group(1)) <= args.max_chapter
    ]
    records: dict[str, dict] = {}
    staged_assets: list[dict] = []
    for folder in topic_dirs:
        match = re.fullmatch(r"C(\d+)_T(\d+)_([A-Za-z0-9_-]+)", folder.name)
        if not match:
            raise ValueError(f"Unexpected topic folder name: {folder.name}")
        chapter, topic_no = map(int, match.group(1, 2))
        key = f"{chapter}.{topic_no}"
        if key in records or key not in linear_by_num:
            raise ValueError(f"Unexpected or duplicate topic number {key}")
        pdfs = list(folder.glob("*_Visual_Notes.pdf"))
        if len(pdfs) != 1:
            raise ValueError(f"Expected exactly one visual-notes PDF in {folder}")
        pdf = pdfs[0]
        if not (folder / f"check_answers.py").is_file() or not list(folder.glob("*.tex")):
            raise ValueError(f"Missing answer checker or TeX source in {folder}")
        with fitz.open(pdf) as document:
            if not document.page_count or not any(page.get_text().strip() for page in document):
                raise ValueError(f"Empty or unreadable PDF: {pdf}")
            page_count = document.page_count
            non_a4 = [i + 1 for i, page in enumerate(document)
                      if abs(page.rect.width - 595.28) > 2 or abs(page.rect.height - 841.89) > 2]
            if non_a4:
                raise ValueError(f"Non-A4 pages in {pdf}: {non_a4[:5]}")

        relative = Path("downloads") / "Linear" / "VisualNotes" / folder.name / pdf.name
        destination = stage_root / relative
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(pdf, destination)
        site_href = relative.as_posix() + f"?v={args.version}"
        old = linear_by_num[key]
        record = {
            "num": key,
            "title": old["title"],
            "href": site_href,
            "pages": page_count,
            "mb": round(destination.stat().st_size / 1_000_000, 2),
            "status": None,
        }
        records[key] = record
        staged_assets.append({
            "source": str(pdf),
            "path": relative.as_posix(),
            "sha256": sha256(destination),
            "bytes": destination.stat().st_size,
            "pages": page_count,
            "rights": {"decision": "allow", "basis": "owner_authored", "evidence": "User explicitly requested public upload to EliteIGCSE.com."},
        })

    if not records:
        raise ValueError("No visual-notes PDFs were found")
    total_topics = len(linear_by_num)
    if len(records) > total_topics:
        raise ValueError("The source contains more topics than the current Linear catalogue")

    old_paths: set[str] = set()
    for course_id in ("linear", "unit1", "unit2"):
        notes = library["courses"][course_id]["notes"]
        for part in notes.get("complete", []):
            path = href_path(part.get("href"))
            if path:
                old_paths.add(path)
        for chapter in notes.get("chapters", []):
            path = href_path((chapter.get("booklet") or {}).get("href"))
            if path:
                old_paths.add(path)
            for topic in chapter.get("topics", []):
                path = href_path(topic.get("href"))
                if path:
                    old_paths.add(path)
        for topic in notes.get("topics", []):
            path = href_path(topic.get("href"))
            if path:
                old_paths.add(path)

    available_by_chapter: dict[int, list[dict]] = {i: [] for i in CHAPTERS}
    for num, record in records.items():
        chapter_no = int(num.split(".", 1)[0])
        available_by_chapter[chapter_no].append(record)

    for chapter in old_chapters:
        chapter["booklet"] = None
        for topic in chapter["topics"]:
            fresh = records.get(topic["num"])
            if fresh:
                topic.update({k: fresh[k] for k in ("href", "pages", "mb")})
                topic.pop("status", None)
            else:
                topic["href"] = None
                topic.pop("pages", None)
                topic.pop("mb", None)
                topic["status"] = "New visual notes in preparation"

    missing = total_topics - len(records)
    linear["notes"]["complete"] = []
    linear["notes"]["releaseStatus"] = {
        "availableTopics": len(records),
        "totalTopics": total_topics,
        "message": f"New visual notes with answers are live for {len(records)} of {total_topics} topics. Chapter 6 is being prepared." if missing else f"All {total_topics} Linear visual notes with answers are live.",
    }

    olt_to_num: dict[str, str] = {}
    sequence = 0
    for chapter in old_chapters:
        for topic in chapter["topics"]:
            sequence += 1
            olt_to_num[f"OL-T{sequence:02d}"] = topic["num"]

    unit_counts: dict[str, tuple[int, int]] = {}
    for course_id in ("unit1", "unit2"):
        course_notes = library["courses"][course_id]["notes"]
        topics = course_notes["topics"]
        available = 0
        for topic in topics:
            num = olt_to_num.get(topic.get("olt", ""))
            fresh = records.get(num or "")
            if fresh:
                topic.update({k: fresh[k] for k in ("href", "pages", "mb")})
                topic.pop("status", None)
                available += 1
            else:
                topic["href"] = None
                topic.pop("pages", None)
                topic.pop("mb", None)
                topic["status"] = "New visual notes in preparation"
        course_notes["complete"] = []
        unit_number = 1 if course_id == "unit1" else 2
        message = (
            f"All {len(topics)} Unit {unit_number} visual notes with answers are live."
            if available == len(topics)
            else f"New visual notes with answers are live for {available} of {len(topics)} Unit {unit_number} topics. Remaining topics are being prepared."
        )
        course_notes["releaseStatus"] = {
            "availableTopics": available,
            "totalTopics": len(topics),
            "message": message,
        }
        unit_counts[course_id] = (available, len(topics))

    library["version"] = args.version

    linear_data = {
        "course": "IGCSE Linear",
        "code": "4MA1",
        "title": "Linear Visual Notes (with Answers)",
        "intro": "New topic-by-topic visual notes with worked examples, practice and answers.",
        "version": args.version,
        "booklet": None,
        "releaseStatus": linear["notes"]["releaseStatus"],
        "chapters": [],
    }
    for chapter in old_chapters:
        items = []
        for topic in chapter["topics"]:
            fresh = records.get(topic["num"])
            if not fresh:
                continue
            previous = old_focus.get(topic["num"], {})
            items.append({
                "chapter": f"chapter-{chapter['number']}",
                "number": topic["num"],
                "title": topic["title"],
                "href": fresh["href"],
                "pages": fresh["pages"],
                "focus": previous.get("focus", ""),
                "practiceHref": previous.get("practiceHref", "practice.html?pathway=linear&bank=all"),
                "practiceLabel": previous.get("practiceLabel", "Open Linear practice"),
            })
        if items:
            linear_data["chapters"].append({
                "id": f"chapter-{chapter['number']}",
                "number": chapter["number"],
                "title": f"Chapter {chapter['number']}: {chapter['title']}",
                "short": chapter["title"],
                "href": None,
                "detail": f"{len(items)} topic notes with answers",
                "pages": sum(item["pages"] for item in items),
                "topics": items,
            })

    write_window_data(stage_root / "library-data.js", "ELITE_LIBRARY", library)
    write_window_data(stage_root / "linear-notes-data.js", "ELITE_LINEAR_NOTES", linear_data)
    manifest = {
        "schema_version": "1.0",
        "release_id": args.version,
        "course": "Edexcel IGCSE Linear 4MA1 and Modular 4WM1/4WM2",
        "available_topics": len(records),
        "total_linear_topics": total_topics,
        "unit_1_topics": {"available": unit_counts["unit1"][0], "total": unit_counts["unit1"][1]},
        "unit_2_topics": {"available": unit_counts["unit2"][0], "total": unit_counts["unit2"][1]},
        "deferred_folders": [p.name for p in all_topic_dirs if p not in topic_dirs],
        "retired_old_paths": sorted(old_paths),
        "artifacts": staged_assets,
    }
    stage_root.mkdir(parents=True, exist_ok=True)
    (stage_root / "visual_notes_release_manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps({
        "topics": len(records),
        "pages": sum(a["pages"] for a in staged_assets),
        "assets_mb": round(sum(a["bytes"] for a in staged_assets) / 1_000_000, 2),
        "unit1": manifest["unit_1_topics"],
        "unit2": manifest["unit_2_topics"],
        "retired_paths": len(old_paths),
        "stage_root": str(stage_root),
    }, indent=2))


if __name__ == "__main__":
    main()
