"""Elite Adaptive Classified books for the website — visual front-matter upgrade, content untouched.

For every source book (Student = questions, Solutions = questions + worked solutions):
  * the old cover / contents pages at the front are removed (asserted to contain no question or solution content);
  * a new Elite cover and a clickable contents page are added;
  * bookmarks are rebuilt (topic -> family where the source has families);
  * PDF page labels make the viewer's page numbers match the printed footers;
  * every content page is copied unchanged and in order; the text of each kept page is compared with its source page.
A book over GitHub's 100 MB limit is split at topic boundaries into Part 1 / Part 2 / ... (each with its own cover).

Approved sources (Dr Eslam, 2026-10-01):
  Pure 1 / Pure 2 / Mechanics 1 : <course>\\02_Classified\\Current_Ruled_Edition_Review_Candidate (Combined + Chapters)
  Linear, Modular Unit 1 / 2    : Elite_Classified_Review_20260906 Navigation v3 (complete) +
                                  OL\\00_ELITE_UPGRADE\\13_PURE1_CONTRACT_CHECK_20260906\\<Linear|Unit_n>\\Topics (by topic)
    python tools/build_adaptive_classified.py [course ...]     course = WMA11 WMA12 WME01 Linear Unit1 Unit2
"""
import glob, hashlib, json, os, re, sys
import fitz

MATH = r"D:\Tyro4_Latex\0 Mathematics"
REVIEW = os.path.join(MATH, "Elite_Classified_Review_20260906")
CONTRACT = os.path.join(MATH, r"OL\00_ELITE_UPGRADE\13_PURE1_CONTRACT_CHECK_20260906")
FONTS = os.path.join(MATH, r"OL\00_ELITE_UPGRADE\13_ELITE_DESIGN_SYSTEM\assets")
HERE = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.dirname(HERE)
STAGE = os.path.join(SITE, "private_output", "adaptive_stage")
LIMIT = 95_000_000
NAVY, ROYAL, SKY, PALE, INK = "#14254A", "#2456C9", "#6FA3EF", "#EAF2FE", "#1E2430"

COURSES = {
    "WMA11": {"name": "Pure 1", "level": "Pearson Edexcel International A Level", "unit": "Chapter",
              "root": os.path.join(MATH, r"Pure 1\02_Classified\Current_Ruled_Edition_Review_Candidate"),
              "coverage": "Past papers up to June 2026", "out": "IAL/WMA11/AdaptiveClassified"},
    "WMA12": {"name": "Pure 2", "level": "Pearson Edexcel International A Level", "unit": "Chapter",
              "root": os.path.join(MATH, r"Pure 2\02_Classified\Current_Ruled_Edition_Review_Candidate"),
              "coverage": "Past papers up to January 2026", "out": "IAL/WMA12/AdaptiveClassified"},
    "WME01": {"name": "Mechanics 1", "level": "Pearson Edexcel International A Level", "unit": "Chapter",
              "root": os.path.join(MATH, r"Mechanics 1\02_Classified\Current_Ruled_Edition_Review_Candidate"),
              "coverage": "Past papers up to June 2026", "out": "IAL/WME01/AdaptiveClassified"},
    "Linear": {"name": "Linear 4MA1", "level": "Pearson Edexcel International GCSE", "unit": "Topic",
               "complete": os.path.join(REVIEW, "Linear"), "topics": os.path.join(CONTRACT, "Linear", "Topics"),
               "coverage": "", "out": "Linear/AdaptiveClassified"},
    "Unit1": {"name": "Modular Unit 1", "level": "Pearson Edexcel International GCSE", "unit": "Topic",
              "complete": os.path.join(REVIEW, "Unit_1"), "topics": os.path.join(CONTRACT, "Unit_1", "Topics"),
              "coverage": "", "out": "Modular/AdaptiveClassified/Unit1"},
    "Unit2": {"name": "Modular Unit 2", "level": "Pearson Edexcel International GCSE", "unit": "Topic",
              "complete": os.path.join(REVIEW, "Unit_2"), "topics": os.path.join(CONTRACT, "Unit_2", "Topics"),
              "coverage": "", "out": "Modular/AdaptiveClassified/Unit2"},
}
ROLE = {"Student": ("Questions", "Student book · questions with writing space"),
        "Solutions": ("With Answers", "Questions with full worked solutions")}

# nicer topic titles for OL-T codes (from the 2026 notes manifest)
_notes = json.load(open(os.path.join(SITE, "private_output", "notes_2026_stage", "notes_2026_manifest.json"), encoding="utf-8"))
OLT_TITLE = {t["olt"]: t["title"] for t in _notes["topics"] if t.get("olt")}

CONTENT_MARKERS = re.compile(r"Working Unit|ORIGINAL QUESTION|Question\s+\d|Given that|FAMILY\s*MAP|"
                             r"TOPIC\s*\d+\s*[•·|]\s*FAMILY|Your classified route|Total for Question|\(Total \d+ marks\)")


def sha(p):
    h = hashlib.sha256()
    with open(p, "rb") as f:
        for b in iter(lambda: f.read(1 << 20), b""):
            h.update(b)
    return h.hexdigest()


def norm(t):
    return re.sub(r"\s+", " ", t).strip()


def front_pages(d):
    """Leading cover/contents pages (no question content). Returns count."""
    n = 0
    in_contents = False
    for i in range(min(5, len(d))):
        t = d[i].get_text()
        head = norm(t[:120]).upper()
        if CONTENT_MARKERS.search(t):
            break
        is_cover = any(k in head for k in ("ADAPTIVE", "COMPLETE CLASSIFIED", "PEARSON EDEXCEL", "UNIT 1 ELITE", "UNIT 2 ELITE"))
        is_contents = "CONTENTS" in head or (in_contents and re.search(r"\d+\s+questions", t))
        if is_cover or is_contents:
            n += 1
            in_contents = bool(is_contents) or in_contents
            continue
        break
    firsts = [pg - 1 for lv, t, pg in d.get_toc() if t.strip().lower() != "contents" and pg >= 1]
    if firsts:
        n = min(n, min(firsts))          # never remove a page a topic bookmark points to
        t = d[n].get_text() if n < len(d) else ""
        if "ALL CLASSIFIED" in t and "Presentation Edition" in t and not CONTENT_MARKERS.search(t):
            n += 1                       # the old presentation cover that the bookmark of topic 1 points at
    return n


def topic_title(raw):
    m = re.search(r"OL-T\d\d", raw)
    if m and m.group(0) in OLT_TITLE:
        return m.group(0), OLT_TITLE[m.group(0)]
    raw = re.sub(r"^(T\d\d|OL-T\d\d)\s*\|\s*", "", raw)
    raw = re.sub(r"^\d+_", "", raw).replace("_", " ")
    return None, raw.strip()


def topics_of(d, course, drop):
    """[(title, start_index, [(family_title, index), ...]), ...] for a complete book."""
    toc = d.get_toc()
    lvl1 = [(t, p - 1) for lv, t, p in toc if lv == 1 and t.strip().lower() != "contents"]
    if course == "WMA11":            # family-level outline; topics start at 'PURE 1 • TOPIC NN' route pages
        names = [re.sub(r"^\d+_", "", os.path.basename(x)).replace("_", " ")
                 for x in sorted(glob.glob(os.path.join(COURSES["WMA11"]["root"], "01_Chapters", "*")))]
        starts = [i for i in range(len(d)) if re.search(r"PURE 1 [•·] TOPIC \d\d", d[i].get_text()[:80])]
        assert len(starts) == len(names) == 13, (len(starts), len(names))
        fams = [(t, p - 1) for lv, t, p in toc if lv == 1]
        out = []
        for k, s in enumerate(starts):
            e = starts[k + 1] if k + 1 < len(starts) else len(d)
            out.append((names[k], s, [(f, p) for f, p in fams if s <= p < e]))
        return out
    assert lvl1, "no topic outline"
    return [(topic_title(t)[1], max(p, drop), []) for t, p in lvl1]


TIDY = {"Newton s": "Newton's", "Resolving Forces Inclined Planes": "Resolving Forces and Inclined Planes",
        "Momentum Impulse Collisions": "Momentum, Impulse and Collisions"}


def ial_chapters(c):
    """[(number, title)] from the approved chapter folders, e.g. ('09', 'Laws of Logarithms')."""
    out = []
    for d in sorted(glob.glob(os.path.join(COURSES[c]["root"], "01_Chapters", "*"))):
        t = os.path.basename(d)[3:].replace("_", " ")
        for a, b in TIDY.items():
            t = t.replace(a, b)
        out.append((os.path.basename(d)[:2], t))
    return out


def css():
    return f"""
@font-face {{font-family: fira; src: url(FiraSans-Regular.otf);}}
@font-face {{font-family: fira; font-weight: bold; src: url(FiraSans-Bold.otf);}}
@font-face {{font-family: firaxb; src: url(FiraSans-ExtraBold.otf);}}
* {{font-family: fira; color: {INK};}}
p {{margin: 0;}}
.k {{font-size: 10pt; letter-spacing: 2pt; color: {SKY}; font-weight: bold;}}
.w {{color: white;}}
"""


def cover(doc, rect, c, scope, role, stats, part=None):
    cfg = COURSES[c]
    p = doc.new_page(width=rect.width, height=rect.height)
    W, H = rect.width, rect.height
    arc = fitz.Archive(FONTS)
    nav = tuple(int(NAVY[i:i + 2], 16) / 255 for i in (1, 3, 5))
    roy = tuple(int(ROYAL[i:i + 2], 16) / 255 for i in (1, 3, 5))
    pale = tuple(int(PALE[i:i + 2], 16) / 255 for i in (1, 3, 5))
    sky = tuple(int(SKY[i:i + 2], 16) / 255 for i in (1, 3, 5))
    p.draw_rect(fitz.Rect(0, 0, W, H * 0.56), color=None, fill=nav)
    p.draw_rect(fitz.Rect(0, H * 0.56, W, H * 0.575), color=None, fill=roy)
    p.draw_rect(fitz.Rect(W - 70, 0, W - 46, H * 0.56), color=None, fill=sky)
    tag, tagline = ROLE[role]
    head = f"""<div class="k">ELITE MATHEMATICS</div>
<p class="w" style="font-size:12pt;margin-top:14pt">{cfg['level']}</p>
<p class="w" style="font-family:firaxb;font-size:34pt;margin-top:6pt;line-height:1.1">{cfg['name']}</p>
<p class="w" style="font-family:firaxb;font-size:24pt;margin-top:4pt;color:#BFD6FB">Adaptive Classified</p>
<p class="w" style="font-size:15pt;margin-top:18pt;font-weight:bold">{scope}</p>"""
    p.insert_htmlbox(fitz.Rect(48, 60, W - 100, H * 0.55), head, css=css(), archive=arc)
    badge_col = ROYAL if role == "Student" else "#0E7C66"
    badge = f"""<div style="background:{badge_col};padding:8pt 14pt;border-radius:6pt">
<span class="w" style="font-family:firaxb;font-size:20pt">{tag}</span><br>
<span class="w" style="font-size:11pt">{tagline}</span></div>"""
    p.insert_htmlbox(fitz.Rect(48, H * 0.60, W - 48, H * 0.72), badge, css=css(), archive=arc)
    facts = [s for s in [stats, cfg["coverage"], part] if s]
    body = "".join(f'<p style="font-size:12pt;margin:3pt 0"><b style="color:{ROYAL}">&#9632;</b>&nbsp; {s}</p>' for s in facts)
    p.insert_htmlbox(fitz.Rect(48, H * 0.745, W - 48, H * 0.86), body, css=css(), archive=arc)
    p.draw_rect(fitz.Rect(0, H - 64, W, H), color=None, fill=pale)
    foot = f"""<p style="font-size:12pt"><b style="color:{NAVY}">Dr Eslam Ahmed</b>&nbsp;&nbsp;·&nbsp;&nbsp;eliteigcse.com
&nbsp;&nbsp;·&nbsp;&nbsp;WhatsApp 011 2000 9622</p>"""
    p.insert_htmlbox(fitz.Rect(48, H - 48, W - 48, H - 16), foot, css=css(), archive=arc)
    return p


def contents(doc, rect, c, title, rows, role, label_of):
    """rows: [(number, title, target_index_in_final_doc)]. Adds as many pages as needed; returns link specs."""
    W, H = rect.width, rect.height
    per = 21
    pages = []
    for k in range(0, max(len(rows), 1), per):
        p = doc.new_page(width=W, height=H)
        nav = tuple(int(NAVY[i:i + 2], 16) / 255 for i in (1, 3, 5))
        p.draw_rect(fitz.Rect(0, 0, W, 8), color=None, fill=nav)
        hd = f"""<div class="k" style="color:{ROYAL}">{COURSES[c]['name'].upper()} · ADAPTIVE CLASSIFIED · {ROLE[role][0].upper()}</div>
<p style="font-family:firaxb;font-size:24pt;color:{NAVY};margin-top:4pt">{'Contents' if k == 0 else 'Contents (continued)'}</p>
<p style="font-size:11pt;color:#5B6475">{title} — click a {COURSES[c]['unit'].lower()} to open it</p>"""
        p.insert_htmlbox(fitz.Rect(48, 40, W - 48, 130), hd, css=css(), archive=fitz.Archive(FONTS))
        pages.append((p.number, rows[k:k + per]))
    return pages


def draw_rows(doc, pages, label_of):
    y0 = 140
    pale = tuple(int(PALE[i:i + 2], 16) / 255 for i in (1, 3, 5))
    for pno, rows in pages:
        p = doc[pno]
        W = p.rect.width
        y = y0
        for j, (num, title, target) in enumerate(rows):
            r = fitz.Rect(48, y, W - 48, y + 28)
            if j % 2 == 0:
                p.draw_rect(r, color=None, fill=pale)
            arc = fitz.Archive(FONTS)
            ty = r.y0 + 6
            p.insert_htmlbox(fitz.Rect(r.x0 + 8, ty, r.x0 + 50, r.y1), f'<p style="font-family:firaxb;font-size:11pt;color:{ROYAL}">{num}</p>', css=css(), archive=arc)
            p.insert_htmlbox(fitz.Rect(r.x0 + 52, ty, r.x1 - 70, r.y1), f'<p style="font-size:11.5pt;text-align:left">{title}</p>', css=css(), archive=arc)
            p.insert_htmlbox(fitz.Rect(r.x1 - 70, ty, r.x1 - 8, r.y1), f'<p style="font-size:11pt;color:#5B6475;text-align:right">p. {label_of(target)}</p>', css=css(), archive=arc)
            p.insert_link({"kind": fitz.LINK_GOTO, "from": r, "page": target, "to": fitz.Point(0, 0)})
            y += 30


def build(src, c, role, scope_title, rows_spec, out_path, part_label=None, src_range=None, single_topic=False):
    """Copy src pages [a,b) after a new cover (+ contents). rows_spec: [(num, title, src_index, families)]"""
    s = fitz.open(src)
    drop = front_pages(s)
    a, b = src_range if src_range else (drop, len(s))
    a = max(a, drop)
    for i in range(drop):
        assert not CONTENT_MARKERS.search(s[i].get_text()), (src, i)
    rect = s[a].rect
    out = fitz.open()
    n_topics = len(rows_spec)
    stats = f"{n_topics} {COURSES[c]['unit'].lower()}s · {b - a} pages" if not single_topic else f"{b - a} pages"
    cover(out, rect, c, scope_title, role, stats, part_label)
    pages = [] if single_topic else contents(out, rect, c, scope_title, rows_spec, role, None)
    front = len(out)
    out.insert_pdf(s, from_page=a, to_page=b - 1)
    to_final = lambda si: front + (si - a)
    # page labels: front pages roman, body continues the printed source numbering
    out.set_page_labels([{"startpage": 0, "prefix": "", "style": "r", "firstpagenum": 1},
                         {"startpage": front, "prefix": "", "style": "D", "firstpagenum": a + 1}])
    label = lambda fi: str(fi - front + a + 1)
    if pages:
        draw_rows(out, [(p, [(n, t, to_final(si)) for n, t, si, _ in rows]) for p, rows in pages], label)
    toc = [[1, "Cover", 1]]
    if pages:
        toc.append([1, "Contents", 2])
    for n, t, si, fams in rows_spec:
        toc.append([1, f"{n}  {t}" if n else t, to_final(si) + 1])
        for ft, fi in fams:
            if a <= fi < b:
                toc.append([2, ft, to_final(fi) + 1])
    out.set_toc(toc)
    out.set_metadata({"title": f"{COURSES[c]['name']} — Adaptive Classified — {scope_title} ({ROLE[role][0]})",
                      "author": "Dr Eslam Ahmed", "subject": "Elite Mathematics Adaptive Classified", "creator": "Elite IGCSE"})
    # verification: every kept page identical text, same order
    for k in range(b - a):
        assert norm(out[front + k].get_text()) == norm(s[a + k].get_text()), (src, a + k)
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    out.save(out_path, garbage=4, deflate=True)
    pages_out = len(out)
    out.close()
    size = os.path.getsize(out_path)
    if size > LIMIT and not part_label and not single_topic and not src_range:
        os.remove(out_path)
        return {"too_big": size}
    assert size < 100_000_000, (out_path, size)
    return {"file": os.path.relpath(out_path, STAGE).replace("\\", "/"), "source": src, "source_pages": len(s),
            "dropped_front_pages": drop, "kept_range": [a, b], "pages": pages_out, "bytes": size, "role": role,
            "scope": scope_title, "part": part_label, "sha256": sha(out_path), "source_sha256": sha(src)}


def complete_book(c, role, src, outdir, stem, records):
    s = fitz.open(src)
    drop = front_pages(s)
    tops = topics_of(s, c, drop)
    if "root" in COURSES[c]:
        names = ial_chapters(c)
        assert len(names) == len(tops), (c, len(names), len(tops))
        rows = [(num, title, si, fams) for (num, title), (t, si, fams) in zip(names, tops)]
    else:
        rows = [(f"{k:02d}", t, si, fams) for k, (t, si, fams) in enumerate(tops, 1)]
    s.close()
    if True:                                 # build whole; split only if the real output is too big
        r = build(src, c, role, "Complete Book", rows, os.path.join(outdir, f"{stem}_Complete_{ROLE[role][0].replace(' ', '_')}.pdf"))
        if "too_big" not in r:
            records.append(r)
            return
        est = r["too_big"]
    nparts = int(est // LIMIT) + 1
    # split by topics into nparts groups of roughly equal page counts
    bounds = [r[2] for r in rows] + [None]
    total = len(fitz.open(src))
    bounds[-1] = total
    target = (total - drop) / nparts
    groups, cur, start = [], [], drop
    for k, r in enumerate(rows):
        cur.append(r)
        end = bounds[k + 1]
        if (end - start >= target and len(groups) < nparts - 1) or k == len(rows) - 1:
            groups.append((cur, start, end)); cur, start = [], end
    for gi, (g, a, b) in enumerate(groups, 1):
        lbl = f"Part {gi} of {len(groups)} · {COURSES[c]['unit']}s {g[0][0]}–{g[-1][0]}"
        records.append(build(src, c, role, "Complete Book", g,
                             os.path.join(outdir, f"{stem}_Complete_{ROLE[role][0].replace(' ', '_')}_Part{gi}.pdf"),
                             part_label=lbl, src_range=(a, b)))


def run(c):
    cfg = COURSES[c]
    outdir = os.path.join(STAGE, cfg["out"])
    rec = []
    stem = {"Unit1": "Modular_Unit1", "Unit2": "Modular_Unit2", "Linear": "Linear_4MA1"}.get(c, c) + "_Adaptive_Classified"
    if "root" in cfg:
        for role in ("Student", "Solutions"):
            src = glob.glob(os.path.join(cfg["root"], "00_Combined", f"*_{role}_*.pdf"))[0]
            complete_book(c, role, src, outdir, stem, rec)
        for chdir, (num, title) in zip(sorted(glob.glob(os.path.join(cfg["root"], "01_Chapters", "*"))), ial_chapters(c)):
            for role in ("Student", "Solutions"):
                src = glob.glob(os.path.join(chdir, f"*_{role}_*.pdf"))[0]
                d = fitz.open(src); drop = front_pages(d)
                fams = [(t, p - 1) for lv, t, p in d.get_toc() if lv == 1 and p - 1 >= drop]
                d.close()
                rec.append(build(src, c, role, f"Chapter {num} · {title}", [(num, title, drop, fams)],
                                 os.path.join(outdir, "Chapters", f"{c}_Adaptive_C{num}_{re.sub('[^A-Za-z0-9]+', '_', title).strip('_')}_{ROLE[role][0].replace(' ', '_')}.pdf"),
                                 single_topic=True))
    else:
        for role in ("Student", "Solutions"):
            src = glob.glob(os.path.join(cfg["complete"], f"*_{role}_Navigation_v3.pdf"))[0]
            complete_book(c, role, src, outdir, stem, rec)
        for k, tdir in enumerate(sorted(glob.glob(os.path.join(cfg["topics"], "*"))), 1):
            olt, title = topic_title(os.path.basename(tdir))
            for role in ("Student", "Solutions"):
                src = glob.glob(os.path.join(tdir, f"*_{role}_*.pdf"))[0]
                d = fitz.open(src); drop = front_pages(d); d.close()
                nm = f"{c}_Adaptive_{olt}_{re.sub('[^A-Za-z0-9]+', '_', title).strip('_')}_{ROLE[role][0].replace(' ', '_')}.pdf"
                rec.append(build(src, c, role, f"{olt} · {title}", [(olt[3:], title, drop, [])],
                                 os.path.join(outdir, "Topics", nm), single_topic=True))
                rec[-1]["olt"] = olt
    json.dump(rec, open(os.path.join(STAGE, f"adaptive_{c}_manifest.json"), "w", encoding="utf-8"), indent=1, ensure_ascii=False)
    print(c, len(rec), "files", round(sum(r["bytes"] for r in rec) / 1e6), "MB; max",
          round(max(r["bytes"] for r in rec) / 1e6, 1), "MB; dropped fronts", sorted({r["dropped_front_pages"] for r in rec}))


if __name__ == "__main__":
    for c in (sys.argv[1:] or list(COURSES)):
        run(c)
