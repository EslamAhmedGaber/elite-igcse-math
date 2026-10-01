"""Publish the 2026 notes + Adaptive Classified books into downloads/ and write the site data files.

Inputs (built and verified first):
  private_output/notes_2026_stage     (tools/build_topic_notes_2026.py)
  private_output/adaptive_stage       (tools/build_adaptive_classified.py)
Outputs:
  downloads/<Linear|Modular|IAL/..>/Notes/...           new notes (With Answers)
  downloads/<..>/AdaptiveClassified/...                  Adaptive Classified (Questions / With Answers)
  library-data.js        window.ELITE_LIBRARY  (library.html: Notes + Adaptive Classified per course)
  linear-notes-data.js   window.ELITE_LINEAR_NOTES (notes.html, same shape as before, new files)
  ial/ial-notes-data.js  window.ELITE_IAL_NOTES    (IAL course pages, same shape as before, new files)
    python tools/build_library_data.py [--copy]
"""
import json, os, re, shutil, sys

HERE = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.dirname(HERE)
NOTES = os.path.join(SITE, "private_output", "notes_2026_stage")
ADAPT = os.path.join(SITE, "private_output", "adaptive_stage")
VER = "20261001"
CHAPTERS = {1: "Number", 2: "Algebra", 3: "Graphs and Functions", 4: "Geometry and Measures",
            5: "Vectors and Transformations", 6: "Statistics and Probability"}

COURSES = [
    ("linear", "Linear", "4MA1", "IGCSE Linear", "Linear", "Topic"),
    ("unit1", "Modular Unit 1", "4WM1", "IGCSE Modular", "Unit1", "Topic"),
    ("unit2", "Modular Unit 2", "4WM2", "IGCSE Modular", "Unit2", "Topic"),
    ("wma11", "Pure 1", "WMA11", "IAL", "WMA11", "Chapter"),
    ("wma12", "Pure 2", "WMA12", "IAL", "WMA12", "Chapter"),
    ("wme01", "Mechanics 1", "WME01", "IAL", "WME01", "Chapter"),
]
COVERAGE = {"wma11": "Past papers up to June 2026", "wma12": "Covers sessions to January 2026",
            "wme01": "Past papers up to June 2026"}


def href(rel):
    return f"downloads/{rel}?v={VER}"


def f(rec, pages_key="pages"):
    return {"href": href(rec["file"]), "pages": rec[pages_key], "mb": round(rec["bytes"] / 1e6, 1)}


def main(copy):
    nm = json.load(open(os.path.join(NOTES, "notes_2026_manifest.json"), encoding="utf-8"))
    topics = nm["topics"]
    by_key = {t["key"]: t for t in topics}
    lib = {"version": VER, "courses": {}}
    copies = []

    for cid, name, code, family, group, unit in COURSES:
        c = {"id": cid, "name": name, "code": code, "family": family, "unit": unit, "coverage": COVERAGE.get(cid, "")}
        # ---------- notes ----------
        if cid == "linear":
            lin = [t for t in topics if t["group"] == "Linear"]
            chapters = []
            for n, cname in CHAPTERS.items():
                bk = next(b for b in nm["booklets"] if b["group"] == f"Linear-CH{n}")
                tps = sorted([t for t in lin if t["chapter"] == n], key=lambda t: t["number"])
                chapters.append({"number": n, "title": cname, "booklet": f(bk),
                                 "topics": [{"num": f"{n}.{t['number']}", "title": t["title"], **f(t)} for t in tps]})
            c["notes"] = {"complete": [f(b) for b in nm["booklets"] if b["group"] == "Linear-ALL"], "chapters": chapters}
        elif cid in ("unit1", "unit2"):
            keys = nm[f"{cid}_topics"]
            c["notes"] = {"complete": [f(b) for b in nm["booklets"] if b["group"] == group.replace("Unit", "Unit")],
                          "topics": [{"num": f"{i:02d}", "title": by_key[k]["title"], "olt": by_key[k]["olt"], **f(by_key[k])}
                                     for i, k in enumerate(keys, 1)]}
        else:
            tps = [t for t in topics if t["group"] == code]
            c["notes"] = {"complete": [f(b) for b in nm["booklets"] if b["group"] == code],
                          "topics": [{"num": f"{t['number']:02d}", "title": t["title"], **f(t)} for t in tps]}
        # ---------- adaptive ----------
        am = json.load(open(os.path.join(ADAPT, f"adaptive_{group}_manifest.json"), encoding="utf-8"))
        comp = {"questions": [f(r) for r in am if r["scope"] == "Complete Book" and r["role"] == "Student"],
                "answers": [f(r) for r in am if r["scope"] == "Complete Book" and r["role"] == "Solutions"]}
        for side, role in (("questions", "Student"), ("answers", "Solutions")):
            parts = [r for r in am if r["scope"] == "Complete Book" and r["role"] == role]
            for item, r in zip(comp[side], parts):
                item["part"] = (r.get("part") or "").split(" · ")[0]
                item["range"] = (r.get("part") or "").split(" · ")[1] if r.get("part") else ""
        items = {}
        for r in am:
            if r["scope"] == "Complete Book":
                continue
            m = re.match(r"(?:Chapter (\d+)|(OL-T\d+)) · (.*)", r["scope"])
            key = m.group(1) or m.group(2)
            it = items.setdefault(key, {"code": key, "title": m.group(3)})
            it["questions" if r["role"] == "Student" else "answers"] = f(r)
        its = list(items.values())
        for i, it in enumerate(its, 1):
            it["num"] = it["code"] if unit == "Chapter" else f"{i:02d}"
        c["adaptive"] = {"complete": comp, "items": its}
        lib["courses"][cid] = c
        for r in am:
            copies.append((os.path.join(ADAPT, r["file"]), r["file"]))

    for t in topics:
        copies.append((os.path.join(NOTES, t["file"]), t["file"]))
    for b in nm["booklets"]:
        copies.append((os.path.join(NOTES, b["file"]), b["file"]))

    if copy:
        for src, rel in copies:
            dst = os.path.join(SITE, "downloads", rel)
            os.makedirs(os.path.dirname(dst), exist_ok=True)
            if not os.path.exists(dst) or os.path.getsize(dst) != os.path.getsize(src):
                shutil.copy2(src, dst)
        print("copied", len(copies), "files")

    with open(os.path.join(SITE, "library-data.js"), "w", encoding="utf-8") as fh:
        fh.write("(function () {\n  window.ELITE_LIBRARY = " + json.dumps(lib, ensure_ascii=False, indent=1) + ";\n})();\n")

    # ---------- linear-notes-data.js (same shape as before) ----------
    old = open(os.path.join(SITE, "linear-notes-data.js"), encoding="utf-8").read()
    oldd = json.JSONDecoder().raw_decode(old[old.index("= ") + 2:])[0]
    oldtopics = [t for ch in oldd["chapters"] for t in ch["topics"]]
    oldby = {t["number"]: t for t in oldtopics}
    L = lib["courses"]["linear"]
    total_pages = sum(p["pages"] for p in L["notes"]["complete"])
    data = {"course": "IGCSE Linear", "code": "4MA1", "title": "Linear Notes (with Answers)",
            "intro": "Each topic note is the full Elite topic book: notes, worked examples and practice questions, with the answers at the end.",
            "version": VER,
            "booklet": {"title": "Complete Linear 4MA1 Notes with Answers", "href": L["notes"]["complete"][0]["href"],
                        "parts": L["notes"]["complete"],
                        "detail": f"58 topic notes in {len(L['notes']['complete'])} printable parts", "pages": total_pages},
            "chapters": []}
    for ch in L["notes"]["chapters"]:
        tl = []
        for t in ch["topics"]:
            o = oldby.get(t["num"], {})
            tl.append({"chapter": f"chapter-{ch['number']}", "number": t["num"], "title": t["title"], "href": t["href"],
                       "pages": t["pages"], "focus": o.get("focus", ""),
                       "practiceHref": o.get("practiceHref", "practice.html?pathway=linear&bank=all"),
                       "practiceLabel": o.get("practiceLabel", "Open Linear practice")})
        data["chapters"].append({"id": f"chapter-{ch['number']}", "number": ch["number"],
                                 "title": f"Chapter {ch['number']}: {ch['title']}", "short": ch["title"],
                                 "href": ch["booklet"]["href"], "detail": f"{len(tl)} topic notes with answers in one chapter booklet",
                                 "pages": ch["booklet"]["pages"], "topics": tl})
    with open(os.path.join(SITE, "linear-notes-data.js"), "w", encoding="utf-8") as fh:
        fh.write("(function () {\n  window.ELITE_LINEAR_NOTES = " + json.dumps(data, ensure_ascii=False, indent=2) + ";\n})();\n")

    # ---------- ial/ial-notes-data.js: swap files, keep focus text ----------
    p = os.path.join(SITE, "ial", "ial-notes-data.js")
    s = open(p, encoding="utf-8").read()
    for cid in ("wma11", "wma12", "wme01"):
        C = lib["courses"][cid]
        code = C["code"]
        olds = re.findall(rf'href: "(downloads/IAL/{code}/StrategyNotes/{code}_\d\d_[^"]+)"', s)
        assert len(olds) == len(C["notes"]["topics"]), (cid, len(olds))
        for o, t in zip(olds, C["notes"]["topics"]):
            assert o.split(f"{code}_")[1][:2] == t["num"], (o, t["num"])
            s = s.replace(f'href: "{o}"', f'href: "{t["href"]}"', 1)
        ob = re.search(rf'href: "(downloads/IAL/{code}/StrategyNotes/{code}_Strategy_Notes_Booklet[^"]+)"', s).group(1)
        s = s.replace(ob, C["notes"]["complete"][0]["href"])
    s = s.replace("Strategy Booklet", "Notes with Answers").replace("Strategy Notes", "Notes")
    s = s.replace("topic notes collected into one printable booklet", "topic notes with answers in one printable booklet")
    assert "StrategyNotes" not in s
    open(p, "w", encoding="utf-8").write(s)
    # titles: show the new topic book names
    print("library-data.js, linear-notes-data.js, ial-notes-data.js written")


if __name__ == "__main__":
    main("--copy" in sys.argv)
