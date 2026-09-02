"""Remove production/provenance wording from public workbook PDFs.

The approved books are otherwise left pixel-stable: the exact production
words ``source`` and ``synchronized`` are replaced by neutral student-facing
wording selected from the page context.  The tool operates on a precise
root supplied by the caller and writes a temporary PDF before replacing each
file, so a failed page never leaves a partially-written PDF.
"""

from __future__ import annotations

import argparse
import re
import shutil
import tempfile
from pathlib import Path

import fitz  # type: ignore


def page_fill(page: fitz.Page, rects: list[fitz.Rect]) -> tuple[float, float, float]:
    """Estimate the local paper colour so redaction patches disappear."""
    pix = page.get_pixmap(matrix=fitz.Matrix(1, 1), alpha=False)
    samples: list[tuple[int, int, int]] = []
    for rect in rects:
        points = (
            (rect.x0 - 2, rect.y0 + 2),
            (rect.x1 + 2, rect.y0 + 2),
            (rect.x0 - 2, rect.y1 - 2),
            (rect.x1 + 2, rect.y1 - 2),
        )
        for x, y in points:
            ix, iy = int(round(x)), int(round(y))
            if 0 <= ix < pix.width and 0 <= iy < pix.height:
                samples.append(tuple(pix.pixel(ix, iy)))
    if not samples:
        return (1, 1, 1)
    # Median per channel avoids a neighbouring dark glyph dominating the fill.
    channels = [sorted(sample[channel] for sample in samples)[len(samples) // 2] / 255 for channel in range(3)]
    return tuple(channels)  # type: ignore[return-value]


def word_style(page: fitz.Page, rect: fitz.Rect) -> tuple[float, float, str, tuple[float, float, float]]:
    """Recover the source span baseline, size, weight and colour for an overlay."""
    centre = fitz.Point((rect.x0 + rect.x1) / 2, (rect.y0 + rect.y1) / 2)
    for block in page.get_text("dict").get("blocks", []):
        for line in block.get("lines", []):
            for span in line.get("spans", []):
                box = fitz.Rect(span.get("bbox", (0, 0, 0, 0)))
                if centre in box:
                    font = "hebo" if "bold" in str(span.get("font", "")).lower() or int(span.get("flags", 0)) & 16 else "helv"
                    colour = fitz.sRGB_to_pdf(int(span.get("color", 0)))
                    return float(span.get("size", rect.height * 0.75)), float(span.get("origin", (rect.x0, rect.y1))[1]), font, colour
    return max(7, rect.height * 0.75), rect.y1 - 1, "helv", (0, 0, 0)


def sanitize(path: Path) -> int:
    document = fitz.open(path)
    changed = 0
    for page in document:
        targets: list[tuple[fitz.Rect, str, float, float, str, tuple[float, float, float]]] = []
        page_text = page.get_text("text").lower()
        words = page.get_text("words")
        line_words: dict[tuple[int, int], list[tuple]] = {}
        for word in words:
            line_words.setdefault((int(word[5]), int(word[6])), []).append(word)
        replaced_lines: set[tuple[int, int]] = set()
        for line_key, items in line_words.items():
            items.sort(key=lambda item: int(item[7]))
            line_text = " ".join(str(item[4]) for item in items)
            if re.search(r"\bsource-faithfully\b", line_text, flags=re.IGNORECASE):
                replacement = "Use the same two-step method: common base, then solve the exponent equation or inequality with correct sign control."
            else:
                if not re.search(r"\bsynchronized\b", line_text, flags=re.IGNORECASE):
                    continue
                count_match = re.search(r"\b(\d+)\s+Concepts\s*\|\s*(\d+)\s+synchronized\s+questions\b", line_text, flags=re.IGNORECASE)
                if count_match:
                    concept_count, question_count = count_match.groups()
                    noun = "Concept" if concept_count == "1" else "Concepts"
                    replacement = f"{concept_count} {noun} | {question_count} questions"
                else:
                    replacement = "Formula Bank changes at each Concept boundary."
            rect = fitz.Rect(items[0][:4])
            for item in items[1:]:
                rect |= fitz.Rect(item[:4])
            size, baseline, font, colour = word_style(page, fitz.Rect(items[0][:4]))
            targets.append((rect, replacement, size, baseline, font, colour))
            replaced_lines.add(line_key)

        for word in words:
            x0, y0, x1, y1, raw = word[:5]
            if (int(word[5]), int(word[6])) in replaced_lines:
                continue
            token = re.sub(r"[^A-Za-z]", "", raw).lower()
            rect = fitz.Rect(x0, y0, x1, y1)
            replacement = ""
            if token == "source":
                replacement = "given"
            elif token == "sourcefaithfully":
                replacement = "carefully"
            elif token == "synchronized" and (int(word[5]), int(word[6])) not in replaced_lines:
                replacement = "consistent" if "every question id" in page_text else "exam-ready"
            if replacement:
                size, baseline, font, colour = word_style(page, rect)
                targets.append((rect, replacement, size, baseline, font, colour))
        if targets:
            for rect, *_ in targets:
                page.add_redact_annot(rect, fill=page_fill(page, [rect]))
                changed += 1
            page.apply_redactions()
            for rect, replacement, size, baseline, font, colour in targets:
                page.insert_text(
                    fitz.Point(rect.x0, baseline),
                    replacement,
                    fontsize=size,
                    fontname=font,
                    color=colour,
                    overlay=True,
                )
    if not changed:
        document.close()
        return 0
    with tempfile.NamedTemporaryFile(prefix="public_pdf_", suffix=".pdf", dir=path.parent, delete=False) as handle:
        temporary = Path(handle.name)
    try:
        document.save(temporary, garbage=4, deflate=True)
        document.close()
        shutil.copy2(temporary, path)
    finally:
        temporary.unlink(missing_ok=True)
    return changed


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, required=True)
    parser.add_argument("--limit", type=int, default=0)
    args = parser.parse_args()
    files = sorted(args.root.resolve().rglob("*.pdf"))
    if args.limit:
        files = files[: args.limit]
    total = 0
    changed_files = 0
    for path in files:
        count = sanitize(path)
        total += count
        changed_files += bool(count)
    print({"files": len(files), "changed_files": changed_files, "redactions": total})
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
