# Elite Course Module Pipeline

This file is the handoff map for adding a new curriculum without rebuilding the site from scratch.

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
- `smart-revision`: mistake, weak-topic, and unsolved-question revision.
- `progress`: solved, selected, and mastery tracking.
- `books`: public question books.
- `answers`: worked-solution books.
- `past-solutions`: original paper-order solution books.
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

`lead.js` consumes this registry and keeps an internal fallback so older cached pages do not break. New curricula should be added to `course-modules.js` first, then wired to data/books/builders.

## Add A New Course

1. Add the course to the shared registry in `course-modules.js`.
2. Give every visible tool link an explicit stable `module`.
3. Add the course palette token in `course-modules.js`, then apply its CSS in `styles.css` and the course-specific CSS file if it has one.
4. Normalize question data into the shared question shape before connecting UI.
5. Add an adapter to `exam.js` so the shared builder can power random mocks, custom tests, smart revision, and saved tests.
6. Reuse existing progress and mistake-box keys only when they represent the same course. Otherwise create course-specific keys.
7. Build all public question books and approved worked-solution books from source.
8. Add downloads to the pathway hub and `downloads.html`.
9. Verify the route, builder, progress, downloads, and at least one PDF before publishing.

## Current Courses

- Linear 4MA1: full classified route, expertise, builder, books, past-paper solutions, progress.
- Modular 4WM: Unit 1 and Unit 2 each expose the same module set.
- IAL Pure 1 WMA11: classified route, full builder, smart revision, progress/mistake box, classified/expertise books, and paper-order solutions.

## Publish Checklist

- Update `C:\Users\Eslam\Documents\Elite IGCSE v2\PROJECT_LOG.md`.
- Run the relevant book/data builder from source.
- Run `python tools\verify_pipeline.py`.
- Browser-check the pathway hub and the changed course page.
- Commit and push the live repo.
- Check the matching `eliteigcse.com` page or PDF URL after GitHub Pages deploys.
