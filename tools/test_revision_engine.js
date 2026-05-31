const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ROOT = path.resolve(__dirname, "..");

function runBrowserScript(sandbox, relativePath) {
  const source = fs.readFileSync(path.join(ROOT, relativePath), "utf8");
  vm.runInContext(source, sandbox, { filename: relativePath });
}

function loadRuntime() {
  const sandbox = {
    console,
    localStorage: {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {}
    }
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  runBrowserScript(sandbox, "questions-data.js");
  runBrowserScript(sandbox, "topic-normalizer.js");
  runBrowserScript(sandbox, "ial/wma11/wma11-data.js");
  runBrowserScript(sandbox, "revision-engine.js");
  return sandbox;
}

function assertRevisionBook(engine, label, pool, options = {}) {
  const uniqueCount = new Set(pool.map(engine.sourceKey)).size;
  const requestedCount = Number(options.count || 50);
  const minimumCount = Number(options.minimumCount || requestedCount);
  const targetCount = Math.max(requestedCount, minimumCount);
  const expectedCount = Math.min(targetCount, uniqueCount);
  const book = engine.buildRevisionBook(pool, {
    count: requestedCount,
    minimumCount,
    seed: `test-${label}`,
    ...options
  });
  assert.equal(book.questions.length, expectedCount, `${label}: revision book should select the requested unique-question target`);
  assert.equal(new Set(book.questions.map(engine.sourceKey)).size, book.questions.length, `${label}: revision book should not repeat source questions`);
  assert.ok(book.analysis.topics.length > 0, `${label}: topic analysis should not be empty`);
  const eligibleTopicCount = new Set(pool.map(engine.primaryTopic)).size;
  const selectedTopics = book.questions.map(engine.primaryTopic);
  const selectedTopicCount = new Set(selectedTopics).size;
  const topicCounts = selectedTopics.reduce((rows, topic) => rows.set(topic, (rows.get(topic) || 0) + 1), new Map());
  const maxTopicRepeats = Math.max(0, ...topicCounts.values());
  const expectedCoverage = Math.min(expectedCount, eligibleTopicCount);
  const expectedCap = Math.max(1, Math.ceil(expectedCount / Math.max(1, eligibleTopicCount)));
  assert.equal(selectedTopicCount, expectedCoverage, `${label}: revision book should cover as many topics as the target allows`);
  assert.ok(maxTopicRepeats <= expectedCap + 1, `${label}: no topic should dominate the booklet`);
  if (eligibleTopicCount >= expectedCount) {
    assert.equal(maxTopicRepeats, 1, `${label}: topics should not repeat when enough topics are available`);
  }
  for (let index = 1; index < selectedTopics.length; index += 1) {
    assert.notEqual(selectedTopics[index], selectedTopics[index - 1], `${label}: adjacent questions should be interleaved by topic`);
  }
  assert.ok(book.analysis.topics[0].probability >= 0, `${label}: top topic should expose a probability score`);
}

const runtime = loadRuntime();
const engine = runtime.EliteRevisionEngine;

assert.ok(engine, "EliteRevisionEngine should be exported");

const igcseAll = runtime.QUESTION_DATA.filter((question) => question.bank === "all");
const modularUnit1 = igcseAll.filter((question) => question.modular_unit === "Unit 1");
const pureWma11 = runtime.WMA11_QUESTIONS;

assertRevisionBook(engine, "linear", igcseAll, { pathway: "linear", course: "igcse", profile: "prediction" });
assertRevisionBook(engine, "modular-unit-1", modularUnit1, { pathway: "modular", course: "igcse", profile: "prediction" });
assertRevisionBook(engine, "pure-wma11", pureWma11, { pathway: "pure", course: "wma11", profile: "prediction" });
assertRevisionBook(engine, "linear-quick-quiz", igcseAll, {
  pathway: "linear",
  course: "igcse",
  profile: "prediction",
  count: 10,
  minimumCount: 10
});

console.log("revision engine smoke checks passed");
