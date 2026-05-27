"""Polish WMA11 web solution step titles without changing worked methods."""

from __future__ import annotations

import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
WMA11_DATA = ROOT / "ial" / "wma11" / "wma11-data.js"

REPLACEMENTS: dict[tuple[str, int], str] = {
    ("WMA11-01_2020_Jan_Q02", 1): "Simplify part (a)",
    ("WMA11-01_2020_Jan_Q02", 2): "Simplify part (b)",
    ("WMA11-01_2020_Jan_Q02", 3): "Simplify part (c)",
    ("WMA11-01_2025_MayJune_Q01", 1): "Simplify part (a)",
    ("WMA11-01_2025_MayJune_Q01", 3): "Simplify part (b)",
    ("WMA11-01_2025_MayJune_Q01", 4): "Simplify part (c)",
    ("WMA11-01_2024_MayJune_Q06", 6): "Apply both boundaries",
    ("WMA11-01_2026_Jan_Q03", 4): "Combine with the domain",
    ("WMA11-01_2019_Oct_Q03", 1): "Find line OM",
    ("WMA11-01_2019_Oct_Q06", 1): "Equate line and curve",
    ("WMA11-01_2021_MayJune_Q05", 3): "Compare company costs",
    ("WMA11-01_2021_Oct_Q09", 1): "Translate point P",
    ("WMA11-01_2024_MayJune_Q03", 1): "Translate the graph left",
    ("WMA11-01_2025_MayJune_Q09", 2): "Translate the reflected curve",
    ("WMA11-01_2025_Oct_Q09", 2): "Translate the graph right",
    ("WMA11-01_2020_Jan_Q04", 1): "Identify the major sector",
    ("WMA11-01_2020_Jan_Q07", 0): "Read point P",
    ("WMA11-01_2021_Jan_Q03", 0): "Read cosine key points",
    ("WMA11-01_2021_MayJune_Q09", 3): "Count first interval solutions",
    ("WMA11-01_2021_MayJune_Q09", 4): "Count second interval solutions",
    ("WMA11-01_2025_MayJune_Q04", 2): "Count part c(i)",
    ("WMA11-01_2025_MayJune_Q04", 3): "Count part c(ii)",
    ("WMA11-01_2025_MayJune_Q04", 4): "Count part c(iii)",
    ("WMA11-01_2019_Oct_Q05", 2): "Find tangent and normal gradients",
    ("WMA11-01_2024_Oct_Q09", 8): "Translate point R",
    ("WMA11-01_2024_Jan_Q10", 1): "Use f''(P) = 0",
}


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


def awkward_titles(questions: list[dict]) -> list[tuple[str, int, str]]:
    awkward: list[tuple[str, int, str]] = []
    generic = re.compile(
        r"^(Part\s*\(?[a-z0-9ivx]+\)?|Step\s+\d+|For\b|Then\b|So\b|Now\b|Also\b|And\b|Since\b|Because\b|If\b)",
        re.IGNORECASE,
    )
    for question in questions:
        for index, step in enumerate(question.get("steps") or []):
            title = str(step.get("title") or "").strip()
            if (
                not title
                or title.endswith((",", ".", ":", ";"))
                or generic.search(title)
                or len(title.split()) > 7
            ):
                awkward.append((str(question.get("id") or ""), index, title))
    return awkward


def main() -> None:
    text = WMA11_DATA.read_text(encoding="utf-8")
    topics = extract_assignment(text, "WMA11_TOPICS")
    questions = extract_assignment(text, "WMA11_QUESTIONS")

    before = awkward_titles(questions)
    changed = 0
    for question in questions:
        question_id = str(question.get("id") or "")
        for index, step in enumerate(question.get("steps") or []):
            replacement = REPLACEMENTS.get((question_id, index))
            if replacement and step.get("title") != replacement:
                step["title"] = replacement
                changed += 1

    after = awkward_titles(questions)
    unresolved = [(question_id, index, title) for question_id, index, title in after if (question_id, index) not in REPLACEMENTS]
    if unresolved:
        details = "\n".join(f"{question_id} [{index}] {title}" for question_id, index, title in unresolved[:20])
        raise SystemExit(f"Unresolved WMA11 titles remain:\n{details}")

    text = replace_assignment(text, "WMA11_TOPICS", topics)
    text = replace_assignment(text, "WMA11_QUESTIONS", questions)
    WMA11_DATA.write_text(text.rstrip() + "\n", encoding="utf-8")
    print(f"WMA11 title polish: before={len(before)} changed={changed} after={len(after)}")


if __name__ == "__main__":
    main()
