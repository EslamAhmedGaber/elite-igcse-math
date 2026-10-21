#!/usr/bin/env python3
"""Shrink past-paper question images (about 3x) with an adaptive colour palette.

Question crops are black text on white, so a 32-colour palette is visually
identical and loads far faster on phones (practice cards, Daily Challenge,
and the A4 paper builder all fetch these files). Each image is checked: if 32
colours are not faithful enough it tries 64, then 256; the original is kept
when nothing is smaller. Already-palette files are skipped, so re-running is safe.

Only the top level of assets/questions/ and ial/*/questions/ is touched;
sub-folders with their own checksum manifests (Egyptian Baccalaureate) are not.

Usage: python tools/optimize_question_images.py [--dry-run]
"""
from __future__ import annotations

import io
import sys
from concurrent.futures import ProcessPoolExecutor
from pathlib import Path

from PIL import Image, ImageChops, ImageStat

ROOT = Path(__file__).resolve().parents[1]
MAX_RMS = 6.0  # mean per-channel RMS error allowed (0-255 scale)


def candidates() -> list[Path]:
    files = sorted((ROOT / "assets" / "questions").glob("*.png"))
    for folder in sorted((ROOT / "ial").glob("*/questions")):
        files.extend(sorted(folder.glob("*.png")))
    return files


def shrink(path_text: str) -> tuple[str, int, int, str]:
    path = Path(path_text)
    before = path.stat().st_size
    with Image.open(path) as source:
        if source.mode == "P":
            return path_text, before, before, "already palette"
        rgb = source.convert("RGB")
    for colours in (32, 64, 256):
        quantized = rgb.quantize(colors=colours, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
        error = ImageStat.Stat(ImageChops.difference(rgb, quantized.convert("RGB"))).rms
        if sum(error) / 3 <= MAX_RMS:
            break
    else:
        return path_text, before, before, "kept (colours)"
    buffer = io.BytesIO()
    quantized.save(buffer, format="PNG", optimize=True)
    after = buffer.tell()
    if after >= before * 0.95:
        return path_text, before, before, "kept (not smaller)"
    if "--dry-run" not in sys.argv:
        path.write_bytes(buffer.getvalue())
    return path_text, before, after, f"{colours} colours"


def main() -> None:
    files = candidates()
    total_before = total_after = 0
    kinds: dict[str, int] = {}
    with ProcessPoolExecutor() as pool:
        for _, before, after, kind in pool.map(shrink, [str(f) for f in files], chunksize=16):
            total_before += before
            total_after += after
            key = kind.split(" (")[0] if kind.startswith("kept") else kind
            kinds[key] = kinds.get(key, 0) + 1
    print(f"{len(files)} images: {total_before / 1048576:.1f} MB -> {total_after / 1048576:.1f} MB")
    print(", ".join(f"{kind}: {count}" for kind, count in sorted(kinds.items())))


if __name__ == "__main__":
    main()
