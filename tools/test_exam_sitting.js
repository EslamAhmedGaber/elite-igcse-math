/* Sitting and marking an exam on the site, plus the teacher tools.
 * Live bar (timer, done/flagged count, question navigator), answer box / Done / Flag
 * kept across a reload, two-tap Finish, marking with the student's answer beside the
 * final answer and Full / 0 buttons, history, Version B, answer key PDF, WhatsApp
 * share link and the time-up path. Usage: node tools/test_exam_sitting.js
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {launch, startServer, pdfPages, COURSES, READY} = require('./test_exam_print_a4.js');

const output = fs.mkdtempSync(path.join(os.tmpdir(), 'elite-exam-sitting-'));
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  const server = process.env.ELITE_LIVE_BASE ? null : await startServer();
  const base = process.env.ELITE_LIVE_BASE || server.base;
  const browser = await launch();
  try {
    const tab = await browser.openTab();
    await tab.send('Emulation.setDeviceMetricsOverride', {width: 1366, height: 900, deviceScaleFactor: 1, mobile: false});
    await tab.send('Browser.setDownloadBehavior', {behavior: 'allow', downloadPath: output});
    for (const course of [COURSES[0], COURSES[3]]) {
      const url = `${base}/exam.html${course.query}`;
      const key = JSON.stringify(course.stateKey);
      await tab.goto(url, READY);
      await tab.eval('localStorage.clear(); true');
      await tab.goto(url, READY);

      // Build, start, and use the sit controls.
      const sit = await tab.eval(`(async () => {
        const wait = (ms) => new Promise((r) => setTimeout(r, ms));
        document.querySelector('[data-quick=quiz]').click(); await wait(150);
        document.querySelector('[data-quick-act=start]').click(); await wait(300);
        const bar = document.getElementById('examLiveBar');
        const ids = JSON.parse(localStorage.getItem(${key})).ids;
        const input = document.querySelector('[data-answer-id]');
        input.value = 'x = 7'; input.dispatchEvent(new Event('input', {bubbles: true}));
        document.querySelectorAll('[data-done-id]')[1].click();
        document.querySelectorAll('[data-flag-id]')[2].click();
        await wait(50);
        await wait(800);
        const paper = document.getElementById('examPaper');
        window.scrollTo(0, paper.offsetTop + paper.offsetHeight - innerHeight); await wait(200);
        const stuck = Math.round(bar.getBoundingClientRect().top);
        window.scrollTo(0, 0);
        return {visible: !bar.hidden, stuck, time: bar.querySelector('[data-live-time]')?.textContent,
          chips: bar.querySelectorAll('.exam-nav-chip').length, ids: ids.length, count: bar.querySelector('.exam-live-count').textContent,
          finishHidden: document.getElementById('finishExamBtn').hidden, saveHidden: document.getElementById('saveExamBtn').hidden};
      })()`);
      assert.ok(sit.visible, `${course.label}: the live bar shows while sitting`);
      assert.match(sit.time, /^\d\d:\d\d$/, `${course.label}: the timer is visible`);
      assert.ok(sit.stuck >= 0 && sit.stuck <= 20, `${course.label}: the bar stays at the top while scrolling (top ${sit.stuck})`);
      assert.equal(sit.chips, sit.ids, `${course.label}: one navigator chip per question`);
      assert.match(sit.count, /2\/\d+ done · 1 flagged/, `${course.label}: done and flagged counts`);
      assert.equal(sit.finishHidden, false);
      assert.equal(sit.saveHidden, true);

      // Tapping a question opens it full screen; Escape closes it.
      const viewer = await tab.eval(`(() => { document.querySelector('.exam-question > img').click(); const open = Boolean(document.querySelector('.exam-viewer img'));
        document.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape'})); return {open, closed: !document.querySelector('.exam-viewer')}; })()`);
      assert.deepEqual(viewer, {open: true, closed: true}, `${course.label}: question viewer opens and closes`);

      // A reload keeps the answers, done ticks and flags.
      await tab.goto(url, READY);
      const kept = await tab.eval(`({value: document.querySelector('[data-answer-id]').value, flagged: document.querySelectorAll('.exam-question.is-flagged').length, done: document.querySelectorAll('.exam-nav-chip.is-done').length})`);
      assert.deepEqual(kept, {value: 'x = 7', flagged: 1, done: 2}, `${course.label}: reload keeps the sitting state`);

      // Two taps finish; marking shows the typed answer, final answers and quick marks.
      const marking = await tab.eval(`(async () => {
        const wait = (ms) => new Promise((r) => setTimeout(r, ms));
        const button = document.querySelector('[data-live-finish]');
        button.click(); await wait(50);
        const armed = button.textContent;
        const stillRunning = JSON.parse(localStorage.getItem(${key})).status;
        button.click(); await wait(2500);
        const status = JSON.parse(localStorage.getItem(${key})).status;
        const finals = document.querySelectorAll('.exam-mark-final').length;
        const yours = document.querySelector('.exam-mark-yours')?.textContent || '';
        const full = document.querySelector('[data-mark-id]');
        full.click(); await wait(50);
        const input = document.querySelector('[data-score-id="' + full.dataset.markId + '"]');
        return {armed, stillRunning, status, finals, yours, scored: input.value === full.dataset.markValue,
          bar: document.getElementById('examLiveBar').innerText, saveVisible: !document.getElementById('saveExamBtn').hidden};
      })()`);
      assert.match(marking.armed, /Tap again/, `${course.label}: first tap only arms Finish`);
      assert.equal(marking.stillRunning, 'running');
      assert.equal(marking.status, 'marking', `${course.label}: second tap finishes`);
      assert.ok(marking.finals > 0, `${course.label}: correct final answers are shown`);
      assert.match(marking.yours, /x = 7/, `${course.label}: the student's own answer is shown`);
      assert.ok(marking.scored, `${course.label}: Full sets the full marks`);
      assert.match(marking.bar, /marks so far/);
      assert.ok(marking.saveVisible);

      // Save -> history with a grade.
      const history = await tab.eval(`(async () => {
        const wait = (ms) => new Promise((r) => setTimeout(r, ms));
        document.querySelector('[data-live-save]').click(); await wait(200);
        const box = document.getElementById('examHistory');
        return {visible: !box.hidden, rows: box.querySelectorAll('.exam-history-list li').length, grade: box.querySelector('.exam-history-list em')?.textContent, bar: document.getElementById('examLiveBar').hidden};
      })()`);
      assert.deepEqual([history.visible, history.rows, history.bar], [true, 1, true], `${course.label}: history shows the saved paper`);
      assert.ok(history.grade, `${course.label}: history shows a grade`);

      // Version B: same length, same topics, no shared question.
      const versionB = await tab.eval(`(async () => {
        const wait = (ms) => new Promise((r) => setTimeout(r, ms));
        const before = JSON.parse(localStorage.getItem(${key}));
        document.getElementById('versionBBtn').click(); await wait(200);
        const after = JSON.parse(localStorage.getItem(${key}));
        return {before: before.ids, after: after.ids, title: after.title, notice: document.getElementById('examResultCard').innerText};
      })()`);
      assert.equal(versionB.after.length, versionB.before.length, `${course.label}: Version B has as many questions`);
      assert.equal(versionB.after.filter((id) => versionB.before.includes(id)).length, 0, `${course.label}: Version B shares no question`);
      assert.match(versionB.title, /Version B/);

      // WhatsApp share opens wa.me with the exact test link.
      const share = await tab.eval(`(() => { let opened = ''; const original = window.open; window.open = (u) => { opened = u; return null; };
        document.getElementById('shareExamBtn').click(); window.open = original; return decodeURIComponent(opened); })()`);
      assert.match(share, /^https:\/\/wa\.me\/\?text=/);
      assert.match(share, /paper=/, `${course.label}: the share text carries the test link`);

      // Answer key PDF from the More menu.
      await tab.eval(`(() => { document.querySelector('[data-exam-more-toggle]').click(); const open = !document.getElementById('examMoreMenu').hidden; document.getElementById('downloadKeyBtn').click(); return open; })()`);
      await tab.waitFor('Boolean(ElitePaperPrint.lastPdf)', `${course.label} answer key`, 1800);
      const saved = await tab.eval('ElitePaperPrint.lastPdf');
      const file = path.join(output, saved.name);
      for (let i = 0; i < 100 && (!fs.existsSync(file) || fs.statSync(file).size !== saved.bytes); i++) await wait(100);
      assert.match(saved.name, /-Answer-key-[A-Z0-9-]+\.pdf$/i, `${course.label}: answer key file name`);
      assert.doesNotMatch(saved.name, /Answer-key.*Answer-key/i, `${course.label}: "Answer key" appears once in the file name`);
      assert.equal(pdfPages(fs.readFileSync(file)).pageCount, saved.pages);
      await tab.eval('ElitePaperPrint.close(); ElitePaperPrint.lastPdf = null; true');

      // Time up: the paper moves to marking by itself.
      const timeUp = await tab.eval(`(async () => {
        const wait = (ms) => new Promise((r) => setTimeout(r, ms));
        document.querySelector('[data-quick-act=start]').click(); await wait(200);
        const st = JSON.parse(localStorage.getItem(${key}));
        st.startedAt = Date.now() - (st.durationSeconds + 5) * 1000;
        localStorage.setItem(${key}, JSON.stringify(st));
        return true;
      })()`);
      assert.ok(timeUp);
      await tab.goto(url, READY);
      await wait(2500);
      const after = await tab.eval(`({status: JSON.parse(localStorage.getItem(${key})).status, text: document.getElementById('examResultCard').innerText})`);
      assert.equal(after.status, 'marking', `${course.label}: time up moves to marking`);
      console.log(`${course.label}: sit/flag/reload, finish, quick marking (${marking.finals} final answers), history, Version B, WhatsApp, answer key ${saved.pages}p, time-up passed`);
    }
    console.log('exam sitting + teacher tools passed');
  } finally {
    await browser.close();
    server?.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
