"""Create the browser-loadable Baccalaureate question bundle from questions.json."""

from __future__ import annotations

import argparse
import json
from pathlib import Path


DEFAULT_STAGE = Path(r"D:\Tyro4_Latex\البكالوريا المصرية 2026_STUDIO_DESIGN\website_release_staging_20260902")
DATA_REL = Path("data/EgyptianBaccalaureate/2026/English")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--stage-root", type=Path, default=DEFAULT_STAGE)
    args = parser.parse_args()
    root = args.stage_root.resolve()
    data_dir = root / DATA_REL
    question_payload = json.loads((data_dir / "questions.json").read_text(encoding="utf-8"))
    solution_payload = json.loads((data_dir / "solutions.json").read_text(encoding="utf-8"))
    output = (
        "// Generated from the approved Egyptian Baccalaureate records; do not hand-edit.\n"
        "window.EGYPTIAN_BACCALAUREATE_QUESTIONS = "
        + json.dumps(question_payload.get("records", []), ensure_ascii=False, separators=(",", ":"))
        + ";\n"
        "window.EGYPTIAN_BACCALAUREATE_SOLUTIONS = "
        + json.dumps(solution_payload.get("records", {}), ensure_ascii=False, separators=(",", ":"))
        + ";\n"
    )
    target = data_dir / "baccalaureate-data.js"
    target.write_text(output, encoding="utf-8")
    print(json.dumps({"path": target.as_posix(), "questions": len(question_payload.get("records", [])), "bytes": target.stat().st_size}, ensure_ascii=True))


if __name__ == "__main__":
    main()
