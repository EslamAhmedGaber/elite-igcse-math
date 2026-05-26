"""
Build Elite IGCSE classified books from the normalized site data.

Public outputs are question-only books for downloads/.
Answer outputs are built in private_output/ first, then published only through
the approved student-facing mirror step.
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
NAVY = (22 / 255, 27 / 255, 46 / 255)
NAVY_DARK = (14 / 255, 18 / 255, 32 / 255)
RED = (192 / 255, 57 / 255, 43 / 255)
RED_DARK = (141 / 255, 40 / 255, 32 / 255)
GREEN = (90 / 255, 128 / 255, 116 / 255)
GOLD = (192 / 255, 138 / 255, 62 / 255)
GOLD_LIGHT = (220 / 255, 184 / 255, 119 / 255)
CREAM = (251 / 255, 246 / 255, 230 / 255)
VELLUM = (235 / 255, 223 / 255, 196 / 255)
WHITE = (1, 1, 1)
INK = (26 / 255, 24 / 255, 21 / 255)
MUTED = (90 / 255, 82 / 255, 88 / 255)
LINE = (207 / 255, 201 / 255, 190 / 255)
WATERMARK = (244 / 255, 245 / 255, 248 / 255)


@dataclass(frozen=True)
class BookPalette:
    label: str
    question: tuple[float, float, float]
    question_dark: tuple[float, float, float]
    answer: tuple[float, float, float]
    accent: tuple[float, float, float]
    accent_soft: tuple[float, float, float]


LINEAR_PALETTE = BookPalette(
    label="Linear",
    question=NAVY,
    question_dark=NAVY_DARK,
    answer=NAVY_DARK,
    accent=GOLD,
    accent_soft=GOLD_LIGHT,
)
MODULAR_PALETTE = BookPalette(
    label="Modular",
    question=RED,
    question_dark=RED_DARK,
    answer=NAVY_DARK,
    accent=GOLD,
    accent_soft=GOLD_LIGHT,
)


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


def repair_mojibake(text: str) -> str:
    if "Ã" not in text and "â" not in text:
        return text
    try:
        repaired = text.encode("cp1252").decode("utf-8")
    except (UnicodeEncodeError, UnicodeDecodeError):
        return text
    original_noise = text.count("Ã") + text.count("â")
    repaired_noise = repaired.count("Ã") + repaired.count("â")
    return repaired if repaired_noise < original_noise else text


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def rel(path: Path) -> str:
    try:
        return str(path.relative_to(ROOT)).replace("\\", "/")
    except ValueError:
        return str(path)


def clean_text(text: str) -> str:
    text = repair_mojibake(text)
    for old, new in UNICODE_REPLACEMENTS.items():
        text = text.replace(old, new)
    return text.encode("latin-1", "replace").decode("latin-1")


def solution_markdown_to_text(markdown: str) -> str:
    text = repair_mojibake(markdown).replace("\r\n", "\n").replace("\r", "\n")
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
    text = repair_mojibake(markdown).replace("\r\n", "\n").replace("\r", "\n")
    for space in ("\u00a0", "\u2001", "\u2004", "\u2005", "\u2006", "\u2009", "\u200a", "\u202f"):
        text = text.replace(space, " ")
    text = re.sub(r"\*([A-Za-z])\*\*([A-Za-z])\*", r"*\1\2*", text)
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
                    r"\begin{tcolorbox}[enhanced,breakable,colback=white,colframe=brandline,arc=2mm,boxrule=0.5pt,left=9pt,right=9pt,top=6pt,bottom=6pt,borderline west={2mm}{0pt}{brandaccent}]",
                    r"{\sffamily\bfseries\color{brandanswer}Topic check.} " + format_inline_latex(topic_match.group(1)),
                    r"\end{tcolorbox}",
                ]
            )
            continue

        step_match = re.match(r"^\*\*Step\s+(\d+)\s*:?\s*(.*?)\*\*\s*(.*)$", stripped, flags=re.I)
        if step_match:
            close_itemize()
            step_number = step_match.group(1)
            step_title = step_match.group(2).strip() or "Method"
            remainder = step_match.group(3).strip()
            output.append(r"\solutionstep{" + latex_escape(step_number) + "}{" + format_inline_latex(step_title) + "}")
            if remainder:
                output.append(format_inline_latex(remainder) + r"\par")
            continue

        answer_match = re.match(r"^\*\*Answers?:\*\*\s*(.*)$", stripped)
        if answer_match:
            close_itemize()
            output.append(r"\finalanswerbox{" + format_inline_latex(answer_match.group(1)) + "}")
            continue

        heading_match = re.match(r"^\*\*(.+?)\*\*$", stripped)
        if heading_match:
            close_itemize()
            output.append(r"{\sffamily\bfseries\color{brandanswer} " + format_inline_latex(heading_match.group(1)) + r"}\par")
            continue

        markdown_heading_match = re.match(r"^#{1,6}\s*(.+?)\s*$", stripped)
        if markdown_heading_match:
            close_itemize()
            heading = markdown_heading_match.group(1).strip()
            if heading.rstrip(":").strip().lower() in {"answer", "answers"}:
                pending_answer = True
            else:
                output.append(r"{\sffamily\bfseries\color{brandanswer} " + format_inline_latex(heading) + r"}\par")
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


def mm(value: float) -> float:
    return value * 72 / 25.4


def draw_textbox(
    page: fitz.Page,
    rect: fitz.Rect,
    text: str,
    fontsize: float,
    color: tuple[float, float, float],
    align: int = fitz.TEXT_ALIGN_LEFT,
) -> None:
    page.insert_textbox(
        rect,
        clean_text(text),
        fontsize=fontsize,
        fontname="helv",
        color=color,
        align=align,
    )


def book_subject(spec: BookSpec) -> str:
    if spec.scope == "unit1":
        return "Edexcel IGCSE Mathematics A - Unit 1 (4WM1)"
    if spec.scope == "unit2":
        return "Edexcel IGCSE Mathematics A - Unit 2 (4WM2)"
    return "Edexcel IGCSE Mathematics A (4MA1)"


def book_kind(spec: BookSpec) -> str:
    if spec.include_solutions:
        return "Student Worked Solutions"
    if spec.bank == "expertise":
        return "Q20+ Expertise Classified"
    return "Classified Problems by Topic"


def book_stat_line(spec: BookSpec, row_count: int) -> str:
    pieces = [f"{row_count} Questions"]
    if spec.scope != "complete":
        pieces.append(scope_label(spec.scope))
    if spec.bank == "expertise":
        pieces.append("Q20+ Expertise")
    pieces.append("Worked answers included" if spec.include_solutions else "Question book")
    return "  |  ".join(pieces)


def book_palette(spec: BookSpec) -> BookPalette:
    return MODULAR_PALETTE if spec.scope in {"unit1", "unit2"} else LINEAR_PALETTE


def color_hex(color: tuple[float, float, float]) -> str:
    return "".join(f"{max(0, min(255, round(part * 255))):02X}" for part in color)


def draw_page_base(page: fitz.Page, palette: BookPalette) -> None:
    page.draw_rect(fitz.Rect(0, 0, A4_WIDTH, A4_HEIGHT), color=None, fill=WHITE)
    page.draw_rect(fitz.Rect(0, 0, mm(8), A4_HEIGHT), color=None, fill=palette.question)
    page.draw_rect(fitz.Rect(mm(8), 0, mm(10), A4_HEIGHT), color=None, fill=palette.accent_soft)


def draw_soft_watermark(page: fitz.Page, text: str = "EA") -> None:
    draw_textbox(
        page,
        fitz.Rect(mm(130), mm(222), A4_WIDTH - mm(4), mm(284)),
        text,
        76,
        WATERMARK,
        fitz.TEXT_ALIGN_CENTER,
    )


def draw_identity_box(page: fitz.Page, rect: fitz.Rect, prepared_label: str) -> None:
    page.draw_rect(rect, color=NAVY, fill=WHITE, width=0.9)
    draw_textbox(
        page,
        fitz.Rect(rect.x0 + 12, rect.y0 + 12, rect.x1 - 12, rect.y0 + 29),
        prepared_label,
        8,
        GOLD,
        fitz.TEXT_ALIGN_CENTER,
    )
    draw_textbox(
        page,
        fitz.Rect(rect.x0 + 12, rect.y0 + 31, rect.x1 - 12, rect.y0 + 75),
        "Dr. Eslam Ahmed",
        20,
        NAVY_DARK,
        fitz.TEXT_ALIGN_CENTER,
    )
    draw_textbox(
        page,
        fitz.Rect(rect.x0 + 12, rect.y0 + 76, rect.x1 - 12, rect.y0 + 100),
        "Assistant Lecturer, Cairo University Faculty of Engineering",
        10.5,
        MUTED,
        fitz.TEXT_ALIGN_CENTER,
    )


def draw_badge(page: fitz.Page, rect: fitz.Rect, text: str, palette: BookPalette) -> None:
    page.draw_rect(rect, color=palette.accent, fill=palette.accent, width=0.5)
    draw_textbox(
        page,
        fitz.Rect(rect.x0, rect.y0 + 2, rect.x1, rect.y1),
        text,
        8,
        palette.answer,
        fitz.TEXT_ALIGN_CENTER,
    )


def draw_page_watermark(page: fitz.Page) -> None:
    draw_textbox(
        page,
        fitz.Rect(mm(16), mm(95), A4_WIDTH - mm(16), mm(190)),
        "EA",
        148,
        WATERMARK,
        fitz.TEXT_ALIGN_CENTER,
    )


def add_footer(page: fitz.Page, label: str, page_number: int, palette: BookPalette) -> None:
    page.draw_line((MARGIN, A4_HEIGHT - 36), (A4_WIDTH - MARGIN, A4_HEIGHT - 36), color=LINE, width=0.55)
    draw_textbox(
        page,
        fitz.Rect(MARGIN, A4_HEIGHT - 31, A4_WIDTH - MARGIN - 70, A4_HEIGHT - 14),
        f"Elite IGCSE Academy | Dr. Eslam Ahmed | {label}",
        8,
        MUTED,
    )
    draw_textbox(
        page,
        fitz.Rect(A4_WIDTH - MARGIN - 60, A4_HEIGHT - 31, A4_WIDTH - MARGIN, A4_HEIGHT - 14),
        str(page_number),
        8,
        palette.question,
        fitz.TEXT_ALIGN_RIGHT,
    )


def add_cover(doc: fitz.Document, spec: BookSpec, row_count: int) -> None:
    palette = book_palette(spec)
    page = doc.new_page(width=A4_WIDTH, height=A4_HEIGHT)
    draw_page_base(page, palette)
    draw_soft_watermark(page, "MATH")
    draw_textbox(
        page,
        fitz.Rect(MARGIN, mm(58), A4_WIDTH - MARGIN, mm(73)),
        "ELITE IGCSE ACADEMY",
        10,
        palette.question_dark,
    )
    draw_textbox(
        page,
        fitz.Rect(MARGIN, mm(82), A4_WIDTH - MARGIN, mm(98)),
        book_subject(spec),
        13.5,
        palette.question,
    )
    draw_textbox(
        page,
        fitz.Rect(MARGIN, mm(101), A4_WIDTH - MARGIN, mm(132)),
        "Higher Tier",
        34,
        palette.answer,
    )
    draw_textbox(
        page,
        fitz.Rect(MARGIN, mm(134), A4_WIDTH - MARGIN, mm(164)),
        spec.title,
        22,
        palette.answer,
    )
    page.draw_line((MARGIN, mm(172)), (MARGIN + mm(64), mm(172)), color=palette.accent, width=1.6)
    draw_textbox(
        page,
        fitz.Rect(MARGIN, mm(183), A4_WIDTH - MARGIN, mm(200)),
        book_stat_line(spec, row_count),
        10.5,
        MUTED,
    )

    info_cards = [
        (str(row_count), "classified questions"),
        (palette.label, "pathway palette"),
        (scope_label(spec.scope), "course scope"),
    ]
    x = MARGIN
    for value, label in info_cards:
        card = fitz.Rect(x, mm(212), x + mm(47), mm(252))
        page.draw_rect(card, color=LINE, fill=(1, 0.99, 0.97), width=0.65)
        page.draw_rect(fitz.Rect(card.x0, card.y0, card.x0 + 4, card.y1), color=palette.question, fill=palette.question, width=0)
        draw_textbox(page, fitz.Rect(card.x0 + 12, card.y0 + 14, card.x1 - 8, card.y0 + 30), value, 15, palette.answer)
        draw_textbox(page, fitz.Rect(card.x0 + 12, card.y0 + 33, card.x1 - 8, card.y1 - 8), label, 8.2, MUTED)
        x += mm(54)

    draw_textbox(
        page,
        fitz.Rect(MARGIN, A4_HEIGHT - mm(30), A4_WIDTH - MARGIN, A4_HEIGHT - mm(12)),
        "Prepared for Dr Eslam Ahmed - eliteigcse.com",
        9,
        MUTED,
    )


def add_topic_page(doc: fitz.Document, topic: str, count: int, palette: BookPalette) -> None:
    page = doc.new_page(width=A4_WIDTH, height=A4_HEIGHT)
    draw_page_base(page, palette)
    draw_soft_watermark(page, "TOPIC")
    draw_textbox(
        page,
        fitz.Rect(MARGIN, mm(78), A4_WIDTH - MARGIN, mm(94)),
        "CLASSIFIED TOPIC",
        13,
        palette.question,
    )

    card = fitz.Rect(MARGIN, mm(112), A4_WIDTH - MARGIN, mm(198))
    page.draw_rect(card, color=LINE, fill=WHITE, width=0.85)
    page.draw_rect(fitz.Rect(card.x0, card.y0, card.x0 + 6, card.y1), color=palette.question, fill=palette.question)
    page.draw_rect(fitz.Rect(card.x0 + 6, card.y0, card.x0 + 8, card.y1), color=palette.accent_soft, fill=palette.accent_soft)
    draw_textbox(
        page,
        fitz.Rect(card.x0 + 22, card.y0 + 22, card.x1 - 18, card.y0 + 44),
        palette.label.upper(),
        10,
        palette.question_dark,
    )
    draw_textbox(
        page,
        fitz.Rect(card.x0 + 22, card.y0 + 47, card.x1 - 22, card.y0 + 96),
        topic,
        18,
        palette.answer,
    )
    draw_textbox(
        page,
        fitz.Rect(card.x0 + 22, card.y0 + 104, card.x1 - 22, card.y0 + 126),
        f"{count} questions",
        12,
        MUTED,
    )
    draw_textbox(
        page,
        fitz.Rect(MARGIN, A4_HEIGHT - mm(37), A4_WIDTH - MARGIN, A4_HEIGHT - mm(24)),
        "Elite IGCSE Academy | Dr. Eslam Ahmed",
        8.5,
        MUTED,
        fitz.TEXT_ALIGN_CENTER,
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


def add_question_page(doc: fitz.Document, row: dict[str, Any], book_label: str, page_number: int, palette: BookPalette) -> None:
    page = doc.new_page(width=A4_WIDTH, height=A4_HEIGHT)
    topic = str(row.get("topic") or "Unclassified")
    question = row.get("q") or "?"
    marks = row.get("marks") or "?"
    paper = str(row.get("paper") or row.get("paperSlug") or "")
    session = str(row.get("session") or "")
    code = str(row.get("code") or "")
    draw_page_base(page, palette)
    header_rect = fitz.Rect(MARGIN, mm(18), A4_WIDTH - MARGIN, mm(47))
    page.draw_rect(header_rect, color=palette.question, fill=palette.question, width=0)
    page.draw_rect(fitz.Rect(header_rect.x0, header_rect.y1 - 3, header_rect.x1, header_rect.y1), color=palette.accent, fill=palette.accent)
    draw_textbox(
        page,
        fitz.Rect(header_rect.x0 + 12, header_rect.y0 + 8, header_rect.x1 - 170, header_rect.y0 + 24),
        "CLASSIFIED PROBLEM",
        10.5,
        WHITE,
    )
    draw_textbox(
        page,
        fitz.Rect(header_rect.x0 + 12, header_rect.y0 + 24, header_rect.x1 - 170, header_rect.y1 - 4),
        topic,
        8.5,
        palette.accent_soft,
    )
    draw_textbox(
        page,
        fitz.Rect(header_rect.x1 - 170, header_rect.y0 + 12, header_rect.x1 - 12, header_rect.y0 + 28),
        " | ".join(part for part in (paper, session, code) if part),
        7.0,
        palette.accent_soft,
        fitz.TEXT_ALIGN_RIGHT,
    )
    draw_textbox(
        page,
        fitz.Rect(MARGIN, mm(58), A4_WIDTH - MARGIN - 125, mm(72)),
        topic,
        16,
        palette.answer,
    )
    draw_badge(page, fitz.Rect(A4_WIDTH - MARGIN - 114, mm(59), A4_WIDTH - MARGIN - 62, mm(67)), f"Q#: {question}", palette)
    draw_badge(page, fitz.Rect(A4_WIDTH - MARGIN - 57, mm(59), A4_WIDTH - MARGIN, mm(67)), f"Marks: {marks}", palette)

    path = question_image_path(row)
    if path.exists():
        rect = image_rect(path, mm(82))
        frame = fitz.Rect(max(MARGIN, rect.x0 - 8), rect.y0 - 8, min(A4_WIDTH - MARGIN, rect.x1 + 8), rect.y1 + 8)
        page.draw_rect(frame, color=LINE, fill=WHITE, width=0.55)
        page.draw_rect(fitz.Rect(frame.x0, frame.y0, frame.x0 + 3, frame.y1), color=palette.accent, fill=palette.accent, width=0)
        page.insert_image(rect, filename=str(path), keep_proportion=True)
    else:
        page.insert_textbox(
            fitz.Rect(MARGIN, 170, A4_WIDTH - MARGIN, 250),
            f"Missing image: {rel(path)}",
            fontsize=11,
            fontname="helv",
            color=(0.7, 0.0, 0.0),
        )
    add_footer(page, book_label, page_number, palette)


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
    palette: BookPalette,
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
        draw_page_base(page, palette)
        header_rect = fitz.Rect(MARGIN, mm(18), A4_WIDTH - MARGIN, mm(47))
        page.draw_rect(header_rect, color=palette.answer, fill=palette.answer, width=0)
        page.draw_rect(fitz.Rect(header_rect.x0, header_rect.y1 - 3, header_rect.x1, header_rect.y1), color=palette.accent, fill=palette.accent)
        heading = title if len(chunks) == 1 else f"{title} - page {index}"
        page.insert_textbox(
            fitz.Rect(header_rect.x0 + 12, header_rect.y0 + 8, header_rect.x1 - 12, header_rect.y1 - 4),
            clean_text(heading),
            fontsize=11.5,
            fontname="helv",
            color=WHITE,
        )
        page.draw_rect(fitz.Rect(MARGIN, mm(62), A4_WIDTH - MARGIN, A4_HEIGHT - MARGIN - 28), color=LINE, fill=WHITE, width=0.55)
        y = mm(78)
        for line in chunk:
            page.insert_text((MARGIN + 12, y), clean_text(line), fontsize=9.5, fontname="helv", color=INK)
            y += 13
        add_footer(page, book_label, page_counter[0], palette)


def latex_palette_setup(spec: BookSpec) -> list[str]:
    palette = book_palette(spec)
    return [
        rf"\definecolor{{bookquestion}}{{HTML}}{{{color_hex(palette.question)}}}",
        rf"\definecolor{{bookquestiondark}}{{HTML}}{{{color_hex(palette.question_dark)}}}",
        rf"\definecolor{{bookanswer}}{{HTML}}{{{color_hex(palette.answer)}}}",
        rf"\definecolor{{bookaccent}}{{HTML}}{{{color_hex(palette.accent)}}}",
        rf"\definecolor{{bookaccentsoft}}{{HTML}}{{{color_hex(palette.accent_soft)}}}",
        r"\colorlet{brandquestion}{bookquestion}",
        r"\colorlet{brandquestiondark}{bookquestiondark}",
        r"\colorlet{brandanswer}{bookanswer}",
        r"\colorlet{brandaccent}{bookaccent}",
        r"\colorlet{brandaccentsoft}{bookaccentsoft}",
    ]


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
    palette_label = book_palette(spec).label
    subtitle = "Student worked-solution book"
    if spec.bank == "expertise":
        subtitle += " - Q20+ expertise"
    return [
        "%====================================================================",
        "%  Elite IGCSE Academy",
        "%  Student worked-solution classified book",
        "%====================================================================",
        r"\documentclass[11pt,a4paper,openany]{book}",
        "",
        r"\usepackage[utf8]{inputenc}",
        r"\usepackage[T1]{fontenc}",
        r"\usepackage{lmodern}",
        r"\renewcommand{\familydefault}{\sfdefault}",
        r"\usepackage[a4paper,left=20mm,right=14mm,top=14mm,bottom=16mm]{geometry}",
        r"\usepackage{fancyhdr}",
        r"\usepackage{titlesec}",
        r"\usepackage{elite_igcse}",
        *latex_palette_setup(spec),
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
        r"\newtcolorbox{solutionbody}{enhanced,breakable,colback=white,colframe=brandline,arc=2mm,boxrule=0.55pt,left=5mm,right=5mm,top=4mm,bottom=4mm,before skip=5mm,after skip=5mm,borderline west={3mm}{0pt}{brandanswer},drop shadow={black!8}}",
        r"\newcommand{\solutionstep}[2]{\par\vspace{3mm}\noindent{\sffamily\bfseries\color{brandanswer}#1.\ #2}\par\vspace{1mm}}",
        r"\newcommand{\finalanswerbox}[1]{\par\vspace{4mm}\noindent\begin{tcolorbox}[enhanced,breakable,colback=brandcream!55,colframe=brandcream!55,arc=2mm,boxrule=0pt,left=4mm,right=4mm,top=3mm,bottom=3mm,borderline west={3mm}{0pt}{brandaccent}]{\sffamily\bfseries\color{brandanswer}Final answer}\par #1\end{tcolorbox}\par}",
        r"\newcommand{\solutionmetabox}[3]{\begin{tcolorbox}[enhanced,colback=white,colframe=brandline,arc=2mm,boxrule=0.45pt,left=4mm,right=4mm,top=2.5mm,bottom=2.5mm,before skip=3mm,after skip=3mm,borderline west={1.4mm}{0pt}{brandaccent}]{\sffamily\bfseries\color{brandanswer}#1 \quad\textbar\quad Question #2}\\[-1pt]{\sffamily\small\color{textgrey}#3}\end{tcolorbox}}",
        r"\sloppy",
        r"\emergencystretch=3em",
        "",
        r"\pagestyle{fancy}",
        r"\fancyhf{}",
        r"\renewcommand{\headrulewidth}{0pt}",
        r"\renewcommand{\footrulewidth}{0pt}",
        r"\fancyfoot[LE,RO]{\small\textcolor{brandquestion}{\thepage}}",
        r"\fancyfoot[RE,LO]{\small\textcolor{textgrey}{\itshape Elite IGCSE Academy \,\textbar\, Dr.~Eslam Ahmed}}",
        r"\fancyhead[RE,LO]{\small\textcolor{textgrey}{\leftmark}}",
        "",
        r"\fancypagestyle{plain}{%",
        r"  \fancyhf{}",
        r"  \renewcommand{\headrulewidth}{0pt}",
        r"  \fancyfoot[LE,RO]{\small\textcolor{brandquestion}{\thepage}}",
        r"  \fancyfoot[RE,LO]{\small\textcolor{textgrey}{\itshape Elite IGCSE Academy \,\textbar\, Dr.~Eslam Ahmed}}",
        r"}",
        "",
        r"\titleformat{\chapter}[display]",
        r"  {\normalfont\sffamily\bfseries\color{brandanswer}}",
        r"  {\filright\Large{\color{brandaccent}\textsc{Topic~\thechapter}}}",
        r"  {6pt}",
        r"  {\Huge\filright}",
        r"  [\vspace{4pt}{\color{brandquestion}\hrule height 2pt}\vspace{-6pt}]",
        r"\titlespacing*{\chapter}{0pt}{-24pt}{18pt}",
        "",
        r"\setlength{\parskip}{4pt plus 1pt}",
        r"\setlength{\parindent}{0pt}",
        "",
        r"\begin{document}",
        r"\pagestyle{empty}",
        r"\begin{titlepage}",
        r"\begin{tikzpicture}[remember picture,overlay]",
        r"  \fill[white] (current page.south west) rectangle (current page.north east);",
        r"  \fill[brandquestion] (current page.south west) rectangle ([xshift=8mm]current page.north west);",
        r"  \fill[brandaccentsoft] ([xshift=8mm]current page.south west) rectangle ([xshift=10mm]current page.north west);",
        r"  \node[anchor=south east, xshift=-8mm, yshift=14mm] at (current page.south east) {\sffamily\bfseries\color{brandquestion!5}\fontsize{70}{78}\selectfont MATH};",
        r"\end{tikzpicture}",
        "",
        r"\vspace*{42mm}",
        r"\hspace*{10mm}\begin{minipage}{158mm}",
        r"{\sffamily\bfseries\color{brandquestiondark}\small ELITE IGCSE ACADEMY}\\[12pt]",
        rf"{{\sffamily\color{{brandquestion}}\large {latex_escape(book_subject(spec))}}}\\[8pt]",
        r"{\sffamily\bfseries\color{brandanswer}\fontsize{34}{40}\selectfont Higher Tier}\\[5pt]",
        rf"{{\sffamily\bfseries\color{{brandanswer}}\fontsize{{22}}{{27}}\selectfont {latex_escape(spec.title)}}}\\[12pt]",
        r"{\color{brandaccent}\rule{62mm}{1.6pt}}\\[12pt]",
        rf"{{\sffamily\color{{textgrey}}\large {row_count} Questions \quad\textbar\quad Question page then worked-solution page}}",
        r"\end{minipage}",
        "",
        r"\vspace{18mm}",
        r"\hspace*{10mm}\begin{tcolorbox}[enhanced, width=150mm, colback=white, colframe=brandline,arc=2pt, boxrule=0.7pt, left=14pt, right=14pt, top=12pt, bottom=12pt,borderline west={3pt}{0pt}{brandquestion}]",
        r"{\sffamily\color{brandaccent}\small\textsc{Prepared \& Classified by}}\\[6pt]",
        r"{\sffamily\bfseries\color{brandanswer}\fontsize{24}{28}\selectfont Dr.~Eslam Ahmed}\\[3pt]",
        r"{\sffamily\itshape\color{textgrey} Assistant Lecturer, Cairo University Faculty of Engineering}\\[8pt]",
        rf"{{\sffamily\bfseries\color{{brandquestion}}\small {latex_escape(palette_label)} palette \quad\textbar\quad {latex_escape(label)}}}",
        r"\end{tcolorbox}",
        "",
        r"\vfill",
        r"\begin{tikzpicture}[remember picture,overlay]",
        r"  \draw[brandline,line width=0.6pt] ([xshift=22mm,yshift=24mm]current page.south west) -- ([xshift=-22mm,yshift=24mm]current page.south east);",
        r"  \node[anchor=south west, xshift=22mm, yshift=10mm] at (current page.south west) {\begin{minipage}{60mm}{\sffamily\color{brandaccent}\footnotesize\textsc{Call}}\\{\sffamily\bfseries\color{brandanswer}\large +20\,112\,000\,9622}\end{minipage}};",
        rf"  \node[anchor=south, yshift=10mm] at (current page.south) {{\begin{{minipage}}{{78mm}}\centering{{\sffamily\color{{brandaccent}}\footnotesize\textsc{{2026 Edition}}}}\\{{\sffamily\bfseries\color{{brandanswer}}\large {latex_escape(label)}}}\end{{minipage}}}};",
        r"  \node[anchor=south east, xshift=-22mm, yshift=10mm] at (current page.south east) {\begin{minipage}{70mm}\raggedleft{\sffamily\color{brandaccent}\footnotesize\textsc{Student Edition}}\\{\sffamily\bfseries\color{brandanswer}\normalsize Worked answers included}\end{minipage}};",
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
    palette = book_palette(spec)
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
            add_topic_page(doc, topic, topic_counts[topic], palette)
            toc.append([1, topic, page_counter[0]])

        page_counter[0] += 1
        add_question_page(doc, row, spec.title, page_counter[0], palette)
        if spec.include_solutions:
            add_solution_pages(doc, row, solutions.get(str(row.get("id"))), spec.title, page_counter, palette)

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
