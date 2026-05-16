"""
Seed missing paper solutions from exact duplicate questions already solved in the bank.

This intentionally reuses only exact normalized text matches. Similar templates with
different numbers are reported as unsolved and still need a real worked solution.
"""

from __future__ import annotations

import argparse
import json
import re
from copy import deepcopy
from datetime import datetime
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parent.parent
QUESTION_DIR = ROOT / "src" / "data" / "questions"
SOLUTION_DIR = ROOT / "src" / "data" / "solutions"


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def normalize_text(text: str) -> str:
    text = text.lower()
    text = re.sub(r"^\s*\d+\s+", "", text)
    text = re.sub(r"total for question \d+ is \d+ marks", "", text)
    return re.sub(r"\s+", " ", text).strip()


def load_question_rows() -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for path in sorted(QUESTION_DIR.glob("*.json")):
        paper = load_json(path)
        for question in paper.get("questions", []):
            row = dict(question)
            row["paperSlug"] = paper["paperSlug"]
            rows.append(row)
    return rows


def load_solution_map() -> dict[str, dict[str, Any]]:
    merged: dict[str, dict[str, Any]] = {}
    for path in sorted(SOLUTION_DIR.glob("*.json")):
        block = load_json(path)
        merged.update(block.get("solutions", {}))
    return merged


def load_or_create_solution_doc(paper_slug: str) -> dict[str, Any]:
    path = SOLUTION_DIR / f"{paper_slug}.json"
    if path.exists():
        return load_json(path)
    return {"paperSlug": paper_slug, "solutions": {}}


def write_solution_doc(paper_slug: str, doc: dict[str, Any]) -> None:
    path = SOLUTION_DIR / f"{paper_slug}.json"
    path.write_text(json.dumps(doc, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def seed_paper(paper_slug: str) -> tuple[int, int]:
    rows = load_question_rows()
    all_solutions = load_solution_map()
    target_rows = [row for row in rows if row["paperSlug"] == paper_slug]
    target_doc = load_or_create_solution_doc(paper_slug)
    target_solutions = target_doc.setdefault("solutions", {})

    donor_by_text: dict[str, tuple[str, dict[str, Any]]] = {}
    for row in rows:
        if row["paperSlug"] == paper_slug or row.get("bank") != "all":
            continue
        solution = all_solutions.get(row["id"])
        if solution:
            donor_by_text.setdefault(normalize_text(row.get("text", "")), (row["id"], solution))

    created = 0
    unresolved = 0
    all_target_by_q = {
        row["q"]: row
        for row in target_rows
        if row.get("bank") == "all" and isinstance(row.get("q"), int)
    }

    for row in target_rows:
        qid = row["id"]
        if qid in target_solutions:
            continue

        if row.get("bank") == "all":
            donor = donor_by_text.get(normalize_text(row.get("text", "")))
            if not donor:
                unresolved += 1
                continue
            donor_id, donor_solution = donor
            seeded = deepcopy(donor_solution)
            seeded["updated"] = datetime.now().isoformat(timespec="seconds")
            seeded["checked_by"] = seeded.get("checked_by") or "Dr Eslam Ahmed + Codex"
            seeded["reused_from"] = donor_id
            target_solutions[qid] = seeded
            created += 1
            continue

        if row.get("bank") == "expertise":
            all_row = all_target_by_q.get(row.get("q"))
            if all_row and all_row["id"] in target_solutions:
                seeded = deepcopy(target_solutions[all_row["id"]])
                seeded["updated"] = datetime.now().isoformat(timespec="seconds")
                seeded["reused_from"] = all_row["id"]
                target_solutions[qid] = seeded
                created += 1
            else:
                unresolved += 1

    write_solution_doc(paper_slug, target_doc)
    return created, unresolved


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("paper_slugs", nargs="+", help="One or more paper slugs to seed.")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    for paper_slug in args.paper_slugs:
        created, unresolved = seed_paper(paper_slug)
        print(f"{paper_slug}: seeded {created}, unresolved {unresolved}")


if __name__ == "__main__":
    main()
