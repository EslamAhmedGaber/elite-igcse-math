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

const expectedOrder = '["notes", "classified", "past-solutions", "books", "build-test", "progress"]';
if (!lead.includes(`const CORE_TOOL_ORDER = ${expectedOrder};`)) {
  throw new Error("The shared workspace does not expose the six primary tools in the approved order.");
}

for (const label of ["Strategy Notes", "Classified Practice", "Past Papers", "Classified Books", "Mock Generator", "Progress Tracker"]) {
  if (!lead.includes(`title: "${label}"`)) throw new Error(`Missing primary tool copy: ${label}`);
}

for (const marker of [
  'class="home-route-guide"',
  "Simple study route",
  "Learn it. Practise it. Test it. Improve it.",
  'aria-label="Study tools"',
  "Expertise, revision and saved work",
]) {
  if (!home.includes(marker)) throw new Error(`Missing homepage clarity marker: ${marker}`);
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
