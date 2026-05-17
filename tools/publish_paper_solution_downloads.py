"""
Publish generated past-paper worked-solution PDFs into the public site.

The source books are built by build_paper_solution_books.py. When Dr Eslam
publishes them, this tool mirrors the PDFs into downloads/PastPaperSolutions/
and places each solution button directly beside its matching past-paper button.
"""

from __future__ import annotations

import argparse
import json
import re
import shutil
from pathlib import Path
from typing import Any
from urllib.parse import unquote


ROOT = Path(__file__).resolve().parent.parent
PRIVATE_DIR = ROOT / "private_output" / "past_paper_solutions"
PUBLIC_DIR = ROOT / "downloads" / "PastPaperSolutions"
PASTPAPERS_HTML = ROOT / "pastpapers.html"

START_MARKER = "    <!-- PAST PAPER SOLUTION BOOKS:START -->"
END_MARKER = "    <!-- PAST PAPER SOLUTION BOOKS:END -->"


def load_manifest() -> list[dict[str, Any]]:
    private_manifest = PRIVATE_DIR / "manifest.json"
    public_manifest = PUBLIC_DIR / "manifest.json"
    path = private_manifest if private_manifest.exists() else public_manifest
    if not path.exists():
        raise FileNotFoundError(f"Missing solution manifest: {private_manifest}")
    return json.loads(path.read_text(encoding="utf-8"))


def write_public_manifest(rows: list[dict[str, Any]]) -> None:
    public_rows = []
    for row in rows:
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


def remove_old_solution_section(html_text: str) -> str:
    if START_MARKER in html_text and END_MARKER in html_text:
        before = html_text.split(START_MARKER, 1)[0]
        after = html_text.split(END_MARKER, 1)[1]
        html_text = before + after.lstrip("\n")
    html_text = re.sub(
        r"\n\s*<a class=\"button light\" href=\"#worked-solutions\">Worked solutions -&gt;</a>",
        "",
        html_text,
    )
    html_text = re.sub(
        r"\n\s*<a class=\"button light\" href=\"#worked-solutions\">Worked solutions -></a>",
        "",
        html_text,
    )
    return html_text


def strip_inline_solution_links(html_text: str) -> str:
    return re.sub(
        r"\n\s*<a class=\"pp-paper solution\" href=\"downloads/PastPaperSolutions/[^\"]+\" target=\"_blank\" rel=\"noreferrer\"><span>[^<]+</span></a>",
        "",
        html_text,
    )


def linear_paper_key(href: str) -> str | None:
    if "/PastPapers/Linear/" not in href:
        return None
    filename = unquote(href.rsplit("/", 1)[-1])
    return filename[:-4] if filename.lower().endswith(".pdf") else filename


def modular_paper_key(session: str | None, unit_code: str | None, label: str) -> str | None:
    if not session or not unit_code:
        return None
    code = unit_code
    if "R variant" in label and not code.endswith("R"):
        code = f"{code}R"
    return f"{session} {code}"


def solution_label(row: dict[str, Any], paper_label: str) -> str:
    if row.get("isModular"):
        return "R Solution" if "R variant" in paper_label else "Solution"
    code = str(row.get("code") or "").removeprefix("P")
    return f"Solution {code}" if code else "Solution"


def solution_anchor(row: dict[str, Any], label: str, indent: str) -> str:
    href = f"downloads/PastPaperSolutions/{row['paperSlug']}_Solutions.pdf"
    return (
        f'{indent}<a class="pp-paper solution" href="{href}" target="_blank" '
        f'rel="noreferrer"><span>{label}</span></a>'
    )


def place_inline_solution_links(html_text: str, rows: list[dict[str, Any]]) -> str:
    by_paper = {str(row["paper"]): row for row in rows}
    lines = strip_inline_solution_links(remove_old_solution_section(html_text)).splitlines()
    output: list[str] = []
    current_session: str | None = None
    current_unit_code: str | None = None

    for line in lines:
        unit_match = re.search(r"<h3>Unit [12] \| (4WM[12]H)</h3>", line)
        if unit_match:
            current_unit_code = unit_match.group(1)

        session_match = re.search(r"<strong>([^<]+)</strong>", line)
        if session_match:
            current_session = session_match.group(1).strip()

        output.append(line)

        if 'class="pp-paper"' not in line or 'class="pp-paper solution"' in line:
            continue

        href_match = re.search(r'href="([^"]+)"', line)
        label_match = re.search(r"<span>([^<]+)</span>", line)
        if not href_match or not label_match:
            continue

        href = href_match.group(1)
        paper_label = label_match.group(1)
        paper_key = linear_paper_key(href)
        if paper_key is None and "/PastPapers/Modular/" in href:
            paper_key = modular_paper_key(current_session, current_unit_code, paper_label)
        if not paper_key:
            continue

        row = by_paper.get(paper_key)
        if not row:
            continue

        indent = re.match(r"^\s*", line).group(0) if re.match(r"^\s*", line) else ""
        output.append(solution_anchor(row, solution_label(row, paper_label), indent))

    html_text = "\n".join(output) + "\n"
    html_text = html_text.replace(
        "Newest first. Click any paper to download the PDF.",
        "Newest first. Download the paper, then open its worked solution beside it.",
    )
    html_text = html_text.replace(
        "Two units, taken separately. Newest first.",
        "Two units, taken separately. Each paper has its matching worked solution beside it.",
    )
    return html_text


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--no-copy", action="store_true", help="Only refresh the HTML links")
    args = parser.parse_args()

    rows = load_manifest()
    if not rows:
        raise ValueError("Past-paper solution manifest is empty")
    if not args.no_copy:
        copy_pdfs(rows)

    html_text = PASTPAPERS_HTML.read_text(encoding="utf-8")
    PASTPAPERS_HTML.write_text(place_inline_solution_links(html_text, rows), encoding="utf-8")
    print(f"Published {len(rows)} solution books inline on {PASTPAPERS_HTML}")


if __name__ == "__main__":
    main()
