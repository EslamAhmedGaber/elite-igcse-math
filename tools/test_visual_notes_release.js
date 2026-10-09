"use strict";

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
if (library.version !== "20261009f") throw new Error(`Unexpected library release ${library.version}`);

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

for (const [courseId, course] of Object.entries(library.courses)) {
  if (Object.hasOwn(course, "adaptive")) {
    throw new Error(`${courseId} still exposes removed Adaptive Classified data`);
  }
}

console.log("Visual notes release OK: Linear 58/58, Unit 1 29/29, Unit 2 32/32; old Adaptive data absent.");
