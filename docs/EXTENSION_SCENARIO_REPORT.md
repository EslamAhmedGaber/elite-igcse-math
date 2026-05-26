# Extension Scenario Verification

Date: 2026-05-27

This report records the web-only Phase 7.5 dry-runs for the course module architecture.

## Test A: New Curriculum Stub

Temporary change: added one `pure2-stub` course object to `course-modules.js` with a Mulberry palette, five module links, an empty `pastPapers[]`, and no book cards.

Result:

- Top navigation rendered `Pure 2 (stub)`.
- `downloads.html?pathway=pure2-stub` activated the new nav tab.
- The pathway hub rendered five module cards from the stub course object.
- The active page received `data-course-palette="pure2-stub"` and `data-pathway="pure2-stub"`.
- The nav tab received palette variables from the registry: `--nav-tab-active: #51283a` and `--nav-tab-accent: rgba(122, 58, 82, 0.12)`.
- `pastpapers.html?pathway=pure2-stub#pure2-stub-papers` rendered a fourth paper section with the empty-state message.
- No HTML page was edited for the temporary course.

Screenshots:

- `phase75_screenshots/local/testA_pure2_stub_hub.png`
- `phase75_screenshots/local/testA_B_pastpapers_stub_and_fake.png`

## Test B: New Pure 1 Paper Session

Temporary change: prepended one fake WMA11 session object to `pureWma11PastPapers`, pointing to the existing January 2026 question paper and worked solution as stand-ins.

Result:

- Pure 1 paper rows increased from 18 to 19.
- The fake row rendered in the WMA11 paper section.
- The row contained a question-paper link and a worked-solution link.
- `pastpapers.html` was not edited.

## Architecture Fix Made

The first pass exposed a hardcoded active-course assumption in `lead.js`. The fix now resolves active groups from `course-modules.js` by `id`, `pathway`, or `palette`, and applies registry palette values to the body and nav tab CSS variables. This keeps future course tabs and hubs from needing pathway-specific branches.

## Cleanup

The temporary `pure2-stub` course and fake WMA11 paper row were removed before commit. A follow-up local browser check confirmed Pure 1 returned to 18 rows and the temporary Pure 2 section disappeared. `course-modules.js` was cache-busted to `v=20260527b` so no browser keeps the temporary test copy. Only the generic active-course fix and this report remain.
