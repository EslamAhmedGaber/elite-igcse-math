const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const solutionPath = path.join(root, "solutions-data.js");
const questionPath = path.join(root, "questions-data.js");
const outputPath = path.join(root, "answer-index.js");

global.window = {};
require(solutionPath);
require(questionPath);

const solutions = global.window.SOLUTION_DATA || {};
const questions = global.window.QUESTION_DATA || [];
const index = Object.fromEntries(Object.entries(solutions).map(([id, solution]) => [id, {
  finalAnswer: solution?.finalAnswer || "",
  hasSolution: Boolean(solution && (
    solution.source
    || (Array.isArray(solution.steps) && solution.steps.length)
    || solution.finalAnswer
  ))
}]));

const missing = questions.filter((question) => !index[question.id]);
if (missing.length) {
  throw new Error(`Answer index is missing ${missing.length} question IDs; first: ${missing[0].id}`);
}

const output = `(function (root) {\n  root.ELITE_ANSWER_INDEX = ${JSON.stringify(index)};\n})(window);\n`;
fs.writeFileSync(outputPath, output, "utf8");
console.log(JSON.stringify({
  questions: questions.length,
  solutions: Object.keys(solutions).length,
  indexed: Object.keys(index).length,
  bytes: Buffer.byteLength(output)
}));
