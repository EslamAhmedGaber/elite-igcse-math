# Pipeline Tools

These tools keep the restored static site repeatable without bringing back the
old folder sprawl.

## Main Commands

Run from the repo root:

```powershell
python tools/ingest_paper.py
python tools/build_runtime_data.py
python tools/build_books.py --dry-run
python tools/build_books.py --public
python tools/build_books.py --private
python tools/verify_pipeline.py
```

## Folder Map

```text
tools/
  inbox/              Drop new paper PDFs here
  processed/          Processed source PDFs move here
  ingest_paper.py     Split/crop/classify new papers
  build_runtime_data.py  Generate questions-data.js and solutions-data.js
  build_books.py         Build public classified books and private answer books
  verify_pipeline.py  Check data, assets, solutions, books, and privacy guardrails
  migrate_from_v1.py  One-time migration helper from the old site
```

## New Paper Workflow

1. Drop the question-paper PDF into `tools/inbox/`.
2. Run `python tools/ingest_paper.py`.
3. Review `src/data/questions/<paper-slug>.json`.
4. Add solutions in `src/data/solutions/<paper-slug>.json`.
5. Run `python tools/build_runtime_data.py`.
6. Run `python tools/build_books.py --dry-run`.
7. Regenerate public classified books into `downloads/` with `python tools/build_books.py --public`.
8. Regenerate private answer books into `private_output/` with `python tools/build_books.py --private`.
9. Run `python tools/verify_pipeline.py`.

## Current Ingest Behavior

`ingest_paper.py`:

- detects Edexcel paper code and session,
- crops every question using "Total for Question N is M marks" footer markers,
- runs the heuristic topic classifier,
- writes `src/data/questions/<paper-slug>.json`,
- saves cropped images to `assets/questions/`,
- refreshes `src/data/papers.json`,
- moves the source PDF to `tools/processed/`.

`build_books.py`:

- reads question rows from `src/data/questions/`,
- reads website solution text from `src/data/solutions/`,
- writes public question-only PDFs to `downloads/`,
- writes private answer PDFs to `private_output/`,
- supports `--dry-run`, `--limit`, and repeated `--book <filename>` for safe checks before full generation.

Book routing:

- Complete books include linear questions and any clean modular questions.
- `Classified_4WM1.pdf` includes Unit 1 topics from linear papers plus clean 4WM1 papers.
- `Classified_4WM2.pdf` includes Unit 2 topics from linear papers plus clean 4WM2 papers.
- Private Unit 1 and Unit 2 answer books are generated in `private_output/`.

## Classification Fixes

Mistags should be fixed first through the website admin `Fix topic` flow. Stable repeated fixes should then be promoted into the classifier/normalizer so the next paper improves automatically.

## Privacy

Public classified question books can be published from `downloads/`.

Generated answer books and private solution exports must stay in `private_output/`.

Never put answer books, mark schemes, or private worked-solution books into `downloads/`.
