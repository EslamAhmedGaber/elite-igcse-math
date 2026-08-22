const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const CURRENT_ASSET_VERSION = "20260822a";
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

const currentSystemLinks = htmlFiles.filter((file) => fs.readFileSync(file, "utf8").includes(`elite-system.css?v=${CURRENT_ASSET_VERSION}`));
if (currentSystemLinks.length < 18) throw new Error("The shared Elite System stylesheet is not cache-busted across the primary pages.");

console.log(`UI workspace checks passed for ${htmlFiles.length} HTML files.`);
