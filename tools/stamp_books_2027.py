"""Point every link to a rebuilt 2027-design book at ?v=books2027 (cache-bust) and refresh the two solution
manifests (page counts, sizes, links) from the actual PDFs. Safe to re-run.
python tools/stamp_books_2027.py
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
V = "books2027"
BOOK = re.compile(
    r"(downloads/(?:IAL/W[A-Z0-9]+/(?:Papers/)?[A-Za-z0-9_${}.]*?(?:Solutions|Classified_Questions|Classified_With_Answers|Expertise_Questions|Expertise_With_Answers)"
    r"|PastPaperSolutions/[A-Za-z0-9_${}.-]+|ClassifiedSolutions/[A-Za-z0-9_${}.-]+?"
    r"|classified_problems|Classified_Expertise|Classified_4WM[12](?:_Expertise)?)\.pdf)(\?v=[A-Za-z0-9._${}-]+)?"
)


def stamp(text: str) -> str:
    return BOOK.sub(lambda m: f"{m.group(1)}?v={V}", text)


def pages(pdf: Path) -> int:
    import fitz
    with fitz.open(pdf) as doc:
        return doc.page_count


def main() -> None:
    changed = []
    for path in ROOT.rglob("*"):
        rel = path.relative_to(ROOT).parts
        if path.suffix not in (".html", ".js") or not path.is_file() or rel[0] in ("downloads", "private_output", "tools", "node_modules", ".git"):
            continue
        text = path.read_text(encoding="utf-8", errors="surrogateescape")
        new = stamp(text)
        if new != text:
            path.write_text(new, encoding="utf-8", errors="surrogateescape")
            changed.append("/".join(rel))
    # manifests
    pp = ROOT / "downloads" / "PastPaperSolutions" / "manifest.json"
    rows = json.loads(pp.read_text(encoding="utf-8"))
    for row in rows:
        pdf = ROOT / row["pdf"].split("?")[0]
        if pdf.exists():
            row["pageCount"] = pages(pdf)
    pp.write_text(json.dumps(rows, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    cs = ROOT / "downloads" / "ClassifiedSolutions" / "manifest.json"
    books = json.loads(cs.read_text(encoding="utf-8"))
    for book in books:
        if "questionBook" in book:
            book["questionBook"] = stamp(book["questionBook"])
        for f in book.get("files", []):
            f["href"] = stamp(f["href"])
            pdf = ROOT / f["href"].split("?")[0]
            if pdf.exists():
                f["sizeBytes"] = pdf.stat().st_size
                if "pageCount" in f:
                    f["pageCount"] = pages(pdf)
    cs.write_text(json.dumps(books, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"stamped {len(changed)} files: {', '.join(changed)}")


if __name__ == "__main__":
    main()
