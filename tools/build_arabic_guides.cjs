// Arabic guide pages for students and parents (course choice and how to study with the site).
// Facts are from Pearson's specifications (sources listed on each page). The course content itself
// stays in English; these pages explain choices. Not translations, so no hreflang.
//   node tools/build_arabic_guides.cjs [--check]
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const seo = require('../seo-routes.js');

const ROOT = path.resolve(__dirname, '..');
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const json = v => JSON.stringify(v).replace(/</g, '\\u003c');
const SPEC_MODULAR = 'https://qualifications.pearson.com/content/dam/pdf/International%20GCSE/Mathematics%20A/2024/specification-and-sample-assessments/int-gcse-mathematics-spec-a-modular.pdf';
const SPEC_IAL = 'https://qualifications.pearson.com/content/dam/pdf/International%20Advanced%20Level/Mathematics/2018/Specification-and-Sample-Assessment/international-a-level-maths-spec.pdf';
const IAL_MANUAL = 'https://qualifications.pearson.com/content/dam/pdf/Support/Information-manual/4-ial-2025-2026.pdf';

const card = (title, text, href, label) => `<article class="resource-card"><h2>${title}</h2><p>${text}</p><a class="resource-action primary" href="${href}">${label}</a></article>`;

const PAGES = [
  {
    path: '/ar/',
    title: 'دليل رياضيات IGCSE و IAL بالعربي للطالب وولي الأمر | Elite',
    description: 'شرح مبسّط بالعربي لاختيار نظام رياضيات Edexcel المناسب: الفرق بين Linear و Modular، وترتيب Pure 1 و Pure 2 و Mechanics 1، وطريقة المذاكرة بالمصادر المجانية.',
    h1: 'دليل الطالب وولي الأمر لرياضيات Edexcel',
    lead: 'صفحات قصيرة بالعربي تساعدك تختار النظام المناسب وتعرف تذاكر إزاي. المذاكرة نفسها والمصادر بالإنجليزي زي الامتحان بالظبط.',
    body: `<section class="resource-section"><div class="resource-grid">
${card('Linear ولا Modular؟', 'الفرق بين نظامي IGCSE Maths A: عدد الامتحانات، المواعيد، الإعادة، ومين يناسبه كل نظام.', '/ar/linear-vs-modular/', 'اقرأ المقارنة')}
${card('ترتيب مواد IAL', 'تبدأ بـ Pure 1 ولا Mechanics 1؟ إزاي تتكوّن شهادة AS و A Level في الرياضيات.', '/ar/ial-maths-units/', 'اعرف الترتيب')}
${card('تذاكر إزاي على الموقع', 'خطة بسيطة: نوتس ← أسئلة على كل درس ← امتحان تجريبي ← مراجعة الأخطاء.', '/ar/how-to-study/', 'شوف الخطة')}
</div></section>`,
  },
  {
    path: '/ar/linear-vs-modular/',
    title: 'الفرق بين Linear و Modular في IGCSE Maths Edexcel | Elite',
    description: 'مقارنة واضحة بالعربي بين IGCSE Maths A Linear (4MA1) و Modular (Unit 1 و Unit 2): عدد الامتحانات، المواعيد، الإعادة، والمحتوى، ومين يناسبه كل نظام.',
    h1: 'الفرق بين Linear و Modular في IGCSE Maths',
    lead: 'النظامين من Pearson Edexcel ونفس المنهج ونفس الشهادة في الآخر. الفرق في طريقة تقسيم الامتحانات.',
    body: `<section class="resource-section"><h2>المقارنة باختصار</h2>
<div class="ar-table-wrap"><table class="ar-table"><thead><tr><th></th><th>Linear (4MA1)</th><th>Modular (4XMAH)</th></tr></thead><tbody>
<tr><th>الامتحانات</th><td>Paper 1 و Paper 2 في نفس الدورة</td><td>Unit 1 (4WM1H) و Unit 2 (4WM2H)</td></tr>
<tr><th>مدة ودرجات كل امتحان</th><td>ساعتين، 100 درجة</td><td>ساعتين، 100 درجة (كل Unit = 50% من الشهادة)</td></tr>
<tr><th>المحتوى</th><td>المنهج كله في كل ورقة</td><td>نفس المنهج متقسّم على الـ Units</td></tr>
<tr><th>المواعيد</th><td>الورقتين في نفس الدورة</td><td>كل Unit متاحة في يونيو ونوفمبر، ممكن كل واحدة في دورة</td></tr>
<tr><th>الإعادة</th><td>تعيد الورقتين</td><td>ممكن تعيد Unit واحدة قبل ما تاخد الدرجة النهائية</td></tr>
<tr><th>الآلة الحاسبة</th><td>مسموحة</td><td>مسموحة</td></tr>
</tbody></table></div>
<p class="ar-note">Pearson بتنصح إن أول مرة تمتحن Unit 1 قبل Unit 2، والإعادة بأي ترتيب. وفي الآخر لازم يتعمل cash-in عشان تاخد الدرجة النهائية للشهادة.</p></section>
<section class="resource-section"><h2>مين يناسبه كل نظام؟</h2>
<div class="resource-grid ar-two">
<article class="resource-card"><h3>Linear مناسب لو…</h3><ul><li>الطالب بيحب يراجع المنهج كله مرة واحدة.</li><li>عايز يخلّص المادة في دورة واحدة.</li><li>مستواه ثابت في كل أجزاء المنهج.</li></ul></article>
<article class="resource-card"><h3>Modular مناسب لو…</h3><ul><li>الطالب بيرتاح لما المنهج يتقسم على مرحلتين.</li><li>عايز يركّز على نص المنهج في كل امتحان.</li><li>محتاج فرصة يحسّن Unit واحدة من غير ما يعيد كل حاجة.</li></ul></article>
</div>
<p>القرار النهائي بيكون مع المدرسة أو مركز الامتحانات، لأنهم اللي بيسجلوا الطالب في النظام والدورة.</p></section>
<section class="resource-section"><h2>المصادر المجانية لكل نظام</h2><div class="resource-grid">
${card('Linear 4MA1', 'نوتس، أسئلة مقسمة على كل درس بالحلول، كتب Classified، وامتحانات سابقة.', '/edexcel-igcse/maths/linear/', 'افتح Linear')}
${card('Modular Unit 1', 'مصادر Unit 1 لوحدها، ومنها أوراق Linear متحوّلة للتدريب.', '/edexcel-igcse/maths/modular/unit-1/', 'افتح Unit 1')}
${card('Modular Unit 2', 'مصادر Unit 2 لوحدها بنفس الطريقة.', '/edexcel-igcse/maths/modular/unit-2/', 'افتح Unit 2')}
</div></section>
<p class="ar-source">المصدر: <a href="${SPEC_MODULAR}" rel="noopener">مواصفات Pearson لـ International GCSE Mathematics A (Modular)</a>، وأوراق امتحانات 4MA1.</p>`,
    faq: [
      ['هل شهادة Modular أقل من Linear؟', 'لا. الاتنين International GCSE Mathematics A من Pearson Edexcel، ونفس المحتوى، والفرق في طريقة تقسيم الامتحانات.'],
      ['ينفع أمتحن Unit 1 و Unit 2 في دورتين مختلفتين؟', 'أيوه. كل Unit متاحة في دورتي يونيو ونوفمبر، وPearson بتنصح أول مرة تبدأ بـ Unit 1.'],
      ['كام مدة امتحان كل Unit؟', 'ساعتين، و100 درجة، وكل Unit تمثل 50% من الشهادة.'],
    ],
  },
  {
    path: '/ar/ial-maths-units/',
    title: 'ترتيب مواد IAL Maths: Pure 1 و Pure 2 و Mechanics 1 | Elite',
    description: 'شرح بالعربي لتكوين شهادة International A Level Mathematics من Edexcel: وحدات AS (Pure 1 و Pure 2 ووحدة تطبيقية زي Mechanics 1)، ومدة كل امتحان ومواعيده.',
    h1: 'ترتيب مواد رياضيات IAL (Pure 1 و Pure 2 و Mechanics 1)',
    lead: 'رياضيات International A Level من Edexcel متقسمة لوحدات. كل وحدة امتحان لوحدها، وبتتجمع عشان تكوّن الشهادة.',
    body: `<section class="resource-section"><h2>كل وحدة عبارة عن إيه؟</h2>
<div class="ar-table-wrap"><table class="ar-table"><thead><tr><th>الوحدة</th><th>الكود</th><th>الامتحان</th></tr></thead><tbody>
<tr><td>Pure Mathematics 1</td><td>WMA11</td><td>ساعة ونص، 75 درجة</td></tr>
<tr><td>Pure Mathematics 2</td><td>WMA12</td><td>ساعة ونص، 75 درجة</td></tr>
<tr><td>Pure Mathematics 3</td><td>WMA13</td><td>ساعة ونص، 75 درجة</td></tr>
<tr><td>Mechanics 1</td><td>WME01</td><td>ساعة ونص، 75 درجة</td></tr>
</tbody></table></div>
<p>الامتحانات متاحة 3 مرات في السنة: يناير ويونيو وأكتوبر.</p></section>
<section class="resource-section"><h2>شهادة AS Mathematics</h2>
<p>بتتكوّن من <strong>Pure 1 + Pure 2</strong> ووحدة تطبيقية واحدة: <strong>Mechanics 1</strong> أو Statistics 1 أو Decision 1. وبعد كده A Level بيكمّل بوحدات Pure أعلى (زي Pure 3) ووحدات تطبيقية أكتر.</p>
<h2>أبدأ بإيه؟</h2>
<ul class="ar-steps"><li><strong>Pure 1 الأول:</strong> فيه الأساسيات اللي بتتبني عليها باقي الوحدات (الجبر، المعادلات، التفاضل والتكامل البسيط).</li><li><strong>Mechanics 1 مع Pure 1 أو بعده:</strong> بيستخدم جبر Pure 1، فالأفضل يكون الطالب ماسك Pure 1 كويس.</li><li><strong>Pure 2 بعد Pure 1</strong>، و<strong>Pure 3 بعد Pure 2</strong>، لأن كل واحدة بتكمّل اللي قبلها.</li></ul>
<p>المدرسة أو المدرّس بيحدد خطة الدورات حسب مستوى الطالب والوقت المتاح.</p></section>
<section class="resource-section"><h2>المصادر المجانية</h2><div class="resource-grid">
${card('Pure 1', 'نوتس، أسئلة سابقة لكل درس بالحل، وامتحانات تجريبية.', '/edexcel-ial/pure-1/', 'افتح Pure 1')}
${card('Pure 2', 'نفس المصادر لـ Pure 2.', '/edexcel-ial/pure-2/', 'افتح Pure 2')}
${card('Mechanics 1', 'نوتس وأسئلة M1 بالحلول.', '/edexcel-ial/mechanics-1/', 'افتح Mechanics 1')}
</div></section>
<p class="ar-source">المصادر: <a href="${SPEC_IAL}" rel="noopener">مواصفات Pearson لـ International A Level Mathematics</a> و<a href="${IAL_MANUAL}" rel="noopener">دليل Pearson للتسجيل 2025/2026</a>.</p>`,
    faq: [
      ['كام مدة امتحان Pure 1؟', 'ساعة ونص، و75 درجة.'],
      ['امتحانات IAL Maths بتكون إمتى؟', 'في يناير ويونيو وأكتوبر.'],
      ['AS Mathematics محتاجة كام وحدة؟', 'Pure 1 و Pure 2 ووحدة تطبيقية واحدة زي Mechanics 1.'],
    ],
  },
  {
    path: '/ar/how-to-study/',
    title: 'إزاي تذاكر رياضيات IGCSE و IAL بالمصادر المجانية | Elite',
    description: 'خطة مذاكرة بسيطة بالعربي: نوتس كل درس، أسئلة الامتحانات السابقة مرتبة من السهل للصعب بالحلول، امتحان تجريبي، ومراجعة الأخطاء على موقع Elite.',
    h1: 'إزاي تذاكر الرياضيات على Elite (4 خطوات)',
    lead: 'كل المصادر مجانية. الخطة دي بتنفع لأي منهج: Linear أو Modular أو Pure 1 أو Pure 2 أو Pure 3 أو Mechanics 1.',
    body: `<section class="resource-section"><ol class="ar-steps ar-big">
<li><strong>اقرأ نوتس الدرس.</strong> كل درس له نوتس PDF فيها الفكرة والأمثلة المحلولة. اكتب في كشكول الكلمات اللي بتقولك تعمل إيه في السؤال.</li>
<li><strong>حل أسئلة الدرس من السهل للصعب.</strong> صفحة كل درس فيها كل أسئلة الامتحانات السابقة عليه، مرتبة بالدرجات، وتحت كل سؤال الحل خطوة بخطوة. حل الأول وبعدين افتح الحل.</li>
<li><strong>اعمل امتحان تجريبي.</strong> من Mock Generator اختار الدروس وعدد الأسئلة، أو "Real exam mock" بنفس وقت الامتحان الحقيقي. ممكن تحله على الموقع أو تطبعه PDF.</li>
<li><strong>راجع أخطاءك.</strong> بعد التصحيح الموقع بيوريك الدروس اللي خسرت فيها درجات، وبزرار واحد يعملك تدريب على نفس الدروس.</li>
</ol></section>
<section class="resource-section"><h2>ابدأ من منهجك</h2><div class="resource-grid">
${card('IGCSE Linear', 'أسئلة كل درس بالحلول.', '/edexcel-igcse/maths/linear/topics/', 'الدروس')}
${card('IAL Pure 1', 'أسئلة كل درس بالحلول.', '/edexcel-ial/pure-1/topics/', 'الدروس')}
${card('Mock Generator', 'امتحان تجريبي في دقيقة.', '/exam.html', 'اعمل امتحان')}
</div></section>
<p>عندك سؤال؟ <a href="https://wa.me/201120009622">كلّم د. إسلام على واتساب</a>.</p>`,
  },
];

function render(page) {
  const canonical = seo.origin + page.path;
  const crumbs = page.path === '/ar/' ? [{n: 'Elite Mathematics', p: '/'}, {n: 'دليل بالعربي', p: '/ar/'}] : [{n: 'Elite Mathematics', p: '/'}, {n: 'دليل بالعربي', p: '/ar/'}, {n: page.h1, p: page.path}];
  const graph = [
    {'@type': 'Organization', '@id': seo.origin + '/#organization', name: 'Elite Mathematics', url: seo.origin + '/'},
    {'@type': 'Article', '@id': canonical, headline: page.h1, description: page.description, inLanguage: 'ar', url: canonical, author: {'@type': 'Person', name: 'Dr Eslam Ahmed', url: seo.origin + '/about.html'}, publisher: {'@id': seo.origin + '/#organization'}},
    {'@type': 'BreadcrumbList', itemListElement: crumbs.map((c, i) => ({'@type': 'ListItem', position: i + 1, name: c.n, item: seo.origin + c.p}))},
  ];
  if (page.faq) graph.push({'@type': 'FAQPage', mainEntity: page.faq.map(([q, a]) => ({'@type': 'Question', name: q, acceptedAnswer: {'@type': 'Answer', text: a}}))});
  const faq = page.faq ? `<section class="resource-section"><h2>أسئلة شائعة</h2>${page.faq.map(([q, a]) => `<details class="ar-faq"><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}</section>` : '';
  return `<!doctype html>
<html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(page.title)}</title><meta name="description" content="${esc(page.description)}"><link rel="canonical" href="${canonical}">
<meta property="og:type" content="article"><meta property="og:locale" content="ar_EG"><meta property="og:title" content="${esc(page.title)}"><meta property="og:description" content="${esc(page.description)}"><meta property="og:url" content="${canonical}"><meta property="og:image" content="${seo.origin}/assets/og-image.png"><meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#0f2140"><link rel="icon" href="/assets/icon.svg" type="image/svg+xml"><link rel="stylesheet" href="/resource-pages.css?v=20261024b">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&family=Sora:wght@400;600;700&display=swap" rel="stylesheet">
<script type="application/ld+json">${json({'@context': 'https://schema.org', '@graph': graph})}</script></head>
<body class="ar" data-stat="pv_guide"><a class="resource-skip" href="#main">تخطي إلى المحتوى</a>
<header class="resource-header"><div class="resource-wrap"><a class="resource-brand" href="/"><img src="/assets/icon.svg" width="40" height="40" alt="">Elite Mathematics</a><nav aria-label="القائمة"><a href="/#courseLauncher">كل المناهج</a><a href="/ar/">دليل بالعربي</a><a href="/exam.html">امتحان تجريبي</a></nav></div></header>
<main id="main" class="resource-wrap"><nav class="resource-breadcrumb" aria-label="مسار الصفحة">${crumbs.map((c, i) => i === crumbs.length - 1 ? `<span>${esc(c.n)}</span>` : `<a href="${c.p}">${esc(c.n)}</a>`).join('<span aria-hidden="true">/</span>')}</nav>
<div class="resource-title"><span class="resource-kicker">دليل بالعربي</span><h1>${esc(page.h1)}</h1><p>${esc(page.lead)}</p></div>
${page.body}
${faq}
<div class="resource-author"><img src="/assets/Eslam4-home.jpg" width="56" height="56" alt="د. إسلام أحمد" loading="lazy"><div><a href="/about.html">د. إسلام أحمد</a><p>Elite Mathematics &middot; كل المصادر مجانية</p></div></div></main>
<footer class="resource-footer"><div class="resource-wrap"><nav aria-label="المناهج">${Object.entries(seo.routes).map(([id, r]) => `<a href="${r.path}">${esc(id === 'linear' ? 'Linear' : r.name.replace('Edexcel IGCSE Maths ', '').replace('Edexcel IAL ', ''))}</a>`).join('')}</nav><p>Elite Mathematics &middot; <a href="/ar/">دليل بالعربي</a> &middot; <a href="https://wa.me/201120009622">واتساب د. إسلام</a></p></div></footer><script src="/firebase-config.js" defer></script><script src="/topic-pages.js?v=20261024b" defer></script></body></html>
`;
}

function build({check = false} = {}) {
  const out = new Map(PAGES.map(p => [p.path.slice(1) + 'index.html', render(p)]));
  out.set('data/arabic-guides.json', JSON.stringify({version: 1, pages: PAGES.map(p => ({path: p.path, title: p.title}))}, null, 2) + '\n');
  for (const [file, html] of out) {
    const dest = path.join(ROOT, file);
    if (check) { if (!fs.existsSync(dest) || fs.readFileSync(dest, 'utf8') !== html) throw new Error(`Stale Arabic guide: ${file}`); }
    else { fs.mkdirSync(path.dirname(dest), {recursive: true}); fs.writeFileSync(dest, html); }
  }
  return {pages: PAGES.length};
}
if (require.main === module) console.log(JSON.stringify(build({check: process.argv.includes('--check')})));
module.exports = {build};
