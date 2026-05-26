# Module Parity Audit

Date: 2026-05-26

Scope: student-facing module parity across Linear, Modular, and IAL Pure 1 / WMA11 after Phase 3.

Legend:

- Real: module has a route and a working feature surface.
- Adapter: module uses the shared engine with course-specific storage or filters.
- Thin stub: module deliberately links to a course-specific equivalent rather than a full shared page.

| Module | Linear | Modular | Pure 1 / WMA11 |
| --- | --- | --- | --- |
| Classified View | Real: `/practice.html?pathway=linear&bank=all` | Real: unit-scoped `/practice.html?pathway=modular&unit=...&bank=all` | Real: `/ial/wma11/index.html` |
| Expertise | Real: Q20+ bank filter | Real: unit-scoped Q20+ bank filter | Real: Q6+ WMA11 filter via `/ial/wma11/index.html?expertise=1#ialFilters` |
| Build Test | Real: shared `exam.html` custom mode | Real: shared `exam.html` custom mode with unit scope | Real: shared `exam.html` WMA11 adapter |
| Smart Revision | Real: shared `exam.html` smart mode | Real: shared `exam.html` smart mode with unit scope | Real: shared `exam.html` WMA11 smart mode |
| Progress | Real: `progress.html` with existing IGCSE progress keys | Real: `progress.html` with unit scope | Real: WMA11 progress module with `eliteWMA11SolvedV1` and `eliteWMA11MistakeBoxV1` |
| Mistake Box | Real: practice review mode | Real: unit-scoped practice review mode | Real: WMA11 Mistake Box filter via `/ial/wma11/index.html?mode=mistakes#ialFilters` |
| Saved Tests | Real: shared `exam.html` saved mode | Real: shared `exam.html` saved mode with unit scope | Real: shared `exam.html` saved mode with WMA11 storage suffix |
| Books | Real: `downloads.html?pathway=linear` | Real: `downloads.html?pathway=modular&unit=...` | Real: `downloads.html?pathway=pure` |
| Past Solutions | Real: `pastpapers.html?pathway=linear` | Real: unit-scoped `pastpapers.html?pathway=modular&unit=...` | Real: `pastpapers.html?pathway=pure#pure-wma11` |

Navigation contract:

- Top-level Linear opens Classified View by default with `bank=all`.
- Top-level Modular opens the Unit 1 / Unit 2 chooser before showing unit tools.
- Top-level Pure 1 opens the WMA11 module hub.
- Course module cards are generated from `course-modules.js`; `lead.js` keeps a fallback with the same module set.

Constraints kept:

- No PDFs or LaTeX rebuilds.
- No storage-key changes.
- Progress remains adapter-based; no full progress component refactor in Phase 3.
