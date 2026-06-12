from __future__ import annotations

import json
import re
import shutil
from pathlib import Path

import fitz


ROOT = Path(__file__).resolve().parents[2]
SOURCE_DIR = Path(r"D:\Tyro4_Latex\0 Mathematics\Mechanics 1\final Exam")
REVIEW_ROOT = ROOT / "private_output" / "wme01_crop_review"
PUBLIC_QUESTIONS = ROOT / "ial" / "wme01" / "questions"
DATA_PATH = ROOT / "ial" / "wme01" / "wme01-data.js"
DOWNLOAD_PAPERS = ROOT / "downloads" / "IAL" / "WME01" / "Papers"
PRIVATE_BANK = ROOT / "private_output" / "wme01_full_bank.json"
MANUAL_SOLUTIONS = ROOT / "tools" / "wme01" / "wme01_manual_solutions.json"
MANUAL_GAPS_REPORT = ROOT / "private_output" / "wme01_manual_solution_gaps.json"
MIN_MANUAL_STEPS = 3

TOPICS = [
    {"slug": "01_QuantitiesUnitsModelling", "name": "Quantities, Units & Modelling"},
    {"slug": "02_WorkingWithVectors", "name": "Working with Vectors"},
    {"slug": "03_KinematicsGraphs", "name": "Kinematics Graphs"},
    {"slug": "04_ConstantAcceleration1D", "name": "Constant Acceleration in 1D"},
    {"slug": "05_ConstantAcceleration2D", "name": "Constant Acceleration in 2D"},
    {"slug": "06_Forces", "name": "Forces"},
    {"slug": "07_NewtonsSecondLaw", "name": "Newton's Second Law"},
    {"slug": "08_ResolvingForcesInclinedPlanes", "name": "Resolving Forces, Inclined Planes"},
    {"slug": "09_MomentumImpulseCollisions", "name": "Momentum, Impulse & Collisions"},
    {"slug": "10_Moments", "name": "Moments"},
]

TOPIC_NAMES = {topic["slug"]: topic["name"] for topic in TOPICS}
SESSION_LABELS = {"Jan": "January", "MayJune": "May/June", "MayJuneR": "May/June R", "Oct": "October"}
SESSION_ORDER = {"Jan": 1, "MayJune": 2, "MayJuneR": 3, "Oct": 4}

QP_RE = re.compile(r"IAL_MATHS_(\d{4})_([A-Za-z]+)_M1_QP\.pdf$", re.IGNORECASE)
MARK_TOKEN_RE = re.compile(r"\b(?:d?M|A|B)\d(?:ft|\*)?(?:\s*,?\s*(?:d?M|A|B)\d(?:ft|\*)?)*\b", re.IGNORECASE)
MS_MARKER_RE = re.compile(r"Questio\s*n\s+(?:Number\s+)?Scheme(?:\s+Notes)?\s+Marks", re.IGNORECASE)
MS_MARKS_END_RE = re.compile(r"\(\s*\d+\s+marks?\s*\)", re.IGNORECASE)
PRIVATE_RE = re.compile(r"\b(mark\s*scheme|scheme|marks?|examiner|candidate|award|score)\b", re.IGNORECASE)
BAD_PUBLIC_RE = re.compile(
    r"[\uf000-\uf8ff\ufffdâ–¡]|(?:Correct|Attempts?|Uses?|Applies?|Allow|Accept|Awrt|Cao|Ft)\b",
    re.IGNORECASE,
)
CORRUPT_TEXT_RE = re.compile(r"[\uf000-\uf8ff\ufffdâ–¡]")
RENDER_LEAK_RE = re.compile(
    r"</?div|\\(?:unit|pounds|textcolor|fbox|boxed)\b|\\begin\{(?:tikzpicture|tcolorbox)\}",
    re.IGNORECASE,
)

TOPIC_METHODS = {
    "01_QuantitiesUnitsModelling": (
        "Identify the quantity type",
        "Decide whether the quantities are scalars or vectors, convert to SI units where needed, and state any modelling assumptions being used.",
        "Use the model consistently",
        "Carry the units through the calculation and interpret the final answer in the context of the motion or force model.",
    ),
    "02_WorkingWithVectors": (
        "Set up the vector relation",
        "Use position, displacement, velocity, or acceleration vectors with the rule end minus start where required.",
        "Resolve components",
        "Compare the i and j components, then find any requested magnitude, bearing, parallel condition, or vector expression.",
    ),
    "03_KinematicsGraphs": (
        "Read the graph meaning",
        "Use gradient for velocity or acceleration, and area under the graph for displacement or change in velocity.",
        "Apply the interval carefully",
        "Calculate each relevant gradient or area separately before combining them with the correct sign.",
    ),
    "04_ConstantAcceleration1D": (
        "Choose a positive direction",
        "List the SUVAT quantities with signs, using g as positive or negative according to the chosen direction.",
        "Select the SUVAT equation",
        "Use the equation that avoids the unwanted variable, then state the speed, time, height, or displacement with units.",
    ),
    "05_ConstantAcceleration2D": (
        "Split the motion into components",
        "Use horizontal and vertical SUVAT equations separately, or write the vector SUVAT equation when acceleration is constant.",
        "Combine the components",
        "Use the component results to find position, velocity, speed, angle, range, or time as requested.",
    ),
    "06_Forces": (
        "Draw the force balance",
        "Identify all forces and choose axes so the resultant or equilibrium condition is clear.",
        "Resolve and solve",
        "Resolve forces into components, then use zero resultant or vector addition to find the missing force, magnitude, or direction.",
    ),
    "07_NewtonsSecondLaw": (
        "Choose the body or system",
        "For acceleration, use the whole system where helpful; for tension or thrust, isolate one body.",
        "Apply Newton's second law",
        "Write resultant force equals mass times acceleration in the chosen direction and solve for the unknown.",
    ),
    "08_ResolvingForcesInclinedPlanes": (
        "Resolve parallel and perpendicular",
        "Use mg sin theta along the plane and mg cos theta perpendicular to the plane, adjusting for any applied force angle.",
        "Set the friction direction",
        "Use F = mu R with friction opposing motion or impending motion, then apply equilibrium or Newton's second law.",
    ),
    "09_MomentumImpulseCollisions": (
        "Set the sign convention",
        "Choose one positive direction and write all velocities before and after collision with signs.",
        "Use momentum or impulse",
        "Apply conservation of momentum for the collision, or impulse equals change in momentum for a force over time.",
    ),
    "10_Moments": (
        "Choose the pivot",
        "Take moments about a point that removes an unknown force, using force times perpendicular distance.",
        "Use equilibrium or tilting",
        "Set clockwise moments equal to anticlockwise moments, and remember a support reaction is zero at the non-pivot point when tilting begins.",
    ),
}


def load_manual_solutions() -> dict[str, dict]:
    if not MANUAL_SOLUTIONS.exists():
        return {}
    try:
        data = json.loads(MANUAL_SOLUTIONS.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return {}
    return {str(key): value for key, value in data.items() if isinstance(value, dict)}


def validate_manual_solution(qid: str, row: dict) -> list[str]:
    issues: list[str] = []
    steps = row.get("steps")
    final_answer = str(row.get("finalAnswer") or "").strip()
    if not final_answer:
        issues.append("missing finalAnswer")
    if not isinstance(steps, list) or len(steps) < MIN_MANUAL_STEPS:
        issues.append(f"needs at least {MIN_MANUAL_STEPS} worked steps")
        return issues
    for index, step in enumerate(steps, 1):
        title = str(step.get("title") or "").strip() if isinstance(step, dict) else ""
        body = str(step.get("body") or "").strip() if isinstance(step, dict) else ""
        if not title or not body:
            issues.append(f"step {index} is missing a title or body")
        if PRIVATE_RE.search(title) or PRIVATE_RE.search(body):
            issues.append(f"step {index} contains private mark-scheme language")
        if CORRUPT_TEXT_RE.search(title) or CORRUPT_TEXT_RE.search(body):
            issues.append(f"step {index} contains unreadable extracted text")
        if RENDER_LEAK_RE.search(title) or RENDER_LEAK_RE.search(body):
            issues.append(f"step {index} contains raw TeX or HTML that may leak when rendered")
        if title.count("$") % 2 or body.count("$") % 2:
            issues.append(f"step {index} has an unbalanced math delimiter")
    if PRIVATE_RE.search(final_answer) or CORRUPT_TEXT_RE.search(final_answer):
        issues.append("finalAnswer contains private or unreadable text")
    if RENDER_LEAK_RE.search(final_answer):
        issues.append("finalAnswer contains raw TeX or HTML that may leak when rendered")
    if final_answer.count("$") % 2:
        issues.append("finalAnswer has an unbalanced math delimiter")
    if "topic" in row and row.get("topic") not in TOPIC_NAMES:
        issues.append("invalid primary topic")
    for topic in row.get("secondaryTopics") or []:
        if topic not in TOPIC_NAMES:
            issues.append(f"invalid secondary topic {topic}")
    if issues:
        issues.insert(0, qid)
    return issues


def manual_solution_gaps(manifests: list[dict], manual_solutions: dict[str, dict]) -> list[dict]:
    gaps: list[dict] = []
    for manifest in sorted(manifests, key=lambda item: parse_slug(item["slug"])):
        slug = manifest["slug"]
        year, session = parse_slug(slug)
        for question in manifest["questions"]:
            q_no = int(question["q"])
            qid = f"WME01-01_{year}_{session}_Q{q_no:02d}"
            manual_row = manual_solutions.get(qid)
            if not manual_row:
                gaps.append({"id": qid, "reason": "missing manual solution", "preview": question.get("textPreview", "")[:220]})
                continue
            issues = validate_manual_solution(qid, manual_row)
            if issues:
                gaps.append({"id": qid, "reason": "; ".join(issues[1:]), "preview": question.get("textPreview", "")[:220]})
    return gaps


def paper_slug(path: Path) -> str:
    match = QP_RE.match(path.name)
    if not match:
        raise ValueError(f"Unexpected WME01 QP filename: {path.name}")
    year, session = match.groups()
    return f"WME01_{year}_{session}"


def parse_slug(slug: str) -> tuple[int, str]:
    _code, year, session = slug.split("_", 2)
    return int(year), session


def topic_name(slug: str) -> str:
    return TOPIC_NAMES[slug]


def clean_text(text: str) -> str:
    text = text.replace("\uf0dd", "=").replace("\uf0de", "-").replace("\uf0a2", "")
    text = text.replace("ï‚´", r"\times").replace("ïƒž", r"\Rightarrow")
    text = text.replace("ï‚±", r"\pm").replace("ï‚„", r"\leq")
    text = text.replace("ï±", r"\theta").replace("Ï€", r"\pi")
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def classify_question(text: str) -> tuple[str, list[str]]:
    lowered = clean_text(text).lower()
    lowered = re.sub(r"do not write in this area", " ", lowered)
    lowered = re.sub(r"leave blank", " ", lowered)
    lowered = re.sub(r"question\s+\d+\s+continued", " ", lowered)
    lowered = re.sub(r"total for question\s+\d+\s+is\s+\d+\s+marks?", " ", lowered)
    lowered = re.sub(r"_+", " ", lowered)
    scores = {topic["slug"]: 0 for topic in TOPICS}

    def hit(topic: str, weight: int, *needles: str) -> None:
        for needle in needles:
            if needle in lowered:
                scores[topic] += weight

    def regex_hit(topic: str, weight: int, pattern: str) -> None:
        if re.search(pattern, lowered):
            scores[topic] += weight

    hit("01_QuantitiesUnitsModelling", 4, "model", "modelling", "particle", "smooth", "light", "uniform", "inextensible", "unit", "units")
    hit("02_WorkingWithVectors", 8, "vector", "position vector", "bearing", "relative", "parallel", "perpendicular vectors")
    regex_hit("02_WorkingWithVectors", 6, r"\b[ijk]\b|\\mathbf\{[ij]\}| i \+| j \+| i -| j -")
    hit("03_KinematicsGraphs", 9, "velocity-time graph", "speed-time graph", "displacement-time graph", "acceleration-time graph", "area under", "sketch the graph")
    hit("04_ConstantAcceleration1D", 7, "suvat", "constant acceleration", "vertical", "projected vertically", "greatest height", "hits the ground", "comes to rest")
    regex_hit("04_ConstantAcceleration1D", 5, r"\bu\s*=|\bv\s*=|\bs\s*=|\ba\s*=|\bt\s*=")
    hit("05_ConstantAcceleration2D", 8, "projectile", "horizontal component", "vertical component", "position vector", "velocity vector", "two boats", "range")
    hit("06_Forces", 7, "resultant force", "equilibrium", "force diagram", "resolve", "components of force", "magnitude of the force")
    hit("07_NewtonsSecondLaw", 8, "newton", "f = ma", "acceleration", "tension", "thrust", "pulley", "connected", "tow truck", "lift", "barge")
    hit("08_ResolvingForcesInclinedPlanes", 10, "inclined plane", "plane is inclined", "coefficient of friction", "rough plane", "limiting equilibrium", "friction", "normal reaction")
    regex_hit("08_ResolvingForcesInclinedPlanes", 7, r"\bmu\b|\\mu|coefficient")
    hit("09_MomentumImpulseCollisions", 10, "momentum", "impulse", "collision", "collides", "coalesce", "rebound", "conservation of momentum")
    hit("10_Moments", 10, "moment", "moments", "rod", "beam", "lamina", "tilting", "pivot", "centre of mass", "clockwise", "anticlockwise", "support")

    if "projectile" in lowered:
        scores["05_ConstantAcceleration2D"] += 8
    if "bearing" in lowered:
        scores["02_WorkingWithVectors"] += 6
    if "pulley" in lowered and "friction" in lowered:
        scores["08_ResolvingForcesInclinedPlanes"] += 3
    if "pulley" in lowered and "impulse" in lowered:
        scores["09_MomentumImpulseCollisions"] += 4

    ordered = sorted(scores.items(), key=lambda item: item[1], reverse=True)
    primary = ordered[0][0] if ordered and ordered[0][1] > 0 else "04_ConstantAcceleration1D"
    secondary = [slug for slug, score in ordered[1:4] if score >= 5 and slug != primary]
    return primary, secondary[:3]


def extract_ms_sections(path: Path) -> dict[int, str]:
    if not path.exists():
        return {}
    with fitz.open(path) as doc:
        text = "\n".join(doc.load_page(index).get_text() for index in range(len(doc)))
    text = clean_text(text)
    markers = list(MS_MARKER_RE.finditer(text))
    matches = []
    last_q = 0
    for marker in markers:
        snippet = text[marker.end() : marker.end() + 240]
        expected_q = last_q + 1 if last_q else 1
        q_no = None

        immediate = re.match(
            r"\s*([1-9]\d?)(?:\s*(?:[a-d](?=\b|\()|\([a-zivx]+\)|\.(?!\d))|\s+)",
            snippet,
            re.I,
        )
        if immediate and int(immediate.group(1)) == expected_q:
            q_no = expected_q

        if q_no is None:
            expected_match = re.search(
                rf"\b{expected_q}\s*(?:[a-d](?=\b|\()|\([a-d]\)|\([ivx]+\)|\.(?!\d))",
                snippet,
                re.I,
            )
            if expected_match:
                q_no = expected_q

        if q_no is None:
            strong = re.search(
                r"\b([1-9]\d?)\s*(?:[a-d](?=\b|\()|\([a-d]\)|\([ivx]+\)|\.(?!\d))",
                snippet,
                re.I,
            )
            if strong:
                q_no = int(strong.group(1))

        if q_no is None:
            fallback = re.search(r"\b([1-9]\d?)\b", snippet)
            if fallback:
                q_no = int(fallback.group(1))

        if q_no is not None and 1 <= q_no <= 20:
            matches.append((marker.start(), q_no))
            last_q = q_no
    sections: dict[int, str] = {}
    for index, (start, q_no) in enumerate(matches):
        end = matches[index + 1][0] if index + 1 < len(matches) else len(text)
        section = text[start:end]
        marks_end = MS_MARKS_END_RE.search(section)
        if marks_end:
            section = section[: marks_end.end()]
        section = re.sub(r"Questio\s*n\s+Number\s+Scheme\s+(?:Notes\s+)?Marks\s+\d{1,2}\.?", "", section, flags=re.I).strip()
        sections[q_no] = clean_scheme(section)
    return sections


def clean_scheme(text: str) -> str:
    text = MARK_TOKEN_RE.sub("", text)
    text = re.sub(r"(?:d?M|A|B)\d(?:ft|\*)?", " ", text)
    text = re.sub(r"Questio\s*n\s+(?:Number\s+)?Scheme(?:\s+Notes)?\s+Marks?", " ", text, flags=re.I)
    text = re.sub(r"\bMARKSCHEME\b", " ", text, flags=re.I)
    text = re.sub(r"\(\s*\d+\s+marks?\s*\)", " ", text, flags=re.I)
    text = re.sub(r"\(\s*\d+\s*\)", " ", text)
    text = re.sub(r"\bTotal\b.*", "", text, flags=re.I)
    text = re.sub(r"\b(?:Accept|Allow|Award|Condone|Candidates?|Examiner|Mark|Marks|Score\w*|BOD|Note|Look for|Beware)\b[^.]{0,180}", " ", text, flags=re.I)
    text = re.sub(r"\s+", " ", text)
    return text.strip(" ;")


def clean_public_solution_text(text: str) -> str:
    text = MARK_TOKEN_RE.sub(" ", text)
    text = re.sub(PRIVATE_RE, " ", text)
    text = re.sub(r"[\uf000-\uf8ff\ufffdâ–¡]+", " ", text)
    text = re.sub(r"[ï£«ï£¶ï£¬ï£·ï£­ï£¸ïµï¸]+", " ", text)
    text = text.replace("â‡’", "therefore").replace("âˆ’", "-").replace("Â±", "+/-")
    text = text.replace("Â°", " degrees")
    text = re.sub(r"\b(?:Correct|Attempts?|Uses?|Applies?|Allow|Accept|Awrt|Cao|Ft)\b[^.]{0,160}", " ", text, flags=re.I)
    text = re.sub(r"\s+", " ", text)
    return text.strip(" ,;:.")


def is_readable_public_text(text: str) -> bool:
    if not text or BAD_PUBLIC_RE.search(text):
        return False
    if len(text) > 180:
        return False
    tokens = text.split()
    if len(tokens) > 24:
        return False
    return True


def topic_fallback_answer(topic: str, q_text: str) -> str:
    lowered = q_text.lower()
    if topic == "03_KinematicsGraphs":
        return "Read the required gradients or areas from the graph and state the result with units."
    if topic == "09_MomentumImpulseCollisions":
        return "Use the signed momentum or impulse equation to obtain the required velocity or impulse."
    if topic == "10_Moments":
        return "Take moments about a suitable pivot and solve the resulting equilibrium equation."
    if "show that" in lowered or "prove" in lowered:
        return "The required result is shown."
    return "The required value or expression is obtained by the final simplification."


def public_answer_from_scheme(scheme: str, q_text: str, topic: str) -> str:
    raw_answer = extract_final_answer(scheme)
    answer = clean_public_solution_text(raw_answer)
    if not is_readable_public_text(answer):
        answer = topic_fallback_answer(topic, q_text)
    return answer


def split_solution_steps(scheme: str, q_text: str) -> tuple[list[dict[str, str]], str]:
    topic, _secondary = classify_question(q_text)
    method = TOPIC_METHODS[topic]
    if not scheme:
        return [
            {
                "title": method[0],
                "body": method[1],
            },
            {
                "title": method[2],
                "body": method[3],
            },
        ], topic_fallback_answer(topic, q_text)

    compact = re.sub(r"\s+", " ", scheme).strip()
    final_answer = public_answer_from_scheme(compact, q_text, topic)
    steps = [
        {"title": method[0], "body": method[1]},
        {"title": method[2], "body": method[3]},
        {
            "title": "State the final result",
            "body": f"Write the answer in the form requested by the question: {final_answer}",
        },
    ]
    return steps, final_answer


def extract_final_answer(text: str) -> str:
    cleaned = re.sub(r"\s+", " ", text).strip()
    cleaned = re.sub(r"^\(?[a-d]\)?\s*", "", cleaned)
    candidates = re.findall(r"(?:=|is|gives|hence)\s*([^.;]{1,110})", cleaned, flags=re.I)
    if candidates:
        answer = candidates[-1].strip()
    else:
        answer = cleaned[-140:].strip()
    answer = MARK_TOKEN_RE.sub("", answer)
    answer = re.sub(PRIVATE_RE, "", answer).strip(" ,;:.")
    return answer or "See the worked steps."


def load_manifests() -> list[dict]:
    manifests = []
    for path in sorted(REVIEW_ROOT.glob("WME01_*/crop_manifest.json")):
        manifests.append(json.loads(path.read_text(encoding="utf-8")))
    return manifests


def qp_paths() -> dict[str, Path]:
    return {paper_slug(path): path for path in SOURCE_DIR.glob("IAL_MATHS_*_M1_QP.pdf")}


def ms_paths() -> dict[str, Path]:
    paths = {}
    for path in SOURCE_DIR.glob("IAL_MATHS_*_M1_MS.pdf"):
        slug = paper_slug(Path(path.name.replace("_MS.pdf", "_QP.pdf")))
        paths[slug] = path
    return paths


def clear_generated_question_images() -> None:
    PUBLIC_QUESTIONS.mkdir(parents=True, exist_ok=True)
    for path in PUBLIC_QUESTIONS.glob("*.png"):
        path.unlink()


def build() -> None:
    manual_solutions = load_manual_solutions()
    manifests = load_manifests()
    qps = qp_paths()
    gaps = manual_solution_gaps(manifests, manual_solutions)
    if gaps:
        MANUAL_GAPS_REPORT.parent.mkdir(parents=True, exist_ok=True)
        MANUAL_GAPS_REPORT.write_text(json.dumps(gaps, ensure_ascii=False, indent=2), encoding="utf-8")
        raise RuntimeError(
            f"WME01 needs {len(gaps)} detailed manual solutions before publishing. "
            f"See {MANUAL_GAPS_REPORT}."
        )

    clear_generated_question_images()
    DOWNLOAD_PAPERS.mkdir(parents=True, exist_ok=True)

    rows: list[dict] = []
    counts = {topic["slug"]: {"primary": 0, "total": 0} for topic in TOPICS}

    for manifest in sorted(manifests, key=lambda item: parse_slug(item["slug"])):
        slug = manifest["slug"]
        year, session = parse_slug(slug)
        label = SESSION_LABELS.get(session, session)
        qp = qps.get(slug)
        if qp:
            shutil.copy2(qp, DOWNLOAD_PAPERS / f"{slug}_QP.pdf")

        for question in manifest["questions"]:
            q_no = int(question["q"])
            marks = int(question["marks"])
            qid = f"WME01-01_{year}_{session}_Q{q_no:02d}"
            manual_row = manual_solutions.get(qid)
            primary, secondary = classify_question(question.get("text", ""))
            primary = manual_row.get("topic") or primary
            secondary = list(manual_row.get("secondaryTopics") or secondary)
            steps = manual_row["steps"]
            final_answer = manual_row["finalAnswer"]

            all_topics = [primary, *[topic for topic in secondary if topic != primary]]
            counts[primary]["primary"] += 1
            for topic in all_topics:
                counts[topic]["total"] += 1

            src = Path(question["image"])
            dst_name = f"WME01-01_Y{year}_{session}_Q{q_no:02d}_M{marks:02d}_{primary}.png"
            shutil.copy2(src, PUBLIC_QUESTIONS / dst_name)

            rows.append(
                {
                    "id": qid,
                    "year": year,
                    "session": session,
                    "paperCode": "WME01-01",
                    "paper": f"WME01/01 {label} {year}",
                    "qNo": q_no,
                    "marks": marks,
                    "topic": primary,
                    "topicName": topic_name(primary),
                    "primaryTopic": primary,
                    "primaryTopicName": topic_name(primary),
                    "secondaryTopics": [topic for topic in secondary if topic != primary],
                    "secondaryTopicNames": [topic_name(topic) for topic in secondary if topic != primary],
                    "topics": all_topics,
                    "topicNames": [topic_name(topic) for topic in all_topics],
                    "image": f"ial/wme01/questions/{dst_name}",
                    "downloadName": dst_name,
                    "finalAnswer": final_answer,
                    "steps": steps,
                    "status": "checked",
                    "checkedBy": "Dr Eslam Ahmed",
                    "updated": "2026-06-11T00:00:00",
                }
            )

    topics = []
    for topic in TOPICS:
        count = counts[topic["slug"]]["total"]
        primary_count = counts[topic["slug"]]["primary"]
        topics.append({**topic, "primaryCount": primary_count, "count": count, "crossCount": max(0, count - primary_count)})

    rows.sort(
        key=lambda item: (
            next((index for index, topic in enumerate(TOPICS) if topic["slug"] == item["primaryTopic"]), 999),
            item["year"],
            SESSION_ORDER.get(item["session"], 99),
            item["qNo"],
        )
    )
    DATA_PATH.write_text(
        "window.WME01_TOPICS = "
        + json.dumps(topics, ensure_ascii=False, separators=(",", ":"))
        + ";\nwindow.WME01_QUESTIONS = "
        + json.dumps(rows, ensure_ascii=False, separators=(",", ":"))
        + ";\n",
        encoding="utf-8",
    )
    PRIVATE_BANK.write_text(json.dumps({"topics": topics, "questions": rows}, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Wrote {DATA_PATH}")
    print(f"Wrote {PRIVATE_BANK}")
    print(f"Questions: {len(rows)}")
    print(f"Images: {len(list(PUBLIC_QUESTIONS.glob('WME01-01_*.png')))}")


if __name__ == "__main__":
    build()
