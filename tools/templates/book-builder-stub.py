"""Template for a new Elite course PDF builder.

Copy to tools/<course_code>/build_<course_code>_books.py and replace every TODO.
The final production builder should create:
- classified question book,
- classified answer book,
- expertise question book,
- expertise answer book,
- paper-order worked-solution PDFs.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class CoursePalette:
    signature: str
    signature_deep: str
    accent: str = "#C0392B"
    ochre: str = "#C08A3E"
    paper: str = "#FFFFFF"


COURSE_CODE = "COURSE_TODO"
COURSE_TITLE = "Course Title TODO"
ROOT = Path(__file__).resolve().parents[2]
OUTPUT_DIR = ROOT / "downloads" / COURSE_CODE
PAPERS_DIR = OUTPUT_DIR / "Papers"
PALETTE = CoursePalette(signature="#TODO", signature_deep="#TODO")


def load_course_data() -> dict:
    """Load normalized questions and solutions for this course."""
    raise NotImplementedError("Connect this builder to the course source data.")


def student_solution_fields(solution: dict) -> dict:
    """Return only student-facing solution fields."""
    return {
        "steps": solution.get("steps", []),
        "finalAnswer": solution.get("finalAnswer", ""),
    }


def build_question_book(data: dict) -> Path:
    raise NotImplementedError


def build_answer_book(data: dict) -> Path:
    raise NotImplementedError


def build_expertise_books(data: dict) -> list[Path]:
    raise NotImplementedError


def build_paper_solution_books(data: dict) -> list[Path]:
    raise NotImplementedError


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    PAPERS_DIR.mkdir(parents=True, exist_ok=True)
    data = load_course_data()
    outputs = [
        build_question_book(data),
        build_answer_book(data),
        *build_expertise_books(data),
        *build_paper_solution_books(data),
    ]
    for output in outputs:
        print(output)


if __name__ == "__main__":
    main()
