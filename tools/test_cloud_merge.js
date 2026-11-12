// Checks the "pull before push" join in cloud-progress.js: signing in on a new device must add, never erase.
const fs = require("fs");
const code = fs.readFileSync(require("path").resolve(__dirname, "..", "cloud-progress.js"), "utf8");
const start = code.indexOf("  const WHOLE_VALUE_KEYS");
const end = code.indexOf("  function mergeCloudIntoLocal");
if (start < 0 || end < 0) throw new Error("merge helpers not found");
const mergeValue = new Function(`${code.slice(start, end)}; return mergeValue;`)();
const assert = require("assert");

// New device (nothing local) takes the account copy.
assert.deepStrictEqual(mergeValue(null, ["a", "b"], "solved"), ["a", "b"]);
assert.deepStrictEqual(mergeValue([], ["a", "b"], "solved"), ["a", "b"]);
// Empty account never erases the device.
const local = ["a", "b"];
assert.strictEqual(mergeValue(local, [], "solved"), local);
assert.strictEqual(mergeValue(local, null, "solved"), local);
// Both have work: union, device order first, no duplicates; unchanged device list is returned as-is.
assert.deepStrictEqual(mergeValue(["a", "b"], ["b", "c"], "solved"), ["a", "b", "c"]);
assert.strictEqual(mergeValue(local, ["a"], "solved"), local);
// Mistake Box (map): keys join, this device wins a tie.
assert.deepStrictEqual(mergeValue({ q1: { n: 2 } }, { q1: { n: 9 }, q2: { n: 1 } }, "eliteMistakeBoxV1"), { q1: { n: 2 }, q2: { n: 1 } });
// Mock history (objects): joined by id, otherwise by content.
assert.deepStrictEqual(mergeValue([{ id: 1, s: 70 }], [{ id: 1, s: 70 }, { id: 2, s: 81 }], "h"), [{ id: 1, s: 70 }, { id: 2, s: 81 }]);
assert.deepStrictEqual(mergeValue([{ s: 70 }], [{ s: 70 }, { s: 81 }], "h"), [{ s: 70 }, { s: 81 }]);
// A test in progress is never mixed with another one.
const mock = { questions: [1, 2], answers: {} };
assert.strictEqual(mergeValue(mock, { questions: [7, 8], answers: { 7: "x" } }, "eliteMockExamV1"), mock);
assert.strictEqual(mergeValue(mock, { questions: [7] }, "eliteMockExamV1:wma11"), mock);
assert.deepStrictEqual(mergeValue({}, { questions: [7] }, "eliteMockExamV1"), { questions: [7] });
// Plain values: the device keeps its own unless it has none.
assert.strictEqual(mergeValue("A*", "B", "x"), "A*");
assert.strictEqual(mergeValue("", "B", "x"), "B");
console.log("merge OK: 15 checks");
