"""Register IAL Pure 3 (WMA13) in course-modules.js next to Pure 2.  Idempotent: skips if already present.
python tools/wma13/register_wma13.py
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
JS = ROOT / "course-modules.js"
PAPERS = ROOT / "downloads" / "IAL" / "WMA13" / "Papers"
V = "wma13-20261020"
SESSION_LABEL = {"Jan": "Jan", "MayJune": "May/June", "Oct": "Oct"}
SESSION_ORDER = {"Jan": 1, "MayJune": 2, "Oct": 3}


def past_papers() -> str:
    rows = []
    for qp in PAPERS.glob("WMA13_*_QP.pdf"):
        _c, year, sess, _qp = qp.stem.split("_")
        rows.append((int(year), SESSION_ORDER[sess], sess))
    years = {}
    for year, _o, sess in sorted(rows, reverse=True):
        years.setdefault(year, []).append({
            "label": f"{SESSION_LABEL[sess]} {year}",
            "papers": [
                {"kind": "paper", "title": "Question paper", "href": f"downloads/IAL/WMA13/Papers/WMA13_{year}_{sess}_QP.pdf"},
                {"kind": "solution", "title": "Worked solution", "href": f"downloads/IAL/WMA13/Papers/WMA13_{year}_{sess}_Solutions.pdf?v={V}"},
            ],
        })
    data = [{"heading": str(year), "sessions": sessions} for year, sessions in years.items()]
    return "  const pureWma13PastPapers = " + indent(json.dumps(data, indent=4)) + ";\n\n"


def indent(text: str) -> str:
    return text.replace("\n", "\n  ")


def books(source: str) -> str:
    start = source.index("  const pureWma12Books = [")
    end = source.index("  const pureWme01Books = [")
    block = source[start:end]
    swaps = [
        ("pureWma12Books", "pureWma13Books"),
        ("Pure 2 Notes with Answers", "Pure 3 Visual Notes"),
        ("The 2026 Elite topic notes for Pure 2: notes, worked examples and practice, with the answers in every file.",
         "Visual notes for all 13 Pure 3 topics: key ideas, diagrams, exam tips and worked examples."),
        ("Answers included", "Exam tips included"),
        ("October 2019 to January 2026", "January 2020 to June 2026"),
        ("12 Pure 2 topics", "13 Pure 3 topics"),
        ("wma12-full-20260611", V),
        ("WMA12", "WMA13"), ("wma12", "wma13"), ("Pure 2", "Pure 3"),
    ]
    for old, new in swaps:
        block = block.replace(old, new)
    return block


def nav_group(source: str) -> str:
    start = source.index('    {\n      id: "pure2",')
    end = source.index('    {\n      id: "mechanics1",')
    block = source[start:end]
    for old, new in [
        ('id: "pure2"', 'id: "pure3"'), ('palette: "mulberry"', 'palette: "amber"'),
        ("Pure 2 now uses the full WMA12 bank from October 2019 to January 2026, with its own data, progress keys, builder state, solved bank, books, and paper rows.",
         "Pure 3 uses the full WMA13 bank from January 2020 to June 2026: 180 questions with worked solutions, its own progress keys, builder, books and paper rows."),
        ("October 2019 to January 2026", "January 2020 to June 2026"),
        ("pureWma12PastPapers", "pureWma13PastPapers"), ("pureWma12Books", "pureWma13Books"),
        ('detail: "With answers"', 'detail: "Visual notes"'),
        ("WMA12", "WMA13"), ("wma12", "wma13"), ("Pure 2", "Pure 3"),
    ]:
        block = block.replace(old, new)
    return block


def main() -> None:
    s = JS.read_text(encoding="utf-8")
    if "pureWma13PastPapers" in s:
        print("WMA13 already registered")
        return
    # data blocks
    s = s.replace("  const wme01SessionGroups = [", past_papers() + "  const wme01SessionGroups = [", 1)
    s = s.replace("  const pureWme01Books = [", books(s) + "  const pureWme01Books = [", 1)
    # palette
    s = s.replace('    teal: {\n      label: "IAL Mechanics 1",',
                  '    amber: {\n      label: "IAL Pure 3",\n      accent: "#1b4fd8",\n      accentDeep: "#143da8",\n      soft: "rgba(27, 79, 216, 0.08)",\n    },\n'
                  '    teal: {\n      label: "IAL Mechanics 1",', 1)
    # nav group after Pure 2
    s = s.replace('    {\n      id: "mechanics1",', nav_group(s) + '    {\n      id: "mechanics1",', 1)
    # site tree
    tree_pure2 = re.search(r'          \{\n            id: "pure2",\n            label: "Pure 2",.*?\n          \},\n', s, re.S).group(0)
    tree_pure3 = (tree_pure2.replace('"pure2"', '"pure3"').replace('"Pure 2"', '"Pure 3"').replace("WMA12", "WMA13")
                  .replace("wma12", "wma13").replace('"mulberry"', '"amber"'))
    s = s.replace(tree_pure2, tree_pure2 + tree_pure3, 1)
    # course list + context
    pure2_course = re.search(r'    \{ id: "wma12", name: "Pure 2".*?\n.*?\},\n', s).group(0)
    s = s.replace(pure2_course, pure2_course +
                  '    { id: "wma13", name: "Pure 3", code: "WMA13", family: "IAL", group: "pure3", query: "pathway=pure&course=wma13",\n'
                  '      blurb: "Edexcel International A Level, Pure Mathematics 3" },\n', 1)
    s = s.replace('if (["wma11", "wma12", "wme01"].includes(course)) return course;',
                  'if (["wma11", "wma12", "wma13", "wme01"].includes(course)) return course;', 1)
    s = s.replace('    if (groupId === "pure2") return "wma12";',
                  '    if (groupId === "pure2") return "wma12";\n    if (groupId === "pure3") return "wma13";', 1)
    JS.write_text(s, encoding="utf-8")
    print("WMA13 registered:", s.count("wma13"), "references")


if __name__ == "__main__":
    main()
