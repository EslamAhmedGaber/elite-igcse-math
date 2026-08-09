const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const practice = read("practice.html");
assert(practice.includes("answer-index.js"), "Practice must load the compact answer index");
assert(practice.includes("runtime-loader.js"), "Practice must load the shared runtime loader");
assert(!practice.includes('src="solutions-data.js'), "Practice must not preload full solutions");
assert(!practice.includes("tex-svg.js"), "Practice must not preload MathJax");

const exam = read("exam.html");
assert(exam.includes("exam-bootstrap.js"), "Exam must use the course bootstrap");
assert(exam.includes("runtime-loader.js"), "Exam must load the shared runtime loader");
[
  "questions-data.js",
  "solutions-data.js",
  "wma11-data.js",
  "wma12-data.js",
  "wme01-data.js",
  "tex-svg.js"
].forEach((name) => assert(!exam.includes(`src="${name}`) && !exam.includes(`src="ial/${name}`), `Exam must not statically preload ${name}`));

const answerSandbox = { window: {} };
vm.runInNewContext(read("answer-index.js"), answerSandbox, { filename: "answer-index.js" });
const answerIndex = answerSandbox.window.ELITE_ANSWER_INDEX || {};
assert.strictEqual(Object.keys(answerIndex).length, 1440, "Answer index count changed");
assert(Object.values(answerIndex).every((row) => row.hasSolution && typeof row.finalAnswer === "string"), "Answer index rows must remain complete");

const loader = read("runtime-loader.js");
assert(loader.includes("ensureMathJax"), "Runtime loader must expose lazy MathJax");
assert(loader.includes("scriptPromises"), "Runtime loader must deduplicate requests");

const bootstrap = read("exam-bootstrap.js");
["wma11-data.js", "wma12-data.js", "wme01-data.js", "questions-data.js"].forEach((name) => {
  assert(bootstrap.includes(name), `Exam bootstrap is missing ${name}`);
});
assert(bootstrap.includes("topic-normalizer.js"), "IGCSE exam data must be normalized after lazy loading");
assert(bootstrap.indexOf("topic-normalizer.js") < bootstrap.indexOf('"exam.js'), "Topic normalization must run before exam.js");

const fullSolutionsBytes = fs.statSync(path.join(root, "solutions-data.js")).size;
const answerIndexBytes = fs.statSync(path.join(root, "answer-index.js")).size;
assert(answerIndexBytes < fullSolutionsBytes * 0.2, "Compact answer index exceeds the 20% budget");

console.log(JSON.stringify({
  status: "PASS",
  answerIndexCount: Object.keys(answerIndex).length,
  fullSolutionsBytes,
  answerIndexBytes,
  deferredBytes: fullSolutionsBytes - answerIndexBytes
}));
