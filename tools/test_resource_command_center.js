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

assert(downloads.includes("data-book-finder"), "Book Finder mount is missing");
assert(pastPapers.includes("data-paper-finder"), "Paper Finder mount is missing");
assert(renderers.includes("function initBookFinder("), "Book Finder controller is missing");
assert(renderers.includes("function initPastPaperFinder("), "Paper Finder controller is missing");
assert(renderers.includes('selectedCourse = groups[0]?.id || ""'), "Resource finders must open on a focused course");
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
  assert(read(relativePath).includes("elite-system.css?v=20260809c"), `${relativePath} is not linked to Elite System`);
});

assert(printUtils.includes("@page elite-practice-page"), "Practice A4 page rule is missing");
assert(printUtils.includes("@page elite-exam-page"), "Exam A4 page rule is missing");
assert(printUtils.includes("min-height: 277mm"), "Printable A4 content height is not fixed");
assert(printUtils.includes("break-after: page"), "One-item-per-page print break is missing");
assert(printUtils.includes("waitForMathTypesetting"), "Dynamic solution maths must be typeset before printing");
assert(printUtils.includes('.pathway-tool-strip'), "Dynamic course navigation must be hidden from exam printouts");
assert(exam.includes('</article>\n        <section class="exam-print-solution${printDensityClass}"'), "Question and solution print pages must be siblings");
assert(exam.includes('data-print-step-count="${printStepCount}"'), "Long printable solutions must expose their density signal");
assert(exam.includes("Solution ${index + 1} | eliteigcse.com"), "Solution footer branding is missing");

console.log("Elite resource command center checks passed");
console.log("- Classified pagination, visible filters, selection dock, and difficulty bands verified");
console.log("- Book and Paper finders verified");
console.log(`- Elite System linked across ${systemPages.length} primary pages`);
console.log("- A4 question and alternating solution print contracts verified");
