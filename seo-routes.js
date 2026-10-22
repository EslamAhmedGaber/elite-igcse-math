(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else {
    root.ELITE_SEO = api;
    const run = () => api.apply(root.document, root.location);
    if (root.document.readyState === 'loading') root.document.addEventListener('DOMContentLoaded', run, {once:true});
    else run();
    root.addEventListener('hashchange', run);
  }
})(typeof window !== 'undefined' ? window : globalThis, function () {
  const origin = 'https://eliteigcse.com';
  const routes = {
    linear: {path:'/edexcel-igcse/maths/linear/', name:'Edexcel IGCSE Maths A Higher', code:'4MA1'},
    unit1: {path:'/edexcel-igcse/maths/modular/unit-1/', name:'Edexcel IGCSE Maths Modular Unit 1', code:'4WM1H'},
    unit2: {path:'/edexcel-igcse/maths/modular/unit-2/', name:'Edexcel IGCSE Maths Modular Unit 2', code:'4WM2H'},
    wma11: {path:'/edexcel-ial/pure-1/', name:'Edexcel IAL Pure 1', code:'WMA11'},
    wma12: {path:'/edexcel-ial/pure-2/', name:'Edexcel IAL Pure 2', code:'WMA12'},
    wma13: {path:'/edexcel-ial/pure-3/', name:'Edexcel IAL Pure 3', code:'WMA13'},
    wme01: {path:'/edexcel-ial/mechanics-1/', name:'Edexcel IAL Mechanics 1', code:'WME01'}
  };
  const types = {
    '': {label:'Resources', suffix:'Notes, Topic Questions & Past Papers', description:'Revision notes, classified questions, worked solutions and past papers. Practise online or build a printable mock exam with Elite Mathematics.'},
    notes: {label:'Revision Notes', suffix:'Revision Notes & PDFs', description:'Download topic revision notes and available complete booklets, with worked examples, for your Edexcel mathematics course.'},
    'past-papers': {label:'Past Papers', suffix:'Past Papers & Worked Solutions', description:'Browse available papers by session and open each question paper beside its matching Elite worked solution.'},
    books: {label:'Classified Books', suffix:'Classified Questions & Answer Books', description:'Find topic-organised question books, matching worked-answer books and harder Expertise practice.'}
  };
  const aliases = {p1:'wma11',pure1:'wma11',p2:'wma12',pure2:'wma12',p3:'wma13',pure3:'wma13',m1:'wme01',mechanics1:'wme01',mech1:'wme01','4ma1':'linear','4wm1':'unit1','4wm1h':'unit1','4wm2':'unit2','4wm2h':'unit2'};
  const norm = value => String(value || '').toLowerCase().replace(/[^a-z0-9]/g,'');
  function courseFor(url) {
    for (const [id,r] of Object.entries(routes)) if(url.pathname.startsWith(r.path)) return id;
    const ial = url.pathname.match(/^\/ial\/(wma11|wma12|wma13|wme01)\//);
    if(ial) return ial[1];
    const explicit = norm(url.searchParams.get('c') || url.searchParams.get('course'));
    if(explicit) return routes[explicit] ? explicit : aliases[explicit] || null;
    const pathway = norm(url.searchParams.get('pathway'));
    if(pathway === 'modular') return aliases[norm(url.searchParams.get('unit'))] || (['unit1','unit2'].includes(norm(url.searchParams.get('unit'))) ? norm(url.searchParams.get('unit')) : null);
    if(pathway === 'pure') return 'wma11';
    return routes[pathway] ? pathway : aliases[pathway] || null;
  }
  function metadata(id, type='') {
    const r=routes[id], t=types[type];
    if(!r || !t) throw new Error('Unknown SEO course or resource');
    return {title:`${r.name} (${r.code}) ${t.suffix} | Elite`, description:`${r.name} (${r.code}). ${t.description}`, canonical:origin+r.path+(type ? type+'/' : '')};
  }
  function apply(document, location) {
    const url=new URL(location.href), id=courseFor(url);
    if(!id) return;
    const file=url.pathname.split('/').pop();
    const type={ 'library.html':'notes', 'pastpapers.html':'past-papers' }[file];
    if(type === undefined) return;
    const m=metadata(id,type);
    document.title=m.title;
    for(const [name,value] of [['description',m.description],['og:title',m.title],['og:description',m.description],['og:url',m.canonical]]) {
      const attr=name.startsWith('og:')?'property':'name';
      let tag=document.querySelector(`meta[${attr}="${name}"]`);
      if(!tag){tag=document.createElement('meta');tag.setAttribute(attr,name);document.head.appendChild(tag);}
      tag.content=value;
    }
    let canonical=document.querySelector('link[rel="canonical"]');
    if(!canonical){canonical=document.createElement('link');canonical.rel='canonical';document.head.appendChild(canonical);}
    canonical.href=m.canonical;
  }
  return {origin,routes,types,courseFor,metadata,apply};
});
