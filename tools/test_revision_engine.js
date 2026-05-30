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
  const expectedCount = Math.min(50, uniqueCount);
  const book = engine.buildRevisionBook(pool, {
    count: 50,
    minimumCount: 50,
    seed: `test-${label}`,
    ...options
  });
  assert.equal(book.questions.length, expectedCount, `${label}: revision book should select the expected 50-question target`);
  assert.ok(book.analysis.topics.length > 0, `${label}: topic analysis should not be empty`);
  const selectedTopicCount = new Set(book.questions.map(engine.primaryTopic)).size;
  assert.ok(selectedTopicCount >= Math.min(4, book.analysis.topics.length), `${label}: selected book should cover multiple topics`);
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

console.log("revision engine smoke checks passed");
