"""Elite IAL books, 2027 design (navy/gold): classified, expertise, past-paper and per-paper solution books.
One builder for every IAL course; questions, solutions and figures come from the site's own data file.

python tools/ial_books_2027.py wma11|wma12|wma13|wme01 [--papers-only]
"""
from __future__ import annotations

import html
import os
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
COURSES = {
    "wma11": {"code": "WMA11", "name": "Pure 1", "glyph": "&#8747;", "count": 189, "time": "1 h 30"},
    "wma12": {"code": "WMA12", "name": "Pure 2", "glyph": "&Sigma;", "count": 190, "time": "1 h 30"},
    "wma13": {"code": "WMA13", "name": "Pure 3", "glyph": "e&#739;", "count": 180, "time": "1 h 30"},
    "wme01": {"code": "WME01", "name": "Mechanics 1", "glyph": "F", "count": 138, "time": "1 h 30"},
}
COURSE = {}
TOPICS: list[str] = []
HTML_ROOT = PAPER_HTML_ROOT = OUT = PAPER_OUT = ROOT


def configure(course_id: str) -> None:
    """Point every module-level setting at one course."""
    global COURSE, TOPICS, HTML_ROOT, PAPER_HTML_ROOT, OUT, PAPER_OUT
    COURSE = {"id": course_id, **COURSES[course_id]}
    HTML_ROOT = ROOT / "private_output" / f"{course_id}_books_html"
    PAPER_HTML_ROOT = HTML_ROOT / "Papers"
    OUT = ROOT / "downloads" / "IAL" / COURSE["code"]
    PAPER_OUT = OUT / "Papers"
    data = site_data(course_id)
    TOPICS = [topic["slug"] for topic in data["topics"]]
    COURSE["items"] = data["questions"]
    years = [int(q["year"]) for q in data["questions"]]
    COURSE["years"] = f"{min(years)}&ndash;{max(years)}"
    COURSE["sessions"] = len({q["paper"] for q in data["questions"]})
    first = min(data["questions"], key=lambda q: (int(q["year"]), SESSIONS.get(q["session"], 9)))
    last = max(data["questions"], key=lambda q: (int(q["year"]), SESSIONS.get(q["session"], 9)))
    COURSE["span"] = f"{SESSION_NAMES[first['session']].split('/')[0]} {first['year']} to {SESSION_NAMES[last['session']]} {last['year']}"


def site_data(course_id: str) -> dict:
    """Read window.<CODE>_TOPICS / _QUESTIONS from ial/<id>/<id>-data.js (the same data the website uses)."""
    text = (ROOT / "ial" / course_id / f"{course_id}-data.js").read_text(encoding="utf-8")
    out = {}
    for key, name in (("topics", "TOPICS"), ("questions", "QUESTIONS")):
        marker = f"window.{course_id.upper()}_{name} = "
        start = text.index(marker) + len(marker)
        out[key], _ = json.JSONDecoder().raw_decode(text[start:])
    return out


SESSIONS = {"Jan": 1, "MayJune": 2, "MayJuneR": 3, "Oct": 4}
SESSION_NAMES = {"Jan": "January", "MayJune": "May/June", "MayJuneR": "May/June R", "Oct": "October"}


def file_url(path: Path) -> str:
    return path.resolve().as_uri()


def load_items() -> list[dict]:
    items = list(COURSE["items"])
    if len(items) != COURSE["count"]:
        raise SystemExit(f"Expected {COURSE['count']} {COURSE['code']} questions, found {len(items)}")
    return items


def nice_topic(slug: str, item: dict | None = None) -> str:
    if item:
        topics = dict(zip(item.get("topics", []), item.get("topicNames", []), strict=False))
        if slug in topics:
            return topics[slug]
    return slug.split("_", 1)[1].replace("_", " ")


def paper_key(item: dict) -> tuple[int, int, int]:
    return (int(item["year"]), SESSIONS.get(item["session"], 99), int(item["qNo"]))


def sort_key(item: dict) -> tuple[int, int, int, int, int]:
    topic = item.get("displayTopic", item["primaryTopic"])
    return (
        TOPICS.index(topic) if topic in TOPICS else 999,
        1 if item.get("topicRole") == "Cross-topic" else 0,
        int(item["year"]),
        SESSIONS.get(item["session"], 99),
        int(item["qNo"]),
    )


def paper_slug(item: dict) -> str:
    return f"{COURSE['code']}_{int(item['year'])}_{item['session']}"


def escape_math(text: str) -> str:
    return html.escape(str(text), quote=False)


def steps_html(item: dict) -> str:
    parts = []
    for index, step in enumerate(item["steps"], 1):
        title = escape_math(step.get("title", f"Step {index}"))
        body = escape_math(step.get("body", "")).replace("\n\n", "\n")
        body = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", body)
        figures = "".join(
            f'<img class="step-figure" src="{file_url(ROOT / fig["src"])}" alt="{html.escape(fig.get("alt", "Sketch"))}">'
            for fig in step.get("figures", [])
        )
        parts.append(
            f"""<section class="step">
  <div class="step-no">{index}</div>
  <div class="step-main">
    <div class="step-title">{title}</div>
    <div class="math step-body">{body}</div>{figures}
  </div>
</section>"""
        )
    return "\n".join(parts)


def final_answer_lines(answer: str) -> list[str]:
    answer = re.sub(r"\s+", " ", str(answer)).strip()
    answer = re.sub(
        r"\s*\$\\q?quad\s*((?:\([^)]+\))+)(\$?)\s*",
        lambda match: f"\n${match.group(1)}{'$' if match.group(2) else ''} ",
        answer,
    )
    answer = re.sub(r"(?<=\.)\s+(?=\$\([a-d]\))", "\n", answer)
    lines = []
    for line in answer.splitlines():
        line = line.strip()
        if not line:
            continue
        line = re.sub(
            r"^\$((?:\([^)]+\))+)\$\s*(?=\\)",
            lambda match: f"${match.group(1)}",
            line,
        )
        lines.append(line)
    return lines


def final_answer_html(answer: str) -> str:
    lines = final_answer_lines(answer)
    rendered = "".join(f'<div class="answer-line">{escape_math(line)}</div>' for line in lines)
    return f'<div class="answer-lines">{rendered}</div>'


def question_page(item: dict, answer_mode: bool) -> str:
    """Every question starts a new page; in answer books the solution follows straight after it."""
    crop = file_url(ROOT / item["image"])
    display_topic = item.get("displayTopic", item["primaryTopic"])
    chips = [f'<span class="chip gold">{int(item["marks"])} marks</span>', f'<span class="chip">{html.escape(nice_topic(display_topic, item))}</span>']
    if item.get("topicRole") == "Cross-topic":
        chips.append(f'<span class="chip soft">Main topic: {html.escape(item["primaryTopicName"])}</span>')
    return f"""<article class="qa{' qa-answers' if answer_mode else ''}">
  <header class="q-head">
    <div>
      <div class="eyebrow">{html.escape(item["paper"])}</div>
      <h2>Question {int(item["qNo"])}</h2>
    </div>
    <div class="chips">{''.join(chips)}</div>
  </header>
  <div class="q-card"><img class="question-img" src="{crop}" alt="{html.escape(item["id"])}"></div>
{'' if answer_mode else '  <footer class="sign">Dr Eslam Ahmed &middot; eliteigcse.com</footer>' + chr(10) + '</article>'}"""


def solution_page(item: dict) -> str:
    return f"""  <section class="solution">
    <div class="sol-head"><span class="sol-kicker">Worked solution</span><span class="sol-q">Question {int(item["qNo"])} &middot; {html.escape(item["paper"])}</span></div>
    {steps_html(item)}
    <div class="final"><div class="final-label"><span class="tick">&#10003;</span>Final answer</div><div class="math">{final_answer_html(item["finalAnswer"])}</div></div>
  </section>
  <footer class="sign">Dr Eslam Ahmed &middot; eliteigcse.com</footer>
</article>"""


def cover(title: str, subtitle: str, count: int, answer_mode: bool, count_label: str = "topic placements", badge: str | None = None) -> str:
    badge = badge or ("Questions" if not answer_mode else "Questions with worked solutions")
    photo = file_url(ROOT / "assets" / "Eslam4.jpg")
    return f"""<section class="page cover">
  <div class="cover-grid-bg"></div>
  <div class="cover-glyph">{COURSE["glyph"]}</div>
  <div class="cover-top"><span class="mark">E</span><span><strong>Elite Mathematics</strong><small>{COURSE.get("board", "Edexcel International A Level")}</small></span></div>
  <div class="cover-body">
    <div class="cover-kicker">{COURSE.get("kicker") or "IAL " + COURSE["name"] + " &middot; " + COURSE["code"]}</div>
    <h1>{html.escape(title)}</h1>
    <p>{html.escape(subtitle)}</p>
    <div class="cover-stats">
      <div><strong>{count}</strong><span>{html.escape(count_label)}</span></div>
      <div><strong>{COURSE["years"]}</strong><span>{COURSE["sessions"]} {COURSE.get("sessions_label", "exam sessions")}</span></div>
      <div><strong>{html.escape(badge)}</strong><span>checked by Dr Eslam</span></div>
    </div>
  </div>
  <div class="cover-teacher"><img src="{photo}" alt="Dr Eslam Ahmed"><div><strong>Dr Eslam Ahmed</strong><span>Assistant Lecturer, Faculty of Engineering, Cairo University</span><span class="site">eliteigcse.com &middot; free for every student</span></div></div>
</section>"""


def topic_section(topic: str) -> str:
    return f"""<section class="page divider">
  <div class="divider-band"><div class="cover-kicker">Topic</div><h1>{html.escape(topic)}</h1></div>
  <p class="divider-note">Every past-paper question on this topic, {COURSE["span"]}.</p>
</section>"""


def paper_section(paper: str, paper_items: list[dict]) -> str:
    total_marks = sum(int(item["marks"]) for item in paper_items)
    first = paper_items[0]
    session = SESSION_NAMES.get(first["session"], first["session"])
    return f"""<section class="page divider">
  <div class="divider-band"><div class="cover-kicker">Past paper</div><h1>{html.escape(paper)}</h1>
  <p>{html.escape(session)} {int(first["year"])}</p></div>
  <div class="divider-stats"><div><strong>{len(paper_items)}</strong><span>questions</span></div><div><strong>{total_marks}</strong><span>marks</span></div><div><strong>{COURSE["time"]}</strong><span>exam time</span></div></div>
  <p class="divider-note">Each question is followed by its worked solution and final answer.</p>
</section>"""


def html_doc(title: str, css_href: str, chunks: list[str]) -> str:
    return f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{html.escape(title)}</title>
  <link rel="stylesheet" href="{css_href}">
  <script>window.MathJax={{tex:{{inlineMath:[['$','$'],['\\\\(','\\\\)']]}}}};</script>
  <script defer src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-svg.js"></script>
</head>
<body>
  <main>{''.join(chunks)}</main>
</body>
</html>"""


def build_topic_html(filename: str, title: str, subtitle: str, items: list[dict], answer_mode: bool) -> tuple[Path, Path]:
    chunks = [cover(title, subtitle, len(items), answer_mode)]
    current_topic = None
    for item in sorted(items, key=sort_key):
        topic = nice_topic(item.get("displayTopic", item["primaryTopic"]), item)
        if topic != current_topic:
            current_topic = topic
            chunks.append(topic_section(current_topic))
        chunks.append(question_page(item, answer_mode))
        if answer_mode:
            chunks.append(solution_page(item))
    html_path = HTML_ROOT / filename
    html_path.write_text(html_doc(title, f"{COURSE['id']}_books.css", chunks), encoding="utf-8")
    return html_path, OUT / html_path.with_suffix(".pdf").name


def paper_groups(items: list[dict]) -> list[tuple[str, list[dict]]]:
    grouped: dict[str, list[dict]] = {}
    for item in items:
        grouped.setdefault(item["paper"], []).append(item)
    return [
        (paper, sorted(paper_items, key=paper_key))
        for paper, paper_items in sorted(grouped.items(), key=lambda pair: paper_key(pair[1][0]))
    ]


def build_all_papers_html(filename: str, title: str, subtitle: str, items: list[dict]) -> tuple[Path, Path]:
    sorted_items = sorted(items, key=paper_key)
    chunks = [cover(title, subtitle, len(sorted_items), True, "paper-order questions", "Past-paper solutions")]
    for paper, paper_items in paper_groups(sorted_items):
        chunks.append(paper_section(paper, paper_items))
        for item in paper_items:
            chunks.append(question_page(item, True))
            chunks.append(solution_page(item))
    html_path = HTML_ROOT / filename
    html_path.write_text(html_doc(title, f"{COURSE['id']}_books.css", chunks), encoding="utf-8")
    return html_path, OUT / html_path.with_suffix(".pdf").name


def build_single_paper_html(paper: str, paper_items: list[dict]) -> tuple[Path, Path]:
    first = paper_items[0]
    session = SESSION_NAMES.get(first["session"], first["session"])
    title = f"{paper} Worked Solutions"
    subtitle = f"{session} {int(first['year'])} paper rebuilt with the worked solution after each question."
    chunks = [cover(title, subtitle, len(paper_items), True, "paper questions", "Single-paper solutions")]
    chunks.append(paper_section(paper, paper_items))
    for item in paper_items:
        chunks.append(question_page(item, True))
        chunks.append(solution_page(item))
    html_path = PAPER_HTML_ROOT / f"{paper_slug(first)}_Solutions.html"
    html_path.write_text(html_doc(title, f"../{COURSE['id']}_books.css", chunks), encoding="utf-8")
    return html_path, PAPER_OUT / f"{paper_slug(first)}_Solutions.pdf"


def write_css() -> None:
    css = r"""
:root { --navy:#0f2140; --navy2:#16305c; --ink:#0e1b2e; --gold:#e2b84f; --gold-ink:#7d5a0b; --gold-soft:#fbf3d8; --amber:#a3611a; --line:#dfe6ef; --muted:#56667c; --paper:#ffffff; --canvas:#f3f6fa; }
* { box-sizing:border-box; }
body { margin:0; color:var(--ink); font-family:"Sora","Segoe UI",Arial,sans-serif; background:#fff; }
@page { size:A4; margin:12mm 13mm 14mm; }
@page :first { margin:0; }
.page { width:auto; height:269mm; position:relative; overflow:hidden; break-after:page; page-break-after:always; }
/* cover */
.cover { margin:0; height:297mm; padding:20mm 18mm; background:var(--navy); color:#fff; display:flex; flex-direction:column; }
.cover-grid-bg { position:absolute; inset:0; opacity:.6; background-image:linear-gradient(rgba(255,255,255,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.05) 1px,transparent 1px); background-size:12mm 12mm; }
.cover-glyph { position:absolute; right:10mm; bottom:40mm; font-family:"Cambria Math","Times New Roman",serif; font-size:190pt; color:#fff; opacity:.06; }
.cover-top, .cover-body, .cover-teacher { position:relative; z-index:1; }
.cover-top { display:flex; align-items:center; gap:4mm; }
.mark { width:12mm; height:12mm; border-radius:2.5mm; background:var(--gold); color:var(--navy); display:grid; place-items:center; font-weight:800; font-size:15pt; }
.cover-top strong { display:block; font-size:12pt; }
.cover-top small { display:block; color:#aebbd0; font-size:9pt; }
.cover-body { margin-top:auto; margin-bottom:auto; }
.cover-kicker { color:var(--gold); font-weight:800; letter-spacing:.12em; text-transform:uppercase; font-size:10pt; }
.cover h1 { font-size:34pt; line-height:1.08; margin:5mm 0 4mm; max-width:165mm; }
.cover p { font-size:12.5pt; line-height:1.55; color:#c9d3e3; max-width:150mm; margin:0; }
.cover-stats { display:grid; grid-template-columns:repeat(3,1fr); gap:4mm; margin-top:12mm; }
.cover-stats div { border:1px solid rgba(255,255,255,.18); border-top:1.2mm solid var(--gold); border-radius:2mm; padding:5mm; background:rgba(255,255,255,.05); }
.cover-stats strong { display:block; font-size:15pt; color:#fff; line-height:1.2; }
.cover-stats span { display:block; margin-top:1.5mm; color:#aebbd0; font-size:9.5pt; }
.cover-teacher { display:flex; gap:5mm; align-items:center; border-top:1px solid rgba(255,255,255,.18); padding-top:7mm; }
.cover-teacher img { width:22mm; height:22mm; border-radius:50%; object-fit:cover; object-position:center 20%; border:.8mm solid var(--gold); }
.cover-teacher strong { display:block; font-size:13pt; }
.cover-teacher span { display:block; color:#c9d3e3; font-size:9.5pt; margin-top:1mm; }
.cover-teacher .site { color:var(--gold); font-weight:700; }
/* dividers */
.divider { display:flex; flex-direction:column; justify-content:center; }
.divider-band { background:var(--navy); color:#fff; border-radius:3mm; padding:14mm 12mm; border-bottom:1.6mm solid var(--gold); }
.divider-band h1 { font-size:28pt; margin:3mm 0 0; line-height:1.15; }
.divider-band p { margin:3mm 0 0; color:#c9d3e3; font-size:12pt; font-weight:700; }
.divider-stats { display:grid; grid-template-columns:repeat(3,1fr); gap:4mm; margin-top:8mm; }
.divider-stats div { border:1px solid var(--line); border-left:1.4mm solid var(--gold); border-radius:2mm; padding:5mm; }
.divider-stats strong { display:block; font-size:18pt; color:var(--navy); }
.divider-stats span { color:var(--muted); }
.divider-note { color:var(--muted); font-size:11pt; margin-top:8mm; }
/* question + solution */
.qa { break-before:page; page-break-before:always; }
.qa:first-of-type { break-before:auto; }
.q-head { display:flex; justify-content:space-between; gap:6mm; align-items:center; padding:4mm 6mm; background:var(--navy); color:#fff; border-radius:2.5mm; border-bottom:1.3mm solid var(--gold); break-after:avoid; }
.q-head .eyebrow { color:#aebbd0; font-size:8.5pt; font-weight:700; letter-spacing:.1em; text-transform:uppercase; }
.q-head h2 { margin:1mm 0 0; font-size:18pt; }
.chips { display:flex; flex-wrap:wrap; gap:1.5mm; justify-content:flex-end; max-width:105mm; }
.chip { border:1px solid rgba(255,255,255,.35); border-radius:999px; padding:1mm 3mm; font-size:8.5pt; font-weight:700; white-space:nowrap; }
.chip.gold { background:var(--gold); color:var(--navy); border-color:var(--gold); }
.chip.soft { color:#c9d3e3; }
.q-card { margin-top:4mm; border:1px solid var(--line); border-left:1.4mm solid var(--gold); border-radius:2mm; padding:3mm; break-inside:avoid; }
.question-img { display:block; max-width:100%; max-height:215mm; margin:0 auto; }
.solution { margin-top:6mm; }
.sol-head { display:flex; justify-content:space-between; align-items:baseline; gap:4mm; border-bottom:.6mm solid var(--navy); padding-bottom:2mm; margin-bottom:2mm; break-after:avoid; }
.sol-kicker { color:var(--navy); font-weight:800; font-size:12pt; text-transform:uppercase; letter-spacing:.06em; }
.sol-q { color:var(--muted); font-size:9pt; font-weight:700; }
.step { display:grid; grid-template-columns:8mm 1fr; gap:3mm; padding:3mm 0; border-bottom:1px solid var(--line); break-inside:avoid; }
.step-no { width:7mm; height:7mm; border-radius:50%; background:var(--navy); color:var(--gold); display:grid; place-items:center; font-weight:800; font-size:9pt; margin-top:.5mm; }
.step-title { color:var(--navy); font-weight:800; margin-bottom:1mm; }
.math { line-height:1.6; font-size:11pt; overflow-wrap:anywhere; }
.step-body { white-space:pre-line; }
.step-figure { display:block; max-width:110mm; max-height:85mm; margin:2mm auto 0; }
mjx-container[jax="SVG"][display="true"] { margin:1.5mm 0 !important; max-width:100%; }
mjx-container[jax="SVG"] > svg { max-width:100%; height:auto; }
.final { margin-top:4mm; padding:3.5mm 5mm; background:var(--gold-soft); border:1px solid #ecd9a4; border-left:1.6mm solid var(--gold); border-radius:2mm; break-inside:avoid; }
.final-label { display:flex; align-items:center; gap:2mm; color:var(--gold-ink); font-weight:800; text-transform:uppercase; letter-spacing:.06em; font-size:9pt; margin-bottom:1mm; }
.tick { width:5mm; height:5mm; border-radius:50%; background:var(--navy); color:var(--gold); display:grid; place-items:center; font-size:8pt; }
.answer-line { margin-top:1mm; }
.answer-line:first-child { margin-top:0; }
.sign { margin-top:4mm; text-align:right; color:#9aa6b6; font-size:8pt; font-weight:700; letter-spacing:.04em; }
@media screen { body { background:#d9dee6; } main { width:210mm; margin:0 auto; background:#fff; padding:12mm 13mm; } }
"""
    HTML_ROOT.mkdir(parents=True, exist_ok=True)
    PAPER_HTML_ROOT.mkdir(parents=True, exist_ok=True)
    (HTML_ROOT / f"{COURSE['id']}_books.css").write_text(css, encoding="utf-8")


def topic_placements(items: list[dict]) -> list[dict]:
    placed = []
    for item in items:
        primary = item["primaryTopic"]
        placed.append({**item, "displayTopic": primary, "topicRole": "Primary"})
        for topic in item.get("secondaryTopics", []):
            if topic in TOPICS and topic != primary:
                placed.append({**item, "displayTopic": topic, "topicRole": "Cross-topic"})
    return placed


def print_pdf(html_path: Path, pdf_path: Path) -> None:
    # Prefer the Playwright Chromium (reliable headless printing); fall back to Edge.
    candidates = sorted(Path(os.environ.get("LOCALAPPDATA", "")).glob("ms-playwright/chromium_headless_shell-*/*/chrome-headless-shell.exe"), reverse=True)
    candidates.append(Path(r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"))
    browser = next((path for path in candidates if path.exists()), None)
    if not browser:
        raise SystemExit("A Chromium browser is required to print the IAL PDFs on this machine.")
    if pdf_path.exists():
        pdf_path.unlink()
    markup = html_path.read_text(encoding="utf-8")
    pages = markup.count('class="page ') + 2 * markup.count('<article class="qa')
    budget = max(20000, min(600000, pages * 250))
    subprocess.run(
        [
            str(browser),
            "--disable-gpu",
            "--no-first-run",
            "--disable-extensions",
            "--run-all-compositor-stages-before-draw",
            f"--virtual-time-budget={budget}",
            f"--print-to-pdf={pdf_path}",
            "--print-to-pdf-no-header",
            "--no-pdf-header-footer",
            html_path.resolve().as_uri(),
        ],
        check=False,
    )
    if not pdf_path.exists() or pdf_path.stat().st_size < 10000:
        raise SystemExit(f"Could not build PDF: {pdf_path}")
    if pdf_path.stat().st_size > 40_000_000:
        shrink_pdf(pdf_path)


def shrink_pdf(pdf_path: Path) -> None:
    """Lossless: compress page streams and merge the duplicate objects Chromium writes (keeps files under GitHub's 100 MB)."""
    from pypdf import PdfReader, PdfWriter

    writer = PdfWriter(clone_from=PdfReader(pdf_path))
    for page in writer.pages:
        page.compress_content_streams(level=9)
    writer.compress_identical_objects(remove_duplicates=True, remove_unreferenced=True)
    tmp = pdf_path.with_suffix(".shrink.pdf")
    with open(tmp, "wb") as fh:
        writer.write(fh)
    tmp.replace(pdf_path)
    if pdf_path.stat().st_size >= 100_000_000:
        raise SystemExit(f"{pdf_path.name} is still over GitHub's 100 MB limit after shrinking")


def main() -> None:
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if not args or args[0] not in COURSES:
        raise SystemExit("usage: python tools/ial_books_2027.py wma11|wma12|wma13|wme01 [--papers-only]")
    configure(args[0])
    code, name = COURSE["code"], COURSE["name"]
    papers_only = "--papers-only" in sys.argv
    OUT.mkdir(parents=True, exist_ok=True)
    PAPER_OUT.mkdir(parents=True, exist_ok=True)
    if HTML_ROOT.exists():
        shutil.rmtree(HTML_ROOT)
    write_css()

    items = load_items()
    expertise = [item for item in items if int(item["qNo"]) >= 6]
    classified_placements = topic_placements(items)
    expertise_placements = topic_placements(expertise)

    outputs = [] if papers_only else [
        build_topic_html(
            f"{code}_Classified_Questions.html",
            f"{code} {name} Classified Questions",
            f"{len(items)} unique questions grouped by primary topic, with cross-topic placements where a question also belongs in another chapter.",
            classified_placements,
            False,
        ),
        build_topic_html(
            f"{code}_Expertise_Questions.html",
            f"{code} {name} Expertise Questions",
            "Questions 6 and above, grouped by topic with cross-topic placements where useful.",
            expertise_placements,
            False,
        ),
        build_topic_html(
            f"{code}_Classified_With_Answers.html",
            f"{code} {name} Classified With Answers",
            "Every question followed by Dr Eslam Ahmed's worked solution and final answer.",
            classified_placements,
            True,
        ),
        build_topic_html(
            f"{code}_Expertise_With_Answers.html",
            f"{code} {name} Expertise With Answers",
            "Questions 6 and above with worked-solution pages and cross-topic placements.",
            expertise_placements,
            True,
        ),
        build_all_papers_html(
            f"{code}_Past_Paper_Solutions.html",
            f"{code} {name} Past Paper Solutions",
            f"The full {code} bank rebuilt in original paper order, with each question followed by its worked solution.",
            items,
        ),
    ]
    outputs.extend(build_single_paper_html(paper, paper_items) for paper, paper_items in paper_groups(items))

    for html_path, pdf_path in outputs:
        print_pdf(html_path, pdf_path)
        print(pdf_path)


if __name__ == "__main__":
    main()
