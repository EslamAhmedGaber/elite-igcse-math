"""Teach lead.js about IAL Pure 3 (WMA13): nav group, palette, breadcrumbs, study trail. Idempotent."""
from pathlib import Path

P = Path(__file__).resolve().parents[2] / "lead.js"
s = P.read_text(encoding="utf-8")
if '"pure3"' in s:
    raise SystemExit("lead.js already knows WMA13")

EDITS = [
    ('      pure2: "wma12",\n      mechanics1: "wme01",',
     '      pure2: "wma12",\n      pure3: "wma13",\n      mechanics1: "wme01",'),
    ('    const pathIsWma12 = pathname.includes("/ial/wma12/");\n',
     '    const pathIsWma12 = pathname.includes("/ial/wma12/");\n    const pathIsWma13 = pathname.includes("/ial/wma13/");\n'),
    ("const pathIsIal = pathIsWma11 || pathIsWma12 || pathIsWme01 ||",
     "const pathIsIal = pathIsWma11 || pathIsWma12 || pathIsWma13 || pathIsWme01 ||"),
    ('(pathIsWme01 ? "wme01" : pathIsWma12 ? "wma12" : pathIsWma11 ? "wma11" : "")',
     '(pathIsWme01 ? "wme01" : pathIsWma13 ? "wma13" : pathIsWma12 ? "wma12" : pathIsWma11 ? "wma11" : "")'),
    ('    if (course === "wma12") return "mulberry";\n',
     '    if (course === "wma12") return "mulberry";\n    if (course === "wma13") return "amber";\n'),
    ('    if (requestedCourse === "wma12" || page === "ial-wma12" || window.location.pathname.includes("/ial/wma12/")) return "pure2";\n',
     '    if (requestedCourse === "wma12" || page === "ial-wma12" || window.location.pathname.includes("/ial/wma12/")) return "pure2";\n'
     '    if (requestedCourse === "wma13" || page === "ial-wma13" || window.location.pathname.includes("/ial/wma13/")) return "pure3";\n'),
    ('    if (requestedCourse === "wma12" || path.includes("/ial/wma12/")) {\n      return { id: "pure2", label: "Pure 2", code: "WMA12", unit: "" };\n    }\n',
     '    if (requestedCourse === "wma12" || path.includes("/ial/wma12/")) {\n      return { id: "pure2", label: "Pure 2", code: "WMA12", unit: "" };\n    }\n'
     '    if (requestedCourse === "wma13" || path.includes("/ial/wma13/")) {\n      return { id: "pure3", label: "Pure 3", code: "WMA13", unit: "" };\n    }\n'),
    ('      "Pure 2": "pure2",\n', '      "Pure 2": "pure2",\n      "Pure 3": "pure3",\n'),
    ('    if (path.includes("/ial/wma11/") || path.includes("/ial/wma12/") || path.includes("/ial/wme01/")) {',
     '    if (path.includes("/ial/wma11/") || path.includes("/ial/wma12/") || path.includes("/ial/wma13/") || path.includes("/ial/wme01/")) {'),
    ('    if (id === "pure2" || id === "mechanics1") return "pure";',
     '    if (id === "pure2" || id === "pure3" || id === "mechanics1") return "pure";'),
    ('      const isWma12 = pathname.includes("/ial/wma12/") || course === "wma12";\n',
     '      const isWma12 = pathname.includes("/ial/wma12/") || course === "wma12";\n'
     '      const isWma13 = pathname.includes("/ial/wma13/") || course === "wma13";\n'),
    ('        : isWma12\n        ? { label: "Pure 2", sub: "WMA12", href: "/ial/wma12/index.html" }\n',
     '        : isWma13\n        ? { label: "Pure 3", sub: "WMA13", href: "/ial/wma13/index.html" }\n'
     '        : isWma12\n        ? { label: "Pure 2", sub: "WMA12", href: "/ial/wma12/index.html" }\n'),
    ('path.endsWith("/ial/wma12/index.html") || path.endsWith("/ial/wme01/index.html"))',
     'path.endsWith("/ial/wma12/index.html") || path.endsWith("/ial/wma13/index.html") || path.endsWith("/ial/wme01/index.html"))'),
    ('document.body?.classList.toggle("pathway-pure", groupId === "pure" || groupId === "pure2" || groupId === "mechanics1");',
     'document.body?.classList.toggle("pathway-pure", groupId === "pure" || groupId === "pure2" || groupId === "pure3" || groupId === "mechanics1");'),
    ('    } else if (requestedCourse === "wma12" || page === "ial-wma12" || window.location.pathname.includes("/ial/wma12/")) {\n      active = "pure2";\n',
     '    } else if (requestedCourse === "wma13" || page === "ial-wma13" || window.location.pathname.includes("/ial/wma13/")) {\n      active = "pure3";\n'
     '    } else if (requestedCourse === "wma12" || page === "ial-wma12" || window.location.pathname.includes("/ial/wma12/")) {\n      active = "pure2";\n'),
]
for old, new in EDITS:
    if s.count(old) != 1:
        raise SystemExit(f"lead.js anchor not found exactly once: {old[:80]!r}")
    s = s.replace(old, new)
P.write_text(s, encoding="utf-8")
print("lead.js patched for WMA13")
