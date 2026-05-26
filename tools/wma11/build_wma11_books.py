from __future__ import annotations

import csv
import html
import json
import re
import subprocess
from pathlib import Path

SCRIPT_ROOT = Path(__file__).resolve().parents[1]
SOURCE_ROOT = Path(r"D:\Tyro4_Latex\0 Mathematics\Pure 1\Final Exams")
ROOT = SCRIPT_ROOT if (SCRIPT_ROOT / "Solutions_Work").exists() else SOURCE_ROOT
WORK = ROOT / "Solutions_Work"
OUT = WORK / "IAL_Books"
PAPER_OUT = OUT / "Papers"
SOLUTIONS = WORK / "solutions"
MANIFEST = WORK / "solution_manifest.csv"
CROSS_TOPICS = WORK / "wma11_cross_topics.json"

TOPICS = [
    "01_Indices_Surds",
    "02_Quadratics",
    "03_Simultaneous",
    "04_Inequalities",
    "05_Polynomials",
    "06_GraphsOfFunctions",
    "07_Transformations",
    "08_StraightLine",
    "09_BasicTrig",
    "10_Radians",
    "11_TrigFunctions",
    "12_Differentiation",
    "13_Integration",
]
SESSIONS = {"Jan": 1, "MayJune": 2, "Oct": 3}
TOPIC_NAMES = {
    "01_Indices_Surds": "Indices & Surds",
    "02_Quadratics": "Quadratics",
    "03_Simultaneous": "Simultaneous Equations",
    "04_Inequalities": "Inequalities",
    "05_Polynomials": "Polynomials",
    "06_GraphsOfFunctions": "Graphs of Functions",
    "07_Transformations": "Transformations",
    "08_StraightLine": "Straight Line",
    "09_BasicTrig": "Basic Trigonometry",
    "10_Radians": "Radians",
    "11_TrigFunctions": "Trigonometric Functions",
    "12_Differentiation": "Differentiation",
    "13_Integration": "Integration",
}


def file_url(path: Path) -> str:
    return path.resolve().as_uri()


def nice_topic(slug: str) -> str:
    return TOPIC_NAMES.get(slug, slug.split("_", 1)[1].replace("_", " "))


def load_items() -> list[dict]:
    cross_topics = json.loads(CROSS_TOPICS.read_text(encoding="utf-8")) if CROSS_TOPICS.exists() else {}
    items: list[dict] = []
    for path in sorted(SOLUTIONS.glob("*.json")):
        items.extend(json.loads(path.read_text(encoding="utf-8")))
    by_id = {item["id"]: item for item in items}
    rows = list(csv.DictReader(MANIFEST.open(encoding="utf-8")))
    merged = []
    for row in rows:
        item = by_id.get(row["id"])
        if not item:
            continue
        primary_topic = row["final_topic"]
        secondary_topics = [topic for topic in cross_topics.get(row["id"], []) if topic in TOPICS and topic != primary_topic]
        merged.append(
            {
                **row,
                **item,
                "topicNote": item.get("topicNote", ""),
                "status": item.get("status", "published"),
                "checkedBy": item.get("checkedBy", ""),
                "updated": item.get("updated", ""),
                "primary_topic": primary_topic,
                "secondary_topics": secondary_topics,
                "all_topics": [primary_topic, *secondary_topics],
            }
        )
    return merged


def sort_key(item: dict) -> tuple:
    topic = item.get("display_topic", item["final_topic"])
    return (
        TOPICS.index(topic) if topic in TOPICS else 999,
        1 if item.get("topic_role") == "Cross-topic" else 0,
        int(item["year"]),
        SESSIONS.get(item["session"], 9),
        int(item["q_no"]),
    )


def paper_key(item: dict) -> tuple:
    return (int(item["year"]), SESSIONS.get(item["session"], 9), int(item["q_no"]))


def paper_slug(item: dict) -> str:
    return f"WMA11_{int(item['year'])}_{item['session']}"


def steps_html(item: dict) -> str:
    parts = []
    for i, step in enumerate(item["steps"], 1):
        parts.append(
            f"""<section class="step">
  <div class="step-title">{i}. {html.escape(step["title"])}</div>
  <div class="math">{step["body"]}</div>
</section>"""
        )
    return "\n".join(parts)


def final_answer_html(answer: str) -> str:
    answer = answer.strip()
    answer = re.sub(r"(?<=\.)\s+(?=\$\([a-d]\))", '</div><div class="answer-line">', answer)
    answer = re.sub(r"\\q?quad\s+(\([b-d]\))", r'$</div><div class="answer-line">$\1', answer)
    return f'<div class="answer-lines"><div class="answer-line">{answer}</div></div>'


def question_page(item: dict, answer_mode: bool) -> str:
    crop = file_url(ROOT / item["crop_path"])
    mode = "with-solution" if answer_mode else "question-only"
    display_topic = item.get("display_topic", item["final_topic"])
    role = item.get("topic_role", "Primary")
    cross_note = ""
    if role == "Cross-topic":
        cross_note = f'<span>Also in {html.escape(nice_topic(display_topic))}</span><span>Primary: {html.escape(nice_topic(item["primary_topic"]))}</span>'
    return f"""<article class="page question-page {mode}">
  <header class="q-head">
    <div>
      <div class="eyebrow">{html.escape(item["paper"])}</div>
      <h2>Question {item["q_no"]}</h2>
    </div>
    <div class="meta">
      <span>{item["marks"]} marks</span>
      <span>{html.escape(nice_topic(display_topic))}</span>
      {cross_note}
    </div>
  </header>
  <img class="question-img" src="{crop}" alt="{html.escape(item["id"])}">
</article>"""


def solution_page(item: dict) -> str:
    display_topic = item.get("display_topic", item["final_topic"])
    role_note = "Topic group" if item.get("topic_role") != "Cross-topic" else f'Primary group: {nice_topic(item["primary_topic"])}'
    return f"""<article class="page solution-page">
  <header class="q-head solution-head">
    <div>
      <div class="eyebrow">{html.escape(item["paper"])}</div>
      <h2>Worked Solution - Question {item["q_no"]}</h2>
    </div>
    <div class="meta"><span>{html.escape(nice_topic(display_topic))}</span><span>{html.escape(role_note)}</span></div>
  </header>
  <div class="solution-box">
    {steps_html(item)}
    <div class="final"><strong>Final answer</strong><div class="math">{final_answer_html(item["final_answer"])}</div></div>
  </div>
</article>"""


def cover(title: str, subtitle: str, count: int, answer_mode: bool, count_label: str = "topic placements", badge: str | None = None) -> str:
    badge = badge or ("Question bank" if not answer_mode else "Question bank with worked answers")
    cover_class = "answer-cover" if answer_mode else "question-cover"
    return f"""<section class="cover page {cover_class}">
  <div class="cover-brand-row"><span>EA</span><strong>Elite IAL Mathematics</strong></div>
  <div class="cover-kicker">Edexcel International A Level</div>
  <h1>{html.escape(title)}</h1>
  <p>{html.escape(subtitle)}</p>
  <div class="cover-grid">
    <div><strong>{count}</strong><span>{html.escape(count_label)}</span></div>
    <div><strong>WMA11</strong><span>Pure 1</span></div>
    <div><strong>{badge}</strong><span>standalone IAL route</span></div>
  </div>
  <div class="cover-seal">Dr Eslam Ahmed</div>
  <footer>Prepared for Dr Eslam Ahmed - eliteigcse.com</footer>
</section>"""


def topic_section(topic: str) -> str:
    return f"""<section class="topic-break page">
  <div class="cover-kicker">Topic</div>
  <h1>{html.escape(nice_topic(topic))}</h1>
</section>"""


def paper_section(paper: str, paper_items: list[dict]) -> str:
    total_marks = sum(int(item["marks"]) for item in paper_items)
    year = paper_items[0]["year"] if paper_items else ""
    session = paper_items[0]["session"] if paper_items else ""
    return f"""<section class="paper-break page">
  <div class="cover-kicker">Past paper</div>
  <h1>{html.escape(paper)}</h1>
  <p>{html.escape(str(session))} {html.escape(str(year))} | {len(paper_items)} questions | {total_marks} marks</p>
  <div class="cover-grid paper-metrics">
    <div><strong>{len(paper_items)}</strong><span>questions</span></div>
    <div><strong>{total_marks}</strong><span>marks</span></div>
    <div><strong>Answers</strong><span>worked solution after each question</span></div>
  </div>
</section>"""


def build_html(filename: str, title: str, subtitle: str, items: list[dict], answer_mode: bool) -> Path:
    chunks = [cover(title, subtitle, len(items), answer_mode)]
    current_topic = None
    for item in sorted(items, key=sort_key):
        topic = item.get("display_topic", item["final_topic"])
        if topic != current_topic:
            current_topic = topic
            chunks.append(topic_section(current_topic))
        chunks.append(question_page(item, answer_mode))
        if answer_mode:
            chunks.append(solution_page(item))
    html_doc = f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{html.escape(title)}</title>
  <link rel="stylesheet" href="wma11_books.css">
  <script>window.MathJax={{tex:{{inlineMath:[['$','$'],['\\\\(','\\\\)']]}}}};</script>
  <script defer src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-svg.js"></script>
</head>
<body>
  <main>{''.join(chunks)}</main>
</body>
</html>"""
    path = OUT / filename
    path.write_text(html_doc, encoding="utf-8")
    return path


def paper_groups(items: list[dict]) -> list[tuple[str, list[dict]]]:
    grouped: dict[str, list[dict]] = {}
    for item in items:
        grouped.setdefault(item["paper"], []).append(item)
    return [
        (paper, sorted(paper_items, key=paper_key))
        for paper, paper_items in sorted(grouped.items(), key=lambda pair: paper_key(pair[1][0]))
    ]


def build_past_paper_solutions_html(filename: str, title: str, subtitle: str, items: list[dict]) -> Path:
    sorted_items = sorted(items, key=paper_key)
    chunks = [cover(title, subtitle, len(sorted_items), True, "paper-order questions", "Past-paper solutions")]
    for paper, paper_items in paper_groups(sorted_items):
        chunks.append(paper_section(paper, paper_items))
        for item in paper_items:
            chunks.append(question_page(item, True))
            chunks.append(solution_page(item))
    html_doc = f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{html.escape(title)}</title>
  <link rel="stylesheet" href="wma11_books.css">
  <script>window.MathJax={{tex:{{inlineMath:[['$','$'],['\\\\(','\\\\)']]}}}};</script>
  <script defer src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-svg.js"></script>
</head>
<body>
  <main>{''.join(chunks)}</main>
</body>
</html>"""
    path = OUT / filename
    path.write_text(html_doc, encoding="utf-8")
    return path


def build_single_paper_solution_html(paper: str, paper_items: list[dict]) -> Path:
    first = paper_items[0]
    session = first["session"]
    year = int(first["year"])
    title = f"{paper} Worked Solutions"
    subtitle = f"{session} {year} paper rebuilt with the worked solution after each question."
    chunks = [cover(title, subtitle, len(paper_items), True, "paper questions", "Single-paper solutions")]
    chunks.append(paper_section(paper, paper_items))
    for item in paper_items:
        chunks.append(question_page(item, True))
        chunks.append(solution_page(item))
    html_doc = f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{html.escape(title)}</title>
  <link rel="stylesheet" href="../wma11_books.css">
  <script>window.MathJax={{tex:{{inlineMath:[['$','$'],['\\\\(','\\\\)']]}}}};</script>
  <script defer src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-svg.js"></script>
</head>
<body>
  <main>{''.join(chunks)}</main>
</body>
</html>"""
    path = PAPER_OUT / f"{paper_slug(first)}_Solutions.html"
    path.write_text(html_doc, encoding="utf-8")
    return path


def write_css() -> None:
    css = r"""
:root { --ink:#161b2e; --ink-deep:#0e1220; --question:#36304a; --question-deep:#241f33; --answer:#c8392b; --examiner:#c86a3f; --gold:#c86a3f; --gold-soft:#dcb877; --cream:#fbf6e6; --vellum:#ebdfc4; --line:#d8ccb8; --paper:#ffffff; --text:#1a1815; --muted:#5a5258; }
* { box-sizing:border-box; }
body { margin:0; color:var(--text); font-family:"Sora","Segoe UI",Arial,sans-serif; background:var(--vellum); }
.page { width:210mm; min-height:297mm; margin:0 auto; padding:14mm 14mm 16mm 20mm; background:var(--paper); border-left:7mm solid var(--question); page-break-after:always; position:relative; overflow:hidden; }
.page:after { content:""; position:absolute; left:7mm; top:0; bottom:0; width:1.2mm; background:var(--gold-soft); }
.solution-page,.answer-cover { border-left-color:var(--question-deep); }
.cover { display:flex; flex-direction:column; justify-content:center; align-items:flex-start; text-align:left; color:var(--text); background:linear-gradient(135deg,rgba(54,48,74,.14),transparent 42%),linear-gradient(180deg,var(--paper),#fff 44%,var(--paper)); }
.answer-cover { background:linear-gradient(135deg,rgba(54,48,74,.16),transparent 42%),linear-gradient(180deg,var(--paper),#fff 44%,var(--paper)); }
.cover:before { content:"P1"; position:absolute; right:7mm; bottom:5mm; color:rgba(22,27,46,.065); font-size:158pt; font-weight:800; }
.cover:after { content:""; position:absolute; top:0; left:0; right:0; height:16mm; background:linear-gradient(90deg,var(--ink),var(--question-deep)); }
.answer-cover:after { background:linear-gradient(90deg,var(--question-deep),var(--question)); }
.cover > * { position:relative; z-index:1; max-width:160mm; }
.cover-brand-row { position:absolute; left:20mm; top:18mm; display:flex; align-items:center; gap:4mm; color:var(--ink); }
.cover-brand-row span { display:inline-grid; place-items:center; width:13mm; height:13mm; border-radius:2mm; color:white; background:var(--ink); font-size:12pt; font-weight:900; }
.cover-brand-row strong { font-size:10pt; letter-spacing:.09em; text-transform:uppercase; }
.cover-seal { margin-top:10mm; display:inline-flex; align-items:center; min-height:12mm; padding:2mm 6mm; border:1px solid var(--gold); border-left:2mm solid var(--gold); border-radius:2mm; color:var(--ink); background:#fff8e8; font-weight:800; }
.cover-kicker,.eyebrow { color:var(--question-deep); font-weight:800; letter-spacing:.09em; text-transform:uppercase; font-size:10pt; }
.answer-cover .cover-kicker { color:var(--question-deep); }
.cover h1,.topic-break h1 { font-size:37pt; line-height:1.04; margin:8mm 0 5mm; color:var(--ink); }
.cover p { max-width:150mm; font-size:14pt; line-height:1.5; color:var(--muted); }
.cover-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:5mm; margin-top:14mm; width:100%; }
.cover-grid div { border:1px solid var(--line); border-left:2mm solid var(--question); border-radius:2mm; padding:6mm; background:#fffdf8; box-shadow:0 6px 18px rgba(14,18,32,.06); }
.answer-cover .cover-grid div { border-left-color:var(--question-deep); }
.cover-grid strong { display:block; font-size:18pt; color:var(--ink); }
.cover-grid span { display:block; margin-top:2mm; color:var(--muted); }
.cover footer { margin-top:18mm; color:var(--muted); font-weight:700; }
.topic-break,.paper-break { display:flex; flex-direction:column; justify-content:center; background:linear-gradient(90deg,rgba(54,48,74,.10),transparent 45%),var(--paper); }
.paper-break { background:linear-gradient(90deg,rgba(54,48,74,.09),transparent 45%),var(--paper); }
.topic-break .cover-kicker,.paper-break .cover-kicker { color:var(--question-deep); }
.paper-break p { margin:0; color:var(--muted); font-size:14pt; font-weight:700; }
.paper-metrics { max-width:150mm; }
.q-head { display:flex; justify-content:space-between; gap:8mm; align-items:center; min-height:23mm; margin:0 0 8mm; padding:4mm 6mm; background:var(--question); border-bottom:1.5mm solid var(--gold-soft); border-radius:2mm; color:white; box-shadow:0 6px 18px rgba(14,18,32,.1); }
.solution-head { background:var(--question-deep); border-bottom-color:var(--gold); }
.q-head .eyebrow { color:rgba(255,255,255,.82); }
.q-head h2 { margin:2mm 0 0; font-size:20pt; color:white; }
.meta { display:flex; flex-direction:column; gap:2mm; align-items:flex-end; }
.meta span { border:1px solid rgba(255,255,255,.34); border-radius:999px; padding:2mm 4mm; color:white; font-weight:800; white-space:nowrap; background:rgba(255,255,255,.1); }
.question-img { display:block; max-width:100%; max-height:232mm; margin:0 auto; border:1px solid var(--line); border-left:3mm solid var(--gold); background:white; padding:4mm; box-shadow:0 6px 18px rgba(14,18,32,.08); }
.solution-box { border:1px solid var(--line); border-left:3mm solid var(--question-deep); border-radius:2mm; overflow:hidden; background:white; box-shadow:0 6px 18px rgba(14,18,32,.08); }
.step { padding:5mm 6mm; border-top:1px solid #eadfce; break-inside:avoid; }
.step:first-child { border-top:0; }
.step-title { color:var(--question-deep); font-weight:800; margin-bottom:2mm; }
.math { line-height:1.65; font-size:12pt; }
.final { margin:5mm 6mm; padding:4mm 5mm; border-left:4mm solid var(--answer); background:#fff8e8; border-radius:2mm; line-height:1.6; break-inside:avoid; }
.answer-line { margin-top:1.5mm; max-width:100%; }
.answer-line:first-child { margin-top:0; }
.final mjx-container[jax="SVG"] > svg { max-width:100%; height:auto; }
@page { size:A4; margin:0; }
@media screen { body { background:#d8d2c2; } .page { box-shadow:0 12px 40px rgba(21,26,45,.16); margin:10mm auto; } }
"""
    (OUT / "wma11_books.css").write_text(css, encoding="utf-8")


def topic_placements(items: list[dict]) -> list[dict]:
    placed = []
    for item in items:
        primary = item["primary_topic"]
        placed.append({**item, "display_topic": primary, "topic_role": "Primary"})
        for topic in item.get("secondary_topics", []):
            placed.append({**item, "display_topic": topic, "topic_role": "Cross-topic"})
    return placed


def print_pdf(html_path: Path) -> Path:
    edge = Path(r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe")
    pdf = html_path.with_suffix(".pdf")
    if not edge.exists():
        return pdf
    subprocess.run(
        [
            str(edge),
            "--headless",
            "--disable-gpu",
            "--no-first-run",
            "--disable-extensions",
            "--run-all-compositor-stages-before-draw",
            "--virtual-time-budget=20000",
            f"--print-to-pdf={pdf}",
            "--print-to-pdf-no-header",
            html_path.resolve().as_uri(),
        ],
        check=False,
    )
    return pdf


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    PAPER_OUT.mkdir(parents=True, exist_ok=True)
    write_css()
    items = load_items()
    if len(items) != 179:
        raise SystemExit(f"Expected 179 solved items, found {len(items)}")
    expertise = [item for item in items if int(item["q_no"]) >= 6]
    classified_placements = topic_placements(items)
    expertise_placements = topic_placements(expertise)
    outputs = [
        build_html("WMA11_Classified_Questions.html", "WMA11 Pure 1 Classified Questions", "179 unique questions grouped by primary topic, with cross-topic placements where a question also belongs in another chapter.", classified_placements, False),
        build_html("WMA11_Expertise_Questions.html", "WMA11 Pure 1 Expertise Questions", "Questions 6 and above, including cross-topic placements where useful.", expertise_placements, False),
        build_html("WMA11_Classified_With_Answers.html", "WMA11 Pure 1 Classified With Answers", "Each placement has the question followed by a worked-solution page with bordered steps.", classified_placements, True),
        build_html("WMA11_Expertise_With_Answers.html", "WMA11 Pure 1 Expertise With Answers", "Questions 6 and above with worked-solution pages and cross-topic placements.", expertise_placements, True),
        build_past_paper_solutions_html("WMA11_Past_Paper_Solutions.html", "WMA11 Pure 1 Past Paper Solutions", "The full WMA11 bank rebuilt in original paper order, with each question followed by its worked solution.", items),
    ]
    outputs.extend(build_single_paper_solution_html(paper, paper_items) for paper, paper_items in paper_groups(items))
    for path in outputs:
        print_pdf(path)
    for path in outputs:
        print(path)


if __name__ == "__main__":
    main()
