# Elite Course Update Pipeline

Use this when adding new papers, new classified questions, or corrected solutions to an existing course. Keep updates in structured source files first; the visible site should be generated from the registry and builders.

## Add A New Past Paper To Linear Or Modular

1. Drop the question paper and mark scheme into the active intake folder.
2. Crop questions with the existing paper-ingestion tools and inspect the contact sheet before publishing.
3. Save question images with paper slug, question number, page range, marks, and topic slug.
4. Create or update `src/data/questions/<paper>.json`.
5. Solve every question and save student-facing solutions in `src/data/solutions/<paper>.json` using `steps[]` and `finalAnswer`.
6. Regenerate `questions-data.js` and `solutions-data.js`.
7. Rebuild affected question books and answer books from source.
8. Build the paper-order worked-solution PDF.
9. Append one session object to the course's `pastPapers[]` in `course-modules.js`.
10. Copy public outputs into `downloads/`, bump cache, verify, commit, push, and update `PROJECT_LOG.md`.

## Add A New Past Paper To Pure 1 / WMA11

1. Add the question paper and source metadata to the WMA11 source workspace.
2. Add question data, worked-solution steps, final answers, and paper/session metadata using the existing WMA11 shape.
3. Run the WMA11 builder in the final PDF phase to regenerate books and the new paper-order solution PDF.
4. Copy the new question paper and solution PDF into `downloads/IAL/WMA11/Papers/`.
5. Append one session object to Pure 1's `pastPapers[]` in `course-modules.js`.
6. Bump cache, verify the paper row, commit, push, and update `PROJECT_LOG.md`.

## Add Classified Questions Without A New Whole Paper

1. Append questions to the structured source JSON.
2. Add matching solution entries using the unified schema.
3. Regenerate runtime data.
4. Rebuild the affected classified books and answer books in the PDF phase.
5. Verify the bank, progress, mistake box, and books.
6. Commit, push, and log.

## Update Existing Solutions

1. Edit the source solution JSON only.
2. Keep internal fields such as `topicNote`, `status`, `checkedBy`, and `updated` out of student-facing renderers.
3. Rebuild the affected answer book and any paper-order solution PDF.
4. Verify the live PDF URL and size after publish.
5. Commit, push, and log.

## Guardrails

- Do not rename progress, mistake-box, saved-test, or draft storage keys without a migration.
- Do not edit `pastpapers.html` for normal paper additions; append to `pastPapers[]`.
- Do not edit `downloads.html` for normal book additions; append to `books[]`.
- Do not rebuild PDFs until the designated PDF phase unless Dr Eslam explicitly asks for an urgent book-only release.
