/* Exam builder quick start: every one-click card builds a paper, and the
 * "Download PDF" button on the ready bar saves a real A4 PDF without any
 * extra step. Usage: node tools/test_exam_quick_download.js
 * Optional ELITE_LIVE_BASE tests the deployed website instead of local files.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {launch, startServer, pdfPages, COURSES, READY} = require('./test_exam_print_a4.js');

const output = fs.mkdtempSync(path.join(os.tmpdir(), 'elite-quick-download-'));

async function main() {
  const server = process.env.ELITE_LIVE_BASE ? null : await startServer();
  const base = process.env.ELITE_LIVE_BASE || server.base;
  const browser = await launch();
  try {
    const tab = await browser.openTab();
    await tab.send('Emulation.setDeviceMetricsOverride', {width: 1366, height: 900, deviceScaleFactor: 1, mobile: false});
    await tab.send('Browser.setDownloadBehavior', {behavior: 'allow', downloadPath: output});
    for (const course of [COURSES[0], COURSES[1], COURSES[3], COURSES[5]]) {
      await tab.goto(`${base}/exam.html${course.query}`, READY);
      await tab.eval('localStorage.clear(); true');
      await tab.goto(`${base}/exam.html${course.query}`, READY);
      const built = await tab.eval(`(async () => {
        const frame = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        const out = {};
        for (const kind of ['quiz', 'topic', 'mistakes', 'real']) {
          document.querySelector('[data-quick=' + kind + ']').click();
          await frame();
          const ready = document.querySelector('[data-quick-ready]');
          const paper = JSON.parse(localStorage.getItem(${JSON.stringify(course.stateKey)}) || '{}');
          out[kind] = {ready: !ready.hidden, ids: (paper.ids || []).length, text: ready.innerText};
        }
        return out;
      })()`);
      for (const [kind, info] of Object.entries(built)) {
        assert.ok(info.ready && info.ids > 0, `${course.label}: quick ${kind} builds a ready paper`);
      }
      const real = built.real.text;
      if (course.key.startsWith('wm')) assert.match(real, /7[5-9] marks|8\d marks/, `${course.label}: real mock is about 75 marks`);
      else assert.match(real, /(9\d|10\d|11\d) marks/, `${course.label}: real mock is about 100 marks`);

      await tab.eval(`document.querySelector('[data-quick-act=download]').click(); true`);
      await tab.waitFor('Boolean(ElitePaperPrint.lastPdf)', `${course.label} one-click download`, 1800);
      const saved = await tab.eval('ElitePaperPrint.lastPdf');
      const file = path.join(output, saved.name);
      for (let i = 0; i < 100 && (!fs.existsSync(file) || fs.statSync(file).size !== saved.bytes); i++) await new Promise((r) => setTimeout(r, 100));
      assert.ok(fs.existsSync(file), `${course.label}: the PDF is saved`);
      assert.match(saved.name, /-Student\.pdf$/);
      assert.equal(pdfPages(fs.readFileSync(file)).pageCount, saved.pages, `${course.label}: every A4 page is in the PDF`);
      console.log(`${course.label}: quiz ${built.quiz.ids}, topic ${built.topic.ids}, mistakes ${built.mistakes.ids}, real ${built.real.ids} questions; downloaded ${saved.pages} pages, ${Math.round(saved.bytes / 1024)} KB`);
      await tab.eval('ElitePaperPrint.close(); ElitePaperPrint.lastPdf = null; true');
    }
    console.log('quick start + one-click download passed');
  } finally {
    await browser.close();
    server?.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
