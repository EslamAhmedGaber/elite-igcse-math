"""Render the public Egyptian Baccalaureate question bank as image cards.

The generated images are question-only cards for the browser question bank.
They are intentionally separate from the printable PDFs: a browser test needs
one stable image per question, while a downloadable book needs page order and
working space.  LaTeX is compiled once for a batch and the pages are then
exported to PNG, preserving the exact TeX notation used in the approved
records.
"""

from __future__ import annotations

import argparse
import json
import re
import shutil
import subprocess
import tempfile
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_STAGE = Path(r"D:\Tyro4_Latex\البكالوريا المصرية 2026_STUDIO_DESIGN\website_release_staging_20260902")
DATA_REL = Path("data/EgyptianBaccalaureate/2026/English/questions.json")
IMAGE_REL = Path("assets/questions/EgyptianBaccalaureate/2026/English/cards")
ASSET_ROOT_REL = Path("assets/questions/EgyptianBaccalaureate/2026/English")


def tex_escape_text(value: str) -> str:
    # Prompt strings contain TeX inline math.  Remove invisible copy artefacts
    # and keep normal math delimiters/commands intact.
    text = str(value or "").replace("\u200b", "").replace("\r", "").replace("\n", " ")
    # A small subset of generated source records contains JSON-escaped TeX
    # commands twice (``\\\\(`` instead of ``\\(``).  Collapse only repeated
    # backslashes so these remain valid inline mathematics.
    return re.sub(r"\\\\+", r"\\", text)


def safe_id(value: str) -> str:
    return re.sub(r"[^A-Za-z0-9_-]+", "_", value).strip("_") or "question"


def option_tex(value: str) -> str:
    text = tex_escape_text(value).strip()
    if "\\(" in text or "\\[" in text:
        return text
    # Some source-derived options are short mathematical strings without
    # delimiters (for example ``45^\\circ`` or ``E[X]^2``).  Put only these
    # math-like options into inline math; ordinary English options stay text.
    if re.search(r"(?:\^|\\[A-Za-z]+|[=<>]|\b(?:sqrt|sin|cos|tan)\b)", text):
        text = re.sub(r"^sqrt\((.*)\)$", r"\\sqrt{\1}", text)
        return rf"\({text}\)"
    return text


def records_from(stage: Path) -> list[dict]:
    payload = json.loads((stage / DATA_REL).read_text(encoding="utf-8"))
    return list(payload.get("records", []))


def visual_asset_path(stage: Path, record: dict) -> Path | None:
    """Resolve the exact staged visual asset for a question, if one exists."""
    visual = record.get("visual_asset")
    if not visual:
        return None
    manifest_path = stage / ASSET_ROOT_REL / "manifest.json"
    if manifest_path.exists():
        try:
            manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
            asset_id = visual.get("asset_id") if isinstance(visual, dict) else None
            for item in manifest.get("assets", []):
                if item.get("source_question_id") == record.get("id") or (asset_id and item.get("asset_id") == asset_id):
                    candidate = stage / item["path"]
                    if candidate.exists():
                        return candidate
        except (OSError, ValueError, KeyError, TypeError):
            pass
    requested = visual.get("file") if isinstance(visual, dict) else visual
    if requested:
        requested_stem = re.sub(r"q(?=\d)", "", re.sub(r"[^a-z0-9]+", "", Path(requested).stem.lower()))
        for candidate in (stage / ASSET_ROOT_REL).glob("*"):
            candidate_stem = re.sub(r"q(?=\d)", "", re.sub(r"[^a-z0-9]+", "", candidate.stem.lower()))
            if candidate_stem == requested_stem or candidate_stem.startswith(requested_stem) or requested_stem.startswith(candidate_stem):
                return candidate
    return None


def card_tex(stage: Path, record: dict, page_number: int) -> str:
    item_id = tex_escape_text(record.get("id", ""))
    chapter = tex_escape_text(record.get("chapter_id", ""))
    concept = tex_escape_text(record.get("concept_title", ""))
    family = tex_escape_text(record.get("family_id", ""))
    stem = tex_escape_text(record.get("stem") or record.get("prompt") or "")
    fmt = tex_escape_text(record.get("format", "written")).upper()
    options = record.get("options") if isinstance(record.get("options"), list) else []
    option_lines = ""
    if options:
        labels = "ABCDEFGH"
        rows = []
        for index, option in enumerate(options):
            rows.append(rf"\item[\textbf{{{labels[index]}.}}] {option_tex(option)}")
        option_lines = "\n\\begin{description}[leftmargin=16mm,style=multiline,labelsep=2mm,itemsep=2mm]\n" + "\n".join(rows) + "\n\\end{description}"
    figure_lines = ""
    figure_path = visual_asset_path(stage, record)
    if figure_path:
        figure_tex_path = figure_path.as_posix().replace("\\", "/")
        figure_lines = rf"\vspace{{2mm}}\begin{{center}}\includegraphics[width=0.56\linewidth,height=42mm,keepaspectratio]{{\detokenize{{{figure_tex_path}}}}}\end{{center}}"
    return rf"""
\newpage
\thispagestyle{{empty}}
\begin{{tikzpicture}}[remember picture,overlay]
  \fill[black!3,rounded corners=5pt] (current page.north west) ++(10mm,-10mm) rectangle ([xshift=-10mm,yshift=10mm]current page.south east);
  \fill[black!80] (current page.north west) ++(10mm,-10mm) rectangle ([xshift=17mm,yshift=10mm]current page.south east);
\end{{tikzpicture}}
\vspace*{{13mm}}
\hspace*{{20mm}}\begin{{minipage}}[t][118mm][t]{{225mm}}
{{\sffamily\color{{black!55}}\footnotesize Egyptian Baccalaureate Mathematics 2026\hfill {chapter} · {fmt}}}\\[2mm]
{{\sffamily\bfseries\Large {item_id}}}\\[-1mm]
{{\sffamily\color{{black!55}}\small {concept} · {family}}}\\[5mm]
{{\sffamily\bfseries\fontsize{{17}}{{22}}\selectfont {stem}}}
{figure_lines}
{option_lines}
\vfill
{{\sffamily\color{{black!48}}\scriptsize eliteigcse.com · Dr Eslam Ahmed · Cairo University Faculty of Engineering}}
\end{{minipage}}
"""


def make_tex(stage: Path, records: list[dict], tex_path: Path) -> None:
    body = "".join(card_tex(stage, record, index + 1) for index, record in enumerate(records))
    source = rf"""\documentclass{{article}}
\usepackage{{fontspec}}
\usepackage{{amsmath,amssymb,mathtools}}
\usepackage{{graphicx}}
\usepackage{{tikz}}
\usepackage{{enumitem}}
\usepackage{{xcolor}}
\usepackage[paperwidth=260mm,paperheight=150mm,margin=0mm]{{geometry}}
\setmainfont{{Arial}}
\pagestyle{{empty}}
\setlength{{\parindent}}{{0pt}}
\begin{{document}}
{body}
\end{{document}}
"""
    tex_path.write_text(source, encoding="utf-8")


def render(stage: Path, records: list[dict], batch_name: str, dpi: int) -> list[dict]:
    output_cards = stage / IMAGE_REL
    output_cards.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="eb_cards_") as temp_name:
        temp = Path(temp_name)
        tex_path = temp / f"{batch_name}.tex"
        make_tex(stage, records, tex_path)
        command = ["xelatex", "-interaction=nonstopmode", "-halt-on-error", "-output-directory", str(temp), str(tex_path)]
        first = subprocess.run(command, capture_output=True, text=True, encoding="utf-8", errors="replace")
        if first.returncode:
            log_path = stage / "QA" / f"{batch_name}_xelatex.log"
            log_path.parent.mkdir(parents=True, exist_ok=True)
            log_path.write_text(first.stdout + "\n" + first.stderr, encoding="utf-8")
            raise RuntimeError(f"XeLaTeX failed; inspect {log_path}")
        pdf = temp / f"{batch_name}.pdf"
        # PyMuPDF avoids shell-dependent raster tools and writes compact PNGs.
        import fitz  # type: ignore

        document = fitz.open(pdf)
        if len(document) != len(records):
            raise RuntimeError(f"Rendered {len(document)} pages for {len(records)} records")
        rendered = []
        for index, record in enumerate(records):
            page = document[index]
            pixmap = page.get_pixmap(dpi=dpi, alpha=False)
            filename = f"{safe_id(record['id'])}.png"
            destination = output_cards / filename
            pixmap.save(str(destination))
            rendered.append({"id": record["id"], "image": (IMAGE_REL / filename).as_posix(), "width": pixmap.width, "height": pixmap.height})
        document.close()
    # Bind the rendered card path back to the browser question records.  The
    # image and metadata therefore share one stable ID and can be consumed by
    # the existing random/mock renderer without any path guessing.
    question_path = stage / DATA_REL
    payload = json.loads(question_path.read_text(encoding="utf-8"))
    rendered_by_id = {item["id"]: item for item in rendered}
    for item in payload.get("records", []):
        card = rendered_by_id.get(item.get("id"))
        if card:
            item["image"] = card["image"]
            item["image_width"] = card["width"]
            item["image_height"] = card["height"]
            item["image_dpi"] = dpi
    question_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return rendered


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--stage-root", type=Path, default=DEFAULT_STAGE)
    parser.add_argument("--limit", type=int, default=0, help="Render only the first N records (smoke test).")
    parser.add_argument("--offset", type=int, default=0)
    parser.add_argument("--dpi", type=int, default=144)
    parser.add_argument("--batch", default="egyptian_baccalaureate_cards")
    parser.add_argument("--rebind-only", action="store_true", help="Bind already-rendered card files into questions.json.")
    args = parser.parse_args()
    stage = args.stage_root.resolve()
    records = records_from(stage)
    if args.rebind_only:
        card_root = stage / IMAGE_REL
        payload_path = stage / DATA_REL
        payload = json.loads(payload_path.read_text(encoding="utf-8"))
        count = 0
        for item in payload.get("records", []):
            card = card_root / f"{safe_id(item.get('id', ''))}.png"
            if card.exists():
                item["image"] = (IMAGE_REL / card.name).as_posix()
                from PIL import Image  # type: ignore

                with Image.open(card) as image:
                    item["image_width"], item["image_height"] = image.size
                item["image_dpi"] = args.dpi
                count += 1
        payload_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(json.dumps({"rebound": count, "records": len(records)}, ensure_ascii=True))
        return
    selected = records[args.offset : args.offset + args.limit if args.limit else None]
    if not selected:
        raise SystemExit("No records selected")
    rendered = render(stage, selected, args.batch, args.dpi)
    print(json.dumps({"selected": len(selected), "first": selected[0]["id"], "last": selected[-1]["id"], "images": rendered[:3]}, ensure_ascii=True))


if __name__ == "__main__":
    main()
