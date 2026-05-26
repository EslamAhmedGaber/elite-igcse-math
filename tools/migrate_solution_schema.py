"""
Migrate Linear/Modular website solutions from legacy `source` markdown blobs to
the shared structured solution schema.

This is intentionally conservative: it preserves the original worked content in
steps/finalAnswer, lifts topic-check prose into private `topicNote`, and does
not touch question data, progress keys, routing, or PDFs.
"""

from __future__ import annotations

import argparse
import json
import re
from collections import Counter
from datetime import datetime
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parent.parent
SOLUTION_DIR = ROOT / "src" / "data" / "solutions"
REPORT_PATH = ROOT / "docs" / "SOLUTION_MIGRATION_REPORT.md"


TOPIC_CHECK_RE = re.compile(
    r"\A\s*\*\*Topic check:\*\*\s*(.*?)(?=\n\s*\n\s*(?:\*\*[^*\n]{1,90}\*\*|####)|\Z)",
    re.IGNORECASE | re.DOTALL,
)

ANSWER_MARKERS = [
    re.compile(r"(?im)^\s*\*\*Answers?:\*\*\s*"),
    re.compile(r"(?im)^\s*####\s*Answers?:\s*"),
]

HEADING_RE = re.compile(r"^\s*(?:####\s*([^:\n]+):?\s*|\*\*([^*\n]{1,90})\*\*)\s*$")

PRIVATE_TEXT_RE = re.compile(
    r"(topic\s*check|topic-checked|mark[-\s]?scheme\s+review|checking\s+the\s+answer|answer\s+checked)",
    re.IGNORECASE,
)


def read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8-sig"))


def write_json(path: Path, payload: Any) -> None:
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def clean_text(value: str) -> str:
    value = value.replace("\r\n", "\n").replace("\r", "\n")
    value = re.sub(r"[ \t]+\n", "\n", value)
    value = re.sub(r"\n{3,}", "\n\n", value)
    return value.strip()


def extract_topic_note(source: str) -> tuple[str, str]:
    match = TOPIC_CHECK_RE.search(source)
    if not match:
      return source, ""
    note = clean_text(match.group(1))
    cleaned = clean_text(source[: match.start()] + source[match.end() :])
    return cleaned, note


def next_heading_index(text: str, start: int) -> int:
    candidates = []
    for pattern in [
        re.compile(r"(?im)^\s*\*\*[^*\n]{1,90}\*\*\s*$"),
        re.compile(r"(?im)^\s*####\s*[^:\n]+:?\s*$"),
    ]:
        match = pattern.search(text, start)
        if match:
            candidates.append(match.start())
    return min(candidates) if candidates else len(text)


def extract_final_answer(source: str) -> tuple[str, str]:
    last_match: re.Match[str] | None = None
    for pattern in ANSWER_MARKERS:
        for match in pattern.finditer(source):
            if last_match is None or match.start() > last_match.start():
                last_match = match
    if not last_match:
        return source, ""

    end = next_heading_index(source, last_match.end())
    answer = clean_text(source[last_match.end() : end])
    cleaned = clean_text(source[: last_match.start()] + source[end:])
    return cleaned, answer


def normalize_heading(value: str) -> str:
    value = re.sub(r"^\*+|\*+$", "", value or "").strip()
    value = value.rstrip(":").strip()
    value = re.sub(r"\s+", " ", value)
    if not value:
        return "Step"
    if value.lower() in {"method", "solution"}:
        return "Method"
    return value[:80]


def plain_for_title(value: str) -> str:
    value = re.sub(r"\\\[[\s\S]*?\\\]", " ", value)
    value = re.sub(r"\\\([\s\S]*?\\\)", " ", value)
    value = re.sub(r"\$\$[\s\S]*?\$\$", " ", value)
    value = re.sub(r"\$[^$\n]+\$", " ", value)
    value = re.sub(r"<[^>]+>", " ", value)
    value = re.sub(r"[*_`#>-]", " ", value)
    value = re.sub(r"\\[a-zA-Z]+", " ", value)
    value = re.sub(r"[^A-Za-z0-9%()+,./ -]+", " ", value)
    value = re.sub(r"\s+", " ", value).strip(" .:-")
    return value


def title_from_body(body: str, fallback: str, index: int) -> str:
    if fallback and fallback.lower() not in {"method", "solution", "step"}:
        return fallback[:80]
    plain = plain_for_title(body)
    if not plain:
        return f"Step {index}"
    words = plain.split()[:5]
    title = " ".join(words).strip()
    return title[:80] or f"Step {index}"


def split_blocks(body: str) -> list[str]:
    return [clean_text(block) for block in re.split(r"\n\s*\n", body) if clean_text(block)]


def is_math_block(block: str) -> bool:
    stripped = block.strip()
    return bool(
        re.fullmatch(r"\\\[[\s\S]*?\\\]", stripped)
        or re.fullmatch(r"\$\$[\s\S]*?\$\$", stripped)
        or re.fullmatch(r"\\\([\s\S]*?\\\)", stripped)
    )


def sections_from_text(source: str) -> list[tuple[str, str]]:
    sections: list[tuple[str, str]] = []
    title = "Method"
    buffer: list[str] = []

    def flush() -> None:
        nonlocal buffer
        body = clean_text("\n".join(buffer))
        if body:
            sections.append((title, body))
        buffer = []

    for line in source.splitlines():
        match = HEADING_RE.match(line)
        if match:
            flush()
            title = normalize_heading(match.group(1) or match.group(2) or "Step")
            continue
        buffer.append(line)
    flush()
    return sections


def make_steps(source: str) -> list[dict[str, str]]:
    steps: list[dict[str, str]] = []
    for heading, body in sections_from_text(source):
        blocks = split_blocks(body)
        if not blocks:
            continue
        if heading.lower() in {"method", "solution"}:
            for block in blocks:
                if is_math_block(block) and steps:
                    steps[-1]["body"] = clean_text(steps[-1]["body"] + "\n\n" + block)
                    continue
                steps.append(
                    {
                        "title": title_from_body(block, heading, len(steps) + 1),
                        "body": block,
                    }
                )
        else:
            steps.append(
                {
                    "title": title_from_body(body, heading, len(steps) + 1),
                    "body": body,
                }
            )
    if not steps and source.strip():
        steps.append({"title": "Method", "body": clean_text(source)})

    # Re-label repeated generic Step headings so they scan better in the UI.
    generic_seen = 0
    for step in steps:
        if step["title"].lower() == "step":
            generic_seen += 1
            step["title"] = f"Step {generic_seen}"
    return steps


def final_answer_from_steps(steps: list[dict[str, str]]) -> str:
    if not steps:
        return ""
    body = clean_text(steps[-1].get("body", ""))
    if not body:
        return ""
    blocks = split_blocks(body)
    candidate = blocks[-1] if blocks else body
    lines = [line.strip() for line in candidate.splitlines() if line.strip()]
    if len(lines) > 1:
        candidate = lines[-1]
    sentences = re.split(r"(?<=[.!?])\s+", candidate)
    candidate = sentences[-1].strip() if sentences else candidate
    return clean_text(candidate)


def migrate_solution(qid: str, solution: dict[str, Any]) -> tuple[dict[str, Any], Counter[str]]:
    stats: Counter[str] = Counter()
    if isinstance(solution.get("steps"), list) and "finalAnswer" in solution:
        migrated = dict(solution)
        migrated["checkedBy"] = migrated.pop("checked_by", migrated.get("checkedBy", ""))
        stats["already_structured"] += 1
        return migrated, stats

    source = clean_text(str(solution.get("source") or ""))
    source, topic_note = extract_topic_note(source)
    source, final_answer = extract_final_answer(source)
    steps = make_steps(source)
    if not final_answer:
        final_answer = final_answer_from_steps(steps)

    migrated = {
        "status": str(solution.get("status") or "saved"),
        "checkedBy": str(solution.get("checkedBy") or solution.get("checked_by") or ""),
        "updated": str(solution.get("updated") or datetime.now().isoformat(timespec="seconds")),
        "topicNote": topic_note,
        "steps": steps,
        "finalAnswer": final_answer,
    }

    stats["migrated"] += 1
    if topic_note:
        stats["topic_notes"] += 1
    if final_answer:
        stats["final_answers"] += 1
    else:
        stats["missing_final_answer"] += 1
    if not steps:
        stats["missing_steps"] += 1

    public_text = "\n\n".join([step["title"] + "\n" + step["body"] for step in steps] + [final_answer])
    if PRIVATE_TEXT_RE.search(public_text):
        stats["private_text_remaining"] += 1
    return migrated, stats


def migrate_file(path: Path) -> tuple[dict[str, Any], Counter[str]]:
    data = read_json(path)
    stats: Counter[str] = Counter()
    output = {"paperSlug": data.get("paperSlug"), "solutions": {}}
    for qid, solution in (data.get("solutions") or {}).items():
        if not isinstance(solution, dict):
            stats["invalid_solution_object"] += 1
            continue
        migrated, item_stats = migrate_solution(qid, solution)
        stats.update(item_stats)
        output["solutions"][qid] = migrated
    return output, stats


def write_report(stats: Counter[str], changed_files: int) -> None:
    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    lines = [
        "# Solution Migration Report",
        "",
        "Phase 2 migrated Linear/Modular website solutions from legacy markdown `source` blobs into the shared structured solution schema.",
        "",
        "## Summary",
        "",
        f"- Files processed: `{changed_files}`",
        f"- Solutions migrated: `{stats['migrated']}`",
        f"- Already structured: `{stats['already_structured']}`",
        f"- Topic notes moved to private `topicNote`: `{stats['topic_notes']}`",
        f"- Final answers extracted: `{stats['final_answers']}`",
        f"- Missing final-answer markers: `{stats['missing_final_answer']}`",
        f"- Missing step bodies: `{stats['missing_steps']}`",
        f"- Private checking text still in public fields: `{stats['private_text_remaining']}`",
        "",
        "## Student-facing rule",
        "",
        "`topicNote`, `status`, `checkedBy`, and `updated` are internal metadata. The website renderer shows only `steps[]` and `finalAnswer`.",
        "",
        "PDFs were not rebuilt in this phase. The Phase 8 PDF pass will consume this schema.",
    ]
    REPORT_PATH.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--write", action="store_true", help="write migrated JSON and report")
    args = parser.parse_args()

    total: Counter[str] = Counter()
    changed_files = 0
    migrated_payloads: list[tuple[Path, dict[str, Any]]] = []
    for path in sorted(SOLUTION_DIR.glob("*.json")):
        migrated, stats = migrate_file(path)
        total.update(stats)
        changed_files += 1
        migrated_payloads.append((path, migrated))

    if args.write:
        for path, payload in migrated_payloads:
            write_json(path, payload)
        write_report(total, changed_files)

    print(json.dumps({"files": changed_files, **total}, indent=2, sort_keys=True))
    return 1 if total["private_text_remaining"] or total["missing_steps"] else 0


if __name__ == "__main__":
    raise SystemExit(main())
