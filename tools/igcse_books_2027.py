"""Elite IGCSE books, 2027 design (same navy/gold design as tools/ial_books_2027.py).

Builds, from private_output/igcse_books_<course>.json (written by tools/export_igcse_book_data.js):
  linear : downloads/classified_problems.pdf, downloads/Classified_Expertise.pdf,
           downloads/ClassifiedSolutions/classified_answers_Part1_of_2.pdf + Part2_of_2.pdf,
           downloads/ClassifiedSolutions/Classified_Expertise_Answers.pdf,
           downloads/PastPaperSolutions/<Session><Year>_<Paper>_Solutions.pdf (every Linear paper)
  unit1/2: downloads/Classified_4WM1.pdf, Classified_4WM1_Expertise.pdf and their ClassifiedSolutions answers
File names match the current links, so the site keeps working.

node tools/export_igcse_book_data.js
python tools/igcse_books_2027.py linear|unit1|unit2 [--papers-only|--books-only]
"""
from __future__ import annotations

import json
import shutil
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import ial_books_2027 as b  # noqa: E402

ROOT = b.ROOT
DOWNLOADS = ROOT / "downloads"
SESSIONS = {"Jan": 1, "May": 2, "MayNov": 2, "Jun": 2, "Oct": 3, "Nov": 4, "Specimen": 0}
SESSION_NAMES = {"Jan": "January", "May": "May", "MayNov": "May/November", "Jun": "June", "Oct": "October", "Nov": "November", "Specimen": "Specimen"}
COURSES = {
    "linear": {"code": "4MA1", "name": "Linear", "glyph": "&pi;", "kicker": "IGCSE Linear &middot; 4MA1", "time": "2 h",
               "files": {"questions": "classified_problems.pdf", "expertise": "Classified_Expertise.pdf",
                         "answers": ["ClassifiedSolutions/classified_answers_Part1_of_2.pdf", "ClassifiedSolutions/classified_answers_Part2_of_2.pdf"],
                         "expertise_answers": "ClassifiedSolutions/Classified_Expertise_Answers.pdf"}},
    "unit1": {"code": "4WM1", "name": "Modular Unit 1", "glyph": "&radic;", "kicker": "IGCSE Modular &middot; Unit 1 &middot; 4WM1", "time": "2 h",
              "files": {"questions": "Classified_4WM1.pdf", "expertise": "Classified_4WM1_Expertise.pdf",
                        "answers": ["ClassifiedSolutions/Classified_4WM1_Answers.pdf"],
                        "expertise_answers": "ClassifiedSolutions/Classified_4WM1_Expertise_Answers.pdf"}},
    "unit2": {"code": "4WM2", "name": "Modular Unit 2", "glyph": "x&sup2;", "kicker": "IGCSE Modular &middot; Unit 2 &middot; 4WM2", "time": "2 h",
              "files": {"questions": "Classified_4WM2.pdf", "expertise": "Classified_4WM2_Expertise.pdf",
                        "answers": ["ClassifiedSolutions/Classified_4WM2_Answers.pdf"],
                        "expertise_answers": "ClassifiedSolutions/Classified_4WM2_Expertise_Answers.pdf"}},
}
PAPER_LABEL = {"P1H": "4MA1/1H", "P1HR": "4MA1/1HR", "P2H": "4MA1/2H", "P2HR": "4MA1/2HR",
               "4WM1H": "4WM1/01", "4WM1HR": "4WM1/01R", "4WM2H": "4WM2/01", "4WM2HR": "4WM2/01R"}


def to_item(q: dict) -> dict:
    """IGCSE export record -> the item shape the shared book functions use."""
    session = q["session"] if q["session"] in SESSION_NAMES else "Specimen"
    label = PAPER_LABEL.get(q["paperCode"], q["paperCode"])
    when = f"{SESSION_NAMES[session]} {q['year']}" if session != "Specimen" else "Specimen"
    return {
        "id": q["id"], "year": q["year"] or 0, "session": session, "qNo": q["qNo"], "marks": q["marks"],
        "paper": f"{label} {when}", "paperSlug": q["paperSlug"], "chapter": q["chapter"],
        "topic": q["topic"], "topicName": q["topic"], "primaryTopic": q["topic"], "primaryTopicName": q["topic"],
        "topics": [q["topic"]], "topicNames": [q["topic"]], "secondaryTopics": [], "topicOrder": q["topicOrder"],
        "image": q["image"], "steps": q["steps"], "finalAnswer": q["finalAnswer"], "bank": q["bank"],
    }


BOOK_IMAGES = ROOT / "private_output" / "book_images"


def book_image(rel: str) -> str:
    """A light copy of a question image for print (32-colour palette PNG): the scans are black text on white,
    so this looks the same on paper but keeps the classified books well under GitHub's 100 MB file limit."""
    from PIL import Image

    src = ROOT / rel
    dst = BOOK_IMAGES / Path(rel).name
    if not dst.exists() or dst.stat().st_mtime < src.stat().st_mtime:
        BOOK_IMAGES.mkdir(parents=True, exist_ok=True)
        Image.open(src).convert("RGB").quantize(colors=32, method=Image.Quantize.MEDIANCUT).save(dst, optimize=True)
    return str(dst.relative_to(ROOT)).replace("\\", "/")


def configure(course_id: str) -> list[dict]:
    meta = COURSES[course_id]
    raw = json.loads((ROOT / "private_output" / f"igcse_books_{course_id}.json").read_text(encoding="utf-8"))
    items = [to_item(q) for q in raw]
    missing = [i["image"] for i in items if not (ROOT / i["image"]).exists()]
    if missing:
        raise SystemExit(f"{len(missing)} question images missing, e.g. {missing[:3]}")
    for item in items:
        item["image"] = book_image(item["image"])
    classified = [i for i in items if i["bank"] == "all"]
    years = sorted({i["year"] for i in classified if i["year"]})
    b.SESSIONS.clear()
    b.SESSIONS.update(SESSIONS)
    b.SESSION_NAMES.clear()
    b.SESSION_NAMES.update(SESSION_NAMES)
    b.paper_slug = lambda item: item["paperSlug"]
    order = {}
    for i in items:
        order.setdefault(i["topic"], i["topicOrder"])
    b.TOPICS[:] = sorted(order, key=lambda t: (order[t], t))
    b.COURSE = {"id": f"igcse_{course_id}", "code": meta["code"], "name": meta["name"], "glyph": meta["glyph"],
                "kicker": meta["kicker"], "board": "Pearson Edexcel International GCSE", "time": meta["time"],
                "count": len(classified), "years": f"{years[0]}&ndash;{years[-1]}",
                "sessions": len({i["paper"] for i in classified}), "sessions_label": "past papers",
                "span": f"{years[0]} to {years[-1]}"}
    b.HTML_ROOT = ROOT / "private_output" / f"igcse_{course_id}_books_html"
    b.PAPER_HTML_ROOT = b.HTML_ROOT / "Papers"
    b.OUT = DOWNLOADS
    b.PAPER_OUT = DOWNLOADS / "PastPaperSolutions"
    return items


def split_by_chapter(placements: list[dict], parts: int) -> list[list[dict]]:
    """Keep whole chapters together; split where the running total passes each equal share."""
    chapters: dict[str, list[dict]] = {}
    for item in sorted(placements, key=b.sort_key):
        chapters.setdefault(item["chapter"], []).append(item)
    groups, current, target = [], [], len(placements) / parts
    for chapter_items in chapters.values():
        current.extend(chapter_items)
        if len(groups) < parts - 1 and len(current) >= target:
            groups.append(current)
            current = []
    groups.append(current)
    return groups


def main() -> None:
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if not args or args[0] not in COURSES:
        raise SystemExit("usage: python tools/igcse_books_2027.py linear|unit1|unit2 [--papers-only|--books-only]")
    course_id = args[0]
    meta = COURSES[course_id]
    items = configure(course_id)
    if b.HTML_ROOT.exists():
        shutil.rmtree(b.HTML_ROOT)
    b.write_css()
    name, code = meta["name"], meta["code"]
    classified = [i for i in items if i["bank"] == "all"]
    expertise = [i for i in items if i["bank"] == "expertise"]
    jobs = []
    if "--papers-only" not in sys.argv:
        files = meta["files"]
        jobs.append((b.build_topic_html("questions.html", f"{name} Classified Questions",
                                        f"{len(classified)} past-paper questions grouped by topic.", classified, False)[0], files["questions"]))
        jobs.append((b.build_topic_html("expertise.html", f"{name} Expertise Questions",
                                        f"{len(expertise)} harder end-of-paper questions (Q20+), grouped by topic.", expertise, False)[0], files["expertise"]))
        parts = split_by_chapter(classified, len(files["answers"]))
        for n, (part, target) in enumerate(zip(parts, files["answers"]), 1):
            suffix = f" (Part {n} of {len(parts)})" if len(parts) > 1 else ""
            chapters = sorted({i["chapter"] for i in part}, key=lambda c: min(i["topicOrder"] for i in part if i["chapter"] == c))
            subtitle = "Every question followed by Dr Eslam Ahmed's worked solution and final answer."
            if len(parts) > 1:
                subtitle += f" Chapters: {', '.join(chapters)}."
            jobs.append((b.build_topic_html(f"answers_{n}.html", f"{name} Classified With Answers{suffix}", subtitle, part, True)[0], target))
        jobs.append((b.build_topic_html("expertise_answers.html", f"{name} Expertise With Answers",
                                        "Q20+ questions with Dr Eslam Ahmed's worked solutions.", expertise, True)[0], files["expertise_answers"]))
    if course_id == "linear" and "--books-only" not in sys.argv:
        # One solution book per real paper: 4MA1 papers from the Linear bank, 4WM1/4WM2 papers from their unit banks.
        def unit_items(unit):
            data = json.loads((ROOT / "private_output" / f"igcse_books_{unit}.json").read_text(encoding="utf-8"))
            return [to_item(q) for q in data if q["bank"] == "all"]
        pool = [i for i in classified if not i["paperSlug"].split("_")[-1].startswith("4WM")]
        pool += [i for i in unit_items("unit1") if i["paperSlug"].split("_")[-1].startswith("4WM1")]
        pool += [i for i in unit_items("unit2") if i["paperSlug"].split("_")[-1].startswith("4WM2")]
        for paper, paper_items in b.paper_groups(pool):
            html_path, pdf_path = b.build_single_paper_html(paper, paper_items)
            jobs.append((html_path, str(pdf_path.relative_to(DOWNLOADS))))
    for html_path, target in jobs:
        pdf_path = DOWNLOADS / target
        pdf_path.parent.mkdir(parents=True, exist_ok=True)
        b.print_pdf(html_path, pdf_path)
        print(pdf_path.relative_to(ROOT), round(pdf_path.stat().st_size / 1e6, 1), "MB")


if __name__ == "__main__":
    main()
