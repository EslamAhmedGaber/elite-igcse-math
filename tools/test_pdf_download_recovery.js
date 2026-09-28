/* Real button download, failure/retry, cancellation and mobile PDF regression.
 * Usage: node tools/test_pdf_download_recovery.js [chrome|edge] [--pdf-dir DIR]
 * Optional ELITE_LIVE_BASE tests the deployed website instead of local files.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {launch,startServer,pdfPages,COURSES,READY,uiScript} = require('./test_exam_print_a4.js');
const args=process.argv.slice(2);
const output=args.includes('--pdf-dir') ? path.resolve(args[args.indexOf('--pdf-dir')+1]) : fs.mkdtempSync(path.join(os.tmpdir(),'elite-pdf-download-'));

async function main() {
  fs.mkdirSync(output,{recursive:true});
  const server=process.env.ELITE_LIVE_BASE ? null : await startServer();
  const base=process.env.ELITE_LIVE_BASE || server.base;
  const browser=await launch();
  try {
    const tab=await browser.openTab();
    await tab.send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
    await tab.send('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:output});
    await tab.goto(base+'/exam.html?pathway=pure&course=wme01',READY);
    await tab.eval(uiScript(COURSES[5].stateKey,`
      await set('examCount',5);
      await set('examSeed','RECOVERY');
      document.getElementById('printSolutionBtn').click();
      return true;
    `));
    await tab.waitFor('ElitePaperPrint.isReady()','solution preview');
    const screenshot=await tab.send('Page.captureScreenshot',{format:'png'});
    fs.writeFileSync(path.join(output,'desktop-preview.png'),Buffer.from(screenshot.data,'base64'));
    const first=await tab.eval(`(() => {
      const ids=localStorage.getItem('eliteMockExamV1:wme01');
      document.querySelector('.eps-overlay [data-act=download]').click();
      return {ids,pages:ElitePaperPrint.lastReport.pages};
    })()`);
    await tab.waitFor('Boolean(ElitePaperPrint.lastPdf)','real download',1200);
    const saved=await tab.eval('ElitePaperPrint.lastPdf');
    const file=path.join(output,saved.name);
    for(let i=0;i<100 && (!fs.existsSync(file) || fs.statSync(file).size!==saved.bytes);i++) await new Promise(r=>setTimeout(r,100));
    assert.ok(fs.existsSync(file),'clicking Download PDF saves a file');
    assert.equal(fs.statSync(file).size,saved.bytes,'the download completes');
    const parsed=pdfPages(fs.readFileSync(file));
    assert.equal(parsed.pageCount,first.pages);
    assert.match(saved.name,/-Solutions\.pdf$/);
    assert.equal(await tab.eval("localStorage.getItem('eliteMockExamV1:wme01')"),first.ids);
    console.log(`real solution download passed: ${saved.name}, ${saved.pages} pages, ${saved.bytes} bytes`);

    // A failed library request must restore controls; the next click can retry.
    const failed=await tab.eval(`(async () => {
      const append=Node.prototype.appendChild;
      Node.prototype.appendChild=function(node) {
        if(node.tagName==='IFRAME' && node.className==='eps-export-frame') {
          node.addEventListener('load',()=>{
            const win=node.contentWindow;
            const add=win.Node.prototype.appendChild;
            win.Node.prototype.appendChild=function(child){
              if(child.tagName==='SCRIPT') {setTimeout(()=>child.dispatchEvent(new Event('error')),0);return child;}
              return add.call(this,child);
            };
          },{once:true});
        }
        return append.call(this,node);
      };
      try {
        try { await ElitePaperPrint.buildPdfBlob(); return {failed:false}; }
        catch(error) { return {failed:true,message:error.message,frames:document.querySelectorAll('.eps-export-frame').length,enabled:!document.querySelector('.eps-overlay [data-act=download]').disabled}; }
      } finally {Node.prototype.appendChild=append;}
    })()`);
    assert.ok(failed.failed && failed.enabled && failed.frames===0,JSON.stringify(failed));
    assert.match(failed.message,/PDF tools/);

    const cancel=await tab.eval(`(async () => {
      let blocked=false;
      try {
        await ElitePaperPrint.buildPdfBlob(()=>{
          ElitePaperPrint.setOptions({layout:'compact'}).catch(()=>{blocked=true;});
          ElitePaperPrint.close();
        });
        return {cancelled:false};
      } catch(error) {
        return {cancelled:error.name==='AbortError',blocked,open:ElitePaperPrint.isOpen(),ready:ElitePaperPrint.isReady(),frames:document.querySelectorAll('.eps-export-frame').length};
      }
    })()`);
    assert.ok(cancel.cancelled && cancel.blocked && !cancel.open && !cancel.ready && cancel.frames===0,JSON.stringify(cancel));
    console.log('failure recovery, option lock and cancellation passed');

    await tab.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
    await tab.eval("document.getElementById('printSolutionBtn').click(); true");
    await tab.waitFor('ElitePaperPrint.isReady()','reopened mobile preview');
    const options={version:'solutions',placement:'inline',layout:'standard',ink:'mono'};
    await tab.eval(`ElitePaperPrint.setOptions(${JSON.stringify(options)}); true`);
    await tab.waitFor('ElitePaperPrint.isReady()','mobile inline solutions');
    const mobile=await tab.send('Page.captureScreenshot',{format:'png'});
    fs.writeFileSync(path.join(output,'mobile-preview.png'),Buffer.from(mobile.data,'base64'));
    await tab.eval('ElitePaperPrint.lastPdf=null; document.querySelector(".eps-overlay [data-act=download]").click(); true');
    await tab.waitFor('Boolean(ElitePaperPrint.lastPdf)','mobile real PDF download',1200);
    const mobileSaved=await tab.eval('ElitePaperPrint.lastPdf');
    const mobileFile=path.join(output,mobileSaved.name);
    for(let i=0;i<100 && (!fs.existsSync(mobileFile) || fs.statSync(mobileFile).size!==mobileSaved.bytes);i++) await new Promise(r=>setTimeout(r,100));
    assert.equal(fs.statSync(mobileFile).size,mobileSaved.bytes,'mobile download completes');
    assert.equal(pdfPages(fs.readFileSync(mobileFile)).pageCount,mobileSaved.pages,'mobile file opens with every page');
    assert.equal(await tab.eval("localStorage.getItem('eliteMockExamV1:wme01')"),first.ids);
    assert.deepEqual(tab.errors,[],'no runtime errors');
    console.log('mobile inline solution download after retry passed');
  } finally {await browser.close();if(server)await server.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
