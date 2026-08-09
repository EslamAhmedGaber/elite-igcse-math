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
CURRENT_PATHWAY_BOOTSTRAP_VERSION = "20260613a"
CURRENT_LEAD_VERSION = "20260809b"
CURRENT_STYLE_VERSION = "20260809a"
CURRENT_COURSE_MODULES_VERSION = "20260713a"
CURRENT_STUDY_VERSION = "20260713b"
CURRENT_SOLUTION_VERSION = "20260714a"
CURRENT_ELITE_SYSTEM_VERSION = "20260809c"
CURRENT_RESOURCE_HUB_VERSION = "20260809b"
CURRENT_PRINT_VERSION = "20260809c"
IAL_DATA_FILES = {
    "wma11": (ROOT / "ial" / "wma11" / "wma11-data.js", "WMA11_QUESTIONS"),
    "wma12": (ROOT / "ial" / "wma12" / "wma12-data.js", "WMA12_QUESTIONS"),
    "wme01": (ROOT / "ial" / "wme01" / "wme01-data.js", "WME01_QUESTIONS"),
}

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
    "downloads/IAL/WMA12/Papers",
    "downloads/IAL/WME01/Papers",
}

ALLOWED_PUBLIC_SOLUTION_FILES = {
    "downloads/IAL/WMA11/WMA11_Classified_With_Answers.pdf",
    "downloads/IAL/WMA11/WMA11_Expertise_With_Answers.pdf",
    "downloads/IAL/WMA11/WMA11_Past_Paper_Solutions.pdf",
    "downloads/IAL/WMA12/WMA12_Classified_With_Answers.pdf",
    "downloads/IAL/WMA12/WMA12_Expertise_With_Answers.pdf",
    "downloads/IAL/WMA12/WMA12_Past_Paper_Solutions.pdf",
    "downloads/IAL/WME01/WME01_Classified_With_Answers.pdf",
    "downloads/IAL/WME01/WME01_Expertise_With_Answers.pdf",
    "downloads/IAL/WME01/WME01_Past_Paper_Solutions.pdf",
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


def verify_revision_engine(report: Report) -> None:
    """Guard the shared flexible-count revision-book engine used by all pathways."""
    path = ROOT / "revision-engine.js"
    if not path.exists():
        report.error("revision-engine.js is missing; revision books cannot be generated.")
        return
    exam_text = (ROOT / "exam.html").read_text(encoding="utf-8")
    engine_pos = exam_text.find("revision-engine.js")
    exam_pos = exam_text.find("exam.js")
    if engine_pos == -1:
        report.error("exam.html must load revision-engine.js before exam.js.")
    elif exam_pos != -1 and engine_pos > exam_pos:
        report.error("exam.html loads revision-engine.js after exam.js; revision books will not initialise.")
    try:
        subprocess.run(
            ["node", "--check", str(path)],
            check=True,
            capture_output=True,
            text=True,
        )
        subprocess.run(
            ["node", str(ROOT / "tools" / "test_revision_engine.js")],
            check=True,
            capture_output=True,
            text=True,
        )
    except FileNotFoundError:
        report.warn("Node.js is unavailable; skipped revision engine checks.")
    except subprocess.CalledProcessError as exc:
        detail = (exc.stderr or exc.stdout or "").strip().splitlines()
        summary = detail[0] if detail else "revision engine check failed"
        report.error(f"revision-engine.js failed verification: {summary}")


def verify_worked_solution_view(report: Report) -> None:
    """Guard the shared safe solution renderer used by practice, IAL, and print flows."""
    renderer = ROOT / "worked-solution.js"
    renderer_test = ROOT / "tools" / "test_worked_solution.js"
    if not renderer.exists():
        report.error("worked-solution.js is missing; course solutions will diverge again.")
        return
    if not renderer_test.exists():
        report.error("The shared worked-solution release test is missing.")
        return
    try:
        subprocess.run(
            ["node", "--check", str(renderer)],
            check=True,
            capture_output=True,
            text=True,
        )
        subprocess.run(
            ["node", str(renderer_test)],
            check=True,
            capture_output=True,
            text=True,
        )
    except FileNotFoundError:
        report.warn("Node.js is unavailable; skipped shared worked-solution checks.")
    except subprocess.CalledProcessError as exc:
        detail = (exc.stderr or exc.stdout or "").strip().splitlines()
        summary = detail[0] if detail else "worked-solution check failed"
        report.error(f"worked-solution.js failed verification: {summary}")

    page_scripts = {
        "practice.html": "app.js",
        "exam.html": "exam.js",
        "ial/wma11/index.html": "ial/wma11/wma11.js",
        "ial/wma12/index.html": "ial/wma12/wma12.js",
        "ial/wme01/index.html": "ial/wme01/wme01.js",
    }
    for page, consumer in page_scripts.items():
        text = (ROOT / page).read_text(encoding="utf-8")
        renderer_ref = f"worked-solution.js?v={CURRENT_SOLUTION_VERSION}"
        renderer_pos = text.find(renderer_ref)
        consumer_pos = text.find(consumer)
        if renderer_pos == -1:
            report.error(f"{page} must load the current shared worked-solution renderer.")
        elif consumer_pos != -1 and renderer_pos > consumer_pos:
            report.error(f"{page} loads worked-solution.js after {consumer}.")

    css_text = (ROOT / "styles.css").read_text(encoding="utf-8")
    for selector in (".worked-solution-step", ".worked-solution-final", ".worked-solution-equation"):
        if selector not in css_text:
            report.error(f"Shared solution styling is missing {selector}.")
    report.set("shared_solution_pages", len(page_scripts))


def verify_pathway_palette_activation(report: Report) -> None:
    """Guard the early pathway palette activation hook used by all public pages."""
    js_files = (
        "pathway-bootstrap.js",
        "lead.js",
        "pathway-mode.js",
        "course-modules.js",
        "study-search-data.js",
        "study-compass.js",
        "worked-solution.js",
        "service-worker.js",
    )
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


def verify_resource_command_center(report: Report) -> None:
    """Guard the shared resource discovery, visual system, and A4 print contracts."""
    required_assets = [
        "elite-system.css",
        "resource-hub.css",
        "app.js",
        "course-renderers.js",
        "print-utils.js",
        "exam.js",
        "tools/test_resource_command_center.js",
    ]
    for relative_path in required_assets:
        if not (ROOT / relative_path).is_file():
            report.error(f"Missing Elite resource-system asset: {relative_path}")

    system_pages = [
        "404.html",
        "about.html",
        "admin.html",
        "checkup.html",
        "downloads.html",
        "exam.html",
        "index.html",
        "notes.html",
        "offline.html",
        "pastpapers.html",
        "planner.html",
        "practice.html",
        "progress.html",
        "topics.html",
        "ial/index.html",
        "ial/wma11/index.html",
        "ial/wma12/index.html",
        "ial/wme01/index.html",
    ]
    system_ref = f"elite-system.css?v={CURRENT_ELITE_SYSTEM_VERSION}"
    for page in system_pages:
        path = ROOT / page
        if not path.is_file():
            report.error(f"Missing primary Elite page: {page}")
            continue
        if system_ref not in path.read_text(encoding="utf-8"):
            report.error(f"{page} must load the current Elite System stylesheet.")

    for page in ("practice.html", "downloads.html", "pastpapers.html"):
        text = (ROOT / page).read_text(encoding="utf-8")
        if f"resource-hub.css?v={CURRENT_RESOURCE_HUB_VERSION}" not in text:
            report.error(f"{page} must load the current resource command stylesheet.")

    for page in ("practice.html", "exam.html", "progress.html"):
        text = (ROOT / page).read_text(encoding="utf-8")
        if f"print-utils.js?v={CURRENT_PRINT_VERSION}" not in text:
            report.error(f"{page} must load the current A4 print engine.")

    report.set("elite_system_pages", len(system_pages))
    resource_test = ROOT / "tools" / "test_resource_command_center.js"
    if not resource_test.exists():
        return
    try:
        subprocess.run(
            ["node", str(resource_test)],
            check=True,
            capture_output=True,
            text=True,
        )
    except FileNotFoundError:
        report.warn("Node.js is unavailable; skipped Elite resource-system checks.")
    except subprocess.CalledProcessError as exc:
        detail = (exc.stderr or exc.stdout or "").strip().splitlines()
        summary = detail[0] if detail else "resource-system check failed"
        report.error(f"Elite resource command center failed verification: {summary}")

    lead_text = (ROOT / "lead.js").read_text(encoding="utf-8")
    required_core_tools = (
        '"classified"',
        '"books"',
        '"past-solutions"',
        '"notes"',
        '"build-test"',
    )
    if "CORE_TOOL_ORDER" not in lead_text:
        report.error("lead.js must define the ordered five-resource study workspace.")
    for tool_key in required_core_tools:
        if tool_key not in lead_text:
            report.error(f"lead.js core study workspace is missing {tool_key}.")
    for initializer in ("initHomeCoreWorkspace", "initCoreMobileNav"):
        if initializer not in lead_text:
            report.error(f"lead.js must initialize {initializer}.")

    home_text = (ROOT / "index.html").read_text(encoding="utf-8")
    required_home_courses = (
        "linear",
        "modular-unit-1",
        "modular-unit-2",
        "pure",
        "pure2",
        "mechanics1",
    )
    for course_id in required_home_courses:
        if f'data-home-course="{course_id}"' not in home_text:
            report.error(f"Homepage core workspace is missing course selector {course_id}.")

    css_text = (ROOT / "styles.css").read_text(encoding="utf-8")
    for selector in (".home-command", ".is-core-workspace", ".pathway-more-tools"):
        if selector not in css_text:
            report.error(f"Core study workspace styling is missing {selector}.")

    report.set("core_workspace_courses", len(required_home_courses))
    report.set("core_workspace_tools", len(required_core_tools))


def verify_mechanics_lab(report: Report) -> None:
    """Guard the experiment-first WME01 visual laboratory and its full case catalogue."""
    lab_js = ROOT / "ial" / "wme01" / "lab" / "assets" / "mechanics-lab.js"
    lab_test = ROOT / "tools" / "test_mechanics_lab.js"
    if not lab_js.exists():
        report.error("WME01 Mechanics laboratory JavaScript is missing.")
        return
    if not lab_test.exists():
        report.error("Mechanics laboratory release test is missing.")
        return
    try:
        subprocess.run(
            ["node", "--check", str(lab_js)],
            check=True,
            capture_output=True,
            text=True,
        )
        subprocess.run(
            ["node", str(lab_test)],
            check=True,
            capture_output=True,
            text=True,
        )
        report.set("wme01_lab_topics", 10)
        report.set("wme01_lab_cases", 98)
    except FileNotFoundError:
        report.warn("Node.js is unavailable; skipped Mechanics laboratory checks.")
    except subprocess.CalledProcessError as exc:
        detail = (exc.stderr or exc.stdout or "").strip().splitlines()
        summary = detail[0] if detail else "Mechanics laboratory check failed"
        report.error(f"WME01 Mechanics laboratory failed verification: {summary}")

    study_test = ROOT / "tools" / "test_study_search_index.js"
    if study_test.exists():
        try:
            subprocess.run(
                ["node", str(study_test)],
                check=True,
                capture_output=True,
                text=True,
            )
        except FileNotFoundError:
            report.warn("Node.js is unavailable; skipped study search checks.")
        except subprocess.CalledProcessError as exc:
            detail = (exc.stderr or exc.stdout or "").strip().splitlines()
            summary = detail[0] if detail else "study search check failed"
            report.error(f"study search index failed verification: {summary}")

    bootstrap_text = (ROOT / "pathway-bootstrap.js").read_text(encoding="utf-8")
    if "ELITE_PATHWAY_BOOTSTRAP" not in bootstrap_text or "dataset.pathway" not in bootstrap_text:
        report.error("pathway-bootstrap.js must set ELITE_PATHWAY_BOOTSTRAP and data-pathway.")
    if 'pathname.endsWith("/ial/index.html")' not in bootstrap_text:
        report.error("pathway-bootstrap.js must resolve the /ial/ hub as the IAL/Pure pathway before CSS loads.")

    lead_text = (ROOT / "lead.js").read_text(encoding="utf-8")
    if "applyPathwayContext" not in lead_text or "ELITE_PATHWAY_BOOTSTRAP" not in lead_text:
        report.error("lead.js must re-apply the bootstrap pathway context to body/html.")
    if f"study-search-data.js?v={CURRENT_STUDY_VERSION}" not in lead_text:
        report.error("lead.js must load the current generated study search index.")
    if f"study-compass.js?v={CURRENT_STUDY_VERSION}" not in lead_text:
        report.error("lead.js must load the current study navigator.")

    for shared_file in ("study-search-data.js", "study-compass.js"):
        if not (ROOT / shared_file).exists():
            report.error(f"Missing shared Visual Learning OS asset: {shared_file}")

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
        "ial/index.html",
        "ial/wma11/index.html",
        "ial/wma12/index.html",
        "ial/wme01/index.html",
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
        if "pathway-bootstrap.js?v=" in text and f"pathway-bootstrap.js?v={CURRENT_PATHWAY_BOOTSTRAP_VERSION}" not in text:
            report.error(f"{page} must reference the current pathway-bootstrap.js cache-buster.")
        if "lead.js?v=" in text and f"lead.js?v={CURRENT_LEAD_VERSION}" not in text:
            report.error(f"{page} must reference the current lead.js cache-buster.")
        if "styles.css?v=" in text and f"styles.css?v={CURRENT_STYLE_VERSION}" not in text:
            report.error(f"{page} must reference the current styles.css cache-buster.")
        if "course-modules.js?v=" in text and f"course-modules.js?v={CURRENT_COURSE_MODULES_VERSION}" not in text:
            report.error(f"{page} must reference the current course-modules.js cache-buster.")


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


def verify_ial_course_solutions(report: Report, course_id: str, data_path: Path, assignment_name: str) -> None:
    data_label = data_path.name
    if not data_path.exists():
        report.error(f"{rel(data_path)} is missing.")
        return
    try:
        text = data_path.read_text(encoding="utf-8")
        questions = extract_js_assignment_array(text, assignment_name)
    except Exception as exc:  # noqa: BLE001 - verifier should show exact data failure
        report.error(f"{rel(data_path)} could not be parsed: {exc}")
        return

    if not isinstance(questions, list):
        report.error(f"{rel(data_path)} has no {assignment_name} array.")
        return

    private_text_pattern = re.compile(
        r"(topic\s*check|topic-checked|mark[-\s]?scheme\s+review|checking\s+the\s+answer|answer\s+checked)",
        re.IGNORECASE,
    )
    structured_count = 0
    checked_count = 0
    asset_prefix = f"ial/{course_id}/questions/"
    for index, item in enumerate(questions, start=1):
        if not isinstance(item, dict):
            report.error(f"{data_label} question #{index} is not an object.")
            continue
        qid = str(item.get("id") or f"#{index}")
        image = str(item.get("image") or "").strip()
        if not image.startswith(asset_prefix):
            report.error(f"{data_label} question {qid} image must be under {asset_prefix}: {image}")
        elif not (ROOT / image).is_file():
            report.error(f"{data_label} question {qid} image is missing: {image}")
        steps = item.get("steps")
        if not isinstance(steps, list) or not steps:
            report.error(f"{data_label} solution for {qid} has no structured steps.")
        else:
            structured_count += 1
            for step_index, step in enumerate(steps, start=1):
                if not isinstance(step, dict):
                    report.error(f"{data_label} solution for {qid} step {step_index} is not an object.")
                    continue
                if not str(step.get("title") or "").strip():
                    report.error(f"{data_label} solution for {qid} step {step_index} has empty title.")
                if not str(step.get("body") or "").strip():
                    report.error(f"{data_label} solution for {qid} step {step_index} has empty body.")
        final_answer = str(item.get("finalAnswer") or "").strip()
        if not final_answer:
            report.error(f"{data_label} solution for {qid} has empty finalAnswer.")
        status = str(item.get("status") or "").strip()
        checked_by = str(item.get("checkedBy") or "").strip()
        if not status:
            report.error(f"{data_label} solution for {qid} is missing status metadata.")
        if not checked_by:
            report.error(f"{data_label} solution for {qid} is missing checkedBy metadata.")
        if status == "checked":
            checked_count += 1
        public_text = "\n".join(
            [
                *(str(step.get("title", "")) + "\n" + str(step.get("body", "")) for step in steps or [] if isinstance(step, dict)),
                final_answer,
            ]
        )
        if private_text_pattern.search(public_text):
            report.error(f"{data_label} solution for {qid} exposes private checking text in public fields.")

    report.set(f"{course_id}_solutions", len(questions))
    report.set(f"{course_id}_structured_solutions", structured_count)
    report.set(f"{course_id}_checked_solutions", checked_count)


def verify_ial_solutions(report: Report) -> None:
    for course_id, (data_path, assignment_name) in IAL_DATA_FILES.items():
        verify_ial_course_solutions(report, course_id, data_path, assignment_name)


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
    verify_resource_command_center(report)
    verify_mechanics_lab(report)
    verify_revision_engine(report)
    verify_worked_solution_view(report)
    verify_pathway_palette_activation(report)
    question_by_id, paper_slugs, _used_topics = verify_questions(report)
    verify_catalogue(report, paper_slugs)
    verify_solutions(report, question_by_id)
    verify_ial_solutions(report)
    return print_report(report)


if __name__ == "__main__":
    sys.exit(main())
