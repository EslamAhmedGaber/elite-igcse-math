// Static search pages (topic pages, course resource pages, Arabic guides).
// 1. Typeset a worked solution only when it is opened, so a page with 50 solutions stays light.
// 2. Anonymous daily counters, same document and privacy rules as cloud-progress.js (no names,
//    no cookies, live site only, teacher's own browsing skipped). Uses one Firestore REST request
//    instead of loading the Firebase SDK. Keys must be in STATS_KEYS and docs/firestore.rules.
(function () {
  let loading = null;
  function mathJax() {
    if (window.MathJax?.typesetPromise) return Promise.resolve(window.MathJax);
    if (!loading) {
      window.MathJax = {tex: {inlineMath: [['$', '$'], ['\\(', '\\)']]}, svg: {fontCache: 'global'}, startup: {typeset: false}};
      loading = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/mathjax@3.2.2/es5/tex-svg.js';
        script.async = true;
        script.onload = () => window.MathJax.startup.promise.then(() => resolve(window.MathJax));
        script.onerror = reject;
        document.head.appendChild(script);
      });
    }
    return loading;
  }

  const pending = {};
  const dryRun = /[?&]stats=test\b/.test(location.search);
  function statsEnabled() {
    if (navigator.webdriver) return false;
    if (!/(^|\.)eliteigcse\.com$/.test(location.hostname) && !dryRun) return false;
    try { if (localStorage.getItem('eliteStatsIgnoreV1') === '1') return false; } catch (err) { /* storage blocked */ }
    return Boolean(window.ELITE_FIREBASE?.config?.projectId);
  }
  function count(key) {
    if (statsEnabled()) pending[key] = Math.min(5, (pending[key] || 0) + 1);
  }
  function cairoDay() {
    try { return new Intl.DateTimeFormat('en-CA', {timeZone: 'Africa/Cairo', year: 'numeric', month: '2-digit', day: '2-digit'}).format(new Date()); }
    catch (err) { return new Date().toISOString().slice(0, 10); }
  }
  function flush() {
    const keys = Object.keys(pending);
    if (!keys.length) return;
    const counts = {...pending};
    keys.forEach((key) => delete pending[key]);
    if (dryRun) {
      window.__eliteStatsDryRun = {...(window.__eliteStatsDryRun || {})};
      keys.forEach((key) => { window.__eliteStatsDryRun[key] = (window.__eliteStatsDryRun[key] || 0) + counts[key]; });
      return;
    }
    const {projectId, apiKey} = window.ELITE_FIREBASE.config;
    const name = `projects/${projectId}/databases/(default)/documents/site_stats/${cairoDay()}`;
    const body = {writes: [{update: {name, fields: {}}, updateMask: {fieldPaths: []}, updateTransforms: keys.map((key) => ({fieldPath: key, increment: {integerValue: String(counts[key])}}))}]};
    fetch(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:commit?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST', keepalive: true, headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body),
    }).catch(() => { /* offline or rules not published: never disturb the student */ });
  }

  const pageKey = document.body.dataset.stat;
  if (pageKey) count(pageKey);
  setTimeout(flush, 4000);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(); });

  document.addEventListener('toggle', (event) => {
    const box = event.target;
    if (!box.matches?.('details.tp-solution') || !box.open) return;
    if (!box.dataset.counted) { box.dataset.counted = '1'; count('e_solution_open'); }
    if (box.dataset.typeset) return;
    box.dataset.typeset = '1';
    mathJax().then((mj) => mj.typesetPromise([box])).catch(() => { box.dataset.typeset = ''; });
  }, true);
})();
