# Elite IGCSE Release Handoff - 2026-05-27

This is the release handoff for the restored static Elite IGCSE Mathematics site after the course-module rebuild, palette correction, solution-schema migration, and final PDF rebuild.

## Current Live State

- Domain: https://eliteigcse.com
- Live repository root: `C:\Users\Eslam\Documents\Elite IGCSE v2\website`
- Project log: `C:\Users\Eslam\Documents\Elite IGCSE v2\PROJECT_LOG.md`
- Current branch/head: `main` at the latest polish-pass-2 acceptance/PDF commit; baseline production content before Phase 7 was `c89fc91`.
- Registry version: `2026-05-27-course-registry-v6`
- Service worker cache: `elite-igcse-kill-v95`
- Classified answer PDF version: `title-polish-20260527`
- Linear/Modular past-paper solution PDF version: `paper-solutions-20260527`
- WMA11 PDF version: `wma11-polish2-20260527`

## Canonical Course Signatures

Do not change these without Dr Eslam approving a brand-palette change.

| Course | Signature | Usage |
|---|---:|---|
| Linear | `#161B2E` | Web hub, builder, print, PDFs |
| Modular | `#5A8074` | Web hub, Unit 1/Unit 2, builder, print, PDFs |
| Pure 1 / WMA11 | `#36304A` | WMA11 hub, builder, progress, paper rows, PDFs |
| Final answer role | `#C8392B` | Final-answer plates across solution PDFs |
| Examiner/metadata role | `#C86A3F` | Internal-style accent where needed |

## Student-Facing Modules

Each active course should be treated as a set of attachable modules:

- Classified View
- Expertise
- Build Test / Mock Builder
- Smart Revision
- Progress
- Mistake Box
- Saved Tests
- Books
- Answer Books
- Past Papers with adjacent Worked Solutions

Linear exposes its tools directly. Modular first shows Unit 1 / Unit 2, then exposes that unit's tools. Pure 1 exposes the WMA11 course hub with the same module family.

## Key Live Links

- Pure 1 hub: https://eliteigcse.com/ial/wma11/index.html?cb=bd1f14e
- Pure 1 past papers: https://eliteigcse.com/pastpapers.html?pathway=pure&cb=bd1f14e#pure-wma11
- Downloads: https://eliteigcse.com/downloads.html?pathway=pure&cb=bd1f14e
- WMA11 classified with answers: https://eliteigcse.com/downloads/IAL/WMA11/WMA11_Classified_With_Answers.pdf?v=wma11-polish2-20260527
- Unit 1 classified answers: https://eliteigcse.com/downloads/ClassifiedSolutions/Classified_4WM1_Answers.pdf?v=title-polish-20260527
- WMA11 Jan 2026 solution: https://eliteigcse.com/downloads/IAL/WMA11/Papers/WMA11_2026_Jan_Solutions.pdf?v=wma11-polish2-20260527

## Phase Commits

| Phase | Commit | Notes |
|---|---|---|
| Phase 1 | `d1bc91c` | Canonical web palettes |
| Phase 2 | `1d8148b` | Structured solution schema migration |
| Phase 3 | `ce34bf6` | Module parity across courses |
| Phase 4 | `75c62e3`, `be4cc86` | Home reorganization and mobile polish |
| Phase 5 | `8fa2f8c` | Layered contrast and print palette |
| Phase 6 | `33f0be1` | Past-paper row normalization |
| Phase 7 | `d4e409f` | Registry-driven past papers and downloads |
| Phase 7.5 | `7e2a9f3` | Expansion tests A and B |
| Phase 8 | `bd1f14e` | Final PDF rebuild and Test C |

## Polish Pass Addendum

The polish pass closed the independent audit gaps that remained after `bd1f14e`.

| Polish Phase | Commit | Notes |
|---|---|---|
| Phase 1 | `1e8f954` | WMA11 audit metadata and validator guardrails |
| Phase 2 | `1a72d04` | Pure 1 Progress moved onto shared `progress.html` |
| Phase 3 | `b1d9407` | Printable mocks/tests inherit curriculum palette |
| Phase 4 | `2413254` | Linear/Modular solution step titles polished |
| Phase 5 | `14e9875` | Practice layout changed to compact toolbar + practice rail |
| Phase 6 | `c89fc91` | Linear/Modular classified solution PDFs rebuilt with polished titles |
| Phase 7 | latest acceptance commit | Final audit, WMA11 web-title polish, release handoff update |

Phase 7 found and fixed one extra consistency issue: WMA11 web solution step titles still had 26 generic or overlong labels such as `Part (a)`. `tools\polish_wma11_titles.py` now keeps that audit repeatable. Only WMA11 `steps[].title` values changed; solution bodies, final answers, metadata, storage keys, and Pure 1 PDFs were untouched.

## Expansion Proofs

- Test A, new curriculum: adding one temporary `pure2-stub` course object rendered a top-nav tab, pathway hub, module cards, palette tinting, and a past-papers section without editing HTML.
- Test B, new paper row: adding one temporary session object to Pure 1 `pastPapers[]` rendered a new QP + worked-solution row without editing `pastpapers.html`.
- Test C, new question: adding one temporary Linear question and structured solution, then regenerating runtime data and rebuilding one smoke PDF, made the question appear in the classified bank and answer PDF. The fake data was removed afterward.

Details are in `docs\EXTENSION_SCENARIO_REPORT.md` and `PROJECT_LOG.md`.

## Source Of Truth Files

- Course/module registry: `course-modules.js`
- Registry renderers: `course-renderers.js`
- Navigation and pathway hub: `lead.js`
- Linear/Modular classified app: `app.js`
- Shared builder/test engine: `exam.js`
- Print palette and worksheet output: `print-utils.js`
- Pure 1 hub logic: `ial\wma11\wma11.js`
- Linear/Modular book builder: `tools\build_books.py`
- Shared LaTeX style: `tools\book_assets\elite_igcse.sty`
- WMA11 book builder mirror: `tools\wma11\build_wma11_books.py`
- Solution schema rules: `docs\SOLUTION_WRITING_STYLE.md`
- New curriculum checklist: `docs\COURSE_MODULE_PIPELINE.md`
- New paper/update checklist: `docs\COURSE_UPDATE_PIPELINE.md`

## How To Add The Next Curriculum

Start with `docs\COURSE_MODULE_PIPELINE.md`.

1. Pick an unused brand colour and record it in the log.
2. Copy `tools\templates\course-stub.js` and fill the course object.
3. Add the course to `course-modules.js`.
4. Add the data adapter and builder wiring.
5. Add real progress keys and a real progress module.
6. Add downloads/books/past papers from the registry.
7. Verify locally, then publish and check the live domain.

Never create a second source of truth for paper rows or book cards.

## How To Add New Papers Or Questions

Start with `docs\COURSE_UPDATE_PIPELINE.md`.

- Add or update structured source data first.
- Write solutions with `steps[]` and `finalAnswer`.
- Regenerate runtime data.
- Rebuild affected books/PDFs only when needed.
- Add paper rows to `course-modules.js` `pastPapers[]`, not to `pastpapers.html`.
- Add book cards to `course-modules.js` `books[]`, not to `downloads.html`.
- Bump cache versions after CSS/JS/HTML changes.
- Update `PROJECT_LOG.md` before and after the operation.

## Storage Keys

Do not rename these without a migration:

- `eliteWMA11SolvedV1`
- `eliteWMA11MistakeBoxV1`
- Existing Linear/Modular progress, selected, mistake-box, saved-test, and draft keys

Renaming storage keys can make students lose local progress.

## Verification Baseline

The final acceptance audit passed:

- `python tools\verify_pipeline.py`
- JS syntax checks for `course-modules.js`, `course-renderers.js`, `lead.js`, `exam.js`, `app.js`, `print-utils.js`, `ial\wma11\wma11.js`, `ial\wma11\wma11-data.js`, and `service-worker.js`
- Title audits: Linear/Modular `0 / 6023` awkward titles; WMA11 web titles `0` awkward titles after the Phase 7 polish.
- Live browser/CDP checks for Pure 1 Progress parity, Linear/Modular practice layout, and Linear/Modular/Pure print palette variables.
- `git diff --check -- . ':(exclude)*.pdf'`
- Live browser checks for Linear, Modular chooser, Modular Unit 1, Pure 1, Downloads, and Pure 1 Past Papers
- Live URL checks for key HTML and PDF files

Public PDF size warnings remain above 50 MB, but no file exceeds GitHub's 100 MB hard limit.

## Acceptance Screenshots

Final review screenshots were saved outside the repo:

`C:\Users\Eslam\Documents\Elite IGCSE v2\final_acceptance_screenshots\live`

The combined reference image is:

`C:\Users\Eslam\Documents\Elite IGCSE v2\final_acceptance_screenshots\live\pathway_hubs_side_by_side.png`

## Release Rule

Every future meaningful operation must create a `Started` and `Completed` entry in `PROJECT_LOG.md`, then verify, commit, push, and check `eliteigcse.com` before reporting completion.
