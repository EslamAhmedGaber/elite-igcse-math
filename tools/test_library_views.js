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
  assert.doesNotMatch(page.root.innerHTML, /Adaptive Classified|lib-adaptive|#adaptive/, `${course}: notes view links to removed content`);
  assert.match(page.document.title, new RegExp(`^${title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} \\|`));

  const adaptive = createPage(`https://eliteigcse.com/library.html?${query}#adaptive`);
  assert.match(adaptive.root.innerHTML, /id="notes"/, `${course}: legacy hash no longer opens notes`);
  assert.doesNotMatch(adaptive.root.innerHTML, /Adaptive Classified|lib-adaptive|id="adaptive"/, `${course}: legacy hash rendered removed content`);
  assert.match(adaptive.document.title, new RegExp(`^${title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} \\|`));
}

const switched = createPage("https://eliteigcse.com/library.html?pathway=linear#notes");
switched.navigate("#adaptive");
assert.match(switched.root.innerHTML, /id="notes"/, "legacy adaptive hash stopped showing notes");
assert.doesNotMatch(switched.root.innerHTML, /Adaptive Classified|lib-adaptive|id="adaptive"/, "legacy hash rendered removed content");
switched.navigate("#notes");
assert.match(switched.root.innerHTML, /id="notes"/, "hash navigation did not return to Notes view");

console.log("Library views OK: all 6 routes stay notes-only, including legacy #adaptive URLs.");
