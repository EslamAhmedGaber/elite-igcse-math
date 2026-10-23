// Renders tools/elite_practice/questions.cjs into the classified bank as the "Elite Practice" paper:
//   assets/questions/Elite_Practice__Qnn__...png   (exam-style question images, 993 px wide)
//   src/data/questions/Elite_Practice.json, src/data/solutions/Elite_Practice.json, papers.json entry
// Then run tools/build_runtime_data.py (SOURCE_DATE_EPOCH) to refresh questions-data.js / solutions-data.js.
//   node tools/elite_practice/build_elite_practice.cjs
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const ROOT = path.resolve(__dirname, '..', '..');
const questions = require('./questions.cjs');
const SLUG = 'Elite_Practice', PAPER = 'Elite Practice';
const UNIT = {'Quadratic Formula': 'Equations, Formulae & Identities', 'Powers & Roots': 'Numbers & the Number System', 'Number Toolkit': 'Numbers & the Number System', 'Using a Calculator': 'Numbers & the Number System', 'Fractions, Decimals & Percentages': 'Numbers & the Number System', 'Algebra Toolkit': 'Equations, Formulae & Identities', 'Kinematic Graphs': 'Sequences, Functions & Graphs'};
const runtime = process.env.ELITE_NODE_MODULES || path.join(os.homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const {chromium} = require(require.resolve('playwright', {paths: [runtime, __dirname]}));

function browserPath() {
  if (process.env.ELITE_BROWSER) return process.env.ELITE_BROWSER;
  const base = path.join(process.env.LOCALAPPDATA || '', 'ms-playwright');
  const dirs = fs.existsSync(base) ? fs.readdirSync(base).filter(d => d.startsWith('chromium_headless_shell-')).sort().reverse() : [];
  for (const d of dirs) for (const sub of fs.readdirSync(path.join(base, d))) {
    const exe = path.join(base, d, sub, 'chrome-headless-shell.exe');
    if (fs.existsSync(exe)) return exe;
  }
  return undefined;
}

const CSS = `body{margin:0;background:#fff;font-family:"Times New Roman",Times,serif;color:#000}
.q{width:993px;box-sizing:border-box;padding:18px 18px 10px 18px;font-size:21px;line-height:1.45}
.row{display:flex;gap:18px}.num{font-weight:bold;min-width:28px}.body{flex:1}
.intro{margin-bottom:14px}.graph{display:block;margin:10px auto 18px}
.part{margin:6px 0 4px}.ans{display:flex;justify-content:flex-end;align-items:flex-end;gap:6px;margin:34px 0 0}
.dots{display:inline-block;width:300px;border-bottom:2px dotted #444;height:1px}.mk{text-align:right;color:#777;font-weight:bold;margin:2px 0 8px}
.total{text-align:right;font-weight:bold;margin-top:14px;padding-bottom:6px;border-bottom:2px solid #999}
.fr{display:inline-flex;flex-direction:column;vertical-align:middle;text-align:center;margin:0 4px}.fr span:first-child{border-bottom:1.5px solid #000;padding:0 4px}`;

function questionHtml(q, n) {
  const parts = q.parts.map(p => `<div class="part">${p.html}</div><div class="ans">${p.answer ?? ''}<span class="dots"></span>${p.unit ? ` ${p.unit}` : ''}</div><div class="mk">(${p.marks})</div>`).join('');
  return `<div class="q" id="q"><div class="row"><div class="num">${n}</div><div class="body">${q.intro ? `<div class="intro">${q.intro}</div>` : ''}${q.graph || ''}${parts}</div></div><div class="total">(Total for Question ${n} is ${q.marks} mark${q.marks === 1 ? '' : 's'})</div></div>`;
}

const tag = topic => topic.replace(/&/g, 'and').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '');

async function main() {
  const browser = await chromium.launch({executablePath: browserPath()});
  const page = await browser.newPage({viewport: {width: 993, height: 800}, deviceScaleFactor: 1});
  const qRows = [], sRows = {};
  for (const [i, q] of questions.entries()) {
    const n = i + 1, nn = String(n).padStart(2, '0');
    const filename = `${SLUG}__Q${nn}__m${String(q.marks).padStart(2, '0')}__${tag(q.topic)}.png`;
    await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>${CSS}</style></head><body>${questionHtml(q, n)}</body></html>`);
    await page.locator('#q').screenshot({path: path.join(ROOT, 'assets', 'questions', filename)});
    const id = `all::${filename.replace(/\.png$/, '')}`;
    qRows.push({id, bank: 'all', q: n, marks: q.marks, topic: q.topic, unit: UNIT[q.topic], topicOrder: 0, image: `/assets/questions/${filename}`, filename, text: `${n} ${q.text} (Total for Question ${n} is ${q.marks} marks)`});
    sRows[id] = {status: 'checked', checkedBy: 'Elite original question (answers computed and checked, 2026-10-24)', updated: '2026-10-24T00:00:00', topicNote: `${q.topic}. Original Elite practice question.`, steps: q.steps.map(([title, body]) => ({title, body})), finalAnswer: q.final};
  }
  await browser.close();
  const marks = qRows.reduce((s, q) => s + q.marks, 0);
  const paper = {paper: PAPER, paperSlug: SLUG, session: 'Elite', code: 'EP', isModular: false, modularUnit: null};
  fs.writeFileSync(path.join(ROOT, 'src/data/questions', `${SLUG}.json`), JSON.stringify({...paper, questions: qRows, questionCount: qRows.length}, null, 2) + '\n');
  fs.writeFileSync(path.join(ROOT, 'src/data/solutions', `${SLUG}.json`), JSON.stringify({paperSlug: SLUG, solutions: sRows}, null, 2) + '\n');
  const papersPath = path.join(ROOT, 'src/data/papers.json');
  const papers = JSON.parse(fs.readFileSync(papersPath, 'utf8')).filter(p => p.paperSlug !== SLUG);
  papers.push({...paper, marks, questionCount: qRows.length});
  fs.writeFileSync(papersPath, JSON.stringify(papers, null, 2) + '\n');
  console.log(JSON.stringify({questions: qRows.length, marks}));
}
main().catch(e => { console.error(e); process.exit(1); });
