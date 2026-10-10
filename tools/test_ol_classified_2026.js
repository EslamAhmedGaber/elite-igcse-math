"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const root = path.resolve(__dirname, "..");
function data(file, variable) {
  const scope = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(root, file), "utf8"), scope);
  return scope.window[variable];
}
const catalog = data("classified-books-data.js", "ELITE_CLASSIFIED_2026");
const notes = data("library-data.js", "ELITE_LIBRARY");
const registry = data("course-modules.js", "ELITE_COURSE_MODULES");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "data/ol-classified-2026-manifest.json")));
const assets = new Map(manifest.assets.map((a) => [a.asset, a]));
assert.equal(assets.size, 78);
const referenced = new Set();
for (const [id, expected] of Object.entries({linear: 58, unit1: 29, unit2: 32})) {
  const course = catalog.courses[id];
  assert.equal(course.topics.length, expected);
  assert.equal(new Set(course.topics.map((t) => t.id)).size, expected);
  assert.equal(course.chapters.flatMap((ch) => ch.topics).length, expected);
  if (id !== "linear") {
    assert.deepEqual(Array.from(course.topics, (t) => t.id), Array.from(notes.courses[id].notes.topics, (t) => t.olt));
    assert.equal(course.complete.pages, course.topics.reduce((total, t) => total + t.pages, 0) + 3);
  } else {
    assert.equal(course.chapters.length, 6);
    assert.equal(course.complete.pages, 2765);
  }
  for (const item of [course.complete, ...course.chapters.map((ch) => ch.book), ...course.topics]) {
    const record = assets.get(item.asset);
    assert(record, `Unlisted asset: ${item.asset}`);
    assert.equal(item.sha256, record.sha256);
    assert.equal(item.bytes, record.bytes);
    assert(item.pages > 0 && item.bytes > 0);
    assert(/^[A-Za-z0-9._-]+$/.test(item.asset), "Release filenames must not be rewritten by GitHub");
    assert(item.href.startsWith("https://github.com/EslamAhmedGaber/elite-igcse-math/releases/download/ol-classified-practice-20261010/"));
    assert(!/Solutions|Answers\.pdf/i.test(item.asset));
    referenced.add(item.asset);
  }
}
assert.equal(referenced.size, assets.size, "Every uploaded student PDF must be linked");
const linear = registry.navGroups.find((g) => g.id === "linear");
const modular = registry.navGroups.find((g) => g.id === "modular");
assert(linear.books.some((b) => b.actions.some((a) => a.href.includes("classified-books.html"))));
assert(linear.books.some((b) => b.actions.some((a) => a.href.startsWith("downloads/classified_problems.pdf"))));
assert.equal(modular.books.filter((b) => b.title.includes("Classified + Practice")).length, 2);
for (const unit of [1, 2]) {
  assert(modular.books.some((b) => b.actions.some((a) => a.href.startsWith(`downloads/Classified_4WM${unit}.pdf`))));
}
console.log("2026 edition verified: 78 student PDFs, 58/29/32 topics; current editions preserved.");
