from __future__ import annotations

import html
import json
import re
import shutil
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
BANK_PATH = ROOT / "private_output" / "wma12_full_bank.json"
HTML_ROOT = ROOT / "private_output" / "wma12_books_html"
PAPER_HTML_ROOT = HTML_ROOT / "Papers"
OUT = ROOT / "downloads" / "IAL" / "WMA12"
PAPER_OUT = OUT / "Papers"

TOPICS = [
    "01_Proof",
    "02_Polynomials",
    "03_Circles",
    "04_BinomialExpansion",
    "05_ArithmeticSequences",
    "06_GeometricSequences",
    "07_SequencesSeries",
    "08_ModellingSequencesSeries",
    "09_LawsOfLogarithms",
    "10_TrigonometricEquations",
    "11_ApplicationsOfDifferentiation",
    "12_Integration",
]
SESSIONS = {"Jan": 1, "MayJune": 2, "MayJuneR": 3, "Oct": 4}
SESSION_NAMES = {"Jan": "January", "MayJune": "May/June", "MayJuneR": "May/June R", "Oct": "October"}


def file_url(path: Path) -> str:
    return path.resolve().as_uri()


def load_items() -> list[dict]:
    bank = json.loads(BANK_PATH.read_text(encoding="utf-8"))
    if len(bank.get("questions", [])) != 190:
        raise SystemExit(f"Expected 190 WMA12 questions, found {len(bank.get('questions', []))}")
    return list(bank["questions"])


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
    return f"WMA12_{int(item['year'])}_{item['session']}"


def escape_math(text: str) -> str:
    return html.escape(str(text), quote=False)


def steps_html(item: dict) -> str:
    parts = []
    for index, step in enumerate(item["steps"], 1):
        title = escape_math(step.get("title", f"Step {index}"))
        body = escape_math(step.get("body", ""))
        parts.append(
            f"""<section class="step">
  <div class="step-title">{index}. {title}</div>
  <div class="math">{body}</div>
</section>"""
        )
    return "\n".join(parts)


def final_answer_html(answer: str) -> str:
    answer = re.sub(r"\s+", " ", str(answer)).strip()
    answer = re.sub(r"(?<=\.)\s+(?=\$\([a-d]\))", '</div><div class="answer-line">', answer)
    answer = re.sub(r"\\q?quad\s+(\([b-d]\))", r'$</div><div class="answer-line">$\1', answer)
    return f'<div class="answer-lines"><div class="answer-line">{escape_math(answer)}</div></div>'


def question_page(item: dict, answer_mode: bool) -> str:
    crop = file_url(ROOT / item["image"])
    mode = "with-solution" if answer_mode else "question-only"
    display_topic = item.get("displayTopic", item["primaryTopic"])
    role = item.get("topicRole", "Primary")
    cross_note = ""
    if role == "Cross-topic":
        cross_note = (
            f'<span>Also in {html.escape(nice_topic(display_topic, item))}</span>'
            f'<span>Primary: {html.escape(item["primaryTopicName"])}</span>'
        )
    return f"""<article class="page question-page {mode}">
  <header class="q-head">
    <div>
      <div class="eyebrow">{html.escape(item["paper"])}</div>
      <h2>Question {int(item["qNo"])}</h2>
    </div>
    <div class="meta">
      <span>{int(item["marks"])} marks</span>
      <span>{html.escape(nice_topic(display_topic, item))}</span>
      {cross_note}
    </div>
  </header>
  <img class="question-img" src="{crop}" alt="{html.escape(item["id"])}">
</article>"""


def solution_page(item: dict) -> str:
    display_topic = item.get("displayTopic", item["primaryTopic"])
    role_note = "Topic group" if item.get("topicRole") != "Cross-topic" else f'Primary group: {item["primaryTopicName"]}'
    return f"""<article class="page solution-page">
  <header class="q-head solution-head">
    <div>
      <div class="eyebrow">{html.escape(item["paper"])}</div>
      <h2>Worked Solution - Question {int(item["qNo"])}</h2>
    </div>
    <div class="meta"><span>{html.escape(nice_topic(display_topic, item))}</span><span>{html.escape(role_note)}</span></div>
  </header>
  <div class="solution-box">
    {steps_html(item)}
    <div class="final"><strong>Final answer</strong><div class="math">{final_answer_html(item["finalAnswer"])}</div></div>
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
    <div><strong>WMA12</strong><span>Pure 2</span></div>
    <div><strong>{html.escape(badge)}</strong><span>standalone IAL route</span></div>
  </div>
  <div class="cover-seal">Dr Eslam Ahmed</div>
  <footer>Prepared for Dr Eslam Ahmed - eliteigcse.com</footer>
</section>"""


def topic_section(topic: str) -> str:
    return f"""<section class="topic-break page">
  <div class="cover-kicker">Topic</div>
  <h1>{html.escape(topic)}</h1>
</section>"""


def paper_section(paper: str, paper_items: list[dict]) -> str:
    total_marks = sum(int(item["marks"]) for item in paper_items)
    first = paper_items[0]
    session = SESSION_NAMES.get(first["session"], first["session"])
    return f"""<section class="paper-break page">
  <div class="cover-kicker">Past paper</div>
  <h1>{html.escape(paper)}</h1>
  <p>{html.escape(session)} {int(first["year"])} | {len(paper_items)} questions | {total_marks} marks</p>
  <div class="cover-grid paper-metrics">
    <div><strong>{len(paper_items)}</strong><span>questions</span></div>
    <div><strong>{total_marks}</strong><span>marks</span></div>
    <div><strong>Answers</strong><span>worked solution after each question</span></div>
  </div>
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
    html_path.write_text(html_doc(title, "wma12_books.css", chunks), encoding="utf-8")
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
    html_path.write_text(html_doc(title, "wma12_books.css", chunks), encoding="utf-8")
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
    html_path.write_text(html_doc(title, "../wma12_books.css", chunks), encoding="utf-8")
    return html_path, PAPER_OUT / f"{paper_slug(first)}_Solutions.pdf"


def write_css() -> None:
    css = r"""
:root { --ink:#161b2e; --ink-deep:#0e1220; --question:#31534e; --question-deep:#203d42; --answer:#b83f37; --gold:#b96d42; --gold-soft:#d6af72; --cream:#fbf7eb; --vellum:#e5dccb; --line:#d6cabb; --paper:#ffffff; --text:#1a1815; --muted:#5a5258; }
* { box-sizing:border-box; }
body { margin:0; color:var(--text); font-family:"Sora","Segoe UI",Arial,sans-serif; background:var(--vellum); }
.page { width:210mm; min-height:297mm; margin:0 auto; padding:14mm 14mm 16mm 20mm; background:var(--paper); border-left:7mm solid var(--question); page-break-after:always; position:relative; overflow:hidden; }
.page:after { content:""; position:absolute; left:7mm; top:0; bottom:0; width:1.2mm; background:var(--gold-soft); }
.solution-page,.answer-cover { border-left-color:var(--question-deep); }
.cover { display:flex; flex-direction:column; justify-content:center; align-items:flex-start; text-align:left; color:var(--text); background:linear-gradient(135deg,rgba(49,83,78,.14),transparent 42%),linear-gradient(180deg,var(--paper),#fff 44%,var(--paper)); }
.answer-cover { background:linear-gradient(135deg,rgba(32,61,66,.16),transparent 42%),linear-gradient(180deg,var(--paper),#fff 44%,var(--paper)); }
.cover:before { content:"P2"; position:absolute; right:7mm; bottom:5mm; color:rgba(22,27,46,.065); font-size:158pt; font-weight:800; }
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
.topic-break,.paper-break { display:flex; flex-direction:column; justify-content:center; background:linear-gradient(90deg,rgba(49,83,78,.10),transparent 45%),var(--paper); }
.paper-break { background:linear-gradient(90deg,rgba(49,83,78,.09),transparent 45%),var(--paper); }
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
.math { line-height:1.65; font-size:12pt; overflow-wrap:anywhere; }
.final { margin:5mm 6mm; padding:4mm 5mm; border-left:4mm solid var(--answer); background:#fff8e8; border-radius:2mm; line-height:1.6; break-inside:avoid; }
.answer-line { margin-top:1.5mm; max-width:100%; }
.answer-line:first-child { margin-top:0; }
.final mjx-container[jax="SVG"] > svg { max-width:100%; height:auto; }
@page { size:A4; margin:0; }
@media screen { body { background:#d8d2c2; } .page { box-shadow:0 12px 40px rgba(21,26,45,.16); margin:10mm auto; } }
"""
    HTML_ROOT.mkdir(parents=True, exist_ok=True)
    PAPER_HTML_ROOT.mkdir(parents=True, exist_ok=True)
    (HTML_ROOT / "wma12_books.css").write_text(css, encoding="utf-8")


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
    edge = Path(r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe")
    if not edge.exists():
        raise SystemExit("Microsoft Edge is required to print WMA12 PDFs on this machine.")
    if pdf_path.exists():
        pdf_path.unlink()
    subprocess.run(
        [
            str(edge),
            "--headless",
            "--disable-gpu",
            "--no-first-run",
            "--disable-extensions",
            "--run-all-compositor-stages-before-draw",
            "--virtual-time-budget=25000",
            f"--print-to-pdf={pdf_path}",
            "--print-to-pdf-no-header",
            html_path.resolve().as_uri(),
        ],
        check=False,
    )
    if not pdf_path.exists() or pdf_path.stat().st_size < 10000:
        raise SystemExit(f"Could not build PDF: {pdf_path}")


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    PAPER_OUT.mkdir(parents=True, exist_ok=True)
    if HTML_ROOT.exists():
        shutil.rmtree(HTML_ROOT)
    write_css()

    items = load_items()
    expertise = [item for item in items if int(item["qNo"]) >= 6]
    classified_placements = topic_placements(items)
    expertise_placements = topic_placements(expertise)

    outputs = [
        build_topic_html(
            "WMA12_Classified_Questions.html",
            "WMA12 Pure 2 Classified Questions",
            "190 unique questions grouped by primary topic, with cross-topic placements where a question also belongs in another chapter.",
            classified_placements,
            False,
        ),
        build_topic_html(
            "WMA12_Expertise_Questions.html",
            "WMA12 Pure 2 Expertise Questions",
            "Questions 6 and above, grouped by topic with cross-topic placements where useful.",
            expertise_placements,
            False,
        ),
        build_topic_html(
            "WMA12_Classified_With_Answers.html",
            "WMA12 Pure 2 Classified With Answers",
            "Each placement has the question followed by a worked-solution page in Dr Eslam Ahmed's solution style.",
            classified_placements,
            True,
        ),
        build_topic_html(
            "WMA12_Expertise_With_Answers.html",
            "WMA12 Pure 2 Expertise With Answers",
            "Questions 6 and above with worked-solution pages and cross-topic placements.",
            expertise_placements,
            True,
        ),
        build_all_papers_html(
            "WMA12_Past_Paper_Solutions.html",
            "WMA12 Pure 2 Past Paper Solutions",
            "The full WMA12 bank rebuilt in original paper order, with each question followed by its worked solution.",
            items,
        ),
    ]
    outputs.extend(build_single_paper_html(paper, paper_items) for paper, paper_items in paper_groups(items))

    for html_path, pdf_path in outputs:
        print_pdf(html_path, pdf_path)
        print(pdf_path)


if __name__ == "__main__":
    main()
