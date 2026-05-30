# Elite Course Module Pipeline

This file is the handoff map for adding a new curriculum without rebuilding the site from scratch.

Latest release baseline: see `docs\RELEASE_HANDOFF_2026-05-27.md` before adding Pure 2, Mechanics, Statistics, or Lower Secondary.

## Course Shape

Every course should be treated as:

`course identity + palette + data adapter + feature modules + generated books`

- `identity`: public name, exam code, route, default landing page, and storage keys.
- `palette`: a small set of course colors applied to the pathway hub, builder, progress, book cards, and PDF covers.
- `data adapter`: normalizes questions into the shared shape used by practice and `exam.js`.
- `feature modules`: reusable tools exposed from the same pathway navigation and course registry.
- `generated books`: question books, answer books, expertise books, and paper-order solution books.

## Feature Modules

Use these names consistently in navigation and styling:

- `classified`: topic practice / classified view.
- `expertise`: harder-question route.
- `build-test`: random mock and hand-built test engine.
- `revision-book`: 50+ question prediction booklet generated from topic frequency, recency, gaps, marks, harder-question signals, and student progress. It must be blueprint-first: cover as many topics as the target allows before repeating any topic, then repeat in interleaved rounds when a course has fewer topics than the booklet length.
- `smart-revision`: legacy route name kept for mistake, weak-topic, and unsolved-question revision links.
- `progress`: a real course dashboard for solved state, mistake-box state, topic mastery, and weak-topic entry points.
- `books`: public question books.
- `answers`: worked-solution books.
- `past-solutions`: original question papers listed beside their matching worked-solution PDFs.
- `mistake-box`: saved difficult questions.
- `saved-tests`: reusable built tests.
- `book-builder`: source pipeline for public books and approved answer books.
- `classified-builder`: source pipeline for topic/unit classification.
- `paper-solution-builder`: source pipeline for original paper-order solution books.
- `solution-method`: the shared solution-writing style and final-answer format.

## Registry Source

`course-modules.js` is the front-end course registry. It defines:

- current course groups and unit groups,
- which modules appear for each course,
- root-safe URLs for each module,
- course palette names,
- module aliases used by CSS and navigation.
- paper rows through `pastPapers[]`,
- download cards through `books[]`.

`lead.js` consumes this registry and keeps an internal fallback so older cached pages do not break. New curricula should be added to `course-modules.js` first, then wired to data/books/builders.

`pastpapers.html` and `downloads.html` are thin renderers now. They load `course-renderers.js`, which reads `course-modules.js` and draws the visible rows/cards. Adding a paper or a book card should not require editing either HTML page.

## Add A New Course

1. Pick a palette colour from the unused brand palette pool. Current signatures are Linear `#161B2E`, Modular `#5A8074`, and Pure 1 `#36304A`; do not change them without approval.
2. Copy `tools/templates/course-stub.js` and fill `id`, `code`, `label`, `palette`, `paperSection`, `links`, `pastPapers[]`, `books[]`, and `storageKeys`.
3. Append the new course object into `course-modules.js`. The top navigation and pathway hub should appear from the registry.
4. Create the data file (`<code>-data.js` or equivalent) following the WMA11 shape: topics, questions, solutions, and paper metadata.
5. Add an adapter to `exam.js` so random mocks, hand-built tests, revision books, marking, printing, and saved tests use the shared builder.
6. Add a real progress module. Reuse existing keys only for the same course; otherwise create namespaced keys such as `eliteWMA12SolvedV1`.
7. Copy `tools/templates/book-builder-stub.py` to `tools/<code>/build_<code>_books.py` and connect it to the course data/palette.
8. Create `downloads/IAL/<code>/` with `Papers/` and the approved public PDFs.
9. Add the course's paper rows to `pastPapers[]` and book/download cards to `books[]` in `course-modules.js`.
10. Update verification allow-lists if needed, bump the service worker, run checks, commit, push, and record Started/Completed entries in `PROJECT_LOG.md`.

## Add Content To An Existing Course

Use `docs/COURSE_UPDATE_PIPELINE.md`. Short version: update the structured source, regenerate runtime/book outputs, append one `pastPapers[]` session when a new whole paper is published, verify, bump cache, commit, push, and log. `pastpapers.html` and `downloads.html` should remain untouched for normal content additions.

## Current Courses

- Linear 4MA1: full classified route, expertise, builder, books, past-paper solutions, progress.
- Modular 4WM: Unit 1 and Unit 2 each expose the same module set.
- IAL Pure 1 WMA11: classified route, full builder, revision book, real topic progress/mistake dashboard, classified/expertise books, and paper rows with matching worked solutions.

## Publish Checklist

- Update `C:\Users\Eslam\Documents\Elite IGCSE v2\PROJECT_LOG.md`.
- Run the relevant book/data builder from source.
- Run `python tools\verify_pipeline.py`.
- Browser-check the pathway hub and the changed course page.
- Commit and push the live repo.
- Check the matching `eliteigcse.com` page or PDF URL after GitHub Pages deploys.
