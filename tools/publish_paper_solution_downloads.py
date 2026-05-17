"""
Publish generated past-paper worked-solution PDFs into the public site.

The source books are built privately by build_paper_solution_books.py. When
Dr Eslam explicitly chooses to publish those books, this tool mirrors them into
downloads/PastPaperSolutions/ and refreshes the Past Papers page from the
generated manifest.
"""

from __future__ import annotations

import argparse
import html
import json
import shutil
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parent.parent
PRIVATE_DIR = ROOT / "private_output" / "past_paper_solutions"
PUBLIC_DIR = ROOT / "downloads" / "PastPaperSolutions"
PASTPAPERS_HTML = ROOT / "pastpapers.html"

START_MARKER = "    <!-- PAST PAPER SOLUTION BOOKS:START -->"
END_MARKER = "    <!-- PAST PAPER SOLUTION BOOKS:END -->"

MONTH_ORDER = {
    "Jan": 1,
    "May": 5,
    "Jun": 6,
    "Nov": 11,
    "MayNov": 10,
}


def load_manifest() -> list[dict[str, Any]]:
    path = PRIVATE_DIR / "manifest.json"
    if not path.exists():
        raise FileNotFoundError(f"Missing manifest: {path}")
    return json.loads(path.read_text(encoding="utf-8"))


def sort_key(row: dict[str, Any]) -> tuple[int, int, str]:
    paper = row.get("paper", "")
    parts = paper.split()
    year = 0
    month = 0
    for part in parts:
        if part.isdigit() and len(part) == 4:
            year = int(part)
            break
    if parts:
        month = MONTH_ORDER.get(parts[0], 0)
    return (year, month, paper)


def card(row: dict[str, Any]) -> str:
    paper = html.escape(row["paper"])
    slug = html.escape(row["paperSlug"])
    code = html.escape(row.get("code") or "")
    questions = int(row.get("questionCount") or 0)
    pages = int(row.get("pageCount") or 0)
    href = f"downloads/PastPaperSolutions/{slug}_Solutions.pdf"
    pathway = "Modular" if row.get("isModular") else "Linear"
    unit = row.get("modularUnit") or "4MA1"
    chip = html.escape(str(unit))
    variant_class = "is-modular" if row.get("isModular") else "is-linear"
    return f"""        <a class="pp-solution-card {variant_class}" href="{href}" target="_blank" rel="noreferrer">
          <span class="pp-solution-topline">
            <span class="pp-solution-chip">{chip}</span>
            <span>{html.escape(pathway)} | {html.escape(code)}</span>
          </span>
          <strong>{paper}</strong>
          <span>{questions} solved questions | {pages} pages</span>
          <em>Open worked solutions -></em>
        </a>"""


def group_cards(rows: list[dict[str, Any]]) -> str:
    return "\n".join(card(row) for row in sorted(rows, key=sort_key, reverse=True))


def build_section(rows: list[dict[str, Any]]) -> str:
    linear = [row for row in rows if not row.get("isModular")]
    modular = [row for row in rows if row.get("isModular")]
    total_questions = sum(int(row.get("questionCount") or 0) for row in rows)
    total_pages = sum(int(row.get("pageCount") or 0) for row in rows)

    return f"""{START_MARKER}
    <section id="worked-solutions" class="pp-solutions-band" aria-labelledby="workedSolutionsTitle">
      <div class="pp-solutions-head">
        <span class="eyebrow">Worked Solutions</span>
        <h2 id="workedSolutionsTitle">Past-paper solution books.</h2>
        <p>Each PDF opens the full paper in order, with every question followed by a clean worked solution page.</p>
        <div class="pp-solution-stats" aria-label="Solution book summary">
          <span><strong>{len(rows)}</strong> books</span>
          <span><strong>{total_questions}</strong> solved questions</span>
          <span><strong>{total_pages}</strong> pages</span>
        </div>
      </div>

      <div class="pp-solution-group">
        <div class="pp-solution-group-head">
          <span class="pp-tag">Linear | 4MA1</span>
          <h3>Linear worked solutions</h3>
        </div>
        <div class="pp-solution-grid">
{group_cards(linear)}
        </div>
      </div>

      <div class="pp-solution-group">
        <div class="pp-solution-group-head">
          <span class="pp-tag gold">Modular | 4WM</span>
          <h3>Modular worked solutions</h3>
        </div>
        <div class="pp-solution-grid">
{group_cards(modular)}
        </div>
      </div>
    </section>
{END_MARKER}"""


def write_public_manifest(rows: list[dict[str, Any]]) -> None:
    public_rows = []
    for row in sorted(rows, key=sort_key, reverse=True):
        copy = dict(row)
        copy["pdf"] = f"downloads/PastPaperSolutions/{row['paperSlug']}_Solutions.pdf"
        public_rows.append(copy)
    (PUBLIC_DIR / "manifest.json").write_text(
        json.dumps(public_rows, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )


def copy_pdfs(rows: list[dict[str, Any]]) -> None:
    PUBLIC_DIR.mkdir(parents=True, exist_ok=True)
    for row in rows:
        src = PRIVATE_DIR / f"{row['paperSlug']}_Solutions.pdf"
        if not src.exists():
            raise FileNotFoundError(f"Missing solution PDF: {src}")
        shutil.copy2(src, PUBLIC_DIR / src.name)
    write_public_manifest(rows)


def replace_solution_section(section: str) -> None:
    html_text = PASTPAPERS_HTML.read_text(encoding="utf-8")
    if START_MARKER in html_text and END_MARKER in html_text:
        before = html_text.split(START_MARKER, 1)[0]
        after = html_text.split(END_MARKER, 1)[1]
        html_text = before + section + after
    else:
        anchor = "    <!-- ==========================================\n         LINEAR | 4MA1"
        if anchor not in html_text:
            raise ValueError("Could not find insertion point in pastpapers.html")
        html_text = html_text.replace(anchor, section + "\n\n" + anchor, 1)

    solutions_button = '        <a class="button light" href="#worked-solutions">Worked solutions -></a>\n'
    if 'href="#worked-solutions"' not in html_text:
        html_text = html_text.replace(
            '        <a class="button light" href="#modular">Modular (4WM) -></a>\n',
            '        <a class="button light" href="#modular">Modular (4WM) -></a>\n' + solutions_button,
            1,
        )
    PASTPAPERS_HTML.write_text(html_text, encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--no-copy", action="store_true", help="Only refresh the HTML section")
    args = parser.parse_args()

    rows = load_manifest()
    if not rows:
        raise ValueError("Past-paper solution manifest is empty")
    if not args.no_copy:
        copy_pdfs(rows)
    replace_solution_section(build_section(rows))
    print(f"Published {len(rows)} solution books to {PUBLIC_DIR}")


if __name__ == "__main__":
    main()
