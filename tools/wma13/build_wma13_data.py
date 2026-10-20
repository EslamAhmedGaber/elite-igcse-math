"""Build the IAL Pure 3 (WMA13) online bank from the sealed Pure 3 V4 corpus.

Source (read only): 180 past-paper questions (19 sessions, Jan 2020 - Jun 2026) with Dr Eslam's
attested worked solutions (student_solution.tex), part semantics and the sealed topic classification.

Outputs:
  ial/wma13/wma13-data.js                 WMA13_TOPICS + WMA13_QUESTIONS (same shape as WMA12)
  ial/wma13/questions/*.png               question images (palette PNG)
  assets/solution-diagrams/wma13/*.png    TikZ sketches from the solutions, rendered with pdflatex
  private_output/wma13_full_bank.json     the same records for the book builder

python tools/wma13/build_wma13_data.py [--skip-figures]
"""
from __future__ import annotations

import json
import re
import shutil
import subprocess
import sys
import tempfile
from collections import defaultdict
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
V4 = Path(r"C:/Users/Eslam/Documents/Codex/2026-10-15/d-tyro4-latex-0-mathematics-pure/work/pure3_v4")
SEALED = V4.parent / "pure3_v4_sealed_run"
OUT_JS = ROOT / "ial" / "wma13" / "wma13-data.js"
OUT_IMG = ROOT / "ial" / "wma13" / "questions"
OUT_FIG = ROOT / "assets" / "solution-diagrams" / "wma13"
OUT_BANK = ROOT / "private_output" / "wma13_full_bank.json"
UPDATED = "2026-10-20T00:00:00"

TOPICS = [
    ("T01", "01_RationalAlgebra", "Rational Algebra"),
    ("T02", "02_Functions", "Functions, Composition & Inverses"),
    ("T03", "03_GraphTransformations", "Graph Transformations"),
    ("T04", "04_Modulus", "Modulus"),
    ("T05", "05_TrigFunctions", "Trigonometric Functions & Graphs"),
    ("T06", "06_TrigIdentities", "Trig Identities & Exact Values"),
    ("T07", "07_TrigEquations", "Trig Equations & R-Form"),
    ("T08", "08_ExponentialsLogs", "Exponentials & Logarithms"),
    ("T09", "09_LogGraphsModels", "Log Graphs & Exponential Models"),
    ("T10", "10_DifferentiationTechniques", "Differentiation Techniques"),
    ("T11", "11_ApplicationsOfDifferentiation", "Applications of Differentiation"),
    ("T12", "12_Integration", "Integration"),
    ("T13", "13_NumericalMethods", "Numerical Methods"),
]
TOPIC_BY_ID = {tid: (slug, name) for tid, slug, name in TOPICS}
SESSION = {"JAN": ("Jan", "January", 1), "JUN": ("MayJune", "May/June", 2), "OCT": ("Oct", "October", 4)}

PART_MARK = re.compile(
    r"\\paragraph\*?\{\s*((?:\([^)]+\)\s*)+)\}"
    r"|\\subsection\*?\{\s*((?:\([^)]+\)\s*)+)\}"
    r"|(?:\\noindent\s*)?\\textbf\{\s*((?:\([^)]+\)\s*)+)\}"
)


def norm_label(raw: str) -> str:
    """'(i)(a)' -> 'i-a', '(b)' -> 'b' (the same form as the printed part labels)."""
    return "-".join(x.strip() for x in re.findall(r"\(([^)]+)\)", raw))


def show_label(label: str) -> str:
    return "".join(f"({x})" for x in label.split("-"))


# ---------------------------------------------------------------- small TeX helpers
def balanced(text: str, start: int) -> tuple[str, int]:
    """text[start] == '{'; return (inside, index after the closing brace)."""
    depth = 0
    for i in range(start, len(text)):
        if text[i] == "{" and (i == 0 or text[i - 1] != "\\"):
            depth += 1
        elif text[i] == "}" and text[i - 1] != "\\":
            depth -= 1
            if depth == 0:
                return text[start + 1:i], i + 1
    raise ValueError("unbalanced braces")


def replace_command(text: str, name: str, fn) -> str:
    out, i = [], 0
    pattern = "\\" + name + "{"
    while True:
        j = text.find(pattern, i)
        if j < 0:
            out.append(text[i:])
            return "".join(out)
        inside, end = balanced(text, j + len(pattern) - 1)
        out.append(text[i:j])
        out.append(fn(inside))
        i = end


def boxed_values(text: str) -> list[str]:
    values, i = [], 0
    while True:
        j = text.find("\\boxed{", i)
        if j < 0:
            return values
        inside, i = balanced(text, j + len("\\boxed"))
        values.append(inside.strip().rstrip(".,;").strip())


def braces_ok(text: str) -> bool:
    depth = 0
    for i, ch in enumerate(text):
        if ch in "{}" and i and text[i - 1] == "\\":
            continue
        depth += 1 if ch == "{" else -1 if ch == "}" else 0
        if depth < 0:
            return False
    return depth == 0


MATH_SEGMENT = re.compile(r"\\\[.*?\\\]|\\\(.*?\\\)|\$[^$]*\$", re.S)


def safe_inequalities(text: str) -> str:
    """The site's text cleaner treats '<...>' as an HTML tag, so write < and > inside maths as \\lt / \\gt."""
    return MATH_SEGMENT.sub(lambda m: m.group(0).replace("<", "\\lt ").replace(">", "\\gt "), text)


def strip_comments(tex: str) -> str:
    return "\n".join(re.sub(r"(?<!\\)%.*$", "", line) for line in tex.splitlines())


# ---------------------------------------------------------------- solution -> steps
def to_body(segment: str, figures: dict[str, str]) -> tuple[str, list[str]]:
    """LaTeX segment -> site body text (inline $..$, display \\[..\\] in their own paragraphs)."""
    used = []
    s = segment
    s = re.sub(r"\\begin\{align\*?\}(.*?)\\end\{align\*?\}", lambda m: "\\[\\begin{aligned}" + m.group(1) + "\\end{aligned}\\]", s, flags=re.S)
    s = re.sub(r"\\begin\{equation\*?\}(.*?)\\end\{equation\*?\}", lambda m: "\\[" + m.group(1) + "\\]", s, flags=re.S)
    s = re.sub(r"\\begin\{center\}|\\end\{center\}", "\n\n", s)
    s = re.sub(r"\\(?:noindent|medskip|smallskip|bigskip|par)\b", "\n\n", s)
    s = replace_command(s, "textbf", lambda x: f"**{x}**")
    s = replace_command(s, "emph", lambda x: f"*{x}*")
    s = replace_command(s, "textit", lambda x: f"*{x}*")
    s = s.replace("``", "\u201c").replace("''", "\u201d").replace("---", "\u2014").replace("--", "\u2013")
    # figure markers become their own paragraphs
    for key in figures:
        if key in s:
            used.append(key)
            s = s.replace(key, "\n\n")
    # protect display maths, normalise whitespace in text
    maths: list[str] = []

    def keep(m):
        maths.append(" ".join(m.group(1).split()))
        return f"\n\n@@M{len(maths) - 1}@@\n\n"

    s = re.sub(r"\\\[(.*?)\\\]", keep, s, flags=re.S)
    blocks = []
    for block in re.split(r"\n\s*\n", s):
        block = " ".join(block.split())
        if not block:
            continue
        m = re.fullmatch(r"@@M(\d+)@@", block)
        blocks.append(f"\\[{maths[int(m.group(1))]}\\]" if m else block.replace("~", " "))
    body = "\n\n".join(blocks)
    if "@@M" in body:
        raise ValueError("display maths left inside a paragraph")
    return body, used


def render_figures(tikz: dict[str, str], stem: str, skip: bool) -> dict[str, str]:
    """marker -> site src. Each TikZ picture is compiled once with pdflatex and rasterised at 220 dpi."""
    srcs = {}
    for n, (marker, code) in enumerate(tikz.items(), 1):
        name = f"{stem}-{n}.png"
        srcs[marker] = f"assets/solution-diagrams/wma13/{name}"
        target = OUT_FIG / name
        if skip and target.exists():
            continue
        doc = ("\\documentclass[border=6pt]{standalone}\n\\usepackage{amsmath,amssymb}\n\\usepackage{tikz}\n"
               "\\usepackage{pgfplots}\\pgfplotsset{compat=1.18}\n"
               "\\usetikzlibrary{arrows.meta,calc,positioning,decorations.pathreplacing,patterns,intersections}\n"
               "\\begin{document}\n" + code + "\n\\end{document}\n")
        with tempfile.TemporaryDirectory() as tmp:
            tex = Path(tmp) / "fig.tex"
            tex.write_text(doc, encoding="utf-8")
            run = subprocess.run(["pdflatex", "-interaction=nonstopmode", "-halt-on-error", "fig.tex"],
                                 cwd=tmp, capture_output=True, text=True)
            if run.returncode != 0:
                raise SystemExit(f"TikZ figure failed for {stem}-{n}:\n{run.stdout[-1500:]}")
            subprocess.run(["pdftoppm", "-r", "220", "-png", "-singlefile", "fig.pdf", "fig"], cwd=tmp, check=True)
            OUT_FIG.mkdir(parents=True, exist_ok=True)
            img = Image.open(Path(tmp) / "fig.png").convert("RGB")
            img.quantize(colors=64, method=Image.Quantize.MEDIANCUT).save(target, optimize=True)
    return srcs


def solution_steps(tex: str, stem: str, skip_figures: bool) -> tuple[list[dict], dict[str, list[str]]]:
    tex = strip_comments(tex)
    tex = re.sub(r"\\section\*?\{[^}]*\}", "", tex)
    tikz: dict[str, str] = {}

    def take(m):
        key = f"@@FIG{len(tikz)}@@"
        tikz[key] = m.group(0)
        return f"\n\n{key}\n\n"

    tex = re.sub(r"\\begin\{tikzpicture\}.*?\\end\{tikzpicture\}", take, tex, flags=re.S)
    figure_src = render_figures(tikz, stem, skip_figures) if tikz else {}

    marks = list(PART_MARK.finditer(tex))
    segments = []
    if not marks:
        segments.append(("", tex))
    else:
        intro = tex[:marks[0].start()]
        if intro.strip():
            segments.append(("intro", intro))
        for i, m in enumerate(marks):
            label = norm_label(next(g for g in m.groups() if g))
            end = marks[i + 1].start() if i + 1 < len(marks) else len(tex)
            segments.append((label, tex[m.end():end]))

    steps, boxed = [], {}
    for label, segment in segments:
        boxed[label] = boxed_values(segment)
        body, used = to_body(segment, figure_src)
        if not body and not used:
            continue
        title = "Set up" if label == "intro" else (f"Part {show_label(label)}" if label else "Solution")
        step = {"title": title, "body": body}
        if used:
            step["figures"] = [{"src": figure_src[k], "alt": f"Sketch for {title.lower()}"} for k in used]
        steps.append(step)
    return steps, boxed


def final_answer(question: dict, semantics: dict, boxed: dict[str, list[str]]) -> tuple[str, list[str]]:
    """One line per part: '(a) $...$'. Boxed results first; semantics final answers fill the gaps."""
    lines, notes = [], []
    qid = question["question_id"]
    sem_by_label = {}
    for part in semantics.get("parts", []):
        sem_by_label[part["part_id"][len(qid) + 1:]] = part.get("final_answers", [])
    labels = [p["printed_label"] for p in question["parts"]] or [""]

    def related(a: str, b: str) -> bool:
        return a == b or a.startswith(b + "-") or b.startswith(a + "-")

    covered = set()
    for seg_label, values in boxed.items():
        if not values:
            continue
        prefix = "" if seg_label in ("", "intro") else f"{show_label(seg_label)} "
        lines.append(prefix + ", ".join(f"${v}$" for v in values))
        if seg_label in ("", "intro"):
            if len(labels) == 1:
                covered.update(labels)
        else:
            covered.update(label for label in labels if related(label, seg_label))
    for label in labels:
        if label in covered:
            continue
        prefix = f"{show_label(label)} " if label else ""
        answers = sem_by_label.get(label) or []
        if not answers:
            notes.append(f"no final answer for part {label or '-'}")
            continue
        texts = []
        for ans in answers:
            if ans.get("answer_type") == "proof":
                texts.append("Shown, as required.")
                continue
            # display_value is complete LaTeX; artifact anchors can be cut mid-line, so they are the fallback.
            display = str(ans.get("display_value", "")).strip().strip("$").rstrip(".,;")
            anchor = ans.get("artifact_anchor", "").strip()
            if display and braces_ok(display):
                texts.append(f"${display}$")
            elif boxed_values(anchor):
                texts.extend(f"${v}$" for v in boxed_values(anchor))
            else:
                notes.append(f"unusable final answer for part {label or '-'}: {display!r}")
        lines.append(prefix + "; ".join(texts))
    return "\n".join(lines), notes


# ---------------------------------------------------------------- topics
def topic_map(question_index_by_id: dict[str, dict]) -> dict[str, dict]:
    tasks = json.loads((SEALED / "classification_stage" / "final_topic_tasks.json").read_text(encoding="utf-8"))["records"]
    weights: dict[str, dict[str, float]] = defaultdict(lambda: defaultdict(float))
    seen: dict[str, set] = defaultdict(set)
    for task in tasks:
        qid = task["question_id"]
        q = question_index_by_id[qid]
        part_marks = {p["part_id"]: p["marks"] for p in q["parts"]}
        seen[qid].add(task["topic_id"])
        if task["kind"] == "direct":
            for part in task["parts"]:
                weights[qid][task["topic_id"]] += part_marks.get(part.get("source_part_id"), 1)
    result = {}
    for qid in question_index_by_id:
        ranked = sorted(weights[qid].items(), key=lambda kv: (-kv[1], kv[0]))
        primary = ranked[0][0] if ranked else sorted(seen[qid])[0]
        others = sorted(seen[qid] - {primary})
        result[qid] = {"primary": primary, "secondary": others}
    return result


def main() -> None:
    skip_figures = "--skip-figures" in sys.argv
    records = [json.loads(p.read_text(encoding="utf-8")) for p in sorted((V4 / "source" / "questions").glob("*.json"))]
    if len(records) != 180:
        raise SystemExit(f"Expected 180 Pure 3 questions, found {len(records)}")
    by_id = {r["question_id"]: r for r in records}
    topics = topic_map(by_id)

    OUT_IMG.mkdir(parents=True, exist_ok=True)
    questions, problems = [], []
    for r in records:
        year, sess = r["session"].split("_")
        code, sess_name, _order = SESSION[sess]
        qno = int(r["printed_number"])
        t = topics[r["question_id"]]
        slug, name = TOPIC_BY_ID[t["primary"]]
        secondary = [TOPIC_BY_ID[x] for x in t["secondary"]]
        qid = f"WMA13-01_{year}_{code}_Q{qno:02d}"
        image_name = f"WMA13-01_Y{year}_{code}_Q{qno:02d}_M{int(r['marks_total']):02d}_{slug}.png"
        src_png = Path(r["whole_question_asset"]["path"])
        dst_png = OUT_IMG / image_name
        if not dst_png.exists():
            Image.open(src_png).convert("RGB").quantize(colors=128, method=Image.Quantize.MEDIANCUT).save(dst_png, optimize=True)

        tex = Path(r["student_solution"]["path"]).read_text(encoding="utf-8")
        semantics = json.loads(Path(r["semantics"]["path"]).read_text(encoding="utf-8"))
        steps, boxed = solution_steps(tex, qid, skip_figures)
        answer, notes = final_answer(r, semantics, boxed)
        if not steps:
            problems.append(f"{qid}: no steps")
        problems.extend(f"{qid}: {n}" for n in notes)
        questions.append({
            "id": qid, "year": int(year), "session": code, "paperCode": "WMA13-01",
            "paper": f"WMA13/01 {sess_name} {year}", "qNo": qno, "marks": int(r["marks_total"]),
            "topic": slug, "topicName": name, "primaryTopic": slug, "primaryTopicName": name,
            "secondaryTopics": [s for s, _ in secondary], "secondaryTopicNames": [n for _, n in secondary],
            "topics": [slug] + [s for s, _ in secondary], "topicNames": [name] + [n for _, n in secondary],
            "image": f"ial/wma13/questions/{image_name}", "downloadName": image_name,
            "finalAnswer": safe_inequalities(answer),
            "steps": [{**step, "body": safe_inequalities(step["body"])} for step in steps],
            "status": "checked", "checkedBy": "Dr Eslam Ahmed", "updated": UPDATED,
        })

    questions.sort(key=lambda q: (int(q["topic"][:2]), q["year"], SESSION[{"Jan": "JAN", "MayJune": "JUN", "Oct": "OCT"}[q["session"]]][2], q["qNo"]))
    topic_rows = []
    for _tid, slug, name in TOPICS:
        primary = sum(1 for q in questions if q["primaryTopic"] == slug)
        cross = sum(1 for q in questions if slug in q["secondaryTopics"])
        topic_rows.append({"slug": slug, "name": name, "primaryCount": primary, "count": primary + cross, "crossCount": cross})

    OUT_JS.write_text(
        "window.WMA13_TOPICS = " + json.dumps(topic_rows, ensure_ascii=False, separators=(",", ":")) + ";\n"
        "window.WMA13_QUESTIONS = " + json.dumps(questions, ensure_ascii=False, separators=(",", ":")) + ";\n",
        encoding="utf-8")
    OUT_BANK.parent.mkdir(parents=True, exist_ok=True)
    OUT_BANK.write_text(json.dumps({"course": "WMA13", "questions": questions, "topics": topic_rows}, ensure_ascii=False, indent=1), encoding="utf-8")
    figs = sum(len(s.get("figures", [])) for q in questions for s in q["steps"])
    print(f"WMA13: {len(questions)} questions, {sum(q['marks'] for q in questions)} marks, {figs} figures, "
          f"{len({(q['year'], q['session']) for q in questions})} sessions")
    for row in topic_rows:
        print(f"  {row['slug']:34} primary {row['primaryCount']:3}  total {row['count']:3}")
    if problems:
        print(f"{len(problems)} notes:")
        for p in problems:
            print("  -", p)


if __name__ == "__main__":
    main()
