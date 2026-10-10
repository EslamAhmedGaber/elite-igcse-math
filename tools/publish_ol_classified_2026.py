"""Stage and upload the separately approved 2026 student-book edition."""
from __future__ import annotations

import argparse
import concurrent.futures
import hashlib
import json
import re
import shutil
import subprocess
import time
from pathlib import Path

import fitz
import requests

SITE = Path(__file__).resolve().parents[1]
SOURCE = Path(r"D:\Tyro4_Latex\0 Mathematics\OL\00_ELITE_UPGRADE\14_OL_CLASSIFIED_2026")
STAGE = SITE.parent / "ol-classified-release-20261010"
TAG = "ol-classified-practice-20261010"
REPO = "EslamAhmedGaber/elite-igcse-math"
BASE = f"https://github.com/{REPO}/releases/download/{TAG}/"
CHAPTERS = {1: "Number", 2: "Algebra", 3: "Sequences, Functions and Graphs",
            4: "Geometry and Measures", 5: "Vectors and Transformations",
            6: "Statistics and Probability"}


def checksum(path):
    h = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            h.update(block)
    return h.hexdigest()


def window_json(path, variable):
    text = path.read_text(encoding="utf-8")
    start = re.search(rf"window\.{variable}\s*=\s*", text).end()
    return json.JSONDecoder().raw_decode(text[start:])[0]


def chapter_for(number):
    return next(ch for ch, end in enumerate([15, 28, 38, 50, 52, 58], 1) if number <= end)


def merge_student_books(topics, destination, title):
    doc = fitz.open()
    page = doc.new_page(width=595.28, height=841.89)
    page.draw_rect(page.rect, color=None, fill=(0.078, 0.145, 0.29))
    page.insert_text((45, 65), "ELITE MATHEMATICS | DR ESLAM AHMED", fontsize=13, color=(1, 1, 1))
    page.insert_textbox(fitz.Rect(45, 190, 550, 365), title, fontsize=30, color=(1, 1, 1), fontname="hebo")
    page.insert_text((45, 405), "2026 CLASSIFIED + PRACTICE", fontsize=20, color=(0.86, 0.76, 0.4))
    page.insert_text((45, 445), "STUDENT EDITION", fontsize=17, color=(1, 1, 1))
    page.insert_textbox(fitz.Rect(45, 510, 550, 610),
        "Linear topic books selected to match the Modular unit.\nPractice questions, classified past-paper questions and topic answer keys.",
        fontsize=12, color=(0.82, 0.88, 0.98))
    contents_count = (len(topics) + 25) // 26
    for _ in range(contents_count):
        doc.new_page(width=595.28, height=841.89)
    toc = [[1, title, 1]]
    for index, topic in enumerate(topics):
        start = len(doc) + 1
        with fitz.open(STAGE / "assets" / topic["asset"]) as incoming:
            doc.insert_pdf(incoming)
        toc.append([1, f'{topic["id"]} - {topic["title"]}', start])
        contents = doc[1 + index // 26]
        y = 108 + (index % 26) * 25
        if index % 26 == 0:
            contents.insert_text((40, 55), title, fontsize=17, color=(0.078, 0.145, 0.29))
            contents.insert_text((40, 82), "CONTENTS", fontsize=11)
        contents.insert_textbox(fitz.Rect(40, y, 505, y + 24),
            f'{topic["id"]}  {topic["title"]}', fontsize=9)
        contents.insert_text((525, y + 10), str(start), fontsize=9)
        contents.insert_link({"kind": fitz.LINK_GOTO, "from": fitz.Rect(40, y, 558, y + 24), "page": start - 1})
    doc.set_toc(toc)
    doc.set_metadata({"title": title + " | 2026 Classified + Practice", "author": "Dr Eslam Ahmed"})
    doc.save(destination, garbage=4, deflate=True, use_objstms=1)
    doc.close()


def prepare():
    assets_dir = STAGE / "assets"
    assets_dir.mkdir(parents=True, exist_ok=True)
    files = {}
    private_sources = {}

    def add(path, name=None):
        name = re.sub(r"[^A-Za-z0-9._-]", "_", name or path.name)
        target = assets_dir / name
        if path.resolve() != target.resolve():
            shutil.copy2(path, target)
        with fitz.open(target) as doc:
            if doc.is_encrypted or not doc.page_count:
                raise ValueError(f"Unreadable PDF: {name}")
            for page in doc:
                if abs(page.rect.width - 595.28) > 2 or abs(page.rect.height - 841.89) > 2:
                    raise ValueError(f"Non-A4 page: {name}")
            pages = doc.page_count
        if "Solutions" in name:
            raise ValueError("Solutions files cannot enter the student release")
        record = {"asset": name, "href": BASE + name, "pages": pages,
                  "mb": round(target.stat().st_size / 1024 ** 2, 2),
                  "bytes": target.stat().st_size, "sha256": checksum(target)}
        files[name] = record
        private_sources[name] = str(path)
        return dict(record)

    topics = []
    for folder in sorted((SOURCE / "Linear").glob("OL-T*")):
        number = int(re.match(r"OL-T(\d+)", folder.name).group(1))
        student = list(folder.glob("*_Student.pdf"))
        if len(student) != 1:
            raise ValueError(f"Expected one student PDF in {folder}")
        topic = add(student[0])
        topic.update(id=f"OL-T{number:02}", num=f"{number:02}",
                     title=folder.name.split("_", 1)[1].replace("-", " "), chapter=chapter_for(number))
        if number == 32:
            topic["title"] = "Linear Graphs y = mx + c"
        topics.append(topic)
    if len(topics) != 58 or len({t["id"] for t in topics}) != 58:
        raise ValueError("Expected 58 unique student topics")
    by_id = {topic["id"]: topic for topic in topics}
    linear_chapters = []
    for ch, title in CHAPTERS.items():
        matches = list((SOURCE / "Combined").glob(f"Chapter{ch}_*/*_Student.pdf"))
        if len(matches) != 1:
            raise ValueError(f"Missing Chapter {ch} student book")
        linear_chapters.append({"number": ch, "title": title, "book": add(matches[0]),
                                "topics": [t for t in topics if t["chapter"] == ch]})
    complete = add(SOURCE / "Combined" / "All" / "OL_Complete_Classified_Student.pdf")
    courses = {"linear": {"id": "linear", "name": "Linear", "code": "4MA1", "complete": complete,
                           "chapters": linear_chapters, "topics": topics}}
    notes = window_json(SITE / "library-data.js", "ELITE_LIBRARY")
    for unit in (1, 2):
        cid = f"unit{unit}"
        selected = [dict(by_id[t["olt"]], num=t["num"]) for t in notes["courses"][cid]["notes"]["topics"]]
        if len(selected) != (29 if unit == 1 else 32):
            raise ValueError(f"Unexpected {cid} topic count")
        chapters = []
        for ch, title in CHAPTERS.items():
            subset = [t for t in selected if t["chapter"] == ch]
            if not subset:
                continue
            target = assets_dir / f"Modular_Unit{unit}_Chapter{ch}_2026_Student.pdf"
            merge_student_books(subset, target, f"Modular Unit {unit}\nChapter {ch}: {title}")
            chapters.append({"number": ch, "title": title, "book": add(target), "topics": subset})
        target = assets_dir / f"Modular_Unit{unit}_Complete_2026_Student.pdf"
        merge_student_books(selected, target, f"Modular Unit {unit}")
        courses[cid] = {"id": cid, "name": f"Modular Unit {unit}", "code": f"4WM{unit}",
                        "complete": add(target), "chapters": chapters, "topics": selected}
    catalog = {"version": "20261010a", "edition": "2026 Classified + Practice", "courses": courses}
    (STAGE / "catalog.json").write_text(json.dumps(catalog, indent=2), encoding="utf-8")
    (STAGE / "manifest.json").write_text(json.dumps({"version": catalog["version"], "assets": list(files.values())}, indent=2), encoding="utf-8")
    plan = {"source_root": str(SOURCE), "site_root": str(SITE), "stage_root": str(STAGE),
            "rollback_commit": subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=SITE, text=True).strip(),
            "authorization": "User explicitly ordered upload, then clarified: another version, not replace.",
            "scope": "Additional O-Level 2026 student edition, Linear and matched Modular units. No solutions.",
            "legacy_project_gates": "Not marked PASS; user explicitly instructed publication without waiting.",
            "source_files": private_sources, "assets": list(files.values())}
    (STAGE / "release-plan.json").write_text(json.dumps(plan, indent=2), encoding="utf-8")
    print(json.dumps({"files": len(files), "courses": {k: {"topics": len(v["topics"]), "pages": v["complete"]["pages"]} for k,v in courses.items()}}), flush=True)


def session():
    result = subprocess.run(["git", "credential", "fill"], cwd=SITE,
                            input="protocol=https\nhost=github.com\n\n", capture_output=True, text=True, timeout=30)
    credentials = dict(line.split("=", 1) for line in result.stdout.splitlines() if "=" in line)
    token = credentials.get("password")
    if not token:
        raise RuntimeError("GitHub credentials are unavailable")
    client = requests.Session()
    client.headers.update({"Authorization": "Bearer " + token, "Accept": "application/vnd.github+json",
                           "X-GitHub-Api-Version": "2022-11-28"})
    return client


def release(client):
    endpoint = f"https://api.github.com/repos/{REPO}/releases"
    saved = STAGE / "github-release.json"
    if saved.exists():
        release_id = json.loads(saved.read_text(encoding="utf-8"))["id"]
        response = client.get(endpoint + f"/{release_id}", timeout=40)
        response.raise_for_status()
        publication = response.json()
        if publication["tag_name"] != TAG:
            raise ValueError("Saved release identity does not match this edition")
        return publication
    response = client.get(endpoint + f"/tags/{TAG}", timeout=40)
    if response.status_code == 404:
        response = client.post(endpoint, json={"tag_name": TAG, "target_commitish": "main", "draft": True,
            "name": "O-Level 2026 Classified + Practice - Student Edition",
            "body": "An additional Elite student edition: Linear topics, chapter books and the complete course; matching Modular Unit 1 and Unit 2 topic selections. Prepared by Dr Eslam Ahmed. Worked-solution books are excluded."}, timeout=40)
    response.raise_for_status()
    return response.json()


def upload():
    client = session()
    publication = release(client)
    (STAGE / "github-release.json").write_text(json.dumps({"id": publication["id"], "url": publication["html_url"]}), encoding="utf-8")
    records = json.loads((STAGE / "manifest.json").read_text())["assets"]
    existing = {a["name"]: a for a in client.get(publication["assets_url"], params={"per_page":100}, timeout=40).json()}

    def send(record):
        name = record["asset"]
        if name in existing:
            old = existing[name]
            digest = old.get("digest")
            if old["size"] != record["bytes"] or (digest and digest != "sha256:" + record["sha256"]):
                raise ValueError(f"Existing asset differs: {name}")
            print("REUSED " + name, flush=True)
            return
        path = STAGE / "assets" / name
        if checksum(path) != record["sha256"]:
            raise ValueError(f"Staged PDF changed: {name}")
        worker = session()
        for attempt in range(3):
            try:
                with path.open("rb") as stream:
                    response = worker.post(publication["upload_url"].split("{")[0], params={"name":name},
                        headers={"Content-Type":"application/pdf"}, data=stream, timeout=(30, 600))
                response.raise_for_status()
                uploaded = response.json()
                if uploaded["name"] != name:
                    raise ValueError(f"Upload filename was changed: {name}")
                if uploaded["size"] != record["bytes"]:
                    raise ValueError(f"Upload length differs: {name}")
                if uploaded.get("digest") and uploaded["digest"] != "sha256:" + record["sha256"]:
                    raise ValueError(f"Upload hash differs: {name}")
                print("UPLOADED " + name, flush=True)
                return
            except requests.RequestException:
                if attempt == 2:
                    raise
                time.sleep(2)
        worker.close()

    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        list(pool.map(send, records))
    print(f"UPLOAD_COMPLETE {len(records)} student PDFs", flush=True)


def publish():
    client = session()
    publication = release(client)
    expected = json.loads((STAGE / "manifest.json").read_text())["assets"]
    actual = client.get(publication["assets_url"], params={"per_page":100}, timeout=40)
    actual.raise_for_status()
    assets = {item["name"]: item for item in actual.json()}
    for item in expected:
        asset = assets.get(item["asset"])
        if not asset or asset["size"] != item["bytes"] or asset.get("state") != "uploaded":
            raise ValueError(f"Incomplete release asset: {item['asset']}")
        if asset.get("digest") and asset["digest"] != "sha256:" + item["sha256"]:
            raise ValueError(f"Release hash mismatch: {item['asset']}")
    if any("Solutions" in name for name in assets) or len(assets) != len(expected):
        raise ValueError("Unexpected release assets")
    response = client.patch(publication["url"], json={"draft":False}, timeout=40)
    response.raise_for_status()
    print("PUBLISHED " + response.json()["html_url"], flush=True)


def install():
    catalog = json.loads((STAGE / "catalog.json").read_text())
    (SITE / "classified-books-data.js").write_text(
        "window.ELITE_CLASSIFIED_2026 = " + json.dumps(catalog, indent=2) + ";\n", encoding="utf-8")
    shutil.copy2(STAGE / "manifest.json", SITE / "data" / "ol-classified-2026-manifest.json")
    html_files = subprocess.check_output(["git", "ls-files", "*.html"], cwd=SITE, text=True).splitlines()
    for filename in html_files:
        path = SITE / filename
        text = path.read_text(encoding="utf-8")
        updated = text.replace("course-modules.js?v=hub-20261009f", "course-modules.js?v=hub-20261010a")
        updated = re.sub(r"lead\.js\?v=[A-Za-z0-9._-]+", "lead.js?v=20261010a", updated)
        if updated != text:
            path.write_text(updated, encoding="utf-8")
    print("CATALOG_INSTALLED; existing books, notes and answer assets preserved", flush=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("action", choices=["prepare", "upload", "publish", "install"])
    action = parser.parse_args().action
    {"prepare":prepare, "upload":upload, "publish":publish, "install":install}[action]()
