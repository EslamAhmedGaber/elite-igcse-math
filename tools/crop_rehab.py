"""
Non-destructive crop rehabilitation for existing question images.

This tool rebuilds candidate crops from the original paper PDF and writes them
under private_output/crop_rehab/<paper_slug>/ for visual review. It does not
replace live assets unless --apply is passed.
"""

from __future__ import annotations

import argparse
import io
import json
import re
import shutil
from dataclasses import dataclass
from pathlib import Path

import fitz
from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parent.parent
DATA_QUESTIONS = ROOT / "src" / "data" / "questions"
QUESTION_ASSETS = ROOT / "assets" / "questions"
OUTPUT_ROOT = ROOT / "private_output" / "crop_rehab"

DEFAULT_SOURCE_ROOTS = [
    Path(r"D:\Tyro4_Latex\0 Mathematics\OL\PastPapers"),
    ROOT / "downloads" / "PastPapers",
]

QUESTION_TOTAL_RE = re.compile(r"Total for Question\s+(\d+)\s+is\s+(\d+)\s+marks?", re.IGNORECASE)
QUESTION_START_RE = re.compile(r"^\s*(\d+)\s+\S", re.DOTALL)

RENDER_ZOOM = 2.0
X0 = 60.0
X1 = 556.5
CONTINUATION_BOTTOM_PAD = 42.0
MULTI_PAGE_GAP = 18
TARGET_WIDTH = 993


@dataclass
class Block:
    q: int
    marks: int
    start_page: int
    start_y: float
    end_page: int
    end_y: float


def load_paper(slug: str) -> dict:
    path = DATA_QUESTIONS / f"{slug}.json"
    if not path.exists():
        raise FileNotFoundError(f"Missing paper data: {path}")
    return json.loads(path.read_text(encoding="utf-8"))


def all_question_rows(paper: dict) -> list[dict]:
    rows = [row for row in paper["questions"] if row.get("bank") == "all"]
    return sorted(rows, key=lambda row: int(row["q"]))


def find_pdf(paper: dict, explicit_pdf: str | None) -> Path:
    if explicit_pdf:
        pdf = Path(explicit_pdf)
        if not pdf.exists():
            raise FileNotFoundError(f"PDF not found: {pdf}")
        return pdf

    expected = f"{paper['paper']}.pdf"
    for root in DEFAULT_SOURCE_ROOTS:
        if not root.exists():
            continue
        matches = sorted(root.rglob(expected))
        if matches:
            return matches[0]

    raise FileNotFoundError(
        f"Could not find {expected}. Pass --pdf with the original paper path."
    )


def locate_question_starts(doc: fitz.Document) -> dict[int, tuple[int, float]]:
    starts: dict[int, tuple[int, float]] = {}
    for page_num in range(len(doc)):
        page = doc.load_page(page_num)
        for block in page.get_text("blocks"):
            text = re.sub(r"\s+", " ", block[4]).strip()
            x0, y0 = float(block[0]), float(block[1])
            if x0 >= 90 or y0 >= 760:
                continue
            match = QUESTION_START_RE.match(text)
            if not match and text.isdigit():
                match = re.match(r"^(\d+)$", text)
            if not match:
                continue
            q_num = int(match.group(1))
            candidate = (page_num, y0)
            previous = starts.get(q_num)
            if previous is None or candidate < previous:
                starts[q_num] = candidate
    return starts


def locate_blocks(doc: fitz.Document) -> dict[int, Block]:
    footers: list[tuple[int, int, int, float, float]] = []
    for page_num in range(len(doc)):
        page = doc.load_page(page_num)
        for block in page.get_text("blocks"):
            for match in QUESTION_TOTAL_RE.finditer(block[4]):
                footers.append(
                    (
                        int(match.group(1)),
                        int(match.group(2)),
                        page_num,
                        float(block[1]),
                        float(block[3]),
                    )
                )

    footers.sort(key=lambda item: item[0])
    starts = locate_question_starts(doc)
    blocks: dict[int, Block] = {}
    for index, (q, marks, end_page, footer_y0, footer_y1) in enumerate(footers):
        anchor = starts.get(q)
        if anchor is not None:
            start_page, start_y = anchor
            start_y = max(0.0, start_y - 4)
        elif index == 0:
            start_page = 2 if len(doc) > 2 else 0
            start_y = 0.0
        else:
            prev_end_page = footers[index - 1][2]
            prev_footer_y1 = footers[index - 1][4]
            start_page = prev_end_page
            start_y = prev_footer_y1 + 4
            prev_page = doc.load_page(prev_end_page)
            if prev_footer_y1 + 25 >= prev_page.rect.height:
                start_page = prev_end_page + 1
                start_y = 0.0
        blocks[q] = Block(q, marks, start_page, start_y, end_page, footer_y1 + 6)
    return blocks


def render_block(doc: fitz.Document, block: Block) -> Image.Image:
    matrix = fitz.Matrix(RENDER_ZOOM, RENDER_ZOOM)
    fragments: list[Image.Image] = []
    for page_num in range(block.start_page, block.end_page + 1):
        page = doc.load_page(page_num)
        page_bottom = page.rect.height - CONTINUATION_BOTTOM_PAD
        if page_num == block.start_page and page_num == block.end_page:
            clip = fitz.Rect(X0, block.start_y, X1, block.end_y)
        elif page_num == block.start_page:
            clip = fitz.Rect(X0, block.start_y, X1, page_bottom)
        elif page_num == block.end_page:
            clip = fitz.Rect(X0, 0, X1, block.end_y)
        else:
            clip = fitz.Rect(X0, 0, X1, page_bottom)
        clip = clip & page.rect
        if clip.is_empty or clip.height < 10:
            continue
        pix = page.get_pixmap(matrix=matrix, clip=clip, alpha=False)
        fragments.append(Image.open(io.BytesIO(pix.tobytes("png"))).convert("RGB"))

    if not fragments:
        raise RuntimeError(f"Q{block.q}: no renderable crop fragments")
    if len(fragments) == 1:
        return fragments[0]

    width = max(fragment.width for fragment in fragments)
    height = sum(fragment.height for fragment in fragments) + MULTI_PAGE_GAP * (len(fragments) - 1)
    combined = Image.new("RGB", (width, height), "white")
    y = 0
    for fragment in fragments:
        combined.paste(fragment, ((width - fragment.width) // 2, y))
        y += fragment.height + MULTI_PAGE_GAP
    return combined


def image_metrics(path: Path) -> dict:
    with Image.open(path) as image:
        width, height = image.size
    return {"width": width, "height": height}


def expected_pages(filename: str) -> tuple[int, int] | None:
    match = re.search(r"__p(\d+)-(\d+)__", filename)
    if not match:
        return None
    return int(match.group(1)), int(match.group(2))


def resize_old_crop(old_path: Path) -> Image.Image:
    old_image = Image.open(old_path).convert("RGB")
    width, height = old_image.size
    new_height = max(1, int(round(height * TARGET_WIDTH / width)))
    return old_image.resize((TARGET_WIDTH, new_height), Image.Resampling.LANCZOS)


def candidate_is_safe(block: Block, old_metrics: dict, candidate: Image.Image, row: dict) -> tuple[bool, list[str]]:
    reasons: list[str] = []
    pages = expected_pages(row["filename"])
    if pages:
        actual_pages = (block.start_page + 1, block.end_page + 1)
        if actual_pages != pages:
            reasons.append(f"page mismatch expected {pages[0]}-{pages[1]}, got {actual_pages[0]}-{actual_pages[1]}")

    old_height = int(old_metrics["height"])
    if candidate.height > old_height * 1.25:
        reasons.append(f"candidate too tall ({candidate.height}px vs old {old_height}px)")
    if candidate.height < old_height * 0.45:
        reasons.append(f"candidate too short ({candidate.height}px vs old {old_height}px)")
    if candidate.width != TARGET_WIDTH:
        reasons.append(f"unexpected width {candidate.width}px")

    return not reasons, reasons


def build_contact_sheet(rows: list[dict], out_dir: Path) -> Path:
    candidates = out_dir / "candidates"
    sheet_path = out_dir / "comparison_contact.jpg"
    thumb_width = 220
    pair_gap = 10
    cell_gap = 22
    label_height = 36
    cols = 2
    cells: list[tuple[str, Image.Image, Image.Image]] = []

    for row in rows:
        filename = row["filename"]
        old_path = QUESTION_ASSETS / filename
        new_path = candidates / filename
        old_image = Image.open(old_path).convert("RGB")
        new_image = Image.open(new_path).convert("RGB")
        old_thumb = old_image.resize(
            (thumb_width, max(1, int(old_image.height * thumb_width / old_image.width))),
            Image.Resampling.LANCZOS,
        )
        new_thumb = new_image.resize(
            (thumb_width, max(1, int(new_image.height * thumb_width / new_image.width))),
            Image.Resampling.LANCZOS,
        )
        method = row.get("rehabMethod", "candidate")
        label = f"Q{row['q']:02d}  old | {method}"
        cells.append((label, old_thumb, new_thumb))

    cell_width = thumb_width * 2 + pair_gap
    row_heights: list[int] = []
    for start in range(0, len(cells), cols):
        chunk = cells[start : start + cols]
        row_heights.append(max(max(old.height, new.height) for _, old, new in chunk) + label_height)

    width = cols * cell_width + (cols + 1) * cell_gap
    height = sum(row_heights) + (len(row_heights) + 1) * cell_gap
    sheet = Image.new("RGB", (width, height), "white")
    draw = ImageDraw.Draw(sheet)

    y = cell_gap
    for row_index, start in enumerate(range(0, len(cells), cols)):
        chunk = cells[start : start + cols]
        x = cell_gap
        for label, old_thumb, new_thumb in chunk:
            draw.text((x, y), label, fill=(20, 20, 20))
            top = y + label_height
            sheet.paste(old_thumb, (x, top))
            sheet.paste(new_thumb, (x + thumb_width + pair_gap, top))
            draw.rectangle(
                [x - 2, top - 2, x + thumb_width - 1, top + old_thumb.height + 1],
                outline=(190, 190, 190),
            )
            draw.rectangle(
                [
                    x + thumb_width + pair_gap - 2,
                    top - 2,
                    x + thumb_width * 2 + pair_gap - 1,
                    top + new_thumb.height + 1,
                ],
                outline=(12, 118, 110),
            )
            x += cell_width + cell_gap
        y += row_heights[row_index] + cell_gap

    sheet.save(sheet_path, quality=92)
    return sheet_path


def build_rehab(slug: str, explicit_pdf: str | None, apply: bool) -> dict:
    paper = load_paper(slug)
    rows = all_question_rows(paper)
    pdf = find_pdf(paper, explicit_pdf)
    out_dir = OUTPUT_ROOT / slug
    candidates = out_dir / "candidates"
    backup = out_dir / "backup_before_apply"
    candidates.mkdir(parents=True, exist_ok=True)

    summary_rows: list[dict] = []
    with fitz.open(pdf) as doc:
        blocks = locate_blocks(doc)
        missing = [row["q"] for row in rows if int(row["q"]) not in blocks]
        if missing:
            raise RuntimeError(f"Could not locate crop blocks for questions: {missing}")

        for row in rows:
            q = int(row["q"])
            filename = row["filename"]
            old_path = QUESTION_ASSETS / filename
            new_path = candidates / filename
            old_metrics = image_metrics(old_path)
            pdf_candidate = render_block(doc, blocks[q])
            safe, reasons = candidate_is_safe(blocks[q], old_metrics, pdf_candidate, row)
            if safe:
                image = pdf_candidate
                method = "pdf"
            else:
                image = resize_old_crop(old_path)
                method = "fallback"
            image.save(new_path, optimize=True)
            new_metrics = image_metrics(new_path)
            row["rehabMethod"] = method
            summary_rows.append(
                {
                    "q": q,
                    "filename": filename,
                    "method": method,
                    "reasons": reasons,
                    "expectedPages": expected_pages(filename),
                    "detectedPages": [blocks[q].start_page + 1, blocks[q].end_page + 1],
                    "old": old_metrics,
                    "new": new_metrics,
                    "height_delta": new_metrics["height"] - old_metrics["height"],
                    "width_delta": new_metrics["width"] - old_metrics["width"],
                }
            )

    contact_sheet = build_contact_sheet(rows, out_dir)

    if apply:
        backup.mkdir(parents=True, exist_ok=True)
        for row in rows:
            filename = row["filename"]
            old_path = QUESTION_ASSETS / filename
            new_path = candidates / filename
            shutil.copy2(old_path, backup / filename)
            shutil.copy2(new_path, old_path)

    summary = {
        "paper": paper["paper"],
        "paperSlug": slug,
        "sourcePdf": str(pdf),
        "questionCount": len(rows),
        "outputDir": str(out_dir),
        "contactSheet": str(contact_sheet),
        "applied": apply,
        "rows": summary_rows,
    }
    (out_dir / "summary.json").write_text(
        json.dumps(summary, ensure_ascii=True, indent=2) + "\n",
        encoding="utf-8",
    )
    return summary


def main() -> None:
    parser = argparse.ArgumentParser(description="Build safe candidate recrops for one paper.")
    parser.add_argument("--paper", required=True, help="Paper slug, e.g. Jan2020_P1H")
    parser.add_argument("--pdf", help="Optional source PDF path")
    parser.add_argument("--apply", action="store_true", help="Replace live assets after building candidates")
    args = parser.parse_args()

    summary = build_rehab(args.paper, args.pdf, args.apply)
    print(f"Paper: {summary['paper']}")
    print(f"Questions: {summary['questionCount']}")
    print(f"Source PDF: {summary['sourcePdf']}")
    print(f"Candidates: {Path(summary['outputDir']) / 'candidates'}")
    print(f"Contact sheet: {summary['contactSheet']}")
    print(f"Applied to live assets: {summary['applied']}")


if __name__ == "__main__":
    main()
