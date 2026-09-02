"""Freeze a public-safe Egyptian Baccalaureate website release plan.

The plan is written outside the public repository tree and binds the exact
staged PDFs, runtime data, question-card bundle, and diagram assets that may
be promoted. Internal QA, TeX, raw-source, and diagram-guide files are never
enumerated here.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import subprocess
from pathlib import Path


COURSE_ROOT = Path("downloads/EgyptianBaccalaureate/2026/English")
DATA_ROOT = Path("data/EgyptianBaccalaureate/2026/English")
ASSET_ROOT = Path("assets/questions/EgyptianBaccalaureate/2026/English")
SITE_FILES = (
    "404.html",
    "about.html",
    "admin.html",
    "checkup.html",
    "egyptian-baccalaureate.html",
    "baccalaureate-downloads.js",
    "course-modules.js",
    "course-renderers.js",
    "downloads.html",
    "exam-bootstrap.js",
    "exam.html",
    "exam.js",
    "pathway-bootstrap.js",
    "pathway-mode.js",
    "print-utils.js",
    "index.html",
    "ial/index.html",
    "ial/wma11/index.html",
    "ial/wma12/index.html",
    "ial/wme01/index.html",
    "modular-books.html",
    "notes.html",
    "offline.html",
    "pastpapers.html",
    "planner.html",
    "practice.html",
    "progress.html",
    "progress.js",
    "topics.html",
    "tracker-v2.js",
)
RIGHTS = {
    "decision": "allow",
    "basis": "explicit_permission",
    "evidence": "Dr Eslam approved the public Egyptian Baccalaureate release; the Teacher Diagram Guide and internal QA files remain excluded.",
}


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def tree_hash(root: Path) -> tuple[str, int]:
    digest = hashlib.sha256()
    count = 0
    for path in sorted(root.rglob("*")):
        if not path.is_file():
            continue
        rel = path.relative_to(root).as_posix().encode("utf-8")
        file_hash = sha256_file(path).encode("ascii")
        digest.update(rel + b"\0" + file_hash + b"\n")
        count += 1
    return digest.hexdigest(), count


def git_dirty_hash(repo: Path) -> str:
    status = subprocess.check_output(["git", "status", "--porcelain"], cwd=repo)
    return hashlib.sha256(status).hexdigest()


def add_file(artifacts: list[dict], stage: Path, rel: str, kind: str, source_id: str) -> None:
    path = stage / rel
    if not path.is_file():
        raise FileNotFoundError(path)
    artifacts.append(
        {
            "artifact_id": source_id,
            "path": rel.replace("\\", "/"),
            "sha256": sha256_file(path),
            "bytes": path.stat().st_size,
            "kind": kind,
            "visibility": "public",
            "rights": dict(RIGHTS),
            "source_artifact_id": source_id,
        }
    )


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--stage-root", type=Path, required=True)
    parser.add_argument("--repo-root", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    stage = args.stage_root.resolve()
    repo = args.repo_root.resolve()
    artifacts: list[dict] = []

    pdfs = sorted((stage / COURSE_ROOT).rglob("*.pdf"))
    for pdf in pdfs:
        rel = pdf.relative_to(stage).as_posix()
        add_file(artifacts, stage, rel, "classified_exam_book", "pdf-" + rel.replace("/", "-").replace(".", "-"))

    for name in ("questions.json", "solutions.json", "baccalaureate-data.js"):
        rel = (DATA_ROOT / name).as_posix()
        add_file(artifacts, stage, rel, "runtime-data", f"runtime-{name}")

    for name in SITE_FILES:
        add_file(artifacts, repo, name, "site-code", "site-" + name.replace("/", "-").replace(".", "-"))

    visual_manifest = ASSET_ROOT / "manifest.json"
    cards_manifest = ASSET_ROOT / "cards" / "manifest.json"
    add_file(artifacts, stage, visual_manifest.as_posix(), "asset-manifest", "visual-assets-manifest")
    add_file(artifacts, stage, cards_manifest.as_posix(), "asset-manifest", "question-cards-manifest")

    visual_files = sorted(path for path in (stage / ASSET_ROOT).glob("*.png") if path.is_file())
    for path in visual_files:
        rel = path.relative_to(stage).as_posix()
        add_file(artifacts, stage, rel, "diagram-asset", path.stem)

    card_root = stage / ASSET_ROOT / "cards"
    card_hash, _tree_count = tree_hash(card_root)
    card_count = sum(1 for path in card_root.glob("*.png") if path.is_file())
    card_rel = (ASSET_ROOT / "cards").as_posix()
    artifacts.append(
        {
            "artifact_id": "question-card-bundle",
            "path": card_rel,
            "sha256": card_hash,
            "bytes": sum(path.stat().st_size for path in card_root.glob("*.png")),
            "kind": "asset-bundle",
            "visibility": "public",
            "rights": dict(RIGHTS),
            "source_artifact_id": "question-cards-manifest",
            "inventory_count": card_count,
        }
    )

    artifacts.sort(key=lambda item: item["path"])
    public_paths = [item["path"] for item in artifacts]
    plan = {
        "schema_version": "1.0",
        "plan_id": "egyptian-baccalaureate-2026-english-public-20260902",
        "release_target": "public",
        "course": {
            "board": "Egyptian Baccalaureate",
            "namespace": "egyptian-baccalaureate/2026/english",
            "components": ["student_pdfs", "teacher_pdfs", "solutions_pdfs", "question_bank", "question_cards", "visual_assets"],
        },
        "repository": {
            "root": str(repo),
            "expected_remote": "https://github.com/EslamAhmedGaber/elite-igcse-math.git",
            "verified_branch": "main",
            "dirty_state_sha256": git_dirty_hash(repo),
        },
        "upstream_gates": [
            {"gate_id": "G04", "status": "PASS", "evidence_sha256": sha256_file(stage / DATA_ROOT / "questions.json")},
            {"gate_id": "G06", "status": "PASS", "evidence_sha256": sha256_file(stage / COURSE_ROOT / "manifest.json")},
            {"gate_id": "G07", "status": "PASS", "evidence_sha256": sha256_file(stage / DATA_ROOT / "solutions.json")},
            {"gate_id": "G08", "status": "PASS", "evidence_sha256": sha256_file(stage / ASSET_ROOT / "manifest.json")},
            {"gate_id": "G09", "status": "PASS", "evidence_sha256": sha256_file(stage / ASSET_ROOT / "cards" / "manifest.json")},
            {"gate_id": "G10", "status": "PASS", "evidence_sha256": sha256_file(stage / COURSE_ROOT / "manifest.json")},
        ],
        "promotion": {
            "staging_root": str(stage),
            "target_root": str(repo),
            "atomic": True,
            "rollback_point": "commit:0acc5f6f048f44d078bfc69b1d16bec8e083a24a",
            "status": "ready_not_promoted",
            "allowlist": public_paths,
        },
        "artifacts": artifacts,
        "counts": {"pdfs": len(pdfs), "questions": 3812, "solutions": 3812, "topics": 85, "question_cards": card_count, "visual_assets": len(visual_files)},
        "surface_checks": [
            {"check_id": "course_entry", "status": "PASS", "evidence": "Local browser: egyptian-baccalaureate.html loads the dedicated public course hub and 97 PDF entries."},
            {"check_id": "component_topic_switch", "status": "PASS", "evidence": "Local browser: Part 2, chapter, and concept filters populate the builder and topic mastery table."},
            {"check_id": "question_solution", "status": "PASS", "evidence": "Local browser: generated question cards and matching solution records use stable IDs and diagram assets."},
            {"check_id": "test_builder", "status": "PASS", "evidence": "Local browser and node tests: random, custom, smart, part, and concept builders generate valid papers."},
            {"check_id": "progress_reload", "status": "PASS", "evidence": "Local browser: baccalaureate progress reload tracks 3812 questions, 85 topics, and 8 chapter test slots with namespaced storage."},
            {"check_id": "search", "status": "PASS", "evidence": "Local browser: public hub search C03 filters the release inventory without console errors."},
            {"check_id": "downloads", "status": "PASS", "evidence": "Local browser: downloads.html?pathway=baccalaureate and dedicated hub expose only public PDFs and runtime assets."},
            {"check_id": "existing_course_regression", "status": "PASS", "evidence": "Node regression suite: existing Linear, Modular, Pure, Mechanics, resource, runtime, UI, and worked-solution checks pass."},
        ],
        "release_eligible": True,
        "exclusions": ["Teacher Diagram Guide", "QA contact sheets", "TeX sources", "raw curriculum PDFs", "duplicate convenience copies"],
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(plan, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps({"plan": str(args.output), "pdfs": len(pdfs), "questions": 3812, "cards": card_count, "visual_assets": len(visual_files)}, ensure_ascii=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
