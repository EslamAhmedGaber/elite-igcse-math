const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = process.env.ELITE_SITE_ROOT || path.resolve(__dirname, '..');
const {launch, startServer} = require(path.join(root, 'tools/test_exam_print_a4.js'));
const out = process.env.ELITE_PROGRESS_OUTPUT || path.join(require('node:os').tmpdir(), 'elite-progress-evidence');
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const courses = [
  ['linear','practice.html?pathway=linear','progress.html?pathway=linear','solvedExpertiseQuestions','eliteMistakeBoxV1'],
  ['modular-u1','practice.html?pathway=modular&unit=Unit+1','progress.html?pathway=modular&unit=Unit+1','solvedExpertiseQuestions','eliteMistakeBoxV1'],
  ['modular-u2','practice.html?pathway=modular&unit=Unit+2','progress.html?pathway=modular&unit=Unit+2','solvedExpertiseQuestions','eliteMistakeBoxV1'],
  ...['wma11','wma12','wme01'].map(c => [c,`ial/${c}/index.html#ialFilters`,`progress.html?pathway=pure&course=${c}`,`elite${c.toUpperCase()}SolvedV1`,`elite${c.toUpperCase()}MistakeBoxV1`])
];
async function main() {
  fs.mkdirSync(out,{recursive:true});
  const server = process.env.ELITE_LIVE_BASE ? null : await startServer();
  const base = process.env.ELITE_LIVE_BASE || server.base;
  const browser = await launch();
  try {
    const tab = await browser.openTab();
    await tab.send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
    for(const [course,practice,progress,key,reviewKey] of courses) {
      await tab.goto(base+'/'+practice,"Boolean(document.querySelector('.qp-controls input'))");
      const id = await tab.eval("document.querySelector('.qp-controls input').dataset.qpId");
      await tab.eval(`localStorage.setItem(${JSON.stringify(key)},JSON.stringify(['legacy-do-not-delete']));localStorage.setItem(${JSON.stringify(reviewKey)},JSON.stringify({[${JSON.stringify(id)}]:{id:${JSON.stringify(id)},level:1,dueAt:123,addedAt:100}}));true`);
      await tab.goto(base+'/'+practice,"Boolean(document.querySelector('.qp-controls input'))");
      await tab.eval("document.querySelector('.qp-controls input').focus();document.querySelector('.qp-controls input').click();true");
      const saved = await tab.eval(`JSON.parse(localStorage.getItem(${JSON.stringify(key)}))`);
      assert.ok(saved.includes(id),course+' saved');
      assert.ok(saved.includes('legacy-do-not-delete'),course+' legacy preserved');
      assert.equal(await tab.eval(`JSON.parse(localStorage.getItem(${JSON.stringify(reviewKey)}))[${JSON.stringify(id)}].level`),1,'solved must not advance review');
      await tab.eval("document.querySelector('.qp-toast button').click();true");
      assert.deepEqual(await tab.eval(`JSON.parse(localStorage.getItem(${JSON.stringify(key)}))`),['legacy-do-not-delete']);
      await tab.eval("document.querySelector('.qp-controls input').click();true");
      await tab.goto(base+'/'+practice,"Boolean(document.querySelector('.qp-controls input'))");
      assert.equal(await tab.eval("document.querySelector('.qp-controls input').checked"),true);
      await tab.eval("document.querySelector('.qp-review input').focus();document.querySelector('.qp-review input').click();true");
      assert.equal(await tab.eval(`Boolean(JSON.parse(localStorage.getItem(${JSON.stringify(reviewKey)}))[${JSON.stringify(id)}])`),false);
      await tab.eval("document.querySelector('.qp-toast button').click();true");
      assert.equal(await tab.eval(`JSON.parse(localStorage.getItem(${JSON.stringify(reviewKey)}))[${JSON.stringify(id)}].level`),1);
      // Block only the relevant persistence write, not any browser security setting.
      await tab.eval(`(() => {const original=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k===${JSON.stringify(key)})throw new DOMException('Test quota','QuotaExceededError');return original.call(this,k,v);};try{const box=document.querySelector('.qp-controls input');box.focus();box.click();}finally{Storage.prototype.setItem=original;}return true;})()`);
      assert.equal(await tab.eval("document.querySelector('.qp-controls input').checked"),true,'failed save restores checkbox');
      assert.match(await tab.eval("document.querySelector('.qp-toast').textContent"),/Not saved/);
      await tab.eval("document.querySelector('.qp-toast').hidden=true;document.documentElement.style.scrollBehavior='auto';document.querySelector('.qp-controls').scrollIntoView({block:'center',behavior:'instant'});true");
      await pause(350);
      let screenshot=await tab.send('Page.captureScreenshot',{format:'png'});
      fs.writeFileSync(path.join(out,course+'-practice.png'),Buffer.from(screenshot.data,'base64'));
      await tab.goto(base+'/'+progress,"Boolean(document.getElementById('quickTopics')?.children.length) && document.body.dataset.activeTab === 'dashboard'");
      const report=await tab.eval(`({solved:Number(document.getElementById('quickSolved').textContent),review:Number(document.getElementById('quickReviewCount').textContent),total:document.getElementById('quickTotal').textContent,course:document.getElementById('quickCourse').value,link:document.getElementById('quickContinue').href,overflow:document.documentElement.scrollWidth>innerWidth+1,visible:!document.querySelector('.qp-overview').hidden})`);
      assert.equal(report.solved,1,JSON.stringify(report));
      assert.equal(report.review,1,JSON.stringify(report));
      assert.equal(report.course,course);
      assert.equal(report.visible,true);
      assert.equal(report.overflow,false,course+' desktop overflow');
      assert.ok(report.link.includes(course.startsWith('w') ? `ial/${course}/` : 'practice.html'), 'correct course practice destination');
      const reviewLink = await tab.eval("document.getElementById('quickReview').href");
      await tab.eval("document.documentElement.style.scrollBehavior='auto';scrollTo({top:0,behavior:'instant'});true");
      await pause(350);
      screenshot=await tab.send('Page.captureScreenshot',{format:'png'});
      fs.writeFileSync(path.join(out,course+'-progress.png'),Buffer.from(screenshot.data,'base64'));
      await tab.eval("document.querySelector('[data-tab-target=scores]').click();true");
      assert.equal(await tab.eval("document.querySelector('.dashboard-analysis-strip').hidden"),false);
      await tab.eval("document.querySelector('[data-tab-target=dashboard]').click();true");
      await tab.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
      assert.equal(await tab.eval('document.documentElement.scrollWidth>innerWidth+1'),false,course+' mobile overflow');
      await tab.eval("scrollTo({top:0,behavior:'instant'});true");
      await pause(350);
      screenshot=await tab.send('Page.captureScreenshot',{format:'png'});
      fs.writeFileSync(path.join(out,course+'-mobile.png'),Buffer.from(screenshot.data,'base64'));
      await tab.goto(reviewLink,"Boolean(document.querySelector('.qp-controls input'))");
      assert.equal(await tab.eval("document.querySelector('.qp-controls input').dataset.qpId"),id, 'review opens saved question');
      assert.equal(await tab.eval('document.documentElement.scrollWidth>innerWidth+1'),false,course+' practice mobile overflow');
      assert.ok(await tab.eval("document.querySelector('.qp-check').getBoundingClientRect().height >= 44"),'touch target');
      await tab.goto(report.link,"Boolean(document.querySelector('.qp-controls input'))");
      assert.equal(await tab.eval("new URL(location.href).searchParams.get('topic') !== null || new URL(location.href).searchParams.get('topic_id') !== null"),true, 'continue selects topic');
      await tab.send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
      console.log('PASS '+course+': mark/undo/review/reload/storage failure/overview/desktop/mobile '+report.total);
    }
    assert.deepEqual(tab.errors,[],'no uncaught page errors');
  } finally {await browser.close();if(server)await server.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
