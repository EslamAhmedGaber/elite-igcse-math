// Site statistics: every counter cloud-progress.js may write must be allowed by the Firestore rules,
// and the rules must not allow names the code never writes.
const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "..");
const code = fs.readFileSync(path.join(root, "cloud-progress.js"), "utf8");
const rules = fs.readFileSync(path.join(root, "docs", "firestore.rules"), "utf8");
const assert = (ok, message) => { if (!ok) { console.error(`FAIL: ${message}`); process.exit(1); } };

const codeList = code.match(/const STATS_KEYS = \[([\s\S]*?)\];/);
assert(codeList, "STATS_KEYS list missing from cloud-progress.js");
const codeKeys = [...codeList[1].matchAll(/"([a-z0-9_]+)"/g)].map((m) => m[1]);
const block = rules.match(/match \/site_stats\/\{day\} \{[\s\S]*?hasOnly\(\[([\s\S]*?)\]\)/);
assert(block, "site_stats rules block missing from docs/firestore.rules");
const ruleKeys = [...block[1].matchAll(/'([a-z0-9_]+)'/g)].map((m) => m[1]);
const missing = codeKeys.filter((k) => !ruleKeys.includes(k));
const extra = ruleKeys.filter((k) => !codeKeys.includes(k));
assert(!missing.length, `rules do not allow: ${missing.join(", ")}`);
assert(!extra.length, `rules allow unused keys: ${extra.join(", ")}`);
assert(/allow get, list: if isTeacher\(\);/.test(rules.slice(rules.indexOf("match /site_stats/"))), "only the teacher may read site_stats");
assert(/match \/site_users\/\{userId\}/.test(rules), "site_users rules missing");
for (const page of ["stats.html", "members.html"]) {
  const html = fs.readFileSync(path.join(root, page), "utf8");
  assert(html.includes('name="robots" content="noindex, nofollow"'), `${page} must stay out of search engines`);
}
console.log(`Site stats OK: ${codeKeys.length} counters match the Firestore rules.`);
