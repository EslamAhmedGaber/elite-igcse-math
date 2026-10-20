"""Create ial/wma13/{index.html,wma13.js,wma13.css} from the Pure 2 page (same features, Pure 3 data).
python tools/wma13/clone_wma13_page.py
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "ial" / "wma12"
DST = ROOT / "ial" / "wma13"
VERSION = "wma13-20261020"

# Order matters: specific phrases first, then the course code/name swap.
TEXT = [
    ("October 2019 to January 2026", "January 2020 to June 2026"),
    ("WMA12_Complete_Notes_With_Answers_Booklet.pdf?v=20261001", f"WMA13_Complete_Visual_Notes.pdf?v=20261020"),
    ("Notes with Answers", "Visual Notes"),
    ("?v=wma12-full-20260611", f"?v={VERSION}"),
    ("wma12-data.js?v=20260611b", f"wma13-data.js?v={VERSION}"),
    ("wma12.js?v=20260929a", f"wma13.js?v={VERSION}"),
    ("wma12.css?v=20260619a", f"wma13.css?v={VERSION}"),
    ("12 Pure 2 topics", "13 Pure 3 topics"),
    ("across the 12-topic map", "across the 13-topic map"),
    ("Study the Pure 2 strategy, then practise the exact topic", "Read the Pure 3 visual notes, then practise the exact topic"),
    ("Each note is mined from the WMA12 classified questions and worked solutions, with harder variants written into the strategy instead of left as exceptions.",
     "Visual notes for each topic: key ideas, diagrams, exam tips and worked examples. Open a topic, then practise its classified questions."),
    (">190<", ">180<"),
    # Pure 3 identity colour is amber (#a3611a), not Pure 2's mulberry.
    ("#8a3f6c", "#a3611a"), ("#5c274d", "#6e3f0f"), ("#f8eef5", "#fbf1e3"), ("#fff7fc", "#fffaf2"),
    ("#f0dbe8", "#f3e2c8"), ("#fffafe", "#fffdf8"), ("rgba(138, 63, 108,", "rgba(163, 97, 26,"),
    ("WMA12", "WMA13"),
    ("wma12", "wma13"),
    ("Pure 2", "Pure 3"),
    ("Pure2", "Pure3"),
]


def convert(text: str) -> str:
    for old, new in TEXT:
        text = text.replace(old, new)
    return text


def main() -> None:
    DST.mkdir(parents=True, exist_ok=True)
    for src_name, dst_name in (("index.html", "index.html"), ("wma12.js", "wma13.js"), ("wma12.css", "wma13.css")):
        text = convert((SRC / src_name).read_text(encoding="utf-8"))
        (DST / dst_name).write_text(text, encoding="utf-8")
        left = [line.strip()[:120] for line in text.splitlines() if "190" in line or "2019" in line]
        print(dst_name, "check:", left[:6])


if __name__ == "__main__":
    main()
