const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
// The exact cache-buster changes on every release, so pin the invariant that
// actually matters instead of one literal: every primary page links the shared
// stylesheets, they are cache-busted, and they all agree on the same version.
const SYSTEM_LINK = /elite-system\.css\?v=([A-Za-z0-9._-]+)/;
const UX_LINK = /elite-ux\.css\?v=([A-Za-z0-9._-]+)/;
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const lead = read("lead.js");
const home = read("index.html");
const system = read("elite-system.css");

// 2026-10-09 library cleanup: Notes, Classified Books, Past Papers, Mock Generator, Progress
const expectedOrder = '["notes", "books", "past-solutions", "build-test", "progress"]';
if (!lead.includes(`const CORE_TOOL_ORDER = ${expectedOrder};`)) {
  throw new Error("The shared workspace does not expose the five primary tools in the approved order.");
}

for (const label of ["Notes", "Past Papers", "Classified Books", "Mock Generator", "Progress"]) {
  if (!lead.includes(`title: "${label}"`)) throw new Error(`Missing primary tool copy: ${label}`);
}
const resourceSources = [lead, read("course-modules.js"), read("course.js"), read("library.js"), read("library-data.js")].join("\n");
if (/Adaptive Classified|AdaptiveClassified|#adaptive|download-adaptive/i.test(resourceSources)) {
  throw new Error("A public course surface still exposes the removed Adaptive Classified.");
}

// the home page is only the course choice: six course cards + other courses, no tool grid or marketing blocks
for (const marker of ['id="courseLauncher"', "Choose your course", "Other courses"]) {
  if (!home.includes(marker)) throw new Error(`Missing homepage clarity marker: ${marker}`);
}
for (const course of ["pathway=linear", "unit=Unit+1", "unit=Unit+2", "course=wma11", "course=wma12", "course=wme01"]) {
  if (!home.includes(`course.html?${course.startsWith("unit") ? "pathway=modular&amp;" : course.startsWith("course") ? "pathway=pure&amp;" : ""}${course}`)) {
    throw new Error(`Home page is missing the course card for ${course}`);
  }
}
for (const removed of ["home-route-guide", "home-proof-pricing", "home-hero-proof"]) {
  if (home.includes(removed)) throw new Error(`Home page still carries the old block: ${removed}`);
}

for (const selector of [
  ".home-core-grid",
  ".home-route-steps",
  ".pathway-tool-strip.is-core-workspace",
  'data-module="progress"',
  "@media (prefers-reduced-motion: reduce)",
]) {
  if (!system.includes(selector)) throw new Error(`Missing shared visual rule: ${selector}`);
}

const htmlFiles = [];
const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".git") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.name.endsWith(".html")) htmlFiles.push(full);
  }
};
walk(root);
const stale = htmlFiles.filter((file) => {
  const text = fs.readFileSync(file, "utf8");
  return text.includes("elite-system.css?v=20260817a") || text.includes("lead.js?v=20260817a");
});
if (stale.length) throw new Error(`Stale shared asset versions remain in: ${stale.join(", ")}`);

const systemVersions = new Map();
const missingUx = [];
for (const file of htmlFiles) {
  const text = fs.readFileSync(file, "utf8");
  const sys = text.match(SYSTEM_LINK);
  if (!sys) continue;
  systemVersions.set(path.relative(root, file), sys[1]);
  const ux = text.match(UX_LINK);
  if (!ux) { missingUx.push(path.relative(root, file)); continue; }
  if (text.indexOf(ux[0]) < text.lastIndexOf("rel=\"stylesheet\"")) {
    missingUx.push(path.relative(root, file) + " (elite-ux.css is not the last stylesheet)");
  }
}
if (systemVersions.size < 18) throw new Error(`The shared Elite System stylesheet is not cache-busted across the primary pages (found ${systemVersions.size}).`);
const distinctVersions = new Set(systemVersions.values());
if (distinctVersions.size !== 1) throw new Error(`Pages disagree on the Elite System cache-buster: ${[...distinctVersions].join(", ")}`);
if (missingUx.length) throw new Error(`elite-ux.css must load last on every Elite System page. Problems in: ${missingUx.join(", ")}`);

console.log(`UI workspace checks passed for ${htmlFiles.length} HTML files.`);
