const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const site = path.join(__dirname, "..");
const dataSource = fs.readFileSync(path.join(site, "library-data.js"), "utf8");
const librarySource = fs.readFileSync(path.join(site, "library.js"), "utf8");

function createPage(url) {
  let currentUrl = new URL(url);
  const listeners = {};
  const root = { innerHTML: "" };
  const window = {
    get location() {
      return {
        get href() { return currentUrl.href; },
        get hash() { return currentUrl.hash; },
      };
    },
    addEventListener(type, callback) {
      listeners[type] = callback;
    },
  };
  const document = {
    title: "",
    querySelector(selector) {
      if (selector === "[data-library-root]") return root;
      if (root.innerHTML.includes(`id="${selector.slice(1)}"`)) {
        return { scrollIntoView() {} };
      }
      return null;
    },
  };
  const context = { document, setTimeout(callback) { callback(); }, URL, window };
  vm.runInNewContext(dataSource, context, { filename: "library-data.js" });
  vm.runInNewContext(librarySource, context, { filename: "library.js" });
  return {
    document,
    root,
    navigate(nextUrl) {
      currentUrl = new URL(nextUrl, currentUrl);
      listeners.hashchange();
    },
  };
}

const routes = [
  ["linear", "pathway=linear", "Linear Notes"],
  ["unit1", "pathway=modular&unit=Unit+1", "Modular Unit 1 Notes"],
  ["unit2", "pathway=modular&unit=Unit+2", "Modular Unit 2 Notes"],
  ["wma11", "pathway=pure&course=wma11", "Pure 1 Notes"],
  ["wma12", "pathway=pure&course=wma12", "Pure 2 Notes"],
  ["wme01", "pathway=pure&course=wme01", "Mechanics 1 Notes"],
];

for (const [course, query, title] of routes) {
  const page = createPage(`https://eliteigcse.com/library.html?${query}#notes`);
  assert.match(page.root.innerHTML, /id="notes"/, `${course}: notes section missing`);
  assert.doesNotMatch(page.root.innerHTML, /Adaptive Classified|lib-adaptive/, `${course}: notes view includes Adaptive content`);
  assert.match(page.document.title, new RegExp(`^${title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} \\|`));

  const adaptive = createPage(`https://eliteigcse.com/library.html?${query}#adaptive`);
  assert.match(adaptive.root.innerHTML, /id="adaptive"/, `${course}: Adaptive view missing`);
  assert.doesNotMatch(adaptive.root.innerHTML, /id="notes"|New Visual Notes/, `${course}: Adaptive view includes Notes content`);
  assert.match(adaptive.document.title, /Adaptive Classified/);
}

const switched = createPage("https://eliteigcse.com/library.html?pathway=linear#notes");
switched.navigate("#adaptive");
assert.match(switched.root.innerHTML, /lib-adaptive/, "hash navigation did not open Adaptive view");
switched.navigate("#notes");
assert.match(switched.root.innerHTML, /id="notes"/, "hash navigation did not return to Notes view");
assert.doesNotMatch(switched.root.innerHTML, /Adaptive Classified|lib-adaptive/, "returning to Notes did not hide Adaptive content");

console.log("Library views OK: notes-only and Adaptive-only routes work for all 6 courses.");
