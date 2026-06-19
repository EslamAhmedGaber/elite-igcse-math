from __future__ import annotations

import hashlib
import json
import shutil
from pathlib import Path
from urllib.parse import quote

from pypdf import PdfReader, PdfWriter


VERSION = "20260619b"
OL_ROOT = Path(r"D:\Tyro4_Latex\0 Mathematics\OL")
WEBSITE_ROOT = Path(__file__).resolve().parents[1]
DOWNLOAD_ROOT = WEBSITE_ROOT / "downloads" / "Linear" / "StrategyNotes"
SOURCE_BOOKLET_ROOT = OL_ROOT / "complete_booklet"
MANIFEST_PATH = WEBSITE_ROOT / "private_output" / "linear_strategy_notes_manifest.json"
DATA_PATH = WEBSITE_ROOT / "linear-notes-data.js"


CHAPTERS = [
    {
        "id": "chapter-1",
        "number": 1,
        "title": "Chapter 1: Number",
        "short": "Number",
        "filename": "Linear_CH01_Number_Strategy_Notes_Booklet.pdf",
        "topics": [
            ("1 Number Toolkit", "Number Toolkit", None),
            ("2 Set Notation & Venn Diagram", "Set Notation & Venn Diagrams", "Set Notation & Venn Diagrams"),
            ("3 Prime Factors, HCF &", "Prime Factors, HCF & LCM", "Prime Factors, HCF & LCM"),
            ("4 Powers, Roots & Standard form", "Powers, Roots & Standard Form", "Powers, Roots & Standard Form"),
            ("5 Fractions", "Fractions", "Fractions"),
            ("6 Percentages", "Percentages", "Percentages"),
            ("7 Compound Interest & Depreciation", "Compound Interest & Depreciation", "Compound Interest & Depreciation"),
            ("8 Fractions, Decimals & Precentages", "Fractions, Decimals & Percentages", "Fractions, Decimals & Percentages"),
            ("9 Rounding, Estimation & Bounds", "Rounding, Estimation & Bounds", "Rounding, Estimation & Bounds"),
            ("10 Simplifying Surds", "Surds", "Surds"),
            ("11 Using a Calculator", "Using a Calculator", None),
            ("12  Ratio Toolkit", "Ratio Toolkit", "Ratio Toolkit"),
            ("13 Ratio Problem Solving", "Ratio Problem Solving", "Ratio Problem Solving"),
            ("14 Exchange Rate", "Exchange Rates & Best Buys", "Exchange Rates & Best Buys"),
            ("15  Direct & Inverse Proportion", "Direct & Inverse Proportion", "Direct & Inverse Proportion"),
        ],
    },
    {
        "id": "chapter-2",
        "number": 2,
        "title": "Chapter 2: Algebra",
        "short": "Algebra",
        "filename": "Linear_CH02_Algebra_Strategy_Notes_Booklet.pdf",
        "topics": [
            ("1Algebra Toolkit", "Algebra Toolkit", None),
            ("2Algebraic Roots & Indices", "Algebraic Roots & Indices", "Algebraic Roots & Indices"),
            ("3Expanding Brackets", "Expanding Brackets", "Expanding Brackets"),
            ("4Factorization", "Factorising", "Factorising"),
            ("5Completing the Square", "Completing the Square", "Completing the Square"),
            ("6Simplifying Algebraic Fractions", "Algebraic Fractions", "Algebraic Fractions"),
            ("7rearrange formulas", "Rearranging Formulas", "Rearranging Formulas"),
            ("8Algebraic Proof", "Algebraic Proof", "Algebraic Proof"),
            ("9Solving Linear Equations", "Solving Linear Equations", "Solving Linear Equations"),
            ("10Solving Quadratics", "Solving Quadratic Equations", "Solving Quadratic Equations"),
            ("11Solving Inequalities", "Solving Inequalities", "Solving Inequalities"),
            ("12Simultaneous Equation", "Simultaneous Equations", "Simultaneous Equations"),
            ("13Forming and solving equation", "Forming & Solving Equations", "Forming & Solving Equations"),
        ],
    },
    {
        "id": "chapter-3",
        "number": 3,
        "title": "Chapter 3: Graphs, Functions & Sequences",
        "short": "Graphs",
        "filename": "Linear_CH03_Graphs_Functions_Sequences_Strategy_Notes_Booklet.pdf",
        "topics": [
            ("1  Sequences", "Sequences", "Sequences"),
            ("2  Coordinate Geometry", "Coordinate Geometry", "Coordinate Geometry"),
            ("3 Function", "Functions", "Functions"),
            ("4  Linear Graphs y = mx + c", "Linear Graphs (y = mx + c)", "Linear Graphs (y = mx + c)"),
            ("5  Graphs of Functions", "Graphs of Functions", "Graphs of Functions"),
            ("6 Estimating Gradients", "Estimating Gradients", "Estimating Gradients"),
            ("7  Real-Life Graphs", "Real-Life Graphs", None),
            ("8 Graphing Inequalities", "Graphing Inequalities", "Graphing Inequalities"),
            ("9  Transformations of Graphs", "Transformations of Graphs", "Transformations of Graphs"),
            ("10 Differentiation", "Differentiation", "Differentiation"),
        ],
    },
    {
        "id": "chapter-4",
        "number": 4,
        "title": "Chapter 4: Geometry & Mensuration",
        "short": "Geometry",
        "filename": "Linear_CH04_Geometry_Mensuration_Strategy_Notes_Booklet.pdf",
        "topics": [
            ("1 Standard & Compound Units", "Standard & Compound Units", "Standard & Compound Units"),
            ("2 Angles in Polygons & Parallel", "Angles in Polygons & Parallel Lines", "Angles in Polygons & Parallel Lines"),
            ("3 Bearings, Scale Drawing", "Bearings, Scale Drawing & Constructions", "Bearings, Scale Drawing & Constructions"),
            ("4 Circle Theorems", "Circle Theorems", "Circle Theorems"),
            ("5 Area & Perimeter", "Area & Perimeter", "Area & Perimeter"),
            ("6 Circles, Arcs & Sectors", "Circles, Arcs & Sectors", "Circles, Arcs & Sectors"),
            ("7 Volume & Surface Area", "Volume & Surface Area", "Volume & Surface Area"),
            ("8 Congruence, Similarity & Geometrical", "Congruence, Similarity & Geometrical Proof", "Congruence, Similarity & Geometrical Proof"),
            ("9 Area & Volume of Similar", "Area & Volume of Similar Shapes", "Area & Volume of Similar Shapes"),
            ("10", "Right-Angled Triangles - Pythagoras & Trigonometry", "Right-Angled Triangles - Pythagoras & Trigonometry"),
            ("11 sine & cosine rule", "Sine, Cosine Rule & Area of Triangles", "Sine, Cosine Rule & Area of Triangles"),
            ("12 3D Pytho", "3D Pythagoras & Trigonometry", "3D Pythagoras & Trigonometry"),
        ],
    },
    {
        "id": "chapter-5",
        "number": 5,
        "title": "Chapter 5: Vectors & Transformations",
        "short": "Vectors",
        "filename": "Linear_CH05_Vectors_Transformations_Strategy_Notes_Booklet.pdf",
        "topics": [
            ("", "Vectors", "Vectors"),
            ("Transformations", "Transformations", "Transformations"),
        ],
    },
    {
        "id": "chapter-6",
        "number": 6,
        "title": "Chapter 6: Statistics & Probability",
        "short": "Statistics",
        "filename": "Linear_CH06_Statistics_Probability_Strategy_Notes_Booklet.pdf",
        "topics": [
            ("Statistics", "Statistics Toolkit", "Statistics Toolkit"),
            ("Histogram", "Histograms", "Histograms"),
            ("Cumulative Frequency Diagrams", "Cumulative Frequency Diagrams", "Cumulative Frequency Diagrams"),
            ("Probability Toolkit", "Probability Toolkit", "Probability Toolkit"),
            ("Probability Diagrams - Venn &", "Probability Diagrams - Venn & Tree Diagrams", "Probability Diagrams - Venn & Tree Diagrams"),
            ("Combined & Conditional Probability", "Combined & Conditional Probability", "Combined & Conditional Probability"),
        ],
    },
]


def slug(value: str) -> str:
    keep = []
    for char in value:
        if char.isalnum():
            keep.append(char)
        elif char in {"&", "+", "-"}:
            keep.append(" ")
        else:
            keep.append(" ")
    words = "".join(keep).split()
    return "_".join(words)


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def source_topic_dir(chapter: dict, folder: str) -> Path:
    chapter_dir = OL_ROOT / f"Chapter{chapter['number']}"
    return chapter_dir if folder == "" else chapter_dir / folder


def find_source_pdf(topic_dir: Path) -> Path:
    notes_dir = topic_dir / "elite_experience_notes"
    matches = sorted(notes_dir.glob("*_experience_notes.pdf"))
    if not matches:
        raise FileNotFoundError(f"No experience-note PDF found in {notes_dir}")
    return matches[0]


def read_focus(topic_dir: Path) -> str:
    summary_path = topic_dir / "elite_experience_notes" / "mining_summary.json"
    if not summary_path.exists():
        return "exam triggers, first lines, checked practice"
    try:
        data = json.loads(summary_path.read_text(encoding="utf-8"))
    except Exception:
        return "exam triggers, first lines, checked practice"
    ideas = data.get("ideas") or []
    titles = []
    for idea in ideas:
        title = str(idea.get("title") or "").strip()
        if title and title not in titles:
            titles.append(title)
        if len(titles) >= 3:
            break
    return ", ".join(titles) if titles else "exam triggers, first lines, checked practice"


def pdf_pages(path: Path) -> int:
    return len(PdfReader(str(path)).pages)


def merge_pdfs(inputs: list[Path], output: Path, title: str) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    writer = PdfWriter()
    for pdf in inputs:
        reader = PdfReader(str(pdf))
        for page in reader.pages:
            writer.add_page(page)
    writer.add_metadata({
        "/Title": title,
        "/Author": "Dr Eslam Ahmed",
        "/Subject": "Elite IGCSE Mathematics Strategy Notes",
    })
    writer.compress_identical_objects()
    with output.open("wb") as handle:
        writer.write(handle)


def practice_href(web_topic: str | None) -> str:
    base = "practice.html?pathway=linear&bank=all"
    if not web_topic:
        return base
    return f"{base}&topic={quote(web_topic)}"


def main() -> None:
    DOWNLOAD_ROOT.mkdir(parents=True, exist_ok=True)
    SOURCE_BOOKLET_ROOT.mkdir(parents=True, exist_ok=True)
    MANIFEST_PATH.parent.mkdir(parents=True, exist_ok=True)

    data_chapters = []
    manifest = {
        "version": VERSION,
        "sourceRoot": str(OL_ROOT),
        "downloadRoot": str(DOWNLOAD_ROOT),
        "topicCount": 0,
        "chapters": [],
        "booklets": [],
        "topics": [],
    }

    chapter_booklets_for_full = []
    for chapter in CHAPTERS:
        chapter_topics = []
        chapter_pdf_inputs = []
        chapter_manifest = {
            "id": chapter["id"],
            "title": chapter["title"],
            "topics": [],
        }
        for index, (folder, title, web_topic) in enumerate(chapter["topics"], start=1):
            topic_dir = source_topic_dir(chapter, folder)
            source_pdf = find_source_pdf(topic_dir)
            filename = f"Linear_CH{chapter['number']:02d}_{index:02d}_{slug(title)}_Strategy_Notes.pdf"
            dest_pdf = DOWNLOAD_ROOT / filename
            shutil.copy2(source_pdf, dest_pdf)
            pages = pdf_pages(source_pdf)
            focus = read_focus(topic_dir)
            href = f"downloads/Linear/StrategyNotes/{filename}?v={VERSION}"
            topic_record = {
                "chapter": chapter["id"],
                "number": f"{chapter['number']}.{index}",
                "title": title,
                "href": href,
                "pages": pages,
                "focus": focus,
                "practiceHref": practice_href(web_topic),
                "practiceLabel": "Practice topic" if web_topic else "Open Linear practice",
            }
            chapter_topics.append(topic_record)
            chapter_pdf_inputs.append(dest_pdf)
            checksum = sha256(dest_pdf)
            topic_manifest = {
                "title": title,
                "source": str(source_pdf),
                "download": str(dest_pdf),
                "pages": pages,
                "bytes": dest_pdf.stat().st_size,
                "sha256": checksum,
                "webTopic": web_topic,
            }
            chapter_manifest["topics"].append(topic_manifest)
            manifest["topics"].append(topic_manifest)

        source_chapter_booklet = SOURCE_BOOKLET_ROOT / chapter["filename"]
        download_chapter_booklet = DOWNLOAD_ROOT / chapter["filename"]
        merge_pdfs(chapter_pdf_inputs, source_chapter_booklet, chapter["title"])
        shutil.copy2(source_chapter_booklet, download_chapter_booklet)
        chapter_pages = pdf_pages(download_chapter_booklet)
        chapter_booklets_for_full.append(download_chapter_booklet)
        chapter_href = f"downloads/Linear/StrategyNotes/{chapter['filename']}?v={VERSION}"
        chapter_data = {
            "id": chapter["id"],
            "number": chapter["number"],
            "title": chapter["title"],
            "short": chapter["short"],
            "href": chapter_href,
            "detail": f"{len(chapter_topics)} topic notes collected into one chapter booklet",
            "pages": chapter_pages,
            "topics": chapter_topics,
        }
        data_chapters.append(chapter_data)
        booklet_manifest = {
            "title": chapter["title"],
            "source": str(source_chapter_booklet),
            "download": str(download_chapter_booklet),
            "pages": chapter_pages,
            "bytes": download_chapter_booklet.stat().st_size,
            "sha256": sha256(download_chapter_booklet),
        }
        manifest["booklets"].append(booklet_manifest)
        chapter_manifest["booklet"] = booklet_manifest
        manifest["chapters"].append(chapter_manifest)

    full_name = "Linear_4MA1_Strategy_Notes_Booklet.pdf"
    source_full = SOURCE_BOOKLET_ROOT / full_name
    download_full = DOWNLOAD_ROOT / full_name
    merge_pdfs(chapter_booklets_for_full, source_full, "Linear 4MA1 Complete Strategy Notes")
    shutil.copy2(source_full, download_full)
    full_pages = pdf_pages(download_full)
    full_booklet = {
        "title": "Complete Linear 4MA1 Strategy Booklet",
        "href": f"downloads/Linear/StrategyNotes/{full_name}?v={VERSION}",
        "detail": "58 topic notes collected into one printable Linear booklet",
        "pages": full_pages,
    }
    manifest["booklets"].append({
        "title": full_booklet["title"],
        "source": str(source_full),
        "download": str(download_full),
        "pages": full_pages,
        "bytes": download_full.stat().st_size,
        "sha256": sha256(download_full),
    })
    manifest["topicCount"] = sum(len(chapter["topics"]) for chapter in data_chapters)

    js_data = {
        "course": "IGCSE Linear",
        "code": "4MA1",
        "title": "Linear Strategy Notes",
        "intro": "Start with the complete Linear booklet, open a chapter booklet, then use each topic note beside the matching classified questions.",
        "version": VERSION,
        "booklet": full_booklet,
        "chapters": data_chapters,
    }
    DATA_PATH.write_text(
        "(function () {\n"
        "  window.ELITE_LINEAR_NOTES = "
        + json.dumps(js_data, indent=2, ensure_ascii=True)
        + ";\n})();\n",
        encoding="utf-8",
    )
    MANIFEST_PATH.write_text(json.dumps(manifest, indent=2, ensure_ascii=True), encoding="utf-8")
    print(json.dumps({
        "version": VERSION,
        "topics": manifest["topicCount"],
        "chapters": len(data_chapters),
        "fullPages": full_pages,
        "fullBytes": download_full.stat().st_size,
        "downloadRoot": str(DOWNLOAD_ROOT),
        "dataPath": str(DATA_PATH),
        "manifestPath": str(MANIFEST_PATH),
    }, indent=2))


if __name__ == "__main__":
    main()
