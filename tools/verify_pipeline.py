"""
Verify the Elite IGCSE paper pipeline.

This is the pre-commit gate for new papers, classifications,
solutions, public classified books, and private answer-book safety.
"""

from __future__ import annotations

import json
import re
import subprocess
import sys
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "src" / "data"
QUESTION_DIR = DATA_DIR / "questions"
SOLUTION_DIR = DATA_DIR / "solutions"
TOPICS_PATH = DATA_DIR / "topics.json"
PAPERS_PATH = DATA_DIR / "papers.json"
ASSET_ROOT = ROOT
DOWNLOADS_DIR = ROOT / "downloads"
PRIVATE_OUTPUT = ROOT / "private_output"
GITIGNORE = ROOT / ".gitignore"
WMA11_DATA_PATH = ROOT / "ial" / "wma11" / "wma11-data.js"

LINEAR_UNITS = {
    "Numbers & the Number System",
    "Equations, Formulae & Identities",
    "Sequences, Functions & Graphs",
    "Geometry & Trigonometry",
    "Vectors & Transformation Geometry",
    "Statistics & Probability",
}

CANONICAL_TOPICS = {
    "Number Toolkit",
    "Prime Factors, HCF & LCM",
    "Fractions",
    "Fractions, Decimals & Percentages",
    "Recurring Decimals",
    "Percentages",
    "Compound Interest & Depreciation",
    "Reverse Percentages",
    "Rounding, Estimation & Bounds",
    "Powers & Roots",
    "Standard Form",
    "Surds",
    "Using a Calculator",
    "Ratio Toolkit",
    "Standard & Compound Units",
    "Algebra Toolkit",
    "Expanding Brackets",
    "Factorising",
    "Algebraic Fractions",
    "Algebraic Roots & Indices",
    "Linear Equations",
    "Forming & Solving Equations",
    "Rearranging Formulae",
    "Simultaneous Equations",
    "Inequalities (Solving & Graphing)",
    "Completing the Square",
    "Quadratic Formula",
    "Quadratic Equations",
    "Algebraic Proof",
    "Sequences",
    "Direct & Inverse Proportion",
    "Linear Graphs",
    "Graphs of Functions",
    "Functions",
    "Differentiation & Turning Points",
    "Transformations of Graphs",
    "Kinematic Graphs",
    "Angles in Polygons & Parallel Lines",
    "Constructions & Loci",
    "Perimeter & Area",
    "Circles, Arcs & Sectors",
    "Volume & Surface Area",
    "Right-Angled Triangles - Pythagoras & Trigonometry",
    "3D Pythagoras & Trigonometry",
    "Sine & Cosine Rules",
    "Congruent Shapes",
    "Similar Shapes",
    "Area & Volume of Similar Shapes",
    "Circle Theorems",
    "Bearings",
    "Transformations",
    "Vectors",
    "Statistics Toolkit",
    "Averages from Frequency Tables",
    "Histograms",
    "Cumulative Frequency Diagrams",
    "Probability Toolkit",
    "Tree Diagrams & Conditional Probability",
    "Set Notation & Venn Diagrams",
}

REQUIRED_QUESTION_FIELDS = {
    "id",
    "bank",
    "q",
    "marks",
    "topic",
    "unit",
    "image",
    "filename",
    "text",
}

PUBLIC_LEAK_RE = re.compile(
    r"(answer|answers|mark[-_\s]?scheme|markscheme|worked[-_\s]?solution|solutions|private)",
    re.IGNORECASE,
)

REQUIRED_PUBLIC_BOOKS = {
    "classified_problems.pdf",
    "Classified_Expertise.pdf",
    "Classified_4WM1.pdf",
    "Classified_4WM2.pdf",
    "Classified_4WM1_Expertise.pdf",
    "Classified_4WM2_Expertise.pdf",
}

ALLOWED_PUBLIC_SOLUTION_DIRS = {
    "downloads/ClassifiedSolutions",
    "downloads/PastPaperSolutions",
    "downloads/IAL/WMA11/Papers",
}

ALLOWED_PUBLIC_SOLUTION_FILES = {
    "downloads/IAL/WMA11/WMA11_Classified_With_Answers.pdf",
    "downloads/IAL/WMA11/WMA11_Expertise_With_Answers.pdf",
    "downloads/IAL/WMA11/WMA11_Past_Paper_Solutions.pdf",
}


class Report:
    def __init__(self) -> None:
        self.errors: list[str] = []
        self.warnings: list[str] = []
        self.stats: dict[str, int] = {}

    def error(self, message: str) -> None:
        self.errors.append(message)

    def warn(self, message: str) -> None:
        self.warnings.append(message)

    def set(self, key: str, value: int) -> None:
        self.stats[key] = value


def read_json(path: Path, report: Report) -> Any | None:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:  # noqa: BLE001 - verifier should report all parse failures
        report.error(f"{path.relative_to(ROOT)} is not valid JSON: {exc}")
        return None


def rel(path: Path) -> str:
    try:
        return str(path.relative_to(ROOT)).replace("\\", "/")
    except ValueError:
        return str(path)


def is_allowed_public_solution_file(path: Path) -> bool:
    path_rel = rel(path)
    return (
        path_rel in ALLOWED_PUBLIC_SOLUTION_FILES
        or any(path_rel.startswith(f"{allowed}/") for allowed in ALLOWED_PUBLIC_SOLUTION_DIRS)
    )


def verify_guardrails(report: Report) -> None:
    if not PRIVATE_OUTPUT.exists():
        report.error("private_output/ is missing; private answer books need a safe home.")

    ignore_text = GITIGNORE.read_text(encoding="utf-8") if GITIGNORE.exists() else ""
    if "private_output/*" not in ignore_text:
        report.error(".gitignore must keep generated private answer books out of git.")

    if DOWNLOADS_DIR.exists():
        for file in DOWNLOADS_DIR.rglob("*"):
            if (
                file.is_file()
                and PUBLIC_LEAK_RE.search(file.name)
                and not is_allowed_public_solution_file(file)
            ):
                report.error(f"Potential private answer/solution file in public downloads: {rel(file)}")
        for filename in sorted(REQUIRED_PUBLIC_BOOKS):
            if not (DOWNLOADS_DIR / filename).is_file():
                report.error(f"Required public classified book is missing: downloads/{filename}")
    else:
        report.error("downloads/ is missing; public classified books need a deploy folder.")


def verify_runtime_js(report: Report) -> None:
    for filename in ("questions-data.js", "solutions-data.js"):
        path = ROOT / filename
        if not path.exists():
            report.error(f"{filename} is missing; rebuild the runtime data before publishing.")
            continue
        try:
            subprocess.run(
                ["node", "--check", str(path)],
                check=True,
                capture_output=True,
                text=True,
            )
        except FileNotFoundError:
            report.warn("Node.js is unavailable; skipped runtime JS syntax checks.")
            return
        except subprocess.CalledProcessError as exc:
            detail = (exc.stderr or exc.stdout or "").strip().splitlines()
            summary = detail[0] if detail else "syntax check failed"
            report.error(f"{filename} is not valid JavaScript: {summary}")


def verify_pathway_palette_activation(report: Report) -> None:
    """Guard the early pathway palette activation hook used by all public pages."""
    js_files = ("pathway-bootstrap.js", "lead.js", "pathway-mode.js", "service-worker.js")
    for filename in js_files:
        path = ROOT / filename
        if not path.exists():
            report.error(f"{filename} is missing; pathway palette activation cannot run.")
            continue
        try:
            subprocess.run(
                ["node", "--check", str(path)],
                check=True,
                capture_output=True,
                text=True,
            )
        except FileNotFoundError:
            report.warn("Node.js is unavailable; skipped pathway activation JS syntax checks.")
            break
        except subprocess.CalledProcessError as exc:
            detail = (exc.stderr or exc.stdout or "").strip().splitlines()
            summary = detail[0] if detail else "syntax check failed"
            report.error(f"{filename} is not valid JavaScript: {summary}")

    bootstrap_text = (ROOT / "pathway-bootstrap.js").read_text(encoding="utf-8")
    if "ELITE_PATHWAY_BOOTSTRAP" not in bootstrap_text or "dataset.pathway" not in bootstrap_text:
        report.error("pathway-bootstrap.js must set ELITE_PATHWAY_BOOTSTRAP and data-pathway.")

    lead_text = (ROOT / "lead.js").read_text(encoding="utf-8")
    if "applyPathwayContext" not in lead_text or "ELITE_PATHWAY_BOOTSTRAP" not in lead_text:
        report.error("lead.js must re-apply the bootstrap pathway context to body/html.")

    css_text = (ROOT / "styles.css").read_text(encoding="utf-8")
    for pathway in ("linear", "modular", "pure"):
        if f'html[data-pathway="{pathway}"]' not in css_text or f'body[data-pathway="{pathway}"]' not in css_text:
            report.error(f"styles.css must expose palette variables for html/body data-pathway={pathway}.")

    required_pages = [
        "index.html",
        "practice.html",
        "exam.html",
        "progress.html",
        "downloads.html",
        "pastpapers.html",
        "topics.html",
        "checkup.html",
        "about.html",
        "admin.html",
        "ial/wma11/index.html",
    ]
    for page in required_pages:
        path = ROOT / page
        text = path.read_text(encoding="utf-8")
        bootstrap_pos = text.find("pathway-bootstrap.js")
        styles_pos = text.find("styles.css")
        if bootstrap_pos == -1:
            report.error(f"{page} must load pathway-bootstrap.js before site CSS.")
        elif styles_pos != -1 and bootstrap_pos > styles_pos:
            report.error(f"{page} loads pathway-bootstrap.js after styles.css; palette may flash incorrectly.")
        if "lead.js?v=" in text and "lead.js?v=20260527e" not in text:
            report.error(f"{page} must reference the current lead.js cache-buster.")


def verify_questions(report: Report) -> tuple[dict[str, dict[str, Any]], set[str], set[str]]:
    topics_doc = read_json(TOPICS_PATH, report) or {}
    known_topics = set(topics_doc.get("topics") or []) | CANONICAL_TOPICS
    question_by_id: dict[str, dict[str, Any]] = {}
    paper_slugs: set[str] = set()
    used_topics: set[str] = set()

    files = sorted(QUESTION_DIR.glob("*.json"))
    report.set("question_files", len(files))

    for path in files:
      data = read_json(path, report)
      if not data:
          continue

      slug = data.get("paperSlug")
      paper_slugs.add(slug or path.stem)
      questions = data.get("questions")
      if not isinstance(questions, list):
          report.error(f"{rel(path)} has no questions array.")
          continue
      if data.get("questionCount") != len(questions):
          report.error(f"{rel(path)} questionCount is {data.get('questionCount')} but found {len(questions)} questions.")
      if slug and path.stem != slug:
          report.error(f"{rel(path)} filename does not match paperSlug {slug}.")

      seen_q_numbers: set[tuple[str, int]] = set()
      for index, question in enumerate(questions, start=1):
          if not isinstance(question, dict):
              report.error(f"{rel(path)} question #{index} is not an object.")
              continue
          missing = sorted(REQUIRED_QUESTION_FIELDS - set(question))
          if missing:
              report.error(f"{rel(path)} Q{question.get('q', index)} missing fields: {', '.join(missing)}")

          qid = question.get("id")
          if not qid:
              report.error(f"{rel(path)} Q{question.get('q', index)} has no id.")
          elif qid in question_by_id:
              report.error(f"Duplicate question id: {qid}")
          else:
              question_by_id[qid] = question

          q_number = question.get("q")
          bank = question.get("bank")
          if bank not in {"all", "expertise"}:
              report.error(f"{rel(path)} Q{q_number} has unexpected bank: {bank}")
          elif isinstance(q_number, int):
              q_key = (bank, q_number)
              if q_key in seen_q_numbers:
                  report.error(f"{rel(path)} repeats {bank} question number {q_number}.")
              seen_q_numbers.add(q_key)

          topic = question.get("topic")
          if topic:
              used_topics.add(str(topic))
              if known_topics and topic not in known_topics:
                  report.warn(f"{rel(path)} Q{q_number} uses topic outside topics.json: {topic}")

          unit = question.get("unit")
          if unit not in LINEAR_UNITS:
              report.error(f"{rel(path)} Q{q_number} has unexpected Linear unit: {unit}")

          image = str(question.get("image") or "")
          image_path = ASSET_ROOT / image.removeprefix("/")
          if not image.startswith("/assets/questions/"):
              report.error(f"{rel(path)} Q{q_number} image must be under /assets/questions/: {image}")
          elif not image_path.exists():
              report.error(f"{rel(path)} Q{q_number} image is missing: {image}")

          if not str(question.get("text") or "").strip():
              report.warn(f"{rel(path)} Q{q_number} has empty searchable text.")

    report.set("questions", len(question_by_id))
    report.set("topics_used", len(used_topics))
    return question_by_id, paper_slugs, used_topics


def verify_catalogue(report: Report, paper_slugs: set[str]) -> None:
    data = read_json(PAPERS_PATH, report)
    if not isinstance(data, list):
        report.error("src/data/papers.json must be a list.")
        return

    catalogue_slugs = {item.get("paperSlug") for item in data if isinstance(item, dict)}
    missing = sorted(paper_slugs - catalogue_slugs)
    extra = sorted(catalogue_slugs - paper_slugs)
    if missing:
        report.error(f"papers.json missing paperSlugs: {', '.join(missing[:10])}")
    if extra:
        report.error(f"papers.json has paperSlugs without question files: {', '.join(extra[:10])}")
    report.set("catalogue_papers", len(catalogue_slugs))


def verify_solutions(report: Report, question_by_id: dict[str, dict[str, Any]]) -> None:
    files = sorted(SOLUTION_DIR.glob("*.json"))
    solution_count = 0
    checked_count = 0
    structured_count = 0
    private_text_pattern = re.compile(
        r"(topic\s*check|topic-checked|mark[-\s]?scheme\s+review|checking\s+the\s+answer|answer\s+checked)",
        re.IGNORECASE,
    )

    for path in files:
        data = read_json(path, report)
        if not data:
            continue
        if path.stem != data.get("paperSlug"):
            report.error(f"{rel(path)} filename does not match paperSlug {data.get('paperSlug')}.")
        solutions = data.get("solutions")
        if not isinstance(solutions, dict):
            report.error(f"{rel(path)} has no solutions object.")
            continue
        for qid, solution in solutions.items():
            solution_count += 1
            if qid not in question_by_id:
                report.error(f"{rel(path)} has solution for unknown question id: {qid}")
                continue
            if not isinstance(solution, dict):
                report.error(f"{rel(path)} solution for {qid} is not an object.")
                continue
            if "source" in solution:
                report.error(f"{rel(path)} solution for {qid} still uses legacy source markdown.")
            steps = solution.get("steps")
            if not isinstance(steps, list) or not steps:
                report.error(f"{rel(path)} solution for {qid} has no structured steps.")
            else:
                structured_count += 1
                for index, step in enumerate(steps, start=1):
                    if not isinstance(step, dict):
                        report.error(f"{rel(path)} solution for {qid} step {index} is not an object.")
                        continue
                    if not str(step.get("title") or "").strip():
                        report.error(f"{rel(path)} solution for {qid} step {index} has empty title.")
                    if not str(step.get("body") or "").strip():
                        report.error(f"{rel(path)} solution for {qid} step {index} has empty body.")
            final_answer = str(solution.get("finalAnswer") or "").strip()
            if not final_answer:
                report.error(f"{rel(path)} solution for {qid} has empty finalAnswer.")
            public_text = "\n".join(
                [
                    *(str(step.get("title", "")) + "\n" + str(step.get("body", "")) for step in steps or [] if isinstance(step, dict)),
                    final_answer,
                ]
            )
            if private_text_pattern.search(public_text):
                report.error(f"{rel(path)} solution for {qid} exposes private checking text in public fields.")
            status = str(solution.get("status") or "").strip()
            checked_by = str(solution.get("checkedBy") or "").strip()
            if not status:
                report.error(f"{rel(path)} solution for {qid} is missing status metadata.")
            if not checked_by:
                report.error(f"{rel(path)} solution for {qid} is missing checkedBy metadata.")
            if status == "checked":
                checked_count += 1

    missing_solution_count = max(0, len(question_by_id) - solution_count)
    if missing_solution_count:
        report.warn(f"{missing_solution_count} questions do not yet have website solutions.")
    report.set("solutions", solution_count)
    report.set("structured_solutions", structured_count)
    report.set("checked_solutions", checked_count)


def extract_js_assignment_array(text: str, name: str) -> list[Any] | None:
    match = re.search(rf"window\.{re.escape(name)}\s*=\s*(\[.*?\]);", text, re.DOTALL)
    if not match:
        return None
    return json.loads(match.group(1))


def verify_wma11_solutions(report: Report) -> None:
    if not WMA11_DATA_PATH.exists():
        report.error("ial/wma11/wma11-data.js is missing.")
        return
    try:
        text = WMA11_DATA_PATH.read_text(encoding="utf-8")
        questions = extract_js_assignment_array(text, "WMA11_QUESTIONS")
    except Exception as exc:  # noqa: BLE001 - verifier should show exact data failure
        report.error(f"ial/wma11/wma11-data.js could not be parsed: {exc}")
        return

    if not isinstance(questions, list):
        report.error("ial/wma11/wma11-data.js has no WMA11_QUESTIONS array.")
        return

    private_text_pattern = re.compile(
        r"(topic\s*check|topic-checked|mark[-\s]?scheme\s+review|checking\s+the\s+answer|answer\s+checked)",
        re.IGNORECASE,
    )
    structured_count = 0
    checked_count = 0
    for index, item in enumerate(questions, start=1):
        if not isinstance(item, dict):
            report.error(f"wma11-data.js question #{index} is not an object.")
            continue
        qid = str(item.get("id") or f"#{index}")
        steps = item.get("steps")
        if not isinstance(steps, list) or not steps:
            report.error(f"wma11-data.js solution for {qid} has no structured steps.")
        else:
            structured_count += 1
            for step_index, step in enumerate(steps, start=1):
                if not isinstance(step, dict):
                    report.error(f"wma11-data.js solution for {qid} step {step_index} is not an object.")
                    continue
                if not str(step.get("title") or "").strip():
                    report.error(f"wma11-data.js solution for {qid} step {step_index} has empty title.")
                if not str(step.get("body") or "").strip():
                    report.error(f"wma11-data.js solution for {qid} step {step_index} has empty body.")
        final_answer = str(item.get("finalAnswer") or "").strip()
        if not final_answer:
            report.error(f"wma11-data.js solution for {qid} has empty finalAnswer.")
        status = str(item.get("status") or "").strip()
        checked_by = str(item.get("checkedBy") or "").strip()
        if not status:
            report.error(f"wma11-data.js solution for {qid} is missing status metadata.")
        if not checked_by:
            report.error(f"wma11-data.js solution for {qid} is missing checkedBy metadata.")
        if status == "checked":
            checked_count += 1
        public_text = "\n".join(
            [
                *(str(step.get("title", "")) + "\n" + str(step.get("body", "")) for step in steps or [] if isinstance(step, dict)),
                final_answer,
            ]
        )
        if private_text_pattern.search(public_text):
            report.error(f"wma11-data.js solution for {qid} exposes private checking text in public fields.")

    report.set("wma11_solutions", len(questions))
    report.set("wma11_structured_solutions", structured_count)
    report.set("wma11_checked_solutions", checked_count)


def print_report(report: Report) -> int:
    print("Elite IGCSE pipeline verification")
    print("--------------------------------")
    for key, value in report.stats.items():
        print(f"{key}: {value}")

    if report.warnings:
        print()
        print("Warnings:")
        for warning in report.warnings[:30]:
            print(f"  - {warning}")
        if len(report.warnings) > 30:
            print(f"  - ... {len(report.warnings) - 30} more warnings")

    if report.errors:
        print()
        print("Errors:")
        for error in report.errors:
            print(f"  - {error}")
        return 1

    print()
    print("OK: pipeline guardrails passed.")
    return 0


def main() -> int:
    report = Report()
    verify_guardrails(report)
    verify_runtime_js(report)
    verify_pathway_palette_activation(report)
    question_by_id, paper_slugs, _used_topics = verify_questions(report)
    verify_catalogue(report, paper_slugs)
    verify_solutions(report, question_by_id)
    verify_wma11_solutions(report)
    return print_report(report)


if __name__ == "__main__":
    sys.exit(main())
