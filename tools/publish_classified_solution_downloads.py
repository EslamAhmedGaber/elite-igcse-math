"""
Publish classified worked-solution books for students.

The classified answer PDFs are built by tools/build_books.py into
private_output/. Dr Eslam has approved publishing these student solution books,
so this tool mirrors them into downloads/ClassifiedSolutions/. Any PDF over the
GitHub single-file limit is split into smaller sequential parts.
"""

from __future__ import annotations

import json
import shutil
from dataclasses import dataclass
from pathlib import Path

import fitz


ROOT = Path(__file__).resolve().parent.parent
PRIVATE_DIR = ROOT / "private_output"
PUBLIC_DIR = ROOT / "downloads" / "ClassifiedSolutions"
MAX_PUBLIC_BYTES = 95 * 1024 * 1024
DOWNLOAD_VERSION = "style-e-20260522"


def versioned_href(href: str) -> str:
    return f"{href}?v={DOWNLOAD_VERSION}"


@dataclass(frozen=True)
class ClassifiedSolutionBook:
    source: str
    title: str
    scope: str
    question_book: str


BOOKS = (
    ClassifiedSolutionBook(
        source="classified_answers.pdf",
        title="Complete Classified Solutions",
        scope="Full bank",
        question_book="downloads/classified_problems.pdf",
    ),
    ClassifiedSolutionBook(
        source="Classified_Expertise_Answers.pdf",
        title="Classified Expertise Solutions",
        scope="Q20+",
        question_book="downloads/Classified_Expertise.pdf",
    ),
    ClassifiedSolutionBook(
        source="Classified_4WM1_Answers.pdf",
        title="Unit 1 Classified Solutions",
        scope="4WM1",
        question_book="downloads/Classified_4WM1.pdf",
    ),
    ClassifiedSolutionBook(
        source="Classified_4WM2_Answers.pdf",
        title="Unit 2 Classified Solutions",
        scope="4WM2",
        question_book="downloads/Classified_4WM2.pdf",
    ),
    ClassifiedSolutionBook(
        source="Classified_4WM1_Expertise_Answers.pdf",
        title="Unit 1 Expertise Solutions",
        scope="4WM1 Q20+",
        question_book="downloads/Classified_4WM1_Expertise.pdf",
    ),
    ClassifiedSolutionBook(
        source="Classified_4WM2_Expertise_Answers.pdf",
        title="Unit 2 Expertise Solutions",
        scope="4WM2 Q20+",
        question_book="downloads/Classified_4WM2_Expertise.pdf",
    ),
)


def split_pdf(src: Path, stem: str) -> list[Path]:
    doc = fitz.open(src)
    parts = max(2, int(src.stat().st_size // MAX_PUBLIC_BYTES) + 1)
    pages_per_part = (doc.page_count + parts - 1) // parts
    outputs: list[Path] = []
    for index in range(parts):
        start = index * pages_per_part
        if start >= doc.page_count:
            break
        end = min(doc.page_count - 1, (index + 1) * pages_per_part - 1)
        part = fitz.open()
        part.insert_pdf(doc, from_page=start, to_page=end)
        out = PUBLIC_DIR / f"{stem}_Part{index + 1}_of_{parts}.pdf"
        part.save(out, garbage=4, deflate=True, deflate_images=True, deflate_fonts=True)
        part.close()
        outputs.append(out)
    doc.close()
    return outputs


def publish_book(book: ClassifiedSolutionBook) -> dict[str, object]:
    src = PRIVATE_DIR / book.source
    if not src.exists():
        raise FileNotFoundError(f"Missing classified solution book: {src}")

    stem = src.stem
    if src.stat().st_size > MAX_PUBLIC_BYTES:
        outputs = split_pdf(src, stem)
    else:
        out = PUBLIC_DIR / src.name
        shutil.copy2(src, out)
        outputs = [out]

    return {
        "title": book.title,
        "scope": book.scope,
        "questionBook": versioned_href(book.question_book),
        "source": f"private_output/{book.source}",
        "files": [
            {
                "href": versioned_href(f"downloads/ClassifiedSolutions/{path.name}"),
                "name": path.name,
                "sizeBytes": path.stat().st_size,
            }
            for path in outputs
        ],
    }


def main() -> None:
    PUBLIC_DIR.mkdir(parents=True, exist_ok=True)
    for existing in PUBLIC_DIR.glob("*.pdf"):
        existing.unlink()

    manifest = [publish_book(book) for book in BOOKS]
    (PUBLIC_DIR / "manifest.json").write_text(
        json.dumps(manifest, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )

    file_count = sum(len(item["files"]) for item in manifest)
    print(f"Published {file_count} classified solution PDFs to {PUBLIC_DIR}")


if __name__ == "__main__":
    main()
