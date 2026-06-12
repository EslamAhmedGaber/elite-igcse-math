from __future__ import annotations

import argparse
import io
import json
import re
from dataclasses import asdict, dataclass
from pathlib import Path

import fitz
from PIL import Image, ImageChops, ImageDraw, ImageOps


ROOT = Path(__file__).resolve().parents[2]
DEFAULT_OUT = ROOT / "private_output" / "wme01_crop_review"
QUESTION_TOTAL_RE = re.compile(r"Total for Question\s+(\d+)\s+is\s+(\d+)\s+marks?", re.IGNORECASE)
LEGACY_TOTAL_RE = re.compile(r"\(?\s*Total\s+(\d+)\s+marks?\s*\)?", re.IGNORECASE)
QUESTION_START_RE = re.compile(r"^\s*(?:Leave\s+blank\s+)?(\d{1,2})[\.:]\s*(?:\S|$)", re.IGNORECASE | re.DOTALL)

RENDER_ZOOM = 2.0
CONTENT_X0 = 38.0
CONTENT_X1_PAD = 78.0
CONTINUATION_BOTTOM_PAD = 34.0
MULTI_PAGE_GAP = 20
IMAGE_BORDER = 34
QUESTION_TOP_PAD = 28.0
TEXT_TOP_PAD = 18.0
TEXT_BOTTOM_PAD = 24.0
DRAWING_PAD = 12.0


@dataclass
class Block:
    q: int
    marks: int
    start_page: int
    start_y: float
    end_page: int
    end_y: float
    text: str = ""
    filename: str = ""


def text_lines(page: fitz.Page) -> list[tuple[float, float, float, float, str]]:
    rows: list[tuple[float, float, float, float, str]] = []
    page_dict = page.get_text("dict")
    for block in page_dict.get("blocks", []):
        if block.get("type") != 0:
            continue
        for line in block.get("lines", []):
            text = "".join(span.get("text", "") for span in line.get("spans", []))
            if not text.strip():
                continue
            x0, y0, x1, y1 = (float(value) for value in line["bbox"])
            rows.append((x0, y0, x1, y1, text))
    return rows


def paper_slug_from_filename(path: Path) -> str:
    match = re.match(r"IAL_MATHS_(\d{4})_([A-Za-z]+)_M1_QP\.pdf$", path.name, re.IGNORECASE)
    if match:
        year, session = match.groups()
        return f"WME01_{year}_{session}"
    return path.stem


def locate_question_starts(doc: fitz.Document) -> dict[int, tuple[int, float]]:
    starts: dict[int, tuple[int, float]] = {}
    for page_num in range(len(doc)):
        page = doc.load_page(page_num)
        for block in page.get_text("blocks"):
            text = re.sub(r"\s+", " ", block[4]).strip()
            x0, y0 = float(block[0]), float(block[1])
            if x0 >= 85 or y0 >= 760:
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


def locate_blocks(doc: fitz.Document) -> list[Block]:
    footers: list[tuple[int, int, int, float, float]] = []
    legacy_footers: list[tuple[int, int, int, float, float]] = []
    for page_num in range(len(doc)):
        page = doc.load_page(page_num)
        for _x0, y0, _x1, y1, text in text_lines(page):
            for match in QUESTION_TOTAL_RE.finditer(text):
                footers.append((int(match.group(1)), int(match.group(2)), page_num, y0, y1))
            for match in LEGACY_TOTAL_RE.finditer(text):
                legacy_footers.append((0, int(match.group(1)), page_num, y0, y1))
        for block in page.get_text("blocks"):
            for match in QUESTION_TOTAL_RE.finditer(block[4]):
                if any(existing[2] == page_num and abs(existing[3] - float(block[1])) < 1 for existing in footers):
                    continue
                footers.append(
                    (
                        int(match.group(1)),
                        int(match.group(2)),
                        page_num,
                        float(block[1]),
                        float(block[3]),
                    )
                )
            for match in LEGACY_TOTAL_RE.finditer(block[4]):
                if any(existing[2] == page_num for existing in legacy_footers):
                    continue
                legacy_footers.append(
                    (
                        0,
                        int(match.group(1)),
                        page_num,
                        float(block[1]),
                        float(block[3]),
                    )
                )

    footers.sort(key=lambda row: row[0])
    if not footers and legacy_footers:
        legacy_footers.sort(key=lambda row: (row[2], row[3]))
        footers = [(index + 1, row[1], row[2], row[3], row[4]) for index, row in enumerate(legacy_footers)]
    if not footers:
        raise RuntimeError("No Pearson question footers were found.")

    starts = locate_question_starts(doc)
    blocks: list[Block] = []
    for index, (q, marks, end_page, _footer_y0, footer_y1) in enumerate(footers):
        anchor = starts.get(q)
        if anchor is not None:
            start_page, start_y = anchor
            start_y = max(0.0, start_y - QUESTION_TOP_PAD)
        elif index == 0:
            start_page = min(2, len(doc) - 1)
            start_y = 0.0
        else:
            previous_end_page = footers[index - 1][2]
            previous_footer_y1 = footers[index - 1][4]
            start_page = previous_end_page
            start_y = previous_footer_y1 + 4
            previous_page = doc.load_page(previous_end_page)
            if previous_footer_y1 + 25 >= previous_page.rect.height:
                start_page = min(previous_end_page + 1, len(doc) - 1)
                start_y = 0.0
        blocks.append(Block(q=q, marks=marks, start_page=start_page, start_y=start_y, end_page=end_page, end_y=footer_y1 + 8))
    return blocks


def trim_whitespace(image: Image.Image) -> Image.Image:
    background = Image.new(image.mode, image.size, "white")
    diff = ImageChops.difference(image, background)
    bbox = diff.getbbox()
    if not bbox:
        return image
    return image.crop(bbox)


def render_block(doc: fitz.Document, block: Block) -> Image.Image:
    matrix = fitz.Matrix(RENDER_ZOOM, RENDER_ZOOM)
    parts: list[Image.Image] = []
    for page_num in range(block.start_page, block.end_page + 1):
        page = doc.load_page(page_num)
        for clip in content_clips_for_page(page, page_num, block):
            clip = clip & page.rect
            if clip.is_empty or clip.height < 10:
                continue
            pix = page.get_pixmap(matrix=matrix, clip=clip, alpha=False)
            parts.append(Image.open(io.BytesIO(pix.tobytes("png"))).convert("RGB"))

    if not parts:
        raise RuntimeError(f"Q{block.q}: no renderable crop fragments")
    if len(parts) == 1:
        stitched = parts[0]
    else:
        width = max(part.width for part in parts)
        height = sum(part.height for part in parts) + MULTI_PAGE_GAP * (len(parts) - 1)
        stitched = Image.new("RGB", (width, height), "white")
        y = 0
        for part in parts:
            stitched.paste(part, ((width - part.width) // 2, y))
            y += part.height + MULTI_PAGE_GAP

    return ImageOps.expand(trim_whitespace(stitched), border=IMAGE_BORDER, fill="white")


def full_page_clip(page: fitz.Page, page_num: int, block: Block) -> fitz.Rect:
    page_bottom = page.rect.height - CONTINUATION_BOTTOM_PAD
    if page_num == block.start_page and page_num == block.end_page:
        return fitz.Rect(CONTENT_X0, block.start_y, page.rect.width - CONTENT_X1_PAD, block.end_y)
    if page_num == block.start_page:
        return fitz.Rect(CONTENT_X0, block.start_y, page.rect.width - CONTENT_X1_PAD, page_bottom)
    if page_num == block.end_page:
        return fitz.Rect(CONTENT_X0, 0, page.rect.width - CONTENT_X1_PAD, block.end_y)
    return fitz.Rect(CONTENT_X0, 0, page.rect.width - CONTENT_X1_PAD, page_bottom)


def is_noise_text(text: str, q: int) -> bool:
    clean = re.sub(r"\s+", " ", text).strip()
    if not clean:
        return True
    if re.fullmatch(r"_+", clean.replace(" ", "")):
        return True
    lowered = clean.lower()
    if re.fullmatch(r"\(\s*\d+\s*\)", clean):
        return False
    if QUESTION_TOTAL_RE.search(clean) or LEGACY_TOTAL_RE.search(clean):
        without_total = QUESTION_TOTAL_RE.sub(" ", LEGACY_TOTAL_RE.sub(" ", clean)).strip()
        if not without_total or re.fullmatch(r"[_\s\W]*", without_total):
            return True
    if "do not write in this area" in lowered:
        return True
    if "turn over" in lowered:
        return True
    if lowered in {"leave", "leave blank", "blank"}:
        return True
    if lowered in {"answer all questions"}:
        return True
    if re.search(rf"\bquestion\s+{q}\s+continued\b", lowered):
        return True
    if re.fullmatch(r"\*?p\d+[a-z]*\d+\*?", lowered):
        return True
    if re.fullmatch(r"[\d\s\uf0a2ï‚¢]+", clean):
        return True
    scrubbed = lowered
    scrubbed = re.sub(rf"\bquestion\s+{q}\s+continued\b", " ", scrubbed)
    scrubbed = scrubbed.replace("leave blank", " ")
    scrubbed = scrubbed.replace("turn over", " ")
    scrubbed = scrubbed.replace("do not write in this area", " ")
    scrubbed = QUESTION_TOTAL_RE.sub(" ", scrubbed)
    scrubbed = LEGACY_TOTAL_RE.sub(" ", scrubbed)
    scrubbed = re.sub(r"\*?p\d+[a-z]*\d+\*?", " ", scrubbed)
    scrubbed = re.sub(r"[_\s\d\W]+", " ", scrubbed).strip()
    if not scrubbed:
        return True
    alpha_count = len(re.findall(r"[A-Za-z]", scrubbed))
    if clean.count("_") > 60 and alpha_count < 12:
        return True
    return False


def is_answer_line_text(text: str) -> bool:
    clean = re.sub(r"\s+", "", text)
    return len(clean) > 24 and set(clean) <= {"_"}


def merge_ranges(ranges: list[tuple[float, float]], gap: float = 22.0) -> list[tuple[float, float]]:
    if not ranges:
        return []
    ranges = sorted(ranges)
    merged = [ranges[0]]
    for start, end in ranges[1:]:
        prev_start, prev_end = merged[-1]
        if start - prev_end <= gap:
            merged[-1] = (prev_start, max(prev_end, end))
        else:
            merged.append((start, end))
    return merged


def is_useful_drawing(rect: fitz.Rect, base: fitz.Rect) -> bool:
    overlap_width = min(rect.x1, base.x1) - max(rect.x0, base.x0)
    if overlap_width < 6:
        return False
    if rect.width > base.width * 0.85 and rect.height > base.height * 0.75:
        return False
    if rect.height > base.height * 0.70 and rect.width < 24:
        return False
    if rect.y0 > base.y1 - 90 and rect.width < 55 and rect.height < 55:
        return False
    if rect.width > 40 and rect.height < 5 and (rect.y0 < 45 or rect.y0 > base.y1 - 20):
        return False
    return True


def content_clips_for_page(page: fitz.Page, page_num: int, block: Block) -> list[fitz.Rect]:
    base = full_page_clip(page, page_num, block)
    page_lines = text_lines(page)
    content_ranges: list[tuple[float, float]] = []
    footer_ranges: list[tuple[float, float]] = []
    first_answer_line_y: float | None = None
    has_table_region = False

    for _x0, y0, _x1, y1, text in page_lines:
        if y1 < base.y0 or y0 > base.y1:
            continue
        if QUESTION_TOTAL_RE.search(text) or LEGACY_TOTAL_RE.search(text):
            footer_ranges.append((max(base.y0, y0 - 8), min(base.y1, y1 + 8)))

    for raw_block in page.get_text("blocks"):
        x0, y0, x1, y1, text = float(raw_block[0]), float(raw_block[1]), float(raw_block[2]), float(raw_block[3]), raw_block[4]
        if y1 < base.y0 or y0 > base.y1:
            continue
        if x1 < base.x0 or x0 > base.x1:
            continue
        lowered_text = re.sub(r"\s+", " ", str(text)).lower()
        if "table below" in lowered_text or "the table above" in lowered_text:
            has_table_region = True
        if is_answer_line_text(str(text)):
            if first_answer_line_y is None or y0 < first_answer_line_y:
                first_answer_line_y = y0
            continue
        if "leave blank" in lowered_text:
            raw_rect = fitz.Rect(x0, y0, x1, y1)
            added_clean_line = False
            for line_x0, line_y0, line_x1, line_y1, line_text in page_lines:
                line_rect = fitz.Rect(line_x0, line_y0, line_x1, line_y1)
                if not line_rect.intersects(raw_rect) or not line_rect.intersects(base):
                    continue
                if is_answer_line_text(line_text) or is_noise_text(line_text, block.q):
                    continue
                content_ranges.append(
                    (max(base.y0, line_y0 - TEXT_TOP_PAD), min(base.y1, line_y1 + TEXT_BOTTOM_PAD))
                )
                added_clean_line = True
            if added_clean_line:
                continue
        if QUESTION_TOTAL_RE.search(text) or LEGACY_TOTAL_RE.search(text):
            text_without_total = QUESTION_TOTAL_RE.sub("", LEGACY_TOTAL_RE.sub("", text))
            if is_noise_text(text_without_total, block.q):
                continue
        if is_noise_text(text, block.q):
            continue
        content_ranges.append((max(base.y0, y0 - TEXT_TOP_PAD), min(base.y1, y1 + TEXT_BOTTOM_PAD)))

    for raw_block in page.get_text("dict").get("blocks", []):
        if raw_block.get("type") != 1:
            continue
        x0, y0, x1, y1 = (float(value) for value in raw_block.get("bbox", (0, 0, 0, 0)))
        if y1 < base.y0 or y0 > base.y1:
            continue
        if x1 < base.x0 or x0 > base.x1:
            continue
        rect = fitz.Rect(x0, y0, x1, y1)
        if not is_useful_drawing(rect, base):
            continue
        content_ranges.append((max(base.y0, y0 - DRAWING_PAD), min(base.y1, y1 + DRAWING_PAD)))

    for drawing in page.get_drawings():
        rect = drawing.get("rect")
        if rect is None or rect.is_empty:
            continue
        if rect.y1 < base.y0 or rect.y0 > base.y1:
            continue
        if rect.x1 < base.x0 or rect.x0 > base.x1:
            continue
        if not is_useful_drawing(rect, base):
            continue
        content_ranges.append((max(base.y0, rect.y0 - DRAWING_PAD), min(base.y1, rect.y1 + DRAWING_PAD)))

    if has_table_region and first_answer_line_y is not None and content_ranges:
        start, end = content_ranges[-1]
        table_end = max(end, min(base.y1, first_answer_line_y - 8))
        content_ranges[-1] = (start, table_end)

    if first_answer_line_y is not None:
        adjusted_ranges: list[tuple[float, float]] = []
        for start, end in content_ranges:
            if start < first_answer_line_y < end:
                end = min(end, first_answer_line_y - 4)
            if end - start >= 6:
                adjusted_ranges.append((start, end))
        content_ranges = adjusted_ranges

    clips: list[fitz.Rect] = []
    for start, end in merge_ranges(content_ranges):
        clips.append(fitz.Rect(base.x0, max(base.y0, start), base.x1, min(base.y1, end)))

    if not clips:
        return []
    return sorted(clips, key=lambda rect: rect.y0)


def block_text(doc: fitz.Document, block: Block) -> str:
    chunks: list[str] = []
    for page_num in range(block.start_page, block.end_page + 1):
        page = doc.load_page(page_num)
        base = full_page_clip(page, page_num, block)
        page_lines = text_lines(page)
        for raw_block in page.get_text("blocks"):
            x0, y0, x1, y1, text = (
                float(raw_block[0]),
                float(raw_block[1]),
                float(raw_block[2]),
                float(raw_block[3]),
                str(raw_block[4]),
            )
            raw_rect = fitz.Rect(x0, y0, x1, y1)
            if not raw_rect.intersects(base):
                continue
            lowered_text = re.sub(r"\s+", " ", text).lower()
            if "leave blank" in lowered_text:
                clean_lines: list[str] = []
                for line_x0, line_y0, line_x1, line_y1, line_text in page_lines:
                    line_rect = fitz.Rect(line_x0, line_y0, line_x1, line_y1)
                    if not line_rect.intersects(raw_rect) or not line_rect.intersects(base):
                        continue
                    if is_answer_line_text(line_text) or is_noise_text(line_text, block.q):
                        continue
                    clean_lines.append(line_text.strip())
                if clean_lines:
                    chunks.append(" ".join(clean_lines))
                continue
            if is_answer_line_text(text) or is_noise_text(text, block.q):
                continue
            chunks.append(text.strip())
    return re.sub(r"\s+", " ", " ".join(chunks)).strip()


def build_contact_sheet(paths: list[Path], out_dir: Path) -> Path:
    thumb_width = 280
    label_height = 30
    gap = 18
    cols = 3
    thumbs: list[tuple[Path, Image.Image]] = []
    for path in paths:
        image = Image.open(path).convert("RGB")
        ratio = thumb_width / image.width
        thumb = image.resize((thumb_width, max(1, int(image.height * ratio))), Image.Resampling.LANCZOS)
        thumbs.append((path, thumb))

    row_heights: list[int] = []
    for row_start in range(0, len(thumbs), cols):
        row = thumbs[row_start : row_start + cols]
        row_heights.append(max(thumb.height for _path, thumb in row) + label_height)

    width = cols * thumb_width + (cols + 1) * gap
    height = sum(row_heights) + (len(row_heights) + 1) * gap
    sheet = Image.new("RGB", (width, height), "white")
    draw = ImageDraw.Draw(sheet)

    y = gap
    for row_index, row_start in enumerate(range(0, len(thumbs), cols)):
        row = thumbs[row_start : row_start + cols]
        x = gap
        for path, thumb in row:
            draw.text((x, y), path.stem, fill=(20, 20, 20))
            sheet.paste(thumb, (x, y + label_height))
            x += thumb_width + gap
        y += row_heights[row_index] + gap

    contact = out_dir / "contact_sheet.jpg"
    sheet.save(contact, quality=92)
    return contact


def crop_pdf(pdf: Path, out_root: Path, slug: str | None = None) -> dict:
    if not pdf.exists():
        raise FileNotFoundError(pdf)
    slug = slug or paper_slug_from_filename(pdf)
    out_dir = out_root / slug
    out_dir.mkdir(parents=True, exist_ok=True)

    with fitz.open(pdf) as doc:
        blocks = locate_blocks(doc)
        image_paths: list[Path] = []
        rows: list[dict] = []
        for block in blocks:
            block.text = block_text(doc, block)
            block.filename = f"{slug}_Q{block.q:02d}_M{block.marks:02d}.png"
            out_path = out_dir / block.filename
            image = render_block(doc, block)
            image.save(out_path, optimize=True)
            image_paths.append(out_path)
            rows.append(
                {
                    **asdict(block),
                    "startPage": block.start_page + 1,
                    "endPage": block.end_page + 1,
                    "image": str(out_path),
                    "textPreview": block.text[:900],
                }
            )

    contact_sheet = build_contact_sheet(image_paths, out_dir)
    manifest = {
        "paper": str(pdf),
        "slug": slug,
        "questionCount": len(rows),
        "totalMarks": sum(int(row["marks"]) for row in rows),
        "contactSheet": str(contact_sheet),
        "questions": rows,
    }
    (out_dir / "crop_manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    return manifest


def main() -> int:
    parser = argparse.ArgumentParser(description="Crop Edexcel IAL WME01/Mechanics 1 papers into per-question review images.")
    parser.add_argument("--pdf", required=True, help="Question paper PDF path.")
    parser.add_argument("--slug", help="Output slug, e.g. WME01_2026_Jan.")
    parser.add_argument("--out", default=str(DEFAULT_OUT), help="Review output folder.")
    args = parser.parse_args()

    manifest = crop_pdf(Path(args.pdf), Path(args.out), args.slug)
    print(f"Paper: {manifest['slug']}")
    print(f"Questions: {manifest['questionCount']}")
    print(f"Total marks: {manifest['totalMarks']}")
    print(f"Contact sheet: {manifest['contactSheet']}")
    print(f"Manifest: {Path(args.out) / manifest['slug'] / 'crop_manifest.json'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
