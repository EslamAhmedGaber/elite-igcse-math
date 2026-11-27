"""Export the reviewed Modular V7 unit books as individually selectable questions."""
import argparse
import json
import re
import zipfile
from pathlib import Path

import fitz
from PIL import Image, ImageChops


def render(page, clip):
    pix = page.get_pixmap(matrix=fitz.Matrix(2.4, 2.4), clip=clip, alpha=False)
    return Image.frombytes("RGB", (pix.width, pix.height), pix.samples)


def write_image(image, path):
    path.parent.mkdir(parents=True, exist_ok=True)
    image.quantize(colors=128, dither=Image.Dither.NONE).save(path, optimize=True)


def export_topic(topic, unit, out):
    key = f"U{unit}{topic.name[:3]}"
    source = topic / "01 - Unit practice"
    books = [next(source.glob(f"*V7* - {role}.pdf")) for role in ("Student", "Solutions")]
    rows = []
    with fitz.open(books[0]) as student, fitz.open(books[1]) as teacher:
        assert len(student) == len(teacher)
        for n in range(1, len(student)):
            page = student[n]
            header = next(b for b in page.get_text("blocks") if b[4].startswith(f"Question {n}\n"))
            marks = int(re.search(r"(\d+) marks?\b", header[4]).group(1))
            # The white interior below the numbered heading includes all labels and vector figures.
            box = next(d["rect"] for d in page.get_drawings() if d["fill"] == (1, 1, 1)
                       and d["rect"].width > 500 and abs(d["rect"].y0-header[3]) < 6)
            clip = fitz.Rect(box.x0+4, box.y0+1, box.x1-2, box.y1-1)
            words = page.get_textbox(clip).strip()
            assert words and "WORKING" not in words and "WORKED SOLUTION" not in words, (key,n)
            pic = render(page, clip)
            # Remove vertical white margins only, retaining the common print width.
            ink = ImageChops.difference(pic, Image.new("RGB", pic.size, "white")).getbbox()
            assert ink, (key,n)
            pic = pic.crop((0, max(0,ink[1]-6),pic.width,min(pic.height,ink[3]+6)))
            qid = f"{key}-Q{n:02}"
            write_image(pic, out / "assets/questions/modular-v7" / f"{qid}.png")
            sol = teacher[n]
            heading = sol.search_for("WORKED SOLUTION")[0]
            box = next(d["rect"] for d in sol.get_drawings() if d["fill"] and 490<d["rect"].width<505
                       and d["rect"].contains(heading))
            clip = fitz.Rect(box.x0+3,heading.y1+.2,box.x1-1,box.y1-1)
            assert sol.get_textbox(clip).strip(), (qid, "missing solution")
            answer = render(sol, clip)
            if key == "U2T34":
                with zipfile.ZipFile(next(source.glob("*.zip"))) as archive:
                    with fitz.open(stream=archive.read(f"graphs/{n:02}-sol.pdf"), filetype="pdf") as g:
                        graph = render(g[0], g[0].rect)
                joined = Image.new("RGB", (max(graph.width,answer.width), graph.height+answer.height), "white")
                joined.paste(graph, ((joined.width-graph.width)//2,0))
                joined.paste(answer, ((joined.width-answer.width)//2,graph.height))
                answer = joined
            write_image(answer, out / "assets/solution-diagrams/modular-v7" / f"{qid}.png")
            rows.append({"marks":marks,"text":" ".join(words.split())})
    return {"id":key, "title":topic.name[6:], "unit":unit, "chapter":topic.parent.name,"questions":rows}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("ol", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    lessons = [export_topic(t,u,args.output) for u in (1,2)
               for t in sorted((args.ol/f"Unit {u}").glob("Chapter */T*")) if t.is_dir()]
    counts = [sum(len(t["questions"]) for t in lessons if t["unit"]==u) for u in (1,2)]
    assert counts == [492,444] and len(lessons)==69
    dest = args.output/"data/modular-v7-lessons.js"
    dest.parent.mkdir(parents=True,exist_ok=True)
    dest.write_text("window.ELITE_V7_LESSONS = "+json.dumps(lessons,ensure_ascii=False,separators=(",",":"))+";\n",encoding="utf-8")
    print(len(lessons), counts)


if __name__ == "__main__":
    main()
