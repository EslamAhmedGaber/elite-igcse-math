"""Build the 2026 Elite topic notes for the website (lossless).

Source: Dr Eslam's topic books in D:\\Tyro4_Latex\\0 Mathematics (<topic folder>\\Elite_Edition_2026\\<SLUG>_Book.pdf and
<SLUG>_Answers.pdf), registered in OL\\00_ELITE_TOPIC_BOOKS (rebuild_all.TOPICS for O-Level, rebuild_ial.TOPICS for IAL).

Every published topic note = Book pages followed by its Answers pages ("With Answers"), merged with PyMuPDF without
re-encoding any image. Combined booklets (Linear chapters, Linear complete, Modular Unit 1/2, Pure 1, Pure 2, Mechanics 1)
are built the same way, with a bookmark per topic. A booklet over GitHub's 100 MB limit is split into Part 1 / Part 2 at
topic boundaries.

    python tools/build_topic_notes_2026.py            -> staging folder + notes_2026_manifest.json
"""
import importlib, json, os, re, sys, hashlib
import fitz

ENGINE = r"D:\Tyro4_Latex\0 Mathematics\OL\00_ELITE_TOPIC_BOOKS"
ROOT_OL = r"D:\Tyro4_Latex\0 Mathematics\OL"
ROOT_MATH = r"D:\Tyro4_Latex\0 Mathematics"
UNITS = r"D:\Tyro4_Latex\0 Mathematics\OL\00_ELITE_UPGRADE\13_PURE1_CONTRACT_CHECK_20260906"
HERE = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.dirname(HERE)
STAGE = os.path.join(SITE, "private_output", "notes_2026_stage")
LIMIT = 95_000_000          # stay under GitHub's 100 MB file limit
sys.path.insert(0, ENGINE)
os.chdir(ENGINE)

# O-Level topic order = OL-T01 .. OL-T58 (chapter by chapter, as on the site)
OL_ORDER = ["nt", "sn", "pf", "ps", "fr", "pc", "ci", "fd", "rb", "su", "uc", "rt", "rp", "er", "dp",
            "at", "ri", "eb", "fa", "cts", "af", "rf", "ap", "le", "sq", "si", "se", "fe",
            "sg", "fn", "cg", "lg", "gf", "eg", "rl", "gi", "tg", "df",
            "su4", "ap4", "bs", "ct", "apm", "cas", "vsa", "csp", "avs", "rat", "scr", "p3d",
            "vec", "tr5", "st6", "hi", "cf", "pt", "pvt", "ccp"]
CHAPTERS = {1: "Number", 2: "Algebra", 3: "Graphs and Functions", 4: "Geometry and Measures",
            5: "Vectors and Transformations", 6: "Statistics and Probability"}
IAL = {"WMA11": ("Pure 1", [k for k in ["p1is", "p1qd", "p1se", "p1iq", "p1po", "p1gf", "p1tr", "p1sl", "p1bt", "p1rd",
                                         "p1tf", "p1df", "p1in"]]),
       "WMA12": ("Pure 2", ["p2pr", "p2po", "p2ci", "p2be", "p2as", "p2gs", "p2ss", "p2ms", "p2lg", "p2te", "p2ad", "p2in"]),
       "WME01": ("Mechanics 1", ["m1qu", "m1ve", "m1kg", "m1c1", "m1c2", "m1fo", "m1n2", "m1rf", "m1mo", "m1mt"])}


def clean(s):
    return re.sub(r"[^A-Za-z0-9]+", "_", s.replace("&", "and")).strip("_")


def sha(p):
    h = hashlib.sha256()
    with open(p, "rb") as f:
        for b in iter(lambda: f.read(1 << 20), b""):
            h.update(b)
    return h.hexdigest()


def topic_sources():
    ol = importlib.import_module("rebuild_all")
    ial = importlib.import_module("rebuild_ial")
    out = {}
    for n, k in enumerate(OL_ORDER, 1):
        cfg = importlib.import_module(f"topic_{k}")
        d = os.path.join(ROOT_OL, ol.TOPICS[k][0], "Elite_Edition_2026")
        out[k] = {"key": k, "olt": f"OL-T{n:02d}", "name": cfg.NAME, "chapter": cfg.CHAPTER, "topic": cfg.TOPIC,
                  "book": os.path.join(d, f"{cfg.SLUG}_Book.pdf"), "answers": os.path.join(d, f"{cfg.SLUG}_Answers.pdf")}
    for code, (course, keys) in IAL.items():
        for n, k in enumerate(keys, 1):
            cfg = importlib.import_module(f"topic_{k}")
            d = os.path.join(ROOT_MATH, ial.TOPICS[k], "Elite_Edition_2026")
            out[k] = {"key": k, "course": code, "name": cfg.NAME, "topic": cfg.TOPIC, "number": n,
                      "book": os.path.join(d, f"{cfg.SLUG}_Book.pdf"), "answers": os.path.join(d, f"{cfg.SLUG}_Answers.pdf")}
    for t in out.values():
        for f in ("book", "answers"):
            assert os.path.exists(t[f]), t[f]
    return out


def merged(parts, title, toc_titles=None):
    """parts: list of (label, book, answers). Returns a new fitz doc (lossless copy) with bookmarks."""
    doc = fitz.open()
    toc = []
    for label, book, ans in parts:
        start = len(doc) + 1
        with fitz.open(book) as b:
            doc.insert_pdf(b)
        a0 = len(doc) + 1
        with fitz.open(ans) as a:
            doc.insert_pdf(a)
        if toc_titles is None:
            toc += [[1, "Notes and questions", start], [1, "Answers", a0]]
        else:
            toc += [[1, label, start], [2, "Notes and questions", start], [2, "Answers", a0]]
    doc.set_toc(toc)
    doc.set_metadata({"title": title, "author": "Dr Eslam Ahmed", "subject": "Elite Mathematics notes with answers",
                      "creator": "Elite IGCSE"})
    return doc


def save(doc, path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    doc.save(path, garbage=4, deflate=True)          # merges identical objects; never touches image pixels
    doc.close()
    return os.path.getsize(path)


def write_booklet(parts, base, title, records, group):
    """Write one booklet, or Part 1/Part 2/.. when it would exceed LIMIT. Parts split at topic boundaries."""
    whole = base + ".pdf"
    est = save(merged(parts, title, toc_titles=True), whole)       # try one file first
    chunks = [parts]
    if est > LIMIT:
        os.remove(whole)
        n = int(est // LIMIT) + 1
        per = -(-len(parts) // n)
        chunks = [parts[i:i + per] for i in range(0, len(parts), per)]
    outs = []
    for i, ch in enumerate(chunks, 1):
        suffix = "" if len(chunks) == 1 else f"_Part{i}"
        t = title if len(chunks) == 1 else f"{title} (Part {i} of {len(chunks)})"
        p = base + suffix + ".pdf"
        size = save(merged(ch, t, toc_titles=True), p)
        assert size < 100_000_000, (p, size)
        with fitz.open(p) as d:
            pages = len(d)
        outs.append({"file": os.path.relpath(p, STAGE).replace("\\", "/"), "title": t, "pages": pages, "bytes": size,
                     "topics": [lbl for lbl, _, _ in ch], "group": group, "sha256": sha(p)})
    records += outs
    return outs


def main():
    T = topic_sources()
    rec = {"topics": [], "booklets": []}
    # 1) one With-Answers file per topic
    for k, t in T.items():
        if "course" in t:
            folder = f"IAL/{t['course']}/Notes"
            name = f"{t['course']}_{t['number']:02d}_{clean(t['name'])}_Notes_With_Answers.pdf"
            group = t["course"]
        else:
            folder = "Linear/Notes"
            name = f"Linear_CH{t['chapter']:02d}_{t['topic']:02d}_{clean(t['name'])}_Notes_With_Answers.pdf"
            group = "Linear"
        p = os.path.join(STAGE, folder, name)
        size = save(merged([(t["name"], t["book"], t["answers"])], f"{t['name']} — Notes with Answers"), p)
        with fitz.open(p) as d, fitz.open(t["book"]) as b, fitz.open(t["answers"]) as a:
            assert len(d) == len(b) + len(a), p          # nothing dropped
            pages = len(d)
        rec["topics"].append({"key": k, "group": group, "olt": t.get("olt"), "chapter": t.get("chapter"),
                              "number": t.get("number") or t.get("topic"), "title": t["name"],
                              "file": os.path.relpath(p, STAGE).replace("\\", "/"), "pages": pages, "bytes": size,
                              "book_pages": pages - fitz.open(t["answers"]).page_count, "sha256": sha(p)})
        print("topic", name, pages, round(size / 1e6, 1), "MB")
    # 2) Linear chapter booklets + complete Linear booklet
    ol = [T[k] for k in OL_ORDER]
    for c, cname in CHAPTERS.items():
        parts = [(f"{t['chapter']}.{t['topic']} {t['name']}", t["book"], t["answers"]) for t in ol if t["chapter"] == c]
        write_booklet(parts, os.path.join(STAGE, "Linear/Notes", f"Linear_CH{c:02d}_{clean(cname)}_Notes_With_Answers_Booklet"),
                      f"Linear 4MA1 Chapter {c}: {cname} — Notes with Answers", rec["booklets"], f"Linear-CH{c}")
    write_booklet([(f"{t['chapter']}.{t['topic']} {t['name']}", t["book"], t["answers"]) for t in ol],
                  os.path.join(STAGE, "Linear/Notes", "Linear_4MA1_Complete_Notes_With_Answers_Booklet"),
                  "Linear 4MA1 Complete Notes with Answers", rec["booklets"], "Linear-ALL")
    # 3) Modular Unit 1 / Unit 2 booklets (same topic books, the unit's own topic list)
    by_olt = {t["olt"]: t for t in ol}
    for u in (1, 2):
        codes = [re.search(r"OL-T\d\d", d).group(0) for d in sorted(os.listdir(os.path.join(UNITS, f"Unit_{u}", "Topics")))]
        parts = [(f"{by_olt[c]['name']}", by_olt[c]["book"], by_olt[c]["answers"]) for c in codes]
        rec[f"unit{u}_topics"] = [by_olt[c]["key"] for c in codes]
        write_booklet(parts, os.path.join(STAGE, "Modular/Notes", f"Modular_Unit{u}_Notes_With_Answers_Booklet"),
                      f"Modular Unit {u} (4WM{u}) — Notes with Answers", rec["booklets"], f"Unit{u}")
    # 4) IAL course booklets
    for code, (course, keys) in IAL.items():
        parts = [(f"{T[k]['number']:02d} {T[k]['name']}", T[k]["book"], T[k]["answers"]) for k in keys]
        write_booklet(parts, os.path.join(STAGE, f"IAL/{code}/Notes", f"{code}_Complete_Notes_With_Answers_Booklet"),
                      f"{course} ({code}) Complete Notes with Answers", rec["booklets"], code)
    for b in rec["booklets"]:
        print("booklet", b["file"], b["pages"], round(b["bytes"] / 1e6, 1), "MB")
    json.dump(rec, open(os.path.join(STAGE, "notes_2026_manifest.json"), "w", encoding="utf-8"), indent=1, ensure_ascii=False)


if __name__ == "__main__":
    main()
