from __future__ import annotations

import json
import re
import shutil
from pathlib import Path

import fitz


ROOT = Path(__file__).resolve().parents[2]
SOURCE_DIR = Path(r"D:\Tyro4_Latex\0 Mathematics\Pure 2\finalExams")
REVIEW_ROOT = ROOT / "private_output" / "wma12_crop_review"
PUBLIC_QUESTIONS = ROOT / "ial" / "wma12" / "questions"
DATA_PATH = ROOT / "ial" / "wma12" / "wma12-data.js"
DOWNLOAD_PAPERS = ROOT / "downloads" / "IAL" / "WMA12" / "Papers"
PRIVATE_BANK = ROOT / "private_output" / "wma12_full_bank.json"
MANUAL_SOLUTIONS = ROOT / "tools" / "wma12" / "wma12_manual_solutions.json"
MANUAL_GAPS_REPORT = ROOT / "private_output" / "wma12_manual_solution_gaps.json"
MIN_MANUAL_STEPS = 3

TOPICS = [
    {"slug": "01_Proof", "name": "Proof"},
    {"slug": "02_Polynomials", "name": "Polynomials"},
    {"slug": "03_Circles", "name": "Circles"},
    {"slug": "04_BinomialExpansion", "name": "Binomial Expansion"},
    {"slug": "05_ArithmeticSequences", "name": "Arithmetic Sequences"},
    {"slug": "06_GeometricSequences", "name": "Geometric Sequences"},
    {"slug": "07_SequencesSeries", "name": "Sequences & Series"},
    {"slug": "08_ModellingSequencesSeries", "name": "Modelling with Sequences & Series"},
    {"slug": "09_LawsOfLogarithms", "name": "Laws of Logarithms"},
    {"slug": "10_TrigonometricEquations", "name": "Trigonometric Equations"},
    {"slug": "11_ApplicationsOfDifferentiation", "name": "Applications of Differentiation"},
    {"slug": "12_Integration", "name": "Integration"},
]

TOPIC_NAMES = {topic["slug"]: topic["name"] for topic in TOPICS}
SESSION_LABELS = {"Jan": "January", "MayJune": "May/June", "MayJuneR": "May/June R", "Oct": "October"}
SESSION_ORDER = {"Jan": 1, "MayJune": 2, "MayJuneR": 3, "Oct": 4}

QP_RE = re.compile(r"IAL_MATHS_(\d{4})_([A-Za-z]+)_P2(R?)_QP\.pdf$", re.IGNORECASE)
MARK_TOKEN_RE = re.compile(r"\b(?:d?M|A|B)\d(?:ft|\*)?(?:\s*,?\s*(?:d?M|A|B)\d(?:ft|\*)?)*\b", re.IGNORECASE)
MS_MARKER_RE = re.compile(r"Questio\s*n\s+(?:Number\s+)?Scheme(?:\s+Notes)?\s+Marks", re.IGNORECASE)
MS_MARKS_END_RE = re.compile(r"\(\s*\d+\s+marks?\s*\)", re.IGNORECASE)
PRIVATE_RE = re.compile(r"\b(mark\s*scheme|scheme|marks?|M1|A1|B1|examiner|candidate|award|score)\b", re.IGNORECASE)
BAD_PUBLIC_RE = re.compile(
    r"[\uf000-\uf8ff\ufffd□]|(?:Correct|Attempts?|Uses?|Applies?|Allow|Accept|Awrt|Cao|Ft)\b",
    re.IGNORECASE,
)
CORRUPT_TEXT_RE = re.compile(r"[\uf000-\uf8ff\ufffd□]")

TOPIC_METHODS = {
    "01_Proof": (
        "Set up the proof",
        "Translate the statement into algebra, or choose a clear counterexample if the statement is false. Keep each implication justified.",
        "Complete the argument",
        "Simplify the algebra or evaluate the counterexample, then finish with a clear conclusion.",
    ),
    "02_Polynomials": (
        "Use the polynomial condition",
        "Apply the factor theorem, remainder theorem, or substitution stated in the question to form the required equation.",
        "Finish the algebra",
        "Solve the resulting equation and substitute back where needed, then write the requested factor, coefficient, or value.",
    ),
    "03_Circles": (
        "Identify the circle information",
        "Use the centre-radius form, distance formula, gradient condition, or tangent property required by the diagram.",
        "Complete the geometry",
        "Substitute the coordinates carefully and simplify to the requested equation, length, point, or proof.",
    ),
    "04_BinomialExpansion": (
        "Choose the required binomial terms",
        "Write the expansion term-by-term and keep only the powers needed for the coefficient or approximation.",
        "Compare coefficients",
        "Collect like powers, compare with the given expression, and solve for the required constant.",
    ),
    "05_ArithmeticSequences": (
        "Use the arithmetic formula",
        "Identify the first term, common difference, and required term or sum from the question.",
        "Substitute and solve",
        "Use the arithmetic term or sum formula, then simplify the requested value.",
    ),
    "06_GeometricSequences": (
        "Use the geometric formula",
        "Identify the first term, common ratio, and whether the question needs a term, finite sum, or sum to infinity.",
        "Substitute and solve",
        "Apply the correct geometric formula and simplify, checking any validity condition on the ratio.",
    ),
    "07_SequencesSeries": (
        "Translate the sequence rule",
        "Write the recurrence, sigma expression, or general term exactly from the question before simplifying.",
        "Find the requested term or sum",
        "Evaluate the sequence or series in order, then state the required term, total, or conclusion.",
    ),
    "08_ModellingSequencesSeries": (
        "Model the situation",
        "Match the real situation to an arithmetic, geometric, or recurrence model using the starting value and rate of change.",
        "Interpret the result",
        "Calculate the required term or sum and state the answer in the units and context of the question.",
    ),
    "09_LawsOfLogarithms": (
        "Combine the logarithms",
        "Use the power, product, and quotient laws to rewrite the equation as a single logarithmic or exponential statement.",
        "Solve with domain checks",
        "Solve the resulting equation and reject any value that does not satisfy the original logarithms.",
    ),
    "10_TrigonometricEquations": (
        "Rearrange the trigonometric equation",
        "Use the identity or ratio needed to reduce the equation to one trigonometric function in the required interval.",
        "List the valid solutions",
        "Find all angles in the given range and discard any extra values outside the interval.",
    ),
    "11_ApplicationsOfDifferentiation": (
        "Differentiate and set the condition",
        "Differentiate the expression, then use the gradient, stationary-point, tangent, normal, or optimisation condition.",
        "Classify or evaluate",
        "Substitute the required value and use the derivative information to complete the coordinate, gradient, interval, or maximum/minimum.",
    ),
    "12_Integration": (
        "Set up the integral",
        "Choose the correct integrand and limits, or apply the trapezium rule if the question gives tabulated values.",
        "Evaluate the area or expression",
        "Integrate or calculate the trapezium estimate carefully, then simplify the requested value.",
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
    if PRIVATE_RE.search(final_answer) or CORRUPT_TEXT_RE.search(final_answer):
        issues.append("finalAnswer contains private or unreadable text")
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
            qid = f"WMA12-01_{year}_{session}_Q{q_no:02d}"
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
        raise ValueError(f"Unexpected WMA12 QP filename: {path.name}")
    year, session, variant = match.groups()
    return f"WMA12_{year}_{session}{variant}"


def parse_slug(slug: str) -> tuple[int, str]:
    _code, year, session = slug.split("_", 2)
    return int(year), session


def topic_name(slug: str) -> str:
    return TOPIC_NAMES[slug]


def clean_text(text: str) -> str:
    text = text.replace("\uf0dd", "=").replace("\uf0de", "-").replace("\uf0a2", "")
    text = text.replace("", r"\times").replace("", r"\Rightarrow")
    text = text.replace("", r"\pm").replace("", r"\leq")
    text = text.replace("", r"\theta").replace("π", r"\pi")
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

    hit("01_Proof", 6, "prove", "counter example", "exhaustion", "show that the following statement is false", "consecutive odd")
    hit("02_Polynomials", 5, "factor theorem", "remainder", "root", "polynomial", "factorise", "product of three linear factors")
    hit("03_Circles", 6, "circle", "centre", "radius", "chord", "tangent")
    hit("04_BinomialExpansion", 7, "binomial", "coefficient of", "expansion of", "ascending powers")
    hit("05_ArithmeticSequences", 6, "arithmetic", "common difference")
    hit("06_GeometricSequences", 6, "geometric", "common ratio", "sum to infinity")
    hit("07_SequencesSeries", 5, "sequence", "series", "sigma", "recurrence", "periodic", "sum to n")
    hit("08_ModellingSequencesSeries", 7, "model a", "model b", "population", "wheat", "tonnes", "lithium", "company mines", "farm")
    regex_hit("09_LawsOfLogarithms", 8, r"(?<![a-z])log(?:\b|_|\d)|logarithm|exponential")
    regex_hit("10_TrigonometricEquations", 8, r"(?<![a-z])(?:sin|cos|tan)(?![a-z])|\\theta|θ|radians?|degrees?|trigonometric")
    hit("11_ApplicationsOfDifferentiation", 7, "stationary", "increasing", "decreasing", "normal", "tangent", "gradient", "differentiate", "calculus")
    hit("12_Integration", 8, "integral", "integrate", "trapezium", "area", " dx", " d x")

    if "model a" in lowered or "model b" in lowered:
        scores["08_ModellingSequencesSeries"] += 8
    if "trapezium" in lowered:
        scores["12_Integration"] += 10
    if "show that" in lowered and ("log" in lowered or "sin" in lowered or "cos" in lowered or "tan" in lowered):
        scores["01_Proof"] = max(0, scores["01_Proof"] - 3)

    ordered = sorted(scores.items(), key=lambda item: item[1], reverse=True)
    primary = ordered[0][0] if ordered and ordered[0][1] > 0 else "07_SequencesSeries"
    secondary = [slug for slug, score in ordered[1:4] if score >= 5 and slug != primary]
    if primary == "08_ModellingSequencesSeries":
        for slug in ("05_ArithmeticSequences", "06_GeometricSequences"):
            if slug not in secondary and scores[slug] > 0:
                secondary.append(slug)
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
    text = re.sub(r"[\uf000-\uf8ff\ufffd□]+", " ", text)
    text = re.sub(r"[]+", " ", text)
    text = text.replace("⇒", "therefore").replace("−", "-").replace("±", "+/-")
    text = text.replace("°", " degrees")
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
    if topic == "01_Proof":
        if "false" in lowered or "counter" in lowered:
            return "The statement is false; a valid counterexample completes the disproof."
        return "The required statement has been proved."
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
    for path in sorted(REVIEW_ROOT.glob("WMA12_*/crop_manifest.json")):
        manifests.append(json.loads(path.read_text(encoding="utf-8")))
    return manifests


def qp_paths() -> dict[str, Path]:
    return {paper_slug(path): path for path in SOURCE_DIR.glob("IAL_MATHS_*_P2*_QP.pdf")}


def ms_paths() -> dict[str, Path]:
    paths = {}
    for path in SOURCE_DIR.glob("IAL_MATHS_*_P2*_MS.pdf"):
        slug = paper_slug(Path(path.name.replace("_MS.pdf", "_QP.pdf")))
        paths[slug] = path
    return paths


def clear_generated_question_images() -> None:
    PUBLIC_QUESTIONS.mkdir(parents=True, exist_ok=True)
    for path in PUBLIC_QUESTIONS.glob("WMA12-01_*.png"):
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
            f"WMA12 needs {len(gaps)} detailed manual solutions before publishing. "
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
            qid = f"WMA12-01_{year}_{session}_Q{q_no:02d}"
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
            dst_name = f"WMA12-01_Y{year}_{session}_Q{q_no:02d}_M{marks:02d}_{primary}.png"
            shutil.copy2(src, PUBLIC_QUESTIONS / dst_name)

            rows.append(
                {
                    "id": qid,
                    "year": year,
                    "session": session,
                    "paperCode": "WMA12-01",
                    "paper": f"WMA12/01 {label} {year}",
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
                    "image": f"ial/wma12/questions/{dst_name}",
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
        "window.WMA12_TOPICS = "
        + json.dumps(topics, ensure_ascii=False, separators=(",", ":"))
        + ";\nwindow.WMA12_QUESTIONS = "
        + json.dumps(rows, ensure_ascii=False, separators=(",", ":"))
        + ";\n",
        encoding="utf-8",
    )
    PRIVATE_BANK.write_text(json.dumps({"topics": topics, "questions": rows}, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Wrote {DATA_PATH}")
    print(f"Wrote {PRIVATE_BANK}")
    print(f"Questions: {len(rows)}")
    print(f"Images: {len(list(PUBLIC_QUESTIONS.glob('WMA12-01_*.png')))}")


if __name__ == "__main__":
    build()
