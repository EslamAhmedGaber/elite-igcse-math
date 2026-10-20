"""Write tools/wma13/wma13_library.json (the Pure 3 entry of library-data.js) and merge it into library-data.js.
tools/build_library_data.py also merges this file, so a full regeneration keeps Pure 3.
python tools/wma13/write_wma13_library.py
"""
import json
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
NOTES = ROOT / "downloads" / "IAL" / "WMA13" / "Notes"
ENTRY = Path(__file__).with_name("wma13_library.json")
VER = "20261020"
TITLES = {
    "01": "Rational Algebra", "02": "Functions", "03": "Graph Transformations", "04": "Modulus",
    "05": "Trigonometric Functions", "06": "Trig Identities", "07": "Trig Equations and R-Form",
    "08": "Exponentials and Logarithms", "09": "Log Graphs and Models", "10": "Differentiation",
    "11": "Applications of Differentiation", "12": "Integration", "13": "Numerical Methods",
}


def pages(pdf: Path) -> int:
    out = subprocess.run(["pdfinfo", str(pdf)], capture_output=True, text=True, check=True).stdout
    return int(re.search(r"^Pages:\s+(\d+)", out, re.M).group(1))


def rec(pdf: Path) -> dict:
    return {"href": f"downloads/IAL/WMA13/Notes/{pdf.name}?v={VER}", "pages": pages(pdf), "mb": round(pdf.stat().st_size / 1e6, 1)}


def main() -> None:
    topics = []
    for pdf in sorted(NOTES.glob("WMA13_[0-9][0-9]_*_Visual_Notes.pdf")):
        num = pdf.name.split("_")[1]
        topics.append({"num": num, "title": TITLES[num], **rec(pdf)})
    entry = {"id": "wma13", "name": "Pure 3", "code": "WMA13", "family": "IAL", "unit": "Chapter",
             "coverage": "Past papers up to June 2026",
             "notes": {"complete": [rec(NOTES / "WMA13_Complete_Visual_Notes.pdf")], "topics": topics}}
    ENTRY.write_text(json.dumps(entry, indent=1, ensure_ascii=False), encoding="utf-8")

    path = ROOT / "library-data.js"
    text = path.read_text(encoding="utf-8")
    head = "window.ELITE_LIBRARY = "
    start = text.index(head) + len(head)
    lib, end = json.JSONDecoder().raw_decode(text[start:])
    courses = lib["courses"]
    ordered = {}
    for key, value in courses.items():
        if key == "wma13":
            continue
        ordered[key] = value
        if key == "wma12":
            ordered["wma13"] = entry
    ordered.setdefault("wma13", entry)
    lib["courses"] = ordered
    path.write_text(text[:start] + json.dumps(lib, ensure_ascii=False, indent=1) + text[start + end:], encoding="utf-8")
    print(f"WMA13 library entry: {len(topics)} topics, complete book {entry['notes']['complete'][0]['pages']} pages")


if __name__ == "__main__":
    main()
