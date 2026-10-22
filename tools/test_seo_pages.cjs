const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const os=require('node:os');
const seo=require('../seo-routes.js');
const {loadCatalog,bookMatches,papersFor}=require('./build_seo_pages.cjs');
const args=process.argv.slice(2),arg=key=>{const i=args.indexOf(key);return i<0?null:args[i+1];};
const stage=path.resolve(arg('--stage')||path.join(__dirname,'..'));
const root=path.resolve(arg('--source')||stage);
const output=path.resolve(arg('--output')||path.join(os.tmpdir(),'elite-seo-review'));
const runtime=process.env.ELITE_NODE_MODULES||path.join(os.homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const {chromium}=require(require.resolve('playwright',{paths:[runtime,__dirname]}));
const {system,library}=loadCatalog(root);
const pages=JSON.parse(fs.readFileSync(path.join(stage,'data/seo-pages.json'),'utf8')).pages;
function resolveFile(url){
  const pathname=decodeURIComponent(new URL(url,'http://localhost').pathname);
  const relative=pathname.endsWith('/')?pathname.slice(1)+'index.html':pathname.slice(1);
  for(const base of [stage,root]){
    const file=path.resolve(base,relative);
    if(file.startsWith(base+path.sep)&&fs.existsSync(file)&&fs.statSync(file).isFile())return file;
  }
  return null;
}
const mime={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.pdf':'application/pdf','.xml':'application/xml'};
async function main(){
  fs.mkdirSync(output,{recursive:true});
  assert.equal(pages.length,28);
  for(const [query,expected] of [['pathway=linear','linear'],['pathway=modular&unit=Unit+1','unit1'],['pathway=modular&unit=Unit+2','unit2'],['course=p3','wma13'],['course=unknown',null],['pathway=modular',null],['pathway=baccalaureate',null],['utm_source=fb',null]])assert.equal(seo.courseFor(new URL('https://eliteigcse.com/library.html?'+query)),expected);
  for(const id of ['unit1','unit2']){
    const c=system.courses.find(c=>c.id===id),g=system.navGroups.find(g=>g.id==='modular');
    assert.equal(papersFor(c,g).length,1);
    assert.ok(g.books.filter(b=>bookMatches(b,c)).length>=4);
    assert.ok(!bookMatches({title:`Unit ${id==='unit1'?'2':'1'} Classified`,actions:[]},c));
  }
  const server=http.createServer((req,res)=>{
    try{const file=resolveFile(req.url);if(!file){res.writeHead(404);res.end('Not found');return;}res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});fs.createReadStream(file).pipe(res);}catch(e){res.writeHead(400);res.end('Bad request');}
  });
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const base=`http://127.0.0.1:${server.address().port}`;
  const browser=await chromium.launch({headless:true,executablePath:process.env.ELITE_BROWSER||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
  const report={pages:[],legacy:[],pdfs:0,links:0,errors:[]};
  const pdfs=new Set(),links=new Set();
  try{
    for(const width of [1440,390]){
      const context=await browser.newContext({viewport:{width,height:950},javaScriptEnabled:false,serviceWorkers:'block'});
      const page=await context.newPage();
      for(const p of pages){
        const response=await page.goto(base+p.path,{waitUntil:'load',timeout:30000});assert.equal(response.status(),200);
        const data=await page.evaluate(()=>({title:document.title,h1:[...document.querySelectorAll('h1')].map(e=>e.textContent),canonical:document.querySelector('link[rel="canonical"]')?.href,ld:[...document.querySelectorAll('script[type="application/ld+json"]')].map(e=>JSON.parse(e.textContent)),overflow:document.documentElement.scrollWidth>innerWidth+1,text:document.querySelector('main').textContent.trim().length,links:[...document.querySelectorAll('a[href]')].map(e=>e.getAttribute('href')),images:[...document.images].map(i=>({src:i.getAttribute('src'),loaded:i.complete&&i.naturalWidth>0})),current:document.querySelectorAll('.resource-tabs [aria-current="page"]').length}));
        assert.equal(data.h1.length,1,p.path);assert.equal(data.canonical,seo.origin+p.path);assert.equal(data.title,p.title);assert.equal(data.current,1);assert.ok(data.text>300);assert.equal(data.overflow,false,`${width}: ${p.path}`);assert.equal(data.ld.length,1);
        for(const link of data.links){
          if(link.startsWith('#')){assert.ok(await page.locator(link).count(),`${p.path}: ${link}`);continue;}
          if(!link.startsWith('/'))continue;
          const file=resolveFile(link);assert.ok(file,`${p.path}: Missing ${link}`);links.add(link);
          if(/\.pdf(?:[?#]|$)/i.test(link))pdfs.add(file);
        }
        for(const i of data.images)if(i.loaded===false&&i.src.includes('icon.svg'))throw new Error('Brand asset failed');
        if(p.type==='notes'){
          const c=library.courses[p.course],ts=c.notes.chapters?c.notes.chapters.flatMap(ch=>ch.topics):c.notes.topics;
          for(const t of ts.filter(t=>t.href))assert.ok(data.links.some(h=>new URL(h,seo.origin).href===new URL(t.href,seo.origin+'/').href),`Missing topic ${p.course}/${t.num}`);
        }
        if((p.type==='course'&&['linear','wma13'].includes(p.course))||(p.type==='notes'&&p.course==='unit2')||(p.type==='past-papers'&&p.course==='unit1')||(p.type==='books'&&p.course==='wma11'))await page.screenshot({path:path.join(output,`${p.course}-${p.type}-${width}.png`),fullPage:false});
        report.pages.push({path:p.path,width,title:data.title,text:data.text,status:'PASS'});
      }
      await page.goto(base+'/',{waitUntil:'load'});
      for(const r of Object.values(seo.routes))assert.ok(await page.locator(`a[href="${r.path}"]`).count(),`Home discovery missing ${r.path}`);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,`Home overflow ${width}`);
      await context.close();
    }
    for(const file of pdfs){const fd=fs.openSync(file,'r'),buffer=Buffer.alloc(5);try{fs.readSync(fd,buffer,0,5,0);}finally{fs.closeSync(fd);}assert.equal(buffer.toString(),'%PDF-',file);assert.ok(fs.statSync(file).size>1000,file);}
    const context=await browser.newContext({viewport:{width:1440,height:950},serviceWorkers:'block'});
    const page=await context.newPage();
    for(const c of system.courses){
      for(const [file,type] of [['library.html','notes'],['pastpapers.html','past-papers']]){
        await page.goto(`${base}/${file}?${c.query}`,{waitUntil:'load'});
        const expected=seo.metadata(c.id,type);
        await page.waitForFunction(title=>document.title===title,expected.title,{timeout:15000});
        assert.equal(await page.locator('link[rel="canonical"]').getAttribute('href'),expected.canonical);
        assert.equal(await page.locator('link[rel="canonical"]').count(),1);
        report.legacy.push({course:c.id,file,status:'PASS'});
      }
    }
    await page.goto(`${base}/library.html?pathway=pure&course=wma13#notes`,{waitUntil:'load'});
    await page.evaluate(()=>location.hash='adaptive');
    await page.waitForFunction(title=>document.title===title,seo.metadata('wma13','notes').title);
    const sm=await context.request.get(base+'/sitemap.xml');
    const xml=await sm.text();assert.ok(!xml.includes('results.html'));assert.ok(!xml.includes('progress.html'));assert.ok(!xml.includes('course.html?'));assert.ok(!xml.includes('<priority>'));
    for(const p of pages)assert.ok(xml.includes(`<loc>${seo.origin+p.path}</loc>`));
    await context.close();
    report.pdfs=pdfs.size;report.links=links.size;report.status='PASS';
  }catch(e){report.status='FAIL';report.errors.push(e.stack);throw e;}
  finally{fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');await browser.close();await new Promise(r=>server.close(r));}
  console.log(JSON.stringify({status:report.status,pages:report.pages.length,legacy:report.legacy.length,pdfs:pdfs.size,links:links.size,output}));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
