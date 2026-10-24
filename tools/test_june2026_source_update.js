const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root,file),'utf8');
for (const mode of ['linear','modular']) {
  const window = {ELITE_PATHWAY:{mode,label:()=> 'Unit'}};
  const context = {window,localStorage:{getItem:()=>null},Map};
  vm.runInNewContext(read('questions-data.js'),context);
  vm.runInNewContext(read('topic-normalizer.js'),context);
  const rows = window.QUESTION_DATA.filter(q=>q.paper.startsWith('Jun 2026') && !String(q.paper_code).startsWith('4WM'));
  assert.equal(rows.length,mode==='linear'?104:106);
  assert.equal(rows.reduce((total,q)=>total+q.marks,0),400);
  assert.equal(new Set(rows.map(q=>q.id)).size,rows.length);
  assert(rows.every(q=>q.id.includes('-U')===(mode==='modular')));
  if (mode==='modular') {
    assert.equal(rows.filter(q=>q.modular_unit==='Unit 1').reduce((total,q)=>total+q.marks,0),171);
    assert.equal(rows.filter(q=>q.modular_unit==='Unit 2').reduce((total,q)=>total+q.marks,0),229);
    for (const prefix of ['Jun2026_P1H__Q05','Jun2026_P2HR__Q04']) {
      assert.equal(rows.filter(q=>q.source_id.startsWith(prefix)).length,2);
    }
  }
}
const window = {};
vm.runInNewContext(read('solutions-data.js'),{window});
vm.runInNewContext(read('answer-index.js'),{window});
vm.runInNewContext(read('worked-solution.js'),{window});
let figures=0;
for (const [id,solution] of Object.entries(window.SOLUTION_DATA)) {
  if (!id.includes('Jun2026') || id.includes('_4WM')) continue;
  assert(solution.steps.length && solution.finalAnswer);
  assert.equal(window.ELITE_ANSWER_INDEX[id].finalAnswer,solution.finalAnswer);
  for (const step of solution.steps) {
    for (const figure of step.figures || []) {
      assert(fs.existsSync(path.join(root,figure.src.replace(/^\//,''))));
      assert(window.EliteSolutionView.renderFigures(step).includes('<img'));
      figures++;
    }
  }
}
assert.equal(figures,22);
for (const src of ['javascript:alert(1)','https://example.com/x.png','/assets/solution-diagrams/../private.png']) {
  assert.equal(window.EliteSolutionView.renderFigures({figures:[{src}]}),'');
}
console.log('June2026: 104 Linear / 106 isolated Modular records, preserved400marks, 22 diagrams, complete compact answer index and safe figure URLs.');
