"""
Polish migrated solution step titles without changing worked-solution bodies.

The migration that introduced structured `steps[]` sometimes used sentence
fragments as titles. This script rewrites only `steps[].title` into short
imperative labels and reports anything still outside the style guide.
"""

from __future__ import annotations

import argparse
import copy
import json
import re
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parent.parent
SOLUTION_DIR = ROOT / "src" / "data" / "solutions"
DEFAULT_REPORT = ROOT / "tools" / "title_polish_report.json"

CONNECTOR_STARTS = {
    "after",
    "also",
    "and",
    "because",
    "for",
    "first",
    "if",
    "now",
    "since",
    "so",
    "then",
    "therefore",
    "using",
    "when",
}

GENERIC_TITLES = {
    "method",
    "solution",
    "working",
    "step",
    "step 1",
    "step 2",
    "step 3",
    "step 4",
    "step 5",
    "step 6",
    "step 7",
    "step 8",
}

STOP_WORDS = {
    "a",
    "an",
    "and",
    "are",
    "as",
    "at",
    "be",
    "by",
    "for",
    "from",
    "in",
    "into",
    "is",
    "of",
    "on",
    "or",
    "so",
    "than",
    "that",
    "the",
    "then",
    "to",
    "with",
}

TRAILING_FRAGMENTS = {
    "for",
    "from",
    "in",
    "into",
    "last",
    "of",
    "through",
    "to",
    "with",
}

GENERIC_OK_BUT_WEAK = {
    "calculate value",
    "evaluate fraction",
    "simplify surd",
}

VERBS = [
    "substitute",
    "solve",
    "factorise",
    "factorize",
    "expand",
    "differentiate",
    "integrate",
    "apply",
    "calculate",
    "compute",
    "simplify",
    "rearrange",
    "equate",
    "combine",
    "square",
    "add",
    "subtract",
    "multiply",
    "divide",
    "take",
    "use",
    "let",
    "set",
    "find",
    "show",
    "prove",
    "rewrite",
    "convert",
    "group",
    "collect",
    "identify",
    "plot",
    "sketch",
    "compare",
    "match",
    "pick",
    "read",
    "estimate",
    "check",
    "write",
]

VERB_LABELS = {
    "factorise": "Factorise",
    "factorize": "Factorise",
}


@dataclass
class TitleIssue:
    path: str
    qid: str
    step: int
    old: str
    new: str
    reasons: list[str]


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, payload: Any) -> None:
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def strip_math(value: str) -> str:
    text = str(value or "")
    text = re.sub(r"\\\[[\s\S]*?\\\]", " ", text)
    text = re.sub(r"\\\([\s\S]*?\\\)", " ", text)
    text = re.sub(r"\$\$[\s\S]*?\$\$", " ", text)
    text = re.sub(r"\$[^$\n]+\$", " ", text)
    text = re.sub(r"\\[a-zA-Z]+(?:\{[^{}]*\})?", " ", text)
    text = re.sub(r"<[^>]+>", " ", text)
    text = text.replace(":", " ")
    text = re.sub(r"[*_`#>\[\]{}]", " ", text)
    text = re.sub(r"[^A-Za-z0-9%()+,./ -]+", " ", text)
    return re.sub(r"\s+", " ", text).strip(" ,.;:-")


def normalise_title(value: str) -> str:
    title = re.sub(r"\s+", " ", str(value or "")).strip()
    title = title.strip(" \t\r\n")
    title = title.rstrip(" ,.;:")
    title = re.sub(r"\s+,", ",", title)
    title = title.replace(" ,", ",")
    return title


def title_words(value: str) -> list[str]:
    return re.findall(r"[A-Za-z0-9%()+/-]+", value or "")


def awkward_reasons(title: str) -> list[str]:
    raw = str(title or "")
    cleaned = normalise_title(raw)
    words = title_words(cleaned)
    reasons: list[str] = []
    if not cleaned:
      reasons.append("empty")
    if raw.strip().endswith((",", ".", ":", ";")):
      reasons.append("trailing-punctuation")
    if cleaned.lower() in GENERIC_TITLES or re.match(r"step\s+\d+\b", cleaned, re.I):
      reasons.append("generic")
    if words and words[0].lower() in CONNECTOR_STARTS:
      reasons.append("connector-start")
    if len(words) > 5:
      reasons.append("too-long")
    if re.search(r"\s+(and|or|but)$", cleaned, re.I):
      reasons.append("trailing-connective")
    if words and words[-1].lower() in TRAILING_FRAGMENTS:
      reasons.append("trailing-fragment")
    if cleaned.lower().startswith(("use correct", "use maths", "use the part", "use the line")):
      reasons.append("fragment")
    if cleaned.lower().startswith("review method"):
      reasons.append("generic")
    if "," in cleaned:
      reasons.append("comma-fragment")
    if cleaned.lower().startswith(("girls boys", "boys climbing", "boys sailing", "girls sailing")):
      reasons.append("fragment")
    return reasons


def step_reasons(title: str, body: str, topic_note: str = "") -> list[str]:
    reasons = awkward_reasons(title)
    cleaned = normalise_title(title).lower()
    if cleaned in GENERIC_OK_BUT_WEAK:
        specific = label_from_patterns("", body, topic_note)
        if specific and specific.lower() != cleaned:
            reasons.append("generic-specific")
    return reasons


def first_sentence(text: str) -> str:
    plain = strip_math(text)
    if not plain:
        return ""
    pieces = re.split(r"(?<=[.!?])\s+", plain)
    return pieces[0].strip()


def compact_words(words: list[str], max_words: int = 5) -> str:
    output: list[str] = []
    for word in words:
        clean = word.strip(" ,.;:").replace("-", " ")
        if not clean:
            continue
        for part in clean.split():
            if part.lower() in {"the", "a", "an"} and len(output) >= 2:
                continue
            output.append(part)
            if len(output) >= max_words:
                return " ".join(output)
    return " ".join(output)


def label_from_verb(sentence: str) -> str | None:
    words = title_words(sentence)
    if not words:
        return None
    lower_words = [word.lower() for word in words]
    for index, word in enumerate(lower_words):
        if word not in VERBS:
            continue
        verb = VERB_LABELS.get(word, word.capitalize())
        tail = words[index + 1 : index + 6]
        phrase_words = [verb]
        for item in tail:
            low = item.lower()
            if low in {"then", "so", "because", "where", "when"}:
                break
            if low in STOP_WORDS and len(phrase_words) >= 3:
                continue
            phrase_words.append(item)
            if len(phrase_words) >= 5:
                break
        return normalise_title(" ".join(phrase_words))
    return None


def label_from_patterns(title: str, body: str, topic_note: str = "") -> str | None:
    combined = " ".join([title, first_sentence(body), topic_note]).lower()
    body_text = body.lower()

    pattern_labels = [
        (r"lowest common multiple|\blcm\b", "Find the LCM"),
        (r"highest common factor|\bhcf\b", "Find the HCF"),
        (r"cosine rule", "Use cosine rule"),
        (r"sine rule", "Use sine rule"),
        (r"quadratic formula", "Use quadratic formula"),
        (r"common difference", "Find common difference"),
        (r"sum formula", "Use sum formula"),
        (r"common denominator", "Use common denominator"),
        (r"arithmetic series", "Use series formula"),
        (r"intersecting chords", "Use chord theorem"),
        (r"circle theorem|cyclic|tangent", "Use circle theorem"),
        (r"density|aluminium|matches", "Compare density"),
        (r"compare with", "Compare coefficients"),
        (r"upper bound", "Find upper bound"),
        (r"lower bound", "Find lower bound"),
        (r"standard form|times 10", "Convert standard form"),
        (r"compound interest|depreciation|interest rate", "Use compound interest"),
        (r"red faces|black pens|two turns", "List probability cases"),
        (r"angle bisector|compass", "Construct angle bisector"),
        (r"class interval|midpoints", "Find class midpoints"),
        (r"normal price|discount", "Calculate normal price"),
        (r"vertical boundary", "Identify vertical boundary"),
        (r"corresponding sides|similar shapes", "Identify matching sides"),
        (r"median", "Find median"),
        (r"substitute .*y|substitute y", "Substitute into equation"),
        (r"cone has radius|radius .* height", "Define cone dimensions"),
        (r"reflection|reflected|transformed parabola|transformation|\\to", "Apply transformation"),
        (r"\\notin|not prime| is prime|prime\\.", "Check prime condition"),
        (r"ratio|girls|boys|sailing|climbing", "Split the ratio"),
        (r"inverse function|inverse|domain|range", "Find inverse function"),
        (r"x-intercept|y-intercept|intercept", "Find intercepts"),
        (r"turning point|completed square", "Find turning point"),
        (r"line through", "Find line equation"),
        (r"gradient|perpendicular|parallel", "Find the gradient"),
        (r"midpoint", "Find the midpoint"),
        (r"bearing", "Use bearings"),
        (r"angle|trigonometry|sine|cosine|tangent|\\sin|\\cos|\\tan", "Use trigonometry"),
        (r"pythagoras|hypotenuse", "Use Pythagoras"),
        (r"surface area", "Calculate surface area"),
        (r"area", "Calculate area"),
        (r"volume", "Calculate volume"),
        (r"probability", "Calculate probability"),
        (r"tree diagram", "Use tree diagram"),
        (r"cumulative frequency", "Use cumulative frequency"),
        (r"box plot", "Read box plot"),
        (r"histogram", "Use histogram"),
        (r"mean|median|mode|range", "Calculate statistic"),
        (r"frequency", "Use frequency table"),
        (r"simultaneous", "Solve simultaneous equations"),
        (r"quadratic", "Solve quadratic equation"),
        (r"factoris|factoriz", "Factorise expression"),
        (r"expand", "Expand brackets"),
        (r"inequality", "Solve inequality"),
        (r"formula|subject", "Rearrange formula"),
        (r"equation", "Solve equation"),
        (r"graph|plot|sketch", "Read the graph"),
        (r"sequence|term|nth", "Find the nth term"),
        (r"surd|sqrt|\\sqrt", "Simplify surd"),
        (r"index|indices|power", "Use index laws"),
        (r"fraction", "Simplify fraction"),
        (r"percentage|percent|%", "Calculate percentage"),
        (r"estimate|round", "Estimate the value"),
        (r"vector", "Use vectors"),
        (r"matrix|matrices", "Use matrices"),
        (r"differenti", "Differentiate"),
        (r"integrat", "Integrate"),
    ]
    for pattern, label in pattern_labels:
        if re.search(pattern, combined) or re.search(pattern, body_text):
            return label
    return None


def label_from_math(body: str, topic_note: str = "") -> str | None:
    text = body.lower()
    topic = topic_note.lower()
    if r"\frac" in text and "formula" in topic:
        return "Rearrange formula"
    if r"\frac" in text:
        return "Evaluate fraction"
    if r"\sqrt" in text:
        return "Simplify surd"
    if r"\times 10" in text:
        return "Convert standard form"
    if r"\le" in text or r"\ge" in text or "<" in text or ">" in text:
        return "Solve inequality"
    if "=" in text:
        return "Calculate value"
    return None


def derive_title(old_title: str, body: str, topic_note: str = "", step_index: int = 1) -> str:
    sentence = first_sentence(body)
    candidates = [
        label_from_patterns(old_title, body, topic_note),
        label_from_verb(sentence),
        label_from_verb(strip_math(body)),
        label_from_math(body, topic_note),
    ]
    for candidate in candidates:
        if candidate:
            cleaned = normalise_title(candidate)
            if cleaned and not awkward_reasons(cleaned):
                return cleaned

    old_clean = normalise_title(old_title)
    if old_clean and not awkward_reasons(old_clean):
        return old_clean

    topic_clean = re.sub(
        r"\b(corrected?|internal|classification|note|question|tag|topic|includes|stronger|signal|review)\b",
        " ",
        topic_note,
        flags=re.I,
    )
    topic_words = [word for word in title_words(topic_clean) if word.lower() not in STOP_WORDS][:4]
    if topic_words:
        return compact_words(["Use", *topic_words], 5)
    return f"Review method {step_index}"


def title_only_snapshot(solution: dict[str, Any]) -> Any:
    copied = copy.deepcopy(solution)
    for step in copied.get("steps", []) or []:
        if isinstance(step, dict):
            step["title"] = "__TITLE__"
    return copied


def iter_solution_paths() -> list[Path]:
    return sorted(SOLUTION_DIR.glob("*.json"))


def scan(apply: bool = False) -> dict[str, Any]:
    before_issues: list[TitleIssue] = []
    remaining_issues: list[TitleIssue] = []
    changed: list[TitleIssue] = []
    total_titles = 0
    files_changed = 0
    protected_mismatches: list[str] = []

    for path in iter_solution_paths():
        data = load_json(path)
        original = copy.deepcopy(data)
        file_changed = False
        for qid, solution in (data.get("solutions") or {}).items():
            if not isinstance(solution, dict):
                continue
            topic_note = str(solution.get("topicNote") or "")
            for step_index, step in enumerate(solution.get("steps") or [], start=1):
                if not isinstance(step, dict):
                    continue
                total_titles += 1
                old_title = str(step.get("title") or "")
                reasons = step_reasons(old_title, str(step.get("body") or ""), topic_note)
                if not reasons:
                    continue
                new_title = derive_title(old_title, str(step.get("body") or ""), topic_note, step_index)
                issue = TitleIssue(str(path.relative_to(ROOT)), qid, step_index, old_title, new_title, reasons)
                before_issues.append(issue)
                if apply and new_title != old_title:
                    step["title"] = new_title
                    changed.append(issue)
                    file_changed = True

        if apply:
            for qid, solution in (data.get("solutions") or {}).items():
                old_solution = (original.get("solutions") or {}).get(qid)
                if title_only_snapshot(solution) != title_only_snapshot(old_solution):
                    protected_mismatches.append(f"{path.relative_to(ROOT)}::{qid}")
            if file_changed:
                write_json(path, data)
                files_changed += 1

        after_data = data if apply else original
        for qid, solution in (after_data.get("solutions") or {}).items():
            if not isinstance(solution, dict):
                continue
            topic_note = str(solution.get("topicNote") or "")
            for step_index, step in enumerate(solution.get("steps") or [], start=1):
                if not isinstance(step, dict):
                    continue
                reasons = step_reasons(str(step.get("title") or ""), str(step.get("body") or ""), topic_note)
                if reasons:
                    remaining_issues.append(
                        TitleIssue(
                            str(path.relative_to(ROOT)),
                            qid,
                            step_index,
                            str(step.get("title") or ""),
                            derive_title(str(step.get("title") or ""), str(step.get("body") or ""), topic_note, step_index),
                            reasons,
                        )
                    )

    report = {
        "mode": "apply" if apply else "audit",
        "totalTitles": total_titles,
        "awkwardBefore": len(before_issues),
        "changed": len(changed),
        "awkwardRemaining": len(remaining_issues),
        "filesChanged": files_changed,
        "protectedMismatches": protected_mismatches,
        "examplesBefore": [asdict(item) for item in before_issues[:40]],
        "examplesChanged": [asdict(item) for item in changed[:80]],
        "examplesRemaining": [asdict(item) for item in remaining_issues[:80]],
    }
    if protected_mismatches:
        raise SystemExit("Refusing to continue: non-title solution fields changed.")
    return report


def main() -> None:
    parser = argparse.ArgumentParser(description="Audit or polish structured solution step titles.")
    parser.add_argument("--apply", action="store_true", help="rewrite awkward titles in source solution JSON")
    parser.add_argument("--report", type=Path, default=DEFAULT_REPORT, help="where to write the JSON report")
    args = parser.parse_args()

    report = scan(apply=args.apply)
    args.report.parent.mkdir(parents=True, exist_ok=True)
    write_json(args.report, report)
    print(
        f"mode={report['mode']} total={report['totalTitles']} "
        f"awkwardBefore={report['awkwardBefore']} changed={report['changed']} "
        f"remaining={report['awkwardRemaining']} filesChanged={report['filesChanged']} "
        f"report={args.report}"
    )
    if args.apply and report["awkwardRemaining"] >= 50:
        raise SystemExit(2)


if __name__ == "__main__":
    main()
