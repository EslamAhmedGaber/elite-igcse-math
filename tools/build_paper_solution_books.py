"""
Build paper-by-paper worked-solution books.

These PDFs rebuild the classified question bank back into original past-paper
order, with each question image followed by its worked solution.
"""

from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys
from pathlib import Path
from typing import Any

import fitz

from build_books import (
    BOOK_STYLE_SOURCE,
    ROOT,
    SOLUTION_DIR,
    convert_solution_markdown,
    latex_escape,
    question_image_path,
    solution_to_markdown,
)


QUESTION_DIR = ROOT / "src" / "data" / "questions"
OUTPUT_DIR = ROOT / "private_output" / "past_paper_solutions"
BUILD_ROOT = ROOT / "tools" / "_paper_solution_build"
DEFAULT_TECTONIC = (
    Path.home()
    / ".codex"
    / "plugins"
    / "cache"
    / "openai-bundled"
    / "latex-tectonic"
    / "0.1.1"
    / "bin"
    / ("tectonic.exe" if os.name == "nt" else "tectonic")
)


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def load_paper(path: Path) -> dict[str, Any]:
    data = load_json(path)
    questions = []
    for question in data.get("questions", []):
        row = dict(question)
        row.update(
            {
                "paper": data.get("paper") or path.stem,
                "paperSlug": data.get("paperSlug") or path.stem,
                "session": data.get("session") or "",
                "code": data.get("code") or "",
                "isModular": bool(data.get("isModular")),
                "modularUnit": data.get("modularUnit"),
            }
        )
        questions.append(row)
    questions.sort(key=lambda row: int(row.get("q") or 0))
    data["questions"] = questions
    return data


def load_solutions(paper_slug: str) -> dict[str, dict[str, Any]]:
    path = SOLUTION_DIR / f"{paper_slug}.json"
    if not path.exists():
        return {}
    return load_json(path).get("solutions") or {}


def paper_paths() -> list[Path]:
    return sorted(QUESTION_DIR.glob("*.json"))


def find_papers(slugs: list[str], all_papers: bool) -> list[Path]:
    available = {path.stem: path for path in paper_paths()}
    if all_papers:
        return list(available.values())
    missing = [slug for slug in slugs if slug not in available]
    if missing:
        raise SystemExit(f"Unknown paper slug(s): {', '.join(missing)}")
    return [available[slug] for slug in slugs]


def image_ref(build_dir: Path, row: dict[str, Any]) -> str:
    return os.path.relpath(question_image_path(row), build_dir).replace("\\", "/")


def paper_subtitle(paper: dict[str, Any]) -> str:
    parts = [str(paper.get("session") or ""), str(paper.get("code") or "")]
    if paper.get("isModular") and paper.get("modularUnit"):
        parts.append(str(paper.get("modularUnit")))
    return " | ".join(part for part in parts if part)


def latex_preamble(paper: dict[str, Any]) -> list[str]:
    title = f"{paper.get('paper') or paper.get('paperSlug')} Worked Solutions"
    subtitle = paper_subtitle(paper)
    question_count = len(paper.get("questions") or [])
    return [
        "%====================================================================",
        "%  Elite IGCSE Academy",
        "%  Student past-paper worked-solution book",
        "%====================================================================",
        r"\documentclass[11pt,a4paper,openany]{book}",
        r"\usepackage[utf8]{inputenc}",
        r"\usepackage[T1]{fontenc}",
        r"\usepackage{lmodern}",
        r"\usepackage[a4paper,margin=18mm,top=18mm,bottom=18mm]{geometry}",
        r"\usepackage{fancyhdr}",
        r"\usepackage{elite_igcse}",
        r"\usepackage[hidelinks,pdfencoding=auto,bookmarksopen=false]{hyperref}",
        r"\hypersetup{",
        r"  colorlinks=true,",
        r"  linkcolor=[HTML]{0B2545},",
        r"  urlcolor=[HTML]{0B2545},",
        rf"  pdftitle={{{latex_escape(title)}}},",
        r"  pdfauthor={Dr. Eslam Ahmed - Elite IGCSE Academy},",
        r"}",
        r"\newtcolorbox{paperinfobox}{enhanced,colback=brandcream!75,colframe=brandgold!80,arc=4pt,boxrule=0.8pt,left=12pt,right=12pt,top=9pt,bottom=9pt}",
        r"\newtcolorbox{solutionbody}{enhanced,breakable,colback=white,colframe=brandnavy!18,arc=4pt,boxrule=0.8pt,left=11pt,right=11pt,top=10pt,bottom=10pt,before skip=7pt,after skip=8pt,borderline west={2pt}{0pt}{brandgold}}",
        r"\newcommand{\solutionstep}[2]{\par\vspace{3mm}\noindent{\sffamily\bfseries\color{brandanswer}#1.\ #2}\par\vspace{1mm}}",
        r"\newcommand{\finalanswerbox}[1]{\par\vspace{7pt}\noindent\begin{tcolorbox}[enhanced,breakable,colback=brandgoldlight!45,colframe=brandgold,arc=4pt,boxrule=1pt,left=10pt,right=10pt,top=7pt,bottom=7pt]{\sffamily\bfseries\color{brandnavy}FINAL ANSWER}\par #1\end{tcolorbox}\par}",
        r"\newcommand{\papersolutionheader}[4]{\clearpage\noindent\begin{tcolorbox}[enhanced,colback=brandnavy,colframe=brandnavy,boxrule=0pt,arc=4pt,left=12pt,right=12pt,top=8pt,bottom=8pt,borderline south={2pt}{0pt}{brandgold}]{\sffamily\bfseries\color{white}\large PAST PAPER SOLUTION}\hfill\pillbadge{Q\#:}{\,#1}\,\pillbadge{Marks:}{\,#2}\\[3pt]{\sffamily\color{brandgoldlight}\small\textsc{Topic:} \textbf{#3}}\\[2pt]{\sffamily\color{white!84}\footnotesize #4}\end{tcolorbox}\par\vspace{6pt}}",
        r"\newcommand{\questionpageheader}[4]{\clearpage\noindent\begin{tcolorbox}[enhanced,colback=brandnavy,colframe=brandnavy,boxrule=0pt,arc=4pt,left=12pt,right=12pt,top=8pt,bottom=8pt,borderline south={2pt}{0pt}{brandgold}]{\sffamily\bfseries\color{white}\large PAST PAPER QUESTION}\hfill\pillbadge{Q\#:}{\,#1}\,\pillbadge{Marks:}{\,#2}\\[3pt]{\sffamily\color{brandgoldlight}\small\textsc{Topic:} \textbf{#3}}\\[2pt]{\sffamily\color{white!84}\footnotesize #4}\end{tcolorbox}\par\vspace{6pt}}",
        r"\sloppy",
        r"\emergencystretch=3em",
        r"\setlength{\parskip}{4pt plus 1pt}",
        r"\setlength{\parindent}{0pt}",
        r"\pagestyle{fancy}",
        r"\fancyhf{}",
        r"\renewcommand{\headrulewidth}{0pt}",
        r"\renewcommand{\footrulewidth}{0pt}",
        r"\fancyfoot[LE,RO]{\small\textcolor{brandnavy}{\thepage}}",
        r"\fancyfoot[RE,LO]{\small\textcolor{textgrey}{\itshape Elite IGCSE Academy \,\textbar\, Dr.~Eslam Ahmed}}",
        rf"\fancyhead[RE,LO]{{\small\textcolor{{textgrey}}{{{latex_escape(title)}}}}}",
        r"\fancypagestyle{plain}{\fancyhf{}\renewcommand{\headrulewidth}{0pt}\fancyfoot[LE,RO]{\small\textcolor{brandnavy}{\thepage}}\fancyfoot[RE,LO]{\small\textcolor{textgrey}{\itshape Elite IGCSE Academy \,\textbar\, Dr.~Eslam Ahmed}}}",
        r"\begin{document}",
        r"\pagestyle{empty}",
        r"\begin{titlepage}",
        r"\begin{tikzpicture}[remember picture,overlay]",
        r"  \fill[brandcream] (current page.south west) rectangle (current page.north east);",
        r"  \fill[brandnavy] (current page.north west) rectangle ([yshift=-76mm]current page.north east);",
        r"  \fill[brandgold] ([yshift=-76mm]current page.north west) rectangle ([yshift=-79mm]current page.north east);",
        r"  \fill[brandnavy] (current page.south west) rectangle ([yshift=42mm]current page.south east);",
        r"  \fill[brandgold] ([yshift=42mm]current page.south west) rectangle ([yshift=45mm]current page.south east);",
        r"  \node[anchor=north, yshift=-30mm] at (current page.north) {\begin{minipage}{170mm}\centering",
        r"    {\sffamily\bfseries\color{brandgold}\fontsize{30}{34}\selectfont ELITE IGCSE ACADEMY}\\[6pt]",
        r"    {\sffamily\itshape\color{white}\Large Student Past Paper Solutions}",
        r"  \end{minipage}};",
        r"\end{tikzpicture}",
        r"\vspace*{86mm}",
        r"\begin{center}",
        rf"{{\sffamily\bfseries\color{{brandnavy}}\fontsize{{24}}{{29}}\selectfont {latex_escape(title)}}}\\[8pt]",
        r"{\color{brandgold}\rule{54mm}{1.6pt}}",
        rf"\vspace{{13pt}}{{\sffamily\color{{textgrey}}\large {latex_escape(subtitle)}}}\\[8pt]",
        rf"{{\sffamily\color{{textgrey}} {question_count} questions \quad\textbullet\quad question image followed by worked solution}}",
        r"\end{center}",
        r"\vspace{18mm}",
        r"\begin{center}",
        r"\begin{paperinfobox}",
        r"\centering",
        r"{\sffamily\color{brandgold}\small\textsc{Prepared by}}\\[5pt]",
        r"{\sffamily\bfseries\color{brandnavydark}\fontsize{24}{28}\selectfont Dr.~Eslam Ahmed}\\[3pt]",
        r"{\sffamily\itshape\color{textgrey}Assistant Lecturer, Cairo University Faculty of Engineering}\\[5pt]",
        r"{\sffamily\color{textgrey}WhatsApp: +20\,112\,000\,9622 \quad | \quad eliteigcse.com}",
        r"\end{paperinfobox}",
        r"\end{center}",
        r"\vfill",
        r"\begin{tikzpicture}[remember picture,overlay]",
        r"  \node[anchor=south west, xshift=22mm, yshift=11mm] at (current page.south west) {\begin{minipage}{62mm}{\sffamily\color{brandgold}\footnotesize\textsc{Student Edition}}\\{\sffamily\bfseries\color{white}\large Worked answers included}\end{minipage}};",
        r"  \node[anchor=south east, xshift=-22mm, yshift=11mm] at (current page.south east) {\begin{minipage}{76mm}\raggedleft{\sffamily\color{brandgold}\footnotesize\textsc{Download}}\\{\sffamily\bfseries\color{white}\normalsize eliteigcse.com}\end{minipage}};",
        r"\end{tikzpicture}",
        r"\end{titlepage}",
        r"\pagestyle{fancy}",
    ]


def write_latex(paper: dict[str, Any], solutions: dict[str, dict[str, Any]], build_dir: Path) -> Path:
    build_dir.mkdir(parents=True, exist_ok=True)
    if not BOOK_STYLE_SOURCE.exists():
        raise FileNotFoundError(f"Missing LaTeX style file: {BOOK_STYLE_SOURCE}")
    shutil.copy2(BOOK_STYLE_SOURCE, build_dir / BOOK_STYLE_SOURCE.name)

    paper_label = f"{paper.get('paper') or paper.get('paperSlug')} - {paper_subtitle(paper)}"
    lines = latex_preamble(paper)
    for row in paper.get("questions") or []:
        q_number = str(row.get("q") or "?")
        marks = str(row.get("marks") or "?")
        topic = str(row.get("topic") or "Unclassified")
        solution = solutions.get(str(row.get("id")))
        source = solution_to_markdown(solution)

        lines.extend(
            [
                f"%--- Question {q_number} ---",
                rf"\questionpageheader{{{latex_escape(q_number)}}}{{{latex_escape(marks)}}}{{{latex_escape(topic)}}}{{{latex_escape(paper_label)}}}",
                rf"\problemimagepage{{{image_ref(build_dir, row)}}}",
                r"\clearpage",
                rf"\papersolutionheader{{{latex_escape(q_number)}}}{{{latex_escape(marks)}}}{{{latex_escape(topic)}}}{{{latex_escape(paper_label)}}}",
                r"\solutionheader",
                r"\begin{solutionbody}",
                convert_solution_markdown(source),
                r"\end{solutionbody}",
                "",
            ]
        )
    lines.extend([r"\end{document}", ""])
    tex_path = build_dir / "main.tex"
    tex_path.write_text("\n".join(lines), encoding="utf-8")
    return tex_path


def tectonic_path() -> Path | None:
    configured = os.environ.get("TECTONIC")
    if configured and Path(configured).exists():
        return Path(configured)
    if DEFAULT_TECTONIC.exists():
        return DEFAULT_TECTONIC
    found = shutil.which("tectonic")
    return Path(found) if found else None


def compile_tex(tex_path: Path, output_path: Path) -> None:
    tectonic = tectonic_path()
    if not tectonic:
        raise RuntimeError("Tectonic is required. Set TECTONIC or install the bundled LaTeX Tectonic plugin.")
    result = subprocess.run(
        [str(tectonic), "--keep-logs", "--outdir", str(tex_path.parent), str(tex_path)],
        cwd=tex_path.parent,
        capture_output=True,
        text=True,
        check=False,
    )
    if result.returncode != 0:
        log_tail = "\n".join((result.stdout + "\n" + result.stderr).splitlines()[-40:])
        raise RuntimeError(f"Tectonic failed for {tex_path}:\n{log_tail}")
    built_pdf = tex_path.with_suffix(".pdf")
    output_path.parent.mkdir(parents=True, exist_ok=True)
    temp_path = output_path.with_name(f"{output_path.stem}.tmp{output_path.suffix}")
    shutil.copy2(built_pdf, temp_path)
    temp_path.replace(output_path)


def output_name(paper: dict[str, Any]) -> str:
    slug = str(paper.get("paperSlug") or paper.get("paper") or "paper")
    return f"{slug}_Solutions.pdf"


def build_paper(path: Path, compile_pdf: bool = True) -> Path:
    paper = load_paper(path)
    slug = str(paper.get("paperSlug") or path.stem)
    solutions = load_solutions(slug)
    missing = [str(row.get("id")) for row in paper.get("questions", []) if str(row.get("id")) not in solutions]
    if missing:
        raise RuntimeError(f"{slug}: missing {len(missing)} solutions; first missing: {missing[0]}")
    build_dir = BUILD_ROOT / slug
    tex_path = write_latex(paper, solutions, build_dir)
    output_path = OUTPUT_DIR / output_name(paper)
    if compile_pdf:
        compile_tex(tex_path, output_path)
        return output_path
    return tex_path


def write_manifest() -> Path:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    rows: list[dict[str, Any]] = []
    for path in paper_paths():
        paper = load_paper(path)
        slug = str(paper.get("paperSlug") or path.stem)
        pdf_path = OUTPUT_DIR / output_name(paper)
        page_count = None
        if pdf_path.exists():
            with fitz.open(pdf_path) as doc:
                page_count = doc.page_count
        rows.append(
            {
                "paperSlug": slug,
                "paper": paper.get("paper") or slug,
                "session": paper.get("session") or "",
                "code": paper.get("code") or "",
                "isModular": bool(paper.get("isModular")),
                "modularUnit": paper.get("modularUnit"),
                "questionCount": len(paper.get("questions") or []),
                "pageCount": page_count,
                "pdf": f"private_output/past_paper_solutions/{output_name(paper)}",
            }
        )
    manifest_path = OUTPUT_DIR / "manifest.json"
    manifest_path.write_text(json.dumps(rows, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return manifest_path


def main() -> int:
    parser = argparse.ArgumentParser(description="Build private past-paper worked-solution books.")
    parser.add_argument("--all", action="store_true", help="Build every active paper.")
    parser.add_argument("--paper", action="append", default=[], help="Paper slug to build, e.g. Jan2020_P1H. Repeatable.")
    parser.add_argument("--list", action="store_true", help="List available paper slugs.")
    parser.add_argument("--manifest-only", action="store_true", help="Refresh the output manifest without building PDFs.")
    parser.add_argument("--no-compile", action="store_true", help="Write TeX only.")
    args = parser.parse_args()

    if args.manifest_only:
        manifest = write_manifest()
        print(f"Wrote {manifest.relative_to(ROOT)}")
        return 0

    if args.list:
        for path in paper_paths():
            paper = load_paper(path)
            print(f"{paper.get('paperSlug')}: {paper.get('paper')} ({len(paper.get('questions') or [])} questions)")
        return 0

    if not args.all and not args.paper:
        parser.error("Use --all or --paper <slug>.")

    targets = find_papers(args.paper, args.all)
    for path in targets:
        built = build_paper(path, compile_pdf=not args.no_compile)
        print(f"Built {built.relative_to(ROOT)}")
    manifest = write_manifest()
    print(f"Wrote {manifest.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
