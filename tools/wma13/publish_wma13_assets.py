"""Copy the Pure 3 (WMA13) student files into downloads/IAL/WMA13 and write the notes entry.

- Notes: the Pure 3 visual notes (13 chapters + complete book) from D:/Tyro4_Latex/0 Mathematics/Pure3/05_Visual_Notes
  (the newer *_NEW.pdf is used when a viewer had the main file locked).
- Papers: the 19 official question papers from the sealed Pure 3 V4 canonical sources.
python tools/wma13/publish_wma13_assets.py
"""
from __future__ import annotations

import json
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
NOTES_SRC = Path(r"D:/Tyro4_Latex/0 Mathematics/Pure3/05_Visual_Notes")
CANON = Path(r"C:/Users/Eslam/Documents/Codex/2026-10-15/d-tyro4-latex-0-mathematics-pure/work/pure3_v4/source/canonical")
OUT = ROOT / "downloads" / "IAL" / "WMA13"
VERSION = "20261020"

CHAPTERS = [
    ("01_RationalAlgebra", "C01_Rational_Algebra", "Rational Algebra", "simplifying, partial fractions, rational equations"),
    ("02_Functions", "C02_Functions", "Functions", "domain, range, composite and inverse functions"),
    ("03_GraphTransformations", "C03_Graph_Transformations", "Graph Transformations", "translations, stretches, reflections, sketches"),
    ("04_Modulus", "C04_Modulus", "Modulus", "modulus graphs, equations and inequalities"),
    ("05_TrigFunctions", "C05_Trig_Functions", "Trigonometric Functions", "sec, cosec, cot and inverse trig graphs"),
    ("06_TrigIdentities", "C06_Trig_Identities", "Trig Identities", "addition, double-angle formulae and exact values"),
    ("07_TrigEquations", "C07_Trig_Equations_R_Form", "Trig Equations & R-Form", "harmonic form, max/min, solving in a range"),
    ("08_ExponentialsLogs", "C08_Exp_and_Ln", "Exponentials & Logarithms", "e^x, ln x, solving and rearranging"),
    ("09_LogGraphsModels", "C09_Log_Graphs_and_Models", "Log Graphs & Models", "straight-line log graphs, growth and decay models"),
    ("10_DifferentiationTechniques", "C10_Differentiation", "Differentiation", "chain, product, quotient rules and trig/exp/ln"),
    ("11_ApplicationsOfDifferentiation", "C11_Applications_of_Differentiation", "Applications of Differentiation", "tangents, stationary points, rates, dx/dy"),
    ("12_Integration", "C12_Integration", "Integration", "standard integrals, reverse chain rule, areas"),
    ("13_NumericalMethods", "C13_Numerical_Methods", "Numerical Methods", "change of sign, iteration, Newton-Raphson"),
]


def newest(main: Path) -> Path:
    alt = main.with_name(main.stem + "_NEW.pdf")
    if alt.exists() and alt.stat().st_mtime > main.stat().st_mtime:
        return alt
    return main


def main() -> None:
    notes_out = OUT / "Notes"
    notes_out.mkdir(parents=True, exist_ok=True)
    topics = []
    for slug, folder, title, focus in CHAPTERS:
        src = newest(NOTES_SRC / folder / f"P3_{folder}_Visual_Notes.pdf")
        name = f"WMA13_{slug[:2]}_{folder[4:]}_Visual_Notes.pdf"
        shutil.copy2(src, notes_out / name)
        topics.append({"slug": slug, "title": title, "href": f"downloads/IAL/WMA13/Notes/{name}?v={VERSION}", "focus": focus})
    complete = newest(NOTES_SRC / "00_Complete" / "P3_Complete_Visual_Notes.pdf")
    shutil.copy2(complete, notes_out / "WMA13_Complete_Visual_Notes.pdf")

    papers_out = OUT / "Papers"
    papers_out.mkdir(parents=True, exist_ok=True)
    count = 0
    for qp in sorted(CANON.glob("PEDEXCEL_WMA13_*_QP*.pdf")):  # June 2024 is the official R2 paper
        year, sess = qp.stem.split("_")[2:4]
        code = {"JAN": "Jan", "JUN": "MayJune", "OCT": "Oct"}[sess]
        shutil.copy2(qp, papers_out / f"WMA13_{year}_{code}_QP.pdf")
        count += 1

    entry = {
        "course": "IAL Pure 3", "code": "WMA13", "title": "Pure 3 Notes",
        "intro": "Visual notes for every Pure 3 topic: key ideas, diagrams, exam tips and worked examples. Read the topic, then practise its classified questions.",
        "booklet": {"title": "Complete Pure 3 Visual Notes", "href": f"downloads/IAL/WMA13/Notes/WMA13_Complete_Visual_Notes.pdf?v={VERSION}",
                    "detail": "13 topics in one printable book"},
        "topics": topics,
    }
    (ROOT / "private_output").mkdir(exist_ok=True)
    (ROOT / "private_output" / "wma13_notes_entry.json").write_text(json.dumps(entry, indent=1), encoding="utf-8")
    print(f"WMA13 assets: {len(topics)} topic notes + complete book, {count} question papers")


if __name__ == "__main__":
    main()
