// Builds one static, search-readable page per course topic: every classified past-paper question on
// that topic (easiest first), its checked worked solution, how often the topic is examined, the topic
// notes PDF and links into the online practice / mock tools. Data sources are the same files the site
// runs on (questions-data.js, solutions-data.js, ial/<c>/<c>-data.js, library-data.js, topic index).
// Modular Unit 1 / Unit 2 share the Linear topic pages (same questions, same notes) - no duplicates.
//
//   node tools/build_topic_pages.cjs          write pages + data/topic-pages.json
//   node tools/build_topic_pages.cjs --check  fail if any generated file is stale
// Run before tools/build_seo_pages.cjs (it reads data/topic-pages.json for links and the sitemap).
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const seo = require('../seo-routes.js');

const ROOT = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const json = value => JSON.stringify(value).replace(/</g, '\\u003c');
const slug = text => String(text).toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const fileKey = href => String(href || '').split('?')[0];
const SESSION_ORDER = {Jan: 1, January: 1, Mar: 2, May: 5, MayJune: 6, MayJun: 6, Jun: 6, June: 6, Oct: 10, October: 10, Nov: 11, November: 11, Specimen: 0};

function sandbox() {
  const ctx = {console, localStorage: {getItem: () => null, setItem() {}}};
  ctx.window = ctx;
  vm.createContext(ctx);
  return ctx;
}

function pngSize(file) {
  const buf = Buffer.alloc(24);
  const fd = fs.openSync(file, 'r');
  fs.readSync(fd, buf, 0, 24, 0);
  fs.closeSync(fd);
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error(`Not a PNG: ${file}`);
  return {width: buf.readUInt32BE(16), height: buf.readUInt32BE(20)};
}

// IGCSE matches the Mock Generator (1-2 / 3-4 / 5+). IAL bands match the Mock Generator (1-6 / 7-8 / 9+).
const LEVEL_BANDS = {IGCSE: [2, 4], IAL: [6, 8]};
// Original Elite questions (tools/elite_practice) are labelled as practice, never as past-paper questions.
const isPractice = paper => /^Elite Practice/.test(String(paper));

function level(marks, family = 'IGCSE') {
  const [easy, medium] = LEVEL_BANDS[family];
  return marks <= easy ? 'Easy' : marks <= medium ? 'Medium' : 'Hard';
}

// Solution text: escape HTML, keep TeX for MathJax, blank lines -> paragraphs.
function richText(text) {
  return String(text || '').split(/\n{2,}/).map(part => part.trim()).filter(Boolean)
    .map(part => /^\\\[[\s\S]*\\\]$/.test(part) ? `<div class="tp-math">${esc(part)}</div>` : `<p>${esc(part).replace(/\n/g, ' ')}</p>`).join('');
}

function solutionHtml(solution) {
  if (!solution || solution.status !== 'checked' || !Array.isArray(solution.steps) || !solution.steps.length) return '';
  // Some steps repeat their title as the first line of the body ("(a)" then "(a)"): show it once.
  const body = step => {
    const text = String(step.body || '').trimStart();
    const title = String(step.title || '').trim();
    return text.startsWith(title) && /^\s*\n/.test(text.slice(title.length)) ? text.slice(title.length) : text;
  };
  const steps = solution.steps.map(step => `<li>${step.title ? `<strong>${esc(step.title)}</strong>` : ''}${richText(step.title ? body(step) : step.body)}</li>`).join('');
  const answer = solution.finalAnswer ? `<div class="tp-answer"><span>Final answer</span>${richText(solution.finalAnswer)}</div>` : '';
  return `<details class="tp-solution"><summary>Show worked solution</summary><ol>${steps}</ol>${answer}</details>`;
}

// ---------- data ----------
function loadLibrary() {
  const ctx = sandbox();
  vm.runInContext(read('course-modules.js'), ctx);
  vm.runInContext(read('library-data.js'), ctx);
  return {system: ctx.ELITE_COURSE_MODULES, library: ctx.ELITE_LIBRARY};
}

function noteTopics(course) {
  const notes = course.notes || {};
  return Array.isArray(notes.chapters) && notes.chapters.length ? notes.chapters.flatMap(ch => ch.topics || []) : notes.topics || [];
}

function igcseTopics(library) {
  const ctx = sandbox();
  ctx.ELITE_PATHWAY = {mode: 'linear'};
  vm.runInContext(read('questions-data.js'), ctx);
  vm.runInContext(read('topic-normalizer.js'), ctx);
  vm.runInContext(read('solutions-data.js'), ctx);
  vm.runInContext(read('data/topic-index/linear.js'), ctx);
  const index = ctx.ELITE_TOPIC_INDEX.linear;
  const byId = new Map(ctx.QUESTION_DATA.map(q => [q.id, q]));
  const allPapers = new Set(ctx.QUESTION_DATA.map(q => q.paper).filter(p => !isPractice(p)));
  const out = [];
  for (const note of noteTopics(library.courses.linear)) {
    const ids = index.topics[note.num]?.ids || [];
    const questions = ids.map(id => byId.get(index.prefix + id)).filter(Boolean).map(q => {
      const [, session, year] = String(q.paper).match(/^([A-Za-z]+)\s*(\d{4})/) || [];
      return {
        id: q.id,
        paper: q.paper,
        session, year: Number(year) || 0,
        qNo: q.question,
        marks: Number(q.marks) || 0,
        image: '/' + q.image,
        text: q.question_text || '',
        topic: q.topic,
        solution: ctx.SOLUTION_DATA[q.id],
        practice: `/practice.html?pathway=linear&bank=all&topic=${encodeURIComponent(q.topic)}`,
      };
    });
    if (!questions.length) continue;
    const counts = new Map();
    questions.forEach(q => counts.set(q.topic, (counts.get(q.topic) || 0) + 1));
    const bankTopic = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
    out.push({num: note.num, title: note.title, note, questions, bankTopic, totalPapers: allPapers.size});
  }
  return out;
}

function ialTopics(library, id) {
  const ctx = sandbox();
  vm.runInContext(read(`ial/${id}/${id}-data.js`), ctx);
  const KEY = id.toUpperCase();
  const topics = ctx[`${KEY}_TOPICS`], all = ctx[`${KEY}_QUESTIONS`];
  const notes = new Map(noteTopics(library.courses[id]).map(t => [String(t.num).padStart(2, '0'), t]));
  const allPapers = new Set(all.map(q => q.paper));
  return topics.map(topic => {
    const num = topic.slug.slice(0, 2);
    const note = notes.get(num);
    const questions = all.filter(q => (q.topics || [q.topic]).includes(topic.slug)).map(q => ({
      id: q.id,
      paper: q.paper,
      session: q.session, year: q.year,
      qNo: q.qNo,
      marks: Number(q.marks) || 0,
      image: '/' + q.image,
      text: '',
      cross: q.primaryTopic !== topic.slug ? q.primaryTopicName : '',
      solution: q,
      practice: `/ial/${id}/index.html?topic=${encodeURIComponent(topic.slug)}#ialFilters`,
    }));
    return {num, title: note?.title || topic.name, note, questions, bankTopic: topic.name, totalPapers: allPapers.size};
  }).filter(t => t.questions.length);
}

// ---------- page ----------
function shell({course, route, title, description, canonical, crumbs, body, ld, stat = 'pv_topic'}) {
  const graph = [
    {'@type': 'Organization', '@id': seo.origin + '/#organization', name: 'Elite Mathematics', url: seo.origin + '/', logo: seo.origin + '/assets/icon.svg'},
    {'@type': 'Person', '@id': seo.origin + '/about.html#eslam-ahmed', name: 'Dr Eslam Ahmed', url: seo.origin + '/about.html'},
    {'@type': 'CollectionPage', '@id': canonical, name: title, description, url: canonical, inLanguage: 'en', publisher: {'@id': seo.origin + '/#organization'}, author: {'@id': seo.origin + '/about.html#eslam-ahmed'}, breadcrumb: {'@id': canonical + '#breadcrumb'}, ...(ld || {})},
    {'@type': 'BreadcrumbList', '@id': canonical + '#breadcrumb', itemListElement: crumbs.map((c, i) => ({'@type': 'ListItem', position: i + 1, name: c.name, item: seo.origin + c.path}))},
  ];
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title><meta name="description" content="${esc(description)}"><link rel="canonical" href="${canonical}">
<meta property="og:type" content="website"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}"><meta property="og:url" content="${canonical}"><meta property="og:image" content="${seo.origin}/assets/og-image.png"><meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#0f2140"><link rel="icon" href="/assets/icon.svg" type="image/svg+xml"><link rel="stylesheet" href="/resource-pages.css?v=20261024c">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700&display=swap" rel="stylesheet">
<script type="application/ld+json">${json({'@context': 'https://schema.org', '@graph': graph})}</script></head>
<body data-stat="${stat}"><a class="resource-skip" href="#main">Skip to content</a>
<header class="resource-header"><div class="resource-wrap"><a class="resource-brand" href="/"><img src="/assets/icon.svg" width="40" height="40" alt="">Elite Mathematics</a><nav aria-label="Main"><a href="/#courseLauncher">All courses</a><a href="/course.html?${esc(course.query)}">My course</a><a href="/progress.html?${esc(course.query)}">My progress</a></nav></div></header>
<main id="main" class="resource-wrap"><nav class="resource-breadcrumb" aria-label="Breadcrumb">${crumbs.map((c, i) => i === crumbs.length - 1 ? `<span>${esc(c.name)}</span>` : `<a href="${c.path}">${esc(c.name)}</a>`).join('<span aria-hidden="true">/</span>')}</nav>
${body}
<div class="resource-author"><img src="/assets/Eslam4-home.jpg" width="56" height="56" alt="Dr Eslam Ahmed" loading="lazy"><div><a href="/about.html">Dr Eslam Ahmed</a><p>Elite Mathematics &middot; Questions classified by topic, solutions checked by Dr Eslam</p></div></div></main>
<footer class="resource-footer"><div class="resource-wrap"><nav aria-label="All course resources">${Object.entries(seo.routes).map(([id, r]) => `<a href="${r.path}">${esc(id === 'linear' ? 'Linear' : r.name.replace('Edexcel IGCSE Maths ', '').replace('Edexcel IAL ', ''))}</a>`).join('')}</nav><p>Elite Mathematics &middot; <a href="/about.html">About</a> &middot; <a href="https://wa.me/201120009622">WhatsApp Dr Eslam</a></p></div></footer>
<script src="/firebase-config.js" defer></script><script src="/topic-pages.js?v=20261024b" defer></script></body></html>
`;
}

function action(href, label, primary = false) {
  const pdf = /\.pdf(?:[?#]|$)/i.test(href);
  return `<a class="resource-action${primary ? ' primary' : ''}" href="${esc(href)}"${pdf ? ' target="_blank" rel="noopener"' : ''}>${esc(label)}${pdf ? ' <span aria-hidden="true">&#8599;</span>' : ''}</a>`;
}

function topicPage(ctx, topic, siblings) {
  const {course, route, courseLabel, family} = ctx;
  const qs = [...topic.questions].sort((a, b) => a.marks - b.marks || b.year - a.year || (SESSION_ORDER[b.session] || 0) - (SESSION_ORDER[a.session] || 0) || a.qNo - b.qNo);
  const papers = new Set(qs.map(q => q.paper).filter(p => !isPractice(p)));
  const practiceOnly = !papers.size;
  const practiceCount = qs.filter(q => isPractice(q.paper)).length;
  const years = qs.map(q => q.year).filter(Boolean);
  const span = years.length ? (Math.min(...years) === Math.max(...years) ? `${Math.min(...years)}` : `${Math.min(...years)}–${Math.max(...years)}`) : '';
  const marks = qs.reduce((s, q) => s + q.marks, 0);
  const solved = qs.filter(q => solutionHtml(q.solution)).length;
  const share = Math.round(100 * papers.size / topic.totalPapers);
  const counts = {Easy: 0, Medium: 0, Hard: 0};
  qs.forEach(q => counts[level(q.marks, family)]++);
  const pagePath = `${route.path}topics/${slug(topic.title)}/`;
  const canonical = seo.origin + pagePath;
  const title = practiceOnly ? `${topic.title} – ${courseLabel} Practice Questions & Solutions | Elite` : `${topic.title} – ${courseLabel} Past Paper Questions & Solutions | Elite`;
  const description = practiceOnly ? `${qs.length} exam-style ${topic.title} practice questions for Edexcel ${route.code}, easiest first, each with a worked solution. Plus topic notes and an online topic test.` : `${qs.length} ${topic.title} questions from Edexcel ${route.code} past papers${span ? ` (${span})` : ''}${practiceCount ? ` and Elite practice` : ''}, easiest first, ${solved === qs.length ? 'each with a worked solution' : `${solved} with worked solutions`}. Plus topic notes and an online topic test.`;
  const testHref = `/exam.html?${course.query}&mode=custom&topic=${encodeURIComponent(topic.bankTopic)}`;
  const actions = [
    topic.note?.href ? action('/' + topic.note.href, 'Topic notes (PDF)', true) : '',
    action(qs[0].practice, 'Practise online'),
    action(testHref, 'Build a topic test'),
  ].join('');
  const cards = qs.map((q, i) => {
    const size = pngSize(path.join(ROOT, q.image.slice(1)));
    const alt = `${q.paper} Question ${q.qNo} (${q.marks} marks): ${topic.title}${q.text ? ' – ' + q.text.replace(/\s+/g, ' ').replace(/\.{3,}/g, ' ').slice(0, 220).trim() : ''}`;
    return `<article class="tp-question" id="q${i + 1}"><header><h3>${i + 1}. ${esc(q.paper)} &middot; Q${esc(q.qNo)}</h3><span class="tp-meta"><span class="tp-level tp-${level(q.marks, family).toLowerCase()}">${level(q.marks, family)}</span>${q.marks} marks${q.cross ? ` &middot; main topic: ${esc(q.cross)}` : ''}</span></header>
<img src="${esc(q.image)}" width="${size.width}" height="${size.height}" alt="${esc(alt)}" loading="${i < 2 ? 'eager' : 'lazy'}" decoding="async">
${solutionHtml(q.solution) || `<p class="tp-nosol">Worked solution: <a href="${esc(q.practice)}">open it in the online practice</a>.</p>`}</article>`;
  }).join('\n');
  const others = siblings.filter(s => s !== topic).map(s => `<li><a href="${route.path}topics/${slug(s.title)}/">${esc(s.title)}</a> <small>${s.questions.length}</small></li>`).join('');
  const body = `<div class="resource-title"><span class="resource-kicker">${esc(family)} &middot; ${esc(route.code)} &middot; Topic</span><h1>${esc(topic.title)}: ${practiceOnly ? 'practice questions' : 'past paper questions'} &amp; worked solutions</h1>
<p>${practiceOnly ? `Recent ${esc(route.code)} Higher papers have not examined ${esc(topic.title)}, so these are original exam-style Elite practice questions` : `Every ${esc(topic.title)} question from the ${esc(route.code)} papers in our bank${span ? `, ${span}` : ''}${practiceCount ? ', plus original Elite practice questions' : ''}`}, sorted from easiest to hardest. Try each one first, then open the worked solution.</p>
<div class="resource-actions">${actions}</div></div>
<section class="resource-section tp-stats" aria-label="How often this topic is examined"><div><strong>${qs.length}</strong><span>questions</span></div><div><strong>${marks}</strong><span>marks in total</span></div><div><strong>${share}%</strong><span>of papers (${papers.size} of ${topic.totalPapers}) include it${practiceOnly ? ' &ndash; practise it with the Elite questions below' : ''}</span></div><div><strong>${counts.Easy}/${counts.Medium}/${counts.Hard}</strong><span>easy / medium / hard</span></div></section>
<section class="resource-section"><h2>Questions, easiest first</h2><p>Level is estimated from marks: ${family === 'IAL' ? '1–6 easy, 7–8 medium, 9+ hard' : '1–2 easy, 3–4 medium, 5+ hard'}.</p>
<div class="tp-list">
${cards}
</div></section>
<section class="resource-section"><h2>More ${esc(courseLabel)} topics</h2><ul class="resource-topic-grid tp-others">${others}</ul></section>`;
  const crumbs = [{name: 'Elite Mathematics', path: '/'}, {name: course.name, path: route.path}, {name: 'Topics', path: route.path + 'topics/'}, {name: topic.title, path: pagePath}];
  const html = shell({course, route, title, description, canonical, crumbs, body, ld: {about: topic.title, numberOfItems: qs.length}});
  return {path: pagePath, title, html, questions: qs.length, num: topic.num, topic: topic.title, notesHref: topic.note?.href ? fileKey(topic.note.href) : ''};
}

function hubPage(ctx, topics) {
  const {course, route, courseLabel, family} = ctx;
  const pagePath = route.path + 'topics/';
  const canonical = seo.origin + pagePath;
  const total = topics.reduce((s, t) => s + t.questions.length, 0);
  const title = `${courseLabel} Past Paper Questions by Topic | Elite`;
  const description = `${total} Edexcel ${route.code} past paper questions sorted into ${topics.length} topics, each with worked solutions, topic notes and an online topic test.`;
  const rows = topics.map(t => `<li class="resource-row"><div><strong><a href="${route.path}topics/${slug(t.title)}/">${esc(t.title)}</a></strong><small>${t.questions.length} questions &middot; ${t.questions.reduce((s, q) => s + q.marks, 0)} marks</small></div><div class="resource-actions">${action(`${route.path}topics/${slug(t.title)}/`, 'Open topic', true)}</div></li>`).join('');
  const body = `<div class="resource-title"><span class="resource-kicker">${esc(family)} &middot; ${esc(route.code)}</span><h1>${esc(courseLabel)} past paper questions by topic</h1><p>${esc(description)}</p></div>
<section class="resource-section"><ul class="resource-list">${rows}</ul></section>`;
  const crumbs = [{name: 'Elite Mathematics', path: '/'}, {name: course.name, path: route.path}, {name: 'Topics', path: pagePath}];
  return {path: pagePath, title, html: shell({course, route, title, description, canonical, crumbs, body}), questions: total, hub: true};
}

function build({check = false} = {}) {
  const {system, library} = loadLibrary();
  const courseOf = id => system.courses.find(c => c.id === id);
  const plans = [
    {id: 'linear', courseLabel: 'IGCSE Maths 4MA1', family: 'IGCSE', topics: igcseTopics(library)},
    {id: 'wma11', courseLabel: 'IAL Pure 1', family: 'IAL', topics: ialTopics(library, 'wma11')},
    {id: 'wma12', courseLabel: 'IAL Pure 2', family: 'IAL', topics: ialTopics(library, 'wma12')},
    {id: 'wma13', courseLabel: 'IAL Pure 3', family: 'IAL', topics: ialTopics(library, 'wma13')},
    {id: 'wme01', courseLabel: 'IAL Mechanics 1', family: 'IAL', topics: ialTopics(library, 'wme01')},
  ];
  const generated = new Map();
  const pages = [];
  for (const plan of plans) {
    const ctx = {course: courseOf(plan.id), route: seo.routes[plan.id], courseLabel: plan.courseLabel, family: plan.family};
    if (!ctx.course) throw new Error(`Missing course ${plan.id}`);
    const seen = new Set();
    for (const t of plan.topics) {
      const s = slug(t.title);
      if (seen.has(s)) throw new Error(`Duplicate topic slug ${plan.id}/${s}`);
      seen.add(s);
    }
    const hub = hubPage(ctx, plan.topics);
    generated.set(hub.path.slice(1) + 'index.html', hub.html);
    pages.push({course: plan.id, type: 'topics', path: hub.path, title: hub.title, questions: hub.questions});
    for (const t of plan.topics) {
      const page = topicPage(ctx, t, plan.topics);
      generated.set(page.path.slice(1) + 'index.html', page.html);
      pages.push({course: plan.id, type: 'topic', path: page.path, title: page.title, topic: page.topic, num: page.num, notes: page.notesHref, questions: page.questions});
    }
  }
  generated.set('data/topic-pages.json', JSON.stringify({version: 1, pages}, null, 2) + '\n');
  for (const [file, content] of generated) {
    const dest = path.join(ROOT, file);
    if (check) {
      if (!fs.existsSync(dest) || fs.readFileSync(dest, 'utf8') !== content) throw new Error(`Generated topic page stale: ${file}`);
    } else {
      fs.mkdirSync(path.dirname(dest), {recursive: true});
      fs.writeFileSync(dest, content);
    }
  }
  return {pages: pages.length, questions: pages.filter(p => p.type === 'topic').reduce((s, p) => s + p.questions, 0)};
}

if (require.main === module) console.log(JSON.stringify(build({check: process.argv.includes('--check')})));
module.exports = {build, slug};
