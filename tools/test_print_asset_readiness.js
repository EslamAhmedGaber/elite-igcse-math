/* Browser regression: incomplete images must never enable Print or Download. */
const assert = require('node:assert/strict');
const {launch, startServer, READY} = require('./test_exam_print_a4.js');

async function main() {
  const server = await startServer();
  const browser = await launch();
  try {
    const tab = await browser.openTab();
    await tab.goto(server.base + '/exam.html?pathway=pure&course=wma11', READY);
    await tab.eval(`(() => {
      const canvas=document.createElement('canvas'); canvas.width=700; canvas.height=170;
      const ctx=canvas.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,700,170);
      ctx.fillStyle='black';ctx.font='24px sans-serif';ctx.fillText('Solve 2x + 3 = 11.',30,50);
      window.assetTestSpec={title:'Image readiness test',courseCode:'WMA11',questions:[{id:'asset-1',image:canvas.toDataURL(),marks:2}]};
      ElitePaperPrint.open(assetTestSpec);return true;
    })()`);
    await tab.waitFor('ElitePaperPrint.isReady()', 'warm-up');
    for (const phase of ['source','final']) {
      await tab.eval(`(() => {
        ElitePaperPrint.close();window.decodeReleased=false;window.decodeWaiting=false;
        ElitePaperPrint.frame().addEventListener('load',()=>{
          const win=ElitePaperPrint.frame().contentWindow, original=win.HTMLImageElement.prototype.decode;
          win.HTMLImageElement.prototype.decode=function(){
            const pending=original.call(this);
            const isFinal=Boolean(this.closest('#sheets'));
            if(isFinal===${phase === 'final'} && !window.decodeReleased){
              window.decodeWaiting=true;
              return pending.then(()=>new Promise(resolve=>{
                const id=setInterval(()=>{if(window.decodeReleased){clearInterval(id);resolve();}},20);
              }));
            }
            return pending;
          };
        },{once:true});
        ElitePaperPrint.open(assetTestSpec);return true;
      })()`);
      await tab.waitFor('window.decodeWaiting', `${phase} decode reached`);
      const blocked=await tab.eval(`({ready:ElitePaperPrint.isReady(),buttons:[...document.querySelectorAll('.eps-overlay [data-act=print],.eps-overlay [data-act=download]')].map(b=>b.disabled)})`);
      assert.equal(blocked.ready,false);
      assert.deepEqual(blocked.buttons,[true,true]);
      await tab.eval('window.decodeReleased=true;true');
      await tab.waitFor('ElitePaperPrint.isReady()', `${phase} decode completed`);
      assert.equal(await tab.eval('ElitePaperPrint.lastReport.assetsReady'),true);
      console.log(`${phase} image decode: output blocked until complete`);
    }
    const printed=await tab.eval(`(() => {
      const win=ElitePaperPrint.frame().contentWindow;let called=false;
      win.print=()=>{called=[...win.document.querySelectorAll('#sheets img')].every(i=>i.complete&&i.naturalWidth>0);};
      document.querySelector('.eps-overlay [data-act=print]').click();return called;
    })()`);
    assert.equal(printed,true,'print handoff sees complete final images');
    await tab.eval(`ElitePaperPrint.open({...assetTestSpec,questions:[{id:'bad',image:'data:image/png;base64,invalid',marks:2}]});true`);
    await tab.waitFor("document.querySelector('.eps-overlay [data-status]').classList.contains('is-error')",'missing image error');
    assert.equal(await tab.eval('ElitePaperPrint.isReady()'),false);
    assert.equal(await tab.eval("document.querySelector('.eps-overlay [data-act=print]').disabled"),true);
    assert.equal(await tab.eval("document.querySelector('.eps-overlay [data-act=download]').disabled"),true);
    await tab.eval('ElitePaperPrint.open(assetTestSpec);true');
    await tab.waitFor('ElitePaperPrint.isReady()', 'retry after failed image');
    console.log('failed image blocks both outputs; retry restores readiness');
  } finally {await browser.close();await server.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
