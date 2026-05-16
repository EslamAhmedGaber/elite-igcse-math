"""
Import legacy per-question Markdown solutions into the structured solution store.

This is useful when a trusted older project already has worked solutions for a
paper, but the restored site now needs them inside `src/data/solutions/`.
"""

from __future__ import annotations

import argparse
import json
import re
from datetime import datetime
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parent.parent
QUESTION_DIR = ROOT / "src" / "data" / "questions"
SOLUTION_DIR = ROOT / "src" / "data" / "solutions"
QUESTION_RE = re.compile(r"__Q(?P<q>\d+)__")


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("paper_slug", help="Paper slug, for example May2025_4WM1H")
    parser.add_argument("source_dir", type=Path, help="Folder containing legacy Markdown files")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    question_doc = load_json(QUESTION_DIR / f"{args.paper_slug}.json")
    solution_path = SOLUTION_DIR / f"{args.paper_slug}.json"
    solution_doc = load_json(solution_path) if solution_path.exists() else {
        "paperSlug": args.paper_slug,
        "solutions": {},
    }
    solutions = solution_doc.setdefault("solutions", {})

    markdown_by_q: dict[int, str] = {}
    for path in sorted(args.source_dir.glob(f"{args.paper_slug}__Q*.md")):
        match = QUESTION_RE.search(path.name)
        if match:
            markdown_by_q[int(match.group("q"))] = path.read_text(encoding="utf-8").strip()

    all_by_q = {
        question["q"]: question
        for question in question_doc["questions"]
        if question["bank"] == "all"
    }

    created = 0
    for q_number, question in all_by_q.items():
        source = markdown_by_q.get(q_number)
        if not source:
            continue
        solutions[question["id"]] = {
            "status": "checked",
            "source": source,
            "updated": datetime.now().isoformat(timespec="seconds"),
            "checked_by": "Dr Eslam Ahmed + Codex",
            "imported_from": "legacy_markdown",
        }
        created += 1

    for question in question_doc["questions"]:
        if question["bank"] != "expertise":
            continue
        all_question = all_by_q.get(question["q"])
        if all_question and all_question["id"] in solutions:
            solutions[question["id"]] = dict(solutions[all_question["id"]])
            solutions[question["id"]]["updated"] = datetime.now().isoformat(timespec="seconds")
            solutions[question["id"]]["reused_from"] = all_question["id"]
            created += 1

    solution_path.write_text(json.dumps(solution_doc, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"{args.paper_slug}: imported {created} solution rows")


if __name__ == "__main__":
    main()
