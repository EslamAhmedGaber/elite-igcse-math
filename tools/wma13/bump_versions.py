"""Give the scripts/styles changed for WMA13 a fresh ?v= stamp everywhere they are referenced
(HTML pages, JS loaders) and keep the version pins in tools/verify_pipeline.py in step."""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
NEW = "20261020w13"
ASSETS = ["cloud-progress.js", "course-modules.js", "course-renderers.js", "course.js", "elite-ux.css", "exam-bootstrap.js",
          "exam.js", "ial-notes-data.js", "lead.js", "library-data.js", "members.js", "pathway-bootstrap.js",
          "progress.js", "stats.js", "study-compass.js", "teacher-groups.js"]
PINS = {"lead.js": "CURRENT_LEAD_VERSION", "course-modules.js": "CURRENT_COURSE_MODULES_VERSION",
        "study-compass.js": "CURRENT_COMPASS_VERSION", "pathway-bootstrap.js": "CURRENT_PATHWAY_BOOTSTRAP_VERSION"}


def main() -> None:
    files = [p for p in ROOT.rglob("*") if p.suffix in (".html", ".js") and p.is_file()
             and not any(part in ("downloads", "private_output", "node_modules", ".git") for part in p.relative_to(ROOT).parts)
             and not p.relative_to(ROOT).parts[0] == "tools"]
    changed = 0
    for path in files:
        text = path.read_text(encoding="utf-8", errors="surrogateescape")
        new = text
        for asset in ASSETS:
            new = re.sub(r"(?<![A-Za-z0-9_-])" + re.escape(asset) + r"\?v=[A-Za-z0-9._-]+", f"{asset}?v={NEW}", new)
        if new != text:
            path.write_text(new, encoding="utf-8", errors="surrogateescape")
            changed += 1
    pipeline = ROOT / "tools" / "verify_pipeline.py"
    text = pipeline.read_text(encoding="utf-8")
    for asset, pin in PINS.items():
        text = re.sub(rf'^{pin} = "[^"]*"', f'{pin} = "{NEW}"', text, flags=re.M)
    pipeline.write_text(text, encoding="utf-8")
    print(f"version {NEW} written in {changed} files")


if __name__ == "__main__":
    main()
