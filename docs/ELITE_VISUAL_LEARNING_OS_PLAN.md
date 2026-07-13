# Elite Visual Learning OS

Date: 2026-07-13

## Product Objective

Turn the existing Elite IGCSE Mathematics site into one coherent learning workspace without replacing the proven site shell or weakening any current tool.

The upgrade must make the next useful action obvious for a student:

`Choose course -> Learn from notes -> Practise by topic -> Build a test -> Review mistakes -> See progress`

It must also make teacher resources, books, past papers, the certificate studio, and the Mechanics lab easier to discover.

## Non-Negotiable Guardrails

- Preserve all public URLs and deep links.
- Preserve question and solution data and their generators.
- Preserve browser progress, mistake-box, final-answer, saved-test, and profile keys.
- Preserve every print and print-with-solutions workflow.
- Preserve MathJax/TeX rendering.
- Keep Notes as the default learning entry where already approved.
- Keep course identities distinct but harmonious.
- Do not hide existing features behind hover-only navigation.
- Do not introduce a second source of truth for courses or topics.
- Do not change PDFs or answer content in this release.
- Do not publish until shared checks and live visual checks pass.

## Research Translation

Current high-performing learning products share four useful patterns:

1. Guided learning paths: a visible sequence helps students know what to do next.
2. Practice with immediate feedback: learning and testing stay close together.
3. Mastery visibility: progress is shown by course and topic, not only as a total.
4. Predictable, accessible controls: focus is visible, touch targets are large, and menus do not disappear while being used.

Elite already has the content and engines. This project exposes them through one shared experience layer.

## Information Architecture

### Course Contexts

- Linear 4MA1
- Modular Unit 1 4WM1
- Modular Unit 2 4WM2
- IAL Pure 1 WMA11
- IAL Pure 2 WMA12
- IAL Mechanics 1 WME01

### Learning Stages

1. Learn: strategy notes and booklets.
2. Practise: classified and expertise banks.
3. Test: random mock, build test, and revision book.
4. Repair: mistakes, weak topics, and final-answer training.
5. Master: topic progress and readiness.

### Supporting Tools

- Books and answer books
- Past papers and worked solutions
- Mechanics lab and question visualizer
- Teacher Studio and certificates
- Readiness check
- About/contact

## Shared Visual System

### Brand Core

- Inkwell/navy remains the shell colour.
- Royal blue becomes the shared interactive/action colour.
- Sky blue is used for information and progress support.
- Gold remains a restrained brand highlight.
- Course colours identify context, not entire page backgrounds.

### Course Signatures

- Linear: Inkwell
- Modular: Verdigris
- Pure 1: Indigo
- Pure 2: Mulberry
- Mechanics 1: Teal

### Component Rules

- Cards are individual content objects only, never nested page sections.
- 8px maximum card radius unless an existing approved component requires otherwise.
- All frequently used controls target at least 44px on touch layouts.
- Focus indicators use a clear 2px outline with offset and sufficient contrast.
- Motion communicates state changes and respects reduced-motion preferences.
- Question images always use `object-fit: contain` and retain readable aspect ratios.
- Typography uses the existing Inter/Sora stack, normal letter spacing, and readable line height.

## Build Phases

### Phase A: Shared Study Navigator

Build a course-aware command surface available from every normal site page.

Capabilities:

- Course selector for all six active contexts.
- Search across modules, topics, notes, books, papers, lab, and support tools.
- Keyboard shortcut and accessible dialog behaviour.
- Current course identity and direct learning-stage actions.
- Continue-learning link based on the last meaningful internal page.
- Direct access to Teacher Studio/certificates.
- No dependency on a server or new account system.

### Phase B: Learning Journey

Expose the five-stage journey in the shared navigator and on learning pages.

Capabilities:

- Current stage highlighted from URL/page state.
- Each stage links to the correct course and unit.
- WME01 adds the lab as a course-specific visual tool.
- Modular links always retain Unit 1 or Unit 2.
- Old and direct URLs remain valid.

### Phase C: Notes Intelligence

Turn Notes from a PDF grid into an active study library.

Capabilities:

- Search by topic title, focus text, chapter, or course.
- Course and chapter filters.
- Grid/list view switch.
- Mark individual notes as studied.
- Course/chapter completion indicators.
- Continue with the next unread note.
- One-click transition from a note to matching classified practice.
- Existing booklet links remain unchanged.

Storage:

- `eliteNotesStudiedV1`: additive, namespaced note identifiers only.
- `eliteStudyPreferencesV1`: display density, font size, contrast, motion.
- `eliteStudyLastRouteV1`: last useful internal learning route.

### Phase D: Shared Shell Consistency

- Generate the mobile study dock from one source.
- Generate or normalize shared footer content from one source.
- Add visible Notes, Practice, Test, Progress, and Study/Search shortcuts.
- Correct stale course availability copy.
- Keep enrollment available without displacing learning tools.
- Normalize focus, button size, active state, and course badge behaviour.

### Phase E: Display And Accessibility Options

- Comfortable and compact density.
- Normal and large reading size.
- Standard and high-contrast presentation.
- Motion on/off, respecting system preference.
- Focus mode that suppresses non-learning promotion while preserving navigation.
- Persist settings locally and offer one reset action.

### Phase F: Verification And Release

Automated:

- JavaScript syntax checks.
- Existing pipeline verification.
- Existing revision and exam-builder tests.
- New study navigator and Notes-state tests.
- Broken local-link scan for new shared routes.
- `git diff --check`.

Browser:

- Desktop: 1440 x 900.
- Mobile: 390 x 844.
- Home, Notes, Practice, Exam, Progress, Downloads, Past Papers.
- WMA11, WMA12, WME01, and Mechanics lab.
- Search open/search/select/escape.
- Keyboard focus order and visible focus.
- Preferences persistence and reset.
- Notes search/filter/studied/next-note.
- No horizontal overflow or console errors.
- MathJax remains rendered on solution pages.
- A4 print and print-with-solutions remain unchanged.

Release:

- Bump all changed shared asset versions.
- Bump service worker cache-kill version.
- Record exact verification evidence in `PROJECT_LOG.md`.
- Commit and push `main` only after checks pass.
- Verify cache-busted live URLs and representative interactions.

## Success Criteria

- A student can reach any primary course tool in two actions or fewer.
- Search returns useful results for every active curriculum.
- Every page shows the same current course identity and learning-stage model.
- Notes progress works across Linear, WMA11, WMA12, and WME01.
- Modular Unit 1 and Unit 2 never mix routes.
- Certificate Studio is discoverable from the shared navigator.
- Desktop and mobile have no horizontal overflow.
- Keyboard users can see focus and close all overlays with Escape.
- Existing test, progress, print, question, solution, and lab flows continue to pass.

## Deferred Work

The following are intentionally outside this release because they need separate content or backend contracts:

- Server-side teacher/student classrooms.
- New grading or AI marking claims.
- New question or solution content.
- Statistics 1 before its course pipeline is complete.
- Public certificate verification database.
- PDF redesigns.

