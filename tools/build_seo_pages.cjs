const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const seo = require('../seo-routes.js');

const esc = value => String(value ?? '').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const json = value => JSON.stringify(value).replace(/</g,'\\u003c');
const absolute = href => new URL(href,seo.origin+'/').pathname + new URL(href,seo.origin+'/').search + new URL(href,seo.origin+'/').hash;
const anchor = value => 'topic-'+String(value).replace(/[^a-zA-Z0-9]+/g,'-');
function loadCatalog(root) {
  const sandbox={window:{}};
  vm.createContext(sandbox);
  for(const file of ['course-modules.js','library-data.js']) vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),sandbox,{filename:file,timeout:5000});
  return {system:sandbox.window.ELITE_COURSE_MODULES,library:sandbox.window.ELITE_LIBRARY};
}
function action(href,label,primary=false) {
  const pdf=/\.pdf(?:[?#]|$)/i.test(href);
  return `<a class="resource-action${primary?' primary':''}" href="${esc(absolute(href))}"${pdf?' target="_blank" rel="noopener"':''}>${esc(label)}${pdf?' <span aria-hidden="true">&#8599;</span>':''}</a>`;
}
function row(title,details,actions,id='') {
  return `<li class="resource-row"${id?` id="${esc(id)}"`:''}><div><strong>${esc(title)}</strong>${details?`<small>${details}</small>`:''}</div><div class="resource-actions">${actions}</div></li>`;
}
function section(title,content,id='') {
  return `<section class="resource-section"${id?` id="${esc(id)}"`:''}><h2>${esc(title)}</h2>${content}</section>`;
}
function topics(c) {return c.notes.chapters ? c.notes.chapters.flatMap(ch=>ch.topics) : c.notes.topics || [];}
function fileInfo(file) {return [file.pages ? `${esc(file.pages)} pages` : '',file.mb ? `${esc(file.mb)} MB` : ''].filter(Boolean).join(' &middot; ');}
function notesBody(c) {
  const n=c.notes;let content='';
  if(n.complete?.length) content+=section('Complete booklet',`<ul class="resource-list">${n.complete.map((file,i)=>row(n.complete.length>1?`Part ${i+1} of ${n.complete.length}`:`${c.name} complete notes`,fileInfo(file),action(file.href,'Open PDF',true))).join('')}</ul>`);
  if(n.chapters){
    content+=`<nav class="resource-jump" aria-label="Chapters">${n.chapters.map(ch=>`<a href="#chapter-${ch.number}">${esc(ch.title)}</a>`).join('')}</nav>`;
    for(const ch of n.chapters){
      const book=ch.booklet?`<p>${action(ch.booklet.href,'Chapter booklet')}</p>`:'';
      content+=section(`Chapter ${ch.number}: ${ch.title}`,book+noteRows(ch.topics),`chapter-${ch.number}`);
    }
  }else content+=section('Notes by topic',noteRows(n.topics||[]));
  return content;
}
function noteRows(list){return `<ul class="resource-list">${list.map(t=>row(`${t.num}. ${t.title}`,t.href?fileInfo(t):esc(t.status||'In preparation'),t.href?action(t.href,'Open notes'): '<span class="resource-tag">In preparation</span>',anchor(t.num))).join('')}</ul>`;}
function papersFor(course,group){return course.unit ? (group.pastPapers||[]).filter(s=>s.heading.startsWith(course.unit+' |')) : group.pastPapers||[];}
function papersBody(course,group){
  const sections=papersFor(course,group);
  let content=course.unit?'<p>Original Modular papers and Elite practice editions are listed separately below. <span class="resource-tag">L&rarr;M</span> identifies papers converted from Linear, with their actual marks.</p>':'';
  for(const s of sections){
    const regular=s.sessions.filter(r=>!r.converted),converted=s.sessions.filter(r=>r.converted);
    const rows=list=>`<ul class="resource-list">${list.map(r=>row(r.label,r.converted?`${esc(r.note||'Converted from Linear Higher')} &middot; Elite practice edition`:'',r.papers.map(p=>action(p.href,p.title,p.kind==='solution')).join('')+(r.isNew?'<span class="resource-new">New</span>':''))).join('')}</ul>`;
    if(regular.length) content+=section(course.unit?'Original Modular papers':s.heading,rows(regular));
    if(converted.length) content+=section('Converted Linear practice papers',rows(converted),'converted-papers');
  }
  return content || '<p>No standalone paper downloads are currently listed.</p>';
}
function bookMatches(book,course){
  if(!course.unit) return true;
  const hay=[book.title,book.tag,...book.meta||[]].join(' ');
  const unit=course.id==='unit1'?'1':'2',other=unit==='1'?'2':'1';
  return new RegExp(`(?:Unit ${unit}\\b|4WM${unit}\\b)`,'i').test(hay) && !new RegExp(`(?:Unit ${other}\\b|4WM${other}\\b)`,'i').test(hay);
}
function booksBody(course,group){
  const books=(group.books||[]).filter(b=>bookMatches(b,course)&&!b.actions.every(a=>a.href.startsWith('library.html')));
  return books.map(b=>section(b.title,`<p>${esc(b.description)}</p><ul class="resource-list">${b.actions.map(a=>row(a.label,'',action(a.href,/\.pdf(?:[?#]|$)/i.test(a.href)?'Open PDF':'Open',a.variant==='primary'))).join('')}</ul>`)).join('');
}
// Topic pages come from tools/build_topic_pages.cjs. Modular units share the Linear topic pages (matched by notes PDF).
function loadTopicPages(root){const f=path.join(root,'data/topic-pages.json');return fs.existsSync(f)?JSON.parse(fs.readFileSync(f,'utf8')).pages:[];}
function topicPageFor(course,t,topicPages){
  const home=course.unit?'linear':course.id,key=String(t.href||'').split('?')[0];
  return topicPages.find(p=>p.type==='topic'&&p.course===home&&(course.unit?p.notes&&p.notes===key:String(p.num)===String(t.num)));
}
function overview(course,c,group,topicPages=[]){
  const r=seo.routes[course.id];
  const descriptions={notes:'Topic notes, worked examples and available booklets.',books:'Classified question books and matching answers.','past-papers':'Available sessions with paired worked solutions.'};
  const cards=Object.entries(descriptions).map(([t,desc])=>`<article class="resource-card"><h2>${seo.types[t].label}</h2><p>${desc}</p>${action(r.path+t+'/',`Open ${seo.types[t].label.toLowerCase()}`,true)}</article>`);
  const practice=course.family==='IAL'?`/ial/${course.id}/index.html`:`/practice.html?${course.query}&bank=all`;
  const hub=topicPages.find(p=>p.type==='topics'&&p.course===(course.unit?'linear':course.id));
  if(hub)cards.unshift(`<article class="resource-card"><h2>Past paper questions by topic</h2><p>Every question on each topic, easiest first, with worked solutions.</p>${action(hub.path,'Choose a topic',true)}</article>`);
  cards.push(`<article class="resource-card"><h2>Questions by topic</h2><p>Practise classified questions online and reveal the worked solution.</p>${action(practice,'Start practising')}</article>`);
  cards.push(`<article class="resource-card"><h2>Mock generator</h2><p>Build a random mock or choose questions for a printable A4 test.</p>${action(`/exam.html?${course.query}&mode=custom`,'Build a test')}</article>`);
  cards.push(`<article class="resource-card"><h2>My course &amp; progress</h2><p>Continue your learning path, review mistakes and open saved tests.</p>${action(`/course.html?${course.query}`,'Open my course')}</article>`);
  const list=topics(c);
  const topicLinks=`<ul class="resource-topic-grid">${list.filter(t=>t.href).map(t=>{const page=topicPageFor(course,t,topicPages);return `<li><a href="${page?page.path:`${r.path}notes/#${anchor(t.num)}`}">${esc(t.title)}</a>${page?` <small>${page.questions} questions</small>`:''}</li>`;}).join('')}</ul>`;
  const desc=course.id==='linear'?'Edexcel International GCSE Mathematics A Higher (4MA1), often called O Level Maths. The Linear route brings the six topic chapters together for whole-course revision.':course.unit?`Higher-tier resources for ${course.name} (${r.code}). The notes share the relevant Linear topics, selected here for this unit.`:`${course.blurb} (${course.code}). Use the topic notes alongside classified practice, then test your understanding with the available papers and worked solutions.`;
  return section('Choose a resource',`<div class="resource-grid">${cards.join('')}</div>`)+section('Course topics',`<p>${esc(desc)}</p>${topicLinks}`);
}
function documentFor(course,c,group,type,topicPages=[]){
  const r=seo.routes[course.id],m=seo.metadata(course.id,type),suffix=type?seo.types[type].label:'Maths Resources';
  const title=type?`${course.name} ${suffix}`:`${course.name} Maths Resources`;
  const description=type==='notes'?`Topic revision notes for ${r.name} (${r.code}), with printable PDFs and worked examples.`:type==='past-papers'?`Available ${r.code} question papers and Elite worked solutions, arranged by session.`:type==='books'?`Classified questions, answer books and focused practice for ${r.name}.`:`${course.blurb}. Notes, topic questions, books and worked solutions.`;
  const body=type==='notes'?notesBody(c):type==='past-papers'?papersBody(course,group):type==='books'?booksBody(course,group):overview(course,c,group,topicPages);
  const crumbs=[{name:'Elite Mathematics',item:seo.origin+'/'},{name:course.name,item:seo.origin+r.path}];if(type)crumbs.push({name:seo.types[type].label,item:m.canonical});
  const ld={'@context':'https://schema.org','@graph':[
    {'@type':'Organization','@id':seo.origin+'/#organization',name:'Elite Mathematics',url:seo.origin+'/',logo:seo.origin+'/assets/icon.svg'},
    {'@type':'Person','@id':seo.origin+'/about.html#eslam-ahmed',name:'Dr Eslam Ahmed',url:seo.origin+'/about.html'},
    {'@type':'CollectionPage','@id':m.canonical,name:m.title,description:m.description,url:m.canonical,inLanguage:'en',publisher:{'@id':seo.origin+'/#organization'},author:{'@id':seo.origin+'/about.html#eslam-ahmed'},breadcrumb:{'@id':m.canonical+'#breadcrumb'}},
    {'@type':'BreadcrumbList','@id':m.canonical+'#breadcrumb',itemListElement:crumbs.map((x,i)=>({'@type':'ListItem',position:i+1,...x}))}
  ]};
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(m.title)}</title><meta name="description" content="${esc(m.description)}"><link rel="canonical" href="${m.canonical}">
<meta property="og:type" content="website"><meta property="og:title" content="${esc(m.title)}"><meta property="og:description" content="${esc(m.description)}"><meta property="og:url" content="${m.canonical}"><meta property="og:image" content="${seo.origin}/assets/og-image.png"><meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#0f2140"><link rel="icon" href="/assets/icon.svg" type="image/svg+xml"><link rel="stylesheet" href="/resource-pages.css?v=20261024n">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700&display=swap" rel="stylesheet">
<script type="application/ld+json">${json(ld)}</script></head>
<body data-stat="pv_resource"><a class="resource-skip" href="#main">Skip to content</a>
<header class="resource-header"><div class="resource-wrap"><a class="resource-brand" href="/"><img src="/assets/icon.svg" width="40" height="40" alt="">Elite Mathematics</a><nav aria-label="Main"><a href="/#courseLauncher">All courses</a><a href="/course.html?${esc(course.query)}">My course</a><a href="/progress.html?${esc(course.query)}">My progress</a></nav></div></header>
<main id="main" class="resource-wrap"><nav class="resource-breadcrumb" aria-label="Breadcrumb"><a href="/">Home</a><span aria-hidden="true">/</span><a href="${r.path}">${esc(course.name)}</a>${type?`<span aria-hidden="true">/</span><span>${esc(seo.types[type].label)}</span>`:''}</nav>
<div class="resource-title"><span class="resource-kicker">${esc(course.family)} &middot; ${esc(r.code)}</span><h1>${esc(title)}</h1><p>${esc(description)}</p></div>
<nav class="resource-tabs" aria-label="${esc(course.name)} resources">${Object.entries(seo.types).map(([t,info])=>`<a href="${r.path}${t?t+'/':''}"${t===type?' aria-current="page"':''}>${info.label}</a>`).join('')}</nav>
${body}
<div class="resource-author"><img src="/assets/Eslam4-home.jpg" width="56" height="56" alt="Dr Eslam Ahmed" loading="lazy"><div><a href="/about.html">Dr Eslam Ahmed</a><p>Elite Mathematics &middot; Notes, practice and worked solutions</p></div></div></main>
<footer class="resource-footer"><div class="resource-wrap"><nav aria-label="All course resources">${Object.entries(seo.routes).map(([id,route])=>`<a href="${route.path}">${esc(id==='linear'?'Linear':route.name.replace('Edexcel IGCSE Maths ','').replace('Edexcel IAL ',''))}</a>`).join('')}</nav><p>Elite Mathematics &middot; <a href="/about.html">About</a> &middot; <a href="https://wa.me/201120009622">WhatsApp Dr Eslam</a></p></div></footer><script src="/firebase-config.js" defer></script><script src="/topic-pages.js?v=20261024b" defer></script></body></html>\n`;
}
function build(root,output,{check=false}={}){
  const {system,library}=loadCatalog(root);const generated=new Map();const pages=[];const topicPages=loadTopicPages(root);
  for(const course of system.courses){
    if(!seo.routes[course.id])continue;
    const group=system.navGroups.find(g=>g.id===course.group),c=library.courses[course.id];
    if(!c||!group)throw new Error(`Missing source catalog: ${course.id}`);
    for(const type of Object.keys(seo.types)){
      const m=seo.metadata(course.id,type),url=new URL(m.canonical),file=url.pathname.slice(1)+'index.html';
      generated.set(file,documentFor(course,c,group,type,topicPages));pages.push({course:course.id,type:type||'course',path:url.pathname,title:m.title});
    }
  }
  generated.set('data/seo-pages.json',JSON.stringify({version:1,pages},null,2)+'\n');
  const sitemapSource=fs.readFileSync(path.join(root,'sitemap.xml'),'utf8');
  const oldDates=new Map([...sitemapSource.matchAll(/<url>\s*<loc>([^<]+)<\/loc>\s*(?:<lastmod>([^<]+)<\/lastmod>)?/g)].map(m=>[m[1],m[2]]));
  const retained=['/','/about.html','/downloads.html','/pastpapers.html','/classified-books.html','/practice.html','/exam.html','/checkup.html','/topics.html','/egyptian-baccalaureate.html','/daily.html',...['wma11','wma12','wma13','wme01'].map(id=>`/ial/${id}/index.html`)];
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Cairo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const entries=[...retained,...pages.map(p=>p.path),...topicPages.map(p=>p.path)].map(p=>{
    const url=seo.origin+p,file=p.endsWith('/')?p.slice(1)+'index.html':p.slice(1),rendered=generated.get(file);
    const old=fs.existsSync(path.join(root,file))?fs.readFileSync(path.join(root,file),'utf8'):null;
    const candidate=rendered || (fs.existsSync(path.join(output,file))?fs.readFileSync(path.join(output,file),'utf8'):null);
    const lastmod=candidate && old!==candidate ? today : oldDates.get(url);
    return `  <url><loc>${esc(url)}</loc>${lastmod?`<lastmod>${lastmod}</lastmod>`:''}</url>`;
  });
  generated.set('sitemap.xml',`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join('\n')}\n</urlset>\n`);
  for(const [file,content] of generated){
    const dest=path.join(output,file);
    if(check){if(!fs.existsSync(dest)||fs.readFileSync(dest,'utf8')!==content)throw new Error(`Generated page stale: ${file}`);}
    else{fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,content);}
  }
  return {pages:pages.length,files:[...generated.keys()]};
}
if(require.main===module){
  const args=process.argv.slice(2),value=flag=>{const i=args.indexOf(flag);return i>=0?args[i+1]:null;};
  const root=path.resolve(value('--source')||path.join(__dirname,'..')),output=path.resolve(value('--output')||root);
  console.log(JSON.stringify(build(root,output,{check:args.includes('--check')})));
}
module.exports={build,loadCatalog,bookMatches,papersFor};
