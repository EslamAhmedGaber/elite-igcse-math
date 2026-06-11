from __future__ import annotations

import json
from pathlib import Path

from crop_wma12_paper import DEFAULT_OUT, crop_pdf, paper_slug_from_filename


SOURCE_DIR = Path(r"D:\Tyro4_Latex\0 Mathematics\Pure 2\finalExams")
REPORT_PATH = DEFAULT_OUT / "batch_crop_report.json"


def main() -> int:
    rows: list[dict] = []
    for pdf in sorted(SOURCE_DIR.glob("IAL_MATHS_*_P2*_QP.pdf")):
        slug = paper_slug_from_filename(pdf)
        try:
            manifest = crop_pdf(pdf, DEFAULT_OUT, slug=slug)
            rows.append({
                "slug": slug,
                "status": "ok",
                "questionCount": manifest["questionCount"],
                "totalMarks": manifest["totalMarks"],
                "contactSheet": manifest["contactSheet"],
            })
            print(f"OK {slug}: {manifest['questionCount']} questions, {manifest['totalMarks']} marks")
        except Exception as exc:  # noqa: BLE001 - batch report should keep going
            rows.append({
                "slug": slug,
                "status": "error",
                "error": str(exc),
            })
            print(f"ERROR {slug}: {exc}")

    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    REPORT_PATH.write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Report: {REPORT_PATH}")
    return 1 if any(row["status"] == "error" for row in rows) else 0


if __name__ == "__main__":
    raise SystemExit(main())
