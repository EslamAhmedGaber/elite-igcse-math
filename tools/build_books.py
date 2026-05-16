"""
Build Elite IGCSE classified books from the normalized site data.

Public outputs are question-only books for downloads/.
Private outputs are answer books for private_output/ and must not be published.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
import textwrap
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import fitz  # PyMuPDF
from PIL import Image


ROOT = Path(__file__).resolve().parent.parent
QUESTION_DIR = ROOT / "src" / "data" / "questions"
SOLUTION_DIR = ROOT / "src" / "data" / "solutions"
PUBLIC_BOOK_DIR = ROOT / "downloads"
PRIVATE_BOOK_DIR = ROOT / "private_output"
BOOK_BUILD_DIR = ROOT / "tools" / "_book_build"
BOOK_STYLE_SOURCE = ROOT / "tools" / "book_assets" / "elite_igcse.sty"

A4_WIDTH = 595
A4_HEIGHT = 842
MARGIN = 42
NAVY = (17 / 255, 34 / 255, 64 / 255)
GOLD = (191 / 255, 147 / 255, 56 / 255)
INK = (28 / 255, 32 / 255, 38 / 255)
MUTED = (92 / 255, 99 / 255, 112 / 255)


@dataclass(frozen=True)
class BookSpec:
    filename: str
    title: str
    bank: str
    scope: str
    include_solutions: bool
    private: bool


UNIT_1_TOPICS = {
    "3D Pythagoras & Trigonometry",
    "Algebraic Fractions",
    "Algebraic Roots & Indices",
    "Area & Perimeter",
    "Circles, Arcs & Sectors",
    "Combined & Conditional Probability",
    "Completing the Square",
    "Coordinate Geometry",
    "Estimating Gradients",
    "Expanding Brackets",
    "Factorising",
    "Fractions",
    "Fractions, Decimals & Percentages",
    "Graphs of Functions",
    "Histograms",
    "Linear Graphs (y = mx + c)",
    "Probability Diagrams - Venn & Tree Diagrams",
    "Probability Toolkit",
    "Right-Angled Triangles - Pythagoras & Trigonometry",
    "Rounding, Estimation & Bounds",
    "Set Notation & Venn Diagrams",
    "Sine, Cosine Rule & Area of Triangles",
    "Solving Linear Equations",
    "Solving Quadratic Equations",
    "Standard & Compound Units",
    "Surds",
}

UNIT_2_TOPICS = {
    "Algebraic Proof",
    "Angles in Polygons & Parallel Lines",
    "Area & Volume of Similar Shapes",
    "Bearings, Scale Drawing & Constructions",
    "Circle Theorems",
    "Compound Interest & Depreciation",
    "Congruence, Similarity & Geometrical Proof",
    "Cumulative Frequency Diagrams",
    "Differentiation",
    "Direct & Inverse Proportion",
    "Exchange Rates & Best Buys",
    "Forming & Solving Equations",
    "Functions",
    "Graphing Inequalities",
    "Percentages",
    "Prime Factors, HCF & LCM",
    "Ratio Problem Solving",
    "Ratio Toolkit",
    "Rearranging Formulas",
    "Sequences",
    "Simultaneous Equations",
    "Solving Inequalities",
    "Statistics Toolkit",
    "Transformations",
    "Transformations of Graphs",
    "Vectors",
    "Volume & Surface Area",
}

PUBLIC_BOOKS = (
    BookSpec(
        filename="classified_problems.pdf",
        title="Elite IGCSE Classified Problems",
        bank="all",
        scope="complete",
        include_solutions=False,
        private=False,
    ),
    BookSpec(
        filename="Classified_Expertise.pdf",
        title="Elite IGCSE Classified Expertise",
        bank="expertise",
        scope="complete",
        include_solutions=False,
        private=False,
    ),
    BookSpec(
        filename="Classified_4WM1.pdf",
        title="Elite IGCSE Classified Unit 1 (4WM1)",
        bank="all",
        scope="unit1",
        include_solutions=False,
        private=False,
    ),
    BookSpec(
        filename="Classified_4WM2.pdf",
        title="Elite IGCSE Classified Unit 2 (4WM2)",
        bank="all",
        scope="unit2",
        include_solutions=False,
        private=False,
    ),
    BookSpec(
        filename="Classified_4WM1_Expertise.pdf",
        title="Elite IGCSE Classified Unit 1 Expertise (Q20+)",
        bank="expertise",
        scope="unit1",
        include_solutions=False,
        private=False,
    ),
    BookSpec(
        filename="Classified_4WM2_Expertise.pdf",
        title="Elite IGCSE Classified Unit 2 Expertise (Q20+)",
        bank="expertise",
        scope="unit2",
        include_solutions=False,
        private=False,
    ),
)

PRIVATE_BOOKS = (
    BookSpec(
        filename="classified_answers.pdf",
        title="Elite IGCSE Classified Answers",
        bank="all",
        scope="complete",
        include_solutions=True,
        private=True,
    ),
    BookSpec(
        filename="Classified_Expertise_Answers.pdf",
        title="Elite IGCSE Classified Expertise Answers",
        bank="expertise",
        scope="complete",
        include_solutions=True,
        private=True,
    ),
    BookSpec(
        filename="Classified_4WM1_Answers.pdf",
        title="Elite IGCSE Classified Unit 1 Answers (4WM1)",
        bank="all",
        scope="unit1",
        include_solutions=True,
        private=True,
    ),
    BookSpec(
        filename="Classified_4WM2_Answers.pdf",
        title="Elite IGCSE Classified Unit 2 Answers (4WM2)",
        bank="all",
        scope="unit2",
        include_solutions=True,
        private=True,
    ),
    BookSpec(
        filename="Classified_4WM1_Expertise_Answers.pdf",
        title="Elite IGCSE Classified Unit 1 Expertise Answers (Q20+)",
        bank="expertise",
        scope="unit1",
        include_solutions=True,
        private=True,
    ),
    BookSpec(
        filename="Classified_4WM2_Expertise_Answers.pdf",
        title="Elite IGCSE Classified Unit 2 Expertise Answers (Q20+)",
        bank="expertise",
        scope="unit2",
        include_solutions=True,
        private=True,
    ),
)

UNICODE_REPLACEMENTS = {
    "\u00a0": " ",
    "\u00b0": " degrees",
    "\u00d7": " x ",
    "\u00f7": " / ",
    "\u2013": "-",
    "\u2014": "-",
    "\u2018": "'",
    "\u2019": "'",
    "\u201c": '"',
    "\u201d": '"',
    "\u2026": "...",
    "\u2212": "-",
    "\u2264": "<=",
    "\u2265": ">=",
    "\u2248": "~=",
}


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def rel(path: Path) -> str:
    try:
        return str(path.relative_to(ROOT)).replace("\\", "/")
    except ValueError:
        return str(path)


def clean_text(text: str) -> str:
    for old, new in UNICODE_REPLACEMENTS.items():
        text = text.replace(old, new)
    return text.encode("latin-1", "replace").decode("latin-1")


def solution_markdown_to_text(markdown: str) -> str:
    text = markdown.replace("\r\n", "\n").replace("\r", "\n")
    text = re.sub(r"\\\[(.*?)\\\]", lambda m: "\n" + m.group(1).strip() + "\n", text, flags=re.S)
    text = text.replace(r"\(", "").replace(r"\)", "")
    text = text.replace(r"\[", "").replace(r"\]", "")
    text = re.sub(r"\*\*(.*?)\*\*", r"\1", text)
    text = re.sub(r"^\s*[-*]\s+", "- ", text, flags=re.M)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return clean_text(text.strip())


LATEX_UNICODE_REPLACEMENTS = {
    "\u00a0": " ",
    "\u2001": " ",
    "\u2004": " ",
    "\u2005": " ",
    "\u2006": " ",
    "\u200a": " ",
    "\u2009": " ",
    "\u202f": " ",
    "\u00a3": r"\pounds{}",
    "\u2013": "--",
    "\u2014": "--",
    "\u2212": "-",
    "\u00b1": r"\(\pm\)",
    "\u00d7": r"\(\times\)",
    "\u00f7": r"\(\div\)",
    "\u03bb": r"\(\lambda\)",
    "\u03bc": r"\(\mu\)",
    "\u03c0": r"\(\pi\)",
    "\u2192": r"\(\to\)",
    "\u2194": r"\(\leftrightarrow\)",
    "\u2218": r"\(\circ\)",
    "\u2220": r"\(\angle\)",
    "\u2264": r"\(\le\)",
    "\u2265": r"\(\ge\)",
    "\u2260": r"\(\ne\)",
    "\u2248": r"\(\approx\)",
    "\u22c5": r"\(\cdot\)",
    "\u25b3": r"\(\triangle\)",
    "\u27f9": r"\(\Longrightarrow\)",
    "\u00b0": r"\(^\circ\)",
    "\u2026": r"\(\ldots\)",
    "\u2018": "'",
    "\u2019": "'",
    "\u201c": "``",
    "\u201d": "''",
}


def normalize_latex_text(text: str) -> str:
    for old, new in LATEX_UNICODE_REPLACEMENTS.items():
        text = text.replace(old, new)
    return text


def prepare_solution_markdown(markdown: str) -> str:
    text = markdown.replace("\r\n", "\n").replace("\r", "\n")
    for space in ("\u00a0", "\u2001", "\u2004", "\u2005", "\u2006", "\u2009", "\u200a", "\u202f"):
        text = text.replace(space, " ")
    text = text.replace(r"\<", "<").replace(r"\>", ">")
    text = re.sub(r"</?span\b[^>]*>", "", text, flags=re.I)
    text = re.sub(r"<sup>(.*?)</sup>", r"^{\1}", text, flags=re.I | re.S)
    text = re.sub(r"<sub>(.*?)</sub>", r"_{\1}", text, flags=re.I | re.S)
    text = re.sub(r"<br\s*/?>", "\n", text, flags=re.I)

    def display_math_replacement(match: re.Match[str]) -> str:
        body = match.group(1).strip()
        body = body.replace("\\\\", "\\").replace(r"\_", "_")
        body = body.replace(r"\[", "[").replace(r"\]", "]")
        body = re.sub(r"\\tag\{([^{}]+)\}", r"\\qquad\\text{(\1)}", body)
        return "\\[\n" + body + "\n\\]"

    text = re.sub(r"\$\$(.*?)\$\$", display_math_replacement, text, flags=re.S)

    def inline_math_replacement(match: re.Match[str]) -> str:
        body = match.group(1).strip()
        looks_like_math = bool(
            re.search(r"\\[A-Za-z]+", body)
            or re.fullmatch(r"[0-9A-Za-z\\{}^_+\-*/=().,<>: ;×÷≤≥≈]+", body)
        )
        if not looks_like_math:
            return match.group(0)
        body = body.replace("\\\\", "\\").replace(r"\_", "_")
        return r"\(" + body + r"\)"

    text = re.sub(r"(?<![\\$])\$(?!\$)(.+?)(?<![\\$])\$(?!\$)", inline_math_replacement, text, flags=re.S)
    return text


def latex_escape(text: str) -> str:
    replacements = {
        "\\": r"\textbackslash{}",
        "&": r"\&",
        "%": r"\%",
        "$": r"\$",
        "#": r"\#",
        "_": r"\_",
        "{": r"\{",
        "}": r"\}",
        "~": r"\textasciitilde{}",
        "^": r"\textasciicircum{}",
    }
    return "".join(replacements.get(char, char) for char in text)


def format_latex_text_segment(segment: str) -> str:
    parts = re.split(r"(\*\*.*?\*\*)", segment)
    rendered: list[str] = []
    for part in parts:
        if part.startswith("**") and part.endswith("**") and len(part) >= 4:
            rendered.append(r"\textbf{" + latex_escape(part[2:-2]) + "}")
        else:
            escaped = latex_escape(part)
            escaped = re.sub(r"\*([^*]+)\*", r"\\emph{\1}", escaped)
            rendered.append(escaped)
    text = "".join(rendered)
    for old, new in LATEX_UNICODE_REPLACEMENTS.items():
        text = text.replace(old, new)
    text = re.sub(r"\\textasciicircum\{\}\\\{([^{}]+)\\\}", r"\\textsuperscript{\1}", text)
    text = re.sub(r"\\_\\\{([^{}]+)\\\}", r"\\textsubscript{\1}", text)
    return text


def format_inline_latex(text: str) -> str:
    parts = re.split(r"(\\\(.*?\\\))", text)
    rendered: list[str] = []
    for part in parts:
        if part.startswith(r"\(") and part.endswith(r"\)"):
            rendered.append(r"\(" + math_line_to_latex(part[2:-2]) + r"\)")
        else:
            rendered.append(format_latex_text_segment(part))
    return "".join(rendered)


def is_raw_math_line(line: str) -> bool:
    stripped = line.strip()
    if not stripped:
        return False
    if stripped.startswith((r"\[", r"\]", r"\(", r"\)", "**", "- ")):
        return False
    if r"\(" in stripped or r"\)" in stripped:
        return False
    math_commands = (
        r"\frac",
        r"\sqrt",
        r"\times",
        r"\div",
        r"\le",
        r"\ge",
        r"\approx",
        r"\text",
        r"\pi",
        r"\sin",
        r"\cos",
        r"\tan",
        r"\theta",
        r"\angle",
        r"\boxed",
        r"\cdot",
        r"\dot",
        r"\left",
        r"\right",
        r"\begin",
        r"\end",
        r"\circ",
        r"\pm",
        r"\ldots",
    )
    if any(command in stripped for command in math_commands):
        return True
    return bool("=" in stripped and re.fullmatch(r"[0-9A-Za-z\\{}^_+\-*/=().,<>: ;×÷≤≥≈]+", stripped))


def math_line_to_latex(line: str) -> str:
    replacements = {
        "\u2013": "-",
        "\u2014": r"\text{--}",
        "\u2212": "-",
        "\u00d7": r"\times",
        "\u00f7": r"\div",
        "\u00b1": r"\pm",
        "\u03bb": r"\lambda",
        "\u03bc": r"\mu",
        "\u03c0": r"\pi",
        "\u2192": r"\to",
        "\u2194": r"\leftrightarrow",
        "\u2218": r"\circ",
        "\u2220": r"\angle",
        "\u2264": r"\le",
        "\u2265": r"\ge",
        "\u2260": r"\ne",
        "\u2248": r"\approx",
        "\u22c5": r"\cdot",
        "\u25b3": r"\triangle",
        "\u27f9": r"\Longrightarrow",
        "\u00b0": r"^\circ",
        "\u2026": r"\ldots",
    }
    for old, new in replacements.items():
        line = line.replace(old, new)
    previous = None
    while previous != line:
        previous = line
        line = re.sub(r"\*([A-Za-z]+)\*", r"\1", line)
    return line


def convert_solution_markdown(markdown: str) -> str:
    lines = prepare_solution_markdown(markdown).splitlines()
    output: list[str] = []
    in_math_block = False
    in_itemize = False
    pending_answer = False

    def close_itemize() -> None:
        nonlocal in_itemize
        if in_itemize:
            output.append(r"\end{itemize}")
            in_itemize = False

    for raw_line in lines:
        line = raw_line.rstrip()
        stripped = line.strip()

        if in_math_block:
            close_itemize()
            output.append(math_line_to_latex(stripped))
            if stripped == r"\]":
                in_math_block = False
            continue

        if not stripped:
            close_itemize()
            output.append("")
            continue

        if pending_answer:
            close_itemize()
            if is_raw_math_line(stripped):
                output.append(r"\finalanswerbox{\(" + math_line_to_latex(stripped) + r"\)}")
            else:
                output.append(r"\finalanswerbox{" + format_inline_latex(stripped) + "}")
            pending_answer = False
            continue

        if stripped == r"\[":
            close_itemize()
            output.append(r"\[")
            in_math_block = True
            continue

        topic_match = re.match(r"^\*\*Topic check:\*\*\s*(.*)$", stripped)
        if topic_match:
            close_itemize()
            output.extend(
                [
                    r"\begin{tcolorbox}[enhanced,breakable,colback=brandcream!65,colframe=brandgold!55,arc=3pt,boxrule=0.6pt,left=9pt,right=9pt,top=6pt,bottom=6pt]",
                    r"{\sffamily\bfseries\color{brandnavy}Topic check.} " + format_inline_latex(topic_match.group(1)),
                    r"\end{tcolorbox}",
                ]
            )
            continue

        answer_match = re.match(r"^\*\*Answers?:\*\*\s*(.*)$", stripped)
        if answer_match:
            close_itemize()
            output.append(r"\finalanswerbox{" + format_inline_latex(answer_match.group(1)) + "}")
            continue

        heading_match = re.match(r"^\*\*(.+?)\*\*$", stripped)
        if heading_match:
            close_itemize()
            output.append(r"{\sffamily\bfseries\color{brandnavy} " + format_inline_latex(heading_match.group(1)) + r"}\par")
            continue

        markdown_heading_match = re.match(r"^#{1,6}\s*(.+?)\s*$", stripped)
        if markdown_heading_match:
            close_itemize()
            heading = markdown_heading_match.group(1).strip()
            if heading.rstrip(":").strip().lower() in {"answer", "answers"}:
                pending_answer = True
            else:
                output.append(r"{\sffamily\bfseries\color{brandnavy} " + format_inline_latex(heading) + r"}\par")
            continue

        if stripped.startswith("- "):
            if not in_itemize:
                output.append(r"\begin{itemize}[leftmargin=*,itemsep=2pt,topsep=2pt]")
                in_itemize = True
            output.append(r"\item " + format_inline_latex(stripped[2:].strip()))
            continue

        if is_raw_math_line(stripped):
            close_itemize()
            output.extend([r"\[", math_line_to_latex(stripped), r"\]"])
            continue

        close_itemize()
        output.append(format_inline_latex(stripped) + r"\par")

    close_itemize()
    return "\n".join(output).strip() or r"\emph{No worked solution is saved yet.}"


def question_image_path(question: dict[str, Any]) -> Path:
    image = str(question.get("image") or "")
    if image.startswith("/"):
        image = image[1:]
    return ROOT / image


def load_questions() -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for path in sorted(QUESTION_DIR.glob("*.json")):
        paper = load_json(path)
        paper_fields = {
            "paper": paper.get("paper") or path.stem,
            "paperSlug": paper.get("paperSlug") or path.stem,
            "session": paper.get("session") or "",
            "code": paper.get("code") or "",
            "isModular": bool(paper.get("isModular")),
            "modularUnit": paper.get("modularUnit"),
        }
        for question in paper.get("questions", []):
            row = dict(question)
            row.update(paper_fields)
            rows.append(row)
    return rows


def load_solutions() -> dict[str, dict[str, Any]]:
    solutions: dict[str, dict[str, Any]] = {}
    for path in sorted(SOLUTION_DIR.glob("*.json")):
        data = load_json(path)
        for question_id, solution in (data.get("solutions") or {}).items():
            solutions[question_id] = solution
    return solutions


def sort_key(row: dict[str, Any]) -> tuple[int, str, str, int, str]:
    topic_order = row.get("topicOrder")
    if not isinstance(topic_order, int):
        topic_order = 9999
    q_number = row.get("q")
    if not isinstance(q_number, int):
        q_number = 0
    return (
        topic_order,
        str(row.get("topic") or ""),
        str(row.get("paperSlug") or ""),
        q_number,
        str(row.get("id") or ""),
    )


def has_standard_form_signal(row: dict[str, Any]) -> bool:
    text = str(row.get("text") or "").lower()
    return bool(
        re.search(
            r"standard form|scientific notation|[×x]\s*10|times\s*10|population|surface area|coastline",
            text,
        )
    )


def modular_unit_for_row(row: dict[str, Any]) -> str | None:
    forced = row.get("modularForceUnit") or row.get("modularUnit")
    if forced in {"Unit 1", "Unit 2"}:
        return str(forced)

    code = str(row.get("code") or "").upper()
    if code.startswith("4WM1"):
        return "Unit 1"
    if code.startswith("4WM2"):
        return "Unit 2"

    topic = str(row.get("topic") or "")
    if topic == "Powers, Roots & Standard Form":
        return "Unit 2" if has_standard_form_signal(row) else "Unit 1"
    if topic in UNIT_1_TOPICS:
        return "Unit 1"
    if topic in UNIT_2_TOPICS:
        return "Unit 2"
    return None


def matches_scope(row: dict[str, Any], scope: str) -> bool:
    if scope == "complete":
        return True
    if scope == "unit1":
        return modular_unit_for_row(row) == "Unit 1"
    if scope == "unit2":
        return modular_unit_for_row(row) == "Unit 2"
    raise ValueError(f"Unknown book scope: {scope}")


def group_rows(rows: list[dict[str, Any]], spec: BookSpec, limit: int | None = None) -> list[dict[str, Any]]:
    filtered = [row for row in rows if row.get("bank") == spec.bank and matches_scope(row, spec.scope)]
    filtered.sort(key=sort_key)
    if limit is not None:
        return filtered[:limit]
    return filtered


def add_footer(page: fitz.Page, label: str, page_number: int) -> None:
    page.insert_text(
        (MARGIN, A4_HEIGHT - 24),
        clean_text(label),
        fontsize=8,
        fontname="helv",
        color=MUTED,
    )
    page.insert_text(
        (A4_WIDTH - MARGIN - 28, A4_HEIGHT - 24),
        str(page_number),
        fontsize=8,
        fontname="helv",
        color=MUTED,
    )


def add_cover(doc: fitz.Document, spec: BookSpec, row_count: int) -> None:
    page = doc.new_page(width=A4_WIDTH, height=A4_HEIGHT)
    page.draw_rect(fitz.Rect(0, 0, A4_WIDTH, A4_HEIGHT), color=None, fill=(250 / 255, 249 / 255, 245 / 255))
    page.draw_rect(fitz.Rect(0, 0, 12, A4_HEIGHT), color=None, fill=GOLD)
    page.insert_textbox(
        fitz.Rect(MARGIN, 132, A4_WIDTH - MARGIN, 225),
        clean_text(spec.title),
        fontsize=25,
        fontname="helv",
        color=NAVY,
        align=fitz.TEXT_ALIGN_CENTER,
    )
    subtitle = "Private answer book" if spec.private else "Question-only classified book"
    page.insert_textbox(
        fitz.Rect(MARGIN, 238, A4_WIDTH - MARGIN, 300),
        f"{subtitle}\n{row_count} questions",
        fontsize=13,
        fontname="helv",
        color=MUTED,
        align=fitz.TEXT_ALIGN_CENTER,
    )
    policy = "Keep this file private." if spec.private else "Public download file."
    page.insert_textbox(
        fitz.Rect(MARGIN, 620, A4_WIDTH - MARGIN, 700),
        clean_text(policy),
        fontsize=10,
        fontname="helv",
        color=INK,
        align=fitz.TEXT_ALIGN_CENTER,
    )


def add_topic_page(doc: fitz.Document, topic: str, count: int) -> None:
    page = doc.new_page(width=A4_WIDTH, height=A4_HEIGHT)
    page.draw_rect(fitz.Rect(0, 0, A4_WIDTH, A4_HEIGHT), color=None, fill=(247 / 255, 249 / 255, 251 / 255))
    page.draw_rect(fitz.Rect(MARGIN, 220, A4_WIDTH - MARGIN, 222), color=GOLD, fill=GOLD)
    page.insert_textbox(
        fitz.Rect(MARGIN, 250, A4_WIDTH - MARGIN, 340),
        clean_text(topic),
        fontsize=22,
        fontname="helv",
        color=NAVY,
        align=fitz.TEXT_ALIGN_CENTER,
    )
    page.insert_textbox(
        fitz.Rect(MARGIN, 350, A4_WIDTH - MARGIN, 392),
        f"{count} questions",
        fontsize=12,
        fontname="helv",
        color=MUTED,
        align=fitz.TEXT_ALIGN_CENTER,
    )


def image_rect(path: Path, top: float) -> fitz.Rect:
    with Image.open(path) as image:
        width, height = image.size
    max_width = A4_WIDTH - (MARGIN * 2)
    max_height = A4_HEIGHT - top - MARGIN - 28
    scale = min(max_width / width, max_height / height)
    rendered_width = width * scale
    rendered_height = height * scale
    left = (A4_WIDTH - rendered_width) / 2
    return fitz.Rect(left, top, left + rendered_width, top + rendered_height)


def add_question_page(doc: fitz.Document, row: dict[str, Any], book_label: str, page_number: int) -> None:
    page = doc.new_page(width=A4_WIDTH, height=A4_HEIGHT)
    topic = str(row.get("topic") or "Unclassified")
    question = row.get("q") or "?"
    marks = row.get("marks") or "?"
    paper = str(row.get("paper") or row.get("paperSlug") or "")
    header = f"{topic}\n{paper} - Question {question} - {marks} marks"
    page.insert_textbox(
        fitz.Rect(MARGIN, 30, A4_WIDTH - MARGIN, 78),
        clean_text(header),
        fontsize=10.5,
        fontname="helv",
        color=NAVY,
    )
    page.draw_line((MARGIN, 84), (A4_WIDTH - MARGIN, 84), color=GOLD, width=0.7)

    path = question_image_path(row)
    if path.exists():
        page.insert_image(image_rect(path, 98), filename=str(path), keep_proportion=True)
    else:
        page.insert_textbox(
            fitz.Rect(MARGIN, 170, A4_WIDTH - MARGIN, 250),
            f"Missing image: {rel(path)}",
            fontsize=11,
            fontname="helv",
            color=(0.7, 0.0, 0.0),
        )
    add_footer(page, book_label, page_number)


def wrapped_lines(text: str, width: int = 88) -> list[str]:
    lines: list[str] = []
    for raw_line in text.splitlines():
        line = raw_line.rstrip()
        if not line:
            lines.append("")
            continue
        if line.startswith(("-", "Answer:", "Topic check:", "Method", "Solution")):
            initial = ""
        else:
            initial = ""
        wrapped = textwrap.wrap(line, width=width, replace_whitespace=False, break_long_words=False)
        lines.extend(wrapped or [initial])
    return lines


def add_solution_pages(
    doc: fitz.Document,
    row: dict[str, Any],
    solution: dict[str, Any] | None,
    book_label: str,
    page_counter: list[int],
) -> None:
    source = "No website solution is saved yet."
    status = "missing"
    if solution:
        source = str(solution.get("source") or "No solution text is saved yet.")
        status = str(solution.get("status") or "saved")

    title = f"Solution - {row.get('paper')} Q{row.get('q')} ({status})"
    lines = wrapped_lines(solution_markdown_to_text(source))
    lines_per_page = 50
    chunks = [lines[i : i + lines_per_page] for i in range(0, len(lines), lines_per_page)] or [[]]

    for index, chunk in enumerate(chunks, start=1):
        page_counter[0] += 1
        page = doc.new_page(width=A4_WIDTH, height=A4_HEIGHT)
        heading = title if len(chunks) == 1 else f"{title} - page {index}"
        page.insert_textbox(
            fitz.Rect(MARGIN, 30, A4_WIDTH - MARGIN, 70),
            clean_text(heading),
            fontsize=11,
            fontname="helv",
            color=NAVY,
        )
        page.draw_line((MARGIN, 78), (A4_WIDTH - MARGIN, 78), color=GOLD, width=0.7)
        y = 104
        for line in chunk:
            page.insert_text((MARGIN, y), clean_text(line), fontsize=9.5, fontname="helv", color=INK)
            y += 13
        add_footer(page, book_label, page_counter[0])


def scope_label(scope: str) -> str:
    if scope == "unit1":
        return "Unit 1 / 4WM1"
    if scope == "unit2":
        return "Unit 2 / 4WM2"
    return "Complete pathway"


def tex_image_path(build_dir: Path, row: dict[str, Any]) -> str:
    image = question_image_path(row)
    return os.path.relpath(image, build_dir).replace("\\", "/")


def private_latex_preamble(spec: BookSpec, row_count: int) -> list[str]:
    label = scope_label(spec.scope)
    subtitle = "Private answer book"
    if spec.bank == "expertise":
        subtitle += " - Q20+ expertise"
    return [
        "%====================================================================",
        "%  Elite IGCSE Academy",
        "%  Private worked-solution classified book",
        "%====================================================================",
        r"\documentclass[11pt,a4paper,openany]{book}",
        "",
        r"\usepackage[utf8]{inputenc}",
        r"\usepackage[T1]{fontenc}",
        r"\usepackage{lmodern}",
        r"\usepackage[a4paper,margin=18mm,top=20mm,bottom=18mm]{geometry}",
        r"\usepackage{fancyhdr}",
        r"\usepackage{titlesec}",
        r"\usepackage{elite_igcse}",
        r"\usepackage[hidelinks,pdfencoding=auto,bookmarksopen=false]{hyperref}",
        r"\hypersetup{",
        r"  colorlinks=true,",
        r"  linkcolor=[HTML]{0B2545},",
        r"  urlcolor=[HTML]{0B2545},",
        r"  citecolor=[HTML]{0B2545},",
        rf"  pdftitle={{{latex_escape(spec.title)}}},",
        r"  pdfauthor={Dr. Eslam Ahmed - Elite IGCSE Academy},",
        r"}",
        "",
        r"\newtcolorbox{solutionbody}{enhanced,breakable,colback=white,colframe=brandnavy!18,arc=4pt,boxrule=0.8pt,left=11pt,right=11pt,top=10pt,bottom=10pt,before skip=7pt,after skip=8pt,borderline west={2pt}{0pt}{brandgold}}",
        r"\newcommand{\finalanswerbox}[1]{\par\vspace{7pt}\noindent\begin{tcolorbox}[enhanced,breakable,colback=brandgoldlight!45,colframe=brandgold,arc=4pt,boxrule=1pt,left=10pt,right=10pt,top=7pt,bottom=7pt]{\sffamily\bfseries\color{brandnavy}FINAL ANSWER}\par #1\end{tcolorbox}\par}",
        r"\newcommand{\solutionmetabox}[3]{\begin{tcolorbox}[enhanced,colback=brandcream!75,colframe=brandgold!70,arc=4pt,boxrule=0.7pt,left=10pt,right=10pt,top=7pt,bottom=7pt,before skip=7pt,after skip=8pt]{\sffamily\bfseries\color{brandnavy}#1 \quad\textbar\quad Question #2}\\[-1pt]{\sffamily\small\color{textgrey}#3}\end{tcolorbox}}",
        r"\sloppy",
        r"\emergencystretch=3em",
        "",
        r"\pagestyle{fancy}",
        r"\fancyhf{}",
        r"\renewcommand{\headrulewidth}{0pt}",
        r"\renewcommand{\footrulewidth}{0pt}",
        r"\fancyfoot[LE,RO]{\small\textcolor{brandnavy}{\thepage}}",
        r"\fancyfoot[RE,LO]{\small\textcolor{textgrey}{\itshape Elite IGCSE Academy \,\textbar\, Dr.~Eslam Ahmed}}",
        r"\fancyhead[RE,LO]{\small\textcolor{textgrey}{\leftmark}}",
        "",
        r"\fancypagestyle{plain}{%",
        r"  \fancyhf{}",
        r"  \renewcommand{\headrulewidth}{0pt}",
        r"  \fancyfoot[LE,RO]{\small\textcolor{brandnavy}{\thepage}}",
        r"  \fancyfoot[RE,LO]{\small\textcolor{textgrey}{\itshape Elite IGCSE Academy \,\textbar\, Dr.~Eslam Ahmed}}",
        r"}",
        "",
        r"\titleformat{\chapter}[display]",
        r"  {\normalfont\sffamily\bfseries\color{brandnavy}}",
        r"  {\filright\Large{\color{brandgold}\textsc{Topic~\thechapter}}}",
        r"  {6pt}",
        r"  {\Huge\filright}",
        r"  [\vspace{4pt}{\color{brandgold}\hrule height 2pt}\vspace{-6pt}]",
        r"\titlespacing*{\chapter}{0pt}{-30pt}{18pt}",
        "",
        r"\setlength{\parskip}{4pt plus 1pt}",
        r"\setlength{\parindent}{0pt}",
        "",
        r"\begin{document}",
        r"\pagestyle{empty}",
        r"\begin{titlepage}",
        r"\begin{tikzpicture}[remember picture,overlay]",
        r"  \fill[brandcream] (current page.south west) rectangle (current page.north east);",
        r"  \fill[brandnavy] (current page.north west) rectangle ([yshift=-75mm]current page.north east);",
        r"  \fill[brandgold] ([yshift=-75mm]current page.north west) rectangle ([yshift=-78mm]current page.north east);",
        r"  \fill[brandnavy] (current page.south west) rectangle ([yshift=42mm]current page.south east);",
        r"  \fill[brandgold] ([yshift=42mm]current page.south west) rectangle ([yshift=45mm]current page.south east);",
        r"  \node[anchor=north, yshift=-30mm] at (current page.north) {\begin{minipage}{170mm}\centering",
        r"    {\sffamily\bfseries\color{brandgold}\fontsize{30}{34}\selectfont ELITE IGCSE ACADEMY}\\[6pt]",
        r"    {\sffamily\itshape\color{white}\Large Private Teacher Edition}",
        r"  \end{minipage}};",
        r"\end{tikzpicture}",
        "",
        r"\vspace*{86mm}",
        r"\begin{center}",
        rf"{{\sffamily\bfseries\color{{brandnavy}}\fontsize{{23}}{{28}}\selectfont {latex_escape(spec.title)}}}\\[10pt]",
        r"{\color{brandgold}\rule{50mm}{1.6pt}}",
        "",
        rf"\vspace{{14pt}}{{\sffamily\color{{textgrey}}\large {row_count} Questions \quad\textbullet\quad Question page then worked-solution page}}",
        r"\end{center}",
        "",
        r"\vspace{18mm}",
        r"\begin{center}",
        r"\begin{tcolorbox}[enhanced, width=118mm, colback=white, colframe=brandnavy,arc=4pt, boxrule=1.2pt, left=14pt, right=14pt, top=12pt, bottom=12pt,drop shadow={brandnavy!30}, halign=center,]",
        r"{\sffamily\color{brandgold}\small\textsc{Prepared \& Classified by}}\\[6pt]",
        r"{\sffamily\bfseries\color{brandnavydark}\fontsize{24}{28}\selectfont Dr.~Eslam Ahmed}\\[3pt]",
        r"{\sffamily\itshape\color{textgrey} Assistant Lecturer, Cairo University Faculty of Engineering}",
        r"\end{tcolorbox}",
        r"\end{center}",
        "",
        r"\vfill",
        r"\begin{tikzpicture}[remember picture,overlay]",
        r"  \node[anchor=south west, xshift=22mm, yshift=11mm] at (current page.south west) {\begin{minipage}{55mm}{\sffamily\color{brandgold}\footnotesize\textsc{Call}}\\{\sffamily\bfseries\color{white}\large +20\,112\,000\,9622}\end{minipage}};",
        rf"  \node[anchor=south, yshift=11mm] at (current page.south) {{\begin{{minipage}}{{78mm}}\centering{{\sffamily\color{{brandgold}}\footnotesize\textsc{{2026 Edition}}}}\\{{\sffamily\bfseries\color{{white}}\large {latex_escape(label)}}}\end{{minipage}}}};",
        r"  \node[anchor=south east, xshift=-22mm, yshift=11mm] at (current page.south east) {\begin{minipage}{70mm}\raggedleft{\sffamily\color{brandgold}\footnotesize\textsc{Private}}\\{\sffamily\bfseries\color{white}\normalsize Not for public download}\end{minipage}};",
        r"\end{tikzpicture}",
        r"\end{titlepage}",
        "",
        r"\thispagestyle{empty}",
        r"\null\vfill",
        rf"\begin{{center}}{{\sffamily\color{{textgrey}}\small {latex_escape(subtitle)}.\\[4pt]Each question is followed by its worked solution on the next page.}}\end{{center}}",
        r"\vfill\clearpage",
        r"\pagestyle{fancy}",
        r"\renewcommand{\contentsname}{Contents}",
        r"\setcounter{tocdepth}{0}",
        r"\tableofcontents",
        r"\clearpage",
    ]


def write_private_latex(
    spec: BookSpec,
    rows: list[dict[str, Any]],
    solutions: dict[str, dict[str, Any]],
    build_dir: Path,
) -> Path:
    build_dir.mkdir(parents=True, exist_ok=True)
    if not BOOK_STYLE_SOURCE.exists():
        raise FileNotFoundError(f"Missing LaTeX style file: {BOOK_STYLE_SOURCE}")
    shutil.copy2(BOOK_STYLE_SOURCE, build_dir / BOOK_STYLE_SOURCE.name)

    lines = private_latex_preamble(spec, len(rows))
    current_topic: str | None = None
    for row in rows:
        topic = str(row.get("topic") or "Unclassified")
        if topic != current_topic:
            current_topic = topic
            lines.extend(["", rf"\chapter{{{latex_escape(topic)}}}", ""])

        paper = str(row.get("paper") or row.get("paperSlug") or "")
        q_number = str(row.get("q") or "?")
        marks = str(row.get("marks") or "?")
        code = str(row.get("code") or "")
        session = str(row.get("session") or "")
        image_path = tex_image_path(build_dir, row)
        solution = solutions.get(str(row.get("id"))) or {}
        solution_tex = convert_solution_markdown(str(solution.get("source") or ""))

        lines.extend(
            [
                f"%--- {paper} Q{q_number} ---",
                rf"\classifiedquestionheader{{{latex_escape(code)}}}{{{latex_escape(session)}}}{{{latex_escape(q_number)}}}{{{latex_escape(marks)}}}{{{latex_escape(topic)}}}{{}}{{{latex_escape(paper)}}}",
                rf"\problemimagepage{{{image_path}}}",
                r"\clearpage",
                r"\solutionheader",
                rf"\solutionmetabox{{{latex_escape(paper)}}}{{{latex_escape(q_number)}}}{{{latex_escape(topic)}}}",
                r"\begin{solutionbody}",
                solution_tex,
                r"\end{solutionbody}",
                "",
            ]
        )

    lines.extend(["", r"\end{document}", ""])
    tex_path = build_dir / "main.tex"
    tex_path.write_text("\n".join(lines), encoding="utf-8")
    return tex_path


def compile_private_pdf(tex_path: Path, output_path: Path) -> None:
    pdflatex = shutil.which("pdflatex")
    if not pdflatex:
        raise RuntimeError("pdflatex is required to build private answer books.")

    for _ in range(2):
        result = subprocess.run(
            [pdflatex, "-interaction=nonstopmode", "-halt-on-error", tex_path.name],
            cwd=tex_path.parent,
            capture_output=True,
            text=True,
            check=False,
        )
        if result.returncode != 0:
            log_tail = "\n".join(result.stdout.splitlines()[-30:])
            raise RuntimeError(f"LaTeX build failed for {tex_path}:\n{log_tail}")

    built_pdf = tex_path.with_suffix(".pdf")
    output_path.parent.mkdir(parents=True, exist_ok=True)
    temp_path = output_path.with_name(f"{output_path.stem}.tmp{output_path.suffix}")
    shutil.copy2(built_pdf, temp_path)
    temp_path.replace(output_path)


def build_private_answer_pdf(
    spec: BookSpec,
    rows: list[dict[str, Any]],
    solutions: dict[str, dict[str, Any]],
    output_path: Path,
) -> None:
    build_dir = BOOK_BUILD_DIR / output_path.stem
    tex_path = write_private_latex(spec, rows, solutions, build_dir)
    compile_private_pdf(tex_path, output_path)


def build_vector_pdf(
    spec: BookSpec,
    rows: list[dict[str, Any]],
    solutions: dict[str, dict[str, Any]],
    output_path: Path,
) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    doc = fitz.open()
    doc.set_metadata(
        {
            "title": spec.title,
            "author": "Dr Eslam Ahmed",
            "subject": "Elite IGCSE Mathematics classified questions",
        }
    )
    add_cover(doc, spec, len(rows))

    topic_counts: dict[str, int] = {}
    for row in rows:
        topic = str(row.get("topic") or "Unclassified")
        topic_counts[topic] = topic_counts.get(topic, 0) + 1

    toc: list[list[int | str]] = [[1, spec.title, 1]]
    current_topic: str | None = None
    page_counter = [1]

    for row in rows:
        topic = str(row.get("topic") or "Unclassified")
        if topic != current_topic:
            current_topic = topic
            page_counter[0] += 1
            add_topic_page(doc, topic, topic_counts[topic])
            toc.append([1, topic, page_counter[0]])

        page_counter[0] += 1
        add_question_page(doc, row, spec.title, page_counter[0])
        if spec.include_solutions:
            add_solution_pages(doc, row, solutions.get(str(row.get("id"))), spec.title, page_counter)

    if toc:
        doc.set_toc(toc)
    temp_path = output_path.with_name(f"{output_path.stem}.tmp{output_path.suffix}")
    if temp_path.exists():
        temp_path.unlink()
    doc.save(temp_path, garbage=4, deflate=True)
    doc.close()
    temp_path.replace(output_path)


def collect_issues(rows: list[dict[str, Any]], solutions: dict[str, dict[str, Any]]) -> tuple[list[str], list[str]]:
    missing_images: list[str] = []
    missing_solutions: list[str] = []
    for row in rows:
        image = question_image_path(row)
        if not image.exists():
            missing_images.append(f"{row.get('id')} -> {rel(image)}")
        if str(row.get("id")) not in solutions:
            missing_solutions.append(str(row.get("id")))
    return missing_images, missing_solutions


def print_plan(
    rows: list[dict[str, Any]],
    solutions: dict[str, dict[str, Any]],
    specs: list[BookSpec],
    limit: int | None,
) -> int:
    exit_code = 0
    print("Elite IGCSE v2 book build plan")
    print(f"Question rows loaded: {len(rows)}")
    print(f"Website solutions loaded: {len(solutions)}")
    if limit is not None:
        print(f"Limit per book: {limit}")
    for spec in specs:
        book_rows = group_rows(rows, spec, limit)
        missing_images, missing_solutions = collect_issues(book_rows, solutions)
        target_dir = PRIVATE_BOOK_DIR if spec.private else PUBLIC_BOOK_DIR
        print(f"- {spec.filename}: {len(book_rows)} questions -> {rel(target_dir / spec.filename)}")
        if missing_images:
            exit_code = 1
            print(f"  missing images: {len(missing_images)}")
            for item in missing_images[:8]:
                print(f"    {item}")
        if spec.include_solutions and missing_solutions:
            exit_code = 1
            print(f"  missing solutions: {len(missing_solutions)}")
            for item in missing_solutions[:8]:
                print(f"    {item}")
    return exit_code


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build v2 classified question and answer books.")
    parser.add_argument("--dry-run", action="store_true", help="Show the book plan without writing PDFs.")
    parser.add_argument("--public", action="store_true", help="Write public question-only books.")
    parser.add_argument("--private", action="store_true", help="Write private answer books.")
    parser.add_argument("--all", action="store_true", help="Write both public and private books.")
    parser.add_argument("--book", action="append", default=[], help="Build one filename only; repeat for multiple books.")
    parser.add_argument("--limit", type=int, default=None, help="Limit questions per book for a smoke build.")
    parser.add_argument("--public-dir", type=Path, default=PUBLIC_BOOK_DIR, help="Output directory for public books.")
    parser.add_argument("--private-dir", type=Path, default=PRIVATE_BOOK_DIR, help="Output directory for private books.")
    return parser.parse_args()


def select_specs(args: argparse.Namespace) -> list[BookSpec]:
    selected: list[BookSpec] = []
    if args.all or not (args.public or args.private):
        selected.extend(PUBLIC_BOOKS)
        selected.extend(PRIVATE_BOOKS)
    else:
        if args.public:
            selected.extend(PUBLIC_BOOKS)
        if args.private:
            selected.extend(PRIVATE_BOOKS)

    requested = {str(item).lower() for item in args.book}
    if requested:
        selected = [spec for spec in selected if spec.filename.lower() in requested]
        found = {spec.filename.lower() for spec in selected}
        missing = sorted(requested - found)
        if missing:
            names = ", ".join(missing)
            available = ", ".join(spec.filename for spec in (*PUBLIC_BOOKS, *PRIVATE_BOOKS))
            raise ValueError(f"Unknown book filename(s): {names}. Available: {available}")
    return selected


def main() -> int:
    args = parse_args()
    rows = load_questions()
    solutions = load_solutions()
    try:
        selected = select_specs(args)
    except ValueError as exc:
        print(str(exc), file=sys.stderr)
        return 2

    if args.dry_run or not (args.public or args.private or args.all):
        return print_plan(rows, solutions, selected, args.limit)

    for spec in selected:
        output_dir = args.private_dir if spec.private else args.public_dir
        output_path = output_dir / spec.filename
        book_rows = group_rows(rows, spec, args.limit)
        missing_images, missing_solutions = collect_issues(book_rows, solutions)
        if missing_images:
            print(f"{spec.filename}: cannot build; {len(missing_images)} images are missing.", file=sys.stderr)
            return 1
        if spec.include_solutions and missing_solutions:
            print(f"{spec.filename}: cannot build; {len(missing_solutions)} solutions are missing.", file=sys.stderr)
            return 1
        print(f"Building {rel(output_path)} with {len(book_rows)} questions...")
        if spec.private and spec.include_solutions:
            build_private_answer_pdf(spec, book_rows, solutions, output_path)
        else:
            build_vector_pdf(spec, book_rows, solutions, output_path)
        print(f"Saved {rel(output_path)}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
