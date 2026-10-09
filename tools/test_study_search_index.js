"use strict";

const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const sandbox = { window: {} };
vm.runInNewContext(
  fs.readFileSync(path.join(root, "study-search-data.js"), "utf8"),
  vm.createContext(sandbox),
  { filename: "study-search-data.js" }
);

const data = sandbox.window.ELITE_STUDY_SEARCH;
if (!data) throw new Error("Study search index was not exposed");
if (data.version !== "20261009b") throw new Error(`Unexpected Study search version ${data.version}`);

const expectedCourses = ["linear", "modular1", "modular2", "wma11", "wma12", "wme01"];
const actualCourses = new Set(data.courses.map((course) => course.id));
expectedCourses.forEach((courseId) => {
  if (!actualCourses.has(courseId)) throw new Error(`Missing course ${courseId}`);
});

data.courses.forEach((course) => {
  ["learn", "practise", "test", "revise", "repair", "progress", "books", "papers"].forEach((key) => {
    if (!course.links[key]) throw new Error(`${course.id} is missing ${key}`);
  });
});

if (data.stats.courses !== 6) throw new Error(`Expected 6 courses, found ${data.stats.courses}`);
if (data.stats.notes < 90) throw new Error(`Expected at least 90 note entries, found ${data.stats.notes}`);
if (data.stats.topics < 120) throw new Error(`Expected at least 120 topic entries, found ${data.stats.topics}`);
if (!data.items.some((item) => item.title.includes("Certificates") && item.href === "/admin.html")) {
  throw new Error("Teacher Studio certificate route is missing");
}
if (!data.items.some((item) => item.courseId === "wme01" && item.href.includes("/lab/"))) {
  throw new Error("Mechanics lab route is missing");
}
if (!data.items.some((item) => item.courseId === "modular1" && item.type === "Note")) {
  throw new Error("Modular Unit 1 shared notes are missing");
}
if (!data.items.some((item) => item.courseId === "modular2" && item.type === "Note")) {
  throw new Error("Modular Unit 2 shared notes are missing");
}

const linearNotes = data.items.filter((item) => item.type === "Note" && item.courseId === "linear");
if (linearNotes.length !== 52) throw new Error(`Expected 52 current Linear notes, got ${linearNotes.length}`);
linearNotes.forEach((note) => {
  if (!note.href.includes("/downloads/Linear/VisualNotes/") || !note.href.includes("v=20261009b")) {
    throw new Error(`Stale or unexpected Linear note search link: ${note.href}`);
  }
});

console.log(`Study search index OK: ${data.items.length} items across ${data.stats.courses} courses.`);
