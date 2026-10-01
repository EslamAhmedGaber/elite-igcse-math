"""Independent check of the staged Adaptive Classified books against their approved sources.

For every output file in private_output/adaptive_stage/*manifest.json:
  * front = the new Elite cover (+ contents) pages; body = every remaining page;
  * body page count == kept source range, and each body page's text equals its source page (order preserved);
  * all source pages are accounted for: kept range + removed front pages == source pages (parts of a split book together);
  * removed source pages contain no question/solution content;
  * sample pages (first, last, every 40th) render to identical pixels as the source page (images untouched);
  * every contents link points at a body page; file < 100 MB.
    python tools/verify_adaptive_classified.py
"""
import glob, json, os, re, sys
from collections import defaultdict
import fitz

HERE = os.path.dirname(os.path.abspath(__file__))
STAGE = os.path.join(os.path.dirname(HERE), "private_output", "adaptive_stage")
sys.path.insert(0, HERE)
from build_adaptive_classified import CONTENT_MARKERS, norm  # noqa: E402

bad = []
coverage = defaultdict(list)
n_files = n_pages = n_px = 0
for mf in sorted(glob.glob(os.path.join(STAGE, "adaptive_*_manifest.json"))):
    for r in json.load(open(mf, encoding="utf-8")):
        out = fitz.open(os.path.join(STAGE, r["file"]))
        src = fitz.open(r["source"])
        a, b = r["kept_range"]
        front = len(out) - (b - a)
        n_files += 1
        if os.path.getsize(os.path.join(STAGE, r["file"])) >= 100_000_000:
            bad.append((r["file"], "size"))
        if not 1 <= front <= 5:
            bad.append((r["file"], f"front pages {front}"))
        for k in range(b - a):
            if norm(out[front + k].get_text()) != norm(src[a + k].get_text()):
                bad.append((r["file"], f"text differs at source page {a + k + 1}"))
                break
        n_pages += b - a
        samples = sorted({0, b - a - 1, *range(0, b - a, 40)})
        for k in samples:
            p1 = out[front + k].get_pixmap(dpi=40)
            p2 = src[a + k].get_pixmap(dpi=40)
            n_px += 1
            if p1.samples != p2.samples:
                bad.append((r["file"], f"pixels differ at source page {a + k + 1}"))
        for i in range(front):
            for ln in out[i].get_links():
                if ln.get("page", -1) < front:
                    bad.append((r["file"], "contents link before body"))
        for i in range(r["dropped_front_pages"]):
            if CONTENT_MARKERS.search(src[i].get_text()):
                bad.append((r["file"], f"removed source page {i + 1} has content"))
        coverage[(r["source"], r["role"])].append((a, b, r["dropped_front_pages"], len(src)))

for (srcf, role), parts in coverage.items():
    parts.sort()
    drop, total = parts[0][2], parts[0][3]
    pos = drop
    for a, b, _, _ in parts:
        if a != pos:
            bad.append((os.path.basename(srcf), f"gap/overlap at {pos}->{a}"))
        pos = b
    if pos != total:
        bad.append((os.path.basename(srcf), f"ends at {pos} of {total}"))

print(f"{n_files} files, {n_pages} content pages compared by text, {n_px} pages compared by pixels, "
      f"{len(coverage)} source books fully covered")
print("PROBLEMS:", bad if bad else "none")
