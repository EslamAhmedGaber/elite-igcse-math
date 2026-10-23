// Topic pages: typeset a worked solution only when it is opened, so a page with 50 solutions stays light.
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
  document.addEventListener('toggle', (event) => {
    const box = event.target;
    if (!box.matches?.('details.tp-solution') || !box.open || box.dataset.typeset) return;
    box.dataset.typeset = '1';
    mathJax().then((mj) => mj.typesetPromise([box])).catch(() => { box.dataset.typeset = ''; });
  }, true);
})();
