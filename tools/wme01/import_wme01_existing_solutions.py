from __future__ import annotations

import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
MANUAL_SOLUTIONS = ROOT / "tools" / "wme01" / "wme01_manual_solutions.json"

SOURCES = [
    {
        "year": 2025,
        "session": "MayJune",
        "path": Path(r"D:\Tyro4_Latex\0 Mathematics\Mechanics 1\solutionExamMe\M1_Mechanics_2025_May_By_Eng_Eslam_Ahmed.tex"),
    },
    {
        "year": 2025,
        "session": "Oct",
        "path": Path(r"D:\Tyro4_Latex\0 Mathematics\Mechanics 1\solutionExamMe\M1_Mechanics_2025_oct_By_Eng_Eslam_Ahmed.tex"),
    },
]

TOPIC_OVERRIDES = {
    "WME01-01_2025_MayJune_Q01": ("09_MomentumImpulseCollisions", []),
    "WME01-01_2025_MayJune_Q02": ("02_WorkingWithVectors", ["05_ConstantAcceleration2D"]),
    "WME01-01_2025_MayJune_Q03": ("04_ConstantAcceleration1D", []),
    "WME01-01_2025_MayJune_Q04": ("06_Forces", ["07_NewtonsSecondLaw"]),
    "WME01-01_2025_MayJune_Q05": ("10_Moments", []),
    "WME01-01_2025_MayJune_Q06": ("08_ResolvingForcesInclinedPlanes", ["04_ConstantAcceleration1D"]),
    "WME01-01_2025_MayJune_Q07": ("02_WorkingWithVectors", ["05_ConstantAcceleration2D"]),
    "WME01-01_2025_MayJune_Q08": ("07_NewtonsSecondLaw", ["09_MomentumImpulseCollisions"]),
    "WME01-01_2025_Oct_Q01": ("10_Moments", []),
    "WME01-01_2025_Oct_Q02": ("09_MomentumImpulseCollisions", []),
    "WME01-01_2025_Oct_Q03": ("06_Forces", ["02_WorkingWithVectors", "07_NewtonsSecondLaw"]),
    "WME01-01_2025_Oct_Q04": ("05_ConstantAcceleration2D", ["04_ConstantAcceleration1D"]),
    "WME01-01_2025_Oct_Q05": ("08_ResolvingForcesInclinedPlanes", ["07_NewtonsSecondLaw", "04_ConstantAcceleration1D"]),
    "WME01-01_2025_Oct_Q06": ("03_KinematicsGraphs", ["04_ConstantAcceleration1D"]),
    "WME01-01_2025_Oct_Q07": ("08_ResolvingForcesInclinedPlanes", ["07_NewtonsSecondLaw"]),
}

FINAL_ANSWERS = {
    "WME01-01_2025_MayJune_Q01": r"$(a)\ v=3.5u=\dfrac{7u}{2}.\quad (b)\ k=1.5=\dfrac{3}{2}$.",
    "WME01-01_2025_MayJune_Q02": r"$(a)\ \mathbf{v}_A=5\mathbf{i}-4\mathbf{j}\ \mathrm{m\,s^{-1}}.\quad (b)\ \mathbf{r}=(5t-15)\mathbf{i}+(24-4t)\mathbf{j}.\quad (c)\ \text{bearing}=203^\circ$.",
    "WME01-01_2025_MayJune_Q03": r"$(a)\ U=16.6\ \mathrm{m\,s^{-1}}$ (about $17\ \mathrm{m\,s^{-1}}$ to 2 s.f.). $(b)\ \text{speed}=22.6\ \mathrm{m\,s^{-1}}$. (c) Correct V-shaped velocity-time graph with the labelled values from the working.",
    "WME01-01_2025_MayJune_Q04": r"$(a)\ \alpha=43^\circ$ to the nearest degree. $(b)\ a=0.023\ \mathrm{m\,s^{-2}}$.",
    "WME01-01_2025_MayJune_Q05": r"$d=\dfrac{24a}{17}=1.41a$.",
    "WME01-01_2025_MayJune_Q06": r"$(a)\ \text{deceleration}=\dfrac{4g}{5}$, as required. $(b)\ U=4.85\ \mathrm{m\,s^{-1}}$ (about $4.8\ \mathrm{m\,s^{-1}}$). $(c)\ X=7.84\ \mathrm{N}$ (about $7.8\ \mathrm{N}$).",
    "WME01-01_2025_MayJune_Q07": r"$(a)\ |\mathbf{a}_A|=\sqrt{17}\ \mathrm{km\,h^{-2}}\approx4.1\ \mathrm{km\,h^{-2}}.\quad (b)\ \mathbf{a}_B=-\mathbf{i}-2\mathbf{j}\ \mathrm{km\,h^{-2}}.\quad (c)\ \mathbf{v}_B(0)=6\mathbf{i}+5\mathbf{j}\ \mathrm{km\,h^{-1}}.\quad (d)\ T_1=\dfrac{-1+\sqrt{17}}{2}\ \text{hours}.\quad (e)\ 3T_2^2-14T_2+4=0,\ p=-14,\ q=4$.",
    "WME01-01_2025_MayJune_Q08": r"$(a)\ T-kMg=\dfrac{kMg}{5}.\quad (b)\ k=2.\quad (c)\ F=\dfrac{12g}{5}\ \mathrm{N}\approx23.5\ \mathrm{N}.\quad (d)\ |I|=5.30\ \mathrm{N\,s}.\quad (e)\ T=1.92\ \mathrm{s}$.",
    "WME01-01_2025_Oct_Q01": r"$(a)\ x=\dfrac{2}{3}.\quad (b)\ W=24\ \mathrm{N}$.",
    "WME01-01_2025_Oct_Q02": r"$(a)\ w=\dfrac{u}{12}.\quad (b)\ k=\dfrac{7}{12}\ \text{or}\ k=\dfrac{5}{12}$.",
    "WME01-01_2025_Oct_Q03": r"$(a)\ \mathbf{a}=\mathbf{i}+2.5\mathbf{j}\ \mathrm{m\,s^{-2}}.\quad (b)\ \text{speed}=6.95\ \mathrm{m\,s^{-1}}.\quad (c)\ b-c=3.\quad (d)\ \mathbf{F}_3=(8\mathbf{i}+5\mathbf{j})\ \mathrm{N}\ \text{or}\ (-12\mathbf{i}-15\mathbf{j})\ \mathrm{N}$.",
    "WME01-01_2025_Oct_Q04": r"$(a)\ \text{maximum height above A}=1.28\ \mathrm{m}.\quad (b)\ T=1.86\ \mathrm{s}.\quad (c)\ \text{speed of P}=13.2\ \mathrm{m\,s^{-1}}$.",
    "WME01-01_2025_Oct_Q05": r"$(a)\ P=21.8\ \mathrm{N}.\quad (b)\ a=0.96\ \mathrm{m\,s^{-2}}.\quad (c)\ v=1.7\ \mathrm{m\,s^{-1}}$.",
    "WME01-01_2025_Oct_Q06": r"$(a)(i)\ a=3\ \mathrm{m\,s^{-2}},\ (ii)\ \text{deceleration}=6\ \mathrm{m\,s^{-2}}.\quad (b)\ \text{correct acceleration-time graph with levels }3,0,-6.\quad (c)\ \text{distance}=825\ \mathrm{m}.\quad (d)\ A=4\ \mathrm{m\,s^{-2}}$.",
    "WME01-01_2025_Oct_Q07": r"$(a)\ 5mg-T=5ma.\quad (b)\ T=\dfrac{15mg}{7}.\quad (c)\ \text{both particles have the same magnitude of acceleration}.\quad (d)\ k=2.38$.",
}


def read_group(text: str, start: int) -> tuple[str, int] | None:
    while start < len(text) and text[start].isspace():
        start += 1
    if start >= len(text) or text[start] != "{":
        return None
    depth = 0
    body_start = start + 1
    index = start
    while index < len(text):
        char = text[index]
        if char == "\\":
            index += 2
            continue
        if char == "{":
            depth += 1
        elif char == "}":
            depth -= 1
            if depth == 0:
                return text[body_start:index], index + 1
        index += 1
    return None


def unwrap_one_arg(text: str, command: str) -> str:
    token = "\\" + command
    while token in text:
        index = text.find(token)
        group = read_group(text, index + len(token))
        if not group:
            break
        body, end = group
        text = text[:index] + body + text[end:]
    return text


def unwrap_two_arg(text: str, command: str) -> str:
    token = "\\" + command
    while token in text:
        index = text.find(token)
        first = read_group(text, index + len(token))
        if not first:
            break
        _ignored, after_first = first
        second = read_group(text, after_first)
        if not second:
            break
        body, end = second
        text = text[:index] + body + text[end:]
    return text


def command_groups(text: str, token: str) -> list[tuple[int, int, str]]:
    groups: list[tuple[int, int, str]] = []
    search_from = 0
    while True:
        index = text.find(token, search_from)
        if index == -1:
            break
        group = read_group(text, index + len(token))
        if not group:
            search_from = index + len(token)
            continue
        body, end = group
        groups.append((index, end, body))
        search_from = end
    return groups


def strip_environment(text: str, name: str) -> str:
    pattern = re.compile(rf"\\begin\{{{re.escape(name)}\}}(?:\[[^\]]*\])?.*?\\end\{{{re.escape(name)}\}}", re.S)
    return pattern.sub(" ", text)


def inline_math_environment(match: re.Match[str]) -> str:
    body = match.group(1)
    lines = []
    for raw_line in re.split(r"\\\\", body):
        line = raw_line.strip()
        if not line:
            continue
        line = line.replace("&", "")
        line = re.sub(r"\s+", " ", line).strip()
        if line:
            lines.append(f"${line}$")
    return " ".join(lines)


def clean_latex(text: str) -> str:
    text = text.replace("\r\n", "\n")
    text = text.replace("Â°", "°").replace("Â±", "+/-")
    text = text.replace("Ã—", "times").replace("âœ“", "")
    text = text.replace("â‡’", "therefore").replace("âˆ’", "-")
    text = text.replace("â˜…", "").replace("Â", "")
    for name in ("tikzpicture", "center"):
        text = strip_environment(text, name)
    text = re.sub(r"\\begin\{align\*?\}(.*?)\\end\{align\*?\}", inline_math_environment, text, flags=re.S)
    text = re.sub(r"\\begin\{equation\*?\}(.*?)\\end\{equation\*?\}", lambda m: f"${m.group(1).strip().replace('&', '')}$", text, flags=re.S)
    text = re.sub(r"\$\$(.*?)\$\$", lambda m: "$" + re.sub(r"\s+", " ", m.group(1)).strip() + "$", text, flags=re.S)
    for command in ("textcolor",):
        text = unwrap_two_arg(text, command)
    for command in ("fbox", "boxed", "textbf", "emph", "underline", "textit"):
        text = unwrap_one_arg(text, command)
    text = re.sub(r"\\begin\{(?:itemize|enumerate|tcolorbox|minipage)\}(?:\[[^\]]*\])?(?:\{[^}]*\})?", " ", text)
    text = re.sub(r"\\end\{(?:itemize|enumerate|tcolorbox|minipage)\}", " ", text)
    text = re.sub(r"\\item\s*", "; ", text)
    text = re.sub(r"\\vspace\{[^}]*\}", " ", text)
    text = re.sub(r"\\newpage\b", " ", text)
    text = re.sub(r"\\addcontentsline\{[^}]*\}\{[^}]*\}\{[^}]*\}", " ", text)
    text = re.sub(r"\\(?:sub)?section\*\{[^}]*\}", " ", text)
    text = re.sub(r"\\begin\{[^}]+\}(?:\[[^\]]*\])?(?:\{[^}]*\})?", " ", text)
    text = re.sub(r"\\end\{[^}]+\}", " ", text)
    text = re.sub(r"\s*\\\\\s*", " ", text)
    text = re.sub(r"\n{2,}", "\n", text)
    text = re.sub(r"[ \t]+", " ", text)
    return text.strip(" \n\t;")


def strip_answer_fragments(box: str) -> str:
    box = re.sub(
        r"\\textbf\{Answer:\}.*?(?=(?:\n\s*Alternative form:|\n\s*\\vspace|\n\s*\\textbf\{Step|\n\s*\\end\{solutionbox\}|$))",
        " ",
        box,
        flags=re.S,
    )
    box = re.sub(
        r"\\textbf\{Therefore:\}.*?(?=(?:\n\s*Alternative form:|\n\s*\\vspace|\n\s*\\textbf\{Step|\n\s*\\end\{solutionbox\}|$))",
        " ",
        box,
        flags=re.S,
    )
    box = re.sub(r"Alternative form:.*", " ", box)
    return box


def part_label_before(section: str, position: int) -> str:
    labels = command_groups(section[:position], r"\subsection*")
    if not labels:
        return ""
    return clean_latex(labels[-1][2])


def steps_from_box(raw_box: str, part_label: str) -> list[dict[str, str]]:
    box = strip_answer_fragments(raw_box)
    matches = [
        (start, end, re.sub(r"^\s*Step\s*\d+:\s*", "", body).strip())
        for start, end, body in command_groups(box, r"\textbf")
        if re.match(r"^\s*Step\s*\d+:", body)
    ]
    steps: list[dict[str, str]] = []
    if not matches:
        body = clean_latex(box)
        if body:
            title = part_label or "Work the part"
            steps.append({"title": title, "body": body})
        return steps

    for index, (start, end, title_raw) in enumerate(matches):
        next_start = matches[index + 1][0] if index + 1 < len(matches) else len(box)
        title = clean_latex(title_raw)
        body = clean_latex(box[end:next_start])
        if not body:
            continue
        if part_label:
            title = f"{part_label} - {title}"
        steps.append({"title": title, "body": body})
    return steps


def parse_questions(source: dict) -> dict[str, dict]:
    text = source["path"].read_text(encoding="utf-8", errors="replace")
    sections = re.finditer(
        r"\\section\*\{Question\s+(\d+):[^}]*\}(.*?)(?=\\section\*\{Question\s+\d+:|\Z)",
        text,
        flags=re.S,
    )
    rows: dict[str, dict] = {}
    for section_match in sections:
        q_no = int(section_match.group(1))
        section = section_match.group(2)
        qid = f"WME01-01_{source['year']}_{source['session']}_Q{q_no:02d}"
        if qid not in FINAL_ANSWERS:
            continue
        steps: list[dict[str, str]] = []
        for box_match in re.finditer(r"\\begin\{solutionbox\}(.*?)\\end\{solutionbox\}", section, flags=re.S):
            label = part_label_before(section, box_match.start())
            steps.extend(steps_from_box(box_match.group(1), label))
        primary, secondary = TOPIC_OVERRIDES[qid]
        rows[qid] = {
            "topic": primary,
            "secondaryTopics": secondary,
            "steps": steps,
            "finalAnswer": FINAL_ANSWERS[qid],
        }
    return rows


def load_existing() -> dict:
    if not MANUAL_SOLUTIONS.exists():
        return {}
    try:
        return json.loads(MANUAL_SOLUTIONS.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return {}


def main() -> None:
    data = load_existing()
    imported = {}
    for source in SOURCES:
        imported.update(parse_questions(source))
    for qid, row in sorted(imported.items()):
        if len(row["steps"]) < 3:
            raise RuntimeError(f"{qid} imported with only {len(row['steps'])} steps")
        data[qid] = row
    MANUAL_SOLUTIONS.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Imported {len(imported)} WME01 solution seeds into {MANUAL_SOLUTIONS}")


if __name__ == "__main__":
    main()
