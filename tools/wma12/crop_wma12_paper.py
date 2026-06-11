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
DEFAULT_OUT = ROOT / "private_output" / "wma12_crop_review"
QUESTION_TOTAL_RE = re.compile(r"Total for Question\s+(\d+)\s+is\s+(\d+)\s+marks?", re.IGNORECASE)
QUESTION_START_RE = re.compile(r"^\s*(\d+)\.?\s*(?:\S|$)", re.DOTALL)

RENDER_ZOOM = 2.0
CONTENT_X0 = 34.0
CONTENT_X1_PAD = 34.0
CONTINUATION_BOTTOM_PAD = 42.0
MULTI_PAGE_GAP = 20
IMAGE_BORDER = 24


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


def paper_slug_from_filename(path: Path) -> str:
    match = re.match(r"IAL_MATHS_(\d{4})_([A-Za-z]+)_P2(R?)_QP\.pdf$", path.name)
    if match:
        year, session, r_variant = match.groups()
        return f"WMA12_{year}_{session}{r_variant}"
    return path.stem


def locate_question_starts(doc: fitz.Document) -> dict[int, tuple[int, float]]:
    starts: dict[int, tuple[int, float]] = {}
    for page_num in range(len(doc)):
        page = doc.load_page(page_num)
        for block in page.get_text("blocks"):
            text = re.sub(r"\s+", " ", block[4]).strip()
            x0, y0 = float(block[0]), float(block[1])
            if x0 >= 110 or y0 >= 760:
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

    footers.sort(key=lambda row: row[0])
    if not footers:
        raise RuntimeError("No Pearson question footers were found.")

    starts = locate_question_starts(doc)
    blocks: list[Block] = []
    for index, (q, marks, end_page, _footer_y0, footer_y1) in enumerate(footers):
        anchor = starts.get(q)
        if anchor is not None:
            start_page, start_y = anchor
            start_y = max(0.0, start_y - 4)
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
    diff = ImageChops.add(ImageChops.difference(image, background), ImageChops.difference(image, background), 2.0, -100)
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
    if "do not write in this area" in lowered:
        return True
    if lowered in {"turn over", "answer all questions"}:
        return True
    if lowered == f"question {q} continued":
        return True
    if re.fullmatch(r"\*?p\d+a\d+\*?", lowered):
        return True
    if re.fullmatch(r"[\d\s\uf0a2]+", clean):
        return True
    return False


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


def content_clips_for_page(page: fitz.Page, page_num: int, block: Block) -> list[fitz.Rect]:
    base = full_page_clip(page, page_num, block)
    content_ranges: list[tuple[float, float]] = []
    footer_ranges: list[tuple[float, float]] = []

    for raw_block in page.get_text("blocks"):
        x0, y0, x1, y1, text = float(raw_block[0]), float(raw_block[1]), float(raw_block[2]), float(raw_block[3]), raw_block[4]
        if y1 < base.y0 or y0 > base.y1:
            continue
        if x1 < base.x0 or x0 > base.x1:
            continue
        if QUESTION_TOTAL_RE.search(text):
            footer_ranges.append((max(base.y0, y0 - 8), min(base.y1, y1 + 8)))
            continue
        if is_noise_text(text, block.q):
            continue
        content_ranges.append((max(base.y0, y0 - 14), min(base.y1, y1 + 18)))

    clips: list[fitz.Rect] = []
    for start, end in merge_ranges(content_ranges):
        clips.append(fitz.Rect(base.x0, max(base.y0, start), base.x1, min(base.y1, end)))

    for start, end in footer_ranges:
        footer_clip = fitz.Rect(base.x0, max(base.y0, start), base.x1, min(base.y1, end))
        if not any(abs(footer_clip.y0 - clip.y0) < 3 and abs(footer_clip.y1 - clip.y1) < 3 for clip in clips):
            clips.append(footer_clip)

    if not clips:
        return []
    return sorted(clips, key=lambda rect: rect.y0)


def block_text(doc: fitz.Document, block: Block) -> str:
    chunks: list[str] = []
    for page_num in range(block.start_page, block.end_page + 1):
        page = doc.load_page(page_num)
        page_bottom = page.rect.height - CONTINUATION_BOTTOM_PAD
        if page_num == block.start_page and page_num == block.end_page:
            clip = fitz.Rect(CONTENT_X0, block.start_y, page.rect.width - CONTENT_X1_PAD, block.end_y)
        elif page_num == block.start_page:
            clip = fitz.Rect(CONTENT_X0, block.start_y, page.rect.width - CONTENT_X1_PAD, page_bottom)
        elif page_num == block.end_page:
            clip = fitz.Rect(CONTENT_X0, 0, page.rect.width - CONTENT_X1_PAD, block.end_y)
        else:
            clip = fitz.Rect(CONTENT_X0, 0, page.rect.width - CONTENT_X1_PAD, page_bottom)
        chunks.append(page.get_text(clip=clip))
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
    parser = argparse.ArgumentParser(description="Crop Edexcel IAL WMA12/Pure 2 papers into per-question review images.")
    parser.add_argument("--pdf", required=True, help="Question paper PDF path.")
    parser.add_argument("--slug", help="Output slug, e.g. WMA12_2026_Jan.")
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
