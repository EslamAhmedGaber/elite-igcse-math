r"""
Import worked solutions from trusted LaTeX answer files into structured JSON.

The importer supports the two legacy formats already used by Dr Eslam:
`\question{...}` blocks and `\qhdr{...}` blocks.
"""

from __future__ import annotations

import argparse
import json
import re
import subprocess
from datetime import datetime
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parent.parent
QUESTION_DIR = ROOT / "src" / "data" / "questions"
SOLUTION_DIR = ROOT / "src" / "data" / "solutions"
HEADER_RE = re.compile(r"\\(?:question|qhdr)\{")


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def strip_environment(text: str, name: str) -> str:
    text = re.sub(rf"\\begin\{{{name}\}}(?:\[[^\]]*\])?", "", text)
    text = re.sub(rf"\\end\{{{name}\}}", "", text)
    return text


def read_group(text: str, start: int) -> tuple[str, int]:
    if text[start] != "{":
        raise ValueError("expected opening brace")
    depth = 0
    chars: list[str] = []
    for index in range(start, len(text)):
        char = text[index]
        if char == "{":
            depth += 1
            if depth > 1:
                chars.append(char)
            continue
        if char == "}":
            depth -= 1
            if depth == 0:
                return "".join(chars), index + 1
            chars.append(char)
            continue
        chars.append(char)
    raise ValueError("unterminated brace group")


def replace_single_arg_command(text: str, command: str, replacement: str) -> str:
    needle = f"\\{command}"
    index = 0
    parts: list[str] = []
    while True:
        start = text.find(needle, index)
        if start == -1:
            parts.append(text[index:])
            return "".join(parts)
        parts.append(text[index:start])
        cursor = start + len(needle)
        if cursor >= len(text) or text[cursor] != "{":
            parts.append(needle)
            index = cursor
            continue
        content, end = read_group(text, cursor)
        parts.append(replacement.format(content=content))
        index = end


def replace_two_arg_command(text: str, command: str, replacement: str) -> str:
    needle = f"\\{command}"
    index = 0
    parts: list[str] = []
    while True:
        start = text.find(needle, index)
        if start == -1:
            parts.append(text[index:])
            return "".join(parts)
        parts.append(text[index:start])
        cursor = start + len(needle)
        if cursor >= len(text) or text[cursor] != "{":
            parts.append(needle)
            index = cursor
            continue
        first, cursor = read_group(text, cursor)
        if cursor >= len(text) or text[cursor] != "{":
            parts.append(text[start:cursor])
            index = cursor
            continue
        second, end = read_group(text, cursor)
        parts.append(replacement.format(first=first, second=second))
        index = end


def repair_mojibake(text: str) -> str:
    try:
        return text.encode("cp1252").decode("utf-8")
    except UnicodeError:
        return text


def clean_tex(block: str) -> str:
    block = block.split(r"\color{white}", 1)[0]
    block = block.split(r"\end{document}", 1)[0]
    block = "\n".join(line for line in block.splitlines() if not line.lstrip().startswith("%"))
    block = re.sub(r"\\begin\{tikzpicture\}.*?\\end\{tikzpicture\}", "", block, flags=re.S)
    block = re.sub(r"\\begin\{center\}.*?\\end\{center\}", "", block, flags=re.S)
    block = strip_environment(block, "solutionbox")
    block = strip_environment(block, "tcolorbox")
    block = strip_environment(block, "ansbox")
    block = strip_environment(block, "notebox")
    block = strip_environment(block, "tipbox")
    block = strip_environment(block, "partbox")
    block = strip_environment(block, "itemize")
    block = strip_environment(block, "enumerate")
    block = replace_single_arg_command(block, "finalanswer", r"\paragraph{{Answer:}} {content}")
    block = replace_single_arg_command(block, "Ans", r"\paragraph{{Answer:}} {content}")
    block = replace_two_arg_command(block, "pt", r"\paragraph{{Part ({first})}}")
    block = re.sub(r"\\mb\{.*?\}", "", block)
    block = replace_single_arg_command(block, "qs", r"\paragraph{{Required:}} {content}")
    block = replace_single_arg_command(block, "step", r"\paragraph{{Step:}} {content}")
    block = replace_single_arg_command(block, "Note", r"\paragraph{{Note:}} {content}")
    block = re.sub(r"\\(?:rs|smallskip|medskip|bigskip|newpage|centering|noindent|par)\b", "", block)
    block = re.sub(r"\\vspace\{.*?\}", "", block)
    block = re.sub(r"\n{3,}", "\n\n", block).strip()

    result = subprocess.run(
        ["pandoc", "--from=latex", "--to=gfm", "--wrap=none"],
        input=block,
        text=True,
        encoding="utf-8",
        errors="replace",
        capture_output=True,
    )
    if result.returncode != 0:
        block = block.replace(r"\\", "\n")
        block = re.sub(r"\n{3,}", "\n\n", block)
        return repair_mojibake(block.strip())
    return repair_mojibake(re.sub(r"\n{3,}", "\n\n", result.stdout).strip())


def extract_blocks(tex: str) -> dict[int, str]:
    matches: list[tuple[int, int, int]] = []
    for match in HEADER_RE.finditer(tex):
        cursor = match.end() - 1
        q_raw, cursor = read_group(tex, cursor)
        _, cursor = read_group(tex, cursor)
        _, cursor = read_group(tex, cursor)
        matches.append((match.start(), cursor, int(q_raw)))

    blocks: dict[int, str] = {}
    for index, (_, body_start, q_number) in enumerate(matches):
        end = matches[index + 1][0] if index + 1 < len(matches) else len(tex)
        blocks[q_number] = clean_tex(tex[body_start:end])
    return blocks


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("paper_slug", help="Paper slug, for example Nov2025_4WM2H")
    parser.add_argument("tex_path", type=Path, help="Trusted LaTeX source file")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    paper = load_json(QUESTION_DIR / f"{args.paper_slug}.json")
    solution_path = SOLUTION_DIR / f"{args.paper_slug}.json"
    solution_doc = load_json(solution_path) if solution_path.exists() else {
        "paperSlug": args.paper_slug,
        "solutions": {},
    }
    solutions = solution_doc.setdefault("solutions", {})
    blocks = extract_blocks(args.tex_path.read_text(encoding="utf-8"))

    all_by_q = {
        question["q"]: question
        for question in paper["questions"]
        if question["bank"] == "all"
    }

    created = 0
    for q_number, question in all_by_q.items():
        source = blocks.get(q_number)
        if not source:
            continue
        solutions[question["id"]] = {
            "status": "checked",
            "source": source,
            "updated": datetime.now().isoformat(timespec="seconds"),
            "checked_by": "Dr Eslam Ahmed + Codex",
            "imported_from": "legacy_tex",
        }
        created += 1

    for question in paper["questions"]:
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
