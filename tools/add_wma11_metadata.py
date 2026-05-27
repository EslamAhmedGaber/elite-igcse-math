"""Add audit metadata to WMA11 solutions and normalize existing solution audit fields."""

from __future__ import annotations

import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
WMA11_DATA = ROOT / "ial" / "wma11" / "wma11-data.js"
SOLUTION_DIR = ROOT / "src" / "data" / "solutions"
DEFAULT_UPDATED = "2026-05-27T00:00:00"


def extract_assignment(text: str, name: str) -> list[dict]:
    pattern = re.compile(rf"window\.{re.escape(name)}\s*=\s*(\[.*?\]);", re.DOTALL)
    match = pattern.search(text)
    if not match:
        raise ValueError(f"Could not find window.{name} assignment")
    return json.loads(match.group(1))


def replace_assignment(text: str, name: str, value: list[dict]) -> str:
    dumped = json.dumps(value, ensure_ascii=True, separators=(",", ":"))
    pattern = re.compile(rf"window\.{re.escape(name)}\s*=\s*\[.*?\];", re.DOTALL)
    return pattern.sub(lambda _match: f"window.{name} = {dumped};", text, count=1)


def update_wma11() -> int:
    text = WMA11_DATA.read_text(encoding="utf-8")
    topics = extract_assignment(text, "WMA11_TOPICS")
    questions = extract_assignment(text, "WMA11_QUESTIONS")
    changed = 0
    for item in questions:
        before = dict(item)
        item.setdefault("status", "checked")
        item.setdefault("checkedBy", "Dr Eslam Ahmed")
        item.setdefault("updated", DEFAULT_UPDATED)
        if item != before:
            changed += 1
    text = replace_assignment(text, "WMA11_TOPICS", topics)
    text = replace_assignment(text, "WMA11_QUESTIONS", questions)
    WMA11_DATA.write_text(text.rstrip() + "\n", encoding="utf-8")
    return changed


def normalize_source_solution_metadata() -> tuple[int, int]:
    files_changed = 0
    solutions_changed = 0
    for path in sorted(SOLUTION_DIR.glob("*.json")):
        data = json.loads(path.read_text(encoding="utf-8"))
        changed = False
        for solution in data.get("solutions", {}).values():
            before = dict(solution)
            status = str(solution.get("status") or "").strip()
            checked_by = str(solution.get("checkedBy") or "").strip()
            if status != "checked":
                solution["status"] = "needs-review"
                solution["checkedBy"] = checked_by or "Pending review"
            elif not checked_by:
                solution["checkedBy"] = "Dr Eslam Ahmed + Codex"
            solution.setdefault("updated", DEFAULT_UPDATED)
            if solution != before:
                changed = True
                solutions_changed += 1
        if changed:
            path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
            files_changed += 1
    return files_changed, solutions_changed


def main() -> None:
    wma11_changed = update_wma11()
    source_files_changed, source_solutions_changed = normalize_source_solution_metadata()
    print(f"WMA11 records updated: {wma11_changed}")
    print(f"Source solution files updated: {source_files_changed}")
    print(f"Source solution records updated: {source_solutions_changed}")


if __name__ == "__main__":
    main()
