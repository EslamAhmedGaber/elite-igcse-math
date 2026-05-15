"""
Generate the legacy static site's runtime JS payloads from structured paper data.

The browser-facing old site still reads `questions-data.js` and
`solutions-data.js`, but those files are now build outputs. New papers and
solutions belong in `src/data/`, then this script refreshes the runtime files.
"""

from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "src" / "data"
QUESTION_DIR = DATA_DIR / "questions"
SOLUTION_DIR = DATA_DIR / "solutions"
TOPICS_PATH = DATA_DIR / "topics.json"
PAPERS_PATH = DATA_DIR / "papers.json"
QUESTION_JS = ROOT / "questions-data.js"
SOLUTION_JS = ROOT / "solutions-data.js"


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def source_id(question_id: str) -> str:
    return question_id.split("::", 1)[1] if "::" in question_id else question_id


def runtime_image(path: str) -> str:
    return path.lstrip("/")


def load_questions() -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for path in sorted(QUESTION_DIR.glob("*.json")):
        paper = load_json(path)
        for question in paper.get("questions", []):
            rows.append(
                {
                    "id": question["id"],
                    "source_id": source_id(question["id"]),
                    "bank": question["bank"],
                    "unit": question["unit"],
                    "topic": question["topic"],
                    "topic_order": question.get("topicOrder"),
                    "paper": paper["paper"],
                    "question": question["q"],
                    "marks": question["marks"],
                    "filename": question["filename"],
                    "image": runtime_image(question["image"]),
                    "question_text": question.get("text", ""),
                    "paper_code": paper.get("code", ""),
                    "modular_force_unit": question.get("modularForceUnit"),
                }
            )
    return rows


def load_solutions() -> dict[str, dict[str, Any]]:
    merged: dict[str, dict[str, Any]] = {}
    for path in sorted(SOLUTION_DIR.glob("*.json")):
        block = load_json(path)
        merged.update(block.get("solutions", {}))
    return merged


def build_site_meta(questions: list[dict[str, Any]]) -> dict[str, Any]:
    topics_doc = load_json(TOPICS_PATH)
    papers = load_json(PAPERS_PATH)
    topics = topics_doc["topics"]
    by_bank = {
        "all": [q for q in questions if q["bank"] == "all"],
        "expertise": [q for q in questions if q["bank"] == "expertise"],
    }
    return {
        "generatedAt": datetime.now().isoformat(timespec="seconds"),
        "questionCount": len(questions),
        "paperCount": len(papers),
        "topics": topics,
        "banks": {
            "all": {
                "title": "All Classified Questions",
                "description": "Every classified past-paper question in the active bank.",
                "subtitle": "Search, filter, zoom, select, solve, and print from the full classified bank.",
                "count": len(by_bank["all"]),
                "topics": topics,
            },
            "expertise": {
                "title": "Expertise Q20+",
                "description": "Harder end-of-paper questions starting from question 20 onwards.",
                "subtitle": "Train the longer questions that usually separate grade 8 and 9 students.",
                "count": len(by_bank["expertise"]),
                "topics": topics,
            },
        },
    }


def write_js(path: Path, global_name: str, payload: Any) -> None:
    text = json.dumps(payload, ensure_ascii=False, indent=2)
    path.write_text(f"window.{global_name} = {text};\n", encoding="utf-8")


def main() -> None:
    questions = load_questions()
    solutions = load_solutions()
    write_js(QUESTION_JS, "SITE_META", build_site_meta(questions))
    with QUESTION_JS.open("a", encoding="utf-8") as handle:
        handle.write("\n")
        handle.write(f"window.QUESTION_DATA = {json.dumps(questions, ensure_ascii=False, indent=2)};\n")
    write_js(SOLUTION_JS, "SOLUTION_DATA", solutions)
    print(f"Wrote {len(questions)} questions to {QUESTION_JS.name}")
    print(f"Wrote {len(solutions)} solutions to {SOLUTION_JS.name}")


if __name__ == "__main__":
    main()
