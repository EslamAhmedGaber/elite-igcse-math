"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const sandbox = { window: {} };
vm.runInNewContext(
  fs.readFileSync(path.join(root, "library-data.js"), "utf8"),
  vm.createContext(sandbox),
  { filename: "library-data.js" }
);

const library = sandbox.window.ELITE_LIBRARY;
if (library.version !== "20261009d") throw new Error(`Unexpected library release ${library.version}`);

const expected = { linear: [58, 58], unit1: [29, 29], unit2: [32, 32] };
const completeMessages = {
  unit1: "All 29 Unit 1 visual notes with answers are live.",
  unit2: "All 32 Unit 2 visual notes with answers are live.",
};
for (const [courseId, message] of Object.entries(completeMessages)) {
  if (library.courses[courseId].notes.releaseStatus.message !== message) {
    throw new Error(`${courseId} has an inaccurate notes release message`);
  }
}

for (const [courseId, [available, total]] of Object.entries(expected)) {
  const notes = library.courses[courseId].notes;
  const topics = notes.chapters
    ? notes.chapters.flatMap((chapter) => chapter.topics)
    : notes.topics;
  const linked = topics.filter((topic) => topic.href);
  if (linked.length !== available || topics.length !== total) {
    throw new Error(`${courseId}: expected ${available}/${total}, got ${linked.length}/${topics.length}`);
  }
  if ((notes.complete || []).length || (notes.chapters || []).some((chapter) => chapter.booklet)) {
    throw new Error(`${courseId} still exposes a superseded O-Level notes booklet`);
  }
  linked.forEach((topic) => {
    if (!topic.href.startsWith("downloads/Linear/VisualNotes/") || !topic.href.includes("v=20261009c")) {
      throw new Error(`${courseId} has a stale note URL: ${topic.href}`);
    }
    const asset = path.resolve(root, topic.href.split("?", 1)[0]);
    const allowedRoot = path.resolve(root, "downloads/Linear/VisualNotes") + path.sep;
    if (!asset.startsWith(allowedRoot) || !fs.existsSync(asset)) {
      throw new Error(`${courseId} note PDF is missing or outside the release directory: ${asset}`);
    }
  });
}

const adaptive = Object.fromEntries(["linear", "unit1", "unit2"].map((id) => [id, library.courses[id].adaptive]));
const adaptiveHash = crypto.createHash("sha256").update(JSON.stringify(adaptive)).digest("hex");
if (adaptiveHash !== "0b1658adbc56ddfccb0a1aa4d50aaa66e717745fd5112c82f79a9f7960f82890") {
  throw new Error(`Adaptive Classified content changed unexpectedly: ${adaptiveHash}`);
}

console.log("Visual notes release OK: Linear 58/58, Unit 1 29/29, Unit 2 32/32; Adaptive Classified unchanged.");
