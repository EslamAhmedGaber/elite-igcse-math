"""Add IAL Pure 3 (WMA13) to the shared site scripts (builder, progress, context, compass, course page, sync).
Each edit must match exactly once; the script stops otherwise. Idempotent per file."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

WMA13_EXAM = '''    wma13: {
      id: "wma13",
      code: "WMA13",
      unitName: "Pure 3",
      label: "IAL Pure 3",
      title: "IAL Pure 3 Revision Book & Test Builder",
      heroTitle: "Build a full Pure 3 test.",
      heroCopy: "Use the same builder engine for WMA13: random mocks, hand-built tests, revision books, saved tests, marking, and printable worked solutions.",
      unitAllLabel: "All Pure 3",
      pageHref: "ial/wma13/index.html",
      topics: () => window.WMA13_TOPICS || [],
      questions: () => window.WMA13_QUESTIONS || [],
      storagePrefix: "eliteWMA13"
    },
'''
WMA13_PROGRESS = '''      wma13: {
        id: "wma13",
        code: "WMA13",
        unitName: "Pure 3",
        label: "IAL Pure 3",
        pageHref: "ial/wma13/index.html",
        topics: window.WMA13_TOPICS || [],
        questions: window.WMA13_QUESTIONS || [],
        storagePrefix: "eliteWMA13"
      },
'''

PATCHES = {
    "exam.js": [
        ('    wme01: {\n      id: "wme01",\n      code: "WME01",', WMA13_EXAM + '    wme01: {\n      id: "wme01",\n      code: "WME01",'),
        ('(pathname.includes("/ial/wme01/") ? "wme01" : pathname.includes("/ial/wma12/") ? "wma12"',
         '(pathname.includes("/ial/wme01/") ? "wme01" : pathname.includes("/ial/wma13/") ? "wma13" : pathname.includes("/ial/wma12/") ? "wma12"'),
        ('const ialPrintPalettes = { wma11: "pure", wma12: "mulberry", wme01: "teal" };',
         'const ialPrintPalettes = { wma11: "pure", wma12: "mulberry", wma13: "pure", wme01: "teal" };'),
    ],
    "exam-bootstrap.js": [
        ('const ialCourse = ["wma11", "wma12", "wme01"].includes(requested)', 'const ialCourse = ["wma11", "wma12", "wma13", "wme01"].includes(requested)'),
        ('    wma12: "ial/wma12/wma12-data.js?v=20260611a",\n', '    wma12: "ial/wma12/wma12-data.js?v=20260611a",\n    wma13: "ial/wma13/wma13-data.js?v=wma13-20261020",\n'),
    ],
    "progress.js": [
        ('      wme01: {\n        id: "wme01",\n        code: "WME01",', WMA13_PROGRESS + '      wme01: {\n        id: "wme01",\n        code: "WME01",'),
        ('else if (["wma11", "wma12", "wme01"].includes(value))', 'else if (["wma11", "wma12", "wma13", "wme01"].includes(value))'),
    ],
    "pathway-bootstrap.js": [
        ('    const pathIsWma12 = pathname.includes("/ial/wma12/");\n', '    const pathIsWma12 = pathname.includes("/ial/wma12/");\n    const pathIsWma13 = pathname.includes("/ial/wma13/");\n'),
        ("const pathIsIal = pathIsWma11 || pathIsWma12 || pathIsWme01 ||", "const pathIsIal = pathIsWma11 || pathIsWma12 || pathIsWma13 || pathIsWme01 ||"),
        ('(pathIsWme01 ? "wme01" : pathIsWma12 ? "wma12" : pathIsWma11 ? "wma11" : "")', '(pathIsWme01 ? "wme01" : pathIsWma13 ? "wma13" : pathIsWma12 ? "wma12" : pathIsWma11 ? "wma11" : "")'),
    ],
    "study-compass.js": [
        ('    if (path.includes("/ial/wma12/") || requestedCourse === "wma12") return "wma12";\n',
         '    if (path.includes("/ial/wma12/") || requestedCourse === "wma12") return "wma12";\n    if (path.includes("/ial/wma13/") || requestedCourse === "wma13") return "wma13";\n'),
        ("const ialLanding = /\\/ial\\/(wma11|wma12|wme01)\\/", "const ialLanding = /\\/ial\\/(wma11|wma12|wma13|wme01)\\/"),
        ('path.endsWith("/practice.html") || /\\/ial\\/(wma11|wma12|wme01)\\//.test(path)) return "practise";',
         'path.endsWith("/practice.html") || /\\/ial\\/(wma11|wma12|wma13|wme01)\\//.test(path)) return "practise";'),
        ('"ial-wma11", "ial-wma12", "ial-wme01"].includes(page)', '"ial-wma11", "ial-wma12", "ial-wma13", "ial-wme01"].includes(page)'),
        ("      || /\\/ial\\/(wma11|wma12|wme01)\\//.test(path);", "      || /\\/ial\\/(wma11|wma12|wma13|wme01)\\//.test(path);"),
        ('          <p><a href="/ial/wma12/index.html">Pure 2 WMA12</a></p>\n',
         '          <p><a href="/ial/wma12/index.html">Pure 2 WMA12</a></p>\n          <p><a href="/ial/wma13/index.html">Pure 3 WMA13</a></p>\n'),
    ],
    "course.js": [
        ('    wma12: { topics: 12, questions: 190, papers: 19, glyph: "Σ" },\n',
         '    wma12: { topics: 12, questions: 190, papers: 19, glyph: "Σ" },\n    wma13: { topics: 13, questions: 180, papers: 19, glyph: "eˣ" },\n'),
        ('if (["wma11", "wma12", "wme01"].includes(course.id)) {', 'if (["wma11", "wma12", "wma13", "wme01"].includes(course.id)) {'),
        ('    wma12: "wma12", pure2: "wma12", p2: "wma12",\n', '    wma12: "wma12", pure2: "wma12", p2: "wma12",\n    wma13: "wma13", pure3: "wma13", p3: "wma13",\n'),
    ],
    "cloud-progress.js": [
        ('    "eliteWMA12SolvedV1", "eliteWMA12MistakeBoxV1",\n', '    "eliteWMA12SolvedV1", "eliteWMA12MistakeBoxV1",\n    "eliteWMA13SolvedV1", "eliteWMA13MistakeBoxV1",\n'),
        ('"eliteWMA11FinalTrainerV1", "eliteWMA12FinalTrainerV1", "eliteWME01FinalTrainerV1",',
         '"eliteWMA11FinalTrainerV1", "eliteWMA12FinalTrainerV1", "eliteWMA13FinalTrainerV1", "eliteWME01FinalTrainerV1",'),
        ('"eliteMockExamV1:wma11", "eliteMockExamV1:wma12", "eliteMockExamV1:wme01"', '"eliteMockExamV1:wma11", "eliteMockExamV1:wma12", "eliteMockExamV1:wma13", "eliteMockExamV1:wme01"'),
        ('"c_linear", "c_unit1", "c_unit2", "c_wma11", "c_wma12", "c_wme01",', '"c_linear", "c_unit1", "c_unit2", "c_wma11", "c_wma12", "c_wma13", "c_wme01",'),
        ('const aliases = { p1: "wma11", pure1: "wma11", p2: "wma12", pure2: "wma12",', 'const aliases = { p1: "wma11", pure1: "wma11", p2: "wma12", pure2: "wma12", p3: "wma13", pure3: "wma13",'),
        ('if (["linear", "unit1", "unit2", "wma11", "wma12", "wme01"].includes(fromName))', 'if (["linear", "unit1", "unit2", "wma11", "wma12", "wma13", "wme01"].includes(fromName))'),
        ("const ial = path.match(/\\/ial\\/(wma11|wma12|wme01)\\//);", "const ial = path.match(/\\/ial\\/(wma11|wma12|wma13|wme01)\\//);"),
    ],
    "stats.js": [
        ('["c_wma12", "Pure 2"], ["c_wme01", "Mechanics 1"]', '["c_wma12", "Pure 2"], ["c_wma13", "Pure 3"], ["c_wme01", "Mechanics 1"]'),
    ],
    "members.js": [
        ('wma12: "Pure 2", wme01: "Mechanics 1" };', 'wma12: "Pure 2", wma13: "Pure 3", wme01: "Mechanics 1" };'),
    ],
}


def main() -> None:
    for name, edits in PATCHES.items():
        path = ROOT / name
        text = path.read_text(encoding="utf-8")
        if "wma13" in text.lower() and name not in ("cloud-progress.js",):
            print(f"{name}: already has WMA13, skipped")
            continue
        if name == "cloud-progress.js" and "eliteWMA13SolvedV1" in text:
            print(f"{name}: already has WMA13, skipped")
            continue
        for old, new in edits:
            if text.count(old) != 1:
                raise SystemExit(f"{name}: anchor not found exactly once: {old[:90]!r}")
            text = text.replace(old, new)
        path.write_text(text, encoding="utf-8")
        print(f"{name}: {len(edits)} edits")


if __name__ == "__main__":
    main()
