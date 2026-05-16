"""
Merge hand-checked solution patches into structured per-paper solution files.

Patch format:
{
  "entries": [
    {
      "paperSlug": "Example_Paper",
      "q": 1,
      "source": "Markdown worked solution..."
    }
  ]
}
"""

from __future__ import annotations

import argparse
import json
from datetime import datetime
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parent.parent
QUESTION_DIR = ROOT / "src" / "data" / "questions"
SOLUTION_DIR = ROOT / "src" / "data" / "solutions"


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, data: Any) -> None:
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def load_question_index(paper_slug: str) -> dict[tuple[str, int], dict[str, Any]]:
    paper = load_json(QUESTION_DIR / f"{paper_slug}.json")
    return {
        (question["bank"], question["q"]): question
        for question in paper.get("questions", [])
    }


def load_solution_doc(paper_slug: str) -> dict[str, Any]:
    path = SOLUTION_DIR / f"{paper_slug}.json"
    if path.exists():
        return load_json(path)
    return {"paperSlug": paper_slug, "solutions": {}}


def merge_patch(patch_path: Path) -> None:
    patch = load_json(patch_path)
    entries = patch.get("entries") or []
    grouped: dict[str, list[dict[str, Any]]] = {}
    for entry in entries:
        grouped.setdefault(entry["paperSlug"], []).append(entry)

    now = datetime.now().isoformat(timespec="seconds")
    for paper_slug, rows in grouped.items():
        questions = load_question_index(paper_slug)
        doc = load_solution_doc(paper_slug)
        solutions = doc.setdefault("solutions", {})

        for row in rows:
            question = questions[("all", row["q"])]
            solutions[question["id"]] = {
                "status": "checked",
                "source": row["source"].strip(),
                "updated": now,
                "checked_by": "Dr Eslam Ahmed + Codex",
            }

        for solution in solutions.values():
            if str(solution.get("source") or "").strip():
                solution["status"] = "checked"
                solution["checked_by"] = solution.get("checked_by") or "Dr Eslam Ahmed + Codex"
                solution["updated"] = solution.get("updated") or now

        write_json(SOLUTION_DIR / f"{paper_slug}.json", doc)
        print(f"{paper_slug}: merged {len(rows)} manual solutions")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("patch_path", type=Path, help="JSON patch file to merge.")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    merge_patch(args.patch_path)


if __name__ == "__main__":
    main()
