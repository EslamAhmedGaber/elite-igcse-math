"""Add IAL Pure 3 (WMA13) to the remaining pages/scripts (progress, teacher groups, renderers, footers)."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
P12 = '<p><a href="ial/wma12/index.html">IAL Pure 2 &middot; WMA12</a></p>'
P13 = '<p><a href="ial/wma13/index.html">IAL Pure 3 &middot; WMA13</a></p>'

PATCHES = {
    "progress.html": [
        ('  <script defer src="ial/wma12/wma12-data.js?v=20260611a"></script>\n',
         '  <script defer src="ial/wma12/wma12-data.js?v=20260611a"></script>\n  <script defer src="ial/wma13/wma13-data.js?v=wma13-20261020"></script>\n'),
        ('          <option value="wma12">Pure 2</option>\n', '          <option value="wma12">Pure 2</option>\n          <option value="wma13">Pure 3</option>\n'),
    ],
    "progress.js": [
        ('    "WMA12",\n    "WME01",', '    "WMA12",\n    "WMA13",\n    "WME01",'),
    ],
    "teacher-groups.js": [
        ('    wme01: { label: "IAL Mechanics 1 WME01",',
         '    wma13: { label: "IAL Pure 3 WMA13", script: "ial/wma13/wma13-data.js?v=wma13-20261020", topics: () => (window.WMA13_TOPICS || []).map((topic) => ({ name: topic.name, chapter: "Pure 3" })) },\n'
         '    wme01: { label: "IAL Mechanics 1 WME01",'),
    ],
    "course-renderers.js": [
        ('      pure2: "pure2",\n      wme01: "mechanics1",', '      pure2: "pure2",\n      wma13: "pure3",\n      pure3: "pure3",\n      wme01: "mechanics1",'),
        ('    if (hash.includes("wma12")) return "pure2";\n', '    if (hash.includes("wma12")) return "pure2";\n    if (hash.includes("wma13")) return "pure3";\n'),
        ('meta: ["Linear 4MA1", "Modular 4WM", "IAL WMA11/WMA12/WME01"]', 'meta: ["Linear 4MA1", "Modular 4WM", "IAL WMA11/WMA12/WMA13/WME01"]'),
    ],
    "pastpapers.html": [(P12, P12 + "\n        " + P13)],
    "ial/index.html": [(P12, P12 + "\n        " + P13)],
    "notes.html": [
        ('<p><a href="ial/wma12/index.html#ialNotes">Pure 2 notes</a></p>',
         '<p><a href="ial/wma12/index.html#ialNotes">Pure 2 notes</a></p>\n        <p><a href="ial/wma13/index.html#ialNotes">Pure 3 notes</a></p>'),
    ],
}


def main() -> None:
    for name, edits in PATCHES.items():
        path = ROOT / name
        text = path.read_text(encoding="utf-8")
        if "wma13" in text.lower() and name not in ("progress.js",):
            print(f"{name}: already has WMA13, skipped")
            continue
        if name == "progress.js" and '"WMA13",' in text:
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
