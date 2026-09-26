const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8").replace(/\r\n/g, "\n");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const practice = read("practice.html");
const app = read("app.js");
const downloads = read("downloads.html");
const pastPapers = read("pastpapers.html");
const renderers = read("course-renderers.js");
const resourceCss = read("resource-hub.css");
const systemCss = read("elite-system.css");
const exam = read("exam.js");
const printUtils = read("print-utils.js");
const lead = read("lead.js");
const home = read("index.html");

[
  "commandSearchBox",
  "commandTopicFilter",
  "commandDifficultyFilter",
  "commandViewFilter",
  "questionPagination",
  "questionPageSize",
  "selectionDock",
  "selectionDockBuild",
  "selectionDockPrint"
].forEach((id) => assert(practice.includes(`id="${id}"`), `Practice command center is missing #${id}`));

assert(app.includes("const PRACTICE_PAGE_SIZES = [12, 24, 36, 48]"), "Approved page-size options are missing");
assert(app.includes('localStorage.setItem("questionLayout", "grid")'), "Classified must open in Grid view for the upgraded command center");
assert(app.includes("return visible.slice(start, start + pageSize)"), "Question cards are not paginated before rendering");
assert(app.includes('difficulty === "easy" && question.marks >= 3'), "Easy must mean fewer than 3 marks");
assert(app.includes('difficulty === "medium" && (question.marks < 3 || question.marks > 4)'), "Medium must mean 3 to 4 marks");
assert(app.includes('difficulty === "hard" && question.marks <= 4'), "Hard must mean more than 4 marks");
assert(app.includes("function updateSelectionDock("), "Selected-question dock logic is missing");
assert(app.includes("Q${question.question} question ${question.question}"), "Search must index exact question references");
assert(app.includes("searchTerms.every"), "Search must support terms in any order");
assert(app.includes("if (/^q\\d+$/.test(term)) return term === questionRef"), "Q2 must not match Q20-Q29");
assert(app.includes("/^p[12]hr?$/.test(term)"), "P1H must not match P1HR");

assert(downloads.includes("data-book-finder"), "Book Finder mount is missing");
assert(pastPapers.includes("data-paper-finder"), "Paper Finder mount is missing");
assert(renderers.includes("function initBookFinder("), "Book Finder controller is missing");
assert(renderers.includes("function initPastPaperFinder("), "Paper Finder controller is missing");
assert(renderers.includes('if (selectedCourse && !groups.some((group) => group.id === selectedCourse)) selectedCourse = ""'), "Paper Finder must keep an unknown course on All courses");
assert((renderers.match(/if \(selectedCourse && !groups\.some\(\(group\) => group\.id === selectedCourse\)\) selectedCourse = ""/g) || []).length >= 2, "Book and Paper finders must keep an unknown course on All courses");
assert(renderers.includes('wma12: "pure2"'), "Pure 2 paper filter must map to the pure2 registry group");
assert(renderers.includes('wme01: "mechanics1"'), "Mechanics 1 paper filter must map to the mechanics1 registry group");
assert(renderers.includes('wma11: "pure"'), "Pure 1 paper filter must map to the pure registry group");
assert(renderers.includes("data-paper-kind"), "Paper file-type filtering metadata is missing");
assert(renderers.includes("data-book-type"), "Book resource-type filtering metadata is missing");

[
  ".practice-command-center",
  ".question-pagination",
  ".selection-dock",
  ".resource-finder",
  ".resource-course-tabs"
].forEach((selector) => assert(resourceCss.includes(selector), `Missing resource UI style ${selector}`));

[
  "--elite-navy-950",
  "--elite-royal-600",
  "--elite-sky-100",
  "--elite-gold-500",
  ":focus-visible",
  "prefers-reduced-motion"
].forEach((token) => assert(systemCss.includes(token), `Elite system is missing ${token}`));

const systemPages = [
  "404.html",
  "about.html",
  "admin.html",
  "checkup.html",
  "downloads.html",
  "exam.html",
  "index.html",
  "notes.html",
  "offline.html",
  "pastpapers.html",
  "planner.html",
  "practice.html",
  "progress.html",
  "topics.html",
  "ial/index.html",
  "ial/wma11/index.html",
  "ial/wma12/index.html",
  "ial/wme01/index.html"
];
systemPages.forEach((relativePath) => {
  const markup = read(relativePath);
  // Version-agnostic on purpose: the release cache-buster moves, the
  // requirement that the page is linked and busted does not.
  assert(/elite-system\.css\?v=[A-Za-z0-9._-]+/.test(markup), `${relativePath} is not linked to a cache-busted Elite System stylesheet`);
  assert(/elite-ux\.css\?v=[A-Za-z0-9._-]+/.test(markup), `${relativePath} is not linked to the Elite UX layer`);
});

assert(lead.includes("COMPACT_WORKSPACE_PAGES"), "Task pages must opt into the compact study workspace");
assert(lead.includes("secondaryToolsSummary"), "Secondary study tools need a descriptive summary");
assert(lead.includes("course-bar-switch"), "Every course bar needs a course switch command");
assert(lead.includes('class="course-bar"') && lead.includes("renderCourseBarLink"), "Course pages must render the compact course bar");
assert(home.includes('id="courseLauncher"'), "Homepage course launcher anchor is missing");
assert(home.includes('data-home-study-trail'), "Homepage local study trail mount is missing");
assert(lead.includes('eliteStudyTrailV1'), "Shared local study trail storage key is missing");
assert(lead.includes("function initStudyTrail()"), "Shared local study trail controller is missing");
assert(lead.includes("studyTrailCourseMeta"), "Study trail course context mapping is missing");
assert(systemCss.includes(".home-study-trail"), "Shared local study trail styles are missing");
assert(practice.includes('href="index.html#courseLauncher"'), "Practice pathway switch points to a stale anchor");
assert(systemCss.includes("body.is-task-workspace"), "Compact workspace styles are missing");
assert(systemCss.includes('body:not([data-page="progress"]) .cloud-floating-widget'), "Global sync prompt is not compacted");
assert(resourceCss.includes('.practice-command-controls label:not(.command-search)'), "Mobile Classified filters are not condensed");

assert(printUtils.includes("@page elite-practice-page"), "Practice A4 page rule is missing");
assert(printUtils.includes("@page elite-exam-page"), "Exam A4 page rule is missing");
assert(printUtils.includes("min-height: 277mm"), "Printable A4 content height is not fixed");
assert(printUtils.includes("break-after: page"), "One-item-per-page print break is missing");
assert(printUtils.includes("waitForMathTypesetting"), "Dynamic solution maths must be typeset before printing");
assert(printUtils.includes('.pathway-tool-strip'), "Dynamic course navigation must be hidden from exam printouts");
const paperPrint = read("paper-print.js");
const paperCss = read("paper-print.css");
assert(paperCss.includes("size: A4 portrait") && paperCss.includes("height: 297mm"), "A4 paper sheets must be fixed at 210 x 297 mm");
assert(paperPrint.includes("function findCut("), "Tall questions must be split at a blank row");
assert(paperPrint.includes("ensureFrameMath"), "Solution maths must be typeset inside the print frame before layout");
assert(paperPrint.includes("eliteigcse.com") && paperPrint.includes("Dr Eslam Ahmed"), "Printed branding is missing");
assert(exam.includes('openPrintStudio("solutions"'), "Exam solutions print must use the A4 paper engine");
assert(exam.includes('openPrintStudio("student"'), "Exam student print must use the A4 paper engine");

console.log("Elite resource command center checks passed");
console.log("- Classified pagination, visible filters, selection dock, and difficulty bands verified");
console.log("- Book and Paper finders verified");
console.log(`- Elite System linked across ${systemPages.length} primary pages`);
console.log("- A4 paper engine, tall-question splitting, and solution print contracts verified");
