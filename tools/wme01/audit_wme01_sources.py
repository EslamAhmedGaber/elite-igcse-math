from __future__ import annotations

import json
import re
from pathlib import Path

import fitz


ROOT = Path(__file__).resolve().parents[2]
SOURCE_DIR = Path(r"D:\Tyro4_Latex\0 Mathematics\Mechanics 1\final Exam")
OUT_PATH = ROOT / "private_output" / "wme01_source_audit.json"

QP_RE = re.compile(r"IAL_MATHS_(\d{4})_([A-Za-z]+)_M1_QP\.pdf$", re.IGNORECASE)
MS_RE = re.compile(r"IAL_MATHS_(\d{4})_([A-Za-z]+)_M1_MS\.pdf$", re.IGNORECASE)
TOTAL_RE = re.compile(r"Total for Question\s+(\d+)\s+is\s+(\d+)\s+marks?", re.IGNORECASE)
LEGACY_TOTAL_RE = re.compile(r"\(?\s*Total\s+(\d+)\s+marks?\s*\)?", re.IGNORECASE)


def paper_slug(year: str, session: str) -> str:
    return f"WME01_{year}_{session}"


def page_text(path: Path, max_pages: int | None = None) -> str:
    chunks: list[str] = []
    with fitz.open(path) as doc:
        limit = len(doc) if max_pages is None else min(len(doc), max_pages)
        for index in range(limit):
            chunks.append(doc.load_page(index).get_text())
    return "\n".join(chunks)


def question_totals(path: Path) -> list[dict[str, int]]:
    rows: list[dict[str, int]] = []
    text = page_text(path)
    for match in TOTAL_RE.finditer(text):
        rows.append({"q": int(match.group(1)), "marks": int(match.group(2))})
    if rows:
        return rows
    for index, match in enumerate(LEGACY_TOTAL_RE.finditer(text), 1):
        rows.append({"q": index, "marks": int(match.group(1))})
    return rows


def first_page_title(path: Path) -> str:
    text = re.sub(r"\s+", " ", page_text(path, max_pages=1)).strip()
    return text[:500]


def main() -> int:
    qps: dict[str, dict] = {}
    schemes: dict[str, Path] = {}

    for path in sorted(SOURCE_DIR.glob("IAL_MATHS_*_M1_*.pdf")):
        qp_match = QP_RE.match(path.name)
        if qp_match:
            slug = paper_slug(*qp_match.groups())
            qps[slug] = {
                "slug": slug,
                "questionPaper": str(path),
                "markScheme": "",
                "hasMarkScheme": False,
                "titlePreview": first_page_title(path),
                "questionTotals": question_totals(path),
            }
            continue
        ms_match = MS_RE.match(path.name)
        if ms_match:
            schemes[paper_slug(*ms_match.groups())] = path

    for slug, row in qps.items():
        scheme = schemes.get(slug)
        if scheme:
            row["markScheme"] = str(scheme)
            row["hasMarkScheme"] = True

    rows = list(sorted(qps.values(), key=lambda item: item["slug"]))
    report = {
        "sourceDir": str(SOURCE_DIR),
        "paperCount": len(rows),
        "pairedCount": sum(1 for row in rows if row["hasMarkScheme"]),
        "missingMarkSchemes": [row["slug"] for row in rows if not row["hasMarkScheme"]],
        "papers": rows,
    }
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({
        "paperCount": report["paperCount"],
        "pairedCount": report["pairedCount"],
        "missingMarkSchemes": report["missingMarkSchemes"],
        "out": str(OUT_PATH),
    }, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
