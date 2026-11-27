// Run from the website root: node tools/verify_v7_tracker.cjs
const fs = require("node:fs");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const env = {window:{}};
vm.createContext(env);
for (const f of ["data/modular-v7-lessons.js","modular-v7-bank.js"]) {
  vm.runInContext(fs.readFileSync(f,"utf8"),env,{filename:f});
}
const {courses,worked} = env.window.EliteModularV7;
const ids = new Set();
for (const [u,topics,total] of [[1,37,492],[2,32,444]]) {
  const bank = courses["modular-"+u];
  assert.equal(bank.lessons.length,topics);
  assert.equal(bank.questions.length,total);
  const names = new Set(bank.lessons.map(l=>l.name));
  assert.equal(names.size,topics);
  for (const q of bank.questions) {
    assert(q.id.startsWith("V7-U"+u+"T") && !ids.has(q.id));
    ids.add(q.id);
    assert(names.has(q.topic) && q.modular_unit==="Unit "+u);
    assert(q.marks>0 && q.question_text.trim());
    for (const path of [q.image,worked[q.id].steps[0].figures[0].src]) {
      const bytes=fs.readFileSync(path);
      assert.equal(bytes.subarray(1,4).toString(),"PNG");
      assert(bytes.readUInt32BE(16)>0 && bytes.readUInt32BE(20)>0);
    }
  }
}
assert.equal(ids.size,Object.keys(worked).length);
console.log("Verified 69 lessons, 936 question IDs and 1,872 matched images.");
