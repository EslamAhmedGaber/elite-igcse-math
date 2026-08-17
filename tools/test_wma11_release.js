const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const sandbox = { window: {} };

vm.runInNewContext(read("ial/wma11/wma11-data.js"), sandbox, {
  filename: "ial/wma11/wma11-data.js"
});

const questions = sandbox.window.WMA11_QUESTIONS || [];
const topics = sandbox.window.WMA11_TOPICS || [];
const mayJune = questions.filter((item) => item.year === 2026 && item.session === "MayJune");

assert.strictEqual(questions.length, 189, "WMA11 question count changed");
assert.strictEqual(questions.reduce((total, item) => total + Number(item.marks || 0), 0), 1425, "WMA11 mark total changed");
assert.strictEqual(topics.length, 13, "WMA11 topic count changed");
assert.strictEqual(mayJune.length, 10, "May/June 2026 question count changed");
assert.strictEqual(mayJune.reduce((total, item) => total + Number(item.marks || 0), 0), 75, "May/June 2026 mark total changed");

for (const item of mayJune) {
  assert.strictEqual(item.status, "checked", `${item.id} is not checked`);
  assert(Array.isArray(item.steps) && item.steps.length > 0, `${item.id} has no structured solution`);
  assert(item.finalAnswer, `${item.id} has no final answer`);
  assert.strictEqual(item.paperFilesAvailable, false, `${item.id} must not expose missing paper links`);
  assert(fs.existsSync(path.join(root, item.image)), `${item.id} image is missing`);
}

const page = read("ial/wma11/index.html");
assert(page.includes("wma11-data.js?v=20260817b"), "WMA11 data cache version is stale");
assert(page.includes("wma11.css?v=20260818a"), "WMA11 stylesheet cache version is stale");
assert(page.includes("wma11.js?v=20260818a"), "WMA11 runtime cache version is stale");
assert(page.includes("May/June 2026"), "WMA11 page does not name the latest session");
assert(page.includes("data-ial-total>189"), "WMA11 page fallback count is stale");

const runtime = read("ial/wma11/wma11.js");
assert(runtime.includes("Practice this session"), "Unavailable paper rows need a classified-practice action");
assert(runtime.includes("paperFilesAvailable"), "Unavailable paper rows are not guarded");

const courseModules = read("course-modules.js");
assert(courseModules.includes('"189 questions"'), "Shared WMA11 resource count is stale");
assert(courseModules.includes("through May/June 2026"), "Shared WMA11 coverage text is stale");
assert(courseModules.includes("WMA11_Classified_Questions.pdf?v=wma11-mayjune2026"), "Shared WMA11 book cache version is stale");

const books = [
  "WMA11_Classified_Questions.pdf",
  "WMA11_Classified_With_Answers.pdf",
  "WMA11_Expertise_Questions.pdf",
  "WMA11_Expertise_With_Answers.pdf"
];
for (const book of books) {
  const file = path.join(root, "downloads", "IAL", "WMA11", book);
  assert(fs.existsSync(file), `${book} is missing`);
  assert(fs.statSync(file).size > 10_000_000, `${book} is unexpectedly small`);
}

console.log(JSON.stringify({
  status: "PASS",
  questions: questions.length,
  marks: 1425,
  mayJuneQuestions: mayJune.length,
  mayJuneMarks: 75,
  books: books.length
}));
